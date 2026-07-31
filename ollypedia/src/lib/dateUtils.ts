/**
 * Safely format release dates for movies across the Next.js app.
 * Handles full dates (YYYY-MM-DD), month & year (YYYY-MM), year only (YYYY), and TBA / invalid dates without throwing errors.
 */
export function formatReleaseDate(
  dateStr?: string | null,
  precision?: string | null,
  monthFormat: "short" | "long" = "short"
): string {
  if (!dateStr || typeof dateStr !== "string") return "";
  const s = dateStr.trim();
  if (!s || s.toUpperCase() === "TBA") return "TBA";

  const shortMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const longMonths = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const months = monthFormat === "long" ? longMonths : shortMonths;

  // Detect precision if not explicitly provided
  let prec = precision;
  if (!prec) {
    if (/^\d{4}$/.test(s)) prec = "year";
    else if (/^\d{4}-\d{2}$/.test(s)) prec = "month";
    else prec = "full";
  }

  // Handle Year only
  if (prec === "year" || /^\d{4}$/.test(s)) {
    return s.slice(0, 4);
  }

  // Handle Year & Month
  if (prec === "month" || /^\d{4}-\d{2}$/.test(s)) {
    const parts = s.split("-");
    const year = parts[0];
    const m = parseInt(parts[1], 10);
    if (!isNaN(m) && m >= 1 && m <= 12) {
      return `${months[m - 1]} ${year}`;
    }
    return s;
  }

  // Handle Full date (YYYY-MM-DD)
  const cleanIso = s.split("T")[0];
  const parts = cleanIso.split("-");
  if (parts.length === 3) {
    const year = parts[0];
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);
    if (!isNaN(m) && m >= 1 && m <= 12 && !isNaN(d)) {
      return `${d} ${months[m - 1]} ${year}`;
    }
  }

  // Fallback to JS Date parsing
  const dt = new Date(s);
  if (isNaN(dt.getTime())) return s;
  return dt.toLocaleDateString("en-IN", {
    day: "numeric",
    month: monthFormat,
    year: "numeric",
  });
}

/**
 * Safely extract 4-digit release year from date string (YYYY, YYYY-MM, or YYYY-MM-DD)
 */
export function getReleaseYear(dateStr?: string | null): string {
  if (!dateStr || typeof dateStr !== "string") return "";
  const s = dateStr.trim();
  const m = s.match(/^(\d{4})/);
  return m ? m[1] : "";
}

/**
 * MongoDB Aggregation Helper:
 * Safely converts any releaseDate string ("YYYY", "YYYY-MM", "YYYY-MM-DD", or ISO)
 * into a valid MongoDB BSON Date without throwing "incomplete date/time string" errors.
 */
export function mongoDateExpr(field: string = "$releaseDate", fallbackDate: string = "1900-01-01") {
  return {
    $toDate: {
      $cond: [
        {
          $and: [
            { $ne: [field, null] },
            { $ne: [field, ""] },
            { $ne: [{ $strLenCP: { $trim: { input: { $toString: field } } } }, 0] },
            { $ne: [{ $toUpper: { $trim: { input: { $toString: field } } } }, "TBA"] },
          ],
        },
        {
          $concat: [
            { $trim: { input: { $toString: field } } },
            {
              $switch: {
                branches: [
                  { case: { $eq: [{ $strLenCP: { $trim: { input: { $toString: field } } } }, 4] }, then: "-01-01" },
                  { case: { $eq: [{ $strLenCP: { $trim: { input: { $toString: field } } } }, 7] }, then: "-01" },
                ],
                default: "",
              },
            },
          ],
        },
        fallbackDate,
      ],
    },
  };
}
