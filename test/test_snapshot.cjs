const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');

http.get('http://localhost:9000/json', (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        const pages = JSON.parse(data);
        const page = pages.find(p => p.type === 'page' && p.url && (p.url.includes('localhost') || p.url.startsWith('https://127.0.0.1')));
        if (!page) {
            console.log('No page found');
            return;
        }

        const ws = new WebSocket(page.webSocketDebuggerUrl);
        let msgId = 1;

        // I'll grab the exact CAPTURE_SCRIPT from server.js
        const serverCode = fs.readFileSync('server.js', 'utf8');
        const scriptMatch = serverCode.match(/const CAPTURE_SCRIPT = `([\s\S]*?)`;/);
        if (!scriptMatch) {
            console.log("Could not find script");
            process.exit(1);
        }
        const script = scriptMatch[1];

        ws.on('open', () => {
            ws.send(JSON.stringify({
                id: msgId++,
                method: 'Runtime.evaluate',
                params: {
                    expression: script,
                    returnByValue: true,
                    awaitPromise: true
                }
            }));
        });

        ws.on('message', (msg) => {
            const res = JSON.parse(msg);
            if (res.result && res.result.result) {
                const val = res.result.result.value;
                if (val && val.error) {
                    console.log("SNAPSHOT ERROR:", val.error, val.debug);
                } else if (val && val.html) {
                    console.log("SNAPSHOT SUCCESS! HTML length:", val.html.length);
                } else {
                    console.log("UNKNOWN RESULT:", val);
                }
                process.exit(0);
            } else {
                console.log("OTHER MSG:", msg.substring(0, 500));
            }
        });
    });
});
