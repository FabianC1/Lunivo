import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedApiUser, unauthorizedResponse, forbiddenResponse } from '../../../../../../lib/apiAuth';
import { connectToDatabase } from '../../../../../../lib/mongodb';
import Event from '../../../../../../models/Event';

function canUseScenarios(planSlug: string | undefined): boolean {
  const plan = (planSlug ?? 'free').toLowerCase();
  return plan === 'smart' || plan === 'sync' || plan === 'pro' || plan === 'scale';
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; scenarioId: string }> }
) {
  const user = await getAuthenticatedApiUser();
  if (!user) return unauthorizedResponse();

  if (!canUseScenarios(user.planSlug)) {
    return forbiddenResponse('Scenarios are available on the Smart plan and above.');
  }

  const { id, scenarioId } = await params;
  await connectToDatabase();

  const event = await Event.findOne({ _id: id, userId: user.userId });
  if (!event) return NextResponse.json({ error: 'Event not found.' }, { status: 404 });

  const idx = event.scenarios.findIndex((s: any) => s.id === scenarioId);
  if (idx === -1) return NextResponse.json({ error: 'Scenario not found.' }, { status: 404 });

  const body = await req.json();
  const allowed = ['name', 'guestCount', 'locationTier', 'costs', 'contingencyPercent', 'budgetTarget'];
  for (const key of allowed) {
    if (key in body) (event.scenarios[idx] as any)[key] = body[key];
  }

  await event.save();
  const updated = event.scenarios[idx];
  return NextResponse.json({
    scenario: {
      ...updated,
      costs: updated.costs instanceof Map ? Object.fromEntries(updated.costs) : updated.costs,
    },
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; scenarioId: string }> }
) {
  const user = await getAuthenticatedApiUser();
  if (!user) return unauthorizedResponse();

  if (!canUseScenarios(user.planSlug)) {
    return forbiddenResponse('Scenarios are available on the Smart plan and above.');
  }

  const { id, scenarioId } = await params;
  await connectToDatabase();

  const event = await Event.findOne({ _id: id, userId: user.userId });
  if (!event) return NextResponse.json({ error: 'Event not found.' }, { status: 404 });

  const before = event.scenarios.length;
  event.scenarios = event.scenarios.filter((s: any) => s.id !== scenarioId) as any;
  if (event.scenarios.length === before) {
    return NextResponse.json({ error: 'Scenario not found.' }, { status: 404 });
  }

  await event.save();
  return NextResponse.json({ success: true });
}
