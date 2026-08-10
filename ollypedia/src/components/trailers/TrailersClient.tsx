"use client";
// components/trailers/TrailersClient.tsx
// Client-side interactive wrapper: search, filters, infinite scroll
// Cards navigate directly to /trailers/[slug] — no modal needed

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Search, Filter, X, ChevronDown, Loader2, Film,
} from "lucide-react";
import { TrailerCard } from "./TrailerCard";
import { InFeedAd } from "@/components/ads/InFeedAd";
import React from "react";
import type { TrailerMovieDoc } from "@/lib/trailerSeo";


const GENRES = ["Action", "Romance", "Drama", "Comedy", "Thriller", "Horror", "Devotional", "Family", "Historical"];
const TYPES  = [
  { value: "",              label: "All Videos" },
  { value: "trailer",       label: "Trailers" },
  { value: "teaser",        label: "Teasers" },
  { value: "motionPoster",  label: "Motion Posters" },
  { value: "firstLook",     label: "First Looks" },
];
const STATUS_OPTS = [
  { value: "upcoming", label: "Upcoming" },
  { value: "released", label: "Released" },
];
const YEARS = Array.from({ length: 8 }, (_, i) => new Date().getFullYear() - i);

interface Props {
  initialMovies: TrailerMovieDoc[];
  totalCount: number;
}

export function TrailersClient({ initialMovies, totalCount }: Props) {
  return (
    <Suspense fallback={<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4 mt-6">{Array.from({ length: 10 }).map((_, i) => <div key={i} className="aspect-[2/3] rounded-2xl animate-pulse bg-white/5" />)}</div>}>
      <TrailersClientInner initialMovies={initialMovies} totalCount={totalCount} />
    </Suspense>
  );
}

// ── Inner implementation (uses useSearchParams) ───────────────────────────────
function TrailersClientInner({ initialMovies, totalCount }: Props) {
  const router       = useRouter();
  const pathname     = usePathname();
  const searchParams = useSearchParams();

  // ── Filter state (synced with URL) ─────────────────────────────────────
  const [type,        setType]        = useState(searchParams.get("type")   || "");
  const [genre,       setGenre]       = useState(searchParams.get("genre")  || "");
  const [status,      setStatus]      = useState(searchParams.get("status") || "");
  const [year,        setYear]        = useState(searchParams.get("year")   || "");
  const [q,           setQ]           = useState(searchParams.get("q")      || "");
  const [debouncedQ,  setDebouncedQ]  = useState(q);

  // ── Data state ──────────────────────────────────────────────────────────
  const [movies,    setMovies]    = useState<TrailerMovieDoc[]>(initialMovies);
  const [page,      setPage]      = useState(1);
  const [hasMore,   setHasMore]   = useState(movies.length < totalCount);
  const [loading,   setLoading]   = useState(false);
  const [filtering, setFiltering] = useState(false);
  const loaderRef   = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Debounce search ────────────────────────────────────────────────────
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQ(q), 450);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [q]);

  // ── Apply filters (reset list) ─────────────────────────────────────────
  const applyFilters = useCallback(async (
    newType: string, newGenre: string, newStatus: string, newYear: string, newQ: string
  ) => {
    setFiltering(true);
    const params = new URLSearchParams();
    if (newType)   params.set("type",   newType);
    if (newGenre)  params.set("genre",  newGenre);
    if (newStatus) params.set("status", newStatus);
    if (newYear)   params.set("year",   newYear);
    if (newQ)      params.set("q",      newQ);

    router.push(`${pathname}?${params.toString()}#all-trailers`, { scroll: false });

    const apiParams = new URLSearchParams(params);
    apiParams.set("page",  "1");
    apiParams.set("limit", "20");
    apiParams.set("sort",  "newest");

    try {
      const res  = await fetch(`/api/trailers?${apiParams.toString()}`);
      const data = await res.json();
      setMovies(data.movies || []);
      setPage(1);
      setHasMore((data.movies || []).length < (data.pagination?.total || 0));
    } catch { /* noop */ }
    finally { setFiltering(false); }
  }, [pathname, router]);

  useEffect(() => {
    applyFilters(type, genre, status, year, debouncedQ);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, genre, status, year, debouncedQ]);

  // ── Infinite scroll ────────────────────────────────────────────────────
  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    const nextPage = page + 1;
    const params = new URLSearchParams();
    if (type)   params.set("type",   type);
    if (genre)  params.set("genre",  genre);
    if (status) params.set("status", status);
    if (year)   params.set("year",   year);
    if (q)      params.set("q",      q);
    params.set("page",  String(nextPage));
    params.set("limit", "20");
    params.set("sort",  "newest");

    try {
      const res  = await fetch(`/api/trailers?${params.toString()}`);
      const data = await res.json();
      const newMovies = data.movies || [];
      setMovies((prev) => [...prev, ...newMovies]);
      setPage(nextPage);
      setHasMore(newMovies.length === 20 && movies.length + newMovies.length < (data.pagination?.total || 0));
    } catch { /* noop */ }
    finally { setLoading(false); }
  }, [loading, hasMore, page, type, genre, status, year, q, movies.length]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore(); },
      { threshold: 0.1 }
    );
    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [loadMore]);

  const activeFilterCount = [type, genre, status, year].filter(Boolean).length;

  return (
    <>
      {/* ── Search + Filters ──────────────────────────────────────────────── */}
      <div className="space-y-3">
        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by movie, actor, director, genre…"
            className="w-full pl-11 pr-4 py-3 bg-[#181818] border border-[#2a2a2a] rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/50 focus:bg-[#1e1e1e] transition-all"
            aria-label="Search trailers"
          />
          {q && (
            <button onClick={() => setQ("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-white rounded-md hover:bg-white/5 transition-colors"
              aria-label="Clear search">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter row */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 shrink-0">
            <Filter className="w-3.5 h-3.5" />
            Filter:
          </span>

          {/* Type pills */}
          {TYPES.map((t) => (
            <button key={t.value}
              onClick={() => setType(t.value === type ? "" : t.value)}
              className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all ${
                type === t.value
                  ? "bg-orange-500/15 text-orange-400 border-orange-500/40"
                  : "bg-white/[0.03] text-gray-500 border-white/[0.08] hover:text-gray-300 hover:border-white/15"
              }`}
            >
              {t.label}
            </button>
          ))}

          <div className="h-4 w-px bg-white/10 hidden sm:block" />

          {/* Status pills */}
          {STATUS_OPTS.map((s) => (
            <button key={s.value}
              onClick={() => setStatus(s.value === status ? "" : s.value)}
              className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all ${
                status === s.value
                  ? "bg-sky-500/15 text-sky-400 border-sky-500/40"
                  : "bg-white/[0.03] text-gray-500 border-white/[0.08] hover:text-gray-300 hover:border-white/15"
              }`}
            >
              {s.label}
            </button>
          ))}

          {/* Genre dropdown */}
          <div className="relative">
            <select value={genre} onChange={(e) => setGenre(e.target.value)}
              className="appearance-none pl-3 pr-7 py-1.5 bg-[#181818] border border-[#2a2a2a] rounded-lg text-xs text-gray-400 focus:outline-none focus:border-orange-500/50 cursor-pointer hover:border-white/20 transition-colors"
              aria-label="Filter by genre">
              <option value="">All Genres</option>
              {GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-600 pointer-events-none" />
          </div>

          {/* Year dropdown */}
          <div className="relative">
            <select value={year} onChange={(e) => setYear(e.target.value)}
              className="appearance-none pl-3 pr-7 py-1.5 bg-[#181818] border border-[#2a2a2a] rounded-lg text-xs text-gray-400 focus:outline-none focus:border-orange-500/50 cursor-pointer hover:border-white/20 transition-colors"
              aria-label="Filter by year">
              <option value="">All Years</option>
              {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-600 pointer-events-none" />
          </div>

          {/* Clear filters */}
          {activeFilterCount > 0 && (
            <button
              onClick={() => { setType(""); setGenre(""); setStatus(""); setYear(""); setQ(""); }}
              className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg text-orange-400 border border-orange-500/30 hover:bg-orange-500/10 transition-colors">
              <X className="w-3 h-3" />
              Clear ({activeFilterCount})
            </button>
          )}
        </div>

        {/* Results meta */}
        {(q || activeFilterCount > 0) && !filtering && (
          <p className="text-xs text-gray-600">
            Showing <span className="text-gray-400 font-medium">{movies.length}</span> result{movies.length !== 1 ? "s" : ""}
            {q ? <> for "<span className="text-orange-400">{q}</span>"</> : ""}
          </p>
        )}
      </div>

      {/* ── Grid ──────────────────────────────────────────────────────────── */}
      {filtering ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4 mt-6">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] rounded-2xl skeleton" />
          ))}
        </div>
      ) : movies.length === 0 ? (
        <div className="py-20 text-center mt-6">
          <div className="w-16 h-16 mx-auto mb-4 bg-[#1a1a1a] rounded-2xl flex items-center justify-center border border-white/5">
            <Film className="w-7 h-7 text-gray-600" />
          </div>
          <p className="text-gray-400 font-semibold">No trailers found</p>
          <p className="text-gray-600 text-sm mt-1">Try adjusting your filters or search query</p>
          <button
            onClick={() => { setType(""); setGenre(""); setStatus(""); setYear(""); setQ(""); }}
            className="mt-4 px-4 py-2 text-xs text-orange-400 border border-orange-500/30 rounded-xl hover:bg-orange-500/10 transition-colors">
            Clear all filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4 mt-6">
          {movies.map((m, idx) => (
            <React.Fragment key={String(m._id)}>
              <TrailerCard movie={m} />
              {(idx + 1) % 7 === 0 && (
                <div className="w-full h-full bg-[#111] border border-[#1f1f1f] rounded-xl overflow-hidden flex items-center justify-center">
                  <InFeedAd className="min-h-[250px] w-full h-full" />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      )}

      {/* ── Infinite scroll sentinel ──────────────────────────────────────── */}
      <div ref={loaderRef} className="flex justify-center py-8">
        {loading && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading more trailers…
          </div>
        )}
        {!loading && !hasMore && movies.length > 0 && (
          <p className="text-xs text-gray-700">All {movies.length} trailers loaded</p>
        )}
      </div>
    </>
  );
}
