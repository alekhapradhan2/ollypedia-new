// lib/trivia-constants.ts
// Shared between server (page.tsx) and client (DidYouKnow.tsx)
// Must NOT be a client module — no "use client" here

export const TRIVIA_EMOJIS = [
  "🎬","🌟","🏆","🎭","🎶","🎥","🍿","👑","🎞️","💫","🔥","🎊",
] as const;