import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedApiUser, unauthorizedResponse, forbiddenResponse } from '../../../../../lib/apiAuth';
import { connectToDatabase } from '../../../../../lib/mongodb';
import Event from '../../../../../models/Event';

function canUseScenarios(planSlug: string | undefined): boolean {
  const plan = (planSlug ?? 'free').toLowerCase();
  return plan === 'smart' || plan === 'sync' || plan === 'pro' || plan === 'scale';
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthenticatedApiUser();
  if (!user) return unauthorizedResponse();

  if (!canUseScenarios(user.planSlug)) {
    return forbiddenResponse('Scenarios are available on the Smart plan and above.');
  }

  const { id } = await params;
  await connectToDatabase();

  const event = await Event.findOne({ _id: id, userId: user.userId });
  if (!event) return NextResponse.json({ error: 'Event not found.' }, { status: 404 });

  const body = await req.json();
  const { name, guestCount, locationTier, costs, contingencyPercent, budgetTarget } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Scenario name is required.' }, { status: 400 });
  }

  const scenario = {
    id: crypto.randomUUID(),
    name: name.trim(),
    guestCount: guestCount ?? event.guestCount ?? 0,
    locationTier: locationTier ?? event.locationTier ?? 'local',
    costs: costs ?? (event.costs instanceof Map ? Object.fromEntries(event.costs) : {}),
    contingencyPercent: contingencyPercent ?? event.contingencyPercent ?? 10,
    budgetTarget: budgetTarget ?? event.budgetTarget ?? 0,
    createdAt: new Date().toISOString(),
  };

  event.scenarios.push(scenario as any);
  await event.save();

  return NextResponse.json({ scenario }, { status: 201 });
}
