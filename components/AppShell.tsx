"use client";

import { usePathname } from "next/navigation";
import Navbar from "./Navbar";
import styles from "./AppShell.module.css";

const AUTH_ROUTES = new Set(["/login", "/register"]);

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthRoute = pathname ? AUTH_ROUTES.has(pathname) : false;

  return (
    <>
      {!isAuthRoute && <Navbar />}
      <main className={isAuthRoute ? styles.authMain : styles.appMain}>{children}</main>
    </>
  );
}
