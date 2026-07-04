/**
 * calendar-wiki-filter.js
 * Wiki Category filter tree, rendering, and event filtering logic.
 *
 * Depends on: App (global), App.state.calendar, App.renderTagThumbnailView()
 *
 * Load order: After calendar-tag-filters.js
 * Mixin: Object.assign(App, CalendarWikiFilter);
 */

const CalendarWikiFilter = {

    // =========================================================================
    // STATE & DATA
    // =========================================================================

    _wikiStyleExpanded: {},
    _wikiStyleFilter: null, // null = all, or { level: 'main'|'sub1'|'sub2', value: '...' }
    _MAIN_CATEGORIES: [
        "Academic disciplines", "Behavior", "Business", "Communication", "Concepts", "Culture", "Economy", "Education", "Energy", "Engineering", "Entities", "Food and drink", "Geography", "Government", "Health", "History", "Humanities", "Information", "Knowledge", "Language", "Law", "Life", "Mass media", "Mathematics", "Nature", "People", "Philosophy", "Politics", "Religion", "Science", "Society", "Technology", "Time", "Universe"
    ],

    // =========================================================================
    // TREE RENDERING
    // =========================================================================

    renderWikiCategoriesTree() {
        const container = document.getElementById('tag-wiki-tree');
        if (!container) return;

        const events = (window.cloudmailLatestEvents && window.cloudmailLatestEvents.items) || [];
        const activeFilter = this._wikiStyleFilter;

        // Build hierarchy
        // main -> sub1 -> sub2 -> count
        const hierarchy = {};
        const counts = { total: 0, main: {}, sub1: {}, sub2: {} };

        // Pre-populate with official main categories
        if (this._MAIN_CATEGORIES) {
            this._MAIN_CATEGORIES.forEach(m => {
                hierarchy[m] = {};
                counts.main[m] = 0;
            });
        }

        for (const ev of events) {
            if (!ev.wikiTags || !ev.wikiTags.main) continue;
            const w = ev.wikiTags;
            const main = w.main;
            const sub1 = w.sub1 || 'Uncategorized';
            const sub2 = w.sub2 || 'Uncategorized';

            if (!hierarchy[main]) hierarchy[main] = {};
            if (!hierarchy[main][sub1]) hierarchy[main][sub1] = {};
            if (!hierarchy[main][sub1][sub2]) hierarchy[main][sub1][sub2] = 0;

            hierarchy[main][sub1][sub2]++;

            counts.total++;
            counts.main[main] = (counts.main[main] || 0) + 1;
            counts.sub1[`${main}::${sub1}`] = (counts.sub1[`${main}::${sub1}`] || 0) + 1;
            counts.sub2[`${main}::${sub1}::${sub2}`] = (counts.sub2[`${main}::${sub1}::${sub2}`] || 0) + 1;
        }

        /* 
        if (counts.total === 0) {
            container.innerHTML = `<div style="padding:10px;color:#999;font-size:11px;text-align:center;">No Wiki Categories loaded.</div>`;
            return;
        }
        */

        let html = '';

        // "All Wiki Categories" row
        const allActive = !activeFilter;
        html += `<div onclick="App.setWikiCategoryFilter(null)"
            style="padding:5px 8px;cursor:pointer;display:flex;align-items:center;gap:5px;font-size:11px;
                   background:${allActive ? '#e7f3ff' : 'transparent'};
                   color:${allActive ? '#0078d4' : '#333'};
                   font-weight:${allActive ? '600' : '400'};
                   border-bottom:1px solid #f0f0f0;">
            <i class="fab fa-wikipedia-w" style="color:#333;font-size:9px;"></i>
            <span style="flex:1;">All Wiki Categories</span>
        </div>`;

        // Render hierarchy
        const mains = Object.keys(hierarchy).sort();
        for (const main of mains) {
            const mainKey = `wk:m:${main}`;
            const mainExpanded = !!this._wikiStyleExpanded[mainKey];
            const mainCount = counts.main[main];
            const isMainActive = activeFilter && activeFilter.level === 'main' && activeFilter.value === main;

            html += `<div>
                <div onclick="App.toggleWikiCategoryExpand('${CSS.escape(mainKey)}')"
                    style="padding:4px 8px;cursor:pointer;display:flex;align-items:center;gap:5px;
                           font-size:11px;font-weight:${isMainActive ? '700' : '600'};
                           background:${isMainActive ? '#e7f3ff' : '#fafafa'};
                           color:${isMainActive ? '#0078d4' : '#444'};
                           border-bottom:1px solid #eee;">
                    <i class="fas fa-folder" style="color:#888;font-size:9px;width:12px;"></i>
                    <span style="flex:1;">${this.escape(main)}</span>
                    <i class="fas fa-filter" onclick="event.stopPropagation(); App.setWikiCategoryFilter('main', '${CSS.escape(main)}')" style="font-size:9px;color:#ccc;cursor:pointer;" title="Filter by this main category"></i>
                    ${mainCount > 0 ? `<span style="font-size:9px;background:#e2e8f0;color:#555;border-radius:8px;padding:0 5px;font-weight:400;">${mainCount}</span>` : ''}
                    <i class="fas fa-chevron-${mainExpanded ? 'down' : 'right'}" style="font-size:8px;color:#bbb;"></i>
                </div>`;

            if (mainExpanded) {
                const sub1s = Object.keys(hierarchy[main]).sort();
                for (const sub1 of sub1s) {
                    const sub1Key = `wk:s1:${main}::${sub1}`;
                    const sub1Expanded = !!this._wikiStyleExpanded[sub1Key];
                    const sub1Count = counts.sub1[`${main}::${sub1}`];
                    const isSub1Active = activeFilter && activeFilter.level === 'sub1' && activeFilter.value === `${main}::${sub1}`;

                    html += `<div>
                        <div onclick="App.toggleWikiCategoryExpand('${CSS.escape(sub1Key)}')"
                            style="padding:3px 8px 3px 22px;cursor:pointer;display:flex;align-items:center;gap:5px;
                                   font-size:11px;font-weight:${isSub1Active ? '700' : '500'};
                                   background:${isSub1Active ? '#e7f3ff' : '#fcfcfc'};
                                   color:${isSub1Active ? '#0078d4' : '#555'};
                                   border-bottom:1px solid #f7f7f7;">
                            <i class="fas fa-folder-open" style="color:#aaa;font-size:9px;width:12px;"></i>
                            <span style="flex:1;">${this.escape(sub1)}</span>
                            <i class="fas fa-filter" onclick="event.stopPropagation(); App.setWikiCategoryFilter('sub1', '${CSS.escape(main)}::${CSS.escape(sub1)}')" style="font-size:9px;color:#ccc;cursor:pointer;" title="Filter by this subcategory"></i>
                            ${sub1Count > 0 ? `<span style="font-size:9px;background:#e2e8f0;color:#555;border-radius:8px;padding:0 4px;font-weight:400;">${sub1Count}</span>` : ''}
                            <i class="fas fa-chevron-${sub1Expanded ? 'down' : 'right'}" style="font-size:8px;color:#bbb;"></i>
                        </div>`;

                    if (sub1Expanded) {
                        const sub2s = Object.keys(hierarchy[main][sub1]).sort();
                        for (const sub2 of sub2s) {
                            const sub2Count = counts.sub2[`${main}::${sub1}::${sub2}`];
                            const isSub2Active = activeFilter && activeFilter.level === 'sub2' && activeFilter.value === `${main}::${sub1}::${sub2}`;

                            html += `<div onclick="App.setWikiCategoryFilter('sub2', '${CSS.escape(main)}::${CSS.escape(sub1)}::${CSS.escape(sub2)}')"
                                style="padding:3px 8px 3px 36px;cursor:pointer;display:flex;align-items:center;gap:5px;
                                       font-size:11px;border-bottom:1px solid #fff;
                                       background:${isSub2Active ? '#e7f3ff' : 'transparent'};
                                       color:${isSub2Active ? '#0078d4' : '#666'};
                                       font-weight:${isSub2Active ? '600' : '400'};">
                                <span style="flex:1;">${this.escape(sub2)}</span>
                                ${sub2Count > 0 ? `<span style="font-size:9px;background:${isSub2Active ? '#c7e0f4' : '#e2e8f0'};color:#555;border-radius:8px;padding:0 4px;">${sub2Count}</span>` : ''}
                            </div>`;
                        }
                    }
                    html += `</div>`;
                }
            }
            html += `</div>`;
        }

        container.innerHTML = html;
    },

    toggleWikiCategoryExpand(catKey) {
        this._wikiStyleExpanded[catKey] = !this._wikiStyleExpanded[catKey];
        this.renderWikiCategoriesTree();
    },

    // =========================================================================
    // FILTER APPLICATION
    // =========================================================================

    setWikiCategoryFilter(level, value) {
        if (!level) {
            this._wikiStyleFilter = null;
        } else {
            this._wikiStyleFilter = { level, value };
        }
        this.renderWikiCategoriesTree();
        this.renderTagThumbnailView?.();
    },

    _applyWikiCategoryFilter(events) {
        const filter = this._wikiStyleFilter;
        if (!filter) return events;
        
        return events.filter(ev => {
            if (!ev.wikiTags || !ev.wikiTags.main) return false;
            
            if (filter.level === 'main') {
                return ev.wikiTags.main === filter.value;
            } else if (filter.level === 'sub1') {
                const parts = filter.value.split('::');
                return ev.wikiTags.main === parts[0] && (ev.wikiTags.sub1 || 'Uncategorized') === parts[1];
            } else if (filter.level === 'sub2') {
                const parts = filter.value.split('::');
                return ev.wikiTags.main === parts[0] && 
                       (ev.wikiTags.sub1 || 'Uncategorized') === parts[1] &&
                       (ev.wikiTags.sub2 || 'Uncategorized') === parts[2];
            }
            return true;
        });
    },

    // =========================================================================
    // CLEAR WIKI FILTER (called by clearTagFilters)
    // =========================================================================

    clearWikiCategoryFilter() {
        this._wikiStyleFilter = null;
        this._wikiStyleExpanded = {};
        this.renderWikiCategoriesTree();
    },

    // =========================================================================
    // SEARCH INTEGRATION
    // =========================================================================

    _searchHasWikiMatch(q) {
        if (!q) return false;
        const lower = q.toLowerCase();
        
        const events = (window.cloudmailLatestEvents && window.cloudmailLatestEvents.items) || [];
        for (const ev of events) {
            if (!ev.wikiTags) continue;
            if (ev.wikiTags.main && ev.wikiTags.main.toLowerCase().includes(lower)) return true;
            if (ev.wikiTags.sub1 && ev.wikiTags.sub1.toLowerCase().includes(lower)) return true;
            if (ev.wikiTags.sub2 && ev.wikiTags.sub2.toLowerCase().includes(lower)) return true;
        }
        return false;
    },

    _autoExpandWikiStyleForSearch(q) {
        if (!q) return;
        const lower = q.toLowerCase();
        
        const events = (window.cloudmailLatestEvents && window.cloudmailLatestEvents.items) || [];
        let matched = false;
        for (const ev of events) {
            if (!ev.wikiTags) continue;
            const m = ev.wikiTags.main;
            const s1 = ev.wikiTags.sub1 || 'Uncategorized';
            const s2 = ev.wikiTags.sub2 || 'Uncategorized';
            
            if ((m && m.toLowerCase().includes(lower)) ||
                (s1 && s1.toLowerCase().includes(lower)) ||
                (s2 && s2.toLowerCase().includes(lower))) {
                
                if (m) this._wikiStyleExpanded[`wk:m:${m}`] = true;
                if (m && s1) this._wikiStyleExpanded[`wk:s1:${m}::${s1}`] = true;
                matched = true;
            }
        }
        if (matched) this.renderWikiCategoriesTree();
    },
};

// Auto-mixin and init
if (typeof App !== 'undefined') {
    Object.assign(App, CalendarWikiFilter);
}

// Auto-load data when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Wait for App to be fully assembled by other modules, then load
    setTimeout(() => {
        if (typeof App !== 'undefined' && App.renderWikiCategoriesTree) {
            App.renderWikiCategoriesTree();
        }
    }, 600);

    // Patch clearTagFilters to also clear wiki filter
    if (typeof App !== 'undefined' && App.clearTagFilters) {
        const origClear = App.clearTagFilters.bind(App);
        App.clearTagFilters = function() {
            origClear();
            this.clearWikiCategoryFilter?.();
        };
    }
});
