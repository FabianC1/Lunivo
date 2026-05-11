# Lunivo — Life Event Financial Planner: Full Pivot Spec

## Problem Statement

Lunivo currently positions itself as a personal finance tracker (income, spending, budgets, transactions). This pivot replaces that entirely with a **Life Event Financial Planner** — a decision simulator that answers "Can I afford this, and how do I get there?" before users commit to major life events.

The flagship use case is **wedding planning**, with holiday and other life events as secondary templates. The core value proposition is not tracking past spending — it is simulating future affordability.

---

## What Gets Removed

The following pages, routes, and components are **deleted entirely**:

- `app/dashboard/` — replaced with new Event Dashboard
- `app/income/`
- `app/spendings/`
- `app/transactions/`
- `app/budgets/`
- `app/reports/`
- `app/api/transactions/`
- `app/api/budgets/`
- `app/api/reports/`
- `models/Transaction.ts`
- `models/Budget.ts`
- Navbar links: Dashboard (old), Income, Spendings, Budgets, Transactions, Reports

---

## What Gets Built

### 1. New Data Model — `Event`

Replace `Transaction` and `Budget` models with a new `Event` model stored in MongoDB.

```ts
interface IEvent {
  userId: ObjectId;
  name: string;           // e.g. "Our Wedding"
  type: EventType;        // Wedding | Holiday | Home | Education | Vehicle | Emergency Fund | Birthday | Other
  eventDate: string;      // ISO date
  guestCount?: number;
  locationTier?: 'budget' | 'local' | 'destination' | 'luxury';
  currentSavings: number; // amount already saved toward this event
  monthlyIncome?: number; // for advanced affordability mode
  budgetTarget: number;
  contingencyPercent: number;
  costs: Record<string, number>; // cost cluster key → amount
  milestones: Milestone[];
  scenarios: Scenario[];
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Milestone {
  id: string;
  label: string;
  date: string;
  amount: number;
  paid: boolean;
}

interface Scenario {
  id: string;
  name: string;           // e.g. "Budget Wedding"
  guestCount: number;
  locationTier: string;
  costs: Record<string, number>;
  contingencyPercent: number;
  budgetTarget: number;
  createdAt: string;
}
```

### 2. API Routes

| Route | Method | Purpose |
|---|---|---|
| `GET /api/events` | GET | List all events for authenticated user |
| `POST /api/events` | POST | Create new event |
| `GET /api/events/[id]` | GET | Get single event |
| `PUT /api/events/[id]` | PUT | Update event |
| `DELETE /api/events/[id]` | DELETE | Delete event |
| `POST /api/events/[id]/scenarios` | POST | Add scenario to event |
| `PUT /api/events/[id]/scenarios/[scenarioId]` | PUT | Update scenario |
| `DELETE /api/events/[id]/scenarios/[scenarioId]` | DELETE | Delete scenario |

Plan limits enforced server-side:
- Free: max 1 event, no scenarios
- Smart: max 10 events, scenarios enabled
- Pro: unlimited events, scenarios, exports

---

### 3. New Navbar

Replace current navbar with:
- **Dashboard** → `/dashboard`
- **My Events** → `/events`
- **Plans & Pricing** → `/subscriptions`
- **Profile** → `/profile`

---

### 4. New Dashboard (`/dashboard`)

Completely new page. Replaces the financial tracking dashboard.

**Layout:**
- Hero prompt: "What are you planning?" with a large "Create Event" CTA button
- If user has existing events: show event cards below the hero (name, type, event date, % funded, monthly savings required)
- Each event card links to `/events/[id]`
- Empty state: illustration + "Start by creating your first event"

**Plan gating:**
- Free users see their 1 event + upgrade prompt if they try to create a second
- Smart/Pro users see all events in a grid

---

### 5. My Events Page (`/events`)

List view of all user events.

- Grid of event cards (same as dashboard)
- "New Event" button (gated by plan)
- Each card shows: event name, type icon, date, total budget, % funded, monthly savings needed
- Click → goes to `/events/[id]`

---

### 6. Event Detail Page (`/events/[id]`)

The core workspace. Four tab views:

#### Tab 1: Overview
- Event name, type, date, guest count, location tier
- Countdown: "X months and Y days until [event name]"
- Key stats: Total budget, Already saved, Remaining, Monthly savings required
- Milestone list (user-defined): label, date, amount, paid/unpaid toggle
- "Add milestone" form
- Notes field

#### Tab 2: Budget
- Cost clusters (same 5 as existing events page: core, people, experience, logistics, buffer)
- Each cluster: editable line items, subtotal
- Contingency % slider
- Live totals: subtotal, contingency amount, grand total, cost per guest (if applicable)
- Budget target input
- Budget gap indicator (over/under)

#### Tab 3: Affordability Engine
Two modes toggled by user:

**Simple mode:**
- Inputs: Event date, Total cost, Already saved
- Output: Required monthly savings = (total cost − already saved) ÷ months until event
- Visual: savings curve line chart (months on x-axis, cumulative savings on y-axis, target line)
- Status badge: ✅ Affordable / ⚠️ Tight / ❌ Not affordable (based on whether required monthly savings is reasonable — threshold configurable)

**Advanced mode** (adds):
- Input: Monthly income, Existing monthly commitments
- Output: Disposable income available for saving, affordability gap, recommended adjustments
- Recommendations panel: "Reducing guest count by 20 saves ~£X", "Moving date 6 months reduces monthly savings by Y%"

#### Tab 4: Scenarios *(Smart plan+)*
- List of saved scenarios for this event
- "Create Scenario" button — clones current budget with a name
- Each scenario card shows: name, total cost, monthly savings required, feasibility badge
- **Comparison table** (Pro plan):

| Scenario | Total Cost | Monthly Savings | Feasible? |
|---|---|---|---|
| Luxury | £32,000 | £1,200/mo | ❌ |
| Standard | £18,000 | £650/mo | ⚠️ |
| Budget | £12,000 | £400/mo | ✅ |

- **What-If controls** (Pro plan): sliders/inputs for guest count, venue tier, catering cost per head, event date — all update scenario totals and affordability in real time
- **Recommendation engine** (Pro plan): after comparison, surface top 3 cost-saving suggestions

---

### 7. Create Event Flow

Route: `/events/new`

Step-by-step form:
1. Event type selection (8 tiles with icons)
2. Event name + date + guest count (if applicable) + location tier
3. Budget target (optional — can set later)
4. Redirect to `/events/[id]` on creation

---

### 8. Subscription Tier Restructure

Replace current `free / sync / scale` slugs with `free / smart / pro`.

| Feature | Free | Smart | Pro |
|---|---|---|---|
| Events | 1 | 10 | Unlimited |
| Budget builder | ✅ | ✅ | ✅ |
| Affordability engine (simple) | ✅ | ✅ | ✅ |
| Affordability engine (advanced) | ❌ | ✅ | ✅ |
| Savings timeline chart | ❌ | ✅ | ✅ |
| Scenarios | ❌ | ✅ | ✅ |
| Scenario comparison table | ❌ | ❌ | ✅ |
| What-if controls | ❌ | ❌ | ✅ |
| Recommendation engine | ❌ | ❌ | ✅ |
| CSV / Excel export | ❌ | ❌ | ✅ |
| Custom themes | ❌ | ❌ | ✅ |
| Moodboard / visuals tab | ✅ | ✅ | ✅ |
| Milestones | ✅ | ✅ | ✅ |

Pricing: Free £0 / Smart £8/mo / Pro £14/mo (update copy to match new positioning).

Update `lib/subscriptions.ts` feature keys and plan slugs accordingly.

---

### 9. New Landing Page (`/`)

Full redesign inspired by Zola/The Knot: full-width sections, large typography, generous whitespace, emotional-first copy. Uses the existing CSS variable theme system so it respects the active theme.

#### Public Navbar (unauthenticated)
- Logo (left) + links: "How it works" · "Pricing" + right side: "Log in" · "Get Started" (primary CTA button)
- Sticky, transparent over hero, solid background on scroll
- Implemented in `PublicNavbar.tsx` (update existing component)

#### Section 1 — Hero (full-viewport)
- **Background:** dark cinematic gradient (`#0a0a0f` → deep navy/purple), subtle radial glow behind headline
- **Headline (large, glowing):** "Can you actually afford your wedding?"
- **Subheadline:** "Lunivo turns life's biggest moments into a financial plan you can actually follow."
- **CTAs:** "Plan My Wedding" (primary, gradient button) + "See How It Works" (ghost button, scrolls to features)
- **Below CTAs:** small social-proof line — "Join thousands planning smarter"
- **Bottom of hero:** soft fade into next section

#### Section 2 — Problem (full-width, light background)
- Title: "Most people commit before they understand the real cost."
- 4 pain-point tiles in a 2×2 grid with icons:
  1. Budgets are always underestimated
  2. Guest count silently doubles costs
  3. Spreadsheets can't show long-term affordability
  4. People commit emotionally before planning financially
- Closing statement: "Lunivo fixes this."

#### Section 3 — Feature showcase (alternating image+text, Zola-style)
Three alternating rows, each full-width with a mock UI panel on one side and copy on the other:

**Row 1 — Budget Builder** (image left, text right)
- Mock: styled cost cluster card showing venue/catering/photography with live total
- Copy: "Build your wedding budget in minutes." + "Every cost cluster updates your total in real time."

**Row 2 — Affordability Engine** (text left, image right)
- Mock: savings curve chart + "£650/month required" badge
- Copy: "Know exactly what you need to save." + "Simple or advanced mode — factor in your income, existing savings, and timeline."

**Row 3 — Scenario Planner** (image left, text right)
- Mock: 3-column comparison table (Budget / Standard / Luxury)
- Copy: "Compare versions of your wedding before you commit." + "Change guest count, venue tier, or date — see the financial impact instantly."

#### Section 4 — Event types (full-width grid)
- Title: "Not just weddings."
- 8 event type tiles in a responsive grid with icon + name:
  Wedding · Holiday · Home Purchase · Education · Vehicle · Emergency Fund · Birthday · Other
- Subtext: "One platform for every major life moment."

#### Section 5 — Live scenario demo (dark background, high-impact)
- Title: "See it in action."
- 3 scenario cards side by side (hardcoded, no real data):

| | Budget | Standard | Luxury |
|---|---|---|---|
| Guests | 60 | 80 | 120 |
| Total cost | £14,000 | £18,000 | £32,000 |
| Monthly savings | £550/mo | £750/mo | £1,200/mo |
| Verdict | ✅ Affordable | ⚠️ Tight | ❌ Not feasible |

- Below cards: "Which version of your wedding can you actually afford? Lunivo tells you."

#### Section 6 — Differentiator (full-width, centered)
- Title: "This isn't a wedding planner. It's a decision tool."
- 4 differentiator pills/cards:
  1. Other apps track costs → Lunivo simulates outcomes
  2. Other apps inspire → Lunivo informs
  3. Other apps show what you want → Lunivo shows what you can afford
  4. Built for decisions, not just dreams

#### Section 7 — Pricing (3 plan cards)
- Free · Smart (£8/mo, "Most Popular" badge) · Pro (£14/mo)
- Each card: plan name, price, 4–5 key features, CTA button
- Consistent with `lib/subscriptions.ts` plan definitions

#### Section 8 — Final CTA (full-viewport, dark cinematic — mirrors hero)
- Headline: "Start planning with clarity, not guesswork."
- Two buttons: "Plan Your Wedding" (→ /register) · "Create First Scenario" (→ /register)
- Subtle animated gradient background

#### CSS approach
- New `app/page.module.css` — full rewrite, scoped to landing page only
- Uses CSS custom properties (`var(--primary-color)`, `var(--text-color)`, etc.) so all themes work
- Dark sections use hardcoded dark values (`#0a0a0f`, `#0f0f1a`) independent of theme — intentional cinematic aesthetic
- Light sections use `var(--card-color)` and `var(--bg-color)`
- Fully responsive: mobile-first, breakpoints at 768px and 1100px

---

### 10. PublicNavbar Update

Update `components/PublicNavbar.tsx`:
- Links: "How it works" (smooth scroll to features section) · "Pricing" (smooth scroll to pricing section)
- Right side: "Log in" (→ /login) · "Get Started" (→ /register, styled as primary button)
- Sticky positioning: transparent background over hero, transitions to solid `var(--card-color)` with border on scroll (JS scroll listener)
- Mobile: hamburger menu collapsing the links

### 11. About Page Update

Update `/about` to reflect new positioning — remove all references to income tracking, spending, transactions. Replace with event planning / affordability focus.

---

### 11. Subscriptions Page Update

Update `/subscriptions` comparison matrix to reflect new plan features (remove transaction/budget/bank sync rows, add event planning rows).

---

## Acceptance Criteria

- [ ] All removed pages/routes return 404 or are deleted
- [ ] New `Event` Mongoose model exists with full schema
- [ ] All 8 CRUD API routes for events work with auth and plan limits
- [ ] Dashboard shows event cards or empty state with "Create Event" CTA
- [ ] `/events` lists all user events
- [ ] `/events/new` creates an event and redirects to detail page
- [ ] `/events/[id]` has 4 tabs: Overview, Budget, Affordability, Scenarios
- [ ] Affordability engine calculates required monthly savings (simple mode)
- [ ] Advanced mode adds income/commitments inputs and recommendations
- [ ] Savings curve chart renders on affordability tab (Smart+)
- [ ] Scenarios tab creates/edits/deletes scenarios (Smart+)
- [ ] Comparison table renders for Pro users
- [ ] What-if controls update scenario totals in real time (Pro)
- [ ] Recommendation engine surfaces top suggestions (Pro)
- [ ] Navbar updated to: Dashboard, My Events, Plans & Pricing, Profile
- [ ] Landing page redesigned with all 7 sections
- [ ] Subscription tiers renamed and feature matrix updated
- [ ] Plan gating enforced on all new features
- [ ] Existing themes, profile settings, auth flows unchanged

---

## Implementation Order

1. **Delete removed pages and API routes** (transactions, budgets, reports, income, spendings, old dashboard)
2. **Create `Event` Mongoose model** (`models/Event.ts`)
3. **Build all Event API routes** (`app/api/events/`)
4. **Update `lib/subscriptions.ts`** — rename slugs, update feature keys and plan definitions
5. **Update authenticated Navbar** — new links: Dashboard, My Events, Plans & Pricing, Profile
6. **Update PublicNavbar** — new links: How it works, Pricing, Log in, Get Started (sticky + scroll behaviour)
7. **Build `/events/new`** — create event flow (type selector + form)
8. **Build `/events` (My Events)** — list page with event cards
9. **Build `/events/[id]` — Overview tab** (countdown, milestones, stats)
10. **Build `/events/[id]` — Budget tab** (cost clusters, live totals)
11. **Build `/events/[id]` — Affordability tab** (simple + advanced mode, savings chart)
12. **Build `/events/[id]` — Scenarios tab** (create/edit/delete, comparison table, what-if, recommendations)
13. **Build new Dashboard** (`/dashboard`) — event cards + Create Event CTA
14. **Redesign landing page** (`/`) — all 8 sections, dark cinematic hero, alternating feature rows, scenario demo
15. **Update `/about`** — new positioning copy
16. **Update `/subscriptions`** — new plan matrix matching new feature set
17. **End-to-end verification** — auth, plan gating, event CRUD, affordability calculations, theme compatibility
