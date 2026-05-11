"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PageLoading from "../../components/PageLoading";
import { getSession } from "../../lib/auth";
import { getEventLimit } from "../../lib/subscriptions";
import { formatCurrency, formatDate } from "../../lib/utils";
import styles from "./dashboard.module.css";

type EventType =
  | "Wedding" | "Holiday" | "Home" | "Education"
  | "Vehicle" | "Emergency Fund" | "Birthday" | "Other";

interface EventItem {
  id: string;
  name: string;
  type: EventType;
  eventDate: string;
  budgetTarget: number;
  currentSavings: number;
  costs: Record<string, number>;
  contingencyPercent: number;
}

const EVENT_ICONS: Record<EventType, string> = {
  Wedding: "💍", Holiday: "✈️", Home: "🏠", Education: "🎓",
  Vehicle: "🚗", "Emergency Fund": "🛡️", Birthday: "🎂", Other: "⭐",
};

function getTotalCost(event: EventItem): number {
  const subtotal = Object.values(event.costs).reduce((s, v) => s + v, 0);
  return subtotal > 0 ? subtotal * (1 + (event.contingencyPercent ?? 10) / 100) : event.budgetTarget;
}

function getMonthsUntil(dateStr: string): number | null {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  const now = new Date();
  const months = (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth());
  return months > 0 ? months : null;
}

function getRequiredMonthly(event: EventItem): number | null {
  const total = getTotalCost(event);
  const remaining = Math.max(0, total - event.currentSavings);
  const months = getMonthsUntil(event.eventDate);
  if (!months || !remaining) return null;
  return Math.ceil(remaining / months);
}

export default function DashboardPage() {
  const router = useRouter();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const [planSlug, setPlanSlug] = useState("free");

  useEffect(() => {
    const session = getSession();
    if (!session?.userId) { router.push("/login"); return; }

    async function load() {
      try {
        const [eventsRes, profileRes] = await Promise.all([
          fetch("/api/events", { cache: "no-store" }),
          fetch("/api/profile", { cache: "no-store" }),
        ]);
        if (eventsRes.ok) {
          const { events: data } = await eventsRes.json();
          setEvents(data ?? []);
        }
        if (profileRes.ok) {
          const { user } = await profileRes.json();
          setUserName(user?.name?.split(" ")[0] ?? "");
          setPlanSlug(user?.planSlug ?? "free");
        }
      } finally { setIsLoading(false); }
    }
    load();
  }, [router]);

  if (isLoading) return <PageLoading />;

  const eventLimit = getEventLimit(planSlug);
  const canCreateMore = eventLimit === null || events.length < eventLimit;
  const nextEvent = events
    .filter((e) => e.eventDate && getMonthsUntil(e.eventDate) !== null)
    .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime())[0];

  return (
    <div className={styles.page}>
      {/* Hero prompt */}
      <div className={styles.hero}>
        <div className={styles.heroText}>
          <h1 className={styles.heroTitle}>
            {userName ? `Welcome back, ${userName}.` : "Welcome back."}
          </h1>
          <p className={styles.heroSubtitle}>
            {events.length === 0
              ? "What are you planning for? Create your first event to get started."
              : `You have ${events.length} event${events.length === 1 ? "" : "s"} in progress.`}
          </p>
        </div>
        {canCreateMore && (
          <Link href="/events/new" className={styles.heroBtn}>
            + Create Event
          </Link>
        )}
      </div>

      {/* Next upcoming event highlight */}
      {nextEvent && (
        <Link href={`/events/${nextEvent.id}`} className={styles.nextEventBanner}>
          <div className={styles.nextEventLeft}>
            <span className={styles.nextEventIcon}>{EVENT_ICONS[nextEvent.type]}</span>
            <div>
              <span className={styles.nextEventLabel}>Next upcoming</span>
              <span className={styles.nextEventName}>{nextEvent.name}</span>
              <span className={styles.nextEventDate}>{formatDate(nextEvent.eventDate)}</span>
            </div>
          </div>
          <div className={styles.nextEventRight}>
            {getRequiredMonthly(nextEvent) !== null && (
              <>
                <span className={styles.nextEventAmount}>{formatCurrency(getRequiredMonthly(nextEvent)!)}</span>
                <span className={styles.nextEventAmountLabel}>/ month needed</span>
              </>
            )}
            <span className={styles.nextEventArrow}>→</span>
          </div>
        </Link>
      )}

      {/* Events grid */}
      {events.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIllustration}>
            <span>💍</span><span>✈️</span><span>🏠</span>
          </div>
          <h2>Plan life's biggest moments</h2>
          <p>Weddings, holidays, home purchases — Lunivo helps you understand what you can afford before you commit.</p>
          <Link href="/events/new" className={styles.emptyBtn}>Create your first event</Link>
        </div>
      ) : (
        <>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Your events</h2>
            <Link href="/events" className={styles.seeAll}>See all →</Link>
          </div>
          <div className={styles.grid}>
            {events.slice(0, 6).map((event) => {
              const total = getTotalCost(event);
              const funded = total > 0 ? Math.min(100, Math.round((event.currentSavings / total) * 100)) : 0;
              const monthly = getRequiredMonthly(event);
              const months = getMonthsUntil(event.eventDate);
              return (
                <Link key={event.id} href={`/events/${event.id}`} className={styles.card}>
                  <div className={styles.cardTop}>
                    <span className={styles.cardIcon}>{EVENT_ICONS[event.type]}</span>
                    <div className={styles.cardMeta}>
                      <span className={styles.cardType}>{event.type}</span>
                      {event.eventDate && <span className={styles.cardDate}>{formatDate(event.eventDate)}</span>}
                    </div>
                  </div>
                  <h3 className={styles.cardName}>{event.name}</h3>
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
                      <span className={styles.progressLabel}>{funded}%</span>
                    </div>
                  )}
                </Link>
              );
            })}
            {canCreateMore && (
              <Link href="/events/new" className={`${styles.card} ${styles.cardNew}`}>
                <span className={styles.cardNewIcon}>+</span>
                <span className={styles.cardNewLabel}>New Event</span>
              </Link>
            )}
          </div>
        </>
      )}

      {/* Plan upgrade nudge */}
      {planSlug === "free" && (
        <div className={styles.upgradeBanner}>
          <div>
            <strong>Unlock more with Smart</strong>
            <p>Multiple events, savings forecasting, scenario planning, and advanced affordability analysis.</p>
          </div>
          <Link href="/subscriptions" className={styles.upgradeBtn}>View plans →</Link>
        </div>
      )}
    </div>
  );
}
