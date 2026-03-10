"use client";

import Link from "next/link";
import { useTheme } from "./ThemeProvider";
import styles from "./Navbar.module.css";

export default function Navbar() {
  const { theme, toggleTheme } = useTheme();

  return (
    <nav className={styles.navbar}>
      <div className={styles.logo}>Lunivo</div>
      <ul className={styles.links}>
        <li>
          <Link href="/dashboard">Dashboard</Link>
        </li>
        <li>
          <Link href="/transactions">Transactions</Link>
        </li>
      </ul>
      <div className={styles.actions}>
        <button onClick={toggleTheme} className={styles.toggle} aria-label="Toggle dark mode">
          {theme === "light" ? "🌙" : "☀️"}
        </button>
        <Link href="/login" className={styles.logout}>
          Logout
        </Link>
      </div>
    </nav>
  );
}