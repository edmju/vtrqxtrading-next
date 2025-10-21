"use client";
import { useState } from "react";

export default function SubscribePage() {
  const [loading, setLoading] = useState(false);

  async function subscribe(plan: string, priceId: string) {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, priceId }),
      });

      if (res.status === 401) {
        // Pas connecté → redirige vers signup
        window.location.href = "/signup";
        return;
      }

      const data = await res.json();
      if (data?.url) {
        window.location.href = data.url;
      } else {
        alert(data?.error || "Erreur inconnue ❌");
      }
    } catch (e) {
      alert("Erreur lors de la souscription ❌");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen space-y-4">
      <h1 className="text-2xl font-bold mb-4">Choisis ton plan 💳</h1>

      <div className="space-y-2">
        <button
          onClick={() => subscribe("basic", process.env.NEXT_PUBLIC_STRIPE_PRICE_BASIC!)}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl"
        >
          {loading ? "Chargement..." : "S’abonner Basic"}
        </button>

        <button
          onClick={() => subscribe("pro", process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO!)}
          disabled={loading}
          className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-xl"
        >
          {loading ? "Chargement..." : "S’abonner Pro"}
        </button>

        <button
          onClick={() => subscribe("enterprise", process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE!)}
          disabled={loading}
          className="bg-green-600 hover:bg-green-500 text-white px-6 py-3 rounded-xl"
        >
          {loading ? "Chargement..." : "S’abonner Enterprise"}
        </button>
      </div>
    </main>
  );
}
