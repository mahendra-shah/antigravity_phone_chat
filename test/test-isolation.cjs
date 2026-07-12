const fs = require('fs');
const cheerio = require('cheerio');
const html = fs.readFileSync('current-snapshot.html', 'utf8');
const $ = cheerio.load(html);

// Find the chat input
const chatInput = $('textarea, [contenteditable="true"], [contenteditable="plaintext-only"]').first();
if (chatInput.length) {
    console.log("Chat input found!");
    // Find its top-level flex sibling containers
    let current = chatInput;
    let mainContainer = null;
    while(current.length && current.prop('tagName') !== 'BODY') {
        const parent = current.parent();
        if (parent.hasClass('flex') && parent.children().length > 1) {
            console.log(`Found flex parent with ${parent.children().length} children. Current tag: ${current.prop('tagName')}, class: ${current.attr('class')}`);
            // Check if siblings are sidebars
            parent.children().each((i, el) => {
                if (el !== current.get(0)) {
                    console.log(`  Sibling ${i}: tag=${el.tagName} class=${$(el).attr('class')} textLen=${$(el).text().length}`);
                }
            });
        }
        current = parent;
    }
}
