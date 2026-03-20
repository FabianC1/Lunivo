"use client";

import { FormEvent, useMemo, useState } from "react";
import styles from "./events.module.css";
import { formatCurrency } from "../../lib/utils";

type EventKind = "Wedding" | "Holiday" | "Birthday" | "Other";

interface EventItem {
  id: number;
  title: string;
  kind: EventKind;
  targetAmount: number;
  savedAmount: number;
  targetDate: string;
  notes: string;
}

const SAMPLE_EVENTS: EventItem[] = [
  {
    id: 1,
    title: "Wedding Plan",
    kind: "Wedding",
    targetAmount: 12000,
    savedAmount: 4200,
    targetDate: "2026-11-20",
    notes: "Venue, attire, and catering.",
  },
  {
    id: 2,
    title: "Summer Holiday",
    kind: "Holiday",
    targetAmount: 3500,
    savedAmount: 1100,
    targetDate: "2026-08-10",
    notes: "Flights and accommodation.",
  },
];

export default function EventsPage() {
  const [events, setEvents] = useState<EventItem[]>(SAMPLE_EVENTS);
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<EventKind>("Wedding");
  const [targetAmount, setTargetAmount] = useState("");
  const [savedAmount, setSavedAmount] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [notes, setNotes] = useState("");

  const totals = useMemo(() => {
    const target = events.reduce((sum, item) => sum + item.targetAmount, 0);
    const saved = events.reduce((sum, item) => sum + item.savedAmount, 0);
    return { target, saved, remaining: Math.max(0, target - saved) };
  }, [events]);

  function handleCreateEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsedTarget = Number(targetAmount);
    const parsedSaved = Number(savedAmount || "0");

    if (!title.trim() || !targetDate || !Number.isFinite(parsedTarget) || parsedTarget <= 0) {
      return;
    }

    const nextEvent: EventItem = {
      id: Date.now(),
      title: title.trim(),
      kind,
      targetAmount: parsedTarget,
      savedAmount: Math.max(0, Number.isFinite(parsedSaved) ? parsedSaved : 0),
      targetDate,
      notes: notes.trim(),
    };

    setEvents((prev) => [nextEvent, ...prev]);
    setTitle("");
    setKind("Wedding");
    setTargetAmount("");
    setSavedAmount("");
    setTargetDate("");
    setNotes("");
  }

  return (
    <div className={`${styles.container} container`}>
      <header className={styles.header}>
        <h1 className={styles.title}>Events</h1>
        <p className={styles.subtitle}>Create savings goals for major moments like weddings, holidays, and milestones.</p>
      </header>

      <section className={styles.kpiGrid}>
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

      <section className={styles.panel}>
        <h2>Create Event</h2>
        <form className={styles.form} onSubmit={handleCreateEvent}>
          <label>
            Title
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Wedding in Lisbon" required />
          </label>

          <label>
            Type
            <select value={kind} onChange={(e) => setKind(e.target.value as EventKind)}>
              <option value="Wedding">Wedding</option>
              <option value="Holiday">Holiday</option>
              <option value="Birthday">Birthday</option>
              <option value="Other">Other</option>
            </select>
          </label>

          <label>
            Target Amount
            <input type="number" min="1" step="0.01" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} required />
          </label>

          <label>
            Saved So Far
            <input type="number" min="0" step="0.01" value={savedAmount} onChange={(e) => setSavedAmount(e.target.value)} />
          </label>

          <label>
            Target Date
            <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} required />
          </label>

          <label className={styles.fullWidth}>
            Notes
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" rows={3} />
          </label>

          <button type="submit" className={styles.primaryButton}>Create event</button>
        </form>
      </section>

      <section className={styles.panel}>
        <h2>Your Events</h2>
        <div className={styles.eventList}>
          {events.map((item) => {
            const progress = item.targetAmount > 0 ? Math.min(100, (item.savedAmount / item.targetAmount) * 100) : 0;
            return (
              <article key={item.id} className={styles.eventCard}>
                <div className={styles.eventHead}>
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.kind} · {item.targetDate}</p>
                  </div>
                  <strong>{Math.round(progress)}%</strong>
                </div>

                <div className={styles.progressTrack}>
                  <span style={{ width: `${progress}%` }} />
                </div>

                <div className={styles.metaRow}>
                  <span>Saved: {formatCurrency(item.savedAmount)}</span>
                  <span>Target: {formatCurrency(item.targetAmount)}</span>
                  <span>Left: {formatCurrency(Math.max(0, item.targetAmount - item.savedAmount))}</span>
                </div>

                {item.notes && <p className={styles.notes}>{item.notes}</p>}
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
