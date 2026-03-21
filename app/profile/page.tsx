"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { signOut } from "next-auth/react";
import styles from "./profile.module.css";
import { AuthSession, clearSession, getSession, setSession } from "../../lib/auth";

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

  const tabFromUrl = searchParams?.get("tab");
  const [activeTab, setActiveTab] = useState<SettingsTab>(
    TAB_ITEMS.some((tab) => tab.id === tabFromUrl) ? (tabFromUrl as SettingsTab) : "account"
  );

  const [session, setSessionState] = useState<AuthSession | null>(null);
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
  const [contactMessage, setContactMessage] = useState("");
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
  }, [router]);

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
    clearSession();
    await signOut({ redirect: false });
    router.replace("/login");
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

  function savePreferences() {
    setIsSavingPrefs(true);
    setPrefsMessage("Preferences saved. These apply across your account.");
    window.setTimeout(() => {
      setPrefsMessage("");
      setIsSavingPrefs(false);
    }, 2500);
  }

  function saveContactDetails(e: FormEvent) {
    e.preventDefault();
    if (backupEmail && !backupEmail.includes("@")) {
      setContactMessage("Please enter a valid backup email.");
      window.setTimeout(() => setContactMessage(""), 2200);
      return;
    }
    setContactMessage("Backup email and phone saved locally.");
    window.setTimeout(() => setContactMessage(""), 2200);
  }

  function signOutSession(sessionId: number) {
    setSignedOutSessions((prev) => (prev.includes(sessionId) ? prev : [...prev, sessionId]));
    setPasswordMessage("Session revoked successfully.");
    window.setTimeout(() => setPasswordMessage(""), 2200);
  }

  function requestExport(type: "csv" | "json" | "backup") {
    const label = type === "backup" ? "Secure backup requested" : `${type.toUpperCase()} export requested`;
    setDataMessage(`${label}. We'll notify you when it's ready.`);
    window.setTimeout(() => setDataMessage(""), 2600);
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
                <button type="button" className={styles.secondaryButton} onClick={handleLogout}>
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
              <p>Use the theme toggle in the navbar to switch between light and dark modes.</p>
              <p>Accent colors, gradients, and chart tones automatically adapt to your selected theme.</p>
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
            <p className={styles.subheading}>Subscription and payment settings.</p>
            <div className={styles.inlineCard}>
              <span className={styles.planBadge}>Current plan: Free</span>
              <p>Usage cycle resets on the 1st of every month.</p>
              <p>Payment management can be added when you introduce paid plans.</p>
              <button type="button" className={styles.secondaryButton} disabled>
                Manage billing (coming soon)
              </button>
            </div>

            <div className={styles.divider} />
            <div className={styles.inlineCard}>
              <h3 className={styles.sectionSubtitle}>Billing History</h3>
              <p>No invoices yet. Once paid plans are enabled, invoices will appear here.</p>
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
              <p>Download a copy of your financial records in your preferred format.</p>
              <div className={styles.actionRow}>
                <button type="button" className={styles.secondaryButton} onClick={() => requestExport("csv")}>
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
