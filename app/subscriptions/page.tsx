import Link from "next/link";
import styles from "./subscriptions.module.css";
import { ALL_SUBSCRIPTION_PLANS, SUBSCRIPTION_COMPARISON_SECTIONS, formatPlanPrice } from "../../lib/subscriptions";

function renderValue(value: boolean | string) {
  if (typeof value === "boolean") {
    return value
      ? <span className={`${styles.featureValue} ${styles.featureValueYes}`}>✓</span>
      : <span className={`${styles.featureValue} ${styles.featureValueNo}`}>×</span>;
  }

  return <span className={styles.featureText}>{value}</span>;
}

export default function SubscriptionsPage() {
  const visiblePlans = ALL_SUBSCRIPTION_PLANS;

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <span className={styles.eyebrow}>Pricing</span>
        <h1>Subscriptions</h1>
        <p>Choose the tier that matches how deeply you want to plan, review, and personalize your finance workflow.</p>
        <div className={styles.heroMeta}>
          <span>All paid plans billed monthly</span>
          <span>No hidden fees</span>
          <span>Upgrade whenever you want</span>
        </div>
      </section>

      <section className={styles.matrixSection}>
        <div className={styles.sectionIntro}>
          <h2>Plan comparison</h2>
          <p>Each row below is designed to describe what changes between manual tracking, automatic bank sync, and the full premium workspace.</p>
        </div>

        <div className={styles.matrixBoard}>
          <div className={styles.matrixHeaderRow}>
            <div className={styles.matrixFeatureHeader}>
              <span className={styles.matrixFeatureHeaderTitle}>Feature Matrix</span>
              <span className={styles.matrixFeatureHeaderSubtitle}>How Starter, Smart, and Pro change the product experience</span>
            </div>
            {visiblePlans.map((plan) => (
              <div
                key={plan.slug}
                className={`${styles.planHeaderCard} ${plan.featured ? styles.planHeaderFeatured : ""}`}
              >
                {plan.featured ? <span className={styles.badge}>Most Popular</span> : null}
                {plan.slug === "free" || plan.slug === "scale" ? (
                  <div className={styles.edgeHeaderBlock}>
                    <h3>{plan.name}</h3>
                  </div>
                ) : (
                  <h3>{plan.name}</h3>
                )}
                <div className={styles.priceRow}>
                  <span className={styles.price}>{plan.priceMonthly === 0 ? "GBP 0" : formatPlanPrice(plan.priceMonthly).replace('/month', '')}</span>
                  <span className={styles.period}>/month</span>
                </div>
                <p className={styles.audience}>{plan.audience}</p>
                {plan.slug === "free" ? (
                  <div className={styles.includedLabel}>Included for every account</div>
                ) : (
                  <Link href={`/register?plan=${plan.slug}`} className={styles.cta}>
                    Choose {plan.name}
                  </Link>
                )}
              </div>
            ))}
          </div>

          {SUBSCRIPTION_COMPARISON_SECTIONS.map((section) => (
            <div key={section.title} className={styles.matrixGroup}>
              <div className={styles.matrixGroupTitleRow}>
                <div className={styles.matrixGroupTitle}>{section.title}</div>
                {visiblePlans.map((plan) => (
                  <div
                    key={`${section.title}-${plan.slug}-title`}
                    className={`${styles.matrixGroupTitleSpacer} ${plan.featured ? styles.matrixGroupTitleSpacerFeatured : ""}`}
                  />
                ))}
              </div>
              {section.rows.map((row) => (
                <div key={`${section.title}-${row.label}`} className={styles.matrixDataRow}>
                  <div className={styles.featureCell}>
                    <strong>{row.label}</strong>
                    <p>{row.description}</p>
                  </div>
                  {visiblePlans.map((plan) => (
                    <div
                      key={`${row.label}-${plan.slug}`}
                      className={`${styles.valueCell} ${plan.featured ? styles.valueCellFeatured : ""}`}
                    >
                      {renderValue(row.values[plan.slug])}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>

      <section className={styles.notes}>
        <h3>What happens next?</h3>
        <ul>
          <li>You can start on Starter and upgrade later.</li>
          <li>Starter is built for manual entry, Smart adds synced tracking with forecasting and breakdown views, and Pro adds CSV exports plus category and tagging controls.</li>
          <li>Plan selection is already passed into signup, and the next step would be persisting it on the user record.</li>
        </ul>
      </section>
    </div>
  );
}
