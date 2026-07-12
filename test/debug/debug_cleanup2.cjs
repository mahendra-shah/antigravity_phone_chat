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
                        const clone = cascade.cloneNode(true);
                        
                        const redundantElements = clone.querySelectorAll('[contenteditable="true"], [data-lexical-editor], [role="textbox"], form, .mx-8.mb-8, .mx-4.mb-4');
                        let count = 0;
                        redundantElements.forEach(el => {
                            try {
                                let branch = el;
                                while (branch.parentElement && branch.parentElement !== clone) {
                                    const p = branch.parentElement;
                                    const pCls = (p.className || '').toString().toLowerCase();
                                    if (pCls.includes('message') || pCls.includes('bubble') || pCls.includes('conversation')) break;
                                    branch = p;
                                }
                                if (branch && branch !== clone) {
                                    branch.remove();
                                    count++;
                                } else {
                                    el.remove();
                                    count++;
                                }
                            } catch(e) {}
                        });

                        return { htmlLength: clone.innerHTML.length, removed: count };
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
