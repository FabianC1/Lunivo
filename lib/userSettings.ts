import { initialBudgets } from "./budgets";

export type DashboardWidgetKey = "charts" | "goals" | "transactions";
export type ThemeMode = "light" | "dark";

export type ThemeColors = {
  bgColor: string;
  textColor: string;
  primaryColor: string;
  accentColor: string;
  highlightColor: string;
  cardColor: string;
  navbarColor: string;
  navbarBorderGradient: string;
  navbarTextColor: string;
  bgGradient: string;
  buttonGradientStart: string;
  buttonGradientEnd: string;
  foregroundRgb: string;
  backgroundStartRgb: string;
  backgroundEndRgb: string;
};

export type ThemePreset = {
  id: string;
  name: string;
  mode: ThemeMode;
  colors: ThemeColors;
  isCustom?: boolean;
};

export type AppearanceSettings = {
  selectedThemeId: string;
  customThemes: ThemePreset[];
};

export type DashboardSettings = {
  visibleWidgets: Record<DashboardWidgetKey, boolean>;
  widgetOrder: DashboardWidgetKey[];
  defaultWidget: DashboardWidgetKey;
};

export const DASHBOARD_WIDGETS: DashboardWidgetKey[] = ["charts", "goals", "transactions"];
export const DEFAULT_CUSTOM_CATEGORIES = Object.keys(initialBudgets);
export const THEME_STORAGE_KEY = "lunivo-theme-settings";

function createTheme(
  id: string,
  name: string,
  mode: ThemeMode,
  colors: ThemeColors,
): ThemePreset {
  return { id, name, mode, colors };
}

export const BUILT_IN_THEME_PRESETS: ThemePreset[] = [
  createTheme("light", "Lunivo Light", "light", {
    bgColor: "#F8FAFC",
    textColor: "#1E293B",
    primaryColor: "#3B82F6",
    accentColor: "#8B5CF6",
    highlightColor: "#F97316",
    cardColor: "#FFFFFF",
    navbarColor: "linear-gradient(135deg, #CBD5E1 0%, #94A3B8 100%)",
    navbarBorderGradient: "linear-gradient(90deg, #8B5CF6 0%, #F97316 100%)",
    navbarTextColor: "#1E293B",
    bgGradient: "linear-gradient(135deg, #F3E8FF 0%, #FDF2F8 48%, #FFEDD5 100%)",
    buttonGradientStart: "#8B5CF6",
    buttonGradientEnd: "#F97316",
    foregroundRgb: "30, 41, 59",
    backgroundStartRgb: "243, 232, 255",
    backgroundEndRgb: "255, 237, 213",
  }),
  createTheme("dark", "Lunivo Night", "dark", {
    bgColor: "#0F172A",
    textColor: "#F1F5F9",
    primaryColor: "#60A5FA",
    accentColor: "#FF4D00",
    highlightColor: "#DB48EC",
    cardColor: "#1E293B",
    navbarColor: "linear-gradient(135deg, #1E293B 0%, #334155 100%)",
    navbarBorderGradient: "linear-gradient(90deg, #8B5CF6 0%, #40E0D0 100%)",
    navbarTextColor: "#F1F5F9",
    bgGradient: "linear-gradient(135deg, #0C1D3D 0%, #1A1558 50%, #2D1B3D 100%)",
    buttonGradientStart: "#8B5CF6",
    buttonGradientEnd: "#40E0D0",
    foregroundRgb: "241, 245, 249",
    backgroundStartRgb: "12, 29, 61",
    backgroundEndRgb: "45, 27, 61",
  }),
  createTheme("sage", "Sage Ledger", "light", {
    bgColor: "#F4FBF6",
    textColor: "#20352B",
    primaryColor: "#2F855A",
    accentColor: "#1F6F78",
    highlightColor: "#D97706",
    cardColor: "#FFFFFF",
    navbarColor: "linear-gradient(135deg, #D9F3E4 0%, #BEE3D2 100%)",
    navbarBorderGradient: "linear-gradient(90deg, #2F855A 0%, #D97706 100%)",
    navbarTextColor: "#20352B",
    bgGradient: "linear-gradient(135deg, #EEFDF3 0%, #F4FBF6 50%, #FFF6E7 100%)",
    buttonGradientStart: "#2F855A",
    buttonGradientEnd: "#D97706",
    foregroundRgb: "32, 53, 43",
    backgroundStartRgb: "238, 253, 243",
    backgroundEndRgb: "255, 246, 231",
  }),
  createTheme("ocean", "Ocean Budget", "light", {
    bgColor: "#F2FBFF",
    textColor: "#16324F",
    primaryColor: "#0284C7",
    accentColor: "#0F766E",
    highlightColor: "#F97316",
    cardColor: "#FFFFFF",
    navbarColor: "linear-gradient(135deg, #D9F0FF 0%, #BAE6FD 100%)",
    navbarBorderGradient: "linear-gradient(90deg, #0284C7 0%, #0F766E 100%)",
    navbarTextColor: "#16324F",
    bgGradient: "linear-gradient(135deg, #E0F2FE 0%, #F2FBFF 55%, #ECFEFF 100%)",
    buttonGradientStart: "#0284C7",
    buttonGradientEnd: "#0F766E",
    foregroundRgb: "22, 50, 79",
    backgroundStartRgb: "224, 242, 254",
    backgroundEndRgb: "236, 254, 255",
  }),
  createTheme("rose", "Rose Balance", "light", {
    bgColor: "#FFF7FA",
    textColor: "#4A1D33",
    primaryColor: "#DB2777",
    accentColor: "#F43F5E",
    highlightColor: "#8B5CF6",
    cardColor: "#FFFFFF",
    navbarColor: "linear-gradient(135deg, #FCE7F3 0%, #FBCFE8 100%)",
    navbarBorderGradient: "linear-gradient(90deg, #DB2777 0%, #8B5CF6 100%)",
    navbarTextColor: "#4A1D33",
    bgGradient: "linear-gradient(135deg, #FDF2F8 0%, #FFF7FA 50%, #F5F3FF 100%)",
    buttonGradientStart: "#DB2777",
    buttonGradientEnd: "#8B5CF6",
    foregroundRgb: "74, 29, 51",
    backgroundStartRgb: "253, 242, 248",
    backgroundEndRgb: "245, 243, 255",
  }),
  createTheme("amber", "Amber Focus", "light", {
    bgColor: "#FFFBEB",
    textColor: "#422006",
    primaryColor: "#D97706",
    accentColor: "#B45309",
    highlightColor: "#0EA5E9",
    cardColor: "#FFFFFF",
    navbarColor: "linear-gradient(135deg, #FDE68A 0%, #FCD34D 100%)",
    navbarBorderGradient: "linear-gradient(90deg, #D97706 0%, #0EA5E9 100%)",
    navbarTextColor: "#422006",
    bgGradient: "linear-gradient(135deg, #FEF3C7 0%, #FFFBEB 50%, #EFF6FF 100%)",
    buttonGradientStart: "#D97706",
    buttonGradientEnd: "#0EA5E9",
    foregroundRgb: "66, 32, 6",
    backgroundStartRgb: "254, 243, 199",
    backgroundEndRgb: "239, 246, 255",
  }),
  createTheme("mint-night", "Mint Night", "dark", {
    bgColor: "#071A16",
    textColor: "#E6FFFB",
    primaryColor: "#14B8A6",
    accentColor: "#34D399",
    highlightColor: "#F59E0B",
    cardColor: "#102822",
    navbarColor: "linear-gradient(135deg, #0F2F29 0%, #153932 100%)",
    navbarBorderGradient: "linear-gradient(90deg, #14B8A6 0%, #F59E0B 100%)",
    navbarTextColor: "#E6FFFB",
    bgGradient: "linear-gradient(135deg, #05211C 0%, #071A16 50%, #172554 100%)",
    buttonGradientStart: "#14B8A6",
    buttonGradientEnd: "#F59E0B",
    foregroundRgb: "230, 255, 251",
    backgroundStartRgb: "5, 33, 28",
    backgroundEndRgb: "23, 37, 84",
  }),
  createTheme("graphite", "Graphite Pulse", "dark", {
    bgColor: "#111827",
    textColor: "#F9FAFB",
    primaryColor: "#6366F1",
    accentColor: "#EC4899",
    highlightColor: "#22C55E",
    cardColor: "#1F2937",
    navbarColor: "linear-gradient(135deg, #1F2937 0%, #374151 100%)",
    navbarBorderGradient: "linear-gradient(90deg, #6366F1 0%, #EC4899 100%)",
    navbarTextColor: "#F9FAFB",
    bgGradient: "linear-gradient(135deg, #0F172A 0%, #111827 50%, #27272A 100%)",
    buttonGradientStart: "#6366F1",
    buttonGradientEnd: "#EC4899",
    foregroundRgb: "249, 250, 251",
    backgroundStartRgb: "15, 23, 42",
    backgroundEndRgb: "39, 39, 42",
  }),
  createTheme("aurora", "Aurora Ledger", "dark", {
    bgColor: "#0A1022",
    textColor: "#E0F2FE",
    primaryColor: "#38BDF8",
    accentColor: "#A78BFA",
    highlightColor: "#22C55E",
    cardColor: "#111B35",
    navbarColor: "linear-gradient(135deg, #111B35 0%, #1D2A53 100%)",
    navbarBorderGradient: "linear-gradient(90deg, #38BDF8 0%, #A78BFA 100%)",
    navbarTextColor: "#E0F2FE",
    bgGradient: "linear-gradient(135deg, #020617 0%, #0A1022 45%, #1D4ED8 100%)",
    buttonGradientStart: "#38BDF8",
    buttonGradientEnd: "#A78BFA",
    foregroundRgb: "224, 242, 254",
    backgroundStartRgb: "2, 6, 23",
    backgroundEndRgb: "29, 78, 216",
  }),
  createTheme("ember", "Ember Finance", "dark", {
    bgColor: "#1C0F0A",
    textColor: "#FFF7ED",
    primaryColor: "#F97316",
    accentColor: "#FB7185",
    highlightColor: "#FACC15",
    cardColor: "#2B1812",
    navbarColor: "linear-gradient(135deg, #2B1812 0%, #3B221A 100%)",
    navbarBorderGradient: "linear-gradient(90deg, #F97316 0%, #FB7185 100%)",
    navbarTextColor: "#FFF7ED",
    bgGradient: "linear-gradient(135deg, #140A06 0%, #1C0F0A 50%, #451A03 100%)",
    buttonGradientStart: "#F97316",
    buttonGradientEnd: "#FB7185",
    foregroundRgb: "255, 247, 237",
    backgroundStartRgb: "20, 10, 6",
    backgroundEndRgb: "69, 26, 3",
  }),
  createTheme("violet-night", "Violet Night", "dark", {
    bgColor: "#140B24",
    textColor: "#F5F3FF",
    primaryColor: "#A78BFA",
    accentColor: "#C084FC",
    highlightColor: "#22D3EE",
    cardColor: "#221438",
    navbarColor: "linear-gradient(135deg, #221438 0%, #31214D 100%)",
    navbarBorderGradient: "linear-gradient(90deg, #A78BFA 0%, #22D3EE 100%)",
    navbarTextColor: "#F5F3FF",
    bgGradient: "linear-gradient(135deg, #0F071A 0%, #140B24 50%, #164E63 100%)",
    buttonGradientStart: "#A78BFA",
    buttonGradientEnd: "#22D3EE",
    foregroundRgb: "245, 243, 255",
    backgroundStartRgb: "15, 7, 26",
    backgroundEndRgb: "22, 78, 99",
  }),
  createTheme("forest-night", "Forest Night", "dark", {
    bgColor: "#08140D",
    textColor: "#ECFDF5",
    primaryColor: "#22C55E",
    accentColor: "#10B981",
    highlightColor: "#F59E0B",
    cardColor: "#13221A",
    navbarColor: "linear-gradient(135deg, #13221A 0%, #1D3024 100%)",
    navbarBorderGradient: "linear-gradient(90deg, #22C55E 0%, #F59E0B 100%)",
    navbarTextColor: "#ECFDF5",
    bgGradient: "linear-gradient(135deg, #052E16 0%, #08140D 50%, #14532D 100%)",
    buttonGradientStart: "#22C55E",
    buttonGradientEnd: "#F59E0B",
    foregroundRgb: "236, 253, 245",
    backgroundStartRgb: "5, 46, 22",
    backgroundEndRgb: "20, 83, 45",
  }),
];

export const DEFAULT_APPEARANCE_SETTINGS: AppearanceSettings = {
  selectedThemeId: "light",
  customThemes: [],
};

export const DEFAULT_DASHBOARD_SETTINGS: DashboardSettings = {
  visibleWidgets: {
    charts: true,
    goals: true,
    transactions: true,
  },
  widgetOrder: [...DASHBOARD_WIDGETS],
  defaultWidget: "charts",
};

function isThemePreset(value: unknown): value is ThemePreset {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return typeof candidate.id === "string"
    && typeof candidate.name === "string"
    && (candidate.mode === "light" || candidate.mode === "dark")
    && typeof candidate.colors === "object"
    && candidate.colors !== null;
}

export function findThemePreset(themeId: string, customThemes: ThemePreset[] = []) {
  return [...customThemes, ...BUILT_IN_THEME_PRESETS].find((theme) => theme.id === themeId) ?? BUILT_IN_THEME_PRESETS[0];
}

export function sanitizeAppearanceSettings(input: unknown): AppearanceSettings {
  const candidate = typeof input === "object" && input !== null ? input as Record<string, unknown> : {};
  const customThemes = Array.isArray(candidate.customThemes)
    ? candidate.customThemes.filter(isThemePreset).map((theme) => ({ ...theme, isCustom: true }))
    : [];
  const selectedThemeId = typeof candidate.selectedThemeId === "string"
    ? candidate.selectedThemeId
    : DEFAULT_APPEARANCE_SETTINGS.selectedThemeId;

  return {
    selectedThemeId: findThemePreset(selectedThemeId, customThemes).id,
    customThemes,
  };
}

export function sanitizeDashboardSettings(input: unknown): DashboardSettings {
  const candidate = typeof input === "object" && input !== null ? input as Record<string, unknown> : {};
  const visibleWidgets = typeof candidate.visibleWidgets === "object" && candidate.visibleWidgets !== null
    ? candidate.visibleWidgets as Record<string, unknown>
    : {};
  const widgetOrder = Array.isArray(candidate.widgetOrder)
    ? candidate.widgetOrder.filter((widget): widget is DashboardWidgetKey => DASHBOARD_WIDGETS.includes(widget as DashboardWidgetKey))
    : [];
  const orderedWidgets = [...widgetOrder, ...DASHBOARD_WIDGETS.filter((widget) => !widgetOrder.includes(widget))];
  const defaultWidget = typeof candidate.defaultWidget === "string" && DASHBOARD_WIDGETS.includes(candidate.defaultWidget as DashboardWidgetKey)
    ? candidate.defaultWidget as DashboardWidgetKey
    : DEFAULT_DASHBOARD_SETTINGS.defaultWidget;

  return {
    visibleWidgets: {
      charts: visibleWidgets.charts !== undefined ? Boolean(visibleWidgets.charts) : true,
      goals: visibleWidgets.goals !== undefined ? Boolean(visibleWidgets.goals) : true,
      transactions: visibleWidgets.transactions !== undefined ? Boolean(visibleWidgets.transactions) : true,
    },
    widgetOrder: orderedWidgets,
    defaultWidget,
  };
}

export function sanitizeCustomCategories(input: unknown) {
  const values = Array.isArray(input) ? input : [];
  const normalized = values
    .map((value) => String(value ?? "").trim())
    .filter(Boolean)
    .filter((value) => value.length <= 40);

  return Array.from(new Set([...DEFAULT_CUSTOM_CATEGORIES, ...normalized]));
}