const fr = {
  nav: {
    features: "FONCTIONNALITÉS",
    pricing: "TARIFS",
    about: "À PROPOS",
    signin: "CONNEXION",
    dashboard: "TABLEAU DE BORD",
  },
  cta: {
    get_started: "COMMENCER",
    open_terminal: "OUVRIR LE TERMINAL",
  },
  hero: {
    title1: "PROPULSÉ PAR L’IA",
    title2: "TRADING",
    subtitle: "Passe au niveau supérieur avec des données institutionnelles et des analyses IA.",
  },
  featureGrid: {
    a: { title: "News + Calendrier", desc: "Reste en avance avec un flux temps réel et un calendrier macro." },
    b: { title: "Sentiment IA", desc: "Lecture haussière/baissière avec contexte par actif." },
    c: { title: "Données institutionnelles", desc: "COT, flux, positions et research exploitables." },
  },
  featuresPage: {
    title: "Toutes les fonctionnalités",
    subtitle: "Modules de niveau institutionnel : news, macro, positionnement et analyses IA.",
    groups: {
      market: {
        title: "Market Monitor",
        subtitle: "Anticipe les catalyseurs et la volatilité.",
        items: {
          live: { title: "Live Headlines", desc: "Flux de news réactif avec filtres intelligents." },
          calendar: { title: "Calendrier économique+", desc: "Consensus, surprises, importance, contexte instantané." },
          context: { title: "Contexte par actif", desc: "Pourquoi ça bouge : thèmes, catalyseurs, news liées." },
          sentiment: { title: "Sentiment de marché IA", desc: "Bull/Bear avec momentum et force du récit." }
        }
      },
      institutional: {
        title: "Données institutionnelles",
        subtitle: "Ce que les pros regardent au quotidien.",
        items: {
          cot: { title: "COT (CFTC)", desc: "Positionnements nets par cohortes, tendances." },
          orderflow: { title: "Orderflow & Footprint", desc: "Lecture du flux, déséquilibres et absorptions." },
          volprof: { title: "Volume Profile", desc: "Zones de valeur, HVN/LVN et zones de juste valeur." },
          fin: { title: "Financières & Insiders", desc: "Statistiques, notations et flux d’initiés." }
        }
      },
      ai: {
        title: "Modules IA",
        subtitle: "Compresser l’info, amplifier la clarté.",
        items: {
          aiNews: { title: "Analyse IA des news", desc: "Résumés, points clés, score de pertinence." },
          aiSocial: { title: "Sentiment social IA", desc: "Signal de la foule avec réduction du bruit." },
          seasonal: { title: "Saisonnalité & Patterns", desc: "Tendances historiques, sensibles aux régimes." },
          alerts: { title: "Alertes intelligentes", desc: "Règles + déclencheurs IA (prix, data, news)." }
        }
      },
      macro: {
        title: "Terminaux Macro",
        subtitle: "Le contexte top‑down qui guide les marchés.",
        items: {
          dots: { title: "Dot Plots (Fed, BCE, BoE…)", desc: "Trajectoires de politique monétaire multi‑BC." },
          timeline: { title: "Macro Timeline", desc: "Publications vs consensus avec “pourquoi c’est important” IA." },
          pos: { title: "Positionnement & Flows", desc: "Retail vs smart money, gamma options, OI." },
          banks: { title: "Bank Research", desc: "Highlights JPM, MS, GS, UBS, Citi, BofA… avec résumés IA." }
        }
      }
    }
  },
  subscription: {
    title: "Choisissez votre offre",
    subtitle: "Changez d’offre à tout moment. Vous resterez sur cette page après le paiement.",
    success: "Abonnement actif — bienvenue !",
    canceled: "Paiement annulé.",
    compare: "Comparer les fonctionnalités",
    selected: "Offre sélectionnée",
    manage: "Gérer mon abonnement",
    current: "ACTUEL",
    start: "Démarrer",
    plans: {
      starter: { name: "Starter", price: "19 € /mois", tagline: "Bases solides, essentials" },
      pro: { name: "Pro", price: "49 € /mois", tagline: "Données pro & modules IA" },
      terminal: { name: "Terminal", price: "99 € /mois", tagline: "Tout le terminal" }
    },
    table: {
      live_news: "Live Headlines",
      econ_calendar: "Calendrier économique+",
      ai_sentiment: "Sentiment de marché IA",
      ai_news: "Analyse IA des news",
      ai_social: "Sentiment social IA",
      seasonality: "Saisonnalité / Pattern Scan",
      cot: "COT (CFTC)",
      orderflow: "Orderflow & Footprint",
      volume_profile: "Volume Profile",
      company_fin: "Données financières + Notations",
      insiders: "Positions d’initiés",
      sec: "SEC / IPO / Earnings",
      macro_timeline: "Macro Timeline",
      dotplots: "Dot Plots (Fed/BCE/BoE/BoJ/RBA/RBNZ/SNB/BoC/PBoC)",
      bank_reports: "Rapports de banques (JPM, MS, GS, UBS, Citi, BofA…)",
      alerts: "Alertes intelligentes",
    }
  },
  profile: {
    title_login: "Connexion",
    title_register: "Créer un compte",
    email: "Adresse e‑mail",
    password: "Mot de passe",
    confirm: "Confirmer le mot de passe",
    login: "Se connecter",
    create: "Créer un compte",
    forgot: "Mot de passe oublié ?",
    welcome: "Bienvenue",
    manage: "Gérer mon abonnement",
    logout: "Se déconnecter",
    created: "Compte créé !",
    login_ok: "Connexion réussie !",
    login_err: "Identifiants incorrects.",
    register_err: "Erreur d’inscription.",
    mismatch: "Les mots de passe ne correspondent pas.",
  },
  about: {
    title: "À propos de VTRQX Trading",
    subtitle: "Données institutionnelles, analyses IA, et un terminal élégant.",
    who: {
      title: "Qui sommes‑nous",
      p: "VTRQX Trading est une plateforme d’analyse de marché alimentée par l’IA, offrant des outils de niveau pro : flux d’actualités en temps réel, données macro, positionnement, recherches et analytics avancées."
    },
    what: {
      title: "Ce que nous proposons",
      a: "Données multi‑actifs & calendrier macro",
      b: "Modules IA : sentiment, résumés de news, détection de patterns",
      c: "Terminaux macro (Dot Plots, COT, flows, breadth, options, etc.)",
      d: "Research : résumés IA des rapports de banques et filings",
      e: "Alertes et watchlists synchronisées"
    },
    disclaimer: {
      title: "Avertissement",
      p: "VTRQX Trading n’est pas un conseiller financier et ne fournit aucune recommandation personnalisée. Les informations sont fournies à titre informatif et éducatif. Les utilisateurs assument leurs décisions ; tout investissement comporte des risques, incluant la perte en capital. Les performances passées ne préjugent pas des performances futures."
    }
  },
  footer: {
    terms: "Conditions",
    privacy: "Confidentialité",
    contact: "Contact",
    language: "Langue",
    en: "Anglais",
    fr: "Français",
  },
  dashboard: {
    nav: {
      overview: "Aperçu",
      news: "News",
      sentiment: "Sentiment",
      macro: "Macro",
      dotplots: "Dot Plots",
      positioning: "Positionnement",
    }
  }
};
export default fr;
