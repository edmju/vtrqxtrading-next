'use client';
import { useState } from 'react';

export default function VerifyPage() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    setLoading(true);
    setMessage('');
    const res = await fetch('/api/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
    });
    const data = await res.json();
    if (data.ok) setMessage('✅ Compte vérifié avec succès, vous pouvez vous connecter !');
    else setMessage('❌ ' + (data.error || 'Erreur'));
    setLoading(false);
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen text-white bg-black">
      <div className="bg-neutral-900 border border-yellow-400 rounded-xl p-8 text-center w-96">
        <h1 className="text-2xl font-bold text-yellow-400 mb-4">Vérification du compte</h1>
        <p className="text-gray-400 mb-4">Entrez le code reçu par email</p>

        <input
          type="email"
          placeholder="Email"
          className="w-full p-2 rounded mb-3 bg-neutral-800 text-white text-center"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="text"
          placeholder="Code à 6 chiffres"
          className="w-full p-2 rounded mb-3 bg-neutral-800 text-white text-center"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />

        <button
          onClick={handleVerify}
          disabled={loading}
          className="w-full bg-yellow-400 text-black py-2 rounded hover:bg-yellow-300 font-semibold"
        >
          {loading ? 'Vérification...' : 'Vérifier'}
        </button>

        {message && <p className="mt-4 text-sm text-gray-300">{message}</p>}
      </div>
    </main>
  );
}
