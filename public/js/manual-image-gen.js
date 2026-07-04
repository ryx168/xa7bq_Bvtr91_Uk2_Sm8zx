
export const ManualImageGenMixin = {

    openAddArtStyleModal() {
        const existingCategories = (this._AS_REGION_DATA_JSON || []).map(c => c.area).filter(Boolean);
        const catOptions = existingCategories.map(c => `<option value="${this.escape(c)}">${this.escape(c)}</option>`).join('');

        const existingLocations = new Set();
        if (this._AS_REGION_DATA_JSON) {
            this._AS_REGION_DATA_JSON.forEach(c => {
                if (c.styles) c.styles.forEach(s => { if (s.location) existingLocations.add(s.location); });
            });
        }
        if (this._AS_PHIL_DATA_JSON) {
            this._AS_PHIL_DATA_JSON.forEach(c => {
                if (c.styles) c.styles.forEach(s => { if (s.location) existingLocations.add(s.location); });
            });
        }
        const locOptions = Array.from(existingLocations).sort().map(l => `<option value="${this.escape(l)}">${this.escape(l)}</option>`).join('');

        const modalHtml = `
            <div id="add-art-style-modal" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);z-index:10000;display:flex;align-items:center;justify-content:center;">
                <div style="background:#fff;border-radius:8px;width:400px;max-width:90%;box-shadow:0 10px 25px rgba(0,0,0,0.2);">
                    <div style="padding:15px 20px;border-bottom:1px solid #eee;display:flex;justify-content:space-between;align-items:center;">
                        <h3 style="margin:0;font-size:16px;color:#1e293b;"><i class="fas fa-palette" style="color:#0ea5e9;"></i> Add New Art Style</h3>
                        <button onclick="document.getElementById('add-art-style-modal').remove()" style="background:none;border:none;cursor:pointer;font-size:18px;color:#64748b;"><i class="fas fa-times"></i></button>
                    </div>
                    <div style="padding:20px;display:flex;flex-direction:column;gap:12px;">
                        
                        <div style="background:#f8fafc;border:1px dashed #cbd5e1;border-radius:6px;padding:12px;text-align:center;">
                            <p style="margin:0 0 8px 0;font-size:12px;color:#64748b;">Upload a reference image and let AI analyze the style</p>
                            <input type="file" id="aas-image-upload" accept="image/*" style="display:none;" onchange="App.extractStyleFromImage(this)">
                            <button id="aas-extract-btn" onclick="document.getElementById('aas-image-upload').click()" style="background:#0ea5e9;color:white;border:none;border-radius:4px;padding:6px 12px;font-size:12px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:6px;">
                                <i class="fas fa-magic"></i> AI Extract Style
                            </button>
                        </div>
                        
                        <div>
                            <label style="display:block;font-size:12px;font-weight:600;color:#475569;margin-bottom:4px;">English Name *</label>
                            <input type="text" id="aas-english" style="width:100%;padding:8px 10px;border:1px solid #cbd5e1;border-radius:4px;font-size:13px;outline:none;" placeholder="e.g. Cyberpunk">
                        </div>
                        <div>
                            <label style="display:block;font-size:12px;font-weight:600;color:#475569;margin-bottom:4px;">Chinese Name</label>
                            <input type="text" id="aas-chinese" style="width:100%;padding:8px 10px;border:1px solid #cbd5e1;border-radius:4px;font-size:13px;outline:none;" placeholder="e.g. 赛博朋克">
                        </div>
                        <div>
                            <label style="display:block;font-size:12px;font-weight:600;color:#475569;margin-bottom:4px;">Category *</label>
                            <select id="aas-category-select" style="width:100%;padding:8px 10px;border:1px solid #cbd5e1;border-radius:4px;font-size:13px;outline:none;margin-bottom:6px;" onchange="
                                if (this.value === '_new_') {
                                    document.getElementById('aas-category-new').style.display = 'block';
                                    document.getElementById('aas-category-new').focus();
                                } else {
                                    document.getElementById('aas-category-new').style.display = 'none';
                                }
                            ">
                                <option value="">-- Select Category --</option>
                                ${catOptions}
                                <option value="_new_">+ Create New Category</option>
                            </select>
                            <input type="text" id="aas-category-new" style="display:none;width:100%;padding:8px 10px;border:1px solid #cbd5e1;border-radius:4px;font-size:13px;outline:none;" placeholder="New category name">
                        </div>
                        <div>
                            <label style="display:block;font-size:12px;font-weight:600;color:#475569;margin-bottom:4px;">Location</label>
                            <select id="aas-location-select" style="width:100%;padding:8px 10px;border:1px solid #cbd5e1;border-radius:4px;font-size:13px;outline:none;margin-bottom:6px;" onchange="
                                if (this.value === '_new_') {
                                    document.getElementById('aas-location-new').style.display = 'block';
                                    document.getElementById('aas-location-new').focus();
                                } else {
                                    document.getElementById('aas-location-new').style.display = 'none';
                                }
                            ">
                                <option value="">-- Select Location --</option>
                                ${locOptions}
                                <option value="_new_">+ Create New Location</option>
                            </select>
                            <input type="text" id="aas-location-new" style="display:none;width:100%;padding:8px 10px;border:1px solid #cbd5e1;border-radius:4px;font-size:13px;outline:none;" placeholder="New location name">
                        </div>
                        
                        <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:10px;">
                            <button onclick="document.getElementById('add-art-style-modal').remove()" style="background:#f1f5f9;color:#475569;border:1px solid #cbd5e1;border-radius:4px;padding:8px 16px;font-weight:600;cursor:pointer;">Cancel</button>
                            <button onclick="App.submitNewArtStyle(this)" style="background:#10b981;color:white;border:none;border-radius:4px;padding:8px 16px;font-weight:600;cursor:pointer;">Save Style</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    },

    async extractStyleFromImage(inputEl) {
        if (!inputEl.files || inputEl.files.length === 0) return;
        const file = inputEl.files[0];
        
        const reader = new FileReader();
        reader.onload = async (e) => {
            const dataUrl = e.target.result;
            const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9]+);base64,(.+)$/);
            if (!match) {
                alert('Invalid image format');
                return;
            }
            const mimeType = match[1];
            const imageBase64 = match[2];
            
            const btn = document.getElementById('aas-extract-btn');
            const origText = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing...';
            btn.disabled = true;

            try {
                const serverUrl = typeof this._getServerUrl === 'function' ? this._getServerUrl() : '';
                const res = await fetch(`${serverUrl}/api/art-style/extract-from-image`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ imageBase64, mimeType })
                });

                if (!res.ok) {
                    const errData = await res.json().catch(() => ({}));
                    throw new Error(errData.error || `HTTP ${res.status}`);
                }

                const data = await res.json();
                if (data.success && data.styleInfo) {
                    const { englishName, chineseName, category, location } = data.styleInfo;
                    if (englishName) document.getElementById('aas-english').value = englishName;
                    if (chineseName) document.getElementById('aas-chinese').value = chineseName;
                    
                    if (category) {
                        const catSelect = document.getElementById('aas-category-select');
                        let catFound = false;
                        for (let i = 0; i < catSelect.options.length; i++) {
                            if (catSelect.options[i].value === category) {
                                catSelect.selectedIndex = i;
                                catFound = true;
                                break;
                            }
                        }
                        if (!catFound) {
                            catSelect.value = '_new_';
                            document.getElementById('aas-category-new').style.display = 'block';
                            document.getElementById('aas-category-new').value = category;
                        } else {
                            document.getElementById('aas-category-new').style.display = 'none';
                        }
                    }

                    if (location) {
                        const locSelect = document.getElementById('aas-location-select');
                        let locFound = false;
                        for (let i = 0; i < locSelect.options.length; i++) {
                            if (locSelect.options[i].value === location) {
                                locSelect.selectedIndex = i;
                                locFound = true;
                                break;
                            }
                        }
                        if (!locFound) {
                            locSelect.value = '_new_';
                            document.getElementById('aas-location-new').style.display = 'block';
                            document.getElementById('aas-location-new').value = location;
                        } else {
                            document.getElementById('aas-location-new').style.display = 'none';
                        }
                    }
                }
            } catch (err) {
                alert('Failed to analyze image: ' + err.message);
            } finally {
                btn.innerHTML = origText;
                btn.disabled = false;
                inputEl.value = ''; // reset so same file can be selected again
            }
        };
        reader.readAsDataURL(file);
    },

    async submitNewArtStyle(btn) {
        const englishName = document.getElementById('aas-english').value.trim();
        const chineseName = document.getElementById('aas-chinese').value.trim();
        
        let location = document.getElementById('aas-location-select').value;
        if (location === '_new_') {
            location = document.getElementById('aas-location-new').value.trim();
        } else if (!location) {
            location = '';
        }
        
        let category = document.getElementById('aas-category-select').value;
        if (category === '_new_') {
            category = document.getElementById('aas-category-new').value.trim();
        }

        if (!englishName || !category) {
            alert('English Name and Category are required.');
            return;
        }

        const origText = btn.textContent;
        btn.disabled = true;
        btn.textContent = 'Saving...';

        try {
            const serverUrl = typeof this._getServerUrl === 'function' ? this._getServerUrl() : '';
            const res = await fetch(`${serverUrl}/api/art-style/add`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ englishName, chineseName, location, category })
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || `HTTP ${res.status}`);
            }

            this._AS_ART_STYLES_JSON = null; 
            
            alert('Art style added successfully!');
            document.getElementById('add-art-style-modal').remove();
            
            if (this._AS_REGION_DATA_JSON) {
                let targetCat = this._AS_REGION_DATA_JSON.find(c => c.area === category || c.nick === category);
                if (!targetCat) {
                    targetCat = { area: category, nick: category, styles: [] };
                    this._AS_REGION_DATA_JSON.push(targetCat);
                }
                targetCat.styles.push({ tier: category, name: englishName, name_zh: chineseName, location });
            }
            
            const eventId = document.getElementById('manual-gen-btn')?.getAttribute('onclick')?.match(/'([^']+)'/)?.[1];
            if (eventId) {
                const coverImg = document.getElementById('manual-ref-img-preview')?.src || '';
                const title = document.getElementById('manual-style-select')?.dataset?.title || '';
                this.openManualGenModal(eventId, title, coverImg);
            }
            
        } catch (e) {
            alert('Failed to add art style: ' + e.message);
        } finally {
            btn.disabled = false;
            btn.textContent = origText;
        }
    },
    // ── Open from Calendar Header ───────────────────────────────────────────
    openManualGenModalFromHeader() {
        let eventId = this.state.calendar?.previewEmailId;
        let ev = null;

        if (eventId) {
            ev = (this.state.emails || []).find(e => e.id === eventId) ||
                (window.cloudmailLatestEvents?.items || []).find(e => e.id === eventId) ||
                (window.cloudmailCustomEvents || []).find(e => e.id === eventId);

            if (!ev) {
                try {
                    const customEvents = JSON.parse(localStorage.getItem('cloudmail_events') || '[]');
                    ev = customEvents.find(e => e.id === eventId);
                } catch (e) { }
            }
        }

        // If no event selected, fallback to today's event
        if (!ev) {
            const today = new Date();
            const y = today.getFullYear();
            const m = String(today.getMonth() + 1).padStart(2, '0');
            const d = String(today.getDate()).padStart(2, '0');
            const todayStr = `${y}-${m}-${d}`;

            const allEvents = [
                ...(this.state.emails || []),
                ...(window.cloudmailLatestEvents?.items || []),
                ...(window.cloudmailCustomEvents || [])
            ];
            try {
                const customEvents = JSON.parse(localStorage.getItem('cloudmail_events') || '[]');
                allEvents.push(...customEvents);
            } catch (e) { }

            ev = allEvents.find(e => {
                const dateStr = (e.date || e.start?.date || e.start?.dateTime || '').substring(0, 10);
                return dateStr === todayStr;
            });

            if (ev) {
                eventId = ev.id;
            }
        }

        if (!ev) {
            alert('No event selected and could not find an event for today.');
            return;
        }

        let characterName = ev.subject || ev.summary || '';
        const extTitle = ev.extendedProperties?.private?.title || ev.extendedProperties?.shared?.title;
        if (extTitle) characterName = extTitle;

        let coverUrl = '';
        if (ev.attachments) {
            const coverAtt = ev.attachments.find(a => a.title === 'cover.png');
            if (coverAtt) {
                coverUrl = coverAtt.localUrl
                    ? (this._getAssetUrl ? this._getAssetUrl(coverAtt.localUrl) : coverAtt.localUrl)
                    : (coverAtt.fileId ? (this._getAssetUrl ? this._getAssetUrl(`/images/calendar/${coverAtt.fileId}.jpg`) : `/images/calendar/${coverAtt.fileId}.jpg`) : '')
                    || (coverAtt.fileId ? `https://drive.google.com/thumbnail?id=${coverAtt.fileId}&sz=w400` : '')
                    || coverAtt.fileUrl || '';
            }
        }

        this.openManualGenModal(eventId, characterName, coverUrl);
    },

    // ── Open the manual generation modal ────────────────────────────────────
    async openManualGenModal(eventId, title, passedCoverUrl = '') {
        this._selectedManualStyles = [];
        this._lastClickedStyle = null;
        // Load art styles from JSON if not cached
        if (!this._AS_ART_STYLES_JSON || !this._AS_PHIL_DATA_JSON) {
            try {
                const res = await fetch('/config/art-styles.json');
                if (res.ok) {
                    const data = await res.json();
                    this._AS_ART_STYLES_JSON = data;
                    this._AS_REGION_DATA_JSON = data._AS_REGION_DATA || [];
                    this._AS_PHIL_DATA_JSON = data._AS_PHIL_DATA || [];
                }
            } catch (e) {
                console.warn('[ManualGen] Failed to load art-styles.json:', e);
            }
        }

        // Load story templates
        if (!this._AS_STORY_TEMPLATES) {
            try {
                const mod = await import('/js/story_templates.js');
                this._AS_STORY_TEMPLATES = mod.allTemplates || mod.storyTemplates || [];
            } catch (e) {
                console.warn('[ManualGen] Failed to load story_templates.js:', e);
                this._AS_STORY_TEMPLATES = [];
            }
        }

        const artStyleData = this._getManualArtStyleData();
        if (!artStyleData.length) {
            alert('Art style data not loaded yet.');
            return;
        }

        this._manualStyleMode = 'category';

        // Close any existing modal
        const existing = document.getElementById('manual-gen-modal');
        if (existing) existing.remove();

        let coverUrl = passedCoverUrl;
        let refFileName = 'cover.png';
        let coverFileId = '';
        let manualEventCountry = '';
        let manualEventLocation = '';

        if (coverUrl) {
            const idMatch = coverUrl.match(/[?&]id=([^&#]+)/) || coverUrl.match(/\/d\/([^&#=]+)/);
            if (idMatch) {
                coverFileId = idMatch[1];
            }
        }

        if (window.cloudmailLatestEvents?.items) {
            const ev = window.cloudmailLatestEvents.items.find(e => e.id === eventId);
            if (ev) {
                const eventContext = this._getManualEventLocationContext(ev);
                manualEventCountry = eventContext.country;
                manualEventLocation = eventContext.location;
            }
            if (ev && ev.attachments) {
                let matchedAtt = null;
                if (coverUrl) {
                    matchedAtt = ev.attachments.find(a =>
                        (a.fileId && coverUrl.includes(a.fileId)) ||
                        (a.localUrl && coverUrl.includes(a.localUrl)) ||
                        (a.fileUrl && coverUrl.includes(a.fileUrl))
                    );
                }

                if (!coverUrl) {
                    matchedAtt = ev.attachments.find(a => a.title === 'cover.png')
                        ?? ev.attachments.find(a => a.mimeType?.startsWith('image/')
                            || a.title?.match(/\.(png|jpg|jpeg|webp)$/i));
                }

                if (matchedAtt) {
                    coverFileId = matchedAtt.fileId || coverFileId;
                    if (!coverUrl) {
                        coverUrl = (matchedAtt.localUrl ? this._getAssetUrl(matchedAtt.localUrl) : '')
                            || (coverFileId ? `https://lh3.googleusercontent.com/d/${coverFileId}=w400` : '')
                            || (coverFileId ? this._getAssetUrl(`/images/calendar/${coverFileId}.jpg`) : '')
                            || (coverFileId ? `https://drive.google.com/thumbnail?id=${coverFileId}&sz=w400` : '')
                            || matchedAtt.fileUrl || '';
                    }
                    refFileName = matchedAtt.title || 'image';
                }
            }
        }
        if (!manualEventCountry && !manualEventLocation) {
            const ev = (window.cloudmailCustomEvents || []).find(e => e.id === eventId)
                || (this.state?.emails || []).find(e => e.id === eventId);
            if (ev) {
                const eventContext = this._getManualEventLocationContext(ev);
                manualEventCountry = eventContext.country;
                manualEventLocation = eventContext.location;
            }
        }

        // Fix broken Drive direct links
        if (coverUrl && coverUrl.includes('drive.google.com/uc?')) {
            const idMatch = coverUrl.match(/[?&]id=([^&#]+)/) || coverUrl.match(/\/d\/([^&#]+)/) || coverUrl.match(/\/file\/d\/([^&#]+)/);
            if (idMatch) {
                coverFileId = coverFileId || idMatch[1];
                coverUrl = this._getAssetUrl(`/images/calendar/${idMatch[1]}.jpg`);
            }
        }

        let unescapedTitle = title.replace(/&quot;/g, '\"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
        const titleMatch = unescapedTitle.match(/^第\d+天,\s*(.*?)[,\s]*\d{4}-\d{2}-\d{2}/);
        if (titleMatch) {
            unescapedTitle = titleMatch[1].trim();
        } else {
            const parts = unescapedTitle.split(',');
            if (parts.length >= 3 && /^第\d+天/.test(parts[0].trim())) {
                unescapedTitle = parts[1].trim();
            }
        }

        let styleOptions = '<option value="">-- 自定义提示 Custom Prompt --</option>';
        const initialGroups = this._getManualStyleGroups('');
        initialGroups.forEach(group => {
            styleOptions += `<optgroup label="${this.escape(group.label)}">`;
            styleOptions += `<option value="SELECT_ALL_CATEGORY___${this.escape(group.label)}" style="font-weight:bold;color:#0369a1;background:#f0f9ff;">[+] Toggle Category: ${this.escape(group.label)}</option>`;
            group.styles.forEach(style => {
                styleOptions += this._buildStyleOption(style);
            });
            styleOptions += `</optgroup>`;
        });

        const mixGroup = artStyleData.find(g => g.area === 'Group Mix Style' || g.nick === 'Group Mix Style');
        let popularMixOptions = '<option value="">-- Popular Mixes --</option>';
        if (mixGroup && mixGroup.styles) {
            mixGroup.styles.forEach(s => {
                popularMixOptions += `<option value="${this.escape(s.name)}" data-hint="${this.escape(s.hint || '')}">${this.escape(s.name)}${s.name_zh ? ' (' + this.escape(s.name_zh) + ')' : ''}</option>`;
            });
        }

        let storyOptions = '<option value="">-- Auto Generated (Default) --</option>';
        if (this._AS_STORY_TEMPLATES && this._AS_STORY_TEMPLATES.length > 0) {
            const groups = {};
            this._AS_STORY_TEMPLATES.forEach((tpl, index) => {
                let cat = 'Other';
                if (tpl.category && tpl.category.length > 0) {
                    cat = tpl.category[tpl.category.length - 1];
                }
                if (!groups[cat]) groups[cat] = [];
                groups[cat].push({ tpl, index });
            });
            for (const [cat, list] of Object.entries(groups)) {
                storyOptions += `<optgroup label="${this.escape(cat)}">`;
                list.forEach(({ tpl, index }) => {
                    const name = `${tpl.emoji || ''} ${tpl.name} ${tpl.name_zh ? `(${tpl.name_zh})` : ''}`;
                    storyOptions += `<option value="${index}">${this.escape(name)}</option>`;
                });
                storyOptions += `</optgroup>`;
            }
        }

        const unescapedTitleClean = unescapedTitle.replace(/&#39;/g, "'").replace(/&quot;/g, '\"');
        const initialPrompt = `A highly detailed illustration of ${unescapedTitle}. Cinematic composition, masterpiece, 4k, vibrant colors.`;
        this._manualStoryPromptLocked = false;
        this._manualStoryPrompts = null;

        const allEventTypeTags = this._getAllEventTypeTags();
        let extraTypeOptions = '';
        allEventTypeTags.forEach(t => {
            const imgJson = JSON.stringify(t.imgUrls || []).replace(/\"/g, '&quot;');
            extraTypeOptions += `<option value="${this.escape(t.value)}" data-imgs="${imgJson}" data-char="${this.escape(t.charName || '')}">${this.escape(t.value)}${t.charName ? ' — ' + this.escape(t.charName) : ''}</option>`;
        });

        const modalHtml = `
            <div id="manual-gen-modal" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;">
                <div style="background:#fff;border-radius:8px;width:600px;max-width:90%;max-height:90vh;display:flex;flex-direction:column;box-shadow:0 10px 25px rgba(0,0,0,0.2);">
                    <div style="padding:15px 20px;border-bottom:1px solid #eee;display:flex;justify-content:space-between;align-items:center;">
                        <h3 style="margin:0;font-size:16px;color:#1e293b;display:flex;align-items:center;gap:12px;">
                            <i class="fas fa-wand-magic-sparkles" style="color:#0078d4;"></i> Generate Image
                            <button onclick="App.openFolderSlideshow()" style="background:#0f172a;color:white;border:none;border-radius:4px;padding:4px 10px;font-size:12px;cursor:pointer;display:flex;align-items:center;gap:6px;"><i class="fas fa-play"></i> Play Folder Slideshow</button>
                        </h3>
                        <button onclick="document.getElementById('manual-gen-modal').remove()" style="background:none;border:none;cursor:pointer;font-size:18px;color:#64748b;"><i class="fas fa-times"></i></button>
                    </div>
                    <div id="manual-gen-scroll" style="padding:20px;overflow-y:auto;display:flex;flex-direction:column;gap:15px;">

                        <div style="background:#f8fafc;padding:12px;border-radius:4px;border:1px solid #e2e8f0;">
                            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
                                <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;">
                                    <input type="checkbox" id="manual-use-ref-image" value="true" ${coverUrl ? 'checked' : ''} style="margin:0;" onchange="document.getElementById('manual-ref-img-preview').style.opacity = this.checked ? '1' : '0.3'">
                                    <span style="font-weight:600;color:#1e293b;" id="manual-ref-img-label"><i class="fas fa-image" style="color:#0078d4;margin-right:4px;"></i>Reference Image (${this.escape(coverUrl ? refFileName : 'None')})</span>
                                </label>
                                <div>
                                    <input type="file" id="manual-ref-img-upload" accept="image/*" style="display:none;" onchange="App.uploadManualRefImage(this)">
                                    <button type="button" onclick="document.getElementById('manual-ref-img-upload').click()" style="background:none;border:1px solid #cbd5e1;border-radius:4px;padding:4px 8px;font-size:11px;font-weight:600;color:#0ea5e9;cursor:pointer;display:inline-flex;align-items:center;gap:4px;">
                                        <i class="fas fa-upload"></i> Upload
                                    </button>
                                </div>
                            </div>
                            <div id="manual-ref-img-container" style="display:${coverUrl ? 'flex' : 'none'};width:100%;height:180px;overflow:hidden;border-radius:4px;border:1px solid #cbd5e1;background:#e2e8f0;justify-content:center;align-items:center;">
                                <img id="manual-ref-img-preview" src="${coverUrl ? this.escape(coverUrl) : ''}" data-url="${coverUrl ? this.escape(coverUrl) : ''}" style="max-width:100%;max-height:100%;object-fit:contain;transition:opacity 0.2s;" onerror="
                                    const el = this;
                                    const tried = parseInt(el.dataset.tried || '0');
                                    const fid = '${coverFileId}';
                                    if (tried === 0 && fid) {
                                        el.dataset.tried = '1';
                                        el.src = 'https://drive.google.com/thumbnail?id=' + fid + '&sz=w400';
                                        el.dataset.url = el.src;
                                    } else if (tried === 1 && fid) {
                                        el.dataset.tried = '2';
                                        el.src = 'https://lh3.googleusercontent.com/d/' + fid + '=w400';
                                        el.dataset.url = el.src;
                                    } else if (tried === 2 && fid) {
                                        el.dataset.tried = '3';
                                        el.src = 'https://lh3.googleusercontent.com/d/' + fid;
                                        el.dataset.url = el.src;
                                    } else {
                                        el.style.display='none';
                                        if(!el.parentElement.querySelector('.ref-img-err')){
                                            const span = document.createElement('span');
                                            span.className = 'ref-img-err';
                                            span.style.color = '#94a3b8';
                                            span.style.fontSize = '12px';
                                            span.innerText = 'Reference image unavailable';
                                            el.parentElement.appendChild(span);
                                        }
                                    }
                                " />
                            </div>
                        </div>

                        <div>
                            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                                <label style="font-size:12px;font-weight:600;color:#475569;">Character Prompt</label>
                                <button id="manual-ai-prompt-btn" onclick="App.regenerateAIPrompt('${this.escape(unescapedTitle).replace(/&#39;/g, "\\\\'")}')" style="background:linear-gradient(135deg,#7c3aed,#6366f1);color:#fff;border:none;border-radius:4px;padding:3px 10px;font-size:11px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:5px;" title="Use AI to generate prompt from cover image">
                                    <i class="fas fa-robot"></i> AI Generate Prompt
                                </button>
                            </div>
                            <div style="position:relative;">
                                <textarea id="manual-char-prompt-textarea" rows="3" placeholder="Character prompt..." data-event-country="${this.escape(manualEventCountry)}" data-event-location="${this.escape(manualEventLocation)}" style="width:100%;padding:8px 12px;border:1px solid #cbd5e1;border-radius:4px;font-size:13px;resize:vertical;font-family:monospace;outline:none;">${initialPrompt}</textarea>
                                <div id="manual-prompt-ai-loading" style="display:${coverUrl ? 'flex' : 'none'};position:absolute;right:8px;top:8px;background:rgba(248,250,252,0.94);border:1px solid #e2e8f0;border-radius:4px;padding:4px 8px;align-items:center;justify-content:center;gap:8px;font-size:12px;color:#6366f1;pointer-events:none;">
                                    <i class="fas fa-circle-notch fa-spin"></i> AI is analyzing the cover imageâ€¦
                                </div>
                            </div>
                            <label style="display:block;font-size:12px;font-weight:600;color:#475569;margin-top:10px;margin-bottom:6px;">Background Prompt</label>
                            <textarea id="manual-bg-prompt-textarea" rows="2" placeholder="远处是山，近处是深林和小溪 (Background prompt with location, setting, lighting...)" style="width:100%;padding:8px 12px;border:1px solid #cbd5e1;border-radius:4px;font-size:13px;resize:vertical;font-family:monospace;outline:none;"></textarea>
                            <textarea id="manual-prompt-textarea" rows="5" placeholder="Type your image prompt here. When using 3x3 grid, this becomes the base customer prompt for the story panels." style="width:100%;padding:8px 12px;border:1px solid #cbd5e1;border-radius:4px;font-size:13px;resize:vertical;font-family:monospace;outline:none;display:none;">${initialPrompt}</textarea>
                        </div>

                        <div style="background:#f8fafc;padding:12px;border-radius:4px;border:1px solid #e2e8f0;margin-top:10px;">
                            <div style="display:flex;justify-content:space-between;align-items:center;cursor:pointer;margin-bottom:4px;" onclick="App.toggleManualExtraTypeTags()">
                                <label style="font-size:12px;font-weight:600;color:#475569;cursor:pointer;"><i class="fas fa-paw" style="color:#107c10;margin-right:5px;"></i>Add more charactors</label>
                                <i id="manual-extra-type-tags-chevron" class="fas fa-chevron-down" style="color:#94a3b8;font-size:12px;transition:transform 0.2s;"></i>
                            </div>
                            <div id="manual-extra-type-tags-content" style="display:none;flex-direction:column;gap:8px;">
                                <div style="display:flex;gap:8px;align-items:center;">
                                    <div style="flex:1;position:relative;">
                                        <i class="fas fa-search" style="position:absolute;left:10px;top:12px;color:#94a3b8;font-size:12px;pointer-events:none;"></i>
                                        <textarea id="manual-extra-type-input" rows="3" placeholder="Type, filter, or upload character image..." style="width:100%;padding:8px 12px 8px 28px;border:1px solid #cbd5e1;border-radius:4px;font-size:13px;line-height:1.35;resize:vertical;font-family:inherit;outline:none;background:#fff;" oninput="App.filterExtraTypeTags(this.value)"></textarea>
                                    </div>
                                    <input type="file" id="manual-extra-character-upload" accept="image/*" style="display:none;" onchange="App.generatePromptFromUploadedCharacter(this)">
                                    <button type="button" onclick="document.getElementById('manual-extra-character-upload')?.click()" style="background:none;border:none;color:#6366f1;cursor:pointer;padding:5px;" title="Upload character image and add AI prompt">
                                        <i class="fas fa-upload" style="font-size:16px;"></i>
                                    </button>
                                    <button type="button" onclick="App.addTypeTagToPrompt()" style="background:none;border:none;color:#10b981;cursor:pointer;padding:5px;" title="Add Selection to Prompt">
                                        <i class="fas fa-plus-circle" style="font-size:16px;"></i>
                                    </button>
                                    <button type="button" onclick="App.mixUploadedCharacterPrompt()" style="background:none;border:none;color:#8b5cf6;cursor:pointer;padding:5px;" title="Mix with Main Character">
                                        <i class="fas fa-random" style="font-size:16px;"></i>
                                    </button>
                                    <button type="button" onclick="document.getElementById('manual-extra-type-input').value = ''; document.getElementById('manual-extra-type-select').selectedIndex = -1; App.filterExtraTypeTags(''); App.updateExtraTypePreview?.()" style="background:none;border:none;color:#94a3b8;cursor:pointer;padding:5px;" title="Clear Selection">
                                        <i class="fas fa-times-circle" style="font-size:16px;"></i>
                                    </button>
                                </div>
                                <select id="manual-extra-type-select" size="6" style="width:100%;padding:4px;border:1px solid #cbd5e1;border-radius:4px;font-size:12px;outline:none;background:#fff;cursor:pointer;" onchange="var opt=this.options[this.selectedIndex]; document.getElementById('manual-extra-type-input').value = (opt?.dataset?.char || this.value); App.filterExtraTypeTags(''); App.updateExtraTypePreview?.()">
                                    <option value="" data-imgs="[]" data-char="">-- No type selected --</option>
                                    ${extraTypeOptions}
                                </select>
                                <div id="manual-extra-type-preview" style="width:100%;border-radius:6px;overflow:hidden;border:1px solid #e2e8f0;background:#f1f5f9;display:flex;flex-direction:column;align-items:center;min-height:80px;">
                                    <div id="manual-extra-type-preview-img-wrap" style="width:100%;height:120px;background:#e2e8f0;display:flex;align-items:center;justify-content:center;overflow:hidden;">
                                        <i class="fas fa-image" style="font-size:28px;color:#94a3b8;" id="manual-extra-type-preview-icon"></i>
                                        <img id="manual-extra-type-preview-img" src="" alt="" style="display:none;width:100%;height:100%;object-fit:cover;cursor:zoom-in;"
                                             onclick="App.openManualImageLightbox?.(this.src, 'Type Tag Preview')" />
                                    </div>
                                </div>
                                <div id="manual-extra-upload-status" style="display:none;font-size:12px;color:#6366f1;align-items:center;gap:6px;">
                                    <i class="fas fa-circle-notch fa-spin"></i> AI is analyzing uploaded character...
                                </div>
                            </div>
                        </div>

                        <div>
                            <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:6px;">
                                <label style="font-size:12px;font-weight:600;color:#475569;">Select Art Style</label>
                                <div style="display:flex;align-items:center;gap:8px;">
                                    <button type="button" onclick="App.openAddArtStyleModal()" style="border:1px solid #cbd5e1;background:#f8fafc;color:#10b981;border-radius:4px;padding:4px 8px;font-size:12px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:5px;" title="Add a new Art Style">
                                        <i class="fas fa-plus"></i> Add
                                    </button>
                                    <div style="display:flex;align-items:center;gap:4px;background:#f8fafc;border:1px solid #cbd5e1;border-radius:4px;padding:2px;">
                                        <button type="button" id="manual-mode-category-btn" onclick="App.toggleManualStyleMode('category')" style="border:1px solid #7dd3fc;background:#e0f2fe;color:#0369a1;border-radius:3px;padding:3px 6px;font-size:11px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:4px;" title="Group by Category">
                                            <i class="fas fa-layer-group"></i> Category
                                        </button>
                                        <button type="button" id="manual-mode-location-btn" onclick="App.toggleManualStyleMode('location')" style="border:1px solid transparent;background:transparent;color:#64748b;border-radius:3px;padding:3px 6px;font-size:11px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:4px;" title="Group by Location">
                                            <i class="fas fa-globe"></i> Location
                                        </button>
                                    </div>
                                    <button type="button" id="manual-style-view-toggle" onclick="App.toggleManualStyleView()" style="border:1px solid #cbd5e1;background:#f8fafc;color:#334155;border-radius:4px;padding:4px 8px;font-size:12px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:5px;" title="Switch between dropdown and grid">
                                        <i class="fas fa-th-large" style="font-size:10px;"></i> Grid
                                    </button>
                                    <a href="/art-style-browser.html" target="_blank" style="font-size:12px;color:#0078d4;text-decoration:none;font-weight:600;display:inline-flex;align-items:center;gap:4px;" title="Open full Art Style Explorer">
                                        <i class="fas fa-external-link-alt" style="font-size:10px;"></i> Browse all
                                    </a>
                                    <div style="position:relative;">
                                        <i class="fas fa-search" style="position:absolute;left:8px;top:50%;transform:translateY(-50%);color:#94a3b8;font-size:11px;"></i>
                                        <input type="text" id="manual-style-search" placeholder="Search styles..." style="padding:4px 8px 4px 24px;border:1px solid #cbd5e1;border-radius:4px;font-size:12px;outline:none;width:150px;background:#f8fafc;" oninput="App.filterManualStyles(this.value)">
                                    </div>
                                </div>
                            </div>
                            <div style="display:flex;gap:10px;align-items:flex-start;">
                                <select id="manual-style-select" multiple size="6" data-title="${this.escape(unescapedTitle)}" style="flex:1;min-width:0;padding:8px 12px;border:1px solid #cbd5e1;border-radius:4px;font-size:14px;background:#f8fafc;outline:none;" onchange="App.handleManualStyleSelectChange(this)" oninput="App.handleManualStyleSelectChange(this)">
                                    ${styleOptions}
                                </select>
                                <div id="manual-style-grid" style="flex:1;min-width:0;max-height:310px;overflow:auto;padding:2px;display:none;grid-template-columns:repeat(auto-fill,minmax(145px,1fr));gap:8px;"></div>
                                <div id="manual-style-preview" style="width:140px;flex-shrink:0;border-radius:6px;overflow:hidden;border:1px solid #e2e8f0;background:#f1f5f9;display:flex;flex-direction:column;align-items:center;min-height:130px;position:relative;">
                                    <div id="manual-style-preview-img-wrap" style="width:100%;height:105px;background:#e2e8f0;display:flex;align-items:center;justify-content:center;overflow:hidden;">
                                        <i class="fas fa-palette" style="font-size:28px;color:#94a3b8;" id="manual-style-preview-icon"></i>
                                        <img id="manual-style-preview-img" src="" alt="" style="display:none;width:100%;height:100%;object-fit:cover;cursor:zoom-in;"
                                             onclick="App.openManualImageLightbox(this.src, document.getElementById('manual-style-preview-label')?.textContent || 'Style preview')" />
                                    </div>
                                    <div id="manual-style-preview-label" style="padding:5px 8px;font-size:11px;color:#475569;font-weight:600;text-align:center;line-height:1.3;word-break:break-word;flex:1;">No style selected</div>
                                    <div style="display:flex;width:100%;border-top:1px solid #10b981;margin-top:auto;">
                                        <button type="button" onclick="App.autoGenerateAllSelectedStyles('${eventId}', this, false)" style="flex:1;border:none;background:#ecfdf5;color:#047857;padding:6px 2px;font-size:10px;font-weight:600;cursor:pointer;display:flex;justify-content:center;align-items:center;gap:3px;border-right:1px solid #a7f3d0;" title="Auto generate 10 random styles from all available styles">
                                            <i class="fas fa-magic"></i> Gen 10
                                        </button>
                                        <button type="button" onclick="App.autoGenerateAllSelectedStyles('${eventId}', this, true)" style="flex:1;border:none;background:#ecfdf5;color:#047857;padding:6px 2px;font-size:10px;font-weight:600;cursor:pointer;display:flex;justify-content:center;align-items:center;gap:3px;" title="Auto generate images for explicitly selected styles in random order">
                                            <i class="fas fa-check-double"></i> Gen Sel
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div style="display:flex;align-items:center;gap:15px;margin-top:5px;background:#f8fafc;padding:10px;border-radius:4px;border:1px solid #e2e8f0;">
                            <label style="font-size:12px;font-weight:600;color:#475569;">Mode:</label>
                            <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;">
                                <input type="radio" name="gen-mode" id="m-t2i" value="t2i" checked style="margin:0;" onchange="App.toggleGenMode()">
                                <span style="color:#1e293b;">New Image</span>
                            </label>
                            <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;">
                                <input type="radio" name="gen-mode" id="m-i2i" value="i2i" style="margin:0;" onchange="App.toggleGenMode()">
                                <span style="color:#1e293b;">Style Change (Img2Img)</span>
                            </label>
                        </div>

                        <div style="margin-top:5px;background:#f8fafc;padding:10px;border-radius:4px;border:1px solid #e2e8f0;">
                            <div style="display:flex;justify-content:space-between;align-items:center;cursor:pointer;margin-bottom:4px;" onclick="App.toggleManualMixStyle()">
                                <label style="font-size:12px;font-weight:600;color:#475569;cursor:pointer;"><i class="fas fa-layer-group" style="color:#8b5cf6;margin-right:4px;"></i>Mix Style</label>
                                <i id="manual-mix-style-chevron" class="fas fa-chevron-down" style="color:#94a3b8;font-size:12px;transition:transform 0.2s;"></i>
                            </div>
                            <div id="manual-mix-style-content" style="display:none;">
                                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                                    <div style="display:flex;align-items:center;gap:8px;">
                                        <select id="manual-popular-mix-select" style="padding:4px 8px;border:1px solid #cbd5e1;border-radius:4px;font-size:11px;outline:none;background:#fff;" onchange="App.applyPopularMixStyle()">
                                            ${popularMixOptions}
                                        </select>
                                    </div>
                                    <div style="display:flex;align-items:center;gap:6px;">
                                        <button type="button" id="manual-mix-view-toggle" onclick="App.toggleMixStyleView()" style="border:1px solid #cbd5e1;background:#f8fafc;color:#334155;border-radius:4px;padding:3px 8px;font-size:11px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:4px;" title="Switch Grid/Dropdown">
                                            <i class="fas fa-th-large" style="font-size:9px;"></i> Grid
                                        </button>
                                        <button type="button" onclick="App.randomizeMixStyle()" style="background:#f1f5f9;color:#475569;border:1px solid #cbd5e1;border-radius:4px;padding:3px 8px;font-size:11px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:4px;">
                                            <i class="fas fa-dice"></i> Random
                                        </button>
                                    </div>
                                </div>
                                <div id="manual-mix-dropdown-view">
                                    <div style="display:flex;gap:10px;">
                                        <div style="flex:1;">
                                            <div style="font-size:11px;font-weight:700;color:#64748b;margin-bottom:4px;"><i class="fas fa-user" style="margin-right:3px;color:#8b5cf6;"></i>Character Style</div>
                                            <div style="display:flex;align-items:center;gap:8px;position:relative;margin-bottom:4px;">
                                                <i class="fas fa-search" style="position:absolute;left:8px;top:50%;transform:translateY(-50%);color:#94a3b8;font-size:11px;"></i>
                                                <input type="text" placeholder="Filter character style..." style="width:100%;padding:4px 8px 4px 24px;border:1px solid #cbd5e1;border-radius:4px;font-size:12px;outline:none;background:#fff;" oninput="App.filterMixStyleSelect(this.value, 'manual-mix-char-select')">
                                            </div>
                                            <select id="manual-mix-char-select" size="5" style="width:100%;padding:4px;border:1px solid #cbd5e1;border-radius:4px;font-size:12px;outline:none;background:#fff;" onchange="App.updateMixStylePrompt()">
                                                <option value="">-- Select Character Style --</option>
                                                ${styleOptions.replace('<option value="">-- 自定义提示 Custom Prompt --</option>', '')}
                                            </select>
                                            <textarea id="manual-mix-char-prompt" rows="3" placeholder="Character prompt (auto-filled from cover)..." style="width:100%;margin-top:6px;padding:6px 8px;border:1px solid #c4b5fd;border-radius:4px;font-size:11px;resize:vertical;font-family:monospace;outline:none;background:#faf5ff;"></textarea>
                                        </div>
                                        <div style="flex:1;">
                                            <div style="font-size:11px;font-weight:700;color:#64748b;margin-bottom:4px;"><i class="fas fa-mountain" style="margin-right:3px;color:#0ea5e9;"></i>Background Style</div>
                                            <div style="display:flex;align-items:center;gap:8px;position:relative;margin-bottom:4px;">
                                                <i class="fas fa-search" style="position:absolute;left:8px;top:50%;transform:translateY(-50%);color:#94a3b8;font-size:11px;"></i>
                                                <input type="text" placeholder="Filter background style..." style="width:100%;padding:4px 8px 4px 24px;border:1px solid #cbd5e1;border-radius:4px;font-size:12px;outline:none;background:#fff;" oninput="App.filterMixStyleSelect(this.value, 'manual-mix-bg-select')">
                                            </div>
                                            <select id="manual-mix-bg-select" size="5" style="width:100%;padding:4px;border:1px solid #cbd5e1;border-radius:4px;font-size:12px;outline:none;background:#fff;" onchange="App.updateMixStylePrompt()">
                                                <option value="">-- Select Background Style --</option>
                                                ${styleOptions.replace('<option value="">-- 自定义提示 Custom Prompt --</option>', '')}
                                            </select>
                                            <textarea id="manual-mix-bg-prompt" rows="3" placeholder="Background prompt (auto-filled from cover)..." style="width:100%;margin-top:6px;padding:6px 8px;border:1px solid #7dd3fc;border-radius:4px;font-size:11px;resize:vertical;font-family:monospace;outline:none;background:#f0f9ff;"></textarea>
                                        </div>
                                    </div>
                                </div>
                                <div id="manual-mix-grid-view" style="display:none;">
                                    <div style="display:flex;gap:10px;">
                                        <div style="flex:1;">
                                            <div style="font-size:11px;font-weight:700;color:#64748b;margin-bottom:4px;"><i class="fas fa-user" style="margin-right:3px;color:#8b5cf6;"></i>Character Style</div>
                                            <div style="position:relative;margin-bottom:6px;">
                                                <i class="fas fa-search" style="position:absolute;left:8px;top:50%;transform:translateY(-50%);color:#94a3b8;font-size:11px;"></i>
                                                <input type="text" id="manual-mix-char-grid-search" placeholder="Filter..." style="width:100%;padding:4px 8px 4px 24px;border:1px solid #cbd5e1;border-radius:4px;font-size:12px;outline:none;background:#fff;" oninput="App.renderMixStyleGrid('char', this.value)">
                                            </div>
                                            <div id="manual-mix-char-grid" style="max-height:310px;overflow:auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:6px;"></div>
                                        </div>
                                        <div style="flex:1;">
                                            <div style="font-size:11px;font-weight:700;color:#64748b;margin-bottom:4px;"><i class="fas fa-mountain" style="margin-right:3px;color:#0ea5e9;"></i>Background Style</div>
                                            <div style="position:relative;margin-bottom:6px;">
                                                <i class="fas fa-search" style="position:absolute;left:8px;top:50%;transform:translateY(-50%);color:#94a3b8;font-size:11px;"></i>
                                                <input type="text" id="manual-mix-bg-grid-search" placeholder="Filter..." style="width:100%;padding:4px 8px 4px 24px;border:1px solid #cbd5e1;border-radius:4px;font-size:12px;outline:none;background:#fff;" oninput="App.renderMixStyleGrid('bg', this.value)">
                                            </div>
                                            <div id="manual-mix-bg-grid" style="max-height:310px;overflow:auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:6px;"></div>
                                        </div>
                                    </div>
                                </div>
                                <div style="display:flex;justify-content:center;margin-top:10px;padding-top:10px;border-top:1px solid #e2e8f0;">
                                    <button type="button" onclick="App.runManualGeneration('${eventId}')" style="background:linear-gradient(135deg,#8b5cf6,#0ea5e9);color:white;border:none;border-radius:4px;padding:8px 20px;font-size:13px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:6px;">
                                        <i class="fas fa-magic"></i> Mix & Generate
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div id="i2i-params" style="display:none;margin-top:5px;background:#f8fafc;padding:10px;border-radius:4px;border:1px solid #e2e8f0;">
                            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                                <label style="font-size:12px;font-weight:600;color:#475569;">Style Strength (Influence)</label>
                                <span id="strength-val" style="font-size:12px;font-weight:700;color:#0078d4;">0.5</span>
                            </div>
                            <input type="range" id="manual-strength" min="0.1" max="1.0" step="0.05" value="0.5" style="width:100%;cursor:pointer;" oninput="document.getElementById('strength-val').innerText = this.value">
                            <div style="display:flex;justify-content:space-between;font-size:10px;color:#94a3b8;margin-top:4px;">
                                <span>Subtle Change</span>
                                <span>Strong Change</span>
                            </div>
                        </div>

                        <div style="display:flex;align-items:center;gap:15px;margin-top:5px;background:#f8fafc;padding:10px;border-radius:4px;border:1px solid #e2e8f0;">
                            <label style="font-size:12px;font-weight:600;color:#475569;">Quality:</label>
                            <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;">
                                <input type="radio" name="gen-quality" id="q-fast" value="" style="margin:0;" onchange="App.toggleGenMode()">
                                <span style="color:#1e293b;">Fast (Flux Schnell)</span>
                            </label>
                            <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;">
                                <input type="radio" name="gen-quality" id="q-sdxl" value="sdxl" style="margin:0;" onchange="App.toggleGenMode()">
                                <span style="color:#1e293b;">Quality (SDXL)</span>
                            </label>
                            <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;">
                                <input type="radio" name="gen-quality" id="q-best" value="img2img" style="margin:0;" onchange="App.toggleGenMode()">
                                <span style="color:#1e293b;">Img2Img (SD v1.5)</span>
                            </label>
                            <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;">
                                <input type="radio" name="gen-quality" id="q-gemini" value="gemini" style="margin:0;" onchange="App.toggleGenMode()">
                                <span style="color:#1e293b;">✨ Gemini Image </span>
                            </label>
                            <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;">
                                <input type="radio" name="gen-quality" id="q-webui" value="webui" checked style="margin:0;" onchange="App.toggleGenMode()">
                                <span style="color:#8b5cf6;font-weight:600;"><i class="fas fa-robot"></i> Web UI Auto</span>
                            </label>
                        </div>

                        <div id="gemini-size-params" style="display:none;background:#f8fafc;padding:10px;border-radius:4px;border:1px solid #e2e8f0;margin-top:5px;">
                            <label style="font-size:12px;font-weight:600;color:#475569;">Aspect Ratio:</label>
                            <select id="gemini-size" style="margin-left:8px;padding:4px 8px;border:1px solid #cbd5e1;border-radius:4px;font-size:13px;background:#fff;outline:none;">
                                <option value="1:1">1:1 Square</option>
                                <option value="16:9">16:9 Landscape</option>
                                <option value="9:16">9:16 Portrait</option>
                                <option value="4:3">4:3 Standard</option>
                                <option value="3:4">3:4 Portrait</option>
                            </select>
                        </div>

                        <div style="display:flex;align-items:center;gap:15px;margin-top:5px;background:#f8fafc;padding:10px;border-radius:4px;border:1px solid #e2e8f0;">
                            <label style="font-size:12px;font-weight:600;color:#475569;">Output:</label>
                            <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;">
                                <input type="radio" name="manual-output-mode" value="single" checked style="margin:0;" onchange="App.toggleManualOutputMode()">
                                <span style="color:#1e293b;">Single image</span>
                            </label>
                            <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;">
                                <input type="radio" name="manual-output-mode" value="grid3x3" style="margin:0;" onchange="App.toggleManualOutputMode()">
                                <span style="color:#1e293b;">3x3 grid (9 images)</span>
                            </label>
                        </div>

                        <div id="manual-story-panel" style="display:none;margin-top:5px;background:#f8fafc;padding:10px;border-radius:4px;border:1px solid #e2e8f0;">
                            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;gap:10px;">
                                <label style="font-size:12px;font-weight:600;color:#475569;">3x3 Story Prompts</label>
                                <button id="manual-story-prompt-btn" onclick="App.generateManualStoryPrompts()" style="background:#0f766e;color:#fff;border:none;border-radius:4px;padding:3px 10px;font-size:11px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:5px;" title="Create 9 serial story prompts for 3x3 grid">
                                    <i class="fas fa-book-open"></i> Generate Story
                                </button>
                            </div>
                            <div style="margin-bottom:8px;display:flex;flex-direction:column;gap:5px;">
                                <div style="display:flex;align-items:center;gap:8px;position:relative;">
                                    <i class="fas fa-search" style="position:absolute;left:8px;top:50%;transform:translateY(-50%);color:#94a3b8;font-size:11px;"></i>
                                    <input type="text" id="manual-story-template-search" placeholder="Filter story templates..." style="padding:4px 8px 4px 24px;border:1px solid #cbd5e1;border-radius:4px;font-size:12px;outline:none;flex:1;background:#fff;" oninput="App.filterManualStoryTemplates(this.value)">
                                </div>
                                <select id="manual-story-template-select" size="6" style="width:100%;padding:4px;border:1px solid #cbd5e1;border-radius:4px;font-size:13px;background:#fff;outline:none;" onchange="App.applyManualStoryTemplate(this.value)">
                                    ${storyOptions}
                                </select>
                            </div>
                            <textarea id="manual-story-textarea" rows="9" placeholder="Choose a template and click Generate Story to create 9 serial prompts from the Generation Prompt, then edit them here." style="width:100%;padding:8px 12px;border:1px solid #cbd5e1;border-radius:4px;font-size:12px;resize:vertical;font-family:monospace;outline:none;background:#fff;"></textarea>
                        </div>

                        <div style="display:flex;justify-content:center;margin-top:5px;gap:10px;">
                            <button id="manual-gen-btn" onclick="App.runManualGeneration('${eventId}')" style="background:#0078d4;color:white;border:none;border-radius:4px;padding:10px 24px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:8px;">
                                <i class="fas fa-play"></i> Generate Preview
                            </button>
                            <button id="manual-gen-video-btn" onclick="App.runVideoGeneration('${eventId}')" style="background:#8b5cf6;color:white;border:none;border-radius:4px;padding:10px 24px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:8px;">
                                <i class="fas fa-video"></i> Generate Video
                            </button>
                        </div>

                        <div id="manual-preview-container" style="display:none;flex-direction:column;align-items:center;margin-top:10px;padding:15px;background:#f1f5f9;border-radius:6px;border:1px dashed #cbd5e1;">
                            <div id="manual-preview-loading" style="display:none;color:#64748b;font-size:13px;"><i class="fas fa-circle-notch fa-spin"></i> Generating image... this may take up to 30 seconds.</div>
                            <img id="manual-preview-img" style="display:none;max-width:100%;border-radius:4px;box-shadow:0 4px 6px rgba(0,0,0,0.1);cursor:zoom-in;"
                                 onclick="App.openManualImageLightbox(this.src, 'Generated preview')" />
                            <video id="manual-preview-video" controls autoplay style="display:none;max-width:100%;border-radius:4px;box-shadow:0 4px 6px rgba(0,0,0,0.1);"></video>
                            <div id="manual-save-container" style="display:none;margin-top:15px;">
                                <button id="manual-save-btn" onclick="App.saveManualGenerationToCalendar('${eventId}')" style="background:#10b981;color:white;border:none;border-radius:4px;padding:10px 24px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:8px;">
                                    <i class="fas fa-cloud-upload-alt"></i> Save & Attach to Event
                                </button>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        document.getElementById('manual-char-prompt-textarea').addEventListener('input', () => this.updateCombinedPrompt());
        document.getElementById('manual-bg-prompt-textarea').addEventListener('input', () => this.updateCombinedPrompt());
        this.renderManualStyleGrid();
        this.toggleGenMode();
        this.toggleManualOutputMode();

        if (coverUrl) {
            this._autoGeneratePromptFromCover(unescapedTitle, coverUrl);
        }
    },

    // ── Mode & output toggles ────────────────────────────────────────────────
    toggleManualOutputMode() {
        const modal = document.getElementById('manual-gen-modal');
        const outputMode = modal?.querySelector('input[name="manual-output-mode"]:checked')?.value || 'single';
        const panel = document.getElementById('manual-story-panel');
        if (panel) panel.style.display = outputMode === 'grid3x3' ? 'block' : 'none';
        const storyTextarea = document.getElementById('manual-story-textarea');
        const promptText = document.getElementById('manual-prompt-textarea')?.value.trim() || '';
        if (outputMode === 'grid3x3' && storyTextarea && !storyTextarea.value.trim() && promptText) {
            this.generateManualStoryPrompts();
        }
    },

    toggleManualMixStyle() {
        const content = document.getElementById('manual-mix-style-content');
        const chevron = document.getElementById('manual-mix-style-chevron');
        if (!content || !chevron) return;

        if (content.style.display === 'none') {
            content.style.display = 'block';
            chevron.style.transform = 'rotate(180deg)';
            // Auto-initialize mix prompts from the main prompt on first open
            this._initMixPromptsFromMain();
        } else {
            content.style.display = 'none';
            chevron.style.transform = 'rotate(0deg)';
        }
    },

    _initMixPromptsFromMain() {
        const mainPrompt = (document.getElementById('manual-prompt-textarea')?.value || '').trim();
        const charPrompt = document.getElementById('manual-mix-char-prompt');
        const bgPrompt = document.getElementById('manual-mix-bg-prompt');
        if (!charPrompt || !bgPrompt) return;

        // Only auto-fill if both are empty (don't overwrite user edits)
        if (charPrompt.value.trim() || bgPrompt.value.trim()) return;

        if (mainPrompt) {
            charPrompt.value = mainPrompt;
            bgPrompt.value = mainPrompt;
        }
    },

    toggleManualExtraTypeTags() {
        const content = document.getElementById('manual-extra-type-tags-content');
        const chevron = document.getElementById('manual-extra-type-tags-chevron');
        if (!content || !chevron) return;

        if (content.style.display === 'none') {
            content.style.display = 'flex';
            chevron.style.transform = 'rotate(180deg)';
        } else {
            content.style.display = 'none';
            chevron.style.transform = 'rotate(0deg)';
        }
    },

    toggleGenMode() {
        const isI2I = document.getElementById('m-i2i').checked;
        const isGemini = document.getElementById('q-gemini')?.checked;
        const paramsDiv = document.getElementById('i2i-params');
        const geminiParamsDiv = document.getElementById('gemini-size-params');
        const refCheckbox = document.getElementById('manual-use-ref-image');
        const qFast = document.getElementById('q-fast');
        const qSDXL = document.getElementById('q-sdxl');
        const qBest = document.getElementById('q-best');

        if (paramsDiv) paramsDiv.style.display = (isI2I && !isGemini) ? 'block' : 'none';
        if (geminiParamsDiv) geminiParamsDiv.style.display = isGemini ? 'block' : 'none';

        if (isI2I) {
            if (refCheckbox) {
                refCheckbox.checked = true;
                const refImg = document.getElementById('manual-ref-img-preview');
                if (refImg) refImg.style.opacity = '1';
            }
            if (qFast) { qFast.disabled = true; qFast.closest('label').style.opacity = '0.4'; }
            if (qSDXL) { qSDXL.disabled = true; qSDXL.closest('label').style.opacity = '0.4'; }
            if (!isGemini && qBest) { qBest.checked = true; qBest.disabled = false; qBest.closest('label').style.opacity = '1'; }
        } else {
            if (qFast) { qFast.disabled = false; qFast.closest('label').style.opacity = '1'; }
            if (qSDXL) { qSDXL.disabled = false; qSDXL.closest('label').style.opacity = '1'; }
            if (qBest) { qBest.disabled = false; qBest.closest('label').style.opacity = '1'; }
        }
    },

    // ── AI prompt helpers ────────────────────────────────────────────────────
    _splitGeneratedManualPrompt(prompt, title = '') {
        const cleanPrompt = String(prompt || '').replace(/\s+/g, ' ').trim();
        const cleanTitle = String(title || '').replace(/\s+/g, ' ').trim();
        if (!cleanPrompt) return { character: '', background: '' };

        const labeled = this._extractManualPromptLabels(cleanPrompt);
        if (labeled.character || labeled.background) {
            return {
                character: labeled.character || cleanPrompt,
                background: labeled.background || this._fallbackManualBackgroundPrompt(cleanPrompt)
            };
        }

        const sentenceParts = cleanPrompt
            .split(/(?<=[.!?])\s+/)
            .map(s => s.trim())
            .filter(Boolean);
        const parts = sentenceParts.length > 1
            ? sentenceParts
            : cleanPrompt.split(/\s*,\s*/).map(s => s.trim()).filter(Boolean);

        const bgTerms = /\b(background|backdrop|environment|setting|scene|landscape|city|street|room|interior|exterior|forest|mountain|ocean|river|sky|cloud|sunset|sunrise|night|daylight|lighting|light|shadow|atmosphere|weather|architecture|building|temple|castle|garden|market|plaza|composition|camera|depth of field|bokeh|cinematic|color|palette|vibrant|masterpiece|4k|texture|detail)\b/i;
        const locationTerms = /\b(location|country|place|destination|travel|thailand|tailand|thai|bangkok|phuket|chiang mai|pattaya|krabi|ayutthaya|sukhothai|bali|japan|tokyo|kyoto|china|beijing|shanghai|korea|seoul|vietnam|hanoi|saigon|india|delhi|paris|france|italy|rome|venice|london|england|new york|california|hawaii|mexico|egypt|africa|europe|asia|america|beach|island|temple|market|village|town|city)\b/i;
        const charTerms = /\b(character|subject|person|figure|portrait|face|hair|eyes|skin|pose|wearing|dressed|costume|outfit|expression|standing|sitting|holding|gesture|silhouette|creature|animal|hero|girl|boy|woman|man|child)\b/i;
        const titleWords = cleanTitle
            .toLowerCase()
            .split(/[^a-z0-9]+/)
            .filter(w => w.length > 2);

        const characterParts = [];
        const backgroundParts = [];

        parts.forEach((part, index) => {
            const lower = part.toLowerCase();
            const hasTitleWord = titleWords.some(w => lower.includes(w));
            const hasLocation = locationTerms.test(part);
            const culturalCharacterCue = /\bthai\s+(dress|costume|outfit|clothing|woman|man|girl|boy|person|character)\b/i.test(part);
            const locationIsSetting = hasLocation && !culturalCharacterCue;
            const isBg = bgTerms.test(part) || locationIsSetting;
            const isChar = charTerms.test(part) || hasTitleWord || index === 0;

            if (locationIsSetting && !isChar) {
                backgroundParts.push(part);
            } else if (isBg && !isChar) {
                backgroundParts.push(part);
            } else if (isChar && !isBg) {
                characterParts.push(part);
            } else if (isBg && isChar) {
                if (index === 0) characterParts.push(part);
                else backgroundParts.push(part);
            } else if (characterParts.length <= backgroundParts.length) {
                characterParts.push(part);
            } else {
                backgroundParts.push(part);
            }
        });

        let character = characterParts.join(sentenceParts.length > 1 ? ' ' : ', ').trim();
        let background = backgroundParts.join(sentenceParts.length > 1 ? ' ' : ', ').trim();

        ({ character, background } = this._moveManualLocationDetailsToBackground(character, background));

        if (!background) {
            const fallback = this._splitManualPromptByFirstSentenceOrClause(cleanPrompt);
            character = fallback.character || character || cleanPrompt;
            background = fallback.background || this._fallbackManualBackgroundPrompt(cleanPrompt);
        }

        return { character, background };
    },

    _moveManualLocationDetailsToBackground(character, background) {
        const locationTerms = /\b(location|country|place|destination|travel|thailand|tailand|thai|bangkok|phuket|chiang mai|pattaya|krabi|ayutthaya|sukhothai|bali|japan|tokyo|kyoto|china|beijing|shanghai|korea|seoul|vietnam|hanoi|saigon|india|delhi|paris|france|italy|rome|venice|london|england|new york|california|hawaii|mexico|egypt|africa|europe|asia|america|beach|island|temple|market|village|town|city)\b/i;
        const charTerms = /\b(character|subject|person|figure|portrait|face|hair|eyes|skin|pose|wearing|dressed|costume|outfit|expression|standing|sitting|holding|gesture|silhouette|creature|animal|hero|girl|boy|woman|man|child)\b/i;
        const clauses = String(character || '').split(/\s*,\s*/).map(s => s.trim()).filter(Boolean);
        if (clauses.length < 2) return { character, background };

        const charClauses = [];
        const bgClauses = [];
        clauses.forEach((clause, index) => {
            const hasLocation = locationTerms.test(clause);
            const hasCharacter = charTerms.test(clause);
            const culturalCharacterCue = /\bthai\s+(dress|costume|outfit|clothing|woman|man|girl|boy|person|character)\b/i.test(clause);
            const startsLikeLocation = /^(in|at|near|around|inside|outside|across|within|against|with a background of)\b/i.test(clause);
            if (hasLocation && !culturalCharacterCue && (startsLikeLocation || (!hasCharacter && index > 0))) {
                bgClauses.push(clause);
            } else {
                charClauses.push(clause);
            }
        });

        if (!bgClauses.length || !charClauses.length) return { character, background };
        return {
            character: charClauses.join(', '),
            background: [background, bgClauses.join(', ')].filter(Boolean).join(', ')
        };
    },

    _extractManualPromptLabels(prompt) {
        const result = { character: '', background: '' };
        const charMatch = prompt.match(/(?:^|\n|\s)(?:\[?\s*character(?:\s+prompt)?\s*\]?|character)\s*:\s*([\s\S]*?)(?=(?:\n|\s)(?:\[?\s*background(?:\s+prompt)?\s*\]?|background)\s*:|$)/i);
        const bgMatch = prompt.match(/(?:^|\n|\s)(?:\[?\s*background(?:\s+prompt)?\s*\]?|background)\s*:\s*([\s\S]*?)(?=(?:\n|\s)(?:\[?\s*character(?:\s+prompt)?\s*\]?|character)\s*:|$)/i);
        if (charMatch) result.character = charMatch[1].trim();
        if (bgMatch) result.background = bgMatch[1].trim();
        return result;
    },

    _splitManualPromptByFirstSentenceOrClause(prompt) {
        const sentenceMatch = prompt.match(/^(.+?[.!?])\s+(.+)$/);
        if (sentenceMatch) {
            return { character: sentenceMatch[1].trim(), background: sentenceMatch[2].trim() };
        }
        const clauses = prompt.split(/\s*,\s*/).map(s => s.trim()).filter(Boolean);
        if (clauses.length > 1) {
            const firstCount = Math.max(1, Math.ceil(clauses.length * 0.45));
            return {
                character: clauses.slice(0, firstCount).join(', '),
                background: clauses.slice(firstCount).join(', ')
            };
        }
        return { character: prompt, background: '' };
    },

    _fallbackManualBackgroundPrompt(prompt) {
        const text = String(prompt || '').trim();
        const styleBits = text.match(/\b(cinematic|dramatic lighting|soft lighting|vibrant colors|rich textures|masterpiece|4k|intricate details|depth of field|atmospheric|highly detailed)[^,.]*/gi);
        const styleText = styleBits ? Array.from(new Set(styleBits)).join(', ') : 'cinematic lighting, rich atmosphere, detailed environment';
        return `Detailed background environment matching the character scene, ${styleText}.`;
    },

    _getManualEventLocationContext(ev) {
        if (!ev) return { country: '', location: '' };
        const tags = ev.tags || (ev.description && this.parseTagsFromDescription ? this.parseTagsFromDescription(ev.description) : null) || {};
        const country = String(tags.country || tags.area || '').trim();
        const taggedLocation = [tags.city, tags.province, tags.country]
            .map(v => String(v || '').trim())
            .filter(Boolean)
            .join(', ');
        const location = taggedLocation || String(ev.location || '').trim();
        return { country, location };
    },

    _addManualEventLocationToBackground(background, eventCountry = '', eventLocation = '') {
        const bg = String(background || '').trim();
        const country = String(eventCountry || '').trim();
        const location = String(eventLocation || '').trim();
        const hints = [location, country && !location.toLowerCase().includes(country.toLowerCase()) ? country : ''].filter(Boolean);
        if (!hints.length) return bg;

        const bgLower = bg.toLowerCase();
        const missingHints = hints.filter(h => {
            const compact = h.toLowerCase();
            return compact && !bgLower.includes(compact);
        });
        if (!missingHints.length) return bg;

        const locationText = `Background location: ${missingHints.join(', ')}.`;
        return [bg, locationText].filter(Boolean).join(' ');
    },

    async _autoGeneratePromptFromCover(title, coverUrl) {
        const charTextarea = document.getElementById('manual-char-prompt-textarea');
        const bgTextarea = document.getElementById('manual-bg-prompt-textarea');
        const loadingEl = document.getElementById('manual-prompt-ai-loading');
        const aiBtn = document.getElementById('manual-ai-prompt-btn');
        if (!charTextarea || !bgTextarea) return;
        if (this._manualStoryPromptLocked) {
            if (loadingEl) loadingEl.style.display = 'none';
            return;
        }

        try {
            if (aiBtn) { aiBtn.disabled = true; aiBtn.style.opacity = '0.6'; }
            const serverUrl = this._getServerUrl();
            const extraType = document.getElementById('manual-extra-type-input')?.value;
            const eventCountry = charTextarea.dataset.eventCountry || '';
            const eventLocation = charTextarea.dataset.eventLocation || '';

            const res = await fetch(`${serverUrl}/api/ai/generate-prompt`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    imageUrl: coverUrl,
                    title,
                    extraType: extraType,
                    eventCountry,
                    eventLocation
                })
            });
            const data = await res.json();
            if (data.prompt) {
                if (this._manualStoryPromptLocked) return;

                // New: Call another AI to split the prompt
                try {
                    const splitRes = await fetch(`${serverUrl}/api/ai/split-prompt`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ prompt: data.prompt })
                    });
                    if (!splitRes.ok) throw new Error(`HTTP ${splitRes.status}`);
                    const splitData = await splitRes.json();
                    const split = {
                        character: splitData.character || splitData.characterPrompt || splitData.charPrompt || '',
                        background: splitData.background || splitData.backgroundPrompt || splitData.bgPrompt || ''
                    };
                    if (split.character || split.background) {
                        const localSplit = (!split.character || !split.background)
                            ? this._splitGeneratedManualPrompt(data.prompt, title)
                            : null;
                        charTextarea.value = split.character || localSplit.character;
                        bgTextarea.value = this._addManualEventLocationToBackground(split.background || localSplit.background, eventCountry, eventLocation);
                        console.log(`[AI Prompt] Split into Char/BG`);
                    } else {
                        const localSplit = this._splitGeneratedManualPrompt(data.prompt, title);
                        charTextarea.value = localSplit.character;
                        bgTextarea.value = this._addManualEventLocationToBackground(localSplit.background, eventCountry, eventLocation);
                    }
                } catch (e) {
                    console.warn('[AI Split] Prompt split failed, using local split.', e);
                    const localSplit = this._splitGeneratedManualPrompt(data.prompt, title);
                    charTextarea.value = localSplit.character;
                    bgTextarea.value = this._addManualEventLocationToBackground(localSplit.background, eventCountry, eventLocation);
                }

                const mixChar = document.getElementById('manual-mix-char-prompt');
                const mixBg = document.getElementById('manual-mix-bg-prompt');
                if (mixChar && charTextarea) mixChar.value = charTextarea.value;
                if (mixBg && bgTextarea) mixBg.value = bgTextarea.value;

                this.updateCombinedPrompt();
                console.log(`[AI Prompt] Generated: ${charTextarea.value.substring(0, 50)}... | ${bgTextarea.value.substring(0, 50)}...`);
            }
        } catch (e) {
            console.warn('[AI Prompt] Failed, using default:', e);
            if (this._manualStoryPromptLocked) return;
            const fallbackPrompt = `A highly detailed illustration of ${title}. Cinematic composition, masterpiece, 4k, vibrant colors.`;
            const localSplit = this._splitGeneratedManualPrompt(fallbackPrompt, title);
            charTextarea.value = localSplit.character;
            bgTextarea.value = this._addManualEventLocationToBackground(
                localSplit.background,
                charTextarea.dataset.eventCountry || '',
                charTextarea.dataset.eventLocation || ''
            );

            const mixChar = document.getElementById('manual-mix-char-prompt');
            const mixBg = document.getElementById('manual-mix-bg-prompt');
            if (mixChar && charTextarea) mixChar.value = charTextarea.value;
            if (mixBg && bgTextarea) mixBg.value = bgTextarea.value;

            this.updateCombinedPrompt();
        } finally {
            if (loadingEl) loadingEl.style.display = 'none';
            if (aiBtn) { aiBtn.disabled = false; aiBtn.style.opacity = '1'; }
        }
    },

    async regenerateAIPrompt(title) {
        this._manualStoryPromptLocked = false;
        this._manualStoryPrompts = null;
        const refImg = document.getElementById('manual-ref-img-preview');
        const coverUrl = refImg?.dataset?.url || '';
        const loadingEl = document.getElementById('manual-prompt-ai-loading');
        if (loadingEl) loadingEl.style.display = 'flex';
        await this._autoGeneratePromptFromCover(
            title.replace(/&quot;/g, '\"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>'),
            coverUrl
        );
    },

    async generatePromptFromUploadedCharacter(inputEl) {
        const file = inputEl?.files?.[0];
        const charTextarea = document.getElementById('manual-char-prompt-textarea');
        const statusEl = document.getElementById('manual-extra-upload-status');
        const previewImg = document.getElementById('manual-extra-type-preview-img');
        const previewIcon = document.getElementById('manual-extra-type-preview-icon');
        if (!file || !charTextarea) return;

        try {
            if (statusEl) statusEl.style.display = 'flex';
            const imageUrl = await this._readManualFileAsDataUrl(file);
            if (previewImg) {
                previewImg.src = imageUrl;
                previewImg.style.display = 'block';
                previewImg.onerror = null;
            }
            if (previewIcon) previewIcon.style.display = 'none';

            const serverUrl = this._getServerUrl();
            const eventCountry = charTextarea.dataset.eventCountry || '';
            const eventLocation = charTextarea.dataset.eventLocation || '';
            const res = await fetch(`${serverUrl}/api/ai/generate-prompt`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    imageUrl,
                    title: `uploaded extra character ${file.name || ''}`.trim(),
                    eventCountry,
                    eventLocation,
                    promptMode: 'extraCharacter'
                })
            });
            const data = await res.json();
            const generated = String(data.prompt || '').trim();
            if (!generated) throw new Error(data.error || 'No prompt generated');

            const characterPrompt = this._cleanUploadedCharacterPrompt(generated);
            const extraInput = document.getElementById('manual-extra-type-input');
            if (extraInput) extraInput.value = characterPrompt;
            this._appendUploadedCharacterPrompt(characterPrompt);
            this.updateCombinedPrompt();
        } catch (e) {
            console.warn('[ManualGen] Uploaded character prompt failed:', e);
            alert('Failed to generate prompt from uploaded character image.');
        } finally {
            if (statusEl) statusEl.style.display = 'none';
            if (inputEl) inputEl.value = '';
        }
    },

    _readManualFileAsDataUrl(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error || new Error('Failed to read image file'));
            reader.readAsDataURL(file);
        });
    },

    async uploadManualRefImage(inputEl) {
        const file = inputEl?.files?.[0];
        if (!file) return;

        try {
            const imageUrl = await this._readManualFileAsDataUrl(file);
            const container = document.getElementById('manual-ref-img-container');
            const previewImg = document.getElementById('manual-ref-img-preview');
            const labelSpan = document.getElementById('manual-ref-img-label');
            const checkbox = document.getElementById('manual-use-ref-image');
            
            if (container) container.style.display = 'flex';
            if (previewImg) {
                previewImg.src = imageUrl;
                previewImg.dataset.url = imageUrl;
                previewImg.style.display = 'block';
                const errSpan = container?.querySelector('.ref-img-err');
                if (errSpan) errSpan.remove();
            }
            if (labelSpan) {
                labelSpan.innerHTML = `<i class="fas fa-image" style="color:#0078d4;margin-right:4px;"></i>Reference Image (${file.name})`;
            }
            if (checkbox) {
                checkbox.checked = true;
                if (previewImg) previewImg.style.opacity = '1';
            }
        } catch (e) {
            console.warn('[ManualGen] Uploaded ref image failed:', e);
            alert('Failed to load uploaded image.');
        } finally {
            if (inputEl) inputEl.value = '';
        }
    },

    _appendUploadedCharacterPrompt(uploadedPrompt) {
        const textarea = document.getElementById('manual-char-prompt-textarea');
        const prompt = String(uploadedPrompt || '').replace(/\s+/g, ' ').trim();
        if (!textarea || !prompt) return;

        const current = textarea.value.trim();
        const addition = `Additional uploaded character: ${prompt}`;
        if (!current) {
            textarea.value = addition;
        } else if (!current.toLowerCase().includes(prompt.toLowerCase().slice(0, 80))) {
            textarea.value = `${current}\n\n${addition}. Keep this uploaded character in the same scene with the main character.`;
        }
    },

    mixUploadedCharacterPrompt() {
        const textarea = document.getElementById('manual-char-prompt-textarea');
        const extraInput = document.getElementById('manual-extra-type-input');
        if (!textarea || !extraInput) return;

        const current = textarea.value.trim();
        const uploadedPrompt = String(extraInput.value || '').replace(/\s+/g, ' ').trim();

        if (!uploadedPrompt) {
            alert('Please select or upload an extra character first.');
            return;
        }

        const addition = `Mix and combine the facial features, clothing, and aesthetic of the new character: [${uploadedPrompt}] with the main character above into a single unique character.`;
        if (!current) {
            textarea.value = addition;
        } else if (!current.toLowerCase().includes(uploadedPrompt.toLowerCase().slice(0, 80))) {
            textarea.value = `${current}\n\n${addition}`;
        } else {
            // If it's already in there but we want to mix instead of just add
            textarea.value = current.replace(/Additional uploaded character:.*$/i, addition);
        }
        this.updateCombinedPrompt();
    },

    _cleanUploadedCharacterPrompt(prompt) {
        const cleaned = String(prompt || '')
            .replace(/^\s*(character\s+prompt|prompt|description)\s*:\s*/i, '')
            .replace(/\b(background|setting|environment)\s*:\s*[\s\S]*$/i, '')
            .replace(/\s+/g, ' ')
            .trim();
        const lower = cleaned.toLowerCase();
        if (
            lower.includes('hauntingly beautiful portrait') ||
            lower.includes('ethereal, otherworldly aura') ||
            lower.includes('nearby candle') ||
            (lower.includes('indigo') && lower.includes('pearlescent'))
        ) {
            return 'Uploaded character with visible clothing, colors, pose, expression, accessories, and distinctive details.';
        }
        return cleaned;
    },

    filterManualStoryTemplates(query) {
        const q = query.toLowerCase();
        const select = document.getElementById('manual-story-template-select');
        if (!select) return;
        const optgroups = select.querySelectorAll('optgroup');
        optgroups.forEach(group => {
            let hasVisible = false;
            const options = group.querySelectorAll('option');
            options.forEach(opt => {
                const text = opt.textContent.toLowerCase();
                const match = text.includes(q);
                opt.style.display = match ? '' : 'none';
                if (match) hasVisible = true;
            });
            group.style.display = hasVisible ? '' : 'none';
        });
        const defaultOpt = select.querySelector('option[value=""]');
        if (defaultOpt) defaultOpt.style.display = q ? 'none' : '';
    },

    applyManualStoryTemplate(value) {
        if (value) {
            this.generateManualStoryPrompts();
        }
    },

    generateManualStoryPrompts(title) {
        const textarea = document.getElementById('manual-prompt-textarea');
        if (!textarea) return;

        const selectStyle = document.getElementById('manual-style-select');
        const modalTitle = selectStyle?.dataset?.title || '';
        const customerPrompt = textarea.value.trim();
        const cleanPrompt = String(customerPrompt || title || modalTitle || 'today character')
            .replace(/&quot;/g, '\"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim() || 'today character';
        const style = selectStyle?.value || '';
        const stylePhrase = style ? ` Visual style: ${style}.` : '';

        const selectTemplate = document.getElementById('manual-story-template-select');
        const templateIndex = selectTemplate?.value;

        let scenes = [];
        let scenesZh = [];
        let isTeamAssemble = false;
        if (templateIndex && this._AS_STORY_TEMPLATES && this._AS_STORY_TEMPLATES[templateIndex]) {
            const tpl = this._AS_STORY_TEMPLATES[templateIndex];
            scenes = tpl.scenes || [];
            scenesZh = tpl.scenes_zh || [];
            if (tpl.category && tpl.category.includes('團隊升級流 (Assemble the Team)')) {
                isTeamAssemble = true;
            }
        }

        if (!scenes || scenes.length === 0) {
            scenes = [
                ['Arrival', 'The character appears at dawn, establishing the world, costume, silhouette, and emotional tone.'],
                ['Calling', 'A subtle sign or object reveals the mission and pulls the character forward.'],
                ['Preparation', 'The character gathers tools, studies a map, or focuses before action.'],
                ['First Trial', 'The character faces the first obstacle with clear body language and environmental tension.'],
                ['Discovery', 'A hidden place, artifact, ally, or clue changes the story direction.'],
                ['Conflict', 'The strongest visual challenge arrives, with dramatic lighting and decisive composition.'],
                ['Transformation', 'The character adapts, powers up, changes posture, or reveals inner strength.'],
                ['Resolution', 'The character completes the mission, restoring balance or claiming the symbolic object.'],
                ['Final Icon', 'A poster-like closing image of the character in a memorable heroic pose, showing the story result.'],
            ];
            scenesZh = [
                ['出场', '角色在黎明时分出现，确立世界观、服装、轮廓和情感基调。'],
                ['召唤', '一个微妙的标志或物品揭示了任务，并指引角色前进。'],
                ['准备', '角色在行动前收集工具，研究地图或集中注意力。'],
                ['第一次考验', '角色面临第一个障碍，展现清晰的肢体语言和环境张力。'],
                ['发现', '一个隐藏的地方、神器、盟友或线索改变了故事方向。'],
                ['冲突', '最强烈的视觉挑战到来，具有戏剧性的光影和决定性的构图。'],
                ['蜕变', '角色适应、力量提升、改变姿态，或展现内在力量。'],
                ['结局', '角色完成任务，恢复平衡或获得象征性物品。'],
                ['最终定格', '一张海报般的结束画面，角色摆出令人难忘的英雄姿势，展示故事结果。']
            ];
        }

        const maxScenes = Math.min(9, scenes.length);
        const finalScenes = scenes.slice(0, maxScenes);
        const finalScenesZh = scenesZh.slice(0, maxScenes);

        let extractedChars = [cleanPrompt];
        if (isTeamAssemble) {
            const delimiters = /[,，、]| together with | along with | with | and | 与 | 和 /ig;
            let parts = cleanPrompt.split(delimiters)
                .map(p => p.replace(/all characters share the same scene\.?/ig, '').trim())
                .filter(p => p.length > 0 && p.length < 60);

            if (parts.length >= 3) {
                extractedChars = parts;
            } else {
                const caps = cleanPrompt.match(/([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)/g);
                if (caps && caps.length >= 3) {
                    extractedChars = caps.filter(c => !['In', 'The', 'With', 'And', 'Together', 'Center', 'All', 'Characters', 'Share', 'Same', 'Scene'].includes(c));
                }
            }
            // Shuffle
            extractedChars = extractedChars.sort(() => Math.random() - 0.5);
        }

        const prompts = finalScenes.map(([label, scene], index) => {
            const labelZh = finalScenesZh[index]?.[0] || '';
            const sceneZh = finalScenesZh[index]?.[1] || '';
            const zhText = labelZh ? ` [${labelZh}: ${sceneZh}]` : '';

            let charInstruction = `The main character in this story scene MUST be replaced by the character described in the Base customer prompt.`;

            if (isTeamAssemble) {
                if (index === 0 || index === finalScenes.length - 1) {
                    charInstruction = `The main characters in this story scene MUST be the FULL TEAM described in the Base customer prompt. Include all members gathering together.`;
                } else {
                    const charFocus = extractedChars[(index - 1) % extractedChars.length];
                    charInstruction = `The main character in this story scene MUST be specifically this hero from the team: "${charFocus}". Focus ONLY on this specific character joining or taking action, do not show the full team yet.`;
                }
            }

            return `${index + 1}. ${label}: ${scene}${zhText}\nBase customer prompt: ${cleanPrompt}.\nMake this a complete standalone single-scene image prompt for story scene ${index + 1}. ${charInstruction} Keep this character identity, subject, brand cues, and art direction consistent across the story series. Do not include collage, contact sheet, multiple panels, split screen, or grid layout.`;
        });

        const storyTextarea = document.getElementById('manual-story-textarea');
        if (storyTextarea) storyTextarea.value = prompts.join('\n\n');
        this._manualStoryPrompts = prompts;
        this._manualStoryPromptLocked = true;

        const gridRadio = document.querySelector('input[name="manual-output-mode"][value="grid3x3"]');
        if (gridRadio) gridRadio.checked = true;
        this.toggleManualOutputMode();

        const btn = document.getElementById('manual-story-prompt-btn');
        if (btn) {
            btn.innerHTML = '<i class="fas fa-pen"></i> Story Drafted';
            setTimeout(() => {
                const currentBtn = document.getElementById('manual-story-prompt-btn');
                if (currentBtn) currentBtn.innerHTML = '<i class="fas fa-book-open"></i> Generate Story';
            }, 1800);
        }
    },

    _getManualStoryPrompts(promptText) {
        if (Array.isArray(this._manualStoryPrompts) && this._manualStoryPrompts.length >= 9) {
            return this._manualStoryPrompts.slice(0, 9);
        }
        const text = String(promptText || '').trim();
        if (!text) return [];
        const matches = Array.from(text.matchAll(/(?:^|\n)\s*(?:Scene\s*)?([1-9])[\).:\-]\s*([\s\S]*?)(?=(?:\n\s*(?:Scene\s*)?[1-9][\).:\-]\s*)|$)/gi));
        if (matches.length >= 9) {
            return matches.slice(0, 9).map(match => match[2].trim()).filter(Boolean);
        }
        return text.split(/\n{2,}/).map(part => part.trim()).filter(Boolean).slice(0, 9);
    },
    // ── Image generation core ────────────────────────────────────────────────
    async _resizeImageToBase64(url, maxWidth = 512, maxHeight = 512, quality = 0.75) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                let { width, height } = img;
                const scale = Math.min(maxWidth / width, maxHeight / height, 1);
                width = Math.round(width * scale);
                height = Math.round(height * scale);
                const canvas = document.createElement('canvas');
                canvas.width = width; canvas.height = height;
                canvas.getContext('2d').drawImage(img, 0, 0, width, height);
                canvas.toBlob(blob => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.readAsDataURL(blob);
                }, 'image/jpeg', quality);
            };
            img.onerror = () => reject(new Error('Image load failed'));
            img.src = url;
        });
    },

    async _generateImageWithFallback(prompt, { accountId, token, imageUrl, strength, model, size = '1024x1024' } = {}) {
        const serverUrl = this._getServerUrl();

        // Step 1: Try Gemini if requested
        if (model === 'gemini') {
            try {
                const geminiBody = { prompt, size };
                if (imageUrl) geminiBody.imageUrl = imageUrl;
                const ctrl = new AbortController();
            const tid = setTimeout(() => ctrl.abort(), 60000);
            let res;
            try {
                res = await fetch(`${serverUrl}/api/ai/generate-image-openai`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(geminiBody),
                    signal: ctrl.signal
                });
            } finally {
                clearTimeout(tid);
            }
            
            if (res.ok) {
                const blob = await res.blob();
                if (blob.type.startsWith('image/') || blob.size > 5000) {
                    console.log('[ImgGen] Gemini succeeded');
                    return blob;
                }
            }
            
            
            if (res.status === 429) {
                let errMsg = "Gemini API quota exhausted (429).";
                try {
                    const errData = await res.json();
                    if (errData?.error?.message) errMsg = errData.error.message;
                } catch (e) {}
                const loading = document.getElementById('manual-preview-loading');
                if (loading) loading.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Gemini API quota exhausted.`;
                throw new Error(errMsg);
            }

            if (!res.ok) {
                let errText = await res.text();
                // If the user explicitly wanted Gemini, fail and show the error rather than silently falling back
                throw new Error(`Gemini API Error: ${errText}`);
            }
            
            console.warn(`[ImgGen] Gemini returned ${res?.status} - falling back to CF`);
        } catch (gemErr) {
            if (gemErr.message.includes('quota exhausted') || gemErr.message.includes('Gemini API Error')) {
                throw gemErr; // Rethrow to quit completely
            }
            console.warn('[ImgGen] Gemini network/timeout error:', gemErr.message, '- falling back to CF');
        }
        }
        
        // Step 2: Fallback or explicitly use Cloudflare AI
        const ctrl = new AbortController();
        const tid = setTimeout(() => ctrl.abort(), 120000);
        let cfRes;
        try {
            cfRes = await fetch(`${serverUrl}/api/ai/generate-image`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt, model, imageUrl, strength,
                    ...(accountId ? { accountId, token } : {})
                }),
                signal: ctrl.signal
            });
        } finally {
            clearTimeout(tid);
        }
        if (cfRes.status === 429) throw new Error('CF rate limit (429) — Too Many Requests');
        if (!cfRes.ok) throw new Error(`CF API error (${cfRes.status})`);
        const blob = await cfRes.blob();
        console.log('[ImgGen] CF fallback succeeded');
        return blob;
    },

    _blobToImage(blob) {
        return new Promise((resolve, reject) => {
            const url = URL.createObjectURL(blob);
            const img = new Image();
            img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
            img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Failed to load generated image for grid composition')); };
            img.src = url;
        });
    },

    async _composeImageGrid(blobs, { columns = 3, rows = 3, cellSize = 512, gap = 8 } = {}) {
        const imageSlots = await Promise.all(blobs.slice(0, columns * rows).map(async blob => {
            if (!blob) return null;
            try { return await this._blobToImage(blob); } catch (e) {
                console.warn('[Manual Gen] Failed to load one grid image:', e.message);
                return null;
            }
        }));
        const width = columns * cellSize + (columns - 1) * gap;
        const height = rows * cellSize + (rows - 1) * gap;
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);

        imageSlots.forEach((image, index) => {
            const col = index % columns;
            const row = Math.floor(index / columns);
            const x = col * (cellSize + gap);
            const y = row * (cellSize + gap);
            if (!image) {
                ctx.fillStyle = '#f1f5f9';
                ctx.fillRect(x, y, cellSize, cellSize);
                ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 2;
                ctx.strokeRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
                ctx.fillStyle = '#64748b';
                ctx.font = '24px Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText(`Panel ${index + 1}`, x + cellSize / 2, y + cellSize / 2 - 16);
                ctx.font = '16px Arial, sans-serif';
                ctx.fillText('generation failed', x + cellSize / 2, y + cellSize / 2 + 18);
                return;
            }
            const scale = Math.max(cellSize / image.width, cellSize / image.height);
            const drawWidth = image.width * scale, drawHeight = image.height * scale;
            const drawX = x + (cellSize - drawWidth) / 2, drawY = y + (cellSize - drawHeight) / 2;
            ctx.save();
            ctx.beginPath(); ctx.rect(x, y, cellSize, cellSize); ctx.clip();
            ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
            ctx.restore();
        });

        return new Promise((resolve, reject) => {
            canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Failed to create 3x3 grid image')), 'image/png');
        });
    },

    // ── Run generation ───────────────────────────────────────────────────────
    async autoGenerateAllSelectedStyles(eventId, btn, onlySelected = false) {
        try {
            const modal = document.getElementById('manual-gen-modal');
            const selectedModel = modal?.querySelector('input[name="gen-quality"]:checked')?.value || '';
            if (selectedModel !== 'gemini' && selectedModel !== 'webui') {
                alert('Auto Gen is currently only supported with Gemini Image and Web UI Auto. Please select one of these to use this feature.');
                return;
            }

            const select = document.getElementById('manual-style-select');
            if (!select) return;

            let optionsToGenerate = [];

            if (onlySelected) {
                optionsToGenerate = Array.from(select.selectedOptions).filter(o => o.value && !o.value.startsWith('SELECT_ALL_CATEGORY___'));
                if (optionsToGenerate.length === 0) {
                    alert('No styles selected to generate.');
                    return;
                }
                optionsToGenerate = optionsToGenerate.sort(() => 0.5 - Math.random());
            } else {
                const allOptions = Array.from(select.options).filter(o => o.value && !o.value.startsWith('SELECT_ALL_CATEGORY___'));
                if (allOptions.length > 0) {
                    const numToPick = Math.min(10, allOptions.length);
                    const shuffled = [...allOptions].sort(() => 0.5 - Math.random());
                    optionsToGenerate = shuffled.slice(0, numToPick);
                }
                if (optionsToGenerate.length === 0) {
                    alert('No styles available to generate.');
                    return;
                }
            }

            const originalPrompt = document.getElementById('manual-prompt-textarea')?.value.trim() || '';
            const originalHtml = btn.innerHTML;
            const originalOnclick = btn.onclick;
            
            this._isBatchGenerating = true;
            this._stopAutoGen = false;
            btn.disabled = false;
            btn.style.opacity = '1';
            btn.style.background = '#fef2f2';
            btn.style.color = '#ef4444';
            btn.style.borderTop = '1px solid #ef4444';
            
            btn.onclick = () => {
                this._stopAutoGen = true;
                btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Stopping...`;
                btn.disabled = true;
            };

            for (let i = 0; i < optionsToGenerate.length; i++) {
                if (this._stopAutoGen) {
                    console.log('[AutoGen] Stopped by user.');
                    break;
                }
                if (!document.getElementById('manual-gen-modal')) {
                    console.log('[AutoGen] Modal closed, stopping generation loop.');
                    break;
                }

                const opt = optionsToGenerate[i];
                if (!this._stopAutoGen) {
                    btn.innerHTML = `<i class="fas fa-stop-circle"></i> Stop Gen ${i + 1}/${optionsToGenerate.length}: ${this.escape(opt.value)}`;
                }

                this.selectManualStyle(opt.value);
                this._lastManualGeneratedBlob = null;
                
                try {
                    await this.runManualGeneration(eventId, opt.value);
                } catch (e) {}

                if (this._stopAutoGen || !document.getElementById('manual-gen-modal')) {
                    // Export remaining queue for Puppeteer
                    const remaining = optionsToGenerate.slice(i);
                    const queueData = remaining.map(o => {
                        const styleName = o.value;
                        return { style: styleName, prompt: originalPrompt };
                    });
                    
                    if (queueData.length > 0) {
                        if (this._was429) {
                            try {
                                const serverUrl = this._getServerUrl();
                                await fetch(`${serverUrl}/api/ai/run-web-auto`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify(queueData)
                                });
                                console.log('[AutoGen] Triggered background Puppeteer automation script due to 429.');
                                this._pollWebAutoStatus();
                            } catch (err) {
                                console.error('Failed to trigger background script:', err);
                            }
                            this._was429 = false;
                        } else {
                            const queueBlob = new Blob([JSON.stringify(queueData, null, 2)], { type: 'application/json' });
                            const a = document.createElement('a');
                            a.href = URL.createObjectURL(queueBlob);
                            a.download = 'auto_gen_queue.json';
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            console.log('[AutoGen] Exported remaining queue for external script.');
                        }
                    }
                    break;
                }

                if (this._lastManualGeneratedBlob) {
                    await this.saveManualGenerationToCalendar(eventId, true);
                } else {
                    console.warn('[AutoGen] Failed to generate for style:', opt.value);
                }

                if (i < optionsToGenerate.length - 1) {
                    await new Promise(r => setTimeout(r, 1000));
                }
            }

            this._isBatchGenerating = false;
            btn.innerHTML = this._stopAutoGen ? '<i class="fas fa-stop"></i> Stopped' : '<i class="fas fa-check"></i> Done';
            btn.style.background = '#ecfdf5';
            btn.style.color = '#047857';
            btn.style.borderTop = '1px solid #10b981';
            btn.disabled = true;
            setTimeout(() => {
                btn.innerHTML = originalHtml;
                btn.onclick = originalOnclick;
                btn.disabled = false;
            }, 3000);
        } catch (err) {
            console.error('[AutoGen Error]', err);
            alert('Auto Gen Error: ' + err.message);
        }
    },

    async generateViaWebUI(eventId) {
        const textarea = document.getElementById('manual-prompt-textarea');
        const select = document.getElementById('manual-style-select');
        let prompt = textarea?.value.trim() || '';
        const styleName = select?.value || '';

        if (!prompt) {
            alert('Please enter a generation prompt.');
            return;
        }

        if (styleName && !prompt.toLowerCase().includes(styleName.toLowerCase())) {
            prompt += `. Visual style: ${styleName}.`;
        }

        const geminiSize = document.getElementById('gemini-size')?.value || '1024x1024';
        prompt += `\nPlease generate an image with an aspect ratio of ${geminiSize.replace('x', ':')} or similar layout.`;

        try {
            await navigator.clipboard.writeText(prompt);
            alert('Prompt copied to clipboard!\n\n1. Go to the new Gemini Web UI tab.\n2. Paste the prompt and generate.\n3. Copy the resulting image.\n4. Come back here and press Ctrl+V to paste it!');
            window.open('https://gemini.google.com/app', '_blank');

            const previewContainer = document.getElementById('manual-preview-container');
            const loading = document.getElementById('manual-preview-loading');
            const img = document.getElementById('manual-preview-img');
            const saveContainer = document.getElementById('manual-save-container');

            previewContainer.style.display = 'flex';
            loading.style.display = 'block';
            loading.innerHTML = '<i class="fas fa-clipboard"></i> Waiting for you to paste (Ctrl+V) the generated image here...';
            img.style.display = 'none';
            saveContainer.style.display = 'none';

            if (this._activeWebUIPasteHandler) {
                document.removeEventListener('paste', this._activeWebUIPasteHandler);
            }

            this._activeWebUIPasteHandler = (e) => {
                if (!document.getElementById('manual-gen-modal')) {
                    document.removeEventListener('paste', this._activeWebUIPasteHandler);
                    return;
                }
                const items = (e.clipboardData || e.originalEvent.clipboardData).items;
                for (let index in items) {
                    const item = items[index];
                    if (item.kind === 'file' && item.type.startsWith('image/')) {
                        const blob = item.getAsFile();
                        
                        this._lastManualGeneratedBlob = blob;
                        this._lastManualGeneratedPrompt = prompt;
                        this._lastManualGeneratedStyle = styleName;
                        
                        const styleSlug = (styleName || 'generated').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 40);
                        const d1 = new Date();
                        const ts1 = `${d1.getFullYear()}_${String(d1.getMonth()+1).padStart(2,'0')}_${String(d1.getDate()).padStart(2,'0')}_${String(d1.getHours()).padStart(2,'0')}_${String(d1.getMinutes()).padStart(2,'0')}_${String(d1.getSeconds()).padStart(2,'0')}`;
                        this._saveToLocalSlideshow(blob, `${styleSlug}_${ts1}.png`);
                        
                        const objectURL = URL.createObjectURL(blob);
                        img.src = objectURL;
                        img.style.opacity = '1';
                        loading.style.display = 'none';
                        img.style.display = 'block';
                        saveContainer.style.display = 'block';
                        
                        document.removeEventListener('paste', this._activeWebUIPasteHandler);
                        e.preventDefault();
                        break;
                    }
                }
            };
            document.addEventListener('paste', this._activeWebUIPasteHandler);
        } catch (err) {
            alert('Failed to copy prompt to clipboard. Please copy it manually: ' + prompt);
        }
    },

    async runVideoGeneration(eventId) {
        const textarea = document.getElementById('manual-prompt-textarea');
        const prompt = textarea?.value.trim();
        if (!prompt) {
            alert('Please enter a generation prompt for the video.');
            return;
        }

        const refImg = document.getElementById('manual-ref-img-preview');
        const imageUrl = refImg?.dataset?.url || '';

        if (!imageUrl) {
            alert('No reference image available to generate video from. Please make sure there is a cover image.');
            return;
        }

        const btn = document.getElementById('manual-gen-video-btn');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Starting Video...';
        }

        try {
            const serverUrl = window.location.port === '5500' || window.location.port === '5501' 
                ? `${window.location.protocol}//${window.location.hostname}:8443` 
                : '';
                
            const res = await fetch(`${serverUrl}/api/ai/run-vids-auto`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, imageUrl })
            });

            const data = await res.json();
            if (data.success) {
                // Remove alert to just show the UI loading indicator naturally
                this._pollVidsAutoStatus();
            } else {
                alert('Video generation failed: ' + data.error);
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = '<i class="fas fa-video"></i> Generate Video';
                }
            }
        } catch (err) {
            console.error('Video generation trigger error:', err);
            alert('Failed to trigger video generation: ' + err.message);
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-video"></i> Generate Video';
            }
        }
    },

    async runManualGeneration(eventId, forcedStyle = null) {
        const textarea = document.getElementById('manual-prompt-textarea');
        const select = document.getElementById('manual-style-select');
        let prompt = textarea.value.trim();
        const styleName = forcedStyle || select.value;

        if (!prompt) { alert('Please enter a prompt.'); return; }
        if (styleName && !prompt.toLowerCase().includes(styleName.toLowerCase())) {
            prompt += `. Visual style: ${styleName}.`;
        }

        const previewContainer = document.getElementById('manual-preview-container');
        const loading = document.getElementById('manual-preview-loading');
        const img = document.getElementById('manual-preview-img');
        const saveContainer = document.getElementById('manual-save-container');
        const genBtn = document.getElementById('manual-gen-btn');

        previewContainer.style.display = 'flex';
        loading.style.display = 'block';
        if (!img.getAttribute('src')) {
            img.style.display = 'none';
        } else {
            img.style.display = 'block';
            img.style.opacity = '1';
        }
        saveContainer.style.display = 'none';
        genBtn.disabled = true;
        genBtn.style.opacity = '0.7';

        this._playStyleVoice(styleName);

        let account = this._getCFAccount();
        if (!account) {
            account = await this._fetchCFAccounts();
            if (!account) {
                alert('Cloudflare accounts not configured (or backend unreachable).');
                loading.style.display = 'none';
                genBtn.disabled = false;
                genBtn.style.opacity = '1';
                return;
            }
        }

        try {
            const modal = document.getElementById('manual-gen-modal');
            const selectedModel = modal?.querySelector('input[name="gen-quality"]:checked')?.value || '';
            const outputMode = modal?.querySelector('input[name="manual-output-mode"]:checked')?.value || 'single';
            
            if (selectedModel === 'webui') {
                throw new Error('429: Forced Web UI');
            }
            const storyTextarea = document.getElementById('manual-story-textarea');
            const storyPromptsForGrid = outputMode === 'grid3x3'
                ? this._getManualStoryPrompts(storyTextarea?.value || '')
                : [];

            if (outputMode === 'grid3x3' && storyPromptsForGrid.length < 9) {
                alert('For 3x3 grid, click Generate Story first, or enter 9 story prompts in the story box.');
                loading.style.display = 'none';
                genBtn.disabled = false;
                genBtn.style.opacity = '1';
                return;
            }

            const refCheckbox = document.getElementById('manual-use-ref-image');
            const refImg = document.getElementById('manual-ref-img-preview');
            let imageUrl = '';
            if (refCheckbox && refCheckbox.checked && refImg) imageUrl = refImg.dataset.url;

            const isI2I = document.getElementById('m-i2i')?.checked;
            const strength = document.getElementById('manual-strength')?.value || '0.5';
            const geminiSize = document.getElementById('gemini-size')?.value || '1024x1024';

            let finalImagePayload = imageUrl;
            if ((isI2I || selectedModel === 'gemini') && imageUrl) {
                try {
                    finalImagePayload = await this._resizeImageToBase64(imageUrl, 512, 512, 0.75);
                } catch (e) {
                    console.warn('[img2img] resize failed, using URL:', e.message);
                }
            }

            const generateBlob = async (variantPrompt) => this._generateImageWithFallback(variantPrompt, {
                accountId: account?.id,
                token: account?.token,
                imageUrl: finalImagePayload,
                strength: isI2I ? strength : null,
                model: selectedModel,
                size: geminiSize,
            });

            let blob;
            let savedStyleName = styleName;

            if (outputMode === 'grid3x3') {
                const blobs = [];
                loading.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Generating 3x3 grid: 0 / 9 images...';
                for (let index = 1; index <= 9; index++) {
                    if (!document.getElementById('manual-gen-modal')) {
                        console.log('[Manual Gen] Modal closed, stopping 3x3 grid generation.');
                        break;
                    }
                    let baseStoryPrompt = storyPromptsForGrid[index - 1] || prompt;
                    if (styleName && !baseStoryPrompt.toLowerCase().includes(styleName.toLowerCase())) {
                        baseStoryPrompt += `\nVisual style: ${styleName}.`;
                    }
                    const variantPrompt = storyPromptsForGrid.length >= 9
                        ? baseStoryPrompt
                        : `${baseStoryPrompt}\n\nStory scene ${index} of 9: keep the same subject and art direction, but vary pose, camera angle, background detail, lighting, or composition. Generate one single-scene image only. Do not include collage, contact sheet, multiple panels, split screen, or grid layout.`;
                    try {
                        blobs.push(await generateBlob(variantPrompt));
                    } catch (cellError) {
                        if (!document.getElementById('manual-gen-modal')) break;
                        console.warn(`[Manual Gen] Grid cell ${index} failed:`, cellError.message);
                        try {
                            blobs.push(await generateBlob(`${baseStoryPrompt.slice(0, 700)}\n\nSimple, clear image prompt for story scene ${index}. Generate one single-scene image only. Do not include collage, contact sheet, multiple panels, split screen, or grid layout.`));
                        } catch (retryError) {
                            console.warn(`[Manual Gen] Grid cell ${index} retry failed:`, retryError.message);
                            blobs.push(null);
                        }
                    }
                    if (document.getElementById('manual-preview-loading')) {
                        document.getElementById('manual-preview-loading').innerHTML = `<i class="fas fa-circle-notch fa-spin"></i> Generating 3x3 grid: ${blobs.length} / 9 images...`;
                    }
                }
                if (!blobs.some(Boolean)) throw new Error('No grid images generated after fallback attempts.');
                loading.innerHTML = '<i class="fas fa-th fa-spin"></i> Compositing 3x3 grid...';
                blob = await this._composeImageGrid(blobs, { columns: 3, rows: 3, cellSize: 512, gap: 8 });
                savedStyleName = `${styleName || 'generated'} 3x3`;
            } else {
                blob = await generateBlob(prompt);
            }

            this._lastManualGeneratedBlob = blob;
            this._lastManualGeneratedPrompt = prompt;
            this._lastManualGeneratedStyle = savedStyleName;

            const styleSlug = (this._lastManualGeneratedStyle || 'generated').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 40);
            const d1 = new Date();
            const ts1 = `${d1.getFullYear()}_${String(d1.getMonth()+1).padStart(2,'0')}_${String(d1.getDate()).padStart(2,'0')}_${String(d1.getHours()).padStart(2,'0')}_${String(d1.getMinutes()).padStart(2,'0')}_${String(d1.getSeconds()).padStart(2,'0')}`;
            this._saveToLocalSlideshow(blob, `${styleSlug}_${ts1}.png`);

            const objectURL = URL.createObjectURL(blob);
            img.src = objectURL;
            img.style.opacity = '1';
            loading.style.display = 'none';
            img.style.display = 'block';
            saveContainer.style.display = 'block';

            img.onload = () => {
                const scrollContainer = document.getElementById('manual-gen-scroll');
                if (scrollContainer) {
                    const containerRect = scrollContainer.getBoundingClientRect();
                    const imgRect = img.getBoundingClientRect();
                    const imgCenter = imgRect.top - containerRect.top + imgRect.height / 2;
                    scrollContainer.scrollTo({ top: scrollContainer.scrollTop + imgCenter - scrollContainer.clientHeight / 2, behavior: 'smooth' });
                } else {
                    img.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            };
        } catch (e) {
            console.error('[CF] Generation failed:', e);
            if (e.message && e.message.includes('429')) {
                console.warn('[CF] 429 quota exhausted. Auto Web UI script will handle the rest.');
                this._was429 = true;
                
                // If this is a single image generation (not batch), trigger the fallback immediately
                if (!this._isBatchGenerating) {
                    try {
                        const queueData = [{ style: styleName || 'generated', prompt: prompt }];
                        const serverUrl = this._getServerUrl();
                        await fetch(`${serverUrl}/api/ai/run-web-auto`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(queueData)
                        });
                        console.log('[AutoGen] Triggered background Puppeteer automation script for single generation due to 429.');
                        this._was429 = false;
                        this._pollWebAutoStatus();
                        return;
                    } catch (err) {
                        console.error('Failed to trigger background script:', err);
                    }
                }
            } else {
                alert('Failed to generate image: ' + e.message);
            }
            loading.style.display = 'none';
            this._stopAutoGen = true; // Stop Auto Gen loop if generation completely fails
        } finally {
            if (!this._webAutoPollTimer) {
                genBtn.disabled = false;
                genBtn.style.opacity = '1';
            }
        }
    },

    // ── Save to Calendar ─────────────────────────────────────────────────────
    
    async _pollWebAutoStatus() {
        if (this._webAutoPollTimer) return;
        const loading = document.getElementById('manual-preview-loading');
        const img = document.getElementById('manual-preview-img');
        const previewContainer = document.getElementById('manual-preview-container');
        const saveContainer = document.getElementById('manual-save-container');
        const btn = document.getElementById('manual-gen-btn');
        if (loading) loading.style.display = 'block';
        if (previewContainer) previewContainer.style.display = 'flex';
        if (btn) btn.disabled = true;

        let shownImages = new Set();

        this._webAutoPollTimer = setInterval(async () => {
            try {
                const res = await fetch(this._getServerUrl() + '/api/ai/web-auto-status');
                const data = await res.json();
                
                if (data && data.success) {
                    if (loading) {
                        const baseText = this._isBatchGenerating 
                            ? '<i class="fas fa-circle-notch fa-spin"></i> Generating all styles... this may take a while.'
                            : '<i class="fas fa-circle-notch fa-spin"></i> Generating image... this may take up to 30 seconds.';
                        loading.innerHTML = `${baseText}<br><span style="font-size:12px; color:#64748b; margin-top:6px; display:inline-block;"><i class="fas fa-robot"></i> [Web UI Auto Status]: ${data.latestMessage || 'Starting...'}</span>`;
                    }
                    
                    if (data.completedImages && data.completedImages.length > 0) {
                        for (const item of data.completedImages) {
                            const filename = typeof item === 'string' ? item : item.filename;
                            const style = typeof item === 'object' && item.style ? item.style : (filename.match(/^(.*?)_\\d{4}_\\d{2}_\\d{2}/) ? filename.match(/^(.*?)_\\d{4}_\\d{2}_\\d{2}/)[1].replace(/-/g, ' ') : 'generated');
                            
                            if (!shownImages.has(filename)) {
                                shownImages.add(filename);
                                if (img) {
                                    img.onload = () => {
                                        const scrollContainer = document.getElementById('manual-gen-scroll');
                                        if (scrollContainer) {
                                            const containerRect = scrollContainer.getBoundingClientRect();
                                            const imgRect = img.getBoundingClientRect();
                                            const imgCenter = imgRect.top - containerRect.top + imgRect.height / 2;
                                            scrollContainer.scrollTo({ top: scrollContainer.scrollTop + imgCenter - scrollContainer.clientHeight / 2, behavior: 'smooth' });
                                        } else {
                                            img.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                        }
                                    };
                                    img.src = '/images/slideshow/' + filename;
                                    img.style.display = 'block';
                                    img.style.opacity = '1';
                                    if (loading) loading.style.display = 'none';
                                    if (saveContainer) saveContainer.style.display = 'block';

                                    // Fetch the blob so the user can save it to the calendar
                                    try {
                                        fetch(img.src).then(r => r.blob()).then(blob => {
                                            this._lastManualGeneratedBlob = blob;
                                            this._lastManualGeneratedStyle = style;
                                            const textarea = document.getElementById('manual-prompt-textarea');
                                            if (textarea) this._lastManualGeneratedPrompt = textarea.value.trim();

                                            // Automatically save to local slideshow
                                            const d1 = new Date();
                                            const ts1 = `${d1.getFullYear()}_${String(d1.getMonth()+1).padStart(2,'0')}_${String(d1.getDate()).padStart(2,'0')}_${String(d1.getHours()).padStart(2,'0')}_${String(d1.getMinutes()).padStart(2,'0')}_${String(d1.getSeconds()).padStart(2,'0')}`;
                                            const styleSlug = (style || 'generated').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 40);
                                            this._saveToLocalSlideshow(blob, `${styleSlug}_${ts1}.png`);
                                            
                                            // Automatically update main window
                                            const eventId = document.getElementById('manual-gen-btn')?.getAttribute('onclick')?.match(/'([^']+)'/)?.[1];
                                            if (eventId) {
                                                this.saveManualGenerationToCalendar(eventId, true);
                                            }
                                        });
                                    } catch (e) {}
                                }
                            }
                        }
                    }
                    
                    if (!data.isRunning) {
                        clearInterval(this._webAutoPollTimer);
                        this._webAutoPollTimer = null;
                        if (loading && shownImages.size > 0) loading.style.display = 'none';
                        if (btn) {
                            btn.innerHTML = '<i class="fas fa-check"></i> Done';
                            btn.disabled = false;
                        }
                    }
                }
            } catch (err) {
                console.error('Failed to poll status', err);
            }
        }, 2000);
    },

    async _pollVidsAutoStatus() {
        if (this._vidsAutoPollTimer) return;
        const loading = document.getElementById('manual-preview-loading');
        const img = document.getElementById('manual-preview-img');
        const video = document.getElementById('manual-preview-video');
        const previewContainer = document.getElementById('manual-preview-container');
        const saveContainer = document.getElementById('manual-save-container');
        const btn = document.getElementById('manual-gen-video-btn');
        
        if (loading) loading.style.display = 'block';
        if (previewContainer) previewContainer.style.display = 'flex';
        if (img) img.style.display = 'none';
        if (video) video.style.display = 'none';
        if (btn) btn.disabled = true;

        let shownVideos = new Set();

        this._vidsAutoPollTimer = setInterval(async () => {
            try {
                const res = await fetch(this._getServerUrl() + '/api/ai/vids-auto-status');
                const data = await res.json();
                
                if (data && data.success) {
                    if (loading) {
                        loading.innerHTML = `<i class="fas fa-circle-notch fa-spin"></i> Generating video... this may take a few minutes.<br><span style="font-size:12px; color:#64748b; margin-top:6px; display:inline-block;"><i class="fas fa-video"></i> [Video Auto Status]: ${data.latestMessage || 'Starting...'}</span>`;
                    }
                    
                    if (data.completedVideos && data.completedVideos.length > 0) {
                        for (const item of data.completedVideos) {
                            const filename = typeof item === 'string' ? item : item.filename;
                            
                            if (!shownVideos.has(filename)) {
                                shownVideos.add(filename);
                                if (video) {
                                    // Extract the basename
                                    const base = filename.split(/[\\/]/).pop();
                                    video.src = '/videos/generated/' + base;
                                    video.style.display = 'block';
                                    if (loading) loading.style.display = 'none';
                                    
                                    // Scroll to the video so the user can watch it
                                    video.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                    
                                    // Fetch the video blob so the user can save it to the calendar
                                    try {
                                        fetch(video.src).then(r => r.blob()).then(blob => {
                                            this._lastManualGeneratedBlob = blob;
                                            this._lastManualGeneratedStyle = 'video';
                                            const textarea = document.getElementById('manual-prompt-textarea');
                                            if (textarea) this._lastManualGeneratedPrompt = textarea.value.trim();
                                            if (saveContainer) saveContainer.style.display = 'block';

                                            // Automatically save to local slideshow
                                            const d1 = new Date();
                                            const ts1 = `${d1.getFullYear()}_${String(d1.getMonth()+1).padStart(2,'0')}_${String(d1.getDate()).padStart(2,'0')}_${String(d1.getHours()).padStart(2,'0')}_${String(d1.getMinutes()).padStart(2,'0')}_${String(d1.getSeconds()).padStart(2,'0')}`;
                                            this._saveToLocalSlideshow(blob, `video_${ts1}.mp4`);

                                            // Automatically update main window
                                            const eventId = document.getElementById('manual-gen-btn')?.getAttribute('onclick')?.match(/'([^']+)'/)?.[1];
                                            if (eventId) {
                                                this.saveManualGenerationToCalendar(eventId, true);
                                            }
                                        });
                                    } catch (e) {}
                                }
                            }
                        }
                    }
                    
                    if (!data.isRunning) {
                        clearInterval(this._vidsAutoPollTimer);
                        this._vidsAutoPollTimer = null;
                        if (loading && shownVideos.size > 0) loading.style.display = 'none';
                        if (btn) {
                            btn.innerHTML = '<i class="fas fa-video"></i> Generate Video';
                            btn.disabled = false;
                        }
                    }
                }
            } catch (err) {
                console.error('Failed to poll video status', err);
            }
        }, 3000);
    },
    async _saveToLocalSlideshow(blob, filename) {
        try {
            const formData = new FormData();
            formData.append('image', blob, filename);
            formData.append('filename', filename);
            const serverUrl = this._getServerUrl();
            const res = await fetch(`${serverUrl}/api/save-slideshow-image`, { method: 'POST', body: formData });
            if (!res.ok) console.warn('[CF] Failed to save to local slideshow');
        } catch (e) {
            console.warn('[CF] Error saving to local slideshow:', e);
        }
    },

    _mergeGeneratedCalendarAttachment(eventId, result) {
        const attachment = result?.attachment;
        if (!eventId || !attachment?.title) return;

        const removedTitles = new Set((result.removedAttachments || []).map(a => a?.title).filter(Boolean));
        const mergeInto = (ev) => {
            if (!ev) return;
            if (!Array.isArray(ev.attachments)) ev.attachments = [];
            ev.attachments = ev.attachments.filter(a =>
                a?.title !== attachment.title &&
                a?.fileId !== attachment.fileId &&
                !removedTitles.has(a?.title)
            );
            ev.attachments.push(attachment);

            if (result.event && result.event.description) {
                ev.description = result.event.description;
                ev.bodyHtml = result.event.description.replace(/\n/g, '<br/>');
            }
        };

        mergeInto(window.cloudmailCustomEvents?.find(e => e.id === eventId));
        mergeInto(window.cloudmailLatestEvents?.items?.find(e => e.id === eventId));
        mergeInto(this.state?.emails?.find(e => e.id === eventId));

        try {
            const storeItems = JSON.parse(localStorage.getItem('cloudmail_events') || '[]');
            const storeItem = storeItems.find(e => e.id === eventId);
            if (storeItem) {
                mergeInto(storeItem);
                localStorage.setItem('cloudmail_events', JSON.stringify(storeItems));
            }
        } catch (e) {
            console.warn('[CF] Could not update local event cache:', e);
        }
    },

    async saveManualGenerationToCalendar(eventId, keepPreviewOpen = false) {
        if (!this._lastManualGeneratedBlob) return;

        const saveBtn = document.getElementById('manual-save-btn');
        if (!saveBtn) return;
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Saving...';

        try {
            const formData = new FormData();
            const styleSlug = (this._lastManualGeneratedStyle || 'generated')
                .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 40);
            const d2 = new Date();
            const ts2 = `${d2.getFullYear()}_${String(d2.getMonth()+1).padStart(2,'0')}_${String(d2.getDate()).padStart(2,'0')}_${String(d2.getHours()).padStart(2,'0')}_${String(d2.getMinutes()).padStart(2,'0')}_${String(d2.getSeconds()).padStart(2,'0')}`;
            const isVideo = this._lastManualGeneratedBlob.type.startsWith('video/') || this._lastManualGeneratedStyle === 'video';
            const ext = isVideo ? '.mp4' : '.png';
            const filename = `${styleSlug}_${ts2}${ext}`;
            this._saveToLocalSlideshow(this._lastManualGeneratedBlob, filename);
            formData.append('image', this._lastManualGeneratedBlob, filename);
            formData.append('filename', filename);
            formData.append('prompt', this._lastManualGeneratedPrompt || '');
            formData.append('styleName', this._lastManualGeneratedStyle || '');

            if (eventId === 'folder_slideshow') {
                if (!keepPreviewOpen) this.closeManualGenModal();
                else {
                    saveBtn.innerHTML = '<i class="fas fa-check"></i> Saved Locally';
                    setTimeout(() => { saveBtn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Save & Attach to Event'; saveBtn.disabled = false; }, 2000);
                }
                return;
            }

            const serverUrl = this._getServerUrl();
            const response = await fetch(`${serverUrl}/api/google/calendar/event/${eventId}/attachment`, {
                method: 'POST', body: formData
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || `HTTP ${response.status}`);
            }

            const result = await response.json();
            this._mergeGeneratedCalendarAttachment(eventId, result);

            if (!keepPreviewOpen) {
                // Reset preview area but keep modal open
                ['manual-preview-container', 'manual-preview-img', 'manual-preview-video', 'manual-save-container'].forEach(id => {
                    const el = document.getElementById(id);
                    if (el) el.style.display = 'none';
                });
            }
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Save & Attach to Event';

            // Success toast
            const modal = document.getElementById('manual-gen-modal');
            if (modal) {
                const toast = document.createElement('div');
                toast.style.cssText = 'position:absolute;top:12px;left:50%;transform:translateX(-50%);background:#10b981;color:#fff;padding:8px 20px;border-radius:6px;font-size:13px;font-weight:600;display:flex;align-items:center;gap:8px;box-shadow:0 4px 12px rgba(0,0,0,0.2);z-index:10001;animation:fadeInOut 2.5s ease forwards;';
                toast.innerHTML = '<i class="fas fa-check-circle"></i> Saved to Calendar Event!';
                if (!document.getElementById('manual-gen-toast-style')) {
                    const styleEl = document.createElement('style');
                    styleEl.id = 'manual-gen-toast-style';
                    styleEl.textContent = '@keyframes fadeInOut { 0% { opacity:0;transform:translateX(-50%) translateY(-10px); } 15% { opacity:1;transform:translateX(-50%) translateY(0); } 80% { opacity:1; } 100% { opacity:0; } }';
                    document.head.appendChild(styleEl);
                }
                modal.querySelector('div').appendChild(toast);
                setTimeout(() => toast.remove(), 2600);
            }

            if (this.renderCalendar) this.renderCalendar();
            if (this.openCalendarPreview && this.state?.calendar?.previewEmailId === eventId) {
                this.openCalendarPreview(eventId);
            }

            console.log('[CF] Manual generation attached to event as', result.attachment?.title || filename);
        } catch (e) {
            console.error('Failed to save to calendar:', e);
            alert('Failed to save image: ' + e.message);
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Save & Attach to Event';
        }
    },

    // ── Quick CF placeholder generation ─────────────────────────────────────
    async generateCFImage(el) {
        const eventId = el.getAttribute('data-event-id');
        const title = el.getAttribute('data-title');
        const loading = el.querySelector('.cf-loading');
        if (loading) loading.style.display = 'flex';

        // Play a random style voice during quick generation
        if (!this._allStyleNames) {
            try {
                const res = await fetch('/config/art-styles.json');
                if (res.ok) {
                    const data = await res.json();
                    this._allStyleNames = [];
                    (data._AS_REGION_DATA || []).forEach(r => r.styles.forEach(s => this._allStyleNames.push(s.name)));
                }
            } catch (e) { /* ignore */ }
        }
        if (this._allStyleNames?.length > 0) {
            this._playStyleVoice(this._allStyleNames[Math.floor(Math.random() * this._allStyleNames.length)]);
        }

        let account = this._getCFAccount();
        if (!account) {
            account = await this._fetchCFAccounts();
            if (!account) {
                alert('Cloudflare accounts not configured in .env (or backend unreachable)');
                if (loading) loading.style.display = 'none';
                return;
            }
        }

        try {
            const prompt = `A highly detailed illustration of ${title}. Cinematic composition, masterpiece, 4k, vibrant colors.`;
            const serverUrl = this._getServerUrl();
            const blob = await this._generateImageWithFallback(prompt, { accountId: account?.id, token: account?.token });

            if (!blob.type.startsWith('image/') && blob.size < 5000) {
                const text = await blob.text();
                console.error('[CF] Server returned non-image:', text.substring(0, 200));
                throw new Error('Server returned non-image response — check reply-server logs');
            }

            const objectURL = URL.createObjectURL(blob);
            const wrapper = document.createElement('div');
            wrapper.style.cssText = 'position:relative;width:100%;';
            const img = document.createElement('img');
            img.src = objectURL;
            img.style.cssText = 'width:100%;height:80px;object-fit:cover;display:block;border-radius:4px;';
            img.onerror = () => { img.style.display = 'none'; };
            const statusBadge = document.createElement('div');
            statusBadge.style.cssText = 'position:absolute;bottom:4px;right:4px;background:rgba(0,120,212,0.85);color:#fff;border-radius:4px;padding:2px 7px;font-size:10px;font-weight:600;z-index:2;';
            statusBadge.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Saving…';
            wrapper.appendChild(img);
            wrapper.appendChild(statusBadge);

            if (el.parentElement) {
                el.parentElement.replaceChild(wrapper, el);
                const scrollContainer = wrapper.closest('div[style*="overflow-y:auto"]') || document.documentElement;
                if (scrollContainer === document.documentElement) {
                    window.scrollBy({ top: (wrapper.getBoundingClientRect().bottom - window.innerHeight) + 50, behavior: 'smooth' });
                } else {
                    const wRect = wrapper.getBoundingClientRect(), cRect = scrollContainer.getBoundingClientRect();
                    scrollContainer.scrollTo({ top: scrollContainer.scrollTop + (wRect.bottom - cRect.top - scrollContainer.clientHeight) + 50, behavior: 'smooth' });
                }
            }

            if (eventId) {
                try {
                    const styleSlug = (title || 'generated').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 40);
                    const d3 = new Date();
                    const ts3 = `${d3.getFullYear()}_${String(d3.getMonth()+1).padStart(2,'0')}_${String(d3.getDate()).padStart(2,'0')}_${String(d3.getHours()).padStart(2,'0')}_${String(d3.getMinutes()).padStart(2,'0')}_${String(d3.getSeconds()).padStart(2,'0')}`;
                    const filename3 = `${styleSlug}_${ts3}.png`;
                    this._saveToLocalSlideshow(blob, filename3);
                    
                    if (eventId !== 'folder_slideshow') {
                        const formData = new FormData();
                        formData.append('image', blob, filename3);
                        formData.append('prompt', prompt);
                        formData.append('styleName', title || '');

                        const uploadRes = await fetch(`${serverUrl}/api/google/calendar/event/${eventId}/attachment`, { method: 'POST', body: formData });
                        if (uploadRes.ok) {
                            const result = await uploadRes.json();
                            if (result.attachment?.localUrl) img.src = result.attachment.localUrl;
                            URL.revokeObjectURL(objectURL);
                            statusBadge.style.background = 'rgba(16,185,129,0.85)';
                            statusBadge.innerHTML = '<i class="fas fa-check"></i> Saved';
                            setTimeout(() => statusBadge.remove(), 2500);

                            this._mergeGeneratedCalendarAttachment(eventId, result);
                        } else {
                            const errData = await uploadRes.json().catch(() => ({}));
                            throw new Error(errData.error || `HTTP ${uploadRes.status}`);
                        }
                    } else {
                        // local only
                        statusBadge.style.background = 'rgba(16,185,129,0.85)';
                        statusBadge.innerHTML = '<i class="fas fa-check"></i> Saved';
                        setTimeout(() => statusBadge.remove(), 2500);
                    }
                } catch (uploadErr) {
                    console.error('[CF] Upload failed:', uploadErr.message);
                    statusBadge.style.background = 'rgba(220,38,38,0.85)';
                    statusBadge.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Upload failed`;
                    statusBadge.title = uploadErr.message;
                    setTimeout(() => statusBadge.remove(), 5000);
                }
            } else {
                statusBadge.remove();
            }
        } catch (e) {
            console.error('[CF] Generation failed:', e);
            alert('Failed to generate image: ' + e.message);
            if (loading) loading.style.display = 'none';
        }
    },

    // ── Suggest art styles modal ─────────────────────────────────────────────
    async suggestArtStyles(characterName, charType, charLocation, eventId) {
        if (!this._AS_REGION_DATA_JSON) {
            try {
                const res = await fetch('/config/art-styles.json');
                if (res.ok) {
                    const data = await res.json();
                    this._AS_REGION_DATA_JSON = data._AS_REGION_DATA || [];
                }
            } catch (e) { console.warn('[SuggestStyles] Failed to load art-styles.json:', e); }
        }
        const artStyleData = this._AS_REGION_DATA_JSON || this._AS_REGION_DATA || [];
        if (!artStyleData.length) { alert('Art style data not loaded yet.'); return; }

        let unescapedName = (characterName || '').replace(/&quot;/g, '\"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
        const nameMatch = unescapedName.match(/^第\d+天,\s*(.*?)[,\s]*\d{4}-\d{2}-\d{2}/);
        if (nameMatch) {
            unescapedName = nameMatch[1].trim();
        } else {
            const parts = unescapedName.split(',');
            if (parts.length >= 3 && /^第\d+天/.test(parts[0].trim())) unescapedName = parts[1].trim();
        }
        characterName = unescapedName;

        let allStyles = [];
        artStyleData.forEach(region => {
            if (region.styles) region.styles.forEach(s => allStyles.push({ ...s, region: region.area }));
        });

        const locLower = (charLocation || '').toLowerCase();
        const typeLower = (charType || '').toLowerCase();
        const charLower = (characterName || '').toLowerCase();
        const popularKeywords = ['anime', 'manga', 'ghibli', '3d render', 'pixar', 'cinematic', 'concept art', 'cyberpunk', 'ukiyo-e', 'pop art', 'comic book', 'watercolor', 'oil painting', 'minimalist', 'fantasy', 'sci-fi', 'neon', 'steampunk', 'impressionism', 'art nouveau', 'surrealism'];
        const shuffle = arr => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };

        const popular = shuffle(allStyles.filter(s => popularKeywords.some(p => (s.name || '').toLowerCase().includes(p)))).slice(0, 3);
        const usedNames = new Set(popular.map(s => s.name));

        const local = shuffle(allStyles.filter(s => {
            if (usedNames.has(s.name)) return false;
            const sName = (s.name || '').toLowerCase(), sHint = (s.hint || '').toLowerCase(), sRegion = (s.region || '').toLowerCase();
            return (locLower && (sRegion.includes(locLower) || sName.includes(locLower) || sHint.includes(locLower)))
                || (charLower && (sRegion.includes(charLower) || sName.includes(charLower) || sHint.includes(charLower)));
        })).slice(0, 2);
        local.forEach(s => usedNames.add(s.name));

        const remaining = shuffle(allStyles.filter(s => !usedNames.has(s.name))).slice(0, 5);
        const picked = shuffle([...popular, ...local, ...remaining]);

        let modal = document.getElementById('suggest-style-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'suggest-style-modal';
            modal.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:100000;';
            document.body.appendChild(modal);
            modal.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };
        }

        const escName = this.escape(characterName).replace(/&#39;/g, "\\'");
        const cleanName = this.escape(characterName);

        const listHtml = picked.map(s => {
            const escStyle = this.escape(s.name).replace(/&#39;/g, "\\'");
            const cleanStyle = this.escape(s.name);
            const zhLabel = s.name_zh ? ` <span style="font-size:12px; color:#d97706; font-weight:600; margin-left:4px;">${this.escape(s.name_zh)}</span>` : '';
            return `
            <div class="suggested-style-item" style="border-bottom:1px solid #eee; padding:15px 0;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <div style="font-weight:bold; color:#0369a1;">${this.escape(s.name)}${zhLabel} <span style="font-size:10px; color:#888; font-weight:normal;">(${this.escape(s.region)})</span></div>
                        <div style="font-size:12px; color:#666;">${this.escape(s.hint || '')}</div>
                    </div>
                    <button class="auto-gen-btn" data-cname="${cleanName}" data-style="${cleanStyle}" onclick="App.generateSuggestedImage('${escStyle}', '${escName}', '${typeLower}', '${locLower}', '${eventId}', this)" style="background:#e0f2fe; border:1px solid #bae6fd; color:#0369a1; border-radius:4px; cursor:pointer; padding:6px 12px; font-size:12px; font-weight:bold; white-space:nowrap; margin-left:10px;"><i class="fas fa-wand-magic-sparkles"></i> Generate</button>
                </div>
            </div>`;
        }).join('');

        modal.innerHTML = `
            <div style="background:#fff; width:90%; max-width:600px; border-radius:8px; box-shadow:0 10px 25px rgba(0,0,0,0.2); overflow:hidden; display:flex; flex-direction:column; max-height:90vh; position:relative; z-index:100001;">
                <div style="padding:15px 20px; border-bottom:1px solid #eee; display:flex; justify-content:space-between; align-items:center; background:#f8fafc;">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <h3 style="margin:0; font-size:16px; color:#333;">Suggesting 10 Styles for ${this.escape(characterName) || 'Today'}</h3>
                        <span id="suggest-style-progress" style="font-size:11px; font-weight:bold; color:#fff; background:#0078d4; padding:2px 6px; border-radius:10px;">0 / 10</span>
                    </div>
                    <button onclick="document.getElementById('suggest-style-modal').style.display='none';" style="background:none; border:none; cursor:pointer; font-size:20px; color:#999; line-height:1;">&times;</button>
                </div>
                <div id="suggest-style-scroll" style="padding:15px 20px; overflow-y:auto; flex:1; scroll-behavior:smooth;">${listHtml}</div>
            </div>`;
        modal.style.display = 'flex';

        setTimeout(async () => {
            const btns = Array.from(modal.querySelectorAll('.auto-gen-btn'));
            const progressEl = document.getElementById('suggest-style-progress');
            let completed = 0;
            const total = btns.length;

            for (let i = 0; i < btns.length; i++) {
                if (modal.style.display === 'none') break;
                try {
                    const btn = btns[i];
                    const item = btn.closest('.suggested-style-item');
                    const scrollContainer = document.getElementById('suggest-style-scroll');
                    const scrollTo = (el) => {
                        if (!scrollContainer || !el) return;
                        const cRect = scrollContainer.getBoundingClientRect(), eRect = el.getBoundingClientRect();
                        scrollContainer.scrollTo({ top: scrollContainer.scrollTop + (eRect.bottom - cRect.top - scrollContainer.clientHeight) + 50, behavior: 'smooth' });
                    };
                    scrollTo(item);
                    await new Promise(r => setTimeout(r, 300));

                    let genSuccess = false;
                    for (let attempt = 0; attempt < 3; attempt++) {
                        try {
                            const genPromise = App.generateSuggestedImage(btn.dataset.style, btn.dataset.cname, typeLower, locLower, eventId, btn);
                            if (attempt === 0) {
                                await new Promise(r => setTimeout(r, 150));
                                scrollTo(item?.querySelector('.generated-img-container'));
                            }
                            await genPromise;
                            genSuccess = true;
                            await new Promise(r => setTimeout(r, 200));
                            scrollTo(item?.querySelector('.generated-img-container img, .generated-img-container'));
                            break;
                        } catch (retryErr) {
                            const isRateLimit = retryErr.message?.includes('429') || retryErr.message?.includes('rate');
                            if (attempt < 2) {
                                const waitSec = isRateLimit ? [12, 20][attempt] : [8, 15][attempt];
                                btn.innerHTML = `<i class="fas fa-redo fa-spin"></i> Retry ${attempt + 2}/3 in ${waitSec}s...`;
                                btn.disabled = true;
                                await new Promise(r => setTimeout(r, waitSec * 1000));
                            }
                        }
                    }
                    if (!genSuccess) console.error(`[Batch] All retries failed for ${btn.dataset.style}`);
                } catch (e) { console.error('Batch error:', e); }
                completed++;
                if (progressEl) {
                    progressEl.innerText = `${completed} / ${total}`;
                    if (completed === total) {
                        progressEl.style.background = '#10b981';
                        progressEl.innerText = 'Complete!';
                        setTimeout(() => { modal.style.display = 'none'; if (App.updateEvent) App.updateEvent(eventId); }, 1000);
                    }
                }
                if (i < btns.length - 1) await new Promise(r => setTimeout(r, 5000));
            }
        }, 500);
    },

    async generateSuggestedImage(styleName, characterName, charType, charLocation, eventId, btn) {
        let account = this._getCFAccount();
        if (!account) {
            account = await this._fetchCFAccounts();
            if (!account) { alert('Cloudflare accounts not configured.'); return; }
        }

        this._playStyleVoice(styleName);
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Generating...';

        const container = btn.closest('.suggested-style-item');
        let imgContainer = container.querySelector('.generated-img-container');
        if (!imgContainer) {
            imgContainer = document.createElement('div');
            imgContainer.className = 'generated-img-container';
            imgContainer.style.cssText = 'margin-top:10px; width:100%; border-radius:4px; overflow:hidden; background:#f8fafc; min-height:100px; display:flex; align-items:center; justify-content:center;';
            container.appendChild(imgContainer);
        }
        imgContainer.innerHTML = '<span style="color:#94a3b8; font-size:12px;"><i class="fas fa-palette fa-spin"></i> Step 1/2 — Generating image...</span>';

        try {
            const prompt = `A highly detailed illustration of ${characterName} in the art style of ${styleName}. Cinematic composition, masterpiece, 4k, vibrant colors.`;
            const serverUrl = this._getServerUrl();
            const blob = await this._generateImageWithFallback(prompt, { accountId: account?.id, token: account?.token });

            const styleSlug = (styleName || 'generated').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 40);
            const d4 = new Date();
            const ts4 = `${d4.getFullYear()}_${String(d4.getMonth()+1).padStart(2,'0')}_${String(d4.getDate()).padStart(2,'0')}_${String(d4.getHours()).padStart(2,'0')}_${String(d4.getMinutes()).padStart(2,'0')}_${String(d4.getSeconds()).padStart(2,'0')}`;
            const genFilename = `${styleSlug}_${ts4}.png`;
            this._saveToLocalSlideshow(blob, genFilename);

            const objectURL = URL.createObjectURL(blob);

            imgContainer.style.minHeight = 'auto';
            imgContainer.style.background = 'transparent';
            imgContainer.innerHTML = `<img src="${objectURL}" style="width:100%; height:auto; display:block; border-radius:4px;" />`;

            const scrollContainer = document.getElementById('suggest-style-scroll');
            if (scrollContainer) {
                const cRect = scrollContainer.getBoundingClientRect(), iRect = imgContainer.getBoundingClientRect();
                scrollContainer.scrollTo({ top: scrollContainer.scrollTop + (iRect.bottom - cRect.top - scrollContainer.clientHeight) + 50, behavior: 'smooth' });
            }

            if (eventId && eventId !== 'folder_slideshow') {
                btn.innerHTML = '<i class="fas fa-cloud-upload-alt fa-spin"></i> Uploading...';
                imgContainer.insertAdjacentHTML('afterend', '<div class="upload-status" style="text-align:center;font-size:11px;color:#0369a1;padding:4px 0;"><i class="fas fa-cloud-upload-alt fa-spin"></i> Step 2/2 — Saving to Calendar...</div>');

                const styleSlug = (styleName || 'generated').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 40);
                const formData = new FormData();
                formData.append('image', blob, genFilename);
                formData.append('prompt', prompt);
                formData.append('styleName', styleName);

                const upController = new AbortController();
                const upTimeout = setTimeout(() => upController.abort(), 60000);
                try {
                    const upRes = await fetch(`${serverUrl}/api/google/calendar/event/${eventId}/attachment`, {
                        method: 'POST', body: formData, signal: upController.signal
                    });
                    clearTimeout(upTimeout);
                    if (!upRes.ok) {
                        const errData = await upRes.json().catch(() => ({}));
                        throw new Error(errData.error || `Upload HTTP ${upRes.status}`);
                    }
                    const result = await upRes.json();
                    this._mergeGeneratedCalendarAttachment(eventId, result);
                    const statusEl = container.querySelector('.upload-status');
                    if (statusEl) { statusEl.innerHTML = '<i class="fas fa-check" style="color:#10b981;"></i> Saved to Calendar'; setTimeout(() => statusEl.remove(), 3000); }
                    if (this.renderCalendar) this.renderCalendar();
                    if (this.openCalendarPreview && this.state?.calendar?.previewEmailId === eventId) {
                        this.openCalendarPreview(eventId);
                    }
                } catch (upErr) {
                    clearTimeout(upTimeout);
                    const statusEl = container.querySelector('.upload-status');
                    if (statusEl) statusEl.innerHTML = `<i class="fas fa-exclamation-triangle" style="color:#f59e0b;"></i> Upload failed: ${upErr.name === 'AbortError' ? 'Timeout (60s)' : upErr.message}`;
                }
            }

            btn.innerHTML = '<i class="fas fa-check"></i> Done';
            btn.disabled = false;
            await new Promise(r => setTimeout(r, 1000));
        } catch (e) {
            console.error('[CF] Generation failed:', e);
            imgContainer.innerHTML = `<span style="color:#ef4444; font-size:12px;"><i class="fas fa-exclamation-triangle"></i> ${e.message || 'Network error'}</span>`;
            btn.innerHTML = '<i class="fas fa-redo"></i> Retry';
            btn.disabled = false;
            throw e;
        }
    },

    // ── Art style UI helpers ─────────────────────────────────────────────────
    _REGION_ZH_MAP: {
        'Classical & Traditional': '古典与传统 Classical & Traditional',
        'Illustrated & Animation': '插画与动画 Illustrated & Animation',
        'Abstract & Modernist': '抽象与现代 Abstract & Modernist',
        'Atmospheric & Thematic': '氛围与主题 Atmospheric & Thematic',
        'Regional & Cultural': '地域与文化 Regional & Cultural',
        'Pop Culture & Media': '流行文化与媒体 Pop Culture & Media',
        'Photography & Realism': '摄影与写实 Photography & Realism',
        'Texture & Craft': '质感与工艺 Texture & Craft',
        'Ink & Tattoo': '水墨与纹身 Ink & Tattoo',
    },

    _getRegionLabelZh(area) { return this._REGION_ZH_MAP[area] || area; },

    _buildStyleOption(style) {
        let label = this.escape(style.name);
        if (style.name_zh) label += ` (${this.escape(style.name_zh)})`;
        return `<option value="${this.escape(style.name)}" title="${this.escape(style.hint || '')}" data-zh="${this.escape(style.name_zh || '')}">${label}</option>`;
    },

    _getManualArtStyleData() {
        const regionData = this._AS_REGION_DATA_JSON || this._AS_REGION_DATA || [];
        const philData = this._AS_PHIL_DATA_JSON || this._AS_PHIL_DATA || [];
        const merged = [];
        const groupNames = new Set();
        const addGroup = group => {
            const label = group.area || group.group || group.nick || 'Styles';
            if (!label || groupNames.has(label) || !Array.isArray(group.styles) || !group.styles.length) return;
            groupNames.add(label);
            merged.push({ ...group, area: group.area || group.group || label, nick: group.nick || group.group || label });
        };
        regionData.forEach(addGroup);
        philData.forEach(addGroup);
        return merged;
    },

    _getManualStyleGroups(query = '') {
        const artStyleData = this._getManualArtStyleData();
        const q = String(query || '').toLowerCase().trim();
        const groups = [];
        const seen = new Set();
        const mode = this._manualStyleMode || 'category';

        if (mode === 'category') {
            artStyleData.forEach(data => {
                const regionLabel = this._getRegionLabelZh(data.area || data.group || data.nick || 'Styles');
                const groupMatch = q && `${regionLabel} ${data.area || ''} ${data.nick || ''}`.toLowerCase().includes(q);
                const styles = [];
                (data.styles || []).forEach(style => {
                    const key = String(style.name || '').toLowerCase().trim();
                    if (!key || seen.has(key)) return;
                    const searchStr = `${style.name || ''} ${style.hint || ''} ${style.name_zh || ''} ${regionLabel} ${style.location || ''}`.toLowerCase();
                    if (q && !groupMatch && !searchStr.includes(q)) return;
                    seen.add(key);
                    styles.push({ ...style, regionLabel, groupLabel: regionLabel });
                });
                if (styles.length) groups.push({ label: regionLabel, styles });
            });
        } else if (mode === 'location') {
            const locMap = {};
            artStyleData.forEach(data => {
                const regionLabel = this._getRegionLabelZh(data.area || data.group || data.nick || 'Styles');
                (data.styles || []).forEach(style => {
                    const key = String(style.name || '').toLowerCase().trim();
                    if (!key || seen.has(key)) return;
                    const loc = style.location || 'Global / Digital';
                    const groupMatch = q && loc.toLowerCase().includes(q);
                    const searchStr = `${style.name || ''} ${style.hint || ''} ${style.name_zh || ''} ${regionLabel} ${loc}`.toLowerCase();
                    if (q && !groupMatch && !searchStr.includes(q)) return;
                    seen.add(key);

                    if (!locMap[loc]) locMap[loc] = [];
                    locMap[loc].push({ ...style, regionLabel, groupLabel: `🌍 ${loc}` });
                });
            });
            Object.keys(locMap).sort().forEach(loc => {
                groups.push({ label: `🌍 ${loc}`, styles: locMap[loc] });
            });
        }
        return groups;
    },

    renderManualStyleGrid(query = '') {
        const grid = document.getElementById('manual-style-grid');
        if (!grid) return;
        const groups = this._getManualStyleGroups(query);
        if (!groups.length) {
            grid.innerHTML = '<div style="grid-column:1/-1;padding:24px;text-align:center;color:#94a3b8;font-size:13px;background:#f8fafc;border:1px dashed #cbd5e1;border-radius:6px;">No styles found.</div>';
            return;
        }
        grid.innerHTML = groups.map(group => {
            const styleNames = group.styles.map(s => s.name);
            const isAllSelected = this._selectedManualStyles && styleNames.every(name => this._selectedManualStyles.includes(name));
            return `
                <div style="grid-column:1/-1;display:flex;align-items:center;gap:10px;margin:8px 0 2px;cursor:pointer;" 
                     data-category="${this.escape(group.label)}" 
                     onclick="App.toggleCategoryStyles(this.dataset.category, event)">
                    <div style="font-size:12px;font-weight:800;color:#334155;text-transform:uppercase;letter-spacing:.4px;white-space:nowrap;display:flex;align-items:center;gap:6px;user-select:none;">
                        <i class="${isAllSelected ? 'fas fa-check-square' : 'far fa-square'}" style="color:#0078d4;font-size:14px;"></i>
                        ${this.escape(group.label)}
                    </div>
                    <div style="height:1px;background:#e2e8f0;flex:1;"></div>
                </div>
                ${group.styles.map(style => this._manualStyleCardHtml(style)).join('')}
            `;
        }).join('');
    },

    toggleCategoryStyles(categoryLabel, event) {
        if (event) {
            event.stopPropagation();
            event.preventDefault();
        }
        const groups = this._getManualStyleGroups(document.getElementById('manual-style-search')?.value || '');
        const group = groups.find(g => g.label === categoryLabel);
        if (!group) return;

        const styleNames = group.styles.map(s => s.name);
        const allSelected = styleNames.every(name => this._selectedManualStyles.includes(name));

        if (allSelected) {
            // Deselect all styles in this category
            this._selectedManualStyles = this._selectedManualStyles.filter(name => !styleNames.includes(name));
        } else {
            // Select all styles in this category
            styleNames.forEach(name => {
                if (!this._selectedManualStyles.includes(name)) {
                    this._selectedManualStyles.push(name);
                }
            });
        }

        // Sync to select element
        const select = document.getElementById('manual-style-select');
        if (select) {
            Array.from(select.options).forEach(opt => {
                if (opt.value) {
                    opt.selected = this._selectedManualStyles.includes(opt.value);
                }
            });
            this.updateManualPromptFromSelect(select);
        }

        this.renderManualStyleGrid(document.getElementById('manual-style-search')?.value || '');
    },

    handleManualStyleSelectChange(select) {
        let hasSelectAll = false;
        let selectAllLabel = '';

        Array.from(select.selectedOptions).forEach(opt => {
            if (opt.value && opt.value.startsWith('SELECT_ALL_CATEGORY___')) {
                hasSelectAll = true;
                selectAllLabel = opt.value.replace('SELECT_ALL_CATEGORY___', '');
                opt.selected = false; // Deselect the meta-option
            }
        });

        if (hasSelectAll) {
            const query = document.getElementById('manual-style-search')?.value || '';
            const groups = this._getManualStyleGroups(query);
            const groupMatch = groups.find(g => g.label === selectAllLabel);
            if (groupMatch) {
                const styleNames = groupMatch.styles.map(s => s.name);
                const allAlreadySelected = styleNames.every(name => this._selectedManualStyles.includes(name));

                if (allAlreadySelected) {
                    this._selectedManualStyles = this._selectedManualStyles.filter(name => !styleNames.includes(name));
                } else {
                    styleNames.forEach(name => {
                        if (!this._selectedManualStyles.includes(name)) {
                            this._selectedManualStyles.push(name);
                        }
                    });
                }
            }

            Array.from(select.options).forEach(opt => {
                if (opt.value && !opt.value.startsWith('SELECT_ALL_CATEGORY___')) {
                    opt.selected = this._selectedManualStyles.includes(opt.value);
                }
            });
            this.updateManualPromptFromSelect(select);
            this.renderManualStyleGrid(query);
            return;
        }

        const selectedOptions = Array.from(select.selectedOptions).filter(opt => opt.value && !opt.value.startsWith('SELECT_ALL_CATEGORY___'));
        this._selectedManualStyles = selectedOptions.map(opt => opt.value);
        if (this._selectedManualStyles.length > 0) {
            this._lastClickedStyle = this._selectedManualStyles[this._selectedManualStyles.length - 1];
        }
        this.updateManualPromptFromSelect(select);

        // Re-render grid to update active card states
        const searchQuery = document.getElementById('manual-style-search')?.value || '';
        this.renderManualStyleGrid(searchQuery);
    },

    toggleManualStyleView(forceView = '') {
        const select = document.getElementById('manual-style-select');
        const grid = document.getElementById('manual-style-grid');
        const btn = document.getElementById('manual-style-view-toggle');
        const preview = document.getElementById('manual-style-preview');
        if (!select || !grid) return;
        const showGrid = forceView ? forceView === 'grid' : grid.style.display === 'none';
        select.style.display = showGrid ? 'none' : '';
        grid.style.display = showGrid ? 'grid' : 'none';
        if (preview) preview.style.display = showGrid ? 'none' : 'flex';
        if (btn) btn.innerHTML = showGrid
            ? '<i class="fas fa-list" style="font-size:10px;"></i> Dropdown'
            : '<i class="fas fa-th-large" style="font-size:10px;"></i> Grid';
        if (showGrid) this.renderManualStyleGrid(document.getElementById('manual-style-search')?.value || '');
    },

    _manualStyleCardHtml(style, selectedStyle = '') {
        const name = style.name || '';
        const safeName = this.escape(name), safeHint = this.escape(style.hint || ''), safeZh = this.escape(style.name_zh || '');
        const region = this.escape(style.regionLabel || '');
        const active = this._selectedManualStyles && this._selectedManualStyles.includes(name);
        const imgUrl = this.escape(this._getManualPrimaryStyleImageUrl(name) || '');
        return `
            <div class="manual-style-card" data-style="${safeName}" role="button" tabindex="0"
                    onclick="App.selectManualStyle(this.dataset.style, event)"
                    onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();App.selectManualStyle(this.dataset.style, event)}"
                    style="position:relative;text-align:left;border:${active ? '2px solid #0078d4' : '1px solid #dbe4ef'};border-radius:6px;background:#fff;padding:0;overflow:hidden;cursor:pointer;box-shadow:${active ? '0 0 0 2px rgba(0,120,212,0.12)' : 'none'};min-height:178px;">
                <div style="height:92px;background:#e2e8f0;display:flex;align-items:center;justify-content:center;overflow:hidden;">
                    ${imgUrl
                ? `<img src="${imgUrl}" alt="${safeName}" loading="lazy" style="width:100%;height:100%;object-fit:cover;" onerror="if(this.src.includes('.webp')){this.src=this.src.replace('.webp','.png');}else{this.style.display='none';this.nextElementSibling.style.display='flex';}"><span style="display:none;width:100%;height:100%;align-items:center;justify-content:center;color:#94a3b8;"><i class="fas fa-palette"></i></span>`
                : `<span style="display:flex;width:100%;height:100%;align-items:center;justify-content:center;color:#94a3b8;"><i class="fas fa-palette"></i></span>`}
                </div>
                <div style="padding:8px 8px 34px;">
                    <div style="font-size:12px;font-weight:700;color:#1e293b;line-height:1.25;min-height:30px;">${safeName}${safeZh ? `<span style="display:block;font-weight:600;color:#d97706;font-size:11px;margin-top:2px;">${safeZh}</span>` : ''}</div>
                    <div style="font-size:10px;color:#64748b;line-height:1.25;margin-top:5px;height:26px;overflow:hidden;">${safeHint || region}</div>
                </div>
                <button type="button" onclick="event.stopPropagation();App.playManualStyleVoice(this.closest('.manual-style-card').dataset.style, this)"
                        style="position:absolute;left:8px;bottom:8px;border:1px solid #cbd5e1;background:#f8fafc;color:#0078d4;border-radius:14px;height:22px;padding:0 8px;font-size:10px;font-weight:700;display:inline-flex;align-items:center;gap:4px;cursor:pointer;">
                    <i class="fas fa-play" style="font-size:8px;"></i> Play
                </button>
                <button type="button" onclick="event.stopPropagation();App.openManualStyleSamples(this.closest('.manual-style-card').dataset.style)"
                        style="position:absolute;left:68px;bottom:8px;border:1px solid #cbd5e1;background:#fff;color:#475569;border-radius:14px;height:22px;padding:0 8px;font-size:10px;font-weight:700;display:inline-flex;align-items:center;gap:4px;cursor:pointer;">
                    <i class="fas fa-images" style="font-size:8px;"></i> Samples
                </button>
                ${active ? '<span style="position:absolute;right:8px;bottom:8px;color:#0078d4;font-size:13px;"><i class="fas fa-check-circle"></i></span>' : ''}
            </div>`;
    },

    selectManualStyle(styleName, event = null) {
        const select = document.getElementById('manual-style-select');
        if (!select) return;

        if (event && (event.ctrlKey || event.metaKey)) {
            // Ctrl/Cmd + click: Toggle selection
            if (this._selectedManualStyles.includes(styleName)) {
                this._selectedManualStyles = this._selectedManualStyles.filter(s => s !== styleName);
            } else {
                this._selectedManualStyles.push(styleName);
            }
            this._lastClickedStyle = styleName;
        } else if (event && event.shiftKey && this._lastClickedStyle) {
            // Shift + click: range selection
            const cards = Array.from(document.querySelectorAll('.manual-style-card'));
            const styleNames = cards.map(c => c.dataset.style);
            const idxStart = styleNames.indexOf(this._lastClickedStyle);
            const idxEnd = styleNames.indexOf(styleName);
            if (idxStart !== -1 && idxEnd !== -1) {
                const min = Math.min(idxStart, idxEnd);
                const max = Math.max(idxStart, idxEnd);
                const range = styleNames.slice(min, max + 1);
                range.forEach(s => {
                    if (!this._selectedManualStyles.includes(s)) {
                        this._selectedManualStyles.push(s);
                    }
                });
            }
            this._lastClickedStyle = styleName;
        } else {
            // Normal click: select single
            this._selectedManualStyles = styleName ? [styleName] : [];
            this._lastClickedStyle = styleName;
        }

        // Sync to select element
        if (select) {
            Array.from(select.options).forEach(opt => {
                if (opt.value) {
                    opt.selected = this._selectedManualStyles.includes(opt.value);
                }
            });
            this.updateManualPromptFromSelect(select);
        }

        this.renderManualStyleGrid(document.getElementById('manual-style-search')?.value || '');
    },

    playManualStyleVoice(styleName, btn = null) {
        this._playStyleVoice(styleName);
        if (!btn) return;
        const old = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-volume-up" style="font-size:8px;"></i> Playing';
        btn.style.background = '#e0f2fe'; btn.style.borderColor = '#7dd3fc';
        setTimeout(() => {
            if (!document.body.contains(btn)) return;
            btn.innerHTML = old; btn.style.background = '#f8fafc'; btn.style.borderColor = '#cbd5e1';
        }, 1600);
    },

    filterManualStyles(query) {
        const select = document.getElementById('manual-style-select');
        if (!select) return;
        const q = (query || '').toLowerCase().trim();

        let styleOptions = '<option value="">-- 自定义提示 Custom Prompt --</option>';
        const groups = this._getManualStyleGroups(query);
        groups.forEach(group => {
            let grpHtml = `<option value="SELECT_ALL_CATEGORY___${this.escape(group.label)}" style="font-weight:bold;color:#0369a1;background:#f0f9ff;">[+] Toggle Category: ${this.escape(group.label)}</option>`;
            group.styles.forEach(style => {
                grpHtml += this._buildStyleOption(style);
            });
            if (grpHtml) {
                styleOptions += `<optgroup label="${this.escape(group.label)}">${grpHtml}</optgroup>`;
            }
        });

        const currentVal = select.value;
        const selectedOptions = Array.from(select.selectedOptions).map(o => o.value);
        select.innerHTML = styleOptions;

        let foundAny = false;
        Array.from(select.options).forEach(opt => {
            if (opt.value && selectedOptions.includes(opt.value)) {
                opt.selected = true;
                foundAny = true;
            }
        });
        if (!foundAny && select.options.length > 0 && currentVal === '') {
            select.selectedIndex = 0;
        }

        this.renderManualStyleGrid(query);
    },

    toggleManualStyleMode(mode) {
        this._manualStyleMode = mode;
        const searchInput = document.getElementById('manual-style-search');
        this.filterManualStyles(searchInput ? searchInput.value : '');

        const catBtn = document.getElementById('manual-mode-category-btn');
        const locBtn = document.getElementById('manual-mode-location-btn');
        if (catBtn && locBtn) {
            catBtn.style.background = mode === 'category' ? '#e0f2fe' : 'transparent';
            catBtn.style.color = mode === 'category' ? '#0369a1' : '#64748b';
            catBtn.style.borderColor = mode === 'category' ? '#7dd3fc' : 'transparent';

            locBtn.style.background = mode === 'location' ? '#dcfce7' : 'transparent';
            locBtn.style.color = mode === 'location' ? '#166534' : '#64748b';
            locBtn.style.borderColor = mode === 'location' ? '#86efac' : 'transparent';
        }
    },

    updateManualPromptFromSelect(selectEl) {
        const select = selectEl || document.getElementById('manual-style-select');
        const title = select?.dataset?.title || '';
        const result = this.updateManualPrompt(title, select);
        const styleName = select?.value || '';
        if (styleName) this._playStyleVoice(styleName);
        return result;
    },

    updateManualPrompt(title, selectEl = null) {
        const select = selectEl || document.getElementById('manual-style-select');
        const textarea = document.getElementById('manual-prompt-textarea');
        if (!select || !textarea) return;

        let currentText = textarea.value.trim();
        const selectedOption = select.selectedOptions?.[0] || select.options?.[select.selectedIndex] || null;
        const newStyle = (selectedOption?.value) ? selectedOption.value : (select.value || '');
        const oldStyle = select.dataset.lastStyle || '';

        const boilerplatePatterns = [
            /,?\s*Rich textures/gi, /,?\s*dramatic lighting/gi, /,?\s*cinematic composition/gi,
            /,?\s*masterpiece quality/gi, /,?\s*masterpiece/gi, /,?\s*4k/gi, /,?\s*8k/gi,
            /,?\s*vibrant colors/gi, /,?\s*intricate details/gi, /,?\s*highly detailed/gi,
            /,?\s*ultra detailed/gi, /,?\s*best quality/gi,
        ];
        const styleRegex = /,?\s*in the (?:art )?style of [^.,]+/gi;

        if (newStyle) {
            boilerplatePatterns.forEach(pat => { currentText = currentText.replace(pat, ''); });
            currentText = currentText.replace(/\.\s*\./g, '.').replace(/,\s*,/g, ',').replace(/,\s*\./g, '.')
                .replace(/^\s*,\s*/, '').replace(/\s{2,}/g, ' ').trim();
        }

        if (oldStyle && currentText.match(styleRegex)) {
            currentText = newStyle
                ? currentText.replace(styleRegex, `, in the art style of ${newStyle}`)
                : currentText.replace(styleRegex, '');
        } else if (newStyle) {
            const lastPeriod = currentText.lastIndexOf('.');
            if (lastPeriod > 0) currentText = currentText.substring(0, lastPeriod) + `, in the art style of ${newStyle}` + currentText.substring(lastPeriod);
            else currentText += `, in the art style of ${newStyle}.`;
        }

        textarea.value = currentText;
        select.dataset.lastStyle = newStyle;
        this._updateStylePreview(newStyle, select);
    },

    applyPopularMixStyle() {
        const popularSelect = document.getElementById('manual-popular-mix-select');
        const charSelect = document.getElementById('manual-mix-char-select');
        const bgSelect = document.getElementById('manual-mix-bg-select');
        const textarea = document.getElementById('manual-prompt-textarea');
        if (!popularSelect || !popularSelect.value || !textarea) return;

        const mixName = popularSelect.value;
        const opt = popularSelect.selectedOptions[0];
        const mixHint = opt ? opt.dataset.hint : '';

        const mixText = opt ? opt.text : mixName;
        let mixNameZh = mixName;
        if (mixText.includes('(') && mixText.includes(')')) {
            mixNameZh = mixText.split('(')[1].split(')')[0];
        }

        const mainSelect = document.getElementById('manual-style-select');
        const subject = mainSelect?.dataset?.title || 'today character';

        textarea.value = `A highly detailed illustration of ${subject} in the mixed style of ${mixName}.\nStyle details: ${mixHint}.\nCinematic composition, masterpiece, 4k, vibrant colors.\n\n中文提示词 (Chinese Prompt):\n一幅关于 ${subject} 的高细节插画，采用 ${mixNameZh} 混合风格。\n风格细节：${mixHint}。\n电影级构图，杰作，4k，色彩鲜艳。`;

        if (charSelect) charSelect.value = '';
        if (bgSelect) bgSelect.value = '';

        popularSelect.value = '';
    },

    randomizeMixStyle() {
        const charSelect = document.getElementById('manual-mix-char-select');
        const bgSelect = document.getElementById('manual-mix-bg-select');
        if (!charSelect || !bgSelect) return;

        const getRandomOption = (select) => {
            const options = Array.from(select.options).filter(opt => opt.value);
            if (!options.length) return '';
            const idx = Math.floor(Math.random() * options.length);
            return options[idx].value;
        };

        charSelect.value = getRandomOption(charSelect);
        bgSelect.value = getRandomOption(bgSelect);

        this.updateMixStylePrompt();
    },

    updateMixStylePrompt() {
        const charSelect = document.getElementById('manual-mix-char-select');
        const bgSelect = document.getElementById('manual-mix-bg-select');
        const charPrompt = document.getElementById('manual-mix-char-prompt');
        const bgPrompt = document.getElementById('manual-mix-bg-prompt');
        if (!charSelect || !bgSelect) return;

        const charStyle = charSelect.value;
        const bgStyle = bgSelect.value;

        // Update character prompt textarea with style phrase
        if (charStyle && charPrompt) {
            const current = charPrompt.value.trim();
            // Remove any previous "Visual style: ..." line
            const cleaned = current.replace(/\n?Visual style:.*$/im, '').trim();
            charPrompt.value = cleaned + `\nVisual style: ${charStyle}.`;
        }

        // Update background prompt textarea with style phrase
        if (bgStyle && bgPrompt) {
            const current = bgPrompt.value.trim();
            const cleaned = current.replace(/\n?Visual style:.*$/im, '').trim();
            bgPrompt.value = cleaned + `\nVisual style: ${bgStyle}.`;
        }

        // Also compose the main prompt from both mix prompts
        this._composeMixPromptToMain();
    },

    _composeMixPromptToMain() {
        const charPrompt = document.getElementById('manual-mix-char-prompt');
        const bgPrompt = document.getElementById('manual-mix-bg-prompt');
        const textarea = document.getElementById('manual-prompt-textarea');
        if (!charPrompt || !bgPrompt || !textarea) return;

        const charText = charPrompt.value.trim();
        const bgText = bgPrompt.value.trim();
        if (!charText && !bgText) return;

        const charStyle = document.getElementById('manual-mix-char-select')?.value || '';
        const bgStyle = document.getElementById('manual-mix-bg-select')?.value || '';

        let combined = '';
        if (charText && bgText) {
            combined = `[Character] ${charText}\n\n[Background] ${bgText}`;
            if (charStyle || bgStyle) {
                combined += `\n\nMix Style: Character in ${charStyle || 'custom'}, Background in ${bgStyle || 'custom'}. Unified composition.`;
            }
        } else if (charText) {
            combined = charText;
        } else {
            combined = bgText;
        }

        textarea.value = combined;
    },

    filterMixStyleSelect(query, selectId) {
        const q = query.toLowerCase();
        const select = document.getElementById(selectId);
        if (!select) return;
        const optgroups = select.querySelectorAll('optgroup');
        optgroups.forEach(group => {
            let hasVisible = false;
            const options = group.querySelectorAll('option');
            options.forEach(opt => {
                if (!opt.value) return; // skip default
                const text = opt.textContent.toLowerCase();
                const match = text.includes(q);
                opt.style.display = match ? '' : 'none';
                if (match) hasVisible = true;
            });
            group.style.display = hasVisible ? '' : 'none';
        });
        const defaultOpt = select.querySelector('option[value=""]');
        if (defaultOpt) defaultOpt.style.display = q ? 'none' : '';
    },

    toggleMixStyleView() {
        const dropdownView = document.getElementById('manual-mix-dropdown-view');
        const gridView = document.getElementById('manual-mix-grid-view');
        const btn = document.getElementById('manual-mix-view-toggle');
        if (!dropdownView || !gridView) return;
        const showGrid = gridView.style.display === 'none';
        dropdownView.style.display = showGrid ? 'none' : '';
        gridView.style.display = showGrid ? '' : 'none';
        if (btn) btn.innerHTML = showGrid
            ? '<i class="fas fa-list" style="font-size:9px;"></i> Dropdown'
            : '<i class="fas fa-th-large" style="font-size:9px;"></i> Grid';
        if (showGrid) {
            this.renderMixStyleGrid('char');
            this.renderMixStyleGrid('bg');
        }
    },

    renderMixStyleGrid(role, query = '') {
        const gridId = role === 'char' ? 'manual-mix-char-grid' : 'manual-mix-bg-grid';
        const selectId = role === 'char' ? 'manual-mix-char-select' : 'manual-mix-bg-select';
        const grid = document.getElementById(gridId);
        if (!grid) return;
        const selected = document.getElementById(selectId)?.value || '';
        const groups = this._getManualStyleGroups(query);
        if (!groups.length) {
            grid.innerHTML = '<div style="grid-column:1/-1;padding:16px;text-align:center;color:#94a3b8;font-size:12px;background:#f8fafc;border:1px dashed #cbd5e1;border-radius:6px;">No styles found.</div>';
            return;
        }
        grid.innerHTML = groups.map(group => `
            <div style="grid-column:1/-1;display:flex;align-items:center;gap:8px;margin:6px 0 2px;">
                <div style="font-size:10px;font-weight:800;color:#334155;text-transform:uppercase;letter-spacing:.3px;white-space:nowrap;">${this.escape(group.label)}</div>
                <div style="height:1px;background:#e2e8f0;flex:1;"></div>
            </div>
            ${group.styles.map(style => this._mixStyleCardHtml(style, role, selected)).join('')}
        `).join('');
    },

    _mixStyleCardHtml(style, role, selectedStyle = '') {
        const name = style.name || '';
        const safeName = this.escape(name), safeHint = this.escape(style.hint || ''), safeZh = this.escape(style.name_zh || '');
        const active = name === selectedStyle;
        const imgUrl = this.escape(this._getManualPrimaryStyleImageUrl(name) || '');
        return `
            <div class="mix-style-card" data-style="${safeName}" data-role="${role}" role="button" tabindex="0"
                    onclick="App.selectMixStyle('${role}', this.dataset.style)"
                    style="position:relative;text-align:left;border:${active ? '2px solid #8b5cf6' : '1px solid #dbe4ef'};border-radius:6px;background:#fff;padding:0;overflow:hidden;cursor:pointer;box-shadow:${active ? '0 0 0 2px rgba(139,92,246,0.12)' : 'none'};min-height:120px;">
                <div style="height:65px;background:#e2e8f0;display:flex;align-items:center;justify-content:center;overflow:hidden;">
                    ${imgUrl
                ? `<img src="${imgUrl}" alt="${safeName}" loading="lazy" style="width:100%;height:100%;object-fit:cover;" onerror="if(this.src.includes('.webp')){this.src=this.src.replace('.webp','.png');}else{this.style.display='none';this.nextElementSibling.style.display='flex';}"><span style="display:none;width:100%;height:100%;align-items:center;justify-content:center;color:#94a3b8;"><i class="fas fa-palette"></i></span>`
                : `<span style="display:flex;width:100%;height:100%;align-items:center;justify-content:center;color:#94a3b8;"><i class="fas fa-palette"></i></span>`}
                </div>
                <div style="padding:5px 6px;">
                    <div style="font-size:10px;font-weight:700;color:#1e293b;line-height:1.2;">${safeName}${safeZh ? `<span style="display:block;font-weight:600;color:#d97706;font-size:9px;margin-top:1px;">${safeZh}</span>` : ''}</div>
                </div>
                ${active ? '<span style="position:absolute;right:4px;top:4px;color:#8b5cf6;font-size:12px;background:rgba(255,255,255,0.8);border-radius:50%;width:18px;height:18px;display:flex;align-items:center;justify-content:center;"><i class="fas fa-check-circle"></i></span>' : ''}
            </div>`;
    },

    selectMixStyle(role, styleName) {
        const selectId = role === 'char' ? 'manual-mix-char-select' : 'manual-mix-bg-select';
        const select = document.getElementById(selectId);
        if (select) select.value = styleName || '';
        this.updateMixStylePrompt();
        // Re-render both grids to update check marks
        const charQuery = document.getElementById('manual-mix-char-grid-search')?.value || '';
        const bgQuery = document.getElementById('manual-mix-bg-grid-search')?.value || '';
        this.renderMixStyleGrid('char', charQuery);
        this.renderMixStyleGrid('bg', bgQuery);
    },

    _updateStylePreview(styleName, select) {
        const img = document.getElementById('manual-style-preview-img');
        const icon = document.getElementById('manual-style-preview-icon');
        const label = document.getElementById('manual-style-preview-label');
        const wrap = document.getElementById('manual-style-preview-img-wrap');
        if (!img || !label) return;

        if (!styleName) {
            img.style.display = 'none';
            if (icon) icon.style.display = '';
            label.textContent = 'No style selected';
            if (wrap) wrap.style.background = '#e2e8f0';
            return;
        }

        const opt = select ? Array.from(select.options).find(o => o.value === styleName) : null;
        const zhName = opt ? (opt.dataset.zh || '') : '';
        label.textContent = zhName ? `${styleName}\n${zhName}` : styleName;

        const urls = this._getManualStylePreviewUrls(styleName);
        if (urls.length) {
            img.style.display = 'block';
            if (icon) icon.style.display = 'none';
            if (wrap) wrap.style.background = '#000';
            img.dataset.previewIndex = '0';
            img.dataset.previewUrls = JSON.stringify(urls);
            img.onerror = () => {
                const list = JSON.parse(img.dataset.previewUrls || '[]');
                const nextIndex = parseInt(img.dataset.previewIndex || '0', 10) + 1;
                if (nextIndex < list.length) { img.dataset.previewIndex = String(nextIndex); img.src = list[nextIndex]; return; }
                img.style.display = 'none';
                if (icon) icon.style.display = '';
                if (wrap) wrap.style.background = '#e2e8f0';
            };
            img.src = urls[0];
        } else {
            img.style.display = 'none';
            if (icon) icon.style.display = '';
            if (wrap) wrap.style.background = '#e2e8f0';
        }
    },

    _styleSlugVariants(styleName) {
        const base = String(styleName || '').toLowerCase().trim();
        const hyphen = base.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        const underscore = base.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
        return Array.from(new Set([hyphen, underscore].filter(Boolean)));
    },

    _getManualPrimaryStyleImageUrl(styleName) {
        if (!styleName) return '';
        const [hyphen] = this._styleSlugVariants(styleName);
        return this._getAssetUrl ? this._getAssetUrl(`/style-images/${hyphen}.webp`) : `/style-images/${hyphen}.webp`;
    },

    _normalizeManualSampleUrl(url, size = 'w1200') {
        if (!url) return '';
        return url.includes('drive.google.com/thumbnail')
            ? url.replace(/([?&]sz=)[^&]+/, `$1${size}`)
            : url;
    },

    _getManualStyleSampleUrls(styleName) {
        const urls = [];
        const add = url => { const n = this._normalizeManualSampleUrl(url); if (n && !urls.includes(n)) urls.push(n); };
        add(this._getManualPrimaryStyleImageUrl(styleName));
        for (const url of this._getManualStylePreviewUrls(styleName)) add(url);
        return urls;
    },

    _getManualStylePreviewUrls(styleName) {
        if (!styleName) return [];
        if (!this._artStyleImageCache && this._buildArtStyleImageCache) this._buildArtStyleImageCache();
        const urls = [];
        const add = url => { if (url && !urls.includes(url)) urls.push(url); };
        for (const slug of this._styleSlugVariants(styleName)) {
            add(this._getAssetUrl ? this._getAssetUrl(`/style-images/${slug}.png`) : `/style-images/${slug}.png`);
            add(this._getAssetUrl ? this._getAssetUrl(`/style-images/${slug}.webp`) : `/style-images/${slug}.webp`);
            add(this._getAssetUrl ? this._getAssetUrl(`/style-images/style-images/${slug}.png`) : `/style-images/style-images/${slug}.png`);
            add(this._artStyleImageCache?.get(slug));
        }
        if (this._getGridImageUrl) add(this._getGridImageUrl(styleName));
        add(`/api/style-image/${encodeURIComponent(styleName)}`);
        return urls;
    },

    // ── Lightbox & samples ───────────────────────────────────────────────────
    openManualImageLightbox(src, title = 'Preview') {
        if (!src) return;
        const existing = document.getElementById('manual-image-lightbox');
        if (existing) {
            const img = existing.querySelector('img');
            const lbl = existing.querySelector('[data-lightbox-title]');
            if (img && img.src === src) return;
            if (img) img.src = src;
            if (lbl) lbl.textContent = title || 'Preview';
            return;
        }
        document.body.insertAdjacentHTML('beforeend', `
            <div id="manual-image-lightbox" onclick="if(event.target===this)this.remove()"
                 style="position:fixed;inset:0;background:rgba(0,0,0,.88);z-index:10080;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;">
                <div style="position:absolute;top:14px;left:18px;right:60px;color:#fff;font-size:14px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" data-lightbox-title>${this.escape(title || 'Preview')}</div>
                <button type="button" onclick="document.getElementById('manual-image-lightbox')?.remove()"
                        style="position:absolute;top:10px;right:14px;border:1px solid rgba(255,255,255,.35);background:rgba(255,255,255,.12);color:#fff;border-radius:6px;width:36px;height:34px;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;">
                    <i class="fas fa-times"></i>
                </button>
                <img src="${this.escape(src)}" alt="${this.escape(title || 'Preview')}"
                     style="max-width:96vw;max-height:88vh;object-fit:contain;border-radius:8px;box-shadow:0 24px 80px rgba(0,0,0,.5);background:#111;" />
            </div>
        `);
    },

    openManualStyleSamples(styleName) {
        if (!styleName) return;
        document.getElementById('manual-style-samples-modal')?.remove();
        const urls = this._getManualStyleSampleUrls(styleName);
        const safeStyle = this.escape(styleName);
        const samples = urls.map((url, idx) => `
            <a href="${this.escape(url)}" target="_blank" style="display:block;border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;background:#f8fafc;text-decoration:none;color:#334155;">
                <div style="height:190px;background:#e2e8f0;display:flex;align-items:center;justify-content:center;">
                    <img src="${this.escape(url)}" alt="${safeStyle} sample ${idx + 1}" loading="lazy"
                         style="max-width:100%;max-height:100%;width:100%;height:100%;object-fit:contain;"
                         onerror="this.style.display='none';this.parentElement.innerHTML='<span style=&quot;color:#94a3b8;font-size:12px;&quot;>Sample unavailable</span>';">
                </div>
                <div style="padding:7px 9px;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:space-between;">
                    <span>Sample ${idx + 1}</span><i class="fas fa-external-link-alt" style="font-size:9px;color:#94a3b8;"></i>
                </div>
            </a>`).join('');

        document.body.insertAdjacentHTML('beforeend', `
            <div id="manual-style-samples-modal" onclick="if(event.target===this)this.remove()"
                 style="position:fixed;inset:0;background:rgba(15,23,42,.62);z-index:10050;display:flex;align-items:center;justify-content:center;padding:24px;">
                <div style="width:min(880px,94vw);max-height:88vh;background:#fff;border-radius:8px;box-shadow:0 24px 60px rgba(0,0,0,.28);display:flex;flex-direction:column;overflow:hidden;">
                    <div style="padding:14px 18px;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;gap:12px;">
                        <div style="font-size:15px;font-weight:800;color:#1e293b;">${safeStyle} Samples</div>
                        <button type="button" onclick="document.getElementById('manual-style-samples-modal')?.remove()" style="border:0;background:transparent;color:#64748b;font-size:18px;cursor:pointer;"><i class="fas fa-times"></i></button>
                    </div>
                    <div style="padding:16px;overflow:auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;">
                        ${samples || '<div style="grid-column:1/-1;padding:30px;text-align:center;color:#94a3b8;">No samples available.</div>'}
                    </div>
                </div>
            </div>
        `);
    },

    // ── Style voice caption ──────────────────────────────────────────────────
    _playStyleVoice(styleName) {
        if (!styleName) return;
        const slug = styleName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 40);
        const audioUrl = this._getAssetUrl(`/audio/styles/${slug}.mp3`);
        const captionUrl = this._getAssetUrl(`/audio/styles/${slug}.txt`);

        try {
            if (this._styleVoiceAudio) { this._styleVoiceAudio.pause(); this._styleVoiceAudio = null; }
            this._styleVoiceAudio = new Audio(audioUrl);
            this._styleVoiceAudio.play().catch(e => console.warn('[Voice] Could not play style audio:', e));
        } catch (e) { console.warn('[Voice] Audio playback error:', e); }

        fetch(captionUrl).then(r => r.ok ? r.text() : null).then(text => {
            if (!text || text.trim().startsWith('<')) return;
            const safeText = text.trim().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\"/g, '&quot;');
            document.getElementById('style-voice-caption')?.remove();
            if (!document.getElementById('style-caption-style')) {
                const styleEl = document.createElement('style');
                styleEl.id = 'style-caption-style';
                styleEl.textContent = `@keyframes captionSlideIn { 0%{opacity:0;transform:translateY(20px)} 10%{opacity:1;transform:translateY(0)} 85%{opacity:1;transform:translateY(0)} 100%{opacity:0;transform:translateY(-10px)} }`;
                document.head.appendChild(styleEl);
            }
            const overlay = document.createElement('div');
            overlay.id = 'style-voice-caption';
            overlay.style.cssText = 'position:fixed;bottom:32px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.82);color:#fff;padding:14px 28px;border-radius:12px;z-index:10002;max-width:90vw;text-align:center;font-family:"Inter","Segoe UI",sans-serif;box-shadow:0 8px 32px rgba(0,0,0,0.4);backdrop-filter:blur(8px);animation:captionSlideIn 8.5s ease forwards;pointer-events:none;';
            overlay.innerHTML = `<div style="font-size:15px;font-weight:600;line-height:1.5;color:#fbbf24;">🎨 ${safeText}</div>`;
            document.body.appendChild(overlay);
            setTimeout(() => overlay.remove(), 9000);
        }).catch(() => { });
    },



    updateCombinedPrompt() {
        const charPrompt = document.getElementById('manual-char-prompt-textarea')?.value || '';
        const bgPrompt = document.getElementById('manual-bg-prompt-textarea')?.value || '';
        const combined = `${charPrompt}${charPrompt && bgPrompt ? ', ' : ''}${bgPrompt}`;
        const mainTextarea = document.getElementById('manual-prompt-textarea');
        if (mainTextarea) {
            mainTextarea.value = combined;
        }
    },

    addTypeTagToPrompt() {
        const typeInput = document.getElementById('manual-extra-type-input');
        const textarea = document.getElementById('manual-char-prompt-textarea');
        const select = document.getElementById('manual-extra-type-select');
        if (!typeInput || !textarea || !typeInput.value.trim()) return;

        // The input now holds the character name (set by onchange)
        // The tag value comes from the selected option's value attribute
        const opt = select?.options[select.selectedIndex];
        const tagVal = (opt?.value || typeInput.value).trim();
        let newCharName = typeInput.value.trim();

        let current = textarea.value.trim();

        // Skip if this exact character name is already in the prompt
        if (current.toLowerCase().includes(newCharName.toLowerCase())) return;

        // Check if prompt already has "together with ..." — append to existing list
        const togetherMatch = current.match(/(together with\s+)([^.]*?)(\.)/i);
        if (togetherMatch) {
            // Already has "together with A, B" — append ", and NewChar"
            const existingChars = togetherMatch[2].trim();
            // Check if this char name is already listed
            if (existingChars.toLowerCase().includes(newCharName.toLowerCase())) return;
            // Build updated list: "A, B" -> "A, B, and C"
            // If it already has "and", replace last "and" pattern to extend the list
            let updatedChars;
            if (/,?\s+and\s+/i.test(existingChars)) {
                // "A, B, and C" -> "A, B, C, and D"
                updatedChars = existingChars.replace(/,?\s+and\s+/i, ', ') + `, and ${newCharName}`;
            } else {
                // "A" -> "A and B"  OR "A, B" -> "A, B, and C"
                if (existingChars.includes(',')) {
                    updatedChars = `${existingChars}, and ${newCharName}`;
                } else {
                    updatedChars = `${existingChars} and ${newCharName}`;
                }
            }
            current = current.replace(togetherMatch[0], `together with ${updatedChars}.`);
            // Update interaction description for multiple characters
            current = current.replace(
                /Both characters are interacting/i,
                'All characters are interacting'
            );
            textarea.value = current;
        } else {
            // First time adding a character — inject "together with" into the prompt
            const selectStyle = document.getElementById('manual-style-select');
            const mainChar = selectStyle?.dataset?.title || '';
            let cleanMainChar = mainChar.replace(/&quot;/g, '\"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
            const mMatch = cleanMainChar.match(/^第\d+天,\s*(.*?)[,\s]*\d{4}-\d{2}-\d{2}/);
            if (mMatch) cleanMainChar = mMatch[1].trim();
            else {
                const mParts = cleanMainChar.split(',');
                if (mParts.length >= 3 && /^第\d+天/.test(mParts[0].trim())) cleanMainChar = mParts[1].trim();
            }

            // Try to insert "together with X" after the main subject phrase
            const ofMatch = current.match(/(illustration of\s+[^.]+?)(\.|\s+Cinematic)/i);
            if (ofMatch) {
                const insertPoint = ofMatch.index + ofMatch[1].length;
                const before = current.substring(0, insertPoint);
                const after = current.substring(insertPoint);
                textarea.value = `${before} together with ${newCharName}${after}`.replace(/\s*$/, '') +
                    ` Both characters are interacting in the same scene, sharing a warm and harmonious moment.`;
            } else if (newCharName) {
                // Fallback: append character reference at the end
                textarea.value = `${current} Together with ${newCharName}, all characters share the same scene.`;
            } else {
                textarea.value = `${current}`;
            }
        }
        this.updateCombinedPrompt();

        // Clear input & reset filter for next selection
        typeInput.value = '';
        if (select) select.selectedIndex = -1;
        this.filterExtraTypeTags('');
    },

    updateExtraTypePreview() {
        const select = document.getElementById('manual-extra-type-select');
        const img = document.getElementById('manual-extra-type-preview-img');
        const icon = document.getElementById('manual-extra-type-preview-icon');
        if (!select || !img || !icon) return;

        const opt = select.options[select.selectedIndex];
        let imgUrls = [];
        try { imgUrls = JSON.parse((opt?.dataset?.imgs || '[]').replace(/&quot;/g, '\"')); } catch (e) { }

        if (imgUrls.length > 0) {
            img.dataset.sources = JSON.stringify(imgUrls);
            img.dataset.srcIdx = '0';
            img.src = imgUrls[0];
            img.style.display = 'block';
            icon.style.display = 'none';
            img.onerror = function () {
                const srcs = JSON.parse(this.dataset.sources || '[]');
                const next = (parseInt(this.dataset.srcIdx) || 0) + 1;
                if (next < srcs.length) {
                    this.dataset.srcIdx = next;
                    this.src = srcs[next];
                } else {
                    this.style.display = 'none';
                    icon.style.display = 'block';
                }
            };
        } else {
            img.src = '';
            img.style.display = 'none';
            icon.style.display = 'block';
            img.onerror = null;
        }
    },

    _getAllEventTypeTags() {
        const typesMap = new Map();
        const processItems = (items) => {
            (items || []).forEach(item => {
                let tags = item.tags;
                if (!tags && item.description && this.parseTagsFromDescription) {
                    tags = this.parseTagsFromDescription(item.description);
                }
                if (tags && tags.type) {
                    let dateStr = '';
                    if (item.start) {
                        dateStr = (item.start.date || item.start.dateTime || '').split('T')[0];
                    } else if (item.date) {
                        dateStr = item.date.split('T')[0];
                    }
                    let locStr = tags.area ? tags.area.trim().toLowerCase() : '';

                    if (dateStr === '2026-05-10' && locStr.includes('europ')) {
                        locStr = 'africa';
                    } else {
                        locStr = locStr.replace(/\s+/g, '-');
                    }

                    let typeStr = tags.type.trim().toLowerCase();

                    if (typeStr.includes(' - ')) {
                        typeStr = typeStr.replace(' - ', '-.');
                        if (!typeStr.endsWith('.')) typeStr += '.';
                    } else {
                        typeStr = typeStr.replace(/\s+/g, '-');
                    }

                    let parts = [];
                    if (dateStr) {
                        const compactDate = dateStr.replace(/-/g, '');
                        parts.push(compactDate);
                        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                        const dateObj = new Date(dateStr + 'T00:00:00');
                        if (!isNaN(dateObj)) {
                            parts.push(days[dateObj.getDay()]);
                        }
                    }
                    if (locStr) parts.push(locStr);
                    if (typeStr) parts.push(typeStr);

                    if (parts.length > 0) {
                        const val = parts.join('-');
                        if (!typesMap.has(val)) {
                            let imgUrls = [];
                            if (item.attachments) {
                                const coverAtt = item.attachments.find(a => a.title === 'cover.png')
                                    || item.attachments.find(a => a.mimeType?.startsWith('image/') || a.title?.match(/\.(png|jpg|jpeg|webp)$/i));
                                if (coverAtt) {
                                    const fid = coverAtt.fileId || '';
                                    // Build fallback chain (same as event-preview.js)
                                    if (coverAtt.localUrl) imgUrls.push(this._getAssetUrl ? this._getAssetUrl(coverAtt.localUrl) : coverAtt.localUrl);
                                    if (fid && this._getAssetUrl) imgUrls.push(this._getAssetUrl(`/images/calendar/${fid}.jpg`));
                                    if (fid) imgUrls.push(`https://drive.google.com/thumbnail?id=${fid}&sz=w400`);
                                    if (fid) imgUrls.push(`https://lh3.googleusercontent.com/d/${fid}=w400`);
                                }
                            }
                            // Get character name from event summary/title
                            const charName = item.summary || item.title || '';
                            let cleanCharName = charName;
                            const cnMatch = cleanCharName.match(/^第\d+天,\s*(.*?)[,\s]*\d{4}-\d{2}-\d{2}/);
                            if (cnMatch) cleanCharName = cnMatch[1].trim();
                            else {
                                const cnParts = cleanCharName.split(',');
                                if (cnParts.length >= 3 && /^第\d+天/.test(cnParts[0].trim())) cleanCharName = cnParts[1].trim();
                            }
                            typesMap.set(val, { imgUrls, charName: cleanCharName });
                        }
                    }
                }
            });
        };
        processItems(window.cloudmailLatestEvents?.items);
        processItems(window.cloudmailCustomEvents);

        return Array.from(typesMap.entries())
            .map(([value, data]) => ({ value, imgUrls: data.imgUrls || [], charName: data.charName || '' }))
            .sort((a, b) => b.value.localeCompare(a.value));
    },

    filterExtraTypeTags(query) {
        const q = (query || '').toLowerCase();
        const select = document.getElementById('manual-extra-type-select');
        if (!select) return;
        const options = select.querySelectorAll('option');
        options.forEach(opt => {
            if (opt.value === "") return;
            const text = opt.textContent.toLowerCase();
            opt.style.display = text.includes(q) ? '' : 'none';
        });
    }

};



