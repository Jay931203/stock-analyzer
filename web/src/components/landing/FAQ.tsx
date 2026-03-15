"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ChevronDown, HelpCircle } from "lucide-react";

const FAQ_ITEMS = [
  {
    question: "How accurate are the signals?",
    answer:
      "Our signals show historical win rates of 55-80%. We show probabilities, not predictions. Every signal comes with transparent data on how often similar patterns led to positive outcomes over the past 10 years.",
  },
  {
    question: "What data do you use?",
    answer:
      "10 years of daily OHLCV data for 150+ US stocks and ETFs. We analyze 12 different technical indicators across this dataset to find statistically significant pattern matches.",
  },
  {
    question: "Can I try before paying?",
    answer:
      "Yes! The Free plan includes 5 analyses per day and full Time Machine access. No credit card required. Upgrade to Pro when you need unlimited analyses and the full signal scanner.",
  },
  {
    question: "How often are signals updated?",
    answer:
      "Signals are refreshed daily at market close. The scanner processes all 101 tracked stocks against 12 indicators and publishes results before the next trading day opens.",
  },
  {
    question: "Do you provide investment advice?",
    answer:
      "No. Stock Scanner is a screening and analysis tool, not financial advice. We surface historical probabilities to help inform your own research. Always consult a licensed financial advisor before making investment decisions.",
  },
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="py-24 sm:py-32">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4 gap-1.5">
            <HelpCircle className="h-3 w-3" />
            FAQ
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Frequently Asked Questions
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground text-lg">
            Everything you need to know about Stock Scanner.
          </p>
        </div>

        <div className="space-y-3">
          {FAQ_ITEMS.map((item, i) => {
            const isOpen = openIndex === i;
            return (
              <div
                key={item.question}
                className={cn(
                  "rounded-xl border transition-all duration-300",
                  isOpen
                    ? "border-primary/30 bg-primary/[0.03]"
                    : "border-border bg-card/50 hover:border-muted-foreground/20",
                )}
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className="flex w-full items-center justify-between px-5 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset rounded-xl"
                  aria-expanded={isOpen}
                >
                  <span className="text-sm font-medium text-foreground pr-4">
                    {item.question}
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300",
                      isOpen && "rotate-180 text-primary",
                    )}
                  />
                </button>
                <div
                  className={cn(
                    "overflow-hidden transition-all duration-300 ease-out",
                    isOpen ? "max-h-48 opacity-100" : "max-h-0 opacity-0",
                  )}
                >
                  <p className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed">
                    {item.answer}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
