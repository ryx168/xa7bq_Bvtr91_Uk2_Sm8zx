/**
 * sports-sportsinteraction.js
 * Integration mixin for Sports Interaction (SI) matches, manual matching, mapping, and live polling.
 */

import { distance } from './sports-utils.js';

export const SportsMixin = {
    // =========================================================================
    // STATE
    // =========================================================================
    siMatches: [],
    currentSiCountry: 'ALL',

    // =========================================================================
    // METHODS
    // =========================================================================
    filterAndMapSiMatches(liveRefsAll) {
        const now = new Date();
        const todayStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
        const yesterday = new Date(now.getTime() - 86400000);
        const yesterdayStr = yesterday.getFullYear() + '-' + String(yesterday.getMonth() + 1).padStart(2, '0') + '-' + String(yesterday.getDate()).padStart(2, '0');
        const daysAgo2 = new Date(now.getTime() - 2 * 86400000);
        const daysAgo2Str = daysAgo2.getFullYear() + '-' + String(daysAgo2.getMonth() + 1).padStart(2, '0') + '-' + String(daysAgo2.getDate()).padStart(2, '0');
        const targetDates = [todayStr, yesterdayStr, daysAgo2Str];

        let filteredMatches = this.siMatches || [];

        filteredMatches = filteredMatches.filter(m => {
            if (m.isFifa) return true;
            if (m.date && targetDates.includes(m.date)) return true;
            return false;
        });

        // Map local data from 7m onto sports interaction matches
        filteredMatches.forEach(si => {
            if (!si.siMatchId) si.siMatchId = si.matchId; // Preserve original SI ID

            let teamMap = JSON.parse(localStorage.getItem('si_team_map') || '{}');
            let leagueMap = JSON.parse(localStorage.getItem('si_league_map') || '{}');
            let manualMatches = JSON.parse(localStorage.getItem('si_manual_matches') || '{}');

            const hardcodedTeamMap = {
                "DR Congo": "Democratic Rep Congo",
                "South Korea": "Korea Republic",
                "Ivory Coast": "Cote d\\Ivoire",
                "Cote d'Ivoire": "Cote d\\Ivoire",
                "USA": "United States",
                "Turkiye": "Turkey"
            };

            let refHome = teamMap[si.homeTeam] || hardcodedTeamMap[si.homeTeam] || si.homeTeam;
            let refAway = teamMap[si.awayTeam] || hardcodedTeamMap[si.awayTeam] || si.awayTeam;

            let key = `${si.homeTeam}-${si.awayTeam}`;
            if (manualMatches[key]) {
                si.matchId = manualMatches[key];
                let refGame = liveRefsAll.find(r => r.matchId == si.matchId);
                if (refGame) {
                    if (refGame.group) si.group = refGame.group;
                    if (refGame.time) si.time = refGame.time;
                    if (refGame.goals) si.goals = refGame.goals;
                    if (refGame.date) si.date = refGame.date;
                }
            } else {
                let refGame = liveRefsAll.find(ref => {
                    let rh = ref.homeTeam ? ref.homeTeam.replace(/\(N\)/gi, '').replace(/['\\]/g, '').trim().toLowerCase() : '';
                    let ra = ref.awayTeam ? ref.awayTeam.replace(/\(N\)/gi, '').replace(/['\\]/g, '').trim().toLowerCase() : '';
                    let sh = refHome.toLowerCase().trim();
                    let sa = refAway.toLowerCase().trim();

                    if (rh === sh && ra === sa) return true;

                    let distH = distance(rh, sh);
                    let distA = distance(ra, sa);
                    if (distH <= 2 && distA <= 2) return true;

                    return false;
                });
                if (refGame) {
                    si.matchId = refGame.matchId;
                    if (refGame.group) si.group = refGame.group;
                    if (refGame.time) si.time = refGame.time;
                    if (refGame.goals) si.goals = refGame.goals;
                    if (refGame.date) si.date = refGame.date;
                } else {
                    si.isUnmatched = true;
                }
            }
        });

        this.currentSiCountry = this.currentSiCountry || 'ALL';

        let countries = ['ALL'];
        (this.siMatches || []).forEach(m => {
            if (m.country && !countries.includes(m.country)) countries.push(m.country);
        });
        countries.sort();

        let tabsHtml = `<button class="btn btn-sm ${this.currentSiCountry === 'ALL' ? 'btn-primary' : 'btn-outline-primary'}" onclick="window.App.currentSiCountry = 'ALL'; window.App.loadSportsSchedule('sportsinteraction');">ALL</button>`;
        countries.forEach(c => {
            if (c !== 'ALL') {
                tabsHtml += `<button class="btn btn-sm ${this.currentSiCountry === c ? 'btn-primary' : 'btn-outline-primary'}" onclick="window.App.currentSiCountry = '${c.replace(/'/g, "\\'")}'; window.App.loadSportsSchedule('sportsinteraction');">${c}</button>`;
            }
        });

        const countryTabs = document.getElementById('si-country-tabs');
        if (countryTabs) {
            countryTabs.innerHTML = tabsHtml;
            countryTabs.style.display = 'flex';
        }

        if (this.currentSiCountry && this.currentSiCountry !== 'ALL') {
            filteredMatches = filteredMatches.filter(m => m.country === this.currentSiCountry || m.isFifa);
        }

        return filteredMatches;
    },

    async pollSiLiveGames() {
        try {
            let siRes = await fetch('http://localhost:3001/api/sportsinteraction/live-games');
            if (siRes.ok) {
                const newGames = await siRes.json();
                if (!this.siMatches || this.siMatches.length === 0 && newGames.length > 0) {
                    this.siMatches = newGames;
                    if (typeof this.loadSportsSchedule === 'function') {
                        this.loadSportsSchedule('sportsinteraction');
                    }
                } else {
                    this.siMatches = newGames;
                    newGames.forEach(g => {
                        if (!g.homeTeam || !g.awayTeam) return;

                        const h = g.homeTeam.replace(/"/g, '&quot;');
                        const a = g.awayTeam.replace(/"/g, '&quot;');

                        let displayStatus = g.status;
                        let displayTime = g.time === 'LIVE' ? '' : g.time;
                        let displayScore = g.score;

                        if (window.App && window.App.liveRefsAll) {
                            // Find matched 7m match using mapped si.matchId
                            const mappedSi = this.siMatches.find(si => si.siMatchId === g.matchId || si.homeTeam === g.homeTeam);
                            const targetMatchId = mappedSi ? mappedSi.matchId : g.matchId;

                            const liveMatch = window.App.liveRefsAll.find(m => m.matchId == targetMatchId);
                            if (liveMatch) {
                                if (liveMatch.status) displayStatus = liveMatch.status;
                                if (liveMatch.time) displayTime = liveMatch.time;
                                if (liveMatch.score && liveMatch.score !== 'VS') displayScore = liveMatch.score;

                                // update goal times from 7m
                                if (liveMatch.goals) {
                                    g._liveMatchGoals = liveMatch.goals;
                                }
                            }
                        }
                        const statusCells = document.querySelectorAll(`.live-match-status[data-si-home="${h}"][data-si-away="${a}"]`);
                        statusCells.forEach(c => {
                            if (displayStatus) c.innerHTML = displayStatus === 'FT' ? `<span style="color: #64748b;">FT</span>` : `<span style="color: #ef4444;">${displayStatus}</span>`;
                        });

                        const timeCells = document.querySelectorAll(`.live-match-time[data-si-home="${h}"][data-si-away="${a}"]`);
                        timeCells.forEach(c => {
                            if (displayTime) {
                                c.innerHTML = displayTime;
                            }
                        });

                        const scoreCells = document.querySelectorAll(`.live-match-score[data-si-home="${h}"][data-si-away="${a}"]`);
                        scoreCells.forEach(c => {
                            if (displayScore) {
                                const scoreEl = c.querySelector('.score-text');
                                if (scoreEl) {
                                    scoreEl.innerHTML = displayScore;
                                }
                            }
                        });

                        if (g._liveMatchGoals) {
                            const matchAllGoalTimes = g._liveMatchGoals.filter(goal => goal).join('<br>').split('<br>').filter(goal => goal.trim()).map(goal => window.App.formatGoal ? window.App.formatGoal(goal) : goal).join('<br>');
                            const goalTimeCells = document.querySelectorAll(`.live-match-goal-time[data-si-home="${h}"][data-si-away="${a}"]`);
                            goalTimeCells.forEach(c => {
                                c.innerHTML = matchAllGoalTimes;
                            });
                        }
                    });
                }
            }
        } catch (e) { }
    },

    async toggleSiMatchDetails(searchId, date, homeTeam, awayTeam, targetMatchId, isRetry = false) {
        try {
            const now = new Date();
            const todayStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
            const ydStr = new Date(now.getTime() - 86400000).toISOString().split('T')[0];
            const d2Str = new Date(now.getTime() - 2 * 86400000).toISOString().split('T')[0];

            const datesToTry = [...new Set([date, todayStr, ydStr, d2Str])];
            let res = null;

            for (const d of datesToTry) {
                if (!d) continue;
                res = await fetch(`/sports/sportsinteraction/${d}/${searchId}.json?v=` + Date.now());
                if (res.ok) break;
            }

            if (res && res.ok) {
                const data = await res.json();

                const matchRow = document.getElementById(`live-match-row-${targetMatchId}`);
                if (!matchRow) return;

                // Dynamically update the O/U buttons in the main row
                if (data.odds && data.odds.all) {
                    const rawHomeCls = homeTeam.replace(/\s+/g, '-');
                    const rawAwayCls = awayTeam.replace(/\s+/g, '-');

                    data.odds.all.forEach(oMatchStr => {
                        let lineMatch = oMatchStr.match(/(?:Over|Under|O|U)\s*([\d\.]+)\s*([\d\.]+)/i);
                        if (lineMatch && lineMatch[1] && lineMatch[2]) {
                            let lineTarget = lineMatch[1];
                            let price = lineMatch[2];
                            let isOver = /Over|O\s/i.test(oMatchStr);
                            let typeStr = isOver ? 'o' : 'u';

                            let btnId = `bet-btn-${typeStr}-${rawHomeCls}-${rawAwayCls}-${lineTarget}`;
                            let btn = document.getElementById(btnId);
                            if (btn) btn.innerText = price;
                        }
                    });
                }

                // We no longer inject a bulky dropdown row. The odds are now populated seamlessly
                // directly into the main row's 1HT, 2HT, and FT goal columns!
            } else {
                console.warn(`[toggleSiMatchDetails] Could not load SI detail JSON: ${res.status}`);
            }
        } catch (e) {
            console.error('[toggleSiMatchDetails] Error:', e);
        }
    },

    promptMatchGame(homeTeam, awayTeam, group) {
        if (!this.liveRefsAll || this.liveRefsAll.length === 0) {
            alert("7m games not loaded yet. Please wait or refresh.");
            return;
        }

        const matchedIds = (this.siMatches || []).map(m => m.matchId).filter(id => id);
        const unmatched = this.liveRefsAll.filter(ref => {
            if (matchedIds.includes(ref.matchId)) return false;
            if (ref.isFifa) return true;
            const s = (ref.status || '').toLowerCase();
            if (!s || s === 'ft' || s === 'finished' || s === '0' || s === 'delayed' || s === 'tbd') return false;
            if (s.includes(':')) return false;
            const isLive = s.includes('h') || s.includes("'") || s.includes('live') || /^\d+$/.test(s);
            if (!isLive) return false;
            return true;
        });

        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.top = '0'; overlay.style.left = '0'; overlay.style.width = '100vw'; overlay.style.height = '100vh';
        overlay.style.backgroundColor = 'rgba(0,0,0,0.5)';
        overlay.style.zIndex = '9999';
        overlay.style.display = 'flex'; overlay.style.alignItems = 'center'; overlay.style.justifyContent = 'center';

        const modal = document.createElement('div');
        modal.style.background = 'white'; modal.style.padding = '20px'; modal.style.borderRadius = '8px';
        modal.style.width = '500px'; modal.style.maxWidth = '90vw';

        let html = `<h3 style="margin-top:0; font-size: 16px;">Match: ${homeTeam} vs ${awayTeam}</h3>`;
        html += `<p style="font-size:12px; color:#666;">Select a live 7m game from the unmatched games below:</p>`;
        html += `<select id="si-match-select" style="width:100%; padding:8px; margin-bottom:15px; border:1px solid #ccc; border-radius:4px; max-height:200px; overflow-y:auto;">`;
        html += `<option value="">-- Select a live match --</option>`;

        unmatched.forEach(ref => {
            const league = ref.group ? `${ref.group} | ` : '';
            const score = ref.score ? ` ${ref.score} ` : ' vs ';
            html += `<option value="${ref.matchId}">${league}${ref.time || ''} | ${ref.status || 'Live'} | ${ref.homeTeam}${score}${ref.awayTeam}</option>`;
        });

        html += `</select>`;
        html += `<div style="display:flex; justify-content:flex-end; gap:10px;">
            <button id="si-match-cancel" style="padding:6px 12px; border:1px solid #ccc; background:#fff; border-radius:4px; cursor:pointer;">Cancel</button>
            <button id="si-match-save" style="padding:6px 12px; border:none; background:#3b82f6; color:#fff; border-radius:4px; cursor:pointer;">Save</button>
        </div>`;

        modal.innerHTML = html;
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        document.getElementById('si-match-cancel').onclick = () => {
            document.body.removeChild(overlay);
        };

        document.getElementById('si-match-save').onclick = () => {
            const select = document.getElementById('si-match-select');
            if (select.value) {
                const manualMatches = JSON.parse(localStorage.getItem('si_manual_matches') || '{}');
                manualMatches[`${homeTeam}-${awayTeam}`] = select.value;
                localStorage.setItem('si_manual_matches', JSON.stringify(manualMatches));

                // Extract the 7m match details for translation maps
                const selectedMatch = this.liveRefsAll.find(m => m.matchId === select.value);
                if (selectedMatch) {
                    const teamMap = JSON.parse(localStorage.getItem('si_team_map') || '{}');
                    teamMap[homeTeam] = selectedMatch.homeTeam;
                    teamMap[awayTeam] = selectedMatch.awayTeam;
                    localStorage.setItem('si_team_map', JSON.stringify(teamMap));

                    if (group && selectedMatch.group) {
                        const leagueMap = JSON.parse(localStorage.getItem('si_league_map') || '{}');
                        leagueMap[group] = selectedMatch.group;
                        localStorage.setItem('si_league_map', JSON.stringify(leagueMap));
                    }
                }

                try {
                    fetch('/api/sports/mappings', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            manualMatches: JSON.parse(localStorage.getItem('si_manual_matches') || '{}'),
                            teamMap: JSON.parse(localStorage.getItem('si_team_map') || '{}'),
                            leagueMap: JSON.parse(localStorage.getItem('si_league_map') || '{}')
                        })
                    });
                } catch (e) { console.error('Failed to sync SI mappings:', e); }

                document.body.removeChild(overlay);
                if (typeof this.loadSportsSchedule === 'function') {
                    this.loadSportsSchedule(this.currentSportsYear || 2026);
                }
            } else {
                alert('Please select a match or click Cancel.');
            }
        };
    },

    promptPlaynowSIMatchGame(matchId, homeTeam, awayTeam, playnowId, year) {
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
            html += `<option value="${si.homeTeam}|||${si.awayTeam}|||${si.siMatchId || si.matchId}">${league}${si.time || ''} | ${si.status || 'Live'} | ${si.homeTeam}${score}${si.awayTeam}</option>`;
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
                            siAway: siAway
                        })
                    });
                } catch (e) { console.error('Failed to link in SQL:', e); }

                document.body.removeChild(overlay);
                if (typeof this.loadSportsSchedule === 'function') {
                    this.loadSportsSchedule(this.currentSportsYear || 2026);
                }
            } else {
                alert('Please select a match or click Cancel.');
            }
        };
    }
};
