/**
 * ExportsConsentMixin â€” Exports + Consent & Customisation pages for CloudMail
 * Modelled on the EmailOctopus UI.
 * Merge via Object.assign(App, ContactsMixin, ExportsConsentMixin, ...)
 *
 * Prerequisites (add to App.state during init):
 *   exports: []          // array of export records
 *   consentSettings: {}  // double-opt-in + subscriber-profile config
 *
 * Wire up the tab nav by calling App.showContactsSubTab('exports')
 * or App.showContactsSubTab('consent') from your tab onclick handlers.
 */
export const ExportsConsentMixin = {
  // =========================================================================
  // SHARED â€” Sub-tab router
  // =========================================================================

  /**
   * Switch between the contacts sub-tabs:
   *   'contacts' | 'fields' | 'tags' | 'segments' | 'imports' | 'exports' | 'consent'
   * Call this from your existing tab-bar onclick handlers.
   */
  showContactsSubTab(tab) {
    this.state.contactsSubTab = tab;

    // highlight the active tab in whatever tab-bar markup you have
    document.querySelectorAll("[data-contacts-tab]").forEach((el) => {
      el.classList.toggle(
        "active",
        el.getAttribute("data-contacts-tab") === tab,
      );
    });

    const mainArea = document.getElementById("contact-list-items");
    if (!mainArea) return;

    if (tab === "exports") {
      this.renderExportsPage();
    } else if (tab === "consent") {
      this.renderConsentPage();
    } else {
      // All other tabs fall through to existing logic
      const listContainer = document.getElementById("contact-list-items");
      if (tab === "fields") this.renderFieldsPage(listContainer);
      else if (tab === "tags") this.renderTagsPage(listContainer);
      else if (tab === "segments") this.renderSegmentsPage(listContainer);
      else if (tab === "imports") this.renderImportsPage(listContainer);
      else this.renderContacts();
    }
  },

  // =========================================================================
  // EXPORTS â€” Data helpers
  // =========================================================================

  /** Call this to load exports from the server (optional). */
  async loadExports() {
    try {
      const res = await fetch("/api/exports");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) this.state.exports = data;
      }
    } catch (e) {
      console.warn("Could not load exports from server:", e);
    }
    if (this.state.contactsSubTab === "exports") this.renderExportsPage();
  },

  /**
   * Trigger a new export for the current contact group.
   * @param {'current'} scope
   */
  async triggerExport(scope = "current") {
    const btn = document.getElementById("eo-export-trigger-btn");
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Exporting…";
    }

    try {
      const group = this.state.currentContactGroup || "all";
      if (group === "all" || group.startsWith("domain:")) {
        throw new Error("Select a specific contact list before exporting.");
      }
      const contacts = (this.state.contacts || []).filter(
        (contact) => contact.group === group,
      );
      const listName =
        (this.state.contactLists || []).find((list) => list.id === group)
          ?.name || group;
      const res = await fetch("/api/contact-group-export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ group, contacts }),
      });
      const data = await res.json();
      if (!res.ok || !data.success)
        throw new Error(data.error || "Export failed");

      const record = {
        id: "exp_" + Date.now(),
        label: listName,
        status: "exported",
        createdAt: Date.now(),
        count: Number.isFinite(data.count) ? data.count : contacts.length,
        by:
          (this.state.accounts && this.state.accounts[0]?.smtp?.from) || "you",
        downloadUrl: data.downloadUrl || `/config/contact-lists/${group}.json`,
        group,
      };

      if (!this.state.exports) this.state.exports = [];
      this.state.exports.unshift(record);
      this._saveExportsToStorage();
    } catch (e) {
      console.error("Export failed:", e);
      if (!this.state.exports) this.state.exports = [];
      this.state.exports.unshift({
        id: "exp_" + Date.now(),
        label: "Current group",
        status: "failed",
        createdAt: Date.now(),
        count: 0,
        by: "you",
        downloadUrl: null,
      });
      alert("Export failed: " + e.message);
    }

    if (btn) {
      btn.disabled = false;
      btn.textContent = "Export current group";
    }
    this.renderExportsPage();
  },

  _saveExportsToStorage() {
    try {
      localStorage.setItem(
        "cloudmail_exports",
        JSON.stringify(this.state.exports || []),
      );
    } catch (_) {}
  },

  _loadExportsFromStorage() {
    try {
      const raw = localStorage.getItem("cloudmail_exports");
      if (raw) this.state.exports = JSON.parse(raw);
    } catch (_) {}
  },

  // =========================================================================
  // EXPORTS â€” Render
  // =========================================================================

  renderExportsPage() {
    const container = document.getElementById("contact-list-items");
    if (!container) return;

    this._loadExportsFromStorage();
    const exports = this.state.exports || [];

    const fmtAge = (ts) => {
      if (!ts) return "";
      const diffMs = Date.now() - ts;
      const diffMin = Math.round(diffMs / 60000);
      if (diffMin < 60)
        return diffMin <= 1 ? "just now" : `${diffMin} minutes ago`;
      const diffH = Math.round(diffMin / 60);
      if (diffH < 24) return diffH === 1 ? "1 hour ago" : `${diffH} hours ago`;
      const diffD = Math.round(diffH / 24);
      return diffD === 1 ? "yesterday" : `${diffD} days ago`;
    };

    const exportRowsHtml =
      exports.length === 0
        ? `<div class="eo-exports-empty">
                   No exports yet. Use the <strong>Actions</strong> menu on the
                   <a onclick="App.showContactsSubTab('contacts')" class="eo-link">contacts screen</a>
                   or click <strong>Export contacts</strong> above to create one.
               </div>`
        : exports
            .map((exp) => {
              const isOk =
                exp.status === "exported" || exp.status === "complete";
              const isFailed = exp.status === "failed";
              const iconHtml = isOk
                ? `<svg class="eo-exp-icon eo-exp-icon--ok" viewBox="0 0 24 24" fill="none">
                           <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.8"/>
                           <path d="M7 12.5l3.5 3.5 6-7" stroke="currentColor" stroke-width="1.8"
                                 stroke-linecap="round" stroke-linejoin="round"/>
                       </svg>`
                : isFailed
                  ? `<svg class="eo-exp-icon eo-exp-icon--fail" viewBox="0 0 24 24" fill="none">
                           <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.8"/>
                           <path d="M9 9l6 6M15 9l-6 6" stroke="currentColor" stroke-width="1.8"
                                 stroke-linecap="round"/>
                       </svg>`
                  : `<svg class="eo-exp-icon eo-exp-icon--pending" viewBox="0 0 24 24" fill="none">
                           <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.8"
                                   stroke-dasharray="4 2"/>
                       </svg>`;

              const badgeClass = isOk
                ? "eo-badge--exported"
                : isFailed
                  ? "eo-badge--failed"
                  : "eo-badge--pending";
              const badgeLabel = isOk
                ? "Exported"
                : isFailed
                  ? "Failed"
                  : "Processing";

              const dlBtn = isOk
                ? `<button class="eo-dl-btn"
                               onclick="App._downloadExport('${exp.id}')">
                           <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                               <path d="M8 2v8M5 7l3 3 3-3M3 13h10"
                                     stroke="currentColor" stroke-width="1.5"
                                     stroke-linecap="round" stroke-linejoin="round"/>
                           </svg>
                           Download
                       </button>`
                : "";

              return `
                <div class="eo-exp-row">
                    <div class="eo-exp-icon-col">${iconHtml}</div>
                    <div class="eo-exp-info">
                        <div class="eo-exp-label">${exp.label || "Export"}</div>
                        <div class="eo-exp-meta">
                            ${fmtAge(exp.createdAt)} by ${exp.by || "unknown"}
                        </div>
                    </div>
                    <div class="eo-exp-badge-col">
                        <span class="eo-badge ${badgeClass}">${badgeLabel}</span>
                    </div>
                    <div class="eo-exp-count-col">
                        <div class="eo-exp-count">${(exp.count || 0).toLocaleString()}</div>
                        <div class="eo-exp-count-label">Contacts exported</div>
                    </div>
                    <div class="eo-exp-actions-col">${dlBtn}</div>
                </div>`;
            })
            .join("");

    const totalExports = exports.length;
    const paginationLabel =
      totalExports === 0
        ? ""
        : `<span class="eo-pagination-info">1â€“${totalExports} of <strong>${totalExports}</strong></span>`;

    container.innerHTML = `
        <style>
            .eo-exports-wrap { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 0; }
            .eo-exports-topbar { display: flex; align-items: center; justify-content: space-between; padding: 18px 28px 10px; border-bottom: 1px solid #f0f0f0; flex-wrap: wrap; gap: 12px; }
            .eo-exports-hint { font-size: 14px; color: #555; }
            .eo-exports-hint .eo-link { color: #6c5ce7; font-weight: 500; cursor: pointer; text-decoration: none; }
            .eo-exports-hint .eo-link:hover { text-decoration: underline; }
            .eo-exports-right { display: flex; align-items: center; gap: 16px; }
            .eo-export-trigger-btn { display: inline-flex; align-items: center; gap: 8px; background: #6c5ce7; color: #fff; border: none; border-radius: 8px; padding: 9px 20px; font-size: 14px; font-weight: 600; cursor: pointer; transition: background 0.15s; }
            .eo-export-trigger-btn:hover { background: #5b4fcf; }
            .eo-export-trigger-btn:disabled { opacity: 0.6; cursor: not-allowed; }
            .eo-exp-list { padding: 0 28px; }
            .eo-exp-row { display: flex; align-items: center; gap: 20px; padding: 22px 0; border-bottom: 1px solid #f0f0f0; }
            .eo-exp-row:last-child { border-bottom: none; }
            .eo-exp-icon--ok { color: #00b894; }
            .eo-exp-icon--fail { color: #e17055; }
            .eo-exp-icon--pending { color: #b2bec3; }
            .eo-exp-label { font-size: 16px; font-weight: 600; color: #1a1a2e; margin-bottom: 4px; }
            .eo-exp-meta { font-size: 13px; color: #888; }
            .eo-badge { display: inline-block; padding: 4px 14px; border-radius: 20px; font-size: 13px; font-weight: 600; }
            .eo-badge--exported { background: #d4f7e7; color: #1a7a4a; }
            .eo-badge--failed { background: #fde8e8; color: #c0392b; }
            .eo-badge--pending { background: #fff3cd; color: #856404; }
            .eo-exp-count { font-size: 22px; font-weight: 700; color: #1a1a2e; }
            .eo-exp-count-label { font-size: 12px; color: #888; }
            .eo-dl-btn { display: inline-flex; align-items: center; gap: 7px; background: #fff; border: 1.5px solid #e5e5e5; border-radius: 8px; padding: 8px 16px; font-size: 13px; font-weight: 500; color: #444; cursor: pointer; transition: all 0.15s; }
            .eo-dl-btn:hover { border-color: #6c5ce7; color: #6c5ce7; }
            .eo-exports-empty { padding: 48px 0; text-align: center; color: #999; font-size: 14px; }
            .eo-exports-footer { display: flex; justify-content: flex-end; align-items: center; padding: 12px 28px; font-size: 13px; color: #888; border-top: 1px solid #f0f0f0; }
        </style>
        <div class="eo-exports-wrap">
            <div class="eo-exports-topbar">
                <div class="eo-exports-hint">To start an export, use the <strong>Actions</strong> menu on the <a class="eo-link" onclick="App.showContactsSubTab('contacts')">contacts screen</a>.</div>
                <div class="eo-exports-right">${paginationLabel} <button id="eo-export-trigger-btn" class="eo-export-trigger-btn" onclick="App.triggerExport('current')"><svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M7.5 2v8M4.5 7l3 3 3-3M2 13h11" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg> Export current group</button></div>
            </div>
            <div class="eo-exp-list">${exportRowsHtml}</div>
            ${totalExports > 0 ? `<div class="eo-exports-footer">${paginationLabel}</div>` : ""}
        </div>`;
  },

  /** Trigger a file download for a completed export. */
  _downloadExport(exportId) {
    const exp = (this.state.exports || []).find((e) => e.id === exportId);
    if (!exp) return;

    if (exp.downloadUrl) {
      const a = document.createElement("a");
      a.href = exp.downloadUrl;
      a.download = `export-${exportId}.csv`;
      a.click();
      return;
    }

    const contacts = exp.group
      ? (this.state.contacts || []).filter(
          (contact) => contact.group === exp.group,
        )
      : this.state.contacts || [];
    const rows = [
      [
        "Email",
        "First name",
        "Last name",
        "Phone",
        "Company",
        "Group",
        "Status",
        "Notes",
      ],
    ];
    contacts.forEach((c) => {
      const name = c.name || "";
      rows.push([
        (c.emails && c.emails[0]) || "",
        c.firstName || name.split(" ")[0] || "",
        c.lastName || name.split(" ").slice(1).join(" ") || "",
        c.phone || "",
        c.company || "",
        c.group || "",
        c.status || "subscribed",
        c.notes || "",
      ]);
    });
    const csvContent = rows
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `contacts-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  },

  // =========================================================================
  // CONSENT & CUSTOMISATION â€” Data helpers
  // =========================================================================

  _defaultConsentSettings() {
    return {
      doubleOptIn: {
        enabled: false,
        subjectLine: "Please confirm your email address",
        previewText: "",
        fromName: "",
        replyToEmail: "",
        successMessage: "Thank you for subscribing!",
      },
      subscriberProfile: { enabled: false },
    };
  },

  _loadConsentSettings() {
    if (!this.state.consentSettings) {
      try {
        const raw = localStorage.getItem("cloudmail_consent_settings");
        this.state.consentSettings = raw
          ? JSON.parse(raw)
          : this._defaultConsentSettings();
      } catch (_) {
        this.state.consentSettings = this._defaultConsentSettings();
      }
    }
  },

  _saveConsentSettings() {
    try {
      localStorage.setItem(
        "cloudmail_consent_settings",
        JSON.stringify(this.state.consentSettings),
      );
    } catch (_) {}
  },

  async saveConsentSettings() {
    this._loadConsentSettings();
    const s = this.state.consentSettings;
    s.doubleOptIn.enabled =
      document.getElementById("doi-toggle")?.checked ?? s.doubleOptIn.enabled;
    s.doubleOptIn.subjectLine =
      document.getElementById("doi-subject")?.value ??
      s.doubleOptIn.subjectLine;
    s.doubleOptIn.previewText =
      document.getElementById("doi-preview")?.value ??
      s.doubleOptIn.previewText;
    s.doubleOptIn.fromName =
      document.getElementById("doi-from-name")?.value ?? s.doubleOptIn.fromName;
    s.doubleOptIn.replyToEmail =
      document.getElementById("doi-reply-to")?.value ??
      s.doubleOptIn.replyToEmail;
    s.doubleOptIn.successMessage =
      document.getElementById("doi-success")?.value ??
      s.doubleOptIn.successMessage;
    this._saveConsentSettings();
    const btn = document.getElementById("consent-save-btn");
    if (btn) {
      btn.textContent = "Saved âœ“";
      btn.style.background = "#00b894";
      setTimeout(() => {
        btn.textContent = "Save changes";
        btn.style.background = "";
      }, 2000);
    }
    try {
      await fetch("/api/consent-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(s),
      });
    } catch (e) {
      console.warn("Could not save consent settings to server:", e);
    }
  },

  // =========================================================================
  // CONSENT & CUSTOMISATION â€” Render
  // =========================================================================

  renderConsentPage() {
    const container = document.getElementById("contact-list-items");
    if (!container) return;
    this._loadConsentSettings();
    const s = this.state.consentSettings;
    const doi = s.doubleOptIn || {};
    container.innerHTML = `
        <style>
            .eo-consent-wrap { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 32px 28px; max-width: 900px; }
            .eo-consent-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 40px; }
            .eo-consent-card { border: 1.5px solid #e8e5f8; border-radius: 14px; padding: 28px 26px; display: flex; align-items: flex-start; gap: 20px; cursor: pointer; transition: box-shadow 0.15s, border-color 0.15s; background: #fff; position: relative; }
            .eo-consent-card:hover { box-shadow: 0 4px 20px rgba(108,92,231,0.10); border-color: #b8acf0; }
            .eo-consent-card--active { border-color: #6c5ce7; box-shadow: 0 4px 20px rgba(108,92,231,0.12); }
            .eo-consent-card-icon { width: 54px; height: 54px; background: #f0eeff; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
            .eo-consent-card-icon svg { color: #6c5ce7; }
            .eo-consent-card-title { font-size: 16px; font-weight: 700; color: #1a1a2e; margin-bottom: 6px; }
            .eo-consent-card-desc { font-size: 13px; color: #777; line-height: 1.5; }
            .eo-pro-badge { position: absolute; top: 14px; right: 14px; background: #f0eeff; color: #6c5ce7; border: 1px solid #d4ccf5; border-radius: 12px; padding: 3px 10px; font-size: 12px; font-weight: 600; }
            .eo-doi-panel { background: #fafafe; border: 1.5px solid #e8e5f8; border-radius: 14px; padding: 32px 28px; margin-top: 4px; }
            .eo-toggle-row { display: flex; align-items: center; justify-content: space-between; padding: 16px 0; border-bottom: 1px solid #eee; margin-bottom: 24px; }
            .eo-switch { position: relative; display: inline-block; width: 44px; height: 24px; }
            .eo-switch input { opacity: 0; width: 0; height: 0; }
            .eo-switch-slider { position: absolute; inset: 0; background: #ddd; border-radius: 24px; transition: background 0.2s; cursor: pointer; }
            .eo-switch-slider:before { content: ''; position: absolute; width: 18px; height: 18px; border-radius: 50%; background: #fff; left: 3px; top: 3px; transition: transform 0.2s; box-shadow: 0 1px 4px rgba(0,0,0,.2); }
            .eo-switch input:checked + .eo-switch-slider { background: #6c5ce7; }
            .eo-switch input:checked + .eo-switch-slider:before { transform: translateX(20px); }
            .eo-doi-fields { display: flex; flex-direction: column; gap: 20px; }
            .eo-field-group { display: flex; flex-direction: column; gap: 6px; }
            .eo-field-label { font-size: 13px; font-weight: 600; color: #555; }
            .eo-field-input { border: 1.5px solid #e0ddf5; border-radius: 8px; padding: 10px 14px; font-size: 14px; color: #1a1a2e; background: #fff; outline: none; transition: border-color 0.15s; width: 100%; box-sizing: border-box; }
            .eo-field-input:focus { border-color: #6c5ce7; }
            .eo-consent-save-btn { background: #6c5ce7; color: #fff; border: none; border-radius: 8px; padding: 10px 28px; font-size: 14px; font-weight: 600; cursor: pointer; transition: background 0.15s; }
        </style>
        <div class="eo-consent-wrap">
            <div class="eo-consent-cards">
                <div class="eo-consent-card ${doi.enabled ? "eo-consent-card--active" : ""}" onclick="App._toggleDoiPanel()">
                    <div class="eo-consent-card-icon"><svg width="26" height="26" viewBox="0 0 26 26" fill="none"><circle cx="13" cy="13" r="11" stroke="currentColor" stroke-width="1.8"/><circle cx="13" cy="13" r="5"  stroke="currentColor" stroke-width="1.8"/><path d="M13 2v4M13 20v4M2 13h4M20 13h4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></div>
                    <div class="eo-consent-card-body"><div class="eo-consent-card-title">Double opt-in email</div><div class="eo-consent-card-desc">Confirm that your contacts want to receive emails</div></div>
                </div>
                <div class="eo-consent-card" style="opacity:0.85;cursor:default;" title="Upgrade to Pro to enable this feature"><div class="eo-consent-card-icon"><svg width="26" height="26" viewBox="0 0 26 26" fill="none"><circle cx="13" cy="10" r="5" stroke="currentColor" stroke-width="1.8"/><path d="M4 22c0-5 4-8 9-8s9 3 9 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></div><div class="eo-consent-card-body"><div class="eo-consent-card-title">Subscriber profile page</div><div class="eo-consent-card-desc">Let your contacts manage their information and preferences</div></div><span class="eo-pro-badge">Pro plan</span></div>
            </div>
            <div class="eo-doi-panel" id="eo-doi-panel">
                <div class="eo-doi-panel-title">Double opt-in email</div>
                <div class="eo-doi-panel-desc">When enabled, new subscribers receive a confirmation email before being added to your list.</div>
                <div class="eo-toggle-row"><div><div class="eo-toggle-label">Enable double opt-in</div><div class="eo-toggle-sub">New subscribers must confirm their email address</div></div><label class="eo-switch"><input type="checkbox" id="doi-toggle" ${doi.enabled ? "checked" : ""} onchange="App._onDoiToggle(this.checked)"><span class="eo-switch-slider"></span></label></div>
                <div class="eo-doi-fields" id="eo-doi-fields" style="${doi.enabled ? "" : "opacity:0.45;pointer-events:none;"}">
                    <div class="eo-field-group"><label class="eo-field-label" for="doi-subject">Subject line</label><input class="eo-field-input" id="doi-subject" type="text" value="${this._esc(doi.subjectLine || "")}"></div>
                    <div class="eo-field-group"><label class="eo-field-label" for="doi-preview">Preview text</label><input class="eo-field-input" id="doi-preview" type="text" value="${this._esc(doi.previewText || "")}"></div>
                    <div class="eo-field-group"><label class="eo-field-label" for="doi-from-name">From name</label><input class="eo-field-input" id="doi-from-name" type="text" value="${this._esc(doi.fromName || "")}"></div>
                    <div class="eo-field-group"><label class="eo-field-label" for="doi-reply-to">Reply-to email</label><input class="eo-field-input" id="doi-reply-to" type="email" value="${this._esc(doi.replyToEmail || "")}"></div>
                    <div class="eo-field-group"><label class="eo-field-label" for="doi-success">Success message</label><textarea class="eo-field-input eo-field-textarea" id="doi-success">${this._esc(doi.successMessage || "")}</textarea></div>
                </div>
                <div class="eo-consent-actions"><button id="consent-save-btn" class="eo-consent-save-btn" onclick="App.saveConsentSettings()">Save changes</button></div>
            </div>
        </div>`;
  },

  _toggleDoiPanel() {
    const toggle = document.getElementById("doi-toggle");
    if (toggle) {
      toggle.checked = !toggle.checked;
      this._onDoiToggle(toggle.checked);
    }
  },

  _onDoiToggle(enabled) {
    const fields = document.getElementById("eo-doi-fields");
    if (fields) {
      fields.style.opacity = enabled ? "1" : "0.45";
      fields.style.pointerEvents = enabled ? "auto" : "none";
    }
    const card = document.querySelector(".eo-consent-card");
    if (card) card.classList.toggle("eo-consent-card--active", enabled);
  },

  _esc(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  },

  // =========================================================================
  // CONTACTS â€” Page header with sub-tabs
  // =========================================================================

  _contactsPageHeaderHtml(
    activeTab,
    overrideCount = null,
    overrideLabel = null,
    showPoliticianButtons = false,
    showTitle = true
  ) {
    const tabs = [
      { id: "contacts", label: "Contacts" },
      { id: "fields", label: "Fields" },
      { id: "tags", label: "Tags" },
      { id: "segments", label: "Segments" },
      { id: "imports", label: "Imports" },
      { id: "exports", label: "Exports" },
      { id: "consent", label: "Consent & customisation" },
    ];
    const tabsHtml = tabs
      .map(
        (t) =>
          `<button data-contacts-tab="${t.id}" class="eo-page-tab ${activeTab === t.id ? "eo-page-tab--active" : ""}" onclick="App.showContactsSubTab('${t.id}')">${t.label}</button>`,
      )
      .join("");
    const count =
      overrideCount !== null
        ? overrideCount
        : this.state.contacts
          ? this.state.contacts.length
          : 0;
    const label =
      overrideLabel !== null ? overrideLabel : "subscribed contacts";
    return `
        <style>
            .eo-page-header { padding: 28px 28px 0; }
            .eo-page-title  { font-size: 30px; font-weight: 800; color: #1a1a2e; margin: 0 0 4px; }
            .eo-page-subtitle { font-size: 14px; color: #999; margin-bottom: 22px; }
            .eo-page-tabs { display: flex; gap: 0; border-bottom: 2px solid #f0f0f0; margin: 0 -28px; padding: 0 28px; overflow-x: auto; scrollbar-width: none; }
            .eo-page-tab { background: none; border: none; padding: 10px 18px; font-size: 14px; font-weight: 500; color: #888; cursor: pointer; white-space: nowrap; border-bottom: 2.5px solid transparent; margin-bottom: -2px; transition: color 0.15s, border-color 0.15s; }
            .eo-page-tab:hover { color: #1a1a2e; }
            .eo-page-tab--active { color: #1a1a2e; font-weight: 700; border-bottom-color: #1a1a2e; }
            .eo-contact-alphabet-row { display: flex; gap: 1px; align-items: center; justify-content: flex-start; flex-wrap: nowrap; }
            .eo-letter-btn { border: 1px solid #ddd; background: #fff; color: #555; border-radius: 3px; min-width: 28px; height: 20px; padding: 0 3px; font-size: 10px; font-weight: 700; cursor: pointer; }
            .eo-letter-btn:hover:not(:disabled), .eo-letter-btn.is-active { border-color: #6c5ce7; background: #f1efff; color: #5b4acb; }
            .eo-letter-btn:disabled { opacity: .35; cursor: default; }
            .eo-contact-footer-row { display: flex; gap: 8px; align-items: center; justify-content: flex-start; flex-wrap: nowrap; overflow-x: auto; white-space: nowrap; }
            .eo-contact-tag-summary { color: #555; font-size: 12px; line-height: 1.5; margin-top: 6px; text-align: left; }
            .eo-contact-tag-summary-line { white-space: nowrap; overflow-x: auto; max-width: 100%; }
            .eo-contact-tag-summary-link { border: 0; background: transparent; color: #5b4acb; padding: 0 2px; font: inherit; font-weight: 700; cursor: pointer; }
            .eo-contact-tag-summary-link:hover { text-decoration: underline; }
        </style>
        <div class="eo-page-header">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:14px;">
                <div style="${showTitle ? "" : "display:none;"}">
                    <h1 class="eo-page-title">Contacts</h1>
                    <div class="eo-page-subtitle">${count.toLocaleString()} ${label}</div>
                </div>
                ${
                  showPoliticianButtons
                    ? `
                <div class="eo-politician-header-actions" style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
                    <button class="eo-pill eo-pill--active" onclick="App.syncPoliticians()" style="background:#e8e4f8;color:#6c5ce7;border-color:#d4ccf5;">
                        <i class="fas fa-sync-alt"></i> Sync
                    </button>
                    <button class="eo-pill eo-pill--active" onclick="App.openFamousPeopleListModal && App.openFamousPeopleListModal()" style="background:#e8f7ef;color:#167345;border-color:#bfe7cf;">
                        <i class="fas fa-microphone-lines"></i> Voice List
                    </button>
                </div>
                `
                    : ""
                }
            </div>
            <div class="eo-page-tabs">${tabsHtml}</div>
        </div>`;
  },
};
