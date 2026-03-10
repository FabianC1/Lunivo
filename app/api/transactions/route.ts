import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '../../../lib/mongodb';
import Transaction from '../../../models/Transaction';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  }

  await connectToDatabase();
  const list = await Transaction.find({ userId }).sort({ date: -1 });
  return NextResponse.json({ transactions: list });
}

export async function POST(req: NextRequest) {
  const { userId, date, amount, category, description } = await req.json();
  if (!userId || !date || !amount || !category) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  await connectToDatabase();
  const tx = new Transaction({ userId, date, amount, category, description });
  await tx.save();
  return NextResponse.json({ transaction: tx });
}