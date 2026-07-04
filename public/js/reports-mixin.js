/**
 * ReportsMixin.js  —  CloudMail
 *
 * Full reports page: campaign list with live stats + per-campaign detail
 * that shows data from the campaign-tracker Worker (KV-backed).
 *
 * Config (set once in cloudmain.js or window globals):
 *   window.TRACKER_BASE    = 'https://campaign-tracker.superesolutions.com'
 *   window.TRACKER_SECRET  = ''   // only needed for write ops triggered from UI
 *   window.REPORTS_DOMAIN  = 'supere.ca'   // used to build report page URL
 */
export const ReportsMixin = {

  // ═══════════════════════════════════════════════════════════════════════════
  // CONFIG
  // ═══════════════════════════════════════════════════════════════════════════
  _trackerBase() {
    return window.TRACKER_BASE || 'https://campaign-tracker.superesolutions.com';
  },

  _reportUrl(campaignId) {
    const slug   = campaignId.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const domain = window.REPORTS_DOMAIN || 'supere.ca';
    return `https://${slug}.reports.${domain}`;
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // FETCH LIVE STATS from tracker Worker
  // ═══════════════════════════════════════════════════════════════════════════
  async _fetchTrackerReport(campaignId) {
    try {
      const res = await fetch(`${this._trackerBase()}/api/report/${campaignId}`);
      if (!res.ok) return null;
      return await res.json();
    } catch (_) {
      return null;
    }
  },

  async _fetchTrackerActivity(campaignId, page = 0) {
    try {
      const res = await fetch(
        `${this._trackerBase()}/api/report/${campaignId}/activity?page=${page}`
      );
      if (!res.ok) return { items: [], total: 0, hasMore: false };
      return await res.json();
    } catch (_) {
      return { items: [], total: 0, hasMore: false };
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER — Reports list
  // ═══════════════════════════════════════════════════════════════════════════
  async renderReports() {
    const view = document.getElementById('reports-view');
    if (!view) return;

    const campaigns      = this.state.campaigns || [];
    const statusFilter   = this.state.reportTabFilter  || 'all';
    const searchQuery    = (this.state.reportSearchQuery || '').toLowerCase();
    const sortKey        = this.state.reportSortKey  || 'sentAt';
    const sortDir        = this.state.reportSortDir  || 'desc';
    const page           = this.state.reportPage     || 0;
    const pageSize       = 10;

    let filtered = campaigns.filter(c => {
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (searchQuery && !(c.name || '').toLowerCase().includes(searchQuery) &&
                         !(c.subject || '').toLowerCase().includes(searchQuery)) return false;
      return true;
    });

    filtered.sort((a, b) => {
      let va, vb;
      if (sortKey === 'name') {
        va = a.name || ''; vb = b.name || '';
        return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      if (sortKey === 'openRate')  { va = a.openRate  || 0; vb = b.openRate  || 0; }
      else if (sortKey === 'sent') { va = a.sent       || 0; vb = b.sent       || 0; }
      else                         { va = a.sentAt || 0;     vb = b.sentAt || 0; }
      return sortDir === 'asc' ? va - vb : vb - va;
    });

    const total     = filtered.length;
    const start     = page * pageSize;
    const paginated = filtered.slice(start, start + pageSize);

    const counts = {
      all:       campaigns.length,
      sent:      campaigns.filter(c => c.status === 'sent').length,
      scheduled: campaigns.filter(c => c.status === 'scheduled').length,
      draft:     campaigns.filter(c => c.status === 'draft').length,
    };

    const fmtDate = ts => {
      if (!ts) return '—';
      return new Date(ts).toLocaleString('en-US', {
        month:'short', day:'numeric', year:'numeric', hour:'numeric', minute:'2-digit'
      });
    };

    // ── Build page HTML ───────────────────────────────────────────────────────
    view.innerHTML = `
    <style>
      #reports-view {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        background: #f7f7fc;
        min-height: 100%;
        display: flex;
        flex-direction: column;
      }

      .rp-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 28px 36px 18px;
        background: #fff;
        border-bottom: 1px solid #ececf3;
      }
      .rp-title { font-size: 26px; font-weight: 800; color: #1a1a2e; letter-spacing: -0.4px; }

      .rp-controls {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 14px 36px;
        background: #fff;
        border-bottom: 1px solid #ececf3;
        flex-wrap: wrap;
      }

      .rp-tabs {
        display: flex;
        gap: 2px;
        background: #f3f2fb;
        border-radius: 10px;
        padding: 3px;
      }
      .rp-tab {
        padding: 7px 14px;
        border: none;
        background: none;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 600;
        color: #888;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 5px;
        transition: all 0.14s;
      }
      .rp-tab:hover { color: #6c5ce7; }
      .rp-tab.active { background: #fff; color: #6c5ce7; box-shadow: 0 1px 4px rgba(0,0,0,0.1); }
      .rp-tab-count {
        background: #ede9ff; color: #6c5ce7; border-radius: 20px;
        padding: 1px 7px; font-size: 11px; font-weight: 700;
      }
      .rp-tab.active .rp-tab-count { background: #6c5ce7; color: #fff; }

      .rp-search-wrap { position: relative; flex: 1; max-width: 280px; }
      .rp-search-icon {
        position: absolute; left: 10px; top: 50%; transform: translateY(-50%);
        width: 15px; height: 15px; color: #bbb; pointer-events: none;
      }
      .rp-search {
        width: 100%; padding: 8px 10px 8px 32px;
        border: 1.5px solid #e8e8f0; border-radius: 8px;
        font-size: 13px; background: #fafafa; outline: none;
        transition: border-color 0.14s; box-sizing: border-box;
      }
      .rp-search:focus { border-color: #6c5ce7; background: #fff; }

      .rp-page-info { font-size: 12px; color: #aaa; white-space: nowrap; margin-left: auto; }
      .rp-page-btn {
        width: 28px; height: 28px; border: 1.5px solid #e8e8f0; border-radius: 7px;
        background: #fff; cursor: pointer; display: flex; align-items: center;
        justify-content: center; color: #555; transition: all 0.14s;
      }
      .rp-page-btn:hover:not(:disabled) { border-color: #6c5ce7; color: #6c5ce7; }
      .rp-page-btn:disabled { opacity: 0.35; cursor: default; }

      /* ── Report cards ─────────────────────────────── */
      .rp-list {
        padding: 20px 36px;
        display: flex;
        flex-direction: column;
        gap: 10px;
        flex: 1;
      }

      .rp-card {
        background: #fff;
        border: 1.5px solid #ececf3;
        border-radius: 14px;
        overflow: hidden;
        transition: border-color 0.14s, box-shadow 0.14s;
        cursor: pointer;
      }
      .rp-card:hover {
        border-color: #c5bbf7;
        box-shadow: 0 4px 18px rgba(108,92,231,0.07);
      }

      .rp-card-inner {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 0;
      }

      .rp-card-left { padding: 18px 22px; }
      .rp-card-name { font-size: 15px; font-weight: 700; color: #1a1a2e; }
      .rp-card-subject { font-size: 12px; color: #777; margin-top: 3px; }
      .rp-card-meta { font-size: 11px; color: #bbb; margin-top: 5px; }

      .rp-badge {
        display: inline-flex; align-items: center; gap: 4px;
        padding: 3px 9px; border-radius: 20px;
        font-size: 11px; font-weight: 700;
        margin-bottom: 5px;
      }
      .rp-badge-dot { width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; }
      .rp-badge--sent      { background: #d4f7e7; color: #1a7a4a; }
      .rp-badge--sent .rp-badge-dot { background: #1a7a4a; }
      .rp-badge--scheduled { background: #fff3cd; color: #856404; }
      .rp-badge--draft     { background: #f0f0f6; color: #666; }

      .rp-card-stats {
        display: flex;
        align-items: stretch;
        border-left: 1px solid #f0f0f6;
      }
      .rp-stat {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 16px 18px;
        border-left: 1px solid #f0f0f6;
        gap: 2px;
        min-width: 80px;
      }
      .rp-stat-val {
        font-size: 17px;
        font-weight: 800;
        color: #1a1a2e;
        letter-spacing: -0.3px;
      }
      .rp-stat-label {
        font-size: 10px; font-weight: 600; color: #bbb;
        text-transform: uppercase; letter-spacing: 0.4px;
      }
      .rp-stat--live .rp-stat-val { color: #6c5ce7; }

      /* inline live update indicator */
      .rp-live-dot {
        width: 6px; height: 6px; border-radius: 50%;
        background: #00b894; display: inline-block;
        animation: rpPulse 1.5s ease-in-out infinite;
        margin-right: 4px;
      }
      @keyframes rpPulse { 0%,100%{opacity:1} 50%{opacity:0.2} }

      .rp-card-actions {
        display: flex; flex-direction: column; align-items: center;
        justify-content: center; gap: 6px; padding: 0 14px 0 6px;
      }

      .rp-btn {
        display: inline-flex; align-items: center; gap: 5px;
        padding: 7px 12px; border-radius: 8px;
        font-size: 12px; font-weight: 700; cursor: pointer; border: none;
        transition: all 0.14s; white-space: nowrap;
      }
      .rp-btn--primary { background: #6c5ce7; color: #fff; }
      .rp-btn--primary:hover { background: #5b4fcf; }
      .rp-btn--secondary { background: #f5f3ff; color: #6c5ce7; border: 1.5px solid #e0d9f7; }
      .rp-btn--secondary:hover { background: #ede9ff; }
      .rp-btn--sm { padding: 5px 10px; font-size: 11px; }

      .rp-empty {
        text-align: center; padding: 60px 40px; color: #ccc;
      }
      .rp-empty-icon { font-size: 56px; opacity: 0.15; margin-bottom: 12px; }
    </style>

    <div class="rp-header">
      <span class="rp-title">Reports</span>
    </div>

    <div class="rp-controls">
      <div class="rp-tabs">
        ${['all','sent','scheduled','draft'].map(s => `
          <button class="rp-tab ${statusFilter === s ? 'active' : ''}"
                  onclick="App.setReportFilter('${s}')">
            ${s.charAt(0).toUpperCase()+s.slice(1)}
            <span class="rp-tab-count">${counts[s]}</span>
          </button>`).join('')}
      </div>

      <div class="rp-search-wrap">
        <svg class="rp-search-icon" viewBox="0 0 20 20" fill="none">
          <circle cx="9" cy="9" r="6" stroke="currentColor" stroke-width="1.6"/>
          <path d="M14 14l3 3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
        </svg>
        <input class="rp-search" placeholder="Search reports…"
               value="${this.state.reportSearchQuery || ''}"
               oninput="App.searchReports(this.value)">
      </div>

      <span class="rp-page-info">
        ${total === 0 ? '0' : start+1}–${Math.min(start+pageSize,total)} of <strong>${total}</strong>
      </span>
      <button class="rp-page-btn" ${page===0?'disabled':''} onclick="App.prevReportPage()">
        <svg width="12" height="12" viewBox="0 0 12 12"><path d="M8 2L4 6l4 4" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg>
      </button>
      <button class="rp-page-btn" ${start+pageSize>=total?'disabled':''} onclick="App.nextReportPage()">
        <svg width="12" height="12" viewBox="0 0 12 12"><path d="M4 2l4 4-4 4" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg>
      </button>
    </div>

    <div class="rp-list" id="rp-list-body">
      ${paginated.length === 0 ? `
        <div class="rp-empty">
          <div class="rp-empty-icon">📊</div>
          <div>No reports found</div>
        </div>` : paginated.map(c => this._renderReportCard(c)).join('')}
    </div>`;

    // Kick off live stat fetches for sent campaigns on this page
    paginated
      .filter(c => c.status === 'sent')
      .forEach(c => this._injectLiveStats(c.id));
  },

  _renderReportCard(c) {
    const ts = c.sentAt || c.scheduledAt || 0;
    const fmtDate = t => t
      ? new Date(t).toLocaleString('en-US',
          { month:'short', day:'numeric', year:'numeric', hour:'numeric', minute:'2-digit' })
      : '—';

    return `
      <div class="rp-card" onclick="App.showReportDetail('${c.id}')">
        <div class="rp-card-inner">
          <div class="rp-card-left">
            <div class="rp-badge rp-badge--${c.status}">
              <span class="rp-badge-dot"></span>
              ${c.status === 'sent' ? `Sent · ${fmtDate(c.sentAt)}` :
                c.status === 'scheduled' ? `Scheduled · ${fmtDate(c.scheduledAt)}` : 'Draft'}
            </div>
            <div class="rp-card-name">${c.name || 'Untitled'}</div>
            <div class="rp-card-subject">Subject: ${c.subject || '(no subject)'}</div>
            ${c.listName ? `<div class="rp-card-meta">${c.listName}</div>` : ''}
          </div>

          ${c.status === 'sent' ? `
          <div class="rp-card-stats" id="stats-row-${c.id}">
            <div class="rp-stat">
              <div class="rp-stat-val">${(c.sent||0).toLocaleString()}</div>
              <div class="rp-stat-label">Sent</div>
            </div>
            <div class="rp-stat rp-stat--live">
              <div class="rp-stat-val" id="live-opens-${c.id}">
                <span class="rp-live-dot"></span>—
              </div>
              <div class="rp-stat-label">Opens</div>
            </div>
            <div class="rp-stat rp-stat--live">
              <div class="rp-stat-val" id="live-openrate-${c.id}">—%</div>
              <div class="rp-stat-label">Open rate</div>
            </div>
            <div class="rp-stat rp-stat--live">
              <div class="rp-stat-val" id="live-clicks-${c.id}">—</div>
              <div class="rp-stat-label">Clicks</div>
            </div>
          </div>
          <div class="rp-card-actions">
            <button class="rp-btn rp-btn--primary rp-btn--sm"
                    onclick="event.stopPropagation();App.showReportDetail('${c.id}')">
              View report
            </button>
            <button class="rp-btn rp-btn--secondary rp-btn--sm"
                    onclick="event.stopPropagation();App.openReportPage('${c.id}')">
              Open page ↗
            </button>
          </div>` : `
          <div class="rp-card-actions">
            <button class="rp-btn rp-btn--secondary rp-btn--sm"
                    onclick="event.stopPropagation();App.deployReportPage('${c.id}')">
              Deploy page
            </button>
          </div>`}
        </div>
      </div>`;
  },

  async _injectLiveStats(campaignId) {
    const report = await this._fetchTrackerReport(campaignId);
    if (!report || report.error) return;
    const s = report.stats || {};

    const set = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = val;
    };

    set(`live-opens-${campaignId}`,
      `<span class="rp-live-dot"></span>${(s.uniqueOpens||0).toLocaleString()}`);
    set(`live-openrate-${campaignId}`,  `${s.openRate || '0.00'}%`);
    set(`live-clicks-${campaignId}`,    (s.uniqueClicks||0).toLocaleString());
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // REPORT DETAIL — slide-in panel (mirrors EmailOctopus screenshot)
  // ═══════════════════════════════════════════════════════════════════════════
  async showReportDetail(campaignId) {
    const c = (this.state.campaigns || []).find(x => x.id === campaignId);
    if (!c) return;

    document.getElementById('rp-detail-overlay')?.remove();

    const overlay = document.createElement('div');
    overlay.id        = 'rp-detail-overlay';
    overlay.style.cssText = `
      position:fixed;inset:0;background:rgba(15,15,30,0.5);z-index:1100;
      display:flex;align-items:flex-start;justify-content:flex-end;
      animation:rpFadeIn 0.18s ease;`;
    overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };

    overlay.innerHTML = `
      <style>
        @keyframes rpFadeIn { from{opacity:0} to{opacity:1} }
        @keyframes rpSlideIn { from{transform:translateX(50px);opacity:0} to{transform:none;opacity:1} }
        .rp-panel {
          width:600px; max-width:95vw; height:100vh; background:#fff;
          box-shadow:-6px 0 40px rgba(0,0,0,0.15); overflow-y:auto;
          animation:rpSlideIn 0.22s cubic-bezier(0.34,1.56,0.64,1);
          display:flex; flex-direction:column; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
        }
        .rp-panel-head {
          padding:24px 28px 18px; border-bottom:1px solid #f0f0f6;
          display:flex; align-items:flex-start; justify-content:space-between; gap:16px;
          position:sticky; top:0; background:#fff; z-index:10;
        }
        .rp-panel-title { font-size:18px; font-weight:800; color:#1a1a2e; line-height:1.2; }
        .rp-panel-sub { font-size:12px; color:#aaa; margin-top:4px; }
        .rp-panel-close {
          width:30px;height:30px;background:#f5f3ff;border:none;border-radius:8px;
          cursor:pointer;display:flex;align-items:center;justify-content:center;color:#6c5ce7;
          flex-shrink:0;transition:background 0.14s;
        }
        .rp-panel-close:hover { background:#ede9ff; }
        .rp-donut-strip {
          display:grid; grid-template-columns:repeat(5,1fr);
          border-bottom:1px solid #f0f0f6;
        }
        .rp-donut-cell {
          padding:18px 14px 14px; border-right:1px solid #f0f0f6; text-align:center;
        }
        .rp-donut-cell:last-child { border-right:none; }
        .rp-donut-label { font-size:10px; font-weight:700; color:#aaa; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:8px; }
        .rp-donut-count { font-size:22px; font-weight:800; color:#1a1a2e; letter-spacing:-0.4px; }
        .rp-donut-rate  { font-size:11px; color:#aaa; margin-top:2px; }
        .rp-chart-section { padding:24px 28px 16px; border-bottom:1px solid #f0f0f6; }
        .rp-chart-title { font-size:13px; font-weight:700; color:#1a1a2e; margin-bottom:14px; }
        .rp-chart-wrap { height:180px; position:relative; }
        .rp-activity-section { flex:1; padding-bottom:20px; }
        .rp-activity-head {
          padding:16px 28px 12px; display:flex; align-items:center;
          justify-content:space-between; font-size:13px; font-weight:700; color:#1a1a2e;
          border-bottom:1px solid #f0f0f6; position:sticky; top:71px; background:#fff; z-index:9;
        }
        .rp-act-item {
          display:flex; align-items:center; gap:10px;
          padding:10px 28px; border-bottom:1px solid #f7f7fa;
          font-size:13px;
        }
        .rp-act-avatar {
          width:30px;height:30px;border-radius:50%;flex-shrink:0;
          display:flex;align-items:center;justify-content:center;
          font-size:11px;font-weight:700;color:#fff;
        }
        .rp-act-avatar--open        { background:linear-gradient(135deg,#6c5ce7,#a29bfe); }
        .rp-act-avatar--click       { background:linear-gradient(135deg,#00b894,#00cec9); }
        .rp-act-avatar--bounce      { background:linear-gradient(135deg,#e17055,#fdcb6e); }
        .rp-act-avatar--unsubscribe { background:linear-gradient(135deg,#d63031,#e17055); }
        .rp-act-email { flex:1; min-width:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-weight:600; color:#1a1a2e; }
        .rp-act-type { font-size:11px; color:#aaa; font-weight:500; }
        .rp-act-time { font-size:11px; color:#bbb; white-space:nowrap; }
        .rp-panel-footer {
          padding:16px 28px; border-top:1px solid #f0f0f6;
          display:flex; gap:10px; flex-wrap:wrap;
          position:sticky; bottom:0; background:#fff;
        }
        .rp-load-more {
          width:100%; padding:12px; background:none; border:none;
          color:#6c5ce7; font-size:13px; font-weight:600; cursor:pointer;
          border-top:1px solid #f0f0f6; transition:background 0.12s;
        }
        .rp-load-more:hover { background:#faf9ff; }
        .rp-spinner { display:flex;align-items:center;justify-content:center;padding:32px; }
        .rp-spin { width:28px;height:28px;border:2.5px solid #ede9ff;border-top-color:#6c5ce7;border-radius:50%;animation:rpSpin 0.7s linear infinite; }
        @keyframes rpSpin { to{transform:rotate(360deg)} }
        .rp-action-btn {
          flex:1; padding:10px 14px; border-radius:9px; font-size:13px; font-weight:700;
          cursor:pointer; border:none; transition:all 0.14s;
          display:flex; align-items:center; justify-content:center; gap:6px;
        }
        .rp-action-btn--primary { background:#6c5ce7; color:#fff; }
        .rp-action-btn--primary:hover { background:#5b4fcf; }
        .rp-action-btn--secondary { background:#f5f3ff; color:#6c5ce7; border:1.5px solid #e0d9f7; }
        .rp-action-btn--secondary:hover { background:#ede9ff; }
      </style>
      <div class="rp-panel" id="rp-panel-inner">
        <div class="rp-panel-head">
          <div>
            <div class="rp-badge rp-badge--${c.status}" style="display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border-radius:20px;font-size:11px;font-weight:700;background:${c.status==='sent'?'#d4f7e7':'#f0f0f6'};color:${c.status==='sent'?'#1a7a4a':'#666'};margin-bottom:6px;">
              ${c.status.charAt(0).toUpperCase()+c.status.slice(1)}
            </div>
            <div class="rp-panel-title">${c.name || 'Untitled'}</div>
            <div class="rp-panel-sub">Subject: ${c.subject || '—'} &nbsp;·&nbsp; ${c.listName || '—'}</div>
          </div>
          <button class="rp-panel-close" onclick="document.getElementById('rp-detail-overlay').remove()">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M1 1l11 11M12 1L1 12" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
            </svg>
          </button>
        </div>

        <!-- Metric donuts -->
        <div class="rp-donut-strip" id="rp-donuts">
          <div class="rp-spinner"><div class="rp-spin"></div></div>
        </div>

        <!-- 24h chart -->
        <div class="rp-chart-section">
          <div class="rp-chart-title">Performance in the first 24 hours</div>
          <div class="rp-chart-wrap" id="rp-chart-wrap">
            <div class="rp-spinner"><div class="rp-spin"></div></div>
          </div>
        </div>

        <!-- Activity -->
        <div class="rp-activity-section">
          <div class="rp-activity-head">
            <span>Recent activity</span>
            <span id="rp-act-count" style="font-weight:400;color:#aaa;font-size:12px;">—</span>
          </div>
          <div id="rp-act-list">
            <div class="rp-spinner"><div class="rp-spin"></div></div>
          </div>
          <button class="rp-load-more" id="rp-load-more" style="display:none"
                  onclick="App._rpLoadMoreActivity('${c.id}')">Load more</button>
        </div>

        <div class="rp-panel-footer">
          <button class="rp-action-btn rp-action-btn--primary"
                  onclick="App.openReportPage('${c.id}')">
            Open report page ↗
          </button>
          <button class="rp-action-btn rp-action-btn--secondary"
                  onclick="App.deployReportPage('${c.id}')">
            Re-deploy page
          </button>
          <button class="rp-action-btn rp-action-btn--secondary"
                  onclick="App.duplicateCampaign('${c.id}');document.getElementById('rp-detail-overlay')?.remove()">
            Duplicate campaign
          </button>
        </div>
      </div>`;

    document.body.appendChild(overlay);

    // Now load live data
    this._rpDetailCampaignId  = c.id;
    this._rpDetailActivityPage = 0;
    await this._rpLoadDetailData(c);
  },

  async _rpLoadDetailData(c) {
    const [report, actData] = await Promise.all([
      this._fetchTrackerReport(c.id),
      this._fetchTrackerActivity(c.id, 0),
    ]);

    this._rpRenderDonuts(c, report);
    this._rpRenderChart(report?.hourly || []);
    this._rpRenderActivity(actData, false);
    document.getElementById('rp-act-count')
      && (document.getElementById('rp-act-count').textContent = `${(actData.total||0).toLocaleString()} events`);
    const btn = document.getElementById('rp-load-more');
    if (btn) btn.style.display = actData.hasMore ? 'block' : 'none';
  },

  _rpRenderDonuts(c, report) {
    const s    = report?.stats || {};
    const sent = report?.totalSent || c.sent || 0;
    const cells = [
      { label: 'Emails sent',  count: sent,                       rate: null,                color: '#6c5ce7' },
      { label: 'Opened',       count: s.uniqueOpens   || c.opens  || 0, rate: (s.openRate        || c.openRate  || 0)+'%', color: '#6c5ce7' },
      { label: 'Clicked',      count: s.uniqueClicks  || c.clicks || 0, rate: (s.clickRate       || c.clickRate || 0)+'%', color: '#00b894' },
      { label: 'Unsubscribed', count: s.unsubscribes  || 0,             rate: (s.unsubscribeRate || 0)+'%',                 color: '#d63031' },
      { label: 'Bounced',      count: s.bounces       || 0,             rate: (s.bounceRate      || 0)+'%',                 color: '#e17055' },
    ];
    document.getElementById('rp-donuts').innerHTML = cells.map(cell => {
      const pct = parseFloat(cell.rate) || (cell.rate === null ? 100 : 0);
      const r   = 18, cx = 22, cy = 22;
      const circ = 2 * Math.PI * r;
      const dash = (Math.min(pct,100)/100)*circ;
      const donut = cell.rate === null ? '' :
        `<svg width="44" height="44" viewBox="0 0 44 44" style="display:block;margin:0 auto 6px;">
          <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#f0f0f8" stroke-width="4"/>
          <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${cell.color}" stroke-width="4"
            stroke-dasharray="${dash.toFixed(2)} ${circ.toFixed(2)}"
            stroke-dashoffset="${(circ*.25).toFixed(2)}" stroke-linecap="round"/>
          <text x="${cx}" y="${cy+4}" text-anchor="middle" font-size="8" fill="#666" font-family="monospace">${pct.toFixed(1)}%</text>
        </svg>`;
      return `<div class="rp-donut-cell">
        <div class="rp-donut-label">${cell.label}</div>
        ${donut}
        <div class="rp-donut-count">${Number(cell.count).toLocaleString()}</div>
        ${cell.rate !== null ? `<div class="rp-donut-rate">${cell.rate}</div>` : ''}
      </div>`;
    }).join('');
  },

  _rpRenderChart(hourlyData) {
    const wrap = document.getElementById('rp-chart-wrap');
    if (!wrap) return;
    if (!hourlyData.length) {
      wrap.innerHTML = '<div style="padding:30px;text-align:center;color:#ccc;font-size:13px;">No data yet — opens will appear as they come in.</div>';
      return;
    }
    const W = wrap.clientWidth || 540, H = 160;
    const PAD = { t:14, r:10, b:28, l:36 };
    const cW = W-PAD.l-PAD.r, cH = H-PAD.t-PAD.b;
    const vals = hourlyData.map(d => d.opens);
    const maxV = Math.max(...vals, 1);
    const xS = i  => PAD.l + (i/(hourlyData.length-1))*cW;
    const yS = v  => PAD.t + cH - (v/maxV)*cH;
    const pts = hourlyData.map((d,i) => [xS(i), yS(d.opens)]);
    let line = `M ${pts[0][0]},${pts[0][1]}`;
    for (let i=0;i<pts.length-1;i++) {
      const x1=pts[i][0]+(pts[i+1][0]-(pts[i-1]?.[0]??pts[i][0]))/6;
      const y1=pts[i][1]+(pts[i+1][1]-(pts[i-1]?.[1]??pts[i][1]))/6;
      const x2=pts[i+1][0]-(pts[i+2]?.[0]??pts[i+1][0]-(pts[i][0]-pts[i+1][0]))/6;
      const y2=pts[i+1][1]-(pts[i+2]?.[1]??pts[i+1][1]-(pts[i][1]-pts[i+1][1]))/6;
      line += ` C ${x1},${y1} ${x2},${y2} ${pts[i+1][0]},${pts[i+1][1]}`;
    }
    const area  = line + ` L ${pts[pts.length-1][0]},${PAD.t+cH} L ${pts[0][0]},${PAD.t+cH} Z`;
    const xLbls = hourlyData.filter((_,i)=>i%4===0).map((d,n)=>{
      const i=n*4;
      return `<text x="${xS(i)}" y="${PAD.t+cH+18}" text-anchor="middle" font-size="9" fill="#bbb" font-family="monospace">+${d.hour}h</text>`;
    }).join('');
    wrap.innerHTML = `
      <svg width="100%" height="${H}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
        <defs>
          <linearGradient id="rpGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#6c5ce7" stop-opacity="0.3"/>
            <stop offset="100%" stop-color="#6c5ce7" stop-opacity="0.01"/>
          </linearGradient>
        </defs>
        <path d="${area}" fill="url(#rpGrad)"/>
        <path d="${line}" fill="none" stroke="#6c5ce7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        ${xLbls}
      </svg>`;
  },

  _rpRenderActivity(actData, append) {
    const list = document.getElementById('rp-act-list');
    if (!list) return;
    if (!append) list.innerHTML = '';
    if (!actData.items?.length && !append) {
      list.innerHTML = '<div style="padding:28px;text-align:center;color:#ccc;font-size:13px;">No activity yet.</div>';
      return;
    }
    const typeLabel = { open:'opened', click:'clicked', bounce:'bounced', unsubscribe:'unsubscribed' };
    const ini = e => ((e.email||e.contactId||'?').split('@')[0]).slice(0,2).toUpperCase();
    const relT = iso => {
      if (!iso) return '';
      const d = (Date.now()-new Date(iso).getTime())/1000;
      if (d<60) return `${Math.round(d)}s ago`;
      if (d<3600) return `${Math.round(d/60)}m ago`;
      if (d<86400) return `${Math.round(d/3600)}h ago`;
      return new Date(iso).toLocaleDateString('en-US',{month:'short',day:'numeric'});
    };
    list.insertAdjacentHTML('beforeend', actData.items.map(ev => `
      <div class="rp-act-item">
        <div class="rp-act-avatar rp-act-avatar--${ev.type}">${ini(ev)}</div>
        <div class="rp-act-email">${ev.email || ev.contactId || '—'}</div>
        <div class="rp-act-type">${typeLabel[ev.type] || ev.type}</div>
        <div class="rp-act-time">${relT(ev.ts)}</div>
      </div>`).join(''));
  },

  async _rpLoadMoreActivity(campaignId) {
    this._rpDetailActivityPage = (this._rpDetailActivityPage || 0) + 1;
    const actData = await this._fetchTrackerActivity(campaignId, this._rpDetailActivityPage);
    this._rpRenderActivity(actData, true);
    const btn = document.getElementById('rp-load-more');
    if (btn) btn.style.display = actData.hasMore ? 'block' : 'none';
    const cnt = document.getElementById('rp-act-count');
    if (cnt) cnt.textContent = `${(actData.total||0).toLocaleString()} events`;
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Actions
  // ═══════════════════════════════════════════════════════════════════════════

  openReportPage(campaignId) {
    window.open(this._reportUrl(campaignId), '_blank');
  },

  deployReportPage(campaignId) {
    const c = (this.state.campaigns || []).find(x => x.id === campaignId);
    if (!c) return;
    const cmd = [
      `node campaign-deploy.js`,
      `--campaign-id "${c.id}"`,
      `--name "${(c.name||'').replace(/"/g,'')}"`,
      `--subject "${(c.subject||'').replace(/"/g,'')}"`,
      `--sent ${c.sent||0}`,
      `--list "${(c.listName||'').replace(/"/g,'')}"`
    ].join(' \\\n  ');

    const msg = `Deploy this campaign's report page by running:\n\n${cmd}\n\n` +
                `Report URL: ${this._reportUrl(c.id)}`;
    alert(msg);
  },

  // ─── Filter / search / pagination ──────────────────────────────────────────
  setReportFilter(status) {
    this.state.reportTabFilter = status;
    this.state.reportPage      = 0;
    this.renderReports();
  },

  searchReports(q) {
    this.state.reportSearchQuery = q;
    this.state.reportPage        = 0;
    this.renderReports();
  },

  prevReportPage() {
    if ((this.state.reportPage||0) > 0) { this.state.reportPage--; this.renderReports(); }
  },

  nextReportPage() {
    this.state.reportPage = (this.state.reportPage||0) + 1;
    this.renderReports();
  },
};
