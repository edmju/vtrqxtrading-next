"use client";
import "./globals.css";
import Header from "@/components/Header";
import { SessionProvider } from "next-auth/react";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="bg-dark-bg text-text-primary overflow-x-hidden">
        <SessionProvider>
          <Header />
          <div className="page-shell min-h-screen pt-20">{children}</div>
        </SessionProvider>
      </body>
    </html>
  );
}
