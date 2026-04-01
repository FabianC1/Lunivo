"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./transactions.module.css";
import IconPopoverButton from "../../components/IconPopoverButton";
import PageLoading from "../../components/PageLoading";
import TransactionForm from "../../components/TransactionForm";
import Chart from "../../components/Chart";
import BudgetComparisonChart from "../../components/BudgetComparisonChart";
import { readApiError } from "../../lib/apiClient";
import { formatCurrency, formatDate } from "../../lib/utils";
import { initialBudgets, sanitizeBudgets, type BudgetMap } from "../../lib/budgets";
import { getSession } from "../../lib/auth";

interface Transaction {
  id: string;
  date: string;
  description: string;
  category: string;
  amount: number;
}

type SortOption = "date-desc" | "date-asc" | "amount-desc" | "amount-asc";

const dummy: Transaction[] = [
  { id:  "1", date: "2026-03-01", description: "Groceries",      category: "Food",          amount:  52.60 },
  { id:  "2", date: "2026-03-02", description: "Bus fare",        category: "Transport",     amount:   3.50 },
  { id:  "3", date: "2026-03-03", description: "Streaming",       category: "Entertainment", amount:  15.99 },
  { id:  "4", date: "2026-03-05", description: "Supermarket",     category: "Food",          amount:  38.20 },
  { id:  "5", date: "2026-03-06", description: "Electricity bill",category: "Utilities",     amount:  95.00 },
  { id:  "6", date: "2026-03-07", description: "Train ticket",    category: "Transport",     amount:  22.50 },
  { id:  "7", date: "2026-03-09", description: "Restaurant",      category: "Food",          amount:  42.00 },
  { id:  "8", date: "2026-03-10", description: "Cinema",          category: "Entertainment", amount:  12.50 },
  { id:  "9", date: "2026-03-11", description: "Water bill",      category: "Utilities",     amount:  48.00 },
  { id: "10", date: "2026-03-12", description: "Petrol",          category: "Transport",     amount:  55.00 },
  { id: "11", date: "2026-03-14", description: "Cafe",            category: "Food",          amount:   8.50 },
  { id: "12", date: "2026-03-15", description: "Gas bill",        category: "Utilities",     amount:  75.00 },
  { id: "13", date: "2026-03-16", description: "Takeaway",        category: "Food",          amount:  22.30 },
  { id: "14", date: "2026-03-17", description: "Spotify",         category: "Entertainment", amount:   9.99 },
  { id: "15", date: "2026-03-18", description: "Bus pass",        category: "Transport",     amount:  35.00 },
];

const CATEGORY_COLORS: Record<string, string> = {
  Food:          "#3B82F6",
  Transport:     "#10B981",
  Utilities:     "#FBBF24",
  Entertainment: "#EF4444",
  Emergencies:   "#F97316",
  Other:         "#8B5CF6",
};

const WEEK_LABELS = ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5"] as const;

export default function Transactions() {
  const tableSectionRef = useRef<HTMLElement | null>(null);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [usesDatabase, setUsesDatabase] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);
  const [budgets, setBudgets] = useState<BudgetMap>(initialBudgets);
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
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

    let isMounted = true;

    async function loadData() {
      try {
        setIsLoading(true);
        setError("");

        const [transactionsResponse, budgetsResponse] = await Promise.all([
          fetch("/api/transactions?kind=expense", { cache: "no-store" }),
          fetch("/api/budgets", { cache: "no-store" }),
        ]);

        if (!transactionsResponse.ok) {
          throw new Error(await readApiError(transactionsResponse, "Failed to load spending entries."));
        }

        if (!budgetsResponse.ok) {
          throw new Error(await readApiError(budgetsResponse, "Failed to load budgets."));
        }

        const transactionsPayload = await transactionsResponse.json();
        const budgetsPayload = await budgetsResponse.json();

        if (!isMounted) {
          return;
        }

        const loadedTransactions = transactionsPayload.transactions ?? [];
        setTransactions(loadedTransactions);
        setBudgets(sanitizeBudgets(budgetsPayload.budget?.categories ?? initialBudgets));
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        setError(loadError instanceof Error ? loadError.message : "Failed to load spending data.");
        setTransactions([]);
        setBudgets(sanitizeBudgets(initialBudgets));
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  async function saveTransaction(data: Omit<Transaction, "id">) {
    if (editingTransactionId) {
      if (!sessionUserId) {
        setTransactions((prev) => prev.map((entry) => (entry.id === editingTransactionId ? { ...entry, ...data } : entry)));
        setSelectedTransactionId(editingTransactionId);
        setEditingTransactionId(null);
        setShowForm(false);
        return;
      }

      try {
        setError("");
        const response = await fetch(`/api/transactions/${editingTransactionId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...data, kind: "expense" }),
        });
        if (!response.ok) {
          throw new Error(await readApiError(response, "Failed to update spending entry."));
        }

        const payload = await response.json();
        setTransactions((prev) => prev.map((entry) => (entry.id === editingTransactionId ? payload.transaction : entry)));
        setSelectedTransactionId(editingTransactionId);
        setEditingTransactionId(null);
        setShowForm(false);
        return;
      } catch (saveError) {
        setError(saveError instanceof Error ? saveError.message : "Failed to update spending entry.");
        return;
      }
    }

    if (!sessionUserId) {
      setTransactions((prev) => [...prev, { id: String(Date.now()), ...data }]);
      setShowForm(false);
      return;
    }

    try {
      setError("");
      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, kind: "expense" }),
      });

      if (!response.ok) {
        throw new Error(await readApiError(response, "Failed to save spending entry."));
      }

      const payload = await response.json();
      setTransactions((prev) => [payload.transaction, ...prev]);
      setSelectedTransactionId(payload.transaction.id);
      setShowForm(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save spending entry.");
    }
  }

  function startEditing(transaction: Transaction) {
    setSelectedTransactionId(transaction.id);
    setEditingTransactionId(transaction.id);
    setShowForm(true);
    setError("");
  }

  function cancelForm() {
    setEditingTransactionId(null);
    setShowForm(false);
  }

  async function deleteTransaction(id: string) {
    if (!sessionUserId) {
      setTransactions((prev) => prev.filter((entry) => entry.id !== id));
      if (editingTransactionId === id) {
        setEditingTransactionId(null);
        setShowForm(false);
      }
      if (selectedTransactionId === id) {
        setSelectedTransactionId(null);
      }
      return;
    }

    try {
      setError("");
      const response = await fetch(`/api/transactions/${id}`, { method: "DELETE" });
      if (!response.ok) {
        throw new Error(await readApiError(response, "Failed to delete spending entry."));
      }

      setTransactions((prev) => prev.filter((entry) => entry.id !== id));
      if (editingTransactionId === id) {
        setEditingTransactionId(null);
        setShowForm(false);
      }
      if (selectedTransactionId === id) {
        setSelectedTransactionId(null);
      }
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete spending entry.");
    }
  }

  // KPI stats
  const totalSpent = transactions.reduce((s, t) => s + t.amount, 0);
  const avgTransaction = transactions.length > 0 ? totalSpent / transactions.length : 0;
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

  const spendingCategories = useMemo(
    () => Object.keys(sanitizeBudgets(budgets)),
    [budgets]
  );

  // Filtered table rows
  const categories = ["All", ...Array.from(new Set(transactions.map((t) => t.category)))];
  const monthOptions = [
    "All months",
    ...Array.from(new Set(transactions.map((transaction) => transaction.date.slice(0, 7)))).sort((a, b) => b.localeCompare(a)),
  ];
  const filtered = [...transactions]
    .filter((transaction) => categoryFilter === "All" || transaction.category === categoryFilter)
    .filter((transaction) => monthFilter === "All months" || transaction.date.startsWith(monthFilter))
    .sort((left, right) => {
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

  const editingTransaction = editingTransactionId
    ? transactions.find((transaction) => transaction.id === editingTransactionId) ?? null
    : null;

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!selectedTransactionId || showForm) {
        return;
      }

      const target = event.target as Node;
      if (tableSectionRef.current?.contains(target)) {
        return;
      }

      setSelectedTransactionId(null);
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [selectedTransactionId, showForm]);

  if (isLoading) {
    return <PageLoading message="Loading spendings..." />;
  }

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

      <section
        ref={tableSectionRef}
        className={styles.entriesSection}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            setSelectedTransactionId(null);
          }
        }}
      >
        <div className={styles.tableHeader}>
          <div>
            <h2 className={styles.tableTitle}>All Transactions</h2>
            <p className={styles.tableSubtitle}>Add new spending entries and manage your existing ones in one place.</p>
          </div>
          <div className={styles.tableActions}>
            <IconPopoverButton
              icon="filter"
              label="Open filters"
              title="Filter"
              active={categoryFilter !== "All" || monthFilter !== "All months"}
            >
              <div className={styles.popoverField}>
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
              <div className={styles.popoverField}>
                <label htmlFor="month-filter" className={styles.filterLabel}>Month</label>
                <select
                  id="month-filter"
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
                <label htmlFor="spending-sort" className={styles.filterLabel}>Sort order</label>
                <select
                  id="spending-sort"
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

            <div className={styles.actionPair}>
              <button
                className={styles.secondaryActionButton}
                onClick={() => {
                  const selected = filtered.find((transaction) => transaction.id === selectedTransactionId)
                    ?? transactions.find((transaction) => transaction.id === selectedTransactionId);

                  if (!selected) {
                    return;
                  }

                  startEditing(selected);
                }}
                disabled={!selectedTransactionId}
              >
                Edit
              </button>

              <button
                className={styles.addButton}
                onClick={() => {
                  setSelectedTransactionId(null);
                  setEditingTransactionId(null);
                  setShowForm(true);
                }}
              >
                + Add Spending
              </button>
            </div>
          </div>
        </div>

        {error && <p className={styles.feedbackError}>{error}</p>}
        {showForm && (
          <div className={styles.formWrapper}>
            <TransactionForm
              onSubmit={saveTransaction}
              onCancel={cancelForm}
              categoryOptions={spendingCategories}
              categoryPlaceholder="Select a category"
              submitLabel={editingTransaction ? "Save Changes" : "Save"}
              deleteLabel="Delete Spending"
              initial={editingTransaction ?? { category: "", date: "", amount: 0, description: "" }}
              onDelete={editingTransaction ? () => void deleteTransaction(editingTransaction.id) : undefined}
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
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr
                  key={t.id}
                  className={selectedTransactionId === t.id ? styles.selectedRow : undefined}
                  onClick={() => setSelectedTransactionId(t.id)}
                >
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
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={4} className={styles.emptyRow}>No transactions found.</td></tr>
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
            <Chart data={cumulativeSpending} type="line" showLegend={false} />
          </div>
        </section>

        <section className={styles.chartSection}>
          <div className={styles.chartHeader}>
            <h2 className={styles.chartTitle}>Budget vs Spendings</h2>
            <p className={styles.chartSub}>
              {usesDatabase ? "Your saved budgets against your saved expense entries." : "Sample budgets against the sample spendings."}
            </p>
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
              <Chart data={weeklySpending} type="bar" showLegend={false} />
            </div>
          </section>
        </div>
      </div>

    </div>
  );
}