"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./PublicNavbar.module.css";
import ThemeToggle from "./ThemeToggle";

export default function PublicNavbar() {
  const pathname = usePathname();

  return (
    <nav className={styles.navbar}>
      <Link href="/" className={styles.logo}>Lunivo</Link>
      <ul className={styles.links}>
        <li>
          <Link href="/about" className={pathname === "/about" ? styles.active : ""}>About</Link>
        </li>
        <li>
          <Link href="/subscriptions" className={pathname === "/subscriptions" ? styles.active : ""}>Subscriptions</Link>
        </li>
      </ul>
      <div className={styles.actions}>
        <ThemeToggle buttonClassName={styles.toggle} iconClassName={styles.icon} />
        <Link href="/login" className={styles.login}>Log in</Link>
        <Link href="/register" className={styles.register}>Register</Link>
      </div>
    </nav>
  );
}
