"use client";

import { useState } from "react";
import styles from "../transactions/transactions.module.css";
import TransactionForm from "../../components/TransactionForm";
import { formatCurrency, formatDate } from "../../lib/utils";

interface Transaction {
  id: number;
  date: string;
  description: string;
  category: string;
  amount: number;
}

// re-use some dummy data from transactions but only incomes
const dummy: Transaction[] = [
  { id: 1, date: '2025-12-01', description: 'Salary', category: 'Income', amount: 3000 },
  { id: 2, date: '2025-12-15', description: 'Freelance', category: 'Income', amount: 750 },
];

export default function Income() {
  const [transactions, setTransactions] = useState<Transaction[]>(dummy);
  const [showForm, setShowForm] = useState(false);

  function addTransaction(data: Omit<Transaction, 'id' | 'category'>) {
    const next: Transaction = { id: Date.now(), category: 'Income', ...data };
    setTransactions((prev) => [...prev, next]);
    setShowForm(false);
  }

  return (
    <div className={styles.container + ' container'}>
      <h1 className={styles.title}>Income</h1>
      <button className={styles.addButton} onClick={() => setShowForm(true)}>
        + Add Income
      </button>
      {showForm && (
        <TransactionForm
          onSubmit={(data) => addTransaction(data)}
          initial={{ category: 'Income', date: '', amount: 0, description: '' }}
        />
      )}
      <div className={styles.listWrapper + ' card'}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Amount</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t) => (
              <tr key={t.id}>
                <td>{formatDate(t.date)}</td>
                <td>{t.description}</td>
                <td>{formatCurrency(t.amount)}</td>
                <td>
                  <button
                    className={styles.deleteButton}
                    onClick={() => setTransactions((prev) => prev.filter(x => x.id !== t.id))}
                    aria-label="Delete"
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
