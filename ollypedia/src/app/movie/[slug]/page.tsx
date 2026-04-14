// app/movie/[slug]/page.tsx
// SEO UPGRADE v2 — changes on top of existing fixes:
//  ★ 1. Rich keyword set — movie name + all Odia long-tail variants
//  ★ 2. getMovieBlogs() — fetches related blog posts for this movie
//  ★ 3. MovieSeoInterlinks server block — cross-links movie → blogs → songs
//  ★ 4. JSON-LD extended: blog ItemList + song ItemList added to structured data
//  ★ 5. Song rows now link to /songs/[movieSlug]/[i]/[songSlug] (SEO URLs)
//  ★ 6. Each song in the Songs section has an anchor tag for Google to follow

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { connectDB } from "@/lib/db";
import Movie from "@/models/Movie";
import Blog from "@/models/Blog";
import { buildMeta, movieJsonLd, breadcrumbJsonLd } from "@/lib/seo";
import { YouTubeEmbed }  from "@/components/ui/YouTubeEmbed";
import { Breadcrumb }    from "@/components/ui/Breadcrumb";
import { VoteButtons }   from "@/components/ui/VoteButtons";
import { ReviewForm }    from "@/components/movie/ReviewForm";
import { MovieCard }     from "@/components/movie/MovieCard";
import { StarRating }    from "@/components/ui/StarRating";
import { SongRowClient } from "@/components/movie/SongRowClient";
import { Calendar, Clock, User, DollarSign, Film, Star, Clapperboard, Music, FileText } from "lucide-react";

export const revalidate    = 3600;
export const dynamicParams = true;

// ─── helpers ───────────────────────────────────────────────────
function toSlug(str?: string): string {
  return (str || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// ─── Static params ─────────────────────────────────────────────
export async function generateStaticParams() {
  await connectDB();
  const movies = await Movie.find({}, "slug _id")
    .sort({ releaseDate: -1 })
    .limit(200)
    .lean();
  return movies.map((m: any) => ({ slug: m.slug || String(m._id) }));
}

// ─── Data helpers ──────────────────────────────────────────────
async function getMovie(slug: string) {
  await connectDB();
  const isOid = /^[a-f0-9]{24}$/i.test(slug);
  const raw = isOid
    ? await Movie.findById(slug).populate("productionId", "name logo").lean()
    : await Movie.findOne({ slug }).populate("productionId", "name logo").lean();
  if (!raw) return null;
  return JSON.parse(JSON.stringify(raw));
}

async function getRelated(movie: any) {
  await connectDB();
  const raw = await Movie.find(
    { _id: { $ne: movie._id }, genre: { $in: movie.genre || [] } },
    "title slug posterUrl thumbnailUrl releaseDate genre verdict"
  ).limit(5).lean();
  return JSON.parse(JSON.stringify(raw));
}

// ★ NEW — fetch blog posts that mention this movie
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

// ─── Metadata ─────────────────────────────────────────────────

// --- Fuzzy misspelling generator ---
// Generates typo variants so Google associates misspelled searches with this page
// e.g. "Damen", "Daamn", "Dman" all point to "Daman"
function getMisspellings(title: string): string[] {
  if (!title) return [];
  const variants = new Set<string>();
  const words = title.trim().split(/\s+/);

  for (const word of words) {
    if (word.length < 3) continue;
    const w = word.toLowerCase();
    // Double -> single vowel: "Daaman" -> "Daman"
    variants.add(w.replace(/([aeiou])\1+/g, "$1"));
    // Single -> double vowel: "Daman" -> "Daaman"
    variants.add(w.replace(/([aeiou])(?!\1)/g, "$1$1"));
    // Drop last char: "Daman" -> "Dama"
    variants.add(w.slice(0, -1));
    // Vowel swaps
    variants.add(w.replace(/a/g, "e"));
    variants.add(w.replace(/a/g, "o"));
    variants.add(w.replace(/e/g, "i"));
    variants.add(w.replace(/u/g, "o"));
    // Transposed letters
    for (let i = 0; i < w.length - 1; i++) {
      variants.add(w.slice(0, i) + w[i + 1] + w[i] + w.slice(i + 2));
    }
    // h insertion/removal (common in Odia romanisation)
    variants.add(w.replace(/h/g, ""));
    variants.add(w.replace(/([sc])([aeiou])/g, "$1h$2"));
    // ph <-> f
    variants.add(w.replace(/ph/g, "f"));
    variants.add(w.replace(/f/g, "ph"));
  }

  const result: string[] = [];
  variants.forEach((v) => {
    if (v && v !== title.toLowerCase() && v.length > 2) {
      result.push(v);
      result.push(`${v} odia movie`);
      result.push(`${v} odia film`);
    }
  });
  return result;
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const movie = await getMovie(params.slug);

  if (!movie) {
    return { robots: { index: false, follow: false } };
  }

  const year        = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : "";
  const yearStr     = year ? ` (${year})` : "";
  const title       = `${movie.title}${yearStr} – Cast, Songs & Review | Ollypedia`;
  const description = (
    movie.synopsis?.slice(0, 155) ||
    `Complete information about the Odia film ${movie.title}${yearStr} including cast, songs, reviews and box office.`
  );
  const image     = movie.posterUrl || movie.thumbnailUrl || "https://ollypedia.in/default.jpg";
  const canonical = `https://ollypedia.in/movie/${movie.slug || movie._id}`;

  // ★ Rich keyword set — every way someone might search this movie
  const keywords = [
    movie.title,
    `${movie.title} odia movie`,
    `${movie.title} odia film`,
    `${movie.title} ollywood`,
    `${movie.title} review`,
    `${movie.title} songs`,
    `${movie.title} cast`,
    `${movie.title} trailer`,
    year ? `${movie.title} ${year}` : null,
    year ? `${movie.title} odia movie ${year}` : null,
    movie.director ? `${movie.director} movie` : null,
    movie.director ? `${movie.director} odia film` : null,
    "Odia movie",
    "Ollywood",
    "Odia film",
    "Odia cinema",
    year ? `Odia movie ${year}` : null,
    year ? `Ollywood ${year}` : null,
    "Odisha film",
    ...(movie.genre || []).map((g: string) => `${g} Odia film`),
    ...(movie.cast  || []).slice(0, 3).map((c: any) => c.name).filter(Boolean),
    // Fuzzy misspelling variants — helps Google match typo searches to this page
    ...getMisspellings(movie.title),
  ].filter(Boolean) as string[];

  return {
    title,
    description,
    keywords,
    alternates: { canonical },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: "Ollypedia",
      type: "video.movie",
      images: [{ url: image, width: 1200, height: 630, alt: movie.title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

// ─── UI helpers ────────────────────────────────────────────────
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

// ★ NEW — server-rendered SEO interlinks block
// Always visible to Google. Cross-links: movie → blogs → songs
function MovieSeoInterlinks({
  movie,
  blogs,
  year,
  songs,
}: {
  movie: any;
  blogs: any[];
  year: string | number;
  songs: any[];
}) {
  return (
    <section
      aria-label="Related content"
      className="mt-10 pt-8 border-t border-[#1f1f1f] space-y-5"
    >
      {/* ── About this movie (SEO prose) ── */}
      <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-xl p-5">
        <h2 className="text-white font-bold text-sm mb-2 flex items-center gap-2">
          <span className="w-4 h-[2.5px] bg-orange-500 rounded inline-block" />
          About {movie.title}{year ? ` (${year})` : ""}
        </h2>
        <p className="text-gray-400 text-sm leading-relaxed">
          <strong className="text-white">{movie.title}</strong> is
          {movie.genre?.length ? ` a ${movie.genre.join(", ")}` : " an"} Odia film
          {year ? ` released in ${year}` : ""}.
          {movie.director && (
            <> Directed by <strong className="text-white">{movie.director}</strong>.</>
          )}
          {movie.producer && (
            <> Produced by <strong className="text-white">{movie.producer}</strong>.</>
          )}
          {movie.verdict && (
            <> The film was declared a <strong className="text-white">{movie.verdict}</strong> at the box office.</>
          )}
          {songs.length > 0 && (
            <> The soundtrack features{" "}
              <strong className="text-white">{songs.length} song{songs.length > 1 ? "s" : ""}</strong>{" "}
              available on Ollypedia.
            </>
          )}
        </p>

        {/* Hidden SEO misspelling text — visually subtle, machine-readable */}
        {/* Google indexes this text and maps typo searches to this page */}
        <p className="text-[#1a1a1a] text-[0px] select-none" aria-hidden="true">
          {`Also searched as: ${getMisspellings(movie.title).slice(0, 12).join(", ")}`}
        </p>

        {/* Discovery pills */}
        <div className="flex flex-wrap gap-2 mt-3">
          {year && (
            <Link href={`/movies/year/${year}`} className="text-xs text-orange-400/70 hover:text-orange-400 bg-orange-500/8 border border-orange-500/15 px-2.5 py-1 rounded-full transition-colors">
              📅 Odia Movies {year}
            </Link>
          )}
          {(movie.genre || []).map((g: string) => (
            <Link key={g} href={`/movies?genre=${encodeURIComponent(g)}`} className="text-xs text-orange-400/70 hover:text-orange-400 bg-orange-500/8 border border-orange-500/15 px-2.5 py-1 rounded-full transition-colors">
              🎭 {g} Films
            </Link>
          ))}
          <Link href="/movies" className="text-xs text-orange-400/70 hover:text-orange-400 bg-orange-500/8 border border-orange-500/15 px-2.5 py-1 rounded-full transition-colors">
            🎬 All Odia Movies
          </Link>
          <Link href="/blog/category/movie-review" className="text-xs text-orange-400/70 hover:text-orange-400 bg-orange-500/8 border border-orange-500/15 px-2.5 py-1 rounded-full transition-colors">
            ⭐ Movie Reviews
          </Link>
          <Link href="/songs/category/latest" className="text-xs text-orange-400/70 hover:text-orange-400 bg-orange-500/8 border border-orange-500/15 px-2.5 py-1 rounded-full transition-colors">
            🎵 Latest Songs
          </Link>
        </div>
      </div>

      {/* ── Blog posts for this movie ── */}
      {blogs.length > 0 && (
        <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-xl p-5">
          <h2 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
            <span className="w-4 h-[2.5px] bg-orange-500 rounded inline-block" />
            Articles & Reviews — {movie.title}
          </h2>
          <ul className="flex flex-col gap-1">
            {blogs.map((b: any) => (
              <li key={b._id}>
                <Link
                  href={`/blog/${b.slug}`}
                  className="flex items-start gap-3 p-2 rounded-lg hover:bg-[#181818] group transition-colors"
                >
                  {b.coverImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={b.coverImage}
                      alt={b.title}
                      width={58}
                      height={38}
                      className="w-[58px] h-[38px] object-cover rounded flex-shrink-0 border border-[#222]"
                    />
                  ) : (
                    <div className="w-[58px] h-[38px] flex-shrink-0 bg-[#1a1a1a] rounded border border-[#222] flex items-center justify-center">
                      <FileText className="w-4 h-4 text-gray-600" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-300 group-hover:text-orange-400 transition-colors line-clamp-2">
                      {b.title}
                    </p>
                    {b.category && (
                      <p className="text-xs text-gray-600 mt-0.5">{b.category}</p>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Song links (SEO anchor links to individual song pages) ── */}
      {songs.length > 0 && (
        <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-xl p-5">
          <h2 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
            <span className="w-4 h-[2.5px] bg-orange-500 rounded inline-block" />
            Songs from {movie.title} — Full Soundtrack
          </h2>
          <ul className="flex flex-wrap gap-2">
            {songs.map((s: any, i: number) => (
              <li key={i}>
                <Link
                  href={`/songs/${movie.slug}/${i}/${toSlug(s.title) || String(i)}`}
                  className="text-xs text-gray-400 hover:text-orange-400 bg-[#181818] hover:bg-orange-500/10 border border-[#222] hover:border-orange-500/30 px-3 py-1.5 rounded-full transition-all"
                >
                  🎵 {s.title}
                  {s.singer && <span className="text-gray-600 ml-1">· {s.singer}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────
export default async function MovieDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const movie = await getMovie(params.slug);

  if (!movie) notFound();
  if (!movie.title?.trim()) notFound();

  // ★ Fetch related blogs and related movies in parallel
  const [related, blogs] = await Promise.all([
    getRelated(movie),
    getMovieBlogs(movie.title),
  ]);

  const avgRating = movie.reviews?.length
    ? movie.reviews.reduce((s: number, r: any) => s + (r.rating || 0), 0) / movie.reviews.length
    : null;
  const year    = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : "";
  const songs   = movie.media?.songs || [];
  const trailer = movie.media?.trailer;
  const canonical = `https://ollypedia.in/movie/${movie.slug || movie._id}`;

  // ★ Extended JSON-LD — now includes blog + song ItemLists
  const structuredData = [
    movieJsonLd(movie),
    breadcrumbJsonLd([
      { name: "Home",   url: "https://ollypedia.in/" },
      { name: "Movies", url: "https://ollypedia.in/movies" },
      { name: movie.title, url: canonical },
    ]),
    // ★ Blog posts about this movie — helps Google link pages together
    ...(blogs.length > 0
      ? [{
          "@context": "https://schema.org",
          "@type": "ItemList",
          "name": `Articles about ${movie.title}`,
          "itemListElement": blogs.map((b: any, i: number) => ({
            "@type": "ListItem",
            "position": i + 1,
            "name": b.title,
            "url": `https://ollypedia.in/blog/${b.slug}`,
          })),
        }]
      : []),
    // ★ Songs list — helps Google index individual song pages from here
    ...(songs.length > 0
      ? [{
          "@context": "https://schema.org",
          "@type": "MusicAlbum",
          "name": `${movie.title} Original Soundtrack`,
          "numTracks": songs.length,
          "track": songs.map((s: any, i: number) => ({
            "@type": "MusicRecording",
            "name": s.title,
            "url": `https://ollypedia.in/songs/${movie.slug}/${i}/${toSlug(s.title) || String(i)}`,
            ...(s.singer && { "byArtist": { "@type": "Person", "name": s.singer } }),
          })),
        }]
      : []),
  ];

  return (
    <>
      {structuredData.map((sd: any, i: number) => (
        <script key={i} type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(sd) }} />
      ))}

      {/* Banner */}
      {(movie.bannerUrl || movie.posterUrl) && (
        <div className="relative h-64 md:h-80 overflow-hidden">
          <Image src={movie.bannerUrl || movie.posterUrl} alt={movie.title}
            fill className="object-cover object-top" priority />
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

            <div className="bg-[#111] border border-[#1f1f1f] rounded-xl p-4">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Movie Info</h2>
              <InfoRow icon={Calendar}     label="Release Date" value={movie.releaseDate || (movie.releaseTBA ? "TBA" : "")} />
              <InfoRow icon={Clock}        label="Runtime"      value={movie.runtime} />
              <InfoRow icon={Film}         label="Language"     value={movie.language || "Odia"} />
              <InfoRow icon={Clapperboard} label="Director"     value={movie.director} />
              <InfoRow icon={User}         label="Producer"     value={movie.producer} />
              <InfoRow icon={DollarSign}   label="Budget"       value={movie.budget} />
              <InfoRow icon={Film}         label="Category"     value={movie.category} />
              {movie.contentRating && <InfoRow icon={Star} label="Rating" value={movie.contentRating} />}
            </div>

            {(movie.boxOffice?.opening || movie.boxOffice?.total) && (
              <div className="bg-[#111] border border-[#1f1f1f] rounded-xl p-4">
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Box Office</h2>
                {[
                  ["Opening",    movie.boxOffice.opening],
                  ["First Week", movie.boxOffice.firstWeek],
                  ["Total",      movie.boxOffice.total],
                ].filter(([, v]) => v && v !== "TBA").map(([label, val]) => (
                  <div key={String(label)} className="flex justify-between py-2 border-b border-[#1f1f1f] last:border-0">
                    <span className="text-xs text-gray-500">{label}</span>
                    <span className="text-sm font-semibold text-green-400">{val}</span>
                  </div>
                ))}
                {movie.verdict && (
                  <div className="mt-3 flex justify-center">
                    <span className={`badge text-sm px-4 py-1 ${
                      movie.verdict.toLowerCase().includes("hit")  ? "badge-green" :
                      movie.verdict.toLowerCase().includes("flop") ? "badge-red"   : "badge-orange"
                    }`}>{movie.verdict}</span>
                  </div>
                )}
              </div>
            )}

            <VoteButtons movieId={String(movie._id)}
              initialYes={movie.interestedYes || 0} initialNo={movie.interestedNo || 0} />
          </aside>

          {/* Main */}
          <main className="lg:col-span-2 space-y-8">
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

            {trailer?.ytId && (
              <div>
                <h2 className="font-display font-bold text-xl text-white mb-3">Official Trailer</h2>
                <YouTubeEmbed ytId={trailer.ytId} title={`${movie.title} Official Trailer`} />
              </div>
            )}

            {movie.synopsis && (
              <div>
                <h2 className="font-display font-bold text-xl text-white mb-3">Synopsis</h2>
                <p className="text-gray-300 leading-relaxed">{movie.synopsis}</p>
              </div>
            )}

            {movie.story && (
              <div className="bg-[#111] border border-[#1f1f1f] rounded-xl p-6">
                <h2 className="font-display font-bold text-2xl text-white mb-4">Story</h2>
                <div className="prose-odia" dangerouslySetInnerHTML={{ __html: movie.story }} />
              </div>
            )}

            {movie.cast?.length > 0 && (
              <div>
                <h2 className="font-display font-bold text-xl text-white mb-4">Cast & Crew</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {movie.cast.map((member: any, i: number) => (
                    <Link key={i} href={`/cast/${member.castId}`}
                      className="card p-3 flex items-center gap-3 group">
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

            {/* Songs section — SongRowClient handles its own interactivity */}
            {songs.length > 0 && (
              <div>
                <h2 className="font-display font-bold text-xl text-white mb-4 flex items-center gap-2">
                  <Music className="w-5 h-5 text-orange-500" /> Songs ({songs.length})
                </h2>
                <div className="space-y-2">
                  {songs.map((song: any, i: number) => (
                    // NOTE: do NOT add a <Link> here — SongRowClient already renders
                    // an <a> tag internally. Nesting <a> inside <a> causes hydration errors.
                    // SEO links to individual song pages are handled by MovieSeoInterlinks below.
                    <SongRowClient key={i} song={song} index={i + 1} />
                  ))}
                </div>
              </div>
            )}

            {movie.review && (
              <div className="bg-[#111] border border-[#1f1f1f] rounded-xl p-6">
                <h2 className="font-display font-bold text-2xl text-white mb-4">Ollypedia Review</h2>
                <div className="prose-odia" dangerouslySetInnerHTML={{ __html: movie.review }} />
              </div>
            )}

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

            {/* ★ SEO interlinks block — server-rendered, always visible to Google */}
            <MovieSeoInterlinks
              movie={movie}
              blogs={blogs}
              year={year}
              songs={songs}
            />
          </main>
        </div>

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