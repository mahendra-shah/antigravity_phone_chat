const fs = require('fs');
const cheerio = require('cheerio');
const html = fs.readFileSync('test-out.html', 'utf8');
const $ = cheerio.load(html);

$('*').each((i, el) => {
    if ($(el).children().length === 0) {
        const text = $(el).text().trim();
        if (text === 'No artifact or code panel open on desktop') {
            console.log('FOUND:', $.html(el));
            let p = $(el).parent();
            for(let j=0; j<8; j++) {
                if(p.length) {
                    console.log('  ->', p.get(0).tagName, p.attr('class') || '', p.attr('data-testid') || '');
                    p = p.parent();
                }
            }
        }
    }
});
