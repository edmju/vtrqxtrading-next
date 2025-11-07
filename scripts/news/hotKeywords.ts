// Liste "énormissime" de mots/expressions qui rendent une news utile au trading.
// (FR/EN, macro + micro, évite les sujets lifestyle/sport)
// ⚠️ Ajoute/retire librement des termes selon tes marchés.

export const NEGATIVE_TERMS = [
  "opinion", "editorial", "podcast", "newsletter", "blog",
  "travel", "sports", "culture", "arts", "lifestyle",
  "recipe", "people", "gossip", "fashion", "beauty",
  "video:", "watch:", "photos", "gallery", "interview"
];

export const HOT_TERMS = [
  // Macro – banques centrales / politique monétaire
  "rate hike", "rate cut", "rate cuts", "rate decision", "rate path",
  "fed", "federal reserve", "powell", "dot plot", "fomc",
  "ecb", "lagarde", "boj", "kuroda", "boe", "snB", "rba", "rbnz", "boc",
  "quantitative tightening", "qt", "qe", "balance sheet",
  "forward guidance", "policy shift", "pivot",

  // Macro – inflation / emploi / croissance
  "inflation cools", "inflation eases", "inflation surges",
  "disinflation", "stagflation",
  "jobs decline", "jobless claims jump", "unemployment rises",
  "wage growth", "labor market cools",
  "recession risk", "soft landing", "hard landing",
  "gdp surprise", "growth slows", "slowdown",

  // Commerce / géopolitique / tarifs / sanctions
  "tariffs", "new tariffs", "trade war", "export controls", "sanctions",
  "embargo", "blacklist", "entity list", "license ban",
  "geopolitical tension", "escalation", "ceasefire", "missile", "strike",

  // Energie / OPEC
  "opec", "opec+", "production cut", "output cut",
  "supply disruption", "inventory draw", "stockpile drop",
  "brent", "wti", "gas pipeline", "refinery outage",

  // Entreprises – earnings / guidance / m&a / régulateur
  "earnings beat", "earnings miss", "revenue beat", "guidance raised", "guidance cut",
  "profit warning", "preliminary results",
  "merger", "acquisition", "takeover", "buyout", "spinoff", "ipo", "secondary offering",
  "antitrust", "doj", "ftc", "ec investigation", "eu probe",
  "sec probe", "sec charges", "fine", "settlement", "lawsuit", "class action",
  "downgrade", "upgrade", "credit watch", "rating cut",
  "buyback", "share repurchase", "dividend hike", "dividend cut",
  "bankruptcy", "chapter 11", "restructuring", "default",

  // Tech/AI/Chips – export, interdictions, ruptures d’offre
  "chip ban", "export ban", "ai chip", "gpu shortage",
  "supply chain disruption", "plant shutdown",
  "data breach", "hack", "ransomware",

  // Devises / or / crypto (événements significatifs)
  "usd surges", "usd slumps", "yen intervention", "fx intervention", "currency peg",
  "gold jumps", "gold slips", "bitcoin jumps", "bitcoin plunges",

  // FR (macro + micro)
  "hausse des taux", "baisse des taux", "taux directeurs", "banque centrale",
  "inflation en baisse", "inflation recule", "tensions géopolitiques",
  "sanctions", "embargo", "réduction de production", "profit warning",
  "relève ses prévisions", "abaisse ses prévisions", "OPA", "fusion", "amende",
  "enquête antitrust", "plainte collective", "plan de restructuration",
  "défaut de paiement", "rachat d'actions", "dividende",
];

// Fabrication d’un RegExp robuste (case-insensitive)
const escaped = HOT_TERMS.map(s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
export const HOT_RE = new RegExp(`\\b(${escaped.join("|")})\\b`, "i");

const negEscaped = NEGATIVE_TERMS.map(s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
export const NEG_RE = new RegExp(`\\b(${negEscaped.join("|")})\\b`, "i");

// Filtre principal:  true si "hot", false sinon
export function isHot(title: string, description: string = ""): boolean {
  const text = `${title} ${description}`.toLowerCase();
  if (NEG_RE.test(text)) return false;
  return HOT_RE.test(text);
}
