import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { bootstrapAdminData } from '../../../lib/bootstrapAdminData';
import { setAuthSessionCookie } from '../../../lib/authCookie';
import { connectToDatabase } from '../../../lib/mongodb';
import User from '../../../models/User';

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  const normalizedEmail = String(email ?? '').trim().toLowerCase();
  const normalizedPassword = String(password ?? '');

  if (!normalizedEmail || !normalizedPassword) {
    return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
  }

  await connectToDatabase();
  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const match = await bcrypt.compare(normalizedPassword, user.password);
  if (!match) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  await bootstrapAdminData(String(user._id), user.email);

  const response = NextResponse.json({
    success: true,
    user: {
      id: String(user._id),
      name: user.name,
      email: user.email,
      planSlug: user.planSlug ?? 'free',
    },
  });

  setAuthSessionCookie(response, {
    userId: String(user._id),
    email: user.email,
    name: user.name,
  });

  return response;
}