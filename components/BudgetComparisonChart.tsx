"use client";

import { useEffect, useMemo, useState } from "react";
import { Bar } from "react-chartjs-2";
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from "chart.js";
import chartStyles from "./Chart.module.css";
import styles from "./BudgetComparisonChart.module.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend
);

interface BudgetComparisonChartProps {
  spendings: Record<string, number>;
  budgets: Record<string, number>;
}

export default function BudgetComparisonChart({ spendings, budgets }: BudgetComparisonChartProps) {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [visibleCategories, setVisibleCategories] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    let initialTheme: "light" | "dark" = "light";

    if (saved === "light" || saved === "dark") {
      initialTheme = saved;
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      initialTheme = prefersDark ? "dark" : "light";
    }

    setTheme(initialTheme);

    const observer = new MutationObserver(() => {
      const currentTheme = document.documentElement.getAttribute("data-theme");
      if (currentTheme === "light" || currentTheme === "dark") {
        setTheme(currentTheme);
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => observer.disconnect();
  }, []);

  const categories = useMemo(
    () =>
      Array.from(new Set([...Object.keys(budgets), ...Object.keys(spendings)])).filter(
        (category) => category !== "Income"
      ),
    [budgets, spendings]
  );

  useEffect(() => {
    setVisibleCategories((previous) => {
      const next: Record<string, boolean> = {};

      for (const category of categories) {
        next[category] = previous[category] ?? true;
      }

      return next;
    });
  }, [categories]);

  const lightPalette = ["#3B82F6", "#10B981", "#FBBF24", "#8B5CF6", "#06B6D4", "#F97316"];
  const darkPalette = ["#6366F1", "#22C55E", "#FACC15", "#A855F7", "#38BDF8", "#FB7185"];
  const palette = theme === "dark" ? darkPalette : lightPalette;
  const categoryColors = categories.reduce<Record<string, string>>((result, category, index) => {
    result[category] = palette[index % palette.length];
    return result;
  }, {});
  const textColor = theme === "dark" ? "#F1F5F9" : "#1E293B";
  const gridColor = theme === "dark" ? "rgba(241, 245, 249, 0.18)" : "rgba(30, 41, 59, 0.1)";
  const limitColor = theme === "dark" ? "#FBBF24" : "#F97316";
  const visibleLabels = categories.filter((category) => visibleCategories[category] !== false);
  const spendingValues = visibleLabels.map((category) => spendings[category] ?? 0);
  const budgetValues = visibleLabels.map((category) => budgets[category] ?? 0);
  const withinBudgetValues = visibleLabels.map((category, index) => {
    return Math.min(spendingValues[index], budgetValues[index]);
  });
  const overBudgetValues = visibleLabels.map((category, index) => {
    return Math.max(0, spendingValues[index] - budgetValues[index]);
  });

  const chartData = {
    labels: visibleLabels,
    datasets: [
      {
        type: "bar" as const,
        label: "Spendings",
        data: withinBudgetValues,
        backgroundColor: visibleLabels.map((category) => categoryColors[category]),
        borderRadius: 10,
        borderSkipped: false,
        stack: "spendings",
        maxBarThickness: 42,
        order: 2,
      },
      {
        type: "bar" as const,
        label: "Over budget",
        data: overBudgetValues,
        backgroundColor: "rgba(239, 68, 68, 0.9)",
        borderRadius: 10,
        borderSkipped: false,
        stack: "spendings",
        maxBarThickness: 42,
        order: 2,
      },
      {
        type: "line" as const,
        label: "Budget limit",
        data: budgetValues,
        borderColor: limitColor,
        backgroundColor: limitColor,
        borderWidth: 3,
        borderDash: [8, 6],
        pointRadius: 5,
        pointHoverRadius: 7,
        pointBorderWidth: 2,
        pointBorderColor: theme === "dark" ? "#0F172A" : "#FFFFFF",
        pointBackgroundColor: limitColor,
        tension: 0.25,
        order: 1,
      },
    ],
  };

  const options: any = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index",
      intersect: false,
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: theme === "dark" ? "rgba(15, 23, 42, 0.94)" : "rgba(248, 250, 252, 0.96)",
        titleColor: textColor,
        bodyColor: textColor,
        borderColor: theme === "dark" ? "#334155" : "#CBD5E1",
        borderWidth: 1,
        cornerRadius: 10,
        callbacks: {
          label(context: any) {
            const category = context.label as string;
            const spending = spendings[category] ?? 0;
            const budget = budgets[category] ?? 0;
            const overBudget = Math.max(0, spending - budget);

            if (context.dataset.label === "Spendings") {
              return `Spendings: $${spending.toFixed(2)}`;
            }

            if (context.dataset.label === "Over budget") {
              return overBudget > 0 ? `Over budget: $${overBudget.toFixed(2)}` : null;
            }

            return `Budget limit: $${budget.toFixed(2)}`;
          },
          footer(items: Array<{ label: string }>) {
            const category = items[0]?.label;
            if (!category) {
              return "";
            }

            const difference = (budgets[category] ?? 0) - (spendings[category] ?? 0);
            return difference >= 0
              ? `Remaining: $${difference.toFixed(2)}`
              : `Exceeded by: $${Math.abs(difference).toFixed(2)}`;
          },
        },
      },
    },
    scales: {
      x: {
        stacked: true,
        ticks: {
          color: textColor,
          font: {
            size: 13,
            weight: 600 as any,
          },
        },
        grid: {
          display: false,
        },
      },
      y: {
        stacked: true,
        beginAtZero: true,
        ticks: {
          color: textColor,
          callback(value: number | string) {
            return `$${value}`;
          },
        },
        grid: {
          color: gridColor,
          borderDash: [4, 4],
        },
      },
    },
  };

  return (
    <div className={styles.wrapper}>
      <div className={chartStyles.chartWrapper}>
        {visibleLabels.length > 0 ? (
          <Bar data={chartData} options={options} />
        ) : (
          <div className={styles.emptyState}>Select at least one category below to view the chart.</div>
        )}
      </div>

      <div className={styles.meta}>
        <div className={styles.key}>
          <span className={styles.limitKey} />
          <span>Budget limit</span>
          <span className={styles.overBudgetKey} />
          <span>Over budget</span>
        </div>

        <div className={styles.categoryToggles}>
          {categories.map((category) => {
            const isVisible = visibleCategories[category] !== false;
            const isOverBudget = (spendings[category] ?? 0) > (budgets[category] ?? 0);

            return (
              <button
                key={category}
                type="button"
                className={[
                  styles.categoryToggle,
                  !isVisible ? styles.categoryToggleHidden : "",
                  isOverBudget ? styles.categoryToggleOver : "",
                ].join(" ").trim()}
                onClick={() => {
                  setVisibleCategories((previous) => ({
                    ...previous,
                    [category]: !(previous[category] ?? true),
                  }));
                }}
                aria-pressed={isVisible}
              >
                <span
                  className={styles.swatch}
                  style={{ backgroundColor: categoryColors[category] }}
                />
                <span>{category}</span>
                <span className={styles.status}>{isOverBudget ? "Over" : "Within"}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}