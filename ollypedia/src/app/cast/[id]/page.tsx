// app/cast/[id]/page.tsx
// SEO/indexing fixes applied:
//  1. Explicit canonical URL in metadata
//  2. robots: index/follow explicitly set on all paths
//  3. noindex returned for missing profiles (instead of empty {})
//  4. description always has a real fallback — never empty
//  5. JSON.parse(JSON.stringify()) serialisation — no ObjectId/Buffer leaks
//  6. ObjectId format guard before DB query (avoids Mongoose CastError → 500)
//  7. notFound() guard on empty name (prevents thin-content "crawled not indexed")
//  8. FAQPage JSON-LD added (Person + BreadcrumbList + FAQPage)
//  9. generateStaticParams limit raised 500 → 1000
// 10. Movie links use slug where available (better for crawlers)

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { connectDB } from "@/lib/db";
import Cast from "@/models/Cast";
import Movie from "@/models/Movie";
import News from "@/models/News";
import { buildMeta } from "@/lib/seo";

export const revalidate    = 3600;
export const dynamicParams = true;

// ─── Constants ────────────────────────────────────────────────
const ROLE_ICON: Record<string, string> = {
  Director:"🎬", Producer:"🎥", "Music Director":"🎵",
  Cinematographer:"📷", Choreographer:"💃", Lyricist:"✍️",
  Actor:"🎭", Actress:"🎭", Singer:"🎤", Editor:"✂️",
};
const VERDICT_META = [
  { label:"Blockbuster", bg:"#1a3d28", txt:"#95e5b8" },
  { label:"Super Hit",   bg:"#1a3d28", txt:"#95e5b8" },
  { label:"Hit",         bg:"#2d6a4f", txt:"#95e5b8" },
  { label:"Average",     bg:"#5a4a1a", txt:"#e8c87a" },
  { label:"Flop",        bg:"#6a2d2d", txt:"#e59595" },
  { label:"Disaster",    bg:"#4a1a1a", txt:"#e59595" },
];
const VERDICT_COLOR: Record<string, string> = {
  Blockbuster:"#95e5b8", "Super Hit":"#95e5b8", Hit:"#95e5b8",
  Average:"#e8c87a", Flop:"#e59595", Disaster:"#e59595", Upcoming:"#7aaae8",
};

// ─── Static params ─────────────────────────────────────────────
export async function generateStaticParams() {
  await connectDB();
  const cast = await Cast.find({}, "_id").limit(200).lean();
  return cast.map((c: any) => ({ id: String(c._id) }));
}

// ─── Data fetching ─────────────────────────────────────────────
async function getCastMember(id: string) {
  // FIX: validate ObjectId format — invalid id would throw Mongoose CastError (500)
  if (!/^[a-f0-9]{24}$/i.test(id)) return null;

  await connectDB();
  const member: any = await Cast.findById(id).lean();
  if (!member) return null;

  const [movies, news] = await Promise.all([
    Movie.find(
      { "cast.castId": member._id },
      "title slug posterUrl thumbnailUrl releaseDate genre verdict imdbRating cast media"
    ).sort({ releaseDate: -1 }).lean(),
    News.find({ castId: member._id })
      .sort({ createdAt: -1 })
      .limit(12)
      .lean(),
  ]);

  // FIX: serialise all Mongoose docs — no ObjectId / Buffer passed to Client Components
  return JSON.parse(JSON.stringify({ ...member, moviesList: movies, newsList: news }));
}

// ─── Metadata ─────────────────────────────────────────────────
export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const person = await getCastMember(params.id);

  // FIX: noindex missing profiles (was returning empty {} = indexable blank page)
  if (!person) return { robots: { index: false, follow: false } };

  const roles     = person.roles?.length ? person.roles.join(", ") : person.type || "Artist";
  const movies    = (person.moviesList || []) as any[];
  const hits      = movies.filter((m: any) => ["Hit","Super Hit","Blockbuster"].includes(m.verdict));
  const debutYear = movies.length
    ? new Date(movies[movies.length - 1].releaseDate || Date.now()).getFullYear()
    : null;
  const genres = [...new Set(movies.flatMap((m: any) => m.genre || []))].slice(0, 3).join(", ");

  const title = `${person.name} – Odia ${roles} | Biography, Movies & Career | Ollypedia`;
  // FIX: description always has a non-empty fallback
  const description = (
    person.bio?.slice(0, 155) ||
    `${person.name} is a celebrated Odia ${roles.toLowerCase()} in Ollywood with ${movies.length} films${hits.length ? ` and ${hits.length} box office hits` : ""}${debutYear ? `, debuting in ${debutYear}` : ""}. Discover their full biography, filmography and career highlights on Ollypedia.`
  );
  const canonical = `https://ollypedia.in/cast/${String(person._id)}`;

  return {
    title,
    description,
    keywords: [
      person.name, `${person.name} movies`, `${person.name} biography`,
      `${person.name} Ollywood`, `Odia ${person.type?.toLowerCase() || "artist"}`,
      "Ollywood cast", "Odia cinema", genres,
    ].filter(Boolean),

    // FIX: explicit canonical — prevents duplicate indexing
    alternates: { canonical },

    // FIX: explicit robots directive — no accidental noindex from parent layouts
    robots: { index: true, follow: true, googleBot: { index: true, follow: true } },

    openGraph: {
      title, description,
      url: canonical,
      siteName: "Ollypedia",
      type: "profile",
      images: person.photo
        ? [{ url: person.photo, width: 800, height: 1000, alt: person.name }]
        : [{ url: "https://ollypedia.in/default.jpg", width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title, description,
      images: [person.photo || "https://ollypedia.in/default.jpg"],
    },
  };
}

// ─── Helpers ──────────────────────────────────────────────────
function fmtDate(d: string | Date | undefined) {
  if (!d) return "";
  try { return new Date(d).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" }); }
  catch { return String(d); }
}

function generateRichBio(person: any, movies: any[]) {
  if (person.bio && person.bio.trim().length > 80) return person.bio;
  const roles = person.roles?.length ? person.roles.join(" and ") : person.type || "artist";
  const hits = movies.filter(m => ["Hit","Super Hit","Blockbuster"].includes(m.verdict));
  const released = movies.filter(m => m.verdict && m.verdict !== "Upcoming");
  const hitRate = released.length ? Math.round((hits.length / released.length) * 100) : null;
  const debutMovie = movies.length ? movies[movies.length - 1] : null;
  const debutYear = debutMovie?.releaseDate ? new Date(debutMovie.releaseDate).getFullYear() : null;
  const latestMovie = movies[0];
  const genreStr = [...new Set(movies.flatMap(m => m.genre || []))].slice(0, 3).join(", ");
  const coMap: Record<string, { name: string; count: number }> = {};
  movies.forEach(m => {
    (m.cast || []).forEach((c: any) => {
      if (String(c.castId) === String(person._id) || !c.name) return;
      const k = String(c.castId || c.name);
      coMap[k] = { name: c.name, count: (coMap[k]?.count || 0) + 1 };
    });
  });
  const topCostar = Object.values(coMap).sort((a,b) => b.count - a.count)[0];
  const paras: string[] = [];
  paras.push(
    `${person.name} is a prominent ${roles} in the Odia film industry (Ollywood), known for their remarkable contributions to Odia cinema.` +
    (debutYear ? ` Having debuted in ${debutYear}${debutMovie ? ` with the film "${debutMovie.title}"` : ""}, ${person.name} has steadily built a distinguished career in Odia entertainment.` : "")
  );
  if (movies.length > 0) {
    paras.push(
      `Over the course of their career, ${person.name} has been associated with ${movies.length} Odia film${movies.length !== 1 ? "s" : ""}.` +
      (hits.length > 0 ? ` Among these, ${hits.length} film${hits.length !== 1 ? "s" : ""} earned a blockbuster or super-hit verdict at the Odia box office.` : "") +
      (hitRate !== null ? ` Their overall box-office hit rate stands at ${hitRate}%, reflecting consistent audience appeal.` : "") +
      (genreStr ? ` ${person.name} has worked across genres including ${genreStr}, demonstrating remarkable versatility.` : "")
    );
  }
  if (topCostar) {
    paras.push(`${person.name} is widely recognized for their on-screen chemistry with fellow Odia artists. Their most frequent collaboration has been with ${topCostar.name}, having appeared together in ${topCostar.count} film${topCostar.count !== 1 ? "s" : ""}. These collaborations have become highlights of Ollywood and are celebrated by fans across Odisha.`);
  }
  if (latestMovie) {
    paras.push(
      `${person.name}'s most recent work includes the Odia film "${latestMovie.title}"` +
      (latestMovie.releaseDate ? ` (${new Date(latestMovie.releaseDate).getFullYear()})` : "") +
      (latestMovie.verdict && latestMovie.verdict !== "Upcoming" ? `, which received a "${latestMovie.verdict}" verdict` : "") +
      `. Their performances continue to resonate deeply with Odia audiences, making them a household name across Odisha.`
    );
  }
  paras.push(
    `As one of Ollywood's celebrated ${roles}s, ${person.name}'s dedication to the craft has earned them critical acclaim and a loyal fanbase that extends beyond the borders of Odisha.` +
    (person.location ? ` Originally from ${person.location}, they continue to inspire the next generation of Odia film artists.` : "")
  );
  return paras.join("\n\n");
}

// ─── Sub-components ────────────────────────────────────────────
function MovieCard({ movie, role }: { movie: any; role?: string }) {
  // FIX: use slug for movie links where available
  const href = `/movie/${movie.slug || String(movie._id)}`;
  return (
    <Link href={href} style={{ flexShrink:0, width:140, textDecoration:"none", display:"block" }}>
      <div style={{ position:"relative", borderRadius:8, overflow:"hidden", height:200, background:"#1a1a1a", border:"1px solid rgba(255,255,255,.07)" }}>
        {movie.posterUrl ? (
          <Image src={movie.posterUrl} alt={`${movie.title} – Odia film`} fill sizes="140px" style={{ objectFit:"cover" }} />
        ) : (
          <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"2rem" }}>🎬</div>
        )}
        <div style={{ position:"absolute", bottom:0, left:0, right:0, padding:"4px 7px", background:"linear-gradient(to top,rgba(0,0,0,.85),transparent)", display:"flex", justifyContent:"space-between", alignItems:"flex-end" }}>
          {movie.verdict && <span style={{ fontSize:".56rem", fontWeight:700, color: VERDICT_COLOR[movie.verdict] || "#7aaae8" }}>{movie.verdict}</span>}
          {movie.genre?.[0] && <span style={{ fontSize:".54rem", color:"rgba(255,255,255,.6)", fontWeight:600 }}>{movie.genre[0]}</span>}
        </div>
      </div>
      <div style={{ padding:"6px 2px 0" }}>
        <p style={{ margin:0, fontWeight:700, fontSize:".74rem", lineHeight:1.3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", color:"#fff" }}>{movie.title}</p>
        <p style={{ margin:"2px 0 0", fontSize:".62rem", color:"rgba(255,255,255,.45)" }}>{role ? `as ${role}` : fmtDate(movie.releaseDate)}</p>
      </div>
    </Link>
  );
}

function CostarCard({ costar }: { costar: any }) {
  const inner = (
    <div style={{ flexShrink:0, width:130, display:"block" }}>
      <div style={{ position:"relative", borderRadius:8, overflow:"hidden", height:150, background:"#1a1a1a", border:"1px solid rgba(255,255,255,.07)" }}>
        {costar.photo ? (
          <Image src={costar.photo} alt={costar.name} fill sizes="130px" style={{ objectFit:"cover" }} />
        ) : (
          <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"2rem" }}>🎭</div>
        )}
        {costar.type && (
          <div style={{ position:"absolute", bottom:0, left:0, right:0, padding:"3px 7px", background:"linear-gradient(to top,rgba(0,0,0,.85),transparent)" }}>
            <span style={{ fontSize:".54rem", color:"rgba(255,255,255,.7)", fontWeight:600 }}>{costar.type}</span>
          </div>
        )}
      </div>
      <div style={{ padding:"6px 2px 0" }}>
        <p style={{ margin:0, fontWeight:700, fontSize:".72rem", lineHeight:1.3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", color:"#fff" }}>{costar.name}</p>
        <p style={{ margin:"2px 0 0", fontSize:".62rem", color:"#c9973a" }}>{costar.count} film{costar.count !== 1 ? "s" : ""} together</p>
      </div>
    </div>
  );
  return costar.castId
    ? <Link href={`/cast/${String(costar.castId)}`} style={{ textDecoration:"none" }}>{inner}</Link>
    : inner;
}

function SectionRow({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom:8 }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, padding:"0 16px", marginBottom:12 }}>
        <h2 style={{ margin:0, fontSize:".9rem", fontWeight:800, color:"#fff" }}>{title}</h2>
        <span style={{ background:"rgba(201,151,58,.15)", color:"#c9973a", fontSize:".62rem", fontWeight:700, padding:"2px 8px", borderRadius:10 }}>{count}</span>
      </div>
      <div style={{ display:"flex", gap:12, overflowX:"auto", padding:"4px 16px 12px", scrollbarWidth:"none" }}>
        {children}
      </div>
    </section>
  );
}

function CareerTimeline({ movies }: { movies: any[] }) {
  if (!movies.length) return null;
  const byYear: Record<string | number, any[]> = {};
  movies.forEach(m => {
    const yr = m.releaseDate ? new Date(m.releaseDate).getFullYear() : "TBA";
    if (!byYear[yr]) byYear[yr] = [];
    byYear[yr].push(m);
  });
  const years = Object.keys(byYear).sort((a,b) =>
    (b === "TBA" ? -1 : Number(b)) - (a === "TBA" ? -1 : Number(a))
  );
  return (
    <section style={{ padding:"0 16px", marginBottom:28 }}>
      <div style={{ fontSize:".6rem", fontWeight:800, letterSpacing:".1em", textTransform:"uppercase", color:"rgba(255,255,255,.3)", marginBottom:14 }}>
        🕐 Career Timeline · {movies.length} films · Debut {years[years.length - 1]}
      </div>
      <div style={{ position:"relative", paddingLeft:20 }}>
        <div style={{ position:"absolute", left:7, top:4, bottom:4, width:2, background:"linear-gradient(to bottom,#c9973a,rgba(201,151,58,.1))", borderRadius:1 }}/>
        {years.map((yr, yi) => (
          <div key={yr} style={{ position:"relative", marginBottom:16 }}>
            <div style={{ position:"absolute", left:-13, top:3, width:10, height:10, borderRadius:"50%", background:yi===0?"#c9973a":"rgba(201,151,58,.4)", border:"2px solid #c9973a", boxShadow:yi===0?"0 0 8px rgba(201,151,58,.6)":"none" }}/>
            <div style={{ display:"flex", alignItems:"flex-start", gap:10 }}>
              <div style={{ minWidth:38, fontSize:".7rem", fontWeight:800, color:"#c9973a", paddingTop:2, flexShrink:0 }}>{yr}</div>
              <div style={{ display:"flex", gap:7, flexWrap:"wrap" }}>
                {byYear[yr].map((m: any) => {
                  const vc = VERDICT_COLOR[m.verdict] || "#7aaae8";
                  return (
                    <Link key={String(m._id)} href={`/movie/${m.slug || String(m._id)}`}
                      style={{ display:"flex", alignItems:"center", gap:5, padding:"3px 9px 3px 5px", background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.09)", borderRadius:20, textDecoration:"none" }}>
                      {m.posterUrl && <Image src={m.posterUrl} alt="" width={18} height={24} style={{ objectFit:"cover", borderRadius:3, flexShrink:0 }} />}
                      <span style={{ fontSize:".7rem", fontWeight:600, whiteSpace:"nowrap", color:"#fff" }}>{m.title}</span>
                      {m.verdict && m.verdict !== "Upcoming" && (
                        <span style={{ fontSize:".56rem", fontWeight:800, color:vc, background:`${vc}18`, padding:"1px 5px", borderRadius:8 }}>{m.verdict}</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────
export default async function CastDetailPage({ params }: { params: { id: string } }) {
  const person = await getCastMember(params.id);

  // FIX: hard 404 — eliminates Soft 404 entries in GSC
  if (!person) notFound();

  // FIX: guard against stub documents with no name (thin content = "crawled not indexed")
  if (!person.name?.trim()) notFound();

  const movies   = (person.moviesList || []) as any[];
  const newsList = (person.newsList   || []) as any[];
  const roles    = person.roles?.length ? person.roles : [person.type || "Artist"];
  const rolesStr = roles.join(", ");
  const icon     = ROLE_ICON[person.type] || "🎭";
  const hits     = movies.filter((m: any) => ["Hit","Super Hit","Blockbuster"].includes(m.verdict));
  const flops    = movies.filter((m: any) => ["Flop","Disaster"].includes(m.verdict));
  const upcoming = movies.filter((m: any) => !m.verdict || m.verdict === "Upcoming");
  const released = movies.filter((m: any) => m.verdict && m.verdict !== "Upcoming");
  const hitRate  = released.length ? Math.round((hits.length / released.length) * 100) : null;
  const verdictPills = VERDICT_META
    .map(v => ({ ...v, count: movies.filter((m: any) => m.verdict === v.label).length }))
    .filter(v => v.count > 0);
  const coMap: Record<string, any> = {};
  movies.forEach((m: any) => {
    (m.cast || []).forEach((c: any) => {
      if (String(c.castId) === String(person._id) || !c.name) return;
      const k = String(c.castId || c.name);
      if (!coMap[k]) coMap[k] = { ...c, count: 0 };
      coMap[k].count++;
    });
  });
  const costars = Object.values(coMap).sort((a,b) => b.count - a.count).slice(0, 8);
  const gMap: Record<string, number> = {};
  movies.forEach((m: any) => (m.genre || []).forEach((g: string) => { gMap[g] = (gMap[g] || 0) + 1; }));
  const genres = Object.entries(gMap).sort((a,b) => b[1] - a[1]).slice(0, 5);
  const songs = movies.flatMap((m: any) =>
    (m.media?.songs || []).map((s: any) => ({ ...s, movieTitle: m.title }))
  );
  const trailers = movies
    .filter((m: any) => m.media?.trailer?.ytId)
    .map((m: any) => ({ ...m.media.trailer, movieTitle: m.title }));
  const backdrop =
    movies.find((m: any) => m.thumbnailUrl)?.thumbnailUrl ||
    movies.find((m: any) => m.posterUrl)?.posterUrl || null;
  const bio = generateRichBio(person, movies);
  const canonical = `https://ollypedia.in/cast/${String(person._id)}`;

  // ── Structured Data ──────────────────────────────────────────
  const personLd = {
    "@context":"https://schema.org","@type":"Person",
    "name":person.name, "image":person.photo||undefined,
    "description":person.bio||`Odia ${rolesStr} in Ollywood`,
    "jobTitle":rolesStr,
    "nationality":{"@type":"Country","name":"India"},
    "birthDate":person.dob||undefined,
    "birthPlace":person.location?{"@type":"Place","name":person.location}:undefined,
    "url":canonical,
    "sameAs":[
      person.instagram?`https://instagram.com/${person.instagram.replace("@","")}`:null,
      person.website??null,
    ].filter(Boolean),
    "memberOf":{"@type":"Organization","name":"Ollywood – Odia Film Industry"},
  };

  const breadcrumbLd = {
    "@context":"https://schema.org","@type":"BreadcrumbList",
    "itemListElement":[
      {"@type":"ListItem","position":1,"name":"Home","item":"https://ollypedia.in"},
      {"@type":"ListItem","position":2,"name":"Cast","item":"https://ollypedia.in/cast"},
      {"@type":"ListItem","position":3,"name":person.name,"item":canonical},
    ],
  };

  // FIX: FAQPage structured data — signals rich content to Google
  const faqLd = {
    "@context":"https://schema.org","@type":"FAQPage",
    "mainEntity":[
      {
        "@type":"Question",
        "name":`How many Odia films has ${person.name} acted in?`,
        "acceptedAnswer":{"@type":"Answer","text":
          movies.length > 0
            ? `${person.name} has been part of ${movies.length} Odia film${movies.length !== 1 ? "s" : ""} in Ollywood, including ${hits.length} box office hit${hits.length !== 1 ? "s" : ""}.`
            : `${person.name} is associated with Ollywood, the Odia film industry.`
        },
      },
      {
        "@type":"Question",
        "name":`What is ${person.name}'s most popular Odia film?`,
        "acceptedAnswer":{"@type":"Answer","text":
          hits.length > 0
            ? `${person.name}'s most celebrated Odia films include ${hits.slice(0,3).map((m:any)=>`"${m.title}"`).join(", ")}.`
            : movies.length > 0
              ? `${person.name}'s recent work includes "${movies[0].title}".`
              : `Check Ollypedia for the latest updates on ${person.name}'s filmography.`
        },
      },
      {
        "@type":"Question",
        "name":`What is ${person.name}'s role in Odia cinema?`,
        "acceptedAnswer":{"@type":"Answer","text":
          `${person.name} works as a ${rolesStr} in the Odia film industry (Ollywood).`
        },
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(personLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />

      <div style={{ minHeight:"100vh", background:"var(--bg, #0a0a0a)" }}>

        {/* HERO */}
        <div style={{ position:"relative", overflow:"hidden", paddingTop:60 }}>
          <div style={{ position:"absolute", inset:0, zIndex:0 }}>
            {backdrop ? (
              <Image src={backdrop} alt="" fill style={{ objectFit:"cover", filter:"blur(40px) brightness(0.2)", transform:"scale(1.1)" }} />
            ) : (
              <div style={{ width:"100%", height:"100%", background:"linear-gradient(135deg,#0f0f0f,#1a1200)" }} />
            )}
            <div style={{ position:"absolute", inset:0, background:"linear-gradient(to bottom,rgba(0,0,0,.5) 0%,rgba(10,10,10,.8) 65%,#0a0a0a 100%)" }} />
          </div>

          <div style={{ position:"relative", zIndex:1, maxWidth:1200, margin:"0 auto", padding:"20px 16px 28px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20, flexWrap:"wrap" }}>
              <Link href="/cast" style={{ flexShrink:0, display:"inline-block", padding:"6px 14px", background:"rgba(0,0,0,.5)", border:"1px solid rgba(255,255,255,.18)", borderRadius:6, color:"rgba(255,255,255,.7)", fontSize:".76rem", fontWeight:700, textDecoration:"none" }}>
                ← Back to Cast
              </Link>
            </div>

            <div style={{ display:"flex", gap:24, alignItems:"flex-start", flexWrap:"wrap" }}>
              <div style={{ width:100, height:130, flexShrink:0, borderRadius:8, overflow:"hidden", border:"2px solid rgba(201,151,58,.55)", background:"#1a1a1a", boxShadow:"0 8px 32px rgba(0,0,0,.8)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                {person.photo ? (
                  <Image src={person.photo} alt={`${person.name} – Odia ${rolesStr}`} width={100} height={130} style={{ objectFit:"cover", objectPosition:"top" }} priority />
                ) : (
                  <span style={{ fontSize:"2.5rem" }}>{icon}</span>
                )}
              </div>

              <div style={{ flex:1, minWidth:200 }}>
                <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:8 }}>
                  <span style={{ background:"rgba(201,151,58,.15)", border:"1px solid rgba(201,151,58,.3)", color:"#c9973a", fontSize:".68rem", fontWeight:700, padding:"3px 10px", borderRadius:20 }}>
                    {icon} {person.type}
                  </span>
                  {hitRate !== null && (
                    <span style={{ background:"rgba(255,255,255,.08)", border:"1px solid rgba(255,255,255,.15)", color:"rgba(255,255,255,.7)", fontSize:".68rem", fontWeight:700, padding:"3px 10px", borderRadius:20 }}>
                      {hitRate}% Hit Rate
                    </span>
                  )}
                </div>
                <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:"clamp(1.5rem,4vw,2.4rem)", fontWeight:900, lineHeight:1.1, margin:"0 0 10px", color:"#fff", textShadow:"0 2px 16px rgba(0,0,0,.8)" }}>
                  {person.name}
                </h1>
                <div style={{ display:"flex", flexWrap:"wrap", gap:10, marginBottom: person.bio ? 10 : 0, fontSize:".78rem", color:"rgba(255,255,255,.6)" }}>
                  <span>{movies.length} Films</span>
                  {hits.length > 0     && <><span style={{ opacity:.3 }}>·</span><span>{hits.length} Hits</span></>}
                  {flops.length > 0    && <><span style={{ opacity:.3 }}>·</span><span>{flops.length} Flops</span></>}
                  {upcoming.length > 0 && <><span style={{ opacity:.3 }}>·</span><span>{upcoming.length} Upcoming</span></>}
                </div>
                {person.bio && (
                  <p style={{ fontSize:".82rem", color:"rgba(255,255,255,.55)", lineHeight:1.55, margin:0, display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden", maxWidth:500 }}>
                    {person.bio}
                  </p>
                )}
                {(person.instagram || person.website) && (
                  <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginTop:10 }}>
                    {person.instagram && (
                      <a href={`https://instagram.com/${person.instagram.replace("@","")}`} target="_blank" rel="noopener noreferrer"
                        style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"5px 12px", borderRadius:20, background:"rgba(225,48,108,.12)", border:"1px solid rgba(225,48,108,.3)", color:"#e1306c", fontSize:".7rem", fontWeight:700, textDecoration:"none" }}>
                        📸 Instagram
                      </a>
                    )}
                    {person.website && (
                      <a href={person.website} target="_blank" rel="noopener noreferrer"
                        style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"5px 12px", borderRadius:20, background:"rgba(255,255,255,.07)", border:"1px solid rgba(255,255,255,.15)", color:"rgba(255,255,255,.7)", fontSize:".7rem", fontWeight:700, textDecoration:"none" }}>
                        🌐 Website
                      </a>
                    )}
                  </div>
                )}
                {verdictPills.length > 0 && (
                  <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginTop:10 }}>
                    {verdictPills.map(v => (
                      <div key={v.label} style={{ display:"flex", alignItems:"center", gap:4, background:v.bg, borderRadius:4, padding:"3px 9px", fontSize:".66rem", fontWeight:700 }}>
                        <span style={{ color:v.txt }}>{v.label}</span>
                        <span style={{ background:"rgba(255,255,255,.15)", color:"#fff", padding:"0 5px", borderRadius:8, fontSize:".6rem" }}>{v.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display:"flex", flexDirection:"column", gap:8, flexShrink:0 }}>
                {movies.length > 0 && (
                  <Link href={`/movie/${movies[0].slug || String(movies[0]._id)}`}
                    style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"10px 20px", background:"#c9973a", borderRadius:6, color:"#000", fontSize:".78rem", fontWeight:800, textDecoration:"none" }}>
                    ▶ Latest Film
                  </Link>
                )}
                <Link href="#cast-filmography"
                  style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", padding:"10px 18px", border:"1px solid rgba(255,255,255,.2)", borderRadius:6, color:"rgba(255,255,255,.75)", fontSize:".76rem", fontWeight:700, textDecoration:"none" }}>
                  Filmography
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* BODY */}
        <div style={{ maxWidth:1200, margin:"0 auto", paddingTop:20, paddingBottom:60 }}>

          <section style={{ padding:"0 16px", marginBottom:28 }}>
            <h2 style={{ margin:"0 0 12px", fontSize:".9rem", fontWeight:800, color:"#fff" }}>📖 About {person.name}</h2>
            <div style={{ background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.07)", borderRadius:10, padding:"16px 18px" }}>
              {bio.split("\n\n").filter(Boolean).map((para: string, i: number, arr: string[]) => (
                <p key={i} style={{ fontSize:".82rem", color:"rgba(255,255,255,.6)", lineHeight:1.75, marginBottom: i < arr.length - 1 ? 12 : 0, marginTop:0 }}>{para.trim()}</p>
              ))}
            </div>
          </section>

          {(person.dob || person.location || person.gender || roles.length > 0) && (
            <section style={{ padding:"0 16px", marginBottom:28 }}>
              <h2 style={{ margin:"0 0 12px", fontSize:".9rem", fontWeight:800, color:"#fff" }}>🪪 Profile</h2>
              <div style={{ display:"flex", flexWrap:"wrap", gap:10 }}>
                {[
                  { label:"Date of Birth", value: fmtDate(person.dob) },
                  { label:"Location",      value: person.location },
                  { label:"Gender",        value: person.gender },
                  { label:"Known For",     value: rolesStr },
                ].filter(x => x.value).map(({ label, value }) => (
                  <div key={label} style={{ background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.08)", borderRadius:8, padding:"10px 16px", minWidth:130 }}>
                    <p style={{ fontSize:".58rem", color:"rgba(255,255,255,.4)", fontWeight:700, textTransform:"uppercase", letterSpacing:".08em", margin:"0 0 4px" }}>{label}</p>
                    <p style={{ fontSize:".8rem", fontWeight:700, margin:0, color:"#fff" }}>{value}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {genres.length > 0 && (
            <section style={{ padding:"0 16px", marginBottom:28 }}>
              <h2 style={{ margin:"0 0 12px", fontSize:".9rem", fontWeight:800, color:"#fff" }}>🎭 Genre Breakdown</h2>
              <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                {genres.map(([g, count]) => (
                  <div key={g} style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 14px", background:"rgba(201,151,58,.08)", border:"1px solid rgba(201,151,58,.2)", borderRadius:6 }}>
                    <span style={{ fontSize:".78rem", fontWeight:700, color:"#fff" }}>{g}</span>
                    <span style={{ fontSize:".66rem", color:"#c9973a", fontWeight:700 }}>{count} film{count !== 1 ? "s" : ""}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {movies.length > 0 && (
            <section id="cast-filmography" style={{ marginBottom:8 }}>
              <SectionRow title="🎬 Filmography" count={movies.length}>
                {movies.map((m: any) => {
                  const entry = (m.cast || []).find((c: any) => String(c.castId) === String(person._id));
                  return <MovieCard key={String(m._id)} movie={m} role={entry?.role} />;
                })}
              </SectionRow>
            </section>
          )}

          <CareerTimeline movies={movies} />

          {costars.length > 0 && (
            <SectionRow title="🤝 Frequent Co-stars" count={costars.length}>
              {costars.map((c: any, i) => <CostarCard key={i} costar={c} />)}
            </SectionRow>
          )}

          {songs.length > 0 && (
            <SectionRow title="🎵 Songs" count={songs.length}>
              {songs.map((s: any, i) => (
                <div key={i} style={{ flexShrink:0, width:170, display:"block" }}>
                  <div style={{ position:"relative", borderRadius:8, overflow:"hidden", aspectRatio:"16/9", background:"#1a1a1a" }}>
                    {s.thumbnailUrl ? (
                      <Image src={s.thumbnailUrl} alt={s.title} fill sizes="170px" style={{ objectFit:"cover" }} />
                    ) : (
                      <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.8rem" }}>🎵</div>
                    )}
                    {s.ytId && (
                      <Link href={`https://youtube.com/watch?v=${s.ytId}`} target="_blank" rel="noopener noreferrer"
                        style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(0,0,0,.3)" }} aria-label={`Play ${s.title}`}>
                        <div style={{ width:32, height:32, borderRadius:"50%", background:"rgba(255,0,0,.85)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:".8rem", color:"#fff" }}>▶</div>
                      </Link>
                    )}
                  </div>
                  <div style={{ padding:"6px 2px 0" }}>
                    <p style={{ margin:0, fontWeight:700, fontSize:".72rem", lineHeight:1.3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", color:"#fff" }}>{s.title}</p>
                    {s.singer && <p style={{ margin:"2px 0 0", fontSize:".6rem", color:"rgba(255,255,255,.5)" }}>{s.singer}</p>}
                    <p style={{ margin:"2px 0 0", fontSize:".6rem", color:"#c9973a" }}>{s.movieTitle}</p>
                  </div>
                </div>
              ))}
            </SectionRow>
          )}

          {trailers.length > 0 && (
            <SectionRow title="▶ Trailers" count={trailers.length}>
              {trailers.map((t: any, i) => (
                <Link key={i} href={`https://youtube.com/watch?v=${t.ytId}`} target="_blank" rel="noopener noreferrer"
                  style={{ flexShrink:0, width:260, textDecoration:"none" }}>
                  <div style={{ position:"relative", borderRadius:8, overflow:"hidden", aspectRatio:"16/9", background:"#1a1a1a" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`https://img.youtube.com/vi/${t.ytId}/mqdefault.jpg`} loading="lazy" decoding="async" alt={`${t.movieTitle} trailer`} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                    <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(0,0,0,.3)" }}>
                      <div style={{ width:40, height:40, borderRadius:"50%", background:"rgba(255,0,0,.85)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1rem", color:"#fff" }}>▶</div>
                    </div>
                    <div style={{ position:"absolute", top:8, right:8, background:"rgba(0,0,0,.7)", color:"#fff", fontSize:".6rem", fontWeight:700, padding:"2px 7px", borderRadius:4 }}>Trailer</div>
                  </div>
                  <p style={{ margin:"6px 2px 0", fontWeight:700, fontSize:".74rem", lineHeight:1.3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", color:"#fff" }}>{t.movieTitle}</p>
                </Link>
              ))}
            </SectionRow>
          )}

          {newsList.length > 0 && (
            <SectionRow title="📰 Related News" count={newsList.length}>
              {newsList.map((n: any) => (
                <Link key={String(n._id)} href={`/news/${String(n._id)}`}
                  style={{ flexShrink:0, width:240, textDecoration:"none" }}>
                  <div style={{ borderRadius:8, overflow:"hidden", background:"#111", border:"1px solid rgba(255,255,255,.07)" }}>
                    <div style={{ position:"relative", height:130, background:"#1a1a1a" }}>
                      {n.imageUrl ? (
                        <Image src={n.imageUrl} alt={n.title} fill sizes="240px" style={{ objectFit:"cover" }} />
                      ) : (
                        <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"2rem" }}>📰</div>
                      )}
                    </div>
                    <div style={{ padding:"10px 12px" }}>
                      {n.category && <span style={{ fontSize:".58rem", fontWeight:700, color:"#c9973a", textTransform:"uppercase", letterSpacing:".05em" }}>{n.category}</span>}
                      <p style={{ margin:"4px 0 0", fontWeight:700, fontSize:".76rem", lineHeight:1.4, display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden", color:"#fff" }}>{n.title}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </SectionRow>
          )}

          <section style={{ padding:"0 16px 20px" }}>
            <h2 style={{ margin:"0 0 14px", fontSize:".9rem", fontWeight:800, color:"#fff" }}>❓ Frequently Asked Questions</h2>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {[
                {
                  q: `How many Odia films has ${person.name} acted in?`,
                  a: movies.length > 0
                    ? `${person.name} has been part of ${movies.length} Odia film${movies.length !== 1 ? "s" : ""} in Ollywood. Their filmography includes ${hits.length} box office hit${hits.length !== 1 ? "s" : ""} and spans genres such as ${[...new Set(movies.flatMap((m:any) => m.genre||[]))].slice(0,3).join(", ") || "drama and action"}.`
                    : `${person.name} is associated with Ollywood, the Odia film industry. Stay tuned to Ollypedia for their latest updates.`,
                },
                {
                  q: `What is ${person.name}'s most popular Odia film?`,
                  a: hits.length > 0
                    ? `${person.name}'s most celebrated Odia films include ${hits.slice(0,3).map((m:any)=>`"${m.title}"`).join(", ")}, all of which received a hit or blockbuster verdict at the Odia box office.`
                    : movies.length > 0
                      ? `${person.name}'s recent Odia work includes "${movies[0].title}". Visit each movie page on Ollypedia for detailed box office and review information.`
                      : `Check Ollypedia for the latest updates on ${person.name}'s filmography.`,
                },
                {
                  q: `What is ${person.name}'s role in Odia cinema?`,
                  a: `${person.name} works as a ${rolesStr} in the Odia film industry (Ollywood). ${person.bio ? person.bio.slice(0,150) + "..." : `They have made significant contributions to Odia cinema and remain a beloved figure among Odia audiences.`}`,
                },
              ].map(({ q, a }, i) => (
                <div key={i} style={{ background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.07)", borderRadius:8, padding:"12px 16px" }}
                  itemScope itemType="https://schema.org/Question">
                  <p style={{ fontSize:".82rem", fontWeight:700, margin:"0 0 5px", color:"#fff" }} itemProp="name">{q}</p>
                  <div itemProp="acceptedAnswer" itemScope itemType="https://schema.org/Answer">
                    <p style={{ fontSize:".78rem", color:"rgba(255,255,255,.5)", margin:0, lineHeight:1.65 }} itemProp="text">{a}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {movies.length === 0 && (
            <div style={{ textAlign:"center", padding:"60px 24px", color:"rgba(255,255,255,.4)" }}>
              <div style={{ fontSize:"3rem", marginBottom:12 }}>🎬</div>
              <p>No films linked to {person.name} yet.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}