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

const STORAGE_KEY = "lunivo-budgets";

function sanitizeBudgets(value: unknown): BudgetMap {
  const safeBudgets: BudgetMap = { ...initialBudgets };

  if (!value || typeof value !== "object") {
    return safeBudgets;
  }

  for (const category of Object.keys(initialBudgets)) {
    const rawValue = (value as Record<string, unknown>)[category];

    if (typeof rawValue === "number" && Number.isFinite(rawValue)) {
      safeBudgets[category] = rawValue;
      continue;
    }

    if (typeof rawValue === "string" && rawValue.trim() !== "") {
      const parsedValue = Number(rawValue);
      if (Number.isFinite(parsedValue)) {
        safeBudgets[category] = parsedValue;
      }
    }
  }

  return safeBudgets;
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