import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedApiUser, unauthorizedResponse, forbiddenResponse } from '../../../lib/apiAuth';
import { connectToDatabase } from '../../../lib/mongodb';
import { getPlanCapabilities, hasFeatureAccess } from '../../../lib/subscriptions';
import Transaction from '../../../models/Transaction';

type TransactionKind = 'income' | 'expense';

function toTransactionResponse(transaction: any) {
  return {
    id: String(transaction._id),
    userId: String(transaction.userId),
    date:
      transaction.date instanceof Date
        ? transaction.date.toISOString().slice(0, 10)
        : String(transaction.date).slice(0, 10),
    amount: transaction.amount,
    kind: transaction.kind,
    category: transaction.category,
    description: transaction.description ?? '',
    tags: Array.isArray(transaction.tags) ? transaction.tags : [],
    createdAt: transaction.createdAt ? new Date(transaction.createdAt).toISOString() : undefined,
    updatedAt: transaction.updatedAt ? new Date(transaction.updatedAt).toISOString() : undefined,
  };
}

function normalizeTags(input: unknown) {
  if (!Array.isArray(input)) {
    return [];
  }

  return Array.from(
    new Set(
      input
        .map((tag) => String(tag ?? '').trim())
        .filter(Boolean)
        .filter((tag) => tag.length <= 30)
    )
  );
}

export async function GET(req: NextRequest) {
  const authenticatedUser = await getAuthenticatedApiUser();
  if (!authenticatedUser) {
    return unauthorizedResponse();
  }

  const { searchParams } = new URL(req.url);
  const kind = searchParams.get('kind');

  if (kind && kind !== 'income' && kind !== 'expense') {
    return NextResponse.json({ error: 'Invalid kind' }, { status: 400 });
  }

  await connectToDatabase();
  const filter: { userId: string; kind?: 'income' | 'expense' } = { userId: authenticatedUser.userId };
  if (kind) {
    filter.kind = kind as TransactionKind;
  }

  const list = await Transaction.find(filter).sort({ date: -1, createdAt: -1 });
  return NextResponse.json({ transactions: list.map(toTransactionResponse) });
}

export async function POST(req: NextRequest) {
  const authenticatedUser = await getAuthenticatedApiUser();
  if (!authenticatedUser) {
    return unauthorizedResponse();
  }

  const { date, amount, kind, category, description, tags } = await req.json();
  const normalizedCategory = String(category ?? '').trim();
  const normalizedDescription = typeof description === 'string' ? description.trim() : '';
  const normalizedTags = normalizeTags(tags);
  const numericAmount = Number(amount);

  if (!date || !normalizedCategory || !Number.isFinite(numericAmount) || numericAmount <= 0) {
    return NextResponse.json({ error: 'Date, category, and a positive amount are required.' }, { status: 400 });
  }

  if (kind && kind !== 'income' && kind !== 'expense') {
    return NextResponse.json({ error: 'Invalid kind' }, { status: 400 });
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date))) {
    return NextResponse.json({ error: 'Date must be in YYYY-MM-DD format.' }, { status: 400 });
  }

  if (normalizedCategory.length > 60 || normalizedDescription.length > 240) {
    return NextResponse.json({ error: 'This entry is too long. Shorten the category or description.' }, { status: 400 });
  }

  await connectToDatabase();

  const capabilities = getPlanCapabilities(authenticatedUser.planSlug);
  if (normalizedTags.length > 0 && !hasFeatureAccess(authenticatedUser.planSlug, 'transactionTags')) {
    return forbiddenResponse('Transaction tags are available on the Pro plan.');
  }

  if (capabilities.maxTransactionsPerMonth !== null) {
    const monthPrefix = String(date).slice(0, 7);
    const startOfMonth = new Date(`${monthPrefix}-01T00:00:00.000Z`);
    const endOfMonth = new Date(startOfMonth);
    endOfMonth.setUTCMonth(endOfMonth.getUTCMonth() + 1);

    const monthlyCount = await Transaction.countDocuments({
      userId: authenticatedUser.userId,
      date: { $gte: startOfMonth, $lt: endOfMonth },
    });

    if (monthlyCount >= capabilities.maxTransactionsPerMonth) {
      return forbiddenResponse(`Your ${authenticatedUser.planSlug} plan supports up to ${capabilities.maxTransactionsPerMonth} entries per month.`);
    }
  }

  const tx = new Transaction({
    userId: authenticatedUser.userId,
    date,
    amount: numericAmount,
    kind: kind || 'expense',
    category: normalizedCategory,
    description: normalizedDescription,
    tags: normalizedTags,
  });
  await tx.save();
  return NextResponse.json({ transaction: toTransactionResponse(tx) }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const authenticatedUser = await getAuthenticatedApiUser();
  if (!authenticatedUser) {
    return unauthorizedResponse();
  }

  const body = await req.json();
  const action = String(body.action ?? 'merge-category');

  await connectToDatabase();

  if (action === 'bulk-update-category') {
    if (!hasFeatureAccess(authenticatedUser.planSlug, 'bulkCategoryUpdates')) {
      return forbiddenResponse('Bulk category updates are available on the Pro plan.');
    }

    const transactionIds = Array.isArray(body.transactionIds) ? body.transactionIds.map((id: unknown) => String(id)) : [];
    const toCategory = String(body.toCategory ?? '').trim();
    if (transactionIds.length === 0 || !toCategory) {
      return NextResponse.json({ error: 'Transaction ids and a destination category are required.' }, { status: 400 });
    }

    const result = await Transaction.updateMany(
      { _id: { $in: transactionIds }, userId: authenticatedUser.userId, kind: 'expense' },
      { $set: { category: toCategory } }
    );
    return NextResponse.json({ modifiedCount: result.modifiedCount ?? 0 });
  }

  if (!hasFeatureAccess(authenticatedUser.planSlug, 'mergeCategories')) {
    return forbiddenResponse('Category merging is available on the Pro plan.');
  }

  const fromCategory = String(body.fromCategory ?? '').trim();
  const toCategory = String(body.toCategory ?? '').trim();
  if (!fromCategory || !toCategory) {
    return NextResponse.json({ error: 'Both source and destination categories are required.' }, { status: 400 });
  }

  const result = await Transaction.updateMany(
    { userId: authenticatedUser.userId, kind: 'expense', category: fromCategory },
    { $set: { category: toCategory } }
  );

  return NextResponse.json({ modifiedCount: result.modifiedCount ?? 0 });
}