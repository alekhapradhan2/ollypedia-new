const fs = require('fs');
const path = require('path');

const srcAppDir = path.join(__dirname, 'src', 'app');

function getAllPageFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getAllPageFiles(filePath, fileList);
    } else if (file === 'page.tsx') {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const pageFiles = getAllPageFiles(srcAppDir);

function analyzePage(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const route = filePath.replace(srcAppDir, '').replace(/\\/g, '/').replace('/page.tsx', '') || '/';
  
  let scoreSEO = 100;
  let scoreIndexability = 100;
  let scoreRanking = 100;
  let scoreAds = 100;
  let scoreAdSense = 100;
  let scoreCWV = 100;
  let scorePerformance = 100;
  let scoreEEAT = 100;
  let scoreOverall = 100;

  const hasMetadata = content.includes('export const metadata') || content.includes('generateMetadata');
  if (!hasMetadata) {
    scoreSEO -= 20;
    scoreIndexability -= 10;
    scoreRanking -= 20;
  }

  const hasSchema = content.includes('application/ld+json') || content.includes('<JsonLd') || content.includes('generateSchema') || content.includes('Schema');
  if (!hasSchema) {
    scoreSEO -= 10;
    scoreRanking -= 10;
  }

  // More accurate check for unconditional noindex or missing robots
  // Actually, many Next.js pages rely on layout.tsx for robots meta. So if not present, it's fine.
  // We just penalize if we strictly see `index: false` not tied to an error condition, or similar.
  // To keep it simple, we won't falsely flag 'noindex' in comments.
  const hasNoIndex = content.match(/index:\s*false(?!\s*,\s*follow:\s*false\s*\}\s*;)/); // rough check, if we want to be safe we can just skip it if it's not a clear hardcoded noindex

  // Ads analysis (Actual components, not text)
  const hasAds = content.includes('<AdSense') || content.includes('<InArticleAd') || content.includes('<SidebarAd');
  const hasAdSlot = content.includes('data-ad-slot') || content.includes('adSlot=');
  const hasStableAdContainer = /min-[h|w]-\[\d+px\]/.test(content) || /height:\s*\d+/.test(content) || /h-\[\d+px\]/.test(content) || /w-\[\d+px\]/.test(content);

  if (hasAds) {
    if (!hasAdSlot && !content.includes('adSlot')) scoreAdSense -= 10;
    if (!hasStableAdContainer) {
      scoreAds -= 20;
      scoreCWV -= 30; // Layout shifts
      scorePerformance -= 10;
    }
  }

  // Performance / Next Image
  const hasImgTag = /<img\s/.test(content);
  if (hasImgTag) {
    scorePerformance -= 10;
    scoreCWV -= 10; // next/image is better
  }

  // EEAT (Basic proxy - Author, dates, etc.)
  const hasAuthor = content.includes('author') || content.includes('Author');
  const hasDate = content.includes('date') || content.includes('publishedAt') || content.includes('Date');
  if (route.includes('blog') || route.includes('news')) {
    if (!hasAuthor) scoreEEAT -= 20;
    if (!hasDate) scoreEEAT -= 10;
  }

  // Overall Score (average)
  scoreOverall = Math.round((scoreSEO + scoreIndexability + scoreRanking + scoreAds + scoreAdSense + scoreCWV + scorePerformance + scoreEEAT) / 8);

  return {
    route,
    type: route.split('/')[1] || 'Home',
    SEO: scoreSEO,
    Indexability: scoreIndexability,
    Ranking: scoreRanking,
    Ads: scoreAds,
    AdSense: scoreAdSense,
    CWV: scoreCWV,
    Performance: scorePerformance,
    EEAT: scoreEEAT,
    Overall: scoreOverall,
    hasAds,
    hasMetadata,
    hasSchema,
    hasStableAdContainer
  };
}

const results = pageFiles.map(analyzePage);
results.sort((a, b) => b.Overall - a.Overall);

fs.writeFileSync(path.join(__dirname, 'audit_results.json'), JSON.stringify(results, null, 2));
console.log('Audit completed. Found', results.length, 'pages.');
