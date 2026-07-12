const fs = require('fs');
const cheerio = require('cheerio');
const html = fs.readFileSync('test-out.html', 'utf8');
const $ = cheerio.load(html);

// Print the first few layers of the DOM
let current = $('body').children().first();
for(let i=0; i<8; i++) {
    if(!current.length) break;
    console.log(`Level ${i}: ${current.get(0).tagName} class="${current.attr('class')}" style="${current.attr('style')}" textLength=${current.text().length}`);
    current = current.children().first();
}

// Find if any element contains the text "Artifact"
console.log("Text contains 'Artifact':", $('body').text().includes('Artifact'));
