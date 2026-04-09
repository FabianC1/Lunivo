export type SubscriptionPlan = {
  slug: string;
  name: string;
  priceMonthly: number;
  description: string;
  featured?: boolean;
  audience: string;
  themeAccess: string;
  reportsAccess: string;
  features: string[];
};

export type SubscriptionPlanSlug = "free" | "sync" | "scale";

type PlanCapabilities = {
  maxTransactionsPerMonth: number | null;
  maxGoals: number | null;
  maxAccounts: number | null;
  reportsLevel: "basic" | "advanced" | "full";
  canUseForecasting: boolean;
  canUseExports: boolean;
  canCreateThemes: boolean;
};

const PLAN_ORDER: SubscriptionPlanSlug[] = ["free", "sync", "scale"];

const PLAN_CAPABILITIES: Record<SubscriptionPlanSlug, PlanCapabilities> = {
  free: {
    maxTransactionsPerMonth: 150,
    maxGoals: 5,
    maxAccounts: 2,
    reportsLevel: "basic",
    canUseForecasting: false,
    canUseExports: false,
    canCreateThemes: false,
  },
  sync: {
    maxTransactionsPerMonth: 3000,
    maxGoals: 75,
    maxAccounts: 5,
    reportsLevel: "advanced",
    canUseForecasting: true,
    canUseExports: true,
    canCreateThemes: false,
  },
  scale: {
    maxTransactionsPerMonth: null,
    maxGoals: null,
    maxAccounts: 12,
    reportsLevel: "full",
    canUseForecasting: true,
    canUseExports: true,
    canCreateThemes: true,
  },
};

export type SubscriptionComparisonValue = boolean | string;

export type SubscriptionComparisonRow = {
  label: string;
  description: string;
  values: Record<string, SubscriptionComparisonValue>;
};

export type SubscriptionComparisonSection = {
  title: string;
  rows: SubscriptionComparisonRow[];
};

export const FREE_PLAN: SubscriptionPlan = {
  slug: "free",
  name: "Free",
  priceMonthly: 0,
  description: "Manual money tracking for people who want to log spending, income, budgets, and goals themselves without automated syncing.",
  audience: "Best for manual tracking",
  themeAccess: "1 core theme",
  reportsAccess: "Basic summaries",
  features: [
    "Manual income entry",
    "Manual spending entry",
    "Core budgeting and goals tracking",
    "Basic dashboard insights",
    "Basic profile and preferences",
  ],
};

export const PAID_SUBSCRIPTION_TIERS: SubscriptionPlan[] = [
  {
    slug: "sync",
    name: "Sync",
    priceMonthly: 8,
    description: "Automatic bank-connected tracking for people who want income and spendings synced into Lunivo instead of entering everything manually.",
    audience: "Best for automatic tracking",
    featured: true,
    themeAccess: "12 built-in themes",
    reportsAccess: "Advanced reports and forecasting",
    features: [
      "Everything in Free",
      "Automatic bank account sync",
      "Auto-categorised income and spending history",
      "Advanced financial reports",
      "Savings-rate and cash-flow forecasting tools",
      "Smarter month-over-month comparisons",
      "Goal and budget performance views",
      "Built-in theme library",
      "More detailed income source analysis",
    ],
  },
  {
    slug: "scale",
    name: "Scale",
    priceMonthly: 14,
    description: "Designed for power users, shared households, and anyone who wants the full Lunivo workspace with the richest controls, themes, and reporting depth.",
    audience: "Best for households and power users",
    themeAccess: "Create your own themes",
    reportsAccess: "Full reporting and export suite",
    features: [
      "Everything in Sync",
      "Multi-profile support",
      "Full CSV and data export tools",
      "Shared household budgeting workflows",
      "Deeper planning views for longer timelines",
      "Create your own custom themes",
      "Save and reuse personal theme presets",
      "Early access feature previews",
      "Richer data controls and export tooling",
      "Early access to new features",
    ],
  },
];

export const ALL_SUBSCRIPTION_PLANS = [FREE_PLAN, ...PAID_SUBSCRIPTION_TIERS];

export const SUBSCRIPTION_COMPARISON_SECTIONS: SubscriptionComparisonSection[] = [
  {
    title: "Core Money Tools",
    rows: [
      {
        label: "Income tracking",
        description: "Log income entries and review source history.",
        values: { free: true, sync: true, scale: true },
      },
      {
        label: "Spending tracking",
        description: "Log, edit, and review spending entries.",
        values: { free: true, sync: true, scale: true },
      },
      {
        label: "Budget management",
        description: "Set and maintain category spending limits.",
        values: { free: true, sync: true, scale: true },
      },
      {
        label: "Goals tracking",
        description: "Track savings goals and completion progress.",
        values: { free: true, sync: true, scale: true },
      },
      {
        label: "Bank sync and automation",
        description: "Connect your bank so income and spendings sync automatically into the app.",
        values: { free: false, sync: true, scale: true },
      },
      {
        label: "Dashboard insights",
        description: "See the main dashboard with current income and spending summaries.",
        values: { free: "Basic", sync: "Advanced", scale: "Advanced" },
      },
    ],
  },
  {
    title: "Reports & Analysis",
    rows: [
      {
        label: "Monthly summaries",
        description: "Review month-level totals and visual summaries.",
        values: { free: true, sync: true, scale: true },
      },
      {
        label: "Detailed reports",
        description: "Use deeper category and performance reporting views.",
        values: { free: false, sync: true, scale: true },
      },
      {
        label: "Forecasting tools",
        description: "See projected savings, cash-flow, and longer-range planning estimates.",
        values: { free: false, sync: true, scale: true },
      },
      {
        label: "Long-range planning views",
        description: "Plan further ahead with deeper timeline views and comparisons.",
        values: { free: false, sync: false, scale: true },
      },
      {
        label: "Export-ready summaries",
        description: "Use cleaner summaries prepared for sharing or export workflows.",
        values: { free: false, sync: true, scale: true },
      },
    ],
  },
  {
    title: "Themes & Personalization",
    rows: [
      {
        label: "Theme selection",
        description: "Choose from the available built-in theme options.",
        values: { free: "1 theme", sync: "12 built-in themes", scale: "Full library" },
      },
      {
        label: "Custom theme creation",
        description: "Create your own theme presets and save them for reuse.",
        values: { free: false, sync: false, scale: true },
      },
      {
        label: "Saved theme presets",
        description: "Store and switch between personal visual presets.",
        values: { free: false, sync: false, scale: true },
      },
      {
        label: "Expanded dashboard layout options",
        description: "Access more ways to surface information in the dashboard.",
        values: { free: false, sync: true, scale: true },
      },
    ],
  },
  {
    title: "Household & Data Access",
    rows: [
      {
        label: "Multi-profile support",
        description: "Manage shared or separate finance profiles inside one workspace.",
        values: { free: false, sync: false, scale: true },
      },
      {
        label: "CSV and data exports",
        description: "Export account and planning data for external use.",
        values: { free: false, sync: false, scale: true },
      },
      {
        label: "Shared household workflows",
        description: "Coordinate planning for family or shared-finance use cases.",
        values: { free: false, sync: false, scale: true },
      },
      {
        label: "Shared household workflows",
        description: "Coordinate planning for family or shared-finance use cases.",
        values: { free: false, sync: false, scale: true },
      },
    ],
  },
];

export function getSubscriptionPlanBySlug(slug: string | null | undefined) {
  if (!slug) {
    return null;
  }

  const normalizedSlug = slug.trim().toLowerCase() === "starter"
    ? "free"
    : slug.trim().toLowerCase() === "growth"
      ? "sync"
      : slug.trim().toLowerCase();
  return ALL_SUBSCRIPTION_PLANS.find((plan) => plan.slug === normalizedSlug) ?? null;
}

export function normalizePlanSlug(slug: string | null | undefined): SubscriptionPlanSlug {
  const plan = getSubscriptionPlanBySlug(slug);
  return (plan?.slug as SubscriptionPlanSlug | undefined) ?? "free";
}

export function hasPlanAccess(currentPlan: string | null | undefined, minimumPlan: SubscriptionPlanSlug) {
  return PLAN_ORDER.indexOf(normalizePlanSlug(currentPlan)) >= PLAN_ORDER.indexOf(minimumPlan);
}

export function getPlanCapabilities(plan: string | null | undefined) {
  return PLAN_CAPABILITIES[normalizePlanSlug(plan)];
}

export function formatPlanPrice(priceMonthly: number) {
  return priceMonthly === 0 ? "Free" : `GBP ${priceMonthly}/month`;
}