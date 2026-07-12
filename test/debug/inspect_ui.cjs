const http = require('http');
const WebSocket = require('ws');

http.get('http://127.0.0.1:9000/json', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        const list = JSON.parse(data);
        const target = list.find(t => t.title && (t.title.includes('workbench') || t.title.includes('Antigravity')));
        if (!target) return console.log("Target not found");
        const ws = new WebSocket(target.webSocketDebuggerUrl);
        ws.on('open', () => {
            let id = 1;
            const send = (method, params = {}) => {
                const messageId = id++;
                return new Promise((resolve) => {
                    const listener = (msg) => {
                        const parsed = JSON.parse(msg);
                        if (parsed.id === messageId) {
                            ws.removeListener('message', listener);
                            resolve(parsed);
                        }
                    };
                    ws.on('message', listener);
                    ws.send(JSON.stringify({ id: messageId, method, params }));
                });
            };

            const run = async () => {
                const js = `(async () => { return document.documentElement.innerHTML; })();`;
                const res = await send('Runtime.evaluate', { expression: js, awaitPromise: true, returnByValue: true });
                if (res.result && res.result.result) {
                    console.log(res.result.result.value);
                } else {
                    console.log("Error evaluating:", JSON.stringify(res));
                }
                process.exit(0);
            };
            run();
        });
    });
});
