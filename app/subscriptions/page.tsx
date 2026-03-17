import styles from "./subscriptions.module.css";

const tiers = [
  {
    name: "Starter",
    price: "£6",
    period: "/month",
    description: "Perfect for individuals starting to track spending.",
    features: [
      "Income & spending tracking",
      "Basic budget setup",
      "Monthly summary charts",
    ],
  },
  {
    name: "Growth",
    price: "£14",
    period: "/month",
    description: "For users who want deeper analytics and planning.",
    featured: true,
    features: [
      "Everything in Starter",
      "Advanced budget comparisons",
      "Detailed monthly reports",
      "Priority support",
    ],
  },
  {
    name: "Scale",
    price: "£29",
    period: "/month",
    description: "For power users and family/shared finance workflows.",
    features: [
      "Everything in Growth",
      "Multi-profile support",
      "CSV export",
      "Early access features",
    ],
  },
];

export default function SubscriptionsPage() {
  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <h1>Subscriptions</h1>
        <p>Choose a plan that fits your money goals. All plans are billed monthly in GBP.</p>
      </section>

      <section className={styles.grid}>
        {tiers.map((tier) => (
          <article
            key={tier.name}
            className={`${styles.card} ${tier.featured ? styles.cardFeatured : ""}`}
          >
            {tier.featured && <span className={styles.badge}>Most Popular</span>}
            <h2>{tier.name}</h2>
            <p className={styles.description}>{tier.description}</p>
            <div className={styles.priceRow}>
              <span className={styles.price}>{tier.price}</span>
              <span className={styles.period}>{tier.period}</span>
            </div>
            <ul className={styles.features}>
              {tier.features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
            <button type="button" className={styles.cta}>
              Choose {tier.name}
            </button>
          </article>
        ))}
      </section>
    </div>
  );
}
