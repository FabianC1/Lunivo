"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./dashboard.module.css";
import Chart from "../../components/Chart";
import PageLoading from "../../components/PageLoading";
import { readApiError } from "../../lib/apiClient";
import { DEMO_EMAIL, DEMO_PLAN_SLUG, getSession } from "../../lib/auth";
import { initialBudgets } from "../../lib/budgets";
import { FREE_PLAN, getSubscriptionPlanBySlug, hasFeatureAccess } from "../../lib/subscriptions";
import {
  DEFAULT_DASHBOARD_SETTINGS,
  sanitizeDashboardSettings,
  type DashboardSettings,
  type DashboardVisual,
  type DashboardVisualChartType,
  type DashboardVisualPeriod,
  type DashboardVisualSource,
  type DashboardWidgetKey,
} from "../../lib/userSettings";
import { formatCurrency } from "../../lib/utils";

const DASHBOARD_SETTINGS_STORAGE_PREFIX = "lunivo-dashboard-settings";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;
type MonthKey = (typeof MONTHS)[number];
type Metric = "spendings" | "income" | "net";
type ChartKind = "line" | "bar";
type CategoryName = string;
type CustomMetric = "spendings" | "income" | "net";

type ProfileSettingsPayload = {
  user?: {
    planSlug?: string;
    dashboard?: DashboardSettings;
  };
};

type GoalEstimate = {
  id: string;
  title: string;
  targetAmount: number;
  savedAmount: number;
};

type DashboardSummaryPayload = {
  reportData?: Record<string, YearReport>;
  goalEstimates?: GoalEstimate[];
  charts?: {
    incomeSourceBreakdownByYear?: Record<string, Record<string, number>>;
    incomeSourceBreakdownByMonthByYear?: Record<string, Record<string, Record<string, number>>>;
    goalProgressComparison?: Record<string, number>;
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

const INCOME_SOURCE_SPLITS = [
  { Salary: 0.74, Freelance: 0.16, Investments: 0.06, Other: 0.04 },
  { Salary: 0.72, Freelance: 0.18, Investments: 0.06, Other: 0.04 },
  { Salary: 0.76, Freelance: 0.14, Investments: 0.06, Other: 0.04 },
  { Salary: 0.75, Freelance: 0.15, Investments: 0.06, Other: 0.04 },
  { Salary: 0.73, Freelance: 0.17, Investments: 0.06, Other: 0.04 },
  { Salary: 0.71, Freelance: 0.19, Investments: 0.06, Other: 0.04 },
  { Salary: 0.74, Freelance: 0.16, Investments: 0.05, Other: 0.05 },
  { Salary: 0.75, Freelance: 0.15, Investments: 0.06, Other: 0.04 },
  { Salary: 0.77, Freelance: 0.13, Investments: 0.06, Other: 0.04 },
  { Salary: 0.76, Freelance: 0.14, Investments: 0.06, Other: 0.04 },
  { Salary: 0.75, Freelance: 0.15, Investments: 0.06, Other: 0.04 },
  { Salary: 0.73, Freelance: 0.17, Investments: 0.06, Other: 0.04 },
] as const;

const SAMPLE_GOAL_VISUALS: GoalEstimate[] = [
  { id: "goal-home", title: "Buy an apartment", targetAmount: 150000, savedAmount: 42500 },
  { id: "goal-wedding", title: "Summer wedding in Portugal", targetAmount: 25000, savedAmount: 18900 },
  { id: "goal-holiday", title: "Japan anniversary trip", targetAmount: 6400, savedAmount: 2150 },
  { id: "goal-emergency", title: "Emergency fund", targetAmount: 12000, savedAmount: 9300 },
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

function splitIncomeSources(total: number, monthIndex: number) {
  const split = INCOME_SOURCE_SPLITS[monthIndex];
  const sources = {
    Salary: Math.round(total * split.Salary),
    Freelance: Math.round(total * split.Freelance),
    Investments: Math.round(total * split.Investments),
    Other: 0,
  };

  const assigned = sources.Salary + sources.Freelance + sources.Investments;
  sources.Other = Math.max(0, total - assigned);

  return sources;
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

function buildSampleIncomeBreakdownByMonth(yearData: YearReport) {
  return MONTHS.reduce((result, month, index) => {
    result[month] = splitIncomeSources(yearData[month].income, index);
    return result;
  }, {} as Record<MonthKey, Record<string, number>>);
}

function buildSampleIncomeBreakdownYear(yearData: YearReport) {
  const byMonth = buildSampleIncomeBreakdownByMonth(yearData);
  return MONTHS.reduce((result, month) => {
    for (const [source, value] of Object.entries(byMonth[month])) {
      result[source] = (result[source] ?? 0) + value;
    }
    return result;
  }, {} as Record<string, number>);
}

function buildSampleIncomeBreakdownByYear(reportData: Record<string, YearReport>) {
  return Object.fromEntries(
    Object.entries(reportData).map(([year, yearData]) => [year, buildSampleIncomeBreakdownYear(yearData)]),
  ) as Record<string, Record<string, number>>;
}

function buildSampleIncomeBreakdownByMonthByYear(reportData: Record<string, YearReport>) {
  return Object.fromEntries(
    Object.entries(reportData).map(([year, yearData]) => [year, buildSampleIncomeBreakdownByMonth(yearData)]),
  ) as Record<string, Record<string, Record<string, number>>>;
}

function buildSampleGoalProgress(goals: GoalEstimate[]) {
  return goals.reduce((result, goal) => {
    result[goal.title] = goal.targetAmount > 0 ? Number(((goal.savedAmount / goal.targetAmount) * 100).toFixed(1)) : 0;
    return result;
  }, {} as Record<string, number>);
}

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

function getDashboardSettingsStorageKey() {
  const session = getSession();
  return `${DASHBOARD_SETTINGS_STORAGE_PREFIX}-${session?.userId ?? session?.email ?? "guest"}`;
}

function loadLocalDashboardSettings() {
  if (typeof window === "undefined") {
    return DEFAULT_DASHBOARD_SETTINGS;
  }

  try {
    const raw = localStorage.getItem(getDashboardSettingsStorageKey());
    return raw ? sanitizeDashboardSettings(JSON.parse(raw)) : DEFAULT_DASHBOARD_SETTINGS;
  } catch {
    return DEFAULT_DASHBOARD_SETTINGS;
  }
}

function persistLocalDashboardSettings(nextSettings: DashboardSettings) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(getDashboardSettingsStorageKey(), JSON.stringify(sanitizeDashboardSettings(nextSettings)));
}

const DASHBOARD_WIDGET_DETAILS: Array<{
  key: DashboardWidgetKey;
  title: string;
  description: string;
}> = [
  {
    key: "charts",
    title: "Overview",
    description: "Headline totals, trend chart, and the main finance summary.",
  },
  {
    key: "goals",
    title: "Category Focus",
    description: "Deep-dive into a selected category trend over the year.",
  },
  {
    key: "transactions",
    title: "Monthly Breakdowns",
    description: "Category doughnut and income-versus-spendings comparison.",
  },
];

const CUSTOM_VISUAL_LIMIT = 8;

const VISUAL_SOURCE_DETAILS: Record<DashboardVisualSource, {
  chartTypes: DashboardVisualChartType[];
  defaultChartType: DashboardVisualChartType;
}> = {
  monthlyMetric: { chartTypes: ["line", "bar"], defaultChartType: "line" },
  categoryTrend: { chartTypes: ["line", "bar"], defaultChartType: "line" },
  monthBreakdown: { chartTypes: ["doughnut", "bar"], defaultChartType: "doughnut" },
  monthSnapshot: { chartTypes: ["bar"], defaultChartType: "bar" },
  savingsRateTrend: { chartTypes: ["line", "bar"], defaultChartType: "line" },
  netFlowTrend: { chartTypes: ["line", "bar"], defaultChartType: "line" },
  topSpendingCategoriesYear: { chartTypes: ["doughnut", "bar"], defaultChartType: "doughnut" },
  incomeSourceBreakdown: { chartTypes: ["doughnut", "bar"], defaultChartType: "doughnut" },
  rollingThreeMonthAverageSpend: { chartTypes: ["line", "bar"], defaultChartType: "line" },
  goalProgressComparison: { chartTypes: ["bar"], defaultChartType: "bar" },
  monthlyForecastVsActual: { chartTypes: ["bar", "line"], defaultChartType: "bar" },
};

export default function Dashboard() {
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [reportData, setReportData] = useState<Record<string, YearReport>>({});
  const [currentPlanSlug, setCurrentPlanSlug] = useState("free");
  const [dashboardSettings, setDashboardSettings] = useState<DashboardSettings>(DEFAULT_DASHBOARD_SETTINGS);
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
  const [draggedWidget, setDraggedWidget] = useState<DashboardWidgetKey | null>(null);
  const [showLayoutControls, setShowLayoutControls] = useState(false);
  const [showVisualBuilder, setShowVisualBuilder] = useState(false);
  const [goalEstimates, setGoalEstimates] = useState<GoalEstimate[]>([]);
  const [incomeSourceBreakdownByYear, setIncomeSourceBreakdownByYear] = useState<Record<string, Record<string, number>>>({});
  const [incomeSourceBreakdownByMonthByYear, setIncomeSourceBreakdownByMonthByYear] = useState<Record<string, Record<string, Record<string, number>>>>({});
  const [goalProgressComparison, setGoalProgressComparison] = useState<Record<string, number>>({});
  const [customVisualTitle, setCustomVisualTitle] = useState("Monthly Spendings Pulse");
  const [customVisualSource, setCustomVisualSource] = useState<DashboardVisualSource>("monthlyMetric");
  const [customVisualChartType, setCustomVisualChartType] = useState<DashboardVisualChartType>("line");
  const [customVisualMetric, setCustomVisualMetric] = useState<CustomMetric>("spendings");
  const [customVisualCategory, setCustomVisualCategory] = useState<CategoryName>(DEFAULT_DASHBOARD_CATEGORIES[0]);
  const [customVisualMonth, setCustomVisualMonth] = useState<MonthKey>(getCurrentMonthKey());
  const [customVisualPeriod, setCustomVisualPeriod] = useState<DashboardVisualPeriod>("year");

  useEffect(() => {
    const session = getSession();
    const normalizedEmail = session?.email.trim().toLowerCase() ?? "";
    const shouldUseSampleData = session?.isDemo || normalizedEmail === DEMO_EMAIL;
    setSessionUserId(session?.isDemo ? null : session?.userId ?? null);
    setUsesSampleData(Boolean(shouldUseSampleData));

    if (shouldUseSampleData) {
      setReportData(SAMPLE_REPORT_DATA);
      setCurrentPlanSlug(DEMO_PLAN_SLUG);
      setDashboardSettings(loadLocalDashboardSettings());
      setGoalEstimates(SAMPLE_GOAL_VISUALS);
      setIncomeSourceBreakdownByMonthByYear(buildSampleIncomeBreakdownByMonthByYear(SAMPLE_REPORT_DATA));
      setIncomeSourceBreakdownByYear(buildSampleIncomeBreakdownByYear(SAMPLE_REPORT_DATA));
      setGoalProgressComparison(buildSampleGoalProgress(SAMPLE_GOAL_VISUALS));
      setError("");
      setIsLoading(false);
      return;
    }

    if (!session?.userId) {
      setReportData(createEmptyReportData([String(new Date().getFullYear())]));
      setCurrentPlanSlug("free");
      setDashboardSettings(loadLocalDashboardSettings());
      setGoalEstimates([]);
      setIncomeSourceBreakdownByYear({});
      setIncomeSourceBreakdownByMonthByYear({});
      setGoalProgressComparison({});
      setError("");
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    async function loadDashboardData() {
      try {
        setIsLoading(true);
        setError("");

        const [response, profileResponse] = await Promise.all([
          fetch("/api/reports/summary?scope=dashboard", { cache: "no-store" }),
          fetch("/api/profile", { cache: "no-store" }),
        ]);

        if (!response.ok) {
          throw new Error(await readApiError(response, "Failed to load dashboard data."));
        }

        const payload = (await response.json()) as DashboardSummaryPayload;
        const profilePayload: ProfileSettingsPayload | null = profileResponse.ok
          ? ((await profileResponse.json()) as ProfileSettingsPayload)
          : null;

        if (!isMounted) {
          return;
        }

        setReportData(payload.reportData ?? createEmptyReportData([String(new Date().getFullYear())]));
        setCurrentPlanSlug(profilePayload?.user?.planSlug ?? "free");
        setDashboardSettings(sanitizeDashboardSettings(profilePayload?.user?.dashboard ?? DEFAULT_DASHBOARD_SETTINGS));
        setGoalEstimates(payload.goalEstimates ?? []);
        setIncomeSourceBreakdownByYear(payload.charts?.incomeSourceBreakdownByYear ?? {});
        setIncomeSourceBreakdownByMonthByYear(payload.charts?.incomeSourceBreakdownByMonthByYear ?? {});
        setGoalProgressComparison(payload.charts?.goalProgressComparison ?? {});
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        setReportData(createEmptyReportData([String(new Date().getFullYear())]));
        setCurrentPlanSlug("free");
        setDashboardSettings(sanitizeDashboardSettings(DEFAULT_DASHBOARD_SETTINGS));
        setGoalEstimates([]);
        setIncomeSourceBreakdownByYear({});
        setIncomeSourceBreakdownByMonthByYear({});
        setGoalProgressComparison({});
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
  const canUseAdvancedInsights = hasFeatureAccess(currentPlan.slug, "advancedDashboardInsights");
  const canToggleWidgets = hasFeatureAccess(currentPlan.slug, "dashboardWidgetToggles");
  const canReorderWidgets = true;
  const canCreateCustomDashboardVisuals = hasFeatureAccess(currentPlan.slug, "customDashboardVisuals");
  const canCustomizeDashboard = canToggleWidgets || canReorderWidgets || canUseAdvancedInsights;

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

  const monthlyNetFlow = MONTHS.reduce((result, month) => {
    result[month] = yearData[month].income - yearData[month].spendings;
    return result;
  }, {} as Record<string, number>);

  const savingsRateByMonth = MONTHS.reduce((result, month) => {
    const income = yearData[month].income;
    const spendings = yearData[month].spendings;
    result[month] = income > 0 ? Number((((income - spendings) / income) * 100).toFixed(1)) : 0;
    return result;
  }, {} as Record<string, number>);

  const rollingThreeMonthAverageSpend = MONTHS.reduce((result, month, index) => {
    const windowMonths = MONTHS.slice(Math.max(0, index - 2), index + 1);
    result[month] = Number((windowMonths.reduce((sum, currentMonth) => sum + yearData[currentMonth].spendings, 0) / windowMonths.length).toFixed(2));
    return result;
  }, {} as Record<string, number>);

  const forecastSpendingsByMonth = MONTHS.reduce((result, month, index) => {
    if (index === 0) {
      result[month] = yearData[month].spendings;
      return result;
    }

    const windowMonths = MONTHS.slice(Math.max(0, index - 3), index);
    result[month] = Number((windowMonths.reduce((sum, currentMonth) => sum + yearData[currentMonth].spendings, 0) / windowMonths.length).toFixed(2));
    return result;
  }, {} as Record<string, number>);

  const selectedIncomeSourceBreakdownYear = incomeSourceBreakdownByYear[selectedYear] ?? {};
  const selectedIncomeSourceBreakdownByMonth = incomeSourceBreakdownByMonthByYear[selectedYear] ?? {};

  const categoryBreakdown = MONTHS.reduce((result, month) => {
    for (const [category, amount] of Object.entries(yearData[month].categories)) {
      result[category] = (result[category] ?? 0) + amount;
    }
    return result;
  }, {} as Record<string, number>);

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
  const topCategoryForMonth = Object.entries(monthDetails.categories).reduce(
    (best, [category, amount]) => (!best || amount > best.amount ? { category, amount } : best),
    null as { category: string; amount: number } | null,
  );
  const highestSpendingMonth = MONTHS.reduce(
    (best, month) => (!best || yearData[month].spendings > best.amount ? { month, amount: yearData[month].spendings } : best),
    null as { month: MonthKey; amount: number } | null,
  );
  const lowestSpendingMonth = MONTHS.reduce(
    (best, month) => (!best || yearData[month].spendings < best.amount ? { month, amount: yearData[month].spendings } : best),
    null as { month: MonthKey; amount: number } | null,
  );
  const averageMonthlyNet = annualNet / MONTHS.length;
  const customVisualCategories = availableCategories.length > 0 ? availableCategories : DEFAULT_DASHBOARD_CATEGORIES;

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

  useEffect(() => {
    if (customVisualCategories.length === 0) {
      return;
    }

    if (!customVisualCategories.includes(customVisualCategory)) {
      setCustomVisualCategory(customVisualCategories[0]);
    }
  }, [customVisualCategories, customVisualCategory]);

  useEffect(() => {
    const allowedChartTypes = VISUAL_SOURCE_DETAILS[customVisualSource].chartTypes;
    if (!allowedChartTypes.includes(customVisualChartType)) {
      setCustomVisualChartType(VISUAL_SOURCE_DETAILS[customVisualSource].defaultChartType);
    }
  }, [customVisualChartType, customVisualSource]);

  const availableCustomChartTypes = VISUAL_SOURCE_DETAILS[customVisualSource].chartTypes;

  async function persistDashboardSettings(nextSettings: DashboardSettings) {
    setDashboardSettings(nextSettings);

    if (!sessionUserId) {
      persistLocalDashboardSettings(nextSettings);
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

  const orderedWidgets = dashboardSettings.widgetOrder.filter((widget, index, items) => items.indexOf(widget) === index);

  const visibleOrderedWidgets = orderedWidgets.filter((widget) => canToggleWidgets ? dashboardSettings.visibleWidgets[widget] : true);

  async function toggleWidget(widget: DashboardWidgetKey) {
    if (!canToggleWidgets) {
      return;
    }

    const currentlyVisible = dashboardSettings.visibleWidgets[widget];
    const visibleCount = Object.values(dashboardSettings.visibleWidgets).filter(Boolean).length;

    if (currentlyVisible && visibleCount === 1) {
      return;
    }

    const nextVisibleWidgets = {
      ...dashboardSettings.visibleWidgets,
      [widget]: !currentlyVisible,
    };

    await persistDashboardSettings({
      ...dashboardSettings,
      visibleWidgets: nextVisibleWidgets,
    });
  }

  async function reorderWidgets(fromWidget: DashboardWidgetKey, toWidget: DashboardWidgetKey) {
    if (!canReorderWidgets) {
      return;
    }

    if (fromWidget === toWidget) {
      return;
    }

    const currentIndex = dashboardSettings.widgetOrder.indexOf(fromWidget);
    const targetIndex = dashboardSettings.widgetOrder.indexOf(toWidget);
    if (currentIndex === -1 || targetIndex === -1) {
      return;
    }

    const nextOrder = [...dashboardSettings.widgetOrder];
    const [movedWidget] = nextOrder.splice(currentIndex, 1);
    nextOrder.splice(targetIndex, 0, movedWidget);

    await persistDashboardSettings({
      ...dashboardSettings,
      widgetOrder: nextOrder,
    });
  }

  function getVisualFormat(source: DashboardVisualSource) {
    if (source === "savingsRateTrend" || source === "goalProgressComparison") {
      return "percent" as const;
    }

    if (source === "monthBreakdown" || source === "incomeSourceBreakdown" || source === "topSpendingCategoriesYear") {
      return "currency" as const;
    }

    return "currency" as const;
  }

  function buildVisualData(visual: DashboardVisual): Record<string, number> {
    switch (visual.source) {
      case "monthlyMetric": {
        const metric = visual.metric ?? "spendings";
        return MONTHS.reduce((result, month) => {
          const report = yearData[month];
          result[month] = metric === "income" ? report.income : metric === "net" ? report.income - report.spendings : report.spendings;
          return result;
        }, {} as Record<string, number>);
      }
      case "categoryTrend": {
        const category = visual.category ?? customVisualCategories[0] ?? DEFAULT_DASHBOARD_CATEGORIES[0];
        return MONTHS.reduce((result, month) => {
          result[month] = yearData[month].categories[category] ?? 0;
          return result;
        }, {} as Record<string, number>);
      }
      case "monthBreakdown": {
        const month = (visual.month as MonthKey | undefined) ?? selectedMonth;
        return yearData[month]?.categories ?? {};
      }
      case "monthSnapshot": {
        const month = (visual.month as MonthKey | undefined) ?? selectedMonth;
        const report = yearData[month] ?? createEmptyYearReport()[selectedMonth];
        return {
          Income: report.income,
          Spendings: report.spendings,
          Net: report.income - report.spendings,
        };
      }
      case "savingsRateTrend":
        return savingsRateByMonth;
      case "netFlowTrend":
        return monthlyNetFlow;
      case "topSpendingCategoriesYear":
        return categoryBreakdown;
      case "incomeSourceBreakdown":
        return visual.period === "month"
          ? (selectedIncomeSourceBreakdownByMonth[(visual.month as MonthKey | undefined) ?? selectedMonth] ?? {})
          : selectedIncomeSourceBreakdownYear;
      case "rollingThreeMonthAverageSpend":
        return rollingThreeMonthAverageSpend;
      case "goalProgressComparison":
        return goalProgressComparison;
      case "monthlyForecastVsActual": {
        const month = (visual.month as MonthKey | undefined) ?? selectedMonth;
        return {
          Forecast: forecastSpendingsByMonth[month] ?? 0,
          Actual: yearData[month]?.spendings ?? 0,
        };
      }
      default:
        return {};
    }
  }

  function getVisualSubtitle(visual: DashboardVisual) {
    switch (visual.source) {
      case "monthlyMetric":
        return `${selectedYear} ${visual.metric ?? "spendings"} trend`;
      case "categoryTrend":
        return `${visual.category ?? customVisualCategory} across ${selectedYear}`;
      case "monthBreakdown":
        return `${visual.month ?? selectedMonth} category split`;
      case "monthSnapshot":
        return `${visual.month ?? selectedMonth} income versus spendings snapshot`;
      case "savingsRateTrend":
        return `Savings rate by month across ${selectedYear}`;
      case "netFlowTrend":
        return `Net flow by month across ${selectedYear}`;
      case "topSpendingCategoriesYear":
        return `Top spending categories across ${selectedYear}`;
      case "incomeSourceBreakdown":
        return visual.period === "month" ? `${visual.month ?? selectedMonth} income source mix` : `${selectedYear} income source mix`;
      case "rollingThreeMonthAverageSpend":
        return `Rolling 3-month average spend across ${selectedYear}`;
      case "goalProgressComparison":
        return `Progress comparison across ${goalEstimates.length} active goals`;
      case "monthlyForecastVsActual":
        return `${visual.month ?? selectedMonth} forecast versus actual spendings`;
      default:
        return "Custom visual";
    }
  }

  async function addCustomVisual() {
    if (!canCreateCustomDashboardVisuals || dashboardSettings.customVisuals.length >= CUSTOM_VISUAL_LIMIT) {
      return;
    }

    const nextVisual: DashboardVisual = {
      id: `visual-${Date.now()}`,
      title: customVisualTitle.trim() || "Custom visual",
      source: customVisualSource,
      chartType: customVisualChartType,
      metric: customVisualSource === "monthlyMetric" ? customVisualMetric : undefined,
      category: customVisualSource === "categoryTrend" ? customVisualCategory : undefined,
      month:
        customVisualSource === "monthBreakdown" ||
        customVisualSource === "monthSnapshot" ||
        customVisualSource === "monthlyForecastVsActual" ||
        (customVisualSource === "incomeSourceBreakdown" && customVisualPeriod === "month")
          ? customVisualMonth
          : undefined,
      period: customVisualSource === "incomeSourceBreakdown" ? customVisualPeriod : undefined,
    };

    await persistDashboardSettings({
      ...dashboardSettings,
      customVisuals: [...dashboardSettings.customVisuals, nextVisual],
    });
  }

  async function removeCustomVisual(visualId: string) {
    await persistDashboardSettings({
      ...dashboardSettings,
      customVisuals: dashboardSettings.customVisuals.filter((visual) => visual.id !== visualId),
    });
  }

  if (isLoading) {
    return <PageLoading message="Loading your dashboard..." />;
  }

  const renderDashboardWidget = (widget: DashboardWidgetKey) => {
    if (widget === "charts") {
      return (
        <section key={widget} className={styles.widgetStack}>
          <div className={styles.widgetHeader}>
            <h2>Overview</h2>
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

          {canUseAdvancedInsights ? (
            <section className={styles.chartSection}>
              <div className={styles.sectionHeader}>
                <h2>Advanced Insights</h2>
                <p>Higher-signal trend callouts for monthly pacing and category concentration.</p>
              </div>
              <div className={styles.summaryGrid}>
                <article className={styles.summaryCard}>
                  <p>Average monthly net</p>
                  <h3>{formatCurrency(averageMonthlyNet)}</h3>
                  <span>{formatCurrency(annualNet)} net spread across the year</span>
                </article>
                <article className={styles.summaryCard}>
                  <p>Top category in {selectedMonth}</p>
                  <h3>{topCategoryForMonth?.category ?? "No data"}</h3>
                  <span>{topCategoryForMonth ? formatCurrency(topCategoryForMonth.amount) : "No category data"}</span>
                </article>
                <article className={styles.summaryCard}>
                  <p>Highest spending month</p>
                  <h3>{highestSpendingMonth?.month ?? "No data"}</h3>
                  <span>{highestSpendingMonth ? formatCurrency(highestSpendingMonth.amount) : "No spending data"}</span>
                </article>
                <article className={styles.summaryCard}>
                  <p>Lowest spending month</p>
                  <h3>{lowestSpendingMonth?.month ?? "No data"}</h3>
                  <span>{lowestSpendingMonth ? formatCurrency(lowestSpendingMonth.amount) : "No spending data"}</span>
                </article>
              </div>
            </section>
          ) : null}

          <section className={styles.chartSection}>
            <div className={styles.sectionHeader}>
              <h2>{metricLabel} Trend ({selectedYear})</h2>
              <p>{selectedMonth}: {formatCurrency(currentMetricValue)} · {monthChangeLabel}</p>
            </div>
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
            <div className={styles.chartFrameTall}>
              <Chart data={monthlyMetricData} type={mainChartType} showLegend={false} />
            </div>
          </section>
        </section>
      );
    }

    if (widget === "goals") {
      return (
        <section key={widget} className={styles.widgetStack}>
          <div className={styles.widgetHeader}>
            <h2>Category Focus</h2>
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
        </section>
      );
    }

    return (
      <section key={widget} className={styles.widgetStack}>
        <div className={styles.widgetHeader}>
          <h2>Monthly Breakdowns</h2>
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
      </section>
    );
  };

  return (
    <div className={styles.container + " container"}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Dashboard</h1>
          <p className={styles.subtitle}>
            {canCustomizeDashboard
              ? "A flexible finance workspace with adjustable widgets and layout controls."
              : "Your finance overview, arranged into a clean default dashboard with everything in place."}
          </p>
          <p className={styles.planSummary}>
            {canUseAdvancedInsights
              ? `${currentPlan.name} unlocks advanced insights and dashboard controls.`
              : `${currentPlan.name} keeps the core insights, while Smart unlocks visibility controls and advanced analysis.`}
          </p>
          {error ? <p className={styles.subtitle}>{error}</p> : null}
        </div>
        <div className={styles.headerActions}>
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
      </div>

      <section className={styles.controlDock}>
                <div className={styles.panelToggleRow}>
                  <button
                    type="button"
                    className={`${styles.panelToggleButton} ${showLayoutControls ? styles.panelToggleButtonOpen : ""}`}
                    onClick={() => setShowLayoutControls((current) => !current)}
                    aria-expanded={showLayoutControls}
                    aria-controls="workspace-layout-panel"
                  >
                    <span className={styles.panelToggleEyebrow}>Workspace Layout</span>
                    <strong>Arrange sections and visibility</strong>
                    <span className={styles.panelToggleMeta}>
                      {canToggleWidgets
                        ? `${visibleOrderedWidgets.length} section${visibleOrderedWidgets.length === 1 ? "" : "s"} active`
                        : "Reorder freely, upgrade for visibility controls"}
                    </span>
                  </button>

                  <button
                    type="button"
                    className={`${styles.panelToggleButton} ${showVisualBuilder ? styles.panelToggleButtonOpen : ""}`}
                    onClick={() => setShowVisualBuilder((current) => !current)}
                    aria-expanded={showVisualBuilder}
                    aria-controls="custom-visuals-panel"
                  >
                    <span className={styles.panelToggleEyebrow}>Custom Dashboard Visuals</span>
                    <strong>Build saved charts from your data</strong>
                    <span className={styles.panelToggleMeta}>
                      {dashboardSettings.customVisuals.length}/{CUSTOM_VISUAL_LIMIT} saved
                    </span>
                  </button>
                </div>

                {showLayoutControls ? (
                  <section id="workspace-layout-panel" className={styles.layoutPanel}>
                    <div className={styles.layoutPanelHeader}>
                      <div>
                        <h2>Workspace Layout</h2>
                        <p>
                          {canToggleWidgets
                            ? "Drag sections into the order you want and hide the ones you do not need. The page follows this exact sequence."
                            : "Drag sections to change the dashboard flow. Upgrade to Smart to unlock visibility controls and advanced insights."}
                        </p>
                      </div>
                    </div>

                    <div className={styles.layoutRail}>
                      {(canToggleWidgets ? visibleOrderedWidgets : orderedWidgets).map((widget, index) => {
                        const details = DASHBOARD_WIDGET_DETAILS.find((entry) => entry.key === widget);
                        if (!details) {
                          return null;
                        }

                        return (
                          <div key={widget} className={styles.layoutRailItem}>
                            <span className={styles.layoutRailIndex}>{index + 1}</span>
                            <strong>{details.title}</strong>
                          </div>
                        );
                      })}
                    </div>

                    <div className={styles.layoutList}>
                      {orderedWidgets.map((widget) => {
                        const details = DASHBOARD_WIDGET_DETAILS.find((entry) => entry.key === widget);
                        if (!details) {
                          return null;
                        }

                        const isVisible = dashboardSettings.visibleWidgets[widget];
                        const visibleCount = Object.values(dashboardSettings.visibleWidgets).filter(Boolean).length;

                        return (
                          <article
                            key={widget}
                            className={`${styles.layoutItem} ${draggedWidget === widget ? styles.layoutItemDragging : ""}`}
                            draggable={canReorderWidgets}
                            onDragStart={() => setDraggedWidget(widget)}
                            onDragEnd={() => setDraggedWidget(null)}
                            onDragOver={(event) => {
                              if (!canReorderWidgets) {
                                return;
                              }

                              event.preventDefault();
                            }}
                            onDrop={(event) => {
                              event.preventDefault();
                              if (!draggedWidget) {
                                return;
                              }

                              void reorderWidgets(draggedWidget, widget);
                              setDraggedWidget(null);
                            }}
                          >
                            <div className={styles.layoutItemLead}>
                              <div className={styles.layoutHandle} aria-hidden="true">
                                <span />
                                <span />
                                <span />
                                <span />
                              </div>
                              <div className={styles.layoutPreview} aria-hidden="true">
                                <span className={styles.layoutPreviewTop} />
                                <span className={styles.layoutPreviewMid} />
                                <span className={styles.layoutPreviewBottom} />
                              </div>
                            </div>

                            <div className={styles.layoutItemBody}>
                              <div className={styles.layoutItemTop}>
                                <strong>{details.title}</strong>
                              </div>
                              <span>{details.description}</span>
                            </div>
                            <div className={styles.layoutItemMeta}>
                              <button
                                type="button"
                                className={`${styles.visibilityToggle} ${isVisible ? styles.visibilityToggleActive : ""}`}
                                onClick={() => void toggleWidget(widget)}
                                disabled={!canToggleWidgets || (isVisible && visibleCount === 1)}
                              >
                                <span className={styles.visibilityToggleKnob} />
                                <span>{isVisible ? "Visible" : "Hidden"}</span>
                              </button>
                              {canReorderWidgets ? <span className={styles.layoutHint}>Drag to reorder</span> : null}
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </section>
                ) : null}

                {showVisualBuilder ? (
                  <section id="custom-visuals-panel" className={styles.visualBuilderPanel}>
                    <div className={styles.layoutPanelHeader}>
                      <div>
                        <h2>Custom Dashboard Visuals</h2>
                        <p>
                          {canCreateCustomDashboardVisuals
                            ? "Build extra charts from trends, income mixes, forecasts, category leaders, and active goal progress."
                            : "Pro unlocks saved custom visuals so you can build your own extra dashboard charts from your data."}
                        </p>
                      </div>
                      <span className={styles.layoutBadge}>{dashboardSettings.customVisuals.length}/{CUSTOM_VISUAL_LIMIT} saved</span>
                    </div>

                    <div className={styles.visualBuilderGrid}>
                      <label className={styles.controlItem}>
                        <span>Visual name</span>
                        <input className={styles.visualInput} value={customVisualTitle} onChange={(event) => setCustomVisualTitle(event.target.value)} placeholder="Monthly Spendings Pulse" />
                      </label>
                      <label className={styles.controlItem}>
                        <span>Source</span>
                        <select className={styles.select} value={customVisualSource} onChange={(event) => setCustomVisualSource(event.target.value as DashboardVisualSource)}>
                          <option value="monthlyMetric">Monthly metric trend</option>
                          <option value="categoryTrend">Category trend</option>
                          <option value="monthBreakdown">Monthly category breakdown</option>
                          <option value="monthSnapshot">Monthly snapshot</option>
                          <option value="savingsRateTrend">Savings rate trend by month</option>
                          <option value="netFlowTrend">Net flow trend by month</option>
                          <option value="topSpendingCategoriesYear">Top spending categories across the full year</option>
                          <option value="incomeSourceBreakdown">Income source breakdown by month or year</option>
                          <option value="rollingThreeMonthAverageSpend">Rolling 3-month average spend</option>
                          <option value="goalProgressComparison">Goal progress comparison across active goals</option>
                          <option value="monthlyForecastVsActual">Monthly forecast vs actual</option>
                        </select>
                      </label>
                      <label className={styles.controlItem}>
                        <span>Chart type</span>
                        <select className={styles.select} value={customVisualChartType} onChange={(event) => setCustomVisualChartType(event.target.value as DashboardVisualChartType)}>
                          {availableCustomChartTypes.map((chartType) => (
                            <option key={chartType} value={chartType}>{chartType[0].toUpperCase() + chartType.slice(1)}</option>
                          ))}
                        </select>
                      </label>
                      {customVisualSource === "monthlyMetric" ? (
                        <label className={styles.controlItem}>
                          <span>Metric</span>
                          <select className={styles.select} value={customVisualMetric} onChange={(event) => setCustomVisualMetric(event.target.value as CustomMetric)}>
                            <option value="spendings">Spendings</option>
                            <option value="income">Income</option>
                            <option value="net">Net</option>
                          </select>
                        </label>
                      ) : null}
                      {customVisualSource === "categoryTrend" ? (
                        <label className={styles.controlItem}>
                          <span>Category</span>
                          <select className={styles.select} value={customVisualCategory} onChange={(event) => setCustomVisualCategory(event.target.value)}>
                            {customVisualCategories.map((category) => <option key={category} value={category}>{category}</option>)}
                          </select>
                        </label>
                      ) : null}
                      {customVisualSource === "incomeSourceBreakdown" ? (
                        <label className={styles.controlItem}>
                          <span>Period</span>
                          <select className={styles.select} value={customVisualPeriod} onChange={(event) => setCustomVisualPeriod(event.target.value as DashboardVisualPeriod)}>
                            <option value="year">Year</option>
                            <option value="month">Month</option>
                          </select>
                        </label>
                      ) : null}
                      {customVisualSource === "monthBreakdown" || customVisualSource === "monthSnapshot" || customVisualSource === "monthlyForecastVsActual" || (customVisualSource === "incomeSourceBreakdown" && customVisualPeriod === "month") ? (
                        <label className={styles.controlItem}>
                          <span>Month</span>
                          <select className={styles.select} value={customVisualMonth} onChange={(event) => setCustomVisualMonth(event.target.value as MonthKey)}>
                            {MONTHS.map((month) => <option key={month} value={month}>{month}</option>)}
                          </select>
                        </label>
                      ) : null}
                    </div>

                    <div className={styles.visualBuilderActions}>
                      <button type="button" className={`${styles.toggleButton} ${styles.toggleButtonActive}`} onClick={() => void addCustomVisual()} disabled={!canCreateCustomDashboardVisuals || dashboardSettings.customVisuals.length >= CUSTOM_VISUAL_LIMIT}>
                        Add visual
                      </button>
                      {!canCreateCustomDashboardVisuals ? <span className={styles.layoutHint}>Available on Pro.</span> : null}
                    </div>
                  </section>
                ) : null}
              </section>

      {visibleOrderedWidgets.map((widget) => renderDashboardWidget(widget))}

      {dashboardSettings.customVisuals.length > 0 ? (
        <section className={styles.widgetStack}>
          <div className={styles.widgetHeader}>
            <h2>Custom Visuals</h2>
          </div>
          <div className={styles.customVisualGrid}>
            {dashboardSettings.customVisuals.map((visual) => (
              <section key={visual.id} className={styles.chartSection}>
                <div className={styles.sectionHeader}>
                  <div>
                    <h2>{visual.title}</h2>
                    <p>{getVisualSubtitle(visual)}</p>
                  </div>
                  {canCreateCustomDashboardVisuals ? (
                    <button type="button" className={styles.visibilityToggle} onClick={() => void removeCustomVisual(visual.id)}>
                      <span>Remove</span>
                    </button>
                  ) : null}
                </div>
                <div className={styles.chartFrameTall}>
                  <Chart
                    data={buildVisualData(visual)}
                    type={visual.chartType}
                    showLegend={visual.chartType === "doughnut"}
                    legendSpacing={visual.chartType === "doughnut" ? "roomy" : "default"}
                    valueFormat={getVisualFormat(visual.source)}
                  />
                </div>
              </section>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}