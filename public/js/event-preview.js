export const EventPreviewMixin = {

    _buildArtStyleGalleryHtml(event) {
        const matched = App?._parseArtPhilTagsAll?.(event) || [];
        if (!matched.length) return '';

        // Reverse attachments so the newest ones are always first, regardless of refresh state
        const attachments = [...(event.attachments || [])].reverse();

        const esc = s => String(s ?? '')
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        const addUnique = (arr, url) => {
            if (url && !arr.includes(url)) arr.push(url);
        };
        const normalizeLocalUrl = (url) => {
            if (!url) return '';
            if (/^https:\/\/drive\.google\.com\/uc\?/i.test(url)) return '';
            return this._getAssetUrl ? this._getAssetUrl(url) : url;
        };

        const GROUP_COLOR = {
            'Classical & Traditional': '#8b5cf6',
            'Illustrated & Animation': '#ec4899',
            'Abstract & Modernist': '#3b82f6',
            'Atmospheric & Thematic': '#10b981',
            'Regional & Cultural': '#f59e0b',
            'Pop Culture & Media': '#ef4444',
        };

        // 1. Build local map of grid attachments for this event
        const styleImageMap = new Map();
        attachments.forEach(att => {
            if (!att.title?.match(/\.(png|jpe?g|webp|gif)$/i)) return;
            let slug = att.title.slice(0, att.title.lastIndexOf('.')).toLowerCase();
            // Remove timestamp suffix like _2026_05_30_12_34_56
            slug = slug.replace(/_\d{4}_\d{2}_\d{2}_\d{2}_\d{2}_\d{2}$/, '');
            if (slug.startsWith('grid_')) slug = slug.slice(5);
            // Skip layout/format variants — not art style names
            if (/^(3x3|916)/.test(slug)) return;
            const slugHyphen = slug.replace(/_/g, '-');
            const fileUrl = att.fileUrl || att.iconLink || '';
            const idMatch = fileUrl.match(/\/d\/([a-zA-Z0-9_-]+)/) || fileUrl.match(/id=([a-zA-Z0-9_-]+)/) || fileUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
            const fileId = att.fileId || (idMatch ? idMatch[1] : '');
            if (fileId) {
                const urls = {
                    url1: `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`,
                    url2: `https://lh3.googleusercontent.com/d/${fileId}=w400`,
                    url3: `/api/style-image/${encodeURIComponent(slug.replace(/_/g, ' '))}`,
                };
                styleImageMap.set(slug, urls);
                styleImageMap.set(slugHyphen, urls);
            }
        });

        // 2. Build reverse map of styleName -> tag slug
        const styleToTagSlug = new Map();
        if (App._getHashtagToPhil) {
            const htp = App._getHashtagToPhil();
            for (const [tag, data] of Object.entries(htp)) {
                styleToTagSlug.set(data.style.toLowerCase(), tag.toLowerCase());
            }
        }


        // 3. Robust URL lookup with fallbacks
        const getStyleUrls = (styleName, tagName = '') => {
            const lower = styleName.toLowerCase();
            const hyphen = lower.replace(/[\s\/]+/g, '-').replace(/[^a-z0-9-]/g, '');
            const under = lower.replace(/[\s\/]+/g, '_').replace(/[^a-z0-9_]/g, '');
            const tagLower = (tagName || '').toLowerCase();
            const tagUnder = tagLower.replace(/[\s\/]+/g, '_').replace(/[^a-z0-9_]/g, '');
            const tagHyphen = tagLower.replace(/[\s\/]+/g, '-').replace(/[^a-z0-9-]/g, '');

            // 1. Direct match on this event's grid_ attachments
            const properSlug = styleName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
            for (const key of [lower, hyphen, under, tagLower, tagUnder, tagHyphen, lower.substring(0, 40), hyphen.substring(0, 40), under.substring(0, 40), properSlug, properSlug.substring(0, 40)]) {
                if (key && styleImageMap.has(key)) return styleImageMap.get(key);
            }

            // 2. Reverse philMap: styleName → known tag slug
            const knownTagSlug = styleToTagSlug.get(lower);
            if (knownTagSlug) {
                for (const key of [knownTagSlug, knownTagSlug.replace(/_/g, '-'), knownTagSlug.substring(0, 40), knownTagSlug.replace(/_/g, '-').substring(0, 40)]) {
                    if (styleImageMap.has(key)) return styleImageMap.get(key);
                }
            }

            // 3. Ultimate fallback: API generator for the style name
            return {
                url1: `/api/style-image/${encodeURIComponent(styleName.replace(/_/g, ' '))}`,
                url2: null,
                url3: null
            };
        };

        const gridAttachments = attachments
            .map((att, idx) => ({ att, idx }))
            .filter(({ att }) => att.title?.match(/\.(png|jpe?g|webp|gif)$/i));

        const getAttachmentIndex = (style) => {
            const styleSlug = style.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
            const styleUnder = style.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
            for (const { att, idx } of gridAttachments) {
                let attSlug = att.title.slice(0, att.title.lastIndexOf('.')).toLowerCase();
                attSlug = attSlug.replace(/_\d{4}_\d{2}_\d{2}_\d{2}_\d{2}_\d{2}$/, '');
                if (attSlug.startsWith('grid_')) attSlug = attSlug.slice(5);
                if (attSlug === styleSlug || attSlug === styleUnder ||
                    attSlug === styleSlug.replace(/-/g, '_') || attSlug === styleUnder.replace(/_/g, '-') ||
                    attSlug === styleSlug.substring(0, 40) || attSlug === styleUnder.substring(0, 40) ||
                    attSlug === styleSlug.replace(/-/g, '_').substring(0, 40) || attSlug === styleUnder.replace(/_/g, '-').substring(0, 40)) {
                    return idx;
                }
            }
            return -1; // no attachment
        };

        // Sort: styles with attachments first (newest/first attachment first), then styles without
        matched.sort((a, b) => {
            const idxA = getAttachmentIndex(a.style);
            const idxB = getAttachmentIndex(b.style);
            // Both have attachments — newest (lower index) first
            if (idxA >= 0 && idxB >= 0) return idxA - idxB;
            // Only one has attachment — it goes first
            if (idxA >= 0) return -1;
            if (idxB >= 0) return 1;
            return 0;
        });

        const styleCards = matched.map(({ tag, group, style }) => {
            const color = GROUP_COLOR[group] || '#555';
            const filterVal = `p:style:${group}:${style}`;
            const urls = getStyleUrls(style, tag);

            const gridAtt = attachments.find(a => {
                if (!a.title?.match(/\.(png|jpe?g|webp|gif)$/i)) return false;
                let attSlug = a.title.slice(0, a.title.lastIndexOf('.')).toLowerCase();
                attSlug = attSlug.replace(/_\d{4}_\d{2}_\d{2}_\d{2}_\d{2}_\d{2}$/, '');
                if (attSlug.startsWith('grid_')) attSlug = attSlug.slice(5);
                const styleSlug = style.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
                const styleUnder = style.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
                return attSlug === styleSlug || attSlug === styleUnder ||
                    attSlug === styleSlug.replace(/-/g, '_') || attSlug === styleUnder.replace(/_/g, '-') ||
                    attSlug === styleSlug.substring(0, 40) || attSlug === styleUnder.substring(0, 40) ||
                    attSlug === styleSlug.replace(/-/g, '_').substring(0, 40) || attSlug === styleUnder.replace(/_/g, '-').substring(0, 40);
            });
            const gridFileId = gridAtt?.fileId || '';
            const gridTitle = gridAtt?.title || `grid_${style.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.png`;
            const eventId = event.id || '';

            // Build image source fallback chain: generated attachment first, then Drive/API fallbacks.
            let gridFileUrl = gridAtt?.fileUrl || '';
            if (gridFileUrl.includes('drive.google.com')) gridFileUrl = '';
            const localUrl = normalizeLocalUrl(gridAtt?.localUrl || gridFileUrl || '');
            const driveUrl = (urls?.url1 && !urls.url1.startsWith('/api/')) ? urls.url1 : '';
            const lh3Url = (urls?.url2 && !urls.url2.startsWith('/api/')) ? urls.url2 : '';
            const apiUrl = urls?.url3 || (urls?.url1?.startsWith('/api/') ? urls.url1 : '');

            // Priority: local cached image -> Drive thumbnail -> lh3 direct link -> API generator.
            const imgSources = [];
            addUnique(imgSources, localUrl);
            addUnique(imgSources, driveUrl);
            addUnique(imgSources, lh3Url);
            addUnique(imgSources, apiUrl);

            if (!imgSources.length) return null;

            return `<div class="style-card" data-style="${esc(style)}"
            onclick="App._onArtStyleClick && App._onArtStyleClick('${esc(filterVal)}')"
            title="Filter by: ${esc(style)}"
            style="flex:0 0 auto;width:220px;border-radius:8px;overflow:hidden;cursor:pointer;
                   border:2px solid transparent;transition:all .15s;
                   background:#1a1a2e;position:relative;">

            <div style="width:100%;height:140px;background:#111;position:relative;overflow:hidden;">
                <img src="${esc(imgSources[0])}"
                    data-sources="${esc(JSON.stringify(imgSources))}"
                    data-drive-url="${esc(driveUrl || lh3Url || '')}"
                    data-api-url="${esc(apiUrl || '')}"
                    data-src-idx="0"
                    style="width:100%;height:140px;object-fit:cover;display:block;
                           transition:opacity .3s;opacity:0;"
                    onload="this.style.opacity='1'"
                    onerror="
                        const srcs = JSON.parse(this.dataset.sources || '[]');
                        const next = (this.dataset.srcIdx | 0) + 1;
                        if (next < srcs.length) {
                            this.dataset.srcIdx = next;
                            this.src = srcs[next];
                        } else {
                            this.style.display='none';
                        }"
                    />

                <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;
                            justify-content:center;z-index:0;pointer-events:none;">
                    <i class="fas fa-palette" style="font-size:22px;color:rgba(255,255,255,0.08);pointer-events:none;"></i>
                </div>
            </div>

            <div style="position:absolute;inset:0;background:linear-gradient(to bottom,transparent 40%,rgba(0,0,0,0.85) 100%);pointer-events:none;"></div>

            <div style="position:absolute;bottom:0;left:0;right:0;padding:6px 8px;pointer-events:none;">
                <div style="font-size:9px;color:${color};text-transform:uppercase;letter-spacing:.7px;
                            font-weight:700;margin-bottom:1px;white-space:nowrap;overflow:hidden;
                            text-overflow:ellipsis;">#${esc(tag)}</div>
                <div style="font-size:11px;color:#fff;font-weight:600;white-space:nowrap;
                            overflow:hidden;text-overflow:ellipsis;">${esc(style)}</div>
                <div style="font-size:9px;color:rgba(255,255,255,.55);white-space:nowrap;
                            overflow:hidden;text-overflow:ellipsis;text-transform:uppercase;
                            letter-spacing:.5px;">${esc(group)}</div>
            </div>

            <!-- Top-right action buttons -->
            <div style="position:absolute;top:6px;right:6px;display:flex;gap:4px;">
                <div onclick="event.stopPropagation(); App.openManualGenModal('${eventId}', '${esc(style).replace(/&#39;/g, "\\\\'")}', '${esc(imgSources[0])}')"
                     title="Open in Manual Generator"
                     style="background:rgba(0,120,212,0.7);backdrop-filter:blur(4px);border-radius:4px;
                            padding:2px 5px;font-size:8px;color:#fff;cursor:pointer;">
                    <i class="fas fa-wand-magic-sparkles" style="font-size:7px;"></i> Customize                </div>
                <div onclick="App._onArtStyleClick && App._onArtStyleClick('${esc(filterVal)}')"
                     style="background:rgba(0,0,0,.5);backdrop-filter:blur(4px);border-radius:4px;
                            padding:2px 5px;font-size:8px;color:rgba(255,255,255,.8);cursor:pointer;">
                    <i class="fas fa-filter" style="font-size:7px;"></i> Filter
                </div>
                <div onclick="event.stopPropagation(); App._setAsCoverImage('${esc(imgSources[0])}', '${esc(eventId)}', this)"
                     title="Set as Cover Image"
                     style="background:rgba(16,185,129,0.7);backdrop-filter:blur(4px);border-radius:4px;
                            padding:2px 5px;font-size:8px;color:#fff;cursor:pointer;">
                    <i class="fas fa-image" style="font-size:7px;"></i> Cover
                </div>
                ${gridAtt ? `<div onclick="event.stopPropagation(); App._deleteStyleImage('${esc(gridFileId)}', '${esc(gridTitle)}', '${esc(eventId)}', this)"
                     title="Delete this style image from event"
                     style="background:rgba(180,30,30,.7);backdrop-filter:blur(4px);border-radius:4px;
                            padding:2px 5px;font-size:8px;color:#fff;cursor:pointer;">
                    <i class="fas fa-trash" style="font-size:7px;"></i>
                </div>` : ''}
            </div>
        </div>`;
        }).filter(Boolean).join('');

        if (!styleCards) return '';

        return `<div style="margin-bottom:14px;">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;">
                <i class="fas fa-palette" style="font-size:11px;color:#888;"></i>
                <span style="font-size:11px;font-weight:700;color:#888;text-transform:uppercase;
                             letter-spacing:.8px;">Visual Styles</span>
                <span style="font-size:10px;color:#bbb;margin-left:2px;">
                    ${matched.length} styles identified · click to filter
                </span>
            </div>

            <!-- Carousel wrapper -->
            <div style="position:relative;">

                <!-- Left arrow -->
                <button onclick="(function(btn){
                            const strip = btn.parentElement.querySelector('.vs-strip');
                            strip.scrollBy({ left: -340, behavior: 'smooth' });
                        })(this)"
                        style="position:absolute;left:-4px;top:50%;transform:translateY(-50%);
                               z-index:2;background:rgba(0,0,0,0.55);
                               border:1px solid rgba(255,255,255,0.15);
                               border-radius:50%;width:28px;height:28px;
                               display:flex;align-items:center;justify-content:center;
                               cursor:pointer;color:#fff;font-size:14px;line-height:1;
                               transition:background .15s;padding:0;"
                        onmouseenter="this.style.background='rgba(0,0,0,0.85)'"
                        onmouseleave="this.style.background='rgba(0,0,0,0.55)'">&#8249;</button>

                <!-- Card strip — no visible scrollbar -->
                <div class="vs-strip"
                     style="display:flex;gap:8px;
                            overflow-x:auto;overflow-y:visible;
                            scroll-behavior:smooth;
                            padding:4px 24px;
                            scrollbar-width:none;-ms-overflow-style:none;">
                    ${styleCards}
                </div>

                <!-- Right arrow -->
                <button onclick="(function(btn){
                            const strip = btn.parentElement.querySelector('.vs-strip');
                            strip.scrollBy({ left: 340, behavior: 'smooth' });
                        })(this)"
                        style="position:absolute;right:-4px;top:50%;transform:translateY(-50%);
                               z-index:2;background:rgba(0,0,0,0.55);
                               border:1px solid rgba(255,255,255,0.15);
                               border-radius:50%;width:28px;height:28px;
                               display:flex;align-items:center;justify-content:center;
                               cursor:pointer;color:#fff;font-size:14px;line-height:1;
                               transition:background .15s;padding:0;"
                        onmouseenter="this.style.background='rgba(0,0,0,0.85)'"
                        onmouseleave="this.style.background='rgba(0,0,0,0.55)'">&#8250;</button>
            </div>
        </div>`;
    },

    async _deleteStyleImage(fileId, filename, eventId, btnEl) {
        if (!filename || !eventId) {
            alert('Missing attachment info — cannot delete.');
            return;
        }

        if (!confirm(`Delete style image "${filename}" from this event? This cannot be undone.`)) return;

        // Show spinner on the button
        const origHtml = btnEl.innerHTML;
        btnEl.innerHTML = '<i class="fas fa-circle-notch fa-spin" style="font-size:7px;"></i>';
        btnEl.style.pointerEvents = 'none';

        try {
            const serverUrl = this._getServerUrl();
            const res = await fetch(`${serverUrl}/api/google/calendar/event/${eventId}/attachment`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileId, filename })
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || `HTTP ${res.status}`);
            }

            // Remove card from UI immediately
            const card = btnEl.closest('.style-card');
            if (card) {
                card.style.transition = 'opacity .3s, transform .3s';
                card.style.opacity = '0';
                card.style.transform = 'scale(0.85)';
                setTimeout(() => card.remove(), 300);
            }

            // Update in-memory event attachments
            const removeAtt = (items) => {
                const ev = (items || []).find(e => e.id === eventId);
                if (ev?.attachments) {
                    ev.attachments = ev.attachments.filter(a => a.title !== filename && a.fileId !== fileId);
                }
            };
            removeAtt(window.cloudmailLatestEvents?.items);
            removeAtt(window.cloudmailCustomEvents);

            console.log(`[Delete] ✅ Removed ${filename} from event ${eventId}`);
        } catch (e) {
            console.error('[Delete] Failed:', e);
            alert('Failed to delete: ' + e.message);
            btnEl.innerHTML = origHtml;
            btnEl.style.pointerEvents = '';
        }
    },

    async _setAsCoverImage(imageUrl, eventId, btnEl) {
        if (!imageUrl || !eventId) {
            alert('Missing image URL or event ID.');
            return;
        }

        // Show spinner on the button
        const origHtml = btnEl.innerHTML;
        btnEl.innerHTML = '<i class="fas fa-circle-notch fa-spin" style="font-size:7px;"></i>';
        btnEl.style.pointerEvents = 'none';

        try {
            const serverUrl = this._getServerUrl ? this._getServerUrl() : (App._getServerUrl ? App._getServerUrl() : '');
            const uploadRes = await fetch(`${serverUrl}/api/google/calendar/event/${eventId}/attachment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    imageUrl: imageUrl,
                    filename: 'cover.png'
                })
            });

            if (!uploadRes.ok) {
                const err = await uploadRes.json().catch(() => ({}));
                throw new Error(err.error || `HTTP ${uploadRes.status}`);
            }

            console.log(`[Cover] ✅ Uploaded cover image to Google Calendar event`);

            // Give a success indication
            btnEl.innerHTML = '<i class="fas fa-check" style="font-size:7px;"></i>';
            setTimeout(() => {
                btnEl.innerHTML = origHtml;
                btnEl.style.pointerEvents = '';
            }, 2000);

            // Refresh the calendar event to show the new cover
            if (typeof App !== 'undefined' && App.updateEvent) {
                App.updateEvent(eventId);
            } else if (this.updateEvent) {
                this.updateEvent(eventId);
            }

        } catch (e) {
            console.error('[Cover] Failed:', e);
            alert('Failed to save image to folder: ' + e.message);
            btnEl.innerHTML = origHtml;
            btnEl.style.pointerEvents = '';
        }
    },

    async openCalendarPreview(emailId, autoUnmute = false) {
        console.log('App.openCalendarPreview called with ID:', emailId);
        if (!emailId) return;

        this.state.calendar.previewEmailId = emailId;

        let email = this.state.emails.find(e => e.id === emailId);

        if (!email) {
            const customEvents = JSON.parse(localStorage.getItem('cloudmail_events') || '[]');
            const googleEvent = customEvents.find(e => e.id === emailId && e.isGoogleSync);
            const latestEvent = window.cloudmailLatestEvents?.items?.find(e => e.id === emailId);

            if (latestEvent) {
                let subject = latestEvent.summary || 'Calendar Event';
                const extTitle = latestEvent.extendedProperties?.private?.title || latestEvent.extendedProperties?.shared?.title;
                if (extTitle) subject = extTitle;

                email = {
                    id: latestEvent.id,
                    subject: subject,
                    from: 'Calendar Events <calendar@system>',
                    to: 'me',
                    date: latestEvent.start?.dateTime || latestEvent.start?.date || new Date().toISOString(),
                    isAllDay: !!latestEvent.start?.date,
                    bodyHtml: (latestEvent.description || '<i>No description provided.</i>').replace(/\\n/g, '<br/>'),
                    attachments: latestEvent.attachments || [],
                    isGoogleSync: true,
                    location: latestEvent.location || '',
                    wikiTags: latestEvent.wikiTags
                };
            } else if (googleEvent) {
                let isAllDay = googleEvent.isAllDay;
                if (isAllDay === undefined) {
                    isAllDay = googleEvent.isGoogleSync && !(/d{1,2}:d{2}/.test(googleEvent.title || ''));
                }
                email = {
                    id: googleEvent.id,
                    subject: googleEvent.title,
                    from: 'Google Calendar Sync <calendar@google.com>',
                    to: 'me',
                    date: googleEvent.date,
                    isAllDay: !!isAllDay,
                    bodyHtml: (googleEvent.description || '<i>No description provided.</i>').replace(/n/g, '<br/>'),
                    attachments: googleEvent.attachments || [],
                    isGoogleSync: true,
                    location: googleEvent.location || '',
                    wikiTags: googleEvent.wikiTags
                };
            }
        }

        if (!email) { console.error('Email not found for preview:', emailId); return; }

        if (!email.tags && email.isGoogleSync) {
            const customEvents = JSON.parse(localStorage.getItem('cloudmail_events') || '[]');
            const googleEvent = customEvents.find(e => e.id === email.id && e.isGoogleSync);
            if (googleEvent?.tags) email.tags = googleEvent.tags;
        }

        if (!email.isGoogleSync && !email.bodyHtml && !email.html && email.path && !email._fullLoaded) {
            try {
                const fetchUrl = email.path.startsWith('/') ? email.path : '/' + email.path;
                const res = await window.fetch(fetchUrl);
                if (res.ok) { Object.assign(email, await res.json()); email._fullLoaded = true; }
            } catch (e) { console.error('Error fetching full email for calendar preview', e); }
        }

        const panel = document.getElementById('calendar-preview-panel');
        const content = document.getElementById('calendar-preview-content');
        if (!panel || !content) return;

        const dateStr = this.formatDate ? this.formatDate(email.date) : new Date(email.date).toLocaleString();
        let bodyHtml = email.bodyHtml || email.html || '';
        if (!bodyHtml) bodyHtml = (email.body || email.text || email.preview || '').replace(/n/g, '<br/>');

        const isDarkMode = document.body.classList.contains('dark-mode');

        let toStr = '';
        if (Array.isArray(email.to)) {
            toStr = email.to.map(t => { const n = this.extractName(t), a = this.extractEmail(t); return n ? `${n} <${a}>` : a; }).join(', ');
        } else {
            const n = this.extractName(email.to || email.to_email), a = this.extractEmail(email.to || email.to_email);
            toStr = n ? `${n} <${a}>` : a;
        }

        const fromStr = (() => { const n = this.extractName(email.from), a = this.extractEmail(email.from); return n ? `${n} <${a}>` : a; })();

        const checkDateObj = new Date(email.date);
        const y = checkDateObj.getUTCFullYear();
        const m = String(checkDateObj.getUTCMonth() + 1).padStart(2, '0');
        const d = String(checkDateObj.getUTCDate()).padStart(2, '0');
        const dateValue = parseInt(`${y}${m}${d}`);
        const hostname = this.getHostnameForDate(email.date);

        let websitePreviewHtml = '';
        if (dateValue >= 20251201) {
            const url = `https://${hostname}/${y}/${m}/${y}-${m}-${d}/`;
            websitePreviewHtml = `<div style="margin-bottom: 15px; border: 1px solid ${isDarkMode ? '#444' : '#eee'}; border-radius: 8px; overflow: hidden; background: ${isDarkMode ? '#333' : '#f8f9fa'};">
                <div style="padding: 12px; display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="width: 32px; height: 32px; background: #0078d4; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: white;"><i class="fas fa-globe" style="font-size: 16px;"></i></div>
                        <div><div style="font-weight: 600; font-size: 13px;">Website Overview</div><div style="font-size: 11px; color: #666;">${hostname}</div></div>
                    </div>
                    <a href="${url}" target="_blank" style="background: #0078d4; color: white; border: none; padding: 6px 12px; border-radius: 4px; font-size: 11px; font-weight: 600; text-decoration: none;">Open <i class="fas fa-external-link-alt" style="font-size: 10px;"></i></a>
                </div>
            </div>`;
        }

        console.log('HLS check:', { isAllDay: email.isAllDay, subject: email.subject, dateValue });
        let mediaHtml = '';



        if (dateValue >= 20260113) {
            const subjectTrim = (email.subject || '').trim();
            if (email.isAllDay) {
                const baseViews = parseInt(dateValue) * 17 % 900 + 120;
                const totalViews = (baseViews * 1000) + (parseInt(dateValue) * 13 % 1000);

                // Look up music style for this event date
                const eventDateStr = email.date || email.start?.date || (email.start?.dateTime || '').substring(0, 10) || '';
                const musicStyles = (App?._MS_EVENT_MAP?.[eventDateStr] || email.musicStyles || []);
                const musicBadgesHtml = musicStyles.length > 0
                    ? `<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                        ${musicStyles.map(s => `<span onclick="App.setMusicStyleFilter('${this.escape(s)}'); event.stopPropagation();" style="
                            cursor:pointer;display:inline-flex;align-items:center;gap:4px;
                            background:linear-gradient(135deg,#f59e0b22,#f59e0b11);
                            border:1px solid #f59e0b55;color:#d97706;
                            border-radius:12px;padding:2px 9px;font-size:11px;font-weight:600;
                        "><i class="fas fa-music" style="font-size:9px;"></i>${this.escape(s)}</span>`).join('')}
                       </div>`
                    : '';

                mediaHtml += `<div id="hls-player-container" style="margin-bottom: 15px; background: #000; border-radius: 8px; overflow: hidden; display: none;">
                    <video id="hls-video-player" controls autoplay ${autoUnmute ? '' : 'muted'} style="width: 100%; display: block; max-height: 400px;"></video>
                    <div style="background: ${isDarkMode ? '#2d2d2d' : '#fff'}; padding: 10px 15px; display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap;">
                        <span style="font-weight: 600; font-size: 14px;">${this.escape(email.subject || 'The Day in History')}</span>
                        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
                            ${musicBadgesHtml}
                            <span style="font-size: 13px; color: #666;"><i class="fas fa-eye" style="margin-right: 4px;"></i>${totalViews.toLocaleString()} views</span>
                            <button id="btn-hls-download" onclick="event.stopPropagation(); App.downloadHlsVideo()" style="background:linear-gradient(135deg,#0078d4,#005a9e);color:#fff;border:none;padding:5px 12px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:5px;transition:opacity .15s;" onmouseenter="this.style.opacity='0.85'" onmouseleave="this.style.opacity='1'" title="Download as MP4"><i class="fas fa-download" style="font-size:11px;"></i> MP4</button>
                        </div>
                    </div>
                </div>`;

            }

            if (email.attachments?.length > 0) {
                email.attachments.forEach(att => {
                    const src = att.localUrl ? (this._getAssetUrl ? this._getAssetUrl(att.localUrl) : att.localUrl) : (this.getDirectDriveUrl ? this.getDirectDriveUrl(att.fileUrl || '') : (att.fileUrl || ''));
                    const isVideo = att.mimeType?.startsWith('video/') || att.title?.toLowerCase().endsWith('.mp4');
                    const isAudio = att.mimeType?.startsWith('audio/') || att.title?.toLowerCase().endsWith('.mp3');
                    if (isVideo) {
                        let videoPlayerHtml = '';
                        if (src.includes('drive.google.com')) {
                            const idMatch = src.match(/\/d\/([^/?#]+)/) || src.match(/[?&]id=([^&?#]+)/) || src.match(/\/file\/d\/([^/?#]+)/);
                            const finalId = att.fileId || (idMatch ? idMatch[1] : null);
                            if (finalId) {
                                videoPlayerHtml = `<iframe src="https://drive.google.com/file/d/${finalId}/preview" width="100%" height="400" frameborder="0" allow="autoplay; fullscreen" allowfullscreen style="display:block; border:none; background:#000;"></iframe>`;
                            } else {
                                videoPlayerHtml = `<video controls autoplay style="width: 100%; display: block; max-height: 400px;"><source src="${src}" type="${att.mimeType || 'video/mp4'}"></video>`;
                            }
                        } else {
                            videoPlayerHtml = `<video controls autoplay style="width: 100%; display: block; max-height: 400px;"><source src="${src}" type="${att.mimeType || 'video/mp4'}"></video>`;
                        }
                        
                        mediaHtml += `<div style="margin-bottom: 15px; background: #000; border-radius: 8px; overflow: hidden;">
                            ${videoPlayerHtml}
                            <div style="background: ${isDarkMode ? '#2d2d2d' : '#fff'}; padding: 12px 15px;"><span style="font-weight: 600; font-size: 13px;">${this.escape(att.title || 'Video')}</span></div>
                        </div>`;
                    } else if (isAudio) {
                        mediaHtml += `<div style="margin-bottom: 15px; background: ${isDarkMode ? '#333' : '#f1f3f4'}; padding: 10px; border-radius: 8px;">
                            <audio controls autoplay style="width: 100%;"><source src="${src}" type="${att.mimeType || 'audio/mpeg'}"></audio>
                            <div style="font-size: 11px; color: #666; margin-top: 5px; text-align: center;">${this.escape(att.title)}</div>
                        </div>`;
                    }
                });
            }
        }

        let emailHeaderHtml = '';
        let tagsHtml = '';
        if (!email.isGoogleSync) {
            emailHeaderHtml = `<div style="padding: 12px 15px; border-bottom: 1px solid ${isDarkMode ? '#444' : '#eee'}; background: ${isDarkMode ? '#2d2d2d' : '#f8f9fa'}; margin-bottom: 10px; border-radius: 8px;">
                <div style="font-weight: 600; font-size: 15px; margin-bottom: 8px;">${this.escape(email.subject || '(No Subject)')}</div>
                <div style="font-size: 13px; color: #555; margin-bottom: 4px;"><strong>From:</strong> ${this.escape(fromStr)}</div>
                <div style="font-size: 13px; color: #555; margin-bottom: 4px;"><strong>To:</strong> ${this.escape(toStr)}</div>
                <div style="font-size: 13px; color: #555;"><strong>Date:</strong> ${this.escape(dateStr)}</div>
            </div>`;
        } else {
            let emailTags = email.tags;
            if (!emailTags && email.bodyHtml) emailTags = this.parseTagsFromDescription(email.bodyHtml.replace(/<[^>]+>/g, ' '));
            tagsHtml = '';
            if (emailTags) {
                const mkPill = (color, icon, text, filterType, filterVal) =>
                    `<span onclick="document.getElementById('calendar-tag-${filterType}').value='${this.escape(filterVal)}'; App.applyTagFilters(); window.location.hash='${this.escape(text).replace(/&#39;/g, "\\'")}'" style="cursor: pointer; display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; background: ${color}22; color: ${color}; border-radius: 12px; font-size: 11px; font-weight: 600; margin-right: 6px; margin-top: 6px; border: 1px solid ${color};" title="Filter by: ${this.escape(text)}"><i class="fas ${icon}"></i>${this.escape(text)}</span>`;
                
                // Area pill with edit button
                if (emailTags.area && emailTags.area !== 'Unknown') {
                    tagsHtml += mkPill('#0078d4', 'fa-globe', emailTags.area, 'area', emailTags.area);
                    tagsHtml += `<button onclick="event.stopPropagation(); App._showTagEditor('${email.id}', 'area', '${this.escape(emailTags.area)}')" style="background:none;border:none;cursor:pointer;padding:2px;margin-top:6px;color:#0078d4;font-size:10px;" title="Edit Area"><i class="fas fa-pen"></i></button>`;
                }
                // Type pill with edit button
                if (emailTags.type) {
                    const typeParts = emailTags.type.split(' - ');
                    tagsHtml += mkPill('#107c10', 'fa-paw', typeParts.map(p => p.trim()).join(' › '), 'type', this.escape(emailTags.type));
                    tagsHtml += `<button onclick="event.stopPropagation(); App._showTagEditor('${email.id}', 'type', '${this.escape(emailTags.type).replace(/&#39;/g, "\\'")}')" style="background:none;border:none;cursor:pointer;padding:2px;margin-top:6px;color:#107c10;font-size:10px;" title="Edit Type"><i class="fas fa-pen"></i></button>`;
                }
                if (emailTags.themes) emailTags.themes.forEach(t => tagsHtml += mkPill('#d13438', 'fa-tag', t, 'theme', t));
                
                const wikiTags = email.wikiTags || email._rawItem?.wikiTags || emailTags.wikiTags;
                if (wikiTags && wikiTags.main) {
                    tagsHtml += `<span onclick="App.setWikiCategoryFilter('main', '${this.escape(wikiTags.main)}'); window.location.hash='${this.escape(wikiTags.main)}'" style="cursor: pointer; display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; background: #f3f4f6; color: #374151; border-radius: 12px; font-size: 11px; font-weight: 600; margin-right: 6px; margin-top: 6px; border: 1px solid #d1d5db;" title="Filter by: ${this.escape(wikiTags.main)}"><i class="fab fa-wikipedia-w"></i>${this.escape(wikiTags.main)}</span>`;
                }

                if (tagsHtml) tagsHtml = `<div style="margin-top: 8px; display: flex; flex-wrap: wrap; align-items: center;">${tagsHtml}</div>`;
            }
            const characterName = email.subject || '';
            const charType = emailTags?.type || '';
            const charLocation = email.location || '';

            const gridCount = (email.attachments || []).filter(a => a.title && a.title.match(/\.(png|jpe?g|webp|gif)$/i)).length;

            const coverAtt = (email.attachments || []).find(a => a.title === 'cover.png');
            const coverUrl = coverAtt ? (coverAtt.localUrl
                || (coverAtt.fileId ? this._getAssetUrl(`/images/calendar/${coverAtt.fileId}.jpg`) : '')
                || (coverAtt.fileId ? `https://drive.google.com/thumbnail?id=${coverAtt.fileId}&sz=w400` : '')
                || coverAtt.fileUrl || '') : '';

            let generateBtnHtml = '';
            generateBtnHtml = `<div style="display:flex;gap:4px;">
                <button onclick="App.suggestArtStyles('${this.escape(characterName).replace(/&#39;/g, "\\'")}', '${this.escape(charType).replace(/&#39;/g, "\\'")}', '${this.escape(charLocation).replace(/&#39;/g, "\\'")}', '${email.id || ''}')" style="background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; border-radius: 4px; font-size: 11px; font-weight: bold; padding: 4px 10px; cursor: pointer; white-space: nowrap;" title="Auto Generate Styles"><i class="fas fa-wand-magic-sparkles" style="margin-right: 4px;"></i> Auto</button>
                <button onclick="App.openManualGenModal('${email.id || ''}', '${this.escape(characterName).replace(/&#39;/g, "\\'")}', '${this.escape(coverUrl).replace(/&#39;/g, "\\'")}')" style="background: #fdf2f8; color: #be185d; border: 1px solid #fbcfe8; border-radius: 4px; font-size: 11px; font-weight: bold; padding: 4px 10px; cursor: pointer; white-space: nowrap;" title="Manual Generate"><i class="fas fa-paint-brush" style="margin-right: 4px;"></i> Customize</button>
            </div>`;

            emailHeaderHtml = `<div style="padding: 12px 15px; border-bottom: 1px solid ${isDarkMode ? '#444' : '#eee'}; background: ${isDarkMode ? '#2d2d2d' : '#f8f9fa'}; margin-bottom: 10px; border-radius: 8px; display: flex; justify-content: space-between; align-items: flex-start;">
                <div style="flex: 1;">
                    <div style="font-weight: 600; font-size: 15px; margin-bottom: 4px;">${this.escape(email.subject || '(No Subject)')}</div>
                </div>
                <div style="margin-left: 15px; flex-shrink: 0;">
                    ${generateBtnHtml}
                </div>
            </div>`;
        }

        content.innerHTML = `<div style="padding: 0 5px; flex: 1; display:flex; flex-direction:column; min-height: 400px; overflow-y: auto;">
                ${emailHeaderHtml}

                ${/* HLS video / audio players FIRST */mediaHtml}

                ${/* Art style gallery with grid images SECOND */(() => {
                const rawEv = window.cloudmailLatestEvents?.items?.find(e => e.id === emailId) || email;
                return rawEv ? this._buildArtStyleGalleryHtml(rawEv) : '';
            })()}

                <div id="calendar-mini-map" style="height: 180px; width: 100%; border-radius: 8px; margin-bottom: 10px; display: none; overflow: hidden; border: 1px solid #eee;"></div>
                <div id="calendar-location-wrapper" style="display: none; align-items: center; justify-content: space-between; margin-bottom: 15px; font-size: 13px; color: #555; background: ${isDarkMode ? '#2d2d2d' : '#f8f9fa'}; border-radius: 8px; padding: 8px 12px; border: 1px solid ${isDarkMode ? '#444' : '#eee'};">
                    <div style="display: flex; align-items: center; gap: 8px; flex: 1; overflow: hidden;">
                       <i class="fas fa-map-marker-alt" style="color: #E63946;"></i>
                       <span id="calendar-location-text" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 600;"></span>
                    </div>
                    <div style="display: flex; gap: 10px; margin-left: 10px;">
                        <button onclick="App.updateEvent ? App.updateEvent('${email.id}') : console.log('Update event clicked')" style="background: #0078d4; color: white; border: none; padding: 6px 12px; border-radius: 4px; font-size: 11px; cursor: pointer; white-space: nowrap;"><i class="fas fa-sync-alt"></i> Update</button>
                        <button onclick="App.promptEditLocation('${email.id}')" style="background: #0078d4; color: white; border: none; padding: 6px 12px; border-radius: 4px; font-size: 11px; cursor: pointer; white-space: nowrap;"><i class="fas fa-edit"></i> Edit Location</button>
                    </div>
                </div>
                ${websitePreviewHtml}
                <div style="flex: 1; display:flex; flex-direction:column; min-height: 400px;">
                    <iframe id="calendar-preview-frame" style="width: 100%; height: 100%; flex: 1; border: none; background: ${isDarkMode ? 'transparent' : '#fff'};"></iframe>
                </div>
                ${tagsHtml ? `<div style="padding: 8px 15px; margin-top: 6px; border-top: 1px solid ${isDarkMode ? '#444' : '#eee'};">${tagsHtml}</div>` : ''}
            </div>`;

        const jBtn = document.getElementById('btn-calendar-delete');
        const plBtn = document.getElementById('btn-save-playlist');
        const isHlsEvent = email.isAllDay && dateValue >= 20260113;
        if (jBtn) isHlsEvent ? jBtn.classList.add('hidden') : jBtn.classList.remove('hidden');
        if (plBtn) plBtn.classList.remove('hidden');

        const ssBtn = document.getElementById('btn-slideshow');
        if (ssBtn) ssBtn.classList.remove('hidden');

        panel.style.display = '';
        panel.classList.add('active');
        if (this.state.calendar.view === 'week') {
            this.state.calendar.targetDayOfWeek = new Date(email.date).getDay();
            this.renderCalendar();
        }

        setTimeout(() => {
            const video = document.getElementById('hls-video-player');
            const hlsContainer = document.getElementById('hls-player-container');
            if (video && typeof Hls !== 'undefined') {
                const hlsPaths = [
                    `https://${hostname}/${y}/${m}/${y}-${m}-${d}/videos/intro_video-1080p/playlist.m3u8`,
                    `https://${hostname}/${y}/${m}/${y}-${m}-${d}/videos/index.m3u8`,
                    `https://${hostname}/${y}/${m}/${y}-${m}-${d}/index.m3u8`
                ];
                const tryLoadHls = (url) => new Promise((resolve, reject) => {
                    if (Hls.isSupported()) {
                        const hls = new Hls();
                        hls.on(Hls.Events.ERROR, (event, data) => { if (data.fatal) { hls.destroy(); reject(); } });
                        hls.loadSource(url);
                        hls.attachMedia(video);
                        hls.on(Hls.Events.MANIFEST_PARSED, () => resolve());
                    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                        video.src = url;
                        video.addEventListener('loadedmetadata', () => resolve(), { once: true });
                        video.addEventListener('error', () => reject(), { once: true });
                    } else { reject(); }
                });
                (async () => {
                    for (const url of hlsPaths) {
                        try { await tryLoadHls(url); hlsContainer.style.display = 'block'; hlsContainer.dataset.activeHlsUrl = url; video.muted = !autoUnmute; video.play().catch(() => { }); return; } catch (e) { }
                    }
                })();
                video.onended = () => { if (App.state.activePlaylist) App.playNextInPlaylist(); };
            }

            const iframe = document.getElementById('calendar-preview-frame');
            if (iframe) {
                try {
                    const doc = iframe.contentWindow.document;
                    doc.open();
                    doc.write(`<html><head><style>body { font-family: -apple-system, sans-serif; font-size: 13px; line-height: 1.5; padding: 10px; margin: 0; color: ${isDarkMode ? '#ddd' : '#333'}; background: ${isDarkMode ? '#222' : '#fff'}; } a { color: #0056b3; } img { max-width: 100%; } blockquote { margin: 0 0 0 10px; padding-left: 10px; border-left: 3px solid #ccc; color: #666; }</style></head><body>${bodyHtml}</body></html>`);
                    doc.close();
                } catch (e) { console.error('Error writing to preview iframe:', e); }
            }

            const candidateDateStr = (email.date || '').split(/[Ts]/)[0];
            if (candidateDateStr) {
                this.state.calendar.currentDate = new Date(candidateDateStr + 'T12:00:00');
                this.renderCalendar();

                const latestEvent = window.cloudmailLatestEvents?.items?.find(e => e.id === emailId);
                const miniMapContainer = document.getElementById('calendar-mini-map');
                const locWrapper = document.getElementById('calendar-location-wrapper');
                const locText = document.getElementById('calendar-location-text');

                if (latestEvent || email) {
                    const ev = latestEvent || email;
                    let lat = ev.extendedProperties?.private?.lat;
                    let lng = ev.extendedProperties?.private?.lng;

                    if (locWrapper && locText) {
                        locWrapper.style.display = 'flex';
                        locText.textContent = ev.location || 'No location set';
                    }

                    if (lat === undefined || lng === undefined) {
                        const locStr = (ev.location || '').trim();
                        const coordsMatch = locStr.match(/^([-+]?[0-9]*\.?[0-9]+)\s*,\s*([-+]?[0-9]*\.?[0-9]+)$/);
                        if (coordsMatch) {
                            lat = parseFloat(coordsMatch[1]);
                            lng = parseFloat(coordsMatch[2]);
                        } else {
                            const coords = this.resolveLocationCoords ? this.resolveLocationCoords(ev.location) : null;
                            if (coords) [lat, lng] = coords;
                        }
                    }

                    if (lat !== undefined && lng !== undefined) {
                        let zoom = 6;
                        let mainZoom = 5;

                        const resolved = this._resolveArea ? this._resolveArea(null, ev.location) : null;
                        if (resolved && resolved.area === 'Africa') {
                            const locLower = (ev.location || '').toLowerCase().trim();
                            if (locLower === 'africa' || (Math.abs(lat - 0) < 0.1 && Math.abs(lng - 20) < 0.1)) {
                                zoom = 4;
                                mainZoom = 4;
                            } else {
                                zoom = 5;
                                mainZoom = 5;
                            }
                        }

                        if (this.state.calendar.map) {
                            this.state.calendar.map.flyTo({ center: [parseFloat(lng), parseFloat(lat)], zoom: mainZoom, speed: 1.2, curve: 1.42, essential: true });
                        }

                        if (miniMapContainer && typeof maplibregl !== 'undefined') {
                            miniMapContainer.style.display = 'block';
                            const miniMap = new maplibregl.Map({
                                container: 'calendar-mini-map',
                                style: { version: 8, sources: { 'osm': { type: 'raster', tiles: ['https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png'], tileSize: 256 } }, layers: [{ id: 'osm', type: 'raster', source: 'osm', minzoom: 0, maxzoom: 19 }] },
                                center: [parseFloat(lng), parseFloat(lat)],
                                zoom: zoom,
                                interactive: true
                            });
                            new maplibregl.Marker({ color: '#E63946' }).setLngLat([parseFloat(lng), parseFloat(lat)]).addTo(miniMap);
                            setTimeout(() => miniMap.resize(), 100);
                        }
                    }
                }
            }
        }, 50);
    },

    async promptEditLocation(eventId) {
        let eventTitle = '';
        if (this.state && this.state.emails) {
            const email = this.state.emails.find(e => e.id === eventId);
            if (email) eventTitle = email.subject || '';
        }
        if (!eventTitle) {
            const customEvents = JSON.parse(localStorage.getItem('cloudmail_events') || '[]');
            const googleEvent = customEvents.find(e => e.id === eventId && e.isGoogleSync);
            const latestEvent = window.cloudmailLatestEvents?.items?.find(e => e.id === eventId);
            if (latestEvent) {
                eventTitle = latestEvent.summary || '';
                const extTitle = latestEvent.extendedProperties?.private?.title || latestEvent.extendedProperties?.shared?.title;
                if (extTitle) eventTitle = extTitle;
            } else if (googleEvent) {
                eventTitle = googleEvent.title || googleEvent.summary || '';
            }
        }

        let modal = document.getElementById('map-picker-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'map-picker-modal';
            Object.assign(modal.style, { position: 'fixed', top: '0', left: '0', width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.85)', zIndex: '999999', display: 'none', flexDirection: 'column' });
            modal.innerHTML = `
                <div style="background: white; padding: 15px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 10px rgba(0,0,0,0.2);">
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <div id="map-picker-title" style="font-weight: 600; font-size: 16px; max-width: 350px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Pick a Location</div>
                        <div style="position:relative;">
                            <div style="display:flex;gap:6px;">
                                <input type="text" id="map-picker-search" placeholder="Search location..." style="padding: 6px 10px; border: 1px solid #ccc; border-radius: 4px; width: 280px; font-size: 13px;" autocomplete="off">
                                <button id="map-picker-search-btn" style="background: #0078d4; color: white; border: none; padding: 6px 14px; border-radius: 4px; cursor: pointer; font-size: 13px; font-weight:600;">Search</button>
                            </div>
                            <ul id="map-picker-suggestions" style="display:none;position:absolute;top:100%;left:0;width:420px;background:white;border:1px solid #ccc;border-radius:0 0 6px 6px;box-shadow:0 6px 16px rgba(0,0,0,.15);max-height:300px;overflow-y:auto;margin:0;padding:0;list-style:none;z-index:1000010;"></ul>
                        </div>
                    </div>
                    <div>
                        <span id="map-picker-coords" style="margin-right: 15px; font-size: 13px; color: #555;">Click on the map to pick a location</span>
                        <button id="map-picker-save" style="background: #0078d4; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: 600; margin-right: 10px;" disabled>Save Location</button>
                        <button id="map-picker-cancel" style="background: #eee; color: #333; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">Cancel</button>
                    </div>
                </div>
                <div id="map-picker-container" style="flex: 1; width: 100%;"></div>`;
            document.body.appendChild(modal);

            document.getElementById('map-picker-cancel').onclick = () => { modal.style.display = 'none'; };

            const searchBtn = document.getElementById('map-picker-search-btn');
            const searchInput = document.getElementById('map-picker-search');
            const suggList = document.getElementById('map-picker-suggestions');
            let highlightIdx = -1;

            const zoomForResult = (r) => {
                const t = (r.type || '').toLowerCase();
                const c = (r.class || '').toLowerCase();
                if (t === 'continent' || t === 'country_group') return 3;
                if (t === 'country') return 4;
                if (t === 'state' || t === 'region' || t === 'province') return 6;
                if (c === 'natural' || t === 'nature_reserve' || t === 'national_park' || t === 'protected_area') return 7;
                if (t === 'county' || t === 'district') return 8;
                if (t === 'city' || t === 'town') return 10;
                if (t === 'village' || t === 'suburb' || t === 'borough') return 12;
                return 13;
            };

            const flyToResult = (r) => {
                const lat = parseFloat(r.lat), lon = parseFloat(r.lon);
                const zoom = zoomForResult(r);
                const map = this.state.calendar.pickerMap;
                if (map) {
                    map.flyTo({ center: [lon, lat], zoom, speed: 1.4, curve: 1.3 });
                    setTimeout(() => map.fire('click', { lngLat: { lng: lon, lat } }), 600);
                }
                suggList.style.display = 'none';
                searchInput.value = r.display_name.split(',')[0];
            };

            const renderSuggestions = (results) => {
                highlightIdx = -1;
                suggList.innerHTML = '';
                if (!results.length) {
                    suggList.innerHTML = '<li style="padding:10px 12px;color:#888;font-size:13px;">No results found</li>';
                    suggList.style.display = 'block';
                    return;
                }
                results.forEach((r, i) => {
                    const li = document.createElement('li');
                    li.style.cssText = 'padding:8px 12px;cursor:pointer;font-size:13px;border-bottom:1px solid #f0f0f0;display:flex;align-items:flex-start;gap:8px;';
                    const icon = (r.class === 'natural' || r.type === 'nature_reserve' || r.type === 'national_park') ? '🌿' :
                        r.class === 'boundary' ? '🗺️' :
                            r.class === 'place' ? '📍' :
                                r.class === 'highway' ? '🛣️' :
                                    r.class === 'historic' ? '🏛️' : '📌';
                    const aiBadge = r.source === 'ai'
                        ? '<span style="margin-left:auto;font-size:10px;background:#7c3aed;color:#fff;border-radius:4px;padding:1px 5px;flex-shrink:0;">☁️ CF AI</span>'
                        : r.source === 'gemini'
                            ? '<span style="margin-left:auto;font-size:10px;background:#1a73e8;color:#fff;border-radius:4px;padding:1px 5px;flex-shrink:0;">✨ Gemini</span>'
                            : '';
                    const shortName = r.short_name || r.display_name.split(',')[0].trim();
                    li.innerHTML = `<span style="font-size:16px;line-height:1.2;">${icon}</span>
                                    <div style="flex:1;min-width:0;">
                                        <div style="font-weight:600;color:#1a1a2e;">${this.escape(shortName)}</div>
                                        <div style="font-size:11px;color:#888;margin-top:1px;max-width:340px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${this.escape(r.display_name)}</div>
                                    </div>${aiBadge}`;
                    li.onmouseenter = () => { li.style.background = '#e8f4fd'; highlightIdx = i; };
                    li.onmouseleave = () => { li.style.background = ''; };
                    li.onclick = () => flyToResult(r);
                    suggList.appendChild(li);
                });
                suggList.style.display = 'block';
            };

            const doSearch = async () => {
                const q = searchInput.value.trim();
                if (!q) return;
                searchBtn.textContent = 'Searching…';
                searchBtn.style.background = '#005a9e';
                searchBtn.disabled = true;
                suggList.innerHTML = '<li style="padding:12px 14px;color:#555;font-size:13px;display:flex;align-items:center;gap:8px;"><i class="fas fa-circle-notch fa-spin" style="color:#0078d4;"></i> Searching with AI…</li>';
                suggList.style.display = 'block';
                try {
                    const res = await fetch(`/api/geo/search?q=${encodeURIComponent(q)}`, {
                        headers: { 'X-Geo-Intent': 'map' }
                    });
                    const data = await res.json();
                    const items = data.results || [];
                    // Map backend results to renderSuggestions format
                    renderSuggestions(items.map(r => ({
                        lat: r.lat, lon: r.lon,
                        display_name: r.display_name,
                        short_name: r.short_name || r.display_name.split(',')[0].trim(),
                        type: r.type, class: r.class, source: r.source
                    })));
                    if (items.length === 1) flyToResult(items[0]);
                } catch (e) {
                    suggList.innerHTML = '<li style="padding:10px 12px;color:#c00;font-size:13px;">Search failed. Please try again.</li>';
                    suggList.style.display = 'block';
                } finally {
                    searchBtn.textContent = 'Search';
                    searchBtn.style.background = '#0078d4';
                    searchBtn.disabled = false;
                    searchInput.focus();
                }
            };

            searchBtn.onclick = doSearch;

            searchInput.addEventListener('keydown', (e) => {
                const items = suggList.querySelectorAll('li');
                if (e.key === 'Enter') { e.preventDefault(); if (highlightIdx >= 0 && items[highlightIdx]) items[highlightIdx].click(); else doSearch(); return; }
                if (!items.length) return;
                if (e.key === 'ArrowDown') { e.preventDefault(); highlightIdx = Math.min(highlightIdx + 1, items.length - 1); items.forEach((li, i) => li.style.background = i === highlightIdx ? '#e8f4fd' : ''); }
                if (e.key === 'ArrowUp') { e.preventDefault(); highlightIdx = Math.max(highlightIdx - 1, 0); items.forEach((li, i) => li.style.background = i === highlightIdx ? '#e8f4fd' : ''); }
                if (e.key === 'Escape') { suggList.style.display = 'none'; highlightIdx = -1; }
            });

            document.addEventListener('click', (e) => {
                if (!modal.contains(e.target)) return;
                if (!e.target.closest('#map-picker-suggestions') && e.target !== searchInput) {
                    suggList.style.display = 'none';
                }
            });
        }

        const titleEl = document.getElementById('map-picker-title');
        if (titleEl) {
            let shortTitle = eventTitle;
            if (eventTitle) {
                const parts = eventTitle.split(' - ');
                if (parts.length >= 2) {
                    shortTitle = `${parts[0].replace(/第\d+天\s*/, '').trim()} ${parts[1].trim()}`;
                }
            }
            titleEl.textContent = shortTitle ? `Location: ${shortTitle}` : 'Pick a Location';
            titleEl.title = eventTitle || 'Pick a Location';
        }

        modal.style.display = 'flex';
        let pickerMap = this.state.calendar.pickerMap;
        let pickerMarker = this.state.calendar.pickerMarker;

        if (!pickerMap) {
            pickerMap = new maplibregl.Map({
                container: 'map-picker-container',
                style: { version: 8, sources: { 'osm': { type: 'raster', tiles: ['https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png'], tileSize: 256 } }, layers: [{ id: 'osm', type: 'raster', source: 'osm', minzoom: 0, maxzoom: 19 }] },
                center: [0, 20], zoom: 1.5
            });
            this.state.calendar.pickerMap = pickerMap;

            const updateCoordsDisplay = (lngLat) => {
                document.getElementById('map-picker-coords').innerText = `${lngLat.lat.toFixed(4)}, ${lngLat.lng.toFixed(4)}`;
                document.getElementById('map-picker-save').disabled = false;
            };

            pickerMap.on('click', (e) => {
                const lngLat = e.lngLat;
                if (!pickerMarker) {
                    pickerMarker = new maplibregl.Marker({ color: '#E63946', draggable: true }).setLngLat(lngLat).addTo(pickerMap);
                    this.state.calendar.pickerMarker = pickerMarker;
                    pickerMarker.on('dragend', () => updateCoordsDisplay(pickerMarker.getLngLat()));
                } else { pickerMarker.setLngLat(lngLat); }
                updateCoordsDisplay(lngLat);
            });
        }

        setTimeout(() => pickerMap.resize(), 100);

        const saveBtn = document.getElementById('map-picker-save');
        saveBtn.disabled = true;
        document.getElementById('map-picker-coords').innerText = 'Click on the map to pick a location';
        if (pickerMarker) { pickerMarker.remove(); this.state.calendar.pickerMarker = null; pickerMarker = null; }

        saveBtn.onclick = async () => {
            if (!this.state.calendar.pickerMarker) return;
            const lngLat = this.state.calendar.pickerMarker.getLngLat();

            // ── Progress overlay ─────────────────────────────────────────────
            const overlay = document.createElement('div');
            overlay.id = 'location-save-progress';
            overlay.style.cssText = [
                'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;',
                'background:rgba(0,0,0,.55);backdrop-filter:blur(4px);z-index:99999;',
                'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;'
            ].join('');
            overlay.innerHTML = `
                <div style="background:#1e2230;border-radius:16px;padding:32px 40px;min-width:340px;max-width:420px;box-shadow:0 24px 60px rgba(0,0,0,.6);color:#fff;">
                    <div style="font-size:18px;font-weight:700;margin-bottom:20px;display:flex;align-items:center;gap:10px;">
                        <i class="fas fa-map-marker-alt" style="color:#E63946;"></i> Updating Location
                    </div>
                    <div id="progress-steps" style="display:flex;flex-direction:column;gap:10px;"></div>
                    <div id="progress-bar-wrap" style="margin-top:20px;background:#2d3348;border-radius:99px;height:6px;overflow:hidden;">
                        <div id="progress-bar" style="height:100%;width:0%;background:linear-gradient(90deg,#0078d4,#00bcd4);border-radius:99px;transition:width .4s ease;"></div>
                    </div>
                </div>`;
            document.body.appendChild(overlay);

            const stepsEl = overlay.querySelector('#progress-steps');
            const barEl = overlay.querySelector('#progress-bar');

            const steps = [
                { icon: 'fa-save', label: 'Saving location to local cache…' },
                { icon: 'fa-cloud-upload-alt', label: 'Pushing to Google Calendar…' },
                { icon: 'fa-tags', label: 'Running auto-tagger…' },
                { icon: 'fa-check-circle', label: 'Done! Reloading page…' },
            ];
            const stepEls = steps.map((s, i) => {
                const el = document.createElement('div');
                el.style.cssText = 'display:flex;align-items:center;gap:10px;opacity:.35;transition:opacity .3s;';
                el.innerHTML = `<i class="fas ${s.icon}" style="width:18px;text-align:center;font-size:14px;color:#00bcd4;"></i>
                                <span style="font-size:13px;">${s.label}</span>
                                <i class="fas fa-circle-notch fa-spin step-spinner" style="margin-left:auto;display:none;font-size:12px;color:#00bcd4;"></i>
                                <i class="fas fa-check step-done" style="margin-left:auto;display:none;font-size:12px;color:#4caf50;"></i>`;
                stepsEl.appendChild(el);
                return el;
            });

            const activateStep = (i) => {
                stepEls[i].style.opacity = '1';
                stepEls[i].querySelector('.step-spinner').style.display = '';
                barEl.style.width = `${Math.round(((i + 1) / steps.length) * 100)}%`;
            };
            const completeStep = (i) => {
                stepEls[i].querySelector('.step-spinner').style.display = 'none';
                stepEls[i].querySelector('.step-done').style.display = '';
            };

            saveBtn.disabled = true;
            try {
                // Step 1: save location
                activateStep(0);
                const response = await fetch('/api/calendar/update-location', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        eventId,
                        lat: lngLat.lat,
                        lng: lngLat.lng,
                        locationName: `${lngLat.lat.toFixed(4)}, ${lngLat.lng.toFixed(4)}`,
                        triggerTag: true
                    })
                });
                const resData = await response.json();

                if (!resData.success) {
                    overlay.remove();
                    alert('Error updating location: ' + resData.error);
                    saveBtn.innerHTML = 'Save Location';
                    saveBtn.disabled = false;
                    return;
                }

                completeStep(0);

                // Step 2: Google Calendar push (already done inside server, just animate)
                activateStep(1);
                await new Promise(r => setTimeout(r, 500));
                completeStep(1);

                // Step 3: Auto-tagger
                activateStep(2);
                const tagStatus = resData.tagStatus || 'skipped';
                // If tagger was triggered, wait slightly longer to reflect it ran
                const tagWait = tagStatus === 'triggered' ? 2500 : 600;
                await new Promise(r => setTimeout(r, tagWait));
                stepEls[2].querySelector('span').textContent =
                    tagStatus === 'triggered' ? 'Auto-tagger running…' :
                        tagStatus === 'skipped' ? 'Auto-tagger: skipped' :
                            tagStatus === 'script_not_found' ? 'Auto-tagger: script not found' :
                                `Auto-tagger: ${tagStatus}`;
                completeStep(2);

                // Step 4: Done
                activateStep(3);
                barEl.style.width = '100%';
                completeStep(3);

                modal.style.display = 'none';
                await new Promise(r => setTimeout(r, 900));
                window.location.reload();

            } catch (err) {
                console.error(err);
                overlay.remove();
                alert('Failed to save location.');
                saveBtn.innerHTML = 'Save Location';
                saveBtn.disabled = false;
            }
        };
    },

    async updateEvent(eventId) {
        let eventObj = null;
        let eventTitle = '';

        if (this.state && this.state.emails) {
            eventObj = this.state.emails.find(e => e.id === eventId);
            if (eventObj) eventTitle = eventObj.subject || '';
        }

        if (!eventObj) {
            const customEvents = JSON.parse(localStorage.getItem('cloudmail_events') || '[]');
            const googleEvent = customEvents.find(e => e.id === eventId && e.isGoogleSync);
            const latestEvent = window.cloudmailLatestEvents?.items?.find(e => e.id === eventId);
            eventObj = latestEvent || googleEvent;

            if (latestEvent) {
                eventTitle = latestEvent.summary || '';
                const extTitle = latestEvent.extendedProperties?.private?.title || latestEvent.extendedProperties?.shared?.title;
                if (extTitle) eventTitle = extTitle;
            } else if (googleEvent) {
                eventTitle = googleEvent.title || googleEvent.summary || '';
            }
        }

        if (!eventObj) {
            alert('Event not found.');
            return;
        }

        console.log('[updateEvent] Target title:', eventTitle);

        let lat = eventObj.extendedProperties?.private?.lat;
        let lng = eventObj.extendedProperties?.private?.lng;
        let locationName = eventObj.location || '';

        if (lat === undefined || lng === undefined) {
            const coordsMatch = locationName.trim().match(/^([-+]?[0-9]*\.?[0-9]+)\s*,\s*([-+]?[0-9]*\.?[0-9]+)$/);
            if (coordsMatch) {
                lat = parseFloat(coordsMatch[1]);
                lng = parseFloat(coordsMatch[2]);
            } else if (this.resolveLocationCoords) {
                const coords = this.resolveLocationCoords(locationName);
                if (coords) { lat = coords[0]; lng = coords[1]; }
            }
        }

        // Allow update even if coordinates are missing
        if (lat === undefined || lng === undefined) {
            console.warn('No GPS coordinates assigned yet. Skipping location update, proceeding with auto-tagger.');
        }

        // ── Progress overlay ─────────────────────────────────────────────
        const overlay = document.createElement('div');
        overlay.id = 'location-update-progress';
        overlay.style.cssText = [
            'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;',
            'background:rgba(0,0,0,.55);backdrop-filter:blur(4px);z-index:99999;',
            'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;'
        ].join('');
        let displayTitle = eventTitle;
        if (eventTitle && eventTitle.includes(' - ')) {
            const parts = eventTitle.split(' - ');
            if (parts.length >= 2) {
                displayTitle = `${parts[0].replace(/第\d+天\s*/, '').trim()} ${parts[1].trim()}`;
            }
        }

        overlay.innerHTML = `
            <div style="background:#1e2230;border-radius:16px;padding:32px 40px;min-width:340px;max-width:420px;box-shadow:0 24px 60px rgba(0,0,0,.6);color:#fff;">
                <div style="font-size:18px;font-weight:700;margin-bottom:8px;display:flex;align-items:center;gap:10px;">
                    <i class="fas fa-sync-alt" style="color:#0078d4;"></i> Updating Event
                </div>
                <div style="font-size:13px; color:rgba(255,255,255,0.6); margin-bottom:20px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${this.escape(eventTitle)}">
                    ${this.escape(displayTitle || 'Processing...')}
                </div>
                <div id="progress-steps" style="display:flex;flex-direction:column;gap:10px;"></div>
                <div id="progress-bar-wrap" style="margin-top:20px;background:#2d3348;border-radius:99px;height:6px;overflow:hidden;">
                    <div id="progress-bar" style="height:100%;width:0%;background:linear-gradient(90deg,#0078d4,#00bcd4);border-radius:99px;transition:width .4s ease;"></div>
                </div>
            </div>`;
        document.body.appendChild(overlay);

        const stepsEl = overlay.querySelector('#progress-steps');
        const barEl = overlay.querySelector('#progress-bar');

        const steps = [
            { icon: 'fa-cloud-upload-alt', label: 'Syncing with Google Calendar…' },
            { icon: 'fa-tags', label: 'Running auto-tagger (force)…' },
            { icon: 'fa-check-circle', label: 'Done! Reloading page…' },
        ];
        const stepEls = steps.map((s, i) => {
            const el = document.createElement('div');
            el.style.cssText = 'display:flex;align-items:center;gap:10px;opacity:.35;transition:opacity .3s;';
            el.innerHTML = `<i class="fas ${s.icon}" style="width:18px;text-align:center;font-size:14px;color:#00bcd4;"></i>
                            <span style="font-size:13px;">${s.label}</span>
                            <i class="fas fa-circle-notch fa-spin step-spinner" style="margin-left:auto;display:none;font-size:12px;color:#00bcd4;"></i>
                            <i class="fas fa-check step-done" style="margin-left:auto;display:none;font-size:12px;color:#4caf50;"></i>`;
            stepsEl.appendChild(el);
            return el;
        });

        const activateStep = (i) => {
            stepEls[i].style.opacity = '1';
            stepEls[i].querySelector('.step-spinner').style.display = '';
            barEl.style.width = `${Math.round(((i + 1) / steps.length) * 100)}%`;
        };
        const completeStep = (i) => {
            stepEls[i].querySelector('.step-spinner').style.display = 'none';
            stepEls[i].querySelector('.step-done').style.display = '';
        };

        try {
            activateStep(0);
            const response = await fetch('/api/calendar/force-retag', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ eventId })
            });
            const resData = await response.json();

            if (resData.success && resData.summary) {
                // Update displayTitle if it changed on re-sync
                const newTitle = resData.summary;
                let newDisplayTitle = newTitle;
                if (newTitle.includes(' - ')) {
                    const parts = newTitle.split(' - ');
                    if (parts.length >= 2) {
                        newDisplayTitle = `${parts[0].replace(/第\d+天\s*/, '').trim()} ${parts[1].trim()}`;
                    }
                }
                const titleEl = overlay.querySelector('div[title]');
                if (titleEl) {
                    titleEl.textContent = newDisplayTitle;
                    titleEl.title = newTitle;
                }
            }

            if (!resData.success) {
                overlay.remove();
                alert('Error updating event: ' + resData.error);
                return;
            }

            completeStep(0);

            activateStep(1);
            const tagStatus = resData.tagStatus || 'skipped';
            const tagWait = (tagStatus === 'triggered' || tagStatus === 'triggered and synced') ? 2500 : 600;
            await new Promise(r => setTimeout(r, tagWait));
            stepEls[1].querySelector('span').textContent =
                (tagStatus === 'triggered' || tagStatus === 'triggered and synced') ? 'Auto-tagger completed' :
                    tagStatus === 'skipped' ? 'Auto-tagger: skipped' :
                        `Auto-tagger: ${tagStatus}`;
            completeStep(1);

            activateStep(2);
            barEl.style.width = '100%';
            completeStep(2);

            await new Promise(r => setTimeout(r, 900));
            window.location.reload();

        } catch (err) {
            console.error(err);
            overlay.remove();
            alert('Failed to update event.');
        }
    },

    _showTagEditor(eventId, tagField, currentValue) {
        // Remove any existing editor
        document.getElementById('tag-editor-popup')?.remove();

        const isArea = tagField === 'area';
        const color = isArea ? '#0078d4' : '#107c10';
        const icon = isArea ? 'fa-globe' : 'fa-paw';
        const label = isArea ? 'Area' : 'Type';

        // Gather known values from existing events
        const knownValues = new Set();
        const customEvents = window.cloudmailCustomEvents || [];
        const latestItems = window.cloudmailLatestEvents?.items || [];
        [...customEvents, ...latestItems].forEach(ev => {
            let tags = ev.tags;
            if (!tags && ev.description && this.parseTagsFromDescription) {
                tags = this.parseTagsFromDescription(ev.description);
            }
            if (tags && tags[tagField]) knownValues.add(tags[tagField]);
        });

        // Hard-coded canonical areas
        if (isArea) {
            ['Africa', 'East Asia', 'West Europe', 'Latin America', 'Eurasian Hub', 'North America', 'Indo-Pacific South', 'SE Asia', 'Middle East'].forEach(a => knownValues.add(a));
        }

        const sorted = Array.from(knownValues).sort();
        const optionsHtml = sorted.map(v =>
            `<option value="${this.escape(v)}" ${v === currentValue ? 'selected' : ''}>${this.escape(v)}</option>`
        ).join('');

        const popup = document.createElement('div');
        popup.id = 'tag-editor-popup';
        popup.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:99999;display:flex;align-items:center;justify-content:center;font-family:-apple-system,sans-serif;';
        popup.innerHTML = `
            <div style="background:#fff;border-radius:12px;padding:20px 24px;min-width:360px;max-width:440px;box-shadow:0 16px 48px rgba(0,0,0,.3);">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;">
                    <i class="fas ${icon}" style="color:${color};font-size:16px;"></i>
                    <span style="font-size:15px;font-weight:700;color:#1e293b;">Edit ${label}</span>
                </div>
                <div style="margin-bottom:8px;">
                    <div style="position:relative;margin-bottom:6px;">
                        <i class="fas fa-search" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:#94a3b8;font-size:11px;"></i>
                        <input type="text" id="tag-editor-filter" placeholder="Filter ${label.toLowerCase()}s..." style="width:100%;padding:6px 10px 6px 28px;border:1px solid #cbd5e1;border-radius:6px;font-size:12px;outline:none;background:#f8fafc;" autocomplete="off" />
                    </div>
                    <select id="tag-editor-select" size="6" style="width:100%;padding:4px;border:1px solid #cbd5e1;border-radius:6px;font-size:13px;outline:none;background:#fff;cursor:pointer;">
                        ${optionsHtml}
                    </select>
                </div>
                <div style="margin-bottom:14px;">
                    <label style="font-size:11px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Or type custom:</label>
                    <input type="text" id="tag-editor-input" value="${this.escape(currentValue)}" style="width:100%;padding:8px 10px;border:1px solid #cbd5e1;border-radius:6px;font-size:13px;outline:none;" />
                </div>
                <div style="display:flex;gap:8px;justify-content:flex-end;">
                    <button onclick="document.getElementById('tag-editor-popup').remove()" style="padding:6px 16px;border:1px solid #e2e8f0;border-radius:6px;background:#fff;color:#64748b;font-size:12px;font-weight:600;cursor:pointer;">Cancel</button>
                    <button id="tag-editor-save" style="padding:6px 16px;border:none;border-radius:6px;background:${color};color:#fff;font-size:12px;font-weight:600;cursor:pointer;">
                        <i class="fas fa-check" style="margin-right:4px;"></i>Save
                    </button>
                </div>
            </div>`;
        document.body.appendChild(popup);

        const sel = document.getElementById('tag-editor-select');
        const inp = document.getElementById('tag-editor-input');
        const filterInput = document.getElementById('tag-editor-filter');

        // Instant filter: hide non-matching options
        filterInput.addEventListener('input', () => {
            const q = filterInput.value.toLowerCase();
            Array.from(sel.options).forEach(opt => {
                opt.style.display = opt.textContent.toLowerCase().includes(q) ? '' : 'none';
            });
        });
        filterInput.focus();

        // Select → populate input
        sel.addEventListener('change', () => { if (sel.value) inp.value = sel.value; });

        // Save
        document.getElementById('tag-editor-save').addEventListener('click', () => {
            const newValue = inp.value.trim();
            if (!newValue) { alert('Please enter a value.'); return; }
            popup.remove();
            this._saveEventTags(eventId, tagField, newValue);
        });

        // Click outside to close
        popup.addEventListener('click', (e) => { if (e.target === popup) popup.remove(); });
    },

    async _saveEventTags(eventId, tagField, newValue) {
        const serverUrl = this._getServerUrl ? this._getServerUrl() : '';
        const body = { eventId };
        body[tagField] = newValue;

        try {
            const res = await fetch(`${serverUrl}/api/calendar/update-tags`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || `HTTP ${res.status}`);
            }

            console.log(`[Tags] ✅ Updated ${tagField} to "${newValue}" for event ${eventId}`);

            // Refresh the preview to show updated tags
            setTimeout(() => {
                if (this.openCalendarPreview) this.openCalendarPreview(eventId);
                else if (App.openCalendarPreview) App.openCalendarPreview(eventId);
            }, 300);

        } catch (e) {
            console.error('[Tags] Failed:', e);
            alert('Failed to update tag: ' + e.message);
        }
    },

    openDomainPreview(domain, dateKey) {
        const panel = document.getElementById('calendar-preview-panel');
        const content = document.getElementById('calendar-preview-content');
        if (!panel || !content) return;

        const jBtn = document.getElementById('btn-calendar-delete');
        const pBtn = document.getElementById('btn-push-google-calendar');
        if (jBtn) jBtn.classList.add('hidden');
        if (pBtn) pBtn.classList.add('hidden');

        let matchingThreads = [];
        this.state.threads.forEach(thread => {
            if (this.state.deletedThreadIds.has(thread.id)) return;
            if (thread.emails.some(e => this.isBlacklisted(e.from))) return;

            const emailsOnDate = thread.emails.filter(email => {
                const d = new Date(email.date);
                return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}` === dateKey;
            });

            const hasMatchingDomain = emailsOnDate.some(email => {
                const dom = this.getRootDomain(email.from).toLowerCase();
                const isSent = (email.labels || [email.folder || 'inbox']).some(l => l.toLowerCase().includes('sent'));
                let emailDomain = dom;
                if (isSent) {
                    const toEmail = Array.isArray(email.to) && email.to[0] ? email.to[0].email : (typeof email.to === 'string' ? email.to : email.to_email || '');
                    emailDomain = this.getRootDomain(toEmail).toLowerCase();
                }
                return emailDomain === domain;
            });

            if (hasMatchingDomain) {
                const matchedEmail = [...emailsOnDate].reverse().find(email => {
                    const dom = this.getRootDomain(email.from).toLowerCase();
                    const isSent = (email.labels || [email.folder || 'inbox']).some(l => l.toLowerCase().includes('sent'));
                    let emailDomain = dom;
                    if (isSent) {
                        const toEmail = Array.isArray(email.to) && email.to[0] ? email.to[0].email : (typeof email.to === 'string' ? email.to : email.to_email || '');
                        emailDomain = this.getRootDomain(toEmail).toLowerCase();
                    }
                    return emailDomain === domain;
                });
                if (matchedEmail) matchingThreads.push({ thread, displayEmail: matchedEmail });
            }
        });

        const isDarkMode = document.body.classList.contains('dark-mode');
        let listHtml = `<div style="padding: 10px; font-family: -apple-system, sans-serif;">
            <h3 style="margin-top: 0; margin-bottom: 5px; display: flex; align-items: center; justify-content: space-between;">
                <span style="display: flex; align-items: center;">
                    <span class="avatar" style="width: 28px; height: 28px; line-height: 28px; font-size: 14px; margin-right: 10px; text-align: center; background: #0078d4; color: white; border-radius: 50%; display: inline-block;">${domain.charAt(0).toUpperCase()}</span>
                    ${domain}
                </span>
                <span style="font-size: 12px; font-weight: normal; background: #e6f2ff; color: #0056b3; padding: 3px 8px; border-radius: 10px;">${matchingThreads.length} emails</span>
            </h3>
            <p style="margin-top: 0; padding-bottom: 10px; margin-bottom: 15px; font-size: 12px; color: #666; border-bottom: 1px solid #eee;">
                ${new Date(dateKey.split('-')[0], dateKey.split('-')[1], dateKey.split('-')[2]).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
            <div style="display:flex; flex-direction:column; gap:10px; overflow-y:auto; max-height: calc(100vh - 120px); padding-bottom: 20px;">`;

        if (matchingThreads.length === 0) {
            listHtml += `<div style="color:#888; text-align: center; padding: 20px;">No emails found.</div>`;
        } else {
            matchingThreads.forEach(item => {
                const email = item.displayEmail;
                const dateStr = this.formatDate ? this.formatDate(email.date) : new Date(email.date).toLocaleString([], { hour: '2-digit', minute: '2-digit' });
                const fromName = email.fromName || (typeof email.from === 'string' ? email.from.split('<')[0].trim() : email.from);
                listHtml += `<div style="border: 1px solid ${isDarkMode ? '#444' : '#eee'}; padding: 12px; border-radius: 8px; cursor: pointer;"
                    onmouseover="this.style.borderColor='#0078d4'; this.style.boxShadow='0 2px 8px rgba(0,0,0,0.1)';" onmouseout="this.style.borderColor='${isDarkMode ? '#444' : '#eee'}'; this.style.boxShadow='none';"
                    onclick="App.openCalendarPreview('${email.id}')">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
                        <strong style="font-size: 13px; max-width: 75%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${this.escape(fromName)}</strong>
                        <span style="font-size: 11px; color: #666; white-space: nowrap;">${dateStr}</span>
                    </div>
                    <div style="font-weight: 600; margin-bottom: 4px; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${this.escape(email.subject || '(No Subject)')}</div>
                    <div style="font-size: 12px; color: #777; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${this.escape((email.preview || '').substring(0, 150))}</div>
                </div>`;
            });
        }

        listHtml += `</div></div>`;
        content.innerHTML = listHtml;
        panel.classList.add('active');
        if (this.state.calendar.view === 'week') {
            const dStr = dateKey.split('-');
            this.state.calendar.targetDayOfWeek = new Date(dStr[0], dStr[1], dStr[2]).getDay();
            this.renderCalendar();
        }
    },

    closeCalendarPreview() {
        const panel = document.getElementById('calendar-preview-panel');
        if (panel) {
            panel.classList.remove('active', 'preview-maximized');
            panel.style.display = '';
            if (this.state.calendar.view === 'week') this.renderCalendar();
        }
        this.state.calendar.previewEmailId = null;
        const jBtn = document.getElementById('btn-calendar-delete');
        const plBtn = document.getElementById('btn-save-playlist');
        const ssBtn = document.getElementById('btn-slideshow');
        if (jBtn) jBtn.classList.add('hidden');
        if (plBtn) plBtn.classList.add('hidden');
        if (ssBtn) ssBtn.classList.add('hidden');

        // Reset the maximize button label if it exists
        const btn = document.getElementById('btn-preview-maximize');
        if (btn) btn.innerHTML = '<i class="fas fa-expand-alt"></i>';
    },

    togglePreviewMaximize() {
        const panel = document.getElementById('calendar-preview-panel');
        const btn = document.getElementById('btn-preview-maximize');
        if (!panel) return;

        const isMax = panel.classList.toggle('preview-maximized');

        if (btn) {
            btn.innerHTML = isMax
                ? '<i class="fas fa-compress-alt"></i> Restore'
                : '<i class="fas fa-expand-alt"></i> Expand';
            btn.title = isMax ? 'Restore panel' : 'Maximize panel';
        }

        // Resize any live maps / videos inside the panel
        setTimeout(() => {
            if (this.state?.calendar?.map) this.state.calendar.map.resize?.();
            const miniMap = this.state?.calendar?._previewMiniMap;
            if (miniMap) miniMap.resize?.();
            const video = document.getElementById('hls-video-player');
            if (video && isMax) video.style.maxHeight = '55vh';
            else if (video) video.style.maxHeight = '400px';
        }, 300);
    },

    async deleteCalendarEvent(emailId) {
        if (!emailId) { alert('No event selected.'); return; }
        if (!confirm('Delete this calendar event? This cannot be undone.')) return;

        try {
            const res = await fetch(`/api/calendar/events/${emailId}`, { method: 'DELETE' });

            // Handle empty response body
            const text = await res.text();
            const data = text ? JSON.parse(text) : {};

            if (res.ok) {
                // Remove from local cache
                if (window.cloudmailLatestEvents?.items) {
                    window.cloudmailLatestEvents.items = window.cloudmailLatestEvents.items.filter(e => e.id !== emailId);
                }
                this.closeCalendarPreview();
                this.renderCalendar();
            } else {
                alert('Failed to delete: ' + (data.error || `Server returned ${res.status}`));
            }
        } catch (e) {
            alert('Error deleting event: ' + e.message);
        }
    },

    async deleteCalendarEventFromHeader() {
        await this.deleteCalendarEvent(this.state.calendar.previewEmailId);
    },

    // ─── HLS → MP4 Download ──────────────────────────────────────────────────

    async downloadHlsVideo() {
        const container = document.getElementById('hls-player-container');
        const hlsUrl = container?.dataset?.activeHlsUrl;
        if (!hlsUrl) {
            alert('No HLS stream is currently loaded.');
            return;
        }

        const btn = document.getElementById('btn-hls-download');
        const origHtml = btn ? btn.innerHTML : '';
        if (btn) {
            btn.innerHTML = '<i class="fas fa-circle-notch fa-spin" style="font-size:11px;"></i> Downloading…';
            btn.disabled = true;
            btn.style.opacity = '0.7';
        }

        // Derive a filename from the URL path  e.g. 2026-05-06-intro
        const urlParts = hlsUrl.split('/');
        const dateSlug = urlParts.find(p => /^\d{4}-\d{2}-\d{2}$/.test(p)) || 'video';
        const filename = `${dateSlug}-intro`;

        try {
            const isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
            const serverUrl = window.__REPLY_SERVER || '';
            const endpoint = isLocal
                ? (serverUrl || '') + '/api/video/download-hls'
                : '/api/download-hls';

            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: hlsUrl, filename }),
            });

            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.error || `Server returned ${res.status}`);
            }

            // Trigger browser download of the MP4
            const downloadUrl = (serverUrl || '') + data.videoUrl;
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = `${filename}.mp4`;
            document.body.appendChild(a);
            a.click();
            a.remove();

            if (btn) {
                btn.innerHTML = '<i class="fas fa-check" style="font-size:11px;"></i> Done!';
                btn.style.background = 'linear-gradient(135deg,#107c10,#0b5e0b)';
                setTimeout(() => {
                    btn.innerHTML = origHtml;
                    btn.disabled = false;
                    btn.style.opacity = '1';
                    btn.style.background = 'linear-gradient(135deg,#0078d4,#005a9e)';
                }, 3000);
            }
        } catch (err) {
            console.error('[HLS-DL] Download failed:', err);
            alert('Download failed: ' + err.message);
            if (btn) {
                btn.innerHTML = origHtml;
                btn.disabled = false;
                btn.style.opacity = '1';
            }
        }
    },

    _getServerUrl() {
        const isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
        if (isLocal) {
            return window.__REPLY_SERVER || 'http://localhost:8443';
        }
        return window.location.origin;
    }
};
