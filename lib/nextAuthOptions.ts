import bcrypt from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { bootstrapAdminData } from "./bootstrapAdminData";
import { connectToDatabase } from "./mongodb";
import User from "../models/User";

function randomPassword() {
  return crypto.randomUUID() + crypto.randomUUID();
}

async function ensureOAuthUser(email: string, name?: string | null) {
  const safeName = name?.trim() || email.split("@")[0] || "User";

  await connectToDatabase();
  const existing = await User.findOne({ email });

  if (!existing) {
    const hashed = await bcrypt.hash(randomPassword(), 10);
    const created = await User.create({
      name: safeName,
      email,
      password: hashed,
    });
    return String(created._id);
  }

  if (existing.name !== safeName) {
    existing.name = safeName;
    await existing.save();
  }

  return String(existing._id);
}

export const nextAuthOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      authorization: {
        params: {
          prompt: "select_account",
        },
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (!account || account.provider !== "google") {
        return true;
      }

      const email = user.email?.trim().toLowerCase();
      if (!email) {
        return false;
      }

      try {
        const userId = await ensureOAuthUser(email, user.name);
        await bootstrapAdminData(userId, email);
        (user as { id?: string }).id = userId;
      } catch {
        // Keep OAuth sign-in available even if DB is unavailable.
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.userId = (user as { id?: string }).id;
      }

      if (!token.userId && typeof token.email === "string") {
        try {
          const email = token.email.trim().toLowerCase();
          token.userId = await ensureOAuthUser(email, token.name);
          if (typeof token.userId === "string") {
            await bootstrapAdminData(token.userId, email);
          }
        } catch {
          // Keep the token usable even if the database is temporarily unavailable.
        }
      }

      return token;
    },
    async session({ session, token }) {
      (session.user as { id?: string }).id = typeof token.userId === "string" ? token.userId : undefined;
      return session;
    },
  },
};
