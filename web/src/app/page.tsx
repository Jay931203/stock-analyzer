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
} from "lucide-react";
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
  },
  {
    icon: Activity,
    title: "Real-Time Signal Scanner",
    description:
      "101 stocks scanned across 12 indicators every market day. Surface the signals that matter and filter the noise.",
    accent: "text-success",
  },
  {
    icon: Clock,
    title: "Signal Time Machine",
    description:
      "Travel back to any date and see what signals fired. Compare the prediction with what actually happened next.",
    accent: "text-warning",
  },
  {
    icon: Bell,
    title: "Smart Alerts",
    description:
      "Get notified when high-probability signals fire on your watchlist. Email and push notification support.",
    accent: "text-primary",
  },
  {
    icon: LineChart,
    title: "Interactive Charts",
    description:
      "TradingView-quality charts with overlaid indicators, signal markers, and probability zones. Dark-mode optimized.",
    accent: "text-success",
  },
  {
    icon: Code2,
    title: "Developer API",
    description:
      "Full REST API access. Integrate signals into your own trading systems, bots, or spreadsheets.",
    accent: "text-warning",
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
    period: "/month",
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
    period: "/month",
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

          {/* Center links — hidden on mobile */}
          <div className="hidden items-center gap-8 md:flex">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Features
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
            <Button variant="ghost" size="sm">
              Log In
            </Button>
            <Button size="sm">Start Free</Button>
          </div>
        </div>
      </nav>

      {/* ============================================================ */}
      {/* HERO                                                         */}
      {/* ============================================================ */}
      <section className="bg-grid relative overflow-hidden pt-32 pb-20 sm:pt-40 sm:pb-28">
        {/* Gradient overlay */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background via-background/80 to-background" />
        {/* Radial glow */}
        <div className="pointer-events-none absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[800px] rounded-full bg-primary/5 blur-3xl" />

        <div className="relative mx-auto max-w-4xl px-4 text-center">
          <Badge variant="outline" className="mb-6 gap-1.5 px-3 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse-dot" />
            Scanning 101 stocks live
          </Badge>

          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Know What the Market Did Before.{" "}
            <span className="text-primary">See What It Might Do Next.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
            AI analyzes 12 technical indicators against 10 years of data to find
            historical pattern matches. Not predictions —{" "}
            <span className="text-foreground font-medium">probabilities</span>.
          </p>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button size="lg" className="gap-2 text-base">
              Start Analyzing — It&apos;s Free
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

          <p className="mt-4 text-sm text-muted-foreground">
            No credit card required&ensp;&#x2022;&ensp;5 analyses/day free
          </p>
        </div>
      </section>

      {/* ============================================================ */}
      {/* INTERACTIVE DEMO                                             */}
      {/* ============================================================ */}
      <section className="relative mx-auto max-w-6xl px-4 pb-20 sm:px-6 lg:px-8">
        <FeatureDemo />

        {/* CTA below demo */}
        <div className="mt-6 flex flex-col items-center gap-3">
          <p className="text-sm text-muted-foreground">
            Sign up to see all 101 live signals
          </p>
          <Button size="sm" className="gap-1.5">
            Unlock Full Scanner <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </section>

      {/* ============================================================ */}
      {/* TIME MACHINE DEMO                                            */}
      {/* ============================================================ */}
      <section className="border-y border-border bg-card/50 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            {/* Left — text */}
            <div>
              <Badge variant="outline" className="mb-4 gap-1.5">
                <Clock className="h-3 w-3" />
                Signal Time Machine
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Verify Signals Against{" "}
                <span className="text-primary">Real Outcomes</span>
              </h2>
              <p className="mt-4 text-muted-foreground leading-relaxed">
                Travel to any historical date and see what signals our engine
                would have fired. Then compare with what actually happened. Build
                trust in the data, not blind faith.
              </p>
              <Button variant="outline" className="mt-6 gap-2">
                Try Time Machine <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Right — demo card */}
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-warning" />
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
      </section>

      {/* ============================================================ */}
      {/* FEATURES                                                     */}
      {/* ============================================================ */}
      <section id="features" className="py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Built for Serious Traders
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              Data-dense tools that respect your time. Every feature is designed
              to reduce noise and surface actionable insights.
            </p>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <Card key={f.title} className="group transition-colors hover:border-primary/30">
                <CardHeader>
                  <div
                    className={`mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-muted ${f.accent}`}
                  >
                    <f.icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-base">{f.title}</CardTitle>
                </CardHeader>
                <CardContent>
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
      <section id="pricing" className="border-t border-border py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Simple, Transparent Pricing
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              Start free. Upgrade when you need more power.
            </p>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {PRICING.map((plan) => (
              <Card
                key={plan.name}
                className={`relative flex flex-col ${
                  plan.highlighted
                    ? "border-primary shadow-lg shadow-primary/10"
                    : ""
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge>Most Popular</Badge>
                  </div>
                )}

                <CardHeader>
                  <CardTitle className="text-base font-medium text-muted-foreground">
                    {plan.name}
                  </CardTitle>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-sm text-muted-foreground">
                      {plan.period}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {plan.description}
                  </p>
                </CardHeader>

                <CardContent className="flex flex-1 flex-col">
                  <ul className="flex-1 space-y-3">
                    {plan.features.map((feat) => (
                      <li key={feat} className="flex items-start gap-2 text-sm">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="mt-8 w-full"
                    variant={plan.highlighted ? "default" : "outline"}
                  >
                    {plan.cta}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* FOOTER                                                       */}
      {/* ============================================================ */}
      <footer className="border-t border-border py-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <span className="font-semibold">Stock Scanner</span>
            </div>

            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">
                Terms
              </a>
              <a href="#" className="hover:text-foreground transition-colors">
                Privacy
              </a>
              <a href="#" className="hover:text-foreground transition-colors">
                API Docs
              </a>
              <a href="#" className="hover:text-foreground transition-colors">
                Contact
              </a>
            </div>

            <p className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} Stock Scanner. All rights
              reserved.
            </p>
          </div>

          <p className="mt-8 text-center text-xs text-muted-foreground/60">
            Stock Scanner provides data analysis tools, not financial advice.
            Past performance does not guarantee future results. Always do your
            own research before making investment decisions.
          </p>
        </div>
      </footer>
    </div>
  );
}
