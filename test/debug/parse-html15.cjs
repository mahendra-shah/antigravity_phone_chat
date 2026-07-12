const fs = require('fs');
const cheerio = require('cheerio');
const html = fs.readFileSync('test-out.html', 'utf8');
const $ = cheerio.load(html);

const ta = $('textarea, [contenteditable="true"], [contenteditable="plaintext-only"], [contenteditable]');
console.log('Found textarea/contenteditable:', ta.length);
if (ta.length) {
    console.log('Tag:', ta.get(0).tagName);
    console.log('Attrs:', ta.get(0).attribs);
}
