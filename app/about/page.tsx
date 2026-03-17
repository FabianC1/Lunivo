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
        <h1>About Lunivo</h1>
        <p>
          Lunivo is a modern personal-finance workspace built to help you track spending,
          monitor monthly trends, and keep budgets under control.
        </p>
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
    </div>
  );
}
