"use client";

import Link from "next/link";
import styles from "./SubscriptionGate.module.css";
import {
  getMinimumPlanForFeature,
  getSubscriptionPlanBySlug,
  normalizePlanSlug,
  type SubscriptionFeatureKey,
  type SubscriptionPlanSlug,
} from "../lib/subscriptions";

type SubscriptionGateProps = {
  currentPlanSlug?: string | null;
  feature: SubscriptionFeatureKey;
  title: string;
  description: string;
};

export default function SubscriptionGate({
  currentPlanSlug,
  feature,
  title,
  description,
}: SubscriptionGateProps) {
  const normalizedCurrentPlan = normalizePlanSlug(currentPlanSlug);
  const requiredPlanSlug = getMinimumPlanForFeature(feature);
  const currentPlan = getSubscriptionPlanBySlug(normalizedCurrentPlan);
  const requiredPlan = getSubscriptionPlanBySlug(requiredPlanSlug);

  return (
    <section className={styles.gate}>
      <span className={styles.eyebrow}>Upgrade required</span>
      <div>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.description}>{description}</p>
      </div>
      <div className={styles.meta}>
        <span className={styles.pill}>Current plan: {currentPlan?.name ?? "Free"}</span>
        <span className={styles.pill}>Required plan: {requiredPlan?.name ?? requiredPlanSlug}</span>
      </div>
      <div className={styles.actions}>
        <Link href="/subscriptions" className={styles.primary}>
          Compare plans
        </Link>
        <Link href="/profile?tab=billing" className={styles.secondary}>
          Open billing
        </Link>
      </div>
    </section>
  );
}