/**
 * Filtrage "hot" sans IA : score par mots/expressions clés.
 * - Normalisation forte (minuscules, accents, ponctuation, apostrophes intelligentes)
 * - Large couverture macro/micro FR/EN
 * - Anti-bruit (médias/opinion/podcast/etc.)
 */

export type KeywordGroup = { weight: number; terms: string[] };

export const NEGATIVE_TERMS: string[] = [
  // bruit / non-trading
  "opinion","editorial","podcast","newsletter","blog","interview","profile",
  "travel","sports","culture","arts","lifestyle","people","gossip","fashion","beauty",
  "recipe","photos","gallery","video:","watch:","how to",
  // NYT/The Daily etc.
  "the daily podcast","daily podcast"
];

// Macro – banques centrales / politique monétaire
const G_POLICY: KeywordGroup = { weight: 6, terms: [
  "rate hike","rate cut","rate decision","rate path","pivot","policy shift",
  "federal reserve","fed","powell","fomc","dot plot",
  "ecb","lagarde","boj","kuroda","boe","boc","rbnz","rba","snb",
  "quantitative tightening","qt","qe","balance sheet"
]};

// Macro – inflation / emploi / croissance / récession
const G_DATA: KeywordGroup = { weight: 5, terms: [
  "inflation","disinflation","deflation","cpi","ppi","pce",
  "jobs","jobless","unemployment","labor market","payrolls","nfp",
  "recession","slowdown","soft landing","hard landing","gdp","growth slows"
]};

// Commerce / sanctions / tarifs / géopolitique
const G_TRADE: KeywordGroup = { weight: 6, terms: [
  "tariff","tariffs","trade war","export control","export controls",
  "sanction","sanctions","embargo","blacklist","entity list",
  "license ban","visa restriction","geopolitical tension","escalation",
  "ceasefire","strike","missile","border closure"
]};

// Énergie / OPEC / offre
const G_ENERGY: KeywordGroup = { weight: 5, terms: [
  "opec","opec+","production cut","output cut","supply disruption","inventory draw",
  "stockpile drop","brent","wti","refinery outage","gas pipeline"
]};

// Entreprises – earnings / guidance / m&a / régulateur / crédit
const G_CORP: KeywordGroup = { weight: 7, terms: [
  "earnings beat","earnings miss","revenue beat","guidance raised","guidance cut",
  "profit warning","preliminary results","merger","acquisition","takeover","buyout",
  "spinoff","ipo","secondary offering","antitrust","doj","ftc","ec investigation",
  "eu probe","sec probe","sec charges","fine","settlement","lawsuit","class action",
  "downgrade","upgrade","credit watch","rating cut","buyback","share repurchase",
  "dividend hike","dividend cut","bankruptcy","chapter 11","restructuring","default"
]};

// Tech/AI/Chips – export, ruptures d’offre, cybersécu
const G_TECH: KeywordGroup = { weight: 5, terms: [
  "chip ban","export ban","ai chip","gpu shortage","supply chain disruption",
  "plant shutdown","data breach","hack","ransomware","antitrust case"
]};

// FX / Or / Crypto (événements significatifs)
const G_MARKETS: KeywordGroup = { weight: 4, terms: [
  "usd surges","usd slumps","yen intervention","fx intervention","currency peg",
  "gold jumps","gold slips","bitcoin jumps","bitcoin plunges","stabilizes"
]};

// Français
const G_FR: KeywordGroup = { weight: 5, terms: [
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
  return s
    .toLowerCase()
    // apostrophes typographiques → simples
    .replace(/[’‘´`]/g, "'")
    // accents
    .normalize("NFD").replace(/\p{Diacritic}/gu, "")
    // ponctuation forte en espaces
    .replace(/[^\p{Letter}\p{Number}\s%]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function hasNegative(s: string): boolean {
  const text = normalize(s);
  return NEGATIVE_TERMS.some(t => text.includes(normalize(t)));
}

export function scoreText(text: string, tickers: string[]): number {
  if (!text) return 0;
  const norm = normalize(text);
  if (hasNegative(norm)) return 0;

  let score = 0;

  for (const g of GROUPS) {
    for (const t of g.terms) {
      if (norm.includes(normalize(t))) {
        score += g.weight;
        break;
      }
    }
  }

  // Bonus si mention d’un ticker surveillé
  for (const tk of tickers) {
    const n = normalize(tk);
    if (n && norm.includes(n)) score += 2;
  }

  // Bonus signal % (chiffres + % dans le titre)
  if (/\d+(\.\d+)?\s?%/.test(text)) score += 1;

  return score;
}
