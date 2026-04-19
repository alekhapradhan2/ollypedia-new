import type { Metadata } from "next";
import Link from "next/link";
import { connectDB } from "@/lib/db";
import Movie from "@/models/Movie";
import { SongsClient } from "./SongsClient";
import {
  Music, Mic2, Radio, ChevronRight, Headphones,
  Star, Film, TrendingUp,
} from "lucide-react";

export const revalidate = 600;

const PAGE_SIZE = 24;

// ── SEO Metadata ──────────────────────────────────────────────────────────────
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Record<string, string | undefined>;
}): Promise<Metadata> {
  const { singer, year, q } = searchParams || {};

  let title       = "Odia Songs 2026 – Latest Ollywood Music & Film Songs | Ollypedia";
  let description = "Browse thousands of Odia songs from Ollywood films. Listen to the latest Odia movie songs, romantic tracks, devotional music and dance numbers. Find songs by singer, film or music director.";

  if (q) {
    title       = `"${q}" – Odia Songs Search | Ollypedia`;
    description = `Search results for "${q}" in Ollypedia's Odia songs database. Find matching songs, singers and Odia movies.`;
  } else if (singer) {
    title       = `${singer} Songs – Odia Movie Songs | Ollypedia`;
    description = `Listen to all ${singer} Odia songs. Watch YouTube videos, read lyrics and explore every film song by ${singer}.`;
  } else if (year) {
    title       = `Odia Songs ${year} – Latest Ollywood Music | Ollypedia`;
    description = `Explore all Odia songs released in ${year}. Find the best Ollywood songs and music videos of ${year}.`;
  }

  return {
    title,
    description,
    keywords: [
      "Odia songs", "Ollywood songs", "Odia film songs", "latest Odia songs 2026",
      "Odia movie songs", "Odia music", "new Odia songs", "Odia romantic songs",
      "Human Sagar songs", "Odia devotional songs", "Odia dance songs",
    ],
    alternates: { canonical: "https://ollypedia.com/songs" },
    openGraph: { title, description, url: "https://ollypedia.com/songs", type: "website" },
  };
}

// ── Data helpers ──────────────────────────────────────────────────────────────
async function getSongsSections() {
  await connectDB();
  const today = new Date();

  const [upcoming, latest] = await Promise.all([
    Movie.aggregate([
      { $match: { releaseDate: { $gt: today }, "media.songs.0": { $exists: true } } },
      { $sort: { releaseDate: 1 } },
      { $limit: 10 },
      { $project: { title: 1, slug: 1, releaseDate: 1, songs: "$media.songs" } },
    ]),
    Movie.aggregate([
      { $match: { releaseDate: { $lte: today }, "media.songs.0": { $exists: true } } },
      { $sort: { releaseDate: -1 } },
      { $limit: 8 },
      { $project: { title: 1, slug: 1, releaseDate: 1, songs: "$media.songs" } },
    ]),
  ]);

  return { upcoming, latest };
}

async function getSongs({
  page = 1,
  singer,
  musicDirector,
  q,
}: {
  page?: number;
  singer?: string;
  musicDirector?: string;
  q?: string;
}) {
  await connectDB();
  const skip = (page - 1) * PAGE_SIZE;

  // Base: unwind all songs
  const basePipeline: any[] = [
    { $match: { "media.songs.0": { $exists: true } } },
    { $unwind: { path: "$media.songs", includeArrayIndex: "songIndex" } },
  ];

  // Build post-unwind match for filters
  const postMatch: Record<string, any> = {};
  if (singer)        postMatch["media.songs.singer"]        = { $regex: singer, $options: "i" };
  if (musicDirector) postMatch["media.songs.musicDirector"] = { $regex: musicDirector, $options: "i" };

  // Full-text search across song title, singer, movie title
  if (q && q.trim()) {
    postMatch["$or"] = [
      { "media.songs.title":  { $regex: q.trim(), $options: "i" } },
      { "media.songs.singer": { $regex: q.trim(), $options: "i" } },
      { title:                { $regex: q.trim(), $options: "i" } },
    ];
  }

  const filterStage = Object.keys(postMatch).length > 0
    ? [{ $match: postMatch }]
    : [];

  const projectStage = {
    $project: {
      _id: 0,
      title:         "$media.songs.title",
      singer:        "$media.songs.singer",
      musicDirector: "$media.songs.musicDirector",
      ytId:          "$media.songs.ytId",
      thumbnailUrl:  "$media.songs.thumbnailUrl",
      movieTitle:    "$title",
      movieSlug:     "$slug",
      songIndex:     "$songIndex",
    },
  };

  const [songs, countResult] = await Promise.all([
    Movie.aggregate([
      ...basePipeline,
      ...filterStage,
      { $sort: { releaseDate: -1 } },
      { $skip: skip },
      { $limit: PAGE_SIZE },
      projectStage,
    ]),
    Movie.aggregate([
      ...basePipeline,
      ...filterStage,
      { $count: "total" },
    ]),
  ]);

  const total = countResult[0]?.total || 0;
  return { songs, total, currentPage: page, totalPages: Math.ceil(total / PAGE_SIZE) };
}

// ── Static content ────────────────────────────────────────────────────────────
const MUSIC_GENRES = [
  { label: "Romantic",    emoji: "❤️",  desc: "Soulful Odia love songs" },
  { label: "Dance",       emoji: "💃",  desc: "Energetic Odia dance numbers" },
  { label: "Devotional",  emoji: "🪔",  desc: "Spiritual Odia bhajans" },
  { label: "Sad",         emoji: "😢",  desc: "Emotional Odia sad songs" },
  { label: "Folk",        emoji: "🥁",  desc: "Traditional Odia folk music" },
  { label: "Title Track", emoji: "🎬",  desc: "Odia movie title songs" },
];

const TOP_SINGERS = [
  "Human Sagar", "Ira Mohanty", "Tapu Mishra", "Diptirekha",
  "Nibedita", "Humane Sagar", "Satyajit", "Asima Panda",
];

const MUSIC_FACTS = [
  { icon: Music,      stat: "5000+", label: "Odia Songs",      note: "Songs from hundreds of Ollywood films" },
  { icon: Mic2,       stat: "200+",  label: "Odia Singers",    note: "Playback singers across all eras" },
  { icon: Radio,      stat: "150+",  label: "Music Directors", note: "Composers who shaped Odia music" },
  { icon: Headphones, stat: "85+",   label: "Years of Music",  note: "Odia film music since 1936" },
];

// ── Page ──────────────────────────────────────────────────────────────────────
export default async function SongsPage({
  searchParams,
}: {
  searchParams: Record<string, string | undefined>;
}) {
  const page          = Number(searchParams?.page) || 1;
  const singerFilter  = searchParams?.singer;
  const dirFilter     = searchParams?.musicDirector;
  const qFilter       = searchParams?.q;

  const [{ upcoming, latest }, songData] = await Promise.all([
    getSongsSections(),
    getSongs({ page, singer: singerFilter, musicDirector: dirFilter, q: qFilter }),
  ]);

  const { songs, total, currentPage, totalPages } = songData;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Odia Film Songs – Ollypedia",
    description: "Complete list of Odia movie songs from Ollywood films",
    numberOfItems: total,
    itemListElement: songs.slice(0, 20).map((s: any, i: number) => ({
      "@type": "MusicRecording",
      position: i + 1,
      name: s.title,
      byArtist: { "@type": "Person", name: s.singer },
      inAlbum: { "@type": "MusicAlbum", name: s.movieTitle },
      url: `https://ollypedia.com/songs/${s.movieSlug}/${s.songIndex}`,
    })),
  };

  return (
    <div className="min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ══ HERO BANNER ══ */}
      <section className="relative overflow-hidden bg-[#0d0d0d] border-b border-[#1f1f1f]">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-1/3 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-1/4 w-64 h-64 bg-orange-600/4 rounded-full blur-2xl" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 relative z-10">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <nav className="flex items-center gap-1.5 text-xs text-gray-500 mb-4" aria-label="Breadcrumb">
                <Link href="/" className="hover:text-orange-400 transition-colors">Home</Link>
                <ChevronRight className="w-3 h-3" />
                <span className="text-gray-300">Songs</span>
                {singerFilter && (
                  <>
                    <ChevronRight className="w-3 h-3" />
                    <span className="text-orange-400">{singerFilter}</span>
                  </>
                )}
              </nav>

              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-orange-500/15 rounded-xl flex items-center justify-center">
                  <Music className="w-5 h-5 text-orange-500" />
                </div>
                <h1 className="font-display text-3xl md:text-4xl font-black text-white">
                  {singerFilter ? `${singerFilter} Songs` : "Odia Songs"}
                </h1>
              </div>

              <p className="text-gray-400 text-sm md:text-base max-w-xl leading-relaxed">
                {singerFilter
                  ? `All Odia film songs by ${singerFilter} — with YouTube videos, movie details and full credits.`
                  : "The most complete Odia film music library — browse thousands of songs with YouTube videos, lyrics, singer profiles and more."}
              </p>

              {/* Singer quick-links */}
              {!singerFilter && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {TOP_SINGERS.slice(0, 5).map((s) => (
                    <Link
                      key={s}
                      href={`/songs?singer=${encodeURIComponent(s)}`}
                      className="text-xs px-3 py-1.5 bg-[#111] border border-[#1f1f1f] rounded-full text-gray-400 hover:text-orange-400 hover:border-orange-500/40 transition-all"
                    >
                      {s}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 bg-[#111] border border-[#1f1f1f] rounded-xl px-5 py-3 self-start md:self-auto">
              <Music className="w-4 h-4 text-orange-500" />
              <span className="text-2xl font-black text-white font-display">{total.toLocaleString()}</span>
              <span className="text-xs text-gray-500 leading-tight">Odia<br />songs</span>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">

        {/* ══ UPCOMING ══ */}
        {upcoming.length > 0 && !qFilter && (
          <section aria-label="Upcoming Odia songs 2026">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-1 h-5 bg-orange-500 rounded-full" />
              <h2 className="font-display text-xl font-bold text-white">Upcoming Odia Songs 2026</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {upcoming.map((movie: any) => (
                <Link key={movie.slug} href={`/movie/${movie.slug}`}
                  className="group bg-[#111] border border-[#1f1f1f] hover:border-orange-500/30 rounded-xl p-4 transition-all hover:-translate-y-0.5">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 bg-orange-500/10 rounded-lg flex items-center justify-center">
                      <Film className="w-3.5 h-3.5 text-orange-500" />
                    </div>
                    <p className="text-sm font-semibold text-white group-hover:text-orange-300 transition-colors line-clamp-1">
                      {movie.title}
                    </p>
                  </div>
                  <p className="text-xs text-gray-500 mb-2">
                    {movie.releaseDate
                      ? new Date(movie.releaseDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                      : "Coming soon"}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {(movie.songs as any[])?.slice(0, 3).map((s: any, i: number) => (
                      <span key={i} className="text-[10px] bg-[#1a1a1a] text-gray-400 px-2 py-0.5 rounded-full">
                        🎵 {s.title}
                      </span>
                    ))}
                    {(movie.songs as any[])?.length > 3 && (
                      <span className="text-[10px] text-gray-600">+{movie.songs.length - 3} more</span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ══ LATEST ══ */}
        {latest.length > 0 && !qFilter && (
          <section aria-label="Latest Odia movie songs">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="w-1 h-5 bg-orange-500 rounded-full" />
                <h2 className="font-display text-xl font-bold text-white">Latest Odia Songs</h2>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {latest.map((movie: any) => (
                <Link key={movie.slug} href={`/movie/${movie.slug}`}
                  className="group bg-[#111] border border-[#1f1f1f] hover:border-orange-500/30 rounded-xl p-4 transition-all">
                  <p className="text-xs text-orange-400 mb-1 font-semibold">
                    {new Date(movie.releaseDate).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
                  </p>
                  <p className="text-sm font-bold text-white group-hover:text-orange-300 transition-colors mb-2 line-clamp-1">
                    {movie.title}
                  </p>
                  <div className="space-y-1">
                    {(movie.songs as any[])?.slice(0, 4).map((s: any, i: number) => (
                      <p key={i} className="text-xs text-gray-400 flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-orange-500/50 flex-shrink-0" />
                        <span className="truncate">{s.title}</span>
                      </p>
                    ))}
                    {(movie.songs as any[])?.length > 4 && (
                      <p className="text-[10px] text-gray-600">+{movie.songs.length - 4} more songs</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ══ SONGS CLIENT — Search + Grid + Pagination ══ */}
        <section aria-label="All Odia songs database">
          <SongsClient
            songs={songs}
            singers={[]}
            directors={[]}
            active={{ singer: singerFilter, musicDirector: dirFilter, q: qFilter }}
            total={total}
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={PAGE_SIZE}
          />
        </section>

        {/* ══ SEO BLOCK 1 — About Odia Film Music ══ */}
        <section aria-label="About Odia film music" className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-8 md:p-10">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-1 h-6 bg-orange-500 rounded-full" />
            <h2 className="font-display text-xl md:text-2xl font-bold text-white">
              About Odia Film Music — The Soul of Ollywood
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4 text-gray-400 text-sm leading-relaxed">
              <p>
                <strong className="text-white">Odia film songs</strong> have been an integral part of
                Ollywood since the very first Odia movie <em>Sita Bibaha</em> in 1936. Over the decades,
                Odia cinema music has evolved from classical and devotional compositions to modern
                romantic tracks, energetic dance numbers and experimental fusion music.
              </p>
              <p>
                The golden voice of <strong className="text-white">Human Sagar</strong> — often called
                the melody king of Ollywood — has defined a generation of Odia romantic songs. Alongside
                him, singers like <strong className="text-white">Ira Mohanty</strong>,{" "}
                <strong className="text-white">Tapu Mishra</strong>,{" "}
                <strong className="text-white">Diptirekha Padhi</strong>, and{" "}
                <strong className="text-white">Nibedita</strong> have given Odia music its distinctive identity.
              </p>
              <p>
                <strong className="text-white">Odia devotional songs</strong> hold a special place in
                Odisha's culture, with bhajans dedicated to Lord Jagannath consistently topping charts.
                Every major Odia film released around the Rath Yatra festival features at least one
                devotional track.
              </p>
            </div>
            <div className="space-y-4 text-gray-400 text-sm leading-relaxed">
              <p>
                Music directors like <strong className="text-white">Prem Anand</strong>,{" "}
                <strong className="text-white">Sourin Bhatt</strong>, and{" "}
                <strong className="text-white">Abhijit Majumdar</strong> have been the creative forces
                behind some of the most beloved Odia film songs, blending traditional Odia musical
                elements with contemporary sounds.
              </p>
              <p>
                The rise of YouTube and digital platforms has transformed how Odia songs reach audiences.
                Many Odia film songs now clock millions of YouTube views within days of release, with
                tracks like <em>Mo Mana Jhuri Jauchhi</em> becoming viral hits that transcended regional
                boundaries.
              </p>
              <p>
                Ollypedia's songs database features{" "}
                <strong className="text-white">{total.toLocaleString()}+ Odia songs</strong> from
                Ollywood films — each with YouTube video links, singer credits, music director details,
                and original movie information.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-8 border-t border-[#1f1f1f]">
            {MUSIC_FACTS.map(({ icon: Icon, stat, label, note }) => (
              <div key={label} className="text-center">
                <div className="w-9 h-9 bg-orange-500/10 rounded-xl flex items-center justify-center mx-auto mb-2">
                  <Icon className="w-4 h-4 text-orange-500" />
                </div>
                <p className="text-xl font-black text-white font-display">{stat}</p>
                <p className="text-xs font-semibold text-gray-300 mt-0.5">{label}</p>
                <p className="text-[10px] text-gray-600 mt-1 leading-tight">{note}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ══ SEO BLOCK 2 — Genre grid ══ */}
        <section aria-label="Browse Odia songs by genre">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-1 h-5 bg-orange-500 rounded-full" />
            <h2 className="font-display text-xl font-bold text-white">Odia Songs by Genre</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {MUSIC_GENRES.map((g) => (
              <div key={g.label}
                className="bg-[#111] border border-[#1f1f1f] rounded-xl p-4 text-center">
                <div className="text-2xl mb-2">{g.emoji}</div>
                <p className="text-sm font-bold text-white">{g.label}</p>
                <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">{g.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ══ SEO BLOCK 3 — Top Singers ══ */}
        <section aria-label="Top Odia singers" className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-8">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-1 h-6 bg-orange-500 rounded-full" />
            <h2 className="font-display text-xl font-bold text-white">Popular Odia Playback Singers</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {TOP_SINGERS.map((singer) => (
              <Link key={singer} href={`/songs?singer=${encodeURIComponent(singer)}`}
                className="group flex items-center gap-3 bg-[#0d0d0d] border border-[#1f1f1f] hover:border-orange-500/30 rounded-xl p-3 transition-all">
                <div className="w-9 h-9 bg-orange-500/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <Mic2 className="w-4 h-4 text-orange-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white group-hover:text-orange-300 transition-colors truncate">{singer}</p>
                  <p className="text-[10px] text-gray-500">Odia singer</p>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-gray-600 group-hover:text-orange-400 transition-colors ml-auto flex-shrink-0" />
              </Link>
            ))}
          </div>
        </section>

        {/* ══ SEO BLOCK 4 — FAQ ══ */}
        <section aria-label="FAQ about Odia songs" className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-8 md:p-10">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-1 h-6 bg-orange-500 rounded-full" />
            <h2 className="font-display text-xl md:text-2xl font-bold text-white">
              Frequently Asked Questions — Odia Songs
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
            {[
              { q: "Where can I find all Odia movie songs in one place?", a: "Ollypedia is the most complete Odia songs database, featuring songs from hundreds of Odia films. Every song comes with a YouTube video, singer name, music director, and the original movie details. Use the search bar to find any song across our entire database." },
              { q: "Who is the most popular Odia singer?", a: "Human Sagar is widely considered the melody king of Ollywood. Other beloved Odia singers include Ira Mohanty, Tapu Mishra, Diptirekha Padhi, Nibedita, and Asima Panda." },
              { q: "What are the latest Odia songs of 2026?", a: "Ollypedia updates its songs database regularly. Use the search or browse the 'Latest Odia Songs' section on this page to find the newest Ollywood tracks of 2026." },
              { q: "Can I watch Odia song videos on Ollypedia?", a: "Yes — every Odia song in our database includes a YouTube video link. Click any song card to watch the official music video directly from the movie's YouTube channel." },
              { q: "Who are the best Odia music directors?", a: "Prominent Odia music directors include Prem Anand, Sourin Bhatt, Abhijit Majumdar, Bikram Pati, and Baidyanath Mishra — each known for iconic Odia film soundtracks." },
              { q: "Are there devotional Odia songs on Ollypedia?", a: "Yes — devotional songs dedicated to Lord Jagannath and other deities are a major part of Odia film music. You can search for specific devotional tracks directly from the search bar above." },
            ].map(({ q, a }) => (
              <div key={q} className="border-b border-[#1f1f1f] pb-5 last:border-0">
                <h3 className="font-bold text-white text-sm mb-2 flex items-start gap-2">
                  <span className="text-orange-500 mt-0.5 flex-shrink-0">Q.</span>{q}
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed pl-5">{a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ══ SEO BLOCK 5 — Internal links ══ */}
        <section aria-label="Explore more Odia cinema">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-1 h-5 bg-orange-500 rounded-full" />
            <h2 className="font-display text-xl font-bold text-white">Explore More on Ollypedia</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: Film,       href: "/movies",     title: "Odia Movies",    desc: "Complete database of Odia films with cast, synopsis, trailers and reviews.",                      cta: "Browse Movies"   },
              { icon: TrendingUp, href: "/box-office", title: "Box Office",     desc: "Day-wise net and gross collection figures for every Odia film currently running.",               cta: "View Box Office" },
              { icon: Star,       href: "/cast",       title: "Cast Profiles",  desc: "Detailed profiles of Odia actors, actresses and film professionals with full filmographies.",    cta: "Browse Cast"     },
              { icon: Headphones, href: "/blog",       title: "Odia Film Blog", desc: "In-depth reviews, singer spotlights, top 10 song lists and Ollywood music opinion pieces.",     cta: "Read Blog"       },
            ].map(({ icon: Icon, href, title, desc, cta }) => (
              <Link key={title} href={href}
                className="group bg-[#111] border border-[#1f1f1f] hover:border-orange-500/30 rounded-xl p-5 transition-all hover:-translate-y-0.5 flex flex-col">
                <div className="w-9 h-9 bg-orange-500/10 rounded-xl flex items-center justify-center mb-3 group-hover:bg-orange-500/20 transition-colors">
                  <Icon className="w-4 h-4 text-orange-500" />
                </div>
                <h3 className="font-bold text-white text-sm mb-1.5">{title}</h3>
                <p className="text-gray-500 text-xs leading-relaxed flex-1">{desc}</p>
                <div className="flex items-center gap-1 mt-4 text-orange-400 text-xs font-semibold group-hover:gap-2 transition-all">
                  {cta} <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </Link>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}