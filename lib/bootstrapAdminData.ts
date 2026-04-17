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

type AdminGoalSeedEntry = {
  title: string;
  kind: string;
  targetAmount: number;
  savedAmount: number;
  targetDate: string;
  notes: string;
  completed: boolean;
  completedAt?: string;
};

const ADMIN_GOAL_SEED: AdminGoalSeedEntry[] = [
  {
    title: "Buy an apartment",
    kind: "Home",
    targetAmount: 150000,
    savedAmount: 42500,
    targetDate: "2027-12-31",
    notes: "First-time buyer. Need to save for down payment and closing costs.",
    completed: false,
  },
  {
    title: "Amalfi coast escape",
    kind: "Holiday",
    targetAmount: 6400,
    savedAmount: 2150,
    targetDate: "2026-10-05",
    notes: "Flights, hotels, rail passes, and a food budget.",
    completed: false,
  },
  {
    title: "Summer wedding in Portugal",
    kind: "Wedding",
    targetAmount: 25000,
    savedAmount: 18900,
    targetDate: "2026-07-20",
    notes: "Ceremony, reception, and travel for 80 guests.",
    completed: false,
  },
  {
    title: "Product design course",
    kind: "Education",
    targetAmount: 3200,
    savedAmount: 975,
    targetDate: "2026-09-12",
    notes: "Course fees, books, and software subscriptions.",
    completed: false,
  },
  {
    title: "New car deposit",
    kind: "Vehicle",
    targetAmount: 8000,
    savedAmount: 8000,
    targetDate: "2026-03-18",
    notes: "Deposit saved for a hybrid upgrade before the end of spring.",
    completed: true,
    completedAt: "2026-03-12",
  },
  {
    title: "Emergency fund top-up",
    kind: "Emergency Fund",
    targetAmount: 15000,
    savedAmount: 9200,
    targetDate: "2026-11-30",
    notes: "Build out six months of runway before year end.",
    completed: false,
  },
  {
    title: "Birthday weekend",
    kind: "Birthday",
    targetAmount: 1100,
    savedAmount: 420,
    targetDate: "2026-06-18",
    notes: "Dinner, hotel, and a small surprise budget.",
    completed: false,
  },
  {
    title: "Studio gear refresh",
    kind: "Other",
    targetAmount: 1800,
    savedAmount: 1800,
    targetDate: "2026-02-28",
    notes: "Camera lens and audio kit.",
    completed: true,
    completedAt: "2026-02-20",
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

  const [accountCount, budgetCount] = await Promise.all([
    Account.countDocuments({ userId }),
    Budget.countDocuments({ userId }),
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

  const seededGoalTitles = new Set(
    (
      await Goal.find(
        { userId, title: { $in: ADMIN_GOAL_SEED.map((entry) => entry.title) } },
        { title: 1 }
      ).lean()
    ).map((entry) => entry.title)
  );

  const missingGoals = ADMIN_GOAL_SEED
    .filter((entry) => !seededGoalTitles.has(entry.title))
    .map((entry) => ({
      userId,
      title: entry.title,
      kind: entry.kind,
      targetAmount: entry.targetAmount,
      savedAmount: entry.savedAmount,
      targetDate: startOfDay(entry.targetDate),
      notes: entry.notes,
      completed: entry.completed,
      completedAt: entry.completedAt ? startOfDay(entry.completedAt) : undefined,
    }));

  if (missingGoals.length > 0) {
    await Goal.insertMany(missingGoals);
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