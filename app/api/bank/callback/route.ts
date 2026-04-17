import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "../../../../lib/mongodb";
import { extractHostedConsentState, getHostedConsentRequest } from "../../../../lib/yapily";
import { syncBankConnection } from "../../../../lib/bankSync";
import BankConnection from "../../../../models/BankConnection";

function buildProfileRedirect(request: NextRequest, message: string, mode: "success" | "error") {
  const redirectUrl = new URL("/profile", request.url);
  redirectUrl.searchParams.set("tab", "account");
  redirectUrl.searchParams.set("bank", mode);
  redirectUrl.searchParams.set("bankMessage", message);
  return NextResponse.redirect(redirectUrl);
}

export async function GET(request: NextRequest) {
  const connectionId = request.nextUrl.searchParams.get("connectionId");
  const bankState = request.nextUrl.searchParams.get("bankState");
  const error = request.nextUrl.searchParams.get("error") || request.nextUrl.searchParams.get("errorMessage");

  if (!connectionId || !bankState) {
    return buildProfileRedirect(request, "Bank callback was missing the expected connection state.", "error");
  }

  await connectToDatabase();
  const connection = await BankConnection.findById(connectionId);

  if (!connection || connection.callbackState !== bankState) {
    return buildProfileRedirect(request, "Bank callback state could not be verified.", "error");
  }

  if (error) {
    connection.status = "failed";
    connection.lastError = error;
    await connection.save();
    return buildProfileRedirect(request, error, "error");
  }

  const consentRequestId = request.nextUrl.searchParams.get("consentRequestId") || connection.consentRequestId;
  if (!consentRequestId) {
    connection.status = "failed";
    connection.lastError = "Yapily did not return a consent request id.";
    await connection.save();
    return buildProfileRedirect(request, connection.lastError, "error");
  }

  try {
    const hostedConsentState = await getHostedConsentRequest(consentRequestId);
    const extracted = extractHostedConsentState(hostedConsentState);

    connection.consentRequestId = consentRequestId;
    connection.consentId = extracted.consentId || connection.consentId;
    connection.consentToken = extracted.consentToken || connection.consentToken;
    connection.authToken = extracted.authToken || connection.authToken;
    connection.authorizationExpiresAt = extracted.authorisationExpiresAt
      ? new Date(extracted.authorisationExpiresAt)
      : connection.authorizationExpiresAt;
    connection.connectedAt = new Date();

    if (!connection.consentToken && !connection.authToken) {
      connection.status = "failed";
      connection.lastError = "Yapily finished the consent flow but did not return a consent token for data access.";
      await connection.save();
      return buildProfileRedirect(request, connection.lastError, "error");
    }

    connection.status = "authorized";
    connection.lastError = "";
    await connection.save();

    const summary = await syncBankConnection(connection);
    return buildProfileRedirect(
      request,
      `Bank connected. Imported ${summary.importedAccounts} accounts and ${summary.importedTransactions} new transactions.`,
      "success",
    );
  } catch (syncError) {
    connection.status = "failed";
    connection.lastError = syncError instanceof Error ? syncError.message : "Unable to complete the Yapily bank sync.";
    await connection.save();
    return buildProfileRedirect(request, connection.lastError, "error");
  }
}