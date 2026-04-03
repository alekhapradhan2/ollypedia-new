"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";

// ── Helpers ─────────────────────────────────────────────────────────
const extractYtId = (input: string | null | undefined) => {
  if (!input) return null;
  const s = String(input).trim();
  const m = s.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : /^[A-Za-z0-9_-]{11}$/.test(s) ? s : null;
};
const ytThumb = (id: string | null | undefined) => {
  const i = extractYtId(id);
  return i ? `https://img.youtube.com/vi/${i}/mqdefault.jpg` : null;
};
const heroImage = (m: HeroMovie) =>
  m.thumbnailUrl || ytThumb(m.media?.trailer?.ytId) || m.posterUrl || null;
const fmtDate = (d: string) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";

// ── Verdict colours ──────────────────────────────────────────────────
const VS: Record<string, string> = {
  Blockbuster: "#95e5b8",
  "Super Hit": "#95e5b8",
  Hit: "#a3e8a0",
  Average: "#e8c87a",
  Flop: "#e59595",
  Disaster: "#e59595",
  Upcoming: "#7aaae8",
};

export interface HeroMovie {
  _id: string;
  slug?: string;
  title: string;
  category?: string;
  genre?: string[];
  language?: string;
  releaseDate?: string;
  director?: string;
  verdict?: string;
  synopsis?: string;
  thumbnailUrl?: string;
  posterUrl?: string;
  bannerUrl?: string;
  media?: {
    trailer?: { ytId?: string };
  };
}

// ── CSS moved to src/styles/globals.css

// ── Main client component ────────────────────────────────────────────
export default function HeroCarousel({ movies }: { movies: HeroMovie[] }) {
  const [heroIdx, setHeroIdx] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(
      () => setHeroIdx((i) => (i + 1) % movies.length),
      5500
    );
  }, [movies.length]);

  useEffect(() => {
    if (!movies.length) return;
    startTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [movies.length, startTimer]);

  const goHero = (i: number) => {
    setHeroIdx(i);
    startTimer(); // reset timer on manual click
  };

  if (!movies.length) return null;

  const m = movies[heroIdx];
  const img = heroImage(m);
  const vc = VS[m.verdict || ""] || "#7aaae8";
  const movieHref = `/movie/${m.slug || m._id}`;
  const trailerHref = m.media?.trailer?.ytId
    ? `/movie/${m._id}#trailer`
    : null;

  // Dots element
  const dotsEl = (
    <div className="hh-dots">
      {movies.map((_, di) => (
        <button
          key={di}
          className={`hh-dot${di === heroIdx ? " active" : ""}`}
          onClick={() => goHero(di)}
          aria-label={`Slide ${di + 1}`}
        />
      ))}
    </div>
  );

  // Thumbnail strip element
  const stripEl = (
    <div className="hh-strip">
      {movies.map((sm, si) => {
        const simg = heroImage(sm);
        return (
          <div
            key={sm._id}
            className={`hh-strip-item${si === heroIdx ? " active" : ""}`}
            onClick={() => goHero(si)}
          >
            {simg ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={simg}
                alt={sm.title}
                loading="lazy"
                decoding="async"
                onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
              />
            ) : (
              <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".9rem" }}>
                🎬
              </div>
            )}
            {sm.media?.trailer?.ytId && <div className="hh-strip-play">▶</div>}
          </div>
        );
      })}
    </div>
  );

  return (
    <>
      <div className="hh-wrap">
        {movies.map((movie, i) => {
          // Only render the active slide + its neighbours (perf)
          const isAdjacentOrActive =
            i === heroIdx ||
            i === (heroIdx + 1) % movies.length ||
            i === (heroIdx - 1 + movies.length) % movies.length;

          const mImg = heroImage(movie);
          const mvc  = VS[movie.verdict || ""] || "#7aaae8";
          const mHref = `/movie/${movie.slug || movie._id}`;
          const mTrailerHref = movie.media?.trailer?.ytId ? `/movie/${movie._id}#trailer` : null;

          if (!isAdjacentOrActive) return <div key={movie._id} className="hh-slide" />;

          return (
            <div
              key={movie._id}
              className={`hh-slide${i === heroIdx ? " active" : ""}`}
              style={{ backgroundImage: mImg ? `url(${mImg})` : "none" }}
            >
              <div className="hh-inner">
                <div className="hh-overlay" />

                <div className="hh-content">
                  {/* Tags */}
                  <div className="hh-tags">
                    {movie.category   && <span className="hh-tag">{movie.category}</span>}
                    {movie.genre?.[0] && <span className="hh-tag-gl">{movie.genre[0]}</span>}
                    {movie.language   && <span className="hh-tag-gl">{movie.language}</span>}
                  </div>

                  {/* Title — h1 only on active slide for SEO */}
                  {i === heroIdx ? (
                    <h1 className="hh-title">{movie.title}</h1>
                  ) : (
                    <p className="hh-title" aria-hidden="true">{movie.title}</p>
                  )}

                  {/* Meta row */}
                  <div className="hh-meta">
                    {movie.releaseDate && <span>🗓 {fmtDate(movie.releaseDate)}</span>}
                    {movie.director   && <span>🎬 {movie.director}</span>}
                    {movie.verdict && movie.verdict !== "Upcoming" && (
                      <span
                        className="hh-badge"
                        style={{ background: `${mvc}22`, border: `1px solid ${mvc}`, color: mvc }}
                      >
                        {movie.verdict}
                      </span>
                    )}
                  </div>

                  {/* Synopsis */}
                  {movie.synopsis && (
                    <p className="hh-synopsis">
                      {movie.synopsis.slice(0, 180)}
                      {movie.synopsis.length > 180 ? "…" : ""}
                    </p>
                  )}

                  {/* Buttons */}
                  <div className="hh-btns">
                    {mTrailerHref && (
                      <Link href={mTrailerHref} className="hh-btn-play">
                        ▶ Watch Trailer
                      </Link>
                    )}
                    <Link href={mHref} className="hh-btn-info">
                      More Info
                    </Link>
                  </div>
                </div>

                {/* Dots + strip only on active slide */}
                {i === heroIdx && dotsEl}
                {i === heroIdx && stripEl}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
