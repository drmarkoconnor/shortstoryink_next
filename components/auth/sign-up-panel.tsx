"use client";
import { useState } from 'react';
import { signup } from '@netlify/identity';
import { passwordValidationError } from '@/lib/auth/password-validation';

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
    const invalid = passwordValidationError(password, confirm);
    if (invalid) {
      setStatus('error');
      setMessage(invalid);
      return;
    }
    try {
      const user = await signup(email.trim(), password);
      window.location.assign(user.confirmedAt ? '/app' : '/auth/confirm-email');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Unable to create your account. Please try again.');
      return;
    }
  };

  return (
    <section className="w-full">
      <p className="studio-eyebrow">Invited writer access</p>
      <h1 className="studio-heading mt-3 mb-4">Set up your studio account</h1>
      <p className="mb-7 text-sm leading-7 text-studio-muted">
        Use the email address you were invited with. After confirming it, you can bring in writing, receive feedback and return to earlier drafts.
      </p>
      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block">
          <span className="mb-2 block text-sm text-studio-muted">Email</span>
          <input
            value={email}
            onChange={e => setEmail(e.target.value)}
            type="email"
            required
            className="w-full rounded border border-studio-line bg-studio-paper px-4 py-2.5 text-studio-ink outline-none ring-accent-400 transition focus:ring"
            placeholder="you@example.com"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm text-studio-muted">Password</span>
          <input
            value={password}
            onChange={e => setPassword(e.target.value)}
            type="password"
            required
            className="w-full rounded border border-studio-line bg-studio-paper px-4 py-2.5 text-studio-ink outline-none ring-accent-400 transition focus:ring"
            placeholder="Password"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm text-studio-muted">Confirm password</span>
          <input
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            type="password"
            required
            className="w-full rounded border border-studio-line bg-studio-paper px-4 py-2.5 text-studio-ink outline-none ring-accent-400 transition focus:ring"
            placeholder="Confirm password"
          />
        </label>
        <button
          type="submit"
          disabled={status === 'signing-up'}
          className="studio-primary"
        >
          {status === 'signing-up' ? 'Setting up…' : 'Set up account'}
        </button>
        {message && (
          <p className={`text-sm ${status === 'error' ? 'text-red-800' : 'text-studio-muted'}`}>{message}</p>
        )}
      </form>
    </section>
  );
}
