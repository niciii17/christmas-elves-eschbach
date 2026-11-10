# Familienwichteln 🎁

Eine private, deutschsprachige Wichtelapp für Smartphone und Desktop. Ohne Registrierung: Einladungslink zum Beitreten, persönlicher Geheimlink und Cookie zum Wiederkommen.

## Lokal starten

Voraussetzung: **Node.js 24 LTS** und npm. Mit nvm: `nvm install && nvm use`.

```bash
npm ci
cp .env.example .env
npm run db:migrate
npm run dev
```

Öffne [localhost:3000](http://localhost:3000). Lokal liegt die SQLite-Datenbank als `dev.db` im Projektverzeichnis. Kein Docker oder Datenbankkonto notwendig. Datenbankdateien und `.env` gehören nicht ins Git-Repository.

## So funktioniert es

1. Runde mit eigenem Namen erstellen. Du bist Organisator und Teilnehmer.
2. **Persönlichen Link sichern**, bevor du zur Runde weitergehst. Das Cookie gilt bis zu einem Jahr; der Link ermöglicht den Zugang auf anderen Geräten.
3. Im Organisatorbereich einen Einladungslink erstellen und mit der Familie teilen. Ein neuer Einladungslink ersetzt den alten; vorhandene Mitglieder bleiben erhalten.
4. Alle treten mit eindeutigem Namen bei und schreiben ihre Wünsche auf. Wünsche können jederzeit angepasst werden.
5. Bei Bedarf Personenpaare ausschließen. Die Regel gilt in beide Richtungen.
6. Ab zwei Personen auslosen. Jede Person gibt und erhält genau ein Geschenk. Nur die eigene Zuordnung und die Wünsche des eigenen Wichtelkindes sind zugänglich.
7. Nach der Auslosung ist der Teilnehmerkreis gesperrt. Zurücksetzen hebt alle Zuordnungen auf und öffnet die Runde wieder; Wünsche bleiben erhalten.

**Geheimlinks sind Zugangsdaten.** Nicht in den Familienchat schicken. Auf gemeinsam genutzten Geräten getrennte Browserprofile verwenden; pro Browser und Gruppe kann eine Identität aktiv sein. Mehrere verschiedene Gruppen werden parallel unterstützt.

Eigene persönliche Links können erneuert werden; bisherige Sitzungen bleiben dabei gültig. Ein vom Organisator ausgestellter Ersatzlink sperrt dagegen sämtliche alten Links und Sitzungen der betroffenen Person. Der Organisator kann sich damit technisch als diese Person anmelden. Für den verlorenen Organisatorzugang gibt es keine Hintertür: seinen Link besonders gut sichern.

## Auf Vercel veröffentlichen: SQLite mit Turso

Vercel hat kein dauerhaft beschreibbares lokales Dateisystem. Eine lokale SQLite-Datei wäre dort kein zuverlässiger Datenspeicher. Deshalb verwendet die App in Produktion **Turso (libSQL, SQLite-kompatibel)**. Die Anwendung und das Datenmodell sind lokal und auf Vercel identisch; nur Verbindungsvariablen unterscheiden sich. Es wird kein Neon/PostgreSQL benötigt.

### 1. Turso direkt in Vercel verbinden (empfohlen)

Im Vercel-Projekt unter **Storage → Marketplace → Turso** eine Datenbank erstellen oder eine bestehende verbinden. Beim Verbinden die Umgebung **Production** auswählen. Die Integration setzt automatisch:

```dotenv
TURSO_DATABASE_URL="libsql://DEINE-DATENBANK.turso.io"
TURSO_AUTH_TOKEN="DEIN-TOKEN"
```

Keine Zugangsdaten ins Repository übernehmen. `TURSO_DATABASE_URL` hat Vorrang vor `DATABASE_URL`. Bei einem benutzerdefinierten Variablenpräfix die beiden Variablen zusätzlich unter diesen exakten Namen bereitstellen.

### 2. Vercel-Projekt konfigurieren und deployen

1. Repository in Vercel importieren und **Next.js** sowie Node.js **24.x** auswählen. Install Command: `npm ci`.
2. Prüfen, dass `TURSO_DATABASE_URL` und `TURSO_AUTH_TOKEN` für **Production** vorhanden sind. Kein `NEXT_PUBLIC_`-Präfix verwenden.
3. Die eingecheckte `vercel.json` setzt den Build Command auf `npm run vercel-build`. Dieser initialisiert die Datenbank mit den versionierten Migrationen und baut anschließend die App.
4. Nach dem Verbinden oder Ändern von Variablen **neu deployen**. Bereits laufende Deployments übernehmen neue Variablen nicht.

Bereits angewandte Migrationen werden anhand ihrer Prüfsummen übersprungen. Die Prüfung und Anwendung jeder Migration erfolgt unter derselben Schreibsperre, damit parallele Builds keine Migration doppelt anwenden. Eine fehlende Verbindung, fehlende Berechtigungen oder veränderte bestehende Migration brechen den Build ab. Auf Vercel ist kein Rückfall auf eine temporäre lokale SQLite-Datei erlaubt.

**Preview-Deployments:** Eine eigene Turso-Datenbank für Preview verbinden. Preview und Production dürfen nicht dieselbe Datenbank verwenden.

### 3. Alternative: Turso manuell verbinden

Bei einem bestehenden [Turso-Konto](https://turso.tech) die [CLI](https://docs.turso.tech/cli/installation) verwenden:

```bash
turso auth login
turso db create familienwichteln
turso db show familienwichteln --url
turso db tokens create familienwichteln
```

Die URL als `TURSO_DATABASE_URL` und den Token als `TURSO_AUTH_TOKEN` in Vercel hinterlegen. Eine bisher manuell gesetzte `DATABASE_URL` mit Turso-URL wird ebenfalls unterstützt. Anschließend neu deployen; die Tabellen werden automatisch angelegt.

Für manuelle Migrationen kann lokal eine ignorierte `.env.production` mit diesen Variablen angelegt werden:

```bash
node --env-file=.env.production scripts/migrate.mjs
```

`prisma migrate deploy` wird für diesen Workflow nicht verwendet. Vor künftigen Schemaänderungen Backups anlegen und neue Migrationen in Preview testen. Da Migrationen vor dem neuen Code ausgeführt werden, müssen sie mit dem noch laufenden Deployment kompatibel sein; Änderungen in getrennten Schritten ausrollen, wenn nötig.

### 4. Funktionstest nach Veröffentlichung

- Runde erstellen, persönlichen Link sichern und Einladung kopieren.
- In einem anderen Browser beitreten und einen Wunsch speichern.
- Auslosen, beide Ergebnisse prüfen und einen Wunsch ändern.
- Persönlichen Link auf dem Handy öffnen; Seite neu laden und Cookie-Rückkehr prüfen.
- Ersatzlink testen: Der alte Link und die alte Sitzung dürfen danach nicht mehr funktionieren.

## Entwicklung und Tests

```bash
npm run typecheck
npm run lint
npm test
npx playwright install chromium
npm run test:e2e
npm run build
npm run format:check
```

Die Integrationstests erstellen eine temporäre SQLite-Datenbank und löschen sie anschließend. Sie prüfen Berechtigungen, Zugangswiederherstellung, unmögliche Ausschlüsse und konkurrierende Änderungen. Playwright verwendet eine separate `e2e.db`, startet selbst einen lokalen Server auf Port 3100 und prüft den Familienablauf mit mehreren Browserkontexten einschließlich mobiler Ansicht. Screenshots liegen danach in `test-results/`.

### Neue Datenbankmigration

Nach Änderung von `prisma/schema.prisma` SQL als neue Migration erzeugen (bestehende Dateien nicht ändern):

```bash
npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script
```

Die Ausgabe prüfen und unter `prisma/migrations/<zeitstempel>_<name>/migration.sql` speichern. Danach `npm run db:generate` und `npm run db:migrate`. Der einfache Migrationsrunner trennt SQL-Anweisungen an Semikolons: keine Trigger oder Stringliterale mit eingebetteten Semikolons verwenden. Für komplexe SQLite-Tabellenumbauten Migrationen manuell prüfen und separat vorbereiten.

## Aufbau und Sicherheit

- `src/app`: Seiten und Routen mit App Router; Änderungen laufen über Server Actions.
- `src/components`: Formulare, Linkfreigabe und Wunschlisten.
- `src/lib`: Validierung, Authentifizierung, Datenzugriff und reine Auslosungslogik.
- `prisma`: Schema und versionierte SQL-Migrationen.
- `tests`: Logik-, Datenbank- und Browserprüfungen.

Alle Schreibzugriffe einer Runde beginnen innerhalb einer Transaktion mit einer Aktualisierung der Gruppenrevision. Diese gemeinsame Schreibsperre verhindert inkonsistente Teilnehmerlisten und doppelte Auslosungen. Bei konkurrierenden Zugriffen kann eine Anfrage mit einer wiederholbaren Fehlermeldung abbrechen. SQLite serialisiert Schreibzugriffe; die App ist für kleine private Familienrunden gedacht.

Tokens enthalten 256 Bit Zufall und werden ausschließlich gehasht gespeichert. Persönliche Links transportieren den Token im URL-Fragment; er wird vor dem Einlösen aus der Adresszeile entfernt. Cookies sind HttpOnly und SameSite=Lax, unter HTTPS zusätzlich Secure. Private Seiten sind dynamisch und werden nicht öffentlich zwischengespeichert. Jede Server Action prüft Mitgliedschaft, Rolle und Besitz. Der Browser erhält nie die vollständige Zuordnungstabelle. Datenbankbetreiber haben technisch Zugriff auf gespeicherte Zuordnungen; es gibt keine Ende-zu-Ende-Verschlüsselung.

Die Auslosung verwendet zufällig angeordnete Kandidaten und vollständiges bipartites Matching, ohne Selbstziehungen und unter Berücksichtigung gegenseitiger Ausschlüsse. Eine mathematisch gleichverteilte Auswahl aller möglichen Zuordnungen wird nicht zugesagt.

Keine Analysewerkzeuge, E-Mails oder extern geladenen Schriftarten. Notwendige Cookies werden auf der Hinweisseite erklärt. Dies ist eine private Familienapp; für einen öffentlichen Dienst wären zusätzliche Schutzmechanismen wie Ratenbegrenzung und eine geregelte Datenaufbewahrung nötig.

### Daten löschen und sichern

Lokale Daten: Server beenden, `dev.db` samt eventuellen `-wal`-/`-shm`-Dateien entfernen, dann `npm run db:migrate` ausführen.

Produktion: Turso-Backupmöglichkeiten nutzen. Einzelne Gruppen können über eine **parametrisierte** Datenbankabfrage `DELETE FROM "Group" WHERE id = ?` gelöscht werden; bei aktivierter Foreign-Key-Unterstützung werden Mitglieder, Wünsche, Zugänge und Zuordnungen mit entfernt. Vor manuellen Löschungen ein Backup erstellen. Tokens und produktive Daten niemals in Diagnoseausgaben oder Screenshots teilen.

## Linkvorschau und Favicon

Open Graph und Twitter verwenden dieselbe allgemeine Vorschau mit dem Geschenk der Startseite und „«Neue Runde. Neue Chance auf etwas Brauchbares.»“. Gruppennamen, Teilnehmer, Wünsche und Zuordnungen erscheinen nicht in den Metadaten. Das Geschenk dient auch als Favicon und Apple-Touch-Icon.

Auf Vercel wird die Bild-Domain automatisch aus den Deployment-Variablen ermittelt. Bei einer eigenen Domain `SITE_URL=https://deine-domain.example` für Production setzen und erneut deployen. Lokal ist der Standard `http://localhost:3000`; für einen anderen Port `SITE_URL` anpassen. Öffentlich erreichbare HTTPS-URLs sind für echte Messenger-Vorschauen nötig; localhost ist nur lokal erreichbar.

Nach Änderungen an der Geschenkzeichnung lassen sich die eingecheckten Bilddateien neu erzeugen:

```bash
npx playwright install chromium
node scripts/generate-brand-assets.mjs
```

Die Bildgenerierung liest ausschließlich die statische Illustration und CSS. Sie benötigt weder Datenbank noch App-Server und läuft nicht beim Deployment. Messenger können alte Vorschauen zwischenspeichern.
