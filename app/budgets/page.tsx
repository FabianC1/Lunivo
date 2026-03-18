"use client";

import { useEffect, useState } from "react";
import styles from "./budgets.module.css";
import Chart from "../../components/Chart";
import BudgetComparisonChart from "../../components/BudgetComparisonChart";
import { initialBudgets, loadBudgets, saveBudgets, type BudgetMap } from "../../lib/budgets";
import { formatCurrency } from "../../lib/utils";

// Current month actual spending (Mar 2026, aligned with transactions page)
const ACTUAL_SPENDING: BudgetMap = {
  Food: 328,
  Transport: 142,
  Utilities: 278,
  Entertainment: 180,
  Other: 112,
};

export default function Budgets() {
  const [budgets, setBudgets] = useState<BudgetMap>(initialBudgets);
  const [hasLoadedBudgets, setHasLoadedBudgets] = useState(false);

  useEffect(() => {
    setBudgets(loadBudgets());
    setHasLoadedBudgets(true);
  }, []);

  useEffect(() => {
    if (!hasLoadedBudgets) return;
    saveBudgets(budgets);
  }, [budgets, hasLoadedBudgets]);

  function updateCategory(cat: string, amt: number) {
    const safe = isNaN(amt) ? 0 : amt;
    setBudgets((prev) => ({ ...prev, [cat]: safe }));
  }

  const totalBudget       = Object.values(budgets).reduce((s, v) => s + v, 0);
  const totalSpent        = Object.values(ACTUAL_SPENDING).reduce((s, v) => s + v, 0);
  const remaining         = totalBudget - totalSpent;
  const overBudgetCount   = Object.keys(ACTUAL_SPENDING).filter(
    (cat) => (ACTUAL_SPENDING[cat] ?? 0) > (budgets[cat] ?? 0)
  ).length;
  const budgetUsedPct     = totalBudget > 0 ? ((totalSpent / totalBudget) * 100).toFixed(1) : "0.0";
  const remainingByCategory = Object.keys(budgets).reduce((result, cat) => {
    result[cat] = Math.max(0, (budgets[cat] ?? 0) - (ACTUAL_SPENDING[cat] ?? 0));
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
          <p>How much of each limit has been used this month.</p>
        </div>
        <div className={styles.progressList}>
          {Object.entries(budgets).map(([cat, limit]) => {
            const spent = ACTUAL_SPENDING[cat] ?? 0;
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
        <BudgetComparisonChart spendings={ACTUAL_SPENDING} budgets={budgets} />
      </section>

      <div className={styles.compactChartGrid}>
        <section className={`${styles.chartSection} ${styles.compactChartSection}`}>
          <div className={styles.sectionHeader}>
            <h2>Spending Distribution</h2>
            <p>How your actual spend is split this month.</p>
          </div>
          <div className={styles.chartFrameSquare}>
            <Chart data={ACTUAL_SPENDING} type="doughnut" />
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
                const spent = ACTUAL_SPENDING[cat] ?? 0;
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
