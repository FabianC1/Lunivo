import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '../../../lib/mongodb';
import User from '../../../models/User';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get('email');
  if (!email) {
    return NextResponse.json({ error: 'Missing email' }, { status: 400 });
  }
  await connectToDatabase();
  const user = await User.findOne({ email: email.trim().toLowerCase() });
  if (!user) {
    return NextResponse.json({ exists: false });
  }
  return NextResponse.json({ exists: true, user: { id: String(user._id), name: user.name, email: user.email } });
}
