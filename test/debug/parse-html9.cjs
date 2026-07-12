const fs = require('fs');
const cheerio = require('cheerio');
const html = fs.readFileSync('test-out.html', 'utf8');
const $ = cheerio.load(html);

$('*').each((i, el) => {
    if ($(el).children().length === 0) {
        const text = $(el).text().trim();
        if (text === 'Artifact') {
            console.log('FOUND EXACT "Artifact" in:', el.tagName, $(el).attr('class'));
        }
        if (text === 'Plan') {
            console.log('FOUND EXACT "Plan" in:', el.tagName, $(el).attr('class'));
        }
        if (text === 'Code') {
            console.log('FOUND EXACT "Code" in:', el.tagName, $(el).attr('class'));
        }
    }
});
