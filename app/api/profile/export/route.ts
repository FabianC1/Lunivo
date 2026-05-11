import { NextRequest, NextResponse } from "next/server";
import Goal from "../../../../models/Goal";
import Event from "../../../../models/Event";
import { getAuthenticatedApiUser, unauthorizedResponse, forbiddenResponse } from "../../../../lib/apiAuth";
import { connectToDatabase } from "../../../../lib/mongodb";
import { hasFeatureAccess } from "../../../../lib/subscriptions";

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedApiUser();
  if (!user) return unauthorizedResponse();

  if (!hasFeatureAccess(user.planSlug, "csvExport")) {
    return forbiddenResponse("CSV export is available on the Pro plan.");
  }

  await connectToDatabase();
  const format = req.nextUrl.searchParams.get("format") ?? "json";
  const [events, goals] = await Promise.all([
    Event.find({ userId: user.userId }),
    Goal.find({ userId: user.userId }),
  ]);

  if (format === "csv") {
    const rows = [
      ["Event Name", "Type", "Date", "Budget Target", "Current Savings", "Notes"],
      ...events.map((e: any) => [e.name, e.type, e.eventDate ?? "", e.budgetTarget ?? 0, e.currentSavings ?? 0, e.notes ?? ""]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    return new NextResponse(csv, {
      headers: { "Content-Type": "text/csv", "Content-Disposition": 'attachment; filename="lunivo-events.csv"' },
    });
  }

  const backup = {
    exportedAt: new Date().toISOString(),
    events: events.map((e: any) => ({
      name: e.name, type: e.type, eventDate: e.eventDate,
      budgetTarget: e.budgetTarget, currentSavings: e.currentSavings,
      costs: e.costs instanceof Map ? Object.fromEntries(e.costs) : e.costs,
      milestones: e.milestones, notes: e.notes,
    })),
    goals: goals.map((g: any) => ({ title: g.title, kind: g.kind, targetAmount: g.targetAmount, savedAmount: g.savedAmount })),
  };

  return new NextResponse(JSON.stringify(backup, null, 2), {
    headers: { "Content-Type": "application/json", "Content-Disposition": 'attachment; filename="lunivo-backup.json"' },
  });
}
