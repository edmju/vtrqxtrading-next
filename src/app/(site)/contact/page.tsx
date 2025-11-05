"use client";

import { useState } from "react";
import GlassCard from "@/components/ui/GlassCard";
import Button from "@/components/ui/Button";

export default function ContactPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [ok, setOk] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setOk(null); setErr(null);
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, message }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) { setOk("Message sent. Thank you!"); setEmail(""); setMessage(""); }
    else setErr(data?.error || "Failed to send.");
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <GlassCard className="p-6">
        <h1 className="text-2xl font-bold mb-4">Contact</h1>
        <form onSubmit={submit} className="space-y-4">
          <input
            type="email"
            required
            placeholder="Your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-neutral-800 text-gray-200 p-2 rounded-md border border-neutral-700 focus:border-primary focus:outline-none"
          />
          <textarea
            required
            placeholder="Your message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            className="w-full bg-neutral-800 text-gray-200 p-2 rounded-md border border-neutral-700 focus:border-primary focus:outline-none"
          />
          <Button type="submit">Send</Button>
          {ok && <p className="text-cyan text-sm">{ok}</p>}
          {err && <p className="text-red-400 text-sm">{err}</p>}
        </form>
      </GlassCard>
    </div>
  );
}
