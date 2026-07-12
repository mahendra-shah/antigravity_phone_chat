const fs = require('fs');
const html = fs.readFileSync('test-out.html', 'utf8');
const cheerio = require('cheerio');
const $ = cheerio.load(html);

$('*').each((i, el) => {
    const text = $(el).text();
    if (text.includes('Artifact') && text.includes('Plan') && text.includes('Code')) {
        console.log('FOUND CONTAINER:', el.tagName, $(el).attr('class'));
    }
});
