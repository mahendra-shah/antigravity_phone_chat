const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:63473' });
    const pages = await browser.pages();
    const page = pages[0];

    const result = await page.evaluate(() => {
        let out = [];
        const clone = document.body.cloneNode(true);
        
        function getInfo(selector) {
            const els = clone.querySelectorAll(selector);
            if(els.length === 0) return '0 elements';
            return els.length + ' elements. HTML lengths: ' + Array.from(els).map(e => e.outerHTML.length).join(', ');
        }
        
        out.push('Sidebar: ' + getInfo('[aria-label="Sidebar"]'));
        out.push('absolute.bottom-0: ' + getInfo('.absolute.bottom-0'));
        out.push('Left Sidebar: ' + getInfo('[aria-label="Left Sidebar"]'));
        out.push('Auxiliary Pane: ' + getInfo('[aria-label="Auxiliary Pane"]'));
        
        return out;
    });

    console.log(result.join('\n'));
    await browser.disconnect();
})();
