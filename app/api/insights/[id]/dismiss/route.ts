import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import authOptions from '@/app/api/auth/[...nextauth]/route';
import Insight from '@/models/Insight';
import User from '@/models/User';
import dbConnect from '@/lib/dbConnect';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const insight = await Insight.findOneAndUpdate(
      { _id: params.id, userId: user._id },
      { dismissedAt: new Date() },
      { new: true }
    );

    if (!insight) {
      return NextResponse.json({ error: 'Insight not found' }, { status: 404 });
    }

    return NextResponse.json(insight);
  } catch (error: any) {
    console.error('[Insight Dismiss Error]', error);
    return NextResponse.json(
      { error: error.message || 'Failed to dismiss insight' },
      { status: 500 }
    );
  }
}
