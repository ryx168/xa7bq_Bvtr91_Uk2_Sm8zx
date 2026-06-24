import puppeteer from 'puppeteer-core';
import fs from 'fs';

(async () => {
    const browser = await puppeteer.launch({
        executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        headless: true
    });
    const page = await browser.newPage();
    await page.goto('https://data.7msport.com/database/index_en.htm', { waitUntil: 'networkidle2' });
    
    const leagues = await page.evaluate(() => {
        let results = [];
        let links = document.querySelectorAll('a[href*="/matches_data/"]');
        for (let a of links) {
            let href = a.getAttribute('href');
            let match = href.match(/\/matches_data\/(\d+)\/en\/index\.shtml/);
            if (match) {
                let id = match[1];
                let name = a.innerText.trim();
                if (id && name) {
                    results.push({id, name});
                }
            }
        }
        return results;
    });
    
    fs.writeFileSync('all_leagues_test.json', JSON.stringify(leagues, null, 2));
    console.log(`Found ${leagues.length} leagues in the database page.`);
    await browser.close();
})();
