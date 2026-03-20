"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
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
  // Only show sample goals for demo/admin accounts
  const isDemo = session?.isDemo || session?.email === "galaselfabian@gmail.com";
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
  const [tab, setTab] = useState<Tab>("active");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(BLANK_FORM);

  // Load from localStorage on mount
  useEffect(() => {
    setGoals(loadGoals());
  }, []);

  // Persist whenever goals change
  useEffect(() => {
    if (goals.length > 0 || localStorage.getItem(storageKey()) !== null) {
      persistGoals(goals);
    }
  }, [goals]);

  const activeGoals = useMemo(() => goals.filter((g) => !g.completed), [goals]);
  const completedGoals = useMemo(() => goals.filter((g) => g.completed), [goals]);

  const totals = useMemo(() => {
    const target = activeGoals.reduce((s, g) => s + g.targetAmount, 0);
    const saved = activeGoals.reduce((s, g) => s + g.savedAmount, 0);
    return { target, saved, remaining: Math.max(0, target - saved) };
  }, [activeGoals]);

  function resetForm() {
    setForm(BLANK_FORM);
    setShowForm(false);
  }

  function handleCreate(e: FormEvent<HTMLFormElement>) {
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

  function markComplete(id: string) {
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

  function deleteGoal(id: string) {
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
          <h2>New Goal</h2>
          <form className={styles.form} onSubmit={handleCreate}>
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
              <input
                type="date"
                value={form.targetDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, targetDate: e.target.value }))
                }
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
                Create Goal
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
