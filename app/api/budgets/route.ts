import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '../../../lib/mongodb';
import Budget from '../../../models/Budget';

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId');
  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  }

  await connectToDatabase();
  const budget = await Budget.findOne({ userId });

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
  const { userId, categories, period } = await req.json();
  if (!userId || !categories || typeof categories !== 'object') {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const safeCategories = Object.fromEntries(
    Object.entries(categories as Record<string, unknown>).map(([key, value]) => [
      key,
      Number.isFinite(Number(value)) ? Number(value) : 0,
    ])
  );

  await connectToDatabase();
  const budget = await Budget.findOneAndUpdate(
    { userId },
    { userId, categories: safeCategories, period: period || 'monthly' },
    { new: true, upsert: true, runValidators: true }
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