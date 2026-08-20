"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Heart,
  MessageSquare,
  CornerDownRight,
  MoreVertical,
  Edit2,
  Trash2,
  Flag,
  Send,
  AlertTriangle,
  LogIn,
} from "lucide-react";
import { useCommunityAuth } from "@/context/CommunityAuthContext";
import { SpoilerContent } from "./SpoilerContent";
import { SpoilerToggle } from "./SpoilerToggle";
import { ReportModal } from "./ReportModal";
import toast from "react-hot-toast";

export interface CommentData {
  _id: string;
  movieId: string;
  threadId: string;
  userId: {
    _id: string;
    username: string;
    displayName: string;
    avatar: string;
    role?: string;
  };
  parentCommentId?: string | null;
  content: string;
  hasSpoiler: boolean;
  likeCount: number;
  replyCount: number;
  status: string;
  isLiked?: boolean;
  isAuthor?: boolean;
  editedAt?: string;
  createdAt: string;
  replies?: CommentData[];
}

interface ThreadCommentsSectionProps {
  threadId: string;
  threadSlug?: string;
  movieSlug?: string;
  movieId?: string;
  initialCommentCount?: number;
}

function timeAgo(dateString: string): string {
  const now = new Date();
  const past = new Date(dateString);
  const diffMs = now.getTime() - past.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffDay > 30) return past.toLocaleDateString();
  if (diffDay > 0) return `${diffDay}d ago`;
  if (diffHr > 0) return `${diffHr}h ago`;
  if (diffMin > 0) return `${diffMin}m ago`;
  return "Just now";
}

export function ThreadCommentsSection({
  threadId,
  threadSlug = "thread",
  movieSlug = "movie",
  movieId,
  initialCommentCount,
}: ThreadCommentsSectionProps) {
  const { user, openAuthModal } = useCommunityAuth();
  const [comments, setComments] = useState<CommentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState("top"); // top | newest | oldest
  const [newCommentText, setNewCommentText] = useState("");
  const [hasSpoiler, setHasSpoiler] = useState(false);
  const [submittingRoot, setSubmittingRoot] = useState(false);

  // Active reply box ID
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replySpoiler, setReplySpoiler] = useState(false);
  const [submittingReply, setSubmittingReply] = useState(false);

  // Active edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Reporting state
  const [reportTargetId, setReportTargetId] = useState<string | null>(null);

  const fetchComments = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/community/threads/${threadId}/comments?sort=${sort}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setComments(data.comments || []);
        }
      }
    } catch (err) {
      console.error("Error loading comments:", err);
    } finally {
      setLoading(false);
    }
  }, [threadId, sort]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // Handle Root Comment Post
  const handlePostRootComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      openAuthModal("login");
      return;
    }

    if (!newCommentText.trim()) return;
    setSubmittingRoot(true);

    try {
      const res = await fetch(`/api/community/threads/${threadId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newCommentText,
          hasSpoiler,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.message || "Failed to post comment.");
        return;
      }

      toast.success(data.message || "Comment posted!");
      setNewCommentText("");
      setHasSpoiler(false);
      setComments((prev) => [data.comment, ...prev]);
    } catch (err: any) {
      toast.error(err.message || "Error posting comment.");
    } finally {
      setSubmittingRoot(false);
    }
  };

  // Handle Reply Post
  const handlePostReply = async (parentCommentId: string) => {
    if (!user) {
      openAuthModal("login");
      return;
    }

    if (!replyText.trim()) return;
    setSubmittingReply(true);

    try {
      const res = await fetch(`/api/community/threads/${threadId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: replyText,
          parentCommentId,
          hasSpoiler: replySpoiler,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.message || "Failed to post reply.");
        return;
      }

      toast.success("Reply posted!");
      setReplyText("");
      setReplySpoiler(false);
      setActiveReplyId(null);

      // Append reply to correct root comment
      setComments((prev) =>
        prev.map((c) => {
          if (c._id === parentCommentId) {
            return {
              ...c,
              replyCount: (c.replyCount || 0) + 1,
              replies: [...(c.replies || []), data.comment],
            };
          }
          return c;
        })
      );
    } catch (err: any) {
      toast.error(err.message || "Error posting reply.");
    } finally {
      setSubmittingReply(false);
    }
  };

  // Toggle Like on Comment or Reply
  const handleLikeComment = async (commentId: string, isReply = false, parentId?: string) => {
    if (!user) {
      toast("Please sign in to like comments.", { icon: "🔒" });
      openAuthModal("login");
      return;
    }

    // Optimistic UI update
    setComments((prev) =>
      prev.map((c) => {
        if (!isReply && c._id === commentId) {
          const nextLiked = !c.isLiked;
          return {
            ...c,
            isLiked: nextLiked,
            likeCount: nextLiked ? c.likeCount + 1 : Math.max(0, c.likeCount - 1),
          };
        } else if (isReply && c._id === parentId) {
          return {
            ...c,
            replies: (c.replies || []).map((r) => {
              if (r._id === commentId) {
                const nextLiked = !r.isLiked;
                return {
                  ...r,
                  isLiked: nextLiked,
                  likeCount: nextLiked ? r.likeCount + 1 : Math.max(0, r.likeCount - 1),
                };
              }
              return r;
            }),
          };
        }
        return c;
      })
    );

    try {
      const res = await fetch(`/api/community/comments/${commentId}/like`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        fetchComments(); // rollback on failure
      }
    } catch {
      fetchComments();
    }
  };

  // Edit Comment
  const handleSaveEdit = async (commentId: string) => {
    if (!editText.trim()) return;
    setSubmittingEdit(true);
    try {
      const res = await fetch(`/api/community/comments/${commentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editText }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.message || "Failed to edit comment.");
        return;
      }
      toast.success("Comment edited!");
      setEditingId(null);
      setEditText("");
      fetchComments();
    } catch {
      toast.error("Error editing comment.");
    } finally {
      setSubmittingEdit(false);
    }
  };

  // Delete Comment
  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("Are you sure you want to delete this comment?")) return;
    try {
      const res = await fetch(`/api/community/comments/${commentId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.message || "Failed to delete comment.");
        return;
      }
      toast.success("Comment deleted.");
      fetchComments();
    } catch {
      toast.error("Error deleting comment.");
    }
  };

  const renderCommentItem = (
    item: CommentData,
    isReply = false,
    parentId?: string
  ) => {
    const isEditing = editingId === item._id;
    const author = item.userId || {
      _id: "unknown",
      username: "anonymous",
      displayName: "User",
      avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=user",
    };

    return (
      <div
        key={item._id}
        className={`relative ${
          isReply
            ? "ml-6 sm:ml-10 mt-3 pt-3 border-l-2 border-white/10 pl-4 bg-white/[0.02] rounded-r-2xl"
            : "p-4 sm:p-5 rounded-2xl bg-[#161616] border border-white/5"
        }`}
      >
        {/* Comment Author Line */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <Link
            href={`/discussion/user/${author.username}`}
            className="flex items-center gap-2.5 group/author"
          >
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden bg-zinc-800 border border-white/10 flex-shrink-0">
              {author.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={author.avatar}
                  alt={author.displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs font-bold text-orange-400">
                  {author.displayName.charAt(0)}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs sm:text-sm font-bold text-white group-hover/author:text-orange-400 transition-colors">
                {author.displayName}
              </span>
              <span className="text-[11px] text-zinc-500">
                @{author.username} • {timeAgo(item.createdAt)}
              </span>
              {item.editedAt && (
                <span className="text-[10px] text-zinc-500 italic">(edited)</span>
              )}
              {author.role === "admin" && (
                <span className="text-[9px] font-black uppercase tracking-wider px-1 bg-orange-500/20 text-orange-400 rounded">
                  Admin
                </span>
              )}
            </div>
          </Link>

          {/* Spoiler indicator tag */}
          {item.hasSpoiler && item.status !== "deleted" && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
              <AlertTriangle className="w-2.5 h-2.5" />
              Spoiler
            </span>
          )}
        </div>

        {/* Comment Content or Edit Form */}
        {isEditing ? (
          <div className="mt-2 space-y-2">
            <textarea
              rows={3}
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="w-full px-3 py-2 bg-[#1f1f1f] border border-white/15 rounded-xl text-sm text-white focus:outline-none focus:border-orange-500"
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setEditingId(null)}
                className="px-3 py-1 text-xs text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submittingEdit}
                onClick={() => handleSaveEdit(item._id)}
                className="px-4 py-1 text-xs font-bold text-black bg-orange-500 hover:bg-orange-400 rounded-lg"
              >
                {submittingEdit ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        ) : (
          <>
            {item.hasSpoiler && item.status !== "deleted" ? (
              <SpoilerContent previewText="Comment contains spoilers">
                <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed break-words whitespace-pre-line my-1.5">
                  {item.content}
                </p>
              </SpoilerContent>
            ) : (
              <p
                className={`text-xs sm:text-sm leading-relaxed break-words whitespace-pre-line my-1.5 ${
                  item.status === "deleted"
                    ? "text-zinc-500 italic"
                    : "text-zinc-300"
                }`}
              >
                {item.content}
              </p>
            )}
          </>
        )}

        {/* Comment Action Bar */}
        {item.status !== "deleted" && (
          <div className="flex items-center gap-3 pt-1 text-xs text-zinc-400">
            {/* Like button */}
            <button
              type="button"
              onClick={() => handleLikeComment(item._id, isReply, parentId)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-colors ${
                item.isLiked
                  ? "text-rose-400 bg-rose-500/10 font-bold"
                  : "hover:text-white hover:bg-white/5"
              }`}
            >
              <Heart
                className={`w-3.5 h-3.5 ${
                  item.isLiked ? "fill-rose-500 text-rose-500" : ""
                }`}
              />
              <span>{item.likeCount || 0}</span>
            </button>

            {/* Reply button (only on root level or allows replying) */}
            {!isReply && (
              <button
                type="button"
                onClick={() => {
                  if (!user) {
                    openAuthModal("login");
                  } else {
                    setActiveReplyId(
                      activeReplyId === item._id ? null : item._id
                    );
                    setReplyText("");
                  }
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg hover:text-white hover:bg-white/5 transition-colors font-medium"
              >
                <CornerDownRight className="w-3.5 h-3.5" />
                <span>Reply</span>
              </button>
            )}

            {/* Edit / Delete / Report actions */}
            <div className="ml-auto flex items-center gap-1">
              {(item.isAuthor || user?.role === "admin") && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(item._id);
                      setEditText(item.content);
                    }}
                    className="p-1 text-zinc-500 hover:text-zinc-300 rounded hover:bg-white/5"
                    title="Edit comment"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteComment(item._id)}
                    className="p-1 text-zinc-500 hover:text-red-400 rounded hover:bg-red-500/10"
                    title="Delete comment"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => {
                  if (!user) {
                    openAuthModal("login");
                  } else {
                    setReportTargetId(item._id);
                  }
                }}
                className="p-1 text-zinc-600 hover:text-red-400 rounded hover:bg-white/5"
                title="Report"
              >
                <Flag className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        {/* Reply Input Box (when active) */}
        {!isReply && activeReplyId === item._id && (
          <div className="mt-3 pt-3 border-t border-white/5 space-y-2 animate-in fade-in duration-150">
            <div className="flex gap-2">
              <textarea
                rows={2}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={`Replying to @${author.username}...`}
                className="flex-1 px-3 py-2 bg-[#1c1c1c] border border-white/10 rounded-xl text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
              />
            </div>
            <div className="flex items-center justify-between">
              <SpoilerToggle
                checked={replySpoiler}
                onChange={setReplySpoiler}
                size="sm"
                label="Spoiler"
                activeLabel="Contains Spoiler"
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setActiveReplyId(null)}
                  className="px-3 py-1 text-xs text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={submittingReply || !replyText.trim()}
                  onClick={() => handlePostReply(item._id)}
                  className="px-4 py-1 bg-gradient-to-r from-orange-500 to-amber-500 text-black font-extrabold text-xs rounded-lg active:scale-95 disabled:opacity-50"
                >
                  {submittingReply ? "Posting..." : "Reply"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Nested Replies */}
        {!isReply && item.replies && item.replies.length > 0 && (
          <div className="space-y-2 mt-2">
            {item.replies.map((reply) =>
              renderCommentItem(reply, true, item._id)
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-[#121212] border border-white/10 rounded-3xl p-5 sm:p-7 shadow-xl">
      {/* Comments Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-6 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <MessageSquare className="w-5 h-5 text-orange-400" />
          <h3 className="text-base sm:text-lg font-bold text-white">
            Community Comments ({comments.length})
          </h3>
        </div>

        {/* Sort selector */}
        <div className="flex items-center gap-1.5 bg-[#1a1a1a] p-1 rounded-xl border border-white/5">
          {(["top", "newest", "oldest"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSort(s)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${
                sort === s
                  ? "bg-orange-500 text-black font-extrabold shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Write Root Comment Form */}
      <form onSubmit={handlePostRootComment} className="mb-8">
        {user ? (
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full overflow-hidden bg-zinc-800 border border-white/10 flex-shrink-0">
                {user.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.avatar}
                    alt={user.displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-bold text-orange-400">
                    {user.displayName.charAt(0)}
                  </div>
                )}
              </div>
              <textarea
                rows={3}
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                placeholder="Share your thoughts on this discussion..."
                maxLength={2000}
                className="flex-1 px-4 py-3 bg-[#181818] border border-white/10 rounded-2xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 leading-relaxed"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pl-0 sm:pl-12">
              <SpoilerToggle
                checked={hasSpoiler}
                onChange={setHasSpoiler}
                label="Mark as Spoiler"
                activeLabel="Contains Spoilers (Blur Protected)"
              />

              <button
                type="submit"
                disabled={submittingRoot || !newCommentText.trim()}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-black font-extrabold text-xs uppercase tracking-wider shadow-md active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
              >
                {submittingRoot ? (
                  "Posting..."
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    Comment
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-[#181818] border border-white/5 rounded-2xl p-5 text-center">
            <p className="text-xs sm:text-sm text-zinc-400 mb-3">
              Join the conversation! Log in to comment and reply to others.
            </p>
            <button
              type="button"
              onClick={() => openAuthModal("login")}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-black font-extrabold text-xs uppercase tracking-wider shadow-md transition-all active:scale-95"
            >
              <LogIn className="w-3.5 h-3.5" />
              Login to Comment
            </button>
          </div>
        )}
      </form>

      {/* Comments List */}
      {loading ? (
        <div className="space-y-4 py-8">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 bg-zinc-800/40 rounded-2xl animate-pulse"
            />
          ))}
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-12 bg-white/[0.01] rounded-2xl border border-dashed border-white/10">
          <MessageSquare className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
          <p className="text-sm font-semibold text-zinc-400">No comments yet</p>
          <p className="text-xs text-zinc-500 mt-1">
            Be the first to share your opinion on this discussion!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => renderCommentItem(comment))}
        </div>
      )}

      {/* Report Modal */}
      {reportTargetId && (
        <ReportModal
          isOpen={Boolean(reportTargetId)}
          onClose={() => setReportTargetId(null)}
          targetId={reportTargetId}
          targetType="comment"
        />
      )}
    </div>
  );
}
