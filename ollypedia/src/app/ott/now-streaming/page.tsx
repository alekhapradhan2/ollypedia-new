import type { Metadata } from "next";
import { connectDB } from "@/lib/db";
import Movie from "@/models/Movie";
import { buildMeta, SITE_URL } from "@/lib/seo";
import { MovieCard } from "@/components/movie/MovieCard";
import { Play } from "lucide-react";
import { InFeedAd } from "@/components/ads/InFeedAd";
import React from "react";

import { Breadcrumb } from "@/components/ui/Breadcrumb";

export const revalidate = 600;

export const metadata: Metadata = buildMeta({
  title: "Now Streaming Ollywood Movies | Latest Odia OTT Releases",
  description: "Watch the latest Odia movies now streaming on various OTT platforms. Browse our comprehensive list of released Ollywood digital premieres.",
  keywords: ["Odia Movies Streaming Now", "Watch Odia Movies Online", "Latest Odia OTT Release", "Ollywood OTT"],
  url: "/ott/now-streaming",
});

export default async function NowStreamingPage() {
  await connectDB();
  
  // Ensure we only fetch movies that actually have OTT info (platform or url)
  const rawMovies = await Movie.find({
    $or: [
      { "ott.platform": { $exists: true, $nin: ["", null] } },
      { streamingOn: { $exists: true, $nin: ["", null] } },
      { "ott.watchUrl": { $exists: true, $nin: ["", null] } },
      { streamingUrl: { $exists: true, $nin: ["", null] } },
    ]
  })
    .select("_id title slug posterUrl verdict releaseDate ott streamingOn streamingUrl ottReleaseDate")
    .lean()
    .exec();

  const normalizeMovie = (m: any) => {
    const p = m.ott?.platform || m.streamingOn || "";
    const watchUrl = m.ott?.watchUrl || m.streamingUrl || "";
    const releaseDate = m.ott?.releaseDate || m.ottReleaseDate || "";
    // Strict prioritization: if there is a watch URL, it's Streaming regardless of what the db status says.
    const status = watchUrl ? "Streaming" : (m.ott?.status || (releaseDate ? "Upcoming" : ""));
    return { ...m, _id: m._id.toString(), _platform: p, _watchUrl: watchUrl, _ottReleaseDate: releaseDate, _ottStatus: status };
  };

  const now = new Date();
  const movies = (rawMovies as any[])
    .map(normalizeMovie)
    .filter((m: any) => {
      const hasActualInfo = m._platform.trim() !== "" || m._watchUrl.trim() !== "";
      if (!hasActualInfo) return false;
      const isUpcoming = m._ottStatus === "Upcoming" || (m._ottReleaseDate && new Date(m._ottReleaseDate) > now);
      if (isUpcoming) return false;
      return m._ottStatus === "Streaming" || m._watchUrl || (m._ottReleaseDate && new Date(m._ottReleaseDate) <= now);
    })
    .sort((a: any, b: any) => {
      // Sort by latest added, since they are streaming
      return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
    });

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Now Streaming Ollywood Movies",
    description: metadata.description,
    url: `${SITE_URL}/ott/now-streaming`
  };

  return (
    <main className="min-h-screen bg-[#0a0a0a] pt-24 pb-20">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Breadcrumb crumbs={[{ label: "OTT", href: "/ott" }, { label: "Now Streaming" }]} />
        </div>
        <div className="flex items-center gap-3 mb-10 border-b border-white/10 pb-6">
          <div className="w-12 h-12 rounded-xl bg-orange-500/20 text-orange-500 flex items-center justify-center">
            <Play className="w-6 h-6 fill-current" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Now Streaming</h1>
            <p className="text-gray-400 mt-1">Odia movies available to watch online right now</p>
          </div>
        </div>

        {rawMovies.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
            {movies.map((movie: any, idx: number) => (
              <React.Fragment key={movie._id}>
                <MovieCard movie={movie} variant="ott" />
                {(idx + 1) % 7 === 0 && (
                  <div className="w-full h-full bg-[#111] border border-[#1f1f1f] rounded-xl overflow-hidden flex items-center justify-center">
                    <InFeedAd className="min-h-[250px] w-full h-full" />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-[#111] rounded-2xl border border-white/5">
            <Play className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">No Movies Found</h2>
            <p className="text-gray-400">There are currently no streaming movies indexed. Check back soon!</p>
          </div>
        )}
      </div>
    </main>
  );
}
