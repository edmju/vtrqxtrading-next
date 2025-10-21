"use client";

import { useState } from "react";

export default function RequestResetPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/request-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Erreur serveur");

      setMessage("E-mail envoyé ! Vérifie ta boîte de réception.");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="bg-neutral-900 p-8 rounded-2xl border border-yellow-700 shadow-lg w-96 text-center">
        <h1 className="text-2xl font-bold text-yellow-400 mb-6">
          Réinitialiser le mot de passe
        </h1>

        {message ? (
          <>
            <p className="text-green-400 mb-4">
              ✅ {message}
            </p>
            <a
              href="/reset-password"
              className="text-yellow-400 hover:underline block mt-4"
            >
              J’ai reçu mon code, je veux le saisir
            </a>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
            <input
              type="email"
              placeholder="Ton e-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="p-2 rounded bg-neutral-800 border border-yellow-600 text-white"
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-yellow-500 hover:bg-yellow-400 text-black font-semibold py-2 rounded"
            >
              {loading ? "Envoi en cours..." : "Envoyer le code"}
            </button>
          </form>
        )}

        {error && <p className="text-red-400 mt-4">{error}</p>}
      </div>
    </div>
  );
}
