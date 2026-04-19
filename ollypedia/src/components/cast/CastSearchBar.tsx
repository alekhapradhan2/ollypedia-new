"use client";
// components/cast/CastSearchBar.tsx

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface CastItem {
  _id:        string;
  name:       string;
  photo?:     string | null;
  type?:      string;
  filmCount?: number;
}

type SearchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; results: CastItem[] }
  | { status: "error"; message: string };

function highlightMatch(name: string, query: string) {
  const idx = name.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <span>{name}</span>;
  return (
    <>
      <span>{name.slice(0, idx)}</span>
      <span className="text-orange-400 font-black">{name.slice(idx, idx + query.length)}</span>
      <span>{name.slice(idx + query.length)}</span>
    </>
  );
}

export default function CastSearchBar() {
  const router = useRouter();

  // Fully controlled input
  const [query,   setQuery]   = useState("");
  const [search,  setSearch]  = useState<SearchState>({ status: "idle" });
  const [open,    setOpen]    = useState(false);
  const [focused, setFocused] = useState(false);

  const wrapRef     = useRef<HTMLDivElement>(null);
  const inputRef    = useRef<HTMLInputElement>(null);
  const abortRef    = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const doSearch = useCallback(async (q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (abortRef.current)    abortRef.current.abort();

    if (q.trim().length < 1) {
      setSearch({ status: "idle" });
      setOpen(false);
      return;
    }

    setSearch({ status: "loading" });
    setOpen(true);

    debounceRef.current = setTimeout(async () => {
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      try {
        const res = await fetch(
          `/api/cast/search?q=${encodeURIComponent(q.trim())}`,
          { signal: ctrl.signal }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: CastItem[] = await res.json();
        if (data[0]) router.prefetch(`/cast/${data[0]._id}`);
        setSearch({ status: "done", results: data });
        setOpen(true);
      } catch (err: any) {
        if (err.name !== "AbortError") {
          setSearch({ status: "error", message: err.message });
          setOpen(true);
        }
      }
    }, 280);
  }, [router]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setQuery(v);       // update input immediately — text shows as you type
    doSearch(v);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setQuery("");
      setSearch({ status: "idle" });
      setOpen(false);
    }
  }

  function clear() {
    setQuery("");
    setSearch({ status: "idle" });
    setOpen(false);
    inputRef.current?.focus();
  }

  const isLoading = search.status === "loading";
  const results   = search.status === "done" ? search.results : [];
  const showDrop  = open && query.trim().length > 0;

  return (
    <div ref={wrapRef} className="relative w-full max-w-md" role="search" aria-label="Search cast">
      {/* Input */}
      <div
        className={`flex items-center gap-2.5 px-3.5 h-11 rounded-xl bg-zinc-800 border transition-all duration-200 ${
          focused ? "border-orange-500 ring-1 ring-orange-500/40" : "border-zinc-700"
        }`}
      >
        {isLoading ? (
          <div className="w-4 h-4 rounded-full border-2 border-orange-500/30 border-t-orange-400 animate-spin flex-shrink-0" />
        ) : (
          <svg className="w-4 h-4 text-zinc-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
        )}

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            setFocused(true);
            if (query.trim().length > 0) setOpen(true);
          }}
          onBlur={() => setFocused(false)}
          placeholder="Search cast by name…"
          autoComplete="off"
          spellCheck="false"
          aria-label="Search cast members"
          className="flex-1 bg-transparent border-none outline-none text-white text-sm placeholder:text-zinc-500 font-medium"
        />

        {query && (
          <button
            type="button"
            onClick={clear}
            aria-label="Clear search"
            className="flex-shrink-0 text-zinc-500 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Dropdown */}
      {showDrop && (
        <div className="absolute top-[calc(100%+6px)] left-0 right-0 z-50 rounded-xl bg-zinc-900 border border-zinc-800 shadow-2xl overflow-hidden">

          {/* Loading skeletons */}
          {isLoading && (
            <div className="p-3 flex flex-col gap-2.5">
              {[1, 2, 3].map((n) => (
                <div key={n} className="flex items-center gap-3 animate-pulse">
                  <div className="w-10 h-10 rounded-lg bg-zinc-800 flex-shrink-0" />
                  <div className="flex-1 flex flex-col gap-1.5">
                    <div className="h-2.5 rounded bg-zinc-800 w-3/5" />
                    <div className="h-2 rounded bg-zinc-800 w-2/5" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Results */}
          {!isLoading && results.length > 0 && (
            <>
              {results.map((c, i) => (
                <a
                  key={c._id}
                  href={`/cast/${c._id}`}
                  className={`flex items-center gap-3 px-3.5 py-2.5 no-underline hover:bg-zinc-800 transition-colors ${
                    i < results.length - 1 ? "border-b border-zinc-800" : ""
                  }`}
                >
                  <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-zinc-800 flex-shrink-0 flex items-center justify-center">
                    {c.photo ? (
                      <img
                        src={c.photo}
                        alt={c.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-lg" aria-hidden>👤</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-semibold truncate leading-tight">
                      {highlightMatch(c.name, query)}
                    </p>
                    <p className="text-zinc-500 text-xs mt-0.5">
                      {c.type ?? "Artist"}
                      {c.filmCount ? ` · ${c.filmCount} film${c.filmCount !== 1 ? "s" : ""}` : ""}
                    </p>
                  </div>
                  <span className="text-orange-400 text-xs flex-shrink-0">→</span>
                </a>
              ))}

              <div className="px-3.5 py-2 bg-zinc-950 border-t border-zinc-800">
                <p className="text-zinc-600 text-[10px]">
                  {results.length} result{results.length !== 1 ? "s" : ""} — press{" "}
                  <kbd className="bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded text-[9px]">Esc</kbd> to close
                </p>
              </div>
            </>
          )}

          {/* No results */}
          {!isLoading && search.status === "done" && results.length === 0 && (
            <div className="px-4 py-5 text-center">
              <p className="text-zinc-400 text-sm font-medium">
                No results for <strong className="text-white">"{query}"</strong>
              </p>
              <p className="text-zinc-600 text-xs mt-1">Try a different name or browse by role</p>
            </div>
          )}

          {/* Error */}
          {!isLoading && search.status === "error" && (
            <div className="px-4 py-4 text-center">
              <p className="text-red-400 text-sm">Search unavailable — please try again</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}