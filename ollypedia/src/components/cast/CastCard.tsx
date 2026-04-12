"use client";
// components/cast/CastCard.tsx
// Cinema film-strip style card. Receives PlainPerson (serialised, no ObjectIds).

import Image from "next/image";
import CastCardLink from "./CastCardLink";
import type { PlainPerson } from "@/app/cast/page";

interface CastCardProps {
  person:   PlainPerson;
  priority?: boolean;
}

export default function CastCard({ person, priority = false }: CastCardProps) {
  const { _id, name, photo, type, filmCount } = person;
  const role = type ?? "Artist";

  return (
    <CastCardLink href={`/cast/${_id}`} style={{ flexShrink: 0, width: 136 }}>
      <div className="cast-card-root">

        {/* Film-strip top */}
        <div className="strip">
          {Array.from({ length: 5 }).map((_, i) => <span key={i} className="hole" />)}
        </div>

        {/* Photo */}
        <div className="cast-photo-wrap">
          {photo ? (
            <Image
              src={photo}
              alt={`${name} – Odia ${role}`}
              fill sizes="136px"
              priority={priority}
              className="cast-photo-img"
            />
          ) : (
            <div className="cast-placeholder">
              <span style={{ fontSize: "2.6rem", opacity: .45 }}>🎭</span>
            </div>
          )}
          <div className="cast-overlay" />
          {filmCount > 0 && (
            <div className="cast-badge">🎬 {filmCount}</div>
          )}
        </div>

        {/* Film-strip bottom */}
        <div className="strip">
          {Array.from({ length: 5 }).map((_, i) => <span key={i} className="hole" />)}
        </div>

        {/* Info */}
        <div className="cast-info">
          <p className="cast-name">{name}</p>
          <p className="cast-role">{role}</p>
        </div>

        {/* Hover shimmer */}
        <div className="cast-shimmer" />
      </div>

      <style>{`
        .cast-card-root {
          position: relative;
          width: 136px;
          border-radius: 10px;
          overflow: hidden;
          background: #111;
          border: 1px solid rgba(255,255,255,.07);
          box-shadow: 0 6px 20px rgba(0,0,0,.55);
          transition:
            transform .22s cubic-bezier(.34,1.56,.64,1),
            box-shadow .22s ease,
            border-color .22s ease;
          cursor: pointer;
        }
        .cast-card-root:hover {
          transform: translateY(-5px) scale(1.02);
          box-shadow: 0 18px 40px rgba(0,0,0,.75), 0 0 0 1px rgba(201,151,58,.4);
          border-color: rgba(201,151,58,.35);
        }

        /* Film strip */
        .strip {
          display: flex;
          justify-content: space-around;
          align-items: center;
          background: #0a0a0a;
          padding: 3px 6px;
        }
        .hole {
          display: inline-block;
          width: 10px; height: 7px;
          border-radius: 2px;
          background: rgba(255,255,255,.12);
          border: 1px solid rgba(255,255,255,.06);
        }

        /* Photo area */
        .cast-photo-wrap {
          position: relative;
          width: 136px; height: 170px;
          overflow: hidden;
          background: #1c1c1c;
          display: flex; align-items: center; justify-content: center;
        }
        .cast-placeholder {
          position: absolute; inset: 0;
          display: flex; align-items: center; justify-content: center;
          background: linear-gradient(135deg,#1a1a1a,#222);
        }
        .cast-photo-img {
          object-fit: cover;
          transition: transform .4s ease;
        }
        .cast-card-root:hover .cast-photo-img {
          transform: scale(1.07);
        }
        .cast-overlay {
          position: absolute; inset: 0; pointer-events: none;
          background: linear-gradient(to top,rgba(0,0,0,.82) 0%,rgba(0,0,0,.05) 55%,transparent 100%);
        }
        .cast-badge {
          position: absolute; bottom: 7px; right: 7px;
          background: rgba(0,0,0,.72);
          border: 1px solid rgba(201,151,58,.4);
          border-radius: 20px;
          padding: 2px 8px;
          font-size: .57rem; font-weight: 800; color: #c9973a;
          backdrop-filter: blur(4px);
        }

        /* Info */
        .cast-info {
          padding: 9px 10px 11px;
          background: linear-gradient(to bottom,#111,#0d0d0d);
        }
        .cast-name {
          margin: 0;
          font-size: .76rem; font-weight: 800; color: #fff;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          letter-spacing: .01em; line-height: 1.25;
        }
        .cast-role {
          margin: 3px 0 0;
          font-size: .59rem; font-weight: 700; color: #c9973a;
          letter-spacing: .06em; text-transform: uppercase;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }

        /* Gold shimmer on hover */
        .cast-shimmer {
          position: absolute; inset: 0; border-radius: 10px;
          background: linear-gradient(115deg,transparent 30%,rgba(201,151,58,.1) 50%,transparent 70%);
          background-size: 200% 100%; background-position: 200% 0;
          opacity: 0; pointer-events: none; transition: opacity .2s;
        }
        .cast-card-root:hover .cast-shimmer {
          opacity: 1;
          animation: shimmer-sweep .55s ease forwards;
        }
        @keyframes shimmer-sweep {
          from { background-position: 200% 0; }
          to   { background-position: -50% 0; }
        }
      `}</style>
    </CastCardLink>
  );
}