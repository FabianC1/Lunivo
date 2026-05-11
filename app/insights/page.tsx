"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PageLoading from "../../components/PageLoading";
import { formatCurrency } from "../../lib/utils";
import styles from "./insights.module.css";

// ─── Types (mirrors existing event shape) ────────────────────────────────────

type EventType =
  | "Wedding" | "Holiday" | "Home" | "Education"
  | "Vehicle" | "Emergency Fund" | "Birthday" | "Other";

interface Milestone {
  id: string;
  label: string;
  amount: number;
  dueDate: string;
  paid: boolean;
}

interface Scenario {
  id: string;
  name: string;
  guestCount?: number;
  costs: Record<string, number>;
  notes?: string;
}

interface EventItem {
  id: string;
  name: string;
  type: EventType;
  eventDate: string;
  budgetTarget: number;
  currentSavings: number;
  monthlyIncome: number;
  monthlyCommitments: number;
  costs: Record<string, number>;
  contingencyPercent: number;
  milestones: Milestone[];
  scenarios: Scenario[];
}

const EVENT_ICONS: Record<EventType, string> = {
  Wedding: "💍", Holiday: "✈️", Home: "🏠", Education: "🎓",
  Vehicle: "🚗", "Emergency Fund": "🛡️", Birthday: "🎂", Other: "⭐",
};

// ─── Pure calculation helpers ─────────────────────────────────────────────────

function totalCost(e: EventItem): number {
  const sub = Object.values(e.costs).reduce((s, v) => s + v, 0);
  return sub > 0 ? sub * (1 + (e.contingencyPercent ?? 10) / 100) : e.budgetTarget;
}

function monthsUntil(dateStr: string): number | null {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  const now = new Date();
  const m =
    (target.getFullYear() - now.getFullYear()) * 12 +
    (target.getMonth() - now.getMonth());
  return m > 0 ? m : null;
}

function requiredMonthly(e: EventItem): number | null {
  const remaining = Math.max(0, totalCost(e) - e.currentSavings);
  const months = monthsUntil(e.eventDate);
  if (!months || remaining === 0) return null;
  return Math.ceil(remaining / months);
}

function savingsProgress(e: EventItem): number {
  const cost = totalCost(e);
  if (cost === 0) return 100;
  return Math.min(100, Math.round((e.currentSavings / cost) * 100));
}

// ─── Aggregation ──────────────────────────────────────────────────────────────

interface Snapshot {
  totalBudget: number;
  totalSaved: number;
  totalGap: number;
  totalMonthlyPressure: number;
  eventCount: number;
}

function buildSnapshot(events: EventItem[]): Snapshot {
  let totalBudget = 0;
  let totalSaved = 0;
  let totalMonthlyPressure = 0;

  for (const e of events) {
    totalBudget += totalCost(e);
    totalSaved += e.currentSavings;
    const m = requiredMonthly(e);
    if (m) totalMonthlyPressure += m;
  }

  return {
    totalBudget,
    totalSaved,
    totalGap: Math.max(0, totalBudget - totalSaved),
    totalMonthlyPressure,
    eventCount: events.length,
  };
}

// ─── Timeline helpers ─────────────────────────────────────────────────────────

interface TimelineMonth {
  label: string;       // "Jan 26"
  yearMonth: string;   // "2026-01"
  events: EventItem[];
  pressure: number;    // sum of requiredMonthly for events active this month
}

function buildTimeline(events: EventItem[]): TimelineMonth[] {
  const now = new Date();
  const months: TimelineMonth[] = [];

  // Show next 24 months
  for (let i = 0; i < 24; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });

    const activeEvents = events.filter((e) => {
      if (!e.eventDate) return false;
      const eventYM = e.eventDate.slice(0, 7);
      const startYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      return yearMonth >= startYM && yearMonth <= eventYM;
    });

    const pressure = activeEvents.reduce((s, e) => {
      const m = requiredMonthly(e);
      return s + (m ?? 0);
    }, 0);

    months.push({ label, yearMonth, events: activeEvents, pressure });
  }

  return months.filter((m) => m.events.length > 0 || m.pressure > 0);
}

// ─── Risk indicators ──────────────────────────────────────────────────────────

interface RiskItem {
  level: "danger" | "warning" | "ok";
  message: string;
}

function buildRisks(events: EventItem[], snapshot: Snapshot): RiskItem[] {
  const risks: RiskItem[] = [];

  // Overall monthly pressure vs income
  const income = events.find((e) => e.monthlyIncome > 0)?.monthlyIncome ?? 0;
  const commitments = events.find((e) => e.monthlyCommitments > 0)?.monthlyCommitments ?? 0;
  const disposable = income > 0 ? income - commitments : null;

  if (disposable !== null && snapshot.totalMonthlyPressure > disposable * 0.9) {
    risks.push({
      level: "danger",
      message: `Combined savings pressure (${formatCurrency(snapshot.totalMonthlyPressure)}/mo) exceeds 90% of your disposable income.`,
    });
  } else if (disposable !== null && snapshot.totalMonthlyPressure > disposable * 0.6) {
    risks.push({
      level: "warning",
      message: `You're committing ${formatCurrency(snapshot.totalMonthlyPressure)}/mo across all events — over 60% of disposable income.`,
    });
  }

  // Per-event risks
  for (const e of events) {
    const months = monthsUntil(e.eventDate);
    const progress = savingsProgress(e);
    const monthly = requiredMonthly(e);

    if (!months) continue;

    if (progress < 10 && months < 6) {
      risks.push({
        level: "danger",
        message: `${e.name}: only ${progress}% saved with ${months} month${months === 1 ? "" : "s"} to go.`,
      });
    } else if (monthly && disposable && monthly > disposable * 0.5) {
      risks.push({
        level: "warning",
        message: `${e.name} alone requires ${formatCurrency(monthly)}/mo — over half your disposable income.`,
      });
    } else if (progress < 25 && months < 12) {
      risks.push({
        level: "warning",
        message: `${e.name} is under-funded: ${progress}% saved with under a year remaining.`,
      });
    }
  }

  // Overlapping events
  const timeline = buildTimeline(events);
  const peakMonth = timeline.reduce(
    (best, m) => (m.events.length > best.events.length ? m : best),
    timeline[0] ?? { events: [], pressure: 0, label: "", yearMonth: "" }
  );
  if (peakMonth.events.length >= 2) {
    risks.push({
      level: "warning",
      message: `${peakMonth.events.length} events overlap in ${peakMonth.label} — peak financial pressure period.`,
    });
  }

  // Cap at 4
  return risks.slice(0, 4);
}

// ─── Scenario projections ─────────────────────────────────────────────────────

interface ProjectionCard {
  label: string;
  description: string;
  totalGap: number;
  monthlyRequired: number;
  feasible: "green" | "amber" | "red";
  icon: string;
}

function buildProjections(events: EventItem[], snapshot: Snapshot): ProjectionCard[] {
  // Best case: reduce each event cost by 15%
  const bestGap = events.reduce((s, e) => {
    const cost = totalCost(e) * 0.85;
    return s + Math.max(0, cost - e.currentSavings);
  }, 0);
  const bestMonthly = events.reduce((s, e) => {
    const cost = totalCost(e) * 0.85;
    const remaining = Math.max(0, cost - e.currentSavings);
    const months = monthsUntil(e.eventDate);
    return s + (months ? Math.ceil(remaining / months) : 0);
  }, 0);

  // Current trajectory
  const currentMonthly = snapshot.totalMonthlyPressure;

  // Worst case: add 20% to each event cost
  const worstGap = events.reduce((s, e) => {
    const cost = totalCost(e) * 1.2;
    return s + Math.max(0, cost - e.currentSavings);
  }, 0);
  const worstMonthly = events.reduce((s, e) => {
    const cost = totalCost(e) * 1.2;
    const remaining = Math.max(0, cost - e.currentSavings);
    const months = monthsUntil(e.eventDate);
    return s + (months ? Math.ceil(remaining / months) : 0);
  }, 0);

  const income = events.find((e) => e.monthlyIncome > 0)?.monthlyIncome ?? 0;
  const commitments = events.find((e) => e.monthlyCommitments > 0)?.monthlyCommitments ?? 0;
  const disposable = income > 0 ? income - commitments : null;

  function feasibility(monthly: number): "green" | "amber" | "red" {
    if (!disposable) return "amber";
    if (monthly <= disposable * 0.5) return "green";
    if (monthly <= disposable * 0.85) return "amber";
    return "red";
  }

  return [
    {
      label: "Best Case",
      description: "Optimised budgets, 15% cost reduction across all events",
      totalGap: bestGap,
      monthlyRequired: bestMonthly,
      feasible: feasibility(bestMonthly),
      icon: "✅",
    },
    {
      label: "Current Trajectory",
      description: "Based on your current savings and event budgets",
      totalGap: snapshot.totalGap,
      monthlyRequired: currentMonthly,
      feasible: feasibility(currentMonthly),
      icon: "📊",
    },
    {
      label: "Worst Case",
      description: "20% cost overrun across all events, no budget adjustments",
      totalGap: worstGap,
      monthlyRequired: worstMonthly,
      feasible: feasibility(worstMonthly),
      icon: "⚠️",
    },
  ];
}

// ─── Recommendations ──────────────────────────────────────────────────────────

interface Recommendation {
  icon: string;
  text: string;
  impact: "high" | "medium" | "low";
}

function buildRecommendations(events: EventItem[], snapshot: Snapshot): Recommendation[] {
  const recs: Recommendation[] = [];
  const income = events.find((e) => e.monthlyIncome > 0)?.monthlyIncome ?? 0;
  const commitments = events.find((e) => e.monthlyCommitments > 0)?.monthlyCommitments ?? 0;
  const disposable = income > 0 ? income - commitments : null;

  // Savings gap recommendation
  if (snapshot.totalGap > 0 && disposable) {
    const shortfall = snapshot.totalMonthlyPressure - disposable * 0.6;
    if (shortfall > 0) {
      recs.push({
        icon: "💰",
        text: `Increase monthly savings by ${formatCurrency(Math.ceil(shortfall / 100) * 100)} to stay comfortably on track across all events.`,
        impact: "high",
      });
    }
  }

  // Find the most underfunded event
  const underfunded = [...events]
    .filter((e) => monthsUntil(e.eventDate) !== null)
    .sort((a, b) => savingsProgress(a) - savingsProgress(b))[0];

  if (underfunded && savingsProgress(underfunded) < 30) {
    const needed = Math.max(0, totalCost(underfunded) - underfunded.currentSavings);
    recs.push({
      icon: "🎯",
      text: `Prioritise ${underfunded.name} — only ${savingsProgress(underfunded)}% funded. You still need ${formatCurrency(needed)}.`,
      impact: "high",
    });
  }

  // Find events with overlapping pressure
  const timeline = buildTimeline(events);
  const overlap = timeline.find((m) => m.events.length >= 2);
  if (overlap) {
    const names = overlap.events.map((e) => e.name).join(" and ");
    recs.push({
      icon: "📅",
      text: `${names} overlap in ${overlap.label}. Consider shifting one event by 2–3 months to spread financial pressure.`,
      impact: "medium",
    });
  }

  // Budget reduction suggestion for most expensive event
  const mostExpensive = [...events].sort((a, b) => totalCost(b) - totalCost(a))[0];
  if (mostExpensive && totalCost(mostExpensive) > snapshot.totalBudget * 0.5) {
    const saving = Math.round(totalCost(mostExpensive) * 0.15);
    recs.push({
      icon: "✂️",
      text: `Reducing ${mostExpensive.name}'s budget by 15% would save ${formatCurrency(saving)} and significantly ease overall pressure.`,
      impact: "medium",
    });
  }

  // Positive reinforcement if on track
  const onTrack = events.filter((e) => savingsProgress(e) >= 50).length;
  if (onTrack > 0 && recs.length < 3) {
    recs.push({
      icon: "🌟",
      text: `${onTrack} of your ${events.length} events ${onTrack === 1 ? "is" : "are"} over 50% funded — keep up the momentum.`,
      impact: "low",
    });
  }

  return recs.slice(0, 5);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function InsightsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/events", { cache: "no-store" });
        if (res.ok) {
          const { events: data } = await res.json();
          setEvents(data ?? []);
        }
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  if (isLoading) return <PageLoading message="Loading insights..." />;

  if (events.length === 0) {
    return (
      <div className={styles.page}>
        <div className={styles.empty}>
          <div className={styles.emptyIllustration}>📊</div>
          <h2>No events yet</h2>
          <p>Create at least one event to see your financial insights and affordability overview.</p>
          <Link href="/events/new" className={styles.emptyBtn}>Create your first event</Link>
        </div>
      </div>
    );
  }

  const snapshot = buildSnapshot(events);
  const timeline = buildTimeline(events);
  const risks = buildRisks(events, snapshot);
  const projections = buildProjections(events, snapshot);
  const recommendations = buildRecommendations(events, snapshot);

  const maxPressure = Math.max(...timeline.map((m) => m.pressure), 1);
  const overallProgress = snapshot.totalBudget > 0
    ? Math.min(100, Math.round((snapshot.totalSaved / snapshot.totalBudget) * 100))
    : 0;

  return (
    <div className={styles.page}>

      {/* ── Header ── */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Financial Insights</h1>
          <p className={styles.subtitle}>
            Aggregated view across {snapshot.eventCount} event{snapshot.eventCount !== 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/events" className={styles.headerLink}>View all events →</Link>
      </div>

      {/* ── 1. Affordability Snapshot ── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Affordability Snapshot</h2>
        <div className={styles.kpiGrid}>
          <div className={styles.kpiCard}>
            <span className={styles.kpiLabel}>Total budget required</span>
            <span className={styles.kpiValue}>{formatCurrency(snapshot.totalBudget)}</span>
            <span className={styles.kpiSub}>across all events</span>
          </div>
          <div className={`${styles.kpiCard} ${styles.kpiPositive}`}>
            <span className={styles.kpiLabel}>Total saved so far</span>
            <span className={`${styles.kpiValue} ${styles.kpiValuePositive}`}>{formatCurrency(snapshot.totalSaved)}</span>
            <span className={styles.kpiSub}>{overallProgress}% of total goal</span>
          </div>
          <div className={`${styles.kpiCard} ${snapshot.totalGap > 0 ? styles.kpiWarning : styles.kpiPositive}`}>
            <span className={styles.kpiLabel}>Remaining gap</span>
            <span className={`${styles.kpiValue} ${snapshot.totalGap > 0 ? styles.kpiValueWarning : styles.kpiValuePositive}`}>
              {formatCurrency(snapshot.totalGap)}
            </span>
            <span className={styles.kpiSub}>still to save</span>
          </div>
          <div className={`${styles.kpiCard} ${snapshot.totalMonthlyPressure > 1500 ? styles.kpiDanger : styles.kpiWarning}`}>
            <span className={styles.kpiLabel}>Monthly savings pressure</span>
            <span className={`${styles.kpiValue} ${snapshot.totalMonthlyPressure > 1500 ? styles.kpiValueDanger : styles.kpiValueWarning}`}>
              {formatCurrency(snapshot.totalMonthlyPressure)}<span className={styles.kpiPer}>/mo</span>
            </span>
            <span className={styles.kpiSub}>combined across all events</span>
          </div>
        </div>

        {/* Overall progress bar */}
        <div className={styles.overallProgress}>
          <div className={styles.overallProgressHeader}>
            <span className={styles.overallProgressLabel}>Overall savings progress</span>
            <span className={styles.overallProgressPct}>{overallProgress}%</span>
          </div>
          <div className={styles.progressTrack}>
            <div className={styles.progressFill} style={{ width: `${overallProgress}%` }} />
          </div>
          <div className={styles.eventProgressList}>
            {events.map((e) => {
              const pct = savingsProgress(e);
              const months = monthsUntil(e.eventDate);
              return (
                <Link key={e.id} href={`/events/${e.id}`} className={styles.eventProgressRow}>
                  <span className={styles.eventProgressIcon}>{EVENT_ICONS[e.type]}</span>
                  <span className={styles.eventProgressName}>{e.name}</span>
                  <div className={styles.eventProgressBarWrap}>
                    <div className={styles.eventProgressTrack}>
                      <div
                        className={`${styles.eventProgressFill} ${pct >= 50 ? styles.fillGreen : pct >= 25 ? styles.fillAmber : styles.fillRed}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  <span className={styles.eventProgressPct}>{pct}%</span>
                  {months && <span className={styles.eventProgressMonths}>{months}mo</span>}
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 2. Timeline Pressure View ── */}
      {timeline.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Timeline Pressure</h2>
          <p className={styles.sectionSubtitle}>Monthly savings required across all active events over the next 24 months</p>
          <div className={styles.timeline}>
            {timeline.map((month) => {
              const heightPct = Math.round((month.pressure / maxPressure) * 100);
              const isPeak = month.events.length >= 2;
              return (
                <div key={month.yearMonth} className={`${styles.timelineCol} ${isPeak ? styles.timelinePeak : ""}`}>
                  <div className={styles.timelineBarWrap}>
                    <div
                      className={`${styles.timelineBar} ${isPeak ? styles.timelineBarPeak : ""}`}
                      style={{ height: `${Math.max(heightPct, 4)}%` }}
                      title={`${month.label}: ${formatCurrency(month.pressure)}/mo`}
                    />
                  </div>
                  <span className={styles.timelineLabel}>{month.label}</span>
                  {isPeak && <span className={styles.timelinePeakDot} title="Multiple events overlap" />}
                </div>
              );
            })}
          </div>
          <div className={styles.timelineLegend}>
            <span className={styles.legendDot} style={{ background: "var(--primary-color)" }} />
            <span>Monthly savings required</span>
            <span className={styles.legendDotPeak} />
            <span>Peak pressure (overlapping events)</span>
          </div>
        </section>
      )}

      {/* ── 3. Risk Indicators ── */}
      {risks.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Risk Indicators</h2>
          <div className={styles.riskList}>
            {risks.map((r, i) => (
              <div key={i} className={`${styles.riskItem} ${styles[`risk_${r.level}`]}`}>
                <span className={styles.riskIcon}>
                  {r.level === "danger" ? "🔴" : r.level === "warning" ? "🟡" : "🟢"}
                </span>
                <span className={styles.riskText}>{r.message}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── 4. Scenario Summary ── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Scenario Summary</h2>
        <p className={styles.sectionSubtitle}>Projected outcomes across all events under different conditions</p>
        <div className={styles.projectionGrid}>
          {projections.map((p) => (
            <div key={p.label} className={`${styles.projectionCard} ${styles[`proj_${p.feasible}`]}`}>
              <div className={styles.projectionHeader}>
                <span className={styles.projectionIcon}>{p.icon}</span>
                <span className={styles.projectionLabel}>{p.label}</span>
                <span className={`${styles.projectionBadge} ${styles[`badge_${p.feasible}`]}`}>
                  {p.feasible === "green" ? "Achievable" : p.feasible === "amber" ? "Tight" : "At risk"}
                </span>
              </div>
              <p className={styles.projectionDesc}>{p.description}</p>
              <div className={styles.projectionStats}>
                <div className={styles.projectionStat}>
                  <span className={styles.projectionStatLabel}>Total gap</span>
                  <span className={styles.projectionStatValue}>{formatCurrency(p.totalGap)}</span>
                </div>
                <div className={styles.projectionStat}>
                  <span className={styles.projectionStatLabel}>Monthly required</span>
                  <span className={styles.projectionStatValue}>{formatCurrency(p.monthlyRequired)}<span className={styles.kpiPer}>/mo</span></span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 5. Recommendations ── */}
      {recommendations.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Recommendations</h2>
          <div className={styles.recList}>
            {recommendations.map((r, i) => (
              <div key={i} className={styles.recItem}>
                <span className={styles.recIcon}>{r.icon}</span>
                <div className={styles.recBody}>
                  <p className={styles.recText}>{r.text}</p>
                  <span className={`${styles.recImpact} ${styles[`impact_${r.impact}`]}`}>
                    {r.impact === "high" ? "High impact" : r.impact === "medium" ? "Medium impact" : "Good to know"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

    </div>
  );
}
