import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedApiUser, forbiddenResponse, unauthorizedResponse } from '../../../../lib/apiAuth';
import { connectToDatabase } from '../../../../lib/mongodb';
import { hasFeatureAccess } from '../../../../lib/subscriptions';
import Transaction from '../../../../models/Transaction';

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

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authenticatedUser = await getAuthenticatedApiUser();
  if (!authenticatedUser) {
    return unauthorizedResponse();
  }

  const { id } = await params;
  const data = await req.json();

  if (data.amount !== undefined && (!Number.isFinite(Number(data.amount)) || Number(data.amount) <= 0)) {
    return NextResponse.json({ error: 'Amount must be a positive number.' }, { status: 400 });
  }

  if (data.kind && data.kind !== 'income' && data.kind !== 'expense') {
    return NextResponse.json({ error: 'Invalid kind' }, { status: 400 });
  }

  if (data.category !== undefined && !String(data.category).trim()) {
    return NextResponse.json({ error: 'Category is required.' }, { status: 400 });
  }

  const normalizedTags = normalizeTags(data.tags);
  if (normalizedTags.length > 0 && !hasFeatureAccess(authenticatedUser.planSlug, 'transactionTags')) {
    return forbiddenResponse('Transaction tags are available on the Pro plan.');
  }

  if (data.tags !== undefined) {
    data.tags = normalizedTags;
  }

  await connectToDatabase();
  const tx = await Transaction.findOneAndUpdate(
    { _id: id, userId: authenticatedUser.userId },
    data,
    { returnDocument: 'after', runValidators: true },
  );
  if (!tx) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json({ transaction: toTransactionResponse(tx) });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authenticatedUser = await getAuthenticatedApiUser();
  if (!authenticatedUser) {
    return unauthorizedResponse();
  }

  const { id } = await params;
  await connectToDatabase();
  const tx = await Transaction.findOneAndDelete({ _id: id, userId: authenticatedUser.userId });
  if (!tx) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}