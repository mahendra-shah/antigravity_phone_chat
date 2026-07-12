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
        
        log.push('Initial: ' + hasChat(clone));
        
        // 1. interactionSelectors
        const interactionSelectors = [
            'textarea', '[contenteditable="true"]', '[data-lexical-editor]', 'form',
            '.mx-8.mb-8', '.mx-4.mb-4', '.fixed.bottom-0', '.absolute.bottom-0',
            '#antigravity\\.agentSidePanelInputBox', '.flex-shrink-0.flex.flex-col.items-center.gap-2',
            '[aria-label="Auxiliary Pane"]', '[aria-label="Left Sidebar"]', '[aria-label="Sidebar"]'
        ];
        
        interactionSelectors.forEach(selector => {
            clone.querySelectorAll(selector).forEach(el => {
                let targetToRemove = el;
                if (selector === '[contenteditable="true"]' || selector.includes('bottom-0')) {
                     let parent = el.parentElement;
                     for (let i = 0; i < 4; i++) {
                         if (!parent || parent === clone) break;
                         const pCls = (parent.className || '').toString();
                         if (pCls.includes('mx-') || pCls.includes('mb-') || pCls.includes('bg-')) {
                             targetToRemove = parent;
                         }
                         parent = parent.parentElement;
                     }
                }
                if (targetToRemove && targetToRemove !== clone) {
                    targetToRemove.remove();
                } else {
                    el.remove();
                }
            });
        });
        log.push('After selectors: ' + hasChat(clone));

        // 2. data-ag-rem
        clone.querySelectorAll('[data-ag-rem]').forEach(el => el.remove());
        log.push('After ag-rem: ' + hasChat(clone));
        
        // 3. resizers
        clone.querySelectorAll('.bg-border.flex-shrink-0.relative.z-30').forEach(resizer => {
            const prev = resizer.previousElementSibling;
            const next = resizer.nextElementSibling;
            if (prev && next) {
                const prevStyle = (prev.getAttribute('style') || '').replace(/\s/g, '');
                const nextStyle = (next.getAttribute('style') || '').replace(/\s/g, '');
                if (!prevStyle.includes('flex-grow:1')) {
                    prev.remove();
                    resizer.remove();
                } else if (!nextStyle.includes('flex-grow:1')) {
                    next.remove();
                    resizer.remove();
                }
            }
        });
        log.push('After resizers: ' + hasChat(clone));
        
        // 4. Input box
        clone.querySelectorAll('textarea, input, form, button').forEach(el => {
            if (el.placeholder?.includes('Message') || (el.className && el.className.includes('input'))) {
                const parent = el.closest('div.relative, div.fixed, div.absolute');
                if (parent) parent.remove();
            }
        });
        log.push('After input box closest: ' + hasChat(clone));
        
        return log;
    });

    console.log(result.join('\n'));
    await browser.disconnect();
})();
