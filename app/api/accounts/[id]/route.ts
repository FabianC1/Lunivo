import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedApiUser, unauthorizedResponse } from '../../../../lib/apiAuth';
import { connectToDatabase } from '../../../../lib/mongodb';
import Account from '../../../../models/Account';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authenticatedUser = await getAuthenticatedApiUser();
  if (!authenticatedUser) {
    return unauthorizedResponse();
  }

  const { id } = await params;
  const data = await req.json();
  const { ...updates } = data;

  const allowedUpdates = ['name', 'type', 'balance', 'currency', 'isArchived'];
  const safeUpdates: Record<string, unknown> = {};

  for (const key of allowedUpdates) {
    if (key in updates) {
      safeUpdates[key] = key === 'currency' ? String(updates[key]).toUpperCase() : updates[key];
    }
  }

  await connectToDatabase();

  const account = await Account.findOneAndUpdate({ _id: id, userId: authenticatedUser.userId }, safeUpdates, {
    returnDocument: 'after',
    runValidators: true,
  });

  if (!account) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ account });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authenticatedUser = await getAuthenticatedApiUser();
  if (!authenticatedUser) {
    return unauthorizedResponse();
  }

  const { id } = await params;

  await connectToDatabase();

  const account = await Account.findOneAndDelete({ _id: id, userId: authenticatedUser.userId });
  if (!account) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
