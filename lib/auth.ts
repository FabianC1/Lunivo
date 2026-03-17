export const DEMO_EMAIL = "galaselfabian@gmail.com";
export const DEMO_PASSWORD = "Elissa<3";

const SESSION_KEY = "lunivo-session";
const USERS_KEY = "lunivo-local-users";

interface StoredUser {
  name: string;
  email: string;
  password: string;
  createdAt: string;
}

export interface AuthSession {
  email: string;
  name: string;
  isDemo: boolean;
}

function isBrowser() {
  return typeof window !== "undefined";
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function readUsers(): StoredUser[] {
  if (!isBrowser()) {
    return [];
  }

  const raw = localStorage.getItem(USERS_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((item): item is StoredUser => {
      return (
        typeof item?.name === "string" &&
        typeof item?.email === "string" &&
        typeof item?.password === "string" &&
        typeof item?.createdAt === "string"
      );
    });
  } catch {
    return [];
  }
}

function writeUsers(users: StoredUser[]) {
  if (!isBrowser()) {
    return;
  }

  localStorage.setItem(USERS_KEY, JSON.stringify(users));
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
      typeof parsed?.isDemo === "boolean"
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

export function registerUser(input: {
  name: string;
  email: string;
  password: string;
}): { ok: boolean; error?: string } {
  const name = input.name.trim();
  const email = normalizeEmail(input.email);

  if (!name || !email || !input.password) {
    return { ok: false, error: "Please fill in all fields." };
  }

  if (email === normalizeEmail(DEMO_EMAIL)) {
    return { ok: false, error: "This email is reserved for the demo account." };
  }

  const users = readUsers();
  const exists = users.some((user) => normalizeEmail(user.email) === email);
  if (exists) {
    return { ok: false, error: "An account with this email already exists." };
  }

  users.push({
    name,
    email,
    password: input.password,
    createdAt: new Date().toISOString(),
  });

  writeUsers(users);
  return { ok: true };
}

export function loginUser(input: {
  email: string;
  password: string;
}): { ok: boolean; error?: string; session?: AuthSession } {
  const email = normalizeEmail(input.email);

  if (!email || !input.password) {
    return { ok: false, error: "Please enter email and password." };
  }

  if (email === normalizeEmail(DEMO_EMAIL) && input.password === DEMO_PASSWORD) {
    return {
      ok: true,
      session: {
        email: DEMO_EMAIL,
        name: "Fabian",
        isDemo: true,
      },
    };
  }

  const users = readUsers();
  const user = users.find(
    (candidate) =>
      normalizeEmail(candidate.email) === email && candidate.password === input.password
  );

  if (!user) {
    return { ok: false, error: "Invalid email or password." };
  }

  return {
    ok: true,
    session: {
      email: user.email,
      name: user.name,
      isDemo: false,
    },
  };
}
