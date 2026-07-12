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
                        const cascade = document.getElementById('conversation') || document.getElementById('chat') || document.getElementById('cascade') || document.querySelector('[data-testid="conversation-view"]') || document.querySelector('.overflow-y-auto');
                        if (!cascade) return { error: 'No cascade found' };
                        
                        const msg = cascade.querySelector('div:has(> div > div > div > div > div > div:contains("the ux is bad"))') || cascade.lastElementChild;
                        const target = cascade.innerHTML.substring(cascade.innerHTML.indexOf('the ux is bad') - 200, cascade.innerHTML.indexOf('the ux is bad') + 200);
                        
                        return target;
                    })()`,
                    returnByValue: true
                });
            }).then(res => {
                console.log(res.result.value);
                ws.close();
            });
        });
    });
});
