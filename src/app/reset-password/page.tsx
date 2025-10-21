"use client";

import { useState } from "react";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, password }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Erreur de réinitialisation");

      setSuccess(true);
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
          Réinitialiser ton mot de passe
        </h1>

        {success ? (
          <p className="text-green-400">
            ✅ Mot de passe mis à jour avec succès. Tu peux maintenant te connecter.
          </p>
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
            <input
              type="text"
              placeholder="Code reçu par e-mail"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              className="p-2 rounded bg-neutral-800 border border-yellow-600 text-white"
            />
            <input
              type="password"
              placeholder="Nouveau mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="p-2 rounded bg-neutral-800 border border-yellow-600 text-white"
            />

            <button
              type="submit"
              disabled={loading}
              className="bg-yellow-500 hover:bg-yellow-400 text-black font-semibold py-2 rounded"
            >
              {loading ? "Réinitialisation..." : "Confirmer"}
            </button>
          </form>
        )}

        {error && <p className="text-red-400 mt-4">{error}</p>}
      </div>
    </div>
  );
}
