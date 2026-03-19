import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectToDatabase } from '../../../lib/mongodb';
import Account from '../../../models/Account';
import User from '../../../models/User';

export async function POST(req: NextRequest) {
  const { name, email, password } = await req.json();

  if (!name || !email || !password) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const normalizedName = String(name).trim();

  await connectToDatabase();
  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    return NextResponse.json({ error: 'Email already in use' }, { status: 400 });
  }

  const hashed = await bcrypt.hash(password, 10);
  const user = new User({ name: normalizedName, email: normalizedEmail, password: hashed });
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

  return NextResponse.json({
    success: true,
    user: {
      id: String(user._id),
      name: user.name,
      email: user.email,
    },
  });
}