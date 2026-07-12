const fs = require('fs');
const cheerio = require('cheerio');
const file = 'current-snapshot.html';
const html = fs.readFileSync(file, 'utf8');
const $ = cheerio.load(html);

// Find all elements that might be the desktop right sidebar
// Typically it has a specific width, or contains "Artifact", "Plan", "Code" tabs
const tabs = $('.flex.items-center.gap-4.border-b.px-4.py-2, .w-64, .w-80, [style*="width: 256px"], [style*="width: 400px"]');
console.log("Found suspicious sidebars:", tabs.length);

tabs.each((i, el) => {
    console.log(`Sidebar ${i}: class="${$(el).attr('class')}" style="${$(el).attr('style')}" text="${$(el).text().substring(0, 50)}"`);
});
