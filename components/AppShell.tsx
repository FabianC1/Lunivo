"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Navbar from "./Navbar";
import PublicNavbar from "./PublicNavbar";
import styles from "./AppShell.module.css";
import { getSession, isLoggedIn, isLogoutPending, setSession } from "../lib/auth";

const AUTH_ROUTES = new Set(["/login", "/register"]);
const PUBLIC_ROUTES = new Set(["/", "/login", "/register", "/about", "/subscriptions", "/terms", "/privacy"]);

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: oauthSession, status: oauthStatus } = useSession();
  const [isReady, setIsReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    if (oauthStatus === "loading") {
      return;
    }

    const logoutPending = isLogoutPending();
    const localSession = isLoggedIn() ? getSession() : null;
    let logged = Boolean(localSession);

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

    if (logoutPending) {
      logged = false;
    }

    setAuthenticated(logged);
    setIsReady(true);

    if (!pathname) {
      return;
    }

    // Public entry stays on /about, but protected routes should go to login.
    if (!logged && !PUBLIC_ROUTES.has(pathname)) {
      router.replace("/login");
      return;
    }

    // Redirect unauthenticated users from / to /about
    if (!logged && pathname === "/") {
      router.replace("/about");
      return;
    }

    // Redirect authenticated users from / and /login/register to /dashboard
    if (logged && (AUTH_ROUTES.has(pathname) || pathname === "/")) {
      router.replace("/dashboard");
    }
  }, [oauthSession, oauthStatus, pathname, router]);

  if (!isReady) {
    return null;
  }

  const isPublicRoute = pathname ? PUBLIC_ROUTES.has(pathname) : true;

  if (!authenticated) {
    if (!isPublicRoute) {
      return null;
    }

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
