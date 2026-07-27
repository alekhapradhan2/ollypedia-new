import type { Metadata } from "next";
import Link from "next/link";
import { connectDB } from "@/lib/db";
import Movie from "@/models/Movie";
import { SITE_URL } from "@/lib/seo";
import { Music, Mic2, Radio, ChevronRight, Headphones, Search } from "lucide-react";
import { DisplayAd } from "@/components/ads/DisplayAd";
import { MovieCard } from "@/components/movie/MovieCard";
import { AlbumCard } from "@/components/songs/AlbumCard";
import { SongsClient } from "@/components/songs/SongsClient";

export const revalidate = 600;

export async function generateMetadata(): Promise<Metadata> {
  const title       = `Odia Movie Songs & Albums – Listen to Latest Ollywood Music`;
  const description = `Browse all Odia movie music albums. Listen to the latest Ollywood songs, mp3 audio tracks, and music videos.`;

  return {
    title,
    description,
    keywords: [
      "Odia songs", "Ollywood songs", "Odia film songs", "latest Odia songs",
      "Odia movie songs", "Odia music", "new Odia songs", "Odia music albums"
    ],
    alternates: { canonical: `${SITE_URL}/songs` },
    openGraph: { title, description, url: `${SITE_URL}/songs`, type: "website" },
  };
}

async function getAlbums() {
  await connectDB();
  const today = new Date().toISOString().split("T")[0];

  const hasSongsFilter = { "media.songs.0": { $exists: true } };

  const sortDateFallback = {
    $cond: [
      {
        $and: [
          { $ifNull: ["$releaseDate", false] },
          { $ne: ["$releaseDate", ""] },
        ],
      },
      { $toDate: "$releaseDate" },
      null,
    ],
  };

  const [upcoming, latest, allMovies] = await Promise.all([
    // Upcoming
    Movie.aggregate([
      { $match: { ...hasSongsFilter, $or: [{ releaseTBA: true }, { releaseDate: { $gt: today } }] } },
      { $project: { title: 1, slug: 1, posterUrl: 1, releaseDate: 1, genre: 1 } },
      { $addFields: { _sortDate: sortDateFallback } },
      { $sort: { _sortDate: 1 } },
      { $limit: 12 },
    ]),
    // Latest Released
    Movie.aggregate([
      { $match: { ...hasSongsFilter, releaseDate: { $exists: true, $ne: "", $lte: today }, releaseTBA: { $ne: true }, verdict: { $ne: "Upcoming" } } },
      { $project: { title: 1, slug: 1, posterUrl: 1, releaseDate: 1, genre: 1 } },
      { $addFields: { _sortDate: sortDateFallback } },
      { $sort: { _sortDate: -1 } },
      { $limit: 12 },
    ]),
    // All
    Movie.aggregate([
      { $match: hasSongsFilter },
      { $project: { title: 1, slug: 1, posterUrl: 1, releaseDate: 1, genre: 1 } },
      { $addFields: { _sortDate: sortDateFallback } },
      { $sort: { _sortDate: -1 } },
      { $limit: 12 },
    ]),
  ]);

  return { upcoming, latest, allMovies };
}

export default async function SongsPage() {
  const { upcoming, latest, allMovies } = await getAlbums();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "Odia Movie Songs & Albums - Ollypedia",
    "description": "Browse all Odia movie music albums. Listen to the latest Ollywood songs.",
    "url": `${SITE_URL}/songs`,
    "publisher": {
      "@type": "Organization",
      "name": "Ollypedia",
      "url": SITE_URL,
    }
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="min-h-screen">
      {/* ══ HERO BANNER ══ */}
      <section className="relative overflow-hidden" style={{ background: "linear-gradient(135deg, #050505 0%, #0f0500 40%, #080010 100%)" }}>
        <div className="absolute inset-0 pointer-events-none">
          {/* Animated Gradients */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/3 w-[900px] h-[600px] rounded-full"
            style={{ background: "radial-gradient(ellipse, rgba(249,115,22,0.08) 0%, transparent 70%)" }} />
          <div className="absolute -left-20 top-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full"
            style={{ background: "radial-gradient(ellipse, rgba(239,68,68,0.07) 0%, transparent 70%)" }} />
          <div className="absolute -right-20 bottom-0 w-[500px] h-[400px] rounded-full"
            style={{ background: "radial-gradient(ellipse, rgba(168,85,247,0.06) 0%, transparent 70%)" }} />
          
          <div className="absolute inset-0 opacity-[0.025]"
            style={{
              backgroundImage: "linear-gradient(rgba(249,115,22,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(249,115,22,0.5) 1px, transparent 1px)",
              backgroundSize: "60px 60px",
            }} />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
          
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-xs text-gray-600 mb-10">
            <Link href="/" className="hover:text-orange-400 transition-colors">Home</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-gray-400">Songs</span>
          </nav>

          {/* ── Two-column layout ── */}
          <div className="relative grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
            
            {/* ── LEFT: Text content ── */}
            <div className="space-y-8">
              
              {/* Badge */}
              <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full border text-xs font-bold uppercase tracking-widest"
                style={{ color: "#f97316", borderColor: "rgba(249,115,22,0.3)", background: "rgba(249,115,22,0.08)" }}>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                </span>
                <Music className="w-3.5 h-3.5" />
                Ollywood Music Hub
              </div>

              {/* Heading */}
              <div>
                <h1 className="font-black text-white leading-[1.05]" style={{ fontSize: "clamp(2.5rem, 5vw, 4rem)" }}>
                  <span className="block text-gray-300 font-extrabold" style={{ fontSize: "0.55em", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "0.3em", color: "rgba(249,115,22,0.7)" }}>
                    Listen To
                  </span>
                  Odia{" "}
                  <span style={{
                    background: "linear-gradient(135deg, #f97316 0%, #ef4444 60%, #ec4899 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}>
                    Music
                  </span>
                  <br />
                  Albums
                </h1>
              </div>

              {/* Description */}
              <p className="text-gray-400 leading-relaxed max-w-lg" style={{ fontSize: "clamp(0.95rem, 1.5vw, 1.1rem)" }}>
                Stream high-quality original soundtracks from your favorite <strong className="text-white font-semibold">Ollywood movies</strong>. Listen to the latest tracks, watch music videos, and sing along with lyrics.
              </p>

              {/* Stats row */}
              <div className="flex flex-wrap gap-6 pt-6 border-t border-white/[0.06]">
                <div className="text-center">
                  <div className="text-2xl font-black text-white">500+</div>
                  <div className="text-xs text-gray-600 font-medium mt-0.5">Albums</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-black text-white">1000+</div>
                  <div className="text-xs text-gray-600 font-medium mt-0.5">Songs</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-black text-white">Latest</div>
                  <div className="text-xs text-gray-600 font-medium mt-0.5">Releases</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-black text-white">Free</div>
                  <div className="text-xs text-gray-600 font-medium mt-0.5">Stream</div>
                </div>
              </div>
            </div>

            {/* ── RIGHT: Visual panel ── */}
            <div className="absolute right-0 sm:-right-4 top-0 lg:relative lg:right-auto lg:top-auto flex items-center justify-center min-h-[300px] lg:min-h-[400px] scale-[0.55] sm:scale-75 lg:scale-100 origin-top-right lg:origin-center pointer-events-none lg:pointer-events-auto opacity-20 sm:opacity-40 lg:opacity-100 z-0 lg:z-10">
              
              {/* Outer ring glow */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-80 h-80 rounded-full border border-orange-500/10 animate-[pulse_4s_ease-in-out_infinite]" />
                <div className="absolute w-64 h-64 rounded-full border border-orange-500/15" />
              </div>

              {/* Center Icon */}
              <div className="relative z-10 flex flex-col items-center gap-6">
                
                {/* Main visual */}
                <div className="relative">
                  <div className="w-40 h-40 rounded-full flex items-center justify-center shadow-2xl animate-[spin_20s_linear_infinite]"
                    style={{
                      background: "linear-gradient(135deg, rgba(249,115,22,0.15) 0%, rgba(239,68,68,0.15) 100%)",
                      border: "1px solid rgba(249,115,22,0.25)",
                      boxShadow: "0 0 80px rgba(249,115,22,0.12), inset 0 1px 0 rgba(255,255,255,0.05)",
                    }}>
                    <Headphones className="w-20 h-20 text-orange-400" strokeWidth={1.2} />
                  </div>
                  {/* Play badge */}
                  <div className="absolute -top-3 -right-3 w-10 h-10 rounded-full flex items-center justify-center shadow-lg"
                    style={{ background: "linear-gradient(135deg, #ef4444, #f97316)" }}>
                    <Mic2 className="w-4 h-4 text-white fill-white ml-0.5" />
                  </div>
                </div>

                {/* Floating cards around the center */}
                <div className="absolute -top-16 -left-20 px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 animate-bounce"
                  style={{ animationDuration: "3s", background: "rgba(15,15,15,0.95)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444", boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}>
                  <Music className="w-3 h-3" /> Latest Tracks
                </div>

                <div className="absolute top-1/2 -right-24 px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 animate-bounce"
                  style={{ animationDuration: "2.5s", animationDelay: "1s", background: "rgba(15,15,15,0.95)", border: "1px solid rgba(249,115,22,0.3)", color: "#f97316", boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}>
                  <Radio className="w-3 h-3" /> High Quality
                </div>

                <div className="absolute -bottom-10 left-0 px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 animate-bounce"
                  style={{ animationDuration: "3.5s", animationDelay: "0.5s", background: "rgba(15,15,15,0.95)", border: "1px solid rgba(168,85,247,0.3)", color: "#a855f7", boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}>
                  <Search className="w-3 h-3" /> Quick Search
                </div>

              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ GLOBAL BANNER AD ══ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <DisplayAd slot="8191172163" format="horizontal" className="rounded-xl border border-[#222]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-20">
        
        {/* Latest Released */}
        {latest.length > 0 && (
          <section>
            <h2 className="text-2xl font-black text-white mb-8 flex items-center gap-3">
              <span className="p-2 bg-orange-500/10 rounded-lg">
                <Headphones className="w-6 h-6 text-orange-500" />
              </span>
              Latest Releases
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-8 sm:gap-x-6 sm:gap-y-10">
              {latest.map((movie: any) => (
                <AlbumCard key={movie._id} movie={movie} hrefPrefix="/songs" />
              ))}
            </div>
          </section>
        )}

        {/* Upcoming */}
        {upcoming.length > 0 && (
          <section>
            <h2 className="text-2xl font-black text-white mb-8 flex items-center gap-3">
              <span className="p-2 bg-blue-500/10 rounded-lg">
                <Radio className="w-6 h-6 text-blue-500" />
              </span>
              Upcoming Albums
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-8 sm:gap-x-6 sm:gap-y-10">
              {upcoming.map((movie: any) => (
                <AlbumCard key={movie._id} movie={movie} hrefPrefix="/songs" />
              ))}
            </div>
          </section>
        )}

        {/* All Albums */}
        {allMovies.length > 0 && (
          <section>
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <Music className="w-5 h-5 text-orange-500" />
              All Music Albums
            </h2>
            <SongsClient initialMovies={allMovies} />
          </section>
        )}

      </div>
    </div>
    </>
  );
}