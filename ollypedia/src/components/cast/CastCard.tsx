import Link from "next/link";
import Image from "next/image";
import { Film } from "lucide-react";

interface CastCardProps {
  cast: {
    _id: string;
    name: string;
    photo?: string;
    type?: string;
    roles?: string[];
    movies?: any[];
  };
}

export function CastCard({ cast }: CastCardProps) {
  const image = cast.photo || "/placeholder-person.jpg";
  const roles = cast.roles?.length ? cast.roles.join(", ") : cast.type || "Artist";

  return (
    <Link href={`/cast/${cast._id}`} className="group block text-center">
      <div className="relative w-24 h-24 mx-auto rounded-full overflow-hidden border-2 border-[#2a2a2a] group-hover:border-orange-500/50 transition-colors mb-3">
        <Image
          src={image}
          alt={cast.name}
          fill
          sizes="96px"
          className="object-cover group-hover:scale-110 transition-transform duration-500"
        />
      </div>
      <p className="font-semibold text-white text-sm line-clamp-1 group-hover:text-orange-400 transition-colors">
        {cast.name}
      </p>
      <p className="text-xs text-gray-500 mt-0.5">{roles}</p>
      {cast.movies && cast.movies.length > 0 && (
        <p className="text-xs text-gray-600 mt-0.5 flex items-center justify-center gap-1">
          <Film className="w-3 h-3" /> {cast.movies.length} films
        </p>
      )}
    </Link>
  );
}
