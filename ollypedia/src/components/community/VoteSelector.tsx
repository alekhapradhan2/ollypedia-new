"use client";

import React, { useState, useEffect } from "react";
import { useCommunityAuth } from "@/context/CommunityAuthContext";
import { Sparkles, CheckCircle2, Lock, Loader2, Check } from "lucide-react";
import toast from "react-hot-toast";

interface VoteSelectorProps {
  movieSlug: string;
  movieTitle: string;
  currentVote?: string | null;
  onVoteUpdated?: (updatedMeter: any) => void;
  onVoteSuccess?: (updatedMeter: any) => void;
}

const VOTE_OPTIONS = [
  {
    key: "skip",
    label: "Skip",
    emoji: "🩷",
    description: "Not worth your time",
    color: "#f43f5e",
    borderClass: "border-rose-500/30 hover:border-rose-500",
    bgClass: "hover:bg-rose-500/10",
    activeClass: "bg-rose-500/25 border-rose-500 ring-2 ring-rose-500 shadow-[0_0_25px_rgba(244,63,94,0.3)]",
  },
  {
    key: "timepass",
    label: "Timepass",
    emoji: "🟡",
    description: "Decent one-time watch",
    color: "#eab308",
    borderClass: "border-yellow-500/30 hover:border-yellow-500",
    bgClass: "hover:bg-yellow-500/10",
    activeClass: "bg-yellow-500/25 border-yellow-500 ring-2 ring-yellow-500 shadow-[0_0_25px_rgba(234,179,8,0.3)]",
  },
  {
    key: "go_for_it",
    label: "Go for it",
    emoji: "🟢",
    description: "Highly recommended",
    color: "#10b981",
    borderClass: "border-emerald-500/30 hover:border-emerald-500",
    bgClass: "hover:bg-emerald-500/10",
    activeClass: "bg-emerald-500/25 border-emerald-500 ring-2 ring-emerald-500 shadow-[0_0_25px_rgba(16,185,129,0.3)]",
  },
  {
    key: "perfection",
    label: "Perfection",
    emoji: "🟣",
    description: "Masterpiece cinema",
    color: "#a855f7",
    borderClass: "border-purple-500/30 hover:border-purple-500",
    bgClass: "hover:bg-purple-500/10",
    activeClass: "bg-purple-500/25 border-purple-500 ring-2 ring-purple-500 shadow-[0_0_25px_rgba(168,85,247,0.3)]",
  },
];

export function VoteSelector({
  movieSlug,
  movieTitle,
  currentVote,
  onVoteUpdated,
  onVoteSuccess,
}: VoteSelectorProps) {
  const { user, openAuthModal } = useCommunityAuth();
  const [selectedVote, setSelectedVote] = useState<string | null>(
    currentVote || null
  );
  const [loadingVoteKey, setLoadingVoteKey] = useState<string | null>(null);

  useEffect(() => {
    if (currentVote !== undefined) {
      setSelectedVote(currentVote);
    }
  }, [currentVote]);

  const handleVoteClick = async (voteType: string) => {
    if (!user) {
      toast("Please sign in to vote on the Ollypedia Meter.", {
        icon: "🔒",
      });
      openAuthModal("login");
      return;
    }

    if (loadingVoteKey) return;
    
    // Optimistic UI update
    const previousVote = selectedVote;
    setSelectedVote(voteType);
    setLoadingVoteKey(voteType);

    try {
      const res = await fetch(`/api/community/movies/${movieSlug}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voteType }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        // Revert on error
        setSelectedVote(previousVote);
        if (data.requiresAuth) {
          openAuthModal("login");
        }
        toast.error(data.message || "Failed to submit vote.");
        return;
      }

      setSelectedVote(voteType);
      const chosenOpt = VOTE_OPTIONS.find((o) => o.key === voteType);
      toast.success(data.message || `You voted ${chosenOpt?.emoji} ${chosenOpt?.label}!`, {
        icon: chosenOpt?.emoji || "✨",
      });

      if (onVoteUpdated && data.meter) {
        onVoteUpdated(data.meter);
      }
      if (onVoteSuccess && data.meter) {
        onVoteSuccess(data.meter);
      }
    } catch (err: any) {
      setSelectedVote(previousVote);
      toast.error(err.message || "Error casting vote.");
    } finally {
      setLoadingVoteKey(null);
    }
  };

  const selectedOpt = VOTE_OPTIONS.find((o) => o.key === selectedVote);

  return (
    <div id="tour-vote" className="bg-[#141414] border border-white/10 rounded-3xl p-4 sm:p-6 lg:p-7 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-orange-400" />
            How would you rate {movieTitle}?
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            {user
              ? "Vote in the Ollypedia Meter. Click any card to select or change your rating."
              : "Login to submit your verdict & shape the community percentage."}
          </p>
        </div>

        {user && selectedOpt && (
          <div 
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all animate-in fade-in zoom-in-95 duration-200"
            style={{ 
              backgroundColor: `${selectedOpt.color}15`, 
              borderColor: `${selectedOpt.color}40`,
              color: selectedOpt.color
            }}
          >
            <span className="text-sm">{selectedOpt.emoji}</span>
            <span>Your rating: <strong>{selectedOpt.label}</strong></span>
            <Check className="w-3.5 h-3.5" />
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {VOTE_OPTIONS.map((opt) => {
          const isSelected = selectedVote === opt.key;
          const isLoading = loadingVoteKey === opt.key;

          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => handleVoteClick(opt.key)}
              disabled={!!loadingVoteKey}
              style={isSelected ? { borderColor: opt.color } : undefined}
              className={`relative flex flex-col items-center justify-center text-center p-4 sm:p-5 rounded-2xl border-2 transition-all duration-200 group cursor-pointer active:scale-95 select-none ${
                isSelected
                  ? `${opt.activeClass} scale-[1.02]`
                  : `bg-[#1a1a1a] ${opt.borderClass} ${opt.bgClass} opacity-85 hover:opacity-100 hover:scale-[1.02]`
              }`}
            >
              {/* Spinner when loading this specific button */}
              {isLoading ? (
                <div className="w-8 h-8 sm:w-9 sm:h-9 mb-1.5 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin" style={{ color: opt.color }} />
                </div>
              ) : (
                <span className={`text-2xl sm:text-3xl mb-1.5 transition-transform duration-200 ${isSelected ? "scale-125" : "group-hover:scale-110"}`}>
                  {opt.emoji}
                </span>
              )}

              <span className="text-sm font-black text-white tracking-tight">
                {opt.label}
              </span>

              <span className="text-[10px] text-zinc-400 mt-0.5 line-clamp-1">
                {opt.description}
              </span>

              {/* Prominent selected badge inside card */}
              {isSelected && (
                <div 
                  className="mt-2.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm"
                  style={{ backgroundColor: opt.color, color: "#000000" }}
                >
                  <Check className="w-3 h-3 stroke-[3]" />
                  <span>Voted</span>
                </div>
              )}

              {/* Corner Checkmark Badge */}
              {isSelected && (
                <div 
                  className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full flex items-center justify-center shadow-md animate-in zoom-in-50 duration-200"
                  style={{ backgroundColor: opt.color, color: "#000" }}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 fill-black text-white" />
                </div>
              )}

              {/* Lock Icon if not logged in */}
              {!user && (
                <div className="absolute top-2.5 right-2.5 p-1 rounded-md bg-black/40 text-zinc-400 group-hover:text-white transition-colors">
                  <Lock className="w-3 h-3" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
