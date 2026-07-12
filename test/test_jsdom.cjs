const { JSDOM } = require('jsdom');
const fs = require('fs');
const html = fs.readFileSync('ag_full.html', 'utf8');
const dom = new JSDOM(html);
const doc = dom.window.document;
const el = doc.querySelector('[id="antigravity.agentSidePanelInputBox"]');
console.log("Found:", !!el);
if (el) {
    el.remove();
    const html2 = doc.body.outerHTML;
    console.log("Still there:", html2.includes('agentSidePanelInputBox'));
}
