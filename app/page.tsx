import Link from 'next/link';
import styles from './page.module.css';

export default function Home() {
  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <h1>Lunivo</h1>
        <p className={styles.subtitle}>
          A modern personal-finance workspace built to help you track spending,
          monitor trends, and keep budgets under control.
        </p>
        <div className={styles.actions}>
          <Link href="/register" className={styles.buttonPrimary}>
            Create Account
          </Link>
          <Link href="/about" className={styles.buttonSecondary}>
            Learn More
          </Link>
        </div>
      </section>

      <section className={styles.cards}>
        <article className={styles.card}>
          <h2>Explore the product</h2>
          <p>See chart previews and how Lunivo visualizes your money data.</p>
          <Link href="/about" className={styles.cardLink}>View Examples</Link>
        </article>
        <article className={styles.card}>
          <h2>Plans & Pricing</h2>
          <p>Choose the subscription plan that fits your financial goals.</p>
          <Link href="/subscriptions" className={styles.cardLink}>View Plans</Link>
        </article>
      </section>
    </div>
  );
}