type YapilyRequestOptions = RequestInit & {
  consentToken?: string;
};

type HostedConsentRequestInput = {
  applicationUserId: string;
  institutionId: string;
  institutionCountryCode: string;
  redirectUrl: string;
};

export type YapilyConfig = {
  applicationUuid: string;
  secret: string;
  apiBaseUrl: string;
  redirectUrl: string;
  institutionId: string;
  institutionCountryCode: string;
  transactionDays: number;
};

function readEnv(name: string) {
  return process.env[name]?.trim() ?? "";
}

export function isYapilyConfigured() {
  return Boolean(readEnv("YAPILY_APPLICATION_UUID") && readEnv("YAPILY_SECRET"));
}

export function getYapilyConfig(): YapilyConfig {
  const applicationUuid = readEnv("YAPILY_APPLICATION_UUID");
  const secret = readEnv("YAPILY_SECRET");
  const apiBaseUrl = readEnv("YAPILY_API_BASE_URL") || "https://api.yapily.com";
  const redirectUrl = readEnv("YAPILY_REDIRECT_URL") || `${readEnv("NEXTAUTH_URL")}/api/bank/callback`;
  const institutionId = readEnv("YAPILY_SANDBOX_INSTITUTION_ID") || "modelo-sandbox";
  const institutionCountryCode = readEnv("YAPILY_SANDBOX_INSTITUTION_COUNTRY") || "GB";
  const transactionDays = Math.max(1, Number.parseInt(readEnv("YAPILY_SYNC_TRANSACTION_DAYS") || "90", 10) || 90);

  if (!applicationUuid || !secret) {
    throw new Error("Yapily is not configured. Add YAPILY_APPLICATION_UUID and YAPILY_SECRET to your environment.");
  }

  if (!redirectUrl || redirectUrl.startsWith("/")) {
    throw new Error("Yapily requires a public redirect URL. Set YAPILY_REDIRECT_URL to your public /api/bank/callback endpoint.");
  }

  return {
    applicationUuid,
    secret,
    apiBaseUrl,
    redirectUrl,
    institutionId,
    institutionCountryCode,
    transactionDays,
  };
}

export function buildYapilyCallbackUrl(connectionId: string, bankState: string) {
  const config = getYapilyConfig();
  const callbackUrl = new URL(config.redirectUrl);
  callbackUrl.searchParams.set("connectionId", connectionId);
  callbackUrl.searchParams.set("bankState", bankState);
  return callbackUrl.toString();
}

function buildBasicAuthValue(applicationUuid: string, secret: string) {
  return Buffer.from(`${applicationUuid}:${secret}`).toString("base64");
}

function extractErrorMessage(payload: unknown, fallbackMessage: string) {
  if (!payload || typeof payload !== "object") {
    return fallbackMessage;
  }

  const nestedError = (payload as { error?: unknown }).error;
  if (nestedError && typeof nestedError === "object") {
    const nestedCandidates = [
      (nestedError as { message?: unknown }).message,
      (nestedError as { errorMessage?: unknown }).errorMessage,
      (nestedError as { detail?: unknown }).detail,
      (nestedError as { status?: unknown }).status,
    ];

    for (const candidate of nestedCandidates) {
      if (typeof candidate === "string" && candidate.trim()) {
        return candidate.trim();
      }
    }
  }

  const candidates = [
    (payload as { error?: unknown }).error,
    (payload as { message?: unknown }).message,
    (payload as { detail?: unknown }).detail,
    (payload as { errorMessage?: unknown }).errorMessage,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  return fallbackMessage;
}

function formatYapilyError(path: string, status: number, payload: unknown) {
  const fallbackMessage = `Yapily request failed with status ${status}.`;
  const errorMessage = extractErrorMessage(payload, fallbackMessage);
  const normalizedMessage = errorMessage.toLowerCase();

  if (status === 403 && normalizedMessage.includes("right scope")) {
    if (path.startsWith("/hosted/consent-requests")) {
      return "Yapily authenticated successfully, but this application is not allowed to create Hosted Consent requests. Enable the Yapily Data and Hosted Consent scopes for this application, or switch to sandbox credentials that include them.";
    }

    if (path === "/accounts" || path.startsWith("/accounts/")) {
      return "Yapily rejected the current consent for account data access. Reconnect the bank with an application that has ACCOUNTS, ACCOUNT_BALANCES, and ACCOUNT_TRANSACTIONS access enabled.";
    }
  }

  return errorMessage;
}

export async function yapilyRequest<T>(path: string, options: YapilyRequestOptions = {}): Promise<T> {
  const config = getYapilyConfig();
  const headers = new Headers(options.headers ?? {});
  headers.set("Authorization", `Basic ${buildBasicAuthValue(config.applicationUuid, config.secret)}`);
  headers.set("Accept", "application/json");

  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  if (options.consentToken) {
    headers.set("consent", options.consentToken);
  }

  const response = await fetch(`${config.apiBaseUrl}${path}`, {
    ...options,
    headers,
    cache: "no-store",
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(formatYapilyError(path, response.status, payload));
  }

  return payload as T;
}

export async function createHostedConsentRequest(input: HostedConsentRequestInput) {
  const config = getYapilyConfig();
  const now = new Date();
  const transactionFrom = new Date(now);
  transactionFrom.setUTCDate(transactionFrom.getUTCDate() - config.transactionDays);

  const authorisationExpiresAt = new Date(now.getTime() + (15 * 60 * 1000));
  const consentExpiresAt = new Date(now.getTime() + (90 * 24 * 60 * 60 * 1000));

  return yapilyRequest<Record<string, unknown>>("/hosted/consent-requests", {
    method: "POST",
    body: JSON.stringify({
      applicationUserId: input.applicationUserId,
      institutionIdentifiers: {
        institutionId: input.institutionId,
        institutionCountryCode: input.institutionCountryCode,
      },
      userSettings: {
        language: "en",
        location: input.institutionCountryCode,
      },
      redirectUrl: input.redirectUrl,
      oneTimeToken: false,
      authorisationExpiresAt: authorisationExpiresAt.toISOString(),
      accountRequest: {
        transactionFrom: transactionFrom.toISOString(),
        transactionTo: now.toISOString(),
        expiresAt: consentExpiresAt.toISOString(),
        featureScope: ["ACCOUNTS", "ACCOUNT", "ACCOUNT_BALANCES", "ACCOUNT_TRANSACTIONS"],
      },
    }),
  });
}

export async function getHostedConsentRequest(consentRequestId: string) {
  return yapilyRequest<Record<string, unknown>>(`/hosted/consent-requests/${encodeURIComponent(consentRequestId)}`);
}

export async function getAccounts(consentToken: string) {
  return yapilyRequest<Record<string, unknown>>("/accounts", { consentToken });
}

export async function getAccountTransactions(consentToken: string, accountId: string, fromIso: string, toIso: string) {
  const params = new URLSearchParams({
    from: fromIso,
    to: toIso,
  });
  return yapilyRequest<Record<string, unknown>>(`/accounts/${encodeURIComponent(accountId)}/transactions?${params.toString()}`, {
    consentToken,
  });
}

function findFirstValue(input: unknown, matcher: (key: string, value: unknown) => boolean): unknown {
  const queue: unknown[] = [input];
  const visited = new Set<unknown>();

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || typeof current !== "object") {
      continue;
    }

    if (visited.has(current)) {
      continue;
    }
    visited.add(current);

    if (Array.isArray(current)) {
      queue.push(...current);
      continue;
    }

    for (const [key, value] of Object.entries(current)) {
      if (matcher(key, value)) {
        return value;
      }

      if (value && typeof value === "object") {
        queue.push(value);
      }
    }
  }

  return undefined;
}

export function extractFirstString(input: unknown, keys: string[]) {
  const keySet = new Set(keys.map((key) => key.toLowerCase()));
  const match = findFirstValue(input, (key, value) => keySet.has(key.toLowerCase()) && typeof value === "string" && value.trim().length > 0);
  return typeof match === "string" ? match.trim() : undefined;
}

export function extractFirstNumber(input: unknown, keys: string[]) {
  const keySet = new Set(keys.map((key) => key.toLowerCase()));
  const match = findFirstValue(input, (key, value) => keySet.has(key.toLowerCase()) && typeof value === "number" && Number.isFinite(value));
  return typeof match === "number" ? match : undefined;
}

export function extractFirstArray(input: unknown, keys: string[]) {
  const keySet = new Set(keys.map((key) => key.toLowerCase()));
  const match = findFirstValue(input, (key, value) => keySet.has(key.toLowerCase()) && Array.isArray(value));
  return Array.isArray(match) ? match : [];
}

export function extractHostedConsentState(payload: unknown) {
  return {
    consentId: extractFirstString(payload, ["consentId"]),
    consentToken: extractFirstString(payload, ["consentToken"]),
    authToken: extractFirstString(payload, ["authToken"]),
    status: extractFirstString(payload, ["status", "consentStatus", "authorisationStatus"]),
    authorisationExpiresAt: extractFirstString(payload, ["authorisationExpiresAt"]),
  };
}