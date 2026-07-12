const puppeteer = require('puppeteer');

(async () => {
    console.log('Launching browser...');
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    
    // Capture console logs
    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
    page.on('pageerror', err => console.error('BROWSER ERROR:', err.toString()));
    page.on('requestfailed', request => {
        console.error('BROWSER REQUEST FAILED:', request.url(), request.failure().errorText);
    });

    console.log('Navigating to Pinggy URL...');
    await page.goto('https://plvbo-122-161-49-51.run.pinggy-free.link/login.html', { waitUntil: 'networkidle2' });
    
    console.log('Logging in...');
    await page.type('#passcode', 'Antigravity123');
    await page.click('#loginBtn');
    
    console.log('Waiting for chat to load...');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    await page.waitForTimeout(5000); // Wait 5 seconds for snapshot to load
    
    console.log('Taking screenshot...');
    await page.screenshot({ path: 'debug_screenshot.png' });
    
    console.log('Dumping DOM structure of chatContent...');
    const chatContentHTML = await page.evaluate(() => {
        const chat = document.getElementById('chatContent');
        return chat ? chat.innerHTML.substring(0, 500) + '...' : 'chatContent not found';
    });
    console.log('CHAT CONTENT START:', chatContentHTML);
    
    const chatContentStyles = await page.evaluate(() => {
        const chat = document.getElementById('chatContent');
        if (!chat) return null;
        const style = window.getComputedStyle(chat);
        return {
            height: style.height,
            display: style.display,
            visibility: style.visibility,
            opacity: style.opacity
        };
    });
    console.log('CHAT CONTENT STYLES:', chatContentStyles);

    const firstChildStyles = await page.evaluate(() => {
        const chat = document.getElementById('chatContent');
        if (!chat || !chat.firstElementChild) return null;
        const style = window.getComputedStyle(chat.firstElementChild);
        return {
            tagName: chat.firstElementChild.tagName,
            id: chat.firstElementChild.id,
            className: chat.firstElementChild.className,
            height: style.height,
            display: style.display,
            visibility: style.visibility
        };
    });
    console.log('FIRST CHILD STYLES:', firstChildStyles);

    await browser.close();
    console.log('Done.');
})();
