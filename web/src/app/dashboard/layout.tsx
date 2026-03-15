import { Sidebar } from "@/components/dashboard/Sidebar";
import { Header } from "@/components/dashboard/Header";
import { BottomNav } from "@/components/dashboard/BottomNav";
import { I18nProvider } from "@/lib/i18n";

export const metadata = {
  title: "Dashboard | Stock Scanner",
  description: "Real-time signal scanner and technical analysis dashboard",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <I18nProvider>
    <div className="flex h-screen bg-zinc-950 text-zinc-100 overflow-hidden">
      {/* Skip to main content link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:top-2 focus:left-2 focus:px-4 focus:py-2 focus:rounded-lg focus:bg-indigo-600 focus:text-white focus:text-sm focus:font-medium focus:shadow-lg focus:outline-none"
      >
        Skip to main content
      </a>

      {/* Sidebar - hidden on mobile, icons-only on tablet, full on desktop */}
      <Sidebar />

      {/* Main area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <Header />

        {/* Content - bottom padding for mobile bottom nav */}
        <main id="main-content" className="flex-1 overflow-y-auto pb-16 md:pb-0">{children}</main>
      </div>

      {/* Bottom navigation - mobile only */}
      <BottomNav />
    </div>
    </I18nProvider>
  );
}
