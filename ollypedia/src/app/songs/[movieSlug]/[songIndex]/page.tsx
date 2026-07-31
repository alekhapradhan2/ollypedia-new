import { SITE_URL } from "@/lib/seo";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connectDB } from "@/lib/db";
import Movie from "@/models/Movie";
import { buildSongMeta, generateSongJsonLd } from "@/lib/songSeo";
import { SongDetailClient } from "./SongDetailClient";
import type { MovieData, SongData } from "./types";

export const revalidate = 600;
export const dynamicParams = true;

export async function generateStaticParams() {
  try {
    await connectDB();
    const rows: { movieSlug: string; songIndex: string }[] = [];
    const movies = await (Movie as any)
      .find({ "media.songs.0": { $exists: true } }, "slug media.songs._id")
      .sort({ releaseDate: -1 })
      .limit(5)
      .lean();
    for (const m of movies) {
      const count = m.media?.songs?.length || 0;
      for (let i = 0; i < count && rows.length < 15; i++) {
        rows.push({ movieSlug: m.slug || String(m._id), songIndex: String(i) });
      }
      if (rows.length >= 15) break;
    }
    return rows;
  } catch (err) {
    return [];
  }
}

// Re-export for [songSlug]/page.tsx to import
export type { MovieData, SongData };

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

export async function generateMetadata({
  params,
}: {
  params: { movieSlug: string; songIndex: string };
}): Promise<Metadata> {
  const movie = await getMovieWithSongs(params.movieSlug);
  const idx   = parseInt(params.songIndex, 10) || 0;
  const song  = movie?.media?.songs?.[idx];

  if (!movie || !song) {
    return {
      title: "Song Not Found – Ollypedia",
      description: "The requested Odia song could not be found.",
      robots: { index: false, follow: false },
    };
  }

  // Delegate to the dedicated songSeo module
  // buildSongMeta generates canonical with songSlug (3-segment URL) matching sitemap format
  return buildSongMeta({
    title: song.title || `Song ${idx + 1}`,
    singer: song.singer,
    musicDirector: song.musicDirector,
    lyricist: song.lyricist,
    duration: song.duration,
    ytId: song.ytId,
    movieTitle: movie.title,
    movieSlug: movie.slug || String(movie._id),
    posterUrl: movie.posterUrl,
    releaseDate: movie.releaseDate,
    songIndex: idx,
    songSlug: song.slug || undefined,
  });
}

export default async function SongDetailPage({
  params,
}: {
  params: { movieSlug: string; songIndex: string };
}) {
  const movie = await getMovieWithSongs(params.movieSlug);
  const idx   = parseInt(params.songIndex, 10) || 0;

  if (!movie || !movie.media?.songs?.length) notFound();

  const song = movie.media.songs[idx] ?? movie.media.songs[0];
  if (!song) notFound();

  const relatedMovies = await getRelatedMovies(movie);

  // Use generateSongJsonLd from songSeo.ts — includes VideoObject for the YouTube embed
  const jsonLdSchemas = generateSongJsonLd({
    title: song.title || `Song ${idx + 1}`,
    singer: song.singer,
    musicDirector: song.musicDirector,
    lyricist: song.lyricist,
    duration: song.duration,
    ytId: song.ytId,
    movieTitle: movie.title,
    movieSlug: movie.slug || String(movie._id),
    posterUrl: movie.posterUrl,
    releaseDate: movie.releaseDate,
    songIndex: idx,
    songSlug: song.slug || undefined,
  });

  return (
    <>
      {jsonLdSchemas.map((schema: any, i: number) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
      <SongDetailClient
        movie={movie}
        initialSongIndex={idx}
        relatedMovies={relatedMovies}
      />
    </>
  );
}