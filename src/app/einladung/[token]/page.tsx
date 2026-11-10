import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { hash, currentMember } from "@/lib/access";
import { joinGroup } from "@/lib/actions";
import { ActionForm, Field } from "@/components/forms";
export const dynamic = "force-dynamic";
export default async function Invitation({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const group = await db.group.findUnique({
    where: { inviteHash: hash(token) },
    include: { _count: { select: { members: true } } },
  });
  if (!group) notFound();
  const member = await currentMember(group.id);
  return (
    <div className="narrow">
      <h1>Einladung</h1>
      <section className="card">
        <span className="badge">
          {group.drawn ? "Bereits ausgelost" : "Teilnahme offen"}
        </span>
        <h2>{group.name}</h2>
        <p>{group._count.members} Personen dabei.</p>
        {group.description && <p className="preserve">{group.description}</p>}
        {group.budget && <p>Budget: {group.budget} €</p>}
        {group.date && (
          <p>
            Termin:{" "}
            {new Date(`${group.date}T12:00:00Z`).toLocaleDateString("de-DE", {
              timeZone: "UTC",
            })}
          </p>
        )}
        <ActionForm
          action={joinGroup.bind(null, token)}
          submit="Ich bin dabei →"
          personal
          idleRedirect={member ? `/gruppe/${group.id}` : undefined}
          idleMessage={
            group.drawn ? "Bereits ausgelost. Beitritt geschlossen." : undefined
          }
        >
          <Field label="Dein Name" name="person" required maxLength={60} />
        </ActionForm>
      </section>
    </div>
  );
}
