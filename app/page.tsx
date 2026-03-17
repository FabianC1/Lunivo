import Link from 'next/link';
import styles from './page.module.css';

export default function Home() {
  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <p className={styles.badge}>UK-focused personal finance</p>
        <h1>Money clarity for everyday life</h1>
        <p className={styles.subtitle}>
          Lunivo helps you track income, analyze spendings, and compare budgets with clear charts.
          Sign up to unlock your full private dashboard.
        </p>
        <div className={styles.actions}>
          <Link href="/register" className={styles.buttonPrimary}>
            Create free account
          </Link>
          <Link href="/login" className={styles.buttonSecondary}>
            Log in
          </Link>
        </div>
      </section>

      <section className={styles.cards}>
        <article className={styles.card}>
          <h2>Explore the product</h2>
          <p>See chart previews and how Lunivo visualizes your money data.</p>
          <Link href="/about" className={styles.cardLink}>Visit About</Link>
        </article>
        <article className={styles.card}>
          <h2>Subscriptions</h2>
          <p>Compare our 3 tiers and choose the plan that fits your goals.</p>
          <Link href="/subscriptions" className={styles.cardLink}>View Plans</Link>
        </article>
      </section>
    </div>
  );
}