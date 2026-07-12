import fs from 'fs';
import * as cheerio from 'cheerio';

const rawHtml = fs.readFileSync('test-out.html', 'utf-8');
const $ = cheerio.load(rawHtml);

$('.bg-border.flex-shrink-0.relative.z-30').each((i, el) => {
    const resizer = $(el);
    const prev = resizer.prev();
    const next = resizer.next();
    
    const prevStyle = prev.attr('style') || '';
    const nextStyle = next.attr('style') || '';
    
    console.log(`Resizer ${i}:`);
    console.log("  Prev style:", prevStyle.substring(0, 50));
    console.log("  Next style:", nextStyle.substring(0, 50));
    
    if (!prevStyle.includes('flex-grow: 1') && !prevStyle.includes('flex-grow:1')) {
        console.log("  => Would remove prev");
    } else if (!nextStyle.includes('flex-grow: 1') && !nextStyle.includes('flex-grow:1')) {
        console.log("  => Would remove next");
    }
});
