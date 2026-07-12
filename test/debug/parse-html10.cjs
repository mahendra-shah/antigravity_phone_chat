const fs = require('fs');
const cheerio = require('cheerio');
const html = fs.readFileSync('test-out.html', 'utf8');
const $ = cheerio.load(html);

// Find the main chat container by looking for the message input area
// Or looking for the chat messages wrapper.
let mainFlex = null;
$('*').each((i, el) => {
    const cls = $(el).attr('class') || '';
    // The main desktop app layout is usually a flex row.
    // Let's find an element with w-full h-full flex
    if (cls.includes('w-full') && cls.includes('h-full') && cls.includes('flex') && !cls.includes('flex-col')) {
        const children = $(el).children();
        if (children.length >= 2 && children.length <= 4) {
            console.log('Found main layout container! Classes:', cls);
            children.each((j, child) => {
                console.log(`  Child ${j} classes:`, $(child).attr('class'), '| text length:', $(child).text().length);
            });
        }
    }
});
