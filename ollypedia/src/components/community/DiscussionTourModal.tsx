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
  HelpCircle,
} from "lucide-react";
import { useCommunityAuth } from "@/context/CommunityAuthContext";

const TOUR_STEPS = [
  {
    step: 1,
    badge: "Audience Meter",
    icon: Sparkles,
    color: "from-purple-500 to-indigo-500",
    textColor: "text-purple-400",
    borderColor: "border-purple-500/30",
    bgAccent: "bg-purple-500/10",
    title: "Shape the Ollypedia Meter",
    description:
      "Rate any Odia film using 4 intuitive sentiments. Your vote instantly influences the official live community percentage!",
    details: [
      { emoji: "🩷", label: "Skip", desc: "Not recommended" },
      { emoji: "🟡", label: "Timepass", desc: "One-time casual watch" },
      { emoji: "🟢", label: "Go for it", desc: "Solid entertainer" },
      { emoji: "🟣", label: "Perfection", desc: "Masterpiece cinema" },
    ],
  },
  {
    step: 2,
    badge: "Live Discussion",
    icon: MessageSquare,
    color: "from-orange-500 to-amber-500",
    textColor: "text-orange-400",
    borderColor: "border-orange-500/30",
    bgAccent: "bg-orange-500/10",
    title: "Direct Comments & Dedicated Topics",
    description:
      "Every movie has its own live room. Drop a quick reaction or launch an in-depth topic with full YouTube-style replies.",
    details: [
      { emoji: "💬", label: "Quick Comments", desc: "Leave a 1-line review without creating a thread" },
      { emoji: "🧵", label: "Discussion Threads", desc: "Start dedicated debates, theories, or questions" },
      { emoji: "❤️", label: "Like & Reply", desc: "Interact directly with verified community fans" },
    ],
  },
  {
    step: 3,
    badge: "Spoiler Protection",
    icon: AlertTriangle,
    color: "from-amber-500 to-yellow-500",
    textColor: "text-amber-400",
    borderColor: "border-amber-500/30",
    bgAccent: "bg-amber-500/10",
    title: "Keep the Experience Fresh",
    description:
      "Protect movie endings and twists for fellow viewers with our 1-click spoiler masking toggle.",
    details: [
      { emoji: "🔒", label: "1-Click Blur", desc: "Toggle 'Mark as Spoiler' on any comment or thread" },
      { emoji: "👁️", label: "Safe Reveal", desc: "Spoilers remain hidden until a user chooses to reveal" },
      { emoji: "🛡️", label: "Fair Community", desc: "Report inappropriate content to our moderation team" },
    ],
  },
  {
    step: 4,
    badge: "Fan Identity",
    icon: Trophy,
    color: "from-emerald-500 to-teal-500",
    textColor: "text-emerald-400",
    borderColor: "border-emerald-500/30",
    bgAccent: "bg-emerald-500/10",
    title: "Earn Reputation & Showcase Your Taste",
    description:
      "Your contributions earn you community karma points, verified badges, and a custom public fan profile.",
    details: [
      { emoji: "⭐", label: "Karma Points", desc: "Earn points for helpful reviews and discussions" },
      { emoji: "🎬", label: "Vote History", desc: "Track all your movie verdicts in one personal dashboard" },
      { emoji: "👑", label: "Fan Profile", desc: "Share your @username profile with other Odia cinema lovers" },
    ],
  },
];

export function DiscussionTourModal() {
  const { isTourOpen, closeTour } = useCommunityAuth();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  if (!isTourOpen) return null;

  const current = TOUR_STEPS[currentStepIndex];
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
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg bg-[#141414] border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-orange-500/10 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close & Skip Button */}
        <button
          type="button"
          onClick={closeTour}
          className="absolute top-5 right-5 p-2 text-zinc-400 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-colors"
          aria-label="Close tour"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Progress & Badge */}
        <div className="flex items-center justify-between gap-2 mb-6 pr-8">
          <span
            className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border ${current.bgAccent} ${current.borderColor} ${current.textColor} flex items-center gap-1.5`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{current.badge}</span>
          </span>

          <span className="text-xs font-bold text-zinc-500">
            Step {current.step} of {TOUR_STEPS.length}
          </span>
        </div>

        {/* Header Icon + Title */}
        <div className="mb-5">
          <div
            className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${current.color} p-0.5 mb-4 shadow-lg flex items-center justify-center`}
          >
            <div className="w-full h-full bg-[#161616] rounded-[14px] flex items-center justify-center">
              <Icon className={`w-7 h-7 ${current.textColor}`} />
            </div>
          </div>

          <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            {current.title}
          </h3>
          <p className="text-xs sm:text-sm text-zinc-400 mt-2 leading-relaxed">
            {current.description}
          </p>
        </div>

        {/* Interactive Feature Highlights */}
        <div className="space-y-2.5 mb-8">
          {current.details.map((item, idx) => (
            <div
              key={idx}
              className="flex items-start gap-3 p-3 rounded-2xl bg-[#1c1c1c] border border-white/5"
            >
              <span className="text-xl flex-shrink-0 mt-0.5">{item.emoji}</span>
              <div>
                <h4 className="text-xs font-bold text-white">{item.label}</h4>
                <p className="text-[11px] text-zinc-400 mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Step Indicators Dots */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {TOUR_STEPS.map((s, idx) => (
            <button
              key={s.step}
              type="button"
              onClick={() => setCurrentStepIndex(idx)}
              className={`h-2 rounded-full transition-all duration-300 ${
                idx === currentStepIndex
                  ? "w-8 bg-orange-500"
                  : "w-2 bg-zinc-700 hover:bg-zinc-500"
              }`}
              aria-label={`Go to step ${s.step}`}
            />
          ))}
        </div>

        {/* Footer Navigation Buttons */}
        <div className="flex items-center justify-between gap-3 pt-4 border-t border-white/10">
          {!isFirst ? (
            <button
              type="button"
              onClick={handlePrev}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-zinc-300 hover:text-white transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={closeTour}
              className="text-xs font-semibold text-zinc-500 hover:text-zinc-300 transition-colors px-2 py-1"
            >
              Skip Tour
            </button>
          )}

          <button
            type="button"
            onClick={handleNext}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-black font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-orange-500/20 active:scale-95 transition-all ml-auto"
          >
            <span>{isLast ? "Get Started" : "Next"}</span>
            {isLast ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default DiscussionTourModal;
