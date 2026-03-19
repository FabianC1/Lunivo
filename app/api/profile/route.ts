import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "../../../lib/mongodb";
import User from "../../../models/User";

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  await connectToDatabase();
  const user = await User.findById(userId).select("name email");
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    user: {
      id: String(user._id),
      name: user.name,
      email: user.email,
    },
  });
}

export async function PUT(req: NextRequest) {
  const { userId, name } = await req.json();

  if (!userId || !name) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const normalizedName = String(name).trim();
  if (!normalizedName) {
    return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
  }

  await connectToDatabase();
  const user = await User.findByIdAndUpdate(
    userId,
    { name: normalizedName },
    { new: true, runValidators: true }
  ).select("name email");

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    user: {
      id: String(user._id),
      name: user.name,
      email: user.email,
    },
  });
}
