import Link from "next/link";
import { FestiveQuote } from "@/components/festive-quote";
import { Users, CalendarDays, Coins, ShieldCheck } from "lucide-react";
import { db } from "@/lib/db";
import { currentMember } from "@/lib/access";
import { groupAction } from "@/lib/actions";
import { ActionForm } from "@/components/forms";
import { OwnWishes, WishList } from "@/components/wishes";
export const dynamic = "force-dynamic";
export default async function GroupPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const member = await currentMember(id);
  if (!member)
    return (
      <div className="narrow">
        <section className="card">
          <h1>Dein Zugang fehlt.</h1>
          <p>
            Öffne deinen persönlichen Geheimlink. Falls du ihn verloren hast,
            bitte den Organisator um einen Ersatzlink.
          </p>
          <Link className="button" href="/">
            Zur Startseite
          </Link>
        </section>
      </div>
    );
  const group = await db.group.findUniqueOrThrow({
    where: { id },
    include: {
      members: {
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true, organizer: true },
      },
      exclusions: member.organizer,
    },
  });
  // Only load this member's assignment and the corresponding recipient's wishes.
  const own = await db.member.findUniqueOrThrow({
    where: { id: member.id },
    include: {
      wishes: { orderBy: { createdAt: "asc" } },
      giving: {
        include: {
          recipient: { include: { wishes: { orderBy: { createdAt: "asc" } } } },
        },
      },
    },
  });
  const action = (op: string) => groupAction.bind(null, id, op);
  const name = (personId: string) =>
    group.members.find((m) => m.id === personId)?.name || "Entfernte Person";
  return (
    <div className="dashboard">
      <Link href="/" className="back">
        ← Meine Runden
      </Link>
      <div className="dashboard-heading">
        <div>
          <h1>{group.name}</h1>
        </div>
        <span className="badge">
          ● {group.drawn ? "Ausgelost" : "Teilnahme offen"}
        </span>
      </div>
      {group.description && (
        <p className="intro preserve">{group.description}</p>
      )}
      <div className="dashboard-grid">
        <div className="main-column">
          <section
            className={`card result-card${group.drawn ? "" : " result-card-pending"}`}
          >
            {group.drawn && own.giving ? (
              <>
                <FestiveQuote>
                  <span>Dein Wichtelkind steht fest.</span>{" "}
                  <span>
                    Mein <em>Beileid</em> an beide.
                  </span>
                </FestiveQuote>
                <h2 className="task-heading">Du beschenkst …</h2>
                <details className="reveal">
                  <summary>Wichtelkind aufdecken</summary>
                  <div className="recipient-name">
                    {own.giving.recipient.name}
                  </div>
                  <h3>Wünsche</h3>
                  <WishList wishes={own.giving.recipient.wishes} />
                </details>
              </>
            ) : (
              <>
                <h2>Noch nicht ausgelost</h2>
                <p className="family-quote">
                  Damit das Geschenk nicht erst in zwei Jahren kommt. Oder doch?
                </p>
              </>
            )}
          </section>
          <OwnWishes groupId={id} wishes={own.wishes} />
        </div>
        <aside className="side-column">
          <section className="card" aria-labelledby="round-heading">
            <h2 id="round-heading">Eure Runde</h2>
            <div className="facts">
              <span>
                <Users size={17} /> {group.members.length}{" "}
                {group.members.length === 1 ? "Person" : "Personen"}
              </span>
              {group.budget && (
                <span>
                  <Coins size={17} /> {group.budget} € Budget
                </span>
              )}
              {group.date && (
                <span>
                  <CalendarDays size={17} />{" "}
                  {new Date(`${group.date}T12:00:00Z`).toLocaleDateString(
                    "de-DE",
                    {
                      timeZone: "UTC",
                    },
                  )}
                </span>
              )}
            </div>
            <ul className="members">
              {group.members.map((person, i) => (
                <li key={person.id}>
                  <span className={`avatar avatar-${i % 3}`}>
                    {person.name.slice(0, 1).toUpperCase()}
                  </span>
                  <span>
                    {person.name}
                    {person.id === member.id && <small>Du</small>}
                    {person.organizer && <small>Organisator</small>}
                  </span>
                </li>
              ))}
            </ul>
          </section>
          <section className="card access-card">
            <ShieldCheck size={25} />
            <h2>Dein Zugang</h2>
            <ActionForm
              action={action("recovery")}
              submit="Geheimlink erneuern"
              personal
            />
            <Link href="/hinweise" className="text-link">
              Zugang & Hilfe
            </Link>
          </section>
        </aside>
      </div>
      {member.organizer && (
        <section className="card admin">
          <h2>Verwaltung</h2>
          <div className="admin-grid">
            <div>
              <h3>Einladen</h3>
              <ActionForm action={action("invite")} submit="Einladungslink" />
              {!group.drawn && (
                <>
                  <h3>Auslosen</h3>
                  <ActionForm
                    action={action("draw")}
                    submit="Auslosen"
                    confirm="Sind alle dabei? Nach der Auslosung können keine weiteren Personen beitreten."
                  />
                </>
              )}
              {group.drawn && (
                <>
                  <h3>Auslosung zurücksetzen</h3>
                  <ActionForm
                    action={action("reset")}
                    submit="Auslosung aufheben"
                    confirm="Alle Zuordnungen werden aufgehoben. Bereits angesehene Ergebnisse lassen sich nicht vergessen machen. Wirklich zurücksetzen?"
                  >
                    <label className="checkbox">
                      <input
                        type="checkbox"
                        name="confirm"
                        value="yes"
                        required
                      />{" "}
                      Alle Zuordnungen aufheben. Wünsche bleiben erhalten.
                    </label>
                  </ActionForm>
                </>
              )}
            </div>
            <div>
              <h3>Ausschlüsse</h3>
              <p>Diese Personen beschenken sich nicht gegenseitig.</p>
              <ul className="exclusions">
                {group.exclusions.map((pair) => (
                  <li key={pair.id}>
                    <span>
                      {name(pair.firstId)} ↔ {name(pair.secondId)}
                    </span>
                    {!group.drawn && (
                      <ActionForm
                        action={action("unexclude")}
                        submit="Entfernen"
                      >
                        <input type="hidden" name="id" value={pair.id} />
                      </ActionForm>
                    )}
                  </li>
                ))}
              </ul>
              {!group.drawn && (
                <ActionForm
                  action={action("exclude")}
                  submit="Paar ausschließen"
                >
                  <div className="two-fields">
                    <label>
                      Erste Person
                      <select name="firstId" required defaultValue="">
                        <option value="" disabled>
                          Auswählen
                        </option>
                        {group.members.map((m) => (
                          <option value={m.id} key={m.id}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Zweite Person
                      <select name="secondId" required defaultValue="">
                        <option value="" disabled>
                          Auswählen
                        </option>
                        {group.members.map((m) => (
                          <option value={m.id} key={m.id}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </ActionForm>
              )}
            </div>
          </div>
          <details className="manage-members">
            <summary>Teilnehmer & Zugänge</summary>
            <p>
              Ersatzlinks sperren alte Zugänge und erlauben auch dir Zugriff auf
              die Identität. Nur an die jeweilige Person weitergeben.
            </p>
            {group.members
              .filter((m) => m.id !== member.id)
              .map((m) => (
                <div className="member-management" key={m.id}>
                  <h3>{m.name}</h3>
                  <ActionForm
                    action={action("replace-access")}
                    submit="Ersatzlink erstellen"
                    personal
                    confirm={`Alle bisherigen Zugänge von ${m.name} sperren und einen Ersatzlink erstellen?`}
                  >
                    <input name="id" type="hidden" value={m.id} />
                  </ActionForm>
                  {!group.drawn && (
                    <ActionForm
                      action={action("remove-member")}
                      submit="Person entfernen"
                      confirm={`${m.name} samt Wünschen und Zugang wirklich entfernen?`}
                    >
                      <input name="id" type="hidden" value={m.id} />
                    </ActionForm>
                  )}
                </div>
              ))}
          </details>
        </section>
      )}
    </div>
  );
}
