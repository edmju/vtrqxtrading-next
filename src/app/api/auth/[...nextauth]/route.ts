import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { compare } from "bcryptjs";

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password)
          throw new Error("Email ou mot de passe manquant");

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });
        if (!user) throw new Error("Utilisateur introuvable");

        const isValid = await compare(credentials.password, user.password!);
        if (!isValid) throw new Error("Mot de passe incorrect");

        return user;
      },
    }),
  ],
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,

  callbacks: {
    async jwt({ token, user }) {
      // 🟢 Attache toujours l’ID utilisateur au token
      if (user) {
        token.id = user.id;
        token.email = user.email;
      } else if (!token.id && token.email) {
        // 🟡 Fallback si JWT déjà existant
        const existingUser = await prisma.user.findUnique({
          where: { email: token.email as string },
        });
        if (existingUser) token.id = existingUser.id;
      }
      return token;
    },

    async session({ session, token }) {
      // 🟢 Propage l’ID vers session.user
      if (token?.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
