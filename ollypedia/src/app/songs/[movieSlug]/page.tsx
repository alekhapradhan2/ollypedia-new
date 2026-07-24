import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { connectDB } from "@/lib/db";
import Movie from "@/models/Movie";
import { SITE_URL } from "@/lib/seo";
import { ChevronRight, Music, Play, Disc, Film, Tv } from "lucide-react";

export const revalidate = 600;

interface Props {
  params: { movieSlug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await connectDB();
  const movie = await Movie.findOne({
    $or: [{ slug: params.movieSlug }, { _id: params.movieSlug.length === 24 ? params.movieSlug : null }],
  }).select("title slug posterUrl media.songs").lean() as any;

  if (!movie) return {};

  const title = `${movie.title} Songs & MP3 Audio | Odia Movie Songs`;
  const description = `Listen to all songs from the Odia movie ${movie.title}. Stream full MP3 audio tracks, watch video songs, and get lyrics.`;
  const url = `${SITE_URL}/songs/${movie.slug || movie._id}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      images: movie.posterUrl ? [{ url: movie.posterUrl }] : undefined,
      type: "website",
    },
  };
}

export default async function MovieSongsPage({ params }: Props) {
  await connectDB();
  const movie = await Movie.findOne({
    $or: [{ slug: params.movieSlug }, { _id: params.movieSlug.length === 24 ? params.movieSlug : null }],
  }).lean() as any;

  if (!movie || !movie.media?.songs?.length) {
    notFound();
  }

  const songs = movie.media.songs;
  const albumUrl = `${SITE_URL}/songs/${movie.slug || movie._id}`;
  
  // Extract all singers to list them in the schema and UI
  const allSingers = Array.from(new Set(songs.map((s: any) => s.singer).filter(Boolean)));

  const getCastLink = (name: string) => {
    const match = (movie.cast || []).find((c: any) => c.name?.toLowerCase() === name.toLowerCase());
    if (match && match.castId) return `/cast/${match.castId}`;
    return null;
  };

  const schema = {
    "@context": "https://schema.org",
    "@type": "MusicAlbum",
    "name": `${movie.title} Original Motion Picture Soundtrack`,
    "url": albumUrl,
    "image": movie.posterUrl,
    "albumReleaseType": "Soundtrack",
    "byArtist": allSingers.map(s => ({ "@type": "Person", "name": s })),
    "isPartOf": {
      "@type": "Movie",
      "name": movie.title,
      "url": `${SITE_URL}/movie/${movie.slug || movie._id}`
    },
    "track": songs.map((s: any, i: number) => ({
      "@type": "MusicRecording",
      "name": s.title,
      "url": `${albumUrl}/${i}/${s.slug || String(s.title).toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      "byArtist": s.singer ? [{ "@type": "Person", "name": s.singer }] : undefined,
      "duration": s.duration || undefined
    }))
  };

  const hasVideos = movie.media?.trailer?.ytId || (movie.media?.videos && movie.media.videos.length > 0);
  const hasOtt = movie.ott?.platform || movie.ott?.watchUrl;

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      
      {/* ══ HEADER / ALBUM COVER ══ */}
      <section className="relative overflow-hidden bg-[#111] border-b border-[#1f1f1f]">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] to-transparent z-10" />
          {movie.posterUrl && (
            <Image src={movie.posterUrl} alt={movie.title} fill className="object-cover opacity-20 blur-2xl" />
          )}
        </div>

        <div className="max-w-5xl mx-auto px-4 py-12 relative z-20">
          <nav className="flex items-center gap-1.5 text-xs text-gray-500 mb-6">
            <Link href="/" className="hover:text-orange-400">Home</Link>
            <ChevronRight className="w-3 h-3" />
            <Link href="/songs" className="hover:text-orange-400">Songs</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-gray-300">{movie.title}</span>
          </nav>

          <div className="flex flex-col sm:flex-row gap-8 items-center sm:items-start">
            <div className="w-48 sm:w-64 aspect-[2/3] relative rounded-2xl overflow-hidden shadow-2xl flex-shrink-0 border border-[#333]">
              <Image src={movie.posterUrl || "/placeholder-movie.jpg"} alt={movie.title} fill className="object-cover" priority />
            </div>

            <div className="flex-1 text-center sm:text-left mt-4 sm:mt-0">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-bold rounded-full uppercase tracking-widest mb-4">
                <Disc className="w-3.5 h-3.5" />
                Original Soundtrack
              </div>
              <h1 className="text-3xl sm:text-5xl font-black text-white mb-3 font-display">
                {movie.title} Songs
              </h1>
              <p className="text-gray-400 text-sm sm:text-base max-w-xl">
                Listen to the complete Odia music album of <Link href={`/movie/${movie.slug || movie._id}`} className="text-white hover:text-orange-400 underline decoration-[#333] underline-offset-4">{movie.title}</Link>. Featuring {songs.length} tracks{allSingers.length > 0 ? ` by ${allSingers.slice(0,3).join(", ")}${allSingers.length > 3 ? " and more" : ""}` : ""}.
              </p>
              
              <div className="mt-8 flex flex-wrap gap-3 justify-center sm:justify-start">
                <Link href={`/songs/${movie.slug || movie._id}/0/${songs[0]?.slug || 'play'}`}
                  className="bg-orange-500 hover:bg-orange-400 text-black px-6 sm:px-8 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(249,115,22,0.3)] hover:shadow-[0_0_30px_rgba(249,115,22,0.5)]">
                  <Play className="w-4 h-4 fill-black" />
                  Play All
                </Link>
                
                {hasVideos && (
                  <Link href={`/trailers/${movie.slug || movie._id}`}
                    className="bg-[#1f1f1f] hover:bg-[#2a2a2a] text-white border border-[#333] px-6 sm:px-8 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2">
                    <Film className="w-4 h-4 text-orange-400" />
                    Trailer
                  </Link>
                )}

                {hasOtt && (
                  <Link href={`/ott/${movie.slug || movie._id}`}
                    className="bg-[#1f1f1f] hover:bg-[#2a2a2a] text-white border border-[#333] px-6 sm:px-8 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2">
                    <Tv className="w-4 h-4 text-orange-400" />
                    Watch on OTT
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ CONTENT GRID ══ */}
      <div className="max-w-5xl mx-auto px-4 py-12 grid grid-cols-1 lg:grid-cols-3 gap-8 sm:gap-12">
        
        {/* LEFT COLUMN: Tracklist & SEO Prose */}
        <div className="lg:col-span-2 space-y-12">
          {/* Tracklist */}
          <section>
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Music className="w-5 h-5 text-orange-500" />
              Tracklist
            </h2>

            <div className="flex flex-col gap-3">
              {songs.map((song: any, i: number) => {
                const songSlug = song.slug || String(song.title).toLowerCase().replace(/[^a-z0-9]+/g, "-");
                const url = `/songs/${movie.slug || movie._id}/${i}/${songSlug}`;
                const thumb = song.thumbnailUrl || (song.ytId ? `https://img.youtube.com/vi/${song.ytId}/mqdefault.jpg` : "/placeholder-movie.jpg");

                return (
                  <Link key={i} href={url} className="group flex items-center gap-4 p-3 pr-5 bg-[#111] hover:bg-[#1a1a1a] rounded-xl border border-[#1f1f1f] hover:border-[#333] transition-all">
                    <div className="w-10 text-center font-bold text-gray-600 text-sm group-hover:text-orange-500">
                      {i + 1}
                    </div>
                    <div className="w-16 h-12 relative rounded-md overflow-hidden bg-black flex-shrink-0">
                      <Image src={thumb} alt={song.title} fill className="object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play className="w-5 h-5 text-white fill-white" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-white truncate group-hover:text-orange-400 transition-colors">
                        {song.title}
                      </h3>
                      <div className="flex items-center gap-2 text-[11px] text-gray-500 mt-1">
                        {song.singer && <span className="truncate">{song.singer}</span>}
                        {song.musicDirector && (
                          <>
                            <span className="w-1 h-1 bg-gray-700 rounded-full" />
                            <span className="truncate">Music: {song.musicDirector}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>

          {/* SEO Content Prose */}
          <section className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-4">About the {movie.title} Soundtrack</h2>
            <div className="space-y-4 text-sm text-gray-400 leading-relaxed">
              <p>
                The music album of <strong className="text-white">{movie.title}</strong> features {songs.length} original Odia songs. 
                {allSingers.length > 0 && ` The soundtrack includes vocal performances by top Odia playback singers like ${allSingers.slice(0, 4).join(", ")}.`}
              </p>
              <p>
                Fans of Ollywood music can listen to the full <strong className="text-white">{movie.title} mp3 songs</strong> online, watch the high-quality music videos, and read the Odia lyrics for every track directly on Ollypedia. 
                {movie.director && ` The movie was directed by ${movie.director}.`}
              </p>
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN: Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-5 sticky top-24">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 border-b border-[#222] pb-3">Album Credits</h3>
            
            <div className="space-y-5">
              {/* Music Directors */}
              {(() => {
                const mds = Array.from(new Set(songs.map((s: any) => s.musicDirector).filter(Boolean)));
                if (!mds.length) return null;
                return (
                  <div>
                    <span className="text-[10px] text-gray-500 uppercase tracking-widest block mb-1">Music Director</span>
                    <div className="flex flex-col gap-1 text-sm font-semibold text-gray-300">
                      {mds.map((md: any, i: number) => {
                        const link = getCastLink(md);
                        return link ? (
                          <Link key={i} href={link} className="hover:text-orange-400 transition-colors w-fit">
                            {md}
                          </Link>
                        ) : (
                          <span key={i} className="text-gray-400">{md}</span>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Movie Director */}
              {movie.director && (
                <div>
                  <span className="text-[10px] text-gray-500 uppercase tracking-widest block mb-1">Movie Director</span>
                  <div className="flex flex-col gap-1 text-sm font-semibold text-gray-300">
                    {(() => {
                      const link = getCastLink(movie.director);
                      return link ? (
                        <Link href={link} className="hover:text-orange-400 transition-colors w-fit">
                          {movie.director}
                        </Link>
                      ) : (
                        <span className="text-gray-400">{movie.director}</span>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* Singers */}
              {allSingers.length > 0 && (
                <div>
                  <span className="text-[10px] text-gray-500 uppercase tracking-widest block mb-1">Singers</span>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {allSingers.map((singer: any, i: number) => {
                      const link = getCastLink(singer);
                      return link ? (
                        <Link key={i} href={link} className="text-[11px] bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] hover:border-orange-500/30 hover:text-orange-300 text-gray-400 px-2 py-1 rounded transition-colors">
                          {singer}
                        </Link>
                      ) : (
                        <span key={i} className="text-[11px] bg-[#1a1a1a] border border-[#2a2a2a] text-gray-500 px-2 py-1 rounded cursor-default">
                          {singer}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            
            <div className="mt-8 pt-5 border-t border-[#222]">
              <Link href={`/movie/${movie.slug || movie._id}`} className="block w-full text-center py-2.5 rounded-lg bg-orange-500/10 text-orange-400 text-xs font-bold hover:bg-orange-500 hover:text-black transition-colors">
                View Full Movie Details
              </Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
