import mongoose from "mongoose";
import BankConnection, { type IBankConnection } from "../models/BankConnection";
import Account from "../models/Account";
import Transaction from "../models/Transaction";
import { getPlaidAccounts, syncPlaidTransactions } from "./plaid";

type SyncSummary = {
  importedAccounts: number;
  importedTransactions: number;
  updatedTransactions: number;
};

function toObjectId(value: mongoose.Types.ObjectId | string) {
  return typeof value === "string" ? new mongoose.Types.ObjectId(value) : value;
}

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function pickString(source: Record<string, unknown> | null, keys: string[]) {
  if (!source) {
    return undefined;
  }

  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return undefined;
}

function pickNumber(source: Record<string, unknown> | null, keys: string[]) {
  if (!source) {
    return undefined;
  }

  for (const key of keys) {
    const value = source[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return undefined;
}

function normalizeAccountName(rawAccount: Record<string, unknown>, providerAccountId: string) {
  const baseName = pickString(rawAccount, ["name", "official_name", "displayName", "accountName"]) || "Synced account";
  const suffix = pickString(rawAccount, ["mask"]) || providerAccountId.slice(-4).padStart(4, "0");
  return `${baseName} · ${suffix}`;
}

function normalizeAccountBalance(rawAccount: Record<string, unknown>) {
  const balances = asRecord(rawAccount.balances);
  return pickNumber(balances, ["current", "available", "limit"]) ?? 0;
}

function normalizeAccountCurrency(rawAccount: Record<string, unknown>) {
  const balances = asRecord(rawAccount.balances);
  const currency = pickString(balances, ["iso_currency_code", "unofficial_currency_code", "currency"]);
  return currency ? currency.toUpperCase() : "GBP";
}

function normalizeTransactionKind(rawTransaction: Record<string, unknown>, amount: number): "income" | "expense" {
  const pendingType = pickString(rawTransaction, ["payment_channel", "transaction_type"]);
  if (pendingType?.toLowerCase().includes("special") || pendingType?.toLowerCase().includes("place")) {
    return amount < 0 ? "income" : "expense";
  }

  return amount < 0 ? "income" : "expense";
}

function normalizeTransactionDate(rawTransaction: Record<string, unknown>) {
  const rawDate = pickString(rawTransaction, ["date", "datetime", "authorized_date", "authorized_datetime"]);
  const date = rawDate ? new Date(rawDate) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function normalizeTransactionDescription(rawTransaction: Record<string, unknown>) {
  return pickString(rawTransaction, ["merchant_name", "name", "original_description", "authorized_merchant_name"]) || "Bank synced transaction";
}

function normalizeTransactionCategory(rawTransaction: Record<string, unknown>, kind: "income" | "expense") {
  const personalFinance = asRecord(rawTransaction.personal_finance_category);
  const category = pickString(personalFinance, ["detailed", "primary"]) || pickString(rawTransaction, ["personal_finance_category_icon_url"]);
  if (category && !category.startsWith("http")) {
    return category.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (match) => match.toUpperCase());
  }
  return kind === "income" ? "Bank income" : "Bank spending";
}

function normalizeTransactionAmount(rawTransaction: Record<string, unknown>) {
  const amount = pickNumber(rawTransaction, ["amount"]);
  return typeof amount === "number" ? amount : undefined;
}

function getAccountsFromPayload(payload: { accounts?: Array<Record<string, unknown>> }) {
  return (payload.accounts ?? [])
    .map((entry) => asRecord(entry))
    .filter((entry): entry is Record<string, unknown> => Boolean(entry));
}

function getTransactionsFromPayload(payload: Array<Record<string, unknown>> | undefined) {
  return (payload ?? [])
    .map((entry) => asRecord(entry))
    .filter((entry): entry is Record<string, unknown> => Boolean(entry));
}

function buildFallbackTransactionId(rawTransaction: Record<string, unknown>, providerAccountId: string, index: number) {
  const date = normalizeTransactionDate(rawTransaction).toISOString();
  const amount = normalizeTransactionAmount(rawTransaction) ?? 0;
  const description = normalizeTransactionDescription(rawTransaction);
  return `${providerAccountId}:${date}:${amount}:${description}:${index}`;
}

export async function syncBankConnection(connection: IBankConnection): Promise<SyncSummary> {
  if (connection.provider !== "plaid") {
    throw new Error("This bank sync flow now expects a Plaid connection.");
  }

  const accessToken = connection.accessToken;
  if (!accessToken) {
    throw new Error("The bank connection is missing a Plaid access token.");
  }

  const userId = toObjectId(connection.userId);
  const now = new Date();
  const accountsPayload = await getPlaidAccounts(accessToken);
  const remoteAccounts = getAccountsFromPayload(accountsPayload);

  let importedAccounts = 0;
  let importedTransactions = 0;
  let updatedTransactions = 0;

  for (const rawAccount of remoteAccounts) {
    const providerAccountId = pickString(rawAccount, ["account_id", "id"]);

    if (!providerAccountId) {
      continue;
    }

    const account = await Account.findOneAndUpdate(
      {
        userId,
        provider: "plaid",
        providerAccountId,
      },
      {
        $set: {
          name: normalizeAccountName(rawAccount, providerAccountId),
          type: pickString(rawAccount, ["subtype", "type"]) || "checking",
          balance: normalizeAccountBalance(rawAccount),
          currency: normalizeAccountCurrency(rawAccount),
          syncStatus: "synced",
          provider: "plaid",
          providerAccountId,
          providerConnectionId: connection._id,
          lastSyncedAt: now,
          isArchived: false,
        },
        $setOnInsert: {
          userId,
        },
      },
      {
        upsert: true,
        returnDocument: "after",
        runValidators: true,
      }
    );

    if (!account) {
      continue;
    }

    importedAccounts += 1;
  }

  let cursor = connection.syncCursor ?? null;
  let hasMore = true;
  const removedTransactionIds: string[] = [];

  while (hasMore) {
    const transactionsPayload = await syncPlaidTransactions(accessToken, cursor);
    const nextCursor = typeof transactionsPayload.next_cursor === "string" ? transactionsPayload.next_cursor : cursor;

    for (const rawTransaction of getTransactionsFromPayload(transactionsPayload.added)) {
      const providerAccountId = pickString(rawTransaction, ["account_id"]);
      if (!providerAccountId) {
        continue;
      }

      const account = await Account.findOne({
        userId,
        provider: "plaid",
        providerAccountId,
      }).select("_id");
      if (!account) {
        continue;
      }

      const rawAmount = normalizeTransactionAmount(rawTransaction);
      if (typeof rawAmount !== "number" || rawAmount === 0) {
        continue;
      }

      const kind = normalizeTransactionKind(rawTransaction, rawAmount);
      const providerTransactionId = pickString(rawTransaction, ["transaction_id", "pending_transaction_id"])
        || buildFallbackTransactionId(rawTransaction, providerAccountId, importedTransactions);

      await Transaction.updateOne(
        {
          userId,
          provider: "plaid",
          providerTransactionId,
        },
        {
          $setOnInsert: {
            userId,
            tags: [],
          },
          $set: {
            accountId: account._id,
            date: normalizeTransactionDate(rawTransaction),
            amount: Math.abs(rawAmount),
            kind,
            category: normalizeTransactionCategory(rawTransaction, kind),
            description: normalizeTransactionDescription(rawTransaction),
            source: "bank-sync",
            provider: "plaid",
            providerTransactionId,
            providerConnectionId: connection._id,
            lastSyncedAt: now,
          },
        },
        { upsert: true }
      );

      importedTransactions += 1;
    }

    for (const rawTransaction of getTransactionsFromPayload(transactionsPayload.modified)) {
      const providerTransactionId = pickString(rawTransaction, ["transaction_id", "pending_transaction_id"]);
      const providerAccountId = pickString(rawTransaction, ["account_id"]);
      if (!providerTransactionId || !providerAccountId) {
        continue;
      }

      const account = await Account.findOne({
        userId,
        provider: "plaid",
        providerAccountId,
      }).select("_id");
      if (!account) {
        continue;
      }

      const rawAmount = normalizeTransactionAmount(rawTransaction);
      if (typeof rawAmount !== "number" || rawAmount === 0) {
        continue;
      }

      const kind = normalizeTransactionKind(rawTransaction, rawAmount);
      await Transaction.updateOne(
        {
          userId,
          provider: "plaid",
          providerTransactionId,
        },
        {
          $set: {
            accountId: account._id,
            date: normalizeTransactionDate(rawTransaction),
            amount: Math.abs(rawAmount),
            kind,
            category: normalizeTransactionCategory(rawTransaction, kind),
            description: normalizeTransactionDescription(rawTransaction),
            source: "bank-sync",
            provider: "plaid",
            providerConnectionId: connection._id,
            lastSyncedAt: now,
          },
        }
      );
      updatedTransactions += 1;
    }

    for (const removed of transactionsPayload.removed ?? []) {
      if (typeof removed.transaction_id === "string" && removed.transaction_id.trim()) {
        removedTransactionIds.push(removed.transaction_id.trim());
      }
    }

    cursor = nextCursor;
    hasMore = Boolean(transactionsPayload.has_more);
  }

  if (removedTransactionIds.length > 0) {
    await Transaction.deleteMany({
      userId,
      provider: "plaid",
      providerTransactionId: { $in: removedTransactionIds },
    });
  }

  await BankConnection.updateOne(
    { _id: connection._id },
    {
      $set: {
        status: "authorized",
        connectedAt: connection.connectedAt ?? now,
        lastSyncAt: now,
        lastSyncStatus: "success",
        lastSyncAccountCount: importedAccounts,
        lastSyncTransactionCount: importedTransactions,
        syncCursor: cursor ?? undefined,
        lastError: "",
      },
    }
  );

  return {
    importedAccounts,
    importedTransactions,
    updatedTransactions,
  };
}