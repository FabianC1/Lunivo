import crypto from "crypto";
import type { NextResponse } from "next/server";

export const APP_AUTH_COOKIE = "lunivo-auth";

type CookieSessionPayload = {
  userId: string;
  email: string;
  name: string;
  issuedAt: number;
};

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function getCookieSecret() {
  return process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || "lunivo-dev-session-secret";
}

function sign(encodedPayload: string) {
  return crypto.createHmac("sha256", getCookieSecret()).update(encodedPayload).digest("base64url");
}

export function buildAuthCookieValue(session: Omit<CookieSessionPayload, "issuedAt">) {
  const payload: CookieSessionPayload = {
    ...session,
    issuedAt: Date.now(),
  };

  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

export function parseAuthCookieValue(rawValue?: string | null) {
  if (!rawValue) {
    return null;
  }

  const [encodedPayload, providedSignature] = rawValue.split(".");
  if (!encodedPayload || !providedSignature) {
    return null;
  }

  const expectedSignature = sign(encodedPayload);
  if (providedSignature !== expectedSignature) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as Partial<CookieSessionPayload>;
    if (
      typeof parsed.userId !== "string" ||
      typeof parsed.email !== "string" ||
      typeof parsed.name !== "string" ||
      typeof parsed.issuedAt !== "number"
    ) {
      return null;
    }

    return parsed as CookieSessionPayload;
  } catch {
    return null;
  }
}

export function setAuthSessionCookie(
  response: NextResponse,
  session: Omit<CookieSessionPayload, "issuedAt">,
) {
  response.cookies.set(APP_AUTH_COOKIE, buildAuthCookieValue(session), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS,
  });
}

export function clearAuthSessionCookie(response: NextResponse) {
  response.cookies.set(APP_AUTH_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  });
}