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
        <button type="button" className={styles.logout} onClick={handleLogout}>
          Logout
        </button>
      </div>
    </nav>
  );
}
