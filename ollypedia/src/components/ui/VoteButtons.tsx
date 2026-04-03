"use client";
import { useState } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import toast from "react-hot-toast";

interface VoteButtonsProps {
  movieId: string;
  initialYes: number;
  initialNo: number;
}

export function VoteButtons({ movieId, initialYes, initialNo }: VoteButtonsProps) {
  const [yes, setYes] = useState(initialYes);
  const [no,  setNo]  = useState(initialNo);
  const [voted, setVoted] = useState<"yes" | "no" | null>(null);
  const [loading, setLoading] = useState(false);

  async function vote(type: "yes" | "no") {
    if (voted || loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/vote/${movieId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      if (!res.ok) throw new Error("Vote failed");
      if (type === "yes") setYes((v) => v + 1);
      else setNo((v) => v + 1);
      setVoted(type);
      toast.success(type === "yes" ? "Marked as Interested!" : "Thanks for your vote!");
    } catch {
      toast.error("Could not record vote. Try again.");
    } finally {
      setLoading(false);
    }
  }

  const total = yes + no;
  const yesPercent = total ? Math.round((yes / total) * 100) : 50;

  return (
    <div className="bg-[#181818] border border-[#2a2a2a] rounded-xl p-4">
      <p className="text-sm text-gray-400 mb-3 text-center font-medium">Are you interested in this movie?</p>
      <div className="flex gap-3">
        <button
          onClick={() => vote("yes")}
          disabled={!!voted || loading}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            voted === "yes"
              ? "bg-green-500/20 border border-green-500/40 text-green-400"
              : "bg-[#222] border border-[#333] text-gray-300 hover:border-green-500/40 hover:text-green-400 disabled:opacity-50"
          }`}
        >
          <ThumbsUp className="w-4 h-4" /> Yes ({yes})
        </button>
        <button
          onClick={() => vote("no")}
          disabled={!!voted || loading}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            voted === "no"
              ? "bg-red-500/20 border border-red-500/40 text-red-400"
              : "bg-[#222] border border-[#333] text-gray-300 hover:border-red-500/40 hover:text-red-400 disabled:opacity-50"
          }`}
        >
          <ThumbsDown className="w-4 h-4" /> No ({no})
        </button>
      </div>
      {total > 0 && (
        <div className="mt-3">
          <div className="h-1.5 bg-[#2a2a2a] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all duration-500"
              style={{ width: `${yesPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>{yesPercent}% interested</span>
            <span>{total} votes</span>
          </div>
        </div>
      )}
    </div>
  );
}
