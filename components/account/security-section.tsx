import React from 'react';
// TODO: Wire up with password change/reset logic
export default function SecuritySection() {
  return (
    <section className="space-y-6">
      <h2 className="text-xl font-semibold text-parchment-100">Security</h2>
      <form className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-silver-100">Change Password</label>
          <input type="password" className="mt-1 w-full rounded-xl border border-white/15 bg-ink-900 px-3 py-2 text-parchment-100 outline-none ring-accent-400 transition focus:ring" placeholder="New password" />
        </div>
        <div>
          <label className="block text-sm font-medium text-silver-100">Confirm Password</label>
          <input type="password" className="mt-1 w-full rounded-xl border border-white/15 bg-ink-900 px-3 py-2 text-parchment-100 outline-none ring-accent-400 transition focus:ring" placeholder="Confirm new password" />
        </div>
        <button type="submit" className="rounded-full border border-accent-400/70 bg-accent-400/20 px-4 py-2 text-sm text-parchment-100 transition hover:bg-accent-400/30">Update Password</button>
      </form>
    </section>
  );
}
