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
function WishEntry({
  wish,
  number,
  children,
  variant = "card",
}: {
  wish: Wish;
  number: number;
  children?: ReactNode;
  variant?: "card" | "row";
}) {
  const Title = variant === "row" ? "h4" : "h3";
  return (
    <article className={`wish-${variant}${children ? " own-wish" : ""}`}>
      <div className={`wish-${variant}-heading`}>
        {variant === "card" && (
          <span className="wish-icon" aria-hidden="true">
            <Gift size={20} strokeWidth={1.5} />
          </span>
        )}
        <Title>{wish.title}</Title>
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
  return (
    <section className="recipient-wishlist" aria-label="Wunschliste">
      <div className="recipient-wishlist-heading">
        <Gift size={18} strokeWidth={1.5} aria-hidden="true" />
        <h3>Wunschliste</h3>
        <span className="count">{wishes.length}</span>
      </div>
      {wishes.length ? (
        <ul className="recipient-wishes">
          {wishes.map((wish, index) => (
            <li key={wish.id}>
              <WishEntry wish={wish} number={index + 1} variant="row" />
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">Noch keine Wünsche.</p>
      )}
    </section>
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
              <WishEntry wish={wish} number={index + 1}>
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
              </WishEntry>
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
