"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./income.module.css";
import IconPopoverButton from "../../components/IconPopoverButton";
import PageLoading from "../../components/PageLoading";
import TransactionForm from "../../components/TransactionForm";
import Chart from "../../components/Chart";
import IncomeTrendChart from "../../components/IncomeTrendChart";
import { formatCurrency, formatDate } from "../../lib/utils";
import { getSession } from "../../lib/auth";

interface Transaction {
  id: string;
  date: string;
  description: string;
  category: string;
  amount: number;
}

type SortOption = "date-desc" | "date-asc" | "amount-desc" | "amount-asc";

const INCOME_SOURCES = ["Salary", "Side project", "Freelance", "Bonus", "Investment", "Gift", "Other"];

// Full-year monthly income for the bar chart (2026 data matching dashboard)
const MONTHLY_INCOME: Record<string, number> = {
  Jan: 3000, Feb: 3080, Mar: 3150, Apr: 3220,
  May: 3320, Jun: 3400, Jul: 3360, Aug: 3440,
  Sep: 3480, Oct: 3560, Nov: 3620, Dec: 3740,
};

const dummy: Transaction[] = [
  { id: "1", date: "2026-01-15", description: "Main payroll",     category: "Salary",       amount: 3000 },
  { id: "2", date: "2026-01-22", description: "Client website",   category: "Side project", amount:  400 },
  { id: "3", date: "2026-02-15", description: "Monthly payroll",  category: "Salary",       amount: 3080 },
  { id: "4", date: "2026-03-10", description: "Design retainer",  category: "Freelance",    amount:  750 },
  { id: "5", date: "2026-03-15", description: "Monthly payroll",  category: "Salary",       amount: 3000 },
];

export default function Income() {
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [usesDatabase, setUsesDatabase] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [monthFilter, setMonthFilter] = useState<string>("All months");
  const [sortOption, setSortOption] = useState<SortOption>("date-desc");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const session = getSession();
    const userId = session?.isDemo ? null : session?.userId ?? null;

    setSessionUserId(userId);
    setUsesDatabase(Boolean(userId));

    if (!userId) {
      setTransactions(dummy);
      setIsLoading(false);
      return;
    }

    const resolvedUserId = userId;

    let isMounted = true;

    async function loadTransactions() {
      try {
        setIsLoading(true);
        setError("");
        const response = await fetch(`/api/transactions?userId=${encodeURIComponent(resolvedUserId)}&kind=income`, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Failed to load income entries.");
        }

        const payload = await response.json();
        if (isMounted) {
          setTransactions(payload.transactions ?? []);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load income entries.");
          setTransactions([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadTransactions();

    return () => {
      isMounted = false;
    };
  }, []);

  async function addTransaction(data: Omit<Transaction, "id">) {
    if (!sessionUserId) {
      const next: Transaction = { id: String(Date.now()), ...data };
      setTransactions((prev) => [...prev, next]);
      setShowForm(false);
      return;
    }

    try {
      setError("");
      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, userId: sessionUserId, kind: "income" }),
      });

      if (!response.ok) {
        throw new Error("Failed to save income entry.");
      }

      const payload = await response.json();
      setTransactions((prev) => [payload.transaction, ...prev]);
      setShowForm(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save income entry.");
    }
  }

  async function deleteTransaction(id: string) {
    if (!sessionUserId) {
      setTransactions((prev) => prev.filter((entry) => entry.id !== id));
      return;
    }

    try {
      setError("");
      const response = await fetch(`/api/transactions/${id}`, { method: "DELETE" });
      if (!response.ok) {
        throw new Error("Failed to delete income entry.");
      }

      setTransactions((prev) => prev.filter((entry) => entry.id !== id));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete income entry.");
    }
  }

  // KPI stats
  const totalIncome = transactions.reduce((s, t) => s + t.amount, 0);
  const sourceBreakdown = transactions.reduce((totals, t) => {
    const source = t.category.trim() || "Other";
    totals[source] = (totals[source] ?? 0) + t.amount;
    return totals;
  }, {} as Record<string, number>);
  const largestSource = Object.entries(sourceBreakdown).sort(([, a], [, b]) => b - a)[0];
  const monthCount = new Set(transactions.map((t) => t.date.slice(0, 7))).size;
  const monthlyAvg = monthCount > 0 ? totalIncome / monthCount : 0;
  const projectedAnnual = monthlyAvg * 12;

  const incomeTrendPoints = useMemo(
    () =>
      [...transactions]
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .map((t) => ({ date: t.date, amount: t.amount })),
    [transactions]
  );

  const monthlyIncome = useMemo(() => {
    if (!usesDatabase || transactions.length === 0) {
      return MONTHLY_INCOME;
    }

    return [...transactions]
      .sort((a, b) => a.date.localeCompare(b.date))
      .reduce((totals, transaction) => {
        const monthLabel = new Date(`${transaction.date}T00:00:00`).toLocaleString("en-GB", {
          month: "short",
        });
        totals[monthLabel] = (totals[monthLabel] ?? 0) + transaction.amount;
        return totals;
      }, {} as Record<string, number>);
  }, [transactions, usesDatabase]);

  const monthOptions = useMemo(
    () => [
      "All months",
      ...Array.from(new Set(transactions.map((transaction) => transaction.date.slice(0, 7)))).sort((a, b) => b.localeCompare(a)),
    ],
    [transactions]
  );

  const visibleTransactions = useMemo(() => {
    const filtered = monthFilter === "All months"
      ? transactions
      : transactions.filter((transaction) => transaction.date.startsWith(monthFilter));

    return [...filtered].sort((left, right) => {
      switch (sortOption) {
        case "date-asc":
          return left.date.localeCompare(right.date);
        case "amount-asc":
          return left.amount - right.amount;
        case "amount-desc":
          return right.amount - left.amount;
        case "date-desc":
        default:
          return right.date.localeCompare(left.date);
      }
    });
  }, [monthFilter, sortOption, transactions]);

  if (isLoading) {
    return <PageLoading message="Loading income..." />;
  }

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
          <div className={styles.tableActions}>
            <IconPopoverButton
              icon="filter"
              label="Open filters"
              title="Filter"
              active={monthFilter !== "All months"}
            >
              <div className={styles.popoverField}>
                <label htmlFor="income-month-filter" className={styles.filterLabel}>Month</label>
                <select
                  id="income-month-filter"
                  className={styles.filterSelect}
                  value={monthFilter}
                  onChange={(e) => setMonthFilter(e.target.value)}
                >
                  {monthOptions.map((option) => (
                    <option key={option} value={option}>
                      {option === "All months" ? option : new Date(`${option}-01T00:00:00`).toLocaleString("en-GB", { month: "long", year: "numeric" })}
                    </option>
                  ))}
                </select>
              </div>
            </IconPopoverButton>
            <IconPopoverButton
              icon="sort"
              label="Open sort options"
              title="Sort"
              active={sortOption !== "date-desc"}
            >
              <div className={styles.popoverField}>
                <label htmlFor="income-sort" className={styles.filterLabel}>Sort order</label>
                <select
                  id="income-sort"
                  className={styles.filterSelect}
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value as SortOption)}
                >
                  <option value="date-desc">Newest first</option>
                  <option value="date-asc">Oldest first</option>
                  <option value="amount-desc">Highest amount</option>
                  <option value="amount-asc">Lowest amount</option>
                </select>
              </div>
            </IconPopoverButton>
            <button className={styles.addButton} onClick={() => setShowForm(true)}>
              + Add Income
            </button>
          </div>
        </div>

        {error && <p className={styles.feedbackError}>{error}</p>}
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
              {visibleTransactions.map((t) => (
                <tr key={t.id}>
                  <td>{formatDate(t.date)}</td>
                  <td>{t.category}</td>
                  <td>{t.description}</td>
                  <td className={styles.amountCell}>{formatCurrency(t.amount)}</td>
                  <td>
                    <button
                      className={styles.deleteButton}
                      onClick={() => deleteTransaction(t.id)}
                      aria-label="Delete"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
              {visibleTransactions.length === 0 && (
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
            <p className={styles.chartSub}>
              {usesDatabase ? "Built from saved income entries." : "Full-year breakdown of the sample data."}
            </p>
          </div>
          <div className={styles.chartFrameTall}>
            <Chart data={monthlyIncome} type="bar" showLegend={false} />
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
