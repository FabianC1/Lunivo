import { NextResponse } from "next/server";
import { getAuthenticatedApiUser, unauthorizedResponse, forbiddenResponse } from "../../../../lib/apiAuth";
import { connectToDatabase } from "../../../../lib/mongodb";
import { canUseBankSyncForSandboxTesting } from "../../../../lib/subscriptions";
import { getYapilyConfig, isYapilyConfigured } from "../../../../lib/yapily";
import BankConnection from "../../../../models/BankConnection";
import Account from "../../../../models/Account";

export async function GET() {
  const authenticatedUser = await getAuthenticatedApiUser();
  if (!authenticatedUser) {
    return unauthorizedResponse();
  }

  if (!canUseBankSyncForSandboxTesting(authenticatedUser.planSlug)) {
    return forbiddenResponse("Bank sync is available on the Smart plan unless sandbox testing is explicitly enabled for all plans.");
  }

  await connectToDatabase();

  const connection = await BankConnection.findOne({ userId: authenticatedUser.userId, provider: "yapily" }).sort({ updatedAt: -1 });
  const syncedAccountCount = await Account.countDocuments({ userId: authenticatedUser.userId, syncStatus: "synced", provider: "yapily", isArchived: false });

  return NextResponse.json({
    accessGranted: true,
    configured: isYapilyConfigured(),
    config: isYapilyConfigured()
      ? {
          institutionId: getYapilyConfig().institutionId,
          institutionCountryCode: getYapilyConfig().institutionCountryCode,
          redirectUrl: getYapilyConfig().redirectUrl,
        }
      : null,
    connection: connection
      ? {
          id: String(connection._id),
          provider: connection.provider,
          status: connection.status,
          institutionId: connection.institutionId,
          institutionCountryCode: connection.institutionCountryCode,
          hostedUrl: connection.hostedUrl ?? "",
          lastError: connection.lastError ?? "",
          connectedAt: connection.connectedAt ? new Date(connection.connectedAt).toISOString() : null,
          authorizationExpiresAt: connection.authorizationExpiresAt ? new Date(connection.authorizationExpiresAt).toISOString() : null,
          lastSyncAt: connection.lastSyncAt ? new Date(connection.lastSyncAt).toISOString() : null,
          lastSyncStatus: connection.lastSyncStatus ?? null,
          lastSyncAccountCount: connection.lastSyncAccountCount ?? 0,
          lastSyncTransactionCount: connection.lastSyncTransactionCount ?? 0,
          syncedAccountCount,
        }
      : null,
  });
}