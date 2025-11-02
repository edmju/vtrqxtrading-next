import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

// ✅ Handler NextAuth principal
const handler = NextAuth(authOptions);

// ✅ Export requis par Next.js App Router
export { handler as GET, handler as POST };
