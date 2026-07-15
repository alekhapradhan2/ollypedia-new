const fs = require('fs');

const pageFile = 'src/app/box-office/page.tsx';
let content = fs.readFileSync(pageFile, 'utf8');

// 1. Add import
if (!content.includes('AdSenseUnit')) {
  content = content.replace(
    'import Blog              from "@/models/Blog";',
    'import Blog              from "@/models/Blog";\nimport { AdSenseUnit }     from "@/components/ui/AdSenseUnit";'
  );
}

// 2. Open 3-column layout
const targetStart = `        {/* ── Main Content ── */}
        <div className="w-full max-w-screen-lg mx-auto px-3 sm:px-5 py-4 sm:py-6 space-y-5">`;

const replaceStart = `        {/* ── 3-Column Layout for Main Content & Ads ── */}
        <div className="w-full max-w-[1400px] mx-auto flex justify-center items-start gap-6 px-3 sm:px-5 py-4 sm:py-6">
          
          {/* Left Ad Unit */}
          <div className="hidden xl:block w-[160px] flex-shrink-0 sticky top-24 pt-2">
             <AdSenseUnit adSlot="8431068054" />
          </div>

          {/* Center Main Content */}
          <div className="w-full max-w-screen-lg flex-1 space-y-5">`;

if (content.includes(targetStart)) {
  content = content.replace(targetStart, replaceStart);
}

// 3. Close 3-column layout
const targetEnd = `          </nav>

        </div>
      </div>`;

const replaceEnd = `          </nav>
          </div> {/* End Center Main Content */}

          {/* Right Ad Unit */}
          <div className="hidden xl:block w-[160px] flex-shrink-0 sticky top-24 pt-2">
             <AdSenseUnit adSlot="8431068054" />
          </div>

        </div> {/* End 3-Column Layout */}
      </div>`;

if (content.includes(targetEnd)) {
  content = content.replace(targetEnd, replaceEnd);
}

fs.writeFileSync(pageFile, content, 'utf8');
console.log('Successfully updated page.tsx');
