"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Loader2, Search, X } from "lucide-react";
import { AlbumCard } from "@/components/songs/AlbumCard";
import { InFeedAd } from "@/components/ads/InFeedAd";
import React from "react";
interface Props {
  initialMovies: any[];
}

export function SongsClient({ initialMovies }: Props) {
  const [movies, setMovies] = useState<any[]>(initialMovies);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialMovies.length === 12);
  const [loading, setLoading] = useState(false);
  
  // Search state
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  
  const loaderRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce search input
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQ(q);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [q]);

  // Fetch new data when search query changes
  useEffect(() => {
    const fetchSearch = async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/songs/albums?page=1&limit=12&q=${encodeURIComponent(debouncedQ)}`);
        const data = await res.json();
        const newMovies = data.movies || [];
        setMovies(newMovies);
        setPage(1);
        setHasMore(newMovies.length === 12);
      } catch (err) {
        console.error("Failed to search albums", err);
      } finally {
        setIsSearching(false);
      }
    };

    // If there's no query, just reset to initial or fetch page 1 without query
    if (debouncedQ === "") {
      fetchSearch();
    } else {
      fetchSearch();
    }
  }, [debouncedQ]);

  // Infinite Scroll Load More
  const loadMore = useCallback(async () => {
    if (loading || !hasMore || isSearching) return;
    setLoading(true);
    const nextPage = page + 1;
    
    try {
      const res = await fetch(`/api/songs/albums?page=${nextPage}&limit=12&q=${encodeURIComponent(debouncedQ)}`);
      const data = await res.json();
      const newMovies = data.movies || [];
      
      setMovies((prev) => {
        const existingIds = new Set(prev.map(m => m._id));
        const filteredNew = newMovies.filter((m: any) => !existingIds.has(m._id));
        return [...prev, ...filteredNew];
      });
      
      setPage(nextPage);
      setHasMore(newMovies.length === 12);
    } catch (err) {
      console.error("Failed to fetch more albums", err);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, page, debouncedQ, isSearching]);

  // Intersection Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [loadMore]);

  return (
    <div className="space-y-8">
      {/* Search Bar */}
      <div className="relative max-w-2xl mx-auto md:mx-0">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search albums by movie, singer, or music director..."
          className="w-full pl-12 pr-10 py-3.5 bg-[#111] border border-[#2a2a2a] rounded-2xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/50 focus:bg-[#181818] transition-all shadow-inner"
        />
        {q && (
          <button 
            onClick={() => setQ("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-500 hover:text-white rounded-md hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Loading Overlay for Search */}
      {isSearching ? (
        <div className="w-full py-20 flex justify-center">
          <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
        </div>
      ) : (
        <>
          {movies.length === 0 ? (
            <div className="text-center py-20 bg-[#111] border border-[#222] rounded-2xl">
              <Search className="w-12 h-12 text-gray-600 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-bold text-white mb-2">No albums found</h3>
              <p className="text-gray-500 text-sm">We couldn't find any albums matching "{q}".</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-8 sm:gap-x-6 sm:gap-y-10">
              {movies.map((movie, idx) => (
                <React.Fragment key={movie._id}>
                  <AlbumCard movie={movie} hrefPrefix="/songs" />
                  {(idx + 1) % 7 === 0 && (
                    <div className="w-full h-full bg-[#111] border border-[#1f1f1f] rounded-xl overflow-hidden flex items-center justify-center">
                      <InFeedAd className="min-h-[250px] w-full h-full" />
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          )}
        </>
      )}

      {/* Infinite Scroll Loader */}
      {hasMore && !isSearching && (
        <div ref={loaderRef} className="w-full py-12 flex justify-center">
          <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
        </div>
      )}
      
      {!hasMore && movies.length > 0 && !isSearching && (
        <div className="w-full py-12 flex justify-center">
          <span className="text-gray-600 text-sm font-medium tracking-wider uppercase">End of Catalog</span>
        </div>
      )}
    </div>
  );
}
