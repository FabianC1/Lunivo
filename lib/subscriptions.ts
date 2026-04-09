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
    canUseExports: false,
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
  name: "Starter",
  priceMonthly: 0,
  description: "Manual money tracking for people who want to log spending, income, budgets, and goals themselves without automated syncing.",
  audience: "Best for getting started",
  themeAccess: "1 core theme",
  reportsAccess: "Basic summaries",
  features: [
    "Manual income entry",
    "Manual spending entry",
    "Core budgeting and goals tracking",
    "Income and expense breakdowns",
    "Monthly summary and savings rate view",
    "Savings progress chart and contribution planning",
    "Basic dashboard insights",
    "Basic profile and preferences",
  ],
};

export const PAID_SUBSCRIPTION_TIERS: SubscriptionPlan[] = [
  {
    slug: "sync",
    name: "Smart",
    priceMonthly: 8,
    description: "Automatic bank-connected tracking for people who want income and spendings synced into Lunivo instead of entering everything manually.",
    audience: "Best for automatic tracking",
    featured: true,
    themeAccess: "12 built-in themes",
    reportsAccess: "Breakdowns, forecasting, and planning",
    features: [
      "Everything in Starter",
      "Automatic bank account sync",
      "Auto-categorised income and spending history",
      "End-of-month balance estimate",
      "Monthly savings estimate",
      "3-month average spending calculation",
      "Goal completion estimate",
      "Dashboard widget toggles and reordering",
      "Built-in theme library",
    ],
  },
  {
    slug: "scale",
    name: "Pro",
    priceMonthly: 14,
    description: "Designed for people who want exports, transaction organisation tools, theme creation, and the fullest Lunivo workspace controls.",
    audience: "Ultimate finance tracker",
    themeAccess: "Create your own themes",
    reportsAccess: "Full reporting, CSV exports, and data controls",
    features: [
      "Everything in Smart",
      "Export monthly summary as CSV",
      "Export category breakdown as CSV",
      "Create, edit, and delete custom categories",
      "Add tags to transactions",
      "Bulk edit transaction categories",
      "Merge categories",
      "Create your own custom themes",
      "Save and reuse personal theme presets",
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
        label: "Income vs expense breakdown",
        description: "Compare income totals, expense totals, savings rate, and monthly net cash flow in one report.",
        values: { free: true, sync: true, scale: true },
      },
      {
        label: "Income source breakdown",
        description: "Break down salary, freelance, and other income sources by amount and percentage.",
        values: { free: true, sync: true, scale: true },
      },
      {
        label: "Savings rate calculation",
        description: "Calculate monthly savings rate with the formula (income - expenses) / income.",
        values: { free: true, sync: true, scale: true },
      },
      {
        label: "Net flow per month",
        description: "Show whether each month closed with positive or negative cash flow.",
        values: { free: false, sync: true, scale: true },
      },
      {
        label: "Monthly summary view",
        description: "See income, expenses, and net savings together in a single month-level view.",
        values: { free: true, sync: true, scale: true },
      },
      {
        label: "End-of-month balance estimate",
        description: "Estimate month-end balance from current balance, expected income, and average daily spend.",
        values: { free: false, sync: true, scale: true },
      },
      {
        label: "Monthly savings estimate",
        description: "Auto-calculate expected monthly savings as income minus expenses.",
        values: { free: false, sync: true, scale: true },
      },
      {
        label: "3-month average spending",
        description: "Calculate average spending across the latest three months.",
        values: { free: false, sync: true, scale: true },
      },
      {
        label: "Goal completion estimate",
        description: "Estimate how many months remain until a goal reaches its target at the current rate.",
        values: { free: false, sync: true, scale: true },
      },
      {
        label: "Savings progress chart",
        description: "Plot savings progress over time with a line chart.",
        values: { free: true, sync: true, scale: true },
      },
      {
        label: "Manual monthly contribution planning",
        description: "Enter a monthly contribution amount and calculate the projected completion date.",
        values: { free: true, sync: true, scale: true },
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
        label: "Dashboard widget toggles",
        description: "Turn dashboard widgets on or off for charts, goals, and transactions.",
        values: { free: false, sync: true, scale: true },
      },
      {
        label: "Dashboard section reordering",
        description: "Move dashboard sections up or down, or support drag-and-drop ordering later.",
        values: { free: false, sync: true, scale: true },
      },
      {
        label: "Default homepage widget",
        description: "Choose which dashboard widget opens as the default homepage view.",
        values: { free: false, sync: true, scale: true },
      },
    ],
  },
  {
    title: "Data & Advanced Access",
    rows: [
      {
        label: "Custom categories",
        description: "Create, edit, and delete your own transaction categories.",
        values: { free: false, sync: false, scale: true },
      },
      {
        label: "Transaction tags",
        description: "Add tags such as holiday or work to transactions for extra filtering.",
        values: { free: false, sync: false, scale: true },
      },
      {
        label: "Bulk category updates",
        description: "Select multiple transactions and change their category in one action.",
        values: { free: false, sync: false, scale: true },
      },
      {
        label: "Merge categories",
        description: "Merge one category into another and update linked transactions automatically.",
        values: { free: false, sync: false, scale: true },
      },
    ],
  },
];

export function getSubscriptionPlanBySlug(slug: string | null | undefined) {
  if (!slug) {
    return null;
  }

  const trimmedSlug = slug.trim().toLowerCase();
  const normalizedSlug = trimmedSlug === "starter"
    ? "free"
    : trimmedSlug === "growth" || trimmedSlug === "smart"
      ? "sync"
      : trimmedSlug === "pro"
        ? "scale"
        : trimmedSlug;
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
  return priceMonthly === 0 ? "Starter" : `GBP ${priceMonthly}/month`;
}