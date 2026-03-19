import styles from "./profile.module.css";

export default function ProfilePage() {
  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <div className={styles.avatar} aria-hidden="true">
          <svg viewBox="0 0 24 24" className={styles.avatarIcon}>
            <path d="M12 12.2a4.1 4.1 0 1 0 0-8.2 4.1 4.1 0 0 0 0 8.2Zm0 2c-3.92 0-7.1 2.36-7.1 5.26 0 .3.24.54.54.54h13.12c.3 0 .54-.24.54-.54 0-2.9-3.18-5.26-7.1-5.26Z" />
          </svg>
        </div>
        <h1 className={styles.title}>Your Profile</h1>
        <p className={styles.subtitle}>Profile settings are coming next. This page is now wired from the navbar icon.</p>
      </section>
    </main>
  );
}
