"use client";

import { useState } from "react";
import styles from "./dashboard.module.css";
import Chart from "../../components/Chart";
import { formatCurrency } from "../../lib/utils";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"] as const;
type MonthKey = (typeof MONTHS)[number];
type TrendMetric = "income" | "spendings" | "net";
type ChartKind = "bar" | "line";

interface MonthData {
  income: number;
  spendings: Record<string, number>;
}

const MONTH_DATA: Record<MonthKey, MonthData> = {
  Jan: { income: 3000, spendings: { Food: 315, Transport: 148, Utilities: 290, Entertainment: 162, Other: 105 } },
  Feb: { income: 3080, spendings: { Food: 308, Transport: 136, Utilities: 295, Entertainment: 174, Other: 117 } },
  Mar: { income: 3150, spendings: { Food: 328, Transport: 142, Utilities: 278, Entertainment: 180, Other: 112 } },
  Apr: { income: 3220, spendings: { Food: 302, Transport: 134, Utilities: 280, Entertainment: 196, Other: 118 } },
  May: { income: 3320, spendings: { Food: 298, Transport: 132, Utilities: 285, Entertainment: 218, Other: 117 } },
  Jun: { income: 3400, spendings: { Food: 322, Transport: 152, Utilities: 268, Entertainment: 210, Other: 108 } },
  Jul: { income: 3360, spendings: { Food: 330, Transport: 143, Utilities: 262, Entertainment: 206, Other: 109 } },
  Aug: { income: 3440, spendings: { Food: 318, Transport: 128, Utilities: 276, Entertainment: 202, Other: 116 } },
  Sep: { income: 3480, spendings: { Food: 322, Transport: 133, Utilities: 274, Entertainment: 194, Other: 117 } },
  Oct: { income: 3560, spendings: { Food: 338, Transport: 148, Utilities: 272, Entertainment: 172, Other: 130 } },
  Nov: { income: 3620, spendings: { Food: 340, Transport: 151, Utilities: 278, Entertainment: 175, Other: 126 } },
  Dec: { income: 3740, spendings: { Food: 300, Transport: 130, Utilities: 288, Entertainment: 212, Other: 120 } },
};

const RECENT_TRANSACTIONS = [
  { id: 1, date: "18 Mar 2026", description: "Groceries",    category: "Food",          amount: -42.5  },
  { id: 2, date: "17 Mar 2026", description: "Salary",       category: "Income",        amount:  3000  },
  { id: 3, date: "15 Mar 2026", description: "Electricity",  category: "Utilities",     amount: -95.0  },
  { id: 4, date: "14 Mar 2026", description: "Bus pass",     category: "Transport",     amount: -35.0  },
  { id: 5, date: "12 Mar 2026", description: "Netflix",      category: "Entertainment", amount: -15.99 },
  { id: 6, date: "10 Mar 2026", description: "Freelance",    category: "Income",        amount:  750   },
];

const CATEGORY_COLORS: Record<string, string> = {
  Food: "#3B82F6",
  Transport: "#10B981",
  Utilities: "#FBBF24",
  Entertainment: "#EF4444",
  Other: "#8B5CF6",
  Income: "#22C55E",
};

export default function Dashboard() {
  const [selectedMonth, setSelectedMonth] = useState<MonthKey>("Mar");
  const [trendMetric, setTrendMetric] = useState<TrendMetric>("spendings");
  const [trendChart, setTrendChart] = useState<ChartKind>("bar");

  const monthData = MONTH_DATA[selectedMonth];
  const totalSpendings = Object.values(monthData.spendings).reduce((s, v) => s + v, 0);
  const balance = monthData.income - totalSpendings;
  const savingsRate = monthData.income > 0 ? ((balance / monthData.income) * 100).toFixed(1) : "0.0";
  const topCategory = Object.entries(monthData.spendings).sort(([, a], [, b]) => b - a)[0];

  const trendData = MONTHS.reduce((acc, m) => {
    const d = MONTH_DATA[m];
    const spend = Object.values(d.spendings).reduce((s, v) => s + v, 0);
    acc[m] =
      trendMetric === "income" ? d.income :
      trendMetric === "net"    ? d.income - spend :
      spend;
    return acc;
  }, {} as Record<string, number>);

  const trendLabel =
    trendMetric === "income" ? "Income Trend (2026)" :
    trendMetric === "net"    ? "Net Savings Trend (2026)" :
    "Spending Trend (2026)";

  return (
    <div className={styles.container + " container"}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Dashboard</h1>
          <p className={styles.subtitle}>Your complete financial snapshot for 2026.</p>
        </div>
        <label className={styles.controlItem}>
          <span>Month</span>
          <select
            className={styles.select}
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value as MonthKey)}
          >
            {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </label>
      </div>

      <div className={styles.kpiGrid}>
        <article className={styles.kpiCard}>
          <p>Balance</p>
          <h3 className={balance >= 0 ? styles.positive : styles.negative}>{formatCurrency(balance)}</h3>
          <span>{selectedMonth} net savings</span>
        </article>
        <article className={styles.kpiCard}>
          <p>Income</p>
          <h3>{formatCurrency(monthData.income)}</h3>
          <span>This month</span>
        </article>
        <article className={styles.kpiCard}>
          <p>Spendings</p>
          <h3>{formatCurrency(totalSpendings)}</h3>
          <span>Across {Object.keys(monthData.spendings).length} categories</span>
        </article>
        <article className={styles.kpiCard}>
          <p>Savings Rate</p>
          <h3>{savingsRate}%</h3>
          <span>of income saved</span>
        </article>
        <article className={styles.kpiCard}>
          <p>Top Category</p>
          <h3>{topCategory[0]}</h3>
          <span>{formatCurrency(topCategory[1])} this month</span>
        </article>
      </div>

      <section className={styles.chartSection}>
        <div className={styles.sectionHeader}>
          <div>
            <h2>{trendLabel}</h2>
            <p>Compare across all months of the year.</p>
          </div>
          <div className={styles.controlsRow}>
            <div className={styles.toggleGroup}>
              {(["income", "spendings", "net"] as TrendMetric[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  className={`${styles.toggleButton} ${trendMetric === m ? styles.toggleButtonActive : ""}`}
                  onClick={() => setTrendMetric(m)}
                >
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </button>
              ))}
            </div>
            <div className={styles.toggleGroup}>
              <button type="button" className={`${styles.toggleButton} ${trendChart === "bar" ? styles.toggleButtonActive : ""}`} onClick={() => setTrendChart("bar")}>Bar</button>
              <button type="button" className={`${styles.toggleButton} ${trendChart === "line" ? styles.toggleButtonActive : ""}`} onClick={() => setTrendChart("line")}>Line</button>
            </div>
          </div>
        </div>
        <div className={styles.chartFrameTall}>
          <Chart data={trendData} type={trendChart} showLegend={false} />
        </div>
      </section>

      <div className={styles.chartGrid}>
        <section className={styles.chartSection}>
          <div className={styles.sectionHeader}>
            <div>
              <h2>{selectedMonth} Breakdown</h2>
              <p>Where your money went this month.</p>
            </div>
          </div>
          <div className={`${styles.chartFrame} ${styles.chartFrameRoomy}`}>
            <Chart data={monthData.spendings} type="doughnut" legendSpacing="roomy" />
          </div>
        </section>

        <section className={styles.chartSection}>
          <div className={styles.sectionHeader}>
            <div>
              <h2>Recent Activity</h2>
              <p>Your 6 most recent transactions.</p>
            </div>
          </div>
          <ul className={styles.activityList}>
            {RECENT_TRANSACTIONS.map((t) => (
              <li key={t.id} className={styles.activityItem}>
                <span
                  className={styles.activityDot}
                  style={{ background: CATEGORY_COLORS[t.category] ?? "#8B5CF6" }}
                />
                <div className={styles.activityInfo}>
                  <span className={styles.activityDesc}>{t.description}</span>
                  <span className={styles.activityDate}>{t.date} · {t.category}</span>
                </div>
                <span className={t.amount >= 0 ? styles.activityPos : styles.activityNeg}>
                  {t.amount >= 0 ? "+" : ""}{formatCurrency(Math.abs(t.amount))}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
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