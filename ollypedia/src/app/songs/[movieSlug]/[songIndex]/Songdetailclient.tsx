"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function extractYtId(input?: string | null): string | null {
  if (!input) return null;
  const s = String(input).trim();
  const m = s.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([A-Za-z0-9_-]{11})/);
  if (m) return m[1];
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  return null;
}
const ytThumb = (id?: string | null) =>
  id ? `https://img.youtube.com/vi/${extractYtId(id) || id}/mqdefault.jpg` : null;

const fmtDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";

const firstToken = (str?: string) => (str || "").split(/[,&\/]/)[0].trim().toLowerCase();

function songSlugify(title: string) {
  return String(title || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

function buildSongUrl(movie: MovieData, idx: number, song: SongData) {
  const slug = songSlugify(song.title);
  return `/songs/${movie.slug}/${idx}/${slug}`;
}

// ─── LRC parser ───────────────────────────────────────────────────────────────
interface LrcLine { time: number | null; text: string }
function parseLRC(raw = ""): LrcLine[] {
  if (!raw.trim()) return [];
  const lines = raw.split("\n");
  const parsed: LrcLine[] = [];
  const timeRe = /\[(\d{1,2}):(\d{2})(?:[.:]\d+)?\]/g;
  lines.forEach((line) => {
    const text = line.replace(/\[\d{1,2}:\d{2}(?:[.:]\d+)?\]/g, "").trim();
    let match: RegExpExecArray | null;
    timeRe.lastIndex = 0;
    while ((match = timeRe.exec(line)) !== null) {
      const secs = parseInt(match[1], 10) * 60 + parseFloat(match[2]);
      if (text) parsed.push({ time: secs, text });
    }
  });
  if (parsed.length === 0 && raw.trim()) {
    return raw.split("\n").map((text) => ({ time: null, text }));
  }
  return parsed.sort((a, b) => ((a.time ?? 0) - (b.time ?? 0)));
}

// ─── Lyrics Panel ─────────────────────────────────────────────────────────────
function LyricsPanel({ lyrics, currentTime }: { lyrics?: string; currentTime: number }) {
  const lines   = parseLRC(lyrics || "");
  const wrapRef = useRef<HTMLDivElement>(null);
  const isLRC   = lines.some((l) => l.time !== null);

  const activeIdx = (() => {
    if (!isLRC || currentTime == null) return -1;
    let idx = -1;
    for (let i = 0; i < lines.length; i++) {
      if ((lines[i].time ?? 0) <= currentTime) idx = i;
      else break;
    }
    return idx;
  })();

  useEffect(() => {
    if (activeIdx < 0 || !wrapRef.current) return;
    const el = wrapRef.current.children[activeIdx] as HTMLElement;
    if (el) el.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [activeIdx]);

  if (!lyrics?.trim()) return (
    <div className="flex flex-col items-center justify-center py-10 text-gray-500 text-sm gap-2">
      <span className="text-3xl">🎵</span>
      <p>No lyrics available for this song.</p>
    </div>
  );

  return (
    <div ref={wrapRef} className="overflow-y-auto flex-1 px-4 py-4 space-y-1 scroll-smooth">
      {lines.map((line, i) => (
        <div
          key={i}
          className={[
            "px-3 py-1.5 rounded-md text-sm leading-relaxed whitespace-pre-wrap transition-all duration-300",
            isLRC && i === activeIdx
              ? "text-white font-bold text-base bg-orange-500/10 border-l-4 border-orange-400 pl-3"
              : isLRC && i < activeIdx
              ? "text-gray-600"
              : "text-gray-400",
          ].join(" ")}
        >
          {line.text || "\u00a0"}
        </div>
      ))}
    </div>
  );
}

// ─── SongItem (playlist row) ──────────────────────────────────────────────────
function SongItem({ song, active, onClick, index }: {
  song: SongData; active: boolean; onClick: () => void; index: number;
}) {
  const thumb = song.ytId ? ytThumb(song.ytId) : null;
  return (
    <div
      onClick={onClick}
      className={[
        "flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer border transition-all",
        active
          ? "bg-orange-500/10 border-orange-500/30"
          : "border-transparent hover:bg-white/5",
      ].join(" ")}
    >
      <div className="relative w-[50px] h-[34px] rounded overflow-hidden flex-shrink-0 bg-[#1a1a1a]">
        {thumb && (
          <Image src={thumb} alt={song.title} fill className="object-cover" sizes="50px"
            onError={(e) => { (e.target as HTMLElement).style.opacity = "0.2"; }} />
        )}
        <div className={[
          "absolute inset-0 flex items-center justify-center text-xs font-bold",
          active ? "bg-orange-500/40 text-orange-300" : "bg-black/40 text-white/70",
        ].join(" ")}>
          {active ? "▶" : "♪"}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className={["text-xs font-semibold truncate", active ? "text-orange-400" : "text-white"].join(" ")}>
          {song.title}
        </p>
        {song.singer && <p className="text-xs text-gray-500 mt-0.5">🎤 {song.singer}</p>}
      </div>
      {song.ytId && (
        <a href={`https://www.youtube.com/watch?v=${song.ytId}`} target="_blank" rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-orange-400/60 text-xs font-bold hover:text-orange-400 px-1 flex-shrink-0">
          YT↗
        </a>
      )}
    </div>
  );
}

// ─── SpotifyCard (related songs) ─────────────────────────────────────────────
function SpotifyCard({ song, onClick }: {
  song: SongData & { movieTitle?: string; moviePoster?: string; movieId?: string };
  onClick: () => void;
}) {
  const thumb = song.thumbnailUrl || (song.ytId ? ytThumb(song.ytId) : null) || song.moviePoster;
  return (
    <div className="flex-shrink-0 w-40 cursor-pointer group transition-transform hover:-translate-y-1" onClick={onClick}>
      <div className="relative aspect-square rounded-xl overflow-hidden bg-[#1a1a1a] shadow-lg mb-2">
        {thumb ? (
          <Image src={thumb} alt={song.title} fill className="object-cover" sizes="160px" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-3xl text-gray-600">🎵</div>
        )}
        <div className="absolute bottom-2 right-2 w-9 h-9 rounded-full bg-orange-500 flex items-center justify-center text-sm text-black shadow-lg
          opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all">
          ▶
        </div>
      </div>
      <p className="text-xs font-bold text-white truncate">{song.title}</p>
      {song.singer && <p className="text-xs text-gray-500 mt-0.5 truncate">🎤 {song.singer}</p>}
      {song.movieTitle && <p className="text-xs mt-0.5 truncate text-orange-400/70">{song.movieTitle}</p>}
    </div>
  );
}

// ─── SongScrollRow ────────────────────────────────────────────────────────────
function SongScrollRow({ title, songs, onSongClick }: {
  title: string;
  songs: Array<SongData & { movieTitle?: string; moviePoster?: string; movieId?: string; songIdx?: number }>;
  onSongClick: (s: any) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  if (!songs.length) return null;
  return (
    <section className="mb-4">
      <div className="flex items-center justify-between px-4 sm:px-6 mb-3">
        <h2 className="font-bold text-sm sm:text-base">{title}</h2>
        <div className="flex gap-1">
          <button onClick={() => ref.current?.scrollBy({ left: -400, behavior: "smooth" })}
            className="w-7 h-7 rounded-full border border-white/15 bg-white/5 text-white flex items-center justify-center hover:border-orange-500/40 hover:text-orange-400 transition-all">‹</button>
          <button onClick={() => ref.current?.scrollBy({ left: 400, behavior: "smooth" })}
            className="w-7 h-7 rounded-full border border-white/15 bg-white/5 text-white flex items-center justify-center hover:border-orange-500/40 hover:text-orange-400 transition-all">›</button>
        </div>
      </div>
      <div ref={ref} className="flex gap-3 overflow-x-auto px-4 sm:px-6 pb-3 scrollbar-none">
        {songs.map((s, i) => (
          <SpotifyCard key={i} song={s} onClick={() => onSongClick(s)} />
        ))}
      </div>
    </section>
  );
}

// ─── Share Modal ──────────────────────────────────────────────────────────────
function ShareModal({ song, movie, onClose }: { song: SongData; movie: MovieData; onClose: () => void }) {
  const thumb = song.thumbnailUrl || (song.ytId ? `https://img.youtube.com/vi/${song.ytId}/hqdefault.jpg` : null) || movie.posterUrl;
  const url   = typeof window !== "undefined" ? window.location.href : "";

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: song.title, text: `🎵 ${song.title}${song.singer ? " — " + song.singer : ""} | ${movie.title}`, url });
    } else {
      navigator.clipboard?.writeText(url).then(() => alert("Link copied!"));
    }
  };

  return (
    <div className="fixed inset-0 z-[300] bg-black/85 backdrop-blur-sm flex items-center justify-center p-5" onClick={onClose}>
      <div className="w-full max-w-sm bg-gradient-to-br from-[#1a1200] via-[#0f0a00] to-[#0a0a0a] border border-orange-500/40 rounded-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}>
        {thumb
          ? <img src={thumb} alt={song.title} className="w-full aspect-video object-cover" />
          : <div className="w-full aspect-video bg-[#1a1200] flex items-center justify-center text-5xl">🎵</div>
        }
        <div className="p-5">
          <p className="text-[10px] font-black tracking-[0.14em] uppercase text-orange-400 mb-1.5">🎵 Now Playing</p>
          <h3 className="font-black text-xl text-white leading-tight mb-1">{song.title}</h3>
          <p className="text-sm text-white/55 mb-3">
            {song.singer && <span>🎤 {song.singer}</span>}
            {song.singer && song.musicDirector && <span className="mx-2 opacity-40">·</span>}
            {song.musicDirector && <span>🎼 {song.musicDirector}</span>}
          </p>
          <div className="flex items-center gap-2 border-t border-white/10 pt-3 mb-4">
            {movie.posterUrl && (
              <img src={movie.posterUrl} alt={movie.title} className="w-8 h-11 object-cover rounded border border-white/15" />
            )}
            <div>
              <p className="text-[10px] text-gray-500">From the film</p>
              <p className="text-sm font-bold text-orange-400">{movie.title}</p>
            </div>
            <span className="ml-auto text-[10px] font-black tracking-wider text-orange-400/60">Ollypedia</span>
          </div>
          <div className="flex gap-2">
            <button onClick={handleShare} className="flex-1 py-2 bg-orange-500 text-black text-sm font-bold rounded-lg">
              {typeof navigator !== "undefined" && navigator.share ? "📤 Share" : "🔗 Copy Link"}
            </button>
            {song.ytId && (
              <a href={`https://www.youtube.com/watch?v=${song.ytId}`} target="_blank" rel="noreferrer"
                className="flex-1 py-2 border border-white/20 text-white text-sm font-bold rounded-lg text-center">
                ▶ YouTube
              </a>
            )}
            <button onClick={onClose} className="px-3 py-2 bg-white/10 text-white rounded-lg text-sm">✕</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Client Component ────────────────────────────────────────────────────
interface Props {
  movie: MovieData;
  initialSongIndex: number;
  relatedMovies: MovieData[];
}

export function SongDetailClient({ movie, initialSongIndex, relatedMovies }: Props) {
  const router = useRouter();

  // ── State ──────────────────────────────────────────────────────────────────
  const [activeSongIdx,  setActiveSongIdx]  = useState(initialSongIndex);
  const [sidebarTab,     setSidebarTab]     = useState<"playlist" | "lyrics">("playlist");
  const [currentTime,    setCurrentTime]    = useState(0);
  const [autoplay,       setAutoplay]       = useState(true);
  const [showBar,        setShowBar]        = useState(false);
  const [isPlaying,      setIsPlaying]      = useState(true);
  const [userRating,     setUserRating]     = useState(0);
  const [hoverRating,    setHoverRating]    = useState(0);
  const [ratingMsg,      setRatingMsg]      = useState("");
  const [showShare,      setShowShare]      = useState(false);
  const [repeatMode,     setRepeatMode]     = useState<"none" | "one" | "all">("none");
  const [queue,          setQueue]          = useState<Array<{idx:number;title:string;singer:string;ytId:string}>>([]);
  const [showQueue,      setShowQueue]      = useState(false);
  const [knowCount,      setKnowCount]      = useState(0);
  const [knowVoted,      setKnowVoted]      = useState(false);

  const playerRef  = useRef<HTMLIFrameElement>(null);
  const playerWrap = useRef<HTMLDivElement>(null);

  // ── Derived ────────────────────────────────────────────────────────────────
  const songs      = movie.media?.songs || [];
  const activeSong = songs[activeSongIdx] || songs[0];
  const activeIdx  = activeSong ? songs.indexOf(activeSong) : 0;
  const ytId       = activeSong?.ytId ? extractYtId(activeSong.ytId) : null;

  // ── Build all songs pool from related movies ───────────────────────────────
  const allSongs = (() => {
    const pool: Array<SongData & { movieId: string; movieTitle: string; moviePoster?: string; movieSlug?: string; songIdx: number; isCurrent: boolean }> = [];
    [movie, ...relatedMovies].forEach((m) => {
      (m.media?.songs || []).forEach((s, i) => {
        pool.push({
          ...s,
          movieId:    String(m._id),
          movieTitle: m.title,
          moviePoster: m.posterUrl,
          movieSlug:  m.slug,
          songIdx:    i,
          isCurrent:  String(m._id) === String(movie._id) && i === activeSongIdx,
        });
      });
    });
    return pool;
  })();

  const bySinger        = activeSong?.singer        ? allSongs.filter(s => !s.isCurrent && s.ytId && s.singer        && firstToken(s.singer)        === firstToken(activeSong.singer))        : [];
  const byMusicDirector = activeSong?.musicDirector ? allSongs.filter(s => !s.isCurrent && s.ytId && s.musicDirector && firstToken(s.musicDirector) === firstToken(activeSong.musicDirector)) : [];
  const byLyricist      = activeSong?.lyricist      ? allSongs.filter(s => !s.isCurrent && s.ytId && s.lyricist      && firstToken(s.lyricist)      === firstToken(activeSong.lyricist))      : [];

  // ── Effects ────────────────────────────────────────────────────────────────
  // Auto-switch to lyrics tab when song changes
  useEffect(() => {
    if (activeSong?.lyrics?.trim()) setSidebarTab("lyrics");
    else setSidebarTab("playlist");
    setCurrentTime(0);
  }, [activeSong?.title, activeIdx]);

  // Save to recently played
  useEffect(() => {
    if (!activeSong || !movie) return;
    try {
      const item = {
        title: activeSong.title, singer: activeSong.singer || "",
        ytId: activeSong.ytId || "", movieTitle: movie.title,
        movieId: String(movie._id), movieSlug: movie.slug, songIdx: activeIdx,
        thumb: activeSong.ytId ? ytThumb(activeSong.ytId) : "",
        ts: Date.now(),
      };
      const prev = JSON.parse(localStorage.getItem("op_recent_songs") || "[]")
        .filter((r: any) => !(r.title === item.title && r.movieId === item.movieId));
      localStorage.setItem("op_recent_songs", JSON.stringify([item, ...prev].slice(0, 20)));
    } catch {}
    // Load rating
    const saved = parseInt(localStorage.getItem(`rating_${movie._id}_${activeIdx}`) || "0", 10);
    setUserRating(saved);
    setRatingMsg("");
    // Load know count
    try {
      const kd = JSON.parse(localStorage.getItem(`know_${movie._id}_${activeIdx}`) || "{}");
      setKnowCount(kd.count || 0);
      setKnowVoted(kd.voted || false);
    } catch {}
  }, [activeSong?.title, activeIdx]);

  // Show/hide Now Playing bar on scroll
  useEffect(() => {
    const onScroll = () => {
      if (!playerWrap.current) return;
      setShowBar(playerWrap.current.getBoundingClientRect().bottom < 60);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // YouTube postMessage — sync time, play/pause, autoplay
  useEffect(() => {
    if (!ytId) return;
    const onMsg = (e: MessageEvent) => {
      try {
        const d = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
        if (d?.event === "infoDelivery" && d?.info?.currentTime != null) {
          setCurrentTime(d.info.currentTime);
          if (d.info.playerState === 1) setIsPlaying(true);
          if (d.info.playerState === 2) setIsPlaying(false);
          if (d.info.playerState === 0) {
            if (repeatMode === "one") {
              setTimeout(() => playerRef.current?.contentWindow?.postMessage(
                JSON.stringify({ event: "command", func: "seekTo", args: [0, true] }), "*"), 300);
            } else if (queue.length > 0) {
              const [next, ...rest] = queue;
              setQueue(rest);
              setTimeout(() => changeActiveSong(next.idx), 800);
            } else if (autoplay || repeatMode === "all") {
              const nextIdx = repeatMode === "all" && activeIdx === songs.length - 1 ? 0 : activeIdx + 1;
              if (nextIdx < songs.length) setTimeout(() => changeActiveSong(nextIdx), 800);
            }
          }
        }
      } catch {}
    };
    window.addEventListener("message", onMsg);
    const interval = setInterval(() => {
      try {
        playerRef.current?.contentWindow?.postMessage(JSON.stringify({ event: "listening" }), "*");
      } catch {}
    }, 1000);
    return () => { window.removeEventListener("message", onMsg); clearInterval(interval); };
  }, [ytId, repeatMode, queue, autoplay, activeIdx, songs.length]);

  // Update URL when song changes (without full navigation)
  useEffect(() => {
    if (!activeSong) return;
    const url = buildSongUrl(movie, activeIdx, activeSong);
    window.history.replaceState(null, "", url);
  }, [activeIdx, activeSong?.title]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const changeActiveSong = useCallback((idx: number) => {
    const s = songs[idx];
    if (!s) return;
    setActiveSongIdx(idx);
  }, [songs]);

  const handleRelatedSongClick = (s: any) => {
    // If same movie — just switch index
    if (String(s.movieId) === String(movie._id)) {
      changeActiveSong(s.songIdx ?? 0);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      router.push(`/songs/${s.movieSlug || s.movieId}/${s.songIdx ?? 0}`);
    }
  };

  const handleRate = (stars: number) => {
    setUserRating(stars);
    localStorage.setItem(`rating_${movie._id}_${activeIdx}`, String(stars));
    setRatingMsg(["😕", "😐", "🙂", "😊", "🤩"][stars - 1] + " Thanks for rating!");
    setTimeout(() => setRatingMsg(""), 2500);
  };

  const handleKnow = () => {
    if (knowVoted) return;
    const key = `know_${movie._id}_${activeIdx}`;
    const newCount = knowCount + 1;
    try { localStorage.setItem(key, JSON.stringify({ count: newCount, voted: true })); } catch {}
    setKnowCount(newCount);
    setKnowVoted(true);
  };

  const togglePlay = () => {
    const cmd = isPlaying ? "pauseVideo" : "playVideo";
    try { playerRef.current?.contentWindow?.postMessage(JSON.stringify({ event: "command", func: cmd, args: [] }), "*"); } catch {}
    setIsPlaying((p) => !p);
  };

  const addToQueue = (idx: number) => {
    const s = songs[idx];
    if (!s || idx === activeIdx) return;
    setQueue((q) => q.some((x) => x.idx === idx) ? q : [...q, { idx, title: s.title, singer: s.singer || "", ytId: s.ytId || "" }]);
    setShowQueue(true);
  };

  const bannerImg = movie.thumbnailUrl || ytThumb(movie.media?.trailer?.ytId) || movie.posterUrl;
  const verdictColor = (v?: string) =>
    !v ? "#9ca3af" :
    ["Hit","Super Hit","Blockbuster"].includes(v) ? "#4ade80" :
    v === "Upcoming" ? "#c9973a" : "#f87171";

  if (!activeSong) return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-gray-500">
      <p>No songs found for this movie.</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-[58px]">

      {/* ── Hero section with blurred banner ─── */}
      <div className="relative bg-[#0a0a0a] overflow-hidden pt-4">
        {bannerImg && (
          <>
            <div className="absolute inset-0 bg-cover bg-center scale-[1.06]"
              style={{ backgroundImage: `url(${bannerImg})`, filter: "blur(22px) brightness(0.16)" }} />
            <div className="absolute inset-0 bg-gradient-to-b from-black/50 to-[#0a0a0a]" />
          </>
        )}

        {/* Back + Breadcrumb */}
        <div className="relative z-10 px-4 sm:px-6 lg:px-10 pb-2">
          <Link href={`/movie/${movie.slug}`}
            className="inline-flex items-center gap-1.5 text-white/55 text-xs font-semibold hover:text-orange-400 transition-colors py-1.5">
            ← {movie.title}
          </Link>
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 flex-wrap text-xs text-gray-500 mt-0.5">
            <Link href="/" className="hover:text-orange-400 transition-colors">Home</Link>
            <span className="opacity-35">›</span>
            <Link href="/songs" className="hover:text-orange-400 transition-colors">Songs</Link>
            <span className="opacity-35">›</span>
            <Link href={`/movie/${movie.slug}`} className="hover:text-orange-400 transition-colors">{movie.title}</Link>
            <span className="opacity-35">›</span>
            <span className="text-white/70 font-medium">{activeSong.title}</span>
          </nav>
        </div>

        {/* Main 2-col grid */}
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[1fr_300px] xl:grid-cols-[1fr_320px] gap-5 px-4 sm:px-6 lg:px-10 pb-10 max-w-[1380px]">

          {/* ── LEFT: Player + Info ─── */}
          <div className="min-w-0">
            {/* YouTube player */}
            <div ref={playerWrap} className="rounded-xl overflow-hidden shadow-2xl bg-black aspect-video mb-4">
              {ytId ? (
                <iframe
                  key={ytId}
                  ref={playerRef}
                  src={`https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0&enablejsapi=1`}
                  title={activeSong.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full border-0"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-[#1a1a1a]">
                  <span className="text-4xl">🎵</span>
                  <p className="text-gray-500 text-sm">No YouTube link available</p>
                </div>
              )}
            </div>

            {/* Song info card */}
            <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-4 sm:p-5 mb-4">
              {/* Badges */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                <span className="text-xs px-2.5 py-1 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-400 font-semibold">🎵 Song</span>
                {activeSong.singer        && <span className="text-xs px-2.5 py-1 rounded-full border border-white/15 text-gray-300 font-medium">🎤 {activeSong.singer}</span>}
                {activeSong.musicDirector && <span className="text-xs px-2.5 py-1 rounded-full border border-white/15 text-gray-300 font-medium">🎼 {activeSong.musicDirector}</span>}
                {activeSong.lyricist      && <span className="text-xs px-2.5 py-1 rounded-full border border-white/15 text-gray-300 font-medium">✍️ {activeSong.lyricist}</span>}
              </div>

              {/* Title */}
              <h1 className="font-black text-2xl sm:text-3xl text-white leading-tight mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
                {activeSong.title}
              </h1>

              {/* Meta rows */}
              {[
                activeSong.singer        && ["Singer",     "🎤", activeSong.singer,        "text-orange-400 font-semibold"],
                activeSong.musicDirector && ["Music Dir.", "🎼", activeSong.musicDirector, "text-white"],
                activeSong.lyricist      && ["Lyricist",   "✍️", activeSong.lyricist,      "text-white"],
              ].filter(Boolean).map(([label, icon, val, cls]: any) => (
                <div key={label} className="flex items-center gap-2 py-1.5 border-b border-white/[0.05]">
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest w-20 flex-shrink-0">{label}</span>
                  <span className={`text-sm ${cls}`}>{icon} {val}</span>
                </div>
              ))}

              {/* Actions row */}
              <div className="flex items-center gap-2 flex-wrap pt-3">
                {/* Know this song */}
                <button
                  onClick={handleKnow}
                  className={[
                    "inline-flex items-center gap-1.5 px-4 py-2 rounded-full border text-xs font-bold transition-all",
                    knowVoted
                      ? "bg-orange-500/15 border-orange-500/40 text-orange-400"
                      : "border-white/15 text-gray-400 hover:border-orange-500/30 hover:text-orange-400",
                  ].join(" ")}
                >
                  🎙 {knowVoted ? `${knowCount} know this` : "I know this song!"}
                </button>

                {/* Autoplay */}
                <button
                  onClick={() => setAutoplay(p => !p)}
                  className={[
                    "inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all",
                    autoplay ? "text-orange-400 bg-orange-500/10" : "text-gray-500 hover:text-white hover:bg-white/5",
                  ].join(" ")}
                >
                  <span className={["w-7 h-4 rounded-full relative transition-colors", autoplay ? "bg-orange-400" : "bg-gray-600"].join(" ")}>
                    <span className={["absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform", autoplay ? "translate-x-3.5" : "translate-x-0.5"].join(" ")} />
                  </span>
                  Autoplay
                </button>

                {/* Repeat */}
                <button
                  onClick={() => setRepeatMode(m => m === "none" ? "one" : m === "one" ? "all" : "none")}
                  className={[
                    "px-3 py-2 rounded-lg text-xs font-semibold transition-all",
                    repeatMode !== "none" ? "text-orange-400 bg-orange-500/10" : "text-gray-500 hover:text-white hover:bg-white/5",
                  ].join(" ")}
                >
                  {repeatMode === "one" ? "🔂 One" : repeatMode === "all" ? "🔁 All" : "🔁 Repeat"}
                </button>

                {/* Share */}
                <button onClick={() => setShowShare(true)}
                  className="ml-auto px-3 py-2 rounded-lg text-xs font-semibold text-gray-400 hover:text-white hover:bg-white/5 transition-all">
                  📤 Share
                </button>

                {/* Star rating */}
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button key={star}
                      className={["text-lg transition-all", (hoverRating || userRating) >= star ? "opacity-100" : "opacity-25 grayscale"].join(" ")}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => handleRate(star)}>
                      ⭐
                    </button>
                  ))}
                  {ratingMsg && <span className="text-xs text-orange-400 ml-1">{ratingMsg}</span>}
                </div>
              </div>
            </div>

            {/* Song description */}
            {activeSong.description && (
              <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-4 sm:p-5 mb-4">
                <p className="text-[11px] font-black tracking-[0.12em] uppercase text-gray-500 mb-2">🎵 About This Song</p>
                <p className="text-sm text-white/75 leading-relaxed">{activeSong.description}</p>
              </div>
            )}

            {/* Queue */}
            {showQueue && (
              <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl overflow-hidden mb-4">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06]">
                  <span className="text-[11px] font-black tracking-widest uppercase text-gray-500">📋 Queue ({queue.length})</span>
                  <button onClick={() => setQueue([])} className="text-xs text-gray-500 hover:text-white transition-colors">Clear</button>
                </div>
                {queue.length === 0 ? (
                  <p className="px-4 py-3 text-xs text-gray-600 text-center">Queue is empty. Right-click a song to add it!</p>
                ) : queue.map((q, i) => {
                  const thumb = q.ytId ? ytThumb(q.ytId) : null;
                  return (
                    <div key={i} className="flex items-center gap-3 px-3 py-2 border-b border-white/[0.04] cursor-pointer hover:bg-white/5"
                      onClick={() => { setQueue((p) => p.filter((_, pi) => pi !== i)); changeActiveSong(q.idx); }}>
                      <div className="w-11 h-8 rounded overflow-hidden bg-[#1a1a1a] flex-shrink-0">
                        {thumb && <img src={thumb} alt={q.title} className="w-full h-full object-cover" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate text-white">{q.title}</p>
                        {q.singer && <p className="text-xs text-gray-500">🎤 {q.singer}</p>}
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); setQueue((p) => p.filter((_, pi) => pi !== i)); }}
                        className="text-gray-500 hover:text-white px-1 text-sm">✕</button>
                    </div>
                  );
                })}
                <p className="px-4 py-2 text-[11px] text-gray-600 border-t border-white/[0.05]">
                  💡 Right-click any song in the playlist to add to queue
                </p>
              </div>
            )}

            {/* About the movie */}
            <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-4 sm:p-5">
              <p className="text-[11px] font-black tracking-[0.12em] uppercase text-gray-500 mb-3">About This Movie</p>
              {[
                ["Track",    `#${activeIdx + 1} of ${songs.length} in ${movie.title}`],
                movie.language && ["Language", `🌐 ${movie.language}`],
                movie.verdict  && ["Verdict",  movie.verdict],
                movie.imdbRating && ["IMDb",   `⭐ ${movie.imdbRating}/10`],
              ].filter(Boolean).map(([label, val]: any) => (
                <div key={label} className="flex items-start gap-3 py-2 border-b border-white/[0.05]">
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest w-20 flex-shrink-0 pt-0.5">{label}</span>
                  <span className={["text-sm", label === "Verdict" ? "" : "text-white"].join(" ")}
                    style={label === "Verdict" ? { color: verdictColor(val), fontWeight: 700 } : {}}>
                    {val}
                  </span>
                </div>
              ))}
              {movie.genre && movie.genre.length > 0 && (
                <div className="flex items-start gap-3 py-2">
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest w-20 flex-shrink-0 pt-0.5">Genre</span>
                  <div className="flex flex-wrap gap-1.5">
                    {movie.genre.map((g) => (
                      <span key={g} className="text-xs px-2.5 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20">{g}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT SIDEBAR: Playlist + Lyrics ─── */}
          <div className="bg-black/40 border border-white/[0.07] rounded-xl overflow-hidden flex flex-col lg:sticky lg:top-[70px] lg:self-start lg:max-h-[calc(100vh-90px)]">
            {/* Movie header */}
            <div className="p-3 border-b border-white/[0.07] flex-shrink-0">
              <div className="flex gap-2.5 items-start mb-2">
                {movie.posterUrl && (
                  <Link href={`/movie/${movie.slug}`} className="flex-shrink-0">
                    <img src={movie.posterUrl} alt={movie.title}
                      className="w-10 h-14 object-cover rounded border border-white/15 cursor-pointer"
                      onError={(e) => { (e.target as HTMLElement).style.display = "none"; }} />
                  </Link>
                )}
                <div className="flex-1 min-w-0">
                  <Link href={`/movie/${movie.slug}`}
                    className="text-xs font-bold text-orange-400 leading-tight truncate block hover:text-orange-300 transition-colors">
                    {movie.title}
                  </Link>
                  {movie.releaseDate && <p className="text-xs text-gray-500 mt-0.5">{fmtDate(movie.releaseDate)}</p>}
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-white/[0.08] flex-shrink-0">
              {(["playlist", "lyrics"] as const).map((tab) => (
                <button key={tab} onClick={() => setSidebarTab(tab)}
                  className={[
                    "flex-1 py-2.5 text-center text-xs font-bold uppercase tracking-wide border-b-2 transition-all",
                    sidebarTab === tab
                      ? "text-orange-400 border-orange-400"
                      : "text-gray-500 border-transparent hover:text-gray-300",
                  ].join(" ")}>
                  {tab === "playlist" ? `🎵 Playlist (${songs.length})` : "✍️ Lyrics"}
                  {tab === "lyrics" && activeSong?.lyrics && (
                    <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-orange-400 align-middle" />
                  )}
                </button>
              ))}
            </div>

            {/* Playlist */}
            {sidebarTab === "playlist" && (
              <div className="overflow-y-auto flex-1 p-1.5">
                {songs.length === 0
                  ? <p className="text-center text-gray-600 text-xs py-8">No songs</p>
                  : songs.map((s, i) => (
                      <div key={i} onContextMenu={(e) => { e.preventDefault(); addToQueue(i); }}>
                        <SongItem song={s} active={i === activeIdx} onClick={() => changeActiveSong(i)} index={i} />
                      </div>
                    ))
                }
              </div>
            )}

            {/* Lyrics */}
            {sidebarTab === "lyrics" && (
              <LyricsPanel lyrics={activeSong?.lyrics} currentTime={currentTime} />
            )}

            {/* Footer */}
            <div className="p-3 border-t border-white/[0.07] flex-shrink-0">
              <Link href={`/movie/${movie.slug}`}
                className="block w-full py-2 text-center text-xs font-bold border border-white/15 text-white/70 rounded-lg hover:border-orange-500/30 hover:text-orange-400 transition-all">
                🎬 View Full Movie Page
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── Related sections ─── */}
      <div className="bg-[#0a0a0a] pb-20">

        {/* More by Singer — Spotify style */}
        {bySinger.length > 0 && (
          <section className="mb-2 pt-4">
            <div className="px-4 sm:px-6 mb-3">
              <h2 className="font-bold text-sm sm:text-base">
                🎤 More by {activeSong.singer?.split(/[,&]/)[0]?.trim()}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">Songs you may also like</p>
            </div>
            <div className="flex gap-3 overflow-x-auto px-4 sm:px-6 pb-3 scrollbar-none">
              {bySinger.slice(0, 12).map((s, i) => (
                <SpotifyCard key={i} song={s} onClick={() => handleRelatedSongClick(s)} />
              ))}
            </div>
          </section>
        )}

        {byMusicDirector.length > 0 && (
          <SongScrollRow
            title={`🎼 More by ${activeSong.musicDirector?.split(/[,&]/)[0]?.trim()}`}
            songs={byMusicDirector.slice(0, 15)}
            onSongClick={handleRelatedSongClick}
          />
        )}

        {byLyricist.length > 0 && (
          <SongScrollRow
            title={`✍️ More by ${activeSong.lyricist?.split(/[,&]/)[0]?.trim()}`}
            songs={byLyricist.slice(0, 15)}
            onSongClick={handleRelatedSongClick}
          />
        )}

        {/* Movies with same singer */}
        {activeSong.singer && (() => {
          const singerName = firstToken(activeSong.singer);
          const singerMovies = [movie, ...relatedMovies].filter(m =>
            String(m._id) !== String(movie._id) &&
            m.media?.songs?.some(s => s.singer && firstToken(s.singer) === singerName)
          ).slice(0, 14);
          if (!singerMovies.length) return null;
          return (
            <section className="mb-4">
              <div className="px-4 sm:px-6 mb-3">
                <h2 className="font-bold text-sm sm:text-base">
                  🎬 More films with {activeSong.singer?.split(/[,&]/)[0]?.trim()}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">Movies where this singer has songs</p>
              </div>
              <div className="flex gap-3 overflow-x-auto px-4 sm:px-6 pb-3 scrollbar-none">
                {singerMovies.map((m) => {
                  const count = m.media?.songs?.filter(s => s.singer && firstToken(s.singer) === singerName).length || 0;
                  return (
                    <Link key={String(m._id)} href={`/movie/${m.slug}`}
                      className="flex-shrink-0 w-[120px] group transition-transform hover:-translate-y-1">
                      <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-[#1a1a1a] shadow-lg border border-white/[0.06]">
                        {(m.posterUrl || m.thumbnailUrl) && (
                          <Image src={m.posterUrl || m.thumbnailUrl || ""} alt={m.title} fill className="object-cover" sizes="120px" />
                        )}
                        <div className="absolute top-1.5 right-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-lg bg-black/75 text-orange-400">
                          {count} songs
                        </div>
                      </div>
                      <p className="text-xs font-bold text-white truncate mt-1.5">{m.title}</p>
                      {m.releaseDate && <p className="text-[10px] text-gray-500">{new Date(m.releaseDate).getFullYear()}</p>}
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })()}

        {/* Cast of this movie */}
        {movie.cast && movie.cast.length > 0 && (
          <section className="mb-4">
            <div className="px-4 sm:px-6 mb-3">
              <h2 className="font-bold text-sm sm:text-base">🎭 Cast of {movie.title}</h2>
            </div>
            <div className="flex gap-3 overflow-x-auto px-4 sm:px-6 pb-3 scrollbar-none">
              {movie.cast.map((c, i) => (
                <Link key={i} href={c.castId ? `/cast/${c.castId}` : "#"}
                  className="flex-shrink-0 w-[110px] group transition-transform hover:-translate-y-1">
                  <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-[#1a1a1a] border border-white/[0.06]">
                    {c.photo ? (
                      <Image src={c.photo} alt={c.name} fill className="object-cover" sizes="110px" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-3xl">👤</div>
                    )}
                    <div className="absolute bottom-0 inset-x-0 px-1.5 py-1 bg-gradient-to-t from-black/75 to-transparent">
                      <span className="text-[10px] text-white/70 font-semibold">{c.type || "Actor"}</span>
                    </div>
                  </div>
                  <p className="text-xs font-bold text-white truncate mt-1.5">{c.name}</p>
                  {c.role && <p className="text-[10px] text-orange-400 truncate">{c.role}</p>}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Related films (same genre) */}
        {(() => {
          const related = relatedMovies
            .filter(m => movie.genre?.some(g => m.genre?.includes(g)))
            .sort((a, b) => new Date(b.releaseDate || 0).getTime() - new Date(a.releaseDate || 0).getTime())
            .slice(0, 15);
          if (!related.length) return null;
          return (
            <section className="mb-4">
              <div className="px-4 sm:px-6 mb-3">
                <h2 className="font-bold text-sm sm:text-base">🎬 Related Films</h2>
              </div>
              <div className="flex gap-3 overflow-x-auto px-4 sm:px-6 pb-3 scrollbar-none">
                {related.map((m) => (
                  <Link key={String(m._id)} href={`/movie/${m.slug}`}
                    className="flex-shrink-0 w-[120px] group transition-transform hover:-translate-y-1">
                    <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-[#1a1a1a] shadow-lg border border-white/[0.06]">
                      {(m.posterUrl || m.thumbnailUrl) && (
                        <Image src={m.posterUrl || m.thumbnailUrl || ""} alt={m.title} fill className="object-cover" sizes="120px" />
                      )}
                    </div>
                    <p className="text-xs font-bold text-white truncate mt-1.5">{m.title}</p>
                  </Link>
                ))}
              </div>
            </section>
          );
        })()}

        {/* SEO text block — helps AdSense approval with real content */}
        <div className="mx-4 sm:mx-6 mt-6 p-5 bg-[#111] border border-[#1f1f1f] rounded-xl">
          <h2 className="text-white font-bold text-sm mb-2">
            About "{activeSong.title}" — {movie.title}
          </h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            "{activeSong.title}" is{activeSong.singer ? ` sung by ${activeSong.singer}` : " an Odia film song"} from the{" "}
            {movie.genre?.length ? movie.genre.join(", ") + " " : ""}
            Odia film <strong className="text-white">{movie.title}</strong>
            {movie.releaseDate ? ` (${new Date(movie.releaseDate).getFullYear()})` : ""}.
            {activeSong.musicDirector ? ` Music is composed by ${activeSong.musicDirector}.` : ""}
            {activeSong.lyricist ? ` Lyrics are written by ${activeSong.lyricist}.` : ""}
            {" "}This is track #{activeIdx + 1} of {songs.length} songs in the movie.
            {movie.director ? ` The film is directed by ${movie.director}.` : ""}
            {" "}Explore the full playlist, read lyrics, and discover more Odia songs on Ollypedia — your complete guide to Ollywood music.
          </p>
        </div>
      </div>

      {/* ── Share Modal ─── */}
      {showShare && <ShareModal song={activeSong} movie={movie} onClose={() => setShowShare(false)} />}

      {/* ── Now Playing floating bar ─── */}
      <div className={[
        "fixed bottom-0 left-0 right-0 z-[200] flex items-center gap-3 px-4 sm:px-6 py-2.5",
        "bg-gradient-to-r from-[#0a0a0a]/97 to-[#140e00]/97 border-t border-orange-500/25 backdrop-blur-xl",
        "transition-transform duration-[350ms] cubic-bezier(0.34,1.56,0.64,1)",
        showBar ? "translate-y-0" : "translate-y-full",
      ].join(" ")}>
        <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-[#1a1a1a] border border-orange-500/30">
          {(activeSong.thumbnailUrl || ytId)
            ? <img src={activeSong.thumbnailUrl || ytThumb(ytId) || ""} alt={activeSong.title} className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center text-lg">🎵</div>
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white truncate">{activeSong.title}</p>
          {activeSong.singer && <p className="text-xs text-orange-400 mt-0.5">🎤 {activeSong.singer}</p>}
        </div>
        <button onClick={() => activeIdx > 0 && changeActiveSong(activeIdx - 1)}
          style={{ opacity: activeIdx > 0 ? 1 : 0.4 }}
          className="w-9 h-9 rounded-full bg-white/10 text-white flex items-center justify-center text-lg hover:bg-white/20 transition-all">‹</button>
        <button onClick={togglePlay}
          className="w-9 h-9 rounded-full bg-orange-500 text-black flex items-center justify-center text-sm font-bold hover:scale-110 transition-transform">
          {isPlaying ? "⏸" : "▶"}
        </button>
        <button onClick={() => activeIdx < songs.length - 1 && changeActiveSong(activeIdx + 1)}
          style={{ opacity: activeIdx < songs.length - 1 ? 1 : 0.4 }}
          className="w-9 h-9 rounded-full bg-white/10 text-white flex items-center justify-center text-lg hover:bg-white/20 transition-all">›</button>
        <button onClick={() => setShowShare(true)}
          className="w-9 h-9 rounded-full bg-white/10 text-white flex items-center justify-center text-xs hover:bg-white/20 transition-all">📤</button>
      </div>
    </div>
  );
}