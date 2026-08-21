import { SITE_URL } from "@/lib/seo";
import { formatReleaseDate } from "@/lib/dateUtils";

import type { Metadata } from "next";
import { notFound, redirect, permanentRedirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { connectDB } from "@/lib/db";
import Movie from "@/models/Movie";
import Blog from "@/models/Blog";
import Cast from "@/models/Cast";
import Production from "@/models/Production";
import { breadcrumbJsonLd } from "@/lib/seo";
import { buildMovieMeta } from "@/lib/movieSeo";
import { YouTubeEmbed }  from "@/components/ui/YouTubeEmbed";
import { Breadcrumb }    from "@/components/ui/Breadcrumb";
import { getPrimaryVideo } from "@/lib/trailerSeo";
import { VoteButtons }   from "@/components/ui/VoteButtons";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { ReviewForm }    from "@/components/movie/ReviewForm";
import { MovieCard }         from "@/components/movie/MovieCard";
import { ReleaseCountdown }  from "@/components/movie/ReleaseCountdown";
import { ShareButtons }      from "@/components/movie/ShareButtons";
import { StarRating }    from "@/components/ui/StarRating";
import { BlogCard } from "@/components/blog/BlogCard";
import { SongCard } from "@/components/songs/SongCard";
import { BoxOfficeDaysChart } from "@/components/movie/BoxOfficeDaysChart";
import {
  Calendar, Clock, User, DollarSign, Film, Star,
  Clapperboard, Music, FileText, ChevronRight,
  TrendingUp, Award, Globe, Users, BookOpen,
  Play, Info, Tag, MessageSquare,
} from "lucide-react";
import { DisplayAd } from "@/components/ads/DisplayAd";

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

function fmtDate(iso?: string, precision?: string): string {
  if (!iso) return "";
  return formatReleaseDate(iso, precision, "long");
}

const OTT_LOGOS: Record<string, string> = {
  "Aao NXT":         "https://images.wakelet.com/resize?id=595b960a-0fcb-4fb8-a61f-dc7f9a94da2c&h=3840&w=3840&q=85",
  "Tarang Plus":     "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS_iUWV_PnE0BrkBKN0YcWGgUBBP1Q_vz13Cg&s",
  "YouTube":         "https://upload.wikimedia.org/wikipedia/commons/0/09/YouTube_full-color_icon_%282017%29.svg",
  "SonyLIV":         "https://upload.wikimedia.org/wikipedia/commons/3/3f/SonyLIV_logo.png",
  "Netflix":         "https://upload.wikimedia.org/wikipedia/commons/0/08/Netflix_2015_logo.svg",
  "Amazon Prime":    "https://upload.wikimedia.org/wikipedia/commons/1/11/Amazon_Prime_Video_logo.svg",
  "Disney+ Hotstar": "https://upload.wikimedia.org/wikipedia/commons/1/1e/Disney%2B_Hotstar_logo.svg",
  "ZEE5":            "https://upload.wikimedia.org/wikipedia/commons/9/9c/ZEE5_Logo.svg",
  "MX Player":       "https://upload.wikimedia.org/wikipedia/commons/5/52/MX_Player_Logo.svg",
  "Kanccha Lannka":  "https://www.kancchalannka.com/favicon.ico",
};
function getOttLogo(platform: string): string | null {
  if (!platform) return null;
  return OTT_LOGOS[platform.trim()] || OTT_LOGOS[platform.toLowerCase().trim()] || null;
}
function OttLogoImg({ platform, size = "md" }: { platform: string; size?: "sm" | "md" | "lg" }) {
  const logo = getOttLogo(platform);
  const cls = size === "sm" ? "w-4 h-4" : size === "lg" ? "w-10 h-10" : "w-6 h-6";
  if (!logo) return <span className="text-lg">🌐</span>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={logo} alt={platform} className={`${cls} rounded object-contain flex-shrink-0`} />;
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
  
  const actingKeywords = ["actor", "actress", "lead", "hero", "heroine", "supporting", "cameo", "special appearance", "villain", "comedian", "child artist", "dancer", "item"];
  const expandedCrewRoles = [...CREW_ROLES.map(r => r.toLowerCase()), "singer", "playback singer", "lyricist", "action", "makeup", "production", "assistant director", "co-producer", "executive producer"];

  for (const m of (castList || [])) {
    const typeStr = (m.type || "").toLowerCase().trim();
    const roleStr = (m.role || "").toLowerCase().trim();
    
    // Check if they have an explicit acting keyword in type or role.
    // Also, if type is completely empty, it defaults to actor in our schema.
    const hasActingKeyword = actingKeywords.some(kw => typeStr.includes(kw) || roleStr.includes(kw));
    const isActor = typeStr === "" || typeStr === "actor" || typeStr === "actress" || hasActingKeyword;
    
    // Check if they have an explicit crew keyword in type or role.
    const isCrew = expandedCrewRoles.some(cr => typeStr.includes(cr) || roleStr.includes(cr));

    if (isActor) {
      cast.push(m);
    }
    
    // If they are explicitly a crew member, or if they are NOT an actor (e.g. unknown crew role like 'Spot Boy')
    if (isCrew || !isActor) {
      crew.push(m);
    }
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
  const found = (castList || []).find((m: any) => {
    const roleStr = m.role?.trim() || m.type?.trim();
    return isPureDirector(roleStr);
  });
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
  const found = (castList || []).find((m: any) => {
    const roleStr = m.role?.trim() || m.type?.trim();
    return isPureProducer(roleStr);
  });
  return found?.name;
}



// ─── Data helpers ─────────────────────────────────────────────────────────
async function getMovie(slug: string) {
  try {
    await connectDB();
    const isOid = /^[a-f0-9]{24}$/i.test(slug);
    let raw = isOid
      ? await Movie.findById(slug)
          .populate("productionId", "name logo")
          .populate("collaborators", "name logo")
          .populate("cast.castId", "name photo type roles bio")
          .lean()
      : await Movie.findOne({ slug })
          .populate("productionId", "name logo")
          .populate("collaborators", "name logo")
          .populate("cast.castId", "name photo type roles bio")
          .lean();
          
    // Smart 301 Fallback Search if not found
    if (!raw && !isOid) {
      // Try to find a movie where the title or slug loosely matches the broken slug
      // e.g. "daman-2022" -> searches for "daman.*2022"
      const fuzzyRegex = new RegExp(slug.split('-').join('.*'), 'i');
      const fallback = await Movie.findOne({
        $or: [
          { slug: fuzzyRegex },
          { title: fuzzyRegex }
        ]
      }).select("slug").lean() as any;
      
      if (fallback && fallback.slug) {
        return { isRedirect: true, redirectSlug: fallback.slug };
      }
      return null;
    }

    if (!raw) return null;
    
    const serialized = JSON.parse(JSON.stringify(raw));
    if (Array.isArray(serialized.cast)) {
      serialized.cast = serialized.cast.map((item: any) => {
        if (item.castId && typeof item.castId === "object") {
          return {
            ...item,
            name: item.castId.name || item.name,
            photo: item.castId.photo || item.photo,
            castId: item.castId._id || item.castId,
          };
        }
        return item;
      });
    }
    if (serialized.productionId && typeof serialized.productionId === "object") {
      serialized._productionName = serialized.productionId.name || null;
      serialized._productionLogo = serialized.productionId.logo || null;
    } else {
      serialized._productionName = null;
      serialized._productionLogo = null;
    }
    const collaboratorNames: string[] = (serialized.collaborators || [])
      .filter((c: any) => c && typeof c === "object" && c.name)
      .map((c: any) => c.name);
    serialized._allProductionNames = Array.from(
      new Set([...(serialized._productionName ? [serialized._productionName] : []), ...collaboratorNames])
    );
    return serialized;
  } catch (err) {
    console.error("getMovie Error:", err);
    return null;
  }
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

// ─── Misspelling generator REMOVED ──────────────────────────────────────────
// getMisspellings was removed — Google handles misspelling matching automatically.
// Intentional misspellings in <meta keywords> trigger spam/keyword-stuffing penalties.

// ─── Metadata — delegates to movieSeo.ts ─────────────────────────────────────
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const movie = await getMovie(params.slug);
  
  if (!movie) notFound();
  
  if (movie.isRedirect && movie.redirectSlug) {
    // Next.js will throw an error here, catching it early and sending an HTTP 308 Permanent Redirect header
    // rather than rendering a 200 OK + meta refresh tag.
    permanentRedirect(`/movie/${movie.redirectSlug}`); // Sends HTTP 308
  }

  if (!movie.title?.trim()) notFound();

  // Delegate to the dedicated movieSeo module
  return buildMovieMeta(movie);
}

// ─── JSON-LD helpers ──────────────────────────────────────────────────────
function buildFaqJsonLd(movie: any, year: string | number, avgRating: number | null, songs: any[], directorName?: string, producerName?: string) {
  const items = [
    {
      question: `What is ${movie.title} movie about?`,
      answer: movie.synopsis?.slice(0, 300) ||
        `${movie.title} is an Odia ${movie.genre?.join(", ") || "drama"} film${year ? ` released in ${year}` : ""}${directorName ? `, directed by ${directorName}` : ""}.`,
    },
    ...(() => {
      const { cast: castOnly } = splitCastCrew(movie.cast || []);
      const actorNames = Array.from(new Set(castOnly.map((c: any) => c.name).filter(Boolean)));
      if (!actorNames.length) return [];
      return [{
        question: `Who is in the cast of ${movie.title}?`,
        answer: `${movie.title} features ${actorNames.slice(0, 5).join(", ")}.`,
      }];
    })(),
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
    url: `${SITE_URL}/movie/${movie.slug || movie._id}`,
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

function StatChip({
  label,
  value,
  variant = "default",
  customClass = "",
}: {
  label: string;
  value: string;
  variant?: "default" | "orange" | "indigo" | "green" | "blue";
  customClass?: string;
}) {
  const styles = {
    default: "bg-[#121212] border-[#222] text-white",
    orange:  "bg-gradient-to-r from-orange-500/10 via-orange-500/5 to-transparent border-l-2 border-l-orange-500 border-y border-r border-orange-500/20 text-white",
    indigo:  "bg-gradient-to-r from-indigo-500/10 via-indigo-500/5 to-transparent border-l-2 border-l-indigo-500 border-y border-r border-indigo-500/20 text-white",
    green:   "bg-gradient-to-r from-green-500/10 via-emerald-500/5 to-transparent border-l-2 border-l-green-500 border-y border-r border-green-500/20 text-green-400",
    blue:    "bg-gradient-to-r from-blue-500/10 via-sky-500/5 to-transparent border-l-2 border-l-blue-500 border-y border-r border-blue-500/20 text-blue-400",
  }[variant];

  const labelColors = {
    default: "text-gray-500",
    orange:  "text-orange-400/80",
    indigo:  "text-indigo-400/80",
    green:   "text-green-400/80",
    blue:    "text-blue-400/80",
  }[variant];

  return (
    <div className={`flex items-center gap-2 rounded-xl px-3 py-2 border min-w-0 ${styles} ${customClass}`}>
      <div className="min-w-0 w-full">
        <p className={`text-[9px] uppercase tracking-widest leading-none mb-0.5 font-semibold ${labelColors}`}>{label}</p>
        <p className="text-xs font-bold truncate leading-snug">{value}</p>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────
export default async function MovieDetailPage({ params }: { params: { slug: string } }) {
  const movie = await getMovie(params.slug);
  if (!movie) notFound();
  
  if (movie.isRedirect && movie.redirectSlug) {
    redirect(`/movie/${movie.redirectSlug}`);
  }

  if (!movie.title?.trim()) notFound();

  const [related, blogs] = await Promise.all([getRelated(movie), getMovieBlogs(movie.title)]);

  const avgRating  = movie.reviews?.length
    ? movie.reviews.reduce((s: number, r: any) => s + (r.rating || 0), 0) / movie.reviews.length
    : null;
  // Upcoming/TBA movies haven't released, so there's nothing to review or rate
  // yet — covers both a known future date and a date that's still TBA, since
  // both use verdict === "Upcoming" (see VERDICT_STYLE / ReleaseCountdown above).
  const isUnreleased = movie.verdict === "Upcoming";
  const year      = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : "";
  const songs     = movie.media?.songs || [];
  const trailer   = getPrimaryVideo(movie as any);
  const canonical = `${SITE_URL}/movie/${movie.slug || movie._id}`;
  const vs        = verdictStyle(movie.verdict);

  // Prefer cast-list names, fall back to movie fields
  const directorName = getDirectorFromCast(movie.cast || []) || movie.director;
  const producerName = getProducerFromCast(movie.cast || []) || movie.producer;

  // Top cast names for SEO prose
  const topActors = (movie.cast || [])
    .filter((m: any) => !isCrewRole(m.role) && !isCrewRole(m.type) && m.name)
    .slice(0, 4)
    .map((m: any) => m.name);

  // ★ SEO: Auto-generate rich synopsis if missing or very short (e.g. "In Cinemas Soon")
  // Ensures all new/upcoming movies have 100+ words of unique context for Google indexing
  const genresStr = (movie.genre || []).join(", ");
  const rawSynopsis = (movie.synopsis || "").trim();
  const needsRichProse = rawSynopsis.length < 50;

  const generatedProse = [
    rawSynopsis ? `${rawSynopsis}.` : null,
    `${movie.title} is an Odia${genresStr ? ` ${genresStr}` : ""} film${year ? ` released in ${year}` : ""}${directorName ? ` directed by ${directorName}` : ""}${producerName ? ` and produced by ${producerName}` : ""}.`,
    topActors.length > 0 ? `The movie features ${topActors.join(", ")} in key roles.` : null,
    movie.verdict ? `Verdict: ${movie.verdict}.` : null,
    `Get complete details on ${movie.title} including cast & crew, songs, release updates, box office information, and audience reviews on Ollypedia.`,
  ].filter(Boolean).join(" ");

  const effectiveSynopsis = needsRichProse ? generatedProse : rawSynopsis;

  // ── Enriched Movie JSON-LD ──────────────────────────────────────────────────
  const { crew: crewForSchema } = splitCastCrew(movie.cast || []);
  const actorObjects = (movie.cast || [])
    .filter((m: any) => !isCrewRole(m.role) && !isCrewRole(m.type))
    .slice(0, 10)
    .map((m: any) => ({
      "@type": "Person",
      name: m.name,
      ...(m.castId ? { url: `${SITE_URL}/cast/${m.castId}` } : {}),
    }));
  const dirCrewEntry = crewForSchema.find((c: any) => c.role?.toLowerCase().includes("director"));
  const directorPersonObj = directorName
    ? [{ "@type": "Person", name: directorName, ...(dirCrewEntry?.castId ? { url: `${SITE_URL}/cast/${dirCrewEntry.castId}` } : {}) }]
    : [];

  const enrichedMovieSchema = {
    "@context": "https://schema.org",
    "@type": "Movie",
    name: movie.title,
    url: canonical,
    ...(movie.posterUrl || movie.thumbnailUrl ? { image: movie.posterUrl || movie.thumbnailUrl } : {}),
    ...(effectiveSynopsis ? { description: effectiveSynopsis.slice(0, 300) } : {}),
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
...(movie._allProductionNames?.length ? {
      productionCompany: movie._allProductionNames.map((name: string) => ({ "@type": "Organization", name })),
    } : {}),
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
    subjectOf: [
      { "@type": "WebPage", name: `${movie.title} Box Office Collection`, url: `${SITE_URL}/box-office/${movie.slug || movie._id}` },
      { "@type": "WebPage", name: `${movie.title} Songs & Audio`, url: `${SITE_URL}/songs/${movie.slug || movie._id}` },
      { "@type": "WebPage", name: `${movie.title} Reviews & News`, url: `${SITE_URL}/blog?q=${encodeURIComponent(movie.title)}` }
    ]
  };

  const structuredData = [
    enrichedMovieSchema,
    breadcrumbJsonLd([
      { name: "Home",   url: "/" },
      { name: "Movies", url: "/movies" },
      { name: movie.title, url: `/movie/${movie.slug || movie._id}` },
    ]),
    buildFaqJsonLd(movie, year, avgRating, songs, directorName, producerName),
    // NOTE: aggregateRating is now merged into enrichedMovieSchema above.
    // buildAggregateRatingJsonLd removed — it emitted a duplicate @type:Movie
    // entity for the same URL, which could confuse Google's entity resolution.
    ...(blogs.length > 0 ? [{
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: `Articles about ${movie.title}`,
      itemListElement: blogs.map((b: any, i: number) => ({
        "@type": "ListItem", position: i + 1, name: b.title,
        url: `${SITE_URL}/blog/${b.slug}`,
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
        url: `${SITE_URL}/songs/${movie.slug}/${i}/${toSlug(s.title) || String(i)}`,
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

          {/* ── Poster + Title row + Box Office (right on lg+) ── */}
          <div className="pt-5 pb-6 sm:pb-8 lg:grid lg:grid-cols-[1fr_320px] lg:items-start">
          {/* Left column: poster + title + stats + countdown + share */}
          <div className="flex flex-wrap sm:flex-nowrap gap-3 sm:gap-6 lg:pr-8">

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

            {/* Wrapper: behaves as 'contents' on mobile (< sm) so stats drop full-width below poster, 
                and as flex-col column on desktop (sm+) so all details sit beside poster */}
            <div className="contents sm:flex sm:flex-col sm:flex-1 sm:min-w-0">

              {/* Title + core identity info */}
              <div className="flex-1 min-w-0 sm:w-full">

                {/* Genre + language badges */}
                <div className="flex flex-wrap gap-1 mb-1.5 sm:mb-2">
                  {(movie.genre || []).map((g: string) => (
                    <Link key={g} href={`/movies/genre/${encodeURIComponent(g.toLowerCase())}`}>
                      <span className="text-[10px] sm:text-xs font-semibold px-2 py-0.5 sm:px-3 sm:py-1 bg-orange-950/80 border border-orange-900/60 text-orange-400 rounded-full hover:bg-orange-900 transition-colors">
                        {g}
                      </span>
                    </Link>
                  ))}
                  {movie.language && (
                    <span className="text-[10px] sm:text-xs font-semibold px-2 py-0.5 sm:px-3 sm:py-1 bg-blue-950/80 border border-blue-900/60 text-blue-400 rounded-full">
                      {movie.language}
                    </span>
                  )}
                  {movie.contentRating && (
                    <span className="text-[10px] sm:text-xs font-semibold px-2 py-0.5 sm:px-3 sm:py-1 bg-zinc-800 border border-zinc-700 text-zinc-400 rounded-full">
                      {movie.contentRating}
                    </span>
                  )}
                </div>

                {/* Title */}
                <h1 className="font-display font-black text-white leading-tight mb-1 text-xl sm:text-3xl md:text-4xl lg:text-5xl">
                  {movie.title}
                </h1>

                {/* Production House(s) */}
                {movie._allProductionNames?.length > 0 && (
                  <div className="inline-flex items-center gap-1.5 mt-0.5 mb-1.5 flex-wrap">
                    <span className="text-[9px] sm:text-[10px] text-gray-500 uppercase tracking-widest font-medium">A</span>
                    <span className="inline-flex items-center gap-1.5 px-2 py-[2px] sm:px-2.5 sm:py-[3px] rounded-[3px] border-l-2 border-orange-500 bg-gradient-to-r from-orange-500/10 to-transparent text-orange-300 text-[10px] sm:text-xs font-semibold tracking-wide">
                      {movie._allProductionNames.length === 1
                        ? movie._allProductionNames[0]
                        : movie._allProductionNames.length === 2
                        ? movie._allProductionNames.join(" & ")
                        : `${movie._allProductionNames.slice(0, -1).join(", ")} & ${movie._allProductionNames[movie._allProductionNames.length - 1]}`}
                    </span>
                    <span className="text-[9px] sm:text-[10px] text-gray-500 uppercase tracking-widest font-medium">Presentation</span>
                  </div>
                )}

                {year && (
                  <p className="text-zinc-400 text-xs sm:text-sm md:text-base mb-2 font-medium">
                    ({year}) · Odia Film
                  </p>
                )}

                {/* Interested count / Rating */}
                {(((movie.interestedYes || 0) + (movie.interestedNo || 0)) > 0 || (!isUnreleased && avgRating !== null)) && (
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {((movie.interestedYes || 0) + (movie.interestedNo || 0)) > 0 && (
                      <div className="inline-flex items-center gap-1.5 bg-[#111] border border-[#1f1f1f] rounded-lg px-2 py-1 sm:px-3 sm:py-1.5">
                        <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-400" />
                        <span className="font-bold text-white text-xs sm:text-sm md:text-base">
                          {(movie.interestedYes || 0).toLocaleString("en-IN")}
                        </span>
                        <span className="text-[10px] sm:text-xs text-zinc-400">interested</span>
                      </div>
                    )}
                    {!isUnreleased && avgRating !== null && (
                      <div className="inline-flex items-center gap-1.5 bg-[#111] border border-[#1f1f1f] rounded-lg px-2 py-1 sm:px-3 sm:py-1.5">
                        <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-bold text-white text-xs sm:text-sm md:text-base">{(avgRating as number).toFixed(1)}</span>
                        <span className="text-zinc-500 text-[10px] sm:text-xs">/10</span>
                        <span className="text-[10px] sm:text-xs text-zinc-400 ml-0.5">({movie.reviews?.length})</span>
                      </div>
                    )}
                  </div>
                )}

              </div>{/* end title & identity */}

              {/* Details block (underneath poster on mobile, inside info column beside poster on desktop) */}
              <div className="w-full mt-3.5 sm:mt-4 space-y-3 sm:space-y-4">

                {/* Accent Cards Grid (Netflix / HBO Max Style) */}
                <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
                  {movie.releaseDate && (
                    <StatChip
                      label="Release"
                      value={formatReleaseDate(movie.releaseDate, movie.releaseDatePrecision, "short")}
                      variant="default"
                    />
                  )}
                  {movie.isReRelease && movie.reReleaseDate && (
                    <StatChip
                      label="Re-Release"
                      value={formatReleaseDate(movie.reReleaseDate, movie.reReleaseDatePrecision, "short")}
                      variant="orange"
                    />
                  )}
                  {movie.runtime && (
                    <StatChip label="Runtime" value={movie.runtime} variant="default" />
                  )}
                  {/* Director — Glowing Orange Accent Card */}
                  {(() => {
                    const dirFromCast = getDirectorFromCast(movie.cast || []);
                    const dirName = dirFromCast || movie.director;
                    return dirName ? (
                      <StatChip label="Director" value={dirName} variant="orange" />
                    ) : null;
                  })()}
                  {/* Producer — Glowing Indigo Accent Card */}
                  {(() => {
                    const prodFromCast = getProducerFromCast(movie.cast || []);
                    const prodName = prodFromCast || movie.producer;
                    return prodName ? (
                      <StatChip label="Producer" value={prodName} variant="indigo" />
                    ) : null;
                  })()}
                  {/* Verdict */}
                  {movie.verdict && !(movie.boxOffice?.opening || movie.boxOffice?.total || movie.boxOfficeDays?.length > 0) && (
                    <StatChip label="Verdict" value={movie.verdict} variant="green" />
                  )}
                </div>

                {/* Synopsis — shown on md+ */}
                {effectiveSynopsis && (
                  <p className="hidden md:block text-zinc-400 text-sm leading-relaxed line-clamp-3 max-w-2xl mt-3">
                    {effectiveSynopsis.length > 220 ? effectiveSynopsis.slice(0, 220).trimEnd() + "…" : effectiveSynopsis}
                  </p>
                )}

                {/* Release countdown — live client-side timer for Upcoming movies */}
                {movie.verdict === "Upcoming" && movie.releaseDate && !movie.releaseTBA && (
                  <ReleaseCountdown releaseDate={movie.releaseDate} title={movie.title} />
                )}

                {/* Interest Card for unreleased movies (Mobile view) */}
                {isUnreleased ? (
                  <div className="lg:hidden mt-3 bg-[#111] border border-[#1f1f1f] rounded-2xl p-4 space-y-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-5 bg-orange-500 rounded flex-shrink-0" />
                      <h2 className="text-sm font-extrabold text-white flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-orange-500" />
                        Are You Interested?
                      </h2>
                    </div>
                    <p className="text-xs text-gray-400 leading-normal">
                      {movie.title} hasn&apos;t released yet, so reviews aren&apos;t open. Let us know if you&apos;re looking forward to it!
                    </p>
                    <VoteButtons
                      movieId={String(movie._id)}
                      initialYes={movie.interestedYes || 0}
                      initialNo={movie.interestedNo || 0}
                    />
                  </div>
                ) : (
                  /* Review section for released movies (Mobile Hero view - Form only) */
                  <div className="lg:hidden mt-3">
                    <ReviewForm
                      movieId={String(movie._id)}
                      movieTitle={movie.title}
                      moviePoster={movie.posterUrl}
                      initialReviews={movie.reviews ?? []}
                      mode="form-only"
                    />
                  </div>
                )}

              </div>{/* end details block */}

            </div>{/* end wrapper div */}

            </div>{/* end left col flex */}

            {/* ── Desktop Right Column (lg+): ONLY Write Review Section (or Interest for upcoming) ── */}
            <div className="hidden lg:block self-start">
              {isUnreleased ? (
                <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-5 sm:p-6 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-6 bg-orange-500 rounded flex-shrink-0" />
                    <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                      <Users className="w-4 h-4 text-orange-500" />
                      Are You Interested?
                    </h2>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    {movie.title} hasn&apos;t released yet, so reviews aren&apos;t open. Let us know if you&apos;re looking forward to it — the review section unlocks once it&apos;s out.
                  </p>
                  <VoteButtons
                    movieId={String(movie._id)}
                    initialYes={movie.interestedYes || 0}
                    initialNo={movie.interestedNo || 0}
                  />
                </div>
              ) : (
                <ReviewForm
                  movieId={String(movie._id)}
                  movieTitle={movie.title}
                  moviePoster={movie.posterUrl}
                  initialReviews={movie.reviews ?? []}
                  mode="form-only"
                />
              )}
            </div>
          </div>{/* end hero 2-col grid */}

        </div>
      </div>

      {/* ── SITELINKS NAVIGATION (Sacnilk Style SEO) ── */}
      <div className="sticky top-14 md:top-16 z-40 w-full bg-[#0a0a0a]/95 backdrop-blur-md border-y border-[#1a1a1a] shadow-lg mb-6">
        <nav aria-label="Movie Sections" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ul className="flex items-center gap-1 sm:gap-6 overflow-x-auto scrollbar-none py-2 sm:py-3">
            <li>
              <Link href={`/movie/${movie.slug || movie._id}`} className="block px-3 py-1.5 text-[11px] sm:text-sm font-bold text-white bg-[#1f1f1f] rounded-lg whitespace-nowrap">
                Overview
              </Link>
            </li>
            <li>
              <Link href={`/discussion/movie/${movie.slug || movie._id}`} className="block px-3 py-1.5 text-[11px] sm:text-sm font-semibold text-orange-400 hover:text-white hover:bg-orange-500/10 rounded-lg whitespace-nowrap transition-colors flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-orange-400" />
                <span>Community &amp; Discussion</span>
              </Link>
            </li>
            {(movie.boxOffice?.opening || movie.boxOffice?.total || movie.boxOfficeDays?.length > 0) && (
              <li>
                <Link href={`/box-office/${movie.slug || movie._id}`} className="block px-3 py-1.5 text-[11px] sm:text-sm font-semibold text-gray-400 hover:text-orange-400 hover:bg-orange-500/10 rounded-lg whitespace-nowrap transition-colors">
                  Box Office
                </Link>
              </li>
            )}
            <li>
              <a href="#cast" className="block px-3 py-1.5 text-[11px] sm:text-sm font-semibold text-gray-400 hover:text-orange-400 hover:bg-orange-500/10 rounded-lg whitespace-nowrap transition-colors">
                Cast & Crew
              </a>
            </li>
            {(movie.media?.songs?.length > 0) && (
              <li>
                <Link href={`/songs/${movie.slug || movie._id}`} className="block px-3 py-1.5 text-[11px] sm:text-sm font-semibold text-gray-400 hover:text-orange-400 hover:bg-orange-500/10 rounded-lg whitespace-nowrap transition-colors">
                  Songs
                </Link>
              </li>
            )}
            {/* ★ SEO: Trailer link — gives /trailers/[slug] HTML discovery instead of sitemap-only */}
            {(movie.media?.videos?.length > 0) && movie.slug && (
              <li>
                <Link href={`/trailers/${movie.slug}`} className="block px-3 py-1.5 text-[11px] sm:text-sm font-semibold text-gray-400 hover:text-orange-400 hover:bg-orange-500/10 rounded-lg whitespace-nowrap transition-colors">
                  Trailer
                </Link>
              </li>
            )}
            {/* ★ SEO: OTT link — gives /ott/[slug] HTML discovery instead of sitemap-only */}
            {(movie.ott?.platform || movie.streamingOn) && movie.slug && (
              <li>
                <Link href={`/ott/${movie.slug}`} className="block px-3 py-1.5 text-[11px] sm:text-sm font-semibold text-gray-400 hover:text-orange-400 hover:bg-orange-500/10 rounded-lg whitespace-nowrap transition-colors">
                  Watch Now
                </Link>
              </li>
            )}
            <li>
              <Link href={`/blog?q=${encodeURIComponent(movie.title)}`} className="block px-3 py-1.5 text-[11px] sm:text-sm font-semibold text-gray-400 hover:text-orange-400 hover:bg-orange-500/10 rounded-lg whitespace-nowrap transition-colors">
                Blogs/Reviews
              </Link>
            </li>
          </ul>
        </nav>
      </div>

      {/* ── Top Content Ad (Visible on all screen sizes, responsive) ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
        <DisplayAd slot="8191172163" format="auto" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">

        {/* ══ MAIN CONTENT GRID ══ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-start">

          {/* ── SIDEBAR ── */}
          <aside className="lg:col-span-1 space-y-4 order-2 lg:order-1 self-start lg:sticky lg:top-28">

            {/* Movie Info card */}
            <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-5">
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Info className="w-3.5 h-3.5" /> Movie Info
              </h2>
              <InfoRow icon={Calendar}     label="Release Date"  value={fmtDate(movie.releaseDate, movie.releaseDatePrecision) || (movie.releaseTBA ? "TBA" : undefined)} />
              {movie.isReRelease && movie.reReleaseDate && (
                <InfoRow icon={Calendar} label="Re-Release Date" value={fmtDate(movie.reReleaseDate, movie.reReleaseDatePrecision)} />
              )}
              <InfoRow icon={Clock}        label="Runtime"       value={movie.runtime} />
              <InfoRow icon={Globe}        label="Language"      value={movie.language || "Odia"} />
              <InfoRow icon={Clapperboard} label="Director"      value={getDirectorFromCast(movie.cast || []) || movie.director} />
              <InfoRow icon={User}         label="Producer"      value={getProducerFromCast(movie.cast || []) || movie.producer} />
              <InfoRow icon={DollarSign}   label="Budget"        value={movie.budget} />
              <InfoRow icon={Film}         label="Category"      value={movie.category} />
              <InfoRow icon={Star}         label="Content Rating" value={movie.contentRating} />
              {movie._allProductionNames?.length > 0 && (
                <InfoRow icon={Film} label="Production House" value={movie._allProductionNames.join(", ")} />
              )}
            </div>



            {/* ── OTT / Streaming sidebar card ── */}
            {movie.streamingOn && (
              (() => {
                const logo    = null; // using OttLogoImg component
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
                      <div className="w-10 h-10 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl flex items-center justify-center flex-shrink-0">
                        <OttLogoImg platform={movie.streamingOn} size="md" />
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
                        <OttLogoImg platform={movie.streamingOn} size="sm" />
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

            {/* "Are You Interested" voting:
                - Upcoming/TBA → lives only in the main content area below
                  (replacing the review section, since there's nothing to
                  review yet) — not duplicated here.
                - Released → restored here in the sidebar (original behavior),
                  alongside the review section, which is now visible again too. */}
            {!isUnreleased && (
              <VoteButtons movieId={String(movie._id)}
                initialYes={movie.interestedYes || 0} initialNo={movie.interestedNo || 0} />
            )}

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
                  ...(movie.genre?.[0] ? [{ label: `${movie.genre[0]} Odia Films`, href: `/movies/genre/${encodeURIComponent(movie.genre[0].toLowerCase())}` }] : []),
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
              <section aria-label={`${movie.title} official ${trailer.type || "Video"}`}>
                <SectionHeading icon={Play} title={`Official ${trailer.type || "Video"}`} />
                <div className="rounded-2xl overflow-hidden border border-[#1f1f1f]">
                  <YouTubeEmbed ytId={trailer.ytId} title={`${movie.title} Official ${trailer.type || "Video"}`} />
                </div>
              </section>
            )}

            {/* ── Synopsis / About the Film ── */}
            {effectiveSynopsis && (
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
                      <div className="flex-1 mt-1 sm:mt-0 max-w-[800px]">
                        <p className="text-gray-200 leading-[1.85] text-[15px] font-light tracking-wide text-left sm:text-justify">
                          {effectiveSynopsis}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Mood / Watch tags */}
                  {(movie.genre||[]).length > 0 && (
                    <div className="px-6 pb-5 flex flex-wrap gap-2">
                      <span className="text-[10px] text-gray-600 self-center mr-1">Watch if you like:</span>
                      {(movie.genre as string[]).map((g) => (
                        <Link key={g} href={`/movies/genre/${encodeURIComponent(g.toLowerCase())}`}
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
                  const brand = BRAND[movie.streamingOn] ?? {bg:"bg-emerald-500/10",border:"border-emerald-500/25",text:"text-emerald-300",btn:"text-emerald-400 bg-emerald-500/8 hover:bg-emerald-500/15 border-emerald-500/20"};

                  const ottDate    = movie.ottReleaseDate || "";
                  const isTBA      = ottDate === "TBA";
                  const isComing   = !isTBA && !!ottDate && new Date(ottDate) > new Date();
                  const isAvailable= !isTBA && (!ottDate || new Date(ottDate) <= new Date());
                  const daysLeft   = isComing ? Math.ceil((new Date(ottDate).getTime()-Date.now())/86400000) : 0;

                  return (
                    <div className={`${brand.bg} border ${brand.border} rounded-2xl overflow-hidden`}>
                      {/* Header bar */}
                      <div className="flex items-center gap-4 p-5 pb-4">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 border ${brand.border} bg-black/20`}>
                          <OttLogoImg platform={movie.streamingOn} size="lg" />
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
                            <OttLogoImg platform={movie.streamingOn} size="sm" />
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

            <div className="py-2">
              <DisplayAd slot="8191172163" format="auto" />
            </div>

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
                                  <LoadingCard href={member.castId ? `/cast/${member.castId}` : "#"}
                                    className="flex items-start gap-2.5 group/link"
                                    aria-disabled={!member.castId}>
                                    <div className="relative w-7 h-7 rounded-full overflow-hidden flex-shrink-0 border border-[#333]">
                                      <Image
                                        src={member.photo || "/placeholder-person.svg"}
                                        alt={member.name}
                                        fill className="object-cover"
                                      />
                                    </div>
                                    <span className="text-sm font-semibold text-white group-hover/link:text-orange-400 transition-colors break-words min-w-0">
                                      {member.name}
                                    </span>
                                  </LoadingCard>
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
                                  <LoadingCard href={member.castId ? `/cast/${member.castId}` : "#"}
                                    className="flex items-start gap-2.5 group/link"
                                    aria-disabled={!member.castId}>
                                    <div className="relative w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border border-[#333]">
                                      <Image
                                        src={member.photo || "/placeholder-person.svg"}
                                        priority={true}
                                        alt={`${member.name} in ${movie.title}`}
                                        fill className="object-cover"
                                      />
                                    </div>
                                    <span className="text-sm font-semibold text-white group-hover/link:text-orange-400 transition-colors break-words min-w-0">
                                      {member.name}
                                    </span>
                                  </LoadingCard>
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

            <div className="py-2">
              {/* Mid Content Ad (Visible on all screen sizes, responsive) */}
              <DisplayAd slot="8191172163" format="auto" />
            </div>

            {/* ── Songs ── */}
            {songs.length > 0 && (
              <section aria-label={`${movie.title} songs soundtrack`}>
                <SectionHeading icon={Music} title="Songs" count={songs.length} />
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {songs.map((song: any, i: number) => (
                    <SongCard 
                      key={i}
                      href={`/songs/${movie.slug}/${i}/${toSlug(song.title) || String(i)}`}
                      song={{ ...song, movieTitle: movie.title }} 
                    />
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

            {/* ── Community & Discussion Callout Banner ── */}
            <section aria-label={`Join community discussion for ${movie.title}`} className="bg-gradient-to-r from-orange-950/30 via-[#111] to-[#111] border border-orange-500/25 rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-[0_4px_24px_rgba(249,115,22,0.06)]">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="flex h-2.5 w-2.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500"></span>
                  </span>
                  <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-orange-400" />
                    Community &amp; Discussion Room
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-gray-400 max-w-xl">
                  Vote in the Ollypedia Meter (Skip, Timepass, Go for it, Perfection), participate in fan discussions, and debate about {movie.title}!
                </p>
              </div>
              <Link
                href={`/discussion/movie/${movie.slug || movie._id}`}
                className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-400 hover:to-red-500 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-[0_0_15px_rgba(249,115,22,0.3)] hover:shadow-[0_0_20px_rgba(249,115,22,0.5)] flex items-center gap-2 flex-shrink-0"
              >
                <MessageSquare className="w-4 h-4" />
                Join Discussion &rarr;
              </Link>
            </section>

            {/* ── User Reviews (released movies) / Are You Interested (Upcoming, TBA) ──
                Upcoming and TBA movies haven't released yet, so there's nothing
                to review — showing an empty review form there read as broken.
                The interest vote now lives here instead, replacing the section
                entirely rather than sitting alongside it. */}
            {isUnreleased ? (
              <section aria-label={`Are you interested in ${movie.title}?`} className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-5 sm:p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-1 h-6 bg-orange-500 rounded flex-shrink-0" />
                  <h2 className="text-lg sm:text-xl font-extrabold text-white flex items-center gap-2">
                    <Users className="w-[18px] h-[18px] text-orange-500" />
                    Are You Interested?
                  </h2>
                </div>
                <p className="text-sm text-gray-500 mb-4">
                  {movie.title} hasn&apos;t released yet, so reviews aren&apos;t open. Let us know if you&apos;re looking forward to it — the review section unlocks once it&apos;s out.
                </p>
                <VoteButtons
                  movieId={String(movie._id)}
                  initialYes={movie.interestedYes || 0}
                  initialNo={movie.interestedNo || 0}
                />
              </section>
            ) : (
              <section aria-label={`User reviews for ${movie.title}`}>
                <ReviewForm
                  movieId={String(movie._id)}
                  movieTitle={movie.title}
                  moviePoster={movie.posterUrl}
                  initialReviews={movie.reviews ?? []}
                  mode="reviews-only"
                />
              </section>
            )}

            {/* ══ SEO CONTENT BLOCK ══ */}
            <section aria-label={`About ${movie.title} Odia film`} className="space-y-5">

              {/* About this film — editorial SEO prose */}
              <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-6">
                <SectionHeading title={`About ${movie.title}${year ? ` (${year})` : ""}`} />
                <div className="space-y-3 text-gray-400 text-sm leading-relaxed">
                  {(() => {
                    const hash = String(movie._id).split('').reduce((a, b) => a + b.charCodeAt(0), 0);
                    const v = hash % 3;
                    const gText = (movie.genre || []).length > 0 ? (movie.genre as string[]).join(", ") : "";
                    
                    if (v === 0) {
                      return (
                        <>
                          <p>
                            <strong className="text-white">{movie.title}</strong> is {gText ? `a ${gText}` : "an"} Odia film
                            {year ? ` released in ${year}` : ""}{directorName ? `, directed by ${directorName}` : ""}.
                            Produced {producerName ? `by ${producerName}` : "in the Odia language"}, it is a prominent title in the <strong className="text-white">Ollywood film industry</strong>.
                          </p>
                          {movie.synopsis && <p>{movie.synopsis.length > 350 ? movie.synopsis.slice(0, 350).trimEnd() + "…" : movie.synopsis}</p>}
                          {movie.verdict && <p>The box office verdict of <strong className="text-white">{movie.title}</strong> is <strong className="text-white">{movie.verdict}</strong>{movie.boxOffice?.total ? `, with a total collection of ${movie.boxOffice.total}` : ""}.</p>}
                        </>
                      );
                    } else if (v === 1) {
                      return (
                        <>
                          <p>
                            Directed by {directorName || "an acclaimed director"}, <strong className="text-white">{movie.title}</strong> is a popular {gText} movie from Ollywood{year ? ` that hit theatres in ${year}` : ""}.
                            {producerName ? ` It was produced by ${producerName}.` : ""}
                          </p>
                          {movie.synopsis && <p>The plot follows: {movie.synopsis.length > 300 ? movie.synopsis.slice(0, 300).trimEnd() + "…" : movie.synopsis}</p>}
                          {movie.verdict && <p>Commercially, it emerged as a <strong className="text-white">{movie.verdict}</strong> in the Odia cinema circuit{movie.boxOffice?.total ? ` grossing ${movie.boxOffice.total}` : ""}.</p>}
                        </>
                      );
                    } else {
                      return (
                        <>
                          <p>
                            Adding to the rich legacy of Odia cinema, <strong className="text-white">{movie.title}</strong>{year ? ` (${year})` : ""} is {gText ? `an engaging ${gText}` : "a"} feature film.
                            {directorName ? ` Helmed by ${directorName}` : ""}{producerName ? ` and backed by ${producerName}` : ""}, the film was widely discussed among Ollywood fans.
                          </p>
                          {movie.synopsis && <p>{movie.synopsis.length > 320 ? movie.synopsis.slice(0, 320).trimEnd() + "…" : movie.synopsis}</p>}
                          {movie.verdict && <p>In terms of box office performance, <strong className="text-white">{movie.title}</strong> was a <strong className="text-white">{movie.verdict}</strong>{movie.boxOffice?.total ? ` (${movie.boxOffice.total})` : ""}.</p>}
                        </>
                      );
                    }
                  })()}
                  
                  {songs.length > 0 && (
                    <p>
                      The <strong className="text-white">{movie.title} soundtrack</strong> features{" "}
                      <strong className="text-white">{songs.length} songs</strong>
                      {songs[0]?.singer ? `, including tracks by ${[...new Set(songs.slice(0,3).map((s:any)=>s.singer).filter(Boolean))].join(", ")}` : ""}.
                    </p>
                  )}
                  {(() => {
                    const { cast: castOnly } = splitCastCrew(movie.cast || []);
                    const actorNames = Array.from(new Set(castOnly.map((c: any) => c.name).filter(Boolean)));
                    if (!actorNames.length) return null;
                    return (
                      <p>
                        The film stars{" "}
                        <strong className="text-white">
                          {actorNames.slice(0, 4).join(", ")}
                        </strong>
                        {actorNames.length > 4 ? ` and ${actorNames.length - 4} others` : ""}.
                      </p>
                    );
                  })()}
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
                    <Link key={g} href={`/movies/genre/${encodeURIComponent(g.toLowerCase())}`}
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

              {/* Pre-FAQ Ad (Visible on all screen sizes, responsive) */}
              <div className="py-2">
                <DisplayAd slot="8191172163" format="auto" />
              </div>

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
                    ...(() => {
                      const { cast: castOnly } = splitCastCrew(movie.cast || []);
                      const actorNames = Array.from(new Set(castOnly.map((c: any) => c.name).filter(Boolean)));
                      if (!actorNames.length) return [];
                      return [{
                        q: `Who are the main cast of ${movie.title}?`,
                        a: `${movie.title} features ${actorNames.slice(0, 5).join(", ")} in the lead and supporting roles.`,
                      }];
                    })(),
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
                        ? `${movie.title} was released on ${formatReleaseDate(movie.releaseDate, movie.releaseDatePrecision, "long")}.`
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
                <div className="pt-4">
                  <SectionHeading icon={FileText} title={`Articles about ${movie.title}`} count={blogs.length} />
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-4">
                    {blogs.map((b: any) => (
                      <BlogCard key={b._id} blog={b} variant="standard" />
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
              <Link href={movie.genre?.[0] ? `/movies/genre/${encodeURIComponent(movie.genre[0].toLowerCase())}` : "/movies"}
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