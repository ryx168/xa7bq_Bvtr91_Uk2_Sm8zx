/**
 * sports-render.js
 * Presentation mixin for rendering sports analysis reference tables.
 */

import { formatGoal } from './sports-utils.js';

export const SportsMixin = {
    formatGoal(gStr) {
        return formatGoal(gStr);
    },

    renderReferenceGroup(groupTitle, refsArray, groupId, parentMatchId, parentStatus, options = {}) {
        refsArray = refsArray || [];
        if (refsArray.length === 0 && !groupTitle.includes('Live Games')) return '';

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
            colOrder.push(offset + 4);
            colOrder.push(offset + 5);
            for (let i = offset; i < offset + 4; i++) colOrder.push(i);
            for (let i = 0; i <= maxGoalCols; i++) colOrder.push(i);
        } else {
            for (let i = 0; i < numCols; i++) colOrder.push(i);
        }

        let totalDetailGames = 0;
        let bucketCounts = Array(numCols + 10).fill(0);
        let maxBucketGoals = Array(numCols + 10).fill(0);
        let max1HT = 0;
        let max2HT = 0;
        let maxTotalGoals = 0;

        let countOver2_5_FT = 0;
        let countOver1_5_1HT = 0;
        let countOver1_5_2HT = 0;

        refsArray.forEach(ref => {
            if (ref.matchId && ref.matchId !== "") {
                const hasGoals = ref.goals && ref.goals.some(g => g !== '');
                const hasScore = ref.score && ref.score.includes('-');

                if (hasGoals || hasScore) {
                    let goals1HT = 0;
                    let goals2HT = 0;
                    if (ref.goals) {
                        for (let i = 0; i < 4; i++) {
                            if (ref.goals[i] && ref.goals[i] !== '') {
                                goals1HT += ref.goals[i].split('<br>').length;
                            }
                        }
                        for (let i = 4; i < 8; i++) {
                            if (ref.goals[i] && ref.goals[i] !== '') {
                                goals2HT += ref.goals[i].split('<br>').length;
                            }
                        }
                    }

                    let sTotal = 0;
                    if (ref.score && ref.score.includes('-')) {
                        const parts = ref.score.split('-');
                        sTotal = parseInt(parts[0]) + parseInt(parts[1]);
                    }

                    const isMissingGoalDetails = (sTotal > 0 && (goals1HT + goals2HT) === 0);

                    if (!isMissingGoalDetails) {
                        totalDetailGames++;
                        if (window.activeAnalysisTab === 'goalTime') {
                            if (ref.goals) {
                                for (let i = 0; i < 8; i++) {
                                    if (ref.goals[i] && ref.goals[i] !== '') bucketCounts[i]++;
                                }
                            }
                        } else {
                            if (goals1HT > max1HT) max1HT = goals1HT;
                            if (goals2HT > max2HT) max2HT = goals2HT;

                            let totalRefGoals = goals1HT + goals2HT;
                            if (sTotal > totalRefGoals) totalRefGoals = sTotal;

                            if (totalRefGoals > maxTotalGoals) maxTotalGoals = totalRefGoals;

                            if (totalRefGoals > 2) countOver2_5_FT++;
                            if (goals1HT > 1) countOver1_5_1HT++;
                            if (goals2HT > 1) countOver1_5_2HT++;

                            let effectiveTab = window.activeAnalysisTab;
                            if (effectiveTab === 'total' && parentStatus && (parentStatus.includes('1H') || parentStatus.includes('Half'))) {
                                effectiveTab = '1ht';
                            }

                            if (effectiveTab === 'total' || effectiveTab === '1ht' || effectiveTab === '2ht') {
                                let goalsToBucket = totalRefGoals;
                                if (effectiveTab === '1ht') goalsToBucket = goals1HT;
                                else if (effectiveTab === '2ht') goalsToBucket = goals2HT;

                                if (goalsToBucket >= maxGoalCols) bucketCounts[maxGoalCols]++;
                                else if (goalsToBucket >= 0) bucketCounts[goalsToBucket]++;

                                if (ref.goals) {
                                    const countGoals = (goalsStr, minTime, maxTime) => {
                                        if (!goalsStr) return 0;
                                        let count = 0;
                                        goalsStr.split('<br>').forEach(g => {
                                            let m = g.match(/(\d+)'/);
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

                                    let count1HT1 = countAllGoals(ref.goals[0]) + countGoals(ref.goals[1], 16, 22);
                                    let count1HT2 = countGoals(ref.goals[1], 23, 30) + countAllGoals(ref.goals[2]);
                                    let p45 = countAllGoals(ref.goals[3]);

                                    let count2HT1 = countAllGoals(ref.goals[4]) + countGoals(ref.goals[5], 61, 67);
                                    let count2HT2 = countGoals(ref.goals[5], 68, 75) + countAllGoals(ref.goals[6]);
                                    let p90 = countAllGoals(ref.goals[7]);

                                    if (count1HT1 > 0) bucketCounts[offset]++;
                                    if (count1HT2 > 0) bucketCounts[offset + 1]++;
                                    if (count2HT1 > 0) bucketCounts[offset + 2]++;
                                    if (count2HT2 > 0) bucketCounts[offset + 3]++;
                                    if (p45 > 0) bucketCounts[offset + 4]++;
                                    if (p90 > 0) bucketCounts[offset + 5]++;

                                    if (count1HT1 > maxBucketGoals[offset]) maxBucketGoals[offset] = count1HT1;
                                    if (count1HT2 > maxBucketGoals[offset + 1]) maxBucketGoals[offset + 1] = count1HT2;
                                    if (count2HT1 > maxBucketGoals[offset + 2]) maxBucketGoals[offset + 2] = count2HT1;
                                    if (count2HT2 > maxBucketGoals[offset + 3]) maxBucketGoals[offset + 3] = count2HT2;
                                    if (p45 > maxBucketGoals[offset + 4]) maxBucketGoals[offset + 4] = p45;
                                    if (p90 > maxBucketGoals[offset + 5]) maxBucketGoals[offset + 5] = p90;
                                }
                            } else if (window.activeAnalysisTab === 'draw') {
                                if (ref.score && ref.score.includes('-')) {
                                    const parts = ref.score.split('-');
                                    const h = parseInt(parts[0]);
                                    const a = parseInt(parts[1]);
                                    let valToBucket = -1;
                                    if (h > a) valToBucket = 0;
                                    else if (h === a) valToBucket = 1;
                                    else valToBucket = 2;
                                    if (valToBucket >= 0) {
                                        if (valToBucket >= numCols - 1) bucketCounts[numCols - 1]++;
                                        else bucketCounts[valToBucket]++;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        let initialDisplay = ['FT', 'ET', 'AET', 'Pen'].includes(parentStatus) ? 'none' : 'table-row';
        if (options.year === 'live') initialDisplay = 'table-row';
        if (options.forceDisplay) initialDisplay = 'table-row';
        if (options.isFifaDay) initialDisplay = 'none';

        let pctOver2_5_FT = totalDetailGames > 0 ? Math.round((countOver2_5_FT / totalDetailGames) * 100) + '%' : '-';
        let pctOver1_5_1HT = totalDetailGames > 0 ? Math.round((countOver1_5_1HT / totalDetailGames) * 100) + '%' : '-';
        let pctOver1_5_2HT = totalDetailGames > 0 ? Math.round((countOver1_5_2HT / totalDetailGames) * 100) + '%' : '-';

        let bgColor = options.darkerBg ? '#e2e8f0' : '#f1f5f9';
        let extraClass = options.isFifaDay ? `ref-detail-row-${options.parentGroupId}` : '';
        let toggleIconId = `ref-toggle-icon-${groupId}`;
        let toggleIconClass = options.isFifaDay ? `fifa-day-icon-${options.parentGroupId}` : '';

        let onClickJs = `const rows = document.querySelectorAll('.ref-detail-row-${groupId}'); const icon = document.getElementById('${toggleIconId}'); let isHidden = rows.length > 0 && rows[0].style.display === 'none'; rows.forEach(r => r.style.display = isHidden ? 'table-row' : 'none'); if(icon) icon.className = isHidden ? 'fas fa-chevron-down' : 'fas fa-chevron-right';`;
        if (options.isTopLevelFifa) {
            onClickJs += ` if (!isHidden) { document.querySelectorAll('.fifa-day-detail-${groupId}').forEach(r => r.style.display = 'none'); document.querySelectorAll('.fifa-day-icon-${groupId}').forEach(i => i.className = 'fas fa-chevron-right'); }`;
        }

        let groupHtml = `
            <tr class="ref-group-${parentMatchId} ref-group-header-${groupId} ${extraClass}" style="background-color: ${bgColor}; border-bottom: 2px solid #cbd5e1; font-weight: 600; cursor: pointer; display: ${initialDisplay};" onclick="${onClickJs}">
                <td colspan="4" style="padding: 10px 16px; color: #475569; vertical-align: bottom; padding-bottom: 12px;">
                    <i id="${toggleIconId}" class="fas ${options.autoExpand ? 'fa-chevron-down' : 'fa-chevron-right'} ${toggleIconClass}" style="margin-right: 8px; color: #94a3b8;"></i>${groupTitle} (${totalDetailGames} games)
                </td>
                <td style="padding: 6px 4px; text-align: center; vertical-align: bottom; color: #64748b; font-size: 0.95em; font-weight: 700;">
                    <div style="font-size: 0.7em; color: #94a3b8; font-weight: 600; margin-bottom: 2px; white-space: nowrap;">FT &gt;2.5</div>
                    <div>${pctOver2_5_FT}</div>
                </td>
                <td style="padding: 6px 4px; text-align: center; vertical-align: bottom; color: #64748b; font-size: 0.95em; font-weight: 700;">
                    -
                </td>
                <td style="padding: 6px 4px; text-align: center; vertical-align: bottom; color: #64748b; font-size: 0.95em; font-weight: 700;">
                    <div style="font-size: 0.7em; color: #94a3b8; font-weight: 600; margin-bottom: 2px; white-space: nowrap;">1HT &gt;1.5</div>
                    <div>${pctOver1_5_1HT}</div>
                </td>
                <td style="padding: 6px 4px; text-align: center; vertical-align: bottom; color: #64748b; font-size: 0.95em; font-weight: 700;">
                    <div style="font-size: 0.7em; color: #94a3b8; font-weight: 600; margin-bottom: 2px; white-space: nowrap;">2HT &gt;1.5</div>
                    <div>${pctOver1_5_2HT}</div>
                </td>
        `;
        let hideCols = window._sportsHideGoalCols || 0;
        for (let i of colOrder) {
            if (window.activeAnalysisTab === 'total' && i <= maxGoalCols && i < hideCols) continue;
            let pctStr = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 32px; margin-bottom: 4px;"></div>
                <span style="color: #94a3b8; font-size: 0.9em;">-</span>
            `;
            if (totalDetailGames > 0) {
                let pct = Math.round((bucketCounts[i] / totalDetailGames) * 100);
                if (pct > 0) {
                    let barHeight = Math.max(4, Math.round((pct / 100) * 32));
                    let isTargetGroup = groupTitle.endsWith('Games Summary') || groupTitle === 'Today Result' || groupTitle.includes('Live Games');
                    if (options.noRedBar) isTargetGroup = false;

                    let barColor, textColor;
                    if (options.noRedBar) {
                        barColor = '#94a3b8';
                        textColor = '#64748b';
                    } else if (!isTargetGroup) {
                        if (pct > 50) {
                            barColor = '#10b981';
                            textColor = '#059669';
                        } else {
                            barColor = '#475569';
                            textColor = '#334155';
                        }
                    } else if (window.activeAnalysisTab === 'total' && i >= offset) {
                        barColor = pct > 25 ? '#ef4444' : '#94a3b8';
                        textColor = pct > 25 ? '#dc2626' : '#64748b';
                    } else {
                        barColor = pct >= 50 ? '#ef4444' : '#94a3b8';
                        textColor = pct >= 50 ? '#dc2626' : '#64748b';
                    }

                    let isCurrent = (window.activeAnalysisTab === 'total' && window._sportsCurrentLiveScore !== undefined && i === window._sportsCurrentLiveScore);
                    let fontSz = isCurrent ? '1.1em' : '0.95em';
                    let fWeight = isCurrent ? '800' : '700';
                    if (isCurrent) {
                        barColor = '#dc2626';
                        textColor = '#dc2626';
                    }

                    pctStr = `
                        <div style="display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 32px; margin-bottom: 4px;">
                            <div style="width: 24px; background-color: ${barColor}; height: ${barHeight}px; border-radius: 2px 2px 0 0; transition: height 0.3s ease;"></div>
                        </div>
                        <span style="color: ${textColor}; font-size: ${fontSz}; font-weight: ${fWeight};">${pct}%</span>
                    `;
                }
            }
            groupHtml += `<td style="padding: 4px; text-align: center; vertical-align: bottom;">${pctStr}</td>`;
        }
        groupHtml += `</tr>`;

        if (options.onlySummary || options.isTopLevelFifa) {
            return groupHtml;
        }

        // Detail rows are now always generated, but their initial display state 
        // is controlled by options.autoExpand, keeping them hidden by default for summaries.
        refsArray.forEach(ref => {
            let detailBg = options.darkerBg ? '#f8fafc' : '#ffffff';

            let ref1HT = '-', ref2HT = '-';
            if (ref.goals && ref.goals.some(g => g && g.trim() !== '')) {
                let g1 = 0, g2 = 0;
                for (let i = 0; i < 4; i++) if (ref.goals[i] && ref.goals[i] !== '') g1 += ref.goals[i].split('<br>').length;
                for (let i = 4; i < 8; i++) if (ref.goals[i] && ref.goals[i] !== '') g2 += ref.goals[i].split('<br>').length;
                ref1HT = g1;
                ref2HT = g2;
            }

            let refScoreTooltip = ref.goals ? ref.goals.map((g, i) => {
                let b = '';
                if (i === 0) b = "1HT 0-15'"; if (i === 1) b = "1HT 16-30'"; if (i === 2) b = "1HT 31-45'"; if (i === 3) b = "1HT 45+'";
                if (i === 4) b = "2HT 46-60'"; if (i === 5) b = "2HT 61-75'"; if (i === 6) b = "2HT 76-90'"; if (i === 7) b = "2HT 90+'";
                return g ? `${b}: ${this.formatGoal(g).replace(/<br>/g, ', ')}` : '';
            }).filter(g => g !== '').join('&#10;') : '';

            let displayScore = ref.score || '';
            if (refScoreTooltip && displayScore) {
                displayScore = `<span title="${refScoreTooltip}" style="cursor: help;">${displayScore}</span>`;
            }

            let refAllGoalTimes = ref.goals ? ref.goals.filter(g => g).join('<br>').split('<br>').filter(g => g.trim()).map(g => this.formatGoal(g)).join('<br>') : '';

            let displayTimeOrStatus = ref.status || '';
            if (!displayTimeOrStatus || displayTimeOrStatus.toUpperCase() === 'ET' || displayTimeOrStatus.toUpperCase() === 'FT' || displayTimeOrStatus.toLowerCase() === 'finished') {
                displayTimeOrStatus = ref.time || displayTimeOrStatus;
            }

            let refGroupHtml = '';
            if (ref.group) {
                let cleanG = ref.group.replace(/group/ig, '').trim();
                let displayG = cleanG;
                if (cleanG.length === 1 && /^[A-Z]$/i.test(cleanG)) {
                    displayG = 'Group ' + cleanG.toUpperCase();
                }
                refGroupHtml = `<span style="color: #64748b; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; background-color: #e2e8f0; white-space: nowrap;">${displayG}</span>`;
            }

            let displayDate = ref.date || '';
            if (displayDate) {
                let dDay = ref.day;
                let isToday = false;
                let parts = displayDate.split(/[-/]/);
                if (parts.length === 3) {
                    let y = parts[0].length === 4 ? parseInt(parts[0]) : parseInt('20' + parts[2]);
                    let m = parts[0].length === 4 ? parseInt(parts[1]) - 1 : parseInt(parts[1]) - 1;
                    let d = parts[0].length === 4 ? parseInt(parts[2]) : parseInt(parts[0]);
                    let dateObj = new Date(y, m, d);
                    let now = new Date();
                    if (dateObj.getFullYear() === now.getFullYear() && dateObj.getMonth() === now.getMonth() && dateObj.getDate() === now.getDate()) {
                        isToday = true;
                    }
                    if (!dDay) {
                        let days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                        if (!isNaN(dateObj)) dDay = days[dateObj.getDay()];
                    }
                }
                if (isToday) {
                    displayDate = `<span style="font-weight: bold; color: #3b82f6;">Today -</span> ${displayDate}`;
                }
                if (dDay) displayDate += ` <span style="font-size: 0.85em; color: #94a3b8;">${dDay}</span>`;
            }

            let detailExtraClass = options.isFifaDay ? `fifa-day-detail-${options.parentGroupId}` : '';
            let detailHtml = `
                    <tr class="ref-group-${parentMatchId} ref-detail-row-${groupId} ${detailExtraClass}" style="display: ${options.autoExpand ? 'table-row' : 'none'}; background-color: ${detailBg}; border-bottom: 1px solid #f1f5f9; transition: background-color 0.2s;">
                        <td style="padding: 12px 16px; color: #64748b; font-size: 0.9em; white-space: nowrap;">${displayDate}</td>
                        <td style="padding: 12px 16px; text-align: center; color: #64748b; font-size: 0.9em; font-weight: 600; white-space: nowrap;">${displayTimeOrStatus}</td>
                        <td style="padding: 12px 16px; text-align: center;">${refGroupHtml}</td>
                        <td style="padding: 12px 16px; color: #334155; font-size: 0.95em; line-height: 1.5; max-width: 160px; white-space: normal; word-wrap: break-word;">
                            ${(window.location.hash.startsWith('#all_live_soccer') && ref.group) ? `<a href="#all_live_soccer/${ref.date || 'Unknown'}/${encodeURIComponent(ref.group)}/${encodeURIComponent(ref.homeTeam)}-vs-${encodeURIComponent(ref.awayTeam)}${ref.matchId ? `_id_${ref.matchId}` : ''}" style="color: inherit; text-decoration: none; display: block; width: 100%;">${ref.homeTeam} - ${ref.awayTeam}</a>` : `${ref.homeTeam} - ${ref.awayTeam}`}
                        </td>
                        <td style="padding: 12px 16px; text-align: center; font-weight: bold; color: #0f172a; font-size: 1.1em; letter-spacing: 1px; white-space: nowrap;">
                            ${displayScore}
                            ${(ref.matchId && !ref.matchId.toString().startsWith('120')) ? `<br><a href="javascript:void(0)" style="display: inline-block; margin-top: 4px; padding: 2px 6px; font-size: 10px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 4px; color: #475569; cursor: pointer; text-decoration: none;" onclick="event.stopPropagation(); event.preventDefault(); if(window.App) window.App.toggleMatchRefs('${ref.matchId}', '${(ref.homeTeam || '').replace(/'/g, "\\'")}', '${(ref.awayTeam || '').replace(/'/g, "\\'")}', '${(ref.status || '').replace(/'/g, "\\'")}', '${(ref.score || '').replace(/'/g, "\\'")}', false, false, '${(ref.date || '').replace(/'/g, "\\'")}')" id="toggle-refs-btn-${ref.matchId}">Analyst</a>` : ''}
                            ${(ref.matchId && ref1HT === '-' && ref2HT === '-' && displayScore && displayScore.includes('-') && displayScore !== '0-0' && !displayScore.includes('span')) ? `<br><a href="javascript:void(0)" style="display: inline-block; margin-top: 4px; padding: 2px 6px; font-size: 10px; background: #3b82f6; border: 1px solid #2563eb; border-radius: 4px; color: white; cursor: pointer; text-decoration: none;" onclick="event.stopPropagation(); event.preventDefault(); if(window.App) window.App.fetchSofascoreGoals('${ref.matchId}', '${ref.date || ''}', '${(ref.homeTeam || '').replace(/'/g, "\\'")}', '${(ref.awayTeam || '').replace(/'/g, "\\'")}', '${(ref.score || '').replace(/'/g, "\\'")}', this);">SofaScore</a>` : ''}
                            ${(ref.matchId && ref1HT === '-' && ref2HT === '-' && displayScore && displayScore.includes('span') && !displayScore.includes('0-0</span>')) ? `<br><a href="javascript:void(0)" style="display: inline-block; margin-top: 4px; padding: 2px 6px; font-size: 10px; background: #3b82f6; border: 1px solid #2563eb; border-radius: 4px; color: white; cursor: pointer; text-decoration: none;" onclick="event.stopPropagation(); event.preventDefault(); if(window.App) window.App.fetchSofascoreGoals('${ref.matchId}', '${ref.date || ''}', '${(ref.homeTeam || '').replace(/'/g, "\\'")}', '${(ref.awayTeam || '').replace(/'/g, "\\'")}', '${(ref.score || '').replace(/'/g, "\\'")}', this);">SofaScore</a>` : ''}
                            ${(ref.matchId && !ref.matchId.toString().startsWith('120') && ref.status !== 'TBD' && ref.status !== 'CANC') ? `<a href="javascript:void(0)" style="display: inline-block; margin-top: 4px; margin-left: 4px; padding: 2px 6px; font-size: 10px; background: #10b981; border: 1px solid #059669; border-radius: 4px; color: white; cursor: pointer; text-decoration: none;" onclick="event.stopPropagation(); event.preventDefault(); if(window.App) window.App.fetch7mGoals('${ref.matchId}', '${ref.date || ''}', '${(ref.homeTeam || '').replace(/'/g, "\\'")}', '${(ref.awayTeam || '').replace(/'/g, "\\'")}', '${(ref.score || '').replace(/'/g, "\\'")}', this);">7m Goals</a>` : ''}
                        </td>
                        <td style="padding: 12px 16px; text-align: center; color: #64748b; font-size: 0.85em; max-width: 120px; white-space: normal; line-height: 1.4;">${refAllGoalTimes}</td>
                        <td style="padding: 12px 4px; text-align: center; color: #475569; font-weight: 600;">${ref1HT}</td>
                        <td style="padding: 12px 4px; text-align: center; color: #475569; font-weight: 600;">${ref2HT}</td>
                `;
            if (window.activeAnalysisTab === 'goalTime' || !window.activeAnalysisTab) {
                for (let i = 0; i < 8; i++) {
                    let gStr = ref.goals ? ref.goals[i] : '';
                    detailHtml += `<td style="padding: 12px 4px; text-align: center; color: #dc2626; font-size: 0.85em; font-weight: 600; line-height: 1.4;">${this.formatGoal(gStr)}</td>`;
                }
            } else {
                let count1HT1 = 0, count1HT2 = 0, count45Plus = 0, count2HT1 = 0, count2HT2 = 0, count90Plus = 0;
                let totalRefGoals = 0;
                if (ref.goals) {
                    const countGoals = (goalsStr, minTime, maxTime) => {
                        if (!goalsStr) return 0;
                        let count = 0;
                        goalsStr.split('<br>').forEach(g => {
                            let m = g.match(/(\d+)'/);
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

                    count1HT1 = countAllGoals(ref.goals[0]) + countGoals(ref.goals[1], 16, 22);
                    count1HT2 = countGoals(ref.goals[1], 23, 30) + countAllGoals(ref.goals[2]);
                    count45Plus = countAllGoals(ref.goals[3]);

                    count2HT1 = countAllGoals(ref.goals[4]) + countGoals(ref.goals[5], 61, 67);
                    count2HT2 = countGoals(ref.goals[5], 68, 75) + countAllGoals(ref.goals[6]);
                    count90Plus = countAllGoals(ref.goals[7]);

                    let g1 = 0, g2 = 0;
                    for (let i = 0; i < 4; i++) if (ref.goals[i] && ref.goals[i] !== '') g1 += ref.goals[i].split('<br>').length;
                    for (let i = 4; i < 8; i++) if (ref.goals[i] && ref.goals[i] !== '') g2 += ref.goals[i].split('<br>').length;

                    let sTotal = 0;
                    if (ref.score && ref.score.includes('-')) {
                        const sParts = ref.score.split('-');
                        sTotal = parseInt(sParts[0]) + parseInt(sParts[1]);
                    }

                    this._hasMissingGoalDetails = (sTotal > 0 && (g1 + g2) === 0);

                    totalRefGoals = g1 + g2;
                    if (sTotal > totalRefGoals) totalRefGoals = sTotal;
                } else {
                    this._hasMissingGoalDetails = false;
                }

                let hideCols = window._sportsHideGoalCols || 0;
                for (let i of colOrder) {
                    if (window.activeAnalysisTab === 'total' && i <= maxGoalCols && i < hideCols) continue;
                    let cellContent = '';
                    if (window.activeAnalysisTab === 'total' || window.activeAnalysisTab === '1ht' || window.activeAnalysisTab === '2ht') {
                        if (i <= maxGoalCols) {
                            let targetGoals = totalRefGoals;
                            if (window.activeAnalysisTab === '1ht') {
                                let g1 = 0;
                                if (ref.goals) {
                                    for (let j = 0; j < 4; j++) if (ref.goals[j] && ref.goals[j] !== '') g1 += ref.goals[j].split('<br>').length;
                                }
                                targetGoals = g1;
                            } else if (window.activeAnalysisTab === '2ht') {
                                let g2 = 0;
                                if (ref.goals) {
                                    for (let j = 4; j < 8; j++) if (ref.goals[j] && ref.goals[j] !== '') g2 += ref.goals[j].split('<br>').length;
                                }
                                targetGoals = g2;
                            }

                            if (this._hasMissingGoalDetails) {
                                // Do nothing, leave cellContent empty
                            } else if (targetGoals >= maxGoalCols && i === maxGoalCols) cellContent = '✓';
                            else if (targetGoals === i) cellContent = '✓';
                        } else if (i === offset) cellContent = count1HT1 > 0 ? count1HT1 : '';
                        else if (i === offset + 1) cellContent = count1HT2 > 0 ? count1HT2 : '';
                        else if (i === offset + 2) cellContent = count2HT1 > 0 ? count2HT1 : '';
                        else if (i === offset + 3) cellContent = count2HT2 > 0 ? count2HT2 : '';
                        else if (i === offset + 4) cellContent = count45Plus > 0 ? count45Plus : '';
                        else if (i === offset + 5) cellContent = count90Plus > 0 ? count90Plus : '';
                    } else if (window.activeAnalysisTab === 'draw') {
                        if (ref.score && ref.score.includes('-')) {
                            const sParts = ref.score.split('-');
                            const h = parseInt(sParts[0]);
                            const a = parseInt(sParts[1]);
                            let targetVal = -1;
                            if (h > a) targetVal = 0;
                            else if (h === a) targetVal = 1;
                            else targetVal = 2;

                            if (targetVal === i) cellContent = '✓';
                        }
                    }

                    let isCurrent = (window.activeAnalysisTab === 'total' && window._sportsCurrentLiveScore !== undefined && i === window._sportsCurrentLiveScore);
                    let cellColor = cellContent !== '' ? (isCurrent ? '#dc2626' : '#059669') : '#94a3b8';
                    let cellFontWeight = cellContent !== '' ? (isCurrent ? '800' : '600') : 'normal';
                    let cellFontSize = isCurrent ? '1.1em' : '0.85em';

                    detailHtml += `<td style="padding: 12px 4px; text-align: center; color: ${cellColor}; font-size: ${cellFontSize}; font-weight: ${cellFontWeight};">${cellContent || '-'}</td>`;
                }
            }
            detailHtml += `</tr>`;
            groupHtml += detailHtml;
        });
        // End of detail row generation

        return groupHtml;
    }
};
