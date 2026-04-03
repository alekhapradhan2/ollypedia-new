"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Play, X, Music, Search } from "lucide-react";
import clsx from "clsx";

interface Song {
  title: string;
  singer?: string;
  musicDirector?: string;
  lyricist?: string;
  ytId?: string;
  thumbnailUrl?: string;
  description?: string;
  lyrics?: string;
  movieTitle?: string;
  movieSlug?: string;
}

interface SongsClientProps {
  songs: Song[];
  singers: string[];
  directors: string[];
  active: { singer?: string; musicDirector?: string; movie?: string };
}

export function SongsClient({ songs, singers, directors, active }: SongsClientProps) {
  const router = useRouter();
  const [playing, setPlaying] = useState<Song | null>(null);
  const [search, setSearch] = useState("");

  function filter(key: string, value: string | null) {
    const params = new URLSearchParams();
    if (active.singer       && key !== "singer")        params.set("singer",        active.singer);
    if (active.musicDirector && key !== "musicDirector") params.set("musicDirector", active.musicDirector);
    if (value) params.set(key, value);
    router.push(`/songs?${params.toString()}`);
  }

  const filtered = search.trim()
    ? songs.filter((s) =>
        s.title?.toLowerCase().includes(search.toLowerCase()) ||
        s.singer?.toLowerCase().includes(search.toLowerCase()) ||
        s.movieTitle?.toLowerCase().includes(search.toLowerCase())
      )
    : songs;

  const pillBase = "px-3 py-1.5 text-xs font-medium rounded-full border transition-all cursor-pointer whitespace-nowrap";
  const pillOn   = "bg-orange-500/20 border-orange-500/50 text-orange-400";
  const pillOff  = "border-[#2a2a2a] text-gray-400 hover:border-orange-500/30 hover:text-white";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="section-title mb-1">Odia Songs</h1>
        <p className="text-gray-500 text-sm">{filtered.length} songs in our database</p>
      </div>

      {/* Search bar */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search songs, singers, movies…"
          className="w-full pl-10 pr-4 py-2.5 bg-[#111] border border-[#2a2a2a] rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/50"
        />
      </div>

      {/* Singer filter */}
      {singers.length > 0 && (
        <div className="mb-5">
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">Singer</p>
          <div className="flex gap-2 scroll-x pb-1">
            <button onClick={() => filter("singer", null)} className={clsx(pillBase, !active.singer ? pillOn : pillOff)}>
              All Singers
            </button>
            {singers.slice(0, 20).map((s) => (
              <button
                key={s}
                onClick={() => filter("singer", active.singer === s ? null : s)}
                className={clsx(pillBase, active.singer === s ? pillOn : pillOff)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Music Director filter */}
      {directors.length > 0 && (
        <div className="mb-8">
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">Music Director</p>
          <div className="flex gap-2 scroll-x pb-1">
            <button onClick={() => filter("musicDirector", null)} className={clsx(pillBase, !active.musicDirector ? pillOn : pillOff)}>
              All
            </button>
            {directors.slice(0, 15).map((d) => (
              <button
                key={d}
                onClick={() => filter("musicDirector", active.musicDirector === d ? null : d)}
                className={clsx(pillBase, active.musicDirector === d ? pillOn : pillOff)}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* SEO blurb */}
      <div className="mb-8 p-5 bg-[#111] border border-[#1f1f1f] rounded-xl">
        <p className="text-gray-400 text-sm leading-relaxed">
          Explore Ollypedia's vast collection of Odia film songs spanning multiple decades of Ollywood music.
          From soulful devotional melodies to foot-tapping dance numbers, our music database covers songs from
          every major Odia film. Filter songs by your favourite singer or music director to find your preferred
          tracks quickly. Click any song to watch the official YouTube video.
        </p>
      </div>

      {/* Songs Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((song, i) => {
            const thumb = song.thumbnailUrl ||
              (song.ytId ? `https://img.youtube.com/vi/${song.ytId}/mqdefault.jpg` : "/placeholder-song.jpg");
            return (
              <div
                key={i}
                className="card flex items-center gap-3 p-3 cursor-pointer group hover:border-orange-500/30 transition-all"
                onClick={() => song.ytId && setPlaying(song)}
              >
                <div className="relative w-20 h-14 rounded-lg overflow-hidden flex-shrink-0">
                  <Image src={thumb} alt={song.title || "Song"} fill className="object-cover" />
                  {song.ytId && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play className="w-5 h-5 text-white fill-white" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white text-sm line-clamp-1 group-hover:text-orange-400 transition-colors">
                    {song.title || "Untitled"}
                  </p>
                  {song.singer && (
                    <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                      <Music className="w-3 h-3" /> {song.singer}
                    </p>
                  )}
                  {song.movieTitle && (
                    <Link
                      href={`/movie/${song.movieSlug}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs text-gray-600 hover:text-orange-400 transition-colors truncate block mt-0.5"
                    >
                      {song.movieTitle}
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-20 text-gray-500">
          {songs.length === 0
            ? "No songs in database yet."
            : "No songs match your search."}
        </div>
      )}

      {/* YouTube Modal */}
      {playing && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPlaying(null)}
        >
          <div
            className="w-full max-w-2xl bg-[#111] border border-[#2a2a2a] rounded-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-[#1f1f1f]">
              <div>
                <h3 className="font-bold text-white">{playing.title}</h3>
                {playing.singer && <p className="text-sm text-gray-400">{playing.singer}</p>}
              </div>
              <button
                onClick={() => setPlaying(null)}
                className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {playing.ytId ? (
              <div className="yt-wrapper">
                <iframe
                  src={`https://www.youtube.com/embed/${playing.ytId}?autoplay=1&rel=0`}
                  title={playing.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500">No video available</div>
            )}
            {playing.lyrics && (
              <div className="p-4 max-h-48 overflow-y-auto border-t border-[#1f1f1f]">
                <p className="text-xs text-gray-500 mb-2 uppercase tracking-widest">Lyrics</p>
                <p className="text-sm text-gray-300 whitespace-pre-line">{playing.lyrics}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
