/**
 * sports_fifa2026.js
 * Mixin for the Last Game Every Day dashboard view.
 */

export const SportsMixin = {
    fetchAndRenderLastGameCalendar: async function() {
        const fetchWithTimeout = (url, ms = 3000) => {
            return Promise.race([
                fetch(url),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Fetch timeout after ' + ms + 'ms for ' + url)), ms))
            ]);
        };
        try {
            const [f26, f22, f18, f14, f10, f06] = await Promise.all([
                fetchWithTimeout('/sports/leagues/FIFA_2026.json?v=' + Date.now(), 5000).then(r => r.json()).catch(()=>[]),
                fetchWithTimeout('/sports/leagues/FIFA_2022.json?v=' + Date.now(), 5000).then(r => r.json()).catch(()=>[]),
                fetchWithTimeout('/sports/leagues/FIFA_2018.json?v=' + Date.now(), 5000).then(r => r.json()).catch(()=>[]),
                fetchWithTimeout('/sports/leagues/FIFA_2014.json?v=' + Date.now(), 5000).then(r => r.json()).catch(()=>[]),
                fetchWithTimeout('/sports/leagues/FIFA_2010.json?v=' + Date.now(), 5000).then(r => r.json()).catch(()=>[]),
                fetchWithTimeout('/sports/leagues/FIFA_2006.json?v=' + Date.now(), 5000).then(r => r.json()).catch(()=>[])
            ]);
            
            const nowLive = new Date();
            let livePromises = [];
            for (let i = 0; i < 30; i++) {
                const d = new Date(nowLive.getTime() - i * 86400000);
                const dStr = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
                if (dStr < '2026-05-31') break; // Do not fetch previous dates
                livePromises.push(
                    fetchWithTimeout(`/sports/live_game/live_games_${dStr}.json?v=` + Date.now(), 2000).then(r => r.json()).catch(()=>[])
                );
            }
            const liveDaysData = await Promise.all(livePromises);
            let allLive = [];
            liveDaysData.forEach(dayData => {
                if (Array.isArray(dayData)) allLive.push(...dayData);
            });

            
              const isSportsOnlyViewMasterStrict = window.location.hash === '#sports' || window.location.hash.startsWith('#sports/FIFA-2026') || window.location.hash.startsWith('#sports/2026-FIFA');
              const f26MatchIds = new Set(f26.map(m => m.matchId).filter(id => id));
              const filteredLive = allLive.filter(m => f26MatchIds.has(m.matchId) || m.isFifa2026 || m.isFifa);
              let allFifa = isSportsOnlyViewMasterStrict ? [...f26, ...filteredLive] : [...f26, ...f22, ...f18, ...f14, ...f10, ...f06, ...allLive];
    
            
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
                if (m.matchId && f26MatchIds.has(m.matchId)) m.isFifa2026 = true;
            });
            
            let lastGamesByDay = {};
            const isSportsOnlyView = window.location.hash === '#sports' || window.location.hash.startsWith('#sports?') || window.location.hash.startsWith('#sports/FIFA-2026') || window.location.hash.startsWith('#sports/2026-FIFA');
            allFifa.forEach(m => {
                if (isSportsOnlyView && !m.isFifa2026) return;
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
            
            let sortedAllDates = Object.keys(lastGamesByDay).sort((a,b) => b.localeCompare(a));
            
            const tomorrow = new Date(nowLive.getTime() + 86400000);
            const maxDateStr = tomorrow.getFullYear() + '-' + String(tomorrow.getMonth() + 1).padStart(2, '0') + '-' + String(tomorrow.getDate()).padStart(2, '0');
            
            let calMatches = [];
            for (let dStr of sortedAllDates) {
                if (dStr <= maxDateStr) {
                    lastGamesByDay[dStr].forEach(m => calMatches.push(m));
                }
            }
            if (typeof this.renderLastGameCalendar === 'function') {
                this.renderLastGameCalendar(allFifa, calMatches);
            }
        } catch(e) {
            console.error('Failed to load last game calendar for 2026', e);
        }
    },

    renderLastGameCalendar: function(allMatches, tableMatches = null) {
        const calendarContainer = document.getElementById('last-game-calendar-container');
        if (!calendarContainer) return;
        
        // Use tableMatches for the calendar if provided, otherwise fallback to allMatches
        const calendarMatches = tableMatches || allMatches;
        
        // Compute 90'+ goals per day
        const goalsPerDay = {};
        const goals45PerDay = {};
        const zero2HTGamesPerDay = {};
        const seenGoalsMatchIds = new Set();
        calendarMatches.forEach(m => {
            if (seenGoalsMatchIds.has(m.matchId)) return;
            seenGoalsMatchIds.add(m.matchId);
            
            const dStr = m.date || 'Unknown';
            if (!goalsPerDay[dStr]) goalsPerDay[dStr] = 0;
            if (!goals45PerDay[dStr]) goals45PerDay[dStr] = 0;
            if (!zero2HTGamesPerDay[dStr]) zero2HTGamesPerDay[dStr] = 0;
            
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

        let html = '<div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 4px; box-shadow: 0 4px 10px rgba(0,0,0,0.15); margin-bottom: 15px; position: sticky; top: 0; z-index: 100; display: flex; flex-direction: row; gap: 10px; max-height: 30vh; overflow: auto;">';

        for (let mOffset = 0; mOffset < 2; mOffset++) {
            let targetMonth = month + mOffset;
            let targetYear = yearNum;
            if (targetMonth > 11) {
                targetMonth -= 12;
                targetYear++;
            }
            
            const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
            const firstDay = new Date(targetYear, targetMonth, 1).getDay();
            
            html += '<div style="flex: 1;">';
            const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
            html += `<h3 style="text-align: center; margin-top: 0; margin-bottom: 2px; color: #1e293b; font-weight: 600; font-size: 12px;">${monthNames[targetMonth]} ${targetYear} - 90'+ Goals</h3>`;
            
            html += '<table style="width: 100%; border-collapse: collapse; table-layout: fixed;">';
            html += '<thead><tr>';
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            days.forEach(d => {
                html += `<th style="text-align: center; padding: 2px; color: #64748b; font-weight: 600; font-size: 10px; border-bottom: 2px solid #e2e8f0;">${d}</th>`;
            });
            html += '</tr></thead><tbody>';
            
            let weekDays = [];
            
            const processWeek = () => {
                if (weekDays.length === 0) return '';
                // 1. Build the flex grid string for days
                let daysHtml = '<div style="display: flex; width: 100%;">';
                weekDays.forEach(d => {
                    if (d.empty) {
                        daysHtml += `<div style="flex: 1; height: 35px; border-right: 1px solid #e2e8f0; background: #f8fafc; display: flex; justify-content: center; padding-top: 2px; color: #94a3b8; font-size: 10px; cursor: pointer;" onclick="if(window.App && App.scrollToCurrentSports) { App.targetScrollDate='${d.date}'; App.scrollToCurrentSports(); }">${d.label}</div>`;
                    } else {
                        const isSelectedDate = d.dayNum === todayDateNum && mOffset === 0; 
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
                        // Only draw line chart for World Cup active period
                        if (d.date >= '2026-06-11' && d.date <= '2026-07-19') {
                            const val = chartType === '45' ? d.goals45 : (chartType === '2ht0' ? d.zero2HT : d.goals);
                            if (!val || val === 0) return;
                            
                            const basePathX = 50 + 100 * idx;
                            let barX = basePathX;
                            let color = '';
                            if (chartType === '45') { barX = basePathX - 10; color = '#22c55e'; }
                            else if (chartType === '90') { barX = basePathX; color = '#ef4444'; }
                            else if (chartType === '2ht0') { barX = basePathX + 10; color = '#000000'; }

                            const y = 32 - (val / maxGoals) * 12;
                            const height = 32 - y;
                            const opacity = chartType === '2ht0' ? '0.4' : '0.2';
                            outHtml += `<rect x="${barX - 4}" y="${y}" width="8" height="${height}" fill="${color}" opacity="${opacity}" rx="2" />`;
                        }
                    });
                    return outHtml;
                };

                svgHtml += buildBars('90');
                svgHtml += buildBars('45');
                svgHtml += buildBars('2ht0');
                
                weekDays.forEach((d, idx) => {
                    if (d.date >= '2026-06-11' && d.date <= '2026-07-19') {
                        const x = 50 + 100 * idx;
                        const y = (!d.goals || d.goals === -1) ? 32 : 32 - (d.goals / maxGoals) * 12;
                        const y45 = (!d.goals45 || d.goals45 === -1) ? 32 : 32 - (d.goals45 / maxGoals) * 12;
                        const y2ht0 = (!d.zero2HT || d.zero2HT === -1) ? 32 : 32 - (d.zero2HT / maxGoals) * 12;
                        
                        if (d.goals45 > 0) {
                            const cx = x - 10;
                            svgHtml += `<circle cx="${cx}" cy="${y45}" r="2.5" fill="#22c55e" />`;
                            svgHtml += `<text x="${cx}" y="${y45 - 4}" text-anchor="middle" font-size="8" fill="#22c55e" font-family="sans-serif" font-weight="bold">${d.goals45}</text>`;
                        }
                        if (d.goals > 0) {
                            const cx = x;
                            svgHtml += `<circle cx="${cx}" cy="${y}" r="2.5" fill="#ef4444" />`;
                            svgHtml += `<text x="${cx}" y="${y - 4}" text-anchor="middle" font-size="8" fill="#ef4444" font-family="sans-serif" font-weight="bold">${d.goals}</text>`;
                        }
                        if (d.zero2HT > 0) {
                            const cx = x + 10;
                            svgHtml += `<circle cx="${cx}" cy="${y2ht0}" r="2.5" fill="#000000" />`;
                            svgHtml += `<text x="${cx}" y="${y2ht0 - 4}" text-anchor="middle" font-size="9" fill="#000000" font-family="sans-serif" font-weight="900">${d.zero2HT}</text>`;
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
                weekDays.push({ empty: true, date: dStr, label: prevDate.getDate(), goals: goalsPerDay[dStr] || 0, goals45: goals45PerDay[dStr] || 0, zero2HT: zero2HTGamesPerDay[dStr] || 0 });
            }
            
            for (let day = 1; day <= daysInMonth; day++) {
                const dStr = targetYear + '-' + String(targetMonth + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
                if ((day + firstDay - 1) % 7 === 0 && day !== 1) {
                    html += processWeek();
                    weekDays = [];
                }
                weekDays.push({ empty: false, date: dStr, dayNum: day, goals: goalsPerDay[dStr] || 0, goals45: goals45PerDay[dStr] || 0, zero2HT: zero2HTGamesPerDay[dStr] || 0 });
            }
            
            const lastDay = new Date(targetYear, targetMonth, daysInMonth).getDay();
            if (lastDay < 6) {
                for (let i = lastDay + 1; i <= 6; i++) {
                    const nextDate = new Date(targetYear, targetMonth, daysInMonth + (i - lastDay));
                    const py = nextDate.getFullYear();
                    const pm = String(nextDate.getMonth() + 1).padStart(2, '0');
                    const pd = String(nextDate.getDate()).padStart(2, '0');
                    const dStr = `${py}-${pm}-${pd}`;
                    weekDays.push({ empty: true, date: dStr, label: nextDate.getDate(), goals: goalsPerDay[dStr] || 0, goals45: goals45PerDay[dStr] || 0, zero2HT: zero2HTGamesPerDay[dStr] || 0 });
                }
            }
            
            if (weekDays.length > 0) {
                html += processWeek();
            }
            html += '</tbody></table></div>';
        }
        
        html += '</div>';


        const renderMasterTimeline = (allMatches, tableMatches, displayDateTL, isSportsOnlyView) => {
            const validDates = [];
            if (displayDateTL && displayDateTL.includes('-')) {
                let [yStr, mStr, dStr] = displayDateTL.split('-');
                let currentDt = new Date(parseInt(yStr, 10), parseInt(mStr, 10) - 1, parseInt(dStr, 10));
                let stopDt = new Date(2026, 5, 10); // June 10, 2026
                
                while (currentDt >= stopDt) {
                    let curStr = currentDt.getFullYear() + '-' + String(currentDt.getMonth() + 1).padStart(2, '0') + '-' + String(currentDt.getDate()).padStart(2, '0');
                    validDates.push(curStr);
                    currentDt.setDate(currentDt.getDate() - 1);
                }
            } else {
                validDates.push(displayDateTL);
            }

            // Only plot dates that have matches
            const datesWithMatches = validDates.filter(targetDate => {
                const dateMatches = allMatches.filter(m => m.date === targetDate && (!isSportsOnlyView || m.isFifa2026));
                return dateMatches.length > 0;
            });
            
            if (datesWithMatches.length === 0) return '';

            // Compute dynamic range (earliest start time, latest end time) across all visible matches
            let globalMinMins = 24 * 60; // 1440
            let globalMaxMins = 0;
            
            datesWithMatches.forEach(targetDate => {
                const dateMatches = allMatches.filter(m => m.date === targetDate && (!isSportsOnlyView || m.isFifa2026));
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
            const rowHeight = 40;
            const leftMargin = 70;
            const svgWidth = 1000;
            const timeWidth = svgWidth - leftMargin - 20; // 910
            
            const svgHeight = headerHeight + datesWithMatches.length * rowHeight + 20;
            let svg = `<div style="overflow-x:auto; background:#fff; border:1px solid #e2e8f0; border-radius:8px; padding:15px; margin-bottom:20px; box-shadow:0 4px 6px rgba(0,0,0,0.05);"><svg viewBox="0 0 ${svgWidth} ${svgHeight}" width="${svgWidth}" height="${svgHeight}" style="display:block;">`;

            // Draw X-axis
            for (let h = startHour; h <= endHour; h++) {
                const x = leftMargin + ((h - startHour) / (endHour - startHour)) * timeWidth;
                svg += `<line x1="${x}" y1="${headerHeight}" x2="${x}" y2="${svgHeight - 20}" stroke="#e2e8f0" stroke-width="1.5"/>`;
                svg += `<text x="${x}" y="${headerHeight - 10}" text-anchor="middle" font-size="10" fill="#64748b" font-weight="bold">${String(h).padStart(2, '0')}:00</text>`;
            }

            datesWithMatches.forEach((targetDate, dIdx) => {
                const yTop = headerHeight + dIdx * rowHeight;
                const yCenter = yTop + rowHeight / 2;
                
                if (dIdx % 2 === 0) {
                    svg += `<rect x="0" y="${yTop}" width="${svgWidth}" height="${rowHeight}" fill="#f8fafc"/>`;
                }

                const [, mStr, dStr] = targetDate.split('-');
                svg += `<text x="10" y="${yCenter + 4}" font-size="11" font-weight="bold" fill="#334155">${mStr}/${dStr}</text>`;
                svg += `<line x1="${leftMargin}" y1="${yCenter}" x2="${svgWidth - 20}" y2="${yCenter}" stroke="#cbd5e1" stroke-width="1"/>`;

                const dateMatches = allMatches.filter(m => m.date === targetDate);
                const activeGamesPer30 = {};
                const goalsPer30Min = {};
                const goals45Per30Min = {};

                const seenMatches = new Set();

                dateMatches.forEach(m => {
                    if (seenMatches.has(m.matchId)) return;
                    
                    const isWorldCup = m.isFifa2026 === true;
                    if (isSportsOnlyView && !isWorldCup) return;
                    seenMatches.add(m.matchId);

                    const timeStr = m.start_time || m.time;
                    if (!timeStr || !timeStr.includes(':')) return;
                    const [hStr, mS] = timeStr.split(':');
                    const h = parseInt(hStr, 10);
                    const min = parseInt(mS, 10);
                    if (isNaN(h) || isNaN(min)) return;

                    const startMins = h * 60 + min;
                    const gameEnd = startMins + 120;

                    const binStart = Math.max(startMins, startMins); // ensure start bound
                    for (let t = Math.floor(startMins / 30) * 30; t < gameEnd; t += 30) {
                        if (t >= startMins - 30 && t < gameEnd) {
                            activeGamesPer30[t] = (activeGamesPer30[t] || 0) + 1;
                        }
                    }

                    if (m.goals && m.goals[7] && m.goals[7].includes("'")) {
                        const binTime = Math.floor(gameEnd / 30) * 30;
                        const count = m.goals[7].split('<br>').filter(g => g.trim() !== '').length;
                        goalsPer30Min[binTime] = (goalsPer30Min[binTime] || 0) + (count > 0 ? count : 1);
                    }
                    if (m.goals && m.goals[3] && m.goals[3].includes("'")) {
                        const binTime = Math.floor((startMins + 45) / 30) * 30;
                        const count = m.goals[3].split('<br>').filter(g => g.trim() !== '').length;
                        goals45Per30Min[binTime] = (goals45Per30Min[binTime] || 0) + (count > 0 ? count : 1);
                    }
                });

                Object.keys(activeGamesPer30).forEach(tStr => {
                    const t = parseInt(tStr, 10);
                    if (activeGamesPer30[t] > 0) {
                        const startX = leftMargin + ((t - startMins) / totalMins) * timeWidth;
                        const barW = (30 / totalMins) * timeWidth;
                        const barH = 16;
                        svg += `<rect x="${startX}" y="${yCenter - barH/2}" width="${barW}" height="${barH}" fill="rgba(59,130,246,0.3)" rx="2"/>`;
                    }
                });

                Object.keys(goals45Per30Min).forEach(tStr => {
                    const t = parseInt(tStr, 10);
                    if (goals45Per30Min[t] > 0) {
                        const cx = leftMargin + (((t + 15) - startMins) / totalMins) * timeWidth;
                        svg += `<circle cx="${cx}" cy="${yCenter - 6}" r="5" fill="#22c55e"/>`;
                    }
                });

                Object.keys(goalsPer30Min).forEach(tStr => {
                    const t = parseInt(tStr, 10);
                    if (goalsPer30Min[t] > 0) {
                        const cx = leftMargin + (((t + 15) - startMins) / totalMins) * timeWidth;
                        svg += `<circle cx="${cx}" cy="${yCenter + 6}" r="5" fill="#ef4444"/>`;
                    }
                });
            });

            svg += '</svg></div>';
            return svg;
        };

        // --- ADDED TIMELINE SECTION ---
        const renderTimelineForDate = (targetDate) => { return ""; };

        const isSportsOnlyViewMaster = window.location.hash === '#sports' || window.location.hash.startsWith('#sports?') || window.location.hash.startsWith('#sports/FIFA-2026') || window.location.hash.startsWith('#sports/2026-FIFA');
        html += renderMasterTimeline(allMatches, tableMatches, displayDateTL, isSportsOnlyViewMaster);

        if (displayDateTL && displayDateTL.includes('-')) {
            let [yStr, mStr, dStr] = displayDateTL.split('-');
            let currentDt = new Date(parseInt(yStr, 10), parseInt(mStr, 10) - 1, parseInt(dStr, 10));
            let stopDt = new Date(2026, 5, 10); // June 10, 2026
            
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
