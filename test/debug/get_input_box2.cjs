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
                        const all = document.querySelectorAll('*');
                        let placeholder = null;
                        for(let el of all) {
                            if (el.children.length === 0 && el.textContent.includes('Ask anything, @ to mention')) {
                                placeholder = el;
                                break;
                            }
                        }
                        if (!placeholder) return { error: 'Not found' };
                        
                        // Go up 5 levels and get outerHTML
                        let current = placeholder;
                        for(let i=0; i<4; i++) {
                            if (current.parentElement) current = current.parentElement;
                        }
                        return { html: current.outerHTML };
                    })()`,
                    returnByValue: true
                });
            }).then(res => {
                console.log(res.result.value.html);
                ws.close();
            });
        });
    });
});
