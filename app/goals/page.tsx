"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import DateInput from "../../components/DateInput";
import styles from "./goals.module.css";
import { formatCurrency } from "../../lib/utils";
import { getSession } from "../../lib/auth";

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

export default function GoalsPage() {
  const [goals, setGoals] = useState<GoalItem[]>([]);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [usesDatabase, setUsesDatabase] = useState(false);
  const [tab, setTab] = useState<Tab>("active");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(BLANK_FORM);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const session = getSession();
    const userId = session?.isDemo ? null : session?.userId ?? null;

    setSessionUserId(userId);
    setUsesDatabase(Boolean(userId));

    if (!userId) {
      setGoals(loadGoals());
      setIsLoading(false);
      return;
    }

    const resolvedUserId = userId;

    let isMounted = true;

    async function loadUserGoals() {
      try {
        setIsLoading(true);
        setError("");
        const response = await fetch(`/api/goals?userId=${encodeURIComponent(resolvedUserId)}`, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Failed to load goals.");
        }

        const payload = await response.json();
        if (isMounted) {
          setGoals(payload.goals ?? []);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load goals.");
          setGoals([]);
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

  const activeGoals = useMemo(() => goals.filter((g) => !g.completed), [goals]);
  const completedGoals = useMemo(() => goals.filter((g) => g.completed), [goals]);

  const totals = useMemo(() => {
    const target = activeGoals.reduce((s, g) => s + g.targetAmount, 0);
    const saved = activeGoals.reduce((s, g) => s + g.savedAmount, 0);
    return { target, saved, remaining: Math.max(0, target - saved) };
  }, [activeGoals]);

  function resetForm() {
    setForm(BLANK_FORM);
    setEditingGoalId(null);
    setShowForm(false);
  }

  function startEditing(goal: GoalItem) {
    setError("");
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

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsedTarget = Number(form.targetAmount);
    const parsedSaved = Number(form.savedAmount || "0");
    if (
      !form.title.trim() ||
      !form.targetDate ||
      !Number.isFinite(parsedTarget) ||
      parsedTarget <= 0
    ) {
      return;
    }

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
          throw new Error("Failed to update goal.");
        }

        const payload = await response.json();
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
            userId: sessionUserId,
            title: form.title.trim(),
            kind: form.kind,
            targetAmount: parsedTarget,
            savedAmount: Math.max(0, Number.isFinite(parsedSaved) ? parsedSaved : 0),
            targetDate: form.targetDate,
            notes: form.notes.trim(),
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to create goal.");
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
          throw new Error("Failed to update goal.");
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
          throw new Error("Failed to delete goal.");
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
          <form className={styles.form} onSubmit={handleSubmit}>
            <label>
              Title
              <input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Buy an apartment"
                required
              />
            </label>

            <label>
              Category
              <select
                value={form.kind}
                onChange={(e) =>
                  setForm((f) => ({ ...f, kind: e.target.value as GoalKind }))
                }
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
            </label>

            <label>
              Target Amount
              <input
                type="number"
                min="1"
                step="0.01"
                value={form.targetAmount}
                onChange={(e) =>
                  setForm((f) => ({ ...f, targetAmount: e.target.value }))
                }
                required
              />
            </label>

            <label>
              Saved So Far
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.savedAmount}
                onChange={(e) =>
                  setForm((f) => ({ ...f, savedAmount: e.target.value }))
                }
              />
            </label>

            <label>
              Target Date
              <DateInput
                value={form.targetDate}
                onChange={(value) => setForm((f) => ({ ...f, targetDate: value }))}
                required
              />
            </label>

            <label className={styles.fullWidth}>
              Notes
              <textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Optional notes"
                rows={3}
              />
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
