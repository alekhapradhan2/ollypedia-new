import Link from "next/link";
import Image from "next/image";
import { Calendar, Star } from "lucide-react";

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
  };
  variant?: "portrait" | "landscape";
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

export function MovieCard({ movie, variant = "portrait" }: MovieCardProps) {
  const href  = `/movie/${movie.slug || movie._id}`;
  const image = movie.posterUrl || movie.thumbnailUrl || "/placeholder-movie.jpg";
  const year  = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : "";
  const rating = movie.reviews?.length
    ? (movie.reviews.reduce((s, r) => s + (r.rating || 0), 0) / movie.reviews.length).toFixed(1)
    : movie.imdbRating || null;

  if (variant === "landscape") {
    return (
      <Link href={href} className="card flex gap-3 p-3 group">
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
            {year && (
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <Calendar className="w-3 h-3" /> {year}
              </span>
            )}
            {rating && (
              <span className="flex items-center gap-1 text-xs text-yellow-400 font-medium">
                <Star className="w-3 h-3 fill-yellow-400" /> {rating}
              </span>
            )}
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link href={href} className="group block">
      <div className="card overflow-hidden">
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
          {movie.verdict && (
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
          {year && (
            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
              <Calendar className="w-3 h-3" /> {year}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
