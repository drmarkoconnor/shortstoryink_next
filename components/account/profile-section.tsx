import React from 'react';
// TODO: Wire up with user data and update logic
export default function ProfileSection() {
  return (
    <section className="space-y-6">
      <h2 className="text-xl font-semibold">Profile</h2>
      <form className="space-y-4">
        <div>
          <label className="block text-sm font-medium">Name</label>
          <input type="text" className="mt-1 w-full border rounded px-3 py-2" placeholder="Your name" defaultValue="" />
        </div>
        <div>
          <label className="block text-sm font-medium">Email</label>
          <input type="email" className="mt-1 w-full border rounded px-3 py-2 bg-gray-100" value="user@email.com" readOnly />
        </div>
        <div>
          <label className="block text-sm font-medium">Avatar</label>
          <input type="file" className="mt-1" />
        </div>
        <div>
          <label className="block text-sm font-medium">Bio</label>
          <textarea className="mt-1 w-full border rounded px-3 py-2" rows={3} placeholder="Tell us about yourself..." defaultValue="" />
        </div>
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Save Changes</button>
      </form>
    </section>
  );
}
