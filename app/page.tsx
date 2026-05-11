import Link from "next/link";
import styles from "./page.module.css";

const SCENARIO_DEMO = [
  { label: "Budget", guests: 60, total: 14000, monthly: 550, verdict: "✅ Affordable", cls: "green" },
  { label: "Standard", guests: 80, total: 18000, monthly: 750, verdict: "⚠️ Tight", cls: "amber" },
  { label: "Luxury", guests: 120, total: 32000, monthly: 1200, verdict: "❌ Not feasible", cls: "red" },
];

const FEATURES = [
  { icon: "📊", title: "Budget Builder", desc: "Build your wedding budget across 7 cost clusters — venue, catering, clothing, photography, entertainment, travel, and more. See your grand total update in real time.", side: "left", mockContent: "budget" },
  { icon: "📈", title: "Affordability Engine", desc: "Enter your event date and budget. Lunivo instantly calculates how much you need to save each month. Switch to advanced mode to factor in your income and existing commitments.", side: "right", mockContent: "affordability" },
  { icon: "🔁", title: "What-If Scenario Planner", desc: "Create multiple versions of your event — Budget, Standard, Luxury. Adjust guest count, venue tier, or date and see the financial impact instantly. Compare side by side before you commit.", side: "left", mockContent: "scenarios" },
];

const EVENT_TYPES = [
  { icon: "💍", label: "Wedding" }, { icon: "✈️", label: "Holiday" },
  { icon: "🏠", label: "Home Purchase" }, { icon: "🎓", label: "Education" },
  { icon: "🚗", label: "Vehicle" }, { icon: "🛡️", label: "Emergency Fund" },
  { icon: "🎂", label: "Birthday" }, { icon: "⭐", label: "Other" },
];

const DIFFERENTIATORS = [
  { them: "Other apps track costs", us: "Lunivo simulates outcomes" },
  { them: "Other apps inspire", us: "Lunivo informs" },
  { them: "Other apps show what you want", us: "Lunivo shows what you can afford" },
  { them: "Built for browsing", us: "Built for decisions" },
];

const PLANS = [
  { name: "Starter", price: "Free", desc: "Get started with one event.", features: ["1 event", "Budget builder", "Affordability calculator", "Milestone tracker", "Moodboard"], cta: "Start free", featured: false },
  { name: "Smart", price: "£8/month", desc: "For serious planners.", features: ["Up to 10 events", "Advanced affordability engine", "Savings timeline chart", "Scenario builder", "12 built-in themes"], cta: "Get Smart", featured: true },
  { name: "Pro", price: "£14/month", desc: "The full decision toolkit.", features: ["Unlimited events", "Scenario comparison table", "What-if controls", "Recommendation engine", "CSV export", "Custom themes"], cta: "Go Pro", featured: false },
];

function BudgetMock() {
  const items = [
    { icon: "🏛️", label: "Venue", value: "£8,500" },
    { icon: "🍽️", label: "Catering", value: "£6,200" },
    { icon: "📸", label: "Photography", value: "£2,800" },
    { icon: "👗", label: "Clothing", value: "£1,500" },
  ];
  return (
    <div className={styles.mock}>
      <div className={styles.mockTitle}>Budget Builder</div>
      {items.map((item) => (
        <div key={item.label} className={styles.mockRow}>
          <span>{item.icon} {item.label}</span>
          <span className={styles.mockValue}>{item.value}</span>
        </div>
      ))}
      <div className={styles.mockTotal}>
        <span>Grand total</span>
        <span className={styles.mockTotalValue}>£21,450</span>
      </div>
    </div>
  );
}

function AffordabilityMock() {
  return (
    <div className={styles.mock}>
      <div className={styles.mockTitle}>Affordability Engine</div>
      <div className={styles.mockAffordMain}>
        <span className={styles.mockAffordAmount}>£650</span>
        <span className={styles.mockAffordLabel}>required per month</span>
      </div>
      <div className={`${styles.mockBadge} ${styles.amber}`}>⚠️ Tight — review budget</div>
      <div className={styles.mockAffordDetails}>
        <div className={styles.mockRow}><span>Total needed</span><span>£18,000</span></div>
        <div className={styles.mockRow}><span>Already saved</span><span>£4,200</span></div>
        <div className={styles.mockRow}><span>Months remaining</span><span>21</span></div>
      </div>
    </div>
  );
}

function ScenariosMock() {
  return (
    <div className={styles.mock}>
      <div className={styles.mockTitle}>Scenario Comparison</div>
      <table className={styles.mockTable}>
        <thead><tr><th>Scenario</th><th>Cost</th><th>Save/mo</th><th></th></tr></thead>
        <tbody>
          <tr><td>Budget</td><td>£14k</td><td>£550</td><td><span className={`${styles.mockBadge} ${styles.green}`}>✅</span></td></tr>
          <tr><td>Standard</td><td>£18k</td><td>£750</td><td><span className={`${styles.mockBadge} ${styles.amber}`}>⚠️</span></td></tr>
          <tr><td>Luxury</td><td>£32k</td><td>£1,200</td><td><span className={`${styles.mockBadge} ${styles.red}`}>❌</span></td></tr>
        </tbody>
      </table>
    </div>
  );
}

export default function HomePage() {
  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroGlow} />
        <div className={styles.heroContent}>
          <div className={styles.heroBadge}>Life Event Financial Planner</div>
          <h1 className={styles.heroHeadline}>Can you actually afford<br />your wedding?</h1>
          <p className={styles.heroSubheadline}>See your future clearly before you commit.</p>
          <div className={styles.heroCtas}>
            <Link href="/register" className={styles.heroPrimary}>Plan My Wedding</Link>
            <a href="#how-it-works" className={styles.heroSecondary}>See How It Works</a>
          </div>
          <p className={styles.heroSocial}>Join thousands planning smarter</p>
        </div>
      </section>

      <section className={styles.problem}>
        <div className={styles.sectionInner}>
          <h2 className={styles.sectionTitle}>Most people commit before they understand the real cost.</h2>
          <div className={styles.painGrid}>
            {[
              { icon: "📉", text: "Budgets are always underestimated" },
              { icon: "👥", text: "Guest count silently doubles costs" },
              { icon: "📋", text: "Spreadsheets can't show long-term affordability" },
              { icon: "💸", text: "People commit emotionally before planning financially" },
            ].map(({ icon, text }) => (
              <div key={text} className={styles.painCard}>
                <span className={styles.painIcon}>{icon}</span>
                <p>{text}</p>
              </div>
            ))}
          </div>
          <p className={styles.problemClose}>So people commit before they understand the real financial impact. <strong>Lunivo fixes this.</strong></p>
        </div>
      </section>

      <section className={styles.features} id="how-it-works">
        <div className={styles.sectionInner}>
          <h2 className={styles.sectionTitle}>Lunivo shows you the full picture.</h2>
          <div className={styles.featureList}>
            {FEATURES.map((f) => (
              <div key={f.title} className={`${styles.featureRow} ${f.side === "right" ? styles.featureRowReverse : ""}`}>
                <div className={styles.featureCopy}>
                  <span className={styles.featureIcon}>{f.icon}</span>
                  <h3 className={styles.featureTitle}>{f.title}</h3>
                  <p className={styles.featureDesc}>{f.desc}</p>
                </div>
                <div className={styles.featureMock}>
                  {f.mockContent === "budget" && <BudgetMock />}
                  {f.mockContent === "affordability" && <AffordabilityMock />}
                  {f.mockContent === "scenarios" && <ScenariosMock />}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.eventTypes}>
        <div className={styles.sectionInner}>
          <h2 className={styles.sectionTitle}>Not just weddings.</h2>
          <p className={styles.sectionSubtitle}>One platform for every major life moment.</p>
          <div className={styles.eventTypeGrid}>
            {EVENT_TYPES.map(({ icon, label }) => (
              <div key={label} className={styles.eventTypeCard}>
                <span className={styles.eventTypeIcon}>{icon}</span>
                <span className={styles.eventTypeLabel}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.demo}>
        <div className={styles.sectionInner}>
          <h2 className={styles.demoTitle}>See it in action.</h2>
          <p className={styles.demoSubtitle}>Which version of your wedding can you actually afford?</p>
          <div className={styles.demoCards}>
            {SCENARIO_DEMO.map((s) => (
              <div key={s.label} className={styles.demoCard}>
                <div className={styles.demoCardHeader}>
                  <span className={styles.demoScenarioLabel}>{s.label}</span>
                  <span className={`${styles.demoVerdict} ${styles[s.cls]}`}>{s.verdict}</span>
                </div>
                <div className={styles.demoStats}>
                  <div className={styles.demoStat}><span className={styles.demoStatLabel}>Guests</span><span className={styles.demoStatValue}>{s.guests}</span></div>
                  <div className={styles.demoStat}><span className={styles.demoStatLabel}>Total cost</span><span className={styles.demoStatValue}>£{s.total.toLocaleString()}</span></div>
                  <div className={styles.demoStat}><span className={styles.demoStatLabel}>Save/month</span><span className={styles.demoStatValue}>£{s.monthly}/mo</span></div>
                </div>
              </div>
            ))}
          </div>
          <p className={styles.demoCaption}>Lunivo tells you which scenario fits your financial reality — before you commit.</p>
        </div>
      </section>

      <section className={styles.diff}>
        <div className={styles.sectionInner}>
          <h2 className={styles.sectionTitle}>This isn't a wedding planner. It's a decision tool.</h2>
          <div className={styles.diffGrid}>
            {DIFFERENTIATORS.map((d) => (
              <div key={d.us} className={styles.diffCard}>
                <p className={styles.diffThem}>{d.them}</p>
                <div className={styles.diffArrow}>→</div>
                <p className={styles.diffUs}>{d.us}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.pricing} id="pricing">
        <div className={styles.sectionInner}>
          <h2 className={styles.sectionTitle}>Simple, honest pricing.</h2>
          <div className={styles.planGrid}>
            {PLANS.map((plan) => (
              <div key={plan.name} className={`${styles.planCard} ${plan.featured ? styles.planFeatured : ""}`}>
                {plan.featured && <div className={styles.planBadge}>Most Popular</div>}
                <h3 className={styles.planName}>{plan.name}</h3>
                <div className={styles.planPrice}>{plan.price}</div>
                <p className={styles.planDesc}>{plan.desc}</p>
                <ul className={styles.planFeatures}>
                  {plan.features.map((f) => <li key={f}><span className={styles.planCheck}>✓</span>{f}</li>)}
                </ul>
                <Link href="/register" className={`${styles.planCta} ${plan.featured ? styles.planCtaFeatured : ""}`}>{plan.cta}</Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.finalCta}>
        <div className={styles.finalGlow} />
        <div className={styles.finalContent}>
          <h2 className={styles.finalTitle}>Start planning with clarity, not guesswork.</h2>
          <div className={styles.finalBtns}>
            <Link href="/register" className={styles.heroPrimary}>Plan Your Wedding</Link>
            <Link href="/register" className={styles.heroSecondary}>Create First Scenario</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
