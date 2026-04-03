import { Star } from "lucide-react";

export function StarRating({ rating, max = 10 }: { rating: number; max?: number }) {
  const stars = 5;
  const filled = Math.round((rating / max) * stars);
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: stars }).map((_, i) => (
        <Star
          key={i}
          className={`w-3.5 h-3.5 ${i < filled ? "fill-yellow-400 text-yellow-400" : "fill-gray-700 text-gray-700"}`}
        />
      ))}
    </div>
  );
}
