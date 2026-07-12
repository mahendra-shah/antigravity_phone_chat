const fs = require('fs');
const cheerio = require('cheerio');
const html = fs.readFileSync('test-out.html', 'utf8');
const $ = cheerio.load(html);

// Find elements containing EXACTLY "Artifact Code Plan" as tabs
// Let's just search for buttons with text "Artifact"
$('button').each((i, el) => {
    if ($(el).text().trim() === 'Artifact') {
        console.log('FOUND BUTTON:', $.html(el));
        console.log('PARENT CHAIN:');
        let p = $(el).parent();
        for(let j=0; j<5; j++) {
            if(p.length) {
                console.log('  ->', p.get(0).tagName, p.attr('class') || '', p.attr('data-testid') || '');
                p = p.parent();
            }
        }
    }
});
