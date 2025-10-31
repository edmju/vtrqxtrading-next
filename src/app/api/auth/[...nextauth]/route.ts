import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import prisma, { ensureSchema } from "@/lib/prisma";

const handler = NextAuth({
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

        await ensureSchema();
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) return null;

        const valid = await bcrypt.compare(credentials.password, user.hashedPassword);
        if (!valid) return null;

        return { id: user.id, email: user.email };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
      }

      await ensureSchema();
      const dbUser = await prisma.user.findUnique({
        where: { email: String(token.email) },
        include: {
          subscription: {
            select: { status: true }, // ✅ correction ici
          },
        },
      });

      token.hasActiveSub = dbUser?.subscription?.status === "active";
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.hasActiveSub = token.hasActiveSub;
      }
      return session;
    },
  },
  pages: { signIn: "/login" },
});

export { handler as GET, handler as POST };
