// app/songs/[movieSlug]/[songIndex]/[songSlug]/page.tsx
// Fixes applied:
//  1. notFound() on missing movie/song → eliminates Soft 404s
//  2. Explicit canonical URL (locked to pretty slug form)
//  3. robots: index/follow explicitly set
//  4. description always has real fallback
//  5. generateStaticParams re-enabled (was commented out) — critical for
//     "Discovered not indexed": Google can't crawl pages it doesn't know about
//  6. MusicRecording JSON-LD already present — kept and improved
//  7. songSlug normalised so canonical is stable

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connectDB } from "@/lib/db";
import Movie from "@/models/Movie";
import { buildMeta } from "@/lib/seo";
import { SongDetailClient } from "../SongDetailClient";
import type { MovieData } from "../types";

export const revalidate    = 3600;
export const dynamicParams = true;

// ─── Static params ─────────────────────────────────────────────
// FIX: this was commented out. Without it Google discovers song pages
// only via sitemap/internal links and many stay "Discovered - not indexed".
// Re-enable with a generous limit so important songs are pre-rendered.
export async function generateStaticParams() {
  await connectDB();
  const movies = await (Movie as any)
    .find({ "media.songs.0": { $exists: true } }, "slug media.songs")
    .sort({ releaseDate: -1 })
    .limit(200) // increase gradually — start conservative for crawl budget
    .lean();

  return movies.flatMap((m: any) =>
    (m.media?.songs || []).map((s: any, i: number) => ({
      movieSlug: m.slug || String(m._id),
      songIndex: String(i),
      songSlug:  toSlug(s.title) || String(i),
    }))
  );
}

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

  // FIX: noindex missing songs instead of returning partial metadata
  if (!movie || !song) {
    return { robots: { index: false, follow: false } };
  }

  const year        = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : "";
  const singerStr   = song.singer ? ` by ${song.singer}` : "";
  const thumb       = song.thumbnailUrl
    || (song.ytId ? `https://img.youtube.com/vi/${song.ytId}/hqdefault.jpg` : null)
    || movie.posterUrl
    || "https://ollypedia.in/default.jpg";

  const title = `${song.title}${singerStr} – ${movie.title}${year ? ` (${year})` : ""} | Odia Song | Ollypedia`;
  const description = (
    song.description ||
    `Listen to "${song.title}"${singerStr} from the Odia film "${movie.title}"${year ? ` (${year})` : ""}. Watch on YouTube and explore the full soundtrack on Ollypedia.`
  ).slice(0, 160);

  // FIX: canonical always uses the movie's own slug (not the incoming param)
  // so /songs/abc-2025/0/any-slug-variation all point to one canonical URL
  const stableSlug = toSlug(song.title) || String(idx);
  const canonical  = `https://ollypedia.in/songs/${movie.slug}/${idx}/${stableSlug}`;

  const keywords = [
    song.title,
    `${song.title} lyrics`,
    `${song.title} song`,
    song.singer && `${song.singer} songs`,
    `${movie.title} songs`,
    "Odia song", "Ollywood song",
    year && `Odia songs ${year}`,
  ].filter(Boolean) as string[];

  return {
    title,
    description,
    keywords,

    // FIX: explicit canonical
    alternates: { canonical },

    // FIX: explicit robots
    robots: { index: true, follow: true, googleBot: { index: true, follow: true } },

    openGraph: {
      title, description,
      url: canonical,
      type: "music.song",
      images: [{ url: thumb, width: 1280, height: 720, alt: song.title }],
    },
    twitter: {
      card: "summary_large_image",
      title, description,
      images: [thumb],
    },
  };
}

// ─── Page ─────────────────────────────────────────────────────
export default async function SongDetailSlugPage({
  params,
}: {
  params: { movieSlug: string; songIndex: string; songSlug: string };
}) {
  const movie = await getMovieWithSongs(params.movieSlug);
  const idx   = parseInt(params.songIndex, 10) || 0;

  // FIX: hard 404 on missing data → no more Soft 404 warnings
  if (!movie || !movie.media?.songs?.length) notFound();

  const song = movie.media.songs[idx] ?? movie.media.songs[0];
  if (!song) notFound();

  const relatedMovies = await getRelatedMovies(movie);
  const year  = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : undefined;
  const thumb = song.thumbnailUrl
    || (song.ytId ? `https://img.youtube.com/vi/${song.ytId}/hqdefault.jpg` : null)
    || movie.posterUrl;

  const stableSlug = toSlug(song.title) || String(idx);
  const canonical  = `https://ollypedia.in/songs/${movie.slug}/${idx}/${stableSlug}`;

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
        "inAlbum": { "@type": "MusicAlbum", "name": `${movie.title} Original Soundtrack` },
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
    </>
  );
}