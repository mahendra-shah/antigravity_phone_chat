const fs = require('fs');
const cheerio = require('cheerio');
const html = fs.readFileSync('test-out.html', 'utf8');
const $ = cheerio.load(html);

$('.bg-border.flex-shrink-0.relative.z-30').each((i, el) => {
    const prev = $(el).prev();
    const next = $(el).next();
    
    console.log(`\nRESIZER ${i}`);
    if (prev.length) console.log(`PREV attrs:`, prev.attr());
    if (next.length) console.log(`NEXT attrs:`, next.attr());
    
    // Look deeper into PREV to find unique chat classes
    console.log(`PREV has 'prose':`, prev.find('.prose').length);
    console.log(`NEXT has 'prose':`, next.find('.prose').length);
});
