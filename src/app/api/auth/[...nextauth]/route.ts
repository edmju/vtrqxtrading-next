export const runtime = "nodejs";

import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

// Re-export pour les usages getServerSession(authOptions) ailleurs
export { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
