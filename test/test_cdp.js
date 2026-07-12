import fs from 'fs';
import WebSocket from 'ws';

async function cdpRequest(ws, id, method, params) {
    return new Promise((resolve) => {
        const listener = (msg) => {
            const data = JSON.parse(msg);
            if (data.id === id) {
                ws.removeListener('message', listener);
                resolve(data);
            }
        };
        ws.on('message', listener);
        ws.send(JSON.stringify({ id, method, params }));
    });
}

(async () => {
    try {
        const port = 9000;
        const res = await fetch(`http://127.0.0.1:${port}/json/list`);
        const pages = await res.json();
        const page = pages.find(p => p.url.includes('127.0.0.1'));
        
        const ws = new WebSocket(page.webSocketDebuggerUrl);
        await new Promise(r => ws.once('open', r));
        
        const code = `
            (() => {
                const sidebar = document.querySelector('[aria-label="Sidebar"]');
                const titleSpans = Array.from(sidebar.querySelectorAll('span.truncate'));
                return titleSpans.map(s => s.innerText);
            })()
        `;
        
        const r = await cdpRequest(ws, 1, 'Runtime.evaluate', { expression: code, returnByValue: true });
        console.log("Result:", JSON.stringify(r.result, null, 2));
        ws.close();
    } catch(e) { console.error(e); }
})();
