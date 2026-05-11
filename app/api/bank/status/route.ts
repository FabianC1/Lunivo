import { NextResponse } from "next/server";
import { getAuthenticatedApiUser, unauthorizedResponse, forbiddenResponse } from "../../../../lib/apiAuth";
import { connectToDatabase } from "../../../../lib/mongodb";
import { hasPlanAccess } from "../../../../lib/subscriptions";
import { getPlaidConfig, isPlaidConfigured } from "../../../../lib/plaid";
import BankConnection from "../../../../models/BankConnection";
import Account from "../../../../models/Account";

export async function GET() {
  const authenticatedUser = await getAuthenticatedApiUser();
  if (!authenticatedUser) {
    return unauthorizedResponse();
  }

  if (!hasPlanAccess(authenticatedUser.planSlug, "smart")) {
    return forbiddenResponse("Bank sync is available on the Smart plan unless sandbox testing is explicitly enabled for all plans.");
  }

  await connectToDatabase();

  const connection = await BankConnection.findOne({ userId: authenticatedUser.userId, provider: "plaid" }).sort({ updatedAt: -1 });
  const syncedAccountCount = await Account.countDocuments({ userId: authenticatedUser.userId, syncStatus: "synced", provider: "plaid", isArchived: false });

  const configured = isPlaidConfigured();
  const config = configured ? getPlaidConfig() : null;

  return NextResponse.json({
    accessGranted: true,
    configured,
    config: configured
      ? {
          environment: config?.environment,
          countryCodes: config?.countryCodes,
          products: config?.products,
          redirectUri: config?.redirectUri ?? null,
        }
      : null,
    connection: connection
      ? {
          id: String(connection._id),
          provider: connection.provider,
          status: connection.status,
          institutionId: connection.institutionId,
          institutionName: connection.institutionName ?? "",
          institutionCountryCode: connection.institutionCountryCode,
          itemId: connection.itemId ?? "",
          linkSessionId: connection.linkSessionId ?? "",
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