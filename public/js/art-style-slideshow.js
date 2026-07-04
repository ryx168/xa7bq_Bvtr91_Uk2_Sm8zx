/**
 * art-style-slideshow.js — Visual Styles Slideshow
 *
 * Voice change: browser SpeechSynthesis replaced with server-side
 * Deepgram Aura-1 TTS (via /api/ai/generate-text).
 * This gives a consistent voice on ALL devices (mobile, desktop, iOS, Android).
 *
 * Karaoke timing: since server audio has no onboundary events, we use a
 * requestAnimationFrame loop that tracks <audio>.currentTime against a
 * pre-built word-timing table (estimated from character offsets + duration).
 */

export const ArtStyleSlideshowMixin = {

    _SS_GROUP_COLORS: {
        'Classical & Traditional': '#92400e',
        'Illustrated & Animation-Inspired': '#1e40af',
        'Abstract & Modernist': '#4c1d95',
        'Atmospheric & Thematic': '#065f46',
        'Pop Culture & Media': '#0369a1',
    },

    _SS_INTERVAL: 5000,
    _SS_AURA_SPEAKER: 'asteria',       // default; user can change via dropdown
    _SS_SPEAKERS: [],          // populated on first modal open

    // =========================================================================
    // Public entry points
    // =========================================================================
    openArtStyleSlideshow(eventId) {
        this._ssIsFolderSlideshow = false;
        this._ssViewMode = 'slideshow';
        const id = eventId || this.state?.calendar?.previewEmailId;
        if (!id) { alert('No event is currently open in the preview panel.'); return; }
        const slides = this._ssCollectSlides(id);
        if (!slides.length) { alert('No Visual Style images found for this event.'); return; }
        this._ssEnsureModal();
        
        const viewControls = document.getElementById('ss-view-controls');
        if (viewControls) viewControls.style.display = 'none';
        
        this._ssSetViewMode('slideshow');
        this._ssLoadSlides(slides, 0);
    },

    async openFolderSlideshow() {
        try {
            this.openFolderSlideshowAt('');
        } catch (e) {
            console.error('Folder Slideshow Error:', e);
            alert('Failed to open folder slideshow: ' + e.message);
        }
    },

    // =========================================================================
    // Collect slides (unchanged from original)
    // =========================================================================
    _ssCollectSlides(eventId) {
        const previewCards = document.querySelectorAll(
            '#calendar-preview-content .style-card'
        );
        if (previewCards.length) {
            const slides = [];
            previewCards.forEach(card => {
                const img = card.querySelector('img');
                if (!img) return;
                const styleName = card.dataset.style || img.alt || '';
                const filterVal = card.getAttribute('onclick')?.match(/p:style:[^']+/)?.[0] || '';
                const tag = card.querySelector('[style*="text-transform:uppercase"]')
                    ?.textContent?.replace(/^#/, '').trim() || '';
                const group = card.querySelector('[style*="letter-spacing:.5px"]')
                    ?.textContent?.trim() || '';
                let dataSources = [];
                try { dataSources = JSON.parse(img.dataset.sources || '[]'); } catch (e) { dataSources = []; }
                const sources = [img.currentSrc || img.src, ...dataSources, img.dataset.driveUrl, img.dataset.apiUrl]
                    .filter(s => s && !s.endsWith('#') && s !== window.location.href);
                if (!styleName || !sources[0]) return;
                slides.push({ eventId, style: styleName, group, tag, filterVal, sources: [...new Set(sources)] });
            });
            if (slides.length) return slides;
        }
        return this._ssCollectSlidesFromData(eventId);
    },

    _ssCollectSlidesFromData(eventId) {
        const latestItem = window.cloudmailLatestEvents?.items?.find(i => i.id === eventId);
        const storeItems = JSON.parse(localStorage.getItem('cloudmail_events') || '[]');
        const storeItem = storeItems.find(e => e.id === eventId);
        const eventObj = latestItem || {
            id: eventId, summary: storeItem?.title || '',
            attachments: storeItem?.attachments || [],
            start: { date: storeItem?.date || '' },
        };
        const tags = this._parseArtPhilTagsAll ? this._parseArtPhilTagsAll(eventObj) : [];
        if (!tags.length) return [];

        const normalizeLocalUrl = (url) => {
            if (!url) return '';
            if (/^https:\/\/drive\.google\.com\/uc\?/i.test(url)) return '';
            const isLocalHost = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
            if (!isLocalHost && url.startsWith('/images/calendar/')) return '';
            return this._getAssetUrl ? this._getAssetUrl(url) : url;
        };
        const gridMap = new Map();
        (eventObj.attachments || []).forEach(att => {
            if (!att.title?.match(/\.(png|jpe?g|webp|gif)$/i)) return;
            let slug = att.title.slice(0, att.title.lastIndexOf('.')).toLowerCase();
            slug = slug.replace(/_\d{4}_\d{2}_\d{2}_\d{2}_\d{2}_\d{2}$/, '');
            if (slug.startsWith('grid_')) slug = slug.slice(5);
            const slugH = slug.replace(/_/g, '-');
            const fileUrl = att.fileUrl || att.iconLink || '';
            const idMatch = fileUrl.match(/\/d\/([A-Za-z0-9_-]+)/) || fileUrl.match(/id=([A-Za-z0-9_-]+)/) || fileUrl.match(/\/file\/d\/([A-Za-z0-9_-]+)/);
            const fileId = att.fileId || (idMatch ? idMatch[1] : '');
            let localFileUrl = att.fileUrl || '';
            if (localFileUrl.includes('drive.google.com')) localFileUrl = '';
            const entry = [
                normalizeLocalUrl(att.localUrl || localFileUrl || ''),
                fileId ? `https://drive.google.com/thumbnail?id=${fileId}&sz=w800` : '',
                fileId ? `https://lh3.googleusercontent.com/d/${fileId}=w400` : '',
            ].filter(Boolean);
            if (entry.length) { gridMap.set(slug, entry); gridMap.set(slugH, entry); }
        });

        const slides = [];
        const seen = new Set();
        tags.forEach(({ tag, group, style }) => {
            if (seen.has(style)) return;
            seen.add(style);
            const hyphen = style.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
            const under = style.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
            const tagSlug = (tag || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
            const properSlug = style.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
            const path = `/style-images/${hyphen}.png`;
            const sources = [];
            for (const key of [under, hyphen, tagSlug, tagSlug.replace(/_/g, '-'), under.substring(0, 40), hyphen.substring(0, 40), properSlug, properSlug.substring(0, 40)]) {
                const e = key && gridMap.get(key);
                if (e) { sources.push(...e); break; }
            }
            sources.push(this._getAssetUrl ? this._getAssetUrl(path) : path, `/api/style-image/${encodeURIComponent(style)}`);
            slides.push({
                eventId, style, group, tag,
                filterVal: `p:style:${group}:${style}`,
                sources: [...new Set(sources)],
            });
        });
        return slides;
    },

    // =========================================================================
    // Modal DOM
    // =========================================================================
    _ssEnsureModal() {
        if (document.getElementById('ss-art-modal')) return;

        const modal = document.createElement('div');
        modal.id = 'ss-art-modal';
        modal.style.cssText = [
            'position:fixed;inset:0;',
            'background:rgba(0,0,0,0.94);',
            'z-index:999999;display:none;',
            'flex-direction:column;',
            'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;',
        ].join('');

        modal.innerHTML = /* html */`
        <style>
            #ss-art-modal:fullscreen #ss-mainimg,
            #ss-art-modal:-webkit-full-screen #ss-mainimg,
            #ss-art-modal:fullscreen #ss-refimg,
            #ss-art-modal:-webkit-full-screen #ss-refimg {
                inset:12px 72px!important;
                max-width:calc(100% - 144px)!important;
                max-height:calc(100% - 24px)!important;
                width:calc(100% - 144px)!important;
                height:calc(100% - 24px)!important;
                border-radius:6px!important;
            }
            #ss-art-modal:fullscreen #ss-nav-left,
            #ss-art-modal:-webkit-full-screen #ss-nav-left { left:12px!important; }
            #ss-art-modal:fullscreen #ss-nav-right,
            #ss-art-modal:-webkit-full-screen #ss-nav-right { right:12px!important; }
            @keyframes kenburns {
                0%   { transform:scale(1) translate(0,0); }
                100% { transform:scale(1.15) translate(-1%,-1%); }
            }
            .ss-ken-burns { animation:kenburns 20s ease-out infinite alternate!important; }
            /* Mobile-friendly top bar */
            @media (max-width: 600px) {
                #ss-topbar { flex-wrap:wrap; gap:6px; padding:8px 12px!important; }
                #ss-voice-row { width:100%; justify-content:space-between; }
                #ss-btn-row   { width:100%; justify-content:flex-end; }
            }

            /* Explorer Grid/List Styles */
            .ss-explorer-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(var(--ss-grid-size, 90px), 1fr));
                gap: 10px;
                padding: 8px 0;
            }
            .ss-explorer-item {
                background: rgba(255, 255, 255, 0.03);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 6px;
                padding: 6px;
                display: flex;
                flex-direction: column;
                align-items: center;
                text-align: center;
                cursor: pointer;
                user-select: none;
                transition: background 0.2s, border-color 0.2s;
                position: relative;
            }
            .ss-explorer-item:hover {
                background: rgba(255, 255, 255, 0.08);
                border-color: rgba(255, 255, 255, 0.25);
            }
            .ss-explorer-item.selected {
                background: rgba(0, 120, 212, 0.2);
                border-color: #0078d4;
                box-shadow: 0 0 10px rgba(0, 120, 212, 0.3);
            }
            .ss-explorer-item-thumb {
                width: 100%;
                height: calc(var(--ss-grid-size, 90px) * 0.77);
                object-fit: cover;
                border-radius: 4px;
                margin-bottom: 6px;
                background: #1a1a2e;
            }
            .ss-explorer-item-icon {
                font-size: calc(var(--ss-grid-size, 90px) * 0.35);
                margin-bottom: 6px;
                display: flex;
                align-items: center;
                justify-content: center;
                height: calc(var(--ss-grid-size, 90px) * 0.77);
            }
            .ss-explorer-item-name {
                font-size: clamp(10px, calc(var(--ss-grid-size, 90px) * 0.12), 13px);
                color: rgba(255, 255, 255, 0.9);
                word-break: break-all;
                overflow: hidden;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                line-height: 1.2;
                height: 2.4em;
            }
            
            .ss-explorer-list {
                display: flex;
                flex-direction: column;
                gap: 6px;
                padding: 10px 0;
            }
            .ss-explorer-list-item {
                background: rgba(255, 255, 255, 0.03);
                border: 1px solid rgba(255, 255, 255, 0.08);
                border-radius: 6px;
                padding: 8px 16px;
                display: flex;
                align-items: center;
                gap: 12px;
                cursor: pointer;
                user-select: none;
                transition: background 0.2s, border-color 0.2s;
            }
            .ss-explorer-list-item:hover {
                background: rgba(255, 255, 255, 0.08);
                border-color: rgba(255, 255, 255, 0.2);
            }
            .ss-explorer-list-item.selected {
                background: rgba(0, 120, 212, 0.2);
                border-color: #0078d4;
            }
            .ss-explorer-list-thumb {
                width: 70px;
                height: 50px;
                object-fit: cover;
                border-radius: 3px;
                background: #1a1a2e;
            }
            .ss-explorer-list-icon {
                font-size: 26px;
                width: 70px;
                height: 50px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .ss-explorer-list-name {
                font-size: 13px;
                color: rgba(255, 255, 255, 0.9);
                flex: 1;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            
            /* Folder Tree Styles */
            .ss-tree-node {
                display: flex;
                align-items: center;
                gap: 6px;
                padding: 4px 6px;
                cursor: pointer;
                border-radius: 4px;
                font-size: 13px;
                color: rgba(255, 255, 255, 0.85);
                user-select: none;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                margin-bottom: 2px;
            }
            .ss-tree-node:hover {
                background: rgba(255, 255, 255, 0.08);
            }
            .ss-tree-node.selected {
                background: rgba(0, 120, 212, 0.3);
                color: #fff;
            }
            .ss-tree-icon {
                color: #eab308;
                font-size: 12px;
                width: 14px;
                text-align: center;
            }
            .ss-tree-toggle {
                width: 14px;
                text-align: center;
                color: rgba(255, 255, 255, 0.4);
                cursor: pointer;
                transition: transform 0.2s;
                display: inline-block;
            }
            .ss-tree-toggle.expanded {
                transform: rotate(90deg);
            }
            .ss-tree-children {
                padding-left: 14px;
                display: none;
            }
            .ss-tree-children.expanded {
                display: block;
            }
        </style>

        <!-- ── Hidden <audio> element for server TTS ── -->
        <audio id="ss-audio" preload="auto" style="display:none;"></audio>

        <!-- ── Top bar ─────────────────────────────────────────────────── -->
        <div id="ss-topbar"
             style="display:flex;align-items:center;justify-content:space-between;
                    padding:10px 20px;background:rgba(0,0,0,0.6);flex-shrink:0;gap:12px;
                    flex-wrap:wrap;">

            <!-- Slideshow Title (conditionally hidden) -->
            <div id="ss-slideshow-title" style="display:flex;flex-direction:column;gap:2px;min-width:0;flex:1;">
                <div id="ss-style-name"
                     style="color:#fff;font-size:16px;font-weight:600;
                            white-space:normal;word-break:break-word;
                            letter-spacing:0.2px;"></div>
                <div id="ss-event-name"
                     style="color:rgba(255,255,255,0.45);font-size:11px;
                            white-space:normal;word-break:break-word;"></div>
            </div>

            <!-- View toggles (shown only if folder slideshow) -->
            <div id="ss-view-controls" style="display:none;align-items:center;gap:4px;flex-shrink:0;margin-right:8px;">
                <button id="ss-view-slideshow-btn" onclick="App._ssSetViewMode('slideshow')"
                        style="background:rgba(0,120,212,0.55);border:0.5px solid #0078d4;
                               border-radius:6px;color:#fff;padding:5px 12px;cursor:pointer;font-size:11px;
                               display:inline-flex;align-items:center;gap:6px;white-space:nowrap;outline:none;">
                    <i class="fas fa-play" style="font-size:10px;"></i> Slideshow
                </button>
                <button id="ss-view-grid-btn" onclick="App._ssSetViewMode('grid')"
                        style="background:rgba(255,255,255,0.1);border:0.5px solid rgba(255,255,255,0.25);
                               border-radius:6px;color:#fff;padding:5px 12px;cursor:pointer;font-size:11px;
                               display:inline-flex;align-items:center;gap:6px;white-space:nowrap;outline:none;">
                    <i class="fas fa-th" style="font-size:10px;"></i> Grid
                </button>
                <button id="ss-view-list-btn" onclick="App._ssSetViewMode('list')"
                        style="background:rgba(255,255,255,0.1);border:0.5px solid rgba(255,255,255,0.25);
                               border-radius:6px;color:#fff;padding:5px 12px;cursor:pointer;font-size:11px;
                               display:inline-flex;align-items:center;gap:6px;white-space:nowrap;outline:none;">
                    <i class="fas fa-list" style="font-size:10px;"></i> List
                </button>
            </div>

            <!-- Explorer toolbar (shown in grid/list views) -->
            <div id="ss-explorer-toolbar" style="display:none;align-items:center;gap:8px;flex:1;min-width:0;">
                <button id="ss-btn-toggle-tree" onclick="App._ssToggleFolderTree()"
                        style="background:rgba(255,255,255,0.1);border:0.5px solid rgba(255,255,255,0.25);
                               border-radius:6px;color:#fff;padding:5px 10px;cursor:pointer;font-size:11px;
                               display:inline-flex;align-items:center;outline:none;"
                        title="Toggle Folder Sidebar">
                    <i class="fas fa-bars" style="font-size:10px;"></i>
                </button>
                <button id="ss-btn-up" onclick="App._ssNavigateUp()"
                        style="background:rgba(255,255,255,0.1);border:0.5px solid rgba(255,255,255,0.25);
                               border-radius:6px;color:#fff;padding:5px 12px;cursor:pointer;font-size:11px;
                               display:none;align-items:center;gap:6px;outline:none;">
                    <i class="fas fa-arrow-up" style="font-size:10px;"></i> Up
                </button>
                <div id="ss-breadcrumbs"
                     style="color:rgba(255,255,255,0.7);font-size:12px;font-weight:500;
                            white-space:normal;word-break:break-word;flex:1;">
                    📁 Home
                </div>
                
                <div style="position:relative; margin-left:auto; display:flex; align-items:center; gap: 12px;">
                    <div style="display:flex; align-items:center; gap: 6px; background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.2); border-radius:4px; padding: 0 8px; height: 24px;">
                        <i class="fas fa-image" style="font-size:9px; color:rgba(255,255,255,0.4);"></i>
                        <input type="range" min="60" max="250" value="90" oninput="App._ssUpdateZoom(this.value)" style="width: 70px; height: 2px; accent-color: #0ea5e9; cursor: pointer;" title="Adjust grid size" />
                        <i class="fas fa-image" style="font-size:14px; color:rgba(255,255,255,0.4);"></i>
                    </div>
                    <div style="position:relative; display:flex; align-items:center;">
                        <i class="fas fa-search" style="position:absolute; left:8px; font-size:10px; color:rgba(255,255,255,0.5);"></i>
                        <input type="text" id="ss-search-input" oninput="App._ssFilterExplorer(this.value)" placeholder="Search..."
                               style="background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.2); border-radius:4px; 
                                      color:#fff; padding:4px 8px 4px 22px; font-size:11px; width:140px; outline:none;" />
                    </div>
                </div>
            </div>

            <!-- Global Action Buttons (always visible) -->
            <div id="ss-btn-row" style="display:flex;align-items:center;gap:8px;flex-shrink:0;">
                <button onclick="App._ssClose()" id="ss-back-calendar-btn"
                        style="background:rgba(239,68,68,0.2);border:0.5px solid rgba(239,68,68,0.4);
                               border-radius:6px;color:#fca5a5;padding:5px 12px;cursor:pointer;font-size:11px;
                               display:inline-flex;align-items:center;gap:6px;white-space:nowrap;outline:none;"
                        onmouseenter="this.style.background='rgba(239,68,68,0.4)'"
                        onmouseleave="this.style.background='rgba(239,68,68,0.2)'">
                    <i class="fas fa-calendar-alt"></i> Back to Calendar
                </button>

                <button onclick="App._ssClose()"
                        style="background:rgba(255,255,255,0.1);border:0.5px solid rgba(255,255,255,0.25);
                               border-radius:6px;color:#fff;padding:5px 11px;cursor:pointer;font-size:12px;"
                        onmouseenter="this.style.background='rgba(255,255,255,0.22)'"
                        onmouseleave="this.style.background='rgba(255,255,255,0.1)'">&#x2715;</button>
            </div>
        </div>

        <!-- ── Main area ────────────────────────────────────────── -->
        <div style="flex:1;display:flex;align-items:center;justify-content:center;
                    position:relative;overflow:hidden;min-height:0;">

            <div id="ss-skeleton"
                 style="position:absolute;inset:0;display:flex;align-items:center;
                        justify-content:center;pointer-events:none;z-index:1;">
                <div style="display:flex;flex-direction:column;align-items:center;gap:12px;
                            color:rgba(255,255,255,0.3);">
                    <i class="fas fa-circle-notch fa-spin" style="font-size:28px;"></i>
                    <span id="ss-skeleton-label" style="font-size:11px;letter-spacing:.5px;"></span>
                </div>
            </div>

            <img id="ss-mainimg" src="" alt=""
                 style="position:absolute;inset:16px 80px;
                        max-width:calc(100% - 160px);max-height:calc(100% - 32px);
                        width:auto;height:auto;object-fit:contain;border-radius:10px;
                        margin:auto;display:block;transition:opacity .35s;opacity:0;z-index:2;" />

            <img id="ss-refimg" src="" alt=""
                 style="position:absolute;inset:16px 80px;
                        max-width:calc(100% - 160px);max-height:calc(100% - 32px);
                        width:auto;height:auto;object-fit:contain;border-radius:10px;
                        margin:auto;display:block;transition:opacity 0.9s ease;opacity:0;z-index:3;
                        pointer-events:none;" />

            <div id="ss-nav-left" onclick="App._ssNav(-1)"
                 style="position:absolute;left:16px;top:50%;transform:translateY(-50%);
                        background:rgba(255,255,255,0.12);border:0.5px solid rgba(255,255,255,0.22);
                        border-radius:50%;width:48px;height:48px;
                        display:flex;align-items:center;justify-content:center;
                        cursor:pointer;color:#fff;font-size:26px;user-select:none;z-index:4;"
                 onmouseenter="this.style.background='rgba(255,255,255,0.26)'"
                 onmouseleave="this.style.background='rgba(255,255,255,0.12)'">&#8249;</div>

            <div id="ss-nav-right" onclick="App._ssNav(1)"
                 style="position:absolute;right:16px;top:50%;transform:translateY(-50%);
                        background:rgba(255,255,255,0.12);border:0.5px solid rgba(255,255,255,0.22);
                        border-radius:50%;width:48px;height:48px;
                        display:flex;align-items:center;justify-content:center;
                        cursor:pointer;color:#fff;font-size:26px;user-select:none;z-index:4;"
                 onmouseenter="this.style.background='rgba(255,255,255,0.26)'"
                 onmouseleave="this.style.background='rgba(255,255,255,0.12)'">&#8250;</div>

            <!-- ── Karaoke caption overlay ── -->
            <div id="ss-caption"
                 onclick="event.stopPropagation()"
                 style="position:absolute;bottom:0;left:0;right:0;
                        max-height:50%;min-height:0;
                        background:linear-gradient(to top,
                            rgba(0,0,0,0.92) 0%,
                            rgba(0,0,0,0.75) 60%,
                            transparent 100%);
                        padding:56px 52px 28px 52px;
                        font-size:1.35rem;font-weight:400;line-height:1.65;
                        text-align:center;overflow-y:auto;
                        z-index:5;pointer-events:auto;user-select:text;cursor:text;
                        opacity:0;transition:opacity 0.4s;display:none;"></div>

            <!-- Loading indicator for TTS generation -->
            <div id="ss-tts-loading"
                 style="position:absolute;bottom:16px;right:80px;
                        background:rgba(0,0,0,0.6);border:0.5px solid rgba(255,255,255,0.2);
                        border-radius:20px;padding:5px 12px;font-size:11px;color:rgba(255,255,255,0.5);
                        display:none;z-index:6;align-items:center;gap:6px;">
                <i class="fas fa-circle-notch fa-spin" style="font-size:10px;"></i>
                <span>Generating voice…</span>
            </div>

            <!-- Explorer Area Container -->
            <div id="ss-explorer-container"
                 style="position:absolute;inset:16px 20px;display:none;flex-direction:row;gap:12px;
                        z-index:10;overflow:hidden;color:#fff;">
                
                <!-- Folder Tree Side Panel -->
                <div id="ss-folder-tree"
                     style="width:220px;min-width:50px;max-width:500px;resize:horizontal;
                            background:rgba(20,20,20,0.92);border:1px solid rgba(255,255,255,0.1);
                            border-radius:10px;overflow-y:auto;overflow-x:hidden;padding:12px;display:flex;flex-direction:column;flex-shrink:0;">
                </div>

                <!-- Explorer Grid/List View Area -->
                <div id="ss-explorer-view"
                     style="flex:1;
                            background:rgba(20,20,20,0.92);border:1px solid rgba(255,255,255,0.1);
                            border-radius:10px;overflow-y:auto;padding:20px;color:#fff;">
                </div>
            </div>
        </div>

        <!-- ── Bottom bar ──────────────────────────────────────────────── -->
        <div id="ss-bottombar" style="padding:8px 22px 14px;background:rgba(0,0,0,0.6);flex-shrink:0;">
            <div id="ss-styletag" style="text-align:center;margin-bottom:9px;min-height:22px;"></div>
            <div id="ss-bottom-controls" style="display:flex;align-items:center;justify-content:center;gap:12px;flex-wrap:wrap;margin-bottom:10px;width:100%;">
                <!-- Voice controls row -->
            <div id="ss-voice-row"
                 style="display:flex;align-items:center;gap:8px;flex-shrink:0;">

                <span id="ss-counter"
                      style="color:rgba(255,255,255,0.38);font-size:11px;
                             white-space:nowrap;min-width:40px;text-align:right;"></span>

                <!-- Speaker picker -->
                <select id="ss-voice-select" onchange="App._ssOnVoiceChange()"
                        style="background:rgba(255,255,255,0.1);
                               border:0.5px solid rgba(255,255,255,0.25);
                               border-radius:5px;color:#fff;padding:4px 7px;
                               font-size:11px;cursor:pointer;outline:none;max-width:140px;
                               color-scheme:dark;">
                    <option value="" style="background:#1a1a2e;color:#fff;">🔇 No Voice</option>
                </select>

                <!-- Transport -->
                <div style="display:inline-flex;align-items:center;gap:3px;">
                    <button id="ss-voice-play-btn"
                            onclick="App._ssVoicePlay()" title="Play narration"
                            style="background:rgba(255,255,255,0.1);border:0.5px solid rgba(255,255,255,0.25);
                                   border-radius:6px;color:#fff;width:30px;height:28px;
                                   display:inline-flex;align-items:center;justify-content:center;
                                   cursor:pointer;font-size:11px;transition:background .15s;"
                            onmouseenter="this.style.background='rgba(255,255,255,0.22)'"
                            onmouseleave="App._ssVoicePlayBtnLeave(this)">
                        <i class="fas fa-play" style="font-size:9px;"></i>
                    </button>
                    <button id="ss-voice-pause-btn"
                            onclick="App._ssVoicePause()" title="Pause / Resume narration"
                            style="background:rgba(255,255,255,0.1);border:0.5px solid rgba(255,255,255,0.25);
                                   border-radius:6px;color:#fff;width:30px;height:28px;
                                   display:inline-flex;align-items:center;justify-content:center;
                                   cursor:pointer;font-size:11px;transition:background .15s;"
                            onmouseenter="this.style.background='rgba(255,255,255,0.22)'"
                            onmouseleave="this.style.background='rgba(255,255,255,0.1)'">
                        <i class="fas fa-pause" style="font-size:9px;"></i>
                    </button>
                    <button id="ss-voice-stop-btn"
                            onclick="App._ssVoiceStop()" title="Stop narration"
                            style="background:rgba(255,255,255,0.1);border:0.5px solid rgba(255,255,255,0.25);
                                   border-radius:6px;color:#fff;width:30px;height:28px;
                                   display:inline-flex;align-items:center;justify-content:center;
                                   cursor:pointer;font-size:11px;transition:background .15s;"
                            onmouseenter="this.style.background='rgba(255,255,255,0.22)'"
                            onmouseleave="this.style.background='rgba(255,255,255,0.1)'">
                        <i class="fas fa-stop" style="font-size:9px;"></i>
                    </button>
                </div>

                <select id="ss-speed" onchange="App._ssSetSpeed(+this.value)"
                        style="background:rgba(255,255,255,0.1);border:0.5px solid rgba(255,255,255,0.25);
                               border-radius:5px;color:#fff;padding:4px 7px;
                               font-size:11px;cursor:pointer;outline:none;">
                    <option value="3000"  style="background:#1a1a2e;color:#fff;">3 s</option>
                    <option value="5000"  style="background:#1a1a2e;color:#fff;" selected>5 s</option>
                    <option value="8000"  style="background:#1a1a2e;color:#fff;">8 s</option>
                    <option value="12000" style="background:#1a1a2e;color:#fff;">12 s</option>
                </select>

                <button id="ss-auto-btn" onclick="App._ssToggleAuto()"
                        style="background:rgba(255,255,255,0.1);border:0.5px solid rgba(255,255,255,0.25);
                               border-radius:6px;color:#fff;padding:5px 12px;cursor:pointer;font-size:11px;
                               display:inline-flex;align-items:center;gap:6px;white-space:nowrap;
                               transition:background .15s,border-color .15s;">
                    <i class="fas fa-random" style="font-size:10px;"></i> Auto Random
                </button>

                <button id="ss-manual-btn" onclick="App._ssOpenManual()"
                        title="Open in Manual Generator"
                        style="background:rgba(0,120,212,0.45);border:0.5px solid rgba(0,120,212,0.6);
                               border-radius:6px;color:#fff;padding:5px 12px;cursor:pointer;font-size:11px;
                               display:inline-flex;align-items:center;gap:6px;white-space:nowrap;
                               transition:background .15s;"
                        onmouseenter="this.style.background='rgba(0,120,212,0.7)'"
                        onmouseleave="this.style.background='rgba(0,120,212,0.45)'">
                    <i class="fas fa-wand-magic-sparkles" style="font-size:10px;"></i> Customize
                </button>

                <button id="ss-cover-btn" onclick="App._ssSetCover(this)"
                        title="Set current image as Cover"
                        style="background:rgba(16,185,129,0.45);border:0.5px solid rgba(16,185,129,0.6);
                               border-radius:6px;color:#fff;padding:5px 12px;cursor:pointer;font-size:11px;
                               display:inline-flex;align-items:center;gap:6px;white-space:nowrap;
                               transition:background .15s;"
                        onmouseenter="this.style.background='rgba(16,185,129,0.7)'"
                        onmouseleave="this.style.background='rgba(16,185,129,0.45)'">
                    <i class="fas fa-image" style="font-size:10px;"></i> Cover
                </button>

                <button onclick="App._ssToggleFullscreen()"
                        style="background:rgba(255,255,255,0.1);border:0.5px solid rgba(255,255,255,0.25);
                               border-radius:6px;color:#fff;padding:5px 12px;cursor:pointer;font-size:11px;
                               display:inline-flex;align-items:center;gap:6px;white-space:nowrap;"
                        onmouseenter="this.style.background='rgba(255,255,255,0.22)'"
                        onmouseleave="this.style.background='rgba(255,255,255,0.1)'">
                    <i class="fas fa-expand" style="font-size:10px;"></i> Fullscreen
                </button>
            </div>
                <button id="ss-btn-move" onclick="App._ssMoveSelected()"
                        style="background:rgba(16,185,129,0.45);border:0.5px solid rgba(16,185,129,0.6);
                               border-radius:6px;color:#fff;padding:5px 12px;cursor:pointer;font-size:11px;
                               display:none;align-items:center;gap:6px;outline:none;">
                    <i class="fas fa-folder-open" style="font-size:10px;"></i> Move Selected
                </button>
                <button id="ss-btn-copy" onclick="App._ssCopySelected()"
                        style="background:rgba(139,92,246,0.45);border:0.5px solid rgba(139,92,246,0.6);
                               border-radius:6px;color:#fff;padding:5px 12px;cursor:pointer;font-size:11px;
                               display:none;align-items:center;gap:6px;outline:none;">
                    <i class="fas fa-copy" style="font-size:10px;"></i> Copy Selected
                </button>
            </div>

            <div id="ss-strip"
                 style="display:flex;gap:7px;overflow-x:auto;justify-content:center;
                        scrollbar-width:none;-ms-overflow-style:none;padding-bottom:3px;"></div>
            <div style="height:2px;background:rgba(255,255,255,0.12);
                        margin-top:9px;border-radius:2px;overflow:hidden;">
                <div id="ss-pbar" style="height:100%;background:#0078d4;width:0%;transition:none;"></div>
            </div>
        </div>`;

        document.body.appendChild(modal);

        document.addEventListener('keydown', e => {
            const m = document.getElementById('ss-art-modal');
            if (!m || m.style.display === 'none') return;
            // Bypass hotkeys when not in slideshow mode
            if (this._ssViewMode && this._ssViewMode !== 'slideshow') {
                if (e.key === 'Escape') App._ssClose();
                return;
            }
            if (e.key === 'ArrowLeft') { e.preventDefault(); App._ssNav(-1); }
            else if (e.key === 'ArrowRight') { e.preventDefault(); App._ssNav(1); }
            else if (e.key === 'Escape') { App._ssClose(); }
            else if (e.key === ' ') { e.preventDefault(); App._ssToggleAuto(); }
            else if (e.key === 'p' || e.key === 'P') { e.preventDefault(); App._ssVoicePause(); }
            else if (e.key === 's' || e.key === 'S') { e.preventDefault(); App._ssVoiceStop(); }
        });

        // Setup custom context menu
        if (!document.getElementById('ss-context-menu')) {
            const contextMenu = document.createElement('div');
            contextMenu.id = 'ss-context-menu';
            contextMenu.style.cssText = [
                'position:fixed;display:none;z-index:9999999;background:#1a1a26;',
                'border:1px solid rgba(255,255,255,0.15);border-radius:6px;box-shadow:0 10px 25px rgba(0,0,0,0.5);',
                'padding:4px 0;width:150px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;',
                'font-size:12px;color:#fff;user-select:none;'
            ].join('');
            contextMenu.innerHTML = `
                <div id="ss-context-menu-rename" style="padding:8px 12px;cursor:pointer;display:flex;align-items:center;gap:8px;transition:background .15s;">
                    <i class="fas fa-edit" style="color:#eab308;font-size:11px;"></i> Rename File
                </div>
                <div id="ss-context-menu-move" style="padding:8px 12px;cursor:pointer;display:flex;align-items:center;gap:8px;transition:background .15s;">
                    <i class="fas fa-folder-open" style="color:#10b981;font-size:11px;"></i> Move to Folder
                </div>
                <div id="ss-context-menu-copy" style="padding:8px 12px;cursor:pointer;display:flex;align-items:center;gap:8px;transition:background .15s;">
                    <i class="fas fa-copy" style="color:#8b5cf6;font-size:11px;"></i> Copy to Folder
                </div>
            `;
            document.body.appendChild(contextMenu);
            
            document.getElementById('ss-context-menu-rename').addEventListener('click', () => {
                contextMenu.style.display = 'none';
                App._ssRenameSelected();
            });

            document.getElementById('ss-context-menu-move').addEventListener('click', () => {
                contextMenu.style.display = 'none';
                App._ssMoveSelected();
            });

            document.getElementById('ss-context-menu-copy').addEventListener('click', () => {
                contextMenu.style.display = 'none';
                App._ssCopySelected();
            });
            
            document.addEventListener('click', () => {
                contextMenu.style.display = 'none';
            });
        }

        // Wire up the <audio> element events
        const audio = document.getElementById('ss-audio');
        if (audio) {
            audio.addEventListener('play', () => { this._ssAudioPlaying = true; this._ssUpdateTransportUI(); this._ssStartKaraokeRaf(); });
            audio.addEventListener('pause', () => { this._ssUpdateTransportUI(); });
            audio.addEventListener('ended', () => {
                this._ssAudioPlaying = false;
                this._ssVoicePaused = false;
                this._ssStopKaraokeRaf();
                this._ssHighlightWord(-1);
                this._ssUpdateTransportUI();
                if (this._ssAutoOn) this._ssStartTimer(true);
            });
            audio.addEventListener('error', (e) => {
                console.warn('[Slideshow] Audio error:', e);
                this._ssAudioPlaying = false;
                this._ssVoicePaused = false;
                this._ssStopKaraokeRaf();
                this._ssUpdateTransportUI();
                if (this._ssAutoOn) this._ssStartTimer(true);
            });
        }

        // ── Mobile audio unlock: play a silent buffer on first user tap ──
        // This unlocks the <audio> element for future programmatic playback.
        const unlockAudio = () => {
            if (this._ssAudioUnlocked) return;
            const a = document.getElementById('ss-audio');
            if (a) {
                // Create a tiny silent WAV (44 bytes header + minimal data)
                const silentWav = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=';
                a.src = silentWav;
                const p = a.play();
                if (p) p.then(() => { a.pause(); a.currentTime = 0; a.src = ''; }).catch(() => { });
            }
            this._ssAudioUnlocked = true;
            modal.removeEventListener('click', unlockAudio);
            modal.removeEventListener('touchstart', unlockAudio);
        };
        modal.addEventListener('click', unlockAudio, { once: false });
        modal.addEventListener('touchstart', unlockAudio, { once: false });

        this._ssFetchAndPopulateSpeakers();
        this._ssUpdateTransportUI();
    },

    // =========================================================================
    // Speaker list — fetched from server so it's always the Aura voices
    // =========================================================================
    async _ssFetchAndPopulateSpeakers() {
        const select = document.getElementById('ss-voice-select');
        if (!select) return;

        // Use cached list if available
        let speakers = this._SS_SPEAKERS;
        if (!speakers.length) {
            try {
                const res = await fetch('/api/ai/generate-text', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ speakersOnly: true }),
                });
                if (res.ok) {
                    const data = await res.json();
                    speakers = data.speakers || [];
                    this._SS_SPEAKERS = speakers;
                }
            } catch (e) {
                console.warn('[Slideshow] Could not fetch speakers:', e);
            }
        }

        // Keep the "No Voice" option, append Aura speakers
        select.innerHTML = '<option value="" style="background:#1a1a2e;color:#fff;">🔇 No Voice</option>';
        speakers.forEach(sp => {
            const opt = document.createElement('option');
            opt.value = sp.id;
            opt.textContent = sp.label;
            opt.style.background = '#1a1a2e';
            opt.style.color = '#fff';
            if (sp.id === this._SS_AURA_SPEAKER) opt.selected = true;
            select.appendChild(opt);
        });
    },

    _ssOnVoiceChange() {
        const select = document.getElementById('ss-voice-select');
        this._SS_AURA_SPEAKER = select?.value || '';
        if (this._ssCurrent !== undefined && this._ssSlides) {
            const s = this._ssSlides[this._ssCurrent];
            if (s) {
                this._ssStopAudio();
                this._ssPlayCaption(s.style);
            }
        }
    },

    // =========================================================================
    // Voice transport controls
    // =========================================================================
    _ssVoicePlay() {
        const audio = document.getElementById('ss-audio');
        const select = document.getElementById('ss-voice-select');
        if (!select || select.value === '') return;

        if (audio && audio.paused && audio.src && !audio.ended) {
            audio.play();
            this._ssVoicePaused = false;
            this._ssUpdateTransportUI();
            return;
        }

        const s = this._ssSlides?.[this._ssCurrent];
        if (!s) return;
        this._ssStopAudio();
        this._ssPlayCaption(s.style);
    },

    _ssVoicePause() {
        const audio = document.getElementById('ss-audio');
        if (!audio || !audio.src) return;
        if (audio.paused) {
            audio.play();
            this._ssVoicePaused = false;
        } else {
            audio.pause();
            this._ssVoicePaused = true;
        }
        this._ssUpdateTransportUI();
    },

    _ssVoiceStop() {
        this._ssStopAudio();
        this._ssUpdateTransportUI();
    },

    _ssUpdateTransportUI() {
        const audio = document.getElementById('ss-audio');
        const playBtn = document.getElementById('ss-voice-play-btn');
        const pauseBtn = document.getElementById('ss-voice-pause-btn');
        const stopBtn = document.getElementById('ss-voice-stop-btn');
        if (!playBtn || !pauseBtn || !stopBtn) return;

        const isPlaying = audio && !audio.paused && !audio.ended;
        const isPaused = this._ssVoicePaused;

        playBtn.style.background = !isPlaying ? 'rgba(0,120,212,0.55)' : 'rgba(255,255,255,0.1)';
        playBtn.style.borderColor = !isPlaying ? '#0078d4' : 'rgba(255,255,255,0.25)';

        pauseBtn.style.background = isPlaying ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.1)';
        pauseBtn.style.borderColor = isPlaying ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.25)';
        pauseBtn.innerHTML = isPaused
            ? '<i class="fas fa-play"  style="font-size:9px;color:#7dd3fc;"></i>'
            : '<i class="fas fa-pause" style="font-size:9px;"></i>';
        pauseBtn.title = isPaused ? 'Resume narration' : 'Pause narration';

        const canStop = this._ssAudioPlaying || isPaused;
        stopBtn.style.opacity = canStop ? '1' : '0.35';
        stopBtn.style.cursor = canStop ? 'pointer' : 'default';
    },

    _ssVoicePlayBtnLeave(el) {
        const audio = document.getElementById('ss-audio');
        const playing = audio && !audio.paused && !audio.ended;
        el.style.background = !playing ? 'rgba(0,120,212,0.55)' : 'rgba(255,255,255,0.1)';
        el.style.borderColor = !playing ? '#0078d4' : 'rgba(255,255,255,0.25)';
    },

    // =========================================================================
    // Main caption + TTS fetch
    // =========================================================================
    async _ssPlayCaption(styleName) {
        const captionEl = document.getElementById('ss-caption');
        const loadingEl = document.getElementById('ss-tts-loading');
        const refImgEl = document.getElementById('ss-refimg');
        const select = document.getElementById('ss-voice-select');
        const voiceVal = select ? select.value : '';

        // Reset ref image
        if (refImgEl) {
            refImgEl.style.transition = 'none';
            refImgEl.style.opacity = '0';
            refImgEl.src = '';
        }

        if (!captionEl) return;

        // No voice selected — hide caption and stop
        if (voiceVal === '') {
            captionEl.style.opacity = '0';
            captionEl.style.display = 'none';
            return;
        }

        const s = this._ssSlides?.[this._ssCurrent];
        if (!s) return;

        // Use cached result for this slide + speaker
        const cacheKey = `${styleName}__${voiceVal}`;
        if (s._captionCache?.[cacheKey]) {
            const cached = s._captionCache[cacheKey];
            this._ssShowCaptionText(cached.script);
            this._ssPlayAudioBase64(cached.audioBase64, cached.audioMime, cached.audioDuration, s._refImages || [], cached.languageCode);
            if (cached.refImages?.length) {
                s._refImages = cached.refImages;
            }
            return;
        }

        // Show loading state
        captionEl.style.display = 'block';
        captionEl.style.opacity = '1';
        captionEl.innerHTML = '<span style="color:rgba(255,255,255,0.35);font-size:0.9rem;">Generating introduction…</span>';
        if (loadingEl) loadingEl.style.display = 'flex';

        try {
            const res = await fetch('/api/ai/generate-text', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: `Introduce the art style: ${styleName}`,
                    language: 'English',   // Backend now overrides this using voiceVal
                    voice: voiceVal,
                }),
            });
            const data = await res.json();

            if (loadingEl) loadingEl.style.display = 'none';

            if (!data.script) {
                captionEl.innerHTML = '<span style="color:rgba(255,255,255,0.35);">Failed to generate introduction.</span>';
                return;
            }

            // Cache the result
            s._captionCache = s._captionCache || {};
            s._captionCache[cacheKey] = data;
            s._refImages = [];

            // Generate reference images if prompts supplied
            if (data.visualPrompts?.length) {
                this._ssGenerateRefImages(data.visualPrompts, s);
            }

            // Only apply if still on the same slide
            if (this._ssSlides?.[this._ssCurrent] === s) {
                this._ssShowCaptionText(data.script);
                this._ssPlayAudioBase64(data.audioBase64, data.audioMime, data.audioDuration, s._refImages, data.languageCode);
            }

        } catch (e) {
            console.error('[Slideshow] TTS fetch error:', e);
            if (loadingEl) loadingEl.style.display = 'none';
            captionEl.innerHTML = '<span style="color:rgba(255,255,255,0.35);">Failed to generate introduction.</span>';
        }
    },

    // =========================================================================
    // Play server-side audio (base64 MP3)
    // Falls back to browser SpeechSynthesis if no audio returned
    // =========================================================================
    _ssPlayAudioBase64(base64, mime, estimatedDuration, refImages, langCode) {
        const audio = document.getElementById('ss-audio');
        if (!audio) return;

        if (!base64) {
            // Fallback: browser SpeechSynthesis (may vary by device but better than silence)
            console.warn('[Slideshow] No server audio — falling back to browser TTS');
            this._ssFallbackBrowserTTS(this._ssUtteranceText, estimatedDuration, refImages, langCode);
            return;
        }

        // Build blob URL from base64
        try {
            const byteChars = atob(base64);
            const byteNums = new Array(byteChars.length);
            for (let i = 0; i < byteChars.length; i++) byteNums[i] = byteChars.charCodeAt(i);
            const blob = new Blob([new Uint8Array(byteNums)], { type: mime || 'audio/mpeg' });
            const url = URL.createObjectURL(blob);

            // Revoke previous blob URL to avoid leaks
            if (audio._blobUrl) URL.revokeObjectURL(audio._blobUrl);
            audio._blobUrl = url;

            audio.src = url;
            audio._duration = estimatedDuration || 0;
            audio._refImages = refImages;
            this._ssAudioPlaying = true;
            this._ssVoicePaused = false;
            this._ssUpdateTransportUI();

            const playPromise = audio.play();
            if (playPromise) {
                playPromise.catch(err => {
                    // iOS / Android require user gesture before autoplay
                    // Show a tap-to-play indicator
                    console.warn('[Slideshow] Autoplay blocked:', err);
                    this._ssShowAutoplayPrompt();
                });
            }
        } catch (e) {
            console.error('[Slideshow] Audio decode error:', e);
        }
    },

    _ssShowAutoplayPrompt() {
        const captionEl = document.getElementById('ss-caption');
        if (!captionEl) return;
        // Save caption content for restoration after tap
        this._ssAutoplayOrigCaption = captionEl.innerHTML;

        captionEl.innerHTML = `
            <div id="ss-tap-to-play"
                 style="display:flex;flex-direction:column;align-items:center;gap:12px;
                        pointer-events:all;cursor:pointer;padding:20px;">
                <i class="fas fa-volume-up" style="font-size:2rem;color:rgba(255,255,255,0.6);"></i>
                <span style="color:rgba(255,255,255,0.7);font-size:1rem;">Tap to play voice narration</span>
            </div>`;
        captionEl.style.pointerEvents = 'auto';
        captionEl.style.display = 'block';
        captionEl.style.opacity = '1';

        const tapEl = document.getElementById('ss-tap-to-play');
        if (tapEl) {
            const tapHandler = () => {
                const a = document.getElementById('ss-audio');
                if (a && a.src) {
                    const p = a.play();
                    if (p) p.catch(e => console.warn('[Slideshow] Still blocked:', e));
                }
                if (this._ssAutoplayOrigCaption) {
                    captionEl.innerHTML = this._ssAutoplayOrigCaption;
                }
                tapEl.removeEventListener('click', tapHandler);
            };
            tapEl.addEventListener('click', tapHandler);
        }
    },

    // =========================================================================
    // Fallback: browser SpeechSynthesis (used only when server audio unavailable)
    // =========================================================================
    _ssFallbackBrowserTTS(text, estimatedDuration, refImages, langCode) {
        if (!text || !window.speechSynthesis) {
            console.warn('[Slideshow] No text or SpeechSynthesis not available');
            if (this._ssAutoOn) this._ssStartTimer(true);
            return;
        }
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        if (langCode) utterance.lang = langCode;
        utterance.rate = 0.97;

        // ── Try to find a matching voice for the language ──
        const pickVoice = () => {
            const voices = window.speechSynthesis.getVoices();
            if (!voices.length || !langCode) return;
            const langPrefix = langCode.split('-')[0].toLowerCase(); // 'zh', 'ja', 'ko', etc.

            // Prefer exact match (e.g. zh-CN), then prefix match (zh)
            let match = voices.find(v => v.lang === langCode);
            if (!match) match = voices.find(v => v.lang.toLowerCase().startsWith(langPrefix));
            // On mobile, Google voices often have format "Google 普通话（中国大陆）" or similar
            if (!match) match = voices.find(v => v.lang.toLowerCase().includes(langPrefix));
            if (match) {
                utterance.voice = match;
                utterance.lang = match.lang;
                console.log('[Slideshow] Selected TTS voice:', match.name, match.lang);
            } else {
                console.warn(`[Slideshow] No voice found for ${langCode}. Available:`,
                    voices.map(v => `${v.name} (${v.lang})`).join(', '));
            }
        };

        // Voices may load async — try now, and also on voiceschanged
        pickVoice();
        if (window.speechSynthesis.getVoices().length === 0) {
            window.speechSynthesis.addEventListener('voiceschanged', () => {
                pickVoice();
                // Re-speak with the correct voice
                window.speechSynthesis.cancel();
                window.speechSynthesis.speak(utterance);
            }, { once: true });
        }

        this._ssAudioPlaying = true;
        this._ssUpdateTransportUI();

        const wordMap = this._ssWordMap || [];
        const startMs = Date.now();
        const totalMs = (estimatedDuration || 15) * 1000;

        // Use rAF timing poll (since onboundary is unreliable on mobile)
        const rafPoll = () => {
            if (!this._ssAudioPlaying) return;
            const elapsed = Date.now() - startMs;
            const progress = Math.min(elapsed / totalMs, 1);
            const wordIdx = Math.min(Math.floor(progress * wordMap.length), wordMap.length - 1);
            if (wordIdx >= 0 && wordIdx !== this._ssCurrentWordIdx) {
                this._ssHighlightWord(wordIdx);
            }
            this._ssFallbackRafId = requestAnimationFrame(rafPoll);
        };
        this._ssFallbackRafId = requestAnimationFrame(rafPoll);

        utterance.onend = utterance.onerror = (ev) => {
            if (ev.type === 'error') {
                console.warn('[Slideshow] SpeechSynthesis error:', ev.error);
            }
            cancelAnimationFrame(this._ssFallbackRafId);
            this._ssAudioPlaying = false;
            this._ssVoicePaused = false;
            this._ssUpdateTransportUI();
            this._ssHighlightWord(-1);
            if (this._ssAutoOn) this._ssStartTimer(true);
        };

        window.speechSynthesis.speak(utterance);
    },

    // =========================================================================
    // Karaoke rAF loop — tracks <audio>.currentTime against word-timing table
    // =========================================================================
    _ssStartKaraokeRaf() {
        this._ssStopKaraokeRaf();
        const audio = document.getElementById('ss-audio');
        const wordMap = this._ssWordMap;
        if (!audio || !wordMap?.length) return;

        // Build char-offset → time mapping using audio duration
        // We'll derive timing on first frame when duration is known
        let charDuration = null; // seconds per character

        const loop = () => {
            if (!this._ssAudioPlaying) return;
            this._ssKaraokeRafId = requestAnimationFrame(loop);

            const duration = audio.duration || audio._duration;
            if (!duration || isNaN(duration)) return;

            if (charDuration === null) {
                const totalChars = this._ssUtteranceText?.length || 1;
                charDuration = duration / totalChars;
            }

            const currentChar = audio.currentTime / charDuration;
            const wordIdx = this._ssFindWordIdxByChar(currentChar);

            if (wordIdx >= 0 && wordIdx !== this._ssCurrentWordIdx) {
                this._ssHighlightWord(wordIdx);
            }

            // Cross-fade ref images
            const refImages = audio._refImages || [];
            if (refImages.length && audio.duration) {
                const progress = audio.currentTime / audio.duration;
                if (!this._ssRefImgIdx) this._ssRefImgIdx = 0;
                const threshold = (this._ssRefImgIdx + 1) / (refImages.length + 1);
                if (progress >= threshold && this._ssRefImgIdx < refImages.length) {
                    this._ssCrossFadeRefImg(refImages, this._ssRefImgIdx++);
                }
            }
        };
        this._ssRefImgIdx = 0;
        this._ssKaraokeRafId = requestAnimationFrame(loop);
    },

    _ssStopKaraokeRaf() {
        if (this._ssKaraokeRafId) {
            cancelAnimationFrame(this._ssKaraokeRafId);
            this._ssKaraokeRafId = null;
        }
        if (this._ssFallbackRafId) {
            cancelAnimationFrame(this._ssFallbackRafId);
            this._ssFallbackRafId = null;
        }
    },

    // Find the word index whose character range contains charPos
    _ssFindWordIdxByChar(charPos) {
        const wordMap = this._ssWordMap;
        if (!wordMap?.length) return -1;
        // Forward-only scan from last position for efficiency
        const start = Math.max(0, this._ssCurrentWordIdx);
        for (let i = start; i < wordMap.length; i++) {
            if (wordMap[i].endChar > charPos) return i;
        }
        return wordMap.length - 1;
    },

    // =========================================================================
    // Karaoke HTML building (unchanged logic, same normalisation)
    // =========================================================================
    _ssBuildKaraokeHtml(text) {
        const cleaned = text.replace(/\r\n?/g, '\n').replace(/[ \t]+/g, ' ').trim();
        this._ssUtteranceText = cleaned;

        // Detect CJK content (Chinese/Japanese/Korean characters)
        const cjkRe = /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\u4e00-\u9fff\uf900-\ufaff\uac00-\ud7af]/;
        const hasCJK = cjkRe.test(cleaned);

        const wordMap = [];
        let html = '';

        if (hasCJK) {
            // CJK mode: split into individual characters (or small groups)
            // Each CJK character becomes its own karaoke unit; Latin runs stay grouped
            const tokenRe = /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\u4e00-\u9fff\uf900-\ufaff\uac00-\ud7af]|[a-zA-Z0-9]+|[\s]+|[^\s\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\u4e00-\u9fff\uf900-\ufaff\uac00-\ud7af\w]/gu;
            let tokenMatch;
            while ((tokenMatch = tokenRe.exec(cleaned)) !== null) {
                const ch = tokenMatch[0];
                const idx = tokenMatch.index;
                if (/^\s+$/.test(ch)) {
                    // Whitespace / newlines
                    html += ch.replace(/\n{2,}/g, '<br><br>').replace(/\n/g, ' ');
                } else {
                    const spanId = `ss-w-${wordMap.length}`;
                    const escaped = ch.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                    html += `<span id="${spanId}" `
                        + `data-start="${idx}" `
                        + `data-end="${idx + ch.length}" `
                        + `style="display:inline-block;color:rgba(255,255,255,0.72);`
                        + `transition:color 0.06s,text-shadow 0.06s,transform 0.08s;">`
                        + `${escaped}</span>`;
                    wordMap.push({ spanId, startChar: idx, endChar: idx + ch.length, wordText: ch });
                }
            }
        } else {
            // Latin / standard mode: split by whitespace
            const wordRegex = /\S+/g;
            let match;
            let lastIdx = 0;

            while ((match = wordRegex.exec(cleaned)) !== null) {
                if (match.index > lastIdx) {
                    const gap = cleaned.slice(lastIdx, match.index);
                    html += gap.replace(/\n{2,}/g, '<br><br>').replace(/\n/g, ' ');
                }
                const spanId = `ss-w-${wordMap.length}`;
                const wordText = match[0];
                const escaped = wordText
                    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                html += `<span id="${spanId}" `
                    + `data-start="${match.index}" `
                    + `data-end="${match.index + wordText.length}" `
                    + `style="display:inline-block;color:rgba(255,255,255,0.72);`
                    + `transition:color 0.06s,text-shadow 0.06s,transform 0.08s;">`
                    + `${escaped}</span>`;
                wordMap.push({ spanId, startChar: match.index, endChar: match.index + wordText.length, wordText });
                lastIdx = match.index + wordText.length;
            }
            if (lastIdx < cleaned.length) html += cleaned.slice(lastIdx).replace(/\n/g, ' ');
        }
        return { html, wordMap, cleanedText: cleaned };
    },

    _ssShowCaptionText(text) {
        const captionEl = document.getElementById('ss-caption');
        if (!captionEl) return;
        const { html, wordMap } = this._ssBuildKaraokeHtml(text);
        this._ssWordMap = wordMap;
        this._ssCurrentWordIdx = -1;
        captionEl.innerHTML = html;
        captionEl.style.display = 'block';
        requestAnimationFrame(() => { captionEl.style.opacity = '1'; });
        captionEl.scrollTop = 0;
    },

    _ssHighlightWord(wordIdx) {
        const wordMap = this._ssWordMap;
        if (!wordMap?.length) return;
        const prevIdx = this._ssCurrentWordIdx;
        if (prevIdx >= 0 && prevIdx < wordMap.length) {
            const prev = document.getElementById(wordMap[prevIdx].spanId);
            if (prev) {
                prev.style.color = 'rgba(255,255,255,0.72)';
                prev.style.textShadow = 'none';
                prev.style.transform = 'scale(1)';
                prev.style.fontWeight = '400';
            }
        }
        this._ssCurrentWordIdx = wordIdx;
        if (wordIdx < 0 || wordIdx >= wordMap.length) return;
        const el = document.getElementById(wordMap[wordIdx].spanId);
        if (!el) return;
        el.style.color = '#38bdf8';
        el.style.textShadow = '0 0 18px rgba(56,189,248,0.7),0 0 6px rgba(56,189,248,0.4)';
        el.style.transform = 'scale(1.1)';
        el.style.fontWeight = '600';

        const captionEl = document.getElementById('ss-caption');
        if (captionEl) {
            const cRect = captionEl.getBoundingClientRect();
            const wRect = el.getBoundingClientRect();
            const relTop = wRect.top - cRect.top + captionEl.scrollTop;
            const relBot = relTop + wRect.height;
            const visBot = captionEl.scrollTop + captionEl.clientHeight;
            if (relBot > visBot - 20) {
                captionEl.scrollTo({ top: relTop - captionEl.clientHeight / 2, behavior: 'smooth' });
            } else if (relTop < captionEl.scrollTop + 20) {
                captionEl.scrollTo({ top: relTop - 20, behavior: 'smooth' });
            }
        }
    },

    // =========================================================================
    // Stop audio (handles both <audio> element and browser SpeechSynthesis)
    // =========================================================================
    _ssStopAudio() {
        this._ssStopKaraokeRaf();

        const audio = document.getElementById('ss-audio');
        if (audio) {
            audio.pause();
            audio.currentTime = 0;
            // Don't clear src so we can resume; clear on next slide
        }

        // Also cancel any browser SpeechSynthesis fallback
        try { window.speechSynthesis?.cancel(); } catch (e) { }

        this._ssAudioPlaying = false;
        this._ssVoicePaused = false;
        this._ssCurrentWordIdx = -1;
        this._ssWordMap = [];
        this._ssRefImgIdx = 0;

        const captionEl = document.getElementById('ss-caption');
        if (captionEl) {
            captionEl.style.opacity = '0';
            setTimeout(() => { if (captionEl.style.opacity === '0') captionEl.style.display = 'none'; }, 420);
        }
        const refImgEl = document.getElementById('ss-refimg');
        if (refImgEl) {
            refImgEl.style.transition = 'none';
            refImgEl.style.opacity = '0';
            refImgEl.src = '';
        }
        this._ssUpdateTransportUI();
    },

    // =========================================================================
    // Reference image cross-fade (unchanged)
    // =========================================================================
    async _ssGenerateRefImages(prompts, slide) {
        for (let i = 0; i < prompts.length; i++) {
            const prompt = prompts[i];
            const isArtistPhoto = (i === 1);
            const provider = isArtistPhoto ? 'google' : 'pexels';
            try {
                const keywords = prompt.split(',')[0]
                    .replace(/art style|cinematic|highly detailed|vibrant|masterpiece|4k/gi, '').trim();
                const realResults = await this._ssSearchMaterials(keywords, 'images', provider);
                if (realResults?.length > 0) {
                    slide._refImages.push(realResults[0].localPath || realResults[0].url); continue;
                }
                const serverUrl = this._getServerUrl();
                const res = await fetch(`${serverUrl}/api/ai/generate-image`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompt, model: 'flux-1-schnell' }),
                });
                if (res.ok) {
                    const blob = await res.blob();
                    slide._refImages.push(URL.createObjectURL(blob));
                }
            } catch (e) {
                console.error('[Slideshow] Ref image error:', e);
            }
        }
    },

    async _ssSearchMaterials(query, type = 'images', provider = 'pexels') {
        const currentSlide = this._ssSlides?.[this._ssCurrent];
        const styleName = currentSlide?.style || '';
        try {
            const serverUrl = this._getServerUrl();
            const res = await fetch(`${serverUrl}/api/ai/search-materials`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query, type, styleName, provider }),
            });
            if (res.ok) return (await res.json()).results || [];
        } catch (e) { }
        return [];
    },

    _ssCrossFadeRefImg(refImages, idx) {
        const refImgEl = document.getElementById('ss-refimg');
        if (!refImgEl || idx >= refImages.length) return;
        const nextUrl = refImages[idx];
        const isVideo = /\.(mp4|webm|mov)(\?|$)/i.test(nextUrl) || nextUrl.includes('video');

        if (isVideo) {
            const video = document.createElement('video');
            video.src = nextUrl;
            video.autoplay = true;
            video.muted = true;
            video.loop = true;
            video.playsInline = true;
            video.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity 0.9s ease;';
            const container = refImgEl.parentElement;
            container.appendChild(video);
            video.oncanplay = () => {
                refImgEl.style.opacity = '0';
                video.style.opacity = '1';
                setTimeout(() => { container.querySelectorAll('video').forEach(v => { if (v !== video) v.remove(); }); }, 1000);
            };
            return;
        }

        const tmpImg = new Image();
        tmpImg.onload = () => {
            refImgEl.style.transition = 'none';
            refImgEl.style.opacity = '0';
            refImgEl.src = nextUrl;
            refImgEl.classList.remove('ss-ken-burns');
            void refImgEl.offsetHeight;
            refImgEl.classList.add('ss-ken-burns');
            refImgEl.style.animationDelay = `-${Math.random() * 10}s`;
            refImgEl.style.transition = 'opacity 0.9s ease';
            refImgEl.style.opacity = '1';
        };
        tmpImg.src = nextUrl;
    },

    // =========================================================================
    // Slide management (unchanged from original)
    // =========================================================================
    _ssLoadSlides(slides, startIdx) {
        this._ssSlides = slides;
        this._ssCurrent = startIdx;
        this._ssAutoOn = false;
        this._ssTimer = null;

        const autoBtn = document.getElementById('ss-auto-btn');
        if (autoBtn) {
            autoBtn.style.background = 'rgba(255,255,255,0.1)';
            autoBtn.style.borderColor = 'rgba(255,255,255,0.25)';
            autoBtn.innerHTML = '<i class="fas fa-random" style="font-size:10px;"></i> Auto Random';
        }

        const strip = document.getElementById('ss-strip');
        if (strip) {
            strip.innerHTML = '';
            const cardImgMap = new Map();
            document.querySelectorAll('#calendar-preview-content .style-card').forEach(card => {
                const img = card.querySelector('img');
                if (img && card.dataset.style) cardImgMap.set(card.dataset.style, img.currentSrc || img.src);
            });
            slides.forEach((s, i) => {
                const thumb = document.createElement('img');
                thumb.alt = s.style;
                thumb.title = s.style;
                thumb.style.cssText = 'width:56px;height:42px;object-fit:cover;border-radius:5px;cursor:pointer;flex-shrink:0;background:#1a1a2e;opacity:0.35;border:2px solid transparent;transition:opacity .2s,border-color .2s;';
                thumb.onclick = () => App._ssGoto(i);
                const previewSrc = cardImgMap.get(s.style);
                this._ssTryLoad(thumb, previewSrc ? [previewSrc, ...s.sources] : s.sources);
                strip.appendChild(thumb);
            });
        }

        const modal = document.getElementById('ss-art-modal');
        if (modal) modal.style.display = 'flex';
        this._ssGoto(startIdx);
    },

    _ssTryLoad(imgEl, sources) {
        let idx = 0;
        const next = () => {
            while (idx < sources.length && !sources[idx]) idx++;
            if (idx >= sources.length) return;
            const src = sources[idx++];
            imgEl.onerror = next;
            imgEl.onload = () => { imgEl.style.opacity = '1'; };
            imgEl.src = src;
        };
        next();
    },

    _ssGoto(idx) {
        const slides = this._ssSlides;
        if (!slides?.length) return;
        if (idx < 0) idx = slides.length - 1;
        if (idx >= slides.length) idx = 0;
        this._ssCurrent = idx;

        const s = slides[idx];
        const mainImg = document.getElementById('ss-mainimg');
        const sk = document.getElementById('ss-skeleton');
        const skLabel = document.getElementById('ss-skeleton-label');

        // Clear audio blob URL from previous slide
        const audio = document.getElementById('ss-audio');
        if (audio) {
            audio.pause();
            if (audio._blobUrl) { URL.revokeObjectURL(audio._blobUrl); audio._blobUrl = null; }
            audio.src = '';
            audio.currentTime = 0;
        }

        if (mainImg) {
            mainImg.style.opacity = '0';
            mainImg.onload = mainImg.onerror = null;
            mainImg.src = '';
            if (sk) sk.style.display = 'flex';
            if (skLabel) skLabel.textContent = s.style.toUpperCase();

            const previewCard = document.querySelector(
                `#calendar-preview-content .style-card[data-style="${CSS.escape(s.style)}"]`
            );
            const previewSrc = previewCard?.querySelector('img')?.currentSrc
                || previewCard?.querySelector('img')?.src;
            const sources = previewSrc
                ? [previewSrc, ...s.sources.filter(u => u !== previewSrc)]
                : s.sources;

            setTimeout(() => {
                let i2 = 0;
                const next = () => {
                    while (i2 < sources.length && !sources[i2]) i2++;
                    if (i2 >= sources.length) { if (sk) sk.style.display = 'none'; return; }
                    const src = sources[i2++];
                    mainImg.onerror = next;
                    mainImg.onload = () => { if (sk) sk.style.display = 'none'; mainImg.style.opacity = '1'; };
                    mainImg.src = src;
                };
                next();
            }, 80);
        }

        const counter = document.getElementById('ss-counter');
        const styleNameEl = document.getElementById('ss-style-name');
        const eventNameEl = document.getElementById('ss-event-name');
        if (counter) counter.textContent = `${idx + 1} / ${slides.length}`;
        if (styleNameEl) styleNameEl.textContent = s._title || s.style;
        if (eventNameEl) {
            if (s._date) {
                eventNameEl.textContent = `${s._date}${s.style && s._title ? ' · ' + s.style : ''}`;
            } else {
                const ev = window.cloudmailLatestEvents?.items?.find(i => i.id === s.eventId);
                eventNameEl.textContent = ev?.summary || '';
            }
        }

        const tagEl = document.getElementById('ss-styletag');
        if (tagEl) {
            const color = this._SS_GROUP_COLORS[s.group] || '#555';
            tagEl.innerHTML = `
                <span onclick="App._ssFilterByStyle('${this._ssEsc(s.filterVal)}')"
                      title="Filter calendar by this style"
                      style="cursor:pointer;display:inline-flex;align-items:center;gap:5px;
                             padding:2px 10px;border-radius:10px;font-size:10px;font-weight:600;
                             letter-spacing:0.35px;background:${color}22;color:${color};
                             border:1px solid ${color}44;transition:background .15s;"
                      onmouseenter="this.style.background='${color}44'"
                      onmouseleave="this.style.background='${color}22'">
                    <span style="opacity:0.65;">#${this._ssEsc(s.tag)}</span>
                    &nbsp;·&nbsp;
                    <strong style="font-weight:700;">${this._ssEsc(s.style)}</strong>
                    &nbsp;·&nbsp;
                    <span style="opacity:0.55;font-size:9px;">${this._ssEsc(s.group)}</span>
                    &nbsp;<i class="fas fa-filter" style="font-size:8px;opacity:0.45;"></i>
                </span>`;
        }

        const strip = document.getElementById('ss-strip');
        if (strip) {
            Array.from(strip.children).forEach((th, i) => {
                th.style.opacity = i === idx ? '1' : '0.35';
                th.style.borderColor = i === idx ? '#0078d4' : 'transparent';
            });
            strip.children[idx]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        }

        this._ssResetPbar();
        this._ssStopAudio();
        this._ssPlayCaption(s.style);

        if (this._ssAutoOn) {
            const select = document.getElementById('ss-voice-select');
            if (!select || select.value === '') this._ssStartTimer();
        }
    },

    _ssNav(dir) {
        this._ssStopTimer();
        this._ssStopAudio();
        this._ssGoto(this._ssCurrent + dir);
    },

    _ssToggleFullscreen() {
        const modal = document.getElementById('ss-art-modal');
        if (!modal) return;
        if (!document.fullscreenElement) {
            modal.requestFullscreen().catch(err => console.warn('[Slideshow] Fullscreen:', err.message));
        } else {
            document.exitFullscreen();
        }
    },

    // =========================================================================
    // Auto-play
    // =========================================================================
    _ssToggleAuto() {
        this._ssAutoOn = !this._ssAutoOn;
        const btn = document.getElementById('ss-auto-btn');
        if (!btn) return;
        if (this._ssAutoOn) {
            btn.style.background = '#0078d4';
            btn.style.borderColor = '#0078d4';
            btn.innerHTML = '<i class="fas fa-pause" style="font-size:10px;"></i> Pause';
            this._ssStartTimer();
        } else {
            btn.style.background = 'rgba(255,255,255,0.1)';
            btn.style.borderColor = 'rgba(255,255,255,0.25)';
            btn.innerHTML = '<i class="fas fa-random" style="font-size:10px;"></i> Auto Random';
            this._ssStopTimer();
            this._ssResetPbar(0);
        }
    },

    _ssSetSpeed(ms) {
        this._SS_INTERVAL = ms;
        if (this._ssAutoOn && !this._ssAudioPlaying) {
            this._ssStopTimer();
            this._ssStartTimer();
        }
    },

    _ssStartTimer(fromAudioEnd = false) {
        this._ssStopTimer();
        const audio = document.getElementById('ss-audio');
        if (!fromAudioEnd && audio && !audio.paused) return;

        const delay = fromAudioEnd ? 1200 : (this._SS_INTERVAL || 5000);
        const pbar = document.getElementById('ss-pbar');
        if (pbar) {
            pbar.style.transition = `width ${delay}ms linear`;
            pbar.style.width = '100%';
        }
        this._ssTimer = setTimeout(() => {
            const slides = this._ssSlides || [];
            if (!slides.length) return;
            let next;
            if (slides.length === 1) { next = 0; }
            else { do { next = Math.floor(Math.random() * slides.length); } while (next === this._ssCurrent); }
            this._ssGoto(next);
        }, delay);
    },

    _ssStopTimer() {
        if (this._ssTimer) { clearTimeout(this._ssTimer); this._ssTimer = null; }
    },

    _ssResetPbar(targetPct) {
        const pbar = document.getElementById('ss-pbar');
        if (!pbar) return;
        pbar.style.transition = 'none';
        pbar.style.width = (targetPct !== undefined ? targetPct : 0) + '%';
    },

    // =========================================================================
    // Public entry — from filter thumbnail grid
    // =========================================================================
    openArtStyleSlideshowFromFilter(initialSlugOrIndex = 0) {
        this._ssIsFolderSlideshow = false;
        this._ssViewMode = 'slideshow';
        const slides = this._ssCollectSlidesFromFilterGrid();
        if (!slides.length) { alert('No art style images found in the current filtered view.'); return; }
        let startIndex = 0;
        if (typeof initialSlugOrIndex === 'string') {
            const idx = slides.findIndex(s => s.tag === initialSlugOrIndex);
            if (idx !== -1) startIndex = idx;
        } else if (typeof initialSlugOrIndex === 'number') {
            startIndex = initialSlugOrIndex;
        }
        this._ssEnsureModal();
        
        const viewControls = document.getElementById('ss-view-controls');
        if (viewControls) viewControls.style.display = 'none';
        
        this._ssSetViewMode('slideshow');
        this._ssLoadSlides(slides, startIndex);
    },

    _ssCollectSlidesFromFilterGrid() {
        // Default implementation — overridden by art-style-explorer.html
        return [];
    },

    // =========================================================================
    // Close & filter
    // =========================================================================
    _ssToggleFolderTree() {
        const tree = document.getElementById('ss-folder-tree');
        if (tree) {
            if (tree.style.display === 'none') {
                tree.style.display = 'flex';
            } else {
                tree.style.display = 'none';
            }
        }
    },

    _ssUpdateZoom(val) {
        const view = document.getElementById('ss-explorer-view');
        if (view) {
            view.style.setProperty('--ss-grid-size', val + 'px');
        }
    },

    _ssClose() {
        this._ssStopTimer();
        this._ssStopAudio();
        this._ssAutoOn = false;
        const modal = document.getElementById('ss-art-modal');
        if (modal) modal.style.display = 'none';

        if (this._ssIsFolderSlideshow) {
            const currentHash = window.location.hash || '';
            if (currentHash.startsWith('#slideshow') || currentHash.startsWith('#slidedow')) {
                const prev = this._ssPreviousHash || '#calendar';
                this._ssBlockHashchange = true;
                window.location.hash = prev;
                setTimeout(() => {
                    this._ssBlockHashchange = false;
                }, 100);
            }
        }
    },

    _ssFilterByStyle(filterVal) {
        this._ssClose();
        if (typeof this._onArtStyleClick === 'function') {
            this._onArtStyleClick(filterVal);
        } else if (typeof this.applyTagFilters === 'function') {
            if (!this.state.calendar.videoTagsFilter) this.state.calendar.videoTagsFilter = {};
            this.state.calendar.videoTagsFilter.artStyle = filterVal;
            this.applyTagFilters();
        }
    },

    // =========================================================================
    // Manual & Cover actions from slideshow
    // =========================================================================
    _ssOpenManual() {
        const s = this._ssSlides?.[this._ssCurrent];
        if (!s) return;
        const imgEl = document.getElementById('ss-mainimg');
        const imgSrc = imgEl?.src || s.sources?.[0] || '';
        // Get the event title (character name) from the event data, not the style name
        const ev = window.cloudmailLatestEvents?.items?.find(i => i.id === s.eventId);
        const eventTitle = ev?.summary || s.style || '';
        const eventId = s.eventId || '';
        // Close slideshow first so the manual modal is visible (z-index conflict)
        this._ssClose();
        if (typeof App.openManualGenModal === 'function') {
            App.openManualGenModal(eventId, eventTitle, imgSrc);
        }
    },

    async _ssSetCover(btnEl) {
        const s = this._ssSlides?.[this._ssCurrent];
        if (!s) return;
        const imgEl = document.getElementById('ss-mainimg');
        const imgSrc = imgEl?.src || s.sources?.[0] || '';
        let eventId = s.eventId || '';

        if (!eventId || eventId === 'folder_slideshow') {
            let targetDateStr = '';
            const dirMatch = (this._ssCurrentDir || '').match(/(\d{4}-\d{2}-\d{2})/);
            if (dirMatch) {
                targetDateStr = dirMatch[1];
            } else if (typeof App !== 'undefined' && App.state?.calendar?.currentDate) {
                const d = App.state.calendar.currentDate;
                const y = d.getFullYear();
                const m = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                targetDateStr = `${y}-${m}-${day}`;
            }

            if (targetDateStr) {
                const events = window.cloudmailLatestEvents?.items || [];
                const ev = events.find(e => {
                    const eDate = e.start?.date || (e.start?.dateTime || '').substring(0, 10);
                    return eDate === targetDateStr;
                });
                if (ev) {
                    eventId = ev.id;
                }
            }
        }

        if (!imgSrc || !eventId || eventId === 'folder_slideshow') {
            alert('Missing image URL or could not determine current day event ID.');
            return;
        }

        const setCoverFn = typeof App !== 'undefined' && App._setAsCoverImage ? App._setAsCoverImage : this._setAsCoverImage;
        if (typeof setCoverFn === 'function') {
            await setCoverFn.call(this, imgSrc, eventId, btnEl);
        }
    },

    // =========================================================================
    // Utility
    // =========================================================================
    _ssEsc(str) {
        return String(str ?? '')
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    },

    _ssSetViewMode(mode) {
        this._ssViewMode = mode;
        const slideshowTitle = document.getElementById('ss-slideshow-title');
        const voiceRow = document.getElementById('ss-voice-row');
        const explorerToolbar = document.getElementById('ss-explorer-toolbar');
        const bottomBar = document.getElementById('ss-bottombar');
        const explorerContainer = document.getElementById('ss-explorer-container');
        const explorerView = document.getElementById('ss-explorer-view');
        const mainImg = document.getElementById('ss-mainimg');
        const refImg = document.getElementById('ss-refimg');
        const navLeft = document.getElementById('ss-nav-left');
        const navRight = document.getElementById('ss-nav-right');
        const caption = document.getElementById('ss-caption');
        const skeleton = document.getElementById('ss-skeleton');
        const playBtn = document.getElementById('ss-view-slideshow-btn');
        const gridBtn = document.getElementById('ss-view-grid-btn');
        const listBtn = document.getElementById('ss-view-list-btn');

        if (playBtn) {
            playBtn.style.background = mode === 'slideshow' ? 'rgba(0,120,212,0.55)' : 'rgba(255,255,255,0.1)';
            playBtn.style.borderColor = mode === 'slideshow' ? '#0078d4' : 'rgba(255,255,255,0.25)';
        }
        if (gridBtn) {
            gridBtn.style.background = mode === 'grid' ? 'rgba(0,120,212,0.55)' : 'rgba(255,255,255,0.1)';
            gridBtn.style.borderColor = mode === 'grid' ? '#0078d4' : 'rgba(255,255,255,0.25)';
        }
        if (listBtn) {
            listBtn.style.background = mode === 'list' ? 'rgba(0,120,212,0.55)' : 'rgba(255,255,255,0.1)';
            listBtn.style.borderColor = mode === 'list' ? '#0078d4' : 'rgba(255,255,255,0.25)';
        }

        if (mode === 'slideshow') {
            this._ssStopAudio();
            if (slideshowTitle) slideshowTitle.style.display = 'flex';
            if (voiceRow) voiceRow.style.display = 'flex';
            if (bottomBar) bottomBar.style.display = 'block';
            if (mainImg) mainImg.style.opacity = '1';
            if (navLeft) navLeft.style.display = 'flex';
            if (navRight) navRight.style.display = 'flex';
            if (explorerToolbar) explorerToolbar.style.display = 'none';
            if (explorerContainer) explorerContainer.style.display = 'none';
            if (this._ssSlides && this._ssSlides.length > 0) {
                this._ssGoto(0);
            }
        } else {
            this._ssStopAudio();
            this._ssStopTimer();
            if (slideshowTitle) slideshowTitle.style.display = 'none';
            if (voiceRow) voiceRow.style.display = 'none';
            if (bottomBar) bottomBar.style.display = 'none';
            if (mainImg) { mainImg.style.opacity = '0'; mainImg.src = ''; }
            if (refImg) { refImg.style.opacity = '0'; refImg.src = ''; }
            if (navLeft) navLeft.style.display = 'none';
            if (navRight) navRight.style.display = 'none';
            if (caption) caption.style.display = 'none';
            if (skeleton) skeleton.style.display = 'none';
            if (explorerToolbar) explorerToolbar.style.display = 'inline-flex';
            if (explorerContainer) explorerContainer.style.display = 'flex';
            this._ssLoadDirectory(this._ssCurrentDir || '');
            if (typeof this._ssLoadFolderTree === 'function') this._ssLoadFolderTree();
        }
    },

    async _ssLoadDirectory(dir = '', search = '') {
        try {
            this._ssCurrentDir = dir;
            const serverUrl = this._getServerUrl ? this._getServerUrl() : (App._getServerUrl ? App._getServerUrl() : '');
            let url = `${serverUrl}/api/slideshow-images?dir=${encodeURIComponent(dir)}`;
            if (search) {
                url += `&search=${encodeURIComponent(search)}`;
            }
            const res = await fetch(url);
            if (!res.ok) throw new Error('Failed to fetch slideshow images');
            const data = await res.json();
            
            this._ssCurrentDirImages = data.images || [];
            this._ssCurrentDirFolders = data.folders || [];
            
            this._ssSlides = this._ssCurrentDirImages.map(img => {
                const filename = img.split('/').pop();
                const styleName = filename.replace(/\.[^/.]+$/, "").replace(/^cover_|^grid_|slide_/, "").replace(/[-_]/g, " ");
                return {
                    eventId: 'folder_slideshow',
                    style: styleName || 'Saved Image',
                    group: 'Folder Slideshow',
                    tag: '',
                    filterVal: '',
                    sources: [img]
                };
            });

            const breadcrumbsEl = document.getElementById('ss-breadcrumbs');
            if (breadcrumbsEl) {
                breadcrumbsEl.innerHTML = '📁 ' + (dir ? 'Home / ' + dir.replace(/\//g, ' / ') : 'Home');
            }

            const upBtn = document.getElementById('ss-btn-up');
            if (upBtn) {
                upBtn.style.display = dir ? 'inline-flex' : 'none';
            }

            this._ssRenderExplorerContent();
            this._ssUpdateHash();
            if (typeof this._ssHighlightTreeNode === 'function') {
                this._ssHighlightTreeNode(this._ssCurrentDir || '');
            }
        } catch (e) {
            console.error('Error loading directory:', e);
            alert('Failed to load directory: ' + e.message);
        }
    },

    async _ssLoadFolderTree() {
        try {
            const serverUrl = this._getServerUrl ? this._getServerUrl() : (App._getServerUrl ? App._getServerUrl() : '');
            const res = await fetch(`${serverUrl}/api/slideshow-tree`);
            if (!res.ok) throw new Error('Failed to fetch slideshow tree');
            const tree = await res.json();
            
            const treeContainer = document.getElementById('ss-folder-tree');
            if (treeContainer) {
                treeContainer.innerHTML = '';
                this._ssRenderFolderTree(tree, treeContainer);
                this._ssHighlightTreeNode(this._ssCurrentDir || '');
            }
        } catch (e) {
            console.error('Error loading folder tree:', e);
        }
    },

    _ssRenderFolderTree(node, container) {
        const itemEl = document.createElement('div');
        
        const nodeEl = document.createElement('div');
        nodeEl.className = 'ss-tree-node';
        nodeEl.dataset.path = node.path;
        
        const hasChildren = node.children && node.children.length > 0;
        
        const toggleEl = document.createElement('i');
        toggleEl.className = 'fas fa-caret-right ss-tree-toggle';
        if (!hasChildren) toggleEl.style.visibility = 'hidden';
        
        // Expand root by default
        let isExpanded = node.path === '';
        if (isExpanded && hasChildren) toggleEl.classList.add('expanded');
        
        const iconEl = document.createElement('i');
        iconEl.className = 'fas fa-folder ss-tree-icon';
        
        const nameEl = document.createElement('span');
        nameEl.textContent = node.name;
        
        nodeEl.appendChild(toggleEl);
        nodeEl.appendChild(iconEl);
        nodeEl.appendChild(nameEl);
        
        itemEl.appendChild(nodeEl);
        
        const childrenContainer = document.createElement('div');
        childrenContainer.className = 'ss-tree-children';
        if (isExpanded) childrenContainer.classList.add('expanded');
        
        if (hasChildren) {
            node.children.forEach(child => {
                this._ssRenderFolderTree(child, childrenContainer);
            });
            itemEl.appendChild(childrenContainer);
        }
        
        // Click to toggle
        toggleEl.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!hasChildren) return;
            isExpanded = !isExpanded;
            if (isExpanded) {
                toggleEl.classList.add('expanded');
                childrenContainer.classList.add('expanded');
            } else {
                toggleEl.classList.remove('expanded');
                childrenContainer.classList.remove('expanded');
            }
        });
        
        // Click to load directory
        nodeEl.addEventListener('click', () => {
            if (hasChildren && !isExpanded) {
                isExpanded = true;
                toggleEl.classList.add('expanded');
                childrenContainer.classList.add('expanded');
            }
            this._ssLoadDirectory(node.path);
        });
        
        container.appendChild(itemEl);
    },

    _ssHighlightTreeNode(path) {
        const treeContainer = document.getElementById('ss-folder-tree');
        if (!treeContainer) return;
        
        // Remove existing selection
        const selected = treeContainer.querySelectorAll('.ss-tree-node.selected');
        selected.forEach(el => el.classList.remove('selected'));
        
        // Add new selection
        const nodeToSelect = treeContainer.querySelector(`.ss-tree-node[data-path="${CSS.escape(path)}"]`);
        if (nodeToSelect) {
            nodeToSelect.classList.add('selected');
            
            // Expand parents
            let parent = nodeToSelect.parentElement;
            while (parent && parent.id !== 'ss-folder-tree') {
                if (parent.classList.contains('ss-tree-children')) {
                    parent.classList.add('expanded');
                    const toggle = parent.previousElementSibling.querySelector('.ss-tree-toggle');
                    if (toggle) toggle.classList.add('expanded');
                }
                parent = parent.parentElement;
            }
        }
    },

    openFolderSlideshowAt(dir) {
        this._ssIsFolderSlideshow = true;
        this._ssEnsureModal();
        
        const modal = document.getElementById('ss-art-modal');
        if (modal) modal.style.display = 'flex';
        
        const viewControls = document.getElementById('ss-view-controls');
        if (viewControls) viewControls.style.display = 'inline-flex';
        
        this._ssCurrentDir = dir || '';
        this._ssViewMode = 'grid';
        this._ssSetViewMode('grid');
    },

    _ssUpdateHash() {
        if (!this._ssIsFolderSlideshow) return;
        const currentHash = window.location.hash || '';
        if (currentHash && !currentHash.startsWith('#slideshow') && !currentHash.startsWith('#slidedow')) {
            this._ssPreviousHash = currentHash;
        }

        let newHash = '#slideshow';
        if (this._ssCurrentDir) {
            newHash += '/' + this._ssCurrentDir;
        }

        if (window.location.hash !== newHash) {
            this._ssBlockHashchange = true;
            window.location.hash = newHash;
            setTimeout(() => {
                this._ssBlockHashchange = false;
            }, 100);
        }
    },

    _ssRenderExplorerContent() {
        const view = document.getElementById('ss-explorer-view');
        if (!view) return;
        
        view.innerHTML = '';
        if (!this._ssSelectedItems) this._ssSelectedItems = new Set();
        
        if (this._ssViewMode === 'grid') {
            view.className = 'ss-explorer-grid';
        } else {
            view.className = 'ss-explorer-list';
        }
        
        const folders = this._ssCurrentDirFolders || [];
        folders.forEach(f => {
            const folderPath = this._ssCurrentDir ? this._ssCurrentDir + '/' + f : f;
            if (this._ssViewMode === 'grid') {
                const el = document.createElement('div');
                el.className = 'ss-explorer-item';
                el.style.order = '2';
                el.dataset.type = 'folder';
                el.dataset.path = folderPath;
                el.innerHTML = `
                    <div class="ss-explorer-item-icon"><i class="fas fa-folder" style="color:#eab308;"></i></div>
                    <div class="ss-explorer-item-name">${this._ssEsc(f)}</div>
                `;
                this._ssAttachExplorerItemEvents(el, folderPath, true);
                view.appendChild(el);
            } else {
                const el = document.createElement('div');
                el.className = 'ss-explorer-list-item';
                el.dataset.type = 'folder';
                el.dataset.path = folderPath;
                el.innerHTML = `
                    <div class="ss-explorer-list-icon"><i class="fas fa-folder" style="color:#eab308;"></i></div>
                    <div class="ss-explorer-list-name">${this._ssEsc(f)}</div>
                `;
                this._ssAttachExplorerItemEvents(el, folderPath, true);
                view.appendChild(el);
            }
        });
        
        const images = this._ssCurrentDirImages || [];
        images.forEach(img => {
            const filename = img.split('/').pop();
            const isSelected = this._ssSelectedItems.has(img);
            if (this._ssViewMode === 'grid') {
                const el = document.createElement('div');
                el.className = 'ss-explorer-item' + (isSelected ? ' selected' : '');
                el.style.order = '1';
                el.dataset.type = 'image';
                el.dataset.path = img;
                el.innerHTML = `
                    <img class="ss-explorer-item-thumb" src="${img}" alt="" />
                    <div class="ss-explorer-item-name">${this._ssEsc(filename)}</div>
                `;
                this._ssAttachExplorerItemEvents(el, img, false);
                view.appendChild(el);
            } else {
                const el = document.createElement('div');
                el.className = 'ss-explorer-list-item' + (isSelected ? ' selected' : '');
                el.dataset.type = 'image';
                el.dataset.path = img;
                el.innerHTML = `
                    <img class="ss-explorer-list-thumb" src="${img}" alt="" />
                    <div class="ss-explorer-list-name">${this._ssEsc(filename)}</div>
                `;
                this._ssAttachExplorerItemEvents(el, img, false);
                view.appendChild(el);
            }
        });
        
        this._ssUpdateMoveButtonState();
    },

    _ssAttachExplorerItemEvents(el, path, isFolder) {
        if (!isFolder) {
            el.draggable = true;
            el.addEventListener('dragstart', (e) => {
                let pathsToMove = [path];
                if (this._ssSelectedItems && this._ssSelectedItems.has(path)) {
                    pathsToMove = Array.from(this._ssSelectedItems);
                }
                e.dataTransfer.setData('application/json', JSON.stringify({ sourcePaths: pathsToMove }));
                e.dataTransfer.effectAllowed = 'move';
                el.style.opacity = '0.5';
            });
            el.addEventListener('dragend', (e) => {
                el.style.opacity = '';
            });
        } else {
            el.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
            });
            el.addEventListener('dragenter', (e) => {
                e.preventDefault();
                el.style.outline = '2px dashed #3b82f6';
                el.style.background = 'rgba(59,130,246,0.1)';
            });
            el.addEventListener('dragleave', (e) => {
                e.preventDefault();
                el.style.outline = '';
                el.style.background = '';
            });
            el.addEventListener('drop', async (e) => {
                e.preventDefault();
                el.style.outline = '';
                el.style.background = '';
                try {
                    const dataStr = e.dataTransfer.getData('application/json');
                    if (!dataStr) return;
                    const data = JSON.parse(dataStr);
                    if (data && data.sourcePaths && data.sourcePaths.length > 0) {
                        await this._ssMoveItemsToFolder(data.sourcePaths, path);
                    }
                } catch (err) {
                    console.error('Drop error:', err);
                }
            });
        }

        el.addEventListener('dblclick', (e) => {
            e.preventDefault();
            if (isFolder) {
                this._ssLoadDirectory(path);
            } else {
                const idx = this._ssCurrentDirImages.indexOf(path);
                if (idx !== -1) {
                    this._ssViewMode = 'slideshow';
                    this._ssSetViewMode('slideshow');
                    this._ssGoto(idx);
                }
            }
        });
        
        el.addEventListener('click', (e) => {
            e.preventDefault();
            const childElements = Array.from(el.parentElement.children);
            const paths = childElements.map(child => child.dataset.path);

            if (e.shiftKey && this._ssLastClickedPath && this._ssLastClickedPath !== path) {
                const lastIdx = paths.indexOf(this._ssLastClickedPath);
                const currentIdx = paths.indexOf(path);
                
                if (lastIdx !== -1 && currentIdx !== -1) {
                    const start = Math.min(lastIdx, currentIdx);
                    const end = Math.max(lastIdx, currentIdx);
                    
                    if (!e.ctrlKey && !e.metaKey) {
                        this._ssSelectedItems.clear();
                        childElements.forEach(child => child.classList.remove('selected'));
                    }
                    
                    for (let i = start; i <= end; i++) {
                        const childPath = paths[i];
                        this._ssSelectedItems.add(childPath);
                        childElements[i].classList.add('selected');
                    }
                }
            } else if (e.ctrlKey || e.metaKey) {
                if (this._ssSelectedItems.has(path)) {
                    this._ssSelectedItems.delete(path);
                    el.classList.remove('selected');
                } else {
                    this._ssSelectedItems.add(path);
                    el.classList.add('selected');
                }
                this._ssLastClickedPath = path;
            } else {
                childElements.forEach(child => child.classList.remove('selected'));
                this._ssSelectedItems.clear();
                this._ssSelectedItems.add(path);
                el.classList.add('selected');
                this._ssLastClickedPath = path;
                
                if (!isFolder) {
                    const idx = this._ssCurrentDirImages.indexOf(path);
                    if (idx !== -1) {
                        this._ssViewMode = 'slideshow';
                        this._ssSetViewMode('slideshow');
                        this._ssGoto(idx);
                    }
                }
            }
            this._ssUpdateMoveButtonState();
        });
        
        el.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            if (!this._ssSelectedItems.has(path)) {
                if (!e.ctrlKey && !e.metaKey) {
                    const items = el.parentElement.children;
                    for (const item of items) {
                        item.classList.remove('selected');
                    }
                    this._ssSelectedItems.clear();
                }
                this._ssSelectedItems.add(path);
                el.classList.add('selected');
                this._ssUpdateMoveButtonState();
            }
            
            const menu = document.getElementById('ss-context-menu');
            if (menu) {
                const renameBtn = document.getElementById('ss-context-menu-rename');
                if (renameBtn) {
                    renameBtn.style.display = this._ssSelectedItems.size === 1 && !isFolder ? 'flex' : 'none';
                }
                menu.style.display = 'block';
                menu.style.left = e.pageX + 'px';
                menu.style.top = e.pageY + 'px';
            }
        });
    },

    async _ssMoveItemsToFolder(sourcePaths, targetFolder) {
        try {
            const serverUrl = typeof this._getServerUrl === 'function' ? this._getServerUrl() : '';
            const res = await fetch(`${serverUrl}/api/slideshow/move`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ files: sourcePaths, target: targetFolder })
            });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || `HTTP ${res.status}`);
            }
            
            // Success toast
            const toast = document.createElement('div');
            toast.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#10b981;color:#fff;padding:8px 20px;border-radius:6px;font-size:13px;font-weight:600;z-index:10001;box-shadow:0 4px 12px rgba(0,0,0,0.2);animation:ssFadeInOut 2.5s ease forwards;';
            toast.innerHTML = `<i class="fas fa-check-circle"></i> Moved ${sourcePaths.length} item(s)`;
            if (!document.getElementById('ss-toast-style')) {
                const styleEl = document.createElement('style');
                styleEl.id = 'ss-toast-style';
                styleEl.textContent = '@keyframes ssFadeInOut { 0% { opacity:0;transform:translateX(-50%) translateY(10px); } 15% { opacity:1;transform:translateX(-50%) translateY(0); } 80% { opacity:1; } 100% { opacity:0; } }';
                document.head.appendChild(styleEl);
            }
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 2600);

            if (this._ssSelectedItems) this._ssSelectedItems.clear();
            this._ssLoadDirectory(this._ssCurrentDir);
        } catch (e) {
            alert('Move failed: ' + e.message);
        }
    },

    _ssNavigateUp() {
        if (!this._ssCurrentDir) return;
        const parts = this._ssCurrentDir.split('/');
        parts.pop();
        this._ssLoadDirectory(parts.join('/'));
    },

    _ssUpdateMoveButtonState() {
        const btnMove = document.getElementById('ss-btn-move');
        const btnCopy = document.getElementById('ss-btn-copy');
        const hasSelection = this._ssSelectedItems && this._ssSelectedItems.size > 0;
        if (btnMove) btnMove.style.display = hasSelection ? 'inline-flex' : 'none';
        if (btnCopy) btnCopy.style.display = hasSelection ? 'inline-flex' : 'none';
    },

    _ssFilterExplorer(val) {
        if (this._ssSearchTimeout) clearTimeout(this._ssSearchTimeout);
        this._ssSearchTimeout = setTimeout(() => {
            const query = (val || '').trim();
            this._ssLoadDirectory(this._ssCurrentDir || '', query);
        }, 400);
    },

        _ssShowMoveDialog() {
        return new Promise(async (resolve) => {
            const existing = document.getElementById('ss-move-modal');
            if (existing) existing.remove();

            const modal = document.createElement('div');
            modal.id = 'ss-move-modal';
            modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:9999999;display:flex;align-items:center;justify-content:center;';
            
            const box = document.createElement('div');
            box.style.cssText = 'background:#1a1a2e;border:1px solid rgba(255,255,255,0.2);border-radius:8px;padding:20px;width:400px;max-width:90vw;display:flex;flex-direction:column;gap:15px;color:#fff;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,0.5);';

            box.innerHTML = `
                <h3 style="margin:0;font-size:16px;">Move Selected Items</h3>
                <div style="font-size:12px;color:#aaa;">Select a destination folder or create a new one.</div>
                
                <div id="ss-move-tree-container" style="background:rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.1);border-radius:4px;height:250px;overflow-y:auto;padding:10px;user-select:none;">
                    <div style="text-align:center;color:#666;margin-top:20px;"><i class="fas fa-spinner fa-spin"></i> Loading...</div>
                </div>

                <div style="display:flex;gap:10px;align-items:center;">
                    <span style="font-size:12px;white-space:nowrap;">New Subfolder:</span>
                    <input type="text" id="ss-move-new-input" placeholder="Optional folder name..." style="flex:1;background:rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.2);color:#fff;padding:6px 10px;border-radius:4px;font-size:12px;outline:none;" />
                </div>

                <div style="font-size:11px;color:#0ea5e9;">Target Path: <span id="ss-move-target-preview" style="font-weight:bold;color:#38bdf8;">/</span></div>

                <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:5px;">
                    <button id="ss-move-cancel" style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);color:#fff;padding:6px 16px;border-radius:4px;cursor:pointer;font-size:12px;transition:background .15s;">Cancel</button>
                    <button id="ss-move-confirm" style="background:#0ea5e9;border:1px solid #0284c7;color:#fff;padding:6px 16px;border-radius:4px;cursor:pointer;font-size:12px;font-weight:bold;transition:background .15s;">Move Here</button>
                </div>
            `;
            
            modal.appendChild(box);
            document.body.appendChild(modal);

            let selectedBasePath = this._ssCurrentDir || '';

            const updatePreview = () => {
                const newFolder = document.getElementById('ss-move-new-input').value.trim();
                let finalPath = selectedBasePath;
                if (newFolder) {
                    finalPath = finalPath ? finalPath + '/' + newFolder : newFolder;
                }
                const p = document.getElementById('ss-move-target-preview');
                if (p) p.textContent = finalPath ? '/' + finalPath : 'Root Directory (/)';
            };

            document.getElementById('ss-move-new-input').addEventListener('input', updatePreview);

            const cleanup = () => modal.remove();
            
            document.getElementById('ss-move-cancel').onclick = () => { cleanup(); resolve(null); };
            
            document.getElementById('ss-move-confirm').onclick = () => {
                const newFolder = document.getElementById('ss-move-new-input').value.trim();
                let finalPath = selectedBasePath;
                if (newFolder) {
                    finalPath = finalPath ? finalPath + '/' + newFolder : newFolder;
                }
                cleanup();
                resolve(finalPath);
            };

            // Fetch tree
            try {
                const serverUrl = this._getServerUrl ? this._getServerUrl() : (App._getServerUrl ? App._getServerUrl() : '');
                const res = await fetch(`${serverUrl}/api/slideshow-tree`);
                if (!res.ok) throw new Error('Fetch failed');
                const tree = await res.json();
                
                const container = document.getElementById('ss-move-tree-container');
                if (!container) return;
                container.innerHTML = '';
                
                const renderNode = (node, parentEl, depth, isLast = false) => {
                    const row = document.createElement('div');
                    row.className = 'move-tree-row';
                    row.dataset.path = node.path || '';
                    row.style.cssText = `display:flex;align-items:center;gap:6px;padding:4px 6px;cursor:pointer;border-radius:4px;font-size:12px;color:rgba(255,255,255,0.85);margin-left:${depth * 14}px;margin-bottom:2px;`;
                    
                    if (node.path === selectedBasePath) {
                        row.style.background = 'rgba(0, 120, 212, 0.4)';
                    }
                    
                    const hasChildren = node.children && node.children.length > 0;
                    
                    let toggleHtml = `<span style="width:12px;display:inline-block;text-align:center;color:rgba(255,255,255,0.3);font-size:10px;">${hasChildren ? '<i class="fas fa-caret-down"></i>' : ''}</span>`;
                    
                    row.innerHTML = `${toggleHtml}<i class="fas fa-folder" style="color:#eab308;"></i> <span>${node.name || 'Root'}</span>`;

                    row.onclick = (e) => {
                        e.stopPropagation();
                        selectedBasePath = node.path || '';
                        container.querySelectorAll('.move-tree-row').forEach(r => r.style.background = 'transparent');
                        row.style.background = 'rgba(0, 120, 212, 0.4)';
                        updatePreview();
                    };
                    parentEl.appendChild(row);

                    if (hasChildren) {
                        node.children.forEach((c, idx) => {
                            renderNode(c, parentEl, depth + 1, idx === node.children.length - 1);
                        });
                    }
                };

                renderNode(tree, container, 0);
                updatePreview();
                
                // Scroll selected into view
                const selectedEl = container.querySelector(`.move-tree-row[data-path="${CSS.escape(selectedBasePath)}"]`);
                if (selectedEl) selectedEl.scrollIntoView({ block: 'center' });

            } catch (e) {
                console.warn('Could not fetch tree for move dialog', e);
                const container = document.getElementById('ss-move-tree-container');
                if (container) container.innerHTML = '<div style="color:#f87171;padding:10px;">Failed to load folder tree. You can still type a path below.</div>';
            }
        });
    },

    async _ssMoveSelected() {
        if (!this._ssSelectedItems || this._ssSelectedItems.size === 0) return;
        
        try {
            const targetFolder = await this._ssShowMoveDialog();
            if (targetFolder === null) return; // User cancelled
            
            const serverUrl = this._getServerUrl ? this._getServerUrl() : (App._getServerUrl ? App._getServerUrl() : '');
            const res = await fetch(`${serverUrl}/api/slideshow/move`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    files: Array.from(this._ssSelectedItems),
                    target: targetFolder
                })
            });
            
            if (!res.ok) throw new Error('Failed to move files');
            const data = await res.json();
            
            if (data.success) {
                this._ssSelectedItems.clear();
                this._ssLoadDirectory(this._ssCurrentDir || '');
                if (typeof this._ssLoadFolderTree === 'function') this._ssLoadFolderTree();
            } else {
                throw new Error(data.error || 'Unknown error');
            }
        } catch (e) {
            console.error('Error moving files:', e);
            alert('Failed to move files: ' + e.message);
        }
    },

    async _ssRenameSelected() {
        if (!this._ssSelectedItems || this._ssSelectedItems.size !== 1) {
            alert('Please select exactly one file to rename.');
            return;
        }
        
        const fileUrl = Array.from(this._ssSelectedItems)[0];
        const oldName = fileUrl.split('/').pop();
        
        const newName = prompt('Enter new filename:', oldName);
        if (!newName || newName === oldName) return;
        
        try {
            const serverUrl = this._getServerUrl ? this._getServerUrl() : (App._getServerUrl ? App._getServerUrl() : '');
            const res = await fetch(`${serverUrl}/api/slideshow/rename`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    file: fileUrl,
                    newName: newName
                })
            });
            
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(data.error || `HTTP ${res.status}`);
            }
            
            // Success toast
            const toast = document.createElement('div');
            toast.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#10b981;color:#fff;padding:8px 20px;border-radius:6px;font-size:13px;font-weight:600;z-index:10001;box-shadow:0 4px 12px rgba(0,0,0,0.2);animation:ssFadeInOut 2.5s ease forwards;';
            toast.innerHTML = `<i class="fas fa-check-circle"></i> Renamed successfully`;
            if (!document.getElementById('ss-toast-style')) {
                const styleEl = document.createElement('style');
                styleEl.id = 'ss-toast-style';
                styleEl.textContent = '@keyframes ssFadeInOut { 0% { opacity:0;transform:translateX(-50%) translateY(10px); } 15% { opacity:1;transform:translateX(-50%) translateY(0); } 80% { opacity:1; } 100% { opacity:0; } }';
                document.head.appendChild(styleEl);
            }
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 2600);

            this._ssSelectedItems.clear();
            this._ssLoadDirectory(this._ssCurrentDir || '');
        } catch (e) {
            alert('Rename failed: ' + e.message);
        }
    },

    async _ssCopySelected() {
        if (!this._ssSelectedItems || this._ssSelectedItems.size === 0) return;
        
        try {
            const targetFolder = await this._ssShowMoveDialog();
            if (targetFolder === null) return; // User cancelled
            
            const serverUrl = this._getServerUrl ? this._getServerUrl() : (App._getServerUrl ? App._getServerUrl() : '');
            const res = await fetch(`${serverUrl}/api/slideshow/copy`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    files: Array.from(this._ssSelectedItems),
                    target: targetFolder
                })
            });
            
            if (!res.ok) throw new Error('Failed to copy files');
            const data = await res.json();
            
            if (data.success) {
                this._ssSelectedItems.clear();
                this._ssLoadDirectory(this._ssCurrentDir || '');
                if (typeof this._ssLoadFolderTree === 'function') this._ssLoadFolderTree();
            } else {
                throw new Error(data.error || 'Unknown error');
            }
        } catch (e) {
            console.error('Error copying files:', e);
            alert('Failed to copy files: ' + e.message);
        }
    },
};
