const fs = require('fs');
const html = fs.readFileSync('ag_full.html', 'utf8');
const match = html.match(/<[^>]+aria-label="Message input"[^>]*>/);
if (match) {
    const idx = match.index;
    const snippet = html.substring(Math.max(0, idx - 1000), idx + 1000);
    console.log(snippet);
} else {
    console.log("Not found");
}
