import { useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabaseClient';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (error) setError(error.message);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <form onSubmit={handleSubmit} className="w-full max-w-sm border border-oryx-silver rounded-lg p-6">
        <h1 className="text-xl font-bold text-oryx-blue mb-4">Oryx Vehicle Management</h1>
        <label htmlFor="email" className="block text-sm text-oryx-silver mb-1">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full border border-oryx-silver rounded px-3 py-2 mb-3"
        />
        <label htmlFor="password" className="block text-sm text-oryx-silver mb-1">
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full border border-oryx-silver rounded px-3 py-2 mb-3"
        />
        {error && <p className="text-red-700 text-sm mb-3">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-oryx-blue text-white rounded px-3 py-2 disabled:opacity-50"
        >
          Log in
        </button>
      </form>
    </div>
  );
}
