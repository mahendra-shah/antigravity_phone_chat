const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');

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
                        
                        const clone = cascade.cloneNode(true);
                        
                        const interactionSelectors = [
                            '.relative.flex.flex-col.gap-8',
                            '.flex.grow.flex-col.justify-start.gap-8',
                            'div[class*="interaction-area"]',
                            '.p-1.bg-gray-500\\\\/10',
                            '.outline-solid.justify-between',
                            '[contenteditable="true"]',
                            '[data-lexical-editor]',
                            'form',
                            '.mx-8.mb-8',
                            '.mx-4.mb-4',
                            '.fixed.bottom-0',
                            '.absolute.bottom-0',
                            '#antigravity\\\\.agentSidePanelInputBox',
                            '.flex-shrink-0.flex.flex-col.items-center.gap-2'
                        ];

                        interactionSelectors.forEach(selector => {
                            try {
                                clone.querySelectorAll(selector).forEach(el => {
                                    try {
                                    const text = (el.innerText || '').toLowerCase();
                                    const isActionArea = text.includes('allow') || text.includes('deny') || 
                                                       text.includes('review') || text.includes('run') ||
                                                       text.includes('confirm');
                                    
                                    const isEditor = el.getAttribute('contenteditable') === 'true' || 
                                                   el.hasAttribute('data-lexical-editor') ||
                                                   text.includes('ask anything') ||
                                                   text.includes('to mention');
                                    if (!isEditor && isActionArea && selector !== '[contenteditable="true"]') {
                                        return; 
                                    }

                                    let targetToRemove = el;
                                    if (isEditor || selector.includes('bottom-0')) {
                                         let parent = el.parentElement;
                                         for (let i = 0; i < 4; i++) {
                                             if (!parent || parent === clone) break;
                                             const pCls = (parent.className || '').toString();
                                             if (pCls.includes('mx-') || pCls.includes('mb-') || pCls.includes('bg-')) {
                                                 targetToRemove = parent;
                                             }
                                             parent = parent.parentElement;
                                         }
                                    }
                                    
                                    if (targetToRemove && targetToRemove !== clone) {
                                        targetToRemove.remove();
                                    } else {
                                        el.remove();
                                    }
                                    } catch(e) {}
                                });
                            } catch(e) {}
                        });

                        return { html1: clone.innerHTML.substring(0, 500) };
                    })()`,
                    returnByValue: true
                });
            }).then(res => {
                console.log("After step 1:");
                console.log(res.result.value);
                ws.close();
            });
        });
    });
});
