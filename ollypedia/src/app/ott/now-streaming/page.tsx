import type { Metadata } from "next";
import { connectDB } from "@/lib/db";
import Movie from "@/models/Movie";
import { buildMeta, SITE_NAME, SITE_URL } from "@/lib/seo";
import { MovieCard } from "@/components/movie/MovieCard";
import { Play } from "lucide-react";

import { Breadcrumb } from "@/components/ui/Breadcrumb";

export const revalidate = 600;

export const metadata: Metadata = buildMeta({
  title: `Now Streaming Ollywood Movies | Latest Odia OTT Releases | ${SITE_NAME}`,
  description: "Watch the latest Odia movies now streaming on various OTT platforms. Browse our comprehensive list of released Ollywood digital premieres.",
  keywords: ["Odia Movies Streaming Now", "Watch Odia Movies Online", "Latest Odia OTT Release", "Ollywood OTT"],
  url: "/ott/now-streaming",
});

export default async function NowStreamingPage() {
  await connectDB();
  
  // Query supports both legacy streamingOn/streamingUrl and new ott fields
  const rawMovies = await Movie.find({
    $or: [
      { streamingUrl: { $ne: "", $exists: true } },  // legacy: has a watch URL = streaming
      { "ott.watchUrl": { $ne: "", $exists: true } },  // new: ott watch url
      { "ott.status": "Streaming" },                    // new: ott status is streaming
    ]
  })
    .select("_id title slug posterUrl verdict releaseDate ott streamingOn streamingUrl ottReleaseDate")
    .sort({ updatedAt: -1 })
    .lean()
    .exec();

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
            {rawMovies.map((movie: any) => (
              <MovieCard key={movie._id} movie={movie} variant="ott" />
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
