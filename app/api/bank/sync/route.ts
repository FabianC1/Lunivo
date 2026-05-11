import { NextResponse } from "next/server";
import { forbiddenResponse, getAuthenticatedApiUser, unauthorizedResponse } from "../../../../lib/apiAuth";
import { syncBankConnection } from "../../../../lib/bankSync";
import { connectToDatabase } from "../../../../lib/mongodb";
import { hasPlanAccess } from "../../../../lib/subscriptions";
import BankConnection from "../../../../models/BankConnection";

export async function POST() {
  const authenticatedUser = await getAuthenticatedApiUser();
  if (!authenticatedUser) {
    return unauthorizedResponse();
  }

  if (!hasPlanAccess(authenticatedUser.planSlug, "smart")) {
    return forbiddenResponse("Bank sync is available on the Smart plan unless sandbox testing is explicitly enabled for all plans.");
  }

  await connectToDatabase();

  const connection = await BankConnection.findOne({ userId: authenticatedUser.userId, provider: "plaid" });
  if (!connection) {
    return NextResponse.json({ error: "Connect a bank before starting a sync." }, { status: 404 });
  }

  if (!connection.accessToken) {
    return NextResponse.json({ error: "The current bank connection is missing a Plaid access token. Reconnect the bank first." }, { status: 409 });
  }

  try {
    connection.status = "syncing";
    connection.lastError = "";
    await connection.save();

    const summary = await syncBankConnection(connection);

    return NextResponse.json({
      success: true,
      summary,
    });
  } catch (syncError) {
    connection.status = "failed";
    connection.lastError = syncError instanceof Error ? syncError.message : "Unable to sync bank data right now.";
    connection.lastSyncStatus = "failed";
    await connection.save();
    return NextResponse.json({ error: connection.lastError }, { status: 500 });
  }
}