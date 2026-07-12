const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844, isMobile: true });
    
    const html = `
    <!DOCTYPE html>
    <html class="dark">
    <head>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
            body, html { height: 100%; margin: 0; display: flex; flex-direction: column; background: #0f172a; color: white; }
            .app-header { height: 56px; background: #1e293b; }
            .fixed-bottom-input { height: 80px; background: #1e293b; }
            
            .chat-container {
                flex: 1;
                display: flex;
                flex-direction: column;
                overflow-y: auto;
                position: relative;
            }
            .chat-content {
                flex: 1;
                display: flex;
                flex-direction: column;
            }
            .chat-content > * {
                display: flex;
                flex-direction: column;
                flex: 1;
            }
            /* The extracted cssVars */
            :root {
                --sidebar-width: 256px;
                --aux-pane-width: 0px;
                --max-conversation-width: 48rem;
                --background: 224 71.4% 4.1%;
                --foreground: 210 20% 98%;
            }
        </style>
    </head>
    <body>
        <div class="app-header">Header</div>
        <div class="chat-container">
            <div class="chat-content">
                <div id="conversation" class="w-full h-full" style="height: 100%; width: 100%; display: flex; flex-direction: column;">
                    <div class="relative w-screen h-screen overflow-hidden">
                        <div class="h-full w-full">
                            <div class="h-full w-full dark">
                                <div class="flex flex-col h-full min-h-0">
                                    <div class="w-full h-full flex items-center relative">
                                        <div class="h-screen w-screen flex flex-col bg-slate-800 text-white">
                                            <div class="flex-1 flex min-h-0 relative" style="background: red;">
                                                <div style="background: blue; flex-grow: 1;">Hello from conversation view</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="fixed-bottom-input">Bottom</div>
    </body>
    </html>
    `;
    
    await page.setContent(html);
    await page.screenshot({ path: 'render-test.png' });
    await browser.close();
})();
