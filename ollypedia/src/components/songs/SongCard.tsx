import Image from "next/image";
import { Play, Music } from "lucide-react";

interface SongCardProps {
  song: {
    _id?: string;
    title: string;
    singer?: string;
    musicDirector?: string;
    ytId?: string;
    thumbnailUrl?: string;
    movieTitle?: string;
    movieSlug?: string;
  };
  onClick?: () => void;
}

export function SongCard({ song, onClick }: SongCardProps) {
  const thumb = song.thumbnailUrl
    || (song.ytId ? `https://img.youtube.com/vi/${song.ytId}/mqdefault.jpg` : "/placeholder-song.jpg");

  return (
    <div
      className="card flex gap-3 p-3 cursor-pointer group"
      onClick={onClick}
    >
      <div className="relative w-20 h-14 rounded-lg overflow-hidden flex-shrink-0">
        <Image src={thumb} alt={song.title} fill className="object-cover" />
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <Play className="w-6 h-6 text-white fill-white" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-white text-sm line-clamp-1 group-hover:text-orange-400 transition-colors">
          {song.title || "Untitled"}
        </h4>
        {song.singer && (
          <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
            <Music className="w-3 h-3" /> {song.singer}
          </p>
        )}
        {song.movieTitle && (
          <p className="text-xs text-gray-600 mt-0.5 truncate">{song.movieTitle}</p>
        )}
        {song.musicDirector && (
          <p className="text-xs text-gray-600 mt-0.5">Music: {song.musicDirector}</p>
        )}
      </div>
    </div>
  );
}
