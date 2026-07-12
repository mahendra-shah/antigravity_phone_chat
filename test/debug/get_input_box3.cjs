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
                        const inputs = document.querySelectorAll('[contenteditable="true"]');
                        if (inputs.length === 0) return { error: 'No contenteditable found' };
                        let current = inputs[0];
                        for(let i=0; i<6; i++) {
                            if (current.parentElement) current = current.parentElement;
                        }
                        return { html: current.outerHTML };
                    })()`,
                    returnByValue: true
                });
            }).then(res => {
                console.log(res.result.value.html || res.result.value.error);
                ws.close();
            });
        });
    });
});
