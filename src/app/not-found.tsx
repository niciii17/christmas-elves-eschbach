import Link from "next/link";
export default function NotFound() {
  return (
    <div className="narrow card">
      <h1>Link nicht gefunden</h1>
      <p>Bitte frage nach einem aktuellen Link.</p>
      <Link className="button" href="/">
        Zur Startseite
      </Link>
    </div>
  );
}
