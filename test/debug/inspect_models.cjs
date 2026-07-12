const http = require('http');
const WebSocket = require('ws');

http.get('http://127.0.0.1:9000/json', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        const list = JSON.parse(data);
        const target = list.find(t => t.title && (t.title.includes('workbench') || t.title.includes('Antigravity')));
        if (!target) return console.log("Target not found");
        const ws = new WebSocket(target.webSocketDebuggerUrl);
        ws.on('open', () => {
            let id = 1;
            const send = (method, params = {}) => {
                const messageId = id++;
                return new Promise((resolve) => {
                    const listener = (msg) => {
                        const parsed = JSON.parse(msg);
                        if (parsed.id === messageId) {
                            ws.removeListener('message', listener);
                            resolve(parsed);
                        }
                    };
                    ws.on('message', listener);
                    ws.send(JSON.stringify({ id: messageId, method, params }));
                });
            };

            const run = async () => {
                const js = `(async () => {
                    const btn = document.querySelector('button[aria-label^="Select model"]');
                    if (!btn) return "Button not found";
                    
                    // Click it to open dropdown
                    btn.click();
                    
                    // Wait a bit
                    await new Promise(r => setTimeout(r, 500));
                    
                    // Now find the items in the dropdown
                    // usually they are in a role="menu" or role="listbox" or data-radix-popper-content-wrapper
                    const items = Array.from(document.querySelectorAll('[role="menuitem"], [role="option"]'));
                    const models = items.map(el => el.innerText || el.textContent);
                    
                    // Close the dropdown
                    btn.click(); // or press escape
                    
                    return JSON.stringify(models, null, 2);
                })();`;
                const res = await send('Runtime.evaluate', { expression: js, awaitPromise: true, returnByValue: true });
                if (res.result && res.result.result) {
                    console.log(res.result.result.value);
                } else {
                    console.log("Error evaluating:", JSON.stringify(res));
                }
                process.exit(0);
            };
            run();
        });
    });
});
