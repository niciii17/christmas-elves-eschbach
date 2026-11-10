import type { ReactNode } from "react";

export function FestiveQuote({
  children,
  hero = false,
}: {
  children: ReactNode;
  hero?: boolean;
}) {
  return (
    <div className={`festive-quote${hero ? " festive-quote-hero" : ""}`}>
      <p className={hero ? "hero-quote" : "family-quote family-quote-featured"}>
        {children}
      </p>
    </div>
  );
}
