"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Navbar from "./Navbar";
import PublicNavbar from "./PublicNavbar";
import PageLoading from "./PageLoading";
import styles from "./AppShell.module.css";
import { getSession, isLoggedIn, isLogoutPending, setSession } from "../lib/auth";

const AUTH_ROUTES = new Set(["/login", "/register"]);
const PUBLIC_ROUTES = new Set(["/", "/login", "/register", "/about", "/subscriptions", "/terms", "/privacy"]);

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: oauthSession, status: oauthStatus } = useSession();

  // Resolve auth state synchronously from localStorage on first render.
  // This prevents the flicker: if a local session exists we know immediately.
  const [authenticated, setAuthenticated] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return !isLogoutPending() && isLoggedIn();
  });
  const [isReady, setIsReady] = useState<boolean>(() => {
    // If we already have a local session we can render immediately.
    if (typeof window === "undefined") return false;
    return !isLogoutPending() && isLoggedIn();
  });

  useEffect(() => {
    // Still waiting for NextAuth — don't override what we already know
    if (oauthStatus === "loading") return;

    const logoutPending = isLogoutPending();
    const localSession = isLoggedIn() ? getSession() : null;
    let logged = Boolean(localSession) && !logoutPending;

    if (!logoutPending && oauthStatus === "authenticated" && oauthSession?.user?.email) {
      const syncedSession = {
        userId: (oauthSession.user as { id?: string }).id,
        email: oauthSession.user.email,
        name: oauthSession.user.name || oauthSession.user.email,
        isDemo: false,
      };

      if (
        !localSession ||
        localSession.isDemo ||
        localSession.email !== syncedSession.email ||
        localSession.userId !== syncedSession.userId ||
        localSession.name !== syncedSession.name
      ) {
        setSession(syncedSession, true);
      }

      logged = true;
    }

    if (logoutPending) logged = false;

    setAuthenticated(logged);
    setIsReady(true);

    if (!pathname) return;

    if (!logged && !PUBLIC_ROUTES.has(pathname)) {
      router.replace("/login");
      return;
    }

    // Unauthenticated users on / go to about (public landing)
    if (!logged && pathname === "/") return;

    // Authenticated users on auth routes or / go to dashboard
    if (logged && (AUTH_ROUTES.has(pathname) || pathname === "/")) {
      router.replace("/dashboard");
    }
  }, [oauthSession, oauthStatus, pathname, router]);

  // Only show loading spinner when:
  // - we have no local session (can't resolve immediately), AND
  // - NextAuth is still loading
  if (!isReady && oauthStatus === "loading") {
    return <PageLoading />;
  }

  // Not ready yet but oauthStatus resolved — run one more tick
  if (!isReady) {
    return <PageLoading />;
  }

  const isPublicRoute = pathname ? PUBLIC_ROUTES.has(pathname) : true;

  if (!authenticated) {
    if (!isPublicRoute) return <PageLoading />;
    return (
      <>
        <PublicNavbar />
        <main className={styles.publicMain}>{children}</main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className={styles.appMain}>{children}</main>
    </>
  );
}
