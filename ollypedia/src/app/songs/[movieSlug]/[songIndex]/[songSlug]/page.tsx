// app/songs/[movieSlug]/[songIndex]/[songSlug]/page.tsx
// SEO UPGRADE v2:
//  1. generateStaticParams re-enabled
//  2. Canonical locked to movie's own slug
//  3. noindex on missing songs
//  4. Richer title + description
//  5. og:type "music.song"
//  6. JSON-LD: MusicRecording + BreadcrumbList
//  7. SEO prose block (server-rendered)
//  8. ★ NEW: Cross-links to related blog posts for this movie
//  9. ★ NEW: Keyword set targeting movie-name + song-name searches
// 10. ★ NEW: Blog JSON-LD ItemList so Google sees blog links from song page
import { SITE_URL } from "@/lib/seo";

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { connectDB } from "@/lib/db";
import Movie from "@/models/Movie";
import Blog from "@/models/Blog";
import { SongDetailClient } from "../SongDetailClient";
import type { MovieData } from "../types";

export const revalidate    = 3600;
export const dynamicParams = true;

// ─── Helpers ───────────────────────────────────────────────────
function toSlug(str?: string): string {
  return (str || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// ─── Static params ─────────────────────────────────────────────
export async function generateStaticParams() {
  await connectDB();
  const rows: { movieSlug: string; songIndex: string; songSlug: string }[] = [];
  const movies = await (Movie as any)
    .find({ "media.songs.0": { $exists: true } }, "slug media.songs.title")
    .sort({ releaseDate: -1 })
    .limit(20)
    .lean();
  for (const m of movies) {
    const songs = m.media?.songs || [];
    for (let i = 0; i < songs.length && rows.length < 100; i++) {
      rows.push({
        movieSlug: m.slug || String(m._id),
        songIndex: String(i),
        songSlug:  toSlug(songs[i]?.title) || String(i),
      });
    }
    if (rows.length >= 100) break;
  }
  return rows;
}

// ─── Data fetching ─────────────────────────────────────────────
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

/** ★ NEW: Fetch blog posts related to this movie */
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

// ─── Metadata ─────────────────────────────────────────────────

// getMisspellings REMOVED — Google handles misspelling matching automatically.
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

  // ★ Rich title — song + singer + movie + year for long-tail capture
  const title = `${song.title}${singerStr} – ${movie.title}${year ? ` (${year})` : ""} | Odia Song`;

  const descParts = [
    `Listen to "${song.title}"${singerStr} from the Odia film "${movie.title}"${year ? ` (${year})` : ""}.`,
    song.musicDirector ? ` Music by ${song.musicDirector}.` : "",
    song.lyrics?.trim() ? " Full lyrics available." : "",
    " Watch on YouTube and explore the full soundtrack on Ollypedia.",
  ];
  const description = descParts.join("").replace(/\s+/g, " ").trim().slice(0, 160);

  const stableSlug = toSlug(song.title) || String(idx);
  const canonical  = `${SITE_URL}/songs/${movie.slug}/${idx}/${stableSlug}`;

  // ★ Comprehensive keyword set — hit every variant someone might search
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

// ─── Shared design tokens ─────────────────────────────────────
// accent:   #E8891A  (warm gold-orange)
// surface:  #0d0d0d  (card bg)
// border:   #1e1e1e  (default border)
// muted:    #555     (secondary text)

// ─── Tape Divider — film/cassette motif ───────────────────────
function TapeDivider() {
  return (
    <div className="flex items-center gap-3 my-8 select-none">
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#2a2a2a] to-[#2a2a2a]" />
      <span className="text-[#E8891A] text-[10px] tracking-[0.35em] uppercase font-mono opacity-60">◆</span>
      <div className="flex-1 h-px bg-gradient-to-l from-transparent via-[#2a2a2a] to-[#2a2a2a]" />
    </div>
  );
}

// ─── Section Eyebrow ──────────────────────────────────────────
function Eyebrow({ label }: { label: string }) {
  return (
    <p className="text-[10px] font-mono tracking-[0.25em] uppercase text-[#E8891A] mb-3 opacity-80">
      {label}
    </p>
  );
}

// ─── SEO Prose Block (server-rendered) ────────────────────────
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
  return (
    <section
      aria-label="About this song"
      className="max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-10 pb-16"
    >
      {/* ── 2-col layout: left = prose/blogs, right = more songs ── */}
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">

        {/* ═══ LEFT COLUMN ═══ */}
        <div className="flex-1 min-w-0">

          {/* ── About card ── */}
          <div className="relative bg-[#0d0d0d] border border-[#1e1e1e] rounded-2xl p-6 sm:p-8 mb-4 overflow-hidden">
            <div className="absolute left-0 top-6 bottom-6 w-[3px] bg-gradient-to-b from-[#E8891A] via-[#E8891A]/40 to-transparent rounded-r-full" />
            <div className="pl-4">
              <Eyebrow label="Track Info" />
              <h2 className="text-white font-bold text-xl sm:text-2xl leading-tight mb-4 tracking-tight">
                &ldquo;{song.title}&rdquo;
                <span className="text-[#E8891A]"> — </span>
                <Link href={`/movie/${movie.slug}`} className="hover:text-[#E8891A] transition-colors">
                  {movie.title}
                </Link>
                {year ? <span className="text-[#555] font-normal text-base"> ({year})</span> : null}
              </h2>

              {/* Metadata pills */}
              <div className="flex flex-wrap gap-2 mb-5">
                {song.singer && (
                  <span className="inline-flex items-center gap-1.5 bg-[#161616] border border-[#2a2a2a] text-[#ccc] text-xs px-3 py-1.5 rounded-full">
                    <span className="text-[#E8891A]">♪</span> {song.singer}
                  </span>
                )}
                {song.musicDirector && (
                  <span className="inline-flex items-center gap-1.5 bg-[#161616] border border-[#2a2a2a] text-[#ccc] text-xs px-3 py-1.5 rounded-full">
                    <span className="text-[#E8891A]">♬</span> {song.musicDirector}
                  </span>
                )}
                {song.lyricist && (
                  <span className="inline-flex items-center gap-1.5 bg-[#161616] border border-[#2a2a2a] text-[#ccc] text-xs px-3 py-1.5 rounded-full">
                    <span className="text-[#E8891A]">✍</span> {song.lyricist}
                  </span>
                )}
                {movie.director && (
                  <span className="inline-flex items-center gap-1.5 bg-[#161616] border border-[#2a2a2a] text-[#ccc] text-xs px-3 py-1.5 rounded-full">
                    <span className="text-[#E8891A]">🎬</span> {movie.director}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 bg-[#161616] border border-[#2a2a2a] text-[#555] text-xs px-3 py-1.5 rounded-full font-mono">
                  Track {idx + 1} / {movie.media?.songs?.length || 1}
                </span>
              </div>

              {/* Prose */}
              <p className="text-[#888] text-sm leading-7">
                &ldquo;{song.title}&rdquo;
                {song.singer && (
                  <> is sung by <strong className="text-[#ddd] font-semibold">{song.singer}</strong></>
                )}
                {!song.singer && " is an Odia film song"} from the{" "}
                {movie.genre?.length ? <>{movie.genre.join(", ")} </> : null}
                Odia film{" "}
                <Link href={`/movie/${movie.slug}`} className="text-[#E8891A] hover:underline font-semibold underline-offset-2">
                  {movie.title}
                </Link>
                {year ? ` (${year})` : ""}.
                {song.musicDirector && (
                  <> Music composed by <strong className="text-[#ddd] font-semibold">{song.musicDirector}</strong>.</>
                )}
                {song.lyricist && (
                  <> Lyrics by <strong className="text-[#ddd] font-semibold">{song.lyricist}</strong>.</>
                )}
                {song.lyrics?.trim() && (
                  <> Full lyrics available — scroll up to read with line-by-line sync.</>
                )}
              </p>
            </div>
          </div>

          {/* ── Discovery pills ── */}
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
              {movie.title} — Full Page
            </Link>
          </div>

          {/* ── Related Blog Posts ── */}
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
                          <div className="w-full h-full flex items-center justify-center text-[#333] text-lg">✍</div>
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
                      <span className="flex-shrink-0 self-center text-[#333] group-hover:text-[#E8891A] transition-colors text-sm">→</span>
                    </Link>
                  </li>
                ))}
              </ul>
              <Link
                href={`/blog?movie=${encodeURIComponent(movie.title)}`}
                className="inline-flex items-center gap-2 mt-4 text-xs text-[#555] hover:text-[#E8891A] transition-colors font-medium"
              >
                All articles about {movie.title}
                <span className="text-[#E8891A]">→</span>
              </Link>
            </div>
          )}
        </div>

        {/* ═══ RIGHT COLUMN — More Songs as cards ═══ */}
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


// ─── Page ─────────────────────────────────────────────────────
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
    getRelatedBlogs(movie),   // ★ NEW
  ]);

  const year   = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : "";
  const thumb  = song.thumbnailUrl
    || (song.ytId ? `https://img.youtube.com/vi/${song.ytId}/hqdefault.jpg` : null)
    || movie.posterUrl;

  const stableSlug = toSlug(song.title) || String(idx);
  const canonical  = `${SITE_URL}/songs/${movie.slug}/${idx}/${stableSlug}`;

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
        ...(song.ytId       && { "sameAs": `https://www.youtube.com/watch?v=${song.ytId}` }),
        "url": canonical,
        // ★ Link song → movie for entity graph
        "inAlbum": {
          "@type": "MusicAlbum",
          "name": `${movie.title} Original Soundtrack`,
          "numTracks": movie.media.songs.length,
          ...(song.musicDirector && {
            "byArtist": { "@type": "Person", "name": song.musicDirector },
          }),
        },
        // ★ Associate song with its film
        "associatedMedia": {
          "@type": "Movie",
          "name": movie.title,
          "url": `${SITE_URL}/movie/${movie.slug}`,
        },
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Home",       "item": `${SITE_URL}/` },
          { "@type": "ListItem", "position": 2, "name": "Songs",      "item": `${SITE_URL}/songs` },
          { "@type": "ListItem", "position": 3, "name": movie.title,  "item": `${SITE_URL}/movie/${movie.slug}` },
          { "@type": "ListItem", "position": 4, "name": song.title,   "item": canonical },
        ],
      },
      // ★ ItemList of related blog posts — helps Google link song → blogs
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