const fs = require('fs');
const cheerio = require('cheerio');
const html = fs.readFileSync('test-out.html', 'utf8');
const $ = cheerio.load(html);

console.log("data-testid matches:");
$('[data-testid]').each((i, el) => {
    const tid = $(el).attr('data-testid');
    if (tid.includes('right') || tid.includes('panel') || tid.includes('sidebar')) {
        console.log(tid);
    }
});

console.log("finding Artifact Code Plan tabs container:");
$('*').each((i, el) => {
    const text = $(el).text();
    if (text.includes('Artifact') && text.includes('Plan') && text.includes('Code')) {
        if ($(el).children().length > 0 && $(el).children().length < 5) {
             console.log("Possible tab container:", $(el).attr('class'), "id:", $(el).attr('id'));
        }
    }
});
