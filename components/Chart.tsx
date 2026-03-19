"use client";

import { Doughnut, Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
} from 'chart.js';
import styles from './Chart.module.css';
import { useEffect, useState } from 'react';
import ChartLegend from './ChartLegend';

// register anything we might need for the three chart types
ChartJS.register(
  ArcElement,
  Tooltip,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement
);

interface ChartProps {
  data: Record<string, number>;
  type?: 'doughnut' | 'line' | 'bar';
  showLegend?: boolean;
  legendSpacing?: 'default' | 'relaxed' | 'roomy';
}

export default function Chart({
  data,
  type = 'doughnut',
  showLegend = true,
  legendSpacing,
}: ChartProps) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [visibleLabels, setVisibleLabels] = useState<Record<string, boolean>>({});
  const labels = Object.keys(data);
  const values = Object.values(data);
  const labelSignature = labels.join('::');
  const resolvedLegendSpacing = legendSpacing ?? (type === 'doughnut' ? 'relaxed' : 'default');

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

  useEffect(() => {
    setVisibleLabels((previous) => {
      const next: Record<string, boolean> = {};

      for (const label of labels) {
        next[label] = previous[label] ?? true;
      }

      return next;
    });
  }, [labelSignature]);

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
  const visibleEntries = labels.map((label, index) => ({
    label,
    value: values[index],
    color: backgroundColor[index],
  })).filter((entry) => !showLegend || visibleLabels[entry.label] !== false);
  const visibleChartLabels = visibleEntries.map((entry) => entry.label);
  const visibleChartValues = visibleEntries.map((entry) => entry.value);
  const visibleChartColors = visibleEntries.map((entry) => entry.color);

  const textColor = theme === 'dark' ? '#F1F5F9' : '#1E293B';
  const gridColor = theme === 'dark' ? 'rgba(241, 245, 249, 0.2)' : 'rgba(30, 41, 59, 0.1)';

  const chartData = {
    labels: visibleChartLabels,
    datasets: [
      {
        data: visibleChartValues,
        backgroundColor: visibleChartColors,
        hoverOffset: 6,
        borderWidth: 2,
        borderColor: textColor, // theme-aware for visibility on all chart types

        // make points more visible on line charts
        pointRadius: type === 'line' ? 6 : 0,
        pointHoverRadius: type === 'line' ? 8 : 0,
        pointBackgroundColor: type === 'line' ? visibleChartColors : undefined,
        pointHoverBackgroundColor: type === 'line' ? visibleChartColors : undefined,
        pointBorderColor: type === 'line' ? (theme === 'dark' ? '#0F172A' : '#FFFFFF') : undefined,
        pointBorderWidth: type === 'line' ? 2 : 0,
        label: 'Value',
      },
    ],
  };

  // For bar charts: compute a smart Y-axis baseline so bars reflect relative differences
  // instead of always spanning from 0 (which makes similar values look identical and huge).
  const barYMin = (() => {
    if (type !== 'bar' || visibleChartValues.length === 0) return undefined;
    const minVal = Math.min(...visibleChartValues);
    const maxVal = Math.max(...visibleChartValues);
    const range = Math.max(maxVal - minVal, 1);
    // Pick a round step that gives ~4 intervals over the visible range
    const rawStep = range / 4;
    const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const norm = rawStep / mag;
    const step = norm < 1.5 ? mag : norm < 3.5 ? 2 * mag : norm < 7.5 ? 5 * mag : 10 * mag;
    // Drop 2 steps below the minimum value, clamped to 0
    return Math.max(0, Math.floor(minVal / step) * step - 2 * step);
  })();

  const options: any = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: type === 'doughnut' ? '50%' : undefined,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: theme === 'dark' ? 'rgba(30, 41, 59, 0.9)' : 'rgba(248, 250, 252, 0.9)',
        titleColor: textColor,
        bodyColor: textColor,
        borderColor: theme === 'dark' ? '#334155' : '#CBD5E1',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          label(context: any) {
            return Number(context.raw ?? 0).toLocaleString();
          },
        },
      },
    },
    layout: {
      padding: {
        bottom: type === 'doughnut' ? 8 : 0,
      },
    },
    scales: (type === 'line' || type === 'bar') ? {
      x: {
        ticks: { color: textColor },
        grid: { color: gridColor },
      },
      y: {
        ...(barYMin !== undefined ? { min: barYMin } : {}),
        ticks: {
          color: textColor,
          ...(type === 'bar' ? {
            maxTicksLimit: 6,
            callback: (value: number | string) => {
              const v = Number(value);
              return v >= 1000
                ? `£${(v / 1000).toFixed(1).replace(/\.0$/, '')}k`
                : `£${v}`;
            },
          } : {}),
        },
        grid: { color: gridColor },
      },
    } : undefined,
  };

  return (
    <div className={[styles.chartContainer, showLegend ? styles.chartContainerWithLegend : ''].join(' ').trim()}>
      <div className={[styles.chartWrapper, showLegend ? styles.chartWrapperWithLegend : ''].join(' ').trim()}>
        {visibleChartLabels.length > 0 ? (
          <>
            {type === 'doughnut' && <Doughnut data={chartData} options={options} />}
            {type === 'line' && <Line data={chartData} options={options} />}
            {type === 'bar' && <Bar data={chartData} options={options} />}
          </>
        ) : (
          <div className={styles.emptyState}>Select at least one legend item to view the chart.</div>
        )}
      </div>

      {showLegend && (
        <ChartLegend
          items={labels.map((label, index) => ({
            label,
            color: backgroundColor[index],
            hidden: visibleLabels[label] === false,
          }))}
          onToggle={(label) => {
            setVisibleLabels((previous) => ({
              ...previous,
              [label]: !(previous[label] ?? true),
            }));
          }}
          spacing={resolvedLegendSpacing}
        />
      )}
    </div>
  );
}