// app/songs/[movieSlug]/[songIndex]/[songSlug]/page.tsx
// SEO UPGRADE v2:
//  1. generateStaticParams re-enabled
//  2. Canonical locked to movie's own slug
//  3. noindex on missing songs
//  4. Richer title + description
//  5. og:type "music.song"
//  6. JSON-LD: MusicRecording + BreadcrumbList
//  7. SEO prose block (server-rendered)
//  8. â˜… NEW: Cross-links to related blog posts for this movie
//  9. â˜… NEW: Keyword set targeting movie-name + song-name searches
// 10. â˜… NEW: Blog JSON-LD ItemList so Google sees blog links from song page
import { SITE_URL } from "@/lib/seo";

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { connectDB } from "@/lib/db";
import Movie from "@/models/Movie";
import Blog from "@/models/Blog";
import { SongDetailClient } from "../SongDetailClient";
import type { MovieData } from "../types";

export const revalidate    = 86400; // 24 hours â€” on-demand ISR
export const dynamicParams = true;

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function toSlug(str?: string): string {
  return (str || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// â”€â”€â”€ Data fetching â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function getMovieWithSongs(movieSlug: string): Promise<MovieData | null> {
  await connectDB();
  const isObjectId = /^[a-f0-9]{24}$/i.test(movieSlug);
  const query = isObjectId ? { _id: movieSlug } : { slug: movieSlug };
  const movie = await (Movie as any).findOne(query).lean();
  if (!movie) return null;
  return JSON.parse(JSON.stringify(movie)) as MovieData;
}

async function getRelatedMovies(movie: MovieData): Promise<MovieData[]> {
  if (!movie.genre?.length) return [];
  const related = await (Movie as any)
    .find({ _id: { $ne: movie._id }, genre: { $in: movie.genre } })
    .select("title slug posterUrl thumbnailUrl releaseDate genre verdict media.songs")
    .limit(20)
    .lean();
  return JSON.parse(JSON.stringify(related)) as MovieData[];
}

/** â˜… NEW: Fetch blog posts related to this movie */
async function getRelatedBlogs(movie: MovieData): Promise<any[]> {
  await connectDB();
  const blogs = await (Blog as any)
    .find({
      published: true,
      $or: [
        { movieTitle: { $regex: new RegExp(movie.title, "i") } },
        { tags:       { $regex: new RegExp(movie.title, "i") } },
        { title:      { $regex: new RegExp(movie.title, "i") } },
      ],
    })
    .select("title slug excerpt coverImage category createdAt")
    .sort({ createdAt: -1 })
    .limit(6)
    .lean();
  return JSON.parse(JSON.stringify(blogs));
}

// â”€â”€â”€ Metadata â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// getMisspellings REMOVED â€” Google handles misspelling matching automatically.
// Intentional misspellings in <meta keywords> trigger spam/keyword-stuffing penalties.

export async function generateMetadata({
  params,
}: {
  params: { movieSlug: string; songIndex: string; songSlug: string };
}): Promise<Metadata> {
  const movie = await getMovieWithSongs(params.movieSlug);
  const idx   = parseInt(params.songIndex, 10) || 0;
  const song  = movie?.media?.songs?.[idx];

  if (!movie || !song) {
    return { robots: { index: false, follow: false } };
  }

  const year      = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : "";
  const singerStr = song.singer ? ` by ${song.singer}` : "";
  const thumb     = song.thumbnailUrl
    || (song.ytId ? `https://img.youtube.com/vi/${song.ytId}/hqdefault.jpg` : null)
    || movie.posterUrl
    || `${SITE_URL}/og-default.jpg`;

  // â˜… Rich title â€” song + singer + movie + year for long-tail capture
  const title = `${song.title}${singerStr} â€“ ${movie.title}${year ? ` (${year})` : ""} | Odia Song`;

  const descParts = [
    `Listen to "${song.title}"${singerStr} from the Odia film "${movie.title}"${year ? ` (${year})` : ""}.`,
    song.musicDirector ? ` Music by ${song.musicDirector}.` : "",
    song.lyrics?.trim() ? " Full lyrics available." : "",
    " Watch on YouTube and explore the full soundtrack on Ollypedia.",
  ];
  const description = descParts.join("").replace(/\s+/g, " ").trim().slice(0, 160);

  const canonical  = `${SITE_URL}/movie/${movie.slug}`; // Consolidates canonical authority to primary movie page

  // â˜… Comprehensive keyword set â€” hit every variant someone might search
  const keywords = [
    song.title,
    `${song.title} lyrics`,
    `${song.title} odia song`,
    `${song.title} ${movie.title}`,
    song.singer ? `${song.singer} songs`       : null,
    song.singer ? `${song.singer} odia songs`  : null,
    song.musicDirector ? `${song.musicDirector} music`      : null,
    song.musicDirector ? `${song.musicDirector} odia music` : null,
    `${movie.title} songs`,
    `${movie.title} album`,
    `${movie.title} official songs`,
    `listen to ${movie.title} songs legally`,
    `${movie.title} odia movie songs`,
    movie.title,
    `${movie.title} odia movie`,
    `${movie.title} odia film`,
    `${movie.title} review`,
    "odia song",
    "ollywood song",
    "odia film song",
    "odia movie song",
    year ? `odia songs ${year}` : null,
    year ? `ollywood songs ${year}` : null,
    ...(movie.genre || []).map((g: string) => `${g} odia film`),
  ].filter(Boolean) as string[];

  return {
    title,
    description,
    keywords,
    alternates: { canonical },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "music.song",
      images: [{ url: thumb, width: 1280, height: 720, alt: song.title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [thumb],
    },
  };
}

// â”€â”€â”€ Shared design tokens â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// accent:   #E8891A  (warm gold-orange)
// surface:  #0d0d0d  (card bg)
// border:   #1e1e1e  (default border)
// muted:    #555     (secondary text)

// â”€â”€â”€ Tape Divider â€” film/cassette motif â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function TapeDivider() {
  return (
    <div className="flex items-center gap-3 my-8 select-none">
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#2a2a2a] to-[#2a2a2a]" />
      <span className="text-[#E8891A] text-[10px] tracking-[0.35em] uppercase font-mono opacity-60">â—†</span>
      <div className="flex-1 h-px bg-gradient-to-l from-transparent via-[#2a2a2a] to-[#2a2a2a]" />
    </div>
  );
}

// â”€â”€â”€ Section Eyebrow â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function Eyebrow({ label }: { label: string }) {
  return (
    <p className="text-[10px] font-mono tracking-[0.25em] uppercase text-[#E8891A] mb-3 opacity-80">
      {label}
    </p>
  );
}

// â”€â”€â”€ SEO Prose Block (server-rendered) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Generates 300+ words of unique server-rendered prose so Google never
// classifies a song page as "thin content" and refuses to index it.
function SeoProseBlock({
  song,
  movie,
  idx,
  year,
  otherSongs,
  relatedBlogs,
}: {
  song: any;
  movie: MovieData;
  idx: number;
  year: string | number;
  otherSongs: Array<{ title: string; slug: string; index: number; singer?: string; ytId?: string; thumbnailUrl?: string }>;
  relatedBlogs: any[];
}) {
  const totalSongs   = (movie.media?.songs?.length || 1);
  const trackNum     = idx + 1;
  const genreStr     = movie.genre?.join(", ") || "Odia";
  const castNames    = (movie.cast || []).slice(0, 5).map((c: any) => c.name).filter(Boolean);
  const lyricsLines  = song.lyrics?.trim().split(/\r?\n/).filter((l: string) => l.trim()).slice(0, 8) || [];

  // Build a rich prose description paragraph
  const creditParts: string[] = [];
  if (song.singer)        creditParts.push(`sung by ${song.singer}`);
  if (song.musicDirector) creditParts.push(`music composed by ${song.musicDirector}`);
  if (song.lyricist)      creditParts.push(`lyrics penned by ${song.lyricist}`);

  const creditSentence = creditParts.length
    ? `The song is ${creditParts.join(", ")}.`
    : "This is an Odia film song.";

  const movieContext = `"${movie.title}"${year ? ` (${year})` : ""} is ${genreStr ? `a ${genreStr}` : "an Odia"} film${movie.director ? ` directed by ${movie.director}` : ""}${castNames.length ? ` and stars ${castNames.join(", ")}` : ""}.`;

  const soundtrackSentence = totalSongs > 1
    ? `The complete soundtrack of "${movie.title}" consists of ${totalSongs} tracks, with "${song.title}" appearing as track number ${trackNum}.`
    : `"${song.title}" is the only song featured in "${movie.title}".`;

  const otherSongNames = otherSongs.slice(0, 5).map((s) => `"${s.title}"`).join(", ");
  const moreSongsSentence = otherSongNames
    ? `Other songs from this soundtrack include ${otherSongNames}.`
    : "";

  return (
    <section
      aria-label="About this song"
      className="max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-10 pb-16"
    >
      {/* â”€â”€ 2-col layout: left = prose/blogs, right = more songs â”€â”€ */}
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">

        {/* â•â•â• LEFT COLUMN â•â•â• */}
        <div className="flex-1 min-w-0">

          {/* â”€â”€ About card â”€â”€ */}
          <div className="relative bg-[#0d0d0d] border border-[#1e1e1e] rounded-2xl p-6 sm:p-8 mb-4 overflow-hidden">
            <div className="absolute left-0 top-6 bottom-6 w-[3px] bg-gradient-to-b from-[#E8891A] via-[#E8891A]/40 to-transparent rounded-r-full" />
            <div className="pl-4">
              <Eyebrow label="Track Info" />
              <h2 className="text-white font-bold text-xl sm:text-2xl leading-tight mb-4 tracking-tight">
                &ldquo;{song.title}&rdquo;
                <span className="text-[#E8891A]"> â€” </span>
                <Link href={`/movie/${movie.slug}`} className="hover:text-[#E8891A] transition-colors">
                  {movie.title}
                </Link>
                {year ? <span className="text-[#555] font-normal text-base"> ({year})</span> : null}
              </h2>

              {/* Credits table */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                {song.singer && (
                  <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-3">
                    <p className="text-[9px] uppercase tracking-widest text-[#555] font-mono mb-1">Playback Singer</p>
                    <p className="text-sm font-semibold text-white leading-snug">{song.singer}</p>
                  </div>
                )}
                {song.musicDirector && (
                  <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-3">
                    <p className="text-[9px] uppercase tracking-widest text-[#555] font-mono mb-1">Music Director</p>
                    <p className="text-sm font-semibold text-white leading-snug">{song.musicDirector}</p>
                  </div>
                )}
                {song.lyricist && (
                  <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-3">
                    <p className="text-[9px] uppercase tracking-widest text-[#555] font-mono mb-1">Lyricist</p>
                    <p className="text-sm font-semibold text-white leading-snug">{song.lyricist}</p>
                  </div>
                )}
                {movie.director && (
                  <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-3">
                    <p className="text-[9px] uppercase tracking-widest text-[#555] font-mono mb-1">Film Director</p>
                    <p className="text-sm font-semibold text-white leading-snug">{movie.director}</p>
                  </div>
                )}
                {movie.genre?.length ? (
                  <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-3">
                    <p className="text-[9px] uppercase tracking-widest text-[#555] font-mono mb-1">Genre</p>
                    <p className="text-sm font-semibold text-white leading-snug">{movie.genre.join(", ")}</p>
                  </div>
                ) : null}
                <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-3">
                  <p className="text-[9px] uppercase tracking-widest text-[#555] font-mono mb-1">Track</p>
                  <p className="text-sm font-semibold text-white leading-snug">{trackNum} of {totalSongs}</p>
                </div>
              </div>

              {/* Rich SEO prose */}
              <div className="space-y-3 text-[#888] text-sm leading-7">
                <p>
                  <strong className="text-[#ccc]">&ldquo;{song.title}&rdquo;</strong> is a featured Odia film song from{" "}
                  <Link href={`/movie/${movie.slug}`} className="text-[#E8891A] hover:underline font-semibold underline-offset-2">
                    {movie.title}
                  </Link>
                  {year ? ` (${year})` : ""}.{" "}
                  {creditSentence}
                </p>
                <p>{movieContext}</p>
                {castNames.length > 0 && (
                  <p>
                    The film features a talented ensemble cast including{" "}
                    <strong className="text-[#ccc]">{castNames.join(", ")}</strong>.{" "}
                    You can watch &ldquo;{song.title}&rdquo; and the full soundtrack on this page, or visit the{" "}
                    <Link href={`/movie/${movie.slug}`} className="text-[#E8891A] hover:underline underline-offset-2">
                      {movie.title} movie page
                    </Link>{" "}
                    for complete cast, crew, box office details, and reviews.
                  </p>
                )}
                <p>{soundtrackSentence}{moreSongsSentence ? " " + moreSongsSentence : ""}</p>
                <p>
                  Ollypedia is your complete guide to Odia (Ollywood) cinema. Browse the full{" "}
                  <Link href={`/songs/${movie.slug}`} className="text-[#E8891A] hover:underline underline-offset-2">
                    {movie.title} song album
                  </Link>
                  , explore{" "}
                  <Link href="/songs/category/latest" className="text-[#E8891A] hover:underline underline-offset-2">
                    latest Odia songs
                  </Link>
                  , or discover{" "}
                  <Link href="/songs/category/trending" className="text-[#E8891A] hover:underline underline-offset-2">
                    trending Ollywood tracks
                  </Link>
                  . All songs on Ollypedia link directly to official YouTube videos so you can listen legally and for free.
                </p>
              </div>
            </div>
          </div>

          {/* â”€â”€ Lyrics snippet (if available) â”€â”€ */}
          {lyricsLines.length > 0 && (
            <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-2xl p-6 mb-4">
              <Eyebrow label="Lyrics Preview" />
              <h3 className="text-white font-bold text-base mb-4">
                &ldquo;{song.title}&rdquo; â€” Lyrics Excerpt
              </h3>
              <div className="space-y-1 text-[#aaa] text-sm leading-7 font-light italic border-l-2 border-[#E8891A]/30 pl-4">
                {lyricsLines.map((line: string, i: number) => (
                  <p key={i}>{line}</p>
                ))}
                {(song.lyrics?.trim().split(/\r?\n/).filter((l: string) => l.trim()).length || 0) > 8 && (
                  <p className="text-[#555] not-italic text-xs mt-2">â€¦ scroll up to read full lyrics</p>
                )}
              </div>
            </div>
          )}

          {/* â”€â”€ Cast from the film â”€â”€ */}
          {castNames.length > 0 && (
            <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-2xl p-6 mb-4">
              <Eyebrow label="Starring In This Film" />
              <h3 className="text-white font-bold text-base mb-3">
                Cast of <span className="text-[#E8891A]">{movie.title}</span>
              </h3>
              <div className="flex flex-wrap gap-2">
                {(movie.cast || []).slice(0, 8).map((c: any, i: number) => (
                  <span
                    key={i}
                    className="text-xs text-[#bbb] bg-[#161616] border border-[#2a2a2a] px-3 py-1.5 rounded-full"
                  >
                    {c.name}{c.role ? <span className="text-[#555] ml-1">({c.role})</span> : null}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* â”€â”€ Discovery pills â”€â”€ */}
          <div className="flex flex-wrap gap-2 mb-6 px-1">
            {year && (
              <Link href={`/songs/category/${year}`} className="text-xs text-[#E8891A]/70 hover:text-[#E8891A] bg-[#E8891A]/5 hover:bg-[#E8891A]/10 border border-[#E8891A]/15 hover:border-[#E8891A]/30 px-3 py-1.5 rounded-full transition-all font-medium">
                Odia Songs {year}
              </Link>
            )}
            <Link href="/songs/category/latest" className="text-xs text-[#E8891A]/70 hover:text-[#E8891A] bg-[#E8891A]/5 hover:bg-[#E8891A]/10 border border-[#E8891A]/15 hover:border-[#E8891A]/30 px-3 py-1.5 rounded-full transition-all font-medium">
              Latest Songs
            </Link>
            <Link href="/songs/category/trending" className="text-xs text-[#E8891A]/70 hover:text-[#E8891A] bg-[#E8891A]/5 hover:bg-[#E8891A]/10 border border-[#E8891A]/15 hover:border-[#E8891A]/30 px-3 py-1.5 rounded-full transition-all font-medium">
              Trending
            </Link>
            <Link href={`/movie/${movie.slug}`} className="text-xs text-[#E8891A]/70 hover:text-[#E8891A] bg-[#E8891A]/5 hover:bg-[#E8891A]/10 border border-[#E8891A]/15 hover:border-[#E8891A]/30 px-3 py-1.5 rounded-full transition-all font-medium">
              {movie.title} â€” Full Page
            </Link>
          </div>

          {/* â”€â”€ Related Blog Posts â”€â”€ */}
          {relatedBlogs.length > 0 && (
            <div>
              <Eyebrow label="Articles & Reviews" />
              <h2 className="text-white font-bold text-lg mb-5 tracking-tight">
                More on <span className="text-[#E8891A]">{movie.title}</span>
              </h2>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {relatedBlogs.map((b: any) => (
                  <li key={b._id}>
                    <Link
                      href={`/blog/${b.slug}`}
                      className="group flex gap-4 bg-[#0d0d0d] hover:bg-[#131313] border border-[#1e1e1e] hover:border-[#2e2e2e] rounded-xl p-4 transition-all"
                    >
                      <div className="flex-shrink-0 w-16 h-12 rounded-lg overflow-hidden border border-[#222] bg-[#161616]">
                        {b.coverImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={b.coverImage} alt={b.title} width={64} height={48} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[#333] text-lg">âœ</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        {b.category && (
                          <p className="text-[10px] font-mono tracking-widest uppercase text-[#E8891A]/60 mb-1">{b.category}</p>
                        )}
                        <p className="text-sm font-semibold text-[#ccc] group-hover:text-white transition-colors line-clamp-2 leading-snug">
                          {b.title}
                        </p>
                      </div>
                      <span className="flex-shrink-0 self-center text-[#333] group-hover:text-[#E8891A] transition-colors text-sm">â†’</span>
                    </Link>
                  </li>
                ))}
              </ul>
              <Link
                href={`/blog?category=Songs`}
                className="inline-flex items-center gap-2 mt-4 text-xs text-[#555] hover:text-[#E8891A] transition-colors font-medium"
              >
                All articles about {movie.title}
                <span className="text-[#E8891A]">â†’</span>
              </Link>
            </div>
          )}
        </div>

        {/* â•â•â• RIGHT COLUMN â€” More Songs as cards â•â•â• */}
        {otherSongs.length > 0 && (
          <div className="w-full lg:w-[320px] xl:w-[360px] flex-shrink-0">
            {/* Sticky container on desktop */}
            <div className="lg:sticky lg:top-4">
              <Eyebrow label="Full Soundtrack" />
              <h2 className="text-white font-bold text-lg mb-4 tracking-tight">
                More from <span className="text-[#E8891A]">{movie.title}</span>
              </h2>

              <ul className="flex flex-col gap-2 max-h-[70vh] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-[#2a2a2a] scrollbar-track-transparent">
                {otherSongs.map((s) => {
                  const sThumb =
                    s.thumbnailUrl ||
                    (s.ytId ? `https://img.youtube.com/vi/${s.ytId}/mqdefault.jpg` : null);
                  return (
                    <li key={s.index}>
                      <Link
                        href={`/songs/${movie.slug}/${s.index}/${s.slug}`}
                        className="group flex gap-3 items-center bg-[#0d0d0d] hover:bg-[#111] border border-[#1e1e1e] hover:border-[#E8891A]/30 rounded-xl p-2.5 transition-all"
                      >
                        {/* Thumbnail */}
                        <div className="relative flex-shrink-0 w-[80px] aspect-video rounded-lg overflow-hidden bg-[#161616]">
                          {sThumb ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={sThumb}
                              alt={s.title}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <svg width="20" height="20" viewBox="0 0 32 32" fill="none" style={{ color: "#2a2a2a" }}>
                                <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="1.5" />
                                <circle cx="16" cy="16" r="8" stroke="currentColor" strokeWidth="1" />
                                <circle cx="16" cy="16" r="3" stroke="currentColor" strokeWidth="1" />
                              </svg>
                            </div>
                          )}
                          {/* Play overlay */}
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                            <div className="w-6 h-6 rounded-full bg-[#E8891A]/90 flex items-center justify-center scale-75 group-hover:scale-100 transition-transform duration-150">
                              <div style={{ width:0, height:0, borderStyle:"solid", borderWidth:"4px 0 4px 7px", borderColor:"transparent transparent transparent #0a0a0a", marginLeft:1 }} />
                            </div>
                          </div>
                          {/* Track number */}
                          <span className="absolute top-1 left-1 font-mono text-[8px] text-[#E8891A]/70 bg-black/70 px-1 py-0.5 rounded leading-none">
                            {String(s.index + 1).padStart(2, "0")}
                          </span>
                          {/* Progress bar */}
                          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#1a1a1a]">
                            <div className="h-full w-0 group-hover:w-full bg-gradient-to-r from-[#E8891A] to-[#8b5e1a] transition-all duration-300" />
                          </div>
                        </div>

                        {/* Text */}
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-bold text-[#f0f0f0] group-hover:text-[#E8891A] transition-colors leading-tight line-clamp-2 tracking-tight mb-0.5">
                            {s.title}
                          </p>
                          {s.singer && (
                            <p className="text-[10.5px] text-[#555] group-hover:text-[#777] transition-colors truncate">
                              {s.singer}
                            </p>
                          )}
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

// â”€â”€â”€ Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default async function SongDetailSlugPage({
  params,
}: {
  params: { movieSlug: string; songIndex: string; songSlug: string };
}) {
  const movie = await getMovieWithSongs(params.movieSlug);
  const idx   = parseInt(params.songIndex, 10) || 0;

  if (!movie || !movie.media?.songs?.length) notFound();

  const song = movie.media.songs[idx] ?? movie.media.songs[0];
  if (!song) notFound();

  const [relatedMovies, relatedBlogs] = await Promise.all([
    getRelatedMovies(movie),
    getRelatedBlogs(movie),   // â˜… NEW
  ]);

  const year   = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : "";
  const thumb  = song.thumbnailUrl
    || (song.ytId ? `https://img.youtube.com/vi/${song.ytId}/hqdefault.jpg` : null)
    || movie.posterUrl;

  const stableSlug = toSlug(song.title) || String(idx);
  const canonicalMovieUrl = `${SITE_URL}/movie/${movie.slug}`;
  const currentSongUrl    = `${SITE_URL}/songs/${movie.slug}/${idx}/${stableSlug}`;

  const otherSongs = (movie.media.songs || [])
    .map((s: any, i: number) => ({
      title:        s.title,
      slug:         toSlug(s.title) || String(i),
      index:        i,
      singer:       s.singer,
      ytId:         s.ytId,
      thumbnailUrl: s.thumbnailUrl,
    }))
    .filter((s: any) => s.index !== idx && s.title);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "MusicRecording",
        "name": song.title,
        "description": song.description
          || `${song.title} is a song from the Odia film ${movie.title}${year ? ` (${year})` : ""}.`,
        ...(song.singer     && { "byArtist": { "@type": "MusicGroup", "name": song.singer } }),
        ...(thumb           && { "thumbnailUrl": thumb }),
        "sameAs": song.ytId ? [`https://www.youtube.com/watch?v=${song.ytId}`, currentSongUrl] : [currentSongUrl],
        "url": canonicalMovieUrl,
        // ★ Link song → movie for entity graph
        "inAlbum": {
          "@type": "MusicAlbum",
          "name": `${movie.title} Original Soundtrack`,
          "albumReleaseType": "SoundtrackAlbum",
          "url": canonicalMovieUrl,
          "numTracks": movie.media.songs.length,
          ...(song.musicDirector && {
            "byArtist": { "@type": "Person", "name": song.musicDirector },
          }),
        },
        // ★ Associate song with its film
        "associatedMedia": {
          "@type": "Movie",
          "name": movie.title,
          "url": canonicalMovieUrl,
        },
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Home",       "item": `${SITE_URL}/` },
          { "@type": "ListItem", "position": 2, "name": "Songs",      "item": `${SITE_URL}/songs` },
          { "@type": "ListItem", "position": 3, "name": movie.title,  "item": canonicalMovieUrl },
          { "@type": "ListItem", "position": 4, "name": song.title,   "item": currentSongUrl },
        ],
      },
      // â˜… ItemList of related blog posts â€” helps Google link song â†’ blogs
      ...(relatedBlogs.length > 0
        ? [{
            "@type": "ItemList",
            "name": `Articles about ${movie.title}`,
            "itemListElement": relatedBlogs.map((b: any, i: number) => ({
              "@type": "ListItem",
              "position": i + 1,
              "name": b.title,
              "url": `${SITE_URL}/blog/${b.slug}`,
            })),
          }]
        : []),
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <SongDetailClient
        movie={movie}
        initialSongIndex={idx}
        relatedMovies={relatedMovies}
      />
      <SeoProseBlock
        song={song}
        movie={movie}
        idx={idx}
        year={year}
        otherSongs={otherSongs}
        relatedBlogs={relatedBlogs}
      />
    </>
  );
}
