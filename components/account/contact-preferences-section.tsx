import React from 'react';
// TODO: Wire up with user preferences and SMS logic
export default function ContactPreferencesSection() {
  return (
    <section className="space-y-6">
      <h2 className="text-xl font-semibold">Contact Preferences</h2>
      <form className="space-y-4">
        <div>
          <label className="block text-sm font-medium">Preferred Contact Method</label>
          <select className="mt-1 w-full border rounded px-3 py-2">
            <option value="email">Email</option>
            <option value="sms">SMS</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">Phone Number (for SMS)</label>
          <input type="tel" className="mt-1 w-full border rounded px-3 py-2" placeholder="+1 555 123 4567" />
        </div>
        <div>
          <label className="block text-sm font-medium">Notifications</label>
          <div className="space-y-2 mt-1">
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
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Save Preferences</button>
      </form>
    </section>
  );
}
