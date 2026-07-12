const WebSocket = require('ws');
const http = require('http');

http.get('http://127.0.0.1:9000/json', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        const list = JSON.parse(data);
        const target = list[0];
        const ws = new WebSocket(target.webSocketDebuggerUrl);
        ws.on('open', () => {
            let id = 1;
            const call = (method, params) => new Promise(resolve => {
                const callId = id++;
                ws.on('message', function listener(msg) {
                    const parsed = JSON.parse(msg);
                    if (parsed.id === callId) {
                        ws.removeListener('message', listener);
                        resolve(parsed.result);
                    }
                });
                ws.send(JSON.stringify({ id: callId, method, params }));
            });

            call('Runtime.enable', {}).then(() => {
                return call('Runtime.evaluate', {
                    expression: `(function() {
                        const inputs = document.querySelectorAll('[contenteditable="true"], input, textarea, form');
                        const ids = Array.from(inputs).map(el => el.id || el.className).join(' | ');
                        
                        const actionAreas = Array.from(document.querySelectorAll('*')).filter(el => {
                            if(el.children.length > 0) return false;
                            const text = el.textContent.trim().toLowerCase();
                            return text.includes('task running') || text.includes('ask anything');
                        }).map(el => el.textContent.trim());
                        
                        return { inputs: ids, actionAreas };
                    })()`,
                    returnByValue: true
                });
            }).then(res => {
                console.log(JSON.stringify(res.result.value, null, 2));
                ws.close();
            });
        });
    });
});
