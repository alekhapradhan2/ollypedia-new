const puppeteer = require('puppeteer');
const fs = require('fs');
const https = require('https');
const http = require('http');

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  const platforms = [
    { name: 'aao-nxt', query: 'AAO NXT logo png' },
    { name: 'tarang-plus', query: 'Tarang Plus logo png' },
    { name: 'kancha-lanka', query: 'Kancha Lanka logo transparent png -stock -vector' },
    { name: 'youtube', query: 'YouTube logo png' }
  ];

  for (const p of platforms) {
    try {
      console.log('Searching for ' + p.name);
      await page.goto('https://duckduckgo.com/?q=' + encodeURIComponent(p.query) + '&iax=images&ia=images');
      await page.waitForSelector('.tile--img__img', { timeout: 10000 });
      const imgUrl = await page.evaluate(() => {
        const img = document.querySelector('.tile--img__img');
        return img ? img.src : null;
      });
      
      if (imgUrl) {
        console.log('Found ' + p.name + ': ' + imgUrl);
        // download it
        await new Promise((resolve) => {
          const client = imgUrl.startsWith('https') ? https : http;
          client.get(imgUrl, (res) => {
            const stream = fs.createWriteStream('public/platforms/' + p.name + '.png');
            res.pipe(stream);
            stream.on('finish', () => resolve());
          }).on('error', (e) => {
            console.error(e);
            resolve();
          });
        });
      } else {
        console.log('No image found for ' + p.name);
      }
    } catch (e) {
      console.log('Error for ' + p.name, e.message);
    }
  }

  await browser.close();
})();
