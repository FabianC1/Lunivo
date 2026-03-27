import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "../../../lib/mongodb";
import User from "../../../models/User";

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  await connectToDatabase();
  const user = await User.findById(userId).select("name email backupEmail phone preferences notifications");
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    user: {
      id: String(user._id),
      name: user.name,
      email: user.email,
      backupEmail: user.backupEmail ?? "",
      phone: user.phone ?? "",
      preferences: {
        language: user.preferences?.language ?? "en",
        currency: user.preferences?.currency ?? "GBP",
        country: user.preferences?.country ?? "",
      },
      notifications: {
        emailNotifications: user.notifications?.emailNotifications ?? true,
        budgetAlerts: user.notifications?.budgetAlerts ?? true,
        weeklyDigest: user.notifications?.weeklyDigest ?? false,
      },
    },
  });
}

export async function PUT(req: NextRequest) {
  const { userId, name, backupEmail, phone, preferences, notifications } = await req.json();

  if (!userId) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};

  if (name !== undefined) {
    const normalizedName = String(name).trim();
    if (!normalizedName) {
      return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
    }
    updates.name = normalizedName;
  }

  if (backupEmail !== undefined) {
    const normalizedBackupEmail = String(backupEmail).trim().toLowerCase();
    if (normalizedBackupEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedBackupEmail)) {
      return NextResponse.json({ error: "Backup email must be valid" }, { status: 400 });
    }
    updates.backupEmail = normalizedBackupEmail;
  }

  if (phone !== undefined) {
    updates.phone = String(phone).trim();
  }

  if (preferences && typeof preferences === "object") {
    const safePreferences = preferences as Record<string, unknown>;
    updates.preferences = {
      language: typeof safePreferences.language === "string" ? safePreferences.language : "en",
      currency: typeof safePreferences.currency === "string" ? safePreferences.currency : "GBP",
      country: typeof safePreferences.country === "string" ? safePreferences.country : "",
    };
  }

  if (notifications && typeof notifications === "object") {
    const safeNotifications = notifications as Record<string, unknown>;
    updates.notifications = {
      emailNotifications: Boolean(safeNotifications.emailNotifications),
      budgetAlerts: Boolean(safeNotifications.budgetAlerts),
      weeklyDigest: Boolean(safeNotifications.weeklyDigest),
    };
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No changes provided" }, { status: 400 });
  }

  await connectToDatabase();
  const user = await User.findByIdAndUpdate(
    userId,
    updates,
    { returnDocument: "after", runValidators: true }
  ).select("name email backupEmail phone preferences notifications");

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    user: {
      id: String(user._id),
      name: user.name,
      email: user.email,
      backupEmail: user.backupEmail ?? "",
      phone: user.phone ?? "",
      preferences: {
        language: user.preferences?.language ?? "en",
        currency: user.preferences?.currency ?? "GBP",
        country: user.preferences?.country ?? "",
      },
      notifications: {
        emailNotifications: user.notifications?.emailNotifications ?? true,
        budgetAlerts: user.notifications?.budgetAlerts ?? true,
        weeklyDigest: user.notifications?.weeklyDigest ?? false,
      },
    },
  });
}
