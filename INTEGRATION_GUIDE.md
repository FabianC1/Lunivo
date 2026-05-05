# Quick Integration Guide

## New Routes to Add to Navigation

Add these to your main navigation (likely in `components/Navbar.tsx`):

```tsx
// Primary navigation items
- /dashboard (existing)
- /insights (NEW - Sync+ only)
- /goals (existing)
- /events (existing)
- /subscriptions (existing)
- /transactions (existing)

// Quick actions
- /import (NEW - CSV import page)
```

## Quick Reference: API Endpoints

### CSV Import
```bash
POST /api/import/csv
Content-Type: multipart/form-data
Body: { file: File }

Response: {
  imported: number,
  duplicates: number,
  errors: string[],
  totalRows: number
}
```

### Recurring Transactions
```bash
GET /api/recurring
Response: RecurringTransaction[]

POST /api/recurring
Body: {
  description, category, amount, kind,
  frequency, startDate, endDate?
}
```

### Insights
```bash
GET /api/insights?page=0&type=anomaly
Response: {
  insights: Insight[],
  page: number,
  total: number,
  pages: number
}

POST /api/insights
Response: { generated: number, saved: number }

PATCH /api/insights/[id]/dismiss
Response: Insight
```

## Feature Gating Reference

Use these feature keys in your components:

```tsx
import { hasFeatureAccess } from '@/lib/subscriptions';

// Check access
if (hasFeatureAccess(userPlan, 'csvImport')) {
  // Show CSV import button
}

if (hasFeatureAccess(userPlan, 'insights')) {
  // Show insights page
}

if (hasFeatureAccess(userPlan, 'recurringTransactions')) {
  // Show recurring transaction features
}
```

## Component Usage Examples

### CSV Uploader
```tsx
import CSVUploader from '@/components/CSVUploader';

<CSVUploader
  onSuccess={(result) => {
    console.log(`Imported ${result.imported} transactions`);
    router.push('/transactions');
  }}
  onError={(error) => {
    console.error(error);
  }}
/>
```

### Recurring Transaction Form
```tsx
import RecurringTransactionForm from '@/components/RecurringTransactionForm';

<RecurringTransactionForm
  onSubmit={async (data) => {
    const response = await fetch('/api/recurring', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    // Handle response
  }}
  onCancel={() => setShowForm(false)}
/>
```

### Insight Card
```tsx
import InsightCard from '@/components/InsightCard';

<InsightCard
  id={insight._id}
  type={insight.type}
  message={insight.message}
  priority={insight.priority}
  metadata={insight.metadata}
  onDismiss={async (id) => {
    await fetch(`/api/insights/${id}/dismiss`, { method: 'PATCH' });
  }}
/>
```

### Upgrade Prompt
```tsx
import UpgradePrompt from '@/components/UpgradePrompt';

<UpgradePrompt
  title="Unlock Insights"
  description="Get AI-powered financial insights tailored to your spending habits."
  feature="personalized insights"
  currentPlan={user.planSlug}
  minimumPlan="sync"
/>
```

## Data Model Usage

### RecurringTransaction
```tsx
interface RecurringTransaction {
  _id: ObjectId;
  userId: ObjectId;
  description: string;
  category: string;
  amount: number;
  kind: 'income' | 'expense';
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  startDate: Date;
  endDate?: Date;
  nextOccurrence: Date;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### Insight
```tsx
interface Insight {
  _id: ObjectId;
  userId: ObjectId;
  type: 'anomaly' | 'forecast' | 'opportunity' | 'milestone' | 'event-alert';
  category?: string;
  message: string;
  metadata?: Record<string, any>;
  priority: 'high' | 'medium' | 'low';
  dismissedAt?: Date;
  actionTaken: boolean;
  actionTakenAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

## Plan Capability Constants

```tsx
// From lib/subscriptions.ts
const PLAN_CAPABILITIES = {
  free: {
    maxRecurringTransactions: 10,
    maxCSVImportsPerMonth: 1,
    maxCSVRowsPerImport: 50,
    insightsPerMonth: 3,
    // ...other capabilities
  },
  sync: {
    maxRecurringTransactions: 50,
    maxCSVImportsPerMonth: null, // unlimited
    maxCSVRowsPerImport: null,
    insightsPerMonth: null,
    // ...
  },
  scale: {
    maxRecurringTransactions: null,
    maxCSVImportsPerMonth: null,
    maxCSVRowsPerImport: null,
    insightsPerMonth: null,
    // ...
  },
};
```

## CSV Format Documentation

Users should provide CSV with these columns:

```csv
date,description,amount,type,category,note
2024-01-15,Coffee,5.50,expense,Food,Morning coffee
2024-01-15,Salary,3000,income,Salary,Monthly salary
2024-01-16,Electricity,45.20,expense,Utilities,
```

Supported values:
- `type`: "income" or "expense"
- `category`: Any string (e.g., "Food", "Transport", "Entertainment", etc.)
- `note`: Optional field

## Insights Generation

Generate insights on demand:

```tsx
import { generateInsights, saveInsights } from '@/lib/insights';

const insightData = await generateInsights(userId, 'month');
const savedCount = await saveInsights(userId, insightData);
```

Or call the API:

```bash
POST /api/insights
Response: { generated: number, saved: number }
```

Insights are automatically deduplicated by date, so multiple calls won't create duplicates.

## Styling & Theming

All new components use CSS Modules for scoped styling. Colors follow the existing theme system:

```css
/* Example: Insight card priority colors */
.high { border-left-color: #dc2626; } /* Red */
.medium { border-left-color: #ea580c; } /* Orange */
.low { border-left-color: #3b82f6; } /* Blue */
```

Customize colors by editing the `.module.css` files in the components directory.

## Performance Considerations

1. **Insights Query**: Create index on `(userId, dismissedAt, createdAt)`
2. **Recurring Transactions**: Index on `(userId, enabled, nextOccurrence)`
3. **CSV Import**: Stream large files instead of loading entirely in memory (current implementation handles reasonably-sized imports)
4. **Caching**: Insights are generated infrequently—consider caching for 1-6 hours per user

## Common Integration Patterns

### Dashboard Widget
```tsx
// Show top 3 insights
const [insights, setInsights] = useState([]);
useEffect(() => {
  fetch('/api/insights?page=0&limit=3')
    .then(r => r.json())
    .then(data => setInsights(data.insights));
}, []);

return (
  <div className="insights-widget">
    {insights.map(insight => (
      <InsightCard key={insight._id} {...insight} />
    ))}
  </div>
);
```

### Upcoming Costs Widget
```tsx
const [recurring, setRecurring] = useState([]);
useEffect(() => {
  fetch('/api/recurring')
    .then(r => r.json())
    .then(setRecurring);
}, []);

const nextMonth = recurring
  .filter(r => r.kind === 'expense')
  .reduce((sum, r) => sum + r.amount, 0);

return <div>Monthly costs: £{nextMonth.toFixed(2)}</div>;
```

### Paywall Logic
```tsx
if (!hasFeatureAccess(user.planSlug, 'insights')) {
  return (
    <UpgradePrompt
      title="Unlock Insights"
      description="See AI-powered financial insights."
      feature="insights"
      currentPlan={user.planSlug}
      minimumPlan="sync"
    />
  );
}
```

---

**See IMPLEMENTATION_SUMMARY.md for complete overview and architecture details.**
