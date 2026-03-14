"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AnalyzePage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to dashboard — user needs to pick a ticker first
    router.replace("/dashboard");
  }, [router]);

  return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="text-center space-y-4">
        <h2 className="text-xl font-semibold text-zinc-200">
          Select a stock to analyze
        </h2>
        <p className="text-zinc-500 text-sm">
          Use the search bar above or click a ticker in the signal scanner
        </p>
      </div>
    </div>
  );
}
