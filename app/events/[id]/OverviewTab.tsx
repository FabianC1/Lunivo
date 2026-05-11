"use client";

import { useState } from "react";
import DateInput from "../../../components/DateInput";
import type { EventData, Milestone } from "./page";
import styles from "./overview.module.css";

interface Props {
  event: EventData;
  onUpdate: (patch: Partial<EventData>) => Promise<void>;
  formatCurrency: (n: number) => string;
  formatDate: (d: string | Date) => string;
}

function getCountdown(dateStr: string): { months: number; days: number } | null {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  const now = new Date();
  if (target <= now) return null;
  const totalDays = Math.ceil((target.getTime() - now.getTime()) / 86400000);
  const months = Math.floor(totalDays / 30);
  const days = totalDays % 30;
  return { months, days };
}

function getTotalCost(event: EventData): number {
  const subtotal = Object.values(event.costs).reduce((s, v) => s + v, 0);
  return subtotal * (1 + (event.contingencyPercent ?? 10) / 100);
}

export default function OverviewTab({ event, onUpdate, formatCurrency, formatDate }: Props) {
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState(event.notes ?? "");
  const [newMilestone, setNewMilestone] = useState({ label: "", date: "", amount: "" });
  const [addingMilestone, setAddingMilestone] = useState(false);

  const countdown = getCountdown(event.eventDate);
  const total = getTotalCost(event);
  const remaining = Math.max(0, total - event.currentSavings);
  const funded = total > 0 ? Math.min(100, Math.round((event.currentSavings / total) * 100)) : 0;

  async function saveMilestone() {
    if (!newMilestone.label.trim()) return;
    const milestone: Milestone = {
      id: crypto.randomUUID(),
      label: newMilestone.label.trim(),
      date: newMilestone.date,
      amount: newMilestone.amount ? Number(newMilestone.amount) : 0,
      paid: false,
    };
    await onUpdate({ milestones: [...event.milestones, milestone] });
    setNewMilestone({ label: "", date: "", amount: "" });
    setAddingMilestone(false);
  }

  async function toggleMilestone(id: string) {
    const updated = event.milestones.map((m) =>
      m.id === id ? { ...m, paid: !m.paid } : m
    );
    await onUpdate({ milestones: updated });
  }

  async function deleteMilestone(id: string) {
    await onUpdate({ milestones: event.milestones.filter((m) => m.id !== id) });
  }

  return (
    <div className={styles.container}>
      {/* Countdown */}
      {countdown && (
        <div className={styles.countdown}>
          <span className={styles.countdownNum}>{countdown.months}</span>
          <span className={styles.countdownUnit}>months</span>
          <span className={styles.countdownSep}>&</span>
          <span className={styles.countdownNum}>{countdown.days}</span>
          <span className={styles.countdownUnit}>days</span>
          <span className={styles.countdownLabel}>until {event.name}</span>
        </div>
      )}

      {/* Key stats */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Total budget</span>
          <span className={styles.statValue}>{total > 0 ? formatCurrency(total) : "—"}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Already saved</span>
          <span className={styles.statValue}>{formatCurrency(event.currentSavings)}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Still needed</span>
          <span className={`${styles.statValue} ${remaining > 0 ? styles.statNegative : styles.statPositive}`}>
            {formatCurrency(remaining)}
          </span>
        </div>
        {event.guestCount > 0 && (
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Guests</span>
            <span className={styles.statValue}>{event.guestCount}</span>
          </div>
        )}
      </div>

      {/* Funding progress */}
      {total > 0 && (
        <div className={styles.progressSection}>
          <div className={styles.progressHeader}>
            <span className={styles.progressTitle}>Funding progress</span>
            <span className={styles.progressPct}>{funded}%</span>
          </div>
          <div className={styles.progressTrack}>
            <div className={styles.progressFill} style={{ width: `${funded}%` }} />
          </div>
        </div>
      )}

      {/* Quick edit: savings */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Update savings</h3>
        <div className={styles.savingsRow}>
          <input
            className={styles.input}
            type="number"
            min="0"
            defaultValue={event.currentSavings}
            onBlur={(e) => {
              const val = Number(e.target.value);
              if (val !== event.currentSavings) onUpdate({ currentSavings: val });
            }}
            placeholder="Amount saved so far (£)"
          />
        </div>
      </div>

      {/* Milestones */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>Milestones</h3>
          <button className={styles.btnAdd} onClick={() => setAddingMilestone(true)}>+ Add</button>
        </div>

        {event.milestones.length === 0 && !addingMilestone && (
          <p className={styles.empty}>No milestones yet. Add deposit deadlines or payment dates.</p>
        )}

        <div className={styles.milestoneList}>
          {event.milestones.map((m) => (
            <div key={m.id} className={`${styles.milestone} ${m.paid ? styles.milestonePaid : ""}`}>
              <button
                className={`${styles.milestoneCheck} ${m.paid ? styles.milestoneCheckDone : ""}`}
                onClick={() => toggleMilestone(m.id)}
                aria-label={m.paid ? "Mark unpaid" : "Mark paid"}
              >
                {m.paid ? "✓" : ""}
              </button>
              <div className={styles.milestoneInfo}>
                <span className={styles.milestoneLabel}>{m.label}</span>
                <span className={styles.milestoneMeta}>
                  {m.date ? formatDate(m.date) : "No date"}
                  {m.amount > 0 ? ` · ${formatCurrency(m.amount)}` : ""}
                </span>
              </div>
              <button className={styles.milestoneDelete} onClick={() => deleteMilestone(m.id)}>×</button>
            </div>
          ))}
        </div>

        {addingMilestone && (
          <div className={styles.addMilestone}>
            <input
              className={styles.input}
              placeholder="Label (e.g. Venue deposit)"
              value={newMilestone.label}
              onChange={(e) => setNewMilestone((p) => ({ ...p, label: e.target.value }))}
            />
            <DateInput value={newMilestone.date} onChange={(v) => setNewMilestone((p) => ({ ...p, date: v }))} />
            <input
              className={styles.input}
              type="number"
              min="0"
              placeholder="Amount (£)"
              value={newMilestone.amount}
              onChange={(e) => setNewMilestone((p) => ({ ...p, amount: e.target.value }))}
            />
            <div className={styles.addMilestoneActions}>
              <button className={styles.btnSave} onClick={saveMilestone}>Save</button>
              <button className={styles.btnCancel} onClick={() => setAddingMilestone(false)}>Cancel</button>
            </div>
          </div>
        )}
      </div>

      {/* Notes */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>Notes</h3>
          {!editingNotes && (
            <button className={styles.btnAdd} onClick={() => setEditingNotes(true)}>Edit</button>
          )}
        </div>
        {editingNotes ? (
          <div className={styles.notesEdit}>
            <textarea
              className={styles.textarea}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="Add notes about your event…"
            />
            <div className={styles.addMilestoneActions}>
              <button className={styles.btnSave} onClick={async () => { await onUpdate({ notes }); setEditingNotes(false); }}>Save</button>
              <button className={styles.btnCancel} onClick={() => { setNotes(event.notes); setEditingNotes(false); }}>Cancel</button>
            </div>
          </div>
        ) : (
          <p className={styles.notesText}>{event.notes || <span className={styles.empty}>No notes yet.</span>}</p>
        )}
      </div>
    </div>
  );
}
