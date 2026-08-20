// Helper utilities for community text sanitization, slugs, and rate limiting

export function sanitizeText(text: string): string {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function generateSlug(text: string): string {
  const base = text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/(^-|-$)/g, "");

  const randomSuffix = Math.random().toString(36).substring(2, 7);
  return `${base || "discussion"}-${randomSuffix}`;
}

// In-memory rate limiting map: key -> timestamps[]
const rateLimits = new Map<string, number[]>();

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetMs: number } {
  const now = Date.now();
  const windowStart = now - windowMs;

  let timestamps = rateLimits.get(key) || [];
  timestamps = timestamps.filter((t) => t > windowStart);

  if (timestamps.length >= limit) {
    const oldest = timestamps[0];
    const resetMs = oldest + windowMs - now;
    rateLimits.set(key, timestamps);
    return { allowed: false, remaining: 0, resetMs };
  }

  timestamps.push(now);
  rateLimits.set(key, timestamps);

  // Periodically clean up old keys if map exceeds 5000 items
  if (rateLimits.size > 5000) {
    for (const [k, ts] of rateLimits.entries()) {
      if (ts.length === 0 || ts[ts.length - 1] < windowStart) {
        rateLimits.delete(k);
      }
    }
  }

  return {
    allowed: true,
    remaining: limit - timestamps.length,
    resetMs: windowMs,
  };
}
