"use client";

import React, { useState } from "react";
import { useCommunityAuth } from "@/context/CommunityAuthContext";
import { X, Flag, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetId: string;
  targetType: "comment" | "thread";
  targetTitle?: string;
}

const REPORT_REASONS = [
  { value: "spam", label: "Spam or Advertising" },
  { value: "abuse", label: "Abusive or Toxic Language" },
  { value: "hate_speech", label: "Hate Speech or Discrimination" },
  { value: "harassment", label: "Harassment or Bullying" },
  { value: "spoiler", label: "Unmarked Spoiler" },
  { value: "misleading", label: "False or Misleading Info" },
  { value: "other", label: "Other Rule Violation" },
];

export function ReportModal({
  isOpen,
  onClose,
  targetId,
  targetType,
}: ReportModalProps) {
  const { user, openAuthModal } = useCommunityAuth();
  const [reason, setReason] = useState("spam");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      openAuthModal("login");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/community/comments/${targetId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason,
          details,
          type: targetType,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.message || "Failed to submit report.");
        return;
      }

      toast.success(
        data.message || "Thank you. Your report has been submitted."
      );
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Network error submitting report.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-md bg-[#161616] border border-white/10 rounded-3xl p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-gray-400 hover:text-white rounded-full bg-white/5 hover:bg-white/10"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
            <Flag className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">
              Report {targetType === "thread" ? "Discussion" : "Comment"}
            </h3>
            <p className="text-xs text-zinc-400">
              Help us keep the Ollypedia community respectful and clean.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
              Reason for Report
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#1f1f1f] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-orange-500"
            >
              {REPORT_REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
              Additional Details (Optional)
            </label>
            <textarea
              rows={3}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Explain why this content violates community guidelines..."
              maxLength={500}
              className="w-full px-3.5 py-2.5 bg-[#1f1f1f] border border-white/10 rounded-xl text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500"
            />
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl text-sm font-bold text-black bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 shadow-md transition-all active:scale-95 disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Submit Report"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
