"use client";

import { useState } from "react";
import styles from "./reports.module.css";
import Chart from "../../components/Chart";
import { formatCurrency } from "../../lib/utils";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

type MonthKey = (typeof MONTHS)[number];
type Metric = "spendings" | "income" | "net";
type ChartKind = "line" | "bar";
type CategoryName = "Food" | "Transport" | "Utilities" | "Entertainment" | "Other";

interface MonthReport {
  income: number;
  spendings: number;
  categories: Record<CategoryName, number>;
}

type YearReport = Record<MonthKey, MonthReport>;

const CATEGORY_SPLITS: Record<CategoryName, number>[] = [
  { Food: 0.32, Transport: 0.14, Utilities: 0.22, Entertainment: 0.16, Other: 0.16 },
  { Food: 0.31, Transport: 0.13, Utilities: 0.23, Entertainment: 0.17, Other: 0.16 },
  { Food: 0.33, Transport: 0.14, Utilities: 0.21, Entertainment: 0.17, Other: 0.15 },
  { Food: 0.3, Transport: 0.13, Utilities: 0.22, Entertainment: 0.19, Other: 0.16 },
  { Food: 0.29, Transport: 0.13, Utilities: 0.22, Entertainment: 0.21, Other: 0.15 },
  { Food: 0.31, Transport: 0.15, Utilities: 0.2, Entertainment: 0.2, Other: 0.14 },
  { Food: 0.32, Transport: 0.14, Utilities: 0.2, Entertainment: 0.2, Other: 0.14 },
  { Food: 0.3, Transport: 0.12, Utilities: 0.23, Entertainment: 0.2, Other: 0.15 },
  { Food: 0.31, Transport: 0.13, Utilities: 0.22, Entertainment: 0.18, Other: 0.16 },
  { Food: 0.33, Transport: 0.14, Utilities: 0.21, Entertainment: 0.16, Other: 0.16 },
  { Food: 0.32, Transport: 0.14, Utilities: 0.22, Entertainment: 0.16, Other: 0.16 },
  { Food: 0.29, Transport: 0.12, Utilities: 0.24, Entertainment: 0.2, Other: 0.15 },
];

function splitSpendings(total: number, monthIndex: number): Record<CategoryName, number> {
  const split = CATEGORY_SPLITS[monthIndex];
  const categories: Record<CategoryName, number> = {
    Food: Math.round(total * split.Food),
    Transport: Math.round(total * split.Transport),
    Utilities: Math.round(total * split.Utilities),
    Entertainment: Math.round(total * split.Entertainment),
    Other: 0,
  };

  const assigned = categories.Food + categories.Transport + categories.Utilities + categories.Entertainment;
  categories.Other = Math.max(0, total - assigned);

  return categories;
}

function buildYearReport(incomes: number[], spendings: number[]): YearReport {
  const year = {} as YearReport;

  MONTHS.forEach((month, index) => {
    year[month] = {
      income: incomes[index],
      spendings: spendings[index],
      categories: splitSpendings(spendings[index], index),
    };
  });

  return year;
}

const REPORT_DATA: Record<string, YearReport> = {
  "2025": buildYearReport(
    [2850, 2900, 3000, 3050, 3150, 3200, 3100, 3180, 3220, 3300, 3350, 3500],
    [1960, 2020, 2140, 2080, 2230, 2310, 2260, 2210, 2190, 2340, 2400, 2480]
  ),
  "2026": buildYearReport(
    [3000, 3080, 3150, 3220, 3320, 3400, 3360, 3440, 3480, 3560, 3620, 3740],
    [2100, 2180, 2240, 2200, 2350, 2420, 2380, 2440, 2470, 2520, 2590, 2680]
  ),
};

function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

export default function Reports() {
  const years = Object.keys(REPORT_DATA);
  const [selectedYear, setSelectedYear] = useState(years[years.length - 1]);
  const [selectedMonth, setSelectedMonth] = useState<MonthKey>("Mar");
  const [selectedMetric, setSelectedMetric] = useState<Metric>("spendings");
  const [mainChartType, setMainChartType] = useState<ChartKind>("line");
  const [selectedCategory, setSelectedCategory] = useState<CategoryName>("Food");

  const yearData = REPORT_DATA[selectedYear];

  const monthlyMetricData = MONTHS.reduce((result, month) => {
    const report = yearData[month];
    const value =
      selectedMetric === "income"
        ? report.income
        : selectedMetric === "net"
          ? report.income - report.spendings
          : report.spendings;
    result[month] = value;
    return result;
  }, {} as Record<string, number>);

  const monthDetails = yearData[selectedMonth];
  const monthNet = monthDetails.income - monthDetails.spendings;

  const categoryTrend = MONTHS.reduce((result, month) => {
    result[month] = yearData[month].categories[selectedCategory];
    return result;
  }, {} as Record<string, number>);

  const selectedMonthSummary = {
    Income: monthDetails.income,
    Spendings: monthDetails.spendings,
    Net: monthNet,
  };

  const annualIncome = MONTHS.reduce((sum, month) => sum + yearData[month].income, 0);
  const annualSpendings = MONTHS.reduce((sum, month) => sum + yearData[month].spendings, 0);
  const annualNet = annualIncome - annualSpendings;
  const savingsRate = annualIncome > 0 ? (annualNet / annualIncome) * 100 : 0;
  const averageMonthlySpendings = annualSpendings / MONTHS.length;

  const bestNetMonth = MONTHS.reduce((best, month) => {
    const value = yearData[month].income - yearData[month].spendings;
    if (!best || value > best.value) {
      return { month, value };
    }
    return best;
  }, null as { month: MonthKey; value: number } | null);

  const selectedMonthIndex = MONTHS.indexOf(selectedMonth);
  const previousMonth = selectedMonthIndex > 0 ? MONTHS[selectedMonthIndex - 1] : null;
  const currentMetricValue = monthlyMetricData[selectedMonth];
  const previousMetricValue = previousMonth ? monthlyMetricData[previousMonth] : null;
  const monthChange = previousMetricValue === null ? null : currentMetricValue - previousMetricValue;

  const metricLabel =
    selectedMetric === "income"
      ? "Income"
      : selectedMetric === "net"
        ? "Net"
        : "Spendings";

  const monthChangeLabel =
    monthChange === null
      ? "No prior month"
      : `${monthChange >= 0 ? "+" : ""}${formatCurrency(monthChange)} vs ${previousMonth}`;

  return (
    <div className={styles.container + ' container'}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Monthly Insights</h1>
          <p className={styles.subtitle}>Understand trends, compare months, and spot what drives your spendings.</p>
        </div>

        <div className={styles.controls}>
          <label className={styles.controlItem}>
            <span>Year</span>
            <select
              className={styles.select}
              value={selectedYear}
              onChange={(event) => setSelectedYear(event.target.value)}
            >
              {years.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </label>

          <label className={styles.controlItem}>
            <span>Month</span>
            <select
              className={styles.select}
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value as MonthKey)}
            >
              {MONTHS.map((month) => (
                <option key={month} value={month}>{month}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className={styles.toggleRow}>
        <div className={styles.toggleGroup}>
          <button
            type="button"
            className={`${styles.toggleButton} ${selectedMetric === "spendings" ? styles.toggleButtonActive : ""}`}
            onClick={() => setSelectedMetric("spendings")}
          >
            Spendings
          </button>
          <button
            type="button"
            className={`${styles.toggleButton} ${selectedMetric === "income" ? styles.toggleButtonActive : ""}`}
            onClick={() => setSelectedMetric("income")}
          >
            Income
          </button>
          <button
            type="button"
            className={`${styles.toggleButton} ${selectedMetric === "net" ? styles.toggleButtonActive : ""}`}
            onClick={() => setSelectedMetric("net")}
          >
            Net
          </button>
        </div>

        <div className={styles.toggleGroup}>
          <button
            type="button"
            className={`${styles.toggleButton} ${mainChartType === "line" ? styles.toggleButtonActive : ""}`}
            onClick={() => setMainChartType("line")}
          >
            Line
          </button>
          <button
            type="button"
            className={`${styles.toggleButton} ${mainChartType === "bar" ? styles.toggleButtonActive : ""}`}
            onClick={() => setMainChartType("bar")}
          >
            Bar
          </button>
        </div>
      </div>

      <div className={styles.summaryGrid}>
        <article className={styles.summaryCard}>
          <p>Annual Income</p>
          <h3>{formatCurrency(annualIncome)}</h3>
          <span>Across {selectedYear}</span>
        </article>

        <article className={styles.summaryCard}>
          <p>Annual Spendings</p>
          <h3>{formatCurrency(annualSpendings)}</h3>
          <span>Avg {formatCurrency(averageMonthlySpendings)} / month</span>
        </article>

        <article className={styles.summaryCard}>
          <p>Savings Rate</p>
          <h3>{formatPercentage(savingsRate)}</h3>
          <span>{formatCurrency(annualNet)} net this year</span>
        </article>

        <article className={styles.summaryCard}>
          <p>Best Net Month</p>
          <h3>{bestNetMonth?.month ?? "-"}</h3>
          <span>{bestNetMonth ? formatCurrency(bestNetMonth.value) : "No data"}</span>
        </article>
      </div>

      <section className={styles.chartSection}>
        <div className={styles.sectionHeader}>
          <h2>{metricLabel} Trend ({selectedYear})</h2>
          <p>{selectedMonth}: {formatCurrency(currentMetricValue)} · {monthChangeLabel}</p>
        </div>
        <div className={styles.chartFrameTall}>
          <Chart data={monthlyMetricData} type={mainChartType} showLegend={false} />
        </div>
      </section>

      <div className={styles.chartGrid}>
        <section className={styles.chartSection}>
          <div className={styles.sectionHeader}>
            <h2>{selectedMonth} Category Breakdown</h2>
            <p>See where your monthly spendings went.</p>
          </div>
          <div className={`${styles.chartFrame} ${styles.chartFrameRoomy}`}>
            <Chart data={monthDetails.categories} type="doughnut" legendSpacing="roomy" />
          </div>
        </section>

        <section className={styles.chartSection}>
          <div className={styles.sectionHeader}>
            <h2>{selectedMonth} Income vs Spendings</h2>
            <p>Quick balance snapshot for the selected month.</p>
          </div>
          <div className={styles.chartFrame}>
            <Chart data={selectedMonthSummary} type="bar" />
          </div>
        </section>
      </div>

      <section className={styles.chartSection}>
        <div className={styles.sectionHeader}> 
          <h2>Category Trend</h2>
          <div className={styles.inlineControl}>
            <label htmlFor="reports-category">Category</label>
            <select
              id="reports-category"
              className={styles.select}
              value={selectedCategory}
              onChange={(event) => setSelectedCategory(event.target.value as CategoryName)}
            >
              {Object.keys(monthDetails.categories).map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
        </div>
        <div className={styles.chartFrameTall}>
          <Chart data={categoryTrend} type="line" showLegend={false} />
        </div>
      </section>
    </div>
  );
}
