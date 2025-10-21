'use client';
import { useState } from 'react';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    setLoading(true);
    setMessage('');

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage('✅ Compte créé ! Un code vous a été envoyé par email.');
      } else {
        setMessage('❌ ' + (data.error || 'Erreur lors de la création.'));
      }
    } catch (error) {
      console.error(error);
      setMessage('❌ Erreur de connexion au serveur.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-black text-white">
      <div className="bg-neutral-900 border border-yellow-400 rounded-xl p-8 text-center w-96">
        <h1 className="text-2xl font-bold text-yellow-400 mb-4">Créer un compte</h1>

        <input
          type="email"
          placeholder="Email"
          className="w-full p-2 rounded mb-3 bg-neutral-800 text-white text-center"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="Mot de passe"
          className="w-full p-2 rounded mb-3 bg-neutral-800 text-white text-center"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={handleSignup}
          disabled={loading}
          className="w-full bg-yellow-400 text-black py-2 rounded hover:bg-yellow-300 font-semibold"
        >
          {loading ? 'Envoi...' : 'Créer un compte'}
        </button>

        {message && <p className="mt-4 text-sm text-gray-300">{message}</p>}

        <p className="mt-3 text-gray-400 text-sm">
          Déjà inscrit ?{' '}
          <a href="/login" className="text-yellow-400 hover:underline">
            Se connecter
          </a>
        </p>
      </div>
    </main>
  );
}
