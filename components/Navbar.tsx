"use client";

import Link from "next/link";
import styles from "./Navbar.module.css";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { clearSession } from "../lib/auth";

export default function Navbar() {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    let initialTheme: "light" | "dark" = "light";
    if (saved === "light" || saved === "dark") {
      initialTheme = saved;
    } else {
      const prefers = window.matchMedia("(prefers-color-scheme: dark)").matches;
      initialTheme = prefers ? "dark" : "light";
    }
    setTheme(initialTheme);
    setMounted(true);
  }, []);

  const handleToggle = () => {
    const currentTheme = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
    const newTheme = currentTheme === "light" ? "dark" : "light";
    setTheme(newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
  };

  const handleLogout = () => {
    clearSession();
    router.replace("/login");
  };

  if (!mounted) {
    return <nav className={styles.navbar}><div className={styles.logo}>Lunivo</div></nav>;
  }

  return (
    <nav className={styles.navbar}>
      <div className={styles.logo}>Lunivo</div>
      <ul className={styles.links}>
        <li>
          <Link href="/dashboard" className={pathname === '/dashboard' ? styles.active : ''}>Dashboard</Link>
        </li>
        <li>
          <Link href="/income" className={pathname === '/income' ? styles.active : ''}>Income</Link>
        </li>
        <li>
          <Link href="/budgets" className={pathname === '/budgets' ? styles.active : ''}>Budget</Link>
        </li>
        <li>
          <Link href="/transactions" className={pathname === '/transactions' ? styles.active : ''}>Spendings</Link>
        </li>
        <li>
          <Link href="/reports" className={pathname === '/reports' ? styles.active : ''}>Insights</Link>
        </li>
      </ul>
      <div className={styles.actions}>
        <button
          onClick={handleToggle}
          className={styles.toggle}
          aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
        >
          {theme === "light" ? (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={styles.icon}>
              <path d="M12 2a1 1 0 011 1v2a1 1 0 11-2 0V3a1 1 0 011-1zM12 19a1 1 0 011 1v2a1 1 0 11-2 0v-2a1 1 0 011-1zM4.22 4.22a1 1 0 011.415 0l1.414 1.415a1 1 0 11-1.414 1.414L4.22 5.636a1 1 0 010-1.415zM17.95 17.95a1 1 0 011.414 0l1.415 1.414a1 1 0 01-1.415 1.415l-1.414-1.415a1 1 0 010-1.414zM2 12a1 1 0 011-1h2a1 1 0 110 2H3a1 1 0 01-1-1zM19 11a1 1 0 100 2h2a1 1 0 100-2h-2zM4.22 19.78a1 1 0 011.415-1.415l1.414 1.415a1 1 0 01-1.414 1.414l-1.415-1.414a1 1 0 010-1.415zM17.95 6.05a1 1 0 011.414-1.414l1.415 1.415a1 1 0 01-1.415 1.414L17.95 6.05z" />
              <path d="M12 6a6 6 0 100 12 6 6 0 000-12z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={styles.icon}>
              <path d="M21.752 15.002A9 9 0 0112 3v0a1 1 0 000 2 7 7 0 107.752 7.752 1 1 0 002 0z" />
            </svg>
          )}
        </button>
        <button type="button" className={styles.logout} onClick={handleLogout}>
          Logout
        </button>
      </div>
    </nav>
  );
}
