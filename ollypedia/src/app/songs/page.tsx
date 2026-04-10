import type { Metadata } from "next";
import { connectDB } from "@/lib/db";
import Movie from "@/models/Movie";
import { SongsClient } from "./SongsClient";

const PAGE_SIZE = 24;

// 🔥 Dynamic SEO Metadata
export async function generateMetadata({ searchParams }: { searchParams: Record<string, string | undefined> }): Promise<Metadata> {
  const { singer, year } = searchParams || {};

  let title = "Odia Songs 2026 | Latest & Upcoming Ollywood Songs";
  let description =
    "Explore latest Odia songs, upcoming movie songs and trending Ollywood music.";

  if (singer) {
    title = `${singer} Songs | Odia Hit Songs`;
    description = `Listen to ${singer} Odia songs, watch videos and explore movie songs.`;
  }

  if (year) {
    title = `Odia Songs ${year} | Latest & Upcoming`;
  }

  return {
    title,
    description,
    alternates: {
      canonical: "https://yourdomain.com/songs",
    },
    openGraph: {
      title,
      description,
      url: "https://yourdomain.com/songs",
      type: "website",
    },
  };
}

// 🔥 UPCOMING + LATEST SECTIONS
async function getSongsSections() {
  await connectDB();
  const today = new Date();

  const upcoming = await Movie.aggregate([
    { $match: { releaseDate: { $gt: today }, "media.songs.0": { $exists: true } } },
    { $sort: { releaseDate: 1 } },
    { $limit: 10 },
    {
      $project: {
        title: 1,
        slug: 1,
        releaseDate: 1,
        songs: "$media.songs",
      },
    },
  ]);

  const latest = await Movie.aggregate([
    { $match: { releaseDate: { $lte: today }, "media.songs.0": { $exists: true } } },
    { $sort: { releaseDate: -1 } },
    { $limit: 10 },
    {
      $project: {
        title: 1,
        slug: 1,
        releaseDate: 1,
        songs: "$media.songs",
      },
    },
  ]);

  return { upcoming, latest };
}

// 🔥 FIXED SONGS LIST (IMPORTANT)
async function getSongs({ page = 1 }) {
  await connectDB();

  const skip = (page - 1) * PAGE_SIZE;

  const basePipeline = [
    { $match: { "media.songs.0": { $exists: true } } },
    { $unwind: { path: "$media.songs", includeArrayIndex: "songIndex" } },
  ];

  const [songs, countResult] = await Promise.all([
    Movie.aggregate([
      ...basePipeline,
      { $sort: { releaseDate: -1 } },
      { $skip: skip },
      { $limit: PAGE_SIZE },
      {
        $project: {
          _id: 0,
          title: "$media.songs.title",
          singer: "$media.songs.singer",
          musicDirector: "$media.songs.musicDirector",
          ytId: "$media.songs.ytId",
          thumbnailUrl: "$media.songs.thumbnailUrl",
          movieTitle: "$title",
          movieSlug: "$slug",
          songIndex: "$songIndex",
        },
      },
    ]),

    // ✅ CORRECT TOTAL SONG COUNT
    Movie.aggregate([...basePipeline, { $count: "total" }]),
  ]);

  const total = countResult[0]?.total || 0;

  return {
    songs,
    total,
    currentPage: page,
    totalPages: Math.ceil(total / PAGE_SIZE),
  };
}

// 🔥 MAIN PAGE
export default async function SongsPage({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const page = Number(searchParams?.page) || 1;

  const [{ upcoming, latest }, songData] = await Promise.all([
    getSongsSections(),
    getSongs({ page }),
  ]);

  const { songs, total, currentPage, totalPages } = songData;

  // 🔥 JSON-LD
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Odia Songs",
    itemListElement: songs.map((s, i) => ({
      "@type": "MusicRecording",
      position: i + 1,
      name: s.title,
      byArtist: s.singer,
      url: `https://yourdomain.com/songs/${s.movieSlug}/${s.songIndex}`,
    })),
  };

  return (
    <>
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* 🔥 UPCOMING */}
      <section className="px-6 py-6">
        <h2 className="text-xl font-bold mb-4">
          Upcoming Odia Songs 2026
        </h2>
        {upcoming.map((movie) => (
          <div key={movie.slug} className="mb-4">
            <h3 className="text-lg text-orange-400">
              {movie.title}
            </h3>
            <p className="text-sm text-gray-500">
              Songs coming soon...
            </p>
          </div>
        ))}
      </section>

      {/* 🔥 LATEST */}
      <section className="px-6 py-6">
        <h2 className="text-xl font-bold mb-4">
          Latest Odia Songs
        </h2>
        {latest.map((movie) => (
          <div key={movie.slug} className="mb-4">
            <h3 className="text-lg text-orange-400">
              {movie.title}
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {movie.songs?.slice(0, 4).map((song: { title: string }, i: number) => (
                <p key={i} className="text-sm text-gray-300">
                  {song.title}
                </p>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* 🔥 MAIN SONG GRID */}
      <SongsClient
        songs={songs}
        singers={[]}
        directors={[]}
        active={{}}
        total={total}
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={PAGE_SIZE}
      />

      {/* 🔥 SEO CONTENT */}
      <section className="px-6 py-10 max-w-4xl mx-auto">
        <h2 className="text-xl font-bold mb-3">
          Odia Songs 2026
        </h2>
        <p className="text-gray-400 text-sm leading-relaxed">
          Odia songs 2026 are set to bring a fresh wave of music from the
          ever-evolving Ollywood industry, featuring soulful melodies,
          romantic tracks, and energetic dance numbers. With upcoming Odia
          movies, fans can expect songs from singers like Human Sagar and
          music directors like Prem Anand. Explore more songs by visiting
          /songs/singer/human-sagar or browse movies via
          /movies/[movieSlug]. This year promises exciting musical trends
          and unforgettable tracks.
        </p>
      </section>
    </>
  );
}