import { DOMParser } from 'linkedom';
import fs from 'fs';
const html = fs.readFileSync('ag_full.html', 'utf8');
const doc = new DOMParser().parseFromString(html, 'text/html');
const el = doc.querySelector('[id="antigravity.agentSidePanelInputBox"]');
console.log("Found:", !!el);
if (el) {
    el.remove();
    const html2 = doc.body.outerHTML;
    console.log("Still there:", html2.includes('agentSidePanelInputBox'));
}
