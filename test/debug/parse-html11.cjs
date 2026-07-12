const fs = require('fs');
const cheerio = require('cheerio');
const file = process.argv[2] || 'test-out.html';
const html = fs.readFileSync(file, 'utf8');
const $ = cheerio.load(html);

let found = false;
$('.bg-border.flex-shrink-0.relative.z-30').each((i, el) => {
    found = true;
    console.log(`\nRESIZER ${i}: class=${$(el).attr('class')}`);
    const prev = $(el).prev();
    const next = $(el).next();
    
    console.log(`  PREV: tag=${prev.get(0)?.tagName}, style=${prev.attr('style')}, textLen=${prev.text().length}`);
    console.log(`  NEXT: tag=${next.get(0)?.tagName}, style=${next.attr('style')}, textLen=${next.text().length}`);
});
if (!found) {
    console.log("No resizers found in", file);
}
