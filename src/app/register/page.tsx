"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) return setError("Les mots de passe ne correspondent pas");
    setLoading(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    setLoading(false);
    if (res.ok) {
      await signIn("credentials", { email, password, redirect: false });
      router.push("/profile");
    } else {
      const data = await res.json();
      setError(data.message || "Erreur d’inscription");
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-black">
      <form
        onSubmit={handleRegister}
        className="bg-neutral-900 p-10 rounded-2xl shadow-xl border border-yellow-600/40 w-[400px]"
      >
        <h2 className="text-2xl font-bold text-yellow-400 mb-6 text-center">
          Créer un compte
        </h2>
        <input
          type="email"
          placeholder="Adresse e-mail"
          className="w-full bg-neutral-800 text-gray-200 p-2 rounded-md border border-neutral-700 focus:border-yellow-500 focus:outline-none mb-3"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Mot de passe"
          className="w-full bg-neutral-800 text-gray-200 p-2 rounded-md border border-neutral-700 focus:border-yellow-500 focus:outline-none mb-3"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Confirmer le mot de passe"
          className="w-full bg-neutral-800 text-gray-200 p-2 rounded-md border border-neutral-700 focus:border-yellow-500 focus:outline-none mb-3"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />
        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-yellow-500 hover:bg-yellow-400 text-black py-2 rounded-md font-semibold transition-transform hover:-translate-y-0.5"
        >
          {loading ? "Création..." : "Créer un compte"}
        </button>
      </form>
    </div>
  );
}
