"use client";

import { Doughnut, Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
} from 'chart.js';
import styles from './Chart.module.css';
import { useEffect, useState } from 'react';

// register anything we might need for the three chart types
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement
);

interface ChartProps {
  data: Record<string, number>;
  type?: 'doughnut' | 'line' | 'bar';
}

export default function Chart({ data, type = 'doughnut' }: ChartProps) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const labels = Object.keys(data);
  const values = Object.values(data);

  useEffect(() => {
    // Get theme from localStorage or system preference
    const saved = localStorage.getItem("theme");
    let initialTheme: "light" | "dark" = "light";

    if (saved === "light" || saved === "dark") {
      initialTheme = saved;
    } else {
      const prefers = window.matchMedia("(prefers-color-scheme: dark)").matches;
      initialTheme = prefers ? "dark" : "light";
    }

    setTheme(initialTheme);

    // Listen for theme changes
    const handleThemeChange = () => {
      const currentTheme = document.documentElement.getAttribute("data-theme");
      if (currentTheme === "light" || currentTheme === "dark") {
        setTheme(currentTheme);
      }
    };

    // Watch for attribute changes
    const observer = new MutationObserver(handleThemeChange);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"]
    });

    return () => observer.disconnect();
  }, []);

  // define base palettes using actual values
  const lightPalette = [
    '#3B82F6', // blue
    '#10B981', // green
    '#FBBF24', // amber
    '#EF4444', // red
    '#8B5CF6', // purple
    '#06B6D4', // cyan
  ];

  const darkPalette = [
    '#6366F1', // indigo
    '#22C55E', // green
    '#FBBF24', // amber
    '#EF4444', // red
    '#8B5CF6', // purple
    '#3B82F6', // blue
  ];

  const palette = theme === 'dark' ? darkPalette : lightPalette;

  // assign a color per label by index; this guarantees uniqueness up to palette length
  const backgroundColor = labels.map((_, idx) => palette[idx % palette.length]);

  const textColor = theme === 'dark' ? '#F1F5F9' : '#1E293B';
  const gridColor = theme === 'dark' ? 'rgba(241, 245, 249, 0.2)' : 'rgba(30, 41, 59, 0.1)';

  const chartData = {
    labels,
    datasets: [
      {
        data: values,
        backgroundColor,
        hoverOffset: 6,
        borderWidth: 2,
        borderColor: textColor, // theme-aware for visibility on all chart types

        // make points more visible on line charts
        pointRadius: type === 'line' ? 6 : 0,
        pointHoverRadius: type === 'line' ? 8 : 0,
        label: type === 'bar' ? 'Budget' : undefined,
      },
    ],
  };


  const options: any = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: type === 'doughnut' ? '50%' : undefined,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: textColor,
          font: {
            size: 14,
            weight: 500 as any, // cast to satisfy TS
          },
          padding: 16,
          usePointStyle: true,
          pointStyle: 'circle',
        },
      },
      tooltip: {
        backgroundColor: theme === 'dark' ? 'rgba(30, 41, 59, 0.9)' : 'rgba(248, 250, 252, 0.9)',
        titleColor: textColor,
        bodyColor: textColor,
        borderColor: theme === 'dark' ? '#334155' : '#CBD5E1',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
      },
    },
    scales: (type === 'line' || type === 'bar') ? {
      x: {
        ticks: { color: textColor },
        grid: { color: gridColor },
      },
      y: {
        ticks: { color: textColor },
        grid: { color: gridColor },
      },
    } : undefined,
  };

  return (
    <div className={styles.chartWrapper}>
      {type === 'doughnut' && <Doughnut data={chartData} options={options} />}
      {type === 'line' && <Line data={chartData} options={options} />}
      {type === 'bar' && <Bar data={chartData} options={options} />}
    </div>
  );
}