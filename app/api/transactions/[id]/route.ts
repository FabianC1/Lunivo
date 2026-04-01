import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedApiUser, unauthorizedResponse } from '../../../../lib/apiAuth';
import { connectToDatabase } from '../../../../lib/mongodb';
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
    createdAt: transaction.createdAt ? new Date(transaction.createdAt).toISOString() : undefined,
    updatedAt: transaction.updatedAt ? new Date(transaction.updatedAt).toISOString() : undefined,
  };
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