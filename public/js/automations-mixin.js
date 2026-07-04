/**
 * AutomationsMixin - Full Automations page logic for CloudMail
 * Merge via Object.assign(App, AutomationsMixin, ...)
 *
 * Requires:
 *   - A #automations-view element in your HTML
 *   - App.switchTask('automations') wires up to renderAutomations()
 */
export const AutomationsMixin = {

    // =========================================================================
    // AUTOMATIONS — Data
    // =========================================================================

    _automationTemplates: [
        {
            id: 'tpl_welcome',
            name: 'Simple welcome',
            description: 'A classic one-step automation to greet new subscribers',
            icon: 'hand',
            trigger: 'subscribes',
            steps: [{ type: 'email', delayDays: 0, subject: 'Welcome to our list!', body: '' }]
        },
        {
            id: 'tpl_birthday',
            name: 'Birthday celebration',
            description: 'Automatically email subscribers on their birthday or special date',
            icon: 'birthday',
            trigger: 'birthday',
            steps: [{ type: 'email', delayDays: 0, subject: 'Happy Birthday! 🎂', body: '' }]
        },
        {
            id: 'tpl_checkin',
            name: 'Check in',
            description: 'Check in with a contact a year after they subscribed to your list',
            icon: 'calendar',
            trigger: 'subscribes',
            steps: [{ type: 'email', delayDays: 365, subject: "It's been a year!", body: '' }]
        },
        {
            id: 'tpl_reengagement',
            name: 'Re-engagement sequence',
            description: 'Win back inactive subscribers with a smart re-engagement flow',
            icon: 'refresh',
            trigger: 'inactive',
            steps: [
                { type: 'email', delayDays: 0,  subject: 'We miss you!', body: '' },
                { type: 'wait',  delayDays: 3 },
                { type: 'email', delayDays: 0,  subject: 'Last chance to stay connected', body: '' },
            ]
        },
        {
            id: 'tpl_freebie',
            name: 'Landing page freebie',
            description: 'Send a subscriber a freebie or offer after they subscribe via your landing page',
            icon: 'gift',
            trigger: 'subscribes',
            steps: [{ type: 'email', delayDays: 0, subject: 'Here is your free gift!', body: '' }]
        },
        {
            id: 'tpl_monday',
            name: 'Monday motivation',
            description: 'Send an email every Monday to guide a contact through a five week course',
            icon: 'note',
            trigger: 'subscribes',
            steps: Array.from({ length: 5 }, (_, i) => ({
                type: 'email', delayDays: i * 7,
                subject: `Week ${i + 1}: Your Monday motivation`,
                body: ''
            }))
        },
    ],

    async loadAutomations() {
        try {
            const res = await fetch('/api/automations');
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data)) {
                    this.state.automations = data;
                    this.saveAutomationsToLocalStorage();
                }
            }
        } catch (e) {
            const stored = localStorage.getItem('cloudmail_automations');
            if (stored) {
                try { this.state.automations = JSON.parse(stored); }
                catch (e) { this.state.automations = []; }
            } else {
                this.state.automations = [];
            }
        }

        this.state.automationView = this.state.automationView || 'list'; // 'list' | 'setup' | 'builder'
        this.renderAutomations();
    },

    saveAutomationsToLocalStorage() {
        localStorage.setItem('cloudmail_automations', JSON.stringify(this.state.automations || []));
    },

    async saveAutomationsToServer() {
        try {
            await fetch('/api/automations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(this.state.automations)
            });
        } catch (e) { console.error('Failed to save automations:', e); }
    },

    saveAutomationsToStorage() {
        this.saveAutomationsToLocalStorage();
        this.saveAutomationsToServer();
    },

    // =========================================================================
    // AUTOMATIONS — Main Router
    // =========================================================================

    renderAutomations() {
        const view = document.getElementById('automations-view');
        if (!view) return;

        const subview = this.state.automationView || 'list';
        if (subview === 'setup')   return this._renderAutomationSetup(view);
        if (subview === 'builder') return this._renderAutomationBuilder(view);
        this._renderAutomationList(view);
    },

    // =========================================================================
    // AUTOMATIONS — List view
    // =========================================================================

    _renderAutomationList(view) {
        const automations = this.state.automations || [];

        const fmtDate = ts => {
            if (!ts) return '—';
            const d  = new Date(ts);
            const mo = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
            return `${mo[d.getMonth()]} ${d.getDate()} ${d.getFullYear()}`;
        };

        let html = `
        <style>
            /* ═══════════════════════════════════════════════════════════
               AUTOMATIONS PAGE
            ═══════════════════════════════════════════════════════════ */
            #automations-view {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                background: #fff;
                min-height: 100%;
                display: flex;
                flex-direction: column;
            }

            /* ── List header ──────────────────────────────────────── */
            .auto-list-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 32px 36px 24px;
                border-bottom: 1px solid #f0f0f5;
            }
            .auto-list-title {
                font-size: 28px;
                font-weight: 800;
                color: #1a1a2e;
                letter-spacing: -0.5px;
                margin: 0;
            }
            .auto-create-btn {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                background: #6c5ce7;
                color: #fff;
                border: none;
                border-radius: 10px;
                padding: 11px 22px;
                font-size: 14px;
                font-weight: 700;
                cursor: pointer;
                transition: background 0.15s, transform 0.1s;
                box-shadow: 0 4px 14px rgba(108,92,231,0.28);
            }
            .auto-create-btn:hover { background: #5b4fcf; transform: translateY(-1px); }

            /* ── Automation rows ──────────────────────────────────── */
            .auto-list-body {
                flex: 1;
                padding: 0 36px 36px;
            }

            .auto-row {
                display: grid;
                grid-template-columns: 44px 1fr auto auto auto;
                align-items: center;
                gap: 16px;
                padding: 18px 0;
                border-bottom: 1px solid #f0f0f5;
                cursor: pointer;
                transition: background 0.12s;
            }
            .auto-row:hover { background: #faf9ff; margin: 0 -36px; padding: 18px 36px; }
            .auto-row:last-child { border-bottom: none; }

            .auto-row-icon {
                width: 44px;
                height: 44px;
                background: #f0fde8;
                border-radius: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
            }
            .auto-row-info { min-width: 0; }
            .auto-row-name {
                font-size: 15px;
                font-weight: 700;
                color: #1a1a2e;
                margin-bottom: 3px;
            }
            .auto-row-meta { font-size: 13px; color: #aaa; }

            .auto-status-badge {
                display: inline-flex;
                align-items: center;
                gap: 5px;
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: 700;
            }
            .auto-status-badge--active   { background: #d4f7e7; color: #1a7a4a; }
            .auto-status-badge--paused   { background: #fff3cd; color: #856404; }
            .auto-status-badge--draft    { background: #f0f0f6; color: #666;    }
            .auto-status-dot {
                width: 6px; height: 6px; border-radius: 50%;
            }
            .auto-status-badge--active .auto-status-dot { background: #1a7a4a; }
            .auto-status-badge--paused .auto-status-dot { background: #ffc107; }
            .auto-status-badge--draft  .auto-status-dot { background: #aaa;    }

            .auto-row-stat {
                text-align: center;
                min-width: 70px;
            }
            .auto-row-stat-val   { font-size: 16px; font-weight: 800; color: #1a1a2e; }
            .auto-row-stat-label { font-size: 11px;  color: #aaa; font-weight: 500;   }

            .auto-row-actions {
                display: flex;
                gap: 6px;
            }
            .auto-icon-btn {
                width: 32px; height: 32px;
                border: 1.5px solid #e8e4f8;
                border-radius: 8px;
                background: #fff;
                display: flex; align-items: center; justify-content: center;
                cursor: pointer; color: #6c5ce7;
                transition: background 0.15s, border-color 0.15s;
            }
            .auto-icon-btn:hover { background: #f0eeff; border-color: #6c5ce7; }
            .auto-icon-btn--danger { color: #e53e3e; border-color: #ffd5d5; }
            .auto-icon-btn--danger:hover { background: #fff0f0; border-color: #e53e3e; }

            /* ── Empty state ──────────────────────────────────────── */
            .auto-empty {
                text-align: center;
                padding: 100px 40px;
                color: #ccc;
            }
            .auto-empty-icon { font-size: 60px; opacity: 0.18; margin-bottom: 18px; }
            .auto-empty-title { font-size: 17px; font-weight: 700; color: #ccc; margin-bottom: 8px; }
            .auto-empty-sub   { font-size: 14px; color: #ddd; margin-bottom: 24px; }
            .auto-empty-btn {
                display: inline-flex; align-items: center; gap: 8px;
                background: #6c5ce7; color: #fff; border: none;
                border-radius: 10px; padding: 12px 24px;
                font-size: 14px; font-weight: 700; cursor: pointer;
                box-shadow: 0 4px 14px rgba(108,92,231,0.28);
                transition: background 0.15s;
            }
            .auto-empty-btn:hover { background: #5b4fcf; }
        </style>

        <div class="auto-list-header">
            <h1 class="auto-list-title">Automations</h1>
            <button class="auto-create-btn" onclick="App._goAutomationSetup()">
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                    <path d="M7.5 2v11M2 7.5h11" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
                </svg>
                New automation
            </button>
        </div>

        <div class="auto-list-body">`;

        if (automations.length === 0) {
            html += `
            <div class="auto-empty">
                <div class="auto-empty-icon"><i class="fas fa-bolt"></i></div>
                <div class="auto-empty-title">No automations yet</div>
                <div class="auto-empty-sub">Set up automated email sequences triggered by subscriber actions.</div>
                <button class="auto-empty-btn" onclick="App._goAutomationSetup()">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M7 1v12M1 7h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                    Create your first automation
                </button>
            </div>`;
        } else {
            automations.forEach(a => {
                const iconSvg = this._autoIconSvg(a.icon || 'hand', 22, '#5a8a2a');
                const statusClass = `auto-status-badge--${a.status || 'draft'}`;
                const statusLabel = (a.status || 'draft').charAt(0).toUpperCase() + (a.status || 'draft').slice(1);
                html += `
                <div class="auto-row" onclick="App._editAutomation('${a.id}')">
                    <div class="auto-row-icon">${iconSvg}</div>
                    <div class="auto-row-info">
                        <div class="auto-row-name">${a.name || 'Untitled'}</div>
                        <div class="auto-row-meta">${a.steps ? a.steps.length : 0} step${a.steps && a.steps.length !== 1 ? 's' : ''} · Created ${fmtDate(a.createdAt)}</div>
                    </div>
                    <span class="auto-status-badge ${statusClass}">
                        <span class="auto-status-dot"></span>${statusLabel}
                    </span>
                    <div class="auto-row-stat">
                        <div class="auto-row-stat-val">${(a.enrolled || 0).toLocaleString()}</div>
                        <div class="auto-row-stat-label">Enrolled</div>
                    </div>
                    <div class="auto-row-actions" onclick="event.stopPropagation()">
                        <button class="auto-icon-btn" title="Edit" onclick="App._editAutomation('${a.id}')">
                            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                                <path d="M9.5 1.5l2 2-7 7H2.5v-2l7-7z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>
                            </svg>
                        </button>
                        <button class="auto-icon-btn auto-icon-btn--danger" title="Delete"
                                onclick="App._deleteAutomation('${a.id}')">
                            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                                <path d="M2 3.5h9M5 3.5V2.5a.5.5 0 01.5-.5h2a.5.5 0 01.5.5v1M4.5 3.5l.5 7M8.5 3.5l-.5 7"
                                      stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
                            </svg>
                        </button>
                    </div>
                </div>`;
            });
        }

        html += `</div>`; // .auto-list-body
        view.innerHTML = html;
    },

    // =========================================================================
    // AUTOMATIONS — Setup / Choose template view  (matches screenshot exactly)
    // =========================================================================

    _renderAutomationSetup(view) {
        const templates = this._automationTemplates;

        let html = `
        <style>
            /* ── Setup page ─────────────────────────────────────── */
            .auto-setup-wrap {
                padding: 28px 36px 48px;
                min-height: 100%;
                background: #fff;
            }
            .auto-setup-back {
                display: inline-flex; align-items: center; gap: 6px;
                color: #6c5ce7; font-size: 14px; font-weight: 600;
                cursor: pointer; background: none; border: none; padding: 0;
                margin-bottom: 28px;
                transition: opacity 0.15s;
            }
            .auto-setup-back:hover { opacity: 0.7; }

            .auto-setup-header {
                display: flex;
                align-items: flex-start;
                justify-content: space-between;
                margin-bottom: 36px;
            }
            .auto-setup-title {
                font-size: 32px;
                font-weight: 800;
                color: #1a1a2e;
                letter-spacing: -0.6px;
                margin: 0;
            }
            .auto-scratch-btn {
                display: inline-flex; align-items: center; gap: 8px;
                background: #fff; color: #444;
                border: 2px solid #e5e5ed;
                border-radius: 24px; padding: 12px 24px;
                font-size: 15px; font-weight: 600;
                cursor: pointer;
                transition: border-color 0.15s, color 0.15s, box-shadow 0.15s;
                white-space: nowrap;
            }
            .auto-scratch-btn:hover {
                border-color: #6c5ce7; color: #6c5ce7;
                box-shadow: 0 2px 12px rgba(108,92,231,0.12);
            }

            /* Template grid */
            .auto-tpl-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 16px;
            }
            .auto-tpl-card {
                display: flex;
                align-items: flex-start;
                gap: 20px;
                padding: 26px 28px;
                border: 2px solid #ececf3;
                border-radius: 16px;
                cursor: pointer;
                background: #fff;
                transition: border-color 0.15s, box-shadow 0.15s, transform 0.1s;
            }
            .auto-tpl-card:hover {
                border-color: #b8f5a0;
                box-shadow: 0 6px 24px rgba(90,138,42,0.1);
                transform: translateY(-2px);
            }
            .auto-tpl-icon-wrap {
                width: 72px; height: 72px;
                background: #e8fcd8;
                border-radius: 14px;
                display: flex; align-items: center; justify-content: center;
                flex-shrink: 0;
                /* Organic "blob" look like the screenshot */
                border-radius: 50% 38% 50% 38% / 38% 50% 38% 50%;
            }
            .auto-tpl-text { flex: 1; min-width: 0; }
            .auto-tpl-name {
                font-size: 18px;
                font-weight: 700;
                color: #1a1a2e;
                margin-bottom: 8px;
                line-height: 1.2;
            }
            .auto-tpl-desc {
                font-size: 14px;
                color: #777;
                line-height: 1.5;
            }
        </style>

        <div class="auto-setup-wrap">
            <!-- Back -->
            <button class="auto-setup-back" onclick="App._goAutomationList()">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M9 2L4 7l5 5" stroke="currentColor" stroke-width="1.8"
                          stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                Automations
            </button>

            <!-- Header -->
            <div class="auto-setup-header">
                <h1 class="auto-setup-title">Choose a starting point</h1>
                <button class="auto-scratch-btn" onclick="App._startAutomationFromScratch()">
                    Start from scratch
                </button>
            </div>

            <!-- Template grid -->
            <div class="auto-tpl-grid">`;

        templates.forEach(t => {
            const iconSvg = this._autoIconSvg(t.icon, 32, '#4a7a1e');
            html += `
                <div class="auto-tpl-card" onclick="App._startAutomationFromTemplate('${t.id}')">
                    <div class="auto-tpl-icon-wrap">${iconSvg}</div>
                    <div class="auto-tpl-text">
                        <div class="auto-tpl-name">${t.name}</div>
                        <div class="auto-tpl-desc">${t.description}</div>
                    </div>
                </div>`;
        });

        html += `
            </div>
        </div>`;

        view.innerHTML = html;
    },

    // =========================================================================
    // AUTOMATIONS — Builder view
    // =========================================================================

    _renderAutomationBuilder(view) {
        const a = this.state.currentAutomation || {
            id:      'auto_' + Date.now(),
            name:    'New automation',
            status:  'draft',
            trigger: 'subscribes',
            steps:   [],
            createdAt: Date.now(),
        };

        const triggerLabels = {
            subscribes: 'When someone subscribes',
            birthday:   "On subscriber's birthday",
            inactive:   'When subscriber becomes inactive',
            tag:        'When a tag is added',
        };

        let html = `
        <style>
            /* ── Builder ────────────────────────────────────────── */
            .auto-builder-wrap {
                display: flex;
                flex-direction: column;
                height: 100%;
                background: #f8f8fc;
                min-height: 100vh;
            }

            /* Top bar */
            .auto-builder-bar {
                display: flex;
                align-items: center;
                gap: 16px;
                padding: 16px 28px;
                background: #fff;
                border-bottom: 1px solid #ececf3;
                flex-shrink: 0;
            }
            .auto-builder-back {
                display: inline-flex; align-items: center; gap: 6px;
                color: #6c5ce7; font-size: 14px; font-weight: 600;
                cursor: pointer; background: none; border: none; padding: 0;
                transition: opacity 0.15s;
            }
            .auto-builder-back:hover { opacity: 0.7; }
            .auto-builder-name-input {
                flex: 1;
                font-size: 17px;
                font-weight: 700;
                color: #1a1a2e;
                border: none;
                outline: none;
                background: none;
                min-width: 0;
            }
            .auto-builder-name-input:focus {
                background: #f5f3ff;
                border-radius: 6px;
                padding: 4px 8px;
            }
            .auto-builder-status {
                padding: 6px 14px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: 700;
                background: #f0f0f6;
                color: #666;
                border: none;
                cursor: pointer;
                transition: all 0.15s;
            }
            .auto-builder-status.active { background: #d4f7e7; color: #1a7a4a; }
            .auto-builder-save {
                padding: 9px 22px;
                background: #6c5ce7;
                color: #fff;
                border: none;
                border-radius: 9px;
                font-size: 13px;
                font-weight: 700;
                cursor: pointer;
                transition: background 0.15s;
                box-shadow: 0 3px 10px rgba(108,92,231,0.25);
            }
            .auto-builder-save:hover { background: #5b4fcf; }

            /* Canvas */
            .auto-builder-canvas {
                flex: 1;
                padding: 40px 0;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 0;
                overflow-y: auto;
            }

            /* Trigger block */
            .auto-trigger-block {
                background: #fff;
                border: 2px solid #ececf3;
                border-radius: 14px;
                padding: 18px 24px;
                width: 380px;
                display: flex;
                align-items: center;
                gap: 14px;
                box-shadow: 0 2px 12px rgba(0,0,0,0.06);
            }
            .auto-trigger-icon {
                width: 42px; height: 42px;
                background: #e8fcd8;
                border-radius: 50% 38% 50% 38% / 38% 50% 38% 50%;
                display: flex; align-items: center; justify-content: center;
                flex-shrink: 0;
            }
            .auto-trigger-label {
                font-size: 11px; font-weight: 700; text-transform: uppercase;
                letter-spacing: 0.5px; color: #aaa; margin-bottom: 4px;
            }
            .auto-trigger-select {
                border: none; background: none; font-size: 14px;
                font-weight: 600; color: #1a1a2e; cursor: pointer;
                outline: none; width: 100%; padding: 0;
            }

            /* Connector line */
            .auto-connector {
                width: 2px; height: 32px;
                background: #d4d0f5;
                margin: 0 auto;
                position: relative;
            }
            .auto-connector::after {
                content: '';
                position: absolute;
                bottom: -5px; left: 50%;
                transform: translateX(-50%);
                border: 5px solid transparent;
                border-top-color: #d4d0f5;
            }

            /* Step block */
            .auto-step-block {
                background: #fff;
                border: 2px solid #ececf3;
                border-radius: 14px;
                padding: 16px 20px;
                width: 380px;
                display: flex;
                align-items: center;
                gap: 14px;
                box-shadow: 0 2px 12px rgba(0,0,0,0.05);
                cursor: pointer;
                transition: border-color 0.15s;
                position: relative;
            }
            .auto-step-block:hover { border-color: #c5bbf7; }
            .auto-step-icon {
                width: 38px; height: 38px;
                border-radius: 9px;
                display: flex; align-items: center; justify-content: center;
                flex-shrink: 0;
                font-size: 16px;
            }
            .auto-step-icon--email { background: #ede9ff; color: #6c5ce7; }
            .auto-step-icon--wait  { background: #fff3cd; color: #856404; }
            .auto-step-info { flex: 1; min-width: 0; }
            .auto-step-type  { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #aaa; }
            .auto-step-label { font-size: 14px; font-weight: 600; color: #1a1a2e; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            .auto-step-remove {
                width: 26px; height: 26px;
                border: none; background: none;
                color: #ccc; cursor: pointer; border-radius: 6px;
                display: flex; align-items: center; justify-content: center;
                transition: color 0.15s, background 0.15s;
                flex-shrink: 0;
            }
            .auto-step-remove:hover { color: #e53e3e; background: #fff0f0; }

            /* Add step button */
            .auto-add-step {
                width: 380px;
                margin-top: 4px;
                padding: 12px;
                border: 2px dashed #d4d0f5;
                border-radius: 12px;
                background: none;
                color: #6c5ce7;
                font-size: 13px;
                font-weight: 600;
                cursor: pointer;
                display: flex; align-items: center; justify-content: center; gap: 7px;
                transition: background 0.15s, border-color 0.15s;
            }
            .auto-add-step:hover { background: #f5f3ff; border-color: #6c5ce7; }

            /* Add step menu */
            .auto-add-menu {
                position: fixed;
                background: #fff;
                border: 1.5px solid #ede9ff;
                border-radius: 12px;
                box-shadow: 0 8px 28px rgba(0,0,0,0.12);
                z-index: 2000;
                min-width: 200px;
                overflow: hidden;
            }
            .auto-add-menu-item {
                padding: 12px 18px;
                font-size: 14px;
                font-weight: 500;
                color: #333;
                cursor: pointer;
                display: flex; align-items: center; gap: 10px;
                transition: background 0.1s;
            }
            .auto-add-menu-item:hover { background: #faf9ff; }
        </style>

        <div class="auto-builder-wrap">
            <!-- Top bar -->
            <div class="auto-builder-bar">
                <button class="auto-builder-back" onclick="App._goAutomationList()">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M9 2L4 7l5 5" stroke="currentColor" stroke-width="1.8"
                              stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    Automations
                </button>
                <input class="auto-builder-name-input"
                       id="auto-builder-name"
                       value="${a.name || 'New automation'}"
                       placeholder="Automation name">
                <button class="auto-builder-status ${a.status === 'active' ? 'active' : ''}"
                        onclick="App._toggleAutomationStatus()">
                    ${a.status === 'active' ? '● Active' : '○ Draft'}
                </button>
                <button class="auto-builder-save" onclick="App._saveAutomationBuilder()">
                    Save
                </button>
            </div>

            <!-- Canvas -->
            <div class="auto-builder-canvas" id="auto-builder-canvas">

                <!-- Trigger -->
                <div class="auto-trigger-block">
                    <div class="auto-trigger-icon">
                        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                            <path d="M11 3l2 6h6l-5 4 2 6-5-4-5 4 2-6-5-4h6l2-6z"
                                  stroke="#4a7a1e" stroke-width="1.5" stroke-linejoin="round"/>
                        </svg>
                    </div>
                    <div style="flex:1">
                        <div class="auto-trigger-label">Trigger</div>
                        <select class="auto-trigger-select" id="auto-trigger-select">
                            ${Object.entries(triggerLabels).map(([val, label]) =>
                                `<option value="${val}" ${a.trigger === val ? 'selected' : ''}>${label}</option>`
                            ).join('')}
                        </select>
                    </div>
                </div>

                <!-- Steps -->
                <div id="auto-steps-container">
                    ${(a.steps || []).map((s, i) => this._autoStepHtml(s, i)).join('')}
                </div>

                <!-- Add step -->
                <div class="auto-connector" style="height:20px;margin-top:0"></div>
                <button class="auto-add-step" onclick="App._showAddStepMenu(event)">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M7 1v12M1 7h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                    Add step
                </button>

            </div>
        </div>`;

        view.innerHTML = html;
    },

    _autoStepHtml(step, index) {
        const isEmail = step.type === 'email';
        const isWait  = step.type === 'wait';
        const iconClass = isEmail ? 'auto-step-icon--email' : 'auto-step-icon--wait';
        const iconSvg = isEmail
            ? `<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                   <rect x="1" y="3" width="14" height="10" rx="2" stroke="currentColor" stroke-width="1.4"/>
                   <path d="M1 6l7 4 7-4" stroke="currentColor" stroke-width="1.4"/>
               </svg>`
            : `<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                   <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.4"/>
                   <path d="M8 5v3.5l2.5 2.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
               </svg>`;
        const typeLabel  = isEmail ? 'Send email' : 'Wait';
        const stepLabel  = isEmail
            ? (step.subject || 'No subject')
            : `${step.delayDays || 1} day${step.delayDays !== 1 ? 's' : ''}`;

        return `
            <div class="auto-connector"></div>
            <div class="auto-step-block" data-step-index="${index}">
                <div class="auto-step-icon ${iconClass}">${iconSvg}</div>
                <div class="auto-step-info">
                    <div class="auto-step-type">${typeLabel}</div>
                    <div class="auto-step-label">${stepLabel}</div>
                </div>
                <button class="auto-step-remove" title="Remove step"
                        onclick="event.stopPropagation();App._removeAutomationStep(${index})">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M2 2l8 8M10 2L2 10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
                    </svg>
                </button>
            </div>`;
    },

    // =========================================================================
    // AUTOMATIONS — Navigation helpers
    // =========================================================================

    _goAutomationList() {
        this.state.automationView      = 'list';
        this.state.currentAutomation   = null;
        if (!(this.state.automations)) this.state.automations = [];
        this.renderAutomations();
    },

    _goAutomationSetup() {
        this.state.automationView = 'setup';
        this.renderAutomations();
    },

    _startAutomationFromTemplate(tplId) {
        const tpl = this._automationTemplates.find(t => t.id === tplId);
        if (!tpl) return;
        this.state.currentAutomation = {
            id:        'auto_' + Date.now() + Math.random().toString(36).substr(2, 5),
            name:      tpl.name,
            status:    'draft',
            trigger:   tpl.trigger,
            steps:     JSON.parse(JSON.stringify(tpl.steps)),
            icon:      tpl.icon,
            createdAt: Date.now(),
        };
        this.state.automationView = 'builder';
        this.renderAutomations();
    },

    _startAutomationFromScratch() {
        this.state.currentAutomation = {
            id:        'auto_' + Date.now() + Math.random().toString(36).substr(2, 5),
            name:      'New automation',
            status:    'draft',
            trigger:   'subscribes',
            steps:     [],
            createdAt: Date.now(),
        };
        this.state.automationView = 'builder';
        this.renderAutomations();
    },

    _editAutomation(id) {
        const a = (this.state.automations || []).find(x => x.id === id);
        if (!a) return;
        this.state.currentAutomation = JSON.parse(JSON.stringify(a));
        this.state.automationView    = 'builder';
        this.renderAutomations();
    },

    _deleteAutomation(id) {
        if (!confirm('Delete this automation?')) return;
        this.state.automations = (this.state.automations || []).filter(x => x.id !== id);
        this.saveAutomationsToStorage();
        this.renderAutomations();
    },

    // =========================================================================
    // AUTOMATIONS — Builder actions
    // =========================================================================

    _toggleAutomationStatus() {
        if (!this.state.currentAutomation) return;
        this.state.currentAutomation.status =
            this.state.currentAutomation.status === 'active' ? 'draft' : 'active';
        // Re-render just the button
        const btn = document.querySelector('.auto-builder-status');
        if (btn) {
            const isActive = this.state.currentAutomation.status === 'active';
            btn.textContent = isActive ? '● Active' : '○ Draft';
            btn.classList.toggle('active', isActive);
        }
    },

    _showAddStepMenu(e) {
        document.getElementById('auto-add-step-menu')?.remove();

        const menu = document.createElement('div');
        menu.id        = 'auto-add-step-menu';
        menu.className = 'auto-add-menu';
        const rect     = e.currentTarget.getBoundingClientRect();
        menu.style.top  = `${rect.bottom + 6}px`;
        menu.style.left = `${rect.left}px`;

        menu.innerHTML = `
            <div class="auto-add-menu-item"
                 onclick="App._addAutomationStep('email');document.getElementById('auto-add-step-menu')?.remove()">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style="color:#6c5ce7">
                    <rect x="1" y="3" width="14" height="10" rx="2" stroke="currentColor" stroke-width="1.4"/>
                    <path d="M1 6l7 4 7-4" stroke="currentColor" stroke-width="1.4"/>
                </svg>
                Send email
            </div>
            <div class="auto-add-menu-item"
                 onclick="App._addAutomationStep('wait');document.getElementById('auto-add-step-menu')?.remove()">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style="color:#856404">
                    <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.4"/>
                    <path d="M8 5v3.5l2.5 2.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
                </svg>
                Wait / Delay
            </div>`;

        document.body.appendChild(menu);
        const close = () => { menu.remove(); document.removeEventListener('click', close); };
        setTimeout(() => document.addEventListener('click', close), 0);
    },

    _addAutomationStep(type) {
        if (!this.state.currentAutomation) return;
        const step = type === 'email'
            ? { type: 'email', subject: 'New email', body: '', delayDays: 0 }
            : { type: 'wait',  delayDays: 1 };
        this.state.currentAutomation.steps.push(step);
        // Re-render just the steps container
        const container = document.getElementById('auto-steps-container');
        if (container) {
            container.innerHTML = this.state.currentAutomation.steps
                .map((s, i) => this._autoStepHtml(s, i)).join('');
        }
    },

    _removeAutomationStep(index) {
        if (!this.state.currentAutomation) return;
        this.state.currentAutomation.steps.splice(index, 1);
        const container = document.getElementById('auto-steps-container');
        if (container) {
            container.innerHTML = this.state.currentAutomation.steps
                .map((s, i) => this._autoStepHtml(s, i)).join('');
        }
    },

    _saveAutomationBuilder() {
        const a = this.state.currentAutomation;
        if (!a) return;

        // Read latest name + trigger from DOM
        const nameInput    = document.getElementById('auto-builder-name');
        const triggerSel   = document.getElementById('auto-trigger-select');
        if (nameInput)  a.name    = nameInput.value.trim() || 'Untitled';
        if (triggerSel) a.trigger = triggerSel.value;
        a.updatedAt = Date.now();

        if (!this.state.automations) this.state.automations = [];
        const idx = this.state.automations.findIndex(x => x.id === a.id);
        if (idx !== -1) {
            this.state.automations[idx] = a;
        } else {
            this.state.automations.unshift(a);
        }

        this.saveAutomationsToStorage();

        // Brief save flash
        const btn = document.querySelector('.auto-builder-save');
        if (btn) {
            btn.textContent = '✓ Saved';
            btn.style.background = '#00b894';
            setTimeout(() => {
                btn.textContent = 'Save';
                btn.style.background = '';
            }, 1500);
        }
    },

    // =========================================================================
    // AUTOMATIONS — Icon SVG helper
    // =========================================================================

    _autoIconSvg(icon, size = 28, color = '#4a7a1e') {
        const s = size;
        const paths = {
            hand: `<svg width="${s}" height="${s}" viewBox="0 0 28 28" fill="none">
                       <path d="M14 4v12M10 8v8M18 8v8M7 12v5a7 7 0 0014 0v-5" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                   </svg>`,
            birthday: `<svg width="${s}" height="${s}" viewBox="0 0 28 28" fill="none">
                           <rect x="4" y="13" width="20" height="12" rx="2" stroke="${color}" stroke-width="1.8"/>
                           <path d="M8 13V10M14 13V10M20 13V10" stroke="${color}" stroke-width="1.8" stroke-linecap="round"/>
                           <path d="M8 8c0-2 2-2 2-4M14 8c0-2 2-2 2-4M20 8c0-2 2-2 2-4" stroke="${color}" stroke-width="1.8" stroke-linecap="round"/>
                       </svg>`,
            calendar: `<svg width="${s}" height="${s}" viewBox="0 0 28 28" fill="none">
                           <rect x="3" y="5" width="22" height="20" rx="3" stroke="${color}" stroke-width="1.8"/>
                           <path d="M3 11h22M9 3v4M19 3v4" stroke="${color}" stroke-width="1.8" stroke-linecap="round"/>
                           <path d="M10 17l3 3 5-5" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                       </svg>`,
            refresh: `<svg width="${s}" height="${s}" viewBox="0 0 28 28" fill="none">
                          <path d="M4 14a10 10 0 1010-10H8M8 4l-4 4 4 4" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                          <path d="M8 20v-4h4" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>`,
            gift: `<svg width="${s}" height="${s}" viewBox="0 0 28 28" fill="none">
                       <rect x="3" y="11" width="22" height="4" rx="1.5" stroke="${color}" stroke-width="1.8"/>
                       <rect x="5" y="15" width="18" height="10" rx="2" stroke="${color}" stroke-width="1.8"/>
                       <path d="M14 11v14M9 11c0-3 2.5-5 5-3s2 5-5 3zM19 11c0-3-2.5-5-5-3s-2 5 5 3z" stroke="${color}" stroke-width="1.8" stroke-linecap="round"/>
                   </svg>`,
            note: `<svg width="${s}" height="${s}" viewBox="0 0 28 28" fill="none">
                       <rect x="5" y="3" width="18" height="22" rx="3" stroke="${color}" stroke-width="1.8"/>
                       <path d="M9 9h10M9 14h10M9 19h6" stroke="${color}" stroke-width="1.8" stroke-linecap="round"/>
                   </svg>`,
        };
        return paths[icon] || paths['note'];
    },
};
