"use client";

import { useRef } from "react";
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

function formatDisplayDate(value: string) {
  if (!value) {
    return "Select a date";
  }

  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return formatter.format(parsed);
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
  const inputRef = useRef<HTMLInputElement>(null);

  function openPicker() {
    const input = inputRef.current;
    if (!input) {
      return;
    }

    if (typeof input.showPicker === "function") {
      input.showPicker();
      return;
    }

    input.focus();
    input.click();
  }

  const displayValue = value ? formatDisplayDate(value) : placeholder;

  return (
    <div className={styles.root}>
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
      <input
        ref={inputRef}
        id={id}
        name={name}
        className={styles.hiddenInput}
        type="date"
        value={value}
        min={min}
        max={max}
        required={required}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}