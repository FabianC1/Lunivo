import Link from "next/link";
import styles from "./terms.module.css";

export const metadata = {
  title: "Terms of Service — Lunivo",
};

export default function TermsPage() {
  return (
    <div className={styles.page}>
      <Link href="/register" className={styles.backButton}>
        &larr; Back to registration
      </Link>

      <header className={styles.header}>
        <h1>Terms of Service</h1>
        <p className={styles.meta}>Last updated: March 2026 &mdash; Placeholder draft, subject to change.</p>
      </header>

      <section className={styles.section}>
        <h2>1. Introduction</h2>
        <p>
          Welcome to Lunivo. By creating an account or using this service you agree to be bound by
          these Terms of Service (&ldquo;Terms&rdquo;). Please read them carefully. If you do not agree,
          you must not use Lunivo.
        </p>
        <p>
          Lunivo is a personal-finance management tool that lets you log income and spending,
          set budgets, and view trends. It is intended for personal, non-commercial use.
        </p>
      </section>

      <section className={styles.section}>
        <h2>2. Account Registration</h2>
        <p>
          You must provide accurate information when creating your account. You are responsible
          for maintaining the confidentiality of your credentials and for all activity that occurs
          under your account. Notify us immediately if you become aware of any unauthorised access.
        </p>
        <p>
          You must be at least 18 years old to use Lunivo. By registering, you confirm that you
          meet this requirement.
        </p>
      </section>

      <section className={styles.section}>
        <h2>3. Your Financial Data</h2>
        <p>
          All financial data you enter — transactions, budgets, income — is stored locally in your
          browser by default. Lunivo does not automatically transmit this data to external servers
          unless you explicitly enable cloud sync features (when available).
        </p>
        <p>
          You retain full ownership of the data you enter. We do not sell, share, or use your
          financial data for advertising purposes.
        </p>
      </section>

      <section className={styles.section}>
        <h2>4. Acceptable Use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Use Lunivo for any unlawful or fraudulent purpose</li>
          <li>Attempt to gain unauthorised access to any part of the service or others&apos; accounts</li>
          <li>Reverse-engineer, decompile, or copy any part of Lunivo</li>
          <li>Use automated scripts or bots to interact with the service</li>
          <li>Submit false or misleading information</li>
        </ul>
      </section>

      <section className={styles.section}>
        <h2>5. Disclaimer of Warranties</h2>
        <p>
          Lunivo is provided &ldquo;as is&rdquo; without warranties of any kind. We do not guarantee
          that the service will be uninterrupted, error-free, or completely secure. This is an
          early-stage product and features may change or be removed without notice.
        </p>
        <p>
          Nothing in Lunivo constitutes financial, investment, or legal advice. Always consult a
          qualified professional for decisions regarding your finances.
        </p>
      </section>

      <section className={styles.section}>
        <h2>6. Limitation of Liability</h2>
        <p>
          To the fullest extent permitted by law, Lunivo and its developers shall not be liable
          for any indirect, incidental, special, or consequential damages arising from your
          use (or inability to use) the service, including loss of data or financial loss.
        </p>
      </section>

      <section className={styles.section}>
        <h2>7. Changes to These Terms</h2>
        <p>
          We may update these Terms as the product evolves. When we do, the &ldquo;Last updated&rdquo; date
          at the top of this page will change. Continued use of Lunivo after changes are posted
          constitutes your acceptance of the revised Terms.
        </p>
      </section>

      <section className={styles.section}>
        <h2>8. Contact</h2>
        <p>
          If you have questions about these Terms, please get in touch at{" "}
          <a href="mailto:support@lunivo.app" className={styles.contactLink}>support@lunivo.app</a>.
        </p>
      </section>
    </div>
  );
}
