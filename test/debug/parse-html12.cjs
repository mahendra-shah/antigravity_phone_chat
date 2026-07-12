const fs = require('fs');
const cheerio = require('cheerio');
const html = fs.readFileSync('test-out.html', 'utf8');
const $ = cheerio.load(html);

$('.bg-border.flex-shrink-0.relative.z-30').each((i, el) => {
    const parent = $(el).parent();
    console.log(`\nRESIZER ${i} PARENT: tag=${parent.get(0)?.tagName}, class=${parent.attr('class')}, numChildren=${parent.children().length}`);
    parent.children().each((j, child) => {
        console.log(`  Child ${j}: tag=${$(child).get(0)?.tagName}, class=${$(child).attr('class')}, textLen=${$(child).text().length}`);
    });
});
