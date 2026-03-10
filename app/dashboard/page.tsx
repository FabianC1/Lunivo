"use client";

import styles from "./dashboard.module.css";
import Chart from "../../components/Chart";
import { formatCurrency } from "../../lib/utils";
import { useState } from "react";

const dummyTransactions = [
  { category: "Food", amount: 45.2 },
  { category: "Transport", amount: 12 },
  { category: "Utilities", amount: 100 },
  { category: "Income", amount: 2000 },
  { category: "Other", amount: 60 },
];

export default function Dashboard() {
  const [transactions] = useState(dummyTransactions);

  const totalIncome = transactions
    .filter((t) => t.category === "Income")
    .reduce((sum, t) => sum + t.amount, 0);
  const totalSpending = transactions
    .filter((t) => t.category !== "Income")
    .reduce((sum, t) => sum + t.amount, 0);
  const balance = totalIncome - totalSpending;

  const spendingByCategory: Record<string, number> = {};
  transactions.forEach((t) => {
    if (t.category === "Income") return;
    spendingByCategory[t.category] =
      (spendingByCategory[t.category] || 0) + t.amount;
  });

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Dashboard</h1>
      <div className={styles.summary}>
        <div className={styles.card}>
          <p>Total Income</p>
          <h2>{formatCurrency(totalIncome)}</h2>
        </div>
        <div className={styles.card}>
          <p>Total Spending</p>
          <h2>{formatCurrency(totalSpending)}</h2>
        </div>
        <div className={styles.card}>
          <p>Balance</p>
          <h2>{formatCurrency(balance)}</h2>
        </div>
      </div>
      <div className={styles.chartSection}>
        <h2>Spending by Category</h2>
        <Chart data={spendingByCategory} />
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