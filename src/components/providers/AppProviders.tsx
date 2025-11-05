"use client";

import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";
import { LangProvider } from "./LangProvider";

export default function AppProviders({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <LangProvider>{children}</LangProvider>
    </SessionProvider>
  );
}
