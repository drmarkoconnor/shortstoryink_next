"use client";
// Account page scaffold with top tabs and section routing
import React, { useState } from 'react';
import ProfileSection from '@/components/account/profile-section';
import ContactPreferencesSection from '@/components/account/contact-preferences-section';
import SecuritySection from '@/components/account/security-section';

// Placeholder components
const PaymentsSection = () => <div className="p-6 text-gray-400">Payments section coming soon.</div>;
const PrivacySection = () => <div className="p-6 text-gray-400">Privacy & GDPR section coming soon.</div>;
const OtherSettingsSection = () => <div className="p-6 text-gray-400">Other settings coming soon.</div>;

const TABS = [
  { key: 'profile', label: 'Profile' },
  { key: 'contact', label: 'Contact Preferences' },
  { key: 'security', label: 'Security' },
  { key: 'payments', label: 'Payments' },
  { key: 'privacy', label: 'Privacy & GDPR' },
  { key: 'other', label: 'Other' },
];

export default function AccountPage() {
  const [tab, setTab] = useState('profile');

  return (
    <div className="max-w-2xl mx-auto mt-10">
      <h1 className="text-2xl font-bold mb-6">Account Settings</h1>
      <div className="flex border-b mb-6">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            className={`px-4 py-2 -mb-px border-b-2 transition-colors ${tab === key ? 'border-blue-500 text-blue-600 font-semibold' : 'border-transparent text-gray-500'}`}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>
      <div>
        {tab === 'profile' && <ProfileSection />}
        {tab === 'contact' && <ContactPreferencesSection />}
        {tab === 'security' && <SecuritySection />}
        {tab === 'payments' && <PaymentsSection />}
        {tab === 'privacy' && <PrivacySection />}
        {tab === 'other' && <OtherSettingsSection />}
      </div>
    </div>
  );
}
