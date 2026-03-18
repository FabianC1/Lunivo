"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Navbar from "./Navbar";
import PublicNavbar from "./PublicNavbar";
import styles from "./AppShell.module.css";
import { isLoggedIn } from "../lib/auth";

const AUTH_ROUTES = new Set(["/login", "/register"]);
const PUBLIC_ROUTES = new Set(["/", "/login", "/register", "/about", "/subscriptions"]);

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const logged = isLoggedIn();
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
  }, [pathname, router]);

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
