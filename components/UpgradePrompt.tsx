'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import styles from './UpgradePrompt.module.css';

interface UpgradePromptProps {
  title: string;
  description: string;
  feature: string;
  currentPlan: string;
  minimumPlan: 'sync' | 'scale';
}

export default function UpgradePrompt({
  title,
  description,
  feature,
  currentPlan,
  minimumPlan,
}: UpgradePromptProps) {
  const router = useRouter();

  const getPlanPrice = () => {
    if (minimumPlan === 'sync') {
      return '£8/month';
    }
    return '£14/month';
  };

  const getPlanName = () => {
    if (minimumPlan === 'sync') {
      return 'Smart';
    }
    return 'Pro';
  };

  const handleUpgrade = () => {
    router.push('/subscriptions');
  };

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.icon}>✨</div>
        <h3>{title}</h3>
        <p>{description}</p>
        <p className={styles.hint}>
          Unlock {feature} and more features with a {getPlanName()} plan.
        </p>
      </div>

      <div className={styles.pricing}>
        <span className={styles.price}>{getPlanPrice()}</span>
        <p className={styles.subtext}>Upgrade now</p>
      </div>

      <button className={styles.upgradeButton} onClick={handleUpgrade}>
        Upgrade to {getPlanName()}
      </button>
    </div>
  );
}
