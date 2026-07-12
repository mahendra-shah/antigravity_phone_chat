const CDP = require('chrome-remote-interface');
async function test() {
    let client;
    try {
        client = await CDP({ port: 9222 });
        const { Runtime } = client;
        
        const expression = `
            (() => {
                const root = document.getElementById('root') || document.body;
                if (!root) return "No root";
                return root.outerHTML.length;
            })();
        `;
        const result = await Runtime.evaluate({ expression, awaitPromise: true, returnByValue: true });
        console.log('Result:', result.result.value);
    } catch (err) {
        console.error(err);
    } finally {
        if (client) await client.close();
    }
}
test();
