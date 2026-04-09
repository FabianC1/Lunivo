"use client";

import { useEffect, useMemo, useState } from "react";
import Chart from "../../components/Chart";
import PageLoading from "../../components/PageLoading";
import { readApiError } from "../../lib/apiClient";
import { DEMO_EMAIL, getSession } from "../../lib/auth";
import { formatCurrency } from "../../lib/utils";
import styles from "./reports.module.css";

type ReportsPayload = {
  planSlug: string;
  summaries: {
    annualIncome: number;
    annualSpendings: number;
    annualNet: number;
    savingsRate: number;
  };
  charts: {
    monthlyIncome: Record<string, number>;
    monthlySpendings: Record<string, number>;
    categoryBreakdown: Record<string, number>;
  };
};

const SAMPLE_REPORTS: ReportsPayload = {
  planSlug: "sync",
  summaries: {
    annualIncome: 41270,
    annualSpendings: 28580,
    annualNet: 12690,
    savingsRate: 30.75,
  },
  charts: {
    monthlyIncome: { Jan: 3000, Feb: 3080, Mar: 3150, Apr: 3220, May: 3320, Jun: 3400, Jul: 3360, Aug: 3440, Sep: 3480, Oct: 3560, Nov: 3620, Dec: 3740 },
    monthlySpendings: { Jan: 2100, Feb: 2180, Mar: 2240, Apr: 2200, May: 2350, Jun: 2420, Jul: 2380, Aug: 2440, Sep: 2470, Oct: 2520, Nov: 2590, Dec: 2680 },
    categoryBreakdown: { Food: 8240, Transport: 3920, Utilities: 6400, Entertainment: 4140, Emergencies: 2560, Other: 3320 },
  },
};

export default function ReportsPage() {
  const [data, setData] = useState<ReportsPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isUpgradeBlocked, setIsUpgradeBlocked] = useState(false);

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
        setIsUpgradeBlocked(false);

        const response = await fetch("/api/reports/summary?scope=detailed", { cache: "no-store" });
        if (response.status === 403) {
          const message = await readApiError(response, "Upgrade to Sync to unlock advanced reports.");
          if (isMounted) {
            setIsUpgradeBlocked(true);
            setError(message);
            setData(null);
          }
          return;
        }

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

  if (isLoading) {
    return <PageLoading message="Loading reports..." />;
  }

  return (
    <div className={styles.container + " container"}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Reports</h1>
          <p className={styles.subtitle}>Advanced breakdowns and planning views for deeper financial review.</p>
        </div>
      </div>

      {error ? (
        <section className={styles.chartSection}>
          <div className={styles.sectionHeader}>
            <div>
              <h2>{isUpgradeBlocked ? "Upgrade required" : "Unable to load reports"}</h2>
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
                  <h2>Plan access</h2>
                  <p>Your current reporting tier is {data.planSlug}.</p>
                </div>
              </div>
              <div className={styles.summaryGrid}>
                <article className={styles.summaryCard}>
                  <p>Detailed reporting</p>
                  <h3>Enabled</h3>
                  <span>Sync and Scale plans</span>
                </article>
                <article className={styles.summaryCard}>
                  <p>Forecasting</p>
                  <h3>Enabled</h3>
                  <span>Available on Sync and Scale</span>
                </article>
              </div>
            </section>
          </div>
        </>
      ) : null}
    </div>
  );
}
