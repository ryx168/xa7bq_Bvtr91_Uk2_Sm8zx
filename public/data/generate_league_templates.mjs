import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { JSDOM } from 'jsdom';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, '..');

// Set up JSDOM
const dom = new JSDOM(`
<!DOCTYPE html>
<html>
<body>
  <div id="last-game-calendar-container"></div>
</body>
</html>
`, { url: 'http://localhost:8788/#sports/FIFA-2026-World-Cup' });

global.window = dom.window;
global.document = dom.window.document;
global.console = console;

// Mock fetch to read local files
global.fetch = async (url) => {
    let filePath = url;
    if (filePath.startsWith('/')) {
        filePath = path.join(publicDir, filePath.split('?')[0]);
    }
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
        return {
            ok: false,
            json: async () => [],
            text: async () => ''
        };
    }

    const content = fs.readFileSync(filePath, 'utf8');
    return {
        ok: true,
        json: async () => JSON.parse(content),
        text: async () => content
    };
};



async function generateFifaTemplate(year) {
    console.log(`Generating FIFA ${year} template...`);
    const container = document.getElementById('last-game-calendar-container');
    container.innerHTML = ''; // Clear
    
    // Bind the function to an object that has renderFifa2026Calendar
    const { SportsMixin } = await import('../js/sports_fifa2026.js');
    const context = {
        renderFifa2026Calendar: SportsMixin.renderFifa2026Calendar.bind(SportsMixin)
    };
    
    await SportsMixin.fetchAndRenderFifa2026Calendar.call(context, year);
    
    const html = container.innerHTML;
    if (html) {
        const outPath = path.join(publicDir, `data/leagues/FIFA_${year}_template.html`);
        fs.writeFileSync(outPath, html, 'utf8');
        console.log(`Saved template to ${outPath}`);
    } else {
        console.error(`Generated HTML for FIFA ${year} was empty.`);
    }
}

async function generateLeagueTemplate(leagueId, season) {
    console.log(`Generating League ${leagueId} ${season} template...`);
    const container = document.getElementById('last-game-calendar-container');
    container.innerHTML = ''; // Clear
    
    const { SportsLeagueMixin } = await import('../js/sports_leagual.js');
    const context = {
        renderLeagueCalendar: SportsLeagueMixin.renderLeagueCalendar.bind(SportsLeagueMixin)
    };
    
    await SportsLeagueMixin.fetchAndRenderLeagueCalendar.call(context, leagueId, season);
    
    const html = container.innerHTML;
    if (html) {
        const outPath = path.join(publicDir, `data/leagues/${leagueId}_${season}_template.html`);
        const dir = path.dirname(outPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        
        fs.writeFileSync(outPath, html, 'utf8');
        console.log(`Saved template to ${outPath}`);
    } else {
        console.error(`Generated HTML for League ${leagueId} ${season} was empty.`);
    }
}

async function main() {
    try {
        await generateFifaTemplate(2026);
        
        const leaguesDir = path.join(publicDir, 'data/leagues');
        if (fs.existsSync(leaguesDir)) {
            const entries = fs.readdirSync(leaguesDir, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.isDirectory()) {
                    const leagueId = entry.name;
                    const leaguePath = path.join(leaguesDir, leagueId);
                    const files = fs.readdirSync(leaguePath);
                    for (const file of files) {
                        if (file.endsWith('.json') && file !== 'live.json') {
                            const season = file.replace('.json', '');
                            await generateLeagueTemplate(leagueId, season);
                        }
                    }
                }
            }
        }
    } catch (e) {
        console.error("Error generating templates:", e);
    }
}

main();
