import React from 'react';
// TODO: Wire up with password change/reset logic
export default function SecuritySection() {
  return (
    <section className="space-y-6">
      <h2 className="text-xl font-semibold">Security</h2>
      <form className="space-y-4">
        <div>
          <label className="block text-sm font-medium">Change Password</label>
          <input type="password" className="mt-1 w-full border rounded px-3 py-2" placeholder="New password" />
        </div>
        <div>
          <label className="block text-sm font-medium">Confirm Password</label>
          <input type="password" className="mt-1 w-full border rounded px-3 py-2" placeholder="Confirm new password" />
        </div>
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Update Password</button>
      </form>
    </section>
  );
}
