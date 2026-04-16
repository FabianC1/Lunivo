"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import DateInput from "../../components/DateInput";
import PageLoading from "../../components/PageLoading";
import { readApiError } from "../../lib/apiClient";
import styles from "./goals.module.css";
import { formatCurrency } from "../../lib/utils";
import { DEMO_PLAN_SLUG, getSession } from "../../lib/auth";
import { FREE_PLAN, getSubscriptionPlanBySlug, hasFeatureAccess } from "../../lib/subscriptions";

const DEMO_GOALS_SEED_KEY = "lunivo-goals-demo-seeded";

type GoalKind =
  | "Home"
  | "Holiday"
  | "Wedding"
  | "Education"
  | "Vehicle"
  | "Emergency Fund"
  | "Birthday"
  | "Other";

interface GoalItem {
  id: string;
  title: string;
  kind: GoalKind;
  targetAmount: number;
  savedAmount: number;
  targetDate: string;
  notes: string;
  completed: boolean;
  completedAt?: string;
  createdAt: string;
}

type Tab = "active" | "completed";

function storageKey(): string {
  const session = getSession();
  return `lunivo-goals-${session?.userId ?? session?.email ?? "guest"}`;
}

function seedKey(): string {
  const session = getSession();
  return `${DEMO_GOALS_SEED_KEY}-${session?.userId ?? session?.email ?? "guest"}`;
}

function loadGoals(): GoalItem[] {
  if (typeof window === "undefined") return getInitialGoals();
  try {
    const raw = localStorage.getItem(storageKey());
    return raw ? (JSON.parse(raw) as GoalItem[]) : getInitialGoals();
  } catch {
    return getInitialGoals();
  }
}

function getInitialGoals(): GoalItem[] {
  const session = getSession();
  // Only show sample goals for explicit demo/local sessions.
  const isDemo = session?.isDemo;
  if (!isDemo) return [];

  return [
    {
      id: crypto.randomUUID(),
      title: "Buy an apartment",
      kind: "Home",
      targetAmount: 150000,
      savedAmount: 42500,
      targetDate: "2027-12-31",
      notes: "First-time buyer. Need to save for down payment and closing costs.",
      completed: false,
      createdAt: new Date("2026-01-15").toISOString(),
    },
    {
      id: crypto.randomUUID(),
      title: "Summer wedding in Portugal",
      kind: "Wedding",
      targetAmount: 25000,
      savedAmount: 18900,
      targetDate: "2026-07-20",
      notes: "Ceremony, reception, and travel for 80 guests.",
      completed: false,
      createdAt: new Date("2025-10-20").toISOString(),
    },
    {
      id: crypto.randomUUID(),
      title: "Japan anniversary trip",
      kind: "Holiday",
      targetAmount: 6400,
      savedAmount: 2150,
      targetDate: "2026-10-05",
      notes: "Flights, rail passes, hotels, and a bit of shopping money.",
      completed: false,
      createdAt: new Date("2026-02-08").toISOString(),
    },
    {
      id: crypto.randomUUID(),
      title: "Emergency fund",
      kind: "Emergency Fund",
      targetAmount: 12000,
      savedAmount: 9300,
      targetDate: "2026-09-30",
      notes: "Keep six months of essential costs parked and untouched.",
      completed: false,
      createdAt: new Date("2025-08-01").toISOString(),
    },
    {
      id: crypto.randomUUID(),
      title: "New car deposit",
      kind: "Vehicle",
      targetAmount: 8000,
      savedAmount: 8000,
      targetDate: "2026-03-18",
      notes: "Deposit saved for a hybrid upgrade before the end of spring.",
      completed: true,
      completedAt: new Date("2026-03-12").toISOString(),
      createdAt: new Date("2025-11-02").toISOString(),
    },
  ];
}

function persistGoals(goals: GoalItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(storageKey(), JSON.stringify(goals));
}

const BLANK_FORM = {
  title: "",
  kind: "Home" as GoalKind,
  targetAmount: "",
  savedAmount: "",
  targetDate: "",
  notes: "",
};

type GoalFormState = typeof BLANK_FORM;
type GoalFormField = keyof GoalFormState;
type ValidatedGoalFormField = Exclude<GoalFormField, "notes">;

const GOAL_VALIDATION_FIELD_ORDER: ValidatedGoalFormField[] = [
  "title",
  "kind",
  "targetAmount",
  "savedAmount",
  "targetDate",
];

function getGoalFieldError(field: ValidatedGoalFormField, form: GoalFormState): string | undefined {
  const parsedTarget = Number(form.targetAmount.trim());
  const parsedSaved = Number(form.savedAmount.trim());

  if (field === "title") {
    return form.title.trim() ? undefined : "Enter a goal title.";
  }

  if (field === "kind") {
    return form.kind.trim() ? undefined : "Choose a category.";
  }

  if (field === "targetAmount") {
    if (!form.targetAmount.trim()) {
      return "Enter a target amount.";
    }

    if (!Number.isFinite(parsedTarget) || parsedTarget <= 0) {
      return "Target amount must be greater than 0.";
    }

    return undefined;
  }

  if (field === "savedAmount") {
    if (!form.savedAmount.trim()) {
      return "Enter how much you have saved so far.";
    }

    if (!Number.isFinite(parsedSaved) || parsedSaved < 0) {
      return "Saved so far must be 0 or more.";
    }

    return undefined;
  }

  if (field === "targetDate") {
    return form.targetDate.trim() ? undefined : "Choose a target date.";
  }

  return undefined;
}

function getFirstInvalidGoalField(form: GoalFormState): ValidatedGoalFormField | null {
  for (const field of GOAL_VALIDATION_FIELD_ORDER) {
    if (getGoalFieldError(field, form)) {
      return field;
    }
  }

  return null;
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<GoalItem[]>([]);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [usesDatabase, setUsesDatabase] = useState(false);
  const [currentPlanSlug, setCurrentPlanSlug] = useState("free");
  const [tab, setTab] = useState<Tab>("active");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(BLANK_FORM);
  const [formError, setFormError] = useState("");
  const [activeValidationField, setActiveValidationField] = useState<ValidatedGoalFormField | null>(null);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const session = getSession();
    const userId = session?.isDemo ? null : session?.userId ?? null;

    setSessionUserId(userId);
    setUsesDatabase(Boolean(userId));

    if (session?.isDemo) {
      setCurrentPlanSlug(DEMO_PLAN_SLUG);
    }

    if (!userId) {
      if (!session?.isDemo) {
        setCurrentPlanSlug("free");
      }
      setGoals(loadGoals());
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    async function loadUserGoals() {
      try {
        setIsLoading(true);
        setError("");
        const [response, profileResponse] = await Promise.all([
          fetch("/api/goals", {
            cache: "no-store",
          }),
          fetch("/api/profile", {
            cache: "no-store",
          }),
        ]);

        if (profileResponse.ok) {
          const profilePayload = await profileResponse.json() as { user?: { planSlug?: string } };
          if (isMounted) {
            setCurrentPlanSlug(profilePayload.user?.planSlug ?? "free");
          }
        }

        if (!response.ok) {
          throw new Error(await readApiError(response, "Failed to load goals."));
        }

        const payload = await response.json();
        if (isMounted) {
          setGoals(payload.goals ?? []);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load goals.");
          setGoals([]);
          setCurrentPlanSlug("free");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadUserGoals();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (usesDatabase) {
      return;
    }

    if (goals.length > 0 || localStorage.getItem(storageKey()) !== null) {
      persistGoals(goals);
    }
  }, [goals, usesDatabase]);

  useEffect(() => {
    if (usesDatabase || typeof window === "undefined") {
      return;
    }

    const session = getSession();
    if (!session?.isDemo || goals.length > 0 || localStorage.getItem(seedKey())) {
      return;
    }

    const seededGoals = getInitialGoals();
    if (seededGoals.length === 0) {
      return;
    }

    setGoals(seededGoals);
    localStorage.setItem(seedKey(), "true");
    localStorage.setItem(storageKey(), JSON.stringify(seededGoals));
  }, [goals.length, usesDatabase]);

  const activeGoals = useMemo(() => goals.filter((g) => !g.completed), [goals]);
  const completedGoals = useMemo(() => goals.filter((g) => g.completed), [goals]);

  const totals = useMemo(() => {
    const target = activeGoals.reduce((sum, goal) => sum + goal.targetAmount, 0);
    const saved = activeGoals.reduce((sum, goal) => sum + goal.savedAmount, 0);
    return { target, saved, remaining: Math.max(0, target - saved) };
  }, [activeGoals]);

  if (isLoading) {
    return <PageLoading message="Loading goals..." />;
  }

  const currentPlan = getSubscriptionPlanBySlug(currentPlanSlug) ?? FREE_PLAN;
  const canUsePrecisionEventPlanning = hasFeatureAccess(currentPlan.slug, "precisionEventPlanning");

  function buildPlanningHref(goal: GoalItem) {
    const params = new URLSearchParams({
      goalId: goal.id,
      goalTitle: goal.title,
      goalKind: goal.kind,
      goalTargetAmount: String(goal.targetAmount),
      goalSavedAmount: String(goal.savedAmount),
      goalTargetDate: goal.targetDate,
      goalNotes: goal.notes,
    });

    return `/events?${params.toString()}`;
  }

  function resetForm() {
    setForm(BLANK_FORM);
    setFormError("");
    setActiveValidationField(null);
    setEditingGoalId(null);
    setShowForm(false);
  }

  function startEditing(goal: GoalItem) {
    setError("");
    setFormError("");
    setActiveValidationField(null);
    setEditingGoalId(goal.id);
    setForm({
      title: goal.title,
      kind: goal.kind,
      targetAmount: String(goal.targetAmount),
      savedAmount: String(goal.savedAmount),
      targetDate: goal.targetDate,
      notes: goal.notes,
    });
    setShowForm(true);
  }

  function updateFormField<Field extends GoalFormField>(field: Field, value: GoalFormState[Field]) {
    setForm((current) => {
      const nextForm = { ...current, [field]: value };

      if (activeValidationField === field) {
        const nextError = getGoalFieldError(field as ValidatedGoalFormField, nextForm);
        if (!nextError) {
          setActiveValidationField(null);
        }
        setFormError("");
      }

      return nextForm;
    });
  }

  function focusValidationField(field: ValidatedGoalFormField) {
    if (typeof document === "undefined") {
      return;
    }

    const root = document.querySelector<HTMLElement>(`[data-goal-field="${field}"]`);
    const target = field === "targetDate"
      ? root?.querySelector<HTMLElement>("button") ?? root
      : root;

    target?.focus();
  }

  function handleFieldBlur(field: ValidatedGoalFormField) {
    const errorMessage = getGoalFieldError(field, form);
    setActiveValidationField(errorMessage ? field : null);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const firstInvalidField = getFirstInvalidGoalField(form);

    if (firstInvalidField) {
      setActiveValidationField(firstInvalidField);
      focusValidationField(firstInvalidField);
      return;
    }

    setActiveValidationField(null);
    setFormError("");

    const parsedTarget = Number(form.targetAmount.trim());
    const parsedSaved = Number(form.savedAmount.trim());

    if (editingGoalId && sessionUserId) {
      try {
        setError("");
        const response = await fetch(`/api/goals/${editingGoalId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: form.title.trim(),
            kind: form.kind,
            targetAmount: parsedTarget,
            savedAmount: Math.max(0, Number.isFinite(parsedSaved) ? parsedSaved : 0),
            targetDate: form.targetDate,
            notes: form.notes.trim(),
          }),
        });

        if (!response.ok) {
          throw new Error(await readApiError(response, "Failed to update goal."));
        }

        const payload = await response.json();
          const activeValidationMessage = activeValidationField
            ? getGoalFieldError(activeValidationField, form)
            : undefined;

          function isFieldInvalid(field: ValidatedGoalFormField) {
            return activeValidationField === field && Boolean(activeValidationMessage);
          }
        setGoals((prev) => prev.map((goal) => (goal.id === editingGoalId ? payload.goal : goal)));
        resetForm();
      } catch (saveError) {
        setError(saveError instanceof Error ? saveError.message : "Failed to update goal.");
      }
      return;
    }

    if (editingGoalId) {
      setGoals((prev) => {
        const updated = prev.map((goal) =>
          goal.id === editingGoalId
            ? {
                ...goal,
                title: form.title.trim(),
                kind: form.kind,
                targetAmount: parsedTarget,
                savedAmount: Math.max(0, Number.isFinite(parsedSaved) ? parsedSaved : 0),
                targetDate: form.targetDate,
                notes: form.notes.trim(),
              }
            : goal
        );
        persistGoals(updated);
        return updated;
      });
      resetForm();
      return;
    }

    if (sessionUserId) {
      try {
        setError("");
        const response = await fetch("/api/goals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: form.title.trim(),
            kind: form.kind,
            targetAmount: parsedTarget,
            savedAmount: Math.max(0, Number.isFinite(parsedSaved) ? parsedSaved : 0),
            targetDate: form.targetDate,
            notes: form.notes.trim(),
          }),
        });

        if (!response.ok) {
          throw new Error(await readApiError(response, "Failed to create goal."));
        }

        const payload = await response.json();
        setGoals((prev) => [payload.goal, ...prev]);
        resetForm();
      } catch (saveError) {
        setError(saveError instanceof Error ? saveError.message : "Failed to create goal.");
      }
      return;
    }

    const newGoal: GoalItem = {
      id: crypto.randomUUID(),
      title: form.title.trim(),
      kind: form.kind,
      targetAmount: parsedTarget,
      savedAmount: Math.max(0, Number.isFinite(parsedSaved) ? parsedSaved : 0),
      targetDate: form.targetDate,
      notes: form.notes.trim(),
      completed: false,
      createdAt: new Date().toISOString(),
    };

    setGoals((prev) => {
      const updated = [newGoal, ...prev];
      persistGoals(updated);
      return updated;
    });
    resetForm();
  }

  async function markComplete(id: string) {
    if (sessionUserId) {
      try {
        setError("");
        const response = await fetch(`/api/goals/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ completed: true }),
        });

        if (!response.ok) {
          throw new Error(await readApiError(response, "Failed to update goal."));
        }

        const payload = await response.json();
        setGoals((prev) => prev.map((goal) => (goal.id === id ? payload.goal : goal)));
      } catch (updateError) {
        setError(updateError instanceof Error ? updateError.message : "Failed to update goal.");
      }
      return;
    }

    setGoals((prev) => {
      const updated = prev.map((g) =>
        g.id === id
          ? { ...g, completed: true, completedAt: new Date().toISOString() }
          : g
      );
      persistGoals(updated);
      return updated;
    });
  }

  async function deleteGoal(id: string) {
    if (sessionUserId) {
      try {
        setError("");
        const response = await fetch(`/api/goals/${id}`, { method: "DELETE" });
        if (!response.ok) {
          throw new Error(await readApiError(response, "Failed to delete goal."));
        }

        setGoals((prev) => prev.filter((goal) => goal.id !== id));
      } catch (deleteError) {
        setError(deleteError instanceof Error ? deleteError.message : "Failed to delete goal.");
      }
      return;
    }

    setGoals((prev) => {
      const updated = prev.filter((g) => g.id !== id);
      persistGoals(updated);
      return updated;
    });
  }

  const displayList = tab === "active" ? activeGoals : completedGoals;

  return (
    <div className={`${styles.container} container`}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Goals</h1>
          <p className={styles.subtitle}>
            Save towards the things that matter — apartments, holidays, rainy-day funds, and more.
          </p>
        </div>
        {!showForm && (
          <button
            className={styles.primaryButton}
            onClick={() => setShowForm(true)}
          >
            + New Goal
          </button>
        )}
      </header>

      {/* KPI strip — active goals only */}
      <section className={styles.kpiGrid}>
        <article className={styles.kpiCard}>
          <p>Active Goals</p>
          <h3>{activeGoals.length}</h3>
        </article>
        <article className={styles.kpiCard}>
          <p>Total Target</p>
          <h3>{formatCurrency(totals.target)}</h3>
        </article>
        <article className={styles.kpiCard}>
          <p>Total Saved</p>
          <h3>{formatCurrency(totals.saved)}</h3>
        </article>
        <article className={styles.kpiCard}>
          <p>Remaining</p>
          <h3>{formatCurrency(totals.remaining)}</h3>
        </article>
      </section>

      {/* Create form */}
      {showForm && (
        <section className={styles.panel}>
          <h2>{editingGoalId ? "Edit Goal" : "New Goal"}</h2>
          {formError && <p className={styles.feedbackError}>{formError}</p>}
          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Title</span>
              <div className={styles.fieldControlWrap}>
                <input
                  data-goal-field="title"
                  className={isFieldInvalid("title") ? styles.fieldInvalid : ""}
                  value={form.title}
                  onChange={(e) => updateFormField("title", e.target.value)}
                  onBlur={() => handleFieldBlur("title")}
                  placeholder="e.g. Buy an apartment"
                  aria-invalid={isFieldInvalid("title")}
                  aria-describedby={isFieldInvalid("title") ? "goal-title-error" : undefined}
                />
                {isFieldInvalid("title") && activeValidationMessage && (
                  <span id="goal-title-error" className={styles.validationBubble} role="alert">
                    {activeValidationMessage}
                  </span>
                )}
              </div>
            </label>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>Category</span>
              <div className={styles.fieldControlWrap}>
                <select
                  data-goal-field="kind"
                  className={isFieldInvalid("kind") ? styles.fieldInvalid : ""}
                  value={form.kind}
                  onChange={(e) => updateFormField("kind", e.target.value as GoalKind)}
                  onBlur={() => handleFieldBlur("kind")}
                  aria-invalid={isFieldInvalid("kind")}
                  aria-describedby={isFieldInvalid("kind") ? "goal-kind-error" : undefined}
                >
                  <option value="Home">Home</option>
                  <option value="Holiday">Holiday</option>
                  <option value="Wedding">Wedding</option>
                  <option value="Education">Education</option>
                  <option value="Vehicle">Vehicle</option>
                  <option value="Emergency Fund">Emergency Fund</option>
                  <option value="Birthday">Birthday</option>
                  <option value="Other">Other</option>
                </select>
                {isFieldInvalid("kind") && activeValidationMessage && (
                  <span id="goal-kind-error" className={styles.validationBubble} role="alert">
                    {activeValidationMessage}
                  </span>
                )}
              </div>
            </label>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>Target Amount</span>
              <div className={styles.fieldControlWrap}>
                <input
                  data-goal-field="targetAmount"
                  className={isFieldInvalid("targetAmount") ? styles.fieldInvalid : ""}
                  type="number"
                  min="1"
                  step="0.01"
                  value={form.targetAmount}
                  onChange={(e) => updateFormField("targetAmount", e.target.value)}
                  onBlur={() => handleFieldBlur("targetAmount")}
                  aria-invalid={isFieldInvalid("targetAmount")}
                  aria-describedby={isFieldInvalid("targetAmount") ? "goal-target-amount-error" : undefined}
                />
                {isFieldInvalid("targetAmount") && activeValidationMessage && (
                  <span id="goal-target-amount-error" className={styles.validationBubble} role="alert">
                    {activeValidationMessage}
                  </span>
                )}
              </div>
            </label>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>Saved So Far</span>
              <div className={styles.fieldControlWrap}>
                <input
                  data-goal-field="savedAmount"
                  className={isFieldInvalid("savedAmount") ? styles.fieldInvalid : ""}
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.savedAmount}
                  onChange={(e) => updateFormField("savedAmount", e.target.value)}
                  onBlur={() => handleFieldBlur("savedAmount")}
                  aria-invalid={isFieldInvalid("savedAmount")}
                  aria-describedby={isFieldInvalid("savedAmount") ? "goal-saved-amount-error" : undefined}
                />
                {isFieldInvalid("savedAmount") && activeValidationMessage && (
                  <span id="goal-saved-amount-error" className={styles.validationBubble} role="alert">
                    {activeValidationMessage}
                  </span>
                )}
              </div>
            </label>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>Target Date</span>
              <div className={styles.fieldControlWrap}>
                <div
                  data-goal-field="targetDate"
                  className={isFieldInvalid("targetDate") ? styles.dateInputShellInvalid : styles.dateInputShell}
                >
                  <DateInput
                    value={form.targetDate}
                    onChange={(value) => updateFormField("targetDate", value)}
                  />
                </div>
                {isFieldInvalid("targetDate") && activeValidationMessage && (
                  <span id="goal-target-date-error" className={styles.validationBubble} role="alert">
                    {activeValidationMessage}
                  </span>
                )}
              </div>
            </label>

            <label className={`${styles.field} ${styles.fullWidth}`}>
              <span className={styles.fieldLabel}>Notes</span>
              <div className={styles.fieldControlWrap}>
                <textarea
                  value={form.notes}
                  onChange={(e) => updateFormField("notes", e.target.value)}
                  placeholder="Optional notes"
                  rows={3}
                />
              </div>
            </label>

            <div className={styles.formActions}>
              <button type="submit" className={styles.primaryButton}>
                {editingGoalId ? "Save Changes" : "Create Goal"}
              </button>
              <button
                type="button"
                className={styles.cancelButton}
                onClick={resetForm}
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Tabs */}
      <section className={styles.panel}>
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${tab === "active" ? styles.tabActive : ""}`}
            onClick={() => setTab("active")}
          >
            Active
            <span className={styles.tabBadge}>{activeGoals.length}</span>
          </button>
          <button
            className={`${styles.tab} ${tab === "completed" ? styles.tabActive : ""}`}
            onClick={() => setTab("completed")}
          >
            Completed
            <span className={styles.tabBadge}>{completedGoals.length}</span>
          </button>
        </div>

        {error && <p className={styles.feedbackError}>{error}</p>}
        {isLoading && <p className={styles.feedbackMuted}>Loading goals...</p>}

        {displayList.length === 0 ? (
          <p className={styles.empty}>
            {tab === "active"
              ? "No active goals yet. Hit \"+ New Goal\" to get started."
              : "No completed goals yet — keep working towards your targets!"}
          </p>
        ) : (
          <div className={styles.goalList}>
            {displayList.map((goal) => {
              const progress =
                goal.targetAmount > 0
                  ? Math.min(100, (goal.savedAmount / goal.targetAmount) * 100)
                  : 0;
              const achieved = progress >= 100;

              return (
                <article
                  key={goal.id}
                  className={`${styles.goalCard} ${goal.completed ? styles.goalCardDone : ""}`}
                >
                  <div className={styles.goalHead}>
                    <div>
                      <h3>
                        {goal.title}
                        {goal.completed && (
                          <span className={styles.achievedBadge}>Achieved</span>
                        )}
                      </h3>
                      <p>
                        {goal.kind} · Target: {goal.targetDate}
                        {goal.completedAt &&
                          ` · Completed: ${new Date(goal.completedAt).toLocaleDateString()}`}
                      </p>
                    </div>
                    <strong className={achieved || goal.completed ? styles.progressDone : ""}>
                      {Math.round(progress)}%
                    </strong>
                  </div>

                  <div className={styles.progressTrack}>
                    <span
                      style={{ width: `${progress}%` }}
                      className={achieved || goal.completed ? styles.progressFull : ""}
                    />
                  </div>

                  <div className={styles.metaRow}>
                    <span>Saved: {formatCurrency(goal.savedAmount)}</span>
                    <span>Target: {formatCurrency(goal.targetAmount)}</span>
                    <span>
                      Left:{" "}
                      {formatCurrency(Math.max(0, goal.targetAmount - goal.savedAmount))}
                    </span>
                  </div>

                  {goal.notes && <p className={styles.notes}>{goal.notes}</p>}

                  <div className={styles.cardActions}>
                    {canUsePrecisionEventPlanning ? (
                      <Link className={styles.planButton} href={buildPlanningHref(goal)}>
                        Plan
                      </Link>
                    ) : null}
                    {!goal.completed && (
                      <button
                        className={styles.completeButton}
                        onClick={() => markComplete(goal.id)}
                      >
                        Mark as Achieved
                      </button>
                    )}
                    <button
                      className={styles.editButton}
                      onClick={() => startEditing(goal)}
                    >
                      Edit
                    </button>
                    <button
                      className={styles.deleteButton}
                      onClick={() => deleteGoal(goal.id)}
                    >
                      Delete
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
