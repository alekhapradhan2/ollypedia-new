export const OTT_PLATFORMS: Record<string, {
  name: string; slug: string; color: string; domain: string;
}> = {
  "aao-nxt": { name: "AAO NXT", slug: "aao-nxt", color: "#1B4FD8", domain: "aaonxt.com" },
  "tarang-plus": { name: "Tarang Plus", slug: "tarang-plus", color: "#ED1C24", domain: "tarangplus.in" },
  "kancha-lanka": { name: "Kancha Lanka", slug: "kancha-lanka", color: "#F7931E", domain: "kanchalanka.com" },
  "youtube": { name: "YouTube", slug: "youtube", color: "#FF0000", domain: "youtube.com" },
};

export function getPlatformInfo(platformName: string) {
  if (!platformName) return null;
  const normalized = platformName.toLowerCase().replace(/\s+/g, '-');
  // exact match
  if (OTT_PLATFORMS[normalized]) return OTT_PLATFORMS[normalized];
  
  // substring match for cases like "YouTube (Free)" or "TarangPlus"
  for (const [key, p] of Object.entries(OTT_PLATFORMS)) {
    if (normalized.includes(key.replace('-', ''))) return p;
    if (normalized.includes(p.name.toLowerCase().replace(/\s+/g, ''))) return p;
  }
  
  // Default generic fallback if not found
  return {
    name: platformName,
    slug: "",
    color: "#888888",
    domain: ""
  };
}
