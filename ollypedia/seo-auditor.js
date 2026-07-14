const fs = require('fs');
const http = require('http');

const BASE_URL = 'http://localhost:3001';

async function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    }).on('error', err => reject(err));
  });
}

async function runAudit() {
  console.log("Fetching sitemap...");
  let sitemapRaw;
  try {
    const res = await fetchUrl(`${BASE_URL}/sitemap.xml`);
    sitemapRaw = res.data;
  } catch (e) {
    console.error("Failed to fetch sitemap. Is dev server running on 3000?");
    return;
  }

  const urls = [...sitemapRaw.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]);
  console.log("Sitemap starting with:", sitemapRaw.slice(0, 300));
  console.log(`Found ${urls.length} URLs in sitemap.`);

  // To avoid hammering dev server, we sample the first 20 and specific dynamic routes
  const sampleUrls = urls.slice(0, 20);
  
  let report = "SEO AUDIT REPORT\n=================\n\n";

  for (const rawUrl of sampleUrls) {
    const localUrl = rawUrl.replace('https://www.ollypedia.in', BASE_URL);
    try {
      const res = await fetchUrl(localUrl);
      const html = res.data;
      
      const titleMatch = html.match(/<title>(.*?)<\/title>/);
      const title = titleMatch ? titleMatch[1] : "MISSING";
      
      const canonicalMatch = html.match(/<link rel="canonical" href="(.*?)"/);
      const canonical = canonicalMatch ? canonicalMatch[1] : "MISSING";
      
      const h1Matches = html.match(/<h1[\s>]/g) || [];
      const h1Count = h1Matches.length;

      const hasSchema = html.includes('application/ld+json');

      report += `URL: ${rawUrl}\n`;
      report += `Status: ${res.status}\n`;
      report += `Title: ${title}\n`;
      report += `Canonical: ${canonical}\n`;
      report += `H1 Count: ${h1Count}\n`;
      report += `Schema: ${hasSchema ? 'YES' : 'NO'}\n`;
      report += `-----------------\n`;
      
      console.log(`Audited: ${rawUrl} (Status: ${res.status})`);
    } catch (e) {
      console.error(`Failed to audit ${rawUrl}:`, e.message);
    }
  }

  // Also check a known bad URL to see if it soft 404s
  const badUrl = `${BASE_URL}/movie/this-slug-definitely-does-not-exist-12345`;
  try {
    const res = await fetchUrl(badUrl);
    report += `\nTEST INVALID URL: /movie/this-slug-definitely-does-not-exist-12345\n`;
    report += `Expected: 404\n`;
    report += `Actual Status: ${res.status}\n`;
  } catch (e) {}

  fs.writeFileSync('seo-report.txt', report);
  console.log("Audit complete. Report saved to seo-report.txt");
}

runAudit();
