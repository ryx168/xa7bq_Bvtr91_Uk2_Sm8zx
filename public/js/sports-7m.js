/**
 * sports-7m.js
 * Integration mixin for 7msport live scores, scrapers, and history references.
 */

export const SportsMixin = {
    async toggleMatchRefs(matchId, homeTeam, awayTeam, matchStatus, liveScore, autoExpand = false, isRetry = false, matchDate = '') {
        const btn = document.getElementById(`toggle-refs-btn-${matchId}`);
        const matchRow = btn ? btn.closest('tr') : null;
        if (!matchRow) return;

        this.expandedMatchRefs = this.expandedMatchRefs || {};
        
        // If already loaded, just toggle display
        const existingRows = document.querySelectorAll(`.ref-group-hist-${matchId}`);
        
        if (existingRows.length > 0) {
            let isHidden = existingRows[0].style.display === 'none';
            existingRows.forEach(r => {
                // When expanding, only show the group headers (summary rows) initially
                // Details will remain hidden until their group header is clicked
                if (isHidden && r.className.includes('ref-detail-row-')) return;
                r.style.display = isHidden ? 'table-row' : 'none';
            });
            
            if (isHidden) {
                this.expandedMatchRefs[matchId] = { matchId, homeTeam, awayTeam, matchStatus, date: matchDate };
                if (btn) btn.innerHTML = 'Hide Refs';
            } else {
                this.expandedMatchRefs[matchId] = null; // Mark as explicitly closed
                if (btn) btn.innerHTML = 'Analyst';
            }
            return;
        }

        // Fetch individual refs file
        if (btn) {
            btn.innerHTML = 'Loading...';
            btn.disabled = true;
        }

        try {
            const fetchWithTimeout = (url, ms = 10000) => {
                return Promise.race([
                    fetch(url),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Fetch timeout after ' + ms + 'ms for ' + url)), ms))
                ]);
            };
            let baseRefUrl = `/sports/refs/${matchId}.json?v=` + Date.now();
            let refUrl = baseRefUrl;
            let hasDatePath = false;
            
            if (matchDate) {
                let parts = matchDate.split('-');
                if (parts.length === 3) {
                    let yyyy = parts[0];
                    let mm = parts[1];
                    let dateStr = matchDate.replace(/-/g, '_');
                    refUrl = `/sports/refs/${yyyy}/${mm}/${dateStr}/${matchId}.json?v=` + Date.now();
                    hasDatePath = true;
                }
            }
            
            let res = await fetchWithTimeout(refUrl);
            
            if (res.status === 404 && hasDatePath) {
                // Fallback to base path for older files (e.g. FIFA 2026 pre-fetched games)
                res = await fetchWithTimeout(baseRefUrl);
            }

            const hardcodedTeamMap = {
                "DR Congo": "Democratic Rep Congo",
                "South Korea": "Korea Republic",
                "Ivory Coast": "Cote d\\Ivoire",
                "Cote d'Ivoire": "Cote d\\Ivoire",
                "USA": "United States",
                "Turkiye": "Turkey"
            };
            
            let localTeamMap = {};
            try {
                localTeamMap = JSON.parse(localStorage.getItem('si_team_map') || '{}');
            } catch(e) {}
            
            let mappedHome = localTeamMap[homeTeam] || hardcodedTeamMap[homeTeam] || homeTeam || '';
            let mappedAway = localTeamMap[awayTeam] || hardcodedTeamMap[awayTeam] || awayTeam || '';

            let cleanHome = mappedHome.replace(/\(N\)/gi, '').replace(/['\\]/g, '').trim();
            let cleanAway = mappedAway.replace(/\(N\)/gi, '').replace(/['\\]/g, '').trim();
            
            let liveTotalScore = -1;
            if (liveScore && liveScore.includes('-')) {
                const parts = liveScore.split('-');
                liveTotalScore = parseInt(parts[0]) + parseInt(parts[1]);
            }

            const filterByScore = (ref) => {
                if (this.currentSportsYear === 'sportsinteraction') return true;
                if (liveTotalScore <= 0) return true;
                let targetScore = Math.min(liveTotalScore, 6);
                let totalRefGoals = 0;
                if (ref.goals) {
                    let g1=0, g2=0;
                    for(let i=0; i<4; i++) if (ref.goals[i] && ref.goals[i] !== '') g1 += ref.goals[i].split('<br>').length;
                    for(let i=4; i<8; i++) if (ref.goals[i] && ref.goals[i] !== '') g2 += ref.goals[i].split('<br>').length;
                    totalRefGoals = g1 + g2;
                }
                if (ref.score && ref.score.includes('-')) {
                    const parts = ref.score.split('-');
                    const scoreTotal = parseInt(parts[0]) + parseInt(parts[1]);
                    if (scoreTotal > totalRefGoals) totalRefGoals = scoreTotal;
                }
                return totalRefGoals >= targetScore;
            };

            let html = '';
            let parseError = false;

            if (res.ok) {
                try {
                    const parsedRefs = await res.json();
                    console.log(`[toggleMatchRefs] Successfully parsed ${parsedRefs.length} items from ${matchId}.json`);
                    
                    let h2hRefs = parsedRefs.filter(r => r.group && r.group.includes('H2H')).filter(filterByScore);
                    let homeRefs = parsedRefs.filter(r => r.group && (r.group.replace(/['\\]/g, '').includes(cleanHome) || r.group.includes('KOR Hist'))).filter(filterByScore);
                    let awayRefs = parsedRefs.filter(r => r.group && (r.group.replace(/['\\]/g, '').includes(cleanAway) || r.group.includes('CZE Hist'))).filter(filterByScore);
                    
                    console.log(`[toggleMatchRefs] cleanHome: "${cleanHome}", cleanAway: "${cleanAway}"`);
                    console.log(`[toggleMatchRefs] h2hRefs: ${h2hRefs.length}, homeRefs: ${homeRefs.length}, awayRefs: ${awayRefs.length}`);

                    html += this.renderReferenceGroup('Head-to-Head Reference Games', h2hRefs, `h2h-${matchId}`, `hist-${matchId}`, matchStatus, { autoExpand });
                    html += this.renderReferenceGroup(`${cleanHome} History`, homeRefs, `home-${matchId}`, `hist-${matchId}`, matchStatus, { autoExpand });
                    html += this.renderReferenceGroup(`${cleanAway} History`, awayRefs, `away-${matchId}`, `hist-${matchId}`, matchStatus, { autoExpand });
                } catch (err) {
                    console.error('Error parsing JSON:', err);
                    parseError = true;
                    if (isRetry) {
                        console.warn("Historical data file still invalid after scraping. Stopping to prevent infinite loop.");
                    } else {
                        this.fetchMatchHistory(matchId, homeTeam, awayTeam, matchDate);
                    }
                }
            } else if (res.status === 404) {
                if (isRetry) {
                    console.warn("Historical data file still not found after scraping. Stopping to prevent infinite loop.");
                } else {
                    // File not found, trigger python scraping via SSE
                    this.fetchMatchHistory(matchId, homeTeam, awayTeam, matchDate);
                }
            } else {
                console.error('Failed to load references', res.status);
            }


            console.log(`[toggleMatchRefs] Final html length: ${html.length}`);

            if (html !== '') {
                matchRow.insertAdjacentHTML('afterend', html);
                
                // Ensure summary rows are also shown when history is first loaded
                const newlyInsertedHeaders = document.querySelectorAll(`.ref-group-header-hist-${matchId}`);
                newlyInsertedHeaders.forEach(r => {
                    r.style.display = 'table-row';
                });
                
                this.expandedMatchRefs = this.expandedMatchRefs || {};
                this.expandedMatchRefs[matchId] = { matchId, homeTeam, awayTeam, matchStatus, date: matchDate };
                
                if (btn) {
                    if (res.ok && !parseError) {
                        btn.innerHTML = 'Hide Refs';
                        btn.disabled = false;
                    } else if (isRetry || parseError) {
                        btn.innerHTML = 'Toggle Refs';
                        btn.disabled = false;
                    }
                }
            } else if (btn) {
                if (res.ok || isRetry || parseError) {
                    btn.innerHTML = 'No Data';
                    setTimeout(() => { if (btn) btn.innerHTML = 'Analyst'; }, 2000);
                    btn.disabled = false;
                }
            }
        } catch (e) {
            console.error(e);
            if (btn) {
                btn.innerHTML = 'Toggle Refs';
                btn.disabled = false;
            }
        }
    },

    syncSportsDrive() {
        const btn = document.getElementById('btn-sports-sync');
        const icon = document.getElementById('sports-sync-icon');
        if (btn) btn.disabled = true;
        if (icon) icon.className = 'fas fa-spinner fa-spin';
        
        // Show a temporary loading row
        const tbody = document.getElementById('sports-table-body');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="12" style="text-align:center; padding:20px; color:#007bff;"><i class="fas fa-spinner fa-spin" style="margin-right:10px;"></i>Downloading latest data from Google Drive...</td></tr>';
        }

        const evtSource = new EventSource('/api/sync-sports');
        evtSource.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.msg) {
                console.log(data.msg);
                if (tbody && data.msg.startsWith('Downloading')) {
                    tbody.innerHTML = `<tr><td colspan="12" style="text-align:center; padding:20px; color:#28a745;"><i class="fas fa-download" style="margin-right:10px;"></i>${data.msg}</td></tr>`;
                }
            }
            if (data.done) {
                evtSource.close();
                if (btn) btn.disabled = false;
                if (icon) icon.className = 'fas fa-sync-alt';
                
                window._sportsCacheBuster = Date.now();
                this.loadSportsSchedule(this.currentSportsYear || 2026);
            }
        };
        evtSource.onerror = (err) => {
            console.error('SSE Error:', err);
            evtSource.close();
            if (btn) btn.disabled = false;
            if (icon) icon.className = 'fas fa-sync-alt';
            alert('Failed to sync sports data. Ensure reply-server is running.');
            this.loadSportsSchedule(this.currentSportsYear || 2026);
        };
    },

    syncLeagueDrive() {
        const btn = document.getElementById('btn-league-sync');
        const icon = document.getElementById('league-sync-icon');
        if (btn) btn.disabled = true;
        if (icon) icon.className = 'fas fa-spinner fa-spin';
        
        const tbody = document.getElementById('sports-table-body');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="12" style="text-align:center; padding:20px; color:#17a2b8;"><i class="fas fa-spinner fa-spin" style="margin-right:10px;"></i>Downloading latest LEAGUE data from Google Drive...</td></tr>';
        }

        const evtSource = new EventSource('/api/sync-leagues');
        evtSource.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.msg) {
                console.log(data.msg);
                if (tbody && data.msg.startsWith('Downloading')) {
                    tbody.innerHTML = `<tr><td colspan="12" style="text-align:center; padding:20px; color:#28a745;"><i class="fas fa-download" style="margin-right:10px;"></i>${data.msg}</td></tr>`;
                }
            }
            if (data.done) {
                evtSource.close();
                if (btn) btn.disabled = false;
                if (icon) icon.className = 'fas fa-sync-alt';
                
                window._sportsCacheBuster = Date.now();
                this.loadSportsSchedule(this.currentSportsYear || 2026);
            }
        };
        evtSource.onerror = (err) => {
            console.error('SSE Error:', err);
            evtSource.close();
            if (btn) btn.disabled = false;
            if (icon) icon.className = 'fas fa-sync-alt';
            alert('Failed to sync league data. Ensure reply-server is running.');
            this.loadSportsSchedule(this.currentSportsYear || 2026);
        };
    },

    fetchLeagueSchedule(targetLeague = null) {
        // Normalize: spaces → underscores (e.g. "FIN D1" → "FIN_D1")
        const rawLeagueId = targetLeague || window._currentLeagueId;
        const leagueId = rawLeagueId ? rawLeagueId.replace(/ /g, '_') : null;
        
        // When viewing live games, use current year as fallback season
        let season = this.currentSportsYear;
        if (!season || season === 'live' || season === 'playnow' || season === 'sportsinteraction') {
            season = new Date().getFullYear().toString();
        }
        
        if (!leagueId) {
            alert("Please select a valid league first.");
            return;
        }
        
        // Disable both buttons (top-level and inline)
        const btn = document.getElementById('btn-fetch-schedule');
        const btnTop = document.getElementById('btn-fetch-schedule-top');
        const icon = document.getElementById('fetch-schedule-icon');
        const iconTop = document.getElementById('fetch-schedule-icon-top');
        if (btn) btn.disabled = true;
        if (btnTop) btnTop.disabled = true;
        if (icon) icon.className = 'fas fa-spinner fa-spin';
        if (iconTop) iconTop.className = 'fas fa-spinner fa-spin';
        
        const tbody = document.getElementById('sports-table-body');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="12" style="text-align:center; padding:20px; color:#007bff;"><i class="fas fa-spinner fa-spin" style="margin-right:10px;"></i>Fetching ${leagueId} schedule for ${season} from 7msport...</td></tr>`;
        }

        const evtSource = new EventSource(`/api/fetch-league-schedule?leagueId=${encodeURIComponent(leagueId)}&season=${encodeURIComponent(season)}`);
        evtSource.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.msg) {
                console.log(data.msg);
                if (tbody && (data.msg.startsWith('Fetching') || data.msg.startsWith('Found') || data.msg.startsWith('Finished'))) {
                    tbody.innerHTML = `<tr><td colspan="12" style="text-align:center; padding:20px; color:#28a745;"><i class="fas fa-download" style="margin-right:10px;"></i>${data.msg}</td></tr>`;
                }
            }
            if (data.done) {
                evtSource.close();
                if (btn) { btn.disabled = false; }
                if (btnTop) { btnTop.disabled = false; }
                if (icon) icon.className = 'fas fa-calendar-alt';
                if (iconTop) iconTop.className = 'fas fa-calendar-alt';
                
                window._sportsCacheBuster = Date.now();
                this.loadSportsSchedule(this.currentSportsYear || 2026);
            }
        };
        evtSource.onerror = (err) => {
            console.error('SSE Error:', err);
            evtSource.close();
            if (btn) btn.disabled = false;
            if (btnTop) btnTop.disabled = false;
            if (icon) icon.className = 'fas fa-calendar-alt';
            if (iconTop) iconTop.className = 'fas fa-calendar-alt';
            alert(`Error fetching ${leagueId} schedule for ${season}`);
            this.loadSportsSchedule(this.currentSportsYear || 2026);
        };
    },

    fetchLiveScores() {
        const btn = document.getElementById('btn-fetch-live');
        const icon = document.getElementById('fetch-live-icon');
        if (btn) btn.disabled = true;
        if (icon) icon.className = 'fas fa-spinner fa-spin';
        
        // Show a temporary loading row
        const tbody = document.getElementById('sports-table-body');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="12" style="text-align:center; padding:20px; color:#007bff;"><i class="fas fa-spinner fa-spin" style="margin-right:10px;"></i>Fetching live scores from 7msport...</td></tr>';
        }

        const evtSource = new EventSource('/api/fetch-live-scores');
        evtSource.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.msg) {
                console.log(data.msg);
                if (tbody && data.msg.startsWith('Fetching')) {
                    tbody.innerHTML = `<tr><td colspan="12" style="text-align:center; padding:20px; color:#28a745;"><i class="fas fa-download" style="margin-right:10px;"></i>${data.msg}</td></tr>`;
                }
            }
            if (data.done) {
                evtSource.close();
                if (btn) btn.disabled = false;
                if (icon) icon.className = 'fas fa-bolt';
                
                window._sportsCacheBuster = Date.now();
                this.loadSportsSchedule(this.currentSportsYear || 2026);
            }
        };
        evtSource.onerror = (err) => {
            console.error('SSE Error:', err);
            evtSource.close();
            if (btn) btn.disabled = false;
            if (icon) icon.className = 'fas fa-bolt';
            alert('Error fetching live scores');
        };
    },

    fetchMatchHistory(matchId, homeTeam, awayTeam, matchDate = '') {
        const btn = document.getElementById(`toggle-refs-btn-${matchId}`);
        if (btn) {
            btn.innerHTML = 'Fetching...';
            btn.disabled = true;
        }
        
        // Show a temporary loading row under the match
        const row = document.getElementById(`live-match-row-${matchId}`) || document.querySelector(`tr:has(#toggle-refs-btn-${matchId})`);
        let loadingRow = document.getElementById(`loading-refs-${matchId}`);
        if (!loadingRow && row && row.parentNode) {
            loadingRow = document.createElement('tr');
            loadingRow.id = `loading-refs-${matchId}`;
            loadingRow.innerHTML = `<td colspan="15" id="loading-refs-text-${matchId}" style="text-align:center; padding:10px; color:#007bff; font-size:12px; background:#f8fafc;"><i class="fas fa-spinner fa-spin" style="margin-right:8px;"></i>Starting fetch...</td>`;
            row.parentNode.insertBefore(loadingRow, row.nextSibling);
        }

        const url = `/api/fetch-match-history?matchId=${encodeURIComponent(matchId)}&homeTeam=${encodeURIComponent(homeTeam)}&awayTeam=${encodeURIComponent(awayTeam)}&matchDate=${encodeURIComponent(matchDate)}`;
        const evtSource = new EventSource(url);
        
        evtSource.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.msg) {
                console.log(data.msg);
                const textCell = document.getElementById(`loading-refs-text-${matchId}`);
                if (textCell) {
                    textCell.innerHTML = `<i class="fas fa-spinner fa-spin" style="margin-right:8px;"></i>${data.msg}`;
                }
            }
            if (data.done) {
                evtSource.close();
                window._sportsCacheBuster = Date.now();
                this.loadSportsSchedule(this.currentSportsYear || 2026).then(() => {
                    setTimeout(() => {
                        this.toggleMatchRefs(matchId, homeTeam, awayTeam, '', '', false, true, matchDate);
                    }, 500);
                });
            }
        };
        
        evtSource.onerror = (err) => {
            console.error('SSE Error:', err);
            evtSource.close();
            alert('Error fetching match history');
            if (btn) {
                btn.innerHTML = 'Toggle Refs';
                btn.disabled = false;
            }
            if (loadingRow) loadingRow.remove();
        };
    },

    startLiveGameIntegration(matchId) {
        if (window.liveGameIntervalId) {
            clearInterval(window.liveGameIntervalId);
        }
        
        const fetchAndUpdate = () => {
            const row = document.getElementById(`live-match-row-${matchId}`);
            if (!row) return; // Tab switched or row not present
            
            const dirId = Math.floor(matchId / 1000);
            const scriptUrl = `https://data.7msport.com/goaldata/en/${dirId}/${matchId}.js?v=${Date.now()}`;
            
            window.d_tm = undefined;
            window.d_bf = undefined;
            
            const script = document.createElement('script');
            script.src = scriptUrl;
            script.onload = () => {
                const d_tm = window.d_tm || [];
                const d_bf = window.d_bf || [];
                const d_pn = window.d_pn || [];
                
                const goals = ['', '', '', '', '', '', '', ''];
                let currentScore = '0-0';
                
                function getGoalBucket(minuteStr) {
                    const val = parseInt(minuteStr.split('+')[0]);
                    if (isNaN(val)) return -1;
                    if (minuteStr.includes('+')) {
                        if (val >= 90) return 7;
                        if (val >= 45) return 3;
                    }
                    if (val <= 15) return 0;
                    if (val <= 30) return 1;
                    if (val < 45) return 2;
                    if (val === 45) return 3;
                    if (val <= 60) return 4;
                    if (val <= 75) return 5;
                    if (val < 90) return 6;
                    return 7;
                }
                
                for (let i = 0; i < d_tm.length; i++) {
                    if (d_bf[i]) {
                        const minute = d_tm[i];
                        const score = d_bf[i];
                        const player = d_pn[i] || '';
                        const bucket = getGoalBucket(minute);
                        if (bucket !== -1) {
                            const existing = goals[bucket];
                            const text = player ? `${minute}' ${player} (${score})` : `${minute}' ${score}`;
                            goals[bucket] = existing ? existing + '<br>' + text : text;
                            currentScore = score;
                        }
                    }
                }
                
                if (row.cells && row.cells.length >= 13) {
                    row.cells[1].innerHTML = `
                        FT
                        <br><span style="color: #64748b; font-size: 11px; font-weight: bold;">FT</span>
                    `;
                    
                    row.cells[4].innerHTML = `<a href="https://data.7msport.com/goaldata/en/${matchId}.shtml" target="_blank" style="color:#007bff; text-decoration:underline;">${currentScore}</a>`;
                    
                    if (window.activeAnalysisTab === 'goalTime') {
                        for (let i = 0; i < 8; i++) {
                            if (5 + i < row.cells.length) {
                                row.cells[5 + i].innerHTML = goals[i] || '-';
                                row.cells[5 + i].style.color = goals[i] ? '#3b82f6' : 'inherit';
                                row.cells[5 + i].style.fontWeight = goals[i] ? '600' : 'normal';
                            }
                        }
                    } else {
                        let numCols = 8;
                        if (window.activeAnalysisTab === 'total' || window.activeAnalysisTab === '1ht' || window.activeAnalysisTab === '2ht') {
                            numCols = window._sportsGoalColMax !== undefined ? window._sportsGoalColMax + 1 : 7;
                        }
                        if (window.activeAnalysisTab === 'draw') numCols = 3;
                        
                        let goals1HT = 0;
                        let goals2HT = 0;
                        for (let i = 0; i < 4; i++) {
                            if (goals[i] && goals[i] !== '') goals1HT += goals[i].split('<br>').length;
                        }
                        for (let i = 4; i < 8; i++) {
                            if (goals[i] && goals[i] !== '') goals2HT += goals[i].split('<br>').length;
                        }
                        
                        let matchTotal = 0;
                        if (currentScore && currentScore.includes('-')) {
                            const parts = currentScore.split('-');
                            matchTotal = parseInt(parts[0]) + parseInt(parts[1]);
                        } else {
                            matchTotal = goals1HT + goals2HT;
                        }
                        
                        let valToBucket = 0;
                        if (window.activeAnalysisTab === 'total') valToBucket = matchTotal;
                        if (window.activeAnalysisTab === '1ht') valToBucket = goals1HT;
                        if (window.activeAnalysisTab === '2ht') valToBucket = goals2HT;
                        if (window.activeAnalysisTab === 'draw') {
                            if (currentScore && currentScore.includes('-')) {
                                const parts = currentScore.split('-');
                                const h = parseInt(parts[0]);
                                const a = parseInt(parts[1]);
                                if (h > a) valToBucket = 0;
                                else if (h === a) valToBucket = 1;
                                else valToBucket = 2;
                            } else {
                                valToBucket = -1;
                            }
                        }
                        
                        let rowCols = Array(numCols).fill('-');
                        if (valToBucket >= 0) {
                            if (valToBucket >= numCols - 1) {
                                rowCols[numCols - 1] = '✓';
                            } else {
                                rowCols[valToBucket] = '✓';
                            }
                        }
                        
                        for (let i = 0; i < numCols; i++) {
                            if (5 + i < row.cells.length) {
                                const c = rowCols[i];
                                row.cells[5 + i].innerHTML = c;
                                row.cells[5 + i].style.color = c === '✓' ? '#3b82f6' : '#94a3b8';
                                row.cells[5 + i].style.fontWeight = c === '✓' ? 'bold' : 'normal';
                            }
                        }
                    }
                }
            };
            document.body.appendChild(script);
        };
        
        fetchAndUpdate();
        // window.liveGameIntervalId = setInterval(fetchAndUpdate, 3600000);
    }
};
