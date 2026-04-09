"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./dashboard.module.css";
import Chart from "../../components/Chart";
import PageLoading from "../../components/PageLoading";
import { readApiError } from "../../lib/apiClient";
import { DEMO_EMAIL, getSession } from "../../lib/auth";
import { initialBudgets } from "../../lib/budgets";
import { FREE_PLAN, getSubscriptionPlanBySlug, hasFeatureAccess } from "../../lib/subscriptions";
import { DEFAULT_DASHBOARD_SETTINGS, type DashboardSettings, type DashboardWidgetKey } from "../../lib/userSettings";
import { formatCurrency } from "../../lib/utils";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;
type MonthKey = (typeof MONTHS)[number];
type Metric = "spendings" | "income" | "net";
type ChartKind = "line" | "bar";
type CategoryName = string;

type GoalPreview = {
  id: string;
  title: string;
  targetAmount: number;
  savedAmount: number;
  targetDate: string;
};

type ProfileSettingsPayload = {
  user?: {
    planSlug?: string;
    dashboard?: DashboardSettings;
  };
};

interface MonthReport {
  income: number;
  spendings: number;
  categories: Record<CategoryName, number>;
}

type YearReport = Record<MonthKey, MonthReport>;

const CATEGORY_SPLITS: Record<CategoryName, number>[] = [
  { Food: 0.3, Transport: 0.14, Utilities: 0.22, Entertainment: 0.16, Emergencies: 0.1, Other: 0.08 },
  { Food: 0.29, Transport: 0.13, Utilities: 0.23, Entertainment: 0.17, Emergencies: 0.1, Other: 0.08 },
  { Food: 0.31, Transport: 0.14, Utilities: 0.21, Entertainment: 0.17, Emergencies: 0.09, Other: 0.08 },
  { Food: 0.28, Transport: 0.13, Utilities: 0.22, Entertainment: 0.19, Emergencies: 0.1, Other: 0.08 },
  { Food: 0.27, Transport: 0.13, Utilities: 0.22, Entertainment: 0.2, Emergencies: 0.1, Other: 0.08 },
  { Food: 0.29, Transport: 0.15, Utilities: 0.2, Entertainment: 0.19, Emergencies: 0.1, Other: 0.07 },
  { Food: 0.3, Transport: 0.14, Utilities: 0.2, Entertainment: 0.19, Emergencies: 0.1, Other: 0.07 },
  { Food: 0.28, Transport: 0.12, Utilities: 0.23, Entertainment: 0.19, Emergencies: 0.1, Other: 0.08 },
  { Food: 0.29, Transport: 0.13, Utilities: 0.22, Entertainment: 0.18, Emergencies: 0.1, Other: 0.08 },
  { Food: 0.31, Transport: 0.14, Utilities: 0.21, Entertainment: 0.16, Emergencies: 0.1, Other: 0.08 },
  { Food: 0.3, Transport: 0.14, Utilities: 0.22, Entertainment: 0.16, Emergencies: 0.1, Other: 0.08 },
  { Food: 0.27, Transport: 0.12, Utilities: 0.24, Entertainment: 0.19, Emergencies: 0.1, Other: 0.08 },
];

function splitSpendings(total: number, monthIndex: number): Record<CategoryName, number> {
  const split = CATEGORY_SPLITS[monthIndex];
  const categories: Record<CategoryName, number> = {
    Food: Math.round(total * split.Food),
    Transport: Math.round(total * split.Transport),
    Utilities: Math.round(total * split.Utilities),
    Entertainment: Math.round(total * split.Entertainment),
    Emergencies: Math.round(total * split.Emergencies),
    Other: 0,
  };

  const assigned =
    categories.Food +
    categories.Transport +
    categories.Utilities +
    categories.Entertainment +
    categories.Emergencies;
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

const SAMPLE_REPORT_DATA: Record<string, YearReport> = {
  "2025": buildYearReport(
    [2850, 2900, 3000, 3050, 3150, 3200, 3100, 3180, 3220, 3300, 3350, 3500],
    [1960, 2020, 2140, 2080, 2230, 2310, 2260, 2210, 2190, 2340, 2400, 2480]
  ),
  "2026": buildYearReport(
    [3000, 3080, 3150, 3220, 3320, 3400, 3360, 3440, 3480, 3560, 3620, 3740],
    [2100, 2180, 2240, 2200, 2350, 2420, 2380, 2440, 2470, 2520, 2590, 2680]
  ),
};

const DEFAULT_DASHBOARD_CATEGORIES = Object.keys(initialBudgets);

function createEmptyYearReport(categories: string[] = DEFAULT_DASHBOARD_CATEGORIES): YearReport {
  return MONTHS.reduce((report, month) => {
    report[month] = {
      income: 0,
      spendings: 0,
      categories: Object.fromEntries(categories.map((category) => [category, 0])),
    };
    return report;
  }, {} as YearReport);
}

function createEmptyReportData(years: string[], categories?: string[]) {
  return years.reduce((report, year) => {
    report[year] = createEmptyYearReport(categories);
    return report;
  }, {} as Record<string, YearReport>);
}

function getCurrentMonthKey(): MonthKey {
  return MONTHS[new Date().getMonth()] ?? "Jan";
}

function getTransactionYear(value: string) {
  return value.slice(0, 4);
}

function getTransactionMonth(value: string): MonthKey | null {
  const monthIndex = Number(value.slice(5, 7)) - 1;
  return MONTHS[monthIndex] ?? null;
}

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
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [reportData, setReportData] = useState<Record<string, YearReport>>({});
  const [currentPlanSlug, setCurrentPlanSlug] = useState("free");
  const [dashboardSettings, setDashboardSettings] = useState<DashboardSettings>(DEFAULT_DASHBOARD_SETTINGS);
  const [goalPreview, setGoalPreview] = useState<GoalPreview[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Array<{ id: string; date: string; category: string; amount: number }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [usesSampleData, setUsesSampleData] = useState(false);
  const years = useMemo(
    () => Object.keys(reportData).sort((left, right) => left.localeCompare(right)),
    [reportData]
  );
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
  const [selectedMonth, setSelectedMonth] = useState<MonthKey>(getCurrentMonthKey());
  const [selectedMetric, setSelectedMetric] = useState<Metric>("spendings");
  const [mainChartType, setMainChartType] = useState<ChartKind>("line");
  const [selectedCategory, setSelectedCategory] = useState<CategoryName>(DEFAULT_DASHBOARD_CATEGORIES[0]);

  useEffect(() => {
    const session = getSession();
    const normalizedEmail = session?.email.trim().toLowerCase() ?? "";
    const shouldUseSampleData = session?.isDemo || normalizedEmail === DEMO_EMAIL;
    setSessionUserId(session?.isDemo ? null : session?.userId ?? null);
    setUsesSampleData(Boolean(shouldUseSampleData));

    if (shouldUseSampleData) {
      setReportData(SAMPLE_REPORT_DATA);
      setCurrentPlanSlug("sync");
      setDashboardSettings(DEFAULT_DASHBOARD_SETTINGS);
      setGoalPreview([
        { id: "goal-1", title: "Emergency Fund", targetAmount: 6000, savedAmount: 2800, targetDate: "2026-10-01" },
        { id: "goal-2", title: "Holiday", targetAmount: 1800, savedAmount: 900, targetDate: "2026-08-15" },
      ]);
      setRecentTransactions([
        { id: "tx-1", date: "2026-03-18", category: "Transport", amount: 35 },
        { id: "tx-2", date: "2026-03-17", category: "Entertainment", amount: 9.99 },
      ]);
      setError("");
      setIsLoading(false);
      return;
    }

    if (!session?.userId) {
      setReportData(createEmptyReportData([String(new Date().getFullYear())]));
      setCurrentPlanSlug("free");
      setDashboardSettings(DEFAULT_DASHBOARD_SETTINGS);
      setGoalPreview([]);
      setRecentTransactions([]);
      setError("");
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    async function loadDashboardData() {
      try {
        setIsLoading(true);
        setError("");

        const [response, profileResponse, goalsResponse, transactionsResponse] = await Promise.all([
          fetch("/api/reports/summary?scope=dashboard", { cache: "no-store" }),
          fetch("/api/profile", { cache: "no-store" }),
          fetch("/api/goals", { cache: "no-store" }),
          fetch("/api/transactions?kind=expense", { cache: "no-store" }),
        ]);

        if (!response.ok) {
          throw new Error(await readApiError(response, "Failed to load dashboard data."));
        }

        const payload = await response.json();
        const profilePayload: ProfileSettingsPayload | null = profileResponse.ok
          ? ((await profileResponse.json()) as ProfileSettingsPayload)
          : null;
        const goalsPayload: { goals?: GoalPreview[] } = goalsResponse.ok
          ? ((await goalsResponse.json()) as { goals?: GoalPreview[] })
          : { goals: [] };
        const transactionsPayload: { transactions?: Array<{ id: string; date: string; category: string; amount: number }> } = transactionsResponse.ok
          ? ((await transactionsResponse.json()) as { transactions?: Array<{ id: string; date: string; category: string; amount: number }> })
          : { transactions: [] };

        if (!isMounted) {
          return;
        }

        setReportData(payload.reportData ?? createEmptyReportData([String(new Date().getFullYear())]));
        setCurrentPlanSlug(profilePayload?.user?.planSlug ?? "free");
        setDashboardSettings(profilePayload?.user?.dashboard ?? DEFAULT_DASHBOARD_SETTINGS);
        setGoalPreview((goalsPayload.goals ?? []).filter((goal: any) => !goal.completed).slice(0, 3));
        setRecentTransactions((transactionsPayload.transactions ?? []).slice(0, 5));
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        setReportData(createEmptyReportData([String(new Date().getFullYear())]));
        setCurrentPlanSlug("free");
        setDashboardSettings(DEFAULT_DASHBOARD_SETTINGS);
        setGoalPreview([]);
        setRecentTransactions([]);
        setError(loadError instanceof Error ? loadError.message : "Failed to load dashboard data.");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadDashboardData();

    return () => {
      isMounted = false;
    };
  }, []);

  const currentPlan = getSubscriptionPlanBySlug(currentPlanSlug) ?? FREE_PLAN;
  const canToggleWidgets = hasFeatureAccess(currentPlan.slug, "dashboardWidgetToggles");
  const canReorderWidgets = hasFeatureAccess(currentPlan.slug, "dashboardSectionReordering");
  const canSetDefaultWidget = hasFeatureAccess(currentPlan.slug, "defaultHomepageWidget");

  useEffect(() => {
    if (years.length === 0) {
      return;
    }

    const currentYear = String(new Date().getFullYear());
    const nextYear = years.includes(currentYear) ? currentYear : years[years.length - 1];

    if (!years.includes(selectedYear)) {
      setSelectedYear(nextYear);
    }
  }, [selectedYear, years]);

  const fallbackYear = years[years.length - 1] ?? String(new Date().getFullYear());
  const yearData = reportData[selectedYear] ?? reportData[fallbackYear] ?? createEmptyYearReport();
  const availableCategories = useMemo(() => {
    const categories = new Set<string>();

    for (const month of MONTHS) {
      for (const category of Object.keys(yearData[month].categories)) {
        categories.add(category);
      }
    }

    return Array.from(categories).sort((left, right) => left.localeCompare(right));
  }, [yearData]);

  useEffect(() => {
    if (availableCategories.length === 0) {
      return;
    }

    if (!availableCategories.includes(selectedCategory)) {
      setSelectedCategory(availableCategories[0]);
    }
  }, [availableCategories, selectedCategory]);

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
    result[month] = yearData[month].categories[selectedCategory] ?? 0;
    return result;
  }, {} as Record<string, number>);

  const selectedMonthSummary = {
    Income: monthDetails.income,
    Spendings: monthDetails.spendings,
    Net: monthNet,
  };

  const annualIncome = MONTHS.reduce((sum, month) => sum + yearData[month].income, 0);
  const annualSpendings = MONTHS.reduce((sum, month) => sum + yearData[month].spendings, 0);
  const incomeActiveMonths = MONTHS.filter((month) => yearData[month].income > 0).length;
  const spendingActiveMonths = MONTHS.filter((month) => yearData[month].spendings > 0).length;
  const annualNet = annualIncome - annualSpendings;
  const savingsRate = annualIncome > 0 ? (annualNet / annualIncome) * 100 : 0;
  const spendingsRate = annualIncome > 0 ? (annualSpendings / annualIncome) * 100 : 0;
  const averageMonthlySpendings = annualSpendings / MONTHS.length;
  const incomeRunRate = incomeActiveMonths > 0 ? (annualIncome / incomeActiveMonths) * 12 : 0;
  const spendingRunRate = spendingActiveMonths > 0 ? (annualSpendings / spendingActiveMonths) * 12 : 0;

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
  const previousYearData = previousYear ? reportData[previousYear] : null;
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

  const incomeCardTitle = usesSampleData ? "Annual Income" : "Income Recorded";
  const spendingCardTitle = usesSampleData ? "Annual Spendings" : "Spendings Recorded";
  const savingsCardTitle = usesSampleData ? "Savings Rate" : "Recorded Savings Rate";

  async function persistDashboardSettings(nextSettings: DashboardSettings) {
    setDashboardSettings(nextSettings);

    if (!sessionUserId) {
      return;
    }

    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dashboard: nextSettings }),
      });

      if (!response.ok) {
        throw new Error(await readApiError(response, "Unable to save dashboard layout settings."));
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save dashboard layout settings.");
    }
  }

  function updateWidgetVisibility(widget: DashboardWidgetKey, visible: boolean) {
    if (!canToggleWidgets) {
      return;
    }

    void persistDashboardSettings({
      ...dashboardSettings,
      visibleWidgets: {
        ...dashboardSettings.visibleWidgets,
        [widget]: visible,
      },
      defaultWidget: dashboardSettings.defaultWidget === widget && !visible
        ? (dashboardSettings.widgetOrder.find((item) => item !== widget) ?? "charts")
        : dashboardSettings.defaultWidget,
    });
  }

  function moveWidget(widget: DashboardWidgetKey, direction: -1 | 1) {
    if (!canReorderWidgets) {
      return;
    }

    const currentIndex = dashboardSettings.widgetOrder.indexOf(widget);
    const targetIndex = currentIndex + direction;
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= dashboardSettings.widgetOrder.length) {
      return;
    }

    const nextOrder = [...dashboardSettings.widgetOrder];
    [nextOrder[currentIndex], nextOrder[targetIndex]] = [nextOrder[targetIndex], nextOrder[currentIndex]];
    void persistDashboardSettings({ ...dashboardSettings, widgetOrder: nextOrder });
  }

  function updateDefaultWidget(widget: DashboardWidgetKey) {
    if (!canSetDefaultWidget) {
      return;
    }

    void persistDashboardSettings({
      ...dashboardSettings,
      defaultWidget: widget,
      visibleWidgets: {
        ...dashboardSettings.visibleWidgets,
        [widget]: true,
      },
    });
  }

  const orderedWidgets = [
    dashboardSettings.defaultWidget,
    ...dashboardSettings.widgetOrder.filter((widget) => widget !== dashboardSettings.defaultWidget),
  ].filter((widget, index, items) => items.indexOf(widget) === index);

  const visibleOrderedWidgets = orderedWidgets.filter((widget) => dashboardSettings.visibleWidgets[widget]);

  if (isLoading) {
    return <PageLoading message="Loading your dashboard..." />;
  }

  return (
    <div className={styles.container + " container"}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Dashboard</h1>
          <p className={styles.subtitle}>Monthly insights, trends, and reports in one place.</p>
          {error ? <p className={styles.subtitle}>{error}</p> : null}
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

      <section className={styles.chartSection}>
        <div className={styles.sectionHeader}>
          <div>
            <h2>Dashboard layout</h2>
            <p>Smart and Pro can toggle widgets, reorder sections, and choose a default dashboard widget.</p>
          </div>
        </div>
        <div className={styles.layoutControlGrid}>
          {(["charts", "goals", "transactions"] as DashboardWidgetKey[]).map((widget) => (
            <div key={widget} className={styles.layoutControlCard}>
              <strong>{widget.charAt(0).toUpperCase() + widget.slice(1)}</strong>
              <label className={styles.checkboxRow}>
                <input
                  type="checkbox"
                  checked={dashboardSettings.visibleWidgets[widget]}
                  onChange={(event) => updateWidgetVisibility(widget, event.target.checked)}
                  disabled={!canToggleWidgets}
                />
                <span>Visible on dashboard</span>
              </label>
              <div className={styles.inlineControlButtons}>
                <button type="button" className={styles.toggleButton} onClick={() => moveWidget(widget, -1)} disabled={!canReorderWidgets}>Up</button>
                <button type="button" className={styles.toggleButton} onClick={() => moveWidget(widget, 1)} disabled={!canReorderWidgets}>Down</button>
                <button
                  type="button"
                  className={`${styles.toggleButton} ${dashboardSettings.defaultWidget === widget ? styles.toggleButtonActive : ""}`}
                  onClick={() => updateDefaultWidget(widget)}
                  disabled={!canSetDefaultWidget}
                >
                  Default
                </button>
              </div>
            </div>
          ))}
        </div>
        {!canToggleWidgets ? <p className={styles.lockedMessage}>Dashboard personalization is available on Smart and Pro.</p> : null}
      </section>

      <div className={styles.toggleRow}>
        <div className={styles.toggleGroup}>
          <button type="button" className={`${styles.toggleButton} ${selectedMetric === "spendings" ? styles.toggleButtonActive : ""}`} onClick={() => setSelectedMetric("spendings")}>Spendings</button>
          <button type="button" className={`${styles.toggleButton} ${selectedMetric === "income" ? styles.toggleButtonActive : ""}`} onClick={() => setSelectedMetric("income")}>Income</button>
          <button type="button" className={`${styles.toggleButton} ${selectedMetric === "net" ? styles.toggleButtonActive : ""}`} onClick={() => setSelectedMetric("net")}>Net</button>
        </div>
        <div className={styles.toggleGroup}>
          <button type="button" className={`${styles.toggleButton} ${mainChartType === "line" ? styles.toggleButtonActive : ""}`} onClick={() => setMainChartType("line")}>Line</button>
          <button type="button" className={`${styles.toggleButton} ${mainChartType === "bar" ? styles.toggleButtonActive : ""}`} onClick={() => setMainChartType("bar")}>Bar</button>
        </div>
      </div>

      {visibleOrderedWidgets.includes("charts") ? (
        <section className={styles.widgetStack}>
          <div className={styles.widgetHeader}>
            <h2>Charts</h2>
            <span>{dashboardSettings.defaultWidget === "charts" ? "Default widget" : ""}</span>
          </div>
          <div className={styles.summaryGrid}>
            <article className={styles.summaryCard}>
              <p>{incomeCardTitle}</p>
              <h3 className={styles.summaryValue}>
                <span className={styles.defaultValue}>{formatCurrency(annualIncome)}</span>
                <span className={styles.hoverValue}>{usesSampleData ? formatSignedPercentage(annualIncomeGrowth) : formatCurrency(incomeRunRate)}</span>
              </h3>
              <span className={styles.summaryMeta}>
                <span className={styles.defaultValue}>{usesSampleData ? `Across ${selectedYear}` : `Across ${incomeActiveMonths} active month${incomeActiveMonths === 1 ? "" : "s"}`}</span>
                <span className={styles.hoverValue}>{usesSampleData ? (previousYear ? `vs ${previousYear}` : "No prior year") : "Annualised from recorded months"}</span>
              </span>
            </article>
            <article className={styles.summaryCard}>
              <p>{spendingCardTitle}</p>
              <h3 className={styles.summaryValue}>
                <span className={styles.defaultValue}>{formatCurrency(annualSpendings)}</span>
                <span className={styles.hoverValue}>{usesSampleData ? formatSignedPercentage(annualSpendingsGrowth) : formatCurrency(spendingRunRate)}</span>
              </h3>
              <span className={styles.summaryMeta}>
                <span className={styles.defaultValue}>{usesSampleData ? `Avg ${formatCurrency(averageMonthlySpendings)} / month` : `Across ${spendingActiveMonths} active month${spendingActiveMonths === 1 ? "" : "s"}`}</span>
                <span className={styles.hoverValue}>{usesSampleData ? (previousYear ? `vs ${previousYear}` : "No prior year") : "Annualised from recorded months"}</span>
              </span>
            </article>
            <article className={styles.summaryCard}>
              <p>{savingsCardTitle}</p>
              <h3 className={styles.summaryValue}>
                <span className={styles.defaultValue}>{formatPercentage(savingsRate)}</span>
                <span className={styles.hoverValue}>{formatPercentage(spendingsRate)}</span>
              </h3>
              <span className={styles.summaryMeta}>
                <span className={styles.defaultValue}>{usesSampleData ? `${formatCurrency(annualNet)} net this year` : `${formatCurrency(annualNet)} net recorded`}</span>
                <span className={styles.hoverValue}>{usesSampleData ? `Spent ${formatPercentage(spendingsRate)} of income` : "Based on recorded months only"}</span>
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
        </section>
      ) : null}

      {visibleOrderedWidgets.includes("goals") ? (
        <section className={styles.widgetStack}>
          <div className={styles.widgetHeader}>
            <h2>Goals</h2>
            <span>{dashboardSettings.defaultWidget === "goals" ? "Default widget" : ""}</span>
          </div>
          <section className={styles.chartSection}>
            <div className={styles.sectionHeader}>
              <div>
                <h2>Goal progress</h2>
                <p>Current savings goals and their completion progress.</p>
              </div>
            </div>
            {goalPreview.length === 0 ? (
              <p>No active goals yet.</p>
            ) : (
              <div className={styles.goalList}>
                {goalPreview.map((goal) => {
                  const progress = goal.targetAmount > 0 ? Math.min(100, (goal.savedAmount / goal.targetAmount) * 100) : 0;
                  return (
                    <article key={goal.id} className={styles.goalCard}>
                      <div>
                        <strong>{goal.title}</strong>
                        <p>{formatCurrency(goal.savedAmount)} of {formatCurrency(goal.targetAmount)}</p>
                      </div>
                      <div className={styles.progressBar}><span style={{ width: `${progress}%` }} /></div>
                      <span>Target date: {goal.targetDate}</span>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </section>
      ) : null}

      {visibleOrderedWidgets.includes("transactions") ? (
        <section className={styles.widgetStack}>
          <div className={styles.widgetHeader}>
            <h2>Transactions</h2>
            <span>{dashboardSettings.defaultWidget === "transactions" ? "Default widget" : ""}</span>
          </div>
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
              <h2>Recent transactions</h2>
              <p>Latest recorded spendings.</p>
            </div>
            {recentTransactions.length === 0 ? (
              <p>No recent spendings yet.</p>
            ) : (
              <div className={styles.transactionList}>
                {recentTransactions.map((transaction) => (
                  <div key={transaction.id} className={styles.transactionRow}>
                    <span>{transaction.category}</span>
                    <span>{transaction.date}</span>
                    <strong>{formatCurrency(transaction.amount)}</strong>
                  </div>
                ))}
              </div>
            )}
          </section>

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
        </section>
      ) : null}
    </div>
  );
}