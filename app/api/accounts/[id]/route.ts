import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../lib/mongodb';
import Account from '../../../../models/Account';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await req.json();
  const { userId, ...updates } = data;

  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  }

  const allowedUpdates = ['name', 'type', 'balance', 'currency', 'isArchived'];
  const safeUpdates: Record<string, unknown> = {};

  for (const key of allowedUpdates) {
    if (key in updates) {
      safeUpdates[key] = key === 'currency' ? String(updates[key]).toUpperCase() : updates[key];
    }
  }

  await connectToDatabase();

  const account = await Account.findOneAndUpdate({ _id: id, userId }, safeUpdates, {
    new: true,
    runValidators: true,
  });

  if (!account) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ account });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  }

  await connectToDatabase();

  const account = await Account.findOneAndDelete({ _id: id, userId });
  if (!account) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
