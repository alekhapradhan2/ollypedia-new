// app/movies/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { connectDB } from "@/lib/db";
import Movie from "@/models/Movie";
import { MovieCard } from "@/components/movie/MovieCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { MoviesFilter } from "./MoviesFilter";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { buildMeta } from "@/lib/seo";
import {
  Film, Star, TrendingUp, Calendar, Filter, Award,
  ChevronRight, Clapperboard, Globe, Users,
} from "lucide-react";

export const revalidate = 600;

export const metadata: Metadata = buildMeta({
  title: "Odia Movies – Complete Ollywood Film Database | Ollypedia",
  description:
    "Browse the complete list of Odia (Ollywood) movies. Filter by genre, year, verdict and more. Find your favourite Odia films with full cast, songs, box office collection, trailers and reviews.",
  keywords: [
    "Odia movies list", "Ollywood films", "Odia movies 2024", "Odia movies 2025",
    "Odia cinema database", "Ollywood box office", "Odia film reviews",
    "best Odia movies", "new Odia movies", "Odia movie cast",
  ],
  url: "/movies",
});

const GENRES   = ["Action", "Romance", "Drama", "Comedy", "Thriller", "Horror", "Devotional", "Family", "Historical"];
const VERDICTS = ["Hit", "Superhit", "Blockbuster", "Average", "Flop", "Upcoming"];

const GENRE_META: Record<string, { emoji: string; desc: string }> = {
  Action:     { emoji: "⚔️",  desc: "High-octane Odia action films" },
  Romance:    { emoji: "❤️",  desc: "Romantic Ollywood love stories" },
  Drama:      { emoji: "🎭",  desc: "Emotional Odia drama films" },
  Comedy:     { emoji: "😄",  desc: "Fun Odia comedy movies" },
  Thriller:   { emoji: "🔍",  desc: "Suspenseful Odia thrillers" },
  Horror:     { emoji: "👻",  desc: "Scary Odia horror films" },
  Devotional: { emoji: "🪔",  desc: "Spiritual & devotional Odia films" },
  Family:     { emoji: "👨‍👩‍👧",  desc: "Family entertainer Odia movies" },
  Historical: { emoji: "🏛️",  desc: "Historical Odia period films" },
};

const ODIA_FILM_FACTS = [
  { icon: Film,     stat: "1936",  label: "First Odia Film",   note: "Sita Bibaha — the first ever Odia feature film" },
  { icon: Globe,    stat: "40–60", label: "Films Per Year",    note: "Ollywood produces 40–60 Odia films annually" },
  { icon: Users,    stat: "1000+", label: "Cast & Crew",       note: "Actors, directors & technicians in our database" },
  { icon: Calendar, stat: "85+",   label: "Years of Cinema",   note: "Odia cinema has a rich heritage of over 85 years" },
];

async function getMovies({ genre, verdict, sort, page }: {
  genre?: string; verdict?: string; sort?: string; page?: number;
}) {
  await connectDB();
  const LIMIT  = 20;
  const skip   = ((page || 1) - 1) * LIMIT;
  const filter: any = {};
  if (genre)   filter.genre   = { $in: [genre] };
  if (verdict) filter.verdict = verdict;

  const sortMap: Record<string, any> = {
    latest: { releaseDate: -1 },
    oldest: { releaseDate:  1 },
    az:     { title:        1 },
    za:     { title:       -1 },
    rating: { imdbRating:  -1 },
  };
  const sortBy = sortMap[sort || "latest"] || sortMap.latest;

  const [movies, total] = await Promise.all([
    Movie.find(filter, "-reviews").sort(sortBy).skip(skip).limit(LIMIT).lean(),
    Movie.countDocuments(filter),
  ]);

  return { movies, total, pages: Math.ceil(total / LIMIT) };
}

export default async function MoviesPage({
  searchParams,
}: {
  searchParams: { genre?: string; verdict?: string; sort?: string; page?: string };
}) {
  const { genre, verdict, sort, page } = searchParams;
  const { movies, total, pages } = await getMovies({
    genre, verdict, sort, page: Number(page) || 1,
  });

  const currentPage = Number(page) || 1;
  const isFiltered  = !!(genre || verdict || sort);

  return (
    <div className="min-h-screen">

      {/* ══ PAGE HERO BANNER ══ */}
      <section className="relative overflow-hidden bg-[#0d0d0d] border-b border-[#1f1f1f]">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-orange-600/4 rounded-full blur-2xl" />
          <div className="absolute inset-0"
            style={{ backgroundImage: "radial-gradient(circle at 70% 50%, #f9731608 0%, transparent 60%)" }} />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 relative z-10">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              {/* Breadcrumb */}
              <nav className="flex items-center gap-1.5 text-xs text-gray-500 mb-4" aria-label="Breadcrumb">
                <Link href="/" className="hover:text-orange-400 transition-colors">Home</Link>
                <ChevronRight className="w-3 h-3" />
                <span className="text-gray-300">Movies</span>
                {genre && (
                  <>
                    <ChevronRight className="w-3 h-3" />
                    <span className="text-orange-400">{genre}</span>
                  </>
                )}
              </nav>

              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-orange-500/15 rounded-xl flex items-center justify-center">
                  <Clapperboard className="w-5 h-5 text-orange-500" />
                </div>
                <h1 className="font-display text-3xl md:text-4xl font-black text-white">
                  {genre ? `${genre} Odia Movies` : "Odia Movies"}
                </h1>
              </div>

              <p className="text-gray-400 text-sm md:text-base max-w-xl leading-relaxed">
                {genre
                  ? `${GENRE_META[genre]?.desc || `Browse ${genre} films from Ollywood`}. Discover the best ${genre.toLowerCase()} Odia movies with cast, box office and reviews.`
                  : "The most complete Ollywood film database — browse every Odia movie with cast, songs, box office collection, trailers and reviews."}
              </p>
            </div>

            {/* Total count pill */}
            <div className="flex items-center gap-2 bg-[#111] border border-[#1f1f1f] rounded-xl px-5 py-3 self-start md:self-auto">
              <Film className="w-4 h-4 text-orange-500" />
              <span className="text-2xl font-black text-white font-display">{total}</span>
              <span className="text-xs text-gray-500 leading-tight">
                Odia<br />films
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ══ QUICK GENRE PILLS ══ */}
      {!genre && (
        <section className="bg-[#0d0d0d] border-b border-[#1f1f1f]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
              <Link href="/movies"
                className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold bg-orange-500 text-white">
                All Films
              </Link>
              {GENRES.map((g) => (
                <Link key={g} href={`/movies?genre=${g}`}
                  className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[#111] border border-[#1f1f1f] text-gray-300 hover:border-orange-500/40 hover:text-orange-400 transition-all whitespace-nowrap">
                  <span>{GENRE_META[g]?.emoji}</span>
                  {g}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">

        {/* ══ FILTER BAR ══ */}
        <div className="bg-[#111] border border-[#1f1f1f] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-orange-500" />
            <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Filter &amp; Sort</span>
            {isFiltered && (
              <Link href="/movies" className="ml-auto text-xs text-orange-400 hover:text-orange-300 transition-colors">
                Clear filters
              </Link>
            )}
          </div>
          <MoviesFilter
            genres={GENRES}
            verdicts={VERDICTS}
            active={{ genre, verdict, sort, page: currentPage }}
            totalPages={pages}
          />
        </div>

        {/* ══ MOVIE GRID ══ */}
        {movies.length > 0 ? (
          <section aria-label={`${genre || "Odia"} movies list`}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-500">
                Showing{" "}
                <span className="text-white font-semibold">{(currentPage - 1) * 20 + 1}–{Math.min(currentPage * 20, total)}</span>
                {" "}of{" "}
                <span className="text-white font-semibold">{total}</span> films
              </p>
              {currentPage > 1 && (
                <span className="text-xs text-gray-600">Page {currentPage} of {pages}</span>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {movies.map((m: any) => (
                <LoadingCard key={String(m._id)} href={`/movie/${m.slug}`} borderRadius={12}>
                  <MovieCard movie={m} />
                </LoadingCard>
              ))}
            </div>
          </section>
        ) : (
          <div className="text-center py-20 bg-[#111] border border-[#1f1f1f] rounded-2xl">
            <Film className="w-12 h-12 text-gray-700 mx-auto mb-4" />
            <h2 className="text-white font-bold text-lg mb-2">No movies found</h2>
            <p className="text-gray-500 text-sm mb-6">Try a different filter or browse all Odia films.</p>
            <Link href="/movies" className="inline-flex items-center gap-2 text-orange-400 hover:text-orange-300 text-sm font-semibold transition-colors">
              View all movies <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {/* ══ SEO BLOCK 1 — About Ollywood ══ */}
        <section
          aria-label="About Odia cinema and Ollywood"
          className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-8 md:p-10"
        >
          <div className="flex items-center gap-2 mb-6">
            <div className="w-1 h-6 bg-orange-500 rounded-full" />
            <h2 className="font-display text-xl md:text-2xl font-bold text-white">
              About Odia Cinema — The Ollywood Film Industry
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4 text-gray-400 text-sm leading-relaxed">
              <p>
                <strong className="text-white">Ollywood</strong> is the popular name for the{" "}
                <strong className="text-white">Odia language film industry</strong>, based in Bhubaneswar,
                the capital of Odisha, India. It is one of India's oldest regional film industries,
                with its roots tracing back to <strong className="text-white">1936</strong> when{" "}
                <em>Sita Bibaha</em> became the first Odia feature film ever produced.
              </p>
              <p>
                Today, Ollywood produces between <strong className="text-white">40 to 60 Odia films every year</strong>,
                spanning genres like action, romance, drama, comedy, devotional, thriller and historical.
                The industry is closely tied to Odisha's culture — featuring stories rooted in Odishan
                traditions, temples, folklore, and everyday life.
              </p>
              <p>
                Some of the biggest <strong className="text-white">Odia movie stars</strong> include{" "}
                <strong className="text-white">Babushaan Mohanty</strong>, the reigning superstar of Ollywood,
                alongside <strong className="text-white">Sabyasachi Mishra</strong>,{" "}
                <strong className="text-white">Anubhav Mohanty</strong>,{" "}
                <strong className="text-white">Elina Samantray</strong>,{" "}
                <strong className="text-white">Barsha Priyadarshini</strong>, and{" "}
                <strong className="text-white">Jhilik Bhattacharjee</strong>.
              </p>
            </div>
            <div className="space-y-4 text-gray-400 text-sm leading-relaxed">
              <p>
                The <strong className="text-white">box office performance</strong> of Odia films has grown
                significantly over the past decade. Modern Ollywood blockbusters regularly collect over
                ₹1 crore in their opening week, with top hits like <em>Daman</em>, <em>Khusi</em>, and{" "}
                <em>Love Station</em> setting new records for Odia cinema.
              </p>
              <p>
                Ollypedia tracks every aspect of Odia cinema — from{" "}
                <strong className="text-white">day-wise box office collection</strong> to complete cast and
                crew details, song lyrics, YouTube trailers, and audience reviews. Our database currently
                features <strong className="text-white">{total}+ Odia films</strong>, making it the most
                comprehensive Odia movie database available online.
              </p>
              <p>
                Whether you're looking for <strong className="text-white">new Odia movies</strong> released
                in 2025, classic Odia films from the 1990s, or upcoming Ollywood releases — Ollypedia is
                your one-stop destination for everything Odia cinema.
              </p>
            </div>
          </div>

          {/* Facts row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-8 border-t border-[#1f1f1f]">
            {ODIA_FILM_FACTS.map(({ icon: Icon, stat, label, note }) => (
              <div key={label} className="text-center">
                <div className="w-9 h-9 bg-orange-500/10 rounded-xl flex items-center justify-center mx-auto mb-2">
                  <Icon className="w-4 h-4 text-orange-500" />
                </div>
                <p className="text-xl font-black text-white font-display">{stat}</p>
                <p className="text-xs font-semibold text-gray-300 mt-0.5">{label}</p>
                <p className="text-[10px] text-gray-600 mt-1 leading-tight">{note}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ══ SEO BLOCK 2 — Browse by genre ══ */}
        <section aria-label="Browse Odia movies by genre">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-1 h-5 bg-orange-500 rounded-full" />
            <h2 className="font-display text-xl font-bold text-white">Browse Odia Movies by Genre</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {GENRES.map((g) => (
              <Link key={g} href={`/movies?genre=${g}`}
                className="group bg-[#111] border border-[#1f1f1f] hover:border-orange-500/40 rounded-xl p-4 transition-all hover:-translate-y-0.5 text-center">
                <div className="text-2xl mb-2">{GENRE_META[g]?.emoji}</div>
                <p className="text-sm font-bold text-white group-hover:text-orange-300 transition-colors">{g}</p>
                <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">{GENRE_META[g]?.desc}</p>
                <div className="flex items-center justify-center gap-0.5 mt-2 text-orange-400 text-[10px] font-semibold group-hover:gap-1 transition-all">
                  Browse <ChevronRight className="w-3 h-3" />
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ══ SEO BLOCK 3 — FAQ ══ */}
        <section
          aria-label="Frequently asked questions about Odia movies"
          className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-8 md:p-10"
        >
          <div className="flex items-center gap-2 mb-6">
            <div className="w-1 h-6 bg-orange-500 rounded-full" />
            <h2 className="font-display text-xl md:text-2xl font-bold text-white">
              Frequently Asked Questions — Odia Movies
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
            {[
              {
                q: "Where can I find a complete list of Odia movies?",
                a: "Ollypedia maintains the most complete database of Odia (Ollywood) films online. You can browse all Odia movies by genre, year, verdict, or alphabetically. Each movie page includes cast, songs, box office, synopsis and reviews.",
              },
              {
                q: "What are the latest Odia movies of 2025?",
                a: "Ollypedia regularly updates its database with the latest Odia films. Use the 'Latest' sort on this page to see the newest Ollywood releases of 2025, complete with release dates, verdicts and box office figures.",
              },
              {
                q: "Which Odia movies are blockbusters?",
                a: "Filter by 'Blockbuster' verdict on this page to see all Odia films that achieved blockbuster status. Ollypedia calculates verdicts based on box office performance relative to the film's budget and screen count.",
              },
              {
                q: "Who are the top Odia film directors?",
                a: "Prominent directors in Ollywood include Sabyasachi Mohapatra, Bijay Mohanty, Sambit Mohapatra, and Hirak Sinha. Many films are also directed by debut filmmakers who have made a significant mark on Odia cinema.",
              },
              {
                q: "How can I watch Odia movies online?",
                a: "Many Odia films are available on OTT platforms like Amazon Prime Video, Disney+ Hotstar, Zee5, and SunNXT. Each movie page on Ollypedia includes trailer links and OTT streaming information where available.",
              },
              {
                q: "What genres are popular in Ollywood?",
                a: "Odia cinema is diverse — Action, Romance and Drama are the most popular genres. Devotional films set around the Jagannath Temple in Puri have a dedicated audience. Comedy and family entertainers also perform well at the Odia box office.",
              },
            ].map(({ q, a }) => (
              <div key={q} className="border-b border-[#1f1f1f] pb-5 last:border-0">
                <h3 className="font-bold text-white text-sm mb-2 flex items-start gap-2">
                  <span className="text-orange-500 mt-0.5 flex-shrink-0">Q.</span>
                  {q}
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed pl-5">{a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ══ SEO BLOCK 4 — Internal links ══ */}
        <section aria-label="Explore more Odia cinema content">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-1 h-5 bg-orange-500 rounded-full" />
            <h2 className="font-display text-xl font-bold text-white">Explore More on Ollypedia</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                icon: TrendingUp, href: "/box-office",
                title: "Box Office Collection",
                desc: "Day-wise net and gross collection for every Odia film. Updated regularly with opening day and total figures.",
                cta: "View Box Office",
              },
              {
                icon: Users, href: "/cast",
                title: "Cast & Crew Profiles",
                desc: "Detailed profiles of Odia actors, actresses, directors, producers and music directors with filmographies.",
                cta: "Browse Cast",
              },
              {
                icon: Star, href: "/songs",
                title: "Odia Film Songs",
                desc: "Every song from every Odia film — with YouTube videos, lyrics, singer and music director credits.",
                cta: "Find Songs",
              },
              {
                icon: Award, href: "/blog",
                title: "Odia Film Blog",
                desc: "In-depth reviews, top 10 lists, actor spotlights, behind-the-scenes stories and opinion pieces about Ollywood.",
                cta: "Read Blog",
              },
            ].map(({ icon: Icon, href, title, desc, cta }) => (
              <Link key={title} href={href}
                className="group bg-[#111] border border-[#1f1f1f] hover:border-orange-500/30 rounded-xl p-5 transition-all hover:-translate-y-0.5 flex flex-col">
                <div className="w-9 h-9 bg-orange-500/10 rounded-xl flex items-center justify-center mb-3 group-hover:bg-orange-500/20 transition-colors">
                  <Icon className="w-4 h-4 text-orange-500" />
                </div>
                <h3 className="font-bold text-white text-sm mb-1.5">{title}</h3>
                <p className="text-gray-500 text-xs leading-relaxed flex-1">{desc}</p>
                <div className="flex items-center gap-1 mt-4 text-orange-400 text-xs font-semibold group-hover:gap-2 transition-all">
                  {cta} <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </Link>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}