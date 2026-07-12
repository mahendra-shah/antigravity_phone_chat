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
                        
                        try {
                            clone.querySelectorAll('[id="antigravity.agentSidePanelInputBox"]').forEach(el => {
                                let target = el;
                                for(let i=0; i<6; i++) {
                                    if (target.parentElement && target.parentElement !== clone && !target.parentElement.getAttribute('data-testid')) {
                                        target = target.parentElement;
                                    }
                                }
                                if (target && target !== clone) {
                                    target.remove();
                                }
                            });
                        } catch(e) {}
                        
                        let matches = Array.from(clone.querySelectorAll('*')).filter(el => {
                            if(el.children.length > 0) return false;
                            return (el.innerText || el.textContent || '').includes('1 task running');
                        });
                        
                        return matches.map(el => {
                            let p = el.parentElement;
                            let chain = [];
                            for(let i=0; i<5; i++) {
                                if(!p) break;
                                chain.push(p.tagName + (p.id ? '#' + p.id : '') + (p.className ? '.' + p.className.replace(/ /g, '.') : ''));
                                p = p.parentElement;
                            }
                            return chain;
                        });
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
