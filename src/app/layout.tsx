"use client";
import "./globals.css";
import Header from "@/components/Header";
import { SessionProvider } from "next-auth/react";
import Head from "next/head";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <Head>
        <link rel="icon" href="/faviconREAL.png" type="image/png" />
        <title>VTRQX Trading Next</title>
      </Head>
      <body className="bg-bg-dark text-text-main overflow-x-hidden">
        <SessionProvider>
          <Header />
          <div className="min-h-screen pt-20 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-neon-purple/20 via-transparent to-neon-cyan/10 blur-3xl animate-gradient"></div>
            {children}
          </div>
        </SessionProvider>
      </body>
    </html>
  );
}
