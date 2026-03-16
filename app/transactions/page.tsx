"use client";

import { useState } from "react";
import styles from "./transactions.module.css";
import TransactionForm from "../../components/TransactionForm";
import { formatCurrency, formatDate } from "../../lib/utils";

interface Transaction {
  id: number;
  date: string;
  description: string;
  category: string;
  amount: number;
}

const dummy: Transaction[] = [
  { id: 1, date: '2025-12-01', description: 'Groceries', category: 'Food', amount: 45.2 },
  { id: 2, date: '2025-12-03', description: 'Bus fare', category: 'Transport', amount: 3.5 },
  { id: 3, date: '2025-12-05', description: 'Electricity bill', category: 'Utilities', amount: 120 },
];

export default function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>(dummy);
  const [showForm, setShowForm] = useState(false);

  function addTransaction(data: Omit<Transaction, 'id'>) {
    const next: Transaction = { id: Date.now(), ...data };
    setTransactions((prev) => [...prev, next]);
    setShowForm(false);
  }

  return (
    <div className={styles.container + ' container'}>
      <h1 className={styles.title}>Transactions</h1>
      <button className={styles.addButton} onClick={() => setShowForm(true)}>
        + Add Transaction
      </button>
      {showForm && (
        <TransactionForm
          onSubmit={addTransaction}
          onCancel={() => setShowForm(false)}
        />
      )}
      <div className={styles.listWrapper + ' card'}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Category</th>
              <th>Amount</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t) => (
              <tr key={t.id}>
                <td>{formatDate(t.date)}</td>
                <td>{t.description}</td>
                <td>{t.category}</td>
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