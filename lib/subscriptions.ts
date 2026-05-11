export type SubscriptionPlan = {
  slug: string;
  name: string;
  priceMonthly: number;
  description: string;
  featured?: boolean;
  audience: string;
  features: string[];
};

export type SubscriptionPlanSlug = 'free' | 'smart' | 'pro';

export type SubscriptionFeatureKey =
  | 'multipleEvents'
  | 'affordabilityAdvanced'
  | 'savingsTimeline'
  | 'scenarios'
  | 'scenarioComparison'
  | 'whatIfControls'
  | 'recommendationEngine'
  | 'csvExport'
  | 'customThemeCreation'
  | 'themeLibrary'
  | 'moodboard'
  | 'milestones'
  | 'dashboardWidgetToggles'
  | 'customDashboardVisuals';

const PLAN_ORDER: SubscriptionPlanSlug[] = ['free', 'smart', 'pro'];

const FEATURE_MINIMUM_PLAN: Record<SubscriptionFeatureKey, SubscriptionPlanSlug> = {
  multipleEvents: 'smart',
  affordabilityAdvanced: 'smart',
  savingsTimeline: 'smart',
  scenarios: 'smart',
  scenarioComparison: 'pro',
  whatIfControls: 'pro',
  recommendationEngine: 'pro',
  csvExport: 'pro',
  customThemeCreation: 'pro',
  themeLibrary: 'smart',
  moodboard: 'free',
  milestones: 'free',
  dashboardWidgetToggles: 'smart',
  customDashboardVisuals: 'pro',
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
  slug: 'free',
  name: 'Starter',
  priceMonthly: 0,
  description: 'Plan one life event with a full budget builder, affordability calculator, and moodboard.',
  audience: 'Best for getting started',
  features: [
    '1 event',
    'Budget builder with cost clusters',
    'Affordability engine (simple mode)',
    'Milestone tracker',
    'Moodboard & visuals',
    '2 built-in themes',
  ],
};

export const PAID_SUBSCRIPTION_TIERS: SubscriptionPlan[] = [
  {
    slug: 'smart',
    name: 'Smart',
    priceMonthly: 8,
    description: 'Plan multiple events with savings forecasting, affordability analysis, and scenario building.',
    audience: 'Best for serious planners',
    featured: true,
    features: [
      'Up to 10 events',
      'Everything in Starter',
      'Advanced affordability engine',
      'Savings timeline chart',
      'Scenario builder',
      'Dashboard widget toggles',
      '12 built-in themes',
    ],
  },
  {
    slug: 'pro',
    name: 'Pro',
    priceMonthly: 14,
    description: 'Unlimited events, what-if scenario planning, exports, custom themes, and the full decision toolkit.',
    audience: 'Ultimate planning toolkit',
    features: [
      'Unlimited events',
      'Everything in Smart',
      'Scenario comparison table',
      'What-if controls (live)',
      'Recommendation engine',
      'CSV / Excel export',
      'Custom theme creation',
      'Custom dashboard visuals',
    ],
  },
];

export const ALL_SUBSCRIPTION_PLANS = [FREE_PLAN, ...PAID_SUBSCRIPTION_TIERS];

export const SUBSCRIPTION_COMPARISON_SECTIONS: SubscriptionComparisonSection[] = [
  {
    title: 'Events & Planning',
    rows: [
      {
        label: 'Number of events',
        description: 'How many life events you can plan simultaneously.',
        values: { free: '1 event', smart: 'Up to 10', pro: 'Unlimited' },
      },
      {
        label: 'Budget builder',
        description: 'Build cost clusters for your event with live totals.',
        values: { free: true, smart: true, pro: true },
      },
      {
        label: 'Milestone tracker',
        description: 'Add deposit deadlines and payment milestones.',
        values: { free: true, smart: true, pro: true },
      },
      {
        label: 'Moodboard & visuals',
        description: 'Upload inspiration images for your event.',
        values: { free: true, smart: true, pro: true },
      },
    ],
  },
  {
    title: 'Affordability & Forecasting',
    rows: [
      {
        label: 'Affordability engine (simple)',
        description: 'Calculate required monthly savings to reach your goal by event date.',
        values: { free: true, smart: true, pro: true },
      },
      {
        label: 'Affordability engine (advanced)',
        description: 'Factor in monthly income and commitments for a full affordability picture.',
        values: { free: false, smart: true, pro: true },
      },
      {
        label: 'Savings timeline chart',
        description: 'Visualise your savings curve toward the event date.',
        values: { free: false, smart: true, pro: true },
      },
      {
        label: 'Recommendation engine',
        description: 'Get suggestions like "reduce guest count by 20 to save £3,400".',
        values: { free: false, smart: false, pro: true },
      },
    ],
  },
  {
    title: 'Scenario Planning',
    rows: [
      {
        label: 'Scenario builder',
        description: 'Clone your event budget into named scenarios (Budget / Standard / Luxury).',
        values: { free: false, smart: true, pro: true },
      },
      {
        label: 'Scenario comparison table',
        description: 'Compare total cost, monthly savings, and feasibility side by side.',
        values: { free: false, smart: false, pro: true },
      },
      {
        label: 'What-if controls',
        description: 'Adjust guest count, venue tier, or date and see financial impact in real time.',
        values: { free: false, smart: false, pro: true },
      },
    ],
  },
  {
    title: 'Themes & Personalisation',
    rows: [
      {
        label: 'Theme selection',
        description: 'Choose from built-in colour themes.',
        values: { free: '2 themes', smart: '12 themes', pro: 'Full library' },
      },
      {
        label: 'Custom theme creation',
        description: 'Build and save your own colour themes.',
        values: { free: false, smart: false, pro: true },
      },
      {
        label: 'Custom dashboard visuals',
        description: 'Build your own charts and pin them to the dashboard.',
        values: { free: false, smart: false, pro: true },
      },
    ],
  },
  {
    title: 'Data & Export',
    rows: [
      {
        label: 'CSV / Excel export',
        description: 'Export your event budget and plan as a spreadsheet.',
        values: { free: false, smart: false, pro: true },
      },
    ],
  },
];

export function getSubscriptionPlanBySlug(slug: string | null | undefined): SubscriptionPlan | null {
  if (!slug) return null;
  const normalized = normalizePlanSlug(slug);
  return ALL_SUBSCRIPTION_PLANS.find((p) => p.slug === normalized) ?? null;
}

export function normalizePlanSlug(slug: string | null | undefined): SubscriptionPlanSlug {
  const s = (slug ?? '').trim().toLowerCase();
  if (s === 'scale' || s === 'pro') return 'pro';
  if (s === 'sync' || s === 'smart' || s === 'growth' || s === 'starter') return 'smart';
  return 'free';
}

export function hasPlanAccess(
  currentPlan: string | null | undefined,
  minimumPlan: SubscriptionPlanSlug
): boolean {
  return PLAN_ORDER.indexOf(normalizePlanSlug(currentPlan)) >= PLAN_ORDER.indexOf(minimumPlan);
}

export function getMinimumPlanForFeature(feature: SubscriptionFeatureKey): SubscriptionPlanSlug {
  return FEATURE_MINIMUM_PLAN[feature];
}

export function hasFeatureAccess(
  currentPlan: string | null | undefined,
  feature: SubscriptionFeatureKey
): boolean {
  return hasPlanAccess(currentPlan, getMinimumPlanForFeature(feature));
}

export function getAvailableBuiltInThemeCount(currentPlan: string | null | undefined): number {
  const plan = normalizePlanSlug(currentPlan);
  return plan === 'free' ? 2 : 12;
}

export function getEventLimit(currentPlan: string | null | undefined): number | null {
  const plan = normalizePlanSlug(currentPlan);
  if (plan === 'pro') return null;
  if (plan === 'smart') return 10;
  return 1;
}

export function formatPlanPrice(priceMonthly: number): string {
  return priceMonthly === 0 ? 'Free' : `£${priceMonthly}/month`;
}
