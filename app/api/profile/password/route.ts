import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectToDatabase } from "../../../../lib/mongodb";
import User from "../../../../models/User";

export async function PATCH(req: NextRequest) {
  const { userId, currentPassword, newPassword } = await req.json();

  if (!userId || !currentPassword || !newPassword) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const normalizedNewPassword = String(newPassword);
  if (normalizedNewPassword.length < 8) {
    return NextResponse.json({ error: "New password must be at least 8 characters" }, { status: 400 });
  }

  await connectToDatabase();
  const user = await User.findById(userId);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const isCurrentValid = await bcrypt.compare(String(currentPassword), user.password);
  if (!isCurrentValid) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });
  }

  user.password = await bcrypt.hash(normalizedNewPassword, 10);
  await user.save();

  return NextResponse.json({ success: true });
}
