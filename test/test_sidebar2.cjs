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
                        const projectsHeader = Array.from(document.querySelectorAll('h2')).find(h => h.innerText === 'Projects');
                        if (!projectsHeader) return 'no projects header';
                        let container = projectsHeader;
                        while (container && container.tagName !== 'BODY') {
                            if (container.className && typeof container.className === 'string' && container.className.includes('overflow-y-auto')) {
                                return container.outerHTML.length;
                            }
                            container = container.parentElement;
                        }
                        return 'no overflow container found';
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
