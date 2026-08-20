"use client";

import React, { useState } from "react";
import { useCommunityAuth } from "@/context/CommunityAuthContext";
import { PlusCircle, Send, Sparkles, LogIn } from "lucide-react";
import { SpoilerToggle } from "@/components/community/SpoilerToggle";
import toast from "react-hot-toast";

interface CreateThreadBoxProps {
  movieId?: string;
  movieSlug: string;
  movieTitle?: string;
  onThreadCreated?: (thread: any) => void;
}

export function CreateThreadBox({
  movieId,
  movieSlug,
  movieTitle = "this movie",
  onThreadCreated,
}: CreateThreadBoxProps) {
  const { user, openAuthModal } = useCommunityAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [hasSpoiler, setHasSpoiler] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      openAuthModal("login");
      return;
    }

    if (!title.trim() || !content.trim()) {
      toast.error("Please enter both a title and discussion content.");
      return;
    }

    if (title.length < 5) {
      toast.error("Title must be at least 5 characters long.");
      return;
    }

    if (content.length < 10) {
      toast.error("Content must be at least 10 characters long.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/community/movies/${movieSlug}/threads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content,
          hasSpoiler,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.message || "Failed to create thread.");
        return;
      }

      toast.success(data.message || "Discussion started successfully!");
      setTitle("");
      setContent("");
      setHasSpoiler(false);
      setIsOpen(false);
      if (onThreadCreated && data.thread) {
        onThreadCreated(data.thread);
      }
    } catch (err: any) {
      toast.error(err.message || "Network error.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) {
    return (
      <div className="bg-[#141414] border border-white/10 rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center font-bold">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">
              Have thoughts on {movieTitle}?
            </h3>
            <p className="text-xs text-zinc-400">
              Start a new discussion thread, ask a question, or share your analysis.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            if (!user) {
              openAuthModal("login");
            } else {
              setIsOpen(true);
            }
          }}
          className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-black font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-orange-500/20 transition-all active:scale-95 flex items-center justify-center gap-2 shrink-0"
        >
          {user ? (
            <>
              <PlusCircle className="w-4 h-4" />
              Start Discussion
            </>
          ) : (
            <>
              <LogIn className="w-4 h-4" />
              Login to Start Discussion
            </>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="bg-[#141414] border border-orange-500/40 rounded-3xl p-6 shadow-2xl animate-in fade-in duration-200">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <PlusCircle className="w-4 h-4 text-orange-400" />
          Start a New Discussion on {movieTitle}
        </h3>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="text-xs text-zinc-400 hover:text-white"
        >
          Cancel
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
            Discussion Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. What did you think about the climax twist?"
            required
            maxLength={150}
            className="w-full px-4 py-2.5 bg-[#1a1a1a] border border-white/10 rounded-xl text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
            Discussion Content
          </label>
          <textarea
            rows={4}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your analysis, questions, or review details for the community..."
            required
            maxLength={5000}
            className="w-full px-4 py-2.5 bg-[#1a1a1a] border border-white/10 rounded-xl text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 leading-relaxed"
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          {/* Spoiler toggle */}
          <SpoilerToggle
            checked={hasSpoiler}
            onChange={setHasSpoiler}
            label="Mark as Spoiler"
            activeLabel="Contains Spoilers (Blur Protected)"
          />

          <div className="flex items-center gap-2 justify-end">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white bg-white/5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-black font-extrabold text-xs uppercase tracking-wider shadow-md shadow-orange-500/20 active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
            >
              {submitting ? (
                "Publishing..."
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  Post Discussion
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
