import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { setAuthSessionCookie } from '../../../lib/authCookie';
import { bootstrapAdminData } from '../../../lib/bootstrapAdminData';
import { connectToDatabase } from '../../../lib/mongodb';
import { normalizePlanSlug } from '../../../lib/subscriptions';
import Account from '../../../models/Account';
import User from '../../../models/User';

export async function POST(req: NextRequest) {
  const { name, email, password, plan } = await req.json();

  const normalizedName = String(name ?? '').trim();
  const normalizedEmail = String(email ?? '').trim().toLowerCase();
  const normalizedPassword = String(password ?? '');
  const planSlug = normalizePlanSlug(typeof plan === 'string' ? plan : undefined);

  if (!normalizedName || !normalizedEmail || !normalizedPassword) {
    return NextResponse.json({ error: 'Name, email, and password are required.' }, { status: 400 });
  }

  if (normalizedName.length < 2) {
    return NextResponse.json({ error: 'Full name must be at least 2 characters.' }, { status: 400 });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
  }

  if (normalizedPassword.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
  }

  await connectToDatabase();
  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    return NextResponse.json({ error: 'Email already in use' }, { status: 400 });
  }

  const hashed = await bcrypt.hash(password, 10);
  const user = new User({ name: normalizedName, email: normalizedEmail, password: hashed, planSlug });
  await user.save();

  // Create starter accounts so account-based flows work immediately after signup.
  await Account.insertMany([
    {
      userId: user._id,
      name: 'Main Account',
      type: 'checking',
      balance: 0,
      currency: 'GBP',
    },
    {
      userId: user._id,
      name: 'Savings',
      type: 'savings',
      balance: 0,
      currency: 'GBP',
    },
  ]);

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