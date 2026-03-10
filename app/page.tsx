import Link from 'next/link';
import styles from './page.module.css';

export default function Home() {
  return (
    <main className={styles.container}>
      <h1>Welcome to Lunivo</h1>
      <p>Your personal finance dashboard in one place.</p>
      <div className={styles.actions}>
        <Link href="/login" className={styles.button}>
          Log In
        </Link>
        <Link href="/register" className={styles.buttonSecondary}>
          Register
        </Link>
      </div>
    </main>
  );
}