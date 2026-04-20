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

// --- Fuzzy misspelling generator ---
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
    variants.add(w.replace(/e/g, "i"));
    variants.add(w.replace(/u/g, "o"));
    for (let i = 0; i < w.length - 1; i++) {
      variants.add(w.slice(0, i) + w[i + 1] + w[i] + w.slice(i + 2));
    }
    variants.add(w.replace(/h/g, ""));
    variants.add(w.replace(/([sc])([aeiou])/g, "$1h$2"));
    variants.add(w.replace(/ph/g, "f"));
    variants.add(w.replace(/f/g, "ph"));
  }
  const result: string[] = [];
  variants.forEach((v) => {
    if (v && v !== title.toLowerCase() && v.length > 2) {
      result.push(v);
      result.push(`${v} odia movie`);
      result.push(`${v} odia film`);
    }
  });
  return result;
}

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
    || "https://ollypedia.in/og-default.jpg";

  // ★ Rich title — song + singer + movie + year for long-tail capture
  const title = `${song.title}${singerStr} – ${movie.title}${year ? ` (${year})` : ""} | Odia Song | Ollypedia`;

  const descParts = [
    `Listen to "${song.title}"${singerStr} from the Odia film "${movie.title}"${year ? ` (${year})` : ""}.`,
    song.musicDirector ? ` Music by ${song.musicDirector}.` : "",
    song.lyrics?.trim() ? " Full lyrics available." : "",
    " Watch on YouTube and explore the full soundtrack on Ollypedia.",
  ];
  const description = descParts.join("").replace(/\s+/g, " ").trim().slice(0, 160);

  const stableSlug = toSlug(song.title) || String(idx);
  const canonical  = `https://ollypedia.in/songs/${movie.slug}/${idx}/${stableSlug}`;

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
    `${movie.title} songs download`,
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
    ...getMisspellings(movie.title),
    ...getMisspellings(song.title),
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
  otherSongs: Array<{ title: string; slug: string; index: number }>;
  relatedBlogs: any[];
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
          </Link>.
          {song.lyrics?.trim() && (
            <> Scroll up to read the full lyrics with line-by-line sync.</>
          )}
        </p>

        {/* ── Category / discovery links ── */}
        <div className="flex flex-wrap gap-2 mt-2">
          {year && (
            <Link href={`/songs/category/${year}`} className="text-xs text-orange-400/70 hover:text-orange-400 bg-orange-500/8 border border-orange-500/15 px-2.5 py-1 rounded-full transition-colors">
              🎵 More Odia Songs {year}
            </Link>
          )}
          <Link href="/songs/category/latest" className="text-xs text-orange-400/70 hover:text-orange-400 bg-orange-500/8 border border-orange-500/15 px-2.5 py-1 rounded-full transition-colors">
            🆕 Latest Odia Songs
          </Link>
          <Link href="/songs/category/trending" className="text-xs text-orange-400/70 hover:text-orange-400 bg-orange-500/8 border border-orange-500/15 px-2.5 py-1 rounded-full transition-colors">
            🔥 Trending Songs
          </Link>
          <Link href={`/movie/${movie.slug}`} className="text-xs text-orange-400/70 hover:text-orange-400 bg-orange-500/8 border border-orange-500/15 px-2.5 py-1 rounded-full transition-colors">
            🎬 {movie.title} — Full Movie Page
          </Link>
        </div>
      </div>

      {/* ── ★ NEW: Related Blog Posts for this movie ── */}
      {relatedBlogs.length > 0 && (
        <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-xl p-5 mb-6">
          <h2 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
            <span className="w-4 h-[2.5px] bg-orange-500 rounded inline-block" />
            Articles & Reviews for {movie.title}
          </h2>
          <ul className="flex flex-col gap-2">
            {relatedBlogs.map((b: any) => (
              <li key={b._id}>
                <Link
                  href={`/blog/${b.slug}`}
                  className="flex items-start gap-3 group p-2 rounded-lg hover:bg-[#181818] transition-colors"
                >
                  {b.coverImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={b.coverImage}
                      alt={b.title}
                      width={58}
                      height={38}
                      className="w-[58px] h-[38px] object-cover rounded flex-shrink-0 border border-[#222]"
                    />
                  ) : (
                    <div className="w-[58px] h-[38px] flex-shrink-0 bg-[#1a1a1a] rounded border border-[#222] flex items-center justify-center text-lg">
                      📝
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-300 group-hover:text-orange-400 transition-colors line-clamp-2">
                      {b.title}
                    </p>
                    {b.category && (
                      <p className="text-xs text-gray-600 mt-0.5">{b.category}</p>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href={`/blog?movie=${encodeURIComponent(movie.title)}`}
            className="block mt-3 text-center text-xs text-orange-400/60 hover:text-orange-400 transition-colors"
          >
            View all articles about {movie.title} →
          </Link>
        </div>
      )}

      {/* ── Other songs in this album ── */}
      {otherSongs.length > 0 && (
        <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-xl p-5">
          <h2 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
            <span className="w-4 h-[2.5px] bg-orange-500 rounded inline-block" />
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

  const [relatedMovies, relatedBlogs] = await Promise.all([
    getRelatedMovies(movie),
    getRelatedBlogs(movie),   // ★ NEW
  ]);

  const year   = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : "";
  const thumb  = song.thumbnailUrl
    || (song.ytId ? `https://img.youtube.com/vi/${song.ytId}/hqdefault.jpg` : null)
    || movie.posterUrl;

  const stableSlug = toSlug(song.title) || String(idx);
  const canonical  = `https://ollypedia.in/songs/${movie.slug}/${idx}/${stableSlug}`;

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
          "url": `https://ollypedia.in/movie/${movie.slug}`,
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
      // ★ ItemList of related blog posts — helps Google link song → blogs
      ...(relatedBlogs.length > 0
        ? [{
            "@type": "ItemList",
            "name": `Articles about ${movie.title}`,
            "itemListElement": relatedBlogs.map((b: any, i: number) => ({
              "@type": "ListItem",
              "position": i + 1,
              "name": b.title,
              "url": `https://ollypedia.in/blog/${b.slug}`,
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
        relatedBlogs={relatedBlogs}   // ★ NEW
      />
    </>
  );
}