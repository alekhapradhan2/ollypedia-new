"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Play, Calendar, Film, MonitorPlay } from "lucide-react";
import { PlatformLogo } from "@/components/ui/PlatformLogo";

interface OttMovieActionsProps {
  watchUrl: string;
  isStreaming: boolean;
  platformName: string;
  pInfo?: { name: string; slug: string; color: string; domain: string } | null;
  trailerId?: string;
  movieSlug: string;
  movieTitle: string;
}

export function OttMovieActions({ watchUrl, isStreaming, platformName, pInfo, trailerId, movieSlug, movieTitle }: OttMovieActionsProps) {
  const [showStickyBar, setShowStickyBar] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show sticky bar when scrolled past the hero section (approx 500px)
      if (window.scrollY > 500) {
        setShowStickyBar(true);
      } else {
        setShowStickyBar(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      {/* Main Hero Buttons */}
      <div className="flex flex-wrap items-center justify-start gap-2 sm:gap-3">
        {watchUrl && isStreaming ? (
          <a href={watchUrl} target="_blank" rel="noopener noreferrer" className="px-5 py-2.5 rounded-full bg-orange-500 hover:bg-orange-600 text-white font-bold transition-all flex items-center gap-2 text-sm md:text-base shadow-lg shadow-orange-500/20 hover:scale-105">
            <Play className="w-4 h-4 md:w-5 md:h-5 fill-current" />
            Watch on {platformName}
          </a>
        ) : (
          <button disabled className="px-5 py-2.5 rounded-full bg-white/10 text-gray-400 font-bold flex items-center gap-2 text-sm md:text-base cursor-not-allowed">
            <Calendar className="w-4 h-4 md:w-5 md:h-5" />
            {isStreaming ? "Currently Unavailable" : "Coming Soon"}
          </button>
        )}
        
        {trailerId && (
          <Link 
            href={`/trailers/${movieSlug}`}
            className="px-5 py-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold transition-all flex items-center gap-2 text-sm md:text-base hover:scale-105"
          >
            <Film className="w-4 h-4 md:w-5 md:h-5" />
            Watch Trailer
          </Link>
        )}

        <Link href={`/movie/${movieSlug}`} className="px-5 py-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold transition-all flex items-center gap-2 text-sm md:text-base hover:scale-105">
          <Film className="w-4 h-4 md:w-5 md:h-5" />
          Full Movie Details
        </Link>
      </div>

      {/* Sticky Bottom Watch Bar */}
      <div 
        className={`fixed bottom-0 left-0 right-0 z-40 bg-[#0a0a0a]/90 backdrop-blur-xl border-t border-white/10 shadow-2xl transition-transform duration-500 transform ${showStickyBar ? "translate-y-0" : "translate-y-full"}`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
          <div className="hidden sm:flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/10 flex-shrink-0 p-1 bg-white overflow-hidden shadow-lg shadow-black">
              {pInfo ? (
                <PlatformLogo 
                  name={pInfo.name} 
                  domain={pInfo.domain} 
                  slug={pInfo.slug} 
                  color={pInfo.color} 
                  className="w-full h-full object-contain" 
                />
              ) : (
                <MonitorPlay className="w-5 h-5 text-gray-400" />
              )}
            </div>
            <div>
              <p className="text-white font-bold leading-tight line-clamp-1">{movieTitle}</p>
              <p className="text-gray-400 text-xs">Available on {platformName}</p>
            </div>
          </div>

          <div className="flex-1 sm:flex-none flex justify-end gap-3">
            {trailerId && (
              <Link 
                href={`/trailers/${movieSlug}`}
                className="px-4 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-sm font-semibold transition-colors flex items-center gap-2"
              >
                <Film className="w-4 h-4" />
                <span className="hidden sm:inline">Trailer</span>
              </Link>
            )}
            
            {watchUrl && isStreaming ? (
              <a href={watchUrl} target="_blank" rel="noopener noreferrer" className="flex-1 sm:flex-none px-6 py-2.5 rounded-full bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-lg">
                <Play className="w-4 h-4 fill-current" />
                Watch Now
              </a>
            ) : (
              <button disabled className="flex-1 sm:flex-none px-6 py-2.5 rounded-full bg-white/10 text-gray-400 text-sm font-bold cursor-not-allowed">
                Coming Soon
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
