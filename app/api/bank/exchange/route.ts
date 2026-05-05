import { NextRequest, NextResponse } from "next/server";
import { forbiddenResponse, getAuthenticatedApiUser, unauthorizedResponse } from "../../../../lib/apiAuth";
import { syncBankConnection } from "../../../../lib/bankSync";
import { connectToDatabase } from "../../../../lib/mongodb";
import { exchangePlaidPublicToken, getPlaidConfig, getPlaidItem } from "../../../../lib/plaid";
import { canUseBankSyncForSandboxTesting } from "../../../../lib/subscriptions";
import BankConnection from "../../../../models/BankConnection";

type ExchangeBody = {
  publicToken?: string;
  institutionId?: string;
  institutionName?: string;
  linkSessionId?: string;
};

export async function POST(request: NextRequest) {
  const authenticatedUser = await getAuthenticatedApiUser();
  if (!authenticatedUser) {
    return unauthorizedResponse();
  }

  if (!canUseBankSyncForSandboxTesting(authenticatedUser.planSlug)) {
    return forbiddenResponse("Bank sync is available on the Smart plan unless sandbox testing is explicitly enabled for all plans.");
  }

  const body = await request.json().catch(() => null) as ExchangeBody | null;
  const publicToken = typeof body?.publicToken === "string" ? body.publicToken.trim() : "";
  if (!publicToken) {
    return NextResponse.json({ error: "Plaid did not return a public token." }, { status: 400 });
  }

  const config = getPlaidConfig();
  await connectToDatabase();

  let connection = await BankConnection.findOne({ userId: authenticatedUser.userId, provider: "plaid" });
  if (!connection) {
    connection = await BankConnection.create({
      userId: authenticatedUser.userId,
      provider: "plaid",
      applicationUserId: authenticatedUser.userId,
      institutionId: typeof body?.institutionId === "string" && body.institutionId.trim() ? body.institutionId.trim() : "plaid-link",
      institutionCountryCode: config.countryCodes[0] ?? "US",
      status: "pending",
    });
  }

  try {
    const tokenExchange = await exchangePlaidPublicToken(publicToken);
    const itemResponse = await getPlaidItem(tokenExchange.access_token);

    connection.provider = "plaid";
    connection.applicationUserId = authenticatedUser.userId;
    connection.institutionId = typeof body?.institutionId === "string" && body.institutionId.trim()
      ? body.institutionId.trim()
      : itemResponse.item?.institution_id || connection.institutionId || "plaid-link";
    connection.institutionName = typeof body?.institutionName === "string" && body.institutionName.trim()
      ? body.institutionName.trim()
      : connection.institutionName;
    connection.institutionCountryCode = connection.institutionCountryCode || config.countryCodes[0] || "US";
    connection.itemId = tokenExchange.item_id;
    connection.accessToken = tokenExchange.access_token;
    connection.linkSessionId = typeof body?.linkSessionId === "string" && body.linkSessionId.trim()
      ? body.linkSessionId.trim()
      : connection.linkSessionId;
    connection.availableProducts = itemResponse.item?.available_products ?? [];
    connection.billedProducts = itemResponse.item?.billed_products ?? [];
    connection.status = "authorized";
    connection.connectedAt = new Date();
    connection.lastError = "";
    await connection.save();

    const summary = await syncBankConnection(connection);
    return NextResponse.json({
      success: true,
      summary,
      connection: {
        id: String(connection._id),
        institutionId: connection.institutionId,
        institutionName: connection.institutionName,
        itemId: connection.itemId,
      },
    });
  } catch (error) {
    connection.status = "failed";
    connection.lastError = error instanceof Error ? error.message : "Unable to complete the Plaid connection.";
    await connection.save();
    return NextResponse.json({ error: connection.lastError }, { status: 500 });
  }
}