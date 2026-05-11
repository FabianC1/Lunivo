import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedApiUser, unauthorizedResponse, forbiddenResponse } from '../../../../lib/apiAuth';
import { connectToDatabase } from '../../../../lib/mongodb';
import Event from '../../../../models/Event';

function toEventResponse(event: any) {
  return {
    id: String(event._id),
    userId: String(event.userId),
    name: event.name,
    type: event.type,
    eventDate: event.eventDate ?? '',
    guestCount: event.guestCount ?? 0,
    locationTier: event.locationTier ?? 'local',
    currentSavings: event.currentSavings ?? 0,
    monthlyIncome: event.monthlyIncome ?? 0,
    monthlyCommitments: event.monthlyCommitments ?? 0,
    budgetTarget: event.budgetTarget ?? 0,
    contingencyPercent: event.contingencyPercent ?? 10,
    costs: event.costs instanceof Map ? Object.fromEntries(event.costs) : (event.costs ?? {}),
    milestones: event.milestones ?? [],
    scenarios: (event.scenarios ?? []).map((s: any) => ({
      ...s,
      costs: s.costs instanceof Map ? Object.fromEntries(s.costs) : (s.costs ?? {}),
    })),
    notes: event.notes ?? '',
    createdAt: event.createdAt ? new Date(event.createdAt).toISOString() : undefined,
    updatedAt: event.updatedAt ? new Date(event.updatedAt).toISOString() : undefined,
  };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthenticatedApiUser();
  if (!user) return unauthorizedResponse();

  const { id } = await params;
  await connectToDatabase();

  const event = await Event.findOne({ _id: id, userId: user.userId });
  if (!event) return NextResponse.json({ error: 'Event not found.' }, { status: 404 });

  return NextResponse.json({ event: toEventResponse(event) });
}

const ALLOWED_FIELDS = [
  'name', 'type', 'eventDate', 'guestCount', 'locationTier',
  'currentSavings', 'monthlyIncome', 'monthlyCommitments',
  'budgetTarget', 'contingencyPercent', 'costs', 'milestones', 'notes',
];

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthenticatedApiUser();
  if (!user) return unauthorizedResponse();

  const { id } = await params;
  await connectToDatabase();

  const event = await Event.findOne({ _id: id, userId: user.userId });
  if (!event) return NextResponse.json({ error: 'Event not found.' }, { status: 404 });

  const body = await req.json();
  const updates: Record<string, unknown> = {};
  for (const key of ALLOWED_FIELDS) {
    if (key in body) updates[key] = body[key];
  }

  const updated = await Event.findByIdAndUpdate(
    id,
    { $set: updates },
    { new: true, runValidators: true }
  );

  return NextResponse.json({ event: toEventResponse(updated) });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthenticatedApiUser();
  if (!user) return unauthorizedResponse();

  const { id } = await params;
  await connectToDatabase();

  const event = await Event.findOne({ _id: id, userId: user.userId });
  if (!event) return NextResponse.json({ error: 'Event not found.' }, { status: 404 });

  await Event.deleteOne({ _id: id });
  return NextResponse.json({ success: true });
}
