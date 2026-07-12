const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox'] });
    const page = await browser.newPage();
    
    // Simulate a mobile phone screen
    await page.setViewport({ width: 390, height: 844, isMobile: true });
    
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    
    // Wait a few seconds to let any polling/rendering finish
    await new Promise(r => setTimeout(r, 3000));
    
    // Check if there is content in the chat container
    const result = await page.evaluate(() => {
        const chatContent = document.getElementById('chatContent');
        if (!chatContent) return { error: 'No #chatContent found' };
        
        const rect = chatContent.getBoundingClientRect();
        
        // Find visible text
        const text = chatContent.innerText.trim();
        
        // Count specific elements to understand what was rendered
        const divCount = chatContent.querySelectorAll('div').length;
        
        // Take the first child's HTML to see what's actually inside
        const firstChildHtml = chatContent.firstElementChild ? chatContent.firstElementChild.outerHTML.substring(0, 500) : 'No children';
        
        return {
            rect: { width: rect.width, height: rect.height, top: rect.top, left: rect.left },
            textPreview: text.substring(0, 100).replace(/\n/g, ' '),
            textLength: text.length,
            divCount,
            firstChildHtml,
            bodyHtml: document.body.outerHTML.substring(0, 200)
        };
    });
    
    console.log(JSON.stringify(result, null, 2));
    
    // Take screenshot to artifacts for me to view if needed
    await page.screenshot({ path: '/Users/mahendra/.gemini/antigravity/brain/01db19b2-c986-42c5-942f-f8223276e7ef/mobile-test.png' });
    
    await browser.close();
})();
