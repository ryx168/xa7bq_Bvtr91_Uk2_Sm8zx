/**
 * playlist.js — Playlist management and playback methods
 * Extracted from calendar.js for modularity.
 *
 * Usage in app.js:
 *   import { PlaylistMixin } from './playlist.js';
 *   Object.assign(App, PlaylistMixin);
 *
 * Dependencies:
 *   - App.state.playlists        {Array}
 *   - App.state.activePlaylist   {Object|null}
 *   - App.state.activePlaylistId {string|null}
 *   - App.state.currentPlaylistIndex {number}
 *   - App.state.playlistHlsInstance  {Hls|null}
 *   - App.escape()               — HTML-escape helper
 *   - App.getDateCoverImage()    — from calendar.js
 *   - App.getDirectDriveUrl()    — from calendar.js
 *   - App.getHostnameForDate()   — from calendar.js
 *   - window.cloudmailLatestEvents
 *   - HLS.js loaded globally
 *   - Bootstrap's $('#modal-*').modal()
 */

export const PlaylistMixin = {

    // ─── Persistence ─────────────────────────────────────────────────────────

    async loadPlaylists() {
        try {
            const res = await fetch('/api/playlists?t=' + Date.now());
            if (res.ok) {
                const text = await res.text();
                if (text.trim().startsWith('<')) throw new Error('Playlists API returned HTML');
                this.state.playlists = JSON.parse(text);
                if (!Array.isArray(this.state.playlists)) this.state.playlists = [];
                localStorage.setItem('cloudmail_playlists', JSON.stringify(this.state.playlists));
                return;
            }
        } catch (e) {
            console.warn('Failed to fetch playlists from API, falling back to localStorage', e);
        }
        try {
            const data = localStorage.getItem('cloudmail_playlists');
            this.state.playlists = data ? JSON.parse(data) : [];
        } catch (e) {
            this.state.playlists = [];
        }
    },

    async savePlaylists() {
        localStorage.setItem('cloudmail_playlists', JSON.stringify(this.state.playlists));
        try {
            await fetch('/api/playlists', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(this.state.playlists)
            });
        } catch (e) {
            console.error('Failed to sync playlists to server', e);
        }
    },

    // ─── Save to Playlist (from calendar preview) ─────────────────────────────

    saveToPlaylist() {
        if (!this.state.calendar.previewEmailId) { alert('No video selected.'); return; }
        const select = document.getElementById('playlist-select');
        select.innerHTML = '<option value="">-- Choose Playlist --</option>';
        this.state.playlists.forEach(pl => {
            select.innerHTML += `<option value="${this.escape(pl.id)}">${this.escape(pl.name)}</option>`;
        });
        document.getElementById('playlist-new-name').value = '';
        $('#modal-save-to-playlist').modal('show');
    },

    confirmSaveToPlaylist() {
        const selectVal = document.getElementById('playlist-select').value;
        const newName = document.getElementById('playlist-new-name').value.trim();
        const eventId = this.state.calendar.previewEmailId;
        if (!eventId) return;

        let targetPlaylist = null;
        if (newName) {
            targetPlaylist = { id: 'pl_' + Date.now(), name: newName, items: [] };
            this.state.playlists.push(targetPlaylist);
        } else if (selectVal) {
            targetPlaylist = this.state.playlists.find(p => p.id === selectVal);
        }

        if (!targetPlaylist) { alert('Please select or create a playlist.'); return; }

        if (!targetPlaylist.items.includes(eventId)) {
            targetPlaylist.items.push(eventId);
            this.savePlaylists();
        }

        $('#modal-save-to-playlist').modal('hide');
        this.showToast?.('Saved to Playlist successfully.', 'success');

        const plBtn = document.getElementById('btn-save-playlist');
        if (plBtn) {
            plBtn.innerHTML = '<i class="fas fa-check"></i> Saved';
            plBtn.classList.remove('btn-outline-primary');
            plBtn.classList.add('btn-success');
            setTimeout(() => {
                plBtn.innerHTML = '<i class="fas fa-list-ul"></i> Save to Playlist';
                plBtn.classList.add('btn-outline-primary');
                plBtn.classList.remove('btn-success');
            }, 3000);
        }
    },

    // ─── Playlist Manager Modal ───────────────────────────────────────────────

    openPlaylistsModal() {
        this.renderPlaylistsList();
        document.getElementById('playlist-items-container').innerHTML =
            '<div style="color: #999; text-align: center; margin-top: 50px;">Select a playlist from the left to manage its videos.</div>';
        document.getElementById('playlist-items-title').textContent = 'Select a Playlist';

        ['playlist-header-image', 'playlist-header-meta'].forEach(id => {
            const el = document.getElementById(id);
            if (el) { el.style.display = 'none'; el.textContent = ''; }
        });
        ['btn-play-all', 'btn-shuffle-all'].forEach(id => {
            const el = document.getElementById(id);
            if (el) { el.classList.add('playlist-btn-hidden'); el.classList.remove('playlist-btn-visible'); }
        });

        $('#modal-playlists').modal('show');
    },

    closePlaylistsModal() {
        $('#modal-playlists').modal('hide');
    },

    createPlaylistFromManager() {
        const input = document.getElementById('manage-new-playlist-input');
        const name = input.value.trim();
        if (!name) return;
        this.state.playlists.push({ id: 'pl_' + Date.now(), name, items: [] });
        this.savePlaylists();
        input.value = '';
        this.renderPlaylistsList();
    },

    deletePlaylist(id) {
        if (!confirm('Are you sure you want to delete this playlist?')) return;
        this.state.playlists = this.state.playlists.filter(p => p.id !== id);
        this.savePlaylists();
        this.renderPlaylistsList();

        document.getElementById('playlist-items-container').innerHTML =
            '<div style="color: #999; text-align: center; margin-top: 50px;">Playlist deleted.</div>';
        document.getElementById('playlist-items-title').textContent = '';

        ['playlist-header-image', 'playlist-header-meta'].forEach(id => {
            const el = document.getElementById(id);
            if (el) { el.style.display = 'none'; el.textContent = ''; }
        });
        ['btn-play-all', 'btn-shuffle-all'].forEach(id => {
            const el = document.getElementById(id);
            if (el) { el.classList.add('playlist-btn-hidden'); el.classList.remove('playlist-btn-visible'); }
        });
    },

    // ─── Sidebar list rendering ───────────────────────────────────────────────

    renderPlaylistsList() {
        const container = document.getElementById('playlists-sidebar-list');
        if (!container) return;

        if (this.state.playlists.length === 0) {
            container.innerHTML =
                '<div style="padding: 15px; color: #999; font-size: 13px; text-align: center;">No playlists yet.</div>';
            return;
        }

        let html = '<ul class="nav flex-column">';
        this.state.playlists.forEach(pl => {
            html += `<li class="nav-item" style="border-bottom: 1px solid #eee;">
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 15px; cursor: pointer;"
                     onmouseover="this.style.background='#f0f0f0';" onmouseout="this.style.background='transparent';">
                    <div style="flex: 1; font-weight: 500; color: #333;"
                         onclick="App.renderPlaylistItems('${pl.id}')">
                        <i class="fas fa-list-ul" style="color: #0078d4; margin-right: 8px;"></i>
                        ${this.escape(pl.name)}
                        <span style="font-size: 11px; color: #888;">(${pl.items.length})</span>
                    </div>
                    <button class="btn btn-sm btn-link text-danger" style="padding: 0 5px;"
                            onclick="App.deletePlaylist('${pl.id}')">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </li>`;
        });
        html += '</ul>';
        container.innerHTML = html;
    },

    // ─── Playlist item list rendering ─────────────────────────────────────────

    renderPlaylistItems(id) {
        const pl = this.state.playlists.find(p => p.id === id);
        if (!pl) return;
        this.state.activePlaylistId = id;

        const titleEl = document.getElementById('playlist-items-title');
        if (titleEl) titleEl.textContent = pl.name;

        // Header cover image + meta
        const headerImageEl = document.getElementById('playlist-header-image');
        const headerMetaEl  = document.getElementById('playlist-header-meta');
        if (pl.items.length > 0) {
            const firstEventId   = pl.items[0];
            const customEvents   = JSON.parse(localStorage.getItem('cloudmail_events') || '[]');
            const googleEvent    = customEvents.find(e => e.id === firstEventId);
            const latestEvent    = window.cloudmailLatestEvents?.items?.find(e => e.id === firstEventId);
            const firstDateStr   = (latestEvent?.start?.dateTime || latestEvent?.start?.date || googleEvent?.date || '').split(/[T\s]/)[0];
            const coverUrl       = firstDateStr ? this.getDateCoverImage(firstDateStr) : null;

            if (coverUrl && headerImageEl) {
                headerImageEl.style.backgroundImage = `url('${coverUrl}')`;
                headerImageEl.style.display = 'block';
            } else if (headerImageEl) {
                headerImageEl.style.display = 'none';
            }
            if (headerMetaEl) headerMetaEl.textContent = `${pl.items.length} video${pl.items.length > 1 ? 's' : ''}`;
        } else {
            if (headerImageEl) headerImageEl.style.display = 'none';
            if (headerMetaEl)  headerMetaEl.textContent = '0 videos';
        }

        // Play All / Shuffle buttons
        ['btn-play-all', 'btn-shuffle-all'].forEach(btnId => {
            const el = document.getElementById(btnId);
            if (!el) return;
            if (pl.items.length > 0) {
                el.classList.remove('playlist-btn-hidden');
                el.classList.add('playlist-btn-visible');
            } else {
                el.classList.add('playlist-btn-hidden');
                el.classList.remove('playlist-btn-visible');
            }
        });
        const btnPlayAll    = document.getElementById('btn-play-all');
        const btnShuffleAll = document.getElementById('btn-shuffle-all');
        if (btnPlayAll)    btnPlayAll.onclick    = () => App.startPlaylist(id, 0);
        if (btnShuffleAll) btnShuffleAll.onclick = () => App.shufflePlaylist(id);

        // Items list
        const container = document.getElementById('playlist-items-container');
        if (!container) return;

        if (pl.items.length === 0) {
            container.innerHTML = `
                <div style="padding: 60px 20px; text-align: center; color: #999;">
                    <i class="fas fa-folder-open" style="font-size: 40px; display: block; margin-bottom: 15px; opacity: 0.3;"></i>
                    <div style="font-size: 16px;">No videos in this playlist</div>
                </div>`;
            return;
        }

        const customEvents = JSON.parse(localStorage.getItem('cloudmail_events') || '[]');
        let html = '<div class="list-group list-group-flush" style="gap: 8px; padding: 5px;">';

        pl.items.forEach((eventId, index) => {
            let title = 'Unknown Video', dateStr = '';
            const googleEvent = customEvents.find(e => e.id === eventId);
            const latestEvent = window.cloudmailLatestEvents?.items?.find(e => e.id === eventId);

            if (latestEvent) {
                title   = latestEvent.summary || title;
                dateStr = (latestEvent.start?.dateTime || latestEvent.start?.date || '').split(/[T\s]/)[0];
            } else if (googleEvent) {
                title   = googleEvent.title || title;
                dateStr = googleEvent.date || '';
            }

            // Thumbnail
            let itemCoverUrl = '';
            const ev = latestEvent || googleEvent;
            if (ev) {
                const attachments = ev.attachments || [];
                let att = attachments.find(a => a.mimeType?.startsWith('image/') && a.title === 'cover.png')
                    || attachments.find(a => a.mimeType?.startsWith('image/') && a.title?.toLowerCase().endsWith('.png'))
                    || attachments.find(a => a.mimeType?.startsWith('image/'));
                if (att) {
                    itemCoverUrl = att.localUrl
                        || (att.fileId ? this._getAssetUrl(`/images/calendar/${att.fileId}.jpg`) : this.getDirectDriveUrl(att.fileUrl || ''));
                }
                if (!itemCoverUrl && dateStr) itemCoverUrl = this.getDateCoverImage(dateStr) || '';
            }

            const coverImgHtml = itemCoverUrl
                ? `<div style="width: 56px; height: 36px; border-radius: 4px; background: url('${itemCoverUrl}') center/cover no-repeat; margin-right: 12px; flex-shrink: 0;"></div>`
                : `<div style="width: 56px; height: 36px; border-radius: 4px; background: #eee; margin-right: 12px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; color: #aaa;"><i class="fas fa-video"></i></div>`;

            html += `<div class="list-group-item playlist-item-card" draggable="true"
                ondragstart="App.handlePlaylistItemDragStart(event, ${index})"
                ondragover="App.handlePlaylistItemDragOver(event)"
                ondrop="App.handlePlaylistItemDrop(event, ${index})"
                onclick="App.startPlaylist('${pl.id}', ${index})"
                style="display: flex; align-items: center; padding: 12px 15px; border: 1px solid #eee; border-radius: 12px; cursor: pointer; background: #fff; margin-bottom: 0; width: 100%; box-sizing: border-box;">
                <div class="drag-handle" style="color: #ccc; padding-right: 15px; cursor: grab;">
                    <i class="fas fa-grip-vertical"></i>
                </div>
                <div style="width: 32px; height: 32px; background: #f0f7ff; color: #0078d4; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 12px; font-size: 12px; font-weight: 700;">
                    ${index + 1}
                </div>
                ${coverImgHtml}
                <div style="flex: 1; min-width: 0;">
                    <div style="font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 14.5px;">
                        ${this.escape(title)}
                    </div>
                    <div style="font-size: 11px; color: #888;">
                        <i class="far fa-calendar-alt"></i> ${this.escape(dateStr)}
                    </div>
                </div>
                <div class="item-actions" style="margin-left: 10px;">
                    <button class="btn btn-sm btn-link text-danger"
                            onclick="event.stopPropagation(); App.removePlaylistItem('${pl.id}', '${eventId}')"
                            title="Remove"
                            style="padding: 5px; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </div>`;
        });

        html += '</div>';
        container.innerHTML = html;
    },

    removePlaylistItem(playlistId, eventId) {
        const pl = this.state.playlists.find(p => p.id === playlistId);
        if (!pl) return;
        pl.items = pl.items.filter(id => id !== eventId);
        this.savePlaylists();
        this.renderPlaylistsList();
        this.renderPlaylistItems(playlistId);
    },

    // ─── Drag-and-drop reordering ─────────────────────────────────────────────

    handlePlaylistItemDragStart(e, index) {
        e.dataTransfer.setData('text/plain', index);
        e.currentTarget.classList.add('dragging');
    },

    handlePlaylistItemDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    },

    handlePlaylistItemDrop(e, toIndex) {
        e.preventDefault();
        const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
        const pl = this.state.playlists.find(p => p.id === this.state.activePlaylistId);
        if (!pl || fromIndex === toIndex) return;

        const items = [...pl.items];
        const [movedItem] = items.splice(fromIndex, 1);
        items.splice(toIndex, 0, movedItem);
        pl.items = items;

        this.savePlaylists();
        this.renderPlaylistItems(this.state.activePlaylistId);
        this.renderPlaylistsList();
    },

    // ─── Playback control ─────────────────────────────────────────────────────

    startPlaylist(playlistId, startIndex = 0) {
        if (!playlistId) playlistId = this.state.activePlaylist?.id;
        if (!playlistId) return;
        const pl = this.state.playlists.find(p => p.id === playlistId);
        if (!pl || pl.items.length === 0) return;
        this.closePlaylistsModal();
        this.openPlaylistPlayer(pl.id, startIndex, pl);
    },

    shufflePlaylist(playlistId) {
        if (!playlistId) return;
        const pl = this.state.playlists.find(p => p.id === playlistId);
        if (!pl || pl.items.length === 0) return;
        const shuffled = [...pl.items].sort(() => 0.5 - Math.random());
        this.closePlaylistsModal();
        this.openPlaylistPlayer(pl.id, 0, { id: pl.id, name: pl.name + ' (Shuffled)', items: shuffled });
    },

    playNextInPlaylist() {
        if (!this.state.activePlaylist) return;
        const nextIndex = this.state.currentPlaylistIndex + 1;
        if (nextIndex >= this.state.activePlaylist.items.length) {
            this.closePlaylistPlayer();
            return;
        }
        this.openPlaylistPlayer(this.state.activePlaylist.id, nextIndex, this.state.activePlaylist);
    },

    playPrevInPlaylist() {
        if (!this.state.activePlaylist) return;
        const prevIndex = this.state.currentPlaylistIndex - 1;
        if (prevIndex < 0) return;
        this.openPlaylistPlayer(this.state.activePlaylist.id, prevIndex, this.state.activePlaylist);
    },

    // ─── Playlist player modal ────────────────────────────────────────────────

    openPlaylistPlayer(playlistId, startIndex = 0, tempPlaylist = null) {
        const pl = tempPlaylist || this.state.playlists.find(p => p.id === playlistId);
        if (!pl || pl.items.length === 0) return;
        startIndex = Math.max(0, Math.min(startIndex, pl.items.length - 1));

        this.state.activePlaylist        = pl;
        this.state.currentPlaylistIndex  = startIndex;

        // Resolve event metadata
        const eventId      = pl.items[startIndex];
        let title          = 'Unknown Video';
        let eventDate      = new Date().toISOString();
        const customEvents = JSON.parse(localStorage.getItem('cloudmail_events') || '[]');
        const latestEvent  = window.cloudmailLatestEvents?.items?.find(e => e.id === eventId);
        const googleEvent  = customEvents.find(e => e.id === eventId);

        if (latestEvent) {
            title     = latestEvent.summary || title;
            eventDate = latestEvent.start?.dateTime || latestEvent.start?.date || eventDate;
        } else if (googleEvent) {
            title     = googleEvent.title || title;
            eventDate = googleEvent.date  || eventDate;
        }

        // Update modal UI
        document.getElementById('playlist-player-title').textContent    = title;
        document.getElementById('playlist-player-subtitle').textContent = pl.name;
        document.getElementById('playlist-player-counter').textContent  = `Video ${startIndex + 1} of ${pl.items.length}`;

        // Reset download button
        const dlBtn = document.getElementById('btn-playlist-download');
        if (dlBtn) { dlBtn.style.display = 'inline-flex'; dlBtn.innerHTML = '<i class="fas fa-download" style="font-size:11px;"></i> MP4'; dlBtn.disabled = false; dlBtn.style.opacity = '1'; dlBtn.style.background = 'linear-gradient(135deg,#0078d4,#005a9e)'; }
        this.state._playlistActiveHlsUrl = null;
        document.getElementById('btn-playlist-prev').disabled = startIndex === 0;
        document.getElementById('btn-playlist-next').disabled = startIndex === pl.items.length - 1;

        const video    = document.getElementById('playlist-video-player');
        const errorDiv = document.getElementById('playlist-player-error');
        video.style.display    = 'block';
        errorDiv.style.display = 'none';

        // Build HLS paths
        const checkDateObj = new Date(eventDate);
        const y  = checkDateObj.getUTCFullYear();
        const m  = String(checkDateObj.getUTCMonth() + 1).padStart(2, '0');
        const d  = String(checkDateObj.getUTCDate()).padStart(2, '0');
        const hostname = this.getHostnameForDate(eventDate);
        const hlsPaths = [
            `https://${hostname}/${y}/${m}/${y}-${m}-${d}/videos/intro_video-1080p/playlist.m3u8`,
            `https://${hostname}/${y}/${m}/${y}-${m}-${d}/videos/index.m3u8`,
            `https://${hostname}/${y}/${m}/${y}-${m}-${d}/index.m3u8`
        ];

        // Destroy any existing HLS instance
        if (this.state.playlistHlsInstance) {
            this.state.playlistHlsInstance.destroy();
            this.state.playlistHlsInstance = null;
        }

        $('#modal-playlist-player').modal('show');

        setTimeout(() => {
            if (typeof Hls === 'undefined') {
                video.style.display    = 'none';
                errorDiv.style.display = 'block';
                return;
            }

            const tryLoadHls = (url) => new Promise((resolve, reject) => {
                if (Hls.isSupported()) {
                    const hls = new Hls();
                    hls.on(Hls.Events.ERROR, (event, data) => {
                        if (data.fatal) { hls.destroy(); reject(); }
                    });
                    hls.loadSource(url);
                    hls.attachMedia(video);
                    hls.on(Hls.Events.MANIFEST_PARSED, () => {
                        this.state.playlistHlsInstance = hls;
                        resolve();
                    });
                } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                    video.src = url;
                    video.addEventListener('loadedmetadata', () => resolve(), { once: true });
                    video.addEventListener('error',          () => reject(),  { once: true });
                } else {
                    reject();
                }
            });

            (async () => {
                for (const url of hlsPaths) {
                    try {
                        await tryLoadHls(url);
                        this.state._playlistActiveHlsUrl = url;
                        video.play().catch(() => {});
                        return;
                    } catch (e) { /* try next */ }
                }
                video.style.display    = 'none';
                errorDiv.style.display = 'block';
            })();

            video.onended = () => { App.playNextInPlaylist(); };
        }, 100);
    },

    closePlaylistPlayer() {
        $('#modal-playlist-player').modal('hide');
        const video = document.getElementById('playlist-video-player');
        if (video) video.pause();
        if (this.state.playlistHlsInstance) {
            this.state.playlistHlsInstance.destroy();
            this.state.playlistHlsInstance = null;
        }
    },

    // ─── Playlist HLS → MP4 Download ────────────────────────────────────────────

    async downloadPlaylistHlsVideo() {
        const hlsUrl = this.state._playlistActiveHlsUrl;
        if (!hlsUrl) {
            alert('No HLS stream is currently loaded.');
            return;
        }

        const btn = document.getElementById('btn-playlist-download');
        const origHtml = btn ? btn.innerHTML : '';
        if (btn) {
            btn.innerHTML = '<i class="fas fa-circle-notch fa-spin" style="font-size:11px;"></i> Downloading…';
            btn.disabled = true;
            btn.style.opacity = '0.7';
        }

        const urlParts = hlsUrl.split('/');
        const dateSlug = urlParts.find(p => /^\d{4}-\d{2}-\d{2}$/.test(p)) || 'video';
        const filename = `${dateSlug}-intro`;

        try {
            const isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
            const serverUrl = window.__REPLY_SERVER || '';
            const endpoint  = isLocal
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
            console.error('[HLS-DL] Playlist download failed:', err);
            alert('Download failed: ' + err.message);
            if (btn) {
                btn.innerHTML = origHtml;
                btn.disabled = false;
                btn.style.opacity = '1';
            }
        }
    },

};