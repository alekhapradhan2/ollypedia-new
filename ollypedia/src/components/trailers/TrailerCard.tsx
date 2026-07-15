"use client";
// components/trailers/TrailerCard.tsx
// Cinematic trailer card — clicks navigate to /trailers/[slug]

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Play, Calendar, Clock, User, Film, Tag, ChevronRight,
  Clapperboard, ExternalLink,
} from "lucide-react";
import type { TrailerMovieDoc } from "@/lib/trailerSeo";
import { hasAnyVideo, fmtDate, getPrimaryVideo, hasTrailer, hasTeaser } from "@/lib/trailerSeo";

function CardLoadingOverlay({ rounded }: { rounded?: string }) {
  return (
    <div className={`absolute inset-0 z-50 bg-black/60 backdrop-blur-[2px] flex items-center justify-center pointer-events-none ${rounded || ""}`}>
      <div className="w-8 h-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
    </div>
  );
}

interface TrailerCardProps {
  movie: TrailerMovieDoc;
  variant?: "default" | "compact" | "featured";
}

function TrailerBadge({ movie }: { movie: TrailerMovieDoc }) {
  const vid = getPrimaryVideo(movie);
  if (!vid) return null;

  if (vid.type === "Trailer") {
    return (
      <span className="inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full bg-red-600 text-white uppercase tracking-wide shadow-lg shadow-red-900/40">
        <Play className="w-2 h-2 fill-white" />
        Trailer
      </span>
    );
  }
  if (vid.type === "Teaser") {
    return (
      <span className="inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full bg-amber-500 text-black uppercase tracking-wide shadow-lg shadow-amber-900/40">
        <Play className="w-2 h-2 fill-black" />
        Teaser
      </span>
    );
  }
  if (vid.type === "Motion Poster") {
    return (
      <span className="inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full bg-blue-600 text-white uppercase tracking-wide">
        <Film className="w-2 h-2" />
        Motion
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full bg-purple-600 text-white uppercase tracking-wide">
      👁 {vid.type || "First Look"}
    </span>
  );
}

export function TrailerCard({ movie, variant = "default" }: TrailerCardProps) {
  const [imgError, setImgError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const movieSlug    = movie.slug || movie._id;
  const trailerHref  = `/trailers/${movieSlug}`;
  const movieHref    = `/movie/${movieSlug}`;
  const posterSrc    = movie.posterUrl || movie.thumbnailUrl || "/placeholder-movie.jpg";
  const releaseLabel = fmtDate(movie.releaseDate);
  const genres       = (movie.genre || []).slice(0, 2);
  const hasVideo     = hasAnyVideo(movie);
  const primaryVid   = getPrimaryVideo(movie);
  const ytId         = primaryVid?.ytId;
  const ytThumb      = ytId ? (primaryVid?.thumbnailUrl || `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`) : null;
  const displayImg   = ytThumb || posterSrc;

  if (variant === "compact") {
    return (
      <Link href={trailerHref} onClick={() => setIsLoading(true)} className="group relative flex gap-3 p-2.5 bg-[#181818] border border-[#252525] rounded-xl hover:border-orange-500/40 hover:bg-[#1e1e1e] transition-all duration-200">
        <div className="relative w-12 h-[68px] rounded-lg overflow-hidden flex-shrink-0">
          <Image src={imgError ? "/placeholder-movie.jpg" : displayImg} alt={movie.title} fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setImgError(true)} />
        </div>
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-white line-clamp-2 leading-tight group-hover:text-orange-400 transition-colors">{movie.title}</h3>
            <div className="mt-1"><TrailerBadge movie={movie} /></div>
          </div>
          <p className="text-[10px] text-gray-600 flex items-center gap-0.5 mt-1">
            <Calendar className="w-2.5 h-2.5" />
            <span className={releaseLabel === "TBA" ? "text-orange-500 font-semibold" : ""}>{releaseLabel}</span>
          </p>
        </div>
        {isLoading && <CardLoadingOverlay rounded="rounded-xl" />}
      </Link>
    );
  }

  return (
    <article className="group relative flex flex-col h-full bg-[#101010] rounded-2xl overflow-hidden border border-[#1e1e1e] hover:border-orange-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-orange-500/10 hover:-translate-y-1">
      {/* Main card link for SEO and clicking */}
      <Link href={trailerHref} onClick={() => setIsLoading(true)} className="absolute inset-0 z-[30]" aria-label={`Watch ${movie.title} trailer`} />
        {/* ── Poster with cinematic overlay ── */}
        <div className="relative overflow-hidden" style={{ aspectRatio: "2/3" }}>

          {/* Background blur layer (depth effect) */}
          <Image
            src={imgError ? "/placeholder-movie.jpg" : posterSrc}
            alt=""
            fill
            className="object-cover scale-110 blur-sm opacity-40"
            aria-hidden="true"
            onError={() => setImgError(true)}
          />

          {/* Main poster */}
          <Image
            src={imgError ? "/placeholder-movie.jpg" : posterSrc}
            alt={movie.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            className="object-cover group-hover:scale-110 transition-transform duration-700 ease-out relative"
            onError={() => setImgError(true)}
          />

          {/* Cinematic gradient overlay */}
          <div className="absolute inset-0"
            style={{
              background: "linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0.7) 75%, rgba(0,0,0,0.95) 100%)",
            }}
          />

          {/* Top left: trailer type badge */}
          <div className="absolute top-2 left-2 z-10">
            <TrailerBadge movie={movie} />
          </div>

          {/* Top right: second badge if both exist */}
          {hasTrailer(movie) && hasTeaser(movie) && (
            <div className="absolute top-2 right-2 z-10">
              <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-amber-500/90 text-black uppercase tracking-wide">
                + Teaser
              </span>
            </div>
          )}

          {/* Center play button — on hover */}
          <div className="absolute inset-0 flex items-center justify-center z-10 opacity-0 group-hover:opacity-100 transition-all duration-300">
            {hasVideo ? (
              <div className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-md border-2 border-white/30 flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform duration-200">
                <Play className="w-6 h-6 text-white fill-white ml-0.5" />
              </div>
            ) : (
              <div className="px-3 py-1.5 rounded-full bg-black/70 border border-white/10 backdrop-blur-sm">
                <span className="text-xs text-gray-300 font-medium">🎬 Coming Soon</span>
              </div>
            )}
          </div>

          {/* Bottom: title + quick meta overlaid on poster */}
          <div className="absolute bottom-0 left-0 right-0 p-3 z-10">
            <h3 className="font-black text-white text-sm leading-tight line-clamp-2 drop-shadow-lg">
              {movie.title}
            </h3>
            {releaseLabel !== "TBA" ? (
              <p className="text-[10px] text-gray-300 mt-0.5 flex items-center gap-1 drop-shadow">
                <Calendar className="w-2.5 h-2.5" />{releaseLabel}
              </p>
            ) : (
              <p className="text-[10px] text-orange-400 mt-0.5 font-semibold">Release TBA</p>
            )}
          </div>

          {/* No video: dim overlay */}
          {!hasVideo && (
            <div className="absolute inset-0 bg-black/30 z-[5]" />
          )}
        </div>

        {/* ── Below poster: genre + director + action row ── */}
        <div className="p-2.5 flex flex-col gap-2 flex-1 bg-[#111] relative z-[40] pointer-events-none">

          {/* Genre tags */}
          {genres.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {genres.map((g) => (
                <span key={g}
                  className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.06] text-gray-500 border border-white/[0.05]"
                  onClick={(e) => e.preventDefault()}
                >
                  {g}
                </span>
              ))}
            </div>
          )}

          {/* Director */}
          {movie.director && (
            <p className="text-[10px] text-gray-600 truncate flex items-center gap-1">
              <User className="w-2.5 h-2.5 flex-shrink-0" />
              {movie.director}
            </p>
          )}

          {/* Trailer release date if available */}
          {movie.media?.trailerReleaseDate && (
            <p className="text-[10px] text-orange-500/70 flex items-center gap-1">
              <Clapperboard className="w-2.5 h-2.5 flex-shrink-0" />
              {fmtDate(movie.media.trailerReleaseDate)}
            </p>
          )}

          {/* Action row */}
          <div className="flex gap-1.5 mt-auto pt-1">
            <div
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] font-bold transition-colors ${
                hasVideo
                  ? "bg-red-600/90 text-white group-hover:bg-red-600"
                  : "bg-gray-800 text-gray-600 cursor-default"
              }`}
            >
              {hasVideo ? (
                <><Play className="w-2.5 h-2.5 fill-white" /> Watch</>
              ) : (
                <><Clapperboard className="w-2.5 h-2.5" /> Soon</>
              )}
            </div>

            {/* Movie page shortcut */}
            <Link
              href={movieHref}
              onClick={(e) => {
                e.stopPropagation();
                setIsLoading(true);
              }}
              title="Full movie page"
              className="pointer-events-auto relative flex items-center justify-center w-7 h-7 rounded-lg bg-white/[0.05] hover:bg-orange-500/10 border border-white/[0.06] hover:border-orange-500/30 text-gray-600 hover:text-orange-400 transition-all flex-shrink-0 z-20"
              aria-label={`View full movie page for ${movie.title}`}
            >
              <ExternalLink className="w-2.5 h-2.5" />
            </Link>
          </div>
        </div>
      {isLoading && <CardLoadingOverlay rounded="rounded-2xl" />}
      </article>
  );
}
