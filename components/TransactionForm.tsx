"use client";

import { useState } from "react";
import styles from "./TransactionForm.module.css";
import { formatDate } from "../lib/utils";

interface TransactionFormProps {
  initial?: {
    date: string;
    amount: number;
    category: string;
    description: string;
  };
  onSubmit: (data: {
    date: string;
    amount: number;
    category: string;
    description: string;
  }) => void;
}

export default function TransactionForm({ initial, onSubmit }: TransactionFormProps) {
  const [date, setDate] = useState(initial?.date || new Date().toISOString().substr(0, 10));
  const [amount, setAmount] = useState(initial?.amount || 0);
  const [category, setCategory] = useState(initial?.category || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!date || amount <= 0 || !category) {
      setError("Please fill in all required fields and use a positive amount.");
      return;
    }
    setError("");
    onSubmit({ date, amount, category, description });
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {error && <p className={styles.error}>{error}</p>}
      <label>
        Date
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
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
        Category
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          required
        >
          <option value="">Select</option>
          <option value="Income">Income</option>
          <option value="Food">Food</option>
          <option value="Transport">Transport</option>
          <option value="Utilities">Utilities</option>
          <option value="Other">Other</option>
        </select>
      </label>
      <label>
        Description
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>
      <button type="submit" className={styles.submit}>
        Save
      </button>
    </form>
  );
}