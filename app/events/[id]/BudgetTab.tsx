"use client";

import { useState } from "react";
import type { EventData } from "./page";
import styles from "./budget.module.css";

interface Props {
  event: EventData;
  onUpdate: (patch: Partial<EventData>) => Promise<void>;
  formatCurrency: (n: number) => string;
}

type ClusterKey = "venue" | "catering" | "clothing" | "photography" | "entertainment" | "travel" | "misc";

const CLUSTERS: Array<{ key: ClusterKey; label: string; icon: string; description: string }> = [
  { key: "venue", label: "Venue", icon: "🏛️", description: "Hire, setup, decoration" },
  { key: "catering", label: "Catering", icon: "🍽️", description: "Food, drinks, cake" },
  { key: "clothing", label: "Clothing", icon: "👗", description: "Dress, suit, accessories" },
  { key: "photography", label: "Photography", icon: "📸", description: "Photos & video" },
  { key: "entertainment", label: "Entertainment", icon: "🎵", description: "Music, DJ, activities" },
  { key: "travel", label: "Travel", icon: "✈️", description: "Transport, honeymoon" },
  { key: "misc", label: "Misc & Buffer", icon: "📦", description: "Flowers, stationery, other" },
];

export default function BudgetTab({ event, onUpdate, formatCurrency }: Props) {
  const [localCosts, setLocalCosts] = useState<Record<string, number>>({ ...event.costs });
  const [contingency, setContingency] = useState(event.contingencyPercent ?? 10);
  const [budgetTarget, setBudgetTarget] = useState(event.budgetTarget ?? 0);

  const subtotal = CLUSTERS.reduce((s, c) => s + (localCosts[c.key] ?? 0), 0);
  const contingencyAmount = subtotal * (contingency / 100);
  const grandTotal = subtotal + contingencyAmount;
  const gap = budgetTarget > 0 ? grandTotal - budgetTarget : null;

  function handleCostChange(key: string, value: string) {
    const num = value === "" ? 0 : Number(value);
    setLocalCosts((prev) => ({ ...prev, [key]: num }));
  }

  async function handleCostBlur(key: string) {
    await onUpdate({ costs: localCosts });
  }

  async function handleContingencyBlur() {
    await onUpdate({ contingencyPercent: contingency, costs: localCosts });
  }

  async function handleBudgetTargetBlur() {
    await onUpdate({ budgetTarget });
  }

  const costPerGuest = event.guestCount > 0 ? grandTotal / event.guestCount : null;

  return (
    <div className={styles.container}>
      {/* Cost clusters */}
      <div className={styles.clusters}>
        {CLUSTERS.map(({ key, label, icon, description }) => (
          <div key={key} className={styles.cluster}>
            <div className={styles.clusterLeft}>
              <span className={styles.clusterIcon}>{icon}</span>
              <div>
                <span className={styles.clusterLabel}>{label}</span>
                <span className={styles.clusterDesc}>{description}</span>
              </div>
            </div>
            <div className={styles.clusterRight}>
              <span className={styles.currencySymbol}>£</span>
              <input
                className={styles.costInput}
                type="number"
                min="0"
                value={localCosts[key] ?? ""}
                onChange={(e) => handleCostChange(key, e.target.value)}
                onBlur={() => handleCostBlur(key)}
                placeholder="0"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Totals panel */}
      <div className={styles.totalsPanel}>
        <div className={styles.totalRow}>
          <span>Subtotal</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>

        <div className={styles.totalRow}>
          <div className={styles.contingencyLabel}>
            <span>Contingency</span>
            <div className={styles.contingencyControl}>
              <input
                className={styles.pctInput}
                type="number"
                min="0"
                max="50"
                value={contingency}
                onChange={(e) => setContingency(Number(e.target.value))}
                onBlur={handleContingencyBlur}
              />
              <span>%</span>
            </div>
          </div>
          <span>{formatCurrency(contingencyAmount)}</span>
        </div>

        <div className={`${styles.totalRow} ${styles.grandTotal}`}>
          <span>Grand total</span>
          <span>{formatCurrency(grandTotal)}</span>
        </div>

        {costPerGuest !== null && (
          <div className={styles.totalRow}>
            <span>Cost per guest</span>
            <span>{formatCurrency(costPerGuest)}</span>
          </div>
        )}

        <div className={styles.divider} />

        <div className={styles.totalRow}>
          <span>Budget target</span>
          <div className={styles.targetInput}>
            <span className={styles.currencySymbol}>£</span>
            <input
              className={styles.costInput}
              type="number"
              min="0"
              value={budgetTarget || ""}
              onChange={(e) => setBudgetTarget(Number(e.target.value))}
              onBlur={handleBudgetTargetBlur}
              placeholder="Set target"
            />
          </div>
        </div>

        {gap !== null && (
          <div className={`${styles.gapBadge} ${gap > 0 ? styles.gapOver : styles.gapUnder}`}>
            {gap > 0
              ? `⚠️ ${formatCurrency(gap)} over budget`
              : `✅ ${formatCurrency(Math.abs(gap))} under budget`}
          </div>
        )}
      </div>
    </div>
  );
}
