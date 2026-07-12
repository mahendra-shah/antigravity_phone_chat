const fs = require('fs');
const cheerio = require('cheerio');
const html = fs.readFileSync('test-out.html', 'utf8');
const $ = cheerio.load(html);

$('button').each((i, el) => {
    const text = $(el).text().trim();
    if (text) {
        console.log(`BUTTON TEXT: "${text}" | CLASSES: ${$(el).attr('class')}`);
    }
});
