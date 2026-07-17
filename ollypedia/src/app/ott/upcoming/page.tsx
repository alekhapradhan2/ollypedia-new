import type { Metadata } from "next";
import { connectDB } from "@/lib/db";
import Movie from "@/models/Movie";
import { buildMeta, SITE_NAME, SITE_URL } from "@/lib/seo";
import { MovieCard } from "@/components/movie/MovieCard";
import { Calendar } from "lucide-react";

import { Breadcrumb } from "@/components/ui/Breadcrumb";

export const revalidate = 600;

export const metadata: Metadata = buildMeta({
  title: `Upcoming Ollywood OTT Releases | ${SITE_NAME}`,
  description: "Check out the upcoming Odia movies releasing on OTT platforms. Find out when your favorite Ollywood movies will be available for streaming.",
  keywords: ["Upcoming OTT Release Odia", "Odia Movie Digital Premiere", "Upcoming Odia Movies OTT", "Ollywood OTT"],
  url: "/ott/upcoming",
});

export default async function UpcomingOttPage() {
  await connectDB();
  const now = new Date();
  
  // Query supports both legacy streamingOn (without streamingUrl = upcoming) and new ott fields
  const rawMovies = await Movie.find({
    $or: [
      // New ott field - upcoming status OR future release date
      { "ott.status": "Upcoming" },
      { "ott.releaseDate": { $gt: now.toISOString() } },
      // Legacy: has platform/streaming info but no watch URL yet
      {
        streamingOn: { $ne: "", $exists: true },
        streamingUrl: { $in: ["", null, undefined] }
      },
      // Legacy: has ottReleaseDate in the future
      { ottReleaseDate: { $gt: now.toISOString() } },
    ]
  })
    .select("_id title slug posterUrl verdict releaseDate ott streamingOn streamingUrl ottReleaseDate")
    .sort({ "ott.releaseDate": 1, ottReleaseDate: 1 })
    .lean()
    .exec();

  const normalizeMovie = (m: any) => {
    const p = m.ott?.platform || m.streamingOn || "";
    const watchUrl = m.ott?.watchUrl || m.streamingUrl || "";
    const releaseDate = m.ott?.releaseDate || m.ottReleaseDate || "";
    const status = m.ott?.status || (watchUrl ? "Streaming" : releaseDate ? "Upcoming" : "");
    return { ...m, _id: m._id.toString(), _platform: p, _watchUrl: watchUrl, _ottReleaseDate: releaseDate, _ottStatus: status };
  };

  const movies = (rawMovies as any[]).map(normalizeMovie);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Upcoming Ollywood OTT Releases",
    description: metadata.description,
    url: `${SITE_URL}/ott/upcoming`
  };

  return (
    <main className="min-h-screen bg-[#0a0a0a] pt-24 pb-20">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Breadcrumb crumbs={[{ label: "OTT", href: "/ott" }, { label: "Upcoming" }]} />
        </div>
        <div className="flex items-center gap-3 mb-10 border-b border-white/10 pb-6">
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-500 flex items-center justify-center">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Upcoming OTT Releases</h1>
            <p className="text-gray-400 mt-1">Odia movies premiering soon on digital platforms</p>
          </div>
        </div>

        {rawMovies.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
            {movies.map((movie: any) => (
              <MovieCard key={movie._id} movie={movie} variant="ott" />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-[#111] rounded-2xl border border-white/5">
            <Calendar className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">No Upcoming Releases</h2>
            <p className="text-gray-400">There are currently no upcoming Odia OTT releases scheduled. Please check back later!</p>
          </div>
        )}
      </div>
    </main>
  );
}
