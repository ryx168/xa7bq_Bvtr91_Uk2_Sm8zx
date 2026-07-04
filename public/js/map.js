/**
 * map.js — MapLibre GL and geocoding location services domain mixin.
 * Handles geo-spatial rendering, location searches, and event coordinates mapping.
 */

export const MapMixin = {
    // =========================================================================
    // PROPERTIES & METHODS
    // =========================================================================

    searchTagLocation(keyword) {
        if (!keyword || keyword.trim().length === 0) return;
        const query = keyword.toLowerCase().trim();

        const areaRoutes = {
            'africa': 'africa', 'asia': 'asia', 'east asia': 'asia',
            'europe': 'europe', 'west europe': 'europe', 'westeurope': 'europe',
            'americas': 'americas', 'latin america': 'americas',
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
            'southern africa': 'Southern Africa', 'south africa': 'Southern Africa'
        };
        if (africaSubregions[query]) {
            window.location.hash = `#calendar?area=Africa&subarea=${encodeURIComponent(africaSubregions[query])}`;
            return;
        }

        const countryToArea = {
            'egypt':    { area: 'Africa', subarea: 'Northern Africa', country: 'Egypt' },
            'algeria':  { area: 'Africa', subarea: 'Northern Africa', country: 'Algeria' },
            'morocco':  { area: 'Africa', subarea: 'Northern Africa', country: 'Morocco' },
            'china':    { area: 'East Asia', country: 'China' },
            'japan':    { area: 'East Asia', country: 'Japan' },
            'france':   { area: 'West Europe', country: 'France' },
            'germany':  { area: 'West Europe', country: 'Germany' },
            'usa':      { area: 'North America', country: 'USA' },
            'canada':   { area: 'North America', country: 'Canada' },
            'mexico':   { area: 'Latin America', country: 'Mexico' }
        };
        if (countryToArea[query]) {
            const loc = countryToArea[query];
            let hash  = `#calendar?area=${encodeURIComponent(loc.area)}`;
            if (loc.subarea) hash += `&subarea=${encodeURIComponent(loc.subarea)}`;
            if (loc.country) hash += `&country=${encodeURIComponent(loc.country)}`;
            window.location.hash = hash;
            return;
        }

        alert(`No match found for "${keyword}". Try: Africa, Asia, Europe, America, Kenya, Egypt, Japan, etc.`);
    },

    get _locationCoords() { return window.LOCATION_COORDS || {}; },

    resolveLocationCoords(location) {
        if (!location) return null;
        const loc        = location.toLowerCase().trim();
        const sortedKeys = Object.keys(this._locationCoords).sort((a, b) => b.length - a.length);
        for (const key of sortedKeys) {
            if (loc === key || loc.includes(key)) return this._locationCoords[key];
        }
        for (const key of sortedKeys) {
            if (key.includes(',')) {
                const city = key.split(',')[0].trim();
                if (loc.includes(city)) return this._locationCoords[key];
            }
        }
        return null;
    },

    reverseResolveLocation(lng, lat) {
        if (!this._locationCoords) return null;
        let closestKey  = null;
        let minDistance = Infinity;
        for (const [key, coords] of Object.entries(this._locationCoords)) {
            const [cLat, cLng] = coords;
            const dist = Math.sqrt(Math.pow(lng - cLng, 2) + Math.pow(lat - cLat, 2));
            if (dist < minDistance) { minDistance = dist; closestKey = key; }
        }
        return minDistance < 1.5 ? closestKey : null;
    },

    renderMap(options = {}) {
        if (!window.cloudmailLatestEvents || !window.cloudmailLatestEvents.items) {
            console.warn('Map data not loaded yet.');
            return;
        }
        if (!this.state.calendar.map) { this.initMap(); return; }

        if (this.state.calendar.markers) {
            this.state.calendar.markers.forEach(m => m.remove());
        }
        this.state.calendar.markers = [];

        const events = this.getMapEvents();
        const bounds = new maplibregl.LngLatBounds();
        let hasPoints = false;
        this.state.calendar.locCounts = {};

        events.forEach(ev => {
            let lat = ev.extendedProperties?.private?.lat;
            let lng = ev.extendedProperties?.private?.lng;
            if (lat === undefined || lng === undefined) {
                const coords = this.resolveLocationCoords(ev.location);
                if (!coords) return;
                [lat, lng] = coords;
            } else {
                lat = parseFloat(lat);
                lng = parseFloat(lng);
            }

            const summary = ev.summary || '';
            let hash = 0;
            for (let i = 0; i < summary.length; i++) { hash = ((hash << 5) - hash) + summary.charCodeAt(i); hash |= 0; }
            lat += ((Math.abs(hash) % 1000) / 1000 - 0.5) * 0.3;
            lng += ((Math.abs(Math.floor(hash / 1000)) % 1000) / 1000 - 0.5) * 0.3;
            if (isNaN(lat) || isNaN(lng)) return;

            const locKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
            if (!this.state.calendar.locCounts[locKey]) this.state.calendar.locCounts[locKey] = 0;
            const markerIndex = this.state.calendar.locCounts[locKey]++;

            const el = document.createElement('div');
            el.className = 'map-marker';
            Object.assign(el.style, { width: '96px', height: '72px', cursor: 'pointer', overflow: 'visible', zIndex: (50 - markerIndex).toString(), position: 'absolute', transition: 'z-index 0s' });
            el.onmouseenter = () => { el.style.zIndex = '100'; el.querySelector('.marker-scale-wrapper').style.transform = 'scale(1.15)'; };
            el.onmouseleave = () => { el.style.zIndex = (50 - markerIndex).toString(); el.querySelector('.marker-scale-wrapper').style.transform = 'scale(1)'; };
            el.onclick      = (e) => { e.stopPropagation(); App.openCalendarPreview(ev.id); };

            const imgResult   = this.resolveEventImageUrl(ev);
            const localImgUrl = imgResult?.fileUrl || '';
            const googleImgUrl = imgResult?.googleUrl || '';

            const dStr = ev.start?.date || ev.start?.dateTime?.split('T')[0] || '';
            const dateBadgeStr = dStr
                ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(dStr + 'T12:00:00'))
                : '';

            const imgHtml = localImgUrl
                ? `<img src="${localImgUrl}" draggable="false" onerror="this.onerror=null;this.src='${googleImgUrl}';" style="width:100%;height:100%;object-fit:cover;display:block;pointer-events:none;" loading="lazy">`
                : `<div style="width:100%;height:100%;background:linear-gradient(135deg,#667eea,#764ba2);display:flex;align-items:center;justify-content:center;color:white;font-size:16px;">📅</div>`;

            el.innerHTML = `
                <div class="marker-scale-wrapper" style="width:100%;height:100%;transition:transform 0.2s;transform-origin:bottom center;">
                    <div style="width:100%;height:100%;position:relative;border-radius:4px;border:2px solid white;box-shadow:0 3px 10px rgba(0,0,0,0.4);overflow:hidden;background:white;pointer-events:none;">
                        ${imgHtml}
                        ${dateBadgeStr ? `<div style="position:absolute;bottom:0;left:0;width:100%;background:rgba(0,0,0,0.6);color:white;font-size:11px;font-weight:700;text-align:center;padding:4px 0;pointer-events:none;">${dateBadgeStr}</div>` : ''}
                    </div>
                    <div style="position:absolute;bottom:-6px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-top:8px solid white;filter:drop-shadow(0 2px 1px rgba(0,0,0,0.2));pointer-events:none;"></div>
                </div>`;

            const marker = new maplibregl.Marker({
                element: el, anchor: 'bottom',
                offset: [markerIndex * 15, -6 - (markerIndex * 15)],
                draggable: true
            }).setLngLat([lng, lat]).addTo(this.state.calendar.map);

            marker.on('dragend', async () => {
                const lngLat  = marker.getLngLat();
                const locName = this.reverseResolveLocation(lngLat.lng, lngLat.lat);
                try {
                    const response = await fetch('/api/calendar/update-location', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'X-API-Key': '' },
                        body: JSON.stringify({ eventId: ev.id, lat: lngLat.lat, lng: lngLat.lng, locationName: locName })
                    });
                    const resData = await response.json();
                    if (resData.success) {
                        const localEv = window.cloudmailLatestEvents?.items?.find(i => i.id === ev.id);
                        if (localEv) {
                            localEv.lat = lngLat.lat;
                            localEv.lng = lngLat.lng;
                            if (resData.location) localEv.location = resData.location;
                        }
                    } else {
                        alert('Error updating location: ' + resData.error);
                    }
                } catch (err) {
                    alert('Failed to save new location.');
                }
            });

            this.state.calendar.markers.push(marker);
            bounds.extend([lng, lat]);
            hasPoints = true;
        });

        if (hasPoints && !options.skipFitBounds) {
            this.state.calendar.map.fitBounds(bounds, { padding: 60, maxZoom: 6 });
        }
        this.renderMapPinList();
    },

    initMap() {
        const container = document.getElementById('calendar-map');
        if (!container) return;

        this.state.calendar.map = new maplibregl.Map({
            container: 'calendar-map',
            style: {
                version: 8,
                sources: { osm: { type: 'raster', tiles: ['https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png'], tileSize: 256, attribution: '&copy; OpenStreetMap contributors &copy; CARTO' } },
                layers: [{ id: 'osm', type: 'raster', source: 'osm', minzoom: 0, maxzoom: 19 }]
            },
            center: [20, 20], zoom: 1.5
        });

        this.state.calendar.map.on('load', () => this.renderMap());

        const toDateStr = d => {
            const y   = d.getFullYear();
            const m   = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
        };
        const today      = new Date();
        const startDay   = new Date(today); startDay.setDate(today.getDate() - today.getDay());
        const endDay     = new Date(startDay); endDay.setDate(startDay.getDate() + 6);
        const startInput = document.getElementById('map-filter-start');
        const endInput   = document.getElementById('map-filter-end');
        if (startInput && !startInput.value) startInput.value = toDateStr(startDay);
        if (endInput   && !endInput.value)   endInput.value   = toDateStr(endDay);
    },

    getMapEvents() {
        const today    = new Date();
        const startDay = new Date(today); startDay.setDate(today.getDate() - today.getDay());
        const endDay   = new Date(startDay); endDay.setDate(startDay.getDate() + 6);
        const toDateStr = d => {
            const y   = d.getFullYear();
            const m   = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
        };

        const start   = document.getElementById('map-filter-start')?.value   || toDateStr(startDay);
        const end     = document.getElementById('map-filter-end')?.value     || toDateStr(endDay);
        const area    = document.getElementById('map-filter-area')?.value    || 'all';
        const star    = document.getElementById('map-filter-star')?.value    || 'all';
        const weekday = document.getElementById('map-filter-weekday')?.value || 'all';
        const search  = (document.getElementById('map-filter-search')?.value || '').toLowerCase();

        const seenDates = new Set();
        return (window.cloudmailLatestEvents?.items || []).filter(ev => {
            const date = ev.start?.date || ev.start?.dateTime?.split('T')[0] || '';
            if (!date || ev.start?.dateTime) return false;
            const hasCover = ev.attachments?.some(a => (a.title === 'cover.png' || a.title?.endsWith('.png')) && a.mimeType?.startsWith('image/'));
            if (!hasCover) return false;
            if (!ev.location && !ev.extendedProperties?.private?.lat && !ev.lat) return false;
            if (ev.location && !this.resolveLocationCoords(ev.location) && !ev.extendedProperties?.private?.lat && !ev.lat) return false;

            if (this.state.calendar.selectedMapDates?.size > 0) {
                if (!this.state.calendar.selectedMapDates.has(date)) return false;
            } else {
                if (date < start || date > end) return false;
            }

            if (area !== 'all') {
                if (!(ev.location || '').toLowerCase().includes(area.toLowerCase())) return false;
            }
            if (weekday !== 'all') {
                if (new Date(date + 'T12:00:00').getDay().toString() !== weekday) return false;
            }
            if (star !== 'all') {
                const [y, m, d] = date.split('-');
                if (this.getZodiacSign(parseInt(d, 10), parseInt(m, 10)) !== star) return false;
            }
            if (search) {
                const s = (ev.summary || '').toLowerCase();
                const d = (ev.description || '').toLowerCase();
                const l = (ev.location || '').toLowerCase();
                if (!s.includes(search) && !d.includes(search) && !l.includes(search)) return false;
            }
            if (seenDates.has(date)) return false;
            seenDates.add(date);
            return true;
        });
    },

    applyMapFilters() {
        this.state.calendar.selectedMapDates = new Set();
        this.renderMiniCalendar();
        this.renderMap();
        this.renderMapPinList();
    },

    renderMapPinList() {
        const events = this.getMapEvents();
        const list   = document.getElementById('calendar-filter-list');
        if (!list) return;

        // Hide standard sidebar elements in Map view
        ['.calendar-sidebar .search-box', '.calendar-sidebar #calendar-event-filter'].forEach(sel => {
            const el = document.querySelector(sel)?.closest?.('.search-box') || document.querySelector(sel);
            if (el) el.style.display = 'none';
        });
        const sidebarMailbox = document.querySelector('.calendar-sidebar .listing.folderlist');
        if (sidebarMailbox) sidebarMailbox.style.display = 'none';

        events.sort((a, b) => {
            const dA = a.start?.date || a.start?.dateTime?.split('T')[0] || '';
            const dB = b.start?.date || b.start?.dateTime?.split('T')[0] || '';
            return dA.localeCompare(dB);
        });

        const header = document.querySelector('.calendar-sidebar .header');
        if (header) header.innerText = `Map Pins (${events.length})`;

        if (events.length === 0) {
            list.innerHTML = `<div style="padding:20px;text-align:center;color:#999;font-size:13px;">No pins found for selected filters.</div>`;
            return;
        }

        list.innerHTML = '<div class="map-pin-list" style="padding:10px 0;">' +
            events.map(ev => {
                const dateStr  = ev.start?.date || ev.start?.dateTime?.split('T')[0] || '';
                const dObj     = new Date(dateStr + 'T12:00:00');
                const fmtDate  = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(dObj);
                const imgUrl   = this.resolveEventImageUrl(ev)?.fileUrl || '';
                const imgHtml  = imgUrl
                    ? `<img src="${imgUrl}" style="width:40px;height:30px;object-fit:cover;border-radius:4px;" onerror="this.style.display='none'">`
                    : `<div style="width:40px;height:30px;background:#f8f9fa;border-radius:4px;border:1px solid #eee;display:flex;align-items:center;justify-content:center;font-size:14px;">📍</div>`;
                return `
                    <div class="map-pin-item"
                         style="display:flex;align-items:center;gap:10px;padding:10px;border-bottom:1px solid #f0f0f0;cursor:pointer;"
                         onclick="App.centerMapOnEventId('${ev.id}')">
                        <div style="flex-shrink:0;">${imgHtml}</div>
                        <div style="flex:1;overflow:hidden;">
                            <div style="font-size:11px;color:#888;font-weight:500;">${fmtDate}</div>
                            <div class="pin-title" style="font-size:12px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;"
                                 title="${ev.summary}">${ev.summary}</div>
                        </div>
                        <div style="color:#ccc;font-size:12px;"><i class="fas fa-chevron-right"></i></div>
                    </div>`;
            }).join('') + '</div>';
    },

    centerMapOnEventId(eventId) {
        if (!this.state.calendar.map) return;
        const ev = (window.cloudmailLatestEvents?.items || []).find(e => e.id === eventId);
        if (!ev) return;

        let lat = ev.extendedProperties?.private?.lat;
        let lng = ev.extendedProperties?.private?.lng;
        if (lat === undefined || lng === undefined) {
            const coords = this.resolveLocationCoords(ev.location);
            if (!coords) return;
            [lat, lng] = coords;
        } else {
            lat = parseFloat(lat); lng = parseFloat(lng);
        }

        const summary = ev.summary || '';
        let hash = 0;
        for (let i = 0; i < summary.length; i++) { hash = ((hash << 5) - hash) + summary.charCodeAt(i); hash |= 0; }
        lat += ((Math.abs(hash) % 1000) / 1000 - 0.5) * 0.3;
        lng += ((Math.abs(Math.floor(hash / 1000)) % 1000) / 1000 - 0.5) * 0.3;

        const marker = this.state.calendar.markers?.find(m => {
            const pos = m.getLngLat();
            return Math.abs(pos.lng - lng) < 0.0001 && Math.abs(pos.lat - lat) < 0.0001;
        });

        if (marker) {
            const el    = marker.getElement();
            const inner = el?.querySelector('.marker-scale-wrapper');
            if (inner) {
                el.style.zIndex = '1000';
                inner.style.transition = 'transform 0.3s cubic-bezier(0.25, 1.5, 0.5, 1)';
                inner.style.transform  = 'scale(1.3) translateY(-15px)';
                setTimeout(() => {
                    inner.style.transform = '';
                    setTimeout(() => { inner.style.transition = ''; el.style.zIndex = '50'; }, 300);
                }, 400);
            }
        }
    }
};
