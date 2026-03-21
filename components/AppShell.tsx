"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Navbar from "./Navbar";
import PublicNavbar from "./PublicNavbar";
import styles from "./AppShell.module.css";
import { isLoggedIn, setSession } from "../lib/auth";

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

    let logged = isLoggedIn();

    if (!logged && oauthStatus === "authenticated" && oauthSession?.user?.email) {
      setSession(
        {
          userId: (oauthSession.user as { id?: string }).id,
          email: oauthSession.user.email,
          name: oauthSession.user.name || oauthSession.user.email,
          isDemo: false,
        },
        true
      );
      logged = true;
    }

    setAuthenticated(logged);
    setIsReady(true);

    if (!pathname) {
      return;
    }

    // Redirect unauthenticated users to /about instead of /login
    if (!logged && !PUBLIC_ROUTES.has(pathname)) {
      router.replace("/about");
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
