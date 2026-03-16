"use client";

import { useEffect, useMemo, useState } from "react";
import { Line } from "react-chartjs-2";
import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from "chart.js";
import styles from "./Chart.module.css";
import { formatDate } from "../lib/utils";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

interface IncomeTrendPoint {
  date: string;
  amount: number;
}

interface IncomeTrendChartProps {
  points: IncomeTrendPoint[];
}

export default function IncomeTrendChart({ points }: IncomeTrendChartProps) {
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

  const sortedPoints = useMemo(() => {
    return [...points].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [points]);

  const labels = sortedPoints.map((point) => formatDate(point.date));
  const values = sortedPoints.map((point) => point.amount);

  const textColor = theme === "dark" ? "#F1F5F9" : "#1E293B";
  const gridColor = theme === "dark" ? "rgba(241, 245, 249, 0.18)" : "rgba(30, 41, 59, 0.1)";
  const lineColor = theme === "dark" ? "#22C55E" : "#10B981";
  const fillColor = theme === "dark" ? "rgba(34, 197, 94, 0.14)" : "rgba(16, 185, 129, 0.12)";

  const data = {
    labels,
    datasets: [
      {
        label: "Income",
        data: values,
        borderColor: lineColor,
        backgroundColor: fillColor,
        fill: true,
        tension: 0.35,
        borderWidth: 3,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: lineColor,
        pointBorderColor: theme === "dark" ? "#0F172A" : "#FFFFFF",
        pointBorderWidth: 2,
      },
    ],
  };

  const options: any = {
    responsive: true,
    maintainAspectRatio: false,
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
            return `Income: $${Number(context.raw ?? 0).toFixed(2)}`;
          },
        },
      },
    },
    scales: {
      x: {
        ticks: {
          color: textColor,
          maxRotation: 0,
        },
        grid: {
          color: gridColor,
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
      <Line data={data} options={options} />
    </div>
  );
}