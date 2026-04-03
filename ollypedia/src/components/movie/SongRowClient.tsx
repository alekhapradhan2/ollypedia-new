"use client";
import { useState } from "react";
import Image from "next/image";
import { YouTubeEmbed } from "@/components/ui/YouTubeEmbed";

interface Song {
  title?: string;
  singer?: string;
  musicDirector?: string;
  ytId?: string;
  thumbnailUrl?: string;
}

export function SongRowClient({ song, index }: { song: Song; index: number }) {
  const [playing, setPlaying] = useState(false);
  const thumb = song.thumbnailUrl ||
    (song.ytId ? `https://img.youtube.com/vi/${song.ytId}/mqdefault.jpg` : "/placeholder-song.svg");

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-3 p-3">
        <span className="text-gray-600 text-sm w-6 text-center flex-shrink-0">{index}</span>
        <div className="relative w-16 h-11 rounded overflow-hidden flex-shrink-0">
          <Image src={thumb} alt={song.title || "Song"} fill className="object-cover" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white line-clamp-1">{song.title || "Untitled"}</p>
          <p className="text-xs text-gray-500">
            {[song.singer, song.musicDirector].filter(Boolean).join(" • ")}
          </p>
        </div>
        {song.ytId && (
          <button
            onClick={() => setPlaying(!playing)}
            className="px-3 py-1.5 text-xs bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex-shrink-0"
          >
            {playing ? "✕ Close" : "▶ Play"}
          </button>
        )}
      </div>
      {playing && song.ytId && (
        <div className="px-3 pb-3">
          <YouTubeEmbed ytId={song.ytId} title={song.title} autoPlay />
        </div>
      )}
    </div>
  );
}
