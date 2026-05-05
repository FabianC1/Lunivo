"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { signOut } from "next-auth/react";
import PageLoading from "../../components/PageLoading";
import { readApiError } from "../../lib/apiClient";
import styles from "./profile.module.css";
import { AuthSession, clearSession, DEMO_PLAN_SLUG, getSession, markLogoutPending, setSession } from "../../lib/auth";
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
  DEFAULT_APPEARANCE_SETTINGS,
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

type BankConnectionPayload = {
  accessGranted?: boolean;
  configured: boolean;
  config: {
    environment?: string;
    countryCodes?: string[];
    products?: string[];
    redirectUri?: string | null;
  } | null;
  connection: {
    id: string;
    provider: string;
    status: string;
    institutionId: string;
    institutionName: string;
    institutionCountryCode: string;
    itemId: string;
    linkSessionId: string;
    lastError: string;
    connectedAt: string | null;
    authorizationExpiresAt: string | null;
    lastSyncAt: string | null;
    lastSyncStatus: string | null;
    lastSyncAccountCount: number;
    lastSyncTransactionCount: number;
    syncedAccountCount: number;
  } | null;
};

type PlaidLinkHandler = {
  open: () => void;
  destroy?: () => void;
};

type PlaidLinkSuccessMetadata = {
  institution?: {
    institution_id?: string | null;
    name?: string | null;
  } | null;
  link_session_id?: string | null;
};

type PlaidLinkExitMetadata = {
  status?: string | null;
  request_id?: string | null;
  link_session_id?: string | null;
};

type PlaidLinkError = {
  error_code?: string | null;
  error_message?: string | null;
  error_type?: string | null;
  display_message?: string | null;
};

declare global {
  interface Window {
    Plaid?: {
      create: (config: {
        token: string;
        onSuccess: (publicToken: string, metadata: PlaidLinkSuccessMetadata) => void;
        onExit: (error: PlaidLinkError | null, metadata: PlaidLinkExitMetadata) => void;
        receivedRedirectUri?: string;
      }) => PlaidLinkHandler;
    };
  }
}

let plaidScriptPromise: Promise<void> | null = null;

function loadPlaidScript() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Plaid Link can only load in the browser."));
  }

  if (window.Plaid) {
    return Promise.resolve();
  }

  if (plaidScriptPromise) {
    return plaidScriptPromise;
  }

  plaidScriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-plaid-link="true"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Unable to load Plaid Link.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://cdn.plaid.com/link/v2/stable/link-initialize.js";
    script.async = true;
    script.dataset.plaidLink = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Unable to load Plaid Link."));
    document.head.appendChild(script);
  });

  return plaidScriptPromise;
}

function mixColors(colorA: string, colorB: string, weight = 0.5) {
  const normalize = (value: string) => value.replace("#", "").trim();
  const a = normalize(colorA);
  const b = normalize(colorB);
  if (!/^[0-9a-fA-F]{6}$/.test(a) || !/^[0-9a-fA-F]{6}$/.test(b)) {
    return colorA;
  }

  const blend = (index: number) => {
    const first = Number.parseInt(a.slice(index, index + 2), 16);
    const second = Number.parseInt(b.slice(index, index + 2), 16);
    return Math.round((first * (1 - weight)) + (second * weight))
      .toString(16)
      .padStart(2, "0");
  };

  return `#${blend(0)}${blend(2)}${blend(4)}`.toUpperCase();
}

function parseGradientAngle(gradient: string) {
  const match = gradient.match(/linear-gradient\((\d+)deg/i);
  return match ? Number.parseInt(match[1], 10) : 135;
}

function isInvertedGradient(gradient: string, accentColor: string) {
  return gradient.toLowerCase().includes(`${accentColor.toLowerCase()} 0%`);
}

function createBalancedGradient(angle: number, startColor: string, endColor: string) {
  return `linear-gradient(${angle}deg, ${startColor} 0%, ${endColor} 100%)`;
}

function createThemeDraft(
  name: string,
  mode: ThemeMode,
  primaryColor: string,
  accentColor: string,
  backgroundColor: string,
  textColor: string,
  gradientAngle: number,
  gradientInverted: boolean,
): ThemePreset {
  const id = `custom-${Date.now()}`;
  const cardColor = mode === "dark" ? "#1E293B" : "#FFFFFF";
  const gradientStart = gradientInverted ? accentColor : backgroundColor;
  const gradientEnd = gradientInverted ? backgroundColor : accentColor;
  const navbarStart = gradientInverted ? accentColor : cardColor;
  const navbarEnd = gradientInverted ? cardColor : primaryColor;
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
      navbarColor: `linear-gradient(${gradientAngle}deg, ${navbarStart} 0%, ${navbarEnd} 100%)`,
      navbarBorderGradient: `linear-gradient(90deg, ${primaryColor} 0%, ${accentColor} 100%)`,
      navbarTextColor: textColor,
      bgGradient: createBalancedGradient(gradientAngle, gradientStart, gradientEnd),
      buttonGradientStart: primaryColor,
      buttonGradientEnd: accentColor,
      foregroundRgb: mode === "dark" ? "241, 245, 249" : "30, 41, 59",
      backgroundStartRgb: mode === "dark" ? "15, 23, 42" : "248, 250, 252",
      backgroundEndRgb: mode === "dark" ? "30, 41, 59" : "255, 255, 255",
    },
  };
}

type SettingsTab = "account" | "appearance" | "preferences" | "billing" | "security" | "data" | "privacy" | "help" | "danger";

const TAB_ITEMS: Array<{ id: SettingsTab; label: string }> = [
  { id: "account", label: "Account" },
  { id: "appearance", label: "Appearance" },
  { id: "preferences", label: "Preferences" },
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
  const selectedThemeIdRef = useRef(selectedThemeId);
  const customThemesRef = useRef(customThemes);
  const plaidHandlerRef = useRef<PlaidLinkHandler | null>(null);
  const handledOauthRedirectRef = useRef<string | null>(null);

  useEffect(() => {
    selectedThemeIdRef.current = selectedThemeId;
    customThemesRef.current = customThemes;
  }, [selectedThemeId, customThemes]);

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
  const [themeGradientAngle, setThemeGradientAngle] = useState(135);
  const [themeGradientInverted, setThemeGradientInverted] = useState(false);
  const [editingThemeId, setEditingThemeId] = useState<string | null>(null);
  const [contactMessage, setContactMessage] = useState("");
  const [billingMessage, setBillingMessage] = useState("");
  const [dataMessage, setDataMessage] = useState("");
  const [dataError, setDataError] = useState("");
  const [isExporting, setIsExporting] = useState<null | "csv" | "json" | "backup">(null);
  const [deleteError, setDeleteError] = useState("");
  const [deleteMessage, setDeleteMessage] = useState("");
  const [signedOutSessions, setSignedOutSessions] = useState<number[]>([]);
  
  const [activeSessions] = useState([
    { id: 1, device: "Chrome on macOS", lastActive: "2 minutes ago", isCurrent: true },
    { id: 2, device: "Safari on iPhone", lastActive: "5 hours ago", isCurrent: false },
  ]);

  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [bankStatus, setBankStatus] = useState<BankConnectionPayload | null>(null);
  const [isBankLoading, setIsBankLoading] = useState(false);
  const [isBankConnecting, setIsBankConnecting] = useState(false);
  const [isBankSyncing, setIsBankSyncing] = useState(false);
  const [bankMessage, setBankMessage] = useState("");
  const [bankError, setBankError] = useState("");

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
      setCurrentPlanSlug(currentSession?.isDemo ? DEMO_PLAN_SLUG : "free");
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
        setDashboardSettings(payload.user.dashboard ?? DEFAULT_DASHBOARD_SETTINGS);
        setCustomCategories(sanitizeCustomCategories(payload.user.customCategories ?? DEFAULT_CUSTOM_CATEGORIES));

        const serverAppearance = payload.user.appearance ?? DEFAULT_APPEARANCE_SETTINGS;
        const serverLooksUntouched =
          serverAppearance.selectedThemeId === DEFAULT_APPEARANCE_SETTINGS.selectedThemeId
          && serverAppearance.customThemes.length === DEFAULT_APPEARANCE_SETTINGS.customThemes.length;
        const clientHasNonDefaultTheme =
          selectedThemeIdRef.current !== DEFAULT_APPEARANCE_SETTINGS.selectedThemeId
          || customThemesRef.current.length > DEFAULT_APPEARANCE_SETTINGS.customThemes.length;

        if (!(serverLooksUntouched && clientHasNonDefaultTheme)) {
          applyAppearanceSettings(serverAppearance);
        }

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
  }, [session?.userId, session?.isDemo]);

  useEffect(() => {
    const tab = searchParams?.get("tab");
    if (tab && TAB_ITEMS.some((t) => t.id === tab)) {
      setActiveTab(tab as SettingsTab);
    }
  }, [searchParams]);

  useEffect(() => {
    const bankMode = searchParams?.get("bank");
    const message = searchParams?.get("bankMessage");
    if (!bankMode || !message) {
      return;
    }

    if (bankMode === "success") {
      setBankMessage(message);
      setBankError("");
    } else {
      setBankError(message);
      setBankMessage("");
    }
  }, [searchParams]);

  useEffect(() => {
    return () => {
      plaidHandlerRef.current?.destroy?.();
    };
  }, []);

  useEffect(() => {
    if (!session || session.isDemo || !session.userId) {
      setBankStatus(null);
      return;
    }

    let isMounted = true;

    async function loadBankStatus() {
      try {
        setIsBankLoading(true);
        const response = await fetch("/api/bank/status", { cache: "no-store" });
        if (!response.ok) {
          const message = await readApiError(response, "Unable to load bank sync status.");
          if (isMounted) {
            setBankError(message);
          }
          return;
        }

        const payload = (await response.json()) as BankConnectionPayload;
        if (isMounted) {
          setBankStatus(payload);
        }
      } catch {
        if (isMounted) {
          setBankError("Unable to load bank sync status.");
        }
      } finally {
        if (isMounted) {
          setIsBankLoading(false);
        }
      }
    }

    void loadBankStatus();

    return () => {
      isMounted = false;
    };
  }, [session?.userId, session?.isDemo]);

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

  function resetThemeBuilder() {
    setEditingThemeId(null);
    setThemeName("My Theme");
    setThemeMode("light");
    setThemePrimary("#2563EB");
    setThemeAccent("#F97316");
    setThemeBackground("#F8FAFC");
    setThemeText("#1E293B");
    setThemeGradientAngle(135);
    setThemeGradientInverted(false);
  }

  function startEditingTheme(theme: ThemePreset) {
    setEditingThemeId(theme.id);
    setThemeName(theme.name);
    setThemeMode(theme.mode);
    setThemePrimary(theme.colors.primaryColor);
    setThemeAccent(theme.colors.accentColor);
    setThemeBackground(theme.colors.bgColor);
    setThemeText(theme.colors.textColor);
    setThemeGradientAngle(parseGradientAngle(theme.colors.bgGradient));
    setThemeGradientInverted(isInvertedGradient(theme.colors.bgGradient, theme.colors.accentColor));
  }

  async function handleCreateCustomTheme() {
    setThemeError("");
    if (!themeName.trim()) {
      setThemeError("Theme name cannot be empty.");
      return;
    }

    const draftTheme = createThemeDraft(
      themeName.trim(),
      themeMode,
      themePrimary,
      themeAccent,
      themeBackground,
      themeText,
      themeGradientAngle,
      themeGradientInverted,
    );

    const nextTheme = editingThemeId
      ? { ...draftTheme, id: editingThemeId }
      : draftTheme;

    const nextCustomThemes = editingThemeId
      ? customThemes.map((theme) => (theme.id === editingThemeId ? nextTheme : theme))
      : [...customThemes, nextTheme];

    setCustomThemes(nextCustomThemes);
    const saved = await persistAppearanceSettings({
      selectedThemeId: selectedThemeId === editingThemeId || !editingThemeId ? nextTheme.id : selectedThemeId,
      customThemes: nextCustomThemes,
    });

    if (saved) {
      setThemeMessage(editingThemeId ? "Theme preset updated." : "Theme preset created.");
      window.setTimeout(() => setThemeMessage(""), 2200);
      resetThemeBuilder();
    }
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

  function downloadFile(blob: Blob, filename: string) {
    const objectUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(objectUrl);
  }

  function buildClientCsv(rows: Array<Record<string, unknown>>) {
    if (rows.length === 0) {
      return "recordType,label,value\n";
    }

    const headers = Object.keys(rows[0]);
    const escape = (value: unknown) => {
      const normalized = value === null || value === undefined
        ? ""
        : typeof value === "object"
          ? JSON.stringify(value)
          : String(value);
      return `"${normalized.replace(/"/g, '""')}"`;
    };

    return [
      headers.join(","),
      ...rows.map((row) => headers.map((header) => escape(row[header])).join(",")),
    ].join("\n");
  }

  function buildLocalExportSnapshot() {
    const storageIdentity = session?.userId ?? session?.email ?? "guest";
    const parseStored = <T,>(key: string, fallback: T): T => {
      if (typeof window === "undefined") {
        return fallback;
      }

      try {
        const raw = window.localStorage.getItem(key);
        return raw ? (JSON.parse(raw) as T) : fallback;
      } catch {
        return fallback;
      }
    };

    const budgets = parseStored<Record<string, number> | null>("lunivo-budgets", null);
    const goals = parseStored<Array<Record<string, unknown>>>(`lunivo-goals-${storageIdentity}`, []);
    const planner = parseStored<Record<string, unknown> | null>(`lunivo-event-planner-${storageIdentity}`, null);
    const dashboard = parseStored<Record<string, unknown>>(`lunivo-dashboard-settings-${storageIdentity}`, dashboardSettings);

    return {
      exportedAt: new Date().toISOString(),
      source: session?.isDemo || !session?.userId ? "local-session" : "local-session-fallback",
      note: session?.userId
        ? "This export was generated from browser data because the secure server auth cookie is missing. Sign out and back in to export server-backed account data."
        : "This export was generated from browser data for a demo/local session.",
      user: {
        id: session?.userId ?? null,
        name: name || session?.name || "",
        email: session?.email ?? "",
        planSlug: currentPlanSlug,
        backupEmail,
        phone,
        preferences: {
          language,
          currency,
          country,
        },
        appearance: {
          selectedThemeId,
          customThemes,
        },
        dashboard,
        customCategories,
      },
      budgets,
      goals,
      planner,
    };
  }

  function exportLocalSnapshot(type: "csv" | "json" | "backup") {
    const snapshot = buildLocalExportSnapshot();

    if (type === "csv") {
      const budgetRows = Object.entries(snapshot.budgets ?? {}).map(([category, amount]) => ({
        recordType: "budget",
        label: category,
        value: amount,
        targetDate: "",
        status: "",
      }));
      const goalRows = snapshot.goals.map((goal) => ({
        recordType: "goal",
        label: String(goal.title ?? "Untitled goal"),
        value: Number(goal.savedAmount ?? 0),
        targetDate: String(goal.targetDate ?? ""),
        status: Boolean(goal.completed) ? "completed" : "active",
      }));
      const csv = buildClientCsv([...budgetRows, ...goalRows]);
      downloadFile(new Blob([csv], { type: "text/csv;charset=utf-8" }), "lunivo-local-export.csv");
      return;
    }

    downloadFile(
      new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json;charset=utf-8" }),
      `lunivo-${type === "backup" ? "local-backup" : "local-export"}.json`,
    );
  }

  async function requestExport(type: "csv" | "json" | "backup") {
    if (type === "csv" && !canExportCsv) {
      return;
    }

    setIsExporting(type);
    setDataMessage("");
    setDataError("");

    if (session?.isDemo || !session?.userId) {
      try {
        exportLocalSnapshot(type);
        setDataMessage(type === "csv" ? "Local CSV export downloaded." : "Local data export downloaded.");
      } catch {
        setDataError("Unable to generate the local export.");
      } finally {
        setIsExporting(null);
        window.setTimeout(() => {
          setDataMessage("");
          setDataError("");
        }, 3200);
      }
      return;
    }

    try {
      const response = await fetch(`/api/profile/export?format=${type}`, {
        method: "GET",
        cache: "no-store",
      });

      if (response.status === 401) {
        exportLocalSnapshot(type);
        setDataMessage("Downloaded a local snapshot. Sign out and back in if you want the full server-backed export.");
        return;
      }

      if (!response.ok) {
        throw new Error(await readApiError(response, "Unable to prepare export."));
      }

      const disposition = response.headers.get("content-disposition") ?? "";
      const filenameMatch = disposition.match(/filename="?([^\"]+)"?/i);
      const filename = filenameMatch?.[1] ?? `lunivo-${type}-export.${type === "csv" ? "csv" : "json"}`;
      const blob = await response.blob();
      downloadFile(blob, filename);

      setDataMessage(type === "backup" ? "Full backup downloaded." : `${type.toUpperCase()} export downloaded.`);
    } catch (error) {
      setDataError(error instanceof Error ? error.message : "Unable to prepare export.");
    } finally {
      setIsExporting(null);
      window.setTimeout(() => {
        setDataMessage("");
        setDataError("");
      }, 3200);
    }
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

  async function refreshBankStatus() {
    if (!session || session.isDemo || !session.userId) {
      return;
    }

    try {
      const response = await fetch("/api/bank/status", { cache: "no-store" });
      if (!response.ok) {
        throw new Error(await readApiError(response, "Unable to refresh bank sync status."));
      }
      const payload = (await response.json()) as BankConnectionPayload;
      setBankStatus(payload);
    } catch (error) {
      setBankError(error instanceof Error ? error.message : "Unable to refresh bank sync status.");
    }
  }

  async function handleBankConnect(receivedRedirectUri?: string) {
    setBankError("");
    setBankMessage("");
    setIsBankConnecting(true);

    try {
      const response = await fetch("/api/bank/connect", { method: "POST" });
      if (!response.ok) {
        throw new Error(await readApiError(response, "Unable to start the Plaid bank connection."));
      }

      const payload = (await response.json()) as { linkToken?: string };
      if (!payload.linkToken) {
        throw new Error("Plaid did not return a link token.");
      }

      await loadPlaidScript();
      if (!window.Plaid) {
        throw new Error("Plaid Link did not finish loading.");
      }

      plaidHandlerRef.current?.destroy?.();
      const handler = window.Plaid.create({
        token: payload.linkToken,
        ...(receivedRedirectUri ? { receivedRedirectUri } : {}),
        onSuccess: (publicToken, metadata) => {
          void (async () => {
            try {
              const exchangeResponse = await fetch("/api/bank/exchange", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  publicToken,
                  institutionId: metadata.institution?.institution_id,
                  institutionName: metadata.institution?.name,
                  linkSessionId: metadata.link_session_id,
                }),
              });

              if (!exchangeResponse.ok) {
                throw new Error(await readApiError(exchangeResponse, "Unable to complete the Plaid connection."));
              }

              const exchangePayload = (await exchangeResponse.json()) as {
                summary?: {
                  importedAccounts: number;
                  importedTransactions: number;
                  updatedTransactions: number;
                };
              };

              const summary = exchangePayload.summary;
              setBankMessage(
                summary
                  ? `Bank connected. ${summary.importedAccounts} accounts refreshed, ${summary.importedTransactions} new transactions imported, ${summary.updatedTransactions} transactions updated.`
                  : "Bank connected.",
              );
              await refreshBankStatus();
            } catch (error) {
              setBankError(error instanceof Error ? error.message : "Unable to complete the Plaid connection.");
            } finally {
              setIsBankConnecting(false);
            }
          })();
        },
        onExit: (error, metadata) => {
          if (error?.error_message || error?.display_message) {
            setBankError(error.display_message || error.error_message || "Plaid Link exited before the connection finished.");
          } else if (metadata?.status === "requires_credentials") {
            setBankError("Plaid Link closed before credentials were submitted. In sandbox use user_transactions_dynamic / asdf / 1234.");
          }
          setIsBankConnecting(false);
        },
      });

      plaidHandlerRef.current = handler;
      handler.open();
    } catch (error) {
      setBankError(error instanceof Error ? error.message : "Unable to start the Plaid bank connection.");
      setIsBankConnecting(false);
    }
  }

  async function handleBankSync() {
    setBankError("");
    setBankMessage("");
    setIsBankSyncing(true);

    try {
      const response = await fetch("/api/bank/sync", { method: "POST" });
      if (!response.ok) {
        throw new Error(await readApiError(response, "Unable to sync bank data right now."));
      }

      const payload = (await response.json()) as {
        summary?: {
          importedAccounts: number;
          importedTransactions: number;
          updatedTransactions: number;
        };
      };

      const summary = payload.summary;
      setBankMessage(
        summary
          ? `Sync complete. ${summary.importedAccounts} accounts refreshed, ${summary.importedTransactions} new transactions imported, ${summary.updatedTransactions} existing transactions updated.`
          : "Sync complete.",
      );
      await refreshBankStatus();
    } catch (error) {
      setBankError(error instanceof Error ? error.message : "Unable to sync bank data right now.");
    } finally {
      setIsBankSyncing(false);
    }
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
  const canUseBankSync = session.isDemo
    ? false
    : Boolean(bankStatus?.accessGranted ?? hasFeatureAccess(currentPlan.slug, "bankSync"));
  const formattedBankConnectedAt = bankStatus?.connection?.connectedAt
    ? new Date(bankStatus.connection.connectedAt).toLocaleString()
    : null;
  const formattedBankLastSyncAt = bankStatus?.connection?.lastSyncAt
    ? new Date(bankStatus.connection.lastSyncAt).toLocaleString()
    : null;

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const oauthStateId = searchParams?.get("oauth_state_id");
    if (!oauthStateId || !session?.userId || session.isDemo) {
      return;
    }

    const redirectUrl = window.location.href;
    if (handledOauthRedirectRef.current === redirectUrl) {
      return;
    }

    handledOauthRedirectRef.current = redirectUrl;
    void handleBankConnect(redirectUrl);
  }, [searchParams, session?.userId, session?.isDemo]);

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

            <div className={styles.divider} />

            <section className={`${styles.inlineCard} ${styles.paidFeatureCard}`}>
              <div className={styles.bankPanelHeader}>
                <div>
                  <h3 className={styles.sectionSubtitle}>Bank Sync</h3>
                  <p>
                    Connect Plaid to pull accounts and transactions into Lunivo automatically instead of entering income and spendings by hand.
                  </p>
                </div>
                <span className={`${styles.bankStatusBadge} ${bankStatus?.connection ? styles.bankStatusActive : styles.bankStatusIdle}`}>
                  {session.isDemo
                    ? "Local session"
                    : !canUseBankSync
                      ? "Upgrade required"
                      : bankStatus?.connection?.status ?? "Not connected"}
                </span>
              </div>

              {session.isDemo ? (
                <p className={styles.hintText}>Bank sync is disabled for local demo sessions because Plaid access tokens must be tied to a real database-backed user.</p>
              ) : isBankLoading ? (
                <p className={styles.hintText}>Loading bank connection status...</p>
              ) : !canUseBankSync ? (
                <p className={styles.hintText}>Your current plan does not include bank sync. Upgrade to Smart, or enable the sandbox override for all plans in development.</p>
              ) : !bankStatus?.configured ? (
                <div className={styles.bankInfoGrid}>
                  <article className={styles.bankInfoCard}>
                    <strong>Plaid not configured</strong>
                    <p>Add PLAID_CLIENT_ID, PLAID_SECRET, and PLAID_ENV to .env.local before starting the bank connection flow.</p>
                  </article>
                  <article className={styles.bankInfoCard}>
                    <strong>Live OAuth prep</strong>
                    <p>Set PLAID_REDIRECT_URI to your public profile settings URL if you later enable OAuth institutions in development or production.</p>
                  </article>
                </div>
              ) : (
                <>
                  <div className={styles.bankInfoGrid}>
                    <article className={styles.bankInfoCard}>
                      <strong>Environment</strong>
                      <span>{bankStatus.config?.environment ?? "sandbox"}</span>
                      <p>{(bankStatus.config?.countryCodes ?? ["US", "GB"]).join(", ")} enabled for Plaid Link.</p>
                    </article>
                    <article className={styles.bankInfoCard}>
                      <strong>Products</strong>
                      <span>{(bankStatus.config?.products ?? ["transactions"]).join(", ")}</span>
                      <p>{bankStatus.config?.redirectUri ? `Redirect URI: ${bankStatus.config.redirectUri}` : "No redirect URI configured yet. This is fine for sandbox and non-OAuth institutions."}</p>
                    </article>
                    <article className={styles.bankInfoCard}>
                      <strong>Synced accounts</strong>
                      <span>{bankStatus.connection?.syncedAccountCount ?? 0}</span>
                      <p>Imported bank accounts currently active in Lunivo.</p>
                    </article>
                    <article className={styles.bankInfoCard}>
                      <strong>Last sync</strong>
                      <span>{formattedBankLastSyncAt ?? "Not synced yet"}</span>
                      <p>
                        {bankStatus.connection?.lastSyncStatus === "failed"
                          ? "The previous sync failed. Re-run it after checking the error below."
                          : bankStatus.connection
                            ? `Imported ${bankStatus.connection.lastSyncTransactionCount} transactions on the last run.`
                            : "No bank connection has been created yet."}
                      </p>
                    </article>
                    {bankStatus.config?.environment === "sandbox" ? (
                      <article className={styles.bankInfoCard}>
                        <strong>Sandbox login</strong>
                        <span>user_transactions_dynamic</span>
                        <p>Password: asdf. MFA: 1234. Use this when Plaid Link prompts for sandbox credentials.</p>
                      </article>
                    ) : null}
                  </div>

                  {bankStatus.connection ? (
                    <div className={styles.bankConnectionSummary}>
                      <p><strong>Connected:</strong> {formattedBankConnectedAt ?? "Pending completion"}</p>
                      <p><strong>Status:</strong> {bankStatus.connection.status}</p>
                      <p><strong>Institution:</strong> {bankStatus.connection.institutionName || bankStatus.connection.institutionId}</p>
                    </div>
                  ) : null}

                  <div className={styles.actionRow}>
                    <button
                      type="button"
                      className={styles.primaryButton}
                      onClick={() => void handleBankConnect()}
                      disabled={isBankConnecting}
                    >
                      {isBankConnecting ? "Opening Plaid..." : bankStatus.connection ? "Reconnect bank" : "Connect bank"}
                    </button>
                    <button
                      type="button"
                      className={styles.secondaryButton}
                      onClick={() => void handleBankSync()}
                      disabled={isBankSyncing || !bankStatus.connection}
                    >
                      {isBankSyncing ? "Syncing..." : "Sync now"}
                    </button>
                    <button
                      type="button"
                      className={styles.secondaryButton}
                      onClick={() => void refreshBankStatus()}
                      disabled={isBankLoading}
                    >
                      Refresh status
                    </button>
                  </div>
                </>
              )}

              {bankError || bankStatus?.connection?.lastError ? (
                <p className={styles.errorText}>{bankError || bankStatus?.connection?.lastError}</p>
              ) : null}
              {bankMessage ? <p className={styles.successText}>{bankMessage}</p> : null}
            </section>
          </div>
        )}

        {activeTab === "appearance" && (
          <div className={styles.panel}>
            <h1 className={styles.heading}>Appearance</h1>
            <p className={styles.subheading}>Theme controls for this account.</p>
            <div className={`${styles.inlineCard} ${styles.paidFeatureCard}`}>
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
            {canCreateCustomThemes ? (
              <>
                <div className={`${styles.inlineCard} ${styles.paidFeatureCard}`}>
                  <h3 className={styles.sectionSubtitle}>Custom Theme Builder</h3>
                  <p>Pro can create and save personal theme presets.</p>
                  <div className={styles.themeBuilderLayout}>
                    <div className={styles.themeBuilderGrid}>
                      <label className={styles.fieldLabel} htmlFor="themeName">Theme name</label>
                      <input id="themeName" className={styles.input} value={themeName} onChange={(event) => setThemeName(event.target.value)} />

                      <label className={styles.fieldLabel} htmlFor="themeMode">Base mode</label>
                      <select id="themeMode" className={styles.input} value={themeMode} onChange={(event) => setThemeMode(event.target.value as ThemeMode)}>
                        <option value="light">Light</option>
                        <option value="dark">Dark</option>
                      </select>

                      <label className={styles.fieldLabel} htmlFor="themePrimary">Primary color</label>
                      <label className={styles.colorPickerField} htmlFor="themePrimary">
                        <span className={styles.colorPickerSwatch} style={{ backgroundColor: themePrimary }} />
                        <span className={styles.colorPickerValue}>{themePrimary.toUpperCase()}</span>
                        <input id="themePrimary" className={styles.colorPickerInput} type="color" value={themePrimary} onChange={(event) => setThemePrimary(event.target.value)} />
                      </label>

                      <label className={styles.fieldLabel} htmlFor="themeAccent">Accent color</label>
                      <label className={styles.colorPickerField} htmlFor="themeAccent">
                        <span className={styles.colorPickerSwatch} style={{ backgroundColor: themeAccent }} />
                        <span className={styles.colorPickerValue}>{themeAccent.toUpperCase()}</span>
                        <input id="themeAccent" className={styles.colorPickerInput} type="color" value={themeAccent} onChange={(event) => setThemeAccent(event.target.value)} />
                      </label>

                      <label className={styles.fieldLabel} htmlFor="themeBackground">Background color</label>
                      <label className={styles.colorPickerField} htmlFor="themeBackground">
                        <span className={styles.colorPickerSwatch} style={{ backgroundColor: themeBackground }} />
                        <span className={styles.colorPickerValue}>{themeBackground.toUpperCase()}</span>
                        <input id="themeBackground" className={styles.colorPickerInput} type="color" value={themeBackground} onChange={(event) => setThemeBackground(event.target.value)} />
                      </label>

                      <label className={styles.fieldLabel} htmlFor="themeText">Text color</label>
                      <label className={styles.colorPickerField} htmlFor="themeText">
                        <span className={styles.colorPickerSwatch} style={{ backgroundColor: themeText }} />
                        <span className={styles.colorPickerValue}>{themeText.toUpperCase()}</span>
                        <input id="themeText" className={styles.colorPickerInput} type="color" value={themeText} onChange={(event) => setThemeText(event.target.value)} />
                      </label>
                    </div>

                    <aside className={styles.themeBuilderPreviewCard}>
                      <span className={styles.themeBuilderPreviewEyebrow}>{editingThemeId ? "Editing preset" : "Live preview"}</span>
                      <div
                        className={styles.themeBuilderPreviewFrame}
                        style={{
                          background: createBalancedGradient(
                            themeGradientAngle,
                            themeGradientInverted ? themeAccent : themeBackground,
                            themeGradientInverted ? themeBackground : themeAccent,
                          ),
                          color: themeText,
                          borderColor: themePrimary,
                        }}
                      >
                        <div className={styles.themeBuilderPreviewTop}>
                          <strong>{themeName || "Untitled theme"}</strong>
                          <span
                            className={styles.themeBuilderPreviewBadge}
                            style={{ backgroundColor: themeAccent, color: themeMode === "dark" ? "#0F172A" : "#FFFFFF" }}
                          >
                            {themeMode}
                          </span>
                        </div>
                        <div className={styles.themeBuilderPreviewPanel} style={{ backgroundColor: themeMode === "dark" ? "#1E293B" : "#FFFFFF" }}>
                          <span className={styles.themeBuilderPreviewLabel}>Buttons</span>
                          <div className={styles.themeBuilderPreviewActions}>
                            <span className={styles.themeBuilderPreviewPrimary} style={{ backgroundColor: themePrimary, color: themeMode === "dark" ? "#F8FAFC" : "#FFFFFF" }}>Primary</span>
                            <span className={styles.themeBuilderPreviewSecondary} style={{ borderColor: themeAccent, color: themeText }}>Accent</span>
                          </div>
                        </div>
                      </div>
                      <div className={styles.gradientControlCard}>
                        <div className={styles.themeBuilderPreviewTop}>
                          <span className={styles.themeBuilderPreviewLabel}>Gradient angle</span>
                          <strong>{themeGradientAngle}deg</strong>
                        </div>
                        <input
                          id="themeGradientAngle"
                          className={styles.gradientRange}
                          type="range"
                          min="0"
                          max="360"
                          step="1"
                          value={themeGradientAngle}
                          onChange={(event) => setThemeGradientAngle(Number(event.target.value))}
                        />
                        <div className={styles.gradientControlFooter}>
                          <label className={styles.gradientCheckboxLabel}>
                            <input
                              type="checkbox"
                              checked={themeGradientInverted}
                              onChange={(event) => setThemeGradientInverted(event.target.checked)}
                            />
                            Inverse gradient
                          </label>
                        </div>
                      </div>
                    </aside>
                  </div>
                  <div className={styles.actionRow}>
                    <button type="button" className={styles.primaryButton} onClick={() => void handleCreateCustomTheme()}>
                      {editingThemeId ? "Save changes" : "Create theme preset"}
                    </button>
                    <button type="button" className={styles.secondaryButton} onClick={resetThemeBuilder}>
                      Reset
                    </button>
                    {editingThemeId ? (
                      <button type="button" className={styles.secondaryButton} onClick={resetThemeBuilder}>
                        Cancel editing
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className={styles.divider} />
                <div className={`${styles.inlineCard} ${styles.paidFeatureCard}`}>
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
                            <button type="button" className={styles.secondaryButton} onClick={() => startEditingTheme(theme)}>
                              Edit
                            </button>
                            <button type="button" className={styles.secondaryButton} onClick={() => void handleDeleteCustomTheme(theme.id)}>
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className={`${styles.inlineCard} ${styles.paidFeatureCard}`}>
                <h3 className={styles.sectionSubtitle}>Custom Theme Builder</h3>
                <p>Pro unlocks custom theme creation, saved presets, and reusable personal themes.</p>
              </div>
            )}
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

            <div className={`${styles.inlineCard} ${styles.paidFeatureCard}`}>
              <h3 className={styles.sectionSubtitle}>Quick Export</h3>
              <p>Pro can export monthly summary and category breakdown CSV files. Other plans can see the controls here, but export stays locked.</p>
              <div className={styles.actionRow}>
                <button type="button" className={styles.secondaryButton} onClick={() => void requestExport("csv")} disabled={!canExportCsv || isExporting !== null}>
                  {isExporting === "csv" ? "Exporting..." : "Export CSV"}
                </button>
                <button type="button" className={styles.secondaryButton} onClick={() => void requestExport("json")} disabled={isExporting !== null}>
                  {isExporting === "json" ? "Exporting..." : "Export JSON"}
                </button>
                <button type="button" className={styles.primaryButton} onClick={() => void requestExport("backup")} disabled={isExporting !== null}>
                  {isExporting === "backup" ? "Exporting..." : "Download full backup"}
                </button>
              </div>
              {dataMessage && <p className={styles.successText}>{dataMessage}</p>}
              {dataError && <p className={styles.errorText}>{dataError}</p>}
            </div>

            <div className={styles.divider} />
            <div className={`${styles.inlineCard} ${styles.paidFeatureCard}`}>
              <h3 className={styles.sectionSubtitle}>Custom Categories</h3>
              {canManageDataControls ? (
                <>
                  <p>Pro can create, remove, and reuse custom transaction categories.</p>
                  <div className={styles.actionRow}>
                    <input
                      className={styles.input}
                      value={newCategoryName}
                      onChange={(event) => setNewCategoryName(event.target.value)}
                      placeholder="Add a category"
                    />
                    <button type="button" className={styles.primaryButton} onClick={() => void addCustomCategory()}>
                      Add category
                    </button>
                  </div>
                  <div className={styles.tagList}>
                    {customCategories.map((category) => (
                      <span key={category} className={styles.tagPill}>
                        {category}
                        <button type="button" className={styles.inlineRemoveButton} onClick={() => void removeCustomCategory(category)} disabled={DEFAULT_CUSTOM_CATEGORIES.includes(category)}>
                          Remove
                        </button>
                      </span>
                    ))}
                  </div>
                </>
              ) : (
                <p>Pro unlocks custom categories, transaction tags, bulk edits, and category merging.</p>
              )}
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
              <h3 className={styles.sectionSubtitle}>Privacy Overview</h3>
              <div className={styles.supportActionList}>
                <div className={styles.supportActionButton}>
                  <span>
                    <strong>Account email visibility</strong>
                    <small>Your account email is kept private by default.</small>
                  </span>
                  <em>Private</em>
                </div>
                <div className={styles.supportActionButton}>
                  <span>
                    <strong>Product analytics</strong>
                    <small>Analytics are used for feature improvement and financial insight recommendations.</small>
                  </span>
                  <em>Enabled</em>
                </div>
                <a href="/privacy" className={styles.supportActionButton}>
                  <span>
                    <strong>Privacy policy</strong>
                    <small>Review the full privacy policy, data handling details, and account protections.</small>
                  </span>
                  <em>Open</em>
                </a>
              </div>
            </div>
          </div>
        )}

        {activeTab === "help" && (
          <div className={styles.panel}>
            <h1 className={styles.heading}>Help & Support</h1>
            <p className={styles.subheading}>Need a hand? Start with docs or contact support.</p>

            <div className={styles.inlineCard}>
              <h3 className={styles.sectionSubtitle}>Support Channels</h3>
              <div className={styles.supportActionList}>
                <a href="/terms" className={styles.supportActionButton}>
                  <span>
                    <strong>Terms and account policies</strong>
                    <small>Read account rules, terms, and platform expectations.</small>
                  </span>
                  <em>Open</em>
                </a>
                <a href="/privacy" className={styles.supportActionButton}>
                  <span>
                    <strong>Privacy policy</strong>
                    <small>See how account and billing data is stored and handled.</small>
                  </span>
                  <em>Open</em>
                </a>
                <a href="mailto:support@lunivo.app" className={styles.supportActionButton}>
                  <span>
                    <strong>support@lunivo.app</strong>
                    <small>Contact support directly for account or billing help.</small>
                  </span>
                  <em>Email</em>
                </a>
              </div>
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
