export type SubscriptionPlan = {
  slug: string;
  name: string;
  priceMonthly: number;
  description: string;
  featured?: boolean;
  audience: string;
  features: string[];
};

export const FREE_PLAN: SubscriptionPlan = {
  slug: "free",
  name: "Free",
  priceMonthly: 0,
  description: "A simple starting point for tracking income, spendings, and budgets.",
  audience: "Best for getting started",
  features: [
    "Income and spending tracking",
    "Core budget planning",
    "Basic charts and summaries",
  ],
};

export const PAID_SUBSCRIPTION_TIERS: SubscriptionPlan[] = [
  {
    slug: "starter",
    name: "Starter",
    priceMonthly: 6,
    description: "A lightweight upgrade for users who want cleaner planning and more polish.",
    audience: "Best for individuals",
    features: [
      "Everything in Free",
      "Richer category insights",
      "Improved monthly budget analysis",
      "Priority email support",
    ],
  },
  {
    slug: "growth",
    name: "Growth",
    priceMonthly: 14,
    description: "For people who want deeper reporting, forecasting, and long-term planning tools.",
    audience: "Best for active budgeters",
    featured: true,
    features: [
      "Everything in Starter",
      "Advanced financial reports",
      "Longer trend history",
      "More planning and forecasting tools",
    ],
  },
  {
    slug: "scale",
    name: "Scale",
    priceMonthly: 29,
    description: "For power users and shared-finance workflows that need more control and access.",
    audience: "Best for households and power users",
    features: [
      "Everything in Growth",
      "Multi-profile support",
      "Data export tools",
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