const fs = require('fs');

const clientFile = 'src/app/box-office/[slug]/BoxOfficeClient.tsx';
let content = fs.readFileSync(clientFile, 'utf8');

// 1. Add import
if (!content.includes('AdSenseUnit')) {
  content = content.replace(
    'import { useState } from "react";',
    'import { useState } from "react";\nimport { AdSenseUnit } from "@/components/ui/AdSenseUnit";'
  );
}

// 2. Replace Left placeholder
const targetLeft = `<div className="w-full h-[600px] bg-[#0f0f0f] border border-[#1c1c1c] rounded flex items-center justify-center overflow-hidden">
            <span className="text-xs text-gray-600 font-medium tracking-wider rotate-[-90deg] whitespace-nowrap">Advertisement</span>
            {/* Inject Google AdSense / Ad Unit Here */}
          </div>`;

if (content.includes(targetLeft)) {
  content = content.replace(targetLeft, `<AdSenseUnit adSlot="8431068054" />`);
}

// 3. Replace Right placeholder
const targetRight = `<div className="w-full h-[600px] bg-[#0f0f0f] border border-[#1c1c1c] rounded flex items-center justify-center overflow-hidden">
          <span className="text-xs text-gray-600 font-medium tracking-wider rotate-[90deg] whitespace-nowrap">Advertisement</span>
          {/* Inject Google AdSense / Ad Unit Here */}
        </div>`;

if (content.includes(targetRight)) {
  content = content.replace(targetRight, `<AdSenseUnit adSlot="8431068054" />`);
}

fs.writeFileSync(clientFile, content, 'utf8');
console.log('Successfully updated BoxOfficeClient.tsx');
