"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCommunityAuth } from "@/context/CommunityAuthContext";
import {
  User,
  Vote,
  MessageSquare,
  Sparkles,
  Heart,
  Calendar,
  Settings,
  Activity,
  LogOut,
  Film,
  ExternalLink,
} from "lucide-react";
import { DisplayAd } from "@/components/ads/DisplayAd";
import toast from "react-hot-toast";

const VOTE_STYLES: Record<string, { label: string; emoji: string; color: string; bg: string }> = {
  skip: { label: "Skip", emoji: "🩷", color: "text-rose-400", bg: "bg-rose-500/15 border-rose-500/30" },
  timepass: { label: "Timepass", emoji: "🟡", color: "text-yellow-400", bg: "bg-yellow-500/15 border-yellow-500/30" },
  go_for_it: { label: "Go for it", emoji: "🟢", color: "text-emerald-400", bg: "bg-emerald-500/15 border-emerald-500/30" },
  perfection: { label: "Perfection", emoji: "🟣", color: "text-purple-400", bg: "bg-purple-500/15 border-purple-500/30" },
};

export default function UserDashboardProfilePage() {
  const router = useRouter();
  const { user, loading, logout, openAuthModal, updateUser } = useCommunityAuth();

  const [activeTab, setActiveTab] = useState<"votes" | "discussions" | "comments" | "activity" | "settings">("votes");
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [dataLoading, setDataLoading] = useState(true);

  // Settings form state
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editAvatar, setEditAvatar] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      openAuthModal("login");
    }
  }, [loading, user, openAuthModal]);

  const fetchDashboardData = async () => {
    try {
      setDataLoading(true);
      const res = await fetch("/api/community/me/profile");
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setDashboardData(data);
          setEditDisplayName(data.user.displayName || "");
          setEditBio(data.user.bio || "");
          setEditAvatar(data.user.avatar || "");
        }
      }
    } catch (err) {
      console.error("Failed to load dashboard:", err);
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const res = await fetch("/api/community/me/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: editDisplayName,
          bio: editBio,
          avatar: editAvatar,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.message || "Failed to update profile.");
        return;
      }
      toast.success("Profile settings updated!");
      updateUser(data.user);
      fetchDashboardData();
    } catch {
      toast.error("Network error saving profile.");
    } finally {
      setSavingSettings(false);
    }
  };

  if (loading || (!user && !dashboardData)) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="w-10 h-10 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-zinc-400 text-sm">Loading your community profile...</p>
      </div>
    );
  }

  const votes = dashboardData?.votes || [];
  const discussions = dashboardData?.discussions || [];
  const comments = dashboardData?.comments || [];
  const activities = dashboardData?.activities || [];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      {/* ── User Header ── */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#181818] via-[#141414] to-[#0e0e0e] border border-white/10 rounded-3xl p-6 sm:p-8 mb-8 shadow-xl">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4 text-center sm:text-left">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden bg-zinc-800 border-2 border-orange-500/40 shadow-lg flex-shrink-0">
              {user?.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.avatar}
                  alt={user.displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-orange-400">
                  {user?.displayName.charAt(0)}
                </div>
              )}
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white">
                {user?.displayName}
              </h1>
              <p className="text-xs sm:text-sm text-zinc-400">@{user?.username} • {user?.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <Link
                  href={`/discussion/user/${user?.username}`}
                  className="text-xs text-orange-400 hover:text-orange-300 font-semibold flex items-center gap-1"
                >
                  <span>View Public Profile</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              logout();
              router.push("/discussion");
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/30 text-zinc-300 hover:text-red-400 text-xs font-bold transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* ── Navigation Tabs ── */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-3 mb-6 overflow-x-auto scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab("votes")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
            activeTab === "votes"
              ? "bg-gradient-to-r from-orange-500 to-amber-500 text-black shadow-md font-black"
              : "text-zinc-400 hover:text-white bg-white/5"
          }`}
        >
          <Vote className="w-4 h-4" />
          <span>My Meter Votes ({votes.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("discussions")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
            activeTab === "discussions"
              ? "bg-gradient-to-r from-orange-500 to-amber-500 text-black shadow-md font-black"
              : "text-zinc-400 hover:text-white bg-white/5"
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>My Discussions ({discussions.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("comments")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
            activeTab === "comments"
              ? "bg-gradient-to-r from-orange-500 to-amber-500 text-black shadow-md font-black"
              : "text-zinc-400 hover:text-white bg-white/5"
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>My Comments ({comments.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("activity")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
            activeTab === "activity"
              ? "bg-gradient-to-r from-orange-500 to-amber-500 text-black shadow-md font-black"
              : "text-zinc-400 hover:text-white bg-white/5"
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Activity Log</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("settings")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
            activeTab === "settings"
              ? "bg-gradient-to-r from-orange-500 to-amber-500 text-black shadow-md font-black"
              : "text-zinc-400 hover:text-white bg-white/5"
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Settings</span>
        </button>
      </div>

      {/* ── TAB CONTENT ── */}

      {/* 1. MY VOTES */}
      {activeTab === "votes" && (
        <div>
          {votes.length === 0 ? (
            <div className="text-center py-16 bg-[#141414] rounded-3xl border border-dashed border-white/10">
              <Vote className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
              <h3 className="text-base font-bold text-white">No Meter Votes Yet</h3>
              <p className="text-xs text-zinc-400 mt-1 mb-4">
                Explore movies in the Discussion section to cast your verdict.
              </p>
              <Link
                href="/discussion"
                className="px-4 py-2 bg-orange-500 text-black font-bold text-xs rounded-xl"
              >
                Browse Movies
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {votes.map((v: any) => {
                const style = VOTE_STYLES[v.voteType] || VOTE_STYLES.go_for_it;
                const movie = v.movieId || {};
                const poster = movie.posterUrl || movie.thumbnailUrl || "/placeholder-movie.jpg";
                const date = new Date(v.updatedAt || v.createdAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                });

                return (
                  <div
                    key={v._id}
                    className="bg-[#141414] border border-white/10 rounded-2xl p-4 flex gap-4 items-center group hover:border-orange-500/40 transition-all shadow-md"
                  >
                    <Link
                      href={`/discussion/movie/${movie.slug || movie._id}`}
                      className="relative w-16 aspect-[2/3] rounded-xl overflow-hidden bg-zinc-900 flex-shrink-0"
                    >
                      <Image
                        src={poster}
                        alt={movie.title || "Movie"}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform"
                      />
                    </Link>

                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/discussion/movie/${movie.slug || movie._id}`}
                        className="text-sm font-bold text-white group-hover:text-orange-400 transition-colors line-clamp-1"
                      >
                        {movie.title}
                      </Link>
                      <p className="text-[11px] text-zinc-500 mb-2">{date}</p>

                      <div
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold ${style.bg} ${style.color}`}
                      >
                        <span>{style.emoji}</span>
                        <span>{style.label}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 2. MY DISCUSSIONS */}
      {activeTab === "discussions" && (
        <div className="space-y-3">
          {discussions.length === 0 ? (
            <div className="text-center py-16 bg-[#141414] rounded-3xl border border-dashed border-white/10">
              <MessageSquare className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
              <h3 className="text-base font-bold text-white">No Discussions Started</h3>
              <p className="text-xs text-zinc-400 mt-1">
                You haven&apos;t created any movie discussion threads yet.
              </p>
            </div>
          ) : (
            discussions.map((d: any) => (
              <Link
                key={d._id}
                href={`/discussion/movie/${d.movieId?.slug || "movie"}/thread/${d.slug || d._id}`}
                className="block bg-[#141414] hover:bg-[#181818] border border-white/10 hover:border-orange-500/40 rounded-2xl p-5 transition-all group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-orange-400">
                    {d.movieId?.title}
                  </span>
                  <span className="text-[11px] text-zinc-500">
                    {new Date(d.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <h3 className="text-base font-bold text-white group-hover:text-orange-400 transition-colors mb-2">
                  {d.title}
                </h3>
                <p className="text-xs text-zinc-400 line-clamp-2 mb-3">
                  {d.content}
                </p>
                <div className="flex items-center gap-4 text-xs text-zinc-500">
                  <span>{d.likeCount || 0} Likes</span>
                  <span>•</span>
                  <span>{d.commentCount || 0} Comments</span>
                </div>
              </Link>
            ))
          )}
        </div>
      )}

      {/* 3. MY COMMENTS */}
      {activeTab === "comments" && (
        <div className="space-y-3">
          {comments.length === 0 ? (
            <div className="text-center py-16 bg-[#141414] rounded-3xl border border-dashed border-white/10">
              <Sparkles className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
              <h3 className="text-base font-bold text-white">No Comments Yet</h3>
              <p className="text-xs text-zinc-400 mt-1">
                Join active threads and share your opinion!
              </p>
            </div>
          ) : (
            comments.map((c: any) => (
              <Link
                key={c._id}
                href={`/discussion/movie/${c.movieId?.slug || "movie"}/thread/${c.threadId?.slug || c.threadId?._id || "thread"}`}
                className="block bg-[#141414] hover:bg-[#181818] border border-white/10 hover:border-orange-500/40 rounded-2xl p-4 transition-all group"
              >
                <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
                  <span>
                    On <strong className="text-orange-400">{c.movieId?.title}</strong>: {c.threadId?.title}
                  </span>
                  <span className="text-[11px] text-zinc-500">
                    {new Date(c.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-zinc-200 italic my-2">
                  &ldquo;{c.content}&rdquo;
                </p>
                <div className="text-[11px] text-zinc-500">
                  {c.likeCount || 0} Likes
                </div>
              </Link>
            ))
          )}
        </div>
      )}

      {/* 4. ACTIVITY LOG */}
      {activeTab === "activity" && (
        <div className="bg-[#141414] border border-white/10 rounded-3xl p-6">
          <h3 className="text-base font-bold text-white mb-4">Your Recent Activity</h3>
          {activities.length === 0 ? (
            <p className="text-xs text-zinc-500">No activity recorded yet.</p>
          ) : (
            <div className="space-y-4">
              {activities.map((a: any) => (
                <div
                  key={a._id}
                  className="flex items-start gap-3 pb-3 border-b border-white/5 last:border-0"
                >
                  <div className="w-2 h-2 rounded-full bg-orange-500 mt-1.5 flex-shrink-0" />
                  <div className="flex-1 text-xs">
                    <p className="text-zinc-300">
                      {a.metadata?.snippet || a.type.replace(/_/g, " ")}
                    </p>
                    <span className="text-[10px] text-zinc-500 mt-0.5 block">
                      {new Date(a.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. SETTINGS */}
      {activeTab === "settings" && (
        <div className="bg-[#141414] border border-white/10 rounded-3xl p-6 sm:p-8 max-w-xl">
          <h3 className="text-lg font-bold text-white mb-6">Profile Settings</h3>
          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                Display Name
              </label>
              <input
                type="text"
                value={editDisplayName}
                onChange={(e) => setEditDisplayName(e.target.value)}
                maxLength={50}
                required
                className="w-full px-4 py-2.5 bg-[#1f1f1f] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                Avatar Image URL (DiceBear or Direct Image Link)
              </label>
              <input
                type="url"
                value={editAvatar}
                onChange={(e) => setEditAvatar(e.target.value)}
                placeholder="https://api.dicebear.com/7.x/bottts/svg?seed=alekh"
                className="w-full px-4 py-2.5 bg-[#1f1f1f] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                Bio / About You
              </label>
              <textarea
                rows={3}
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                maxLength={300}
                placeholder="Tell other Odia cinema fans about your favorite films & actors..."
                className="w-full px-4 py-2.5 bg-[#1f1f1f] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-orange-500"
              />
            </div>

            <button
              type="submit"
              disabled={savingSettings}
              className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md active:scale-95 disabled:opacity-50"
            >
              {savingSettings ? "Saving..." : "Save Changes"}
            </button>
          </form>
        </div>
      )}
      {/* Bottom Profile Banner Ad */}
      <div className="w-full overflow-hidden mt-8">
        <DisplayAd slot="8191172163" format="horizontal" className="rounded-2xl border border-[#222]" />
      </div>
    </div>
  );
}
