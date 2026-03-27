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