import Account from "../models/Account";
import Budget from "../models/Budget";
import Goal from "../models/Goal";
import Transaction from "../models/Transaction";
import User from "../models/User";

export const ADMIN_EMAIL = "galaselfabian@gmail.com";
export const ADMIN_NAME = "Fabian Galasel";

const ADMIN_INCOME_SEED = [
  {
    date: "2026-01-05",
    amount: 2980,
    kind: "income" as const,
    category: "Salary",
    description: "Seed income: January salary",
  },
  {
    date: "2026-01-22",
    amount: 260,
    kind: "income" as const,
    category: "Freelance",
    description: "Seed income: January design retainer",
  },
  {
    date: "2026-02-05",
    amount: 3040,
    kind: "income" as const,
    category: "Salary",
    description: "Seed income: February salary",
  },
  {
    date: "2026-02-17",
    amount: 390,
    kind: "income" as const,
    category: "Freelance",
    description: "Seed income: February landing page project",
  },
  {
    date: "2026-03-01",
    amount: 3120,
    kind: "income" as const,
    category: "Salary",
    description: "Monthly salary",
  },
  {
    date: "2026-03-07",
    amount: 420,
    kind: "income" as const,
    category: "Freelance",
    description: "Landing page project",
  },
  {
    date: "2026-04-05",
    amount: 3180,
    kind: "income" as const,
    category: "Salary",
    description: "Seed income: April salary",
  },
  {
    date: "2026-04-24",
    amount: 340,
    kind: "income" as const,
    category: "Bonus",
    description: "Seed income: April performance bonus",
  },
  {
    date: "2026-05-05",
    amount: 3250,
    kind: "income" as const,
    category: "Salary",
    description: "Seed income: May salary",
  },
  {
    date: "2026-05-19",
    amount: 480,
    kind: "income" as const,
    category: "Freelance",
    description: "Seed income: May product audit",
  },
  {
    date: "2026-06-05",
    amount: 3310,
    kind: "income" as const,
    category: "Salary",
    description: "Seed income: June salary",
  },
];

const ADMIN_EXPENSE_SEED = [
  {
    date: "2026-03-14",
    amount: 88.45,
    kind: "expense" as const,
    category: "Food",
    description: "Weekly groceries",
  },
  {
    date: "2026-03-16",
    amount: 54,
    kind: "expense" as const,
    category: "Transport",
    description: "Train and tube top-up",
  },
  {
    date: "2026-03-18",
    amount: 129.99,
    kind: "expense" as const,
    category: "Utilities",
    description: "Electricity and broadband",
  },
  {
    date: "2026-03-21",
    amount: 46.5,
    kind: "expense" as const,
    category: "Entertainment",
    description: "Cinema and dinner",
  },
  {
    date: "2026-03-24",
    amount: 73.2,
    kind: "expense" as const,
    category: "Other",
    description: "Workspace supplies",
  },
];

function startOfDay(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

export async function bootstrapAdminData(userId: string, email: string) {
  if (email.trim().toLowerCase() !== ADMIN_EMAIL) {
    return;
  }

  const user = await User.findById(userId);
  if (!user) {
    return;
  }

  if (user.name !== ADMIN_NAME) {
    user.name = ADMIN_NAME;
    await user.save();
  }

  const [accountCount, budgetCount, goalCount] = await Promise.all([
    Account.countDocuments({ userId }),
    Budget.countDocuments({ userId }),
    Goal.countDocuments({ userId }),
  ]);

  if (accountCount === 0) {
    await Account.insertMany([
      {
        userId,
        name: "Main Account",
        type: "checking",
        balance: 2865.42,
        currency: "GBP",
      },
      {
        userId,
        name: "Savings Vault",
        type: "savings",
        balance: 12480,
        currency: "GBP",
      },
    ]);
  }

  if (budgetCount === 0) {
    await Budget.create({
      userId,
      period: "monthly",
      categories: {
        Food: 420,
        Transport: 180,
        Utilities: 260,
        Entertainment: 160,
        Other: 220,
      },
    });
  }

  if (goalCount === 0) {
    await Goal.insertMany([
      {
        userId,
        title: "Emergency fund top-up",
        kind: "Emergency Fund",
        targetAmount: 15000,
        savedAmount: 9200,
        targetDate: startOfDay("2026-11-30"),
        notes: "Build out six months of runway before year end.",
        completed: false,
      },
      {
        userId,
        title: "Portugal working holiday",
        kind: "Holiday",
        targetAmount: 3200,
        savedAmount: 1180,
        targetDate: startOfDay("2026-08-15"),
        notes: "Flights, apartment, and spending buffer.",
        completed: false,
      },
      {
        userId,
        title: "Studio gear refresh",
        kind: "Other",
        targetAmount: 1800,
        savedAmount: 1800,
        targetDate: startOfDay("2026-02-28"),
        notes: "Camera lens and audio kit.",
        completed: true,
        completedAt: startOfDay("2026-02-20"),
      },
    ]);
  }

  const seededDescriptions = new Set(
    (
      await Transaction.find(
        { userId, description: { $in: [...ADMIN_INCOME_SEED, ...ADMIN_EXPENSE_SEED].map((entry) => entry.description) } },
        { description: 1 }
      ).lean()
    ).map((entry) => entry.description)
  );

  const missingTransactions = [...ADMIN_INCOME_SEED, ...ADMIN_EXPENSE_SEED]
    .filter((entry) => !seededDescriptions.has(entry.description))
    .map((entry) => ({
      userId,
      date: startOfDay(entry.date),
      amount: entry.amount,
      kind: entry.kind,
      category: entry.category,
      description: entry.description,
    }));

  if (missingTransactions.length > 0) {
    await Transaction.insertMany(missingTransactions);
  }
}