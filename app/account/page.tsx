"use client";
import React, { useState } from 'react';
import ProfileSection from '@/components/account/profile-section';
import ContactPreferencesSection from '@/components/account/contact-preferences-section';
import SecuritySection from '@/components/account/security-section';

const PaymentsSection = () => <div className="rounded-xl border border-white/15 bg-ink-900/45 p-5 text-sm text-silver-200">Payments section coming soon.</div>;
const PrivacySection = () => <div className="rounded-xl border border-white/15 bg-ink-900/45 p-5 text-sm text-silver-200">Privacy & GDPR section coming soon.</div>;
const OtherSettingsSection = () => <div className="rounded-xl border border-white/15 bg-ink-900/45 p-5 text-sm text-silver-200">Other settings coming soon.</div>;

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
    <div className="surface mx-auto mt-4 max-w-2xl p-6 lg:p-8">
      <p className="text-xs uppercase tracking-[0.12em] text-silver-300">Account</p>
      <h1 className="literary-title mt-2 text-3xl text-parchment-100">Settings</h1>
      <div className="mt-6 mb-6 flex flex-wrap gap-1 border-b border-white/15 pb-2">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            className={`rounded-full px-3 py-1.5 text-xs uppercase tracking-[0.09em] transition ${tab === key ? 'bg-burgundy-500/80 text-parchment-100' : 'text-silver-100 hover:bg-white/10 hover:text-parchment-100'}`}
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
