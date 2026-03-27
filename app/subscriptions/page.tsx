import Link from "next/link";
import styles from "./subscriptions.module.css";
import { PAID_SUBSCRIPTION_TIERS, SUBSCRIPTION_COMPARISON_SECTIONS, formatPlanPrice } from "../../lib/subscriptions";

function renderValue(value: boolean | string) {
  if (typeof value === "boolean") {
    return value
      ? <span className={`${styles.featureValue} ${styles.featureValueYes}`}>✓</span>
      : <span className={`${styles.featureValue} ${styles.featureValueNo}`}>×</span>;
  }

  return <span className={styles.featureText}>{value}</span>;
}

export default function SubscriptionsPage() {
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
          <p>Each row below is written to be enforceable later, so the tiers describe specific access rather than vague marketing copy.</p>
        </div>

        <div className={styles.matrixBoard}>
          <div className={styles.matrixHeaderRow}>
            <div className={styles.matrixFeatureHeader}>
              <span className={styles.matrixFeatureHeaderTitle}>Feature Matrix</span>
              <span className={styles.matrixFeatureHeaderSubtitle}>Everything unlocked by each paid tier</span>
            </div>
            {PAID_SUBSCRIPTION_TIERS.map((plan) => (
              <div
                key={plan.slug}
                className={`${styles.planHeaderCard} ${plan.featured ? styles.planHeaderFeatured : ""}`}
              >
                {plan.featured ? <span className={styles.badge}>Most Popular</span> : null}
                <h3>{plan.name}</h3>
                <div className={styles.priceRow}>
                  <span className={styles.price}>{formatPlanPrice(plan.priceMonthly).replace('/month', '')}</span>
                  <span className={styles.period}>/month</span>
                </div>
                <p className={styles.audience}>{plan.audience}</p>
                <Link href={`/register?plan=${plan.slug}`} className={styles.cta}>
                  Choose {plan.name}
                </Link>
              </div>
            ))}
          </div>

          {SUBSCRIPTION_COMPARISON_SECTIONS.map((section) => (
            <div key={section.title} className={styles.matrixGroup}>
              <div className={styles.matrixGroupTitleRow}>
                <div className={styles.matrixGroupTitle}>{section.title}</div>
                {PAID_SUBSCRIPTION_TIERS.map((plan) => (
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
                  {PAID_SUBSCRIPTION_TIERS.map((plan) => (
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
          <li>You can start on Free and upgrade later.</li>
          <li>The table is intentionally specific so the app can later gate features by tier without rewriting the pricing structure.</li>
          <li>Plan selection is already passed into signup, and the next step would be persisting it on the user record.</li>
        </ul>
      </section>
    </div>
  );
}
