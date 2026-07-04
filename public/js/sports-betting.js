const BETTING_CONFIG_KEY = 'betting_config';

function loadBettingConfig() {
    try {
        const saved = localStorage.getItem(BETTING_CONFIG_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            // set defaults for new properties if missing
            if (parsed.showSI === undefined) parsed.showSI = true;
            if (parsed.showPlayNow === undefined) parsed.showPlayNow = false;
            if (parsed.showTonyBet === undefined) parsed.showTonyBet = false;
            if (parsed.show1xBet === undefined) parsed.show1xBet = true;
            return parsed;
        }
    } catch(e) {}
    return { reducePct: 10, betAmount: 1, minOdds: 1.10, maxGameTime: 45, hideNoProfit: false, showSI: true, showPlayNow: false, showTonyBet: false, show1xBet: true };
}

function saveBettingConfig(cfg) {
    localStorage.setItem(BETTING_CONFIG_KEY, JSON.stringify(cfg));
    fetch('http://192.168.1.178:3002/api/betting/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cfg)
    }).catch(e => console.error('Failed to sync config to backend:', e));
}

const PINNED_MATCHES_KEY = 'betting_pinned_matches';

function loadPinnedMatches() {
    try {
        const saved = localStorage.getItem(PINNED_MATCHES_KEY);
        if (saved) return JSON.parse(saved);
    } catch(e) {}
    return [];
}

function savePinnedMatches(pins) {
    localStorage.setItem(PINNED_MATCHES_KEY, JSON.stringify(pins));
}

function parseGameMinutes(status) {
    if (!status) return null;
    const s = String(status).trim();
    if (s === 'FT' || s === 'ft') return 999;
    if (s === 'HT' || s === 'ht' || s.toLowerCase().includes('halftime')) return 45;
    if (s === 'ET' || s === 'et') return 90;
    if (s === 'PEN' || s === 'pen') return 120;
    // "2H • 106:07" or "1H • 34:20" style (half bullet clock)
    const halfClock = s.match(/^(\d)H\s*[•·]\s*(\d+):(\d+)/i);
    if (halfClock) return parseInt(halfClock[2]);
    
    // Check for "90' +" or "90 +" anywhere (stoppage time)
    const basePlus = s.match(/(\d+)['’]?\s*\+/);
    if (basePlus) return parseInt(basePlus[1]);
    
    // Check for a tick mark indicating minutes e.g. "90'"
    const baseTick = s.match(/(\d+)['’]/);
    if (baseTick) return parseInt(baseTick[1]);
    // Any embedded "MM:SS" clock e.g. "2nd half 90:00" or "106:07"
    const anyClock = s.match(/(\d+):(\d{2})/);
    if (anyClock) return parseInt(anyClock[1]);
    // Negative means pre-game countdown e.g. "-5'"
    const neg = s.match(/^-?(\d+)'?$/);
    if (neg) {
        const raw = parseInt(s);
        return isNaN(raw) ? null : raw; // negative = pre-game
    }
    const plus = s.match(/^(\d+)\+(\d+)'?$/);
    if (plus) return parseInt(plus[1]) + parseInt(plus[2]);
    const plain = s.match(/^(\d+)'?$/);
    if (plain) return parseInt(plain[1]);
    return null;
}

export const SportsBetting = {
    async loadBettingView(isRefresh = false) {
        if (!isRefresh && window.liveGameIntervalId) {
            clearInterval(window.liveGameIntervalId);
        }

        if (!isRefresh) {
            const playnowContainer = document.getElementById('playnow-profile-container');
        if (playnowContainer) playnowContainer.classList.add('hidden');
        
        const tabsContainer = document.getElementById('analysis-tabs-container');
        if (tabsContainer) tabsContainer.style.display = 'none';
        
        const calendarContainer = document.getElementById('last-game-calendar-container');
        if (calendarContainer) calendarContainer.style.display = 'none';

        document.getElementById('sports-title').innerHTML = `<i class="fas fa-chess-king" style="margin-right: 10px; color: #333;"></i>Betting Master (God View)`;
        } // Close first if (!isRefresh)

        // --- Config Panel ---
        const cfg = loadBettingConfig();
        
        if (!isRefresh) {
            let configBar = document.getElementById('betting-config-bar');
        if (!configBar) {
            configBar = document.createElement('div');
            configBar.id = 'betting-config-bar';
            const tableEl = document.getElementById('sports-table-head')?.closest('table');
            if (tableEl) tableEl.parentNode.insertBefore(configBar, tableEl);
        }
        configBar.innerHTML = `
            <div style="display:flex; align-items:center; gap:16px; flex-wrap:wrap; padding:10px 14px; margin-bottom:10px; background:linear-gradient(135deg,#ede9fe,#e0e7ff); border:1px solid #c4b5fd; border-radius:8px; font-size:12px;">
                <span style="font-weight:700; color:#6d28d9;">⚙️ Config</span>
                <button id="btn-sync-docker" onclick="window.App.syncDockerData()" style="padding:4px 8px; border:1px solid #a5b4fc; background:#fff; color:#4f46e5; border-radius:4px; font-weight:600; cursor:pointer;"><i id="sync-docker-icon" class="fas fa-server" style="margin-right:4px;"></i>Sync QNAS</button>
                <button id="btn-restart-docker" onclick="window.App.restartDockerContainer()" style="padding:4px 8px; border:1px solid #fca5a5; background:#fff; color:#ef4444; border-radius:4px; font-weight:600; cursor:pointer;"><i id="restart-docker-icon" class="fas fa-power-off" style="margin-right:4px;"></i>Restart QNAS</button>
                <label style="display:flex; align-items:center; gap:4px; color:#334155;">
                    Reduce %
                    <input id="cfg-reduce-pct" type="number" step="1" min="0" max="100" value="${cfg.reducePct}"
                        style="width:52px; padding:3px 6px; border:1px solid #a5b4fc; border-radius:4px; font-size:12px; font-weight:600; text-align:center;">
                </label>
                <label style="display:flex; align-items:center; gap:4px; color:#334155;">
                    Bet $
                    <input id="cfg-bet-amount" type="number" step="0.5" min="0.1" value="${cfg.betAmount}"
                        style="width:60px; padding:3px 6px; border:1px solid #a5b4fc; border-radius:4px; font-size:12px; font-weight:600; text-align:center;">
                </label>
                <label style="display:flex; align-items:center; gap:4px; color:#334155;">
                    Min Odds
                    <input id="cfg-min-odds" type="number" step="0.05" min="1.00" value="${cfg.minOdds}"
                        style="width:60px; padding:3px 6px; border:1px solid #a5b4fc; border-radius:4px; font-size:12px; font-weight:600; text-align:center;">
                </label>
                <label style="display:flex; align-items:center; gap:4px; color:#334155;" title="Skip games past this many minutes (e.g. 45 = ignore 2nd half+)">
                    Max Min'
                    <input id="cfg-max-game-time" type="number" step="1" min="0" max="120" value="${cfg.maxGameTime ?? 45}"
                        style="width:52px; padding:3px 6px; border:1px solid #a5b4fc; border-radius:4px; font-size:12px; font-weight:600; text-align:center;">
                </label>
                <label style="display:flex; align-items:center; gap:4px; color:#334155;">
                    <input type="checkbox" id="cfg-hide-noprofit" ${cfg.hideNoProfit ? 'checked' : ''} style="margin:0;">
                    Hide No Profit
                </label>
                <div style="width:1px; height:20px; background:#cbd5e1; margin:0 4px;"></div>
                <label style="display:flex; align-items:center; gap:2px; color:#475569; font-size:11px;">
                    <input type="checkbox" id="cfg-col-si" ${cfg.showSI ? 'checked' : ''} style="margin:0;"> SI
                </label>
                <label style="display:flex; align-items:center; gap:2px; color:#475569; font-size:11px;">
                    <input type="checkbox" id="cfg-col-pn" ${cfg.showPlayNow ? 'checked' : ''} style="margin:0;"> PN
                </label>
                <label style="display:flex; align-items:center; gap:2px; color:#475569; font-size:11px;">
                    <input type="checkbox" id="cfg-col-tb" ${cfg.showTonyBet ? 'checked' : ''} style="margin:0;"> TB
                </label>
                <label style="display:flex; align-items:center; gap:2px; color:#475569; font-size:11px;">
                    <input type="checkbox" id="cfg-col-xbet" ${cfg.show1xBet ? 'checked' : ''} style="margin:0;"> 1xB
                </label>
                <button id="cfg-save-btn" style="padding:4px 14px; background:#6d28d9; color:#fff; border:none; border-radius:5px; font-size:12px; font-weight:700; cursor:pointer;">💾 Save & Reload</button>
                <span id="cfg-saved-msg" style="color:#059669; font-weight:600; display:none;">✅ Saved!</span>
                <button id="cfg-reset-btn" style="padding:4px 14px; background:#ef4444; color:#fff; border:none; border-radius:5px; font-size:12px; font-weight:700; cursor:pointer; margin-left:auto;">🗑️ Clear All Games</button>
                <button id="cfg-sync-btn" style="padding:4px 14px; background:#2563eb; color:#fff; border:none; border-radius:5px; font-size:12px; font-weight:700; cursor:pointer; margin-left:8px;">🔄 Sync to Repo</button>
            </div>
        `;
        document.getElementById('cfg-save-btn').onclick = () => {
            const newCfg = {
                reducePct: parseFloat(document.getElementById('cfg-reduce-pct').value) || 10,
                betAmount: parseFloat(document.getElementById('cfg-bet-amount').value) || 1,
                minOdds: parseFloat(document.getElementById('cfg-min-odds').value) || 1.10,
                maxGameTime: parseFloat(document.getElementById('cfg-max-game-time').value) ?? 45,
                hideNoProfit: document.getElementById('cfg-hide-noprofit').checked,
                showSI: document.getElementById('cfg-col-si').checked,
                showPlayNow: document.getElementById('cfg-col-pn').checked,
                showTonyBet: document.getElementById('cfg-col-tb').checked,
                show1xBet: document.getElementById('cfg-col-xbet').checked
            };
            saveBettingConfig(newCfg);
            document.getElementById('cfg-saved-msg').style.display = 'inline';
            setTimeout(() => document.getElementById('cfg-saved-msg').style.display = 'none', 2000);
            
            // Reload the view
            this.loadBettingView();
        };

        document.getElementById('cfg-sync-btn').onclick = async () => {
            try {
                const btn = document.getElementById('cfg-sync-btn');
                btn.innerText = 'Syncing...';
                const res = await fetch('http://192.168.1.178:3002/api/betting/sync', { method: 'POST' });
                const data = await res.json();
                if (data.success) {
                    btn.innerText = '✅ Synced!';
                    setTimeout(() => btn.innerText = '🔄 Sync to Repo', 2000);
                } else {
                    alert('Sync failed: ' + data.error);
                    btn.innerText = '🔄 Sync to Repo';
                }
            } catch (e) {
                alert('Sync error: ' + e.message);
                document.getElementById('cfg-sync-btn').innerText = '🔄 Sync to Repo';
            }
        };

        document.getElementById('cfg-reset-btn').onclick = async () => {
            if (confirm('Are you sure you want to clear all current games and odds? This will reset the dashboard.')) {
                try {
                    const res = await fetch('http://192.168.1.178:3002/api/betting/reset', { method: 'POST' });
                    const data = await res.json();
                    if (data.success) {
                        this.loadBettingView();
                    } else {
                        alert('Error clearing data.');
                    }
                } catch (e) {
                    console.error(e);
                    alert('Network error.');
                }
            }
        };
        } // Close if (!isRefresh) for config panel

        const thead = document.getElementById('sports-table-head');
        const tbody = document.getElementById('sports-table-body');
        
        if (!isRefresh) {
            let cols = 5; // Time, ID, League, Match, Score, Opp
            if (cfg.showSI) cols++;
            if (cfg.showPlayNow) cols++;
            if (cfg.showTonyBet) cols++;
            if (cfg.show1xBet) cols++;
            
            thead.innerHTML = `
                <tr style="background:#f8fafc; position:sticky; top:0; z-index:20; box-shadow:0 1px 2px rgba(0,0,0,0.1);">
                    <th style="padding:10px; font-size:12px; font-weight:600; color:#475569; width:80px;">Time</th>
                    <th style="padding:10px; font-size:12px; font-weight:600; color:#475569; width:140px;">Internal ID</th>
                    <th style="padding:10px; font-size:12px; font-weight:600; color:#3b82f6; width:130px;">🏆 League</th>
                    <th style="padding:10px; font-size:12px; font-weight:600; color:#475569;">Match</th>
                    <th style="padding:10px; font-size:12px; font-weight:600; color:#475569; text-align:center; width:70px;">Score</th>
                    ${cfg.showSI ? '<th style="padding:10px; font-size:12px; font-weight:600; color:#475569;">SportsInteraction</th>' : ''}
                    ${cfg.showPlayNow ? '<th style="padding:10px; font-size:12px; font-weight:600; color:#475569;">PlayNow</th>' : ''}
                    ${cfg.showTonyBet ? '<th style="padding:10px; font-size:12px; font-weight:600; color:#e25a00;">TonyBet</th>' : ''}
                    ${cfg.show1xBet ? '<th style="padding:10px; font-size:12px; font-weight:600; color:#0284c7;">1xBet</th>' : ''}
                    <th style="padding:10px; font-size:12px; font-weight:600; color:#6d28d9; width:200px;"><a href="#Opportunity" style="color:inherit; text-decoration:none; cursor:pointer;" title="View all opportunities">💰 Opportunity</a></th>
                </tr>
            `;
            
            tbody.innerHTML = `<tr><td colspan="${cols + 1}" style="text-align:center; padding:20px;">Loading Master Database...</td></tr>`;
        }

        try {
            const res = await fetch('http://192.168.1.178:3002/api/betting/matches');
            const matches = await res.json();
            if (window.App) window.App.godViewMatches = matches;
            
            // --- Game-time filter helper ---
            // parseGameMinutes is now defined globally
            const maxGameTime = cfg.maxGameTime ?? 45;

            // Sort: fully matched (SI+PN) first, then SI-only, then PN-only, then unlinked
            const pinned = loadPinnedMatches();

            matches.sort((a, b) => {
                const aPinned = pinned.includes(a.id) ? 0 : 1;
                const bPinned = pinned.includes(b.id) ? 0 : 1;
                if (aPinned !== bPinned) return aPinned - bPinned;

                const aMatch = (a.si_id && a.playnow_id) ? 0 : (a.si_id ? 1 : (a.playnow_id ? 2 : 3));
                const bMatch = (b.si_id && b.playnow_id) ? 0 : (b.si_id ? 1 : (b.playnow_id ? 2 : 3));
                return aMatch - bMatch;
            });

            if (!window.App) window.App = {};
            if (!window.App.toggleGodViewPin) {
                window.App.toggleGodViewPin = function(id) {
                    let pins = loadPinnedMatches();
                    if (pins.includes(id)) {
                        pins = pins.filter(p => p !== id);
                    } else {
                        pins.push(id);
                    }
                    savePinnedMatches(pins);
                    if (window.App && typeof window.App.loadBettingView === 'function') {
                        window.App.loadBettingView(true);
                    }
                };
            }

            let html = '';
            for (const m of matches) {
                // --- Skip games past maxGameTime OR any 2H ≥ 90 (stoppage time / FT) ---
                const gameMin = parseGameMinutes(m.status);
                if (gameMin !== null && (gameMin >= 90 || gameMin > maxGameTime)) {
                    if (gameMin >= 90) {
                        // Auto-delete 90 min / FT games to clear them out of the database
                        fetch('http://192.168.1.178:3002/api/betting/matches/' + encodeURIComponent(m.id), { method: 'DELETE' }).catch(e => console.error('Auto-delete failed:', e));
                    }
                    continue;
                }

                const date = new Date(m.kickoff_at || m.updated_at).toLocaleString('en-US', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
                const displayTime = m.status ? m.status : date;
                
                const mHome = String(m.home_team || '').replace(/'/g, "\\'");
                const mAway = String(m.away_team || '').replace(/'/g, "\\'");
                const mId = String(m.id || '').replace(/'/g, "\\'");
                const mGroup = String(m.competition || '').replace(/'/g, "\\'");

                let siCell = '';
                let pnCell = '';
                let tbCell = '';
                let siRows = m.odds.filter(o => o.site === 'sportsinteraction');
                let pnRows = m.odds.filter(o => o.site === 'playnow');
                let tbRows = m.odds.filter(o => o.site === 'tonybet');
                let xbetRows = m.odds.filter(o => o.site === '1xbet');

                function getLinesFromRows(rows) {
                    let lines = {}; // e.g. { '2.5': { over, under }, '1H 2.5': { over, under } }
                    let maxUpdated = null;
                    if (!rows || rows.length === 0) return { lines, maxUpdated };
                    
                    rows.forEach(r => {
                        const prefix = r.period === 'Total' ? '' : `${r.period} `;
                        const lineKey = `${prefix}${r.line}`;
                        if (!lines[lineKey]) lines[lineKey] = {};
                        if (r.over_odds != null) lines[lineKey].over = r.over_odds;
                        if (r.under_odds != null) lines[lineKey].under = r.under_odds;
                        
                        // Keep track of the most recent updated_at for this specific line
                        if (!lines[lineKey].updated_at || r.updated_at > lines[lineKey].updated_at) {
                            lines[lineKey].updated_at = r.updated_at;
                        }

                        if (r.updated_at && (!maxUpdated || r.updated_at > maxUpdated)) {
                            maxUpdated = r.updated_at;
                        }
                    });
                    
                    return { lines, maxUpdated };
                }

                const isMatched = ((m.si_id ? 1 : 0) + (m.playnow_id ? 1 : 0) + (m.tonybet_id ? 1 : 0) + (m['1xbet_id'] ? 1 : 0)) >= 2;

                function renderOdds({ lines, maxUpdated }, isMatched) {
                    if (Object.keys(lines).length === 0) return '<span style="color:#94a3b8; font-size:11px;">No odds</span>';
                    
                    let chips = '';
                    
                    // Total Lines
                    let ftLines = [];
                    Object.keys(lines).filter(k => !k.includes('H')).sort((a,b)=>parseFloat(a)-parseFloat(b)).forEach(l => {
                        const { over, under } = lines[l];
                        let pair = '';
                        if (over != null) pair += `<span style="background:#dbeafe; border:1px solid #93c5fd; color:#1d4ed8; padding:3px 7px; border-radius:4px; font-size:11px; font-weight:600; white-space:nowrap;">O ${l} &nbsp;<b>${over}</b></span>`;
                        if (under != null) pair += `<span style="background:#fce7f3; border:1px solid #f9a8d4; color:#be185d; padding:3px 7px; border-radius:4px; font-size:11px; font-weight:600; white-space:nowrap;">U ${l} &nbsp;<b>${under}</b></span>`;
                        if (pair) ftLines.push(`<div style="display:flex; gap:5px; margin-bottom:4px;">${pair}</div>`);
                    });
                    chips += ftLines.join('');

                    // 1H Lines
                    const h1Keys = Object.keys(lines).filter(k => k.startsWith('1H ')).sort((a,b)=>parseFloat(a.replace('1H ',''))-parseFloat(b.replace('1H ','')));
                    if (h1Keys.length > 0) {
                        let h1Chips = [];
                        h1Keys.forEach(k => {
                            const { over, under } = lines[k];
                            const lNum = k.replace('1H ', '');
                            let pair = '';
                            if (over) pair += `<span style="background:#f1f5f9; border:1px solid #cbd5e1; color:#334155; padding:2px 6px; border-radius:4px;">O ${lNum} <b>${over}</b></span>`;
                            if (under) pair += `<span style="background:#f1f5f9; border:1px solid #cbd5e1; color:#334155; padding:2px 6px; border-radius:4px;">U ${lNum} <b>${under}</b></span>`;
                            if (pair) h1Chips.push(`<div style="display:flex; gap:5px; margin-bottom:2px;">${pair}</div>`);
                        });
                        chips += `<div style="width:100%; font-size:10px; color:#64748b; margin-top:6px;"><b>1H:</b><br>${h1Chips.join('')}</div>`;
                    }

                    // 2H Lines
                    const h2Keys = Object.keys(lines).filter(k => k.startsWith('2H ')).sort((a,b)=>parseFloat(a.replace('2H ',''))-parseFloat(b.replace('2H ','')));
                    if (h2Keys.length > 0) {
                        let h2Chips = [];
                        h2Keys.forEach(k => {
                            const { over, under } = lines[k];
                            const lNum = k.replace('2H ', '');
                            let pair = '';
                            if (over) pair += `<span style="background:#f1f5f9; border:1px solid #cbd5e1; color:#334155; padding:2px 6px; border-radius:4px;">O ${lNum} <b>${over}</b></span>`;
                            if (under) pair += `<span style="background:#f1f5f9; border:1px solid #cbd5e1; color:#334155; padding:2px 6px; border-radius:4px;">U ${lNum} <b>${under}</b></span>`;
                            if (pair) h2Chips.push(`<div style="display:flex; gap:5px; margin-bottom:2px;">${pair}</div>`);
                        });
                        chips += `<div style="width:100%; font-size:10px; color:#64748b; margin-top:6px;"><b>2H:</b><br>${h2Chips.join('')}</div>`;
                    }

                    let timeStr = '';
                    const finalUpdated = maxUpdated || m.updated_at;
                    if (finalUpdated) {
                        const d = new Date(finalUpdated);
                        const ms = String(d.getMilliseconds()).padStart(3, '0');
                        const isStale = (Date.now() - d.getTime()) > 3 * 60 * 1000;
                        if (isStale) {
                            if (isMatched) {
                                timeStr = `<div style="font-size:13px; color:#dc2626; font-weight:bold; margin-top:6px; text-align:right; border:1px solid #fca5a5; background:#fef2f2; padding:4px; border-radius:4px;"><i class="fas fa-exclamation-triangle" style="margin-right:3px;"></i>${d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}<br>PUSH TO REFRESH</div>`;
                            } else {
                                timeStr = `<div style="font-size:10px; color:#dc2626; font-weight:bold; margin-top:6px; text-align:right;"><i class="fas fa-clock" style="margin-right:3px;"></i>${d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}.${ms}</div>`;
                            }
                        } else {
                            timeStr = `<div style="font-size:10px; color:#94a3b8; margin-top:6px; text-align:right;"><i class="fas fa-clock" style="margin-right:3px;"></i>${d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}.${ms}</div>`;
                        }
                    }

                    if (chips) return `<div style="display:flex; flex-direction:column; gap:2px;">${chips}</div>${timeStr}`;
                    return `<span style="color:#94a3b8; font-size:11px;">No odds</span>${timeStr}`;
                }

                let siData = getLinesFromRows(siRows);
                let pnData = getLinesFromRows(pnRows);
                let tbData = getLinesFromRows(tbRows);
                let xbetData = getLinesFromRows(xbetRows);
                
                let siLines = siData.lines;
                let pnLines = pnData.lines;
                let tbLines = tbData.lines;
                let xbetLines = xbetData.lines;

                const renderSiteHeader = (siteHome, siteAway, siteScore) => {
                    if (!siteHome && !siteAway) return '';
                    return `<div style="font-size:10px; color:#475569; background:#f1f5f9; border-radius:4px; padding:4px; margin-bottom:6px; line-height:1.3;">
                        <div style="font-weight:600; color:#334155; margin-bottom:2px;">${siteHome || 'Unknown'} <span style="font-weight:normal; color:#94a3b8;">vs</span> ${siteAway || 'Unknown'}</div>
                        <div style="color:#ef4444; font-weight:bold;">${siteScore || '-'}</div>
                    </div>`;
                };

                // Render SI Odds
                if (m.si_id) {
                    siCell = renderSiteHeader(m.si_home, m.si_away, m.si_score);
                    if (siRows.length > 0) siCell += renderOdds(siData, isMatched);
                    else siCell += `<span style="color:#94a3b8; font-size:11px;">No live odds</span>`;
                }

                // Render PlayNow Odds
                if (m.playnow_id) {
                    pnCell = renderSiteHeader(m.playnow_home, m.playnow_away, m.playnow_score);
                    if (pnRows.length > 0) pnCell += renderOdds(pnData, isMatched);
                    else pnCell += `<span style="color:#94a3b8; font-size:11px;">No live odds</span>`;
                }

                // Render TonyBet Odds
                if (m.tonybet_id) {
                    tbCell = renderSiteHeader(m.tonybet_home, m.tonybet_away, m.tonybet_score);
                    if (tbRows.length > 0) tbCell += renderOdds(tbData, isMatched);
                    else tbCell += `<span style="color:#94a3b8; font-size:11px;">No live odds</span>`;
                }

                // Render 1xBet Odds
                let xbetCell = '';
                if (m['1xbet_id']) {
                    xbetCell = renderSiteHeader(m['1xbet_home'], m['1xbet_away'], m['1xbet_score']);
                    if (xbetRows.length > 0) xbetCell += renderOdds(xbetData, isMatched);
                    else xbetCell += `<span style="color:#94a3b8; font-size:11px;">No live odds</span>`;
                }

                let siLinkStatus = m.si_id 
                    ? `<span style="color:#059669; font-weight:bold; font-size:11px; margin-right:8px;"><i class="fas fa-check-circle"></i> SI: ${m.si_id}</span>`
                    : `<button class="btn btn-sm btn-outline-info" onclick="window.App.promptGodViewMatchSI('${mId}', '${mHome}', '${mAway}', '${mGroup}')" style="font-size:10px; padding:1px 4px; margin-right:8px;">Match SI</button>`;
                
                let pnLinkStatus = m.playnow_id 
                    ? `<span style="color:#059669; font-weight:bold; font-size:11px;"><i class="fas fa-check-circle"></i> PN: ${m.playnow_id}</span>`
                    : `<button class="btn btn-sm btn-outline-success" onclick="window.App.promptGodViewMatchPlaynow('${mId}', '${mHome}', '${mAway}', '${mGroup}')" style="font-size:10px; padding:1px 4px;">Match PlayNow</button>`;

                const mTbId = String(m.tonybet_id || '').replace(/'/g, "\\'");
                let tbLinkStatus = m.tonybet_id
                    ? `<span style="color:#059669; font-weight:bold; font-size:11px; margin-left:8px;"><i class="fas fa-check-circle"></i> TB: ${m.tonybet_id}</span>`
                    : `<button class="btn btn-sm btn-outline-warning" onclick="window.App.promptGodViewMatchTonybet('${mId}', '${mHome}', '${mAway}', '${mGroup}')" style="font-size:10px; padding:1px 4px; margin-left:8px; color:#b45309; border-color:#b45309;">Match TB</button>`;

                let xbetLinkStatus = m['1xbet_id']
                    ? `<span style="color:#059669; font-weight:bold; font-size:11px; margin-left:8px;"><i class="fas fa-check-circle"></i> 1X: ${m['1xbet_id']}</span>`
                    : `<button class="btn btn-sm btn-outline-primary" onclick="window.App.promptGodViewMatch1xBet('${mId}', '${mHome}', '${mAway}', '${mGroup}')" style="font-size:10px; padding:1px 4px; margin-left:8px; color:#0284c7; border-color:#0284c7;">Match 1X</button>`;

                // --- Opportunity calculation ---
                const reduceFactor = 1 - (cfg.reducePct / 100);
                const betAmt = cfg.betAmount;
                const minOdds = cfg.minOdds;

               const calcCombo = (label, underOdds, overOdds, uSite, oSite, line, period = 'Total') => {
                    const underProfit = +(betAmt * underOdds - betAmt).toFixed(4);   // net profit from under
                    const overCost    = +(underProfit * reduceFactor).toFixed(4);     // stake on over = underProfit * reduceFactor
                    const overReturn  = +(overCost * overOdds).toFixed(4);            // total return from over
                    const overProfit  = +(overReturn - overCost).toFixed(4);          // net profit from over

                    const ifUnder = +(underProfit - overCost).toFixed(2);   // win under, lose over stake
                    const ifOver  = +(overProfit - betAmt).toFixed(2);      // win over, lose original bet

                    const bothPos = ifUnder > 0 && ifOver > 0;
                    const uCol = ifUnder > 0 ? '#059669' : '#dc2626';
                    const uBg  = ifUnder > 0 ? '#dcfce7' : '#fee2e2';
                    const uBdr = ifUnder > 0 ? '#86efac' : '#fca5a5';
                    const oCol = ifOver  > 0 ? '#1d4ed8' : '#dc2626';
                    const oBg  = ifOver  > 0 ? '#dbeafe' : '#fee2e2';
                    const oBdr = ifOver  > 0 ? '#93c5fd' : '#fca5a5';

                    if (!bothPos && cfg.hideNoProfit) {
                        return '';
                    }

                    const isOpen = bothPos ? 'open' : '';
                    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                    const summaryText = bothPos 
                        ? `<summary style="cursor:pointer; font-weight:700; color:#166534; list-style:none;">✅ Profit Found! [${nowTime}] (${period} ${label} Line ${line})</summary>`
                        : `<summary style="cursor:pointer; font-weight:700; color:#64748b; list-style:none;">❌ No Profit (${period} ${label} Line ${line})</summary>`;

                    return `
                    <details ${isOpen} style="margin-bottom:8px; padding:6px 8px; background:${bothPos ? '#f0fdf4' : '#fafafa'}; border:1px solid ${bothPos ? '#86efac' : '#e2e8f0'}; border-radius:6px; font-size:11px; line-height:1.7;">
                        ${summaryText}
                        <div style="margin-top:6px; padding-top:6px; border-top:1px solid ${bothPos ? '#bbf7d0' : '#e2e8f0'};">
                            <div>${betAmt} × <b style="color:#be185d;">${underOdds}</b> (U ${uSite}) − ${betAmt} = <b>${underProfit.toFixed(2)}</b> <span style="color:#94a3b8;">under profit</span></div>
                            <div><b>${overCost.toFixed(2)}</b> <span style="color:#94a3b8;font-size:10px;">(-${cfg.reducePct}%)</span> × <b style="color:#1d4ed8;">${overOdds}</b> (O ${oSite}) = <b>${overReturn.toFixed(2)}</b> − ${overCost.toFixed(2)} = <b>${overProfit.toFixed(2)}</b></div>
                            <div style="margin-top:4px; padding:2px 6px; border-radius:4px; background:${uBg}; border:1px solid ${uBdr}; color:${uCol}; font-weight:600;">
                                ${ifUnder > 0 ? '✅' : '⚖️'} if under: ${underProfit.toFixed(2)} − ${overCost.toFixed(2)} = <b>${ifUnder > 0 ? '+' : ''}${ifUnder.toFixed(2)}</b>
                            </div>
                            <div style="margin-top:2px; padding:2px 6px; border-radius:4px; background:${oBg}; border:1px solid ${oBdr}; color:${oCol}; font-weight:700;">
                                ${ifOver > 0 ? '✅' : '❌'} if over: ${overProfit.toFixed(2)} − ${betAmt.toFixed(2)} = <b>${ifOver > 0 ? '+' : ''}${ifOver.toFixed(2)}</b>
                            </div>
                        </div>
                    </details>`;
                };

                let oppParts = [];

                // Helper: cross two books by matching line keys
                const crossBooks = (linesA, linesB, labelA, labelB) => {
                    let hasValidMatch = false;
                    let hasTimeSyncIssue = false;

                    Object.keys(linesA).forEach(lineKey => {
                        const lA = linesA[lineKey];
                        const lB = linesB[lineKey];
                        if (!lB) return;

                        // Check for update time mismatch (> 1 minute = 60000ms)
                        if (lA.updated_at && lB.updated_at) {
                            const timeDiff = Math.abs(new Date(lA.updated_at).getTime() - new Date(lB.updated_at).getTime());
                            if (timeDiff > 60000) {
                                hasTimeSyncIssue = true;
                                return; // skip calculating this line combo since they are out of sync
                            }
                        }

                        hasValidMatch = true;
                        const parts = lineKey.split(' ');
                        const lineNum = parts.length > 1 ? parseFloat(parts[1]) : parseFloat(parts[0]);
                        const period = parts.length > 1 ? parts[0] : 'Total';
                        if (lA.under != null && lB.over != null && lA.under >= minOdds && lB.over >= minOdds) {
                            const htmlStr = calcCombo(`U ${labelA} → O ${labelB}`, lA.under, lB.over, labelA, labelB, lineNum, period);
                            if (htmlStr) oppParts.push(htmlStr);
                        }
                        if (lB.under != null && lA.over != null && lB.under >= minOdds && lA.over >= minOdds) {
                            const htmlStr = calcCombo(`U ${labelB} → O ${labelA}`, lB.under, lA.over, labelB, labelA, lineNum, period);
                            if (htmlStr) oppParts.push(htmlStr);
                        }
                    });

                    return { hasValidMatch, hasTimeSyncIssue };
                };

                // SI ↔ PN
                if (siRows.length > 0 && pnRows.length > 0) {
                    const result = crossBooks(siLines, pnLines, 'SI', 'PN');
                    if (!result.hasValidMatch) {
                        const siKeys = Object.keys(siLines).join(',');
                        const pnKeys = Object.keys(pnLines).join(',');
                        if (result.hasTimeSyncIssue) {
                            oppParts.push(`<span style="color:#f59e0b; font-size:11px; font-weight:600;">⚠ SI↔PN out of sync (>1m)</span>`);
                        } else if (siKeys || pnKeys) {
                            oppParts.push(`<span style="color:#f59e0b; font-size:11px; font-weight:600;">⚠ SI↔PN line mismatch: SI [${siKeys}] vs PN [${pnKeys}]</span>`);
                        }
                    }
                }

                // SI ↔ TB
                if (siRows.length > 0 && tbRows.length > 0) {
                    const result = crossBooks(siLines, tbLines, 'SI', 'TB');
                    if (!result.hasValidMatch) {
                        const siKeys = Object.keys(siLines).join(',');
                        const tbKeys = Object.keys(tbLines).join(',');
                        if (result.hasTimeSyncIssue) {
                            oppParts.push(`<span style="color:#f59e0b; font-size:11px; font-weight:600;">⚠ SI↔TB out of sync (>1m)</span>`);
                        } else if (siKeys || tbKeys) {
                            oppParts.push(`<span style="color:#f59e0b; font-size:11px; font-weight:600;">⚠ SI↔TB line mismatch: SI [${siKeys}] vs TB [${tbKeys}]</span>`);
                        }
                    }
                }

                // PN ↔ TB
                if (pnRows.length > 0 && tbRows.length > 0) {
                    const result = crossBooks(pnLines, tbLines, 'PN', 'TB');
                    if (!result.hasValidMatch) {
                        const pnKeys = Object.keys(pnLines).join(',');
                        const tbKeys = Object.keys(tbLines).join(',');
                        if (result.hasTimeSyncIssue) {
                            oppParts.push(`<span style="color:#f59e0b; font-size:11px; font-weight:600;">⚠ PN↔TB out of sync (>1m)</span>`);
                        } else if (pnKeys || tbKeys) {
                            oppParts.push(`<span style="color:#f59e0b; font-size:11px; font-weight:600;">⚠ PN↔TB line mismatch: PN [${pnKeys}] vs TB [${tbKeys}]</span>`);
                        }
                    }
                }

                // SI ↔ 1X
                if (siRows.length > 0 && xbetRows.length > 0) {
                    const result = crossBooks(siLines, xbetLines, 'SI', '1X');
                    if (!result.hasValidMatch) {
                        const siKeys = Object.keys(siLines).join(',');
                        const xbetKeys = Object.keys(xbetLines).join(',');
                        if (result.hasTimeSyncIssue) {
                            oppParts.push(`<span style="color:#f59e0b; font-size:11px; font-weight:600;">⚠ SI↔1X out of sync (>1m)</span>`);
                        } else if (siKeys || xbetKeys) {
                            oppParts.push(`<span style="color:#f59e0b; font-size:11px; font-weight:600;">⚠ SI↔1X line mismatch</span>`);
                        }
                    }
                }

                // PN ↔ 1X
                if (pnRows.length > 0 && xbetRows.length > 0) {
                    crossBooks(pnLines, xbetLines, 'PN', '1X');
                }
                // TB ↔ 1X
                if (tbRows.length > 0 && xbetRows.length > 0) {
                    crossBooks(tbLines, xbetLines, 'TB', '1X');
                }

                // Single-book fallbacks
                const bookCount = (siRows.length > 0 ? 1 : 0) + (pnRows.length > 0 ? 1 : 0) + (tbRows.length > 0 ? 1 : 0) + (xbetRows.length > 0 ? 1 : 0);
                if (bookCount === 1) {
                    const which = siRows.length > 0 ? 'SI' : (pnRows.length > 0 ? 'PN' : (tbRows.length > 0 ? 'TB' : '1X'));
                    oppParts.push(`<span style="color:#94a3b8; font-size:11px;">📋 ${which} only — no cross-book match</span>`);
                }

                let oppCell = oppParts.length > 0
                    ? `<div>${oppParts.join('')}</div>`
                    : '<span style="color:#cbd5e1; font-size:11px;">—</span>';

                const isPinned = pinned.includes(m.id);
                const bgStyle = isPinned ? 'background:#fffbeb;' : 'background:#fff;';

                html += `
                    <tr style="border-bottom:1px solid #e2e8f0; ${bgStyle}">
                        <td style="padding:10px; font-size:11px; font-weight:bold; color:#ef4444; white-space:nowrap; vertical-align:top;">
                            ${displayTime}
                            <button onclick="window.App.toggleGodViewPin('${mId}')" style="background:none; border:none; color:${isPinned ? '#f59e0b' : '#cbd5e1'}; cursor:pointer; font-size:12px; margin-top:6px; display:block;" title="${isPinned ? 'Unpin' : 'Pin to top'}">📌</button>
                        </td>
                        <td style="padding:10px; vertical-align:top;">
                            <div style="font-family:monospace; font-size:11px; color:#3b82f6; word-break:break-all; background:#eff6ff; border:1px solid #bfdbfe; border-radius:4px; padding:4px 6px; display:flex; justify-content:space-between; align-items:center;">
                                <span>${m.id}</span>
                                <button onclick="window.App.deleteBettingMatch('${mId}', ${isMatched})" style="background:none; border:none; color:#ef4444; cursor:pointer; font-size:12px; padding:0 2px;" title="${isMatched ? 'Unlink this game' : 'Clear this game'}">${isMatched ? '🔗✖' : '✖'}</button>
                            </div>
                        </td>
                        <td style="padding:8px 10px; vertical-align:top;">
                            <div style="font-size:11px; font-weight:600; color:#1d4ed8; line-height:1.4; word-break:break-word;">${m.competition || '<span style="color:#cbd5e1;">—</span>'}</div>
                        </td>
                        <td style="padding:10px; font-size:13px; font-weight:500; color:#0f172a; vertical-align:top;">
                            <div style="margin-bottom:4px;">${m.home_team} <span style="color:#94a3b8; margin:0 4px;">vs</span> ${m.away_team}</div>
                            <div style="margin-bottom:3px;">
                                ${cfg.showSI ? siLinkStatus : ''}
                                ${cfg.showPlayNow ? pnLinkStatus : ''}
                                ${cfg.showTonyBet ? tbLinkStatus : ''}
                                ${cfg.show1xBet ? xbetLinkStatus : ''}
                            </div>
                        </td>
                        <td style="padding:10px; vertical-align:top; text-align:center;">
                            <div style="font-size:14px; color:#ef4444; font-weight:bold;">${m.score || '-'}</div>
                        </td>
                        ${cfg.showSI ? `<td style="padding:10px; vertical-align:top; width:15%;">${siCell}</td>` : ''}
                        ${cfg.showPlayNow ? `<td style="padding:10px; vertical-align:top; width:15%;">${pnCell}</td>` : ''}
                        ${cfg.showTonyBet ? `<td style="padding:10px; vertical-align:top; width:15%;">${tbCell}</td>` : ''}
                        ${cfg.show1xBet ? `<td style="padding:10px; vertical-align:top; width:15%;">${xbetCell}</td>` : ''}
                        <td style="padding:10px; vertical-align:top; width:15%;">
                            ${oppCell}
                        </td>
                    </tr>
                `;
            }
            tbody.innerHTML = html;
        } catch (e) {
            console.error(e);
            tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:20px; color:red;">Error loading data</td></tr>`;
        }

        if (!isRefresh) {
            window.liveGameIntervalId = setInterval(() => {
                if (window.location.hash !== '#betting') {
                    clearInterval(window.liveGameIntervalId);
                    return;
                }
                this.loadBettingView(true);
            }, 15000);
        }
    },

    promptGodViewMatchPlaynow(matchId, homeTeam, awayTeam, siLeague) {
        const cfg = loadBettingConfig();
        const maxGameTime = cfg.maxGameTime ?? 45;
        let pnGames = (window.App.godViewMatches || []).filter(m => {
            if (!m.playnow_id) return false;
            const gameMin = parseGameMinutes(m.status);
            if (gameMin !== null && (gameMin >= 90 || gameMin > maxGameTime)) return false;
            return true;
        });
        pnGames.sort((a, b) => {
            const compA = a.competition || '';
            const compB = b.competition || '';
            if (compA !== compB) return compA.localeCompare(compB);
            return (a.kickoff_at || 0) - (b.kickoff_at || 0);
        });

        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;';

        const modal = document.createElement('div');
        modal.style.cssText = 'background:#fff;padding:20px;border-radius:8px;width:520px;max-width:92vw;';

        let html = `<h3 style="margin-top:0;font-size:16px;">Match PlayNow: ${homeTeam} vs ${awayTeam}</h3>`;
        html += `<p style="font-size:12px;color:#666;">Pick a PlayNow game to link (* indicates already linked to another game), or enter the ID manually:</p>`;

        if (pnGames.length > 0) {
            html += `<select id="pn-match-select" style="width:100%;padding:8px;margin-bottom:12px;border:1px solid #ccc;border-radius:4px; max-height:200px; overflow-y:auto;">`;
            html += `<option value="">-- Select a PlayNow match --</option>`;
            pnGames.forEach(pn => {
                const score = pn.score ? ` ${pn.score} ` : ' vs ';
                const linkedStr = pn.si_id || pn.tonybet_id ? ' [*LINKED*]' : '';
                html += `<option value="${pn.playnow_id}|||${pn.home_team}|||${pn.away_team}|||${pn.competition}">${pn.competition || ''} | ${pn.home_team}${score}${pn.away_team} (${pn.playnow_id})${linkedStr}</option>`;
            });
            html += `</select>`;
        } else {
            html += `<p style="font-size:12px;color:#ef4444;margin-bottom:12px;">No unlinked PlayNow games found.</p>`;
        }

        html += `<label style="font-size:12px;color:#444;display:block;margin-bottom:4px;">Or enter PlayNow Event ID directly:</label>`;
        html += `<input id="pn-manual-id" type="text" placeholder="e.g. 10154763" style="width:100%;padding:7px;border:1px solid #ccc;border-radius:4px;margin-bottom:14px;font-size:13px;">`;
        html += `<div style="display:flex;justify-content:flex-end;gap:10px;">`;
        html += `<button id="pn-match-cancel" style="padding:6px 12px;border:1px solid #ccc;background:#fff;border-radius:4px;cursor:pointer;">Cancel</button>`;
        html += `<button id="pn-match-save" style="padding:6px 14px;border:none;background:#10b981;color:#fff;border-radius:4px;cursor:pointer;font-weight:600;">Link PlayNow</button>`;
        html += `</div>`;

        modal.innerHTML = html;
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        document.getElementById('pn-match-cancel').onclick = () => document.body.removeChild(overlay);

        document.getElementById('pn-match-save').onclick = () => {
            const selectEl = document.getElementById('pn-match-select');
            const manualEl = document.getElementById('pn-manual-id');
            const val = (manualEl && manualEl.value.trim()) || (selectEl && selectEl.value) || '';
            
            if (!val) { 
                alert('Please select or enter a PlayNow ID.'); 
                return; 
            }

            let pnId = val;
            let pnHome = homeTeam; // default to SI names if manual
            let pnAway = awayTeam;
            let pnLeague = siLeague;

            if (val.includes('|||')) {
                const parts = val.split('|||');
                pnId = parts[0];
                pnHome = parts[1];
                pnAway = parts[2];
                pnLeague = parts[3];
            }

            fetch('http://192.168.1.178:3002/api/mappings/link', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    siMatchId: matchId,
                    playnowId: pnId,
                    playnowHome: pnHome,
                    siHome: homeTeam,
                    playnowAway: pnAway,
                    siAway: awayTeam,
                    playnowLeague: pnLeague,
                    siLeague: siLeague
                })
            }).then(res => res.json()).then(data => {
                if (data.success) {
                    document.body.removeChild(overlay);
                    alert('Successfully linked PlayNow game!');
                    if (window.App && typeof window.App.loadBettingView === 'function') {
                        window.App.loadBettingView();
                    }
                } else {
                    alert('Error linking: ' + data.error);
                }
            }).catch(err => {
                alert('Network error linking.');
                console.error(err);
            });
        };
    },

    promptGodViewMatchSI(internalId, homeTeam, awayTeam, sourceLeague) {
        const sourceMatch = (window.App.godViewMatches || []).find(m => m.id == internalId);
        if (!sourceMatch) {
            alert('Match not found internally.');
            return;
        }

        if (!sourceMatch.playnow_id && !sourceMatch.tonybet_id) {
            alert('This game does not have a PlayNow or TonyBet ID. Cannot map to SI.');
            return;
        }

        const cfg = loadBettingConfig();
        const maxGameTime = cfg.maxGameTime ?? 45;
        let siMatches = (window.App.godViewMatches || []).filter(m => {
            if (!m.si_id) return false;
            const gameMin = parseGameMinutes(m.status);
            if (gameMin !== null && (gameMin >= 90 || gameMin > maxGameTime)) return false;
            return true;
        });
        siMatches.sort((a, b) => {
            const compA = a.competition || '';
            const compB = b.competition || '';
            if (compA !== compB) return compA.localeCompare(compB);
            return (a.kickoff_at || 0) - (b.kickoff_at || 0);
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

        let html = `<h3 style="margin-top:0; font-size: 16px;">Match to SI: ${homeTeam} vs ${awayTeam}</h3>`;
        html += `<p style="font-size:12px; color:#666;">Select the corresponding SI game (* indicates already linked):</p>`;
        html += `<select id="si-playnow-match-select" style="width:100%; padding:8px; margin-bottom:15px; border:1px solid #ccc; border-radius:4px; max-height:200px; overflow-y:auto;">`;
        html += `<option value="">-- Select an SI match --</option>`;

        siMatches.forEach(si => {
            const score = si.score ? ` ${si.score} ` : ' vs ';
            const linkedStr = (si.playnow_id || si.tonybet_id) ? ' [*LINKED*]' : '';
            html += `<option value="${si.id}|||${si.home_team}|||${si.away_team}|||${si.competition}">${si.competition || ''} | ${si.home_team}${score}${si.away_team}${linkedStr}</option>`;
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

        document.getElementById('si-playnow-match-save').onclick = async () => {
            const select = document.getElementById('si-playnow-match-select');
            if (!select.value) {
                alert('Please select a match or click Cancel.');
                return;
            }

            const parts = select.value.split('|||');
            const siInternalId = parts[0];
            const siHome = parts[1];
            const siAway = parts[2];
            const siLeague = parts[3];

            let success = true;
            let errMsg = '';

            try {
                if (sourceMatch.playnow_id) {
                    const res = await fetch('http://192.168.1.178:3002/api/mappings/link', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            siMatchId: siInternalId,
                            playnowId: sourceMatch.playnow_id,
                            playnowHome: homeTeam,
                            siHome: siHome,
                            playnowAway: awayTeam,
                            siAway: siAway,
                            playnowLeague: sourceLeague,
                            siLeague: siLeague
                        })
                    });
                    const data = await res.json();
                    if (!data.success) {
                        success = false;
                        errMsg = data.error;
                    }
                }

                if (success && sourceMatch.tonybet_id) {
                    const res = await fetch('http://192.168.1.178:3002/api/tonybet/mappings/link', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            matchId: siInternalId,
                            tonybetId: sourceMatch.tonybet_id,
                            tonybetHome: homeTeam,
                            siHome: siHome,
                            tonybetAway: awayTeam,
                            siAway: siAway,
                            tonybetLeague: sourceLeague,
                            siLeague: siLeague
                        })
                    });
                    const data = await res.json();
                    if (!data.success) {
                        success = false;
                        errMsg = data.error || 'Failed linking Tonybet';
                    }
                }

                if (success) {
                    document.body.removeChild(overlay);
                    if (window.App && typeof window.App.loadBettingView === 'function') {
                        window.App.loadBettingView();
                    }
                } else {
                    alert('Error linking: ' + errMsg);
                }
            } catch (err) {
                alert('Network error linking.');
                console.error(err);
            }
        };
    },

    promptGodViewMatchTonybet(matchId, homeTeam, awayTeam, siLeague) {
        const cfg = loadBettingConfig();
        const maxGameTime = cfg.maxGameTime ?? 45;
        let tbGames = (window.App.godViewMatches || []).filter(m => {
            if (!m.tonybet_id) return false;
            const gameMin = parseGameMinutes(m.status);
            if (gameMin !== null && (gameMin >= 90 || gameMin > maxGameTime)) return false;
            return true;
        });
        tbGames.sort((a, b) => {
            const compA = a.competition || '';
            const compB = b.competition || '';
            if (compA !== compB) return compA.localeCompare(compB);
            return (a.kickoff_at || 0) - (b.kickoff_at || 0);
        });

        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;';

        const modal = document.createElement('div');
        modal.style.cssText = 'background:#fff;padding:20px;border-radius:8px;width:520px;max-width:92vw;';

        let html = `<h3 style="margin-top:0;font-size:16px;">Match TonyBet: ${homeTeam} vs ${awayTeam}</h3>`;
        html += `<p style="font-size:12px;color:#666;">Pick a TonyBet game to link (* indicates already linked to another game), or enter the ID manually:</p>`;

        if (tbGames.length > 0) {
            html += `<select id="tb-match-select" style="width:100%;padding:8px;margin-bottom:12px;border:1px solid #ccc;border-radius:4px;">`;
            html += `<option value="">-- Select a TonyBet match --</option>`;
            tbGames.forEach(tb => {
                const linkedStr = tb.si_id || tb.playnow_id ? ' [*LINKED*]' : '';
                html += `<option value="${tb.tonybet_id}|||${tb.home_team}|||${tb.away_team}|||${tb.competition}">${tb.competition || ''} | ${tb.home_team} vs ${tb.away_team} (${tb.tonybet_id})${linkedStr}</option>`;
            });
            html += `</select>`;
        }

        html += `<label style="font-size:12px;color:#444;display:block;margin-bottom:4px;">Or enter TonyBet Event ID directly:</label>`;
        html += `<input id="tb-manual-id" type="text" placeholder="e.g. 10154763" style="width:100%;padding:7px;border:1px solid #ccc;border-radius:4px;margin-bottom:14px;font-size:13px;">`;
        html += `<div style="display:flex;justify-content:flex-end;gap:10px;">`;
        html += `<button id="tb-match-cancel" style="padding:6px 12px;border:1px solid #ccc;background:#fff;border-radius:4px;cursor:pointer;">Cancel</button>`;
        html += `<button id="tb-match-save" style="padding:6px 14px;border:none;background:#b45309;color:#fff;border-radius:4px;cursor:pointer;font-weight:600;">Link TonyBet</button>`;
        html += `</div>`;

        modal.innerHTML = html;
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        document.getElementById('tb-match-cancel').onclick = () => document.body.removeChild(overlay);

        document.getElementById('tb-match-save').onclick = () => {
            const selectEl = document.getElementById('tb-match-select');
            const manualEl = document.getElementById('tb-manual-id');
            const val = (manualEl && manualEl.value.trim()) || (selectEl && selectEl.value) || '';
            if (!val) { alert('Please select or enter a TonyBet ID.'); return; }
            
            let tbId = val;
            let tbHome = homeTeam; // default to SI names if manual
            let tbAway = awayTeam;
            let tbLeague = siLeague;
            
            if (val.includes('|||')) {
                const parts = val.split('|||');
                tbId = parts[0];
                tbHome = parts[1];
                tbAway = parts[2];
                tbLeague = parts[3];
            }

            fetch('http://192.168.1.178:3002/api/tonybet/mappings/link', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    matchId, 
                    tonybetId: tbId,
                    tonybetHome: tbHome,
                    siHome: homeTeam,
                    tonybetAway: tbAway,
                    siAway: awayTeam,
                    tonybetLeague: tbLeague,
                    siLeague: siLeague
                })
            }).then(res => res.json()).then(data => {
                if (data.success) {
                    document.body.removeChild(overlay);
                    if (window.App && typeof window.App.loadBettingView === 'function') window.App.loadBettingView();
                } else {
                    alert('Error linking: ' + data.error);
                }
            }).catch(err => { alert('Network error.'); console.error(err); });
        };
    },

    syncDockerData() {
        const btn = document.getElementById('btn-sync-docker');
        const icon = document.getElementById('sync-docker-icon');
        if (btn) btn.disabled = true;
        if (icon) icon.className = 'fas fa-spinner fa-spin';
        
        const tbody = document.getElementById('sports-table-body');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="12" style="text-align:center; padding:20px; color:#4f46e5;"><i class="fas fa-spinner fa-spin" style="margin-right:10px;"></i>Syncing QNAS Docker data...</td></tr>';
        }

        const evtSource = new EventSource('/api/sync-docker');
        evtSource.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.msg) {
                console.log(data.msg);
                if (tbody && (data.msg.startsWith('Connected') || data.msg.includes('Sync'))) {
                    tbody.innerHTML = `<tr><td colspan="12" style="text-align:center; padding:20px; color:#28a745;"><i class="fas fa-download" style="margin-right:10px;"></i>${data.msg}</td></tr>`;
                }
            }
            if (data.done) {
                evtSource.close();
                if (btn) btn.disabled = false;
                if (icon) icon.className = 'fas fa-server';
                this.loadBettingView(true);
            }
        };
        evtSource.onerror = (err) => {
            console.error('SSE Error:', err);
            evtSource.close();
            if (btn) btn.disabled = false;
            if (icon) icon.className = 'fas fa-server';
            alert('Failed to sync QNAS Docker data. Ensure reply-server is running.');
            this.loadBettingView(true);
        };
    },

    restartDockerContainer() {
        const btn = document.getElementById('btn-restart-docker');
        const icon = document.getElementById('restart-docker-icon');
        if (btn) btn.disabled = true;
        if (icon) icon.className = 'fas fa-spinner fa-spin';
        
        const tbody = document.getElementById('sports-table-body');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="12" style="text-align:center; padding:20px; color:#ef4444;"><i class="fas fa-spinner fa-spin" style="margin-right:10px;"></i>Restarting QNAS Docker container...</td></tr>';
        }

        const evtSource = new EventSource('/api/restart-docker');
        evtSource.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.msg) {
                console.log(data.msg);
                if (tbody) {
                    tbody.innerHTML = `<tr><td colspan="12" style="text-align:center; padding:20px; color:#28a745;"><i class="fas fa-power-off" style="margin-right:10px;"></i>${data.msg}</td></tr>`;
                }
            }
            if (data.done) {
                evtSource.close();
                if (btn) btn.disabled = false;
                if (icon) icon.className = 'fas fa-power-off';
                this.loadBettingView(true);
            }
        };
        evtSource.onerror = (err) => {
            console.error('SSE Error:', err);
            evtSource.close();
            if (btn) btn.disabled = false;
            if (icon) icon.className = 'fas fa-power-off';
            alert('Failed to restart Docker container. Ensure reply-server is running.');
            this.loadBettingView(true);
        };
    },


    promptGodViewMatch1xBet(matchId, homeTeam, awayTeam, siLeague) {
        const cfg = loadBettingConfig();
        const maxGameTime = cfg.maxGameTime ?? 45;
        let xbetGames = (window.App.godViewMatches || []).filter(m => {
            if (!m['1xbet_id']) return false;
            const gameMin = parseGameMinutes(m.status);
            if (gameMin !== null && (gameMin >= 90 || gameMin > maxGameTime)) return false;
            return true;
        });
        xbetGames.sort((a, b) => {
            const compA = a.competition || '';
            const compB = b.competition || '';
            if (compA !== compB) return compA.localeCompare(compB);
            return (a.kickoff_at || 0) - (b.kickoff_at || 0);
        });

        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;';

        const modal = document.createElement('div');
        modal.style.cssText = 'background:#fff;padding:20px;border-radius:8px;width:520px;max-width:92vw;';

        let html = `<h3 style="margin-top:0;font-size:16px;">Match 1xBet: ${homeTeam} vs ${awayTeam}</h3>`;
        html += `<p style="font-size:12px;color:#666;">Pick a 1xBet game to link (* indicates already linked to another game), or enter the ID manually:</p>`;

        if (xbetGames.length > 0) {
            html += `<select id="xbet-match-select" style="width:100%;padding:8px;margin-bottom:12px;border:1px solid #ccc;border-radius:4px;">`;
            html += `<option value="">-- Select a 1xBet match --</option>`;
            xbetGames.forEach(xbet => {
                const linkedStr = xbet.si_id || xbet.playnow_id || xbet.tonybet_id ? ' [*LINKED*]' : '';
                html += `<option value="${xbet['1xbet_id']}|||${xbet.home_team}|||${xbet.away_team}|||${xbet.competition}">${xbet.competition || ''} | ${xbet.home_team} vs ${xbet.away_team} (${xbet['1xbet_id']})${linkedStr}</option>`;
            });
            html += `</select>`;
        }

        html += `<label style="font-size:12px;color:#444;display:block;margin-bottom:4px;">Or enter 1xBet Event ID directly:</label>`;
        html += `<input id="xbet-manual-id" type="text" placeholder="e.g. 10154763" style="width:100%;padding:7px;border:1px solid #ccc;border-radius:4px;margin-bottom:14px;font-size:13px;">`;
        html += `<div style="display:flex;justify-content:flex-end;gap:10px;">`;
        html += `<button id="xbet-match-cancel" style="padding:6px 12px;border:1px solid #ccc;background:#fff;border-radius:4px;cursor:pointer;">Cancel</button>`;
        html += `<button id="xbet-match-save" style="padding:6px 14px;border:none;background:#0284c7;color:#fff;border-radius:4px;cursor:pointer;font-weight:600;">Link 1xBet</button>`;
        html += `</div>`;

        modal.innerHTML = html;
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        document.getElementById('xbet-match-cancel').onclick = () => document.body.removeChild(overlay);

        document.getElementById('xbet-match-save').onclick = () => {
            const selectEl = document.getElementById('xbet-match-select');
            const manualEl = document.getElementById('xbet-manual-id');
            const val = (manualEl && manualEl.value.trim()) || (selectEl && selectEl.value) || '';
            if (!val) { alert('Please select or enter a 1xBet ID.'); return; }
            
            let xbetId = val;
            let xbetHome = homeTeam;
            let xbetAway = awayTeam;
            let xbetLeague = siLeague;
            
            if (val.includes('|||')) {
                const parts = val.split('|||');
                xbetId = parts[0];
                xbetHome = parts[1];
                xbetAway = parts[2];
                xbetLeague = parts[3];
            }

            fetch('http://192.168.1.178:3002/api/1xbet/mappings/link', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    matchId, 
                    xbetId: xbetId,
                    xbetHome: xbetHome,
                    siHome: homeTeam,
                    xbetAway: xbetAway,
                    siAway: awayTeam,
                    xbetLeague: xbetLeague,
                    siLeague: siLeague
                })
            }).then(res => res.json()).then(data => {
                if (data.success) {
                    document.body.removeChild(overlay);
                    if (window.App && typeof window.App.loadBettingView === 'function') window.App.loadBettingView();
                } else {
                    alert('Error linking: ' + data.error);
                }
            }).catch(err => { alert('Network error.'); console.error(err); });
        };
    },

    async deleteBettingMatch(matchId, isMatched = false) {
        const msg = isMatched 
            ? 'Are you sure you want to UNLINK this game? (It will be split back into individual games)'
            : 'Are you sure you want to hide this game from the dashboard?';
        if (!confirm(msg)) return;
        try {
            const res = await fetch(`http://192.168.1.178:3002/api/betting/matches/${matchId}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                if (window.App && typeof window.App.loadBettingView === 'function') {
                    window.App.loadBettingView();
                }
            } else {
                alert('Error removing game: ' + data.error);
            }
        } catch (e) {
            console.error(e);
            alert('Network error.');
        }
    },

    async loadOpportunityView(isRefresh = false) {
        if (window.liveGameIntervalId) {
            clearInterval(window.liveGameIntervalId);
        }

        if (!isRefresh) {
            if (window.App && window.App.oppsIntervalId) {
                clearInterval(window.App.oppsIntervalId);
            }
            window.App = window.App || {};
            window.App.oppsIntervalId = setInterval(() => {
                if (window.App.currentViewType === 'Opportunity') {
                    if (typeof window.App.loadOpportunityView === 'function') {
                        window.App.loadOpportunityView(true);
                    }
                } else {
                    clearInterval(window.App.oppsIntervalId);
                }
            }, 60000);

            const playnowContainer = document.getElementById('playnow-profile-container');
            if (playnowContainer) playnowContainer.classList.add('hidden');
            
            const tabsContainer = document.getElementById('analysis-tabs-container');
            if (tabsContainer) tabsContainer.style.display = 'none';
            
            const calendarContainer = document.getElementById('last-game-calendar-container');
            if (calendarContainer) calendarContainer.style.display = 'none';

            document.getElementById('sports-title').innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
                    <div>
                        <i class="fas fa-money-bill-wave" style="margin-right: 10px; color: #16a34a;"></i>Opportunities (Database View) 
                        <a href="#betting" style="font-size:12px; margin-left:15px; color:#3b82f6; text-decoration:none;">⬅ Back to God View</a>
                    </div>
                    <button id="cfg-reset-opps-btn" style="padding:4px 14px; background:#ef4444; color:#fff; border:none; border-radius:5px; font-size:12px; font-weight:700; cursor:pointer;">🗑️ Clear All Opportunities</button>
                </div>
            `;

            const resetBtn = document.getElementById('cfg-reset-opps-btn');
            if (resetBtn) {
                resetBtn.onclick = async () => {
                    if (confirm('Are you sure you want to clear all opportunities?')) {
                        try {
                            const res = await fetch('http://192.168.1.178:3002/api/betting/opportunities', { method: 'DELETE' });
                            const data = await res.json();
                            if (data.success) {
                                this.loadOpportunityView();
                            } else {
                                alert('Error clearing opportunities.');
                            }
                        } catch (e) {
                            console.error(e);
                            alert('Network error.');
                        }
                    }
                };
            }

            const configBar = document.getElementById('betting-config-bar');
            if (configBar) configBar.innerHTML = ''; // hide config bar in opportunity view

            const thead = document.getElementById('sports-table-head');
            thead.innerHTML = `
                <tr style="background:#f8fafc;">
                    <th style="padding:10px; font-size:12px; font-weight:600; color:#475569; white-space:nowrap;">Time</th>
                    <th style="padding:10px; font-size:12px; font-weight:600; color:#475569; white-space:nowrap;">Live</th>
                    <th style="padding:10px; font-size:12px; font-weight:600; color:#475569; white-space:nowrap;">Internal ID</th>
                    <th style="padding:10px; font-size:12px; font-weight:600; color:#475569; white-space:nowrap;">🏆 League</th>
                    <th style="padding:10px; font-size:12px; font-weight:600; color:#475569;">Match</th>
                    <th style="padding:10px; font-size:12px; font-weight:600; color:#475569; white-space:nowrap;">Score</th>
                    <th style="padding:10px; font-size:12px; font-weight:600; color:#475569; white-space:nowrap;">Line</th>
                    <th style="padding:10px; font-size:12px; font-weight:600; color:#475569; white-space:nowrap;">Over Site</th>
                    <th style="padding:10px; font-size:12px; font-weight:600; color:#475569; white-space:nowrap;">Over Odd</th>
                    <th style="padding:10px; font-size:12px; font-weight:600; color:#475569; white-space:nowrap;">Under Site</th>
                    <th style="padding:10px; font-size:12px; font-weight:600; color:#475569; white-space:nowrap;">Under Odd</th>
                    <th style="padding:10px; font-size:12px; font-weight:600; color:#6d28d9;">Profit Details</th>
                </tr>
            `;
        }

        const tbody = document.getElementById('sports-table-body');
        if (!isRefresh) {
            tbody.innerHTML = `<tr><td colspan="12" style="text-align:center; padding:20px;">Loading Opportunities...</td></tr>`;
        }

        try {
            const res = await fetch('http://192.168.1.178:3002/api/betting/opportunities');
            const opps = await res.json();
            
            if (opps.length === 0) {
                tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px; color:#64748b;">No opportunities found in database.</td></tr>`;
                return;
            }

            let html = '';
            for (const o of opps) {
                const date = new Date(o.detected_at).toLocaleString('en-US', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit', second:'2-digit' });
                
                let breakdownHtml = '';
                try {
                    const st = JSON.parse(o.stakes);
                    if (st && st.under && st.over) {
                        const betAmt = st.under;
                        const overCost = st.over;
                        const underOdds = o.best_under_odds;
                        const overOdds = o.best_over_odds;
                        
                        const underProfit = +(betAmt * underOdds - betAmt).toFixed(4);
                        const overReturn  = +(overCost * overOdds).toFixed(4);
                        const overProfit  = +(overReturn - overCost).toFixed(4);

                        const ifUnder = +(underProfit - overCost).toFixed(2);
                        const ifOver  = +(overProfit - betAmt).toFixed(2);
                        
                        let reducePct = Math.round(100 - (overCost / underProfit * 100));
                        if (reducePct < 0 || reducePct > 100 || isNaN(reducePct)) reducePct = 0;
                        const reduceStr = reducePct > 0 ? `(-${reducePct}%)` : '';

                        const uSite = o.best_under_site === 'PlayNow' ? 'PN' : (o.best_under_site === 'SportsInteraction' ? 'SI' : (o.best_under_site === 'TonyBet' ? 'TB' : o.best_under_site));
                        const oSite = o.best_over_site === 'PlayNow' ? 'PN' : (o.best_over_site === 'SportsInteraction' ? 'SI' : (o.best_over_site === 'TonyBet' ? 'TB' : o.best_over_site));
                        
                        breakdownHtml = `
                            <div style="font-family:monospace; font-size:12px; line-height:1.4; color:#333;">
                                <div style="font-weight:bold; color:#166534; margin-bottom:4px;">✅ Profit Found! (${o.period} U ${uSite} → O ${oSite} Line ${o.line})</div>
                                <div>${betAmt} × ${underOdds} (U ${uSite}) − ${betAmt} = ${underProfit.toFixed(2)} under profit</div>
                                <div>${overCost.toFixed(2)} ${reduceStr} × ${overOdds} (O ${oSite}) = ${overReturn.toFixed(2)} − ${overCost.toFixed(2)} = ${overProfit.toFixed(2)}</div>
                                <div style="color:${ifUnder > 0 ? '#166534' : '#b91c1c'}; font-weight:600; margin-top:2px;">✅ if under: ${underProfit.toFixed(2)} − ${overCost.toFixed(2)} = ${ifUnder > 0 ? '+' : ''}${ifUnder.toFixed(2)}</div>
                                <div style="color:${ifOver > 0 ? '#166534' : '#b91c1c'}; font-weight:600;">✅ if over: ${overProfit.toFixed(2)} − ${betAmt.toFixed(2)} = ${ifOver > 0 ? '+' : ''}${ifOver.toFixed(2)}</div>
                            </div>
                        `;
                    }
                } catch(e) {}

                const matchName = o.home_team && o.away_team ? `${o.home_team} vs ${o.away_team}` : 'Unknown Match';
                const scoreStr = o.score ? o.score : '-';
                const compStr = o.competition || '-';
                const statusStr = o.status || '-';

                html += `
                    <tr style="border-bottom:1px solid #e2e8f0; background:#fff;">
                        <td style="padding:10px; font-size:11px; color:#64748b; vertical-align:top; white-space:nowrap;">${date}</td>
                        <td style="padding:10px; font-size:11px; font-weight:bold; color:#10b981; vertical-align:top; white-space:nowrap;">${statusStr}</td>
                        <td style="padding:10px; font-size:11px; font-family:monospace; color:#3b82f6; vertical-align:top; max-width:120px; word-break:break-all;">${o.match_id}</td>
                        <td style="padding:10px; font-size:11px; color:#475569; vertical-align:top; font-weight:bold;">${compStr}</td>
                        <td style="padding:10px; font-size:12px; font-weight:bold; vertical-align:top;">${matchName}</td>
                        <td style="padding:10px; font-size:12px; color:#dc2626; font-weight:bold; vertical-align:top; white-space:nowrap;">${scoreStr}</td>
                        <td style="padding:10px; font-size:12px; font-weight:bold; vertical-align:top; white-space:nowrap;">${o.period} ${o.line}</td>
                        <td style="padding:10px; font-size:12px; vertical-align:top; color:#475569;">${o.best_over_site}</td>
                        <td style="padding:10px; font-size:12px; font-weight:bold; color:#1d4ed8; vertical-align:top; white-space:nowrap;">
                            O ${o.best_over_odds}
                            <div style="font-size:10px; color:#94a3b8; font-weight:normal; margin-top:2px;">U ${o.over_site_under_odds || '-'}</div>
                        </td>
                        <td style="padding:10px; font-size:12px; vertical-align:top; color:#475569;">${o.best_under_site}</td>
                        <td style="padding:10px; font-size:12px; font-weight:bold; color:#be185d; vertical-align:top; white-space:nowrap;">
                            U ${o.best_under_odds}
                            <div style="font-size:10px; color:#94a3b8; font-weight:normal; margin-top:2px;">O ${o.under_site_over_odds || '-'}</div>
                        </td>
                        <td style="padding:10px; vertical-align:top; min-width:280px;">
                            ${breakdownHtml || '<span style="color:#94a3b8; font-style:italic;">No breakdown available</span>'}
                        </td>
                    </tr>
                `;
            }
            tbody.innerHTML = html;
        } catch (e) {
            console.error(e);
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:20px; color:red;">Error loading opportunities</td></tr>`;
        }
    }
};
