import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { forbiddenResponse, getAuthenticatedApiUser, unauthorizedResponse } from "../../../../lib/apiAuth";
import { connectToDatabase } from "../../../../lib/mongodb";
import { canUseBankSyncForSandboxTesting } from "../../../../lib/subscriptions";
import { buildYapilyCallbackUrl, createHostedConsentRequest, getYapilyConfig } from "../../../../lib/yapily";
import BankConnection from "../../../../models/BankConnection";

export async function POST() {
  const authenticatedUser = await getAuthenticatedApiUser();
  if (!authenticatedUser) {
    return unauthorizedResponse();
  }

  if (!canUseBankSyncForSandboxTesting(authenticatedUser.planSlug)) {
    return forbiddenResponse("Bank sync is available on the Smart plan unless sandbox testing is explicitly enabled for all plans.");
  }

  const config = getYapilyConfig();

  await connectToDatabase();

  const callbackState = randomUUID();
  let connection = await BankConnection.findOne({ userId: authenticatedUser.userId, provider: "yapily" });

  if (!connection) {
    connection = await BankConnection.create({
      userId: authenticatedUser.userId,
      provider: "yapily",
      applicationUserId: authenticatedUser.userId,
      institutionId: config.institutionId,
      institutionCountryCode: config.institutionCountryCode,
      status: "pending",
      callbackState,
    });
  } else {
    connection.applicationUserId = authenticatedUser.userId;
    connection.institutionId = config.institutionId;
    connection.institutionCountryCode = config.institutionCountryCode;
    connection.status = "pending";
    connection.callbackState = callbackState;
    connection.lastError = "";
    await connection.save();
  }

  try {
    const redirectUrl = buildYapilyCallbackUrl(String(connection._id), callbackState);
    const hostedConsentRequest = await createHostedConsentRequest({
      applicationUserId: authenticatedUser.userId,
      institutionId: config.institutionId,
      institutionCountryCode: config.institutionCountryCode,
      redirectUrl,
    });

    connection.status = "authorizing";
    connection.redirectUrl = redirectUrl;
    connection.hostedUrl = typeof hostedConsentRequest.hostedUrl === "string" ? hostedConsentRequest.hostedUrl : "";
    connection.consentRequestId = typeof hostedConsentRequest.consentRequestId === "string" ? hostedConsentRequest.consentRequestId : undefined;
    connection.authorizationExpiresAt = hostedConsentRequest.authorisationExpiresAt
      ? new Date(String(hostedConsentRequest.authorisationExpiresAt))
      : undefined;
    connection.lastError = "";
    await connection.save();

    return NextResponse.json({
      hostedUrl: connection.hostedUrl,
      consentRequestId: connection.consentRequestId,
    });
  } catch (error) {
    connection.status = "failed";
    connection.lastError = error instanceof Error ? error.message : "Unable to start the Yapily bank connection.";
    await connection.save();

    return NextResponse.json({ error: connection.lastError }, { status: 500 });
  }
}