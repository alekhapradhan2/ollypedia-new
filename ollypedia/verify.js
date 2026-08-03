const fs = require('fs');
const http = require('http');
const https = require('https');

const URLS = [
  'http://localhost:3000/',
  'http://localhost:3000/movies',
  'http://localhost:3000/movie/aashiq',
  'http://localhost:3000/blog',
  'http://localhost:3000/blog/odia-cinema-history',
  'http://localhost:3000/songs',
  'http://localhost:3000/songs/aashiq',
  'http://localhost:3000/cast',
  'http://localhost:3000/cast/babushaan-mohanty',
  'http://localhost:3000/trailers',
  'http://localhost:3000/trailers/aashiq',
  'http://localhost:3000/ott'
];

async function fetchHTML(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function runAudit() {
  const results = {};
  for (const url of URLS) {
    try {
      console.log(`Fetching ${url}...`);
      const html = await fetchHTML(url);
      
      const hasTitle = html.includes('<title>');
      const hasCanonical = html.includes('rel="canonical"');
      const hasAdSense = html.includes('pagead2.googlesyndication.com') || html.includes('AdSense');
      const hasAdsComponent = html.includes('adsbygoogle');
      const hasSchema = html.includes('application/ld+json');
      const hasMetaDesc = html.includes('name="description"');
      const internalLinks = (html.match(/href="\/[^"]/g) || []).length;
      
      results[url] = {
        hasTitle,
        hasCanonical,
        hasAdSense,
        hasAdsComponent,
        hasSchema,
        hasMetaDesc,
        internalLinksCount: internalLinks,
        length: html.length
      };
    } catch (e) {
      results[url] = { error: e.message };
    }
  }
  
  fs.writeFileSync('audit-results.json', JSON.stringify(results, null, 2));
  console.log('Audit complete.');
}

runAudit();
