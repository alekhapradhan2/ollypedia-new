// app/cast/[id]/page.tsx
// Full redesign — Tailwind-based, improved readability, AdSense-ready SEO content
import { SITE_URL } from "@/lib/seo";

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { connectDB } from "@/lib/db";
import Cast from "@/models/Cast";
import Movie from "@/models/Movie";
import News from "@/models/News";
import Blog from "@/models/Blog";
import { buildCastMeta } from "@/lib/castSeo";
import { formatReleaseDate } from "@/lib/dateUtils";
import { DisplayAd } from "@/components/ads/DisplayAd";
import {
  Film, Calendar, MapPin, User,
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
  try {
    await connectDB();
    const cast = await Cast.find({}, "_id").limit(15).lean();
    return cast.map((c: any) => ({ id: String(c._id) }));
  } catch (err) {
    return [];
  }
}

// ─── Data fetching ────────────────────────────────────────────────────────────
async function getCastMember(id: string) {
  if (!id || typeof id !== "string" || !/^[a-f0-9]{24}$/i.test(id)) return null;
  try {
    await connectDB();
    const member: any = await Cast.findById(id).lean();
    if (!member) return null;

    const escapedName = member.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const [movies, news, blogs] = await Promise.all([
      Movie.find(
        {
          $or: [
            { "cast.castId": member._id },
            ...(Array.isArray(member.movies) && member.movies.length > 0 ? [{ _id: { $in: member.movies } }] : []),
          ]
        },
        "title slug posterUrl thumbnailUrl releaseDate genre verdict imdbRating cast"
      ).sort({ releaseDate: -1 }).lean(),
      News.find({ castId: member._id }).sort({ createdAt: -1 }).limit(12).lean(),
      Blog.find(
        {
          $and: [
            { $or: [{ approved: true }, { status: "published" }] },
            {
              $or: [
                { castIds: member._id },
                { "castIds": String(member._id) },
                { tags: { $regex: escapedName, $options: "i" } },
                { title: { $regex: escapedName, $options: "i" } },
              ],
            },
          ],
        },
        "title slug excerpt coverImage category tags createdAt readTime views"
      ).sort({ createdAt: -1 }).limit(9).lean(),
    ]);
    return JSON.parse(JSON.stringify({ ...member, moviesList: movies, newsList: news, blogsList: blogs }));
  } catch (err) {
    console.error("getCastMember Error:", err);
    return null;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getDerivedRoles(person: any, movies: any[]): string[] {
  let roles = person.roles?.length ? person.roles.filter((r: string) => r.toLowerCase() !== "other") : [];
  if (roles.length === 0) {
    const movieRoles = new Set<string>();
    movies.forEach((m: any) => {
      const entry = (m.cast || []).find((c: any) => String(c.castId) === String(person._id));
      if (entry) {
        if (entry.role && entry.role.toLowerCase() !== "other") {
          movieRoles.add(entry.role);
        } else if (entry.type && entry.type.toLowerCase() !== "other") {
          movieRoles.add(entry.type);
        }
      }
    });
    if (movieRoles.size > 0) roles = Array.from(movieRoles).slice(0, 3);
  }
  if (roles.length === 0) {
    const pt = person.type || "Artist";
    roles = [pt.toLowerCase() === "other" ? "Artist" : pt];
  }
  return roles;
}

// getMisspellings REMOVED — Google handles misspelling matching automatically.
// Intentional misspellings in <meta keywords> trigger spam/keyword-stuffing penalties.

// ─── Metadata — delegates to castSeo.ts ───────────────────────────────────────────
export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const person = await getCastMember(params.id);
  if (!person) return { robots: { index: false, follow: false } };

  // Delegate to the dedicated castSeo module
  return buildCastMeta(person);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(d?: string | Date, precision?: string) {
  if (!d) return "";
  if (typeof d === "string") return formatReleaseDate(d, precision, "short");
  try { return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }); }
  catch { return String(d); }
}

function stripMarkdown(raw: string): string {
  if (!raw) return "";
  // Strip HTML tags first
  let stripped = raw.replace(/<[^>]+>/g, " ");
  // Strip Markdown
  return stripped.replace(/\*\*(.*?)\*\*/g, "$1").replace(/\*(.*?)\*/g, "$1").replace(/^[#\-*•]\s+/gm, "").trim();
}

function formatBioHtml(raw: string): string {
  if (!raw) return "";
  
  // If it already contains HTML tags, just return it as is
  if (/<[a-z][\s\S]*>/i.test(raw)) {
    return raw;
  }

  const lines = raw.split(/\r?\n/);
  const parts: string[] = [];
  let ulOpen = false;
  let paraLines: string[] = [];

  const inlineFmt = (s: string) =>
    s.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
     .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
     .replace(/\*(.+?)\*/g, "<em>$1</em>");

  const flushPara = () => {
    if (!paraLines.length) return;
    const text = paraLines.join(" ").trim();
    if (text) parts.push(`<p class="mb-4 last:mb-0">${inlineFmt(text)}</p>`);
    paraLines = [];
  };

  const closeList = () => {
    if (ulOpen) { parts.push("</ul>"); ulOpen = false; }
  };

  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (!t) { flushPara(); closeList(); continue; }

    const bullet = t.match(/^[•\-*]\s+(.+)/);
    if (bullet) {
      flushPara();
      if (!ulOpen) { parts.push('<ul class="list-disc pl-5 mb-4 space-y-2 text-gray-300 text-sm md:text-base leading-relaxed">'); ulOpen = true; }
      parts.push(`<li>${inlineFmt(bullet[1])}</li>`);
      continue;
    }

    const boldLine = t.match(/^\*\*([^*]+)\*\*\s*:?\s*$/);
    if (boldLine) {
      flushPara(); closeList();
      parts.push(`<h3 class="text-white font-bold text-lg mt-6 mb-2">${boldLine[1]}</h3>`);
      continue;
    }
    
    const mdH3 = t.match(/^###?\s+(.+)/);
    if (mdH3) {
      flushPara(); closeList();
      parts.push(`<h3 class="text-white font-bold text-lg mt-6 mb-2">${inlineFmt(mdH3[1])}</h3>`);
      continue;
    }

    closeList();
    paraLines.push(t);
  }

  flushPara(); closeList();
  return parts.join("\n");
}

function generateRichBio(person: any, movies: any[]): string {
  if (person.ai?.about) return person.ai.about;
  if (person.bio && person.bio.trim().length > 80) return person.bio;
  
  const rolesArr = getDerivedRoles(person, movies);
  const roles    = rolesArr.join(" and ");
  const released = movies.filter(m => m.verdict && m.verdict !== "Upcoming");
  const debutMovie = movies.length ? movies[movies.length - 1] : null;
  const debutYear  = debutMovie?.releaseDate ? new Date(debutMovie.releaseDate).getFullYear() : null;
  const latestMovie = movies[0];
  const genreStr = [...new Set(movies.flatMap(m => m.genre || []))].slice(0, 3).join(", ");
  
  const coMap: Record<string, { name: string; count: number }> = {};
  movies.forEach(m => {
    (m.cast || []).forEach((c: any) => {
      if (String(c.castId) === String(person._id) || !c.name) return;
      if (c.type !== "Actor" && c.type !== "Actress") return;
      const k = String(c.castId || c.name);
      coMap[k] = { name: c.name, count: (coMap[k]?.count || 0) + 1 };
    });
  });
  
  const topCostar = Object.values(coMap).sort((a, b) => b.count - a.count)[0];
  const paras: string[] = [];
  
  // Pseudo-randomizer based on name length to vary the templates
  const seed = (person.name?.length || 0) + movies.length;
  const v = seed % 3;

  // Intro paragraph
  if (v === 0) {
    paras.push(`${person.name} is a highly regarded ${roles} in the Odia film industry, consistently delivering memorable work.` + (debutYear ? ` Making their mark in ${debutYear}${debutMovie ? ` with "${debutMovie.title}"` : ""}, ${person.name} has built a distinguished career in Ollywood.` : ""));
  } else if (v === 1) {
    paras.push(`Recognized for their exceptional talent, ${person.name} has established a strong presence as a ${roles} in Odia cinema.` + (debutYear ? ` They debuted in ${debutYear}${debutMovie ? ` with the film "${debutMovie.title}"` : ""} and have since become a key figure in the industry.` : ""));
  } else {
    paras.push(`${person.name} is a prominent ${roles} in Ollywood whose contributions continue to captivate audiences across Odisha.` + (debutYear ? ` Beginning their cinematic journey in ${debutYear}${debutMovie ? ` with "${debutMovie.title}"` : ""}, their career is a testament to their dedication.` : ""));
  }

  // Film count & genres
  if (movies.length > 0) {
    const plural = movies.length !== 1 ? "s" : "";
    if (v === 0) {
      paras.push(`To date, ${person.name} has been part of ${movies.length} Odia film${plural}.` + (genreStr ? ` Showcasing their versatility, they have successfully navigated diverse genres such as ${genreStr}.` : ""));
    } else if (v === 1) {
      paras.push(`Their filmography spans ${movies.length} Odia project${plural}.` + (genreStr ? ` ${person.name} is particularly noted for their performances across multiple genres, including ${genreStr}.` : ""));
    } else {
      paras.push(`Over the course of their career, ${person.name} has contributed to ${movies.length} Odia film${plural}.` + (genreStr ? ` They have worked across various genres—including ${genreStr}—proving their dynamic range as an artist.` : ""));
    }
  }

  // Co-star
  if (topCostar) {
    const fPlural = topCostar.count !== 1 ? "s" : "";
    if (v === 0) {
      paras.push(`Audiences have especially praised their on-screen chemistry with fellow Odia artists. They have frequently shared the screen with ${topCostar.name}, appearing together in ${topCostar.count} film${fPlural}.`);
    } else if (v === 1) {
      paras.push(`${person.name}'s most notable collaborations include working alongside ${topCostar.name}. The duo has starred together in ${topCostar.count} film${fPlural}, creating some highly memorable moments in Ollywood.`);
    } else {
      paras.push(`Throughout their journey, ${person.name} has formed strong on-screen partnerships. Their most frequent collaboration is with ${topCostar.name}, with whom they have worked in ${topCostar.count} film${fPlural}.`);
    }
  }

  // Latest movie & Outro
  if (latestMovie) {
    const lmYear = latestMovie.releaseDate ? ` (${new Date(latestMovie.releaseDate).getFullYear()})` : "";
    if (v === 0) {
      paras.push(`${person.name}'s recent work includes the Odia film "${latestMovie.title}"${lmYear}. As one of Ollywood's celebrated artists, they continue to inspire fans both in Odisha and beyond.`);
    } else if (v === 1) {
      paras.push(`Recently, ${person.name} was seen in the film "${latestMovie.title}"${lmYear}. Their enduring dedication to Odia cinema has earned them critical acclaim and a massive, loyal fanbase.`);
    } else {
      paras.push(`One of ${person.name}'s latest projects is "${latestMovie.title}"${lmYear}. Through their continuous hard work, they remain a beloved household name in the Odia entertainment space.`);
    }
  } else {
    paras.push(`As one of Ollywood's most respected artists, ${person.name}'s dedication to the craft has earned them critical acclaim and a loyal fanbase that extends far beyond the borders of Odisha.`);
  }

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
  const blogsList = (person.blogsList || []) as any[];
  const roles    = getDerivedRoles(person, movies);
  const rolesStr = roles.join(", ");
  const icon     = ROLE_ICON[roles[0]] || ROLE_ICON[person.type] || "🎭";

  const flops    = movies.filter((m: any) => ["Flop", "Disaster"].includes(m.verdict));
  const upcoming = movies.filter((m: any) => !m.verdict || m.verdict === "Upcoming");
  const released = movies.filter((m: any) => m.verdict && m.verdict !== "Upcoming");

  const coMap: Record<string, any> = {};
  movies.forEach((m: any) => {
    (m.cast || []).forEach((c: any) => {
      if (String(c.castId) === String(person._id) || !c.name) return;
      if (c.type !== "Actor" && c.type !== "Actress") return;
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
  const canonical = `${SITE_URL}/cast/${String(person._id)}`;

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
      person.wikipedia ?? null,
      person.imdb ?? null,
    ].filter(Boolean),
    memberOf: { "@type": "Organization", name: "Ollywood – Odia Film Industry" },
  };

  const filmographyLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${person.name} Filmography`,
    description: `Complete list of Odia films featuring ${person.name}`,
    itemListElement: movies.map((m: any, idx: number) => ({
      "@type": "ListItem",
      position: idx + 1,
      item: {
        "@type": "Movie",
        name: m.title,
        url: `${SITE_URL}/movie/${m.slug || m._id}`,
        ...(m.releaseDate ? { datePublished: m.releaseDate } : {}),
      }
    }))
  };
  const breadcrumbLd = {
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}` },
      { "@type": "ListItem", position: 2, name: "Cast", item: `${SITE_URL}/cast` },
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
          ? `${person.name} has been part of ${movies.length} Odia film${movies.length !== 1 ? "s" : ""} in Ollywood, spanning genres such as ${genres || "drama, action and romance"}.`
          : `${person.name} is associated with Ollywood, the Odia film industry.` },
      },
      {
        "@type": "Question",
        name: `What is ${person.name}'s most popular Odia film?`,
        acceptedAnswer: { "@type": "Answer", text: movies.length > 0
          ? `${person.name}'s notable Odia films include ${movies.slice(0, 3).map((m: any) => `"${m.title}"`).join(", ")}. Visit each movie page on Ollypedia for detailed cast, songs and review information.`
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(filmographyLd) }} />

      {/* ══ CINEMATIC HERO ══ */}
      <div className="relative overflow-hidden w-full bg-[#0a0a0a]">
        
        {/* ── Bright & Unique Background ── */}
        <div className="absolute inset-0 h-[65vh] min-h-[400px] w-full overflow-hidden">
          {backdrop ? (
            <>
              <Image src={backdrop} alt={`${person.name} background`} fill
                className="object-cover object-top opacity-85 blur-sm scale-105" priority />
              {/* This mask creates a perfect smooth fade from the image into the dark background below */}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0a0a0a]/60 to-[#0a0a0a]" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a]/80 via-transparent to-[#0a0a0a]/80 hidden sm:block" />
            </>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-b from-[#1c0d00] via-[#0a0a0a] to-[#0a0a0a]" />
          )}
          {/* Subtle animated glowing orb */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[80vw] h-[80vw] max-w-[600px] max-h-[600px] bg-orange-500/20 rounded-full blur-[100px] mix-blend-screen pointer-events-none animate-pulse" style={{ animationDuration: '8s' }} />
        </div>

        {/* ── UNIFIED layout: poster on left, details on right ── */}
        <div className="relative z-10 flex items-end max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-[18vh] sm:pt-[22vh] pb-8 sm:pb-12 gap-4 sm:gap-10">
          
          {/* Portrait — overlaps the banner fade */}
          <div className="flex-shrink-0 self-end relative z-20 group">
            {/* Ambient glow behind image */}
            <div className="absolute -inset-4 sm:-inset-6 bg-orange-500/30 blur-[30px] sm:blur-[40px] rounded-full opacity-50 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
            
            <div className="relative overflow-hidden transition-all duration-500 group-hover:-translate-y-2 sm:group-hover:-translate-y-3"
              style={{
                width: "clamp(110px, 30vw, 280px)",
                aspectRatio: "3/4",
                borderRadius: "16px",
                border: "2px solid rgba(255,255,255,0.2)",
                boxShadow: "0 20px 40px -10px rgba(0,0,0,0.9), 0 0 30px rgba(249,115,22,0.25)",
              }}>
              {person.photo ? (
                <Image src={person.photo} alt={`${person.name} – Odia ${rolesStr}`}
                  fill className="object-cover object-top transition-transform duration-700 group-hover:scale-105" priority />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-4xl sm:text-7xl bg-[#1a1a1a]">{icon}</div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 pb-2 sm:pb-4 z-10">
            {/* Chips */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2 sm:mb-5">
              <span className="text-[10px] sm:text-[12px] font-black tracking-widest uppercase px-2.5 sm:px-4 py-1 sm:py-1.5 rounded-full backdrop-blur-md bg-orange-500/10 border border-orange-500/30 text-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.2)]">
                {icon} {rolesStr}
              </span>
              {person.location && (
                <span className="hidden sm:flex text-[13px] font-medium px-4 py-1.5 rounded-full items-center gap-1.5 backdrop-blur-md bg-white/5 border border-white/10 text-gray-300 shadow-lg">
                  <MapPin className="w-3.5 h-3.5 text-gray-400" />{person.location}
                </span>
              )}
              {debutMovie?.releaseDate && (
                <span className="hidden sm:inline-flex text-[13px] font-bold px-4 py-1.5 rounded-full backdrop-blur-md bg-blue-500/10 border border-blue-500/20 text-blue-300 shadow-lg">
                  Since {new Date(debutMovie.releaseDate).getFullYear()}
                </span>
              )}
            </div>

            {/* Name */}
            <h1 className="font-display font-black leading-tight mb-2 sm:mb-4 text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400 drop-shadow-2xl"
              style={{ fontSize: "clamp(1.75rem, 5.5vw, 5rem)" }}>
              {person.name}
            </h1>

            {/* Bio */}
            {person.bio && (
              <p className="text-[12px] sm:text-[16px] leading-relaxed mb-4 sm:mb-8 max-w-3xl font-medium text-gray-300/90 line-clamp-2 sm:line-clamp-2">
                {stripMarkdown(person.bio)}
              </p>
            )}

            {/* Stat pills & Social in one row */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-4">
              {movies.length > 0 && (
                <div className="group flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-1.5 sm:py-2.5 rounded-xl sm:rounded-2xl backdrop-blur-md border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all cursor-default shadow-xl sm:hover:-translate-y-1">
                  <Film className="w-4 h-4 sm:w-5 sm:h-5 text-orange-400 group-hover:scale-110 transition-transform" />
                  <div className="flex flex-col">
                    <span className="text-white font-black text-xs sm:text-sm leading-none drop-shadow-md">{movies.length}</span>
                    <span className="text-[9px] sm:text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">Films</span>
                  </div>
                </div>
              )}
              {genres.length > 0 && (
                <div className="group hidden sm:flex items-center gap-3 px-5 py-2.5 rounded-2xl backdrop-blur-md border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all cursor-default shadow-xl hover:-translate-y-1">
                  <Award className="w-5 h-5 text-purple-400 group-hover:scale-110 transition-transform" />
                  <div className="flex flex-col">
                    <span className="text-white font-black text-sm leading-none drop-shadow-md">{genres.length}</span>
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">Genres</span>
                  </div>
                </div>
              )}
              {costars.length > 0 && (
                <div className="group hidden sm:flex items-center gap-3 px-5 py-2.5 rounded-2xl backdrop-blur-md border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all cursor-default shadow-xl hover:-translate-y-1">
                  <Users className="w-5 h-5 text-pink-400 group-hover:scale-110 transition-transform" />
                  <div className="flex flex-col">
                    <span className="text-white font-black text-sm leading-none drop-shadow-md">{costars.length}</span>
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">Co-stars</span>
                  </div>
                </div>
              )}
              
              <div className="w-[1px] h-10 bg-white/10 mx-2 hidden md:block" />

              {/* Social */}
              {(person.instagram || person.website) && (
                <div className="flex gap-2 sm:gap-3">
                  {person.instagram && (
                    <a href={`https://instagram.com/${person.instagram.replace("@", "")}`}
                      target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center justify-center w-8 h-8 sm:w-11 sm:h-11 rounded-full backdrop-blur-md bg-pink-500/10 border border-pink-500/30 text-pink-400 hover:bg-pink-500/20 hover:-translate-y-1 transition-all shadow-[0_8px_20px_rgba(236,72,153,0.2)]">
                      <Instagram className="w-4 h-4 sm:w-5 sm:h-5" />
                    </a>
                  )}
                  {person.website && (
                    <a href={person.website} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center justify-center w-8 h-8 sm:w-11 sm:h-11 rounded-full backdrop-blur-md bg-white/5 border border-white/20 text-gray-300 hover:bg-white/10 hover:-translate-y-1 transition-all shadow-[0_8px_20px_rgba(0,0,0,0.3)]">
                      <Globe className="w-4 h-4 sm:w-5 sm:h-5" />
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-gray-500 pb-6"
          style={{ paddingTop: "clamp(12px, 3vw, 80px)" }} aria-label="Breadcrumb">
          <Link href="/" className="hover:text-orange-400 transition-colors">Home</Link>
          <ChevronRight className="w-3 h-3" />
          <Link href="/cast" className="hover:text-orange-400 transition-colors">Cast</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-gray-300">{person.name}</span>
        </nav>

        {/* ── Top Banner Ad ── */}
        <div className="mb-8">
          <DisplayAd slot="8191172163" format="horizontal" className="rounded-2xl border border-[#1f1f1f] bg-[#0d0d0d] p-2 overflow-hidden" />
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
              <InfoRow icon={Award}       label="Genres" value={genres.length ? genres.map(([g]) => g).join(", ") : undefined} />
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
                    { label: "Average",        value: String(movies.filter((m:any) => m.verdict === "Average").length), color: "text-yellow-400" },
                    { label: "Flops",          value: String(flops.length),  color: "text-red-400" },
                    { label: "Upcoming",       value: String(upcoming.length), color: "text-blue-400" },
                    ...(debutMovie?.releaseDate ? [{ label: "Active Since", value: String(new Date(debutMovie.releaseDate).getFullYear()), color: "text-purple-400" }] : []),
                    ...(genres.length > 0 ? [{ label: "Genres", value: String(genres.length), color: "text-orange-400" }] : []),
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
            
            {/* Sidebar Ad (Visible on all screen sizes, responsive) */}
            <DisplayAd slot="8191172163" format="auto" />

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
                <div 
                  className="prose prose-invert max-w-none prose-p:leading-relaxed prose-headings:font-display prose-headings:text-orange-50 prose-a:text-orange-400 prose-strong:text-orange-50 text-gray-300 text-justify"
                  dangerouslySetInnerHTML={{ __html: formatBioHtml(bio) }} 
                />
              </div>
            </section>

            {/* ── Main Content Ad ── */}
            <DisplayAd slot="8191172163" format="auto" />

            {/* ── Filmography ── */}
            {movies.length > 0 && (
              <section id="cast-filmography" aria-label={`${person.name} filmography`}>
                <SectionHeading icon={Film} title="Filmography" count={movies.length} />
                <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#242424] bg-[#0d0d0d]">
                        <th className="px-4 py-3 text-left text-[10px] font-bold text-orange-400/60 uppercase tracking-widest w-[40%]">Film</th>
                        <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-600 uppercase tracking-widest w-[20%]">Release Date</th>
                        <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-600 uppercase tracking-widest w-[20%]">Role</th>
                        <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-600 uppercase tracking-widest w-[20%]">Verdict</th>
                      </tr>
                    </thead>
                    <tbody>
                      {movies.map((m: any) => {
                        const entry = (m.cast || []).find((c: any) => String(c.castId) === String(person._id));
                        const style = vs(m.verdict);
                        const releaseDate = m.releaseDate ? fmtDate(m.releaseDate, m.releaseDatePrecision) : "TBA";
                        return (
                          <tr key={String(m._id)}
                            className="group border-b border-[#1a1a1a] last:border-0 hover:bg-orange-500/3 transition-colors">

                            {/* Poster + Title */}
                            <td className="px-4 py-3 align-middle">
                              <LoadingCard href={`/movie/${m.slug || String(m._id)}`}
                                className="flex items-center gap-3 group/link">
                                <div className="relative w-8 h-11 rounded-md overflow-hidden flex-shrink-0 border border-[#2a2a2a]">
                                  {m.posterUrl ? (
                                    <Image src={m.posterUrl} alt={m.title}
                                      fill className="object-cover" sizes="32px" />
                                  ) : (
                                    <div className="absolute inset-0 flex items-center justify-center text-base bg-[#1a1a1a]">🎬</div>
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-white group-hover/link:text-orange-400 transition-colors line-clamp-1">
                                    {m.title}
                                  </p>
                                  {m.genre?.[0] && (
                                    <p className="text-[10px] text-gray-600 mt-0.5">{m.genre[0]}</p>
                                  )}
                                </div>
                              </LoadingCard>
                            </td>

                            {/* Release Date */}
                            <td className="px-4 py-3 align-middle">
                              <span className="text-xs text-gray-400 font-medium">{releaseDate}</span>
                            </td>

                            {/* Role */}
                            <td className="px-4 py-3 align-middle">
                              <span className="text-[10px] font-bold text-orange-400/70 uppercase tracking-widest">
                                {entry?.role || entry?.type || rolesStr.split(",")[0] || "—"}
                              </span>
                            </td>

                            {/* Verdict */}
                            <td className="px-4 py-3 align-middle">
                              {m.verdict ? (
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${style.bg} ${style.text} ${style.border}`}>
                                  {m.verdict}
                                </span>
                              ) : (
                                <span className="text-[10px] text-gray-600">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
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
                                <LoadingCard key={String(m._id)} href={`/movie/${m.slug || String(m._id)}`}
                                  className="flex items-center gap-2 px-2.5 py-1 bg-[#0d0d0d] border border-[#1f1f1f] hover:border-orange-500/30 rounded-full text-xs text-white hover:text-orange-400 transition-all">
                                  {m.posterUrl && (
                                    <Image src={m.posterUrl} alt={`${m.title} Odia movie poster`} width={14} height={18}
                                      className="rounded-sm flex-shrink-0 object-cover" />
                                  )}
                                  <span className="font-medium">{m.title}</span>
                                  {m.verdict && m.verdict !== "Upcoming" && (
                                    <span className={`text-[9px] font-black ${style.text}`}>{m.verdict}</span>
                                  )}
                                </LoadingCard>
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
                    <a key={i} href={`https://youtube.com/watch?v=${t.ytId}`}
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
                    </a>
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

            {/* ── Blogs & Articles ── */}
            {blogsList.length > 0 && (
              <section aria-label={`Blog articles about ${person.name}`}>
                <SectionHeading icon={Newspaper} title={`Blogs & Articles — ${person.name}`} count={blogsList.length} />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {blogsList.map((b: any) => {
                    const CAT_COLORS: Record<string, string> = {
                      "Movie Review": "#c9973a", "Actor Spotlight": "#a78be8",
                      "Top 10": "#e8c87a", News: "#4acf82", Upcoming: "#5aaae8", General: "#e5799a",
                    };
                    const catColor = CAT_COLORS[b.category] || "#c9973a";
                    const cleanExcerpt = (b.excerpt || "")
                      .replace(/<[^>]+>/g, " ").replace(/\s{2,}/g, " ").trim();
                    const displayExcerpt = cleanExcerpt.length > 110
                      ? cleanExcerpt.slice(0, 110).trimEnd() + "…"
                      : cleanExcerpt;
                    return (
                      <Link
                        key={String(b._id)}
                        href={`/blog/${b.slug}`}
                        className="group flex flex-col bg-[#111] border border-[#1f1f1f] hover:border-orange-500/30 rounded-2xl overflow-hidden transition-all duration-200 hover:shadow-lg hover:shadow-orange-900/10"
                        title={`${b.title} — Ollypedia`}
                      >
                        {/* Cover image */}
                        <div className="relative w-full aspect-[16/9] bg-[#1a1a1a] flex-shrink-0 overflow-hidden">
                          {b.coverImage ? (
                            <Image
                              src={b.coverImage}
                              alt={b.title}
                              fill
                              sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 33vw"
                              className="object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-3xl bg-gradient-to-br from-[#1a1200] to-[#0a0a0a]">
                              ✍️
                            </div>
                          )}
                          {b.category && (
                            <span
                              className="absolute top-2 left-2 text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider"
                              style={{ background: catColor + "22", border: `1px solid ${catColor}55`, color: catColor }}
                            >
                              {b.category}
                            </span>
                          )}
                        </div>

                        {/* Card body */}
                        <div className="flex flex-col flex-1 p-3.5 gap-2">
                          <h3 className="text-sm font-bold text-white group-hover:text-orange-400 transition-colors line-clamp-2 leading-snug">
                            {b.title}
                          </h3>
                          {displayExcerpt && (
                            <p className="text-[11px] text-gray-500 leading-relaxed line-clamp-2">
                              {displayExcerpt}
                            </p>
                          )}

                          {/* Tags */}
                          {(b.tags?.length ?? 0) > 0 && (
                            <div className="flex flex-wrap gap-1 mt-auto pt-1">
                              {(b.tags as string[]).slice(0, 3).map((tag) => (
                                <span
                                  key={tag}
                                  className="text-[9px] px-1.5 py-0.5 rounded"
                                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)" }}
                                >
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Footer meta */}
                          <div className="flex items-center justify-between pt-2 border-t border-[#1f1f1f] mt-auto">
                            <div className="flex items-center gap-2 text-[10px] text-gray-600">
                              {b.createdAt && (
                                <span>{new Date(b.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                              )}
                              {b.readTime && (
                                <span className="flex items-center gap-0.5">
                                  <Clock className="w-2.5 h-2.5" />{b.readTime} min
                                </span>
                              )}
                            </div>
                            {(b.views ?? 0) > 0 && (
                              <span className="text-[10px] text-gray-600">👁 {Number(b.views).toLocaleString()}</span>
                            )}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>

                {/* SEO internal link */}
                <div className="mt-4 p-4 bg-[#0f0f0f] border border-[#1a1a1a] rounded-xl text-[11px] text-gray-500 leading-relaxed">
                  <strong className="text-gray-300">{person.name}</strong> features in multiple articles published
                  on Ollypedia — Odisha&apos;s complete Odia cinema encyclopedia. Browse movie reviews, actor
                  spotlights, box office reports and the latest Ollywood entertainment news.{" "}
                  <Link href="/blog" className="text-orange-400/80 hover:text-orange-400 underline transition-colors">
                    Explore all blogs →
                  </Link>
                </div>
              </section>
            )}

            {/* ══ SEO CONTENT BLOCK ══ */}
            <section aria-label={`${person.name} career information and FAQ`} className="space-y-5">

              {/* Detailed career editorial */}
              <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-6">
                <SectionHeading title={`${person.name} – Career & Contributions to Odia Cinema`} />
                <div className="space-y-3 text-gray-400 text-sm leading-relaxed">
                  {person.ai?.career ? (
                    <div dangerouslySetInnerHTML={{ __html: person.ai.career.replace(/\n/g, '<br/>') }} />
                  ) : (
                    <>
                      {(() => {
                        const seed = (person.name?.length || 0) + movies.length;
                        const v = seed % 3;
                        const rolePlural = rolesStr.toLowerCase().endsWith('s') ? 'es' : 's';
                        const filmPlural = movies.length !== 1 ? 's' : '';
                        
                        return (
                          <>
                            {v === 0 && (
                              <p>
                                <strong className="text-white">{person.name}</strong> is one of Ollywood's celebrated{" "}
                                <strong className="text-white">{rolesStr.toLowerCase()}{rolePlural}</strong>, having contributed
                                to <strong className="text-white">{movies.length} Odia film{filmPlural}</strong> in the{" "}
                                <strong className="text-white">Odia film industry</strong> (popularly known as{" "}
                                <strong className="text-white">Ollywood</strong>), headquartered in Bhubaneswar, Odisha.
                              </p>
                            )}
                            {v === 1 && (
                              <p>
                                Recognized as a highly talented <strong className="text-white">{rolesStr.toLowerCase()}</strong>,{" "}
                                <strong className="text-white">{person.name}</strong> has built an impressive portfolio of{" "}
                                <strong className="text-white">{movies.length} Odia film{filmPlural}</strong> within{" "}
                                <strong className="text-white">Ollywood</strong>, captivating audiences across Odisha and beyond.
                              </p>
                            )}
                            {v === 2 && (
                              <p>
                                <strong className="text-white">{person.name}</strong> stands out as a prominent figure in the{" "}
                                <strong className="text-white">Odia film industry</strong>. Over their career, they have worked as a{" "}
                                <strong className="text-white">{rolesStr.toLowerCase()}</strong> in{" "}
                                <strong className="text-white">{movies.length} Odia film{filmPlural}</strong>, cementing their legacy in Ollywood.
                              </p>
                            )}
                          </>
                        );
                      })()}

                      {costars.length > 0 && (
                        <p>
                          Throughout their career, <strong className="text-white">{person.name}</strong> has
                          shared screen presence with some of Ollywood's finest actors and actresses, including{" "}
                          {costars.slice(0, 3).map((c: any, i: number) => (
                            <span key={String(c.castId || i)}>
                              {c.castId
                                ? <Link href={`/cast/${String(c.castId)}`} className="text-orange-400 hover:text-orange-300 transition-colors">{c.name}</Link>
                                : <strong className="text-white">{c.name}</strong>}
                              {i < Math.min(costars.length, 3) - 1 ? ", " : ""}
                            </span>
                          ))}.
                          These on-screen partnerships have resonated strongly with Odia audiences.
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
                    </>
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
                        ? `${person.name} has been part of ${movies.length} Odia film${movies.length !== 1 ? "s" : ""} in Ollywood, spanning genres such as ${[...new Set(movies.flatMap((m: any) => m.genre || []))].slice(0, 3).join(", ") || "drama and action"}.`
                        : `${person.name} is associated with Ollywood. Stay tuned to Ollypedia for their latest updates.`,
                    },
                    {
                      q: `What is ${person.name}'s most popular Odia film?`,
                      a: movies.length > 0
                        ? `${person.name}'s notable Odia films include ${movies.slice(0, 3).map((m: any) => `"${m.title}"`).join(", ")}. Visit each movie page on Ollypedia for detailed cast, songs and review information.`
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