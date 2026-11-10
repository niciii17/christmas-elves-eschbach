"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="narrow card">
      <h1>Laden fehlgeschlagen</h1>
      <p>Bitte versuche es erneut.</p>
      <button className="button" onClick={reset}>
        Erneut versuchen
      </button>
    </div>
  );
}
