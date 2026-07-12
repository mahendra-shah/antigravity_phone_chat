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
                        const sidebar = document.querySelector('.flex-1.min-h-0.overflow-y-auto.flex.flex-col.gap-6.px-2.py-3');
                        if (!sidebar) return 'sidebar not found';
                        
                        let clickables = Array.from(sidebar.querySelectorAll('a, button, .cursor-pointer'));
                        clickables.forEach((el, index) => el.setAttribute('data-ag-sidebar-index', index));
                        
                        return clickables.map(el => ({ 
                            tag: el.tagName, 
                            text: el.innerText.substring(0,50).replace(/\\n/g, ' '), 
                            id: el.getAttribute('data-ag-sidebar-index') 
                        }));
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
