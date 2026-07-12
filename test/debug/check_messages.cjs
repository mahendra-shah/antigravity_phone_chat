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
                        
                        // Find message bubbles
                        let messages = cascade.querySelectorAll('.group\\\\/message, [data-message-id], [class*="message"]');
                        if (messages.length === 0) {
                            messages = cascade.querySelectorAll('div > div > div > div > div'); // fallback guess
                        }
                        
                        let arr = [];
                        for(let i=0; i<Math.min(3, messages.length); i++) {
                            const el = messages[i];
                            const style = window.getComputedStyle(el);
                            arr.push({
                                tag: el.tagName,
                                class: el.className,
                                position: style.position,
                                top: style.top,
                                transform: style.transform,
                                display: style.display,
                                height: style.height
                            });
                        }
                        return arr;
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
