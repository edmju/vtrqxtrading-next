import { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await prisma.user.findUnique({ where: { email: credentials.email } });
        if (!user) return null;
        const ok = await bcrypt.compare(credentials.password, user.hashedPassword);
        if (!ok) return null;
        return { id: user.id, email: user.email };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.email) {
        token.id = (user as { id: string }).id;
        token.email = user.email;
      }
      if (token.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: String(token.email) },
          include: { subscription: true },
        });
        token.id = dbUser?.id;
        token.hasActiveSub = dbUser?.subscription?.status === "active";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).hasActiveSub = token.hasActiveSub === true;
      }
      return session;
    },
  },
  pages: {
    signIn: "/profile",
  },
};
