import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '../../../lib/mongodb';
import Account from '../../../models/Account';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  const includeArchived = searchParams.get('includeArchived') === 'true';

  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  }

  await connectToDatabase();

  const filter: { userId: string; isArchived?: boolean } = { userId };
  if (!includeArchived) {
    filter.isArchived = false;
  }

  const accounts = await Account.find(filter).sort({ createdAt: -1 });
  return NextResponse.json({ accounts });
}

export async function POST(req: NextRequest) {
  const { userId, name, type, balance, currency } = await req.json();

  if (!userId || !name) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  await connectToDatabase();

  try {
    const account = new Account({
      userId,
      name,
      type: type || 'checking',
      balance: Number.isFinite(Number(balance)) ? Number(balance) : 0,
      currency: (currency || 'GBP').toString().toUpperCase(),
    });

    await account.save();
    return NextResponse.json({ account }, { status: 201 });
  } catch (error: any) {
    if (error?.code === 11000) {
      return NextResponse.json(
        { error: 'An account with this name already exists for this user' },
        { status: 409 }
      );
    }

    return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
  }
}
