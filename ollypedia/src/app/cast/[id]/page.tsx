// app/cast/[id]/page.tsx
// Full redesign — Tailwind-based, improved readability, AdSense-ready SEO content

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { connectDB } from "@/lib/db";
import Cast from "@/models/Cast";
import Movie from "@/models/Movie";
import News from "@/models/News";
import { buildMeta } from "@/lib/seo";
import {
  Film, Star, TrendingUp, Calendar, MapPin, User,
  ChevronRight, Award, Music, Play, Newspaper,
  Instagram, Globe, Clock, Users, Clapperboard, Info,
  BarChart2, MessageSquare,
} from "lucide-react";

export const revalidate    = 3600;
export const dynamicParams = true;

// ─── Constants ────────────────────────────────────────────────────────────────
const ROLE_ICON: Record<string, string> = {
  Director: "🎬", Producer: "🎥", "Music Director": "🎵",
  Cinematographer: "📷", Choreographer: "💃", Lyricist: "✍️",
  Actor: "🎭", Actress: "🎭", Singer: "🎤", Editor: "✂️",
};

const VERDICT_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  Blockbuster: { bg: "bg-green-500/15",   text: "text-green-400",   border: "border-green-500/30" },
  "Super Hit": { bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/30" },
  Hit:         { bg: "bg-lime-500/15",    text: "text-lime-400",    border: "border-lime-500/30" },
  Average:     { bg: "bg-yellow-500/15",  text: "text-yellow-400",  border: "border-yellow-500/30" },
  Flop:        { bg: "bg-red-500/15",     text: "text-red-400",     border: "border-red-500/30" },
  Disaster:    { bg: "bg-red-600/15",     text: "text-red-500",     border: "border-red-600/30" },
  Upcoming:    { bg: "bg-blue-500/15",    text: "text-blue-400",    border: "border-blue-500/30" },
};

function vs(v?: string) {
  return VERDICT_STYLE[v || ""] || { bg: "bg-orange-500/15", text: "text-orange-400", border: "border-orange-500/30" };
}

// ─── Static params ────────────────────────────────────────────────────────────
export async function generateStaticParams() {
  await connectDB();
  const cast = await Cast.find({}, "_id").limit(1000).lean();
  return cast.map((c: any) => ({ id: String(c._id) }));
}

// ─── Data fetching ────────────────────────────────────────────────────────────
async function getCastMember(id: string) {
  if (!/^[a-f0-9]{24}$/i.test(id)) return null;
  await connectDB();
  const member: any = await Cast.findById(id).lean();
  if (!member) return null;
  const [movies, news] = await Promise.all([
    Movie.find(
      { "cast.castId": member._id },
      "title slug posterUrl thumbnailUrl releaseDate genre verdict imdbRating cast media"
    ).sort({ releaseDate: -1 }).lean(),
    News.find({ castId: member._id }).sort({ createdAt: -1 }).limit(12).lean(),
  ]);
  return JSON.parse(JSON.stringify({ ...member, moviesList: movies, newsList: news }));
}

// ─── Metadata ─────────────────────────────────────────────────────────────────
export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const person = await getCastMember(params.id);
  if (!person) return { robots: { index: false, follow: false } };

  const roles    = person.roles?.length ? person.roles.join(", ") : person.type || "Artist";
  const movies   = (person.moviesList || []) as any[];
  const hits     = movies.filter((m: any) => ["Hit", "Super Hit", "Blockbuster"].includes(m.verdict));
  const debutYear = movies.length
    ? new Date(movies[movies.length - 1].releaseDate || Date.now()).getFullYear()
    : null;
  const genres = [...new Set(movies.flatMap((m: any) => m.genre || []))].slice(0, 3).join(", ");

  const title = `${person.name} – Odia ${roles} | Biography, Movies & Career | Ollypedia`;
  const description =
    person.bio?.slice(0, 155) ||
    `${person.name} is a celebrated Odia ${roles.toLowerCase()} in Ollywood with ${movies.length} films${hits.length ? ` and ${hits.length} box office hits` : ""}${debutYear ? `, debuting in ${debutYear}` : ""}. Discover their full biography, filmography and career on Ollypedia.`;
  const canonical = `https://ollypedia.in/cast/${String(person._id)}`;

  return {
    title, description,
    keywords: [
      person.name, `${person.name} movies`, `${person.name} biography`,
      `${person.name} Ollywood`, `${person.name} odia film`,
      `Odia ${person.type?.toLowerCase() || "artist"}`,
      "Ollywood cast", "Odia cinema", genres,
    ].filter(Boolean),
    alternates: { canonical },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
    openGraph: {
      title, description, url: canonical, siteName: "Ollypedia", type: "profile",
      images: person.photo
        ? [{ url: person.photo, width: 800, height: 1000, alt: person.name }]
        : [{ url: "https://ollypedia.in/default.jpg", width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image", title, description, images: [person.photo || "https://ollypedia.in/default.jpg"] },
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(d?: string | Date) {
  if (!d) return "";
  try { return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }); }
  catch { return String(d); }
}

function generateRichBio(person: any, movies: any[]): string {
  if (person.bio && person.bio.trim().length > 80) return person.bio;
  const roles    = person.roles?.length ? person.roles.join(" and ") : person.type || "artist";
  const hits     = movies.filter(m => ["Hit", "Super Hit", "Blockbuster"].includes(m.verdict));
  const released = movies.filter(m => m.verdict && m.verdict !== "Upcoming");
  const hitRate  = released.length ? Math.round((hits.length / released.length) * 100) : null;
  const debutMovie = movies.length ? movies[movies.length - 1] : null;
  const debutYear  = debutMovie?.releaseDate ? new Date(debutMovie.releaseDate).getFullYear() : null;
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
  const topCostar = Object.values(coMap).sort((a, b) => b.count - a.count)[0];
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

// ─── UI Sub-components ────────────────────────────────────────────────────────
function SectionHeading({ icon: Icon, title, count }: { icon?: any; title: string; count?: number }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="w-1 h-7 bg-orange-500 rounded-full flex-shrink-0" />
      <h2 className="font-display text-xl md:text-2xl font-bold text-white flex items-center gap-2">
        {Icon && <Icon className="w-5 h-5 text-orange-500" />}
        {title}
        {count !== undefined && count > 0 && (
          <span className="text-gray-500 text-base font-normal ml-1">({count})</span>
        )}
      </h2>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-3 border-b border-[#1f1f1f] last:border-0">
      <div className="w-8 h-8 bg-orange-500/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon className="w-4 h-4 text-orange-400" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">{label}</p>
        <p className="text-sm text-white font-medium leading-snug">{value}</p>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default async function CastDetailPage({ params }: { params: { id: string } }) {
  const person = await getCastMember(params.id);
  if (!person) notFound();
  if (!person.name?.trim()) notFound();

  const movies   = (person.moviesList || []) as any[];
  const newsList = (person.newsList   || []) as any[];
  const roles    = person.roles?.length ? person.roles : [person.type || "Artist"];
  const rolesStr = roles.join(", ");
  const icon     = ROLE_ICON[person.type] || "🎭";

  const hits     = movies.filter((m: any) => ["Hit", "Super Hit", "Blockbuster"].includes(m.verdict));
  const flops    = movies.filter((m: any) => ["Flop", "Disaster"].includes(m.verdict));
  const upcoming = movies.filter((m: any) => !m.verdict || m.verdict === "Upcoming");
  const released = movies.filter((m: any) => m.verdict && m.verdict !== "Upcoming");
  const hitRate  = released.length ? Math.round((hits.length / released.length) * 100) : null;

  const coMap: Record<string, any> = {};
  movies.forEach((m: any) => {
    (m.cast || []).forEach((c: any) => {
      if (String(c.castId) === String(person._id) || !c.name) return;
      const k = String(c.castId || c.name);
      if (!coMap[k]) coMap[k] = { ...c, count: 0 };
      coMap[k].count++;
    });
  });
  const costars = Object.values(coMap).sort((a, b) => b.count - a.count).slice(0, 8);

  const gMap: Record<string, number> = {};
  movies.forEach((m: any) => (m.genre || []).forEach((g: string) => { gMap[g] = (gMap[g] || 0) + 1; }));
  const genres = Object.entries(gMap).sort((a, b) => b[1] - a[1]).slice(0, 6);

  const songs = movies.flatMap((m: any) =>
    (m.media?.songs || []).map((s: any) => ({ ...s, movieTitle: m.title, movieSlug: m.slug }))
  );
  const trailers = movies
    .filter((m: any) => m.media?.trailer?.ytId)
    .map((m: any) => ({ ...m.media.trailer, movieTitle: m.title, movieSlug: m.slug }));

  const backdrop =
    movies.find((m: any) => m.thumbnailUrl)?.thumbnailUrl ||
    movies.find((m: any) => m.posterUrl)?.posterUrl || null;

  const bio = generateRichBio(person, movies);
  const canonical = `https://ollypedia.in/cast/${String(person._id)}`;

  const debutMovie  = movies.length ? movies[movies.length - 1] : null;
  const latestMovie = movies[0];

  // Career timeline by year
  const byYear: Record<string | number, any[]> = {};
  movies.forEach((m: any) => {
    const yr = m.releaseDate ? new Date(m.releaseDate).getFullYear() : "TBA";
    if (!byYear[yr]) byYear[yr] = [];
    byYear[yr].push(m);
  });
  const timelineYears = Object.keys(byYear).sort((a, b) =>
    (b === "TBA" ? -1 : Number(b)) - (a === "TBA" ? -1 : Number(a))
  );

  // Structured data
  const personLd = {
    "@context": "https://schema.org", "@type": "Person",
    name: person.name, image: person.photo || undefined,
    description: person.bio || `Odia ${rolesStr} in Ollywood`,
    jobTitle: rolesStr,
    nationality: { "@type": "Country", name: "India" },
    birthDate: person.dob || undefined,
    birthPlace: person.location ? { "@type": "Place", name: person.location } : undefined,
    url: canonical,
    sameAs: [
      person.instagram ? `https://instagram.com/${person.instagram.replace("@", "")}` : null,
      person.website ?? null,
    ].filter(Boolean),
    memberOf: { "@type": "Organization", name: "Ollywood – Odia Film Industry" },
  };
  const breadcrumbLd = {
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://ollypedia.in" },
      { "@type": "ListItem", position: 2, name: "Cast", item: "https://ollypedia.in/cast" },
      { "@type": "ListItem", position: 3, name: person.name, item: canonical },
    ],
  };
  const faqLd = {
    "@context": "https://schema.org", "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `How many Odia films has ${person.name} acted in?`,
        acceptedAnswer: { "@type": "Answer", text: movies.length > 0
          ? `${person.name} has been part of ${movies.length} Odia film${movies.length !== 1 ? "s" : ""} in Ollywood, including ${hits.length} box office hit${hits.length !== 1 ? "s" : ""}.`
          : `${person.name} is associated with Ollywood, the Odia film industry.` },
      },
      {
        "@type": "Question",
        name: `What is ${person.name}'s most popular Odia film?`,
        acceptedAnswer: { "@type": "Answer", text: hits.length > 0
          ? `${person.name}'s most celebrated Odia films include ${hits.slice(0, 3).map((m: any) => `"${m.title}"`).join(", ")}.`
          : movies.length > 0 ? `${person.name}'s recent work includes "${movies[0].title}".`
          : `Check Ollypedia for the latest updates on ${person.name}'s filmography.` },
      },
      {
        "@type": "Question",
        name: `What is ${person.name}'s role in Odia cinema?`,
        acceptedAnswer: { "@type": "Answer", text: `${person.name} works as a ${rolesStr} in the Odia film industry (Ollywood).` },
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(personLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />

      {/* ══ HERO BANNER ══ */}
      <div className="relative overflow-hidden h-64 md:h-80">
        {backdrop ? (
          <Image src={backdrop} alt="" fill
            className="object-cover object-top scale-110 blur-sm brightness-[0.2]" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a1200] to-[#0f0f0f]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a]/50 via-transparent to-transparent" />

        {/* Role badge */}
        <div className="absolute top-5 left-5">
          <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-400">
            {icon} {person.type || "Artist"}
          </span>
        </div>

        {/* Hit rate badge */}
        {hitRate !== null && (
          <div className="absolute top-5 right-5">
            <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-green-500/15 border border-green-500/30 text-green-400">
              {hitRate}% Hit Rate
            </span>
          </div>
        )}
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-gray-500 py-4" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-orange-400 transition-colors">Home</Link>
          <ChevronRight className="w-3 h-3" />
          <Link href="/cast" className="hover:text-orange-400 transition-colors">Cast</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-gray-300">{person.name}</span>
        </nav>

        {/* ══ HERO INFO ROW ══ */}
        <div className="flex flex-col sm:flex-row gap-6 mb-10 -mt-2">

          {/* Photo */}
          <div className="relative w-32 sm:w-40 md:w-48 flex-shrink-0 self-start">
            <div className="relative rounded-2xl overflow-hidden border-2 border-orange-500/40 shadow-2xl shadow-black/70"
              style={{ aspectRatio: "3/4" }}>
              {person.photo ? (
                <Image src={person.photo} alt={`${person.name} – Odia ${rolesStr}`}
                  fill className="object-cover object-top" priority />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-5xl bg-[#1a1a1a]">
                  {icon}
                </div>
              )}
            </div>
          </div>

          {/* Name + stats */}
          <div className="flex-1 min-w-0 pt-1">
            {/* Role pill */}
            <div className="flex flex-wrap gap-2 mb-3">
              <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400">
                {icon} {rolesStr}
              </span>
              {person.location && (
                <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] text-gray-400 flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {person.location}
                </span>
              )}
            </div>

            <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-black text-white leading-tight mb-4">
              {person.name}
            </h1>

            {/* Quick stat chips */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
              <div className="flex flex-col items-center justify-center rounded-xl px-4 py-3 bg-[#111] border border-[#1f1f1f] text-center">
                <p className="text-xl font-black text-white font-display">{movies.length}</p>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-0.5">Films</p>
              </div>
              <div className="flex flex-col items-center justify-center rounded-xl px-4 py-3 bg-[#111] border border-[#1f1f1f] text-center">
                <p className="text-xl font-black text-green-400 font-display">{hits.length}</p>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-0.5">Hits</p>
              </div>
              {hitRate !== null && (
                <div className="flex flex-col items-center justify-center rounded-xl px-4 py-3 bg-orange-500/10 border border-orange-500/30 text-center">
                  <p className="text-xl font-black text-orange-400 font-display">{hitRate}%</p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-0.5">Hit Rate</p>
                </div>
              )}
              {debutMovie?.releaseDate && (
                <div className="flex flex-col items-center justify-center rounded-xl px-4 py-3 bg-[#111] border border-[#1f1f1f] text-center">
                  <p className="text-xl font-black text-white font-display">
                    {new Date(debutMovie.releaseDate).getFullYear()}
                  </p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-0.5">Debut</p>
                </div>
              )}
            </div>

            {/* Bio preview */}
            {person.bio && (
              <p className="text-gray-400 text-sm leading-relaxed line-clamp-3 max-w-2xl">{person.bio}</p>
            )}

            {/* Social links */}
            {(person.instagram || person.website) && (
              <div className="flex gap-2 mt-3">
                {person.instagram && (
                  <a href={`https://instagram.com/${person.instagram.replace("@", "")}`}
                    target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-pink-500/10 border border-pink-500/30 text-pink-400 text-xs font-bold hover:bg-pink-500/20 transition-colors">
                    <Instagram className="w-3 h-3" /> Instagram
                  </a>
                )}
                {person.website && (
                  <a href={person.website} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] text-gray-400 text-xs font-bold hover:border-orange-500/30 hover:text-orange-400 transition-colors">
                    <Globe className="w-3 h-3" /> Website
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ══ MAIN CONTENT GRID ══ */}
        <div className="grid lg:grid-cols-3 gap-8 items-start">

          {/* ── SIDEBAR ── */}
          <aside className="lg:col-span-1 space-y-5 order-2 lg:order-1 self-start lg:sticky lg:top-6">

            {/* Profile card */}
            <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-5">
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Info className="w-3.5 h-3.5" /> Profile
              </h2>
              <InfoRow icon={User}        label="Full Name"    value={person.name} />
              <InfoRow icon={Clapperboard} label="Known For"   value={rolesStr} />
              <InfoRow icon={Calendar}    label="Date of Birth" value={fmtDate(person.dob)} />
              <InfoRow icon={MapPin}      label="Location"     value={person.location} />
              <InfoRow icon={User}        label="Gender"       value={person.gender} />
              <InfoRow icon={Film}        label="Total Films"  value={movies.length ? `${movies.length} Odia films` : undefined} />
              <InfoRow icon={Star}        label="Box Office Hits" value={hits.length ? `${hits.length} hits` : undefined} />
              {hitRate !== null && (
                <InfoRow icon={TrendingUp} label="Hit Rate" value={`${hitRate}%`} />
              )}
            </div>

            {/* Box office summary */}
            {movies.length > 0 && (
              <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-5">
                <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <BarChart2 className="w-3.5 h-3.5 text-orange-500" /> Career Stats
                </h2>
                <div className="space-y-0">
                  {[
                    { label: "Total Films",    value: String(movies.length), color: "text-white" },
                    { label: "Hits",           value: String(hits.length),   color: "text-green-400" },
                    { label: "Average",        value: String(movies.filter((m:any) => m.verdict === "Average").length), color: "text-yellow-400" },
                    { label: "Flops",          value: String(flops.length),  color: "text-red-400" },
                    { label: "Upcoming",       value: String(upcoming.length), color: "text-blue-400" },
                  ].filter(r => r.value !== "0").map(({ label, value, color }) => (
                    <div key={label} className="flex justify-between items-center py-2.5 border-b border-[#1f1f1f] last:border-0">
                      <span className="text-xs text-gray-500">{label}</span>
                      <span className={`text-sm font-bold ${color}`}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Genre breakdown */}
            {genres.length > 0 && (
              <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-5">
                <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Film className="w-3.5 h-3.5" /> Genre Breakdown
                </h2>
                <div className="space-y-2">
                  {genres.map(([g, count]) => {
                    const pct = movies.length > 0 ? Math.round((count / movies.length) * 100) : 0;
                    return (
                      <div key={g}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-300 font-medium">{g}</span>
                          <span className="text-orange-400 font-bold">{count} film{count !== 1 ? "s" : ""}</span>
                        </div>
                        <div className="h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-orange-600 to-orange-400"
                            style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quick links */}
            <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-5">
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Explore More</h2>
              <div className="flex flex-col gap-1">
                {[
                  { label: "All Odia Movies",    href: "/movies" },
                  { label: "Odia Songs",         href: "/songs" },
                  { label: "Box Office",         href: "/box-office" },
                  { label: "Cast & Crew",        href: "/cast" },
                  { label: "Odia Film Reviews",  href: "/blog/category/movie-review" },
                ].map(item => (
                  <Link key={item.href} href={item.href}
                    className="text-xs text-gray-400 hover:text-orange-400 flex items-center gap-2 py-1.5 transition-colors group border-b border-[#1a1a1a] last:border-0">
                    <span className="w-1 h-1 rounded-full bg-orange-500/50 group-hover:bg-orange-400 flex-shrink-0 transition-colors" />
                    {item.label}
                    <ChevronRight className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                ))}
              </div>
            </div>

            {/* Editorial credit */}
            <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-4 flex items-start gap-3">
              <div className="w-9 h-9 bg-orange-500/20 rounded-full flex-shrink-0 flex items-center justify-center text-orange-400 text-sm font-black">O</div>
              <div>
                <p className="text-xs text-gray-300 font-semibold">Ollypedia Editorial Team</p>
                <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">
                  Verified by our Odia cinema experts
                </p>
                <p className="text-[10px] text-gray-600 mt-1">
                  Updated: {new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
                </p>
              </div>
            </div>

          </aside>

          {/* ── MAIN CONTENT ── */}
          <main className="lg:col-span-2 space-y-10 order-1 lg:order-2">

            {/* ── About / Bio ── */}
            <section aria-label={`About ${person.name}`}>
              <SectionHeading icon={Info} title={`About ${person.name}`} />
              <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-6">
                {bio.split("\n\n").filter(Boolean).map((para: string, i: number) => (
                  <p key={i} className="text-gray-300 text-sm md:text-base leading-relaxed mb-4 last:mb-0">{para.trim()}</p>
                ))}
              </div>
            </section>

            {/* ── Filmography ── */}
            {movies.length > 0 && (
              <section id="cast-filmography" aria-label={`${person.name} filmography`}>
                <SectionHeading icon={Film} title="Filmography" count={movies.length} />
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {movies.map((m: any) => {
                    const entry = (m.cast || []).find((c: any) => String(c.castId) === String(person._id));
                    const style = vs(m.verdict);
                    return (
                      <Link key={String(m._id)} href={`/movie/${m.slug || String(m._id)}`}
                        className="group block bg-[#111] border border-[#1f1f1f] hover:border-orange-500/30 rounded-xl overflow-hidden transition-all hover:-translate-y-0.5">
                        <div className="relative aspect-[2/3] bg-[#1a1a1a]">
                          {m.posterUrl ? (
                            <Image src={m.posterUrl} alt={`${m.title} – Odia film`}
                              fill className="object-cover" sizes="180px" />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-3xl">🎬</div>
                          )}
                          {m.verdict && (
                            <div className="absolute top-2 left-2">
                              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${style.bg} ${style.text} ${style.border}`}>
                                {m.verdict}
                              </span>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                          <div className="absolute bottom-0 left-0 right-0 p-2">
                            {m.genre?.[0] && (
                              <span className="text-[9px] text-gray-400">{m.genre[0]}</span>
                            )}
                          </div>
                        </div>
                        <div className="p-2.5">
                          <p className="text-xs font-semibold text-white line-clamp-1 group-hover:text-orange-400 transition-colors">{m.title}</p>
                          <p className="text-[10px] text-gray-500 mt-0.5">
                            {entry?.role ? `as ${entry.role}` : fmtDate(m.releaseDate)}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}

            {/* ── Career Timeline ── */}
            {movies.length > 0 && (
              <section aria-label={`${person.name} career timeline`}>
                <SectionHeading icon={Clock} title="Career Timeline" />
                <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-6">
                  <p className="text-[11px] text-gray-600 uppercase tracking-widest mb-5">
                    {movies.length} films · Debut {timelineYears[timelineYears.length - 1]}
                  </p>
                  <div className="relative pl-6">
                    {/* Vertical line */}
                    <div className="absolute left-2 top-1 bottom-1 w-0.5 bg-gradient-to-b from-orange-500 to-orange-500/10 rounded-full" />
                    {timelineYears.map((yr, yi) => (
                      <div key={yr} className="relative mb-5 last:mb-0">
                        {/* Dot */}
                        <div className={`absolute -left-4 top-1 w-2.5 h-2.5 rounded-full border-2 border-orange-500 ${
                          yi === 0 ? "bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]" : "bg-[#0a0a0a]"
                        }`} />
                        <div className="flex items-start gap-3">
                          <span className="text-xs font-black text-orange-400 w-10 flex-shrink-0 pt-0.5">{yr}</span>
                          <div className="flex flex-wrap gap-2 flex-1">
                            {byYear[yr].map((m: any) => {
                              const style = vs(m.verdict);
                              return (
                                <Link key={String(m._id)} href={`/movie/${m.slug || String(m._id)}`}
                                  className="flex items-center gap-2 px-2.5 py-1 bg-[#0d0d0d] border border-[#1f1f1f] hover:border-orange-500/30 rounded-full text-xs text-white hover:text-orange-400 transition-all">
                                  {m.posterUrl && (
                                    <Image src={m.posterUrl} alt="" width={14} height={18}
                                      className="rounded-sm flex-shrink-0 object-cover" />
                                  )}
                                  <span className="font-medium">{m.title}</span>
                                  {m.verdict && m.verdict !== "Upcoming" && (
                                    <span className={`text-[9px] font-black ${style.text}`}>{m.verdict}</span>
                                  )}
                                </Link>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* ── Frequent Co-stars ── */}
            {costars.length > 0 && (
              <section aria-label={`${person.name} co-stars`}>
                <SectionHeading icon={Users} title="Frequent Co-stars" count={costars.length} />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {costars.map((c: any, i: number) => {
                    const inner = (
                      <div className="group bg-[#111] border border-[#1f1f1f] hover:border-orange-500/30 rounded-xl overflow-hidden transition-all hover:-translate-y-0.5">
                        <div className="relative h-36 bg-[#1a1a1a]">
                          {c.photo ? (
                            <Image src={c.photo} alt={c.name} fill className="object-cover object-top" sizes="180px" />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-3xl">🎭</div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                        </div>
                        <div className="p-2.5">
                          <p className="text-xs font-semibold text-white line-clamp-1 group-hover:text-orange-400 transition-colors">{c.name}</p>
                          <p className="text-[10px] text-orange-500 mt-0.5 font-medium">{c.count} film{c.count !== 1 ? "s" : ""} together</p>
                        </div>
                      </div>
                    );
                    return c.castId
                      ? <Link key={i} href={`/cast/${String(c.castId)}`}>{inner}</Link>
                      : <div key={i}>{inner}</div>;
                  })}
                </div>
              </section>
            )}

            {/* ── Songs ── */}
            {songs.length > 0 && (
              <section aria-label={`Songs featuring ${person.name}`}>
                <SectionHeading icon={Music} title="Songs" count={songs.length} />
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {songs.slice(0, 8).map((s: any, i: number) => (
                    <Link key={i}
                      href={s.ytId ? `https://youtube.com/watch?v=${s.ytId}` : `/songs/${s.movieSlug}`}
                      target={s.ytId ? "_blank" : undefined}
                      rel={s.ytId ? "noopener noreferrer" : undefined}
                      className="group bg-[#111] border border-[#1f1f1f] hover:border-orange-500/30 rounded-xl overflow-hidden transition-all">
                      <div className="relative aspect-video bg-[#1a1a1a]">
                        {s.thumbnailUrl ? (
                          <Image src={s.thumbnailUrl} alt={s.title} fill className="object-cover" sizes="180px" />
                        ) : s.ytId ? (
                          <Image src={`https://img.youtube.com/vi/${s.ytId}/mqdefault.jpg`}
                            alt={s.title} fill className="object-cover" sizes="180px" />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-2xl">🎵</div>
                        )}
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="w-8 h-8 rounded-full bg-red-600/90 flex items-center justify-center">
                            <Play className="w-3.5 h-3.5 text-white fill-white" />
                          </div>
                        </div>
                      </div>
                      <div className="p-2.5">
                        <p className="text-xs font-semibold text-white line-clamp-1 group-hover:text-orange-400 transition-colors">{s.title}</p>
                        {s.singer && <p className="text-[10px] text-gray-500 truncate mt-0.5">{s.singer}</p>}
                        <p className="text-[10px] text-orange-500/70 truncate">{s.movieTitle}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* ── Trailers ── */}
            {trailers.length > 0 && (
              <section aria-label={`${person.name} movie trailers`}>
                <SectionHeading icon={Play} title="Trailers" count={trailers.length} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {trailers.slice(0, 4).map((t: any, i: number) => (
                    <Link key={i} href={`https://youtube.com/watch?v=${t.ytId}`}
                      target="_blank" rel="noopener noreferrer"
                      className="group bg-[#111] border border-[#1f1f1f] hover:border-orange-500/30 rounded-xl overflow-hidden transition-all">
                      <div className="relative aspect-video bg-[#1a1a1a]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={`https://img.youtube.com/vi/${t.ytId}/mqdefault.jpg`}
                          alt={`${t.movieTitle} trailer`} loading="lazy"
                          className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <div className="w-12 h-12 rounded-full bg-red-600/90 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Play className="w-5 h-5 text-white fill-white" />
                          </div>
                        </div>
                        <div className="absolute top-2 right-2 text-[10px] bg-black/70 text-white px-2 py-0.5 rounded font-bold">
                          Trailer
                        </div>
                      </div>
                      <div className="p-2.5">
                        <p className="text-xs font-semibold text-white group-hover:text-orange-400 transition-colors line-clamp-1">{t.movieTitle}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* ── Related News ── */}
            {newsList.length > 0 && (
              <section aria-label={`News about ${person.name}`}>
                <SectionHeading icon={Newspaper} title="Related News" count={newsList.length} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {newsList.slice(0, 6).map((n: any) => (
                    <Link key={String(n._id)} href={`/news/${String(n._id)}`}
                      className="group flex gap-3 bg-[#111] border border-[#1f1f1f] hover:border-orange-500/30 rounded-xl p-3 transition-all">
                      <div className="relative w-20 h-14 flex-shrink-0 rounded-lg overflow-hidden bg-[#1a1a1a]">
                        {n.imageUrl ? (
                          <Image src={n.imageUrl} alt={n.title} fill className="object-cover" sizes="80px" />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-xl">📰</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        {n.category && (
                          <span className="text-[9px] font-bold text-orange-500 uppercase tracking-wider">{n.category}</span>
                        )}
                        <p className="text-xs font-semibold text-white group-hover:text-orange-400 transition-colors line-clamp-2 mt-0.5 leading-snug">{n.title}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* ══ SEO CONTENT BLOCK ══ */}
            <section aria-label={`${person.name} career information and FAQ`} className="space-y-5">

              {/* Detailed career editorial */}
              <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-6">
                <SectionHeading title={`${person.name} – Career & Contributions to Odia Cinema`} />
                <div className="space-y-3 text-gray-400 text-sm leading-relaxed">
                  <p>
                    <strong className="text-white">{person.name}</strong> is one of Ollywood's celebrated{" "}
                    <strong className="text-white">{rolesStr.toLowerCase()}s</strong>, having contributed
                    to <strong className="text-white">{movies.length} Odia films</strong> in the{" "}
                    <strong className="text-white">Odia film industry</strong> (popularly known as{" "}
                    <strong className="text-white">Ollywood</strong>), headquartered in Bhubaneswar, Odisha.
                  </p>

                  {hits.length > 0 && (
                    <p>
                      Among their notable works, <strong className="text-white">{hits.length} films</strong> earned
                      a <strong className="text-white">Hit, Super Hit, or Blockbuster verdict</strong> at the Odia
                      box office, including{" "}
                      {hits.slice(0, 3).map((m: any, i: number) => (
                        <span key={String(m._id)}>
                          <Link href={`/movie/${m.slug || String(m._id)}`}
                            className="text-orange-400 hover:text-orange-300 transition-colors">
                            {m.title}
                          </Link>
                          {i < Math.min(hits.length, 3) - 1 ? ", " : ""}
                        </span>
                      ))}.
                    </p>
                  )}

                  {genres.length > 0 && (
                    <p>
                      {person.name} has worked across multiple genres in Odia cinema, including{" "}
                      <strong className="text-white">{genres.map(([g]) => g).join(", ")}</strong>.
                      This versatility has made them a sought-after name across all kinds of{" "}
                      <strong className="text-white">Ollywood productions</strong>.
                    </p>
                  )}

                  {debutMovie && (
                    <p>
                      {person.name} made their Odia film debut{debutMovie.releaseDate
                        ? ` in ${new Date(debutMovie.releaseDate).getFullYear()}`
                        : ""}{" "}
                      with the film{" "}
                      <Link href={`/movie/${debutMovie.slug || String(debutMovie._id)}`}
                        className="text-orange-400 hover:text-orange-300 transition-colors">
                        {debutMovie.title}
                      </Link>.
                      Since then, they have steadily grown into one of Ollywood's most recognised faces,
                      building a loyal fanbase across Odisha and among the global Odia diaspora.
                    </p>
                  )}

                  <p>
                    Follow <strong className="text-white">{person.name}</strong>'s complete filmography,
                    songs, trailers and box office records on Ollypedia — the most comprehensive Odia
                    cinema database online.
                  </p>
                </div>

                {/* Internal topic links */}
                <div className="flex flex-wrap gap-2 mt-5 pt-5 border-t border-[#1f1f1f]">
                  <Link href="/cast"
                    className="text-xs text-orange-400/80 hover:text-orange-400 bg-orange-500/8 border border-orange-500/15 px-2.5 py-1 rounded-full transition-colors">
                    🎭 All Cast Profiles
                  </Link>
                  <Link href="/movies"
                    className="text-xs text-orange-400/80 hover:text-orange-400 bg-orange-500/8 border border-orange-500/15 px-2.5 py-1 rounded-full transition-colors">
                    🎬 Odia Movies
                  </Link>
                  <Link href="/box-office"
                    className="text-xs text-orange-400/80 hover:text-orange-400 bg-orange-500/8 border border-orange-500/15 px-2.5 py-1 rounded-full transition-colors">
                    📊 Box Office
                  </Link>
                  {genres[0] && (
                    <Link href={`/movies?genre=${encodeURIComponent(genres[0][0])}`}
                      className="text-xs text-orange-400/80 hover:text-orange-400 bg-orange-500/8 border border-orange-500/15 px-2.5 py-1 rounded-full transition-colors">
                      🎭 {genres[0][0]} Films
                    </Link>
                  )}
                </div>
              </div>

              {/* FAQ accordion */}
              <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-6">
                <SectionHeading icon={MessageSquare} title={`FAQs about ${person.name}`} />
                <div className="space-y-2">
                  {[
                    {
                      q: `How many Odia films has ${person.name} acted in?`,
                      a: movies.length > 0
                        ? `${person.name} has been part of ${movies.length} Odia film${movies.length !== 1 ? "s" : ""} in Ollywood. Their filmography includes ${hits.length} box office hit${hits.length !== 1 ? "s" : ""} and spans genres such as ${[...new Set(movies.flatMap((m: any) => m.genre || []))].slice(0, 3).join(", ") || "drama and action"}.`
                        : `${person.name} is associated with Ollywood. Stay tuned to Ollypedia for their latest updates.`,
                    },
                    {
                      q: `What is ${person.name}'s most popular Odia film?`,
                      a: hits.length > 0
                        ? `${person.name}'s most celebrated Odia films include ${hits.slice(0, 3).map((m: any) => `"${m.title}"`).join(", ")}, all of which received a hit or blockbuster verdict at the Odia box office.`
                        : movies.length > 0
                          ? `${person.name}'s recent Odia work includes "${movies[0].title}". Visit each movie page on Ollypedia for detailed box office and review information.`
                          : `Check Ollypedia for the latest updates on ${person.name}'s filmography.`,
                    },
                    {
                      q: `What is ${person.name}'s role in Odia cinema?`,
                      a: `${person.name} works as a ${rolesStr} in the Odia film industry (Ollywood). ${person.bio ? person.bio.slice(0, 150) + "..." : `They have made significant contributions to Odia cinema and remain a beloved figure among Odia audiences.`}`,
                    },
                    {
                      q: `When did ${person.name} debut in Ollywood?`,
                      a: debutMovie
                        ? `${person.name} made their Ollywood debut${debutMovie.releaseDate ? ` in ${new Date(debutMovie.releaseDate).getFullYear()}` : ""} with the film "${debutMovie.title}".`
                        : `Debut information for ${person.name} is available on Ollypedia's cast profile page.`,
                    },
                    {
                      q: `What genres has ${person.name} worked in?`,
                      a: genres.length > 0
                        ? `${person.name} has worked in ${genres.map(([g, c]) => `${g} (${c} film${c !== 1 ? "s" : ""})`).join(", ")} in their Odia film career.`
                        : `${person.name} has worked across various genres in Odia cinema. Explore their full filmography on Ollypedia.`,
                    },
                  ].map((faq, i) => (
                    <details key={i} className="group border border-[#1a1a1a] rounded-xl overflow-hidden">
                      <summary className="cursor-pointer px-4 py-3.5 text-sm font-semibold text-gray-200 list-none flex justify-between items-center gap-3 select-none hover:text-orange-400 hover:bg-[#0d0d0d] transition-all">
                        <span>{faq.q}</span>
                        <span className="text-gray-500 group-open:rotate-180 transition-transform duration-200 flex-shrink-0 text-xs">▼</span>
                      </summary>
                      <div className="px-4 pb-4 pt-1 border-t border-[#1a1a1a]">
                        <p className="text-sm text-gray-400 leading-relaxed">{faq.a}</p>
                      </div>
                    </details>
                  ))}
                </div>
              </div>

            </section>

            {movies.length === 0 && (
              <div className="text-center py-20 bg-[#111] border border-[#1f1f1f] rounded-2xl">
                <Film className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                <p className="text-gray-400 text-sm">No films linked to {person.name} yet.</p>
              </div>
            )}

          </main>
        </div>
      </div>
    </>
  );
}