import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";
import { compare } from "bcryptjs";

export const authOptions = {
  // ❌ Retiré l'adapter ici, car le CredentialsProvider gère déjà Prisma
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),

    CredentialsProvider({
      name: "Email et mot de passe",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        console.log("🔍 Tentative de connexion:", credentials?.email);

        if (!credentials?.email || !credentials?.password) {
          console.error("⚠️ Champs manquants");
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) {
          console.warn("⚠️ Utilisateur introuvable");
          return null;
        }

        const isValid = await compare(credentials.password, user.password!);
        console.log("Mot de passe valide:", isValid);

        if (!isValid) {
          console.warn("⚠️ Mot de passe incorrect");
          return null;
        }

        // ✅ Retour formaté strict pour NextAuth
        return {
          id: user.id.toString(),
          name: user.name ?? user.email.split("@")[0],
          email: user.email,
        };
      },
    }),
  ],

  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (token?.id) {
        session.user.id = token.id;
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
