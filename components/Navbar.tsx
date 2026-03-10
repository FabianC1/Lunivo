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
        <button
          onClick={toggleTheme}
          className={styles.toggle}
          aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
        >
          {theme === "light" ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className={styles.icon}
            >
              <path
                d="M12 2a1 1 0 011 1v2a1 1 0 11-2 0V3a1 1 0 011-1zM12 19a1 1 0 011 1v2a1 1 0 11-2 0v-2a1 1 0 011-1zM4.22 4.22a1 1 0 011.415 0l1.414 1.415a1 1 0 11-1.414 1.414L4.22 5.636a1 1 0 010-1.415zM17.95 17.95a1 1 0 011.414 0l1.415 1.414a1 1 0 01-1.415 1.415l-1.414-1.415a1 1 0 010-1.414zM2 12a1 1 0 011-1h2a1 1 0 110 2H3a1 1 0 01-1-1zM19 11a1 1 0 100 2h2a1 1 0 100-2h-2zM4.22 19.78a1 1 0 011.415-1.415l1.414 1.415a1 1 0 01-1.414 1.414l-1.415-1.414a1 1 0 010-1.415zM17.95 6.05a1 1 0 011.414-1.414l1.415 1.415a1 1 0 01-1.415 1.414L17.95 6.05z"
              />
              <path
                d="M12 6a6 6 0 100 12 6 6 0 000-12z"
              />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className={styles.icon}
            >
              <path
                d="M21.752 15.002A9 9 0 0112 3v0a1 1 0 000 2 7 7 0 107.752 7.752 1 1 0 002 0z"
              />
            </svg>
          )}
        </button>
        <Link href="/login" className={styles.logout}>
          Logout
        </Link>
      </div>
    </nav>
  );
}