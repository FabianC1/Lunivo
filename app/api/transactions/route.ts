import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '../../../lib/mongodb';
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
    createdAt: transaction.createdAt ? new Date(transaction.createdAt).toISOString() : undefined,
    updatedAt: transaction.updatedAt ? new Date(transaction.updatedAt).toISOString() : undefined,
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  const kind = searchParams.get('kind');
  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  }

  if (kind && kind !== 'income' && kind !== 'expense') {
    return NextResponse.json({ error: 'Invalid kind' }, { status: 400 });
  }

  await connectToDatabase();
  const filter: { userId: string; kind?: 'income' | 'expense' } = { userId };
  if (kind) {
    filter.kind = kind as TransactionKind;
  }

  const list = await Transaction.find(filter).sort({ date: -1, createdAt: -1 });
  return NextResponse.json({ transactions: list.map(toTransactionResponse) });
}

export async function POST(req: NextRequest) {
  const { userId, date, amount, kind, category, description } = await req.json();
  if (!userId || !date || !category || !Number.isFinite(Number(amount))) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  if (kind && kind !== 'income' && kind !== 'expense') {
    return NextResponse.json({ error: 'Invalid kind' }, { status: 400 });
  }

  await connectToDatabase();
  const tx = new Transaction({
    userId,
    date,
    amount: Number(amount),
    kind: kind || 'expense',
    category,
    description,
  });
  await tx.save();
  return NextResponse.json({ transaction: toTransactionResponse(tx) }, { status: 201 });
}