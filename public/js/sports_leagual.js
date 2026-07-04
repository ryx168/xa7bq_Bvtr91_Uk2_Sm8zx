/**
 * sports_fifa2026.js
 * Mixin for the Last Game Every Day dashboard view.
 */

window.scrollToMatch = function (matchId) {
    const el = document.getElementById('live-match-row-' + matchId);
    if (el) {
        const leftCol = document.getElementById('game-list-left-column');
        if (leftCol && leftCol.contains(el)) {
            el.style.scrollMarginTop = '20px';
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
            el.style.scrollMarginTop = '0px';
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        el.style.backgroundColor = '#fef08a';
        setTimeout(() => el.style.backgroundColor = '', 2000);
    }
};

export const SportsLeagueMixin = {
    fetchAndRenderLeagueCalendar: async function (leagueId, season) {
        console.log('fetchAndRenderLeagueCalendar called for:', leagueId, season);
        const fetchWithTimeout = (url, ms = 3000) => {
            return Promise.race([
                fetch(url),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Fetch timeout after ' + ms + 'ms for ' + url)), ms))
            ]);
        };
        try {
            const isGameAnalystViewCheck = (window.location.hash.startsWith('#sports/league/') || window.location.hash.startsWith('#all_live_soccer/')) && window.location.hash.includes('_id_');
            if (!isGameAnalystViewCheck) {
                try {
                    const templateUrl = `/data/leagues/${leagueId}_${season}_template.html?v=` + Date.now();
                    const templateRes = await fetchWithTimeout(templateUrl, 2000);
                    if (templateRes.ok) {
                        const templateHtml = await templateRes.text();
                        const container = document.getElementById('last-game-calendar-container');
                        if (container && templateHtml && templateHtml.trim().length > 0) {
                            container.innerHTML = templateHtml;
                            console.log(`Loaded League ${leagueId} ${season} calendar from pre-calculated template.`);
                            return; // Skip client-side calculation
                        }
                    }
                } catch (e) {
                    console.log('No pre-calculated template found or error loading it, falling back to client-side calculation.');
                }
            }

            let url = `/sports/leagues/${leagueId}/${season}.json`;
            if (leagueId === 'FIFA') {
                url = `/sports/leagues/FIFA_${season}.json`;
            }
            const leagueData = await fetchWithTimeout(url + "?v=" + Date.now(), 5000).then(r => r.json()).catch(() => []);

            const nowLive = new Date();
            let livePromises = [];

            // No live data fetching for historical leagues
            const liveDaysData = await Promise.all(livePromises);
            let allLive = [];
            liveDaysData.forEach(dayData => {
                if (Array.isArray(dayData)) allLive.push(...dayData);
            });


            const isSportsOnlyViewMasterStrict = window.location.hash.startsWith('#sports/league/') || window.location.hash.startsWith('#sports/FIFA-');
            leagueData.forEach(m => m.isTargetLeague = true);
            let leagueMatchMap = new Map();
            leagueData.forEach(m => {
                if (m.matchId) leagueMatchMap.set(String(m.matchId), m);
            });

            allLive.forEach(liveM => {
                if (liveM.matchId && leagueMatchMap.has(String(liveM.matchId))) {
                    let baseM = leagueMatchMap.get(String(liveM.matchId));
                    baseM.score = liveM.score || baseM.score;
                    baseM.status = liveM.status || baseM.status;
                    baseM.actualLiveScore = liveM.actualLiveScore || baseM.actualLiveScore;
                    if (liveM.goals && liveM.goals.some(g => g)) baseM.goals = liveM.goals;
                }
            });
            let allLeague = [...leagueData];

            const todayStr = nowLive.getFullYear() + '-' + String(nowLive.getMonth() + 1).padStart(2, '0') + '-' + String(nowLive.getDate()).padStart(2, '0');
            allLeague = allLeague.filter(m => {
                let dStr = m.date || 'Unknown';
                // No early date filter for leagues // Exclude anything before 2026-05-31

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

            let lastGamesByDay = {};
            const isSportsOnlyView = window.location.hash.startsWith('#sports/league/') || window.location.hash.startsWith('#sports/FIFA-');
            allLeague.forEach(m => {
                if (isSportsOnlyView && !m.isTargetLeague) return;
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
                lastGamesByDay[dStr].forEach(m => calMatches.push(m));
            }
            if (typeof this.renderLeagueCalendar === 'function') {
                await this.renderLeagueCalendar(allLeague, calMatches, leagueId, season);
            }
            return allLeague;
        } catch (e) {
            console.error(`Failed to load last game calendar for ${leagueId} ${season}`, e);
            alert(`Error loading calendar: ${e.message}`);
            return [];
        }
    },

    renderLeagueCalendar: async function (allMatches, tableMatches = null, leagueId = null, season = null) {
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

            if (!m.isTargetLeague) return;
            if (seenGoalsMatchIds.has(m.matchId)) return;
            seenGoalsMatchIds.add(m.matchId);

            const dStr = m.date || 'Unknown';
            if (!goalsPerDay[dStr]) goalsPerDay[dStr] = 0;
            if (!goals45PerDay[dStr]) goals45PerDay[dStr] = 0;
            if (!zeroGamesPerDay[dStr]) zeroGamesPerDay[dStr] = 0;
            if (!fivePlusGamesPerDay[dStr]) fivePlusGamesPerDay[dStr] = 0;

            let goals1HT = 0, goals2HT = 0;

            if (m.goals && Array.isArray(m.goals)) {
                m.goals.forEach(val => {
                    if (!val || typeof val !== 'string' || !val.includes("'")) return;
                    const entries = val.split('<br>').filter(g => g.trim() !== '');
                    entries.forEach(entry => {
                        const minMatch = entry.match(/(\d+)(?:\+(\d+))?'/);
                        if (!minMatch) return;
                        const min = parseInt(minMatch[1], 10);
                        const added = minMatch[2] ? parseInt(minMatch[2], 10) : 0;
                        const effective = min + added;

                        if (min <= 45) goals1HT++;
                        else goals2HT++;

                        if (min <= 90) {
                            if (min < 45 && effective >= 43) {
                                goals45PerDay[dStr]++;
                            } else if (min === 45) {
                                goals45PerDay[dStr]++;
                            } else if (min < 90 && effective >= 88) {
                                goalsPerDay[dStr]++;
                            } else if (min === 90) {
                                goalsPerDay[dStr]++;
                            }
                        }
                    });
                });
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
                        let calculated2HT = Math.max(0, total - goals1HT);
                        if (calculated2HT === 0) {
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


        calendarHtml += '<div id="fifa-calendar-content" style="background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 4px; box-shadow: 0 4px 10px rgba(0,0,0,0.15); margin-bottom: 15px; display: flex; flex-direction: row; gap: 10px; max-height: 30vh; overflow: auto;">';


        const sDates = [...new Set(calendarMatches.map(m => m.date).filter(Boolean))].sort();
        let totalMonths = 2;
        if (sDates.length > 0) {
            const firstDate = new Date(sDates[0]);
            const lastDate = new Date(sDates[sDates.length - 1]);
            totalMonths = (lastDate.getFullYear() - firstDate.getFullYear()) * 12 + (lastDate.getMonth() - firstDate.getMonth()) + 1;
            if (totalMonths < 1) totalMonths = 1;
            if (totalMonths > 12) totalMonths = 12; // Cap to 1 year max to prevent freezing
        }

        let startMonthIdx = month;
        let startYearIdx = yearNum;
        if (sDates.length > 0) {
            const fd = new Date(sDates[0]);
            startMonthIdx = fd.getMonth();
            startYearIdx = fd.getFullYear();
        }

        for (let mOffset = 0; mOffset < totalMonths; mOffset++) {
            let targetMonth = startMonthIdx + mOffset;
            let targetYear = startYearIdx;
            while (targetMonth > 11) {
                targetMonth -= 12;
                targetYear++;
            }
            // Replaced by dynamic startMonthIdx above

            const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
            const firstDay = new Date(targetYear, targetMonth, 1).getDay();
            calendarHtml += '<div style="flex: 0 0 calc((100% - 20px) / 3);">';
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
                        const nowLocal = new Date();
                        const todayStrLocal = nowLocal.getFullYear() + '-' + String(nowLocal.getMonth() + 1).padStart(2, '0') + '-' + String(nowLocal.getDate()).padStart(2, '0');
                        const isToday = d.date === todayStrLocal;

                        const isSelectedDate = d.dayNum === todayDateNum && mOffset === 0;
                        const numStyle = isSelectedDate ? 'background: #007bff; color: white; font-weight: bold; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,123,255,0.3);' : 'color: #334155; font-weight: 500; border-radius: 50%; transition: background 0.2s;';

                        const bgStyle = isToday ? 'background: #e0f2fe;' : (isSelectedDate ? 'background: #f8fafc;' : 'background: transparent;');

                        const dayMatches = allMatches.filter(m => m.date === d.date);
                        let tooltipText = '';
                        if (dayMatches.length > 0) {
                            const matchLines = dayMatches.map(m => {
                                let goalTimes = [];
                                let extractedScore = null;
                                let goals1HT = 0, goals2HT = 0;
                                if (m.goals) {
                                    const gVals = Array.isArray(m.goals) ? m.goals : Object.values(m.goals);
                                    gVals.forEach(val => {
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
                                                if (min <= 90) {
                                                    if (min <= 45) goals1HT++;
                                                    else goals2HT++;
                                                }
                                            }
                                        });
                                    });
                                }
                                let goalsStr = '';
                                if (goalTimes.length > 0) {
                                    goalTimes.sort((a, b) => parseInt(a.split('+')[0]) - parseInt(b.split('+')[0]));
                                    const totalG = goals1HT + goals2HT;
                                    goalsStr = ` (${goals1HT} ${goals2HT} ${totalG}) [ ${goalTimes.join(', ')} ]`;
                                }
                                const actualScore = (m.score && m.score !== 'VS' && m.score !== '') ? m.score : (extractedScore || 'vs');
                                return `${m.time || ''} | ${m.homeTeam} ${actualScore} ${m.awayTeam}${goalsStr}`;
                            });
                            tooltipText = `title="${matchLines.join('&#10;').replace(/"/g, '&quot;')}"`;
                        }

                        daysHtml += `<div style="flex: 1; height: 35px; border-right: 1px solid #e2e8f0; display: flex; justify-content: center; padding-top: 2px; cursor: pointer; transition: background 0.2s; ${bgStyle}" ${tooltipText}
                             onclick="if(window.App && App.scrollToCurrentSports) { App.targetScrollDate='${d.date}'; App.scrollToCurrentSports(); }"
                             onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='${isToday ? '#e0f2fe' : 'transparent'}'">
                             <div style="width: 18px; height: 18px; font-size: 9px; display: flex; align-items: center; justify-content: center; ${numStyle}">${d.dayNum}</div>
                        </div>`;
                    }
                });
                daysHtml += '</div>';

                // 2. Build SVG overlay
                let svgHtml = `<svg viewBox="0 0 700 35" width="100%" height="35" style="display: block; position: absolute; top: 0; left: 0; z-index: 10; pointer-events: none;" preserveAspectRatio="none">`;
                const maxGoals = Math.max(...weekDays.map(d => Math.max(d.goals || 0, d.goals45 || 0, d.zero2HT || 0)), 1);

                const buildBars = (chartType) => {
                    let outHtml = '';
                    const sortedDates = [...new Set(calendarMatches.map(m => m.date).filter(Boolean))].sort();
                    let activeStart = sortedDates[0] || '1900-01-01';
                    let activeEnd = sortedDates[sortedDates.length - 1] || '2100-01-01';

                    weekDays.forEach((d, idx) => {
                        if (d.date >= activeStart && d.date <= activeEnd) {
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


                    const sortedDates = [...new Set(calendarMatches.map(m => m.date).filter(Boolean))].sort();
                    let activeStart = sortedDates[0] || '1900-01-01';
                    let activeEnd = sortedDates[sortedDates.length - 1] || '2100-01-01';
                    if (d.date >= activeStart && d.date <= activeEnd) {
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

                        if (d.zeroGames > 0) {
                            svgHtml += `<circle cx="${x - 18}" cy="12" r="6" fill="#64748b" />`;
                            svgHtml += `<text x="${x - 18}" y="14.5" text-anchor="middle" font-size="7" fill="#fff" font-family="sans-serif" font-weight="bold">0</text>`;
                        }
                        if (d.fiveGames > 0) {
                            svgHtml += `<circle cx="${x + 18}" cy="12" r="6" fill="#8b5cf6" />`;
                            svgHtml += `<text x="${x + 18}" y="14.5" text-anchor="middle" font-size="7" fill="#fff" font-family="sans-serif" font-weight="bold">5+</text>`;
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


        const renderMasterTimeline = async (allMatches, tableMatches, displayDateTL, isSportsOnlyView, isPairedGame = false, hideCalendarBtn = false) => {
            const nowLocal = new Date();
            const nowMins = nowLocal.getHours() * 60 + nowLocal.getMinutes();
            const todayStr2 = nowLocal.getFullYear() + '-' + String(nowLocal.getMonth() + 1).padStart(2, '0') + '-' + String(nowLocal.getDate()).padStart(2, '0');

            const validDates = [];

            // ADD future dates first (up to end of season)
            const sDatesForFuture = [...new Set(allMatches.map(m => m.date).filter(Boolean))].sort();
            let endDt = new Date();
            endDt.setDate(endDt.getDate() + 3);
            if (sDatesForFuture.length > 0) {
                const lastDateStr = sDatesForFuture[sDatesForFuture.length - 1];
                if (lastDateStr.includes('-')) {
                    const [yStr, mStr, dStr] = lastDateStr.split('-');
                    const seasonEnd = new Date(parseInt(yStr, 10), parseInt(mStr, 10) - 1, parseInt(dStr, 10));
                    if (seasonEnd > endDt) endDt = seasonEnd;
                }
            }

            const futureDate = new Date();
            while (futureDate <= endDt) {
                const fStr = futureDate.getFullYear() + '-' + String(futureDate.getMonth() + 1).padStart(2, '0') + '-' + String(futureDate.getDate()).padStart(2, '0');
                if (!validDates.includes(fStr)) validDates.unshift(fStr); // prepend so future is at top
                futureDate.setDate(futureDate.getDate() + 1);
            }

            if (displayDateTL && displayDateTL.includes('-')) {
                let [yStr, mStr, dStr] = displayDateTL.split('-');
                let currentDt = new Date(parseInt(yStr, 10), parseInt(mStr, 10) - 1, parseInt(dStr, 10));

                const sDates = [...new Set(allMatches.map(m => m.date).filter(Boolean))].sort();
                let stopDt = new Date();
                if (sDates.length > 0) {
                    const firstDateParts = sDates[0].split('-');
                    stopDt = new Date(parseInt(firstDateParts[0], 10), parseInt(firstDateParts[1], 10) - 1, parseInt(firstDateParts[2], 10));
                } else {
                    stopDt = new Date(2000, 0, 1);
                }

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
                const dateMatches = allMatches.filter(m => m.date === targetDate && (!isSportsOnlyView || m.isTargetLeague));
                return dateMatches.length > 0;
            });

            if (datesWithMatches.length === 0) return '';

            // Compute dynamic range (earliest start time, latest end time) across all visible matches
            let globalMinMins = 24 * 60; // 1440
            let globalMaxMins = 0;

            datesWithMatches.forEach(targetDate => {
                const dateMatches = allMatches.filter(m => m.date === targetDate && (!isSportsOnlyView || m.isTargetLeague));
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
            const baseRowHeight = isPairedGame ? 72 : 36;
            const leftMargin = 70;
            const svgWidth = 1000;
            const timeWidth = svgWidth - leftMargin - 20; // 910

            // Pre-calculate maxRows for each date and cumulative yTop
            const dateLayouts = {};
            let currentYTop = headerHeight;

            datesWithMatches.forEach(targetDate => {
                const dateMatches = allMatches.filter(m => m.date === targetDate);
                const sortedDateMatches = [...dateMatches].sort((a, b) => {
                    const tA = (a.start_time || a.time || '00:00');
                    const tB = (b.start_time || b.time || '00:00');
                    return tA.localeCompare(tB);
                });

                const layoutRows = [];
                const seenMatchesPre = new Set();
                sortedDateMatches.forEach(m => {
                    if (seenMatchesPre.has(m.matchId)) return;
                    if (isSportsOnlyView && !m.isTargetLeague) return;
                    seenMatchesPre.add(m.matchId);

                    const timeStr = m.start_time || m.time;
                    if (!timeStr || !timeStr.includes(':')) return;
                    const [hStr, mS] = timeStr.split(':');
                    const h = parseInt(hStr, 10);
                    const min = parseInt(mS, 10);
                    if (!isNaN(h) && !isNaN(min)) {
                        const mStartMins = h * 60 + min;
                        const mEndMins = mStartMins + 125;

                        let placed = false;
                        for (let r = 0; r < layoutRows.length; r++) {
                            if (mStartMins >= layoutRows[r]) {
                                layoutRows[r] = mEndMins;
                                placed = true;
                                break;
                            }
                        }
                        if (!placed) {
                            layoutRows.push(mEndMins);
                        }
                    }
                });

                const maxRowsForDate = Math.max(1, layoutRows.length);
                const currentRowHeight = baseRowHeight * maxRowsForDate;

                dateLayouts[targetDate] = {
                    maxRowsForDate: maxRowsForDate,
                    rowHeight: currentRowHeight,
                    yTop: currentYTop
                };

                currentYTop += currentRowHeight;
            });

            const svgHeight = currentYTop;
            const containerMaxHeight = isPairedGame ? '400px' : '185px';
            let svg = `<div style="background:#fff; border:1px solid #e2e8f0; border-radius:8px; padding:2px 15px 5px 15px; margin-bottom:5px; box-shadow:0 4px 6px rgba(0,0,0,0.05); position: relative;">`;
            if (!hideCalendarBtn) {
                svg += `<button onclick="const c = document.getElementById('fifa-calendar-content'); if(c.style.display==='none'){ c.style.display='flex'; this.innerHTML='<i class=\\'fas fa-chevron-up\\'></i> Hide Calendar'; } else { c.style.display='none'; this.innerHTML='<i class=\\'fas fa-chevron-down\\'></i> Show Calendar'; }" style="position: absolute; right: 20px; top: 6px; z-index: 100; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 4px; padding: 3px 10px; font-size: 10px; color: #475569; font-weight: 600; cursor: pointer; transition: all 0.2s;"><i class="fas fa-chevron-up"></i> Hide Calendar</button>`;
            }

            svg += `<div id="master-timeline-scroll-container" style="overflow-y:auto; overflow-x:auto; max-height: ${containerMaxHeight}; border: 1px solid #f1f5f9; border-radius: 6px; margin-bottom: 0px; position: relative;">`;

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
                svg += `<line x1="${x}" y1="${headerHeight}" x2="${x}" y2="${svgHeight}" stroke="#e2e8f0" stroke-width="1.5"/>`;
            }

            // Draw NOW grid line (no text)
            if (datesWithMatches.includes(todayStr2) && nowMins >= startMins && nowMins <= endMins) {
                const nowX = leftMargin + ((nowMins - startMins) / totalMins) * timeWidth;
                svg += `<line x1="${nowX}" y1="${headerHeight}" x2="${nowX}" y2="${svgHeight}" stroke="#f59e0b" stroke-width="2" stroke-dasharray="4,3"/>`;
            }

            datesWithMatches.forEach((targetDate, dIdx) => {
                const layoutInfo = dateLayouts[targetDate];
                const yTop = layoutInfo.yTop;
                const currentRowHeight = layoutInfo.rowHeight;
                const yCenter = yTop + currentRowHeight / 2;

                const isToday = targetDate === todayStr2;
                const isFuture = targetDate > todayStr2;

                if (dIdx % 2 === 0 && !isToday) {
                    svg += `<rect x="0" y="${yTop}" width="${svgWidth}" height="${currentRowHeight}" fill="#f8fafc"/>`;
                }

                // Highlight today's row
                if (isToday) {
                    svg += `<rect x="0" y="${yTop}" width="${svgWidth}" height="${currentRowHeight}" fill="rgba(245,158,11,0.08)"/>`;
                    svg += `<rect x="0" y="${yTop}" width="4" height="${currentRowHeight}" fill="#f59e0b"/>`;
                }

                const dateMatchesForGroup = allMatches.filter(m => m.date === targetDate && (!isSportsOnlyView || m.isTargetLeague));
                const uniqueGroups = [...new Set(dateMatchesForGroup.map(m => m.group).filter(Boolean))];
                let groupStr = uniqueGroups.join(', ');
                if (groupStr.length > 12) groupStr = groupStr.substring(0, 10) + '..';

                const [, mStr, dStr] = targetDate.split('-');
                let yOffset = groupStr ? -6 : -2;

                svg += `<text id="timeline-row-${targetDate}" x="10" y="${yCenter + yOffset}" font-size="11" font-weight="bold" fill="#334155">${mStr}/${dStr}</text>`;
                if (groupStr) {
                    svg += `<text x="10" y="${yCenter + yOffset + 11}" font-size="8" fill="#94a3b8" font-weight="bold">${groupStr}</text>`;
                }

                // Show next game time in the date label
                if (isFuture || isToday) {
                    const nextMatch = dateMatchesForGroup
                        .sort((a, b) => (a.time || '').localeCompare(b.time || ''))[0];
                    if (nextMatch && nextMatch.time) {
                        svg += `<text x="10" y="${yCenter + yOffset + 21}" font-size="9" fill="#64748b">Next: ${nextMatch.time}</text>`;
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
                    if (isSportsOnlyView && !m.isTargetLeague) return;
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

                    const isWorldCup = m.isTargetLeague === true;
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

                    let barH = 22; // Fixed height for all boxes now
                    const totalBlockH = barH + (countAtTime - 1) * 24;
                    let rectY = yCenter - totalBlockH / 2 + offsetIdx * 24;
                    let barColor, strokeAttr, rxVal = 4;

                    if (hasScore) {
                        barColor = 'rgba(59,130,246,0.05)';
                        strokeAttr = `stroke="#cbd5e1" stroke-width="1"`;
                    } else {
                        barColor = isFuture ? 'rgba(245,158,11,0.05)' : 'rgba(59,130,246,0.02)';
                        strokeAttr = `stroke="${isFuture ? '#fcd34d' : '#cbd5e1'}" stroke-width="1" stroke-dasharray="3,3"`;
                    }

                    matchRectsHtml += `<rect x="${startX}" y="${rectY}" width="${barW}" height="${barH}" fill="${barColor}" ${strokeAttr} rx="${rxVal}" style="cursor:pointer;" onclick="if(window.scrollToMatch) window.scrollToMatch('${m.matchId}');">
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

                                if (mMin <= 90) {
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

                    // Only render boxes if there's a score or it's today
                    if (hasScore || isToday) {
                        const box1bg = has45plus ? '#22c55e' : 'transparent';
                        const box1color = has45plus ? '#fff' : '#334155';
                        const box1border = has45plus ? '#22c55e' : '#cbd5e1';

                        const box2bg = has90plus ? '#ef4444' : 'transparent';
                        const box2color = has90plus ? '#fff' : '#334155';
                        const box2border = has90plus ? '#ef4444' : '#cbd5e1';

                        let box3bg = 'transparent', box3color = '#334155', box3border = '#cbd5e1';
                        if (hasScore && total === 0) { box3bg = '#64748b'; box3color = '#fff'; box3border = '#64748b'; }
                        if (hasScore && total >= 5) { box3bg = '#8b5cf6'; box3color = '#fff'; box3border = '#8b5cf6'; }

                        const boxStyle = (bg, color, border) =>
                            `width:20px;height:16px;background:${bg};color:${color};
                             border:1px solid ${border};border-radius:3px;
                             display:flex;align-items:center;justify-content:center;
                             font-size:9px;font-weight:700;`;

                        const foHtml = `<div style="display:flex;align-items:center;gap:2px;height:100%;width:100%;justify-content:center;pointer-events:none;">
                            <div style="${boxStyle(box1bg, box1color, box1border)}" title="1H">${goals1HT}</div>
                            <div style="${boxStyle(box2bg, box2color, box2border)}" title="2H">${goals2HT}</div>
                            <div style="${boxStyle(box3bg, box3color, box3border)}" title="Total">${total}</div>
                        </div>`;

                        matchRectsHtml += `<foreignObject x="${startX}" y="${rectY}" width="${barW}" height="${barH}" style="pointer-events:none;">
                            ${foHtml}
                        </foreignObject>`;
                    } else {
                        const timeHtml = `<div style="display:flex;align-items:center;gap:2px;height:100%;width:100%;justify-content:center;pointer-events:none;color:${isFuture ? '#f59e0b' : '#3b82f6'};font-size:10px;font-weight:bold;">
                            ${m.start_time || m.time || 'TBD'}
                        </div>`;
                        matchRectsHtml += `<foreignObject x="${startX}" y="${rectY}" width="${barW}" height="${barH}" style="pointer-events:none;">
                            ${timeHtml}
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

                const box2bg = has90plus ? '#ef4444' : 'transparent';
                const box2color = has90plus ? '#fff' : '#334155';
                const box2border = has90plus ? '#ef4444' : '#cbd5e1';

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
        let isSportsOnlyViewMaster = window.location.hash.startsWith('#sports/league/') || window.location.hash.startsWith('#sports/FIFA-');

        let isGameAnalystView = false;
        let homeTeam = null;
        let awayTeam = null;
        let isPairedGame = false;

        if ((window.location.hash.startsWith('#sports/league/') || window.location.hash.startsWith('#all_live_soccer/')) && window.location.hash.includes('_id_')) {
            isGameAnalystView = true;
            isSportsOnlyViewMaster = true;
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
                    m.isTargetLeague && m.date === primaryMatch.date &&
                    primaryMatch.group && primaryMatch.group.toLowerCase().includes('group') && m.group === primaryMatch.group &&
                    m.matchId && m.matchId !== primaryMatchId && m.score !== undefined
                );
                if (pairedMatches.length > 0) {
                    isPairedGame = true;
                }
            }
        }

        if (isGameAnalystView && homeTeam && awayTeam) {
            try {
                const primaryMatchId = window.location.hash.split('_id_')[1];
                const datePart = window.location.hash.split('/')[1];
                if (datePart && datePart.match(/^\d{4}-\d{2}-\d{2}$/)) {
                    const analystRes = await fetch(`/data/analyst/${datePart}/${primaryMatchId}.json`);
                    if (analystRes.ok) {
                        const pData = await analystRes.json();
                        if (pData && pData.leftColumn && pData.rightColumn) {
                            const tbody = document.getElementById('sports-table-body');
                            if (tbody) tbody.innerHTML = pData.leftColumn;
                            
                            let html = '<div style="display: flex; gap: 20px;">';
                            html += '<div style="flex: 4; min-width: 0;"></div>';
                            html += `<div id="game-list-left-column" style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px; padding-right: 10px; max-height: 650px; overflow-y: auto;">`;
                            html += pData.rightColumn;
                            html += '</div></div>';
                            document.getElementById('last-game-calendar-container').innerHTML = html;
                            return; // Bypass dynamic rendering successfully
                        }
                    }
                }
            } catch (e) {
                console.log('Failed to load pre-calculated analyst data, falling back to dynamic rendering', e);
            }

            html += '<div style="display: flex; gap: 20px;">';
            html += '<div style="flex: 4; min-width: 0;">';
        }

        const hideBtn = (isGameAnalystView && homeTeam && awayTeam) ? true : false;

        let tlGroupsMap = {};
        allMatches.forEach(m => {
            let g = m.group || 'Unknown';
            if (!tlGroupsMap[g]) tlGroupsMap[g] = { name: g, dates: [] };
            if (m.date) tlGroupsMap[g].dates.push(m.date);
        });
        let tlGroups = Object.values(tlGroupsMap).filter(g => g.dates.length > 0);
        tlGroups.forEach(g => {
            g.dates.sort();
            g.minDate = g.dates[0];
            g.maxDate = g.dates[g.dates.length - 1];
            // Extract numeric round number for proper sorting (e.g. "Round 13" → 13)
            const rMatch = g.name.match(/(\d+)/);
            g.roundNum = rMatch ? parseInt(rMatch[1], 10) : 9999;
        });
        // Sort by round number if all groups are named rounds; otherwise fall back to minDate
        const allHaveRoundNum = tlGroups.every(g => g.roundNum !== 9999);
        tlGroups.sort((a, b) => allHaveRoundNum
            ? a.roundNum - b.roundNum
            : a.minDate.localeCompare(b.minDate));

        const dNow = new Date();
        const tStr = dNow.getFullYear() + '-' + String(dNow.getMonth() + 1).padStart(2, '0') + '-' + String(dNow.getDate()).padStart(2, '0');

        // Find current round: prefer a group whose date range contains today,
        // then the first upcoming group, then the last group.
        let tlCurrentIndex = tlGroups.findIndex(g => g.minDate <= tStr && g.maxDate >= tStr);
        if (tlCurrentIndex === -1) tlCurrentIndex = tlGroups.findIndex(g => g.minDate > tStr);
        if (tlCurrentIndex === -1) tlCurrentIndex = Math.max(0, tlGroups.length - 1);

        let tlKeepGroups = new Set();
        for (let i = Math.max(0, tlCurrentIndex - 3); i <= Math.min(tlGroups.length - 1, tlCurrentIndex + 1); i++) {
            tlKeepGroups.add(tlGroups[i].name);
        }
        let tlMatches = allMatches.filter(m => tlKeepGroups.has(m.group || 'Unknown'));
        let tlTableMatches = tableMatches ? tableMatches.filter(m => tlKeepGroups.has(m.group || 'Unknown')) : tableMatches;

        html += await renderMasterTimeline(tlMatches, tlTableMatches, displayDateTL, isSportsOnlyViewMaster, isPairedGame, hideBtn);
        html += calendarHtml;

        if (isGameAnalystView && homeTeam && awayTeam) {
            html += '</div>'; // End left column

            const containerMaxHeight = '650px';
            html += `<div id="game-list-left-column" style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px; padding-right: 10px; max-height: ${containerMaxHeight}; overflow-y: auto;">`;
            const fetchLeagueId = leagueId || (primaryMatch ? (primaryMatch.leagueName || primaryMatch.group) : null);
            html += `<div style="display: flex; justify-content: flex-end; gap: 6px;">
                        <button id="btn-fetch-schedule-top" onclick="if(window.App) window.App.fetchLeagueSchedule('${fetchLeagueId ? fetchLeagueId.replace(/'/g, "\\'") : ''}')" style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 4px; padding: 3px 10px; font-size: 10px; color: #3b82f6; font-weight: 600; cursor: pointer; transition: all 0.2s;"><i id="fetch-schedule-icon-top" class="fas fa-calendar-alt"></i> Fetch League</button>
                        <button onclick="const c = document.getElementById('fifa-calendar-content'); const rc = document.getElementById('game-list-left-column'); if(c.style.display==='none'){ c.style.display='flex'; if(rc) rc.style.maxHeight='650px'; this.innerHTML='<i class=\\'fas fa-chevron-up\\'></i> Hide Calendar'; } else { c.style.display='none'; if(rc) rc.style.maxHeight='${isPairedGame ? '430px' : '230px'}'; this.innerHTML='<i class=\\'fas fa-chevron-down\\'></i> Show Calendar'; }" style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 4px; padding: 3px 10px; font-size: 10px; color: #475569; font-weight: 600; cursor: pointer; transition: all 0.2s;"><i class="fas fa-chevron-up"></i> Hide Calendar</button>
                     </div>`;
            html += '<div id="analyst-timelines-container" style="display:flex;flex-direction:column;gap:4px;">';
            html += '<div style="font-size: 13px; font-weight: bold; color: #64748b; padding: 10px; text-align: center;">Loading Analyst Data...</div>';
            html += '</div>';
            html += '</div></div>'; // End right column and flex container

            // Collect all game matchIds on the same date to support paired games
            const primaryMatchId = window.location.hash.split('_id_')[1];
            let primaryMatch = allMatches.find(m => String(m.matchId) === String(primaryMatchId));

            // Fallback: if match not found in allMatches (e.g. FIN_D1 not yet loaded),
            // reconstruct a minimal match object from the URL hash
            if (!primaryMatch && primaryMatchId) {
                const hashParts = window.location.hash.split('/');
                // hash format: #all_live_soccer/DATE/LEAGUE/HOME-vs-AWAY_id_ID
                const dateFromHash = hashParts[1] || null; // e.g. 2026-06-27
                const leagueFromHash = hashParts[2] ? decodeURIComponent(hashParts[2]).replace(/ /g, '_') : null;
                const teamsPart = hashParts[hashParts.length - 1];
                const teamsStr = teamsPart.split('_id_')[0]; // e.g. AC-Oulu-vs-Lahti
                const vsSplit = teamsStr.split('-vs-');
                const hTeam = vsSplit[0] ? decodeURIComponent(vsSplit[0]).replace(/-/g, ' ') : '';
                const aTeam = vsSplit[1] ? decodeURIComponent(vsSplit[1]).replace(/-/g, ' ') : '';
                if (dateFromHash && dateFromHash.match(/^\d{4}-\d{2}-\d{2}$/)) {
                    primaryMatch = {
                        matchId: primaryMatchId,
                        date: dateFromHash,
                        homeTeam: hTeam,
                        awayTeam: aTeam,
                        group: leagueFromHash || 'Round',
                        leagueName: leagueFromHash,
                        score: null,
                        goals: null,
                        _fromHash: true // marker for debugging
                    };
                    console.log('[Analyst] primaryMatch reconstructed from URL hash:', primaryMatch);
                }
            }

            if (primaryMatch && primaryMatch.date) {
                // Find all FIFA matches on the same date (paired games)
                const pairedMatches = allMatches.filter(m =>
                    m.isTargetLeague &&
                    m.date === primaryMatch.date &&
                    primaryMatch.group && primaryMatch.group.toLowerCase().includes('group') && m.group === primaryMatch.group &&
                    m.matchId &&
                    m.matchId !== primaryMatchId &&
                    m.score !== undefined // has some data
                );

                // Build list: primary first, then paired
                const matchesToRender = [primaryMatch, ...pairedMatches];

                // Update container message to show we found the match
                setTimeout(() => {
                    const container = document.getElementById('analyst-timelines-container');
                    if (container && primaryMatch._fromHash) {
                        container.innerHTML = '<div style="font-size: 12px; color: #3b82f6; padding: 6px 10px; text-align: center;">Loading ref data for ' + primaryMatch.homeTeam + ' vs ' + primaryMatch.awayTeam + '...</div>';
                    }
                }, 10);

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
                            document.dispatchEvent(new window.Event('AnalystRenderComplete'));
                        }
                    };

                    matchesToRender.forEach((match, idx) => {
                        if (window.App && window.App.liveRefsAll) {
                            const liveMatch = window.App.liveRefsAll.find(m => String(m.matchId) === String(match.matchId));
                            if (liveMatch) {
                                if (liveMatch.score) match.score = liveMatch.score;
                                if (liveMatch.goals) match.goals = liveMatch.goals;
                                if (liveMatch.status) match.status = liveMatch.status;
                            }
                        }
                        const dateParts = match.date.split('-');
                        const refUrl = `/sports/refs/${dateParts[0]}/${dateParts[1]}/${dateParts[0]}_${dateParts[1]}_${dateParts[2]}/${match.matchId}.json`;

                        let goalsText = '';
                        let extractedScore = null;

                        if (match.goals) {
                            const goalTimes = [];
                            let goals1HT = 0, goals2HT = 0;
                            let has43plus = false, has89plus = false;
                            const gVals = Array.isArray(match.goals) ? match.goals : Object.values(match.goals);
                            gVals.forEach(val => {
                                if (!val || typeof val !== 'string' || !val.includes("'")) return;
                                const entries = val.split('<br>').filter(g => g.trim() !== '');
                                entries.forEach(entry => {
                                    const minMatch = entry.match(/(\d+)(?:\+(\d+))?'/);
                                    if (minMatch) {
                                        const minStrMatch = entry.match(/(\d+(?:\+\d+)?')/);
                                        if (minStrMatch) goalTimes.push(minStrMatch[1]);

                                        const scoreMatch = entry.match(/\((\d+-\d+)\)/);
                                        if (scoreMatch) {
                                            extractedScore = scoreMatch[1];
                                        }

                                        const min = parseInt(minMatch[1], 10);
                                        if (min <= 90) {
                                            if (min <= 45) {
                                                goals1HT++;
                                                if (min >= 43) has43plus = true;
                                            } else {
                                                goals2HT++;
                                                if (min >= 88) has89plus = true;
                                            }
                                        }
                                    }
                                });
                            });
                            if (goalTimes.length > 0) {
                                let totalG = goals1HT + goals2HT;
                                const actS = (match.score && match.score !== 'VS') ? match.score : extractedScore;
                                if (actS) {
                                    const p = actS.split('-');
                                    if (p.length === 2) {
                                        const s1 = parseInt(p[0], 10), s2 = parseInt(p[1], 10);
                                        if (!isNaN(s1) && !isNaN(s2)) {
                                            const actTotal = s1 + s2;
                                            if (totalG < actTotal) {
                                                if (match.score_ht && match.score_ht !== 'VS') {
                                                    const ph = match.score_ht.split('-');
                                                    if (ph.length === 2) {
                                                        const h1 = parseInt(ph[0], 10), h2 = parseInt(ph[1], 10);
                                                        if (!isNaN(h1) && !isNaN(h2)) goals1HT = h1 + h2;
                                                    }
                                                }
                                                goals2HT = Math.max(0, actTotal - goals1HT);
                                                totalG = actTotal;
                                            }
                                        }
                                    }
                                }

                                const box1bg = has43plus ? '#22c55e' : 'transparent';
                                const box1color = has43plus ? '#fff' : '#334155';
                                const box1border = has43plus ? '#22c55e' : '#cbd5e1';

                                const box2bg = has89plus ? '#ef4444' : 'transparent';
                                const box2color = has89plus ? '#fff' : '#334155';
                                const box2border = has89plus ? '#ef4444' : '#cbd5e1';

                                let box3bg = 'transparent', box3color = '#334155', box3border = '#cbd5e1';
                                if (totalG === 0) { box3bg = '#64748b'; box3color = '#fff'; box3border = '#64748b'; }
                                else if (totalG >= 5) { box3bg = '#8b5cf6'; box3color = '#fff'; box3border = '#8b5cf6'; }

                                const boxStyle = (bg, color, border) =>
                                    `width:24px;height:20px;background:${bg};color:${color};border:1px solid ${border};border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;`;

                                goalsText = `<div style="display:flex; gap:2px; margin-right:6px;">
                                    <div style="${boxStyle(box1bg, box1color, box1border)}" title="1st Half Goals">${goals1HT}</div>
                                    <div style="${boxStyle(box2bg, box2color, box2border)}" title="2nd Half Goals">${goals2HT}</div>
                                    <div style="${boxStyle(box3bg, box3color, box3border)}" title="Total Goals">${totalG}</div>
                                </div>`;
                            }
                        }

                        const actualScore = (match.score && match.score !== 'VS') ? match.score : extractedScore;
                        const displayScore = actualScore ? ` <span style="color:#f59e0b;">${actualScore}</span> ` : ' vs ';

                        const rowLabel = `<div style="display:flex; align-items:center; font-size:10px; color:#94a3b8; font-weight:600; margin-bottom:2px; padding-left:2px; white-space:nowrap;">
                            ${goalsText}
                            <span>${match.time || match.start_time || 'TBD'} | <span style="margin-left:4px;">${match.homeTeam || ''}${displayScore}${match.awayTeam || ''}</span></span>
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

                            // Resolve the correct round group from allMatches.
                            // When primaryMatch is reconstructed from URL hash, match.group is the league
                            // code (e.g. 'FIN_D1') not the round name (e.g. 'Round 13'). Look up by matchId
                            // first, then fall back to finding the group whose dates are closest to match.date.
                            let resolvedGroup = match.group;
                            const matchInLeague = allMatches.find(m => String(m.matchId) === String(match.matchId));
                            if (matchInLeague && matchInLeague.group) {
                                resolvedGroup = matchInLeague.group;
                            } else if (match.group && !allMatches.some(m => m.group === match.group)) {
                                // Group name from hash doesn't exist in league data — find nearest group by date
                                const matchDate = match.date || '';
                                const groupDateMap = {};
                                allMatches.forEach(m => {
                                    if (m.group && m.date) {
                                        if (!groupDateMap[m.group]) groupDateMap[m.group] = [];
                                        groupDateMap[m.group].push(m.date);
                                    }
                                });
                                let bestGroup = null, bestDiff = Infinity;
                                Object.entries(groupDateMap).forEach(([grp, dates]) => {
                                    dates.forEach(d => {
                                        const diff = Math.abs(d.localeCompare(matchDate));
                                        if (diff < bestDiff) { bestDiff = diff; bestGroup = grp; }
                                    });
                                });
                                if (bestGroup) resolvedGroup = bestGroup;
                            }
                            const roundM = allMatches.filter(m => m.group === resolvedGroup);
                            console.log('[renderRefData] resolvedGroup:', resolvedGroup, 'roundM count:', roundM.length);

                            const effectiveLeagueId = leagueId || match.leagueName || match.group || 'Unknown';
                            const roundYear = season || (match.date ? match.date.substring(0, 4) : '');
                            const roundTitle = roundYear
                                ? `${effectiveLeagueId} - ${resolvedGroup || 'Round'} · ${roundYear}`
                                : `${effectiveLeagueId} - ${resolvedGroup || 'Round'}`;
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
                            .then(r => { if (!r.ok) throw new Error(); return r.json(); })
                            .then(refMatches => {
                                rows[idx] = renderRefData(refMatches);
                                tryRender();
                            })
                            .catch(() => {
                                const fallbackDate = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
                                fallbackDate.setDate(fallbackDate.getDate() + 1);
                                const fy = fallbackDate.getFullYear();
                                const fm = String(fallbackDate.getMonth() + 1).padStart(2, '0');
                                const fd = String(fallbackDate.getDate()).padStart(2, '0');
                                const fallbackUrl = `/sports/refs/${fy}/${fm}/${fy}_${fm}_${fd}/${match.matchId}.json`;

                                fetch(fallbackUrl)
                                    .then(r => { if (!r.ok) throw new Error(); return r.json(); })
                                    .then(refMatches => {
                                        rows[idx] = renderRefData(refMatches);
                                        tryRender();
                                    })
                                    .catch(() => {
                                        const prevDate = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
                                        prevDate.setDate(prevDate.getDate() - 1);
                                        const py = prevDate.getFullYear();
                                        const pm = String(prevDate.getMonth() + 1).padStart(2, '0');
                                        const pd = String(prevDate.getDate()).padStart(2, '0');
                                        const prevUrl = `/sports/refs/${py}/${pm}/${py}_${pm}_${pd}/${match.matchId}.json`;

                                        fetch(prevUrl)
                                            .then(r => { if (!r.ok) throw new Error(); return r.json(); })
                                            .then(refMatches => {
                                                rows[idx] = renderRefData(refMatches);
                                                tryRender();
                                            })
                                            .catch(() => {
                                                if (window.App && window.App.fetchMatchHistory) {
                                                    setTimeout(() => {
                                                        window.App.fetchMatchGoals(match.matchId);
                                                        window.App.fetchMatchHistory(match.matchId, match.homeTeam.replace(/'/g, "\\'"), match.awayTeam.replace(/'/g, "\\'"), match.date);
                                                    }, 50);
                                                }
                                                rows[idx] = `<div style="font-size:11px;color:#3b82f6;padding:8px;border:1px solid #bfdbfe;background:#eff6ff;border-radius:6px;display:flex;align-items:center;">
                                                    <i class="fas fa-spinner fa-spin" style="margin-right:8px;"></i>
                                                    Auto-fetching analyst data for ${match.homeTeam} vs ${match.awayTeam}...
                                                </div>`;
                                                tryRender();
                                            });
                                    });
                            });
                    });
                }, 50);
            }
        }

        html += '</div>'; // Close sticky wrapper

        if (displayDateTL && displayDateTL.includes('-')) {
            let [yStr, mStr, dStr] = displayDateTL.split('-');
            let currentDt = new Date(parseInt(yStr, 10), parseInt(mStr, 10) - 1, parseInt(dStr, 10));

            const sDates = [...new Set(allMatches.map(m => m.date).filter(Boolean))].sort();
            let stopDt = new Date();
            if (sDates.length > 0) {
                const firstDateParts = sDates[0].split('-');
                stopDt = new Date(parseInt(firstDateParts[0], 10), parseInt(firstDateParts[1], 10) - 1, parseInt(firstDateParts[2], 10));
            } else {
                stopDt = new Date(2000, 0, 1);
            }

            while (currentDt >= stopDt) {
                let curStr = currentDt.getFullYear() + '-' + String(currentDt.getMonth() + 1).padStart(2, '0') + '-' + String(currentDt.getDate()).padStart(2, '0');
                html += renderTimelineForDate(curStr);
                currentDt.setDate(currentDt.getDate() - 1);
            }
        } else {
            html += renderTimelineForDate(displayDateTL);
        }

        calendarContainer.innerHTML = html;

        setTimeout(() => {
            const calendarEl = document.getElementById('fifa-calendar-content');
            if (calendarEl && typeof startMonthIdx !== 'undefined' && typeof startYearIdx !== 'undefined' && typeof month !== 'undefined' && typeof yearNum !== 'undefined') {
                const startM = startMonthIdx + startYearIdx * 12;
                const targetM = month + yearNum * 12;
                let diffM = targetM - startM;
                if (diffM >= 0) {
                    const monthWidth = calendarEl.clientWidth / 3;
                    const gap = 10;
                    const targetScroll = (diffM * (monthWidth + gap)) - (calendarEl.clientWidth / 2) + (monthWidth / 2);
                    calendarEl.scrollTo({ left: Math.max(0, targetScroll), behavior: 'smooth' });
                }
            }
        }, 150);

        setTimeout(() => {
            const tlContainer = document.getElementById('master-timeline-scroll-container');
            if (tlContainer) {
                const nowLocal = new Date();
                const todayStr = nowLocal.getFullYear() + '-' + String(nowLocal.getMonth() + 1).padStart(2, '0') + '-' + String(nowLocal.getDate()).padStart(2, '0');
                let todayText = document.getElementById('timeline-row-' + todayStr);

                // If today is not in timeline, find the closest upcoming match
                if (!todayText) {
                    const allRows = document.querySelectorAll('[id^="timeline-row-"]');
                    let minDiff = Infinity;
                    let closest = null;
                    const nowTime = nowLocal.getTime();
                    allRows.forEach(row => {
                        const idStr = row.id.replace('timeline-row-', '');
                        const [y, m, d] = idStr.split('-');
                        const rowTime = new Date(y, parseInt(m) - 1, d).getTime();
                        if (rowTime >= nowTime && (rowTime - nowTime) < minDiff) {
                            minDiff = rowTime - nowTime;
                            closest = row;
                        }
                    });
                    if (closest) todayText = closest;
                    else if (allRows.length > 0) todayText = allRows[allRows.length - 1]; // fallback to last match
                }

                if (todayText) {
                    const targetY = parseInt(todayText.getAttribute('y') || '0');
                    if (targetY > 0) {
                        const targetScroll = Math.max(0, targetY - (tlContainer.clientHeight / 2));
                        tlContainer.scrollTo({ top: targetScroll, behavior: 'smooth' });
                    }
                }
            }
        }, 300);
    }
};
