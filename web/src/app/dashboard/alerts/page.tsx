"use client";

import { Bell, Plus, Lock } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export default function AlertsPage() {
  const { t } = useI18n();

  return (
    <div className="max-w-3xl mx-auto space-y-6 sm:space-y-8 px-3 py-4 sm:p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">{t("alerts.title")}</h1>
          <p className="text-zinc-500 mt-1">{t("alerts.subtitle")}</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors">
          <Plus className="w-4 h-4" />
          {t("alerts.newAlert")}
        </button>
      </div>

      {/* Empty state */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-12 text-center">
        <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-4">
          <Bell className="w-8 h-8 text-zinc-500" />
        </div>
        <h3 className="text-lg font-semibold text-zinc-200 mb-2">{t("alerts.noAlerts")}</h3>
        <p className="text-zinc-500 text-sm max-w-md mx-auto mb-6">
          {t("alerts.noAlertsDesc")}
        </p>

        <div className="grid sm:grid-cols-2 gap-4 max-w-lg mx-auto text-left">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
            <p className="text-sm font-medium text-zinc-300 mb-1">{t("alerts.signalAlert")}</p>
            <p className="text-xs text-zinc-500">{t("alerts.signalAlertDesc")}</p>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
            <p className="text-sm font-medium text-zinc-300 mb-1">{t("alerts.probabilityAlert")}</p>
            <p className="text-xs text-zinc-500">{t("alerts.probabilityAlertDesc")}</p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-zinc-500">
          <Lock className="w-3 h-3" />
          {t("alerts.requirePro")}
        </div>
      </div>
    </div>
  );
}
