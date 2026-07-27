"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { BlogCard } from "@/components/blog/BlogCard";
import { InFeedAd } from "@/components/ads/InFeedAd";

interface BlogInfiniteScrollProps {
  initialBlogs: any[];
  totalPages: number;
  searchParams: { page?: string; q?: string; category?: string };
}

export function BlogInfiniteScroll({
  initialBlogs,
  totalPages,
  searchParams,
}: BlogInfiniteScrollProps) {
  const [blogs, setBlogs] = useState<any[]>(initialBlogs);
  const [page, setPage] = useState(searchParams.page ? parseInt(searchParams.page) : 1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(page < totalPages);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Reset state when filters change
    setBlogs(initialBlogs);
    setPage(searchParams.page ? parseInt(searchParams.page) : 1);
    setHasMore((searchParams.page ? parseInt(searchParams.page) : 1) < totalPages);
    setLoading(false);
  }, [totalPages, searchParams.page, searchParams.q, searchParams.category]); // Removed initialBlogs array reference to prevent false resets

  const fetchMoreBlogs = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);

    try {
      const nextPage = page + 1;
      const params = new URLSearchParams();
      if (searchParams.q) params.set("q", searchParams.q);
      if (searchParams.category) params.set("category", searchParams.category);
      params.set("page", String(nextPage));

      const res = await fetch(`/api/blog?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.posts && data.posts.length > 0) {
          // If we are on page 1, featured posts are excluded in the parent, but API doesn't know about `featured` filter natively.
          // However, we just append whatever comes back.
          setBlogs((prev) => [...prev, ...data.posts]);
          setPage(nextPage);
          setHasMore(nextPage < data.pagination.pages);
        } else if (data.blogs && data.blogs.length > 0) {
           setBlogs((prev) => [...prev, ...data.blogs]);
           setPage(nextPage);
           setHasMore(nextPage < data.pagination.pages);
        } else {
          setHasMore(false);
        }
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Error fetching more blogs:", error);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [page, hasMore, loading, searchParams.page, searchParams.q, searchParams.category]);

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node || loading || !hasMore) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        fetchMoreBlogs();
      }
    }, { rootMargin: '100px' });

    observer.observe(node);
    return () => observer.disconnect();
  }, [loading, hasMore, fetchMoreBlogs]);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
        {blogs.map((b, idx) => (
          <React.Fragment key={`${b._id}-${idx}`}>
            {idx > 0 && idx % 6 === 0 && (
              <div className={`col-span-1 md:col-span-1 ${idx >= initialBlogs.length ? "animate-zoom-in" : ""}`}>
                <InFeedAd />
              </div>
            )}
            <div
              className={idx >= initialBlogs.length ? "animate-zoom-in" : ""}
            >
               <BlogCard blog={b} variant="standard" />
            </div>
          </React.Fragment>
        ))}
      </div>

      {hasMore && (
        <div
          ref={loadMoreRef}
          className={`flex justify-center items-center py-10 mt-6 transition-opacity duration-500 ${
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
