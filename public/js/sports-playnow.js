/**
 * sports-playnow.js
 * Integration mixin for PlayNow betting, profile balances, odds mapping, and cross-matching.
 */

import { distance } from './sports-utils.js';

export const SportsMixin = {
    // =========================================================================
    // STATE
    // =========================================================================
    playnowOddsCache: {},
    playnowMatches: [],

    // =========================================================================
    // METHODS
    // =========================================================================
    async placePlaynowBet(homeTeam, awayTeam, targetGoals, isOver = false, oOdds = null, uOdds = null) {
        const betType = isOver ? 'Over' : 'Under';
        if (!confirm(`Are you sure you want to autonomously bet ${betType} ${targetGoals} on ${homeTeam} vs ${awayTeam}? (Amount defined in .env)`)) {
            return;
        }
        const btnId = `bet-btn-${isOver ? 'o' : 'u'}-${homeTeam.replace(/\\s+/g, '-')}-${awayTeam.replace(/\\s+/g, '-')}-${targetGoals}`;
        const btn = document.getElementById(btnId);
        if (btn) btn.style.opacity = '0.5';

        try {
            const res = await fetch('/api/playnow/bet', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ homeTeam, awayTeam, targetGoals, isOver, odds: { over: oOdds, under: uOdds } })
            });
            const data = await res.json();
            if (data.success) {
                alert(`Bet placed successfully on ${betType} ${targetGoals}!`);
            } else {
                alert(`Failed to place bet: ${data.error || 'Unknown error'}`);
            }
        } catch (e) {
            alert(`Error placing bet: ${e.message}`);
        } finally {
            if (btn) btn.style.opacity = '1';
        }
    },

    async fetchPlaynowOdds() {
        try {
            let activeMatch = this.targetAutoOpenMatch;
            if (!activeMatch && this.expandedMatchRefs) {
                const keys = Object.keys(this.expandedMatchRefs);
                if (keys.length > 0) activeMatch = this.expandedMatchRefs[keys[0]];
            }

            let url = 'http://localhost:3001/api/playnow/odds/latest';
            if (activeMatch) {
                url += `?home=${encodeURIComponent(activeMatch.homeTeam)}&away=${encodeURIComponent(activeMatch.awayTeam)}`;
            }

            const res = await fetch(url);
            const result = await res.json();
            if (result.success) {
                let oddsList = [];
                if (result.odds) oddsList.push(result.odds);
                else if (result.matches) oddsList = result.matches;

                oddsList.forEach(oddsObj => {
                    if (!oddsObj || !oddsObj.matchName || !oddsObj.odds) return;
                    const mn = oddsObj.matchName.toLowerCase();
                    const oddsArray = oddsObj.odds;
                    const localCache = {};

                    oddsArray.forEach(o => {
                        const parts = o.text.split(' ');
                        if (parts.length >= 3) {
                            const type = parts[0].toLowerCase();
                            const target = parts[1];
                            const price = parts[2];

                            if (!localCache[target]) localCache[target] = {};
                            if (!localCache[target][type]) localCache[target][type] = price;
                        }
                    });

                    const btns = document.querySelectorAll('[id^="bet-btn-"]');
                    btns.forEach(b => {
                        const homeTeam = (b.getAttribute('data-home') || '').toLowerCase();
                        const awayTeam = (b.getAttribute('data-away') || '').toLowerCase();

                        if (mn.includes(homeTeam) || mn.includes(awayTeam)) {
                            const idParts = b.id.split('-');
                            const typeStr = idParts[2]; // o or u
                            const target = idParts[idParts.length - 1]; // e.g. 1.5

                            const typeKey = typeStr === 'o' ? 'over' : 'under';
                            const oddsData = localCache[target];
                            if (oddsData && oddsData[typeKey]) {
                                b.innerText = oddsData[typeKey];
                            }
                        }
                    });
                });
            }
        } catch (e) { }
    },

    async fetchPlaynowProfile() {
        const balanceEl = document.getElementById('playnow-balance');
        const betsEl = document.getElementById('playnow-bets-container');
        const errorBanner = document.getElementById('playnow-error-banner');

        balanceEl.innerText = "Balance: Loading...";
        betsEl.innerText = "Loading active bets from profile...";
        errorBanner.classList.add('hidden');

        try {
            const res = await fetch('/api/playnow/profile');
            const data = await res.json();

            if (data.sessionExpired) {
                errorBanner.classList.remove('hidden');
                balanceEl.innerText = "Balance: $--.--";
                betsEl.innerText = "Session expired or login required.";
                return;
            }

            if (data.success) {
                balanceEl.innerText = "Balance: " + (data.balance || "$--.--");
                betsEl.innerText = data.rawBetsText || "No active bets found.";

                // Also refresh the odds when profile is refreshed
                if (typeof this.fetchPlaynowOdds === 'function') {
                    this.fetchPlaynowOdds();
                }
            } else {
                errorBanner.classList.remove('hidden');
                balanceEl.innerText = "Balance: Error";
                betsEl.innerText = data.error || "Unknown error occurred.";
            }
        } catch (e) {
            betsEl.innerText = "Network Error: " + e.message;
        }
    },

    filterAndMapPlaynowMatches(liveRefsAll) {
        let filteredMatches = this.playnowMatches || [];

        // Map local data from 7m onto playnow matches
        filteredMatches.forEach(pn => {
            let teamMap = JSON.parse(localStorage.getItem('si_team_map') || '{}');
            let manualMatches = JSON.parse(localStorage.getItem('si_manual_matches') || '{}');

            let refHome = teamMap[pn.homeTeam] || pn.homeTeam;
            let refAway = teamMap[pn.awayTeam] || pn.awayTeam;

            let key = `${pn.homeTeam}-${pn.awayTeam}`;
            if (manualMatches[key]) {
                pn.matchId = manualMatches[key];
            } else {
                let refGame = liveRefsAll.find(ref => {
                    if (ref.isFifa) return false;
                    let rh = ref.homeTeam ? ref.homeTeam.replace(/\\(N\\)/gi, '').replace(/['\\\\]/g, '').trim().toLowerCase() : '';
                    let ra = ref.awayTeam ? ref.awayTeam.replace(/\\(N\\)/gi, '').replace(/['\\\\]/g, '').trim().toLowerCase() : '';
                    let sh = refHome.toLowerCase().trim();
                    let sa = refAway.toLowerCase().trim();

                    if (rh === sh || ra === sa) return true;

                    let distH = distance(rh, sh);
                    let distA = distance(ra, sa);
                    if (distH <= 2 && distA <= 2) return true;

                    return false;
                });
                if (refGame) {
                    pn.matchId = refGame.matchId;
                }
            }
        });
        return filteredMatches;
    },

    async pollPlaynowLiveGames() {
        try {
            const res = await fetch('http://localhost:3001/api/playnow/live-games');
            if (res.ok) {
                const games = await res.json();
                let scoreChanged = false;
                games.forEach(g => {
                    if (!g.playnowId) return;
                    const statusCells = document.querySelectorAll(`.live-match-status[data-playnow-id="${g.playnowId}"]`);
                    statusCells.forEach(c => {
                        let text = g.gameTime || g.status;
                        if (text) c.innerHTML = text === 'FT' ? `<span style="color: #64748b;">FT</span>` : `<span style="color: #ef4444;">${text}</span>`;
                    });

                    const scoreCells = document.querySelectorAll(`.live-match-score[data-playnow-id="${g.playnowId}"]`);
                    scoreCells.forEach(c => {
                        if (g.score) {
                            const scoreEl = c.querySelector('.score-text');
                            if (scoreEl) {
                                if (scoreEl.innerText.trim() !== g.score.trim()) scoreChanged = true;
                                scoreEl.innerHTML = g.score;
                            } else {
                                let textOnly = Array.from(c.childNodes).filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim();
                                if (textOnly && textOnly !== g.score.trim()) {
                                    scoreChanged = true;
                                }
                            }
                        }
                    });
                });
                if (scoreChanged && typeof this.loadSportsSchedule === 'function') {
                    console.log("[Live Interval] Score changed, reloading schedule to update analyst data...");
                    this.loadSportsSchedule(this.currentSportsYear || 2026);
                }
            }
        } catch (e) { }
    },

    promptPlaynowSIMatchGame(matchId, homeTeam, awayTeam, playnowId, year, playnowLeague) {
        if (!this.siMatches || this.siMatches.length === 0) {
            alert("SI games not loaded yet. Please wait or refresh.");
            return;
        }

        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.top = '0'; overlay.style.left = '0'; overlay.style.width = '100vw'; overlay.style.height = '100vh';
        overlay.style.backgroundColor = 'rgba(0,0,0,0.5)';
        overlay.style.zIndex = '9999';
        overlay.style.display = 'flex'; overlay.style.alignItems = 'center'; overlay.style.justifyContent = 'center';

        const modal = document.createElement('div');
        modal.style.background = 'white'; modal.style.padding = '20px'; modal.style.borderRadius = '8px';
        modal.style.width = '500px'; modal.style.maxWidth = '90vw';

        let html = `<h3 style="margin-top:0; font-size: 16px;">Match to SI: ${homeTeam} vs ${awayTeam}</h3>`;
        html += `<p style="font-size:12px; color:#666;">Select the corresponding SI game:</p>`;
        html += `<select id="si-playnow-match-select" style="width:100%; padding:8px; margin-bottom:15px; border:1px solid #ccc; border-radius:4px; max-height:200px; overflow-y:auto;">`;
        html += `<option value="">-- Select an SI match --</option>`;

        this.siMatches.forEach(si => {
            const league = si.group ? `${si.group} | ` : '';
            const score = si.score ? ` ${si.score} ` : ' vs ';
            html += `<option value="${si.homeTeam}|||${si.awayTeam}|||${si.siMatchId || si.matchId}|||${si.group || ''}">${league}${si.time || ''} | ${si.status || 'Live'} | ${si.homeTeam}${score}${si.awayTeam}</option>`;
        });

        html += `</select>`;
        html += `<div style="display:flex; justify-content:flex-end; gap:10px;">
            <button id="si-playnow-match-cancel" style="padding:6px 12px; border:1px solid #ccc; background:#fff; border-radius:4px; cursor:pointer;">Cancel</button>
            <button id="si-playnow-match-save" style="padding:6px 12px; border:none; background:#3b82f6; color:#fff; border-radius:4px; cursor:pointer;">Save</button>
        </div>`;

        modal.innerHTML = html;
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        document.getElementById('si-playnow-match-cancel').onclick = () => {
            document.body.removeChild(overlay);
        };

        document.getElementById('si-playnow-match-save').onclick = () => {
            const select = document.getElementById('si-playnow-match-select');
            if (select.value) {
                const parts = select.value.split('|||');
                const siHome = parts[0];
                const siAway = parts[1];
                const siMatchId = parts[2];

                const manualKey = year === 'tonybet' ? 'tonybet_manual_matches' : 'playnow_manual_matches';
                const manualMatches = JSON.parse(localStorage.getItem(manualKey) || '{}');
                manualMatches[`${siHome}-${siAway}`] = matchId;
                localStorage.setItem(manualKey, JSON.stringify(manualMatches));

                const teamMapKey = year === 'tonybet' ? 'tonybet_team_map' : 'playnow_team_map';
                const teamMap = JSON.parse(localStorage.getItem(teamMapKey) || '{}');
                teamMap[siHome] = homeTeam;
                teamMap[siAway] = awayTeam;
                localStorage.setItem(teamMapKey, JSON.stringify(teamMap));

                const leagueMapKey = year === 'tonybet' ? 'tonybet_league_map' : 'playnow_league_map';
                const endpointMappings = year === 'tonybet' ? '/api/sports/tonybet/mappings' : '/api/sports/playnow/mappings';
                
                // Get playnowLeague from the function argument or match object
                if (!playnowLeague && typeof window !== 'undefined' && window.App && window.App.playnowMatches) {
                    let pMatch = window.App.playnowMatches.find(m => m.playnowId == playnowId);
                    if (pMatch) playnowLeague = pMatch.group || pMatch.leagueName || '';
                }

                try {
                    fetch('http://localhost:3001/api/mappings/link', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            playnowId: playnowId,
                            siMatchId: siMatchId,
                            playnowHome: homeTeam,
                            siHome: siHome,
                            playnowAway: awayTeam,
                            siAway: siAway,
                            playnowLeague: playnowLeague,
                            siLeague: siLeague
                        })
                    });
                } catch (e) { console.error('Failed to link in SQL:', e); }

                try {
                    fetch(endpointMappings, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            manualMatches: JSON.parse(localStorage.getItem(manualKey) || '{}'),
                            teamMap: JSON.parse(localStorage.getItem(teamMapKey) || '{}'),
                            leagueMap: JSON.parse(localStorage.getItem(leagueMapKey) || '{}')
                        })
                    });
                } catch (e) { console.error(`Failed to sync ${year} mappings:`, e); }

                if (playnowId && siMatchId) {
                    try {
                        const now = new Date();
                        const dateStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
                        const endpointDailyMatches = year === 'tonybet' ? '/api/sports/tonybet/daily-matches' : '/api/sports/playnow/daily-matches';
                        fetch(endpointDailyMatches, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                dateStr: dateStr,
                                mappings: { [playnowId]: siMatchId }
                            })
                        });
                    } catch (e) { console.error(`Failed to sync ${year} daily matches:`, e); }
                }

                document.body.removeChild(overlay);
                if (typeof this.loadSportsSchedule === 'function') {
                    this.loadSportsSchedule(this.currentSportsYear || 2026);
                }
            } else {
                alert('Please select a match or click Cancel.');
            }
        };
    },

    getPlaynowSiMatchId(match, year, rawHomeTeam, rawAwayTeam) {
        let siMatch = null;
        let manualMatches = {};
        try { manualMatches = JSON.parse(localStorage.getItem(year === 'tonybet' ? 'tonybet_manual_matches' : 'playnow_manual_matches') || '{}'); } catch (e) { }

        let playnowId = year === 'tonybet' ? match.matchId : match.playnowId;
        let dailyMatches = (typeof window.App !== 'undefined' ? (year === 'tonybet' ? window.App.tonybetDailyMatches : window.App.playnowDailyMatches) : {}) || {};

        let findSiMatch = (matches) => {
            if (!matches) return null;
            let knownSiId = playnowId ? dailyMatches[playnowId] : null;

            return matches.find(si => {
                if (knownSiId && knownSiId == (si.siMatchId || si.matchId)) return true;
                if (knownSiId) return false;

                let key = `${si.homeTeam}-${si.awayTeam}`;
                if (manualMatches[key] == match.matchId) return true;
                if (si.matchId == match.matchId) return true;

                let ph = match.homeTeam ? match.homeTeam.replace(/\(N\)/gi, '').toLowerCase().trim() : '';
                let pa = match.awayTeam ? match.awayTeam.replace(/\(N\)/gi, '').toLowerCase().trim() : '';
                let sh = si.homeTeam ? si.homeTeam.replace(/\(N\)/gi, '').toLowerCase().trim() : '';
                let sa = si.awayTeam ? si.awayTeam.replace(/\(N\)/gi, '').toLowerCase().trim() : '';

                if (ph === sh && pa === sa) return true;
                if (ph && sh && (ph.includes(sh) || sh.includes(ph)) && pa && sa && (pa.includes(sa) || sa.includes(pa))) return true;

                return false;
            });
        };

        if (typeof window.App !== 'undefined') siMatch = findSiMatch(window.App.siMatches);
        if (!siMatch && typeof window !== 'undefined') siMatch = findSiMatch(window.siMatches);
        if (!siMatch && typeof this !== 'undefined') siMatch = findSiMatch(this.siMatches);

        if (siMatch) {
            return String(siMatch.matchId || '-');
        }
        return '-';
    },
    
    renderPlaynowSiCrossMatch(match, year, rawHomeTeam, rawAwayTeam) {
        let siMatch = null;
        let manualMatches = {};
        try { manualMatches = JSON.parse(localStorage.getItem(year === 'tonybet' ? 'tonybet_manual_matches' : 'playnow_manual_matches') || '{}'); } catch (e) { }

        let playnowId = year === 'tonybet' ? match.matchId : match.playnowId;
        let dailyMatches = (typeof window.App !== 'undefined' ? (year === 'tonybet' ? window.App.tonybetDailyMatches : window.App.playnowDailyMatches) : {}) || {};

        let findSiMatch = (matches) => {
            if (!matches) return null;
            let knownSiId = playnowId ? dailyMatches[playnowId] : null;

            return matches.find(si => {
                if (knownSiId && knownSiId == (si.siMatchId || si.matchId)) return true;
                if (knownSiId) return false;

                let key = `${si.homeTeam}-${si.awayTeam}`;
                if (manualMatches[key] == match.matchId) return true;
                if (si.matchId == match.matchId) return true;

                let ph = match.homeTeam ? match.homeTeam.replace(/\(N\)/gi, '').toLowerCase().trim() : '';
                let pa = match.awayTeam ? match.awayTeam.replace(/\(N\)/gi, '').toLowerCase().trim() : '';
                let sh = si.homeTeam ? si.homeTeam.replace(/\(N\)/gi, '').toLowerCase().trim() : '';
                let sa = si.awayTeam ? si.awayTeam.replace(/\(N\)/gi, '').toLowerCase().trim() : '';

                if (ph === sh && pa === sa) return true;
                if (ph && sh && (ph.includes(sh) || sh.includes(ph)) && pa && sa && (pa.includes(sa) || sa.includes(pa))) return true;

                return false;
            });
        };

        if (typeof window.App !== 'undefined') siMatch = findSiMatch(window.App.siMatches);
        if (!siMatch && typeof window !== 'undefined') siMatch = findSiMatch(window.siMatches);
        if (!siMatch && typeof this !== 'undefined') siMatch = findSiMatch(this.siMatches);

        let homeTeamArg = String(match.homeTeam || rawHomeTeam || '').replace(/'/g, "\\'");
        let awayTeamArg = String(match.awayTeam || rawAwayTeam || '').replace(/'/g, "\\'");
        let matchIdArg = String(match.matchId || '').replace(/'/g, "\\'");
        let playnowIdArg = String(playnowId || '').replace(/'/g, "\\'");
        let matchBtnHtml = `<button onclick="event.stopPropagation(); window.App.promptPlaynowSIMatchGame('${matchIdArg}', '${homeTeamArg}', '${awayTeamArg}', '${playnowIdArg}', '${year}', '${match.group || ''}')" style="display: inline-block; margin-top: 4px; padding: 2px 6px; font-size: 10px; background: #3b82f6; border: 1px solid #2563eb; border-radius: 4px; color: white; cursor: pointer;">Match SI</button>`;

        if (!siMatch) {
            return matchBtnHtml;
        }
        if (!siMatch.odds || !siMatch.odds.all) {
            return `<span style="color:#d97706; margin-left: 2px; font-size: 10px;">[Linked: Waiting for Odds]</span>`;
        }

        // Cross-match: PlayNow Over ↔ SI Under, PlayNow Under ↔ SI Over
        let crossMatchedSiOdds = [];
        let allSiOdds = siMatch.odds.all;
        
        if (match.odds && match.odds.all) {
            match.odds.all.forEach(pOdd => {
                let pParts = pOdd.split(' ');
                if (pParts.length < 3) return;
                let pDir = pParts[0].toUpperCase(); // O or U (or Over/Under)
                let pTarget = pParts[1]; // e.g. "4.5"
                
                // Determine the opposite direction to look for in SI
                let isOver = (pDir === 'O' || pDir === 'OVER');
                let oppositeDir = isOver ? 'U' : 'O';
                let oppositeDirLong = isOver ? 'Under' : 'Over';
                
                let tStr = String(pTarget).replace('.', '\\.');
                let siRegex = new RegExp('(?:' + oppositeDirLong + '|' + oppositeDir + ')\\s*' + tStr + '\\s*([\\d\\.]+)', 'i');
                
                let matchedOdds = null;
                allSiOdds.forEach(sOdd => {
                    let m = sOdd.match(siRegex);
                    if (m && m[1]) matchedOdds = m[1];
                });
                
                if (matchedOdds) {
                    crossMatchedSiOdds.push(oppositeDir + ' ' + pTarget + ' ' + matchedOdds);
                } else {
                    crossMatchedSiOdds.push('-');
                }
            });
        }

        return crossMatchedSiOdds.length > 0 ? crossMatchedSiOdds.map(odd => odd === '-' ? `<div style="padding: 4px; border: 1px solid #e2e8f0; border-radius: 4px; margin-bottom: 4px; background: #f8fafc; font-size: 0.85em; font-weight: 500; color: #94a3b8;">-</div>` : `<div style="padding: 4px; border: 1px solid #e2e8f0; border-radius: 4px; margin-bottom: 4px; background: #eff6ff; font-size: 0.85em; font-weight: 500; color: #1d4ed8;">${odd}</div>`).join('') : matchBtnHtml;
    }
};
