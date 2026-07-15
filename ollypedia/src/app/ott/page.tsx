import type { Metadata } from "next";
import Link from "next/link";
import { connectDB } from "@/lib/db";
import Movie from "@/models/Movie";
import { buildMeta, SITE_NAME, SITE_URL } from "@/lib/seo";
import { ChevronRight, Play, Calendar, MonitorPlay } from "lucide-react";
import { MovieCard } from "@/components/movie/MovieCard";

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
  { name: "AAO NXT", slug: "aao-nxt", color: "#1B4FD8" },
  { name: "Tarang Plus", slug: "tarang-plus", color: "#ED1C24" },
  { name: "Kancha Lanka", slug: "kancha-lanka", color: "#F7931E" },
  { name: "YouTube", slug: "youtube", color: "#FF0000" },
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
      
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 lg:px-12 border-b border-white/5 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-purple-600/10 pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-orange-500/20 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="max-w-7xl mx-auto relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 font-medium text-sm mb-6">
            <MonitorPlay className="w-4 h-4" />
            <span>Digital Premieres</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tight">
            Watch Ollywood Movies <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">on OTT</span>
          </h1>
          <p className="text-gray-400 text-lg md:text-xl max-w-3xl mx-auto mb-10 leading-relaxed">
            Discover the latest Odia movies streaming on platforms like AAO NXT, Tarang Plus, Kancha Lanka, and more.
          </p>
          
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/ott/now-streaming" className="px-8 py-3.5 rounded-full bg-orange-500 hover:bg-orange-600 text-white font-bold transition-all flex items-center gap-2">
              <Play className="w-5 h-5 fill-current" />
              Now Streaming
            </Link>
            <Link href="/ott/upcoming" className="px-8 py-3.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold transition-all flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Upcoming Releases
            </Link>
          </div>
        </div>
      </section>

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
                className="bg-[#111] hover:bg-[#1a1a1a] border border-white/5 hover:border-white/10 transition-all rounded-xl p-6 flex flex-col items-center justify-center text-center gap-3 group"
              >
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: `${p.color}22`, color: p.color }}>
                  <MonitorPlay className="w-6 h-6" />
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
              {upcomingMovies.map((movie: any) => (
                <MovieCard key={movie._id} movie={movie} variant="ott" />
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
              {streamingMovies.map((movie: any) => (
                <MovieCard key={movie._id} movie={movie} variant="ott" />
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
