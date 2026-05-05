type PlaidEnvironment = "sandbox" | "development" | "production";

type PlaidRequestOptions = {
  accessToken?: string;
  body?: Record<string, unknown>;
};

export type PlaidConfig = {
  clientId: string;
  secret: string;
  environment: PlaidEnvironment;
  apiBaseUrl: string;
  clientName: string;
  countryCodes: string[];
  products: string[];
  language: string;
  redirectUri?: string;
  webhookUrl?: string;
  transactionDays: number;
  sandboxAllowAllPlans: boolean;
};

function readEnv(name: string) {
  return process.env[name]?.trim() ?? "";
}

function parseCsvEnv(name: string, fallback: string[]) {
  const raw = readEnv(name);
  if (!raw) {
    return fallback;
  }

  const parts = raw.split(",").map((value) => value.trim()).filter(Boolean);
  return parts.length > 0 ? parts : fallback;
}

function getApiBaseUrl(environment: PlaidEnvironment) {
  switch (environment) {
    case "production":
      return "https://production.plaid.com";
    case "development":
      return "https://development.plaid.com";
    case "sandbox":
    default:
      return "https://sandbox.plaid.com";
  }
}

export function isPlaidConfigured() {
  return Boolean(readEnv("PLAID_CLIENT_ID") && readEnv("PLAID_SECRET"));
}

export function getPlaidConfig(): PlaidConfig {
  const clientId = readEnv("PLAID_CLIENT_ID");
  const secret = readEnv("PLAID_SECRET");
  const rawEnvironment = readEnv("PLAID_ENV").toLowerCase();
  const environment: PlaidEnvironment = rawEnvironment === "production"
    ? "production"
    : rawEnvironment === "development"
      ? "development"
      : "sandbox";
  const redirectUri = readEnv("PLAID_REDIRECT_URI") || undefined;
  const webhookUrl = readEnv("PLAID_WEBHOOK_URL") || undefined;

  if (!clientId || !secret) {
    throw new Error("Plaid is not configured. Add PLAID_CLIENT_ID and PLAID_SECRET to your environment.");
  }

  return {
    clientId,
    secret,
    environment,
    apiBaseUrl: getApiBaseUrl(environment),
    clientName: readEnv("PLAID_CLIENT_NAME") || "Lunivo",
    countryCodes: parseCsvEnv("PLAID_COUNTRY_CODES", ["US", "GB"]),
    products: parseCsvEnv("PLAID_PRODUCTS", ["transactions"]),
    language: readEnv("PLAID_LANGUAGE") || "en",
    redirectUri,
    webhookUrl,
    transactionDays: Math.max(1, Number.parseInt(readEnv("PLAID_SYNC_TRANSACTION_DAYS") || "90", 10) || 90),
    sandboxAllowAllPlans: readEnv("PLAID_SANDBOX_ALLOW_ALL_PLANS") === "true",
  };
}

function formatPlaidError(status: number, payload: unknown) {
  if (payload && typeof payload === "object") {
    const errorPayload = payload as {
      error_message?: unknown;
      display_message?: unknown;
      error_code?: unknown;
      error_type?: unknown;
    };
    const message = typeof errorPayload.error_message === "string" && errorPayload.error_message.trim()
      ? errorPayload.error_message.trim()
      : typeof errorPayload.display_message === "string" && errorPayload.display_message.trim()
        ? errorPayload.display_message.trim()
        : `Plaid request failed with status ${status}.`;

    const errorCode = typeof errorPayload.error_code === "string" ? errorPayload.error_code.trim() : "";
    const errorType = typeof errorPayload.error_type === "string" ? errorPayload.error_type.trim() : "";

    return [message, errorType, errorCode].filter(Boolean).join("  ");
  }

  return `Plaid request failed with status ${status}.`;
}

async function plaidRequest<T>(path: string, options: PlaidRequestOptions = {}): Promise<T> {
  const config = getPlaidConfig();
  const response = await fetch(`${config.apiBaseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id: config.clientId,
      secret: config.secret,
      access_token: options.accessToken,
      ...options.body,
    }),
    cache: "no-store",
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(formatPlaidError(response.status, payload));
  }

  return payload as T;
}

export async function createPlaidLinkToken(input: {
  clientUserId: string;
  name?: string;
  email?: string;
  existingAccessToken?: string;
}) {
  const config = getPlaidConfig();
  const baseBody: Record<string, unknown> = {
    client_name: config.clientName,
    language: config.language,
    country_codes: config.countryCodes,
    user: {
      client_user_id: input.clientUserId,
    },
    products: config.products,
  };

  if (input.name) {
    baseBody.user = {
      ...(baseBody.user as Record<string, unknown>),
      legal_name: input.name,
    };
  }

  if (input.email) {
    baseBody.user = {
      ...(baseBody.user as Record<string, unknown>),
      email_address: input.email,
    };
  }

  if (config.redirectUri) {
    baseBody.redirect_uri = config.redirectUri;
  }

  if (config.webhookUrl) {
    baseBody.webhook = config.webhookUrl;
  }

  if (input.existingAccessToken) {
    baseBody.access_token = input.existingAccessToken;
    baseBody.update = { account_selection_enabled: true };
  }

  return plaidRequest<{
    expiration: string;
    link_token: string;
    request_id: string;
  }>("/link/token/create", { body: baseBody });
}

export async function exchangePlaidPublicToken(publicToken: string) {
  return plaidRequest<{
    access_token: string;
    item_id: string;
    request_id: string;
  }>("/item/public_token/exchange", {
    body: {
      public_token: publicToken,
    },
  });
}

export async function getPlaidItem(accessToken: string) {
  return plaidRequest<{
    item?: {
      item_id?: string;
      institution_id?: string | null;
      available_products?: string[];
      billed_products?: string[];
      webhook?: string | null;
    };
    request_id: string;
  }>("/item/get", { accessToken });
}

export async function getPlaidAccounts(accessToken: string) {
  return plaidRequest<{
    accounts?: Array<Record<string, unknown>>;
    item?: Record<string, unknown>;
    request_id: string;
  }>("/accounts/get", { accessToken });
}

export async function syncPlaidTransactions(accessToken: string, cursor?: string | null) {
  return plaidRequest<{
    added?: Array<Record<string, unknown>>;
    modified?: Array<Record<string, unknown>>;
    removed?: Array<{ transaction_id?: string }>;
    next_cursor?: string;
    has_more?: boolean;
    request_id: string;
  }>("/transactions/sync", {
    accessToken,
    body: {
      cursor: cursor || undefined,
      count: 250,
    },
  });
}