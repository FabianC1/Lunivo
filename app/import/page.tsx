'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import CSVUploader from '@/components/CSVUploader';
import styles from './import.module.css';

interface ImportResult {
  imported: number;
  duplicates: number;
  errors: string[];
  totalRows: number;
}

export default function ImportPage() {
  const router = useRouter();
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSuccess = (importResult: ImportResult) => {
    setResult(importResult);
    setError(null);
  };

  const handleError = (errorMsg: string) => {
    setError(errorMsg);
    setResult(null);
  };

  return (
    <main className={styles.container}>
      <div className={styles.content}>
        <h1>Import Transactions</h1>
        <p className={styles.description}>
          Upload a CSV file to import transactions. Your file should have columns: date, description, amount, type (income/expense), category, and optional note.
        </p>

        <div className={styles.section}>
          <h2>CSV Format</h2>
          <div className={styles.csvFormat}>
            <code>date,description,amount,type,category,note</code>
            <div className={styles.example}>
              <code>
                2024-01-15,Coffee,5.50,expense,Food,Morning coffee
                <br />
                2024-01-15,Salary,3000,income,Salary,Monthly salary
              </code>
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <CSVUploader onSuccess={handleSuccess} onError={handleError} />
        </div>

        {error && (
          <div className={styles.errorBox}>
            <strong>Error:</strong> {error}
          </div>
        )}

        {result && (
          <div className={styles.successBox}>
            <h3>Import Complete!</h3>
            <p>Successfully imported <strong>{result.imported}</strong> transactions</p>
            {result.duplicates > 0 && (
              <p>Skipped <strong>{result.duplicates}</strong> duplicate transactions</p>
            )}
            {result.errors.length > 0 && (
              <p>Encountered <strong>{result.errors.length}</strong> errors</p>
            )}
            <div className={styles.actions}>
              <button
                onClick={() => router.push('/transactions')}
                className={styles.button}
              >
                View Imported Transactions
              </button>
              <button
                onClick={() => {
                  setResult(null);
                  setError(null);
                }}
                className={`${styles.button} ${styles.secondary}`}
              >
                Import More
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
