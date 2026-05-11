"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import styles from "./PublicNavbar.module.css";
import ThemeToggle from "./ThemeToggle";
import LunivoLogo from "./LunivoLogo";

export default function PublicNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 40);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function scrollTo(id: string) {
    setMenuOpen(false);
    if (pathname !== "/") {
      // Navigate to home page with the hash; the browser will scroll after load
      router.push(`/#${id}`);
      return;
    }
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <nav className={`${styles.navbar} ${scrolled ? styles.navbarScrolled : styles.navbarTransparent}`}>
      <Link href="/" className={styles.logo} aria-label="Lunivo home">
        <LunivoLogo size="nav" />
      </Link>

      <ul className={`${styles.links} ${menuOpen ? styles.linksOpen : ""}`}>
        <li>
          <button className={styles.navLink} onClick={() => scrollTo("how-it-works")}>
            How it works
          </button>
        </li>
        <li>
          <button className={styles.navLink} onClick={() => scrollTo("pricing")}>
            Pricing
          </button>
        </li>
      </ul>

      <div className={styles.actions}>
        <ThemeToggle buttonClassName={styles.toggle} iconClassName={styles.icon} />
        <Link href="/login" className={styles.login}>Log in</Link>
        <Link href="/register" className={styles.register}>Get Started</Link>
        <button
          className={styles.hamburger}
          aria-label="Toggle menu"
          onClick={() => setMenuOpen((v) => !v)}
        >
          <span className={`${styles.bar} ${menuOpen ? styles.barOpen1 : ""}`} />
          <span className={`${styles.bar} ${menuOpen ? styles.barOpen2 : ""}`} />
          <span className={`${styles.bar} ${menuOpen ? styles.barOpen3 : ""}`} />
        </button>
      </div>
    </nav>
  );
}
