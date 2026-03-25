"use client";

import { useState, useRef, useEffect } from "react";
import styles from "./TransactionForm.module.css";

interface TransactionFormProps {
  initial?: {
    date: string;
    amount: number;
    category: string;
    description: string;
  };
  categoryOptions: string[];
  categoryLabel?: string;
  categoryPlaceholder?: string;
  descriptionLabel?: string;
  onSubmit: (data: {
    date: string;
    amount: number;
    category: string;
    description: string;
  }) => void;
  onCancel?: () => void;
}

export default function TransactionForm({
  initial,
  categoryOptions,
  categoryLabel = "Category",
  categoryPlaceholder = "Select",
  descriptionLabel = "Description",
  onSubmit,
  onCancel,
}: TransactionFormProps) {
  const [date, setDate] = useState(initial?.date || new Date().toISOString().substr(0, 10));
  const [amount, setAmount] = useState(initial?.amount || 0);
  const [category, setCategory] = useState(initial?.category || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [error, setError] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!date || amount <= 0 || !category) {
      setError("Please fill in all required fields and use a positive amount.");
      return;
    }
    setError("");
    onSubmit({ date, amount, category, description });
  }

  function openDatePicker() {
    const input = dateInputRef.current;
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

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {error && <p className={styles.error}>{error}</p>}
      <label>
        Date
        <div className={styles.dateInputWrap}>
          <input
            ref={dateInputRef}
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
          <button
            type="button"
            className={styles.dateInputButton}
            onClick={openDatePicker}
            aria-label="Open calendar"
          >
            <svg className={styles.dateInputIcon} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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
        </div>
      </label>
      <label>
        Amount
        <input
          type="number"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(parseFloat(e.target.value))}
          required
        />
      </label>
      <label>
        {categoryLabel}
        <div className={styles.dropdown} ref={dropdownRef}>
          <div
            className={`${styles.dropdownTrigger} ${isDropdownOpen ? styles.dropdownTriggerOpen : ''}`}
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            <span className={category ? '' : styles.dropdownPlaceholder}>
              {category || categoryPlaceholder}
            </span>
            <svg
              className={`${styles.dropdownArrow} ${isDropdownOpen ? styles.dropdownArrowUp : ''}`}
              width="12" height="12" viewBox="0 0 12 12"
            >
              <path fill="currentColor" d="M6 8L1 3h10z" />
            </svg>
          </div>
          {isDropdownOpen && (
            <div className={styles.dropdownList}>
              {categoryOptions.map((cat) => (
                <div
                  key={cat}
                  className={`${styles.dropdownOption} ${category === cat ? styles.dropdownOptionActive : ''}`}
                  onClick={() => { setCategory(cat); setIsDropdownOpen(false); }}
                >
                  {cat}
                </div>
              ))}
            </div>
          )}
        </div>
      </label>
      <label>
        {descriptionLabel}
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>
      <div className={styles.actions}>
        {onCancel && (
          <button type="button" className={styles.cancel} onClick={onCancel}>
            Cancel
          </button>
        )}
        <button type="submit" className={styles.submit}>
          Save
        </button>
      </div>
    </form>
  );
}