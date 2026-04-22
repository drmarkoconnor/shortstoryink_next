import React from 'react';
// TODO: Wire up with user preferences and SMS logic
export default function ContactPreferencesSection() {
  return (
    <section className="space-y-6">
      <h2 className="text-xl font-semibold text-parchment-100">Contact Preferences</h2>
      <form className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-silver-100">Preferred Contact Method</label>
          <select className="mt-1 w-full rounded-xl border border-white/15 bg-ink-900 px-3 py-2 text-parchment-100 outline-none ring-accent-400 transition focus:ring">
            <option value="email">Email</option>
            <option value="sms">SMS</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-silver-100">Phone Number (for SMS)</label>
          <input type="tel" className="mt-1 w-full rounded-xl border border-white/15 bg-ink-900 px-3 py-2 text-parchment-100 outline-none ring-accent-400 transition focus:ring" placeholder="+1 555 123 4567" />
        </div>
        <div>
          <label className="block text-sm font-medium text-silver-100">Notifications</label>
          <div className="mt-2 space-y-2 text-sm text-silver-100">
            <label className="flex items-center">
              <input type="checkbox" className="mr-2" defaultChecked />
              Workshop updates
            </label>
            <label className="flex items-center">
              <input type="checkbox" className="mr-2" defaultChecked />
              Submission feedback
            </label>
            <label className="flex items-center">
              <input type="checkbox" className="mr-2" />
              Marketing/news
            </label>
          </div>
        </div>
        <button type="submit" className="rounded-full border border-accent-400/70 bg-accent-400/20 px-4 py-2 text-sm text-parchment-100 transition hover:bg-accent-400/30">Save Preferences</button>
      </form>
    </section>
  );
}
