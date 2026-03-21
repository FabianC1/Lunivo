import bcrypt from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { connectToDatabase } from "./mongodb";
import User from "../models/User";

function randomPassword() {
  return crypto.randomUUID() + crypto.randomUUID();
}

export const nextAuthOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
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

      const safeName = user.name?.trim() || email.split("@")[0] || "User";

      try {
        await connectToDatabase();
        const existing = await User.findOne({ email });

        if (!existing) {
          const hashed = await bcrypt.hash(randomPassword(), 10);
          const created = await User.create({
            name: safeName,
            email,
            password: hashed,
          });
          (user as { id?: string }).id = String(created._id);
          return true;
        }

        if (existing.name !== safeName) {
          existing.name = safeName;
          await existing.save();
        }

        (user as { id?: string }).id = String(existing._id);
      } catch {
        // Keep OAuth sign-in available even if DB is unavailable.
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.userId = (user as { id?: string }).id;
      }
      return token;
    },
    async session({ session, token }) {
      (session.user as { id?: string }).id = typeof token.userId === "string" ? token.userId : undefined;
      return session;
    },
  },
};
