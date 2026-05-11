import { NextResponse } from "next/server";
import { forbiddenResponse, getAuthenticatedApiUser, unauthorizedResponse } from "../../../../lib/apiAuth";
import { connectToDatabase } from "../../../../lib/mongodb";
import { hasPlanAccess } from "../../../../lib/subscriptions";
import { createPlaidLinkToken, getPlaidConfig } from "../../../../lib/plaid";
import BankConnection from "../../../../models/BankConnection";

export async function POST() {
  const authenticatedUser = await getAuthenticatedApiUser();
  if (!authenticatedUser) {
    return unauthorizedResponse();
  }

  if (!hasPlanAccess(authenticatedUser.planSlug, "smart")) {
    return forbiddenResponse("Bank sync is available on the Smart plan unless sandbox testing is explicitly enabled for all plans.");
  }

  const config = getPlaidConfig();

  await connectToDatabase();

  let connection = await BankConnection.findOne({ userId: authenticatedUser.userId, provider: "plaid" });

  if (!connection) {
    connection = await BankConnection.create({
      userId: authenticatedUser.userId,
      provider: "plaid",
      applicationUserId: authenticatedUser.userId,
      institutionId: "plaid-link",
      institutionCountryCode: config.countryCodes[0] ?? "US",
      status: "pending",
    });
  } else {
    connection.applicationUserId = authenticatedUser.userId;
    connection.institutionId = connection.institutionId || "plaid-link";
    connection.institutionCountryCode = connection.institutionCountryCode || config.countryCodes[0] || "US";
    connection.status = "pending";
    connection.lastError = "";
    await connection.save();
  }

  try {
    const linkToken = await createPlaidLinkToken({
      clientUserId: authenticatedUser.userId,
      name: authenticatedUser.name,
      email: authenticatedUser.email,
      existingAccessToken: connection.accessToken,
    });

    connection.status = "authorizing";
    connection.authorizationExpiresAt = linkToken.expiration
      ? new Date(String(linkToken.expiration))
      : undefined;
    connection.lastError = "";
    await connection.save();

    return NextResponse.json({
      linkToken: linkToken.link_token,
      expiration: linkToken.expiration,
    });
  } catch (error) {
    connection.status = "failed";
    connection.lastError = error instanceof Error ? error.message : "Unable to start the Plaid bank connection.";
    await connection.save();

    return NextResponse.json({ error: connection.lastError }, { status: 500 });
  }
}