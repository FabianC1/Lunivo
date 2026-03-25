"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import styles from "./DateInput.module.css";

interface DateInputProps {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  id?: string;
  name?: string;
  min?: string;
  max?: string;
  placeholder?: string;
}

const formatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const WEEKDAY_LABELS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

function formatDisplayDate(value: string) {
  if (!value) {
    return "Select a date";
  }

  const parsed = parseISO(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return formatter.format(parsed);
}

function clampMonth(value: string | undefined, fallback: Date) {
  if (!value) {
    return fallback;
  }

  const parsed = parseISO(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

export default function DateInput({
  value,
  onChange,
  required = false,
  id,
  name,
  min,
  max,
  placeholder = "Select a date",
}: DateInputProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => clampMonth(value, new Date()));

  useEffect(() => {
    setVisibleMonth((current) => clampMonth(value, current));
  }, [value]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  function openPicker() {
    setVisibleMonth(clampMonth(value, new Date()));
    setIsOpen(true);
  }

  const displayValue = value ? formatDisplayDate(value) : placeholder;
  const selectedDate = value ? parseISO(value) : null;
  const monthStart = startOfMonth(visibleMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(endOfMonth(visibleMonth), { weekStartsOn: 1 });

  const days = useMemo(() => {
    const items: Date[] = [];
    for (let cursor = calendarStart; cursor <= calendarEnd; cursor = addDays(cursor, 1)) {
      items.push(cursor);
    }
    return items;
  }, [calendarEnd, calendarStart]);

  function selectDate(day: Date) {
    onChange(format(day, "yyyy-MM-dd"));
    setIsOpen(false);
  }

  const minDate = min ? parseISO(min) : null;
  const maxDate = max ? parseISO(max) : null;

  function isDisabled(day: Date) {
    if (minDate && day < minDate) {
      return true;
    }
    if (maxDate && day > maxDate) {
      return true;
    }
    return false;
  }

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        type="button"
        className={`${styles.displayButton} ${value ? "" : styles.placeholder}`}
        onClick={openPicker}
        aria-label={value ? `Selected date ${displayValue}` : placeholder}
      >
        <span>{displayValue}</span>
        <svg className={styles.icon} width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M7 2V5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M17 2V5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <rect x="3" y="4" width="18" height="17" rx="3" stroke="currentColor" strokeWidth="1.8" />
          <path d="M3 9H21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M8 13H8.01" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M12 13H12.01" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M16 13H16.01" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M8 17H8.01" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M12 17H12.01" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      </button>
      <input id={id} name={name} className={styles.hiddenInput} type="date" value={value} required={required} readOnly tabIndex={-1} aria-hidden="true" />
      {isOpen && (
        <div className={styles.popover} role="dialog" aria-label="Choose date">
          <div className={styles.calendarHeader}>
            <button
              type="button"
              className={styles.navButton}
              onClick={() => setVisibleMonth((current) => subMonths(current, 1))}
              aria-label="Previous month"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M9.5 3.5L5 8l4.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <div className={styles.monthLabel}>{format(visibleMonth, "MMMM yyyy")}</div>
            <button
              type="button"
              className={styles.navButton}
              onClick={() => setVisibleMonth((current) => addMonths(current, 1))}
              aria-label="Next month"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M6.5 3.5L11 8l-4.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          <div className={styles.weekdayRow}>
            {WEEKDAY_LABELS.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>

          <div className={styles.grid}>
            {days.map((day) => {
              const disabled = isDisabled(day);
              const selected = Boolean(selectedDate && isSameDay(day, selectedDate));
              const outside = !isSameMonth(day, visibleMonth);
              const today = isToday(day);

              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  className={[
                    styles.dayButton,
                    outside ? styles.dayOutside : "",
                    selected ? styles.daySelected : "",
                    today ? styles.dayToday : "",
                  ].filter(Boolean).join(" ")}
                  onClick={() => selectDate(day)}
                  disabled={disabled}
                  aria-pressed={selected}
                >
                  {format(day, "d")}
                </button>
              );
            })}
          </div>

          <div className={styles.footer}>
            <button type="button" className={styles.footerButton} onClick={() => selectDate(new Date())}>
              Today
            </button>
            {!required && value && (
              <button type="button" className={styles.footerButton} onClick={() => { onChange(""); setIsOpen(false); }}>
                Clear
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}