import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { JSDOM } from 'jsdom';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, '..');

// Read the real index.html to ensure all DOM elements are present
let indexHtml = '';
try {
    indexHtml = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');
    indexHtml = indexHtml.replace('<head>', '<head><script>window.matchMedia = window.matchMedia || function() { return { matches: false, addListener: function() {}, removeListener: function() {} }; };</script>');
} catch(e) {
    console.error("Could not read index.html", e);
    process.exit(1);
}

const dom = new JSDOM(indexHtml, {
    url: 'http://localhost:8788/#all_live_soccer',
    runScripts: 'dangerously'
});

global.window = dom.window;
global.document = dom.window.document;
global.console = console;

// Polyfill window.matchMedia for JSDOM
global.window.matchMedia = global.window.matchMedia || function() {
    return {
        matches: false,
        addListener: function() {},
        removeListener: function() {}
    };
};

global.localStorage = {
    getItem: function() { return null; },
    setItem: function() {},
    removeItem: function() {}
};
Object.defineProperty(global.window, 'localStorage', { value: global.localStorage });
Object.defineProperty(global.window, 'sessionStorage', { value: global.localStorage });

global.EventSource = class { constructor() {} close() {} addEventListener() {} };
global.window.EventSource = global.EventSource;

// Mock fetch to serve files from local filesystem
global.fetch = async (url) => {
    let filePath = url.split('?')[0];
    if (filePath.startsWith('/')) {
        filePath = path.join(publicDir, filePath);
    } else if (filePath.startsWith('http://localhost:8788/')) {
        filePath = path.join(publicDir, filePath.replace('http://localhost:8788/', ''));
    }
    
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

async function main() {
    console.log("Initializing Game Analyst environment...");
    
    // Import app-core which initializes window.App
    // Note: We might need to mock some browser APIs if it complains, 
    // but JSDOM usually handles standard ones.
    
    // Actually, we don't necessarily need the ENTIRE app-core if we can just trigger loadSportsSchedule directly,
    // but app-core sets up `window.App` which sports_leagual.js depends on!
    const appModule = await import('../js/app.js');
    const App = global.window.App;
    
    await App.init(); // Initialize routing and state
    
    console.log("App Initialized. Fetching today's live matches...");
    
    const dNow = new Date();
    const dateStr = dNow.getFullYear() + '-' + String(dNow.getMonth() + 1).padStart(2, '0') + '-' + String(dNow.getDate()).padStart(2, '0');
    
    const liveGamesPath = path.join(publicDir, `sports/live_game/live_games_${dateStr}.json`);
    if (!fs.existsSync(liveGamesPath)) {
        console.error(`Live games file not found for today: ${liveGamesPath}`);
        process.exit(1);
    }
    
    const liveGames = JSON.parse(fs.readFileSync(liveGamesPath, 'utf8'));
    console.log(`Found ${liveGames.length} live games. Processing Game Analyst data...`);
    
    const analystDir = path.join(publicDir, `data/analyst/${dateStr}`);
    if (!fs.existsSync(analystDir)) {
        fs.mkdirSync(analystDir, { recursive: true });
    }
    
    for (const match of liveGames) {
        if (!match.matchId) continue;
        
        console.log(`Processing Game Analyst for Match: ${match.homeTeam} vs ${match.awayTeam} (ID: ${match.matchId})`);
        
        const league = match.group ? match.group.replace(/ /g, '_') : 'Unknown';
        const home = match.homeTeam ? match.homeTeam.replace(/ /g, '-') : 'Home';
        const away = match.awayTeam ? match.awayTeam.replace(/ /g, '-') : 'Away';
        
        const hash = `#all_live_soccer/${match.date}/${league}/${home}-vs-${away}_id_${match.matchId}`;
        
        // Setup listener
        const renderPromise = new Promise(resolve => {
            const handler = () => {
                document.removeEventListener('AnalystRenderComplete', handler);
                resolve();
            };
            document.addEventListener('AnalystRenderComplete', handler);
            
            // Timeout just in case it doesn't fire
            setTimeout(() => {
                document.removeEventListener('AnalystRenderComplete', handler);
                resolve();
            }, 10000); 
        });
        
        // Trigger hash change
        dom.window.location.hash = hash;
        App.switchTask(hash.substring(1)); 
        
        // Wait for rendering to complete
        await renderPromise;
        
        // Extract HTML
        const tbody = document.getElementById('sports-table-body');
        const leftHtml = tbody ? tbody.innerHTML : '';
        const rightHtml = document.getElementById('game-list-left-column')?.innerHTML || '';
        
        console.log(`  -> HTML Lengths: left=${leftHtml.length}, right=${rightHtml.length}`);
        
        if (leftHtml && rightHtml) {
            const outPath = path.join(analystDir, `${match.matchId}.json`);
            fs.writeFileSync(outPath, JSON.stringify({ leftColumn: leftHtml, rightColumn: rightHtml }), 'utf8');
            console.log(`  -> Saved ${outPath}`);
        } else {
            console.log(`  -> Render failed or empty for match ${match.matchId}`);
        }
    }
    
    console.log("Daily Game Analyst Preparation Complete!");
    process.exit(0);
}

main().catch(err => {
    console.error("Error running daily analyst:", err);
    process.exit(1);
});
