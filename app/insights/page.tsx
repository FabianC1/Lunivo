'use client';

import React, { useEffect, useState } from 'react';
import InsightCard from '@/components/InsightCard';
import styles from './insights.module.css';

interface Insight {
  _id: string;
  type: 'anomaly' | 'forecast' | 'opportunity' | 'milestone' | 'event-alert';
  message: string;
  priority: 'high' | 'medium' | 'low';
  metadata?: Record<string, any>;
  createdAt: string;
}

interface InsightsResponse {
  insights: Insight[];
  page: number;
  total: number;
  pages: number;
}

export default function InsightsPage() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [selectedType, setSelectedType] = useState<string | null>(null);

  useEffect(() => {
    fetchInsights();
  }, [page, selectedType]);

  const fetchInsights = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.append('page', page.toString());
      if (selectedType) params.append('type', selectedType);

      const response = await fetch(`/api/insights?${params}`, {
        method: 'GET',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch insights');
      }

      const data: InsightsResponse = await response.json();
      setInsights(data.insights);
      setTotal(data.total);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = async (insightId: string) => {
    try {
      const response = await fetch(`/api/insights/${insightId}/dismiss`, {
        method: 'PATCH',
      });

      if (response.ok) {
        setInsights(insights.filter(i => i._id !== insightId));
      }
    } catch (err) {
      console.error('Failed to dismiss insight:', err);
    }
  };

  const handleRefresh = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/insights', {
        method: 'POST',
      });

      if (response.ok) {
        await fetchInsights();
      }
    } catch (err) {
      console.error('Failed to refresh insights:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.container}>
      <div className={styles.header}>
        <h1>Your Insights</h1>
        <button
          className={styles.refreshButton}
          onClick={handleRefresh}
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <div className={styles.filters}>
        <button
          className={`${styles.filterTag} ${selectedType === null ? styles.active : ''}`}
          onClick={() => {
            setSelectedType(null);
            setPage(0);
          }}
        >
          All
        </button>
        <button
          className={`${styles.filterTag} ${selectedType === 'anomaly' ? styles.active : ''}`}
          onClick={() => {
            setSelectedType('anomaly');
            setPage(0);
          }}
        >
          Spending Alerts
        </button>
        <button
          className={`${styles.filterTag} ${selectedType === 'forecast' ? styles.active : ''}`}
          onClick={() => {
            setSelectedType('forecast');
            setPage(0);
          }}
        >
          Forecasts
        </button>
        <button
          className={`${styles.filterTag} ${selectedType === 'opportunity' ? styles.active : ''}`}
          onClick={() => {
            setSelectedType('opportunity');
            setPage(0);
          }}
        >
          Opportunities
        </button>
        <button
          className={`${styles.filterTag} ${selectedType === 'milestone' ? styles.active : ''}`}
          onClick={() => {
            setSelectedType('milestone');
            setPage(0);
          }}
        >
          Milestones
        </button>
      </div>

      {error && (
        <div className={styles.errorBox}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {loading && insights.length === 0 ? (
        <div className={styles.loading}>Loading insights...</div>
      ) : insights.length === 0 ? (
        <div className={styles.empty}>
          <p>No insights yet. Keep tracking your finances to get personalized insights!</p>
        </div>
      ) : (
        <>
          <div className={styles.grid}>
            {insights.map(insight => (
              <InsightCard
                key={insight._id}
                id={insight._id}
                type={insight.type}
                message={insight.message}
                priority={insight.priority}
                metadata={insight.metadata}
                onDismiss={handleDismiss}
              />
            ))}
          </div>

          {total > 20 && (
            <div className={styles.pagination}>
              <button
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </button>
              <span>
                Page {page + 1} of {Math.ceil(total / 20)}
              </span>
              <button
                disabled={page >= Math.ceil(total / 20) - 1}
                onClick={() => setPage(page + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </main>
  );
}
