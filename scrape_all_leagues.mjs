import puppeteer from 'puppeteer';
import fs from 'fs';
import https from 'https';
import path from 'path';

const LEAGUES = [
    { id: '1044', name: 'USLC_2026', group: 'USLC' }
    // Add more leagues here as needed:
    // { id: '...', name: '...', group: '...' }
];

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

const processMatchGoals = async (m) => {
    if (m.status !== 'FT' && m.status !== 'Finished') return;
    
    let folder = m.matchId.substring(0, 4);
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
    console.log("Starting League Scraper Pipeline...");

    const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        headless: "new"
    });

    for (const league of LEAGUES) {
        console.log(`\nScraping League: ${league.name} (ID: ${league.id})`);
        const page = await browser.newPage();
        
        const url = `https://data.7msport.com/matches_data/${league.id}/en/index.shtml`;
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

        const matches = await page.evaluate((leagueGroup) => {
            let results = [];
            try {
                let Tmp_bh_Arr = window.Tmp_bh_Arr || [];
                let TeamA_Arr = window.TeamA_Arr || [];
                let TeamB_Arr = window.TeamB_Arr || [];
                let Scores_Arr = window.Scores_Arr || [];
                let Time_Arr = window.Time_Arr || [];
                
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
                    let t = tStr.split(',');
                    
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
        }, league.group);

        console.log(`Extracted ${matches.length} matches from index. Fetching goal data...`);
        
        // Fetch goals in batches
        const batchSize = 20;
        for (let i = 0; i < matches.length; i += batchSize) {
            let batch = matches.slice(i, i + batchSize);
            await Promise.all(batch.map(m => processMatchGoals(m)));
        }

        const outPath = path.join(OUTPUT_DIR, `${league.name}.json`);
        fs.writeFileSync(outPath, JSON.stringify(matches, null, 2));
        console.log(`Saved ${league.name}.json to ${outPath}`);
        
        await page.close();
    }

    await browser.close();
    console.log("All leagues processed successfully.");
})();
