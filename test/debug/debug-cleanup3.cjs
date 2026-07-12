const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:63473' });
    const pages = await browser.pages();
    const page = pages[0];

    const result = await page.evaluate(() => {
        let log = [];
        const clone = document.body.cloneNode(true);
        
        function chatLength(c) {
            return c.innerHTML.length;
        }
        
        log.push('Initial length: ' + chatLength(clone));
        
        // 5. Remove input box and scroll to bottom button from the snapshot
        clone.querySelectorAll('textarea, input, form, button').forEach(el => {
            if (el.placeholder?.includes('Message') || (el.className && el.className.includes('input'))) {
                const parent = el.closest('div.relative, div.fixed, div.absolute');
                if (parent) parent.remove();
            }
        });
        log.push('After input box length: ' + chatLength(clone));
        
        return log;
    });

    console.log(result.join('\n'));
    await browser.disconnect();
})();
