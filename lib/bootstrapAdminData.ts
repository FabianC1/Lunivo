import Account from "../models/Account";
import Budget from "../models/Budget";
import Goal from "../models/Goal";
import Transaction from "../models/Transaction";
import User from "../models/User";

export const ADMIN_EMAIL = "galaselfabian@gmail.com";
export const ADMIN_NAME = "Fabian Galasel";

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

  const [accountCount, budgetCount, goalCount, transactionCount] = await Promise.all([
    Account.countDocuments({ userId }),
    Budget.countDocuments({ userId }),
    Goal.countDocuments({ userId }),
    Transaction.countDocuments({ userId }),
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

  if (transactionCount === 0) {
    await Transaction.insertMany([
      {
        userId,
        date: startOfDay("2026-03-01"),
        amount: 3120,
        kind: "income",
        category: "Salary",
        description: "Monthly salary",
      },
      {
        userId,
        date: startOfDay("2026-03-07"),
        amount: 420,
        kind: "income",
        category: "Freelance",
        description: "Landing page project",
      },
      {
        userId,
        date: startOfDay("2026-03-14"),
        amount: 88.45,
        kind: "expense",
        category: "Food",
        description: "Weekly groceries",
      },
      {
        userId,
        date: startOfDay("2026-03-16"),
        amount: 54,
        kind: "expense",
        category: "Transport",
        description: "Train and tube top-up",
      },
      {
        userId,
        date: startOfDay("2026-03-18"),
        amount: 129.99,
        kind: "expense",
        category: "Utilities",
        description: "Electricity and broadband",
      },
      {
        userId,
        date: startOfDay("2026-03-21"),
        amount: 46.5,
        kind: "expense",
        category: "Entertainment",
        description: "Cinema and dinner",
      },
      {
        userId,
        date: startOfDay("2026-03-24"),
        amount: 73.2,
        kind: "expense",
        category: "Other",
        description: "Workspace supplies",
      },
    ]);
  }
}