"use client";
// SongsClient.tsx — per-card loader matching CastCardLink style

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Play, Music, Search, ChevronLeft, ChevronRight } from "lucide-react";
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
  movieId?: string;
  songIndex?: number;
}

interface SongsClientProps {
  songs: Song[];
  singers: string[];
  directors: string[];
  active: { singer?: string; musicDirector?: string; movie?: string };
  total: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
}

function songDetailUrl(song: Song): string {
  const movieSlug = song.movieSlug || song.movieId || "";
  const idx       = song.songIndex ?? 0;
  const titleSlug = String(song.title || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim() || "song";
  return `/songs/${movieSlug}/${idx}/${titleSlug}`;
}

// ── Single song card with the CastCardLink loader ──────────────────────────────
function SongCard({ song }: { song: Song }) {
  const router  = useRouter();
  const [loading, setLoading] = useState(false);
  const url     = songDetailUrl(song);
  const thumb   = song.thumbnailUrl ||
    (song.ytId ? `https://img.youtube.com/vi/${song.ytId}/mqdefault.jpg` : null);

  useEffect(() => {
    const reset = () => setLoading(false);
    window.addEventListener("popstate", reset);
    return () => window.removeEventListener("popstate", reset);
  }, []);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    router.push(url);
    setTimeout(() => setLoading(false), 6000);
  };

  return (
    <a
      href={url}
      onClick={handleClick}
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        gap: 12,
        borderRadius: 12,
        outline: loading ? "2px solid rgba(201,151,58,.7)" : "2px solid transparent",
        transition: "outline-color .15s",
        textDecoration: "none",
      }}
      className="card p-3 group hover:border-orange-500/30 transition-all"
    >
      {/* Thumbnail */}
      <div className="relative w-20 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-[#1a1a1a]">
        {thumb ? (
          <Image src={thumb} alt={song.title || "Song"} fill className="object-cover" sizes="80px" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-xl text-gray-600">🎵</div>
        )}
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <Play className="w-5 h-5 text-white fill-white" />
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-white text-sm line-clamp-1 group-hover:text-orange-400 transition-colors">
          {song.title || "Untitled"}
        </p>
        {song.singer && (
          <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
            <Music className="w-3 h-3" />
            <span className="truncate">{song.singer}</span>
          </p>
        )}
        {song.movieTitle && (
          <p className="text-xs text-gray-600 truncate mt-0.5">{song.movieTitle}</p>
        )}
      </div>

      {/* ── Loader overlay (matches CastCardLink exactly) ── */}
      {loading && (
        <>
          <div style={{
            position: "absolute", inset: 0, zIndex: 20, borderRadius: 12,
            background: "rgba(0,0,0,.45)", backdropFilter: "blur(2px)",
          }} />
          <div style={{
            position: "absolute", inset: 0, zIndex: 21,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              border: "3px solid rgba(201,151,58,.25)",
              borderTopColor: "#c9973a",
              animation: "sc-spin .6s linear infinite",
            }} />
          </div>
          <div style={{
            position: "absolute", inset: 0, zIndex: 19,
            borderRadius: 12, overflow: "hidden", pointerEvents: "none",
          }}>
            <div style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(90deg, transparent 0%, rgba(201,151,58,.07) 50%, transparent 100%)",
              backgroundSize: "200% 100%",
              animation: "sc-shimmer 1.1s ease infinite",
            }} />
          </div>
          <style>{`
            @keyframes sc-spin    { to { transform: rotate(360deg); } }
            @keyframes sc-shimmer {
              0%   { background-position:  200% 0; }
              100% { background-position: -200% 0; }
            }
          `}</style>
        </>
      )}
    </a>
  );
}

// ── Main client component ──────────────────────────────────────────────────────
export function SongsClient({
  songs, singers, directors, active,
  total, currentPage, totalPages, pageSize,
}: SongsClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const filtered = search.trim()
    ? songs.filter((s) =>
        s.title?.toLowerCase().includes(search.toLowerCase()) ||
        s.singer?.toLowerCase().includes(search.toLowerCase()) ||
        s.movieTitle?.toLowerCase().includes(search.toLowerCase())
      )
    : songs;

  function buildFilterUrl(key: string, value: string | null, page = 1) {
    const params = new URLSearchParams();
    if (active.singer        && key !== "singer")        params.set("singer",        active.singer);
    if (active.musicDirector && key !== "musicDirector") params.set("musicDirector", active.musicDirector);
    if (value) params.set(key, value);
    if (page > 1) params.set("page", String(page));
    return `/songs?${params.toString()}`;
  }

  function gotoPage(p: number) {
    const params = new URLSearchParams();
    if (active.singer)        params.set("singer",        active.singer);
    if (active.musicDirector) params.set("musicDirector", active.musicDirector);
    if (active.movie)         params.set("movie",         active.movie);
    if (p > 1) params.set("page", String(p));
    router.push(`/songs?${params.toString()}`);
  }

  const pillBase = "px-3 py-1.5 text-xs font-medium rounded-full border transition-all cursor-pointer whitespace-nowrap";
  const pillOn   = "bg-orange-500/20 border-orange-500/50 text-orange-400";
  const pillOff  = "border-[#2a2a2a] text-gray-400 hover:border-orange-500/30 hover:text-white";
  const start = (currentPage - 1) * pageSize + 1;
  const end   = Math.min(currentPage * pageSize, total);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

      <div className="mb-8">
        <h1 className="section-title mb-1">Odia Songs</h1>
        <p className="text-gray-500 text-sm">
          {total.toLocaleString()} songs in our database
          {total > pageSize && !search.trim() && (
            <span className="ml-1.5 text-gray-600">· showing {start}–{end}</span>
          )}
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search songs, singers, movies…"
          className="w-full pl-10 pr-4 py-2.5 bg-[#111] border border-[#2a2a2a] rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/50"
        />
        {search && (
          <button onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white text-xs">
            ✕
          </button>
        )}
      </div>

      {/* Singer filter */}
      {singers.length > 0 && (
        <div className="mb-5">
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">Singer</p>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            <Link href={buildFilterUrl("singer", null)} className={clsx(pillBase, !active.singer ? pillOn : pillOff)}>All Singers</Link>
            {singers.slice(0, 30).map((s) => (
              <Link key={s} href={buildFilterUrl("singer", active.singer === s ? null : s)}
                className={clsx(pillBase, active.singer === s ? pillOn : pillOff)}>{s}</Link>
            ))}
          </div>
        </div>
      )}

      {/* Music Director filter */}
      {directors.length > 0 && (
        <div className="mb-8">
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">Music Director</p>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            <Link href={buildFilterUrl("musicDirector", null)} className={clsx(pillBase, !active.musicDirector ? pillOn : pillOff)}>All</Link>
            {directors.slice(0, 20).map((d) => (
              <Link key={d} href={buildFilterUrl("musicDirector", active.musicDirector === d ? null : d)}
                className={clsx(pillBase, active.musicDirector === d ? pillOn : pillOff)}>{d}</Link>
            ))}
          </div>
        </div>
      )}

      {/* Songs grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((song, i) => <SongCard key={i} song={song} />)}
        </div>
      ) : (
        <div className="text-center py-20 text-gray-500">
          {search.trim() ? `No songs match "${search}"` : songs.length === 0 ? "No songs in database yet." : "No songs match your filters."}
        </div>
      )}

      {/* Pagination */}
      {!search.trim() && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-10">
          <button onClick={() => gotoPage(currentPage - 1)} disabled={currentPage <= 1}
            className="flex items-center gap-1 px-3 py-2 rounded-lg border border-[#2a2a2a] text-sm text-gray-400 hover:border-orange-500/40 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all">
            <ChevronLeft className="w-4 h-4" /> Prev
          </button>
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
            let p: number;
            if (totalPages <= 7)                   p = i + 1;
            else if (currentPage <= 4)             p = i + 1;
            else if (currentPage >= totalPages - 3) p = totalPages - 6 + i;
            else                                   p = currentPage - 3 + i;
            return (
              <button key={p} onClick={() => gotoPage(p)}
                className={clsx("w-9 h-9 rounded-lg text-sm font-medium transition-all border",
                  p === currentPage ? "bg-orange-500/20 border-orange-500/50 text-orange-400" : "border-[#2a2a2a] text-gray-400 hover:border-orange-500/30 hover:text-white")}>
                {p}
              </button>
            );
          })}
          <button onClick={() => gotoPage(currentPage + 1)} disabled={currentPage >= totalPages}
            className="flex items-center gap-1 px-3 py-2 rounded-lg border border-[#2a2a2a] text-sm text-gray-400 hover:border-orange-500/40 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all">
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="mt-10 p-5 bg-[#111] border border-[#1f1f1f] rounded-xl">
        <p className="text-gray-400 text-sm leading-relaxed">
          Explore Ollypedia's vast collection of Odia film songs spanning multiple decades of Ollywood music.
          From soulful devotional melodies to foot-tapping dance numbers, our music database covers songs from
          every major Odia film. Filter by singer or music director to find your preferred tracks quickly.
        </p>
      </div>
    </div>
  );
}