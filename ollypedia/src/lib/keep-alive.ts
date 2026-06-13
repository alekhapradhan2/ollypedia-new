const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL; // e.g. https://ollypedia.onrender.com

export function startKeepAlive() {
  if (!SITE_URL) return;

  setInterval(async () => {
    try {
      const res = await fetch(`${SITE_URL}/api/ping`, { cache: 'no-store' });
      console.log(`[keep-alive] ping → ${res.status}`);
    } catch (err) {
      console.error('[keep-alive] ping failed:', err);
    }
  }, 5 * 60 * 1000); // every 5 minutes
}