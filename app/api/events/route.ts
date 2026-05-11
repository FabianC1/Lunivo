import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedApiUser, unauthorizedResponse, forbiddenResponse } from '../../../lib/apiAuth';
import { connectToDatabase } from '../../../lib/mongodb';
import Event from '../../../models/Event';

const FREE_EVENT_LIMIT = 1;
const SMART_EVENT_LIMIT = 10;

function getEventLimit(planSlug: string | undefined): number | null {
  const plan = (planSlug ?? 'free').toLowerCase();
  if (plan === 'pro' || plan === 'scale') return null;
  if (plan === 'smart' || plan === 'sync') return SMART_EVENT_LIMIT;
  return FREE_EVENT_LIMIT;
}

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

export async function GET() {
  const user = await getAuthenticatedApiUser();
  if (!user) return unauthorizedResponse();

  await connectToDatabase();
  const events = await Event.find({ userId: user.userId }).sort({ createdAt: -1 });
  return NextResponse.json({ events: events.map(toEventResponse) });
}

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedApiUser();
  if (!user) return unauthorizedResponse();

  await connectToDatabase();

  const limit = getEventLimit(user.planSlug);
  if (limit !== null) {
    const count = await Event.countDocuments({ userId: user.userId });
    if (count >= limit) {
      return forbiddenResponse(
        `Your plan allows up to ${limit} event${limit === 1 ? '' : 's'}. Upgrade to create more.`
      );
    }
  }

  const body = await req.json();
  const { name, type, eventDate, guestCount, locationTier, budgetTarget, currentSavings } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Event name is required.' }, { status: 400 });
  }
  if (!type) {
    return NextResponse.json({ error: 'Event type is required.' }, { status: 400 });
  }

  const event = await Event.create({
    userId: user.userId,
    name: name.trim(),
    type,
    eventDate: eventDate ?? '',
    guestCount: guestCount ?? 0,
    locationTier: locationTier ?? 'local',
    currentSavings: currentSavings ?? 0,
    budgetTarget: budgetTarget ?? 0,
    contingencyPercent: 10,
    costs: {},
    milestones: [],
    scenarios: [],
    notes: '',
  });

  return NextResponse.json({ event: toEventResponse(event) }, { status: 201 });
}
