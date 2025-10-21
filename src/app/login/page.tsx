"use client";
import { signIn } from "next-auth/react";
import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleLogin(e: any) {
    e.preventDefault();
    const res = await signIn("credentials", {
      redirect: true,
      email,
      password,
      callbackUrl: "/subscribe",
    });
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen">
      <form
        onSubmit={handleLogin}
        className="bg-neutral-900 p-6 rounded-xl space-y-4 w-80"
      >
        <h1 className="text-xl font-bold text-center">Connexion</h1>
        <input
          type="email"
          placeholder="Email"
          className="w-full p-2 rounded bg-neutral-800 border border-neutral-700"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="Mot de passe"
          className="w-full p-2 rounded bg-neutral-800 border border-neutral-700"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          type="submit"
          className="w-full py-2 rounded bg-blue-600 hover:bg-blue-500"
        >
          Se connecter
        </button>
      </form>
    </main>
  );
}
