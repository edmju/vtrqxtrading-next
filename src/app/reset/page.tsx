"use client";

import { useState } from "react";

export default function ResetPage() {
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");

    const res = await fetch("/api/auth/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, password }),
    });

    const data = await res.json();
    if (res.ok) {
      setMessage("✅ Mot de passe réinitialisé !");
      setTimeout(() => (window.location.href = "/profile"), 2000);
    } else {
      setMessage(`❌ ${data.message || "Erreur inconnue."}`);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-black text-gray-100">
      <form
        onSubmit={handleSubmit}
        className="bg-neutral-900 p-10 rounded-2xl border border-yellow-600/40 shadow-xl w-[400px] text-center"
      >
        <h2 className="text-2xl font-bold text-yellow-400 mb-6">
          Réinitialiser le mot de passe
        </h2>

        <input
          type="text"
          placeholder="Code reçu par e-mail"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="w-full bg-neutral-800 text-gray-200 p-2 rounded-md border border-neutral-700 focus:border-yellow-500 focus:outline-none mb-3"
          required
        />

        <input
          type="password"
          placeholder="Nouveau mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-neutral-800 text-gray-200 p-2 rounded-md border border-neutral-700 focus:border-yellow-500 focus:outline-none mb-3"
          required
        />

        <button
          type="submit"
          className="w-full bg-yellow-500 hover:bg-yellow-400 text-black py-2 rounded-md font-semibold transition-transform hover:-translate-y-0.5"
        >
          Réinitialiser
        </button>

        {message && <p className="mt-3 text-sm">{message}</p>}
      </form>
    </div>
  );
}
