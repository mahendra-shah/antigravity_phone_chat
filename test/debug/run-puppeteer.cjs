const puppeteer = require('puppeteer-core');
const fs = require('fs');

(async () => {
    const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
    const page = await browser.newPage();
    
    await page.goto('http://localhost:3000/test-dom.html');
    await new Promise(r => setTimeout(r, 2000));
    
    const boundingBox = await page.evaluate(() => {
        const el = document.querySelector('.chat-content').firstElementChild;
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        return { w: rect.width, h: rect.height, html: el.outerHTML.substring(0, 500) };
    });
    
    console.log(boundingBox);
    await page.close();
    process.exit(0);
})();
