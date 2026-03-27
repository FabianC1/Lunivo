"use client";

import { useState, useRef, useEffect } from "react";
import DateInput from "./DateInput";
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
  submitLabel?: string;
  deleteLabel?: string;
  onSubmit: (data: {
    date: string;
    amount: number;
    category: string;
    description: string;
  }) => void;
  onCancel?: () => void;
  onDelete?: () => void;
}

export default function TransactionForm({
  initial,
  categoryOptions,
  categoryLabel = "Category",
  categoryPlaceholder = "Select",
  descriptionLabel = "Description",
  submitLabel = "Save",
  deleteLabel = "Delete",
  onSubmit,
  onCancel,
  onDelete,
}: TransactionFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [date, setDate] = useState(initial?.date || new Date().toISOString().substr(0, 10));
  const [amount, setAmount] = useState(initial?.amount || 0);
  const [category, setCategory] = useState(initial?.category || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [error, setError] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setDate(initial?.date || new Date().toISOString().slice(0, 10));
    setAmount(initial?.amount || 0);
    setCategory(initial?.category || "");
    setDescription(initial?.description || "");
    setError("");
  }, [initial]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!date || amount <= 0 || !category) {
      setError("Please fill in all required fields and use a positive amount.");
      return;
    }
    setError("");
    onSubmit({ date, amount, category, description });
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLFormElement>) {
    if (event.key !== "Enter" || isDropdownOpen) {
      return;
    }

    const target = event.target as HTMLElement | null;
    const tagName = target?.tagName;

    if (tagName === "BUTTON" || tagName === "TEXTAREA") {
      return;
    }

    event.preventDefault();
    formRef.current?.requestSubmit();
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} onKeyDown={handleKeyDown} className={styles.form}>
      {error && <p className={styles.error}>{error}</p>}
      <label>
        Date
        <DateInput value={date} onChange={setDate} required />
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
        {onDelete && (
          <button type="button" className={styles.delete} onClick={onDelete}>
            {deleteLabel}
          </button>
        )}
        {onCancel && (
          <button type="button" className={styles.cancel} onClick={onCancel}>
            Cancel
          </button>
        )}
        <button type="submit" className={styles.submit}>
          {submitLabel}
        </button>
      </div>
    </form>
  );
}