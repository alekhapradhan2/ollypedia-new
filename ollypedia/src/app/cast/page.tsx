// app/cast/page.tsx

import type { Metadata } from "next";
import Link from "next/link";
import { connectDB } from "@/lib/db";
import Cast from "@/models/Cast";
import { buildMeta } from "@/lib/seo";
import CastSearchBar from "@/components/cast/CastSearchBar";
import CastCard      from "@/components/cast/CastCard";

export const revalidate = 600;

const SECTION_LIMIT = 20;

const ROLES = [
  "Actor", "Actress", "Director", "Singer",
  "Music Director", "Producer", "Lyricist",
  "Cinematographer", "Choreographer", "Editor",
];

const ROLE_ICON: Record<string, string> = {
  Director: "🎬", Producer: "🎥", "Music Director": "🎵",
  Cinematographer: "📷", Choreographer: "💃", Lyricist: "✍️",
  Actor: "🎭", Actress: "🎭", Singer: "🎤", Editor: "✂️",
};

// ─── Serialise Mongoose docs → plain JSON-safe objects ────────
// .lean() still returns ObjectId / Buffer for _id — String() fixes it.
// We strip movies down to just a count so we never send Buffers to
// Client Components.
export interface PlainPerson {
  _id:       string;
  name:      string;
  photo:     string | null;
  type:      string | null;
  filmCount: number;
}

function serialise(docs: any[]): PlainPerson[] {
  return docs.map((d) => ({
    _id:       String(d._id),
    name:      d.name  ?? "",
    photo:     d.photo ?? null,
    type:      d.type  ?? null,
    filmCount: Array.isArray(d.movies) ? d.movies.length : 0,
  }));
}

// ─── Metadata ─────────────────────────────────────────────────
export async function generateMetadata({
  searchParams,
}: {
  searchParams: { type?: string };
}): Promise<Metadata> {
  const { type } = searchParams;
  return buildMeta({
    title: type
      ? `Odia ${type}s – Ollywood ${type} Directory | Ollypedia`
      : "Odia Actors, Actresses & Crew – Complete Ollywood Cast Directory | Ollypedia",
    description: type
      ? `Browse all Odia ${type}s in Ollywood. Find complete profiles, filmographies, biographies and career highlights of every ${type} in Odia cinema.`
      : "Explore the complete directory of Odia film actors, actresses, directors, singers and crew. Browse profiles with filmographies, biographies and career stats of Ollywood celebrities.",
    keywords: [
      "Odia actors", "Ollywood cast", "Odia actress", "Odia film stars",
      "Babushaan", "Elina Samantray", "Sabyasachi Mishra", "Ollywood celebrities",
      "Odia cinema artists", "Ollywood directors", type ?? "",
    ].filter(Boolean),
    url: type ? `/cast?type=${type}` : "/cast",
  });
}

// ─── Data fetching ─────────────────────────────────────────────
async function getPageData(type?: string) {
  await connectDB();
  const proj = "name photo type movies";

  if (type) {
    const filter = { $or: [{ type }, { roles: type }] };
    const [raw, total] = await Promise.all([
      Cast.find(filter, proj).sort({ name: 1 }).limit(48).lean(),
      Cast.countDocuments(filter),
    ]);
    return { mode: "filtered" as const, cast: serialise(raw), total };
  }

  const actorFilter = { type: { $in: ["Actor", "Actress"] } };

  const [
    topStars, directors, veterans,
    musicians, risingNew, crew, totalCount,
  ] = await Promise.all([
    Cast.find(actorFilter, proj).sort({ "movies.length": -1 }).limit(SECTION_LIMIT).lean(),
    Cast.find({ type: "Director" }, proj).sort({ name: 1 }).limit(SECTION_LIMIT).lean(),
    Cast.find({ $expr: { $gte: [{ $size: { $ifNull: ["$movies", []] } }, 5] } }, proj)
      .sort({ name: 1 }).limit(SECTION_LIMIT).lean(),
    Cast.find({ type: { $in: ["Music Director", "Singer", "Lyricist"] } }, proj)
      .sort({ name: 1 }).limit(SECTION_LIMIT).lean(),
    Cast.find({ $expr: { $eq: [{ $size: { $ifNull: ["$movies", []] } }, 1] } }, proj)
      .sort({ name: 1 }).limit(SECTION_LIMIT).lean(),
    Cast.find({ type: { $in: ["Producer", "Cinematographer", "Choreographer", "Editor"] } }, proj)
      .sort({ name: 1 }).limit(SECTION_LIMIT).lean(),
    Cast.estimatedDocumentCount(),
  ]);

  return {
    mode:      "trending" as const,
    topStars:  serialise(topStars),
    directors: serialise(directors),
    veterans:  serialise(veterans),
    musicians: serialise(musicians),
    risingNew: serialise(risingNew),
    crew:      serialise(crew),
    total:     totalCount,
  };
}

// ─── Section Row ──────────────────────────────────────────────
function CastSection({
  title, tag, people, viewAllHref, totalCount, isFirst = false,
}: {
  title: string; tag?: string; people: PlainPerson[];
  viewAllHref?: string; totalCount?: number; isFirst?: boolean;
}) {
  if (!people.length) return null;
  return (
    <section style={{ marginBottom: 8 }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 16px", marginBottom: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <h2 style={{ margin: 0, fontSize: ".9rem", fontWeight: 800, color: "var(--text,#fff)" }}>
            {title}
          </h2>
          {tag && (
            <span style={{
              flexShrink: 0, background: "rgba(201,151,58,.15)", color: "#c9973a",
              fontSize: ".6rem", fontWeight: 700, padding: "2px 7px", borderRadius: 10,
            }}>{tag}</span>
          )}
          <span style={{
            flexShrink: 0, background: "rgba(201,151,58,.12)", color: "#c9973a",
            fontSize: ".6rem", fontWeight: 700, padding: "2px 7px", borderRadius: 10,
          }}>
            {totalCount ?? people.length}
          </span>
        </div>
        {viewAllHref && (
          <Link href={viewAllHref} style={{
            flexShrink: 0, fontSize: ".72rem", fontWeight: 700, color: "#c9973a",
            textDecoration: "none", border: "1px solid rgba(201,151,58,.3)",
            padding: "4px 12px", borderRadius: 6, whiteSpace: "nowrap",
          }}>
            View All →
          </Link>
        )}
      </div>
      <div style={{
        display: "flex", gap: 12, overflowX: "auto",
        padding: "4px 16px 12px", scrollbarWidth: "none",
      }}>
        {people.map((p, i) => (
          <CastCard key={p._id} person={p} priority={isFirst && i < 4} />
        ))}
      </div>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────
export default async function CastPage({
  searchParams,
}: {
  searchParams: { type?: string };
}) {
  const { type } = searchParams;
  const data = await getPageData(type);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg,#0a0a0a)", paddingTop: 60 }}>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home",        item: "https://ollypedia.com" },
              { "@type": "ListItem", position: 2, name: "Cast & Crew", item: "https://ollypedia.com/cast" },
              ...(type ? [{ "@type": "ListItem", position: 3, name: `${type}s`, item: `https://ollypedia.com/cast?type=${type}` }] : []),
            ],
          }),
        }}
      />

      {/* ── Header ── */}
      <div style={{
        padding: "24px 16px 0",
        background: "linear-gradient(to bottom,rgba(201,151,58,.06),transparent)",
        borderBottom: "1px solid rgba(255,255,255,.07)",
      }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
          <h1 style={{
            margin: 0, fontFamily: "'Playfair Display',serif",
            fontSize: "clamp(1.4rem,4vw,2.2rem)", fontWeight: 900, color: "var(--text,#fff)",
          }}>
            {type ? `${ROLE_ICON[type] || "🎭"} ${type}s` : "Cast & Crew"}
          </h1>
          <span style={{ fontSize: ".8rem", color: "rgba(255,255,255,.4)" }}>
            {data.total} people
          </span>
        </div>

        <div style={{ marginBottom: 14 }}>
          <CastSearchBar />
        </div>

        <nav style={{
          display: "flex", borderBottom: "1px solid rgba(255,255,255,.06)",
          overflowX: "auto", scrollbarWidth: "none",
        }}>
          <Link href="/cast" style={{
            padding: "10px 16px", fontWeight: 700, fontSize: ".78rem",
            whiteSpace: "nowrap", textDecoration: "none",
            color: !type ? "#c9973a" : "rgba(255,255,255,.45)",
            borderBottom: !type ? "2px solid #c9973a" : "2px solid transparent",
          }}>🔥 All</Link>
          {ROLES.map((r) => (
            <Link key={r} href={`/cast?type=${r}`} style={{
              padding: "10px 16px", fontWeight: 700, fontSize: ".78rem",
              whiteSpace: "nowrap", textDecoration: "none",
              color: type === r ? "#c9973a" : "rgba(255,255,255,.45)",
              borderBottom: type === r ? "2px solid #c9973a" : "2px solid transparent",
            }}>
              {ROLE_ICON[r]} {r}s
            </Link>
          ))}
        </nav>
      </div>

      <div style={{ padding: "16px 16px 0", maxWidth: 860 }}>
        <p style={{ fontSize: ".8rem", color: "rgba(255,255,255,.35)", lineHeight: 1.7, margin: 0 }}>
          {type
            ? `Browse all Odia ${type}s in Ollywood — detailed profiles, filmographies and career highlights.`
            : "Explore Ollypedia's complete directory of Odia film actors, actresses, directors, singers and crew."}
        </p>
      </div>

      {/* ── Content ── */}
      <div style={{ paddingTop: 20, paddingBottom: 60 }}>
        {data.mode === "filtered" ? (
          data.cast.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 24px", color: "rgba(255,255,255,.4)" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: 10 }}>👤</div>
              <p>No {type}s found.</p>
              <Link href="/cast" style={{
                marginTop: 14, display: "inline-block", padding: "8px 18px",
                border: "1px solid rgba(201,151,58,.4)", borderRadius: 6,
                color: "#c9973a", textDecoration: "none", fontSize: ".82rem", fontWeight: 700,
              }}>Browse All</Link>
            </div>
          ) : (
            <div style={{ padding: "0 16px" }}>
              <div style={{
                display: "flex", alignItems: "center",
                justifyContent: "space-between", marginBottom: 14,
              }}>
                <h2 style={{ margin: 0, fontSize: ".9rem", fontWeight: 800, color: "var(--text,#fff)" }}>
                  {ROLE_ICON[type!]} {type}s
                </h2>
                <span style={{ fontSize: ".75rem", color: "rgba(255,255,255,.4)" }}>
                  {data.total} profiles
                </span>
              </div>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill,minmax(136px,1fr))",
                gap: 14,
              }}>
                {data.cast.map((p, i) => (
                  <CastCard key={p._id} person={p} priority={i < 4} />
                ))}
              </div>
            </div>
          )
        ) : (
          <>
            <CastSection title="⭐ Top Stars"         tag="Popular"  people={data.topStars}  viewAllHref="/cast?type=Actor"    isFirst />
            <CastSection title="🎬 Directors"                        people={data.directors} viewAllHref="/cast?type=Director"         />
            <CastSection title="🏆 Veteran Artists"   tag="5+ Films" people={data.veterans}                                             />
            <CastSection title="🎵 Music & Songs"                    people={data.musicians} viewAllHref="/cast?type=Singer"            />
            <CastSection title="🌟 Rising Talents"    tag="New"      people={data.risingNew}                                            />
            <CastSection title="🎥 Crew & Production"               people={data.crew}      viewAllHref="/cast?type=Producer"          />
          </>
        )}
      </div>
    </div>
  );
}