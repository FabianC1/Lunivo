import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../lib/mongodb';
import Goal from '../../../../models/Goal';

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

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const payload = await req.json();

  const update: Record<string, unknown> = {};
  if (typeof payload.title === 'string') update.title = payload.title.trim();
  if (typeof payload.kind === 'string') update.kind = payload.kind.trim();
  if (payload.targetAmount !== undefined) update.targetAmount = Number(payload.targetAmount);
  if (payload.savedAmount !== undefined) update.savedAmount = Number(payload.savedAmount);
  if (typeof payload.targetDate === 'string') update.targetDate = payload.targetDate;
  if (typeof payload.notes === 'string') update.notes = payload.notes.trim();
  if (typeof payload.completed === 'boolean') {
    update.completed = payload.completed;
    update.completedAt = payload.completed ? new Date() : undefined;
  }

  await connectToDatabase();
  const goal = await Goal.findByIdAndUpdate(id, update, { new: true, runValidators: true });
  if (!goal) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ goal: toGoalResponse(goal) });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  await connectToDatabase();
  const goal = await Goal.findByIdAndDelete(id);
  if (!goal) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}