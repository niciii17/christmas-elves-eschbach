"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { Snowflake, Star } from "lucide-react";

const confettiColors = ["#ae554a", "#c39a52", "#42634c"];

function ChristmasConfetti() {
  return (
    <div className="reveal-confetti" aria-hidden="true">
      {Array.from({ length: 36 }, (_, index) => (
        <span
          className="confetti-piece"
          key={index}
          style={
            {
              "--left": `${(index * 37) % 100}%`,
              "--drift": `${((index * 53) % 180) - 90}px`,
              "--turn": `${(index % 2 ? -1 : 1) * (180 + index * 23)}deg`,
              "--delay": `${(index % 7) * 45}ms`,
              "--duration": `${1600 + (index % 5) * 160}ms`,
              color: confettiColors[index % confettiColors.length],
            } as CSSProperties
          }
        >
          {index % 6 === 0 ? (
            <Snowflake size={17} />
          ) : index % 3 === 0 ? (
            <Star size={14} fill="currentColor" strokeWidth={0} />
          ) : (
            <span className="confetti-ribbon" />
          )}
        </span>
      ))}
    </div>
  );
}

export function WichtelReveal({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<"hidden" | "opening" | "revealed">(
    "hidden",
  );
  const [confetti, setConfetti] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (phase !== "opening") return;
    const timer = window.setTimeout(() => setPhase("revealed"), 220);
    return () => window.clearTimeout(timer);
  }, [phase]);

  useEffect(() => {
    if (phase === "revealed")
      contentRef.current?.focus({ preventScroll: true });
  }, [phase]);

  useEffect(() => {
    if (!confetti) return;
    const timer = window.setTimeout(() => setConfetti(false), 2800);
    return () => window.clearTimeout(timer);
  }, [confetti]);

  function reveal() {
    if (phase !== "hidden") return;
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    setConfetti(!reducedMotion);
    setPhase(reducedMotion ? "revealed" : "opening");
  }

  return (
    <div className="wichtel-reveal">
      {phase !== "revealed" ? (
        <button
          type="button"
          className={`button reveal-button${phase === "opening" ? " is-opening" : ""}`}
          disabled={phase === "opening"}
          onClick={reveal}
        >
          Wichtelkind aufdecken
        </button>
      ) : (
        <div
          className="reveal-content"
          ref={contentRef}
          tabIndex={-1}
          role="region"
          aria-label="Dein Wichtelkind"
        >
          {children}
        </div>
      )}
      {confetti && <ChristmasConfetti />}
    </div>
  );
}
