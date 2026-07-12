const fs = require('fs');
const cheerio = require('cheerio');
const html = fs.readFileSync('test-out.html', 'utf8');
const $ = cheerio.load(html);

const matches = [];
$('*').each((i, el) => {
    const text = $(el).text();
    if (text.includes('Artifact') && text.includes('Plan') && text.includes('Code')) {
        matches.push(el);
    }
});

const leaf = matches[matches.length - 1];
console.log($.html(leaf).substring(0, 500) + '\n...\n' + $.html(leaf).substring($.html(leaf).length - 500));
