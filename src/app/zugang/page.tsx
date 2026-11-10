"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { redeemAccess } from "@/lib/actions";
export default function Access() {
  const started = useRef(false);
  const [message, setMessage] = useState("Zugang wird geöffnet …");
  const router = useRouter();
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const token = window.location.hash.slice(1);
    window.history.replaceState(null, "", "/zugang");
    if (!token) {
      queueMicrotask(() =>
        setMessage(
          "Öffne deinen vollständigen Geheimlink. Verloren? Bitte den Organisator um einen Ersatzlink.",
        ),
      );
      return;
    }
    redeemAccess(token)
      .then((result) => {
        if (result.redirect) router.replace(result.redirect);
        else
          setMessage(
            result.error || "Der Zugang konnte nicht geöffnet werden.",
          );
      })
      .catch(() =>
        setMessage(
          "Keine Verbindung. Bitte öffne deinen persönlichen Link erneut.",
        ),
      );
  }, [router]);
  return (
    <div className="narrow">
      <section className="card">
        <h1>Dein Zugang</h1>
        <p role="status">{message}</p>
        <Link className="text-link" href="/">
          Zur Startseite →
        </Link>
      </section>
    </div>
  );
}
