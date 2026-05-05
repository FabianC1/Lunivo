'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import styles from './InsightCard.module.css';

export interface InsightCardProps {
  id: string;
  type: 'anomaly' | 'forecast' | 'opportunity' | 'milestone' | 'event-alert';
  message: string;
  priority: 'high' | 'medium' | 'low';
  metadata?: Record<string, any>;
  onDismiss?: (id: string) => void;
}

export default function InsightCard({
  id,
  type,
  message,
  priority,
  metadata,
  onDismiss,
}: InsightCardProps) {
  const router = useRouter();

  const getIcon = () => {
    switch (type) {
      case 'anomaly':
        return '⚠️';
      case 'forecast':
        return '📊';
      case 'opportunity':
        return '💡';
      case 'milestone':
        return '🎉';
      case 'event-alert':
        return '📅';
      default:
        return '📌';
    }
  };

  const getTypeLabel = () => {
    switch (type) {
      case 'anomaly':
        return 'Spending Alert';
      case 'forecast':
        return 'Forecast';
      case 'opportunity':
        return 'Opportunity';
      case 'milestone':
        return 'Milestone';
      case 'event-alert':
        return 'Event Alert';
      default:
        return 'Insight';
    }
  };

  const getActionLabel = () => {
    if (metadata?.goalId) return 'View Goal';
    if (metadata?.category) return 'View Category';
    return 'View More';
  };

  const handleAction = () => {
    if (metadata?.goalId) {
      router.push('/goals');
    } else if (metadata?.category) {
      router.push(`/transactions?category=${metadata.category}`);
    }
  };

  return (
    <div className={`${styles.card} ${styles[priority]}`}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <span className={styles.icon}>{getIcon()}</span>
          <span className={styles.type}>{getTypeLabel()}</span>
        </div>
        <button
          className={styles.dismissButton}
          onClick={() => onDismiss?.(id)}
          aria-label="Dismiss insight"
        >
          ✕
        </button>
      </div>

      <p className={styles.message}>{message}</p>

      {(metadata?.goalId || metadata?.category) && (
        <button
          className={styles.actionButton}
          onClick={handleAction}
        >
          {getActionLabel()} →
        </button>
      )}
    </div>
  );
}
