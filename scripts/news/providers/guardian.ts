import { RawArticle } from "../types";

const API = "https://content.guardianapis.com/search";

export async function fetchGuardian(): Promise<RawArticle[]> {
  const key = process.env.GUARDIAN_API_KEY;
  if (!key) return [];
  const url = `${API}?page-size=100&show-fields=trailText&api-key=${key}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const json = await res.json();
  const results = json?.response?.results || [];
  return results.map((r: any) => ({
    url: r.webUrl,
    title: r.webTitle,
    source: "The Guardian",
    publishedAt: new Date(r.webPublicationDate).toISOString(),
    description: r.fields?.trailText || "",
    lang: "en",
  }));
}
