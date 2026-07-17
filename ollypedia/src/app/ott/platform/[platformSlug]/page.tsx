import type { Metadata } from "next";
import Link from "next/link";
import { connectDB } from "@/lib/db";
import Movie from "@/models/Movie";
import { buildMeta, SITE_NAME, SITE_URL } from "@/lib/seo";
import { MovieCard } from "@/components/movie/MovieCard";
import { MonitorPlay, ExternalLink, Film, Play, Star, ChevronRight } from "lucide-react";
import { Breadcrumb } from "@/components/ui/Breadcrumb";

export const revalidate = 600;

const PLATFORMS: Record<string, {
  name: string; slug: string; color: string; gradient: string;
  visitUrl: string; tagline: string; description: string;
  features: string[]; about: string;
}> = {
  "aao-nxt": {
    name: "AAO NXT", slug: "aao-nxt", color: "#1B4FD8",
    gradient: "from-blue-900/40 to-[#0a0a0a]",
    visitUrl: "https://www.aaonxt.com",
    tagline: "The Home of Ollywood on OTT",
    description: "AAO NXT is the premier Odia OTT platform dedicated exclusively to Ollywood content. Stream the latest and greatest Odia movies, web series, and original content on AAO NXT.",
    features: ["Exclusive Odia Content", "HD Streaming", "Latest Ollywood Movies", "Odia Web Series", "Mobile & Smart TV Apps"],
    about: "AAO NXT is the go-to destination for Odia entertainment, offering a massive library of Odia movies, TV shows, and original web series. As the largest dedicated Odia OTT platform, AAO NXT brings the best of Ollywood directly to your screen.",
  },
  "tarang-plus": {
    name: "Tarang Plus", slug: "tarang-plus", color: "#ED1C24",
    gradient: "from-red-900/40 to-[#0a0a0a]",
    visitUrl: "https://www.tarangplus.in",
    tagline: "Your Favourite Odia Entertainment",
    description: "Tarang Plus is Odisha's leading OTT platform from the Tarang TV network. Watch Odia movies, serials, and exclusive digital content anytime, anywhere.",
    features: ["Odia Movies & Serials", "Live TV Streaming", "Exclusive Digital Shows", "Tarang TV Content", "Free & Premium Plans"],
    about: "Tarang Plus is the official OTT extension of Tarang TV, one of Odisha's most popular television channels. The platform offers an extensive collection of Odia movies, popular serials, and exclusive digital-first content, making it a must-have for Odia entertainment lovers.",
  },
  "kancha-lanka": {
    name: "Kancha Lanka", slug: "kancha-lanka", color: "#F7931E",
    gradient: "from-orange-900/40 to-[#0a0a0a]",
    visitUrl: "https://www.kanchalanka.com",
    tagline: "Odia Movies. Anytime. Anywhere.",
    description: "Kancha Lanka is a dedicated Odia streaming platform offering a curated library of Ollywood films, folk content, and regional entertainment.",
    features: ["Odia Movie Library", "Folk & Regional Content", "HD Quality Streams", "Multi-device Support", "Exclusive Ollywood Titles"],
    about: "Kancha Lanka is a growing Odia OTT platform that has quickly become a favourite among Odia movie lovers. It offers an ever-growing library of Odia films from blockbusters to independent cinema, along with folk, devotional, and cultural content.",
  },
  "youtube": {
    name: "YouTube", slug: "youtube", color: "#FF0000",
    gradient: "from-red-900/30 to-[#0a0a0a]",
    visitUrl: "https://www.youtube.com",
    tagline: "Free Odia Movies on YouTube",
    description: "Many Odia movies are available for free on YouTube. Watch full-length Ollywood films officially uploaded by production houses on YouTube.",
    features: ["Free to Watch", "Official Movie Channels", "HD Quality Available", "Subtitles & Captions", "Available Worldwide"],
    about: "YouTube has emerged as a major free platform for Odia movies, with many production houses and distributors officially uploading full-length Ollywood films. From classics to recent releases, YouTube offers a wide range of Odia content at no cost.",
  },
};

export async function generateMetadata({ params }: { params: { platformSlug: string } }): Promise<Metadata> {
  const platform = PLATFORMS[params.platformSlug];
  if (!platform) return buildMeta({ title: "Not Found", description: "Platform not found", url: "" });

  return buildMeta({
    title: `Watch Odia Movies on ${platform.name} | Ollywood ${platform.name} Releases | ${SITE_NAME}`,
    description: platform.description,
    keywords: [
      `${platform.name} Odia Movies`,
      `Watch Odia Movies on ${platform.name}`,
      `Ollywood ${platform.name} Release`,
      `${platform.name} Odia streaming`,
      "Odia Movie OTT", "Ollywood OTT",
    ],
    url: `/ott/platform/${platform.slug}`,
  });
}

export default async function OttPlatformPage({ params }: { params: { platformSlug: string } }) {
  await connectDB();
  const platform = PLATFORMS[params.platformSlug];

  if (!platform) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center flex-col gap-4 text-white">
        <MonitorPlay className="w-16 h-16 text-gray-600" />
        <h1 className="text-2xl font-bold">Platform Not Found</h1>
        <Link href="/ott" className="text-orange-500 hover:text-orange-400">← Back to OTT Hub</Link>
      </div>
    );
  }

  const rawMovies = await Movie.find({
    $or: [
      { "ott.platform": { $regex: new RegExp(`^${platform.name}$`, "i") } },
      { streamingOn: { $regex: new RegExp(`^${platform.name}$`, "i") } },
    ]
  })
    .select("_id title slug posterUrl verdict releaseDate ott streamingOn streamingUrl ottReleaseDate")
    .sort({ updatedAt: -1 })
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

  const streamingCount = (movies as any[]).filter((m: any) =>
    m.ott?.status === "Streaming" || m.streamingUrl
  ).length;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `Odia Movies on ${platform.name}`,
    description: platform.description,
    url: `${SITE_URL}/ott/platform/${platform.slug}`,
    numberOfItems: movies.length,
  };

  return (
    <main className="min-h-screen bg-[#0a0a0a] pb-20">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Hero Section */}
      <section className={`bg-gradient-to-b ${platform.gradient} pt-28 pb-16 border-b border-white/5`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="mb-6">
            <Breadcrumb crumbs={[{ label: "OTT", href: "/ott" }, { label: "Platforms", href: "/ott" }, { label: platform.name }]} />
          </div>
          <div className="flex flex-col md:flex-row md:items-center gap-6 mb-10">
            {/* Platform Icon */}
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-2xl"
              style={{ backgroundColor: `${platform.color}22`, border: `2px solid ${platform.color}44` }}
            >
              <MonitorPlay className="w-10 h-10" style={{ color: platform.color }} />
            </div>

            <div className="flex-1">
              <p className="text-sm font-semibold uppercase tracking-widest mb-1" style={{ color: platform.color }}>
                OTT Platform
              </p>
              <h1 className="text-4xl md:text-5xl font-black text-white leading-tight">
                Odia Movies on {platform.name}
              </h1>
              <p className="text-gray-400 mt-2 text-lg">{platform.tagline}</p>
            </div>

            {/* Visit Platform Button */}
            <a
              href={platform.visitUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm text-white border transition-all hover:scale-105 flex-shrink-0"
              style={{ backgroundColor: `${platform.color}22`, borderColor: `${platform.color}66`, color: platform.color }}
            >
              <ExternalLink className="w-4 h-4" />
              Visit {platform.name}
            </a>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-4 max-w-xl">
            <div className="bg-white/5 rounded-xl p-4 text-center border border-white/5">
              <p className="text-2xl font-black text-white">{movies.length}</p>
              <p className="text-gray-500 text-xs mt-1">Total Movies</p>
            </div>
            <div className="bg-white/5 rounded-xl p-4 text-center border border-white/5">
              <p className="text-2xl font-black text-white" style={{ color: "#4ade80" }}>{streamingCount}</p>
              <p className="text-gray-500 text-xs mt-1">Now Streaming</p>
            </div>
            <div className="bg-white/5 rounded-xl p-4 text-center border border-white/5">
              <p className="text-2xl font-black text-white" style={{ color: platform.color }}>
                {movies.length - streamingCount}
              </p>
              <p className="text-gray-500 text-xs mt-1">Upcoming</p>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">

          {/* Left — Movies Grid */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Film className="w-6 h-6" style={{ color: platform.color }} />
                Movies on {platform.name}
              </h2>
              <Link href="/ott/now-streaming" className="text-sm text-gray-400 hover:text-white flex items-center gap-1 transition-colors">
                View All Streaming <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            {movies.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-5">
                {(movies as any[]).map((movie: any) => (
                  <MovieCard key={movie._id} movie={movie} variant="ott" />
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-[#111] rounded-2xl border border-white/5">
                <Film className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No Movies Found</h3>
                <p className="text-gray-400 mb-6">
                  There are currently no Odia movies indexed for {platform.name}.
                </p>
                <a
                  href={platform.visitUrl}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm"
                  style={{ backgroundColor: platform.color, color: "#fff" }}
                >
                  <ExternalLink className="w-4 h-4" />
                  Browse on {platform.name}
                </a>
              </div>
            )}
          </div>

          {/* Right — Sidebar */}
          <div className="space-y-6 lg:sticky lg:top-24 lg:self-start">

            {/* About Platform */}
            <div className="bg-[#111] border border-white/5 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                <MonitorPlay className="w-5 h-5" style={{ color: platform.color }} />
                About {platform.name}
              </h2>
              <p className="text-gray-400 text-sm leading-relaxed">{platform.about}</p>
              <a
                href={platform.visitUrl}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="mt-4 w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all hover:opacity-90"
                style={{ backgroundColor: platform.color, color: "#fff" }}
              >
                <ExternalLink className="w-4 h-4" />
                Visit {platform.name}
              </a>
            </div>

            {/* Features */}
            <div className="bg-[#111] border border-white/5 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500" />
                Platform Features
              </h2>
              <ul className="space-y-3">
                {platform.features.map((f) => (
                  <li key={f} className="flex items-center gap-3 text-sm text-gray-300">
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: platform.color }}
                    />
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            {/* Browse Other Platforms */}
            <div className="bg-[#111] border border-white/5 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-white mb-4">Browse Other Platforms</h2>
              <div className="space-y-2">
                {Object.values(PLATFORMS).filter(p => p.slug !== platform.slug).map(p => (
                  <Link
                    key={p.slug}
                    href={`/ott/platform/${p.slug}`}
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors group"
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${p.color}22` }}
                    >
                      <Play className="w-4 h-4" style={{ color: p.color }} />
                    </div>
                    <span className="text-gray-300 group-hover:text-white text-sm font-medium transition-colors">{p.name}</span>
                    <ChevronRight className="w-4 h-4 text-gray-600 ml-auto group-hover:text-gray-400 transition-colors" />
                  </Link>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* SEO Description Section */}
        <section className="mt-16 bg-[#111] border border-white/5 rounded-2xl p-8">
          <h2 className="text-2xl font-bold text-white mb-4">
            Watch Odia Movies on {platform.name} — Complete Ollywood Collection
          </h2>
          <div className="prose prose-invert max-w-none text-gray-400 space-y-4 text-sm leading-relaxed">
            <p>{platform.description}</p>
            <p>
              On Ollypedia, we track every Odia movie available on {platform.name} so you can stay updated with
              the latest OTT releases from Ollywood. Whether you are looking for blockbuster hits, family dramas,
              or action thrillers — our {platform.name} section keeps you informed with OTT release dates,
              streaming status, and direct links.
            </p>
            <p>
              {platform.about}
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href={platform.visitUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm transition-all hover:opacity-90"
              style={{ backgroundColor: platform.color, color: "#fff" }}
            >
              <ExternalLink className="w-4 h-4" />
              Visit {platform.name}
            </a>
            <Link
              href="/ott"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-all"
            >
              <MonitorPlay className="w-4 h-4" />
              Back to OTT Hub
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
