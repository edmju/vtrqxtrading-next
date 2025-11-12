/**
 * Scoring par mots/expressions clés (FR/EN) + explication (hits).
 * Normalisation forte (accents/ponctuation/apostrophes).
 */

export type KeywordGroup = { weight: number; terms: string[] };

export const NEGATIVE_TERMS: string[] = [
  "opinion","editorial","podcast","newsletter","blog","interview","profile",
  "travel","sports","culture","arts","lifestyle","people","gossip","fashion","beauty",
  "recipe","photos","gallery","video:","watch:","how to","the daily podcast","daily podcast",
  "celebrity","red carpet","movie","tv show","music","influencer","habits","happiness","diet",
  "make-it","success","shopping","pop-culture","health and wellness"
];

// Banques centrales / politique monétaire
const G_POLICY: KeywordGroup = { weight: 8, terms: [
  "rate hike","rate hikes","rate cut","rate cuts","rate decision","rate path","pivot","policy shift",
  "federal reserve","fed","powell","fomc","dot plot","meeting minutes",
  "ecb","lagarde","boj","boe","boc","rbnz","rba","snb",
  "quantitative tightening","qt","qe","balance sheet","forward guidance","ycc","yield curve control",
]};

// Inflation / emploi / croissance
const G_DATA: KeywordGroup = { weight: 6, terms: [
  "inflation","disinflation","deflation","cpi","ppi","pce",
  "jobs","jobless","unemployment","labor market","payrolls","nfp",
  "recession","slowdown","soft landing","hard landing","gdp","growth slows","retail sales"
]};

// Commerce / sanctions / tarifs / géopolitique
const G_TRADE: KeywordGroup = { weight: 8, terms: [
  "tariff","tariffs","trade war","export control","export controls",
  "sanction","sanctions","embargo","blacklist","entity list",
  "license ban","visa restriction","geopolitical tension","escalation",
  "armistice","ceasefire","border closure","retaliation"
]};

// Énergie / OPEC / offre
const G_ENERGY: KeywordGroup = { weight: 7, terms: [
  "opec","opec+","production cut","output cut","supply disruption","inventory draw",
  "stockpile drop","brent","wti","refinery outage","refinery fire","pipeline","gas pipeline",
  "oil surge","oil slump","gas shortage","lng","rig count"
]};

// Entreprises – earnings / guidance / m&a / régulation / crédit
const G_CORP: KeywordGroup = { weight: 9, terms: [
  "earnings beat","earnings miss","revenue beat","guidance raised","guidance cut",
  "profit warning","preliminary results","merger","acquisition","takeover","buyout",
  "spinoff","ipo","secondary offering","follow-on","convertible",
  "antitrust","doj","ftc","ec investigation","eu probe","cfius",
  "sec probe","sec charges","fine","settlement","lawsuit","class action",
  "downgrade","upgrade","credit watch","rating cut","rating upgrade",
  "buyback","share repurchase","dividend hike","dividend cut",
  "bankruptcy","chapter 11","restructuring","default","insolvency","covenant breach"
]};

// Tech / Semi / Cybersécu
const G_TECH: KeywordGroup = { weight: 7, terms: [
  "chip ban","export ban","ai chip","gpu shortage","foundry",
  "supply chain disruption","plant shutdown","fab shutdown",
  "data breach","hack","ransomware","antitrust case","export curbs","design win"
]};

// Marchés / FX / Or / Vol
const G_MARKETS: KeywordGroup = { weight: 5, terms: [
  "usd surges","usd slumps","yen intervention","fx intervention","currency peg",
  "gold jumps","gold slips","bitcoin jumps","bitcoin plunges","volatility spike","limit up","limit down"
]};

// Français
const G_FR: KeywordGroup = { weight: 7, terms: [
  "hausse des taux","baisse des taux","taux directeurs","banque centrale",
  "inflation en baisse","inflation recule","tensions géopolitiques",
  "sanctions","embargo","réduction de production","profit warning",
  "relève ses prévisions","abaisse ses prévisions","opa","fusion","amende",
  "enquête antitrust","plainte collective","plan de restructuration",
  "défaut de paiement","rachat d'actions","dividende","révision de guidance"
]};

export const GROUPS: KeywordGroup[] = [
  G_POLICY, G_TRADE, G_ENERGY, G_CORP, G_TECH, G_MARKETS, G_DATA, G_FR
];

export function normalize(s: string): string {
  return (s || "")
    .toLowerCase()
    .replace(/[’‘´`]/g, "'")
    .normalize("NFD").replace(/\p{Diacritic}/gu, "")
    .replace(/[^\p{Letter}\p{Number}\s%]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function hasNegative(s: string): boolean {
  const text = normalize(s);
  return NEGATIVE_TERMS.some(t => text.includes(normalize(t)));
}

export function scoreTextWithHits(text: string, tickers: string[]): { score: number; hits: string[] } {
  if (!text) return { score: 0, hits: [] };
  const norm = normalize(text);
  if (hasNegative(norm)) return { score: 0, hits: [] };

  let score = 0;
  const hits: string[] = [];

  for (const g of GROUPS) {
    for (const t of g.terms) {
      if (norm.includes(normalize(t))) {
        score += g.weight;
        hits.push(t);
        break; // 1 hit par groupe
      }
    }
  }

  for (const tk of tickers) {
    const n = normalize(tk);
    if (n && norm.includes(n)) {
      score += 2;
      hits.push(`ticker:${tk.toUpperCase()}`);
    }
  }

  if (/\d+(\.\d+)?\s?%/.test(text)) {
    score += 1;
    hits.push("percent");
  }

  return { score, hits };
}
