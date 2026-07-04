/**
 * ContactDetailMixin - Contact detail view rendering logic
 * Extracted from contacts.js — merge via Object.assign(App, ContactDetailMixin, ...)
 */


export const ContactDetailMixin = {
    // =========================================================================
    // CONTACTS — Detail View
    // =========================================================================

    async showContactDetail(id) {
        const renderId = Date.now() + Math.random().toString();
        this.state._detailRenderId = renderId;

        const isRichGroup = ['politicians', 'encyclopedia', 'vancouver'].includes(this.state.currentContactGroup);
        if (isRichGroup) {
            document.getElementById('contacts-view')?.classList.add('politician-detail-mode');
        } else {
            document.getElementById('contacts-view')?.classList.remove('politician-detail-mode');
        }

        if (!this.state.selectedContactIds.has(id)) {
            this.state.selectedContactIds.clear();
            this.state.selectedContactIds.add(id);
        }
        this.state.selectedContactId = id;

        // Update URL to include the contact name for deep-linking
        const contact = this.state.contacts.find((c) => c.id === id);
        if (contact) {
            const base =
                ['politicians', 'encyclopedia', 'vancouver'].includes(this.state.currentContactGroup)
                    ? `#${this.state.currentContactGroup}`
                    : "#contacts";
            const isBusiness = ['encyclopedia', 'vancouver'].includes(this.state.currentContactGroup);
            const slugName = isBusiness && contact.company ? contact.company : contact.name;
            const slug = encodeURIComponent(this._contactNameSlug(slugName));
            window.history.replaceState(null, null, `${base}/${slug}`);
        }

        this.renderContacts();

        if (!contact) return;

        const detailContainer = document.getElementById("contact-details");
        const isBusiness = ['encyclopedia', 'vancouver'].includes(this.state.currentContactGroup);
        const nameStr = (isBusiness && contact.company) ? contact.company : (contact.name || "Unknown");
        const initial = nameStr.charAt(0).toUpperCase();
        const primaryEmail =
            contact.emails && contact.emails.length > 0
                ? contact.emails[0]
                : "No email";
        const attrEscape = (value) =>
            this._contactFormEscape(value).replace(/'/g, "&#39;");
        const jsArg = (value) => this._contactFormEscape(JSON.stringify(String(value ?? "")));

        // Format dates nicely
        const fmtDate = (ts) => {
            if (!ts) return null;
            const d = new Date(ts);
            const mo = [
                "Jan",
                "Feb",
                "Mar",
                "Apr",
                "May",
                "Jun",
                "Jul",
                "Aug",
                "Sep",
                "Oct",
                "Nov",
                "Dec",
            ];
            const h12 = d.getHours() % 12 || 12;
            const min = String(d.getMinutes()).padStart(2, "0");
            const ap = d.getHours() >= 12 ? "PM" : "AM";
            return `${mo[d.getMonth()]} ${d.getDate()} ${d.getFullYear()} at ${h12}:${min} ${ap}`;
        };

        const addedStr = fmtDate(contact.subscribedAt || contact.createdAt);
        const updatedStr = fmtDate(contact.updatedAt);
        const metaLine = [
            addedStr
                ? `Added ${addedStr}${contact.importSource ? ", via an import" : ""}`
                : null,
            updatedStr ? `Last changed ${updatedStr}` : null,
        ]
            .filter(Boolean)
            .join(" · ");

        // Tags HTML
        const tags = contact.tags || (contact.group ? [contact.group] : []);
        const tagOptions = this._getContactTagOptions(contact);
        const tagsHtml =
            tags
                .map(
                    (tag) => `
            <span class="eo-tag">
                ${this._contactFormEscape(tag)}
                <button class="eo-tag-remove" onclick="App._removeContactTag(${jsArg(contact.id)}, ${jsArg(tag)})" title="Remove tag">×</button>
            </span>
        `,
                )
                .join("") +
            `
            <select class="eo-tag-select" id="eo-tag-select-${attrEscape(contact.id)}" onchange="App._addSelectedContactTag(${jsArg(contact.id)})">
                <option value="">Add tag...</option>
                ${tagOptions
                .map(
                    (tag) =>
                        `<option value="${attrEscape(tag)}">${this._contactFormEscape(tag)}</option>`,
                )
                .join("")}
            </select>`;

        // Status badge
        const status = contact.status || "subscribed";
        const statusClass =
            status === "subscribed"
                ? "eo-status--subscribed"
                : status === "unsubscribed"
                    ? "eo-status--unsubscribed"
                    : "eo-status--pending";

        // Profile fields
        const fields = [
            {
                label: "Status",
                value: `<span class="eo-status ${statusClass}">${status.charAt(0).toUpperCase() + status.slice(1)}</span>`,
                raw: true,
            },
            { label: "Email address", value: primaryEmail },
            {
                label: "First name",
                value: contact.firstName || nameStr.split(" ")[0] || "",
            },
            {
                label: "Last name",
                value: contact.lastName || nameStr.split(" ").slice(1).join(" ") || "",
            },
            contact.phone ? { label: "Phone", value: contact.phone } : null,
            contact.company ? { label: "Company", value: contact.company } : null,
            contact.birthDate
                ? { label: "Birthday", value: contact.birthDate }
                : null,
            contact.position ? { label: "Position", value: this._contactFormEscape(contact.position) } : null,
            this.state.currentContactGroup === 'politicians' && (contact.zodiac || contact.xingzuo)
                ? {
                    label: "Xingzuo",
                    value: `<button class="eo-filter-chip" onclick="App.filterContactsByTagValue('${attrEscape(this.normalizeChineseAstrologyLabel(this.state.currentContactGroup === 'politicians' && (contact.zodiac || contact.xingzuo)))}')">${this._contactFormEscape(this.normalizeChineseAstrologyLabel(this.state.currentContactGroup === 'politicians' && (contact.zodiac || contact.xingzuo)))}</button>`,
                    raw: true,
                }
                : null,
            this.state.currentContactGroup === 'politicians' && (contact.shuxiang || contact.chineseZodiac)
                ? {
                    label: "Shuxiang",
                    value: `<button class="eo-filter-chip" onclick="App.filterContactsByTagValue('${attrEscape(this.normalizeChineseAstrologyLabel(this.state.currentContactGroup === 'politicians' && (contact.shuxiang || contact.chineseZodiac)))}')">${this._contactFormEscape(this.normalizeChineseAstrologyLabel(this.state.currentContactGroup === 'politicians' && (contact.shuxiang || contact.chineseZodiac)))}</button>`,
                    raw: true,
                }
                : null,
            contact.profile ? { label: "Profile", value: contact.profile } : null,
            contact.industry ? { label: "Industry", value: `<button class="eo-filter-chip" onclick="App.filterContactsByTagValue('${attrEscape(contact.industry)}')">${this._contactFormEscape(contact.industry)}</button>`, raw: true } : null,
            contact.foundingYear ? { label: "Founded", value: contact.foundingYear } : null,
            contact.history ? { label: "History", value: `<div style="font-size: 13px; line-height: 1.5; color: #555; max-height: 150px; overflow-y: auto;">${contact.history}</div>`, raw: true } : null,
            contact.salesHistory && contact.salesHistory.length > 0 ? {
                label: "Sales History",
                value: (() => {
                    const revs = contact.salesHistory.map(s => s.revenue);
                    const minRev = Math.min(...revs);
                    const maxRev = Math.max(...revs);
                    const range = (maxRev - minRev) || 1;
                    const W = 380;
                    const H = 60;
                    const len = contact.salesHistory.length;
                    const dx = W / (len <= 1 ? 1 : len - 1);
                    
                    let points = [];
                    contact.salesHistory.forEach((s, i) => {
                        const x = i * dx + 10;
                        const y = H - ((s.revenue - minRev) / range) * (H - 10) + 10;
                        points.push(`${x},${y}`);
                    });
                    
                    let svgLines = `<polyline fill="none" stroke="#a29bfe" stroke-width="3" points="${points.join(' ')}" stroke-linecap="round" stroke-linejoin="round"/>`;
                    let dots = '';
                    let labels = '';
                    let tooltipOverlay = '';
                    
                    contact.salesHistory.forEach((s, i) => {
                        const x = i * dx + 10;
                        const y = H - ((s.revenue - minRev) / range) * (H - 10) + 10;
                        const revStr = '$' + (s.revenue / 1000000).toFixed(1) + 'M';
                        dots += `<circle cx="${x}" cy="${y}" r="4" fill="#fff" stroke="#6c5ce7" stroke-width="2" />`;
                        
                        // Show all years
                        labels += `<text x="${x}" y="${H + 30}" font-size="9" fill="#64748b" text-anchor="middle" font-family="sans-serif">${s.year}</text>`;
                        labels += `<text x="${x}" y="${H + 42}" font-size="8" fill="#a29bfe" text-anchor="middle" font-family="sans-serif" font-weight="600">${revStr}</text>`;
                        
                        // Tooltip rects
                        tooltipOverlay += `<rect x="${x-dx/2}" y="0" width="${dx}" height="${H+50}" fill="transparent" style="cursor:crosshair;" title="${s.year}: ${revStr}" onmouseover="this.parentElement.querySelector('#sales-tt-${i}').setAttribute('opacity','1')" onmouseout="this.parentElement.querySelector('#sales-tt-${i}').setAttribute('opacity','0')" />`;
                        
                        // Tooltip text
                        tooltipOverlay += `<text id="sales-tt-${i}" x="${x}" y="${y-10}" font-size="10" font-weight="bold" fill="#6c5ce7" text-anchor="middle" font-family="sans-serif" opacity="0" pointer-events="none">${revStr}</text>`;
                    });

                    return `
                        <div style="margin-top:20px; padding-bottom:10px; border-bottom:1px solid #e2e8f0; width:100%; max-width:400px; overflow-x:auto;">
                            <div style="font-size:11px; color:#e17055; font-weight:700; margin-bottom:15px; display:inline-block; padding:2px 8px; background:#ffeaa7; border-radius:4px;"><i class="fas fa-magic"></i> AI Estimated Values</div>
                            <svg width="${W+20}" height="${H + 50}" style="overflow:visible; display:block;">
                                ${svgLines}
                                ${dots}
                                ${labels}
                                ${tooltipOverlay}
                            </svg>
                        </div>
                    `;
                })(),
                raw: true
            } : null,

            contact.notes ? { label: "Notes", value: contact.notes } : null,
            contact.ip
                ? {
                    label: "IP Address",
                    value: `<code style="font-family:monospace;font-size:13px;">${contact.ip}</code>`,
                    raw: true,
                }
                : null,
            contact.wikiLink
                ? {
                    label: "Wikipedia",
                    value: this.contactWikiLink(contact, "Open Wikipedia", "inline"),
                    raw: true,
                }
                : null,
            contact.location
                ? {
                    label: "Location",
                    value: `<button class="eo-filter-chip" onclick="App.filterContactsByTagValue('${attrEscape(contact.location)}')">${this._contactFormEscape(contact.location)}</button>`,
                    raw: true,
                }
                : null,
            contact.referWav
                ? {
                    label: "Refer Audio",
                    value: this.contactAudioControls(
                        contact,
                        "referWav",
                        "reference",
                        "Play reference",
                    ),
                    raw: true,
                }
                : null,
            contact.cloneWav
                ? {
                    label: "Clone Audio",
                    value: this.contactAudioControls(
                        contact,
                        "cloneWav",
                        "clone",
                        "Play clone",
                    ),
                    raw: true,
                }
                : null,
            contact.referWav || contact.cloneWav
                ? {
                    label: "Voice Status",
                    value: this.contactVoiceWrongButton(contact),
                    raw: true,
                }
                : null,
            contact.driveFolder
                ? {
                    label: "Drive Folder",
                    value: `<a href="${contact.driveFolder}" target="_blank" style="color:#6c5ce7;text-decoration:none;">Open in Drive <i class="fas fa-external-link-alt" style="font-size:10px;"></i></a>`,
                    raw: true,
                }
                : null,
        ].filter(Boolean);

        const fieldsHtml = fields
            .map(
                (f) => `
            <div class="eo-profile-row">
                <div class="eo-profile-label">${f.label}</div>
                <div class="eo-profile-value">${f.raw ? f.value : f.value || '<span style="color:#bbb">—</span>'}</div>
            </div>`,
            )
            .join("");

        detailContainer.innerHTML = `
            <style>
                /* ── EO Detail Styles ────────────────────────────── */
                #contact-details {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                    background: #fff;
                    display: flex;
                    flex-direction: column;
                    height: 100%;
                    overflow: hidden;
                }
    
                .eo-detail-back {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    padding: 18px 28px 0;
                    color: #6c5ce7;
                    font-size: 13px;
                    font-weight: 500;
                    cursor: pointer;
                    width: fit-content;
                    transition: opacity 0.15s;
                }
                .eo-detail-back:hover { opacity: 0.7; }
    
                .eo-detail-header {
                    padding: 22px 28px 18px;
                    display: flex;
                    align-items: flex-start;
                    gap: 20px;
                    position: relative;
                }
    
                .eo-detail-avatar {
                    width: 72px;
                    height: 72px;
                    border-radius: 50%;
                    background: #e8e4f8;
                    color: #6c5ce7;
                    font-size: 28px;
                    font-weight: 600;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                    border: 2px solid #fff;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                }
    
                .eo-detail-meta {
                    flex: 1;
                    min-width: 0;
                }
    
                .eo-detail-name {
                    font-size: 26px;
                    font-weight: 700;
                    color: #1a1a2e;
                    margin: 0 0 4px;
                    line-height: 1.2;
                }
    
                .eo-detail-added {
                    font-size: 13px;
                    color: #888;
                    margin-bottom: 12px;
                }
    
                .eo-tags-row {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 8px;
                    align-items: center;
                }
    
                .eo-tag {
                    display: inline-flex;
                    align-items: center;
                    gap: 5px;
                    background: #f0eeff;
                    color: #5b4fcf;
                    border: 1px solid #d4ccf5;
                    border-radius: 20px;
                    padding: 3px 10px 3px 12px;
                    font-size: 13px;
                    font-weight: 500;
                }
    
                .eo-tag-remove {
                    background: none;
                    border: none;
                    color: #8b7fd4;
                    cursor: pointer;
                    font-size: 15px;
                    line-height: 1;
                    padding: 0;
                    display: flex;
                    align-items: center;
                }
                .eo-tag-remove:hover { color: #e53e3e; }
    
                .eo-tag-add {
                    display: inline-flex;
                    align-items: center;
                    gap: 5px;
                    background: none;
                    border: 1.5px dashed #c8bff5;
                    color: #8b7fd4;
                    border-radius: 20px;
                    padding: 3px 12px;
                    font-size: 13px;
                    cursor: pointer;
                    transition: all 0.15s;
                }
                .eo-tag-add:hover { border-color: #6c5ce7; color: #6c5ce7; }

                .eo-tag-select {
                    min-width: 130px;
                    max-width: 220px;
                    border: 1.5px solid #d8d3f4;
                    border-radius: 20px;
                    background: #fff;
                    color: #5b4fcf;
                    padding: 4px 28px 4px 12px;
                    font-size: 13px;
                    font-weight: 500;
                    outline: none;
                    cursor: pointer;
                }
                .eo-tag-select:focus { border-color: #6c5ce7; box-shadow: 0 0 0 2px rgba(108,92,231,.12); }
    
                .eo-detail-delete {
                    position: absolute;
                    top: 22px;
                    right: 28px;
                    display: flex;
                    align-items: center;
                    gap: 7px;
                    background: #fff;
                    border: 1.5px solid #e5e5e5;
                    border-radius: 8px;
                    padding: 8px 16px;
                    font-size: 13px;
                    font-weight: 500;
                    color: #444;
                    cursor: pointer;
                    transition: all 0.15s;
                }
                .eo-detail-delete:hover { border-color: #e53e3e; color: #e53e3e; }

                .eo-detail-actions {
                    position: absolute;
                    top: 22px;
                    right: 28px;
                    display: flex;
                    gap: 8px;
                    align-items: center;
                }

                .eo-detail-actions .eo-detail-delete {
                    position: static;
                }
    
                .eo-detail-divider {
                    height: 1px;
                    background: #f0f0f0;
                    margin: 0 28px;
                }
    
                /* Two-column layout with stacked left */
                .eo-detail-body {
                    display: grid;
                    grid-template-columns: 1fr 480px;
                    gap: 0;
                    flex: 1;
                    min-height: 0;
                }
                
                .eo-left-column {
                    display: flex;
                    flex-direction: column;
                    border-right: 1px solid #f0f0f0;
                    min-height: 0;
                }
    
                /* Map column */
                .eo-map-section {
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    background: #f0f2f8;
                    height: 260px;
                    border-top: 1px solid #f0f0f0;
                    flex-shrink: 0;
                    margin-top: auto;
                    position: sticky;
                    bottom: 0;
                    z-index: 10;
                }
                .eo-map-section-title {
                    font-size: 11px;
                    font-weight: 800;
                    color: #94a3b8;
                    text-transform: uppercase;
                    letter-spacing: .08em;
                    padding: 14px 14px 6px;
                    flex-shrink: 0;
                }
                #life-map {
                    flex: 1;
                    min-height: 0;
                    z-index: 0;
                }
    
                /* Profile column */
                .eo-profile-section {
                    padding: 24px 28px;
                }
    
                .eo-profile-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 20px;
                }
    
                .eo-profile-title {
                    font-size: 16px;
                    font-weight: 700;
                    color: #1a1a2e;
                }
    
                .eo-profile-edit {
                    display: flex;
                    align-items: center;
                    gap: 5px;
                    color: #6c5ce7;
                    font-size: 13px;
                    font-weight: 500;
                    cursor: pointer;
                    background: none;
                    border: none;
                    padding: 0;
                    transition: opacity 0.15s;
                }
                .eo-profile-edit:hover { opacity: 0.7; }
    
                .eo-profile-row {
                    display: grid;
                    grid-template-columns: 140px 1fr;
                    gap: 12px;
                    padding: 13px 0;
                    border-bottom: 1px solid #f7f7f7;
                    align-items: center;
                }
                .eo-profile-row:last-child { border-bottom: none; }
    
                .eo-profile-label {
                    font-size: 13px;
                    font-weight: 500;
                    color: #888;
                }
    
                .eo-profile-value {
                    font-size: 14px;
                    color: #1a1a2e;
                    word-break: break-word;
                }
    
                /* Status badge */
                .eo-status {
                    display: inline-block;
                    padding: 4px 12px;
                    border-radius: 20px;
                    font-size: 13px;
                    font-weight: 600;
                }
                .eo-status--subscribed   { background: #d4f7e7; color: #1a7a4a; }
                .eo-status--unsubscribed { background: #fde8e8; color: #c0392b; }
                .eo-status--pending      { background: #fff3cd; color: #856404; }
    
                /* Activity column */
                .eo-activity-section {
                    padding: 24px 24px;
                }
    
                .eo-activity-title {
                    font-size: 16px;
                    font-weight: 700;
                    color: #1a1a2e;
                    margin-bottom: 20px;
                }
    
                .eo-timeline {
                    position: relative;
                }
    
                .eo-timeline-item {
                    display: flex;
                    gap: 14px;
                    margin-bottom: 18px;
                    position: relative;
                }
    
                .eo-timeline-dot {
                    width: 10px;
                    height: 10px;
                    border-radius: 50%;
                    background: #6c5ce7;
                    flex-shrink: 0;
                    margin-top: 4px;
                }
    
                .eo-timeline-dot--sent   { background: #6c5ce7; }
                .eo-timeline-dot--open   { background: #00b894; }
                .eo-timeline-dot--click  { background: #0984e3; }
                .eo-timeline-dot--bounce { background: #e17055; }
    
                .eo-timeline-content { flex: 1; }
    
                .eo-timeline-date {
                    font-size: 13px;
                    font-weight: 700;
                    color: #1a1a2e;
                    margin-bottom: 4px;
                }
    
                .eo-timeline-events { }
    
                .eo-timeline-event {
                    font-size: 13px;
                    color: #555;
                    margin-bottom: 3px;
                    line-height: 1.5;
                }
    
                .eo-timeline-event a,
                .eo-timeline-link {
                    color: #6c5ce7;
                    text-decoration: none;
                    font-weight: 500;
                    cursor: pointer;
                }
                .eo-timeline-link:hover { text-decoration: underline; }
    
                .eo-activity-empty {
                    color: #aaa;
                    font-size: 13px;
                    font-style: italic;
                }
    
                /* Compose action */
                .eo-compose-btn {
                    margin-top: 16px;
                    width: 100%;
                    padding: 10px;
                    background: #6c5ce7;
                    color: #fff;
                    border: none;
                    border-radius: 8px;
                    font-size: 14px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: background 0.15s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                }
                .eo-compose-btn:hover { background: #5b4fcf; }

                .eo-wiki-button,
                .eo-wiki-inline {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                    border: 1px solid #d8d3f4;
                    background: #fff;
                    color: #4f46b8;
                    border-radius: 6px;
                    padding: 6px 9px;
                    font-size: 12px;
                    font-weight: 600;
                    line-height: 1.2;
                    text-decoration: none;
                    white-space: nowrap;
                }
                .eo-wiki-button:hover,
                .eo-wiki-inline:hover {
                    background: #f5f3ff;
                    border-color: #bcb3ec;
                    color: #3f35a8;
                    text-decoration: none;
                }
                .eo-wiki-inline {
                    padding: 7px 11px;
                    font-size: 13px;
                }
                .eo-social-btn {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 4px;
                    border: 1px solid #d8d3f4;
                    background: #fff;
                    color: #4f46b8;
                    border-radius: 6px;
                    padding: 4px 6px;
                    font-size: 10px;
                    font-weight: 600;
                    line-height: 1.2;
                    text-decoration: none;
                    white-space: nowrap;
                }
                .eo-social-btn:hover {
                    background: #f5f3ff;
                    border-color: #bcb3ec;
                    color: #3f35a8;
                    text-decoration: none;
                }
                .eo-activity-event-row {
                    transition: background-color 0.2s;
                    cursor: pointer;
                }
                .eo-activity-event-row:hover .eo-activity-event-text,
                .eo-activity-event-row.expanded .eo-activity-event-text {
                    white-space: normal !important;
                    overflow: visible !important;
                    text-overflow: clip !important;
                }
            </style>
    
            <!-- Scrollable Container -->
            <div style="flex: 1; overflow-y: auto; display: flex; flex-direction: column; min-height: 0;">
                <!-- Header -->
                ${(() => {
                const isBusiness = ['encyclopedia', 'vancouver'].includes(this.state.currentContactGroup);
                const routeBase = isBusiness ? `#${this.state.currentContactGroup}` : '#politicians';
                const slugName = isBusiness && contact.company ? contact.company : contact.name;
                const headerUrl = `${routeBase}/${(slugName || "").replace(/\s+/g, '_')}`;
                
                let siteUrl = null;
                if (isBusiness && contact.emails && contact.emails.length > 0) {
                    siteUrl = contact.emails[0].startsWith('http') ? contact.emails[0] : 'http://' + contact.emails[0];
                }
                const hasBanner = true;
                
                // If we have a local screenshot (or valid image), use it as background
                let bgStyle = 'background:linear-gradient(135deg, #6c5ce7, #a29bfe);';
                if (contact.coverImage && contact.coverImage.startsWith('/images/')) {
                    bgStyle = `background: url('${encodeURI(contact.coverImage)}') center 0% / cover no-repeat;`;
                }

                return `
                        <div style="width:100%;height:160px;position:relative;overflow:hidden;${bgStyle}color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:34px;flex-shrink:0;box-shadow:inset 0 0 50px rgba(0,0,0,0.2);">
                            ${!contact.coverImage || !contact.coverImage.startsWith('/images/') ? `<span style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;opacity:0.2;font-size:120px;">${this.contactInitials(contact)}</span>` : ''}
                            ${siteUrl ? 
                                `<div style="z-index:2;display:flex;gap:12px;">
                                    <a href="${siteUrl}" target="_blank" style="background:rgba(0,0,0,0.6);backdrop-filter:blur(4px);padding:10px 24px;border-radius:30px;color:#fff;text-decoration:none;font-size:16px;display:flex;align-items:center;gap:8px;border:1px solid rgba(255,255,255,0.2);transition:background 0.2s;" onmouseover="this.style.background='rgba(0,0,0,0.8)';" onmouseout="this.style.background='rgba(0,0,0,0.6)';">
                                        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                                        Open Website
                                    </a>
                                    <button onclick="App.triggerScreenshot('${siteUrl}', '${slugName.replace(/'/g, "\\'")}', '${contact.id}'); this.innerHTML='Capturing...'; this.disabled=true;" style="cursor:pointer;background:rgba(255,255,255,0.2);backdrop-filter:blur(4px);padding:10px 24px;border-radius:30px;color:#fff;font-size:16px;display:flex;align-items:center;gap:8px;border:1px solid rgba(255,255,255,0.4);transition:background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.3)';" onmouseout="this.style.background='rgba(255,255,255,0.2)';">
                                        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                                        Capture Site
                                    </button>
                                </div>` : 
                                `<span style="z-index:2;text-shadow:0 2px 10px rgba(0,0,0,0.5);">${nameStr}</span>`
                            }
                        </div>
                        <div class="eo-detail-header" style="${hasBanner ? "margin-top: -30px;" : ""}">
                            <a href="${headerUrl}" target="_blank" style="display:inline-block; position:relative; z-index:2; text-decoration:none; border-radius:50%; transition:transform 0.2s;" onmouseover="this.style.transform='scale(1.05)';" onmouseout="this.style.transform='';">
                                ${this.contactAvatarHtml(contact, 72, "eo-detail-avatar")}
                            </a>
                            <div class="eo-detail-meta" style="${hasBanner ? "margin-top: 30px;" : ""}">
                    `;
            })()}
                        <h2 class="eo-detail-name">${nameStr}</h2>
                        ${metaLine ? `<div class="eo-detail-added">${metaLine}</div>` : ""}
                        <div class="eo-tags-row">${tagsHtml}</div>
                    </div>
                </div>
        
                <div class="eo-detail-divider"></div>
        
                <!-- Body: Profile + Activity -->
                <div class="eo-detail-body">
    
                <div class="eo-left-column">
                <!-- Profile -->
                <div class="eo-profile-section">
                    <div class="eo-profile-header">
                        <span class="eo-profile-title">Profile</span>
                    </div>
                    <div class="eo-profile-fields">
                        ${fieldsHtml}
                        ${contact.emails && contact.emails.length > 1
                ? contact.emails
                    .slice(1)
                    .map(
                        (e) => `
                        <div class="eo-profile-row">
                            <div class="eo-profile-label">Additional email</div>
                            <div class="eo-profile-value">${e}</div>
                        </div>`,
                    )
                    .join("")
                : ""
            }
                    </div>
    
                    <button class="eo-compose-btn" onclick="App.composeTo('${primaryEmail}')">
                        <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                            <path d="M13 7.5L2 2l2 5.5-2 5.5 11-5.5z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
                        </svg>
                        Send email
                    </button>
                </div>
                
                <!-- News Section -->
                <div class="eo-news-section" id="eo-news-section-${contact.id}" style="padding: 24px 28px; border-top: 1px solid #f0f0f0;">
                    <div class="eo-profile-header" style="margin-bottom: 12px;">
                        <span class="eo-profile-title" style="font-size: 14px; color: #6c5ce7;"><i class="fas fa-chart-line"></i> Google Trends</span>
                    </div>
                    <div id="contact-news-content-${contact.id}" style="font-size: 13px; color: #444; line-height: 1.5;">
                        <button onclick="App.collectNews('${contact.id}')" style="background:none;border:none;color:#0ea5e9;cursor:pointer;padding:0;font-weight:600;font-size:13px;">Click "Trends" to fetch trending data.</button>
                    </div>
                </div>
    
                <!-- Life Map -->
                <div class="eo-map-section" style="height: 140px; display: flex; flex-direction: column;">
                    <div id="life-map"></div>
                </div>
                </div> <!-- End Left Column -->
    
                <!-- Recent Activity -->
                <div class="eo-activity-section">
                    <div id="contact-activity-timeline" class="eo-timeline">
                        <div class="eo-activity-empty">Loading activity…</div>
                    </div>
                </div>
    
            </div>
            </div> <!-- End Scrollable Container -->
            
            <!-- Bottom Actions -->
            <div style="flex-shrink:0;border-top:1px solid #f0f0f0;background:#faf9ff;box-shadow:0 -2px 10px rgba(0,0,0,0.05);">
            <div id="life-timeline-bar"></div>
            <div class="eo-detail-bottom-actions" style="display:flex;justify-content:space-between;align-items:center;padding:12px 28px;">
                <div class="eo-detail-back" onclick="App.filterContactsByGroup(App.state.currentContactGroup)" style="padding:0;display:flex;align-items:center;gap:6px;cursor:pointer;color:#6c5ce7;font-weight:600;font-size:14px;">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M9 2L4 7l5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    ${this.state.currentContactGroup.charAt(0).toUpperCase() + this.state.currentContactGroup.slice(1)}
                </div>
                <div class="eo-detail-actions" style="position:static;display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;">
                    ${isBusiness ? `
                    <button class="eo-detail-delete" id="sync-company-btn-${contact.id}" style="position:static;background:linear-gradient(135deg,#6c5ce7,#a29bfe);color:#fff;border-color:#6c5ce7;font-weight:600;" onclick="App.syncSpecificCompany('${attrEscape(nameStr)}')">
                        <i class="fas fa-sync" style="font-size:12px;"></i>
                        Sync Company Data
                    </button>
                    ` : ''}
                    <button class="eo-detail-delete" id="collect-news-btn-${contact.id}" style="position:static;background:linear-gradient(135deg,#0ea5e9,#6366f1);color:#fff;border-color:#0ea5e9;font-weight:600;" onclick="App.collectNews('${contact.id}')">
                        <i class="fas fa-chart-line" style="font-size:12px;"></i>
                        Trends
                    </button>
                    ${this.contactSocialLinks(contact)}
                    ${this.contactWikiLink(contact)}
                    <button class="eo-detail-delete" style="position:static;" onclick="App.editContact('${contact.id}')">
                        Edit
                    </button>
                    <button class="eo-detail-delete" style="position:static;" onclick="App.fixMissingPoliticianFields('${contact.id}')">
                        <i class="fas fa-magic"></i> Fix fields
                    </button>
                    <button class="eo-detail-delete" style="position:static;" onclick="App.deleteContact('${contact.id}')">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path d="M2 3.5h10M5.5 3.5V2.5a.5.5 0 01.5-.5h2a.5.5 0 01.5.5v1M5 3.5l.5 8M9 3.5l-.5 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                        </svg>
                        Delete
                    </button>
                </div>
            </div>
            </div>`;

        // Autoload news if available
        this._autoloadNews(contact.id);

        // Build activity timeline from related emails
        setTimeout(async () => {
            if (this.state._detailRenderId !== renderId) return;
            const timelineEl = document.getElementById("contact-activity-timeline");
            if (!timelineEl) return;

            const contactEmailsLower = (contact.emails || []).map((e) =>
                e.toLowerCase(),
            );
            let relatedEmails = [];

            if (contactEmailsLower.length > 0) {
                relatedEmails = (this.state.emails || []).filter((email) => {
                    let fromStr = typeof email.from === 'string' ? email.from : (email.from && email.from.email ? email.from.email : '');
                    const fromMatch = fromStr && contactEmailsLower.includes(fromStr.toLowerCase());
                    const toMatch =
                        email.to && Array.isArray(email.to) &&
                        email.to.some(
                            (t) =>
                                t && t.email && typeof t.email === 'string' && contactEmailsLower.includes(t.email.toLowerCase()),
                        );
                    return fromMatch || toMatch;
                });
                relatedEmails.sort((a, b) => new Date(b.date) - new Date(a.date));
                relatedEmails = relatedEmails.slice(0, 30);
            }

            let domainAndWaybackHtml = '';
            if (contact.domainInfo) {
                domainAndWaybackHtml += `
                    <div style="margin-bottom: 24px;">
                        <div class="eo-activity-title" style="margin-bottom: 12px; font-size: 14px; color: #6c5ce7; display: flex; align-items: center; gap: 8px;">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"></path></svg>
                            Domain WHOIS
                        </div>
                        <div style="font-size: 13px; line-height: 1.5; color: #555; background:#fff; padding: 14px; border-radius: 8px; border: 1px solid #e2e8f0;">
                            <div style="display:flex; justify-content:space-between; margin-bottom: 6px;">
                                <span style="color:#64748b;">Registrar:</span>
                                <span style="font-weight:600; color:#1e293b;">${this._contactFormEscape(contact.domainInfo.registrar || 'Unknown')}</span>
                            </div>
                            <div style="display:flex; justify-content:space-between; margin-bottom: 6px;">
                                <span style="color:#64748b;">Registered:</span>
                                <span style="font-weight:600; color:#1e293b;">${this._contactFormEscape(contact.domainInfo.registeredDate || 'Unknown')}</span>
                            </div>
                            <div style="display:flex; justify-content:space-between; align-items:center;">
                                <span style="color:#64748b;">Owner:</span>
                                <span style="background:#f1f5f9; padding:2px 8px; border-radius:4px; font-size:11px; color:#475569; font-weight:600; border:1px solid #e2e8f0;">${this._contactFormEscape(contact.domainInfo.ownerName || 'Redacted')}</span>
                            </div>
                        </div>
                    </div>
                `;
            }
            if (contact.waybackHistory && contact.waybackHistory.totalSnapshots > 0) {
                domainAndWaybackHtml += `
                    <div style="margin-bottom: 24px;">
                        <div class="eo-activity-title" style="margin-bottom: 12px; font-size: 14px; color: #6c5ce7; display: flex; align-items: center; gap: 8px;">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            Website History
                        </div>
                        <div style="font-size: 13px; line-height: 1.5; color: #555; background:#faf9ff; padding: 14px; border-radius: 8px; border: 1px solid #e2e8f0;">
                            <div style="display:flex; justify-content:space-between; margin-bottom: 6px;">
                                <span style="color:#64748b;">Total Snapshots:</span>
                                <span style="font-weight:600; color:#1e293b;">${contact.waybackHistory.totalSnapshots}</span>
                            </div>
                            <div style="display:flex; justify-content:space-between; margin-bottom: 6px;">
                                <span style="color:#64748b;">First Seen:</span>
                                <span style="font-weight:600; color:#1e293b;">${this._contactFormEscape(contact.waybackHistory.firstSnapshot || 'N/A')}</span>
                            </div>
                            <div style="display:flex; justify-content:space-between;">
                                <span style="color:#64748b;">Last Updated:</span>
                                <span style="font-weight:600; color:#1e293b;">${this._contactFormEscape(contact.waybackHistory.lastSnapshot || 'N/A')}</span>
                            </div>
                        </div>
                    </div>
                `;
            }

            let visualTimelineHtml = '';
            if (contact.waybackHistory && contact.waybackHistory.snapshots && contact.waybackHistory.snapshots.length > 0) {
                visualTimelineHtml = `
                    <div style="margin-top: 24px; padding: 14px; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px;">
                        <div style="font-size: 12px; font-weight: bold; margin-bottom: 12px; color: #475569; display:flex; align-items:center; gap:6px;">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                            Visual Timeline
                        </div>
                        <div style="display: flex; gap: 12px; overflow-x: auto; padding-bottom: 8px; scrollbar-width: thin;">
                            ${contact.waybackHistory.snapshots.map(s => {
                                const siteMatch = s.url.match(/https?:\/\/(?:www\.)?([^/]+)/g);
                                let domainStr = siteMatch && siteMatch.length > 1 ? siteMatch[1] : '';
                                domainStr = domainStr.replace(/^https?:\/\/(?:www\.)?/, '').replace(/\./g, '_');
                                const localImgSrc = `/images/screenshots/wayback/${domainStr}_${s.year}.jpg`;
                                const mshotsUrl = `https://s.wordpress.com/mshots/v1/${encodeURIComponent(s.url)}?w=480`;
                                
                                return `
                                <a href="${s.url}" target="_blank" style="text-decoration:none; flex-shrink: 0; width: 120px; text-align: center; display:block; transition:transform 0.2s;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
                                    <div style="width: 120px; height: 90px; border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden; position: relative; background: #f1f5f9; box-shadow:0 2px 4px rgba(0,0,0,0.05);">
                                        <img src="${localImgSrc}" style="width: 100%; height: 100%; object-fit: cover; border: none; background:#fff;" onerror="if(this.src!=='${mshotsUrl}') { this.src='${mshotsUrl}'; } else { this.onerror=null; this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMjAiIGhlaWdodD0iOTAiIGZpbGw9IiNmMThmOTgiPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiNmMThmOTgiIC8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjEycHgiIGZpbGw9IiM5NDE5NDciIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBJbWFnZTwvdGV4dD48L3N2Zz4='; }">
                                    </div>
                                    <div style="font-size: 12px; font-weight: 600; color: #6c5ce7; margin-top: 8px;">${s.year}</div>
                                </a>
                                `;
                            }).join('')}
                        </div>
                    </div>
                `;
            }

            let html = domainAndWaybackHtml;
            let overviewSectionHtml = "";   // declared here so injection points outside if(recentActivityText) can see it
            let recentActivityText = contact.recentActivity || contact.history;
            let milestoneMap = {};

            if (recentActivityText && recentActivityText.startsWith('file:')) {
                try {
                    const nameSlug = (contact.name || '').replace(/\s+/g, '_');
                    const mapRes = await fetch(`/images/politicians/${encodeURIComponent(nameSlug)}/milestone_map.json?t=${Date.now()}`);
                    if (mapRes.ok) {
                        milestoneMap = await mapRes.json();
                    }
                } catch (e) {
                    console.warn("Error loading milestone map:", e);
                }
                try {
                    const res = await fetch(`/config/contact-lists/${recentActivityText.substring(5)}?t=${Date.now()}`);
                    if (res.ok) {
                        const buffer = await res.arrayBuffer();
                        recentActivityText = new TextDecoder('utf-8').decode(buffer);
                    } else {
                        recentActivityText = "";
                        console.warn("Failed to load recent activity file");
                    }
                } catch (e) {
                    console.warn("Error loading recent activity file:", e);
                    recentActivityText = "";
                }
            }

            if (this.state._detailRenderId !== renderId) return;

            // Generate structured timeline for businesses to utilize the existing politician timeline UI
            if (contact.salesHistory && contact.salesHistory.length > 0) {
                let newText = '';
                if (!recentActivityText || recentActivityText.includes('placeholder')) {
                    newText += `[Company Overview]\n`;
                    newText += `Overview: ${contact.company || contact.name} is an established business in the ${contact.industry || 'various'} sector, located in ${contact.city || 'its region'}.\n`;
                } else {
                    newText += `[Company Overview]\n${recentActivityText}\n`;
                }

                let hasDigitalPresence = false;
                let dpText = `[Digital Presence]\n`;
                if (contact.domainInfo && contact.domainInfo.registeredDate && contact.domainInfo.registeredDate !== 'Unknown') {
                    const year = contact.domainInfo.registeredDate.split('-')[0];
                    dpText += `${year}: Registered domain with ${contact.domainInfo.registrar}\n`;
                    hasDigitalPresence = true;
                }
                if (contact.waybackHistory && contact.waybackHistory.snapshots) {
                    contact.waybackHistory.snapshots.forEach(s => {
                        dpText += `${s.year}: Website archival snapshot captured by Wayback Machine\n`;
                    });
                    hasDigitalPresence = true;
                }
                if (hasDigitalPresence) {
                    newText += dpText;
                }

                newText += `[Financial History]\n`;
                contact.salesHistory.forEach(s => {
                    const rev = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(s.revenue);
                    newText += `${s.year}: Generated annual revenue of ${rev}\n`;
                });

                recentActivityText = newText;
            }

            if (recentActivityText) {
                const lines = recentActivityText.split(/\r?\n|\\n/);
                const wikiGroups = {};

                // Add birth date as the first event in the "Overview" section if available
                if (contact.birthDate || contact.birthday || contact.foundingYear) {
                    const isChinese = /[\u4e00-\u9fa5]/.test(recentActivityText);
                    const birthGroup = isChinese ? '概述' : 'Overview';
                    const isBusiness = contact.industry && (contact.industry === 'Furniture' || contact.industry === 'Office Furniture' || contact.industry === 'Business');
                    let birthEvent = isChinese ? '出生' : 'Born';
                    if (isBusiness) birthEvent = isChinese ? '成立' : 'Founded';
                    
                    wikiGroups[birthGroup] = [{
                        dateStr: contact.birthDate || contact.birthday || contact.foundingYear,
                        event: birthEvent,
                        isBirth: true
                    }];
                }

                let currentAIGroup = 'Overview';
                lines.forEach(line => {
                    line = line.trim();
                    if (!line) return;
                    
                    const aiHeaderMatch = line.match(/^\[(.*?)\]:?$/);
                    if (aiHeaderMatch) {
                        currentAIGroup = aiHeaderMatch[1];
                        return;
                    }

                    const match = line.match(/^\[(.*?)\]\s*(.*)$/);
                    let group = currentAIGroup;
                    let content = line;
                    if (match) {
                        group = match[1];
                        content = match[2];
                    }

                    // Remove leading dash/bullet if present for AI text
                    content = content.replace(/^-\s*/, '');
                    // Remove leading colon if present
                    content = content.replace(/^:\s*/, '');
                    // Strip markdown image references (especially base64 data URIs)
                    content = content.replace(/!\[.*?\]\(data:[^)]+\)/g, '');
                    content = content.replace(/!\[.*?\]\(https?:[^)]+\)/g, '');
                    content = content.trim();
                    if (!content) return;

                    let dateStr = "";
                    let event = content;

                    // Support for YYYY.MM:, YYYY:, YY.MM-DD:, 2026年1月:, etc.
                    const dateMatch = content.match(/^([^:]{2,15}):\s*(.*)$/);
                    if (dateMatch) {
                        dateStr = dateMatch[1].trim();
                        event = dateMatch[2];
                    }

                    if (!wikiGroups[group]) wikiGroups[group] = [];
                    wikiGroups[group].push({ dateStr, event });
                });


                // Stripe palette: alternating tinted backgrounds
                const stripeColors = [
                    { bg: '#f5f3ff', accent: '#6c5ce7' },
                    { bg: '#ecfdf5', accent: '#00b894' },
                    { bg: '#fdf2f8', accent: '#e84393' },
                    { bg: '#eff6ff', accent: '#0984e3' },
                    { bg: '#fffbeb', accent: '#d97706' },
                    { bg: '#fef2f2', accent: '#d63031' },
                    { bg: '#f0fdfa', accent: '#00cec9' },
                    { bg: '#faf5ff', accent: '#8b5cf6' },
                ];
                // ── Split year-keyed groups from wiki section groups ──────────────────
                const yearSummaryGroups = {};  // keys: "2016", "2026.01", etc.
                const wikiSectionGroups = {};  // keys: "Overview 1", "Early life...", etc.

                Object.entries(wikiGroups).forEach(([groupName, events]) => {
                    if (/^((?:18|19|20)\d{2})(\.\d{2})?$/.test(groupName.trim())) {
                        yearSummaryGroups[groupName] = events;
                    } else {
                        wikiSectionGroups[groupName] = events;
                    }
                });

                // ── Build groupColorMap for ALL groups (used by timeline below) ───────
                const groupColorMap = {};
                let gcIdx = 0;
                Object.keys(wikiSectionGroups).forEach(gn => {
                    groupColorMap[gn] = stripeColors[gcIdx % stripeColors.length].accent;
                    gcIdx++;
                });
                Object.keys(yearSummaryGroups).forEach(yk => {
                    const yr = parseFloat(yk);
                    if (yr >= 2025) groupColorMap[yk] = '#ef4444';
                    else if (yr >= 2017) groupColorMap[yk] = '#0984e3';
                    else if (yr >= 2000) groupColorMap[yk] = '#00b894';
                    else groupColorMap[yk] = '#d97706';
                });

                // ── Render wiki section groups → overviewSectionHtml (collapsible) ────
                overviewSectionHtml = '';
                let sIdx = 0;
                Object.entries(wikiSectionGroups).forEach(([groupName, events]) => {
                    const stripe = stripeColors[sIdx % stripeColors.length];
                    sIdx++;

                    const byMonth = {};
                    events.forEach(e => {
                        let ymKey = '—';
                        if (e.dateStr) {
                            const yyyyMm = e.dateStr.match(/((?:18|19|20)\d{2})[.\-](\d{2})/);
                            const yyyyOnly = e.dateStr.match(/((?:18|19|20)\d{2})/);
                            const chineseDate = e.dateStr.match(/((?:18|19|20)\d{2})年(\d{1,2})月/);
                            if (yyyyMm) ymKey = `${yyyyMm[1]}.${yyyyMm[2].padStart(2, '0')}`;
                            else if (chineseDate) ymKey = `${chineseDate[1]}.${chineseDate[2].padStart(2, '0')}`;
                            else if (yyyyOnly) ymKey = yyyyOnly[1];
                            else ymKey = e.dateStr;
                        } else {
                            const ty = e.event.match(/((?:18|19|20)\d{2})/);
                            if (ty) ymKey = ty[1];
                        }
                        if (!byMonth[ymKey]) byMonth[ymKey] = [];
                        byMonth[ymKey].push(e.event);
                    });

                    const monthKeys = Object.keys(byMonth).sort();
                    const previewText = (byMonth[monthKeys[0]] || []).join(' · ').substring(0, 80);
                    const monthRowsHtml = monthKeys.map(ym => `
                        <div style="display:flex;gap:10px;padding:7px 14px 7px 18px;
                                    border-bottom:1px solid ${stripe.accent}18;align-items:baseline;background:#fff;">
                            <span style="font-size:11px;font-weight:800;color:${stripe.accent};
                                         min-width:58px;flex-shrink:0;">${App._contactFormEscape(ym)}</span>
                            <span style="font-size:12px;color:#444;line-height:1.5;word-break:break-word;">
                                ${App._contactFormEscape(byMonth[ym].join(' · '))}
                            </span>
                        </div>`).join('');

                    overviewSectionHtml += `
                        <div class="eo-activity-event-row" data-group="${App._contactFormEscape(groupName)}"
                             style="margin-bottom:3px;border-radius:6px;overflow:hidden;
                                    border-left:4px solid ${stripe.accent};">
                            <div style="display:flex;align-items:center;gap:10px;padding:9px 14px;
                                        background:${stripe.bg};cursor:pointer;"
                                 onclick="(function(el){
                                     var b=el.nextElementSibling;
                                     var c=el.querySelector('.ov-chev');
                                     var o=b.style.display!=='none';
                                     b.style.display=o?'none':'block';
                                     c.style.transform=o?'':'rotate(180deg)';
                                 })(this)">
                                <span style="color:${stripe.accent};font-weight:700;font-size:13px;
                                             white-space:nowrap;min-width:90px;flex-shrink:0;">
                                    ${App._contactFormEscape(groupName)}
                                </span>
                                <span style="font-size:12px;color:#777;flex:1;overflow:hidden;
                                             text-overflow:ellipsis;white-space:nowrap;">
                                    ${App._contactFormEscape(previewText)}${previewText.length >= 80 ? '…' : ''}
                                </span>
                                <span style="font-size:10px;color:${stripe.accent};background:${stripe.accent}18;
                                             border-radius:10px;padding:1px 7px;white-space:nowrap;flex-shrink:0;">
                                    ${monthKeys.length} ${monthKeys.length === 1 ? 'entry' : 'entries'}
                                </span>
                                <span class="ov-chev" style="color:${stripe.accent};font-size:11px;
                                             flex-shrink:0;transition:transform 0.2s;">▾</span>
                            </div>
                            <div style="display:none;border-top:1px solid ${stripe.accent}22;">
                                ${monthRowsHtml}
                            </div>
                        </div>`;
                });

                // ── Render year-keyed groups → vertical chronological timeline ─────────
                const yearKeys = Object.keys(yearSummaryGroups).sort((a, b) => parseFloat(a) - parseFloat(b));
                if (yearKeys.length > 0) {
                    const now = new Date();
                    let yearTimelineHtml = '';
                    yearKeys.forEach(yk => {
                        const text = yearSummaryGroups[yk].map(e => e.event).join(' ');
                        const dotColor = groupColorMap[yk];
                        const yr = Math.floor(parseFloat(yk));
                        const mo = Math.round((parseFloat(yk) % 1) * 100) || 0;
                        const isFuture = yr > now.getFullYear() ||
                            (yr === now.getFullYear() && mo > now.getMonth() + 1);

                        yearTimelineHtml += `
                            <div class="eo-activity-event-row" data-group="${App._contactFormEscape(yk)}"
                                 style="display:flex;gap:12px;padding:8px 0;align-items:flex-start;
                                        border-bottom:1px solid #f5f5f5;
                                        ${isFuture ? 'opacity:0.5;' : ''}"
                                 onclick="this.classList.toggle('expanded')">
                                <div style="display:flex;flex-direction:column;align-items:center;
                                            flex-shrink:0;padding-top:3px;">
                                    <div style="width:9px;height:9px;border-radius:50%;flex-shrink:0;
                                                ${isFuture
                                ? `border:2px dashed ${dotColor};background:transparent;`
                                : `background:${dotColor};`}">
                                    </div>
                                    <div style="width:1px;flex:1;min-height:12px;
                                                background:${dotColor}30;margin-top:3px;"></div>
                                </div>
                                <div style="flex:1;min-width:0;padding-bottom:8px;">
                                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:3px;">
                                        <span style="font-size:12px;font-weight:800;color:${dotColor};
                                                     white-space:nowrap;">${App._contactFormEscape(yk)}</span>
                                        ${isFuture ? `<span style="font-size:9px;color:#94a3b8;background:#f1f5f9;
                                            border-radius:8px;padding:1px 6px;font-weight:600;">predicted</span>` : ''}
                                    </div>
                                    <div class="eo-activity-event-text"
                                         style="font-size:12px;color:#444;line-height:1.5;
                                                overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                                        ${App._contactFormEscape(text)}
                                    </div>
                                </div>
                            </div>`;
                    });

                    overviewSectionHtml += `
                        <div style="margin-top:16px;border-top:1px solid #f0f0f0;padding-top:14px;">
                            <div style="font-size:13px;font-weight:700;color:#1a1a2e;margin-bottom:10px;
                                        display:flex;align-items:center;gap:6px;">
                                <span style="width:8px;height:8px;border-radius:50%;background:#6c5ce7;
                                             display:inline-block;"></span>
                                Year by year
                            </div>
                            <div style="padding-left:4px;">${yearTimelineHtml}</div>
                        </div>`;
                }

                // Calculate Life Timeline
                let birthYearStr = contact.birthDate || contact.birthday || contact.foundingYear || "";
                let birthYearMatch = birthYearStr.match(/(18|19|20)\d{2}/);
                let birthYear = birthYearMatch ? parseInt(birthYearMatch[0]) : null;

                let timelineEvents = [];
                let deathYear = null;
                if (!birthYear && recentActivityText) {
                    const firstBornYearMatch = recentActivityText.match(/(18|19|20)\d{2}年/);
                    if (firstBornYearMatch) birthYear = parseInt(firstBornYearMatch[0]);
                }
                // Detect death year from activity text patterns like "1868年—1895年" or "died 1895"
                if (recentActivityText && birthYear) {
                    // Pattern: birth年—death年 or birth年～death年 or birth-death
                    const deathPatterns = [
                        new RegExp(birthYear + '年[^\\n，。;；）)]*?[—\\-–~～](\\d{4})年'),
                        new RegExp(birthYear + '[^\\n，。;；）)]*?[—\\-–~～](\\d{4})'),
                        /(?:died|去世|逝世|處死|犧牲|殉難|卒|殁|病逝|遇害|被殺|死亡)[^\n，。;；）)]*?(\d{4})/,
                        /(?:\d{4})年[^\n，。;；）)]*?[—\-–~～](\d{4})年/
                    ];
                    for (const pat of deathPatterns) {
                        const dm = recentActivityText.match(pat);
                        if (dm) {
                            const dy = parseInt(dm[1]);
                            if (dy > birthYear && dy < new Date().getFullYear()) {
                                deathYear = dy;
                                break;
                            }
                        }
                    }
                }

                const getSchoolLabel = (sentence) => {
                    if (!sentence) return null;
                    if (sentence.includes("臺灣大學") || sentence.includes("台大")) return "臺灣大學";
                    if (sentence.includes("康乃爾")) return "康乃爾";
                    if (sentence.includes("倫敦政治經濟學院") || sentence.includes("倫敦政經")) return "倫敦政經";
                    if (sentence.includes("中山女子高級中學") || sentence.includes("中山女中")) return "中山女中";
                    if (sentence.includes("北安國民中學") || sentence.includes("北安國中")) return "北安國中";
                    if (sentence.includes("吉林")) return "吉林國小";
                    if (sentence.includes("長安")) return "長安國小";
                    if (sentence.includes("雙連")) return "雙連幼稚";

                    const m = sentence.match(/(?:國立|私立|臺北市立|市立|縣立|新成立的|就讀)?([^，。、；：\s]{2,12}?(?:大學|學院|中學|高中|國中|小學|國小|幼稚園|幼兒園|幼稚))/);
                    if (m) {
                        let name = m[1];
                        name = name.replace(/^(國立|私立|臺北市立|市立|縣立|新成立的|就讀)/, "");
                        name = name.replace(/國民小學$/, "國小");
                        name = name.replace(/國民中學$/, "國中");
                        name = name.replace(/女子高級中學$/, "女中");
                        name = name.replace(/高級中學$/, "高中");
                        name = name.replace(/政治經濟學院$/, "政經");
                        name = name.replace(/幼稚園$/, "幼稚");
                        return name.substring(0, 5);
                    }
                    return null;
                };

                if (birthYear && recentActivityText) {
                    Object.entries(wikiGroups).forEach(([groupName, events]) => {
                        // If there are Chinese groups in the activity, strictly show only Chinese groups on the horizontal timeline
                        // const hasChineseInGroups = Object.keys(wikiGroups).some(gn => /[\u4e00-\u9fa5]/.test(gn));
                        // if (hasChineseInGroups && !/[\u4e00-\u9fa5]/.test(groupName)) {
                        //     return;
                        // }

                        events.forEach(e => {
                            let yearMonths = [];
                            if (e.dateStr) {
                                const yyMmMatch = e.dateStr.match(/^(\d{2})\.(\d{2})/);
                                if (yyMmMatch) {
                                    const yy = parseInt(yyMmMatch[1]);
                                    yearMonths.push({ y: yy < 50 ? 2000 + yy : 1900 + yy, m: parseInt(yyMmMatch[2]) });
                                } else {
                                    const yyMatch = e.dateStr.match(/^(\d{2})\./);
                                    if (yyMatch) {
                                        const yy = parseInt(yyMatch[1]);
                                        yearMonths.push({ y: yy < 50 ? 2000 + yy : 1900 + yy, m: 1 });
                                    }
                                }
                                const yyyyMmMatch = e.dateStr.match(/((?:18|19|20)\d{2})\.(\d{2})/);
                                if (yyyyMmMatch) {
                                    yearMonths.push({ y: parseInt(yyyyMmMatch[1]), m: parseInt(yyyyMmMatch[2]) });
                                } else {
                                    const yyyyMatch = e.dateStr.match(/(18|19|20)\d{2}/);
                                    if (yyyyMatch) yearMonths.push({ y: parseInt(yyyyMatch[0]), m: 1 });
                                }
                            }
                            const textYears = [...e.event.matchAll(/((?:18|19|20)\d{2})(?:年(?:(\d{1,2})月)?)?/g)].map(m => {
                                return { y: parseInt(m[1]), m: m[2] ? parseInt(m[2]) : 1 };
                            });
                            textYears.forEach(ym => yearMonths.push(ym));

                            const seenYm = new Set();
                            const uniqueYm = [];
                            yearMonths.forEach(ym => {
                                const key = ym.y + '-' + ym.m;
                                if (!seenYm.has(key)) {
                                    seenYm.add(key);
                                    uniqueYm.push(ym);
                                }
                            });

                            const sentences = e.event.split(/[。；;]/);

                            uniqueYm.forEach(ym => {
                                const y = ym.y;
                                const m = ym.m;
                                const maxYear = deathYear || new Date().getFullYear();
                                if (y >= birthYear && y <= maxYear) {
                                    let customLabel = null;
                                    if (groupName.includes("學歷")) {
                                        const matchingSentence = sentences.find(s => s.includes(y.toString())) || e.event;
                                        customLabel = getSchoolLabel(matchingSentence);
                                    }

                                    let latLng = null;
                                    let milestoneLabel = null;
                                    if (e.isBirth) {
                                        // Use birth location from milestone map if available
                                        const birthEntry = milestoneMap['出生'] || milestoneMap['Born'] || milestoneMap['出生地'];
                                        if (birthEntry) {
                                            latLng = birthEntry.coords;
                                            milestoneLabel = birthEntry.label;
                                        }
                                    } else {
                                        for (const [key, val] of Object.entries(milestoneMap)) {
                                            if (e.event.includes(key) || groupName.includes(key)) {
                                                latLng = val.coords;
                                                milestoneLabel = val.label;
                                                break;
                                            }
                                        }
                                    }

                                    timelineEvents.push({
                                        id: groupName + '_' + y + '_' + m + '_' + Math.random().toString(36).substr(2, 5),
                                        year: y,
                                        month: m,
                                        age: (y - birthYear) + (m - 1) / 12,
                                        group: groupName,
                                        color: groupColorMap[groupName] || '#3b82f6',
                                        text: e.event.substring(0, 80) + '...',
                                        customLabel: customLabel,
                                        coords: latLng,
                                        milestoneLabel: milestoneLabel
                                    });
                                }
                            });
                        });
                    });

                    if (timelineEvents.length > 0) {
                        timelineEvents.sort((a, b) => a.year - b.year);

                        // End 3 years after last event, or at death year for deceased persons
                        // For living people, end exactly at the end of the current year (e.g., 2026.12)
                        const currentYear = new Date().getFullYear();
                        const maxLivingAge = (currentYear - birthYear) + 1;
                        const lastEventAge = Math.max(...timelineEvents.map(e => e.age));
                        let endAge;
                        if (deathYear) {
                            endAge = deathYear - birthYear + 1; // cap at death age + 1 for visual padding
                        } else {
                            endAge = maxLivingAge; // always extend to the end of the current year for living people
                        }
                        const totalSpan = endAge;
                        const numDecades = Math.floor(endAge / 10);

                        const getPct = (age, span) => {
                            const a = Math.max(0, Math.min(age, span));
                            if (span <= 10) return (a / span) * 100;
                            if (span <= 20) {
                                if (a <= 10) return (a / 10) * 50;
                                return 50 + ((a - 10) / (span - 10)) * 50;
                            }
                            if (span <= 30) {
                                const p1 = { age: 10, pct: 15 };
                                const p2 = { age: span - 10, pct: 50 };
                                const p3 = { age: span - 1, pct: 75 };
                                const p4 = { age: span, pct: 100 };
                                if (a <= p1.age) return (a / p1.age) * p1.pct;
                                if (a <= p2.age) return p1.pct + ((a - p1.age) / (p2.age - p1.age)) * (p2.pct - p1.pct);
                                if (a <= p3.age) return p2.pct + ((a - p2.age) / (p3.age - p2.age)) * (p3.pct - p2.pct);
                                return p3.pct + ((a - p3.age) / (p4.age - p3.age)) * (p4.pct - p3.pct);
                            }
                            // Piecewise linear scale:
                            // 0-10 -> 8%
                            // 10-20 -> 5% (10s gets smaller space, ending at 13%)
                            // middle -> up to 50%
                            // span-1 to span -> 25% (current year gets 25%)
                            const p1 = { age: 10, pct: 8 };
                            const p2 = { age: 20, pct: 13 };
                            const p3 = { age: span - 10, pct: 50 };
                            const p4 = { age: span - 1, pct: 75 };
                            const p5 = { age: span, pct: 100 };

                            if (a <= p1.age) return (a / p1.age) * p1.pct;
                            if (a <= p2.age) return p1.pct + ((a - p1.age) / (p2.age - p1.age)) * (p2.pct - p1.pct);
                            if (a <= p3.age) return p2.pct + ((a - p2.age) / (p3.age - p2.age)) * (p3.pct - p2.pct);
                            if (a <= p4.age) return p3.pct + ((a - p3.age) / (p4.age - p3.age)) * (p4.pct - p3.pct);
                            return p4.pct + ((a - p4.age) / (p5.age - p4.age)) * (p5.pct - p4.pct);
                        };

                        // Count occurrences of each group to decide condensing
                        const groupCounts = {};
                        timelineEvents.forEach(e => {
                            groupCounts[e.group] = (groupCounts[e.group] || 0) + 1;
                        });

                        // Prepare positioned events with labels
                        const positioned = timelineEvents.map(e => {
                            const shortGroup = e.group.replace(/^=\s*/, '').replace(/\s*=$/, '').replace(/\s*[\(（]译[\)）]\s*$/, '');
                            const isCondensed = groupCounts[e.group] > 2;
                            const label = e.customLabel || (isCondensed ? shortGroup.substring(0, 2) : shortGroup);
                            return {
                                ...e,
                                pct: getPct(e.age, totalSpan),
                                label: label
                            };
                        });

                        const rowHeight = 16;
                        const maxRows = 10; // Allow more rows internally

                        // Stack text markers into rows for scrollable label area
                        const rows = [];
                        positioned.forEach(e => {
                            let placed = false;
                            const minGap = 8;
                            for (let r = 0; r < rows.length && r < maxRows; r++) {
                                const last = rows[r][rows[r].length - 1];
                                if (e.pct - last.pct > minGap) {
                                    rows[r].push(e);
                                    placed = true;
                                    break;
                                }
                            }
                            if (!placed && rows.length < maxRows) rows.push([e]);
                            else if (!placed) {
                                rows[maxRows - 1].push(e);
                            }
                        });

                        const visibleRows = Math.min(rows.length, 3);
                        const markerAreaHeight = visibleRows * rowHeight + 4;
                        const actualAreaHeight = rows.length * rowHeight + 4;

                        let lifeHtml = '<div style="padding:6px 0 4px 0; border-bottom:1px solid #e5e7eb;">';
                        // Removed Life Timeline title row
                        lifeHtml += `<div style="position:relative; overflow-y:visible; min-height:${markerAreaHeight + 54}px;">`;
                        lifeHtml += `<div class="eo-timeline-click-area" style="position:relative; min-width:100%; height:${markerAreaHeight + 54}px; cursor:pointer;" onclick="App.handleTimelineBackgroundClick(event, ${birthYear}, ${totalSpan})">`;

                        // Background bands by main category
                        const bgBands = [];
                        let currentBand = null;
                        const sortedByAge = [...timelineEvents].sort((a, b) => a.age - b.age);

                        sortedByAge.forEach(e => {
                            const mainCat = e.group.replace(/\s*\d+$/, '').split('-')[0].trim();
                            if (!currentBand || currentBand.cat !== mainCat) {
                                if (currentBand) {
                                    currentBand.endAge = e.age;
                                }
                                if ((mainCat === 'Overview' || mainCat === '概述') && currentBand) {
                                    return;
                                }
                                currentBand = {
                                    cat: mainCat,
                                    startAge: currentBand ? currentBand.endAge : 0,
                                    color: e.color
                                };
                                bgBands.push(currentBand);
                            }
                        });
                        if (currentBand) {
                            currentBand.endAge = totalSpan;
                        } else {
                            bgBands.push({ startAge: 0, endAge: totalSpan, color: '#cbd5e1' });
                        }

                        // Background bands by main category (Top part only)
                        bgBands.forEach(band => {
                            const left = getPct(band.startAge, totalSpan);
                            const right = getPct(band.endAge, totalSpan);
                            const width = right - left;
                            lifeHtml += `<div style="position:absolute; left:${left}%; width:${width}%; top:0; height:${markerAreaHeight}px; background:${band.color}15; z-index:0;" title="${App._contactFormEscape(band.cat)}"></div>`;
                        });

                        // Original Grey Decade Backgrounds (Bottom part only)
                        for (let i = 0; i <= numDecades; i++) {
                            const startAge = i * 10;
                            const endAgeForDecade = Math.min(startAge + 10, totalSpan);
                            const left = getPct(startAge, totalSpan);
                            const right = getPct(endAgeForDecade, totalSpan);
                            const width = right - left;
                            const lightness = 93 - (i * 3);
                            lifeHtml += `<div style="position:absolute; left:${left}%; width:${width}%; top:${markerAreaHeight}px; height:54px; background:hsl(210, 10%, ${lightness}%); z-index:0;"></div>`;
                        }

                        // Vertical decade separator lines
                        for (let i = 0; i <= numDecades; i++) {
                            const startAge = i * 10;
                            const pct = getPct(startAge, totalSpan);
                            if (pct <= 100) {
                                lifeHtml += `<div style="position:absolute; left:${pct}%; top:${markerAreaHeight}px; height:54px; width:1px; background:#cbd5e1; z-index:1;"></div>`;
                            }
                        }

                        // Vertical year separator lines for the last 10 years (Top part)
                        for (let y = Math.max(0, totalSpan - 10); y <= totalSpan; y++) {
                            const pct = getPct(y, totalSpan);
                            if (pct <= 100) {
                                lifeHtml += `<div style="position:absolute; left:${pct}%; top:0; height:${markerAreaHeight}px; border-left:1px dashed rgba(148, 163, 184, 0.4); z-index:1;"></div>`;
                            }
                        }

                        // Bold vertical line for "Today"
                        if (!deathYear) {
                            const now = new Date();
                            const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
                            const todayAgeExact = (currentYear - birthYear) + (dayOfYear / 365.25);
                            const pctToday = getPct(todayAgeExact, totalSpan);
                            if (pctToday <= 100) {
                                lifeHtml += `
                            <div style="position:absolute; left:${pctToday}%; top:0; display:flex; flex-direction:column; align-items:center; transform:translateX(-50%); z-index:10; pointer-events:none;">
                                <div style="background-color:#ef4444; color:white; font-size:8px; font-weight:bold; padding:2px 4px; border-radius:3px; margin-bottom:2px; box-shadow:0 1px 3px rgba(0,0,0,0.2);">Today</div>
                                <div style="width:2px; height:${markerAreaHeight + 54 - 14}px; background-color:rgba(239, 68, 68, 0.6); box-shadow:0 0 4px rgba(239, 68, 68, 0.4);"></div>
                            </div>
                        `;
                            }
                        }

                        // Scrollable marker area (ABOVE axis) with text labels
                        lifeHtml += `<div id="eo-marker-scroll-area" style="position:relative; height:${markerAreaHeight}px; overflow-y:auto; overflow-x:hidden; z-index:3;">`;
                        lifeHtml += `<div style="position:relative; height:${actualAreaHeight}px;">`;
                        rows.forEach((rowEvents, rIdx) => {
                            rowEvents.forEach(e => {
                                const top = (rows.length - 1 - rIdx) * rowHeight;
                                lifeHtml += `<a href="javascript:void(0)" onclick="App.scrollToActivityGroup(${jsArg(e.group)}, ${e.coords ? e.coords[0] : 'null'}, ${e.coords ? e.coords[1] : 'null'}, '${e.id}')" title="${e.year} (Age ${e.age}): [${App._contactFormEscape(e.group)}]&#10;${App._contactFormEscape(e.text)}" style="position:absolute; left:${e.pct}%; top:${top}px; transform:translateX(-50%); font-size:9px; font-weight:600; color:${e.color}; background:${e.color}18; border:1px solid ${e.color}40; border-radius:3px; padding:2px 4px; line-height:1.3; white-space:nowrap; cursor:pointer; text-decoration:none; transition:all 0.15s; z-index:2;" onmouseover="this.style.zIndex=100;this.style.transform='translateX(-50%) scale(1.15)';this.style.boxShadow='0 2px 6px rgba(0,0,0,0.15)';this.style.textDecoration='underline';" onmouseout="this.style.zIndex=2;this.style.transform='translateX(-50%)';this.style.boxShadow='';this.style.textDecoration='none';">${App._contactFormEscape(e.label)}</a>`;
                            });
                        });
                        lifeHtml += '</div></div>';

                        // Horizontal axis line with dots for ALL events
                        lifeHtml += '<div style="position:relative; height:10px; z-index:2;">';
                        lifeHtml += '<div style="position:absolute; left:0; right:0; top:4px; height:2px; background:linear-gradient(90deg, #94a3b8, #cbd5e1);"></div>';

                        // Month labels for current year — below axis, clickable to scroll to matching year-month entry
                        if (!deathYear) {
                            for (let m = 1; m <= 12; m++) {
                                const ageForMonth = (currentYear - birthYear) + (m - 1) / 12;
                                const pct = getPct(ageForMonth, totalSpan);
                                if (pct <= 100 && pct > 0) {
                                    const ymKey = `${currentYear}.${String(m).padStart(2, '0')}`;
                                    lifeHtml += `
                                <a href="javascript:void(0)"
                                    onclick="(function(){
                                        var yk='${ymKey}';
                                        var yr='${currentYear}';
                                        var rows=Array.from(document.querySelectorAll('.eo-activity-event-row'));
                                        var target=rows.find(function(r){return r.getAttribute('data-group')===yk;});
                                        if(!target) target=rows.find(function(r){return r.getAttribute('data-group')===yr;});
                                        if(target){
                                            target.scrollIntoView({behavior:'smooth',block:'center'});
                                            var ob=target.style.backgroundColor;
                                            target.style.backgroundColor='#6c5ce733';
                                            setTimeout(function(){target.style.backgroundColor=ob;},1200);
                                            if(target.querySelector('[onclick]')){target.querySelector('[onclick]').click();}
                                        } else {
                                            var overviewSection = document.getElementById('contact-overview-section');
                                            if(overviewSection) overviewSection.scrollIntoView({behavior:'smooth',block:'start'});
                                        }
                                    })()"
                                    title="Go to ${ymKey}"
                                    onmouseover="this.querySelector('span').style.color='#6c5ce7'; this.querySelector('span').style.textDecoration='underline';"
                                    onmouseout="this.querySelector('span').style.color='#334155'; this.querySelector('span').style.textDecoration='none';"
                                    style="position:absolute; left:${pct}%; top:12px; display:flex; flex-direction:column;
                                           align-items:center; transform:translateX(-50%); z-index:4;
                                           text-decoration:none; cursor:pointer;">
                                    <div style="width:1px; height:5px; background-color:#475569; margin-bottom:2px; pointer-events:none;"></div>
                                    <span style="font-size:8px; font-weight:800; color:#334155;
                                                 transition:color 0.15s; white-space:nowrap;
                                                 text-decoration:underline dotted; text-underline-offset:2px;">${m}月</span>
                                </a>
                            `;
                                }
                            }
                        }

                        // Dot for every event
                        positioned.forEach(e => {
                            lifeHtml += `<a href="javascript:void(0)" onclick="App.scrollToActivityGroup(${jsArg(e.group)}, ${e.coords ? e.coords[0] : 'null'}, ${e.coords ? e.coords[1] : 'null'}, '${e.id}')" title="${e.year} (Age ${e.age}): ${App._contactFormEscape(e.group)}" style="position:absolute; left:${e.pct}%; top:1px; width:8px; height:8px; background:${e.color}; border:1.5px solid #fff; border-radius:50%; transform:translateX(-50%); cursor:pointer; z-index:3; transition:transform 0.15s;" onmouseover="this.style.transform='translateX(-50%) scale(1.5)';this.style.boxShadow='0 0 4px ${e.color}';" onmouseout="this.style.transform='translateX(-50%)';this.style.boxShadow='';"></a>`;
                        });
                        lifeHtml += '</div>';

                        // Decade labels below axis (pointer-events:none so month labels underneath are clickable)
                        lifeHtml += '<div style="position:relative; height:44px; z-index:2; pointer-events:none;">';
                        const baseAvatarSrc = contact.image ? App._contactFormEscape(contact.image) : `https://ui-avatars.com/api/?name=${encodeURIComponent(contact.name || contact.email || 'U')}&background=random`;
                        const slug = (contact.name || "").replace(/\s+/g, '_');

                        for (let i = 0; i <= numDecades; i++) {
                            const startAge = i * 10;
                            const decadeYear = birthYear + startAge;
                            const pct = getPct(startAge, totalSpan);
                            if (pct <= 100) {
                                const calendarDecade = Math.floor(decadeYear / 10) * 10;
                                const decadeImage = `/images/politicians/${App._contactFormEscape(slug)}/${App._contactFormEscape(slug)}_${calendarDecade}s.jpg`;
                                const isZeroDecade = startAge === 0;
                                const imgHtml = `<img src="${decadeImage}" onerror="this.src='${baseAvatarSrc}'; this.onerror=null;" style="width:24px; height:24px; border-radius:50%; object-fit:cover; border:2px solid #fff; box-shadow:0 2px 4px rgba(0,0,0,0.2); transition:all 0.2s ease-in-out; position:relative; z-index:1; cursor:pointer;" onmouseover="this.parentElement.style.zIndex='100'; this.style.transform='scale(5)'; this.style.zIndex='100'; this.style.boxShadow='0 8px 24px rgba(0,0,0,0.4)';" onmouseout="this.parentElement.style.zIndex=''; this.style.transform=''; this.style.zIndex='1'; this.style.boxShadow='0 2px 4px rgba(0,0,0,0.2)';" alt="Age ${startAge}" title="${calendarDecade}s Photo (Age ${startAge}s)" />`;
                                const textHtml = `
                            <div style="display:flex; flex-direction:column; align-items:${isZeroDecade ? 'flex-end' : 'flex-start'}; line-height:1.1;">
                                <span style="font-size:11px; font-weight:800; color:#0f172a;">${decadeYear}</span>
                                <span style="font-weight:700; color:#475569; font-size:9px;">(${startAge}s)</span>
                            </div>`;
                                lifeHtml += `
                        <div style="position:absolute; left:${pct}%; ${isZeroDecade ? 'transform:translateX(0);' : 'transform:translateX(-50%);'} margin-top:4px; white-space:nowrap; display:flex; flex-direction:row; align-items:center; gap:4px; pointer-events:auto;">
                            ${isZeroDecade ? textHtml + imgHtml : imgHtml + textHtml}
                        </div>`;
                            }
                        }

                        // Year labels for the last 10 years — clickable to scroll to Year by year entry
                        for (let y = Math.max(0, totalSpan - 10); y < totalSpan; y++) {
                            if (y % 10 === 0) continue; // Skip decade markers
                            const pct = getPct(y, totalSpan);
                            if (pct <= 100) {
                                const calendarYear = birthYear + y;
                                lifeHtml += `<a href="javascript:void(0)"
                                    onclick="(function(){
                                        var yk='${calendarYear}';
                                        var rows=Array.from(document.querySelectorAll('.eo-activity-event-row'));
                                        var target=rows.find(function(r){return r.getAttribute('data-group')===yk;});
                                        if(target){
                                            target.scrollIntoView({behavior:'smooth',block:'center'});
                                            var ob=target.style.backgroundColor;
                                            target.style.backgroundColor='#6c5ce733';
                                            setTimeout(function(){target.style.backgroundColor=ob;},1200);
                                        }
                                    })()"
                                    title="Go to ${calendarYear}"
                                    style="position:absolute; left:${pct}%; top:8px; transform:translateX(-50%);
                                           font-size:10px; font-weight:700; color:#64748b; z-index:1;
                                           text-decoration:none; cursor:pointer; transition:color 0.15s; pointer-events:auto;"
                                    onmouseover="this.style.color='#6c5ce7'; this.style.textDecoration='underline';"
                                    onmouseout="this.style.color='#64748b'; this.style.textDecoration='none';"
                                    >${calendarYear}</a>`;
                            }
                        }

                        // Show current year/age or death year/age at end of timeline
                        const endMarkerYear = deathYear || currentYear;
                        const endMarkerAge = endMarkerYear - birthYear;
                        const endPct = getPct(endMarkerAge, totalSpan);
                        if (endPct <= 100) {
                            const endDecadeYear = Math.floor(endMarkerYear / 10) * 10;
                            const endDecadeImage = `/images/politicians/${App._contactFormEscape(slug)}/${App._contactFormEscape(slug)}_${endDecadeYear}s.jpg`;

                            if (deathYear) {
                                // Deceased: show cross symbol with death year
                                lifeHtml += `
                        <div style="position:absolute; right:0; margin-top:4px; white-space:nowrap; display:flex; flex-direction:row; align-items:center; gap:4px; z-index:2;">
                            <div style="display:flex; flex-direction:column; align-items:flex-end; line-height:1.1;">
                                <span style="font-size:11px; font-weight:800; color:#dc2626;">† ${deathYear}</span>
                                <span style="font-weight:700; color:#dc2626; font-size:9px;">Age ${endMarkerAge}</span>
                            </div>
                            <div style="position:relative; width:24px; height:24px;" onmouseover="this.querySelector('img').style.transform='scale(5)'; this.querySelector('img').style.zIndex='100'; this.style.zIndex='100';" onmouseout="this.querySelector('img').style.transform=''; this.querySelector('img').style.zIndex='1'; this.style.zIndex='1';">
                                <img src="${endDecadeImage}" onerror="this.src='${baseAvatarSrc}'; this.onerror=null;" style="width:24px; height:24px; border-radius:50%; object-fit:cover; border:2px solid #dc2626; box-shadow:0 2px 4px rgba(0,0,0,0.2); z-index:1; position:relative; transition:all 0.2s ease-in-out;" />
                                <div style="position:absolute; bottom:-2px; right:-2px; background:#dc2626; color:#fff; font-size:6px; font-weight:900; padding:1px 3px; border-radius:4px; border:1px solid #fff; z-index:2; line-height:1; transform:scale(0.85);">†</div>
                            </div>
                        </div>`;
                            } else {
                                // Living: show pulsing green dot with current year
                                lifeHtml += `
                        <div style="position:absolute; right:0; margin-top:4px; white-space:nowrap; display:flex; flex-direction:row; align-items:center; gap:4px; z-index:2;">
                            <div style="display:flex; flex-direction:column; align-items:flex-end; line-height:1.1;">
                                <span style="font-size:11px; font-weight:800; color:#16a34a;">${currentYear}</span>
                                <span style="font-weight:700; color:#16a34a; font-size:9px;">Age ${endMarkerAge}</span>
                            </div>
                            <div style="position:relative; width:24px; height:24px;" onmouseover="this.querySelector('img').style.transform='scale(5)'; this.querySelector('img').style.zIndex='100'; this.style.zIndex='100';" onmouseout="this.querySelector('img').style.transform=''; this.querySelector('img').style.zIndex='1'; this.style.zIndex='1';">
                                <img src="${endDecadeImage}" onerror="this.src='${baseAvatarSrc}'; this.onerror=null;" style="width:24px; height:24px; border-radius:50%; object-fit:cover; border:2px solid #16a34a; box-shadow:0 2px 6px rgba(22,163,74,0.4); z-index:1; position:relative; transition:all 0.2s ease-in-out;" />
                                <div style="position:absolute; bottom:-2px; right:-2px; background:#16a34a; color:#fff; font-size:6px; font-weight:900; padding:1px 3px; border-radius:4px; border:1px solid #fff; z-index:2; line-height:1; transform:scale(0.85);">Now</div>
                            </div>
                        </div>`;
                            }
                        }

                        lifeHtml += '</div>';

                        lifeHtml += '</div>'; // close inner min-width container
                        lifeHtml += '</div>'; // close scrollable container
                        lifeHtml += '</div>'; // close padding container

                        const tlBar = document.getElementById('life-timeline-bar');
                        if (tlBar) {
                            tlBar.innerHTML = lifeHtml;
                            const scrollArea = tlBar.querySelector('#eo-marker-scroll-area');
                            if (scrollArea) {
                                scrollArea.scrollTop = scrollArea.scrollHeight;
                            }
                        }

                        // Initialize the interactive map
                        try {
                            if (!window.L) {
                                if (!this.state._loadingLeaflet) {
                                    this.state._loadingLeaflet = true;
                                    const link = document.createElement('link');
                                    link.rel = 'stylesheet';
                                    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
                                    document.head.appendChild(link);

                                    await new Promise((resolve) => {
                                        const script = document.createElement('script');
                                        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
                                        script.onload = () => {
                                            this.state._loadingLeaflet = false;
                                            resolve();
                                        };
                                        document.head.appendChild(script);
                                    });
                                } else {
                                    // Wait for it to finish loading
                                    while (this.state._loadingLeaflet && this.state._detailRenderId === renderId) {
                                        await new Promise(r => setTimeout(r, 50));
                                    }
                                }
                            }

                            if (this.state._detailRenderId !== renderId) return;

                            const mapEl = document.getElementById("life-map");
                            if (mapEl) {
                                if (this.state.lifeMap) {
                                    try {
                                        this.state.lifeMap.remove();
                                    } catch (err) {
                                        console.error("Error removing old map instance:", err);
                                    }
                                    this.state.lifeMap = null;
                                }

                                const map = L.map('life-map', {
                                    zoomControl: true,
                                    scrollWheelZoom: true
                                }).setView([25.0330, 121.5654], 2);

                                this.state.lifeMap = map;
                                this.state.lifeMarkers = {};

                                L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
                                    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
                                    subdomains: 'abcd',
                                    maxZoom: 20
                                }).addTo(map);

                                const geocodedEvents = timelineEvents.filter(e => e.coords);
                                const latlngs = [];
                                const slug = (contact.name || "").replace(/\s+/g, '_');
                                const baseAvatarSrc = contact.image ? App._contactFormEscape(contact.image) : `https://ui-avatars.com/api/?name=${encodeURIComponent(contact.name || contact.email || 'U')}&background=random`;

                                geocodedEvents.forEach((e) => {
                                    const [lat, lng] = e.coords;
                                    latlngs.push([lat, lng]);

                                    const eventDecade = Math.floor(e.year / 10) * 10;
                                    const eventDecadeImage = `/images/politicians/${App._contactFormEscape(slug)}/${App._contactFormEscape(slug)}_${eventDecade}s.jpg`;

                                    const pinIcon = L.divIcon({
                                        html: `<div style="position:relative; width:44px; height:44px; display:flex; align-items:center; justify-content:center;">
                                             <div style="position:absolute; width:10px; height:10px; background:${e.color}; border:2px solid #fff; border-radius:50%; bottom:-2px; z-index:5; box-shadow:0 1px 3px rgba(0,0,0,0.3);"></div>
                                             <img src="${eventDecadeImage}" onerror="this.src='${baseAvatarSrc}'; this.onerror=null;" style="width:36px; height:36px; border-radius:50%; border:2px solid ${e.color}; box-shadow:0 3px 8px rgba(0,0,0,0.3); object-fit:cover; background:#fff; transition:transform 0.2s;" onmouseover="this.style.transform='scale(1.3)'" onmouseout="this.style.transform=''" />
                                             <div style="position:absolute; top:-6px; background:${e.color}; color:#fff; font-size:8px; padding:1px 4px; border-radius:10px; font-weight:800; border:1px solid #fff; box-shadow:0 1px 3px rgba(0,0,0,0.2); white-space:nowrap; pointer-events:none;">${e.year}</div>
                                           </div>`,
                                        className: '',
                                        iconSize: [44, 44],
                                        iconAnchor: [22, 38],
                                        popupAnchor: [0, -42]
                                    });

                                    const marker = L.marker([lat, lng], { icon: pinIcon }).addTo(map);

                                    marker.bindPopup(`
                                    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; width:180px; padding:2px;">
                                        <div style="font-weight:800; font-size:12px; color:#1a1a2e; margin-bottom:4px; border-bottom:1px solid #e2e8f0; padding-bottom:3px; display:flex; justify-content:space-between; align-items:center;">
                                            <span>${e.year} (${e.age}s)</span>
                                            <span style="background:${e.color}15; color:${e.color}; padding:1px 5px; border-radius:4px; font-size:9px;">${App._contactFormEscape(e.group)}</span>
                                        </div>
                                        <div style="font-size:11px; font-weight:600; color:#6c5ce7; margin-bottom:4px;">${App._contactFormEscape(e.milestoneLabel)}</div>
                                        <div style="font-size:10px; color:#4a5568; line-height:1.3; white-space:normal; overflow:visible;">${App._contactFormEscape(e.text)}</div>
                                    </div>
                                `);

                                    marker.ageDecade = Math.floor(e.age / 10) * 10;
                                    this.state.lifeMarkers[e.id] = marker;
                                });

                                if (latlngs.length > 1) {
                                    this.state.lifePolyline = L.polyline(latlngs, {
                                        color: '#6c5ce7',
                                        weight: 3,
                                        opacity: 0.8,
                                        dashArray: '5, 8',
                                        lineJoin: 'round'
                                    }).addTo(map);
                                } else {
                                    this.state.lifePolyline = null;
                                }

                                if (latlngs.length > 0) {
                                    const bounds = L.latLngBounds(latlngs);
                                    map.fitBounds(bounds.pad(0.35));
                                }

                                setTimeout(() => {
                                    map.invalidateSize();
                                    if (latlngs.length > 0) {
                                        map.fitBounds(L.latLngBounds(latlngs).pad(0.35));
                                    }
                                }, 250);
                            }
                        } catch (err) {
                            console.error("Error initializing life map:", err);
                        }
                    }
                }
            } else if (isBusiness && document.getElementById("life-map")) {
                try {
                    if (!window.L) {
                        if (!this.state._loadingLeaflet) {
                            this.state._loadingLeaflet = true;
                            const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'; document.head.appendChild(link);
                            await new Promise((resolve) => {
                                const script = document.createElement('script'); script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
                                script.onload = () => { this.state._loadingLeaflet = false; resolve(); };
                                document.head.appendChild(script);
                            });
                        } else {
                            while (this.state._loadingLeaflet && this.state._detailRenderId === renderId) await new Promise(r => setTimeout(r, 50));
                        }
                    }
                    if (this.state._detailRenderId !== renderId) return;

                    const mapEl = document.getElementById("life-map");
                    if (mapEl) {
                        if (this.state.lifeMap) {
                            try { this.state.lifeMap.remove(); } catch(e){}
                            this.state.lifeMap = null;
                        }

                        // Use Vancouver location if it's in Vancouver group, otherwise a default
                        let lat = 49.2827;
                        let lng = -123.1207;
                        
                        const map = L.map('life-map', { zoomControl: true, scrollWheelZoom: true }).setView([lat, lng], 13);
                        this.state.lifeMap = map;
                        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { attribution: '&copy; OpenStreetMap', subdomains: 'abcd', maxZoom: 20 }).addTo(map);

                        const logoSrc = contact.logo || contact.coverImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(contact.company || contact.name || 'B')}&background=random`;
                        
                        const pinIcon = L.divIcon({
                            html: `<div style="position:relative; width:44px; height:44px; display:flex; align-items:center; justify-content:center;">
                                 <div style="position:absolute; width:10px; height:10px; background:#6c5ce7; border:2px solid #fff; border-radius:50%; bottom:-2px; z-index:5; box-shadow:0 1px 3px rgba(0,0,0,0.3);"></div>
                                 <img src="${logoSrc}" style="width:36px; height:36px; border-radius:50%; border:2px solid #6c5ce7; box-shadow:0 3px 8px rgba(0,0,0,0.3); object-fit:contain; background:#fff;" />
                               </div>`,
                            className: '', iconSize: [44, 44], iconAnchor: [22, 38], popupAnchor: [0, -42]
                        });

                        const marker = L.marker([lat, lng], { icon: pinIcon }).addTo(map);
                        marker.bindPopup(`
                            <div style="font-weight:bold; font-size:12px; margin-bottom:4px; text-align:center;">${App._contactFormEscape(contact.company || contact.name)}</div>
                            <div style="font-size:11px; color:#555; text-align:center;">${App._contactFormEscape(contact.address || contact.location)}</div>
                        `);
                        
                        // Async geocode actual address if available
                        if (contact.address && contact.address !== 'N/A') {
                            fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(contact.address)}`)
                                .then(res => res.json())
                                .then(data => {
                                    if (data && data.length > 0 && this.state._detailRenderId === renderId) {
                                        const nLat = parseFloat(data[0].lat);
                                        const nLng = parseFloat(data[0].lon);
                                        marker.setLatLng([nLat, nLng]);
                                        map.setView([nLat, nLng], 14);
                                    }
                                }).catch(e => console.warn('Geocoding failed', e));
                        }
                    }
                } catch (e) { console.error("Error setting up business map", e); }
            }

            if (relatedEmails.length === 0) {
                // Show placeholder only if there's no wiki activity either
                if (!contact.recentActivity) {
                    html += `<div class="eo-activity-empty">No recent activity found for this contact.</div>`;
                } else if (overviewSectionHtml) {
                    // Has wiki content — show a subtle label where emails would be
                    html += `<div style="color:#bbb;font-size:12px;font-style:italic;padding:4px 0 12px;">No email activity.</div>`;
                }
                html += visualTimelineHtml;
                timelineEl.innerHTML = html;

                // Inject overview section below email timeline
                const activitySection = timelineEl.closest('.eo-activity-section');
                if (activitySection) {
                    let overviewSection = activitySection.querySelector('#contact-overview-section');
                    if (!overviewSection) {
                        overviewSection = document.createElement('div');
                        overviewSection.id = 'contact-overview-section';
                        activitySection.appendChild(overviewSection);
                    }
                    overviewSection.innerHTML = overviewSectionHtml
                        ? `<div style="padding:0 24px 24px;">
                             <div style="font-size:16px;font-weight:700;color:#1a1a2e;
                                         margin-bottom:12px;padding-top:16px;
                                         border-top:1px solid #f0f0f0;">Overview</div>
                             ${overviewSectionHtml}
                           </div>`
                        : '';
                }
                return;
            }

            // Group by date
            const grouped = {};
            relatedEmails.forEach((e) => {
                const d = new Date(e.date);
                const mo = [
                    "Jan",
                    "Feb",
                    "Mar",
                    "Apr",
                    "May",
                    "Jun",
                    "Jul",
                    "Aug",
                    "Sep",
                    "Oct",
                    "Nov",
                    "Dec",
                ];
                const key = `${mo[d.getMonth()]} ${d.getDate()}`;
                if (!grouped[key]) grouped[key] = [];
                grouped[key].push(e);
            });

            Object.entries(grouped).forEach(([dateLabel, emails]) => {
                const eventsHtml = emails
                    .map((e) => {
                        const isSent =
                            e.folder === "sent" || (e.labels && e.labels.includes("sent"));
                        const verb = isSent ? "Was sent" : "Received";
                        const subject = e.subject || "(No Subject)";
                        const dotClass = isSent
                            ? "eo-timeline-dot--sent"
                            : "eo-timeline-dot--open";
                        return `
                        <div class="eo-timeline-event">
                            ${verb} <span class="eo-timeline-link" onclick="App.viewRelatedEmail('${e.id}')">${subject}</span>
                        </div>`;
                    })
                    .join("");

                html += `
                    <div class="eo-timeline-item">
                        <div class="eo-timeline-dot ${emails[0] && emails[0].folder === "sent" ? "eo-timeline-dot--sent" : "eo-timeline-dot--open"}"></div>
                        <div class="eo-timeline-content">
                            <div class="eo-timeline-date">${dateLabel}</div>
                            <div class="eo-timeline-events">${eventsHtml}</div>
                        </div>
                    </div>`;
            });

            html += visualTimelineHtml;
            timelineEl.innerHTML = html;

            // Inject overview section below email timeline
            const activitySection2 = timelineEl.closest('.eo-activity-section');
            if (activitySection2) {
                let overviewSection2 = activitySection2.querySelector('#contact-overview-section');
                if (!overviewSection2) {
                    overviewSection2 = document.createElement('div');
                    overviewSection2.id = 'contact-overview-section';
                    activitySection2.appendChild(overviewSection2);
                }
                overviewSection2.innerHTML = overviewSectionHtml
                    ? `<div style="padding:0 24px 24px;">
                         <div style="font-size:16px;font-weight:700;color:#1a1a2e;
                                     margin-bottom:12px;padding-top:16px;
                                     border-top:1px solid #f0f0f0;">Overview</div>
                         ${overviewSectionHtml}
                       </div>`
                    : '';
            }
        }, 10);
    },

    async _autoloadNews(contactId) {
        try {
            // Add a short delay to ensure DOM is ready
            await new Promise(r => setTimeout(r, 100));
            const contact = this.state.contacts.find((c) => c.id === contactId);
            if (!contact) return;
            const slugifiedName = contact.name ? contact.name.replace(/\s+/g, '_') : encodeURIComponent(contactId);
            
            let trendsData = [];
            try {
                const tRes = await fetch(`/images/politicians/${encodeURIComponent(slugifiedName)}/trends.json`);
                if (tRes.ok) trendsData = await tRes.json();
            } catch(e) {}

            let data = {};
            try {
                const res = await fetch(`/images/politicians/${encodeURIComponent(slugifiedName)}/news/index.json`);
                if (res.ok) data = await res.json();
            } catch(e) {}

            if ((data && data.posts && data.posts.length > 0) || trendsData.length > 0 || (data.socialMedia && data.socialMedia.length > 0)) {
                const result = {
                    success: true,
                    news: data.posts || [],
                    topics: data.topics || [],
                    summary24h: data.summary24h || [],
                    socialMedia: data.socialMedia || [],
                    trends: trendsData.length > 0 ? trendsData : (data.trends || []),
                    trendCount: trendsData.length > 0 ? trendsData.length : (data.trendCount || 0),
                    totalSources: data.sources ? data.sources.length : 0
                };
                this._renderNewsHtml(contactId, result);
            }
        } catch (e) { }
    },

    _renderNewsHtml(contactId, result) {
        const contentDiv = document.getElementById(`contact-news-content-${contactId}`);
        if (!contentDiv) return;

        const posts = result.news || [];
        if (posts.length > 0 || (result.socialMedia && result.socialMedia.length > 0) || (result.trends && result.trends.length > 0)) {
            let newsHtml = '';

            // Trend summary banner (top 3)
            if (result.trends && result.trends.length > 0) {
                const topTrends = result.trends.slice(0, 3);
                newsHtml += `<div style="background:linear-gradient(135deg,#0ea5e920,#6366f120);border:1px solid #6366f140;border-radius:8px;padding:10px 14px;margin-bottom:15px;">
                  <div style="font-weight:700;font-size:13px;color:#4f46e5;margin-bottom:6px;"><i class="fas fa-fire" style="color:#ef4444;margin-right:4px;"></i> Top ${topTrends.length} Trending Topic${topTrends.length > 1 ? 's' : ''} on Google</div>
                  <div style="display:flex;flex-direction:column;gap:12px;">`;
                
                const themeColors = [
                    { bg: '#ef444415', border: '#ef4444' }, // Red
                    { bg: '#3b82f615', border: '#3b82f6' }, // Blue
                    { bg: '#10b98115', border: '#10b981' }, // Green
                    { bg: '#f59e0b15', border: '#f59e0b' }, // Yellow
                    { bg: '#8b5cf615', border: '#8b5cf6' }  // Purple
                ];
                
                topTrends.forEach((t, index) => {
                    const theme = themeColors[index % themeColors.length];
                    const imgUrl = t.image || t.thumbnail || '';
                    const imgHtml = imgUrl ? `<img src="${this._contactFormEscape(imgUrl)}" style="width:100%;height:100px;object-fit:cover;border-radius:4px;margin-bottom:8px;border:1px solid rgba(0,0,0,0.05);" alt="Trend cover" />` : '';
                    newsHtml += `<div style="background:${theme.bg};border-left:3px solid ${theme.border};padding:10px 12px;border-radius:4px;font-size:12px;color:#1e293b;line-height:1.5;">
                        ${imgHtml}
                        <div style="font-weight:600;margin-bottom:4px;">${this._contactFormEscape(t.title)}</div>
                        ${t.titleZh ? `<div style="font-size:11px;color:#475569;margin-bottom:4px;font-weight:500;">${this._contactFormEscape(t.titleZh)}</div>` : ''}
                        <div style="font-size:10px;color:#64748b;display:flex;align-items:center;gap:4px;"><i class="fas fa-chart-line" style="color:${theme.border};"></i> ${this._contactFormEscape(t.traffic)} searches</div>
                    </div>`;
                });
                newsHtml += `</div></div>`;
            }

            // Render Topics
            if (result.topics && result.topics.length > 0) {
                newsHtml += `<div style="margin-bottom:20px;">
                  <h4 style="font-size:14px; font-weight:700; color:#1e293b; margin-bottom:12px; display:flex; align-items:center; gap:6px;"><i class="fas fa-brain" style="color:#6366f1;"></i> AI News Themes</h4>
                  <div style="display:flex; flex-direction:column; gap:12px;">`;
                result.topics.forEach(t => {
                    const imgUrl = t.image || t.thumbnail || '';
                    const imgHtml = imgUrl 
                        ? `<img src="${this._contactFormEscape(imgUrl)}" style="width:90px; height:90px; object-fit:cover; border-radius:6px; flex-shrink:0; border:1px solid #e2e8f0;" alt="Theme illustration" />` 
                        : '';
                    newsHtml += `
                      <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:8px; padding:12px; display:flex; gap:12px; box-shadow:0 1px 3px rgba(0,0,0,0.02); transition:transform 0.2s, box-shadow 0.2s;" onmouseover="this.style.transform='translateY(-1px)';this.style.boxShadow='0 4px 12px rgba(0,0,0,0.05)'" onmouseout="this.style.transform='none';this.style.boxShadow='0 1px 3px rgba(0,0,0,0.02)'">
                          ${imgHtml}
                          <div style="flex:1; min-width:0; display:flex; flex-direction:column; justify-content:center;">
                              <div style="font-weight:700; font-size:13.5px; color:#4f46e5; margin-bottom:4px;">${this._contactFormEscape(t.title)}</div>
                              <div style="font-size:12px; color:#334155; line-height:1.45; margin-bottom:6px;">${this._contactFormEscape(t.summary)}</div>
                              ${t.titleZh ? `<div style="font-weight:700; font-size:13px; color:#0ea5e9; margin-bottom:4px; padding-top:6px; border-top:1px dashed #cbd5e1; display:flex; align-items:center; gap:4px;"><i class="fas fa-language" style="color:#38bdf8;"></i> ${this._contactFormEscape(t.titleZh)}</div>` : ''}
                              ${t.summaryZh ? `<div style="font-size:11.5px; color:#475569; line-height:1.45;">${this._contactFormEscape(t.summaryZh)}</div>` : ''}
                          </div>
                      </div>`;
                });
                newsHtml += `</div></div>`;
            }



            // Stats line
            const trendCount = (result.trends || []).length;
            const statsLine = [
                trendCount ? `${trendCount} trends (趋势)` : null,
                `${posts.length} articles (文章)`,
            ].filter(Boolean).join(' · ');
            newsHtml += `<div style="font-size:12px;color:#94a3b8;margin-bottom:10px;margin-top:10px;"><i class="fas fa-chart-line" style="margin-right:4px;"></i>${statsLine} · ${new Date().toLocaleDateString()}</div>`;

            // Show latest 20 posts sorted by date
            const latestPosts = posts.slice(0, 20);
            latestPosts.forEach(item => {
                const dateStr = item.date ? new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
                const thumbHtml = item.thumbnail
                    ? `<img src="${this._contactFormEscape(item.thumbnail)}" style="width:80px;height:52px;object-fit:cover;border-radius:6px;flex-shrink:0;border:1px solid #e5e5e5;" onerror="this.style.display='none'" />`
                    : '';
                const trendBadge = item.isTrend
                    ? `<span style="background:#ef4444;color:#fff;padding:1px 6px;border-radius:8px;font-size:9px;font-weight:700;margin-right:6px;"><i class="fas fa-fire" style="font-size:8px;margin-right:2px;"></i>TREND</span>`
                    : '';
                const sourceBadge = item.source
                    ? `<span style="color:#64748b;font-size:10px;">${this._contactFormEscape(item.source)}</span>`
                    : '';
                const titleZhHtml = item.titleZh
                    ? `<div style="font-size:11.5px;color:#64748b;margin-bottom:3px;display:flex;align-items:flex-start;gap:4px;"><i class="fas fa-language" style="color:#38bdf8;font-size:11px;margin-top:2px;"></i> <span>${this._contactFormEscape(item.titleZh)}</span></div>`
                    : '';
                newsHtml += `
                  <div style="display:flex;gap:10px;margin-bottom:10px;padding:10px;background:${item.isTrend ? '#fef2f215' : '#fafafe'};border-radius:8px;border:1px solid ${item.isTrend ? '#ef444430' : '#f0f0f5'};transition:box-shadow 0.15s;" onmouseover="this.style.boxShadow='0 2px 8px rgba(0,0,0,0.08)'" onmouseout="this.style.boxShadow=''">
                      ${thumbHtml}
                      <div style="flex:1;min-width:0;">
                          <a href="${this._contactFormEscape(item.finalUrl || item.url)}" target="_blank" style="font-weight:600;font-size:13px;color:#1e293b;text-decoration:none;line-height:1.4;display:block;margin-bottom:3px;" onmouseover="this.style.color='#6366f1'" onmouseout="this.style.color='#1e293b'">${trendBadge}${this._contactFormEscape(item.title)}</a>
                          ${titleZhHtml}
                          <div style="display:flex;align-items:center;gap:6px;font-size:11px;color:#94a3b8;margin-bottom:4px;">
                              <span>${dateStr}</span>
                              ${sourceBadge}
                              ${item.trendTraffic ? `<span style="color:#ef4444;font-weight:600;">${this._contactFormEscape(item.trendTraffic)} searches</span>` : ''}
                          </div>
                      </div>
                  </div>
              `;
            });

            // Render 36-Hour Activity Summary AT THE BOTTOM
            if (result.summary24h && result.summary24h.length > 0) {
                newsHtml += `<div style="margin-top:20px; background:#ffffff; border:1px solid #e2e8f0; border-radius:12px; padding:16px;">
                  <h4 style="font-size:14px; font-weight:700; color:#334155; margin-bottom:12px; display:flex; align-items:center; gap:6px;"><i class="fas fa-clock" style="color:#0ea5e9;"></i> 36-Hour Activity Summary (PT)</h4>
                  <div style="display:flex; flex-direction:column; gap:10px;">`;
                
                const dotColors = ['#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#ef4444', '#14b8a6'];
                
                result.summary24h.forEach((line, idx) => {
                    let text = '';
                    let timePrefix = '';
                    let tsIds = [];
                    let videoQuery = '';
                    let locationName = '';
                    let locationCoords = null;
                    
                    if (typeof line === 'string') {
                        text = line;
                    } else if (typeof line === 'object') {
                        timePrefix = `<span style="font-weight:700; color:#0f172a; margin-right:4px;">${this._contactFormEscape(line.time || '')}</span>`;
                        text = line.text || '';
                        tsIds = line.truthSocialIds || [];
                        videoQuery = line.videoQuery || '';
                        locationName = line.locationName || '';
                        locationCoords = line.locationCoords || null;
                    }

                    // Build linked TS cards html
                    let linksHtml = '';
                    if (videoQuery) {
                        linksHtml += `
                          <div style="position:relative; display:inline-block; margin-left:8px;">
                              <a href="https://www.youtube.com/results?search_query=${encodeURIComponent(videoQuery)}" target="_blank" style="display:inline-flex; align-items:center; gap:4px; padding:2px 8px; background:#fef2f2; color:#ef4444; border-radius:12px; font-size:11px; font-weight:700; text-decoration:none; transition:background 0.2s; border:1px solid #fca5a5;" onmouseover="this.style.background='#fecaca'" onmouseout="this.style.background='#fef2f2'">
                                  <i class="fab fa-youtube"></i> Video
                              </a>
                          </div>
                        `;
                    }
                    if (locationName && locationCoords && locationCoords.length === 2) {
                        const safeLabel = this._contactFormEscape(locationName).replace(/'/g, "\\'");
                        linksHtml += `
                          <div style="position:relative; display:inline-block; margin-left:8px;">
                              <a href="javascript:void(0)" onclick="App.scrollToActivityGroup(null, ${locationCoords[0]}, ${locationCoords[1]}, null, '${safeLabel}')" style="display:inline-flex; align-items:center; gap:4px; padding:2px 8px; background:#f0fdf4; color:#16a34a; border-radius:12px; font-size:11px; font-weight:700; text-decoration:none; transition:background 0.2s; border:1px solid #bbf7d0;" onmouseover="this.style.background='#dcfce7'" onmouseout="this.style.background='#f0fdf4'">
                                  <i class="fas fa-map-marker-alt"></i> ${this._contactFormEscape(locationName)}
                              </a>
                          </div>
                        `;
                    }
                    if (tsIds.length > 0 && result.socialMedia) {
                        tsIds.forEach(id => {
                            const post = result.socialMedia.find(p => p.id === id || p.id === String(id));
                            if (post) {
                                const avatar = post.account?.avatar || 'https://truthsocial.com/avatars/original/missing.png';
                                const displayName = post.account?.display_name || 'Donald J. Trump';
                                const username = post.account?.username || 'realDonaldTrump';
                                const dateStr = post.date ? new Date(post.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
                                
                                const popupHtml = `
                                  <div class="ts-hover-card" style="display:none; position:absolute; z-index:100; bottom:100%; left:0; width:320px; background:#ffffff; border:1px solid #e2e8f0; border-radius:12px; padding:16px; box-shadow:0 -10px 25px -5px rgba(0,0,0,0.15), 0 -8px 10px -6px rgba(0,0,0,0.1); margin-bottom:8px; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                                      <div style="display:flex; align-items:center; gap:10px; margin-bottom:10px;">
                                          <img src="${this._contactFormEscape(avatar)}" style="width:36px; height:36px; border-radius:50%; object-fit:cover; border:1px solid #e2e8f0;" onerror="this.src='https://truthsocial.com/avatars/original/missing.png'" />
                                          <div style="flex:1; min-width:0; line-height:1.25;">
                                              <div style="display:flex; align-items:center; gap:4px; font-weight:700; font-size:13px; color:#0f1419;">
                                                  <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${this._contactFormEscape(displayName)}</span>
                                                  <span style="display:inline-flex; align-items:center; justify-content:center; background:#e02424; color:#fff; border-radius:50%; width:12px; height:12px; font-size:7px; flex-shrink:0;"><i class="fas fa-check"></i></span>
                                              </div>
                                              <div style="font-size:12px; color:#536471; display:flex; align-items:center; gap:4px; margin-top:2px;">
                                                  <span>@${this._contactFormEscape(username)}</span>
                                                  <span>·</span>
                                                  <span>${dateStr}</span>
                                              </div>
                                          </div>
                                      </div>
                                      <div style="font-size:13.5px; color:#0f1419; line-height:1.5; white-space:pre-wrap; word-break:break-word; margin-bottom:8px;">${this._contactFormEscape(post.text)}</div>
                                      ${post.textZh ? `<div style="font-size:12.5px; color:#334155; line-height:1.5; white-space:pre-wrap; word-break:break-word; border-top:1px dashed #e2e8f0; padding-top:8px; margin-top:8px; display:flex; gap:6px; align-items:start;"><i class="fas fa-language" style="color:#0ea5e9; font-size:14px; margin-top:2px; flex-shrink:0;"></i><div style="flex:1;">${this._contactFormEscape(post.textZh)}</div></div>` : ''}
                                  </div>
                                `;

                                let platformIcon = '<i class="fas fa-bullhorn"></i>';
                                let platformName = 'Post';
                                let bgStyle = 'background:#fee2e2; color:#b91c1c; border:1px solid #fecaca;';
                                let hoverBg = '#fca5a5';
                                let normalBg = '#fee2e2';
                                
                                if (post.platform === 'X' || post.platform === 'Twitter') {
                                    platformIcon = '<i class="fab fa-twitter"></i>';
                                    platformName = 'X Post';
                                    bgStyle = 'background:#e0f2fe; color:#0284c7; border:1px solid #bae6fd;';
                                    hoverBg = '#7dd3fc';
                                    normalBg = '#e0f2fe';
                                } else if (post.platform === 'Facebook') {
                                    platformIcon = '<i class="fab fa-facebook-f"></i>';
                                    platformName = 'Facebook';
                                    bgStyle = 'background:#dbeafe; color:#1d4ed8; border:1px solid #bfdbfe;';
                                    hoverBg = '#93c5fd';
                                    normalBg = '#dbeafe';
                                } else if (post.platform === 'Instagram') {
                                    platformIcon = '<i class="fab fa-instagram"></i>';
                                    platformName = 'Instagram';
                                    bgStyle = 'background:#fce7f3; color:#be185d; border:1px solid #fbcfe8;';
                                    hoverBg = '#f9a8d4';
                                    normalBg = '#fce7f3';
                                } else if (post.platform === 'Truth Social') {
                                    platformIcon = '<i class="fas fa-bullhorn"></i>';
                                    platformName = 'Truth Social';
                                }

                                const isSimulated = String(post.id).startsWith('sim_');
                                let postUrl = this._contactFormEscape(post.url);
                                if (isSimulated) {
                                    const searchQuery = encodeURIComponent((post.account?.display_name || '') + ' ' + post.text.substring(0, 40));
                                    if (post.platform === 'X' || post.platform === 'Twitter') {
                                        postUrl = `https://x.com/search?q=${searchQuery}`;
                                    } else {
                                        postUrl = `https://news.google.com/search?q=${searchQuery}`;
                                    }
                                }
                                const targetAttr = 'target="_blank"';

                                linksHtml += `
                                  <div style="position:relative; display:inline-block; margin-left:8px;" onmouseenter="this.querySelector('.ts-hover-card').style.display='block'" onmouseleave="this.querySelector('.ts-hover-card').style.display='none'">
                                      <a href="${postUrl}" ${targetAttr} style="display:inline-flex; align-items:center; gap:4px; padding:2px 8px; border-radius:12px; font-size:11px; font-weight:700; text-decoration:none; transition:background 0.2s; ${bgStyle}" onmouseover="this.style.background='${hoverBg}'" onmouseout="this.style.background='${normalBg}'">
                                          ${platformIcon} View ${platformName}
                                      </a>
                                      ${popupHtml}
                                  </div>
                                `;
                            }
                        });
                    }

                    const dotColor = dotColors[idx % dotColors.length];
                    const bgColor = dotColor + '15'; // 15% opacity background
                    const borderColor = dotColor + '40'; // 40% opacity border

                    newsHtml += `
                      <div style="font-size:13px; color:#475569; display:flex; align-items:flex-start; gap:10px; background:${bgColor}; border:1px solid ${borderColor}; border-radius:8px; padding:10px 12px; transition:box-shadow 0.2s;" onmouseover="this.style.boxShadow='0 2px 6px rgba(0,0,0,0.05)'" onmouseout="this.style.boxShadow='none'">
                          <div style="margin-top:6px; width:8px; height:8px; border-radius:50%; background-color:${dotColor}; box-shadow:0 0 0 2px ${bgColor}; flex-shrink:0;"></div>
                          <div style="flex:1; line-height:1.5;">${timePrefix}${this._contactFormEscape(text)} ${linksHtml}</div>
                      </div>`;
                });
                
                newsHtml += `</div></div>`;
            }

            contentDiv.innerHTML = newsHtml;
        } else {
            contentDiv.innerHTML = '<i>No trending data or posts found.</i>';
        }
    },

    _getContactTagOptions(contact) {
        const used = new Set((contact?.tags || []).map((tag) => String(tag).trim()).filter(Boolean));
        const options = new Map();
        const add = (value) => {
            const name = String(value || "").trim();
            if (!name || used.has(name)) return;
            const key = name.toLowerCase();
            if (!options.has(key)) options.set(key, name);
        };

        (this.state.tags || []).forEach((tag) => add(typeof tag === "string" ? tag : tag?.name));
        (this.state.contacts || []).forEach((item) => (item.tags || []).forEach(add));
        (this.state.contactLists || this.defaultContactLists()).forEach((list) => add(list.name || list.id));

        return Array.from(options.values()).sort((a, b) => a.localeCompare(b));
    },

    _addSelectedContactTag(contactId) {
        const select = document.getElementById(`eo-tag-select-${contactId}`);
        const tag = String(select?.value || "").trim();
        if (!tag) return;
        this._addContactTag(contactId, tag);
    },

    // Helper: remove a tag from a contact
    _removeContactTag(contactId, tag) {
        const contact = this.state.contacts.find((c) => c.id === contactId);
        if (!contact || !contact.tags) return;
        contact.tags = contact.tags.filter((t) => t !== tag);
        this.saveContactsToStorage();
        this.showContactDetail(contactId);
    },

    // Helper: add a tag to a contact
    _addContactTag(contactId, tagValue) {
        const tag = String(tagValue || "").trim();
        if (!tag) return;
        const contact = this.state.contacts.find((c) => c.id === contactId);
        if (!contact) return;
        if (!contact.tags) contact.tags = [];
        if (!contact.tags.includes(tag)) contact.tags.push(tag);
        this.saveContactsToStorage();
        this.showContactDetail(contactId);
    },

    renderContactDetailsPlaceholder() {
        const detailContainer = document.getElementById("contact-details");
        if (!detailContainer) return;
        detailContainer.innerHTML = `
            <div class="watermark"
                 style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#999;">
                <div style="font-size:100px;margin-bottom:20px;opacity:0.1;">
                    <i class="fas fa-address-card"></i>
                </div>
                <p>Select a contact to view details or use the "Create" button to add a new record.</p>
            </div>`;
    },

    viewRelatedEmail(emailId) {
        this.switchTask("mail");
        this.state.searchQuery = emailId;
        const searchInput = document.getElementById("mailsearchform");
        if (searchInput) searchInput.value = emailId;
        this.filterEmails();
    },

    composeTo(email) {
        this.switchTask("mail");
        setTimeout(() => {
            this.showCompose();
            document.getElementById("compose-to").value = email;
        }, 100);
    },

    scrollToActivityGroup(groupName, lat, lng, eventId, label) {
        const container = document.querySelector('.eo-activity-section');
        if (container && groupName) {
            const rows = Array.from(container.querySelectorAll('.eo-activity-event-row'));
            const row = rows.find(el => el.getAttribute('data-group') === groupName) ||
                rows.find(el => {
                    const span = el.querySelector('span');
                    return span && span.textContent.trim() === groupName.trim();
                });
            if (row) {
                row.scrollIntoView({ behavior: 'smooth', block: 'center' });
                const originalBg = row.style.backgroundColor;
                row.style.backgroundColor = '#6c5ce733'; // Soft theme color purple
                setTimeout(() => {
                    row.style.backgroundColor = originalBg;
                }, 1200);
            }
        }

        if (lat !== null && lat !== undefined && lng !== null && lng !== undefined && this.state.lifeMap) {
            this.state.lifeMap.setView([lat, lng], 14, { animate: true });
            if (eventId && this.state.lifeMarkers && this.state.lifeMarkers[eventId]) {
                this.state.lifeMarkers[eventId].openPopup();
            } else if (label) {
                if (this.state.tempMarker) this.state.tempMarker.remove();
                this.state.tempMarker = L.marker([lat, lng], {
                    icon: L.divIcon({
                        className: 'custom-div-icon',
                        html: `<div style="background-color:#16a34a; width:12px; height:12px; border-radius:50%; border:2px solid white; box-shadow:0 2px 4px rgba(0,0,0,0.3);"></div>`,
                        iconSize: [12, 12],
                        iconAnchor: [6, 6]
                    })
                }).addTo(this.state.lifeMap);
                this.state.tempMarker.bindPopup(`<b>${this._contactFormEscape(label)}</b>`).openPopup();
            }
        }
    },

    handleTimelineBackgroundClick(e, birthYear, totalSpan) {
        if (e.target.closest('a') || e.target.closest('.eo-activity-event-row')) {
            return; // Ignore clicks on specific active elements (dots, labels)
        }
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const pct = Math.max(0, Math.min(1, x / rect.width));

        let clickedAge = 0;
        if (totalSpan <= 10) {
            clickedAge = pct * totalSpan;
        } else if (totalSpan <= 20) {
            if (pct <= 0.5) {
                clickedAge = (pct / 0.5) * 10;
            } else {
                clickedAge = 10 + ((pct - 0.5) / 0.5) * (totalSpan - 10);
            }
        } else if (totalSpan <= 30) {
            const p1 = { age: 10, pct: 0.15 };
            const p2 = { age: totalSpan - 10, pct: 0.50 };
            const p3 = { age: totalSpan - 1, pct: 0.75 };
            const p4 = { age: totalSpan, pct: 1.00 };

            if (pct <= p1.pct) {
                clickedAge = (pct / p1.pct) * p1.age;
            } else if (pct <= p2.pct) {
                clickedAge = p1.age + ((pct - p1.pct) / (p2.pct - p1.pct)) * (p2.age - p1.age);
            } else if (pct <= p3.pct) {
                clickedAge = p2.age + ((pct - p2.pct) / (p3.pct - p2.pct)) * (p3.age - p2.age);
            } else {
                clickedAge = p3.age + ((pct - p3.pct) / (p4.pct - p3.pct)) * (p4.age - p3.age);
            }
        } else {
            const p1 = { age: 10, pct: 0.08 };
            const p2 = { age: 20, pct: 0.13 };
            const p3 = { age: totalSpan - 10, pct: 0.50 };
            const p4 = { age: totalSpan - 1, pct: 0.75 };
            const p5 = { age: totalSpan, pct: 1.00 };

            if (pct <= p1.pct) {
                clickedAge = (pct / p1.pct) * p1.age;
            } else if (pct <= p2.pct) {
                clickedAge = p1.age + ((pct - p1.pct) / (p2.pct - p1.pct)) * (p2.age - p1.age);
            } else if (pct <= p3.pct) {
                clickedAge = p2.age + ((pct - p2.pct) / (p3.pct - p2.pct)) * (p3.age - p2.age);
            } else if (pct <= p4.pct) {
                clickedAge = p3.age + ((pct - p3.pct) / (p4.pct - p3.pct)) * (p4.age - p3.age);
            } else {
                clickedAge = p4.age + ((pct - p4.pct) / (p5.pct - p4.pct)) * (p5.age - p4.age);
            }
        }
        const decadeStartAge = Math.floor(clickedAge / 10) * 10;

        this.filterMapByDecade(decadeStartAge);
    },

    filterMapByDecade(decade) {
        if (!this.state.lifeMap || !this.state.lifeMarkers) return;

        if (this.state.activeMapDecade === decade) {
            this.state.activeMapDecade = null; // Toggle off
        } else {
            this.state.activeMapDecade = decade;
        }

        const targetDecade = this.state.activeMapDecade;
        const map = this.state.lifeMap;
        const bounds = [];

        Object.values(this.state.lifeMarkers).forEach(marker => {
            // Find the event data matching this marker's group
            if (targetDecade === null || marker.ageDecade === targetDecade) {
                if (!map.hasLayer(marker)) {
                    marker.addTo(map);
                }
                bounds.push(marker.getLatLng());
            } else {
                if (map.hasLayer(marker)) {
                    map.removeLayer(marker);
                }
            }
        });

        if (this.state.lifePolyline) {
            if (targetDecade !== null) {
                map.removeLayer(this.state.lifePolyline);
            } else {
                this.state.lifePolyline.addTo(map);
            }
        }

        // Optionally refit bounds to show the newly filtered markers
        if (bounds.length > 0) {
            if (bounds.length === 1) {
                map.setView(bounds[0], 14, { animate: true });
            } else {
                map.fitBounds(L.latLngBounds(bounds), { padding: [30, 30], animate: true });
            }
        }
    },
    async collectNews(contactId) {
        const contact = this.state.contacts.find((c) => c.id === contactId);
        if (!contact) return;

        const btn = document.getElementById(`collect-news-btn-${contactId}`);
        if (btn) {
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Fetching trends...';
            btn.disabled = true;
        }

        try {
            const response = await fetch(`/api/fetch-news`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contactId: contact.id, name: contact.name, truthSocialHandle: contact.truthSocial || '' })
            });

            const result = await response.json();
            const contentDiv = document.getElementById(`contact-news-content-${contactId}`);

            if (response.ok && result.success) {
                if (contentDiv) {
                    this._renderNewsHtml(contactId, result);
                }
                const trendMsg = result.trendCount ? `${result.trendCount} trends, ` : '';
                this.showToast?.(`${trendMsg}${(result.news || []).length} articles fetched`, 'success');
            } else {
                throw new Error(result.error || 'Failed to fetch trends');
            }
        } catch (e) {
            console.error(e);
            this.showToast?.('Error: ' + e.message, 'error');
            const contentDiv = document.getElementById(`contact-news-content-${contactId}`);
            if (contentDiv) contentDiv.innerHTML = `<span style="color:#e53e3e;">Failed to fetch: ${this._contactFormEscape(e.message)}</span>`;
        } finally {
            if (btn) {
                btn.innerHTML = '<i class="fas fa-chart-line" style="font-size:12px;"></i> Trends';
                btn.disabled = false;
            }
        }
    },

    syncSpecificCompany(companyName) {
        // Create overlay
        const overlay = document.createElement("div");
        overlay.style.position = "fixed";
        overlay.style.top = "0";
        overlay.style.left = "0";
        overlay.style.width = "100%";
        overlay.style.height = "100%";
        overlay.style.backgroundColor = "rgba(0,0,0,0.85)";
        overlay.style.color = "#fff";
        overlay.style.display = "flex";
        overlay.style.flexDirection = "column";
        overlay.style.alignItems = "center";
        overlay.style.justifyContent = "center";
        overlay.style.zIndex = "99999";
        overlay.style.fontFamily = "sans-serif";

        const title = document.createElement("h2");
        title.innerText = `Syncing Company Data: ${companyName}`;
        title.style.marginBottom = "20px";
        overlay.appendChild(title);

        const statusMsg = document.createElement("div");
        statusMsg.style.marginBottom = "20px";
        statusMsg.style.fontSize = "16px";
        statusMsg.style.color = "#a29bfe";
        statusMsg.innerText = "Connecting to Google Drive...";
        overlay.appendChild(statusMsg);

        const progressContainer = document.createElement("div");
        progressContainer.style.width = "80%";
        progressContainer.style.maxWidth = "600px";
        progressContainer.style.height = "20px";
        progressContainer.style.backgroundColor = "#333";
        progressContainer.style.borderRadius = "10px";
        progressContainer.style.overflow = "hidden";
        progressContainer.style.marginBottom = "20px";

        const progressBar = document.createElement("div");
        progressBar.style.width = "0%";
        progressBar.style.height = "100%";
        progressBar.style.backgroundColor = "#6c5ce7";
        progressBar.style.transition = "width 0.3s";
        progressContainer.appendChild(progressBar);
        overlay.appendChild(progressContainer);

        const logArea = document.createElement("div");
        logArea.style.width = "80%";
        logArea.style.maxWidth = "600px";
        logArea.style.height = "200px";
        logArea.style.backgroundColor = "#111";
        logArea.style.border = "1px solid #333";
        logArea.style.borderRadius = "5px";
        logArea.style.padding = "10px";
        logArea.style.overflowY = "auto";
        logArea.style.fontSize = "12px";
        logArea.style.fontFamily = "monospace";
        logArea.style.color = "#ccc";
        logArea.style.whiteSpace = "pre-wrap";
        overlay.appendChild(logArea);

        document.body.appendChild(overlay);

        try {
            const es = new EventSource(`/api/sync-company?companyName=${encodeURIComponent(companyName)}`);
            es.onmessage = async (e) => {
                const msg = JSON.parse(e.data);
                if (msg.done) {
                    es.close();
                    statusMsg.innerText = msg.code === 0 ? "Sync Completed!" : `Sync Failed with code ${msg.code}`;
                    statusMsg.style.color = msg.code === 0 ? "#00b894" : "#e17055";
                    progressBar.style.width = "100%";
                    progressBar.style.backgroundColor = msg.code === 0 ? "#00b894" : "#e17055";
                    logArea.innerHTML += `\\n[Process exited with code ${msg.code}]`;
                    logArea.scrollTop = logArea.scrollHeight;

                    setTimeout(() => {
                        document.body.removeChild(overlay);
                        if (msg.code === 0) {
                            // Optionally refresh UI here if needed
                        }
                    }, 3000);
                } else if (msg.msg) {
                    statusMsg.innerText = msg.msg;
                    logArea.innerHTML += `${msg.msg}\\n`;
                    logArea.scrollTop = logArea.scrollHeight;
                    if (msg.processed) {
                        const pct = Math.min(100, Math.max(5, (msg.processed / 20) * 100));
                        progressBar.style.width = `${pct}%`;
                    }
                }
            };
            es.onerror = () => {
                es.close();
                statusMsg.innerText = "Connection lost.";
                statusMsg.style.color = "#e17055";
                setTimeout(() => {
                    document.body.removeChild(overlay);
                }, 3000);
            };
        } catch (err) {
            console.error(err);
            statusMsg.innerText = "Failed to start sync.";
            statusMsg.style.color = "#e17055";
            setTimeout(() => document.body.removeChild(overlay), 3000);
        }
    }
};
