"use client";

import { useEffect, useState } from "react";
import { Bar } from "react-chartjs-2";
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from "chart.js";
import styles from "./Chart.module.css";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

interface BudgetComparisonChartProps {
  spendings: Record<string, number>;
  budgets: Record<string, number>;
}

export default function BudgetComparisonChart({ spendings, budgets }: BudgetComparisonChartProps) {
  const [theme, setTheme] = useState<"light" | "dark">("light");

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

  const categories = Array.from(
    new Set([...Object.keys(budgets), ...Object.keys(spendings)])
  ).filter((category) => category !== "Income");

  const lightPalette = ["#3B82F6", "#10B981", "#FBBF24", "#EF4444", "#8B5CF6", "#06B6D4"];
  const darkPalette = ["#6366F1", "#22C55E", "#FBBF24", "#F97316", "#8B5CF6", "#38BDF8"];
  const palette = theme === "dark" ? darkPalette : lightPalette;
  const textColor = theme === "dark" ? "#F1F5F9" : "#1E293B";
  const gridColor = theme === "dark" ? "rgba(241, 245, 249, 0.18)" : "rgba(30, 41, 59, 0.1)";

  const chartData = {
    labels: ["Spendings", "Budget"],
    datasets: categories.map((category, index) => ({
      label: category,
      data: [spendings[category] ?? 0, budgets[category] ?? 0],
      backgroundColor: palette[index % palette.length],
      borderRadius: 8,
      maxBarThickness: 34,
    })),
  };

  const options: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          color: textColor,
          font: {
            size: 13,
            weight: 500 as any,
          },
          padding: 16,
          usePointStyle: true,
          pointStyle: "circle",
        },
      },
      tooltip: {
        backgroundColor: theme === "dark" ? "rgba(30, 41, 59, 0.92)" : "rgba(248, 250, 252, 0.95)",
        titleColor: textColor,
        bodyColor: textColor,
        borderColor: theme === "dark" ? "#334155" : "#CBD5E1",
        borderWidth: 1,
        cornerRadius: 8,
        callbacks: {
          label(context: any) {
            const value = Number(context.raw ?? 0);
            return `${context.dataset.label}: $${value.toFixed(2)}`;
          },
        },
      },
    },
    scales: {
      x: {
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
        beginAtZero: true,
        ticks: {
          color: textColor,
          callback(value: number | string) {
            return `$${value}`;
          },
        },
        grid: {
          color: gridColor,
        },
      },
    },
  };

  return (
    <div className={styles.chartWrapper}>
      <Bar data={chartData} options={options} />
    </div>
  );
}