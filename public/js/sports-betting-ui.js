/**
 * sports-playnow.js
 * Integration mixin for PlayNow betting, profile balances, and odds mapping.
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
        const btnId = `bet-btn-${isOver ? 'o' : 'u'}-${homeTeam.replace(/\s+/g, '-')}-${awayTeam.replace(/\s+/g, '-')}-${targetGoals}`;
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

            let url = '/api/playnow/odds/latest';
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
                    let rh = ref.homeTeam ? ref.homeTeam.replace(/\(N\)/gi, '').replace(/['\\]/g, '').trim().toLowerCase() : '';
                    let ra = ref.awayTeam ? ref.awayTeam.replace(/\(N\)/gi, '').replace(/['\\]/g, '').trim().toLowerCase() : '';
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
            const dateStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
            const res = await fetch(`/sports/playnow/${dateStr}/live_games_playnow.json?v=` + Date.now());
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

    renderBetButtons(match, i, maxGoalCols, c, year, effectiveTab) {
        let rawHomeTeam = match.homeTeam || (match.title && match.title.split(' VS ')[0]) || '';
        let rawAwayTeam = match.awayTeam || (match.title && match.title.split(' VS ')[1]) || '';

        // Only show for match that is not finished
        const s = (match.status || '').toLowerCase();
        const isFinished = s === 'ft' || s === 'finished';

        if (rawHomeTeam && rawAwayTeam && !isFinished) {
            const hp = rawHomeTeam.replace(/'/g, "\\'");
            const ap = rawAwayTeam.replace(/'/g, "\\'");
            const rawHomeCls = rawHomeTeam.replace(/\s+/g, '-');
            const rawAwayCls = rawAwayTeam.replace(/\s+/g, '-');
            const lineTarget = i + 0.5;
            let oTxt = 'O';
            let uTxt = 'U';

            let targetOdds = effectiveTab === '1ht' ? match.odds1H : (effectiveTab === '2ht' ? match.odds2H : match.odds);

            if ((year === 'sportsinteraction' || year === 'playnow') && targetOdds && targetOdds.all) {
                let oRegex = new RegExp(`(?:Over|O)\\s*${lineTarget}\\s*([\\d\\.]+)`, 'i');
                let uRegex = new RegExp(`(?:Under|U)\\s*${lineTarget}\\s*([\\d\\.]+)`, 'i');

                let oMatchStr = targetOdds.all.find(o => oRegex.test(o));
                let uMatchStr = targetOdds.all.find(o => uRegex.test(o));

                if (oMatchStr) {
                    let m = oMatchStr.match(oRegex);
                    if (m && m[1]) oTxt = m[1];
                }
                if (uMatchStr) {
                    let m = uMatchStr.match(uRegex);
                    if (m && m[1]) uTxt = m[1];
                }
            }

            return `<td style="padding: 2px; text-align: center;">
                <div style="display: flex; flex-direction: column; gap: 4px; align-items: center; justify-content: center; height: 100%;">
                    <button data-home="${rawHomeTeam}" data-away="${rawAwayTeam}" id="bet-btn-o-${rawHomeCls}-${rawAwayCls}-${lineTarget}" onclick="event.stopPropagation(); window.App.placePlaynowBet('${hp}', '${ap}', ${lineTarget}, true, '${oTxt}', '${uTxt}');" style="padding: 2px 4px; font-size: 10px; background: #3b82f6; border: 1px solid #2563eb; border-radius: 4px; color: white; cursor: pointer; line-height: 1; width: 100%;">${oTxt}</button>
                    <button data-home="${rawHomeTeam}" data-away="${rawAwayTeam}" id="bet-btn-u-${rawHomeCls}-${rawAwayCls}-${lineTarget}" onclick="event.stopPropagation(); window.App.placePlaynowBet('${hp}', '${ap}', ${lineTarget}, false, '${oTxt}', '${uTxt}');" style="padding: 2px 4px; font-size: 10px; background: #f59e0b; border: 1px solid #d97706; border-radius: 4px; color: white; cursor: pointer; line-height: 1; width: 100%;">${uTxt}</button>
                </div>
            </td>`;
        }
        return `<td style="padding: 12px 8px; text-align: center; color: ${c !== '-' ? '#3b82f6' : '#94a3b8'}; font-weight: ${c !== '-' ? 'bold' : 'normal'};">${c}</td>`;
    }
};
