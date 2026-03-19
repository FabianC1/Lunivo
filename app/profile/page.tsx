"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import styles from "./profile.module.css";
import { AuthSession, getSession, setSession } from "../../lib/auth";

type SettingsTab = "account" | "appearance" | "notifications" | "billing" | "security" | "privacy";

const TAB_ITEMS: Array<{ id: SettingsTab; label: string }> = [
  { id: "account", label: "Account" },
  { id: "appearance", label: "Appearance" },
  { id: "notifications", label: "Notifications" },
  { id: "billing", label: "Billing" },
  { id: "security", label: "Security" },
  { id: "privacy", label: "Privacy & Data" },
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

  const tabFromUrl = searchParams.get("tab");
  const activeTab: SettingsTab = TAB_ITEMS.some((tab) => tab.id === tabFromUrl)
    ? (tabFromUrl as SettingsTab)
    : "account";

  const [session, setSessionState] = useState<AuthSession | null>(null);
  const [name, setName] = useState("");
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

  useEffect(() => {
    const current = getSession();
    if (!current) {
      router.replace("/login");
      return;
    }
    setSessionState(current);
    setName(current.name);
  }, [router]);

  const initials = useMemo(() => getInitials(name || session?.name || "User"), [name, session?.name]);

  function setTab(tab: SettingsTab) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
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
      setNameMessage("Name updated for this demo session.");
      setIsSavingName(false);
      return;
    }

    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: session.userId, name: normalizedName }),
      });
      const payload = await response.json();

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
      setNameMessage("Profile name updated.");
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
          userId: session.userId,
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

  function saveNotificationPrefs() {
    setNotifMessage("Notification preferences saved locally.");
    window.setTimeout(() => setNotifMessage(""), 2000);
  }

  if (!session) {
    return null;
  }

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
            <p className={styles.subheading}>Manage your profile identity and account email.</p>

            <div className={styles.accountHeader}>
              <div className={styles.avatar} aria-hidden="true">
                {initials}
              </div>
              <div className={styles.accountMeta}>
                <h3>{session.name}</h3>
                <p>{session.email}</p>
              </div>
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

              {nameError && <p className={styles.errorText}>{nameError}</p>}
              {nameMessage && <p className={styles.successText}>{nameMessage}</p>}

              <button type="submit" className={styles.primaryButton} disabled={isSavingName}>
                {isSavingName ? "Saving..." : "Save account changes"}
              </button>
            </form>
          </div>
        )}

        {activeTab === "appearance" && (
          <div className={styles.panel}>
            <h1 className={styles.heading}>Appearance</h1>
            <p className={styles.subheading}>Theme controls for this account.</p>
            <div className={styles.inlineCard}>
              <p>Use the theme toggle in the navbar to switch between light and dark modes.</p>
            </div>
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
            <p className={styles.subheading}>Subscription and payment settings.</p>
            <div className={styles.inlineCard}>
              <p>Current plan: Free</p>
              <p>Payment management can be added when you introduce paid plans.</p>
              <button type="button" className={styles.secondaryButton} disabled>
                Manage billing (coming soon)
              </button>
            </div>
          </div>
        )}

        {activeTab === "security" && (
          <div className={styles.panel}>
            <h1 className={styles.heading}>Security</h1>
            <p className={styles.subheading}>Update your password and secure your account.</p>

            <form className={styles.form} onSubmit={handlePasswordSave}>
              <label className={styles.fieldLabel} htmlFor="currentPassword">
                Current password
              </label>
              <input
                id="currentPassword"
                className={styles.input}
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
              />

              <label className={styles.fieldLabel} htmlFor="newPassword">
                New password
              </label>
              <input
                id="newPassword"
                className={styles.input}
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
              />

              <label className={styles.fieldLabel} htmlFor="confirmPassword">
                Confirm new password
              </label>
              <input
                id="confirmPassword"
                className={styles.input}
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />

              {passwordError && <p className={styles.errorText}>{passwordError}</p>}
              {passwordMessage && <p className={styles.successText}>{passwordMessage}</p>}

              <button type="submit" className={styles.primaryButton} disabled={isSavingPassword}>
                {isSavingPassword ? "Updating..." : "Update password"}
              </button>
            </form>
          </div>
        )}

        {activeTab === "privacy" && (
          <div className={styles.panel}>
            <h1 className={styles.heading}>Privacy & Data</h1>
            <p className={styles.subheading}>Control visibility and data export options.</p>
            <div className={styles.inlineCard}>
              <p>Your account email is kept private by default.</p>
              <button type="button" className={styles.secondaryButton}>
                Request data export
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
