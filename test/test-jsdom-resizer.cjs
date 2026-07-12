const { JSDOM } = require('jsdom');
const fs = require('fs');

const rawHtml = fs.readFileSync('test-out.html', 'utf-8');
const { window } = new JSDOM(rawHtml);
const document = window.document;
const clone = document.body;

const resizers = clone.querySelectorAll('.bg-border.flex-shrink-0.relative.z-30');
console.log("Found resizers:", resizers.length);

resizers.forEach((resizer, i) => {
    const prev = resizer.previousElementSibling;
    const next = resizer.nextElementSibling;
    console.log(`Resizer ${i}:`);
    if (prev) {
        console.log("  Prev classes:", prev.className);
        console.log("  Prev style:", prev.getAttribute('style') || '');
    } else {
        console.log("  Prev is null");
    }
    if (next) {
        console.log("  Next classes:", next.className);
        console.log("  Next style:", next.getAttribute('style') || '');
    } else {
        console.log("  Next is null");
    }
    
    if (prev && next) {
        const prevStyle = prev.getAttribute('style') || '';
        const nextStyle = next.getAttribute('style') || '';
        
        if (!prevStyle.includes('flex-grow: 1')) {
            console.log("  => Removing prev and resizer");
            prev.remove();
            resizer.remove();
        } else if (!nextStyle.includes('flex-grow: 1')) {
            console.log("  => Removing next and resizer");
            next.remove();
            resizer.remove();
        }
    }
});

console.log("Done. Checking if resizers remain:", clone.querySelectorAll('.bg-border.flex-shrink-0.relative.z-30').length);
