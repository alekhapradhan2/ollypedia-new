"use client";
import { useState } from "react";
import { Play } from "lucide-react";
import Image from "next/image";

interface YouTubeEmbedProps {
  ytId: string;
  title?: string;
  autoPlay?: boolean;
}

export function YouTubeEmbed({ ytId, title, autoPlay = false }: YouTubeEmbedProps) {
  const [playing, setPlaying] = useState(autoPlay);
  const thumb = `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`;

  if (!playing) {
    return (
      <div
        className="relative aspect-video rounded-xl overflow-hidden cursor-pointer group"
        onClick={() => setPlaying(true)}
      >
        <Image
          src={thumb}
          alt={title || "Video"}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-2xl">
            <Play className="w-7 h-7 text-white fill-white ml-1" />
          </div>
        </div>
        {title && (
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black to-transparent">
            <p className="text-white font-medium text-sm">{title}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="yt-wrapper rounded-xl overflow-hidden">
      <iframe
        src={`https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0`}
        title={title || "YouTube video"}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}
