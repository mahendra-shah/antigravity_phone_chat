const http = require('http');
const WebSocket = require('ws');

http.get('http://127.0.0.1:9000/json/list', (res) => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => {
        const list = JSON.parse(data);
        const target = list.find(t => t.type === 'page');
        if (!target) return console.log("No page target");
        const ws = new WebSocket(target.webSocketDebuggerUrl);
        ws.on('open', () => {
            ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: 'document.body.outerHTML' } }));
        });
        ws.on('message', (msg) => {
            const resp = JSON.parse(msg);
            if (resp.id === 1) {
                console.log(resp.result.result.value);
                ws.close();
            }
        });
    });
});
