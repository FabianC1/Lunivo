import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedApiUser, unauthorizedResponse } from '../../../lib/apiAuth';
import { connectToDatabase } from '../../../lib/mongodb';
import Budget from '../../../models/Budget';

export async function GET(req: NextRequest) {
  const authenticatedUser = await getAuthenticatedApiUser();
  if (!authenticatedUser) {
    return unauthorizedResponse();
  }

  await connectToDatabase();
  const budget = await Budget.findOne({ userId: authenticatedUser.userId });

  return NextResponse.json({
    budget: budget
      ? {
          id: String(budget._id),
          userId: String(budget.userId),
          period: budget.period,
          categories: Object.fromEntries(budget.categories ?? []),
        }
      : null,
  });
}

export async function PUT(req: NextRequest) {
  const authenticatedUser = await getAuthenticatedApiUser();
  if (!authenticatedUser) {
    return unauthorizedResponse();
  }

  const { categories, period } = await req.json();
  if (!categories || typeof categories !== 'object') {
    return NextResponse.json({ error: 'Budget categories are required.' }, { status: 400 });
  }

  const safeCategories = Object.fromEntries(
    Object.entries(categories as Record<string, unknown>).map(([key, value]) => [
      key,
      Math.max(0, Number.isFinite(Number(value)) ? Number(value) : 0),
    ])
  );

  await connectToDatabase();
  const budget = await Budget.findOneAndUpdate(
    { userId: authenticatedUser.userId },
    { userId: authenticatedUser.userId, categories: safeCategories, period: period || 'monthly' },
    { returnDocument: 'after', upsert: true, runValidators: true }
  );

  return NextResponse.json({
    budget: {
      id: String(budget._id),
      userId: String(budget.userId),
      period: budget.period,
      categories: Object.fromEntries(budget.categories ?? []),
    },
  });
}