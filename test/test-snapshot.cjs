const fs = require('fs');
async function test() {
    const res = await fetch('http://localhost:3000/snapshot');
    const data = await res.json();
    if(data && data.html) {
        fs.writeFileSync('test-out.html', data.html);
        console.log('Saved to test-out.html, length: ' + data.html.length);
    }
}
test();
