"use client";
// components/cast/CastSearchBar.tsx
// Fixes:
//  1. Search results now show — state updates batched correctly
//  2. Dropdown shows even for empty results (proper "no results" state)
//  3. router.prefetch on mount for faster navigation

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

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
  | { status: "error" };

export default function CastSearchBar() {
  const router = useRouter();
  const [query,   setQuery]   = useState("");
  const [search,  setSearch]  = useState<SearchState>({ status: "idle" });
  const [open,    setOpen]    = useState(false);
  const [focused, setFocused] = useState(false);

  const inputRef    = useRef<HTMLInputElement>(null);
  const wrapRef     = useRef<HTMLDivElement>(null);
  const abortRef    = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Debounced API search
  const doSearch = useCallback((q: string) => {
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
        if (!res.ok) throw new Error("fetch failed");
        const data: CastItem[] = await res.json();
        // Prefetch top result for instant navigation
        if (data[0]) router.prefetch(`/cast/${data[0]._id}`);
        setSearch({ status: "done", results: data });
        setOpen(true);
      } catch (err: any) {
        if (err.name !== "AbortError") {
          setSearch({ status: "error" });
          setOpen(true);
        }
      }
    }, 220);
  }, [router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setQuery(v);
    doSearch(v);
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setQuery(""); setSearch({ status: "idle" }); setOpen(false);
    }
  };

  const clear = () => {
    setQuery(""); setSearch({ status: "idle" }); setOpen(false);
    inputRef.current?.focus();
  };

  const isLoading = search.status === "loading";
  const results   = search.status === "done" ? search.results : [];
  const showDrop  = open && query.trim().length > 0;

  return (
    <div ref={wrapRef} style={{ position: "relative", width: "100%", maxWidth: 420 }}>

      {/* ── Input box ─────────────────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "0 14px", height: 42, borderRadius: 10,
        background: "rgba(255,255,255,.07)",
        border: focused ? "1px solid rgba(201,151,58,.6)" : "1px solid rgba(255,255,255,.12)",
        transition: "border-color .2s",
      }}>
        {isLoading ? (
          <span style={{
            width: 14, height: 14, flexShrink: 0,
            border: "2px solid rgba(201,151,58,.25)",
            borderTopColor: "#c9973a",
            borderRadius: "50%",
            animation: "csb-spin .65s linear infinite",
            display: "inline-block",
          }} />
        ) : (
          <span style={{ fontSize: ".9rem", opacity: .45, flexShrink: 0 }}>🔍</span>
        )}

        <input
          ref={inputRef}
          value={query}
          onChange={handleChange}
          onFocus={() => {
            setFocused(true);
            if (query.trim().length > 0) setOpen(true);
          }}
          onBlur={() => setFocused(false)}
          onKeyDown={handleKey}
          placeholder="Search cast by name…"
          autoComplete="off"
          style={{
            flex: 1, background: "none", border: "none", outline: "none",
            color: "#fff", fontSize: ".84rem", fontWeight: 500,
          }}
        />

        {query && (
          <button
            onClick={clear}
            aria-label="Clear search"
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "rgba(255,255,255,.4)", fontSize: ".9rem",
              padding: 0, flexShrink: 0, lineHeight: 1,
            }}
          >✕</button>
        )}
      </div>

      <style>{`@keyframes csb-spin { to { transform: rotate(360deg); } }`}</style>

      {/* ── Dropdown ──────────────────────────────────────── */}
      {showDrop && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0,
          background: "#161616",
          border: "1px solid rgba(255,255,255,.1)",
          borderRadius: 10, overflow: "hidden",
          boxShadow: "0 16px 48px rgba(0,0,0,.85)",
          zIndex: 9999,
        }}>

          {/* Loading skeleton */}
          {isLoading && (
            <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
              {[1, 2, 3].map(n => (
                <div key={n} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 6, background: "rgba(255,255,255,.06)", flexShrink: 0 }} />
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5 }}>
                    <div style={{ height: 10, borderRadius: 4, background: "rgba(255,255,255,.06)", width: "60%" }} />
                    <div style={{ height: 8,  borderRadius: 4, background: "rgba(255,255,255,.04)", width: "35%" }} />
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
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "10px 14px", textDecoration: "none",
                    borderBottom: i < results.length - 1
                      ? "1px solid rgba(255,255,255,.06)"
                      : "none",
                    transition: "background .12s",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(201,151,58,.09)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "none")}
                >
                  {/* Avatar */}
                  <div style={{
                    width: 38, height: 38, borderRadius: 6, overflow: "hidden",
                    flexShrink: 0, background: "#2a2a2a",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "1.1rem",
                  }}>
                    {c.photo
                      ? <img src={c.photo} alt="" width={38} height={38}
                          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                      : "👤"}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      margin: 0, fontSize: ".82rem", fontWeight: 700, color: "#fff",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {highlightMatch(c.name, query)}
                    </p>
                    <p style={{ margin: "2px 0 0", fontSize: ".66rem", color: "rgba(255,255,255,.4)" }}>
                      {c.type ?? "Artist"}
                      {c.filmCount ? ` · ${c.filmCount} film${c.filmCount !== 1 ? "s" : ""}` : ""}
                    </p>
                  </div>

                  <span style={{ fontSize: ".7rem", color: "rgba(201,151,58,.7)", flexShrink: 0 }}>→</span>
                </a>
              ))}

              <div style={{
                padding: "7px 14px",
                background: "rgba(255,255,255,.02)",
                borderTop: "1px solid rgba(255,255,255,.06)",
              }}>
                <p style={{ margin: 0, fontSize: ".62rem", color: "rgba(255,255,255,.22)" }}>
                  {results.length} result{results.length !== 1 ? "s" : ""} — press{" "}
                  <kbd style={{ background: "rgba(255,255,255,.08)", padding: "1px 5px", borderRadius: 4 }}>
                    Esc
                  </kbd>{" "}to close
                </p>
              </div>
            </>
          )}

          {/* No results */}
          {!isLoading && search.status === "done" && results.length === 0 && (
            <div style={{ padding: "18px 14px", textAlign: "center" }}>
              <p style={{ margin: 0, fontSize: ".8rem", color: "rgba(255,255,255,.35)" }}>
                No results for{" "}
                <strong style={{ color: "rgba(255,255,255,.6)" }}>"{query}"</strong>
              </p>
              <p style={{ margin: "6px 0 0", fontSize: ".68rem", color: "rgba(255,255,255,.2)" }}>
                Try a different spelling or browse by role below
              </p>
            </div>
          )}

          {/* Error */}
          {!isLoading && search.status === "error" && (
            <div style={{ padding: "14px", textAlign: "center" }}>
              <p style={{ margin: 0, fontSize: ".78rem", color: "rgba(255,100,100,.7)" }}>
                Search unavailable — please try again
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function highlightMatch(name: string, query: string) {
  const idx = name.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <span style={{ color: "#fff" }}>{name}</span>;
  return (
    <>
      <span style={{ color: "#fff" }}>{name.slice(0, idx)}</span>
      <span style={{ color: "#c9973a", fontWeight: 800 }}>
        {name.slice(idx, idx + query.length)}
      </span>
      <span style={{ color: "#fff" }}>{name.slice(idx + query.length)}</span>
    </>
  );
}