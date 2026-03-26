export const DEMO_EMAIL = "galaselfabian@gmail.com";
export const DEMO_PASSWORD = "Elissa<3";
export const DEMO_NAME = "Fabian Galasel";

const SESSION_KEY = "lunivo-session";
const SESSION_PREFERENCE_KEY = "lunivo-session-preference";
const LOGOUT_PENDING_KEY = "lunivo-logout-pending";

export interface AuthSession {
  userId?: string;
  email: string;
  name: string;
  isDemo: boolean;
}

function isBrowser() {
  return typeof window !== "undefined";
}

function isValid(parsed: unknown): parsed is AuthSession {
  if (!parsed || typeof parsed !== "object") return false;
  const p = parsed as Record<string, unknown>;
  return (
    typeof p.email === "string" &&
    typeof p.name === "string" &&
    typeof p.isDemo === "boolean" &&
    (typeof p.userId === "string" || typeof p.userId === "undefined")
  );
}

function getStoredSessionPreference(): boolean | null {
  if (!isBrowser()) return null;
  const storedPreference = localStorage.getItem(SESSION_PREFERENCE_KEY);
  if (storedPreference === "persistent") return true;
  if (storedPreference === "session") return false;
  if (localStorage.getItem(SESSION_KEY)) return true;
  if (sessionStorage.getItem(SESSION_KEY)) return false;
  return null;
}

export function getSession(): AuthSession | null {
  if (!isBrowser()) return null;

  const storedPreference = localStorage.getItem(SESSION_PREFERENCE_KEY);

  // Check persistent storage first, then fallback to session-only storage
  const raw =
    storedPreference === "persistent"
      ? localStorage.getItem(SESSION_KEY)
      : storedPreference === "session"
        ? sessionStorage.getItem(SESSION_KEY)
        : localStorage.getItem(SESSION_KEY) ?? sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    return isValid(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function setSession(session: AuthSession, remember?: boolean) {
  if (!isBrowser()) return;

  const value = JSON.stringify(session);
  const shouldRemember = remember ?? getStoredSessionPreference() ?? true;

  localStorage.removeItem(LOGOUT_PENDING_KEY);

  if (shouldRemember) {
    localStorage.setItem(SESSION_KEY, value);
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.setItem(SESSION_PREFERENCE_KEY, "persistent");
  } else {
    sessionStorage.setItem(SESSION_KEY, value);
    localStorage.removeItem(SESSION_KEY);
    localStorage.setItem(SESSION_PREFERENCE_KEY, "session");
  }
}

export function clearSession() {
  if (!isBrowser()) return;

  localStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(SESSION_PREFERENCE_KEY);
}

export function markLogoutPending() {
  if (!isBrowser()) return;
  localStorage.setItem(LOGOUT_PENDING_KEY, String(Date.now()));
}

export function clearLogoutPending() {
  if (!isBrowser()) return;
  localStorage.removeItem(LOGOUT_PENDING_KEY);
}

export function isLogoutPending() {
  if (!isBrowser()) return false;
  return localStorage.getItem(LOGOUT_PENDING_KEY) !== null;
}

export function isLoggedIn() {
  return Boolean(getSession());
}
