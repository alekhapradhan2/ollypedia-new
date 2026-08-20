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
} from "lucide-react";
import { useCommunityAuth } from "@/context/CommunityAuthContext";

interface StepConfig {
  targetId: string;
  title: string;
  description: string;
  badge: string;
  icon: any;
  placement: "bottom" | "top" | "center";
}

const SPOTLIGHT_STEPS: StepConfig[] = [
  {
    targetId: "tour-meter",
    badge: "1. Audience Meter",
    icon: Sparkles,
    title: "Live Ollypedia Meter",
    description:
      "This gauge displays the real-time community sentiment percentage calculated directly from verified Odia moviegoer votes.",
    placement: "bottom",
  },
  {
    targetId: "tour-vote",
    badge: "2. Vote & Rate",
    icon: Flame,
    title: "Cast Your Movie Verdict",
    description:
      "Select Skip 🩷, Timepass 🟡, Go for it 🟢, or Perfection 🟣. Your vote instantly updates the meter score and you can change it anytime.",
    placement: "bottom",
  },
  {
    targetId: "tour-comments-box",
    badge: "3. Direct Movie Chat",
    icon: MessageSquare,
    title: "Leave Quick Reviews & Comments",
    description:
      "Drop a quick reaction or opinion directly on this movie without needing to create a thread first. Supports nested YouTube-style replies!",
    placement: "top",
  },
  {
    targetId: "tour-spoiler",
    badge: "4. 1-Click Spoiler Blur",
    icon: AlertTriangle,
    title: "Protect Movie Endings",
    description:
      "Enable this toggle to automatically blur your comment text so other viewers can choose when to safely reveal spoilers.",
    placement: "top",
  },
];

export function MoviePageSpotlightTour() {
  const { isTourOpen, openTour, closeTour } = useCommunityAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [windowSize, setWindowSize] = useState<{ width: number; height: number }>({
    width: typeof window !== "undefined" ? window.innerWidth : 1200,
    height: typeof window !== "undefined" ? window.innerHeight : 800,
  });

  const step = SPOTLIGHT_STEPS[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === SPOTLIGHT_STEPS.length - 1;

  // Auto-launch spotlight guide for first-time visitors
  useEffect(() => {
    if (typeof window !== "undefined") {
      const hasSeenMovieTour = localStorage.getItem("ollypedia_movie_tour_seen");
      if (!hasSeenMovieTour) {
        const timer = setTimeout(() => {
          openTour();
        }, 800);
        return () => clearTimeout(timer);
      }
    }
  }, [openTour]);

  const handleClose = useCallback(() => {
    closeTour();
    setCurrentStep(0);
    if (typeof window !== "undefined") {
      localStorage.setItem("ollypedia_movie_tour_seen", "true");
    }
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
      setTimeout(() => {
        const rect = el.getBoundingClientRect();
        setTargetRect(rect);
      }, 350);
    } else {
      setTargetRect(null);
    }
  }, [isTourOpen, step]);

  useEffect(() => {
    if (isTourOpen) {
      updateTargetPosition();
      const handleResize = () => updateTargetPosition();
      window.addEventListener("resize", handleResize);
      window.addEventListener("scroll", handleResize);
      return () => {
        window.removeEventListener("resize", handleResize);
        window.removeEventListener("scroll", handleResize);
      };
    }
  }, [isTourOpen, currentStep, updateTargetPosition]);

  if (!isTourOpen) return null;

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

  const isMobile = windowSize.width < 640;

  // Calculate safe desktop tooltip coordinates
  let desktopStyle: React.CSSProperties = {};
  if (!isMobile && targetRect) {
    const cardWidth = 380;
    const cardHeight = 220;

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
      {/* Background click to dismiss when no target is active */}
      {!targetRect && (
        <div
          className="absolute inset-0 bg-black/75 transition-opacity duration-300"
          onClick={handleClose}
        />
      )}

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
            ? "bottom-4 inset-x-3.5 max-w-lg mx-auto"
            : !targetRect
            ? "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px]"
            : "w-[380px]"
        }`}
      >
        {/* Header with Step indicator and Close button */}
        <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3">
          <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider bg-orange-500/15 border border-orange-500/30 text-orange-400">
            <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span>{step.badge}</span>
          </span>

          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-full text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
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
            {SPOTLIGHT_STEPS.map((s, idx) => (
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
