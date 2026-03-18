"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./transactions.module.css";
import TransactionForm from "../../components/TransactionForm";
import Chart from "../../components/Chart";
import BudgetComparisonChart from "../../components/BudgetComparisonChart";
import { formatCurrency, formatDate } from "../../lib/utils";
import { initialBudgets, loadBudgets, type BudgetMap } from "../../lib/budgets";

interface Transaction {
  id: number;
  date: string;
  description: string;
  category: string;
  amount: number;
}

const SPENDING_CATEGORIES = ["Food", "Transport", "Utilities", "Entertainment", "Other"];

const dummy: Transaction[] = [
  { id:  1, date: "2026-03-01", description: "Groceries",      category: "Food",          amount:  52.60 },
  { id:  2, date: "2026-03-02", description: "Bus fare",        category: "Transport",     amount:   3.50 },
  { id:  3, date: "2026-03-03", description: "Streaming",       category: "Entertainment", amount:  15.99 },
  { id:  4, date: "2026-03-05", description: "Supermarket",     category: "Food",          amount:  38.20 },
  { id:  5, date: "2026-03-06", description: "Electricity bill",category: "Utilities",     amount:  95.00 },
  { id:  6, date: "2026-03-07", description: "Train ticket",    category: "Transport",     amount:  22.50 },
  { id:  7, date: "2026-03-09", description: "Restaurant",      category: "Food",          amount:  42.00 },
  { id:  8, date: "2026-03-10", description: "Cinema",          category: "Entertainment", amount:  12.50 },
  { id:  9, date: "2026-03-11", description: "Water bill",      category: "Utilities",     amount:  48.00 },
  { id: 10, date: "2026-03-12", description: "Petrol",          category: "Transport",     amount:  55.00 },
  { id: 11, date: "2026-03-14", description: "Cafe",            category: "Food",          amount:   8.50 },
  { id: 12, date: "2026-03-15", description: "Gas bill",        category: "Utilities",     amount:  75.00 },
  { id: 13, date: "2026-03-16", description: "Takeaway",        category: "Food",          amount:  22.30 },
  { id: 14, date: "2026-03-17", description: "Spotify",         category: "Entertainment", amount:   9.99 },
  { id: 15, date: "2026-03-18", description: "Bus pass",        category: "Transport",     amount:  35.00 },
];

const CATEGORY_COLORS: Record<string, string> = {
  Food:          "#3B82F6",
  Transport:     "#10B981",
  Utilities:     "#FBBF24",
  Entertainment: "#EF4444",
  Other:         "#8B5CF6",
};

const WEEK_LABELS = ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5"] as const;

export default function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>(dummy);
  const [showForm, setShowForm]         = useState(false);
  const [budgets, setBudgets]           = useState<BudgetMap>(initialBudgets);
  const [categoryFilter, setCategoryFilter] = useState<string>("All");

  useEffect(() => { setBudgets(loadBudgets()); }, []);

  function addTransaction(data: Omit<Transaction, "id">) {
    setTransactions((prev) => [...prev, { id: Date.now(), ...data }]);
    setShowForm(false);
  }

  // KPI stats
  const totalSpent        = transactions.reduce((s, t) => s + t.amount, 0);
  const avgTransaction    = transactions.length > 0 ? totalSpent / transactions.length : 0;
  const biggestTransaction = transactions.reduce((max, t) => t.amount > max ? t.amount : max, 0);

  // Chart data
  const spendingsByCategory = transactions.reduce((totals, t) => {
    if (t.category !== "Income") totals[t.category] = (totals[t.category] ?? 0) + t.amount;
    return totals;
  }, {} as Record<string, number>);

  // Cumulative spending over time (grouped by date)
  const cumulativeSpending = useMemo(() => {
    const daily: Record<string, number> = {};
    [...transactions]
      .sort((a, b) => a.date.localeCompare(b.date))
      .forEach((t) => {
        const label = t.date.slice(5); // "03-18"
        daily[label] = (daily[label] ?? 0) + t.amount;
      });
    let running = 0;
    const result: Record<string, number> = {};
    Object.entries(daily)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([date, amount]) => {
        running += amount;
        result[date] = Math.round(running * 100) / 100;
      });
    return result;
  }, [transactions]);

  const weeklySpending = useMemo(() => {
    const totals = WEEK_LABELS.reduce((result, label) => {
      result[label] = 0;
      return result;
    }, {} as Record<string, number>);

    transactions.forEach((transaction) => {
      const day = Number(transaction.date.slice(8, 10));
      const weekIndex = Math.min(WEEK_LABELS.length - 1, Math.max(0, Math.ceil(day / 7) - 1));
      totals[WEEK_LABELS[weekIndex]] += transaction.amount;
    });

    return totals;
  }, [transactions]);

  // Filtered table rows
  const categories = ["All", ...Array.from(new Set(transactions.map((t) => t.category)))];
  const filtered   = categoryFilter === "All"
    ? transactions
    : transactions.filter((t) => t.category === categoryFilter);

  return (
    <div className={styles.container + " container"}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>Spendings</h1>
          <p className={styles.subtitle}>Track every penny going out — categorised and charted.</p>
        </div>
      </div>

      <div className={styles.kpiGrid}>
        <article className={styles.kpiCard}>
          <p>Total Spent</p>
          <h3>{formatCurrency(totalSpent)}</h3>
          <span>This period</span>
        </article>
        <article className={styles.kpiCard}>
          <p>Transactions</p>
          <h3>{transactions.length}</h3>
          <span>entries recorded</span>
        </article>
        <article className={styles.kpiCard}>
          <p>Average</p>
          <h3>{formatCurrency(avgTransaction)}</h3>
          <span>per transaction</span>
        </article>
        <article className={styles.kpiCard}>
          <p>Biggest</p>
          <h3>{formatCurrency(biggestTransaction)}</h3>
          <span>single transaction</span>
        </article>
      </div>

      <section className={styles.entriesSection}>
        <div className={styles.tableHeader}>
          <div>
            <h2 className={styles.tableTitle}>All Transactions</h2>
            <p className={styles.tableSubtitle}>Add new spending entries and manage your existing ones in one place.</p>
          </div>
          <div className={styles.tableActions}>
            <div className={styles.filterRow}>
              <label htmlFor="cat-filter" className={styles.filterLabel}>Category</label>
              <select
                id="cat-filter"
                className={styles.filterSelect}
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <button className={styles.addButton} onClick={() => setShowForm(true)}>
              + Add Spending
            </button>
          </div>
        </div>

        {showForm && (
          <div className={styles.formWrapper}>
            <TransactionForm
              onSubmit={addTransaction}
              onCancel={() => setShowForm(false)}
              categoryOptions={SPENDING_CATEGORIES}
              categoryPlaceholder="Select a category"
            />
          </div>
        )}

        <div className={styles.listWrapper + " card"}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Category</th>
                <th>Amount</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id}>
                  <td>{formatDate(t.date)}</td>
                  <td>{t.description}</td>
                  <td>
                    <span
                      className={styles.categoryBadge}
                      style={{
                        background: `${CATEGORY_COLORS[t.category] ?? "#8B5CF6"}22`,
                        color: CATEGORY_COLORS[t.category] ?? "#8B5CF6",
                      }}
                    >
                      {t.category}
                    </span>
                  </td>
                  <td>{formatCurrency(t.amount)}</td>
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
              {filtered.length === 0 && (
                <tr><td colSpan={5} className={styles.emptyRow}>No transactions found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className={styles.charts}>
        <section className={styles.chartSection}>
          <div className={styles.chartHeader}>
            <h2 className={styles.chartTitle}>Cumulative Spend</h2>
            <p className={styles.chartSub}>Running total across the period — see your spending velocity.</p>
          </div>
          <div className={styles.chartFrameTall}>
            <Chart data={cumulativeSpending} type="line" />
          </div>
        </section>

        <section className={styles.chartSection}>
          <div className={styles.chartHeader}>
            <h2 className={styles.chartTitle}>Budget vs Spendings</h2>
            <p className={styles.chartSub}>How close you are to each limit with the full width it needs.</p>
          </div>
          <BudgetComparisonChart spendings={spendingsByCategory} budgets={budgets} />
        </section>

        <div className={styles.compactChartGrid}>
          <section className={`${styles.chartSection} ${styles.compactChartSection}`}>
            <div className={styles.chartHeader}>
              <h2 className={styles.chartTitle}>Spending by Category</h2>
              <p className={styles.chartSub}>Share of total spending in a tighter square layout.</p>
            </div>
            <div className={styles.chartFrameSquare}>
              <Chart data={spendingsByCategory} type="doughnut" />
            </div>
          </section>

          <section className={`${styles.chartSection} ${styles.compactChartSection}`}>
            <div className={styles.chartHeader}>
              <h2 className={styles.chartTitle}>Weekly Breakdown</h2>
              <p className={styles.chartSub}>See which week of the month drove the most spending.</p>
            </div>
            <div className={styles.chartFrameSquare}>
              <Chart data={weeklySpending} type="bar" />
            </div>
          </section>
        </div>
      </div>

    </div>
  );
}