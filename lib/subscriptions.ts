export type SubscriptionPlan = {
  slug: string;
  name: string;
  priceMonthly: number;
  description: string;
  featured?: boolean;
  audience: string;
  themeAccess: string;
  reportsAccess: string;
  supportLevel: string;
  features: string[];
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
  description: "A solid base for tracking everyday money movement, keeping budgets in check, and learning the product before you upgrade.",
  audience: "Best for getting started",
  themeAccess: "1 core theme",
  reportsAccess: "Basic summaries",
  supportLevel: "Community support",
  features: [
    "Income and spending tracking",
    "Core monthly budgeting",
    "Dashboard totals and quick charts",
    "Manual category-based planning",
    "Basic profile and preferences",
  ],
};

export const PAID_SUBSCRIPTION_TIERS: SubscriptionPlan[] = [
  {
    slug: "starter",
    name: "Starter",
    priceMonthly: 8,
    description: "Built for users who want a cleaner day-to-day budgeting workflow, better visuals, and a little more room to organize their finances.",
    audience: "Best for individuals",
    themeAccess: "Selection of built-in themes",
    reportsAccess: "Enhanced monthly insights",
    supportLevel: "Priority email support",
    features: [
      "Everything in Free",
      "Richer category insights",
      "Cleaner spending breakdowns",
      "Enhanced monthly budget analysis",
      "Extra dashboard widgets",
      "Quarterly trend snapshots",
      "Access to a built-in theme selection",
      "Faster export-ready summaries",
      "Priority email support",
    ],
  },
  {
    slug: "growth",
    name: "Growth",
    priceMonthly: 18,
    description: "Made for active budgeters who want stronger forecasting, deeper reports, better review tools, and more personalization across the app.",
    audience: "Best for active budgeters",
    featured: true,
    themeAccess: "Larger built-in theme selection",
    reportsAccess: "Advanced reports and forecasting",
    supportLevel: "Priority support with faster turnaround",
    features: [
      "Everything in Starter",
      "Advanced financial reports",
      "Longer trend history",
      "Savings-rate and cash-flow forecasting tools",
      "Smarter month-over-month comparisons",
      "Goal and budget performance views",
      "Access to a larger set of built-in themes",
      "More detailed income source analysis",
      "Priority support with faster turnaround",
    ],
  },
  {
    slug: "scale",
    name: "Scale",
    priceMonthly: 34,
    description: "Designed for power users, shared households, and anyone who wants the full Lunivo workspace with the richest controls, themes, and reporting depth.",
    audience: "Best for households and power users",
    themeAccess: "Create your own themes",
    reportsAccess: "Full reporting and export suite",
    supportLevel: "White-glove priority support",
    features: [
      "Everything in Growth",
      "Multi-profile support",
      "Full CSV and data export tools",
      "Shared household budgeting workflows",
      "Deeper planning views for longer timelines",
      "Create your own custom themes",
      "Save and reuse personal theme presets",
      "Early access feature previews",
      "Richer data controls and export tooling",
      "White-glove priority support",
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
        values: { free: true, starter: true, growth: true, scale: true },
      },
      {
        label: "Spending tracking",
        description: "Log, edit, and review spending entries.",
        values: { free: true, starter: true, growth: true, scale: true },
      },
      {
        label: "Budget management",
        description: "Set and maintain category spending limits.",
        values: { free: true, starter: true, growth: true, scale: true },
      },
      {
        label: "Goals tracking",
        description: "Track savings goals and completion progress.",
        values: { free: true, starter: true, growth: true, scale: true },
      },
      {
        label: "Dashboard insights",
        description: "See the main dashboard with current income and spending summaries.",
        values: { free: "Basic", starter: "Enhanced", growth: "Advanced", scale: "Advanced" },
      },
    ],
  },
  {
    title: "Reports & Analysis",
    rows: [
      {
        label: "Monthly summaries",
        description: "Review month-level totals and visual summaries.",
        values: { free: true, starter: true, growth: true, scale: true },
      },
      {
        label: "Detailed reports",
        description: "Use deeper category and performance reporting views.",
        values: { free: false, starter: false, growth: true, scale: true },
      },
      {
        label: "Forecasting tools",
        description: "See projected savings, cash-flow, and longer-range planning estimates.",
        values: { free: false, starter: false, growth: true, scale: true },
      },
      {
        label: "Long-range planning views",
        description: "Plan further ahead with deeper timeline views and comparisons.",
        values: { free: false, starter: false, growth: false, scale: true },
      },
      {
        label: "Export-ready summaries",
        description: "Use cleaner summaries prepared for sharing or export workflows.",
        values: { free: false, starter: true, growth: true, scale: true },
      },
    ],
  },
  {
    title: "Themes & Personalization",
    rows: [
      {
        label: "Theme selection",
        description: "Choose from the available built-in theme options.",
        values: { free: "1 theme", starter: "4 built-in themes", growth: "12 built-in themes", scale: "Full library" },
      },
      {
        label: "Custom theme creation",
        description: "Create your own theme presets and save them for reuse.",
        values: { free: false, starter: false, growth: false, scale: true },
      },
      {
        label: "Saved theme presets",
        description: "Store and switch between personal visual presets.",
        values: { free: false, starter: false, growth: false, scale: true },
      },
      {
        label: "Expanded dashboard layout options",
        description: "Access more ways to surface information in the dashboard.",
        values: { free: false, starter: true, growth: true, scale: true },
      },
    ],
  },
  {
    title: "Household & Data Access",
    rows: [
      {
        label: "Multi-profile support",
        description: "Manage shared or separate finance profiles inside one workspace.",
        values: { free: false, starter: false, growth: false, scale: true },
      },
      {
        label: "CSV and data exports",
        description: "Export account and planning data for external use.",
        values: { free: false, starter: false, growth: false, scale: true },
      },
      {
        label: "Shared household workflows",
        description: "Coordinate planning for family or shared-finance use cases.",
        values: { free: false, starter: false, growth: false, scale: true },
      },
      {
        label: "Priority feature previews",
        description: "Get access to selected upcoming product features before general release.",
        values: { free: false, starter: false, growth: false, scale: true },
      },
    ],
  },
  {
    title: "Support",
    rows: [
      {
        label: "Support level",
        description: "How quickly and directly support is provided.",
        values: {
          free: "Community",
          starter: "Priority email",
          growth: "Priority with faster turnaround",
          scale: "White-glove priority",
        },
      },
    ],
  },
];

export function getSubscriptionPlanBySlug(slug: string | null | undefined) {
  if (!slug) {
    return null;
  }

  const normalizedSlug = slug.trim().toLowerCase();
  return ALL_SUBSCRIPTION_PLANS.find((plan) => plan.slug === normalizedSlug) ?? null;
}

export function formatPlanPrice(priceMonthly: number) {
  return priceMonthly === 0 ? "Free" : `GBP ${priceMonthly}/month`;
}