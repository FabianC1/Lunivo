"use client";

import { useState } from "react";
import styles from "./income.module.css";
import TransactionForm from "../../components/TransactionForm";
import Chart from "../../components/Chart";
import IncomeTrendChart from "../../components/IncomeTrendChart";
import { formatCurrency, formatDate } from "../../lib/utils";

interface Transaction {
  id: number;
  date: string;
  description: string;
  category: string;
  amount: number;
}

const INCOME_SOURCES = ["Salary", "Side project", "Freelance", "Bonus", "Investment", "Gift", "Other"];

// Full-year monthly income for the bar chart (2026 data matching dashboard)
const MONTHLY_INCOME: Record<string, number> = {
  Jan: 3000, Feb: 3080, Mar: 3150, Apr: 3220,
  May: 3320, Jun: 3400, Jul: 3360, Aug: 3440,
  Sep: 3480, Oct: 3560, Nov: 3620, Dec: 3740,
};

const dummy: Transaction[] = [
  { id: 1, date: "2026-01-15", description: "Main payroll",     category: "Salary",       amount: 3000 },
  { id: 2, date: "2026-01-22", description: "Client website",   category: "Side project", amount:  400 },
  { id: 3, date: "2026-02-15", description: "Monthly payroll",  category: "Salary",       amount: 3080 },
  { id: 4, date: "2026-03-10", description: "Design retainer",  category: "Freelance",    amount:  750 },
  { id: 5, date: "2026-03-15", description: "Monthly payroll",  category: "Salary",       amount: 3000 },
];

export default function Income() {
  const [transactions, setTransactions] = useState<Transaction[]>(dummy);
  const [showForm, setShowForm] = useState(false);

  function addTransaction(data: Omit<Transaction, "id">) {
    const next: Transaction = { id: Date.now(), ...data };
    setTransactions((prev) => [...prev, next]);
    setShowForm(false);
  }

  // KPI stats
  const totalIncome   = transactions.reduce((s, t) => s + t.amount, 0);
  const sourceBreakdown = transactions.reduce((totals, t) => {
    const source = t.category.trim() || "Other";
    totals[source] = (totals[source] ?? 0) + t.amount;
    return totals;
  }, {} as Record<string, number>);
  const largestSource   = Object.entries(sourceBreakdown).sort(([, a], [, b]) => b - a)[0];
  const monthCount      = new Set(transactions.map((t) => t.date.slice(0, 7))).size;
  const monthlyAvg      = monthCount > 0 ? totalIncome / monthCount : 0;
  const projectedAnnual = monthlyAvg * 12;

  const incomeTrendPoints = [...transactions]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((t) => ({ date: t.date, amount: t.amount }));

  return (
    <div className={styles.container + " container"}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>Income</h1>
          <p className={styles.subtitle}>Understand where your money comes from and how it grows.</p>
        </div>
      </div>

      <div className={styles.kpiGrid}>
        <article className={styles.kpiCard}>
          <p>Total Income</p>
          <h3>{formatCurrency(totalIncome)}</h3>
          <span>Across all entries</span>
        </article>
        <article className={styles.kpiCard}>
          <p>Largest Source</p>
          <h3>{largestSource ? largestSource[0] : "—"}</h3>
          <span>{largestSource ? formatCurrency(largestSource[1]) : "No data"}</span>
        </article>
        <article className={styles.kpiCard}>
          <p>Monthly Average</p>
          <h3>{formatCurrency(monthlyAvg)}</h3>
          <span>Over {monthCount} month{monthCount === 1 ? "" : "s"}</span>
        </article>
        <article className={styles.kpiCard}>
          <p>Projected Annual</p>
          <h3>{formatCurrency(projectedAnnual)}</h3>
          <span>Based on avg monthly</span>
        </article>
      </div>

      <section className={styles.entriesSection}>
        <div className={styles.tableHeader}>
          <div>
            <h2 className={styles.tableTitle}>Income Entries</h2>
            <p className={styles.tableSubtitle}>Add new income records and review them right where you manage them.</p>
          </div>
          <button className={styles.addButton} onClick={() => setShowForm(true)}>
            + Add Income
          </button>
        </div>

        {showForm && (
          <div className={styles.formWrapper}>
            <TransactionForm
              onSubmit={(data) => addTransaction(data)}
              onCancel={() => setShowForm(false)}
              categoryOptions={INCOME_SOURCES}
              categoryLabel="Income Source"
              categoryPlaceholder="Select a source"
              descriptionLabel="Description / note"
              initial={{ category: "", date: "", amount: 0, description: "" }}
            />
          </div>
        )}

        <div className={styles.listWrapper + " card"}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Source</th>
                <th>Description</th>
                <th>Amount</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t.id}>
                  <td>{formatDate(t.date)}</td>
                  <td>{t.category}</td>
                  <td>{t.description}</td>
                  <td className={styles.amountCell}>{formatCurrency(t.amount)}</td>
                  <td>
                    <button
                      className={styles.deleteButton}
                      onClick={() => setTransactions((prev) => prev.filter((x) => x.id !== t.id))}
                      aria-label="Delete"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr><td colSpan={5} className={styles.emptyRow}>No income entries yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className={styles.charts}>
        <section className={styles.chartSection}>
          <div className={styles.chartHeader}>
            <h2 className={styles.chartTitle}>Monthly Income (2026)</h2>
            <p className={styles.chartSub}>Full-year breakdown — spot your strongest and weakest months.</p>
          </div>
          <div className={styles.chartFrameTall}>
            <Chart data={MONTHLY_INCOME} type="bar" />
          </div>
        </section>

        <div className={styles.chartRow}>
          <section className={styles.chartSection}>
            <div className={styles.chartHeader}>
              <h2 className={styles.chartTitle}>Income Breakdown</h2>
              <p className={styles.chartSub}>Share by income source.</p>
            </div>
            <div className={styles.chartFrame}>
              <Chart data={sourceBreakdown} type="doughnut" />
            </div>
          </section>

          <section className={styles.chartSection}>
            <div className={styles.chartHeader}>
              <h2 className={styles.chartTitle}>Income Trend</h2>
              <p className={styles.chartSub}>Each payment over time.</p>
            </div>
            <div className={styles.chartFrame}>
              <IncomeTrendChart points={incomeTrendPoints} />
            </div>
          </section>
        </div>
      </div>

    </div>
  );
}
