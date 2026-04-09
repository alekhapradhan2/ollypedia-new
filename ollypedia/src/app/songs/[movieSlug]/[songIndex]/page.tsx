import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connectDB } from "@/lib/db";
import Movie from "@/models/Movie";
import { buildMeta } from "@/lib/seo";
import { SongDetailClient } from "../SongDetailClient";
import type { MovieData, SongData } from "./types";

// Re-export for [songSlug]/page.tsx to import
export type { MovieData, SongData };

// ─── Data fetching ────────────────────────────────────────────────────────────
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
    .find({
      _id: { $ne: movie._id },
      genre: { $in: movie.genre },
    })
    .select("title slug posterUrl thumbnailUrl releaseDate genre verdict media.songs")
    .limit(20)
    .lean();
  return JSON.parse(JSON.stringify(related)) as MovieData[];
}

// ─── Dynamic metadata — rich SEO for AdSense approval ─────────────────────
export async function generateMetadata({
  params,
}: {
  params: { movieSlug: string; songIndex: string };
}): Promise<Metadata> {
  const movie = await getMovieWithSongs(params.movieSlug);
  const idx   = parseInt(params.songIndex, 10) || 0;
  const song  = movie?.media?.songs?.[idx];

  if (!movie || !song) {
    return buildMeta({
      title: "Song Not Found – Ollypedia",
      description: "The requested Odia song could not be found.",
      url: `/songs/${params.movieSlug}/${params.songIndex}`,
    });
  }

  const year        = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : "";
  const singerStr   = song.singer   ? ` by ${song.singer}`   : "";
  const mdStr       = song.musicDirector ? ` | Music: ${song.musicDirector}` : "";
  const thumb       = song.thumbnailUrl
    || (song.ytId ? `https://img.youtube.com/vi/${song.ytId}/hqdefault.jpg` : null)
    || movie.posterUrl;

  const title       = `${song.title}${singerStr} – ${movie.title}${year ? ` (${year})` : ""} Odia Song`;
  const description = [
    `Listen to "${song.title}"${singerStr} from the Odia film "${movie.title}"${year ? ` (${year})` : ""}.`,
    song.lyrics?.trim() ? " Read the full lyrics." : "",
    song.description ? ` ${song.description.slice(0, 120)}` : "",
    ` ${mdStr}. Watch on YouTube, explore the full playlist and related Odia songs on Ollypedia.`,
  ].join("").replace(/\s+/g, " ").trim();

  const keywords = [
    song.title,
    `${song.title} lyrics`,
    `${song.title} song`,
    song.singer   && `${song.singer} songs`,
    song.musicDirector && `${song.musicDirector} music`,
    `${movie.title} songs`,
    `${movie.title} album`,
    "Odia song",
    "Ollywood song",
    "Odia film song",
    year && `Odia songs ${year}`,
    ...(movie.genre || []).map((g) => `${g} Odia film`),
  ].filter(Boolean) as string[];

  const url = `/songs/${movie.slug}/${idx}`;

  return {
    ...buildMeta({ title, description, keywords, url }),
    openGraph: {
      title,
      description,
      url: `https://ollypedia.in${url}`,
      type: "music.song",
      images: thumb ? [{ url: thumb, width: 1280, height: 720, alt: song.title }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: thumb ? [thumb] : [],
    },
    // JSON-LD is injected below via <script> in the client
    alternates: {
      canonical: `https://ollypedia.in${url}`,
    },
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────
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

  // ── JSON-LD structured data for rich results ─────────────────
  const thumb = song.thumbnailUrl
    || (song.ytId ? `https://img.youtube.com/vi/${song.ytId}/hqdefault.jpg` : null)
    || movie.posterUrl;
  const year  = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : undefined;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      // MusicRecording — the individual song
      {
        "@type": "MusicRecording",
        "@id": `https://ollypedia.in/songs/${movie.slug}/${idx}#song`,
        "name": song.title,
        "description": song.description || `${song.title} is a song from the Odia film ${movie.title}${year ? ` (${year})` : ""}.`,
        ...(song.singer && { "byArtist": { "@type": "MusicGroup", "name": song.singer } }),
        ...(thumb && { "thumbnailUrl": thumb }),
        ...(song.ytId && {
          "url": `https://www.youtube.com/watch?v=${song.ytId}`,
          "sameAs": `https://www.youtube.com/watch?v=${song.ytId}`,
        }),
        "inAlbum": {
          "@type": "MusicAlbum",
          "name": `${movie.title} Original Soundtrack`,
          "byArtist": song.musicDirector
            ? { "@type": "Person", "name": song.musicDirector }
            : undefined,
        },
      },
      // MusicAlbum — the movie soundtrack
      {
        "@type": "MusicAlbum",
        "name": `${movie.title} Original Soundtrack`,
        "numTracks": movie.media.songs.length,
        "track": movie.media.songs.map((s, i) => ({
          "@type": "MusicRecording",
          "name": s.title,
          "url": `https://ollypedia.in/songs/${movie.slug}/${i}`,
          ...(s.ytId && { "sameAs": `https://www.youtube.com/watch?v=${s.ytId}` }),
        })),
      },
      // BreadcrumbList
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Home",   "item": "https://ollypedia.in/" },
          { "@type": "ListItem", "position": 2, "name": "Songs",  "item": "https://ollypedia.in/songs" },
          { "@type": "ListItem", "position": 3, "name": movie.title, "item": `https://ollypedia.in/movie/${movie.slug}` },
          { "@type": "ListItem", "position": 4, "name": song.title,  "item": `https://ollypedia.in/songs/${movie.slug}/${idx}` },
        ],
      },
    ],
  };

  return (
    <>
      {/* Inject JSON-LD */}
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