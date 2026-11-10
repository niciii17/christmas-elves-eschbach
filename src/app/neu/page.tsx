import Link from "next/link";
import { ActionForm, Field } from "@/components/forms";
import { createGroup } from "@/lib/actions";
export default function NewGroup() {
  return (
    <div className="narrow">
      <Link href="/" className="back">
        ← Zurück
      </Link>
      <h1>Runde erstellen</h1>
      <section className="card">
        <ActionForm action={createGroup} submit="Erstellen" personal>
          <Field label="Gruppenname" name="name" required maxLength={100} />
          <Field label="Dein Name" name="person" required maxLength={60} />
          <div className="two-fields">
            <Field
              label="Budget in Euro · optional"
              name="budget"
              maxLength={30}
            />
            <Field label="Termin · optional" name="date" type="date" />
          </div>
          <label>
            Nachricht · optional
            <textarea name="description" maxLength={2000} rows={3} />
          </label>
        </ActionForm>
      </section>
    </div>
  );
}
