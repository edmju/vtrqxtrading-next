// src/app/subscription/page.tsx
"use client";

import { useEffect, useState } from "react";

type SubInfo =
  | {
      active: boolean;
      plan?: string;
      status?: string;
      periodEnd?: string;
    }
  | null;

const PLAN_TO_PRICEID: Record<string, string | undefined> = {
  basic: process.env.NEXT_PUBLIC_STRIPE_PRICE_BASIC,
  pro: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO,
  enterprise: process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE,
};

export default function SubscriptionPage() {
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubInfo>(null);
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const sessionRes = await fetch("/api/auth/session", {
          credentials: "include",
        });
        const session = await sessionRes.json();

        if (!session?.user?.email) {
          setError("Non connecté.");
          setLoading(false);
          return;
        }

        setUserEmail(session.user.email);

        const subRes = await fetch("/api/subscription/status", {
          credentials: "include",
        });
        const subData = await subRes.json();

        setSubscription(subData);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setError("Erreur de chargement");
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleSubscribe = async (plan: "basic" | "pro" | "enterprise") => {
    try {
      const priceId = PLAN_TO_PRICEID[plan];
      if (!priceId) {
        alert("Configuration Stripe manquante pour ce plan.");
        return;
      }

      setSubmitting(plan);

      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ priceId }),
      });

      if (!res.ok) {
        const text = await res.text();
        alert(`Erreur serveur ${res.status} : ${text}`);
        return;
      }

      const data = await res.json();
      if (data?.url) {
        window.location.href = data.url;
      } else {
        alert("URL Stripe non reçue");
      }
    } catch (err) {
      console.error(err);
      alert("Erreur serveur Stripe");
    } finally {
      setSubmitting(null);
    }
  };

  const handleManage = async () => {
    try {
      const res = await fetch("/api/stripe/portal", { credentials: "include" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Erreur serveur Stripe");
      }
    } catch (err) {
      console.error(err);
      alert("Erreur serveur Stripe");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen text-yellow-400 text-xl">
        Chargement...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-red-500 text-lg">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-white bg-black">
      <h1 className="text-2xl font-bold text-yellow-400 mb-2">
        Choisissez votre abonnement
      </h1>
      {userEmail && (
        <p className="text-gray-400 mb-8">
          Connecté : <span className="text-yellow-400">{userEmail}</span>
        </p>
      )}

      {subscription?.active ? (
        <div className="text-center">
          <p className="text-green-400 text-lg mb-6">
            ✅ Abonnement actif :{" "}
            <span className="font-bold">{subscription.plan?.toUpperCase()}</span>
          </p>
          <button
            onClick={handleManage}
            className="bg-yellow-500 text-black px-6 py-3 rounded hover:bg-yellow-400 font-semibold"
          >
            Gérer mon abonnement
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center max-w-4xl">
            <div className="bg-neutral-900 border border-yellow-700 rounded-xl p-6">
              <h2 className="text-xl font-bold text-yellow-400 mb-2">Basic</h2>
              <p className="text-gray-400 mb-4">29 € / mois</p>
              <button
                onClick={() => handleSubscribe("basic")}
                disabled={submitting === "basic"}
                className="bg-yellow-500 text-black px-5 py-2 rounded hover:bg-yellow-400 font-semibold disabled:opacity-60"
              >
                {submitting === "basic" ? "Redirection..." : "Choisir ce plan"}
              </button>
            </div>

            <div className="bg-neutral-900 border border-yellow-700 rounded-xl p-6">
              <h2 className="text-xl font-bold text-yellow-400 mb-2">Pro</h2>
              <p className="text-gray-400 mb-4">59 € / mois</p>
              <button
                onClick={() => handleSubscribe("pro")}
                disabled={submitting === "pro"}
                className="bg-yellow-500 text-black px-5 py-2 rounded hover:bg-yellow-400 font-semibold disabled:opacity-60"
              >
                {submitting === "pro" ? "Redirection..." : "Choisir ce plan"}
              </button>
            </div>

            <div className="bg-neutral-900 border border-yellow-700 rounded-xl p-6">
              <h2 className="text-xl font-bold text-yellow-400 mb-2">Enterprise</h2>
              <p className="text-gray-400 mb-4">99 € / mois</p>
              <button
                onClick={() => handleSubscribe("enterprise")}
                disabled={submitting === "enterprise"}
                className="bg-yellow-500 text-black px-5 py-2 rounded hover:bg-yellow-400 font-semibold disabled:opacity-60"
              >
                {submitting === "enterprise" ? "Redirection..." : "Choisir ce plan"}
              </button>
            </div>
          </div>

          <p className="mt-8 text-gray-500 text-sm">
            Paiement sécurisé via Stripe • Annulation à tout moment
          </p>
        </>
      )}
    </div>
  );
}
