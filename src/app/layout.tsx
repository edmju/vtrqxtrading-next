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
      <body className="bg-bg-dark text-text-main overflow-x-hidden relative">
        <SessionProvider>
          <Header />
          {/* Le conteneur principal */}
          <div className="min-h-screen pt-20 relative overflow-hidden">
            {/* ✅ Fond animé placé derrière grâce à z-index */}
            <div className="absolute inset-0 bg-gradient-to-br from-neon-purple/20 via-transparent to-neon-cyan/10 blur-3xl animate-gradient -z-10 pointer-events-none"></div>

            {/* ✅ Contenu cliquable au-dessus */}
            <div className="relative z-10">{children}</div>
          </div>
        </SessionProvider>
      </body>
    </html>
  );
}
