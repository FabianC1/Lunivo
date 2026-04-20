import { NextRequest, NextResponse } from "next/server";
import Budget from "../../../../models/Budget";
import Goal from "../../../../models/Goal";
import Transaction from "../../../../models/Transaction";
import User from "../../../../models/User";
import { getAuthenticatedApiUser, unauthorizedResponse } from "../../../../lib/apiAuth";
import { connectToDatabase } from "../../../../lib/mongodb";

type ExportFormat = "csv" | "json" | "backup";

function formatDate(value: Date | string | null | undefined) {
  if (!value) {
    return null;
  }

  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function toCsvValue(value: unknown) {
  const normalized = Array.isArray(value)
    ? value.join(" | ")
    : value === null || value === undefined
      ? ""
      : typeof value === "object"
        ? JSON.stringify(value)
        : String(value);

  return `"${normalized.replace(/"/g, '""')}"`;
}

function buildCsv(rows: Array<Record<string, unknown>>) {
  if (rows.length === 0) {
    return "date,kind,category,description,amount,source,tags\n";
  }

  const headers = Object.keys(rows[0]);
  const lines = rows.map((row) => headers.map((header) => toCsvValue(row[header])).join(","));
  return [headers.join(","), ...lines].join("\n");
}

export async function GET(req: NextRequest) {
  const authenticatedUser = await getAuthenticatedApiUser();
  if (!authenticatedUser) {
    return unauthorizedResponse();
  }

  const requestedFormat = req.nextUrl.searchParams.get("format");
  const format: ExportFormat = requestedFormat === "csv" || requestedFormat === "backup" ? requestedFormat : "json";

  await connectToDatabase();

  const [user, budget, goals, transactions] = await Promise.all([
    User.findById(authenticatedUser.userId)
      .select("name email planSlug backupEmail phone preferences appearance dashboard customCategories createdAt updatedAt")
      .lean(),
    Budget.findOne({ userId: authenticatedUser.userId }).select("categories period createdAt updatedAt").lean(),
    Goal.find({ userId: authenticatedUser.userId })
      .sort({ createdAt: -1 })
      .select("title kind targetAmount savedAmount targetDate notes completed completedAt createdAt updatedAt")
      .lean(),
    Transaction.find({ userId: authenticatedUser.userId })
      .sort({ date: -1, createdAt: -1 })
      .select("date amount kind category description tags source provider lastSyncedAt createdAt updatedAt")
      .lean(),
  ]);

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (format === "csv") {
    const rows = transactions.map((transaction) => ({
      date: formatDate(transaction.date) ?? "",
      kind: transaction.kind,
      category: transaction.category,
      description: transaction.description ?? "",
      amount: Number(transaction.amount ?? 0),
      source: transaction.source ?? "manual",
      tags: Array.isArray(transaction.tags) ? transaction.tags.join(" | ") : "",
    }));

    return new NextResponse(buildCsv(rows), {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="lunivo-transactions-export.csv"',
        "Cache-Control": "no-store",
      },
    });
  }

  const payload = {
    exportedAt: new Date().toISOString(),
    type: format === "backup" ? "full-backup" : "data-export",
    user: {
      id: String(user._id),
      name: user.name,
      email: user.email,
      planSlug: user.planSlug,
      backupEmail: user.backupEmail ?? "",
      phone: user.phone ?? "",
      preferences: user.preferences ?? null,
      appearance: user.appearance ?? null,
      dashboard: user.dashboard ?? null,
      customCategories: user.customCategories ?? [],
      createdAt: formatDate(user.createdAt),
      updatedAt: formatDate(user.updatedAt),
    },
    budgets: budget
      ? {
          period: budget.period,
          categories: Object.fromEntries(Object.entries(budget.categories ?? {})),
          createdAt: formatDate(budget.createdAt),
          updatedAt: formatDate(budget.updatedAt),
        }
      : null,
    goals: goals.map((goal) => ({
      id: String(goal._id),
      title: goal.title,
      kind: goal.kind,
      targetAmount: Number(goal.targetAmount ?? 0),
      savedAmount: Number(goal.savedAmount ?? 0),
      targetDate: formatDate(goal.targetDate),
      notes: goal.notes ?? "",
      completed: Boolean(goal.completed),
      completedAt: formatDate(goal.completedAt),
      createdAt: formatDate(goal.createdAt),
      updatedAt: formatDate(goal.updatedAt),
    })),
    transactions: transactions.map((transaction) => ({
      id: String(transaction._id),
      date: formatDate(transaction.date),
      amount: Number(transaction.amount ?? 0),
      kind: transaction.kind,
      category: transaction.category,
      description: transaction.description ?? "",
      tags: transaction.tags ?? [],
      source: transaction.source ?? "manual",
      provider: transaction.provider ?? null,
      lastSyncedAt: formatDate(transaction.lastSyncedAt),
      createdAt: formatDate(transaction.createdAt),
      updatedAt: formatDate(transaction.updatedAt),
    })),
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="lunivo-${format === "backup" ? "backup" : "export"}.json"`,
      "Cache-Control": "no-store",
    },
  });
}