const WebSocket = require('ws');
const http = require('http');

http.get('http://localhost:9000/json', (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        const pages = JSON.parse(data);
        const page = pages.find(p => p.type === 'page' && p.url && (p.url.includes('localhost') || p.url.startsWith('https://127.0.0.1')));
        
        const ws = new WebSocket(page.webSocketDebuggerUrl);
        let msgId = 1;

        ws.on('open', () => {
            ws.send(JSON.stringify({
                id: msgId++,
                method: 'Runtime.evaluate',
                params: {
                    expression: `(() => {
                        const cascade = document.querySelector('[data-testid="conversation-view"]');
                        if (!cascade) return 'no cascade';
                        
                        // Dump the first 3 levels of children
                        function getStruct(el, depth) {
                            if (depth > 3) return el.tagName;
                            let children = [];
                            for (let i=0; i<el.children.length; i++) {
                                children.push(getStruct(el.children[i], depth + 1));
                            }
                            return { tag: el.tagName, id: el.id, class: el.className, testid: el.getAttribute('data-testid'), children };
                        }
                        return JSON.stringify(getStruct(cascade, 0));
                    })()`,
                    returnByValue: true
                }
            }));
        });

        ws.on('message', (msg) => {
            const res = JSON.parse(msg);
            if (res.result && res.result.result) {
                console.log(res.result.result.value);
                process.exit(0);
            }
        });
    });
});
