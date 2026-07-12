const fs = require('fs');
const html = fs.readFileSync('test-out.html', 'utf8');

const index = html.indexOf('Artifacts</span><span class="text-[10px]');
if (index > -1) {
    console.log(html.substring(index - 500, index + 500));
}
