"use client";
// components/blog/BlogSearch.tsx
// useSearchParams is isolated inside BlogSearchInner and wrapped in Suspense
// to prevent BAILOUT_TO_CLIENT_SIDE_RENDERING on the blog page.

import { Suspense, useTransition, useRef, useState, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search, X, Loader2 } from "lucide-react";

interface BlogSearchProps {
  initialQuery?: string;
}

// ── Inner: uses useSearchParams() ────────────────────────────────────────────
function BlogSearchInner({ initialQuery = "" }: BlogSearchProps) {
  const router       = useRouter();
  const pathname     = usePathname();
  const searchParams = useSearchParams(); // ← requires Suspense boundary
  const [isPending, startTransition] = useTransition();

  const [value, setValue] = useState(initialQuery);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync if the URL param changes externally (e.g. browser back/forward)
  useEffect(() => {
    setValue(searchParams.get("q") || "");
  }, [searchParams]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newVal = e.target.value;
    setValue(newVal);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (newVal.trim()) {
        params.set("q", newVal.trim());
      } else {
        params.delete("q");
      }
      params.delete("page");
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    }, 500);
  }

  function handleClear() {
    setValue("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("q");
    params.delete("page");
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      const params = new URLSearchParams(searchParams.toString());
      if (value.trim()) {
        params.set("q", value.trim());
      } else {
        params.delete("q");
      }
      params.delete("page");
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    }
  }

  return (
    <div role="search" aria-label="Search blog articles">
      <div className="relative flex items-center">
        <div className="absolute left-3 flex items-center pointer-events-none z-10">
          {isPending ? (
            <Loader2 className="w-4 h-4 text-orange-400 animate-spin" />
          ) : (
            <Search className="w-4 h-4 text-zinc-500" />
          )}
        </div>

        <input
          type="text"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Search articles, actors, movies…"
          aria-label="Search articles"
          autoComplete="off"
          spellCheck={false}
          className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-white text-sm placeholder:text-zinc-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
        />

        {value && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Clear search"
            className="absolute right-3 text-zinc-500 hover:text-white transition-colors z-10"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <p className="sr-only" aria-live="polite">
        {isPending ? "Searching…" : value ? `Showing results for ${value}` : ""}
      </p>
    </div>
  );
}

// ── Exported component: wraps inner in Suspense ───────────────────────────────
export function BlogSearch({ initialQuery = "" }: BlogSearchProps) {
  return (
    <Suspense fallback={
      <div role="search" aria-label="Search blog articles">
        <div className="relative flex items-center">
          <div className="absolute left-3 flex items-center pointer-events-none z-10">
            <Search className="w-4 h-4 text-zinc-500" />
          </div>
          <input
            type="text"
            defaultValue={initialQuery}
            placeholder="Search articles, actors, movies…"
            aria-label="Search articles"
            disabled
            className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-white text-sm placeholder:text-zinc-500 focus:outline-none transition-all opacity-70"
          />
        </div>
      </div>
    }>
      <BlogSearchInner initialQuery={initialQuery} />
    </Suspense>
  );
}