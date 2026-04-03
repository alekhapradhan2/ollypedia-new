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

// ── CSS (self-contained — identical to Home.jsx heroCss) ─────────────
const CSS = `
@keyframes hhpulse { 0%,100%{opacity:1} 50%{opacity:.35} }

.hh-wrap {
  position: relative;
  width: 100%;
  background: #0a0a0a;
  overflow: hidden;
}
.hh-slide {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center 25%;
  opacity: 0;
  transition: opacity .7s ease;
  pointer-events: none;
}
.hh-slide.active {
  position: relative;
  opacity: 1;
  pointer-events: auto;
}
.hh-inner {
  position: relative;
  min-height: clamp(300px, 56vw, 580px);
  overflow: hidden;
}
.hh-overlay {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(to top,
      rgba(0,0,0,.96) 0%,
      rgba(0,0,0,.65) 35%,
      rgba(0,0,0,.15) 65%,
      transparent    100%
    ),
    linear-gradient(to right,
      rgba(0,0,0,.80) 0%,
      rgba(0,0,0,.40) 50%,
      transparent    80%
    );
}
.hh-content {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 16px 16px 52px;
  z-index: 3;
  max-width: 680px;
}
@media(min-width:480px)  { .hh-content { padding: 20px 24px 58px; } }
@media(min-width:768px)  { .hh-content { padding: 28px 36px 70px; } }
@media(min-width:1100px) { .hh-content { padding: 32px 52px 78px; } }

.hh-tags { display:flex; flex-wrap:wrap; gap:5px; margin-bottom:9px; }
.hh-tag {
  font-size:.6rem; font-weight:700; text-transform:uppercase; letter-spacing:.07em;
  padding:3px 9px; border-radius:20px;
  background:rgba(201,151,58,.18); border:1px solid rgba(201,151,58,.5); color:#c9973a;
}
.hh-tag-gl {
  font-size:.6rem; font-weight:600;
  padding:3px 9px; border-radius:20px;
  background:rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.22);
  color:rgba(255,255,255,.82);
}
.hh-title {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: clamp(1.4rem, 5.5vw, 3rem);
  font-weight: 900;
  line-height: 1.08;
  color: #fff;
  margin: 0 0 7px;
  text-shadow: 0 2px 20px rgba(0,0,0,.7);
}
.hh-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 5px 12px;
  margin-bottom: 8px;
  font-size: clamp(.68rem, 2vw, .79rem);
  color: rgba(255,255,255,.58);
}
.hh-badge {
  font-size:.58rem; font-weight:800; text-transform:uppercase; letter-spacing:.07em;
  padding:2px 9px; border-radius:3px;
}
.hh-synopsis {
  font-size: clamp(.78rem, 2.2vw, .86rem);
  color: rgba(255,255,255,.62);
  line-height: 1.6;
  margin: 0 0 14px;
  display: none;
}
@media(min-width:420px) {
  .hh-synopsis {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
}
@media(min-width:768px) { .hh-synopsis { -webkit-line-clamp: 3; } }

.hh-btns { display:flex; gap:8px; flex-wrap:wrap; }
.hh-btn-play {
  display: inline-flex; align-items: center; gap: 7px;
  background: #c9973a; color: #000; border: none;
  padding: clamp(9px,2vw,12px) clamp(14px,3vw,24px);
  border-radius: 8px;
  font-size: clamp(.76rem, 2vw, .88rem); font-weight: 800;
  cursor: pointer; transition: opacity .18s; white-space: nowrap;
  text-decoration: none;
}
.hh-btn-play:hover { opacity: .85; }
.hh-btn-info {
  display: inline-flex; align-items: center; gap: 6px;
  background: rgba(255,255,255,.1); color: #f1f1f1;
  border: 1px solid rgba(255,255,255,.28);
  padding: clamp(9px,2vw,12px) clamp(12px,2.5vw,20px);
  border-radius: 8px;
  font-size: clamp(.74rem, 2vw, .86rem); font-weight: 600;
  cursor: pointer; transition: background .18s; white-space: nowrap;
  backdrop-filter: blur(6px);
  text-decoration: none;
}
.hh-btn-info:hover { background: rgba(255,255,255,.18); }

/* Dots */
.hh-dots {
  position: absolute;
  bottom: 16px; left: 16px;
  display: flex; gap: 6px; z-index: 4;
}
@media(min-width:480px)  { .hh-dots { bottom: 18px; left: 24px; } }
@media(min-width:768px)  { .hh-dots { bottom: 22px; left: 36px; } }
@media(min-width:1100px) { .hh-dots { left: 52px; } }
.hh-dot {
  width: 7px; height: 7px; border-radius: 50%;
  background: rgba(255,255,255,.3); border: none;
  cursor: pointer; padding: 0; transition: all .25s;
}
.hh-dot.active { width: 24px; border-radius: 4px; background: #c9973a; }

/* Thumbnail strip — desktop only, bottom-right */
.hh-strip {
  position: absolute;
  bottom: 14px; right: 16px;
  display: none;
  gap: 5px; z-index: 4;
}
@media(min-width:900px) { .hh-strip { display: flex; bottom: 18px; right: 24px; } }
.hh-strip-item {
  width: 72px; height: 48px;
  border-radius: 5px; overflow: hidden;
  cursor: pointer; flex-shrink: 0;
  border: 2px solid rgba(255,255,255,.15);
  background: #1c1c1c;
  position: relative; transition: border-color .2s;
}
.hh-strip-item.active { border-color: #c9973a; }
.hh-strip-item img { width:100%; height:100%; object-fit:cover; display:block; }
.hh-strip-play {
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
  background: rgba(0,0,0,.28); font-size: .55rem; color: #fff;
}
`;

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
      <style>{CSS}</style>
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
