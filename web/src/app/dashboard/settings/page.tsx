"use client";

import { User, CreditCard, Bell, Shield } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Settings</h1>
        <p className="text-zinc-500 mt-1">Manage your account and preferences</p>
      </div>

      {/* Account */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6 space-y-4">
        <div className="flex items-center gap-2 text-zinc-200 font-semibold">
          <User className="w-5 h-5" />
          Account
        </div>
        <p className="text-zinc-500 text-sm">
          Sign in to manage your account settings, subscription, and alerts.
        </p>
      </div>

      {/* Subscription */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6 space-y-4">
        <div className="flex items-center gap-2 text-zinc-200 font-semibold">
          <CreditCard className="w-5 h-5" />
          Subscription
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-zinc-300">Current Plan</p>
            <p className="text-zinc-500 text-sm">Free — 5 analyses/day, top 5 signals</p>
          </div>
          <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors">
            Upgrade to Pro
          </button>
        </div>
      </div>

      {/* Alerts */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6 space-y-4">
        <div className="flex items-center gap-2 text-zinc-200 font-semibold">
          <Bell className="w-5 h-5" />
          Alert Preferences
        </div>
        <p className="text-zinc-500 text-sm">
          Configure email notifications for signal alerts. Requires Pro plan.
        </p>
      </div>

      {/* Legal */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6 space-y-4">
        <div className="flex items-center gap-2 text-zinc-200 font-semibold">
          <Shield className="w-5 h-5" />
          Legal
        </div>
        <div className="space-y-2 text-sm">
          <p className="text-zinc-400">
            Stock Scanner is a screening and analysis tool. It does not provide investment advice.
            Past performance does not guarantee future results.
          </p>
        </div>
      </div>
    </div>
  );
}
