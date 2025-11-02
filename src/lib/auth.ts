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

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });
        if (!user) return null;

        const ok = await bcrypt.compare(
          credentials.password,
          // champ hashé dans ta table User
          user.hashedPassword
        );
        if (!ok) return null;

        return { id: user.id, email: user.email };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      // Au login, copie les infos utiles
      if (user?.email) {
        (token as any).id = (user as { id: string }).id;
        token.email = user.email;
      }
      // À chaque passage, rafraîchit l’état d’abonnement
      if (token.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: String(token.email) },
          include: { subscription: true },
        });
        (token as any).id = dbUser?.id;
        (token as any).hasActiveSub =
          dbUser?.subscription?.status === "active";
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = (token as any).id;
        (session.user as any).hasActiveSub =
          (token as any).hasActiveSub === true;
      }
      return session;
    },
  },

  pages: {
    signIn: "/profile",
  },
};
