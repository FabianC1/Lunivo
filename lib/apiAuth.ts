import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import User from "../models/User";
import { parseAuthCookieValue, APP_AUTH_COOKIE } from "./authCookie";
import { connectToDatabase } from "./mongodb";
import { nextAuthOptions } from "./nextAuthOptions";
import { normalizePlanSlug, type SubscriptionPlanSlug } from "./subscriptions";

export type AuthenticatedApiUser = {
  userId: string;
  email: string;
  name: string;
  planSlug: SubscriptionPlanSlug;
};

export function unauthorizedResponse(message = "You need to sign in to continue.") {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function forbiddenResponse(message: string) {
  return NextResponse.json({ error: message }, { status: 403 });
}

export async function getAuthenticatedApiUser(): Promise<AuthenticatedApiUser | null> {
  let candidateUserId: string | undefined;
  let candidateEmail: string | undefined;

  try {
    const oauthSession = await getServerSession(nextAuthOptions);
    if (oauthSession?.user?.email) {
      candidateUserId = (oauthSession.user as { id?: string }).id;
      candidateEmail = oauthSession.user.email.trim().toLowerCase();
    }
  } catch {
    // Keep local-cookie auth working even if the OAuth session is unavailable.
  }

  if (!candidateUserId && !candidateEmail) {
    const cookieStore = await cookies();
    const localSession = parseAuthCookieValue(cookieStore.get(APP_AUTH_COOKIE)?.value);
    if (localSession) {
      candidateUserId = localSession.userId;
      candidateEmail = localSession.email.trim().toLowerCase();
    }
  }

  if (!candidateUserId && !candidateEmail) {
    return null;
  }

  await connectToDatabase();

  const user = candidateUserId
    ? await User.findById(candidateUserId).select("name email planSlug")
    : await User.findOne({ email: candidateEmail }).select("name email planSlug");

  if (!user) {
    return null;
  }

  return {
    userId: String(user._id),
    email: String(user.email).trim().toLowerCase(),
    name: String(user.name),
    planSlug: normalizePlanSlug(user.planSlug),
  };
}