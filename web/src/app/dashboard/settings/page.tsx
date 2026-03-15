"use client";

import { User, CreditCard, Bell, Shield, Globe } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const { t, locale, setLocale } = useI18n();

  return (
    <div className="max-w-2xl mx-auto space-y-6 sm:space-y-8 px-3 py-4 sm:p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">{t("settings.title")}</h1>
        <p className="text-zinc-500 mt-1">{t("settings.subtitle")}</p>
      </div>

      {/* Language */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6 space-y-4">
        <div className="flex items-center gap-2 text-zinc-200 font-semibold">
          <Globe className="w-5 h-5" />
          {t("settings.language")}
        </div>
        <p className="text-zinc-500 text-sm">
          {t("settings.languageDesc")}
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => setLocale("en")}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-lg border transition-all duration-200",
              locale === "en"
                ? "bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-500/25"
                : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600",
            )}
          >
            {t("settings.english")}
          </button>
          <button
            onClick={() => setLocale("ko")}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-lg border transition-all duration-200",
              locale === "ko"
                ? "bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-500/25"
                : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600",
            )}
          >
            {t("settings.korean")}
          </button>
        </div>
      </div>

      {/* Account */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6 space-y-4">
        <div className="flex items-center gap-2 text-zinc-200 font-semibold">
          <User className="w-5 h-5" />
          {t("settings.account")}
        </div>
        <p className="text-zinc-500 text-sm">
          {t("settings.accountDesc")}
        </p>
      </div>

      {/* Subscription */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6 space-y-4">
        <div className="flex items-center gap-2 text-zinc-200 font-semibold">
          <CreditCard className="w-5 h-5" />
          {t("settings.subscription")}
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-zinc-300">{t("settings.currentPlan")}</p>
            <p className="text-zinc-500 text-sm">{t("settings.freePlanDesc")}</p>
          </div>
          <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors">
            {t("settings.upgradePro")}
          </button>
        </div>
      </div>

      {/* Alerts */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6 space-y-4">
        <div className="flex items-center gap-2 text-zinc-200 font-semibold">
          <Bell className="w-5 h-5" />
          {t("settings.alertPreferences")}
        </div>
        <p className="text-zinc-500 text-sm">
          {t("settings.alertDesc")}
        </p>
      </div>

      {/* Legal */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6 space-y-4">
        <div className="flex items-center gap-2 text-zinc-200 font-semibold">
          <Shield className="w-5 h-5" />
          {t("settings.legal")}
        </div>
        <div className="space-y-2 text-sm">
          <p className="text-zinc-400">
            {t("settings.legalDesc")}
          </p>
        </div>
      </div>
    </div>
  );
}
