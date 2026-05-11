import Link from "next/link";
import styles from "./about.module.css";

const PILLARS = [
  {
    icon: "📊",
    title: "Budget Builder",
    desc: "Build your event budget across cost clusters — venue, catering, clothing, photography, entertainment, travel, and more. Every input updates your grand total in real time.",
  },
  {
    icon: "📈",
    title: "Affordability Engine",
    desc: "Enter your event date and budget. Lunivo calculates exactly how much you need to save each month. Advanced mode factors in your income and existing commitments.",
  },
  {
    icon: "🔁",
    title: "Scenario Planner",
    desc: "Create Budget, Standard, and Luxury versions of your event. Adjust guest count, venue tier, or date and see the financial impact instantly — before you commit.",
  },
  {
    icon: "🗓️",
    title: "Milestone Tracker",
    desc: "Add deposit deadlines and payment milestones. Mark them paid as you go and stay on top of every financial commitment leading up to your event.",
  },
];

const EVENTS = [
  { icon: "💍", label: "Weddings" },
  { icon: "✈️", label: "Holidays" },
  { icon: "🏠", label: "Home Purchase" },
  { icon: "🎓", label: "Education" },
  { icon: "🚗", label: "Vehicle" },
  { icon: "🛡️", label: "Emergency Fund" },
  { icon: "🎂", label: "Birthday" },
  { icon: "⭐", label: "Other goals" },
];

export default function AboutPage() {
  return (
    <div className={styles.page}>
      <div className={styles.heroWrap}>
      <section className={styles.hero}>
        <div className={styles.heroLeft}>
          <h1>About Lunivo</h1>
          <p>
            Lunivo is a life event financial planner. It helps you understand what your
            wedding, holiday, or major purchase will actually cost — and whether you can
            afford it — before you commit.
          </p>
          <p>
            Instead of tracking past spending, Lunivo focuses on the future: building
            savings timelines, simulating scenarios, and turning big life goals into
            financial plans you can actually follow.
          </p>
          <div className={styles.heroActions}>
            <Link href="/register" className={styles.primaryCta}>Start planning</Link>
            <Link href="/login" className={styles.secondaryCta}>Log in</Link>
          </div>
        </div>
        <div className={styles.heroRight}>
          <div className={styles.mockCard}>
            <div className={styles.mockCardTitle}>💍 Our Wedding</div>
            <div className={styles.mockCardRow}><span>Total budget</span><span className={styles.mockCardValue}>£21,450</span></div>
            <div className={styles.mockCardRow}><span>Already saved</span><span>£4,200</span></div>
            <div className={styles.mockCardRow}><span>Save per month</span><span className={styles.mockCardHighlight}>£650/mo</span></div>
            <div className={styles.mockCardRow}><span>Event date</span><span>June 2026</span></div>
            <div className={styles.mockCardBadge}>⚠️ Tight — review budget</div>
          </div>
        </div>
      </section>
      </div>

      <section className={styles.pillars}>
        <h2>What Lunivo does</h2>
        <div className={styles.pillarGrid}>
          {PILLARS.map((p) => (
            <div key={p.title} className={styles.pillarCard}>
              <span className={styles.pillarIcon}>{p.icon}</span>
              <h3>{p.title}</h3>
              <p>{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.events}>
        <h2>Plan any life event</h2>
        <p className={styles.eventsSubtitle}>One platform for every major financial goal.</p>
        <div className={styles.eventsGrid}>
          {EVENTS.map((e) => (
            <div key={e.label} className={styles.eventChip}>
              <span>{e.icon}</span>
              <span>{e.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.cta}>
        <h2>Know if you can afford it before you commit.</h2>
        <p>Start with one event for free. No credit card required.</p>
        <Link href="/register" className={styles.primaryCta}>Create your account</Link>
      </section>
    </div>
  );
}
