"use client";
import { useState } from "react";

export default function AlertsPage() {
  const [email, setEmail] = useState("");
  const [telegram, setTelegram] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await fetch("/api/alerts", {
      method: "POST",
      body: JSON.stringify({ email, telegram }),
      headers: { "Content-Type": "application/json" },
    });
    alert("✅ Préférences enregistrées !");
    setSaving(false);
  }

  return (
    <main className="space-y-6">
      <h1 className="text-2xl font-bold text-yellow-400">⚡ Alertes personnalisées</h1>
      <div className="bg-neutral-900/70 border border-yellow-500/30 rounded-xl p-6 space-y-4">
        <div>
          <label>Email</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-neutral-800 w-full rounded-md p-2 mt-1"
          />
        </div>
        <div>
          <label>Telegram ID</label>
          <input
            value={telegram}
            onChange={(e) => setTelegram(e.target.value)}
            className="bg-neutral-800 w-full rounded-md p-2 mt-1"
          />
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="bg-yellow-500 hover:bg-yellow-400 text-black px-4 py-2 rounded-lg transition-all"
        >
          {saving ? "Enregistrement..." : "Sauvegarder"}
        </button>
      </div>
    </main>
  );
}
