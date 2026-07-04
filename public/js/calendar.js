/**
 * calendar.js — Calendar, Map, and related methods
 * Extracted from app.js for modularity.
 *
 * Playlist methods have been moved to playlist.js.
 * Manual image generation methods have been moved to manual-image-gen.js.
 *
 * Usage in app.js:
 *   import { CalendarMixin }       from './calendar.js';
 *   import { PlaylistMixin }       from './playlist.js';
 *   import { ManualImageGenMixin } from './manual-image-gen.js';
 *   Object.assign(App, CalendarMixin, PlaylistMixin, ManualImageGenMixin);
 */

export const CalendarMixin = {

    // HTML escape helper
    escape(s) {
        return String(s ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    },

    // ─── Get public holidays for US, Canada, China, Taiwan, Japan ────────────
    getHolidaysForDate(year, month, day) {
        // month is 0-indexed: 0 = January, 4 = May, 11 = December.
        const holidays = [];
        
        // Static holidays (same date every year)
        // January 1
        if (month === 0 && day === 1) {
            holidays.push({ country: 'US', name: 'New Year\'s Day', flag: '🇺🇸' });
            holidays.push({ country: 'CA', name: 'New Year\'s Day', flag: '🇨🇦' });
            holidays.push({ country: 'CN', name: 'New Year\'s Day', flag: '🇨🇳' });
            holidays.push({ country: 'TW', name: 'Founding of ROC', flag: '🇹🇼' });
            holidays.push({ country: 'JP', name: 'New Year\'s Day', flag: '🇯🇵' });
        }
        // February 28
        if (month === 1 && day === 28) {
            holidays.push({ country: 'TW', name: 'Peace Memorial Day', flag: '🇹🇼' });
        }
        // April 29
        if (month === 3 && day === 29) {
            holidays.push({ country: 'JP', name: 'Showa Day', flag: '🇯🇵' });
        }
        // May 1
        if (month === 4 && day === 1) {
            holidays.push({ country: 'CN', name: 'Labor Day', flag: '🇨🇳' });
            holidays.push({ country: 'TW', name: 'Labor Day', flag: '🇹🇼' });
        }
        // May 3
        if (month === 4 && day === 3) {
            holidays.push({ country: 'JP', name: 'Constitution Memorial Day', flag: '🇯🇵' });
        }
        // May 4
        if (month === 4 && day === 4) {
            holidays.push({ country: 'JP', name: 'Greenery Day', flag: '🇯🇵' });
        }
        // May 5
        if (month === 4 && day === 5) {
            holidays.push({ country: 'JP', name: 'Children\'s Day', flag: '🇯🇵' });
        }
        // July 1
        if (month === 6 && day === 1) {
            holidays.push({ country: 'CA', name: 'Canada Day', flag: '🇨🇦' });
        }
        // July 4
        if (month === 6 && day === 4) {
            holidays.push({ country: 'US', name: 'Independence Day', flag: '🇺🇸' });
        }
        // August 11
        if (month === 7 && day === 11) {
            holidays.push({ country: 'JP', name: 'Mountain Day', flag: '🇯🇵' });
        }
        // October 10
        if (month === 9 && day === 10) {
            holidays.push({ country: 'TW', name: 'National Day', flag: '🇹🇼' });
        }
        // November 3
        if (month === 10 && day === 3) {
            holidays.push({ country: 'JP', name: 'Culture Day', flag: '🇯🇵' });
        }
        // November 23
        if (month === 10 && day === 23) {
            holidays.push({ country: 'JP', name: 'Labor Thanksgiving Day', flag: '🇯🇵' });
        }
        // December 25
        if (month === 11 && day === 25) {
            holidays.push({ country: 'US', name: 'Christmas Day', flag: '🇺🇸' });
            holidays.push({ country: 'CA', name: 'Christmas Day', flag: '🇨🇦' });
        }
        // December 26
        if (month === 11 && day === 26) {
            holidays.push({ country: 'CA', name: 'Boxing Day', flag: '🇨🇦' });
        }
        
        // Year-specific calculations/mappings
        if (year === 2026) {
            // January
            if (month === 0) {
                if (day === 12) holidays.push({ country: 'JP', name: 'Coming of Age Day', flag: '🇯🇵' });
                if (day === 19) holidays.push({ country: 'US', name: 'Martin Luther King Jr. Day', flag: '🇺🇸' });
                if (day === 28) {
                    holidays.push({ country: 'CN', name: 'Spring Festival (Lunar New Year\'s Eve)', flag: '🇨🇳' });
                    holidays.push({ country: 'TW', name: 'Lunar New Year\'s Eve', flag: '🇹🇼' });
                }
                if (day === 29) {
                    holidays.push({ country: 'CN', name: 'Spring Festival (Lunar New Year)', flag: '🇨🇳' });
                    holidays.push({ country: 'TW', name: 'Lunar New Year\'s Day', flag: '🇹🇼' });
                }
                if (day === 30) {
                    holidays.push({ country: 'CN', name: 'Spring Festival (Day 2)', flag: '🇨🇳' });
                    holidays.push({ country: 'TW', name: 'Lunar New Year (Day 2)', flag: '🇹🇼' });
                }
                if (day === 31) {
                    holidays.push({ country: 'CN', name: 'Spring Festival (Day 3)', flag: '🇨🇳' });
                    holidays.push({ country: 'TW', name: 'Lunar New Year (Day 3)', flag: '🇹🇼' });
                }
            }
            // February
            if (month === 1) {
                if (day === 1) {
                    holidays.push({ country: 'CN', name: 'Spring Festival (Day 4)', flag: '🇨🇳' });
                    holidays.push({ country: 'TW', name: 'Lunar New Year (Day 4)', flag: '🇹🇼' });
                }
                if (day === 2) {
                    holidays.push({ country: 'CN', name: 'Spring Festival (Day 5)', flag: '🇨🇳' });
                    holidays.push({ country: 'TW', name: 'Lunar New Year (Day 5)', flag: '🇹🇼' });
                }
                if (day === 3) holidays.push({ country: 'CN', name: 'Spring Festival (Day 6)', flag: '🇨🇳' });
                if (day === 11) holidays.push({ country: 'JP', name: 'National Foundation Day', flag: '🇯🇵' });
                if (day === 16) {
                    holidays.push({ country: 'US', name: 'Washington\'s Birthday', flag: '🇺🇸' });
                    holidays.push({ country: 'CA', name: 'Family Day', flag: '🇨🇦' });
                }
                if (day === 23) holidays.push({ country: 'JP', name: 'Emperor\'s Birthday', flag: '🇯🇵' });
            }
            // March
            if (month === 2) {
                if (day === 21) holidays.push({ country: 'JP', name: 'Vernal Equinox Day', flag: '🇯🇵' });
            }
            // April
            if (month === 3) {
                if (day === 3) {
                    holidays.push({ country: 'CA', name: 'Good Friday', flag: '🇨🇦' });
                    holidays.push({ country: 'TW', name: 'Children\'s Day', flag: '🇹🇼' });
                }
                if (day === 4) holidays.push({ country: 'TW', name: 'Tomb Sweeping Day', flag: '🇹🇼' });
                if (day === 5) holidays.push({ country: 'CN', name: 'Tomb Sweeping Day', flag: '🇨🇳' });
                if (day === 6) holidays.push({ country: 'CA', name: 'Easter Monday', flag: '🇨🇦' });
            }
            // May
            if (month === 4) {
                if (day === 2) holidays.push({ country: 'CN', name: 'Labor Day Holiday', flag: '🇨🇳' });
                if (day === 3) holidays.push({ country: 'CN', name: 'Labor Day Holiday', flag: '🇨🇳' });
                if (day === 4) holidays.push({ country: 'CN', name: 'Labor Day Holiday', flag: '🇨🇳' });
                if (day === 5) holidays.push({ country: 'CN', name: 'Labor Day Holiday', flag: '🇨🇳' });
                if (day === 6) holidays.push({ country: 'JP', name: 'Compensatory Holiday', flag: '🇯🇵' });
                if (day === 18) holidays.push({ country: 'CA', name: 'Victoria Day', flag: '🇨🇦' });
                if (day === 25) holidays.push({ country: 'US', name: 'Memorial Day', flag: '🇺🇸' });
            }
            // June
            if (month === 5) {
                if (day === 19) {
                    holidays.push({ country: 'US', name: 'Juneteenth', flag: '🇺🇸' });
                    holidays.push({ country: 'CN', name: 'Dragon Boat Festival', flag: '🇨🇳' });
                    holidays.push({ country: 'TW', name: 'Dragon Boat Festival', flag: '🇹🇼' });
                }
            }
            // July
            if (month === 6) {
                if (day === 20) holidays.push({ country: 'JP', name: 'Marine Day', flag: '🇯🇵' });
            }
            // August
            if (month === 7) {
                if (day === 3) holidays.push({ country: 'CA', name: 'Civic Holiday', flag: '🇨🇦' });
            }
            // September
            if (month === 8) {
                if (day === 7) {
                    holidays.push({ country: 'US', name: 'Labor Day', flag: '🇺🇸' });
                    holidays.push({ country: 'CA', name: 'Labour Day', flag: '🇨🇦' });
                }
                if (day === 21) holidays.push({ country: 'JP', name: 'Respect for the Aged Day', flag: '🇯🇵' });
                if (day === 23) holidays.push({ country: 'JP', name: 'Autumnal Equinox Day', flag: '🇯🇵' });
                if (day === 25) {
                    holidays.push({ country: 'CN', name: 'Mid-Autumn Festival', flag: '🇨🇳' });
                    holidays.push({ country: 'TW', name: 'Mid-Autumn Festival', flag: '🇹🇼' });
                }
                if (day === 30) holidays.push({ country: 'CA', name: 'National Day for Truth and Reconciliation', flag: '🇨🇦' });
            }
            // October
            if (month === 9) {
                if (day === 1) holidays.push({ country: 'CN', name: 'National Day', flag: '🇨🇳' });
                if (day === 2) holidays.push({ country: 'CN', name: 'National Day Holiday', flag: '🇨🇳' });
                if (day === 3) holidays.push({ country: 'CN', name: 'National Day Holiday', flag: '🇨🇳' });
                if (day === 4) holidays.push({ country: 'CN', name: 'National Day Holiday', flag: '🇨🇳' });
                if (day === 5) holidays.push({ country: 'CN', name: 'National Day Holiday', flag: '🇨🇳' });
                if (day === 6) holidays.push({ country: 'CN', name: 'National Day Holiday', flag: '🇨🇳' });
                if (day === 7) holidays.push({ country: 'CN', name: 'National Day Holiday', flag: '🇨🇳' });
                if (day === 12) {
                    holidays.push({ country: 'US', name: 'Columbus Day', flag: '🇺🇸' });
                    holidays.push({ country: 'CA', name: 'Thanksgiving', flag: '🇨🇦' });
                    holidays.push({ country: 'JP', name: 'Sports Day', flag: '🇯🇵' });
                }
            }
            // November
            if (month === 10) {
                if (day === 11) {
                    holidays.push({ country: 'US', name: 'Veterans Day', flag: '🇺🇸' });
                    holidays.push({ country: 'CA', name: 'Remembrance Day', flag: '🇨🇦' });
                }
                if (day === 26) holidays.push({ country: 'US', name: 'Thanksgiving Day', flag: '🇺🇸' });
            }
        }
        
        return holidays;
    },

    // ─── Load calendar events in monthly chunks ──────────────────────────────
    async loadLatestEvents() {
        const now = new Date();
        const y = now.getFullYear();
        const m = now.getMonth();

        await this.fetchCalendarMonth(y, m);

        this.fetchCalendarMonth(y, m - 1);
        this.fetchCalendarMonth(y, m + 1);

        try {
            const res = await fetch(`/latest_events_utf8.json?t=${Date.now()}`);
            if (res.ok) {
                const data = await res.json();
                window.cloudmailLatestEvents = data;
                this.mergeEventsToState(data.items || []);
            }
        } catch (e) {
            console.warn('Legacy latest_events_utf8.json not found or failed.');
        }

        try {
            const res = await fetch(`/config/hostnames.json?t=${Date.now()}`);
            if (res.ok) {
                this.state.calendar.hostnames = await res.json();
                console.log('Subdomain configuration loaded:', this.state.calendar.hostnames);
            }
        } catch (e) {
            console.warn('Could not load subdomain configuration, using default.');
            this.state.calendar.hostnames = [];
        }
    },

    async fetchCalendarMonth(year, month) {
        const d = new Date(year, month, 1);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const key = `${y}-${m}`;

        if (this.state.calendar.loadedMonths.has(key)) return;
        this.state.calendar.loadedMonths.add(key);

        console.log(`fetching calendar data for ${key}...`);
        try {
            const res = await fetch(`/calendar/${key}.json?t=${Date.now()}`);
            if (res.ok) {
                const data = await res.json();
                this.mergeEventsToState(data.items || []);

                if (window.location.hash.includes('#calendar') || window.location.hash.includes('#map')) {
                    this.state.calendar.indexedEvents = null;
                    if (this.state.calendar.view === 'month') this.renderCalendar();
                    else if (this.state.calendar.view === 'map') this.renderMap();
                }
            }
        } catch (e) {
            console.warn(`Could not load calendar data for ${key}`);
        }
    },

    mergeEventsToState(items) {
        if (!items || items.length === 0) return;

        let customEvents = JSON.parse(localStorage.getItem('cloudmail_events') || '[]');

        const existingIds = new Set();
        const existingTitleDates = new Set();
        const uniqueEvents = [];
        customEvents.filter(ev => !ev.isGoogleSync).forEach(ev => {
            let thematicPrefix = null;
            if (typeof ev.title === 'string' && ev.title.startsWith('第')) {
                const match = ev.title.match(/^第[0-9\+A-Za-z]+天/);
                if (match) thematicPrefix = match[0];
            }
            const titleDateKey = thematicPrefix ? `${thematicPrefix}||${ev.date}` : `${ev.title}||${ev.date}`;

            if (ev.id && !existingIds.has(ev.id) && !existingTitleDates.has(titleDateKey)) {
                existingIds.add(ev.id);
                existingTitleDates.add(titleDateKey);
                uniqueEvents.push(ev);
            }
        });
        customEvents = uniqueEvents;

        items.forEach(item => {
            const evDate = (item.start && (item.start.date || item.start.dateTime))
                ? (item.start.date || item.start.dateTime).split('T')[0]
                : null;
            if (item.id && !existingIds.has(item.id) && evDate) {
                const titleStr = item.summary || 'No Title';
                let videoTags = null;
                if (item.extendedProperties?.private?.videoTags) {
                    try { videoTags = JSON.parse(item.extendedProperties.private.videoTags); } catch (e) { }
                }

                let thematicPrefix = null;
                if (typeof titleStr === 'string' && titleStr.startsWith('第')) {
                    const match = titleStr.match(/^第[0-9\+A-Za-z]+天/);
                    if (match) thematicPrefix = match[0];
                }
                const titleDateKey = thematicPrefix ? `${thematicPrefix}||${evDate}` : `${titleStr}||${evDate}`;

                if (!existingTitleDates.has(titleDateKey) || !titleStr.startsWith('第')) {
                    customEvents.push({
                        id: item.id,
                        title: titleStr,
                        description: item.description || '',
                        date: evDate,
                        attachments: item.attachments || [],
                        tags: videoTags,
                        isGoogleSync: true,
                        isAllDay: item.start && !!item.start.date,
                        location: item.location || ''
                    });
                    existingIds.add(item.id);
                    existingTitleDates.add(titleDateKey);
                }
            } else if (item.id && existingIds.has(item.id)) {
                const existingEv = customEvents.find(e => e.id === item.id);
                if (existingEv) {
                    if (item.extendedProperties?.private?.videoTags) {
                        try { existingEv.tags = JSON.parse(item.extendedProperties.private.videoTags); } catch (e) { }
                    }
                    if (item.location) {
                        existingEv.location = item.location;
                    }
                }
            }
        });

        window.cloudmailCustomEvents = customEvents;
        try {
            localStorage.setItem('cloudmail_events', JSON.stringify(customEvents.filter(ev => !ev.isGoogleSync)));
        } catch (e) {
            console.warn('Could not save manual events to localStorage:', e);
        }

        if (!window.cloudmailLatestEvents) window.cloudmailLatestEvents = { items: [] };

        const winIds = new Set();
        const winTitleDates = new Set();
        const uniqueWinItems = [];
        window.cloudmailLatestEvents.items.forEach(i => {
            const evDate = (i.start && (i.start.date || i.start.dateTime))
                ? (i.start.date || i.start.dateTime).split('T')[0]
                : null;
            let thematicPrefix = null;
            if (i.summary && i.summary.startsWith('第')) {
                const match = i.summary.match(/^第[0-9\+A-Za-z]+天/);
                if (match) thematicPrefix = match[0];
            }
            const titleDateKey = thematicPrefix ? `${thematicPrefix}||${evDate}` : `${i.summary || 'No Title'}||${evDate}`;

            if (i.id && !winIds.has(i.id) && (!winTitleDates.has(titleDateKey) || !(i.summary || '').startsWith('第'))) {
                winIds.add(i.id);
                if (evDate) winTitleDates.add(titleDateKey);
                uniqueWinItems.push(i);
            }
        });

        items.forEach(i => {
            const evDate = (i.start && (i.start.date || i.start.dateTime))
                ? (i.start.date || i.start.dateTime).split('T')[0]
                : null;
            let thematicPrefix = null;
            if (i.summary && i.summary.startsWith('第')) {
                const match = i.summary.match(/^第[0-9\+A-Za-z]+天/);
                if (match) thematicPrefix = match[0];
            }
            const titleDateKey = thematicPrefix ? `${thematicPrefix}||${evDate}` : `${i.summary || 'No Title'}||${evDate}`;

            if (i.id && !winIds.has(i.id) && (!winTitleDates.has(titleDateKey) || !(i.summary || '').startsWith('第'))) {
                uniqueWinItems.push(i);
                winIds.add(i.id);
                if (evDate) winTitleDates.add(titleDateKey);
            }
        });

        window.cloudmailLatestEvents.items = uniqueWinItems;
    },

    // ─── Resolve calendar event image — local first, Google Drive on error ───
    resolveEventImageUrl(ev, dateKey) {
        if (!ev.isGoogleSync && !ev.attachments) return null;

        const toLocalPath = (att) => {
            if (!att) return '';
            if (att.localUrl) return this._getAssetUrl(att.localUrl);
            if (att.fileId) return this._getAssetUrl(`/images/calendar/${att.fileId}.jpg`);
            return '';
        };

        const toGoogleUrl = (att) => {
            if (!att) return '';
            const url = att.fileUrl || att.iconLink || '';
            const idMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/) || url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
            const fileId = att.fileId || (idMatch ? idMatch[1] : '');
            if (fileId) {
                return `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`;
            }
            return this.getDirectDriveUrl(url);
        };

        const isImageAtt = (a) => {
            if (a.mimeType?.startsWith('image/')) return true;
            const t = (a.title || '').toLowerCase();
            return t.endsWith('.png') || t.endsWith('.jpg') || t.endsWith('.jpeg') || t.endsWith('.webp');
        };
        const isGridAtt = (a) => (a.title || '').startsWith('grid_');

        const isVideoAtt = (a) => {
            if (a.mimeType?.startsWith('video/')) return true;
            const t = (a.title || '').toLowerCase();
            return t.endsWith('.mp4') || t.endsWith('.webm');
        };

        const pickCover = (attachments) => {
            if (!attachments?.length) return null;
            const cover = attachments.find(a => isImageAtt(a) && a.title === 'cover.png');
            if (cover) return cover;
            return attachments.find(a => isImageAtt(a) && !isGridAtt(a));
        };

        const pickVideo = (attachments) => {
            if (!attachments?.length) return null;
            return attachments.find(a => isVideoAtt(a));
        };

        // ── Priority 1: cover.png ────────────────────────────────────────────
        let coverAtt = null;
        let videoAtt = null;
        if (window.cloudmailLatestEvents?.items) {
            const jsonEvent = window.cloudmailLatestEvents.items.find(item => item.id === ev.id);
            coverAtt = pickCover(jsonEvent?.attachments);
            videoAtt = pickVideo(jsonEvent?.attachments);
        }
        if (!coverAtt) coverAtt = pickCover(ev.attachments);
        if (!videoAtt) videoAtt = pickVideo(ev.attachments);

        const getVideoUrl = (att) => {
            if (!att) return null;
            if (att.localUrl) return this._getAssetUrl(att.localUrl);
            const url = att.fileUrl || att.iconLink || '';
            const idMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/) || url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
            const fileId = att.fileId || (idMatch ? idMatch[1] : '');
            if (fileId) return `https://drive.google.com/uc?id=${fileId}&export=download`;
            return this.getDirectDriveUrl(url);
        };
        const videoUrl = getVideoUrl(videoAtt);

        if (coverAtt) {
            const fileUrl = toLocalPath(coverAtt);
            const googleUrl = toGoogleUrl(coverAtt);
            if (fileUrl || googleUrl) {
                return { fileUrl, googleUrl, videoUrl, isGrid: false };
            }
        }

        // ── Priority 2: grid_*.png ───────────────────────────────────────────
        const findGrid = (attachments) => (attachments || []).find(a => (a.title || '').startsWith('grid_') && (a.title || '').endsWith('.png'));

        let gridAtt = findGrid(ev.attachments);
        if (!gridAtt && window.cloudmailLatestEvents?.items) {
            const jsonEvent = window.cloudmailLatestEvents.items.find(item => item.id === ev.id);
            gridAtt = findGrid(jsonEvent?.attachments);
        }

        if (gridAtt) {
            const loc = toLocalPath(gridAtt);
            const goo = toGoogleUrl(gridAtt);
            return { fileUrl: loc || goo, googleUrl: goo, videoUrl, isGrid: true };
        }

        // ── Priority 3: art style image fallback ─────────────────────────────
        const allTags = this._parseArtPhilTagsAll ? this._parseArtPhilTagsAll(ev) : [];
        if (allTags && allTags.length > 0) {
            const filterVal = this.state?.calendar?.videoTagsFilter?.artStyle;
            let styleName = allTags[0].style;
            if (filterVal && filterVal.startsWith('p:style:')) {
                const rest = filterVal.slice(8);
                const sep = rest.indexOf(':');
                const group = rest.slice(0, sep);
                const style = rest.slice(sep + 1);
                const match = allTags.find(t => t.group === group && t.style === style);
                if (match) styleName = match.style;
            }

            if (!this._artStyleImageCache && this._buildArtStyleImageCache) this._buildArtStyleImageCache();
            const styleUrl = this._getGridImageUrl ? this._getGridImageUrl(styleName) : null;
            if (styleUrl) {
                const staticFallback = `/style-images/${styleName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.png`;
                return { fileUrl: staticFallback, googleUrl: styleUrl, videoUrl, isGrid: true };
            }
        }

        if (videoUrl) {
            return { fileUrl: '', googleUrl: '', videoUrl, isGrid: false };
        }

        return null;
    },

    _buildEventCoverHtml(imgResult, ev, dateKey, additionalStyle = '') {
        if (imgResult) {
            let styleAttr = additionalStyle ? `style="${additionalStyle}"` : '';
            if (imgResult.videoUrl) {
                const wrapperStyle = additionalStyle ? `style="${additionalStyle} position: relative;"` : `style="position: relative;"`;
                return `<div class="event-cover" ${wrapperStyle} 
                    onmouseenter="const img = this.querySelector('img'); const v = this.querySelector('video'); if(v) { v.style.display='block'; v.play().catch(e=>{}); if(img && img.getAttribute('data-broken') !== 'true') img.style.opacity=0; }"
                    onmouseleave="const img = this.querySelector('img'); const v = this.querySelector('video'); if(v) { v.pause(); if(img && img.getAttribute('data-broken') !== 'true') { v.style.display='none'; img.style.opacity=1; } }">
                    <img src="${imgResult.googleUrl || imgResult.fileUrl}" style="width: 100%; border-radius: 4px; transition: opacity 0.3s;" 
                         data-local-url="${imgResult.fileUrl}"
                         data-google-url="${imgResult.googleUrl}" 
                         onerror="if(this.nextElementSibling && this.nextElementSibling.tagName === 'VIDEO'){ this.style.display='none'; this.nextElementSibling.style.display='block'; this.nextElementSibling.style.position='static'; this.setAttribute('data-broken', 'true'); } else { App.handleImageError(this, '${dateKey}'); }" />
                    <video src="${imgResult.videoUrl}" style="position: absolute; top:0; left:0; width: 100%; height: 100%; object-fit: cover; border-radius: 4px; display: none; pointer-events: none;" muted loop playsinline></video>
                </div>`.replace('v.play().catch(e=>{})', 'v.play().catch(e=>{console.error("Video play error:", e)})');
            } else {
                return `<div class="event-cover" ${styleAttr}><img src="${imgResult.googleUrl || imgResult.fileUrl}" style="width: 100%; border-radius: 4px;" 
                     data-local-url="${imgResult.fileUrl}"
                     data-google-url="${imgResult.googleUrl}" 
                     onerror="App.handleImageError(this, '${dateKey}')" /></div>`;
            }
        } else if (ev.id && ev.isGoogleSync && ev.isAllDay) {
            return `<div class="event-cover" ${additionalStyle ? `style="${additionalStyle}"` : ''}>${this._renderCFPlaceholder(ev.id, ev.title || '')}</div>`;
        }
        return '';
    },

    // ─── Simplified: Try Google Drive on error, then hide ───────────────────
    handleImageError(img, dateKey) {
        const state = parseInt(img.getAttribute('data-fallback-state') || '0', 10);

        if (state === 0) {
            const localUrl = img.getAttribute('data-local-url');
            if (localUrl && img.src !== localUrl) {
                img.setAttribute('data-fallback-state', '1');
                img.src = localUrl;
                return;
            }
        }

        console.warn(`All image sources exhausted for date: ${dateKey}`);
        const container = img.closest('.event-cover');
        if (container) {
            container.style.display = 'none';
        } else {
            img.outerHTML = `<div style="width:100%;height:100%;min-height:80px;background:#f0f0f0;display:flex;align-items:center;justify-content:center;"><i class="fas fa-film" style="font-size:24px;color:#ccc;"></i></div>`;
        }
    },

    getFallbackImageUrl(dateStr) {
        if (!dateStr) return null;
        const match = dateStr.match(/\d{4}-\d{2}-\d{2}/);
        if (match) return this._getAssetUrl(`/images/calendar/${match[0]}.jpg`);
        return null;
    },

    getDirectDriveUrl(url) {
        if (!url || !url.includes('drive.google.com')) return url;
        const idMatch = url.match(/\/d\/([^/?#]+)/) || url.match(/[?&]id=([^&?#]+)/) || url.match(/\/file\/d\/([^/?#]+)/);
        if (idMatch && idMatch[1]) {
            return `https://drive.google.com/uc?id=${idMatch[1]}&export=download`;
        }
        return url;
    },

    _getCFAccount() {
        const raw = window.__CF_ACCOUNTS_JSON;
        if (!raw) return null;
        try {
            const accounts = typeof raw === 'string' ? JSON.parse(raw) : raw;
            if (!Array.isArray(accounts) || accounts.length === 0) return null;
            return accounts[Math.floor(Math.random() * accounts.length)];
        } catch (e) {
            console.error('[CF] Failed to parse accounts:', e);
            return null;
        }
    },

    _getServerUrl() {
        const isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
        if (isLocal) {
            return window.__REPLY_SERVER || 'http://localhost:8443';
        }
        return window.location.origin;
    },

    _getAssetUrl(path) {
        const isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
        if (isLocal) return path;
        if (path.startsWith('/videos/')) return `https://email-solutions-videos.pages.dev${path}`;
        if (path.startsWith('/audio/')) return `https://email-solutions-audio.pages.dev${path}`;
        if (path.startsWith('/images/')) return `https://email-solutions-images.pages.dev${path}`;
        if (path.startsWith('/attachments/')) return `https://email-solutions-attachments.pages.dev${path}`;
        if (path.startsWith('/materials/')) return `https://email-solutions-materials.pages.dev${path}`;
        if (path.startsWith('/year-figures/') || path.startsWith('/emails/2025/') || path.startsWith('/style-images/')) return `https://email-solutions-assets.pages.dev${path}`;
        return path;
    },

    async _fetchCFAccounts() {
        try {
            const serverUrl = this._getServerUrl();
            const res = await fetch(`${serverUrl}/api/config/cf-accounts`);
            if (res.ok) {
                const data = await res.json();
                if (data && Array.isArray(data)) {
                    window.__CF_ACCOUNTS_JSON = data;
                    return this._getCFAccount();
                }
            }
        } catch (e) {
            console.error('[CF] Failed to fetch CF accounts from backend:', e);
        }
        return null;
    },

    // ─── CF placeholder (kept here — used by renderMonthTable / renderCalendar) ──
    _renderCFPlaceholder(eventId, title) {
        const escapedTitle = this.escape(title || '');
        return `
        <div class="cf-placeholder" data-event-id="${eventId}" data-title="${escapedTitle}" 
             style="width:100%;height:80px;background:#f8f9fa;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;position:relative;border-bottom:1px solid #eee;"
             onclick="event.stopPropagation(); App.generateCFImage(this)">
            <i class="fas fa-wand-magic-sparkles" style="font-size:20px;color:#0078d4;margin-bottom:4px;"></i>
            <span style="font-size:9px;color:#0078d4;font-weight:600;">Quick Gen</span>
            <button onclick="event.stopPropagation(); App.openManualGenModal('${eventId}', '${escapedTitle}')" style="position:absolute; bottom:2px; right:2px; background:none; border:none; font-size:10px; color:#aaa; cursor:pointer;" title="Manual Generation"><i class="fas fa-cog"></i></button>
            <div class="cf-loading" style="display:none;position:absolute;inset:0;background:rgba(255,255,255,0.8);align-items:center;justify-content:center;z-index:1;">
                <i class="fas fa-circle-notch fa-spin" style="color:#0078d4;"></i>
            </div>
        </div>`;
    },

    // ─── View switching ──────────────────────────────────────────────────────
    setCalendarView(view) {
        this.state.calendar.view = view;

        this.state.calendar.videoTagsFilter = { area: 'all', type: 'all', theme: 'all' };
        const areaEl = document.getElementById('calendar-tag-area');
        const typeEl = document.getElementById('calendar-tag-type');
        const themeEl = document.getElementById('calendar-tag-theme');
        if (areaEl) areaEl.value = 'all';
        if (typeEl) typeEl.value = 'all';
        if (themeEl) themeEl.value = 'all';

        const grid = document.getElementById('calendar-grid');
        if (grid) {
            grid.scrollTop = 0;
            if (view !== 'century') {
                grid.style.overflowY = '';
                grid.style.height = '';
                grid.style.background = '';
                grid.style.padding = '';
                grid.style.border = '';
                grid.style.display = 'grid';
            }
        }

        const previewPanel = document.getElementById('calendar-preview-panel');
        if (previewPanel) previewPanel.style.display = '';
        const calendarMain = document.querySelector('.calendar-main');
        if (calendarMain) calendarMain.style.display = '';

        const btnGroup = document.getElementById('calendar-view-buttons');
        if (btnGroup) {
            btnGroup.querySelectorAll('button').forEach(btn => {
                btn.className = btn.innerText.toLowerCase() === view
                    ? 'btn btn-sm btn-primary'
                    : 'btn btn-sm btn-outline-secondary';
            });
        }

        const isMap = view === 'map';
        const sidebarSearch = document.querySelector('.calendar-sidebar .search-box');
        const sidebarFilters = document.querySelector('.calendar-sidebar #calendar-event-filter')?.closest('.search-box');
        const sidebarMailbox = document.querySelector('.calendar-sidebar .listing.folderlist');
        const sidebarHeader = document.querySelector('.calendar-sidebar .header');

        if (isMap) {
            if (sidebarSearch) sidebarSearch.style.display = 'none';
            if (sidebarFilters) sidebarFilters.style.display = 'none';
            if (sidebarMailbox) sidebarMailbox.style.display = 'none';
            if (sidebarHeader) sidebarHeader.innerText = 'Map Pins';
            this.renderMapPinList();
        } else {
            if (sidebarSearch) sidebarSearch.style.display = 'block';
            if (sidebarFilters) sidebarFilters.style.display = 'block';
            if (sidebarMailbox) sidebarMailbox.style.display = 'block';
            if (sidebarHeader) sidebarHeader.innerText = 'Calendars';
            this.renderCalendarFilters();
        }

        this.renderCalendar();
    },

    searchTagLocation(keyword) {
        if (!keyword || keyword.trim().length === 0) return;

        const query = keyword.toLowerCase().trim();

        const areaRoutes = {
            'africa': 'africa', 'asia': 'asia', 'east asia': 'asia',
            'europe': 'europe', 'west europe': 'europe', 'americas': 'americas', 'latin america': 'americas',
            'middle east': 'middleeast', 'middleeast': 'middleeast',
            'north america': 'northamerica', 'northamerica': 'northamerica',
            'se asia': 'seasia', 'southeast asia': 'seasia', 'seasia': 'seasia'
        };
        if (areaRoutes[query]) { window.location.hash = `#${areaRoutes[query]}`; return; }

        const africaSubregions = {
            'northern africa': 'Northern Africa', 'north africa': 'Northern Africa', 'maghreb': 'Northern Africa',
            'western africa': 'Western Africa', 'west africa': 'Western Africa',
            'middle africa': 'Middle Africa', 'central africa': 'Middle Africa',
            'eastern africa': 'Eastern Africa', 'east africa': 'Eastern Africa',
            'southern africa': 'Southern Africa', 'south africa region': 'Southern Africa'
        };
        if (africaSubregions[query]) {
            window.location.hash = `#calendar?area=Africa&subarea=${encodeURIComponent(africaSubregions[query])}`;
            return;
        }

        const countryToArea = {
            'egypt':        { area: 'Africa',        subarea: 'Northern Africa', country: 'Egypt' },
            'algeria':      { area: 'Africa',        subarea: 'Northern Africa', country: 'Algeria' },
            'morocco':      { area: 'Africa',        subarea: 'Northern Africa', country: 'Morocco' },
            'nigeria':      { area: 'Africa',        subarea: 'Western Africa',  country: 'Nigeria' },
            'kenya':        { area: 'Africa',        subarea: 'Eastern Africa',  country: 'Kenya' },
            'south africa': { area: 'Africa',        subarea: 'Southern Africa', country: 'South Africa' },
            'china':        { area: 'East Asia',     country: 'China' },
            'japan':        { area: 'East Asia',     country: 'Japan' },
            'france':       { area: 'West Europe',   country: 'France' },
            'germany':      { area: 'West Europe',   country: 'Germany' },
            'usa':          { area: 'North America', country: 'USA' },
            'canada':       { area: 'North America', country: 'Canada' },
            'mexico':       { area: 'Latin America', country: 'Mexico' }
        };
        if (countryToArea[query]) {
            const loc = countryToArea[query];
            let hash = `#calendar?area=${encodeURIComponent(loc.area)}`;
            if (loc.subarea) hash += `&subarea=${encodeURIComponent(loc.subarea)}`;
            if (loc.country) hash += `&country=${encodeURIComponent(loc.country)}`;
            window.location.hash = hash;
            return;
        }

        const cityToLocation = {
            'nairobi':  { area: 'Africa',        subarea: 'Eastern Africa',  country: 'Kenya',  city: 'Nairobi'  },
            'cairo':    { area: 'Africa',        subarea: 'Northern Africa', country: 'Egypt',  city: 'Cairo'    },
            'tokyo':    { area: 'East Asia',     country: 'Japan',   city: 'Tokyo'    },
            'beijing':  { area: 'East Asia',     country: 'China',   city: 'Beijing'  },
            'paris':    { area: 'West Europe',   country: 'France',  city: 'Paris'    },
            'london':   { area: 'West Europe',   country: 'UK',      city: 'London'   },
            'new york': { area: 'North America', country: 'USA',     city: 'New York' },
            'toronto':  { area: 'North America', country: 'Canada',  city: 'Toronto'  }
        };
        if (cityToLocation[query]) {
            const loc = cityToLocation[query];
            let hash = `#calendar?area=${encodeURIComponent(loc.area)}`;
            if (loc.subarea) hash += `&subarea=${encodeURIComponent(loc.subarea)}`;
            if (loc.country) hash += `&country=${encodeURIComponent(loc.country)}`;
            if (loc.city) hash += `&city=${encodeURIComponent(loc.city)}`;
            window.location.hash = hash;
            return;
        }

        alert(`No match found for "${keyword}". Try: Africa, Asia, Europe, America, Kenya, Egypt, Japan, etc.`);
    },

    renderCalendarFilters() {
        this.populateVideoTagDropdowns();

        if (this.state.calendar.view === 'map') {
            this.renderMapPinList();
            return;
        }

        const listDiv = document.getElementById('calendar-filter-list');
        if (!listDiv) return;

        const domains = new Set();
        const emails = new Set();
        const groups = new Set();

        this.state.threads.forEach(thread => {
            thread.emails.forEach(email => {
                const eml = this.extractEmail(email.from).toLowerCase();
                const dom = this.getRootDomain(email.from).toLowerCase();
                if (dom.includes('google.com') || dom.includes('googleapis.com') || eml.includes('google')) return;
                const blEmails = (this.state.blacklist.emails || []).map(x => x.toLowerCase().trim());
                const blDomains = (this.state.blacklist.domains || []).map(x => x.toLowerCase().trim());
                if (blEmails.includes(eml) || blDomains.includes(dom)) return;
                domains.add(dom);
                emails.add(eml);
            });
        });

        this.state.contacts.forEach(c => {
            if (c.email && c.email.toLowerCase().includes('google')) return;
            if (c.name && c.name.toLowerCase().includes('google')) return;
            if (c.group) groups.add(c.group);
            if (c.email) emails.add(c.email.toLowerCase());
        });

        const query = this.state.calendar.filterQuery;
        const filterItem = (item) => !query || item.toLowerCase().includes(query);

        const sortedDomains = Array.from(domains).filter(filterItem).sort();
        const sortedGroups = Array.from(groups).filter(filterItem).sort();

        const contactMap = new Map();
        this.state.contacts.forEach(c => {
            if (c.email) contactMap.set(c.email.toLowerCase(), c.name || c.email);
        });

        const sortedEmails = Array.from(emails).filter(eml => {
            if (!query) return true;
            const name = contactMap.get(eml) || eml;
            return eml.includes(query) || name.toLowerCase().includes(query);
        }).sort((a, b) => (contactMap.get(a) || a).localeCompare(contactMap.get(b) || b));

        let html = '<ul class="listing" style="padding:0; margin:0; list-style:none;">';

        if (sortedGroups.length > 0) {
            html += '<li class="divider" style="padding: 5px 15px; background: #f8f9fa; font-size: 11px; font-weight: bold; color: #999;">CONTACT GROUPS</li>';
            sortedGroups.forEach(g => {
                const isSelected = this.state.calendar.selectedFilters.has(`group:${g}`);
                html += `<li style="padding: 8px 15px; border-bottom: 1px solid #eee; display:flex; align-items:center; gap:8px;">
                    <input type="checkbox" id="chk-grp-${g}" ${isSelected ? 'checked' : ''} onclick="App.toggleCalendarFilter('group:${g}')" style="margin:0; cursor:pointer;" />
                    <label for="chk-grp-${g}" style="margin:0; font-weight:normal; cursor:pointer; flex:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width: 170px;">${g.charAt(0).toUpperCase() + g.slice(1)}</label>
                </li>`;
            });
        }

        if (sortedDomains.length > 0) {
            html += '<li class="divider" style="padding: 5px 15px; background: #f8f9fa; font-size: 11px; font-weight: bold; color: #999;">DOMAINS</li>';
            sortedDomains.forEach(d => {
                const isSelected = this.state.calendar.selectedFilters.has(`domain:${d}`);
                html += `<li style="padding: 8px 15px; border-bottom: 1px solid #eee; display:flex; align-items:center; gap:8px;">
                    <input type="checkbox" id="chk-dom-${d}" ${isSelected ? 'checked' : ''} onclick="App.toggleCalendarFilter('domain:${d}')" style="margin:0; cursor:pointer;" />
                    <label for="chk-dom-${d}" style="margin:0; font-weight:normal; cursor:pointer; flex:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width: 170px;">${d}</label>
                </li>`;
            });
        }

        if (sortedEmails.length > 0) {
            html += '<li class="divider" style="padding: 5px 15px; background: #f8f9fa; font-size: 11px; font-weight: bold; color: #999;">CONTACTS</li>';
            sortedEmails.forEach(e => {
                const isSelected = this.state.calendar.selectedFilters.has(`email:${e}`);
                const displayName = contactMap.get(e) || e;
                html += `<li title="${e}" style="padding: 8px 15px; border-bottom: 1px solid #eee; display:flex; align-items:center; gap:8px;">
                    <input type="checkbox" id="chk-eml-${e}" ${isSelected ? 'checked' : ''} onclick="App.toggleCalendarFilter('email:${e}')" style="margin:0; cursor:pointer;" />
                    <label for="chk-eml-${e}" style="margin:0; font-weight:normal; cursor:pointer; flex:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width: 170px;">${displayName}</label>
                </li>`;
            });
        }

        html += '</ul>';
        listDiv.innerHTML = html;
    },

    getCalendarData() {
        const emailEvents = {};

        this.state.threads.forEach(thread => {
            if (this.state.deletedThreadIds.has(thread.id)) return;

            thread.emails.forEach(email => {
                const eml = (this.extractEmail(email.from) || '').toLowerCase().trim();
                const dom = (this.getRootDomain(email.from) || '').toLowerCase().trim();

                if (this.isBlacklisted(email.from)) return;

                if (this.state.calendar.selectedFilters && this.state.calendar.selectedFilters.size > 0) {
                    let matchesFilter = false;
                    if (this.state.calendar.selectedFilters.has(`domain:${dom}`) || this.state.calendar.selectedFilters.has(`email:${eml}`)) {
                        matchesFilter = true;
                    } else {
                        const contact = this.state.contacts.find(c => c.email.toLowerCase() === eml);
                        if (contact && contact.group && this.state.calendar.selectedFilters.has(`group:${contact.group}`)) {
                            matchesFilter = true;
                        }
                    }
                    if (!matchesFilter) return;
                }

                const d = new Date(email.date);
                const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
                if (!emailEvents[key]) emailEvents[key] = { total: 0, domains: {}, customs: [] };

                emailEvents[key].total++;

                const labels = (email.labels || [email.folder || 'inbox']).map(l => (l || '').toLowerCase());
                const type = labels.some(l => l && l.includes('sent')) ? 'sent' : 'received';

                let domain = 'unknown';
                if (type === 'sent') {
                    let toEmail = '';
                    if (Array.isArray(email.to) && email.to[0]) toEmail = email.to[0].email;
                    else if (typeof email.to === 'string') toEmail = email.to;
                    else toEmail = email.to_email || '';
                    domain = this.getRootDomain(toEmail).toLowerCase();
                } else {
                    domain = dom;
                }
                if (!domain) domain = 'unknown';

                if (!emailEvents[key].domains[domain]) emailEvents[key].domains[domain] = { count: 0, type, ids: [] };
                emailEvents[key].domains[domain].count++;
                emailEvents[key].domains[domain].ids.push(email.id);
            });
        });

        const customEvents = window.cloudmailCustomEvents || JSON.parse(localStorage.getItem('cloudmail_events') || '[]');
        const tagFilter = this.state.calendar.videoTagsFilter || { area: 'all', type: 'all', theme: 'all' };

        customEvents.forEach(ev => {
            if (tagFilter.area !== 'all' || tagFilter.type !== 'all' || tagFilter.theme !== 'all') {
                let evTags = ev.tags;
                if (!evTags && ev.description) evTags = this.parseTagsFromDescription(ev.description);
                if (!evTags) return;
                if (tagFilter.area !== 'all' && evTags.area !== tagFilter.area) return;
                if (tagFilter.type !== 'all') {
                    const evType = evTags.type || '';
                    if (tagFilter.type.startsWith('base:')) {
                        const baseMatch = tagFilter.type.slice(5);
                        if (!evType.startsWith(baseMatch)) return;
                    } else {
                        if (evType !== tagFilter.type) return;
                    }
                }
                if (tagFilter.theme !== 'all' && (!evTags.themes || !evTags.themes.includes(tagFilter.theme))) return;
            }

            const parts = ev.date.split('-');
            const key_corrected = `${parseInt(parts[0])}-${parseInt(parts[1]) - 1}-${parseInt(parts[2])}`;
            if (!emailEvents[key_corrected]) emailEvents[key_corrected] = { total: 0, domains: {}, customs: [] };

            let isAllDay = ev.isAllDay;
            if (isAllDay === undefined) {
                const hasTime = ev.title && /\d{1,2}:\d{2}/.test(ev.title);
                isAllDay = ev.isGoogleSync && !hasTime;
            }

            emailEvents[key_corrected].customs.push({
                type: ev.isGoogleSync ? 'google' : 'custom',
                id: ev.id,
                isGoogleSync: ev.isGoogleSync,
                isAllDay: !!isAllDay,
                title: ev.title,
                subject: ev.description,
                attachments: ev.attachments,
                tags: ev.tags,
                artStyles: ev.artStyles,
                musicStyles: ev.musicStyles || (isAllDay ? (window.App?._MS_EVENT_MAP?.[ev.date] || []) : []),
                wikiTags: ev.wikiTags,
                dateStr: ev.date
            });
        });

        return emailEvents;
    },

    renderMonthTable(year, month, calendarData, options = {}) {
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const today = new Date();
        const { isMini = false, eventLimit = 5, visualOnly = false } = options;

        let html = `<table class="calendar-table ${isMini ? 'mini-version' : ''} ${visualOnly ? 'visual-only' : ''}"><thead><tr>`;
        const dayNames = isMini ? ['S', 'M', 'T', 'W', 'T', 'F', 'S'] : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        dayNames.forEach(d => html += `<th>${d}</th>`);
        html += '</tr></thead><tbody><tr>';

        let day = 1;
        for (let i = 0; i < 42; i++) {
            if (i > 0 && i % 7 === 0) {
                if (day > daysInMonth) break;
                html += '</tr><tr>';
            }

            if (i < firstDay || day > daysInMonth) {
                html += '<td class="calendar-day empty"></td>';
            } else {
                const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
                const key = `${year}-${month}-${day}`;
                const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const dayData = calendarData[key] || { total: 0, domains: {}, customs: [] };

                const domains = Object.keys(dayData.domains).map(dom => ({
                    domain: dom, ...dayData.domains[dom]
                })).sort((a, b) => b.count - a.count);

                const customs = dayData.customs || [];
                const displayEvents = [
                    ...customs.map(c => ({ isCustom: true, isGoogleSync: c.isGoogleSync, isAllDay: c.isAllDay, id: c.id, type: c.type, title: c.title || '(No Title)', subject: c.subject || c.description || '', attachments: c.attachments, location: c.location, tags: c.tags, artStyles: c.artStyles, musicStyles: c.musicStyles, dateStr: c.dateStr })),
                    ...domains.map(d => ({ isCustom: false, type: d.type, domain: d.domain, count: d.count, title: d.count > 1 ? `${d.domain} (${d.count})` : d.domain, subject: `Emails from ${d.domain}` }))
                ];

                const countStr = !isMini && dayData.total > 0
                    ? `<span style="font-size:10px; color:#0056b3; font-weight:bold; background:#e6f2ff; padding:2px 5px; border-radius:10px; margin-left:5px;">${dayData.total} emails</span>`
                    : '';

                let tdClick = `App.state.calendar.currentDate = new Date(${year}, ${month}, ${day}); App.setCalendarView('day'); event.stopPropagation();`;
                if (displayEvents.length > 0) {
                    const firstEv = displayEvents[0];
                    if (!firstEv.isCustom) {
                        tdClick = `App.openDomainPreview('${firstEv.domain}', '${key}'); event.stopPropagation();`;
                    } else if (firstEv.isGoogleSync) {
                        tdClick = `App.openCalendarPreview('${firstEv.id}'); event.stopPropagation();`;
                    }
                }

                const holidays = this.getHolidaysForDate ? this.getHolidaysForDate(year, month, day) : [];
                let holidayHtml = '';
                if (holidays.length > 0) {
                    holidayHtml = `<span class="calendar-day-holiday" style="font-size: 10px; color: #d73a49; margin-left: 5px; font-weight: 500;" title="${holidays.map(h => `${h.flag} ${h.name}`).join(', ')}">
                        ${holidays.map(h => h.flag).join('')} ${holidays.map(h => h.name).join(', ')}
                    </span>`;
                }

                html += `<td class="calendar-day ${isToday ? 'today' : ''}" style="${isMini ? 'height: auto; min-height: 80px;' : ''}" onclick="${tdClick}">
                    <div class="calendar-day-header" style="display:flex; justify-content:space-between; align-items:center;">
                        <div style="display:flex; align-items:center; gap:4px;">
                            <span class="calendar-day-number">${day}</span>
                            ${holidayHtml}
                        </div>
                        ${!visualOnly ? countStr : ''}
                    </div>
                    ${displayEvents.slice(0, eventLimit).map(ev => {
                    let clickHandler = '';
                    if (!ev.isCustom) {
                        clickHandler = `onclick="App.openDomainPreview('${ev.domain}', '${key}'); event.stopPropagation();"`;
                    } else if (ev.isGoogleSync) {
                        clickHandler = `onclick="App.openCalendarPreview('${ev.id}'); event.stopPropagation();"`;
                    }

                    const imgResult = this.resolveEventImageUrl(ev, dateKey);
                    const coverImg = this._buildEventCoverHtml(imgResult, ev, dateKey, visualOnly ? '' : 'margin-top: 4px;');

                    if (visualOnly) {
                        if (coverImg) {
                            return coverImg.replace('class="event-cover"', `class="event-cover" ${clickHandler} style="cursor:pointer;" title="${this.escape(ev.subject || '')}"`);
                        }
                        return '';
                    }

                    let tagsHtml = '';
                    if ((ev.artStyles && ev.artStyles.length > 0) || (ev.musicStyles && ev.musicStyles.length > 0) || (ev.wikiTags && ev.wikiTags.main)) {
                        const maxArt = 2;
                        const maxMusic = 1;
                        tagsHtml = `<div style="margin-top: 3px; display: flex; flex-wrap: wrap; gap: 3px;">
                            ${(ev.artStyles || []).slice(0, maxArt).map(a => `<span style="background:#fce7f3; color:#db2777; border: 1px solid #fbcfe8; padding:1px 4px; border-radius:4px; font-size:9px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:80px;" title="${a}">${a}</span>`).join('')}
                            ${(ev.musicStyles || []).slice(0, maxMusic).map(m => `<span onclick="App.setMusicStyleFilter('${m}'); event.stopPropagation();" style="cursor:pointer; background:#e0e7ff; color:#4f46e5; border: 1px solid #c7d2fe; padding:1px 4px; border-radius:4px; font-size:9px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:80px;" title="${m}">${m}</span>`).join('')}
                            ${ev.wikiTags?.main ? `<span onclick="App.setWikiCategoryFilter('main', '${ev.wikiTags.main}'); event.stopPropagation();" style="cursor:pointer; background:#f3f4f6; color:#374151; border: 1px solid #d1d5db; padding:1px 4px; border-radius:4px; font-size:9px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:80px;" title="${ev.wikiTags.main}"><i class="fab fa-wikipedia-w" style="margin-right:2px;font-size:8px;"></i>${ev.wikiTags.main}</span>` : ''}
                        </div>`;
                    }

                    return `<div class="calendar-event-wrapper" ${clickHandler} style="cursor:pointer;">
                            <div class="calendar-event event-${ev.type}" title="${this.escape(ev.title)}\n\n${this.escape(ev.subject)}">
                                ${ev.title}
                                ${tagsHtml}
                            </div>
                            ${coverImg}
                        </div>`;
                }).join('')}
                    ${!visualOnly && displayEvents.length > eventLimit ? `<div class="calendar-event-more" style="font-size:11px; color:#888; text-align:center; padding-top:2px;">+${displayEvents.length - eventLimit} more...</div>` : ''}
                </td>`;
                day++;
            }
        }
        html += '</tr></tbody></table>';
        return html;
    },

    renderCalendar() {
        const grid = document.getElementById('calendar-grid');
        const label = document.getElementById('calendar-range-label');
        if (!grid) return;

        const tf = this.state.calendar.videoTagsFilter || {};
        const locF = this._locationFilter || {};
        const hasTagFilter = (tf.area && tf.area !== 'all') || (tf.type && tf.type !== 'all') || (tf.theme && tf.theme !== 'all')
            || tf.keyword || this._artStyleFilter || this._musicStyleFilter || this._wikiStyleFilter
            || locF.area || locF.country || locF.subArea || locF.province || locF.city;
        if (hasTagFilter) {
            this.renderTagThumbnailView();
            return;
        }

        const previewPanel = document.getElementById('calendar-preview-panel');
        if (previewPanel) previewPanel.style.display = '';
        const calendarMain = document.querySelector('.calendar-main');
        if (calendarMain) calendarMain.style.display = '';

        let savedScrollLeft = 0;
        const oldWeekGrid = grid.querySelector('.calendar-week-grid');
        if (oldWeekGrid) savedScrollLeft = oldWeekGrid.scrollLeft;

        const date = this.state.calendar.currentDate;
        const year = date.getFullYear();
        const month = date.getMonth();
        const view = this.state.calendar.view || 'week';

        if (grid) {
            grid.className = 'calendar-grid';
            grid.style.padding = '';
            grid.style.background = '';
            grid.style.overflowY = '';
            grid.style.height = '';
        }

        const mapContainer = document.getElementById('calendar-map-container');
        if (view === 'map') {
            if (grid) grid.style.display = 'none';
            if (mapContainer) mapContainer.style.display = 'flex';

            const startInput = document.getElementById('map-filter-start');
            const endInput = document.getElementById('map-filter-end');
            if (startInput && endInput) {
                const curDate = this.state.calendar.currentDate;
                const viewDay = new Date(year, month, curDate.getDate());
                const dayOfWeek = viewDay.getDay();
                const startDay = new Date(viewDay);
                startDay.setDate(viewDay.getDate() - dayOfWeek);
                const endDay = new Date(startDay);
                endDay.setDate(startDay.getDate() + 6);
                const toDateStr = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                const weekStart = toDateStr(startDay);
                const weekEnd = toDateStr(endDay);
                if (!startInput.value || startInput.value > weekEnd || endInput.value < weekStart) {
                    startInput.value = weekStart;
                    endInput.value = weekEnd;
                }
            }

            const skipFit = this.state.calendar._isManualClick;
            this.renderMiniCalendar();

            const startStr = document.getElementById('map-filter-start')?.value;
            const endStr = document.getElementById('map-filter-end')?.value;
            this.ensureCalendarDataLoaded(startStr, endStr).then(() => {
                this.renderMap({ skipFitBounds: skipFit });
            });
            delete this.state.calendar._isManualClick;
            return;
        } else if (view === 'year') {
            if (grid) grid.style.display = 'block';
            if (mapContainer) mapContainer.style.display = 'none';
            this.renderYearView();
            return;
        } else if (view === 'century') {
            if (grid) grid.style.display = 'block';
            if (mapContainer) mapContainer.style.display = 'none';
            this.renderCenturyView();
            return;
        } else {
            if (grid) grid.style.display = 'block';
            if (mapContainer) mapContainer.style.display = 'none';
        }

        if (view === 'day') {
            label.innerText = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(date);
        } else if (view === 'week') {
            const weekStart = new Date(year, month, date.getDate() - date.getDay());
            const weekEnd = new Date(year, month, date.getDate() - date.getDay() + 6);
            const m1 = new Intl.DateTimeFormat('en-US', { month: 'short' }).format(weekStart);
            const m2 = new Intl.DateTimeFormat('en-US', { month: 'short' }).format(weekEnd);
            if (weekStart.getMonth() === weekEnd.getMonth()) {
                label.innerHTML = `<span style="font-size:14px; color:#666;">${m1} ${weekStart.getFullYear()}</span><br/><span style="font-size:16px; font-weight:bold;">${weekStart.getDate()} - ${weekEnd.getDate()}</span>`;
            } else {
                label.innerHTML = `<span style="font-size:14px; color:#666;">${m1} ${weekStart.getDate()} - ${m2} ${weekEnd.getDate()}</span><br/><span style="font-size:16px; font-weight:bold;">${weekEnd.getFullYear()}</span>`;
            }
        } else {
            label.innerText = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(date);
        }

        const today = new Date();
        const emailEvents = this.getCalendarData();
        let html = '';

        if (view === 'month') {
            html += this.renderMonthTable(year, month, emailEvents, { eventLimit: 50 });

        } else if (view === 'week') {
            const weekStart = new Date(year, month, date.getDate() - date.getDay());
            const panelActive = document.getElementById('calendar-preview-panel')?.classList.contains('active');

            html += panelActive
                ? `<div class="calendar-week-grid" style="display: flex; overflow-x: auto; gap: 15px; padding: 15px; background: #fff; height: 100%; align-items: start; scroll-snap-type: x mandatory; -webkit-overflow-scrolling: touch; width: 100%; min-width: 0;">`
                : `<div class="calendar-week-grid" style="display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 15px; padding: 15px; background: #fff; height: 100%; overflow-y: auto; align-items: start;">`;

            for (let i = 0; i < 7; i++) {
                const d = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + i);
                const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i];
                const dy = d.getDate(), dm = d.getMonth(), dY = d.getFullYear();
                const isToday = dy === today.getDate() && dm === today.getMonth() && dY === today.getFullYear();
                const key = `${dY}-${dm}-${dy}`;
                const dateKey = `${dY}-${String(dm + 1).padStart(2, '0')}-${String(dy).padStart(2, '0')}`;
                const dayData = emailEvents[key] || { total: 0, domains: {}, customs: [] };

                const domains = Object.keys(dayData.domains).map(dom => ({ domain: dom, ...dayData.domains[dom] })).sort((a, b) => b.count - a.count);
                const customs = dayData.customs || [];
                const displayEvents = [
                    ...customs.map(c => ({ isCustom: true, isGoogleSync: c.isGoogleSync, isAllDay: c.isAllDay, id: c.id, type: c.type, title: c.title || '(No Title)', subject: c.subject || '', attachments: c.attachments, tags: c.tags, artStyles: c.artStyles, musicStyles: c.musicStyles, dateStr: c.dateStr })),
                    ...domains.map(dom => ({ isCustom: false, type: dom.type, domain: dom.domain, count: dom.count, title: dom.count > 1 ? `${dom.domain} (${dom.count})` : dom.domain, subject: `Emails from ${dom.domain}` }))
                ];

                const countStr = dayData.total > 0 ? `<span style="font-size:10px; color:#0056b3; font-weight:bold; background:#e6f2ff; padding:2px 5px; border-radius:10px;">${dayData.total}</span>` : '';
                const dayStyle = panelActive ? `flex: 0 0 calc(33.333% - 15px); width: calc(33.333% - 15px); min-width: 250px; scroll-snap-align: start; overflow: hidden;` : ``;

                const holidays = this.getHolidaysForDate ? this.getHolidaysForDate(dY, dm, dy) : [];
                let holidayHtml = '';
                if (holidays.length > 0) {
                    holidayHtml = `<span class="calendar-day-holiday" style="font-size: 10px; color: #d73a49; margin-left: 5px; font-weight: 500;" title="${holidays.map(h => `${h.flag} ${h.name}`).join(', ')}">
                        ${holidays.map(h => h.flag).join('')} ${holidays.map(h => h.name).join(', ')}
                    </span>`;
                }

                html += `<div class="calendar-day ${isToday ? 'today' : ''}" style="${dayStyle} border: 1px solid #e2e2e2; border-radius: 8px; padding: 10px 10px 20px 10px; background: ${isToday ? '#f8fbff' : '#fff'}; min-height: 200px; display: flex; flex-direction: column; box-shadow: 0 2px 4px rgba(0,0,0,0.02); min-width: 0; overflow: hidden;">
                    <div class="calendar-day-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px;">
                        <div style="display:flex; align-items:center;">
                            <span style="font-weight: bold; font-size: 14px; color: ${isToday ? '#0078d4' : '#333'};">${dayName} ${dm + 1}/${dy}</span>
                            ${holidayHtml}
                        </div>
                        <div style="display:flex; align-items:center;">${countStr}</div>
                    </div>
                    <div style="flex: 1; display: flex; flex-direction: column; gap: 4px;">
                    ${displayEvents.slice(0, 30).map(ev => {
                    let clickHandler = '';
                    if (!ev.isCustom) clickHandler = `onclick="App.openDomainPreview('${ev.domain}', '${key}')" style="cursor:pointer;"`;
                    else if (ev.isGoogleSync) clickHandler = `onclick="App.openCalendarPreview('${ev.id}')" style="cursor:pointer;"`;
                    const imgResult = this.resolveEventImageUrl(ev, dateKey);
                    const coverImg = this._buildEventCoverHtml(imgResult, ev, dateKey, 'margin-top: 4px;');
                    
                    let tagsHtml = '';
                    if ((ev.artStyles && ev.artStyles.length > 0) || (ev.musicStyles && ev.musicStyles.length > 0) || (ev.wikiTags && ev.wikiTags.main)) {
                        const maxArt = 2;
                        const maxMusic = 1;
                        tagsHtml = `<div style="margin-top: 3px; display: flex; flex-wrap: wrap; gap: 3px;">
                            ${(ev.artStyles || []).slice(0, maxArt).map(a => `<span style="background:#fce7f3; color:#db2777; border: 1px solid #fbcfe8; padding:1px 4px; border-radius:4px; font-size:9px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:80px;" title="${a}">${a}</span>`).join('')}
                            ${(ev.musicStyles || []).slice(0, maxMusic).map(m => `<span onclick="App.setMusicStyleFilter('${m}'); event.stopPropagation();" style="cursor:pointer; background:#e0e7ff; color:#4f46e5; border: 1px solid #c7d2fe; padding:1px 4px; border-radius:4px; font-size:9px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:80px;" title="${m}">${m}</span>`).join('')}
                            ${ev.wikiTags?.main ? `<span onclick="App.setWikiCategoryFilter('main', '${ev.wikiTags.main}'); event.stopPropagation();" style="cursor:pointer; background:#f3f4f6; color:#374151; border: 1px solid #d1d5db; padding:1px 4px; border-radius:4px; font-size:9px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:80px;" title="${ev.wikiTags.main}"><i class="fab fa-wikipedia-w" style="margin-right:2px;font-size:8px;"></i>${ev.wikiTags.main}</span>` : ''}
                        </div>`;
                    }
                    
                    return `<div class="calendar-event-wrapper" ${clickHandler}>
                        <div class="calendar-event event-${ev.type}" style="font-size: 11px; padding: 4px 8px; margin-bottom: 2px;" title="${this.escape(ev.subject)}">
                            ${this.escape(ev.title)}
                            ${tagsHtml}
                        </div>
                        ${coverImg}
                    </div>`;
                }).join('')}
                    ${displayEvents.length > 30 ? `<div class="calendar-event-more" style="font-size:10px; color:#888; text-align:center; padding-top:4px;">+${displayEvents.length - 30} more...</div>` : ''}
                    </div>
                </div>`;
            }
            html += '</div>';

        } else if (view === 'day') {
            const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            const key = `${year}-${month}-${date.getDate()}`;
            const dayData = emailEvents[key] || { total: 0, domains: {}, customs: [] };
            const domains = Object.keys(dayData.domains).map(dom => ({ domain: dom, ...dayData.domains[dom] })).sort((a, b) => b.count - a.count);
            const customs = dayData.customs || [];
            const displayEvents = [
                ...customs.map(c => ({ isCustom: true, isGoogleSync: c.isGoogleSync, isAllDay: c.isAllDay, id: c.id, type: c.type, title: c.title || '(No Title)', subject: c.subject || '', attachments: c.attachments, tags: c.tags, artStyles: c.artStyles, musicStyles: c.musicStyles, dateStr: c.dateStr })),
                ...domains.map(dom => ({ isCustom: false, type: dom.type, domain: dom.domain, count: dom.count, title: dom.count > 1 ? `${dom.domain} (${dom.count}) emails` : dom.domain, subject: `Emails from ${dom.domain}` }))
            ];

            const holidays = this.getHolidaysForDate ? this.getHolidaysForDate(year, month, date.getDate()) : [];
            let holidayHeaderHtml = '';
            if (holidays.length > 0) {
                holidayHeaderHtml = `<div style="margin-bottom: 15px; display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
                    ${holidays.map(h => `<span style="background: #fef2f2; color: #dc2626; border: 1px solid #fee2e2; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; display: inline-flex; align-items: center; gap: 4px;">${h.flag} ${h.name} (${h.country})</span>`).join('')}
                </div>`;
            }

            html += `<div style="padding: 20px; height: 100%; overflow-y: auto; background: #fff;">
                <h3 style="margin-top: 0; margin-bottom: 20px; color: #333; border-bottom: 1px solid #eee; padding-bottom: 15px;">${new Date(year, month, date.getDate()).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</h3>
                ${holidayHeaderHtml}
                <div style="display: flex; flex-direction: column; gap: 10px;">`;

            if (displayEvents.length === 0) {
                html += `<div style="color: #888; padding: 40px 20px; text-align: center; border: 1px dashed #ccc; border-radius: 8px; background: #fafafa;">No events or emails on this day.</div>`;
            } else {
                html += displayEvents.map(ev => {
                    let clickHandler = '';
                    if (!ev.isCustom) clickHandler = `onclick="App.openDomainPreview('${ev.domain}', '${key}')" style="cursor:pointer;"`;
                    else if (ev.isGoogleSync) clickHandler = `onclick="App.openCalendarPreview('${ev.id}')" style="cursor:pointer;"`;
                    const imgResult = this.resolveEventImageUrl(ev, dateKey);
                    const coverImg = this._buildEventCoverHtml(imgResult, ev, dateKey);
                    let tagsHtml = '';
                    if ((ev.artStyles && ev.artStyles.length > 0) || (ev.musicStyles && ev.musicStyles.length > 0) || (ev.wikiTags && ev.wikiTags.main)) {
                        tagsHtml = `<div style="margin-top: 6px; display: flex; flex-wrap: wrap; gap: 4px;">
                            ${(ev.artStyles || []).map(a => `<span style="background:#fce7f3; color:#db2777; border: 1px solid #fbcfe8; padding:2px 6px; border-radius:4px; font-size:10px; font-weight:bold;" title="${a}">${a}</span>`).join('')}
                            ${(ev.musicStyles || []).map(m => `<span onclick="App.setMusicStyleFilter('${m}'); event.stopPropagation();" style="cursor:pointer; background:#e0e7ff; color:#4f46e5; border: 1px solid #c7d2fe; padding:2px 6px; border-radius:4px; font-size:10px; font-weight:bold;" title="${m}">${m}</span>`).join('')}
                            ${ev.wikiTags?.main ? `<span onclick="App.setWikiCategoryFilter('main', '${ev.wikiTags.main}'); event.stopPropagation();" style="cursor:pointer; background:#f3f4f6; color:#374151; border: 1px solid #d1d5db; padding:2px 6px; border-radius:4px; font-size:10px; font-weight:bold;" title="${ev.wikiTags.main}"><i class="fab fa-wikipedia-w" style="margin-right:2px;"></i>${ev.wikiTags.main}</span>` : ''}
                        </div>`;
                    }

                    return `<div class="calendar-event event-${ev.type}" title="${this.escape(ev.subject)}" ${clickHandler} style="padding: 15px; font-size: 14px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin: 0; display: flex; align-items: center; justify-content: space-between;">
                        <div><strong style="display: block; margin-bottom: 4px;">${this.escape(ev.title)}</strong>
                        <span style="font-size: 12px; color: #666;">${ev.isCustom ? this.escape(ev.subject) : (ev.type === 'sent' ? 'Sent emails' : 'Received emails')}</span>
                        ${tagsHtml}
                        ${coverImg}</div>
                        ${!ev.isCustom ? '<i class="fas fa-chevron-right" style="color:#ccc; font-size: 12px;"></i>' : ''}
                    </div>`;
                }).join('');
            }
            html += `</div></div>`;

        } else if (view === 'agenda') {
            html += `<div style="padding: 20px; height: 100%; overflow-y: auto; background: #fff;"><h3 style="margin-top: 0; margin-bottom: 30px; color: #333;">Upcoming Agenda</h3><div style="display: flex; flex-direction: column; gap: 20px;">`;
            let daysWithEvents = 0;
            const agendaDate = new Date(year, month, date.getDate());

            for (let i = 0; i < 60; i++) {
                const d = new Date(agendaDate.getFullYear(), agendaDate.getMonth(), agendaDate.getDate() + i);
                const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
                const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                const dayData = emailEvents[key];
                if (!dayData || (dayData.total === 0 && !(dayData.customs && dayData.customs.length > 0))) continue;

                daysWithEvents++;
                const domains = Object.keys(dayData.domains).map(dom => ({ domain: dom, ...dayData.domains[dom] })).sort((a, b) => b.count - a.count);
                const customs = dayData.customs || [];
                const displayEvents = [
                    ...customs.map(c => ({ isCustom: true, isGoogleSync: c.isGoogleSync, isAllDay: c.isAllDay, id: c.id, type: c.type, title: c.title || '(No Title)', subject: c.subject || '', attachments: c.attachments, tags: c.tags, artStyles: c.artStyles, musicStyles: c.musicStyles, dateStr: c.dateStr })),
                    ...domains.map(dom => ({ isCustom: false, type: dom.type, domain: dom.domain, count: dom.count, title: dom.count > 1 ? `${dom.domain} (${dom.count})` : dom.domain, subject: `Emails from ${dom.domain}` }))
                ];

                html += `<div style="display: flex; gap: 20px; border-bottom: 1px solid #f0f0f0; padding-bottom: 15px;">
                    <div style="min-width: 90px; padding-top: 5px;"><div style="font-weight: bold; color: #333; font-size: 16px;">${d.getDate()} ${d.toLocaleString(undefined, { month: 'short' })}</div><div style="color: #888; font-size: 12px; margin-top: 2px;">${d.toLocaleString(undefined, { weekday: 'long' })}</div></div>
                    <div style="flex: 1; border-left: 2px solid ${d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear() ? '#007bff' : '#eee'}; padding-left: 15px; display: flex; flex-direction: column; gap: 8px;">
                        ${displayEvents.map(ev => {
                    let clickHandler = '';
                    if (!ev.isCustom) clickHandler = `onclick="App.openDomainPreview('${ev.domain}', '${key}')" style="cursor:pointer;"`;
                    else if (ev.isGoogleSync) clickHandler = `onclick="App.openCalendarPreview('${ev.id}')" style="cursor:pointer;"`;
                    
                    let tagsHtml = '';
                    if ((ev.artStyles && ev.artStyles.length > 0) || (ev.musicStyles && ev.musicStyles.length > 0) || (ev.wikiTags && ev.wikiTags.main)) {
                        tagsHtml = `<div style="margin-top: 4px; display: flex; flex-wrap: wrap; gap: 4px;">
                            ${(ev.artStyles || []).map(a => `<span style="background:#fce7f3; color:#db2777; border: 1px solid #fbcfe8; padding:2px 5px; border-radius:4px; font-size:10px; font-weight:bold;" title="${a}">${a}</span>`).join('')}
                            ${(ev.musicStyles || []).map(m => `<span onclick="App.setMusicStyleFilter('${m}'); event.stopPropagation();" style="cursor:pointer; background:#e0e7ff; color:#4f46e5; border: 1px solid #c7d2fe; padding:2px 5px; border-radius:4px; font-size:10px; font-weight:bold;" title="${m}">${m}</span>`).join('')}
                            ${ev.wikiTags?.main ? `<span onclick="App.setWikiCategoryFilter('main', '${ev.wikiTags.main}'); event.stopPropagation();" style="cursor:pointer; background:#f3f4f6; color:#374151; border: 1px solid #d1d5db; padding:2px 5px; border-radius:4px; font-size:10px; font-weight:bold;" title="${ev.wikiTags.main}"><i class="fab fa-wikipedia-w" style="margin-right:2px;"></i>${ev.wikiTags.main}</span>` : ''}
                        </div>`;
                    }
                    
                    return `<div class="calendar-event event-${ev.type}" title="${this.escape(ev.subject)}" ${clickHandler} style="padding: 8px 12px; font-size: 13px; margin: 0; display: inline-block;">
                        ${this.escape(ev.title)}
                        ${tagsHtml}
                    </div>`;
                }).join('')}
                    </div>
                </div>`;
            }
            if (daysWithEvents === 0) html += `<div style="color: #888; padding: 40px 20px; text-align: center; border: 1px dashed #ccc; border-radius: 8px;">No upcoming events in the next 60 days.</div>`;
            html += `</div></div>`;
        }

        grid.innerHTML = html;

        if (view === 'week') {
            const newWeekGrid = grid.querySelector('.calendar-week-grid');
            if (newWeekGrid) {
                if (this.state.calendar.targetDayOfWeek !== undefined) {
                    const dayWidth = newWeekGrid.scrollWidth / 7;
                    newWeekGrid.scrollLeft = this.state.calendar.targetDayOfWeek * dayWidth;
                    delete this.state.calendar.targetDayOfWeek;
                } else if (savedScrollLeft > 0) {
                    newWeekGrid.scrollLeft = savedScrollLeft;
                }
            }
        }

        this.renderMiniCalendar();
    },

    renderMiniCalendar() {
        const container = document.getElementById('mini-calendar');
        if (!container) return;

        const date = this.state.calendar.currentDate;
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const today = new Date();
        const isMapView = this.state.calendar.view === 'map';
        const selectedDates = this.state.calendar.selectedMapDates;
        const hasMultisel = isMapView && selectedDates && selectedDates.size > 1;

        let html = `<div style="display:flex; justify-content:space-between; align-items:center; font-weight:bold; margin-bottom:5px; font-size:12px; padding: 0 2px;">
            <i class="fas fa-chevron-left" style="cursor:pointer; padding:4px;" onclick="App.prevMonth()"></i>
            <span style="font-size:11px; ${isMapView ? 'cursor:pointer; text-decoration:underline;' : ''}" ${isMapView ? `onclick="App.selectMonthInMiniCalendar(event, ${year}, ${month})" title="Select all days in month"` : ''}>
                ${new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(date)}
            </span>
            <i class="fas fa-chevron-right" style="cursor:pointer; padding:4px;" onclick="App.nextMonth()"></i>
        </div>`;
        html += '<table class="mini-calendar-table"><thead><tr>';

        if (isMapView) html += `<th style="width: 15px; cursor:default; color:#ccc;" title="Week Number">W</th>`;

        ['S', 'M', 'T', 'W', 'T', 'F', 'S'].forEach((d, idx) => {
            html += isMapView
                ? `<th style="cursor:pointer; color:#1a73e8;" onclick="App.selectWeekdayInMiniCalendar(event, ${year}, ${month}, ${idx})" title="Select all ${d}">${d}</th>`
                : `<th>${d}</th>`;
        });
        html += '</tr></thead><tbody><tr>';

        let day = 1, weekStartIndex = 0, weekNum = 1;
        if (isMapView) html += `<td style="cursor:pointer;" onclick="App.selectWeekInMiniCalendar(event, ${year}, ${month}, ${weekStartIndex})" title="Select Week ${weekNum}"><span style="color:#aaa; font-weight:bold; font-size:9px;">${weekNum}</span></td>`;

        for (let i = 0; i < 42; i++) {
            if (i > 0 && i % 7 === 0) {
                if (day > daysInMonth) break;
                html += '</tr><tr>';
                weekStartIndex = i;
                weekNum++;
                if (isMapView) html += `<td style="cursor:pointer;" onclick="App.selectWeekInMiniCalendar(event, ${year}, ${month}, ${weekStartIndex})" title="Select Week ${weekNum}"><span style="color:#aaa; font-weight:bold; font-size:9px;">${weekNum}</span></td>`;
            }

            if (i < firstDay || day > daysInMonth) {
                html += '<td><span></span></td>';
            } else {
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
                let isSelected = isMapView && selectedDates?.size > 0 ? selectedDates.has(dateStr) : (!isMapView && day === date.getDate());
                const tdClass = isSelected ? (hasMultisel ? 'multi-selected' : 'selected') : (isToday ? 'today' : '');
                html += `<td class="${tdClass}" onclick="App.handleMiniCalendarClick(${year}, ${month}, ${day}, event)" title="${dateStr}"><span>${day}</span></td>`;
                day++;
            }
        }
        html += '</tr></tbody></table>';

        if (isMapView) {
            const selCount = selectedDates ? selectedDates.size : 0;
            const hasSelected = selCount > 0;
            const tipText = hasSelected ? `${selCount} date${selCount > 1 ? 's' : ''} selected` : 'Ctrl+Click multi-select';
            let tipHtml = `<div class="mini-calendar-map-tip" style="display:flex;justify-content:space-between;align-items:center;"><span>🗺️ ${tipText}</span>`;
            if (hasSelected) tipHtml += `<button onclick="App.state.calendar.selectedMapDates.clear(); App.renderMiniCalendar(); App.renderMap();" style="border:none;background:#e63946;color:white;border-radius:3px;padding:2px 6px;font-size:9px;cursor:pointer;">Reset</button>`;
            tipHtml += `</div>`;
            html += tipHtml;
        }

        container.innerHTML = html;
    },

    handleMiniCalendarClick(year, month, day, event) {
        if (this.state.calendar.view === 'map') {
            if (!this.state.calendar.selectedMapDates) this.state.calendar.selectedMapDates = new Set();
            const clickedDate = new Date(year, month, day);
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

            if (event.ctrlKey || event.metaKey) {
                if (this.state.calendar.selectedMapDates.has(dateStr)) this.state.calendar.selectedMapDates.delete(dateStr);
                else this.state.calendar.selectedMapDates.add(dateStr);
                this.state.calendar.lastSelectedMapDate = clickedDate;
            } else if (event.shiftKey && this.state.calendar.lastSelectedMapDate) {
                const startDate = new Date(this.state.calendar.lastSelectedMapDate);
                const endDate = clickedDate;
                if (startDate > endDate) { const t = new Date(startDate); startDate.setTime(endDate.getTime()); endDate.setTime(t.getTime()); }
                const current = new Date(startDate);
                while (current <= endDate) {
                    this.state.calendar.selectedMapDates.add(`${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`);
                    current.setDate(current.getDate() + 1);
                }
            } else {
                if (this.state.calendar.selectedMapDates.has(dateStr)) this.state.calendar.selectedMapDates.delete(dateStr);
                else this.state.calendar.selectedMapDates.add(dateStr);
                this.state.calendar.lastSelectedMapDate = clickedDate;
            }

            this.renderMiniCalendar();
            this.renderMap();
            if (!event.ctrlKey && !event.metaKey && !event.shiftKey) document.querySelector('.calendar-sidebar')?.classList.remove('active');
        } else {
            this.setCalendarDate(day);
            document.querySelector('.calendar-sidebar')?.classList.remove('active');
        }
    },

    selectMonthInMiniCalendar(event, year, month) {
        if (this.state.calendar.view !== 'map') return;
        if (!this.state.calendar.selectedMapDates) this.state.calendar.selectedMapDates = new Set();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const monthDates = Array.from({ length: daysInMonth }, (_, i) => `${year}-${String(month + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`);
        const allSelected = monthDates.every(d => this.state.calendar.selectedMapDates.has(d));
        const noMod = !event.ctrlKey && !event.shiftKey && !event.metaKey;
        if (noMod) this.state.calendar.selectedMapDates.clear();
        if (allSelected && !noMod) monthDates.forEach(d => this.state.calendar.selectedMapDates.delete(d));
        else if (!allSelected) monthDates.forEach(d => this.state.calendar.selectedMapDates.add(d));
        this.syncSelectedDatesToPeriodInputs();
        this.renderMiniCalendar();
        this.renderMap();
    },

    selectWeekdayInMiniCalendar(event, year, month, weekdayIndex) {
        if (this.state.calendar.view !== 'map') return;
        if (!this.state.calendar.selectedMapDates) this.state.calendar.selectedMapDates = new Set();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay();
        const weekdayDates = [];
        for (let day = 1; day <= daysInMonth; day++) {
            if ((firstDay + day - 1) % 7 === weekdayIndex) weekdayDates.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
        }
        const allSelected = weekdayDates.every(d => this.state.calendar.selectedMapDates.has(d));
        const noMod = !event.ctrlKey && !event.shiftKey && !event.metaKey;
        if (noMod) this.state.calendar.selectedMapDates.clear();
        if (allSelected && !noMod) weekdayDates.forEach(d => this.state.calendar.selectedMapDates.delete(d));
        else if (!allSelected) weekdayDates.forEach(d => this.state.calendar.selectedMapDates.add(d));
        this.syncSelectedDatesToPeriodInputs();
        this.renderMiniCalendar();
        this.renderMap();
    },

    selectWeekInMiniCalendar(event, year, month, weekStartIndex) {
        if (this.state.calendar.view !== 'map') return;
        if (!this.state.calendar.selectedMapDates) this.state.calendar.selectedMapDates = new Set();
        const firstDay = new Date(year, month, 1).getDay();
        const weekDates = [];
        for (let i = weekStartIndex; i < weekStartIndex + 7; i++) {
            const d = new Date(year, month, i - firstDay + 1);
            weekDates.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
        }
        const allSelected = weekDates.every(d => this.state.calendar.selectedMapDates.has(d));
        const noMod = !event.ctrlKey && !event.shiftKey && !event.metaKey;
        if (noMod) this.state.calendar.selectedMapDates.clear();
        if (allSelected && !noMod) weekDates.forEach(d => this.state.calendar.selectedMapDates.delete(d));
        else if (!allSelected) weekDates.forEach(d => this.state.calendar.selectedMapDates.add(d));
        this.syncSelectedDatesToPeriodInputs();
        this.renderMiniCalendar();
        this.renderMap();
    },

    syncSelectedDatesToPeriodInputs() {
        if (!this.state.calendar.selectedMapDates || this.state.calendar.selectedMapDates.size === 0) return;
        const dates = Array.from(this.state.calendar.selectedMapDates).sort();
        const startInput = document.getElementById('map-filter-start');
        const endInput = document.getElementById('map-filter-end');
        if (startInput) startInput.value = dates[0];
        if (endInput) endInput.value = dates[dates.length - 1];
    },

    updateCalendarUrl() {
        const view = this.state.calendar.view;
        if (view === 'map') {
            if (window.location.hash !== '#map') window.history.pushState(null, null, '#map');
            return;
        }
        const date = this.state.calendar.currentDate;
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const dayStr = String(date.getDate()).padStart(2, '0');

        const currentHashParts = window.location.hash.split('?');
        const currentParams = new URLSearchParams(currentHashParts[1] || '');
        currentParams.set('date', `${year}-${month}-${dayStr}`);
        if (view && view !== 'map') currentParams.set('view', view);

        const hashStr = `#calendar?${currentParams.toString()}`;
        if (window.location.hash !== hashStr) window.history.pushState(null, null, hashStr);
    },

    prevMonth() {
        const view = this.state.calendar.view || 'month';
        if (view === 'week')    this.state.calendar.currentDate.setDate(this.state.calendar.currentDate.getDate() - 7);
        else if (view === 'day')    this.state.calendar.currentDate.setDate(this.state.calendar.currentDate.getDate() - 1);
        else if (view === 'year')   this.state.calendar.currentDate.setFullYear(this.state.calendar.currentDate.getFullYear() - 1);
        else if (view === 'century') this.state.calendar.currentDate.setFullYear(this.state.calendar.currentDate.getFullYear() - 100);
        else this.state.calendar.currentDate.setMonth(this.state.calendar.currentDate.getMonth() - 1);

        const y = this.state.calendar.currentDate.getFullYear();
        const m = this.state.calendar.currentDate.getMonth();
        this.fetchCalendarMonth(y, m);
        this.fetchCalendarMonth(y, m - 1);

        if (this.state.calendar.view === 'map' && this.state.calendar.selectedMapDates) this.state.calendar.selectedMapDates.clear();
        this.renderCalendar();
        this.updateCalendarUrl();
    },

    nextMonth() {
        const view = this.state.calendar.view || 'month';
        if (view === 'week')    this.state.calendar.currentDate.setDate(this.state.calendar.currentDate.getDate() + 7);
        else if (view === 'day')    this.state.calendar.currentDate.setDate(this.state.calendar.currentDate.getDate() + 1);
        else if (view === 'year')   this.state.calendar.currentDate.setFullYear(this.state.calendar.currentDate.getFullYear() + 1);
        else if (view === 'century') this.state.calendar.currentDate.setFullYear(this.state.calendar.currentDate.getFullYear() + 100);
        else this.state.calendar.currentDate.setMonth(this.state.calendar.currentDate.getMonth() + 1);

        const y = this.state.calendar.currentDate.getFullYear();
        const m = this.state.calendar.currentDate.getMonth();
        this.fetchCalendarMonth(y, m);
        this.fetchCalendarMonth(y, m + 1);

        if (this.state.calendar.view === 'map' && this.state.calendar.selectedMapDates) this.state.calendar.selectedMapDates.clear();
        this.renderCalendar();
        this.updateCalendarUrl();
    },

    goToday() {
        this.state.calendar._isManualClick = true;
        this.state.calendar.currentDate = new Date();
        this.renderCalendar();
        this.updateCalendarUrl();
        if (this.state.calendar.view === 'map') this.focusMapOnDate(this.state.calendar.currentDate);
        else if (this.state.calendar.view === 'year') setTimeout(() => this.scrollToTodayInYearView(), 100);
    },

    setCalendarDate(day) {
        this.state.calendar._isManualClick = true;
        this.state.calendar.currentDate.setDate(day);
        this.renderCalendar();
        this.updateCalendarUrl();
        if (this.state.calendar.view === 'map') this.focusMapOnDate(this.state.calendar.currentDate);
    },

    focusMapOnDate(date) {
        if (!this.state.calendar.map) return;
        const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        const event = (window.cloudmailLatestEvents?.items || []).find(ev => {
            const evDate = ev.start.date || (ev.start.dateTime ? ev.start.dateTime.split('T')[0] : '');
            return evDate === dateStr && ev.extendedProperties?.private?.lat !== undefined;
        });
        if (event) this.focusMapOnEvent(event);
    },

    focusMapOnEvent(event) {
        const lat = event.extendedProperties.private.lat;
        const lng = event.extendedProperties.private.lng;
        if (lat === undefined || lng === undefined) return;
        this.state.calendar.map.flyTo({ center: [lng, lat], zoom: 12, essential: true });
        if (this.state.calendar.markers) {
            const marker = this.state.calendar.markers.find(m => {
                const pos = m.getLngLat();
                return Math.abs(pos.lng - lng) < 0.0001 && Math.abs(pos.lat - lat) < 0.0001;
            });
            if (marker) marker.togglePopup();
        }
    },

    indexEventsByDate() {
        const items = window.cloudmailLatestEvents?.items || [];
        const gItems = window.googleEventsOutput?.items || [];
        const nItems = window.newGoogleEvents?.items || [];

        if (this.state.calendar.indexedEvents && Object.keys(this.state.calendar.indexedEvents).length > 0) {
            if ((gItems.length > 0 && !this.state.calendar.indexedGoogleEvents) || (nItems.length > 0 && !this.state.calendar.indexedNewEvents)) {
                // proceed
            } else { return; }
        }

        if (items.length === 0 && gItems.length === 0 && nItems.length === 0) { console.log('No events to index.'); return; }

        console.log('Indexing events:', items.length, 'main,', gItems.length, 'google,', nItems.length, 'new');
        const events = {};
        const addItems = (arr, prepend = false) => arr.forEach(item => {
            const date = (item.start?.date || item.start?.dateTime || '').split('T')[0];
            if (!date) return;
            if (!events[date]) events[date] = [];
            prepend ? events[date].unshift(item) : events[date].push(item);
        });
        addItems(items);
        addItems(gItems, true);
        addItems(nItems, true);

        this.state.calendar.indexedEvents = events;
        if (gItems.length > 0) this.state.calendar.indexedGoogleEvents = true;
        if (nItems.length > 0) this.state.calendar.indexedNewEvents = true;
    },

    getDateCoverImage(dateKey) {
        this.indexEventsByDate();
        if (!this.state.calendar.indexedEvents) return null;

        const events = this.state.calendar.indexedEvents[dateKey] || [];
        for (const ev of events) {
            const attachments = ev.attachments || [];
            let att = attachments.find(a => a.mimeType?.startsWith('image/') && a.title === 'cover.png')
                || attachments.find(a => a.mimeType?.startsWith('image/') && a.title?.toLowerCase().endsWith('.png'))
                || attachments.find(a => a.mimeType?.startsWith('image/'));
            if (!att) att = attachments.find(a => a.title?.includes('Generated Image') || a.title?.includes('Daily History'));

            if (att) {
                if (att.localUrl) return this._getAssetUrl(att.localUrl);
                if (att.fileId) return this._getAssetUrl(`/images/calendar/${att.fileId}.jpg`);
                return this.getDirectDriveUrl(att.fileUrl || '');
            }

            if (ev.description && ev.description.includes('--- Attachments ---')) {
                let coverUrl = null, fallbackImageUrl = null, foundSection = false;
                for (const line of ev.description.split('\n')) {
                    if (line.includes('--- Attachments ---')) { foundSection = true; continue; }
                    if (foundSection) {
                        const match = line.match(/^\s*-\s*([^:]+):\s*(https?:\/\/[^\s]+)/);
                        if (match) {
                            const title = match[1].trim(), url = match[2].trim();
                            if (title === 'cover.png') { coverUrl = url; break; }
                            else if (!fallbackImageUrl) fallbackImageUrl = url;
                        }
                    }
                }
                const finalUrl = coverUrl || fallbackImageUrl;
                if (finalUrl) return this.getDirectDriveUrl(finalUrl);
            }
        }
        return null;
    },

    addYear(year, position = 'bottom') {
        const grid = document.getElementById('calendar-grid');
        const container = grid?.querySelector('.year-view-container');
        if (!grid || !container) return;

        if (!this.state.calendar.renderedYears) this.state.calendar.renderedYears = new Set();
        if (this.state.calendar.renderedYears.has(year)) return;
        this.state.calendar.renderedYears.add(year);

        const calendarData = this.getCalendarData();
        const zodiacThemes = [
            { name: 'Capricorn',     cnName: '♑ 魔羯座', colors: ['#4A4A4A', '#5E503F'], icon: '♑' },
            { name: 'Aquarius',      cnName: '♒ 水瓶座', colors: ['#3DA5D9', '#7EC8E3'], icon: '♒' },
            { name: 'Pisces',        cnName: '♓ 雙魚座', colors: ['#7ED6D9', '#C5A3FF'], icon: '♓' },
            { name: 'Aries',         cnName: '♈ 牡羊座', colors: ['#E63946', '#FF7F51'], icon: '♈' },
            { name: 'Taurus',        cnName: '♉ 金牛座', colors: ['#8FBF73', '#CFC28A'], icon: '♉' },
            { name: 'Gemini',        cnName: '♊ 雙子座', colors: ['#F1C40F', '#BDC3C7'], icon: '♊' },
            { name: 'Cancer',        cnName: '♋ 巨蟹座', colors: ['#A7C6ED', '#D6EAF8'], icon: '♋' },
            { name: 'Leo',           cnName: '♌ 獅子座', colors: ['#F4A300', '#D97706'], icon: '♌' },
            { name: 'Virgo',         cnName: '♍ 處女座', colors: ['#E5E5D0', '#D4C9A9'], icon: '♍' },
            { name: 'Libra',         cnName: '♎ 天秤座', colors: ['#F8D7DA', '#A1C9EA'], icon: '♎' },
            { name: 'Scorpio',       cnName: '♏ 天蠍座', colors: ['#2C1A47', '#7B1E3A'], icon: '♏' },
            { name: 'Sagittarius',   cnName: '♐ 射手座', colors: ['#7A3E9D', '#A56CC1'], icon: '♐' }
        ];
        const getYearZodiac = (y) => {
            const animals = ["Rat","Ox","Tiger","Rabbit","Dragon","Snake","Horse","Goat","Monkey","Rooster","Dog","Pig"];
            const icons   = ["🐀","🐂","🐅","🐇","🐉","🐍","🐎","🐐","🐒","🐓","🐕","🐖"];
            const idx = (Math.abs(y - 4)) % 12;
            return { animal: animals[idx], icon: icons[idx] };
        };

        const yearZodiac = getYearZodiac(year);
        const yearGroup = document.createElement('div');
        yearGroup.className = 'year-group';
        yearGroup.id = `year-group-${year}`;
        yearGroup.dataset.year = year;

        let html = `<div class="year-banner-modern lazy-bg" data-bg="/year-figures/${year}.png" style="background-color: #1e293b; background-image: linear-gradient(135deg, #1e293b, #334155)">
            <div class="year-banner-content"><h1>${year}</h1><div class="year-zodiac-badge"><span>${yearZodiac.icon}</span><span>${yearZodiac.animal} Year</span></div></div>
        </div>
        <div class="calendar-year-grid-modern">`;

        for (let m = 0; m < 12; m++) {
            const mDate = new Date(year, m, 1);
            const monthName = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(mDate);
            const theme = zodiacThemes[m];
            const daysInMonth = new Date(year, m + 1, 0).getDate();
            const gradient = `linear-gradient(135deg, ${theme.colors[0]}, ${theme.colors[1]})`;

            let monthCover = null, monthEventId = null;
            for (let d = 1; d <= daysInMonth; d++) {
                const dk = `${year}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                const key = `${year}-${m}-${d}`;
                const dayData = calendarData[key];
                if (dayData?.customs) {
                    const googleEvent = dayData.customs.find(c => c.isGoogleSync && c.attachments?.length > 0);
                    if (googleEvent) {
                        const imgResult = this.resolveEventImageUrl(googleEvent, dk);
                        if (imgResult) { monthCover = imgResult.fileUrl; monthEventId = googleEvent.id; break; }
                    }
                }
            }

            const headerStylePre = `background: ${gradient}`;
            const headerDataBg = monthCover ? `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.5)), url('${monthCover}')` : '';
            const headerOnClick = monthEventId
                ? `App.openCalendarPreview('${monthEventId}'); event.stopPropagation();`
                : `App.state.calendar.currentDate.setFullYear(${year}); App.state.calendar.currentDate.setMonth(${m}); App.setCalendarView('month')`;

            html += `<div class="month-card-modern">
                <div class="month-card-header lazy-bg" style="${headerStylePre}; cursor:pointer;" ${headerDataBg ? `data-bg-url="${headerDataBg}"` : ''} onclick="${headerOnClick}">
                    <h3>${monthName}</h3>
                    <div class="month-card-zodiac">${theme.cnName}</div>
                    <div class="month-card-icon">${theme.icon}</div>
                </div>
                <div class="month-card-body">${this.renderMonthTable(year, m, calendarData, { isMini: true, eventLimit: 1, visualOnly: true })}</div>
            </div>`;
        }
        html += `</div>`;
        yearGroup.innerHTML = html;

        if (position === 'bottom') container.appendChild(yearGroup);
        else {
            const oldHeight = container.scrollHeight;
            container.insertBefore(yearGroup, container.firstChild);
            container.scrollTop += (container.scrollHeight - oldHeight);
        }
    },

    renderYearView() {
        const grid = document.getElementById('calendar-grid');
        const label = document.getElementById('calendar-range-label');
        if (!grid) return;

        const mapContainer = document.getElementById('calendar-map-container');
        if (grid) grid.style.display = 'block';
        if (mapContainer) mapContainer.style.display = 'none';

        grid.innerHTML = '<div class="year-view-container"></div>';
        grid.className = 'calendar-grid year-view-active';
        grid.style.padding = '0';
        grid.style.overflowY = 'hidden';

        this.state.calendar.renderedYears = new Set();
        const currentYear = this.state.calendar.currentDate.getFullYear();
        this.addYear(currentYear, 'bottom');
        this.addYear(currentYear + 1, 'bottom');
        this.addYear(currentYear - 1, 'top');

        if (label) label.innerText = `${currentYear}`;

        const container = grid.querySelector('.year-view-container');
        if (!container.dataset.scrollAttached) {
            container.addEventListener('scroll', () => {
                if (this.state.calendar.view !== 'year') return;
                const scrollTop = container.scrollTop;
                const scrollHeight = container.scrollHeight;
                const clientHeight = container.clientHeight;

                if (scrollTop < 500) {
                    this.addYear(Math.min(...Array.from(this.state.calendar.renderedYears)) - 1, 'top');
                    this.setupLazyLoading();
                } else if (scrollTop + clientHeight > scrollHeight - 500) {
                    this.addYear(Math.max(...Array.from(this.state.calendar.renderedYears)) + 1, 'bottom');
                    this.setupLazyLoading();
                }

                container.querySelectorAll('.year-group').forEach(group => {
                    const rect = group.getBoundingClientRect();
                    const gridRect = grid.getBoundingClientRect();
                    if (rect.top < gridRect.top + 400 && rect.bottom > gridRect.top + 400) {
                        if (label) label.innerText = group.dataset.year;
                    }
                });
            });
            container.dataset.scrollAttached = 'true';
        }

        this.setupLazyLoading();
        setTimeout(() => this.scrollToTodayInYearView(), 100);
    },

    setupLazyLoading() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const el = entry.target;
                    if (el.classList.contains('lazy-bg')) {
                        el.style.backgroundImage = el.dataset.bgUrl || `url('${el.dataset.bg}') center/cover`;
                        el.style.opacity = '1';
                        el.classList.remove('lazy-bg');
                    } else if (el.classList.contains('lazy-img')) {
                        el.src = el.dataset.src;
                        el.style.opacity = '1';
                        el.classList.remove('lazy-img');
                    }
                    observer.unobserve(el);
                }
            });
        }, { root: document.querySelector('.year-view-container'), rootMargin: '200px' });
        document.querySelectorAll('.lazy-bg, .lazy-img').forEach(el => observer.observe(el));
    },

    scrollToTodayInYearView() {
        if (this.state.calendar.view !== 'year') return;
        const container = document.querySelector('.year-view-container');
        if (!container) return;
        const todayEl = container.querySelector('.calendar-day.today');
        if (todayEl) {
            todayEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            todayEl.style.outline = '3px solid #E63946';
            todayEl.style.outlineOffset = '2px';
            setTimeout(() => { todayEl.style.outline = 'none'; }, 2000);
        }
    },

    scrollToCurrentYearInCenturyView() {
        if (this.state.calendar.view !== 'century') return;
        const grid = document.getElementById('calendar-grid');
        if (!grid) return;
        const scrollToTarget = () => {
            const currentDecade = Math.floor(new Date().getFullYear() / 10) * 10;
            const decadeEl = document.getElementById(`decade-${currentDecade}`);
            if (decadeEl) decadeEl.scrollIntoView({ behavior: 'auto', block: 'start' });
            else grid.querySelector('.current-year-card')?.scrollIntoView({ behavior: 'auto', block: 'center' });
        };
        scrollToTarget();
        setTimeout(scrollToTarget, 100);
        setTimeout(scrollToTarget, 500);
    },

    renderCenturyView() {
        const grid = document.getElementById('calendar-grid');
        const label = document.getElementById('calendar-range-label');
        if (!grid) return;

        grid.innerHTML = '';
        grid.className = 'calendar-grid';
        grid.style.display = 'block';
        grid.style.overflowY = 'auto';
        grid.style.height = '100%';
        grid.style.background = '#fff5f8';
        grid.style.padding = '0';
        grid.style.border = 'none';

        this.state.calendar.renderedCenturies = new Set();
        const currentYear = this.state.calendar.currentDate.getFullYear();
        const startCentury = Math.floor(currentYear / 100) * 100;
        this.addCentury(startCentury, 'bottom');
        if (label) label.innerText = `${startCentury} - ${startCentury + 99}`;

        if (!grid.dataset.scrollAttached) {
            grid.addEventListener('scroll', () => {
                if (this.state.calendar.view !== 'century') return;
                const scrollTop = grid.scrollTop;
                const scrollHeight = grid.scrollHeight;
                const clientHeight = grid.clientHeight;

                grid.querySelectorAll('.century-big-group').forEach(group => {
                    const rect = group.getBoundingClientRect();
                    const gridRect = grid.getBoundingClientRect();
                    if (rect.top < gridRect.top + 300 && rect.bottom > gridRect.top + 300) {
                        const c = parseInt(group.id.split('-')[1]);
                        if (label) label.innerText = `${c} - ${c + 99}`;
                    }
                });

                if (scrollTop + clientHeight > scrollHeight - 500) {
                    const lastCentury = Math.max(...Array.from(this.state.calendar.renderedCenturies).map(Number));
                    this.addCentury(lastCentury + 100, 'bottom');
                } else if (scrollTop < 500) {
                    const firstCentury = Math.min(...Array.from(this.state.calendar.renderedCenturies).map(Number));
                    const prevScrollHeight = grid.scrollHeight;
                    this.addCentury(firstCentury - 100, 'top');
                    grid.scrollTop = scrollTop + (grid.scrollHeight - prevScrollHeight);
                }
            });
            grid.dataset.scrollAttached = 'true';
        }
        setTimeout(() => this.scrollToCurrentYearInCenturyView(), 100);
    },

    addCentury(year, position) {
        if (this.state.calendar.renderedCenturies.has(year.toString())) return;
        this.state.calendar.renderedCenturies.add(year.toString());

        const grid = document.getElementById('calendar-grid');
        const getZodiac = (y) => {
            const animals = ["Rat","Ox","Tiger","Rabbit","Dragon","Snake","Horse","Goat","Monkey","Rooster","Dog","Pig"];
            const icons   = ["🐀","🐂","🐅","🐇","🐉","🐍","🐎","🐐","🐒","🐓","🐕","🐖"];
            return { animal: animals[(y - 4) % 12], icon: icons[(y - 4) % 12] };
        };

        const centuryTitle = year >= 0 ? `${year}s CE` : `${Math.abs(year)}s BCE`;
        let html = `<div class="century-big-group" id="century-${year}">
            <div class="century-header-banner" style="background-image: url('/year-figures/${year}.png'), url('https://via.placeholder.com/1200x250?text=${centuryTitle}')">
                <div class="century-header-content"><h2>${centuryTitle}</h2></div>
            </div>
            <div class="century-body">`;

        for (let d = 0; d < 100; d += 10) {
            const decadeStart = year + d;
            html += `<div class="decade-group" id="decade-${decadeStart}">
                <div class="decade-header-banner" style="background-image: url('/year-figures/${decadeStart}.png'), url('/year-figures/${decadeStart}.jpg'), linear-gradient(135deg, #007bff, #00bcd4)">
                    <div class="decade-header-content"><h3>${decadeStart}s</h3></div>
                </div>
                <div class="decade-years-grid">`;

            for (let y = decadeStart; y < decadeStart + 10; y++) {
                const isActive = y === new Date().getFullYear();
                const zodiac = getZodiac(y);
                let yearImg = `/year-figures/${y}.jpg`;
                if (y >= 1900 && y <= 1999) yearImg = `/year-figures/1900/${y}.jpg`;
                else if (y >= 2000 && y <= 2025) yearImg = `/year-figures/2000/${y}.jpg`;
                const fallbackGradients = [
                    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
                    'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)',
                    'linear-gradient(135deg, #cfd9df 0%, #e2ebf0 100%)',
                    'linear-gradient(135deg, #f6d365 0%, #fda085 100%)',
                    'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)'
                ];
                const grad = fallbackGradients[y % fallbackGradients.length];

                html += `<div class="year-card-small ${isActive ? 'current-year-card' : ''}" style="background: #fff; border: ${isActive ? '2px solid #007bff' : '1px solid #e2e2e2'}; border-radius: 15px; overflow: hidden; box-shadow: 0 5px 15px rgba(0,0,0,0.05); cursor: pointer; position: relative;"
                     onclick="App.state.calendar.currentDate.setFullYear(${y}); App.setCalendarView('year')">
                     <div style="height: 120px; overflow: hidden; position: relative; background: #eee;">
                        <img src="${yearImg}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'">
                        <div style="display: none; width: 100%; height: 100%; align-items: center; justify-content: center; background: ${grad}; color: #fff; font-size: 28px; font-weight: 900;">${y}</div>
                        <div style="position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(transparent, rgba(0,0,0,0.6)); padding: 5px; color: #fff; font-size: 11px; font-weight: bold; text-align: center;">${y}</div>
                     </div>
                     <div style="padding: 10px; text-align: center;"><div style="font-size: 18px;">${zodiac.icon}</div><div style="font-size: 10px; color: #888;">${zodiac.animal}</div></div>
                </div>`;
            }
            html += `</div></div>`;
        }
        html += `</div></div>`;

        if (position === 'top') grid.insertAdjacentHTML('afterbegin', html);
        else grid.insertAdjacentHTML('beforeend', html);
    },

    createEvent() {
        const title = prompt('Event Title:');
        if (!title) return;
        const desc = prompt('Description:');
        const dateStr = prompt('Date (YYYY-MM-DD):', this.state.calendar.currentDate.toISOString().split('T')[0]);
        if (!dateStr) return;

        const events = JSON.parse(localStorage.getItem('cloudmail_events') || '[]');
        const newEv = { id: 'ev_' + Date.now(), title, description: desc, date: dateStr };
        events.push(newEv);
        localStorage.setItem('cloudmail_events', JSON.stringify(events));
        if (window.cloudmailCustomEvents) window.cloudmailCustomEvents.push(newEv);
        this.renderCalendar();
    },

    async syncGoogleCalendar() {
        try {
            const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            const res = await fetch('/api/google/sync-events', {
                method: 'POST',
                ...(isLocal ? { headers: { 'X-API-Key': '' } } : {})
            });
            const text = await res.text();
            if (!text) { alert('Sync failed: Empty response from server.'); return; }
            let data;
            try { data = JSON.parse(text); } catch (e) { alert('Sync failed: Server returned non-JSON:\n' + text.substring(0, 200)); return; }

            if (res.status === 401) {
                const authRes = await fetch('/api/google/auth-url');
                const authData = await authRes.json();
                if (authData.url) { window.open(authData.url, '_blank', 'width=600,height=800'); alert('Please authenticate with Google, then click Sync again.'); }
                return;
            }
            if (!res.ok) { alert('Sync failed: ' + (data.error || 'Unknown error') + '\n' + (data.details || '')); return; }

            console.log('Synced', data.count, 'events');
            await this.loadLatestEvents();
            this.renderCalendar();
            alert(`Synced ${data.count} events successfully!`);
        } catch (e) {
            console.error('Error syncing Google Calendar:', e);
            alert('Sync error: ' + e.message);
        }
    },

    async smartCfPush() {
        const message = prompt('Enter commit message (leave blank for timestamp):', '');
        if (message === null) return;
        const commitMessage = message.trim();

        const modal = document.getElementById('modal-smart-push');
        const log = document.getElementById('smart-push-log');
        const status = document.getElementById('smart-push-status');
        if (!modal || !log) { alert('Push terminal modal not found in UI.'); return; }

        modal.style.display = 'block';
        log.textContent = `>>> Starting Smart Cloudflare Push${commitMessage ? ': ' + commitMessage : ''}...\n`;
        status.textContent = 'Processing...';
        status.style.color = '#666';

        try {
            const serverUrl = window._getServerUrl ? window._getServerUrl() : '';
            const url = new URL(`${serverUrl}/api/run-smart-push`, window.location.origin);
            if (commitMessage) url.searchParams.set('commitMessage', commitMessage);
            const eventSource = new EventSource(url.toString());

            eventSource.onmessage = (event) => {
                const data = JSON.parse(event.data);
                const span = document.createElement('span');
                if (data.startsWith('ERROR:') || data.includes('FAILED')) span.style.color = '#ff5555';
                else if (data.includes('done') || data.includes('completed successfully') || data.includes('[*]') || data.includes('[^]')) span.style.color = '#50fa7b';
                else if (data.startsWith('===')) { span.style.color = '#8be9fd'; span.style.fontWeight = 'bold'; }
                else if (data.includes('skipping')) span.style.color = '#6272a4';
                else span.style.color = '#f8f8f2';
                span.textContent = data + '\n';
                log.appendChild(span);
                log.parentElement.scrollTop = log.parentElement.scrollHeight;
                if (data.includes('Process completed with code')) {
                    status.textContent = data;
                    status.style.color = data.includes('code 0') ? '#28a745' : '#dc3545';
                }
            };
            eventSource.addEventListener('end', () => {
                eventSource.close();
                const endMsg = document.createElement('span');
                endMsg.style.color = '#bd93f9'; endMsg.style.fontWeight = 'bold';
                endMsg.textContent = '\n>>> Sync process finished.\n';
                log.appendChild(endMsg);
                log.parentElement.scrollTop = log.parentElement.scrollHeight;
            });
            eventSource.onerror = (err) => {
                console.error('EventSource failed:', err);
                eventSource.close();
                const errorSpan = document.createElement('span');
                errorSpan.style.color = '#ff5555';
                errorSpan.textContent = '\n[ERROR] Connection lost or server error.\n';
                log.appendChild(errorSpan);
                status.textContent = 'Disconnected'; status.style.color = '#dc3545';
            };
        } catch (e) {
            console.error('Error triggering Smart Push:', e);
            alert('Push error: ' + e.message);
        }
    },

    async pushEmailToGoogleCalendar() {
        if (!this.state.calendar.previewEmailId) { alert('No email selected.'); return; }
        const email = this.state.emails.find(e => e.id === this.state.calendar.previewEmailId)
            || this.state.threads.flatMap(t => t.emails).find(e => e.id === this.state.calendar.previewEmailId);
        if (!email) { alert('Could not find email details.'); return; }

        const dateStr = new Date(email.date).toISOString().split('T')[0];
        try {
            const res = await fetch('/api/google/calendar/add-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ summary: `Email from ${email.fromName || email.from}: ${email.subject}`, description: `Subject: ${email.subject}\n\n${email.preview || ''}`, dateStr })
            });
            if (res.status === 401) { alert('Not authenticated with Google. Please click "Sync" first.'); return; }
            const data = await res.json();
            if (data.success) { alert('Successfully pushed to Google Calendar!'); this.syncGoogleCalendar(); }
            else alert('Failed to push: ' + (data.error || 'Unknown error'));
        } catch (e) {
            console.error('Error pushing to Google Calendar:', e);
            alert('Error pushing: ' + e.message);
        }
    },

    getHostnameForDate(dateString) {
        if (!dateString) return '2025.harryji.com';
        const dateRaw = dateString.split(/[T\s]/)[0];
        if (this.state.calendar.hostnames && Array.isArray(this.state.calendar.hostnames)) {
            for (const item of this.state.calendar.hostnames) {
                if (dateRaw >= item.cutoff) return item.hostname;
            }
        }
        return '2025.harryji.com';
    },

    async playRandomHlsVideo() {
        const items = window.cloudmailLatestEvents?.items || [];
        if (items.length === 0) { alert('No recent events available yet.'); return; }

        const candidates = items.filter(e => {
            const isAllDay = !!e.start?.date;
            const dateStr = (e.start?.date || e.start?.dateTime || e.date || '').split(/[T\s]/)[0];
            return dateStr && dateStr >= '2026-01-13' && isAllDay;
        });
        if (candidates.length === 0) { alert('No potential video events found after 2026-01-13.'); return; }

        const shuffled = [...candidates].sort(() => 0.5 - Math.random());
        for (let i = 0; i < Math.min(shuffled.length, 50); i++) {
            const candidate = shuffled[i];
            const dateStr = (candidate.start?.date || candidate.start?.dateTime || candidate.date || '').split(/[T\s]/)[0];
            const dateParts = dateStr.split('-');
            if (dateParts.length < 3) continue;
            const [y, m, d] = dateParts;
            const hostname = this.getHostnameForDate(dateStr);
            const paths = [
                `https://${hostname}/${y}/${m}/${y}-${m}-${d}/videos/intro_video-1080p/playlist.m3u8`,
                `https://${hostname}/${y}/${m}/${y}-${m}-${d}/videos/index.m3u8`,
                `https://${hostname}/${y}/${m}/${y}-${m}-${d}/index.m3u8`
            ];
            for (const url of paths) {
                try {
                    const response = await fetch(url);
                    if (response.ok) {
                        const text = await response.text();
                        if (text.includes('#EXTM3U')) { this.openCalendarPreview(candidate.id, true); return; }
                    }
                } catch (e) { /* continue */ }
            }
        }
        alert('No functional HLS stream found after searching several candidates.');
    },

    checkCfQuota() {
        const modal = document.getElementById('modal-cf-quota');
        const logEl = document.getElementById('cf-quota-log');
        if (!modal || !logEl) return;

        modal.style.display = 'block';
        const serverUrl = this._getServerUrl();
        const eventSource = new EventSource(`${serverUrl}/api/run-cf-quota-check`);
        this._quotaEventSource = eventSource;

        eventSource.onmessage = (event) => {
            let text;
            try {
                const parsed = JSON.parse(event.data);
                if (parsed && typeof parsed === 'object') {
                    if (parsed.done) {
                        eventSource.close();
                        logEl.textContent += '\nCheck completed.\n';
                        logEl.scrollTop = logEl.scrollHeight;
                        renderSummary();
                        return;
                    }
                    text = parsed.log ?? JSON.stringify(parsed);
                } else {
                    text = parsed;
                }
            } catch (e) {
                text = event.data;
            }
            if (text !== undefined) {
                logEl.textContent += text + '\n';
                logEl.scrollTop = logEl.scrollHeight;
                addQuotaLine(text);
                renderSummary();
            }
        };
        eventSource.addEventListener('end', () => {
            eventSource.close();
            logEl.textContent += '\nCheck completed.\n';
            logEl.scrollTop = logEl.scrollHeight;
            renderSummary();
        });
        eventSource.onerror = (err) => {
            console.error("EventSource failed:", err);
            logEl.textContent += '\nConnection closed or error occurred.\n';
            eventSource.close();
        };
    }

};