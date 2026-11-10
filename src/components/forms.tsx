"use client";
import { useActionState, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ActionState } from "@/lib/actions";

export function ShareLink({
  path,
  personal = false,
}: {
  path: string;
  personal?: boolean;
}) {
  const [feedback, setFeedback] = useState("");
  const [displayLink, setDisplayLink] = useState(path);
  const url = () => new URL(path, window.location.origin).href;
  return (
    <div className="share-box">
      <strong>{personal ? "Dein Geheimlink" : "Link zum Teilen"}</strong>
      <p>
        {personal
          ? "Sicher aufbewahren: Wer den Link hat, hat Zugriff."
          : "Nur mit deiner Familie teilen."}
      </p>
      <div className="button-row">
        <button
          type="button"
          className="button secondary"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url());
              setFeedback("Link kopiert!");
            } catch {
              setFeedback("Kopieren nicht möglich. Markiere den Link unten.");
            }
          }}
        >
          Link kopieren
        </button>
        <button
          type="button"
          className="button secondary"
          onClick={async () => {
            try {
              if (navigator.share)
                await navigator.share({
                  title: "Familienwichteln",
                  url: url(),
                });
              else {
                await navigator.clipboard.writeText(url());
                setFeedback("Link kopiert!");
              }
            } catch {
              setFeedback("Teilen abgebrochen. Du kannst den Link kopieren.");
            }
          }}
        >
          Teilen
        </button>
      </div>
      <details>
        <summary>Link anzeigen</summary>
        <input
          aria-label="Link"
          readOnly
          value={displayLink}
          onFocus={(e) => {
            setDisplayLink(url());
            e.currentTarget.select();
          }}
        />
      </details>
      <span role="status">{feedback}</span>
    </div>
  );
}
export function ActionForm({
  action,
  children,
  submit = "Speichern",
  className = "",
  personal = false,
  confirm,
  idleRedirect,
  idleMessage,
}: {
  action: (state: ActionState, data: FormData) => Promise<ActionState>;
  children?: ReactNode;
  submit?: string;
  className?: string;
  personal?: boolean;
  confirm?: string;
  idleRedirect?: string;
  idleMessage?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const router = useRouter();
  useEffect(() => {
    if (state.redirect && !state.link) router.replace(state.redirect);
  }, [state, router]);
  if (!state.link && !pending) {
    if (idleRedirect)
      return (
        <Link className="button" href={idleRedirect}>
          Zur Runde →
        </Link>
      );
    if (idleMessage) return <p className="notice">{idleMessage}</p>;
  }
  return (
    <form
      action={formAction}
      className={`form ${className}`}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {!state.redirect && (
        <fieldset disabled={pending}>
          {children}
          <button className="button" type="submit">
            {pending ? "Einen Moment …" : submit}
          </button>
        </fieldset>
      )}
      {state.error && (
        <p className="notice error" role="alert">
          {state.error}
        </p>
      )}
      {state.message && (
        <p className="notice" role="status">
          {state.message}
        </p>
      )}
      {state.link && (
        <ShareLink key={state.link} path={state.link} personal={personal} />
      )}
      {state.redirect && state.link && (
        <Link className="button" href={state.redirect}>
          Link gesichert · Zur Runde →
        </Link>
      )}
    </form>
  );
}
export function Field({
  label,
  name,
  type = "text",
  required = false,
  value = "",
  maxLength,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  value?: string;
  maxLength?: number;
}) {
  return (
    <label>
      {label}
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={value}
        maxLength={maxLength}
      />
    </label>
  );
}
