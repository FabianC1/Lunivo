import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import authOptions from '@/app/api/auth/[...nextauth]/route';
import RecurringTransaction from '@/models/RecurringTransaction';
import User from '@/models/User';
import dbConnect from '@/lib/dbConnect';

function getNextOccurrence(startDate: Date, frequency: string): Date {
  const next = new Date(startDate);

  switch (frequency) {
    case 'daily':
      next.setDate(next.getDate() + 1);
      break;
    case 'weekly':
      next.setDate(next.getDate() + 7);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      break;
    case 'yearly':
      next.setFullYear(next.getFullYear() + 1);
      break;
  }

  return next;
}

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const recurring = await RecurringTransaction.find({
      userId: user._id,
      enabled: true,
    }).sort({ nextOccurrence: 1 });

    return NextResponse.json(recurring);
  } catch (error: any) {
    console.error('[Recurring GET Error]', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch recurring transactions' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await req.json();
    const { description, category, amount, kind, frequency, startDate, endDate } = body;

    if (!description || !category || amount === undefined || !kind || !frequency || !startDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const start = new Date(startDate);
    const nextOccurrence = getNextOccurrence(start, frequency);

    const recurring = await RecurringTransaction.create({
      userId: user._id,
      description,
      category,
      amount,
      kind,
      frequency,
      startDate: start,
      endDate: endDate ? new Date(endDate) : undefined,
      nextOccurrence,
      enabled: true,
    });

    return NextResponse.json(recurring);
  } catch (error: any) {
    console.error('[Recurring POST Error]', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create recurring transaction' },
      { status: 500 }
    );
  }
}
