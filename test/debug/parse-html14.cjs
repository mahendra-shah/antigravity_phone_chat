const fs = require('fs');
const cheerio = require('cheerio');
const html = fs.readFileSync('test-out.html', 'utf8');
const $ = cheerio.load(html);

const messages = $('.whitespace-pre-wrap');
console.log('Found messages wrapper elements:', messages.length);
if (messages.length) {
    let p = messages.first();
    for (let i = 0; i < 5; i++) {
        p = p.parent();
    }
    console.log('Message parent 5 levels up:', p.get(0).tagName, p.attr('class'));
}
