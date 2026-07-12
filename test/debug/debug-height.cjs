const puppeteer = require('puppeteer');
(async () => {
    const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844, isMobile: true });
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 3000));
    const result = await page.evaluate(() => {
        const chatContent = document.getElementById('chatContent');
        if (!chatContent) return { error: 'No #chatContent' };
        
        let out = [];
        let cur = chatContent.firstElementChild;
        while(cur) {
            const r = cur.getBoundingClientRect();
            out.push(`${cur.tagName}.${cur.className} -> ${r.width}x${r.height} | hidden? ${cur.style.visibility} | style: ${cur.getAttribute('style')}`);
            if (cur.firstElementChild && r.height > 0) {
                cur = cur.firstElementChild;
            } else {
                break;
            }
        }
        return out;
    });
    console.log(result.join('\n'));
    await browser.close();
})();
