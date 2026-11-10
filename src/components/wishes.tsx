import type { Wish } from "@prisma/client";
import { FestiveQuote } from "./festive-quote";
import type { ReactNode } from "react";
import { Gift } from "lucide-react";
import { groupAction } from "@/lib/actions";
import { ActionForm, Field } from "./forms";
function WishFields({ wish }: { wish?: Wish }) {
  return (
    <>
      <input type="hidden" name="id" value={wish?.id ?? ""} />
      <Field
        label="Dein Wunsch"
        name="title"
        required
        value={wish?.title}
        maxLength={150}
      />
      <label>
        Beschreibung · optional
        <textarea
          name="description"
          defaultValue={wish?.description}
          maxLength={2000}
          rows={3}
        />
      </label>
      <Field
        label="Link · optional"
        name="url"
        type="url"
        value={wish?.url}
        maxLength={2048}
      />
    </>
  );
}
function WishCard({
  wish,
  number,
  children,
}: {
  wish: Wish;
  number: number;
  children?: ReactNode;
}) {
  return (
    <article className={`wish-card${children ? " own-wish" : ""}`}>
      <div className="wish-card-heading">
        <span className="wish-icon" aria-hidden="true">
          <Gift size={20} strokeWidth={1.5} />
        </span>
        <h3>{wish.title}</h3>
        <span className="wish-number" aria-hidden="true">
          {String(number).padStart(2, "0")}
        </span>
      </div>
      {wish.description && (
        <p className="wish-description preserve">{wish.description}</p>
      )}
      {wish.url && (
        <a
          href={wish.url}
          target="_blank"
          rel="noopener noreferrer"
          className="wish-link"
        >
          Wunsch ansehen ↗
        </a>
      )}
      {children}
    </article>
  );
}
export function WishList({ wishes }: { wishes: Wish[] }) {
  if (!wishes.length) return <p className="muted">Noch keine Wünsche.</p>;
  return (
    <ul className="wish-list">
      {wishes.map((wish, index) => (
        <li key={wish.id}>
          <WishCard wish={wish} number={index + 1} />
        </li>
      ))}
    </ul>
  );
}
export function OwnWishes({
  groupId,
  wishes,
}: {
  groupId: string;
  wishes: Wish[];
}) {
  return (
    <section className="card">
      <FestiveQuote>
        <span>
          Damit dein <strong>Lächeln</strong>
        </span>{" "}
        <span>
          beim Auspacken <em>echt ist.</em>
        </span>
      </FestiveQuote>
      <h2 className="task-heading">
        Deine Wunschliste <span className="count">{wishes.length}</span>
      </h2>
      {!!wishes.length && (
        <ul className="wish-list">
          {wishes.map((wish, index) => (
            <li key={wish.id}>
              <WishCard wish={wish} number={index + 1}>
                <details>
                  <summary>Bearbeiten</summary>
                  <ActionForm
                    action={groupAction.bind(null, groupId, "wish-save")}
                  >
                    <WishFields wish={wish} />
                  </ActionForm>
                  <ActionForm
                    action={groupAction.bind(null, groupId, "wish-delete")}
                    submit="Wunsch entfernen"
                    confirm="Diesen Wunsch wirklich entfernen?"
                  >
                    <input type="hidden" name="id" value={wish.id} />
                  </ActionForm>
                </details>
              </WishCard>
            </li>
          ))}
        </ul>
      )}
      <details className="add-wish">
        <summary>＋ Wunsch hinzufügen</summary>
        <ActionForm
          action={groupAction.bind(null, groupId, "wish-save")}
          submit="Wunsch hinzufügen"
        >
          <WishFields />
        </ActionForm>
      </details>
    </section>
  );
}
