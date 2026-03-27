import Link from "next/link";
import styles from "./subscriptions.module.css";
import { FREE_PLAN, PAID_SUBSCRIPTION_TIERS, formatPlanPrice } from "../../lib/subscriptions";

export default function SubscriptionsPage() {
  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <span className={styles.eyebrow}>Pricing</span>
        <h1>Subscriptions</h1>
        <p>Choose a plan that fits your money goals. Start free, then move up when you want deeper planning and reporting.</p>
        <div className={styles.heroMeta}>
          <span>All paid plans billed monthly in GBP</span>
          <span>No hidden fees</span>
          <span>Upgrade whenever you want</span>
        </div>
      </section>

      <section className={styles.freePlan}>
        <div>
          <p className={styles.freePlanLabel}>Current entry point</p>
          <h2>{FREE_PLAN.name}</h2>
          <p>{FREE_PLAN.description}</p>
        </div>
        <div className={styles.freePlanPrice}>{formatPlanPrice(FREE_PLAN.priceMonthly)}</div>
      </section>

      <section className={styles.grid}>
        {PAID_SUBSCRIPTION_TIERS.map((tier) => (
          <article
            key={tier.slug}
            className={`${styles.card} ${tier.featured ? styles.cardFeatured : ""}`}
          >
            {tier.featured && <span className={styles.badge}>Most Popular</span>}
            <h2>{tier.name}</h2>
            <p className={styles.audience}>{tier.audience}</p>
            <p className={styles.description}>{tier.description}</p>
            <div className={styles.priceRow}>
              <span className={styles.price}>GBP {tier.priceMonthly}</span>
              <span className={styles.period}>/month</span>
            </div>
            <ul className={styles.features}>
              {tier.features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
            <Link
              href={`/register?plan=${tier.slug}`}
              className={styles.cta}
            >
              Choose {tier.name}
            </Link>
          </article>
        ))}
      </section>

      <section className={styles.notes}>
        <h3>What happens next?</h3>
        <ul>
          <li>You can start on Free and upgrade later.</li>
          <li>Plan selection is captured during signup so the billing flow can be connected later.</li>
          <li>Profile billing shows the current placeholder plan state until paid billing is wired up.</li>
        </ul>
      </section>
    </div>
  );
}
