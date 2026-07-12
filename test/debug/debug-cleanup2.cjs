const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:63473' });
    const pages = await browser.pages();
    const page = pages[0];

    const result = await page.evaluate(() => {
        let log = [];
        const clone = document.body.cloneNode(true);
        
        function hasChat(c) {
            return c.innerHTML.includes('flex-grow: 1');
        }
        
        // 5. Remove input box and scroll to bottom button from the snapshot
        clone.querySelectorAll('textarea, input, form, button').forEach(el => {
            if (el.placeholder?.includes('Message') || (el.className && el.className.includes('input'))) {
                const parent = el.closest('div.relative, div.fixed, div.absolute');
                if (parent) parent.remove();
            }
        });
        log.push('After input box closest: ' + hasChat(clone));

        // Remove desktop header
        clone.querySelectorAll('button, div, span, a').forEach(el => {
            try {
                if (el.children.length > 10) return; // Ignore huge wrappers
                
                const text = (el.textContent || '');
                
                // Remove desktop header
                if (text.includes('Nodes') || text.includes('KB')) {
                    let header = el;
                    let found = false;
                    for (let i = 0; i < 6; i++) {
                        if (!header || !header.parentElement || header.parentElement === clone) break;
                        const tag = header.tagName.toLowerCase();
                        const cls = (header.className || '').toString();
                        if (tag === 'header' || tag === 'nav' || cls.includes('header') || cls.includes('top')) {
                            found = true;
                            break;
                        }
                        header = header.parentElement;
                    }
                    if (found && header && header !== clone) header.remove();
                }
            } catch(e){}
        });
        log.push('After desktop header: ' + hasChat(clone));
        
        // Cleanup any <aside> or typical sidebar selectors just in case
        clone.querySelectorAll('aside, header, nav, [data-testid="right-panel"], [data-testid="sidebar-right"]').forEach(el => el.remove());
        log.push('After aside: ' + hasChat(clone));

        return log;
    });

    console.log(result.join('\n'));
    await browser.disconnect();
})();
