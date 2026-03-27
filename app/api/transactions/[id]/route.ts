import { NextRequest, NextResponse } from 'next/server';
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
  const { id } = await params;
  const data = await req.json();

  if (data.kind && data.kind !== 'income' && data.kind !== 'expense') {
    return NextResponse.json({ error: 'Invalid kind' }, { status: 400 });
  }

  await connectToDatabase();
  const tx = await Transaction.findByIdAndUpdate(id, data, { returnDocument: 'after' });
  if (!tx) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json({ transaction: toTransactionResponse(tx) });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await connectToDatabase();
  const tx = await Transaction.findByIdAndDelete(id);
  if (!tx) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}