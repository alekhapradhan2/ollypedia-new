// src/app/songs/category/[category]/page.tsx
//
// Route: /songs/category/2026, /songs/category/trending, etc.
// This avoids conflicting with the existing /songs/[movieSlug]/[songIndex] route.
// Update your footer links to use /songs/category/... if you haven't already.
//
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight, Music, Play, TrendingUp } from "lucide-react";
import { connectDB } from "@/lib/db";
import Movie from "@/models/Movie";
import { buildMeta } from "@/lib/seo";
import { Breadcrumb } from "@/components/ui/Breadcrumb";

interface SongDoc {
  _id: string;
  title: string;
  singer: string;
  movieSlug: string;
  movieTitle: string;
  movieYear: number;
  thumbnailUrl: string;
  ytId: string;
  songIndex: number;
}

const CATEGORY_CONFIG: Record<
  string,
  { title: string; metaTitle: string; metaDesc: string; h1: string; intro: string; keywords: string[] }
> = {
  "2026": {
    title: "Odia Songs 2026",
    metaTitle: "Odia Songs 2026 | Latest Ollywood Music & Video Songs",
    metaDesc: "Listen to all Odia songs released in 2026. Full list of Ollywood songs with singer details, movie names, and lyrics.",
    h1: "Odia Songs 2026 — Latest Ollywood Music",
    intro: "The 2026 Odia music scene blends traditional folk rhythms with contemporary production. Browse every Odia song from 2026 films, complete with singer credits and movie links.",
    keywords: ["odia songs 2026", "ollywood songs 2026", "new odia songs"],
  },
  latest: {
    title: "Latest Odia Songs",
    metaTitle: "Latest Odia Songs 2026 | Newest Ollywood Music This Week",
    metaDesc: "Discover the latest Odia songs released this week. Fresh Ollywood music with artist details and movie names.",
    h1: "Latest Odia Songs — Freshest Ollywood Tracks",
    intro: "Never miss a new Odia release. Updated weekly as new soundtracks drop, this tracker surfaces the freshest Ollywood songs first.",
    keywords: ["latest odia songs", "new odia songs 2026", "fresh ollywood music"],
  },
  trending: {
    title: "Trending Odia Songs",
    metaTitle: "Trending Odia Songs 2026 | Most Popular Ollywood Hits Right Now",
    metaDesc: "See which Odia songs are trending right now. Most-viewed and most-shared Ollywood songs this week.",
    h1: "Trending Odia Songs — What's Hot in Ollywood",
    intro: "These are the Odia songs everyone is listening to right now — ranked by streaming views and social shares, updated weekly.",
    keywords: ["trending odia songs", "popular odia songs", "viral ollywood songs"],
  },
  classics: {
    title: "Old Hit Odia Songs",
    metaTitle: "Old Hit Odia Songs | Classic Ollywood Songs of All Time",
    metaDesc: "Revisit the greatest classic Odia songs from Ollywood history. Timeless hits that defined generations.",
    h1: "Classic Old Hit Odia Songs — Timeless Ollywood Melodies",
    intro: "This archive celebrates the golden era of Ollywood music, featuring legendary compositions and iconic singers from decades past.",
    keywords: ["old odia songs", "classic odia songs", "old hit ollywood songs"],
  },
  singers: {
    title: "Top Odia Singers",
    metaTitle: "Top Odia Singers | Best Ollywood Playback Artists & Voices",
    metaDesc: "Discover the top Odia singers in Ollywood. Profiles of the best playback artists with song lists and discographies.",
    h1: "Top Odia Singers — The Voices of Ollywood",
    intro: "From golden-era legends to rising contemporary stars — browse the most popular songs by each of Ollywood's top singers.",
    keywords: ["top odia singers", "ollywood singers", "best odia playback singers"],
  },
};

async function getSongs(category: string): Promise<SongDoc[]> {
  await connectDB();

  const movieMatchMap: Record<string, object> = {
    "2026":   { "media.songs.0": { $exists: true }, releaseYear: 2026 },
    latest:   { "media.songs.0": { $exists: true } },
    trending: { "media.songs.0": { $exists: true } },
    classics: { "media.songs.0": { $exists: true }, releaseYear: { $lte: 2010 } },
    singers:  { "media.songs.0": { $exists: true } },
  };

  const sortMap: Record<string, Record<string, 1 | -1>> = {
    latest:   { releaseDate: -1 },
    trending: { releaseDate: -1 },
    classics: { releaseDate: -1 },
    singers:  { "media.songs.singer": 1 },
    default:  { releaseDate: -1 },
  };

  const match = movieMatchMap[category] ?? { "media.songs.0": { $exists: true } };
  const sort  = sortMap[category] ?? sortMap["default"];

  const docs = await Movie.find(match)
    .select("title slug releaseYear media.songs posterUrl")
    .sort(sort)
    .limit(24)
    .lean() as any[];

  const songs: SongDoc[] = [];
  for (const m of docs) {
    for (let i = 0; i < (m.media?.songs || []).length; i++) {
      const s = m.media.songs[i];
      if (!s?.title) continue;
      songs.push({
        _id: `${String(m._id)}_${i}`,
        title: s.title,
        singer: s.singer || "",
        movieSlug: m.slug,
        movieTitle: m.title,
        movieYear: m.releaseYear,
        thumbnailUrl: s.thumbnailUrl || (s.ytId ? `https://img.youtube.com/vi/${s.ytId}/mqdefault.jpg` : m.posterUrl) || "",
        ytId: s.ytId || "",
        songIndex: i,
      });
      if (songs.length >= 48) break;
    }
    if (songs.length >= 48) break;
  }
  return songs;
}

export async function generateMetadata({ params }: { params: { category: string } }): Promise<Metadata> {
  const cfg = CATEGORY_CONFIG[params.category];
  if (!cfg) return {};
  return buildMeta({ title: cfg.metaTitle, description: cfg.metaDesc, keywords: cfg.keywords, url: `/songs/category/${params.category}` });
}

function JsonLd({ songs, category, cfg }: { songs: SongDoc[]; category: string; cfg: (typeof CATEGORY_CONFIG)[string] }) {
  const base = "https://ollypedia.com";
  const itemList = {
    "@context": "https://schema.org", "@type": "ItemList",
    name: cfg.h1, url: `${base}/songs/category/${category}`, numberOfItems: songs.length,
    itemListElement: songs.slice(0, 10).map((s, i) => ({ "@type": "ListItem", position: i + 1, url: `${base}/songs/${s.movieSlug}/${s.songIndex}`, name: s.title })),
  };
  const breadcrumb = {
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: base },
      { "@type": "ListItem", position: 2, name: "Songs", item: `${base}/songs` },
      { "@type": "ListItem", position: 3, name: cfg.title, item: `${base}/songs/category/${category}` },
    ],
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
    </>
  );
}

function SongCard({ song }: { song: SongDoc }) {
  return (
    <Link href={`/songs/${song.movieSlug}/${song.songIndex}`}
      className="group flex gap-3 items-center card p-3 hover:-translate-y-0.5 transition-all duration-300">
      <div className="relative w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-[#1a1a1a]">
        <Image src={song.thumbnailUrl || "/placeholder-song.jpg"} alt={song.title} fill sizes="64px" className="object-cover" loading="lazy" />
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <Play className="w-5 h-5 text-white fill-white" />
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="text-white text-sm font-semibold truncate group-hover:text-orange-400 transition-colors">{song.title}</h3>
        <p className="text-gray-500 text-xs mt-0.5 truncate">
          {song.singer}{song.singer && song.movieTitle ? " · " : ""}{song.movieTitle}
        </p>
        {song.ytId && <p className="text-gray-600 text-xs mt-0.5">▶ YouTube</p>}
      </div>
      <Music className="w-4 h-4 text-gray-600 group-hover:text-orange-500 transition-colors flex-shrink-0" />
    </Link>
  );
}

export default async function SongCategoryPage({ params }: { params: { category: string } }) {
  const cfg = CATEGORY_CONFIG[params.category];
  if (!cfg) notFound();

  const songs = await getSongs(params.category);

  return (
    <>
      <JsonLd songs={songs} category={params.category} cfg={cfg} />
      <main className="min-h-screen bg-[#0a0a0a] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <Breadcrumb crumbs={[{ label: "Songs", href: "/songs" }, { label: cfg.title }]} />

          <div className="mb-8 mt-6">
            <h1 className="font-display text-3xl md:text-4xl font-black text-white leading-tight mb-4">{cfg.h1}</h1>
            <p className="text-gray-400 text-sm md:text-base leading-relaxed max-w-4xl">{cfg.intro}</p>
          </div>

          <div className="flex flex-wrap gap-2 mb-8">
            {[
              { key: "2026",    label: "2026 Songs" },
              { key: "latest",  label: "🆕 Latest" },
              { key: "trending",label: "🔥 Trending" },
              { key: "classics",label: "🎵 Classics" },
              { key: "singers", label: "🎤 Top Singers" },
            ].map(({ key, label }) => (
              <Link key={key} href={`/songs/category/${key}`}
                className={`text-xs px-4 py-2 rounded-full border transition-all ${
                  params.category === key
                    ? "bg-orange-500 border-orange-500 text-white"
                    : "border-[#2a2a2a] text-gray-400 hover:border-orange-500/40 hover:text-orange-400"
                }`}>
                {label}
              </Link>
            ))}
          </div>

          {songs.length > 0 ? (
            <>
              <p className="text-gray-500 text-sm mb-5">
                <span className="text-white font-semibold">{songs.length}</span> songs found
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {songs.map((song) => <SongCard key={song._id} song={song} />)}
              </div>
            </>
          ) : (
            <div className="text-center py-20 text-gray-500">
              <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No songs found yet. Check back soon!</p>
            </div>
          )}

          <div className="mt-16 p-6 bg-[#111] border border-[#1e1e1e] rounded-2xl">
            <h2 className="text-lg font-semibold text-white mb-4">Explore More Ollywood</h2>
            <div className="flex flex-wrap gap-2">
              {[
                { label: "Odia Movies 2026",   href: "/movies/2026" },
                { label: "Odia Movies 2025",   href: "/movies/2025" },
                { label: "Upcoming Movies",    href: "/movies/upcoming" },
                { label: "Blockbuster Movies", href: "/movies/blockbuster" },
                { label: "Latest Movies",      href: "/movies/latest" },
                { label: "Ollywood News",      href: "/news" },
                { label: "Cast & Crew",        href: "/cast" },
                { label: "Best Odia Songs",    href: "/blog/odia-guides/best-odia-songs" },
              ].map((l) => (
                <Link key={l.href} href={l.href}
                  className="text-xs text-gray-400 hover:text-orange-400 bg-[#181818] hover:bg-orange-500/10 border border-[#222] hover:border-orange-500/30 px-3 py-1.5 rounded-full transition-all">
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

export function generateStaticParams() {
  return Object.keys(CATEGORY_CONFIG).map((category) => ({ category }));
}