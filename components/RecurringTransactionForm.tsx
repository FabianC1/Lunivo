'use client';

import React, { useState } from 'react';
import styles from './RecurringTransactionForm.module.css';

interface RecurringFormProps {
  onSubmit?: (data: any) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

export default function RecurringTransactionForm({
  onSubmit,
  onCancel,
  isLoading = false,
}: RecurringFormProps) {
  const [formData, setFormData] = useState({
    description: '',
    category: 'Other',
    amount: '',
    kind: 'expense' as 'income' | 'expense',
    frequency: 'monthly' as 'daily' | 'weekly' | 'monthly' | 'yearly',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
  });

  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.description.trim()) {
      setError('Description is required');
      return;
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setError('Amount must be greater than 0');
      return;
    }

    if (!formData.startDate) {
      setError('Start date is required');
      return;
    }

    try {
      const payload = {
        ...formData,
        amount: parseFloat(formData.amount),
      };

      await onSubmit?.(payload);
      setFormData({
        description: '',
        category: 'Other',
        amount: '',
        kind: 'expense',
        frequency: 'monthly',
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
      });
    } catch (err: any) {
      setError(err.message || 'Failed to save recurring transaction');
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.formGroup}>
        <label htmlFor="description">Description *</label>
        <input
          type="text"
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="e.g., Netflix Subscription"
          disabled={isLoading}
        />
      </div>

      <div className={styles.row}>
        <div className={styles.formGroup}>
          <label htmlFor="kind">Type *</label>
          <select
            id="kind"
            name="kind"
            value={formData.kind}
            onChange={handleChange}
            disabled={isLoading}
          >
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="amount">Amount *</label>
          <input
            type="number"
            id="amount"
            name="amount"
            value={formData.amount}
            onChange={handleChange}
            placeholder="0.00"
            step="0.01"
            min="0"
            disabled={isLoading}
          />
        </div>
      </div>

      <div className={styles.row}>
        <div className={styles.formGroup}>
          <label htmlFor="category">Category *</label>
          <select
            id="category"
            name="category"
            value={formData.category}
            onChange={handleChange}
            disabled={isLoading}
          >
            <option value="Other">Other</option>
            <option value="Food">Food</option>
            <option value="Transport">Transport</option>
            <option value="Entertainment">Entertainment</option>
            <option value="Utilities">Utilities</option>
            <option value="Subscriptions">Subscriptions</option>
            <option value="Health">Health</option>
            <option value="Insurance">Insurance</option>
          </select>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="frequency">Frequency *</label>
          <select
            id="frequency"
            name="frequency"
            value={formData.frequency}
            onChange={handleChange}
            disabled={isLoading}
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>
      </div>

      <div className={styles.row}>
        <div className={styles.formGroup}>
          <label htmlFor="startDate">Start Date *</label>
          <input
            type="date"
            id="startDate"
            name="startDate"
            value={formData.startDate}
            onChange={handleChange}
            disabled={isLoading}
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="endDate">End Date (Optional)</label>
          <input
            type="date"
            id="endDate"
            name="endDate"
            value={formData.endDate}
            onChange={handleChange}
            disabled={isLoading}
          />
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.actions}>
        <button
          type="submit"
          className={styles.submitButton}
          disabled={isLoading}
        >
          {isLoading ? 'Saving...' : 'Add Recurring'}
        </button>
        <button
          type="button"
          className={styles.cancelButton}
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
