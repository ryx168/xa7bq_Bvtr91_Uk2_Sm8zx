/**
 * sports-schedule.js
 * Core schedule loading, active polling interval orchestration, analysis tabs, and map routes.
 */

import { formatGoal } from './sports-utils.js';

export const SportsMixin = {
    // =========================================================================
    // STATE
    // =========================================================================
    currentSportsYear: 2026,
    liveRefsAll: [],
    expandedMatchRefs: {},
    activeMatchAutoOpened: false,
    targetAutoOpenMatch: null,
    targetScrollDate: null,

    // =========================================================================
    // METHODS
    // =========================================================================

    handleLeagueChange() {
        const l = document.getElementById('league-selector').value;
        if (l === 'FIFA') {
            window.location.hash = '#sports/FIFA-2026-World-Cup';
        } else {
            if (window.LEAGUE_CATALOG && window.LEAGUE_CATALOG[l] && window.LEAGUE_CATALOG[l].seasons.length > 0) {
                const s = window.LEAGUE_CATALOG[l].seasons[0];
                window.location.hash = `#sports/league/${l}/${s}`;
            }
        }
    },

    handleSeasonChange() {
        const l = document.getElementById('league-selector').value;
        const s = document.getElementById('season-selector').value;
        if (l === 'FIFA') {
            if (s === '2026') window.location.hash = '#sports/FIFA-2026-World-Cup';
            else window.location.hash = `#sports/FIFA-${s}-World-Cup`;
        } else {
            window.location.hash = `#sports/league/${l}/${s}`;
        }
    },

    scrollToCurrentSports() {
        const now = new Date();
        const todayStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
        const targetDate = this.targetScrollDate || todayStr;

        let domMatchId = null;
        let el = document.getElementById(`date-header-${targetDate}`);

        if (el) {
            let next = el.nextElementSibling;
            while (next) {
                if (next.id && next.id.startsWith('live-match-row-')) {
                    domMatchId = next.id.replace('live-match-row-', '');
                    break;
                }
                if (next.id && next.id.startsWith('date-header-')) {
                    break;
                }
                next = next.nextElementSibling;
            }
        }

        if (domMatchId && window.scrollToMatch) {
            window.scrollToMatch(domMatchId);
        } else if (el) {
            const leftCol = document.getElementById('game-list-left-column');
            if (leftCol && leftCol.contains(el)) {
                el.style.scrollMarginTop = '20px';
                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } else {
                el.style.scrollMarginTop = '0px';
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }

        if (targetDate) {
            setTimeout(() => {
                const tlEl = document.getElementById(`timeline-row-${targetDate}`);
                if (tlEl) {
                    tlEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                }
            }, 100);
        }
    },

    setAnalysisTab(tabName) {
        window.activeAnalysisTab = tabName;
        const tabs = ['goalTime', 'total', '1ht', '2ht', 'draw'];
        tabs.forEach(t => {
            const btn = document.getElementById(`btn-analysis-${t}`);
            if (btn) {
                btn.className = t === tabName ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-outline-primary';
            }
        });
        this.loadSportsSchedule(this.currentSportsYear || 2026);
    },

    async loadCityRoutes() {
        if (this._cityRoutesCache) return this._cityRoutesCache;
        try {
            const res = await fetch(`/api/locations/cities?t=${Date.now()}`);
            if (res.ok) {
                this._cityRoutesCache = await res.json();
                return this._cityRoutesCache;
            }
        } catch (err) {
            console.warn('Failed to load city routes from API:', err);
        }
        return {};
    },

    isCityRoute(taskName) {
        return taskName.toLowerCase() in (this._cityRoutesCache || {});
    },

    getCityRoute(cityName) {
        return (this._cityRoutesCache || {})[cityName.toLowerCase()] || null;
    },

    async triggerScreenshot(url, slug, leadId) {
        try {
            const res = await fetch('/api/screenshot', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url, slug, leadId })
            });
            const data = await res.json();
            if (data.success) {
                console.log(data.message);
                setTimeout(() => {
                    alert('Screenshot capture initiated. Refresh the page in 5 seconds to see the new image.');
                }, 500);
            } else {
                alert('Screenshot failed: ' + data.error);
            }
        } catch (err) {
            console.error(err);
            alert('Screenshot failed: ' + err.message);
        }
    },

    async fetchMatchGoals(matchId, btn) {
        if (btn) {
            btn.innerText = 'Fetching...';
            btn.disabled = true;
        }
        try {
            const res = await fetch(`/api/fetch-match-goals/${matchId}`);
            const data = await res.json();
            if (data.success && data.hasGoals) {
                if (btn) btn.innerText = 'Done!';
                if (window.App && typeof window.App.loadSportsSchedule === 'function') {
                    // Update liveRefsAll if it exists to cache the new goals
                    if (window.App.liveRefsAll) {
                        const targetMatch = window.App.liveRefsAll.find(m => String(m.matchId) === String(matchId));
                        if (targetMatch) {
                            targetMatch.goals = data.goals;
                        }
                    }
                    setTimeout(() => window.App.loadSportsSchedule(window.App.currentSportsYear), 500);
                }
            } else {
                if (btn) btn.innerText = 'No Goals';
            }
        } catch (err) {
            console.error(err);
            if (btn) btn.innerText = 'Error';
        }
    },

    async fetchSofascoreGoals(matchId, date, homeTeam, awayTeam, score, btn) {
        const modalHtml = `
            <div id="sofa-modal" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;">
                <div style="background:white;padding:20px;border-radius:8px;width:90%;max-width:700px;box-shadow:0 10px 25px rgba(0,0,0,0.2);">
                    <h3 style="margin-top:0;color:#333;">Paste Sofascore URL or Raw HTML</h3>
                    <p style="font-size:13px;color:#666;margin-bottom:15px;">Paste the match URL. If goals aren't loading, inspect the Sofascore page and paste the raw DOM HTML containing the goals section here.</p>
                    <textarea id="sofa-input" style="width:100%;height:250px;margin-bottom:15px;padding:10px;border:1px solid #ccc;border-radius:4px;font-family:monospace;" placeholder="https://www.sofascore.com/... OR <div class='...'>"></textarea>
                    <div style="text-align:right;">
                        <button id="sofa-cancel" class="btn btn-outline-secondary" style="margin-right:10px;">Cancel</button>
                        <button id="sofa-submit" class="btn btn-primary">Submit</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        const result = await new Promise((resolve) => {
            document.getElementById('sofa-cancel').onclick = () => {
                document.getElementById('sofa-modal').remove();
                resolve(null);
            };
            document.getElementById('sofa-submit').onclick = () => {
                const val = document.getElementById('sofa-input').value;
                document.getElementById('sofa-modal').remove();
                resolve(val);
            };
        });

        if (!result) return;

        const input = result.trim();
        const isUrl = input.startsWith('http');
        if (!isUrl && !input.includes('<')) {
            alert('Invalid input. Must be a URL or raw HTML.');
            return;
        }

        if (btn) {
            btn.innerText = 'Scraping...';
            btn.disabled = true;
        }
        try {
            const payload = { matchId, date };
            if (isUrl) {
                payload.url = input;
            } else {
                payload.html = input;
            }

            const res = await fetch('/api/fetch-sofascore-goals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.success && data.hasGoals) {
                if (btn) btn.innerText = 'Done!';
                if (window.App && typeof window.App.loadSportsSchedule === 'function') {
                    if (window.App.liveRefsAll) {
                        const targetMatch = window.App.liveRefsAll.find(m => String(m.matchId) === String(matchId));
                        if (targetMatch) targetMatch.goals = data.goals;
                    }
                    if (window.App.fifaHistoryDatasets) {
                        window.App.fifaHistoryDatasets.forEach(ds => {
                            if (ds.data) {
                                const targetMatch = ds.data.find(m => String(m.matchId) === String(matchId));
                                if (targetMatch) targetMatch.goals = data.goals;
                            }
                        });
                    }
                    if (window.App.leaguesCache) {
                        Object.values(window.App.leaguesCache).forEach(leagueData => {
                            if (Array.isArray(leagueData)) {
                                const targetMatch = leagueData.find(m => String(m.matchId) === String(matchId));
                                if (targetMatch) targetMatch.goals = data.goals;
                            }
                        });
                    }
                    setTimeout(() => window.App.loadSportsSchedule(window.App.currentSportsYear), 500);
                }
            } else {
                if (btn) btn.innerText = 'Failed';
                alert(data.error || 'No goals found');
            }
        } catch (err) {
            console.error(err);
            if (btn) btn.innerText = 'Error';
        }
    },

    async fetch7mGoals(matchId, date, homeTeam, awayTeam, score, btn) {
        if (btn) {
            btn.innerText = 'Fetching...';
            btn.disabled = true;
        }
        try {
            const res = await fetch(`/api/fetch-match-goals/${matchId}?date=${date}`);
            const data = await res.json();
            if (data.success && data.hasGoals) {
                if (btn) btn.innerText = 'Done!';
                if (window.App && typeof window.App.loadSportsSchedule === 'function') {
                    if (window.App.liveRefsAll) {
                        const targetMatch = window.App.liveRefsAll.find(m => String(m.matchId) === String(matchId));
                        if (targetMatch) targetMatch.goals = data.goals;
                    }
                    if (window.App.fifaHistoryDatasets) {
                        window.App.fifaHistoryDatasets.forEach(ds => {
                            if (ds.data) {
                                const targetMatch = ds.data.find(m => String(m.matchId) === String(matchId));
                                if (targetMatch) targetMatch.goals = data.goals;
                            }
                        });
                    }
                    if (window.App.leaguesCache) {
                        Object.values(window.App.leaguesCache).forEach(leagueData => {
                            if (Array.isArray(leagueData)) {
                                const targetMatch = leagueData.find(m => String(m.matchId) === String(matchId));
                                if (targetMatch) targetMatch.goals = data.goals;
                            }
                        });
                    }
                    setTimeout(() => window.App.loadSportsSchedule(window.App.currentSportsYear), 500);
                }
            } else {
                if (btn) {
                    btn.innerText = 'No Goals';
                    btn.disabled = false;
                }
                alert(data.error || 'No goals found on 7msport for this match.');
            }
        } catch (err) {
            console.error(err);
            if (btn) {
                btn.innerText = 'Error';
                btn.disabled = false;
            }
        }
    },

    async loadSportsSchedule(year = 2026, leagueId = null) {
        if (!leagueId && window._currentLeagueId) {
            leagueId = window._currentLeagueId;
        }

        if (year === 'current' && leagueId && window.LEAGUE_CATALOG && window.LEAGUE_CATALOG[leagueId]) {
            year = window.LEAGUE_CATALOG[leagueId].seasons[0];
        }

        this.currentSportsYear = year;
        if (window.liveGameIntervalId) {
            clearInterval(window.liveGameIntervalId);
        }
        const tbody = document.getElementById('sports-table-body');
        if (!tbody) return;

        const playnowContainer = document.getElementById('playnow-profile-container');
        if (playnowContainer) {
            if (year === 'playnow') {
                playnowContainer.classList.remove('hidden');
                this.fetchPlaynowProfile();
            } else {
                playnowContainer.classList.add('hidden');
            }
        }
        const wcSelector = document.getElementById('world-cup-selector');
        const btnLive = document.getElementById('btn-sports-live');
        const btnPlaynow = document.getElementById('btn-sports-playnow');
        const btnSI = document.getElementById('btn-sports-sportsinteraction');
        const btnTonybet = document.getElementById('btn-sports-tonybet');

        const leagueSelector = document.getElementById('league-selector');
        const seasonSelector = document.getElementById('season-selector');

        if (leagueSelector && seasonSelector) {
            // Populate leagues if not populated
            if (leagueSelector.options.length <= 1 && window.LEAGUE_CATALOG) {
                Object.keys(window.LEAGUE_CATALOG).forEach(k => {
                    const opt = document.createElement('option');
                    opt.value = k;
                    opt.text = window.LEAGUE_CATALOG[k].name;
                    leagueSelector.appendChild(opt);
                });
            }

            const activeLeague = leagueId || 'FIFA';
            leagueSelector.value = activeLeague;

            // Populate seasons based on league
            seasonSelector.innerHTML = '';
            if (activeLeague === 'FIFA') {
                ['2026', '2022', '2018', '2014', '2010', '2006'].forEach(y => {
                    const opt = document.createElement('option');
                    opt.value = y;
                    opt.text = y + ' World Cup';
                    seasonSelector.appendChild(opt);
                });
            } else if (window.LEAGUE_CATALOG && window.LEAGUE_CATALOG[activeLeague]) {
                window.LEAGUE_CATALOG[activeLeague].seasons.forEach(s => {
                    const opt = document.createElement('option');
                    opt.value = s;
                    opt.text = s;
                    seasonSelector.appendChild(opt);
                });
            }
            if (year && (typeof year === 'number' || typeof year === 'string') && year !== 'live' && year !== 'playnow' && year !== 'sportsinteraction' && year !== 'tonybet') {
                seasonSelector.value = year.toString();
            }
        }

        if (btnLive) {
            btnLive.className = year === 'live' ? 'btn btn-danger' : 'btn btn-outline-danger';
            if (btnPlaynow) {
                btnPlaynow.className = year === 'playnow' ? 'btn btn-success' : 'btn btn-outline-success';
            }
            if (btnSI) btnSI.className = year === 'sportsinteraction' ? 'btn btn-info text-white' : 'btn btn-outline-info';
            if (btnTonybet) btnTonybet.className = year === 'tonybet' ? 'btn btn-warning text-white' : 'btn btn-outline-warning';
        }

        let displayTitle = year === 'reference' ? 'All Reference Games' : `${year} FIFA Schedule`;
        if (year === 'last_game') displayTitle = 'Last Game Every Day';
        if (leagueId && leagueId !== 'FIFA' && window.LEAGUE_CATALOG && window.LEAGUE_CATALOG[leagueId]) {
            let labelYear = year;
            if (year === 'live') labelYear = 'Live';
            if (year === 'playnow') labelYear = 'PlayNow';
            displayTitle = `${window.LEAGUE_CATALOG[leagueId].name} (${labelYear})`;
        } else {
            if (year === 'live') displayTitle = 'Today Games';
            if (year === 'playnow') displayTitle = 'PlayNow Games';
            if (year === 'sportsinteraction') displayTitle = 'Sports Interaction';
            if (year === 'tonybet') displayTitle = 'Tonybet Live Soccer';
        }

        document.getElementById('sports-title').innerHTML = `<i class="fas fa-futbol" style="margin-right: 10px; color: #007bff;"></i>${displayTitle}`;

        const tabsContainer = document.getElementById('analysis-tabs-container');
        if (tabsContainer) {
            tabsContainer.style.display = (year === 2026 || year === 'sportsinteraction') ? 'flex' : 'none';
        }

        const calendarContainer = document.getElementById('last-game-calendar-container');
        if (calendarContainer) {
            const isLeagueOrFifa = window.location.hash === '#sports' || window.location.hash.startsWith('#sports?') || window.location.hash.startsWith('#sports/league/') || window.location.hash.startsWith('#sports/FIFA-') || window.location.hash.startsWith('#sports/2026-FIFA');
            const isSingleMatchView = window.location.hash.includes('_id_');
            if (year === 'last_game' || year === 2026 || year === '2026' || isLeagueOrFifa || isSingleMatchView) {
                calendarContainer.style.display = 'block';
                calendarContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: #64748b;">Loading calendar and tracking timeline...</div>';
            } else {
                calendarContainer.style.display = 'none';
                calendarContainer.innerHTML = '';
            }
        }

        window.activeAnalysisTab = window.activeAnalysisTab || 'total';
        let numCols = 8;
        let offset = 7;
        let maxGoalCols = 6;
        if (window.activeAnalysisTab === 'total' || window.activeAnalysisTab === '1ht' || window.activeAnalysisTab === '2ht') {
            maxGoalCols = window._sportsGoalColMax !== undefined ? window._sportsGoalColMax : 6;
            offset = maxGoalCols + 1;
            numCols = offset + 6;
        }
        if (window.activeAnalysisTab === 'draw') numCols = 3;

        let colOrder = [];
        if (window.activeAnalysisTab === 'total' || window.activeAnalysisTab === '1ht' || window.activeAnalysisTab === '2ht') {
            if (year === 'playnow' || year === 'tonybet') {
                // No extra columns for PlayNow
            } else {
                colOrder.push(offset + 4);
                colOrder.push(offset + 5);
                for (let i = offset; i < offset + 4; i++) colOrder.push(i);
                for (let i = 0; i <= maxGoalCols; i++) colOrder.push(i);
            }
        } else {
            for (let i = 0; i < numCols; i++) colOrder.push(i);
        }
        const thead = document.getElementById('sports-table-head');
        if (thead) {
            let colsHtml = '';
            if (window.activeAnalysisTab === 'total' || window.activeAnalysisTab === '1ht' || window.activeAnalysisTab === '2ht') {
                if (year === 'playnow' || year === 'tonybet') {
                    colsHtml = `
                        <th style="padding: 12px 16px; border-bottom: 2px solid #e2e8f0; text-align: left; font-weight: 600; color: #475569; width: 140px;">${year === 'tonybet' ? 'Tonybet' : 'PlayNow'}</th>
                        <th style="padding: 12px 16px; border-bottom: 2px solid #e2e8f0; text-align: left; font-weight: 600; color: #475569; width: 140px;">SI</th>
                        <th style="padding: 12px 16px; border-bottom: 2px solid #e2e8f0; text-align: center; font-weight: 600; color: #475569; width: 100px;">SI Match ID</th>
                    `;
                } else {
                    let extraColsHtml = `
                        <th style="padding: 12px 4px; border-bottom: 2px solid #e2e8f0; text-align: center; font-weight: 600; color: #475569; font-size: 0.75em; line-height: 1.2;">45+'</th>
                        <th style="padding: 12px 4px; border-bottom: 2px solid #e2e8f0; text-align: center; font-weight: 600; color: #475569; font-size: 0.75em; line-height: 1.2;">90+'</th>
                        <th style="padding: 12px 4px; border-bottom: 2px solid #e2e8f0; text-align: center; font-weight: 600; color: #475569; font-size: 0.75em; line-height: 1.2;">1HT1</th>
                        <th style="padding: 12px 4px; border-bottom: 2px solid #e2e8f0; text-align: center; font-weight: 600; color: #475569; font-size: 0.75em; line-height: 1.2;">1HT2</th>
                        <th style="padding: 12px 4px; border-bottom: 2px solid #e2e8f0; text-align: center; font-weight: 600; color: #475569; font-size: 0.75em; line-height: 1.2;">2HT1</th>
                        <th style="padding: 12px 4px; border-bottom: 2px solid #e2e8f0; text-align: center; font-weight: 600; color: #475569; font-size: 0.75em; line-height: 1.2;">2HT2</th>
                    `;
                    colsHtml = extraColsHtml + `
                        <th style="padding: 12px 4px; border-bottom: 2px solid #e2e8f0; text-align: center; font-weight: 600; color: #475569; font-size: 0.75em; line-height: 1.2;">0</th>
                        <th style="padding: 12px 4px; border-bottom: 2px solid #e2e8f0; text-align: center; font-weight: 600; color: #475569; font-size: 0.75em; line-height: 1.2;">1</th>
                        <th style="padding: 12px 4px; border-bottom: 2px solid #e2e8f0; text-align: center; font-weight: 600; color: #475569; font-size: 0.75em; line-height: 1.2;">2</th>
                        <th style="padding: 12px 4px; border-bottom: 2px solid #e2e8f0; text-align: center; font-weight: 600; color: #475569; font-size: 0.75em; line-height: 1.2;">3</th>
                        <th style="padding: 12px 4px; border-bottom: 2px solid #e2e8f0; text-align: center; font-weight: 600; color: #475569; font-size: 0.75em; line-height: 1.2;">4</th>
                        <th style="padding: 12px 4px; border-bottom: 2px solid #e2e8f0; text-align: center; font-weight: 600; color: #475569; font-size: 0.75em; line-height: 1.2;">5</th>
                        <th style="padding: 12px 4px; border-bottom: 2px solid #e2e8f0; text-align: center; font-weight: 600; color: #475569; font-size: 0.75em; line-height: 1.2;">6+</th>
                    `;
                }
            } else if (window.activeAnalysisTab === 'draw') {
                colsHtml = `
                    <th style="padding: 12px 4px; border-bottom: 2px solid #e2e8f0; text-align: center; font-weight: 600; color: #475569; font-size: 0.75em; line-height: 1.2;">Home Win</th>
                    <th style="padding: 12px 4px; border-bottom: 2px solid #e2e8f0; text-align: center; font-weight: 600; color: #475569; font-size: 0.75em; line-height: 1.2;">Draw</th>
                    <th style="padding: 12px 4px; border-bottom: 2px solid #e2e8f0; text-align: center; font-weight: 600; color: #475569; font-size: 0.75em; line-height: 1.2;">Away Win</th>
                `;
            } else {
                colsHtml = `
                    <th style="padding: 12px 4px; border-bottom: 2px solid #e2e8f0; text-align: center; font-weight: 600; color: #475569; font-size: 0.75em; line-height: 1.2;">1HT 0-15'</th>
                    <th style="padding: 12px 4px; border-bottom: 2px solid #e2e8f0; text-align: center; font-weight: 600; color: #475569; font-size: 0.75em; line-height: 1.2;">1HT 16-30'</th>
                    <th style="padding: 12px 4px; border-bottom: 2px solid #e2e8f0; text-align: center; font-weight: 600; color: #475569; font-size: 0.75em; line-height: 1.2;">1HT 31-45'</th>
                    <th style="padding: 12px 4px; border-bottom: 2px solid #e2e8f0; text-align: center; font-weight: 600; color: #475569; font-size: 0.75em; line-height: 1.2;">1HT 45+'</th>
                    <th style="padding: 12px 4px; border-bottom: 2px solid #e2e8f0; text-align: center; font-weight: 600; color: #475569; font-size: 0.75em; line-height: 1.2;">2HT 46-60'</th>
                    <th style="padding: 12px 4px; border-bottom: 2px solid #e2e8f0; text-align: center; font-weight: 600; color: #475569; font-size: 0.75em; line-height: 1.2;">2HT 61-75'</th>
                    <th style="padding: 12px 4px; border-bottom: 2px solid #e2e8f0; text-align: center; font-weight: 600; color: #475569; font-size: 0.75em; line-height: 1.2;">2HT 76-90'</th>
                    <th style="padding: 12px 4px; border-bottom: 2px solid #e2e8f0; text-align: center; font-weight: 600; color: #475569; font-size: 0.75em; line-height: 1.2;">2HT 90+'</th>
                `;
            }
            thead.innerHTML = `
                <tr>
                    <th style="padding: 12px 16px; border-bottom: 2px solid #e2e8f0; text-align: left; font-weight: 600; color: #475569; width: 60px;">Time</th>
                    <th style="padding: 12px 16px; border-bottom: 2px solid #e2e8f0; text-align: center; font-weight: 600; color: #475569; width: 60px;">Live Time</th>
                    <th style="padding: 12px 16px; border-bottom: 2px solid #e2e8f0; text-align: center; font-weight: 600; color: #475569; width: 60px;">${[2026, 2022, 2018, 2014, 2010, 2006].includes(year) ? 'Group' : 'League'}</th>
                    <th style="padding: 12px 16px; border-bottom: 2px solid #e2e8f0; text-align: left; font-weight: 600; color: #475569; width: 80px;">Match</th>
                    <th style="padding: 12px 16px; border-bottom: 2px solid #e2e8f0; text-align: center; font-weight: 600; color: #475569; width: 40px;">Score</th>
                    <th style="padding: 12px 16px; border-bottom: 2px solid #e2e8f0; text-align: center; font-weight: 600; color: #475569; width: 120px;">Goal Time</th>
                    <th style="padding: 12px 4px; border-bottom: 2px solid #e2e8f0; text-align: center; font-weight: 600; color: #475569; width: 30px;">1HT</th>
                    <th style="padding: 12px 4px; border-bottom: 2px solid #e2e8f0; text-align: center; font-weight: 600; color: #475569; width: 30px;">2HT</th>
                    ${colsHtml}
                </tr>
            `;
        }

        try {
            if (window._lastSportsYear !== year || !tbody.innerHTML.trim()) {
                tbody.innerHTML = '<tr><td colspan="14" style="text-align:center; padding:20px;">Loading schedule...</td></tr>';
                window._lastSportsYear = year;
            }
            let dataFile = '/sports/leagues/FIFA_2026.json';
            if (leagueId && leagueId !== 'FIFA') {
                dataFile = `/sports/leagues/${leagueId}/${year}.json`;
            } else {
                if (year === 2022 || year === '2022') dataFile = '/sports/leagues/FIFA_2022.json';
                if (year === 2018 || year === '2018') dataFile = '/sports/leagues/FIFA_2018.json';
                if (year === 2014 || year === '2014') dataFile = '/sports/leagues/FIFA_2014.json';
                if (year === 2010 || year === '2010') dataFile = '/sports/leagues/FIFA_2010.json';
                if (year === 2006 || year === '2006') dataFile = '/sports/leagues/FIFA_2006.json';
            }
            if (year === 'reference' || year === 'live' || year === 'playnow' || year === 'sportsinteraction' || year === 'tonybet') {
                const now = new Date();
                const dStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
                dataFile = `/sports/live_game/live_games_${dStr}.json`;
            }
            const fetchWithTimeout = (url, ms = 20000) => {
                return Promise.race([
                    fetch(url),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Fetch timeout after ' + ms + 'ms for ' + url)), ms))
                ]);
            };

            let matches = [];
            let parsedRefs = [];
            let fifa2026Data = [];
            try {
                if (year === 'last_game') {
                    const [f26, f22, f18, f14, f10, f06] = await Promise.all([
                        fetchWithTimeout('/sports/leagues/FIFA_2026.json?v=' + Date.now(), 5000).then(r => r.json()).catch(() => []),
                        fetchWithTimeout('/sports/leagues/FIFA_2022.json?v=' + Date.now(), 5000).then(r => r.json()).catch(() => []),
                        fetchWithTimeout('/sports/leagues/FIFA_2018.json?v=' + Date.now(), 5000).then(r => r.json()).catch(() => []),
                        fetchWithTimeout('/sports/leagues/FIFA_2014.json?v=' + Date.now(), 5000).then(r => r.json()).catch(() => []),
                        fetchWithTimeout('/sports/leagues/FIFA_2010.json?v=' + Date.now(), 5000).then(r => r.json()).catch(() => []),
                        fetchWithTimeout('/sports/leagues/FIFA_2006.json?v=' + Date.now(), 5000).then(r => r.json()).catch(() => [])
                    ]);

                    const nowLive = new Date();
                    let livePromises = [];
                    for (let i = 0; i < 30; i++) {
                        const d = new Date(nowLive.getTime() - i * 86400000);
                        const dStr = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
                        if (dStr < '2026-05-31') break; // Do not fetch previous dates
                        livePromises.push(
                            fetchWithTimeout(`/sports/live_game/live_games_${dStr}.json?v=` + Date.now(), 2000).then(r => r.json()).catch(() => [])
                        );
                    }
                    const liveDaysData = await Promise.all(livePromises);
                    let allLive = [];
                    liveDaysData.forEach(dayData => {
                        if (Array.isArray(dayData)) allLive.push(...dayData);
                    });

                    let allFifa = [...f26, ...f22, ...f18, ...f14, ...f10, ...f06, ...allLive];

                    const todayStr = nowLive.getFullYear() + '-' + String(nowLive.getMonth() + 1).padStart(2, '0') + '-' + String(nowLive.getDate()).padStart(2, '0');
                    allFifa = allFifa.filter(m => {
                        let dStr = m.date || 'Unknown';
                        if (dStr < '2026-05-31') return false; // Exclude anything before 2026-05-31

                        if (dStr < todayStr) {
                            if (!m.score || m.score === 'VS') return false;
                        }
                        return true;
                    });

                    allFifa.forEach(m => {
                        if (!m.league || m.league === 'FIFA') m.isFifa = true;
                    });

                    let lastGamesByDay = {};
                    allFifa.forEach(m => {
                        let dStr = m.date || 'Unknown';
                        if (!lastGamesByDay[dStr]) {
                            lastGamesByDay[dStr] = [m];
                        } else {
                            let parseTime = (tStr) => {
                                if (!tStr) return -1;
                                let parts = tStr.split(':');
                                if (parts.length === 2) return parseInt(parts[0]) * 60 + parseInt(parts[1]);
                                return -1;
                            };
                            let currTimeVal = parseTime(lastGamesByDay[dStr][0].time);
                            let newTimeVal = parseTime(m.time);

                            if (newTimeVal > currTimeVal) {
                                lastGamesByDay[dStr] = [m];
                            } else if (newTimeVal === currTimeVal && newTimeVal !== -1) {
                                if (!lastGamesByDay[dStr].find(x => x.matchId === m.matchId)) {
                                    lastGamesByDay[dStr].push(m);
                                }
                            }
                        }
                    });

                    let sortedAllDates = Object.keys(lastGamesByDay).sort((a, b) => b.localeCompare(a));

                    const tomorrow = new Date(nowLive.getTime() + 86400000);
                    const maxDateStr = tomorrow.getFullYear() + '-' + String(tomorrow.getMonth() + 1).padStart(2, '0') + '-' + String(tomorrow.getDate()).padStart(2, '0');

                    for (let dStr of sortedAllDates) {
                        if (dStr <= maxDateStr) {
                            lastGamesByDay[dStr].forEach(m => matches.push(m));
                        }
                    }
                    this.liveRefsAll = matches;
                    if (typeof this.renderLastGameCalendar === 'function') {
                        this.renderLastGameCalendar(allFifa, matches);
                    }
                } else {
                    const fRes = await fetchWithTimeout('/sports/leagues/FIFA_2026.json?v=' + (window._sportsCacheBuster || Date.now()), 20000);
                    if (fRes.ok) {
                        fifa2026Data = await fRes.json();
                        fifa2026Data.forEach(m => m.isFifa = true);
                        window._fifa2026Data = fifa2026Data;
                    }

                    const res = await fetchWithTimeout(dataFile + (window._sportsCacheBuster ? '?v=' + window._sportsCacheBuster : ''), 20000);
                    if (!res.ok) throw new Error('Network response was not ok');
                    matches = await res.json();

                    if (year === 'sportsinteraction' || year === 'playnow' || year === 'tonybet' || year === 'live' || year === 'tonybet') {
                        try {
                            const fifaRes = await fetchWithTimeout('/sports/leagues/FIFA_2026.json?v=' + (window._sportsCacheBuster || Date.now()), 20000);
                            if (fifaRes.ok) {
                                const fifaMatches = await fifaRes.json();
                                fifaMatches.forEach(m => m.isFifa = true);
                                matches = matches.concat(fifaMatches);
                            }
                        } catch (e) {
                            console.warn('Could not append FIFA 2026 matches', e);
                        }

                        let hashParts = window.location.hash.split('/');
                        let targetHashLeague = null;
                        if (hashParts[0] === '#all_live_soccer' && hashParts.length >= 4) {
                            targetHashLeague = decodeURIComponent(hashParts[2]).replace(/-/g, '_').replace(/ /g, '_');
                        }
                        if (targetHashLeague && targetHashLeague !== 'FIFA_2026') {
                            try {
                                const targetYear = hashParts[1].substring(0, 4);
                                const lgRes = await fetchWithTimeout(`/sports/leagues/${targetHashLeague}/${targetYear}.json?v=` + Date.now(), 5000);
                                if (lgRes.ok) {
                                    const lgMatches = await lgRes.json();
                                    lgMatches.forEach(m => m.leagueName = targetHashLeague);
                                    matches = matches.concat(lgMatches);
                                }
                            } catch (e) {
                                console.warn('Could not append specific hash league matches', e);
                            }
                        }
                    }
                    this.liveRefsAll = matches;
                    if (leagueId && leagueId !== 'FIFA') {
                        if (typeof this.fetchAndRenderLeagueCalendar === 'function') {
                            let passYear = year;
                            let localHashParts = window.location.hash.split('/');
                            if (year === 'live' && localHashParts[0] === '#all_live_soccer' && localHashParts.length >= 4) {
                                passYear = localHashParts[1].substring(0, 4);
                            }
                            this.fetchAndRenderLeagueCalendar(leagueId, passYear);
                        }
                    } else if (parseInt(year) === 2026) {
                        if (typeof this.fetchAndRenderFifa2026Calendar === 'function') {
                            this.fetchAndRenderFifa2026Calendar(2026);
                        }
                    } else if ([2006, 2010, 2014, 2018, 2020, 2022].includes(parseInt(year))) {
                        if (typeof this.fetchAndRenderLeagueCalendar === 'function') {
                            this.fetchAndRenderLeagueCalendar('FIFA', parseInt(year));
                        }
                    }
                }
            } catch (e) {
                if (year === 'sportsinteraction' || year === 'playnow' || year === 'tonybet') {
                    console.warn("Failed to load 7m schedule, falling back to cached refs:", e);
                    matches = this.liveRefsAll || [];
                } else {
                    throw e;
                }
            }

            if (year === 'live' || year === 'playnow') {
                matches.sort((a, b) => {
                    const getLiveMinutes = (m) => {
                        if (!m.status) return -1;
                        let s = m.status.toLowerCase();
                        if (s === 'ft') return -2;
                        if (s === '0' || s === 'delayed') return -1;

                        if (s === 'ht') return 45.5;
                        if (s === 'et') return 0.1;
                        if (s === 'pen') return 130;

                        let str = m.status.replace("'", "");
                        if (str.includes('+')) {
                            let parts = str.split('+');
                            return parseInt(parts[0]) + (parseInt(parts[1]) || 1);
                        }
                        return parseInt(str) || 0.5;
                    };

                    const liveA = getLiveMinutes(a);
                    const liveB = getLiveMinutes(b);
                    const sgA = liveA > 0 ? 0 : (liveA === -1 ? 1 : 2);
                    const sgB = liveB > 0 ? 0 : (liveB === -1 ? 1 : 2);

                    if (sgA !== sgB) return sgA - sgB;

                    if (liveA !== liveB) return liveB - liveA; // DESCENDING by Live Time first

                    let tA = a.time || '99:99';
                    let tB = b.time || '99:99';
                    let hA = tA.split(':')[0];
                    let hB = tB.split(':')[0];

                    if (hA !== hB) return hA.localeCompare(hB);

                    return tA.localeCompare(tB);
                });
            }

            let liveRefsAll = [];
            if (year === 2026 || year === 'live' || year === 'playnow' || year === 'sportsinteraction' || year === 'tonybet') {
                try {
                    const now = new Date();
                    let liveRefsMap = new Map();
                    const numDays = window.location.hash.includes('_id_') ? 1 : 5;
                    for (let i = 0; i < numDays; i++) {
                        const d = new Date(now.getTime() - i * 86400000);
                        const dStr = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
                        try {
                            const liveRes = await fetchWithTimeout(`/sports/live_game/live_games_${dStr}.json?v=` + Date.now(), 2000);
                            if (liveRes.ok) {
                                const data = await liveRes.json();
                                data.forEach(m => {
                                    if (!liveRefsMap.has(m.matchId)) liveRefsMap.set(m.matchId, m);
                                });
                            }
                        } catch (e) { }
                    }
                    const f26Data = fifa2026Data && fifa2026Data.length > 0 ? fifa2026Data : (window._fifa2026Data || []);
                    const f26Ids = new Set(f26Data.map(m => m.matchId).filter(id => id));
                    const isFifa2026Strict = (year === 2026 || year === '2026' || window.location.hash === '#sports' || window.location.hash.startsWith('#sports/FIFA-2026') || window.location.hash.startsWith('#sports/2026-FIFA'));

                    if (isFifa2026Strict && f26Ids.size > 0) {
                        liveRefsAll = Array.from(liveRefsMap.values()).filter(m => f26Ids.has(m.matchId));
                    } else {
                        liveRefsAll = Array.from(liveRefsMap.values());
                    }
                    if (matches) {
                        matches.forEach(m => {
                            const isMatchFifa = m.isFifa || (isFifa2026Strict && f26Ids.has(m.matchId));
                            if (isMatchFifa && !liveRefsAll.find(r => r.matchId === m.matchId)) {
                                liveRefsAll.push(m);
                            }
                        });
                    }
                    this.liveRefsAll = liveRefsAll;

                    try {
                        if (false) {
                            const _todayStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
                            await Promise.all(liveRefsAll.map(async (ref) => {
                                if (ref.date !== _todayStr) return;
                                try {
                                    let refUrl = `/sports/refs/${ref.matchId}.json?v=` + Date.now();
                                    if (ref.date) {
                                        let parts = ref.date.split('-');
                                        if (parts.length === 3) {
                                            let yyyy = parts[0];
                                            let mm = parts[1];
                                            let dateStr = ref.date.replace(/-/g, '_');
                                            refUrl = `/sports/refs/${yyyy}/${mm}/${dateStr}/${ref.matchId}.json?v=` + Date.now();
                                        }
                                    }
                                    const detailRes = await fetchWithTimeout(refUrl, 2000);
                                    if (detailRes.ok) {
                                        const detailData = await detailRes.json();
                                        if (detailData && detailData.goals && detailData.goals.some(g => g !== '')) ref.goals = detailData.goals;
                                        if (detailData && detailData.score) ref.score = detailData.score;
                                        if (detailData && detailData.status) ref.status = detailData.status;
                                    }
                                } catch (e) { }
                            }));
                        }
                    } catch (e) { }

                    try {
                        const dateStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
                        const playnowRes = await fetchWithTimeout(`/sports/playnow/${dateStr}/live_games_playnow.json?v=` + Date.now(), 5000);
                        if (playnowRes.ok) {
                            this.playnowMatches = await playnowRes.json();
                        } else {
                            this.playnowMatches = [];
                        }
                    } catch (e) {
                        this.playnowMatches = [];
                    }

                    try {
                        const dateStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
                        const dmRes = await fetchWithTimeout(`/sports/playnow/${dateStr}/daily_matches.json?v=` + Date.now(), 2000);
                        if (dmRes.ok) {
                            this.playnowDailyMatches = await dmRes.json();
                        } else {
                            this.playnowDailyMatches = {};
                        }
                    } catch (e) {
                        this.playnowDailyMatches = {};
                    }

                    try {
                        const dateStr2 = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
                        const tbDmRes = await fetchWithTimeout(`/sports/tonybet/${dateStr2}/daily_matches.json?v=` + Date.now(), 2000);
                        if (tbDmRes.ok) {
                            this.tonybetDailyMatches = await tbDmRes.json();
                        } else {
                            this.tonybetDailyMatches = {};
                        }
                    } catch (e) {
                        this.tonybetDailyMatches = {};
                    }

                    try {
                        let siRes = await fetchWithTimeout(`http://localhost:3001/api/sportsinteraction/live-games`, 5000);
                        if (siRes.ok) {
                            this.siMatches = await siRes.json();
                        } else {
                            this.siMatches = [];
                        }
                    } catch (e) {
                        this.siMatches = [];
                    }

                    try {
                        const syncGamesRes = await fetchWithTimeout(`/sports/leagues/pair_games.json?v=` + Date.now(), 5000);
                        if (syncGamesRes.ok) {
                            this.syncGamesData = await syncGamesRes.json();
                        } else {
                            this.syncGamesData = [];
                        }
                    } catch (e) {
                        this.syncGamesData = [];
                    }

                    this.fifaHistoryDatasets = [];
                    try {
                        const res = await fetchWithTimeout(`/sports/leagues/fifa_pairs.json?v=` + Date.now(), 3000);
                        if (res.ok) {
                            const allPairs = await res.json();
                            const groups = {};
                            allPairs.forEach(m => {
                                const dn = m._datasetName || 'FIFA Pairs';
                                if (!groups[dn]) groups[dn] = [];
                                groups[dn].push(m);
                            });
                            for (let dn in groups) {
                                this.fifaHistoryDatasets.push({ name: dn, data: groups[dn] });
                            }
                        }
                    } catch (e) { }
                } catch (e) {
                    console.error('Failed to load references', e);
                }

                if (this._liveGamesInterval) clearInterval(this._liveGamesInterval);
                // this._liveGamesInterval = setInterval(async () => {
                // playnow poll removed

                // si poll removed
                // }, 5000);
            }

            let filteredMatches = matches;

            const isFifa2026Strict = (year === 2026 || year === '2026' || window.location.hash === '#sports' || window.location.hash.startsWith('#sports/FIFA-2026') || window.location.hash.startsWith('#sports/2026-FIFA'));

            
            if (year === 'tonybet') {
                try {
                    const nowT = new Date();
                    const todayStrT = nowT.getFullYear() + '-' + String(nowT.getMonth() + 1).padStart(2, '0') + '-' + String(nowT.getDate()).padStart(2, '0');
                    const yesterdayT = new Date(nowT.getTime() - 86400000);
                    const ydStrT = yesterdayT.getFullYear() + '-' + String(yesterdayT.getMonth() + 1).padStart(2, '0') + '-' + String(yesterdayT.getDate()).padStart(2, '0');
                    
                    let tbRes = await fetchWithTimeout(`/sports/tonybet/${todayStrT}/live_games.json?v=` + Date.now(), 5000);
                    if (!tbRes.ok) {
                        tbRes = await fetchWithTimeout(`/sports/tonybet/${ydStrT}/live_games.json?v=` + Date.now(), 5000);
                    }
                    if (tbRes.ok) {
                        filteredMatches = await tbRes.json();
                    } else {
                        filteredMatches = [];
                    }
                } catch (e) { console.error('Tonybet Fetch Error:', e); filteredMatches = []; }
                }
            if (year === 'sportsinteraction') {
                filteredMatches = this.filterAndMapSiMatches(liveRefsAll);
            } else {
                const countryTabs = document.getElementById('si-country-tabs');
                if (countryTabs) countryTabs.style.display = 'none';
            }

            if (year === 'playnow') {
                filteredMatches = this.filterAndMapPlaynowMatches(liveRefsAll);
            }

            if (year === 'sportsinteraction' || year === 'playnow' || year === 'tonybet') {
                filteredMatches.sort((a, b) => {
                    const getLiveMinutes = (m) => {
                        if (!m.status) return -1;
                        let s = m.status.toLowerCase();
                        if (s === 'ft' || s === 'finished') return -2;
                        if (s === '0' || s === 'delayed') return -1;
                        if (s === 'ht' || s === 'halftime') return 45.5;
                        if (s === 'et') return 0.1;
                        if (s === 'pen') return 130;

                        let str = m.status.replace(/'/g, "").toLowerCase();
                        if (str.includes('•')) {
                            str = str.split('•')[1].trim();
                            if (str.includes(':')) str = str.split(':')[0];
                        }
                        if (str.includes('+')) {
                            let parts = str.split('+');
                            return parseInt(parts[0]) + (parseInt(parts[1]) || 1);
                        }
                        return parseInt(str) || 0.5;
                    };

                    const liveA = getLiveMinutes(a);
                    const liveB = getLiveMinutes(b);
                    const sgA = liveA > 0 ? 0 : (liveA === -1 ? 1 : 2);
                    const sgB = liveB > 0 ? 0 : (liveB === -1 ? 1 : 2);

                    if (sgA !== sgB) return sgA - sgB;

                    if (liveA !== liveB) return liveB - liveA; // DESCENDING by Live Time first

                    let tA = a.time || '99:99';
                    let tB = b.time || '99:99';
                    let hA = tA.split(':')[0];
                    let hB = tB.split(':')[0];

                    if (hA !== hB) return hA.localeCompare(hB);

                    return tA.localeCompare(tB);
                });
            } else if (leagueId && leagueId !== 'FIFA') {
                // Sort league matches: Finished games (DESC) first, then Future games (ASC)
                const now = new Date();
                const todayStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');

                filteredMatches.sort((a, b) => {
                    const isFuture = (m) => {
                        if (m.status === 'FT' || m.status === 'Finished') return false;
                        if (m.score && m.score !== 'VS' && m.score !== '0-0') return false;
                        if (m.score === 'VS' || !m.score) return true;
                        if (m.status && m.status.toLowerCase() === 'upcoming') return true;
                        if (m.date > todayStr) return true;
                        return false;
                    };

                    const futureA = isFuture(a);
                    const futureB = isFuture(b);

                    if (futureA !== futureB) {
                        return futureA ? 1 : -1; // Finished/Live games first, then Future games
                    }

                    let dateA = a.date || '1970-01-01';
                    let dateB = b.date || '1970-01-01';
                    let timeA = a.time || '00:00';
                    let timeB = b.time || '00:00';

                    if (futureA) {
                        // Future games: date ASC, time ASC
                        if (dateA !== dateB) return dateA.localeCompare(dateB);
                        return timeA.localeCompare(timeB);
                    } else {
                        // Finished games: date DESC, time DESC
                        if (dateA !== dateB) return dateB.localeCompare(dateA);
                        return timeB.localeCompare(timeA);
                    }
                });
            }

            let isSingleMatchView = false;
            let targetMatch = null;

            const hashParts = window.location.hash.split('/');
            const isFifa2026AnalystView = window.location.hash.startsWith('#sports/2026-FIFA/');

            if (!isFifa2026AnalystView && hashParts.length >= 2 && window.location.hash.startsWith('#')) {
                let teamsPart = hashParts[hashParts.length - 1];

                const possibleTab = teamsPart.toLowerCase();
                const validTabs = ['total', '1ht', '2ht', 'draw', 'goaltime'];
                const validPeriods = ['1ht1', 'ht', '2ht1', 'ft'];

                if (validPeriods.includes(possibleTab)) {
                    window._pairMatchPeriod = possibleTab.toUpperCase();
                    if (hashParts.length >= 3) {
                        teamsPart = hashParts[hashParts.length - 2];
                    }
                } else if (validTabs.includes(possibleTab)) {
                    window.activeAnalysisTab = possibleTab;
                    if (hashParts.length >= 3) {
                        teamsPart = hashParts[hashParts.length - 2];
                    }
                    setTimeout(() => {
                        validTabs.forEach(t => {
                            const btn = document.getElementById(`btn-analysis-${t === 'goaltime' ? 'goalTime' : t}`);
                            if (btn) {
                                btn.className = t === possibleTab ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-outline-primary';
                            }
                        });
                    }, 500);
                }

                let searchId = null;
                if (teamsPart.includes('_id_')) {
                    const parts = teamsPart.split('_id_');
                    teamsPart = parts[0];
                    searchId = parts[1];
                }

                let teams = teamsPart.split('-');
                if (teamsPart.includes('-vs-')) {
                    teams = teamsPart.split('-vs-');
                }
                let hName = decodeURIComponent(teams[0] || '').toLowerCase().replace(/-/g, ' ');
                let aName = decodeURIComponent(teams[teams.length - 1] || '').toLowerCase().replace(/-/g, ' ');

                if (searchId) {
                    targetMatch = filteredMatches.find(m => String(m.matchId) === searchId || String(m.siMatchId) === searchId);
                    if (!targetMatch && typeof liveRefsAll !== 'undefined') {
                        targetMatch = liveRefsAll.find(m => String(m.matchId) === searchId);
                    }
                    if (!targetMatch && window._fifa2026Data) {
                        targetMatch = window._fifa2026Data.find(m => String(m.matchId) === searchId);
                    }
                }

                if (!targetMatch && searchId && (!hName || !aName || hName === aName) && year === 'sportsinteraction') {
                    try {
                        const now = new Date();
                        const todayStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
                        const yesterday = new Date(now.getTime() - 86400000);
                        const ydStr = yesterday.getFullYear() + '-' + String(yesterday.getMonth() + 1).padStart(2, '0') + '-' + String(yesterday.getDate()).padStart(2, '0');

                        for (const d of [todayStr, ydStr]) {
                            const detailRes = await fetch(`/sports/sportsinteraction/${d}/${searchId}.json?v=` + Date.now());
                            if (detailRes.ok) {
                                const detailData = await detailRes.json();
                                if (detailData.homeTeam && detailData.awayTeam) {
                                    hName = detailData.homeTeam.toLowerCase().replace(/-/g, ' ');
                                    aName = detailData.awayTeam.toLowerCase().replace(/-/g, ' ');
                                    targetMatch = detailData;
                                    targetMatch.siMatchId = targetMatch.matchId;
                                    let teamMap = {};
                                    try { teamMap = JSON.parse(localStorage.getItem('si_team_map') || '{}'); } catch (e) { }
                                    const hdMap = { "DR Congo": "Democratic Rep Congo", "South Korea": "Korea Republic", "Ivory Coast": "Cote d\\Ivoire", "Cote d'Ivoire": "Cote d\\Ivoire", "USA": "United States", "Turkiye": "Turkey" };
                                    let rH = teamMap[targetMatch.homeTeam] || hdMap[targetMatch.homeTeam] || targetMatch.homeTeam;
                                    let rA = teamMap[targetMatch.awayTeam] || hdMap[targetMatch.awayTeam] || targetMatch.awayTeam;
                                    if (typeof liveRefsAll !== 'undefined') {
                                        let refG = liveRefsAll.find(r => {
                                            let rh2 = r.homeTeam ? r.homeTeam.replace(/\(N\)/gi, '').replace(/['\\]/g, '').trim().toLowerCase() : '';
                                            let ra2 = r.awayTeam ? r.awayTeam.replace(/\(N\)/gi, '').replace(/['\\]/g, '').trim().toLowerCase() : '';
                                            let sh2 = rH.toLowerCase().trim();
                                            let sa2 = rA.toLowerCase().trim();
                                            return rh2 === sh2 && ra2 === sa2;
                                        });
                                        if (refG) targetMatch.matchId = refG.matchId;
                                    }
                                    break;
                                }
                            }
                        }
                    } catch (e) {
                        console.error("[loadSportsSchedule] Failed to resolve team names from searchId:", e);
                    }
                }

                if (!targetMatch && hName && aName) {
                    const searchByName = (pool) => pool.find(m => {
                        const mh = (m.homeTeam || '').toLowerCase();
                        const ma = (m.awayTeam || '').toLowerCase();
                        return mh.includes(hName) && ma.includes(aName);
                    });

                    targetMatch = searchByName(filteredMatches);
                    if (!targetMatch && typeof liveRefsAll !== 'undefined') {
                        targetMatch = searchByName(liveRefsAll);
                    }
                    if (!targetMatch && window._fifa2026Data) {
                        targetMatch = searchByName(window._fifa2026Data);
                    }
                }

                if (targetMatch) {
                    isSingleMatchView = true;
                    if (!targetMatch.group) {
                        if ((hashParts[0] === '#sportsinteraction' || hashParts[0] === '#tonybet') && hashParts.length >= 3) {
                            targetMatch.group = decodeURIComponent(hashParts[1]).replace(/-/g, ' ');
                        } else if (hashParts[0] === '#sports' && hashParts.length >= 3) {
                            targetMatch.group = decodeURIComponent(hashParts[1]).replace(/-/g, ' ');
                        } else if (hashParts[0] === '#playnow' || hashParts[0] === '#all_live_soccer') {
                            if (hashParts.length >= 4) {
                                targetMatch.group = decodeURIComponent(hashParts[2]).replace(/-/g, ' ');
                            } else if (hashParts.length === 3) {
                                targetMatch.group = decodeURIComponent(hashParts[1]).replace(/-/g, ' ');
                            }
                        }
                    }
                    let pool = [...filteredMatches];
                    if (typeof liveRefsAll !== 'undefined') pool = pool.concat(liveRefsAll);
                    if (window._fifa2026Data) pool = pool.concat(window._fifa2026Data);

                    let seenPool = new Set();
                    let uniquePool = [];
                    for (let m of pool) {
                        let key = m.matchId ? String(m.matchId) : (m.homeTeam + '-' + m.awayTeam);
                        if (!seenPool.has(key)) {
                            seenPool.add(key);
                            uniquePool.push(m);
                        }
                    }

                    // Hydrate uniquePool matches with finished scores before using them to form pairs
                    if (typeof liveRefsAll !== 'undefined') {
                        const finishedMatchesSync = liveRefsAll.filter(m => m.status === 'FT' || m.status === 'Finished');
                        uniquePool.forEach(match => {
                            let actualLiveScore = match.score;
                            if ((actualLiveScore === 'VS' || !actualLiveScore) && finishedMatchesSync.length > 0) {
                                const finishedMatch = finishedMatchesSync.find(m => String(m.matchId) === String(match.matchId));
                                if (finishedMatch && finishedMatch.score && finishedMatch.score !== 'VS') {
                                    match.score = finishedMatch.score;
                                } else if (finishedMatch) {
                                    match.score = '0-0';
                                }
                            }
                        });
                    }

                    let period = window._pairMatchPeriod || 'HT';

                    const getPeriodScore = (m, p) => {
                        const getGoals = (s) => {
                            if (!s || s === 'VS' || s === '0-0') return 0;
                            let parts = s.replace(/[^0-9-]/g, '').split('-');
                            return parts.length === 2 ? (parseInt(parts[0]) || 0) + (parseInt(parts[1]) || 0) : 0;
                        };

                        const getScoreAtMinute = (matchObj, targetMin) => {
                            if (!matchObj || !matchObj.goals) return '0-0';
                            let lastScore = '0-0';
                            let allGoalsStr = matchObj.goals.join('<br>');
                            let goals = allGoalsStr.split('<br>').filter(g => g.trim() !== '');
                            let maxTime = -1;
                            goals.forEach(g => {
                                let match = g.match(/(\d+)'\s*(?:.*?\()?([0-9]+-[0-9]+)\)?/);
                                if (match) {
                                    let t = parseInt(match[1]);
                                    if (t <= targetMin && t > maxTime) {
                                        lastScore = match[2];
                                        maxTime = t;
                                    }
                                }
                            });
                            return lastScore;
                        };

                        if (p === 'HT') {
                            if (!m || !m.score || m.score === 'VS') return 0;
                            // PRIMARY: parenthetical e.g. "3-1 (2-1)"
                            if (m.score.includes('(')) {
                                let matchStr = m.score.match(/\((.*?)\)/);
                                if (matchStr) return getGoals(matchStr[1].trim());
                            }
                            // SECONDARY: count goals in 1st-half buckets (indices 0-3)
                            if (m.goals && m.goals.some(g => g && g.trim() !== '')) {
                                let htGoals = 0;
                                for (let i = 0; i < 4; i++) {
                                    if (m.goals[i] && m.goals[i].trim() !== '') {
                                        htGoals += m.goals[i].split('<br>').filter(g => g.trim() !== '').length;
                                    }
                                }
                                return htGoals;
                            }
                            return 0;
                        } else if (p === 'FT') {
                            if (!m || !m.score || m.score === 'VS') return 0;
                            return getGoals(m.score.split('(')[0].trim());
                        } else if (p === '1HT1' || p === '2HT1') {
                            if (p === '1HT1') {
                                return getGoals(getScoreAtMinute(m, 22));
                            } else if (p === '2HT1') {
                                // HT goals: from parenthetical or 1st-half buckets
                                let ht = 0;
                                if (m && m.score && m.score !== 'VS') {
                                    if (m.score.includes('(')) {
                                        let matchStr = m.score.match(/\((.*?)\)/);
                                        if (matchStr) ht = getGoals(matchStr[1].trim());
                                    } else if (m.goals && m.goals.some(g => g && g.trim() !== '')) {
                                        for (let i = 0; i < 4; i++) {
                                            if (m.goals[i] && m.goals[i].trim() !== '') {
                                                ht += m.goals[i].split('<br>').filter(g => g.trim() !== '').length;
                                            }
                                        }
                                    }
                                }
                                // Goals at 75': HT goals + 2nd half bucket index 4 (46-60') + bucket index 5 (61-75')
                                let goals75 = ht;
                                if (m && m.goals) {
                                    for (let i = 4; i <= 5; i++) { // buckets 4=46-60', 5=61-75'
                                        if (m.goals[i] && m.goals[i].trim() !== '') {
                                            goals75 += m.goals[i].split('<br>').filter(g => g.trim() !== '').length;
                                        }
                                    }
                                }
                                return `HT${ht} 75m${goals75}`;
                            }
                        }
                        return 0;
                    };

                    const getFTExclude90 = (m) => {
                        if (!m || !m.score || m.score === 'VS') return 0;
                        // Count goals in buckets 0-6 only (exclude bucket 7 = 90+')
                        if (m.goals && m.goals.some(g => g && g.trim() !== '')) {
                            let count = 0;
                            for (let i = 0; i < 7; i++) { // 0-6, skip index 7 (90+')
                                if (m.goals[i] && m.goals[i].trim() !== '') {
                                    count += m.goals[i].split('<br>').filter(g => g.trim() !== '').length;
                                }
                            }
                            return count;
                        }
                        // Fallback: use FT score total (no goal detail available)
                        return getPeriodScore(m, 'FT');
                    };

                    let targetScore0 = period === 'FT' ? getFTExclude90(targetMatch) : getPeriodScore(targetMatch, period);

                    let sameTimeMatches = [];
                    if (targetMatch.date && targetMatch.time) {
                        sameTimeMatches = uniquePool.filter(m => {
                            let isSameMatch = (m.matchId && targetMatch.matchId && String(m.matchId) === String(targetMatch.matchId)) ||
                                (m.homeTeam === targetMatch.homeTeam && m.awayTeam === targetMatch.awayTeam);
                            let isSameLeague = (m.group && targetMatch.group && m.group === targetMatch.group) || (!m.group && !targetMatch.group);
                            return !isSameMatch && m.date === targetMatch.date && m.time === targetMatch.time && isSameLeague;
                        }).slice(0, 1); // Limit to 1 additional game for a total of 2 games
                    }

                    filteredMatches = [targetMatch, ...sameTimeMatches];

                    let datasetsToSearch = [];
                    if (this.syncGamesData && this.syncGamesData.length > 0) {
                        datasetsToSearch.push({ name: 'All Historical Pairs', data: this.syncGamesData });
                    }
                    if (this.fifaHistoryDatasets && this.fifaHistoryDatasets.length > 0) {
                        datasetsToSearch = datasetsToSearch.concat(this.fifaHistoryDatasets);
                    }

                    if (datasetsToSearch.length > 0 && filteredMatches.length >= 2) {
                        let score1 = targetScore0;
                        let score2 = period === 'FT' ? getFTExclude90(filteredMatches[1]) : getPeriodScore(filteredMatches[1], period);
                        let targetScores = [score1, score2].sort((a, b) => {
                            if (typeof a === 'string' || typeof b === 'string') return String(a).localeCompare(String(b));
                            return a - b;
                        });

                        let fifaSummaries = [];
                        let mainPairContent = [];
                        let topSummaries = [];
                        let anyMatchesFound = false;

                        datasetsToSearch.forEach((dataset, dIndex) => {
                            let syncPairsLocal = {};
                            dataset.data.forEach(m => {
                                let key = m.date + ' ' + m.time + (m.group ? ' | ' + m.group : '');
                                if (!syncPairsLocal[key]) syncPairsLocal[key] = [];
                                syncPairsLocal[key].push(m);
                            });

                            if (dataset.name.startsWith('FIFA')) {
                                let allPairsFlat = [];
                                let dayGroups = {};

                                for (let key in syncPairsLocal) {
                                    if (syncPairsLocal[key].length === 2) {
                                        let p1 = syncPairsLocal[key][0];
                                        let p2 = syncPairsLocal[key][1];
                                        allPairsFlat.push(p1, p2);
                                        let dStr = p1.date || 'Unknown';
                                        if (!dayGroups[dStr]) dayGroups[dStr] = [];
                                        dayGroups[dStr].push(p1, p2);
                                    }
                                }

                                let topGroupId = `fifa-top-${dIndex}`;
                                let summaryHtmlStr = this.renderReferenceGroup(`${dataset.name} Summary`, allPairsFlat, topGroupId, targetMatch.matchId, targetMatch.status, { isTopLevelFifa: true, forceDisplay: true, darkerBg: true, noRedBar: false });

                                let dayIndex = 0;
                                let sortedDates = Object.keys(dayGroups).sort((a, b) => b.localeCompare(a));
                                for (let dStr of sortedDates) {
                                    let dayGroupId = `fifa-day-${dIndex}-${dayIndex++}`;
                                    let dDay = (dayGroups[dStr][0] && dayGroups[dStr][0].day) ? dayGroups[dStr][0].day : '';
                                    let isToday = false;
                                    if (dStr) {
                                        let parts = dStr.split(/[-/]/);
                                        if (parts.length === 3) {
                                            let y = parts[0].length === 4 ? parseInt(parts[0]) : parseInt('20' + parts[2]);
                                            let m = parts[0].length === 4 ? parseInt(parts[1]) - 1 : parseInt(parts[1]) - 1;
                                            let d = parts[0].length === 4 ? parseInt(parts[2]) : parseInt(parts[0]);
                                            let dateObj = new Date(y, m, d);
                                            let now = new Date();
                                            if (dateObj.getFullYear() === now.getFullYear() && dateObj.getMonth() === now.getMonth() && dateObj.getDate() === now.getDate()) {
                                                isToday = true;
                                            }
                                            if (!dDay && !isNaN(dateObj)) {
                                                let days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                                                dDay = days[dateObj.getDay()];
                                            }
                                        }
                                    }
                                    let displayTitle = dStr;
                                    if (isToday) displayTitle = `Today - ${displayTitle}`;
                                    if (dDay) displayTitle += ` ${dDay}`;
                                    displayTitle += " Summary";
                                    summaryHtmlStr += this.renderReferenceGroup(displayTitle, dayGroups[dStr], dayGroupId, targetMatch.matchId, targetMatch.status, { isFifaDay: true, parentGroupId: topGroupId, darkerBg: false, noRedBar: false });
                                }

                                summaryHtmlStr = summaryHtmlStr.replace(/<tr /g, '<tr class="fifa-history-container-row" ');

                                fifaSummaries.push({
                                    _isCustomHtml: true,
                                    _html: summaryHtmlStr
                                });
                                return; // move to next dataset in the map function
                            }

                            let pairCount = 0;
                            let matchedPairsFT = [];
                            let ftComboFirstId = {};
                            let matchedByCombo = {};

                            for (let key in syncPairsLocal) {
                                let pair = syncPairsLocal[key];
                                if (pair.length === 2) {
                                    if (!pair[0].score || pair[0].score === 'VS' || !pair[1].score || pair[1].score === 'VS') continue;

                                    let pairScores = [
                                        period === 'FT' ? getFTExclude90(pair[0]) : getPeriodScore(pair[0], period),
                                        period === 'FT' ? getFTExclude90(pair[1]) : getPeriodScore(pair[1], period)
                                    ].sort((a, b) => {
                                        if (typeof a === 'string' || typeof b === 'string') return String(a).localeCompare(String(b));
                                        return a - b;
                                    });

                                    let htMatches = true;
                                    if (period === '2HT1' || period === '2HT2' || period === 'FT') {
                                        const pairHasHtData = (mm) =>
                                            (mm.score && mm.score.includes('(')) ||
                                            (mm.goals && mm.goals.slice(0, 4).some(g => g && g.trim() !== '')) ||
                                            (mm.goals && mm.goals.slice(4, 8).some(g => g && g.trim() !== ''));
                                        if (!pairHasHtData(pair[0]) || !pairHasHtData(pair[1])) {
                                            htMatches = false;
                                        } else {
                                            let targetScoresHT = [getPeriodScore(filteredMatches[0], 'HT'), getPeriodScore(filteredMatches[1], 'HT')].sort((a, b) => a - b);
                                            let pairScoresHT = [getPeriodScore(pair[0], 'HT'), getPeriodScore(pair[1], 'HT')].sort((a, b) => a - b);
                                            htMatches = (pairScoresHT[0] === targetScoresHT[0] && pairScoresHT[1] === targetScoresHT[1]);
                                        }
                                    }

                                    let matchesTarget = (pairScores[0] === targetScores[0] && pairScores[1] === targetScores[1] && htMatches);

                                    if (matchesTarget) {
                                        let ftScores = [getPeriodScore(pair[0], 'FT'), getPeriodScore(pair[1], 'FT')].sort((a, b) => a - b);
                                        let ftStr = ftScores[0] + ',' + ftScores[1];

                                        let periodStr = pairScores[0] + ',' + pairScores[1];
                                        let comboKey = periodStr + '|' + ftStr;

                                        if (!matchedByCombo[comboKey]) matchedByCombo[comboKey] = { periodStr, ftStr, pairs: [] };
                                        matchedByCombo[comboKey].pairs.push({ key, pair });

                                        let safeId = 'combo-group-' + dIndex + '-' + (periodStr + '-ft-' + ftStr).replace(/[^a-zA-Z0-9]/g, '-');
                                        if (!ftComboFirstId[ftStr]) ftComboFirstId[ftStr] = safeId;

                                        matchedPairsFT.push(ftStr);
                                        pairCount++;
                                    }
                                }
                            }

                            if (pairCount > 0) {
                                anyMatchesFound = true;

                                let comboCounts = {};
                                matchedPairsFT.forEach(c => { comboCounts[c] = (comboCounts[c] || 0) + 1; });
                                let summaryList = Object.keys(comboCounts).map(k => ({
                                    combo: k,
                                    count: comboCounts[k],
                                    pct: ((comboCounts[k] / pairCount) * 100).toFixed(1),
                                    firstId: ftComboFirstId[k] || ''
                                }));
                                summaryList.sort((a, b) => b.count - a.count);

                                let summaryObj = {
                                    _isDatasetSummary: true,
                                    _datasetName: dataset.name,
                                    _summary: summaryList,
                                    _totalPairs: pairCount,
                                    _ftComboFirstId: ftComboFirstId,
                                    _period: period
                                };

                                topSummaries.push(summaryObj);

                                let sortedComboKeys = Object.keys(matchedByCombo).sort((a, b) => {
                                    let [aPeriod, aFT] = a.split('|');
                                    let [bPeriod, bFT] = b.split('|');
                                    let [ap1, ap2] = aPeriod.split(',').map(Number);
                                    let [bp1, bp2] = bPeriod.split(',').map(Number);
                                    if (ap1 !== bp1) return ap1 - bp1;
                                    if (ap2 !== bp2) return ap2 - bp2;
                                    let [af1, af2] = aFT.split(',').map(Number);
                                    let [bf1, bf2] = bFT.split(',').map(Number);
                                    if (af1 !== bf1) return af1 - bf1;
                                    return af2 - bf2;
                                });

                                sortedComboKeys.forEach(comboKey => {
                                    let { periodStr, ftStr, pairs } = matchedByCombo[comboKey];
                                    let safeId = 'combo-group-' + dIndex + '-' + (periodStr + '-ft-' + ftStr).replace(/[^a-zA-Z0-9]/g, '-');
                                    mainPairContent.push({
                                        _isComboHeader: true,
                                        _safeId: safeId,
                                        _periodStr: periodStr,
                                        _ftStr: ftStr,
                                        _count: pairs.length,
                                        _period: period
                                    });
                                    pairs.forEach(({ key, pair }) => {
                                        mainPairContent.push({ _isSeparator: true, _groupKey: key });
                                        mainPairContent.push(
                                            Object.assign({}, pair[0], { _isPastPair: true }),
                                            Object.assign({}, pair[1], { _isPastPair: true })
                                        );
                                    });
                                });
                            }
                        });

                        let buttonsObj = { _isPairButtons: true, _period: period, _targetScores: targetScores };
                        if (!anyMatchesFound) buttonsObj._noMatches = true;

                        if (fifaSummaries.length > 0) {
                            let toggleStyle = `<style>.hide-fifa-history .fifa-history-container-row { display: none !important; }</style>`;
                            let toggleBtnHtml = `<tr><td colspan="100" style="background-color: #f8fafc; padding: 8px 16px; border-bottom: 2px solid #cbd5e1; text-align: center;">
                                ${toggleStyle}
                                <button onclick="this.closest('tbody').classList.toggle('hide-fifa-history'); let icon = this.querySelector('i'); if(this.closest('tbody').classList.contains('hide-fifa-history')) { icon.className = 'fas fa-chevron-down'; } else { icon.className = 'fas fa-chevron-up'; }" style="padding: 4px 12px; font-size: 11px; background: #e2e8f0; border: 1px solid #cbd5e1; border-radius: 4px; font-weight: bold; color: #475569; cursor: pointer; display: inline-flex; align-items: center; gap: 8px;">
                                    Toggle History Summary <i class="fas fa-chevron-up"></i>
                                </button>
                            </td></tr>`;
                            fifaSummaries.unshift({ _isCustomHtml: true, _html: toggleBtnHtml });
                        }

                        const tagAnalyst = (arr) => arr.forEach(o => { if (typeof o === 'object') o._isBottomAnalyst = true; });
                        tagAnalyst(topSummaries);
                        tagAnalyst(fifaSummaries);
                        if (buttonsObj) buttonsObj._isBottomAnalyst = true;
                        tagAnalyst(mainPairContent);

                        let analystToggleBtn = `<tr><td colspan="100" style="background-color: #f8fafc; padding: 12px 16px; border-bottom: 2px solid #cbd5e1; text-align: center;">
                            <style>.hide-bottom-analyst .bottom-analyst-row { display: none !important; }</style>
                            <button onclick="this.closest('tbody').classList.toggle('hide-bottom-analyst'); let icon = this.querySelector('i'); if(this.closest('tbody').classList.contains('hide-bottom-analyst')) { icon.className = 'fas fa-chevron-down'; this.innerHTML = 'Show Analyst Match Data <i class=\\'fas fa-chevron-down\\'></i>'; } else { icon.className = 'fas fa-chevron-up'; this.innerHTML = 'Hide Analyst Match Data <i class=\\'fas fa-chevron-up\\'></i>'; }" style="padding: 6px 16px; font-size: 13px; background: #e2e8f0; border: 1px solid #cbd5e1; border-radius: 4px; font-weight: bold; color: #475569; cursor: pointer; display: inline-flex; align-items: center; gap: 8px;">
                                Show Analyst Match Data <i class="fas fa-chevron-down"></i>
                            </button>
                        </td></tr>`;
                        filteredMatches.push({ _isCustomHtml: true, _html: analystToggleBtn });

                        filteredMatches.push(...topSummaries);
                        filteredMatches.push(...fifaSummaries);
                        filteredMatches.push(buttonsObj);
                        filteredMatches.push(...mainPairContent);
                    }
                    if (year === 'sportsinteraction' && searchId && targetMatch.date) {
                        this.targetAutoOpenSiMatch = { searchId, date: targetMatch.date, homeTeam: targetMatch.homeTeam, awayTeam: targetMatch.awayTeam, targetId: targetMatch.matchId };
                    }
                    if (sameTimeMatches.length === 0) {
                        this.targetAutoOpenMatch = null; // Do not auto-open analyst for the target match when in single match view
                    } else {
                        this.targetAutoOpenMatch = null;
                    }
                    if (targetMatch && targetMatch.group && (year === 'live' || year === 'sportsinteraction' || year === 'playnow' || year === 'tonybet')) {
                        let tYear = targetMatch.date ? targetMatch.date.substring(0, 4) : '2026';
                        let tLeagueId = targetMatch.group.replace(/ /g, '_');
                        if (typeof this.fetchAndRenderLeagueCalendar === 'function') {
                            const leagueMatches = await this.fetchAndRenderLeagueCalendar(tLeagueId, tYear);
                            if (leagueMatches && leagueMatches.length > 0) {
                                filteredMatches.push({
                                    _isCustomHtml: true, _html: `<tr id="sep-all-league" class="bottom-analyst-row"><td colspan="100" style="padding: 0; background: #fff;">
                                    <div style="background-color: #e2e8f0; padding: 6px 16px; font-size: 11px; font-weight: 700; color: #64748b; border-bottom: 1px solid #cbd5e1; border-top: 1px solid #cbd5e1; text-align: center; letter-spacing: 1px;">ALL LEAGUE SCHEDULE (LAST 3, CURRENT, & NEXT ROUNDS)</div>
                                    <div id="all-league-scroll-container" style="max-height: 400px; overflow-y: auto; overflow-x: hidden; border-bottom: 1px solid #cbd5e1;">
                                        <table style="width: 100%; border-collapse: collapse;">
                                            <tbody>` });
                                let groupsMap = {};
                                leagueMatches.forEach(m => {
                                    let g = m.group || 'Unknown';
                                    if (!groupsMap[g]) groupsMap[g] = { name: g, dates: [] };
                                    if (m.date) groupsMap[g].dates.push(m.date);
                                });
                                let groups = Object.values(groupsMap).filter(g => g.dates.length > 0);
                                groups.forEach(g => {
                                    g.dates.sort();
                                    g.minDate = g.dates[0];
                                    g.maxDate = g.dates[g.dates.length - 1];
                                    // Extract numeric round number so Round 14 with early rescheduled
                                    // games doesn't sort before Rounds 4-13 by minDate
                                    const rMatch = g.name.match(/(\d+)/);
                                    g.roundNum = rMatch ? parseInt(rMatch[1], 10) : 9999;
                                });
                                const allRoundsHaveNum = groups.every(g => g.roundNum !== 9999);
                                groups.sort((a, b) => allRoundsHaveNum
                                    ? a.roundNum - b.roundNum
                                    : a.minDate.localeCompare(b.minDate));
                                const dNow = new Date();
                                const tStr = dNow.getFullYear() + '-' + String(dNow.getMonth() + 1).padStart(2, '0') + '-' + String(dNow.getDate()).padStart(2, '0');
                                // Find the round whose date range contains today; fall back to first upcoming, then last
                                let currentIndex = groups.findIndex(g => g.minDate <= tStr && g.maxDate >= tStr);
                                if (currentIndex === -1) currentIndex = groups.findIndex(g => g.minDate > tStr);
                                if (currentIndex === -1) currentIndex = Math.max(0, groups.length - 1);
                                let keepGroups = new Set();
                                for (let i = Math.max(0, currentIndex - 3); i <= Math.min(groups.length - 1, currentIndex + 1); i++) {
                                    keepGroups.add(groups[i].name);
                                }
                                let finalLeagueMatches = leagueMatches.filter(m => keepGroups.has(m.group || 'Unknown'));
                                let sorted = [...finalLeagueMatches].sort((a, b) => b.date.localeCompare(a.date));
                                sorted.forEach(m => m._isAllLeagueMatch = true);
                                filteredMatches.push(...sorted);
                                filteredMatches.push({ _isCustomHtml: true, _html: `</tbody></table></div></td></tr>` });
                            }
                        }
                    }
                }
            }

            let html = ''; let refsHtml = '';
            const now = new Date();
            const todayStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
            const currentDate = todayStr;
            const currentHour = now.getHours();
            let lastRenderedDate = '';
            let lastRenderedHour = '';
            let targetScrollDate = null;

            const finishedMatches = liveRefsAll.filter(m => m.status === 'FT' || m.status === 'Finished');

            if (filteredMatches.length === 0) {
                tbody.innerHTML = `<tr><td colspan="14" style="text-align:center; padding:20px; color:#64748b;">No matches found for this period.</td></tr>`;
                return;
            }

            filteredMatches.forEach((match, index) => {
                if (match._isPairButtons) {
                    let ts = match._targetScores;
                    let periodSuffix = match._period === 'FT' ? ' (excl.90+)' : '';
                    let tsStr = ts[0] + ' & ' + ts[1] + periodSuffix;
                    let btnStyle = "padding: 4px 12px; margin: 0 4px; border: 1px solid #cbd5e1; border-radius: 4px; background: #f8fafc; color: #475569; cursor: pointer; font-size: 11px; font-weight: bold;";
                    let activeStyle = "padding: 4px 12px; margin: 0 4px; border: 1px solid #3b82f6; border-radius: 4px; background: #eff6ff; color: #2563eb; cursor: pointer; font-size: 11px; font-weight: bold;";

                    const currentYearStr = typeof year === 'string' ? `'${year}'` : year;
                    const currentSearchIdStr = typeof searchId === 'string' ? `'${searchId}'` : 'null';
                    const reloadCmd = `let p=this.innerText; let parts=window.location.hash.split('/'); let valid=['1HT1','HT','2HT1','FT']; if(valid.includes(parts[parts.length-1].toUpperCase())){parts[parts.length-1]=p;}else{parts.push(p);} window.history.replaceState(null, '', parts.join('/')); window._pairMatchPeriod=p; if(window.App) window.App.loadSportsSchedule(${currentYearStr}, false, ${currentSearchIdStr});`;

                    let extraLabel = match._noMatches ? `<span style="font-size: 11px; color: #ef4444; margin-left: 12px;">(No historical matches)</span>` : '';

                    html += `<tr ${match._isBottomAnalyst ? 'class="bottom-analyst-row"' : ''}><td colspan="100" style="background-color: #f1f5f9; padding: 12px 16px; border-bottom: 2px solid #cbd5e1; text-align: center;">
                        <span style="font-size: 12px; font-weight: bold; color: #475569; margin-right: 12px;">MATCH PAIRS BY:</span>
                        <button style="${match._period === '1HT1' ? activeStyle : btnStyle}" onclick="${reloadCmd}">1HT1</button>
                        <button style="${match._period === 'HT' ? activeStyle : btnStyle}" onclick="${reloadCmd}">HT</button>
                        <button style="${match._period === '2HT1' ? activeStyle : btnStyle}" onclick="${reloadCmd}">2HT1</button>
                        <button style="${match._period === 'FT' ? activeStyle : btnStyle}" onclick="${reloadCmd}">FT</button>
                        <span style="font-size: 11px; color: #64748b; margin-left: 12px;">(Targets: ${tsStr})</span>
                        ${extraLabel}
                    </td></tr>`;
                    return;
                }
                if (match._isCustomHtml) {
                    html += match._html;
                    return;
                }
                if (match._isDatasetSummary) {
                    if (match._summary && match._summary.length > 0) {
                        let ftComboFirstId = match._ftComboFirstId || {};
                        let topSummary = match._summary.slice(0, 20);
                        topSummary.sort((a, b) => {
                            let [a1, a2] = a.combo.split(',').map(Number);
                            let [b1, b2] = b.combo.split(',').map(Number);
                            if (a1 !== b1) return a1 - b1;
                            return a2 - b2;
                        });
                        let maxPct = Math.max(...topSummary.map(s => parseFloat(s.pct)));
                        if (maxPct === 0) maxPct = 1;
                        let summaryHtml = `<div style="display: flex; justify-content: center; align-items: flex-end; gap: 12px; height: 110px; padding: 16px 10px 4px 10px; overflow-x: auto; flex-wrap: nowrap;">
                            ${topSummary.map(s => {
                            let height = Math.max(2, (parseFloat(s.pct) / maxPct) * 100) + '%';
                            let barColor = parseFloat(s.pct) >= 10 ? '#10b981' : (parseFloat(s.pct) >= 4 ? '#3b82f6' : '#94a3b8');
                            let targetId = ftComboFirstId[s.combo] || '';
                            return `<div style="display: flex; flex-direction: column; align-items: center; width: 44px; flex-shrink: 0;">
                                    <div style="font-size: 9px; color: #475569; font-weight: bold; margin-bottom: 3px;">${s.pct}%</div>
                                    <div style="width: 24px; height: 60px; background: #e2e8f0; border-radius: 3px 3px 0 0; position: relative; display: flex; align-items: flex-end; overflow: hidden; border: 1px solid #cbd5e1; border-bottom: none;" title="${s.count} occurrences">
                                        <div style="width: 100%; height: ${height}; background: ${barColor}; border-radius: 2px 2px 0 0; box-shadow: inset 0 2px 4px rgba(255,255,255,0.3);"></div>
                                    </div>
                                    <div style="font-size: 10px; font-weight: 700; color: #3b82f6; margin-top: 5px; text-align: center; line-height: 1.1; cursor: pointer; text-decoration: underline;"
                                         onclick="var el=document.getElementById('${targetId}'); if(el) el.scrollIntoView({behavior:'smooth',block:'start'});">
                                        ${s.combo}
                                    </div>
                                </div>`;
                        }).join('')}
                        </div>`;
                        let periodLabel = match._period === 'HT' ? 'HT'
                            : match._period === '1HT1' ? '1HT1'
                                : match._period === '2HT1' ? '2HT1'
                                    : 'FT(excl.90+)';

                        html += `<tr ${match._isBottomAnalyst ? 'class="bottom-analyst-row"' : ''}><td colspan="100" style="position: sticky; top: 0; z-index: 99; background-color: #f8fafc; padding: 12px 16px 16px 16px; border-bottom: 2px solid #cbd5e1; text-align: center; font-size: 11px; color: #334155; box-shadow: 0 6px 10px rgba(0,0,0,0.15);">
                            <div style="margin-bottom: 4px; font-weight: 800; color: #475569; letter-spacing: 0.5px;">${match._datasetName} - ${periodLabel} SCORE PROBABILITY (Based on ${match._totalPairs} pairs)</div>
                            ${summaryHtml}
                        </td></tr>`;
                    }
                    return;
                }
                if (match._isSeparator) {
                    let safeKey = match._groupKey.replace(/[^a-zA-Z0-9-]/g, '');
                    html += `<tr id="sep-${safeKey}" ${match._isBottomAnalyst ? 'class="bottom-analyst-row"' : ''}><td colspan="100" style="background-color: #e2e8f0; padding: 6px 16px; font-size: 11px; font-weight: 700; color: #64748b; border-bottom: 1px solid #cbd5e1; border-top: 1px solid #cbd5e1; text-align: center; letter-spacing: 1px;">PAST PAIR GAMES — ${match._groupKey}</td></tr>`;
                    return;
                }
                if (match._isComboHeader) {
                    let periodLabel = match._period === 'HT' ? 'HT Goals'
                        : match._period === '1HT1' ? '1HT1 Goals'
                            : match._period === '2HT1' ? '2HT1'
                                : 'FT(excl.90+)';
                    let [p1, p2] = match._periodStr.split(',');
                    let [f1, f2] = match._ftStr.split(',');
                    html += `<tr id="${match._safeId}" ${match._isBottomAnalyst ? 'class="bottom-analyst-row"' : ''}>
                        <td colspan="100" style="background: #1e293b; padding: 8px 16px; text-align: center; color: #f8fafc; font-size: 13px; font-weight: 800; letter-spacing: 0.5px; border-top: 3px solid #3b82f6; border-bottom: 2px solid #3b82f6;">
                            ${periodLabel}: ${p1} &amp; ${p2}
                            <span style="color: #94a3b8; margin: 0 10px;">|</span>
                            <span style="color: #fbbf24;">Final: ${f1} &amp; ${f2}</span>
                            <span style="font-size: 11px; font-weight: 400; color: #64748b; margin-left: 10px;">(${match._count} pair${match._count > 1 ? 's' : ''})</span>
                        </td>
                    </tr>`;
                    return;
                }
                const rawHomeTeam = match.homeTeam || (match.title && match.title.split(' VS ')[0]) || '';
                const rawAwayTeam = match.awayTeam || (match.title && match.title.split(' VS ')[1]) || '';
                let displayScore = match.score || (match.title && match.title.includes(' VS ') ? 'VS' : '');
                let actualLiveScore = match.score;

                // If a game is live, its time might literally be the string "LIVE". 
                // We must grab the official start time from the FIFA schedule so the "Similar Time Games" filter works.
                if (window._fifa2026Data && window._fifa2026Data.length > 0) {
                    const hT = rawHomeTeam.replace(/\(N\)/gi, '').trim().toLowerCase();
                    const aT = rawAwayTeam.replace(/\(N\)/gi, '').trim().toLowerCase();
                    const officialMatch = window._fifa2026Data.find(m => {
                        if (!m.homeTeam || !m.awayTeam) return false;
                        const mH = m.homeTeam.replace(/\(N\)/gi, '').trim().toLowerCase();
                        const mA = m.awayTeam.replace(/\(N\)/gi, '').trim().toLowerCase();
                        return mH === hT && mA === aT;
                    });
                    if (officialMatch) {
                        if ((match.time === 'LIVE' || !match.time) && officialMatch.time) {
                            match.time = officialMatch.time;
                        }
                        if (officialMatch.group && !match.group) {
                            if (year !== 2026 && year !== 2022 && officialMatch.group.length === 1) {
                                match.group = "Group " + officialMatch.group;
                            } else {
                                match.group = officialMatch.group;
                            }
                        } else if (officialMatch.group && match.group && [2026, 2022, 2018, 2014, 2010, 2006].includes(year)) {
                            // Only override with 'Group L' if we are in the specific tournament views where 'Group L' makes sense
                            match.group = officialMatch.group;
                        }
                    }
                }

                // Try to merge rich data from liveRefsAll before any rendering logic
                if (typeof liveRefsAll !== 'undefined') {
                    const liveMatch = liveRefsAll.find(m =>
                        (match.matchId && m.matchId == match.matchId) ||
                        (m.homeTeam === rawHomeTeam && m.awayTeam === rawAwayTeam && m.date === match.date) ||
                        (m.homeTeam && m.homeTeam.replace(/\(N\)/gi, '').trim() === rawHomeTeam.replace(/\(N\)/gi, '').trim() && m.awayTeam && m.awayTeam.replace(/\(N\)/gi, '').trim() === rawAwayTeam.replace(/\(N\)/gi, '').trim() && m.date === match.date)
                    );

                    if (liveMatch) {
                        if (liveMatch.time && (!match.time || match.time === 'LIVE' || match.time === 'VS')) {
                            match.time = liveMatch.time;
                        }
                        if (liveMatch.status) {
                            match.status = liveMatch.status;
                        }
                        if (!match.goals && liveMatch.goals) {
                            match.goals = liveMatch.goals;
                        }
                        if ((actualLiveScore === 'VS' || !actualLiveScore || actualLiveScore === '0-0') && liveMatch.score && liveMatch.score !== 'VS') {
                            actualLiveScore = liveMatch.score;
                            displayScore = actualLiveScore;
                            match.score = actualLiveScore;
                        }
                        if (liveMatch.odds) {
                            match.odds = liveMatch.odds;
                            match.odds1H = liveMatch.odds1H;
                            match.odds2H = liveMatch.odds2H;
                        }
                    }
                }

                if ((actualLiveScore === 'VS' || !actualLiveScore) && typeof finishedMatches !== 'undefined') {
                    const finishedMatch = finishedMatches.find(m => m.matchId == match.matchId);
                    if (finishedMatch) {
                        if (finishedMatch.score && finishedMatch.score !== 'VS') {
                            actualLiveScore = finishedMatch.score;
                            displayScore = actualLiveScore;
                            match.score = actualLiveScore;
                        } else {
                            actualLiveScore = '0-0';
                            displayScore = actualLiveScore;
                            match.score = actualLiveScore;
                        }
                    }
                }

                if (match.date && match.date !== lastRenderedDate && !isSingleMatchView) {
                    lastRenderedDate = match.date;
                    let dateLabel = match.date;

                    let dDay = match.day;
                    if (!dDay && match.date) {
                        let parts = match.date.split(/[-/]/);
                        if (parts.length === 3) {
                            let y = parts[0].length === 4 ? parseInt(parts[0]) : parseInt('20' + parts[2]);
                            let m = parts[0].length === 4 ? parseInt(parts[1]) - 1 : parseInt(parts[1]) - 1;
                            let d = parts[0].length === 4 ? parseInt(parts[2]) : parseInt(parts[0]);
                            let dateObj = new Date(y, m, d);
                            let days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                            if (!isNaN(dateObj)) dDay = days[dateObj.getDay()];
                        }
                    }

                    if (match.date === todayStr) dateLabel = 'Today - ' + match.date;
                    if (dDay) dateLabel += `  ${dDay}`;

                    html += `
                        <tr id="date-header-${match.date}" style="scroll-margin-top: 60px;">
                            <td colspan="14" style="background-color: #f1f5f9; padding: 12px 16px; font-weight: bold; color: #334155; border-bottom: 2px solid #cbd5e1; text-align: left;">
                                <i class="far fa-calendar-alt" style="margin-right: 8px; color: #64748b;"></i>${dateLabel}
                            </td>
                        </tr>
                    `;
                }

                let goalsHtml = '';
                if (window.activeAnalysisTab === 'goalTime' || !window.activeAnalysisTab) {
                    goalsHtml = match.goals ? match.goals.map(g => `<td style="padding: 12px 8px; text-align: center; color: #3b82f6; font-weight: 600;">${formatGoal(g)}</td>`).join('') : '<td style="padding: 12px 8px; text-align: center;">-</td>'.repeat(8);
                } else {
                    let count1HT1 = 0, count1HT2 = 0, count45Plus = 0, count2HT1 = 0, count2HT2 = 0, count90Plus = 0;
                    let totalRefGoals = 0;
                    let g1 = 0, g2 = 0;
                    if (match.goals) {
                        const countGoals = (goalsStr, minTime, maxTime) => {
                            if (!goalsStr) return 0;
                            let count = 0;
                            goalsStr.split('<br>').forEach(g => {
                                let m = g.match(/(\d+)(?:\+\d+)?'/);
                                if (m) {
                                    let t = parseInt(m[1]);
                                    if (t >= minTime && t <= maxTime) count++;
                                }
                            });
                            return count;
                        };
                        const countAllGoals = (goalsStr) => {
                            if (!goalsStr) return 0;
                            return goalsStr.split('<br>').filter(g => g.trim() !== '').length;
                        };

                        const allFirstHalfGoals = [match.goals[0], match.goals[1], match.goals[2], match.goals[3]].filter(g => g).join('<br>');
                        const allSecondHalfGoals = [match.goals[4], match.goals[5], match.goals[6], match.goals[7]].filter(g => g).join('<br>');

                        count1HT1 = countGoals(allFirstHalfGoals, 0, 22);
                        count1HT2 = countGoals(allFirstHalfGoals, 23, 999);
                        count2HT1 = countGoals(allSecondHalfGoals, 0, 75); // Use 0 to 75 because some 2nd half goals might lack '46' strictly, but they are in the 2nd half buckets anyway
                        count2HT2 = countGoals(allSecondHalfGoals, 76, 999);

                        count45Plus = countAllGoals(match.goals[3]);
                        count90Plus = countAllGoals(match.goals[7]);

                        g1 = 0; g2 = 0;
                        for (let i = 0; i < 4; i++) if (match.goals[i] && match.goals[i] !== '') g1 += match.goals[i].split('<br>').length;
                        for (let i = 4; i < 8; i++) if (match.goals[i] && match.goals[i] !== '') g2 += match.goals[i].split('<br>').length;

                        totalRefGoals = g1 + g2;

                        let sTotal = 0;
                        if (actualLiveScore && actualLiveScore.includes('-')) {
                            const sParts = actualLiveScore.split('-');
                            sTotal = parseInt(sParts[0]) + parseInt(sParts[1]);
                        }

                        match._hasMissingGoalDetails = (sTotal > 0 && (g1 + g2) === 0);
                        if (sTotal > totalRefGoals) totalRefGoals = sTotal;
                    }

                    let colVals = [];
                    for (let i = 0; i < numCols; i++) colVals.push('-');

                    let effectiveTab = window.activeAnalysisTab;
                    if (effectiveTab === 'total' && match.status && (match.status.includes('1H') || match.status.includes('Half'))) {
                        effectiveTab = '1ht'; // Default to 1HT if the match is in the first half
                    }

                    if (effectiveTab === 'total' || effectiveTab === '1ht' || effectiveTab === '2ht') {
                        let goalsToBucket = totalRefGoals;
                        if (effectiveTab === '1ht') goalsToBucket = g1;
                        else if (effectiveTab === '2ht') goalsToBucket = g2;

                        if (match._hasMissingGoalDetails) {
                            // Skip checkmark
                        } else if (goalsToBucket >= maxGoalCols) colVals[maxGoalCols] = '✓';
                        else if (goalsToBucket >= 0) colVals[goalsToBucket] = '✓';

                        colVals[offset] = count1HT1 > 0 ? count1HT1 : '';
                        colVals[offset + 1] = count1HT2 > 0 ? count1HT2 : '';
                        colVals[offset + 2] = count2HT1 > 0 ? count2HT1 : '';
                        colVals[offset + 3] = count2HT2 > 0 ? count2HT2 : '';
                        colVals[offset + 4] = count45Plus > 0 ? count45Plus : '';
                        colVals[offset + 5] = count90Plus > 0 ? count90Plus : '';
                    } else {
                        let valToBucket = -1;
                        if (window.activeAnalysisTab === 'draw') {
                            if (actualLiveScore && actualLiveScore.includes('-')) {
                                const parts = actualLiveScore.split('-');
                                const h = parseInt(parts[0]);
                                const a = parseInt(parts[1]);
                                if (h > a) valToBucket = 0;
                                else if (h === a) valToBucket = 1;
                                else valToBucket = 2;
                            }
                        }
                        if (valToBucket >= 0) {
                            if (valToBucket >= numCols - 1) colVals[numCols - 1] = '✓';
                            else colVals[valToBucket] = '✓';
                        }
                    }

                    let hideCols = window._sportsHideGoalCols || 0;
                    goalsHtml = colOrder.map(i => {
                        if (window.activeAnalysisTab === 'total' && i <= maxGoalCols && i < hideCols) return '';
                        const c = colVals[i];
                        let showBetButtons = false;
                        let effectiveTab = window.activeAnalysisTab;
                        if (effectiveTab === 'total' && match.status && (match.status.includes('1H') || match.status.includes('Half'))) {
                            effectiveTab = '1ht';
                        }
                        if ((year === 'playnow' || year === 'tonybet') && (effectiveTab === 'total' || effectiveTab === '1ht' || effectiveTab === '2ht') && i <= maxGoalCols && i >= 1) {
                            showBetButtons = true;
                        } else if ((year === 'sportsinteraction' || year === 'tonybet') && (effectiveTab === 'total' || effectiveTab === '1ht' || effectiveTab === '2ht') && i <= maxGoalCols && i >= 0) {
                            showBetButtons = true;
                        }

                        if (showBetButtons) {
                            return this.renderBetButtons(match, i, maxGoalCols, c, year, effectiveTab);
                        }
                        return `<td style="padding: 12px 8px; text-align: center; color: ${c !== '-' ? '#3b82f6' : '#94a3b8'}; font-weight: ${c !== '-' ? 'bold' : 'normal'};">${c}</td>`;
                    }).join('');
                }

                const rowBg = match.date === currentDate ? '#ffffff' : '#f8fafc';
                const truncateName = (name) => name && name.length > 14 ? name.substring(0, 14) + '...' : name;
                const homeTeam = truncateName(rawHomeTeam);
                const awayTeam = truncateName(rawAwayTeam);

                let match1HT = '-', match2HT = '-';
                if (match.goals) {
                    let g1 = 0, g2 = 0;
                    for (let i = 0; i < 4; i++) if (match.goals[i] && match.goals[i] !== '') g1 += match.goals[i].split('<br>').length;
                    for (let i = 4; i < 8; i++) if (match.goals[i] && match.goals[i] !== '') g2 += match.goals[i].split('<br>').length;
                    match1HT = g1;
                    match2HT = g2;
                }
                let matchAllGoalTimes = match.goals ? match.goals.filter(g => g).join('<br>').split('<br>').filter(g => g.trim()).map(g => formatGoal(g)).join('<br>') : '';

                let matchScoreTooltip = match.goals ? match.goals.map((g, i) => {
                    let b = '';
                    if (i === 0) b = "1HT 0-15'"; if (i === 1) b = "1HT 16-30'"; if (i === 2) b = "1HT 31-45'"; if (i === 3) b = "1HT 45+'";
                    if (i === 4) b = "2HT 46-60'"; if (i === 5) b = "2HT 61-75'"; if (i === 6) b = "2HT 76-90'"; if (i === 7) b = "2HT 90+'";
                    return g ? `${b}: ${formatGoal(g).replace(/<br>/g, ', ')}` : '';
                }).filter(g => g !== '').join('&#10;') : '';

                if (displayScore && typeof displayScore === 'string' && displayScore.includes('(') && displayScore.endsWith(')')) {
                    const parts = displayScore.split('(');
                    displayScore = `<strong style="font-size: 1.1em;">${parts[0]}</strong><br><span style="font-weight: normal; color: #64748b; font-size: 0.9em;">(${parts[1]}</span>`;
                }

                if (matchScoreTooltip && displayScore !== 'VS') {
                    displayScore = `<span title="${matchScoreTooltip}" style="cursor: help;">${displayScore}</span>`;
                }

                let mId = match.matchId || `match-${index}`;
                let rowIdAttr = `id="live-match-row-${mId}"`;

                if (match.date >= todayStr && !targetScrollDate) {
                    targetScrollDate = match.date;
                }

                let matchRefs = [];
                let h2hRefs = [];
                let homeRefs = [];
                let awayRefs = [];
                let liveRefs = [];

                if (year === 2026) {
                    liveRefs = liveRefsAll.filter(m => m.status && m.status !== 'FT' && m.status !== '0' && m.status.toLowerCase() !== 'delayed');

                    if (match.matchId === '5058661') {
                        // Legacy Korea vs Czech
                        h2hRefs = parsedRefs.filter(r => r.group === 'H2H' && (!r.targetMatchId || r.targetMatchId == match.matchId));
                        homeRefs = parsedRefs.filter(r => r.group === 'KOR Hist');
                        awayRefs = parsedRefs.filter(r => r.group === 'CZE Hist');
                    } else {
                        // New dynamic matches
                        let cleanHome = homeTeam.replace(/\(N\)/gi, '').replace(/'/g, '').trim();
                        let cleanAway = awayTeam.replace(/\(N\)/gi, '').replace(/'/g, '').trim();
                        h2hRefs = parsedRefs.filter(r => r.group === 'H2H' && r.targetMatchId == match.matchId);
                        homeRefs = parsedRefs.filter(r => r.group === `${cleanHome} Hist` && r.targetMatchId == match.matchId);
                        awayRefs = parsedRefs.filter(r => r.group === `${cleanAway} Hist` && r.targetMatchId == match.matchId);
                    }

                    matchRefs = [...liveRefs, ...h2hRefs, ...homeRefs, ...awayRefs];
                }

                // Add the match row
                let hourStr = match.time ? match.time.split(':')[0] : '';
                let hourTargetHtml = '';
                if (hourStr && lastRenderedHour !== `${match.date}-${hourStr}`) {
                    lastRenderedHour = `${match.date}-${hourStr}`;
                    hourTargetHtml = `<div id="time-${match.date}-${hourStr}" style="scroll-margin-top: 60px; position: absolute; margin-top: -60px;"></div>`;
                }

                const idSuffix = match.matchId ? `_id_${match.matchId}` : '';
                let matchLink = `#sports/${year}-FIFA/${encodeURIComponent(rawHomeTeam.replace(/\s+/g, '-'))}-vs-${encodeURIComponent(rawAwayTeam.replace(/\s+/g, '-'))}${idSuffix}`;
                if (year === 'live') {
                    matchLink = `#all_live_soccer/${match.date || todayStr}/${encodeURIComponent(match.leagueName || match.group || 'Unknown')}/${encodeURIComponent(rawHomeTeam.replace(/\s+/g, '-'))}-vs-${encodeURIComponent(rawAwayTeam.replace(/\s+/g, '-'))}${idSuffix}`;
                } else if (year === 'playnow') {
                    matchLink = `#playnow/${match.date || todayStr}/${encodeURIComponent(match.leagueName || match.group || 'Unknown')}/${encodeURIComponent(rawHomeTeam.replace(/\s+/g, '-'))}-vs-${encodeURIComponent(rawAwayTeam.replace(/\s+/g, '-'))}${idSuffix}`;
                } else if (year === 'sportsinteraction') {
                    const siIdSuffix = match.siMatchId ? `_id_${match.siMatchId}` : idSuffix;
                    matchLink = `#sportsinteraction/${encodeURIComponent((match.group || 'Unknown').replace(/\s+/g, '-'))}/${encodeURIComponent(rawHomeTeam.replace(/\s+/g, '-'))}-${encodeURIComponent(rawAwayTeam.replace(/\s+/g, '-'))}${siIdSuffix}`;
                } else if (year === 'tonybet') {
                    const tonyIdSuffix = match.siMatchId ? `_id_${match.siMatchId}` : idSuffix;
                    matchLink = `#tonybet/${encodeURIComponent((match.group || 'Unknown').replace(/\s+/g, '-'))}/${encodeURIComponent(rawHomeTeam.replace(/\s+/g, '-'))}-${encodeURIComponent(rawAwayTeam.replace(/\s+/g, '-'))}${tonyIdSuffix}`;
                }

                let extraTrAttrs = match._isAllLeagueMatch ? `data-league-date="${match.date}"` : '';
                html += `
                    <tr ${rowIdAttr} ${match._isBottomAnalyst ? 'class="bottom-analyst-row"' : ''} ${extraTrAttrs} style="background-color: ${rowBg}; border-bottom: 1px solid #e2e8f0; transition: background-color 0.2s;">
                        <td style="padding: 12px 16px; color: #475569; position: relative; font-weight: 500;${match.matchId ? ' cursor: pointer;' : ''}" ${match.matchId ? `onclick="window.open('https://analyse.7msport.com/${match.matchId}/index.shtml', '_blank');"` : ''}>
                            ${hourTargetHtml}
                            ${match._isAllLeagueMatch ?
                        `<a href="${matchLink}" onclick="event.stopPropagation();" style="font-size: 12px; color: #475569; font-weight: bold; text-decoration: underline;">${match.date}</a>`
                        :
                        `<a href="${matchLink}" onclick="event.stopPropagation();" class="live-match-time" data-si-home="${rawHomeTeam.replace(/"/g, '&quot;')}" data-si-away="${rawAwayTeam.replace(/"/g, '&quot;')}" style="color: inherit; text-decoration: underline;">${(match.time === 'LIVE' ? '' : match.time) || ''}</a>`
                    }
                        </td>
                        <td class="live-match-status" data-playnow-id="${match.playnowId || match.matchId || ''}" data-si-home="${rawHomeTeam.replace(/"/g, '&quot;')}" data-si-away="${rawAwayTeam.replace(/"/g, '&quot;')}" style="padding: 12px 16px; text-align: center; font-weight: bold; font-size: 11px;">
                            ${match._isAllLeagueMatch ? (match.time || '') : (match._isPastPair && match.matchId ? `<span style="color: #64748b;" title="Match ID">${match.matchId}</span>` : (match.status === 'FT' ? `<span style="color: #64748b;">FT</span>` : (match.status && match.status.toUpperCase() !== 'ET' ? `<span style="color: #ef4444;">${match.status}</span>` : '')))}
                        </td>
                        <td style="padding: 12px 16px; text-align: center;">
                            <span style="${[2026, 2022, 2018, 2014, 2010, 2006].includes(year) ? 'background: #e0e7ff; color: #3730a3;' : 'color: #64748b;'} padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600;">${(() => {
                        let gVal = match.group || '';
                        let cleanG = gVal.replace(/group/ig, '').trim();
                        let displayG = gVal;
                        if ([2026, 2022, 2018, 2014, 2010, 2006].includes(year)) displayG = 'Group ' + cleanG;
                        else if (cleanG.length === 1 && /^[A-Z]$/i.test(cleanG)) displayG = 'Group ' + cleanG.toUpperCase();
                        
                        let leagueKey = (match.leagueName || match.group || '').replace(/ /g, '_');
                        let catalogEntry = window.LEAGUE_CATALOG && window.LEAGUE_CATALOG[leagueKey];
                        if (catalogEntry && catalogEntry.id) {
                            return `<a href="https://data.7msport.com/matches_data/${catalogEntry.id}/en/index.shtml" target="_blank" onclick="event.stopPropagation(); window.open(this.href, '7mLeague', 'width=1000,height=800,scrollbars=yes,resizable=yes'); return false;" style="color: inherit; text-decoration: underline;" title="Open 7m League Page">${displayG}</a>`;
                        }
                        return displayG;
                    })()
                    }</span>
                        </td>
                        <td style="padding: 12px 16px; color: #1e293b; font-weight: 500; max-width: 160px; white-space: normal; word-wrap: break-word; line-height: 1.5;">
                            <div><a href="${matchLink}" style="color: inherit; text-decoration: none; display: block; width: 100%;">${homeTeam}</a></div>
                            <div><a href="${matchLink}" style="color: inherit; text-decoration: none; display: block; width: 100%;">${awayTeam}</a></div>
                        </td>
                        <td class="live-match-score" data-playnow-id="${match.playnowId || match.matchId || ''}" data-si-home="${rawHomeTeam.replace(/"/g, '&quot;')}" data-si-away="${rawAwayTeam.replace(/"/g, '&quot;')}" style="padding: 12px 16px; color: #1e293b; font-weight: 600; text-align: center;">
                            <span class="score-text">${displayScore}</span>
                            ${((year === 2026 || year === 'playnow' || year === 'sportsinteraction' || year === 'tonybet' || year === 'live') && match.matchId && !match.isUnmatched && !match.matchId.toString().startsWith('120')) ? `<br><a href="javascript:void(0)" style="display: inline-block; margin-top: 4px; padding: 2px 6px; font-size: 10px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 4px; color: #475569; cursor: pointer; text-decoration: none;" onclick="event.stopPropagation(); event.preventDefault(); window.App.toggleMatchRefs('${match.matchId}', '${rawHomeTeam.replace(/'/g, "\\'")}', '${rawAwayTeam.replace(/'/g, "\\'")}', '${(match.status || '').replace(/'/g, "\\'")}', '${(match.score || '').replace(/'/g, "\\'")}', false, false, '${(match.date || '').replace(/'/g, "\\'")}')" id="toggle-refs-btn-${match.matchId}">Analyst</a>` : (year === 'sportsinteraction' && (match.isUnmatched || !match.matchId) ? `<br><button onclick="event.stopPropagation(); window.App.promptMatchGame('${rawHomeTeam.replace(/'/g, "\\'")}', '${rawAwayTeam.replace(/'/g, "\\'")}', '${(match.group || '').replace(/'/g, "\\'")}')" style="display: inline-block; margin-top: 4px; padding: 2px 6px; font-size: 10px; background: #3b82f6; border: 1px solid #2563eb; border-radius: 4px; color: white; cursor: pointer;">Match</button>` : '')}
                            ${match._hasMissingGoalDetails ? `<br><a href="javascript:void(0)" style="display: inline-block; margin-top: 4px; padding: 2px 6px; font-size: 10px; background: #3b82f6; border: 1px solid #2563eb; border-radius: 4px; color: white; cursor: pointer; text-decoration: none;" onclick="event.stopPropagation(); event.preventDefault(); if(window.App) window.App.fetchSofascoreGoals('${match.matchId}', '${match.date || ''}', '${rawHomeTeam.replace(/'/g, "\\'")}', '${rawAwayTeam.replace(/'/g, "\\'")}', '${(match.score || '').replace(/'/g, "\\'")}', this);">SofaScore</a>` : ''}
                            ${(match.matchId && !match.matchId.toString().startsWith('120') && match.status !== 'TBD' && match.status !== 'CANC') ? `<a href="javascript:void(0)" style="display: inline-block; margin-top: 4px; margin-left: 4px; padding: 2px 6px; font-size: 10px; background: #10b981; border: 1px solid #059669; border-radius: 4px; color: white; cursor: pointer; text-decoration: none;" onclick="event.stopPropagation(); event.preventDefault(); if(window.App) window.App.fetch7mGoals('${match.matchId}', '${match.date || ''}', '${rawHomeTeam.replace(/'/g, "\\'")}', '${rawAwayTeam.replace(/'/g, "\\'")}', '${(match.score || '').replace(/'/g, "\\'")}', this);">7m Goals</a>` : ''}
                        </td>
                        <td class="live-match-goal-time" data-si-home="${rawHomeTeam.replace(/"/g, '&quot;')}" data-si-away="${rawAwayTeam.replace(/"/g, '&quot;')}" style="padding: 12px 16px; text-align: center; color: #64748b; font-size: 0.85em; max-width: 120px; white-space: normal; line-height: 1.4;">${matchAllGoalTimes}</td>
                        <td style="padding: 12px 4px; text-align: center; color: #475569; font-weight: 600;">${match1HT}</td>
                        <td style="padding: 12px 4px; text-align: center; color: #475569; font-weight: 600;">${match2HT}</td>
                        ${(year === 'playnow' || year === 'tonybet') ? `
                        <td style="padding: 12px 16px; text-align: left; vertical-align: middle;">
                            ${match.odds && match.odds.all && match.odds.all.length > 0 ? match.odds.all.map(odd => `<div style="padding: 4px; border: 1px solid #e2e8f0; border-radius: 4px; margin-bottom: 4px; background: white; font-size: 0.85em; font-weight: 500; color: #334155;">${odd}</div>`).join('') : '<span style="color: #94a3b8; font-size: 0.85em;">No odds</span>'}
                        </td>
                        <td style="padding: 12px 16px; text-align: left; vertical-align: middle;">
                            ${(() => {
                            if (typeof window !== "undefined" && window.App && typeof window.App.renderPlaynowSiCrossMatch === "function") {
                                return window.App.renderPlaynowSiCrossMatch(match, year, rawHomeTeam, rawAwayTeam);
                            }
                            return "";
                        })()}
                        </td>
                        <td style="padding: 12px 16px; text-align: center; vertical-align: middle; color: #64748b; font-size: 11px; font-weight: 500;">
                            ${(() => {
                            if (typeof window !== "undefined" && window.App && typeof window.App.getPlaynowSiMatchId === "function") {
                                return window.App.getPlaynowSiMatchId(match, year, rawHomeTeam, rawAwayTeam);
                            }
                            return "-";
                        })()}
                        </td>
                        ` : ''}
                        ${goalsHtml}
                    </tr>
                `;

                if (targetMatch && match.matchId === targetMatch.matchId && (year === 2026 || year === 'playnow' || year === 'sportsinteraction' || year === 'tonybet' || year === 'live') && (liveRefsAll.length > 0 || finishedMatches.length > 0)) {
                    let filteredFinishedMatches = finishedMatches;
                    let filteredLiveRefsAll = liveRefsAll;

                    let tMatchGroup = (targetMatch && targetMatch.group) ? targetMatch.group : '';

                    if (targetMatch && targetMatch.matchId) {
                        if (window._fifa2026Data && window._fifa2026Data.some(m => String(m.matchId) === String(targetMatch.matchId))) {
                            tMatchGroup = 'World Cup 2026';
                        } else {
                            const refMatch = liveRefsAll.find(r => String(r.matchId) === String(targetMatch.matchId));
                            if (refMatch && refMatch.group) tMatchGroup = refMatch.group;
                        }
                    }

                    if (!tMatchGroup || tMatchGroup === 'SI Live Soccer' || /^[A-L]$/.test(tMatchGroup)) {
                        const tMatch = liveRefsAll.find(m => m.homeTeam === rawHomeTeam || m.awayTeam === rawAwayTeam) || finishedMatches.find(m => m.homeTeam === rawHomeTeam || m.awayTeam === rawAwayTeam);
                        if (tMatch && tMatch.group) tMatchGroup = tMatch.group;
                    }
                    if (/^[A-L]$/.test(tMatchGroup)) tMatchGroup = 'World Cup 2026';

                    if (tMatchGroup) {
                        filteredFinishedMatches = finishedMatches.filter(m => {
                            if (tMatchGroup.toUpperCase().includes('WORLD CUP')) {
                                return m.group === tMatchGroup || m.isFifa;
                            }
                            return m.group === tMatchGroup;
                        });
                    } else {
                        filteredFinishedMatches = [];
                    }

                    let liveTotalScore = -1;
                    if (actualLiveScore && actualLiveScore.includes('-')) {
                        const parts = actualLiveScore.split('-');
                        liveTotalScore = parseInt(parts[0]) + parseInt(parts[1]);
                    }

                    if (liveTotalScore >= 0) {
                        const targetScore = Math.min(liveTotalScore, 6);
                        const filterByScore = (ref) => {
                            let totalRefGoals = 0;
                            if (ref.goals) {
                                let g1 = 0, g2 = 0;
                                for (let i = 0; i < 4; i++) if (ref.goals[i] && ref.goals[i] !== '') g1 += ref.goals[i].split('<br>').length;
                                for (let i = 4; i < 8; i++) if (ref.goals[i] && ref.goals[i] !== '') g2 += ref.goals[i].split('<br>').length;
                                totalRefGoals = g1 + g2;
                            }
                            if (ref.score && ref.score.includes('-')) {
                                const parts = ref.score.split('-');
                                const scoreTotal = parseInt(parts[0]) + parseInt(parts[1]);
                                if (scoreTotal > totalRefGoals) totalRefGoals = scoreTotal;
                            }
                            return totalRefGoals >= targetScore;
                        };
                        const isWorldCup = tMatchGroup && tMatchGroup.toUpperCase().includes('WORLD CUP');
                        if (!isWorldCup) {
                            filteredFinishedMatches = filteredFinishedMatches.filter(filterByScore);
                            filteredLiveRefsAll = filteredLiveRefsAll.filter(filterByScore);
                        } else {
                            const now = new Date();
                            const dPrev3 = new Date(now);
                            dPrev3.setDate(now.getDate() - 3);
                            const dPrev3Str = dPrev3.getFullYear() + '-' + String(dPrev3.getMonth() + 1).padStart(2, '0') + '-' + String(dPrev3.getDate()).padStart(2, '0');

                            const dNext1 = new Date(now);
                            dNext1.setDate(now.getDate() + 1);
                            const dNext1Str = dNext1.getFullYear() + '-' + String(dNext1.getMonth() + 1).padStart(2, '0') + '-' + String(dNext1.getDate()).padStart(2, '0');

                            // Build pool from ALL sources: liveRefsAll (last 5 days fetched above), plus FIFA 2026 schedule matches
                            const allSources = [...(this.liveRefsAll || []), ...(matches || []), ...fifa2026Data];
                            const allPool = [];
                            const seen = new Set();
                            allSources.forEach(m => {
                                let key = m.matchId ? String(m.matchId) : (m.homeTeam + '-' + m.awayTeam + '-' + (m.date || ''));
                                if (!seen.has(key)) {
                                    seen.add(key);
                                    allPool.push(m);
                                } else {
                                    // Merge important data if the same match exists in multiple sources
                                    let existing = allPool.find(x => {
                                        let xKey = x.matchId ? String(x.matchId) : (x.homeTeam + '-' + x.awayTeam + '-' + (x.date || ''));
                                        return xKey === key;
                                    });
                                    if (existing) {
                                        if (m.isFifa) {
                                            existing.isFifa = true;
                                            if (m.date) existing.date = m.date;
                                            if (m.time) existing.time = m.time;
                                        }
                                        if (!existing.goals && m.goals) existing.goals = m.goals;
                                        if (!existing.score && m.score) existing.score = m.score;
                                    }
                                }
                            });

                            filteredFinishedMatches = allPool.filter(m => {
                                // Accept any FIFA/World Cup group match in the date window
                                const isWCMatch = m.isFifa || (m.group && (
                                    m.group === tMatchGroup ||
                                    m.group.toUpperCase().replace(/-/g, ' ').includes('WORLD CUP') ||
                                    /^[A-L]$/.test(m.group)
                                ));
                                if (!isWCMatch) return false;
                                if (!m.date) return false;
                                return m.date >= dPrev3Str && m.date <= dNext1Str;
                            });

                            // Order by date desc, then time desc
                            filteredFinishedMatches.sort((a, b) => {
                                const dateA = a.date || '';
                                const dateB = b.date || '';
                                if (dateA !== dateB) return dateA > dateB ? -1 : 1;
                                const timeA = a.time || '';
                                const timeB = b.time || '';
                                return timeA > timeB ? -1 : 1;
                            });
                        }

                        if (filteredFinishedMatches.length > 0) {
                            let matchGroup = tMatchGroup || 'League';
                            if (matchGroup === 'League' && filteredFinishedMatches[0] && filteredFinishedMatches[0].group) {
                                matchGroup = filteredFinishedMatches[0].group;
                            }
                            refsHtml += this.renderReferenceGroup(`${matchGroup} Games Summary`, filteredFinishedMatches, `league-${match.matchId}`, match.matchId, match.status, { forceDisplay: isSingleMatchView });

                            // --- NEW: Similar Time Games Summary ---
                            if (match.time && match.time.includes(':')) {
                                const [tHStr, tMStr] = match.time.split(':');
                                const targetMins = parseInt(tHStr, 10) * 60 + parseInt(tMStr, 10);
                                if (!isNaN(targetMins)) {
                                    const similarTimeMatches = filteredFinishedMatches.filter(m => {
                                        if (!m.time || !m.time.includes(':')) return false;
                                        // Include matches strictly less than 2 hours away (< 120 mins)
                                        const [mH, mM] = m.time.split(':');
                                        const mins = parseInt(mH, 10) * 60 + parseInt(mM, 10);
                                        return Math.abs(mins - targetMins) < 120;
                                    });

                                    if (similarTimeMatches.length > 0) {
                                        // Avoid rendering an identical table if ALL games happen to be in the same time block
                                        if (similarTimeMatches.length !== filteredFinishedMatches.length) {
                                            const lowerH = Math.floor(Math.max(0, targetMins - 119) / 60);
                                            const upperH = Math.floor(Math.min(23 * 60 + 59, targetMins + 119) / 60);
                                            const timeLabel = `${lowerH}:00 - ${upperH}:59`;
                                            refsHtml += this.renderReferenceGroup(`${matchGroup} Similar Time Games (${timeLabel})`, similarTimeMatches, `simtime-${match.matchId}`, match.matchId, match.status, { forceDisplay: isSingleMatchView });
                                        }
                                    }
                                }
                            }
                        }

                        if (false && filteredLiveRefsAll.length > 0) {
                            let liveRefsByHour = {};
                            filteredLiveRefsAll.forEach(ref => {
                                if (ref.date !== todayStr) return;
                                let hourStr = 'Unknown';
                                if (ref.time && ref.time.includes(':')) {
                                    let parts = ref.time.split(':');
                                    let h = parseInt(parts[0], 10);
                                    let m = parseInt(parts[1], 10);
                                    if (m >= 45) h = (h + 1) % 24;
                                    hourStr = String(h).padStart(2, '0');
                                }
                                if (!liveRefsByHour[hourStr]) liveRefsByHour[hourStr] = [];
                                liveRefsByHour[hourStr].push(ref);
                            });

                            let matchHourStr = match.time ? match.time.split(':')[0] : '';
                            let allHours = Object.keys(liveRefsByHour).sort((a, b) => b.localeCompare(a));

                            let normalHours = allHours.filter(h => h === 'Unknown' || parseInt(h) <= currentHour);

                            let sameTime = matchHourStr !== '' ? [matchHourStr] : [];
                            let afterTime = normalHours.filter(h => h !== 'Unknown' && h > matchHourStr && h !== matchHourStr);
                            let beforeTime = [];
                            let mHourNum = parseInt(matchHourStr);
                            if (!isNaN(mHourNum)) {
                                for (let i = 1; i <= 6; i++) {
                                    let h = mHourNum - i;
                                    if (h >= 0) {
                                        beforeTime.push(String(h).padStart(2, '0'));
                                    }
                                }
                            }
                            let unknownTime = normalHours.filter(h => h === 'Unknown');

                            let sortedHoursItems = [];
                            if (match.status === 'FT' || match.date < todayStr) {
                                sortedHoursItems = [
                                    ...sameTime.map(h => ({ hour: h, isDarker: true, noRed: true })),
                                    ...beforeTime.map(h => ({ hour: h, isDarker: false, noRed: false }))
                                ];
                            } else {

                                sortedHoursItems = [
                                    ...sameTime.map(h => ({ hour: h, isDarker: true, noRed: true })),
                                    ...afterTime.map(h => ({ hour: h, isDarker: true, noRed: true })),
                                    ...beforeTime.map(h => ({ hour: h, isDarker: false, noRed: false })),
                                    ...unknownTime.map(h => ({ hour: h, isDarker: false, noRed: false }))
                                ];
                            }

                            sortedHoursItems.forEach(item => {
                                let title = item.hour === 'Unknown' ? 'Live Games (Time Unknown)' : `Live Games (${item.hour}:00)`;
                                if (match.status === 'FT' || match.date < todayStr) title = `Today Result (${item.hour}:00)`;

                                let matchesForHour = liveRefsByHour[item.hour];
                                if (!matchesForHour) return;
                                matchesForHour.sort((a, b) => {
                                    const timeA = a.time || '';
                                    const timeB = b.time || '';
                                    return timeA < timeB ? 1 : (timeA > timeB ? -1 : 0);
                                });

                                refsHtml += this.renderReferenceGroup(title, matchesForHour, `live-${item.hour}-${match.matchId}`, match.matchId, match.status, { darkerBg: item.isDarker, noRedBar: item.noRed, forceDisplay: isSingleMatchView });
                            });
                        }
                    }
                }
            });


            if (year === 'live' && !isSingleMatchView && typeof liveRefsAll !== 'undefined' && liveRefsAll.length > 0) {
                let liveRefsByHour = {};
                liveRefsAll.forEach(ref => {
                    if (ref.date !== todayStr) return;
                    let hourStr = 'Unknown';
                    if (ref.time && ref.time.includes(':')) {
                        let parts = ref.time.split(':');
                        let h = parseInt(parts[0], 10);
                        let m = parseInt(parts[1], 10);
                        if (m >= 45) h = (h + 1) % 24;
                        hourStr = String(h).padStart(2, '0');
                    }
                    if (!liveRefsByHour[hourStr]) liveRefsByHour[hourStr] = [];
                    liveRefsByHour[hourStr].push(ref);
                });

                let allHours = Object.keys(liveRefsByHour).sort((a, b) => b.localeCompare(a));
                let globalSummaryHtml = '';

                allHours.forEach(hour => {
                    let title = hour === 'Unknown' ? 'Live Games Summary (Time Unknown)' : `Live Games Summary (${hour}:00)`;
                    let matchesForHour = liveRefsByHour[hour];
                    matchesForHour.sort((a, b) => {
                        const timeA = a.time || '';
                        const timeB = b.time || '';
                        return timeA < timeB ? 1 : (timeA > timeB ? -1 : 0);
                    });
                    globalSummaryHtml += this.renderReferenceGroup(title, matchesForHour, `global-live-${hour}`, `global-${hour}`, null, { darkerBg: true, noRedBar: false, forceDisplay: true });
                });

                html = globalSummaryHtml + html;
            }

            tbody.innerHTML = html + refsHtml;
            if (isSingleMatchView) {
                tbody.classList.add('hide-bottom-analyst');
            } else {
                tbody.classList.remove('hide-bottom-analyst');
            }
            console.log(`[loadSportsSchedule] Finished generating HTML and injected into tbody. Rows: ${html.split('<tr').length}`);
            if (year === 'playnow' && typeof window.App.fetchPlaynowOdds === 'function') {
                window.App.fetchPlaynowOdds();
            }
            if (this.targetAutoOpenSiMatch) {
                const si = this.targetAutoOpenSiMatch;
                if (typeof this.toggleSiMatchDetails === 'function') {
                    window._autoFetchedMatches = window._autoFetchedMatches || new Set();
                    const isRetry = window._autoFetchedMatches.has(si.searchId);
                    window._autoFetchedMatches.add(si.searchId);

                    this.toggleSiMatchDetails(si.searchId, si.date, si.homeTeam, si.awayTeam, si.targetId, isRetry);
                }
                this.targetAutoOpenSiMatch = null;
                this.activeMatchAutoOpened = true;
            }

            let alreadyOpened = new Set();
            if (this.targetAutoOpenMatch) {
                const am = this.targetAutoOpenMatch;
                alreadyOpened.add(String(am.matchId));

                window._autoFetchedMatches = window._autoFetchedMatches || new Set();
                const isRetry = window._autoFetchedMatches.has(am.matchId);
                window._autoFetchedMatches.add(am.matchId);

                this.toggleMatchRefs(am.matchId, am.homeTeam, am.awayTeam, am.status, am.actualLiveScore, true, isRetry, am.date || '');
                this.targetAutoOpenMatch = null;
                this.activeMatchAutoOpened = true;

                setTimeout(() => {
                    const row = document.getElementById(`live-match-row-${am.matchId}`);
                    if (row) {
                        const scrollContainer = document.querySelector('#sports-view .eo-table-wrap') || document.getElementById('sports-view');
                        if (scrollContainer) {
                            const y = row.getBoundingClientRect().top + scrollContainer.scrollTop - scrollContainer.getBoundingClientRect().top - 100;
                            scrollContainer.scrollTo({ top: y, behavior: 'smooth' });
                        }
                    }
                }, 200);
            }

            this.expandedMatchRefs = this.expandedMatchRefs || {};

            Object.values(this.expandedMatchRefs).forEach(data => {
                if (data && data.matchId && !alreadyOpened.has(String(data.matchId))) {
                    alreadyOpened.add(String(data.matchId));
                    setTimeout(() => {
                        this.toggleMatchRefs(data.matchId, data.homeTeam, data.awayTeam, data.matchStatus, data.score, true, false, data.date || '');
                    }, 100);
                }
            });

            if (targetScrollDate && !isSingleMatchView) {
                this.targetScrollDate = targetScrollDate;
                /* Auto-scroll on load disabled
                setTimeout(() => {
                    const row = document.getElementById(`date-header-${targetScrollDate}`);
                    if (row) {
                        const scrollContainer = document.querySelector('#sports-view .eo-table-wrap') || document.getElementById('sports-view') || window;
                        const y = row.getBoundingClientRect().top + (scrollContainer.scrollTop || window.scrollY) - (scrollContainer.getBoundingClientRect ? scrollContainer.getBoundingClientRect().top : 0) - 100;
                        scrollContainer.scrollTo({top: y, behavior: 'smooth'});
                    }
                }, 300);
                */
            }

            if (isSingleMatchView) {
                setTimeout(() => {
                    const rows = Array.from(document.querySelectorAll('tr[data-league-date]'));
                    let targetEl = null;
                    let minDiff = Infinity;

                    rows.forEach(r => {
                        let d = r.getAttribute('data-league-date');
                        if (d >= todayStr) {
                            let diff = new Date(d) - new Date(todayStr);
                            if (diff <= minDiff) {
                                minDiff = diff;
                                targetEl = r;
                            }
                        }
                    });

                    if (!targetEl && rows.length > 0) {
                        targetEl = rows[0];
                    }

                    if (targetEl) {
                        console.log('[loadSportsSchedule] Auto-scrolling to league date:', targetEl.getAttribute('data-league-date'));

                        const innerContainer = document.getElementById('all-league-scroll-container');
                        if (innerContainer) {
                            const y = targetEl.offsetTop - innerContainer.offsetTop - 50;
                            innerContainer.scrollTo({ top: y, behavior: 'smooth' });
                        } else {
                            targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }

                        targetEl.style.backgroundColor = '#fef08a';
                        setTimeout(() => { targetEl.style.backgroundColor = ''; }, 2000);
                    } else {
                        console.log('[loadSportsSchedule] Auto-scrolling failed: No targetEl found.');
                    }
                }, 800);
            }


            if (window.App && window.App._pendingPlaynowDailyMatches && Object.keys(window.App._pendingPlaynowDailyMatches).length > 0) {
                try {
                    const now = new Date();
                    const dateStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
                    fetch('/api/sports/playnow/daily-matches', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            dateStr: dateStr,
                            mappings: window.App._pendingPlaynowDailyMatches
                        })
                    });
                    window.App._pendingPlaynowDailyMatches = {};
                } catch (e) { }
            }

            // Auto-refresh the dashboard every 3 minutes (only for main live tabs, not SI/Playnow which silently poll)
            // window.liveGameIntervalId = setInterval(() => {
            // liveGameIntervalId removed
            // }, 180000);

        } catch (error) {
            console.error('Error loading sports schedule:', error);
            tbody.innerHTML = `<tr><td colspan="14" style="text-align:left; padding:20px; color:red; font-family: monospace;"><b>Failed to load schedule.</b><br>${error.message}<br><pre>${error.stack}</pre></td></tr>`;
        }
    }
};
