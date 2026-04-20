"use client";
import { useState } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';

export function SignUpPanel() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState<'idle' | 'signing-up' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus('signing-up');
    setMessage(null);
    if (password !== confirm) {
      setStatus('error');
      setMessage('Passwords do not match.');
      return;
    }
    const emailRedirectTo = `${window.location.origin}/auth/callback?next=/app`;
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo,
      },
    });
    if (error) {
      setStatus('error');
      setMessage(error.message);
      return;
    }
    window.location.assign('/auth/confirm-email');
  };

  return (
    <section className="surface w-full p-8">
      <h1 className="literary-title text-3xl mb-4">Sign up</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block">
          <span className="mb-2 block text-sm text-silver-200">Email</span>
          <input
            value={email}
            onChange={e => setEmail(e.target.value)}
            type="email"
            required
            className="w-full rounded-xl border border-white/15 bg-ink-900 px-4 py-2.5 text-parchment-100 outline-none ring-accent-400 transition focus:ring"
            placeholder="you@example.com"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm text-silver-200">Password</span>
          <input
            value={password}
            onChange={e => setPassword(e.target.value)}
            type="password"
            required
            className="w-full rounded-xl border border-white/15 bg-ink-900 px-4 py-2.5 text-parchment-100 outline-none ring-accent-400 transition focus:ring"
            placeholder="Password"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm text-silver-200">Confirm Password</span>
          <input
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            type="password"
            required
            className="w-full rounded-xl border border-white/15 bg-ink-900 px-4 py-2.5 text-parchment-100 outline-none ring-accent-400 transition focus:ring"
            placeholder="Confirm Password"
          />
        </label>
        <button
          type="submit"
          disabled={status === 'signing-up'}
          className="rounded-full border border-accent-400/70 bg-accent-400/20 px-5 py-2.5 text-sm text-parchment-100 transition hover:bg-accent-400/30 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === 'signing-up' ? 'Signing up…' : 'Sign up'}
        </button>
        {message && (
          <p className={`text-sm ${status === 'error' ? 'text-red-300' : 'text-silver-200'}`}>{message}</p>
        )}
      </form>
    </section>
  );
}
