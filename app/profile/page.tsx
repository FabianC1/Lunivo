"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { signOut } from "next-auth/react";
import PageLoading from "../../components/PageLoading";
import { readApiError } from "../../lib/apiClient";
import styles from "./profile.module.css";
import { AuthSession, clearSession, getSession, markLogoutPending, setSession } from "../../lib/auth";
import { useTheme } from "../../components/ThemeProvider";
import {
  FREE_PLAN,
  formatPlanPrice,
  getAvailableBuiltInThemeCount,
  getSubscriptionPlanBySlug,
  hasFeatureAccess,
} from "../../lib/subscriptions";
import {
  BUILT_IN_THEME_PRESETS,
  DEFAULT_CUSTOM_CATEGORIES,
  DEFAULT_DASHBOARD_SETTINGS,
  sanitizeCustomCategories,
  type AppearanceSettings,
  type DashboardSettings,
  type ThemeMode,
  type ThemePreset,
} from "../../lib/userSettings";

type ProfilePayload = {
  user: {
    id: string;
    name: string;
    email: string;
    planSlug?: string;
    backupEmail?: string;
    phone?: string;
    preferences?: {
      language?: string;
      currency?: string;
      country?: string;
    };
    notifications?: {
      emailNotifications?: boolean;
      budgetAlerts?: boolean;
      weeklyDigest?: boolean;
    };
    appearance?: AppearanceSettings;
    dashboard?: DashboardSettings;
    customCategories?: string[];
  };
};

function createThemeDraft(name: string, mode: ThemeMode, primaryColor: string, accentColor: string, backgroundColor: string, textColor: string): ThemePreset {
  const id = `custom-${Date.now()}`;
  const cardColor = mode === "dark" ? "#1E293B" : "#FFFFFF";
  return {
    id,
    name,
    mode,
    isCustom: true,
    colors: {
      bgColor: backgroundColor,
      textColor,
      primaryColor,
      accentColor,
      highlightColor: accentColor,
      cardColor,
      navbarColor: `linear-gradient(135deg, ${backgroundColor} 0%, ${cardColor} 100%)`,
      navbarBorderGradient: `linear-gradient(90deg, ${primaryColor} 0%, ${accentColor} 100%)`,
      navbarTextColor: textColor,
      bgGradient: `linear-gradient(135deg, ${backgroundColor} 0%, ${cardColor} 55%, ${accentColor}22 100%)`,
      buttonGradientStart: primaryColor,
      buttonGradientEnd: accentColor,
      foregroundRgb: mode === "dark" ? "241, 245, 249" : "30, 41, 59",
      backgroundStartRgb: mode === "dark" ? "15, 23, 42" : "248, 250, 252",
      backgroundEndRgb: mode === "dark" ? "30, 41, 59" : "255, 255, 255",
    },
  };
}

type SettingsTab = "account" | "appearance" | "preferences" | "notifications" | "billing" | "security" | "data" | "privacy" | "help" | "danger";

const TAB_ITEMS: Array<{ id: SettingsTab; label: string }> = [
  { id: "account", label: "Account" },
  { id: "appearance", label: "Appearance" },
  { id: "preferences", label: "Preferences" },
  { id: "notifications", label: "Notifications" },
  { id: "billing", label: "Billing" },
  { id: "security", label: "Security" },
  { id: "data", label: "Data & Export" },
  { id: "privacy", label: "Privacy & Data" },
  { id: "help", label: "Help & Support" },
  { id: "danger", label: "Account Deletion" },
];

function getInitials(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  if (!parts.length) {
    return "U";
  }
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}

export default function ProfilePage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const {
    selectedThemeId,
    customThemes,
    availableThemes,
    applyAppearanceSettings,
    setSelectedThemeId,
    setCustomThemes,
  } = useTheme();

  const tabFromUrl = searchParams?.get("tab");
  const [activeTab, setActiveTab] = useState<SettingsTab>(
    TAB_ITEMS.some((tab) => tab.id === tabFromUrl) ? (tabFromUrl as SettingsTab) : "account"
  );

  const [session, setSessionState] = useState<AuthSession | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [currentPlanSlug, setCurrentPlanSlug] = useState("free");
  const [name, setName] = useState("");
  const [backupEmail, setBackupEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);
  const [nameMessage, setNameMessage] = useState("");
  const [nameError, setNameError] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const [emailNotifications, setEmailNotifications] = useState(true);
  const [budgetAlerts, setBudgetAlerts] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);
  const [notifMessage, setNotifMessage] = useState("");

  const [language, setLanguage] = useState("en");
  const [currency, setCurrency] = useState("GBP");
  const [country, setCountry] = useState("");
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);
  const [prefsMessage, setPrefsMessage] = useState("");
  const [dashboardSettings, setDashboardSettings] = useState<DashboardSettings>(DEFAULT_DASHBOARD_SETTINGS);
  const [customCategories, setCustomCategories] = useState<string[]>(DEFAULT_CUSTOM_CATEGORIES);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [themeMessage, setThemeMessage] = useState("");
  const [themeError, setThemeError] = useState("");
  const [themeName, setThemeName] = useState("My Theme");
  const [themeMode, setThemeMode] = useState<ThemeMode>("light");
  const [themePrimary, setThemePrimary] = useState("#2563EB");
  const [themeAccent, setThemeAccent] = useState("#F97316");
  const [themeBackground, setThemeBackground] = useState("#F8FAFC");
  const [themeText, setThemeText] = useState("#1E293B");
  const [contactMessage, setContactMessage] = useState("");
  const [billingMessage, setBillingMessage] = useState("");
  const [dataMessage, setDataMessage] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleteMessage, setDeleteMessage] = useState("");
  const [signedOutSessions, setSignedOutSessions] = useState<number[]>([]);
  
  const [activeSessions] = useState([
    { id: 1, device: "Chrome on macOS", lastActive: "2 minutes ago", isCurrent: true },
    { id: 2, device: "Safari on iPhone", lastActive: "5 hours ago", isCurrent: false },
  ]);

  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  useEffect(() => {
    const current = getSession();
    if (!current) {
      router.replace("/login");
      return;
    }
    setSessionState(current);
    setName(current.name);
    setIsProfileLoading(false);
  }, [router]);

  useEffect(() => {
    const currentSession = session;

    if (!currentSession?.userId || currentSession.isDemo) {
      setCurrentPlanSlug("free");
      setIsProfileLoading(false);
      return;
    }

    let isMounted = true;

    async function loadProfile() {
      try {
        setIsProfileLoading(true);
        const response = await fetch("/api/profile", {
          cache: "no-store",
        });

        if (!response.ok) {
          if (isMounted) {
            setNameError(await readApiError(response, "Unable to load your profile."));
          }
          return;
        }

        const payload = (await response.json()) as ProfilePayload;
        if (!isMounted || !payload.user) {
          return;
        }

        setName(payload.user.name);
        setCurrentPlanSlug(payload.user.planSlug ?? "free");
        setBackupEmail(payload.user.backupEmail ?? "");
        setPhone(payload.user.phone ?? "");
        setLanguage(payload.user.preferences?.language ?? "en");
        setCurrency(payload.user.preferences?.currency ?? "GBP");
        setCountry(payload.user.preferences?.country ?? "");
        setEmailNotifications(payload.user.notifications?.emailNotifications ?? true);
        setBudgetAlerts(payload.user.notifications?.budgetAlerts ?? true);
        setWeeklyDigest(payload.user.notifications?.weeklyDigest ?? false);
        setDashboardSettings(payload.user.dashboard ?? DEFAULT_DASHBOARD_SETTINGS);
        setCustomCategories(sanitizeCustomCategories(payload.user.customCategories ?? DEFAULT_CUSTOM_CATEGORIES));
        applyAppearanceSettings(payload.user.appearance ?? { selectedThemeId, customThemes });

        if (
          currentSession && (
            currentSession.name !== payload.user.name ||
            currentSession.email !== payload.user.email
          )
        ) {
          const updatedSession = {
            ...currentSession,
            name: payload.user.name,
            email: payload.user.email,
          } as AuthSession;
          setSession(updatedSession);
          setSessionState(updatedSession);
        }
      } catch {
        if (isMounted) {
          setNameError("Unable to load your profile right now.");
        }
      } finally {
        if (isMounted) {
          setIsProfileLoading(false);
        }
      }
    }

    void loadProfile();

    return () => {
      isMounted = false;
    };
  }, [applyAppearanceSettings, customThemes, selectedThemeId, session?.userId, session?.isDemo]);

  useEffect(() => {
    const tab = searchParams?.get("tab");
    if (tab && TAB_ITEMS.some((t) => t.id === tab)) {
      setActiveTab(tab as SettingsTab);
    }
  }, [searchParams]);

  const initials = useMemo(() => getInitials(name || session?.name || "User"), [name, session?.name]);

  function setTab(tab: SettingsTab) {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.set("tab", tab);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  async function handleLogout() {
    markLogoutPending();
    clearSession();
    try {
      await fetch("/api/session/logout", { method: "POST" });
    } catch {
      // Continue clearing the client session even if cookie cleanup fails.
    }
    await signOut({ redirect: false });
    router.replace("/login");
    router.refresh();
  }

  async function handleNameSave(e: FormEvent) {
    e.preventDefault();
    if (!session) {
      return;
    }

    const normalizedName = name.trim();
    if (!normalizedName) {
      setNameError("Name cannot be empty.");
      setNameMessage("");
      return;
    }

    setNameError("");
    setNameMessage("");
    setIsSavingName(true);

    if (session.isDemo || !session.userId) {
      const updated = { ...session, name: normalizedName };
      setSession(updated);
      setSessionState(updated);
      setNameMessage("Changes saved for this local admin session.");
      setIsSavingName(false);
      return;
    }

    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: normalizedName,
          backupEmail,
          phone,
        }),
      });
      const payload = (await response.json()) as ProfilePayload & { error?: string };

      if (!response.ok || !payload?.user) {
        setNameError(payload?.error ?? "Unable to save your name.");
        setIsSavingName(false);
        return;
      }

      const updated = {
        ...session,
        name: payload.user.name,
      };

      setSession(updated);
      setSessionState(updated);
      setName(payload.user.name);
      setBackupEmail(payload.user.backupEmail ?? "");
      setPhone(payload.user.phone ?? "");
      setNameMessage("Account changes saved.");
      setIsSavingName(false);
    } catch {
      setNameError("Unable to update your name right now.");
      setIsSavingName(false);
    }
  }

  async function handlePasswordSave(e: FormEvent) {
    e.preventDefault();
    if (!session) {
      return;
    }

    setPasswordError("");
    setPasswordMessage("");

    if (session.isDemo || !session.userId) {
      setPasswordError("Password updates are disabled for demo/local sessions.");
      return;
    }

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("Please fill in all password fields.");
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation do not match.");
      return;
    }

    setIsSavingPassword(true);
    try {
      const response = await fetch("/api/profile/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        setPasswordError(payload?.error ?? "Unable to update password.");
        setIsSavingPassword(false);
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMessage("Password updated successfully.");
      setIsSavingPassword(false);
    } catch {
      setPasswordError("Unable to update password right now.");
      setIsSavingPassword(false);
    }
  }

  async function saveNotificationPrefs() {
    if (!session) {
      return;
    }

    if (session.isDemo || !session.userId) {
      setNotifMessage("Notification preferences saved for this local session.");
      window.setTimeout(() => setNotifMessage(""), 2000);
      return;
    }

    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notifications: {
            emailNotifications,
            budgetAlerts,
            weeklyDigest,
          },
        }),
      });

      const payload = (await response.json()) as (ProfilePayload & { error?: string });
      if (!response.ok || !payload.user) {
        setNotifMessage(payload.error ?? "Unable to save notification settings.");
      } else {
        setEmailNotifications(payload.user.notifications?.emailNotifications ?? true);
        setBudgetAlerts(payload.user.notifications?.budgetAlerts ?? true);
        setWeeklyDigest(payload.user.notifications?.weeklyDigest ?? false);
        setNotifMessage("Notification settings saved.");
      }
    } catch {
      setNotifMessage("Unable to save notification settings right now.");
    }

    window.setTimeout(() => setNotifMessage(""), 2200);
  }

  async function savePreferences() {
    if (!session) {
      return;
    }

    setIsSavingPrefs(true);

    if (session.isDemo || !session.userId) {
      setPrefsMessage("Preferences saved for this local session.");
      window.setTimeout(() => {
        setPrefsMessage("");
        setIsSavingPrefs(false);
      }, 2500);
      return;
    }

    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preferences: {
            language,
            currency,
            country,
          },
        }),
      });

      const payload = (await response.json()) as (ProfilePayload & { error?: string });
      if (!response.ok || !payload.user) {
        setPrefsMessage(payload.error ?? "Unable to save preferences.");
      } else {
        setLanguage(payload.user.preferences?.language ?? "en");
        setCurrency(payload.user.preferences?.currency ?? "GBP");
        setCountry(payload.user.preferences?.country ?? "");
        setPrefsMessage("Preferences saved. These apply across your account.");
      }
    } catch {
      setPrefsMessage("Unable to save preferences right now.");
    }

    window.setTimeout(() => {
      setPrefsMessage("");
      setIsSavingPrefs(false);
    }, 2500);
  }

  async function persistAppearanceSettings(nextAppearance: AppearanceSettings) {
    applyAppearanceSettings(nextAppearance);

    if (!session || session.isDemo || !session.userId) {
      setThemeMessage("Theme settings saved for this local session.");
      window.setTimeout(() => setThemeMessage(""), 2200);
      return true;
    }

    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appearance: nextAppearance }),
      });

      if (!response.ok) {
        throw new Error(await readApiError(response, "Unable to save theme settings."));
      }

      const payload = (await response.json()) as ProfilePayload;
      applyAppearanceSettings(payload.user.appearance ?? nextAppearance);
      setThemeMessage("Theme settings saved.");
      window.setTimeout(() => setThemeMessage(""), 2200);
      return true;
    } catch (saveError) {
      setThemeError(saveError instanceof Error ? saveError.message : "Unable to save theme settings.");
      window.setTimeout(() => setThemeError(""), 2500);
      return false;
    }
  }

  async function handleThemeSelection(themeId: string) {
    setThemeError("");
    await persistAppearanceSettings({
      selectedThemeId: themeId,
      customThemes,
    });
  }

  async function handleCreateCustomTheme() {
    setThemeError("");
    if (!themeName.trim()) {
      setThemeError("Theme name cannot be empty.");
      return;
    }

    const nextTheme = createThemeDraft(
      themeName.trim(),
      themeMode,
      themePrimary,
      themeAccent,
      themeBackground,
      themeText,
    );
    const nextCustomThemes = [...customThemes, nextTheme];
    setCustomThemes(nextCustomThemes);
    await persistAppearanceSettings({
      selectedThemeId: nextTheme.id,
      customThemes: nextCustomThemes,
    });
  }

  async function handleDeleteCustomTheme(themeId: string) {
    const nextCustomThemes = customThemes.filter((theme) => theme.id !== themeId);
    setCustomThemes(nextCustomThemes);
    await persistAppearanceSettings({
      selectedThemeId: selectedThemeId === themeId ? "light" : selectedThemeId,
      customThemes: nextCustomThemes,
    });
  }

  async function persistCustomCategories(nextCategories: string[]) {
    const sanitized = sanitizeCustomCategories(nextCategories);
    setCustomCategories(sanitized);

    if (!session || session.isDemo || !session.userId) {
      setDataMessage("Category settings saved for this local session.");
      window.setTimeout(() => setDataMessage(""), 2200);
      return;
    }

    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customCategories: sanitized }),
      });

      if (!response.ok) {
        throw new Error(await readApiError(response, "Unable to save custom categories."));
      }

      setDataMessage("Custom categories saved.");
      window.setTimeout(() => setDataMessage(""), 2200);
    } catch (saveError) {
      setDataMessage(saveError instanceof Error ? saveError.message : "Unable to save custom categories.");
      window.setTimeout(() => setDataMessage(""), 2600);
    }
  }

  async function addCustomCategory() {
    const normalized = newCategoryName.trim();
    if (!normalized) {
      return;
    }

    setNewCategoryName("");
    await persistCustomCategories([...customCategories, normalized]);
  }

  async function removeCustomCategory(category: string) {
    await persistCustomCategories(customCategories.filter((entry) => entry !== category));
  }

  function saveContactDetails(e: FormEvent) {
    e.preventDefault();
    if (backupEmail && !backupEmail.includes("@")) {
      setContactMessage("Please enter a valid backup email.");
      window.setTimeout(() => setContactMessage(""), 2200);
      return;
    }
    setContactMessage("Backup details will be saved with your account changes.");
    window.setTimeout(() => setContactMessage(""), 2200);
  }

  function signOutSession(sessionId: number) {
    setSignedOutSessions((prev) => (prev.includes(sessionId) ? prev : [...prev, sessionId]));
    setPasswordMessage("Session revoked successfully.");
    window.setTimeout(() => setPasswordMessage(""), 2200);
  }

  function requestExport(type: "csv" | "json" | "backup") {
    if (type === "csv" && canExportCsv) {
      router.push("/reports");
      return;
    }

    const label = type === "backup" ? "Secure backup requested" : `${type.toUpperCase()} export requested`;
    setDataMessage(`${label}. We'll notify you when it's ready.`);
    window.setTimeout(() => setDataMessage(""), 2600);
  }

  function manageBilling(action: "portal" | "cancel" | "resume") {
    const label = action === "portal"
      ? "Stripe customer portal will open here once connected."
      : action === "cancel"
        ? "Cancellation flow will be connected here."
        : "Subscription resume flow will be connected here.";
    setBillingMessage(label);
    window.setTimeout(() => setBillingMessage(""), 2800);
  }

  function handleDeleteAccount(e: FormEvent) {
    e.preventDefault();
    setDeleteError("");
    setDeleteMessage("");

    if (deleteConfirm.trim().toLowerCase() !== session?.email.toLowerCase()) {
      setDeleteError("Type your exact account email to confirm deletion.");
      return;
    }

    setIsDeletingAccount(true);
    window.setTimeout(() => {
      setIsDeletingAccount(false);
      setDeleteMessage("Deletion flow verified. Final destructive endpoint can be connected next.");
    }, 900);
  }

  if (!session) {
    return null;
  }

  if (isProfileLoading) {
    return <PageLoading message="Loading profile..." />;
  }

  const currentPlan = getSubscriptionPlanBySlug(currentPlanSlug) ?? FREE_PLAN;
  const visibleBuiltInThemes = BUILT_IN_THEME_PRESETS.slice(0, getAvailableBuiltInThemeCount(currentPlan.slug));
  const canCreateCustomThemes = hasFeatureAccess(currentPlan.slug, "customThemeCreation");
  const canManageDataControls = hasFeatureAccess(currentPlan.slug, "customCategories");
  const canExportCsv = hasFeatureAccess(currentPlan.slug, "csvExport");

  return (
    <main className={styles.page}>
      <aside className={styles.sidebar}>
        <h2 className={styles.sidebarTitle}>Settings</h2>
        <nav className={styles.menu} aria-label="Profile settings sections">
          {TAB_ITEMS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTab(tab.id)}
              className={`${styles.menuButton} ${activeTab === tab.id ? styles.menuButtonActive : ""}`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </aside>

      <section className={styles.content}>
        {activeTab === "account" && (
          <div className={styles.panel}>
            <h1 className={styles.heading}>Account</h1>
            <p className={styles.subheading}>Manage your profile identity and backup contacts.</p>

            <div className={styles.accountHeader}>
              <div className={styles.avatar} aria-hidden="true">
                {initials}
              </div>
              <div className={styles.accountMeta}>
                <h3>{session.name}</h3>
                <p>{session.email}</p>
              </div>
              <p className={styles.accountHeaderBadge}>
                {session.isDemo ? "Local admin" : "Database account"}<br />
                Member since {new Date().toLocaleDateString()}
              </p>
            </div>

            <form className={styles.form} onSubmit={handleNameSave}>
              <label className={styles.fieldLabel} htmlFor="name">
                Display name
              </label>
              <input
                id="name"
                className={styles.input}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                autoComplete="name"
              />

              <label className={styles.fieldLabel} htmlFor="email">
                Email
              </label>
              <input id="email" className={styles.input} value={session.email} disabled />

              <div className={styles.divider} style={{ marginBottom: 0 }} />

              <h3 className={styles.sectionSubtitle} style={{ marginTop: "0.4rem" }}>Backup Contact</h3>

              <label className={styles.fieldLabel} htmlFor="backupEmail">
                Backup email
              </label>
              <input
                id="backupEmail"
                className={styles.input}
                type="email"
                value={backupEmail}
                onChange={(e) => setBackupEmail(e.target.value)}
                placeholder="backup@email.com"
                autoComplete="email"
              />

              <label className={styles.fieldLabel} htmlFor="phone">
                Phone number
              </label>
              <input
                id="phone"
                className={styles.input}
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+44 7000 000000"
                autoComplete="tel"
              />

              {nameError && <p className={styles.errorText}>{nameError}</p>}
              {(nameMessage || contactMessage) && (
                <p className={styles.successText}>{nameMessage || contactMessage}</p>
              )}

              <div className={styles.accountActions}>
                <button type="submit" className={styles.primaryButton} disabled={isSavingName}>
                  {isSavingName ? "Saving..." : "Save account changes"}
                </button>
                <button type="button" className={styles.logoutButton} onClick={handleLogout}>
                  Logout
                </button>
              </div>
            </form>
          </div>
        )}

        {activeTab === "appearance" && (
          <div className={styles.panel}>
            <h1 className={styles.heading}>Appearance</h1>
            <p className={styles.subheading}>Theme controls for this account.</p>
            <div className={styles.inlineCard}>
              <h3 className={styles.sectionSubtitle}>Built-in Themes</h3>
              <p>Starter includes Lunivo Light and Lunivo Night. Smart unlocks the full built-in theme library. Pro adds custom theme creation and saved presets.</p>
              <div className={styles.themeGrid}>
                {BUILT_IN_THEME_PRESETS.map((theme) => {
                  const isAccessible = visibleBuiltInThemes.some((item) => item.id === theme.id);
                  const isSelected = selectedThemeId === theme.id;
                  return (
                    <button
                      key={theme.id}
                      type="button"
                      className={`${styles.themeCard} ${isSelected ? styles.themeCardActive : ""}`}
                      onClick={() => isAccessible ? void handleThemeSelection(theme.id) : undefined}
                      disabled={!isAccessible}
                    >
                      <span
                        className={styles.themePreview}
                        style={{
                          background: theme.colors.bgGradient,
                          borderColor: theme.colors.primaryColor,
                        }}
                      />
                      <strong>{theme.name}</strong>
                      <span>{isAccessible ? (isSelected ? "Selected" : theme.mode) : "Upgrade to Smart"}</span>
                    </button>
                  );
                })}
              </div>
              {themeError && <p className={styles.errorText}>{themeError}</p>}
              {themeMessage && <p className={styles.successText}>{themeMessage}</p>}
            </div>

            <div className={styles.divider} />
            <div className={styles.inlineCard}>
              <h3 className={styles.sectionSubtitle}>Custom Theme Builder</h3>
              <p>Pro can create and save personal theme presets. Other plans can preview the controls here, but saving is locked.</p>
              <div className={styles.themeBuilderGrid}>
                <label className={styles.fieldLabel} htmlFor="themeName">Theme name</label>
                <input id="themeName" className={styles.input} value={themeName} onChange={(event) => setThemeName(event.target.value)} />

                <label className={styles.fieldLabel} htmlFor="themeMode">Base mode</label>
                <select id="themeMode" className={styles.input} value={themeMode} onChange={(event) => setThemeMode(event.target.value as ThemeMode)}>
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>

                <label className={styles.fieldLabel} htmlFor="themePrimary">Primary color</label>
                <input id="themePrimary" className={styles.input} type="color" value={themePrimary} onChange={(event) => setThemePrimary(event.target.value)} />

                <label className={styles.fieldLabel} htmlFor="themeAccent">Accent color</label>
                <input id="themeAccent" className={styles.input} type="color" value={themeAccent} onChange={(event) => setThemeAccent(event.target.value)} />

                <label className={styles.fieldLabel} htmlFor="themeBackground">Background color</label>
                <input id="themeBackground" className={styles.input} type="color" value={themeBackground} onChange={(event) => setThemeBackground(event.target.value)} />

                <label className={styles.fieldLabel} htmlFor="themeText">Text color</label>
                <input id="themeText" className={styles.input} type="color" value={themeText} onChange={(event) => setThemeText(event.target.value)} />
              </div>
              <div className={styles.actionRow}>
                <button type="button" className={styles.primaryButton} onClick={() => void handleCreateCustomTheme()} disabled={!canCreateCustomThemes}>
                  Create theme preset
                </button>
                {!canCreateCustomThemes ? <span className={styles.hintText}>Available on Pro.</span> : null}
              </div>
            </div>

            <div className={styles.divider} />
            <div className={styles.inlineCard}>
              <h3 className={styles.sectionSubtitle}>Saved Theme Presets</h3>
              {customThemes.length === 0 ? (
                <p>No saved custom presets yet.</p>
              ) : (
                <div className={styles.themeGrid}>
                  {customThemes.map((theme) => (
                    <div key={theme.id} className={styles.themeCardStatic}>
                      <span className={styles.themePreview} style={{ background: theme.colors.bgGradient, borderColor: theme.colors.primaryColor }} />
                      <strong>{theme.name}</strong>
                      <div className={styles.actionRow}>
                        <button type="button" className={styles.secondaryButton} onClick={() => void handleThemeSelection(theme.id)}>
                          Apply
                        </button>
                        <button type="button" className={styles.secondaryButton} onClick={() => void handleDeleteCustomTheme(theme.id)} disabled={!canCreateCustomThemes}>
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "preferences" && (
          <div className={styles.panel}>
            <h1 className={styles.heading}>Preferences</h1>
            <p className={styles.subheading}>Set your regional defaults for language, country, and currency display.</p>

            <form className={styles.form} onSubmit={(e) => e.preventDefault()}>
              <label className={styles.fieldLabel} htmlFor="language">
                Language
              </label>
              <select
                id="language"
                className={styles.input}
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              >
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
                <option value="pt">Portuguese</option>
              </select>

              <label className={styles.fieldLabel} htmlFor="country">
                Country
              </label>
              <select
                id="country"
                className={styles.input}
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              >
                <option value="">Select your country</option>
                <option value="GB">United Kingdom</option>
                <option value="US">United States</option>
                <option value="AU">Australia</option>
                <option value="CA">Canada</option>
                <option value="DE">Germany</option>
                <option value="FR">France</option>
                <option value="ES">Spain</option>
                <option value="PT">Portugal</option>
                <option value="IN">India</option>
                <option value="JP">Japan</option>
                <option value="BR">Brazil</option>
                <option value="ZA">South Africa</option>
                <option value="NG">Nigeria</option>
                <option value="NZ">New Zealand</option>
                <option value="SG">Singapore</option>
                <option value="AE">United Arab Emirates</option>
                <option value="MX">Mexico</option>
                <option value="IT">Italy</option>
                <option value="NL">Netherlands</option>
                <option value="SE">Sweden</option>
                <option value="RO">Romania</option>
              </select>

              <label className={styles.fieldLabel} htmlFor="currency">
                Preferred currency symbol
              </label>
              <select
                id="currency"
                className={styles.input}
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                <option value="GBP">GBP — British Pound (£)</option>
                <option value="USD">USD — US Dollar ($)</option>
                <option value="EUR">EUR — Euro (€)</option>
                <option value="AUD">AUD — Australian Dollar (A$)</option>
                <option value="CAD">CAD — Canadian Dollar (C$)</option>
                <option value="JPY">JPY — Japanese Yen (¥)</option>
                <option value="INR">INR — Indian Rupee (₹)</option>
                <option value="ZAR">ZAR — South African Rand (R)</option>
                <option value="NGN">NGN — Nigerian Naira (₦)</option>
                <option value="BRL">BRL — Brazilian Real (R$)</option>
                <option value="SEK">SEK — Swedish Krona (kr)</option>
                <option value="SGD">SGD — Singapore Dollar (S$)</option>
                <option value="AED">AED — UAE Dirham (د.إ)</option>
                <option value="RON">RON — Romanian Leu (lei)</option>
              </select>
              <p className={styles.hintText}>
                This is a display label only. Lunivo does not convert between currencies — all amounts you enter are already in your own currency.
              </p>

              {prefsMessage && <p className={styles.successText}>{prefsMessage}</p>}
              <button type="button" className={styles.primaryButton} onClick={savePreferences} disabled={isSavingPrefs}>
                {isSavingPrefs ? "Saving..." : "Save preferences"}
              </button>
            </form>
          </div>
        )}

        {activeTab === "notifications" && (
          <div className={styles.panel}>
            <h1 className={styles.heading}>Notifications</h1>
            <p className={styles.subheading}>Control what updates Lunivo sends you.</p>

            <div className={styles.optionList}>
              <label className={styles.optionRow}>
                <span>Email notifications</span>
                <input
                  type="checkbox"
                  checked={emailNotifications}
                  onChange={(e) => setEmailNotifications(e.target.checked)}
                />
              </label>

              <label className={styles.optionRow}>
                <span>Budget limit alerts</span>
                <input
                  type="checkbox"
                  checked={budgetAlerts}
                  onChange={(e) => setBudgetAlerts(e.target.checked)}
                />
              </label>

              <label className={styles.optionRow}>
                <span>Weekly digest summary</span>
                <input
                  type="checkbox"
                  checked={weeklyDigest}
                  onChange={(e) => setWeeklyDigest(e.target.checked)}
                />
              </label>
            </div>

            {notifMessage && <p className={styles.successText}>{notifMessage}</p>}
            <button type="button" className={styles.primaryButton} onClick={saveNotificationPrefs}>
              Save notification settings
            </button>
          </div>
        )}

        {activeTab === "billing" && (
          <div className={styles.panel}>
            <h1 className={styles.heading}>Billing</h1>
            <p className={styles.subheading}>Manage your subscription status, payment details, invoices, and plan changes from one place.</p>

            <section className={styles.billingHero}>
              <div className={styles.billingHeroContent}>
                <span className={styles.planBadge}>Current plan: {currentPlan.name}</span>
                <h2 className={styles.billingTitle}>Manage your subscription from Lunivo</h2>
                <p className={styles.billingText}>
                  Use this billing page to cancel or resume your subscription, review renewal status, and check invoice history. Stripe handles the payment processing in the background.
                </p>
                <div className={styles.billingActionRow}>
                  <button
                    type="button"
                    className={styles.primaryButton}
                    onClick={() => manageBilling(currentPlan.priceMonthly === 0 ? "resume" : "cancel")}
                    disabled={currentPlan.priceMonthly === 0}
                  >
                    Cancel subscription
                  </button>
                  <Link href="/subscriptions" className={styles.secondaryButton}>Change plan</Link>
                  <span className={styles.billingMeta}>Current rate: {formatPlanPrice(currentPlan.priceMonthly)}</span>
                </div>
              </div>
              <div className={styles.billingInfoGrid}>
                <article className={styles.billingInfoCard}>
                  <strong>Subscription</strong>
                  <span>{currentPlan.name}</span>
                  <p>{currentPlan.priceMonthly === 0 ? "Starter is active with no recurring charge." : `${formatPlanPrice(currentPlan.priceMonthly)} billed monthly.`}</p>
                </article>
                <article className={styles.billingInfoCard}>
                  <strong>Billing status</strong>
                  <span>{currentPlan.priceMonthly === 0 ? "No payment method required" : "Auto-renew is on"}</span>
                  <p>{currentPlan.priceMonthly === 0 ? "Add a card before switching to a paid subscription." : "Update cards, invoices, and cancellation settings below."}</p>
                </article>
              </div>
            </section>

            <div className={styles.divider} />

            <div className={styles.billingSectionGrid}>
              <div className={`${styles.inlineCard} ${styles.billingCard}`}>
                <h3 className={styles.sectionSubtitle}>Payment Method</h3>
                <p className={styles.billingText}>Payment details are processed securely by Stripe, but your billing settings still live here in Lunivo.</p>
                <div className={styles.billingInfoGrid}>
                  <article className={styles.billingInfoCard}>
                    <strong>Provider</strong>
                    <span>Stripe</span>
                    <p>Stripe handles the secure payment processing for cards, renewals, and invoice generation.</p>
                  </article>
                  <article className={styles.billingInfoCard}>
                    <strong>Payment method</strong>
                    <span>{currentPlan.priceMonthly === 0 ? "Not required yet" : "Managed in Stripe"}</span>
                    <p>{currentPlan.priceMonthly === 0 ? "You will only need a payment method when moving to a paid subscription." : "Saved cards stay tokenized and handled by Stripe for security."}</p>
                  </article>
                </div>
                <div className={styles.actionRow}>
                  <button type="button" className={styles.secondaryButton} onClick={() => manageBilling("portal")}>Update payment method</button>
                </div>
              </div>

              <div className={`${styles.inlineCard} ${styles.billingCard}`}>
                <h3 className={styles.sectionSubtitle}>Subscription Controls</h3>
                <p className={styles.billingText}>Cancel or resume from Lunivo here, then use subscriptions only when you want to switch to a different tier.</p>
                <div className={styles.billingInfoGrid}>
                  <article className={styles.billingInfoCard}>
                    <strong>Next renewal</strong>
                    <span>{currentPlan.priceMonthly === 0 ? "No renewal scheduled" : "1 May 2026"}</span>
                    <p>{currentPlan.priceMonthly === 0 ? "Starter does not renew because it has no monthly charge." : `${formatPlanPrice(currentPlan.priceMonthly)} will renew automatically unless you cancel.`}</p>
                  </article>
                  <article className={styles.billingInfoCard}>
                    <strong>Plan changes</strong>
                    <span>Handled from subscriptions</span>
                    <p>Use the subscriptions page to upgrade or downgrade tiers. Billing stays here for cancellation, renewals, and invoices.</p>
                  </article>
                </div>
                <div className={styles.actionRow}>
                  <button type="button" className={styles.secondaryButton} onClick={() => manageBilling("cancel")} disabled={currentPlan.priceMonthly === 0}>
                    Cancel subscription
                  </button>
                  <button type="button" className={styles.secondaryButton} onClick={() => manageBilling("resume")}>
                    Resume subscription
                  </button>
                  <Link href="/subscriptions" className={styles.link}>Open subscriptions</Link>
                </div>
              </div>
            </div>

            {billingMessage ? <p className={styles.successText}>{billingMessage}</p> : null}

            <div className={styles.divider} />

            <div className={`${styles.inlineCard} ${styles.billingCard}`}>
              <h3 className={styles.sectionSubtitle}>Invoices</h3>
              <p className={styles.billingText}>Stripe receipts and billing history will appear here once the billing integration is connected.</p>
              <div className={styles.billingInvoiceList}>
                <div className={styles.billingInvoiceRow}>
                  <div>
                    <strong>No invoices yet</strong>
                    <p>{currentPlan.priceMonthly === 0 ? "Starter has no monthly invoice history." : "Your first paid invoice will appear here after the next successful renewal."}</p>
                  </div>
                  <span className={styles.billingInvoiceStatus}>Pending setup</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "security" && (
          <div className={styles.panel}>
            <h1 className={styles.heading}>Security</h1>
            <p className={styles.subheading}>Update your password and secure your account.</p>

            <div className={styles.securityHeroCard}>
              <div>
                <h3 className={styles.sectionSubtitle}>Change your password</h3>
                <p className={styles.securityDescription}>Use a strong password with at least 8 characters. A mix of words, numbers, and symbols is easiest to remember and harder to guess.</p>
              </div>
              <div className={styles.securityPillRow}>
                <span className={styles.securityPill}>Minimum 8 characters</span>
                <span className={styles.securityPill}>Stored securely</span>
              </div>
            </div>

            <form className={styles.securityForm} onSubmit={handlePasswordSave}>
              <div className={styles.securityFieldCard}>
                <label className={styles.fieldLabel} htmlFor="currentPassword">
                  Current password
                </label>
                <input
                  id="currentPassword"
                  className={`${styles.input} ${styles.securityInput}`}
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                  placeholder="Enter your current password"
                />
                <p className={styles.securityHint}>Required to confirm it is really you.</p>
              </div>

              <div className={styles.securityGrid}>
                <div className={styles.securityFieldCard}>
                  <label className={styles.fieldLabel} htmlFor="newPassword">
                    New password
                  </label>
                  <input
                    id="newPassword"
                    className={`${styles.input} ${styles.securityInput}`}
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                    placeholder="Create a new password"
                  />
                  <p className={styles.securityHint}>Example: a longer phrase with a number and symbol.</p>
                </div>

                <div className={styles.securityFieldCard}>
                  <label className={styles.fieldLabel} htmlFor="confirmPassword">
                    Confirm new password
                  </label>
                  <input
                    id="confirmPassword"
                    className={`${styles.input} ${styles.securityInput}`}
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    placeholder="Re-enter the new password"
                  />
                  <p className={styles.securityHint}>Repeat the new password exactly once more.</p>
                </div>
              </div>

              {passwordError && <p className={styles.errorText}>{passwordError}</p>}
              {passwordMessage && <p className={styles.successText}>{passwordMessage}</p>}

              <div className={styles.securityActionRow}>
                <button type="submit" className={styles.primaryButton} disabled={isSavingPassword}>
                  {isSavingPassword ? "Updating..." : "Update password"}
                </button>
                <span className={styles.securityHint}>You will stay signed in after a successful password update.</span>
              </div>
            </form>

            <div className={styles.divider} />
            <h3 className={styles.sectionSubtitle}>Active Sessions</h3>
            <div className={styles.sessionsList}>
              {activeSessions
                .filter((item) => !signedOutSessions.includes(item.id))
                .map((item) => (
                  <div key={item.id} className={styles.sessionItem}>
                    <div>
                      <p className={styles.sessionDevice}>{item.device}</p>
                      <p className={styles.sessionLastActive}>Last active: {item.lastActive}</p>
                    </div>
                    {item.isCurrent ? (
                      <span className={styles.badgeCurrent}>Current session</span>
                    ) : (
                      <button type="button" className={styles.secondaryButton} onClick={() => signOutSession(item.id)}>
                        Sign out
                      </button>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}

        {activeTab === "data" && (
          <div className={styles.panel}>
            <h1 className={styles.heading}>Data & Export</h1>
            <p className={styles.subheading}>Export transactions, budgets, and analytics snapshots.</p>

            <div className={styles.inlineCard}>
              <h3 className={styles.sectionSubtitle}>Quick Export</h3>
              <p>Pro can export monthly summary and category breakdown CSV files. Other plans can see the controls here, but export stays locked.</p>
              <div className={styles.actionRow}>
                <button type="button" className={styles.secondaryButton} onClick={() => requestExport("csv")} disabled={!canExportCsv}>
                  Export CSV
                </button>
                <button type="button" className={styles.secondaryButton} onClick={() => requestExport("json")}>
                  Export JSON
                </button>
                <button type="button" className={styles.primaryButton} onClick={() => requestExport("backup")}>
                  Request full backup
                </button>
              </div>
              {dataMessage && <p className={styles.successText}>{dataMessage}</p>}
            </div>

            <div className={styles.divider} />
            <div className={styles.inlineCard}>
              <h3 className={styles.sectionSubtitle}>Custom Categories</h3>
              <p>Pro can create, remove, and reuse custom transaction categories.</p>
              <div className={styles.actionRow}>
                <input
                  className={styles.input}
                  value={newCategoryName}
                  onChange={(event) => setNewCategoryName(event.target.value)}
                  placeholder="Add a category"
                  disabled={!canManageDataControls}
                />
                <button type="button" className={styles.primaryButton} onClick={() => void addCustomCategory()} disabled={!canManageDataControls}>
                  Add category
                </button>
              </div>
              <div className={styles.tagList}>
                {customCategories.map((category) => (
                  <span key={category} className={styles.tagPill}>
                    {category}
                    <button type="button" className={styles.inlineRemoveButton} onClick={() => void removeCustomCategory(category)} disabled={!canManageDataControls || DEFAULT_CUSTOM_CATEGORIES.includes(category)}>
                      Remove
                    </button>
                  </span>
                ))}
              </div>
              {!canManageDataControls ? <p className={styles.hintText}>Custom categories, transaction tags, bulk edits, and category merging are available on Pro.</p> : null}
            </div>

            <div className={styles.divider} />
            <div className={styles.inlineCard}>
              <h3 className={styles.sectionSubtitle}>Retention</h3>
              <p>We retain activity logs and transaction history to support reporting and audit accuracy.</p>
            </div>
          </div>
        )}

        {activeTab === "privacy" && (
          <div className={styles.panel}>
            <h1 className={styles.heading}>Privacy & Data</h1>
            <p className={styles.subheading}>Control visibility and data export options.</p>
            <div className={styles.inlineCard}>
              <p>Your account email is kept private by default.</p>
              <p>Analytics are used for feature improvement and financial insight recommendations.</p>
              <a href="/privacy" className={styles.link}>
                View full privacy policy
              </a>
            </div>
          </div>
        )}

        {activeTab === "help" && (
          <div className={styles.panel}>
            <h1 className={styles.heading}>Help & Support</h1>
            <p className={styles.subheading}>Need a hand? Start with docs or contact support.</p>

            <div className={styles.inlineCard}>
              <h3 className={styles.sectionSubtitle}>Support Channels</h3>
              <a href="/terms" className={styles.link}>
                Terms and account policies
              </a>
              <a href="/privacy" className={styles.link}>
                Privacy policy
              </a>
              <a href="mailto:support@lunivo.app" className={styles.link}>
                support@lunivo.app
              </a>
            </div>

            <div className={styles.divider} />
            <div className={styles.inlineCard}>
              <h3 className={styles.sectionSubtitle}>Troubleshooting</h3>
              <p>If syncing looks delayed, refresh once or sign out and back in to rehydrate session data.</p>
            </div>
          </div>
        )}

        {activeTab === "danger" && (
          <div className={styles.panel}>
            <h1 className={styles.heading}>Account Deletion</h1>
            <p className={styles.subheading}>This action is irreversible. Proceed only if you're sure.</p>

            <form className={`${styles.inlineCard} ${styles.dangerZone}`} onSubmit={handleDeleteAccount}>
              <h3 className={styles.sectionSubtitle}>Danger Zone</h3>
              <p>Type your email to confirm permanent deletion of your account and all associated data.</p>
              <input
                className={styles.input}
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder={session.email}
              />
              {deleteError && <p className={styles.errorText}>{deleteError}</p>}
              {deleteMessage && <p className={styles.successText}>{deleteMessage}</p>}
              <button type="submit" className={styles.dangerButton} disabled={isDeletingAccount}>
                {isDeletingAccount ? "Verifying..." : "Delete account permanently"}
              </button>
            </form>
          </div>
        )}
      </section>
    </main>
  );
}
