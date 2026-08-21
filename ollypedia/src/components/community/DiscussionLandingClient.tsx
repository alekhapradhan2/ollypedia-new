"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Search, Sparkles, MessageSquare, Vote, ArrowUpDown, Loader2 } from "lucide-react";
import { CommunityMovieCard, CommunityMovieData } from "@/components/community/CommunityMovieCard";
import { InFeedAd } from "@/components/ads/InFeedAd";

export interface DiscussionLandingClientProps {
  initialMovies: CommunityMovieData[];
}

const FILTER_TABS = [
  { id: "all", label: "All Movies" },
  { id: "most_discussed", label: "Most Discussed" },
  { id: "most_voted", label: "Most Voted" },
  { id: "released", label: "Released" },
  { id: "upcoming", label: "Upcoming" },
];

export function DiscussionLandingClient({
  initialMovies,
}: DiscussionLandingClientProps) {
  const [movies, setMovies] = useState<CommunityMovieData[]>(initialMovies);
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialMovies.length >= 18);

  const observerTarget = useRef<HTMLDivElement | null>(null);

  // Fetch page 1 when filter or query changes
  const fetchMovies = useCallback(async (filterVal: string, queryVal: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", "1");
      params.set("limit", "24");
      if (filterVal !== "all") params.set("filter", filterVal);
      if (queryVal.trim()) params.set("q", queryVal.trim());

      const res = await fetch(`/api/community/movies?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.movies)) {
          setMovies(data.movies);
          setPage(1);
          setHasMore(data.pagination.page < data.pagination.pages);
        }
      }
    } catch (err) {
      console.error("Failed to load community movies:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch next page for infinite scrolling
  const fetchNextPage = useCallback(async () => {
    if (loadingMore || !hasMore || loading) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const params = new URLSearchParams();
      params.set("page", String(nextPage));
      params.set("limit", "24");
      if (activeFilter !== "all") params.set("filter", activeFilter);
      if (searchQuery.trim()) params.set("q", searchQuery.trim());

      const res = await fetch(`/api/community/movies?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.movies)) {
          setMovies((prev) => {
            const existingIds = new Set(prev.map((m) => m._id));
            const newUnique = data.movies.filter((m: any) => !existingIds.has(m._id));
            return [...prev, ...newUnique];
          });
          setPage(nextPage);
          setHasMore(data.pagination.page < data.pagination.pages);
        }
      }
    } catch (err) {
      console.error("Failed to load more movies:", err);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, loading, page, activeFilter, searchQuery]);

  // Debounced search & filter listener
  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeFilter !== "all" || searchQuery.trim() !== "") {
        fetchMovies(activeFilter, searchQuery);
      } else {
        setMovies(initialMovies);
        setPage(1);
        setHasMore(initialMovies.length >= 18);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [activeFilter, searchQuery, fetchMovies, initialMovies]);

  // IntersectionObserver for seamless Infinite Scrolling
  useEffect(() => {
    const target = observerTarget.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          fetchNextPage();
        }
      },
      { threshold: 0.1, rootMargin: "200px" }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, fetchNextPage]);

  return (
    <div className="space-y-6">
      {/* ── Search & Category Filter Toolbar ── */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-[#141414] border border-white/10 rounded-2xl p-3 sm:p-4 shadow-lg">
        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                activeFilter === tab.id
                  ? "bg-gradient-to-r from-orange-500 to-amber-500 text-black shadow-md font-extrabold"
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Odia movies..."
            className="w-full pl-10 pr-4 py-2 bg-[#1c1c1c] border border-white/10 rounded-xl text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500/50 transition-colors"
          />
        </div>
      </div>

      {/* ── Compact Movie Grid ── */}
      {loading ? (
        <div className="py-24 text-center">
          <div className="w-8 h-8 border-3 border-orange-500/20 border-t-orange-500 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-zinc-400 font-medium">Loading movie discussion rooms...</p>
        </div>
      ) : movies.length === 0 ? (
        <div className="text-center py-16 bg-[#141414] rounded-3xl border border-white/5">
          <MessageSquare className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white">No Movies Found</h3>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-sm mx-auto mt-1">
            Try adjusting your search query or filter to find movie discussion rooms.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
            {movies.map((movie, idx) => (
              <React.Fragment key={movie._id}>
                <CommunityMovieCard movie={movie} />
                {(idx + 1) % 7 === 0 && (
                  <div className="w-full h-full bg-[#111] border border-[#1f1f1f] rounded-2xl overflow-hidden flex items-center justify-center">
                    <InFeedAd className="min-h-[250px] w-full h-full" />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Infinite Scroll Trigger Sentinel */}
          <div ref={observerTarget} className="py-8 text-center flex flex-col items-center justify-center">
            {loadingMore && (
              <div className="flex items-center gap-2 text-xs text-orange-400 font-semibold bg-[#141414] border border-white/10 px-4 py-2 rounded-full shadow-md">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Loading more Odia movies...</span>
              </div>
            )}

            {!hasMore && movies.length > 12 && (
              <p className="text-xs text-zinc-500 font-medium">
                You have reached the end of the collection.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default DiscussionLandingClient;
