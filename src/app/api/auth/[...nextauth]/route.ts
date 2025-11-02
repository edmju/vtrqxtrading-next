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
        console.log("🔍 Tentative de connexion via Credentials:", credentials?.email);

        if (!credentials?.email || !credentials?.password)
          throw new Error("Email ou mot de passe manquant");

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) {
          console.warn("❌ Utilisateur introuvable");
          throw new Error("Utilisateur introuvable");
        }

        const isValid = await compare(credentials.password, user.password!);
        console.log("Mot de passe valide:", isValid);

        if (!isValid) {
          console.warn("❌ Mot de passe incorrect");
          throw new Error("Mot de passe incorrect");
        }

        // ✅ NextAuth exige un objet strictement typé { id, name, email }
        return {
          id: String(user.id),
          name: user.name || user.email.split("@")[0],
          email: user.email,
          hasActiveSub: user.hasActiveSub ?? false,
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
        token.hasActiveSub = user.hasActiveSub ?? false;
      }
      return token;
    },

    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.hasActiveSub = token.hasActiveSub ?? false;
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
