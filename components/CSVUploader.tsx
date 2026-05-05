'use client';

import React, { useState, useRef } from 'react';
import styles from './CSVUploader.module.css';

interface ImportResult {
  imported: number;
  duplicates: number;
  errors: string[];
  totalRows: number;
}

interface CSVUploaderProps {
  onSuccess?: (result: ImportResult) => void;
  onError?: (error: string) => void;
}

export default function CSVUploader({ onSuccess, onError }: CSVUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const processFile = async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      const error = 'Please select a CSV file';
      onError?.(error);
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/import/csv', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Import failed');
      }

      const importResult: ImportResult = await response.json();
      setResult(importResult);
      onSuccess?.(importResult);
    } catch (error: any) {
      const message = error.message || 'Failed to import CSV';
      onError?.(message);
      setResult(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div
        className={`${styles.dropZone} ${isDragging ? styles.dragging : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
        <div className={styles.content}>
          <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <h3>Drag your CSV file here</h3>
          <p>or click to select</p>
          {isLoading && <p className={styles.loading}>Importing...</p>}
        </div>
      </div>

      {result && (
        <div className={styles.results}>
          <div className={styles.resultItem}>
            <span className={styles.label}>Total Rows:</span>
            <span>{result.totalRows}</span>
          </div>
          <div className={`${styles.resultItem} ${styles.success}`}>
            <span className={styles.label}>Imported:</span>
            <span>{result.imported}</span>
          </div>
          {result.duplicates > 0 && (
            <div className={`${styles.resultItem} ${styles.warning}`}>
              <span className={styles.label}>Duplicates:</span>
              <span>{result.duplicates}</span>
            </div>
          )}
          {result.errors.length > 0 && (
            <div className={`${styles.resultItem} ${styles.error}`}>
              <span className={styles.label}>Errors:</span>
              <ul className={styles.errorList}>
                {result.errors.slice(0, 5).map((error, idx) => (
                  <li key={idx}>{error}</li>
                ))}
                {result.errors.length > 5 && <li>... and {result.errors.length - 5} more</li>}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
