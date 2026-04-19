"use client";
// components/blog/BlogPagination.tsx
// URL-based pagination — works correctly with search and category filters

import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";

interface BlogPaginationProps {
  currentPage: number;
  totalPages: number;
  query?: string;
  category?: string;
}

function buildPageUrl(page: number, query?: string, category?: string): string {
  const params = new URLSearchParams();
  if (page > 1) params.set("page", String(page));
  if (query)    params.set("q", query);
  if (category) params.set("category", category);
  const qs = params.toString();
  return `/blog${qs ? `?${qs}` : ""}`;
}

function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: (number | "...")[] = [1];

  if (current > 3) pages.push("...");

  const start = Math.max(2, current - 1);
  const end   = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) pages.push(i);

  if (current < total - 2) pages.push("...");

  pages.push(total);
  return pages;
}

export function BlogPagination({
  currentPage,
  totalPages,
  query = "",
  category = "",
}: BlogPaginationProps) {
  const pages = getPageNumbers(currentPage, totalPages);

  return (
    <nav
      role="navigation"
      aria-label="Blog pagination"
      className="flex items-center justify-center gap-1.5 flex-wrap"
    >
      {/* Prev */}
      {currentPage > 1 ? (
        <a
          href={buildPageUrl(currentPage - 1, query, category)}
          rel="prev"
          aria-label="Previous page"
          className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold text-gray-400 border border-white/10 hover:border-orange-500/50 hover:text-white transition-all"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Prev
        </a>
      ) : (
        <span
          aria-disabled="true"
          className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold text-gray-700 border border-white/5 cursor-not-allowed"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Prev
        </span>
      )}

      {/* Page numbers */}
      {pages.map((p, idx) =>
        p === "..." ? (
          <span
            key={`ellipsis-${idx}`}
            className="px-2 py-2 text-gray-600"
            aria-hidden
          >
            <MoreHorizontal className="w-4 h-4" />
          </span>
        ) : (
          <a
            key={p}
            href={buildPageUrl(p as number, query, category)}
            aria-label={`Page ${p}`}
            aria-current={p === currentPage ? "page" : undefined}
            className={`w-9 h-9 flex items-center justify-center rounded-lg text-xs font-bold transition-all border ${
              p === currentPage
                ? "bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/20"
                : "border-white/10 text-gray-400 hover:border-orange-500/50 hover:text-white"
            }`}
          >
            {p}
          </a>
        )
      )}

      {/* Next */}
      {currentPage < totalPages ? (
        <a
          href={buildPageUrl(currentPage + 1, query, category)}
          rel="next"
          aria-label="Next page"
          className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold text-gray-400 border border-white/10 hover:border-orange-500/50 hover:text-white transition-all"
        >
          Next
          <ChevronRight className="w-3.5 h-3.5" />
        </a>
      ) : (
        <span
          aria-disabled="true"
          className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold text-gray-700 border border-white/5 cursor-not-allowed"
        >
          Next
          <ChevronRight className="w-3.5 h-3.5" />
        </span>
      )}
    </nav>
  );
}
