/**
 * calendar-music-filter.js
 * Music Style filter tree, rendering, and event filtering logic.
 *
 * Depends on: App (global), App.state.calendar, App.renderTagThumbnailView()
 *
 * Load order: After calendar-tag-filters.js
 * Mixin: Object.assign(App, CalendarMusicFilter);
 */

const CalendarMusicFilter = {

    // =========================================================================
    // STATE & DATA
    // =========================================================================

    _MS_CATEGORY_DATA: [], // Loaded from music-styles.json
    _MS_EVENT_MAP: {},     // { "YYYY-MM-DD": ["Style Name"] } from music-styles.json
    _musicStyleExpanded: {},
    _musicStyleFilter: null, // null = all, or a style name string

    // =========================================================================
    // DATA LOADING
    // =========================================================================

    async loadMusicStyleData() {
        try {
            const resp = await fetch('/config/music-styles.json');
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const data = await resp.json();
            this._MS_CATEGORY_DATA = data._MS_CATEGORY_DATA || [];
            this._MS_EVENT_MAP     = data._MS_EVENT_MAP     || {};
        } catch (e) {
            console.warn('[MusicFilter] Could not load music-styles.json:', e.message);
            this._MS_CATEGORY_DATA = [];
            this._MS_EVENT_MAP = {};
        }
        this.renderMusicStyleTree();
    },

    // =========================================================================
    // TREE RENDERING
    // =========================================================================

    renderMusicStyleTree() {
        const container = document.getElementById('tag-music-tree');
        if (!container) return;

        const data      = this._MS_CATEGORY_DATA || [];
        const activeFilter = this._musicStyleFilter;
        const eventMap  = this._MS_EVENT_MAP || {};

        // Count events per style
        const styleCounts = {};
        Object.values(eventMap).forEach(styles => {
            (styles || []).forEach(s => {
                styleCounts[s] = (styleCounts[s] || 0) + 1;
            });
        });

        if (!data.length) {
            container.innerHTML = `<div style="padding:10px;color:#999;font-size:11px;text-align:center;">No music styles loaded.</div>`;
            return;
        }

        let html = '';

        // "All Music Styles" row
        const allActive = !activeFilter;
        html += `<div onclick="App.setMusicStyleFilter(null)"
            style="padding:5px 8px;cursor:pointer;display:flex;align-items:center;gap:5px;font-size:11px;
                   background:${allActive ? '#e7f3ff' : 'transparent'};
                   color:${allActive ? '#0078d4' : '#333'};
                   font-weight:${allActive ? '600' : '400'};
                   border-bottom:1px solid #f0f0f0;">
            <i class="fas fa-music" style="color:#f59e0b;font-size:9px;"></i>
            <span style="flex:1;">All Music Styles</span>
        </div>`;

        for (const cat of data) {
            const catKey = `ms:c:${cat.category}`;
            const expanded = !!this._musicStyleExpanded[catKey];

            // Count events in this category
            const catStyles = (cat.styles || []).map(s => s.name);
            const catCount  = catStyles.reduce((sum, n) => sum + (styleCounts[n] || 0), 0);

            html += `<div>
                <div onclick="App.toggleMusicCategoryExpand('${CSS.escape(catKey)}')"
                    style="padding:4px 8px;cursor:pointer;display:flex;align-items:center;gap:5px;
                           font-size:11px;font-weight:600;background:#fafafa;border-bottom:1px solid #eee;">
                    <i class="${cat.icon || 'fas fa-music'}" style="color:${cat.color || '#888'};font-size:9px;width:12px;"></i>
                    <span style="flex:1;color:#444;">${this.escape(cat.category)}</span>
                    ${catCount > 0 ? `<span style="font-size:9px;background:#e2e8f0;color:#555;border-radius:8px;padding:0 5px;font-weight:400;">${catCount}</span>` : ''}
                    <i class="fas fa-chevron-${expanded ? 'down' : 'right'}" style="font-size:8px;color:#bbb;"></i>
                </div>`;

            if (expanded) {
                for (const style of (cat.styles || [])) {
                    const count   = styleCounts[style.name] || 0;
                    const isActive = activeFilter === style.name;
                    html += `<div onclick="App.setMusicStyleFilter('${CSS.escape(style.name)}')"
                        title="${this.escape(style.hint || '')}"
                        style="padding:3px 8px 3px 22px;cursor:pointer;display:flex;align-items:center;gap:5px;
                               font-size:11px;border-bottom:1px solid #f7f7f7;
                               background:${isActive ? '#e7f3ff' : 'transparent'};
                               color:${isActive ? '#0078d4' : '#555'};
                               font-weight:${isActive ? '600' : '400'};">
                        <span style="flex:1;">${this.escape(style.name)}</span>
                        ${count > 0 ? `<span style="font-size:9px;background:${isActive ? '#c7e0f4' : '#e2e8f0'};color:#555;border-radius:8px;padding:0 4px;">${count}</span>` : ''}
                    </div>`;
                }
            }

            html += `</div>`;
        }

        container.innerHTML = html;
    },

    toggleMusicCategoryExpand(catKey) {
        this._musicStyleExpanded[catKey] = !this._musicStyleExpanded[catKey];
        this.renderMusicStyleTree();
    },

    // =========================================================================
    // FILTER APPLICATION
    // =========================================================================

    setMusicStyleFilter(styleName) {
        this._musicStyleFilter = styleName;
        this.renderMusicStyleTree();
        this.renderTagThumbnailView?.();
        // Update hash
        this._syncMusicStyleFilterToHash?.();
    },

    _applyMusicStyleFilter(events) {
        const filter   = this._musicStyleFilter;
        const eventMap = this._MS_EVENT_MAP || {};
        if (!filter) return events;
        return events.filter(ev => {
            // Check direct musicStyles field first (set by detect_music_styles.py)
            const directStyles = ev.musicStyles || [];
            if (directStyles.includes(filter)) return true;
            // Fallback: lookup by date in event map
            const dateStr = ev.start?.date || (ev.start?.dateTime?.substring(0, 10)) || ev.date;
            if (!dateStr) return false;
            const mapStyles = eventMap[dateStr] || [];
            return mapStyles.includes(filter);
        });
    },

    _syncMusicStyleFilterToHash() {
        // Intentionally minimal: music filter is applied in-memory,
        // not currently persisted to URL hash (can be extended if needed).
    },

    // =========================================================================
    // CLEAR MUSIC FILTER (called by clearTagFilters)
    // =========================================================================

    clearMusicStyleFilter() {
        this._musicStyleFilter = null;
        this._musicStyleExpanded = {};
        this.renderMusicStyleTree();
    },

    // =========================================================================
    // SEARCH INTEGRATION
    // =========================================================================

    _searchHasMusicStyleMatch(q) {
        if (!q) return false;
        const lower = q.toLowerCase();
        for (const cat of (this._MS_CATEGORY_DATA || [])) {
            if (cat.category?.toLowerCase().includes(lower)) return true;
            for (const style of (cat.styles || [])) {
                if (style.name?.toLowerCase().includes(lower)) return true;
                if (style.hint?.toLowerCase().includes(lower)) return true;
            }
        }
        return false;
    },

    _autoExpandMusicStyleForSearch(q) {
        if (!q) return;
        const lower = q.toLowerCase();
        for (const cat of (this._MS_CATEGORY_DATA || [])) {
            for (const style of (cat.styles || [])) {
                if (style.name?.toLowerCase().includes(lower) ||
                    style.hint?.toLowerCase().includes(lower)) {
                    this._musicStyleExpanded[`ms:c:${cat.category}`] = true;
                    this.renderMusicStyleTree();
                    return;
                }
            }
        }
    },
};

// Auto-mixin and init
if (typeof App !== 'undefined') {
    Object.assign(App, CalendarMusicFilter);
}

// Auto-load data when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Wait for App to be fully assembled by other modules, then load
    setTimeout(() => {
        if (typeof App !== 'undefined' && App.loadMusicStyleData) {
            App.loadMusicStyleData();
        }
    }, 500);

    // Patch clearTagFilters to also clear music filter
    if (typeof App !== 'undefined' && App.clearTagFilters) {
        const origClear = App.clearTagFilters.bind(App);
        App.clearTagFilters = function() {
            origClear();
            this.clearMusicStyleFilter?.();
        };
    }
});
