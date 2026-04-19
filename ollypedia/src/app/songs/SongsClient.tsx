"use client";

import { useState, useEffect, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Play, Music, Search, ChevronLeft, ChevronRight, X, Loader2 } from "lucide-react";
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
  active: { singer?: string; musicDirector?: string; movie?: string; q?: string };
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

// ── Song card ─────────────────────────────────────────────────────────────────
function SongCard({ song }: { song: Song }) {
  const router  = useRouter();
  const [loading, setLoading] = useState(false);
  const url   = songDetailUrl(song);
  const thumb = song.thumbnailUrl ||
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
      className="relative flex items-center gap-3 bg-[#111] border border-[#1f1f1f] hover:border-orange-500/30 rounded-xl p-3 group transition-all no-underline"
      style={{
        outline: loading ? "2px solid rgba(201,151,58,.7)" : "2px solid transparent",
        transition: "outline-color .15s, border-color .15s",
        textDecoration: "none",
      }}
    >
      {/* Thumbnail */}
      <div className="relative w-[72px] h-[52px] rounded-lg overflow-hidden flex-shrink-0 bg-[#1a1a1a]">
        {thumb ? (
          <Image
            src={thumb}
            alt={song.title || "Odia Song"}
            fill
            className="object-cover"
            sizes="72px"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-lg text-gray-600">
            🎵
          </div>
        )}
        {/* Play overlay */}
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
          <Play className="w-4 h-4 text-white fill-white" />
        </div>
      </div>

      {/* Text info */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-white text-sm leading-snug line-clamp-1 group-hover:text-orange-400 transition-colors">
          {song.title || "Untitled"}
        </p>
        {song.singer && (
          <p className="flex items-center gap-1 text-[11px] text-gray-400 mt-0.5">
            <Music className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{song.singer}</span>
          </p>
        )}
        {song.movieTitle && (
          <p className="text-[10px] text-gray-600 truncate mt-0.5">{song.movieTitle}</p>
        )}
      </div>

      {/* Loading overlay */}
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
              width: 28, height: 28, borderRadius: "50%",
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

// ── Main client component ─────────────────────────────────────────────────────
export function SongsClient({
  songs, singers, directors, active,
  total, currentPage, totalPages, pageSize,
}: SongsClientProps) {
  const router     = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Search input is controlled locally for debounce, but submits to server via URL
  const [searchInput, setSearchInput] = useState(active.q || "");

  // Debounce: push to URL 400ms after user stops typing
  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = searchInput.trim();
      const current = active.q || "";
      if (trimmed === current) return; // no change
      const params = new URLSearchParams(searchParams.toString());
      if (trimmed) {
        params.set("q", trimmed);
        params.delete("page"); // reset to page 1 on new search
      } else {
        params.delete("q");
        params.delete("page");
      }
      startTransition(() => {
        router.push(`/songs?${params.toString()}`);
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Keep input in sync when active.q changes (e.g. browser back/forward)
  useEffect(() => {
    setSearchInput(active.q || "");
  }, [active.q]);

  function buildFilterUrl(key: string, value: string | null, page = 1) {
    const params = new URLSearchParams();
    if (active.singer        && key !== "singer")        params.set("singer",        active.singer);
    if (active.musicDirector && key !== "musicDirector") params.set("musicDirector", active.musicDirector);
    if (active.q             && key !== "q")             params.set("q",             active.q);
    if (value) params.set(key, value);
    if (page > 1) params.set("page", String(page));
    return `/songs?${params.toString()}`;
  }

  function gotoPage(p: number) {
    const params = new URLSearchParams();
    if (active.singer)        params.set("singer",        active.singer);
    if (active.musicDirector) params.set("musicDirector", active.musicDirector);
    if (active.movie)         params.set("movie",         active.movie);
    if (active.q)             params.set("q",             active.q);
    if (p > 1) params.set("page", String(p));
    startTransition(() => {
      router.push(`/songs?${params.toString()}`);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  const pillBase = "px-3 py-1.5 text-xs font-medium rounded-full border transition-all cursor-pointer whitespace-nowrap";
  const pillOn   = "bg-orange-500/20 border-orange-500/50 text-orange-400";
  const pillOff  = "border-[#2a2a2a] text-gray-400 hover:border-orange-500/30 hover:text-white";

  const start = (currentPage - 1) * pageSize + 1;
  const end   = Math.min(currentPage * pageSize, total);

  const isSearchActive = !!(active.q);
  const isFiltered     = !!(active.singer || active.musicDirector || active.q);

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-1 h-5 bg-orange-500 rounded-full" />
          <h2 className="font-display text-lg sm:text-xl font-bold text-white">All Odia Songs</h2>
        </div>
        <p className="text-xs sm:text-sm text-gray-500">
          {total.toLocaleString()} songs
          {!isSearchActive && total > pageSize && (
            <span className="text-gray-600 hidden sm:inline"> · {start}–{end}</span>
          )}
        </p>
      </div>

      {/* ── Search + filters card ── */}
      <div className="bg-[#111] border border-[#1f1f1f] rounded-xl p-3 sm:p-4 space-y-3 sm:space-y-4">

        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search across all songs, singers, movies…"
            className="w-full pl-10 pr-10 py-2.5 bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/50 transition-colors"
          />
          {isPending && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-400 animate-spin" />
          )}
          {searchInput && !isPending && (
            <button
              onClick={() => setSearchInput("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Active filter chips */}
        {isFiltered && (
          <div className="flex items-center gap-2 flex-wrap pt-1">
            {active.q && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 bg-orange-500/10 border border-orange-500/30 rounded-full text-xs text-orange-400">
                Search: &quot;{active.q}&quot;
                <button onClick={() => setSearchInput("")}><X className="w-3 h-3" /></button>
              </span>
            )}
            {active.singer && (
              <Link href={buildFilterUrl("singer", null)}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-orange-500/10 border border-orange-500/30 rounded-full text-xs text-orange-400">
                Singer: {active.singer} <X className="w-3 h-3" />
              </Link>
            )}
            {active.musicDirector && (
              <Link href={buildFilterUrl("musicDirector", null)}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-orange-500/10 border border-orange-500/30 rounded-full text-xs text-orange-400">
                Director: {active.musicDirector} <X className="w-3 h-3" />
              </Link>
            )}
            <Link href="/songs" className="ml-auto text-xs text-gray-500 hover:text-orange-400 transition-colors">
              Clear all
            </Link>
          </div>
        )}

        {/* Singer pills */}
        {singers.length > 0 && (
          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">Singer</p>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              <Link href={buildFilterUrl("singer", null)} className={clsx(pillBase, !active.singer ? pillOn : pillOff)}>
                All Singers
              </Link>
              {singers.slice(0, 30).map((s) => (
                <Link key={s} href={buildFilterUrl("singer", active.singer === s ? null : s)}
                  className={clsx(pillBase, active.singer === s ? pillOn : pillOff)}>
                  {s}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Music Director pills */}
        {directors.length > 0 && (
          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">Music Director</p>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              <Link href={buildFilterUrl("musicDirector", null)} className={clsx(pillBase, !active.musicDirector ? pillOn : pillOff)}>
                All
              </Link>
              {directors.slice(0, 20).map((d) => (
                <Link key={d} href={buildFilterUrl("musicDirector", active.musicDirector === d ? null : d)}
                  className={clsx(pillBase, active.musicDirector === d ? pillOn : pillOff)}>
                  {d}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Song grid ── */}
      <div className={clsx("transition-opacity duration-200", isPending && "opacity-50 pointer-events-none")}>
        {songs.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
            {songs.map((song, i) => (
              <SongCard key={`${song.movieSlug}-${song.songIndex ?? i}`} song={song} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-[#111] border border-[#1f1f1f] rounded-2xl">
            <Music className="w-12 h-12 text-gray-700 mx-auto mb-4" />
            <p className="text-white font-bold text-base mb-1">No songs found</p>
            <p className="text-gray-500 text-sm">
              {active.q
                ? `No Odia songs found for "${active.q}"`
                : "No songs match your current filters."}
            </p>
            <button
              onClick={() => { setSearchInput(""); router.push("/songs"); }}
              className="mt-4 text-xs text-orange-400 hover:text-orange-300 transition-colors"
            >
              Clear and browse all songs
            </button>
          </div>
        )}
      </div>

      {/* ── Pagination — hidden during search ── */}
      {!isSearchActive && totalPages > 1 && (
        <div className="flex items-center justify-center gap-1.5 sm:gap-2 pt-2 flex-wrap">
          <button
            onClick={() => gotoPage(currentPage - 1)}
            disabled={currentPage <= 1}
            className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg border border-[#2a2a2a] text-xs sm:text-sm text-gray-400 hover:border-orange-500/40 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> <span className="hidden sm:inline">Prev</span>
          </button>

          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
            let p: number;
            if (totalPages <= 5)                    p = i + 1;
            else if (currentPage <= 3)              p = i + 1;
            else if (currentPage >= totalPages - 2) p = totalPages - 4 + i;
            else                                    p = currentPage - 2 + i;
            return (
              <button
                key={p}
                onClick={() => gotoPage(p)}
                className={[
                  "w-8 h-8 sm:w-9 sm:h-9 rounded-lg text-xs sm:text-sm font-medium transition-all border",
                  p === currentPage
                    ? "bg-orange-500/20 border-orange-500/50 text-orange-400"
                    : "border-[#2a2a2a] text-gray-400 hover:border-orange-500/30 hover:text-white",
                ].join(" ")}
              >
                {p}
              </button>
            );
          })}

          <button
            onClick={() => gotoPage(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg border border-[#2a2a2a] text-xs sm:text-sm text-gray-400 hover:border-orange-500/40 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <span className="hidden sm:inline">Next</span> <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>
      )}

      {/* Search results count */}
      {isSearchActive && songs.length > 0 && (
        <p className="text-center text-sm text-gray-500">
          Found <span className="text-white font-semibold">{total}</span> songs matching &quot;{active.q}&quot;
        </p>
      )}

      {/* SEO content block */}
      <div className="mt-2 p-4 sm:p-6 bg-[#111] border border-[#1f1f1f] rounded-xl">
        <h3 className="font-display font-bold text-white text-sm sm:text-base mb-2 sm:mb-3">
          Odia Film Songs — Complete Ollywood Music Database
        </h3>
        <p className="text-gray-400 text-xs sm:text-sm leading-relaxed">
          Ollypedia features the most extensive collection of{" "}
          <strong className="text-gray-300">Odia film songs</strong> available online. From timeless
          classics by legendary singers to the latest{" "}
          <strong className="text-gray-300">new Odia songs 2026</strong>, every track is catalogued
          with full credits — singer, music director, lyricist and the original Odia movie. Use the
          search above to find any song across our entire database, or filter by your favourite singer
          or music director.
        </p>
      </div>
    </div>
  );
}