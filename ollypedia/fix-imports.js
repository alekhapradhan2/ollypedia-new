const fs = require('fs');

const files = [
  'src/app/blog/feed.xml/route.ts',
  'src/app/blog/page.tsx',
  'src/app/blog/[slug]/page.tsx',
  'src/app/box-office/page.tsx',
  'src/app/box-office/[slug]/page.tsx',
  'src/app/cast/page.tsx',
  'src/app/cast/[id]/page.tsx',
  'src/app/movie/[slug]/page.tsx',
  'src/app/privacy/page.tsx',
  'src/app/songs/[movieSlug]/[songIndex]/page.tsx',
  'src/app/songs/[movieSlug]/[songIndex]/[songSlug]/page.tsx'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Remove the badly injected line
  content = content.replace(/import \{ SITE_URL \} from "@\/lib\/seo";\n/g, '');
  
  // If we actually removed it OR it doesn't have SITE_URL imported but uses it
  if (content !== original || content.includes('SITE_URL')) {
      // Check if it's already imported correctly somewhere else in the file
      if (!content.match(/import\s+.*\{[^}]*SITE_URL[^}]*\}.*from\s+['"]@\/lib\/seo['"]/)) {
          let lines = content.split('\n');
          let insertIndex = 0;
          for (let i = 0; i < lines.length; i++) {
             if (!lines[i].trim().startsWith('//')) {
                 insertIndex = i;
                 break;
             }
          }
          lines.splice(insertIndex, 0, 'import { SITE_URL } from "@/lib/seo";');
          fs.writeFileSync(file, lines.join('\n'), 'utf8');
          console.log('Fixed syntax in:', file);
      } else {
          // It was already imported properly, just save the stripped version
          if (content !== original) {
              fs.writeFileSync(file, content, 'utf8');
              console.log('Stripped duplicate import from:', file);
          }
      }
  }
});
