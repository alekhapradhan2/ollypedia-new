// app/songs/[movieSlug]/[songIndex]/[songSlug]/page.tsx
//
// Handles pretty URLs like:
//   /songs/bindusagar-2026/0/tate-mo-mana-deba-odia-song
//
// The [songSlug] is cosmetic/SEO only — we use movieSlug + songIndex
// to look up the actual data. This page has its own metadata and
// renders the same SongDetailClient as the parent route.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connectDB } from "@/lib/db";
import Movie from "@/models/Movie";
import { buildMeta } from "@/lib/seo";
import { SongDetailClient } from "../../../SongDetailClient";
import type { MovieData, SongData } from "../types";

// ─── Shared data helpers ──────────────────────────────────────────────────────
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

// ─── Metadata ─────────────────────────────────────────────────────────────────
export async function generateMetadata({
  params,
}: {
  params: { movieSlug: string; songIndex: string; songSlug: string };
}): Promise<Metadata> {
  const movie = await getMovieWithSongs(params.movieSlug);
  const idx   = parseInt(params.songIndex, 10) || 0;
  const song  = movie?.media?.songs?.[idx];

  if (!movie || !song) {
    return buildMeta({
      title: "Song Not Found – Ollypedia",
      description: "The requested Odia song could not be found.",
      url: `/songs/${params.movieSlug}/${params.songIndex}/${params.songSlug}`,
    });
  }

  const year      = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : "";
  const singerStr = song.singer ? ` by ${song.singer}` : "";
  const thumb     = song.thumbnailUrl
    || (song.ytId ? `https://img.youtube.com/vi/${song.ytId}/hqdefault.jpg` : null)
    || movie.posterUrl;

  const title       = `${song.title}${singerStr} – ${movie.title}${year ? ` (${year})` : ""} Odia Song`;
  const description = `Listen to "${song.title}"${singerStr} from "${movie.title}"${year ? ` (${year})` : ""}. Watch on YouTube, read lyrics, explore the full playlist on Ollypedia.`;

  const keywords = [
    song.title, `${song.title} lyrics`, `${song.title} song`,
    song.singer && `${song.singer} songs`,
    `${movie.title} songs`, "Odia song", "Ollywood song",
    year && `Odia songs ${year}`,
  ].filter(Boolean) as string[];

  const canonicalUrl = `https://ollypedia.in/songs/${movie.slug}/${idx}/${params.songSlug}`;

  return {
    ...buildMeta({ title, description, keywords, url: `/songs/${movie.slug}/${idx}/${params.songSlug}` }),
    openGraph: {
      title, description, url: canonicalUrl, type: "music.song",
      images: thumb ? [{ url: thumb, width: 1280, height: 720, alt: song.title }] : [],
    },
    twitter: { card: "summary_large_image", title, description, images: thumb ? [thumb] : [] },
    alternates: { canonical: canonicalUrl },
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────
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
  const year = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : undefined;
  const thumb = song.thumbnailUrl
    || (song.ytId ? `https://img.youtube.com/vi/${song.ytId}/hqdefault.jpg` : null)
    || movie.posterUrl;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "MusicRecording",
        "name": song.title,
        "description": song.description || `${song.title} is a song from the Odia film ${movie.title}${year ? ` (${year})` : ""}.`,
        ...(song.singer && { "byArtist": { "@type": "MusicGroup", "name": song.singer } }),
        ...(thumb && { "thumbnailUrl": thumb }),
        ...(song.ytId && { "sameAs": `https://www.youtube.com/watch?v=${song.ytId}` }),
        "inAlbum": { "@type": "MusicAlbum", "name": `${movie.title} Original Soundtrack` },
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Home",      "item": "https://ollypedia.in/" },
          { "@type": "ListItem", "position": 2, "name": "Songs",     "item": "https://ollypedia.in/songs" },
          { "@type": "ListItem", "position": 3, "name": movie.title, "item": `https://ollypedia.in/movie/${movie.slug}` },
          { "@type": "ListItem", "position": 4, "name": song.title,  "item": `https://ollypedia.in/songs/${movie.slug}/${idx}/${params.songSlug}` },
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