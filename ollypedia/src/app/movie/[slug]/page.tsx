// app/movie/[slug]/page.tsx
// Full redesign — improved readability, AdSense-ready SEO content, rich structured data

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { connectDB } from "@/lib/db";
import Movie from "@/models/Movie";
import Blog from "@/models/Blog";
import { buildMeta, movieJsonLd, breadcrumbJsonLd } from "@/lib/seo";
import { YouTubeEmbed }  from "@/components/ui/YouTubeEmbed";
import { Breadcrumb }    from "@/components/ui/Breadcrumb";
import { VoteButtons }   from "@/components/ui/VoteButtons";
import { ReviewForm }    from "@/components/movie/ReviewForm";
import { MovieCard }         from "@/components/movie/MovieCard";
import { ReleaseCountdown }  from "@/components/movie/ReleaseCountdown";
import { ShareButtons }      from "@/components/movie/ShareButtons";
import { StarRating }    from "@/components/ui/StarRating";
import { SongRowClient } from "@/components/movie/SongRowClient";
import { BoxOfficeDaysChart } from "@/components/movie/BoxOfficeDaysChart";
import {
  Calendar, Clock, User, DollarSign, Film, Star,
  Clapperboard, Music, FileText, ChevronRight,
  TrendingUp, Award, Globe, Users, BookOpen,
  Play, Info, MessageSquare, Tag,
} from "lucide-react";

export const revalidate    = 3600;
export const dynamicParams = true;

// ─── helpers ──────────────────────────────────────────────────────────────────
function toSlug(str?: string): string {
  return (str || "")
    .toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function fmtDate(iso?: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric", month: "long", year: "numeric",
  });
}

const VERDICT_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  Blockbuster: { bg: "bg-green-500/15",   text: "text-green-400",   border: "border-green-500/30" },
  "Super Hit": { bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/30" },
  Hit:         { bg: "bg-lime-500/15",    text: "text-lime-400",    border: "border-lime-500/30" },
  Average:     { bg: "bg-yellow-500/15",  text: "text-yellow-400",  border: "border-yellow-500/30" },
  Flop:        { bg: "bg-red-500/15",     text: "text-red-400",     border: "border-red-500/30" },
  Disaster:    { bg: "bg-red-600/15",     text: "text-red-500",     border: "border-red-600/30" },
  Upcoming:    { bg: "bg-blue-500/15",    text: "text-blue-400",    border: "border-blue-500/30" },
};

function verdictStyle(v?: string) {
  return VERDICT_STYLE[v || ""] || { bg: "bg-orange-500/15", text: "text-orange-400", border: "border-orange-500/30" };
}

// ─── Cast / Crew helpers ───────────────────────────────────────────────────
const CREW_ROLES = ["Director", "Producer", "Writer", "Screenplay", "Story", "Dialogue",
  "Music", "Cinematographer", "Editor", "Choreographer", "Art Director",
  "Costume Designer", "Sound Designer", "Stunt Coordinator", "VFX Supervisor"];

const CREW_ROLE_ORDER: Record<string, number> = Object.fromEntries(
  CREW_ROLES.map((r, i) => [r.toLowerCase(), i])
);

// Returns true only if the role is PURELY a crew role (not acting).
// An actor who is also a producer should NOT be classified as crew-only.
function isCrewRole(role?: string): boolean {
  if (!role) return false;
  const r = role.toLowerCase().trim();
  // If the role explicitly says "actor", "lead", "heroine", "hero" — it's a cast role
  const actingKeywords = ["actor", "actress", "lead", "hero", "heroine", "supporting", "cameo", "special appearance"];
  if (actingKeywords.some(kw => r.includes(kw))) return false;
  return CREW_ROLES.some((cr) => r.includes(cr.toLowerCase()));
}

// Splits a multi-role string into individual roles.
// "Director, Producer & Writer" → ["director", "producer", "writer"]
function splitRoles(role?: string): string[] {
  if (!role) return [];
  return role
    .toLowerCase()
    .split(/[,&\/|+]|\band\b/)
    .map(r => r.trim())
    .filter(Boolean);
}

// Returns true only for the main film Director.
// Handles multi-role strings like "Director & Producer", "Director/Writer" etc.
// Uses a WHITELIST so any prefixed variant (Action Director, Music Director) is rejected.
function isPureDirector(role?: string): boolean {
  if (!role) return false;
  const DIRECTOR_EXACT = ["director", "film director", "movie director"];
  return splitRoles(role).some(r => DIRECTOR_EXACT.includes(r));
}

// Returns true only for the main Producer.
// Handles multi-role strings and rejects Executive/Co/Line producer variants.
function isPureProducer(role?: string): boolean {
  if (!role) return false;
  const NOT_PRODUCER = ["executive producer", "co-producer", "associate producer",
    "assistant producer", "line producer", "co producer"];
  const roles = splitRoles(role);
  // Reject if any sub-role is a non-main producer variant
  if (NOT_PRODUCER.some(np => roles.includes(np))) return false;
  return roles.some(r => r === "producer");
}

function splitCastCrew(castList: any[]): { crew: any[]; cast: any[] } {
  const crew: any[] = [];
  const cast: any[] = [];
  for (const m of (castList || [])) {
    const role = (m.role || m.type || "").toLowerCase().trim();
    const isCrew = isCrewRole(m.role) || isCrewRole(m.type);
    // Check if this person is ALSO an actor (actor-producer, actor-director etc.)
    const actingKeywords = ["actor", "actress", "lead", "hero", "heroine", "supporting", "cameo", "special appearance"];
    const isActor = actingKeywords.some(kw => role.includes(kw));

    if (isCrew) crew.push(m);
    // Show in cast if: purely an actor, OR an actor who also has a crew role
    if (!isCrew || isActor) cast.push(m);
  }
  // Sort crew by role priority
  crew.sort((a, b) => {
    const ra = (a.role || a.type || "").toLowerCase();
    const rb = (b.role || b.type || "").toLowerCase();
    const orderA = Math.min(...CREW_ROLES.map((cr, i) => ra.includes(cr.toLowerCase()) ? i : 999));
    const orderB = Math.min(...CREW_ROLES.map((cr, i) => rb.includes(cr.toLowerCase()) ? i : 999));
    return orderA - orderB;
  });
  return { crew, cast };
}

// Gets the pure Director name (not Music Director, Art Director)
function getDirectorFromCast(castList: any[]): string | undefined {
  const found = (castList || []).find((m: any) => isPureDirector(m.role) || isPureDirector(m.type));
  return found?.name;
}

// Gets the main Producer name (not Executive Producer, Co-Producer)
function getProducerFromCast(castList: any[]): string | undefined {
  // First try exact "Producer" match
  const exact = (castList || []).find((m: any) => {
    const r = (m.role || m.type || "").toLowerCase().trim();
    return r === "producer";
  });
  if (exact) return exact.name;
  // Then try isPureProducer
  const found = (castList || []).find((m: any) => isPureProducer(m.role) || isPureProducer(m.type));
  return found?.name;
}

// ─── Static params ─────────────────────────────────────────────────────────
export async function generateStaticParams() {
  return [];
}

// ─── Data helpers ─────────────────────────────────────────────────────────
async function getMovie(slug: string) {
  await connectDB();
  const isOid = /^[a-f0-9]{24}$/i.test(slug);
  const raw = isOid
    ? await Movie.findById(slug).populate("productionId", "name logo").lean()
    : await Movie.findOne({ slug }).populate("productionId", "name logo").lean();
  if (!raw) return null;
  const serialized = JSON.parse(JSON.stringify(raw));
  // Normalize productionId after serialization so name is always accessible
  if (serialized.productionId && typeof serialized.productionId === "object") {
    serialized._productionName = serialized.productionId.name || null;
    serialized._productionLogo = serialized.productionId.logo || null;
  } else {
    serialized._productionName = null;
    serialized._productionLogo = null;
  }
  return serialized;
}

async function getRelated(movie: any) {
  await connectDB();
  const castIds = (movie.cast || []).slice(0, 5).map((c: any) => c.castId).filter(Boolean);
  const raw = await Movie.find(
    {
      _id: { $ne: movie._id },
      $or: [
        { genre: { $in: movie.genre || [] } },
        ...(castIds.length ? [{ "cast.castId": { $in: castIds } }] : []),
        ...(movie.director ? [{ director: movie.director }] : []),
      ],
    },
    "title slug posterUrl thumbnailUrl releaseDate genre verdict"
  ).limit(6).lean();
  return JSON.parse(JSON.stringify(raw));
}

async function getMovieBlogs(movieTitle: string) {
  await connectDB();
  const blogs = await (Blog as any).find({
    published: true,
    $or: [
      { movieTitle: { $regex: new RegExp(movieTitle, "i") } },
      { tags:       { $elemMatch: { $regex: new RegExp(movieTitle, "i") } } },
      { title:      { $regex: new RegExp(movieTitle, "i") } },
    ],
  })
    .select("title slug excerpt coverImage category createdAt")
    .sort({ createdAt: -1 })
    .limit(6)
    .lean();
  return JSON.parse(JSON.stringify(blogs));
}

// ─── Misspelling generator ──────────────────────────────────────────────────
function getMisspellings(title: string): string[] {
  if (!title) return [];
  const variants = new Set<string>();
  const words = title.trim().split(/\s+/);
  for (const word of words) {
    if (word.length < 3) continue;
    const w = word.toLowerCase();
    variants.add(w.replace(/([aeiou])\1+/g, "$1"));
    variants.add(w.replace(/([aeiou])(?!\1)/g, "$1$1"));
    variants.add(w.slice(0, -1));
    variants.add(w.replace(/a/g, "e"));
    variants.add(w.replace(/a/g, "o"));
    variants.add(w.replace(/h/g, ""));
    variants.add(w.replace(/ph/g, "f"));
  }
  const result: string[] = [];
  variants.forEach((v) => {
    if (v && v !== title.toLowerCase() && v.length > 2) {
      result.push(v);
      result.push(`${v} odia movie`);
    }
  });
  return result;
}

// ─── Metadata ─────────────────────────────────────────────────────────────
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const movie = await getMovie(params.slug);
  if (!movie) return { robots: { index: false, follow: false } };
  if (!movie.title?.trim()) return { robots: { index: false, follow: false } };

  const year      = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : "";
  const yearStr   = year ? ` (${year})` : "";

  // OTT helpers for title/description
  const ottDate     = movie.ottReleaseDate || "";
  const isTBA       = ottDate === "TBA";
  const isOttLive   = !isTBA && (!ottDate || new Date(ottDate) <= new Date());
  const isOttComing = !isTBA && !!ottDate && new Date(ottDate) > new Date();
  const ottFmtDate  = (ottDate && ottDate !== "TBA") ? new Date(ottDate).toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"}) : "";

  // Dynamic title: append OTT info when available
  const ottTitleSuffix = movie.streamingOn
    ? isOttLive
      ? ` | Now on ${movie.streamingOn}`
      : isOttComing
      ? ` | OTT ${ottFmtDate}`
      : isTBA
      ? ` | OTT Release Soon`
      : ""
    : "";
  const title = `${movie.title}${yearStr} – Cast, Songs & Review${ottTitleSuffix} | Ollypedia`;

  // Dynamic description: weave in OTT info
  const ottDescPart = movie.streamingOn
    ? isOttLive
      ? ` Now streaming on ${movie.streamingOn}.`
      : isOttComing
      ? ` OTT release on ${movie.streamingOn} from ${ottFmtDate}.`
      : isTBA
      ? ` OTT release on ${movie.streamingOn} — date to be announced.`
      : ""
    : "";
  const description = (
    movie.synopsis
      ? movie.synopsis.slice(0, 130) + ottDescPart
      : `Complete info about Odia film ${movie.title}${yearStr}${ottDescPart} Cast, songs, trailer, box office & reviews on Ollypedia.`
  ).slice(0, 160);

  const image     = movie.posterUrl || movie.thumbnailUrl || "https://ollypedia.in/default.jpg";
  const canonical = `https://ollypedia.in/movie/${movie.slug || movie._id}`;

  // ── OTT keyword matrix ──────────────────────────────────────────────────────
  const ottKw: string[] = movie.streamingOn ? [
    // Generic OTT search patterns
    `${movie.title} ott`,
    `${movie.title} ott release`,
    `${movie.title} ott release date`,
    `${movie.title} ott platform`,
    `${movie.title} watch online`,
    `${movie.title} streaming`,
    `${movie.title} streaming platform`,
    `${movie.title} where to watch`,
    `${movie.title} online watch`,
    `${movie.title} watch free`,
    `${movie.title} digital release`,
    `${movie.title} digital release date`,
    `${movie.title} web release`,
    `${movie.title} web release date`,
    `${movie.title} available online`,
    `${movie.title} download`,
    `${movie.title} full movie`,
    `${movie.title} full movie online`,
    `${movie.title} full movie watch online`,
    // Platform-specific
    `${movie.title} ${movie.streamingOn}`,
    `${movie.title} ${movie.streamingOn} release date`,
    `${movie.title} ${movie.streamingOn} watch`,
    `watch ${movie.title} on ${movie.streamingOn}`,
    `${movie.title} on ${movie.streamingOn}`,
    // With year
    year ? `${movie.title} ${year} ott` : "",
    year ? `${movie.title} ${year} ott release date` : "",
    year ? `${movie.title} ${year} watch online` : "",
    year ? `${movie.title} ${year} ${movie.streamingOn}` : "",
    year ? `${movie.title} ${year} streaming` : "",
    year ? `${movie.title} ${year} digital release` : "",
    // Odia-specific OTT queries
    `${movie.title} odia movie ott`,
    `${movie.title} odia film ott`,
    `${movie.title} odia movie watch online`,
    `${movie.title} odia movie streaming`,
    `${movie.title} odia movie digital release`,
    `${movie.title} odia full movie`,
    `${movie.title} odia full movie online`,
    // Status-specific keywords
    ...(isOttLive ? [
      `${movie.title} now streaming`,
      `${movie.title} now available online`,
      `watch ${movie.title} online now`,
      `${movie.title} ${movie.streamingOn} available`,
    ] : []),
    ...(isOttComing ? [
      `${movie.title} ott release ${ottFmtDate}`,
      `when is ${movie.title} on ott`,
      `${movie.title} ott date`,
    ] : []),
    ...(isTBA ? [
      `${movie.title} ott date tba`,
      `when will ${movie.title} release on ott`,
      `${movie.title} ott announced`,
    ] : []),
    // Odia OTT platform generics (helps rank for category searches)
    `aao nxt odia movies`, `tarang plus odia movies`, `kanccha lannka movies`,
    `odia movie ott release ${year || ""}`.trim(),
    `ollywood ott release ${year || ""}`.trim(),
    `odia film streaming platform`,
  ].filter(Boolean) as string[] : [
    // No platform yet — rank for "where to watch" queries anyway
    `${movie.title} ott`,
    `${movie.title} watch online`,
    `${movie.title} streaming`,
    `${movie.title} ott release date`,
    `${movie.title} where to watch`,
    `${movie.title} digital release date`,
    `odia movie ott release`,
    `ollywood ott`,
  ];

  // ── Core keyword matrix ─────────────────────────────────────────────────────
  const directorName = getDirectorFromCast(movie.cast || []) || movie.director;
  const producerName = getProducerFromCast(movie.cast || []) || movie.producer;

  const keywords = [
    movie.title,
    `${movie.title} odia movie`,
    `${movie.title} odia film`,
    `${movie.title} ollywood`,
    `${movie.title} review`,
    `${movie.title} songs`,
    `${movie.title} cast`,
    `${movie.title} trailer`,
    `${movie.title} box office`,
    `${movie.title} box office collection`,
    `${movie.title} collection`,
    year ? `${movie.title} ${year}` : null,
    year ? `${movie.title} odia movie ${year}` : null,
    year ? `${movie.title} ${year} release` : null,
    directorName ? `${movie.title} directed by ${directorName}` : null,
    directorName ? `${directorName} movie` : null,
    directorName ? `${directorName} odia film` : null,
    directorName ? `${directorName} new movie` : null,
    producerName ? `${producerName} production` : null,
    producerName ? `${producerName} odia film` : null,
    "Odia movie", "Ollywood", "Odia film", "Odia cinema", "Ollywood movies",
    year ? `Odia movie ${year}` : null,
    year ? `Ollywood ${year}` : null,
    `${movie.title} rating`,
    `${movie.title} hit or flop`,
    movie.verdict ? `${movie.title} ${movie.verdict.toLowerCase()}` : null,
    ...(movie.genre || []).flatMap((g: string) => [`${g} Odia film`, `${g} Ollywood movie`, `Odia ${g} film ${year || ""}`.trim()]),
    ...(movie.cast || []).slice(0, 5).map((c: any) => c.name).filter(Boolean).flatMap((n: string) => [n, `${n} odia movie`, `${n} new movie`]),
    ...getMisspellings(movie.title),
    // OTT keyword matrix
    ...ottKw,
  ].filter(Boolean) as string[];

  return {
    title, description, keywords,
    metadataBase: new URL("https://ollypedia.in"),
    alternates: { canonical },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-snippet": -1, "max-image-preview": "large" } },
    openGraph: {
      title, description, url: canonical, siteName: "Ollypedia",
      type: "video.movie",
      images: [{ url: movie.bannerUrl || image, width: 1200, height: 630, alt: movie.title }],
    },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

// ─── JSON-LD helpers ──────────────────────────────────────────────────────
function buildFaqJsonLd(movie: any, year: string | number, avgRating: number | null, songs: any[], directorName?: string, producerName?: string) {
  const items = [
    {
      question: `What is ${movie.title} movie about?`,
      answer: movie.synopsis?.slice(0, 300) ||
        `${movie.title} is an Odia ${movie.genre?.join(", ") || "drama"} film${year ? ` released in ${year}` : ""}${directorName ? `, directed by ${directorName}` : ""}.`,
    },
    ...(movie.cast?.length ? [{
      question: `Who is in the cast of ${movie.title}?`,
      answer: `${movie.title} features ${movie.cast.slice(0, 5).map((c: any) => c.name).join(", ")}.`,
    }] : []),
    ...(movie.verdict ? [{
      question: `What is the box office verdict of ${movie.title}?`,
      answer: `${movie.title} was declared a ${movie.verdict} at the Ollywood box office.`,
    }] : []),
    ...(avgRating !== null ? [{
      question: `Is ${movie.title} worth watching?`,
      answer: `Based on user reviews on Ollypedia, ${movie.title} has an average rating of ${(avgRating as number).toFixed(1)}/10 from ${movie.reviews?.length} reviews.`,
    }] : []),
    ...(songs.length > 0 ? [{
      question: `How many songs does ${movie.title} have?`,
      answer: `${movie.title} has ${songs.length} song${songs.length > 1 ? "s" : ""} in its soundtrack.`,
    }] : []),
    ...(directorName ? [{
      question: `Who is the director of ${movie.title}?`,
      answer: `${movie.title} was directed by ${directorName}${producerName ? ` and produced by ${producerName}` : ""}${year ? ` (${year})` : ""}.`,
    }] : []),
    // OTT FAQ — critical for search visibility
    {
      question: `Is ${movie.title} available on OTT?`,
      answer: movie.streamingOn
        ? (() => {
            const od = movie.ottReleaseDate || "";
            const tba = od === "TBA";
            const live = !tba && (!od || new Date(od) <= new Date());
            const coming = !tba && !!od && new Date(od) > new Date();
            const fmtD = od && od !== "TBA" ? new Date(od).toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"}) : "";
            if (live) return `Yes, ${movie.title} is currently streaming on ${movie.streamingOn}${movie.streamingUrl ? ` at ${movie.streamingUrl}` : ""}. You can watch it online now.`;
            if (coming) return `${movie.title} will be available on ${movie.streamingOn} from ${fmtD}. It has not yet released on OTT.`;
            if (tba) return `${movie.title} is confirmed for OTT release on ${movie.streamingOn}. The exact date has not been announced yet.`;
            return `${movie.title} is available to stream on ${movie.streamingOn}.`;
          })()
        : `The OTT release date and platform for ${movie.title} have not been officially announced. It may release on Aao NXT, Tarang Plus, or Kanccha Lannka. Follow Ollypedia for updates.`,
    },
    {
      question: `When is the OTT release date of ${movie.title}?`,
      answer: movie.streamingOn
        ? (() => {
            const od = movie.ottReleaseDate || "";
            const tba = od === "TBA";
            const live = !tba && (!od || new Date(od) <= new Date());
            const coming = !tba && !!od && new Date(od) > new Date();
            const fmtD = od && od !== "TBA" ? new Date(od).toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"}) : "";
            if (live) return `${movie.title} has already released on OTT${od && od !== "TBA" ? ` on ${fmtD}` : ""}. It is now streaming on ${movie.streamingOn}.`;
            if (coming) return `The OTT release date of ${movie.title} is ${fmtD}. It will stream on ${movie.streamingOn}.`;
            if (tba) return `The OTT release date of ${movie.title} on ${movie.streamingOn} is to be announced (TBA).`;
            return `${movie.title} is streaming on ${movie.streamingOn}.`;
          })()
        : `The OTT release date of ${movie.title} has not been announced yet.`,
    },
  ];
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

function buildAggregateRatingJsonLd(movie: any, avgRating: number) {
  return {
    "@context": "https://schema.org",
    "@type": "Movie",
    name: movie.title,
    url: `https://ollypedia.in/movie/${movie.slug || movie._id}`,
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: avgRating.toFixed(1),
      bestRating: "10",
      worstRating: "1",
      reviewCount: String(movie.reviews?.length || 1),
    },
  };
}

// ─── UI sub-components ────────────────────────────────────────────────────

function SectionHeading({ icon: Icon, title, count }: { icon?: any; title: string; count?: number }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="w-1 h-7 bg-orange-500 rounded-full flex-shrink-0" />
      <h2 className="font-display text-xl md:text-2xl font-bold text-white flex items-center gap-2">
        {Icon && <Icon className="w-5 h-5 text-orange-500" />}
        {title}
        {count !== undefined && (
          <span className="text-gray-500 text-base font-normal">({count})</span>
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

function StatChip({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`flex items-center gap-2 rounded-lg px-3 py-2 border ${
      accent ? "bg-orange-500/8 border-orange-500/20" : "bg-[#111] border-[#1f1f1f]"
    }`}>
      <div className="min-w-0">
        <p className="text-[9px] text-gray-600 uppercase tracking-widest leading-none mb-0.5">{label}</p>
        <p className={`text-xs font-bold truncate leading-snug ${accent ? "text-orange-400" : "text-white"}`}>{value}</p>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────
export default async function MovieDetailPage({ params }: { params: { slug: string } }) {
  const movie = await getMovie(params.slug);
  if (!movie) notFound();
  if (!movie.title?.trim()) notFound();

  const [related, blogs] = await Promise.all([getRelated(movie), getMovieBlogs(movie.title)]);

  const avgRating  = movie.reviews?.length
    ? movie.reviews.reduce((s: number, r: any) => s + (r.rating || 0), 0) / movie.reviews.length
    : null;
  const year      = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : "";
  const songs     = movie.media?.songs || [];
  const trailer   = movie.media?.trailer;
  const canonical = `https://ollypedia.in/movie/${movie.slug || movie._id}`;
  const vs        = verdictStyle(movie.verdict);

  // Prefer cast-list names, fall back to movie fields
  const directorName = getDirectorFromCast(movie.cast || []) || movie.director;
  const producerName = getProducerFromCast(movie.cast || []) || movie.producer;

  // ── Enriched Movie JSON-LD ──────────────────────────────────────────────────
  const { crew: crewForSchema } = splitCastCrew(movie.cast || []);
  const actorObjects = (movie.cast || [])
    .filter((m: any) => !isCrewRole(m.role) && !isCrewRole(m.type))
    .slice(0, 10)
    .map((m: any) => ({
      "@type": "Person",
      name: m.name,
      ...(m.castId ? { url: `https://ollypedia.in/cast/${m.castId}` } : {}),
    }));
  const dirCrewEntry = crewForSchema.find((c: any) => c.role?.toLowerCase().includes("director"));
  const directorPersonObj = directorName
    ? [{ "@type": "Person", name: directorName, ...(dirCrewEntry?.castId ? { url: `https://ollypedia.in/cast/${dirCrewEntry.castId}` } : {}) }]
    : [];

  const enrichedMovieSchema = {
    "@context": "https://schema.org",
    "@type": "Movie",
    name: movie.title,
    url: canonical,
    ...(movie.posterUrl || movie.thumbnailUrl ? { image: movie.posterUrl || movie.thumbnailUrl } : {}),
    ...(movie.synopsis ? { description: movie.synopsis.slice(0, 300) } : {}),
    ...(movie.releaseDate ? { datePublished: movie.releaseDate } : {}),
    inLanguage: movie.language || "Odia",
    countryOfOrigin: { "@type": "Country", name: "India" },
    ...(movie.contentRating ? { contentRating: movie.contentRating } : {}),
    ...(movie.genre?.length ? { genre: movie.genre } : {}),
    ...(actorObjects.length ? { actor: actorObjects } : {}),
    ...(directorPersonObj.length ? { director: directorPersonObj } : {}),
    ...(producerName ? { producer: { "@type": "Person", name: producerName } } : {}),
    ...(avgRating !== null ? {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: (avgRating as number).toFixed(1),
        bestRating: "10", worstRating: "1",
        reviewCount: String(movie.reviews?.length || 1),
      },
    } : {}),
...(movie._productionName ? { productionCompany: { "@type": "Organization", name: movie._productionName } } : {}),
    // WatchAction — tells Google where/when this movie can be watched
    ...(movie.streamingOn && movie.streamingUrl && (() => {
      const od = movie.ottReleaseDate || "";
      return od !== "TBA" && (!od || new Date(od) <= new Date());
    })() ? {
      potentialAction: {
        "@type": "WatchAction",
        target: movie.streamingUrl,
        "actionAccessibilityRequirement": {
          "@type": "ActionAccessSpecification",
          "category": "subscription",
          "availabilityStarts": movie.ottReleaseDate && movie.ottReleaseDate !== "TBA"
            ? new Date(movie.ottReleaseDate).toISOString()
            : new Date().toISOString(),
          "eligibleRegion": { "@type": "Country", name: "IN" },
          "requiresSubscription": { "@type": "MediaSubscription", name: movie.streamingOn },
        },
      },
    } : {}),
  };

  const structuredData = [
    enrichedMovieSchema,
    breadcrumbJsonLd([
      { name: "Home",   url: "https://ollypedia.in/" },
      { name: "Movies", url: "https://ollypedia.in/movies" },
      { name: movie.title, url: canonical },
    ]),
    buildFaqJsonLd(movie, year, avgRating, songs, directorName, producerName),
    ...(avgRating !== null ? [buildAggregateRatingJsonLd(movie, avgRating as number)] : []),
    ...(blogs.length > 0 ? [{
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: `Articles about ${movie.title}`,
      itemListElement: blogs.map((b: any, i: number) => ({
        "@type": "ListItem", position: i + 1, name: b.title,
        url: `https://ollypedia.in/blog/${b.slug}`,
      })),
    }] : []),
    ...(songs.length > 0 ? [{
      "@context": "https://schema.org",
      "@type": "MusicAlbum",
      name: `${movie.title} Original Soundtrack`,
      numTracks: songs.length,
      track: songs.map((s: any, i: number) => ({
        "@type": "MusicRecording",
        name: s.title,
        url: `https://ollypedia.in/songs/${movie.slug}/${i}/${toSlug(s.title) || String(i)}`,
        ...(s.singer && { byArtist: { "@type": "Person", name: s.singer } }),
      })),
    }] : []),
  ];

  return (
    <>
      {structuredData.map((sd, i) => (
        <script key={i} type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(sd) }} />
      ))}

      {/* ══ HERO — banner + info all in one block, mobile-first ══ */}
      <div className="relative w-full bg-[#0a0a0a]">

        {/* Banner image — 16:9 on mobile, fixed height on desktop */}
        <div className="relative w-full h-48 sm:h-64 md:h-80 lg:h-96 overflow-hidden">
          {(movie.bannerUrl || movie.thumbnailUrl || movie.posterUrl) && (
            <Image
              src={movie.bannerUrl || movie.thumbnailUrl || movie.posterUrl}
              alt={`${movie.title}${year ? ` ${year}` : ""} – Odia film banner`}
              fill className="object-cover object-top" priority
            />
          )}
          {/* Bottom fade — merges banner into the info section below */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a]/60 via-transparent to-[#0a0a0a]/20" />
        </div>

        {/* Info section — sits directly below banner, dark bg continues */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Breadcrumb */}
          <div className="pt-3 pb-3 border-b border-[#1a1a1a]">
            <Breadcrumb crumbs={[{ label: "Movies", href: "/movies" }, { label: movie.title }]} />
          </div>

          {/* ── Poster + Title row ── */}
          <div className="flex gap-4 sm:gap-6 pt-5 pb-6 sm:pb-8">

            {/* Poster — fixed sizes per breakpoint, never overflows */}
            <div className="flex-shrink-0 self-start">
              <div className="relative w-24 sm:w-36 md:w-44 lg:w-52 rounded-xl overflow-hidden border-2 border-[#2a2a2a] shadow-2xl shadow-black/80"
                style={{ aspectRatio: "2/3" }}>
                <Image
                  src={movie.posterUrl || movie.thumbnailUrl || "/placeholder-movie.svg"}
                  alt={`${movie.title}${year ? ` (${year})` : ""} Odia movie poster`}
                  fill className="object-cover" priority
                  sizes="(max-width: 640px) 96px, (max-width: 768px) 144px, 208px"
                />
              </div>
            </div>

            {/* Title + meta — takes remaining width */}
            <div className="flex-1 min-w-0">

              {/* Genre + language badges */}
              <div className="flex flex-wrap gap-1.5 mb-2">
                {(movie.genre || []).map((g: string) => (
                  <Link key={g} href={`/movies?genre=${g}`}>
                    <span className="text-[10px] sm:text-xs font-semibold px-2 sm:px-3 py-0.5 sm:py-1 bg-orange-950 border border-orange-900 text-orange-400 rounded-full hover:bg-orange-900 transition-colors">
                      {g}
                    </span>
                  </Link>
                ))}
                {movie.language && (
                  <span className="text-[10px] sm:text-xs font-semibold px-2 sm:px-3 py-0.5 sm:py-1 bg-blue-950 border border-blue-900 text-blue-400 rounded-full">
                    {movie.language}
                  </span>
                )}
                {movie.contentRating && (
                  <span className="text-[10px] sm:text-xs font-semibold px-2 sm:px-3 py-0.5 sm:py-1 bg-zinc-800 border border-zinc-700 text-zinc-400 rounded-full">
                    {movie.contentRating}
                  </span>
                )}
              </div>

              {/* Title — scales smoothly across all screens */}
              <h1 className="font-display font-black text-white leading-tight mb-1
                text-xl sm:text-3xl md:text-4xl lg:text-5xl">
                {movie.title}
              </h1>

              {/* Production House — branded tag right below the title */}
              {movie._productionName && (
                <div className="inline-flex items-center gap-1.5 mt-1 mb-2">
                  <span className="text-[9px] sm:text-[10px] text-gray-500 uppercase tracking-widest font-medium">A</span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-[3px] rounded-[3px] border-l-2 border-orange-500 bg-gradient-to-r from-orange-500/10 to-transparent text-orange-300 text-[10px] sm:text-xs font-semibold tracking-wide">
                    {movie._productionName}
                  </span>
                  <span className="text-[9px] sm:text-[10px] text-gray-500 uppercase tracking-widest font-medium">Presentation</span>
                </div>
              )}

              {year && (
                <p className="text-zinc-500 text-xs sm:text-sm md:text-base mb-3">
                  ({year}) · Odia Film
                </p>
              )}

              {/* Rating */}
              {avgRating !== null && (
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <div className="flex items-center gap-1.5 bg-[#111] border border-[#1f1f1f] rounded-lg px-2 py-1 sm:px-3 sm:py-1.5">
                    <Star className="w-3 h-3 sm:w-4 sm:h-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-bold text-white text-sm sm:text-base">{(avgRating as number).toFixed(1)}</span>
                    <span className="text-zinc-500 text-[10px] sm:text-xs">/10</span>
                  </div>
                  <span className="hidden sm:block"><StarRating rating={avgRating as number} /></span>
                  <span className="text-[10px] sm:text-xs text-zinc-500">{movie.reviews?.length} reviews</span>
                </div>
              )}

              {/* Stat chips — 2 per row on mobile, inline on sm+ */}
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {movie.releaseDate && (
                  <StatChip
                    label="Release"
                    value={new Date(movie.releaseDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  />
                )}
                {movie.runtime && <StatChip label="Runtime" value={movie.runtime} />}
                {/* Director: prefer cast list, fallback to movie.director field */}
                {(() => {
                  const dirFromCast = getDirectorFromCast(movie.cast || []);
                  const dirName = dirFromCast || movie.director;
                  return dirName ? (
                    <div className="flex items-center gap-2 rounded-lg px-3 py-2 border border-orange-500/20 bg-orange-500/8">
                      <div className="min-w-0">
                        <p className="text-[9px] text-orange-400/70 uppercase tracking-widest leading-none mb-0.5">Director</p>
                        <p className="text-xs font-bold text-white truncate">{dirName}</p>
                      </div>
                    </div>
                  ) : null;
                })()}
                {/* Producer: prefer cast list, fallback to movie.producer field */}
                {(() => {
                  const prodFromCast = getProducerFromCast(movie.cast || []);
                  const prodName = prodFromCast || movie.producer;
                  return prodName ? (
                    <div className="flex items-center gap-2 rounded-lg px-3 py-2 border border-[#1f1f1f] bg-[#111]">
                      <div className="min-w-0">
                        <p className="text-[9px] text-gray-600 uppercase tracking-widest leading-none mb-0.5">Producer</p>
                        <p className="text-xs font-bold text-white truncate">{prodName}</p>
                      </div>
                    </div>
                  ) : null;
                })()}
                {movie.verdict && (
                  <div className={`flex items-center gap-2 rounded-lg px-3 py-2 border ${vs.bg} ${vs.border}`}>
                    <div className="min-w-0">
                      <p className="text-[9px] text-gray-600 uppercase tracking-widest leading-none mb-0.5">Verdict</p>
                      <p className={`text-xs font-bold truncate ${vs.text}`}>{movie.verdict}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Synopsis — only on md+ to avoid cramping mobile layout */}
              {movie.synopsis && (
                <p className="hidden md:block text-zinc-400 text-sm leading-relaxed line-clamp-3 max-w-2xl mt-3">
                  {movie.synopsis.length > 220 ? movie.synopsis.slice(0, 220).trimEnd() + "…" : movie.synopsis}
                </p>
              )}

              {/* Release countdown — live client-side timer for Upcoming movies */}
              {movie.verdict === "Upcoming" && movie.releaseDate && !movie.releaseTBA && (
                <ReleaseCountdown releaseDate={movie.releaseDate} title={movie.title} />
              )}

              {/* Share buttons */}
              <ShareButtons
                title={`${movie.title}${year ? ` (${year})` : ""} – Odia Movie`}
                url={canonical}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">

        {/* ══ MAIN CONTENT GRID ══ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-start">

          {/* ── SIDEBAR ── */}
          <aside className="lg:col-span-1 space-y-4 order-2 lg:order-1 self-start lg:sticky lg:top-4">

            {/* Movie Info card */}
            <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-5">
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Info className="w-3.5 h-3.5" /> Movie Info
              </h2>
              <InfoRow icon={Calendar}     label="Release Date"  value={fmtDate(movie.releaseDate) || (movie.releaseTBA ? "TBA" : undefined)} />
              <InfoRow icon={Clock}        label="Runtime"       value={movie.runtime} />
              <InfoRow icon={Globe}        label="Language"      value={movie.language || "Odia"} />
              <InfoRow icon={Clapperboard} label="Director"      value={getDirectorFromCast(movie.cast || []) || movie.director} />
              <InfoRow icon={User}         label="Producer"      value={getProducerFromCast(movie.cast || []) || movie.producer} />
              <InfoRow icon={DollarSign}   label="Budget"        value={movie.budget} />
              <InfoRow icon={Film}         label="Category"      value={movie.category} />
              <InfoRow icon={Star}         label="Content Rating" value={movie.contentRating} />
              {movie._productionName && (
                <InfoRow icon={Film} label="Production House" value={movie._productionName} />
              )}
            </div>

            {/* Box Office card */}
            {(movie.boxOffice?.opening || movie.boxOffice?.total || movie.boxOfficeDays?.length > 0) && (
              <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-5">
                <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <TrendingUp className="w-3.5 h-3.5 text-orange-500" /> Box Office
                </h2>
                <div className="space-y-0">
                  {[
                    ["Opening Day",  movie.boxOffice?.opening],
                    ["First Week",   movie.boxOffice?.firstWeek],
                    ["Total Net",    movie.boxOffice?.total],
                  ].filter(([, v]) => v && v !== "TBA").map(([label, val]) => (
                    <div key={String(label)} className="flex justify-between items-center py-2.5 border-b border-[#1f1f1f] last:border-0">
                      <span className="text-xs text-gray-500">{label}</span>
                      <span className="text-sm font-bold text-green-400">{val}</span>
                    </div>
                  ))}
                </div>

                {/* Day-by-day collection chart */}
                {movie.boxOfficeDays?.length > 0 && (
                  <BoxOfficeDaysChart days={movie.boxOfficeDays} />
                )}

                {movie.verdict && (
                  <div className={`mt-4 text-center py-2 rounded-xl border ${vs.bg} ${vs.border}`}>
                    <span className={`text-sm font-black ${vs.text}`}>{movie.verdict}</span>
                  </div>
                )}
                {movie.slug && (
                  <Link href={`/box-office/${movie.slug}`}
                    className="mt-3 flex items-center justify-center gap-1.5 text-xs text-orange-400 hover:text-orange-300 transition-colors font-semibold">
                    Full box office data <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            )}

            {/* ── OTT / Streaming sidebar card ── */}
            {movie.streamingOn && (
              (() => {
                const LOGO: Record<string,string> = {
                  "Aao NXT":"🎬","Tarang Plus":"📺","Kanccha Lannka":"🎥",
                  "SonyLIV":"🔴","Disney+ Hotstar":"⭐","Netflix":"🎞",
                  "Amazon Prime":"📦","ZEE5":"🟣","MX Player":"▶️","YouTube":"🔴",
                };
                const logo    = LOGO[movie.streamingOn] ?? "🌐";
                const ottDate = movie.ottReleaseDate || "";
                const isTBA   = ottDate === "TBA";
                const isComing  = !isTBA && !!ottDate && new Date(ottDate) > new Date();
                const isAvailable = !isTBA && (!ottDate || new Date(ottDate) <= new Date());

                const status = isTBA
                  ? {
                      label: "Coming Soon",
                      sub:   "OTT date to be announced",
                      dot:   "bg-amber-400",
                      badge: "bg-amber-500/15 border-amber-500/30 text-amber-400",
                      card:  "border-amber-500/20",
                      pulse: false,
                    }
                  : isComing
                  ? {
                      label: `Coming ${ new Date(ottDate).toLocaleDateString("en-IN",{ day:"numeric", month:"short", year:"numeric" }) }`,
                      sub:   `${Math.ceil((new Date(ottDate).getTime()-Date.now())/86400000)} days to go`,
                      dot:   "bg-blue-400",
                      badge: "bg-blue-500/15 border-blue-500/30 text-blue-400",
                      card:  "border-blue-500/20",
                      pulse: false,
                    }
                  : {
                      label: "Available Now",
                      sub:   "Watch online anytime",
                      dot:   "bg-emerald-400",
                      badge: "bg-emerald-500/15 border-emerald-500/30 text-emerald-400",
                      card:  "border-emerald-500/20",
                      pulse: true,
                    };

                return (
                  <div className={`bg-[#111] border ${status.card} rounded-2xl p-5`}>
                    <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <Play className="w-3.5 h-3.5 text-orange-500" /> Streaming
                    </h2>

                    {/* Platform row */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl flex items-center justify-center text-xl flex-shrink-0">
                        {logo}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-white truncate">{movie.streamingOn}</p>
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider">OTT Platform</p>
                      </div>
                    </div>

                    {/* Status badge */}
                    <div className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 border ${status.badge} mb-3`}>
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${status.dot}${status.pulse ? " animate-pulse" : ""}`} />
                      <div className="min-w-0">
                        <p className="text-xs font-black text-white leading-tight">{status.label}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">{status.sub}</p>
                      </div>
                    </div>

                    {/* Watch Now CTA — only when streaming URL is set and movie is live */}
                    {movie.streamingUrl && isAvailable && (
                      <a href={movie.streamingUrl} target="_blank" rel="noopener noreferrer"
                        className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl
                          text-xs font-bold text-emerald-400 hover:text-emerald-300
                          bg-emerald-500/8 hover:bg-emerald-500/15 border border-emerald-500/20
                          transition-all group">
                        <Play className="w-3.5 h-3.5 fill-current" />
                        Watch on {movie.streamingOn}
                        <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                      </a>
                    )}

                    {/* Coming / TBA — no CTA, just a soft nudge */}
                    {(isTBA || isComing) && (
                      <p className="text-center text-[10px] text-gray-600 mt-1 leading-relaxed">
                        {isTBA
                          ? "Follow Ollypedia for the latest OTT updates"
                          : "Set a reminder — drops soon!"}
                      </p>
                    )}
                  </div>
                );
              })()
            )}

            {/* Vote buttons */}
            <VoteButtons movieId={String(movie._id)}
              initialYes={movie.interestedYes || 0} initialNo={movie.interestedNo || 0} />

            {/* People Also Search */}
            <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-5">
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Tag className="w-3.5 h-3.5" /> People Also Search
              </h2>
              <div className="flex flex-col gap-1">
                {[
                  { label: "Latest Odia Movies",    href: "/movies?sort=latest" },
                  { label: "Odia Songs",             href: "/songs" },
                  { label: "Movie Reviews",          href: "/blog/category/movie-review" },
                  ...(year ? [{ label: `Odia Movies ${year}`, href: `/movies/year/${year}` }] : []),
                  ...(movie.genre?.[0] ? [{ label: `${movie.genre[0]} Odia Films`, href: `/movies?genre=${encodeURIComponent(movie.genre[0])}` }] : []),
                  ...(directorName ? [{ label: `${directorName} Films`, href: `/movies?director=${encodeURIComponent(directorName)}` }] : []),
                  // Dynamic: top 2 cast members
                  ...((movie.cast || [])
                    .filter((c: any) => !isCrewRole(c.role) && !isCrewRole(c.type) && c.name && c.castId)
                    .slice(0, 2)
                    .map((c: any) => ({ label: `${c.name} Movies`, href: `/cast/${c.castId}` }))),
                ].map((item) => (
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
                  Reviewed & verified by our Odia cinema experts
                </p>
                {(movie.updatedAt || year) && (
                  <p className="text-[10px] text-gray-600 mt-1">
                    Updated:{" "}
                    {movie.updatedAt
                      ? new Date(movie.updatedAt).toLocaleDateString("en-IN", { month: "long", year: "numeric" })
                      : year}
                  </p>
                )}
              </div>
            </div>
          </aside>

          {/* ── MAIN CONTENT ── */}
          <main className="lg:col-span-2 space-y-10 order-1 lg:order-2">

            {/* ── Trailer ── */}
            {trailer?.ytId && (
              <section aria-label={`${movie.title} official trailer`}>
                <SectionHeading icon={Play} title="Official Trailer" />
                <div className="rounded-2xl overflow-hidden border border-[#1f1f1f]">
                  <YouTubeEmbed ytId={trailer.ytId} title={`${movie.title} Official Trailer`} />
                </div>
              </section>
            )}

            {/* ── Synopsis ── */}
            {movie.synopsis && (
              <section aria-label={`${movie.title} synopsis`}>
                <SectionHeading icon={Info} title="About the Film" />
                <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl overflow-hidden">
                  {/* Quick facts strip */}
                  <div className="flex flex-wrap gap-0 border-b border-[#1f1f1f] divide-x divide-[#1f1f1f]">
                    {[
                      { icon: "🎬", label: "Genre",    value: (movie.genre||[]).join(", ") || "Drama" },
                      { icon: "📅", label: "Year",     value: year ? String(year) : null },
                      { icon: "⏱",  label: "Runtime",  value: movie.runtime || null },
                      { icon: "🌐", label: "Language", value: movie.language || "Odia" },
                    ].filter(f => f.value).map(f => (
                      <div key={f.label} className="flex items-center gap-2 px-4 py-2.5 flex-1 min-w-[120px]">
                        <span className="text-base">{f.icon}</span>
                        <div>
                          <p className="text-[9px] text-gray-600 uppercase tracking-widest">{f.label}</p>
                          <p className="text-xs font-semibold text-white">{f.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Synopsis body */}
                  <div className="p-6">
                    <div className="flex gap-4">
                      <div className="w-1 bg-gradient-to-b from-orange-500 to-orange-500/0 rounded-full flex-shrink-0 self-stretch min-h-[40px]" />
                      <p className="text-gray-200 leading-[1.85] text-[15px] font-light tracking-wide">
                        {movie.synopsis}
                      </p>
                    </div>
                  </div>

                  {/* Mood / Watch tags */}
                  {(movie.genre||[]).length > 0 && (
                    <div className="px-6 pb-5 flex flex-wrap gap-2">
                      <span className="text-[10px] text-gray-600 self-center mr-1">Watch if you like:</span>
                      {(movie.genre as string[]).map((g) => (
                        <Link key={g} href={`/movies?genre=${encodeURIComponent(g)}`}
                          className="text-[10px] font-semibold text-orange-400/80 hover:text-orange-400
                            bg-orange-500/8 border border-orange-500/15 px-2 py-0.5 rounded-full transition-colors">
                          {g}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* ── Story ── */}
            {movie.story && (
              <section aria-label={`${movie.title} full story`}>
                <SectionHeading icon={BookOpen} title="Story" />
                <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-6">
                  <div className="prose-odia" dangerouslySetInnerHTML={{ __html: movie.story }} />
                </div>
              </section>
            )}

            {/* ── Where to Watch ── */}
            {movie.streamingOn && (
              <section aria-label={`Where to watch ${movie.title} online`}>
                <SectionHeading icon={Play} title="Where to Watch" />
                {(() => {
                  const BRAND: Record<string,{bg:string;border:string;text:string;btn:string}> = {
                    "Aao NXT":        {bg:"bg-blue-500/10",    border:"border-blue-500/25",    text:"text-blue-300",    btn:"text-blue-400 bg-blue-500/8 hover:bg-blue-500/15 border-blue-500/20"},
                    "Tarang Plus":    {bg:"bg-orange-500/10",  border:"border-orange-500/25",  text:"text-orange-300",  btn:"text-orange-400 bg-orange-500/8 hover:bg-orange-500/15 border-orange-500/20"},
                    "Kanccha Lannka": {bg:"bg-red-500/10",     border:"border-red-500/25",     text:"text-red-300",     btn:"text-red-400 bg-red-500/8 hover:bg-red-500/15 border-red-500/20"},
                    "SonyLIV":        {bg:"bg-pink-500/10",    border:"border-pink-500/25",    text:"text-pink-300",    btn:"text-pink-400 bg-pink-500/8 hover:bg-pink-500/15 border-pink-500/20"},
                    "Disney+ Hotstar":{bg:"bg-indigo-500/10",  border:"border-indigo-500/25",  text:"text-indigo-300",  btn:"text-indigo-400 bg-indigo-500/8 hover:bg-indigo-500/15 border-indigo-500/20"},
                    "Netflix":        {bg:"bg-red-600/10",     border:"border-red-600/25",     text:"text-red-300",     btn:"text-red-400 bg-red-600/8 hover:bg-red-600/15 border-red-600/20"},
                    "Amazon Prime":   {bg:"bg-cyan-500/10",    border:"border-cyan-500/25",    text:"text-cyan-300",    btn:"text-cyan-400 bg-cyan-500/8 hover:bg-cyan-500/15 border-cyan-500/20"},
                    "ZEE5":           {bg:"bg-purple-500/10",  border:"border-purple-500/25",  text:"text-purple-300",  btn:"text-purple-400 bg-purple-500/8 hover:bg-purple-500/15 border-purple-500/20"},
                    "MX Player":      {bg:"bg-yellow-500/10",  border:"border-yellow-500/25",  text:"text-yellow-300",  btn:"text-yellow-400 bg-yellow-500/8 hover:bg-yellow-500/15 border-yellow-500/20"},
                    "YouTube":        {bg:"bg-red-500/10",     border:"border-red-500/25",     text:"text-red-300",     btn:"text-red-400 bg-red-500/8 hover:bg-red-500/15 border-red-500/20"},
                  };
                  const LOGO: Record<string,string> = {
                    "Aao NXT":"🎬","Tarang Plus":"📺","Kanccha Lannka":"🎥","SonyLIV":"🔴",
                    "Disney+ Hotstar":"⭐","Netflix":"🎞","Amazon Prime":"📦","ZEE5":"🟣","MX Player":"▶️","YouTube":"🔴",
                  };
                  const brand = BRAND[movie.streamingOn] ?? {bg:"bg-emerald-500/10",border:"border-emerald-500/25",text:"text-emerald-300",btn:"text-emerald-400 bg-emerald-500/8 hover:bg-emerald-500/15 border-emerald-500/20"};
                  const logo  = LOGO[movie.streamingOn] ?? "🌐";

                  const ottDate    = movie.ottReleaseDate || "";
                  const isTBA      = ottDate === "TBA";
                  const isComing   = !isTBA && !!ottDate && new Date(ottDate) > new Date();
                  const isAvailable= !isTBA && (!ottDate || new Date(ottDate) <= new Date());
                  const daysLeft   = isComing ? Math.ceil((new Date(ottDate).getTime()-Date.now())/86400000) : 0;

                  return (
                    <div className={`${brand.bg} border ${brand.border} rounded-2xl overflow-hidden`}>
                      {/* Header bar */}
                      <div className="flex items-center gap-4 p-5 pb-4">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 text-3xl border ${brand.border} bg-black/20`}>
                          {logo}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-0.5 font-semibold">Streaming On</p>
                          <p className={`text-xl font-black ${brand.text} leading-tight`}>{movie.streamingOn}</p>
                        </div>
                        {/* Status pill top-right */}
                        {isAvailable && (
                          <span className="hidden sm:flex items-center gap-1.5 text-[10px] font-black px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex-shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> LIVE
                          </span>
                        )}
                        {isTBA && (
                          <span className="hidden sm:flex text-[10px] font-black px-3 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 flex-shrink-0">
                            COMING SOON
                          </span>
                        )}
                        {isComing && (
                          <span className="hidden sm:flex text-[10px] font-black px-3 py-1.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-400 flex-shrink-0">
                            IN {daysLeft}D
                          </span>
                        )}
                      </div>

                      {/* Info strip */}
                      <div className={`px-5 pb-4 border-t ${brand.border} pt-3 flex flex-wrap gap-4`}>
                        <div>
                          <p className="text-[9px] text-gray-600 uppercase tracking-widest mb-0.5">OTT Status</p>
                          <p className="text-xs font-bold text-white">
                            {isAvailable ? "Available Now" : isTBA ? "To Be Announced" : `Coming ${ new Date(ottDate).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"}) }`}
                          </p>
                        </div>
                        {ottDate && ottDate !== "TBA" && (
                          <div>
                            <p className="text-[9px] text-gray-600 uppercase tracking-widest mb-0.5">OTT Release Date</p>
                            <p className="text-xs font-bold text-white">{new Date(ottDate).toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"})}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-[9px] text-gray-600 uppercase tracking-widest mb-0.5">Platform</p>
                          <p className={`text-xs font-bold ${brand.text}`}>{movie.streamingOn}</p>
                        </div>
                      </div>

                      {/* CTA or countdown */}
                      <div className="px-5 pb-5">
                        {movie.streamingUrl && isAvailable ? (
                          <a href={movie.streamingUrl} target="_blank" rel="noopener noreferrer"
                            className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl
                              border text-sm font-black transition-all group ${brand.btn}`}>
                            <Play className="w-4 h-4 fill-current" />
                            Watch on {movie.streamingOn}
                            <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                          </a>
                        ) : (isTBA || isComing) ? (
                          <div className="text-center py-2 text-xs text-gray-600">
                            {isTBA
                              ? "📢 OTT release date not yet announced. Follow Ollypedia for updates."
                              : `⏳ Streaming begins in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}. Check back on Ollypedia.`}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })()}
              </section>
            )}

            {/* ── Crew ── */}
            {(() => {
              const { crew, cast: castOnly } = splitCastCrew(movie.cast || []);
              return (
                <>
                  {crew.length > 0 && (
                    <section aria-label={`${movie.title} crew`}>
                      <SectionHeading icon={Clapperboard} title="Crew" count={crew.length} />
                      <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl overflow-hidden">
                        <table className="w-full text-sm">
                          <tbody>
                            {crew.map((member: any, i: number) => (
                              <tr key={i} className={`group border-b border-[#1a1a1a] last:border-0
                                hover:bg-orange-500/3 transition-colors`}>
                                {/* Role */}
                                <td className="px-4 py-2.5 w-[38%] align-middle">
                                  <span className="text-[10px] font-bold text-orange-400/70 uppercase tracking-widest">
                                    {member.role || member.type || "Crew"}
                                  </span>
                                </td>
                                {/* Photo + Name */}
                                <td className="px-4 py-2.5 align-middle">
                                  <Link href={member.castId ? `/cast/${member.castId}` : "#"}
                                    className="flex items-center gap-2.5 group/link"
                                    aria-disabled={!member.castId}>
                                    <div className="relative w-7 h-7 rounded-full overflow-hidden flex-shrink-0 border border-[#333]">
                                      <Image
                                        src={member.photo || "/placeholder-person.svg"}
                                        alt={member.name}
                                        fill className="object-cover"
                                      />
                                    </div>
                                    <span className="text-sm font-semibold text-white group-hover/link:text-orange-400 transition-colors line-clamp-1">
                                      {member.name}
                                    </span>
                                  </Link>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </section>
                  )}

                  {/* ── Cast ── */}
                  {castOnly.length > 0 && (
                    <section aria-label={`${movie.title} cast`}>
                      <SectionHeading icon={Users} title="Cast" count={castOnly.length} />
                      <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl overflow-hidden">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-[#242424] bg-[#0d0d0d]">
                              <th className="px-4 py-2.5 text-left text-[10px] font-bold text-orange-400/60 uppercase tracking-widest w-[35%]">Actor</th>
                              <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-600 uppercase tracking-widest w-[30%]">Role / Type</th>
                              <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-600 uppercase tracking-widest">Character</th>
                            </tr>
                          </thead>
                          <tbody>
                            {castOnly.map((member: any, i: number) => (
                              <tr key={i} className="group border-b border-[#1a1a1a] last:border-0 hover:bg-orange-500/3 transition-colors">
                                {/* Photo + Name */}
                                <td className="px-4 py-2.5 align-middle">
                                  <Link href={member.castId ? `/cast/${member.castId}` : "#"}
                                    className="flex items-center gap-2.5 group/link"
                                    aria-disabled={!member.castId}>
                                    <div className="relative w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border border-[#333]">
                                      <Image
                                        src={member.photo || "/placeholder-person.svg"}
                                        alt={`${member.name} in ${movie.title}`}
                                        fill className="object-cover"
                                      />
                                    </div>
                                    <span className="text-sm font-semibold text-white group-hover/link:text-orange-400 transition-colors line-clamp-1">
                                      {member.name}
                                    </span>
                                  </Link>
                                </td>
                                {/* Role / Type */}
                                <td className="px-4 py-2.5 align-middle">
                                  <span className="text-[10px] font-bold text-orange-400/70 uppercase tracking-widest">
                                    {member.role || member.type || "Actor"}
                                  </span>
                                </td>
                                {/* Character name */}
                                <td className="px-4 py-2.5 align-middle">
                                  <span className="text-xs text-gray-400 italic">
                                    {member.character || member.characterName || "—"}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </section>
                  )}
                </>
              );
            })()}

            {/* ── Songs ── */}
            {songs.length > 0 && (
              <section aria-label={`${movie.title} songs soundtrack`}>
                <SectionHeading icon={Music} title="Songs" count={songs.length} />
                <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl overflow-hidden">
                  {songs.map((song: any, i: number) => (
                    <div key={i} className={i < songs.length - 1 ? "border-b border-[#1a1a1a]" : ""}>
                      <SongRowClient song={song} index={i + 1} />
                    </div>
                  ))}
                </div>
                {/* SEO: song anchor links for Google — visually hidden, only for crawlers */}
                <div className="sr-only" aria-hidden="true">
                  {songs.map((s: any, i: number) => (
                    <Link key={i}
                      href={`/songs/${movie.slug}/${i}/${toSlug(s.title) || String(i)}`}
                      tabIndex={-1}>
                      {s.title}{s.singer ? ` by ${s.singer}` : ""}
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* ── Ollypedia Review ── */}
            {movie.review && (
              <section aria-label={`Ollypedia review of ${movie.title}`}>
                <SectionHeading icon={Award} title="Ollypedia Review" />
                <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-6">
                  <div className="prose-odia" dangerouslySetInnerHTML={{ __html: movie.review }} />
                </div>
              </section>
            )}

            {/* ── User Reviews ── */}
            <section aria-label={`User reviews for ${movie.title}`}>
              <SectionHeading icon={MessageSquare} title="User Reviews" count={movie.reviews?.length} />
              {/* ReviewForm now owns the list + form together.
                  initialReviews seeds the list; new submissions appear instantly. */}
              <ReviewForm
                movieId={String(movie._id)}
                movieTitle={movie.title}
                moviePoster={movie.posterUrl}
                initialReviews={movie.reviews ?? []}
              />
            </section>

            {/* ══ SEO CONTENT BLOCK ══ */}
            <section aria-label={`About ${movie.title} Odia film`} className="space-y-5">

              {/* About this film — editorial SEO prose */}
              <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-6">
                <SectionHeading title={`About ${movie.title}${year ? ` (${year})` : ""}`} />
                <div className="space-y-3 text-gray-400 text-sm leading-relaxed">
                  <p>
                    <strong className="text-white">{movie.title}</strong> is{" "}
                    {(movie.genre || []).length > 0
                      ? `a ${(movie.genre as string[]).join(", ")} Odia film`
                      : "an Odia film"}
                    {year ? ` released in ${year}` : ""}{directorName ? `, directed by ${directorName}` : ""}
                    {producerName ? ` and produced by ${producerName}` : ""}.
                    {movie.language ? ` The film is in the ${movie.language} language` : " The film is in the Odia language"},
                    making it a part of the <strong className="text-white">Ollywood film industry</strong> — the Odia language cinema based in Bhubaneswar, Odisha.
                  </p>
                  {movie.synopsis && (
                    <p>
                      {movie.synopsis.length > 350 ? movie.synopsis.slice(0, 350).trimEnd() + "…" : movie.synopsis}
                    </p>
                  )}
                  {movie.verdict && (
                    <p>
                      At the box office, <strong className="text-white">{movie.title}</strong> was declared a{" "}
                      <strong className="text-white">{movie.verdict}</strong>
                      {movie.boxOffice?.total ? `, grossing a total collection of ${movie.boxOffice.total}` : ""}.
                      {avgRating !== null
                        ? ` On Ollypedia, the film holds a user rating of ${(avgRating as number).toFixed(1)}/10 based on ${movie.reviews?.length} audience reviews.`
                        : ""}
                    </p>
                  )}
                  {songs.length > 0 && (
                    <p>
                      The <strong className="text-white">{movie.title} soundtrack</strong> features{" "}
                      <strong className="text-white">{songs.length} songs</strong>
                      {songs[0]?.singer ? `, including tracks by ${[...new Set(songs.slice(0,3).map((s:any)=>s.singer).filter(Boolean))].join(", ")}` : ""}.
                      All songs are available to explore on Ollypedia with YouTube videos and full credits.
                    </p>
                  )}
                  {movie.cast?.length > 0 && (
                    <p>
                      The film stars{" "}
                      <strong className="text-white">
                        {movie.cast.slice(0, 4).map((c: any) => c.name).join(", ")}
                      </strong>
                      {movie.cast.length > 4 ? ` and ${movie.cast.length - 4} others` : ""}.
                    </p>
                  )}
                  {/* OTT paragraph — rich prose for search rankings */}
                  {movie.streamingOn && (
                    <p>
                      {(() => {
                        const od = movie.ottReleaseDate || "";
                        const tba = od === "TBA";
                        const live = !tba && (!od || new Date(od) <= new Date());
                        const coming = !tba && !!od && new Date(od) > new Date();
                        const fmtD = od && od !== "TBA" ? new Date(od).toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"}) : "";
                        if (live) return <><strong className="text-white">{movie.title}</strong> is now available to <strong className="text-white">watch online on {movie.streamingOn}</strong>. Fans can stream the full movie on {movie.streamingOn}{movie.streamingUrl ? <> — <a href={movie.streamingUrl} target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:underline">watch it here</a></> : ""}. This is one of the most searched Odia movies on OTT platforms in {year || "recent years"}.</>;
                        if (coming) return <><strong className="text-white">{movie.title}</strong> is set to release on <strong className="text-white">{movie.streamingOn}</strong> on <strong className="text-white">{fmtD}</strong>. Fans searching for the OTT release date of {movie.title} can bookmark Ollypedia for the latest updates on its digital streaming availability.</>;
                        if (tba) return <><strong className="text-white">{movie.title}</strong> is confirmed for <strong className="text-white">OTT release on {movie.streamingOn}</strong>. The exact digital release date has not been announced yet. Ollypedia will update this page as soon as the OTT release date for {movie.title} is confirmed.</>;
                        return null;
                      })()}
                    </p>
                  )}
                </div>

                {/* Topic tag links */}
                <div className="flex flex-wrap gap-2 mt-5 pt-5 border-t border-[#1f1f1f]">
                  {year && (
                    <Link href={`/movies/year/${year}`}
                      className="text-xs text-orange-400/80 hover:text-orange-400 bg-orange-500/8 border border-orange-500/15 px-2.5 py-1 rounded-full transition-colors">
                      📅 Odia Movies {year}
                    </Link>
                  )}
                  {(movie.genre || []).map((g: string) => (
                    <Link key={g} href={`/movies?genre=${encodeURIComponent(g)}`}
                      className="text-xs text-orange-400/80 hover:text-orange-400 bg-orange-500/8 border border-orange-500/15 px-2.5 py-1 rounded-full transition-colors">
                      🎭 {g} Films
                    </Link>
                  ))}
                  <Link href="/movies"
                    className="text-xs text-orange-400/80 hover:text-orange-400 bg-orange-500/8 border border-orange-500/15 px-2.5 py-1 rounded-full transition-colors">
                    🎬 All Odia Movies
                  </Link>
                  <Link href="/songs"
                    className="text-xs text-orange-400/80 hover:text-orange-400 bg-orange-500/8 border border-orange-500/15 px-2.5 py-1 rounded-full transition-colors">
                    🎵 Odia Songs
                  </Link>
                  <Link href="/box-office"
                    className="text-xs text-orange-400/80 hover:text-orange-400 bg-orange-500/8 border border-orange-500/15 px-2.5 py-1 rounded-full transition-colors">
                    📊 Box Office
                  </Link>
                  {movie.streamingOn && (
                    <Link href="/movies?filter=ott"
                      className="text-xs text-emerald-400/80 hover:text-emerald-400 bg-emerald-500/8 border border-emerald-500/15 px-2.5 py-1 rounded-full transition-colors">
                      📺 Odia Movies on OTT
                    </Link>
                  )}
                  {movie.streamingOn && movie.streamingUrl && (
                    <a href={movie.streamingUrl} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-blue-400/80 hover:text-blue-400 bg-blue-500/8 border border-blue-500/15 px-2.5 py-1 rounded-full transition-colors">
                      ▶ Watch on {movie.streamingOn}
                    </a>
                  )}
                </div>
              </div>

              {/* Did You Know / Trivia */}
              {movie.trivia && (
                <div className="bg-[#111] border border-orange-500/20 rounded-2xl p-6">
                  <SectionHeading title="Did You Know?" />
                  <div className="flex gap-3">
                    <span className="text-2xl flex-shrink-0">💡</span>
                    <p className="text-sm text-gray-300 leading-relaxed">{movie.trivia}</p>
                  </div>
                </div>
              )}

              {/* FAQ accordion */}
              <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-6">
                <SectionHeading title={`FAQs about ${movie.title}`} />
                <div className="space-y-2">
                  {[
                    {
                      q: `What is ${movie.title} movie about?`,
                      a: movie.synopsis?.slice(0, 250) ||
                        `${movie.title} is an Odia ${(movie.genre || []).join(", ") || "drama"} film${year ? ` released in ${year}` : ""}${movie.director ? `, directed by ${movie.director}` : ""}.`,
                    },
                    ...(movie.cast?.length ? [{
                      q: `Who are the main cast of ${movie.title}?`,
                      a: `${movie.title} features ${movie.cast.slice(0, 5).map((c: any) => c.name).join(", ")} in the lead and supporting roles.`,
                    }] : []),
                    ...(movie.verdict ? [{
                      q: `What is the box office verdict of ${movie.title}?`,
                      a: `${movie.title} was declared a ${movie.verdict} at the Ollywood box office${movie.boxOffice?.total ? `, collecting a total of ${movie.boxOffice.total}` : ""}.`,
                    }] : []),
                    ...(songs.length > 0 ? [{
                      q: `How many songs does ${movie.title} have?`,
                      a: `${movie.title} has ${songs.length} song${songs.length > 1 ? "s" : ""} in its soundtrack${songs[0]?.singer ? `, sung by ${[...new Set(songs.slice(0,3).map((s:any)=>s.singer).filter(Boolean))].join(", ")}` : ""}.`,
                    }] : []),
                    ...(directorName ? [{
                      q: `Who directed ${movie.title}?`,
                      a: `${movie.title} was directed by ${directorName}${producerName ? `, produced by ${producerName}` : ""}${year ? ` and released in ${year}` : ""}.`,
                    }] : []),
                    {
                      q: `What is the release date of ${movie.title}?`,
                      a: movie.releaseDate
                        ? `${movie.title} was released on ${new Date(movie.releaseDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}.`
                        : movie.releaseTBA
                        ? `The release date of ${movie.title} is yet to be announced (TBA). Follow Ollypedia for the latest updates.`
                        : `Release date information for ${movie.title} is available on Ollypedia.`,
                    },
                    // ── OTT FAQs block ──────────────────────────────────────
                    {
                      q: `Is ${movie.title} available on OTT?`,
                      a: movie.streamingOn
                        ? (() => {
                            const od = movie.ottReleaseDate || "";
                            const tba = od === "TBA";
                            const live = !tba && (!od || new Date(od) <= new Date());
                            const coming = !tba && !!od && new Date(od) > new Date();
                            const fmtD = od && od !== "TBA" ? new Date(od).toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"}) : "";
                            if (live) return `Yes, ${movie.title} is available on OTT. You can watch ${movie.title} online on ${movie.streamingOn}${movie.streamingUrl ? ` at ${movie.streamingUrl}` : ""}. The film is currently streaming and available to watch anytime.`;
                            if (coming) return `Yes, ${movie.title} will be available on ${movie.streamingOn} from ${fmtD}. Mark your calendar for the OTT release of ${movie.title} on ${movie.streamingOn}.`;
                            if (tba) return `${movie.title} has been confirmed for OTT release on ${movie.streamingOn}. The exact OTT release date of ${movie.title} is yet to be announced. Follow Ollypedia for updates on ${movie.title} OTT release date.`;
                            return `${movie.title} is available on ${movie.streamingOn}. Check the platform directly for availability.`;
                          })()
                        : `OTT release details for ${movie.title} have not been officially announced yet. It may release on Aao NXT (aaonxt.com), Tarang Plus (tarangplus.in), or Kanccha Lannka (kancchalannka.com). Follow Ollypedia for the latest ${movie.title} OTT release date updates.`,
                    },
                    {
                      q: `When is ${movie.title} OTT release date?`,
                      a: movie.streamingOn
                        ? (() => {
                            const od = movie.ottReleaseDate || "";
                            const tba = od === "TBA";
                            const live = !tba && (!od || new Date(od) <= new Date());
                            const coming = !tba && !!od && new Date(od) > new Date();
                            const fmtD = od && od !== "TBA" ? new Date(od).toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"}) : "";
                            if (live) return `${movie.title} has already released on OTT. It is currently streaming on ${movie.streamingOn}${od && od !== "TBA" ? `, which went live on ${fmtD}` : ""}. You can watch it now online.`;
                            if (coming) return `The OTT release date of ${movie.title} is ${fmtD}. It will be available to stream on ${movie.streamingOn} from ${fmtD}.`;
                            if (tba) return `The OTT release date of ${movie.title} on ${movie.streamingOn} is yet to be officially announced (TBA). Ollypedia will update this page as soon as the ${movie.title} OTT date is confirmed.`;
                            return `${movie.title} is available on ${movie.streamingOn}. The exact OTT date information is on Ollypedia.`;
                          })()
                        : `The OTT release date of ${movie.title} has not been announced yet. The film may stream on platforms like Aao NXT, Tarang Plus, or Kanccha Lannka. Follow Ollypedia for ${movie.title} OTT release date news.`,
                    },
                    {
                      q: `On which platform can I watch ${movie.title} online?`,
                      a: movie.streamingOn
                        ? `You can watch ${movie.title} online on ${movie.streamingOn}${movie.streamingUrl ? ` (${movie.streamingUrl})` : ""}. ${movie.streamingOn} is the official OTT platform for ${movie.title} in India.`
                        : `The official OTT platform for ${movie.title} has not been announced yet. Odia movies typically stream on platforms like Aao NXT, Tarang Plus, Kanccha Lannka, SonyLIV, or ZEE5. Check back on Ollypedia for updates.`,
                    },
                    {
                      q: `Can I watch ${movie.title} for free online?`,
                      a: movie.streamingOn
                        ? `${movie.title} is available on ${movie.streamingOn}. Please check ${movie.streamingOn}'s subscription plans — some platforms offer a free trial or ad-supported viewing. Visit ${movie.streamingUrl || `the ${movie.streamingOn} platform`} to check current availability and pricing.`
                        : `${movie.title} has not been officially released on any free OTT platform. Watching from unofficial or pirated sources is illegal. Support Odia cinema by watching from official platforms.`,
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

              {/* Related blog posts */}
              {blogs.length > 0 && (
                <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-6">
                  <SectionHeading icon={FileText} title={`Articles about ${movie.title}`} count={blogs.length} />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {blogs.map((b: any) => (
                      <Link key={b._id} href={`/blog/${b.slug}`}
                        className="group flex gap-3 bg-[#0d0d0d] border border-[#1a1a1a] hover:border-orange-500/30 rounded-xl p-3 transition-all">
                        {b.coverImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={b.coverImage} alt={b.title}
                            className="w-16 h-11 object-cover rounded-lg flex-shrink-0 border border-[#222]" />
                        ) : (
                          <div className="w-16 h-11 flex-shrink-0 bg-[#1a1a1a] rounded-lg border border-[#222] flex items-center justify-center">
                            <FileText className="w-4 h-4 text-gray-600" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-300 group-hover:text-orange-400 transition-colors line-clamp-2 leading-snug">
                            {b.title}
                          </p>
                          {b.category && (
                            <p className="text-[10px] text-gray-600 mt-1">{b.category}</p>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

            </section>
          </main>
        </div>

        {/* ══ RELATED MOVIES ══ */}
        {(related as any[]).length > 0 && (
          <section className="mt-8 sm:mt-14 pt-8 sm:pt-10 border-t border-[#1f1f1f]" aria-label="Similar Odia movies">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="w-1 h-6 bg-orange-500 rounded-full" />
                <h2 className="font-display font-bold text-2xl text-white">
                  More {(movie.genre?.[0] || "Odia")} Movies
                </h2>
              </div>
              <Link href={movie.genre?.[0] ? `/movies?genre=${movie.genre[0]}` : "/movies"}
                className="text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1 transition-colors font-semibold">
                View all <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
              {(related as any[]).map((m) => (
                <MovieCard key={String(m._id)} movie={m} />
              ))}
            </div>
          </section>
        )}

      </div>
    </>
  );
}