"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PageLoading from "../../components/PageLoading";
import { readApiError } from "../../lib/apiClient";
import { getSession } from "../../lib/auth";
import { getEventLimit } from "../../lib/subscriptions";
import { formatCurrency, formatDate } from "../../lib/utils";
import styles from "./events.module.css";

type EventType =
  | "Wedding" | "Holiday" | "Home" | "Education"
  | "Vehicle" | "Emergency Fund" | "Birthday" | "Other";

interface EventItem {
  id: string;
  name: string;
  type: EventType;
  eventDate: string;
  guestCount: number;
  budgetTarget: number;
  currentSavings: number;
  costs: Record<string, number>;
  contingencyPercent: number;
  createdAt: string;
}

const EVENT_ICONS: Record<EventType, string> = {
  Wedding: "💍", Holiday: "✈️", Home: "🏠", Education: "🎓",
  Vehicle: "🚗", "Emergency Fund": "🛡️", Birthday: "🎂", Other: "⭐",
};

function getTotalCost(event: EventItem): number {
  const subtotal = Object.values(event.costs).reduce((s, v) => s + v, 0);
  return subtotal * (1 + (event.contingencyPercent ?? 10) / 100);
}

function getFundedPercent(event: EventItem): number {
  const total = getTotalCost(event) || event.budgetTarget;
  if (!total) return 0;
  return Math.min(100, Math.round((event.currentSavings / total) * 100));
}

function getMonthsUntil(dateStr: string): number | null {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  const now = new Date();
  const months = (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth());
  return months > 0 ? months : null;
}

function getRequiredMonthlySavings(event: EventItem): number | null {
  const total = getTotalCost(event) || event.budgetTarget;
  const remaining = Math.max(0, total - event.currentSavings);
  const months = getMonthsUntil(event.eventDate);
  if (!months || !remaining) return null;
  return Math.ceil(remaining / months);
}

export default function EventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [planSlug, setPlanSlug] = useState<string>("free");

  useEffect(() => {
    const session = getSession();
    if (!session?.userId) { setIsLoading(false); return; }

    async function load() {
      try {
        const [eventsRes, profileRes] = await Promise.all([
          fetch("/api/events", { cache: "no-store" }),
          fetch("/api/profile", { cache: "no-store" }),
        ]);
        if (!eventsRes.ok) { setError(await readApiError(eventsRes, "Unable to load events.")); return; }
        const { events: data } = await eventsRes.json();
        setEvents(data ?? []);
        if (profileRes.ok) {
          const { user } = await profileRes.json();
          setPlanSlug(user?.planSlug ?? "free");
        }
      } catch { setError("Unable to load events."); }
      finally { setIsLoading(false); }
    }
    load();
  }, []);

  const eventLimit = getEventLimit(planSlug);
  const canCreateMore = eventLimit === null || events.length < eventLimit;

  if (isLoading) return <PageLoading />;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>My Events</h1>
          <p className={styles.subtitle}>
            {events.length === 0 ? "Start planning your first life event." : `${events.length} event${events.length === 1 ? "" : "s"} planned`}
          </p>
        </div>
        <div className={styles.headerActions}>
          {canCreateMore
            ? <Link href="/events/new" className={styles.btnCreate}>+ New Event</Link>
            : <Link href="/subscriptions" className={styles.btnUpgrade}>Upgrade to add more</Link>
          }
        </div>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {events.length === 0 && !error && (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>🗓️</div>
          <h2>No events yet</h2>
          <p>Create your first event to start planning and building your affordability timeline.</p>
          <Link href="/events/new" className={styles.btnCreate}>Create your first event</Link>
        </div>
      )}

      {events.length > 0 && (
        <div className={styles.grid}>
          {events.map((event) => {
            const total = getTotalCost(event) || event.budgetTarget;
            const funded = getFundedPercent(event);
            const monthly = getRequiredMonthlySavings(event);
            const months = getMonthsUntil(event.eventDate);
            return (
              <Link key={event.id} href={`/events/${event.id}`} className={styles.card}>
                <div className={styles.cardTop}>
                  <span className={styles.cardIcon}>{EVENT_ICONS[event.type] ?? "⭐"}</span>
                  <div className={styles.cardMeta}>
                    <span className={styles.cardType}>{event.type}</span>
                    {event.eventDate && <span className={styles.cardDate}>{formatDate(event.eventDate)}</span>}
                  </div>
                </div>
                <h2 className={styles.cardName}>{event.name}</h2>
                {months !== null && <p className={styles.cardCountdown}>{months} months away</p>}
                <div className={styles.cardStats}>
                  {total > 0 && (
                    <div className={styles.stat}>
                      <span className={styles.statLabel}>Budget</span>
                      <span className={styles.statValue}>{formatCurrency(total)}</span>
                    </div>
                  )}
                  {monthly !== null && (
                    <div className={styles.stat}>
                      <span className={styles.statLabel}>Save/month</span>
                      <span className={styles.statValue}>{formatCurrency(monthly)}</span>
                    </div>
                  )}
                </div>
                {total > 0 && (
                  <div className={styles.progressWrap}>
                    <div className={styles.progressBar}>
                      <div className={styles.progressFill} style={{ width: `${funded}%` }} />
                    </div>
                    <span className={styles.progressLabel}>{funded}% funded</span>
                  </div>
                )}
              </Link>
            );
          })}
          {!canCreateMore && (
            <Link href="/subscriptions" className={`${styles.card} ${styles.cardUpgrade}`}>
              <span className={styles.upgradeIcon}>🔓</span>
              <h2 className={styles.upgradeName}>Add more events</h2>
              <p className={styles.upgradeDesc}>Upgrade to Smart to plan up to 10 events, or Pro for unlimited.</p>
              <span className={styles.upgradeLink}>View plans →</span>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
