/**
 * src/lib/slug.ts
 * Centralized, hardened slugifier for Ollypedia.
 * 
 * Fixes:
 *  - Decodes HTML entities (&amp;, &#39;, &quot;, &lt;, &gt;, &nbsp;)
 *  - Handles unicode escape sequences and literal text variants (\u0026, u0026) -> "and"
 *  - Replaces & with "and"
 *  - Strips non-alphanumeric characters (keeping only a-z, 0-9, and -)
 *  - Normalizes accented / diacritic characters
 *  - Collapses duplicate hyphens and whitespace into a single hyphen
 *  - Strictly trims leading and trailing hyphens (/^-+|-+$/g)
 *  - Guarantees no empty fragments, leading hyphens, or trailing hyphens with safe fallback
 */

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/gi, " and ")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&nbsp;/gi, " ");
}

export function toSlug(str?: string | null, fallback = ""): string {
  if (!str) return fallback;

  let s = String(str).trim();

  // 1. Decode HTML entities
  s = decodeHtmlEntities(s);

  // 2. Decode unicode escape sequences like \u0026 or raw literal string u0026
  s = s.replace(/\\u0026/gi, " and ");
  s = s.replace(/\bu0026\b/gi, " and ");

  // 3. Replace ampersands with "and"
  s = s.replace(/&/g, " and ");

  // 4. Normalize accents / diacritics (e.g. é -> e)
  s = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // 5. Convert to lowercase, remove invalid chars, collapse spaces/hyphens
  s = s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  return s || fallback;
}
