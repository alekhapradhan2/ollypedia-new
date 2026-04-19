"use client";
// components/cast/CastCard.tsx
// AdSense-ready: semantic HTML, proper alt text, no deceptive layouts
// Design: editorial magazine style — clean portrait card with gold accent

import Image from "next/image";
import Link from "next/link";
import type { PlainPerson } from "@/app/cast/page";

interface CastCardProps {
  person:    PlainPerson;
  priority?: boolean;
}

const ROLE_COLORS: Record<string, { border: string; text: string; bg: string }> = {
  "Actor":           { border: "#f97316", text: "#f97316", bg: "#431407" },
  "Actress":         { border: "#ec4899", text: "#ec4899", bg: "#500724" },
  "Director":        { border: "#a78bfa", text: "#a78bfa", bg: "#2e1065" },
  "Singer":          { border: "#34d399", text: "#34d399", bg: "#022c22" },
  "Music Director":  { border: "#60a5fa", text: "#60a5fa", bg: "#172554" },
  "Producer":        { border: "#fbbf24", text: "#fbbf24", bg: "#451a03" },
  "Lyricist":        { border: "#f472b6", text: "#f472b6", bg: "#4a044e" },
  "Cinematographer": { border: "#38bdf8", text: "#38bdf8", bg: "#082f49" },
  "Choreographer":   { border: "#fb923c", text: "#fb923c", bg: "#431407" },
  "Editor":          { border: "#a3e635", text: "#a3e635", bg: "#1a2e05" },
};

const DEFAULT_COLOR = { border: "#c9973a", text: "#c9973a", bg: "#1c1208" };

export default function CastCard({ person, priority = false }: CastCardProps) {
  const { _id, name, photo, type, filmCount } = person;
  const role   = type ?? "Artist";
  const colors = ROLE_COLORS[role] ?? DEFAULT_COLOR;

  return (
    <article
      itemScope
      itemType="https://schema.org/Person"
      className="group"
    >
      <Link
        href={`/cast/${_id}`}
        className="block no-underline"
        aria-label={`View profile of ${name}, Odia ${role}`}
      >
        <div
          className="relative w-[136px] overflow-hidden rounded-xl bg-zinc-900 border border-zinc-800 transition-all duration-300 group-hover:-translate-y-1.5 group-hover:shadow-2xl"
          style={{
            boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
          }}
          // Glow on hover via inline style because dynamic color
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLDivElement).style.borderColor = colors.border;
            (e.currentTarget as HTMLDivElement).style.boxShadow = `0 16px 40px rgba(0,0,0,0.7), 0 0 0 1px ${colors.border}40`;
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLDivElement).style.borderColor = "#27272a";
            (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 16px rgba(0,0,0,0.5)";
          }}
        >
          {/* Photo */}
          <div className="relative w-[136px] h-[170px] bg-zinc-800 overflow-hidden">
            {photo ? (
              <Image
                src={photo}
                alt={`${name} — Odia ${role} in Ollywood`}
                fill
                sizes="136px"
                priority={priority}
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                itemProp="image"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900">
                <span className="text-5xl opacity-30" aria-hidden>🎭</span>
              </div>
            )}

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-transparent" />

            {/* Film count badge */}
            {filmCount > 0 && (
              <div
                className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black border backdrop-blur-sm"
                style={{
                  background: `${colors.bg}cc`,
                  borderColor: `${colors.border}60`,
                  color: colors.text,
                }}
              >
                🎬 {filmCount}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="px-2.5 py-2.5">
            <p
              className="text-white text-[0.72rem] font-bold leading-tight truncate mb-1"
              itemProp="name"
            >
              {name}
            </p>
            <p
              className="text-[0.58rem] font-black uppercase tracking-widest truncate"
              style={{ color: colors.text }}
              itemProp="jobTitle"
            >
              {role}
            </p>
          </div>
        </div>
      </Link>
    </article>
  );
}