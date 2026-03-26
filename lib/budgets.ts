export interface BudgetMap {
  [category: string]: number;
}

export const initialBudgets: BudgetMap = {
  Food: 500,
  Transport: 150,
  Utilities: 200,
  Entertainment: 180,
  Other: 100,
};

const DEFAULT_CATEGORY_ORDER = Object.keys(initialBudgets);

const STORAGE_KEY = "lunivo-budgets";

function sortBudgetEntries(entries: Array<[string, number]>): BudgetMap {
  return Object.fromEntries(
    entries.sort(([left], [right]) => {
      const leftDefaultIndex = DEFAULT_CATEGORY_ORDER.indexOf(left);
      const rightDefaultIndex = DEFAULT_CATEGORY_ORDER.indexOf(right);

      if (leftDefaultIndex !== -1 || rightDefaultIndex !== -1) {
        if (leftDefaultIndex === -1) return 1;
        if (rightDefaultIndex === -1) return -1;
        return leftDefaultIndex - rightDefaultIndex;
      }

      return left.localeCompare(right);
    })
  );
}

export function normalizeBudgetCategoryName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function normalizeBudgetMap(value: unknown, defaults: BudgetMap = initialBudgets): BudgetMap {
  const safeBudgets = new Map<string, number>();

  for (const [category, amount] of Object.entries(defaults)) {
    safeBudgets.set(category, amount);
  }

  if (!value || typeof value !== "object") {
    return sortBudgetEntries(Array.from(safeBudgets.entries()));
  }

  for (const [rawCategory, rawValue] of Object.entries(value as Record<string, unknown>)) {
    const category = normalizeBudgetCategoryName(rawCategory);
    if (!category) {
      continue;
    }

    if (typeof rawValue === "number" && Number.isFinite(rawValue)) {
      safeBudgets.set(category, rawValue);
      continue;
    }

    if (typeof rawValue === "string" && rawValue.trim() !== "") {
      const parsedValue = Number(rawValue);
      if (Number.isFinite(parsedValue)) {
        safeBudgets.set(category, parsedValue);
      }
    }
  }

  return sortBudgetEntries(Array.from(safeBudgets.entries()));
}

export function sanitizeBudgets(value: unknown): BudgetMap {
  return normalizeBudgetMap(value, initialBudgets);
}

export function loadBudgets(): BudgetMap {
  if (typeof window === "undefined") {
    return initialBudgets;
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return initialBudgets;
    }

    return sanitizeBudgets(JSON.parse(stored));
  } catch {
    return initialBudgets;
  }
}

export function saveBudgets(budgets: BudgetMap) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitizeBudgets(budgets)));
}