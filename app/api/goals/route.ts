import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedApiUser, unauthorizedResponse, forbiddenResponse } from '../../../lib/apiAuth';
import { connectToDatabase } from '../../../lib/mongodb';
import { getPlanCapabilities } from '../../../lib/subscriptions';
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
  const authenticatedUser = await getAuthenticatedApiUser();
  if (!authenticatedUser) {
    return unauthorizedResponse();
  }

  await connectToDatabase();
  const goals = await Goal.find({ userId: authenticatedUser.userId }).sort({ completed: 1, createdAt: -1 });
  return NextResponse.json({ goals: goals.map(toGoalResponse) });
}

export async function POST(req: NextRequest) {
  const authenticatedUser = await getAuthenticatedApiUser();
  if (!authenticatedUser) {
    return unauthorizedResponse();
  }

  const { title, kind, targetAmount, savedAmount, targetDate, notes } = await req.json();
  const normalizedTitle = String(title ?? '').trim();
  const normalizedKind = String(kind ?? '').trim();
  const normalizedNotes = typeof notes === 'string' ? notes.trim() : '';
  const numericTargetAmount = Number(targetAmount);
  const numericSavedAmount = Number.isFinite(Number(savedAmount)) ? Number(savedAmount) : 0;

  if (!normalizedTitle || !normalizedKind || !targetDate || !Number.isFinite(numericTargetAmount) || numericTargetAmount <= 0) {
    return NextResponse.json({ error: 'Title, type, target date, and a positive target amount are required.' }, { status: 400 });
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(targetDate))) {
    return NextResponse.json({ error: 'Target date must be in YYYY-MM-DD format.' }, { status: 400 });
  }

  if (numericSavedAmount < 0 || numericSavedAmount > numericTargetAmount) {
    return NextResponse.json({ error: 'Saved amount must be between 0 and the target amount.' }, { status: 400 });
  }

  await connectToDatabase();

  const capabilities = getPlanCapabilities(authenticatedUser.planSlug);
  if (capabilities.maxGoals !== null) {
    const goalCount = await Goal.countDocuments({ userId: authenticatedUser.userId });
    if (goalCount >= capabilities.maxGoals) {
      return forbiddenResponse(`Your ${authenticatedUser.planSlug} plan supports up to ${capabilities.maxGoals} goals.`);
    }
  }

  const goal = await Goal.create({
    userId: authenticatedUser.userId,
    title: normalizedTitle,
    kind: normalizedKind,
    targetAmount: numericTargetAmount,
    savedAmount: numericSavedAmount,
    targetDate,
    notes: normalizedNotes,
  });

  return NextResponse.json({ goal: toGoalResponse(goal) }, { status: 201 });
}