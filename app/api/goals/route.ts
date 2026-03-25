import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '../../../lib/mongodb';
import Goal from '../../../models/Goal';

function toGoalResponse(goal: any) {
  return {
    id: String(goal._id),
    userId: String(goal.userId),
    title: goal.title,
    kind: goal.kind,
    targetAmount: goal.targetAmount,
    savedAmount: goal.savedAmount,
    targetDate: goal.targetDate instanceof Date ? goal.targetDate.toISOString().slice(0, 10) : goal.targetDate,
    notes: goal.notes || '',
    completed: goal.completed,
    completedAt: goal.completedAt ? new Date(goal.completedAt).toISOString() : undefined,
    createdAt: goal.createdAt ? new Date(goal.createdAt).toISOString() : undefined,
    updatedAt: goal.updatedAt ? new Date(goal.updatedAt).toISOString() : undefined,
  };
}

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId');
  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  }

  await connectToDatabase();
  const goals = await Goal.find({ userId }).sort({ completed: 1, createdAt: -1 });
  return NextResponse.json({ goals: goals.map(toGoalResponse) });
}

export async function POST(req: NextRequest) {
  const { userId, title, kind, targetAmount, savedAmount, targetDate, notes } = await req.json();
  if (!userId || !title || !kind || !targetDate || !Number.isFinite(Number(targetAmount))) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  await connectToDatabase();
  const goal = await Goal.create({
    userId,
    title: String(title).trim(),
    kind: String(kind).trim(),
    targetAmount: Number(targetAmount),
    savedAmount: Number.isFinite(Number(savedAmount)) ? Number(savedAmount) : 0,
    targetDate,
    notes: typeof notes === 'string' ? notes.trim() : '',
  });

  return NextResponse.json({ goal: toGoalResponse(goal) }, { status: 201 });
}