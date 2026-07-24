"use client";

import Image from "next/image";
import { Disc, Play } from "lucide-react";
import { LoadingCard } from "@/components/ui/LoadingCard";

interface AlbumCardProps {
  movie: {
    _id: string;
    title: string;
    slug?: string;
    posterUrl?: string;
    media?: {
      songs?: { singer?: string, musicDirector?: string }[];
    };
  };
  hrefPrefix?: string;
}

export function AlbumCard({ movie, hrefPrefix = "/songs" }: AlbumCardProps) {
  const url = `${hrefPrefix}/${movie.slug || movie._id}`;
  
  // Extract top singers or music director
  const songs = movie.media?.songs || [];
  const musicDirectors = Array.from(new Set(songs.map(s => s.musicDirector).filter(Boolean)));
  const singers = Array.from(new Set(songs.map(s => s.singer).filter(Boolean)));

  let subtitle = "";
  if (musicDirectors.length > 0) {
    subtitle = `Music: ${musicDirectors[0]}`;
  } else if (singers.length > 0) {
    subtitle = singers.slice(0, 2).join(", ");
  } else {
    subtitle = "Original Soundtrack";
  }

  return (
    <LoadingCard href={url} className="group relative flex flex-col gap-3 w-full">
      {/* 1:1 Aspect Ratio Cover */}
      <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-[#111] border border-[#222] shadow-xl group-hover:shadow-[0_10px_30px_rgba(0,0,0,0.5)] transition-all duration-300">
        
        {/* Vinyl Record effect sticking out on hover */}
        <div className="absolute right-[-10%] top-1/2 -translate-y-1/2 w-[90%] h-[90%] rounded-full bg-black shadow-[inset_0_0_10px_rgba(255,255,255,0.1)] border border-[#222] flex items-center justify-center opacity-0 group-hover:opacity-100 group-hover:right-[-25%] group-hover:rotate-45 transition-all duration-500 z-0">
          <div className="w-1/3 h-1/3 rounded-full bg-[#111] border border-[#333] flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-[#0a0a0a]" />
          </div>
        </div>

        {/* Album Artwork */}
        <div className="absolute inset-0 z-10 bg-black">
          <Image 
            src={movie.posterUrl || "/placeholder-movie.jpg"} 
            alt={`${movie.title} Album`} 
            fill 
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
        </div>

        {/* Hover Play Button */}
        <div className="absolute inset-0 z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/30 backdrop-blur-[2px]">
          <div className="w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center shadow-[0_0_20px_rgba(249,115,22,0.4)] transform scale-75 group-hover:scale-100 transition-transform duration-300">
            <Play className="w-5 h-5 text-black fill-black ml-1" />
          </div>
        </div>

        {/* Top left badge */}
        <div className="absolute top-2 left-2 z-20 bg-black/60 backdrop-blur-md px-2 py-1 rounded-md flex items-center gap-1 border border-white/10">
          <Disc className="w-3 h-3 text-orange-400" />
          <span className="text-[10px] font-bold text-white uppercase tracking-wider">OST</span>
        </div>
      </div>

      {/* Details */}
      <div>
        <h3 className="font-bold text-sm sm:text-base text-white truncate group-hover:text-orange-400 transition-colors">
          {movie.title}
        </h3>
        <p className="text-xs text-gray-400 truncate mt-0.5">
          {subtitle}
        </p>
      </div>
    </LoadingCard>
  );
}
