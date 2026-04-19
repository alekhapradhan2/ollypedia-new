import Image from "next/image";
import { Mic2 } from "lucide-react";

interface SongCardProps {
  song: {
    _id?: string;
    title: string;
    singer?: string;
    musicDirector?: string;
    ytId?: string;
    thumbnailUrl?: string;
    movieTitle?: string;
    movieSlug?: string;
  };
  onClick?: () => void;
}

export function SongCard({ song, onClick }: SongCardProps) {
  const thumb =
    song.thumbnailUrl ||
    (song.ytId
      ? `https://img.youtube.com/vi/${song.ytId}/mqdefault.jpg`
      : null);

  return (
    <>
      <style>{`
        .sc {
          background: #111;
          border: 1px solid #1e1e1e;
          border-radius: 14px;
          overflow: hidden;
          cursor: pointer;
          transition: border-color .2s ease, transform .2s ease;
          display: flex;
          flex-direction: column;
          -webkit-tap-highlight-color: transparent;
          user-select: none;
        }
        .sc:hover {
          border-color: rgba(201, 151, 58, .5);
          transform: translateY(-3px);
        }
        .sc:active { transform: translateY(-1px); }

        /* Thumbnail */
        .sc-thumb {
          position: relative;
          width: 100%;
          aspect-ratio: 16 / 9;
          background: #161616;
          overflow: hidden;
          flex-shrink: 0;
        }
        .sc-thumb-img {
          width: 100%; height: 100%;
          object-fit: cover;
          display: block;
          transition: transform .3s ease;
        }
        .sc:hover .sc-thumb-img { transform: scale(1.05); }

        /* Placeholder */
        .sc-thumb-ph {
          position: absolute; inset: 0;
          display: flex; align-items: center; justify-content: center;
          background: #161616;
        }

        /* Play overlay */
        .sc-overlay {
          position: absolute; inset: 0;
          background: rgba(0, 0, 0, .52);
          display: flex; align-items: center; justify-content: center;
          opacity: 0;
          transition: opacity .18s ease;
        }
        .sc:hover .sc-overlay { opacity: 1; }

        .sc-play-btn {
          width: 34px; height: 34px;
          border-radius: 50%;
          background: rgba(201, 151, 58, .92);
          display: flex; align-items: center; justify-content: center;
          transform: scale(.8);
          transition: transform .18s ease;
          box-shadow: 0 2px 16px rgba(201, 151, 58, .5);
        }
        .sc:hover .sc-play-btn { transform: scale(1); }

        .sc-play-tri {
          width: 0; height: 0;
          border-style: solid;
          border-width: 6px 0 6px 11px;
          border-color: transparent transparent transparent #0a0a0a;
          margin-left: 2px;
        }

        /* Body */
        .sc-body {
          padding: 10px 11px 12px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          flex: 1;
        }

        /* Title — 2-line clamp */
        .sc-title {
          font-weight: 700;
          font-size: 12.5px;
          line-height: 1.35;
          color: #f0f0f0;
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          transition: color .15s;
          letter-spacing: -.01em;
          margin-bottom: 2px;
        }
        .sc:hover .sc-title { color: #c9973a; }

        /* Singer row */
        .sc-singer {
          display: flex; align-items: center; gap: 4px;
          font-size: 11px; color: #999;
          overflow: hidden;
        }
        .sc-singer svg { flex-shrink: 0; opacity: .7; }
        .sc-singer span {
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }

        /* Movie pill */
        .sc-movie {
          display: inline-flex; align-items: center; gap: 3px;
          margin-top: 1px;
          padding: 2px 7px 2px 5px;
          background: rgba(255, 255, 255, .04);
          border: 1px solid rgba(255, 255, 255, .07);
          border-radius: 20px;
          font-size: 10px; color: #555;
          max-width: 100%; overflow: hidden;
          white-space: nowrap; text-overflow: ellipsis;
          transition: background .15s, border-color .15s, color .15s;
        }
        .sc:hover .sc-movie {
          background: rgba(201, 151, 58, .07);
          border-color: rgba(201, 151, 58, .2);
          color: #888;
        }

        /* Bottom progress bar — animates on hover */
        .sc-bar {
          height: 2px;
          background: #1a1a1a;
          border-radius: 2px;
          overflow: hidden;
          margin-top: 6px;
        }
        .sc-bar-fill {
          height: 100%;
          background: linear-gradient(to right, #c9973a, #8b5e1a);
          border-radius: 2px;
          width: 0;
          transition: width .28s ease;
        }
        .sc:hover .sc-bar-fill { width: 100%; }
      `}</style>

      <div
        className="sc"
        onClick={onClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onClick?.()}
        aria-label={`Play ${song.title}${song.singer ? ` by ${song.singer}` : ""}`}
      >
        {/* Thumbnail */}
        <div className="sc-thumb">
          {thumb ? (
            <Image
              src={thumb}
              alt={song.title || "Odia Song"}
              fill
              className="sc-thumb-img"
              sizes="(max-width: 480px) 50vw, (max-width: 768px) 33vw, 200px"
            />
          ) : (
            <div className="sc-thumb-ph">
              {/* Vinyl disc placeholder */}
              <svg
                width="32" height="32"
                viewBox="0 0 32 32"
                fill="none"
                style={{ color: "#2a2a2a" }}
              >
                <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="16" cy="16" r="8"  stroke="currentColor" strokeWidth="1"   />
                <circle cx="16" cy="16" r="3"  stroke="currentColor" strokeWidth="1"   />
              </svg>
            </div>
          )}

          {/* Play overlay */}
          <div className="sc-overlay" aria-hidden="true">
            <div className="sc-play-btn">
              <div className="sc-play-tri" />
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="sc-body">
          <div className="sc-title">{song.title || "Untitled"}</div>

          {song.singer && (
            <div className="sc-singer">
              <Mic2 width={10} height={10} />
              <span>{song.singer}</span>
            </div>
          )}

          {song.movieTitle && (
            <div className="sc-movie">
              <span style={{ fontSize: 9, opacity: 0.4, flexShrink: 0 }}>▶</span>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {song.movieTitle}
              </span>
            </div>
          )}

          <div className="sc-bar">
            <div className="sc-bar-fill" aria-hidden="true" />
          </div>
        </div>
      </div>
    </>
  );
}