"use client";

import React, { useState } from "react";
import {
  X,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Flame,
  MessageSquare,
  AlertTriangle,
  Trophy,
  CheckCircle2,
  Users,
  ThumbsUp,
} from "lucide-react";
import { useCommunityAuth } from "@/context/CommunityAuthContext";

const TOUR_STEPS = [
  {
    step: 1,
    badge: "1. Released Movies: Live Meter",
    icon: Sparkles,
    color: "from-purple-500 to-indigo-500",
    textColor: "text-purple-400",
    borderColor: "border-purple-500/30",
    bgAccent: "bg-purple-500/10",
    title: "Ollypedia Meter on Released Films",
    description:
      "For movies currently in theatres or OTT, rate them using 4 authentic sentiments to shape the live audience percentage:",
    details: [
      { emoji: "🩷", label: "Skip", desc: "Not recommended / Skip watching" },
      { emoji: "🟡", label: "Timepass", desc: "One-time casual entertainer" },
      { emoji: "🟢", label: "Go for it", desc: "Solid, highly recommended film" },
      { emoji: "🟣", label: "Perfection", desc: "Must-watch masterpiece cinema" },
    ],
  },
  {
    step: 2,
    badge: "2. Upcoming Movies: Fan Buzz",
    icon: Users,
    color: "from-orange-500 to-amber-500",
    textColor: "text-orange-400",
    borderColor: "border-orange-500/30",
    bgAccent: "bg-orange-500/10",
    title: "Express Interest for Unreleased Movies",
    description:
      "Upcoming films do not show the Ollypedia Meter until release. Instead, you can express anticipation and build pre-release hype:",
    details: [
      { emoji: "👍", label: "Are You Interested?", desc: "Vote 'Interested' or 'Not Interested' to measure fan buzz" },
      { emoji: "🎬", label: "Pre-Release Buzz", desc: "Discuss teasers, trailers, song releases & box office predictions" },
      { emoji: "🔔", label: "Meter Unlocks On Release", desc: "Full 4-tier audience meter rating activates once in theatres" },
    ],
  },
  {
    step: 3,
    badge: "3. Live Discussion Rooms",
    icon: MessageSquare,
    color: "from-emerald-500 to-teal-500",
    textColor: "text-emerald-400",
    borderColor: "border-emerald-500/30",
    bgAccent: "bg-emerald-500/10",
    title: "Direct Comments & Discussion Topics",
    description:
      "Every Odia movie features its own dedicated live hub. Share quick opinions or deep dive into specific topics:",
    details: [
      { emoji: "💬", label: "Quick Movie Chat", desc: "Post rapid reviews & scene reactions without making a topic" },
      { emoji: "🧵", label: "Discussion Threads", desc: "Create dedicated debates, cast reviews, and theories" },
      { emoji: "❤️", label: "Nested Replies & Likes", desc: "Interact directly with verified Odia cinema enthusiasts" },
    ],
  },
  {
    step: 4,
    badge: "4. Spoiler Shield & Reputation",
    icon: AlertTriangle,
    color: "from-amber-500 to-yellow-500",
    textColor: "text-amber-400",
    borderColor: "border-amber-500/30",
    bgAccent: "bg-amber-500/10",
    title: "Protect Twists & Earn Karma",
    description:
      "Maintain a safe, respectful community while earning verified fan recognition and public profile stats:",
    details: [
      { emoji: "🔒", label: "1-Click Spoiler Blur", desc: "Automatically mask comment text to protect climax twists" },
      { emoji: "⭐", label: "Karma & Verified Badges", desc: "Gain reputation for active, helpful contributions" },
      { emoji: "👑", label: "Public Fan Profile", desc: "Track all your movie verdicts on your custom @username page" },
    ],
  },
];

export function DiscussionTourModal() {
  const { isTourOpen, closeTour } = useCommunityAuth();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  if (!isTourOpen) return null;

  const current = TOUR_STEPS[currentStepIndex] || TOUR_STEPS[0];
  const isLast = currentStepIndex === TOUR_STEPS.length - 1;
  const isFirst = currentStepIndex === 0;
  const Icon = current.icon;

  const handleNext = () => {
    if (isLast) {
      closeTour();
    } else {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirst) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg bg-[#141414] border border-white/15 rounded-3xl p-5 sm:p-7 shadow-2xl shadow-orange-500/10 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close & Skip Button */}
        <button
          type="button"
          onClick={closeTour}
          className="absolute top-4 right-4 sm:top-5 sm:right-5 p-2 text-zinc-400 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-colors"
          aria-label="Close guide"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Progress & Badge */}
        <div className="flex items-center justify-between gap-2 mb-4 sm:mb-5 pr-8">
          <span
            className={`px-3 py-1 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider border ${current.bgAccent} ${current.borderColor} ${current.textColor} flex items-center gap-1.5`}
          >
            <Icon className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{current.badge}</span>
          </span>

          <span className="text-[11px] sm:text-xs font-bold text-zinc-500 flex-shrink-0">
            Step {current.step} of {TOUR_STEPS.length}
          </span>
        </div>

        {/* Header Icon + Title */}
        <div className="mb-4 sm:mb-5">
          <div
            className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br ${current.color} p-0.5 mb-3 sm:mb-4 shadow-lg flex items-center justify-center`}
          >
            <div className="w-full h-full bg-[#161616] rounded-[14px] flex items-center justify-center">
              <Icon className={`w-6 h-6 sm:w-7 sm:h-7 ${current.textColor}`} />
            </div>
          </div>

          <h3 className="text-lg sm:text-2xl font-black text-white tracking-tight leading-snug">
            {current.title}
          </h3>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1.5 sm:mt-2 leading-relaxed">
            {current.description}
          </p>
        </div>

        {/* Interactive Feature Highlights */}
        <div className="space-y-2 sm:space-y-2.5 mb-6 sm:mb-7">
          {current.details.map((item, idx) => (
            <div
              key={idx}
              className="flex items-start gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-2xl bg-[#1c1c1c] border border-white/5"
            >
              <span className="text-lg sm:text-xl flex-shrink-0 mt-0.5">{item.emoji}</span>
              <div className="min-w-0">
                <h4 className="text-xs sm:text-sm font-bold text-white leading-tight">{item.label}</h4>
                <p className="text-[11px] sm:text-xs text-zinc-400 mt-0.5 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Step Indicators Dots */}
        <div className="flex items-center justify-center gap-1.5 sm:gap-2 mb-5 sm:mb-6">
          {TOUR_STEPS.map((s, idx) => (
            <button
              key={s.step}
              type="button"
              onClick={() => setCurrentStepIndex(idx)}
              className={`h-1.5 sm:h-2 rounded-full transition-all duration-300 ${
                idx === currentStepIndex
                  ? "w-6 sm:w-8 bg-orange-500"
                  : "w-1.5 sm:w-2 bg-zinc-700 hover:bg-zinc-500"
              }`}
              aria-label={`Go to step ${s.step}`}
            />
          ))}
        </div>

        {/* Footer Navigation Buttons */}
        <div className="flex items-center justify-between gap-2.5 sm:gap-3 pt-3 sm:pt-4 border-t border-white/10">
          {!isFirst ? (
            <button
              type="button"
              onClick={handlePrev}
              className="inline-flex items-center gap-1 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-zinc-300 hover:text-white transition-all active:scale-95"
            >
              <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Back</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={closeTour}
              className="text-xs font-semibold text-zinc-500 hover:text-zinc-300 transition-colors px-2 py-1"
            >
              Skip
            </button>
          )}

          <button
            type="button"
            onClick={handleNext}
            className="inline-flex items-center gap-1.5 sm:gap-2 px-5 sm:px-6 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-black font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-orange-500/20 active:scale-95 transition-all ml-auto"
          >
            <span>{isLast ? "Got It!" : "Next"}</span>
            {isLast ? (
              <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default DiscussionTourModal;
