"use client";

import { useState } from "react";
import Link from "next/link";
import { hasFeatureAccess } from "../../../lib/subscriptions";
import type { EventData, Scenario } from "./page";
import styles from "./scenarios.module.css";

interface Props {
  event: EventData;
  setEvent: (e: EventData) => void;
  planSlug: string;
  formatCurrency: (n: number) => string;
}

const CLUSTER_KEYS = ["venue","catering","clothing","photography","entertainment","travel","misc"];

function getScenarioTotal(s: Scenario): number {
  const subtotal = CLUSTER_KEYS.reduce((sum, k) => sum + (s.costs[k] ?? 0), 0);
  return subtotal * (1 + (s.contingencyPercent ?? 10) / 100);
}

function getMonthsUntil(dateStr: string): number | null {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  const now = new Date();
  const months = (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth());
  return months > 0 ? months : null;
}

function getFeasibility(monthly: number | null): { label: string; cls: string } {
  if (monthly === null) return { label: "—", cls: "neutral" };
  if (monthly <= 400) return { label: "✅ Affordable", cls: "green" };
  if (monthly <= 800) return { label: "⚠️ Tight", cls: "amber" };
  return { label: "❌ High savings needed", cls: "red" };
}

export default function ScenariosTab({ event, setEvent, planSlug, formatCurrency }: Props) {
  const canScenarios = hasFeatureAccess(planSlug, "scenarios");
  const canCompare = hasFeatureAccess(planSlug, "scenarioComparison");
  const canWhatIf = hasFeatureAccess(planSlug, "whatIfControls");

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // What-if state (per scenario being edited)
  const [whatIfId, setWhatIfId] = useState<string | null>(null);
  const [whatIfGuests, setWhatIfGuests] = useState(0);
  const [whatIfTier, setWhatIfTier] = useState("local");

  const months = getMonthsUntil(event.eventDate);

  if (!canScenarios) {
    return (
      <div className={styles.gate}>
        <span className={styles.gateIcon}>🔒</span>
        <h3>Scenarios require Smart plan</h3>
        <p>Create multiple versions of your event budget and compare affordability side by side.</p>
        <Link href="/subscriptions" className={styles.upgradeBtn}>View plans</Link>
      </div>
    );
  }

  async function createScenario() {
    if (!newName.trim()) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/events/${event.id}/scenarios`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          guestCount: event.guestCount,
          locationTier: event.locationTier,
          costs: event.costs,
          contingencyPercent: event.contingencyPercent,
          budgetTarget: event.budgetTarget,
        }),
      });
      if (!res.ok) { setError("Failed to create scenario."); return; }
      const { scenario } = await res.json();
      setEvent({ ...event, scenarios: [...event.scenarios, scenario] });
      setNewName("");
      setCreating(false);
    } catch { setError("Something went wrong."); }
    finally { setSaving(false); }
  }

  async function deleteScenario(id: string) {
    await fetch(`/api/events/${event.id}/scenarios/${id}`, { method: "DELETE" });
    setEvent({ ...event, scenarios: event.scenarios.filter((s) => s.id !== id) });
  }

  async function applyWhatIf(scenario: Scenario) {
    const updatedCosts = { ...scenario.costs };
    if (whatIfGuests > 0 && scenario.guestCount > 0) {
      const ratio = whatIfGuests / scenario.guestCount;
      if (updatedCosts["catering"]) updatedCosts["catering"] = Math.round(updatedCosts["catering"] * ratio);
      if (updatedCosts["venue"]) updatedCosts["venue"] = Math.round(updatedCosts["venue"] * (1 + (ratio - 1) * 0.4));
    }
    const res = await fetch(`/api/events/${event.id}/scenarios/${scenario.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guestCount: whatIfGuests || scenario.guestCount, locationTier: whatIfTier, costs: updatedCosts }),
    });
    if (res.ok) {
      const { scenario: updated } = await res.json();
      setEvent({ ...event, scenarios: event.scenarios.map((s) => s.id === updated.id ? updated : s) });
    }
    setWhatIfId(null);
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h3 className={styles.title}>Scenarios</h3>
          <p className={styles.subtitle}>Clone your budget into named versions and compare affordability.</p>
        </div>
        <button className={styles.btnCreate} onClick={() => setCreating(true)}>+ Create Scenario</button>
      </div>

      {creating && (
        <div className={styles.createForm}>
          <input
            className={styles.input}
            placeholder="Scenario name (e.g. Budget Wedding)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            autoFocus
          />
          <div className={styles.createActions}>
            <button className={styles.btnSave} onClick={createScenario} disabled={saving}>
              {saving ? "Creating…" : "Create"}
            </button>
            <button className={styles.btnCancel} onClick={() => setCreating(false)}>Cancel</button>
          </div>
          {error && <p className={styles.error}>{error}</p>}
        </div>
      )}

      {event.scenarios.length === 0 && !creating && (
        <div className={styles.empty}>
          <p>No scenarios yet. Create one to start comparing different versions of your event.</p>
        </div>
      )}

      {/* Comparison table — Pro only */}
      {canCompare && event.scenarios.length > 0 && (
        <div className={styles.comparisonWrap}>
          <h4 className={styles.comparisonTitle}>Comparison</h4>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Scenario</th>
                  <th>Total cost</th>
                  <th>Monthly savings</th>
                  <th>Feasibility</th>
                </tr>
              </thead>
              <tbody>
                {event.scenarios.map((s) => {
                  const total = getScenarioTotal(s);
                  const remaining = Math.max(0, total - event.currentSavings);
                  const monthly = months && remaining > 0 ? Math.ceil(remaining / months) : null;
                  const feas = getFeasibility(monthly);
                  return (
                    <tr key={s.id}>
                      <td className={styles.scenarioName}>{s.name}</td>
                      <td>{formatCurrency(total)}</td>
                      <td>{monthly !== null ? `${formatCurrency(monthly)}/mo` : "—"}</td>
                      <td><span className={`${styles.badge} ${styles[feas.cls]}`}>{feas.label}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!canCompare && event.scenarios.length > 0 && (
        <p className={styles.upgradeHint}>
          <Link href="/subscriptions">Upgrade to Pro</Link> to see the side-by-side comparison table.
        </p>
      )}

      {/* Scenario cards */}
      <div className={styles.cards}>
        {event.scenarios.map((s) => {
          const total = getScenarioTotal(s);
          const remaining = Math.max(0, total - event.currentSavings);
          const monthly = months && remaining > 0 ? Math.ceil(remaining / months) : null;
          const feas = getFeasibility(monthly);
          const isWhatIf = whatIfId === s.id;

          return (
            <div key={s.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <span className={styles.cardName}>{s.name}</span>
                <button className={styles.deleteBtn} onClick={() => deleteScenario(s.id)}>×</button>
              </div>

              <div className={styles.cardStats}>
                <div className={styles.cardStat}>
                  <span className={styles.statLabel}>Total</span>
                  <span className={styles.statValue}>{formatCurrency(total)}</span>
                </div>
                <div className={styles.cardStat}>
                  <span className={styles.statLabel}>Save/month</span>
                  <span className={styles.statValue}>{monthly !== null ? formatCurrency(monthly) : "—"}</span>
                </div>
                {s.guestCount > 0 && (
                  <div className={styles.cardStat}>
                    <span className={styles.statLabel}>Guests</span>
                    <span className={styles.statValue}>{s.guestCount}</span>
                  </div>
                )}
              </div>

              <span className={`${styles.badge} ${styles[feas.cls]}`}>{feas.label}</span>

              {/* What-if controls */}
              {canWhatIf && (
                <div className={styles.whatIf}>
                  {!isWhatIf ? (
                    <button className={styles.whatIfBtn} onClick={() => { setWhatIfId(s.id); setWhatIfGuests(s.guestCount); setWhatIfTier(s.locationTier); }}>
                      ⚡ What-if
                    </button>
                  ) : (
                    <div className={styles.whatIfControls}>
                      <div className={styles.whatIfRow}>
                        <label>Guests</label>
                        <input type="number" min="0" className={styles.whatIfInput} value={whatIfGuests} onChange={(e) => setWhatIfGuests(Number(e.target.value))} />
                      </div>
                      <div className={styles.whatIfRow}>
                        <label>Tier</label>
                        <select className={styles.whatIfInput} value={whatIfTier} onChange={(e) => setWhatIfTier(e.target.value)}>
                          <option value="budget">Budget</option>
                          <option value="local">Local</option>
                          <option value="destination">Destination</option>
                          <option value="luxury">Luxury</option>
                        </select>
                      </div>
                      <div className={styles.whatIfActions}>
                        <button className={styles.btnSave} onClick={() => applyWhatIf(s)}>Apply</button>
                        <button className={styles.btnCancel} onClick={() => setWhatIfId(null)}>Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!canWhatIf && (
                <p className={styles.upgradeHint} style={{ marginTop: "0.5rem" }}>
                  <Link href="/subscriptions">Pro</Link> unlocks what-if controls.
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
