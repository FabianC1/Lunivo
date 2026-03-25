import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { bootstrapAdminData } from '../../../lib/bootstrapAdminData';
import { connectToDatabase } from '../../../lib/mongodb';
import User from '../../../models/User';

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const normalizedEmail = String(email).trim().toLowerCase();

  await connectToDatabase();
  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  await bootstrapAdminData(String(user._id), user.email);

  return NextResponse.json({
    success: true,
    user: {
      id: String(user._id),
      name: user.name,
      email: user.email,
    },
  });
}