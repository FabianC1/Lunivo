"use client";

import { useState } from "react";
import styles from "./dashboard.module.css";
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

function formatSignedPercentage(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "N/A";
  }

  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

export default function Dashboard() {
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
  const spendingsRate = annualIncome > 0 ? (annualSpendings / annualIncome) * 100 : 0;
  const averageMonthlySpendings = annualSpendings / MONTHS.length;

  const bestNetMonth = MONTHS.reduce((best, month) => {
    const value = yearData[month].income - yearData[month].spendings;
    if (!best || value > best.value) {
      return { month, value };
    }
    return best;
  }, null as { month: MonthKey; value: number } | null);

  const selectedMonthIndex = MONTHS.indexOf(selectedMonth);
  const selectedYearIndex = years.indexOf(selectedYear);
  const previousYear = selectedYearIndex > 0 ? years[selectedYearIndex - 1] : null;
  const previousYearData = previousYear ? REPORT_DATA[previousYear] : null;
  const previousAnnualIncome = previousYearData
    ? MONTHS.reduce((sum, month) => sum + previousYearData[month].income, 0)
    : null;
  const previousAnnualSpendings = previousYearData
    ? MONTHS.reduce((sum, month) => sum + previousYearData[month].spendings, 0)
    : null;
  const annualIncomeGrowth = previousAnnualIncome && previousAnnualIncome > 0
    ? ((annualIncome - previousAnnualIncome) / previousAnnualIncome) * 100
    : null;
  const annualSpendingsGrowth = previousAnnualSpendings && previousAnnualSpendings > 0
    ? ((annualSpendings - previousAnnualSpendings) / previousAnnualSpendings) * 100
    : null;
  const previousMonth = selectedMonthIndex > 0 ? MONTHS[selectedMonthIndex - 1] : null;
  const currentMetricValue = monthlyMetricData[selectedMonth];
  const previousMetricValue = previousMonth ? monthlyMetricData[previousMonth] : null;
  const monthChange = previousMetricValue === null ? null : currentMetricValue - previousMetricValue;
  const bestNetMonthShare = bestNetMonth && annualNet > 0 ? (bestNetMonth.value / annualNet) * 100 : null;

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
          <h1 className={styles.title}>Dashboard</h1>
          <p className={styles.subtitle}>Monthly insights, trends, and reports in one place.</p>
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
          <h3 className={styles.summaryValue}>
            <span className={styles.defaultValue}>{formatCurrency(annualIncome)}</span>
            <span className={styles.hoverValue}>{formatSignedPercentage(annualIncomeGrowth)}</span>
          </h3>
          <span className={styles.summaryMeta}>
            <span className={styles.defaultValue}>Across {selectedYear}</span>
            <span className={styles.hoverValue}>{previousYear ? `vs ${previousYear}` : "No prior year"}</span>
          </span>
        </article>

        <article className={styles.summaryCard}>
          <p>Annual Spendings</p>
          <h3 className={styles.summaryValue}>
            <span className={styles.defaultValue}>{formatCurrency(annualSpendings)}</span>
            <span className={styles.hoverValue}>{formatSignedPercentage(annualSpendingsGrowth)}</span>
          </h3>
          <span className={styles.summaryMeta}>
            <span className={styles.defaultValue}>Avg {formatCurrency(averageMonthlySpendings)} / month</span>
            <span className={styles.hoverValue}>{previousYear ? `vs ${previousYear}` : "No prior year"}</span>
          </span>
        </article>

        <article className={styles.summaryCard}>
          <p>Savings Rate</p>
          <h3 className={styles.summaryValue}>
            <span className={styles.defaultValue}>{formatPercentage(savingsRate)}</span>
            <span className={styles.hoverValue}>{formatPercentage(spendingsRate)}</span>
          </h3>
          <span className={styles.summaryMeta}>
            <span className={styles.defaultValue}>{formatCurrency(annualNet)} net this year</span>
            <span className={styles.hoverValue}>Spent {formatPercentage(spendingsRate)} of income</span>
          </span>
        </article>

        <article className={styles.summaryCard}>
          <p>Best Net Month</p>
          <h3 className={styles.summaryValue}>
            <span className={styles.defaultValue}>{bestNetMonth?.month ?? "-"}</span>
            <span className={styles.hoverValue}>{bestNetMonth?.month ?? "-"}</span>
          </h3>
          <span className={styles.summaryMeta}>
            <span className={styles.defaultValue}>{bestNetMonth ? formatCurrency(bestNetMonth.value) : "No data"}</span>
            <span className={styles.hoverValue}>{bestNetMonthShare !== null ? `${formatPercentage(bestNetMonthShare)} of yearly net` : "No data"}</span>
          </span>
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
            <label htmlFor="dashboard-category">Category</label>
            <select
              id="dashboard-category"
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
}[{
	"resource": "/workspaces/Lunivo/components/Chart.tsx",
	"owner": "typescript",
	"code": "2322",
	"severity": 8,
	"message": "Type '{ responsive: boolean; maintainAspectRatio: boolean; cutout: string; plugins: { legend: { position: \"bottom\"; labels: { color: string; font: { size: number; weight: string; }; padding: number; usePointStyle: boolean; pointStyle: string; }; }; tooltip: { ...; }; }; }' is not assignable to type '_DeepPartialObject<CoreChartOptions<\"doughnut\"> & ElementChartOptions<\"doughnut\"> & PluginChartOptions<\"doughnut\"> & DatasetChartOptions<\"doughnut\"> & ScaleChartOptions<...> & DoughnutControllerChartOptions>'.\n  The types of 'plugins.legend.labels.font' are incompatible between these types.\n    Type '{ size: number; weight: string; }' is not assignable to type '((ctx: ScriptableChartContext, options: AnyObject) => Partial<FontSpec> | undefined) | _DeepPartialObject<Partial<FontSpec>> | _DeepPartialObject<...> | undefined'.\n      Type '{ size: number; weight: string; }' is not assignable to type '_DeepPartialObject<ScriptableOptions<Partial<FontSpec>, ScriptableChartContext>>'.\n        Types of property 'weight' are incompatible.\n          Type 'string' is not assignable to type 'number | \"bold\" | \"normal\" | \"lighter\" | \"bolder\" | ((ctx: ScriptableChartContext, options: AnyObject) => number | \"bold\" | \"normal\" | \"lighter\" | \"bolder\" | null | undefined) | null | undefined'.",
	"source": "ts",
	"startLineNumber": 120,
	"startColumn": 34,
	"endLineNumber": 120,
	"endColumn": 41,
	"relatedInformation": [
		{
			"startLineNumber": 19,
			"startColumn": 5,
			"endLineNumber": 19,
			"endColumn": 12,
			"message": "The expected type comes from property 'options' which is declared here on type 'IntrinsicAttributes & Omit<ChartProps<\"doughnut\", number[], string>, \"type\"> & { ref?: ForwardedRef<ChartJSOrUndefined<\"doughnut\", number[], string>> | undefined; }'",
			"resource": "/workspaces/Lunivo/node_modules/react-chartjs-2/dist/types.d.ts"
		}
	],
	"modelVersionId": 14,
	"origin": "extHost2"
}]