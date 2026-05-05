import Transaction from '@/models/Transaction';
import RecurringTransaction from '@/models/RecurringTransaction';
import Goal from '@/models/Goal';
import Insight, { InsightType, InsightPriority } from '@/models/Insight';
import mongoose from 'mongoose';

interface InsightData {
  type: InsightType;
  message: string;
  priority: InsightPriority;
  metadata?: Record<string, any>;
}

/**
 * Generate insights for a user based on their financial data
 */
export async function generateInsights(
  userId: string | mongoose.Types.ObjectId,
  period: 'week' | 'month' = 'month'
): Promise<InsightData[]> {
  const insights: InsightData[] = [];
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const now = new Date();
  const periodStart = new Date();

  if (period === 'week') {
    periodStart.setDate(now.getDate() - 7);
  } else {
    periodStart.setDate(1);
  }

  try {
    // 1. Spending Anomaly Detection
    insights.push(...(await detectSpendingAnomalies(userObjectId, periodStart, now)));

    // 2. Goal Progress Insights
    insights.push(...(await generateGoalInsights(userObjectId)));

    // 3. Upcoming Costs & Forecasting
    insights.push(...(await generateForecastInsights(userObjectId, now)));

    // 4. Milestone Achievements
    insights.push(...(await generateMilestoneInsights(userObjectId)));

    // 5. Opportunity Recommendations
    insights.push(...(await generateOpportunityInsights(userObjectId)));

    return insights.slice(0, 10); // Return top 10 insights
  } catch (error) {
    console.error('[Insights Generation Error]', error);
    return [];
  }
}

/**
 * Detect spending anomalies by comparing current to historical averages
 */
async function detectSpendingAnomalies(
  userId: mongoose.Types.ObjectId,
  periodStart: Date,
  now: Date
): Promise<InsightData[]> {
  const insights: InsightData[] = [];

  // Get current period spending by category
  const currentSpending = await Transaction.aggregate([
    {
      $match: {
        userId,
        kind: 'expense',
        date: { $gte: periodStart, $lte: now },
      },
    },
    {
      $group: {
        _id: '$category',
        amount: { $sum: '$amount' },
      },
    },
  ]);

  // Get 3-month average spending by category
  const threeMonthsAgo = new Date(now);
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const historicalSpending = await Transaction.aggregate([
    {
      $match: {
        userId,
        kind: 'expense',
        date: { $gte: threeMonthsAgo, $lte: periodStart },
      },
    },
    {
      $group: {
        _id: '$category',
        amount: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
  ]);

  const historicalMap = new Map(
    historicalSpending.map(h => [h._id, h.amount / 3])
  );

  // Detect anomalies (>50% increase)
  for (const current of currentSpending) {
    const historical = historicalMap.get(current._id) || 0;
    const increase = historical > 0 ? (current.amount - historical) / historical : 0;

    if (increase > 0.5) {
      insights.push({
        type: 'anomaly',
        priority: 'high',
        message: `Spending on ${current._id} is 50%+ higher than usual (£${current.amount.toFixed(2)} vs avg £${historical.toFixed(2)})`,
        metadata: {
          category: current._id,
          currentAmount: current.amount,
          averageAmount: historical,
        },
      });
    }
  }

  return insights;
}

/**
 * Generate insights about goal progress
 */
async function generateGoalInsights(
  userId: mongoose.Types.ObjectId
): Promise<InsightData[]> {
  const insights: InsightData[] = [];
  const goals = await Goal.find({ userId, completed: false });

  for (const goal of goals) {
    const progress = (goal.savedAmount / goal.targetAmount) * 100;

    // High achievement milestone
    if (progress >= 80 && progress < 100) {
      insights.push({
        type: 'milestone',
        priority: 'medium',
        message: `You're ${progress.toFixed(0)}% of the way to your "${goal.title}" goal!`,
        metadata: {
          goalId: goal._id,
          progress,
          targetAmount: goal.targetAmount,
        },
      });
    }

    // Project completion date
    if (goal.savedAmount > 0 && goal.targetDate) {
      const now = new Date();
      const daysToTarget = Math.ceil(
        (goal.targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      const remainingAmount = goal.targetAmount - goal.savedAmount;
      const dailyNeeded = remainingAmount / Math.max(daysToTarget, 1);

      if (dailyNeeded > 0) {
        insights.push({
          type: 'forecast',
          priority: 'low',
          message: `To reach "${goal.title}" by ${goal.targetDate.toLocaleDateString()}, save £${dailyNeeded.toFixed(2)}/day`,
          metadata: {
            goalId: goal._id,
            dailyNeeded,
            daysRemaining: daysToTarget,
          },
        });
      }
    }
  }

  return insights;
}

/**
 * Generate forecast insights based on recurring transactions
 */
async function generateForecastInsights(
  userId: mongoose.Types.ObjectId,
  now: Date
): Promise<InsightData[]> {
  const insights: InsightData[] = [];

  const upcoming = await RecurringTransaction.find({
    userId,
    enabled: true,
    nextOccurrence: {
      $gte: now,
      $lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
    },
  }).sort({ nextOccurrence: 1 });

  if (upcoming.length > 0) {
    const monthlyExpenses = upcoming
      .filter(r => r.kind === 'expense')
      .reduce((sum, r) => sum + r.amount, 0);

    if (monthlyExpenses > 0) {
      insights.push({
        type: 'forecast',
        priority: 'medium',
        message: `You have £${monthlyExpenses.toFixed(2)} in recurring monthly expenses coming up`,
        metadata: {
          count: upcoming.length,
          amount: monthlyExpenses,
          upcomingCount: upcoming.length,
        },
      });
    }
  }

  return insights;
}

/**
 * Generate milestone insights
 */
async function generateMilestoneInsights(
  userId: mongoose.Types.ObjectId
): Promise<InsightData[]> {
  const insights: InsightData[] = [];

  // Find recently completed goals
  const recentlyCompleted = await Goal.find({
    userId,
    completed: true,
    completedAt: {
      $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    },
  });

  for (const goal of recentlyCompleted) {
    insights.push({
      type: 'milestone',
      priority: 'high',
      message: `Congratulations! You completed your "${goal.title}" goal! 🎉`,
      metadata: {
        goalId: goal._id,
        completedAt: goal.completedAt,
      },
    });
  }

  return insights;
}

/**
 * Generate opportunity insights (recommendations)
 */
async function generateOpportunityInsights(
  userId: mongoose.Types.ObjectId
): Promise<InsightData[]> {
  const insights: InsightData[] = [];

  // Identify high-spending categories
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const topCategories = await Transaction.aggregate([
    {
      $match: {
        userId,
        kind: 'expense',
        date: { $gte: thirtyDaysAgo },
      },
    },
    {
      $group: {
        _id: '$category',
        amount: { $sum: '$amount' },
      },
    },
    { $sort: { amount: -1 } },
    { $limit: 1 },
  ]);

  if (topCategories.length > 0) {
    const top = topCategories[0];
    if (top.amount > 100) {
      insights.push({
        type: 'opportunity',
        priority: 'medium',
        message: `Your biggest spending this month is on ${top._id} (£${top.amount.toFixed(2)}). Consider setting a budget or reducing these expenses.`,
        metadata: {
          category: top._id,
          amount: top.amount,
        },
      });
    }
  }

  return insights;
}

/**
 * Save insights to the database (avoiding duplicates)
 */
export async function saveInsights(
  userId: string | mongoose.Types.ObjectId,
  insightDataList: InsightData[]
): Promise<number> {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  let savedCount = 0;

  for (const insightData of insightDataList) {
    try {
      // Check if similar insight already exists (created today)
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const exists = await Insight.findOne({
        userId: userObjectId,
        type: insightData.type,
        message: insightData.message,
        createdAt: { $gte: today },
        dismissedAt: null,
      });

      if (!exists) {
        await Insight.create({
          userId: userObjectId,
          ...insightData,
        });
        savedCount++;
      }
    } catch (error) {
      console.error('[Save Insight Error]', error);
    }
  }

  return savedCount;
}
