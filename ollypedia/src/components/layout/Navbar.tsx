"use client";
// components/Navbar.tsx

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  Search, Menu, X, Film,
  Clapperboard, Users, BookOpen, Music2, TrendingUp, ChevronRight, ArrowRight, Calendar,
} from "lucide-react";
import clsx from "clsx";

// ─────────────────────────────────────────────────────────────────────────────
// Nav links
// ─────────────────────────────────────────────────────────────────────────────

const OLDEST_YEAR = 2014;
const _currentYear = new Date().getFullYear();
const MOVIE_YEARS: number[] = Array.from(
  { length: _currentYear - OLDEST_YEAR + 1 },
  (_, i) => _currentYear - i,
);

// Box Office tracks from 2018 onwards
const BO_OLDEST_YEAR = 2018;
const BOX_OFFICE_YEARS: number[] = Array.from(
  { length: _currentYear - BO_OLDEST_YEAR + 1 },
  (_, i) => _currentYear - i,
);

const NAV_LINKS = [
  { label: "Movies",     href: "/movies",     hasDropdown: "movies"     as const },
  { label: "Trailers",   href: "/trailers",   hasDropdown: false        as const },
  { label: "Songs",      href: "/songs",      hasDropdown: false        as const },
  { label: "Cast",       href: "/cast",       hasDropdown: false        as const },
  { label: "Box Office", href: "/box-office", hasDropdown: "boxoffice"  as const },
  { label: "OTT",        href: "/ott",        hasDropdown: false        as const },
  { label: "Blog",       href: "/blog",       hasDropdown: false        as const },
];

// ─────────────────────────────────────────────────────────────────────────────
// Types — exactly matching your route.ts response fields
// ─────────────────────────────────────────────────────────────────────────────

interface MovieDoc {
  _id: string;
  title: string;
  slug: string;
  genre?: string;
  releaseDate?: string;
  posterUrl?: string;
  thumbnailUrl?: string;
  verdict?: string;
}

interface CastDoc {
  _id: string;
  name: string;
  type?: string;
  slug?: string;
  photo?: string;
}

interface BlogDoc {
  _id: string;
  title: string;
  slug: string;
  category?: string;
  excerpt?: string;
  coverImage?: string;
}

// Songs come from route.ts as flattened objects (not Song model docs)
interface SongDoc {
  title: string;
  singer?: string;
  movieTitle?: string;
  movieSlug?: string;
  songIndex?: number;
  thumbnailUrl?: string;
}

interface ApiResponse {
  movies: MovieDoc[];
  cast:   CastDoc[];
  blogs:  BlogDoc[];
  songs:  SongDoc[];   // flattened from Movie.media.songs
  query:  string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Suggestion shape
// ─────────────────────────────────────────────────────────────────────────────

type Category = "movie" | "cast" | "blog" | "song";

interface Suggestion {
  id:       string;
  title:    string;
  subtitle: string;
  href:     string;
  image?:   string;
  category: Category;
}

// Map API → suggestions  (no fuzzy score filter — the server already filtered)
function toSuggestions(data: ApiResponse): Suggestion[] {
  const movies: Suggestion[] = (data.movies ?? []).map((m) => ({
    id:       m._id,
    title:    m.title,
    subtitle: [m.genre, m.releaseDate ? new Date(m.releaseDate).getFullYear() : ""]
                .filter(Boolean).join(" · "),
    href:     `/movie/${m.slug}`,
    image:    m.thumbnailUrl ?? m.posterUrl,
    category: "movie",
  }));

  const cast: Suggestion[] = (data.cast ?? []).map((c) => ({
    id:       c._id,
    title:    c.name,
    subtitle: c.type ?? "Cast",
    href:     c.slug
                ? `/cast/${c.slug}`
                : `/cast/${c.name.toLowerCase().replace(/\s+/g, "-")}`,
    image:    c.photo,
    category: "cast",
  }));

  const blogs: Suggestion[] = (data.blogs ?? []).map((b) => ({
    id:       b._id,
    title:    b.title,
    subtitle: b.category ?? "Blog",
    href:     `/blog/${b.slug}`,
    image:    b.coverImage,
    category: "blog",
  }));

  // Songs are flattened objects from route.ts — they have no _id, use composite key
  const songs: Suggestion[] = (data.songs ?? []).map((s, i) => ({
    id:       `song-${s.movieSlug ?? "x"}-${s.songIndex ?? i}`,
    title:    s.title,
    subtitle: [s.singer, s.movieTitle].filter(Boolean).join(" · "),
    href:     `/movie/${s.movieSlug ?? ""}#song-${s.songIndex ?? i}`,
    image:    s.thumbnailUrl,
    category: "song",
  }));

  return [...movies, ...songs, ...cast, ...blogs];
}

// ─────────────────────────────────────────────────────────────────────────────
// Category config
// ─────────────────────────────────────────────────────────────────────────────

const CAT: Record<Category, {
  label: string;
  sectionLabel: string;
  Icon: React.ElementType;
  color: string;       // text color
  pill: string;        // pill bg + text
  iconBg: string;      // icon wrapper bg
}> = {
  movie: {
    label: "Movie", sectionLabel: "Movies",
    Icon: Clapperboard,
    color:  "text-orange-400",
    pill:   "bg-orange-500/15 text-orange-300",
    iconBg: "bg-orange-500/15",
  },
  cast: {
    label: "Cast", sectionLabel: "Cast",
    Icon: Users,
    color:  "text-sky-400",
    pill:   "bg-sky-500/15 text-sky-300",
    iconBg: "bg-sky-500/15",
  },
  blog: {
    label: "Blog", sectionLabel: "Blog",
    Icon: BookOpen,
    color:  "text-emerald-400",
    pill:   "bg-emerald-500/15 text-emerald-300",
    iconBg: "bg-emerald-500/15",
  },
  song: {
    label: "Song", sectionLabel: "Songs",
    Icon: Music2,
    color:  "text-purple-400",
    pill:   "bg-purple-500/15 text-purple-300",
    iconBg: "bg-purple-500/15",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Highlight matched text
// ─────────────────────────────────────────────────────────────────────────────

function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  if (!q) return <>{text}</>;
  try {
    const safe  = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const parts = text.split(new RegExp(`(${safe})`, "gi"));
    return (
      <>
        {parts.map((p, i) =>
          p.toLowerCase() === q.toLowerCase()
            ? <mark key={i} className="bg-orange-500/30 text-orange-200 rounded-[3px] not-italic px-px">{p}</mark>
            : <span key={i}>{p}</span>
        )}
      </>
    );
  } catch {
    return <>{text}</>;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Single suggestion row
// ─────────────────────────────────────────────────────────────────────────────

function SuggestionRow({
  item, query, active, onSelect,
}: {
  item: Suggestion; query: string; active: boolean; onSelect: () => void;
}) {
  const c = CAT[item.category];
  return (
    <Link
      href={item.href}
      onClick={onSelect}
      aria-selected={active}
      className={clsx(
        "group flex items-center gap-3 px-3 py-2 mx-1.5 rounded-xl transition-all duration-100",
        active ? "bg-white/10" : "hover:bg-white/6",
      )}
    >
      {/* Thumbnail or icon */}
      <div className={clsx(
        "flex-shrink-0 w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center",
        item.image ? "" : c.iconBg,
      )}>
        {item.image
          ? <img src={item.image} alt={`${item.title} thumbnail`} className="w-full h-full object-cover" />
          : <c.Icon className={clsx("w-4.5 h-4.5", c.color)} aria-hidden="true" />
        }
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-white truncate leading-snug">
          <Highlight text={item.title} query={query} />
        </p>
        {item.subtitle && (
          <p className="text-[11px] text-gray-500 truncate mt-0.5 leading-snug">{item.subtitle}</p>
        )}
      </div>

      {/* Category pill — hidden on very small screens */}
      <span className={clsx("hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 uppercase tracking-wide", c.pill)}>
        <c.Icon className="w-2.5 h-2.5" aria-hidden="true" />
        {c.label}
      </span>

      <ArrowRight className={clsx(
        "w-3.5 h-3.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-all -translate-x-1 group-hover:translate-x-0",
        active ? "opacity-100 translate-x-0" : "",
        c.color,
      )} aria-hidden="true" />
    </Link>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Dropdown
// ─────────────────────────────────────────────────────────────────────────────

function SearchDropdown({
  query, results, loading, activeIndex, onSelect, onViewAll,
}: {
  query: string;
  results: Suggestion[];
  loading: boolean;
  activeIndex: number;
  onSelect: () => void;
  onViewAll: () => void;
}) {
  if (!query.trim()) return null;

  // Build category groups while preserving flat index for keyboard nav
  const groups: { cat: Category; rows: { s: Suggestion; idx: number }[] }[] = [];
  results.forEach((s, idx) => {
    let g = groups.find((g) => g.cat === s.category);
    if (!g) { g = { cat: s.category, rows: [] }; groups.push(g); }
    g.rows.push({ s, idx });
  });

  return (
    <div
      role="listbox"
      aria-label="Search suggestions"
      className="absolute top-[calc(100%+8px)] left-0 right-0 bg-[#0d0d0d] border border-white/10 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.7)] overflow-hidden z-50"
    >
      {/* ── Loading ── */}
      {loading && (
        <div className="flex items-center gap-3 px-5 py-4">
          <span className="w-4 h-4 rounded-full border-2 border-orange-500 border-t-transparent animate-spin flex-shrink-0" />
          <span className="text-sm text-gray-400">
            Searching for <span className="text-white font-medium">"{query}"</span>…
          </span>
        </div>
      )}

      {/* ── No results ── */}
      {!loading && results.length === 0 && (
        <div className="py-8 px-5 flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center">
            <Search className="w-5 h-5 text-gray-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-200">
              No results for <span className="text-white">"{query}"</span>
            </p>
            <p className="text-xs text-gray-500 mt-1">Check spelling, or try a shorter keyword</p>
          </div>
          <button
            onClick={onViewAll}
            className="mt-1 text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1 transition-colors"
          >
            Search anyway <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* ── Results ── */}
      {!loading && results.length > 0 && (
        <>
          <div className="max-h-[440px] overflow-y-auto overscroll-contain py-2">
            {groups.map(({ cat, rows }, gi) => {
              const c = CAT[cat];
              return (
                <div key={cat} className={clsx(gi > 0 && "mt-1 pt-1 border-t border-white/5")}>
                  {/* Section header */}
                  <div className="flex items-center gap-2 px-4 pt-2 pb-1">
                    <c.Icon className={clsx("w-3 h-3", c.color)} aria-hidden="true" />
                    <span className={clsx("text-[10px] font-bold uppercase tracking-widest", c.color)}>
                      {c.sectionLabel}
                    </span>
                  </div>
                  {rows.map(({ s, idx }) => (
                    <SuggestionRow
                      key={s.id}
                      item={s}
                      query={query}
                      active={idx === activeIndex}
                      onSelect={onSelect}
                    />
                  ))}
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-white/6 bg-white/[0.02]">
            <span className="text-[11px] text-gray-600">
              {results.length} suggestion{results.length !== 1 ? "s" : ""}
            </span>
            <button
              onClick={onViewAll}
              className="flex items-center gap-1.5 text-xs font-semibold text-orange-400 hover:text-orange-300 transition-colors group"
            >
              See all results
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Movies By Year Mega Dropdown
// ─────────────────────────────────────────────────────────────────────────────

function MoviesYearDropdown({ onClose }: { onClose: () => void }) {
  const currentYear = new Date().getFullYear();

  return (
    <div
      className="absolute top-[calc(100%+8px)] left-0 w-[340px] bg-[#0d0d0d] border border-white/10 rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.8)] overflow-hidden z-50"
      onMouseLeave={onClose}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-white/[0.07] bg-orange-500/5">
        <div className="w-7 h-7 bg-orange-500/20 rounded-lg flex items-center justify-center">
          <Calendar className="w-3.5 h-3.5 text-orange-400" />
        </div>
        <div>
          <p className="text-xs font-bold text-white tracking-wide">Movies by Year</p>
          <p className="text-[10px] text-gray-500 mt-0.5">Browse Odia films by release year</p>
        </div>
      </div>

      {/* Year grid */}
      <div className="p-3">
        <div className="grid grid-cols-3 gap-1.5">
          {MOVIE_YEARS.map((yr) => {
            const isCurrent = yr === currentYear;
            return (
              <Link
                key={yr}
                href={`/movies/year/${yr}`}
                onClick={onClose}
                className={clsx(
                  "group relative flex flex-col items-center justify-center py-3 px-2 rounded-xl transition-all duration-150 text-center overflow-hidden",
                  isCurrent
                    ? "bg-orange-500/20 border border-orange-500/40 hover:bg-orange-500/30"
                    : "bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.07] hover:border-orange-500/25",
                )}
              >
                {isCurrent && (
                  <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-orange-500 rounded-full" />
                )}
                <span className={clsx(
                  "text-sm font-bold transition-colors",
                  isCurrent ? "text-orange-400" : "text-gray-300 group-hover:text-orange-400",
                )}>
                  {yr}
                </span>
                {isCurrent && (
                  <span className="text-[9px] text-orange-500/80 font-semibold mt-0.5 uppercase tracking-wider">Latest</span>
                )}
              </Link>
            );
          })}
        </div>

        {/* View all movies link */}
        <div className="mt-2 pt-2 border-t border-white/[0.06]">
          <Link
            href="/movies"
            onClick={onClose}
            className="flex items-center justify-between w-full px-3 py-2.5 rounded-xl bg-white/[0.03] hover:bg-orange-500/10 border border-white/[0.06] hover:border-orange-500/30 transition-all group"
          >
            <div className="flex items-center gap-2">
              <Film className="w-3.5 h-3.5 text-orange-500" />
              <span className="text-xs font-semibold text-gray-300 group-hover:text-orange-400 transition-colors">
                All Odia Movies
              </span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-gray-600 group-hover:text-orange-400 group-hover:translate-x-0.5 transition-all" />
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Box Office Year Mega Dropdown
// ─────────────────────────────────────────────────────────────────────────────

function BoxOfficeYearDropdown({ onClose }: { onClose: () => void }) {
  const currentYear = new Date().getFullYear();

  return (
    <div
      className="absolute top-[calc(100%+8px)] left-0 w-[320px] bg-[#0d0d0d] border border-white/10 rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.8)] overflow-hidden z-50"
      onMouseLeave={onClose}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-white/[0.07] bg-orange-500/5">
        <div className="w-7 h-7 bg-orange-500/20 rounded-lg flex items-center justify-center">
          <TrendingUp className="w-3.5 h-3.5 text-orange-400" />
        </div>
        <div>
          <p className="text-xs font-bold text-white tracking-wide">Box Office by Year</p>
          <p className="text-[10px] text-gray-500 mt-0.5">Odia film collections, year-wise</p>
        </div>
      </div>

      {/* Year grid */}
      <div className="p-3">
        <div className="grid grid-cols-3 gap-1.5">
          {BOX_OFFICE_YEARS.map((yr) => {
            const isCurrent = yr === currentYear;
            return (
              <Link
                key={yr}
                href={yr === currentYear ? "/box-office" : `/box-office?year=${yr}`}
                onClick={onClose}
                className={clsx(
                  "group relative flex flex-col items-center justify-center py-3 px-2 rounded-xl transition-all duration-150 text-center overflow-hidden",
                  isCurrent
                    ? "bg-orange-500/20 border border-orange-500/40 hover:bg-orange-500/30"
                    : "bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.07] hover:border-orange-500/25",
                )}
              >
                {isCurrent && (
                  <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse" />
                )}
                <span className={clsx(
                  "text-sm font-bold transition-colors",
                  isCurrent ? "text-orange-400" : "text-gray-300 group-hover:text-orange-400",
                )}>
                  {yr}
                </span>
                {isCurrent && (
                  <span className="text-[9px] text-orange-500/80 font-semibold mt-0.5 uppercase tracking-wider">Latest</span>
                )}
              </Link>
            );
          })}
        </div>

        {/* All-time + full list links */}
        <div className="mt-2 pt-2 border-t border-white/[0.06] space-y-1.5">
          <a
            href="/box-office#all-time"
            onClick={onClose}
            className="flex items-center justify-between w-full px-3 py-2 rounded-xl bg-yellow-500/5 hover:bg-yellow-500/10 border border-yellow-500/15 hover:border-yellow-500/30 transition-all group"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm">👑</span>
              <span className="text-xs font-semibold text-yellow-400 group-hover:text-yellow-300 transition-colors">
                All-Time Top Grossers
              </span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-yellow-600 group-hover:text-yellow-400 group-hover:translate-x-0.5 transition-all" />
          </a>
          <Link
            href="/box-office"
            onClick={onClose}
            className="flex items-center justify-between w-full px-3 py-2.5 rounded-xl bg-white/[0.03] hover:bg-orange-500/10 border border-white/[0.06] hover:border-orange-500/30 transition-all group"
          >
            <div className="flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5 text-orange-500" />
              <span className="text-xs font-semibold text-gray-300 group-hover:text-orange-400 transition-colors">
                All Box Office Data
              </span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-gray-600 group-hover:text-orange-400 group-hover:translate-x-0.5 transition-all" />
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Navbar
// ─────────────────────────────────────────────────────────────────────────────

export function Navbar() {
  const pathname = usePathname();
  const router   = useRouter();

  const [menuOpen,         setMenuOpen]         = useState(false);
  const [searchOpen,       setSearchOpen]       = useState(false);
  const [query,            setQuery]            = useState("");
  const [results,          setResults]          = useState<Suggestion[]>([]);
  const [loading,          setLoading]          = useState(false);
  const [activeIndex,      setActiveIndex]      = useState(-1);
  const [moviesDropOpen,   setMoviesDropOpen]   = useState(false);
  const [boDropOpen,       setBoDropOpen]       = useState(false);
  const [mobileYearsOpen,  setMobileYearsOpen]  = useState(false);
  const [mobileBoOpen,     setMobileBoOpen]     = useState(false);

  const inputRef       = useRef<HTMLInputElement>(null);
  const containerRef   = useRef<HTMLDivElement>(null);
  const moviesNavRef   = useRef<HTMLDivElement>(null);
  const boNavRef       = useRef<HTMLDivElement>(null);
  const debounceRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef       = useRef<AbortController | null>(null);
  const closeTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const boCloseTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Fetch /api/search ─────────────────────────────────────────────────────
  const runSearch = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    abortRef.current?.abort();

    if (!q.trim() || q.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    debounceRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(q.trim())}`,
          { signal: controller.signal },
        );

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data: ApiResponse = await res.json();
        setResults(toSuggestions(data));
        setActiveIndex(-1);
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.error("[Navbar search]", err);
          setResults([]);
        }
      } finally {
        setLoading(false);
      }
    }, 600);
  }, []);

  useEffect(() => { runSearch(query); }, [query, runSearch]);

  // ── Click-outside ─────────────────────────────────────────────────────────
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        closeSearch();
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Movies dropdown hover handlers ────────────────────────────────────────
  function handleMoviesMouseEnter() {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    setMoviesDropOpen(true);
  }

  function handleMoviesMouseLeave() {
    closeTimerRef.current = setTimeout(() => setMoviesDropOpen(false), 120);
  }

  // ── Box Office dropdown hover handlers ────────────────────────────────────
  function handleBoMouseEnter() {
    if (boCloseTimer.current) clearTimeout(boCloseTimer.current);
    setBoDropOpen(true);
  }

  function handleBoMouseLeave() {
    boCloseTimer.current = setTimeout(() => setBoDropOpen(false), 120);
  }

  // ── Keyboard ──────────────────────────────────────────────────────────────
  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    const total = results.length;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (total === 0 ? -1 : (i + 1) % total));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (total === 0 ? -1 : i <= 0 ? total - 1 : i - 1));
    } else if (e.key === "Enter") {
      if (activeIndex >= 0 && results[activeIndex]) {
        e.preventDefault();
        router.push(results[activeIndex].href);
        closeSearch();
      } else {
        submitSearch();
      }
    } else if (e.key === "Escape") {
      closeSearch();
    }
  }

  function submitSearch(e?: React.FormEvent) {
    e?.preventDefault();
    if (!query.trim()) return;
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    closeSearch();
  }

  function closeSearch() {
    setSearchOpen(false);
    setQuery("");
    setResults([]);
    setActiveIndex(-1);
    abortRef.current?.abort();
  }

  function openSearch() {
    setSearchOpen(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  const showDropdown = searchOpen && (loading || query.trim().length > 0);

  // Shared input style
  const inputCls = [
    "w-full pl-9 pr-3 py-2 rounded-xl text-sm text-white",
    "bg-[#181818] border border-white/10",
    "placeholder-gray-600 focus:outline-none",
    "focus:border-orange-500/50 focus:bg-[#1e1e1e]",
    "transition-all duration-150",
  ].join(" ");

  return (
    <header
      className="sticky top-0 z-50 bg-[#080808]/95 backdrop-blur-md border-b border-white/[0.07]"
      role="banner"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* ── Logo ──────────────────────────────────────────────────────── */}
          <Link href="/" className="flex items-center gap-2.5 group shrink-0" aria-label="Ollypedia — Home">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center group-hover:bg-orange-600 transition-colors">
              <Film className="w-5 h-5 text-white" aria-hidden="true" />
            </div>
            <span className="font-bold text-[1.2rem] text-white tracking-wide select-none">
              Olly<span className="text-orange-500">pedia</span>
            </span>
          </Link>

          {/* ── Desktop Nav ───────────────────────────────────────────────── */}
          <nav className="hidden md:flex items-center gap-0.5" aria-label="Main navigation">
            {NAV_LINKS.map((link) => {
              if (link.hasDropdown === "movies") {
                return (
                  <div
                    key={link.href}
                    ref={moviesNavRef}
                    className="relative"
                    onMouseEnter={handleMoviesMouseEnter}
                    onMouseLeave={handleMoviesMouseLeave}
                  >
                    <Link
                      href={link.href}
                      aria-current={pathname?.startsWith(link.href) ? "page" : undefined}
                      aria-haspopup="true"
                      aria-expanded={moviesDropOpen}
                      className={clsx(
                        "flex items-center gap-1 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-150",
                        pathname?.startsWith(link.href)
                          ? "text-orange-400 bg-orange-500/10"
                          : "text-gray-400 hover:text-white hover:bg-white/5",
                      )}
                    >
                      {link.label}
                      <ChevronRight
                        className={clsx(
                          "w-3 h-3 transition-transform duration-200",
                          moviesDropOpen ? "rotate-90 text-orange-400" : "rotate-0",
                        )}
                      />
                    </Link>
                    {moviesDropOpen && (
                      <MoviesYearDropdown onClose={() => setMoviesDropOpen(false)} />
                    )}
                  </div>
                );
              }

              if (link.hasDropdown === "boxoffice") {
                return (
                  <div
                    key={link.href}
                    ref={boNavRef}
                    className="relative"
                    onMouseEnter={handleBoMouseEnter}
                    onMouseLeave={handleBoMouseLeave}
                  >
                    <Link
                      href={link.href}
                      aria-current={pathname?.startsWith(link.href) ? "page" : undefined}
                      aria-haspopup="true"
                      aria-expanded={boDropOpen}
                      className={clsx(
                        "flex items-center gap-1 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-150",
                        pathname?.startsWith(link.href)
                          ? "text-orange-400 bg-orange-500/10"
                          : "text-gray-400 hover:text-white hover:bg-white/5",
                      )}
                    >
                      {link.label}
                      <ChevronRight
                        className={clsx(
                          "w-3 h-3 transition-transform duration-200",
                          boDropOpen ? "rotate-90 text-orange-400" : "rotate-0",
                        )}
                      />
                    </Link>
                    {boDropOpen && (
                      <BoxOfficeYearDropdown onClose={() => setBoDropOpen(false)} />
                    )}
                  </div>
                );
              }

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={pathname?.startsWith(link.href) ? "page" : undefined}
                  className={clsx(
                    "px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-150",
                    pathname?.startsWith(link.href)
                      ? "text-orange-400 bg-orange-500/10"
                      : "text-gray-400 hover:text-white hover:bg-white/5",
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* ── Right: search + hamburger ─────────────────────────────────── */}
          <div className="flex items-center gap-2">

            {/* Desktop search */}
            <div ref={containerRef} className="relative hidden md:block">
              <form onSubmit={submitSearch} role="search" aria-label="Site search">
                {searchOpen ? (
                  <div className="flex items-center gap-2 w-80">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" aria-hidden="true" />
                      <input
                        ref={inputRef}
                        type="search"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Movies, songs, cast, blogs…"
                        autoComplete="off"
                        spellCheck={false}
                        aria-autocomplete="list"
                        aria-expanded={showDropdown}
                        aria-haspopup="listbox"
                        aria-label="Search Ollypedia"
                        className={inputCls}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={closeSearch}
                      aria-label="Close search"
                      className="p-1.5 text-gray-500 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
                    >
                      <X className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={openSearch}
                    aria-label="Open search"
                    className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/8 border border-white/8 hover:border-white/15 rounded-xl text-sm text-gray-500 hover:text-gray-300 transition-all"
                  >
                    <Search className="w-4 h-4" aria-hidden="true" />
                    <span className="hidden lg:block text-xs">Search…</span>
                  </button>
                )}
              </form>

              {showDropdown && (
                <SearchDropdown
                  query={query}
                  results={results}
                  loading={loading}
                  activeIndex={activeIndex}
                  onSelect={closeSearch}
                  onViewAll={submitSearch}
                />
              )}
            </div>

            {/* Hamburger */}
            <button
              className="md:hidden p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
            >
              {menuOpen
                ? <X className="w-5 h-5" aria-hidden="true" />
                : <Menu className="w-5 h-5" aria-hidden="true" />}
            </button>
          </div>
        </div>

        {/* ── Mobile menu ───────────────────────────────────────────────────── */}
        {menuOpen && (
          <div
            id="mobile-menu"
            className="md:hidden pb-4 border-t border-white/[0.07] pt-3"
            role="navigation"
            aria-label="Mobile navigation"
          >
            {/* Mobile search */}
            <div className="relative mb-3">
              <form
                onSubmit={submitSearch}
                role="search"
                aria-label="Mobile search"
                className="flex gap-2"
                onClick={() => !searchOpen && setSearchOpen(true)}
              >
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" aria-hidden="true" />
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => { setQuery(e.target.value); setSearchOpen(true); }}
                    onFocus={() => setSearchOpen(true)}
                    onKeyDown={handleKeyDown}
                    placeholder="Search movies, songs, cast…"
                    autoComplete="off"
                    spellCheck={false}
                    aria-label="Search"
                    className={inputCls}
                  />
                </div>
                <button
                  type="submit"
                  aria-label="Search"
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 rounded-xl text-white text-sm font-semibold transition-colors"
                >
                  Go
                </button>
              </form>

              {showDropdown && (
                <SearchDropdown
                  query={query}
                  results={results}
                  loading={loading}
                  activeIndex={activeIndex}
                  onSelect={() => { closeSearch(); setMenuOpen(false); }}
                  onViewAll={() => { submitSearch(); setMenuOpen(false); }}
                />
              )}
            </div>

            {/* Nav links */}
            {NAV_LINKS.map((link) => {
              if (link.hasDropdown === "movies") {
                return (
                  <div key={link.href}>
                    <button
                      onClick={() => setMobileYearsOpen((v) => !v)}
                      className={clsx(
                        "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium mb-0.5 transition-colors",
                        pathname?.startsWith(link.href)
                          ? "text-orange-400 bg-orange-500/10"
                          : "text-gray-400 hover:text-white hover:bg-white/5",
                      )}
                    >
                      <span>{link.label}</span>
                      <ChevronRight className={clsx(
                        "w-4 h-4 transition-transform duration-200",
                        mobileYearsOpen ? "rotate-90 text-orange-400" : "",
                      )} />
                    </button>
                    {mobileYearsOpen && (
                      <div className="mb-2 mx-2 p-3 bg-white/[0.03] border border-white/[0.07] rounded-xl">
                        <p className="text-[10px] font-bold text-orange-400 uppercase tracking-widest mb-2 px-1">
                          Browse by Year
                        </p>
                        <div className="grid grid-cols-4 gap-1.5">
                          {MOVIE_YEARS.map((yr) => (
                            <Link
                              key={yr}
                              href={`/movies/year/${yr}`}
                              onClick={() => { setMenuOpen(false); setMobileYearsOpen(false); }}
                              className="flex items-center justify-center py-2 rounded-lg bg-white/[0.04] border border-white/[0.07] hover:bg-orange-500/15 hover:border-orange-500/30 text-xs font-semibold text-gray-400 hover:text-orange-400 transition-all"
                            >
                              {yr}
                            </Link>
                          ))}
                        </div>
                        <Link
                          href="/movies"
                          onClick={() => { setMenuOpen(false); setMobileYearsOpen(false); }}
                          className="flex items-center justify-center gap-1.5 mt-2 py-2 rounded-lg bg-orange-500/10 border border-orange-500/20 text-xs font-semibold text-orange-400 hover:bg-orange-500/20 transition-all"
                        >
                          <Film className="w-3 h-3" />
                          All Movies
                        </Link>
                      </div>
                    )}
                  </div>
                );
              }

              if (link.hasDropdown === "boxoffice") {
                return (
                  <div key={link.href}>
                    <button
                      onClick={() => setMobileBoOpen((v) => !v)}
                      className={clsx(
                        "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium mb-0.5 transition-colors",
                        pathname?.startsWith(link.href)
                          ? "text-orange-400 bg-orange-500/10"
                          : "text-gray-400 hover:text-white hover:bg-white/5",
                      )}
                    >
                      <span>{link.label}</span>
                      <ChevronRight className={clsx(
                        "w-4 h-4 transition-transform duration-200",
                        mobileBoOpen ? "rotate-90 text-orange-400" : "",
                      )} />
                    </button>
                    {mobileBoOpen && (
                      <div className="mb-2 mx-2 p-3 bg-white/[0.03] border border-white/[0.07] rounded-xl">
                        <p className="text-[10px] font-bold text-orange-400 uppercase tracking-widest mb-2 px-1">
                          Box Office by Year
                        </p>
                        <div className="grid grid-cols-4 gap-1.5">
                          {BOX_OFFICE_YEARS.map((yr) => (
                            <Link
                              key={yr}
                              href={yr === _currentYear ? "/box-office" : `/box-office?year=${yr}`}
                              onClick={() => { setMenuOpen(false); setMobileBoOpen(false); }}
                              className={clsx(
                                "flex items-center justify-center py-2 rounded-lg border text-xs font-semibold transition-all",
                                yr === _currentYear
                                  ? "bg-orange-500/15 border-orange-500/30 text-orange-400"
                                  : "bg-white/[0.04] border-white/[0.07] text-gray-400 hover:bg-orange-500/15 hover:border-orange-500/30 hover:text-orange-400",
                              )}
                            >
                              {yr}
                            </Link>
                          ))}
                        </div>
                        {/* All-time + full list */}
                        <div className="mt-2 space-y-1.5">
                          <a
                            href="/box-office#all-time"
                            onClick={() => { setMenuOpen(false); setMobileBoOpen(false); }}
                            className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-yellow-500/8 border border-yellow-500/20 text-xs font-semibold text-yellow-400 hover:bg-yellow-500/15 transition-all"
                          >
                            👑 All-Time Top Grossers
                          </a>
                          <Link
                            href="/box-office"
                            onClick={() => { setMenuOpen(false); setMobileBoOpen(false); }}
                            className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-orange-500/10 border border-orange-500/20 text-xs font-semibold text-orange-400 hover:bg-orange-500/20 transition-all"
                          >
                            <TrendingUp className="w-3 h-3" />
                            All Box Office Data
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  aria-current={pathname?.startsWith(link.href) ? "page" : undefined}
                  className={clsx(
                    "flex items-center px-3 py-2.5 rounded-xl text-sm font-medium mb-0.5 transition-colors",
                    pathname?.startsWith(link.href)
                      ? "text-orange-400 bg-orange-500/10"
                      : "text-gray-400 hover:text-white hover:bg-white/5",
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </header>
  );
}