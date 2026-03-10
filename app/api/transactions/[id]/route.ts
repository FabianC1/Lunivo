import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../lib/mongodb';
import Transaction from '../../../../models/Transaction';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const data = await req.json();
  await connectToDatabase();
  const tx = await Transaction.findByIdAndUpdate(params.id, data, { new: true });
  if (!tx) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json({ transaction: tx });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  await connectToDatabase();
  const tx = await Transaction.findByIdAndDelete(params.id);
  if (!tx) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}