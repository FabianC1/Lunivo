"use client";

import styles from "./dashboard.module.css";
import Chart from "../../components/Chart";
import { formatCurrency } from "../../lib/utils";
import { useState } from "react";

const dummyTransactions = [
  { category: "Food", amount: 45.2 },
  { category: "Transport", amount: 12 },
  { category: "Utilities", amount: 100 },
  { category: "Income", amount: 2000 },
  { category: "Other", amount: 60 },
];

export default function Dashboard() {
  const [transactions] = useState(dummyTransactions);

  const totalIncome = transactions
    .filter((t) => t.category === "Income")
    .reduce((sum, t) => sum + t.amount, 0);
  const totalSpending = transactions
    .filter((t) => t.category !== "Income")
    .reduce((sum, t) => sum + t.amount, 0);
  const balance = totalIncome - totalSpending;

  const spendingByCategory: Record<string, number> = {};
  transactions.forEach((t) => {
    if (t.category === "Income") return;
    spendingByCategory[t.category] =
      (spendingByCategory[t.category] || 0) + t.amount;
  });

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Dashboard</h1>
      <div className={styles.summary}>
        <div className={styles.card}>
          <p>Total Income</p>
          <h2>{formatCurrency(totalIncome)}</h2>
        </div>
        <div className={styles.card}>
          <p>Total Spending</p>
          <h2>{formatCurrency(totalSpending)}</h2>
        </div>
        <div className={styles.card}>
          <p>Balance</p>
          <h2>{formatCurrency(balance)}</h2>
        </div>
      </div>
      <div className={styles.chartSection}>
        <h2>Spending by Category</h2>
        <Chart data={spendingByCategory} />
      </div>
    </div>
  );
}