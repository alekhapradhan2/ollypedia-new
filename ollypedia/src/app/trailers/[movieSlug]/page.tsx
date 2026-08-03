// app/trailers/[movieSlug]/page.tsx
// SSR individual trailer page — deep SEO, FAQs, auto-content, VideoObject schema

import React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { connectDB }      from "@/lib/db";
import Movie              from "@/models/Movie";
import {
  buildIndividualTrailerMeta,
  trailerMovieJsonLd,
  videoObjectJsonLd,
  trailerFaqJsonLd,
  trailerBreadcrumbJsonLd,
  generateTrailerSeoContent,
  generateTrailerFaqs,
  hasAnyVideo,
  hasTrailer,
  hasTeaser,
  hasMotionPoster,
  hasFirstLook,
  getPrimaryVideo,
  fmtDate,
  getTrailerYear,
  type TrailerMovieDoc,
} from "@/lib/trailerSeo";
import { TrailerPlayer }  from "@/components/trailers/TrailerPlayer";
import { TrailerCard }    from "@/components/trailers/TrailerCard";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { SongCard } from "@/components/songs/SongCard";
import { BlogCard } from "@/components/blog/BlogCard";
import Blog from "@/models/Blog";
import {
  Calendar, Clock, User, Film, Tag, Star, Globe,
  ChevronRight, Play, Clapperboard, ExternalLink,
  Users, Music, DollarSign, Award, Info, FileText,
} from "lucide-react";
import { DisplayAd } from "@/components/ads/DisplayAd";

export const revalidate    = 86400; // 24 hours — on-demand ISR
export const dynamicParams = true;

// ─── Params ───────────────────────────────────────────────────────────────────

interface Params { movieSlug: string }

// ─── Data fetcher ─────────────────────────────────────────────────────────────

async function fetchMovie(slug: string): Promise<TrailerMovieDoc | null> {
  await connectDB();
  const doc = await Movie.findOne({ slug })
    .populate("productionId", "name slug")
    .lean();
  if (!doc) return null;
  return doc as unknown as TrailerMovieDoc;
}

async function fetchRelated(movie: TrailerMovieDoc, limit = 6): Promise<TrailerMovieDoc[]> {
  const genres = movie.genre || [];
  const slug   = movie.slug || movie._id;

  const related = await Movie.find(
    {
      slug: { $ne: slug },
      $or: [
        { genre: { $in: genres } },
        { director: movie.director },
      ],
    },
    "-reviews -story"
  )
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
  return related as unknown as TrailerMovieDoc[];
}

function toSlug(str?: string): string {
  if (!str) return "";
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

async function getMovieBlogs(movieTitle: string) {
  await connectDB();
  const blogs = await (Blog as any).find({
    published: true,
    $or: [
      { movieTitle: { $regex: new RegExp(movieTitle, "i") } },
      { tags:       { $elemMatch: { $regex: new RegExp(movieTitle, "i") } } },
      { title:      { $regex: new RegExp(movieTitle, "i") } },
    ],
  })
    .select("title slug excerpt coverImage category createdAt")
    .sort({ createdAt: -1 })
    .limit(6)
    .lean();
  return JSON.parse(JSON.stringify(blogs));
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const movie = await fetchMovie(params.movieSlug);
  if (!movie) return { title: "Trailer Not Found" };
  return buildIndividualTrailerMeta(movie);
}



// ─── Helper components ────────────────────────────────────────────────────────

function MetaRow({ icon: Icon, label, value, href }: {
  icon: React.ElementType; label: string; value: string; href?: string;
}) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-white/[0.04] last:border-0">
      <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon className="w-3.5 h-3.5 text-orange-400" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-gray-600 uppercase tracking-wide font-semibold">{label}</p>
        {href ? (
          <Link href={href} className="text-sm text-gray-300 hover:text-orange-400 transition-colors leading-snug">
            {value}
          </Link>
        ) : (
          <p className="text-sm text-gray-300 leading-snug">{value}</p>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function IndividualTrailerPage({ params }: { params: Params }) {
  const [movie, _] = await Promise.all([
    fetchMovie(params.movieSlug),
    connectDB(),
  ]);

  if (!movie) notFound();

  const [related, blogs] = await Promise.all([
    fetchRelated(movie),
    getMovieBlogs(movie.title)
  ]);
  const faqs        = generateTrailerFaqs(movie);
  const seoContent  = generateTrailerSeoContent(movie);
  const year        = getTrailerYear(movie);
  const genres      = movie.genre || [];
  const cast        = (movie.cast || []).filter((c) => !c.type || c.type.toLowerCase() !== "crew").slice(0, 8);
  const crew        = (movie.cast || []).filter((c) => c.type?.toLowerCase() === "crew").slice(0, 8);
  const releaseLabel = fmtDate(movie.releaseDate);
  const production  = (movie.productionId as any)?.name || movie.producer;
  const movieSlug   = movie.slug || movie._id;

  // JSON-LD
  const movieLd     = trailerMovieJsonLd(movie);
  const videoLd     = videoObjectJsonLd(movie);
  const faqLd       = trailerFaqJsonLd(faqs);
  const breadLd     = trailerBreadcrumbJsonLd(movie);

  return (
    <>
      {/* JSON-LD */}
      <script type="application/ld+json" suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(movieLd) }} />
      {videoLd && (
        <script type="application/ld+json" suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: JSON.stringify(videoLd) }} />
      )}
      <script type="application/ld+json" suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <script type="application/ld+json" suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadLd) }} />

      {/* ── Hero banner ─────────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden"
        style={{ background: "linear-gradient(180deg, #0d0800 0%, #0a0a0a 100%)" }}
      >
        {/* Blurred poster bg */}
        {(movie.bannerUrl || movie.posterUrl) && (
          <div className="absolute inset-0 opacity-10">
            <Image
              src={movie.bannerUrl || movie.posterUrl!}
              alt=""
              fill
              className="object-cover object-top blur-2xl scale-110"
            />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/80 to-transparent" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-6">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-xs text-gray-600 mb-6 flex-wrap" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-orange-400 transition-colors">Home</Link>
            <ChevronRight className="w-3 h-3" />
            <Link href="/trailers" className="hover:text-orange-400 transition-colors">Trailers</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-gray-400 truncate max-w-[200px]">{movie.title}</span>
          </nav>

          {/* Genre pills */}
          {genres.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {genres.map((g) => (
                <Link
                  key={g}
                  href={`/trailers?genre=${encodeURIComponent(g)}`}
                  className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 hover:bg-orange-500/20 transition-colors"
                >
                  <Tag className="w-2.5 h-2.5" />
                  {g}
                </Link>
              ))}
            </div>
          )}

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white leading-tight mb-3">
            {movie.title}
            <span className="ml-3 text-xl text-gray-600 font-normal">({year})</span>
          </h1>

          {movie.synopsis && (
            <div className="max-w-3xl mb-6">
              <p className="text-gray-400 text-base leading-relaxed text-left sm:text-justify line-clamp-2">
                {movie.synopsis}
              </p>
              <Link href={`/movie/${movieSlug}`} className="text-orange-500 hover:text-orange-400 text-sm font-semibold mt-1.5 inline-flex items-center gap-1">
                Read full synopsis <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}

          {/* Quick meta chips */}
          <div className="flex flex-wrap gap-2">
            {releaseLabel !== "TBA" && (
              <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-white/5 text-gray-400 border border-white/10">
                <Calendar className="w-3 h-3" />{releaseLabel}
              </span>
            )}
            {movie.runtime && (
              <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-white/5 text-gray-400 border border-white/10">
                <Clock className="w-3 h-3" />{movie.runtime}
              </span>
            )}
            {movie.language && (
              <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-white/5 text-gray-400 border border-white/10">
                <Globe className="w-3 h-3" />{movie.language}
              </span>
            )}
            {movie.contentRating && (
              <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-white/5 text-gray-400 border border-white/10">
                <Award className="w-3 h-3" />{movie.contentRating}
              </span>
            )}
            {movie.verdict && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
                {movie.verdict}
              </span>
            )}
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ── Main 2-column layout ─────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* ── Left: Player + SEO content ──────────────────────────────── */}
          <div className="lg:col-span-2 space-y-10">

            {/* Trailer player */}
            <section aria-label="Trailer player">
              <TrailerPlayer movie={movie} />
            </section>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-3">
              {hasAnyVideo(movie) && (
                <a
                  href={`https://www.youtube.com/watch?v=${getPrimaryVideo(movie)?.ytId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl transition-colors"
                >
                  <Play className="w-4 h-4 fill-white" />
                  Watch on YouTube
                  <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                </a>
              )}
              <Link
                href={`/movie/${movieSlug}`}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#1e1e1e] hover:bg-orange-500/10 border border-[#2a2a2a] hover:border-orange-500/30 text-gray-300 hover:text-orange-400 text-sm font-semibold rounded-xl transition-all"
              >
                <Film className="w-4 h-4" />
                View Full Movie Page
              </Link>
              {movie.media?.songs && movie.media.songs.length > 0 && (
                <Link
                  href={`/songs/${movieSlug}`}
                  className="flex items-center gap-2 px-4 py-2.5 bg-[#1e1e1e] hover:bg-emerald-500/10 border border-[#2a2a2a] hover:border-emerald-500/30 text-gray-300 hover:text-emerald-400 text-sm font-semibold rounded-xl transition-all"
                >
                  <Music className="w-4 h-4" />
                  Playlist
                </Link>
              )}
              <Link
                href="/trailers"
                className="flex items-center gap-2 px-4 py-2.5 bg-[#1e1e1e] hover:bg-white/5 border border-[#2a2a2a] hover:border-white/20 text-gray-500 hover:text-white text-sm font-medium rounded-xl transition-all"
              >
                <Clapperboard className="w-4 h-4" />
                All Trailers
              </Link>
            </div>

            {/* Auto-generated SEO content */}
            <section aria-label={`About ${movie.title} trailer`}>
              <h2 className="text-2xl font-black text-white mb-6 flex items-center gap-3">
                <span className="w-1 h-7 bg-orange-500 rounded-full" />
                About {movie.title}
              </h2>
              <div className="prose prose-invert prose-sm max-w-none
                prose-headings:text-orange-400 prose-headings:font-bold prose-headings:text-base
                prose-p:text-gray-400 prose-p:leading-relaxed prose-p:mb-4
                prose-strong:text-white prose-strong:font-semibold"
              >
                {seoContent.split("\n\n").map((para, i) => {
                  const isHeading = para.startsWith("**") && para.endsWith("**");
                  const content = isHeading ? (
                    <h3 key={`h-${i}`} className="text-orange-400 font-bold text-base mt-6 mb-2">
                      {para.replace(/\*\*/g, "")}
                    </h3>
                  ) : (
                    <p key={`p-${i}`} className="text-gray-400 leading-relaxed mb-4"
                      dangerouslySetInnerHTML={{ __html: para.replace(/\*\*(.+?)\*\*/g, "<strong class='text-white'>$1</strong>") }}
                    />
                  );

                  // Inject two ads directly before these specific headings to guarantee they always show
                  const showAdBefore = para === "**Official Trailer Details**" || para === "**Cast and Crew Highlights**";

                  return (
                    <React.Fragment key={i}>
                      {showAdBefore && (
                        <div className="py-2 my-4 border-y border-[#1f1f1f]">
                          {/* In-content Ad (Visible on all screen sizes, responsive) */}
                          <DisplayAd slot="8191172163" format="auto" />
                        </div>
                      )}
                      {content}
                    </React.Fragment>
                  );
                })}
              </div>
            </section>

            <div className="py-2">
              <DisplayAd slot="8191172163" format="auto" />
            </div>

            {/* Cast section */}
            {cast.length > 0 && (
              <section aria-label="Cast">
                <h2 className="text-xl font-black text-white mb-4 flex items-center gap-3">
                  <span className="w-1 h-6 bg-orange-500 rounded-full" />
                  Cast
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {cast.map((c, i) => (
                    <Link
                      key={i}
                      href={c.castId ? `/cast/${c.castId}` : `/cast?q=${encodeURIComponent(c.name)}`}
                      className="group flex items-center gap-2.5 p-2.5 bg-[#141414] border border-[#252525] rounded-xl hover:border-orange-500/30 hover:bg-orange-500/5 transition-all"
                    >
                      {c.photo ? (
                        <Image src={c.photo} alt={c.name} width={36} height={36}
                          className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 text-orange-400" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-white truncate group-hover:text-orange-400 transition-colors">
                          {c.name}
                        </p>
                        {c.role && <p className="text-[10px] text-gray-600 truncate">{c.role}</p>}
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Crew section */}
            {crew.length > 0 && (
              <section aria-label="Crew">
                <h2 className="text-xl font-black text-white mb-4 flex items-center gap-3">
                  <span className="w-1 h-6 bg-orange-500 rounded-full" />
                  Crew
                </h2>
                <div className="grid grid-cols-2 gap-2">
                  {crew.map((c, i) => (
                    <div key={i} className="flex items-center gap-2.5 p-2.5 bg-[#141414] border border-[#252525] rounded-xl">
                      <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                        <Users className="w-3.5 h-3.5 text-orange-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-white truncate">{c.name}</p>
                        {c.role && <p className="text-[10px] text-gray-600 truncate">{c.role}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Songs section */}
            {(movie.media?.songs || []).length > 0 && (
              <section aria-label="Songs">
                <h2 className="text-xl font-black text-white mb-4 flex items-center gap-3">
                  <span className="w-1 h-6 bg-orange-500 rounded-full" />
                  Songs
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {(movie.media!.songs!).slice(0, 6).map((s, i) => (
                    <SongCard 
                      key={i}
                      href={`/songs/${movieSlug}/${i}/${toSlug(s.title) || String(i)}`}
                      song={{ ...s, title: s.title || `Song ${i + 1}`, movieTitle: movie.title }} 
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Blogs section */}
            {blogs.length > 0 && (
              <section aria-label="Articles" className="mt-8">
                <h2 className="text-xl font-black text-white mb-4 flex items-center gap-3">
                  <span className="w-1 h-6 bg-orange-500 rounded-full" />
                  Articles
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {blogs.map((b: any) => (
                    <BlogCard key={b._id} blog={b} variant="standard" />
                  ))}
                </div>
              </section>
            )}

            {/* FAQ section */}
            <section aria-label="Frequently Asked Questions">
              <h2 className="text-xl font-black text-white mb-6 flex items-center gap-3">
                <span className="w-1 h-6 bg-orange-500 rounded-full" />
                Frequently Asked Questions
              </h2>
              <div className="space-y-3">
                {faqs.map((faq, i) => (
                  <details
                    key={i}
                    className="group bg-[#141414] border border-[#252525] rounded-xl overflow-hidden"
                  >
                    <summary className="flex items-center justify-between gap-3 px-4 py-3.5 cursor-pointer text-sm font-semibold text-gray-300 hover:text-white transition-colors list-none">
                      <span className="flex items-center gap-2">
                        <Info className="w-4 h-4 text-orange-400 flex-shrink-0" />
                        {faq.question}
                      </span>
                      <ChevronRight className="w-4 h-4 text-gray-600 group-open:rotate-90 transition-transform flex-shrink-0" />
                    </summary>
                    <div className="px-4 pb-4 pt-0">
                      <p className="text-sm text-gray-400 leading-relaxed">{faq.answer}</p>
                    </div>
                  </details>
                ))}
              </div>
            </section>
          </div>

          {/* ── Right sidebar: Movie details (sticky) ──────────────────── */}
          <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
            {/* Poster */}
            <div className="relative aspect-[2/3] rounded-2xl overflow-hidden bg-[#1a1a1a]">
              <Image
                src={movie.posterUrl || movie.thumbnailUrl || "/placeholder-movie.jpg"}
                alt={`${movie.title} poster`}
                fill
                sizes="(max-width: 1024px) 100vw, 33vw"
                className="object-cover"
              />
            </div>

            {/* Movie info card */}
            <div className="bg-[#141414] border border-[#252525] rounded-2xl p-4">
              <h3 className="text-sm font-black text-white mb-4 uppercase tracking-wide">Movie Details</h3>
              <div className="space-y-0">
                {releaseLabel !== "TBA" && (
                  <MetaRow icon={Calendar} label="Release Date" value={releaseLabel} />
                )}
                {movie.director && (
                  <MetaRow icon={User} label="Director" value={movie.director}
                    href={`/cast?q=${encodeURIComponent(movie.director)}`} />
                )}
                {movie.producer && (
                  <MetaRow icon={Users} label="Producer" value={movie.producer} />
                )}
                {production && !movie.producer && (
                  <MetaRow icon={Film} label="Production" value={production} />
                )}
                {movie.runtime && (
                  <MetaRow icon={Clock} label="Runtime" value={movie.runtime} />
                )}
                {movie.language && (
                  <MetaRow icon={Globe} label="Language" value={movie.language} />
                )}
                {genres.length > 0 && (
                  <MetaRow icon={Tag} label="Genre" value={genres.join(", ")} />
                )}
                {movie.budget && (
                  <MetaRow icon={DollarSign} label="Budget" value={movie.budget} />
                )}
                {movie.contentRating && (
                  <MetaRow icon={Award} label="Certification" value={movie.contentRating} />
                )}
                {movie.verdict && (
                  <MetaRow icon={Star} label="Verdict" value={movie.verdict} />
                )}
                {movie.media?.trailerReleaseDate && (
                  <MetaRow icon={Play} label="Trailer Released" value={fmtDate(movie.media.trailerReleaseDate)} />
                )}
              </div>
            </div>

            {/* Video availability */}
            <div className="bg-[#141414] border border-[#252525] rounded-2xl p-4">
              <h3 className="text-sm font-black text-white mb-3 uppercase tracking-wide">Available Videos</h3>
              <div className="space-y-2">
                {[
                  { label: "Official Trailer", available: hasTrailer(movie), color: "text-red-400" },
                  { label: "Official Teaser",  available: hasTeaser(movie),  color: "text-amber-400" },
                  { label: "Motion Poster",    available: hasMotionPoster(movie), color: "text-blue-400" },
                  { label: "First Look",       available: hasFirstLook(movie), color: "text-purple-400" },
                  { label: "Songs",            available: (movie.media?.songs || []).some(s => s.ytId), color: "text-emerald-400" },
                ].map(({ label, available, color }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">{label}</span>
                    <span className={`text-xs font-semibold ${available ? color : "text-gray-700"}`}>
                      {available ? "✓ Available" : "Coming Soon"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* View full movie page CTA */}
            <Link
              href={`/movie/${movieSlug}`}
              className="flex items-center justify-between w-full p-4 bg-orange-500/10 border border-orange-500/30 rounded-2xl hover:bg-orange-500/15 transition-colors group"
            >
              <div>
                <p className="text-sm font-bold text-orange-400">View Full Movie Page</p>
                <p className="text-xs text-gray-500 mt-0.5">Reviews, box office, songs & more</p>
              </div>
              <ChevronRight className="w-5 h-5 text-orange-400 group-hover:translate-x-0.5 transition-transform" />
            </Link>

            {/* Sidebar Ad (Visible on all screen sizes, responsive) */}
            <DisplayAd slot="8191172163" format="auto" />
          </aside>
        </div>

        {/* ── Related Movies ──────────────────────────────────────────────── */}
        {related.length > 0 && (
          <section className="mt-16" aria-label="Related movies">
            <div className="flex items-center gap-3 mb-6">
              <span className="w-1 h-7 bg-orange-500 rounded-full" />
              <h2 className="text-xl md:text-2xl font-black text-white">You May Also Like</h2>
              <span className="text-sm text-gray-600">Based on genre &amp; director</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-4">
              {related.map((m) => (
                <TrailerCard key={String(m._id)} movie={m} />
              ))}
            </div>
          </section>
        )}

        {/* ── Internal linking ──────────────────────────────────────────── */}
        <section className="mt-12 pt-8 border-t border-white/[0.05]" aria-label="Explore Ollypedia">
          <p className="text-sm text-gray-600 mb-4 font-semibold uppercase tracking-wider">Explore More</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/trailers" className="text-xs px-3 py-1.5 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] text-gray-500 hover:text-orange-400 hover:border-orange-500/30 transition-all">
              ← All Trailers
            </Link>
            {genres.map((g) => (
              <Link
                key={g}
                href={`/trailers?genre=${encodeURIComponent(g)}`}
                className="text-xs px-3 py-1.5 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] text-gray-500 hover:text-orange-400 hover:border-orange-500/30 transition-all"
              >
                {g} Trailers
              </Link>
            ))}
            {movie.director && (
              <Link
                href={`/cast?q=${encodeURIComponent(movie.director)}`}
                className="text-xs px-3 py-1.5 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] text-gray-500 hover:text-orange-400 hover:border-orange-500/30 transition-all"
              >
                More by {movie.director}
              </Link>
            )}
            <Link href="/movies" className="text-xs px-3 py-1.5 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] text-gray-500 hover:text-orange-400 hover:border-orange-500/30 transition-all">
              All Odia Movies
            </Link>
            <Link href={`/movie/${movieSlug}`} className="text-xs px-3 py-1.5 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] text-gray-500 hover:text-orange-400 hover:border-orange-500/30 transition-all">
              {movie.title} Full Page
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
