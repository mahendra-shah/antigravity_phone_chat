const fs = require('fs');
const html = fs.readFileSync('test-out.html', 'utf8');

// Use regex to find the context of "Artifacts"
const match = html.match(/.{0,200}Artifacts.{0,200}/g);
if (match) {
    console.log(match.join('\n\n---\n\n'));
}
