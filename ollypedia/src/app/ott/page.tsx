import type { Metadata } from "next";
import Link from "next/link";
import { connectDB } from "@/lib/db";
import Movie from "@/models/Movie";
import { buildMeta, SITE_NAME, SITE_URL } from "@/lib/seo";
import { ChevronRight, Play, Calendar, MonitorPlay } from "lucide-react";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { MovieCard } from "@/components/movie/MovieCard";
import { PlatformLogo } from "@/components/ui/PlatformLogo";
import { InFeedAd } from "@/components/ads/InFeedAd";
import { DisplayAd } from "@/components/ads/DisplayAd";
import React from "react";
export const revalidate = 600;

export const metadata: Metadata = buildMeta({
  title: `Watch Ollywood Movies on OTT | Latest Odia OTT Releases | ${SITE_NAME}`,
  description: "Discover the latest Ollywood movies streaming on Netflix, Prime Video, ZEE5, JioHotstar, and Sony LIV. Find Odia movie OTT release dates, streaming platforms, and digital premieres.",
  keywords: [
    "Ollywood OTT", "Odia Movie OTT Release", "Watch Odia Movies Online", 
    "Latest Odia OTT Release", "Odia Movie Streaming", "Netflix Odia Movies", 
    "Prime Video Odia Movies", "ZEE5 Odia Movies", "Upcoming OTT Release Odia", 
    "Digital Premiere Odia Movies"
  ],
  url: "/ott",
});

const PLATFORMS = [
  { name: "AAO NXT", slug: "aao-nxt", color: "#1B4FD8", domain: "aaonxt.com" },
  { name: "Tarang Plus", slug: "tarang-plus", color: "#ED1C24", domain: "tarangplus.in" },
  { name: "Kancha Lanka", slug: "kancha-lanka", color: "#F7931E", domain: "kanchalanka.com" },
  { name: "YouTube", slug: "youtube", color: "#FF0000", domain: "youtube.com" },
];

// Normalize both legacy (streamingOn) and new (ott.platform) fields
function normalizeMovie(m: any) {
  const platform = m.ott?.platform || m.streamingOn || "";
  const watchUrl = m.ott?.watchUrl || m.streamingUrl || "";
  const releaseDate = m.ott?.releaseDate || m.ottReleaseDate || "";
  const status = m.ott?.status || (watchUrl ? "Streaming" : releaseDate ? "Upcoming" : "");
  return { ...m, _id: m._id.toString(), _platform: platform, _watchUrl: watchUrl, _ottReleaseDate: releaseDate, _ottStatus: status };
}

export default async function OttLandingPage() {
  await connectDB();
  
  // Fetch movies with OTT data — supports both new ott.platform and legacy streamingOn
  const rawMovies = await Movie.find({
    $or: [
      { "ott.platform": { $ne: "" } },
      { streamingOn: { $ne: "", $exists: true } },
    ]
  })
    .select("_id title slug posterUrl verdict releaseDate ott streamingOn streamingUrl ottReleaseDate")
    .sort({ updatedAt: -1 })
    .lean()
    .exec();

  const movies = (rawMovies as any[]).map(normalizeMovie);
  const now = new Date();
  
  // Latest OTT Releases (Streaming)
  const streamingMovies = movies
    .filter((m: any) => {
      const isUpcoming = m._ottStatus === "Upcoming" || (m._ottReleaseDate && new Date(m._ottReleaseDate) > now);
      if (isUpcoming) return false;
      return m._ottStatus === "Streaming" || m._watchUrl || (m._ottReleaseDate && new Date(m._ottReleaseDate) <= now);
    })
    .slice(0, 10);

  // Upcoming OTT Releases
  const upcomingMovies = movies
    .filter((m: any) => m._ottStatus === "Upcoming" || (m._ottReleaseDate && new Date(m._ottReleaseDate) > now))
    .sort((a: any, b: any) => new Date(a._ottReleaseDate || 0).getTime() - new Date(b._ottReleaseDate || 0).getTime())
    .slice(0, 10);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Ollywood OTT Release Hub",
    description: metadata.description,
    url: `${SITE_URL}/ott`
  };

  return (
    <main className="min-h-screen bg-[#0a0a0a] pb-20">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      
      {/* ── OTT Hero Section ── */}
      <section className="relative overflow-hidden pt-12 pb-12 md:pt-20 md:pb-20 border-b border-white/5">
        
        {/* Background Effects */}
        <div className="absolute inset-0 pointer-events-none">
           {/* Glows */}
           <div className="absolute top-0 right-0 w-[800px] h-[600px] bg-red-600/10 blur-[120px] rounded-full translate-x-1/3 -translate-y-1/4" />
           <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-orange-600/10 blur-[120px] rounded-full -translate-x-1/3 translate-y-1/3" />
           {/* Grid */}
           <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="relative grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
            
            {/* Left Content */}
            <div className="space-y-8 text-center lg:text-left flex flex-col items-center lg:items-start">
              
              <div className="w-full flex justify-center lg:justify-start">
                 <Breadcrumb crumbs={[{ label: "OTT" }]} />
              </div>

              <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full border text-xs font-bold uppercase tracking-widest"
                style={{ color: "#f97316", borderColor: "rgba(249,115,22,0.3)", background: "rgba(249,115,22,0.08)" }}>
                {/* Pulsing dot */}
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500" />
                </span>
                <MonitorPlay className="w-3.5 h-3.5" />
                Digital Premieres
              </div>

              <h1 className="font-black text-white leading-[1.1]" style={{ fontSize: "clamp(2.5rem, 5vw, 4rem)" }}>
                Watch Ollywood Movies <br className="hidden md:block" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 via-red-500 to-pink-500">
                  on OTT
                </span>
              </h1>

              <p className="text-gray-400 leading-relaxed max-w-lg mx-auto lg:mx-0" style={{ fontSize: "clamp(1rem, 1.5vw, 1.15rem)" }}>
                Discover the latest Odia movies streaming on platforms like AAO NXT, Tarang Plus, Kancha Lanka, and more. 
                <strong className="text-white font-semibold"> Your ultimate guide to digital releases.</strong>
              </p>

              <div className="flex flex-wrap justify-center lg:justify-start gap-4">
                <Link href="/ott/now-streaming" className="group px-8 py-4 rounded-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-400 hover:to-red-500 text-white font-bold transition-all shadow-[0_0_20px_rgba(249,115,22,0.4)] hover:shadow-[0_0_30px_rgba(249,115,22,0.6)] flex items-center gap-2">
                  <Play className="w-5 h-5 fill-current group-hover:scale-110 transition-transform" />
                  Now Streaming
                </Link>
                <Link href="/ott/upcoming" className="group px-8 py-4 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold transition-all flex items-center gap-2">
                  <Calendar className="w-5 h-5 group-hover:text-orange-400 transition-colors" />
                  Upcoming Releases
                </Link>
              </div>
            </div>

            {/* Right Visual Panel */}
            <div className="absolute right-0 sm:-right-4 top-0 lg:relative lg:right-auto lg:top-auto flex items-center justify-center min-h-[300px] lg:min-h-[400px] scale-[0.55] sm:scale-75 lg:scale-100 origin-top-right lg:origin-center pointer-events-none lg:pointer-events-auto opacity-20 sm:opacity-40 lg:opacity-100 z-0 lg:z-10">
               <div className="relative w-full h-full perspective-[1000px] flex items-center justify-center">
                 
                 {/* Back Glow */}
                 <div className="absolute w-64 h-64 bg-red-600/20 blur-[100px] rounded-full animate-pulse" />

                 {/* Screen 3 (Back left) */}
                 <div className="absolute w-64 h-40 rounded-2xl border border-white/10 bg-black/80 backdrop-blur-md shadow-2xl -translate-x-24 -translate-y-8 -rotate-12 opacity-50 flex flex-col overflow-hidden transition-transform duration-700 hover:-translate-y-12 hover:-rotate-6 hover:opacity-80">
                   <div className="h-6 border-b border-white/10 bg-white/5 flex items-center px-3 gap-1.5">
                     <div className="w-2 h-2 rounded-full bg-white/20" />
                     <div className="w-2 h-2 rounded-full bg-white/20" />
                     <div className="w-2 h-2 rounded-full bg-white/20" />
                   </div>
                   <div className="flex-1 bg-gradient-to-br from-blue-600/20 to-transparent flex items-center justify-center">
                     <MonitorPlay className="w-10 h-10 text-blue-500/40" />
                   </div>
                 </div>

                 {/* Screen 2 (Back right) */}
                 <div className="absolute w-64 h-40 rounded-2xl border border-white/10 bg-black/80 backdrop-blur-md shadow-2xl translate-x-24 -translate-y-4 rotate-12 opacity-60 flex flex-col overflow-hidden transition-transform duration-700 hover:-translate-y-8 hover:rotate-6 hover:opacity-90">
                   <div className="h-6 border-b border-white/10 bg-white/5 flex items-center px-3 gap-1.5">
                     <div className="w-2 h-2 rounded-full bg-white/20" />
                     <div className="w-2 h-2 rounded-full bg-white/20" />
                     <div className="w-2 h-2 rounded-full bg-white/20" />
                   </div>
                   <div className="flex-1 bg-gradient-to-br from-orange-600/20 to-transparent flex items-center justify-center">
                     <MonitorPlay className="w-10 h-10 text-orange-500/40" />
                   </div>
                 </div>

                 {/* Screen 1 (Front center) */}
                 <div className="absolute w-80 h-48 rounded-2xl border border-orange-500/40 bg-black/90 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden z-10 translate-y-8 hover:-translate-y-2 transition-all duration-500 hover:shadow-[0_20px_60px_rgba(249,115,22,0.2)] hover:border-orange-400/60 cursor-default">
                   <div className="h-8 border-b border-white/10 bg-gradient-to-r from-orange-500/10 to-transparent flex items-center px-4 gap-2">
                     <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                     <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                     <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                   </div>
                   <div className="flex-1 relative overflow-hidden bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-orange-900/30 via-black to-black flex items-center justify-center">
                     {/* Play Button */}
                     <div className="w-16 h-16 rounded-full bg-orange-600/20 border border-orange-500/50 flex items-center justify-center shadow-[0_0_30px_rgba(249,115,22,0.3)] animate-pulse">
                        <Play className="w-6 h-6 text-orange-400 fill-orange-400 ml-1" />
                     </div>
                     
                     {/* Floating mini chips */}
                     <div className="absolute bottom-4 left-4 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-[10px] font-bold text-white flex items-center gap-1.5 shadow-lg">
                       <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> 4K Streaming
                     </div>
                     <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-orange-500/20 border border-orange-500/30 text-[10px] font-bold text-orange-300 flex items-center gap-1.5 shadow-lg">
                       Latest Drops
                     </div>
                   </div>
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-20">
        
        {/* Browse By Platform */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              Browse by Platform
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {PLATFORMS.map((p) => (
              <Link 
                key={p.slug} 
                href={`/ott/platform/${p.slug}`}
                className="bg-[#111] hover:bg-[#1a1a1a] border border-white/5 hover:border-white/10 transition-all rounded-xl p-6 flex flex-col items-center justify-center text-center gap-4 group"
              >
                <div className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center bg-white shadow-lg border-2 border-transparent group-hover:border-white/20 transition-all" style={{ boxShadow: `0 4px 20px ${p.color}20` }}>
                  <PlatformLogo 
                    name={p.name}
                    domain={p.domain}
                    slug={p.slug}
                    color={p.color}
                    className="w-10 h-10 object-contain transition-transform group-hover:scale-110" 
                  />
                </div>
                <span className="font-semibold text-gray-300 group-hover:text-white transition-colors">{p.name}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* Upcoming OTT Releases */}
        {upcomingMovies.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-500 flex items-center justify-center">
                  <Calendar className="w-5 h-5" />
                </span>
                Upcoming on OTT
              </h2>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
              {upcomingMovies.map((movie: any, idx: number) => (
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
            
            <div className="mt-8 flex justify-center">
              <Link 
                href="/ott/upcoming" 
                className="px-6 py-2.5 rounded-full border border-white/10 hover:border-blue-500 hover:bg-blue-500/10 text-gray-300 hover:text-white font-medium text-sm transition-all flex items-center gap-2"
              >
                View All Upcoming <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </section>
        )}

        {/* Latest OTT Releases */}
        {streamingMovies.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-orange-500/20 text-orange-500 flex items-center justify-center">
                  <Play className="w-5 h-5 fill-current" />
                </span>
                Latest OTT Releases
              </h2>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
              {streamingMovies.map((movie: any, idx: number) => (
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
            
            <div className="mt-8 flex justify-center">
              <Link 
                href="/ott/now-streaming" 
                className="px-6 py-2.5 rounded-full border border-white/10 hover:border-orange-500 hover:bg-orange-500/10 text-gray-300 hover:text-white font-medium text-sm transition-all flex items-center gap-2"
              >
                View All Streaming <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </section>
        )}

        {/* No data placeholder */}
        {streamingMovies.length === 0 && upcomingMovies.length === 0 && (
          <div className="text-center py-20 bg-[#111] rounded-2xl border border-white/5">
            <MonitorPlay className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">OTT Data Coming Soon</h2>
            <p className="text-gray-400 max-w-md mx-auto">Admins can add OTT platform info to each movie via the admin panel. Check back soon!</p>
          </div>
        )}

        {/* SEO Content Section */}
        <section className="pt-16 border-t border-white/5">
          <article className="prose prose-invert prose-orange max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold mb-6 text-white text-center">The Ultimate Guide to Ollywood OTT Releases</h2>
            
            <p className="text-gray-300 text-lg leading-relaxed mb-6 text-justify">
              The Odia film industry, affectionately known as Ollywood, is undergoing a massive digital transformation. With the rise of high-speed internet and smartphone penetration across Odisha, viewers are no longer restricted to single-screen theaters or multiplexes to catch their favorite stars in action. <strong>OTT (Over-The-Top) platforms</strong> have revolutionized how Odia cinema is consumed, offering unparalleled convenience, accessibility, and high-quality streaming right at your fingertips.
            </p>

            <h3 className="text-2xl font-semibold mt-10 mb-4 text-white">Streaming Platforms Championing Odia Cinema</h3>
            <p className="text-gray-300 leading-relaxed mb-6 text-justify">
              Several prominent streaming services have recognized the potential of Odia content. Platforms like <strong>AAO NXT</strong> and <strong>Tarang Plus</strong> are leading the charge, offering extensive libraries of classic Odia films, recent blockbusters, and original web series. AAO NXT, in particular, focuses heavily on Odia originals, while Tarang Plus provides a mix of television catch-up content and exclusive digital premieres. National platforms are also gradually adding Odia content to cater to the regional audience.
            </p>

            <h3 className="text-2xl font-semibold mt-10 mb-4 text-white">Why Watch Odia Movies on OTT?</h3>
            <ul className="list-disc pl-6 space-y-3 text-gray-300 mb-8 text-justify">
              <li><strong>Convenience & Flexibility:</strong> Watch your favorite movies anytime, anywhere, on your smartphone, tablet, or smart TV. Pause, rewind, and re-watch at your own pace.</li>
              <li><strong>High-Quality Viewing:</strong> Enjoy movies in HD and 4K resolutions with superior audio quality, bringing the theatrical experience to your living room.</li>
              <li><strong>Diverse Content Library:</strong> Discover hidden gems, critically acclaimed indie films, and regional cinema that might have had limited theatrical releases.</li>
              <li><strong>Affordability:</strong> Most OTT platforms offer competitive subscription plans, making it a cost-effective way to consume a wide variety of content.</li>
            </ul>

            <h3 className="text-2xl font-semibold mt-10 mb-4 text-white">Stay Updated with Ollypedia</h3>
            <p className="text-gray-300 leading-relaxed text-justify">
              Ollypedia is your one-stop destination for all things related to Ollywood OTT releases. We track the latest announcements, release dates, and streaming platforms so you never miss a beat. Whether you're looking for an action-packed thriller, a heartwarming romance, or a thought-provoking drama, our comprehensive database will guide you to the right platform. Bookmark this page and check back regularly for the freshest updates on Odia cinema in the digital space.
            </p>
          </article>
        </section>

      </div>
    </main>
  );
}
