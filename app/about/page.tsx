"use client";

import Chart from "../../components/Chart";
import BudgetComparisonChart from "../../components/BudgetComparisonChart";
import styles from "./about.module.css";

const pieExample = {
  Food: 380,
  Transport: 120,
  Utilities: 220,
  Entertainment: 175,
  Other: 95,
};

const monthlyActivity = {
  Jan: 1240,
  Feb: 1380,
  Mar: 1290,
  Apr: 1510,
  May: 1420,
  Jun: 1675,
};

const budgets = {
  Food: 400,
  Transport: 160,
  Utilities: 200,
  Entertainment: 150,
  Other: 100,
};

export default function AboutPage() {
  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroLeft}>
          <h1>About Lunivo</h1>
          <p>
            Lunivo is a modern personal-finance workspace built to help you track spending,
            monitor monthly trends, and keep budgets under control. It includes multi-account
            support, recurring subscriptions, interactive reports, secure authentication, and
            full profile settings for managing your regional preferences.
          </p>
          <div className={styles.heroActions}>
            <a href="/register" className={styles.primaryCta}>
              Create your account
            </a>
            <a href="/login" className={styles.secondaryCta}>
              Log in
            </a>
          </div>
        </div>

        <div className={styles.heroRight}>
          <h2>Everything in one place</h2>
          <ul className={styles.heroFeatures}>
            <li>Dashboard with income, spending &amp; net overview</li>
            <li>Budget planning per category with visual comparisons</li>
            <li>Transaction log with filtering and history</li>
            <li>Subscription &amp; recurring cost tracking</li>
            <li>Reports: bar, line, and trend charts</li>
            <li>Multi-account support (Main + Savings)</li>
            <li>Secure signup, login, and bcrypt-hashed passwords</li>
            <li>Profile with timezone, country &amp; currency preferences</li>
          </ul>
        </div>
      </section>

      <section className={styles.highlights}>
        <article className={styles.highlightCard}>
          <h2>Built for Real Budgeting</h2>
          <p>
            Plan by category, compare budget versus actual spending, and adjust quickly when a
            category goes off-track.
          </p>
        </article>
        <article className={styles.highlightCard}>
          <h2>Multiple Accounts</h2>
          <p>
            Keep your Main Account and Savings separate, monitor balances clearly, and prepare
            for adding more account types over time.
          </p>
        </article>
        <article className={styles.highlightCard}>
          <h2>Transaction Visibility</h2>
          <p>
            Log income and expenses in one place, organize by category, and use dashboard trends
            to understand where your money is going.
          </p>
        </article>
      </section>

      <section className={styles.grid}>
        <article className={styles.card}>
          <h2>Spending Breakdown (Pie)</h2>
          <p>Visualize where your money goes across categories.</p>
          <div className={styles.chartFrame}>
            <Chart data={pieExample} type="doughnut" />
          </div>
        </article>

        <article className={styles.card}>
          <h2>Monthly Activity</h2>
          <p>Track spending movement over time with trend lines.</p>
          <div className={styles.chartFrame}>
            <Chart data={monthlyActivity} type="line" />
          </div>
        </article>
      </section>

      <section className={styles.card}>
        <h2>Budget vs Spendings</h2>
        <p>Compare each category budget against actual spending.</p>
        <div className={styles.chartFrameLarge}>
          <BudgetComparisonChart spendings={pieExample} budgets={budgets} />
        </div>
      </section>

      <section className={styles.grid}>
        <article className={styles.card}>
          <h2>What You Can Manage in Lunivo</h2>
          <ul className={styles.featureList}>
            <li>Income tracking and transaction history</li>
            <li>Category-based budgeting with comparisons</li>
            <li>Subscriptions monitoring and recurring costs</li>
            <li>Reports for trends, totals, and budgeting behavior</li>
            <li>Profile settings: password, notifications, preferences</li>
          </ul>
        </article>

        <article className={styles.card}>
          <h2>Security and Access</h2>
          <ul className={styles.featureList}>
            <li>Database-backed signup and login</li>
            <li>Password hashing with bcrypt</li>
            <li>Session-based account experience</li>
            <li>Demo fallback access for uptime resilience</li>
            <li>Privacy and terms pages for transparent policies</li>
          </ul>
        </article>
      </section>

      <section className={styles.card}>
        <h2>How People Use Lunivo</h2>
        <div className={styles.steps}>
          <div className={styles.step}>
            <span>1</span>
            <p>Create an account and start with default accounts already set up.</p>
          </div>
          <div className={styles.step}>
            <span>2</span>
            <p>Add income, spending, and budgets to build a full monthly picture.</p>
          </div>
          <div className={styles.step}>
            <span>3</span>
            <p>Review charts and reports weekly to spot patterns and improve decisions.</p>
          </div>
          <div className={styles.step}>
            <span>4</span>
            <p>Fine-tune notifications, currency, timezone, and profile security settings.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
