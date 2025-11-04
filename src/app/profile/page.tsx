"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession, signIn, signOut } from "next-auth/react";

export default function ProfilePage() {
  // ⚠️ ne pas destructurer directement pour éviter l’erreur si le hook est indéfini
  const sessionHook = useSession();
  const session = sessionHook?.data;
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (notice) {
      const timer = setTimeout(() => setNotice(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notice]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const res = await signIn("credentials", {
      redirect: false,
      email,
      password,
    });

    setLoading(false);
    if (res?.ok) {
      setNotice("✅ Connexion réussie !");
      setTimeout(() => router.push("/dashboard"), 1500);
    } else {
      setNotice("❌ Identifiants incorrects.");
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirm) {
      setNotice("⚠️ Les mots de passe ne correspondent pas.");
      return;
    }

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (res.ok) {
      setNotice("✅ Compte créé avec succès !");
      setTimeout(() => setMode("login"), 1500);
    } else {
      setNotice("❌ Erreur lors de la création du compte.");
    }
  };

  if (session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-yellow-400">
        <div className="bg-neutral-900 p-8 rounded-2xl border border-yellow-600/40 shadow-xl w-[400px] text-center">
          <h1 className="text-2xl font-bold mb-3">Bienvenue 👋</h1>
          <p className="text-yellow-300 mb-6">{session.user?.email}</p>

          <div className="flex flex-col gap-4">
            <button
              onClick={() => router.push("/subscription")}
              className="bg-yellow-500 hover:bg-yellow-400 text-black font-semibold py-2 rounded-md transition-transform hover:-translate-y-0.5"
            >
              Gérer mon abonnement
            </button>

            <button
              onClick={() => signOut()}
              className="bg-red-500 hover:bg-red-400 text-white font-semibold py-2 rounded-md transition-transform hover:-translate-y-0.5"
            >
              Se déconnecter
            </button>
          </div>
        </div>

        {notice && (
          <div className="fixed bottom-6 right-6 bg-yellow-500 text-black px-5 py-2 rounded-lg shadow-lg animate-bounce">
            {notice}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-black">
      <div className="bg-neutral-900 p-8 rounded-2xl border border-yellow-600/40 shadow-xl w-[400px] text-center">
        <h1 className="text-2xl font-bold text-yellow-400 mb-6">
          {mode === "login" ? "Connexion" : "Créer un compte"}
        </h1>

        <form
          onSubmit={mode === "login" ? handleLogin : handleRegister}
          className="flex flex-col gap-4"
        >
          <input
            type="email"
            placeholder="Adresse e-mail"
            className="w-full bg-neutral-800 text-gray-200 p-2 rounded-md border border-neutral-700 focus:border-yellow-500 focus:outline-none"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Mot de passe"
            className="w-full bg-neutral-800 text-gray-200 p-2 rounded-md border border-neutral-700 focus:border-yellow-500 focus:outline-none"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {mode === "register" && (
            <input
              type="password"
              placeholder="Confirmer le mot de passe"
              className="w-full bg-neutral-800 text-gray-200 p-2 rounded-md border border-neutral-700 focus:border-yellow-500 focus:outline-none"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          )}

          <button
            type="submit"
            disabled={loading}
            className="bg-yellow-500 hover:bg-yellow-400 text-black font-semibold py-2 rounded-md transition-transform hover:-translate-y-0.5"
          >
            {loading
              ? "Chargement..."
              : mode === "login"
              ? "Se connecter"
              : "Créer un compte"}
          </button>
        </form>

        {mode === "login" ? (
          <p className="mt-4 text-gray-400 text-sm">
            Pas encore de compte ?{" "}
            <span
              onClick={() => setMode("register")}
              className="text-yellow-400 cursor-pointer hover:underline"
            >
              Créer un compte
            </span>
          </p>
        ) : (
          <p className="mt-4 text-gray-400 text-sm">
            Déjà inscrit ?{" "}
            <span
              onClick={() => setMode("login")}
              className="text-yellow-400 cursor-pointer hover:underline"
            >
              Se connecter
            </span>
          </p>
        )}

        {mode === "login" && (
          <p
            onClick={() => router.push("/request-reset")}
            className="text-yellow-400 text-sm mt-3 cursor-pointer hover:underline"
          >
            Mot de passe oublié ?
          </p>
        )}
      </div>

      {notice && (
        <div className="fixed bottom-6 right-6 bg-yellow-500 text-black px-5 py-2 rounded-lg shadow-lg animate-bounce">
          {notice}
        </div>
      )}
    </div>
  );
}
