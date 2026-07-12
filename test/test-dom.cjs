const fs = require('fs');
const cheerio = require('cheerio');
const html = fs.readFileSync('test-out.html', 'utf8');
const $ = cheerio.load(html);

const chatInput = $('textarea, [contenteditable="true"], [contenteditable="plaintext-only"]').first();
if (chatInput.length) {
    let current = chatInput;
    for(let i=0; i<10; i++) {
        const parent = current.parent();
        if (!parent.length) break;
        
        console.log(`\nLEVEL ${i} PARENT: tag=${parent.prop('tagName')} class="${parent.attr('class')}"`);
        const siblings = parent.children();
        console.log(`  Children count: ${siblings.length}`);
        siblings.each((idx, el) => {
            if (el === current.get(0)) {
                console.log(`    [${idx}] (THIS ELEMENT)`);
            } else {
                console.log(`    [${idx}] tag=${el.tagName} class="${$(el).attr('class')}"`);
            }
        });
        current = parent;
    }
}
