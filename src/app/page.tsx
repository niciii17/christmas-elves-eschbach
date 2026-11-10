import Link from "next/link";
import { FestiveQuote } from "@/components/festive-quote";
import { cookies } from "next/headers";
import { ArrowUpRight } from "lucide-react";
import { currentMember } from "@/lib/access";
import { db } from "@/lib/db";
export const dynamic = "force-dynamic";
export default async function Home() {
  const jar = await cookies();
  const groupIds = jar
    .getAll()
    .filter((c) => c.name.startsWith("wichtel_"))
    .map((c) => c.name.slice(8));
  const rounds = [];
  for (const id of groupIds) {
    const member = await currentMember(id);
    if (member) {
      const group = await db.group.findUnique({ where: { id } });
      if (group) rounds.push({ group, member });
    }
  }
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <h1>Schenken für Anfänger</h1>
          <FestiveQuote hero>
            <span>
              Manche <strong>Geschenke</strong> wünscht man sich.
            </span>{" "}
            <span>
              Andere bekommt man <em>einfach so.</em>
            </span>
          </FestiveQuote>
          <Link className="button" href="/neu">
            Runde erstellen <ArrowUpRight size={19} />
          </Link>
        </div>
        <div className="hero-art" aria-hidden="true">
          <span className="art-star star-one">✦</span>
          <span className="art-star star-two">✧</span>
          <span className="art-star star-three">✦</span>
          <div className="gift-halo">
            <div className="gift-box">
              <div className="gift-ribbon" />
              <div className="gift-lid" />
              <div className="bow bow-left" />
              <div className="bow bow-right" />
              <span className="gift-tag">für dich ♡</span>
            </div>
          </div>
        </div>
      </section>
      {!!rounds.length && (
        <section className="rounds">
          <div className="section-heading">
            <h2>Deine Runden</h2>
          </div>
          <div className="round-grid">
            {rounds.map(({ group, member }) => (
              <Link
                className="card round-link"
                key={group.id}
                href={`/gruppe/${group.id}`}
              >
                <span className="badge">
                  {group.drawn ? "Ausgelost" : "Teilnahme offen"}
                </span>
                <h3>{group.name}</h3>
                <p>{member.name}</p>
                <span className="text-link">Zur Runde →</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
