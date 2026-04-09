import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedApiUser, unauthorizedResponse } from "../../../../lib/apiAuth";
import { connectToDatabase } from "../../../../lib/mongodb";
import { hasFeatureAccess } from "../../../../lib/subscriptions";
import Goal from "../../../../models/Goal";
import Transaction from "../../../../models/Transaction";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;
type MonthKey = (typeof MONTHS)[number];

type MonthReport = {
  income: number;
  spendings: number;
  categories: Record<string, number>;
};

type YearReport = Record<MonthKey, MonthReport>;

function createEmptyYearReport(categories: string[]): YearReport {
  return MONTHS.reduce((report, month) => {
    report[month] = {
      income: 0,
      spendings: 0,
      categories: Object.fromEntries(categories.map((category) => [category, 0])),
    };
    return report;
  }, {} as YearReport);
}

function createEmptyReportData(years: string[], categories: string[]) {
  return years.reduce((report, year) => {
    report[year] = createEmptyYearReport(categories);
    return report;
  }, {} as Record<string, YearReport>);
}

export async function GET(req: NextRequest) {
  const authenticatedUser = await getAuthenticatedApiUser();
  if (!authenticatedUser) {
    return unauthorizedResponse();
  }

  const scope = req.nextUrl.searchParams.get("scope") === "detailed" ? "detailed" : "dashboard";

  await connectToDatabase();

  const grouped = await Transaction.aggregate<{
    _id: { year: number; month: number; kind: "income" | "expense"; category: string };
    total: number;
  }>([
    { $match: { userId: new mongoose.Types.ObjectId(authenticatedUser.userId) } },
    {
      $project: {
        year: { $year: "$date" },
        month: { $month: "$date" },
        kind: 1,
        amount: "$amount",
        category: { $ifNull: ["$category", "Other"] },
      },
    },
    {
      $group: {
        _id: {
          year: "$year",
          month: "$month",
          kind: "$kind",
          category: "$category",
        },
        total: { $sum: "$amount" },
      },
    },
    { $sort: { "_id.year": 1, "_id.month": 1, "_id.kind": 1, "_id.category": 1 } },
  ]);

  const years = Array.from(new Set(grouped.map((entry) => String(entry._id.year))));
  const categories = Array.from(
    new Set(
      grouped
        .filter((entry) => entry._id.kind === "expense")
        .map((entry) => entry._id.category?.trim() || "Other"),
    ),
  ).sort((left, right) => left.localeCompare(right));

  const resolvedYears = years.length > 0 ? years : [String(new Date().getFullYear())];
  const resolvedCategories = categories.length > 0 ? categories : ["Food", "Transport", "Utilities", "Entertainment", "Emergencies", "Other"];
  const reportData = createEmptyReportData(resolvedYears, resolvedCategories);

  for (const entry of grouped) {
    const year = String(entry._id.year);
    const month = MONTHS[entry._id.month - 1] as MonthKey | undefined;
    if (!month || !reportData[year]) {
      continue;
    }

    const report = reportData[year][month];
    const total = Number(entry.total) || 0;
    if (entry._id.kind === "income") {
      report.income += total;
      continue;
    }

    report.spendings += total;
    const category = entry._id.category?.trim() || "Other";
    report.categories[category] = (report.categories[category] ?? 0) + total;
  }

  const latestYear = resolvedYears[resolvedYears.length - 1];
  const latestYearData = reportData[latestYear];
  const annualIncome = MONTHS.reduce((sum, month) => sum + latestYearData[month].income, 0);
  const annualSpendings = MONTHS.reduce((sum, month) => sum + latestYearData[month].spendings, 0);
  const categoryBreakdown = resolvedCategories.reduce((result, category) => {
    result[category] = MONTHS.reduce((sum, month) => sum + (latestYearData[month].categories[category] ?? 0), 0);
    return result;
  }, {} as Record<string, number>);

  const monthlyIncome = MONTHS.reduce((result, month) => {
    result[month] = latestYearData[month].income;
    return result;
  }, {} as Record<string, number>);

  const monthlySpendings = MONTHS.reduce((result, month) => {
    result[month] = latestYearData[month].spendings;
    return result;
  }, {} as Record<string, number>);

  const monthlyNetFlow = MONTHS.reduce((result, month) => {
    result[month] = latestYearData[month].income - latestYearData[month].spendings;
    return result;
  }, {} as Record<string, number>);

  const monthlySavingsProgress = MONTHS.reduce((result, month) => {
    const previousTotal = Object.values(result).at(-1) ?? 0;
    result[month] = previousTotal + monthlyNetFlow[month];
    return result;
  }, {} as Record<string, number>);

  const incomeSourceBreakdown = grouped
    .filter((entry) => String(entry._id.year) === latestYear && entry._id.kind === "income")
    .reduce((result, entry) => {
      const source = entry._id.category?.trim() || "Other";
      result[source] = (result[source] ?? 0) + (Number(entry.total) || 0);
      return result;
    }, {} as Record<string, number>);

  const latestMonthKey = [...MONTHS].reverse().find((month) => latestYearData[month].income > 0 || latestYearData[month].spendings > 0) ?? MONTHS[new Date().getMonth()] ?? "Jan";
  const latestMonthSummary = {
    income: latestYearData[latestMonthKey].income,
    expenses: latestYearData[latestMonthKey].spendings,
    netSavings: latestYearData[latestMonthKey].income - latestYearData[latestMonthKey].spendings,
  };

  const averageDailySpend = annualSpendings > 0 ? annualSpendings / 365 : 0;
  const expectedIncome = monthlyIncome[latestMonthKey] ?? 0;
  const accountBalanceEstimate = latestMonthSummary.netSavings;
  const endOfMonthBalanceEstimate = accountBalanceEstimate + expectedIncome - (averageDailySpend * 30);
  const recentThreeMonths = MONTHS.slice(-3);
  const threeMonthAverageSpending = recentThreeMonths.reduce((sum, month) => sum + latestYearData[month].spendings, 0) / recentThreeMonths.length;
  const monthlySavingsEstimate = annualIncome > 0 ? (annualIncome - annualSpendings) / 12 : 0;

  const goals = scope === "detailed"
    ? await Goal.find({ userId: authenticatedUser.userId, completed: false }).sort({ createdAt: -1 }).limit(6)
    : [];
  const goalEstimates = goals.map((goal) => {
    const remaining = Math.max(0, Number(goal.targetAmount) - Number(goal.savedAmount));
    const currentRateMonths = monthlySavingsEstimate > 0 ? remaining / monthlySavingsEstimate : null;
    const manualContribution = monthlySavingsEstimate > 0 ? monthlySavingsEstimate : remaining;
    const projectedCompletionDate = currentRateMonths === null
      ? null
      : new Date(new Date().setMonth(new Date().getMonth() + Math.ceil(currentRateMonths))).toISOString().slice(0, 10);
    const manualContributionMonths = manualContribution > 0 ? Math.ceil(remaining / manualContribution) : null;

    return {
      id: String(goal._id),
      title: goal.title,
      targetAmount: Number(goal.targetAmount),
      savedAmount: Number(goal.savedAmount),
      remainingAmount: remaining,
      completionMonthsAtCurrentRate: currentRateMonths === null ? null : Number(currentRateMonths.toFixed(1)),
      projectedCompletionDate,
      suggestedMonthlyContribution: Number(manualContribution.toFixed(2)),
      manualContributionMonths,
    };
  });

  return NextResponse.json({
    planSlug: authenticatedUser.planSlug,
    featureAccess: {
      netFlowPerMonth: hasFeatureAccess(authenticatedUser.planSlug, "netFlowPerMonth"),
      endOfMonthBalanceEstimate: hasFeatureAccess(authenticatedUser.planSlug, "endOfMonthBalanceEstimate"),
      monthlySavingsEstimate: hasFeatureAccess(authenticatedUser.planSlug, "monthlySavingsEstimate"),
      threeMonthAverageSpending: hasFeatureAccess(authenticatedUser.planSlug, "threeMonthAverageSpending"),
      goalCompletionEstimate: hasFeatureAccess(authenticatedUser.planSlug, "goalCompletionEstimate"),
      csvExport: hasFeatureAccess(authenticatedUser.planSlug, "csvExport"),
    },
    reportData,
    summaries: {
      annualIncome,
      annualSpendings,
      annualNet: annualIncome - annualSpendings,
      savingsRate: annualIncome > 0 ? ((annualIncome - annualSpendings) / annualIncome) * 100 : 0,
      monthlySavingsEstimate,
      threeMonthAverageSpending,
      endOfMonthBalanceEstimate,
    },
    monthlySummary: latestMonthSummary,
    netFlowByMonth: monthlyNetFlow,
    goalEstimates,
    charts: {
      monthlyIncome,
      monthlySpendings,
      categoryBreakdown,
      incomeSourceBreakdown,
      savingsProgress: monthlySavingsProgress,
    },
  });
}