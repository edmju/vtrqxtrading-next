import { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,

  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        // Normalise pour éviter les faux négatifs
        const email = String(credentials.email).trim().toLowerCase();

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;

        const ok = await bcrypt.compare(credentials.password, user.hashedPassword);
        if (!ok) return null;

        return { id: user.id, email: user.email };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        (token as any).id = (user as any).id;
        token.email = (user as any).email;
      }
      if (token.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: String(token.email) },
          include: { subscription: true },
        });
        (token as any).id = dbUser?.id;
        (token as any).hasActiveSub = dbUser?.subscription?.status === "active";
      }
      return token;
    },

    async session({ session, token }) {
      if (!session.user) session.user = {} as any;
      (session.user as any).id = (token as any).id;
      (session.user as any).hasActiveSub = (token as any).hasActiveSub === true;
      if (token.email) session.user.email = token.email as string;
      return session;
    },
  },

  pages: { signIn: "/profile" },
};
