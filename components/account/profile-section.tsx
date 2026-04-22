import React from 'react';
// TODO: Wire up with user data and update logic
export default function ProfileSection() {
  return (
    <section className="space-y-6">
      <h2 className="text-xl font-semibold text-parchment-100">Profile</h2>
      <form className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-silver-100">Name</label>
          <input type="text" className="mt-1 w-full rounded-xl border border-white/15 bg-ink-900 px-3 py-2 text-parchment-100 outline-none ring-accent-400 transition focus:ring" placeholder="Your name" defaultValue="" />
        </div>
        <div>
          <label className="block text-sm font-medium text-silver-100">Email</label>
          <input type="email" className="mt-1 w-full rounded-xl border border-white/15 bg-ink-900/60 px-3 py-2 text-silver-200 outline-none" value="user@email.com" readOnly />
        </div>
        <div>
          <label className="block text-sm font-medium text-silver-100">Avatar</label>
          <input type="file" className="mt-1 text-sm text-silver-200 file:mr-3 file:rounded-full file:border file:border-white/20 file:bg-white/10 file:px-3 file:py-1.5 file:text-sm file:text-parchment-100" />
        </div>
        <div>
          <label className="block text-sm font-medium text-silver-100">Bio</label>
          <textarea className="mt-1 w-full rounded-xl border border-white/15 bg-ink-900 px-3 py-2 text-parchment-100 outline-none ring-accent-400 transition focus:ring" rows={3} placeholder="Tell us about yourself..." defaultValue="" />
        </div>
        <button type="submit" className="rounded-full border border-accent-400/70 bg-accent-400/20 px-4 py-2 text-sm text-parchment-100 transition hover:bg-accent-400/30">Save Changes</button>
      </form>
    </section>
  );
}
