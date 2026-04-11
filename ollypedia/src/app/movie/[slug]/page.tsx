
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const revalidate = 3600; // ISR: re-fetch every 1 hour
export const dynamicParams = true; // build unknown slugs on-demand
import Image from "next/image";
import Link from "next/link";
import { connectDB } from "@/lib/db";
import Movie from "@/models/Movie";
import { buildMeta, movieJsonLd, breadcrumbJsonLd } from "@/lib/seo";
import { YouTubeEmbed } from "@/components/ui/YouTubeEmbed";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { VoteButtons } from "@/components/ui/VoteButtons";
import { ReviewForm } from "@/components/movie/ReviewForm";
import { MovieCard } from "@/components/movie/MovieCard";
import { StarRating } from "@/components/ui/StarRating";
import { SongRowClient } from "@/components/movie/SongRowClient";
import { Calendar, Clock, User, DollarSign, Film, Star, Clapperboard, Music } from "lucide-react";

export async function generateStaticParams() {
  await connectDB();
  const movies = await Movie.find({}, "slug _id").lean();
  return movies.map((m: any) => ({ slug: m.slug || String(m._id) }));
}

async function getMovie(slug: string) {
  await connectDB();
  const isOid = /^[a-f0-9]{24}$/i.test(slug);
  const movie = isOid
    ? await Movie.findById(slug).populate("productionId", "name logo").lean()
    : await Movie.findOne({ slug }).populate("productionId", "name logo").lean();
  return movie as any;
}

async function getRelated(movie: any) {
  if (!movie) return [];
  await connectDB();
  return Movie.find(
    { _id: { $ne: movie._id }, genre: { $in: movie.genre || [] } },
    "title slug posterUrl thumbnailUrl releaseDate genre verdict"
  ).limit(5).lean();
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const movie = await getMovie(params.slug);
  if (!movie) return {};
  return buildMeta({
    title: `${movie.title} (${movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : "Odia"}) – Cast, Songs, Review`,
    description: movie.synopsis?.slice(0, 160) || `Complete information about the Odia film ${movie.title}.`,
    keywords: [movie.title, "Odia movie", "Ollywood", ...(movie.genre || [])],
    image: movie.posterUrl || movie.thumbnailUrl,
    url: `/movie/${movie.slug || movie._id}`,
    type: "video.movie",
  });
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-3 border-b border-[#1f1f1f] last:border-0">
      <div className="w-8 h-8 bg-orange-500/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon className="w-4 h-4 text-orange-400" />
      </div>
      <div>
        <p className="text-xs text-gray-500 mb-0.5">{label}</p>
        <p className="text-sm text-white font-medium">{value}</p>
      </div>
    </div>
  );
}

export default async function MovieDetailPage({ params }: { params: { slug: string } }) {
  const movie = await getMovie(params.slug);
  if (!movie) notFound();

  const related = await getRelated(movie);
  const avgRating = movie.reviews?.length
    ? movie.reviews.reduce((s: number, r: any) => s + (r.rating || 0), 0) / movie.reviews.length
    : null;
  const year = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : "";
  const songs = movie.media?.songs || [];
  const trailer = movie.media?.trailer;

  const structuredData = [
    movieJsonLd(movie),
    breadcrumbJsonLd([
      { name: "Home", url: "/" },
      { name: "Movies", url: "/movies" },
      { name: movie.title, url: `/movie/${movie.slug || movie._id}` },
    ]),
  ];

  return (
    <>
      {structuredData.map((sd: any, i: number) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(sd) }} />
      ))}

      {/* Banner */}
      {(movie.bannerUrl || movie.posterUrl) && (
        <div className="relative h-64 md:h-80 overflow-hidden">
          <Image src={movie.bannerUrl || movie.posterUrl} alt={movie.title} fill className="object-cover object-top" priority />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0a0a0a]/60 to-[#0a0a0a]" />
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumb crumbs={[{ label: "Movies", href: "/movies" }, { label: movie.title }]} />

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Sidebar */}
          <aside className="lg:col-span-1 space-y-5">
            <div className="relative aspect-[2/3] rounded-2xl overflow-hidden border border-[#2a2a2a] shadow-2xl">
              <Image
                src={movie.posterUrl || movie.thumbnailUrl || "/placeholder-movie.svg"}
                alt={`${movie.title} poster`}
                fill className="object-cover" priority
              />
            </div>

            {/* Info card */}
            <div className="bg-[#111] border border-[#1f1f1f] rounded-xl p-4">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Movie Info</h2>
              <InfoRow icon={Calendar}    label="Release Date"   value={movie.releaseDate || (movie.releaseTBA ? "TBA" : "")} />
              <InfoRow icon={Clock}       label="Runtime"        value={movie.runtime} />
              <InfoRow icon={Film}        label="Language"       value={movie.language || "Odia"} />
              <InfoRow icon={Clapperboard} label="Director"      value={movie.director} />
              <InfoRow icon={User}        label="Producer"       value={movie.producer} />
              <InfoRow icon={DollarSign}  label="Budget"         value={movie.budget} />
              <InfoRow icon={Film}        label="Category"       value={movie.category} />
              {movie.contentRating && <InfoRow icon={Star} label="Rating" value={movie.contentRating} />}
            </div>

            {/* Box office */}
            {(movie.boxOffice?.opening || movie.boxOffice?.total) && (
              <div className="bg-[#111] border border-[#1f1f1f] rounded-xl p-4">
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Box Office</h2>
                {[
                  ["Opening",       movie.boxOffice.opening],
                  ["First Week",    movie.boxOffice.firstWeek],
                  ["Total",         movie.boxOffice.total],
                ].filter(([, v]) => v && v !== "TBA").map(([label, val]) => (
                  <div key={String(label)} className="flex justify-between py-2 border-b border-[#1f1f1f] last:border-0">
                    <span className="text-xs text-gray-500">{label}</span>
                    <span className="text-sm font-semibold text-green-400">{val}</span>
                  </div>
                ))}
                {movie.verdict && (
                  <div className="mt-3 flex justify-center">
                    <span className={`badge text-sm px-4 py-1 ${
                      movie.verdict.toLowerCase().includes("hit") ? "badge-green" :
                      movie.verdict.toLowerCase().includes("flop") ? "badge-red" : "badge-orange"
                    }`}>
                      {movie.verdict}
                    </span>
                  </div>
                )}
              </div>
            )}

            <VoteButtons movieId={String(movie._id)} initialYes={movie.interestedYes || 0} initialNo={movie.interestedNo || 0} />
          </aside>

          {/* Main content */}
          <main className="lg:col-span-2 space-y-8">
            {/* Title + genres */}
            <div>
              <div className="flex flex-wrap gap-2 mb-3">
                {(movie.genre || []).map((g: string) => (
                  <Link key={g} href={`/movies?genre=${g}`}><span className="badge-orange">{g}</span></Link>
                ))}
                {movie.language && <span className="badge-blue">{movie.language}</span>}
              </div>
              <h1 className="font-display text-4xl md:text-5xl font-black text-white leading-tight mb-2">
                {movie.title}
                {year && <span className="text-gray-500 text-3xl font-normal ml-3">({year})</span>}
              </h1>
              {avgRating !== null && (
                <div className="flex items-center gap-3 mt-3">
                  <div className="flex items-center gap-2 bg-[#111] border border-[#1f1f1f] rounded-lg px-3 py-2">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-bold text-white">{(avgRating as number).toFixed(1)}</span>
                    <span className="text-gray-500 text-xs">/ 10</span>
                  </div>
                  <StarRating rating={avgRating as number} />
                  <span className="text-xs text-gray-500">{movie.reviews?.length} reviews</span>
                </div>
              )}
            </div>

            {/* Trailer */}
            {trailer?.ytId && (
              <div>
                <h2 className="font-display font-bold text-xl text-white mb-3">Official Trailer</h2>
                <YouTubeEmbed ytId={trailer.ytId} title={`${movie.title} Official Trailer`} />
              </div>
            )}

            {/* Synopsis */}
            {movie.synopsis && (
              <div>
                <h2 className="font-display font-bold text-xl text-white mb-3">Synopsis</h2>
                <p className="text-gray-300 leading-relaxed">{movie.synopsis}</p>
              </div>
            )}

            {/* Full Story */}
            {movie.story && (
              <div className="bg-[#111] border border-[#1f1f1f] rounded-xl p-6">
                <h2 className="font-display font-bold text-2xl text-white mb-4">Story</h2>
                <div className="prose-odia" dangerouslySetInnerHTML={{ __html: movie.story }} />
              </div>
            )}

            {/* Cast */}
            {movie.cast?.length > 0 && (
              <div>
                <h2 className="font-display font-bold text-xl text-white mb-4">Cast & Crew</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {movie.cast.map((member: any, i: number) => (
                    <Link key={i} href={`/cast/${member.castId}`} className="card p-3 flex items-center gap-3 group">
                      <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0 border-2 border-[#2a2a2a] group-hover:border-orange-500/50 transition-colors">
                        <Image src={member.photo || "/placeholder-person.svg"} alt={member.name} fill className="object-cover" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white line-clamp-1 group-hover:text-orange-400 transition-colors">{member.name}</p>
                        <p className="text-xs text-gray-500 line-clamp-1">{member.role || member.type}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Songs */}
            {songs.length > 0 && (
              <div>
                <h2 className="font-display font-bold text-xl text-white mb-4 flex items-center gap-2">
                  <Music className="w-5 h-5 text-orange-500" /> Songs ({songs.length})
                </h2>
                <div className="space-y-2">
                  {songs.map((song: any, i: number) => (
                    <SongRowClient key={i} song={song} index={i + 1} />
                  ))}
                </div>
              </div>
            )}

            {/* Editorial Review */}
            {movie.review && (
              <div className="bg-[#111] border border-[#1f1f1f] rounded-xl p-6">
                <h2 className="font-display font-bold text-2xl text-white mb-4">Ollypedia Review</h2>
                <div className="prose-odia" dangerouslySetInnerHTML={{ __html: movie.review }} />
              </div>
            )}

            {/* User Reviews */}
            <div>
              <h2 className="font-display font-bold text-xl text-white mb-4">
                User Reviews
                {movie.reviews?.length > 0 && (
                  <span className="text-gray-500 text-sm font-normal ml-2">({movie.reviews.length})</span>
                )}
              </h2>
              {movie.reviews?.length > 0 ? (
                <div className="space-y-4 mb-6">
                  {movie.reviews.slice(0, 5).map((r: any, i: number) => (
                    <div key={i} className="bg-[#111] border border-[#1f1f1f] rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-orange-500/20 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-orange-400" />
                          </div>
                          <span className="text-sm font-semibold text-white">{r.user || "Anonymous"}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm font-bold text-white">{r.rating}/10</span>
                        </div>
                      </div>
                      <p className="text-gray-300 text-sm leading-relaxed">{r.text}</p>
                      {r.date && <p className="text-xs text-gray-600 mt-2">{new Date(r.date).toLocaleDateString("en-IN")}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm mb-6">No reviews yet. Be the first!</p>
              )}
              <ReviewForm movieId={String(movie._id)} />
            </div>
          </main>
        </div>

        {/* Related Movies */}
        {(related as any[]).length > 0 && (
          <section className="mt-12 pt-10 border-t border-[#1f1f1f]">
            <h2 className="font-display font-bold text-2xl text-white mb-6">Related Movies</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              {(related as any[]).map((m) => (
                <MovieCard key={String(m._id)} movie={m} />
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
