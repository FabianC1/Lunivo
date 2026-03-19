"use client";

import Link from "next/link";
import styles from "./Navbar.module.css";
import { usePathname, useRouter } from "next/navigation";
import { clearSession } from "../lib/auth";
import ThemeToggle from "./ThemeToggle";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    clearSession();
    router.replace("/login");
  };

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
        <ThemeToggle buttonClassName={styles.toggle} iconClassName={styles.icon} />
        <Link
          href="/profile"
          className={`${styles.profileButton} ${pathname === "/profile" ? styles.profileButtonActive : ""}`}
          aria-label="Open profile"
          title="Profile"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.profileIcon}>
            <path d="M12 12.2a4.1 4.1 0 1 0 0-8.2 4.1 4.1 0 0 0 0 8.2Zm0 2c-3.92 0-7.1 2.36-7.1 5.26 0 .3.24.54.54.54h13.12c.3 0 .54-.24.54-.54 0-2.9-3.18-5.26-7.1-5.26Z" />
          </svg>
        </Link>
        <button type="button" className={styles.logout} onClick={handleLogout}>
          Logout
        </button>
      </div>
    </nav>
  );
}
