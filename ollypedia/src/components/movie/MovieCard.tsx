"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Calendar, Star, Loader2 } from "lucide-react";

interface MovieCardProps {
  movie: {
    _id: string;
    title: string;
    slug?: string;
    posterUrl?: string;
    thumbnailUrl?: string;
    releaseDate?: string;
    genre?: string[];
    verdict?: string;
    status?: string;
    reviews?: { rating?: number }[];
    imdbRating?: string;
    media?: {
      trailer?: { ytId?: string };
      videos?: { ytId?: string }[];
    };
  };
  variant?: "portrait" | "landscape" | "ott";
}

function verdictColor(verdict: string) {
  if (!verdict) return "badge-gray";
  const v = verdict.toLowerCase();
  if (v.includes("hit") || v.includes("blockbuster")) return "badge-green";
  if (v.includes("flop"))    return "badge-red";
  if (v.includes("average")) return "badge-orange";
  if (v.includes("upcoming")) return "badge-blue";
  return "badge-gray";
}

function CardLoadingOverlay() {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center gap-2 bg-black/80 backdrop-blur-[2px] rounded-[inherit]">
      <Loader2 className="w-4 h-4 text-orange-400 animate-spin" />
      <span className="text-xs font-medium text-gray-300">Opening...</span>
    </div>
  );
}

export function MovieCard({ movie, variant = "portrait" }: MovieCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const handleNavigate = () => setIsLoading(true);

  const isOtt = variant === "ott";
  const href  = isOtt ? `/ott/${movie.slug || movie._id}` : `/movie/${movie.slug || movie._id}`;
  const image = movie.posterUrl || movie.thumbnailUrl || "/placeholder-movie.jpg";
  const displayDate = (() => {
    if (!movie.releaseDate || movie.releaseDate.trim() === "") return "TBA";
    const d = new Date(movie.releaseDate);
    if (isNaN(d.getTime())) return "TBA";
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  })();
  const rating = movie.reviews?.length
    ? (movie.reviews.reduce((s, r) => s + (r.rating || 0), 0) / movie.reviews.length).toFixed(1)
    : movie.imdbRating || null;

  if (variant === "landscape") {
    return (
      <Link href={href} className="card relative flex gap-3 p-3 group" onClick={handleNavigate}>
        <div className="relative w-16 h-24 rounded-lg overflow-hidden flex-shrink-0">
          <Image src={image} alt={movie.title} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
        </div>
        <div className="flex-1 min-w-0 py-1">
          <h3 className="font-semibold text-white text-sm leading-tight line-clamp-2 group-hover:text-orange-400 transition-colors">
            {movie.title}
          </h3>
          <div className="flex flex-wrap gap-1 mt-1.5">
            {(movie.genre || []).slice(0, 2).map((g) => (
              <span key={g} className="text-xs text-gray-500">{g}</span>
            ))}
          </div>
          <div className="flex items-center gap-3 mt-2">
            <span className="flex items-center gap-1 text-xs text-gray-500">
                <Calendar className="w-3 h-3" />
                <span className={displayDate === "TBA" ? "text-orange-400 font-semibold" : ""}>
                  {displayDate}
                </span>
              </span>
            {rating && (
              <span className="flex items-center gap-1 text-xs text-yellow-400 font-medium">
                <Star className="w-3 h-3 fill-yellow-400" /> {rating}
              </span>
            )}
          </div>
        </div>
        {isLoading && <CardLoadingOverlay />}
      </Link>
    );
  }

  // Netflix-style layout for OTT variant
  if (isOtt) {
    const platformName = (movie as any)._platform || "";
    const trailerId = movie.media?.trailer?.ytId || movie.media?.videos?.find(v => v.ytId)?.ytId;

    return (
      <Link 
        href={href} 
        className="group block relative rounded-xl overflow-visible transition-transform duration-300 hover:scale-[1.03] hover:shadow-orange-500/20 hover:shadow-2xl hover:z-10" 
        onClick={handleNavigate}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="relative aspect-[2/3] w-full rounded-xl overflow-hidden bg-[#111]">
          {/* Hover Trailer Autoplay */}
          {isHovered && trailerId ? (
            <div className="absolute inset-0 z-0">
              <iframe 
                src={`https://www.youtube.com/embed/${trailerId}?autoplay=1&mute=1&controls=0&modestbranding=1&loop=1&playlist=${trailerId}&playsinline=1`}
                className="w-[300%] h-[150%] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-70 group-hover:opacity-100 transition-opacity duration-1000"
                allow="autoplay"
                frameBorder="0"
              />
            </div>
          ) : (
            <Image
              src={image}
              alt={movie.title}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
              className="object-cover transition-all duration-700 group-hover:scale-110 group-hover:brightness-50"
            />
          )}
          
          {/* Top Platform Badge */}
          {platformName && (
            <div className="absolute top-2 left-2 z-10">
              <span className="bg-white/10 backdrop-blur-md border border-white/20 text-white text-[10px] font-bold px-2 py-1 rounded-sm uppercase tracking-wider drop-shadow-md">
                {platformName}
              </span>
            </div>
          )}

          {/* Verdict Badge */}
          {movie.verdict && (
            <div className="absolute top-2 right-2 z-10">
              <span className={verdictColor(movie.verdict)} style={{ padding: "2px 6px", fontSize: "10px", borderRadius: "4px" }}>
                {movie.verdict}
              </span>
            </div>
          )}

          {/* Gradient Overlay for Text Visibility */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/60 to-transparent opacity-60 group-hover:opacity-90 transition-opacity duration-300 z-0" />
          
          {/* Content Container (Bottom Aligned) */}
          <div className="absolute inset-x-0 bottom-0 p-4 z-10 flex flex-col justify-end translate-y-4 group-hover:translate-y-0 transition-transform duration-300 ease-out">
            <h3 className="font-bold text-white text-base leading-tight drop-shadow-md">
              {movie.title}
            </h3>
            
            <div className="flex flex-wrap gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-75">
              <span className="text-xs font-semibold text-gray-300 flex items-center gap-1 drop-shadow">
                <Calendar className="w-3 h-3 text-orange-400" />
                {displayDate}
              </span>
              {(movie.genre || []).slice(0, 1).map((g) => (
                <span key={g} className="text-[10px] font-medium border border-gray-500/50 text-gray-300 px-1.5 py-0.5 rounded drop-shadow">
                  {g}
                </span>
              ))}
            </div>

            <div className="mt-3 opacity-0 group-hover:opacity-100 transition-all duration-300 delay-100 transform translate-y-2 group-hover:translate-y-0">
              <button className="w-full bg-white hover:bg-orange-500 text-black hover:text-white transition-colors py-2 rounded font-bold text-xs flex items-center justify-center gap-1.5">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                Watch Now
              </button>
            </div>
          </div>

          {/* Center Play Icon (Fades out on hover) */}
          <div className="absolute inset-0 z-10 flex items-center justify-center opacity-0 group-hover:opacity-0 transition-opacity duration-300 pointer-events-none">
            <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-sm border border-white/20 flex items-center justify-center shadow-2xl">
              <svg className="w-5 h-5 text-white fill-current ml-1" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
            </div>
          </div>

          {isLoading && <CardLoadingOverlay />}
        </div>
      </Link>
    );
  }

  return (
    <Link href={href} className="group block" onClick={handleNavigate}>
      <div className="card relative overflow-hidden">
        <div className="relative aspect-[2/3] overflow-hidden">
          <Image
            src={image}
            alt={movie.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="poster-overlay absolute inset-0" />

          {/* Verdict badge */}
          {movie.verdict && !isOtt && (
            <div className="absolute top-2 left-2">
              <span className={verdictColor(movie.verdict)}>{movie.verdict}</span>
            </div>
          )}

          {/* Rating */}
          {rating && (
            <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/70 px-1.5 py-0.5 rounded text-xs text-yellow-400 font-bold">
              <Star className="w-3 h-3 fill-yellow-400" /> {rating}
            </div>
          )}

          {/* Genre tags at bottom */}
          <div className="absolute bottom-2 left-2 right-2">
            <div className="flex flex-wrap gap-1">
              {(movie.genre || []).slice(0, 2).map((g) => (
                <span key={g} className="text-xs bg-black/60 text-gray-300 px-1.5 py-0.5 rounded">
                  {g}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="p-3">
          <h3 className="font-semibold text-white text-sm leading-tight line-clamp-2 group-hover:text-orange-400 transition-colors font-display">
            {movie.title}
          </h3>
          <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span className={displayDate === "TBA" ? "text-orange-400 font-semibold" : ""}>
                {displayDate}
              </span>
            </p>
        </div>
        {isLoading && <CardLoadingOverlay />}
      </div>
    </Link>
  );
}