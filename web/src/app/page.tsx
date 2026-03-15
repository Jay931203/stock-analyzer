import {
  Activity,
  ArrowRight,
  BarChart3,
  Check,
  Clock,
  Code2,
  Bell,
  LineChart,
  Zap,
  ExternalLink,
  Shield,
  Sparkles,
  TrendingUp,
  Database,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FeatureDemo } from "@/components/landing/FeatureDemo";

/* ------------------------------------------------------------------ */
/* Feature cards data                                                 */
/* ------------------------------------------------------------------ */

const FEATURES = [
  {
    icon: Zap,
    title: "Combined Probability Engine",
    description:
      "Select multiple indicators and get a combined probability score. Not a black-box prediction — transparent, data-backed math.",
    accent: "text-primary",
    gradient: "from-primary/10 to-primary/5",
    borderHover: "group-hover:border-primary/30",
    iconBg: "bg-primary/10",
  },
  {
    icon: Activity,
    title: "Real-Time Signal Scanner",
    description:
      "101 stocks scanned across 12 indicators every market day. Surface the signals that matter and filter the noise.",
    accent: "text-success",
    gradient: "from-success/10 to-success/5",
    borderHover: "group-hover:border-success/30",
    iconBg: "bg-success/10",
  },
  {
    icon: Clock,
    title: "Signal Time Machine",
    description:
      "Travel back to any date and see what signals fired. Compare the prediction with what actually happened next.",
    accent: "text-warning",
    gradient: "from-warning/10 to-warning/5",
    borderHover: "group-hover:border-warning/30",
    iconBg: "bg-warning/10",
  },
  {
    icon: Bell,
    title: "Smart Alerts",
    description:
      "Get notified when high-probability signals fire on your watchlist. Email and push notification support.",
    accent: "text-primary",
    gradient: "from-primary/10 to-primary/5",
    borderHover: "group-hover:border-primary/30",
    iconBg: "bg-primary/10",
  },
  {
    icon: LineChart,
    title: "Interactive Charts",
    description:
      "TradingView-quality charts with overlaid indicators, signal markers, and probability zones. Dark-mode optimized.",
    accent: "text-success",
    gradient: "from-success/10 to-success/5",
    borderHover: "group-hover:border-success/30",
    iconBg: "bg-success/10",
  },
  {
    icon: Code2,
    title: "Developer API",
    description:
      "Full REST API access. Integrate signals into your own trading systems, bots, or spreadsheets.",
    accent: "text-warning",
    gradient: "from-warning/10 to-warning/5",
    borderHover: "group-hover:border-warning/30",
    iconBg: "bg-warning/10",
  },
];

/* ------------------------------------------------------------------ */
/* Pricing data                                                       */
/* ------------------------------------------------------------------ */

const PRICING = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Get started with core features",
    features: [
      "5 analyses per day",
      "Top 5 daily signals",
      "Time Machine access",
      "Basic chart view",
      "1-year data history",
    ],
    cta: "Start Free",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$9.99",
    period: "/ month",
    description: "Everything a serious trader needs",
    features: [
      "Unlimited analyses",
      "Full signal scanner (101 stocks)",
      "Combined probability engine",
      "Smart alerts (email + push)",
      "10-year data history",
      "Export to CSV",
      "Priority support",
    ],
    cta: "Start 7-Day Trial",
    highlighted: true,
  },
  {
    name: "API",
    price: "$49",
    period: "/ month",
    description: "Build on top of our data",
    features: [
      "Everything in Pro",
      "REST API access",
      "10,000 API calls/day",
      "Webhook notifications",
      "Bulk data export",
      "Dedicated support",
    ],
    cta: "Contact Sales",
    highlighted: false,
  },
];

/* ------------------------------------------------------------------ */
/* Footer data                                                         */
/* ------------------------------------------------------------------ */

const FOOTER_LINKS = {
  Product: [
    { label: "Signal Scanner", href: "#features" },
    { label: "Time Machine", href: "#features" },
    { label: "Pricing", href: "#pricing" },
    { label: "API Documentation", href: "#" },
    { label: "Changelog", href: "#" },
  ],
  Resources: [
    { label: "Getting Started", href: "#" },
    { label: "Signal Guide", href: "#" },
    { label: "Indicator Library", href: "#" },
    { label: "FAQ", href: "#" },
    { label: "Blog", href: "#" },
  ],
  Legal: [
    { label: "Terms of Service", href: "/terms" },
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Cookie Policy", href: "#" },
    { label: "Data Sources", href: "#" },
  ],
};

/* ------------------------------------------------------------------ */
/* Page                                                               */
/* ------------------------------------------------------------------ */

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ============================================================ */}
      {/* NAV                                                          */}
      {/* ============================================================ */}
      <nav className="glass fixed top-0 right-0 left-0 z-50 border-b border-border">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <a href="/" className="flex items-center gap-2">
            <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15">
              <BarChart3 className="h-5 w-5 text-primary" />
              <span className="animate-pulse-dot absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-success" />
            </div>
            <span className="text-lg font-bold tracking-tight">
              Stock Scanner
            </span>
          </a>

          {/* Center links */}
          <div className="hidden items-center gap-8 md:flex">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Features
            </a>
            <a href="#demo" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Demo
            </a>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Pricing
            </a>
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              API Docs
            </a>
          </div>

          {/* CTA */}
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                Log In
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button size="sm" className="shadow-lg shadow-primary/20">
                Start Free
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ============================================================ */}
      {/* HERO                                                         */}
      {/* ============================================================ */}
      <section className="bg-grid relative overflow-hidden pt-32 pb-24 sm:pt-44 sm:pb-32">
        {/* Animated gradient background */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.07] via-background to-success/[0.04] animate-gradient" />
        {/* Gradient overlay for readability */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/50 via-background/30 to-background" />
        {/* Radial glow */}
        <div className="pointer-events-none absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[800px] rounded-full bg-primary/[0.07] blur-[100px]" />
        {/* Secondary glow */}
        <div className="pointer-events-none absolute top-1/2 right-0 h-[400px] w-[400px] rounded-full bg-success/[0.04] blur-[80px]" />

        <div className="relative mx-auto max-w-4xl px-4 text-center">
          <Badge variant="outline" className="mb-6 gap-1.5 px-3 py-1 text-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse-dot" />
            Scanning 101 stocks live
          </Badge>

          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl leading-[1.1]">
            Know What the Market Did Before.{" "}
            <span className="text-gradient-primary">See What It Might Do Next.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl leading-relaxed">
            AI analyzes 12 technical indicators against 10 years of data to find
            historical pattern matches. Not predictions —{" "}
            <span className="text-foreground font-medium">probabilities</span>.
          </p>

          {/* Social proof stats */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Database className="h-3.5 w-3.5 text-primary" />
              <span>150+ stocks analyzed</span>
            </div>
            <span className="hidden sm:inline text-border">|</span>
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-primary" />
              <span>10 years of data</span>
            </div>
            <span className="hidden sm:inline text-border">|</span>
            <div className="flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-primary" />
              <span>Updated every 15 minutes</span>
            </div>
          </div>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link href="/dashboard">
              <Button size="lg" className="gap-2 text-base shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-shadow">
                Start Analyzing — It&apos;s Free
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <a href="#demo">
              <Button size="lg" variant="outline" className="gap-2 text-base">
                Watch Demo
              </Button>
            </a>
          </div>

          <p className="mt-4 text-sm text-muted-foreground">
            No credit card required&ensp;&#x2022;&ensp;5 analyses/day free&ensp;&#x2022;&ensp;Setup in 30 seconds
          </p>
        </div>
      </section>

      {/* ============================================================ */}
      {/* INTERACTIVE DEMO                                             */}
      {/* ============================================================ */}
      <section id="demo" className="relative mx-auto max-w-6xl px-4 pb-24 sm:px-6 lg:px-8">
        <FeatureDemo />

        {/* CTA below demo */}
        <div className="mt-8 flex flex-col items-center gap-3">
          <p className="text-sm text-muted-foreground">
            This is real data. Sign up to see all 101 live signals.
          </p>
          <Button size="sm" className="gap-1.5 shadow-lg shadow-primary/15">
            Unlock Full Scanner <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </section>

      {/* ============================================================ */}
      {/* TIME MACHINE DEMO                                            */}
      {/* ============================================================ */}
      <section className="border-y border-border bg-gradient-to-b from-card/50 to-background py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            {/* Left — text */}
            <div>
              <Badge variant="outline" className="mb-4 gap-1.5">
                <Clock className="h-3 w-3" />
                Signal Time Machine
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl leading-tight">
                Verify Signals Against{" "}
                <span className="text-gradient-primary">Real Outcomes</span>
              </h2>
              <p className="mt-4 text-muted-foreground leading-relaxed text-lg">
                Travel to any historical date and see what signals our engine
                would have fired. Then compare with what actually happened. Build
                trust in the data, not blind faith.
              </p>

              <div className="mt-6 space-y-3">
                {[
                  "Pick any date in the last 10 years",
                  "See exactly what signals would have fired",
                  "Compare predictions vs actual market outcomes",
                ].map((text) => (
                  <div key={text} className="flex items-start gap-2.5">
                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <Check className="h-3 w-3 text-primary" />
                    </div>
                    <span className="text-sm text-muted-foreground">{text}</span>
                  </div>
                ))}
              </div>

              <Button variant="outline" className="mt-8 gap-2">
                Try Time Machine <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Right — demo card */}
            <div className="relative group">
              {/* Card glow */}
              <div className="absolute -inset-1 rounded-xl bg-gradient-to-br from-warning/20 via-transparent to-success/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm" />

              <div className="relative rounded-xl border border-border bg-card p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-warning/10">
                      <Clock className="h-4 w-4 text-warning" />
                    </div>
                    <span className="text-sm font-semibold">March 23, 2020</span>
                  </div>
                  <Badge variant="outline" className="font-mono text-xs">
                    AAPL
                  </Badge>
                </div>

                {/* Signal fired */}
                <div className="rounded-lg border border-border bg-background p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Signal Fired</p>
                      <p className="mt-0.5 font-semibold">Oversold Bounce</p>
                    </div>
                    <Badge variant="success" className="font-mono text-sm">
                      92% win rate
                    </Badge>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-4 border-t border-border pt-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Price at Signal</p>
                      <p className="mt-0.5 font-mono font-semibold">$57.31</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">6 Months Later</p>
                      <p className="mt-0.5 font-mono font-semibold text-success">
                        $119.05
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Return</p>
                      <p className="mt-0.5 font-mono font-semibold text-success">
                        +108%
                      </p>
                    </div>
                  </div>
                </div>

                {/* Mini chart representation */}
                <div className="mt-4 flex items-end gap-0.5 h-20 px-2">
                  {[40, 35, 28, 22, 18, 15, 12, 10, 8, 10, 14, 20, 28, 35, 42, 50, 55, 60, 65, 70, 74, 78, 82, 85, 88, 90, 93, 96, 98, 100].map(
                    (v, i) => (
                      <div
                        key={i}
                        className={`flex-1 rounded-sm transition-all ${
                          i < 9 ? "bg-destructive/60" : "bg-success/60"
                        }`}
                        style={{ height: `${v}%` }}
                      />
                    ),
                  )}
                </div>
                <div className="mt-1.5 flex justify-between px-2 text-[10px] text-muted-foreground">
                  <span>Mar 2020</span>
                  <span className="text-success font-medium">Signal</span>
                  <span>Sep 2020</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* FEATURES                                                     */}
      {/* ============================================================ */}
      <section id="features" className="py-24 sm:py-32">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Badge variant="outline" className="mb-4 gap-1.5">
              <Sparkles className="h-3 w-3" />
              Features
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Built for Serious Traders
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground text-lg">
              Data-dense tools that respect your time. Every feature is designed
              to reduce noise and surface actionable insights.
            </p>
          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <Card
                key={f.title}
                className={`group relative overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-primary/5 ${f.borderHover}`}
              >
                {/* Gradient background on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${f.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

                <CardHeader className="relative">
                  <div
                    className={`mb-3 flex h-11 w-11 items-center justify-center rounded-xl ${f.iconBg} ${f.accent} transition-transform duration-300 group-hover:scale-110`}
                  >
                    <f.icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-base font-semibold">{f.title}</CardTitle>
                </CardHeader>
                <CardContent className="relative">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {f.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* PRICING                                                      */}
      {/* ============================================================ */}
      <section id="pricing" className="border-t border-border py-24 sm:py-32">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Badge variant="outline" className="mb-4 gap-1.5">
              <Shield className="h-3 w-3" />
              Pricing
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Simple, Transparent Pricing
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground text-lg">
              Start free. Upgrade when you need more power.
            </p>
          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 items-start">
            {PRICING.map((plan) => (
              <Card
                key={plan.name}
                className={`relative flex flex-col transition-all duration-300 hover:scale-[1.02] ${
                  plan.highlighted
                    ? "border-primary glow-indigo-lg scale-[1.02] lg:scale-105"
                    : "hover:border-muted-foreground/20 hover:shadow-lg hover:shadow-primary/5"
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <Badge className="px-3 py-1 shadow-lg shadow-primary/20 text-xs font-semibold">
                      Most Popular
                    </Badge>
                  </div>
                )}

                <CardHeader className="pb-4">
                  <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    {plan.name}
                  </CardTitle>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-5xl font-bold tracking-tight">{plan.price}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {plan.period === "forever" ? (
                      <span>Free forever</span>
                    ) : (
                      <span>per month, billed monthly</span>
                    )}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {plan.description}
                  </p>
                </CardHeader>

                <CardContent className="flex flex-1 flex-col">
                  <ul className="flex-1 space-y-3">
                    {plan.features.map((feat) => (
                      <li key={feat} className="flex items-start gap-2.5 text-sm">
                        <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/10">
                          <Check className="h-2.5 w-2.5 text-primary" />
                        </div>
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className={`mt-8 w-full ${plan.highlighted ? "shadow-lg shadow-primary/20" : ""}`}
                    variant={plan.highlighted ? "default" : "outline"}
                  >
                    {plan.cta}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Trial CTA */}
          <div className="mt-12 text-center">
            <p className="text-sm text-muted-foreground">
              All plans include a{" "}
              <span className="text-foreground font-medium">14-day Pro trial</span>.
              No credit card required.
            </p>
            <Button variant="link" className="mt-2 gap-1.5 text-sm">
              Compare all features <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* FOOTER                                                       */}
      {/* ============================================================ */}
      <footer className="border-t border-border bg-card/30">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          {/* Main footer content */}
          <div className="grid gap-12 py-16 sm:grid-cols-2 lg:grid-cols-5">
            {/* Brand column */}
            <div className="lg:col-span-2">
              <a href="/" className="flex items-center gap-2">
                <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15">
                  <BarChart3 className="h-5 w-5 text-primary" />
                </div>
                <span className="text-lg font-bold tracking-tight">Stock Scanner</span>
              </a>
              <p className="mt-4 max-w-xs text-sm text-muted-foreground leading-relaxed">
                AI-powered technical analysis tools that help traders make
                data-driven decisions with transparent, probability-based signals.
              </p>
              <div className="mt-6 flex items-center gap-2">
                <Badge variant="outline" className="gap-1 text-xs">
                  <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse-dot" />
                  All systems operational
                </Badge>
              </div>
            </div>

            {/* Link columns */}
            {Object.entries(FOOTER_LINKS).map(([category, links]) => (
              <div key={category}>
                <h3 className="text-sm font-semibold text-foreground mb-4">{category}</h3>
                <ul className="space-y-3">
                  {links.map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Bottom bar */}
          <div className="border-t border-border py-8">
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
              <p className="text-xs text-muted-foreground">
                &copy; {new Date().getFullYear()} Stock Scanner. All rights reserved.
              </p>
              <div className="flex items-center gap-6 text-xs text-muted-foreground">
                <a href="/terms" className="hover:text-foreground transition-colors">Terms</a>
                <a href="/privacy" className="hover:text-foreground transition-colors">Privacy</a>
                <a href="#" className="hover:text-foreground transition-colors">Status</a>
              </div>
            </div>

            {/* Disclaimer */}
            <p className="mt-6 text-center text-[11px] text-muted-foreground/50 max-w-3xl mx-auto leading-relaxed">
              Stock Scanner provides data analysis tools for informational purposes only — not financial advice.
              Past performance does not guarantee future results. All trading involves risk and you may lose
              more than your initial investment. Always do your own research and consult a licensed financial
              advisor before making investment decisions.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
