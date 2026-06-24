import puppeteer from 'puppeteer';
import fs from 'fs';
import https from 'https';
import path from 'path';

const CATALOG_PATH = path.join(process.cwd(), 'league_catalog.json');
const OUTPUT_DIR = path.join(process.cwd(), 'output_leagues');

if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR);
}

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

const getBucket = (tStr) => {
    if (!tStr) return 0;
    if (tStr.includes('+')) {
        let base = parseInt(tStr);
        if (base === 45) return 3;
        if (base === 90) return 7;
        if (base < 45) return 2;
        if (base > 45 && base < 90) return 6;
    }
    let t = parseInt(tStr);
    if (t <= 15) return 0;
    if (t <= 30) return 1;
    if (t <= 45) return 2;
    if (t <= 60) return 4;
    if (t <= 75) return 5;
    if (t <= 90) return 6;
    return 7;
};

const processMatchGoals = async (m, folderId) => {
    if (m.status !== 'FT' && m.status !== 'Finished') return;
    
    // Sometimes the match endpoint uses the first 4 chars of matchId
    let folder = String(m.matchId).substring(0, 4);
    let url = `https://data.7msport.com/goaldata/en/${folder}/${m.matchId}.js`;
    
    try {
        let scriptStr = await fetchUrl(url);
        if (!scriptStr) return;
        
        let extractVar = (name) => {
            let regex = new RegExp(`var ${name} = \\[(.*?)\\];`, 's');
            let match = scriptStr.match(regex);
            if (!match) return [];
            try {
                return eval(`[${match[1]}]`);
            } catch(e) {
                return [];
            }
        };

        let d_tm = extractVar('d_tm');
        let d_pn = extractVar('d_pn');
        let d_bf = extractVar('d_bf');
        
        if (d_tm.length > 0 && d_bf.length > 0) {
            let goalsArr = ["", "", "", "", "", "", "", ""];
            for (let i = 0; i < d_tm.length; i++) {
                let scoreStr = d_bf[i] || '';
                if (scoreStr !== '') {
                    let tStr = String(d_tm[i] || '');
                    let pName = d_pn[i] || '';
                    let bucket = getBucket(tStr);
                    
                    let goalStr = `${tStr}' ${pName} (${scoreStr})`;
                    if (goalsArr[bucket] !== "") {
                        goalsArr[bucket] += "<br>" + goalStr;
                    } else {
                        goalsArr[bucket] = goalStr;
                    }
                }
            }
            m.goals = goalsArr;
        }
    } catch(e) {
        console.log(`Failed fetching goals for ${m.matchId}: ${e.message}`);
    }
};

(async () => {
    console.log("Starting Incremental League Scraper Pipeline...");

    if (!fs.existsSync(CATALOG_PATH)) {
        console.error(`Catalog not found at ${CATALOG_PATH}. Please run generate_catalog.mjs first.`);
        process.exit(1);
    }

    let catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));

    const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        headless: "new"
    });

    let startTime = Date.now();
    const MAX_DURATION_MS = 345 * 60 * 1000; // 345 minutes limit for GitHub Actions (360 is hard limit)

    for (let league of catalog) {
        let leagueDir = path.join(OUTPUT_DIR, league.name.replace(/[^a-z0-9]/gi, '_'));
        if (!fs.existsSync(leagueDir)) {
            fs.mkdirSync(leagueDir);
        }

        for (let season of league.seasons) {
            if (Date.now() - startTime > MAX_DURATION_MS) {
                console.log("Approaching GitHub Actions time limit. Saving state and exiting gracefully.");
                fs.writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2));
                await browser.close();
                process.exit(0);
            }

            const outPath = path.join(leagueDir, `${season.year}.json`);
            let forceScrape = false;
            if (fs.existsSync(outPath)) {
                let content = fs.readFileSync(outPath, 'utf8').trim();
                if (content === '[]' || content === '') {
                    forceScrape = true;
                }
            }

            // 'current' year implies the live active season, which updates constantly. We scrape it every time.
            // Historical years are static, if completed, we skip them unless data is empty.
            if (season.completed && season.year !== 'current' && !forceScrape) {
                continue;
            }

            console.log(`\nScraping League: ${league.name} (ID: ${league.id}) - Season: ${season.year}`);
            
            const page = await browser.newPage();
            try {
                await page.goto(season.url, { waitUntil: 'networkidle2', timeout: 60000 });

                const matches = await page.evaluate((leagueGroup) => {
                    let results = [];
                    try {
                        let Tmp_bh_Arr = window.Tmp_bh_Arr || window.live_bh_arr || window.Match_bh_arr || [];
                        let TeamA_Arr = window.TeamA_Arr || window.TeamA_arr || [];
                        let TeamB_Arr = window.TeamB_Arr || window.TeamB_arr || [];
                        let Scores_Arr = window.Scores_Arr || window.score_arr || [];
                        let Time_Arr = window.Time_Arr || window.Start_time_arr || [];
                        
                        for (let i = 0; i < Tmp_bh_Arr.length; i++) {
                            let matchId = Tmp_bh_Arr[i];
                            let homeTeam = TeamA_Arr[i] || '';
                            let awayTeam = TeamB_Arr[i] || '';
                            
                            let scoreStr = Scores_Arr[i] || '';
                            let score = 'VS';
                            let htScore = '';
                            if (scoreStr && scoreStr.includes('-')) {
                                let parts = scoreStr.split('(');
                                score = parts[0];
                                if (parts[1]) htScore = '(' + parts[1];
                            }
                            
                            let tStr = typeof Time_Arr[i] === 'string' ? Time_Arr[i] : (Array.isArray(Time_Arr[i]) ? Time_Arr[i].join(',') : '');
                            let t = tStr.split(/[, \-\:]/);
                            
                            let year = t[0] || '2026';
                            let month = parseInt(t[1] || '1');
                            let day = parseInt(t[2] || '1');
                            let hour = parseInt(t[3] || '0');
                            let minute = parseInt(t[4] || '0');
                            
                            let dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                            let timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
                            
                            let title = `${homeTeam} ${score} ${awayTeam}`;
                            if (score === 'VS') title = `${homeTeam} VS ${awayTeam}`;
                            
                            let status = score === 'VS' ? 'Upcoming' : 'FT';
                            
                            results.push({
                                date: dateStr,
                                day: new Date(year, month - 1, day).toLocaleDateString('en-US', { weekday: 'long' }),
                                time: timeStr,
                                group: leagueGroup,
                                title: title,
                                homeTeam: homeTeam,
                                awayTeam: awayTeam,
                                score: score + (htScore ? ` ${htScore}` : ''),
                                matchId: String(matchId),
                                goals: [],
                                status: status
                            });
                        }
                    } catch(e) {
                        console.error(e);
                    }
                    return results;
                }, league.name);

                console.log(`Extracted ${matches.length} matches. Fetching goal data...`);
                
                // Fetch goals in batches
                const batchSize = 15;
                for (let i = 0; i < matches.length; i += batchSize) {
                    let batch = matches.slice(i, i + batchSize);
                    await Promise.all(batch.map(m => processMatchGoals(m, league.id)));
                }

                fs.writeFileSync(outPath, JSON.stringify(matches, null, 2));
                console.log(`Saved ${outPath}`);

                // Mark season as completed so we don't scrape it again next run
                if (season.year !== 'current') {
                    season.completed = true;
                    // Periodically save state to disk
                    fs.writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2));
                }

            } catch (err) {
                console.log(`Failed to process ${season.url}: ${err.message}`);
            } finally {
                await page.close();
            }
        }
    }

    await browser.close();
    console.log("All configured leagues and seasons processed successfully.");
})();
