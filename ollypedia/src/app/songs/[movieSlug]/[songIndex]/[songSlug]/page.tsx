// app/songs/[movieSlug]/[songIndex]/[songSlug]/page.tsx
// SEO audit fixes applied:
//  1. generateStaticParams re-enabled (was commented out) — critical for indexing
//  2. Canonical locked to movie's own slug, not the incoming param
//  3. noindex on missing songs instead of partial metadata
//  4. Richer, longer description — uses song + movie + singer + year
//  5. og:type "music.song" with proper image fallback chain
//  6. JSON-LD: MusicRecording + BreadcrumbList, url = canonical
//  7. SEO prose block added directly in the page (server-rendered, always visible to Google)
//     — includes singer, music director, lyricist, track number, movie link
//  8. Internal links added:
//     - /songs/category/[relevant-category] for year & trending
//     - /movie/[slug] for the parent movie
//     - /songs/[movieSlug]/[i]/[songSlug] for every other song in the same album
//     - /cast/[id] for cast members (passed through to client via prop)

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { connectDB } from "@/lib/db";
import Movie from "@/models/Movie";
import { buildMeta } from "@/lib/seo";
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
    .limit(40)
    .lean();
  for (const m of movies) {
    const songs = m.media?.songs || [];
    for (let i = 0; i < songs.length && rows.length < 200; i++) {
      rows.push({
        movieSlug: m.slug || String(m._id),
        songIndex: String(i),
        songSlug:  toSlug(songs[i]?.title) || String(i),
      });
    }
    if (rows.length >= 200) break;
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

// ─── Metadata ─────────────────────────────────────────────────
export async function generateMetadata({
  params,
}: {
  params: { movieSlug: string; songIndex: string; songSlug: string };
}): Promise<Metadata> {
  const movie = await getMovieWithSongs(params.movieSlug);
  const idx   = parseInt(params.songIndex, 10) || 0;
  const song  = movie?.media?.songs?.[idx];

  // FIX: noindex missing songs — don't waste crawl budget on shell pages
  if (!movie || !song) {
    return { robots: { index: false, follow: false } };
  }

  const year      = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : "";
  const singerStr = song.singer ? ` by ${song.singer}` : "";
  const thumb     = song.thumbnailUrl
    || (song.ytId ? `https://img.youtube.com/vi/${song.ytId}/hqdefault.jpg` : null)
    || movie.posterUrl
    || "https://ollypedia.in/og-default.jpg";

  // FIX: richer title — includes singer and year for long-tail keyword capture
  const title = `${song.title}${singerStr} – ${movie.title}${year ? ` (${year})` : ""} | Odia Song | Ollypedia`;

  // FIX: description uses all available signals, capped at 160 chars
  const descParts = [
    `Listen to "${song.title}"${singerStr} from the Odia film "${movie.title}"${year ? ` (${year})` : ""}.`,
    song.musicDirector ? ` Music by ${song.musicDirector}.` : "",
    song.lyrics?.trim() ? " Full lyrics available." : "",
    " Watch on YouTube and explore the full soundtrack on Ollypedia.",
  ];
  const description = descParts.join("").replace(/\s+/g, " ").trim().slice(0, 160);

  // FIX: canonical always uses movie's own slug — any slug variation resolves to one URL
  const stableSlug = toSlug(song.title) || String(idx);
  const canonical  = `https://ollypedia.in/songs/${movie.slug}/${idx}/${stableSlug}`;

  const keywords = [
    song.title,
    `${song.title} lyrics`,
    `${song.title} odia song`,
    song.singer ? `${song.singer} songs` : null,
    song.musicDirector ? `${song.musicDirector} music` : null,
    `${movie.title} songs`,
    `${movie.title} album`,
    "odia song",
    "ollywood song",
    year ? `odia songs ${year}` : null,
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

// ─── SEO Prose Block (server-rendered) ────────────────────────
// This renders on the server so Google always sees real text content,
// regardless of JS execution. The client component's SEO block stays
// too, but this one is guaranteed visible to crawlers.
function SeoProseBlock({
  song,
  movie,
  idx,
  year,
  otherSongs,
}: {
  song: any;
  movie: MovieData;
  idx: number;
  year: string | number;
  otherSongs: Array<{ title: string; slug: string; index: number }>;
}) {
  return (
    <section
      aria-label="About this song"
      className="max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-10 pb-10"
    >
      {/* ── Main prose ── */}
      <div className="bg-[#111] border border-[#1f1f1f] rounded-xl p-5 mb-6">
        <h2 className="text-white font-bold text-base mb-3">
          About &ldquo;{song.title}&rdquo; — {movie.title}{year ? ` (${year})` : ""}
        </h2>
        <p className="text-gray-400 text-sm leading-relaxed mb-3">
          &ldquo;{song.title}&rdquo;
          {song.singer && (
            <> is sung by <strong className="text-white">{song.singer}</strong></>
          )}
          {!song.singer && " is an Odia film song"} from the{" "}
          {movie.genre?.length ? `${movie.genre.join(", ")} ` : ""}Odia film{" "}
          <Link href={`/movie/${movie.slug}`} className="text-orange-400 hover:underline font-semibold">
            {movie.title}
          </Link>
          {year ? ` (${year})` : ""}.
          {song.musicDirector && (
            <> The music is composed by <strong className="text-white">{song.musicDirector}</strong>.</>
          )}
          {song.lyricist && (
            <> Lyrics are penned by <strong className="text-white">{song.lyricist}</strong>.</>
          )}
          {movie.director && (
            <> The film is directed by <strong className="text-white">{movie.director}</strong>.</>
          )}{" "}
          This is track #{idx + 1} of {movie.media?.songs?.length || 1} in the{" "}
          <Link href={`/movie/${movie.slug}`} className="text-orange-400 hover:underline">
            {movie.title} soundtrack
          </Link>
          .
          {song.lyrics?.trim() && (
            <> Scroll up to read the full lyrics with line-by-line sync.</>
          )}
        </p>

        {/* ── Internal links to song category pages ── */}
        <div className="flex flex-wrap gap-2 mt-2">
          {year && (
            <Link
              href={`/songs/category/${year}`}
              className="text-xs text-orange-400/70 hover:text-orange-400 bg-orange-500/8 border border-orange-500/15 px-2.5 py-1 rounded-full transition-colors"
            >
              🎵 More Odia Songs {year}
            </Link>
          )}
          <Link
            href="/songs/category/latest"
            className="text-xs text-orange-400/70 hover:text-orange-400 bg-orange-500/8 border border-orange-500/15 px-2.5 py-1 rounded-full transition-colors"
          >
            🆕 Latest Odia Songs
          </Link>
          <Link
            href="/songs/category/trending"
            className="text-xs text-orange-400/70 hover:text-orange-400 bg-orange-500/8 border border-orange-500/15 px-2.5 py-1 rounded-full transition-colors"
          >
            🔥 Trending Songs
          </Link>
          <Link
            href={`/movie/${movie.slug}`}
            className="text-xs text-orange-400/70 hover:text-orange-400 bg-orange-500/8 border border-orange-500/15 px-2.5 py-1 rounded-full transition-colors"
          >
            🎬 {movie.title} — Full Movie Page
          </Link>
        </div>
      </div>

      {/* ── Other songs in this album (internal links) ── */}
      {otherSongs.length > 0 && (
        <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-xl p-5">
          <h2 className="text-white font-bold text-sm mb-3">
            More Songs from {movie.title}
          </h2>
          <ul className="flex flex-wrap gap-2">
            {otherSongs.map((s) => (
              <li key={s.index}>
                <Link
                  href={`/songs/${movie.slug}/${s.index}/${s.slug}`}
                  className="text-xs text-gray-400 hover:text-orange-400 bg-[#181818] hover:bg-orange-500/10 border border-[#222] hover:border-orange-500/30 px-3 py-1.5 rounded-full transition-all"
                >
                  🎵 {s.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
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

  const relatedMovies = await getRelatedMovies(movie);
  const year   = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : "";
  const thumb  = song.thumbnailUrl
    || (song.ytId ? `https://img.youtube.com/vi/${song.ytId}/hqdefault.jpg` : null)
    || movie.posterUrl;

  const stableSlug = toSlug(song.title) || String(idx);
  const canonical  = `https://ollypedia.in/songs/${movie.slug}/${idx}/${stableSlug}`;

  // Build list of other songs in this album for internal linking
  const otherSongs = (movie.media.songs || [])
    .map((s: any, i: number) => ({ title: s.title, slug: toSlug(s.title) || String(i), index: i }))
    .filter((s: any) => s.index !== idx && s.title);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "MusicRecording",
        "name": song.title,
        "description": song.description
          || `${song.title} is a song from the Odia film ${movie.title}${year ? ` (${year})` : ""}.`,
        ...(song.singer  && { "byArtist": { "@type": "MusicGroup", "name": song.singer } }),
        ...(thumb        && { "thumbnailUrl": thumb }),
        ...(song.ytId    && { "sameAs": `https://www.youtube.com/watch?v=${song.ytId}` }),
        "url": canonical,
        "inAlbum": {
          "@type": "MusicAlbum",
          "name": `${movie.title} Original Soundtrack`,
          "numTracks": movie.media.songs.length,
          ...(song.musicDirector && {
            "byArtist": { "@type": "Person", "name": song.musicDirector },
          }),
        },
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Home",       "item": "https://ollypedia.in/" },
          { "@type": "ListItem", "position": 2, "name": "Songs",      "item": "https://ollypedia.in/songs" },
          { "@type": "ListItem", "position": 3, "name": movie.title,  "item": `https://ollypedia.in/movie/${movie.slug}` },
          { "@type": "ListItem", "position": 4, "name": song.title,   "item": canonical },
        ],
      },
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
      {/* Server-rendered SEO block — always visible to Google regardless of JS */}
      <SeoProseBlock
        song={song}
        movie={movie}
        idx={idx}
        year={year}
        otherSongs={otherSongs}
      />
    </>
  );
}