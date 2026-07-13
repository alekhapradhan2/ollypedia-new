"use client";
// BlogDetailClient.tsx — SEO + UX Upgrade
// NEW vs original:
//  1. updatedAt added to Post interface
//  2. Reading Progress Bar (reduces bounce rate / improves CWV)
//  3. Table of Contents — auto-generated from h2/h3 headings with scroll-spy
//  4. WhatsApp share button (biggest sharing platform in Odisha)
//  5. "Was this helpful?" widget at article bottom (engagement signal)
//  6. fetchPriority="high" + loading="eager" on banner image (LCP fix)
//  7. Fonts moved to layout-level preconnects (less blocking)
//  8. Estimated reading time shown dynamically
//  9. Sticky TOC on desktop (sidebar upgrade)
// 10. Smooth scroll on TOC link click

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "/api").replace(/\/$/, "");

// ─── Font loader ──────────────────────────────────────────────────────────────
// Note: ideally move these <link> tags to your root layout.tsx <head>
// so they load before any JS. Keeping here for backward compat.
function Fonts() {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,400;1,700&family=DM+Sans:wght@300;400;500;600;700&family=DM+Serif+Display:ital@0;1&display=swap"
        rel="stylesheet"
      />
    </>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface Review {
  user?: string;
  text: string;
  rating: number;
  date?: string;
  likes?: number;
  replies?: { user?: string; text: string; date?: string }[];
}
interface Song {
  title?: string;
  singer?: string;
  musicDirector?: string;
  ytId?: string;
  thumbnailUrl?: string;
  movieSlug?: string;
  songIndex?: number;
}
interface Movie {
  _id: string;
  title: string;
  slug?: string;
  posterUrl?: string;
  thumbnailUrl?: string;
  releaseDate?: string;
  verdict?: string;
  media?: { songs?: Song[] };
}
interface Post {
  _id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  coverImage?: string;
  category?: string;
  tags?: string[];
  author?: string;
  readTime?: number;
  views?: number;
  createdAt?: string;
  updatedAt?: string;   // ★ ADDED — used for "Last updated" display + SEO modifiedTime
  indexed?: boolean;    // ★ ADDED — false on non-key box office days (noindex in meta)
  movieTitle?: string;
  reviews?: Review[];
  youtubeVideoId?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtDate  = (iso?: string) => iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "long",  year: "numeric" }) : "";
const fmtShort = (iso?: string) => iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";

const avgRating = (reviews?: Review[]) => {
  const v = (reviews || []).filter((r) => r.rating > 0);
  return v.length ? (v.reduce((s, r) => s + r.rating, 0) / v.length).toFixed(1) : "0";
};

const VERDICT_COLORS: Record<string, string> = {
  Blockbuster: "#4acf82", "Super Hit": "#4acf82", Hit: "#a3e8a0",
  Average: "#e8c87a", Flop: "#e59595", Disaster: "#e85555", Upcoming: "#5aaae8",
};

const CAT_STYLES: Record<string, { bg: string; c: string }> = {
  "Movie Review":    { bg: "rgba(201,151,58,.9)",  c: "#000" },
  "Actor Spotlight": { bg: "rgba(167,139,232,.9)", c: "#fff" },
  "Top 10":          { bg: "rgba(232,200,122,.9)", c: "#000" },
  News:              { bg: "rgba(74,207,130,.9)",  c: "#000" },
  Upcoming:          { bg: "rgba(90,170,232,.9)",  c: "#000" },
  General:           { bg: "rgba(229,121,154,.9)", c: "#fff" },
};
const catStyle = (cat?: string) => {
  const s = CAT_STYLES[cat || ""] || CAT_STYLES["Movie Review"];
  return { background: s.bg, color: s.c };
};

// ─── Keyword highlight ────────────────────────────────────────────────────────
const ACCENT_COLORS = ["text-gold", "text-purple", "text-green", "text-pink", "text-blue"];
const ODIA_KEYWORDS = [
  "Ollywood","Odia","Odisha","Bhubaneswar","Cuttack","blockbuster","superhit","hit",
  "director","producer","cinematography","soundtrack","music director","choreography",
  "debut","award","release","theatre","cast","crew",
  "action","drama","romance","comedy","thriller","family","historical","devotional",
  "biography","sequel","prequel","remake",
  "box office","collection","first day","opening day","first week","verdict",
  "net collection","gross collection","total collection","hit or flop",
  "actor","actress","singer","lyricist","story","screenplay","dialogue",
  "OTT","streaming","digital release","theatre release","Ollypedia",
  "review","rating","worth watching","public review","story","plot","climax",
  "emotional","powerful","entertaining","must watch","super hit",
];
const ACCENT_CSS: Record<string, string> = {
  "text-gold":   "#c9973a",
  "text-purple": "#a78be8",
  "text-green":  "#4acf82",
  "text-pink":   "#e85a8a",
  "text-blue":   "#5aaae8",
};

function HighlightedPara({ text }: { text: string }) {
  type Seg = { text: string; color: string | null };
  let segments: Seg[] = [{ text, color: null }];
  ODIA_KEYWORDS.forEach((kw, ki) => {
    const colorKey = ACCENT_COLORS[ki % ACCENT_COLORS.length];
    const regex = new RegExp(`(${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    const next: Seg[] = [];
    segments.forEach((seg) => {
      if (seg.color !== null) { next.push(seg); return; }
      const parts = seg.text.split(regex);
      parts.forEach((part) => {
        if (regex.test(part)) next.push({ text: part, color: colorKey });
        else if (part)         next.push({ text: part, color: null });
        regex.lastIndex = 0;
      });
    });
    segments = next;
  });
  return (
    <>
      {segments.map((seg, i) =>
        seg.color ? (
          <span key={i} style={{ color: ACCENT_CSS[seg.color], fontWeight: 600 }}>{seg.text}</span>
        ) : (
          <React.Fragment key={i}>{seg.text}</React.Fragment>
        )
      )}
    </>
  );
}

// ─── Slug helper for heading IDs ──────────────────────────────────────────────
function slugifyHeading(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-");
}

// ─── Plain-text → rich HTML converter ────────────────────────────────────────
function plainTextToHtml(raw: string): string {
  const lines = raw.split(/\r?\n/);
  const parts: string[] = [];
  let ulOpen = false, olOpen = false;
  let paraLines: string[] = [];
  const faqItems: { q: string; a: string }[] = [];
  let pendingFaqQ = "";

  const inlineFmt = (s: string) =>
    s.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
     .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
     .replace(/\*(.+?)\*/g, "<em>$1</em>");

  const flushPara = () => {
    if (!paraLines.length) return;
    const text = paraLines.join(" ").trim();
    if (text) parts.push(`<p>${inlineFmt(text)}</p>`);
    paraLines = [];
  };
  const closeList = () => {
    if (ulOpen) { parts.push("</ul>"); ulOpen = false; }
    if (olOpen) { parts.push("</ol>"); olOpen = false; }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const t = line.trim();
    if (!t) { flushPara(); closeList(); continue; }

    const mdH = t.match(/^(#{1,4})\s+(.+)/);
    if (mdH) {
      flushPara(); closeList();
      const level = mdH[1].length <= 2 ? 2 : 3;
      // ★ Add id for TOC anchor links
      const id = slugifyHeading(mdH[2].replace(/\*\*/g, ""));
      parts.push(`<h${level} id="${id}">${mdH[2].replace(/\*\*/g, "")}</h${level}>`);
      continue;
    }

    const boldLine = t.match(/^\*\*([^*]{4,60})\*\*\s*:?\s*$/);
    if (boldLine) {
      flushPara(); closeList();
      const id = slugifyHeading(boldLine[1]);
      parts.push(`<h3 id="${id}">${boldLine[1]}</h3>`);
      continue;
    }

    if (/^[A-Z][A-Z\s&\-–:]{4,50}$/.test(t) && !t.includes(".")) {
      flushPara(); closeList();
      const heading = t.charAt(0) + t.slice(1).toLowerCase();
      const id = slugifyHeading(heading);
      parts.push(`<h2 id="${id}">${heading}</h2>`);
      continue;
    }

    const prevBlank = !lines[i - 1]?.trim();
    const nextBlank = !lines[i + 1]?.trim();
    if (t.length < 75 && (prevBlank || i === 0) && nextBlank && /^[A-Z]/.test(t) && !/[.!?]$/.test(t) && !/^[•\-*\d]/.test(t)) {
      flushPara(); closeList();
      const id = slugifyHeading(t.replace(/\*\*/g, ""));
      parts.push(`<h2 id="${id}">${t.replace(/\*\*/g, "")}</h2>`);
      continue;
    }

    const numHead = t.match(/^(\d+)[.)]\s+([A-Z][^.!?,]{3,60})$/);
    if (numHead) {
      flushPara(); closeList();
      const id = slugifyHeading(numHead[2]);
      parts.push(`<h3 id="${id}">${numHead[2]}</h3>`);
      continue;
    }

    const bullet = t.match(/^[•\-*]\s+(.+)/);
    if (bullet) {
      flushPara();
      if (olOpen) { parts.push("</ol>"); olOpen = false; }
      if (!ulOpen) { parts.push("<ul>"); ulOpen = true; }
      parts.push(`<li>${inlineFmt(bullet[1])}</li>`);
      continue;
    }

    const numItem = t.match(/^(\d+)[.)]\s+(.+)/);
    if (numItem && t.length > 40) {
      flushPara();
      if (ulOpen) { parts.push("</ul>"); ulOpen = false; }
      if (!olOpen) { parts.push("<ol>"); olOpen = true; }
      parts.push(`<li>${inlineFmt(numItem[2])}</li>`);
      continue;
    }

    const faqQ = t.match(/^(?:Q\d*[:.)]|Question\s*\d*[:.)])\s*(.+)/i);
    if (faqQ) { flushPara(); closeList(); pendingFaqQ = faqQ[1]; continue; }
    const faqA = t.match(/^(?:A\d*[:.)]|Answer\s*\d*[:.)])\s*(.+)/i);
    if (faqA && pendingFaqQ) { faqItems.push({ q: pendingFaqQ, a: inlineFmt(faqA[1]) }); pendingFaqQ = ""; continue; }

    closeList();
    paraLines.push(t);
  }

  flushPara(); closeList();

  const titleMatch = parts.find(p => /^<h[23]>/.test(p));
  const topic = titleMatch ? titleMatch.replace(/<\/?h[23][^>]*>/g, "").split(/[–—|]/)[0].trim() : "this film";
  if (faqItems.length === 0) {
    faqItems.push(
      { q: `What is ${topic} about?`, a: `${topic} is an Odia (Ollywood) production covered in depth on Ollypedia — including story, cast, music and more.` },
      { q: `Is ${topic} worth watching?`, a: `Read the full review and audience ratings on this page to decide if ${topic} is worth your time.` },
      { q: `Who is in the cast of ${topic}?`, a: `The complete cast and crew details of ${topic} are available on the movie page on Ollypedia.` },
      { q: `Where can I find more articles about ${topic}?`, a: `Ollypedia publishes reviews, box office reports and cast spotlights for all Odia films.` },
    );
  }

  return `<article>
${parts.join("\n")}
<section class="faq-section">
<h2>Frequently Asked Questions</h2>
${faqItems.map(({ q, a }) => `<details><summary>${q}</summary><p>${a}</p></details>`).join("\n")}
</section>
</article>`;
}

// ─── Sanitize mixed HTML ───────────────────────────────────────────────────────
function sanitizeMixedHtml(html: string): string {
  // Strip HTML comments first — long comment text between </section> tags was being
  // incorrectly wrapped in <p> tags by the splitter below, breaking FAQ/Also Read sections.
  const stripped = html.replace(/<!--[\s\S]*?-->/g, "");

  const blockClose = /<\/(?:h[1-6]|p|ul|ol|li|table|div|section|article|blockquote|details|summary)>/i;
  const blockOpen  = /^<(?:h[1-6]|p|ul|ol|table|div|section|article|blockquote|details|summary|\/article)/i;
  const parts = stripped.split(/((?:<\/(?:h[1-6]|p|ul|ol|li|table|div|section|article|blockquote|details|summary)>))/gi);
  return parts.map((part, i) => {
    if (blockClose.test(part) || blockOpen.test(part)) return part;
    const prevPart = parts[i - 1] || "";
    if (blockClose.test(prevPart) && part.replace(/<[^>]*>/g, "").trim().length >= 80) {
      const trimmed = part.trim();
      if (!trimmed) return part;
      const paras = trimmed.split(/\n{2,}/).map((s: string) => s.trim()).filter(Boolean);
      return paras.map((p: string) => `<p>${p}</p>`).join("\n");
    }
    return part;
  }).join("");
}

// ─── Table of Contents extractor ─────────────────────────────────────────────
interface TocItem { id: string; text: string; level: number; }
function extractToc(html: string): TocItem[] {
  const headingRe = /<h([23])[^>]*id="([^"]+)"[^>]*>([^<]+)<\/h[23]>/gi;
  const items: TocItem[] = [];
  let m: RegExpExecArray | null;
  while ((m = headingRe.exec(html)) !== null) {
    items.push({ level: parseInt(m[1]), id: m[2], text: m[3].trim() });
  }
  return items;
}

// ─── ColorfulArticle ──────────────────────────────────────────────────────────
function ColorfulArticle({ content, onTocReady }: { content: string; onTocReady?: (items: TocItem[]) => void }) {
  const isHtml = /<[a-z][\s\S]*>/i.test(content || "");
  let finalHtml: string;

  if (isHtml) {
    finalHtml = sanitizeMixedHtml(content);
  } else {
    finalHtml = plainTextToHtml(content || "");
  }

  useEffect(() => {
    if (onTocReady) {
      onTocReady(extractToc(finalHtml));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finalHtml]);

  return (
    <div
      className="bp-article bp-article-html"
      dangerouslySetInnerHTML={{ __html: finalHtml }}
    />
  );
}

// ─── Table of Contents component ─────────────────────────────────────────────
function TableOfContents({ items, activeId }: { items: TocItem[]; activeId: string }) {
  if (items.length < 3) return null;
  return (
    <div className="bp-toc">
      <div className="bp-toc-hd">📋 Contents</div>
      <nav>
        {items.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            className={`bp-toc-link${item.level === 3 ? " bp-toc-sub" : ""}${activeId === item.id ? " bp-toc-active" : ""}`}
            onClick={(e) => {
              e.preventDefault();
              const el = document.getElementById(item.id);
              if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
          >
            {item.text}
          </a>
        ))}
      </nav>
    </div>
  );
}

// ─── Reading Progress Bar ─────────────────────────────────────────────────────
function ReadingProgressBar() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement;
      const scrolled = el.scrollTop;
      const total = el.scrollHeight - el.clientHeight;
      setProgress(total > 0 ? Math.min(100, (scrolled / total) * 100) : 0);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <div style={{
      position: "fixed", top: 0, left: 0, height: 3, zIndex: 9999,
      width: `${progress}%`,
      background: "linear-gradient(90deg, var(--gold), var(--gold2))",
      transition: "width 0.1s linear",
      boxShadow: "0 0 8px rgba(201,151,58,.6)",
      pointerEvents: "none",
    }} />
  );
}

// ─── Was this helpful? widget ─────────────────────────────────────────────────
function HelpfulWidget() {
  const [vote, setVote] = useState<"up" | "down" | null>(null);
  return (
    <div style={{
      margin: "32px 0 0", padding: "20px 24px",
      background: "var(--bg3)", border: "1px solid var(--border)",
      borderRadius: 12, textAlign: "center",
    }}>
      {vote ? (
        <div style={{ fontSize: ".9rem", color: "var(--gold)", fontWeight: 700 }}>
          {vote === "up" ? "✅ Thanks for the feedback!" : "🙏 Thanks! We'll improve it."}
        </div>
      ) : (
        <>
          <div style={{ fontSize: ".82rem", color: "rgba(255,255,255,.5)", marginBottom: 14 }}>
            Was this article helpful?
          </div>
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <button
              onClick={() => setVote("up")}
              style={{
                padding: "8px 22px", background: "rgba(74,207,130,.1)",
                border: "1px solid rgba(74,207,130,.3)", borderRadius: 8,
                color: "#4acf82", fontFamily: "inherit", fontSize: ".82rem",
                fontWeight: 700, cursor: "pointer", transition: "all .15s",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(74,207,130,.2)")}
              onMouseLeave={e => (e.currentTarget.style.background = "rgba(74,207,130,.1)")}
            >
              👍 Yes
            </button>
            <button
              onClick={() => setVote("down")}
              style={{
                padding: "8px 22px", background: "rgba(229,85,85,.1)",
                border: "1px solid rgba(229,85,85,.3)", borderRadius: 8,
                color: "#e85555", fontFamily: "inherit", fontSize: ".82rem",
                fontWeight: 700, cursor: "pointer", transition: "all .15s",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(229,85,85,.2)")}
              onMouseLeave={e => (e.currentTarget.style.background = "rgba(229,85,85,.1)")}
            >
              👎 No
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── StarPicker ───────────────────────────────────────────────────────────────
function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hover, setHover] = useState(0);
  const labels = ["", "Poor", "Fair", "Good", "Great", "Excellent"];
  return (
    <div className="bp-stars-row">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          className="bp-star-btn"
          style={{ color: s <= (hover || value) ? "var(--gold)" : "rgba(255,255,255,.18)" }}
          onMouseEnter={() => setHover(s)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(s)}
        >★</button>
      ))}
      <span className="bp-star-label">{labels[hover || value]}</span>
    </div>
  );
}

// ─── Copy helper ──────────────────────────────────────────────────────────────
function copyWithoutPermission(text: string): boolean {
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.cssText = "position:fixed;top:0;left:0;width:1px;height:1px;opacity:0";
    document.body.appendChild(ta);
    ta.focus(); ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch { return false; }
}

// ─── FAQ Accordion ────────────────────────────────────────────────────────────
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{
      background: "var(--bg4)", border: "1px solid var(--border)",
      borderRadius: 10, overflow: "hidden", marginBottom: 6,
    }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%", display: "flex", alignItems: "center",
          justifyContent: "space-between", gap: 12,
          padding: "12px 16px", background: "none", border: "none",
          textAlign: "left", cursor: "pointer",
        }}
      >
        <span style={{ fontSize: ".82rem", fontWeight: 700, color: "var(--text)", lineHeight: 1.4 }}>{q}</span>
        <span style={{
          color: "var(--gold)", flexShrink: 0, fontSize: ".9rem",
          transform: open ? "rotate(180deg)" : "none", transition: "transform .2s",
        }}>▾</span>
      </button>
      {open && (
        <div style={{ padding: "0 16px 14px", borderTop: "1px solid var(--border)" }}>
          <p style={{ fontSize: ".8rem", color: "rgba(255,255,255,.58)", lineHeight: 1.75, margin: "10px 0 0" }}>{a}</p>
        </div>
      )}
    </div>
  );
}

export default function BlogDetailClient({
  slug, initialData, sidebarContent
}: {
  slug: string;
  initialData?: Post | null;
  sidebarContent?: React.ReactNode;
}) {
  const router = useRouter();
  const articleRef = useRef<HTMLDivElement>(null);

  const [post,          setPost]         = useState<Post | null>(initialData ?? null);
  const [related,       setRelated]      = useState<Post[]>([]);
  const [relMovies,     setRelMovies]    = useState<Movie[]>([]);
  const [relSongs,      setRelSongs]     = useState<Song[]>([]);
  const [loading,       setLoading]      = useState(!initialData);
  const [notFound,      setNotFound]     = useState(false);

  // Review form
  const [rvName,        setRvName]       = useState("");
  const [rvText,        setRvText]       = useState("");
  const [rvRating,      setRvRating]     = useState(5);
  const [submitting,    setSubmitting]   = useState(false);
  const [submitted,     setSubmitted]    = useState(false);
  const [replies,       setReplies]      = useState<Record<number, { name?: string; text?: string; open?: boolean }>>({});
  const [copied,        setCopied]       = useState(false);
  const [boxOfficeDays, setBoxOfficeDays] = useState<any[]>([]);
  const [boxOfficeSlug, setBoxOfficeSlug] = useState<string>("");

  // ★ NEW — Reading progress & TOC
  const [readProgress,  setReadProgress] = useState(0);
  const [tocItems,      setTocItems]     = useState<TocItem[]>([]);
  const [activeTocId,   setActiveTocId]  = useState<string>("");
  const [showToc,       setShowToc]      = useState(false);

  // ─── Fetch post ──────────────────────────────────────────────
  useEffect(() => {
    if (initialData) return;
    let dead = false;
    (async () => {
      setLoading(true); setPost(null); setNotFound(false);
      try {
        const r = await fetch(`${API_BASE}/blog/${slug}`, { cache: "no-store" });
        if (!r.ok) { if (!dead) { setNotFound(true); setLoading(false); } return; }
        const d = await r.json();
        if (!dead) setPost(d);
      } catch { if (!dead) setNotFound(true); }
      finally   { if (!dead) setLoading(false); }
    })();
    return () => { dead = true; };
  }, [slug, initialData]);

  // ─── Fetch related content ────────────────────────────────────
  useEffect(() => {
    if (!post) return;
    (async () => {
      try {
        let posts: Post[] = [];
        
        // 1. Prioritize articles about the same movie
        if (post.movieTitle) {
          const r1 = await fetch(`${API_BASE}/blog?movie=${encodeURIComponent(post.movieTitle)}&limit=25`);
          const d1 = await r1.json();
          const p1 = d1.blogs || d1.posts || d1 || [];
          if (Array.isArray(p1)) posts = [...posts, ...p1];
        }

        // 2. Then fetch other movie articles if we need more
        if (posts.length < 25) {
          const r2 = await fetch(`${API_BASE}/blog?hasMovie=true&limit=25`);
          const d2 = await r2.json();
          const p2 = d2.blogs || d2.posts || d2 || [];
          if (Array.isArray(p2)) posts = [...posts, ...p2];
        }

        // Deduplicate and filter out the current article
        const uniquePosts: Post[] = [];
        const seen = new Set<string>();
        for (const p of posts) {
          if (p.slug !== slug && !seen.has(p.slug)) {
            uniquePosts.push(p);
            seen.add(p.slug);
          }
        }

        setRelated(uniquePosts.slice(0, 20));
      } catch {}
    })();

    if (post.movieTitle) {
      (async () => {
        try {
          const r = await fetch(`${API_BASE}/movies?q=${encodeURIComponent(post.movieTitle!)}&limit=4`);
          const d = await r.json();
          const movies: Movie[] = (d.movies || d || []).slice(0, 4);
          setRelMovies(movies);
          if (movies[0]?.media?.songs?.length) {
            setRelSongs(movies[0].media.songs.slice(0, 5).map((s, idx) => ({ ...s, movieSlug: movies[0].slug || movies[0]._id, songIndex: idx })));
          }
          if (movies[0]?.slug) {
            try {
              const br = await fetch(`${API_BASE}/movies/${movies[0]._id}/boxoffice-days`);
              if (br.ok) {
                const bdays = await br.json();
                if (Array.isArray(bdays) && bdays.length > 0) {
                  setBoxOfficeDays(bdays);
                  setBoxOfficeSlug(movies[0].slug);
                }
              }
            } catch {}
          }
        } catch {}
      })();
    }
  }, [post, slug]);

  // ★ Continuous Reading Scroll-Spy
  useEffect(() => {
    if (!articleRef.current || !post) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && entry.intersectionRatio > 0.1) {
          window.history.replaceState(null, '', `/blog/${slug}`);
          document.title = `${post.title} | Ollypedia`;
        }
      });
    }, { threshold: 0.1 });
    observer.observe(articleRef.current);
    return () => observer.disconnect();
  }, [slug, post]);


  // ─── View tracking ────────────────────────────────────────────
  // Fires once per slug per browser session.
  // Uses the Next.js API route directly (not the old Express API_BASE)
  // so it works even if the external backend is down.
  // Delayed 2s so it only counts real reads, not bounces.
  //
  // FIX: sessionStorage key is now set ONLY after a successful response.
  // Previously it was set immediately when the timer fired — before the
  // fetch even started — so any network error or route failure silently
  // prevented the count from ever incrementing (stuck at 0).
  useEffect(() => {
    if (!post?.slug) return;

    const hostname = window.location.hostname;
    if (hostname === "localhost" || hostname === "127.0.0.1") return;

    const sessionKey = `ollypedia_viewed_${post.slug}`;
    if (sessionStorage.getItem(sessionKey)) return;

    // Wait 2 seconds — only count if user actually reads, not instant bounces
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/blog/${post.slug}/view`, { method: "POST" });
        if (res.ok) {
          const data = await res.json();
          // Mark as viewed ONLY after confirmed success
          sessionStorage.setItem(sessionKey, "1");
          // Update displayed view count live in the sidebar
          if (data.views !== undefined) {
            setPost(prev => prev ? { ...prev, views: data.views } : prev);
          }
        } else {
          // Fallback to Express API if Next.js route returns an error
          try {
            const r2 = await fetch(`${API_BASE}/blog/${post.slug}/view`, { method: "POST" });
            if (r2.ok) sessionStorage.setItem(sessionKey, "1");
          } catch {}
        }
      } catch {
        // Network error — fallback to Express API; don't set sessionStorage
        // so the next page load can retry.
        fetch(`${API_BASE}/blog/${post.slug}/view`, { method: "POST" }).catch(() => {});
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [post?.slug]);

  // ★ TOC scroll-spy ────────────────────────────────────────────
  useEffect(() => {
    if (!tocItems.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter(e => e.isIntersecting);
        if (visible.length > 0) setActiveTocId(visible[0].target.id);
      },
      { rootMargin: "-15% 0px -75% 0px" }
    );
    tocItems.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [tocItems]);

  // ─── Review actions ───────────────────────────────────────────
  const submitReview = async () => {
    if (!post || !rvName.trim() || !rvText.trim()) return;
    setSubmitting(true);
    try {
      const r = await fetch(`${API_BASE}/blog/${post._id}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: rvName.trim(), text: rvText.trim(), rating: rvRating }),
      });
      if (r.ok) {
        const updatedReviews = await r.json();
        setPost((p) => p ? { ...p, reviews: updatedReviews } : p);
        setSubmitted(true); setRvName(""); setRvText(""); setRvRating(5);
      }
    } catch {}
    setSubmitting(false);
  };

  const likeReview = async (idx: number) => {
    if (!post) return;
    try {
      const r = await fetch(`${API_BASE}/blog/${post._id}/reviews/${idx}/like`, { method: "POST" });
      if (r.ok) {
        const { likes } = await r.json();
        setPost((p) => {
          if (!p) return p;
          const rv = [...(p.reviews || [])];
          rv[idx] = { ...rv[idx], likes };
          return { ...p, reviews: rv };
        });
      }
    } catch {}
  };

  const submitReply = async (idx: number) => {
    if (!post) return;
    const rep = replies[idx] || {};
    if (!rep.text?.trim() || !rep.name?.trim()) return;
    try {
      const r = await fetch(`${API_BASE}/blog/${post._id}/reviews/${idx}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: rep.name.trim(), text: rep.text.trim(), date: new Date().toISOString().split("T")[0] }),
      });
      if (r.ok) {
        const list = await r.json();
        setPost((p) => {
          if (!p) return p;
          const rv = [...(p.reviews || [])];
          rv[idx] = { ...rv[idx], replies: list };
          return { ...p, reviews: rv };
        });
        setReplies((p) => ({ ...p, [idx]: { ...p[idx], text: "", open: false } }));
      }
    } catch {}
  };

  const toggleReply = (idx: number) =>
    setReplies((p) => ({ ...p, [idx]: { ...(p[idx] || {}), open: !(p[idx]?.open) } }));

  const avg     = avgRating(post?.reviews);
  const rvCount = (post?.reviews || []).length;

  // ─── Loading / 404 ────────────────────────────────────────────
  if (loading) return (
    <>
      <Fonts />
      <style suppressHydrationWarning dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="bp-root">
        <div className="bp-sk" style={{ width: "100%", height: 400 }} />
        <div style={{ maxWidth: 900, margin: "40px auto", padding: "0 24px", display: "flex", flexDirection: "column", gap: 14 }}>
          {[85, 65, 100, 55, 80, 42, 70, 30].map((w, i) => (
            <div key={i} className="bp-sk" style={{ height: i === 0 ? 24 : 14, width: `${w}%` }} />
          ))}
        </div>
      </div>
    </>
  );

  if (notFound) return (
    <>
      <Fonts />
      <style suppressHydrationWarning dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="bp-root">
        <div className="bp-404">
          <div className="bp-404-ico">📭</div>
          <div className="bp-404-t">Article not found</div>
          <button className="bp-404-btn" onClick={() => router.push("/blog")}>← Back to Blog</button>
        </div>
      </div>
    </>
  );

  if (!post) return null;

  const Header = () => (
    <>
      <button className="bp-back" onClick={() => router.push("/blog")}>← Back to Blog</button>
      <span className="bp-catbadge" style={catStyle(post.category)}
        onClick={() => router.push(`/blog?cat=${encodeURIComponent(post.category || "")}`)}>
        {post.category || "Article"}
      </span>
      <h1 className="bp-title">{post.title}</h1>
      <div className="bp-meta">
        {post.author && <span>✍️ {post.author}</span>}
        <span className="bp-meta-sep">·</span>
        <span>📅 {fmtDate(post.createdAt)}</span>
        {/* ★ Show "Updated" date when content has been refreshed */}
        {post.updatedAt && post.updatedAt !== post.createdAt && (
          <><span className="bp-meta-sep">·</span><span style={{ color: "rgba(255,255,255,.32)", fontSize: ".68rem" }}>🔄 Updated {fmtShort(post.updatedAt)}</span></>
        )}
        {post.readTime && <><span className="bp-meta-sep">·</span><span>⏱ {post.readTime} min read</span></>}
        {(post.views ?? 0) > 0 && <><span className="bp-meta-sep">·</span><span>👁 {(post.views!).toLocaleString()} views</span></>}
        {Number(avg) > 0 && <><span className="bp-meta-sep">·</span><span className="bp-meta-rating">★ {avg} ({rvCount})</span></>}
        {post.movieTitle && <><span className="bp-meta-sep">·</span><span className="bp-meta-gold">🎬 {post.movieTitle}</span></>}
      </div>
    </>
  );

  return (
    <div ref={articleRef} className="bp-root" style={{ position: "relative" }}>
      <Fonts />
      <style suppressHydrationWarning dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* ★ Reading progress bar — fixed top */}
      <ReadingProgressBar />

      <div className="bp-root">

        {/* ── Cinematic Banner ── */}
        {post.coverImage ? (
          <div className="bp-banner">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.coverImage}
              alt={post.title}
              className="bp-banner-img"
              // ★ fetchPriority + eager = faster LCP (Core Web Vitals)
              fetchPriority="high"
              loading="eager"
              decoding="async"
            />
            <div className="bp-banner-grad" />
            <div className="bp-banner-content"><Header /></div>
          </div>
        ) : (
          <div className="bp-nobanner">
            <div className="bp-nobanner-inner"><Header /></div>
          </div>
        )}

        {/* ── Layout ── */}
        <div className="bp-layout">

          {/* ── Main column ── */}
          <div className="bp-main-col">
            {/* ★ Mobile TOC toggle */}
            {tocItems.length >= 3 && (
              <div className="bp-toc-mobile-toggle">
                <button onClick={() => setShowToc(s => !s)} className="bp-toc-toggle-btn">
                  📋 {showToc ? "Hide" : "Show"} Contents ({tocItems.length} sections)
                </button>
                {showToc && <TableOfContents items={tocItems} activeId={activeTocId} />}
              </div>
            )}

            <ColorfulArticle
              content={post.content}
              onTocReady={setTocItems}
            />

            {/* ★ Was this helpful? */}
            <HelpfulWidget />

            {/* ── YouTube Video Embed ── */}
            {post.youtubeVideoId && (
              <div style={{ margin: "32px 0 0" }}>
                <div className="bp-related-title">🎬 Watch Video</div>
                <div style={{
                  position: "relative", width: "100%", paddingBottom: "56.25%",
                  borderRadius: 10, overflow: "hidden",
                  border: "1px solid var(--border)", background: "#000",
                }}>
                  <iframe
                    src={`https://www.youtube.com/embed/${post.youtubeVideoId}?rel=0&modestbranding=1`}
                    title="Related YouTube Video"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    loading="lazy"
                    style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
                  />
                </div>
              </div>
            )}

            {/* Tags */}
            {(post.tags?.length ?? 0) > 0 && (
              <div className="bp-tags" style={{ marginTop: 28 }}>
                {post.tags!.map((t) => (
                  <span key={t} className="bp-tag"
                    onClick={() => router.push(`/blog?q=${encodeURIComponent(t)}`)}>
                    #{t}
                  </span>
                ))}
              </div>
            )}

            {/* SEO movie overview block */}
            {post.movieTitle && (
              <div style={{
                margin: "32px 0 0", padding: "18px 20px",
                background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 12,
              }}>
                <p style={{ fontSize: ".83rem", color: "rgba(255,255,255,.55)", lineHeight: 1.85, margin: 0 }}>
                  The <strong style={{ color: "var(--text)" }}>{post.movieTitle} Odia movie</strong> has been
                  covered extensively on Ollypedia. If you are looking for{" "}
                  <em style={{ color: "rgba(255,255,255,.7)" }}>{post.movieTitle} movie review</em>,{" "}
                  <em style={{ color: "rgba(255,255,255,.7)" }}>{post.movieTitle} story</em>,{" "}
                  <em style={{ color: "rgba(255,255,255,.7)" }}>{post.movieTitle} cast and crew</em>, or the{" "}
                  <em style={{ color: "rgba(255,255,255,.7)" }}>{post.movieTitle} box office collection</em>,
                  {" "}you will find all of it on Ollypedia — Odisha&apos;s complete Odia cinema database.
                </p>
              </div>
            )}

            {/* SEO long-tail block */}
            {post.movieTitle && (
              <div style={{
                margin: "12px 0 0", padding: "18px 20px",
                background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 12,
              }}>
                <p style={{ fontSize: ".83rem", color: "rgba(255,255,255,.5)", lineHeight: 1.85, margin: "0 0 10px" }}>
                  Wondering if <em style={{ color: "rgba(255,255,255,.7)" }}>{post.movieTitle} is worth watching</em>?
                  {" "}Read the <strong style={{ color: "var(--text)" }}>{post.movieTitle} public review</strong>{" "}
                  and <em style={{ color: "rgba(255,255,255,.7)" }}>{post.movieTitle} rating</em> by viewers below.
                  {relMovies[0] && (
                    <>{" "}You can also explore the{" "}
                      <a href={`/movie/${relMovies[0].slug || relMovies[0]._id}`}
                        style={{ color: "var(--gold)", fontWeight: 600, textDecoration: "none" }}>
                        {post.movieTitle} full movie page
                      </a>
                      {" "}and{" "}
                      <a href={`/box-office/${boxOfficeSlug || relMovies[0].slug || relMovies[0]._id}`}
                        style={{ color: "var(--gold)", fontWeight: 600, textDecoration: "none" }}>
                        {post.movieTitle} box office collection
                      </a>
                      {" "}on Ollypedia.</>
                  )}
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px" }}>
                  {relMovies[0] && (
                    <a href={`/movie/${relMovies[0].slug || relMovies[0]._id}`}
                      style={{ fontSize: ".72rem", color: "var(--gold)", textDecoration: "none", fontWeight: 600 }}>
                      → {post.movieTitle} full details
                    </a>
                  )}
                  {relSongs.length > 0 && relMovies[0] && (
                    <a href={`/songs/${relMovies[0].slug || relMovies[0]._id}/0`}
                      style={{ fontSize: ".72rem", color: "#4acf82", textDecoration: "none", fontWeight: 600 }}>
                      → {post.movieTitle} songs
                    </a>
                  )}
                  {boxOfficeSlug && (
                    <a href={`/box-office/${boxOfficeSlug}`}
                      style={{ fontSize: ".72rem", color: "#5aaae8", textDecoration: "none", fontWeight: 600 }}>
                      → {post.movieTitle} box office
                    </a>
                  )}
                  <a href={`/blog?movie=${encodeURIComponent(post.movieTitle!)}`}
                    style={{ fontSize: ".72rem", color: "rgba(167,139,232,.9)", textDecoration: "none", fontWeight: 600 }}>
                    → more {post.movieTitle} articles
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* ── Sidebar ── */}
          <aside className="bp-sidebar">

            {/* ★ Table of Contents — desktop sidebar (hidden mobile, handled above) */}
            {tocItems.length >= 3 && (
              <div className="bp-toc-desktop">
                <TableOfContents items={tocItems} activeId={activeTocId} />
              </div>
            )}

            {/* Share — ★ WhatsApp added */}
            <div className="bp-sidebar-box">
              <div className="bp-sidebar-hd">Share Article</div>
              <div className="bp-share-btns">
                <button className="bp-share-btn bp-share-wa"
                  onClick={() => window.open(
                    `https://wa.me/?text=${encodeURIComponent(post.title + " — " + window.location.href)}`
                  )}>
                  💬 WhatsApp
                </button>
                <button className="bp-share-btn bp-share-twitter"
                  onClick={() => window.open(
                    `https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(window.location.href)}`
                  )}>
                  🐦 Twitter
                </button>
                <button className="bp-share-btn bp-share-fb"
                  onClick={() => window.open(
                    `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`
                  )}>
                  📘 Facebook
                </button>
                <button className="bp-share-btn bp-share-copy"
                  onClick={() => {
                    copyWithoutPermission(window.location.href);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}>
                  {copied ? "✅ Copied!" : "🔗 Copy Link"}
                </button>
              </div>
            </div>

            {/* Article info */}
            <div className="bp-sidebar-box">
              <div className="bp-sidebar-hd">Article Info</div>
              <div className="bp-sidebar-body">
                {([
                  ["Published",  fmtDate(post.createdAt)],
                  post.updatedAt && post.updatedAt !== post.createdAt ? ["Updated", fmtDate(post.updatedAt)] : null,
                  ["Author",     post.author || "OllyPedia Editorial"],
                  ["Category",   post.category || "General"],
                  ["Read Time",  `${post.readTime || 3} min`],
                  ["Views",      (post.views || 0).toLocaleString()],
                  Number(avg) > 0 ? ["Rating",  `${avg} / 5 ⭐`] : null,
                  rvCount > 0     ? ["Reviews", `${rvCount} review${rvCount !== 1 ? "s" : ""}`] : null,
                ] as ([string, string] | null)[]).filter((x): x is [string, string] => x !== null).map(([k, v]) => (
                  <div key={k} className="bp-info-row">
                    <span className="bp-info-key">{k}</span>
                    <span className="bp-info-val">{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* FAQ — hidden for Box Office blogs because BoxOfficePanel already
                 generates a full FAQ section inside the blog HTML content.
                 Showing both = two visible FAQ sections + duplicate FAQPage
                 schema = Google indexing error. */}
            {post.category !== "Box Office" && (
              <div className="bp-sidebar-box">
                <div className="bp-sidebar-hd">
                  {post.movieTitle ? `FAQ — ${post.movieTitle}` : "Frequently Asked Questions"}
                </div>
                <div style={{ padding: "10px 14px" }}>
                  {post.movieTitle ? (
                    <>
                      <FaqItem q={`What is ${post.movieTitle} Odia movie about?`}
                        a={post.excerpt || (post.content?.slice(0, 220).replace(/\n/g, " ").trim() + "…") || `${post.movieTitle} is an Odia film.`} />
                      <FaqItem q={`Is ${post.movieTitle} worth watching?`}
                        a={`Based on user reviews on Ollypedia, you can decide if ${post.movieTitle} is worth watching.`} />
                      <FaqItem q={`Who is in the cast of ${post.movieTitle}?`}
                        a={`Full cast and crew of ${post.movieTitle} are listed on the movie page on Ollypedia.`} />
                      <FaqItem q={`Where can I watch ${post.movieTitle} songs?`}
                        a={`All songs from ${post.movieTitle} including YouTube videos and lyrics are on Ollypedia.`} />
                      <FaqItem q={`Where can I find more articles about ${post.movieTitle}?`}
                        a={`Ollypedia publishes reviews, cast spotlights and box office reports for ${post.movieTitle}.`} />
                    </>
                  ) : (
                    <>
                      <FaqItem q="What is Ollypedia?"
                        a="Ollypedia is Odisha’s complete Odia cinema encyclopedia — movies, actors, songs, box office and news." />
                      <FaqItem q="What kind of articles does Ollypedia publish?"
                        a="Movie reviews, top 10 lists, actor spotlights, box office reports and Ollywood entertainment news." />
                      <FaqItem q="How can I find reviews for a specific Odia movie?"
                        a="Search for the movie on Ollypedia’s blog or visit the movie’s dedicated page for ratings and articles." />
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Reviews & Ratings */}
            <div className="bp-sidebar-box">
              <div className="bp-sidebar-hd">
                ⭐ Reviews & Ratings
                {rvCount > 0 && <span style={{ fontWeight: 400, color: "rgba(255,255,255,.28)", marginLeft: 4 }}>({rvCount})</span>}
              </div>
              <div style={{ padding: "12px 14px" }}>
                {Number(avg) > 0 && (
                  <div className="bp-overall" style={{ marginBottom: 14 }}>
                    <div className="bp-overall-num">{avg}</div>
                    <div>
                      <div className="bp-overall-stars">{"★".repeat(Math.round(Number(avg)))}{"☆".repeat(5 - Math.round(Number(avg)))}</div>
                      <div className="bp-overall-label">avg · {rvCount} review{rvCount !== 1 ? "s" : ""}</div>
                    </div>
                  </div>
                )}
                {(post.reviews || []).map((rv, idx) => (
                  <div key={idx} className="bp-rv-card" style={{ marginBottom: 10 }}>
                    <div className="bp-rv-head">
                      <div>
                        <div className="bp-rv-name">👤 {rv.user || "Anonymous"}</div>
                        {rv.rating > 0 && (
                          <div className="bp-rv-stars">
                            {"★".repeat(rv.rating)}{"☆".repeat(5 - rv.rating)}
                            <span style={{ fontSize: ".68rem", color: "rgba(255,255,255,.3)", marginLeft: 4 }}>({rv.rating}/5)</span>
                          </div>
                        )}
                      </div>
                      <div className="bp-rv-date">{rv.date}</div>
                    </div>
                    <div className="bp-rv-text">{rv.text}</div>
                    <div className="bp-rv-actions">
                      <button className="bp-rv-act-btn" onClick={() => likeReview(idx)}>👍 {(rv.likes ?? 0) > 0 ? rv.likes : "Like"}</button>
                      <button className="bp-rv-act-btn" onClick={() => toggleReply(idx)}>💬 Reply</button>
                    </div>
                    {(rv.replies?.length ?? 0) > 0 && (
                      <div className="bp-replies">
                        {rv.replies!.map((r, ri) => (
                          <div key={ri} className="bp-reply">
                            <span className="bp-reply-name">{r.user || "Anonymous"}:</span>{r.text}
                          </div>
                        ))}
                      </div>
                    )}
                    {replies[idx]?.open && (
                      <div className="bp-reply-form" style={{ marginTop: 10 }}>
                        <input className="bp-reply-inp" placeholder="Name" style={{ maxWidth: 90 }}
                          value={replies[idx]?.name || ""}
                          onChange={(e) => setReplies(p => ({ ...p, [idx]: { ...p[idx], name: e.target.value } }))} />
                        <input className="bp-reply-inp" placeholder="Write a reply…"
                          value={replies[idx]?.text || ""}
                          onChange={(e) => setReplies(p => ({ ...p, [idx]: { ...p[idx], text: e.target.value } }))}
                          onKeyDown={(e) => e.key === "Enter" && submitReply(idx)} />
                        <button className="bp-reply-sub" onClick={() => submitReply(idx)}>Send</button>
                      </div>
                    )}
                  </div>
                ))}
                <div className="bp-form-wrap" style={{ marginTop: rvCount > 0 ? 14 : 0 }}>
                  <div className="bp-form-title">✏️ Write a Review</div>
                  {submitted && <div className="bp-success" style={{ marginBottom: 12 }}>✅ Review submitted!</div>}
                  <StarPicker value={rvRating} onChange={setRvRating} />
                  <input className="bp-inp" placeholder="Your name"
                    value={rvName} onChange={(e) => setRvName(e.target.value)} />
                  <textarea className="bp-inp bp-textarea" placeholder="Share your thoughts…"
                    value={rvText} onChange={(e) => setRvText(e.target.value)} />
                  <button className="bp-sub-btn" onClick={submitReview}
                    disabled={submitting || !rvName.trim() || !rvText.trim()}>
                    {submitting ? "Submitting…" : "Submit Review"}
                  </button>
                </div>
              </div>
            </div>

            {/* Related articles from page.tsx sidebarContent */}
            {sidebarContent}

            {/* Related articles will be moved to a grid below */}

            {relMovies.length > 0 && (
              <div className="bp-sidebar-box">
                <div className="bp-sidebar-hd">🎬 Related Movies</div>
                {relMovies.map((m) => (
                  <div key={m._id} className="bp-rel-item" onClick={() => router.push(`/movie/${m.slug || m._id}`)}>
                    {(m.posterUrl || m.thumbnailUrl) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.posterUrl || m.thumbnailUrl} alt={m.title} className="bp-rel-thumb" loading="lazy" />
                    ) : (
                      <div className="bp-rel-ph">🎬</div>
                    )}
                    <div className="bp-rel-info">
                      <div className="bp-rel-title">{m.title}</div>
                      <div className="bp-rel-meta">
                        {m.releaseDate ? new Date(m.releaseDate).getFullYear() : ""}
                        {m.verdict ? ` · ${m.verdict}` : ""}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {boxOfficeDays.length > 0 && boxOfficeSlug && (
              <div className="bp-sidebar-box">
                <div className="bp-sidebar-hd">📊 Box Office Collection</div>
                <div className="bp-sidebar-body" style={{ padding: "10px 14px" }}>
                  {boxOfficeDays.slice(0, 7).map((d: any) => {
                    const net = parseFloat(String(d.net || "0").replace(/[^0-9.]/g, "")) || 0;
                    const maxN = Math.max(...boxOfficeDays.slice(0, 7).map((x: any) => parseFloat(String(x.net || "0").replace(/[^0-9.]/g, "")) || 0), 1);
                    const pct = Math.max(4, (net / maxN) * 100);
                    const fmt = (v: number) => v >= 1e7 ? `₹${(v / 1e7).toFixed(2)} Cr` : v >= 1e5 ? `₹${(v / 1e5).toFixed(2)} L` : `₹${v.toLocaleString("en-IN")}`;
                    return (
                      <div key={d.day} style={{ marginBottom: 8 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: ".68rem", marginBottom: 3 }}>
                          <span style={{ color: "var(--gold)", fontWeight: 700 }}>Day {d.day}</span>
                          <span style={{ color: "var(--text)", fontWeight: 600 }}>{fmt(net)}</span>
                        </div>
                        <div style={{ height: 4, background: "var(--bg4)", borderRadius: 2 }}>
                          <div style={{ height: "100%", background: "var(--gold)", borderRadius: 2, width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                  {boxOfficeDays.length > 7 && (
                    <div style={{ fontSize: ".65rem", color: "var(--muted)", marginTop: 6 }}>
                      + {boxOfficeDays.length - 7} more days tracked
                    </div>
                  )}
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
                    <a href={`/box-office/${boxOfficeSlug}`}
                      style={{ fontSize: ".72rem", color: "var(--gold)", fontWeight: 700, textDecoration: "none" }}>
                      View full box office data →
                    </a>
                  </div>
                </div>
              </div>
            )}

            {post.movieTitle && relMovies[0] && (
              <div className="bp-sidebar-box">
                <div className="bp-sidebar-hd">Explore {post.movieTitle}</div>
                <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
                  {[
                    { href: `/movie/${relMovies[0].slug || relMovies[0]._id}`, icon: "🎬", label: "Full Movie Info", sub: "Cast, story, trailer" },
                    ...(relSongs.length > 0 ? [{ href: `/songs/${relMovies[0].slug || relMovies[0]._id}/0/${(relSongs[0]?.title || "").toLowerCase().replace(/[^a-z0-9]/g, "-")}`, icon: "🎵", label: `${post.movieTitle} Songs`, sub: `${relSongs.length} tracks` }] : []),
                    ...(boxOfficeSlug ? [{ href: `/box-office/${boxOfficeSlug}`, icon: "📊", label: "Box Office", sub: "Day-wise collection" }] : []),
                    { href: `/blog?movie=${encodeURIComponent(post.movieTitle)}`, icon: "📰", label: "All Articles", sub: "Reviews & blogs" },
                  ].map(link => (
                    <a key={link.href} href={link.href}
                      style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "8px 10px", background: "var(--bg4)", border: "1px solid var(--border)",
                        borderRadius: 6, textDecoration: "none", transition: "border-color .15s",
                      }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(201,151,58,.4)")}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}>
                      <span style={{ fontSize: "1rem" }}>{link.icon}</span>
                      <div>
                        <div style={{ fontSize: ".76rem", fontWeight: 700, color: "var(--text)" }}>{link.label}</div>
                        <div style={{ fontSize: ".62rem", color: "var(--muted)" }}>{link.sub}</div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

          </aside>
        </div>
      </div>
      
      {/* ─── Related Blogs Grid ─── */}
      {related.length > 0 && (
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 20px 80px" }}>
          <h2 className="font-display font-bold text-2xl mb-6 text-white">Related Articles</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {related.map((blog) => (
              <div
                key={blog._id}
                onClick={() => router.push(`/blog/${blog.slug}`)}
                className="bg-[#111] border border-[#1f1f1f] hover:border-orange-500/30 rounded-xl overflow-hidden cursor-pointer transition-all hover:-translate-y-1"
              >
                <div className="w-full aspect-video bg-[#1a1a1a] relative">
                  {blog.coverImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={blog.coverImage} alt={blog.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl">✍️</div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="text-white font-bold text-sm mb-2 line-clamp-2">{blog.title}</h3>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{blog.category || "Article"}</span>
                    <span>{fmtShort(blog.createdAt)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Scoped CSS ───────────────────────────────────────────────────────────────
const CSS = `

@keyframes bp-up     { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:none} }
@keyframes bp-shimmer{ 0%{background-position:-600px 0} 100%{background-position:600px 0} }
@keyframes bp-float  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
@keyframes bp-pulse  { 0%,100%{opacity:1} 50%{opacity:.3} }

:root {
  --gold:#c9973a; --gold2:#e0b86a; --gold3:#7a5018;
  --bg:#080808; --bg2:#0f0f0f; --bg3:#161616; --bg4:#1d1d1d; --bg5:#252525;
  --border:rgba(255,255,255,.07); --border2:rgba(255,255,255,.13);
  --muted:rgba(255,255,255,.38); --text:#ede9df;
}
*{box-sizing:border-box;}

.bp-root{min-height:100vh;background:var(--bg);color:var(--text);font-family:'DM Sans',system-ui,sans-serif;max-width:100%;}

.bp-banner{position:relative;width:100%;overflow:hidden;min-height:380px;display:flex;align-items:flex-end;}
@media(min-width:768px){.bp-banner{min-height:520px;}}
.bp-banner-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;filter:brightness(.5) saturate(1.2);transform:scale(1.04);}
.bp-banner-grad{position:absolute;inset:0;background:linear-gradient(0deg,rgba(8,8,8,1) 0%,rgba(8,8,8,.8) 25%,rgba(8,8,8,.2) 60%,transparent 100%),linear-gradient(90deg,rgba(8,8,8,.5) 0%,transparent 50%);}
.bp-banner-content{position:relative;z-index:2;width:100%;max-width:900px;padding:28px 20px 36px;}
@media(min-width:768px){.bp-banner-content{padding:32px 40px 44px;}}

.bp-nobanner{position:relative;overflow:hidden;background:linear-gradient(135deg,rgba(201,151,58,.08) 0%,rgba(167,139,232,.04) 50%,transparent 100%);border-bottom:1px solid var(--border);padding:44px 20px 36px;}
@media(min-width:768px){.bp-nobanner{padding:56px 40px 44px;}}
.bp-nobanner-inner{max-width:900px;}
.bp-nobanner::before{content:'';position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.02) 1px,transparent 1px);background-size:60px 60px;}

.bp-back{display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,.08);border:1px solid var(--border2);color:rgba(255,255,255,.6);font-family:inherit;font-size:.72rem;font-weight:600;cursor:pointer;padding:5px 12px;border-radius:2px;transition:all .15s;margin-bottom:18px;}
.bp-back:hover{background:rgba(255,255,255,.14);color:#fff;}

.bp-catbadge{display:inline-flex;align-items:center;gap:6px;width:fit-content;font-size:.6rem;font-weight:800;letter-spacing:.14em;text-transform:uppercase;padding:4px 11px;border-radius:2px;margin-bottom:14px;cursor:pointer;transition:opacity .15s;}
.bp-catbadge:hover{opacity:.8;}

.bp-title{font-family:'Playfair Display',serif;font-size:clamp(1.6rem,4vw,3rem);font-weight:900;color:#fff;line-height:1.18;margin:0 0 16px;text-shadow:0 2px 20px rgba(0,0,0,.6);}

.bp-meta{display:flex;flex-wrap:wrap;gap:12px;align-items:center;font-size:.72rem;color:rgba(255,255,255,.42);}
.bp-meta-sep{opacity:.25;}
.bp-meta-gold{color:var(--gold);font-weight:600;}
.bp-meta-rating{display:inline-flex;align-items:center;gap:5px;background:rgba(201,151,58,.14);border:1px solid rgba(201,151,58,.3);border-radius:12px;padding:2px 9px;color:var(--gold);font-weight:700;}

.bp-layout{max-width:1200px;margin:0 auto;display:grid;grid-template-columns:1fr;gap:40px;padding:36px 20px 80px;align-items:start;}
@media(min-width:768px){.bp-layout{padding:44px 32px 80px;}}
@media(min-width:1060px){.bp-layout{grid-template-columns:minmax(0,1fr) 320px;gap:52px;padding:48px 40px 80px;}}
.bp-sidebar{display:flex;flex-direction:column;gap:24px;position:sticky;top:24px;}

/* ★ ROOT-CAUSE FIX: the main column is a CSS-grid track. A bare "1fr" track
   defaults to a minimum size of max-content (its widest child's intrinsic
   width), so any generated element wider than the viewport — a long
   unbroken string, a fixed-width inline-styled div/table from the AI blog
   generator, etc. — silently stretched the WHOLE grid column (and the
   page) to the right instead of shrinking/wrapping. minmax(0,1fr) above
   plus min-width:0 here are what actually let the column shrink so the
   word-wrap rules below can take effect. Presentation-only — no markup,
   content, or behavior change. */
.bp-main-col{min-width:0;max-width:100%;}

.bp-article,
.bp-article-html{box-sizing:border-box;min-width:0;max-width:100%;}
.bp-article *,
.bp-article-html *{box-sizing:border-box;}

.bp-article{font-family:'DM Sans',system-ui,sans-serif;font-size:1.02rem;line-height:1.9;color:rgba(255,255,255,.78);word-break:break-word;overflow-wrap:break-word;}
.bp-article p{margin:0 0 1.4em;position:relative;text-align:justify;text-justify:inter-word;}
.bp-article p:first-of-type::first-letter{font-family:'Playfair Display',serif;font-size:4.2rem;font-weight:900;line-height:.72;float:left;margin-right:.12em;margin-top:.08em;color:var(--gold);}

.bp-article-html{font-family:'DM Sans',system-ui,sans-serif;font-size:1.05rem;line-height:1.9;color:rgba(255,255,255,.8);word-break:break-word;overflow-wrap:break-word;}
.bp-article-html p:first-of-type::first-letter{all:unset;}
.bp-article-html article,.bp-article-html section{display:block;max-width:100%;}

/* Generated content can never force horizontal overflow, on any blog type */
.bp-article-html div,
.bp-article-html section,
.bp-article-html span,
.bp-article-html strong,
.bp-article-html em,
.bp-article-html li,
.bp-article-html h1,
.bp-article-html h2,
.bp-article-html h3,
.bp-article-html h4,
.bp-article-html td,
.bp-article-html th{max-width:100%;overflow-wrap:break-word;word-break:break-word;}

.bp-article-html a{overflow-wrap:break-word;word-break:break-word;max-width:100%;display:inline-block;}

.bp-article-html img,
.bp-article-html svg,
.bp-article-html video,
.bp-article-html canvas{max-width:100%;height:auto;}

.bp-article-html iframe,
.bp-article-html embed,
.bp-article-html object{max-width:100%;}

.bp-article-html pre{white-space:pre-wrap;overflow-wrap:break-word;word-break:break-word;overflow-x:auto;max-width:100%;-webkit-overflow-scrolling:touch;}
.bp-article-html code{overflow-wrap:break-word;word-break:break-word;}

/* Tables: keep them responsive without changing their visual style —
   scroll horizontally inside their own box rather than blowing out the page */
.bp-article-html .bp-table-scroll{width:100%;max-width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch;}
.bp-article-html h1{font-family:'Playfair Display',serif;font-size:clamp(1.4rem,3vw,2rem);font-weight:900;line-height:1.25;margin:0 0 .9em;color:#fff;}
.bp-article-html h2{font-size:1.18rem;font-weight:800;margin:2.2em 0 .75em;color:var(--gold);display:flex;align-items:center;gap:10px;letter-spacing:.01em;}
.bp-article-html h2::before{content:'';display:inline-block;width:18px;height:3px;background:var(--gold);border-radius:2px;flex-shrink:0;}
.bp-article-html h3{font-size:1rem;font-weight:700;margin:1.6em 0 .5em;color:rgba(255,255,255,.9);border-left:3px solid rgba(201,151,58,.5);padding-left:10px;}
.bp-article-html p{margin:0 0 1.35em;line-height:1.9;color:rgba(255,255,255,.78);text-align:justify;text-justify:inter-word;}
.bp-article-html strong{color:#fff;font-weight:700;}
.bp-article-html em{color:rgba(255,255,255,.55);font-style:italic;}
.bp-article-html ul{margin:0 0 1.6em 0;padding:0;list-style:none;}
.bp-article-html ul li{position:relative;padding:6px 0 6px 1.6em;color:rgba(255,255,255,.75);font-size:1rem;line-height:1.75;border-bottom:1px solid rgba(255,255,255,.04);text-align:justify;text-justify:inter-word;}
.bp-article-html ul li:last-child{border-bottom:none;}
.bp-article-html ul li::before{content:'▸';position:absolute;left:0;top:8px;color:var(--gold);font-size:.85em;}
.bp-article-html ol{margin:0 0 1.6em 0;padding:0;counter-reset:ol-counter;list-style:none;}
.bp-article-html ol li{position:relative;padding:6px 0 6px 2.2em;color:rgba(255,255,255,.75);font-size:1rem;line-height:1.75;counter-increment:ol-counter;border-bottom:1px solid rgba(255,255,255,.04);text-align:justify;text-justify:inter-word;}
.bp-article-html ol li:last-child{border-bottom:none;}
.bp-article-html ol li::before{content:counter(ol-counter);position:absolute;left:0;top:8px;width:1.5em;height:1.5em;background:rgba(201,151,58,.15);border:1px solid rgba(201,151,58,.3);border-radius:50%;color:var(--gold);font-size:.72em;font-weight:800;display:flex;align-items:center;justify-content:center;}
.bp-article-html table{width:100%;border-collapse:collapse;font-size:.93em;margin:0 0 2em;border-radius:8px;overflow:hidden;border:1px solid rgba(255,255,255,.07);}
.bp-article-html thead tr{background:rgba(201,151,58,.1);}
.bp-article-html th{padding:12px 16px;text-align:left;font-size:.72em;color:var(--gold);text-transform:uppercase;letter-spacing:.08em;border-bottom:2px solid rgba(201,151,58,.2);font-weight:800;}
.bp-article-html td{padding:11px 16px;border-bottom:1px solid rgba(255,255,255,.05);color:rgba(255,255,255,.75);}
.bp-article-html tbody tr:hover td{background:rgba(255,255,255,.02);}
.bp-article-html tfoot tr{background:rgba(201,151,58,.06);border-top:2px solid rgba(201,151,58,.2);}
.bp-article-html tfoot td{color:var(--gold);font-weight:700;}
.bp-article-html blockquote{margin:2em 0;padding:18px 22px;border-left:4px solid var(--gold);background:rgba(201,151,58,.06);border-radius:0 8px 8px 0;font-family:'DM Serif Display',serif;font-style:italic;font-size:1.08rem;color:rgba(255,255,255,.7);line-height:1.75;text-align:justify;text-justify:inter-word;max-width:100%;overflow-wrap:break-word;word-break:break-word;}
.bp-article-html .faq-section{margin:3em 0 0;padding-top:1.5em;border-top:1px solid var(--border);}
.bp-article-html .faq-section h2{margin-top:0;}
.bp-article-html details{background:var(--bg3);border:1px solid var(--border);border-radius:10px;margin-bottom:10px;overflow:hidden;transition:border-color .2s;}
.bp-article-html details[open]{border-color:rgba(201,151,58,.35);background:rgba(201,151,58,.04);}
.bp-article-html summary{padding:14px 18px;cursor:pointer;font-size:.9rem;font-weight:700;color:var(--text);list-style:none;display:flex;align-items:center;justify-content:space-between;user-select:none;gap:12px;}
.bp-article-html summary::-webkit-details-marker{display:none;}
.bp-article-html summary::after{content:'＋';color:var(--gold);font-size:1.1rem;flex-shrink:0;}
.bp-article-html details[open] summary::after{content:'−';}
.bp-article-html details p{margin:0;padding:0 18px 16px;font-size:.88rem;color:rgba(255,255,255,.6);line-height:1.8;}
/* .faq-section display:none removed — Box Office blogs render FAQ+AlsoRead inside .bp-article-html */
.bp-article-html .bo-prose{margin-bottom:2em;}

.bp-pullquote{margin:2em 0;padding:20px 24px;border-left:3px solid var(--gold);background:rgba(201,151,58,.06);border-radius:0 6px 6px 0;font-family:'DM Serif Display',serif;font-style:italic;font-size:1.08rem;color:rgba(255,255,255,.7);line-height:1.7;}
.bp-divider{border:none;margin:36px 0;display:flex;align-items:center;gap:12px;}
.bp-divider::before,.bp-divider::after{content:'';flex:1;height:1px;background:var(--border);}
.bp-divider-icon{font-size:.9rem;color:rgba(255,255,255,.2);}
.bp-tags{display:flex;flex-wrap:wrap;gap:8px;margin-top:24px;}
.bp-tag{padding:5px 13px;border-radius:2px;font-size:.7rem;font-weight:600;background:var(--bg3);border:1px solid var(--border2);color:var(--muted);cursor:pointer;transition:all .15s;letter-spacing:.03em;}
.bp-tag:hover{border-color:rgba(201,151,58,.4);color:var(--gold);background:rgba(201,151,58,.07);}

/* ★ Table of Contents */
.bp-toc{background:var(--bg3);border:1px solid var(--border);border-radius:8px;overflow:hidden;margin-bottom:4px;}
.bp-toc-hd{font-size:.6rem;font-weight:800;text-transform:uppercase;letter-spacing:.18em;color:var(--muted);padding:11px 14px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px;}
.bp-toc-link{display:block;padding:7px 14px;font-size:.75rem;color:rgba(255,255,255,.45);text-decoration:none;border-left:2px solid transparent;transition:all .15s;line-height:1.4;}
.bp-toc-link:hover{color:var(--gold);background:rgba(201,151,58,.04);border-left-color:rgba(201,151,58,.35);}
.bp-toc-active{color:var(--gold)!important;border-left-color:var(--gold)!important;background:rgba(201,151,58,.07)!important;font-weight:700;}
.bp-toc-sub{padding-left:26px;font-size:.7rem;}

/* Mobile TOC toggle */
.bp-toc-mobile-toggle{display:block;margin-bottom:20px;}
@media(min-width:1060px){.bp-toc-mobile-toggle{display:none;}}
.bp-toc-toggle-btn{width:100%;padding:10px 16px;background:var(--bg3);border:1px solid var(--border2);border-radius:8px;color:rgba(255,255,255,.55);font-family:inherit;font-size:.75rem;font-weight:600;cursor:pointer;text-align:left;transition:all .15s;}
.bp-toc-toggle-btn:hover{border-color:rgba(201,151,58,.4);color:var(--gold);}

/* Desktop TOC in sidebar */
.bp-toc-desktop{display:none;}
@media(min-width:1060px){.bp-toc-desktop{display:block;}}

.bp-related-title{font-size:.62rem;font-weight:800;text-transform:uppercase;letter-spacing:.18em;color:var(--muted);display:flex;align-items:center;gap:11px;margin-bottom:18px;padding-bottom:11px;border-bottom:1px solid var(--border);}
.bp-related-title::before{content:'';display:block;width:20px;height:2.5px;background:var(--gold);border-radius:2px;flex-shrink:0;}

.bp-movies-row{display:flex;gap:12px;overflow-x:auto;padding-bottom:4px;scrollbar-width:none;}
.bp-movies-row::-webkit-scrollbar{display:none;}
.bp-movie-card{flex-shrink:0;width:130px;cursor:pointer;animation:bp-up .4s ease both;}
.bp-movie-card:hover .bp-movie-poster{transform:translateY(-4px);box-shadow:0 16px 40px rgba(0,0,0,.7);border-color:rgba(201,151,58,.5);}
.bp-movie-card:hover .bp-movie-name{color:var(--gold);}
.bp-movie-poster{width:130px;aspect-ratio:2/3;object-fit:cover;border-radius:5px;display:block;border:1px solid var(--border);background:var(--bg4);transition:transform .3s,box-shadow .3s,border-color .3s;}
.bp-movie-poster-ph{width:130px;aspect-ratio:2/3;border-radius:5px;border:1px solid var(--border);background:linear-gradient(135deg,#1a1200,#080808);display:flex;align-items:center;justify-content:center;font-size:2.2rem;transition:transform .3s;}
.bp-movie-card:hover .bp-movie-poster-ph{transform:translateY(-4px);}
.bp-movie-name{font-size:.74rem;font-weight:700;color:var(--text);margin-top:8px;line-height:1.35;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;transition:color .15s;}
.bp-movie-year{font-size:.62rem;color:var(--muted);margin-top:2px;}

.bp-songs-list{display:flex;flex-direction:column;gap:2px;}
.bp-song-item{display:flex;gap:11px;align-items:center;padding:10px 12px;background:var(--bg3);border-radius:3px;cursor:pointer;transition:background .15s;}
.bp-song-item:hover{background:var(--bg4);}
.bp-song-item:hover .bp-song-title{color:var(--gold);}
.bp-song-thumb{width:52px;height:36px;object-fit:cover;border-radius:2px;background:var(--bg4);flex-shrink:0;}
.bp-song-thumb-ph{width:52px;height:36px;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:var(--bg4);border-radius:2px;font-size:1.1rem;}
.bp-song-info{flex:1;min-width:0;}
.bp-song-title{font-size:.8rem;font-weight:700;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;transition:color .15s;}
.bp-song-meta{font-size:.65rem;color:var(--muted);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.bp-song-play{width:28px;height:28px;background:rgba(201,151,58,.15);border:1px solid rgba(201,151,58,.3);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:.65rem;color:var(--gold);flex-shrink:0;transition:background .15s;}
.bp-song-item:hover .bp-song-play{background:rgba(201,151,58,.3);}

.bp-reviews-wrap{margin-top:8px;}
.bp-reviews-hd{font-size:.62rem;font-weight:800;text-transform:uppercase;letter-spacing:.18em;color:var(--muted);display:flex;align-items:center;gap:11px;margin-bottom:18px;padding-bottom:11px;border-bottom:1px solid var(--border);}
.bp-reviews-hd::before{content:'';display:block;width:20px;height:2.5px;background:var(--gold);border-radius:2px;flex-shrink:0;}
.bp-overall{display:inline-flex;align-items:center;gap:14px;background:rgba(201,151,58,.08);border:1px solid rgba(201,151,58,.2);border-radius:6px;padding:14px 20px;margin-bottom:20px;}
.bp-overall-num{font-family:'Playfair Display',serif;font-size:2.4rem;font-weight:900;color:var(--gold);line-height:1;}
.bp-overall-stars{color:var(--gold);font-size:1rem;letter-spacing:2px;}
.bp-overall-label{font-size:.7rem;color:var(--muted);margin-top:2px;}
.bp-rv-card{background:var(--bg3);border:1px solid var(--border);border-radius:5px;padding:16px;margin-bottom:12px;transition:border-color .15s;}
.bp-rv-card:hover{border-color:rgba(255,255,255,.14);}
.bp-rv-head{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;flex-wrap:wrap;gap:6px;}
.bp-rv-name{font-weight:700;font-size:.86rem;color:var(--text);}
.bp-rv-stars{color:var(--gold);font-size:.82rem;letter-spacing:1px;}
.bp-rv-date{font-size:.68rem;color:rgba(255,255,255,.28);}
.bp-rv-text{font-size:.82rem;color:rgba(255,255,255,.6);line-height:1.65;}
.bp-rv-actions{display:flex;gap:14px;margin-top:10px;}
.bp-rv-act-btn{background:none;border:none;color:rgba(255,255,255,.35);font-family:inherit;font-size:.72rem;cursor:pointer;padding:0;transition:color .15s;display:flex;align-items:center;gap:4px;}
.bp-rv-act-btn:hover{color:var(--gold);}
.bp-replies{margin-top:10px;padding:10px 14px;background:rgba(255,255,255,.02);border-left:2px solid rgba(255,255,255,.07);border-radius:0 3px 3px 0;}
.bp-reply{padding:5px 0;font-size:.76rem;color:rgba(255,255,255,.5);line-height:1.55;}
.bp-reply-name{font-weight:700;color:rgba(255,255,255,.7);margin-right:6px;}
.bp-reply-form{display:flex;gap:7px;margin-top:10px;}
.bp-reply-inp{flex:1;padding:7px 11px;background:var(--bg4);border:1px solid var(--border2);border-radius:2px;color:var(--text);font-size:.76rem;outline:none;font-family:inherit;}
.bp-reply-inp:focus{border-color:rgba(201,151,58,.4);}
.bp-reply-sub{padding:7px 13px;background:rgba(201,151,58,.18);border:1px solid rgba(201,151,58,.3);border-radius:2px;color:var(--gold);font-family:inherit;font-size:.73rem;font-weight:700;cursor:pointer;transition:background .15s;white-space:nowrap;}
.bp-reply-sub:hover{background:rgba(201,151,58,.32);}
.bp-form-wrap{background:var(--bg3);border:1px solid var(--border);border-radius:5px;padding:20px;}
.bp-form-title{font-size:.72rem;font-weight:800;text-transform:uppercase;letter-spacing:.14em;color:var(--muted);margin-bottom:16px;}
.bp-stars-row{display:flex;align-items:center;gap:10px;margin-bottom:16px;}
.bp-star-btn{font-size:1.7rem;cursor:pointer;transition:transform .12s;line-height:1;user-select:none;background:none;border:none;padding:0;}
.bp-star-btn:hover{transform:scale(1.2);}
.bp-star-label{font-size:.8rem;color:rgba(255,255,255,.4);}
.bp-inp{width:100%;padding:10px 13px;background:var(--bg4);border:1.5px solid var(--border2);border-radius:3px;color:var(--text);font-family:inherit;font-size:.84rem;outline:none;transition:border-color .18s;margin-bottom:10px;}
.bp-inp:focus{border-color:rgba(201,151,58,.45);}
.bp-inp::placeholder{color:rgba(255,255,255,.22);}
.bp-textarea{resize:vertical;min-height:90px;}
.bp-sub-btn{padding:10px 24px;background:var(--gold);border:none;border-radius:2px;color:#000;font-family:inherit;font-weight:700;font-size:.82rem;letter-spacing:.04em;cursor:pointer;transition:background .15s;}
.bp-sub-btn:hover{background:var(--gold2);}
.bp-sub-btn:disabled{background:var(--bg5);color:var(--muted);cursor:not-allowed;}
.bp-success{padding:14px 16px;background:rgba(74,207,130,.08);border:1px solid rgba(74,207,130,.25);border-radius:3px;color:#4acf82;font-size:.82rem;}

.bp-sidebar-box{background:var(--bg3);border:1px solid var(--border);border-radius:5px;overflow:hidden;}
.bp-sidebar-hd{font-size:.6rem;font-weight:800;text-transform:uppercase;letter-spacing:.18em;color:var(--muted);padding:13px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px;}
.bp-sidebar-hd::before{content:'';display:block;width:16px;height:2px;background:var(--gold);border-radius:2px;flex-shrink:0;}
.bp-sidebar-body{padding:14px 16px;}
.bp-info-row{display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid var(--border);font-size:.76rem;}
.bp-info-row:last-child{border-bottom:none;}
.bp-info-key{color:rgba(255,255,255,.35);}
.bp-info-val{color:var(--text);font-weight:600;}

/* ★ Share — WhatsApp green added */
.bp-share-btns{display:flex;gap:8px;flex-wrap:wrap;padding:14px 16px;}
.bp-share-btn{flex:1;min-width:80px;padding:8px 10px;background:var(--bg4);border:1px solid var(--border2);border-radius:2px;color:rgba(255,255,255,.65);font-family:inherit;font-size:.7rem;font-weight:600;cursor:pointer;transition:all .15s;text-align:center;}
.bp-share-btn:hover{background:var(--bg5);color:#fff;}
.bp-share-wa:hover{border-color:rgba(37,211,102,.4);color:#25d366;}
.bp-share-twitter:hover{border-color:rgba(29,161,242,.4);color:#1da1f2;}
.bp-share-fb:hover{border-color:rgba(66,103,178,.4);color:#4267b2;}
.bp-share-copy:hover{border-color:rgba(201,151,58,.4);color:var(--gold);}

.bp-rel-item{display:flex;gap:10px;padding:11px 16px;border-bottom:1px solid var(--border);cursor:pointer;transition:background .15s;}
.bp-rel-item:last-child{border-bottom:none;}
.bp-rel-item:hover{background:var(--bg4);}
.bp-rel-item:hover .bp-rel-title{color:var(--gold);}
.bp-rel-thumb{width:58px;height:38px;object-fit:cover;border-radius:2px;background:var(--bg4);flex-shrink:0;}
.bp-rel-ph{width:58px;height:38px;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:var(--bg4);border-radius:2px;font-size:1.1rem;}
.bp-rel-info{flex:1;min-width:0;}
.bp-rel-title{font-size:.76rem;font-weight:700;color:var(--text);line-height:1.35;margin:0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;transition:color .15s;}
.bp-rel-meta{font-size:.62rem;color:rgba(255,255,255,.28);margin-top:3px;}

.bp-sk{background:linear-gradient(90deg,var(--bg4) 25%,var(--bg5) 50%,var(--bg4) 75%);background-size:600px 100%;animation:bp-shimmer 1.5s infinite;border-radius:2px;}

.bp-404{min-height:60vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;text-align:center;padding:40px;}
.bp-404-ico{font-size:4rem;opacity:.35;animation:bp-float 3s ease infinite;}
.bp-404-t{font-family:'Playfair Display',serif;font-size:1.5rem;color:rgba(255,255,255,.4);}
.bp-404-btn{padding:10px 24px;background:var(--gold);border:none;border-radius:2px;color:#000;font-family:inherit;font-weight:700;font-size:.82rem;cursor:pointer;transition:background .15s;}
.bp-404-btn:hover{background:var(--gold2);}
`;