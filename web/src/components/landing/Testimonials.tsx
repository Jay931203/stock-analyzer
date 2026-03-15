import { Card, CardContent } from "@/components/ui/card";

const TESTIMONIALS = [
  {
    quote: "Finally a tool that shows probabilities, not predictions.",
    handle: "@trader_mike",
    role: "Swing Trader",
    avatar: "TM",
    accentColor: "bg-primary/10 text-primary",
  },
  {
    quote: "The Time Machine feature alone is worth the subscription.",
    handle: "@quantjane",
    role: "Quantitative Analyst",
    avatar: "QJ",
    accentColor: "bg-success/10 text-success",
  },
  {
    quote: "I use the signal scanner every morning before market open.",
    handle: "@daytrader_ko",
    role: "Day Trader",
    avatar: "DK",
    accentColor: "bg-warning/10 text-warning",
  },
];

export function Testimonials() {
  return (
    <section className="py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Trusted by Traders
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground text-lg">
            See what traders are saying about Stock Scanner.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <Card
              key={t.handle}
              className="group relative overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-primary/5 hover:border-muted-foreground/20"
            >
              <CardContent className="pt-6">
                {/* Quote mark */}
                <span className="absolute top-4 right-5 text-5xl font-serif text-muted-foreground/10 leading-none select-none">
                  &ldquo;
                </span>

                <p className="text-base text-foreground leading-relaxed relative z-10">
                  &ldquo;{t.quote}&rdquo;
                </p>

                <div className="mt-6 flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${t.accentColor}`}
                  >
                    {t.avatar}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {t.handle}
                    </p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
