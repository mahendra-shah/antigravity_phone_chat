const fs = require('fs');
const html = fs.readFileSync('ag_full.html', 'utf8');
const match = html.match(/<div[^>]+data-testid="conversation-view"/);
if (match) {
    const idx = match.index;
    const snippet = html.substring(Math.max(0, idx - 500), idx + 100);
    console.log(snippet);
}
