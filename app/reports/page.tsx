"use client";

import { useEffect, useMemo, useState } from "react";
import Chart from "../../components/Chart";
import PageLoading from "../../components/PageLoading";
import { readApiError } from "../../lib/apiClient";
import { DEMO_EMAIL, getSession } from "../../lib/auth";
import { getSubscriptionPlanBySlug } from "../../lib/subscriptions";
import { formatCurrency } from "../../lib/utils";
import styles from "./reports.module.css";

type ReportsPayload = {
  planSlug: string;
  featureAccess: {
    netFlowPerMonth: boolean;
    endOfMonthBalanceEstimate: boolean;
    monthlySavingsEstimate: boolean;
    threeMonthAverageSpending: boolean;
    goalCompletionEstimate: boolean;
    csvExport: boolean;
  };
  summaries: {
    annualIncome: number;
    annualSpendings: number;
    annualNet: number;
    savingsRate: number;
    monthlySavingsEstimate: number;
    threeMonthAverageSpending: number;
    endOfMonthBalanceEstimate: number;
  };
  monthlySummary: {
    income: number;
    expenses: number;
    netSavings: number;
  };
  netFlowByMonth: Record<string, number>;
  goalEstimates: Array<{
    id: string;
    title: string;
    targetAmount: number;
    savedAmount: number;
    remainingAmount: number;
    completionMonthsAtCurrentRate: number | null;
    projectedCompletionDate: string | null;
    suggestedMonthlyContribution: number;
    manualContributionMonths: number | null;
  }>;
  charts: {
    monthlyIncome: Record<string, number>;
    monthlySpendings: Record<string, number>;
    categoryBreakdown: Record<string, number>;
    incomeSourceBreakdown: Record<string, number>;
    savingsProgress: Record<string, number>;
  };
};

const SAMPLE_REPORTS: ReportsPayload = {
  planSlug: "sync",
  featureAccess: {
    netFlowPerMonth: true,
    endOfMonthBalanceEstimate: true,
    monthlySavingsEstimate: true,
    threeMonthAverageSpending: true,
    goalCompletionEstimate: true,
    csvExport: false,
  },
  summaries: {
    annualIncome: 41270,
    annualSpendings: 28580,
    annualNet: 12690,
    savingsRate: 30.75,
    monthlySavingsEstimate: 1057.5,
    threeMonthAverageSpending: 2596.67,
    endOfMonthBalanceEstimate: 2150,
  },
  monthlySummary: {
    income: 3740,
    expenses: 2680,
    netSavings: 1060,
  },
  netFlowByMonth: { Jan: 900, Feb: 900, Mar: 910, Apr: 1020, May: 970, Jun: 980, Jul: 980, Aug: 1000, Sep: 1010, Oct: 1040, Nov: 1030, Dec: 1060 },
  goalEstimates: [
    {
      id: "demo-goal",
      title: "Emergency Fund",
      targetAmount: 6000,
      savedAmount: 2800,
      remainingAmount: 3200,
      completionMonthsAtCurrentRate: 3,
      projectedCompletionDate: "2026-07-01",
      suggestedMonthlyContribution: 1060,
      manualContributionMonths: 4,
    },
  ],
  charts: {
    monthlyIncome: { Jan: 3000, Feb: 3080, Mar: 3150, Apr: 3220, May: 3320, Jun: 3400, Jul: 3360, Aug: 3440, Sep: 3480, Oct: 3560, Nov: 3620, Dec: 3740 },
    monthlySpendings: { Jan: 2100, Feb: 2180, Mar: 2240, Apr: 2200, May: 2350, Jun: 2420, Jul: 2380, Aug: 2440, Sep: 2470, Oct: 2520, Nov: 2590, Dec: 2680 },
    categoryBreakdown: { Food: 8240, Transport: 3920, Utilities: 6400, Entertainment: 4140, Emergencies: 2560, Other: 3320 },
    incomeSourceBreakdown: { Salary: 36600, Freelance: 3270, Bonus: 1400 },
    savingsProgress: { Jan: 900, Feb: 1800, Mar: 2710, Apr: 3730, May: 4700, Jun: 5680, Jul: 6660, Aug: 7660, Sep: 8670, Oct: 9710, Nov: 10740, Dec: 11800 },
  },
};

export default function ReportsPage() {
  const [data, setData] = useState<ReportsPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [manualContributions, setManualContributions] = useState<Record<string, string>>({});

  useEffect(() => {
    const session = getSession();
    const normalizedEmail = session?.email.trim().toLowerCase() ?? "";
    const shouldUseSampleData = session?.isDemo || normalizedEmail === DEMO_EMAIL;

    if (shouldUseSampleData) {
      setData(SAMPLE_REPORTS);
      setError("");
      setIsLoading(false);
      return;
    }

    if (!session?.userId) {
      setData(null);
      setError("Sign in to load reports.");
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    async function loadReports() {
      try {
        setIsLoading(true);
        setError("");

        const response = await fetch("/api/reports/summary?scope=detailed", { cache: "no-store" });

        if (!response.ok) {
          throw new Error(await readApiError(response, "Failed to load reports."));
        }

        const payload = await response.json();
        if (isMounted) {
          setData(payload);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load reports.");
          setData(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadReports();

    return () => {
      isMounted = false;
    };
  }, []);

  const summaryCards = useMemo(() => {
    if (!data) {
      return [];
    }

    return [
      { title: "Recorded Income", value: formatCurrency(data.summaries.annualIncome), note: "Across the selected reporting year" },
      { title: "Recorded Spendings", value: formatCurrency(data.summaries.annualSpendings), note: "Across the selected reporting year" },
      { title: "Net Position", value: formatCurrency(data.summaries.annualNet), note: "Income minus spendings" },
      { title: "Savings Rate", value: `${data.summaries.savingsRate.toFixed(1)}%`, note: "Based on recorded income" },
    ];
  }, [data]);

  function downloadCsv(filename: string, rows: Array<Array<string | number>>) {
    const csv = rows.map((row) => row.map((value) => `"${String(value).split("\"").join('""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  function exportMonthlySummary() {
    if (!data?.featureAccess.csvExport) {
      return;
    }

    downloadCsv("monthly-summary.csv", [
      ["Metric", "Amount"],
      ["Income", data.monthlySummary.income],
      ["Expenses", data.monthlySummary.expenses],
      ["Net savings", data.monthlySummary.netSavings],
    ]);
  }

  function exportCategoryBreakdown() {
    if (!data?.featureAccess.csvExport) {
      return;
    }

    downloadCsv("category-breakdown.csv", [
      ["Category", "Amount"],
      ...Object.entries(data.charts.categoryBreakdown).map(([category, amount]) => [category, amount]),
    ]);
  }

  const currentPlanName = data ? getSubscriptionPlanBySlug(data.planSlug)?.name ?? data.planSlug : "";

  if (isLoading) {
    return <PageLoading message="Loading reports..." />;
  }

  return (
    <div className={styles.container + " container"}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Reports</h1>
          <p className={styles.subtitle}>Monthly summaries, income breakdowns, forecasting, and planning views based on your current plan.</p>
        </div>
        <div className={styles.actionRow}>
          <button type="button" className={styles.secondaryButton} onClick={exportMonthlySummary} disabled={!data?.featureAccess.csvExport}>
            Export monthly summary CSV
          </button>
          <button type="button" className={styles.secondaryButton} onClick={exportCategoryBreakdown} disabled={!data?.featureAccess.csvExport}>
            Export category breakdown CSV
          </button>
        </div>
      </div>

      {error ? (
        <section className={styles.chartSection}>
          <div className={styles.sectionHeader}>
            <div>
              <h2>Unable to load reports</h2>
              <p>{error}</p>
            </div>
          </div>
        </section>
      ) : null}

      {data ? (
        <>
          <div className={styles.summaryGrid}>
            {summaryCards.map((card) => (
              <article key={card.title} className={styles.summaryCard}>
                <p>{card.title}</p>
                <h3>{card.value}</h3>
                <span>{card.note}</span>
              </article>
            ))}
          </div>

          <div className={styles.chartGrid}>
            <section className={styles.chartSection}>
              <div className={styles.sectionHeader}>
                <div>
                  <h2>Monthly summary view</h2>
                  <p>Income, expenses, and net savings in one place.</p>
                </div>
              </div>
              <div className={styles.summaryGrid}>
                <article className={styles.summaryCard}>
                  <p>Income</p>
                  <h3>{formatCurrency(data.monthlySummary.income)}</h3>
                  <span>Current summary month</span>
                </article>
                <article className={styles.summaryCard}>
                  <p>Expenses</p>
                  <h3>{formatCurrency(data.monthlySummary.expenses)}</h3>
                  <span>Current summary month</span>
                </article>
                <article className={styles.summaryCard}>
                  <p>Net savings</p>
                  <h3>{formatCurrency(data.monthlySummary.netSavings)}</h3>
                  <span>Income minus expenses</span>
                </article>
              </div>
            </section>

            <section className={styles.chartSection}>
              <div className={styles.sectionHeader}>
                <div>
                  <h2>Income by month</h2>
                  <p>Server-aggregated monthly totals for faster reporting on larger histories.</p>
                </div>
              </div>
              <div className={styles.chartFrameTall}>
                <Chart data={data.charts.monthlyIncome} type="bar" />
              </div>
            </section>

            <section className={styles.chartSection}>
              <div className={styles.sectionHeader}>
                <div>
                  <h2>Income source breakdown</h2>
                  <p>See salary, freelance, and other recorded sources by value and share.</p>
                </div>
              </div>
              <div className={styles.chartFrame}>
                <Chart data={data.charts.incomeSourceBreakdown} type="doughnut" />
              </div>
            </section>

            <section className={styles.chartSection}>
              <div className={styles.sectionHeader}>
                <div>
                  <h2>Spending by category</h2>
                  <p>Annual category mix pulled from the reporting summary endpoint.</p>
                </div>
              </div>
              <div className={styles.chartFrame}>
                <Chart data={data.charts.categoryBreakdown} type="doughnut" />
              </div>
            </section>

            <section className={styles.chartSection}>
              <div className={styles.sectionHeader}>
                <div>
                  <h2>Spendings by month</h2>
                  <p>Use this to review periods with sustained increases before adjusting budgets.</p>
                </div>
              </div>
              <div className={styles.chartFrameTall}>
                <Chart data={data.charts.monthlySpendings} type="line" />
              </div>
            </section>

            <section className={styles.chartSection}>
              <div className={styles.sectionHeader}>
                <div>
                  <h2>Savings progress chart</h2>
                  <p>Track cumulative savings progress across the year.</p>
                </div>
              </div>
              <div className={styles.chartFrameTall}>
                <Chart data={data.charts.savingsProgress} type="line" showLegend={false} />
              </div>
            </section>

            <section className={styles.chartSection}>
              <div className={styles.sectionHeader}>
                <div>
                  <h2>Forecasting tools</h2>
                  <p>Your current reporting tier is {currentPlanName}.</p>
                </div>
              </div>
              <div className={styles.summaryGrid}>
                <article className={styles.summaryCard}>
                  <p>Net flow per month</p>
                  <h3>{data.featureAccess.netFlowPerMonth ? "Enabled" : "Locked"}</h3>
                  <span>{data.featureAccess.netFlowPerMonth ? "Monthly cashflow chart available below" : "Upgrade to Smart"}</span>
                </article>
                <article className={styles.summaryCard}>
                  <p>End-of-month balance estimate</p>
                  <h3>{data.featureAccess.endOfMonthBalanceEstimate ? formatCurrency(data.summaries.endOfMonthBalanceEstimate) : "Locked"}</h3>
                  <span>{data.featureAccess.endOfMonthBalanceEstimate ? "Current balance plus expected income minus average daily spend" : "Upgrade to Smart"}</span>
                </article>
                <article className={styles.summaryCard}>
                  <p>Monthly savings estimate</p>
                  <h3>{data.featureAccess.monthlySavingsEstimate ? formatCurrency(data.summaries.monthlySavingsEstimate) : "Locked"}</h3>
                  <span>{data.featureAccess.monthlySavingsEstimate ? "Income minus expenses" : "Upgrade to Smart"}</span>
                </article>
                <article className={styles.summaryCard}>
                  <p>3-month average spending</p>
                  <h3>{data.featureAccess.threeMonthAverageSpending ? formatCurrency(data.summaries.threeMonthAverageSpending) : "Locked"}</h3>
                  <span>{data.featureAccess.threeMonthAverageSpending ? "Latest rolling three months" : "Upgrade to Smart"}</span>
                </article>
              </div>
            </section>

            <section className={styles.chartSection}>
              <div className={styles.sectionHeader}>
                <div>
                  <h2>Net flow by month</h2>
                  <p>Positive and negative cash flow across the reporting year.</p>
                </div>
              </div>
              {data.featureAccess.netFlowPerMonth ? (
                <div className={styles.chartFrameTall}>
                  <Chart data={data.netFlowByMonth} type="bar" showLegend={false} />
                </div>
              ) : (
                <p className={styles.lockedMessage}>Upgrade to Smart to unlock monthly net flow forecasting.</p>
              )}
            </section>

            <section className={styles.chartSection}>
              <div className={styles.sectionHeader}>
                <div>
                  <h2>Goal completion estimate</h2>
                  <p>Use your current savings rate or enter a manual monthly contribution to project completion dates.</p>
                </div>
              </div>
              {data.goalEstimates.length === 0 ? (
                <p>No active goals yet. Add one in the goals page to see completion estimates.</p>
              ) : data.goalEstimates.map((goal) => {
                const manualContribution = Number(manualContributions[goal.id] || goal.suggestedMonthlyContribution || 0);
                const manualMonths = manualContribution > 0 ? Math.ceil(goal.remainingAmount / manualContribution) : null;
                const manualDate = manualMonths === null ? null : new Date(new Date().setMonth(new Date().getMonth() + manualMonths)).toISOString().slice(0, 10);
                return (
                  <div key={goal.id} className={styles.goalEstimateCard}>
                    <div>
                      <h3>{goal.title}</h3>
                      <p>{formatCurrency(goal.savedAmount)} saved of {formatCurrency(goal.targetAmount)}</p>
                      <p>
                        {data.featureAccess.goalCompletionEstimate && goal.completionMonthsAtCurrentRate !== null
                          ? `You'll reach ${formatCurrency(goal.targetAmount)} in about ${goal.completionMonthsAtCurrentRate} months at your current rate.`
                          : "Upgrade to Smart to unlock automatic completion estimates."}
                      </p>
                    </div>
                    <div className={styles.inlineControl}>
                      <label htmlFor={`goal-${goal.id}`}>Manual monthly contribution</label>
                      <input
                        id={`goal-${goal.id}`}
                        className={styles.select}
                        type="number"
                        min="0"
                        step="0.01"
                        value={manualContributions[goal.id] ?? String(goal.suggestedMonthlyContribution)}
                        onChange={(event) => setManualContributions((prev) => ({ ...prev, [goal.id]: event.target.value }))}
                      />
                    </div>
                    <p>{manualMonths === null ? "Enter a contribution amount to calculate a completion date." : `At ${formatCurrency(manualContribution)}/month, projected completion is ${manualDate}.`}</p>
                  </div>
                );
              })}
            </section>
          </div>
        </>
      ) : null}
    </div>
  );
}
