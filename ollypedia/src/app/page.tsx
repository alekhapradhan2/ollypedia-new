import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { connectDB } from "@/lib/db";
import Movie from "@/models/Movie";
import Blog from "@/models/Blog";
import News from "@/models/News";
import { MovieCard } from "@/components/movie/MovieCard";
import { BlogCard } from "@/components/blog/BlogCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { buildMeta, SITE_NAME } from "@/lib/seo";
import { Film, Star, Music, Newspaper, TrendingUp, Award } from "lucide-react";
import HeroCarousel, { type HeroMovie } from "@/components/layout/HeroCarousel";

export const revalidate = 3600;

export const metadata: Metadata = buildMeta({
  title: `${SITE_NAME} – The Odia Film Encyclopedia`,
  description:
    "Ollypedia is Odisha's most comprehensive Odia film database. Discover latest Ollywood movies, songs, actor biographies, box office collection, reviews and film news.",
  keywords: [
    "Odia movies 2024", "Ollywood", "Odia cinema", "Odia films", "Babushaan", "Elina Samantray",
    "Odia actor", "Odia songs", "Ollywood news", "Odia movie reviews",
  ],
  url: "/",
});

// ── Date helpers (mirrors Home.jsx logic) ────────────────────────
const _now = new Date();
function withinDays(d: string | undefined, past: number, future: number) {
  if (!d) return false;
  const diff = (new Date(d).getTime() - _now.getTime()) / 86400000;
  return diff >= -past && diff <= future;
}
function isThisMonth(d: string | undefined) {
  if (!d) return false;
  const dt = new Date(d);
  return dt.getMonth() === _now.getMonth() && dt.getFullYear() === _now.getFullYear();
}
function isLastMonth(d: string | undefined) {
  if (!d) return false;
  const dt = new Date(d);
  const lm = new Date(_now.getFullYear(), _now.getMonth() - 1, 1);
  return dt.getMonth() === lm.getMonth() && dt.getFullYear() === lm.getFullYear();
}

async function getHomeData() {
  await connectDB();
  const [allMovies, latestBlogs, latestNews] = await Promise.all([
    // Fetch all movies so we can derive hero + rows server-side
    Movie.find({}, "-reviews -media.songs")
      .sort({ releaseDate: -1 })
      .limit(80)
      .lean(),
    Blog.find({ published: true }, "-content -reviews")
      .sort({ createdAt: -1 })
      .limit(3)
      .lean(),
    News.find({ published: true })
      .sort({ createdAt: -1 })
      .limit(4)
      .lean(),
  ]);

  // ── Hero movies — same filter as Home.jsx heroMovies useMemo ──
  const heroMovies: HeroMovie[] = (allMovies as any[])
    .filter((m) => {
      const hasImage = m.thumbnailUrl || m.media?.trailer?.ytId || m.posterUrl;
      if (!hasImage) return false;
      if (!m.verdict || m.verdict === "Upcoming") return true;
      if (m.releaseDate && withinDays(m.releaseDate, 60, 0)) return true;
      return isThisMonth(m.releaseDate) || isLastMonth(m.releaseDate);
    })
    .sort((a: any, b: any) => {
      const aUp = !a.verdict || a.verdict === "Upcoming";
      const bUp = !b.verdict || b.verdict === "Upcoming";
      const aDate = a.releaseDate ? new Date(a.releaseDate).getTime() : null;
      const bDate = b.releaseDate ? new Date(b.releaseDate).getTime() : null;
      if (aUp && bUp) {
        if (!aDate && !bDate) return 0;
        if (!aDate) return 1;
        if (!bDate) return -1;
        return aDate - bDate;
      }
      if (aUp && !bUp) return -1;
      if (!aUp && bUp) return 1;
      return (bDate || 0) - (aDate || 0);
    })
    .slice(0, 8)
    .map((m: any) => ({
      _id:         String(m._id),
      slug:        m.slug        || undefined,
      title:       m.title,
      category:    m.category    || undefined,
      genre:       m.genre       || undefined,
      language:    m.language    || undefined,
      releaseDate: m.releaseDate || undefined,
      director:    m.director    || undefined,
      verdict:     m.verdict     || undefined,
      synopsis:    m.synopsis    || undefined,
      thumbnailUrl: m.thumbnailUrl || undefined,
      posterUrl:   m.posterUrl   || undefined,
      bannerUrl:   m.bannerUrl   || undefined,
      media: m.media?.trailer?.ytId
        ? { trailer: { ytId: m.media.trailer.ytId } }
        : undefined,
    }));

  // ── Latest released movies ────────────────────────────────────
  const latestMovies = (allMovies as any[])
    .filter((m) => m.status !== "Upcoming" && m.releaseDate && new Date(m.releaseDate) <= _now)
    .sort((a: any, b: any) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime())
    .slice(0, 10);

  // ── Upcoming movies ───────────────────────────────────────────
  const upcomingMovies = (allMovies as any[])
    .filter((m) => !m.verdict || m.verdict === "Upcoming")
    .sort((a: any, b: any) => {
      const aDate = a.releaseDate ? new Date(a.releaseDate).getTime() : null;
      const bDate = b.releaseDate ? new Date(b.releaseDate).getTime() : null;
      if (!aDate && !bDate) return 0;
      if (!aDate) return 1;
      if (!bDate) return -1;
      return aDate - bDate;
    })
    .slice(0, 6);

  return { heroMovies, latestMovies, upcomingMovies, latestBlogs, latestNews };
}

export default async function HomePage() {
  const { heroMovies, latestMovies, upcomingMovies, latestBlogs, latestNews } =
    await getHomeData();

  return (
    <div className="min-h-screen">

      {/* ══ HERO — multi-slide carousel matching Home.jsx exactly ══ */}
      {heroMovies.length > 0 ? (
        <HeroCarousel movies={heroMovies} />
      ) : (
        /* Fallback when DB is empty */
        <section className="relative min-h-[60vh] flex items-center justify-center overflow-hidden bg-[#0a0a0a]">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-900/20 via-[#0a0a0a] to-[#0a0a0a]" />
          <div className="relative z-10 text-center px-4">
            <h1 className="font-display text-5xl md:text-7xl font-black text-white leading-none mb-4">
              Discover <span className="text-orange-500">Odia</span> Cinema
            </h1>
            <p className="text-gray-300 text-lg mb-6">
              Your ultimate guide to Ollywood — movies, actors, songs, and more.
            </p>
            <Link href="/movies" className="btn-primary inline-flex items-center gap-2">
              <Film className="w-4 h-4" /> Explore Movies
            </Link>
          </div>
        </section>
      )}

      {/* ── Stats Bar ── */}
      <section className="bg-[#111] border-y border-[#1f1f1f]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-[#1f1f1f]">
            {[
              { icon: Film,      label: "Odia Movies",   value: "500+"  },
              { icon: Star,      label: "Cast Profiles",  value: "1000+" },
              { icon: Music,     label: "Odia Songs",    value: "5000+" },
              { icon: Newspaper, label: "News Articles",  value: "Daily" },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-3 px-6 py-4">
                <Icon className="w-5 h-5 text-orange-500 flex-shrink-0" />
                <div>
                  <p className="text-lg font-bold text-white font-display">{value}</p>
                  <p className="text-xs text-gray-500">{label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">

        {/* ── Latest Movies ── */}
        {latestMovies.length > 0 && (
          <section>
            <SectionHeader
              title="Latest Releases"
              subtitle="Newest Odia films from Ollywood"
              href="/movies"
            />
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {latestMovies.slice(0, 10).map((m: any) => (
                <MovieCard key={String(m._id)} movie={m} />
              ))}
            </div>
          </section>
        )}

        {/* ── Upcoming ── */}
        {upcomingMovies.length > 0 && (
          <section>
            <SectionHeader
              title="Upcoming Movies"
              subtitle="Odia films releasing soon"
              href="/movies?verdict=Upcoming"
            />
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {upcomingMovies.map((m: any) => (
                <MovieCard key={String(m._id)} movie={m} />
              ))}
            </div>
          </section>
        )}

        {/* ── SEO Rich Content ── */}
        <section className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-8 md:p-12">
          <div className="max-w-4xl">
            <div className="flex items-center gap-2 mb-4">
              <Award className="w-5 h-5 text-orange-500" />
              <span className="text-orange-500 text-sm font-semibold uppercase tracking-widest">
                About Ollywood
              </span>
            </div>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-white mb-6 leading-tight">
              Celebrating the Rich Heritage of Odia Cinema
            </h2>
            <div className="prose-odia">
              <p>
                Odia cinema, fondly known as <strong>Ollywood</strong>, is one of India's oldest and most culturally
                rich regional film industries. With roots tracing back to 1936 when the first Odia film{" "}
                <em>Sita Bibaha</em> was released, Odia cinema has evolved over nine decades into a vibrant
                industry that continues to captivate millions of viewers across Odisha and beyond.
              </p>
              <p>
                The Odia film industry is headquartered in <strong>Bhubaneswar</strong>, the capital city of Odisha,
                and produces over 40–60 films annually. Ollywood has given India some remarkable storytellers,
                directors, and performers who have shaped not just regional cinema but have made a mark on the
                national stage as well. Stars like <strong>Babushaan Mohanty</strong>, <strong>Elina Samantray</strong>,{" "}
                <strong>Sabyasachi Mishra</strong>, and <strong>Barsha Priyadarshini</strong> have become household
                names in Odisha, drawing massive box office numbers and critical acclaim.
              </p>
              <p>
                What makes Odia cinema unique is its deep connection to the cultural, spiritual, and social fabric
                of Odisha. Films often draw inspiration from the state's rich mythology, its ancient temples,
                its tribal traditions, and the everyday lives of its people. Whether it's a devotional film set
                against the backdrop of the <strong>Jagannath Temple</strong> in Puri or a contemporary action
                thriller set in the bustling streets of Bhubaneswar, Odia films carry an unmistakable identity
                that resonates deeply with its audience.
              </p>
              <p>
                <strong>Ollypedia</strong> is your go-to destination for everything related to Odia cinema. We
                provide comprehensive information about Odia movies including full cast details, box office
                collections, songs, trailers, reviews, and much more. Our database is continuously updated with
                the latest information about upcoming and current releases, ensuring you are always in the know
                about the pulse of Ollywood.
              </p>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/movies" className="btn-primary">Browse Movies</Link>
              <Link href="/blog" className="btn-outline">Read Our Blog</Link>
            </div>
          </div>
        </section>

        {/* ── Latest News ── */}
        {latestNews.length > 0 && (
          <section>
            <SectionHeader
              title="Latest News"
              subtitle="Bollywood-Ollywood film industry updates"
              href="/news"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {latestNews.map((n: any) => (
                <div key={String(n._id)} className="card p-4 flex gap-4">
                  {n.imageUrl && (
                    <div className="relative w-24 h-20 rounded-lg overflow-hidden flex-shrink-0">
                      <Image src={n.imageUrl} alt={n.title} fill className="object-cover" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <span className="badge-blue text-xs mb-2 inline-block">{n.category || "News"}</span>
                    <h3 className="text-sm font-semibold text-white line-clamp-2 hover:text-orange-400 transition-colors">
                      <Link href="/news">{n.title}</Link>
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(n.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Blog ── */}
        {latestBlogs.length > 0 && (
          <section>
            <SectionHeader
              title="From the Blog"
              subtitle="Reviews, analysis and Ollywood stories"
              href="/blog"
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {latestBlogs.map((b: any) => (
                <BlogCard key={String(b._id)} blog={b} />
              ))}
            </div>
          </section>
        )}

        {/* ── Why Ollypedia ── */}
        <section className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: TrendingUp,
              title: "Box Office Tracking",
              desc: "Get accurate opening day, first week, and total collection data for every Odia film released.",
            },
            {
              icon: Star,
              title: "Cast & Crew Profiles",
              desc: "Explore detailed biographies of Odia actors, directors, producers, and other film professionals.",
            },
            {
              icon: Music,
              title: "Songs & Music",
              desc: "Listen to and explore every song from Odia films, with lyrics, singer, and music director information.",
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-[#111] border border-[#1f1f1f] rounded-xl p-6">
              <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center mb-4">
                <Icon className="w-5 h-5 text-orange-500" />
              </div>
              <h3 className="font-display font-bold text-white text-lg mb-2">{title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </section>

      </div>
    </div>
  );
}