"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

// ─── Types ─────────────────────────────────────────────────────────────────────
interface ReviewFormProps {
  movieId: string;
  movieTitle?: string;
  moviePoster?: string;
  onSuccess?: (review: Review) => void;
  initialReviews?: Review[]; // ← NEW: pass existing reviews from page.tsx
  mode?: "all" | "form-only" | "reviews-only";
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
// This always hits Ollypedia's own /api/movies/[id]/review route (same Next.js
// app, talks to MongoDB directly via connectDB()). It must stay same-origin —
// it was previously built from NEXT_PUBLIC_API_URL, which points at the
// separate Express backend used for other endpoints. That backend has no
// matching route, so requests went to the wrong domain entirely, which is
// what surfaced in the browser as "Failed to fetch".
const API_BASE = "/api";

// How many reviews are shown per page in the grid below
const REVIEWS_PER_PAGE = 6;

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

// ─── ReviewCard (compact — renders a single review, stars out of 5) ─────────
function ReviewCard({ review }: { review: Review }) {
  const [expanded, setExpanded] = useState(false);
  // DB stores 1–10; convert to 1–5 for display
  const stars = Math.round(review.rating / 2);
  const CHAR_LIMIT = 180;
  const isLong = review.text.length > CHAR_LIMIT;
  const displayText = isLong && !expanded ? review.text.slice(0, CHAR_LIMIT) + "…" : review.text;

  return (
    <div
      style={{
        background: "#111",
        border: "1px solid #1f1f1f",
        borderRadius: 12,
        padding: "12px 14px",
        height: "100%",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <div>
        {/* Top row: avatar + name/date + star badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 7,
            gap: 8,
          }}
        >
          {/* Avatar + name + date (single line) */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
            <div
              style={{
                width: 26,
                height: 26,
                background: "rgba(245,158,11,.15)",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth={2}>
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <p
              style={{
                fontSize: "0.78rem",
                color: "#fff",
                margin: 0,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                minWidth: 0,
              }}
            >
              <span style={{ fontWeight: 700 }}>{review.user || "Anonymous"}</span>
              {review.date && (
                <span style={{ color: "#6b7280", fontWeight: 400 }}>
                  {" "}· {new Date(review.date).toLocaleDateString("en-IN")}
                </span>
              )}
            </p>
          </div>

          {/* Star badge — shows X/5 not X/10 */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              background: "rgba(234,179,8,.08)",
              border: "1px solid rgba(234,179,8,.2)",
              borderRadius: 6,
              padding: "3px 6px",
              flexShrink: 0,
            }}
          >
            {[1, 2, 3, 4, 5].map((s) => (
              <svg
                key={s}
                width={9}
                height={9}
                viewBox="0 0 24 24"
                fill={s <= stars ? "#f59e0b" : "none"}
                stroke={s <= stars ? "#f59e0b" : "#374151"}
                strokeWidth="1.5"
              >
                <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
              </svg>
            ))}
            <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "#f59e0b", marginLeft: 2 }}>
              {stars}/5
            </span>
          </div>
        </div>

        {/* Review text */}
        <p
          style={{
            fontSize: "0.8rem",
            color: "#d1d5db",
            lineHeight: 1.5,
            margin: 0,
            whiteSpace: "pre-line",
            wordBreak: "break-word",
          }}
        >
          {displayText}
        </p>
      </div>

      {isLong && (
        <div>
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            style={{
              marginTop: 8,
              fontSize: "0.72rem",
              fontWeight: 700,
              color: "#f59e0b",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
              display: "inline-flex",
              alignItems: "center",
              gap: 3,
            }}
          >
            {expanded ? "Show less ↑" : "View full review ↓"}
          </button>
        </div>
      )}
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
  const [downloading, setDownloading] = useState(false);
  const url = typeof window !== "undefined" ? window.location.href : "";
  const displayStars = Math.round(review.rating / 2);
  const starEmoji = "⭐".repeat(displayStars);

  const handleShare = async () => {
    const shareText =
      `${starEmoji} ${displayStars}/5 — ${movieTitle || "Movie Review"}\n\n` +
      `"${review.text}"\n\n` +
      `— ${review.user || "Anonymous"} on Ollypedia\n${url}`;

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: movieTitle, text: shareText, url });
      } catch (e: any) {
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

  const handleDownload = async () => {
    setDownloading(true);
    try {
      // ── Portrait card: 1080 × 1350 (Instagram 4:5) ──
      // We draw in a virtual 600 × 750 coordinate system and scale up by 1.8
      const SCALE  = 1.8;
      const CARD_W = 600;
      const CARD_H = 750;
      const PAD    = 32;

      // ── helpers defined early so they're available everywhere ──
      function roundRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
        c.beginPath();
        c.moveTo(x + r, y);
        c.lineTo(x + w - r, y);
        c.quadraticCurveTo(x + w, y, x + w, y + r);
        c.lineTo(x + w, y + h - r);
        c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        c.lineTo(x + r, y + h);
        c.quadraticCurveTo(x, y + h, x, y + h - r);
        c.lineTo(x, y + r);
        c.quadraticCurveTo(x, y, x + r, y);
        c.closePath();
      }
      function drawStar(c: CanvasRenderingContext2D, cx: number, cy: number, r: number, stroke: string, fill: string) {
        c.beginPath();
        for (let i = 0; i < 10; i++) {
          const angle  = (i * Math.PI) / 5 - Math.PI / 2;
          const radius = i % 2 === 0 ? r : r * 0.42;
          const x = cx + Math.cos(angle) * radius;
          const y = cy + Math.sin(angle) * radius;
          i === 0 ? c.moveTo(x, y) : c.lineTo(x, y);
        }
        c.closePath();
        if (fill !== "none") { c.fillStyle = fill; c.fill(); }
        c.strokeStyle = stroke; c.lineWidth = 1.2; c.stroke();
      }

      // ── Pre-load images ──
      let siteLogoImg: HTMLImageElement | null = null;
      let posterImg:   HTMLImageElement | null = null;

      await Promise.allSettled([
        // Website Logo
        (async () => {
          const li = new Image();
          li.crossOrigin = "anonymous";
          await new Promise<void>((res, rej) => {
            li.onload = () => res();
            li.onerror = rej;
            li.src = `/api/img-proxy?url=${encodeURIComponent(window.location.origin + "/logo.png")}`;
          });
          siteLogoImg = li;
        })(),
        // poster
        moviePoster ? (async () => {
          const pi = new Image();
          pi.crossOrigin = "anonymous";
          await new Promise<void>((res, rej) => { pi.onload = () => res(); pi.onerror = rej; pi.src = `/api/img-proxy?url=${encodeURIComponent(moviePoster)}`; });
          posterImg = pi;
        })() : Promise.resolve(),
      ]);

      // ── Measure quote box height to set total CARD_H ──
      const FONT_SIZE    = 16;
      const BOX_PAD      = 20;
      const MAX_Q_LINES  = 8;

      // temp canvas just for measuring
      const tmp = document.createElement("canvas");
      tmp.width = CARD_W; tmp.height = 10;
      const tc = tmp.getContext("2d")!;
      tc.font = `italic ${FONT_SIZE}px 'Georgia', serif`;
      const qMaxW = CARD_W - PAD * 2 - BOX_PAD * 2 - 8;
      const qWords = review.text.split(" ");
      const qLines: string[] = []; let qLine = "";
      for (const w of qWords) {
        const test = qLine ? `${qLine} ${w}` : w;
        if (tc.measureText(test).width > qMaxW) { qLines.push(qLine); qLine = w; if (qLines.length >= MAX_Q_LINES) break; }
        else qLine = test;
      }
      if (qLine && qLines.length < MAX_Q_LINES) qLines.push(qLine);
      if (qLines.length === MAX_Q_LINES && qLine !== qLines[MAX_Q_LINES - 1]) qLines[MAX_Q_LINES - 1] += "…";

      const lineH     = FONT_SIZE * 1.75;
      const BOX_H     = qLines.length * lineH + BOX_PAD * 2 + 32; // +32 for attribution line

      const HDR_H     = 86;   // header zone
      const DIV       = 1;
      const ROW_H     = 230;  // poster row zone (tight)
      const FOT_H     = 52;   // footer
      
      const content_H = 4 + HDR_H + DIV + 16 + ROW_H + DIV + 16 + BOX_H + 16 + DIV + FOT_H + 4;
      const extra     = Math.max(0, CARD_H - content_H);
      const gap       = extra / 3;

      const canvas = document.createElement("canvas");
      canvas.width = CARD_W * SCALE;
      canvas.height = CARD_H * SCALE;
      const ctx = canvas.getContext("2d")!;
      ctx.scale(SCALE, SCALE);

      // ── Background Gradient - Simple, sleek dark slate palette ──
      const bgGrad = ctx.createLinearGradient(0, 0, CARD_W, CARD_H);
      bgGrad.addColorStop(0, "#0f172a");
      bgGrad.addColorStop(0.5, "#0b0f19");
      bgGrad.addColorStop(1, "#020617");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, CARD_W, CARD_H);

      // ── Gold bars top & bottom ──
      const barGrad = ctx.createLinearGradient(0, 0, CARD_W, 0);
      barGrad.addColorStop(0, "transparent");
      barGrad.addColorStop(0.15, "#f59e0b");
      barGrad.addColorStop(0.5,  "#fde68a");
      barGrad.addColorStop(0.85, "#f59e0b");
      barGrad.addColorStop(1, "transparent");
      ctx.fillStyle = barGrad;
      ctx.fillRect(0, 0, CARD_W, 4);
      ctx.fillRect(0, CARD_H - 4, CARD_W, 4);

      // ── HEADER — Website Logo ──
      let curY = 4;
      const LOGO_X = PAD;

      if (siteLogoImg && (siteLogoImg as HTMLImageElement).width > 0) {
        const aspect = (siteLogoImg as HTMLImageElement).width / (siteLogoImg as HTMLImageElement).height;
        if (aspect > 1.3) {
          // Horizontal brand logo (logo.png)
          const drawH = 44;
          const drawW = Math.min(drawH * aspect, 240);
          const drawY = curY + (HDR_H - drawH) / 2;
          ctx.drawImage(siteLogoImg, LOGO_X, drawY, drawW, drawH);
        } else {
          // Icon/square logo
          const iconSize = 44;
          const iconY = curY + (HDR_H - iconSize) / 2;
          ctx.save();
          ctx.beginPath();
          roundRect(ctx, LOGO_X, iconY, iconSize, iconSize, 10);
          ctx.clip();
          ctx.drawImage(siteLogoImg, LOGO_X, iconY, iconSize, iconSize);
          ctx.restore();

          const WM_X = LOGO_X + iconSize + 12;
          ctx.fillStyle = "#f59e0b";
          ctx.font = "bold 19px 'Georgia', serif";
          ctx.fillText("OLLYPEDIA", WM_X, iconY + 24);
          ctx.fillStyle = "rgba(245,158,11,0.6)";
          ctx.font = "10.5px 'Georgia', serif";
          ctx.fillText("Your Odia Cinema Universe", WM_X, iconY + 39);
        }
      } else {
        // Fallback logo
        const LOGO_SIZE = 42;
        const LOGO_Y    = curY + (HDR_H - LOGO_SIZE) / 2;
        const lg = ctx.createLinearGradient(LOGO_X, LOGO_Y, LOGO_X + LOGO_SIZE, LOGO_Y + LOGO_SIZE);
        lg.addColorStop(0, "#f59e0b"); lg.addColorStop(1, "#b45309");
        ctx.fillStyle = lg;
        ctx.beginPath(); roundRect(ctx, LOGO_X, LOGO_Y, LOGO_SIZE, LOGO_SIZE, 10); ctx.fill();
        ctx.font = "22px serif";
        ctx.fillText("🎬", LOGO_X + 8, LOGO_Y + 30);

        const WM_X = LOGO_X + LOGO_SIZE + 10;
        ctx.fillStyle = "#f59e0b";
        ctx.font = "bold 19px 'Georgia', serif";
        ctx.letterSpacing = "1.5px";
        ctx.fillText("OLLYPEDIA", WM_X, LOGO_Y + 26);
        ctx.letterSpacing = "0px";
        ctx.fillStyle = "rgba(245,158,11,0.6)";
        ctx.font = "10.5px 'Georgia', serif";
        ctx.fillText("Your Odia Cinema Universe", WM_X, LOGO_Y + 40);
      }

      // MY REVIEW badge (right)
      ctx.font = "bold 9.5px 'Georgia', serif";
      const bdgTxt = "✦ MY REVIEW";
      const bdgW   = ctx.measureText(bdgTxt).width + 22;
      const bdgX   = CARD_W - PAD - bdgW;
      const bdgY   = curY + (HDR_H - 24) / 2;
      ctx.fillStyle = "rgba(245,158,11,0.1)";
      ctx.beginPath(); roundRect(ctx, bdgX, bdgY, bdgW, 24, 12); ctx.fill();
      ctx.strokeStyle = "rgba(245,158,11,0.35)"; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = "#f59e0b";
      ctx.fillText(bdgTxt, bdgX + 11, bdgY + 16);

      curY += HDR_H + gap;

      // ── divider ──
      const divider = (y: number) => {
        ctx.strokeStyle = "rgba(255,255,255,0.08)"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(CARD_W - PAD, y); ctx.stroke();
      };
      divider(curY); curY += DIV;

      // ── POSTER ROW ──
      curY += 16;
      const POSTER_W  = 148;
      const POSTER_H  = 196;
      const POSTER_X  = PAD;
      const POSTER_Y  = curY;

      if (posterImg) {
        ctx.save();
        ctx.beginPath(); roundRect(ctx, POSTER_X, POSTER_Y, POSTER_W, POSTER_H, 12); ctx.clip();
        ctx.drawImage(posterImg, POSTER_X, POSTER_Y, POSTER_W, POSTER_H);
        ctx.restore();
        // subtle inner shadow / border
        ctx.strokeStyle = "rgba(245,158,11,0.38)"; ctx.lineWidth = 1.5;
        ctx.beginPath(); roundRect(ctx, POSTER_X, POSTER_Y, POSTER_W, POSTER_H, 12); ctx.stroke();
        // glow beneath
        ctx.shadowColor = "rgba(245,158,11,0.18)"; ctx.shadowBlur = 18;
        ctx.beginPath(); roundRect(ctx, POSTER_X, POSTER_Y, POSTER_W, POSTER_H, 12); ctx.stroke();
        ctx.shadowBlur = 0;
      } else {
        ctx.fillStyle = "rgba(245,158,11,0.07)";
        ctx.beginPath(); roundRect(ctx, POSTER_X, POSTER_Y, POSTER_W, POSTER_H, 12); ctx.fill();
        ctx.strokeStyle = "rgba(245,158,11,0.2)"; ctx.lineWidth = 1;
        ctx.beginPath(); roundRect(ctx, POSTER_X, POSTER_Y, POSTER_W, POSTER_H, 12); ctx.stroke();
      }

      // Right column: title + rating label + stars
      const RX  = POSTER_X + POSTER_W + 18;
      const RW  = CARD_W - RX - PAD;
      let   ry  = POSTER_Y + 4;

      // "MY RATING" micro-label — sits on its own line ABOVE the title
      ctx.fillStyle = "rgba(245,158,11,0.7)";
      ctx.font = "bold 9px Georgia";
      ctx.fillText("MY RATING", RX, ry);

      ry += 30;

      // Title
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 20px Georgia";

      const lineHeight = 24;
      const maxWidth = RW;

      const words = (movieTitle || "Movie Review").split(" ");
      let line = "";
      const lines: string[] = [];

      for (let i = 0; i < words.length; i++) {
        const testLine = line ? line + " " + words[i] : words[i];
        const testWidth = ctx.measureText(testLine).width;

        if (testWidth > maxWidth && line) {
          lines.push(line);
          line = words[i];
          if (lines.length === 2) break;
        } else {
          line = testLine;
        }
      }

      if (line && lines.length < 2) lines.push(line);

      // Draw title
      lines.forEach((l, i) => {
        ctx.fillText(l, RX, ry + i * lineHeight);
      });

      // Move ry after title
      ry += lines.length * lineHeight + 12;

      // Stars
      const SS = 22; const SG = 4;
      let sx2 = RX;
      for (let s = 1; s <= 5; s++) {
        drawStar(ctx, sx2 + SS / 2, ry + SS / 2, SS / 2, s <= displayStars ? "#f59e0b" : "#2a2a2a", s <= displayStars ? "#f59e0b" : "none");
        sx2 += SS + SG;
      }
      ry += SS + 10;

      // Rating badge - Shows rating out of 5 stars
      const rateTxt = `${displayStars} / 5 Stars`;
      ctx.font = "bold 12px 'Georgia', serif";
      const rateW = ctx.measureText(rateTxt).width + 18;
      ctx.fillStyle = "rgba(245,158,11,0.12)";
      ctx.beginPath(); roundRect(ctx, RX, ry, rateW, 22, 6); ctx.fill();
      ctx.strokeStyle = "rgba(245,158,11,0.3)"; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = "#f59e0b";
      ctx.fillText(rateTxt, RX + 9, ry + 15);

      curY += ROW_H + gap;
      divider(curY); curY += DIV + 16;

      // ── QUOTE BOX ──
      const BOX_X = PAD;
      const BOX_W = CARD_W - PAD * 2;
      const BOX_Y = curY;

      ctx.fillStyle = "rgba(255,255,255,0.035)";
      ctx.beginPath(); roundRect(ctx, BOX_X, BOX_Y, BOX_W, BOX_H, 14); ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.09)"; ctx.lineWidth = 1; ctx.stroke();

      // Left gold bar
      ctx.fillStyle = "#f59e0b";
      ctx.beginPath(); roundRect(ctx, BOX_X, BOX_Y + 12, 3.5, BOX_H - 24, 2); ctx.fill();

      // Giant quote glyph
      ctx.fillStyle = "rgba(245,158,11,0.08)";
      ctx.font = "bold 72px 'Georgia', serif";
      ctx.fillText("\u201C", BOX_X + 14, BOX_Y + 58);

      // Quote text
      ctx.fillStyle = "#f1f5f9";
      ctx.font = `italic ${FONT_SIZE}px 'Georgia', serif`;
      qLines.forEach((ln, i) => {
        const prefix = i === 0 ? "\u201C" : "";
        const suffix = i === qLines.length - 1 ? "\u201D" : "";
        ctx.fillText(`${prefix}${ln}${suffix}`, BOX_X + BOX_PAD + 6, BOX_Y + BOX_PAD + 12 + i * lineH);
      });

      // Prominent User Name Attribution
      const attrY = BOX_Y + BOX_H - 18;
      const avatarX = BOX_X + BOX_PAD + 14;
      const avatarY = attrY - 5;

      // Avatar Circle Badge
      ctx.fillStyle = "rgba(245, 158, 11, 0.18)";
      ctx.beginPath();
      ctx.arc(avatarX, avatarY, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(245, 158, 11, 0.45)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Avatar Icon
      ctx.fillStyle = "#f59e0b";
      ctx.font = "11px sans-serif";
      ctx.fillText("👤", avatarX - 5, avatarY + 4);

      // User Name (Bright Pure White & Bold)
      const userNameStr = review.user || "Anonymous";
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 14px 'Georgia', serif";
      ctx.fillText(userNameStr, avatarX + 18, attrY);

      // Date & Site tag in soft gold
      const userNameW = ctx.measureText(userNameStr).width;
      const dtStr = review.date ? ` · ${review.date.split("T")[0]}` : "";
      ctx.fillStyle = "rgba(245, 158, 11, 0.75)";
      ctx.font = "12px 'Georgia', serif";
      ctx.fillText(`${dtStr} · ollypedia.in`, avatarX + 18 + userNameW + 4, attrY);

      curY += BOX_H + 16 + gap;
      divider(curY); curY += DIV;

      // ── FOOTER ──
      ctx.fillStyle = "rgba(245,158,11,0.38)";
      ctx.font = "11.5px 'Georgia', serif";
      ctx.textAlign = "center";
      ctx.fillText("ollypedia.in  ·  Your Odia Cinema Universe", CARD_W / 2, curY + FOT_H / 2 + 5);
      ctx.textAlign = "left";

      // ── Export PNG ──
      canvas.toBlob((blob) => {
        if (!blob) return;
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `${(movieTitle || "review").replace(/\s+/g, "-").toLowerCase()}-ollypedia-review.png`;
        a.click();
        URL.revokeObjectURL(a.href);
      }, "image/png");
    } finally {
      setDownloading(false);
    }
  };


  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,.92)",
        backdropFilter: "blur(22px)",
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
          maxWidth: 460,
          background: "linear-gradient(155deg, #160f00 0%, #0d0d0d 60%, #0a0a0a 100%)",
          border: "1px solid rgba(245,158,11,.4)",
          borderRadius: 24,
          overflow: "hidden",
          animation: "rv-slidein .3s cubic-bezier(.34,1.56,.64,1)",
          boxShadow: "0 0 0 1px rgba(245,158,11,.08), 0 50px 100px rgba(0,0,0,.98), inset 0 1px 0 rgba(245,158,11,.12)",
        }}
      >
        {/* Animated shimmer bar */}
        <div style={{
          height: 5,
          background: "linear-gradient(90deg, #92400e, #f59e0b, #fcd34d, #f59e0b, #92400e)",
          backgroundSize: "300%",
          animation: "rv-shimmer 3s ease infinite",
        }} />

        {/* ── Header: logo + success badge ── */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 22px 12px",
          borderBottom: "1px solid rgba(245,158,11,.1)",
        }}>
          {/* Ollypedia Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <img
              src="/logo.png"
              alt="Ollypedia Logo"
              style={{ height: 32, width: "auto", objectFit: "contain" }}
              onError={(e) => {
                const target = e.currentTarget;
                if (!target.dataset.tried) {
                  target.dataset.tried = "true";
                  target.src = "https://www.ollypedia.in/logo.png";
                }
              }}
            />
          </div>

          {/* Success badge */}
          <div style={{
            background: "rgba(34,197,94,.1)",
            border: "1px solid rgba(34,197,94,.28)",
            borderRadius: 999,
            padding: "4px 12px",
            fontSize: "0.65rem",
            fontWeight: 700,
            color: "#4ade80",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            display: "flex", alignItems: "center", gap: 5,
          }}>
            <svg width={9} height={9} viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth={3}>
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Submitted
          </div>
        </div>

        {/* ── Review card preview ── */}
        <div style={{ padding: "18px 22px 14px" }}>

          {/* Movie info row */}
          <div style={{ display: "flex", gap: 16, alignItems: "flex-start", marginBottom: 16 }}>
            {moviePoster && (
              <div style={{ flexShrink: 0, position: "relative" }}>
                <img
                  src={moviePoster}
                  alt={movieTitle || "Movie"}
                  style={{
                    width: 68, height: 96,
                    objectFit: "cover",
                    borderRadius: 12,
                    border: "1px solid rgba(245,158,11,.3)",
                    boxShadow: "0 12px 32px rgba(0,0,0,.7), 0 0 0 1px rgba(245,158,11,.08)",
                    display: "block",
                  }}
                />
                {/* Glow behind poster */}
                <div style={{
                  position: "absolute", inset: -4, borderRadius: 14,
                  background: "radial-gradient(ellipse at center, rgba(245,158,11,.15) 0%, transparent 70%)",
                  zIndex: -1,
                }} />
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: "0.6rem", fontWeight: 800,
                letterSpacing: "0.18em", textTransform: "uppercase",
                color: "rgba(245,158,11,.6)", marginBottom: 6,
              }}>
                ⭐ My Rating
              </div>
              <div style={{
                fontFamily: "'Georgia', serif",
                fontWeight: 800, fontSize: "1.15rem",
                color: "#fff", lineHeight: 1.2, marginBottom: 10,
              }}>
                {movieTitle || "Movie Review"}
              </div>
              {/* Stars */}
              <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                {[1,2,3,4,5].map((s) => (
                  <svg key={s} width={18} height={18} viewBox="0 0 24 24"
                    fill={s <= displayStars ? "#f59e0b" : "none"}
                    stroke={s <= displayStars ? "#f59e0b" : "#374151"}
                    strokeWidth="1.5"
                  >
                    <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
                  </svg>
                ))}
                <span style={{
                  marginLeft: 6, fontSize: "0.78rem",
                  fontWeight: 800, color: "#f59e0b",
                  background: "rgba(245,158,11,.12)",
                  border: "1px solid rgba(245,158,11,.2)",
                  borderRadius: 6, padding: "1px 7px",
                }}>
                  {displayStars}/5
                </span>
              </div>
            </div>
          </div>

          {/* Quote box */}
          <div style={{
            background: "rgba(255,255,255,.03)",
            border: "1px solid rgba(255,255,255,.07)",
            borderLeft: "3px solid rgba(245,158,11,.5)",
            borderRadius: "0 12px 12px 0",
            padding: "14px 16px",
            marginBottom: 6,
            position: "relative",
          }}>
            {/* Big quote mark */}
            <div style={{
              position: "absolute", top: -10, left: 12,
              fontSize: "3.5rem", lineHeight: 1,
              color: "rgba(245,158,11,.12)",
              fontFamily: "Georgia, serif",
              userSelect: "none",
            }}>&ldquo;</div>
            <p style={{
              fontSize: "0.88rem", color: "rgba(255,255,255,.82)",
              lineHeight: 1.7, margin: 0, fontStyle: "italic",
              fontFamily: "'Georgia', serif",
            }}>
              &ldquo;{review.text}&rdquo;
            </p>
            <div style={{
              marginTop: 12, paddingTop: 10,
              borderTop: "1px solid rgba(255,255,255,.08)",
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <div style={{
                width: 22, height: 22, borderRadius: "50%",
                background: "rgba(245,158,11,.18)", border: "1px solid rgba(245,158,11,.4)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "0.65rem", color: "#f59e0b", flexShrink: 0,
              }}>👤</div>
              <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#ffffff" }}>
                {review.user || "Anonymous"}
              </div>
              <div style={{ fontSize: "0.72rem", color: "rgba(245,158,11,.75)" }}>
                {review.date ? `· ${new Date(review.date).toISOString().split("T")[0]}` : ""} · ollypedia.in
              </div>
            </div>
          </div>
        </div>

        {/* ── Branding footer strip ── */}
        <div style={{
          margin: "0 22px 18px",
          background: "rgba(245,158,11,.06)",
          border: "1px solid rgba(245,158,11,.12)",
          borderRadius: 12,
          padding: "10px 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <div style={{ fontSize: "0.68rem", color: "rgba(245,158,11,.5)" }}>
            🎬 <strong style={{ color: "rgba(245,158,11,.75)", letterSpacing: "0.05em" }}>ollypedia.in</strong>
          </div>
          <div style={{ fontSize: "0.6rem", color: "rgba(255,255,255,.2)", letterSpacing: "0.06em" }}>
            ODIA CINEMA UNIVERSE
          </div>
        </div>

        {/* ── Action buttons ── */}
        <div style={{ display: "flex", gap: 8, padding: "0 22px 22px" }}>
          {/* Share */}
          <button
            onClick={handleShare}
            style={{
              flex: 1,
              padding: "11px 0",
              background: "linear-gradient(135deg, #f59e0b, #d97706)",
              border: "none",
              borderRadius: 12,
              fontWeight: 800,
              fontSize: "0.82rem",
              cursor: "pointer",
              color: "#000",
              transition: "opacity .15s, transform .1s",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
              boxShadow: "0 4px 16px rgba(245,158,11,.25)",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = "0.88"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
          >
            {copied ? (
              <><svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth={2.5}><polyline points="20 6 9 17 4 12"/></svg>Copied!</>
            ) : (
              <><svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth={2}><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>Share</>
            )}
          </button>

          {/* Download card */}
          <button
            onClick={handleDownload}
            disabled={downloading}
            style={{
              flex: 1,
              padding: "11px 0",
              background: "rgba(255,255,255,.06)",
              border: "1px solid rgba(245,158,11,.25)",
              borderRadius: 12,
              fontWeight: 700,
              fontSize: "0.82rem",
              cursor: downloading ? "not-allowed" : "pointer",
              color: "#f59e0b",
              transition: "background .15s",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
            }}
            onMouseEnter={(e) => { if (!downloading) (e.currentTarget as HTMLElement).style.background = "rgba(245,158,11,.1)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,.06)"; }}
          >
            {downloading ? (
              <span style={{
                display: "inline-block", width: 13, height: 13,
                border: "2px solid rgba(245,158,11,.3)", borderTopColor: "#f59e0b",
                borderRadius: "50%", animation: "rv-spin .7s linear infinite",
              }} />
            ) : (
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth={2}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
            )}
            {downloading ? "Saving…" : "Download Card"}
          </button>

          {/* Close */}
          <button
            onClick={onClose}
            style={{
              padding: "11px 14px",
              background: "transparent",
              border: "1px solid rgba(255,255,255,.1)",
              borderRadius: 12,
              color: "rgba(255,255,255,.35)",
              fontSize: "0.82rem",
              cursor: "pointer",
              transition: "background .15s, color .15s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,.06)";
              (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,.6)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "transparent";
              (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,.35)";
            }}
          >
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>

      <style>{`
        @keyframes rv-fadein  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes rv-slidein { from { transform: scale(.9) translateY(28px); opacity: 0; } to { transform: scale(1) translateY(0); opacity: 1; } }
        @keyframes rv-shimmer { 0% { background-position: 0%; } 100% { background-position: 300%; } }
        @keyframes rv-spin    { to { transform: rotate(360deg); } }
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
  mode = "all",
}: ReviewFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [user, setUser] = useState("");
  const [email, setEmail] = useState("");
  const [starRating, setStarRating] = useState(0); // 1–5 (UI)
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [shareReview, setShareReview] = useState<Review | null>(null);
  // local review list, starts with whatever the server sent
  const [reviews, setReviews] = useState<Review[]>(initialReviews);
  const [page, setPage] = useState(0); // 0-indexed, for the reviews list below

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!user.trim()) {
      setError("Please enter your name.");
      return;
    }
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (starRating === 0) {
      setError("Please select a star rating.");
      return;
    }
    if (!text.trim()) {
      setError("Please write your review.");
      return;
    }

    const normEmail = email.trim().toLowerCase();

    const alreadyInClient = reviews.some(
      (r: any) => r.email && r.email.trim().toLowerCase() === normEmail
    );

    if (alreadyInClient) {
      setError("A review with this email address has already been submitted for this movie.");
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
          user: user.trim(),
          email: email.trim(),
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
        user: user.trim(),
        rating: apiRating,
        text: text.trim(),
        date: new Date().toISOString(),
        likes: 0,
      };

      // instantly prepend to local list — no refresh needed
      setReviews((prev) => [confirmedReview, ...prev]);
      setPage(0); // jump back to page 1 so the new review is visible right away

      // Also bubble up to any parent that cares
      onSuccess?.(confirmedReview);

      // Reset form
      setStarRating(0);
      setText("");
      setUser("");
      setEmail("");

      // Show share modal
      setShareReview(confirmedReview);

    } catch (err: any) {
      setError(err.message || "Could not save your review. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // Clamp in case reviews shrinks/refreshes out from under the current page
  const totalPages = Math.max(1, Math.ceil(reviews.length / REVIEWS_PER_PAGE));
  const currentPage = Math.min(page, totalPages - 1);
  const pageStart = currentPage * REVIEWS_PER_PAGE;
  const visibleReviews = reviews.slice(pageStart, pageStart + REVIEWS_PER_PAGE);

  return (
    <>
      {/* Share modal — shown only after successful API response */}
      {shareReview && (
        <ShareModal
          review={shareReview}
          movieTitle={movieTitle}
          moviePoster={moviePoster}
          onClose={() => {
            setShareReview(null);
            startTransition(() => {
              router.refresh();
            });
          }}
        />
      )}

      {/* ── User Reviews List (only when mode is 'all' or 'reviews-only') ── */}
      {(mode === "all" || mode === "reviews-only") && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <div style={{ width: 4, height: 26, background: "#f59e0b", borderRadius: 4, flexShrink: 0 }} />
            <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#fff", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth={2}>
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              User Reviews
              <span style={{ color: "#6b7280", fontWeight: 400, fontSize: "1rem" }}>({reviews.length})</span>
            </h2>
          </div>

          {reviews.length > 0 ? (
            <>
              <div className="rv-grid" style={{ marginBottom: 14 }}>
                {visibleReviews.map((r, i) => (
                  <ReviewCard key={r._id ?? pageStart + i} review={r} />
                ))}
              </div>

              {totalPages > 1 && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 14,
                    marginBottom: 20,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={currentPage === 0}
                    style={{
                      padding: "8px 16px",
                      borderRadius: 8,
                      border: "1px solid #2a2a2a",
                      background: currentPage === 0 ? "#0d0d0d" : "#181818",
                      color: currentPage === 0 ? "#3f3f46" : "#e5e7eb",
                      fontSize: "0.8rem",
                      fontWeight: 700,
                      cursor: currentPage === 0 ? "not-allowed" : "pointer",
                      transition: "background .15s, color .15s",
                    }}
                    onMouseEnter={(e) => {
                      if (currentPage !== 0) (e.target as HTMLElement).style.background = "#222";
                    }}
                    onMouseLeave={(e) => {
                      if (currentPage !== 0) (e.target as HTMLElement).style.background = "#181818";
                    }}
                  >
                    ← Previous
                  </button>

                  <span style={{ fontSize: "0.78rem", color: "#6b7280", fontWeight: 600, whiteSpace: "nowrap" }}>
                    Page {currentPage + 1} of {totalPages}
                  </span>

                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={currentPage === totalPages - 1}
                    style={{
                      padding: "8px 16px",
                      borderRadius: 8,
                      border: "1px solid #2a2a2a",
                      background: currentPage === totalPages - 1 ? "#0d0d0d" : "#181818",
                      color: currentPage === totalPages - 1 ? "#3f3f46" : "#e5e7eb",
                      fontSize: "0.8rem",
                      fontWeight: 700,
                      cursor: currentPage === totalPages - 1 ? "not-allowed" : "pointer",
                      transition: "background .15s, color .15s",
                    }}
                    onMouseEnter={(e) => {
                      if (currentPage !== totalPages - 1) (e.target as HTMLElement).style.background = "#222";
                    }}
                    onMouseLeave={(e) => {
                      if (currentPage !== totalPages - 1) (e.target as HTMLElement).style.background = "#181818";
                    }}
                  >
                    Next →
                  </button>
                </div>
              )}
            </>
          ) : (
            <div
              style={{
                background: "#111",
                border: "1px solid #1f1f1f",
                borderRadius: 14,
                padding: "20px 18px",
                textAlign: "center",
                marginBottom: 20,
              }}
            >
              <svg
                width={28}
                height={28}
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
        </>
      )}

      <style>{`
        .rv-grid { display: flex; flex-direction: column; gap: 10px; }
        @media (min-width: 640px) {
          .rv-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
        }
      `}</style>

      {/* ── Write a review form (only when mode is 'all' or 'form-only') ── */}
      {(mode === "all" || mode === "form-only") && (
        <div
          style={{
            background: "#131313",
            border: "1px solid #222",
            borderRadius: 14,
            padding: "16px",
          }}
        >
          <h3
            style={{
              fontWeight: 800,
              fontSize: "0.95rem",
              color: "#fff",
              marginBottom: 12,
              marginTop: 0,
            }}
          >
            ✍️ Write a Review
          </h3>

          <form
            onSubmit={submit}
            style={{ display: "flex", flexDirection: "column", gap: 10 }}
          >
            {/* 2-Column Name & Email */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 8 }}>
              {/* Name */}
              <div>
                <label
                  style={{
                    fontSize: "0.7rem",
                    fontWeight: 600,
                    color: "#9ca3af",
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  Your Name <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  type="text"
                  value={user}
                  onChange={(e) => setUser(e.target.value)}
                  placeholder="Enter your name"
                  maxLength={60}
                  required
                  style={{
                    width: "100%",
                    padding: "7px 10px",
                    boxSizing: "border-box",
                    background: "#0d0d0d",
                    border: "1px solid #2a2a2a",
                    borderRadius: 8,
                    color: "#fff",
                    fontSize: "0.78rem",
                    outline: "none",
                    fontFamily: "inherit",
                  }}
                  onFocus={(e) =>
                    (e.target.style.borderColor = "rgba(245,158,11,.5)")
                  }
                  onBlur={(e) => (e.target.style.borderColor = "#2a2a2a")}
                />
              </div>

              {/* Email */}
              <div>
                <label
                  style={{
                    fontSize: "0.7rem",
                    fontWeight: 600,
                    color: "#9ca3af",
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  Your Email <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  maxLength={80}
                  required
                  style={{
                    width: "100%",
                    padding: "7px 10px",
                    boxSizing: "border-box",
                    background: "#0d0d0d",
                    border: "1px solid #2a2a2a",
                    borderRadius: 8,
                    color: "#fff",
                    fontSize: "0.78rem",
                    outline: "none",
                    fontFamily: "inherit",
                  }}
                  onFocus={(e) =>
                    (e.target.style.borderColor = "rgba(245,158,11,.5)")
                  }
                  onBlur={(e) => (e.target.style.borderColor = "#2a2a2a")}
                />
              </div>
            </div>

            {/* 5-star rating */}
            <div>
              <label
                style={{
                  fontSize: "0.7rem",
                  fontWeight: 600,
                  color: "#9ca3af",
                  display: "block",
                  marginBottom: 4,
                }}
              >
                Rating <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <StarRating value={starRating} onChange={setStarRating} size={22} />
            </div>

            {/* Review text */}
            <div>
              <label
                style={{
                  fontSize: "0.7rem",
                  fontWeight: 600,
                  color: "#9ca3af",
                  display: "block",
                  marginBottom: 4,
                }}
              >
                Your Review <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={2.5}
                placeholder="Share your thoughts about this movie…"
                maxLength={1000}
                required
                style={{
                  width: "100%",
                  padding: "7px 10px",
                  boxSizing: "border-box",
                  background: "#0d0d0d",
                  border: "1px solid #2a2a2a",
                  borderRadius: 8,
                  color: "#fff",
                  fontSize: "0.78rem",
                  outline: "none",
                  resize: "vertical",
                  fontFamily: "inherit",
                  lineHeight: 1.5,
                }}
                onFocus={(e) =>
                  (e.target.style.borderColor = "rgba(245,158,11,.5)")
                }
                onBlur={(e) => (e.target.style.borderColor = "#2a2a2a")}
              />
              <div
                style={{
                  textAlign: "right",
                  fontSize: "0.62rem",
                  color: "#4b5563",
                  marginTop: 2,
                }}
              >
                {text.length}/1000
              </div>
            </div>

            {/* Error */}
            {error && (
              <div
                style={{
                  background: "rgba(239,68,68,.1)",
                  border: "1px solid rgba(239,68,68,.25)",
                  borderRadius: 8,
                  padding: "8px 10px",
                  fontSize: "0.75rem",
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
                padding: "9px 0",
                background: loading ? "#78350f" : "#f59e0b",
                border: "none",
                borderRadius: 9,
                fontWeight: 800,
                fontSize: "0.82rem",
                cursor: loading ? "not-allowed" : "pointer",
                color: "#000",
                transition: "background .2s, transform .15s",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
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
                      width: 12,
                      height: 12,
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
      )}
    </>
  );
}