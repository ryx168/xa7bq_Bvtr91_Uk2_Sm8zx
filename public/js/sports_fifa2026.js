/**
 * sports_fifa2026.js
 * Mixin for the Last Game Every Day dashboard view.
 */

export const SportsMixin = {
    fetchAndRenderFifa2026Calendar: async function (targetYear = 2026) {
        const fetchWithTimeout = (url, ms = 20000) => {
            return Promise.race([
                fetch(url),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Fetch timeout after ' + ms + 'ms for ' + url)), ms))
            ]);
        };
        try {
            const isGameAnalystViewCheck = (window.location.hash.startsWith('#sports/' + targetYear + '-FIFA/') || window.location.hash.startsWith('#all_live_soccer/')) && window.location.hash.includes('_id_');
            if (!isGameAnalystViewCheck) {
                try {
                    const templateUrl = '/data/leagues/FIFA_' + targetYear + '_template.html?v=' + Date.now();
                    const templateRes = await fetchWithTimeout(templateUrl, 2000);
                    if (templateRes.ok) {
                        const templateHtml = await templateRes.text();
                        const container = document.getElementById('last-game-calendar-container');
                        if (container && templateHtml && templateHtml.trim().length > 0) {
                            container.innerHTML = templateHtml;
                            console.log('Loaded FIFA ' + targetYear + ' calendar from pre-calculated template.');
                            return; // Skip client-side calculation
                        }
                    }
                } catch (e) {
                    console.log('No pre-calculated template found or error loading it, falling back to client-side calculation.');
                }
            }

            const [f26, f22, f18, f14, f10, f06] = await Promise.all([
                fetchWithTimeout('/sports/leagues/FIFA_2026.json?v=' + Date.now(), 20000).then(r => r.json()).catch(() => []),
                fetchWithTimeout('/sports/leagues/FIFA_2022.json?v=' + Date.now(), 20000).then(r => r.json()).catch(() => []),
                fetchWithTimeout('/sports/leagues/FIFA_2018.json?v=' + Date.now(), 20000).then(r => r.json()).catch(() => []),
                fetchWithTimeout('/sports/leagues/FIFA_2014.json?v=' + Date.now(), 20000).then(r => r.json()).catch(() => []),
                fetchWithTimeout('/sports/leagues/FIFA_2010.json?v=' + Date.now(), 20000).then(r => r.json()).catch(() => []),
                fetchWithTimeout('/sports/leagues/FIFA_2006.json?v=' + Date.now(), 20000).then(r => r.json()).catch(() => [])
            ]);

            const nowLive = new Date();
            let livePromises = [];
            if (targetYear >= 2026) {
                for (let i = -3; i < 30; i++) {
                const d = new Date(nowLive.getTime() - i * 86400000);
                const dStr = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
                if (dStr < (targetYear === 2022 ? '2022-10-31' : targetYear + '-05-31')) break; // Do not fetch previous dates
                livePromises.push(
                    fetchWithTimeout(`/sports/live_game/live_games_${dStr}.json?v=` + Date.now(), 10000).then(r => r.json()).catch(() => [])
                );
            }
            }
            const liveDaysData = await Promise.all(livePromises);
            let allLive = [];
            liveDaysData.forEach(dayData => {
                if (Array.isArray(dayData)) allLive.push(...dayData);
            });


            const isSportsOnlyViewMasterStrict = window.location.hash === '#sports' || window.location.hash.startsWith('#sports/FIFA-') || window.location.hash.startsWith('#sports/') && window.location.hash.includes('-FIFA');
            let targetFifaMatchIds = new Set();
            if (targetYear === 2026) targetFifaMatchIds = new Set(f26.map(m => m.matchId).filter(id => id));
            else if (targetYear === 2022) targetFifaMatchIds = new Set(f22.map(m => m.matchId).filter(id => id));
            else if (targetYear === 2018) targetFifaMatchIds = new Set(f18.map(m => m.matchId).filter(id => id));
            else if (targetYear === 2014) targetFifaMatchIds = new Set(f14.map(m => m.matchId).filter(id => id));
            else if (targetYear === 2010) targetFifaMatchIds = new Set(f10.map(m => m.matchId).filter(id => id));
            else if (targetYear === 2006) targetFifaMatchIds = new Set(f06.map(m => m.matchId).filter(id => id));
            const filteredLive = allLive.filter(m => targetFifaMatchIds.has(m.matchId) || m.isTargetFifa || m.isFifa);
            let allFifa = isSportsOnlyViewMasterStrict ? [...f26, ...filteredLive] : [...f26, ...f22, ...f18, ...f14, ...f10, ...f06, ...allLive];


            const todayStr = nowLive.getFullYear() + '-' + String(nowLive.getMonth() + 1).padStart(2, '0') + '-' + String(nowLive.getDate()).padStart(2, '0');
            allFifa = allFifa.filter(m => {
                let dStr = m.date || 'Unknown';
                if (dStr < (targetYear === 2022 ? '2022-10-31' : targetYear + '-05-31')) return false; // Exclude anything before 2026-05-31

                if (dStr < todayStr) {
                    if (!m.score || m.score === 'VS') {
                        if (m.title && m.title.match(/(\d+-\d+)/)) {
                            m.score = m.title.match(/(\d+-\d+)/)[1];
                        } else {
                            return false; // past: must have score
                        }
                    }
                }
                // today and future: always keep (score will be 'VS' or empty for upcoming)
                return true;
            });

            allFifa.forEach(m => {
                if (!m.league || m.league === 'FIFA') m.isFifa = true;
                if (m.matchId && targetFifaMatchIds.has(m.matchId)) m.isTargetFifa = true;
            });

            let lastGamesByDay = {};
            const isSportsOnlyView = window.location.hash === '#sports' || window.location.hash.startsWith('#sports?') || window.location.hash.startsWith('#sports/FIFA-') || window.location.hash.startsWith('#sports/') && window.location.hash.includes('-FIFA');
            allFifa.forEach(m => {
                if (isSportsOnlyView && !m.isTargetFifa) return;
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
                        let currHasScore = lastGamesByDay[dStr][0].score && lastGamesByDay[dStr][0].score !== 'VS';
                        let newHasScore = m.score && m.score !== 'VS';
                        if (!currHasScore && newHasScore) {
                            lastGamesByDay[dStr] = [m];
                        } else if (currHasScore === newHasScore) {
                            lastGamesByDay[dStr].push(m);
                        }
                    }
                }
            });

            let sortedAllDates = Object.keys(lastGamesByDay).sort((a, b) => b.localeCompare(a));

            const threeDaysOut = new Date(nowLive.getTime() + 3 * 86400000);
            const maxDateStr = threeDaysOut.getFullYear() + '-' + String(threeDaysOut.getMonth() + 1).padStart(2, '0') + '-' + String(threeDaysOut.getDate()).padStart(2, '0');

            let calMatches = [];
            for (let dStr of sortedAllDates) {
                if (dStr <= maxDateStr) {
                    lastGamesByDay[dStr].forEach(m => calMatches.push(m));
                }
            }
            if (typeof this.renderFifa2026Calendar === 'function') {
                this.renderFifa2026Calendar(allFifa, calMatches, targetYear);
            }
        } catch (e) {
            console.error('Failed to load last game calendar for ${targetYear}', e);
        }
    },

    renderFifa2026Calendar: function (allMatches, tableMatches = null, targetYear = 2026) {
        const calendarContainer = document.getElementById('last-game-calendar-container');
        if (!calendarContainer) return;

        // Use tableMatches for the calendar if provided, otherwise fallback to allMatches
        const calendarMatches = tableMatches || allMatches;

        // Compute 90'+ goals per day
        const goalsPerDay = {};
        const goals45PerDay = {};
        const zeroGamesPerDay = {};
        const fivePlusGamesPerDay = {};
        const zero2HTGamesPerDay = {};
        const seenGoalsMatchIds = new Set();
        calendarMatches.forEach(m => {

            if (!m.isTargetFifa) return;
            if (seenGoalsMatchIds.has(m.matchId)) return;
            seenGoalsMatchIds.add(m.matchId);

            const dStr = m.date || 'Unknown';
            if (!goalsPerDay[dStr]) goalsPerDay[dStr] = 0;
            if (!goals45PerDay[dStr]) goals45PerDay[dStr] = 0;
            if (!zeroGamesPerDay[dStr]) zeroGamesPerDay[dStr] = 0;
            if (!fivePlusGamesPerDay[dStr]) fivePlusGamesPerDay[dStr] = 0;

            if (m.goals && m.goals[7] && typeof m.goals[7] === 'string' && m.goals[7].includes("'")) {
                const count = m.goals[7].split('<br>').filter(g => g.trim() !== '').length;
                goalsPerDay[dStr] += count > 0 ? count : 1;
            }
            if (m.goals && m.goals[3] && typeof m.goals[3] === 'string' && m.goals[3].includes("'")) {
                const count45 = m.goals[3].split('<br>').filter(g => g.trim() !== '').length;
                goals45PerDay[dStr] += count45 > 0 ? count45 : 1;
            }

            if (m.score && m.score !== 'VS' && m.score !== '') {
                let parts = m.score.split('-');
                if (parts.length === 2) {
                    let s1 = parseInt(parts[0], 10);
                    let s2 = parseInt(parts[1], 10);
                    if (!isNaN(s1) && !isNaN(s2)) {
                        let total = s1 + s2;
                        if (total === 0) zeroGamesPerDay[dStr]++;
                        if (total >= 5) fivePlusGamesPerDay[dStr]++;

                        let goals1HT = 0, goals2HT = 0;
                        if (m.goals) {
                            let goalValues = [];
                            if (Array.isArray(m.goals)) {
                                goalValues = m.goals;
                            } else if (m.goals[7]) {
                                goalValues = [m.goals[7]];
                            }
                            
                            goalValues.forEach(val => {
                                if (!val || typeof val !== 'string' || !val.includes("'")) return;
                                const entries = val.split('<br>').filter(g => g.trim() !== '');
                                entries.forEach(entry => {
                                    const minMatch = entry.match(/(\d+)(?:\+(\d+))?'/);
                                    if (!minMatch) return;
                                    const mMin = parseInt(minMatch[1], 10);
                                    if (mMin <= 45) goals1HT++;
                                    else goals2HT++;
                                });
                            });
                        }

                        if (goals1HT === 0 && goals2HT === 0 && m.score_ht && m.score_ht !== 'VS') {
                            let hp = m.score_ht.split('-');
                            if (hp.length === 2) {
                                let h1 = parseInt(hp[0], 10);
                                let h2 = parseInt(hp[1], 10);
                                if (!isNaN(h1) && !isNaN(h2)) {
                                    goals1HT = h1 + h2;
                                }
                            }
                        }
                        goals2HT = Math.max(0, total - goals1HT);
                        if (goals2HT === 0) {
                            if (!zero2HTGamesPerDay[dStr]) zero2HTGamesPerDay[dStr] = 0;
                            zero2HTGamesPerDay[dStr]++;
                        }
                    }
                }
            }
        });

        // Compute data-driven display date
        const datesWithScores = [...new Set(calendarMatches
            .filter(m => m.score && m.score !== 'VS' && m.score !== '')
            .map(m => m.date)
        )].sort((a, b) => b.localeCompare(a));
        const displayDateTL = datesWithScores.length > 0 ? datesWithScores[0] : (calendarMatches.length > 0 ? calendarMatches[0].date : 'Unknown');

        // Parse display date for calendar rendering
        let yearNum, month, todayDateNum;
        if (displayDateTL && displayDateTL !== 'Unknown') {
            const parts = displayDateTL.split('-');
            yearNum = parseInt(parts[0], 10);
            month = parseInt(parts[1], 10) - 1; // 0-indexed
            todayDateNum = parseInt(parts[2], 10);
        } else {
            const now = new Date();
            yearNum = now.getFullYear();
            month = now.getMonth();
            todayDateNum = now.getDate();
        }

        let html = '<div style="position: sticky; top: 0; z-index: 50; background: #fff; padding: 0; margin-bottom: 5px;">';
        let calendarHtml = '';


        calendarHtml += '<div id="fifa-calendar-content" style="background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 4px; box-shadow: 0 4px 10px rgba(0,0,0,0.15); margin-bottom: 15px; display: none; flex-direction: row; gap: 10px; max-height: 30vh; overflow: auto;">';

        // FIFA 2026: always show June and July (tournament period Jun 11 – Jul 19)
        const fifaCalendarMonths = targetYear === 2026 ? [5, 6] : targetYear === 2022 ? [10, 11] : [5, 6];
        for (let mIdx = 0; mIdx < fifaCalendarMonths.length; mIdx++) {
            let targetMonth = fifaCalendarMonths[mIdx];
            let targetYear = yearNum;

            const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
            const firstDay = new Date(targetYear, targetMonth, 1).getDay();

            calendarHtml += '<div style="flex: 1;">';
            const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
            calendarHtml += `<h3 style="text-align: center; margin-top: 0; margin-bottom: 2px; color: #1e293b; font-weight: 600; font-size: 12px;">${monthNames[targetMonth]} ${targetYear} - 90'+ Goals</h3>`;

            calendarHtml += '<table style="width: 100%; border-collapse: collapse; table-layout: fixed;">';
            calendarHtml += '<thead><tr>';
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            days.forEach(d => {
                calendarHtml += `<th style="text-align: center; padding: 2px; color: #64748b; font-weight: 600; font-size: 10px; border-bottom: 2px solid #e2e8f0;">${d}</th>`;
            });
            calendarHtml += '</tr></thead><tbody>';

            let weekDays = [];

            const processWeek = () => {
                if (weekDays.length === 0) return '';
                // 1. Build the flex grid string for days
                let daysHtml = '<div style="display: flex; width: 100%;">';
                weekDays.forEach(d => {
                    if (d.empty) {
                        daysHtml += `<div style="flex: 1; height: 35px; border-right: 1px solid #e2e8f0; background: #f8fafc; display: flex; justify-content: center; padding-top: 2px; color: #94a3b8; font-size: 10px; cursor: pointer;" onclick="if(window.App && App.scrollToCurrentSports) { App.targetScrollDate='${d.date}'; App.scrollToCurrentSports(); }">${d.label}</div>`;
                    } else {
                        const isSelectedDate = d.date === displayDateTL;
                        const style = isSelectedDate ? 'background: #007bff; color: white; font-weight: bold; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,123,255,0.3);' : 'color: #334155; font-weight: 500; border-radius: 50%; transition: background 0.2s;';

                        daysHtml += `<div style="flex: 1; height: 35px; border-right: 1px solid #e2e8f0; display: flex; justify-content: center; padding-top: 2px; cursor: pointer; transition: background 0.2s;" 
                             onclick="if(window.App && App.scrollToCurrentSports) { App.targetScrollDate='${d.date}'; App.scrollToCurrentSports(); }"
                             onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='transparent'">
                             <div style="width: 18px; height: 18px; font-size: 9px; display: flex; align-items: center; justify-content: center; ${style}">${d.dayNum}</div>
                        </div>`;
                    }
                });
                daysHtml += '</div>';

                // 2. Build SVG overlay
                let svgHtml = `<svg viewBox="0 0 700 35" width="100%" height="35" style="display: block; position: absolute; top: 0; left: 0; z-index: 10; pointer-events: none;" preserveAspectRatio="none">`;
                const maxGoals = Math.max(...weekDays.map(d => Math.max(d.goals, d.goals45 || 0, d.zero2HT || 0)), 1);

                const buildBars = (chartType) => {
                    let outHtml = '';
                    weekDays.forEach((d, idx) => {
                        let activeStart, activeEnd;
                        if (targetYear === 2026) { activeStart = '2026-06-11'; activeEnd = '2026-07-19'; }
                        else if (targetYear === 2022) { activeStart = '2022-11-20'; activeEnd = '2022-12-18'; }
                        else if (targetYear === 2018) { activeStart = '2018-06-14'; activeEnd = '2018-07-15'; }
                        else if (targetYear === 2014) { activeStart = '2014-06-12'; activeEnd = '2014-07-13'; }
                        else if (targetYear === 2010) { activeStart = '2010-06-11'; activeEnd = '2010-07-11'; }
                        else if (targetYear === 2006) { activeStart = '2006-06-09'; activeEnd = '2006-07-09'; }
                        else { activeStart = targetYear + '-06-01'; activeEnd = targetYear + '-07-31'; }
                        
                        if (d.date >= activeStart && d.date <= activeEnd) {
                            const val = chartType === '45' ? d.goals45 : (chartType === '2ht0' ? d.zero2HT : d.goals);
                            if (!val || val === 0) return;
                            
                            const basePathX = 50 + 100 * idx;
                            let barX = basePathX;
                            let color = '';
                            if (chartType === '45') { barX = basePathX - 16; color = '#22c55e'; }
                            else if (chartType === '90') { barX = basePathX; color = '#ef4444'; }
                            else if (chartType === '2ht0') { barX = basePathX + 16; color = '#000000'; }

                            const y = 32 - (val / maxGoals) * 12;
                            const height = 32 - y;
                            const opacity = chartType === '2ht0' ? '0.4' : '0.2';
                            outHtml += `<rect x="${barX - 7}" y="${y}" width="14" height="${height}" fill="${color}" opacity="${opacity}" rx="2" />`;
                        }
                    });
                    return outHtml;
                };

                svgHtml += buildBars('90');
                svgHtml += buildBars('45');
                svgHtml += buildBars('2ht0');

                weekDays.forEach((d, idx) => {
                    
                        let activeStart, activeEnd;
                        if (targetYear === 2026) { activeStart = '2026-06-11'; activeEnd = '2026-07-19'; }
                        else if (targetYear === 2022) { activeStart = '2022-11-20'; activeEnd = '2022-12-18'; }
                        else if (targetYear === 2018) { activeStart = '2018-06-14'; activeEnd = '2018-07-15'; }
                        else if (targetYear === 2014) { activeStart = '2014-06-12'; activeEnd = '2014-07-13'; }
                        else if (targetYear === 2010) { activeStart = '2010-06-11'; activeEnd = '2010-07-11'; }
                        else if (targetYear === 2006) { activeStart = '2006-06-09'; activeEnd = '2006-07-09'; }
                        else { activeStart = targetYear + '-06-01'; activeEnd = targetYear + '-07-31'; }
                        if (d.date >= activeStart && d.date <= activeEnd) {
                        const x = 50 + 100 * idx;
                        const y = (!d.goals || d.goals === -1) ? 32 : 32 - (d.goals / maxGoals) * 12;
                        const y45 = (!d.goals45 || d.goals45 === -1) ? 32 : 32 - (d.goals45 / maxGoals) * 12;
                        const y2ht0 = (!d.zero2HT || d.zero2HT === -1) ? 32 : 32 - (d.zero2HT / maxGoals) * 12;

                        if (d.goals45 > 0) {
                            const cx = x - 16;
                            svgHtml += `<circle cx="${cx}" cy="${y45}" r="3" fill="#22c55e" />`;
                            svgHtml += `<text x="${cx}" y="${y45 - 5}" text-anchor="middle" font-size="9" fill="#22c55e" font-family="sans-serif" font-weight="bold">${d.goals45}</text>`;
                        }
                        if (d.goals > 0) {
                            const cx = x;
                            svgHtml += `<circle cx="${cx}" cy="${y}" r="3" fill="#ef4444" />`;
                            svgHtml += `<text x="${cx}" y="${y - 5}" text-anchor="middle" font-size="9" fill="#ef4444" font-family="sans-serif" font-weight="bold">${d.goals}</text>`;
                        }

                        if (d.zero2HT > 0) {
                            const cx = x + 16;
                            svgHtml += `<circle cx="${cx}" cy="${y2ht0}" r="3" fill="#000000" />`;
                            svgHtml += `<text x="${cx}" y="${y2ht0 - 5}" text-anchor="middle" font-size="10" fill="#000000" font-family="sans-serif" font-weight="900">${d.zero2HT}</text>`;
                        }

                        if (d.zeroGames > 0) {
                            svgHtml += `<circle cx="${x - 26}" cy="12" r="6" fill="#64748b" />`;
                            svgHtml += `<text x="${x - 26}" y="14.5" text-anchor="middle" font-size="7" fill="#fff" font-family="sans-serif" font-weight="bold">0</text>`;
                        }
                        if (d.fiveGames > 0) {
                            svgHtml += `<circle cx="${x + 26}" cy="12" r="6" fill="#8b5cf6" />`;
                            svgHtml += `<text x="${x + 26}" y="14.5" text-anchor="middle" font-size="7" fill="#fff" font-family="sans-serif" font-weight="bold">5+</text>`;
                        }
                    }
                });

                svgHtml += `</svg>`;

                return `<tr><td colspan="7" style="padding: 0; position: relative; border-bottom: 1px solid #e2e8f0; border-left: 1px solid #e2e8f0;">${daysHtml}${svgHtml}</td></tr>`;
            };

            for (let i = 0; i < firstDay; i++) {
                const prevDate = new Date(targetYear, targetMonth, i - firstDay + 1);
                const py = prevDate.getFullYear();
                const pm = String(prevDate.getMonth() + 1).padStart(2, '0');
                const pd = String(prevDate.getDate()).padStart(2, '0');
                const dStr = `${py}-${pm}-${pd}`;
                weekDays.push({ empty: true, date: dStr, label: prevDate.getDate(), goals: goalsPerDay[dStr] || 0, goals45: goals45PerDay[dStr] || 0, zeroGames: zeroGamesPerDay[dStr] || 0, fiveGames: fivePlusGamesPerDay[dStr] || 0, zero2HT: zero2HTGamesPerDay[dStr] || 0 });
            }

            for (let day = 1; day <= daysInMonth; day++) {
                const dStr = targetYear + '-' + String(targetMonth + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
                if ((day + firstDay - 1) % 7 === 0 && day !== 1) {
                    calendarHtml += processWeek();
                    weekDays = [];
                }
                weekDays.push({ empty: false, date: dStr, dayNum: day, goals: goalsPerDay[dStr] || 0, goals45: goals45PerDay[dStr] || 0, zeroGames: zeroGamesPerDay[dStr] || 0, fiveGames: fivePlusGamesPerDay[dStr] || 0, zero2HT: zero2HTGamesPerDay[dStr] || 0 });
            }

            const lastDay = new Date(targetYear, targetMonth, daysInMonth).getDay();
            if (lastDay < 6) {
                for (let i = lastDay + 1; i <= 6; i++) {
                    const nextDate = new Date(targetYear, targetMonth, daysInMonth + (i - lastDay));
                    const py = nextDate.getFullYear();
                    const pm = String(nextDate.getMonth() + 1).padStart(2, '0');
                    const pd = String(nextDate.getDate()).padStart(2, '0');
                    const dStr = `${py}-${pm}-${pd}`;
                    weekDays.push({ empty: true, date: dStr, label: nextDate.getDate(), goals: goalsPerDay[dStr] || 0, goals45: goals45PerDay[dStr] || 0, zeroGames: zeroGamesPerDay[dStr] || 0, fiveGames: fivePlusGamesPerDay[dStr] || 0, zero2HT: zero2HTGamesPerDay[dStr] || 0 });
                }
            }

            if (weekDays.length > 0) {
                calendarHtml += processWeek();
            }
            calendarHtml += '</tbody></table></div>';
        }
        calendarHtml += '</div>';


        const renderMasterTimeline = (allMatches, tableMatches, displayDateTL, isSportsOnlyView, isPairedGame = false, hideCalendarBtn = false) => {
            const nowLocal = new Date();
            const nowMins = nowLocal.getHours() * 60 + nowLocal.getMinutes();
            const todayStr2 = nowLocal.getFullYear() + '-' + String(nowLocal.getMonth() + 1).padStart(2, '0') + '-' + String(nowLocal.getDate()).padStart(2, '0');

            const validDates = [];

            // ADD future dates first (today + 3 days ahead)
            const futureDate = new Date();
            for (let i = 0; i <= 3; i++) {
                const fd = new Date(futureDate.getTime() + i * 86400000);
                const fStr = fd.getFullYear() + '-' + String(fd.getMonth() + 1).padStart(2, '0') + '-' + String(fd.getDate()).padStart(2, '0');
                if (!validDates.includes(fStr)) validDates.unshift(fStr); // prepend so future is at top
            }

            if (displayDateTL && displayDateTL.includes('-')) {
                let [yStr, mStr, dStr] = displayDateTL.split('-');
                let currentDt = new Date(parseInt(yStr, 10), parseInt(mStr, 10) - 1, parseInt(dStr, 10));
                let stopDt;
                if (targetYear === 2026) stopDt = new Date(2026, 5, 10);
                else if (targetYear === 2022) stopDt = new Date(2022, 10, 19);
                else if (targetYear === 2018) stopDt = new Date(2018, 5, 13);
                else if (targetYear === 2014) stopDt = new Date(2014, 5, 11);
                else if (targetYear === 2010) stopDt = new Date(2010, 5, 10);
                else if (targetYear === 2006) stopDt = new Date(2006, 5, 8);
                else stopDt = new Date(targetYear, 5, 1);

                while (currentDt >= stopDt) {
                    let curStr = currentDt.getFullYear() + '-' + String(currentDt.getMonth() + 1).padStart(2, '0') + '-' + String(currentDt.getDate()).padStart(2, '0');
                    if (!validDates.includes(curStr)) {
                        validDates.push(curStr);
                    }
                    currentDt.setDate(currentDt.getDate() - 1);
                }
            } else {
                if (displayDateTL && !validDates.includes(displayDateTL)) {
                    validDates.push(displayDateTL);
                }
            }

            // Only plot dates that have matches
            const datesWithMatches = validDates.filter(targetDate => {
                const dateMatches = allMatches.filter(m => m.date === targetDate && (!isSportsOnlyView || m.isTargetFifa));
                return dateMatches.length > 0;
            });

            if (datesWithMatches.length === 0) return '';

            // Compute dynamic range (earliest start time, latest end time) across all visible matches
            let globalMinMins = 24 * 60; // 1440
            let globalMaxMins = 0;

            datesWithMatches.forEach(targetDate => {
                const dateMatches = allMatches.filter(m => m.date === targetDate && (!isSportsOnlyView || m.isTargetFifa));
                dateMatches.forEach(m => {
                    const timeStr = m.start_time || m.time;
                    if (!timeStr || !timeStr.includes(':')) return;
                    const [hStr, mS] = timeStr.split(':');
                    const h = parseInt(hStr, 10);
                    const min = parseInt(mS, 10);
                    if (isNaN(h) || isNaN(min)) return;
                    const startMins = h * 60 + min;
                    if (startMins < globalMinMins) globalMinMins = startMins;
                    if (startMins + 120 > globalMaxMins) globalMaxMins = startMins + 120;
                });
            });

            if (globalMinMins === 24 * 60) {
                globalMinMins = 0;
                globalMaxMins = 1440;
            }

            let startHour = Math.floor(globalMinMins / 60);
            let endHour = Math.min(24, Math.ceil(globalMaxMins / 60));
            if (endHour <= startHour) endHour = Math.min(24, startHour + 2);
            let startMins = startHour * 60;
            let endMins = endHour * 60;
            let totalMins = endMins - startMins;

            const headerHeight = 30;
            const rowHeight = isPairedGame ? 56 : 36;
            const leftMargin = 70;
            const svgWidth = 1000;
            const timeWidth = svgWidth - leftMargin - 20; // 910

            const svgHeight = headerHeight + datesWithMatches.length * rowHeight + 20;
            const containerMaxHeight = isPairedGame ? '320px' : '185px';
            let svg = `<div style="background:#fff; border:1px solid #e2e8f0; border-radius:8px; padding:15px; margin-bottom:15px; box-shadow:0 4px 6px rgba(0,0,0,0.05);">`;
            if (!hideCalendarBtn) {
                svg += `<div style="display: flex; justify-content: flex-end; margin-bottom: 5px; padding-right: 5px;">`;
                svg += `<button onclick="const c = document.getElementById('fifa-calendar-content'); if(c.style.display==='none'){ c.style.display='flex'; this.innerHTML='<i class=\\'fas fa-chevron-up\\'></i> Hide Calendar'; } else { c.style.display='none'; this.innerHTML='<i class=\\'fas fa-chevron-down\\'></i> Show Calendar'; }" style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 4px; padding: 3px 10px; font-size: 10px; color: #475569; font-weight: 600; cursor: pointer; transition: all 0.2s;"><i class="fas fa-chevron-down"></i> Show Calendar</button>`;
                svg += `</div>`;
            }

            svg += `<div style="overflow-y:auto; overflow-x:auto; max-height: ${containerMaxHeight}; border: 1px solid #f1f5f9; border-radius: 6px; margin-bottom: 15px; position: relative;">`;
            
            // Sticky Header Container
            svg += `<div style="position: sticky; top: 0; z-index: 10; background: #fff; height: ${headerHeight}px; border-bottom: 1px solid #e2e8f0; margin-bottom: -${headerHeight}px; width: ${svgWidth}px;">`;
            svg += `<svg viewBox="0 0 ${svgWidth} ${headerHeight}" width="${svgWidth}" height="${headerHeight}" style="display:block;">`;
            for (let h = startHour; h <= endHour; h++) {
                const x = leftMargin + ((h - startHour) / (endHour - startHour)) * timeWidth;
                svg += `<text x="${x}" y="${headerHeight - 10}" text-anchor="middle" font-size="10" fill="#64748b" font-weight="bold">${String(h).padStart(2, '0')}:00</text>`;
            }
            if (datesWithMatches.includes(todayStr2) && nowMins >= startMins && nowMins <= endMins) {
                const nowX = leftMargin + ((nowMins - startMins) / totalMins) * timeWidth;
                svg += `<text x="${nowX}" y="${headerHeight - 3}" text-anchor="middle" font-size="9" fill="#f59e0b" font-weight="bold">NOW</text>`;
            }
            svg += `</svg></div>`;

            // Main SVG Body
            svg += `<svg viewBox="0 0 ${svgWidth} ${svgHeight}" width="${svgWidth}" height="${svgHeight}" style="display:block;">`;

            // Draw X-axis grid lines (no text)
            for (let h = startHour; h <= endHour; h++) {
                const x = leftMargin + ((h - startHour) / (endHour - startHour)) * timeWidth;
                svg += `<line x1="${x}" y1="${headerHeight}" x2="${x}" y2="${svgHeight - 20}" stroke="#e2e8f0" stroke-width="1.5"/>`;
            }

            // Draw NOW grid line (no text)
            if (datesWithMatches.includes(todayStr2) && nowMins >= startMins && nowMins <= endMins) {
                const nowX = leftMargin + ((nowMins - startMins) / totalMins) * timeWidth;
                svg += `<line x1="${nowX}" y1="${headerHeight}" x2="${nowX}" y2="${svgHeight - 20}" stroke="#f59e0b" stroke-width="2" stroke-dasharray="4,3"/>`;
            }

            datesWithMatches.forEach((targetDate, dIdx) => {
                const yTop = headerHeight + dIdx * rowHeight;
                const yCenter = yTop + rowHeight / 2;

                const isToday = targetDate === todayStr2;
                const isFuture = targetDate > todayStr2;

                if (dIdx % 2 === 0 && !isToday) {
                    svg += `<rect x="0" y="${yTop}" width="${svgWidth}" height="${rowHeight}" fill="#f8fafc"/>`;
                }

                // Highlight today's row
                if (isToday) {
                    svg += `<rect x="0" y="${yTop}" width="${svgWidth}" height="${rowHeight}" fill="rgba(245,158,11,0.08)"/>`;
                    svg += `<rect x="0" y="${yTop}" width="4" height="${rowHeight}" fill="#f59e0b"/>`;
                }

                const [, mStr, dStr] = targetDate.split('-');
                svg += `<text x="10" y="${yCenter + 4}" font-size="11" font-weight="bold" fill="#334155">${mStr}/${dStr}</text>`;

                // Show next game time in the date label
                if (isFuture || isToday) {
                    const nextMatch = allMatches
                        .filter(m => m.date === targetDate && m.isTargetFifa)
                        .sort((a, b) => (a.time || '').localeCompare(b.time || ''))[0];
                    if (nextMatch && nextMatch.time) {
                        svg += `<text x="10" y="${yCenter + 14}" font-size="9" fill="#64748b">Next: ${nextMatch.time}</text>`;
                    }
                }

                svg += `<line x1="${leftMargin}" y1="${yCenter}" x2="${svgWidth - 20}" y2="${yCenter}" stroke="#cbd5e1" stroke-width="1"/>`;

                // Add UPCOMING label for future dates
                if (isFuture) {
                    svg += `<text x="${svgWidth - 25}" y="${yCenter + 4}" text-anchor="end" font-size="9" fill="#f59e0b" font-weight="bold">UPCOMING</text>`;
                }

                const dateMatches = allMatches.filter(m => m.date === targetDate);
                let matchRectsHtml = '';
                const seenMatchesPre = new Set();
                const layoutRows = [];
                const matchToRow = {};

                // Sort matches by time first to pack them optimally
                const sortedDateMatches = [...dateMatches].sort((a, b) => {
                    const tA = (a.start_time || a.time || '00:00');
                    const tB = (b.start_time || b.time || '00:00');
                    return tA.localeCompare(tB);
                });
                
                // Pre-calculate overlapping rows
                sortedDateMatches.forEach(m => {
                    if (seenMatchesPre.has(m.matchId)) return;
                    if (isSportsOnlyView && !m.isTargetFifa) return;
                    seenMatchesPre.add(m.matchId);
                    
                    const timeStr = m.start_time || m.time;
                    if (!timeStr || !timeStr.includes(':')) return;
                    const [hStr, mS] = timeStr.split(':');
                    const h = parseInt(hStr, 10);
                    const min = parseInt(mS, 10);
                    if (!isNaN(h) && !isNaN(min)) {
                        const mStartMins = h * 60 + min;
                        // Give a little visual buffer (10 mins) between boxes if they overlap
                        const mEndMins = mStartMins + 125; 
                        
                        let placed = false;
                        for (let r = 0; r < layoutRows.length; r++) {
                            if (mStartMins >= layoutRows[r]) {
                                layoutRows[r] = mEndMins;
                                matchToRow[m.matchId] = r;
                                placed = true;
                                break;
                            }
                        }
                        if (!placed) {
                            matchToRow[m.matchId] = layoutRows.length;
                            layoutRows.push(mEndMins);
                        }
                    }
                });

                const seenMatches = new Set();
                dateMatches.forEach(m => {
                    if (seenMatches.has(m.matchId)) return;

                    const isWorldCup = m.isTargetFifa === true;
                    if (isSportsOnlyView && !isWorldCup) return;
                    seenMatches.add(m.matchId);

                    const timeStr = m.start_time || m.time;
                    if (!timeStr || !timeStr.includes(':')) return;
                    const [hStr, mS] = timeStr.split(':');
                    const h = parseInt(hStr, 10);
                    const min = parseInt(mS, 10);
                    if (isNaN(h) || isNaN(min)) return;

                    const mStartMins = h * 60 + min;

                    const offsetIdx = matchToRow[m.matchId] || 0;
                    const maxRows = Math.max(1, layoutRows.length);

                    const startX = leftMargin + ((mStartMins - startMins) / totalMins) * timeWidth;
                    const barW = (120 / totalMins) * timeWidth;
                    const hasScore = m.score && m.score !== 'VS';
                    const countAtTime = maxRows;

                    let barH, rectY, barColor, strokeAttr, rxVal;
                    if (hasScore) {
                        barH = 22; // Fixed height for boxes
                        const totalBlockH = barH + (countAtTime - 1) * 24;
                        rectY = yCenter - totalBlockH / 2 + offsetIdx * 24;
                        barColor = 'rgba(59,130,246,0.05)';
                        strokeAttr = `stroke="#cbd5e1" stroke-width="1"`;
                        rxVal = 4;
                    } else {
                        barH = Math.max(4, 16 - offsetIdx * 4);
                        const totalBlockH = 16 + (countAtTime - 1) * 4;
                        rectY = yCenter - totalBlockH / 2 + offsetIdx * 4;
                        barColor = isFuture ? 'rgba(245,158,11,0.6)' : 'rgba(59,130,246,0.5)';
                        strokeAttr = "";
                        rxVal = 2;
                    }

                    matchRectsHtml += `<rect x="${startX}" y="${rectY}" width="${barW}" height="${barH}" fill="${barColor}" ${strokeAttr} rx="${rxVal}" style="cursor:pointer;" onclick="const el = document.getElementById('live-match-row-${m.matchId}'); if(el){ el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.style.backgroundColor = '#fef08a'; setTimeout(()=>el.style.backgroundColor='', 2000); }">
                        <title>${m.homeTeam} vs ${m.awayTeam} (${timeStr})</title>
                    </rect>`;

                    // Parse goals to show 1H, 2H, Total boxes like analyst timeline
                    let goals1HT = 0, goals2HT = 0;
                    let has45plus = false, has90plus = false;

                    if (m.goals) {
                        const goalValues = Array.isArray(m.goals) ? m.goals : Object.values(m.goals);
                        goalValues.forEach(val => {
                            if (!val || typeof val !== 'string' || !val.includes("'")) return;
                            const entries = val.split('<br>').filter(g => g.trim() !== '');
                            entries.forEach(entry => {
                                const minMatch = entry.match(/(\d+)(?:\+(\d+))?'/);
                                if (!minMatch) return;
                                const mMin = parseInt(minMatch[1], 10);
                                const added = minMatch[2] ? parseInt(minMatch[2], 10) : 0;
                                const effective = mMin + added;

                                if (mMin < 45) {
                                    goals1HT++;
                                    if (effective >= 43) has45plus = true;
                                } else if (mMin === 45) {
                                    goals1HT++;
                                    has45plus = true;
                                } else if (mMin < 90) {
                                    goals2HT++;
                                    if (effective >= 88) has90plus = true;
                                } else {
                                    goals2HT++;
                                    has90plus = true;
                                }
                            });
                        });
                    }

                    if (goals1HT === 0 && goals2HT === 0) {
                        if (m.score_ht && m.score_ht !== 'VS') {
                            const p = m.score_ht.split('-');
                            if (p.length === 2) {
                                const s1 = parseInt(p[0], 10), s2 = parseInt(p[1], 10);
                                if (!isNaN(s1) && !isNaN(s2)) goals1HT = s1 + s2;
                            }
                        }
                        if (m.score && m.score !== 'VS') {
                            const p = m.score.split('-');
                            if (p.length === 2) {
                                const s1 = parseInt(p[0], 10), s2 = parseInt(p[1], 10);
                                if (!isNaN(s1) && !isNaN(s2)) {
                                    const full = s1 + s2;
                                    goals2HT = Math.max(0, full - goals1HT);
                                }
                            }
                        }
                    }

                    let total = goals1HT + goals2HT;
                    if (m.score && m.score !== 'VS' && m.score !== '') {
                        const p = m.score.split('-');
                        if (p.length === 2) {
                            const s1 = parseInt(p[0], 10), s2 = parseInt(p[1], 10);
                            if (!isNaN(s1) && !isNaN(s2)) {
                                total = s1 + s2;
                                if (goals1HT === 0 && goals2HT === 0 && m.score_ht && m.score_ht !== 'VS') {
                                    const ph = m.score_ht.split('-');
                                    if (ph.length === 2) {
                                        const h1 = parseInt(ph[0], 10), h2 = parseInt(ph[1], 10);
                                        if (!isNaN(h1) && !isNaN(h2)) goals1HT = h1 + h2;
                                        goals2HT = Math.max(0, total - goals1HT);
                                    }
                                }
                            }
                        }
                    }

                    // Only render boxes if there's a score
                    if (hasScore) {
                        const g1alpha = has45plus ? Math.min(1, 0.5 + goals1HT * 0.15) : 0;
                        const box1bg = has45plus ? `rgba(34,197,94,${g1alpha})` : 'transparent';
                        const box1color = has45plus ? '#fff' : '#334155';
                        const box1border = has45plus ? '#22c55e' : '#cbd5e1';

                        const g2alpha = has90plus ? Math.min(1, 0.5 + goals2HT * 0.15) : 0;
                        const box2bg = has90plus ? `rgba(239,68,68,${g2alpha})` : 'transparent';
                        const box2color = has90plus ? '#fff' : '#334155';
                        const box2border = has90plus ? '#ef4444' : '#cbd5e1';

                        let box3bg = 'transparent', box3color = '#334155', box3border = '#cbd5e1';
                        if (total === 0) { box3bg = '#64748b'; box3color = '#fff'; box3border = '#64748b'; }
                        if (total >= 5) { box3bg = '#8b5cf6'; box3color = '#fff'; box3border = '#8b5cf6'; }

                        const boxStyle = (bg, color, border) =>
                            `width:20px;height:16px;background:${bg};color:${color};
                             border:1px solid ${border};border-radius:3px;
                             display:flex;align-items:center;justify-content:center;
                             font-size:9px;font-weight:700;`;

                        const foHtml = `<div style="display:flex;align-items:center;gap:2px;height:100%;width:100%;justify-content:center;pointer-events:none;">
                            <div style="${boxStyle(box1bg, box1color, box1border)}" title="1H">${goals1HT || ''}</div>
                            <div style="${boxStyle(box2bg, box2color, box2border)}" title="2H">${goals2HT || ''}</div>
                            <div style="${boxStyle(box3bg, box3color, box3border)}" title="Total">${total}</div>
                        </div>`;

                        matchRectsHtml += `<foreignObject x="${startX}" y="${rectY}" width="${barW}" height="${barH}" style="pointer-events:none;">
                            ${foHtml}
                        </foreignObject>`;
                    }
                });

                // Add individual match blocks and foreign objects
                svg += matchRectsHtml;
            });

            svg += '</svg></div>'; // Close scrollable SVG container

            svg += '</div>'; // Close main wrapper
            return svg;
        };

        // --- ADDED ANALYST TIMELINE SECTION ---
        const renderAnalystTimeline = (matches, title, highlightMatchId = null, showMatchText = false) => {
            if (!matches || matches.length === 0) return '';

            let sortedMatches = matches
                .filter(m => m.date)
                .sort((a, b) => {
                    const toISO = d => {
                        if (!d) return '';
                        if (d.includes('/')) {
                            const parts = d.split('/');
                            // Format is DD/MM/YY
                            return `20${parts[2]}-${parts[1]}-${parts[0]}`;
                        }
                        return d; // already YYYY-MM-DD
                    };
                    let cmp = toISO(b.date).localeCompare(toISO(a.date));
                    if (cmp === 0 && a.time && b.time) {
                        cmp = b.time.localeCompare(a.time);
                    }
                    return highlightMatchId ? -cmp : cmp; // Ascending if round, else Descending
                });

            if (!highlightMatchId) {
                sortedMatches = sortedMatches.slice(0, 3);
            }

            if (sortedMatches.length === 0) return '';
            console.log('renderAnalystTimeline', title, sortedMatches.map(m => m.date + ' ' + m.score));

            let rows = '';
            let prevDate = null;
            sortedMatches.forEach(m => {
                let goals1HT = 0, goals2HT = 0;
                let has45plus = false, has90plus = false;
                let goalTimes = [];
                let extractedScore = null;

                if (m.goals) {
                    const goalValues = Array.isArray(m.goals) ? m.goals : Object.values(m.goals);
                    goalValues.forEach(val => {
                        if (!val || typeof val !== 'string' || !val.includes("'")) return;
                        const entries = val.split('<br>').filter(g => g.trim() !== '');
                        entries.forEach(entry => {
                            const minMatch = entry.match(/(\d+)(?:\+(\d+))?'/);
                            if (minMatch) {
                                const minStrMatch = entry.match(/(\d+(?:\+\d+)?')/);
                                if (minStrMatch) goalTimes.push(minStrMatch[1]);

                                const scoreMatch = entry.match(/\((\d+-\d+)\)/);
                                if (scoreMatch) extractedScore = scoreMatch[1];

                                const min = parseInt(minMatch[1], 10);
                                const added = minMatch[2] ? parseInt(minMatch[2], 10) : 0;
                                const effective = min + added;

                                if (min <= 90) {
                                    if (min < 45) {
                                        goals1HT++;
                                        if (effective >= 43) has45plus = true;
                                    } else if (min === 45) {
                                        goals1HT++;
                                        has45plus = true;
                                    } else if (min < 90) {
                                        goals2HT++;
                                        if (effective >= 88) has90plus = true;
                                    } else {
                                        goals2HT++;
                                        has90plus = true;
                                    }
                                }
                            }
                        });
                    });
                }

                let goalsText = '';
                if (goalTimes.length > 0) {
                    goalTimes.sort((a, b) => parseInt(a.split('+')[0]) - parseInt(b.split('+')[0]));
                    goalsText = ` [ ${goalTimes.join(', ')} ]`;
                }

                if (goals1HT === 0 && goals2HT === 0) {
                    if (m.score_ht && m.score_ht !== 'VS') {
                        const p = m.score_ht.split('-');
                        if (p.length === 2) {
                            const s1 = parseInt(p[0], 10), s2 = parseInt(p[1], 10);
                            if (!isNaN(s1) && !isNaN(s2)) goals1HT = s1 + s2;
                        }
                    }
                    if (m.score && m.score !== 'VS') {
                        const p = m.score.split('-');
                        if (p.length === 2) {
                            const s1 = parseInt(p[0], 10), s2 = parseInt(p[1], 10);
                            if (!isNaN(s1) && !isNaN(s2)) {
                                const full = s1 + s2;
                                goals2HT = Math.max(0, full - goals1HT);
                            }
                        }
                    }
                }

                let total = goals1HT + goals2HT;
                const actualScore = (m.score && m.score !== 'VS' && m.score !== '') ? m.score : (extractedScore || '');
                if (actualScore) {
                    const p = actualScore.split('-');
                    if (p.length === 2) {
                        const s1 = parseInt(p[0], 10), s2 = parseInt(p[1], 10);
                        if (!isNaN(s1) && !isNaN(s2)) {
                            total = s1 + s2;
                            if ((goals1HT === 0 && goals2HT === 0 || goals1HT + goals2HT < total) && m.score_ht && m.score_ht !== 'VS') {
                                const ph = m.score_ht.split('-');
                                if (ph.length === 2) {
                                    const h1 = parseInt(ph[0], 10), h2 = parseInt(ph[1], 10);
                                    if (!isNaN(h1) && !isNaN(h2)) goals1HT = h1 + h2;
                                    goals2HT = Math.max(0, total - goals1HT);
                                }
                            } else if (goals1HT + goals2HT < total) {
                                goals2HT = Math.max(0, total - goals1HT);
                            }
                        }
                    }
                }

                const box1bg = has45plus ? '#22c55e' : 'transparent';
                const box1color = has45plus ? '#fff' : '#334155';
                const box1border = has45plus ? '#22c55e' : '#cbd5e1';

                const is2HTZero = (goals2HT === 0 && total > 0);
                const box2bg = has90plus ? '#ef4444' : (is2HTZero ? '#000000' : 'transparent');
                const box2color = has90plus ? '#fff' : (is2HTZero ? '#fff' : '#334155');
                const box2border = has90plus ? '#ef4444' : (is2HTZero ? '#000000' : '#cbd5e1');

                let box3bg = 'transparent', box3color = '#334155', box3border = '#cbd5e1';
                if (total === 0) { box3bg = '#64748b'; box3color = '#fff'; box3border = '#64748b'; }
                if (total >= 5) { box3bg = '#8b5cf6'; box3color = '#fff'; box3border = '#8b5cf6'; }

                const boxStyle = (bg, color, border) =>
                    `width:26px;height:22px;background:${bg};color:${color};
                         border:1.5px solid ${border};border-radius:4px;
                         display:flex;align-items:center;justify-content:center;
                         font-size:12px;font-weight:700;cursor:pointer;`;

                const onClick = m.matchId ? `onclick="if(window.scrollToMatch) window.scrollToMatch('${m.matchId}');"` : '';

                const tooltipTitle = `${m.title || ''} | ${actualScore}${goalsText}`;
                let rowBg = (highlightMatchId && String(m.matchId) === String(highlightMatchId)) ? '#e0f2fe' : 'transparent';

                const mdStr = m.date ? m.date.substring(5).replace('-', '') : '';
                const timeStr = m.time || m.start_time || '';
                const scoreStr = (m.score && m.score !== 'VS' && m.score !== '') ? m.score : (extractedScore || 'VS');
                let datePrefix = '';
                if (mdStr && mdStr !== prevDate) {
                    datePrefix = `<span style="color:#0f172a; margin-right:4px;">${mdStr}</span>`;
                    prevDate = mdStr;
                } else {
                    datePrefix = `<span style="visibility:hidden; margin-right:4px;">0000</span>`;
                }
                const matchText = showMatchText ? `<div style="font-size:10px; color:#64748b; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-left:4px;" title="${mdStr} ${timeStr} | ${m.homeTeam} vs ${m.awayTeam}">${datePrefix}${timeStr} | ${m.homeTeam || ''} <span style="color:#f59e0b;">${scoreStr}</span> ${m.awayTeam || ''}</div>` : '';

                rows += `
                        <div style="display:flex;align-items:center;gap:3px;margin-bottom:3px;background:${rowBg};padding:2px;border-radius:4px;" ${onClick} title="${tooltipTitle.replace(/"/g, '&quot;')}">
                            <div style="${boxStyle(box1bg, box1color, box1border)}" title="1HT: ${goals1HT} goals">${goals1HT}</div>
                            <div style="${boxStyle(box2bg, box2color, box2border)}" title="2HT: ${goals2HT} goals">${goals2HT}</div>
                            <div style="${boxStyle(box3bg, box3color, box3border)}" title="Total: ${total} goals">${total}</div>
                            ${matchText}
                        </div>`;
            });

            return `<div style="padding:4px 6px;background:#fff;border:1px solid #e2e8f0;
                                 border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,0.05);margin-bottom:5px;">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:3px;">
                    <div style="display:flex; align-items:center; gap: 4px; min-width:0; flex:1;">
                        <div style="font-size:10px; font-weight:700; color:#475569; padding-right:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${title}">${title}</div>
                    </div>
                    <div style="display:flex;gap:3px;flex-shrink:0;">
                        <div style="width:26px;text-align:center;font-size:8px;color:#94a3b8;font-weight:700;">1HT</div>
                        <div style="width:26px;text-align:center;font-size:8px;color:#94a3b8;font-weight:700;">2HT</div>
                        <div style="width:26px;text-align:center;font-size:8px;color:#94a3b8;font-weight:700;">Goal</div>
                    </div>
                </div>
                ${rows}
            </div>`;
        };

        const renderH2HSummary = (matches, homeTeam, awayTeam) => {
            if (!matches || matches.length === 0) return '';
            let homeWins = 0, awayWins = 0, draws = 0;
            matches.forEach(m => {
                if (m.score && m.score !== 'VS') {
                    const parts = m.score.split('-');
                    if (parts.length === 2) {
                        const s1 = parseInt(parts[0], 10);
                        const s2 = parseInt(parts[1], 10);
                        if (!isNaN(s1) && !isNaN(s2)) {
                            let hScore = (m.homeTeam === homeTeam) ? s1 : s2;
                            let aScore = (m.homeTeam === homeTeam) ? s2 : s1;
                            if (hScore > aScore) homeWins++;
                            else if (aScore > hScore) awayWins++;
                            else draws++;
                        }
                    }
                }
            });

            const total = homeWins + awayWins + draws;
            if (total === 0) return '';

            const hp = (homeWins / total) * 100;
            const dp = (draws / total) * 100;
            const ap = (awayWins / total) * 100;

            let barHtml = `<div style="display:flex; height: 12px; border-radius: 4px; overflow: hidden; margin-top: 5px;">`;
            if (homeWins > 0) barHtml += `<div style="width: ${hp}%; background: #3b82f6;" title="${homeTeam} Wins: ${homeWins}"></div>`;
            if (draws > 0) barHtml += `<div style="width: ${dp}%; background: #94a3b8;" title="Draws: ${draws}"></div>`;
            if (awayWins > 0) barHtml += `<div style="width: ${ap}%; background: #ef4444;" title="${awayTeam} Wins: ${awayWins}"></div>`;
            barHtml += `</div>`;

            let labelsHtml = `<div style="display:flex; justify-content: space-between; font-size: 11px; font-weight: bold; color: #475569; margin-top: 4px;">
                <span style="color: #3b82f6;">${homeTeam}: ${homeWins}W</span>
                <span style="color: #94a3b8;">Draws: ${draws}</span>
                <span style="color: #ef4444;">${awayTeam}: ${awayWins}W</span>
            </div>`;

            return `<div style="background:#fff; border:1px solid #e2e8f0; border-radius:8px; padding:10px; box-shadow:0 2px 4px rgba(0,0,0,0.05); margin-bottom: 0;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div style="font-size: 13px; font-weight: bold; color: #1e293b;">H2H Summary</div>
                    <button id="btn-fetch-schedule" onclick="if(window.App) window.App.fetchLeagueSchedule()" style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 4px; padding: 2px 8px; font-size: 10px; color: #3b82f6; font-weight: 600; cursor: pointer; transition: all 0.2s;"><i id="fetch-schedule-icon" class="fas fa-calendar-alt"></i> Fetch League</button>
                </div>
                ${barHtml}
                ${labelsHtml}
            </div>`;
        };

        const renderTimelineForDate = (targetDate) => { return ""; };

        const isSportsOnlyViewMaster = window.location.hash === '#sports' || window.location.hash.startsWith('#sports?') || window.location.hash.startsWith('#sports/FIFA-') || window.location.hash.startsWith('#sports/') && window.location.hash.includes('-FIFA');

        let isGameAnalystView = false;
        let homeTeam = null;
        let awayTeam = null;
        let isPairedGame = false;

        if ((window.location.hash.startsWith('#sports/' + targetYear + '-FIFA/') || window.location.hash.startsWith('#all_live_soccer/')) && window.location.hash.includes('_id_')) {
            isGameAnalystView = true;
            const parts = window.location.hash.split('/');
            const teamsPart = parts[parts.length - 1];
            const vsParts = teamsPart.split('_id_')[0].split('-vs-');
            if (vsParts.length === 2) {
                homeTeam = decodeURIComponent(vsParts[0]);
                awayTeam = decodeURIComponent(vsParts[1]);
            }
            
            const primaryMatchId = window.location.hash.split('_id_')[1];
            const primaryMatch = allMatches.find(m => m.matchId === primaryMatchId);
            if (primaryMatch && primaryMatch.date) {
                const pairedMatches = allMatches.filter(m =>
                    m.isTargetFifa && m.date === primaryMatch.date && m.group === primaryMatch.group && m.matchId && m.matchId !== primaryMatchId && m.score !== undefined
                );
                if (pairedMatches.length > 0) {
                    isPairedGame = true;
                }
            }
        }

        if (isGameAnalystView && homeTeam && awayTeam) {
            html += '<div style="display: flex; gap: 20px;">';
            html += '<div style="flex: 4; min-width: 0;">';
        }

        const hideBtn = (isGameAnalystView && homeTeam && awayTeam) ? true : false;
        html += renderMasterTimeline(allMatches, tableMatches, displayDateTL, isSportsOnlyViewMaster, isPairedGame, hideBtn);
        html += calendarHtml;

        if (isGameAnalystView && homeTeam && awayTeam) {
            html += '</div>'; // End left column

            const containerMaxHeight = isPairedGame ? '320px' : '185px';
            html += `<div style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px; padding-right: 10px; max-height: ${containerMaxHeight}; overflow-y: auto;">`;
            html += `<div style="display: flex; justify-content: flex-end;">
                        <button onclick="const c = document.getElementById('fifa-calendar-content'); if(c.style.display==='none'){ c.style.display='flex'; this.innerHTML='<i class=\\'fas fa-chevron-up\\'></i> Hide Calendar'; } else { c.style.display='none'; this.innerHTML='<i class=\\'fas fa-chevron-down\\'></i> Show Calendar'; }" style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 4px; padding: 3px 10px; font-size: 10px; color: #475569; font-weight: 600; cursor: pointer; transition: all 0.2s;"><i class="fas fa-chevron-down"></i> Show Calendar</button>
                     </div>`;
            html += '<div id="analyst-timelines-container" style="display:flex;flex-direction:column;gap:4px;">';
            html += '<div style="font-size: 13px; font-weight: bold; color: #64748b; padding: 10px; text-align: center;">Loading Analyst Data...</div>';
            html += '</div>';
            
            // Add legend at the bottom right of the analyst box
            html += `
            <div style="font-size: 10px; color: #64748b; display: flex; align-items: center; justify-content: flex-end; padding-top: 2px; padding-right: 10px; gap: 12px; margin-bottom: 4px;">
                <div style="display: flex; align-items: center; gap: 4px;"><div style="width: 8px; height: 8px; border-radius: 50%; background: #22c55e;"></div> 45'+ Goals</div>
                <div style="display: flex; align-items: center; gap: 4px;"><div style="width: 8px; height: 8px; border-radius: 50%; background: #ef4444;"></div> 90'+ Goals</div>
                <div style="display: flex; align-items: center; gap: 4px;"><div style="width: 8px; height: 8px; border-radius: 50%; background: #64748b;"></div> 0 Goals</div>
                <div style="display: flex; align-items: center; gap: 4px;"><div style="width: 8px; height: 8px; border-radius: 50%; background: #8b5cf6;"></div> 5+ Goals</div>
            </div>
            `;
            html += '</div></div>'; // End right column and flex container

            // Collect all game matchIds on the same date to support paired games
            const primaryMatchId = window.location.hash.split('_id_')[1];
            const primaryMatch = allMatches.find(m => m.matchId === primaryMatchId);

            if (primaryMatch && primaryMatch.date) {
                // Find all FIFA matches on the same date (paired games)
                const pairedMatches = allMatches.filter(m =>
                    m.isTargetFifa &&
                    m.date === primaryMatch.date &&
                    m.group === primaryMatch.group &&
                    m.matchId &&
                    m.matchId !== primaryMatchId &&
                    m.score !== undefined // has some data
                );

                // Build list: primary first, then paired
                const matchesToRender = [primaryMatch, ...pairedMatches];

                setTimeout(() => {
                    const container = document.getElementById('analyst-timelines-container');
                    if (!container) return;
                    container.innerHTML = ''; // Clear loading text

                    let pending = matchesToRender.length;
                    const rows = new Array(matchesToRender.length).fill('');

                    const tryRender = () => {
                        pending--;
                        if (pending <= 0) {
                            container.innerHTML = rows.join('');
                        }
                    };

                    matchesToRender.forEach((match, idx) => {
                        const dateParts = match.date.split('-');
                        const refUrl = `/sports/refs/${dateParts[0]}/${dateParts[1]}/${dateParts[0]}_${dateParts[1]}_${dateParts[2]}/${match.matchId}.json`;

                        const rowLabel = `<div style="font-size:9px;color:#94a3b8;font-weight:600;margin-bottom:2px;padding-left:2px;">
                            ${match.homeTeam || ''} vs ${match.awayTeam || ''}
                        </div>`;

                        const renderRefData = (refMatches) => {
                            const uniqueGroups = [];
                            refMatches.forEach(m => {
                                if (m.group && !uniqueGroups.includes(m.group)) {
                                    uniqueGroups.push(m.group);
                                }
                            });

                            const h2h = refMatches.filter(m => m.group === uniqueGroups[0]);
                            const homeM = refMatches.filter(m => m.group === uniqueGroups[1]);
                            const awayM = refMatches.filter(m => m.group === uniqueGroups[2]);

                            const roundM = allMatches.filter(m => m.group === match.group);
                            const roundTitle = "2026 FIFA World Cup - " + (match.group || 'Round');

                            let refHtml = `<div style="border:1px solid #e2e8f0;border-radius:6px;padding:4px;margin-bottom:4px;background:#fafafa;">`;
                            refHtml += `<div style="margin-bottom:6px;">${renderAnalystTimeline(roundM, roundTitle, match.matchId, true)}</div>`;
                            refHtml += `<div style="display:flex;gap:4px;">`;
                            refHtml += `<div style="flex:1;min-width:0;">${renderAnalystTimeline(h2h, 'H2H')}</div>`;
                            refHtml += `<div style="flex:1;min-width:0;">${renderAnalystTimeline(homeM, uniqueGroups[1] || '')}</div>`;
                            refHtml += `<div style="flex:1;min-width:0;">${renderAnalystTimeline(awayM, uniqueGroups[2] || '')}</div>`;
                            refHtml += `</div></div>`;
                            return refHtml;
                        };

                        fetch(refUrl)
                            .then(r => r.json())
                            .then(refMatches => {
                                rows[idx] = renderRefData(refMatches);
                                tryRender();
                            })
                            .catch(() => {
                                rows[idx] = `<div style="font-size:11px;color:#ef4444;padding:4px;">${match.homeTeam} vs ${match.awayTeam}: failed to load</div>`;
                                tryRender();
                            });

                    });
                }, 50);
            }
        }

        html += '</div>'; // Close sticky wrapper

        if (displayDateTL && displayDateTL.includes('-')) {
            let [yStr, mStr, dStr] = displayDateTL.split('-');
            let currentDt = new Date(parseInt(yStr, 10), parseInt(mStr, 10) - 1, parseInt(dStr, 10));
            let stopDt;
            if (targetYear === 2026) stopDt = new Date(2026, 5, 10);
            else if (targetYear === 2022) stopDt = new Date(2022, 10, 19);
            else if (targetYear === 2018) stopDt = new Date(2018, 5, 13);
            else if (targetYear === 2014) stopDt = new Date(2014, 5, 11);
            else if (targetYear === 2010) stopDt = new Date(2010, 5, 10);
            else if (targetYear === 2006) stopDt = new Date(2006, 5, 8);
            else stopDt = new Date(targetYear, 5, 1);

            while (currentDt >= stopDt) {
                let curStr = currentDt.getFullYear() + '-' + String(currentDt.getMonth() + 1).padStart(2, '0') + '-' + String(currentDt.getDate()).padStart(2, '0');
                html += renderTimelineForDate(curStr);
                currentDt.setDate(currentDt.getDate() - 1);
            }
        } else {
            html += renderTimelineForDate(displayDateTL);
        }

        calendarContainer.innerHTML = html;

        // Auto-scroll timeline to the current time disabled
        /* setTimeout(() => {
            const scrollContainers = document.querySelectorAll('.timeline-scroll-container');
            scrollContainers.forEach(scrollContainer => {
                const now = new Date();
                let currentMins = now.getHours() * 60 + now.getMinutes();
                if (now.getHours() < 8) currentMins += 24 * 60; // Map early morning past midnight
                
                const idx = (currentMins - 480) / 15;
                if (idx >= 0) {
                    const targetX = 40 + 70 * idx;
                    const cw = scrollContainer.clientWidth || 800; // fallback if 0
                    const scrollTarget = Math.max(0, targetX - (cw / 2));
                    
                    // Use scrollTo for more reliable smooth scrolling
                    scrollContainer.scrollTo({ left: scrollTarget, behavior: 'smooth' });
                    
                    // As a final safety net for browsers ignoring smooth scrolling while hidden:
                    setTimeout(() => {
                        if (scrollContainer.scrollLeft < scrollTarget - 10 || scrollContainer.scrollLeft > scrollTarget + 10) {
                            scrollContainer.scrollLeft = scrollTarget;
                        }
                    }, 500);
                }
            });
        }, 300); */
    }
};
