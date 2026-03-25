"use client";

import { useEffect, useState } from "react";
import styles from "./budgets.module.css";
import Chart from "../../components/Chart";
import BudgetComparisonChart from "../../components/BudgetComparisonChart";
import { initialBudgets, type BudgetMap } from "../../lib/budgets";
import { formatCurrency } from "../../lib/utils";
import { getSession } from "../../lib/auth";

const SAMPLE_SPENDING: BudgetMap = {
  Food: 328,
  Transport: 142,
  Utilities: 278,
  Entertainment: 180,
  Other: 112,
};

export default function Budgets() {
  const [budgets, setBudgets] = useState<BudgetMap>(initialBudgets);
  const [actualSpending, setActualSpending] = useState<BudgetMap>(SAMPLE_SPENDING);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [usesDatabase, setUsesDatabase] = useState(false);
  const [hasLoadedBudgets, setHasLoadedBudgets] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const session = getSession();
    const userId = session?.isDemo ? null : session?.userId ?? null;

    setSessionUserId(userId);
    setUsesDatabase(Boolean(userId));

    if (!userId) {
      setBudgets(initialBudgets);
      setActualSpending(SAMPLE_SPENDING);
      setHasLoadedBudgets(true);
      setIsLoading(false);
      return;
    }

    const resolvedUserId = userId;

    let isMounted = true;

    async function loadData() {
      try {
        setIsLoading(true);
        setError("");

        const [budgetsResponse, spendingResponse] = await Promise.all([
          fetch(`/api/budgets?userId=${encodeURIComponent(resolvedUserId)}`, { cache: "no-store" }),
          fetch(`/api/transactions?userId=${encodeURIComponent(resolvedUserId)}&kind=expense`, { cache: "no-store" }),
        ]);

        if (!budgetsResponse.ok) {
          throw new Error("Failed to load budgets.");
        }

        if (!spendingResponse.ok) {
          throw new Error("Failed to load expenses.");
        }

        const budgetsPayload = await budgetsResponse.json();
        const spendingPayload = await spendingResponse.json();

        if (!isMounted) {
          return;
        }

        const expenseTransactions = Array.isArray(spendingPayload.transactions)
          ? spendingPayload.transactions
          : [];

        const currentMonth = new Date().toISOString().slice(0, 7);
        const monthlySpending = expenseTransactions.reduce((totals: BudgetMap, transaction: { date: string; category: string; amount: number }) => {
          if (!transaction.date.startsWith(currentMonth)) {
            return totals;
          }

          const category = transaction.category || "Other";
          totals[category] = (totals[category] ?? 0) + transaction.amount;
          return totals;
        }, {} as BudgetMap);

        for (const key of Object.keys(initialBudgets)) {
          monthlySpending[key] = monthlySpending[key] ?? 0;
        }

        setBudgets(budgetsPayload.budget?.categories ?? initialBudgets);
        setActualSpending(monthlySpending);
        setHasLoadedBudgets(true);
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        setError(loadError instanceof Error ? loadError.message : "Failed to load budget data.");
        setBudgets(initialBudgets);
        setActualSpending(SAMPLE_SPENDING);
        setHasLoadedBudgets(true);
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

  useEffect(() => {
    if (!hasLoadedBudgets || !sessionUserId) return;

    const timeoutId = window.setTimeout(async () => {
      try {
        setIsSaving(true);
        setError("");
        const response = await fetch("/api/budgets", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: sessionUserId, categories: budgets, period: "monthly" }),
        });

        if (!response.ok) {
          throw new Error("Failed to save budgets.");
        }

        setFeedback("Budgets saved.");
      } catch (saveError) {
        setError(saveError instanceof Error ? saveError.message : "Failed to save budgets.");
      } finally {
        setIsSaving(false);
      }
    }, 500);

    return () => window.clearTimeout(timeoutId);
  }, [budgets, hasLoadedBudgets, sessionUserId]);

  function updateCategory(cat: string, amt: number) {
    const safe = isNaN(amt) ? 0 : amt;
    setFeedback("");
    setBudgets((prev) => ({ ...prev, [cat]: safe }));
  }

  const totalBudget       = Object.values(budgets).reduce((s, v) => s + v, 0);
  const totalSpent        = Object.values(actualSpending).reduce((s, v) => s + v, 0);
  const remaining         = totalBudget - totalSpent;
  const overBudgetCount   = Object.keys(actualSpending).filter(
    (cat) => (actualSpending[cat] ?? 0) > (budgets[cat] ?? 0)
  ).length;
  const budgetUsedPct     = totalBudget > 0 ? ((totalSpent / totalBudget) * 100).toFixed(1) : "0.0";
  const remainingByCategory = Object.keys(budgets).reduce((result, cat) => {
    result[cat] = Math.max(0, (budgets[cat] ?? 0) - (actualSpending[cat] ?? 0));
    return result;
  }, {} as Record<string, number>);

  return (
    <div className={styles.container + " container"}>
      <div className={styles.header}>
        <h1 className={styles.title}>Budget</h1>
        <p className={styles.subtitle}>Plan your spending limits and track how well you stick to them.</p>
      </div>

      <div className={styles.kpiGrid}>
        <article className={styles.kpiCard}>
          <p>Total Budget</p>
          <h3>{formatCurrency(totalBudget)}</h3>
          <span>Across {Object.keys(budgets).length} categories</span>
        </article>
        <article className={styles.kpiCard}>
          <p>Total Spent</p>
          <h3>{formatCurrency(totalSpent)}</h3>
          <span>{budgetUsedPct}% of budget used</span>
        </article>
        <article className={styles.kpiCard}>
          <p>Remaining</p>
          <h3 className={remaining >= 0 ? styles.positive : styles.negative}>
            {formatCurrency(Math.abs(remaining))}
          </h3>
          <span>{remaining >= 0 ? "under budget" : "over budget"}</span>
        </article>
        <article className={styles.kpiCard}>
          <p>Over Limit</p>
          <h3 className={overBudgetCount > 0 ? styles.negative : styles.positive}>
            {overBudgetCount}
          </h3>
          <span>{overBudgetCount === 1 ? "category exceeded" : "categories exceeded"}</span>
        </article>
      </div>

      <section className={styles.cardSection}>
        <div className={styles.sectionHeader}>
          <h2>Budget Utilisation</h2>
          <p>
            {usesDatabase ? "How much of each limit your saved expenses have used this month." : "How much of each limit has been used in the sample month."}
          </p>
        </div>
        {error && <p className={styles.feedbackError}>{error}</p>}
        {isLoading && <p className={styles.feedbackMuted}>Loading budgets...</p>}
        {!isLoading && usesDatabase && (
          <p className={styles.feedbackMuted}>{isSaving ? "Saving changes..." : feedback || "Changes save automatically."}</p>
        )}
        <div className={styles.progressList}>
          {Object.entries(budgets).map(([cat, limit]) => {
            const spent = actualSpending[cat] ?? 0;
            const pct   = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
            const over  = spent > limit;
            return (
              <div key={cat} className={styles.progressRow}>
                <div className={styles.progressMeta}>
                  <span className={styles.progressCat}>{cat}</span>
                  <span className={styles.progressValues}>
                    <span className={over ? styles.negative : ""}>{formatCurrency(spent)}</span>
                    <span className={styles.progressOf}> of {formatCurrency(limit)}</span>
                  </span>
                </div>
                <div className={styles.progressTrack}>
                  <div
                    className={`${styles.progressBar} ${over ? styles.progressBarOver : ""}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className={`${styles.progressPct} ${over ? styles.negative : styles.positive}`}>
                  {pct.toFixed(0)}%
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section className={`${styles.chartSection} ${styles.chartSectionWide}`}>
        <div className={styles.sectionHeader}>
          <h2>Budget vs Actual</h2>
          <p>Side-by-side comparison per category with the full width it needs.</p>
        </div>
        <BudgetComparisonChart spendings={actualSpending} budgets={budgets} />
      </section>

      <div className={styles.compactChartGrid}>
        <section className={`${styles.chartSection} ${styles.compactChartSection}`}>
          <div className={styles.sectionHeader}>
            <h2>Spending Distribution</h2>
            <p>How your actual spend is split this month.</p>
          </div>
          <div className={styles.chartFrameSquare}>
            <Chart data={actualSpending} type="doughnut" />
          </div>
        </section>

        <section className={`${styles.chartSection} ${styles.compactChartSection}`}>
          <div className={styles.sectionHeader}>
            <h2>Remaining Headroom</h2>
            <p>How much room is left in each category before you hit the cap.</p>
          </div>
          <div className={styles.chartFrameSquare}>
            <Chart data={remainingByCategory} type="bar" />
          </div>
        </section>
      </div>

      <section className={styles.cardSection}>
        <div className={styles.sectionHeader}>
          <h2>Edit Monthly Limits</h2>
          <p>Adjust your budget for any category below.</p>
        </div>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Category</th>
                <th>Monthly Budget</th>
                <th>Spent</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(budgets).map(([cat, amt]) => {
                const spent = actualSpending[cat] ?? 0;
                const over  = spent > amt;
                return (
                  <tr key={cat}>
                    <td>{cat}</td>
                    <td>
                      <input
                        type="number"
                        value={amt === 0 ? "" : amt}
                        onChange={(e) => {
                          const v = e.target.value;
                          updateCategory(cat, v === "" ? 0 : parseFloat(v));
                        }}
                      />
                    </td>
                    <td>{formatCurrency(spent)}</td>
                    <td>
                      <span className={`${styles.statusBadge} ${over ? styles.statusOver : styles.statusOk}`}>
                        {over ? "Over" : "OK"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
