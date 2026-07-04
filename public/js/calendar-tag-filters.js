/**
 * calendar-tag-filters.js
 * Tag filter, video-tag dropdowns, type tree, tag link generation,
 * search-like navigation, and the main thumbnail view renderer.
 *
 * Depends on: App (global), App.state.calendar, App.escape(),
 *             App.resolveEventImageUrl(), App.openCalendarPreview(),
 *             App.applyTagFilters() (self-referential via mixin)
 *
 * Location-specific logic lives in calendar-location-filter.js.
 * Type-tree / type-filter logic lives in calendar-type-filter.js.
 * Both must be loaded BEFORE this file.
 *
 * Load order:
 *   1. cloudmain.js
 *   2. calendar-location-filter.js
 *   3. calendar-type-filter.js   ← NEW
 *   4. calendar-tag-filters.js   ← this file
 *
 * Usage:
 *   Object.assign(App, CalendarTagFilters);
 * or rely on the auto-mixin at the bottom.
 */

const CalendarTagFilters = {

    // =========================================================================
    // BASIC FILTER HELPERS
    // =========================================================================

    filterCalendarFilterList(query) {
        this.state.calendar.filterQuery = (query || '').toLowerCase().trim();
        this.renderCalendarFilters();
    },

    toggleCalendarFilter(id) {
        if (this.state.calendar.selectedFilters.has(id)) {
            this.state.calendar.selectedFilters.delete(id);
        } else {
            this.state.calendar.selectedFilters.add(id);
        }
        this.renderCalendarFilters();
        this.renderCalendar();
    },

    toggleLocationTree() {
        const content = document.getElementById('location-tree-content');
        const chev    = document.getElementById('location-tree-chevron');
        if (!content) return;
        const hidden = content.style.display === 'none';
        content.style.display = hidden ? '' : 'none';
        if (chev) chev.style.transform = hidden ? '' : 'rotate(-90deg)';
    },

    applyTagFilters() {
        const areaEl  = document.getElementById('calendar-tag-area');
        const typeEl  = document.getElementById('calendar-tag-type');
        this.state.calendar.videoTagsFilter.area  = areaEl?.value  || 'all';
        this.state.calendar.videoTagsFilter.type  = typeEl?.value  || 'all';
        const typeVis  = document.getElementById('calendar-tag-type-vis');
        if (typeVis  && typeEl)  typeEl.value  = typeVis.value;
        this.renderTypeTree();
        this.renderCalendar();
    },

    clearTagFilters() {
        ['calendar-tag-area', 'calendar-tag-type'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = 'all';
        });
        ['calendar-tag-type-vis'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = 'all';
        });
        const searchInput = document.getElementById('calendar-tag-search-input');
        if (searchInput) searchInput.value = '';
        if (this.state.calendar?.videoTagsFilter) {
            this.state.calendar.videoTagsFilter.keyword = '';
            this.state.calendar.videoTagsFilter.artStyle = 'all';
            this._syncArtStyleFilterToHash?.();
        }
        this._artStyleExp = {};
        this._artStyleTab = 'region';
        this.renderArtStyleTree();
        this._locationFilter       = { area: null, subArea: null, country: null, province: null, city: null };
        this._locationTreeExpanded = {};
        this._typeTreeExpanded     = {};
        this.renderTypeTree();

        const previewPanel = document.getElementById('calendar-preview-panel');
        if (previewPanel) { previewPanel.classList.remove('active'); previewPanel.style.display = ''; }
        const calendarMain = document.querySelector('.calendar-main');
        if (calendarMain) calendarMain.style.display = '';

        const date   = this.state.calendar.currentDate;
        const year   = date.getFullYear();
        const month  = String(date.getMonth() + 1).padStart(2, '0');
        const dayStr = String(date.getDate()).padStart(2, '0');
        window.location.hash = `#calendar?date=${year}-${month}-${dayStr}&view=week`;

        this.renderLocationTree();
        this._syncFilterSectionsToSearch('');
        this.applyTagFilters();
    },

    toggleTagFiltersPanel() {
        const content = document.getElementById('tag-filters-content');
        const chev    = document.getElementById('tag-filters-chevron');
        if (!content) return;
        const hidden = content.style.display === 'none';
        content.style.display = hidden ? 'flex' : 'none';
        if (chev) chev.style.transform = hidden ? '' : 'rotate(-90deg)';
    },

    toggleMiniCalendar() {
        const mc   = document.getElementById('mini-calendar');
        const chev = document.getElementById('mini-calendar-chevron');
        if (!mc) return;
        const hidden = mc.style.display === 'none';
        mc.style.display = hidden ? '' : 'none';
        if (chev) chev.style.transform = hidden ? '' : 'rotate(-180deg)';
    },

    toggleTagSection(bodyId, chevId) {
        const body = document.getElementById(bodyId);
        const chev = document.getElementById(chevId);
        if (!body) return;
        const hidden = body.style.display === 'none';
        body.style.display = hidden ? 'block' : 'none';
        if (chev) chev.style.transform = hidden ? '' : 'rotate(-90deg)';
    },

    _syncFilterSectionsToSearch(q) {
        const sections = [
            { bodyId: 'location-tree-content', chevId: 'location-tree-chevron' },
            { bodyId: 'tag-type-body',         chevId: 'tag-type-chev'         },
            { bodyId: 'tag-artstyle-body',     chevId: 'tag-artstyle-chev'     },
            { bodyId: 'tag-music-body',        chevId: 'tag-music-chev'        },
            { bodyId: 'tag-wiki-body',         chevId: 'tag-wiki-chev'         },
        ];

        const collapse = () => sections.forEach(({ bodyId, chevId }) => {
            const body = document.getElementById(bodyId);
            const chev = document.getElementById(chevId);
            if (body) body.style.display = 'none';
            if (chev) chev.style.transform = 'rotate(-90deg)';
        });

        if (!q) { collapse(); return; }

        // Auto-close mini calendar when a search is active to save space
        const mc = document.getElementById('mini-calendar');
        const mcChev = document.getElementById('mini-calendar-chevron');
        if (mc && mc.style.display !== 'none') {
            mc.style.display = 'none';
            if (mcChev) mcChev.style.transform = 'rotate(-180deg)';
        }

        const lower = q.toLowerCase();

        const locationMatch  = this._searchHasLocationMatch(lower);
        const typeMatch      = this._searchHasTypeMatch(lower);
        const artStyleResult = this._searchFindArtStyleMatch(lower); // returns null or { filterVal, area, tier }
        const musicMatch     = this._searchHasMusicStyleMatch ? this._searchHasMusicStyleMatch(lower) : false;
        const wikiMatch      = this._searchHasWikiMatch ? this._searchHasWikiMatch(lower) : false;

        const results = [locationMatch, typeMatch, !!artStyleResult, musicMatch, wikiMatch];

        sections.forEach(({ bodyId, chevId }, i) => {
            const body = document.getElementById(bodyId);
            const chev = document.getElementById(chevId);
            const open = results[i];
            if (body) body.style.display = open ? '' : 'none';
            if (chev) chev.style.transform = open ? '' : 'rotate(-90deg)';
        });

        // ── Auto-expand art style tree to show the matched style ──────────────
        if (artStyleResult) {
            if (!this._artStyleExp) this._artStyleExp = {};

            const { tab, expKeys } = artStyleResult;

            // Switch to the correct tab
            if (tab && tab !== this._artStyleTab) {
                this._artStyleTab = tab;
                const rBtn = document.getElementById('artstyle-tab-region');
                const pBtn = document.getElementById('artstyle-tab-phil');
                const activeStyle   = 'background:#e7f3ff;color:#0078d4;border-bottom:2px solid #0078d4;';
                const inactiveStyle = 'background:transparent;color:#888;border-bottom:2px solid transparent;';
                if (rBtn) rBtn.style.cssText += tab === 'region' ? activeStyle : inactiveStyle;
                if (pBtn) pBtn.style.cssText += tab === 'phil'   ? activeStyle : inactiveStyle;
            }

            // Expand parent nodes
            expKeys.forEach(k => { this._artStyleExp[k] = true; });

            // Re-render tree so expanded nodes appear
            this.renderArtStyleTree?.();

            // Scroll matched style into view
            setTimeout(() => {
                const tree = document.getElementById('tag-artstyle-tree');
                if (!tree) return;
                const all = tree.querySelectorAll('div');
                for (const el of all) {
                    if (el.textContent.toLowerCase().includes(lower)) {
                        el.scrollIntoView({ block: 'nearest' });
                        // Flash highlight
                        const orig = el.style.background;
                        el.style.background = '#fff3cd';
                        setTimeout(() => { el.style.background = orig; }, 1200);
                        break;
                    }
                }
            }, 80);
        }

        // ── Auto-expand music style tree to show the matched style ────────────
        if (musicMatch && this._autoExpandMusicStyleForSearch) {
            this._autoExpandMusicStyleForSearch(lower);
            // Scroll matched style into view
            setTimeout(() => {
                const tree = document.getElementById('tag-music-tree');
                if (!tree) return;
                const all = tree.querySelectorAll('div');
                for (const el of all) {
                    if (el.textContent.toLowerCase().includes(lower) && el.onclick) {
                        el.scrollIntoView({ block: 'nearest' });
                        // Flash highlight
                        const orig = el.style.background;
                        el.style.background = '#fff3cd';
                        setTimeout(() => { el.style.background = orig; }, 1200);
                        break;
                    }
                }
            }, 80);
        }

        // ── Auto-expand wiki tree to show the matched style ────────────
        if (wikiMatch && this._autoExpandWikiStyleForSearch) {
            this._autoExpandWikiStyleForSearch(lower);
            // Scroll matched style into view
            setTimeout(() => {
                const tree = document.getElementById('tag-wiki-tree');
                if (!tree) return;
                const all = tree.querySelectorAll('div');
                for (const el of all) {
                    if (el.textContent.toLowerCase().includes(lower) && el.onclick) {
                        el.scrollIntoView({ block: 'nearest' });
                        // Flash highlight
                        const orig = el.style.background;
                        el.style.background = '#fff3cd';
                        setTimeout(() => { el.style.background = orig; }, 1200);
                        break;
                    }
                }
            }, 80);
        }
    },

    _syncFilterSectionsToHash() {
        const hash = window.location.hash.replace(/^#/, '');

        const sections = [
            { bodyId: 'location-tree-content', chevId: 'location-tree-chevron' },
            { bodyId: 'tag-type-body',         chevId: 'tag-type-chev'         },
            { bodyId: 'tag-artstyle-body',     chevId: 'tag-artstyle-chev'     },
            { bodyId: 'tag-music-body',        chevId: 'tag-music-chev'        },
            { bodyId: 'tag-wiki-body',         chevId: 'tag-wiki-chev'         },
        ];

        const collapse = () => sections.forEach(({ bodyId, chevId }) => {
            const body = document.getElementById(bodyId);
            const chev = document.getElementById(chevId);
            if (body) body.style.display = 'none';
            if (chev) chev.style.transform = 'rotate(-90deg)';
        });

        if (!hash) { collapse(); return; }

        // ── Art Style: check using actual data, not DOM ───────────────────────
        const isArtStyle = (() => {
            if (!hash.startsWith('artstyle-')) return false;
            // If data not loaded yet, trust the prefix alone
            if (!this._AS_REGION_DATA?.length && !this._AS_PHIL_DATA?.length) return true;
            // Try resolving to a real filter value
            return !!this._slugToArtStyleFilter(hash);
        })();

        // ── Type: slug matches known type keywords ────────────────────────────
        const TYPE_SLUGS = new Set([
            'notables','identities','divinities','people','characters',
            'items','foods','vehicles','structures','destinations',
            'bird','mammal','fish','plant','event'
        ]);
        const isType = TYPE_SLUGS.has(hash.toLowerCase())
            || (this._slugToTypeFilter ? !!this._slugToTypeFilter(hash) : false);

        // ── Location: area slugs or calendar?area= params ─────────────────────
        const LOCATION_SLUGS = new Set([
            'africa','east-asia','west-europe','latin-america',
            'eurasian-hub','north-america','indo-pacific-south',
            'asia','europe','seasia'
        ]);
        const params = hash.startsWith('calendar?')
            ? new URLSearchParams(hash.slice(9))
            : null;
        const isLocation = LOCATION_SLUGS.has(hash.toLowerCase())
            || !!(params && (params.has('area') || params.has('country') || params.has('city') || params.has('province') || params.has('subarea')));

        const results = [isLocation, isType, isArtStyle];

        // ── Open matched sections, collapse unmatched ─────────────────────────
        sections.forEach(({ bodyId, chevId }, i) => {
            const body = document.getElementById(bodyId);
            const chev = document.getElementById(chevId);
            const open = results[i];
            if (body) body.style.display = open ? '' : 'none';
            if (chev) chev.style.transform = open ? '' : 'rotate(-90deg)';
        });

        // ── If art style matched, also auto-expand the correct node in the tree ─
        if (isArtStyle && hash.startsWith('artstyle-')) {
            const filterVal = this._slugToArtStyleFilter(hash);
            if (filterVal) {
                if (!this._artStyleExp) this._artStyleExp = {};
                // Open the parent nodes so the active style is visible
                if (filterVal.startsWith('r:style:')) {
                    const parts = filterVal.slice(8).split(':');
                    this._artStyleExp[`r:a:${parts[0]}`] = true;
                    this._artStyleExp[`r:t:${parts[0]}:${parts[1]}`] = true;
                } else if (filterVal.startsWith('r:tier:')) {
                    const rest = filterVal.slice(7);
                    const sep  = rest.lastIndexOf(':');
                    this._artStyleExp[`r:a:${rest.slice(0, sep)}`] = true;
                    this._artStyleExp[`r:t:${rest}`] = true;
                } else if (filterVal.startsWith('r:area:')) {
                    this._artStyleExp[`r:a:${filterVal.slice(7)}`] = true;
                } else if (filterVal.startsWith('p:style:')) {
                    const rest = filterVal.slice(8);
                    const sep  = rest.indexOf(':');
                    this._artStyleExp[`p:g:${rest.slice(0, sep)}`] = true;
                } else if (filterVal.startsWith('p:group:')) {
                    this._artStyleExp[`p:g:${filterVal.slice(8)}`] = true;
                }

                // Apply to state and re-render
                if (this.state?.calendar?.videoTagsFilter) {
                    this.state.calendar.videoTagsFilter.artStyle = filterVal;
                }
                this.renderArtStyleTree?.();
                setTimeout(() => this.renderTagThumbnailView?.(), 50);
            }
        }
    },

    _searchHasLocationMatch(q) {
        if (!q) return false;
        const lower = q.toLowerCase();

        // Check against known area/country/city names in location data
        const KNOWN_LOCATIONS = [
            'africa','northern africa','western africa','middle africa',
            'eastern africa','southern africa',
            'east asia','china','japan','korea','south korea','taiwan',
            'north korea','mongolia','russia',
            'west europe','france','germany','italy','spain','uk',
            'united kingdom','portugal','netherlands','belgium','switzerland',
            'austria','sweden','norway','denmark','finland','poland',
            'latin america','brazil','mexico','argentina','colombia',
            'peru','chile','venezuela','caribbean',
            'eurasian hub','turkey','iran','iraq','saudi arabia',
            'israel','egypt','ukraine','russia','central asia',
            'north america','united states','usa','canada','greenland',
            'indo-pacific south','india','indonesia','thailand',
            'vietnam','philippines','malaysia','australia','new zealand',
            'nairobi','cairo','lagos','cape town','tokyo','beijing',
            'paris','london','new york','los angeles','toronto',
            'vancouver','montreal','sydney','mumbai','delhi',
        ];

        return KNOWN_LOCATIONS.some(loc => {
            if (loc.includes(lower)) return true;
            if (loc.length >= 4 && lower.includes(loc)) return true;
            // For short abbreviations like 'uk' and 'usa', only match if it's an exact word
            if (loc.length < 4) {
                const regex = new RegExp(`\\b${loc}\\b`);
                if (regex.test(lower)) return true;
            }
            return false;
        });
    },

    _searchHasTypeMatch(q) {
        if (!q) return false;
        const lower = q.toLowerCase();

        // Search through actual type tree data
        const groupMap  = this._TYPE_GROUP_MAP  || {};
        const groupMeta = this._TYPE_GROUP_META || [];

        // Check group names
        for (const meta of groupMeta) {
            if (meta.key?.toLowerCase().includes(lower)) return true;
        }

        // Check base type names and their subtypes
        for (const [baseType, subtypes] of Object.entries(groupMap)) {
            if (baseType.toLowerCase().includes(lower)) return true;
            for (const sub of subtypes || []) {
                if (sub?.toLowerCase().includes(lower)) return true;
            }
        }

        // Also check rendered DOM as fallback
        const tree = document.getElementById('tag-type-tree');
        if (tree && tree.innerText.toLowerCase().includes(lower)) return true;

        return false;
    },

    _searchHasArtStyleMatch(q) {
        if (!q) return false;
        const lower = q.toLowerCase();

        // Search through actual data (not DOM) so it works before/after render
        const regionData = this._AS_REGION_DATA || [];
        const philData   = this._AS_PHIL_DATA   || [];

        for (const area of regionData) {
            if (area.area?.toLowerCase().includes(lower)) return true;
            if (area.nick?.toLowerCase().includes(lower)) return true;
            for (const style of area.styles || []) {
                if (style.name?.toLowerCase().includes(lower)) return true;
                if (style.hint?.toLowerCase().includes(lower)) return true;
            }
        }

        for (const group of philData) {
            if (group.group?.toLowerCase().includes(lower)) return true;
            for (const style of group.styles || []) {
                if (style.name?.toLowerCase().includes(lower)) return true;
                if (style.hint?.toLowerCase().includes(lower)) return true;
            }
        }

        return false;
    },

    _searchFindArtStyleMatch(lower) {
        if (!lower) return null;

        const regionData = this._AS_REGION_DATA || [];
        const philData   = this._AS_PHIL_DATA   || [];

        // ── Search By Region first ────────────────────────────────────────────
        for (const area of regionData) {
            for (const style of area.styles || []) {
                if (style.name?.toLowerCase().includes(lower) ||
                    style.hint?.toLowerCase().includes(lower)) {
                    return {
                        tab: 'region',
                        expKeys: [
                            `r:a:${area.area}`,
                            `r:t:${area.area}:${style.tier}`,
                        ],
                    };
                }
            }
            // Match area name itself
            if (area.area?.toLowerCase().includes(lower) ||
                area.nick?.toLowerCase().includes(lower)) {
                return {
                    tab: 'region',
                    expKeys: [`r:a:${area.area}`],
                };
            }
        }

        // ── Search By Philosophy ──────────────────────────────────────────────
        for (const group of philData) {
            for (const style of group.styles || []) {
                if (style.name?.toLowerCase().includes(lower) ||
                    style.hint?.toLowerCase().includes(lower)) {
                    return {
                        tab: 'phil',
                        expKeys: [`p:g:${group.group}`],
                    };
                }
            }
            if (group.group?.toLowerCase().includes(lower)) {
                return {
                    tab: 'phil',
                    expKeys: [`p:g:${group.group}`],
                };
            }
        }

        return null;
    },

    // =========================================================================
    // TAG PARSING
    // =========================================================================

    parseTagsFromDescription(description) {
        if (!description) return null;
        const tagSection = description.split('--- VIDEO TAGS ---')[1];
        if (!tagSection) return null;
        const tags = { area: null, country: null, province: null, city: null, type: null, themes: [] };
        const areaMatch    = tagSection.match(/#Area:\s*([^#\n]+)/);
        if (areaMatch)    tags.area    = areaMatch[1].trim();
        const typeMatch    = tagSection.match(/#Type:\s*([^#\n]+)/);
        if (typeMatch)    tags.type    = typeMatch[1].trim();
        const countryMatch = tagSection.match(/#Country:\s*([^#\n]+)/);
        if (countryMatch) tags.country  = countryMatch[1].trim().replace(/^'|'$/g, '');
        const provMatch    = tagSection.match(/#Province:\s*([^#\n]+)/);
        if (provMatch)    tags.province = provMatch[1].trim().replace(/^'|'$/g, '');
        const cityMatch    = tagSection.match(/#City:\s*([^#\n]+)/);
        if (cityMatch)    tags.city     = cityMatch[1].trim().replace(/^'|'$/g, '');
        const themeMatches = tagSection
            .replace(/#Area:[^#\n]+/, '')
            .replace(/#Type:[^#\n]+/, '')
            .replace(/#Country:[^#\n]+/, '')
            .replace(/#Province:[^#\n]+/, '')
            .replace(/#City:[^#\n]+/, '')
            .match(/#([\w\-\.]+)/g);
        if (themeMatches) tags.themes = themeMatches.map(t => t.replace('#', '').trim()).filter(Boolean);
        return (tags.area || tags.type || tags.themes.length > 0) ? tags : null;
    },

    // =========================================================================
    // TAG LINK GENERATION
    // =========================================================================

    generateTagLinks() {
        const links = { areas: [], types: [], themes: [] };
        const canonicalAreas = ['Africa', 'East Asia', 'West Europe', 'Latin America', 'Eurasian Hub', 'North America', 'Indo-Pacific South'];
        canonicalAreas.forEach(area => {
            links.areas.push({
                name: area,
                url: `${window.location.origin}${window.location.pathname}#calendar?area=${encodeURIComponent(area)}`
            });
        });
        const africaSubregions = ['Northern Africa', 'Western Africa', 'Middle Africa', 'Eastern Africa', 'Southern Africa'];
        africaSubregions.forEach(region => {
            links.areas.push({
                name: `Africa → ${region}`,
                url: `${window.location.origin}${window.location.pathname}#calendar?area=Africa&subarea=${encodeURIComponent(region)}`
            });
        });

        const customEvents = JSON.parse(localStorage.getItem('cloudmail_events') || '[]');
        const typeSet  = new Set();
        const themeSet = new Set();
        customEvents.forEach(ev => {
            let tags = ev.tags;
            if (!tags && ev.description) tags = this.parseTagsFromDescription(ev.description);
            if (tags) {
                if (tags.type) typeSet.add(tags.type);
                if (tags.themes && Array.isArray(tags.themes)) tags.themes.forEach(t => themeSet.add(t));
            }
        });

        Array.from(typeSet).sort().forEach(type => {
            links.types.push({ name: type, url: `${window.location.origin}${window.location.pathname}#calendar?type=${encodeURIComponent(type)}` });
        });
        Array.from(themeSet).sort().forEach(theme => {
            links.themes.push({ name: theme, url: `${window.location.origin}${window.location.pathname}#calendar?theme=${encodeURIComponent(theme)}` });
        });
        return links;
    },

    showTagLinks() {
        const links = this.generateTagLinks();
        console.log('=== ALL TAG LINKS ===');
        console.log('Areas:', links.areas);
        console.log('Types:', links.types);
        console.log('Themes:', links.themes);

        let html = '<div style="max-height:600px;overflow-y:auto;padding:20px;font-family:monospace;font-size:12px;">';
        html += '<h3>📍 Areas</h3>';
        links.areas.forEach(item  => { html += `<div style="margin-bottom:8px;"><a href="${item.url}" target="_blank" style="color:#0078d4;">${this.escape(item.name)}</a></div>`; });
        html += '<h3>🎬 Types</h3>';
        links.types.forEach(item  => { html += `<div style="margin-bottom:8px;"><a href="${item.url}" target="_blank" style="color:#107c10;">${this.escape(item.name)}</a></div>`; });
        html += '<h3>🎨 Themes</h3>';
        links.themes.forEach(item => { html += `<div style="margin-bottom:8px;"><a href="${item.url}" target="_blank" style="color:#9c27b0;">${this.escape(item.name)}</a></div>`; });
        html += '</div>';

        const modal  = document.createElement('div');
        modal.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:white;border:1px solid #ddd;border-radius:8px;box-shadow:0 4px 20px rgba(0,0,0,.2);z-index:10000;width:90%;max-width:600px;max-height:700px;overflow:hidden;display:flex;flex-direction:column;';
        const header = document.createElement('div');
        header.style.cssText = 'padding:15px 20px;border-bottom:1px solid #eee;font-weight:bold;font-size:16px;display:flex;justify-content:space-between;align-items:center;';
        header.innerHTML = '🔗 All Tag Links<button style="background:none;border:none;font-size:20px;cursor:pointer;padding:0;width:30px;height:30px;" onclick="this.closest(\'div\').parentElement.remove()">&times;</button>';
        const content = document.createElement('div');
        content.style.cssText = 'flex:1;overflow-y:auto;padding:20px;';
        content.innerHTML = html;
        modal.appendChild(header);
        modal.appendChild(content);
        document.body.appendChild(modal);
    },

    // =========================================================================
    // SEARCH-LIKE NAVIGATION
    // =========================================================================

    searchTagLocation(keyword) {
        if (!keyword || keyword.trim().length === 0) return;
        const query = keyword.toLowerCase().trim();

        const areaRoutes = {
            'africa': 'africa', 'asia': 'asia', 'east asia': 'asia', 'europe': 'europe', 'west europe': 'europe',
            'americas': 'latin-america', 'latin america': 'latin-america', 'eurasian hub': 'eurasian-hub',
            'eurasia & middle east': 'eurasian-hub', 'middle east': 'eurasian-hub', 'middleeast': 'eurasian-hub',
            'eurasian-hub': 'eurasian-hub', 'north america': 'north-america',
            'northamerica': 'northamerica', 'indo-pacific south': 'seasia',
            'southeast asia': 'seasia', 'seasia': 'seasia',
        };
        if (areaRoutes[query]) { window.location.hash = `#${areaRoutes[query]}`; return; }

        const africaSubregions = {
            'northern africa': 'Northern Africa', 'north africa': 'Northern Africa', 'maghreb': 'Northern Africa',
            'western africa': 'Western Africa',   'west africa':  'Western Africa',
            'middle africa':  'Middle Africa',    'central africa': 'Middle Africa',
            'eastern africa': 'Eastern Africa',   'east africa':  'Eastern Africa',
            'southern africa':'Southern Africa',  'south africa region': 'Southern Africa',
        };
        if (africaSubregions[query]) {
            window.location.hash = `#calendar?area=Africa&subarea=${encodeURIComponent(africaSubregions[query])}`;
            return;
        }

        const countryToArea = {
            'egypt':        { area: 'Africa',        subarea: 'Northern Africa', country: 'Egypt' },
            'algeria':      { area: 'Africa',        subarea: 'Northern Africa', country: 'Algeria' },
            'morocco':      { area: 'Africa',        subarea: 'Northern Africa', country: 'Morocco' },
            'sudan':        { area: 'Africa',        subarea: 'Northern Africa', country: 'Sudan' },
            'nigeria':      { area: 'Africa',        subarea: 'Western Africa',  country: 'Nigeria' },
            'ghana':        { area: 'Africa',        subarea: 'Western Africa',  country: 'Ghana' },
            'senegal':      { area: 'Africa',        subarea: 'Western Africa',  country: 'Senegal' },
            'kenya':        { area: 'Africa',        subarea: 'Eastern Africa',  country: 'Kenya' },
            'ethiopia':     { area: 'Africa',        subarea: 'Eastern Africa',  country: 'Ethiopia' },
            'tanzania':     { area: 'Africa',        subarea: 'Eastern Africa',  country: 'Tanzania' },
            'south africa': { area: 'Africa',        subarea: 'Southern Africa', country: 'South Africa' },
            'zimbabwe':     { area: 'Africa',        subarea: 'Southern Africa', country: 'Zimbabwe' },
            'china':        { area: 'East Asia',     country: 'China' },
            'japan':        { area: 'East Asia',     country: 'Japan' },
            'korea':        { area: 'East Asia',     country: 'Korea' },
            'south korea':  { area: 'East Asia',     country: 'South Korea' },
            'taiwan':       { area: 'East Asia',     country: 'Taiwan' },
            'france':       { area: 'West Europe',   country: 'France' },
            'germany':      { area: 'West Europe',   country: 'Germany' },
            'italy':        { area: 'West Europe',   country: 'Italy' },
            'spain':        { area: 'West Europe',   country: 'Spain' },
            'uk':           { area: 'West Europe',   country: 'UK' },
            'usa':          { area: 'North America', country: 'United States' },
            'canada':       { area: 'North America', country: 'Canada' },
            'greenland':    { area: 'North America', country: 'Greenland' },
            'mexico':       { area: 'Latin America', country: 'Mexico' },
            'antarctica':   { area: 'Global',        country: 'Antarctica' },
        };
        if (countryToArea[query]) {
            const loc = countryToArea[query];
            let hash = `#calendar?area=${encodeURIComponent(loc.area)}`;
            if (loc.subarea)  hash += `&subarea=${encodeURIComponent(loc.subarea)}`;
            if (loc.country)  hash += `&country=${encodeURIComponent(loc.country)}`;
            window.location.hash = hash;
            return;
        }

        const cityToLocation = {
            'nairobi':     { area: 'Africa',        subarea: 'Eastern Africa',  country: 'Kenya',         city: 'Nairobi' },
            'cairo':       { area: 'Africa',        subarea: 'Northern Africa', country: 'Egypt',         city: 'Cairo' },
            'lagos':       { area: 'Africa',        subarea: 'Western Africa',  country: 'Nigeria',       city: 'Lagos' },
            'cape town':   { area: 'Africa',        subarea: 'Southern Africa', country: 'South Africa',  city: 'Cape Town' },
            'tokyo':       { area: 'East Asia',     country: 'Japan',           city: 'Tokyo' },
            'beijing':     { area: 'East Asia',     country: 'China',           city: 'Beijing' },
            'paris':       { area: 'West Europe',   country: 'France',          city: 'Paris' },
            'london':      { area: 'West Europe',   country: 'UK',              city: 'London' },
            'new york':    { area: 'North America', country: 'United States',   city: 'New York' },
            'los angeles': { area: 'North America', country: 'United States',   city: 'Los Angeles' },
            'toronto':     { area: 'North America', country: 'Canada',          city: 'Toronto' },
            'vancouver':   { area: 'North America', country: 'Canada',          city: 'Vancouver' },
            'montreal':    { area: 'North America', country: 'Canada',          city: 'Montreal' },
        };
        if (cityToLocation[query]) {
            const loc = cityToLocation[query];
            let hash = `#calendar?area=${encodeURIComponent(loc.area)}`;
            if (loc.subarea)  hash += `&subarea=${encodeURIComponent(loc.subarea)}`;
            if (loc.country)  hash += `&country=${encodeURIComponent(loc.country)}`;
            if (loc.city)     hash += `&city=${encodeURIComponent(loc.city)}`;
            window.location.hash = hash;
            return;
        }

        const currentHashParts = window.location.hash.split('?');
        const currentParams    = new URLSearchParams(currentHashParts[1] || '');
        currentParams.set('q', query);
        window.location.hash = `#calendar?${currentParams.toString()}`;
    },

    // =========================================================================
    // DROPDOWN POPULATION
    // =========================================================================

    populateVideoTagDropdowns() {
        const typeGroups = {};
        const themeSet   = new Set();

        const customEvents = JSON.parse(localStorage.getItem('cloudmail_events') || '[]');
        const processTagSource = (tags) => {
            if (!tags) return;
            if (tags.type) {
                const baseType = tags.type.split(' - ')[0].trim();
                if (!typeGroups[baseType]) typeGroups[baseType] = new Set();
                typeGroups[baseType].add(tags.type);
            }
            if (tags.themes && Array.isArray(tags.themes)) tags.themes.forEach(t => themeSet.add(t));
        };

        customEvents.forEach(ev => {
            let tags = ev.tags;
            if (!tags && ev.description) tags = this.parseTagsFromDescription(ev.description);
            processTagSource(tags);
        });

        const latestItems = window.cloudmailLatestEvents?.items || [];
        latestItems.forEach(item => {
            if (item.extendedProperties?.private?.videoTags) {
                try { processTagSource(JSON.parse(item.extendedProperties.private.videoTags)); } catch(e) {}
            }
        });

        const typeVisSelect = document.getElementById('calendar-tag-type-vis');
        const typeHidSelect = document.getElementById('calendar-tag-type');
        if (typeVisSelect) {
            const currentVal = typeHidSelect?.value || 'all';
            typeVisSelect.innerHTML = '<option value="all">All Types</option>';
            const baseTypes = Object.keys(typeGroups).sort();
            baseTypes.forEach(baseType => {
                const subtypes = Array.from(typeGroups[baseType]).sort();
                const hasSubs  = subtypes.some(s => s !== baseType);
                if (hasSubs) {
                    typeVisSelect.innerHTML += `<option value="base:${this.escape(baseType)}">All ${this.escape(baseType.charAt(0).toUpperCase() + baseType.slice(1))}</option>`;
                    const og = document.createElement('optgroup');
                    og.label = `— ${baseType.charAt(0).toUpperCase() + baseType.slice(1)} subtypes`;
                    subtypes.forEach(sub => {
                        const parts = sub.split(' - ');
                        const label = parts.length > 1 ? parts.slice(1).join(' › ') : sub;
                        const opt   = document.createElement('option');
                        opt.value       = this.escape(sub);
                        opt.textContent = `  ${label}`;
                        og.appendChild(opt);
                    });
                    typeVisSelect.appendChild(og);
                } else {
                    typeVisSelect.innerHTML += `<option value="${this.escape(baseType)}">${this.escape(baseType.charAt(0).toUpperCase() + baseType.slice(1))}</option>`;
                }
            });
            const allVals = new Set(['all', ...baseTypes.map(b => `base:${b}`),
                ...Object.values(typeGroups).flatMap(s => Array.from(s))]);
            typeVisSelect.value = allVals.has(currentVal) ? currentVal : 'all';
            if (typeHidSelect) typeHidSelect.value = typeVisSelect.value;
        }


        this.renderTypeTree();
        this.renderLocationTree();
        this.renderArtStyleTree();
        this._syncFilterSectionsToHash();

        // ── Ensure Type section defaults to closed unless a type filter is active ──
        const activeType = this.state?.calendar?.videoTagsFilter?.type;
        if (!activeType || activeType === 'all') {
            const typeBody = document.getElementById('tag-type-body');
            const typeChev = document.getElementById('tag-type-chev');
            if (typeBody) typeBody.style.display = 'none';
            if (typeChev) typeChev.style.transform = 'rotate(-90deg)';
        }
    },

    // =========================================================================
    // HASH ↔ TYPE FILTER SYNC  (kept here; used by _onTypeTreeClick in
    //                           calendar-type-filter.js via this._syncTypeFilterToHash)
    // =========================================================================

    _syncTypeFilterToHash() {
        const type = this.state.calendar.videoTagsFilter?.type;
        if (!type || type === 'all') {
            if (!this._locationFilter?.area && window.location.hash !== '#calendar') {
                window.history.pushState(null, null, '#calendar');
            }
            return;
        }
        // Convert filter value to a URL slug
        let slug = type;
        if (slug.startsWith('subcat:')) {
            const parts = slug.split(':');
            slug = parts[parts.length - 1];
        }
        slug = slug
            .replace(/^(group:|base:)/, '')
            .toLowerCase()
            .replace(/\s*\(.*?\)/g, '')
            .trim()
            .replace(/\s*-\s*/g, '-')
            .replace(/\s+/g, '-');
        window.history.pushState(null, null, `#${slug}`);
    },

    _slugToTypeFilter(slug) {
        if (!slug || slug.startsWith('artstyle-')) return null;

        const map = {
            'notables':    'subcat:person:Notables',
            'identities':  'subcat:person:Identities',
            'divinities':  'subcat:person:Divinities',
            'people':      'group:Characters',
            'event':       'group:Art & Event',
            'characters':  'group:Characters',
            'items':       'subcat:physical:Items',
            'foods':       'subcat:physical:Foods',
            'vehicles':    'subcat:physical:Vehicles',
            'structures':  'subcat:physical:Structures',
            'destinations':'subcat:physical:Destinations',
            'bird':        'base:bird',
            'mammal':      'base:mammal',
            'fish':        'base:fish',
            'plant':       'base:plant',
        };
        const lowerSlug = slug.toLowerCase();
        if (map[lowerSlug]) return map[lowerSlug];

        // Try the new group-map first
        if (this._TYPE_GROUP_MAP) {
            const slugAsName = slug.replace(/-/g, ' ').toLowerCase();
            
            // Check sub-categories (Notables, etc.)
            const subcats = ['notables', 'identities', 'divinities', 'items', 'foods', 'vehicles', 'structures', 'destinations'];
            if (subcats.includes(slug)) {
                const base = ['notables', 'identities', 'divinities'].includes(slug) ? 'person' : 'physical';
                return `subcat:${base}:${slug.charAt(0).toUpperCase() + slug.slice(1)}`;
            }

            // Check if it maps to a group key exactly
            const groupMeta = this._TYPE_GROUP_META?.find(g =>
                g.key.toLowerCase().replace(/[,& ]+/g, '-') === slug
            );
            if (groupMeta) return `group:${groupMeta.key}`;

            // Check base types in the map
            if (this._TYPE_GROUP_MAP[slugAsName]) return `base:${slugAsName}`;
        }

        // Slow-path: scan loaded event data
        const customEvents = JSON.parse(localStorage.getItem('cloudmail_events') || '[]');
        const latestItems  = window.cloudmailLatestEvents?.items || [];
        const types        = new Set();

        const collect = (tags) => {
            if (!tags?.type) return;
            const base = tags.type.split(' - ')[0].trim().toLowerCase();
            types.add(`base:${base}`);
            types.add(tags.type);
        };
        customEvents.forEach(ev => {
            let t = ev.tags;
            if (!t && ev.description) t = this.parseTagsFromDescription(ev.description);
            collect(t);
        });
        latestItems.forEach(item => {
            if (item.extendedProperties?.private?.videoTags) {
                try { collect(JSON.parse(item.extendedProperties.private.videoTags)); } catch(e) {}
            }
        });

        const toSlug = (str) =>
            str.replace(/^(group:|base:)/, '')
               .toLowerCase()
               .replace(/\s*\(.*?\)/g, '')
               .trim()
               .replace(/\s*-\s*/g, '-')
               .replace(/\s+/g, '-');

        for (const t of types) {
            if (toSlug(t) === slug) return t;
        }

        if (/^[a-z][a-z0-9-]*$/.test(slug)) return `base:${slug.replace(/-/g, ' ')}`;
        return null;
    },

    // =========================================================================
    // THUMBNAIL VIEW
    // =========================================================================



    renderTagThumbnailView() {
        const grid         = document.getElementById('calendar-grid');
        const mapContainer = document.getElementById('calendar-map-container');
        if (!grid) return;

        if (mapContainer) mapContainer.style.display = 'none';
        grid.style.display    = 'block';
        grid.style.padding    = '0';
        grid.style.background = '#fff';
        grid.style.overflowY  = 'auto';
        grid.style.height     = '100%';

        const previewPanel = document.getElementById('calendar-preview-panel');
        if (previewPanel && !this.state.calendar.previewEmailId) {
            previewPanel.classList.remove('active');
            previewPanel.style.display = '';
        }

        const tf   = this.state.calendar.videoTagsFilter || {};
        const locF = this._locationFilter || {};
        const artStyleF = tf.artStyle;

        // --- NEW: Handle "All Philosophies" special view ---
        if (artStyleF === 'all_philosophies') {
            const label = document.getElementById('calendar-range-label');
            if (label) label.innerHTML = '🎨 All Philosophies Browser';
            
            grid.style.background = '#0f172a'; // Match browser dark mode
            grid.innerHTML = `<iframe src="/art-style-browser.html" style="width:100%;height:100%;border:none;border-radius:0;"></iframe>`;
            return;
        }
        // ---------------------------------------------------

        // Normalise any subArea/country mix-up
        if (!locF.subArea && locF.country) {
            if (locF.area === 'West Europe' && locF.country.includes('Europe')) {
                locF.subArea = locF.country; locF.country = null;
            } else if (locF.area === 'Latin America' && ['South America','Central America & Mexico','Caribbean'].includes(locF.country)) {
                locF.subArea = locF.country; locF.country = null;
            } else if (locF.area === 'Eurasian Hub' && ['Eastern Europe','Central Asia','Middle East','Caucasus'].includes(locF.country)) {
                locF.subArea = locF.country; locF.country = null;
            }
        }

        const customEvents = JSON.parse(localStorage.getItem('cloudmail_events') || '[]');

        // Merge Google Calendar events (cloudmailLatestEvents) into the pool
        const latestItems = (window.cloudmailLatestEvents?.items || []).map(item => {
            let tags = null;
            if (item.extendedProperties?.private?.videoTags) {
                try { tags = JSON.parse(item.extendedProperties.private.videoTags); } catch(e) {}
            }
            if (!tags && item.description) tags = this.parseTagsFromDescription(item.description);
            return {
                id: item.id,
                title: item.summary || '',
                date: item.start?.date || item.start?.dateTime?.split('T')[0] || '',
                description: item.description || '',
                location: item.location || '',
                tags,
                isGoogleSync: true,
                isAllDay: item.start && !!item.start.date,
                extendedProperties: item.extendedProperties,
                attachments: item.attachments,
                wikiTags: item.wikiTags,
                _rawItem: item
            };
        });

        const seenIds = new Set(customEvents.map(e => e.id).filter(Boolean));
        const allEvents = [...customEvents, ...latestItems.filter(e => !seenIds.has(e.id))];

        // ── 1. Filter events ──────────────────────────────────────────────────
        const matching = allEvents.filter(ev => {
            const rawForImage = ev._rawItem || ev;

            let evTags = ev.tags;
            if (!evTags && ev.extendedProperties?.private?.videoTags) {
                try { evTags = JSON.parse(ev.extendedProperties.private.videoTags); } catch(e) {}
            }
            if (!evTags && ev.description) evTags = this.parseTagsFromDescription(ev.description);

            const { area: evArea, loc } = this._resolveArea(evTags?.area, ev.location, ev.summary || ev.title || '');
            if (evTags) {
                if (!evTags.area) evTags.area = evArea;
                if (!evTags.country || evTags.country === 'Unknown') {
                    if (loc?.country && this._countryToArea(loc.country)) evTags.country = loc.country;
                }
            }

            if (locF.area) {
                const { area: evArea2, loc: loc2 } = this._resolveArea(evTags?.area, ev.location, ev.summary || ev.title || '');
                if (evArea2 !== locF.area) return false;

                if (locF.subArea) {
                    let evSA      = loc2?.subArea;
                    let evCountry = this._normalizeCountryName((evTags?.country && evTags?.country !== 'Unknown') ? evTags.country : loc2?.country);
                    let evProvince = (evTags?.province && evTags?.province !== 'Unknown Province' && evTags?.province !== 'Other Region') ? evTags.province : loc2?.province;
                    if (evProvince === 'Québec') evProvince = 'Quebec';
                    const evCity = (evTags?.city && evTags?.city !== 'Unknown City') ? evTags.city : loc2?.city;

                    if      (evArea2 === 'Africa')          evSA = this._getAfricanSubRegion(evCountry, evCity);
                    else if (evArea2 === 'West Europe') {
                        let euroCountry = evCountry;
                        if (!euroCountry || euroCountry === 'Unknown' || euroCountry === 'Unknown Country')
                            euroCountry = this._inferEuropeCountryFromTitle(ev.summary || ev.title || '');
                        evSA = this._getEuropeanSubRegion(euroCountry);
                    }
                    else if (evArea2 === 'Latin America')   evSA = this._getLatinAmericaSubRegion(evCountry);
                    else if (evArea2 === 'Eurasian Hub')    evSA = this._getEurasiaMiddleEastSubRegion(evCountry);
                    else if (evCountry === 'China')         evSA = this._getChinaSubRegion(evProvince || evCity);
                    else if (evCountry === 'Japan')         evSA = this._getJapanSubRegion(evProvince || evCity);
                    else if (evCountry === 'South Korea' || evCountry === 'Korea') evSA = this._getKoreaSubRegion(evProvince || evCity);
                    else if (evCountry === 'North Korea')   evSA = this._getNorthKoreaSubRegion(evProvince || evCity);
                    else if (evCountry === 'Taiwan')        evSA = this._getTaiwanSubRegion(evProvince || evCity);
                    else if (evCountry === 'Russia (Asia)') evSA = this._getRussiaAsiaSubRegion(evProvince || evCity);
                    else if (evCountry === 'Mongolia')      evSA = this._getMongoliaSubRegion(evProvince || evCity);
                    else if (evArea2 === 'North America' && ['United States','USA','US'].includes(evCountry))
                        evSA = this._getUSASubRegion(evProvince || evCity);
                    else if (evArea2 === 'Indo-Pacific South')
                        evSA = this._getIndoPacificSubRegion(evCountry);

                    if (!evSA || evSA.toLowerCase() !== locF.subArea.toLowerCase()) return false;

                    if (locF.province && this._INDOPACIFIC_COUNTRY_SUBREGIONS[locF.country]) {
                        const evCSR = this._getIndoPacificCountrySubRegion(locF.country, evTags?.province || loc2?.province || loc2?.city || evTags?.city);
                        if (!evCSR || evCSR.toLowerCase() !== locF.province.toLowerCase()) return false;
                    }
                }

                let matchCountry  = this._normalizeCountryName((evTags?.country && evTags?.country !== 'Unknown') ? evTags.country : loc2?.country);
                if (matchCountry) {
                    const low = matchCountry.toLowerCase();
                    if (evArea2 === 'North America' && low === 'georgia') matchCountry = 'United States';
                    else if (evArea2 === 'West Europe' && low === 'vatican city') matchCountry = 'Vatican';
                }
                const matchProvince = (evTags?.province && evTags?.province !== 'Unknown Province' && evTags?.province !== 'Other Region') ? evTags.province : loc2?.province;
                const matchCity     = (evTags?.city && evTags?.city !== 'Unknown City') ? evTags.city : loc2?.city;
                if (locF.country  && matchCountry?.toLowerCase()  !== locF.country.toLowerCase())  return false;
                if (locF.province && matchProvince?.toLowerCase() !== locF.province.toLowerCase()) return false;
                if (locF.city     && matchCity?.toLowerCase()     !== locF.city.toLowerCase())     return false;
            } else if (tf.area && tf.area !== 'all') {
                if (evTags?.area !== tf.area) return false;
            }

            // ── Type filter: delegate to calendar-type-filter.js ──────────────
            if (tf.type && tf.type !== 'all') {
                const evType = evTags?.type || '';
                if (!this._typeMatchesFilter(evType, tf.type)) return false;
            }



            // Unified Art Style filter
            const artStyleF = tf.artStyle;
            if (artStyleF && artStyleF !== 'all') {
                if (!this._artStyleMatchesFilter(ev, artStyleF)) return false;
            }

            // Music Style filter
            if (this._musicStyleFilter) {
                const mFilter = this._musicStyleFilter;
                const directStyles = ev.musicStyles || [];
                const dateStr = ev.start?.date || (ev.start?.dateTime?.substring(0, 10)) || ev.date;
                const isAllDay = ev.isAllDay || (ev.start && !!ev.start.date);
                const mapStyles = (isAllDay && this._MS_EVENT_MAP) ? (this._MS_EVENT_MAP[dateStr] || []) : [];
                if (!directStyles.includes(mFilter) && !mapStyles.includes(mFilter)) return false;
            }

            // Wiki Category Filter
            if (this._wikiStyleFilter) {
                const wFilter = this._wikiStyleFilter;
                const wikiTags = ev.wikiTags || ev._rawItem?.wikiTags;
                if (!wikiTags || !wikiTags.main) return false;
                
                if (wFilter.level === 'main') {
                    if (wikiTags.main !== wFilter.value) return false;
                } else if (wFilter.level === 'sub1') {
                    const parts = wFilter.value.split('::');
                    if (wikiTags.main !== parts[0] || (wikiTags.sub1 || 'Uncategorized') !== parts[1]) return false;
                } else if (wFilter.level === 'sub2') {
                    const parts = wFilter.value.split('::');
                    if (wikiTags.main !== parts[0] || 
                        (wikiTags.sub1 || 'Uncategorized') !== parts[1] ||
                        (wikiTags.sub2 || 'Uncategorized') !== parts[2]) return false;
                }
            }

            if (tf.keyword) {
                const q = tf.keyword.toLowerCase();
                if (!(ev.title||'').toLowerCase().includes(q) && !(ev.description||'').toLowerCase().includes(q)) return false;
            }
            return true;
        });

        matching.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

        // ── 2. Range label ────────────────────────────────────────────────────
        const label = document.getElementById('calendar-range-label');
        if (label) {
            let segments = [];
            if (['East Asia','North America','Indo-Pacific South'].includes(locF.area)) {
                segments = [
                    { key: 'area',     val: locF.area },     { key: 'country',  val: locF.country },
                    { key: 'subArea',  val: locF.subArea },  { key: 'province', val: locF.province },
                    { key: 'city',     val: locF.city },
                ].filter(s => s.val);
            } else {
                segments = [
                    { key: 'area',     val: locF.area },     { key: 'subArea',  val: locF.subArea },
                    { key: 'country',  val: locF.country },  { key: 'province', val: locF.province },
                    { key: 'city',     val: locF.city },
                ].filter(s => s.val);
            }

            // Build type label for extra filter display
            let typeDisplayLabel = null;
            if (tf.type && tf.type !== 'all') {
                if (tf.type.startsWith('group:')) {
                    typeDisplayLabel = tf.type.slice(6);
                } else if (tf.type.startsWith('base:')) {
                    const b = tf.type.slice(5);
                    typeDisplayLabel = 'All ' + b.charAt(0).toUpperCase() + b.slice(1);
                } else {
                    typeDisplayLabel = tf.type;
                }
            }

            const extra = [
                typeDisplayLabel,
                this._getArtStyleDisplayLabel ? this._getArtStyleDisplayLabel(tf.artStyle) : null,
                this._musicStyleFilter ? `Music: ${this._musicStyleFilter}` : null,
                tf.keyword ? `Search: "${tf.keyword}"` : null,
            ].filter(Boolean);
            const extraStr = extra.length > 0 ? ` · ${extra.join(' · ')}` : '';

            const BREADCRUMB_POP = {
                'ontario':'14.2M','quebec':'8.5M','british columbia':'5.2M','alberta':'4.4M',
                'california':'39M','texas':'30M','florida':'22.6M','new york':'19.8M',
                'nigeria':'223M','ethiopia':'126M','egypt':'113M','south africa':'60M',
                'kenya':'55M','tanzania':'67M','morocco':'38M','ghana':'34M',
                'kanto (关东地方)':'43M','kansai/kinki (关西/近畿)':'22M',
                'sudogwon (首都圈)':'26M','north india (北印度)':'450M',
                'south india (南印度)':'280M','java (爪哇)':'156M',
                'eastern australia (澳大利亚东部)':'18M',
            };

            if (segments.length === 0) {
                label.innerHTML = `📍 All Locations${extraStr} (${matching.length})`;
            } else {
                const links = segments.map((seg, idx) => {
                    const p = new URLSearchParams();
                    for (let i = 0; i <= idx; i++) {
                        const s = segments[i];
                        if (s.key === 'area')          p.set('area',     s.val);
                        else if (s.key === 'country')  p.set('country',  s.val);
                        else if (s.key === 'subArea')  p.set('subarea',  s.val);
                        else if (s.key === 'province') p.set('province', s.val);
                        else if (s.key === 'city')     p.set('city',     s.val);
                    }
                    const hash   = `#calendar?${p.toString().replace(/\+/g, '%20')}`;
                    const pop    = BREADCRUMB_POP[seg.val.toLowerCase()];
                    const popStr = pop ? ` <span style="font-size:9px;color:#999;font-weight:400;">${pop}</span>` : '';
                    const isLast = idx === segments.length - 1;
                    if (isLast) return `<span style="font-weight:700;color:#1a1a2e;">${this.escape(seg.val)}</span>${popStr}`;
                    return `<a href="${hash}" style="color:#0078d4;text-decoration:none;font-weight:600;" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration='none'">${this.escape(seg.val)}</a>${popStr}`;
                });
                label.innerHTML = `📍 ${links.join(' → ')}${extraStr} <span style="color:#888;">(${matching.length})</span>`;
            }
        }

        // ── 3. Subgroup label helper ──────────────────────────────────────────
        const getSubgroupLabel = (ev) => {
            let evTags = ev.tags;
            if (!evTags && ev.extendedProperties?.private?.videoTags) {
                try { evTags = JSON.parse(ev.extendedProperties.private.videoTags); } catch(e) {}
            }
            if (!evTags && ev.description) evTags = this.parseTagsFromDescription(ev.description);
            const { area: evArea, loc } = this._resolveArea(evTags?.area, ev.location, ev.summary || ev.title || '');
            
            // ── Art Style filter grouping ──────────────────────────────────────────
            const artStyleF = tf.artStyle;
            if (artStyleF && artStyleF !== 'all' && !locF.area) {
                const label = this._artStyleSubgroupLabel
                    ? this._artStyleSubgroupLabel(ev, artStyleF)
                    : null;
                // null means leaf-level filter (single style) → flat grid
                return label !== undefined ? label : null;
            }

            if (tf.type && tf.type !== 'all' && !locF.area) {
                const rawType = evTags?.type || '';
                const evType = this._normalizeTypeTag ? this._normalizeTypeTag(rawType) : rawType;
                if (evType) {
                    if (tf.type.startsWith('group:')) {
                        const c = this._classifyType ? this._classifyType(evType) : null;
                        if (c && c.base) return c.base.charAt(0).toUpperCase() + c.base.slice(1);
                    } else if (tf.type.startsWith('base:')) {
                        const baseType = tf.type.slice(5).toLowerCase();
                        const c = this._classifyType ? this._classifyType(evType) : null;
                        if (c && c.base === baseType && this._getLeafParts) {
                            const leafParts = this._getLeafParts(evType, baseType);
                            if (this._TYPE_SUBCATS && this._TYPE_SUBCATS[baseType] && leafParts.length > 0) {
                                const leafName = leafParts.join(' - ');
                                const subcatMap = this._TYPE_SUBCATS[baseType];
                                const subcat = subcatMap[leafName] || subcatMap[leafParts[0]];
                                if (subcat) return subcat;
                                return 'Other';
                            }
                            if (leafParts.length > 0) return 'Other';
                        }
                    }
                }
            }

            let finalC    = (evTags?.country && evTags?.country !== 'Unknown') ? evTags.country : loc?.country;
            let finalP    = (evTags?.province && evTags?.province !== 'Unknown Province' && evTags?.province !== 'Other Region') ? evTags.province : loc?.province;
            if (finalP === 'Québec') finalP = 'Quebec';
            let finalCity = (evTags?.city && evTags?.city !== 'Unknown City') ? evTags.city : loc?.city;

            if (finalC) {
                finalC    = this._normalizeCountryName(finalC);
                const lowC = finalC.toLowerCase();
                const usStates = new Set(['alabama','alaska','arizona','arkansas','california','colorado','connecticut','delaware','florida','georgia','hawaii','idaho','illinois','indiana','iowa','kansas','kentucky','louisiana','maine','maryland','massachusetts','michigan','minnesota','mississippi','missouri','montana','nebraska','nevada','new hampshire','new jersey','new mexico','new york','north carolina','north dakota','ohio','oklahoma','oregon','pennsylvania','rhode island','south carolina','south dakota','tennessee','texas','utah','vermont','virginia','washington','west virginia','wisconsin','wyoming','district of columbia','washington dc','washington d.c.']);
                const caProvinces = new Set(['ontario','quebec','british columbia','alberta','manitoba','saskatchewan','nova scotia','new brunswick','newfoundland and labrador','prince edward island','northwest territories','nunavut','yukon']);
                if (usStates.has(lowC) && evArea === 'North America') { finalP = finalC; finalC = 'United States'; }
                else if (caProvinces.has(lowC))                        { finalP = finalC; finalC = 'Canada'; }
            }
            if (finalP === 'Unknown Province') finalP = 'Other Region';

            if (!locF.area) return evArea || 'Unknown';

            const area = locF.area;
            if (area === 'Africa') {
                if (!locF.subArea)  return this._getAfricanSubRegion(finalC, finalCity) || 'Other Africa';
                if (!locF.country)  return finalC || 'Unknown Country';
                return finalCity || null;
            }
            if (area === 'East Asia') {
                if (!locF.country) return finalC || 'Unknown Country';
                if (!locF.subArea) {
                    if (finalC === 'China')          return this._getChinaSubRegion(finalP || finalCity);
                    if (finalC === 'Japan')          return this._getJapanSubRegion(finalP || finalCity);
                    if (finalC === 'South Korea' || finalC === 'Korea') return this._getKoreaSubRegion(finalP || finalCity);
                    if (finalC === 'North Korea')    return this._getNorthKoreaSubRegion(finalP || finalCity);
                    if (finalC === 'Taiwan')         return this._getTaiwanSubRegion(finalP || finalCity);
                    if (finalC === 'Russia (Asia)')  return this._getRussiaAsiaSubRegion(finalP || finalCity);
                    if (finalC === 'Mongolia')       return this._getMongoliaSubRegion(finalP || finalCity);
                    return loc?.subArea || 'Other';
                }
                if (!locF.province) return finalP || 'Other Region';
                return finalCity || null;
            }
            if (area === 'West Europe') {
                if (!locF.subArea) {
                    let euroCountry = finalC;
                    if (!euroCountry || euroCountry === 'Unknown' || euroCountry === 'Unknown Country')
                        euroCountry = this._inferEuropeCountryFromTitle(ev.summary || ev.title || '');
                    return this._getEuropeanSubRegion(euroCountry) || 'Other Europe';
                }
                if (!locF.country) {
                    let c = finalC;
                    if (!c || c === 'Unknown' || c === 'Unknown Country') c = this._inferEuropeCountryFromTitle(ev.summary || ev.title || '');
                    if (c) {
                        const lowC = c.toLowerCase();
                        if (['uk','england','scotland','wales','northern ireland','great britain'].includes(lowC)) c = 'United Kingdom';
                        if (lowC === 'bosnia')       c = 'Bosnia and Herzegovina';
                        if (lowC === 'czechia')      c = 'Czech Republic';
                        if (lowC === 'vatican city') c = 'Vatican';
                    }
                    return c || 'Unknown Country';
                }
                const lowC = (locF.country || '').toLowerCase();
                if (['germany','france','united kingdom','italy','spain'].includes(lowC) && !locF.province) return finalP || 'Other Region';
                return finalCity || null;
            }
            if (area === 'Eurasian Hub') {
                if (!locF.subArea)  return this._getEurasiaMiddleEastSubRegion(finalC) || 'Other Eurasia';
                if (!locF.country)  return finalC || 'Unknown Country';
                return finalCity || null;
            }
            if (area === 'Latin America') {
                if (!locF.subArea)  return this._getLatinAmericaSubRegion(finalC) || 'Other Latin America';
                if (!locF.country)  return finalC || 'Unknown Country';
                const lowC = (locF.country || '').toLowerCase();
                if (['brazil','mexico','argentina','colombia','peru','chile'].includes(lowC) && !locF.province) return finalP || 'Other Region';
                return finalCity || null;
            }
            if (area === 'North America') {
                if (!locF.country) return finalC || 'Unknown Country';
                const lowC = (locF.country || '').toLowerCase();
                if (['united states','usa'].includes(lowC)) {
                    if (!locF.subArea)  return this._getUSASubRegion(finalP || finalCity) || 'Other Region';
                    if (!locF.province) return finalP || 'Other Region';
                    return finalCity || null;
                }
                if (lowC === 'canada' && !locF.province) return finalP || 'Other Region';
                return finalCity || null;
            }
            if (area === 'Indo-Pacific South') {
                if (!locF.subArea)  return this._getIndoPacificSubRegion(finalC) || 'Other Indo-Pacific';
                if (!locF.country)  return finalC || 'Unknown Country';
                if (!locF.province) {
                    const csr = this._getIndoPacificCountrySubRegion(locF.country, finalP || finalCity);
                    if (csr && this._INDOPACIFIC_COUNTRY_SUBREGIONS[locF.country]) return csr;
                }
                return finalCity || null;
            }
        };

        // ── 4. Bucket events by subgroup ──────────────────────────────────────
        const NO_GROUP = '_FLAT_';
        const groups   = new Map();
        matching.forEach(ev => {
            const key = getSubgroupLabel(ev) || NO_GROUP;
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key).push(ev);
        });

        // ── 8. Handle Empty State (check BEFORE preseed adds phantom groups) ──
        if (matching.length === 0) {
            let styleBannerHtml = '';
            if (artStyleF && artStyleF !== 'all') {
                styleBannerHtml = this._buildArtStyleBanner ? this._buildArtStyleBanner(artStyleF) : '';

                if (!styleBannerHtml) {
                    // Derive style name from the filter value or URL hash
                    let styleNameGuess = '';
                    if (artStyleF.startsWith('r:style:') || artStyleF.startsWith('p:style:')) {
                        const parts = artStyleF.split(':');
                        styleNameGuess = parts[parts.length - 1];
                    } else if (artStyleF.startsWith('r:tier:')) {
                        const parts = artStyleF.split(':');
                        styleNameGuess = parts[parts.length - 1];
                    } else if (artStyleF.startsWith('r:area:')) {
                        styleNameGuess = artStyleF.slice(7);
                    }
                    // Last resort: parse from URL hash  e.g. #artstyle-classical--traditional
                    if (!styleNameGuess) {
                        const hashSlug = window.location.hash.replace(/^#/, '').replace(/^artstyle-/, '');
                        styleNameGuess = hashSlug.replace(/--/g, ' · ').replace(/-/g, ' ');
                    }
                    if (styleNameGuess) {
                        styleBannerHtml = `<div style="margin-bottom:16px;border-radius:10px;overflow:hidden;position:relative;width:100%;height:180px;background:#1a1a2e;box-shadow:0 4px 20px rgba(0,0,0,0.22);">
                            ${this._styleThumbHtml(styleNameGuess)}
                            <div style="position:absolute;inset:0;background:linear-gradient(to bottom,rgba(0,0,0,0.1) 0%,transparent 40%,rgba(0,0,0,0.90) 100%);pointer-events:none;"></div>
                            <div style="position:absolute;bottom:0;left:0;right:0;padding:28px 22px 20px;color:#fff;pointer-events:none;">
                                <div style="font-size:10px;color:rgba(255,255,255,0.6);text-transform:uppercase;letter-spacing:1.6px;margin-bottom:8px;font-weight:700;">✦ Art Style</div>
                                <div style="font-size:26px;font-weight:800;letter-spacing:-.02em;margin-bottom:6px;text-shadow:0 2px 12px rgba(0,0,0,.7);">${this.escape(styleNameGuess.replace(/\b\w/g, c => c.toUpperCase()))}</div>
                                <div style="font-size:12px;color:rgba(255,255,255,0.55);font-style:italic;">No videos tagged with this style yet</div>
                            </div>
                            <div style="position:absolute;top:14px;right:14px;">
                                <span style="background:rgba(255,255,255,0.10);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,0.20);border-radius:20px;padding:5px 14px;font-size:10px;color:#fff;font-weight:700;letter-spacing:.7px;text-transform:uppercase;">Style Filter Active</span>
                            </div>
                        </div>`;
                    }
                }
            }
            grid.innerHTML = `<div style="padding:8px;">
                ${styleBannerHtml}
                ${!styleBannerHtml ? `<div style="display:flex;align-items:center;justify-content:center;height:300px;color:#bbb;font-size:13px;"><i class="fas fa-film" style="margin-right:8px;"></i>No videos found.</div>` : ''}
            </div>`;
            return;
        }

        this._preseedGroups(groups, locF);

        // ── 9. Order groups ───────────────────────────────────────────────────
        const SECTION_POP = this._getSectionPopTable();
        let orderedKeys   = Array.from(groups.keys());
        const isFlat      = orderedKeys.length === 1 && orderedKeys[0] === NO_GROUP;

        if (!isFlat) {
            const tail = new Set(['Unknown','Unknown Country','Other Region','Other','Other Africa','Other Indo-Pacific',NO_GROUP]);
            orderedKeys.sort((a, b) => {
                const aT = tail.has(a), bT = tail.has(b);
                if (aT && !bT) return 1;
                if (!aT && bT) return -1;
                const hasA = groups.get(a).length > 0, hasB = groups.get(b).length > 0;
                if (hasA && !hasB) return -1;
                if (!hasA && hasB) return 1;
                const popA = SECTION_POP[a.toLowerCase()] || 0;
                const popB = SECTION_POP[b.toLowerCase()] || 0;
                if (popA !== popB) return popB - popA;
                return a.localeCompare(b);
            });
        }

        // ── 10. Colour palette ────────────────────────────────────────────────
        const PALETTE = [
            { bg: '#e8f4fd', color: '#0369a1', border: '#7dd3fc' },
            { bg: '#f0fdf4', color: '#166534', border: '#86efac' },
            { bg: '#fdf4ff', color: '#7e22ce', border: '#d8b4fe' },
            { bg: '#fff7ed', color: '#9a3412', border: '#fdba74' },
            { bg: '#fefce8', color: '#854d0e', border: '#fde047' },
            { bg: '#f0f9ff', color: '#075985', border: '#38bdf8' },
            { bg: '#fdf2f8', color: '#9d174d', border: '#f9a8d4' },
        ];
        const badgeColors = new Map();
        orderedKeys.forEach((key, i) => badgeColors.set(key, PALETTE[i % PALETTE.length]));

        const SECTION_ICONS = this._getSectionIcons();
        const defaultIcon   = 'fas fa-map-marker-alt';

        // ── 11. Card renderer ─────────────────────────────────────────────────
        const renderCard = (ev, subgroupKey) => {
            const dateKey = ev.date || '';

            // When art style filter is active, show the style's grid image, not the cover
            let imgResult;
            if (artStyleF && artStyleF !== 'all') {
                const styleUrl = this._getEventArtStyleThumbUrl(ev);
                if (styleUrl) {
                    const isDrive = styleUrl && !styleUrl.startsWith('/api/') && !styleUrl.startsWith('/style-images/');
                    imgResult = {
                        fileUrl:    styleUrl,
                        googleUrl:  isDrive ? styleUrl : null,
                        isGrid:     true
                    };
                } else {
                    imgResult = this.resolveEventImageUrl(ev._rawItem || ev, dateKey);
                }
            } else {
                imgResult = this.resolveEventImageUrl(ev._rawItem || ev, dateKey);
                if (!imgResult && this._getEventArtStyleThumbUrl) {
                    const styleUrl = this._getEventArtStyleThumbUrl(ev);
                    if (styleUrl) {
                        const isDrive = styleUrl && !styleUrl.startsWith('/api/') && !styleUrl.startsWith('/style-images/');
                        imgResult = {
                            fileUrl:    styleUrl,
                            googleUrl:  isDrive ? styleUrl : null,
                            isGrid:     true
                        };
                    }
                }
            }

            const thumbSrc = imgResult ? imgResult.fileUrl : null;
            const title     = this.escape(ev.title || '(No Title)');

            let evTags = ev.tags;
            if (!evTags && ev.extendedProperties?.private?.videoTags) {
                try { evTags = JSON.parse(ev.extendedProperties.private.videoTags); } catch(e) {}
            }
            if (!evTags && ev.description) evTags = this.parseTagsFromDescription(ev.description);
            const { area: evArea, loc } = this._resolveArea(evTags?.area, ev.location, ev.summary || ev.title || '');
            if (evTags && evTags.province === 'Unknown Province') evTags.province = 'Other Region';
            if (loc    && loc.province    === 'Unknown Province') loc.province    = 'Other Region';
            if (evTags && evTags.province === 'Québec') evTags.province = 'Quebec';
            if (loc    && loc.province    === 'Québec') loc.province    = 'Quebec';
            if (evTags) {
                if (!evTags.area) evTags.area = evArea;
                if (!evTags.country || evTags.country === 'Unknown') {
                    if (loc?.country && this._countryToArea(loc.country))
                        evTags.country = this._normalizeCountryName(loc.country);
                } else {
                    evTags.country = this._normalizeCountryName(evTags.country);
                }
            }

            const areaLabel = evTags?.area
                ? `<span style="background:#0078d411;color:#0078d4;border:1px solid #0078d4;border-radius:10px;padding:1px 5px;font-size:9px;font-weight:600;">${this.escape(evTags.area)}</span>`
                : '';
            const typeLabel = evTags?.type
                ? `<span style="background:#107c1011;color:#107c10;border:1px solid #107c10;border-radius:10px;padding:1px 5px;font-size:9px;font-weight:600;">${this.escape(evTags.type.split(' - ')[0])}</span>`
                : '';
            const wikiTags = ev.wikiTags || ev._rawItem?.wikiTags;
            const wikiLabel = wikiTags?.main
                ? `<span style="background:#f3f4f6;color:#374151;border:1px solid #d1d5db;border-radius:10px;padding:1px 5px;font-size:9px;font-weight:600;" title="${this.escape(wikiTags.sub1 || '')}"><i class="fab fa-wikipedia-w" style="margin-right:2px;font-size:8px;"></i>${this.escape(wikiTags.main)}</span>`
                : '';

            let subgroupBadge = '';
            if (!isFlat && subgroupKey && subgroupKey !== NO_GROUP) {
                const bc = badgeColors.get(subgroupKey);
                if (bc) {
                    let displayLabel = subgroupKey === NO_GROUP ? 'Other' : subgroupKey;
                    const c = evTags?.country || loc?.country;
                    if (['China','Japan','South Korea','Korea','Taiwan','North Korea','Russia (Asia)','Mongolia'].includes(c)) {
                        let sub = loc?.subArea;
                        if (!sub) {
                            if (c === 'China')          sub = this._getChinaSubRegion(loc?.province || evTags?.province || loc?.city || evTags?.city);
                            if (c === 'Japan')          sub = this._getJapanSubRegion(loc?.province || evTags?.province || loc?.city || evTags?.city);
                            if (c === 'South Korea' || c === 'Korea') sub = this._getKoreaSubRegion(loc?.province || evTags?.province || loc?.city || evTags?.city);
                            if (c === 'North Korea')    sub = this._getNorthKoreaSubRegion(loc?.province || evTags?.province || loc?.city || evTags?.city);
                            if (c === 'Taiwan')         sub = this._getTaiwanSubRegion(loc?.province || evTags?.province || loc?.city || evTags?.city);
                            if (c === 'Russia (Asia)')  sub = this._getRussiaAsiaSubRegion(loc?.province || evTags?.province || loc?.city || evTags?.city);
                            if (c === 'Mongolia')       sub = this._getMongoliaSubRegion(loc?.province || evTags?.province || loc?.city || evTags?.city);
                        }
                        const prov = loc?.province || evTags?.province;
                        const cit  = loc?.city     || evTags?.city;
                        const chain = [sub, prov, cit].filter(Boolean);
                        if (chain.length > 0 && locF.area === 'East Asia' && !locF.subArea) displayLabel = chain.join(' - ');
                        else if (chain.length > 1 && locF.subArea) displayLabel = [prov, cit].filter(Boolean).join(' - ');
                    }
                    subgroupBadge = `<span style="background:${bc.bg};color:${bc.color};border:1px solid ${bc.border};border-radius:10px;padding:1px 5px;font-size:9px;font-weight:600;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${this.escape(displayLabel)}">${this.escape(displayLabel)}</span>`;
                }
            }

            let styleLabel = artStyleF && artStyleF !== 'all' ? (this._getArtStyleDisplayLabel(artStyleF) || '') : '';
            if (!styleLabel) {
                const allTags = this._parseArtPhilTagsAll ? this._parseArtPhilTagsAll(ev._rawItem || ev) : [];
                if (allTags && allTags.length > 0) {
                    styleLabel = allTags[0].style;
                }
            }
            const fallbackUrl = styleLabel ? `/api/style-image/${encodeURIComponent(styleLabel)}` : '';

            const imgSources = [
                imgResult?.googleUrl,
                imgResult?.fileUrl,
                fallbackUrl
            ].filter(Boolean);

            const thumbEl = imgSources.length > 0
                ? `<img src="${imgSources[0]}"
                     data-sources='${JSON.stringify(imgSources)}'
                     data-src-idx="0"
                     onerror="
                        const srcs = JSON.parse(this.dataset.sources || '[]');
                        const next = (this.dataset.srcIdx | 0) + 1;
                        if (next < srcs.length) {
                            this.dataset.srcIdx = next;
                            this.src = srcs[next];
                        } else {
                            this.style.display='none';
                            const p = this.closest('.card-img-container');
                            if (p) p.style.background='#f0f0f0';
                        }"
                     style="width:100%;height:80px;object-fit:cover;display:block;" />`
                : (ev.id && ev.isGoogleSync && ev.isAllDay ? App._renderCFPlaceholder(ev.id, ev.title || '') : '');

            return `
            <div onclick="event.stopPropagation(); App.openCalendarPreview('${ev.id}')"
                 style="cursor:pointer;background:#fff;border:1px solid #e8e8e8;border-radius:6px;overflow:hidden;transition:transform .15s,box-shadow .15s;"
                 onmouseenter="this.style.transform='scale(1.02)';this.style.boxShadow='0 4px 12px rgba(0,0,0,.12)'"
                 onmouseleave="this.style.transform='';this.style.boxShadow=''">
                ${thumbEl}
                <div style="padding:5px 6px;">
                    <div style="font-size:11px;font-weight:600;color:#333;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:2px;" title="${title}">${title}</div>
                    <div style="font-size:9px;color:#999;margin-bottom:2px;">${dateKey}</div>
                    <div style="display:flex;flex-wrap:wrap;gap:2px;">${subgroupBadge}${areaLabel}${typeLabel}${wikiLabel}</div>
                </div>
            </div>`;
        };

        // ── 12. Build HTML ────────────────────────────────────────────────────
        const topBannerHtml = (!locF.area && artStyleF && artStyleF !== 'all')
            ? this._buildArtStyleBanner(artStyleF) : '';

        let html = '<div style="padding:8px;">' + topBannerHtml;

        if (isFlat) {
            html += `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:5px;">`;
            groups.get(NO_GROUP).forEach(ev => { html += renderCard(ev, null); });
            html += `</div>`;
        } else {
            orderedKeys.forEach(groupKey => {
                const evs     = groups.get(groupKey);
                const display = groupKey === NO_GROUP ? 'Other' : groupKey;
                const icon    = SECTION_ICONS[display] || defaultIcon;
                const count   = evs.length;
                const bc      = badgeColors.get(groupKey);

                let linkHash = null;
                if (display !== 'Other' && !display.startsWith('Unknown')) {
                    let p = new URLSearchParams();
                    if (locF.area)     p.set('area',     locF.area);
                    if (locF.subArea)  p.set('subarea',  locF.subArea);
                    if (locF.country)  p.set('country',  locF.country);
                    if (locF.province) p.set('province', locF.province);

                    if (!locF.area) p.set('area', groupKey);
                    else if (['Africa','West Europe','Latin America','Eurasian Hub'].includes(locF.area)) {
                        if (!locF.subArea)  p.set('subarea',  groupKey);
                        else if (!locF.country) p.set('country', groupKey);
                        else if (locF.area === 'West Europe'  && ['germany','france','united kingdom','italy','spain'].includes((locF.country||'').toLowerCase()) && !locF.province) p.set('province', groupKey);
                        else if (locF.area === 'Latin America' && ['brazil','mexico','argentina','colombia','peru','chile'].includes((locF.country||'').toLowerCase()) && !locF.province) p.set('province', groupKey);
                        else p.set('city', groupKey);
                    } else if (locF.area === 'East Asia') {
                        if (!locF.country)  p.set('country',  groupKey);
                        else if (!locF.subArea)  p.set('subarea',  groupKey);
                        else if (!locF.province) p.set('province', groupKey);
                        else p.set('city', groupKey);
                    } else if (locF.area === 'North America') {
                        if (!locF.country) p.set('country', groupKey);
                        else if (['united states','usa'].includes((locF.country||'').toLowerCase())) {
                            if (!locF.subArea)  p.set('subarea',  groupKey);
                            else if (!locF.province) p.set('province', groupKey);
                            else p.set('city', groupKey);
                        } else if ((locF.country||'').toLowerCase() === 'canada' && !locF.province) {
                            p.set('province', groupKey);
                        } else { p.set('city', groupKey); }
                    } else if (locF.area === 'Indo-Pacific South') {
                        if (!locF.subArea)  p.set('subarea',  groupKey);
                        else if (!locF.country) p.set('country', groupKey);
                        else p.set('city', groupKey);
                    } else {
                        if (!locF.country) p.set('country', groupKey);
                        else p.set('city', groupKey);
                    }

                    if (tf.type  && tf.type  !== 'all') p.set('type',  tf.type);
                    if (tf.theme && tf.theme !== 'all') p.set('theme', tf.theme);
                    linkHash = `#calendar?${p.toString().replace(/\+/g, '%20')}`;
                }

                const popVal = SECTION_POP[display.toLowerCase()];
                const popLabel = popVal !== undefined
                    ? `<span style="font-size:9px;color:#999;font-weight:400;margin-left:2px;">${popVal >= 1 ? `${Math.round(popVal)}M` : popVal >= 0.001 ? `${Math.round(popVal*1000)}K` : `${Math.round(popVal*1000000)}`} pop</span>`
                    : '';

                const titleHtml = linkHash
                    ? `<a href="${linkHash}" style="font-size:13px;font-weight:700;color:#1a1a2e;letter-spacing:.02em;text-decoration:none;" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration='none'">${this.escape(display)}</a>${popLabel}`
                    : `<span style="font-size:13px;font-weight:700;color:#1a1a2e;letter-spacing:.02em;">${this.escape(display)}</span>${popLabel}`;

                // ── Style sample image for empty art style sections ───────────────────

                const isArtStyleSection = artStyleF && artStyleF !== 'all' && !locF.area;

                // Section header
                html += `
                <div style="display:flex;align-items:stretch;gap:0;margin:16px 0 8px;
                            border-left:3px solid ${bc.color};border-radius:0 6px 6px 0;overflow:hidden;">

                    ${isArtStyleSection ? `
                        <div style="width:120px;min-height:68px;flex-shrink:0;background:${bc.bg};overflow:hidden;position:relative;">
                            ${this._styleThumbHtml(display)}
                        </div>
                    ` : ''}

                    <div style="display:flex;align-items:center;gap:8px;padding:6px 10px;flex:1;
                                background:linear-gradient(90deg,${bc.bg} 0%,#fff 100%);">
                        <i class="${icon}" style="color:${bc.color};font-size:13px;"></i>
                        ${titleHtml}
                        <span style="margin-left:auto;background:${bc.color};color:#fff;
                                     border-radius:10px;padding:1px 8px;font-size:10px;font-weight:700;">${count}</span>
                    </div>
                </div>`;

                // Only render card grid if there are events
                if (count > 0) {
                    html += `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:5px;margin-bottom:4px;">`;
                    evs.forEach(ev => { html += renderCard(ev, groupKey); });
                    html += `</div>`;
                }
            });
        }

        html += '</div>';
        grid.innerHTML = html;
    }, 
    
};

// ── Auto-mixin into App when the file is loaded ────────────────────────────────
if (typeof App !== 'undefined') {
    Object.assign(App, CalendarTagFilters);

    // Open/close filter sections whenever the URL hash changes
    window.addEventListener('hashchange', () => {
        App._syncFilterSectionsToHash();
    });

    // Inject shimmer animation once
    if (!document.getElementById('cf-shimmer-style')) {
        const style = document.createElement('style');
        style.id = 'cf-shimmer-style';
        style.textContent = `
            @keyframes cfShimmer {
                0% { background-position: -200% 0; }
                100% { background-position: 200% 0; }
            }
        `;
        document.head.appendChild(style);
    }
}