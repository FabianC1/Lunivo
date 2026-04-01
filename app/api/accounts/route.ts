import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedApiUser, unauthorizedResponse, forbiddenResponse } from '../../../lib/apiAuth';
import { connectToDatabase } from '../../../lib/mongodb';
import { getPlanCapabilities } from '../../../lib/subscriptions';
import Account from '../../../models/Account';

export async function GET(req: NextRequest) {
  const authenticatedUser = await getAuthenticatedApiUser();
  if (!authenticatedUser) {
    return unauthorizedResponse();
  }

  const { searchParams } = new URL(req.url);
  const includeArchived = searchParams.get('includeArchived') === 'true';

  await connectToDatabase();

  const filter: { userId: string; isArchived?: boolean } = { userId: authenticatedUser.userId };
  if (!includeArchived) {
    filter.isArchived = false;
  }

  const accounts = await Account.find(filter).sort({ createdAt: -1 });
  return NextResponse.json({ accounts });
}

export async function POST(req: NextRequest) {
  const authenticatedUser = await getAuthenticatedApiUser();
  if (!authenticatedUser) {
    return unauthorizedResponse();
  }

  const { name, type, balance, currency } = await req.json();
  const normalizedName = String(name ?? '').trim();

  if (!normalizedName) {
    return NextResponse.json({ error: 'Account name is required.' }, { status: 400 });
  }

  if (normalizedName.length > 60) {
    return NextResponse.json({ error: 'Account name is too long.' }, { status: 400 });
  }

  await connectToDatabase();

  const capabilities = getPlanCapabilities(authenticatedUser.planSlug);
  if (capabilities.maxAccounts !== null) {
    const accountCount = await Account.countDocuments({ userId: authenticatedUser.userId, isArchived: false });
    if (accountCount >= capabilities.maxAccounts) {
      return forbiddenResponse(`Your ${authenticatedUser.planSlug} plan supports up to ${capabilities.maxAccounts} active accounts.`);
    }
  }

  try {
    const account = new Account({
      userId: authenticatedUser.userId,
      name: normalizedName,
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
