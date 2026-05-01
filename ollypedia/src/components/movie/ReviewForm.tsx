"use client";
import { useState } from "react";

// ─── Types ─────────────────────────────────────────────────────────────────────
interface ReviewFormProps {
  movieId: string;
  movieTitle?: string;
  moviePoster?: string;
  onSuccess?: (review: Review) => void;
  initialReviews?: Review[]; // ← NEW: pass existing reviews from page.tsx
}

interface Review {
  _id?: string;
  user: string;
  rating: number;   // stored as 1–10 in DB; displayed as 1–5 stars
  text: string;
  date?: string;
  likes?: number;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL || "/api"
).replace(/\/$/, "");

// ─── StarRating (1–5 display, mapped ×2 → 1–10 for the API) ──────────────────
function StarRating({
  value,
  onChange,
  size = 30,
}: {
  value: number;      // 1–5
  onChange: (v: number) => void;
  size?: number;
}) {
  const [hover, setHover] = useState(0);
  const labels = ["", "Poor", "Fair", "Good", "Great", "Excellent!"];

  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= (hover || value);
        return (
          <button
            key={star}
            type="button"
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            onClick={() => onChange(star)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 2,
              lineHeight: 1,
              transition: "transform .15s",
              transform: hover === star ? "scale(1.3)" : "scale(1)",
            }}
            aria-label={`Rate ${star} out of 5`}
          >
            <svg
              width={size}
              height={size}
              viewBox="0 0 24 24"
              fill={filled ? "#f59e0b" : "none"}
              stroke={filled ? "#f59e0b" : "#4b5563"}
              strokeWidth="1.5"
              style={{ display: "block", transition: "fill .15s, stroke .15s" }}
            >
              <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
            </svg>
          </button>
        );
      })}
      {(hover || value) > 0 && (
        <span
          style={{
            marginLeft: 4,
            fontSize: "0.8rem",
            color: "#f59e0b",
            fontWeight: 700,
            minWidth: 70,
          }}
        >
          {labels[hover || value]}
        </span>
      )}
    </div>
  );
}

// ─── ReviewCard (renders a single review — stars out of 5) ───────────────────
function ReviewCard({ review }: { review: Review }) {
  // DB stores 1–10; convert to 1–5 for display
  const stars = Math.round(review.rating / 2);

  return (
    <div
      style={{
        background: "#111",
        border: "1px solid #1f1f1f",
        borderRadius: 16,
        padding: "18px 20px",
      }}
    >
      {/* Top row: avatar + name + star badge */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
          gap: 12,
        }}
      >
        {/* Avatar + name */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              background: "rgba(245,158,11,.15)",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth={2}>
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <div>
            <p style={{ fontSize: "0.85rem", fontWeight: 700, color: "#fff", margin: 0 }}>
              {review.user || "Anonymous"}
            </p>
            {review.date && (
              <p style={{ fontSize: "0.65rem", color: "#6b7280", margin: 0 }}>
                {new Date(review.date).toLocaleDateString("en-IN")}
              </p>
            )}
          </div>
        </div>

        {/* Star badge — FIX: shows X/5 not X/10 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            background: "rgba(234,179,8,.08)",
            border: "1px solid rgba(234,179,8,.2)",
            borderRadius: 8,
            padding: "5px 10px",
            flexShrink: 0,
          }}
        >
          {[1, 2, 3, 4, 5].map((s) => (
            <svg
              key={s}
              width={12}
              height={12}
              viewBox="0 0 24 24"
              fill={s <= stars ? "#f59e0b" : "none"}
              stroke={s <= stars ? "#f59e0b" : "#374151"}
              strokeWidth="1.5"
            >
              <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
            </svg>
          ))}
          <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#f59e0b", marginLeft: 3 }}>
            {stars}/5
          </span>
        </div>
      </div>

      {/* Review text */}
      <p style={{ fontSize: "0.85rem", color: "#d1d5db", lineHeight: 1.65, margin: 0 }}>
        {review.text}
      </p>
    </div>
  );
}

// ─── Share Card Modal ─────────────────────────────────────────────────────────
function ShareModal({
  review,
  movieTitle,
  moviePoster,
  onClose,
}: {
  review: Review;
  movieTitle?: string;
  moviePoster?: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== "undefined" ? window.location.href : "";
  const displayStars = Math.round(review.rating / 2);
  const starEmoji = "⭐".repeat(displayStars);

  const handleShare = async () => {
    // Build the share text: stars + review snippet + reviewer + page URL
    // When shared on WhatsApp/Telegram/iMessage the URL unfurls into a rich
    // card showing your movie poster + title because page.tsx already has
    // og:image, og:title and og:description set.
    const shareText =
      `${starEmoji} ${displayStars}/5 — ${movieTitle || "Movie Review"}\n\n` +
      `"${review.text}"\n\n` +
      `— ${review.user || "Anonymous"} on Ollypedia`;

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: movieTitle, text: shareText, url });
      } catch (e: any) {
        // AbortError = user cancelled, ignore
        if (e?.name !== "AbortError") fallbackCopy(shareText, url);
      }
    } else {
      fallbackCopy(shareText, url);
    }
  };

  function fallbackCopy(text: string, link: string) {
    navigator.clipboard?.writeText(`${text}\n${link}`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,.88)",
        backdropFilter: "blur(18px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        animation: "rv-fadein .2s ease",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 420,
          background: "linear-gradient(160deg, #1a1200 0%, #0e0e0e 100%)",
          border: "1px solid rgba(245,158,11,.35)",
          borderRadius: 22,
          overflow: "hidden",
          animation: "rv-slidein .25s cubic-bezier(.34,1.56,.64,1)",
          boxShadow: "0 40px 90px rgba(0,0,0,.95), 0 0 0 1px rgba(245,158,11,.1)",
        }}
      >
        {/* Animated gold bar */}
        <div
          style={{
            height: 4,
            background: "linear-gradient(90deg, #f59e0b, #fcd34d, #f59e0b)",
            backgroundSize: "200%",
            animation: "rv-shimmer 2.5s ease infinite",
          }}
        />

        {/* ✅ Success badge */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            paddingTop: 20,
            paddingBottom: 4,
          }}
        >
          <div
            style={{
              background: "rgba(34,197,94,.12)",
              border: "1px solid rgba(34,197,94,.3)",
              borderRadius: 999,
              padding: "5px 14px",
              fontSize: "0.72rem",
              fontWeight: 700,
              color: "#4ade80",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            ✓ Review Submitted
          </div>
        </div>

        {/* Movie header */}
        <div
          style={{
            display: "flex",
            gap: 14,
            padding: "14px 20px 12px",
            alignItems: "flex-start",
          }}
        >
          {moviePoster && (
            <img
              src={moviePoster}
              alt={movieTitle || "Movie"}
              style={{
                width: 60,
                height: 84,
                objectFit: "cover",
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,.12)",
                flexShrink: 0,
                boxShadow: "0 8px 24px rgba(0,0,0,.6)",
              }}
            />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: "0.6rem",
                fontWeight: 800,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: "#f59e0b",
                marginBottom: 5,
              }}
            >
              ⭐ My Review
            </div>
            <div
              style={{
                fontWeight: 800,
                fontSize: "1.1rem",
                color: "#fff",
                lineHeight: 1.2,
                fontFamily: "'Georgia', serif",
                marginBottom: 8,
              }}
            >
              {movieTitle || "Movie Review"}
            </div>

            {/* Stars — show 1–5 */}
            <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
              {[1, 2, 3, 4, 5].map((s) => (
                <svg
                  key={s}
                  width={16}
                  height={16}
                  viewBox="0 0 24 24"
                  fill={s <= displayStars ? "#f59e0b" : "none"}
                  stroke={s <= displayStars ? "#f59e0b" : "#374151"}
                  strokeWidth="1.5"
                >
                  <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
                </svg>
              ))}
              <span
                style={{
                  fontSize: "0.72rem",
                  color: "#f59e0b",
                  fontWeight: 700,
                  marginLeft: 5,
                }}
              >
                {displayStars}/5
              </span>
            </div>
          </div>
        </div>

        {/* Review text */}
        <div
          style={{
            margin: "0 20px 16px",
            background: "rgba(255,255,255,.04)",
            border: "1px solid rgba(255,255,255,.08)",
            borderRadius: 12,
            padding: "14px 16px",
          }}
        >
          <p
            style={{
              fontSize: "0.9rem",
              color: "rgba(255,255,255,.85)",
              lineHeight: 1.7,
              margin: 0,
              fontStyle: "italic",
            }}
          >
            &ldquo;{review.text}&rdquo;
          </p>
          <p
            style={{
              fontSize: "0.68rem",
              color: "rgba(255,255,255,.35)",
              marginTop: 10,
              marginBottom: 0,
            }}
          >
            — {review.user || "Anonymous"} · Ollypedia
          </p>
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", gap: 8, padding: "0 20px 20px" }}>
          <button
            onClick={handleShare}
            style={{
              flex: 1,
              padding: "11px 0",
              background: "#f59e0b",
              border: "none",
              borderRadius: 11,
              fontWeight: 800,
              fontSize: "0.84rem",
              cursor: "pointer",
              color: "#000",
              transition: "background .15s",
            }}
            onMouseEnter={(e) => ((e.target as HTMLElement).style.background = "#fbbf24")}
            onMouseLeave={(e) => ((e.target as HTMLElement).style.background = "#f59e0b")}
          >
            {copied ? "✅ Copied!" : "📤 Share Review"}
          </button>
          <button
            onClick={onClose}
            style={{
              padding: "11px 18px",
              background: "rgba(255,255,255,.07)",
              border: "1px solid rgba(255,255,255,.12)",
              borderRadius: 11,
              color: "rgba(255,255,255,.6)",
              fontSize: "0.84rem",
              cursor: "pointer",
              transition: "background .15s",
            }}
            onMouseEnter={(e) =>
              ((e.target as HTMLElement).style.background =
                "rgba(255,255,255,.12)")
            }
            onMouseLeave={(e) =>
              ((e.target as HTMLElement).style.background =
                "rgba(255,255,255,.07)")
            }
          >
            Close
          </button>
        </div>
      </div>

      <style>{`
        @keyframes rv-fadein  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes rv-slidein { from { transform: scale(.88) translateY(24px); opacity: 0; } to { transform: scale(1) translateY(0); opacity: 1; } }
        @keyframes rv-shimmer { 0% { background-position: 0%; } 100% { background-position: 200%; } }
      `}</style>
    </div>
  );
}

// ─── Main ReviewForm ───────────────────────────────────────────────────────────
export function ReviewForm({
  movieId,
  movieTitle,
  moviePoster,
  onSuccess,
  initialReviews = [], // ← NEW
}: ReviewFormProps) {
  const [user, setUser] = useState("");
  const [starRating, setStarRating] = useState(0); // 1–5 (UI)
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [shareReview, setShareReview] = useState<Review | null>(null);
  // ← NEW: local review list, starts with whatever the server sent
  const [reviews, setReviews] = useState<Review[]>(initialReviews);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (starRating === 0) {
      setError("Please select a star rating.");
      return;
    }
    if (!text.trim()) {
      setError("Please write your review.");
      return;
    }

    setLoading(true);
    try {
      // API expects 1–10; multiply the 1–5 star value × 2
      const apiRating = starRating * 2; // e.g. 5 stars → 10, 3 stars → 6

      const res = await fetch(`${API_BASE}/movies/${movieId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user: user.trim() || "Anonymous",
          rating: apiRating,
          text: text.trim(),
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error || "Submit failed");
      }

      const data = await res.json();

      // The confirmed review from the server (rating is 1–10)
      const confirmedReview: Review = data.review ?? {
        user: user.trim() || "Anonymous",
        rating: apiRating,
        text: text.trim(),
        date: new Date().toISOString(),
        likes: 0,
      };

      // ← NEW: instantly prepend to local list — no refresh needed
      setReviews((prev) => [confirmedReview, ...prev]);

      // Also bubble up to any parent that cares
      onSuccess?.(confirmedReview);

      // Reset form
      setStarRating(0);
      setText("");
      setUser("");

      // Show share modal
      setShareReview(confirmedReview);
    } catch (err: any) {
      setError(err.message || "Could not save your review. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Share modal — shown only after successful API response */}
      {shareReview && (
        <ShareModal
          review={shareReview}
          movieTitle={movieTitle}
          moviePoster={moviePoster}
          onClose={() => setShareReview(null)}
        />
      )}

      {/* ── Existing reviews list ── */}
      {reviews.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
          {reviews.slice(0, 5).map((r, i) => (
            <ReviewCard key={r._id ?? i} review={r} />
          ))}
        </div>
      ) : (
        <div
          style={{
            background: "#111",
            border: "1px solid #1f1f1f",
            borderRadius: 16,
            padding: "24px 20px",
            textAlign: "center",
            marginBottom: 24,
          }}
        >
          <svg
            width={32}
            height={32}
            viewBox="0 0 24 24"
            fill="none"
            stroke="#374151"
            strokeWidth={2}
            style={{ display: "block", margin: "0 auto 8px" }}
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <p style={{ fontSize: "0.85rem", color: "#6b7280", margin: 0 }}>
            No reviews yet. Be the first to review{" "}
            {movieTitle && <strong style={{ color: "#9ca3af" }}>{movieTitle}</strong>}!
          </p>
        </div>
      )}

      {/* ── Write a review form ── */}
      <div
        style={{
          background: "#131313",
          border: "1px solid #222",
          borderRadius: 16,
          padding: "22px 22px 24px",
        }}
      >
        <h3
          style={{
            fontWeight: 800,
            fontSize: "1.05rem",
            color: "#fff",
            marginBottom: 20,
            marginTop: 0,
          }}
        >
          ✍️ Write a Review
        </h3>

        <form
          onSubmit={submit}
          style={{ display: "flex", flexDirection: "column", gap: 16 }}
        >
          {/* Name */}
          <div>
            <label
              style={{
                fontSize: "0.75rem",
                color: "#9ca3af",
                display: "block",
                marginBottom: 6,
              }}
            >
              Your Name{" "}
              <span style={{ color: "#4b5563" }}>(optional)</span>
            </label>
            <input
              type="text"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              placeholder="Anonymous"
              maxLength={60}
              style={{
                width: "100%",
                padding: "9px 12px",
                boxSizing: "border-box",
                background: "#0d0d0d",
                border: "1px solid #2a2a2a",
                borderRadius: 8,
                color: "#fff",
                fontSize: "0.85rem",
                outline: "none",
                transition: "border-color .15s",
                fontFamily: "inherit",
              }}
              onFocus={(e) =>
                (e.target.style.borderColor = "rgba(245,158,11,.5)")
              }
              onBlur={(e) => (e.target.style.borderColor = "#2a2a2a")}
            />
          </div>

          {/* 5-star rating */}
          <div>
            <label
              style={{
                fontSize: "0.75rem",
                color: "#9ca3af",
                display: "block",
                marginBottom: 8,
              }}
            >
              Rating <span style={{ color: "#4b5563" }}>(out of 5 stars)</span>
            </label>
            <StarRating value={starRating} onChange={setStarRating} />
          </div>

          {/* Review text */}
          <div>
            <label
              style={{
                fontSize: "0.75rem",
                color: "#9ca3af",
                display: "block",
                marginBottom: 6,
              }}
            >
              Your Review
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              placeholder="Share your thoughts about this movie…"
              maxLength={1200}
              style={{
                width: "100%",
                padding: "9px 12px",
                boxSizing: "border-box",
                background: "#0d0d0d",
                border: "1px solid #2a2a2a",
                borderRadius: 8,
                color: "#fff",
                fontSize: "0.85rem",
                outline: "none",
                resize: "vertical",
                transition: "border-color .15s",
                fontFamily: "inherit",
                lineHeight: 1.6,
              }}
              onFocus={(e) =>
                (e.target.style.borderColor = "rgba(245,158,11,.5)")
              }
              onBlur={(e) => (e.target.style.borderColor = "#2a2a2a")}
            />
            <div
              style={{
                textAlign: "right",
                fontSize: "0.65rem",
                color: "#4b5563",
                marginTop: 3,
              }}
            >
              {text.length}/1200
            </div>
          </div>

          {/* Error */}
          {error && (
            <div
              style={{
                background: "rgba(239,68,68,.1)",
                border: "1px solid rgba(239,68,68,.25)",
                borderRadius: 8,
                padding: "10px 12px",
                fontSize: "0.78rem",
                color: "#f87171",
              }}
            >
              ⚠️ {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "12px 0",
              background: loading ? "#78350f" : "#f59e0b",
              border: "none",
              borderRadius: 11,
              fontWeight: 800,
              fontSize: "0.9rem",
              cursor: loading ? "not-allowed" : "pointer",
              color: "#000",
              transition: "background .2s, transform .15s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
            onMouseEnter={(e) => {
              if (!loading)
                (e.target as HTMLElement).style.background = "#fbbf24";
            }}
            onMouseLeave={(e) => {
              if (!loading)
                (e.target as HTMLElement).style.background = "#f59e0b";
            }}
          >
            {loading ? (
              <>
                <span
                  style={{
                    display: "inline-block",
                    width: 14,
                    height: 14,
                    border: "2px solid rgba(0,0,0,.3)",
                    borderTopColor: "#000",
                    borderRadius: "50%",
                    animation: "rv-spin .7s linear infinite",
                  }}
                />
                Submitting…
              </>
            ) : (
              "Submit Review"
            )}
          </button>
        </form>

        <style>{`
          @keyframes rv-spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    </>
  );
}