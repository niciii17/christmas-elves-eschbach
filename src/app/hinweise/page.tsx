export default function Information() {
  return (
    <div className="narrow prose">
      <h1>Zugang & Datenschutz</h1>
      <section className="card">
        <h2>Dein Link ist dein Schlüssel</h2>
        <p>
          Es gibt keine Benutzerkonten. Wer deinen persönlichen Geheimlink
          besitzt, kann deine Wünsche und dein Wichtelergebnis sehen und
          bearbeiten. Teile ihn nicht in der Familiengruppe. Der Einladungslink
          ist zum gemeinsamen Teilen gedacht.
        </p>
        <h2>Wiederkommen & Geräte teilen</h2>
        <p>
          Ein notwendiges Sitzungscookie speichert deinen Zugang für bis zu ein
          Jahr. Auf einem anderen Gerät öffnest du deinen persönlichen Link. Pro
          Gruppe kann in einem Browser eine Person aktiv sein. Beim Wechsel wird
          deren Zugang ersetzt; verwendet auf gemeinsamen Geräten am besten
          getrennte Browserprofile.
        </p>
        <h2>Link verloren?</h2>
        <p>
          Mit aktivem Zugang kannst du einen neuen persönlichen Link erstellen.
          Sonst kann der Organisator einen Ersatzlink ausstellen. Dabei werden
          alle bisherigen Links und Sitzungen deiner Identität ungültig. Der
          Organisator könnte mit einem Ersatzlink auch deine Identität öffnen.
          Bewahre den Organisatorlink besonders sicher auf: Dafür gibt es keinen
          Wiederherstellungszugang.
        </p>
        <h2>Gespeicherte Daten</h2>
        <p>
          Gespeichert werden Gruppendaten, Namen, Wünsche, Ausschlüsse,
          Zuordnungen und gehashte Zugangstokens. Die App verwendet keine
          Werbung oder Analysewerkzeuge. Der Betrieb auf Vercel und Turso
          erzeugt technisch notwendige Verbindungsdaten. Wünsche sehen nur du
          und die Person, die dich beschenkt; die Datenbankbetreiber können
          technisch auf gespeicherte Inhalte zugreifen.
        </p>
        <h2>Daten entfernen</h2>
        <p>
          Der Organisator kann vor der Auslosung Mitglieder samt Wünschen und
          Zugängen entfernen. Für das vollständige Löschen einer Gruppe wende
          dich an die Person, die diese private Familienapp betreibt. Sie kann
          die Gruppe in der Datenbank löschen.
        </p>
      </section>
    </div>
  );
}
