export const DEMO_EMAIL = "galaselfabian@gmail.com";
export const DEMO_PASSWORD = "Elissa<3";
export const DEMO_NAME = "Fabian";

const SESSION_KEY = "lunivo-session";

export interface AuthSession {
  userId?: string;
  email: string;
  name: string;
  isDemo: boolean;
}

function isBrowser() {
  return typeof window !== "undefined";
}

export function getSession(): AuthSession | null {
  if (!isBrowser()) {
    return null;
  }

  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    if (
      typeof parsed?.email === "string" &&
      typeof parsed?.name === "string" &&
      typeof parsed?.isDemo === "boolean" &&
      (typeof parsed?.userId === "string" || typeof parsed?.userId === "undefined")
    ) {
      return parsed as AuthSession;
    }

    return null;
  } catch {
    return null;
  }
}

export function setSession(session: AuthSession) {
  if (!isBrowser()) {
    return;
  }

  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  if (!isBrowser()) {
    return;
  }

  localStorage.removeItem(SESSION_KEY);
}

export function isLoggedIn() {
  return Boolean(getSession());
}
