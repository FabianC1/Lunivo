import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import authOptions from '@/app/api/auth/[...nextauth]/route';
import Insight from '@/models/Insight';
import User from '@/models/User';
import { generateInsights, saveInsights } from '@/lib/insights';
import dbConnect from '@/lib/dbConnect';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user has access to insights
    const canAccess = ['sync', 'scale'].includes(user.planSlug);
    if (!canAccess) {
      return NextResponse.json({ error: 'Insights access requires Sync plan or higher' }, { status: 403 });
    }

    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '0');
    const type = url.searchParams.get('type');
    const limit = 20;
    const skip = page * limit;

    const query: any = {
      userId: user._id,
      dismissedAt: null,
    };

    if (type) {
      query.type = type;
    }

    const insights = await Insight.find(query)
      .sort({ priority: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Insight.countDocuments(query);

    return NextResponse.json({
      insights,
      page,
      total,
      pages: Math.ceil(total / limit),
    });
  } catch (error: any) {
    console.error('[Insights GET Error]', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch insights' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Generate fresh insights
    const insightData = await generateInsights(user._id, 'month');
    const savedCount = await saveInsights(user._id, insightData);

    return NextResponse.json({
      generated: insightData.length,
      saved: savedCount,
    });
  } catch (error: any) {
    console.error('[Insights POST Error]', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate insights' },
      { status: 500 }
    );
  }
}
