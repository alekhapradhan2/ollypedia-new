"use client";
import { useState } from "react";
import { Star } from "lucide-react";
import toast from "react-hot-toast";

interface ReviewFormProps {
  movieId: string;
  onSuccess?: (review: any) => void;
}

export function ReviewForm({ movieId, onSuccess }: ReviewFormProps) {
  const [user,    setUser]    = useState("");
  const [rating,  setRating]  = useState(0);
  const [hovered, setHovered] = useState(0);
  const [text,    setText]    = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) { toast.error("Please select a rating"); return; }
    if (!text.trim()) { toast.error("Please write your review"); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/movies/${movieId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: user || "Anonymous", rating, text }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      toast.success("Review submitted!");
      setRating(0); setText(""); setUser("");
      onSuccess?.(data.review);
    } catch {
      toast.error("Could not submit. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="bg-[#181818] border border-[#2a2a2a] rounded-xl p-5 space-y-4">
      <h3 className="font-display font-bold text-white text-lg">Write a Review</h3>

      <div>
        <label className="text-sm text-gray-400 mb-2 block">Your Name (optional)</label>
        <input
          type="text"
          value={user}
          onChange={(e) => setUser(e.target.value)}
          placeholder="Anonymous"
          className="w-full px-3 py-2 bg-[#111] border border-[#2a2a2a] rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/50"
        />
      </div>

      <div>
        <label className="text-sm text-gray-400 mb-2 block">Rating (out of 10)</label>
        <div className="flex items-center gap-1">
          {Array.from({ length: 10 }).map((_, i) => {
            const val = i + 1;
            return (
              <button
                key={val}
                type="button"
                onMouseEnter={() => setHovered(val)}
                onMouseLeave={() => setHovered(0)}
                onClick={() => setRating(val)}
                className="p-0.5"
              >
                <Star
                  className={`w-5 h-5 transition-colors ${
                    val <= (hovered || rating) ? "fill-yellow-400 text-yellow-400" : "fill-gray-700 text-gray-700"
                  }`}
                />
              </button>
            );
          })}
          {rating > 0 && <span className="ml-2 text-sm text-yellow-400 font-bold">{rating}/10</span>}
        </div>
      </div>

      <div>
        <label className="text-sm text-gray-400 mb-2 block">Your Review</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          placeholder="Share your thoughts about this movie..."
          className="w-full px-3 py-2.5 bg-[#111] border border-[#2a2a2a] rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/50 resize-none"
          required
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="btn-primary w-full justify-center flex items-center gap-2 disabled:opacity-50"
      >
        {loading ? "Submitting…" : "Submit Review"}
      </button>
    </form>
  );
}
