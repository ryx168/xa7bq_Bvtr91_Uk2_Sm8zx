/**
 * TagsSegmentsMixin — Tags & Segments pages for CloudMail
 * Merge via Object.assign(App, TagsSegmentsMixin)
 *
 * Requires state:
 *   this.state.contacts        — existing contacts array
 *   this.state.segments        — array of segment objects (auto-init'd)
 *   this.state.currentContactTab — 'contacts' | 'tags' | 'segments' | ...
 *
 * Call renderContactsTab(tab) from the eo-tabs nav clicks.
 */
export const TagsSegmentsMixin = {

    // =========================================================================
    // SHARED — Tab routing
    // Replaces the static tab nav; call this whenever a tab is clicked.
    // =========================================================================

    renderContactsTab(tab) {
        if (this.showContactsSubTab) {
            return this.showContactsSubTab(tab);
        }
        this.state.currentContactTab = tab;
        // ... rest of old logic if showContactsSubTab is missing (shouldn't be)
    },

    // =========================================================================
    // SHARED — inject shared CSS once
    // =========================================================================

    _injectTabStyles() {
        if (document.getElementById('eo-tab-styles')) return;
        const s = document.createElement('style');
        s.id = 'eo-tab-styles';
        s.textContent = `
        /* ── Shared page chrome ───────────────────────────────────── */
        .eo-page-header { padding: 0; }
        .eo-page-title-row {
            display: flex; align-items: flex-start;
            justify-content: space-between; padding: 28px 32px 0;
        }
        .eo-page-title  { font-size: 28px; font-weight: 800; color: #1a1a2e; margin: 0; }
        .eo-page-subtitle { font-size: 14px; color: #888; margin: 4px 0 0; }
        .eo-add-btn {
            display: inline-flex; align-items: center; gap: 6px;
            background: #6c5ce7; color: #fff; border: none; border-radius: 24px;
            padding: 11px 22px; font-size: 14px; font-weight: 600; cursor: pointer;
            transition: background .15s;
        }
        .eo-add-btn:hover { background: #5b4fcf; }
        .eo-tabs {
            display: flex; gap: 0; padding: 20px 32px 0;
            border-bottom: 2px solid #eee; margin-top: 10px;
        }
        .eo-tab {
            padding: 10px 18px; font-size: 14px; font-weight: 500; color: #666;
            text-decoration: none; border-bottom: 2px solid transparent;
            margin-bottom: -2px; cursor: pointer; transition: color .15s;
            white-space: nowrap;
        }
        .eo-tab:hover { color: #1a1a2e; }
        .eo-tab--active { color: #6c5ce7; border-bottom-color: #6c5ce7; font-weight: 700; }

        /* ── Tags page ────────────────────────────────────────────── */
        .eo-tags-page { padding: 32px; }
        .eo-tags-empty {
            text-align: center; padding: 80px 32px; color: #aaa;
        }
        .eo-tags-empty svg { margin-bottom: 16px; opacity: .3; }
        .eo-tags-empty p { font-size: 15px; margin: 0 0 16px; }

        .eo-tags-list { display: flex; flex-direction: column; gap: 0; }
        .eo-tags-list-header {
            display: grid; grid-template-columns: 1fr 120px 120px 48px;
            padding: 10px 16px; font-size: 12px; font-weight: 700;
            color: #aaa; text-transform: uppercase; letter-spacing: .06em;
            border-bottom: 1px solid #eee;
        }
        .eo-tag-row {
            display: grid; grid-template-columns: 1fr 120px 120px 48px;
            padding: 14px 16px; border-bottom: 1px solid #f5f5f5;
            align-items: center; transition: background .1s;
        }
        .eo-tag-row:hover { background: #fafafe; }
        .eo-tag-name-cell { display: flex; align-items: center; gap: 10px; }
        .eo-tag-pill {
            display: inline-flex; align-items: center;
            background: #f0eeff; color: #5b4fcf; border: 1px solid #d4ccf5;
            border-radius: 20px; padding: 3px 12px; font-size: 13px; font-weight: 500;
        }
        .eo-tag-count { font-size: 13px; color: #555; }
        .eo-tag-date  { font-size: 13px; color: #888; }
        .eo-tag-actions { display: flex; justify-content: flex-end; }
        .eo-icon-btn {
            background: none; border: none; cursor: pointer; padding: 6px;
            color: #bbb; border-radius: 6px; transition: color .15s, background .15s;
            display: inline-flex; align-items: center; justify-content: center;
        }
        .eo-icon-btn:hover { color: #e53e3e; background: #fff0f0; }

        /* inline add-tag form */
        .eo-add-tag-row {
            display: flex; gap: 10px; align-items: center;
            padding: 16px; border-top: 1px solid #eee; margin-top: 8px;
        }
        .eo-tag-input {
            flex: 1; padding: 9px 14px; border: 1.5px solid #ddd;
            border-radius: 8px; font-size: 14px; outline: none;
            transition: border-color .15s;
        }
        .eo-tag-input:focus { border-color: #6c5ce7; }
        .eo-save-tag-btn {
            background: #6c5ce7; color: #fff; border: none;
            border-radius: 8px; padding: 9px 20px; font-size: 14px;
            font-weight: 600; cursor: pointer; transition: background .15s;
        }
        .eo-save-tag-btn:hover { background: #5b4fcf; }
        .eo-cancel-tag-btn {
            background: none; border: 1.5px solid #ddd; border-radius: 8px;
            padding: 9px 16px; font-size: 14px; color: #555; cursor: pointer;
        }

        /* ── Improved tags page extra styles ───────────────────────── */
        .eo-tags-topbar {
            display: flex; align-items: center; justify-content: space-between;
            padding: 20px 0 16px;
        }
        .eo-create-tag-btn {
            display: inline-flex; align-items: center; gap: 7px;
            border: 1.5px solid #ddd; border-radius: 20px; padding: 9px 18px;
            font-size: 13px; font-weight: 500; cursor: pointer;
            background: #fff; color: #333; transition: border-color .15s;
        }
        .eo-create-tag-btn:hover { border-color: #999; }
        .eo-tags-count-info { font-size: 13px; color: #888; }
        .eo-tags-count-info strong { color: #1a1a2e; }
        .eo-tags-table {
            width: 100%; border-collapse: collapse;
        }
        .eo-tags-table thead tr { border-bottom: 1.5px solid #eee; }
        .eo-tags-table th {
            font-size: 11px; font-weight: 500; color: #aaa;
            text-align: left; padding: 10px 16px;
            letter-spacing: .04em; text-transform: uppercase;
        }
        .eo-td-tag   { padding: 18px 16px; width: 100%; }
        .eo-td-subs  { padding: 18px 16px; white-space: nowrap; }
        .eo-td-actions { padding: 18px 16px; white-space: nowrap; }
        .eo-tags-table tbody tr { border-bottom: .5px solid #f2f2f2; }
        .eo-tag-actions-wrap { position: relative; display: flex; justify-content: flex-end; }
        .eo-chevron-btn {
            border: none; background: none; cursor: pointer; padding: 8px;
            border-radius: 50%; display: inline-flex; align-items: center;
            justify-content: center; color: #888; transition: background .15s;
        }
        .eo-chevron-btn:hover { background: #f0eeff; color: #6c5ce7; }
        .eo-tag-dropdown {
            position: absolute; right: 0; top: 38px;
            background: #fff; border: .5px solid #e0e0e0;
            border-radius: 10px; box-shadow: 0 4px 16px rgba(0,0,0,.08);
            min-width: 148px; z-index: 100; overflow: hidden;
        }
        .eo-dd-item {
            display: block; width: 100%; text-align: left; border: none;
            background: none; padding: 11px 16px; font-size: 13px;
            color: #1a1a2e; cursor: pointer; transition: background .1s;
        }
        .eo-dd-item:hover { background: #fafafe; }
        .eo-dd-danger { color: #e53e3e !important; }
        .eo-tags-bottombar {
            display: flex; justify-content: flex-end;
            padding: 14px 0; font-size: 13px; color: #888;
        }
        .eo-tags-bottombar strong { color: #1a1a2e; }

        /* ── Segments page ────────────────────────────────────────── */
        .eo-segments-page { padding: 32px; }
        .eo-segments-empty {
            text-align: center; padding: 80px 32px; color: #aaa;
        }
        .eo-seg-list-header {
            display: grid; grid-template-columns: 1fr 140px 140px 80px;
            padding: 10px 16px; font-size: 12px; font-weight: 700;
            color: #aaa; text-transform: uppercase; letter-spacing: .06em;
            border-bottom: 1px solid #eee;
        }
        .eo-seg-row {
            display: grid; grid-template-columns: 1fr 140px 140px 80px;
            padding: 15px 16px; border-bottom: 1px solid #f5f5f5;
            align-items: center; transition: background .1s; cursor: pointer;
        }
        .eo-seg-row:hover { background: #fafafe; }
        .eo-seg-name { font-size: 14px; font-weight: 600; color: #1a1a2e; }
        .eo-seg-meta { font-size: 12px; color: #aaa; margin-top: 2px; }
        .eo-seg-count { font-size: 13px; color: #555; }
        .eo-seg-date  { font-size: 13px; color: #888; }
        .eo-seg-acts  { display: flex; gap: 6px; justify-content: flex-end; }

        /* ── Segment editor ───────────────────────────────────────── */
        .eo-seg-editor { padding: 32px; max-width: 900px; }
        .eo-seg-editor-title {
            font-size: 20px; font-weight: 700; color: #1a1a2e; margin: 0 0 24px;
        }
        .eo-field-label { font-size: 13px; font-weight: 600; color: #444; margin-bottom: 6px; }
        .eo-name-input {
            width: 100%; padding: 11px 16px; border: 1.5px solid #ddd;
            border-radius: 8px; font-size: 15px; outline: none;
            transition: border-color .15s; box-sizing: border-box;
        }
        .eo-name-input:focus { border-color: #6c5ce7; }

        .eo-filter-group {
            background: #f9f9fc; border: 1px solid #eee; border-radius: 12px;
            padding: 24px; margin-top: 24px;
        }
        .eo-filter-match-row {
            display: flex; align-items: center; gap: 10px; margin-bottom: 20px;
            font-size: 14px; color: #444; flex-wrap: wrap;
        }
        .eo-match-select {
            padding: 7px 30px 7px 12px; border: 1.5px solid #ddd;
            border-radius: 8px; font-size: 14px; background: #fff;
            color: #333; appearance: none; cursor: pointer; outline: none;
            background-image: url("data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 12 12' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M2 4l4 4 4-4' stroke='%23888' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E");
            background-repeat: no-repeat; background-position: right 10px center;
            transition: border-color .15s;
        }
        .eo-match-select:focus { border-color: #6c5ce7; }

        .eo-filter-row {
            display: flex; gap: 10px; align-items: center; margin-bottom: 12px;
        }
        .eo-filter-select {
            flex: 1; padding: 10px 14px; border: 1.5px solid #ddd;
            border-radius: 8px; font-size: 14px; background: #fff;
            color: #333; appearance: none; cursor: pointer; outline: none;
            background-image: url("data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 12 12' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M2 4l4 4 4-4' stroke='%23888' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E");
            background-repeat: no-repeat; background-position: right 10px center;
            transition: border-color .15s;
        }
        .eo-filter-select:focus { border-color: #6c5ce7; }
        .eo-filter-select:disabled { background: #f5f5f5; color: #bbb; cursor: default; }

        .eo-filter-value {
            flex: 1.2; padding: 10px 14px; border: 1.5px solid #ddd;
            border-radius: 8px; font-size: 14px; outline: none;
            transition: border-color .15s; background: #fff;
        }
        .eo-filter-value:focus { border-color: #6c5ce7; }
        .eo-filter-value:disabled { background: #f5f5f5; cursor: default; }

        .eo-add-filter-btn {
            display: inline-flex; align-items: center; gap: 7px;
            background: none; border: none; color: #6c5ce7; font-size: 14px;
            font-weight: 600; cursor: pointer; padding: 8px 0; margin-top: 4px;
            transition: opacity .15s;
        }
        .eo-add-filter-btn:hover { opacity: .7; }
        .eo-add-group-btn {
            display: inline-flex; align-items: center; gap: 7px;
            background: none; border: none; color: #888; font-size: 14px;
            font-weight: 500; cursor: pointer; padding: 8px 0; margin-top: 4px;
            transition: color .15s;
        }
        .eo-add-group-btn:hover { color: #333; }

        .eo-seg-footer {
            display: flex; justify-content: flex-end; margin-top: 32px;
        }
        .eo-save-seg-btn {
            background: #6c5ce7; color: #fff; border: none; border-radius: 24px;
            padding: 12px 32px; font-size: 15px; font-weight: 700; cursor: pointer;
            transition: background .15s;
        }
        .eo-save-seg-btn:hover { background: #5b4fcf; }
        .eo-back-link {
            display: inline-flex; align-items: center; gap: 6px;
            color: #6c5ce7; font-size: 13px; font-weight: 500; cursor: pointer;
            background: none; border: none; padding: 0 0 20px; transition: opacity .15s;
        }
        .eo-back-link:hover { opacity: .7; }

        /* ── Fields page ───────────────────────────────────────────── */
        .eo-fields-page { padding: 0 32px 32px; }
        .eo-fields-topbar { padding: 20px 0 18px; }
        .eo-fields-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
        .eo-fields-table thead tr { background: #fafafa; }
        .eo-fth {
            font-size: 13px; font-weight: 500; color: #444;
            text-align: left; padding: 13px 20px;
            border-bottom: 1.5px solid #eee;
        }
        .eo-fth--label { width: 38%; }
        .eo-th-info {
            display: inline-flex; align-items: center; justify-content: center;
            width: 16px; height: 16px; border-radius: 50%;
            border: 1.5px solid #ccc; color: #999; font-size: 10px;
            font-weight: 600; cursor: default; margin-left: 5px;
            vertical-align: middle;
        }
        .eo-field-td { padding: 17px 20px; border-bottom: .5px solid #f2f2f2; font-size: 14px; vertical-align: middle; }
        .eo-field-td--label { display: flex; align-items: center; justify-content: space-between; }
        .eo-field-td--default { color: #888; font-size: 13px; }
        .eo-field-tr:hover { background: #fafafe; }
        .eo-field-tr:hover .eo-field-row-actions { opacity: 1; }
        .eo-field-label-locked { color: #888; }
        .eo-field-row-actions {
            display: flex; gap: 4px; opacity: 0; transition: opacity .15s;
        }
        .eo-type-pill {
            display: inline-block; background: #f2f2f2; border: 1px solid #e0e0e0;
            border-radius: 6px; padding: 3px 12px; font-size: 12px;
            font-weight: 500; color: #555;
        }
        .eo-merge-tag { font-family: monospace; font-size: 13px; color: #666; }
        .eo-icon-btn--danger:hover { color: #e53e3e !important; background: #fff0f0 !important; }

        /* ── Field editor modal ───────────────────────────────────────── */
        .eo-modal-backdrop {
            display: none; position: fixed; inset: 0;
            background: rgba(0,0,0,.35); align-items: flex-start;
            justify-content: center; padding-top: 80px; z-index: 1000;
        }
        .eo-modal {
            background: #fff; border-radius: 14px;
            border: .5px solid #e0e0e0; width: 440px;
            padding: 28px; position: relative;
        }
        .eo-modal-close {
            position: absolute; top: 16px; right: 16px;
            background: none; border: none; cursor: pointer;
            color: #aaa; padding: 4px; border-radius: 6px; display: flex;
        }
        .eo-modal-close:hover { color: #333; }
        .eo-modal-title { font-size: 17px; font-weight: 700; color: #1a1a2e; margin-bottom: 22px; }
        .eo-modal-field { margin-bottom: 18px; }
        .eo-modal-label {
            display: block; font-size: 11px; font-weight: 700;
            color: #888; text-transform: uppercase; letter-spacing: .05em; margin-bottom: 7px;
        }
        .eo-modal-input {
            width: 100%; padding: 10px 14px; border: 1.5px solid #ddd;
            border-radius: 8px; font-size: 14px; outline: none;
            transition: border-color .15s; box-sizing: border-box;
        }
        .eo-modal-input:focus { border-color: #6c5ce7; }
        .eo-type-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .eo-type-opt {
            border: 1.5px solid #e0e0e0; border-radius: 8px; padding: 10px 14px;
            cursor: pointer; font-size: 13px; font-weight: 600; color: #666;
            background: #fff; text-align: left; transition: border-color .15s, color .15s;
        }
        .eo-type-opt small { display: block; font-size: 11px; font-weight: 400; color: #aaa; margin-top: 2px; }
        .eo-type-opt:hover { border-color: #6c5ce7; color: #6c5ce7; }
        .eo-type-opt--selected { border-color: #6c5ce7; color: #6c5ce7; background: #f0eeff; }
        .eo-modal-footer { display: flex; justify-content: flex-end; gap: 10px; margin-top: 24px; }

        /* ── Imports page ──────────────────────────────────────────── */
        .eo-imports-page { padding: 32px; }
        .eo-imports-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        .eo-imports-table th { font-size: 11px; font-weight: 700; color: #aaa; text-transform: uppercase; text-align: left; padding: 12px 16px; border-bottom: 1.5px solid #eee; }
        .eo-imports-table td { padding: 16px; border-bottom: 1px solid #f5f5f5; font-size: 14px; color: #1a1a2e; }
        .eo-status-pill { display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
        .eo-status-pill--completed { background: #e6fffa; color: #2c7a7b; }
        .eo-status-pill--processing { background: #ebf8ff; color: #2b6cb0; }

        /* ── Import wizard ─────────────────────────────────────────── */
        .eo-import-wizard { max-width: 600px; margin: 40px auto; background: #fff; border: 1px solid #eee; border-radius: 12px; padding: 40px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
        .eo-wizard-step-num { font-size: 12px; font-weight: 700; color: #6c5ce7; text-transform: uppercase; margin-bottom: 8px; display: block; }
        .eo-wizard-title { font-size: 22px; font-weight: 800; color: #1a1a2e; margin: 0 0 12px; }
        .eo-wizard-desc { font-size: 14px; color: #666; margin-bottom: 30px; line-height: 1.5; }
        .eo-upload-box { border: 2px dashed #ddd; border-radius: 12px; padding: 40px 20px; text-align: center; cursor: pointer; transition: all 0.15s; }
        .eo-upload-box:hover { border-color: #6c5ce7; background: #f9f8ff; }
        .eo-mapping-table { width: 100%; margin-top: 20px; }
        .eo-mapping-row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 15px; align-items: center; }
        .eo-mapping-label { font-size: 13px; font-weight: 600; color: #444; }
        .eo-wizard-footer { display: flex; justify-content: flex-end; gap: 12px; margin-top: 40px; border-top: 1px solid #eee; padding-top: 24px; }
        `;
        document.head.appendChild(s);
    },

    // =========================================================================
    // TAGS — Persistence (public/config/tags.json)
    // =========================================================================

    async loadTags() {
        try {
            const res = await fetch('/api/tags');
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data)) {
                    this.state.tags = data;
                    return;
                }
            }
        } catch (e) {
            console.warn('Failed to load tags from server:', e);
        }
        // Fallback: derive from contacts
        this.state.tags = this._buildTagsFromContacts();
    },

    async saveTagsToServer() {
        try {
            await fetch('/api/tags', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(this.state.tags || [])
            });
        } catch (e) {
            console.error('Failed to save tags:', e);
        }
    },

    saveTagsToStorage() {
        // Local cache so UI is instant on reload
        localStorage.setItem('cloudmail_tags', JSON.stringify(this.state.tags || []));
        this.saveTagsToServer();
    },

    // =========================================================================
    // SEGMENTS — Persistence
    // =========================================================================

    async loadSegments() {
        try {
            const res = await fetch('/api/segments');
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data)) {
                    this.state.segments = data;
                    return;
                }
            }
        } catch (e) {
            console.warn('Failed to load segments from server:', e);
        }
        // Fallback: check localStorage
        const stored = localStorage.getItem('cloudmail_segments');
        if (stored) {
            try {
                this.state.segments = JSON.parse(stored);
            } catch (e) {
                this.state.segments = [];
            }
        } else {
            this.state.segments = [];
        }
    },

    async saveSegmentsToServer() {
        try {
            await fetch('/api/segments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(this.state.segments || [])
            });
        } catch (e) {
            console.error('Failed to save segments:', e);
        }
    },

    saveSegmentsToStorage() {
        localStorage.setItem('cloudmail_segments', JSON.stringify(this.state.segments || []));
        this.saveSegmentsToServer();
    },

    // =========================================================================
    // FIELDS — Persistence
    // =========================================================================

    async loadFields() {
        try {
            const res = await fetch('/api/fields');
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data) && data.length) {
                    this.state.fields = data;
                    return;
                }
            }
        } catch (e) {
            console.warn('Failed to load fields:', e);
        }
        // Fallback: check localStorage
        const stored = localStorage.getItem('cloudmail_fields');
        if (stored) {
            try {
                this.state.fields = JSON.parse(stored);
                if (this.state.fields.length) return;
            } catch (e) {}
        }
        this.state.fields = this._defaultFields();
    },

    saveFieldsToStorage() {
        localStorage.setItem('cloudmail_fields', JSON.stringify(this.state.fields || []));
        this.saveFieldsToServer();
    },

    async saveFieldsToServer() {
        try {
            await fetch('/api/fields', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(this.state.fields || [])
            });
        } catch (e) {
            console.error('Failed to save fields:', e);
        }
    },

    _defaultFields() {
        return [
            { label: 'Email address', type: 'Text', merge: '{{EmailAddress}}', def: '', locked: true },
            { label: 'First name',    type: 'Text', merge: '{{FirstName}}',    def: '', locked: true },
            { label: 'Last name',     type: 'Text', merge: '{{LastName}}',     def: '', locked: true },
        ];
    },

    // =========================================================================
    // IMPORTS — Persistence
    // =========================================================================

    async loadImports() {
        try {
            const res = await fetch('/api/imports');
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data)) {
                    this.state.imports = data;
                    return;
                }
            }
        } catch (e) {
            console.warn('Failed to load imports:', e);
        }
        this.state.imports = [];
    },

    async saveImportsToServer() {
        try {
            await fetch('/api/imports', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(this.state.imports || [])
            });
        } catch (e) {
            console.error('Failed to save imports:', e);
        }
    },

    saveImportsToStorage() {
        this.saveImportsToServer();
    },

    // =========================================================================
    // IMPORTS — Logic
    // =========================================================================

    renderImportsPage(container) {
        this._injectTabStyles();
        if (!this.state.imports) this.state.imports = [];
        const imports = this.state.imports;
        const headerHtml = this._contactsPageHeaderHtml('imports');

        let bodyHtml;
        if (imports.length === 0) {
            bodyHtml = `
            <div class="eo-tags-empty">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                    <path d="M24 12v24m12-12H12" stroke="#6c5ce7" stroke-width="2" stroke-linecap="round"/>
                </svg>
                <p style="font-size:15px;font-weight:600;color:#1a1a2e;margin:12px 0 6px">No imports yet</p>
                <p>Import contacts from a CSV file.</p>
                <button class="eo-add-btn" onclick="App._showImportWizard()">Import contacts</button>
            </div>`;
        } else {
            const rows = imports.map(imp => `
            <tr>
                <td>
                    <div style="font-weight:600">${this._esc(imp.filename)}</div>
                    <div style="font-size:12px;color:#888">${new Date(imp.date).toLocaleString()}</div>
                </td>
                <td>${imp.added} added, ${imp.updated} updated</td>
                <td><span class="eo-status-pill eo-status-pill--completed">Completed</span></td>
            </tr>`).join('');

            bodyHtml = `
            <div class="eo-fields-topbar">
                <button class="eo-create-tag-btn" onclick="App._showImportWizard()">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M7 1v12M1 7h12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                    </svg>
                    New import
                </button>
            </div>
            <table class="eo-imports-table">
                <thead>
                    <tr>
                        <th>File</th>
                        <th>Summary</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>`;
        }

        container.innerHTML = `
            ${headerHtml}
            <div class="eo-imports-page" id="eo-imports-container">${bodyHtml}</div>
        `;
    },

    _showImportWizard() {
        const container = document.getElementById('eo-imports-container');
        if (!container) return;
        container.innerHTML = `
            <div class="eo-import-wizard">
                <span class="eo-wizard-step-num">Step 1 of 2</span>
                <h2 class="eo-wizard-title">Upload a file</h2>
                <p class="eo-wizard-desc">Upload a CSV, JSON, TXT, or EmailOctopus ZIP file containing your contacts.</p>
                
                <div class="eo-upload-box" onclick="document.getElementById('eo-import-file').click()">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#6c5ce7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom:12px">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="17 8 12 3 7 8"></polyline>
                        <line x1="12" y1="3" x2="12" y2="15"></line>
                    </svg>
                    <div style="font-size:16px;font-weight:600;color:#333;margin-bottom:4px">Click to browse</div>
                    <div style="font-size:13px;color:#888">Maximum file size: 50MB</div>
                    <input type="file" id="eo-import-file" style="display:none" accept=".csv,.txt,.json,.zip" onchange="App._handleImportFile(this)">
                </div>
                
                <div class="eo-wizard-footer">
                    <button class="eo-cancel-tag-btn" onclick="App.renderImportsPage(document.getElementById('contact-list-items'))">Cancel</button>
                </div>
            </div>
        `;
    },

    _handleImportFile(input) {
        if (!input.files || !input.files[0]) return;
        const file = input.files[0];
        if (file.name.toLowerCase().endsWith('.zip')) {
            this._handleImportZipFile(file);
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target.result;
            this._processImportFile(file.name, text);
        };
        reader.readAsText(file);
    },

    async _handleImportZipFile(file) {
        try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await fetch('/api/import-contacts-zip', {
                method: 'POST',
                body: formData,
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.error || 'Failed to extract ZIP');
            await this._processImportFile(data.filename || file.name.replace(/\.zip$/i, '.csv'), data.text || '');
        } catch (e) {
            console.error('ZIP import failed:', e);
            alert('ZIP import failed: ' + e.message);
        }
    },

    _parseImportCsvLine(line) {
        const values = [];
        let value = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            const next = line[i + 1];
            if (ch === '"' && inQuotes && next === '"') {
                value += '"';
                i++;
            } else if (ch === '"') {
                inQuotes = !inQuotes;
            } else if (ch === ',' && !inQuotes) {
                values.push(value.trim());
                value = '';
            } else {
                value += ch;
            }
        }
        values.push(value.trim());
        return values;
    },

    _normalizeImportHeader(header) {
        return String(header || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
    },

    _guessImportMapping(headers) {
        return headers.map(header => {
            const h = this._normalizeImportHeader(header);
            if (['email', 'emailaddress', 'primaryemail', 'emails'].includes(h)) return 'email';
            if (['firstname', 'first'].includes(h)) return 'firstName';
            if (['lastname', 'last', 'surname'].includes(h)) return 'lastName';
            if (['name', 'fullname', 'contactname'].includes(h)) return 'name';
            if (h === 'phone' || h === 'telephone') return 'phone';
            if (h === 'company' || h === 'organization') return 'company';
            if (h === 'group' || h === 'list') return 'group';
            if (h === 'status') return 'status';
            if (h === 'notes' || h === 'note') return 'notes';
            return 'ignore';
        });
    },

    _isAutoImportMapping(mapping) {
        return mapping.includes('email') || mapping.includes('emails');
    },

    async _processImportFile(filename, text) {
        const trimmed = text.trim();
        if (!trimmed) {
            alert('File is empty.');
            return;
        }

        if (filename.toLowerCase().endsWith('.json') || trimmed.startsWith('[') || trimmed.startsWith('{')) {
            try {
                const parsed = JSON.parse(trimmed);
                const contacts = Array.isArray(parsed) ? parsed : (Array.isArray(parsed.contacts) ? parsed.contacts : []);
                if (!contacts.length) throw new Error('No contacts found in JSON export.');
                this._importState = { filename, exportedContacts: contacts };
                await this._executeImport();
                return;
            } catch (e) {
                alert('Import failed: ' + e.message);
                return;
            }
        }
        
        const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
        const headers = this._parseImportCsvLine(lines[0]).map(h => h.replace(/^"|"$/g, ''));
        const rows = lines.slice(1).map(l => this._parseImportCsvLine(l).map(c => c.replace(/^"|"$/g, '')));
        const mapping = this._guessImportMapping(headers);
        
        this._importState = { filename, headers, rows, mapping };
        if (this._isAutoImportMapping(mapping)) {
            await this._executeImport();
            return;
        }

        this._showImportMapping();
    },

    _showImportMapping() {
        const container = document.getElementById('eo-imports-container');
        if (!container) return;
        
        const { headers } = this._importState;
        
        const systemFields = [
            { id: 'email', label: 'Email address' },
            { id: 'name', label: 'Full name' },
            { id: 'firstName', label: 'First name' },
            { id: 'lastName', label: 'Last name' },
            { id: 'phone', label: 'Phone' },
            { id: 'company', label: 'Company' },
            { id: 'group', label: 'Contact list' },
            { id: 'status', label: 'Status' },
            { id: 'notes', label: 'Notes' },
            { id: 'ignore', label: 'Ignore column' }
        ];
        
        const mapRows = headers.map((h, i) => {
            let guessed = 'ignore';
            const hl = h.toLowerCase();
            if (hl.includes('email')) guessed = 'email';
            else if (hl.includes('first')) guessed = 'firstName';
            else if (hl.includes('last')) guessed = 'lastName';
            else if (hl === 'full name' || hl === 'name') guessed = 'name';
            else if (hl.includes('phone')) guessed = 'phone';
            else if (hl.includes('company')) guessed = 'company';
            else if (hl.includes('group')) guessed = 'group';
            else if (hl.includes('status')) guessed = 'status';
            else if (hl.includes('note')) guessed = 'notes';
            else if (hl.includes('name')) guessed = 'firstName';
            
            const opts = systemFields.map(f => `<option value="${f.id}" ${f.id === guessed ? 'selected' : ''}>${f.label}</option>`).join('');
            
            return `
            <div class="eo-mapping-row">
                <div class="eo-mapping-label">Column: ${this._esc(h)}</div>
                <select class="eo-match-select" id="eo-map-col-${i}">
                    ${opts}
                </select>
            </div>
            `;
        }).join('');

        container.innerHTML = `
            <div class="eo-import-wizard">
                <span class="eo-wizard-step-num">Step 2 of 2</span>
                <h2 class="eo-wizard-title">Match columns</h2>
                <p class="eo-wizard-desc">Match the columns from your file to contact fields.</p>
                
                <div class="eo-mapping-table">
                    ${mapRows}
                </div>
                
                <div class="eo-wizard-footer">
                    <button class="eo-cancel-tag-btn" onclick="App._showImportWizard()">Back</button>
                    <button class="eo-save-seg-btn" onclick="App._executeImport()">Import contacts</button>
                </div>
            </div>
        `;
    },

    async _executeImport() {
        const { filename, headers = [], rows = [], exportedContacts = null } = this._importState;
        const mapping = exportedContacts
            ? []
            : (this._importState.mapping || headers.map((h, i) => document.getElementById(`eo-map-col-${i}`)?.value || 'ignore'));
        
        let added = 0;
        let updated = 0;
        
        if (!this.state.contacts) this.state.contacts = [];

        const targetGroup = this.state.currentContactGroup && this.state.currentContactGroup !== 'all' && !this.state.currentContactGroup.startsWith('domain:')
            ? this.state.currentContactGroup
            : 'personal';

        const sourceContacts = exportedContacts || rows.map(row => {
            const contact = {};
            for (let i = 0; i < mapping.length; i++) {
                const mapTo = mapping[i];
                const value = row[i];
                if (mapTo === 'ignore' || !value) continue;
                contact[mapTo] = value;
            }
            return contact;
        });

        for (const rawContact of sourceContacts) {
            const email = String(
                rawContact.email ||
                rawContact.emailAddress ||
                rawContact.primaryEmail ||
                (Array.isArray(rawContact.emails) ? rawContact.emails[0] : rawContact.emails) ||
                ''
            ).trim().toLowerCase();

            if (!email) continue;

            const name = String(rawContact.name || [rawContact.firstName, rawContact.lastName].filter(Boolean).join(' ') || email).trim();
            const group = targetGroup || (
                rawContact.group && rawContact.group !== 'all' && !String(rawContact.group).startsWith('domain:')
                    ? rawContact.group
                    : 'personal'
            );

            const existing = this.state.contacts.find(c =>
                (c.emails || (c.email ? [c.email] : [])).some(e => String(e).toLowerCase() === email)
            );
            if (existing) {
                existing.emails = existing.emails || (existing.email ? [existing.email] : [email]);
                delete existing.email;
                if (name) existing.name = name;
                if (rawContact.firstName) existing.firstName = rawContact.firstName;
                if (rawContact.lastName) existing.lastName = rawContact.lastName;
                if (rawContact.phone) existing.phone = rawContact.phone;
                if (rawContact.company) existing.company = rawContact.company;
                if (rawContact.notes) existing.notes = rawContact.notes;
                if (rawContact.status) existing.status = rawContact.status;
                existing.group = group;
                existing.updatedAt = Date.now();
                updated++;
            } else {
                const contact = {
                    ...rawContact,
                    id: rawContact.id || 'import-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
                    name,
                    emails: [email],
                    group,
                    phone: rawContact.phone || '',
                    company: rawContact.company || '',
                    notes: rawContact.notes || '',
                    status: rawContact.status || 'subscribed',
                    createdAt: rawContact.createdAt || Date.now(),
                    updatedAt: Date.now(),
                };
                delete contact.email;
                this.state.contacts.push(contact);
                added++;
            }
        }
        
        if (this.saveContactsToStorage) await this.saveContactsToStorage();

        const importedGroupContacts = (this.state.contacts || []).filter(contact => contact.group === targetGroup);
        if (importedGroupContacts.length) {
            const persisted = await this._persistImportedContactGroup(targetGroup, importedGroupContacts);
            if (!persisted) {
                alert('Import completed in the browser, but saving the selected list failed. Refresh may lose these imported contacts.');
            }
        }
        
        if (!this.state.imports) this.state.imports = [];
        this.state.imports.unshift({
            filename,
            date: Date.now(),
            added,
            updated
        });
        this.saveImportsToStorage();
        
        this._importState = null;
        this.renderImportsPage(document.getElementById('contact-list-items'));
    },

    async _persistImportedContactGroup(group, contacts) {
        try {
            const res = await fetch('/api/contact-group-export', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    group,
                    contacts,
                    replace: true,
                    source: 'import',
                }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || data.success === false) throw new Error(data.error || 'Selected list save failed');
            return true;
        } catch (e) {
            console.error('Failed to persist imported contact group:', e);
            return false;
        }
    },

    // =========================================================================
    // FIELDS — render the fields tab
    // =========================================================================

    renderFieldsPage(container) {
        this._injectTabStyles();
        if (!this.state.fields) this.state.fields = this._defaultFields();
        const headerHtml = this._contactsPageHeaderHtml('fields');

        const rows = this.state.fields.map((f, i) => {
            const actions = f.locked ? '' : `
                <div class="eo-field-row-actions">
                    <button class="eo-icon-btn" title="Edit" onclick="App._openFieldEditor(${i})">
                        <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                            <path d="M10.5 2.5l2 2-7 7H3.5v-2l7-7z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>
                        </svg>
                    </button>
                    <button class="eo-icon-btn eo-icon-btn--danger" title="Delete" onclick="App._deleteField(${i})">
                        <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                            <path d="M2 3.5h11M6 3.5V2.5a.5.5 0 01.5-.5h2a.5.5 0 01.5.5v1M5.5 3.5l.4 8M9.5 3.5l-.4 8"
                                  stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
                        </svg>
                    </button>
                </div>`;
            return `
            <tr class="eo-field-tr">
                <td class="eo-field-td eo-field-td--label">
                    <span class="${f.locked ? 'eo-field-label-locked' : ''}">${this._esc(f.label)}</span>
                    ${actions}
                </td>
                <td class="eo-field-td"><span class="eo-type-pill">${this._esc(f.type)}</span></td>
                <td class="eo-field-td"><span class="eo-merge-tag">${this._esc(f.merge)}</span></td>
                <td class="eo-field-td eo-field-td--default">${this._esc(f.def || '')}</td>
            </tr>`;
        }).join('');

        container.innerHTML = `
            ${headerHtml}
            <div class="eo-fields-page">
                <div class="eo-fields-topbar">
                    <button class="eo-create-tag-btn" onclick="App._openFieldEditor()">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path d="M7 1v12M1 7h12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                        </svg>
                        Add field
                    </button>
                </div>
                <table class="eo-fields-table">
                    <thead>
                        <tr>
                            <th class="eo-fth eo-fth--label">Label</th>
                            <th class="eo-fth">Type</th>
                            <th class="eo-fth">
                                Merge tag
                                <span class="eo-th-info" title="Insert these tags into campaigns to personalise content">i</span>
                            </th>
                            <th class="eo-fth">
                                Default value
                                <span class="eo-th-info" title="Used when a contact has no value for this field">i</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
            ${this._fieldEditorModalHtml()}`;
    },

    _fieldLabelToMergeTag(label) {
        return '{{' + label
            .replace(/[^a-zA-Z0-9 ]+/g, ' ')
            .trim()
            .replace(/\s+(.)/g, (_, c) => c.toUpperCase())
            .replace(/^(.)/, (_, c) => c.toUpperCase())
        + '}}';
    },

    _fieldEditorModalHtml() {
        return `
        <div class="eo-modal-backdrop" id="eo-field-modal" onclick="if(event.target===this)App._closeFieldEditor()">
            <div class="eo-modal">
                <button class="eo-modal-close" onclick="App._closeFieldEditor()">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
                    </svg>
                </button>
                <div class="eo-modal-title" id="eo-field-modal-title">Add field</div>

                <div class="eo-modal-field">
                    <label class="eo-modal-label">Label</label>
                    <input class="eo-modal-input" id="eo-field-label-input" placeholder="e.g. Phone number"
                           oninput="App._fieldAutoMerge()">
                </div>

                <div class="eo-modal-field">
                    <label class="eo-modal-label">Type</label>
                    <div class="eo-type-grid" id="eo-type-grid">
                        <button class="eo-type-opt eo-type-opt--selected" data-type="Text"    onclick="App._selectFieldType(this)">Text<small>Single line of text</small></button>
                        <button class="eo-type-opt"                        data-type="Number"  onclick="App._selectFieldType(this)">Number<small>Whole or decimal</small></button>
                        <button class="eo-type-opt"                        data-type="Date"    onclick="App._selectFieldType(this)">Date<small>Date picker</small></button>
                        <button class="eo-type-opt"                        data-type="Boolean" onclick="App._selectFieldType(this)">Yes / No<small>True or false</small></button>
                    </div>
                </div>

                <div class="eo-modal-field">
                    <label class="eo-modal-label">
                        Default value
                        <span style="font-weight:400;font-size:11px;color:#aaa;text-transform:none;letter-spacing:0">(optional)</span>
                    </label>
                    <input class="eo-modal-input" id="eo-field-default-input" placeholder="Leave blank for none">
                </div>

                <div class="eo-modal-footer">
                    <button class="eo-cancel-tag-btn" onclick="App._closeFieldEditor()">Cancel</button>
                    <button class="eo-save-seg-btn" id="eo-field-save-btn" onclick="App._saveField()">Add field</button>
                </div>
            </div>
        </div>`;
    },

    _openFieldEditor(idx) {
        this._fieldEditIdx = (idx !== undefined) ? idx : null;
        const modal = document.getElementById('eo-field-modal');
        if (!modal) return;

        const isEdit = this._fieldEditIdx !== null;
        const f = isEdit ? this.state.fields[this._fieldEditIdx] : null;

        document.getElementById('eo-field-modal-title').textContent = isEdit ? 'Edit field' : 'Add field';
        document.getElementById('eo-field-save-btn').textContent    = isEdit ? 'Save changes' : 'Add field';
        document.getElementById('eo-field-label-input').value   = isEdit ? f.label : '';
        document.getElementById('eo-field-default-input').value = isEdit ? (f.def || '') : '';

        document.querySelectorAll('.eo-type-opt').forEach(b => {
            b.classList.toggle('eo-type-opt--selected', b.dataset.type === (isEdit ? f.type : 'Text'));
        });

        modal.style.display = 'flex';
        setTimeout(() => document.getElementById('eo-field-label-input').focus(), 50);
    },

    _closeFieldEditor() {
        const modal = document.getElementById('eo-field-modal');
        if (modal) modal.style.display = 'none';
        this._fieldEditIdx = null;
    },

    _selectFieldType(btn) {
        document.querySelectorAll('.eo-type-opt').forEach(b => b.classList.remove('eo-type-opt--selected'));
        btn.classList.add('eo-type-opt--selected');
    },

    _fieldAutoMerge() {
        // no-op — merge tag generated on save
    },

    _saveField() {
        const labelEl   = document.getElementById('eo-field-label-input');
        const label     = labelEl.value.trim();
        if (!label) { labelEl.focus(); return; }

        const type      = document.querySelector('.eo-type-opt--selected')?.dataset.type || 'Text';
        const def       = document.getElementById('eo-field-default-input').value.trim();
        const merge     = this._fieldLabelToMergeTag(label);

        if (!this.state.fields) this.state.fields = this._defaultFields();

        if (this._fieldEditIdx !== null) {
            this.state.fields[this._fieldEditIdx] = {
                ...this.state.fields[this._fieldEditIdx],
                label, type, merge, def
            };
        } else {
            this.state.fields.push({ label, type, merge, def, locked: false });
        }

        this.saveFieldsToStorage();
        this._closeFieldEditor();
        this.renderFieldsPage(document.getElementById('contact-list-items'));
    },

    _deleteField(idx) {
        const f = this.state.fields[idx];
        if (!confirm(`Delete field "${f.label}"?`)) return;
        this.state.fields.splice(idx, 1);
        this.saveFieldsToStorage();
        this.renderFieldsPage(document.getElementById('contact-list-items'));
    },

    // =========================================================================
    // TAGS — render the tags tab (improved MailerLite style)
    // =========================================================================

    renderTagsPage(container) {
        this._injectTabStyles();
        
        // Synchronize this.state.tags with actual contact tags and their counts
        const tagMap = new Map();
        (this.state.tags || []).forEach(t => {
            const name = typeof t === 'string' ? t : t?.name;
            if (name) {
                tagMap.set(name, {
                    name,
                    count: 0,
                    createdTs: t.createdTs || Date.now()
                });
            }
        });
        
        (this.state.contacts || []).forEach(c => {
            // Only use actual tags, not groups
            (c.tags || []).forEach(t => {
                if (!t) return;
                if (!tagMap.has(t)) {
                    tagMap.set(t, { name: t, count: 0, createdTs: Date.now() });
                }
                tagMap.get(t).count++;
            });
        });
        
        this.state.tags = Array.from(tagMap.values()).sort((a,b) => a.name.localeCompare(b.name));
        
        const tags = this.state.tags;
        const headerHtml = this._contactsPageHeaderHtml('tags');

        const fmtDateTime = ts => {
            if (!ts) return null;
            const d = new Date(ts);
            const mo = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
            const h12 = d.getHours() % 12 || 12;
            const min = String(d.getMinutes()).padStart(2,'0');
            const ap  = d.getHours() >= 12 ? 'PM' : 'AM';
            return `${mo[d.getMonth()]} ${d.getDate()} ${d.getFullYear()} at ${h12}:${min} ${ap}`;
        };

        let bodyHtml;

        if (tags.length === 0) {
            bodyHtml = `
            <div class="eo-tags-empty">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                    <path d="M6 24L24 6l18 18v18H6V24z" stroke="#6c5ce7" stroke-width="2" stroke-linejoin="round"/>
                    <circle cx="30" cy="20" r="3" fill="#6c5ce7"/>
                </svg>
                <p style="font-size:15px;font-weight:600;color:#1a1a2e;margin:12px 0 6px">No tags yet</p>
                <p>Tags help you organise and segment your contacts.</p>
                <button class="eo-add-btn" onclick="App._showAddTagForm()">Create your first tag</button>
            </div>`;
        } else {
            const rows = tags.map(tag => `
            <tr class="eo-tag-tr" onmouseenter="this.style.background='#fafafe'" onmouseleave="this.style.background=''">
                <td class="eo-td-tag">
                    <div style="font-size:15px;font-weight:500;color:#1a1a2e;margin-bottom:3px">${this._esc(tag.name)}</div>
                    ${tag.createdTs
                        ? `<div style="font-size:12px;color:#aaa">Created ${fmtDateTime(tag.createdTs)}</div>`
                        : tag.created ? `<div style="font-size:12px;color:#aaa">Created ${tag.created}</div>` : ''}
                </td>
                <td class="eo-td-subs">
                    <div style="font-size:15px;font-weight:500;color:#1a1a2e">${tag.count.toLocaleString()}</div>
                    <div style="font-size:12px;color:#aaa">Subscribers</div>
                </td>
                <td class="eo-td-actions">
                    <div class="eo-tag-actions-wrap">
                        <button class="eo-chevron-btn" aria-label="Actions"
                                onclick="App._toggleTagDropdown(this, '${this._esc(tag.name)}')">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </button>
                        <div class="eo-tag-dropdown" id="eo-tag-dd-${this._esc(tag.name)}" style="display:none">
                            <button class="eo-dd-item" onclick="App._editTagName('${this._esc(tag.name)}')">Edit</button>
                            <button class="eo-dd-item eo-dd-danger" onclick="App._deleteTag('${this._esc(tag.name)}')">Delete</button>
                            <button class="eo-dd-item" onclick="App._viewContactsByTag('${this._esc(tag.name)}')">View contacts</button>
                        </div>
                    </div>
                </td>
            </tr>`).join('');

            bodyHtml = `
            <div class="eo-tags-topbar">
                <button class="eo-create-tag-btn" onclick="App._showCreateTagModal()">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M7 1v12M1 7h12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                    </svg>
                    Create a tag
                </button>
                <span class="eo-tags-count-info">1–${tags.length} of <strong>${tags.length}</strong></span>
            </div>
            <table class="eo-tags-table">
                <thead>
                    <tr>
                        <th class="eo-th-tag">Name</th>
                        <th class="eo-th-subs">Subscribers</th>
                        <th class="eo-th-act"></th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
            <div class="eo-tags-bottombar">
                <span>1–${tags.length} of <strong>${tags.length}</strong></span>
            </div>
            <div class="eo-add-tag-row" id="eo-add-tag-row" style="display:none">
                <input class="eo-tag-input" id="eo-new-tag-input" placeholder="Tag name…"
                       onkeydown="if(event.key==='Enter')App._saveNewTag();if(event.key==='Escape')App._hideAddTagForm()">
                <button class="eo-save-tag-btn" onclick="App._saveNewTag()">Save</button>
                <button class="eo-cancel-tag-btn" onclick="App._hideAddTagForm()">Cancel</button>
            </div>`;
        }

        container.innerHTML = `
            ${headerHtml}
            <div class="eo-tags-page">${bodyHtml}</div>`;
    },

    _buildTagsFromContacts() {
        const map = {};
        (this.state.contacts || []).forEach(c => {
            const contactTags = c.tags || (c.group ? [c.group] : []);
            contactTags.forEach(t => {
                if (!map[t]) map[t] = { name: t, count: 0, createdTs: null };
                map[t].count++;
            });
        });
        return Object.values(map).sort((a,b) => a.name.localeCompare(b.name));
    },

    _showAddTagForm() {
        let row = document.getElementById('eo-add-tag-row');
        if (!row) {
            // re-render with tags list to get the form row
            this.renderTagsPage(document.getElementById('contact-list-items'));
            row = document.getElementById('eo-add-tag-row');
        }
        if (row) { row.style.display = 'flex'; document.getElementById('eo-new-tag-input')?.focus(); }
    },

    _hideAddTagForm() {
        const row = document.getElementById('eo-add-tag-row');
        if (row) row.style.display = 'none';
    },

    _saveNewTag() {
        const input = document.getElementById('eo-new-tag-input');
        if (!input) return;
        const name = input.value.trim();
        if (!name) return;
        if (!this.state.tags) this.state.tags = [];
        if (!this.state.tags.find(t => t.name === name)) {
            this.state.tags.push({
                name,
                count: 0,
                createdTs: Date.now()
            });
        }
        this.saveTagsToStorage();
        this.renderTagsPage(document.getElementById('contact-list-items'));
    },

    _deleteTag(name) {
        if (!confirm(`Delete tag "${name}"? This will remove it from all contacts.`)) return;
        if (this.state.tags) this.state.tags = this.state.tags.filter(t => t.name !== name);
        (this.state.contacts || []).forEach(c => {
            if (c.tags) c.tags = c.tags.filter(t => t !== name);
        });
        this.saveTagsToStorage();
        this.saveContactsToStorage && this.saveContactsToStorage();
        this.renderTagsPage(document.getElementById('contact-list-items'));
    },

    _editTagName(oldName) {
        const newName = prompt(`Rename tag "${oldName}":`, oldName);
        if (!newName || !newName.trim() || newName.trim() === oldName) return;
        const tag = (this.state.tags || []).find(t => t.name === oldName);
        if (tag) tag.name = newName.trim();
        // Update contacts that use this tag
        (this.state.contacts || []).forEach(c => {
            if (c.tags) {
                const idx = c.tags.indexOf(oldName);
                if (idx !== -1) c.tags[idx] = newName.trim();
            }
        });
        this.saveTagsToStorage();
        this.saveContactsToStorage && this.saveContactsToStorage();
        this.renderTagsPage(document.getElementById('contact-list-items'));
    },

    _toggleTagDropdown(btn, tagName) {
        // Close all open dropdowns
        document.querySelectorAll('.eo-tag-dropdown').forEach(dd => {
            if (dd.id !== `eo-tag-dd-${tagName}`) dd.style.display = 'none';
        });
        const dd = document.getElementById(`eo-tag-dd-${tagName}`);
        if (!dd) return;
        const isOpen = dd.style.display !== 'none';
        dd.style.display = isOpen ? 'none' : 'block';
        if (!isOpen) {
            const close = e => {
                if (!dd.contains(e.target) && e.target !== btn) {
                    dd.style.display = 'none';
                    document.removeEventListener('click', close);
                }
            };
            setTimeout(() => document.addEventListener('click', close), 0);
        }
    },

    _showCreateTagModal() {
        this._showAddTagForm();
    },

    _viewContactsByTag(tagName) {
        this.state.currentContactTab = 'contacts';
        this.state.contactSearchQuery = '';
        this.state.contactTagFilter = tagName;
        this.updateContactsUrl?.();
        this.renderContactsTab('contacts');
    },

    // =========================================================================
    // SEGMENTS — list page
    // =========================================================================

    renderSegmentsPage(container) {
        this._injectTabStyles();
        if (!this.state.segments) this.state.segments = [];

        const segs = this.state.segments;
        const headerHtml = this._contactsPageHeaderHtml('segments');

        const fmtDate = ts => {
            if (!ts) return '—';
            const d = new Date(ts);
            const mo = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
            return `${mo[d.getMonth()]} ${d.getDate()} ${d.getFullYear()}`;
        };

        let bodyHtml = '';
        if (segs.length === 0) {
            bodyHtml = `
            <div class="eo-segments-empty">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                    <circle cx="24" cy="24" r="16" stroke="#6c5ce7" stroke-width="2"/>
                    <path d="M24 8v16l10 6" stroke="#6c5ce7" stroke-width="2" stroke-linecap="round"/>
                </svg>
                <p style="font-size:15px;margin:12px 0 8px;color:#555;font-weight:600;">No segments yet</p>
                <p style="font-size:13px;color:#aaa;margin:0 0 20px;">Segments let you filter contacts by conditions and use them in campaigns.</p>
                <button class="eo-add-btn" onclick="App._openSegmentEditor()">Create your first segment</button>
            </div>`;
        } else {
            bodyHtml = `
            <div>
                <div class="eo-seg-list-header">
                    <div>Name</div>
                    <div>Contacts</div>
                    <div>Last updated</div>
                    <div></div>
                </div>
                ${segs.map(seg => {
                    const count = this._evalSegment(seg);
                    return `
                    <div class="eo-seg-row" onclick="App._openSegmentEditor('${seg.id}')">
                        <div>
                            <div class="eo-seg-name">${this._esc(seg.name)}</div>
                            <div class="eo-seg-meta">${seg.filters ? seg.filters.length : 0} filter(s)</div>
                        </div>
                        <div class="eo-seg-count">${count.toLocaleString()}</div>
                        <div class="eo-seg-date">${fmtDate(seg.updatedAt)}</div>
                        <div class="eo-seg-acts" onclick="event.stopPropagation()">
                            <button class="eo-icon-btn" title="Delete"
                                    onclick="App._deleteSegment('${seg.id}')">
                                <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                                    <path d="M2 3.5h11M6 3.5V2.5a.5.5 0 01.5-.5h2a.5.5 0 01.5.5v1M5.5 3.5l.4 8M9.5 3.5l-.4 8"
                                          stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
                                </svg>
                            </button>
                        </div>
                    </div>`;
                }).join('')}
            </div>`;
        }

        container.innerHTML = `
            ${headerHtml}
            <div class="eo-segments-page">${bodyHtml}</div>`;
    },

    // =========================================================================
    // SEGMENTS — editor (create / edit)
    // =========================================================================

    _openSegmentEditor(segId) {
        this._injectTabStyles();
        const container = document.getElementById('contact-list-items');
        if (!container) return;

        const isNew = !segId;
        const seg = segId
            ? (this.state.segments || []).find(s => s.id === segId)
            : null;

        // editor state
        this._segEditorId     = segId || null;
        this._segEditorGroups = seg
            ? JSON.parse(JSON.stringify(seg.filterGroups || [{ match: 'all', filters: seg.filters || [{}] }]))
            : [{ match: 'all', filters: [{ field: '', operator: '', value: '' }] }];

        this._renderSegmentEditor(container, seg);
    },

    _renderSegmentEditor(container, seg) {
        const headerHtml = this._contactsPageHeaderHtml('segments');
        const segName = seg ? seg.name : '';

        const FIELDS = [
            { value: 'email',       label: 'Email address' },
            { value: 'firstName',   label: 'First name' },
            { value: 'lastName',    label: 'Last name' },
            { value: 'tag',         label: 'Tag' },
            { value: 'group',       label: 'Group' },
            { value: 'status',      label: 'Status' },
            { value: 'subscribedAt',label: 'Subscribed date' },
        ];

        const OPERATORS = {
            email:        ['contains', 'does not contain', 'is', 'is not', 'starts with', 'ends with'],
            firstName:    ['contains', 'does not contain', 'is', 'is not', 'is blank', 'is not blank'],
            lastName:     ['contains', 'does not contain', 'is', 'is not', 'is blank', 'is not blank'],
            tag:          ['has tag', 'does not have tag'],
            group:        ['is', 'is not'],
            status:       ['is', 'is not'],
            subscribedAt: ['before', 'after', 'on'],
        };

        const NO_VALUE_OPS = ['is blank', 'is not blank', 'has tag', 'does not have tag'];

        const renderGroup = (group, gIdx) => {
            const filtersHtml = group.filters.map((f, fIdx) => {
                const fieldOpts = FIELDS.map(opt =>
                    `<option value="${opt.value}" ${f.field === opt.value ? 'selected' : ''}>${opt.label}</option>`
                ).join('');

                const ops = f.field ? (OPERATORS[f.field] || []) : [];
                const opOpts = ops.length
                    ? ops.map(op => `<option value="${op}" ${f.operator === op ? 'selected' : ''}>${op}</option>`).join('')
                    : '<option value="">Choose an operator</option>';

                const noVal = NO_VALUE_OPS.includes(f.operator);

                return `
                <div class="eo-filter-row" data-gidx="${gIdx}" data-fidx="${fIdx}">
                    <select class="eo-filter-select" style="flex:1.2"
                            onchange="App._segFieldChange(${gIdx},${fIdx},this.value)">
                        <option value="">Select an option</option>
                        ${fieldOpts}
                    </select>
                    <select class="eo-filter-select" ${!f.field ? 'disabled' : ''}
                            onchange="App._segOpChange(${gIdx},${fIdx},this.value)">
                        ${!f.field ? '<option value="">Choose an operator</option>' : opOpts}
                    </select>
                    <input class="eo-filter-value" type="text"
                           placeholder="${noVal ? '—' : 'Enter value…'}"
                           value="${this._esc(f.value || '')}"
                           ${noVal || !f.field ? 'disabled' : ''}
                           oninput="App._segValChange(${gIdx},${fIdx},this.value)">
                    <button class="eo-icon-btn" title="Remove filter"
                            onclick="App._segRemoveFilter(${gIdx},${fIdx})"
                            ${group.filters.length === 1 ? 'disabled style="opacity:.3"' : ''}>
                        <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                            <path d="M2 3.5h11M6 3.5V2.5a.5.5 0 01.5-.5h2a.5.5 0 01.5.5v1M5.5 3.5l.4 8M9.5 3.5l-.4 8"
                                  stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
                        </svg>
                    </button>
                </div>`;
            }).join('');

            return `
            <div class="eo-filter-group" data-gidx="${gIdx}">
                <div class="eo-filter-match-row">
                    <span>Subscribers matching</span>
                    <select class="eo-match-select" onchange="App._segMatchChange(${gIdx},this.value)">
                        <option value="all"  ${group.match==='all'  ? 'selected' : ''}>all</option>
                        <option value="any"  ${group.match==='any'  ? 'selected' : ''}>any</option>
                    </select>
                    <span>of the following</span>
                    ${this._segEditorGroups.length > 1 ? `
                    <button class="eo-icon-btn" style="margin-left:auto"
                            onclick="App._segRemoveGroup(${gIdx})" title="Remove group">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path d="M2 7h10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                        </svg>
                    </button>` : ''}
                </div>
                ${filtersHtml}
                <button class="eo-add-filter-btn" onclick="App._segAddFilter(${gIdx})">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M7 1v12M1 7h12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                    </svg>
                    Add filter
                </button>
            </div>`;
        };

        const groupsHtml = this._segEditorGroups.map((g, i) => renderGroup(g, i)).join(`
            <div style="text-align:center;padding:12px 0;font-size:13px;color:#aaa;font-style:italic;">— OR —</div>`);

        container.innerHTML = `
            ${headerHtml}
            <div class="eo-seg-editor">
                <button class="eo-back-link" onclick="App.renderSegmentsPage(document.getElementById('contact-list-items'))">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M9 2L4 7l5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    Back to segments
                </button>

                <div class="eo-field-label">Name</div>
                <input class="eo-name-input" id="eo-seg-name" placeholder="Segment name…"
                       value="${this._esc(segName)}">

                <div style="margin-top:28px">
                    ${groupsHtml}
                </div>

                <div style="margin-top:16px;display:flex;gap:16px">
                    <button class="eo-add-filter-btn" onclick="App._segAddGroup()">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path d="M7 1v12M1 7h12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                        </svg>
                        Add filter group
                    </button>
                </div>

                <div class="eo-seg-footer">
                    <button class="eo-save-seg-btn" onclick="App._saveSegment()">Save</button>
                </div>
            </div>`;
    },

    // ── Segment editor state mutations (re-render after each) ─────────────────

    _segFieldChange(gIdx, fIdx, val) {
        this._segEditorGroups[gIdx].filters[fIdx].field    = val;
        this._segEditorGroups[gIdx].filters[fIdx].operator = '';
        this._segEditorGroups[gIdx].filters[fIdx].value    = '';
        this._rerenderSegEditor();
    },
    _segOpChange(gIdx, fIdx, val) {
        this._segEditorGroups[gIdx].filters[fIdx].operator = val;
        this._segEditorGroups[gIdx].filters[fIdx].value    = '';
        this._rerenderSegEditor();
    },
    _segValChange(gIdx, fIdx, val) {
        this._segEditorGroups[gIdx].filters[fIdx].value = val;
        // no re-render needed — just keep state in sync
    },
    _segMatchChange(gIdx, val) {
        this._segEditorGroups[gIdx].match = val;
    },
    _segAddFilter(gIdx) {
        this._segEditorGroups[gIdx].filters.push({ field: '', operator: '', value: '' });
        this._rerenderSegEditor();
    },
    _segRemoveFilter(gIdx, fIdx) {
        if (this._segEditorGroups[gIdx].filters.length <= 1) return;
        this._segEditorGroups[gIdx].filters.splice(fIdx, 1);
        this._rerenderSegEditor();
    },
    _segAddGroup() {
        this._segEditorGroups.push({ match: 'all', filters: [{ field: '', operator: '', value: '' }] });
        this._rerenderSegEditor();
    },
    _segRemoveGroup(gIdx) {
        if (this._segEditorGroups.length <= 1) return;
        this._segEditorGroups.splice(gIdx, 1);
        this._rerenderSegEditor();
    },
    _rerenderSegEditor() {
        const container = document.getElementById('contact-list-items');
        if (!container) return;
        const seg = this._segEditorId
            ? (this.state.segments || []).find(s => s.id === this._segEditorId)
            : null;
        // preserve name field value before re-render
        const nameEl = document.getElementById('eo-seg-name');
        if (nameEl && seg) seg._draftName = nameEl.value;
        if (nameEl && !seg) this._segDraftName = nameEl.value;
        this._renderSegmentEditor(container, seg);
        // restore name
        const newNameEl = document.getElementById('eo-seg-name');
        if (newNameEl) newNameEl.value = (seg && seg._draftName) || this._segDraftName || (seg && seg.name) || '';
    },

    _saveSegment() {
        const nameEl = document.getElementById('eo-seg-name');
        const name   = nameEl ? nameEl.value.trim() : '';
        if (!name) { nameEl && nameEl.focus(); return; }

        if (!this.state.segments) this.state.segments = [];

        const now = Date.now();
        if (this._segEditorId) {
            const idx = this.state.segments.findIndex(s => s.id === this._segEditorId);
            if (idx !== -1) {
                this.state.segments[idx] = {
                    ...this.state.segments[idx],
                    name,
                    filterGroups: JSON.parse(JSON.stringify(this._segEditorGroups)),
                    updatedAt: now
                };
            }
        } else {
            this.state.segments.push({
                id:           'seg_' + now + Math.random().toString(36).substr(2,5),
                name,
                filterGroups: JSON.parse(JSON.stringify(this._segEditorGroups)),
                createdAt:    now,
                updatedAt:    now
            });
        }

        this._segEditorId     = null;
        this._segEditorGroups = null;
        this._segDraftName    = null;
        this.saveSegmentsToStorage();
        this.renderSegmentsPage(document.getElementById('contact-list-items'));
    },

    _deleteSegment(id) {
        if (!confirm('Delete this segment?')) return;
        if (this.state.segments) this.state.segments = this.state.segments.filter(s => s.id !== id);
        this.saveSegmentsToStorage();
        this.renderSegmentsPage(document.getElementById('contact-list-items'));
    },

    // Evaluate how many contacts match a segment
    _evalSegment(seg) {
        const groups = seg.filterGroups || [{ match: 'all', filters: seg.filters || [] }];
        return (this.state.contacts || []).filter(contact => {
            // OR across groups
            return groups.some(group => {
                const results = group.filters.map(f => this._evalFilter(contact, f));
                return group.match === 'any'
                    ? results.some(Boolean)
                    : results.every(Boolean);
            });
        }).length;
    },

    _evalFilter(contact, f) {
        if (!f.field || !f.operator) return true;
        const val   = (f.value || '').toLowerCase();
        const field = f.field;
        let target  = '';

        if (field === 'email')        target = ((contact.emails || [])[0] || '').toLowerCase();
        else if (field === 'firstName') target = (contact.firstName || contact.name?.split(' ')[0] || '').toLowerCase();
        else if (field === 'lastName')  target = (contact.lastName  || contact.name?.split(' ').slice(1).join(' ') || '').toLowerCase();
        else if (field === 'tag')       return f.operator === 'has tag'
            ? (contact.tags || []).includes(f.value)
            : !(contact.tags || []).includes(f.value);
        else if (field === 'group')   target = (contact.group || '').toLowerCase();
        else if (field === 'status')  target = (contact.status || 'subscribed').toLowerCase();

        switch (f.operator) {
            case 'contains':         return target.includes(val);
            case 'does not contain': return !target.includes(val);
            case 'is':               return target === val;
            case 'is not':           return target !== val;
            case 'starts with':      return target.startsWith(val);
            case 'ends with':        return target.endsWith(val);
            case 'is blank':         return target === '';
            case 'is not blank':     return target !== '';
            default:                 return true;
        }
    },

    // =========================================================================
    // SHARED — contacts page header HTML (title row + tabs)
    // Call this at the top of any tab's render to include the standard header.
    // =========================================================================



    // =========================================================================
    // SHARED — escape helper (if not already on App)
    // =========================================================================

    _esc(str) {
        return String(str || '')
            .replace(/&/g,'&amp;').replace(/</g,'&lt;')
            .replace(/>/g,'&gt;').replace(/"/g,'&quot;')
            .replace(/'/g,'&#39;');
    },
};
