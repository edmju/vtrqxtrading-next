// src/app/(terminal)/dashboard/news/page.tsx

import React from "react";
import path from "path";
import { promises as fs } from "fs";
import NewsClient from "./NewsClient";

export const dynamic = "force-dynamic";

type Article = {
  id: string;
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  description?: string;
  score?: number;
  hits?: string[];
};

type NewsBundle = {
  generatedAt: string;
  total: number;
  articles: Article[];
};

type AIAction = {
  symbol: string;
  direction: "BUY" | "SELL";
  conviction: number; // 0..10
  confidence: number; // 0..100
  reason: string;
  evidenceIds?: string[];
};

type AITheme = {
  label: string;
  weight: number; // 0..1
  summary?: string;
  evidenceIds?: string[];
};

type AICluster = {
  label: string;
  weight: number;
  summary: string;
  articleIds: string[];
};

type AIOutput = {
  generatedAt: string;
  mainThemes: AITheme[];
  actions: AIAction[];
  clusters?: AICluster[];
};

async function readJson<T>(rel: string, fallback: T): Promise<T> {
  try {
    const full = path.join(process.cwd(), "public", rel);
    const raw = await fs.readFile(full, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function getData() {
  const news = await readJson<NewsBundle>("data/news/latest.json", {
    generatedAt: "",
    total: 0,
    articles: [],
  });

  const ai = await readJson<AIOutput>("data/ai/latest.json", {
    generatedAt: "",
    mainThemes: [],
    actions: [],
    clusters: [],
  });

  return { news, ai };
}

export default async function NewsPage() {
  const { news, ai } = await getData();
  return <NewsClient news={news} ai={ai} />;
}
