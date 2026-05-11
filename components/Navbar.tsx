"use client";

import Link from "next/link";
import styles from "./Navbar.module.css";
import { usePathname } from "next/navigation";
import ThemeToggle from "./ThemeToggle";
import LunivoLogo from "./LunivoLogo";

export default function Navbar() {
  const pathname = usePathname();
  const isEventsRoute = pathname === '/events' || pathname?.startsWith('/events/');

  return (
    <nav className={styles.navbar}>
      <Link href="/dashboard" className={styles.logo} aria-label="Lunivo dashboard">
        <LunivoLogo size="nav" />
      </Link>
      <ul className={styles.links}>
        <li>
          <Link href="/dashboard" className={pathname === '/dashboard' ? styles.active : ''}>Dashboard</Link>
        </li>
        <li>
          <Link href="/events" className={isEventsRoute ? styles.active : ''}>My Events</Link>
        </li>
        <li>
          <Link href="/insights" className={pathname === '/insights' ? styles.active : ''}>Insights</Link>
        </li>
        <li>
          <Link href="/subscriptions" className={pathname === '/subscriptions' ? styles.active : ''}>Plans &amp; Pricing</Link>
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
      </div>
    </nav>
  );
}
