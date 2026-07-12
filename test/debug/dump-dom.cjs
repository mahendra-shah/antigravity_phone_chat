const puppeteer = require('puppeteer-core');

(async () => {
    const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
    const page = await browser.newPage();
    
    // Set mobile viewport
    await page.setViewport({ width: 390, height: 844, isMobile: true });
    
    await page.goto('http://localhost:3000');
    
    // Wait for the snapshot to load
    await new Promise(r => setTimeout(r, 3000));
    
    const html = await page.evaluate(() => {
        const cc = document.querySelector('.chat-content');
        return cc ? cc.innerHTML : 'NOT FOUND';
    });
    
    console.log("--- CHAT CONTENT DOM ---");
    console.log(html);
    
    await page.close();
    process.exit(0);
})();
