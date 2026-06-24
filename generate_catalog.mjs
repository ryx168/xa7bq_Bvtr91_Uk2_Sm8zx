import fs from 'fs';
import https from 'https';
import path from 'path';

const CATALOG_PATH = path.join(process.cwd(), 'league_catalog.json');

const fetchUrl = (url) => {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            if (res.statusCode === 404) return resolve('');
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', err => reject(err));
    });
};

(async () => {
    console.log("Fetching 7msport index to discover leagues...");
    const html = await fetchUrl('https://data.7msport.com/');
    
    // Regex to match: <a href="/matches_data/1044/en/index.shtml">USL Championship</a>
    const regex = /href=[\"']\/matches_data\/(\d+)\/en\/index\.shtml[\"'][^>]*>(.*?)<\/a>/g;
    
    const leaguesMap = new Map();
    let match;
    while ((match = regex.exec(html)) !== null) {
        let id = match[1];
        let name = match[2].replace(/<[^>]+>/g, '').trim(); // Remove nested tags if any
        if (id && name && !leaguesMap.has(id)) {
            leaguesMap.set(id, { id, name, seasons: [] });
        }
    }
    
    const leagues = Array.from(leaguesMap.values());
    console.log(`Discovered ${leagues.length} unique leagues. Fetching historical seasons...`);
    
    const batchSize = 10;
    for (let i = 0; i < leagues.length; i += batchSize) {
        const batch = leagues.slice(i, i + batchSize);
        await Promise.all(batch.map(async (league) => {
            const url = `https://data.7msport.com/matches_data/${league.id}/en/index.js`;
            try {
                const scriptStr = await fetchUrl(url);
                if (!scriptStr) return;
                
                // Parse d_start_date and d_end_date to determine season string
                let currentYearStr = 'current';
                const startDateMatch = scriptStr.match(/var d_start_date = ['"](.*?)['"];/);
                const endDateMatch = scriptStr.match(/var d_end_date = ['"](.*?)['"];/);
                if (startDateMatch && endDateMatch) {
                    let startYear = startDateMatch[1].split('-')[0];
                    let endYear = endDateMatch[1].split('-')[0];
                    if (startYear === endYear) {
                        currentYearStr = startYear;
                    } else {
                        currentYearStr = `${startYear}-${endYear}`;
                    }
                }
                
                // Add current year with dynamically determined year string
                league.seasons.push({ year: currentYearStr, url: `https://data.7msport.com/matches_data/${league.id}/en/index.shtml`, completed: false, isCurrent: true });
                
                // Parse d_Links: <A href="/history_matches_data/2025/1044/en/index.shtml" target=_blank>2025</A>
                const dLinksMatch = scriptStr.match(/var d_Links = ['"](.*?)['"];/);
                if (dLinksMatch && dLinksMatch[1]) {
                    const linksStr = dLinksMatch[1];
                    const linkRegex = /href=[\"']([^\"']+)[\"'][^>]*>(\d{4}|\d{4}-\d{4})<\/A>/ig;
                    let lMatch;
                    while ((lMatch = linkRegex.exec(linksStr)) !== null) {
                        let linkUrl = lMatch[1];
                        let year = lMatch[2];
                        league.seasons.push({ year, url: `https://data.7msport.com${linkUrl}`, completed: false });
                    }
                }
            } catch(e) {
                console.log(`Failed fetching seasons for ${league.name} (${league.id}): ${e.message}`);
            }
        }));
        console.log(`Processed ${Math.min(i + batchSize, leagues.length)} / ${leagues.length} leagues...`);
    }
    
    // Merge with existing catalog to preserve 'completed' states
    let existingCatalog = [];
    if (fs.existsSync(CATALOG_PATH)) {
        existingCatalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
    }
    
    // Create lookup map for existing states
    const stateMap = new Map();
    for (const l of existingCatalog) {
        for (const s of l.seasons) {
            stateMap.set(`${l.id}_${s.year}`, s.completed);
        }
    }
    
    // Apply existing completed states to the freshly fetched list
    for (const l of leagues) {
        for (const s of l.seasons) {
            const isCompleted = stateMap.get(`${l.id}_${s.year}`);
            if (isCompleted) {
                s.completed = true;
            }
        }
    }
    
    fs.writeFileSync(CATALOG_PATH, JSON.stringify(leagues, null, 2));
    console.log(`Saved full league catalog to ${CATALOG_PATH}.`);
})();
