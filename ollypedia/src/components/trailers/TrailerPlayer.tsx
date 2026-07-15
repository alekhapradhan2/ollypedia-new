"use client";
// components/trailers/TrailerPlayer.tsx
// Tabbed multi-video player for trailer, teaser, motion poster, first look, songs

import { useState } from "react";
import { Play, Film, Eye, Music } from "lucide-react";
import { YouTubeEmbed } from "@/components/ui/YouTubeEmbed";
import type { TrailerMovieDoc } from "@/lib/trailerSeo";

interface Tab {
  id: string;
  label: string;
  ytId: string;
  icon: React.ReactNode;
  color: string;
}

interface TrailerPlayerProps {
  movie: TrailerMovieDoc;
  defaultTab?: string;
}

export function TrailerPlayer({ movie, defaultTab }: TrailerPlayerProps) {
  const tabs: Tab[] = [];

  // Map over the videos array, sorted by priority
  if (movie.media?.videos && movie.media.videos.length > 0) {
    const priority = ["Trailer", "Teaser", "Glimpse", "First Look", "Motion Poster"];
    const sortedVideos = [...movie.media.videos].sort((a, b) => {
      const idxA = priority.indexOf(a.type || "");
      const idxB = priority.indexOf(b.type || "");
      return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
    });

    sortedVideos.forEach((vid, i) => {
      if (!vid.ytId) return;
      
      let icon = <Play className="w-3.5 h-3.5 text-gray-400" />;
      let color = "text-gray-400 border-gray-500/50 bg-gray-500/10";
      let label = vid.type || "Video";

      if (vid.type === "Trailer") {
        icon = <Play className="w-3.5 h-3.5 fill-red-400" />;
        color = "text-red-400 border-red-500/50 bg-red-500/10";
        label = "Official Trailer";
      } else if (vid.type === "Teaser") {
        icon = <Play className="w-3.5 h-3.5 fill-amber-400" />;
        color = "text-amber-400 border-amber-500/50 bg-amber-500/10";
        label = "Official Teaser";
      } else if (vid.type === "Motion Poster") {
        icon = <Film className="w-3.5 h-3.5 text-blue-400" />;
        color = "text-blue-400 border-blue-500/50 bg-blue-500/10";
      } else if (vid.type === "First Look" || vid.type === "Glimpse") {
        icon = <Eye className="w-3.5 h-3.5 text-purple-400" />;
        color = "text-purple-400 border-purple-500/50 bg-purple-500/10";
      }

      tabs.push({
        id: `vid-${i}-${vid.ytId}`,
        label,
        ytId: vid.ytId,
        icon,
        color,
      });
    });
  }

  // Add song videos
  const songTabs = (movie.media?.songs || []).filter((s) => s.ytId).slice(0, 3);
  songTabs.forEach((s, i) => {
    tabs.push({
      id: `song-${i}`,
      label: s.title || `Song ${i + 1}`,
      ytId: s.ytId!,
      icon: <Music className="w-3.5 h-3.5 text-emerald-400" />,
      color: "text-emerald-400 border-emerald-500/50 bg-emerald-500/10",
    });
  });

  const [activeId, setActiveId] = useState<string>(
    defaultTab && tabs.find((t) => t.id === defaultTab) ? defaultTab : tabs[0]?.id || ""
  );

  const activeTab = tabs.find((t) => t.id === activeId);

  if (tabs.length === 0) {
    return (
      <div className="aspect-video rounded-2xl bg-[#181818] border border-[#2a2a2a] flex flex-col items-center justify-center gap-4">
        <div className="w-16 h-16 bg-[#222] rounded-full flex items-center justify-center border border-white/5">
          <Film className="w-7 h-7 text-gray-600" />
        </div>
        <div className="text-center">
          <p className="text-gray-400 font-semibold">Trailer Coming Soon</p>
          <p className="text-gray-600 text-sm mt-1">The official trailer hasn't been released yet.</p>
          <p className="text-gray-600 text-xs mt-0.5">Stay tuned to Ollypedia for updates.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Tabs — only show if more than one video */}
      {tabs.length > 1 && (
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Video content tabs">
          {tabs.map((tab) => {
            const isActive = tab.id === activeId;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveId(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all duration-150 ${
                  isActive
                    ? tab.color
                    : "text-gray-500 border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:text-gray-300"
                }`}
              >
                {tab.icon}
                <span className="truncate max-w-[120px]">{tab.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Player */}
      {activeTab && (
        <div role="tabpanel" aria-label={activeTab.label}>
          <YouTubeEmbed
            ytId={activeTab.ytId}
            title={`${movie.title} — ${activeTab.label}`}
          />
        </div>
      )}
    </div>
  );
}
