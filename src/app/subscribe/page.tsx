"use client";

import { useState } from "react";

const plans = [
  {
    name: "Basic",
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_BASIC!,
    description: "Analyse IA basique, données économiques essentielles",
    price: "19€ / mois",
  },
  {
    name: "Pro",
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO!,
    description: "Indicateurs avancés + alertes automatiques IA",
    price: "49€ / mois",
  },
  {
    name: "Enterprise",
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE!,
    description: "Accès complet, modèles prédictifs + intégration API",
    price: "99€ / mois",
  },
];

export default function SubscribePage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubscribe = async (priceId: string) => {
    try {
      setLoading(priceId);
      setError(null);

      // ✅ POST vers l’API Stripe Checkout
      const res = await fetch("https://vtrqxtrading.xyz/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      });

      console.log("➡️ POST vers Stripe checkout", priceId);
      console.log("Réponse brute:", res);


      if (!res.ok) {
        throw new Error(`Erreur serveur: ${res.status}`);
      }

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url; // ✅ Redirection vers Stripe Checkout
      } else {
        throw new Error("URL Stripe non reçue");
      }
    } catch (err: any) {
      console.error("Erreur lors de la souscription:", err);
      setError("Impossible d'ouvrir Stripe Checkout. Réessaie plus tard.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white flex flex-col items-center justify-center p-6">
      <h1 className="text-4xl font-bold mb-8 text-center">Choisis ton plan</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-6xl">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className="bg-gray-800 rounded-2xl p-6 flex flex-col items-center border border-gray-700 shadow-lg hover:shadow-xl hover:scale-105 transition"
          >
            <h2 className="text-2xl font-semibold mb-4">{plan.name}</h2>
            <p className="text-gray-400 text-center mb-6">{plan.description}</p>
            <p className="text-3xl font-bold mb-6">{plan.price}</p>
            <button
              onClick={() => handleSubscribe(plan.priceId)}
              disabled={loading === plan.priceId}
              className={`px-6 py-3 rounded-xl font-medium transition ${
                loading === plan.priceId
                  ? "bg-gray-600 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-500"
              }`}
            >
              {loading === plan.priceId ? "Redirection..." : "S'abonner"}
            </button>
          </div>
        ))}
      </div>

      {error && (
        <p className="mt-6 text-red-500 text-center bg-gray-900 p-3 rounded-xl border border-red-700">
          {error}
        </p>
      )}
    </main>
  );
}
