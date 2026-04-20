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
import { MovieCard }     from "@/components/movie/MovieCard";
import { StarRating }    from "@/components/ui/StarRating";
import { SongRowClient } from "@/components/movie/SongRowClient";
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

// ─── Static params ─────────────────────────────────────────────────────────
export async function generateStaticParams() {
  await connectDB();
  const movies = await Movie.find({}, "slug _id").sort({ releaseDate: -1 }).limit(200).lean();
  return movies.map((m: any) => ({ slug: m.slug || String(m._id) }));
}

// ─── Data helpers ─────────────────────────────────────────────────────────
async function getMovie(slug: string) {
  await connectDB();
  const isOid = /^[a-f0-9]{24}$/i.test(slug);
  const raw = isOid
    ? await Movie.findById(slug).populate("productionId", "name logo").lean()
    : await Movie.findOne({ slug }).populate("productionId", "name logo").lean();
  if (!raw) return null;
  return JSON.parse(JSON.stringify(raw));
}

async function getRelated(movie: any) {
  await connectDB();
  const raw = await Movie.find(
    { _id: { $ne: movie._id }, genre: { $in: movie.genre || [] } },
    "title slug posterUrl thumbnailUrl releaseDate genre verdict"
  ).limit(5).lean();
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

  const year      = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : "";
  const yearStr   = year ? ` (${year})` : "";
  const title     = `${movie.title}${yearStr} – Cast, Songs & Review | Ollypedia`;
  const description = (
    movie.synopsis?.slice(0, 155) ||
    `Complete information about the Odia film ${movie.title}${yearStr} — cast, songs, trailer, box office collection and reviews on Ollypedia.`
  );
  const image     = movie.posterUrl || movie.thumbnailUrl || "https://ollypedia.in/default.jpg";
  const canonical = `https://ollypedia.in/movie/${movie.slug || movie._id}`;

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
    year ? `${movie.title} ${year}` : null,
    year ? `${movie.title} odia movie ${year}` : null,
    movie.director ? `${movie.director} movie` : null,
    movie.director ? `${movie.director} odia film` : null,
    "Odia movie", "Ollywood", "Odia film", "Odia cinema",
    year ? `Odia movie ${year}` : null,
    ...(movie.genre || []).map((g: string) => `${g} Odia film`),
    ...(movie.cast  || []).slice(0, 3).map((c: any) => c.name).filter(Boolean),
    ...getMisspellings(movie.title),
  ].filter(Boolean) as string[];

  return {
    title, description, keywords,
    alternates: { canonical },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
    openGraph: {
      title, description, url: canonical, siteName: "Ollypedia",
      type: "video.movie",
      images: [{ url: image, width: 1200, height: 630, alt: movie.title }],
    },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

// ─── JSON-LD helpers ──────────────────────────────────────────────────────
function buildFaqJsonLd(movie: any, year: string | number, avgRating: number | null, songs: any[]) {
  const items = [
    {
      question: `What is ${movie.title} movie about?`,
      answer: movie.synopsis?.slice(0, 300) ||
        `${movie.title} is an Odia ${movie.genre?.join(", ") || "drama"} film${year ? ` released in ${year}` : ""}${movie.director ? `, directed by ${movie.director}` : ""}.`,
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
    <div className={`flex flex-col items-center justify-center rounded-xl px-2 sm:px-4 py-2.5 border text-center ${
      accent ? "bg-orange-500/10 border-orange-500/30" : "bg-[#111] border-[#1f1f1f]"
    }`}>
      <p className={`text-sm sm:text-base font-black font-display w-full truncate ${accent ? "text-orange-400" : "text-white"}`}>{value}</p>
      <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-0.5">{label}</p>
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

  const structuredData = [
    movieJsonLd(movie),
    breadcrumbJsonLd([
      { name: "Home",   url: "https://ollypedia.in/" },
      { name: "Movies", url: "https://ollypedia.in/movies" },
      { name: movie.title, url: canonical },
    ]),
    buildFaqJsonLd(movie, year, avgRating, songs),
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
                />
              </div>
              {movie.streamingOn && (
                <p className="mt-2 text-center text-[10px] text-gray-400 bg-[#1a1a1a] border border-[#2a2a2a] rounded-full px-2 py-0.5 truncate">
                  🎬 {movie.streamingOn}
                </p>
              )}
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
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5 sm:gap-2">
                {movie.releaseDate && (
                  <StatChip
                    label="Release"
                    value={new Date(movie.releaseDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  />
                )}
                {movie.runtime && <StatChip label="Runtime" value={movie.runtime} />}
                {movie.director && (
                  <div className="hidden md:flex flex-col items-center justify-center rounded-xl px-3 py-2.5 border border-[#1f1f1f] bg-[#111] text-center">
                    <p className="text-sm font-black text-white truncate w-full">{movie.director}</p>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-0.5">Director</p>
                  </div>
                )}
                {movie.verdict && (
                  <div className={`flex flex-col items-center justify-center rounded-xl px-3 py-2.5 border text-center ${vs.bg} ${vs.border}`}>
                    <p className={`text-sm sm:text-base font-black font-display ${vs.text}`}>{movie.verdict}</p>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-0.5">Verdict</p>
                  </div>
                )}
              </div>

              {/* Synopsis — only on md+ to avoid cramping mobile layout */}
              {movie.synopsis && (
                <p className="hidden md:block text-zinc-400 text-sm leading-relaxed line-clamp-2 max-w-2xl mt-3">
                  {movie.synopsis}
                </p>
              )}
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
              <InfoRow icon={Clapperboard} label="Director"      value={movie.director} />
              <InfoRow icon={User}         label="Producer"      value={movie.producer} />
              <InfoRow icon={DollarSign}   label="Budget"        value={movie.budget} />
              <InfoRow icon={Film}         label="Category"      value={movie.category} />
              <InfoRow icon={Star}         label="Content Rating" value={movie.contentRating} />
              {movie.productionId?.name && (
                <InfoRow icon={Film} label="Production" value={movie.productionId.name} />
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
                  ...(movie.director ? [{ label: `${movie.director} Films`, href: `/movies?director=${encodeURIComponent(movie.director)}` }] : []),
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
                <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-6">
                  <p className="text-gray-300 leading-relaxed text-base">{movie.synopsis}</p>
                  {/* SEO-rich context line */}
                  <p className="text-gray-500 text-sm mt-4 pt-4 border-t border-[#1f1f1f]">
                    <strong className="text-gray-400">{movie.title}</strong> is a{" "}
                    {(movie.genre || []).join(", ") || "Odia"} film
                    {year ? ` released in ${year}` : ""}{movie.director ? `, directed by ${movie.director}` : ""}
                    {movie.producer ? `, produced by ${movie.producer}` : ""}.
                    {movie.language ? ` Produced in ${movie.language} language for Ollywood audiences.` : " An Ollywood production."}
                  </p>
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

            {/* ── Cast & Crew ── */}
            {movie.cast?.length > 0 && (
              <section aria-label={`${movie.title} cast and crew`}>
                <SectionHeading icon={Users} title="Cast & Crew" count={movie.cast.length} />
                <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {movie.cast.map((member: any, i: number) => (
                    <Link key={i} href={`/cast/${member.castId}`}
                      className="group bg-[#111] border border-[#1f1f1f] hover:border-orange-500/30 rounded-xl p-3 flex items-center gap-3 transition-all hover:-translate-y-0.5">
                      <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0 border-2 border-[#2a2a2a] group-hover:border-orange-500/50 transition-colors">
                        <Image
                          src={member.photo || "/placeholder-person.svg"}
                          alt={`${member.name} in ${movie.title} – ${member.role || member.type || "cast"}`}
                          fill className="object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white line-clamp-1 group-hover:text-orange-400 transition-colors">{member.name}</p>
                        <p className="text-[11px] text-gray-500 line-clamp-1">{member.role || member.type}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

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

              {movie.reviews?.length > 0 ? (
                <div className="space-y-4 mb-6">
                  {movie.reviews.slice(0, 5).map((r: any, i: number) => (
                    <div key={i} className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-5">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-orange-500/15 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-orange-400" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-white">{r.user || "Anonymous"}</p>
                            {r.date && (
                              <p className="text-[10px] text-gray-600">{new Date(r.date).toLocaleDateString("en-IN")}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-2.5 py-1">
                          <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm font-bold text-white">{r.rating}</span>
                          <span className="text-gray-500 text-xs">/10</span>
                        </div>
                      </div>
                      <p className="text-gray-300 text-sm leading-relaxed">{r.text}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-6 mb-6 text-center">
                  <MessageSquare className="w-8 h-8 text-gray-700 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">No reviews yet. Be the first to review <strong className="text-gray-400">{movie.title}</strong>!</p>
                </div>
              )}

              <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-6">
                <h3 className="font-display font-bold text-lg text-white mb-4">Write a Review</h3>
                <ReviewForm movieId={String(movie._id)} />
              </div>
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
                    {year ? ` released in ${year}` : ""}{movie.director ? `, directed by ${movie.director}` : ""}
                    {movie.producer ? ` and produced by ${movie.producer}` : ""}.
                    {movie.language ? ` The film is in the ${movie.language} language` : " The film is in the Odia language"},
                    making it a part of the <strong className="text-white">Ollywood film industry</strong> — the Odia language cinema based in Bhubaneswar, Odisha.
                  </p>
                  {movie.synopsis && (
                    <p>
                      {movie.synopsis.length > 200 ? movie.synopsis.slice(0, 300) + "…" : movie.synopsis}
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
                </div>
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
                    ...(movie.director ? [{
                      q: `Who directed ${movie.title}?`,
                      a: `${movie.title} was directed by ${movie.director}${movie.producer ? `, produced by ${movie.producer}` : ""}${year ? ` and released in ${year}` : ""}.`,
                    }] : []),
                    {
                      q: `Is ${movie.title} available on OTT?`,
                      a: movie.streamingOn
                        ? `${movie.title} is available to stream on ${movie.streamingOn}.`
                        : `OTT streaming availability for ${movie.title} is yet to be confirmed. Check back on Ollypedia for updates.`,
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