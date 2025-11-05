import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Orbitron } from "next/font/google";
import "./globals.css";
import AppProviders from "@/components/providers/AppProviders";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta" });
const orbitron = Orbitron({ subsets: ["latin"], variable: "--font-orbitron" });

export const metadata: Metadata = {
  title: "VTRQX Trading — AI‑Powered Terminal",
  description: "Institutional‑grade data, AI insights, and trading tools.",
  icons: {
    icon: [
      { url: "/favicon/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/favicon/android-chrome-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    other: [{ rel: "manifest", url: "/favicon/site.webmanifest" }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${jakarta.variable} ${orbitron.variable}`}>
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
