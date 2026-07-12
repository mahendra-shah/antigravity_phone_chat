const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:63473' });
    const pages = await browser.pages();
    const page = pages[0];

    const result = await page.evaluate(() => {
        let log = [];
        const clone = document.body.cloneNode(true);
        function len(c) { return c.innerHTML.length; }
        
        log.push('Initial: ' + len(clone));
        
        // 1. interactionSelectors
        const interactionSelectors = [
            'textarea', '[contenteditable="true"]', '[data-lexical-editor]', 'form',
            '.mx-8.mb-8', '.mx-4.mb-4', '.fixed.bottom-0', '.absolute.bottom-0',
            '#antigravity\\.agentSidePanelInputBox', '.flex-shrink-0.flex.flex-col.items-center.gap-2',
            '[aria-label="Auxiliary Pane"]', '[aria-label="Left Sidebar"]', '[aria-label="Sidebar"]'
        ];
        
        interactionSelectors.forEach(selector => {
            let before = len(clone);
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
            if (len(clone) < before) {
                log.push(`Selector ${selector} removed ${before - len(clone)} chars`);
            }
        });
        
        // 2. data-ag-rem
        let before = len(clone);
        clone.querySelectorAll('[data-ag-rem]').forEach(el => el.remove());
        log.push(`ag-rem removed ${before - len(clone)} chars`);
        
        // 3. resizers
        before = len(clone);
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
        log.push(`resizers removed ${before - len(clone)} chars`);

        // Remove desktop header
        before = len(clone);
        clone.querySelectorAll('button, div, span, a').forEach(el => {
            try {
                if (el.children.length > 10) return; // Ignore huge wrappers
                const text = (el.textContent || '');
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
        log.push(`desktop header removed ${before - len(clone)} chars`);
        
        // Cleanup typical sidebars
        before = len(clone);
        clone.querySelectorAll('aside, header, nav, [data-testid="right-panel"], [data-testid="sidebar-right"]').forEach(el => el.remove());
        log.push(`typical sidebars removed ${before - len(clone)} chars`);

        log.push('Final: ' + len(clone));
        return log;
    });

    console.log(result.join('\n'));
    await browser.disconnect();
})();
