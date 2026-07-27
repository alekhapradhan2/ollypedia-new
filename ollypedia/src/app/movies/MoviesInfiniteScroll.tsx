"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { MovieCard } from "@/components/movie/MovieCard";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { InFeedAd } from "@/components/ads/InFeedAd";
import { Film, ChevronRight } from "lucide-react";
import Link from "next/link";

interface MoviesInfiniteScrollProps {
  initialMovies: any[];
  totalPages: number;
  searchParams: { genre?: string; verdict?: string; sort?: string; page?: string };
}

export function MoviesInfiniteScroll({
  initialMovies,
  totalPages,
  searchParams,
}: MoviesInfiniteScrollProps) {
  const [movies, setMovies] = useState<any[]>(initialMovies);
  const [page, setPage] = useState(searchParams.page ? parseInt(searchParams.page) : 1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(page < totalPages);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Reset state when filters change
    setMovies(initialMovies);
    setPage(searchParams.page ? parseInt(searchParams.page) : 1);
    setHasMore((searchParams.page ? parseInt(searchParams.page) : 1) < totalPages);
    setLoading(false);
  }, [initialMovies, totalPages, searchParams]);

  const fetchMoreMovies = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);

    try {
      const nextPage = page + 1;
      const params = new URLSearchParams();
      if (searchParams.genre) params.set("genre", searchParams.genre);
      if (searchParams.verdict) params.set("verdict", searchParams.verdict);
      if (searchParams.sort) params.set("sort", searchParams.sort);
      params.set("page", String(nextPage));

      const res = await fetch(`/api/movies?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.movies && data.movies.length > 0) {
          setMovies((prev) => [...prev, ...data.movies]);
          setPage(nextPage);
          setHasMore(nextPage < data.pagination.pages);
        } else {
          setHasMore(false);
        }
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Error fetching more movies:", error);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [page, hasMore, loading, searchParams]);

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node || loading || !hasMore) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        fetchMoreMovies();
      }
    }, { rootMargin: '100px' });

    observer.observe(node);
    return () => observer.disconnect();
  }, [loading, hasMore, fetchMoreMovies]);

  return (
    <>
      {movies.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {movies.map((m: any, idx: number) => (
            <React.Fragment key={`${m._id}-${idx}`}>
              <div className={idx >= initialMovies.length ? "animate-zoom-in" : ""}>
                <LoadingCard borderRadius={12}>
                  <MovieCard movie={m} />
                </LoadingCard>
              </div>

              {/* ── Native In-feed Ad after every 7th card ── */}
              {(idx + 1) % 7 === 0 && (
                <div className="col-span-full w-full">
                  <InFeedAd className="min-h-[350px]" />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-[#111] border border-[#1f1f1f] rounded-2xl">
          <Film className="w-12 h-12 text-gray-700 mx-auto mb-4" />
          <h3 className="text-white font-bold text-lg mb-2">No movies found</h3>
          <p className="text-gray-500 text-sm mb-6">Try a different filter or browse all Odia films.</p>
          <Link
            href="/movies"
            className="inline-flex items-center gap-2 text-orange-400 hover:text-orange-300 text-sm font-semibold transition-colors"
          >
            View all movies <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* Infinite Scroll trigger & Loading state */}
      {hasMore && (
        <div
          ref={loadMoreRef}
          className={`flex justify-center items-center py-8 transition-opacity duration-500 ${
            loading ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="flex items-center gap-3 animate-pulse">
            <div className="w-5 h-5 rounded-full border-2 border-orange-500/30 border-t-orange-500 animate-spin" />
            <span className="text-orange-400 text-sm font-semibold tracking-wide">
              Cinematic Magic is loading...
            </span>
          </div>
        </div>
      )}
    </>
  );
}
