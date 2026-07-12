// ─────────────────────────────────────────────────────────────
//  Antigravity Phone Connect — app.js v5
// ─────────────────────────────────────────────────────────────

// ── Element References ──
const chatContainer    = document.getElementById('chatContainer');
const chatContent      = document.getElementById('chatContent');
const messageInput     = document.getElementById('messageInput');
const sendBtn          = document.getElementById('sendBtn');
const scrollToBottomBtn = document.getElementById('scrollToBottom');
const statusDot        = document.getElementById('statusDot');
const statusText       = document.getElementById('statusText');
const refreshBtn       = document.getElementById('refreshBtn');
const stopBtn          = document.getElementById('stopBtn');
const newChatBtn       = document.getElementById('newChatBtn');
const hamburgerBtn     = document.getElementById('hamburgerBtn');
const modeBtn          = document.getElementById('modeBtn');
const modelBtn         = document.getElementById('modelBtn');
const modalOverlay     = document.getElementById('modalOverlay');
const modalList        = document.getElementById('modalList');
const modalTitle       = document.getElementById('modalTitle');
const modeText         = document.getElementById('modeText');
const modelText        = document.getElementById('modelText');
const sidebarMenu      = document.getElementById('sidebarMenu');
const sidebarOverlay   = document.getElementById('sidebarOverlay');
const historyList      = document.getElementById('historyList');
const closeSidebarBtn  = document.getElementById('closeSidebarBtn');
// Panel Drawer (right)
const panelDrawer      = document.getElementById('panelDrawer');
const panelOverlay     = document.getElementById('panelOverlay');
const panelHamburgerBtn = document.getElementById('panelHamburgerBtn');
const closePanelDrawerBtn = document.getElementById('closePanelDrawerBtn');
const panelDrawerContent = document.getElementById('panelDrawerContent');
// Input
const attachBtn        = document.getElementById('attachBtn');
const fileInput        = document.getElementById('fileInput');
const attachedFiles    = document.getElementById('attachedFiles');
// Usage
const usageBarFill     = document.getElementById('usageBarFill');
const usageLabel       = document.getElementById('usageLabel');
const toast            = document.getElementById('toast');
const enableHttpsBtn   = document.getElementById('enableHttpsBtn');
const dismissSslBtn    = document.querySelector('.dismiss-btn');
const closeModalBtn    = document.getElementById('closeModalBtn');
const supportBtn       = document.getElementById('supportBtn');
const supportOverlay   = document.getElementById('supportOverlay');
const closeSupportBtn  = document.getElementById('closeSupportBtn');
const quickActionChips = document.querySelectorAll('.action-chip');
const sslBanner        = document.getElementById('sslBanner');

// ── Device detection ──
const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

// ── State ──
let autoRefreshEnabled  = true;
let userIsScrolling     = false;
let userScrollLockUntil = 0;
let lastScrollPosition  = 0;
let ws                  = null;
let idleTimer           = null;
let lastHash            = '';
let currentMode         = 'Fast';
let chatIsOpen          = true;
let panelOpen           = false;
let panelPollTimer      = null;
let lastPanelHash       = '';
let lastPanelHtml       = '';
let lastActiveTab       = '';
let pendingAttachments  = []; // {file, name, dataUrl, type}
let hasEverRenderedContent = false; // Guard: never blank if content was once shown
let lastGoodHTML        = ''; // Guard: keep last good HTML
let consecutiveFailures = 0; // Track failures before showing empty state
const USER_SCROLL_LOCK_DURATION = 3000;
let isUpdatingDOM = false;

// ── Toast Helper ──
let toastTimer = null;
function showToast(msg, type = '', duration = 2500) {
    if (!toast) return;
    toast.textContent = msg;
    toast.className = 'toast show' + (type ? ' ' + type : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        toast.classList.remove('show');
    }, duration);
}

// ── Auth ──
async function fetchWithAuth(url, options = {}) {
    if (!options.headers) options.headers = {};
    options.headers['ngrok-skip-browser-warning'] = 'true';
    try {
        const res = await fetch(url, options);
        if (res.status === 401) {
            window.location.href = '/login.html';
            return new Promise(() => {});
        }
        return res;
    } catch (e) { throw e; }
}

// ── SSL Banner ──
async function checkSslStatus() {
    if (window.location.protocol === 'https:') return;
    if (localStorage.getItem('sslBannerDismissed')) return;
    if (sslBanner) sslBanner.style.display = 'flex';
}
async function enableHttps() {
    const btn = enableHttpsBtn;
    btn.textContent = 'Generating...'; btn.disabled = true;
    try {
        const res  = await fetchWithAuth('/generate-ssl', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
            sslBanner.innerHTML = `<span>✅ ${data.message}</span><button id="sslReloadBtn">Reload</button>`;
            const r = document.getElementById('sslReloadBtn');
            if (r) r.addEventListener('click', () => location.reload());
        } else { btn.textContent = 'Failed'; btn.disabled = false; }
    } catch(e) { btn.textContent = 'Error'; btn.disabled = false; }
}
function dismissSslBanner() {
    if (sslBanner) sslBanner.style.display = 'none';
    localStorage.setItem('sslBannerDismissed', 'true');
}
checkSslStatus();

// ── Models / Modes ──
const MODELS = [
    { name: "Gemini 3.1 Pro (High)", limit: "2,000,000" },
    { name: "Gemini 3.1 Pro (Low)", limit: "1,000,000" },
    { name: "Gemini 3 Flash", limit: "1,000,000" },
    { name: "Claude Sonnet 4.6 (Thinking)", limit: "200,000" },
    { name: "Claude Opus 4.6 (Thinking)", limit: "200,000" },
    { name: "GPT-OSS 120B (Medium)", limit: "128,000" }
];

// ── Scroll Event Listener for Loading Older Messages ──
let lastScrollTop = 0;
let isFetchingOlder = false;
chatContainer.addEventListener('scroll', async () => {
    if (isUpdatingDOM) return;
    const isScrollingUp = chatContainer.scrollTop < lastScrollTop || chatContainer.scrollTop <= 5;
    if (chatContainer.scrollTop < 100 && isScrollingUp && !isFetchingOlder) {
        isFetchingOlder = true;
        try {
            await fetchWithAuth('/remote-scroll', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ direction: 'up', amount: 800 })
            });
            setTimeout(loadSnapshot, 500);
            setTimeout(loadSnapshot, 1500);
        } catch(e) {}
        setTimeout(() => isFetchingOlder = false, 2000); // debounce
    }
    lastScrollTop = chatContainer.scrollTop;
});

// ── App State (mode, model, usage) ──
async function fetchAppState() {
    try {
        const res  = await fetchWithAuth('/app-state');
        const data = await res.json();
        
        // Update send button to stop button if generating
        if (sendBtn) {
            if (data.isGenerating) {
                sendBtn.classList.add('generating');
                sendBtn.innerHTML = `
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                        <rect x="5" y="5" width="14" height="14" rx="2" />
                    </svg>`;
                sendBtn.style.color = '#ef4444'; // Red color for Stop
            } else {
                sendBtn.classList.remove('generating');
                sendBtn.innerHTML = `
                    <svg viewBox="0 0 24 24" width="16" height="16">
                        <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
                    </svg>`;
                sendBtn.style.color = ''; // Reset
            }
        }

        if (data.mode && data.mode !== 'Unknown') {
            modeText.textContent = data.mode;
            modeBtn.classList.toggle('active', data.mode === 'Planning');
            currentMode = data.mode;
        }
        if (data.model && data.model !== 'Unknown') {
            // Shorten long model names for the small pill
            let modelShort = data.model;
            if (modelShort.length > 18) modelShort = modelShort.split(' ').slice(0, 2).join(' ');
            modelText.textContent = modelShort;
            
            // Find model limit
            const modelObj = MODELS.find(m => m.name.includes(modelShort) || m.name === data.model);
            if (modelObj && modelObj.limit) {
                document.getElementById('contextLimitText').textContent = modelObj.limit + ' tokens';
            }
        }
        // Update usage bar
        if (data.usagePercent !== undefined && usageBarFill) {
            const pct = Math.min(Math.max(data.usagePercent, 0), 100);
            usageBarFill.style.width = pct + '%';
            usageBarFill.className = 'usage-bar-fill' + (pct > 90 ? ' crit' : pct > 70 ? ' warn' : '');
            if (usageLabel) usageLabel.textContent = Math.round(pct) + '%';
        }
    } catch(e) {}
}

// ── WebSocket ──
function connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${protocol}//${window.location.host}`);

    ws.onopen = () => { updateStatus(true); loadSnapshot(); };

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'error' && data.message === 'Unauthorized') {
            window.location.href = '/login.html'; return;
        }
        if (data.type === 'snapshot_update' && autoRefreshEnabled && !userIsScrolling) {
            loadSnapshot();
        } else if (data.type === 'snapshot_update' && userIsScrolling) {
            // User is scrolled up, increment badge
            const badge = document.getElementById('unreadBadge');
            if (badge) {
                let count = parseInt(badge.textContent) || 0;
                count++;
                badge.textContent = count;
                badge.classList.add('show');
            }
        }
    };

    ws.onclose = () => { updateStatus(false); setTimeout(connectWebSocket, 2000); };
}

function updateStatus(connected) {
    if (connected) {
        statusDot.className = 'status-dot connected';
        statusText.textContent = 'Live';
    } else {
        statusDot.className = 'status-dot disconnected';
        statusText.textContent = 'Reconnecting';
    }
}

// ── Snapshot Rendering ──
async function loadSnapshot() {
    try {
        const icon = refreshBtn.querySelector('svg');
        icon.classList.remove('spin-anim');
        void icon.offsetWidth;
        icon.classList.add('spin-anim');

        const response = await fetchWithAuth('/snapshot');
        if (!response.ok) {
            consecutiveFailures++;
            if (response.status === 503 && consecutiveFailures > 5) {
                // Only show empty state after 5 consecutive failures AND no prior content
                if (!hasEverRenderedContent) {
                    chatIsOpen = false;
                    showEmptyState();
                }
            }
            return;
        }
        consecutiveFailures = 0;
        chatIsOpen = true;

        const data = await response.json();

        // Stats
        if (data.stats) {
            const kbs   = Math.round((data.stats.htmlSize + data.stats.cssSize) / 1024);
            const nodes = data.stats.nodes;
            const el    = document.getElementById('statsText');
            if (el) el.textContent = `${nodes} Nodes · ${kbs}KB`;
        }



        // CSS Injection
        let styleTag = document.getElementById('cdp-styles');
        if (!styleTag) {
            styleTag = document.createElement('style');
            styleTag.id = 'cdp-styles';
            document.head.appendChild(styleTag);
        }

        const darkModeOverrides =
            '/* BASE SNAPSHOT CSS */\n' + data.css +
            '\n\n/* DARK MODE OVERRIDES */\n' +
            ':root {\n' +
            '  --bg-app: #0f172a; --background: 224 71.4% 4.1%; --foreground: 210 20% 98%; --card: 224 71.4% 4.1%;\n' +
            '  --text-main: #f8fafc;\n' +
            '  --text-muted: #94a3b8;\n' +
            '  --border-color: #334155;\n' +
            '  /* Antigravity CSS variable fallbacks */\n' +
            '  --background: #0f172a;\n' +
            '  --foreground: #e2e8f0;\n' +
            '  --card: #1e293b;\n' +
            '  --card-foreground: #e2e8f0;\n' +
            '  --card-border: #334155;\n' +
            '  --popover: #1e293b;\n' +
            '  --popover-foreground: #e2e8f0;\n' +
            '  --muted: #1e293b;\n' +
            '  --muted-foreground: #94a3b8;\n' +
            '  --accent: #334155;\n' +
            '  --accent-foreground: #e2e8f0;\n' +
            '  --border: #334155;\n' +
            '  --input: #334155;\n' +
            '  --content: #1e293b;\n' +
            '  --sidebar: #1e293b;\n' +
            '  --sidebar-foreground: #e2e8f0;\n' +
            '  --primary: #6366f1;\n' +
            '  --primary-foreground: #fff;\n' +
            '  --secondary: #1e293b;\n' +
            '  --secondary-foreground: #e2e8f0;\n' +
            '  --destructive: #ef4444;\n' +
            '  --ring: #6366f1;\n' +
            '  --radius: 0.5rem;\n' +
            '}\n' +

            // Force dark body for the injected page
            'body, html { background-color: #0f172a !important; color: #e2e8f0 !important; }\n' +

            // Force ALL white/light backgrounds to dark
            '[class*="bg-background"], [class*="bg-white"], [class*="bg-card"] { background-color: #0f172a !important; }\n' +
            '[style*="background-color: white"], [style*="background: white"], [style*="background-color: rgb(255, 255, 255)"] { background-color: #1e293b !important; }\n' +
            '[style*="background-color: rgb(248"], [style*="background-color: rgb(249"], [style*="background-color: rgb(250"], [style*="background-color: rgb(251"] { background-color: #1e293b !important; }\n' +

            // Core conversation container — keep its own layout but ensure it scrolls properly
            '#conversation, #chat, #cascade, [data-testid="conversation-view"] {\n' +
            '  background-color: transparent !important;\n' +
            '  color: var(--foreground, #e2e8f0) !important;\n' +
            '  font-family: "Inter", system-ui, sans-serif !important;\n' +
            '  width: 100% !important;\n' +
            '  overflow: visible !important;\n' +
            '  display: flex !important;\n' + // Force display flex to override `hidden md:flex`
            '}\n' +

            // Don't fight Tailwind's flex layout — just let overflow be visible so content renders
            '.chat-content > * {\n' +
            '  overflow: visible !important;\n' +
            '}\n' +

            // Text color inheritance
            '#conversation p, #chat p, #cascade p,' +
            '#conversation h1,#chat h1,#cascade h1,' +
            '#conversation h2,#chat h2,#cascade h2,' +
            '#conversation h3,#chat h3,#cascade h3,' +
            '#conversation span,#chat span,#cascade span,' +
            '#conversation div,#chat div,#cascade div,' +
            '#conversation li,#chat li,#cascade li { color: inherit !important; }\n' +

            // Force dark inline styles
            '[style*="color: rgb(0, 0, 0)"], [style*="color: black"],' +
            '[style*="color:#000"], [style*="color: #000"] { color: #e2e8f0 !important; }\n' +

            // Links
            '#conversation a, #chat a, #cascade a { color: #60a5fa !important; text-decoration: underline; }\n' +

            // Hide broken local file images
            'img[src^="/c:"], img[src^="/C:"], img[src*="AppData"] { display: none !important; }\n' +

            // Inline elements
            'img, svg { display: inline !important; vertical-align: middle !important; }\n' +
            'div:has(> img[src^="data:"]), div:has(> img[alt]), span:has(> img) { display: inline !important; vertical-align: middle !important; }\n' +
            '[class*="inline-flex"], [class*="inline-block"], [class*="items-center"]:has(img) { display: inline-flex !important; vertical-align: middle !important; }\n' +

            // Inline code
            ':not(pre) > code { padding: 1px 3px !important; border-radius: 3px !important; background-color: rgba(255,255,255,0.1) !important; font-size: 0.83em !important; white-space: normal !important; }\n' +

            // Code blocks
            'pre, code, .monaco-editor-background, [class*="terminal"] { background-color: #1e293b !important; color: #e2e8f0 !important; font-family: "JetBrains Mono", monospace !important; border-radius: 4px; border: 1px solid #334155; }\n' +
            'pre { position: relative !important; white-space: pre-wrap !important; word-break: break-word !important; padding: 8px 10px !important; margin: 4px 0 !important; display: block !important; width: 100% !important; }\n' +
            'pre.has-copy-btn { padding-right: 36px !important; }\n' +
            'pre.single-line-pre { display: inline-block !important; width: auto !important; max-width: 100% !important; padding: 1px 5px !important; margin: 0 !important; vertical-align: middle !important; font-size: 0.85em !important; }\n' +
            'pre.single-line-pre > code { display: inline !important; white-space: nowrap !important; }\n' +
            'pre:not(.single-line-pre) > code { display: block !important; width: 100% !important; overflow-x: auto !important; background: transparent !important; border: none !important; padding: 0 !important; margin: 0 !important; }\n' +

            // Blockquote
            'blockquote { border-left: 3px solid #3b82f6 !important; background: rgba(59,130,246,0.08) !important; color: #cbd5e1 !important; padding: 8px 12px !important; margin: 6px 0 !important; }\n' +

            // Tables
            'table { border-collapse: collapse !important; width: 100% !important; border: 1px solid #334155 !important; }\n' +
            'th, td { border: 1px solid #334155 !important; padding: 8px !important; color: #e2e8f0 !important; }\n' +

            // White backgrounds → transparent
            '[style*="background-color: rgb(255, 255, 255)"], [style*="background-color: white"], [style*="background: white"] { background-color: transparent !important; }\n' +

            // Hide injected scrollbars
            '::-webkit-scrollbar { width: 3px !important; }\n' +

            // HIDE Antigravity input/toolbar from snapshot — scoped to #chatContent only
            '#chatContent [contenteditable="true"], #chatContent [role="toolbar"], #chatContent [data-testid="chat-input"] { display: none !important; }\n' +
            '#chatContent nav, #chatContent [class*="sidebar"], #chatContent footer { display: none !important; }\n' +
            '#chatContent .absolute.bottom-0:has([contenteditable="true"]), #chatContent .absolute.bottom-0:has([role="textbox"]), #chatContent .absolute.bottom-0:has(form) { display: none !important; }\n' +
            '#chatContent .fixed.bottom-0:has([contenteditable="true"]), #chatContent .fixed.bottom-0:has([role="textbox"]), #chatContent .fixed.bottom-0:has(form) { display: none !important; }\n' +
            '#chatContent .sticky.bottom-0:has([contenteditable="true"]), #chatContent .sticky.bottom-0:has([role="textbox"]), #chatContent .sticky.bottom-0:has(form) { display: none !important; }\n' +

            // Copy button
            '.mobile-copy-btn { position: absolute !important; top: 4px !important; right: 4px !important; background: rgba(30,41,59,0.7) !important; color: #94a3b8 !important; border: 1px solid rgba(255,255,255,0.1) !important; width: 26px !important; height: 26px !important; padding: 0 !important; cursor: pointer !important; display: flex !important; align-items: center !important; justify-content: center !important; border-radius: 5px !important; z-index: 10 !important; }\n' +
            '.mobile-copy-btn:hover { background: rgba(59,130,246,0.2) !important; color: #60a5fa !important; }\n' +
            '.mobile-copy-btn svg { width: 14px !important; height: 14px !important; stroke: currentColor !important; stroke-width: 2 !important; fill: none !important; }\n';

        // Extract styles from snapshot (css vars, tailwind, etc)
        let extractedStyles = '';
        const styleMatch = data.html.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
        if (styleMatch && styleMatch[1]) {
            extractedStyles = styleMatch[1];
        }

        styleTag.textContent = extractedStyles + '\n' + darkModeOverrides;

        // Strip <style> and <script> tags from the snapshot HTML so they
        // don't appear as visible text or inject conflicting styles
        let cleanHtml = data.html
            .replace(/<style[\s\S]*?<\/style>/gi, '')
            .replace(/<script[\s\S]*?<\/script>/gi, '');

        // GUARD: If we get a very short/empty response but had good content before,
        // don't overwrite — this prevents the "flash blank" on reconnect
        const MIN_CONTENT_LENGTH = 500;
        if (cleanHtml.trim().length < MIN_CONTENT_LENGTH && hasEverRenderedContent) {
            console.warn('[SNAPSHOT] Short response, keeping existing content');
            return;
        }

        // Capture scroll state IMMEDIATELY before modifying DOM
        const scrollPos    = chatContainer.scrollTop;
        const scrollHeight = chatContainer.scrollHeight;
        const clientHeight = chatContainer.clientHeight;
        const isNearBottom = scrollHeight - scrollPos - clientHeight < 120;

        // Only update DOM if content actually changed (prevents flicker/refresh artifacts)
        if (chatContent.dataset.lastHTML === cleanHtml) {
            // Content unchanged – just maintain scroll
            if (isNearBottom) scrollToBottom('auto');
            return;
        }
        
        isUpdatingDOM = true;
        
        // Prevent layout height collapse during DOM updates to stop browser scroll-to-top jumps
        const currentHeight = chatContent.offsetHeight;
        if (currentHeight > 0) {
            chatContent.style.minHeight = currentHeight + 'px';
        }

        chatContent.dataset.lastHTML = cleanHtml;
        chatContent.innerHTML = cleanHtml;
        hasEverRenderedContent = true;
        lastGoodHTML = cleanHtml;

        // Add copy buttons
        addMobileCopyButtons();

        // Scroll restoration
        const isDesktopNearBottom = data.scrollInfo ? (data.scrollInfo.scrollHeight - data.scrollInfo.scrollTop - data.scrollInfo.clientHeight < 120) : false;

        if (isNearBottom || isDesktopNearBottom) {
            scrollToBottom('auto');
        } else if (isFetchingOlder) {
            const newScrollHeight = chatContainer.scrollHeight;
            if (newScrollHeight > scrollHeight) {
                // Keep view stable relative to the current message when history is prepended
                chatContainer.scrollTop = scrollPos + (newScrollHeight - scrollHeight);
            }
        } else {
            // Restore scroll position immediately to prevent layout height collapse from forcing scrollTop to 0
            chatContainer.scrollTop = scrollPos;
        }
        
        // Let layout settle, then clear height lock and release the scroll updates lock
        setTimeout(() => {
            chatContent.style.minHeight = '';
            isUpdatingDOM = false;
        }, 150);

    } catch (err) {
        consecutiveFailures++;
        console.error('[SNAPSHOT]', err);
        // On error, NEVER wipe existing content
    }
}

// ── Copy Buttons for Code Blocks ──
function addMobileCopyButtons() {
    const codeBlocks = chatContent.querySelectorAll('pre');
    codeBlocks.forEach((pre, index) => {
        if (pre.querySelector('.mobile-copy-btn')) return;
        const codeEl  = pre.querySelector('code') || pre;
        const textToCopy = (codeEl.textContent || codeEl.innerText).trim();
        const hasNewline = /\n/.test(textToCopy);
        if (!hasNewline) {
            pre.classList.remove('has-copy-btn');
            pre.classList.add('single-line-pre');
            return;
        }
        pre.classList.remove('single-line-pre');
        pre.classList.add('has-copy-btn');

        const btn = document.createElement('button');
        btn.className = 'mobile-copy-btn';
        btn.setAttribute('aria-label', 'Copy code');
        btn.innerHTML = `<svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;

        btn.addEventListener('click', async (e) => {
            e.preventDefault(); e.stopPropagation();
            const success = await copyToClipboard(textToCopy);
            btn.innerHTML = success
                ? `<svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`
                : `<svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
            setTimeout(() => {
                btn.innerHTML = `<svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
            }, 2000);
        });
        pre.appendChild(btn);
    });
}

// ── Clipboard ──
async function copyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
        try { await navigator.clipboard.writeText(text); return true; } catch(e) {}
    }
    try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.cssText = 'position:fixed;top:0;left:0;width:2em;height:2em;opacity:0;';
        document.body.appendChild(ta);
        if (navigator.userAgent.match(/ipad|iphone/i)) {
            const range = document.createRange();
            range.selectNodeContents(ta);
            const sel = window.getSelection();
            sel.removeAllRanges(); sel.addRange(range);
            ta.setSelectionRange(0, text.length);
        } else { ta.select(); }
        const ok = document.execCommand('copy');
        document.body.removeChild(ta);
        return ok;
    } catch(e) {}
    return false;
}

function scrollToBottom(behavior = 'auto') {
    chatContainer.scrollTo({ top: chatContainer.scrollHeight, behavior });
}

async function sendMessage() {
    if (sendBtn.classList.contains('generating')) {
        try {
            sendBtn.disabled = true;
            const res = await fetchWithAuth('/stop', { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                showToast('Generation stopped', 'success');
            }
            setTimeout(loadSnapshot, 500);
        } catch (e) {
            console.error('[STOP]', e);
        } finally {
            sendBtn.disabled = false;
        }
        return;
    }

    const message = messageInput.value.trim();
    if (!message && pendingAttachments.length === 0) return;

    const attachmentsToSend = [...pendingAttachments];
    
    messageInput.value = '';
    messageInput.style.height = 'auto';
    messageInput.blur();
    sendBtn.disabled = true;

    // Clear UI optimistically
    pendingAttachments = [];
    renderAttachments();

    try {
        if (!chatIsOpen) {
            const r = await fetchWithAuth('/new-chat', { method: 'POST' });
            const d = await r.json();
            if (d.success) { await new Promise(r => setTimeout(r, 800)); chatIsOpen = true; }
        }

        const res  = await fetchWithAuth('/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, attachments: attachmentsToSend })
        });
        const data = await res.json();

        if (data.success) {
            showToast('Message sent ✓', 'success');
        } else {
            showToast('Sent (may be delayed)', '');
        }

        setTimeout(loadSnapshot, 300);
        setTimeout(loadSnapshot, 800);
        setTimeout(checkChatStatus, 1000);

    } catch(e) {
        console.error('[SEND]', e);
        showToast('Network error — retrying...', 'error');
        // Restore attachments on failure
        pendingAttachments = attachmentsToSend;
        renderAttachments();
        messageInput.value = message;
        setTimeout(loadSnapshot, 500);
    } finally {
        sendBtn.disabled = false;
    }
}

// ── Event Listeners: Input & Send ──
sendBtn.addEventListener('click', sendMessage);

messageInput.addEventListener('keydown', (e) => {
    // If it's just Enter without shift, we now want it to just add a newline naturally (multiline support)
    // To send, the user clicks the send button.
    // However, if we want to allow sending on Desktop with Enter, and Shift+Enter for newline:
    if (!isMobile && e.key === 'Enter' && !e.shiftKey) { 
        e.preventDefault(); 
        sendMessage(); 
    }
    // On mobile, native Enter adds a newline automatically since it's a textarea.
});

messageInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 150) + 'px';
});

// Keyboard and viewport stabilization for mobile layout
const resetViewport = () => {
    window.scrollTo(0, 0);
    document.body.scrollTop = 0;
};

messageInput.addEventListener('focus', () => {
    setTimeout(() => {
        resetViewport();
        scrollToBottom('auto');
    }, 150);
});

messageInput.addEventListener('blur', () => {
    setTimeout(resetViewport, 150);
});

if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', () => {
        resetViewport();
        if (document.activeElement === messageInput) {
            setTimeout(() => {
                scrollToBottom('auto');
            }, 100);
        }
    });
    window.visualViewport.addEventListener('scroll', () => {
        if (window.visualViewport.offsetTop > 0) {
            resetViewport();
        }
    });
}

// ── Refresh ──
refreshBtn.addEventListener('click', () => { loadSnapshot(); fetchAppState(); });

// ── Stop ──
stopBtn.addEventListener('click', async () => {
    stopBtn.style.opacity = '0.5';
    try { await fetchWithAuth('/stop', { method: 'POST' }); } catch(e) {}
    setTimeout(() => stopBtn.style.opacity = '1', 500);
});

// ── Scroll Sync ──
let scrollSyncTimeout   = null;
let lastScrollSync      = 0;
let snapshotPending     = false;
const SCROLL_DEBOUNCE   = 150;

async function syncScrollToDesktop() {
    const pct = chatContainer.scrollTop / Math.max(1, chatContainer.scrollHeight - chatContainer.clientHeight);
    try {
        await fetchWithAuth('/remote-scroll', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ scrollPercent: pct })
        });
        if (!snapshotPending) {
            snapshotPending = true;
            setTimeout(() => { loadSnapshot(); snapshotPending = false; }, 300);
        }
    } catch(e) {}
}

chatContainer.addEventListener('scroll', () => {
    if (isUpdatingDOM) return;
    if (isFetchingOlder) return;
    userIsScrolling = true;
    userScrollLockUntil = Date.now() + USER_SCROLL_LOCK_DURATION;
    clearTimeout(idleTimer);

    const near = chatContainer.scrollHeight - chatContainer.scrollTop - chatContainer.clientHeight < 120;
    if (near) { scrollToBottomBtn.classList.remove('show'); userScrollLockUntil = 0; }
    else       { scrollToBottomBtn.classList.add('show'); }

    const now = Date.now();
    if (now - lastScrollSync > SCROLL_DEBOUNCE) {
        lastScrollSync = now;
        clearTimeout(scrollSyncTimeout);
        scrollSyncTimeout = setTimeout(syncScrollToDesktop, 100);
    }

    idleTimer = setTimeout(() => { userIsScrolling = false; autoRefreshEnabled = true; }, 5000);
});

scrollToBottomBtn.addEventListener('click', () => {
    userIsScrolling = false; userScrollLockUntil = 0;
    scrollToBottom();
    const badge = document.getElementById('unreadBadge');
    if (badge) {
        badge.textContent = '0';
        badge.classList.remove('show');
    }
});

// ── Quick Actions ──
function quickAction(text) {
    messageInput.value = text;
    messageInput.style.height = 'auto';
    messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + 'px';
    messageInput.focus();
}

quickActionChips.forEach(chip => {
    chip.addEventListener('click', () => {
        const action = chip.getAttribute('data-action') || chip.innerText.trim();
        if      (action.includes('Explain')) quickAction('Explain this code in detail.');
        else if (action.includes('Fix'))     quickAction('Please fix the bugs in this code.');
        else if (action.includes('Docs'))    quickAction('Please create documentation for this code.');
        else                                  quickAction(action);
    });
});

// ── New Chat ──
async function startNewChat() {
    newChatBtn.style.opacity = '0.5';
    newChatBtn.style.pointerEvents = 'none';
    try {
        const res  = await fetchWithAuth('/new-chat', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
            showToast('New chat started', 'success');
            setTimeout(loadSnapshot, 500);
            setTimeout(loadSnapshot, 1000);
            setTimeout(checkChatStatus, 1500);
        }
    } catch(e) { console.error('[NEW CHAT]', e); }
    setTimeout(() => { newChatBtn.style.opacity = '1'; newChatBtn.style.pointerEvents = 'auto'; }, 500);
}
newChatBtn.addEventListener('click', startNewChat);

// ── Left Sidebar (Chat History) ──
function renderChatHistory(chats, filterText = '') {
    const lowerFilter  = filterText.toLowerCase();
    const filtered     = filterText ? chats.filter(c =>
        c.title.toLowerCase().includes(lowerFilter) ||
        (c.project && c.project.toLowerCase().includes(lowerFilter))
    ) : chats;

    if (!filtered.length) {
        historyList.innerHTML = '<div style="padding:40px 20px;text-align:center;color:var(--text-muted);font-size:13px;">' +
            (filterText ? 'No matching conversations' : 'No past conversations found') + '</div>';
        return;
    }

    const grouped = {};
    for (const chat of filtered) {
        const proj = chat.project || 'Other';
        if (!grouped[proj]) grouped[proj] = [];
        grouped[proj].push(chat);
    }

    let html = '';
    for (const [project, projectChats] of Object.entries(grouped)) {
        html += `<div class="project-group"><div class="project-header">${project}</div>`;
        for (const chat of projectChats) {
            const title = chat.title.replace(/"/g, '&quot;').replace(/</g, '&lt;');
            html += `<div class="history-card" data-title="${title}">
                <div class="history-card-icon">
                    <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none" stroke-width="1.8">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                </div>
                <div class="history-card-content"><span class="history-card-title">${chat.title}</span></div>
                <div class="history-card-arrow">
                    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </div>
            </div>`;
        }
        html += '</div>';
    }
    historyList.innerHTML = html;
}

let cachedChats = [];
async function showChatHistory() {
    historyList.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted);font-size:13px;">Loading...</div>';
    sidebarMenu.classList.add('show');
    sidebarOverlay.classList.add('show');

    const searchInput = document.getElementById('historySearchInput');
    if (searchInput) { searchInput.value = ''; searchInput.oninput = null; }

    try {
        const res  = await fetchWithAuth('/chat-history');
        const data = await res.json();
        if (data.success || data.chats) {
            cachedChats = data.chats || [];
            renderChatHistory(cachedChats);
            if (searchInput) {
                searchInput.oninput = (e) => renderChatHistory(cachedChats, e.target.value);
            }
        } else {
            historyList.innerHTML = '<div style="padding:20px;text-align:center;color:var(--error);font-size:13px;">Error loading history</div>';
        }
    } catch(e) {
        historyList.innerHTML = '<div style="padding:20px;text-align:center;color:var(--error);font-size:13px;">Network error</div>';
    }
}

function hideChatHistory() {
    sidebarMenu.classList.remove('show');
    sidebarOverlay.classList.remove('show');
    try { fetchWithAuth('/close-history', { method: 'POST' }); } catch(e) {}
}

hamburgerBtn.addEventListener('click', showChatHistory);

// Delegation for history list
historyList.addEventListener('click', (e) => {
    const card = e.target.closest('.history-card');
    if (card) {
        const title = card.getAttribute('data-title');
        hideChatHistory();
        selectChat(title);
    }
});

// ── Select Chat ──
async function selectChat(title) {
    chatContent.innerHTML = '<div class="loading-state"><div class="loading-spinner"></div><p>Switching conversation...</p></div>';
    try {
        const res  = await fetchWithAuth('/select-chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title })
        });
        const data = await res.json();
        if (data.success) {
            showToast('Switched conversation', 'success');
            let attempts = 0;
            const poll = setInterval(async () => {
                await loadSnapshot();
                if (++attempts > 10) clearInterval(poll);
            }, 500);
        } else {
            showToast('Could not switch — try again', 'error');
            setTimeout(loadSnapshot, 500);
        }
    } catch(e) { setTimeout(loadSnapshot, 500); }
}

// ── Chat Status ──
async function checkChatStatus() {
    try {
        const res  = await fetchWithAuth('/chat-status');
        const data = await res.json();
        const newStatus = data.hasChat || data.editorFound;
        // Only show empty state if:
        // 1. Server explicitly says no chat AND
        // 2. We've never successfully shown content (first load)
        if (!newStatus && !hasEverRenderedContent) {
            chatIsOpen = false;
            showEmptyState();
        } else if (newStatus) {
            chatIsOpen = true;
        }
        // If hasEverRenderedContent=true and newStatus=false, we stay showing last content
    } catch(e) {}
}

// ── Empty State ──
function showEmptyState() {
    chatContent.innerHTML = `
        <div class="empty-state">
            <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                <line x1="9" y1="10" x2="15" y2="10"></line>
            </svg>
            <h2>No Chat Open</h2>
            <p>Start a new conversation or pick one from your history.</p>
            <button class="empty-state-btn" id="newChatFromEmptyBtn">Start New Conversation</button>
        </div>`;
}
chatContent.addEventListener('click', (e) => {
    if (e.target.closest('#newChatFromEmptyBtn')) startNewChat();
});

// ── Modals ──
function openModal(title, options, onSelect) {
    modalTitle.textContent = title;
    modalList.innerHTML    = '';
    options.forEach(opt => {
        const div = document.createElement('div');
        div.className   = 'modal-option';
        
        const isObject = typeof opt === 'object';
        const name = isObject ? opt.name : opt;
        
        div.innerHTML = isObject && opt.limit 
            ? `<span>${name}</span> <span class="limit-badge">${opt.limit} tokens</span>` 
            : `<span>${name}</span>`;
            
        div.addEventListener('click', () => { onSelect(name); closeModal(); });
        modalList.appendChild(div);
    });
    modalOverlay.classList.add('show');
}
function closeModal() { modalOverlay.classList.remove('show'); }
modalOverlay.onclick = (e) => { if (e.target === modalOverlay) closeModal(); };

modeBtn.addEventListener('click', () => {
    openModal('Select Mode', ['Fast', 'Planning'], async (mode) => {
        modeText.textContent = 'Setting...';
        try {
            const res  = await fetchWithAuth('/set-mode', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode }) });
            const data = await res.json();
            if (data.success) { currentMode = mode; modeText.textContent = mode; modeBtn.classList.toggle('active', mode === 'Planning'); showToast(`Mode: ${mode}`, 'success'); }
            else { modeText.textContent = currentMode; showToast('Failed to set mode', 'error'); }
        } catch(e) { modeText.textContent = currentMode; }
    });
});

modelBtn.addEventListener('click', () => {
    openModal('Select Model', MODELS, async (model) => {
        const prev = modelText.textContent;
        modelText.textContent = 'Setting...';
        try {
            const res  = await fetchWithAuth('/set-model', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model }) });
            const data = await res.json();
            if (data.success) { modelText.textContent = model; showToast(`Model: ${model.split(' ')[0]}`, 'success'); }
            else { modelText.textContent = prev; showToast('Failed to set model', 'error'); }
        } catch(e) { modelText.textContent = prev; }
    });
});

// ── Right Panel Drawer (Artifacts / Code / Plans) ──
function openPanel() {
    panelOpen = true;
    if (panelDrawer)  panelDrawer.classList.add('show');
    if (panelOverlay) panelOverlay.classList.add('show');
    startPanelPolling();
}

function closePanel() {
    panelOpen = false;
    if (panelDrawer)  panelDrawer.classList.remove('show');
    if (panelOverlay) panelOverlay.classList.remove('show');
    stopPanelPolling();
}

if (panelHamburgerBtn) panelHamburgerBtn.addEventListener('click', () => panelOpen ? closePanel() : openPanel());
if (closePanelDrawerBtn) closePanelDrawerBtn.addEventListener('click', closePanel);
if (panelOverlay) panelOverlay.addEventListener('click', closePanel);

async function switchPanelTab(tabName) {
    try {
        await fetchWithAuth('/remote-click', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                selector: 'button, [role="tab"]',
                index: 0,
                textContent: tabName,
                parentSelector: '[aria-label="Auxiliary Pane"], aside'
            })
        });
        setTimeout(fetchPanelContent, 150);
        setTimeout(fetchPanelContent, 600);
    } catch(e) {}
}

async function fetchPanelContent() {
    if (!panelOpen) return;
    try {
        const res  = await fetchWithAuth('/sidebar-content');
        const data = await res.json();
        if (!panelDrawerContent) return;
        if (data.found && data.html) {
            // 1. Inject high-fidelity CSS for code/diff highlighting
            if (data.css) {
                let styleTag = document.getElementById('desktop-aux-styles');
                if (!styleTag) {
                    styleTag = document.createElement('style');
                    styleTag.id = 'desktop-aux-styles';
                    document.head.appendChild(styleTag);
                }
                if (styleTag.textContent !== data.css) {
                    styleTag.textContent = data.css;
                }
            }

            // 2. Render dynamic tab headers to avoid overlaps and support all tabs
            if (data.tabs && data.tabs.length > 0) {
                const tabsContainer = document.getElementById('panelDrawerTabs');
                if (tabsContainer) {
                    const existingTabNames = Array.from(tabsContainer.querySelectorAll('.panel-tab')).map(t => t.textContent.trim());
                    const newTabNames = data.tabs;
                    const hasChanged = existingTabNames.length !== newTabNames.length || !existingTabNames.every((v, i) => v === newTabNames[i]);
                    
                    if (hasChanged) {
                        tabsContainer.innerHTML = '';
                        newTabNames.forEach(tabName => {
                            const btn = document.createElement('button');
                            btn.className = `panel-tab ${tabName === data.activeTab ? 'active' : ''}`;
                            btn.textContent = tabName;
                            btn.addEventListener('click', async () => {
                                tabsContainer.querySelectorAll('.panel-tab').forEach(t => t.classList.remove('active'));
                                btn.classList.add('active');
                                await switchPanelTab(tabName);
                            });
                            tabsContainer.appendChild(btn);
                        });
                    } else {
                        tabsContainer.querySelectorAll('.panel-tab').forEach(btn => {
                            if (btn.textContent.trim() === data.activeTab) {
                                btn.classList.add('active');
                            } else {
                                btn.classList.remove('active');
                            }
                        });
                    }
                }
            }

            if (data.html === lastPanelHtml && data.activeTab === lastActiveTab) return;
            lastPanelHtml = data.html;
            lastActiveTab = data.activeTab;
            panelDrawerContent.innerHTML = data.html;
        } else {
            lastPanelHtml = '';
            lastActiveTab = '';
            panelDrawerContent.innerHTML = `
                <div class="right-panel-empty">
                    <svg viewBox="0 0 24 24" width="40" height="40" stroke="currentColor" stroke-width="1.2" fill="none" opacity="0.3">
                        <rect x="3" y="3" width="18" height="18" rx="2"/>
                        <line x1="9" y1="3" x2="9" y2="21"/>
                        <path d="M13 8h4M13 12h4M13 16h4"/>
                    </svg>
                    <p>No artifact or code panel open on desktop.<br>Open one in Antigravity to see it here.</p>
                </div>`;
        }
    } catch(e) {}
}

function startPanelPolling() {
    clearInterval(panelPollTimer);
    fetchPanelContent();
    panelPollTimer = setInterval(fetchPanelContent, 5000);
}

function stopPanelPolling() {
    clearInterval(panelPollTimer);
    panelPollTimer = null;
}

// ── File Attachment ──
function renderAttachments() {
    if (!attachedFiles) return;
    attachedFiles.innerHTML = pendingAttachments.map((a, i) => `
        <div class="attach-chip">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                ${a.type.startsWith('image/') ? '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>' : '<path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/>'}
            </svg>
            <span>${a.name}</span>
            <button class="attach-chip-remove" data-idx="${i}" aria-label="Remove">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
            </button>
        </div>
    `).join('');
    attachedFiles.querySelectorAll('.attach-chip-remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt(btn.getAttribute('data-idx'));
            pendingAttachments.splice(idx, 1);
            renderAttachments();
        });
    });
}

if (attachBtn && fileInput) {
    attachBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => {
        Array.from(fileInput.files).forEach(file => {
            if (pendingAttachments.length >= 5) { showToast('Max 5 files', 'error'); return; }
            const reader = new FileReader();
            reader.onload = (ev) => {
                pendingAttachments.push({ file, name: file.name, dataUrl: ev.target.result, type: file.type });
                renderAttachments();
            };
            reader.readAsDataURL(file);
        });
        fileInput.value = '';
    });
}

// Paste image support
document.addEventListener('paste', (e) => {
    if (document.activeElement !== messageInput) return;
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
        if (item.kind === 'file' && item.type.startsWith('image/')) {
            e.preventDefault();
            if (pendingAttachments.length >= 5) { showToast('Max 5 files', 'error'); return; }
            const file = item.getAsFile();
            const reader = new FileReader();
            reader.onload = (ev) => {
                pendingAttachments.push({ file, name: 'pasted-image.png', dataUrl: ev.target.result, type: file.type });
                renderAttachments();
                showToast('Image pasted', 'success');
            };
            reader.readAsDataURL(file);
        }
    }
});

// Auto-detect right panel on startup — no-op now (drawer is always available)
async function checkForRightPanel() {}

// ── Remote Click (Thought blocks, Action buttons) ──
chatContainer.addEventListener('click', async (e) => {
    const target = e.target.closest('div, span, p, summary, button, details');
    if (!target) return;

    const text = target.innerText || '';
    const isUiToggle = /Thought|Thinking|Worked for|Edited|\d+\s+file/i.test(text) && text.length < 500;

    if (isUiToggle) {
        target.style.opacity = '0.5';
        setTimeout(() => target.style.opacity = '1', 300);
        const firstLine = text.split('\n')[0].trim();
        const allElements = chatContainer.querySelectorAll(target.tagName.toLowerCase());
        let tapIndex = 0;
        for (let i = 0; i < allElements.length; i++) {
            const el = allElements[i];
            const elText = el.innerText || '';
            const elFirst = elText.split('\n')[0].trim();
            if (/Thought|Thinking|Worked for|Edited|\d+\s+file/i.test(elText) && elText.length < 500 && elFirst === firstLine) {
                if (el === target || el.contains(target)) break;
                tapIndex++;
            }
        }
        try {
            await fetchWithAuth('/remote-click', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ selector: target.tagName.toLowerCase(), index: tapIndex, textContent: firstLine })
            });
            setTimeout(loadSnapshot, 400);
            setTimeout(loadSnapshot, 800);
            setTimeout(loadSnapshot, 1500);
        } catch(e) {}
        return;
    }

    // Action buttons
    const btn = e.target.closest('button, [role="button"]');
    if (btn) {
        const btnText = (btn.innerText || '').trim();
        const actionKeywords = [
            'Allow this conversation', 'Always allow', 'Allow once',
            'Review changes', 'Review', 'Confirm', 'Accept', 'Reject', 'Discard',
            'Allow', 'Deny', 'Apply', 'Save', 'Run', 'Yes', 'No', 'Proceed',
            'Implementation Plan', 'Plan', 'Show plan', 'View plan'
        ];
        const matchedKw = actionKeywords.find(kw => btnText.toLowerCase().includes(kw.toLowerCase()));
        if (matchedKw) {
            btn.style.opacity = '0.5';
            setTimeout(() => btn.style.opacity = '1', 300);
            const allBtns = Array.from(chatContainer.querySelectorAll('button, [role="button"]'));
            const matching = allBtns.filter(b => (b.innerText || '').toLowerCase().includes(matchedKw.toLowerCase()));
            const idx = matching.indexOf(btn);
            try {
                await fetchWithAuth('/remote-click', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ selector: btn.tagName.toLowerCase() === 'button' ? 'button' : '[role="button"]', index: idx >= 0 ? idx : 0, textContent: matchedKw })
                });
                
                // Auto-open right panel if action is related to artifacts / review
                if (['review', 'plan', 'review changes'].some(k => matchedKw.toLowerCase().includes(k))) {
                    setTimeout(openPanel, 600);
                }
                
                setTimeout(loadSnapshot, 400);
                setTimeout(loadSnapshot, 1000);
                setTimeout(loadSnapshot, 2500);
            } catch(e) {}
        }
    }
});

// ── Support Modal ──
if (supportBtn) supportBtn.addEventListener('click', () => supportOverlay?.classList.add('show'));
if (closeSupportBtn) closeSupportBtn.addEventListener('click', () => supportOverlay?.classList.remove('show'));
if (supportOverlay) supportOverlay.addEventListener('click', (e) => { if (e.target === supportOverlay) supportOverlay.classList.remove('show'); });

// ── SSL Listeners ──
if (enableHttpsBtn) enableHttpsBtn.addEventListener('click', enableHttps);
if (dismissSslBtn)  dismissSslBtn.addEventListener('click', dismissSslBanner);

// ── Modal Listeners ──
if (closeModalBtn)    closeModalBtn.addEventListener('click', closeModal);
if (closeSidebarBtn)  closeSidebarBtn.addEventListener('click', hideChatHistory);
if (sidebarOverlay)   sidebarOverlay.addEventListener('click', hideChatHistory);

// ── Auto-open panel if sidebar content available ──
setTimeout(async () => {
    try {
        const res  = await fetchWithAuth('/sidebar-content');
        const data = await res.json();
        if (data.found) {
            if (panelHamburgerBtn) {
                // Highlight the button to indicate content is available
                panelHamburgerBtn.style.color = '#a5b4fc';
            }
        }
    } catch(e) {}
}, 3000);

// ── Keyboard / Viewport ──
if (window.visualViewport) {
    function handleResize() {
        document.body.style.height = window.visualViewport.height + 'px';
        if (document.activeElement === messageInput) setTimeout(scrollToBottom, 100);
    }
    window.visualViewport.addEventListener('resize', handleResize);
    window.visualViewport.addEventListener('scroll', handleResize);
    handleResize();
} else {
    window.addEventListener('resize', () => { document.body.style.height = window.innerHeight + 'px'; });
    document.body.style.height = window.innerHeight + 'px';
}

// ── Init ──
connectWebSocket();
// Run initial status/state checks, then set slower intervals to prevent ngrok rate limits
fetchAppState();
checkChatStatus();
setInterval(fetchAppState, 30000); // 30s instead of 5s
setInterval(checkChatStatus, 60000); // 60s instead of 30s

// Check for right panel availability on load
setTimeout(checkForRightPanel, 3000);

// ── Unregister Service Worker (disabled to avoid caching issues during active development/edits)
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (let registration of registrations) {
            registration.unregister();
        }
    }).catch(err => {
        console.error('Failed to unregister ServiceWorker: ', err);
    });
}
