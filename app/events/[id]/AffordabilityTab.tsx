"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { hasFeatureAccess } from "../../../lib/subscriptions";
import type { EventData } from "./page";
import styles from "./affordability.module.css";

interface Props {
  event: EventData;
  onUpdate: (patch: Partial<EventData>) => Promise<void>;
  planSlug: string;
  formatCurrency: (n: number) => string;
}

function getMonthsUntil(dateStr: string): number | null {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  const now = new Date();
  const months = (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth());
  return months > 0 ? months : null;
}

function getTotalCost(event: EventData): number {
  const subtotal = Object.values(event.costs).reduce((s, v) => s + v, 0);
  const base = subtotal > 0 ? subtotal * (1 + (event.contingencyPercent ?? 10) / 100) : event.budgetTarget;
  return base;
}

function getFeasibilityLabel(required: number, disposable: number | null): { label: string; cls: string } {
  if (disposable === null) {
    if (required <= 200) return { label: "✅ Likely affordable", cls: "green" };
    if (required <= 600) return { label: "⚠️ Tight — review budget", cls: "amber" };
    return { label: "❌ High savings required", cls: "red" };
  }
  const ratio = required / disposable;
  if (ratio <= 0.3) return { label: "✅ Affordable", cls: "green" };
  if (ratio <= 0.6) return { label: "⚠️ Tight", cls: "amber" };
  return { label: "❌ Not feasible at current income", cls: "red" };
}

export default function AffordabilityTab({ event, onUpdate, planSlug, formatCurrency }: Props) {
  const canAdvanced = hasFeatureAccess(planSlug, "affordabilityAdvanced");
  const canChart = hasFeatureAccess(planSlug, "savingsTimeline");

  const [mode, setMode] = useState<"simple" | "advanced">("simple");
  const [monthlyIncome, setMonthlyIncome] = useState(event.monthlyIncome ?? 0);
  const [monthlyCommitments, setMonthlyCommitments] = useState(event.monthlyCommitments ?? 0);

  const total = getTotalCost(event);
  const remaining = Math.max(0, total - event.currentSavings);
  const months = getMonthsUntil(event.eventDate);
  const requiredMonthly = months && remaining > 0 ? Math.ceil(remaining / months) : null;

  const disposable = mode === "advanced" && monthlyIncome > 0
    ? Math.max(0, monthlyIncome - monthlyCommitments)
    : null;

  const feasibility = requiredMonthly !== null
    ? getFeasibilityLabel(requiredMonthly, disposable)
    : null;

  const affordabilityGap = disposable !== null && requiredMonthly !== null
    ? disposable - requiredMonthly
    : null;

  // Recommendations (advanced + Pro)
  const canRecommend = hasFeatureAccess(planSlug, "recommendationEngine");
  const recommendations = useMemo(() => {
    if (!canRecommend || !requiredMonthly || !months) return [];
    const recs: string[] = [];
    const venueCost = event.costs["venue"] ?? 0;
    const cateringCost = event.costs["catering"] ?? 0;
    if (venueCost > 3000) recs.push(`Reducing venue budget by £1,000 saves ~${formatCurrency(Math.ceil(1000 / months))}/month`);
    if (cateringCost > 0 && event.guestCount > 0) {
      const perHead = cateringCost / event.guestCount;
      const saving = perHead * 20;
      recs.push(`Reducing guest count by 20 saves ~${formatCurrency(Math.ceil(saving / months))}/month`);
    }
    if (months < 12) recs.push(`Moving the date 6 months later reduces monthly savings by ~${formatCurrency(Math.ceil(remaining / (months + 6)))}/month`);
    return recs.slice(0, 3);
  }, [canRecommend, requiredMonthly, months, event, remaining, formatCurrency]);

  // Savings curve data (simple projection)
  const curvePoints = useMemo(() => {
    if (!months || !requiredMonthly) return [];
    const points: Array<{ month: number; projected: number; target: number }> = [];
    for (let m = 0; m <= months; m++) {
      points.push({
        month: m,
        projected: Math.min(total, event.currentSavings + requiredMonthly * m),
        target: total,
      });
    }
    return points;
  }, [months, requiredMonthly, total, event.currentSavings]);

  async function saveAdvancedInputs() {
    await onUpdate({ monthlyIncome, monthlyCommitments });
  }

  return (
    <div className={styles.container}>
      {/* Mode toggle */}
      <div className={styles.modeToggle}>
        <button
          className={`${styles.modeBtn} ${mode === "simple" ? styles.modeBtnActive : ""}`}
          onClick={() => setMode("simple")}
        >Simple</button>
        <button
          className={`${styles.modeBtn} ${mode === "advanced" ? styles.modeBtnActive : ""} ${!canAdvanced ? styles.modeBtnLocked : ""}`}
          onClick={() => canAdvanced ? setMode("advanced") : null}
        >
          Advanced {!canAdvanced && "🔒"}
        </button>
      </div>

      {!canAdvanced && mode === "simple" && (
        <p className={styles.upgradeHint}>
          <Link href="/subscriptions">Upgrade to Smart</Link> to unlock advanced mode with income-based affordability analysis.
        </p>
      )}

      {/* Advanced inputs */}
      {mode === "advanced" && canAdvanced && (
        <div className={styles.advancedInputs}>
          <div className={styles.inputGroup}>
            <label className={styles.label}>Monthly income (£)</label>
            <input
              className={styles.input}
              type="number"
              min="0"
              value={monthlyIncome || ""}
              onChange={(e) => setMonthlyIncome(Number(e.target.value))}
              onBlur={saveAdvancedInputs}
              placeholder="e.g. 3500"
            />
          </div>
          <div className={styles.inputGroup}>
            <label className={styles.label}>Monthly commitments (£)</label>
            <input
              className={styles.input}
              type="number"
              min="0"
              value={monthlyCommitments || ""}
              onChange={(e) => setMonthlyCommitments(Number(e.target.value))}
              onBlur={saveAdvancedInputs}
              placeholder="e.g. 1200"
            />
          </div>
          {disposable !== null && (
            <div className={styles.disposableRow}>
              <span>Disposable income</span>
              <span className={styles.disposableValue}>{formatCurrency(disposable)}/month</span>
            </div>
          )}
        </div>
      )}

      {/* No date / no budget warning */}
      {(!event.eventDate || total === 0) && (
        <div className={styles.warningBox}>
          {!event.eventDate && <p>⚠️ Set an event date in the Overview tab to calculate your savings timeline.</p>}
          {total === 0 && <p>⚠️ Add costs in the Budget tab to calculate affordability.</p>}
        </div>
      )}

      {/* Main result */}
      {requiredMonthly !== null && feasibility && (
        <div className={styles.resultCard}>
          <div className={styles.resultMain}>
            <span className={styles.resultAmount}>{formatCurrency(requiredMonthly)}</span>
            <span className={styles.resultLabel}>required per month</span>
          </div>
          <div className={`${styles.feasibilityBadge} ${styles[feasibility.cls]}`}>
            {feasibility.label}
          </div>
          <div className={styles.resultDetails}>
            <div className={styles.resultDetail}>
              <span>Total needed</span><span>{formatCurrency(total)}</span>
            </div>
            <div className={styles.resultDetail}>
              <span>Already saved</span><span>{formatCurrency(event.currentSavings)}</span>
            </div>
            <div className={styles.resultDetail}>
              <span>Still to save</span><span>{formatCurrency(remaining)}</span>
            </div>
            <div className={styles.resultDetail}>
              <span>Months remaining</span><span>{months}</span>
            </div>
            {affordabilityGap !== null && (
              <div className={styles.resultDetail}>
                <span>Monthly surplus after saving</span>
                <span className={affordabilityGap >= 0 ? styles.positive : styles.negative}>
                  {formatCurrency(Math.abs(affordabilityGap))} {affordabilityGap >= 0 ? "left over" : "shortfall"}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Savings curve chart */}
      {canChart && curvePoints.length > 1 && (
        <div className={styles.chartSection}>
          <h3 className={styles.chartTitle}>Savings timeline</h3>
          <div className={styles.chartWrap}>
            <svg viewBox={`0 0 ${curvePoints.length * 20} 120`} className={styles.chart} preserveAspectRatio="none">
              {/* Target line */}
              <line x1="0" y1="10" x2={curvePoints.length * 20} y2="10" stroke="rgba(148,163,184,0.3)" strokeWidth="1" strokeDasharray="4 3" />
              {/* Projected savings path */}
              <polyline
                fill="none"
                stroke="url(#savingsGrad)"
                strokeWidth="2.5"
                strokeLinecap="round"
                points={curvePoints.map((p, i) => `${i * 20},${110 - (p.projected / total) * 100}`).join(" ")}
              />
              <defs>
                <linearGradient id="savingsGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="var(--primary-color)" />
                  <stop offset="100%" stopColor="var(--accent-color)" />
                </linearGradient>
              </defs>
            </svg>
            <div className={styles.chartLabels}>
              <span>Now</span>
              <span>{months} months</span>
            </div>
          </div>
        </div>
      )}

      {!canChart && requiredMonthly !== null && (
        <p className={styles.upgradeHint}>
          <Link href="/subscriptions">Upgrade to Smart</Link> to see your savings timeline chart.
        </p>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className={styles.recommendations}>
          <h3 className={styles.recTitle}>💡 Suggestions</h3>
          <ul className={styles.recList}>
            {recommendations.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
