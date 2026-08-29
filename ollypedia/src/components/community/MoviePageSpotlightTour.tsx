"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  X,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Flame,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  Users,
  ThumbsUp,
} from "lucide-react";
import { useCommunityAuth } from "@/context/CommunityAuthContext";

export interface StepConfig {
  targetId: string;
  title: string;
  description: string;
  badge: string;
  icon: any;
  placement: "bottom" | "top" | "center";
}

const SPOTLIGHT_RELEASED_STEPS: StepConfig[] = [
  {
    targetId: "tour-meter",
    badge: "1. Live Audience Meter",
    icon: Sparkles,
    title: "Real-Time Movie Sentiment",
    description:
      "This live meter calculates the community approval percentage from verified Odia moviegoer ratings.",
    placement: "bottom",
  },
  {
    targetId: "tour-vote",
    badge: "2. Cast Your Verdict",
    icon: Flame,
    title: "Rate with 4 Sentiments",
    description:
      "Select Skip 🩷, Timepass 🟡, Go for it 🟢, or Perfection 🟣. Your vote instantly influences the meter percentage.",
    placement: "bottom",
  },
  {
    targetId: "tour-comments-box",
    badge: "3. Direct Movie Chat",
    icon: MessageSquare,
    title: "Leave Reviews & Opinions",
    description:
      "Drop a quick reaction or review directly on this movie without creating a thread. Supports YouTube-style nested replies!",
    placement: "top",
  },
  {
    targetId: "tour-spoiler",
    badge: "4. Spoiler Shield",
    icon: AlertTriangle,
    title: "Protect Movie Endings",
    description:
      "Enable this toggle to blur your comment text so fellow moviegoers can safely browse without unwanted plot spoilers.",
    placement: "top",
  },
];

const SPOTLIGHT_UPCOMING_STEPS: StepConfig[] = [
  {
    targetId: "tour-interested",
    badge: "1. Pre-Release Buzz",
    icon: Users,
    title: "Express Your Interest",
    description:
      "For upcoming movies, the Ollypedia Meter unlocks on release day. Cast your 'Interested 👍' vote now to build pre-release hype!",
    placement: "bottom",
  },
  {
    targetId: "tour-comments-box",
    badge: "2. Pre-Release Discussion",
    icon: MessageSquare,
    title: "Trailers, Songs & Theories",
    description:
      "Share your thoughts on posters, teasers, cast announcements, and box office expectations before the film hits theatres.",
    placement: "top",
  },
  {
    targetId: "tour-spoiler",
    badge: "3. Leak & Rumor Shield",
    icon: AlertTriangle,
    title: "Protect Story Surprises",
    description:
      "Toggle 'Mark as Spoiler' whenever discussing leaked plot details, cameo rumors, or storyline twists.",
    placement: "top",
  },
];

interface MoviePageSpotlightTourProps {
  isUpcoming?: boolean;
}

export function MoviePageSpotlightTour({ isUpcoming = false }: MoviePageSpotlightTourProps) {
  const { isTourOpen, closeTour } = useCommunityAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [windowSize, setWindowSize] = useState<{ width: number; height: number }>({
    width: typeof window !== "undefined" ? window.innerWidth : 1200,
    height: typeof window !== "undefined" ? window.innerHeight : 800,
  });

  const steps = isUpcoming ? SPOTLIGHT_UPCOMING_STEPS : SPOTLIGHT_RELEASED_STEPS;
  const step = steps[currentStep] || steps[0];
  const isFirst = currentStep === 0;
  const isLast = currentStep === steps.length - 1;

  // Reset to first step whenever the tour is opened by the user
  useEffect(() => {
    if (isTourOpen) {
      setCurrentStep(0);
    }
  }, [isTourOpen]);

  const handleClose = useCallback(() => {
    closeTour();
    setCurrentStep(0);
  }, [closeTour]);

  // Measure and scroll target into view
  const updateTargetPosition = useCallback(() => {
    if (!isTourOpen || !step) return;

    if (typeof window !== "undefined") {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    }

    const el = document.getElementById(step.targetId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      const timer = setTimeout(() => {
        const rect = el.getBoundingClientRect();
        setTargetRect(rect);
      }, 350);
      return () => clearTimeout(timer);
    } else {
      setTargetRect(null);
    }
  }, [isTourOpen, step]);

  useEffect(() => {
    if (isTourOpen) {
      const cleanup = updateTargetPosition();
      const handleResize = () => updateTargetPosition();
      window.addEventListener("resize", handleResize);
      window.addEventListener("scroll", handleResize);
      return () => {
        if (cleanup) cleanup();
        window.removeEventListener("resize", handleResize);
        window.removeEventListener("scroll", handleResize);
      };
    }
  }, [isTourOpen, currentStep, updateTargetPosition]);

  if (!isTourOpen || !step) return null;

  const Icon = step.icon;

  const handleNext = () => {
    if (isLast) {
      handleClose();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirst) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const isMobile = windowSize.width < 768;

  // Calculate safe desktop tooltip coordinates
  let desktopStyle: React.CSSProperties = {};
  if (!isMobile && targetRect) {
    const cardWidth = 380;
    const cardHeight = 240;

    let left = Math.max(16, Math.min(windowSize.width - cardWidth - 16, targetRect.left));
    let top = 0;

    if (step.placement === "bottom") {
      top = targetRect.bottom + 16;
      if (top + cardHeight > windowSize.height - 16) {
        top = Math.max(16, targetRect.top - cardHeight - 16);
      }
    } else {
      top = targetRect.top - cardHeight - 16;
      if (top < 16) {
        top = Math.min(windowSize.height - cardHeight - 16, targetRect.bottom + 16);
      }
    }

    desktopStyle = {
      top: `${top}px`,
      left: `${left}px`,
    };
  }

  // Clamped spotlight dimensions for ultra-small screens
  const spotlightTop = targetRect ? Math.max(0, targetRect.top - 6) : 0;
  const spotlightLeft = targetRect ? Math.max(2, targetRect.left - 6) : 0;
  const spotlightWidth = targetRect
    ? Math.min(windowSize.width - 4, targetRect.width + 12)
    : 0;
  const spotlightHeight = targetRect ? targetRect.height + 12 : 0;

  return (
    <div className="fixed inset-0 z-[200] pointer-events-auto">
      {/* Background overlay with click to dismiss when no element is focused */}
      <div
        className={`absolute inset-0 bg-black/75 transition-opacity duration-300 ${
          targetRect ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
        onClick={handleClose}
      />

      {/* Target Element Spotlight Cutout (Crystal-Clear Target, Dimmed Background) */}
      {targetRect && (
        <div
          style={{
            top: spotlightTop,
            left: spotlightLeft,
            width: spotlightWidth,
            height: spotlightHeight,
            boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.8), 0 0 25px rgba(249, 115, 22, 0.7)",
          }}
          className="fixed rounded-2xl border-2 border-orange-500 pointer-events-none transition-all duration-300 z-[201]"
        >
          {/* Beacon pin */}
          <div className="absolute -top-3 -right-3 w-6 h-6 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-black flex items-center justify-center font-black text-xs shadow-lg animate-bounce">
            {currentStep + 1}
          </div>
        </div>
      )}

      {/* Floating Guided Tooltip Card */}
      <div
        style={!isMobile && targetRect ? desktopStyle : undefined}
        className={`fixed z-[202] bg-[#161616] border border-orange-500/40 rounded-3xl p-4 sm:p-6 shadow-2xl shadow-orange-500/20 transition-all duration-300 animate-in fade-in zoom-in-95 ${
          isMobile
            ? "bottom-4 inset-x-3 max-w-md mx-auto max-h-[85vh] overflow-y-auto"
            : !targetRect
            ? "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px]"
            : "w-[380px]"
        }`}
      >
        {/* Header with Step indicator and Close button */}
        <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3">
          <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider bg-orange-500/15 border border-orange-500/30 text-orange-400">
            <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
            <span className="truncate">{step.badge}</span>
          </span>

          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-full text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors flex-shrink-0"
            aria-label="Close tour"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <h4 className="text-sm sm:text-base font-black text-white tracking-tight mb-1 sm:mb-2">
          {step.title}
        </h4>

        <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed mb-4 sm:mb-5">
          {step.description}
        </p>

        {/* Step dots & Action buttons */}
        <div className="flex items-center justify-between gap-2 pt-2.5 sm:pt-3 border-t border-white/10">
          <div className="flex items-center gap-1 sm:gap-1.5">
            {steps.map((s, idx) => (
              <div
                key={s.targetId}
                className={`h-1.5 rounded-full transition-all duration-200 ${
                  idx === currentStep ? "w-4 sm:w-5 bg-orange-500" : "w-1.5 bg-zinc-700"
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {!isFirst && (
              <button
                type="button"
                onClick={handlePrev}
                className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-zinc-300 transition-all flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              className="px-3.5 sm:px-4 py-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-black font-extrabold text-xs uppercase tracking-wider shadow-md active:scale-95 transition-all flex items-center gap-1.5"
            >
              <span>{isLast ? "Got It!" : "Next"}</span>
              {isLast ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MoviePageSpotlightTour;
