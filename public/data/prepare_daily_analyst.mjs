import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, '..');

async function main() {
    console.log("Preparing daily analyst references...");
    
    const dNow = new Date();
    const dateStr = dNow.getFullYear() + '-' + String(dNow.getMonth() + 1).padStart(2, '0') + '-' + String(dNow.getDate()).padStart(2, '0');
    
    const liveGamesPath = path.join(publicDir, `sports/live_game/live_games_${dateStr}.json`);
    if (!fs.existsSync(liveGamesPath)) {
        console.error(`Live games file not found for today: ${liveGamesPath}`);
        process.exit(1);
    }
    
    const liveGames = JSON.parse(fs.readFileSync(liveGamesPath, 'utf8'));
    console.log(`Found ${liveGames.length} live games. Processing Game Analyst reference data...`);
    
    const pyScript = path.join(__dirname, 'fetch_history_references.py');
    
    for (let match of liveGames) {
        if (!match.matchId || !match.homeTeam || !match.awayTeam) continue;
        
        const yearStr = dateStr.split('-')[0];
        const monthStr = dateStr.split('-')[1];
        const dateDirStr = dateStr.replace(/-/g, '_');
        
        const refPath = path.join(publicDir, `sports/refs/${yearStr}/${monthStr}/${dateDirStr}/${match.matchId}.json`);
        
        if (fs.existsSync(refPath)) {
            console.log(`[${match.matchId}] Ref data already exists. Skipping.`);
            continue;
        }
        
        console.log(`[${match.matchId}] Fetching reference data for ${match.homeTeam} vs ${match.awayTeam}...`);
        
        await new Promise((resolve) => {
            const child = spawn('python', [pyScript, String(match.matchId), match.homeTeam, match.awayTeam, dateStr]);
            
            child.stdout.on('data', (data) => process.stdout.write(data));
            child.stderr.on('data', (data) => process.stderr.write(data));
            
            child.on('close', (code) => {
                if (code !== 0) {
                    console.error(`Error processing ${match.matchId}`);
                }
                resolve();
            });
        });
        
        // Small delay to prevent rate-limiting from 7msport
        await new Promise(r => setTimeout(r, 1000));
    }
    
    console.log("Finished preparing daily references!");
}

main().catch(console.error);
