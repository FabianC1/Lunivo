"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import PageLoading from "../../../components/PageLoading";
import { readApiError } from "../../../lib/apiClient";
import { getSession } from "../../../lib/auth";
import { hasFeatureAccess } from "../../../lib/subscriptions";
import { formatCurrency, formatDate } from "../../../lib/utils";
import OverviewTab from "./OverviewTab";
import BudgetTab from "./BudgetTab";
import AffordabilityTab from "./AffordabilityTab";
import ScenariosTab from "./ScenariosTab";
import styles from "./event.module.css";

export type EventType =
  | "Wedding" | "Holiday" | "Home" | "Education"
  | "Vehicle" | "Emergency Fund" | "Birthday" | "Other";

export type LocationTier = "budget" | "local" | "destination" | "luxury";

export interface Milestone {
  id: string;
  label: string;
  date: string;
  amount: number;
  paid: boolean;
}

export interface Scenario {
  id: string;
  name: string;
  guestCount: number;
  locationTier: string;
  costs: Record<string, number>;
  contingencyPercent: number;
  budgetTarget: number;
  createdAt: string;
}

export interface EventData {
  id: string;
  name: string;
  type: EventType;
  eventDate: string;
  guestCount: number;
  locationTier: LocationTier;
  currentSavings: number;
  monthlyIncome: number;
  monthlyCommitments: number;
  budgetTarget: number;
  contingencyPercent: number;
  costs: Record<string, number>;
  milestones: Milestone[];
  scenarios: Scenario[];
  notes: string;
}

type Tab = "overview" | "budget" | "affordability" | "scenarios";

const EVENT_ICONS: Record<EventType, string> = {
  Wedding: "💍", Holiday: "✈️", Home: "🏠", Education: "🎓",
  Vehicle: "🚗", "Emergency Fund": "🛡️", Birthday: "🎂", Other: "⭐",
};

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [event, setEvent] = useState<EventData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [planSlug, setPlanSlug] = useState("free");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const session = getSession();
    if (!session?.userId) { router.push("/login"); return; }

    async function load() {
      try {
        const [eventRes, profileRes] = await Promise.all([
          fetch(`/api/events/${id}`, { cache: "no-store" }),
          fetch("/api/profile", { cache: "no-store" }),
        ]);
        if (!eventRes.ok) { setError(await readApiError(eventRes, "Event not found.")); return; }
        const { event: data } = await eventRes.json();
        setEvent(data);
        if (profileRes.ok) {
          const { user } = await profileRes.json();
          setPlanSlug(user?.planSlug ?? "free");
        }
      } catch { setError("Unable to load event."); }
      finally { setIsLoading(false); }
    }
    load();
  }, [id, router]);

  const updateEvent = useCallback(async (patch: Partial<EventData>) => {
    if (!event) return;
    const optimistic = { ...event, ...patch };
    setEvent(optimistic);
    setSaving(true);
    try {
      const res = await fetch(`/api/events/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (res.ok) {
        const { event: updated } = await res.json();
        setEvent(updated);
      }
    } finally { setSaving(false); }
  }, [event, id]);

  async function handleDelete() {
    if (!confirm(`Delete "${event?.name}"? This cannot be undone.`)) return;
    await fetch(`/api/events/${id}`, { method: "DELETE" });
    router.push("/events");
  }

  if (isLoading) return <PageLoading />;
  if (error || !event) return (
    <div className={styles.errorPage}>
      <p>{error || "Event not found."}</p>
      <Link href="/events">← Back to My Events</Link>
    </div>
  );

  const canUseScenarios = hasFeatureAccess(planSlug, "scenarios");

  const TABS: Array<{ id: Tab; label: string }> = [
    { id: "overview", label: "Overview" },
    { id: "budget", label: "Budget" },
    { id: "affordability", label: "Affordability" },
    { id: "scenarios", label: `Scenarios${!canUseScenarios ? " 🔒" : ""}` },
  ];

  return (
    <div className={styles.page}>
      {/* Page header */}
      <div className={styles.pageHeader}>
        <Link href="/events" className={styles.back}>← My Events</Link>
        <div className={styles.eventTitle}>
          <span className={styles.eventIcon}>{EVENT_ICONS[event.type]}</span>
          <div>
            <h1 className={styles.eventName}>{event.name}</h1>
            <span className={styles.eventMeta}>
              {event.type}
              {event.eventDate ? ` · ${formatDate(event.eventDate)}` : ""}
            </span>
          </div>
        </div>
        <div className={styles.headerActions}>
          {saving && <span className={styles.savingBadge}>Saving…</span>}
          <button className={styles.btnDelete} onClick={handleDelete}>Delete</button>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className={styles.tabContent}>
        {activeTab === "overview" && (
          <OverviewTab event={event} onUpdate={updateEvent} formatCurrency={formatCurrency} formatDate={formatDate} />
        )}
        {activeTab === "budget" && (
          <BudgetTab event={event} onUpdate={updateEvent} formatCurrency={formatCurrency} />
        )}
        {activeTab === "affordability" && (
          <AffordabilityTab event={event} onUpdate={updateEvent} planSlug={planSlug} formatCurrency={formatCurrency} />
        )}
        {activeTab === "scenarios" && (
          <ScenariosTab event={event} setEvent={setEvent} planSlug={planSlug} formatCurrency={formatCurrency} />
        )}
      </div>
    </div>
  );
}
