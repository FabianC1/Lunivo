"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import DateInput from "../../../components/DateInput";
import { readApiError } from "../../../lib/apiClient";
import styles from "./new.module.css";

type EventType =
  | "Wedding"
  | "Holiday"
  | "Home"
  | "Education"
  | "Vehicle"
  | "Emergency Fund"
  | "Birthday"
  | "Other";

type LocationTier = "budget" | "local" | "destination" | "luxury";

const EVENT_TYPES: Array<{ type: EventType; icon: string; label: string; description: string }> = [
  { type: "Wedding", icon: "💍", label: "Wedding", description: "Plan your big day" },
  { type: "Holiday", icon: "✈️", label: "Holiday", description: "Travel & getaways" },
  { type: "Home", icon: "🏠", label: "Home Purchase", description: "Deposit & moving costs" },
  { type: "Education", icon: "🎓", label: "Education", description: "Tuition & study costs" },
  { type: "Vehicle", icon: "🚗", label: "Vehicle", description: "Car or bike purchase" },
  { type: "Emergency Fund", icon: "🛡️", label: "Emergency Fund", description: "Financial safety net" },
  { type: "Birthday", icon: "🎂", label: "Birthday", description: "Celebration planning" },
  { type: "Other", icon: "⭐", label: "Other", description: "Any life goal" },
];

const LOCATION_TIERS: Array<{ value: LocationTier; label: string; description: string }> = [
  { value: "budget", label: "Budget", description: "Cost-conscious" },
  { value: "local", label: "Local", description: "Nearby venue" },
  { value: "destination", label: "Destination", description: "Travel required" },
  { value: "luxury", label: "Luxury", description: "Premium experience" },
];

export default function NewEventPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedType, setSelectedType] = useState<EventType | null>(null);
  const [name, setName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [guestCount, setGuestCount] = useState("");
  const [locationTier, setLocationTier] = useState<LocationTier>("local");
  const [budgetTarget, setBudgetTarget] = useState("");
  const [currentSavings, setCurrentSavings] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleTypeSelect(type: EventType) {
    setSelectedType(type);
    // Pre-fill name suggestion
    if (!name) {
      const suggestions: Record<EventType, string> = {
        Wedding: "Our Wedding",
        Holiday: "Summer Holiday",
        Home: "Home Purchase",
        Education: "University Fund",
        Vehicle: "New Car",
        "Emergency Fund": "Emergency Fund",
        Birthday: "Birthday Celebration",
        Other: "My Goal",
      };
      setName(suggestions[type]);
    }
    setStep(2);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedType) return;
    if (!name.trim()) {
      setError("Please enter an event name.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          type: selectedType,
          eventDate: eventDate || "",
          guestCount: guestCount ? Number(guestCount) : 0,
          locationTier,
          budgetTarget: budgetTarget ? Number(budgetTarget) : 0,
          currentSavings: currentSavings ? Number(currentSavings) : 0,
        }),
      });

      if (!res.ok) {
        const msg = await readApiError(res, "Unable to create event.");
        setError(msg);
        setLoading(false);
        return;
      }

      const { event } = await res.json();
      router.push(`/events/${event.id}`);
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  const showGuests = selectedType === "Wedding" || selectedType === "Birthday" || selectedType === "Other";
  const showLocation = selectedType === "Wedding" || selectedType === "Holiday";

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <Link href="/events" className={styles.back}>← Back to My Events</Link>
          <h1 className={styles.title}>Create a new event</h1>
          <p className={styles.subtitle}>What are you planning for?</p>
        </div>

        {/* Step indicator */}
        <div className={styles.steps}>
          <div className={`${styles.step} ${step >= 1 ? styles.stepActive : ""}`}>
            <span className={styles.stepNum}>1</span>
            <span>Event type</span>
          </div>
          <div className={styles.stepLine} />
          <div className={`${styles.step} ${step >= 2 ? styles.stepActive : ""}`}>
            <span className={styles.stepNum}>2</span>
            <span>Details</span>
          </div>
        </div>

        {step === 1 && (
          <div className={styles.typeGrid}>
            {EVENT_TYPES.map(({ type, icon, label, description }) => (
              <button
                key={type}
                className={`${styles.typeCard} ${selectedType === type ? styles.typeCardSelected : ""}`}
                onClick={() => handleTypeSelect(type)}
              >
                <span className={styles.typeIcon}>{icon}</span>
                <span className={styles.typeLabel}>{label}</span>
                <span className={styles.typeDesc}>{description}</span>
              </button>
            ))}
          </div>
        )}

        {step === 2 && selectedType && (
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.selectedType}>
              <span className={styles.selectedTypeIcon}>
                {EVENT_TYPES.find((t) => t.type === selectedType)?.icon}
              </span>
              <span>{EVENT_TYPES.find((t) => t.type === selectedType)?.label}</span>
              <button type="button" className={styles.changeType} onClick={() => setStep(1)}>
                Change
              </button>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>Event name *</label>
              <input
                className={styles.input}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Our Wedding"
                maxLength={80}
                required
              />
            </div>

            <div className={styles.fieldRow}>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Event date</label>
                <DateInput value={eventDate} onChange={setEventDate} />
              </div>

              {showGuests && (
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Guest count</label>
                  <input
                    className={styles.input}
                    type="number"
                    min="0"
                    value={guestCount}
                    onChange={(e) => setGuestCount(e.target.value)}
                    placeholder="e.g. 80"
                  />
                </div>
              )}
            </div>

            {showLocation && (
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Location tier</label>
                <div className={styles.tierGrid}>
                  {LOCATION_TIERS.map(({ value, label, description }) => (
                    <button
                      key={value}
                      type="button"
                      className={`${styles.tierCard} ${locationTier === value ? styles.tierCardSelected : ""}`}
                      onClick={() => setLocationTier(value)}
                    >
                      <span className={styles.tierLabel}>{label}</span>
                      <span className={styles.tierDesc}>{description}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className={styles.fieldRow}>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Budget target (£)</label>
                <input
                  className={styles.input}
                  type="number"
                  min="0"
                  value={budgetTarget}
                  onChange={(e) => setBudgetTarget(e.target.value)}
                  placeholder="e.g. 20000"
                />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Already saved (£)</label>
                <input
                  className={styles.input}
                  type="number"
                  min="0"
                  value={currentSavings}
                  onChange={(e) => setCurrentSavings(e.target.value)}
                  placeholder="e.g. 5000"
                />
              </div>
            </div>

            {error && <p className={styles.error}>{error}</p>}

            <div className={styles.formActions}>
              <button type="button" className={styles.btnSecondary} onClick={() => setStep(1)}>
                Back
              </button>
              <button type="submit" className={styles.btnPrimary} disabled={loading}>
                {loading ? "Creating…" : "Create Event →"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
