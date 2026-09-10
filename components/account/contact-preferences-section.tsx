import React from 'react';
// TODO: Wire up with user preferences and SMS logic
export default function ContactPreferencesSection() {
  return (
    <section className="space-y-6">
      <h2 className="text-xl font-semibold text-studio-ink">Contact Preferences</h2>
      <form className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-studio-muted">Preferred Contact Method</label>
          <select className="mt-1 w-full rounded border border-studio-line bg-studio-paper px-3 py-2.5 text-studio-ink outline-none ring-accent-400 transition focus:ring">
            <option value="email">Email</option>
            <option value="sms">SMS</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-studio-muted">Phone Number (for SMS)</label>
          <input type="tel" className="mt-1 w-full rounded border border-studio-line bg-studio-paper px-3 py-2.5 text-studio-ink outline-none ring-accent-400 transition focus:ring" placeholder="+1 555 123 4567" />
        </div>
        <div>
          <label className="block text-sm font-medium text-studio-muted">Notifications</label>
          <div className="mt-2 space-y-2 text-sm text-studio-muted">
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
        <button type="submit" className="studio-primary">Save Preferences</button>
      </form>
    </section>
  );
}
