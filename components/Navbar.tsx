"use client";

import Image from "next/image";
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
          <Image
            src={theme === "light" ? "/icons/light.png" : "/icons/dark.png"}
            alt=""
            aria-hidden="true"
            width={22}
            height={22}
            className={styles.icon}
          />
        </button>
        <button type="button" className={styles.logout} onClick={handleLogout}>
          Logout
        </button>
      </div>
    </nav>
  );
}
