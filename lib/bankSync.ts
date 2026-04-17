import mongoose from "mongoose";
import BankConnection, { type IBankConnection } from "../models/BankConnection";
import Account from "../models/Account";
import Transaction from "../models/Transaction";
import {
  extractFirstArray,
  extractFirstNumber,
  extractFirstString,
  getAccountTransactions,
  getAccounts,
  getYapilyConfig,
} from "./yapily";

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
  const directName = pickString(rawAccount, ["nickname", "name", "displayName", "accountName"]);
  const accountNames = Array.isArray(rawAccount.accountNames) ? rawAccount.accountNames : [];
  const namedEntry = accountNames.find((entry) => asRecord(entry)?.name);
  const nestedName = namedEntry ? pickString(asRecord(namedEntry), ["name"]) : undefined;
  const baseName = directName || nestedName || "Synced account";
  const suffix = providerAccountId.slice(-4).padStart(4, "0");
  return `${baseName} · ${suffix}`;
}

function normalizeAccountBalance(rawAccount: Record<string, unknown>) {
  const directBalance = pickNumber(rawAccount, ["balance"]);
  if (typeof directBalance === "number") {
    return directBalance;
  }

  const balances = Array.isArray(rawAccount.balances) ? rawAccount.balances : [];
  for (const entry of balances) {
    const record = asRecord(entry);
    const amountRecord = asRecord(record?.balanceAmount);
    const amount = pickNumber(amountRecord, ["amount"]);
    if (typeof amount === "number") {
      return amount;
    }
  }

  return 0;
}

function normalizeAccountCurrency(rawAccount: Record<string, unknown>) {
  const directCurrency = pickString(rawAccount, ["currency", "isoCurrencyCode"]);
  if (directCurrency) {
    return directCurrency.toUpperCase();
  }

  const balances = Array.isArray(rawAccount.balances) ? rawAccount.balances : [];
  for (const entry of balances) {
    const record = asRecord(entry);
    const amountRecord = asRecord(record?.balanceAmount);
    const currency = pickString(amountRecord, ["currency"]);
    if (currency) {
      return currency.toUpperCase();
    }
  }

  return "GBP";
}

function normalizeTransactionKind(rawTransaction: Record<string, unknown>, amount: number): "income" | "expense" {
  const indicator = pickString(rawTransaction, ["creditDebitIndicator", "type"]);
  if (indicator?.toUpperCase().includes("CREDIT")) {
    return "income";
  }
  if (indicator?.toUpperCase().includes("DEBIT")) {
    return "expense";
  }
  return amount < 0 ? "expense" : "income";
}

function normalizeTransactionDate(rawTransaction: Record<string, unknown>) {
  const rawDate = pickString(rawTransaction, ["date", "bookingDateTime", "bookingDate", "valueDateTime", "valueDate"]);
  const date = rawDate ? new Date(rawDate) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function normalizeTransactionDescription(rawTransaction: Record<string, unknown>) {
  return pickString(rawTransaction, ["description", "reference", "merchantName", "payeeName", "title"]) || "Bank synced transaction";
}

function normalizeTransactionCategory(rawTransaction: Record<string, unknown>, kind: "income" | "expense") {
  const category = pickString(rawTransaction, ["category", "transactionCategory", "type"]);
  if (category) {
    return category;
  }
  return kind === "income" ? "Bank income" : "Bank spending";
}

function normalizeTransactionAmount(rawTransaction: Record<string, unknown>) {
  const amountRecord = asRecord(rawTransaction.transactionAmount);
  const amount = pickNumber(amountRecord, ["amount"]) ?? pickNumber(rawTransaction, ["amount"]);
  return typeof amount === "number" ? amount : undefined;
}

function getAccountsFromPayload(payload: Record<string, unknown>) {
  const directAccounts = extractFirstArray(payload, ["accounts", "data"]);
  return directAccounts
    .map((entry) => asRecord(entry))
    .filter((entry): entry is Record<string, unknown> => Boolean(entry));
}

function getTransactionsFromPayload(payload: Record<string, unknown>) {
  const directTransactions = extractFirstArray(payload, ["transactions", "data"]);
  return directTransactions
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
  const consentToken = connection.consentToken || connection.authToken;
  if (!consentToken) {
    throw new Error("The bank connection is missing a Yapily consent token.");
  }

  const userId = toObjectId(connection.userId);
  const now = new Date();
  const config = getYapilyConfig();
  const syncFrom = connection.lastSyncAt
    ? new Date(connection.lastSyncAt)
    : new Date(now.getTime() - (config.transactionDays * 24 * 60 * 60 * 1000));

  const accountsPayload = await getAccounts(consentToken);
  const remoteAccounts = getAccountsFromPayload(accountsPayload);

  let importedAccounts = 0;
  let importedTransactions = 0;
  let updatedTransactions = 0;

  for (const rawAccount of remoteAccounts) {
    const providerAccountId =
      pickString(rawAccount, ["id", "accountId"]) ||
      extractFirstString(rawAccount, ["id", "accountId"]);

    if (!providerAccountId) {
      continue;
    }

    const account = await Account.findOneAndUpdate(
      {
        userId,
        provider: "yapily",
        providerAccountId,
      },
      {
        $set: {
          name: normalizeAccountName(rawAccount, providerAccountId),
          type: pickString(rawAccount, ["accountType", "type"]) || "checking",
          balance: normalizeAccountBalance(rawAccount),
          currency: normalizeAccountCurrency(rawAccount),
          syncStatus: "synced",
          provider: "yapily",
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

    const transactionsPayload = await getAccountTransactions(
      consentToken,
      providerAccountId,
      syncFrom.toISOString(),
      now.toISOString(),
    );

    const rawTransactions = getTransactionsFromPayload(transactionsPayload);
    for (const [index, rawTransaction] of rawTransactions.entries()) {
      const rawAmount = normalizeTransactionAmount(rawTransaction);
      if (typeof rawAmount !== "number" || rawAmount === 0) {
        continue;
      }

      const kind = normalizeTransactionKind(rawTransaction, rawAmount);
      const providerTransactionId =
        pickString(rawTransaction, ["id", "transactionId"]) ||
        buildFallbackTransactionId(rawTransaction, providerAccountId, index);

      const payload = {
        accountId: account._id,
        date: normalizeTransactionDate(rawTransaction),
        amount: Math.abs(rawAmount),
        kind,
        category: normalizeTransactionCategory(rawTransaction, kind),
        description: normalizeTransactionDescription(rawTransaction),
        source: "bank-sync",
        provider: "yapily",
        providerTransactionId,
        providerConnectionId: connection._id,
        lastSyncedAt: now,
      };

      const existingTransaction = await Transaction.findOne({
        userId,
        provider: "yapily",
        providerTransactionId,
      }).select("_id");

      if (existingTransaction) {
        await Transaction.updateOne({ _id: existingTransaction._id }, { $set: payload });
        updatedTransactions += 1;
      } else {
        await Transaction.create({
          userId,
          ...payload,
          tags: [],
        });
        importedTransactions += 1;
      }
    }
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