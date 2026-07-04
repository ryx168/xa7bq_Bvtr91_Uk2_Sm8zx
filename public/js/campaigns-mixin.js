/**
 * CampaignsMixin - Full Campaigns page logic for CloudMail
 * Extracted pattern from ContactsMixin — merge via Object.assign(App, CampaignsMixin, ...)
 *
 * Requires:
 *   - A #campaigns-view element in your HTML (same pattern as #contacts-view)
 *   - App.switchTask('campaigns') wires up to renderCampaigns()
 *   - state.campaigns array (loaded from /api/campaigns or seeded below)
 */
export const CampaignsMixin = {

    // =========================================================================
    // CAMPAIGNS — Data Loading & Persistence
    // =========================================================================

    async loadCampaigns() {
        try {
            const res = await fetch('/api/campaigns');
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data)) {
                    this.state.campaigns = data;
                    console.log('Campaigns loaded from server:', data.length);
                    this.saveCampaignsToLocalStorage();
                }
            }
        } catch (e) {
            console.warn('Failed to load campaigns from server, falling back to localStorage:', e);
            const stored = localStorage.getItem('cloudmail_campaigns');
            if (stored) {
                try {
                    this.state.campaigns = JSON.parse(stored);
                } catch (e) {
                    console.error('Failed to parse campaigns from storage:', e);
                    this.state.campaigns = [];
                }
            } else {
                // Seed with demo data matching the screenshot
                this.state.campaigns = [
                    {
                        id: 'camp_1',
                        name: '2026 mother day_May06',
                        subject: '~普老師 送給母親的禮物~',
                        status: 'sent',
                        sentAt: Date.now() - 14 * 3600000,
                        sent: 115,
                        opens: 2,
                        openRate: 1.74,
                        clicks: 0,
                        clickRate: 0,
                        listName: 'XO Tours USD List',
                        previewText: ''
                    },
                    {
                        id: 'camp_2',
                        name: '2026 mother day_April22',
                        subject: '~普老師 送給母親的禮物~',
                        status: 'sent',
                        sentAt: new Date('2026-04-22T15:56:00').getTime(),
                        sent: 2307,
                        opens: 421,
                        openRate: 18.25,
                        clicks: 24,
                        clickRate: 1.04,
                        listName: 'XO Tours USD List',
                        previewText: ''
                    },
                    {
                        id: 'camp_3',
                        name: '2026 mother day_April15',
                        subject: '~普老師 送給母親的禮物~',
                        status: 'sent',
                        sentAt: new Date('2026-04-15T10:00:00').getTime(),
                        sent: 2280,
                        opens: 389,
                        openRate: 17.07,
                        clicks: 18,
                        clickRate: 0.79,
                        listName: 'XO Tours USD List',
                        previewText: ''
                    },
                    {
                        id: 'camp_4',
                        name: 'Spring Sale Announcement',
                        subject: '🌸 Spring is here — exclusive deals inside',
                        status: 'sent',
                        sentAt: new Date('2026-03-20T09:00:00').getTime(),
                        sent: 3100,
                        opens: 744,
                        openRate: 24.0,
                        clicks: 132,
                        clickRate: 4.26,
                        listName: 'XO Tours USD List',
                        previewText: 'Don\'t miss our biggest spring offers'
                    },
                    {
                        id: 'camp_5',
                        name: 'March Newsletter',
                        subject: 'March updates from XO Tours',
                        status: 'sent',
                        sentAt: new Date('2026-03-01T08:00:00').getTime(),
                        sent: 2950,
                        opens: 501,
                        openRate: 16.98,
                        clicks: 45,
                        clickRate: 1.53,
                        listName: 'XO Tours USD List',
                        previewText: ''
                    },
                    {
                        id: 'camp_6',
                        name: 'CNY Greetings 2026',
                        subject: '🧧 Happy Chinese New Year from XO Tours!',
                        status: 'sent',
                        sentAt: new Date('2026-01-28T07:00:00').getTime(),
                        sent: 3200,
                        opens: 896,
                        openRate: 28.0,
                        clicks: 211,
                        clickRate: 6.59,
                        listName: 'XO Tours USD List',
                        previewText: 'Wishing you a prosperous Year of the Snake'
                    },
                    {
                        id: 'camp_7',
                        name: 'Summer Tour Preview',
                        subject: 'Get ready for summer adventures ☀️',
                        status: 'scheduled',
                        scheduledAt: Date.now() + 3 * 24 * 3600000,
                        sent: 0,
                        opens: 0,
                        openRate: 0,
                        clicks: 0,
                        clickRate: 0,
                        listName: 'XO Tours USD List',
                        previewText: 'Exclusive summer tour packages'
                    },
                    {
                        id: 'camp_8',
                        name: 'June Flash Sale Draft',
                        subject: '⚡ Flash Sale — 48 hours only',
                        status: 'draft',
                        sent: 0,
                        opens: 0,
                        openRate: 0,
                        clicks: 0,
                        clickRate: 0,
                        listName: 'XO Tours USD List',
                        previewText: ''
                    }
                ];
                this.saveCampaignsToLocalStorage();
            }
        }

        this.state.campaignPage        = this.state.campaignPage        || 0;
        this.state.campaignStatusFilter = this.state.campaignStatusFilter || 'all';
        this.state.campaignSearchQuery  = this.state.campaignSearchQuery  || '';
        this.state.campaignSortKey      = this.state.campaignSortKey      || 'sentAt';
        this.state.campaignSortDir      = this.state.campaignSortDir      || 'desc';
        await this.loadCampaignLists();
        this.renderCampaigns();
    },

    saveCampaignsToLocalStorage() {
        localStorage.setItem('cloudmail_campaigns', JSON.stringify(this.state.campaigns));
    },

    async loadCampaignLists() {
        const fallbackLists = [
            { id: 'personal', name: 'Personal Addresses', icon: 'fa-address-book', system: true },
            { id: 'collected', name: 'Collected Recipients', icon: 'fa-bullseye', system: true },
            { id: 'trusted', name: 'Trusted Senders', icon: 'fa-check-circle', system: true },
            { id: 'xotours_us_customers', name: 'XO Tours US Customers', icon: 'fa-envelope-open-text' },
            { id: 'xotours_ca_customers', name: 'XO Tours CA Customers', icon: 'fa-envelope-open-text' },
        ];
        let lists = [];
        let storedLists = [];
        let contacts = [];

        try {
            const res = await fetch('/api/contact-lists', { cache: 'no-store' });
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data)) lists = data;
            }
        } catch (e) {
            console.warn('Failed to load campaign contact lists:', e);
        }

        try {
            const stored = localStorage.getItem('cloudmail_contact_lists');
            if (stored) {
                const data = JSON.parse(stored);
                if (Array.isArray(data)) storedLists = data;
            }
        } catch (e) {
            storedLists = [];
        }

        try {
            const res = await fetch('/api/contacts', { cache: 'no-store' });
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data)) contacts = data;
            }
        } catch (e) {
            console.warn('Failed to count campaign contact lists:', e);
        }

        const byId = new Map();
        [...fallbackLists, ...lists, ...storedLists].forEach(list => {
            if (!list?.id) return;
            byId.set(list.id, {
                id: list.id,
                name: list.name || list.id,
                icon: list.icon || 'fa-address-book',
                system: Boolean(list.system),
                count: 0,
            });
        });

        contacts.forEach(contact => {
            if (!contact?.group) return;
            if (!byId.has(contact.group)) {
                byId.set(contact.group, {
                    id: contact.group,
                    name: contact.group.replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase()),
                    icon: 'fa-address-book',
                    count: 0,
                });
            }
            byId.get(contact.group).count += 1;
        });

        this.state.campaignLists = Array.from(byId.values());
        return this.state.campaignLists;
    },

    getCampaignListOptions(selectedId = 'xotours_us_customers') {
        const esc = value => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        const lists = this.state.campaignLists?.length ? this.state.campaignLists : [
            {
                id: 'xotours_us_customers',
                name: 'XO Tours US Customers',
                count: 0,
            },
        ];
        const normalizedSelectedId = selectedId === 'xotours_us_customer'
            ? 'xotours_us_customers'
            : selectedId;

        return lists.map(list => {
            const selected = list.id === normalizedSelectedId ? 'selected' : '';
            const countLabel = Number.isFinite(list.count) ? ` (${list.count})` : '';
            return `<option value="${esc(list.id)}" data-name="${esc(list.name)}" data-id="${esc(list.id)}" data-count="${esc(list.count || 0)}" ${selected}>${esc(list.name)}${countLabel}</option>`;
        }).join('');
    },

    async saveCampaignsToServer() {
        try {
            const res = await fetch('/api/campaigns', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(this.state.campaigns)
            });
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data.campaigns)) {
                    this.state.campaigns = data.campaigns;
                    this.saveCampaignsToLocalStorage();
                }
                return data;
            }
        } catch (e) {
            console.error('Failed to save campaigns to server:', e);
        }
        return null;
    },

    async saveCampaignToServer(campaign) {
        if (!campaign?.id) return this.saveCampaignsToServer();
        try {
            const res = await fetch(`/api/campaigns?id=${encodeURIComponent(campaign.id)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(campaign)
            });
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data.campaigns)) {
                    this.state.campaigns = data.campaigns;
                    this.saveCampaignsToLocalStorage();
                } else if (data.campaign) {
                    const idx = (this.state.campaigns || []).findIndex(c => c.id === data.campaign.id);
                    if (idx !== -1) this.state.campaigns[idx] = data.campaign;
                    this.saveCampaignsToLocalStorage();
                }
                return data;
            }
        } catch (e) {
            console.error('Failed to save campaign to server:', e);
        }
        return this.saveCampaignsToServer();
    },

    async deleteCampaignFromServer(id) {
        try {
            const res = await fetch(`/api/campaigns?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data.campaigns)) {
                    this.state.campaigns = data.campaigns;
                    this.saveCampaignsToLocalStorage();
                }
                return data;
            }
        } catch (e) {
            console.error('Failed to delete campaign from server:', e);
        }
        return this.saveCampaignsToServer();
    },

    saveCampaignsToStorage() {
        this.saveCampaignsToLocalStorage();
        return this.saveCampaignsToServer();
    },

    // =========================================================================
    // CAMPAIGNS — Rendering
    // =========================================================================

    renderCampaigns() {
        const view = document.getElementById('campaigns-view');
        if (!view) return;

        const campaigns      = this.state.campaigns || [];
        const statusFilter   = this.state.campaignStatusFilter || 'all';
        const searchQuery    = (this.state.campaignSearchQuery || '').toLowerCase();
        const sortKey        = this.state.campaignSortKey || 'sentAt';
        const sortDir        = this.state.campaignSortDir || 'desc';
        const page           = this.state.campaignPage || 0;
        const pageSize       = 10;

        // ── Filter ────────────────────────────────────────────────────────────
        let filtered = campaigns.filter(c => {
            const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
            const matchesSearch = !searchQuery ||
                (c.name    || '').toLowerCase().includes(searchQuery) ||
                (c.subject || '').toLowerCase().includes(searchQuery);
            return matchesStatus && matchesSearch;
        });

        // ── Sort ──────────────────────────────────────────────────────────────
        filtered.sort((a, b) => {
            let va, vb;
            if (sortKey === 'name') {
                va = a.name || ''; vb = b.name || '';
                return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
            } else if (sortKey === 'sent') {
                va = a.sent || 0; vb = b.sent || 0;
            } else if (sortKey === 'openRate') {
                va = a.openRate || 0; vb = b.openRate || 0;
            } else if (sortKey === 'clickRate') {
                va = a.clickRate || 0; vb = b.clickRate || 0;
            } else { // sentAt (default)
                va = a.sentAt || a.scheduledAt || 0;
                vb = b.sentAt || b.scheduledAt || 0;
            }
            return sortDir === 'asc' ? va - vb : vb - va;
        });

        // ── Pagination ────────────────────────────────────────────────────────
        const totalFiltered = filtered.length;
        const startIdx      = page * pageSize;
        const endIdx        = startIdx + pageSize;
        const paginated     = filtered.slice(startIdx, endIdx);

        // ── Counts per status ─────────────────────────────────────────────────
        const counts = {
            all:       campaigns.length,
            sent:      campaigns.filter(c => c.status === 'sent').length,
            scheduled: campaigns.filter(c => c.status === 'scheduled').length,
            draft:     campaigns.filter(c => c.status === 'draft').length,
        };

        // ── Date formatter ────────────────────────────────────────────────────
        const fmtDate = ts => {
            if (!ts) return '—';
            const d   = new Date(ts);
            const now = new Date();
            const diffH = (now - d) / 3600000;
            if (Math.abs(diffH) < 24) {
                const h = Math.round(Math.abs(diffH));
                if (h <= 1) return diffH < 0 ? 'in ~1 hour' : '1 hour ago';
                return diffH < 0 ? `in ${h} hours` : `${h} hours ago`;
            }
            const mo  = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
            const yr  = d.getFullYear() !== now.getFullYear() ? ' ' + d.getFullYear() : '';
            const h12 = d.getHours() % 12 || 12;
            const min = String(d.getMinutes()).padStart(2, '0');
            const ap  = d.getHours() >= 12 ? 'PM' : 'AM';
            return `${mo[d.getMonth()]} ${d.getDate()}${yr} at ${h12}:${min} ${ap}`;
        };

        // ── Sort header helper ────────────────────────────────────────────────
        const _th = (label, key, extraClass = '') => {
            const isActive = sortKey === key;
            const nextDir  = (isActive && sortDir === 'asc') ? 'desc' : 'asc';
            const arrowPath = !isActive
                ? 'M6 2v8M3 7l3 3 3-3'
                : sortDir === 'asc'
                    ? 'M6 10V2M3 5l3-3 3 3'
                    : 'M6 2v8M3 7l3 3 3-3';
            const color = isActive ? '#6c5ce7' : 'currentColor';
            return `<th class="eo-th eo-th--sortable ${isActive ? 'eo-th--active-sort' : ''} ${extraClass}"
                        style="cursor:pointer;user-select:none"
                        onclick="App._sortCampaigns('${key}','${nextDir}')">
                        <span style="display:inline-flex;align-items:center;gap:4px;color:${isActive ? '#6c5ce7' : 'inherit'}">
                            ${label}
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style="flex-shrink:0">
                                <path d="${arrowPath}" stroke="${color}" stroke-width="1.3" fill="none" stroke-linecap="round"/>
                            </svg>
                        </span>
                    </th>`;
        };

        // ── Aggregate stats for summary bar ───────────────────────────────────
        const sentCampaigns = campaigns.filter(c => c.status === 'sent' && c.sent > 0);
        const totalSent     = sentCampaigns.reduce((s, c) => s + (c.sent     || 0), 0);
        const totalOpens    = sentCampaigns.reduce((s, c) => s + (c.opens    || 0), 0);
        const totalClicks   = sentCampaigns.reduce((s, c) => s + (c.clicks   || 0), 0);
        const avgOpenRate   = sentCampaigns.length ? (sentCampaigns.reduce((s, c) => s + (c.openRate || 0), 0) / sentCampaigns.length).toFixed(1) : '0.0';
        const avgClickRate  = sentCampaigns.length ? (sentCampaigns.reduce((s, c) => s + (c.clickRate || 0), 0) / sentCampaigns.length).toFixed(2) : '0.00';

        // ── Build HTML ────────────────────────────────────────────────────────
        let html = `
        <style>
            /* ═══════════════════════════════════════════════════════════════
               CAMPAIGNS PAGE — EO-style
            ═══════════════════════════════════════════════════════════════ */
            #campaigns-view {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                background: #f8f8fc;
                min-height: 100%;
                display: flex;
                flex-direction: column;
            }

            /* ── Page header ─────────────────────────────────────────────── */
            .camp-page-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 32px 36px 20px;
                background: #fff;
                border-bottom: 1px solid #ececf3;
            }
            .camp-page-title {
                font-size: 28px;
                font-weight: 800;
                color: #1a1a2e;
                letter-spacing: -0.5px;
                margin: 0;
            }
            .camp-create-btn {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                background: #6c5ce7;
                color: #fff;
                border: none;
                border-radius: 10px;
                padding: 12px 22px;
                font-size: 15px;
                font-weight: 700;
                cursor: pointer;
                transition: background 0.15s, transform 0.1s;
                box-shadow: 0 4px 14px rgba(108,92,231,0.3);
            }
            .camp-create-btn:hover { background: #5b4fcf; transform: translateY(-1px); }
            .camp-create-btn:active { transform: translateY(0); }

            /* ── Stats summary bar ───────────────────────────────────────── */
            .camp-stats-bar {
                display: grid;
                grid-template-columns: repeat(5, 1fr);
                gap: 0;
                background: #fff;
                border-bottom: 1px solid #ececf3;
            }
            .camp-stat-card {
                padding: 20px 28px;
                border-right: 1px solid #f0f0f6;
                transition: background 0.15s;
            }
            .camp-stat-card:last-child { border-right: none; }
            .camp-stat-card:hover { background: #faf9ff; }
            .camp-stat-label {
                font-size: 12px;
                font-weight: 600;
                color: #999;
                text-transform: uppercase;
                letter-spacing: 0.6px;
                margin-bottom: 6px;
            }
            .camp-stat-value {
                font-size: 26px;
                font-weight: 800;
                color: #1a1a2e;
                letter-spacing: -0.5px;
                line-height: 1;
            }
            .camp-stat-sub {
                font-size: 12px;
                color: #aaa;
                margin-top: 4px;
            }
            .camp-stat-value--purple { color: #6c5ce7; }
            .camp-stat-value--green  { color: #00b894; }
            .camp-stat-value--blue   { color: #0984e3; }

            /* ── Controls row ────────────────────────────────────────────── */
            .camp-controls {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 16px 36px;
                background: #fff;
                border-bottom: 1px solid #ececf3;
                flex-wrap: wrap;
            }

            /* Status tabs */
            .camp-status-tabs {
                display: flex;
                gap: 2px;
                background: #f3f2fb;
                border-radius: 10px;
                padding: 3px;
            }
            .camp-tab {
                padding: 7px 16px;
                border: none;
                background: none;
                border-radius: 8px;
                font-size: 13px;
                font-weight: 600;
                color: #888;
                cursor: pointer;
                transition: all 0.15s;
                display: flex;
                align-items: center;
                gap: 6px;
                white-space: nowrap;
            }
            .camp-tab:hover { color: #6c5ce7; }
            .camp-tab.active { background: #fff; color: #6c5ce7; box-shadow: 0 1px 4px rgba(0,0,0,0.1); }
            .camp-tab-count {
                background: #ede9ff;
                color: #6c5ce7;
                border-radius: 20px;
                padding: 1px 7px;
                font-size: 11px;
                font-weight: 700;
            }
            .camp-tab.active .camp-tab-count { background: #6c5ce7; color: #fff; }

            /* Search */
            .camp-search-wrap {
                position: relative;
                flex: 1;
                max-width: 320px;
            }
            .camp-search-icon {
                position: absolute;
                left: 12px;
                top: 50%;
                transform: translateY(-50%);
                width: 16px;
                height: 16px;
                color: #bbb;
                pointer-events: none;
            }
            .camp-search-input {
                width: 100%;
                padding: 8px 12px 8px 36px;
                border: 1.5px solid #e8e8f0;
                border-radius: 8px;
                font-size: 13px;
                color: #333;
                background: #fafafa;
                outline: none;
                transition: border-color 0.15s, background 0.15s;
                box-sizing: border-box;
            }
            .camp-search-input:focus { border-color: #6c5ce7; background: #fff; }

            /* Sort by */
            .camp-sortby-wrap {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-left: auto;
            }
            .camp-sortby-label {
                font-size: 13px;
                color: #888;
                font-weight: 500;
                white-space: nowrap;
            }
            .camp-sortby-select {
                padding: 7px 28px 7px 12px;
                border: 1.5px solid #e8e8f0;
                border-radius: 8px;
                font-size: 13px;
                color: #333;
                background: #fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M3 5l3 3 3-3' stroke='%23999' stroke-width='1.4' fill='none' stroke-linecap='round'/%3E%3C/svg%3E") no-repeat right 10px center;
                appearance: none;
                cursor: pointer;
                outline: none;
            }
            .camp-sortby-select:focus { border-color: #6c5ce7; }

            /* Pagination */
            .camp-pagination {
                display: flex;
                align-items: center;
                gap: 6px;
            }
            .camp-page-info {
                font-size: 13px;
                color: #888;
                white-space: nowrap;
            }
            .camp-page-btn {
                width: 30px;
                height: 30px;
                border: 1.5px solid #e8e8f0;
                border-radius: 7px;
                background: #fff;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.15s;
                color: #555;
            }
            .camp-page-btn:hover:not(:disabled) { border-color: #6c5ce7; color: #6c5ce7; }
            .camp-page-btn:disabled { opacity: 0.35; cursor: default; }

            /* ── Campaign list ───────────────────────────────────────────── */
            .camp-list {
                padding: 24px 36px;
                flex: 1;
                display: flex;
                flex-direction: column;
                gap: 12px;
            }

            .camp-card {
                background: #fff;
                border: 1.5px solid #ececf3;
                border-radius: 14px;
                display: grid;
                grid-template-columns: 80px 1fr auto;
                gap: 0;
                overflow: hidden;
                transition: border-color 0.15s, box-shadow 0.15s;
                cursor: pointer;
            }
            .camp-card:hover {
                border-color: #c5bbf7;
                box-shadow: 0 4px 20px rgba(108,92,231,0.08);
            }

            /* Thumbnail */
            .camp-thumb {
                background: #f5f3ff;
                display: flex;
                align-items: center;
                justify-content: center;
                border-right: 1.5px solid #ececf3;
                min-height: 90px;
            }
            .camp-thumb-inner {
                width: 46px;
                height: 58px;
                background: #fff;
                border: 1px solid #ddd;
                border-radius: 3px;
                display: flex;
                flex-direction: column;
                gap: 3px;
                padding: 6px 5px;
                box-shadow: 0 1px 4px rgba(0,0,0,0.08);
            }
            .camp-thumb-line {
                height: 3px;
                border-radius: 2px;
                background: #e0d9f7;
            }
            .camp-thumb-line:first-child { width: 80%; background: #c5bbf7; }
            .camp-thumb-line:nth-child(2) { width: 60%; }
            .camp-thumb-line:nth-child(3) { width: 90%; }
            .camp-thumb-line:nth-child(4) { width: 70%; }
            .camp-thumb-line:nth-child(5) { width: 85%; }
            .camp-thumb-line:nth-child(6) { width: 50%; }

            /* Body */
            .camp-card-body {
                padding: 18px 22px;
                display: flex;
                flex-direction: column;
                gap: 5px;
                min-width: 0;
            }
            .camp-card-name {
                font-size: 16px;
                font-weight: 700;
                color: #1a1a2e;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .camp-card-subject {
                font-size: 13px;
                color: #666;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .camp-card-subject strong { color: #555; }
            .camp-card-meta {
                font-size: 12px;
                color: #aaa;
                margin-top: 2px;
            }

            /* Stats */
            .camp-card-stats {
                display: flex;
                align-items: center;
                gap: 0;
                padding: 0 6px;
            }
            .camp-stat-block {
                display: flex;
                flex-direction: column;
                align-items: center;
                padding: 18px 20px;
                min-width: 90px;
                border-left: 1px solid #f0f0f6;
                gap: 3px;
            }
            .camp-stat-block-val {
                font-size: 18px;
                font-weight: 800;
                color: #1a1a2e;
                letter-spacing: -0.3px;
            }
            .camp-stat-block-label {
                font-size: 11px;
                font-weight: 600;
                color: #aaa;
                text-transform: uppercase;
                letter-spacing: 0.4px;
            }
            .camp-stat-block-pct {
                font-size: 12px;
                color: #888;
            }

            /* Status badge */
            .camp-badge {
                display: inline-flex;
                align-items: center;
                gap: 5px;
                padding: 4px 11px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: 700;
                letter-spacing: 0.1px;
                margin-bottom: 2px;
            }
            .camp-badge-dot {
                width: 6px;
                height: 6px;
                border-radius: 50%;
                flex-shrink: 0;
            }
            .camp-badge--sent      { background: #d4f7e7; color: #1a7a4a; }
            .camp-badge--sent .camp-badge-dot { background: #1a7a4a; }
            .camp-badge--scheduled { background: #fff3cd; color: #856404; }
            .camp-badge--scheduled .camp-badge-dot { background: #ffc107; }
            .camp-badge--draft     { background: #f0f0f6; color: #666; }
            .camp-badge--draft .camp-badge-dot { background: #aaa; }

            /* Actions chevron */
            .camp-card-action {
                display: flex;
                align-items: center;
                padding: 0 18px 0 8px;
            }
            .camp-chevron {
                width: 30px;
                height: 30px;
                background: #f5f3ff;
                border: 1.5px solid #e0d9f7;
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #6c5ce7;
                transition: background 0.15s;
                cursor: pointer;
            }
            .camp-chevron:hover { background: #ede9ff; }

            /* ── Empty state ─────────────────────────────────────────────── */
            .camp-empty {
                text-align: center;
                padding: 80px 40px;
                color: #bbb;
            }
            .camp-empty-icon {
                font-size: 64px;
                opacity: 0.15;
                margin-bottom: 16px;
            }
            .camp-empty-text {
                font-size: 16px;
                font-weight: 600;
                color: #ccc;
            }
            .camp-empty-sub {
                font-size: 13px;
                color: #ddd;
                margin-top: 6px;
            }

            /* ── Campaign detail panel ───────────────────────────────────── */
            .camp-detail-overlay {
                position: fixed;
                inset: 0;
                background: rgba(20,18,40,0.45);
                z-index: 1050;
                display: flex;
                align-items: flex-start;
                justify-content: flex-end;
                animation: campFadeIn 0.2s ease;
            }
            @keyframes campFadeIn { from { opacity: 0; } to { opacity: 1; } }

            .camp-detail-panel {
                width: 540px;
                max-width: 90vw;
                height: 100vh;
                background: #fff;
                box-shadow: -8px 0 40px rgba(0,0,0,0.12);
                overflow-y: auto;
                animation: campSlideIn 0.25s cubic-bezier(0.34,1.56,0.64,1);
                display: flex;
                flex-direction: column;
            }
            @keyframes campSlideIn { from { transform: translateX(60px); opacity: 0; } to { transform: none; opacity: 1; } }

            .camp-detail-top {
                padding: 28px 32px 20px;
                border-bottom: 1px solid #f0f0f6;
                display: flex;
                align-items: flex-start;
                justify-content: space-between;
                gap: 16px;
            }
            .camp-detail-close {
                width: 32px;
                height: 32px;
                background: #f5f3ff;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #6c5ce7;
                flex-shrink: 0;
                transition: background 0.15s;
            }
            .camp-detail-close:hover { background: #ede9ff; }

            .camp-detail-title {
                font-size: 20px;
                font-weight: 800;
                color: #1a1a2e;
                line-height: 1.2;
            }
            .camp-detail-subject {
                font-size: 13px;
                color: #777;
                margin-top: 4px;
            }

            .camp-detail-metrics {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 12px;
                padding: 24px 32px;
                border-bottom: 1px solid #f0f0f6;
            }
            .camp-metric-card {
                background: #faf9ff;
                border: 1.5px solid #ede9ff;
                border-radius: 12px;
                padding: 16px 18px;
            }
            .camp-metric-val {
                font-size: 30px;
                font-weight: 800;
                color: #1a1a2e;
                letter-spacing: -0.5px;
                line-height: 1;
            }
            .camp-metric-label {
                font-size: 12px;
                font-weight: 600;
                color: #aaa;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-top: 6px;
            }
            .camp-metric-sub {
                font-size: 13px;
                color: #888;
                margin-top: 3px;
            }

            /* Progress bar */
            .camp-progress-wrap { margin-top: 8px; }
            .camp-progress-bar {
                height: 6px;
                background: #ede9ff;
                border-radius: 3px;
                overflow: hidden;
                margin-top: 6px;
            }
            .camp-progress-fill {
                height: 100%;
                background: linear-gradient(90deg, #6c5ce7, #a29bfe);
                border-radius: 3px;
                transition: width 0.6s ease;
            }
            .camp-progress-fill--green {
                background: linear-gradient(90deg, #00b894, #55efc4);
            }

            .camp-detail-info {
                padding: 24px 32px;
                flex: 1;
            }
            .camp-detail-row {
                display: grid;
                grid-template-columns: 140px 1fr;
                gap: 10px;
                padding: 12px 0;
                border-bottom: 1px solid #f7f7fa;
                align-items: center;
                font-size: 14px;
            }
            .camp-detail-row:last-child { border-bottom: none; }
            .camp-detail-row-label { color: #aaa; font-weight: 500; font-size: 13px; }
            .camp-detail-row-val   { color: #1a1a2e; font-weight: 500; }

            .camp-detail-actions {
                padding: 20px 32px 32px;
                display: flex;
                gap: 10px;
                flex-wrap: wrap;
            }
            .camp-action-btn {
                flex: 1;
                padding: 11px 16px;
                border-radius: 9px;
                font-size: 13px;
                font-weight: 700;
                cursor: pointer;
                border: none;
                transition: all 0.15s;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 7px;
            }
            .camp-action-btn--primary {
                background: #6c5ce7;
                color: #fff;
                box-shadow: 0 3px 10px rgba(108,92,231,0.25);
            }
            .camp-action-btn--primary:hover { background: #5b4fcf; }
            .camp-action-btn--secondary {
                background: #f5f3ff;
                color: #6c5ce7;
                border: 1.5px solid #e0d9f7;
            }
            .camp-action-btn--secondary:hover { background: #ede9ff; }
            .camp-action-btn--danger {
                background: #fff0f0;
                color: #e53e3e;
                border: 1.5px solid #ffd5d5;
            }
            .camp-action-btn--danger:hover { background: #ffe0e0; }
        </style>

        <!-- ── Page Header ─────────────────────────────────────────────────── -->
        <div class="camp-page-header">
            <h1 class="camp-page-title">Campaigns</h1>
            <button class="camp-create-btn" onclick="App.createCampaign()">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M8 2v12M2 8h12" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
                </svg>
                Create
            </button>
        </div>

        <!-- ── Stats Summary Bar ──────────────────────────────────────────── -->
        <div class="camp-stats-bar">
            <div class="camp-stat-card">
                <div class="camp-stat-label">Total Campaigns</div>
                <div class="camp-stat-value">${counts.all}</div>
                <div class="camp-stat-sub">${counts.sent} sent · ${counts.scheduled} scheduled</div>
            </div>
            <div class="camp-stat-card">
                <div class="camp-stat-label">Total Sent</div>
                <div class="camp-stat-value camp-stat-value--purple">${totalSent.toLocaleString()}</div>
                <div class="camp-stat-sub">across all campaigns</div>
            </div>
            <div class="camp-stat-card">
                <div class="camp-stat-label">Total Opens</div>
                <div class="camp-stat-value camp-stat-value--green">${totalOpens.toLocaleString()}</div>
                <div class="camp-stat-sub">avg ${avgOpenRate}% open rate</div>
            </div>
            <div class="camp-stat-card">
                <div class="camp-stat-label">Total Clicks</div>
                <div class="camp-stat-value camp-stat-value--blue">${totalClicks.toLocaleString()}</div>
                <div class="camp-stat-sub">avg ${avgClickRate}% click rate</div>
            </div>
            <div class="camp-stat-card">
                <div class="camp-stat-label">Drafts</div>
                <div class="camp-stat-value">${counts.draft}</div>
                <div class="camp-stat-sub">ready to send</div>
            </div>
        </div>

        <!-- ── Controls Row ───────────────────────────────────────────────── -->
        <div class="camp-controls">
            <!-- Status tabs -->
            <div class="camp-status-tabs">
                ${['all','sent','scheduled','draft'].map(s => `
                    <button class="camp-tab ${statusFilter === s ? 'active' : ''}"
                            onclick="App.filterCampaignsByStatus('${s}')">
                        ${s.charAt(0).toUpperCase() + s.slice(1)}
                        <span class="camp-tab-count">${counts[s]}</span>
                    </button>`).join('')}
            </div>

            <!-- Search -->
            <div class="camp-search-wrap">
                <svg class="camp-search-icon" viewBox="0 0 20 20" fill="none">
                    <circle cx="9" cy="9" r="6" stroke="currentColor" stroke-width="1.6"/>
                    <path d="M14 14l3 3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
                </svg>
                <input class="camp-search-input" placeholder="Search campaigns…"
                       value="${this.state.campaignSearchQuery || ''}"
                       oninput="App.searchCampaigns(this.value)">
            </div>

            <!-- Sort + Pagination -->
            <div class="camp-sortby-wrap">
                <span class="camp-sortby-label">Sort by</span>
                <select class="camp-sortby-select" onchange="App._sortCampaigns(this.value, 'desc')">
                    <option value="sentAt"    ${sortKey === 'sentAt'    ? 'selected' : ''}>Date</option>
                    <option value="name"      ${sortKey === 'name'      ? 'selected' : ''}>Name</option>
                    <option value="sent"      ${sortKey === 'sent'      ? 'selected' : ''}>Sent</option>
                    <option value="openRate"  ${sortKey === 'openRate'  ? 'selected' : ''}>Open rate</option>
                    <option value="clickRate" ${sortKey === 'clickRate' ? 'selected' : ''}>Click rate</option>
                </select>
            </div>

            <div class="camp-pagination">
                <span class="camp-page-info">
                    ${totalFiltered === 0 ? '0' : startIdx + 1}–${Math.min(endIdx, totalFiltered)} of <strong>${totalFiltered}</strong>
                </span>
                <button class="camp-page-btn" ${page === 0 ? 'disabled' : ''}
                        onclick="App.prevCampaignsPage()">
                    <svg width="14" height="14" viewBox="0 0 14 14"><path d="M9 3L5 7l4 4" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg>
                </button>
                <button class="camp-page-btn" ${endIdx >= totalFiltered ? 'disabled' : ''}
                        onclick="App.nextCampaignsPage()">
                    <svg width="14" height="14" viewBox="0 0 14 14"><path d="M5 3l4 4-4 4" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg>
                </button>
            </div>
        </div>`;

        // ── Campaign list ─────────────────────────────────────────────────────
        html += `<div class="camp-list">`;

        if (paginated.length === 0) {
            html += `
            <div class="camp-empty">
                <div class="camp-empty-icon"><i class="fas fa-paper-plane"></i></div>
                <div class="camp-empty-text">No campaigns found</div>
                <div class="camp-empty-sub">
                    ${statusFilter !== 'all' ? `No ${statusFilter} campaigns yet.` : 'Create your first campaign to get started.'}
                </div>
            </div>`;
        } else {
            paginated.forEach(c => {
                const ts        = c.sentAt || c.scheduledAt || 0;
                const dateStr   = ts ? fmtDate(ts) : '—';
                const sentLabel = c.status === 'scheduled' ? 'Scheduled' : c.status === 'draft' ? 'Not sent' : 'Sent';

                const statusBadge = `
                    <span class="camp-badge camp-badge--${c.status}">
                        <span class="camp-badge-dot"></span>
                        ${c.status === 'sent' ? `Sent · ${dateStr}` : c.status === 'scheduled' ? `Scheduled · ${dateStr}` : 'Draft'}
                    </span>`;

                const statsBlock = c.status === 'sent' ? `
                    <div class="camp-card-stats">
                        <div class="camp-stat-block">
                            <div class="camp-stat-block-val">${(c.sent || 0).toLocaleString()}</div>
                            <div class="camp-stat-block-label">Sent</div>
                        </div>
                        <div class="camp-stat-block">
                            <div class="camp-stat-block-val">${(c.openRate || 0).toFixed(2)}%</div>
                            <div class="camp-stat-block-label">Opened</div>
                        </div>
                        <div class="camp-stat-block">
                            <div class="camp-stat-block-val">${(c.clickRate || 0).toFixed(2)}%</div>
                            <div class="camp-stat-block-label">Clicked</div>
                        </div>
                    </div>` : c.status === 'scheduled' ? `
                    <div class="camp-card-stats">
                        <div class="camp-stat-block" style="min-width:120px;text-align:center;">
                            <div style="font-size:13px;color:#856404;font-weight:600;">⏰ Scheduled</div>
                            <div style="font-size:12px;color:#aaa;margin-top:4px;">${dateStr}</div>
                        </div>
                    </div>` : `
                    <div class="camp-card-stats">
                        <div class="camp-stat-block" style="min-width:120px;text-align:center;">
                            <div style="font-size:13px;color:#aaa;font-weight:600;">Draft</div>
                            <div style="font-size:12px;color:#ccc;margin-top:4px;">Not sent yet</div>
                        </div>
                    </div>`;

                html += `
                <div class="camp-card" onclick="App.showCampaignDetail('${c.id}')">
                    <div class="camp-thumb">
                        <div class="camp-thumb-inner">
                            ${Array(6).fill('<div class="camp-thumb-line"></div>').join('')}
                        </div>
                    </div>
                    <div class="camp-card-body">
                        ${statusBadge}
                        <div class="camp-card-name">${c.name || 'Untitled'}</div>
                        <div class="camp-card-subject"><strong>Subject:</strong> ${c.subject || '(no subject)'}</div>
                        ${c.listName ? `<div class="camp-card-meta">${c.listName}</div>` : ''}
                    </div>
                    ${statsBlock}
                    <div class="camp-card-action">
                        <div class="camp-chevron" onclick="event.stopPropagation();App._campaignActionsMenu('${c.id}', event)">
                            <svg width="14" height="14" viewBox="0 0 14 14"><path d="M3 5l4 4 4-4" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>
                        </div>
                    </div>
                </div>`;
            });
        }

        html += `</div>`; // .camp-list

        view.innerHTML = html;
    },

    // =========================================================================
    // CAMPAIGNS — Detail Slide-in Panel
    // =========================================================================

    showCampaignDetail(id) {
        const c = (this.state.campaigns || []).find(x => x.id === id);
        if (!c) return;

        // Remove existing overlay if any
        const existing = document.getElementById('camp-detail-overlay');
        if (existing) existing.remove();

        const fmtDate = ts => {
            if (!ts) return '—';
            const d   = new Date(ts);
            const mo  = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
            const yr  = d.getFullYear();
            const h12 = d.getHours() % 12 || 12;
            const min = String(d.getMinutes()).padStart(2, '0');
            const ap  = d.getHours() >= 12 ? 'PM' : 'AM';
            return `${mo[d.getMonth()]} ${d.getDate()} ${yr} at ${h12}:${min} ${ap}`;
        };

        const ts      = c.sentAt || c.scheduledAt;
        const dateStr = ts ? fmtDate(ts) : '—';
        const openPct = Math.min(100, c.openRate  || 0);
        const clkPct  = Math.min(100, c.clickRate || 0);

        const actionsHtml = c.status === 'draft' ? `
            <button class="camp-action-btn camp-action-btn--primary"
                    onclick="App.editCampaign('${c.id}')">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M10 1.5l2.5 2.5-8 8H2v-2.5l8-8z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>
                </svg>
                Edit draft
            </button>
            <button class="camp-action-btn camp-action-btn--secondary"
                    onclick="App.duplicateCampaign('${c.id}')">Duplicate</button>
            <button class="camp-action-btn camp-action-btn--danger"
                    onclick="App.deleteCampaign('${c.id}')">Delete</button>` :
        c.status === 'scheduled' ? `
            <button class="camp-action-btn camp-action-btn--primary"
                    onclick="App.editCampaign('${c.id}')">Edit</button>
            <button class="camp-action-btn camp-action-btn--secondary"
                    onclick="App.unscheduleCampaign('${c.id}')">Unschedule</button>
            <button class="camp-action-btn camp-action-btn--danger"
                    onclick="App.deleteCampaign('${c.id}')">Delete</button>` : `
            <button class="camp-action-btn camp-action-btn--primary"
                    onclick="App.duplicateCampaign('${c.id}')">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <rect x="4" y="4" width="8" height="8" rx="1.5" stroke="currentColor" stroke-width="1.4"/>
                    <path d="M2 10V2h8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                Duplicate
            </button>
            <button class="camp-action-btn camp-action-btn--secondary"
                    onclick="document.getElementById('camp-detail-overlay').remove()">View report</button>
            <button class="camp-action-btn camp-action-btn--danger"
                    onclick="App.deleteCampaign('${c.id}')">Delete</button>`;

        const overlay = document.createElement('div');
        overlay.id        = 'camp-detail-overlay';
        overlay.className = 'camp-detail-overlay';
        overlay.onclick   = e => { if (e.target === overlay) overlay.remove(); };

        overlay.innerHTML = `
            <div class="camp-detail-panel">
                <!-- Top -->
                <div class="camp-detail-top">
                    <div>
                        <span class="camp-badge camp-badge--${c.status}">
                            <span class="camp-badge-dot"></span>
                            ${c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                        </span>
                        <div class="camp-detail-title" style="margin-top:8px">${c.name || 'Untitled'}</div>
                        <div class="camp-detail-subject">Subject: ${c.subject || '(no subject)'}</div>
                    </div>
                    <button class="camp-detail-close" onclick="document.getElementById('camp-detail-overlay').remove()">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                        </svg>
                    </button>
                </div>

                <!-- Metrics (only for sent) -->
                ${c.status === 'sent' ? `
                <div class="camp-detail-metrics">
                    <div class="camp-metric-card">
                        <div class="camp-metric-val">${(c.sent || 0).toLocaleString()}</div>
                        <div class="camp-metric-label">Sent</div>
                        <div class="camp-metric-sub">${c.listName || ''}</div>
                    </div>
                    <div class="camp-metric-card">
                        <div class="camp-metric-val">${(c.opens || 0).toLocaleString()}</div>
                        <div class="camp-metric-label">Opens</div>
                        <div class="camp-progress-wrap">
                            <div style="font-size:12px;color:#888">${(c.openRate||0).toFixed(2)}% open rate</div>
                            <div class="camp-progress-bar">
                                <div class="camp-progress-fill" style="width:${openPct}%"></div>
                            </div>
                        </div>
                    </div>
                    <div class="camp-metric-card">
                        <div class="camp-metric-val">${(c.clicks || 0).toLocaleString()}</div>
                        <div class="camp-metric-label">Clicks</div>
                        <div class="camp-progress-wrap">
                            <div style="font-size:12px;color:#888">${(c.clickRate||0).toFixed(2)}% click rate</div>
                            <div class="camp-progress-bar">
                                <div class="camp-progress-fill camp-progress-fill--green" style="width:${clkPct * 5}%"></div>
                            </div>
                        </div>
                    </div>
                    <div class="camp-metric-card">
                        <div class="camp-metric-val">${c.sent ? ((((c.sent - (c.opens||0)) / c.sent) * 100)).toFixed(1) : '0.0'}%</div>
                        <div class="camp-metric-label">Unopened</div>
                        <div class="camp-metric-sub">${c.sent ? (c.sent - (c.opens||0)).toLocaleString() : 0} recipients</div>
                    </div>
                </div>` : ''}

                <!-- Info rows -->
                <div class="camp-detail-info">
                    ${[
                        ['Campaign name', c.name || '—'],
                        ['Subject line',  c.subject || '—'],
                        ['Status',        c.status.charAt(0).toUpperCase() + c.status.slice(1)],
                        c.listName ? ['List', c.listName] : null,
                        c.previewText ? ['Preview text', c.previewText] : null,
                        ts ? [c.status === 'scheduled' ? 'Scheduled for' : 'Sent at', dateStr] : null,
                    ].filter(Boolean).map(([label, val]) => `
                        <div class="camp-detail-row">
                            <div class="camp-detail-row-label">${label}</div>
                            <div class="camp-detail-row-val">${val}</div>
                        </div>`).join('')}
                </div>

                <!-- Actions -->
                <div class="camp-detail-actions">
                    ${actionsHtml}
                </div>
            </div>`;

        document.body.appendChild(overlay);
    },

    // =========================================================================
    // CAMPAIGNS — Create / Edit / Save / Delete
    // =========================================================================

    createCampaign() {
        this._showCampaignWizard(null);
    },

    editCampaign(id) {
        const existing = document.getElementById('camp-detail-overlay');
        if (existing) existing.remove();
        this._showCampaignWizard(id);
    },

    _showCampaignWizard(id) {
        const c = id ? (this.state.campaigns || []).find(x => x.id === id) : null;
        const esc = value => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        const selectedListId = c?.listId || c?.listPath || c?.listFile || 'xotours_us_customers';
        document.getElementById('camp-form-overlay')?.remove();

        const overlay = document.createElement('div');
        overlay.id = 'camp-form-overlay';
        overlay.className = 'camp-detail-overlay';
        overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
        overlay.innerHTML = `
            <div class="camp-detail-panel" style="width:min(920px,94vw);max-width:920px;">
                <div class="camp-detail-top">
                    <div>
                        <div class="camp-detail-title">${c ? 'Edit Campaign' : 'Create Campaign'}</div>
                        <div class="camp-detail-subject" style="margin-top:4px">Setup, audience, design, and delivery</div>
                    </div>
                    <button class="camp-detail-close" onclick="document.getElementById('camp-form-overlay').remove()">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
                    </button>
                </div>
                <div style="padding:24px 32px;flex:1;overflow-y:auto;">
                    <style>
                        .camp-wizard-steps{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:22px}
                        .camp-wizard-step{border:1px solid #e8e8f0;border-radius:8px;padding:10px 12px;background:#fff}
                        .camp-wizard-step strong{display:block;font-size:13px;color:#1a1a2e}
                        .camp-wizard-step span{display:block;font-size:11px;color:#888;margin-top:3px}
                        .camp-wizard-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
                        .camp-wizard-section{border:1.5px solid #ede9ff;border-radius:10px;background:#fff;padding:18px}
                        .camp-wizard-section h3{margin:0 0 14px;font-size:15px;color:#1a1a2e}
                        .camp-field{display:flex;flex-direction:column;gap:6px;margin-bottom:14px}
                        .camp-field:last-child{margin-bottom:0}
                        .camp-field label{font-size:12px;font-weight:700;color:#555}
                        .camp-field input,.camp-field select,.camp-field textarea{width:100%;box-sizing:border-box;border:1.5px solid #e0d9f7;border-radius:8px;padding:10px 12px;font-size:13px;color:#1a1a2e;background:#fff;outline:none}
                        .camp-field textarea{min-height:122px;resize:vertical;line-height:1.5}
                        .camp-field input:focus,.camp-field select:focus,.camp-field textarea:focus{border-color:#6c5ce7}
                        @media(max-width:760px){.camp-wizard-steps,.camp-wizard-grid{grid-template-columns:1fr}}
                    </style>
                    <div class="camp-wizard-steps">
                        <div class="camp-wizard-step"><strong>1. Setup</strong><span>Sender and subject</span></div>
                        <div class="camp-wizard-step"><strong>2. Audience</strong><span>List or segment</span></div>
                        <div class="camp-wizard-step"><strong>3. Design</strong><span>Starter content</span></div>
                        <div class="camp-wizard-step"><strong>4. Send</strong><span>Draft or schedule</span></div>
                    </div>
                    <div class="camp-wizard-grid">
                        <section class="camp-wizard-section">
                            <h3>Setup</h3>
                            <div class="camp-field"><label>Campaign name *</label><input id="camp-form-name" type="text" value="${esc(c?.name || '')}" placeholder="e.g. May Newsletter 2026"></div>
                            <div class="camp-field"><label>Subject line *</label><input id="camp-form-subject" type="text" value="${esc(c?.subject || '')}" placeholder="Special offer just for you"></div>
                            <div class="camp-field"><label>Preview text</label><input id="camp-form-preview" type="text" value="${esc(c?.previewText || '')}" placeholder="Short inbox preview"></div>
                            <div class="camp-wizard-grid" style="gap:12px">
                                <div class="camp-field"><label>Sender name</label><input id="camp-form-from-name" type="text" value="${esc(c?.fromName || 'XO Tours')}" placeholder="XO Tours"></div>
                                <div class="camp-field"><label>Sender email</label><input id="camp-form-from-email" type="email" value="${esc(c?.fromEmail || 'hello@superesolutions.com')}" placeholder="hello@example.com"></div>
                            </div>
                        </section>
                        <section class="camp-wizard-section">
                            <h3>Audience</h3>
                            <div class="camp-field"><label>Sending to</label><select id="camp-form-audience-mode"><option value="list" ${(!c || c.audienceMode !== 'segment') ? 'selected' : ''}>List</option><option value="segment" ${(c?.audienceMode === 'segment') ? 'selected' : ''}>Segment</option></select></div>
                            <div class="camp-field"><label>List</label><select id="camp-form-list">${this.getCampaignListOptions(selectedListId)}</select><small style="font-size:11px;color:#888">Audience source is saved from the selected contact list.</small></div>
                            <div class="camp-field"><label>Segment name</label><input id="camp-form-segment" type="text" value="${esc(c?.segmentName || '')}" placeholder="Optional segment"></div>
                        </section>
                        <section class="camp-wizard-section">
                            <h3>Design</h3>
                            <div class="camp-field"><label>Start from</label><select id="camp-form-template"><option value="scratch" ${(!c || c.templateMode === 'scratch') ? 'selected' : ''}>Scratch</option><option value="newsletter" ${(c?.templateMode === 'newsletter') ? 'selected' : ''}>Newsletter template</option><option value="promotion" ${(c?.templateMode === 'promotion') ? 'selected' : ''}>Promotion template</option></select></div>
                            <div class="camp-field"><label>Email heading</label><input id="camp-form-content-title" type="text" value="${esc(c?.contentTitle || c?.name || '')}" placeholder="Main headline"></div>
                            <div class="camp-field"><label>Email body</label><textarea id="camp-form-body" placeholder="Write the starter email content">${esc(c?.body || '')}</textarea></div>
                            <div class="camp-wizard-grid" style="gap:12px">
                                <div class="camp-field"><label>CTA label</label><input id="camp-form-cta-label" type="text" value="${esc(c?.ctaLabel || 'Learn more')}"></div>
                                <div class="camp-field"><label>CTA URL</label><input id="camp-form-cta-url" type="url" value="${esc(c?.ctaUrl || '')}" placeholder="https://"></div>
                            </div>
                        </section>
                        <section class="camp-wizard-section">
                            <h3>Send or schedule</h3>
                            <div class="camp-field"><label>Status</label><select id="camp-form-status"><option value="draft" ${(!c || c.status === 'draft') ? 'selected' : ''}>Draft</option><option value="scheduled" ${(c && c.status === 'scheduled') ? 'selected' : ''}>Scheduled</option><option value="sent" ${(c && c.status === 'sent') ? 'selected' : ''}>Sent</option></select></div>
                            <div class="camp-field"><label>Schedule / sent date</label><input id="camp-form-date" type="datetime-local" value="${c && (c.sentAt || c.scheduledAt) ? new Date(c.sentAt || c.scheduledAt).toISOString().slice(0,16) : ''}"></div>
                            <div class="camp-field"><label>Timezone</label><input id="camp-form-timezone" type="text" value="${esc(c?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Los_Angeles')}"></div>
                        </section>
                    </div>
                </div>
                <div class="camp-detail-actions">
                    <button class="camp-action-btn camp-action-btn--primary" onclick="App._saveCampaignWizard('${id || ''}')">${c ? 'Save changes' : 'Create campaign'}</button>
                    <button class="camp-action-btn camp-action-btn--secondary" onclick="document.getElementById('camp-form-overlay').remove()">Cancel</button>
                </div>
            </div>`;
        document.body.appendChild(overlay);
    },

    async _saveCampaignWizard(id) {
        const name = (document.getElementById('camp-form-name')?.value || '').trim();
        const subject = (document.getElementById('camp-form-subject')?.value || '').trim();
        if (!name || !subject) { alert('Campaign name and subject are required.'); return; }

        const existing = id ? (this.state.campaigns || []).find(x => x.id === id) : null;
        const status = document.getElementById('camp-form-status')?.value || 'draft';
        const dateVal = document.getElementById('camp-form-date')?.value;
        const dateTs = dateVal ? new Date(dateVal).getTime() : null;
        const listSelect = document.getElementById('camp-form-list');
        const selectedListOption = listSelect?.selectedOptions?.[0];
        const listId = listSelect?.value || 'xotours_us_customers';
        const listName = selectedListOption?.dataset?.name || selectedListOption?.textContent?.replace(/\s+\(\d+\)$/, '') || 'XO Tours US Customers';
        const selectedListId = selectedListOption?.dataset?.id || listId;
        const listCount = parseInt(selectedListOption?.dataset?.count || '0', 10) || 0;
        const campaign = {
            ...(existing || {}),
            id: id || 'camp_' + Date.now() + Math.random().toString(36).substr(2, 5),
            name,
            subject,
            previewText: document.getElementById('camp-form-preview')?.value || '',
            fromName: document.getElementById('camp-form-from-name')?.value || '',
            fromEmail: document.getElementById('camp-form-from-email')?.value || '',
            audienceMode: document.getElementById('camp-form-audience-mode')?.value || 'list',
            listName,
            listId: selectedListId,
            listPath: selectedListId,
            listFile: '',
            listCount,
            segmentName: document.getElementById('camp-form-segment')?.value || '',
            templateMode: document.getElementById('camp-form-template')?.value || 'scratch',
            contentTitle: document.getElementById('camp-form-content-title')?.value || name,
            body: document.getElementById('camp-form-body')?.value || '',
            ctaLabel: document.getElementById('camp-form-cta-label')?.value || '',
            ctaUrl: document.getElementById('camp-form-cta-url')?.value || '',
            timezone: document.getElementById('camp-form-timezone')?.value || '',
            createFolder: true,
            status,
            sentAt: status === 'sent' ? (dateTs || Date.now()) : null,
            scheduledAt: status === 'scheduled' ? (dateTs || Date.now()) : null,
            sent: status === 'sent' ? (existing?.sent || 0) : 0,
            opens: status === 'sent' ? (existing?.opens || 0) : 0,
            openRate: status === 'sent' ? (existing?.openRate || 0) : 0,
            clicks: status === 'sent' ? (existing?.clicks || 0) : 0,
            clickRate: status === 'sent' ? (existing?.clickRate || 0) : 0,
        };

        if (!this.state.campaigns) this.state.campaigns = [];
        const idx = this.state.campaigns.findIndex(x => x.id === campaign.id);
        if (idx !== -1) this.state.campaigns[idx] = campaign;
        else this.state.campaigns.unshift(campaign);

        this.saveCampaignsToLocalStorage();
        if (existing) await this.saveCampaignToServer(campaign);
        else await this.saveCampaignsToServer();
        document.getElementById('camp-form-overlay')?.remove();
        this.renderCampaigns();

        const saved = (this.state.campaigns || []).find(x => x.id === campaign.id) || campaign;
        if (saved.folderPath || saved.campaignUrl) {
            this._showDeployToast(`Campaign folder ready: ${saved.campaignUrl || saved.folderPath}`, 'success', saved.campaignUrl);
        }
    },

    _showCampaignForm(id) {
        const c = id ? (this.state.campaigns || []).find(x => x.id === id) : null;
        const selectedListId = c?.listId || c?.listPath || c?.listFile || 'xotours_us_customers';

        const existing = document.getElementById('camp-form-overlay');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id        = 'camp-form-overlay';
        overlay.className = 'camp-detail-overlay';
        overlay.onclick   = e => { if (e.target === overlay) overlay.remove(); };

        overlay.innerHTML = `
            <div class="camp-detail-panel">
                <div class="camp-detail-top">
                    <div>
                        <div class="camp-detail-title">${c ? 'Edit Campaign' : 'New Campaign'}</div>
                        <div class="camp-detail-subject" style="margin-top:4px">Fill in the details below</div>
                    </div>
                    <button class="camp-detail-close" onclick="document.getElementById('camp-form-overlay').remove()">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                        </svg>
                    </button>
                </div>
                <div style="padding:24px 32px;flex:1;overflow-y:auto;">
                    <div style="display:flex;flex-direction:column;gap:18px;">

                        <div>
                            <label style="font-size:13px;font-weight:600;color:#555;display:block;margin-bottom:6px;">Campaign name *</label>
                            <input id="camp-form-name" type="text" value="${c ? c.name || '' : ''}"
                                   placeholder="e.g. May Newsletter 2026"
                                   style="width:100%;padding:10px 14px;border:1.5px solid #e0d9f7;border-radius:9px;font-size:14px;outline:none;box-sizing:border-box;color:#1a1a2e;"
                                   onfocus="this.style.borderColor='#6c5ce7'" onblur="this.style.borderColor='#e0d9f7'">
                        </div>

                        <div>
                            <label style="font-size:13px;font-weight:600;color:#555;display:block;margin-bottom:6px;">Subject line *</label>
                            <input id="camp-form-subject" type="text" value="${c ? c.subject || '' : ''}"
                                   placeholder="e.g. 🌟 Special offer just for you"
                                   style="width:100%;padding:10px 14px;border:1.5px solid #e0d9f7;border-radius:9px;font-size:14px;outline:none;box-sizing:border-box;color:#1a1a2e;"
                                   onfocus="this.style.borderColor='#6c5ce7'" onblur="this.style.borderColor='#e0d9f7'">
                        </div>

                        <div>
                            <label style="font-size:13px;font-weight:600;color:#555;display:block;margin-bottom:6px;">Preview text</label>
                            <input id="camp-form-preview" type="text" value="${c ? c.previewText || '' : ''}"
                                   placeholder="Short preview shown in inbox…"
                                   style="width:100%;padding:10px 14px;border:1.5px solid #e0d9f7;border-radius:9px;font-size:14px;outline:none;box-sizing:border-box;color:#1a1a2e;"
                                   onfocus="this.style.borderColor='#6c5ce7'" onblur="this.style.borderColor='#e0d9f7'">
                        </div>

                        <div>
                            <label style="font-size:13px;font-weight:600;color:#555;display:block;margin-bottom:6px;">List / Audience</label>
                            <select id="camp-form-list"
                                   style="width:100%;padding:10px 14px;border:1.5px solid #e0d9f7;border-radius:9px;font-size:14px;outline:none;box-sizing:border-box;color:#1a1a2e;background:#fff;appearance:none;cursor:pointer;"
                                   onfocus="this.style.borderColor='#6c5ce7'" onblur="this.style.borderColor='#e0d9f7'">
                                ${this.getCampaignListOptions(selectedListId)}
                            </select>
                        </div>

                        <div>
                            <label style="font-size:13px;font-weight:600;color:#555;display:block;margin-bottom:6px;">Status</label>
                            <select id="camp-form-status"
                                    style="width:100%;padding:10px 14px;border:1.5px solid #e0d9f7;border-radius:9px;font-size:14px;outline:none;box-sizing:border-box;color:#1a1a2e;background:#fff;appearance:none;cursor:pointer;"
                                    onfocus="this.style.borderColor='#6c5ce7'" onblur="this.style.borderColor='#e0d9f7'">
                                <option value="draft"     ${(!c || c.status === 'draft')     ? 'selected' : ''}>Draft</option>
                                <option value="scheduled" ${(c && c.status === 'scheduled')  ? 'selected' : ''}>Scheduled</option>
                                <option value="sent"      ${(c && c.status === 'sent')       ? 'selected' : ''}>Sent</option>
                            </select>
                        </div>

                        <div>
                            <label style="font-size:13px;font-weight:600;color:#555;display:block;margin-bottom:6px;">Schedule / Sent date</label>
                            <input id="camp-form-date" type="datetime-local"
                                   value="${c && (c.sentAt || c.scheduledAt) ? new Date(c.sentAt || c.scheduledAt).toISOString().slice(0,16) : ''}"
                                   style="width:100%;padding:10px 14px;border:1.5px solid #e0d9f7;border-radius:9px;font-size:14px;outline:none;box-sizing:border-box;color:#1a1a2e;"
                                   onfocus="this.style.borderColor='#6c5ce7'" onblur="this.style.borderColor='#e0d9f7'">
                        </div>

                        ${c && c.status === 'sent' ? `
                        <div style="background:#faf9ff;border:1.5px solid #ede9ff;border-radius:12px;padding:16px 18px;">
                            <div style="font-size:13px;font-weight:700;color:#6c5ce7;margin-bottom:12px;">Performance (editable)</div>
                            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                                <div>
                                    <label style="font-size:12px;color:#aaa;font-weight:600;display:block;margin-bottom:4px;">Sent</label>
                                    <input id="camp-form-sent" type="number" value="${c.sent || 0}"
                                           style="width:100%;padding:8px 10px;border:1.5px solid #e0d9f7;border-radius:7px;font-size:13px;outline:none;box-sizing:border-box;">
                                </div>
                                <div>
                                    <label style="font-size:12px;color:#aaa;font-weight:600;display:block;margin-bottom:4px;">Opens</label>
                                    <input id="camp-form-opens" type="number" value="${c.opens || 0}"
                                           style="width:100%;padding:8px 10px;border:1.5px solid #e0d9f7;border-radius:7px;font-size:13px;outline:none;box-sizing:border-box;">
                                </div>
                                <div>
                                    <label style="font-size:12px;color:#aaa;font-weight:600;display:block;margin-bottom:4px;">Open rate %</label>
                                    <input id="camp-form-openrate" type="number" step="0.01" value="${c.openRate || 0}"
                                           style="width:100%;padding:8px 10px;border:1.5px solid #e0d9f7;border-radius:7px;font-size:13px;outline:none;box-sizing:border-box;">
                                </div>
                                <div>
                                    <label style="font-size:12px;color:#aaa;font-weight:600;display:block;margin-bottom:4px;">Clicks</label>
                                    <input id="camp-form-clicks" type="number" value="${c.clicks || 0}"
                                           style="width:100%;padding:8px 10px;border:1.5px solid #e0d9f7;border-radius:7px;font-size:13px;outline:none;box-sizing:border-box;">
                                </div>
                                <div>
                                    <label style="font-size:12px;color:#aaa;font-weight:600;display:block;margin-bottom:4px;">Click rate %</label>
                                    <input id="camp-form-clickrate" type="number" step="0.01" value="${c.clickRate || 0}"
                                           style="width:100%;padding:8px 10px;border:1.5px solid #e0d9f7;border-radius:7px;font-size:13px;outline:none;box-sizing:border-box;">
                                </div>
                            </div>
                        </div>` : ''}

                    </div>
                </div>
                <div class="camp-detail-actions">
                    <button class="camp-action-btn camp-action-btn--primary"
                            onclick="App._saveCampaignForm('${id || ''}')">
                        ${c ? 'Save changes' : 'Create campaign'}
                    </button>
                    <button class="camp-action-btn camp-action-btn--secondary"
                            onclick="document.getElementById('camp-form-overlay').remove()">
                        Cancel
                    </button>
                </div>
            </div>`;

        document.body.appendChild(overlay);
    },

    async _saveCampaignForm(id) {
        const name    = (document.getElementById('camp-form-name')?.value    || '').trim();
        const subject = (document.getElementById('camp-form-subject')?.value || '').trim();
        if (!name || !subject) { alert('Campaign name and subject are required.'); return; }

        const status    = document.getElementById('camp-form-status')?.value    || 'draft';
        const preview   = document.getElementById('camp-form-preview')?.value   || '';
        const listSelect = document.getElementById('camp-form-list');
        const selectedListOption = listSelect?.selectedOptions?.[0];
        const listId = listSelect?.value || 'xotours_us_customers';
        const listName = selectedListOption?.dataset?.name || selectedListOption?.textContent?.replace(/\s+\(\d+\)$/, '') || 'XO Tours US Customers';
        const selectedListId = selectedListOption?.dataset?.id || listId;
        const listCount = parseInt(selectedListOption?.dataset?.count || '0', 10) || 0;
        const dateVal   = document.getElementById('camp-form-date')?.value;
        const dateTs    = dateVal ? new Date(dateVal).getTime() : null;

        const campaign = {
            id:          id || 'camp_' + Date.now() + Math.random().toString(36).substr(2, 5),
            name,
            subject,
            previewText: preview,
            listName,
            listId: selectedListId,
            listPath: selectedListId,
            listFile: '',
            listCount,
            status,
            sentAt:      status === 'sent'      ? (dateTs || Date.now()) : null,
            scheduledAt: status === 'scheduled' ? (dateTs || Date.now()) : null,
            sent:        status === 'sent' ? parseInt(document.getElementById('camp-form-sent')?.value     || '0') : 0,
            opens:       status === 'sent' ? parseInt(document.getElementById('camp-form-opens')?.value    || '0') : 0,
            openRate:    status === 'sent' ? parseFloat(document.getElementById('camp-form-openrate')?.value || '0') : 0,
            clicks:      status === 'sent' ? parseInt(document.getElementById('camp-form-clicks')?.value   || '0') : 0,
            clickRate:   status === 'sent' ? parseFloat(document.getElementById('camp-form-clickrate')?.value || '0') : 0,
        };

        if (!this.state.campaigns) this.state.campaigns = [];

        if (id) {
            const idx = this.state.campaigns.findIndex(x => x.id === id);
            if (idx !== -1) this.state.campaigns[idx] = campaign;
        } else {
            this.state.campaigns.unshift(campaign);
        }

        this.saveCampaignsToLocalStorage();
        if (id) await this.saveCampaignToServer(campaign);
        else await this.saveCampaignsToServer();
        document.getElementById('camp-form-overlay')?.remove();
        this.renderCampaigns();

        // Auto-deploy report page
        this.deployReportPage(campaign.id, true);
    },

    async deployReportPage(campaignId, silent = false) {
        const c = (this.state.campaigns || []).find(x => x.id === campaignId);
        if (!c) return;

        if (!silent) {
            // Show deploying toast
            this._showDeployToast('Deploying report page…', 'loading');
        }

        try {
            const res = await fetch('/api/campaign-deploy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    campaignId: c.id,
                    name:       c.name || 'Untitled',
                    subject:    c.subject || '',
                    listName:   c.listName || '',
                    totalSent:  c.sent || 0,
                }),
            });
            const data = await res.json();
            if (data.success) {
                // Store the report URL on the campaign
                c.reportUrl = data.url;
                this.saveCampaignsToStorage();
                this._showDeployToast(`Report deployed: ${data.url}`, 'success', data.url);
            } else {
                this._showDeployToast(`Deploy failed: ${data.error}`, 'error');
            }
        } catch (e) {
            this._showDeployToast(`Deploy error: ${e.message}`, 'error');
        }
    },

    _showDeployToast(msg, type, url) {
        document.getElementById('camp-deploy-toast')?.remove();
        const toast = document.createElement('div');
        toast.id = 'camp-deploy-toast';
        const bg = type === 'success' ? '#00b894' : type === 'error' ? '#e17055' : '#6c5ce7';
        toast.style.cssText = `position:fixed;bottom:24px;right:24px;background:${bg};color:#fff;
            padding:14px 20px;border-radius:12px;font-size:13px;font-weight:600;
            box-shadow:0 6px 24px rgba(0,0,0,0.2);z-index:9999;max-width:420px;
            animation:campFadeIn 0.2s ease;display:flex;align-items:center;gap:10px;`;
        const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : '⏳';
        toast.innerHTML = `<span>${icon}</span><span style="flex:1">${msg}</span>` +
            (url ? `<a href="${url}" target="_blank" style="color:#fff;text-decoration:underline;font-size:12px">Open ↗</a>` : '');
        document.body.appendChild(toast);
        if (type !== 'loading') setTimeout(() => toast.remove(), 8000);
    },

    duplicateCampaign(id) {
        const c = (this.state.campaigns || []).find(x => x.id === id);
        if (!c) return;
        const copy = {
            ...c,
            id:     'camp_' + Date.now() + Math.random().toString(36).substr(2, 5),
            name:   (c.name || '') + ' (copy)',
            status: 'draft',
            sentAt: null,
            scheduledAt: null,
            sent: 0, opens: 0, openRate: 0, clicks: 0, clickRate: 0
        };
        this.state.campaigns.unshift(copy);
        this.saveCampaignsToStorage();
        document.getElementById('camp-detail-overlay')?.remove();
        this.renderCampaigns();
    },

    unscheduleCampaign(id) {
        const c = (this.state.campaigns || []).find(x => x.id === id);
        if (!c) return;
        c.status      = 'draft';
        c.scheduledAt = null;
        this.saveCampaignsToStorage();
        document.getElementById('camp-detail-overlay')?.remove();
        this.renderCampaigns();
    },

    async deleteCampaign(id) {
        if (!confirm('Are you sure you want to delete this campaign?')) return;
        this.state.campaigns = (this.state.campaigns || []).filter(x => x.id !== id);
        this.saveCampaignsToLocalStorage();
        await this.deleteCampaignFromServer(id);
        document.getElementById('camp-detail-overlay')?.remove();
        document.getElementById('camp-form-overlay')?.remove();
        this.renderCampaigns();
    },

    // =========================================================================
    // CAMPAIGNS — Filtering & Pagination
    // =========================================================================

    filterCampaignsByStatus(status) {
        this.state.campaignStatusFilter = status;
        this.state.campaignPage         = 0;
        this.renderCampaigns();
    },

    searchCampaigns(query) {
        this.state.campaignSearchQuery = query;
        this.state.campaignPage        = 0;
        this.renderCampaigns();
    },

    prevCampaignsPage() {
        if ((this.state.campaignPage || 0) > 0) {
            this.state.campaignPage--;
            this.renderCampaigns();
        }
    },

    nextCampaignsPage() {
        this.state.campaignPage = (this.state.campaignPage || 0) + 1;
        this.renderCampaigns();
    },

    _sortCampaigns(key, dir) {
        this.state.campaignSortKey = key;
        this.state.campaignSortDir = dir;
        this.state.campaignPage    = 0;
        this.renderCampaigns();
    },

    // =========================================================================
    // CAMPAIGNS — Actions menu (chevron dropdown)
    // =========================================================================

    _campaignActionsMenu(id, e) {
        e.stopPropagation();

        // Remove old menu if open
        document.getElementById('camp-actions-popup')?.remove();

        const c = (this.state.campaigns || []).find(x => x.id === id);
        if (!c) return;

        const menu   = document.createElement('div');
        menu.id      = 'camp-actions-popup';
        const rect   = e.currentTarget.getBoundingClientRect();

        menu.style.cssText = `
            position:fixed;top:${rect.bottom + 6}px;left:${rect.left - 140}px;
            background:#fff;border:1.5px solid #ede9ff;border-radius:10px;
            box-shadow:0 8px 24px rgba(0,0,0,0.12);z-index:2000;
            min-width:170px;overflow:hidden;animation:campFadeIn 0.12s ease;`;

        const items = [
            { label: 'View details',  action: `App.showCampaignDetail('${id}')` },
            { label: 'Edit',          action: `App.editCampaign('${id}')` },
            { label: '🚀 Deploy report', action: `App.deployReportPage('${id}')` },
            c.reportUrl
                ? { label: '📊 Open report ↗', action: `window.open('${c.reportUrl}','_blank')` }
                : null,
            { label: 'Duplicate',     action: `App.duplicateCampaign('${id}')` },
            c.status === 'scheduled'
                ? { label: 'Unschedule', action: `App.unscheduleCampaign('${id}')` }
                : null,
            { label: 'Delete', action: `App.deleteCampaign('${id}')`, danger: true },
        ].filter(Boolean);

        menu.innerHTML = items.map(item => `
            <div onclick="${item.action};document.getElementById('camp-actions-popup')?.remove()"
                 style="padding:10px 16px;font-size:13px;font-weight:500;cursor:pointer;
                        color:${item.danger ? '#e53e3e' : '#333'};
                        transition:background 0.1s;"
                 onmouseover="this.style.background='${item.danger ? '#fff0f0' : '#faf9ff'}'"
                 onmouseout="this.style.background=''">
                ${item.label}
            </div>`).join('');

        document.body.appendChild(menu);

        const close = () => { menu.remove(); document.removeEventListener('click', close); };
        setTimeout(() => document.addEventListener('click', close), 0);
    },
};
