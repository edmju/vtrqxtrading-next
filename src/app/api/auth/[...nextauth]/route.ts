import NextAuth, { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  // Important sur Vercel avec domaine custom
  trustHost: true,

  session: { strategy: "jwt" },

  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
          include: { subscription: true },
        });
        if (!user) return null;

        const ok = await bcrypt.compare(credentials.password, user.hashedPassword);
        if (!ok) return null;

        // NextAuth ne peut renvoyer que des champs “user-like”
        return {
          id: user.id,
          email: user.email,
        } as any;
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      try {
        // Quand on vient de se logger, `user` est défini → hydrate le token
        const email = (user?.email ?? token.email)?.toString().toLowerCase();
        if (email) {
          const dbUser = await prisma.user.findUnique({
            where: { email },
            include: { subscription: true },
          });

          token.id = dbUser?.id;
          token.hasActiveSub =
            dbUser?.subscription?.status === "active" &&
            (!!dbUser.subscription.currentPeriodEnd
              ? new Date(dbUser.subscription.currentPeriodEnd) > new Date()
              : true);
        }
      } catch {
        // ne casse pas la session si la DB est KO
      }
      return token;
    },

    async session({ session, token }) {
      // Ne jamais supposer que session.user existe
      session.user = session.user ?? ({} as any);
      (session.user as any).id = token.id as string | undefined;
      (session as any).hasActiveSub = !!token.hasActiveSub;
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
