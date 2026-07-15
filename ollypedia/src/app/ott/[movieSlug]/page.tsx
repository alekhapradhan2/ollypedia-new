import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { connectDB } from "@/lib/db";
import Movie from "@/models/Movie";
import { buildOttMeta, generateOttJsonLd, OTTMovie } from "@/lib/ottSeo";
import { Play, Calendar, MonitorPlay, Film, Users, Languages, Clock, ShieldAlert, CheckCircle2 } from "lucide-react";
import { MovieCard } from "@/components/movie/MovieCard";
import { Breadcrumb } from "@/components/ui/Breadcrumb";

export const revalidate = 600;

export async function generateMetadata({ params }: { params: { movieSlug: string } }): Promise<Metadata> {
  await connectDB();
  const movie = await Movie.findOne({ 
    slug: params.movieSlug,
    $or: [
      { "ott.platform": { $ne: "" } },
      { streamingOn: { $ne: "", $exists: true } },
    ]
  }).lean().exec();
  if (!movie) return {};
  return buildOttMeta(movie as unknown as OTTMovie);
}

export default async function OttMovieDetailPage({ params }: { params: { movieSlug: string } }) {
  await connectDB();
  
  // Find movie that has OTT data — either new ott.platform or legacy streamingOn
  const movie = await Movie.findOne({ 
    slug: params.movieSlug,
    $or: [
      { "ott.platform": { $ne: "" } },
      { streamingOn: { $ne: "", $exists: true } },
    ]
  }).lean().exec();
  
  if (!movie) return notFound();

  const m = movie as any;
  
  // Normalize OTT data — prioritize new ott object, fall back to legacy fields
  const ott = {
    platform: m.ott?.platform || m.streamingOn || "",
    releaseDate: m.ott?.releaseDate || m.ottReleaseDate || "",
    status: m.ott?.status || (m.streamingUrl ? "Streaming" : "Upcoming"),
    watchUrl: m.ott?.watchUrl || m.streamingUrl || "",
    languages: m.ott?.languages || [],
    subtitles: m.ott?.subtitles || [],
    quality: m.ott?.quality || "",
    runtime: m.ott?.runtime || m.runtime || "",
  };

  const jsonLd = generateOttJsonLd({ ...m, ott } as unknown as OTTMovie);
  
  // Find related movies on same platform (supports legacy + new)
  const relatedMovies = await Movie.find({
    _id: { $ne: m._id },
    $or: [
      { "ott.platform": { $regex: new RegExp(`^${ott.platform}$`, "i") } },
      { streamingOn: { $regex: new RegExp(`^${ott.platform}$`, "i") } },
    ]
  })
    .select("_id title slug posterUrl verdict releaseDate ott streamingOn streamingUrl")
    .limit(5)
    .lean()
    .exec();

  const now = new Date();
  const isUpcoming = ott.status === "Upcoming" || (ott.releaseDate && new Date(ott.releaseDate) > now);
  const isStreaming = !isUpcoming && (ott.status === "Streaming" || ott.watchUrl !== "");
  const formattedDate = ott.releaseDate && ott.releaseDate !== "TBA" 
    ? new Date(ott.releaseDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
    : "TBA";

  // Derive director — prefer the `director` text field, fall back to cast array
  const directorFromCast = (m.cast || []).find(
    (c: any) => (c.role || c.type || "").toLowerCase().includes("director")
  );
  const directorName = m.director || directorFromCast?.name || "N/A";

  return (
    <main className="min-h-screen bg-[#0a0a0a] pb-20">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      
      {/* Hero Banner */}
      <section className="relative w-full min-h-[60vh] lg:min-h-[500px] border-b border-white/10 pt-32 flex items-end">
        <div className="absolute inset-0">
          <Image
            src={m.bannerUrl || m.posterUrl || "/placeholder.jpg"}
            alt={m.title}
            fill
            className="object-cover object-top opacity-30 blur-sm"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a] via-[#0a0a0a]/50 to-transparent" />
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full pb-16">
          <div className="mb-6">
            <Breadcrumb crumbs={[{ label: "OTT", href: "/ott" }, { label: "Movies", href: "/ott" }, { label: m.title }]} />
          </div>
          <div className="flex flex-col md:flex-row gap-8 items-end md:items-start">
            <div className="w-48 md:w-64 flex-shrink-0 rounded-2xl overflow-hidden border-2 border-white/10 shadow-2xl relative aspect-[2/3] mt-auto hidden md:block">
              <Image src={m.posterUrl || "/placeholder.jpg"} alt={m.title} fill className="object-cover" />
            </div>
            
            <div className="flex-1 mt-auto">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white text-sm font-medium mb-4">
                <MonitorPlay className="w-4 h-4 text-orange-500" />
                {ott.platform}
              </div>
              <h1 className="text-4xl md:text-6xl font-black text-white mb-2">{m.title}</h1>
              
              <div className="flex flex-wrap items-center gap-4 text-gray-300 text-sm mb-8">
                {m.genre?.map((g: string) => (
                  <span key={g} className="px-2 py-1 rounded-md bg-white/5">{g}</span>
                ))}
                {ott.runtime && <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {ott.runtime}</span>}
                {m.contentRating && <span className="px-2 py-0.5 border border-gray-600 rounded text-xs">{m.contentRating}</span>}
              </div>
              
              <div className="flex flex-wrap items-center gap-4">
                {ott.watchUrl && isStreaming ? (
                  <a href={ott.watchUrl} target="_blank" rel="noopener noreferrer" className="px-8 py-3.5 rounded-full bg-orange-500 hover:bg-orange-600 text-white font-bold transition-all flex items-center gap-2 text-lg">
                    <Play className="w-5 h-5 fill-current" />
                    Watch on {ott.platform}
                  </a>
                ) : (
                  <button disabled className="px-8 py-3.5 rounded-full bg-white/10 text-gray-400 font-bold flex items-center gap-2 text-lg cursor-not-allowed">
                    <Calendar className="w-5 h-5" />
                    {isStreaming ? "Currently Unavailable" : "Coming Soon"}
                  </button>
                )}
                
                <Link href={`/movie/${m.slug || m._id}`} className="px-8 py-3.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold transition-all flex items-center gap-2 text-lg">
                  <Film className="w-5 h-5" />
                  Full Movie Details
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Left Column - Main Info */}
        <div className="lg:col-span-2 space-y-12">
          {m.synopsis && (
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">Synopsis</h2>
              <p className="text-gray-300 text-lg leading-relaxed text-justify">{m.synopsis}</p>
            </section>
          )}

          <section>
            <h2 className="text-2xl font-bold text-white mb-6">OTT Streaming Information</h2>
            <div className="bg-[#111] border border-white/10 rounded-2xl p-6 md:p-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-gray-500 text-sm font-semibold uppercase tracking-wider mb-2">Platform</h3>
                  <p className="text-white font-medium text-lg flex items-center gap-2">
                    <MonitorPlay className="w-5 h-5 text-orange-500" />
                    {ott.platform}
                  </p>
                </div>
                
                <div>
                  <h3 className="text-gray-500 text-sm font-semibold uppercase tracking-wider mb-2">Digital Premiere</h3>
                  <p className="text-white font-medium text-lg flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-blue-500" />
                    {formattedDate}
                  </p>
                </div>

                <div>
                  <h3 className="text-gray-500 text-sm font-semibold uppercase tracking-wider mb-2">Streaming Status</h3>
                  <p className="text-white font-medium text-lg flex items-center gap-2">
                    {isStreaming ? (
                      <><CheckCircle2 className="w-5 h-5 text-green-500" /> Now Streaming</>
                    ) : (
                      <><Clock className="w-5 h-5 text-yellow-500" /> Upcoming</>
                    )}
                  </p>
                </div>
                
                {ott.quality && (
                  <div>
                    <h3 className="text-gray-500 text-sm font-semibold uppercase tracking-wider mb-2">Video Quality</h3>
                    <p className="text-white font-medium text-lg flex items-center gap-2">
                      <ShieldAlert className="w-5 h-5 text-purple-500" />
                      {ott.quality}
                    </p>
                  </div>
                )}
                
                {ott.languages && ott.languages.length > 0 && (
                  <div>
                    <h3 className="text-gray-500 text-sm font-semibold uppercase tracking-wider mb-2">Audio Languages</h3>
                    <div className="flex flex-wrap gap-2">
                      {ott.languages.map((l: string) => (
                        <span key={l} className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-gray-300 text-sm flex items-center gap-1">
                          <Languages className="w-3.5 h-3.5" /> {l}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {ott.subtitles && ott.subtitles.length > 0 && (
                  <div>
                    <h3 className="text-gray-500 text-sm font-semibold uppercase tracking-wider mb-2">Subtitles</h3>
                    <div className="flex flex-wrap gap-2">
                      {ott.subtitles.map((s: string) => (
                        <span key={s} className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-gray-300 text-sm flex items-center gap-1">
                          <Languages className="w-3.5 h-3.5" /> {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Cast Preview */}
          {m.cast && m.cast.length > 0 && (
            <section>
              <h2 className="text-2xl font-bold text-white mb-6">Primary Cast</h2>
              <div className="flex flex-wrap gap-6">
                {m.cast.slice(0, 5).map((c: any) => (
                  <div key={c.name} className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-[#222] relative">
                      {c.photo ? (
                        <Image src={c.photo} alt={c.name} fill className="object-cover" />
                      ) : (
                        <Users className="w-6 h-6 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-gray-500" />
                      )}
                    </div>
                    <div>
                      <p className="text-white font-medium">{c.name}</p>
                      <p className="text-gray-400 text-sm">{c.role || c.type}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Auto-generated FAQ */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-6">Frequently Asked Questions</h2>
            <div className="space-y-4">
              <div className="bg-[#111] p-5 rounded-xl">
                <h3 className="text-white font-semibold mb-2">Where can I watch {m.title} online?</h3>
                <p className="text-gray-400">{m.title} is {isStreaming ? "currently available to stream" : "scheduled to release"} on {ott.platform}.</p>
              </div>
              <div className="bg-[#111] p-5 rounded-xl">
                <h3 className="text-white font-semibold mb-2">When was {m.title} released on OTT?</h3>
                <p className="text-gray-400">The digital premiere date for {m.title} is {formattedDate}.</p>
              </div>
              {ott.languages && ott.languages.length > 0 && (
                <div className="bg-[#111] p-5 rounded-xl">
                  <h3 className="text-white font-semibold mb-2">In which languages is {m.title} available?</h3>
                  <p className="text-gray-400">The movie is available in {ott.languages.join(", ")} audio.</p>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-8">
          <div className="bg-[#111] border border-white/5 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-4 border-b border-white/10 pb-2">Theatrical Details</h3>
            <ul className="space-y-4">
              <li>
                <span className="block text-gray-500 text-sm">Director</span>
                <span className="text-white">{directorName}</span>
              </li>
              <li>
                <span className="block text-gray-500 text-sm">Theatrical Release</span>
                <span className="text-white">{m.releaseDate ? new Date(m.releaseDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "TBA"}</span>
              </li>
              <li>
                <span className="block text-gray-500 text-sm">Box Office</span>
                <span className="text-white">{m.boxOffice?.total || "N/A"}</span>
              </li>
              <li>
                <span className="block text-gray-500 text-sm">Verdict</span>
                <span className="text-white">{m.verdict || "N/A"}</span>
              </li>
            </ul>
          </div>

          {relatedMovies.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-white mb-4">More on {ott.platform}</h3>
              <div className="grid grid-cols-2 gap-4">
                {(relatedMovies as any[]).map((rm: any) => (
                  <MovieCard key={rm._id} movie={rm} />
                ))}
              </div>
              <Link href={`/ott/platform/${ott.platform.toLowerCase().replace(/\s+/g, "-")}`} className="block w-full text-center py-3 mt-4 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-semibold transition-colors">
                View All
              </Link>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
