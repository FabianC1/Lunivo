import { NextRequest, NextResponse } from "next/server";
import { forbiddenResponse, getAuthenticatedApiUser, unauthorizedResponse } from "../../../lib/apiAuth";
import { connectToDatabase } from "../../../lib/mongodb";
import User from "../../../models/User";
import {
  BUILT_IN_THEME_PRESETS,
  DEFAULT_APPEARANCE_SETTINGS,
  DEFAULT_CUSTOM_CATEGORIES,
  DEFAULT_DASHBOARD_SETTINGS,
  sanitizeAppearanceSettings,
  sanitizeCustomCategories,
  sanitizeDashboardSettings,
} from "../../../lib/userSettings";
import { getAvailableBuiltInThemeCount, hasFeatureAccess } from "../../../lib/subscriptions";

export async function GET(req: NextRequest) {
  const authenticatedUser = await getAuthenticatedApiUser();
  if (!authenticatedUser) {
    return unauthorizedResponse();
  }

  await connectToDatabase();
  const user = await User.findById(authenticatedUser.userId).select("name email planSlug backupEmail phone preferences notifications appearance dashboard customCategories");
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    user: {
      id: String(user._id),
      name: user.name,
      email: user.email,
      planSlug: user.planSlug ?? "free",
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
      appearance: sanitizeAppearanceSettings(user.appearance ?? DEFAULT_APPEARANCE_SETTINGS),
      dashboard: sanitizeDashboardSettings(user.dashboard ?? DEFAULT_DASHBOARD_SETTINGS),
      customCategories: sanitizeCustomCategories(user.customCategories ?? DEFAULT_CUSTOM_CATEGORIES),
    },
  });
}

export async function PUT(req: NextRequest) {
  const authenticatedUser = await getAuthenticatedApiUser();
  if (!authenticatedUser) {
    return unauthorizedResponse();
  }

  const { name, backupEmail, phone, preferences, notifications, appearance, dashboard, customCategories } = await req.json();

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
    const normalizedPhone = String(phone).trim();
    if (normalizedPhone.length > 30) {
      return NextResponse.json({ error: "Phone number is too long" }, { status: 400 });
    }
    updates.phone = normalizedPhone;
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

  const hasAppearanceUpdate = appearance !== undefined;
  const hasDashboardUpdate = dashboard !== undefined;
  const hasCustomCategoriesUpdate = customCategories !== undefined;

  if (Object.keys(updates).length === 0 && !hasAppearanceUpdate && !hasDashboardUpdate && !hasCustomCategoriesUpdate) {
    return NextResponse.json({ error: "No changes provided" }, { status: 400 });
  }

  await connectToDatabase();
  const existingUser = await User.findById(authenticatedUser.userId).select("name email planSlug backupEmail phone preferences notifications appearance dashboard customCategories");

  if (!existingUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const currentAppearance = sanitizeAppearanceSettings(existingUser.appearance ?? DEFAULT_APPEARANCE_SETTINGS);
  const currentDashboard = sanitizeDashboardSettings(existingUser.dashboard ?? DEFAULT_DASHBOARD_SETTINGS);
  const currentCustomCategories = sanitizeCustomCategories(existingUser.customCategories ?? DEFAULT_CUSTOM_CATEGORIES);

  if (hasAppearanceUpdate) {
    const sanitizedAppearance = sanitizeAppearanceSettings(appearance);
    const canCreateCustomThemes = hasFeatureAccess(authenticatedUser.planSlug, "customThemeCreation");
    const allowedBuiltInThemeIds = BUILT_IN_THEME_PRESETS
      .slice(0, getAvailableBuiltInThemeCount(authenticatedUser.planSlug))
      .map((theme) => theme.id);
    const selectedThemeId = sanitizedAppearance.selectedThemeId;
    const selectedThemeIsBuiltIn = BUILT_IN_THEME_PRESETS.some((theme) => theme.id === selectedThemeId);

    if (!allowedBuiltInThemeIds.includes(selectedThemeId)) {
      if (selectedThemeIsBuiltIn) {
        return forbiddenResponse("Your current plan does not include this built-in theme.");
      }

      if (!canCreateCustomThemes) {
        return forbiddenResponse("Custom theme creation is available on the Pro plan.");
      }
    }

    if (!canCreateCustomThemes) {
      const requestedThemeInventoryChanged = JSON.stringify(sanitizedAppearance.customThemes) !== JSON.stringify(currentAppearance.customThemes);
      if (requestedThemeInventoryChanged) {
        return forbiddenResponse("Custom theme creation is available on the Pro plan.");
      }

      updates.appearance = {
        selectedThemeId,
        customThemes: currentAppearance.customThemes,
      };
    } else {
      updates.appearance = sanitizedAppearance;
    }
  }

  if (hasDashboardUpdate) {
    const sanitizedDashboard = sanitizeDashboardSettings(dashboard);
    const canToggleWidgets = hasFeatureAccess(authenticatedUser.planSlug, "dashboardWidgetToggles");
    const canCreateCustomDashboardVisuals = hasFeatureAccess(authenticatedUser.planSlug, "customDashboardVisuals");

    if (!canToggleWidgets && JSON.stringify(sanitizedDashboard.visibleWidgets) !== JSON.stringify(currentDashboard.visibleWidgets)) {
      return forbiddenResponse("Dashboard widget toggles are available on the Smart plan.");
    }

    if (!canCreateCustomDashboardVisuals && JSON.stringify(sanitizedDashboard.customVisuals) !== JSON.stringify(currentDashboard.customVisuals)) {
      return forbiddenResponse("Custom dashboard visuals are available on the Pro plan.");
    }

    updates.dashboard = {
      visibleWidgets: canToggleWidgets ? sanitizedDashboard.visibleWidgets : currentDashboard.visibleWidgets,
      widgetOrder: sanitizedDashboard.widgetOrder,
      customVisuals: canCreateCustomDashboardVisuals ? sanitizedDashboard.customVisuals : currentDashboard.customVisuals,
    };
  }

  if (hasCustomCategoriesUpdate) {
    const sanitizedCategories = sanitizeCustomCategories(customCategories);

    if (!hasFeatureAccess(authenticatedUser.planSlug, "customThemeCreation") && JSON.stringify(sanitizedCategories) !== JSON.stringify(currentCustomCategories)) {
      return forbiddenResponse("Custom categories are available on the Pro plan.");
    }

    updates.customCategories = hasFeatureAccess(authenticatedUser.planSlug, "customThemeCreation")
      ? sanitizedCategories
      : currentCustomCategories;
  }

  const user = await User.findByIdAndUpdate(
    authenticatedUser.userId,
    updates,
    { returnDocument: "after", runValidators: true }
  ).select("name email planSlug backupEmail phone preferences notifications appearance dashboard customCategories");

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    user: {
      id: String(user._id),
      name: user.name,
      email: user.email,
      planSlug: user.planSlug ?? "free",
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
      appearance: sanitizeAppearanceSettings(user.appearance ?? DEFAULT_APPEARANCE_SETTINGS),
      dashboard: sanitizeDashboardSettings(user.dashboard ?? DEFAULT_DASHBOARD_SETTINGS),
      customCategories: sanitizeCustomCategories(user.customCategories ?? DEFAULT_CUSTOM_CATEGORIES),
    },
  });
}
