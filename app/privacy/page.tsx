import Link from "next/link";
import styles from "./privacy.module.css";

export const metadata = {
  title: "Privacy Policy — Lunivo",
};

export default function PrivacyPage() {
  return (
    <div className={styles.page}>
      <Link href="/register" className={styles.backButton}>
        &larr; Back to registration
      </Link>

      <header className={styles.header}>
        <h1>Privacy Policy</h1>
        <p className={styles.meta}>Last updated: March 2026 &mdash; Placeholder draft, subject to change.</p>
      </header>

      <section className={styles.section}>
        <h2>1. Overview</h2>
        <p>
          Lunivo (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;) is committed to protecting your privacy. This policy
          explains what information we collect, how we use it, and your rights regarding it.
        </p>
        <p>
          This is a concise pre-launch policy for the current product. It reflects the core way
          Lunivo stores account and finance data today and will be expanded as billing and support
          operations are finalized.
        </p>
      </section>

      <section className={styles.section}>
        <h2>2. Information We Collect</h2>
        <p>We collect the minimum necessary to provide the service:</p>
        <ul>
          <li>
            <strong>Account data</strong> — your name and email address provided at registration
          </li>
          <li>
            <strong>Financial data</strong> — income and spending entries, budgets, and categories
            that you enter manually. This data is stored in Lunivo&apos;s database for signed-in
            accounts and may remain in local storage for demo-mode experiences.
          </li>
          <li>
            <strong>Preference data</strong> — theme (light/dark) and similar UI settings stored
            in your browser&apos;s local storage, plus account-level profile preferences stored on
            our servers when you are signed in
          </li>
          <li>
            <strong>Usage data</strong> — basic anonymous analytics (page views, feature usage)
            may be collected in future to improve the product. You will be informed before this
            is enabled.
          </li>
        </ul>
      </section>

      <section className={styles.section}>
        <h2>3. How We Use Your Information</h2>
        <p>Your information is used solely to:</p>
        <ul>
          <li>Authenticate you and manage your account</li>
          <li>Display your financial data back to you within the app</li>
          <li>Improve the reliability and features of Lunivo</li>
          <li>Respond to support requests you initiate</li>
        </ul>
        <p>
          We do <strong>not</strong> use your financial data for advertising, profiling, or
          sale to third parties.
        </p>
      </section>

      <section className={styles.section}>
        <h2>4. Data Storage &amp; Security</h2>
        <p>
          For registered accounts, Lunivo stores account records, profile settings, budgets,
          goals, and transaction history in its application database so that your information
          can persist across devices and sessions.
        </p>
        <p>
          Account credentials are hashed before storage, and authenticated sessions use signed
          session cookies and provider-backed session tokens where applicable. We apply reasonable
          technical measures to protect data in transit and at rest, though no internet-based
          service can guarantee absolute security.
        </p>
      </section>

      <section className={styles.section}>
        <h2>5. Cookies &amp; Local Storage</h2>
        <p>
          Lunivo uses signed cookies for authenticated sessions and may use local storage for UI
          preferences, demo data, and device-side experience settings. We do not currently use
          advertising or cross-site tracking cookies.
        </p>
      </section>

      <section className={styles.section}>
        <h2>6. Third Parties</h2>
        <p>
          We do not sell or share your personal data with third parties for marketing.
          We may use service providers (such as hosting or analytics platforms) who process
          data on our behalf and are bound by appropriate data-protection agreements.
        </p>
      </section>

      <section className={styles.section}>
        <h2>7. Your Rights</h2>
        <p>You have the right to:</p>
        <ul>
          <li>Access the personal data we hold about you</li>
          <li>Request correction of inaccurate data</li>
          <li>Request deletion of your account and associated data</li>
          <li>Object to or restrict certain processing</li>
          <li>Data portability (export of your data in a readable format)</li>
        </ul>
        <p>
          To exercise any of these rights, contact us at the email below. We aim to respond
          within 30 days.
        </p>
      </section>

      <section className={styles.section}>
        <h2>8. Children</h2>
        <p>
          Lunivo is not intended for users under 18 years of age. We do not knowingly collect
          data from minors.
        </p>
      </section>

      <section className={styles.section}>
        <h2>9. Changes to This Policy</h2>
        <p>
          This policy will be updated when Lunivo reaches a public release. The &ldquo;Last updated&rdquo;
          date at the top will reflect any changes. Significant changes will be highlighted in
          the app.
        </p>
      </section>

      <section className={styles.section}>
        <h2>10. Contact</h2>
        <p>
          For any privacy-related questions or requests, contact us at{" "}
          <a href="mailto:privacy@lunivo.app" className={styles.contactLink}>privacy@lunivo.app</a>.
        </p>
      </section>
    </div>
  );
}
