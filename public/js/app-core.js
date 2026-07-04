/**
 * app-core.js — App shell, state, init, routing, SSE
 * Imported and merged into the final App object in app.js
 */

export const AppCore = {
    // =========================================================================
    // STATE
    // =========================================================================
    state: {
        emails: [],
        threads: [], // Grouped threads
        filteredThreads: [], // Filtered threads
        currentFolder: 'inbox',
        currentTask: 'mail',
        filterGroup: null, // { type: 'date'|'sender', value: ... }
        expandedGroups: {}, // key: true/false
        currentPage: 1,
        itemsPerPage: 50,
        selectedThreadId: null, // Main active thread
        selectedThreadIds: new Set(), // Multi-select
        lastSelectedThreadId: null,
        selectedGroups: new Set(), // Multi-select for sidebar
        lastSelectedGroupId: null,
        orderedGroupKeys: [], // For range selection
        deletedThreadIds: new Set(), // Local "trash"
        readSet: new Set(), // Cache for read IDs
        accounts: [],
        identities: [],
        currentAccountId: null,
        replyContext: null,
        attachments: [], // New: Store File objects
        editor: null, // CKEditor instance
        sigEditor: null, // CKEditor for signatures in settings
        editingSigId: null, // Current ID being edited
        calendar: {
            videoTagsFilter: { area: 'all', type: 'all', theme: 'all', artStyle: 'all' },
            currentDate: new Date(),
            view: 'week',
            events: [],
            emailFilter: '',
            filterQuery: '',
            selectedFilters: new Set(),
            renderedCenturies: new Set(),
            map: null,
            markers: [],
            selectedMapDates: new Set(),
            lastSelectedMapDate: null,
            eras: [
                { year: 1000, title: "1000s: Early Middle Ages", keywords: "Crusades, Song Dynasty", color: "#4A5568" },
                { year: 1100, title: "1100s: High Middle Ages", keywords: "Oxford, Notre Dame", color: "#2D3748" },
                { year: 1200, title: "1200s: Mongol Empire", keywords: "Genghis Khan, Magna Carta", color: "#744210" },
                { year: 1300, title: "1300s: Renaissance Begins", keywords: "Black Death, Dante", color: "#2B6CB0" },
                { year: 1400, title: "1400s: Age of Discovery", keywords: "Columbus, Gutenberg", color: "#2C7A7B" },
                { year: 1500, title: "1500s: The Reformation", keywords: "Luther, Michelangelo", color: "#276749" },
                { year: 1600, title: "1600s: The Enlightenment", keywords: "Newton, Galileo", color: "#805AD5" },
                { year: 1700, title: "1700s: Age of Revolution", keywords: "Industrialization, USA", color: "#B83232" },
                { year: 1800, title: "1800s: Victorian Era", keywords: "Empire, Darwin, Steam", color: "#702459" },
                { year: 1900, title: "1900s: The Modern Age", keywords: "World Wars, Space Race", color: "#1A202C" },
                { year: 2000, title: "2000s: The Digital Age", keywords: "Internet, AI, Globalism", color: "#2D3748" }
            ],
            loadedMonths: new Set()
        },
        settings: {
            signatures: [], // Array of {id, name, content}
            autoInsertId: null // ID of signature to auto-insert
        },
        contacts: [], // Array of {id, name, email, group, phone, company, notes}
        currentContactGroup: 'all',
        selectedContactId: null,
        selectedContactIds: new Set(),
        contactViewMode: 'table',
        lastSelectedContactId: null,
        contactSearchQuery: '',
        contactTagFilter: '',
        blacklistSearchQuery: '',
        whitelistSearchQuery: '',
        blacklist: { emails: [], domains: [] },
        whitelist: { emails: [], domains: [] },
        specialFilter: null, // 'blacklist' | 'whitelist'
        modalTargetId: null, // target input id for contacts modal
        currentModalGroup: 'all', // current group in modal
        selectedModalContactIds: new Set(),
        imports: [], // Array of import records
        playlists: [], // Array of { id, name, items: [eventId1, eventId2] }
        activePlaylist: null, // playlist object currently playing
        currentPlaylistIndex: 0, // index of currently playing video

        // Campaigns State
        campaigns: [],
        campaignPage: 0,
        campaignStatusFilter: 'all',
        campaignSearchQuery: '',
        campaignSortKey: 'sentAt',
        campaignSortDir: 'desc',

        // Reports State
        reportTabFilter: 'all',
        reportSearchQuery: '',
        reportSortKey: 'sentAt',
        reportSortDir: 'desc',
        reportPage: 0,

        // Automations State
        automations: [],
        exports: [],
        consentSettings: null,
        contactsSubTab: 'contacts', // default sub-tab
        activeAutomation: null,
        showAutomationDesigner: false,
        automationView: 'list'
    },

    // =========================================================================
    // INITIALIZATION & CORE
    // =========================================================================
    async init() {
        console.log('App Init...');

        // ... (OAuth handling) ...
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        if (code) {
            document.body.innerHTML = '<div style="padding: 50px; text-align: center; font-family: sans-serif;"><h2>Authenticating...</h2><p>Please wait while we connect your Google Calendar.</p></div>';
            fetch('/api/google/callback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: code })
            })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        if (window.opener) {
                            document.body.innerHTML = '<div style="padding: 50px; text-align: center; font-family: sans-serif; color: green;"><h2>Authentication Successful!</h2><p>This window will close automatically. You can now click Sync again in cloudmain.</p></div>';
                            setTimeout(() => window.close(), 1500);
                        } else {
                            document.body.innerHTML = '<div style="padding: 50px; text-align: center; font-family: sans-serif; color: green;"><h2>Authentication Successful!</h2><p>Redirecting back to your mailbox...</p></div>';
                            setTimeout(() => window.location.href = '/', 1500);
                        }
                    } else {
                        document.body.innerHTML = '<div style="padding: 50px; text-align: center; font-family: sans-serif; color: red;"><h2>Authentication Failed</h2><p>' + (data.error || 'Unknown error') + '</p></div>';
                    }
                })
                .catch(err => {
                    document.body.innerHTML = '<div style="padding: 50px; text-align: center; font-family: sans-serif; color: red;"><h2>Error</h2><p>' + err.message + '</p></div>';
                });
            return;
        }

        await this.loadDeletions();
        this.loadReadSet();
        await this.loadContacts();
        await this.loadTags();
        await this.loadSegments();
        await this.loadFields();
        await this.loadImports();
        await this.loadPlaylists?.();
        this._loadExportsFromStorage?.();
        this._loadConsentSettings?.();
        if (this.initStyles) {
            await this.initStyles();
        }
        await this.loadLatestEvents();
        await this.loadAccounts();
        this.loadIdentities();
        this.checkReplyServer();
        this.initSSE();
        this.bindEvents();
        this.initResizers();
        this.loadEmails();
        this.initEditor();
        this.loadSettings();
        this.loadWhitelist();
        this.loadBlacklist();
        this.whitelistUserAccountsInContacts();

        // Handle External Compose Mode
        const params = new URLSearchParams(window.location.search);
        if (params.get('mode') === 'compose') {
            this.state.isStandaloneCompose = true;
            document.body.classList.add('standalone-compose');
            document.getElementById('layout-sidebar').classList.add('hidden');
            document.getElementById('layout-list').classList.add('hidden');
            document.getElementById('layout-content').classList.add('hidden');
            document.getElementById('layout-menu').classList.add('hidden');
            document.getElementById('compose-view').classList.remove('hidden');
            document.getElementById('btn-open-extwin').style.display = 'none';
            document.getElementById('btn-compose-cancel').textContent = 'Close';

            const saved = JSON.parse(localStorage.getItem('cloudmail_ext_compose_data') || 'null');
            if (saved) {
                setTimeout(() => {
                    document.getElementById('compose-to').value = saved.to || '';
                    document.getElementById('compose-subject').value = saved.subject || '';
                    if (this.state.editor) this.state.editor.setData(saved.html || '');
                    localStorage.removeItem('cloudmail_ext_compose_data');
                }, 500);
            }
        }

        document.querySelector('.task-menu-button')?.addEventListener('click', () => {
            document.getElementById('layout-menu').classList.toggle('popover-open');
        });

        const initialTask = this.getTaskFromUrl();
        this.switchTask(initialTask, { replace: true });

        window.addEventListener('hashchange', () => {
            if (this._ssBlockHashchange) return;
            this.switchTask(this.getTaskFromUrl(), { replace: true });
        });

        window.addEventListener('popstate', () => {
            if (this._ssBlockHashchange) return;
            this.switchTask(this.getTaskFromUrl(), { replace: true });
        });

        document.querySelector('#taskmenu a.campaigns')?.addEventListener('click', (event) => {
            event.preventDefault();
            this.switchTask('campaigns');
        });

        window.App.oddsLoop = setInterval(() => {
            if (window.App.currentViewType === 'playnow') {
                window.App.fetchPlaynowOdds();
                if (typeof window.App.pollPlaynowLiveGames === 'function') {
                    window.App.pollPlaynowLiveGames();
                }
            }
        }, 15000);
    },

    getTaskFromUrl() {
        const path = window.location.pathname.replace(/\/+$/, '');
        if (path === '/campaigns') return 'campaigns';
        const hash = window.location.hash.replace('#', '') || 'mail';
        // Preserve sub-paths and query strings
        return hash;
    },

    getTaskUrl(task) {
        const [fullTaskName, query = ''] = task.split('?');
        const taskName = fullTaskName.split('/')[0];
        if (taskName === 'campaigns') return `/campaigns/${query ? `?${query}` : ''}`;
        return `#${task}`;
    },

    async initEditor() {
        if (!window.ClassicEditor) return;
        try {
            this.state.editor = await ClassicEditor.create(document.querySelector('#editor'), {
                toolbar: ['heading', '|', 'bold', 'italic', 'link', '|', 'bulletedList', 'numberedList', 'blockQuote', 'undo', 'redo']
            });
            console.log('Main editor initialized');

            const sigEl = document.querySelector('#sig-editor');
            if (sigEl) {
                this.state.sigEditor = await ClassicEditor.create(sigEl, {
                    toolbar: ['bold', 'italic', 'link', '|', 'bulletedList', 'numberedList', 'undo', 'redo']
                });
                console.log('Signature editor initialized');
            }
        } catch (error) {
            console.error('CKEditor initialization failed', error);
        }
    },

    async checkReplyServer() {
        try {
            const res = await fetch('/api/health');
            const data = await res.json();
            this.state.isReplyServerUp = data.status === 'ok';
            console.log('Reply server status:', data.status);

            if (this.state.isReplyServerUp) {
                this.loadBlacklist();
                this.loadWhitelist();
            }
        } catch (e) {
            this.state.isReplyServerUp = false;
            console.error('Reply server is unreachable. Email sending/junk features will be limited.');
        }
    },

    _getServerUrl() {
        const isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
        if (isLocal) {
            return window.__REPLY_SERVER || `http://${location.hostname}:8443`;
        }
        return window.location.origin;
    },

    initSSE() {
        const connect = () => {
            const evtSource = new EventSource('/refresh');

            evtSource.addEventListener('connected', () => {
                console.log('SSE connected');
            });

            evtSource.onmessage = (e) => {
                if (e.data === 'refresh') {
                    console.log('SSE refresh triggered');
                    this.loadEmails();
                }
            };

            evtSource.onerror = () => {
                console.warn('SSE lost, reconnecting in 10s...');
                evtSource.close();
                setTimeout(connect, 10000);
            };
        };

        connect();
    },

    initResizers() {
        const setupResizer = (resizerId, elementId) => {
            const resizer = document.getElementById(resizerId);
            const element = document.getElementById(elementId);
            if (!resizer || !element) return;

            resizer.addEventListener('mousedown', (e) => {
                e.preventDefault();
                document.body.style.cursor = 'col-resize';
                resizer.classList.add('active');

                const startX     = e.clientX;
                const startWidth = element.getBoundingClientRect().width;

                const onMouseMove = (moveEvent) => {
                    const deltaX   = moveEvent.clientX - startX;
                    const newWidth = startWidth + deltaX;
                    if (newWidth > 150 && newWidth < (window.innerWidth - 100)) {
                        element.style.width    = `${newWidth}px`;
                        element.style.flex     = 'none';
                        element.style.maxWidth = 'none';
                    }
                };

                const onMouseUp = () => {
                    document.body.style.cursor = '';
                    resizer.classList.remove('active');
                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('mouseup', onMouseUp);
                };

                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            });
        };

        setupResizer('resizer-sidebar', 'layout-sidebar');
        setupResizer('resizer-list', 'layout-list');
    },

    bindEvents() {
        document.getElementById('mailsearchform')?.addEventListener('input', (e) => {
            this.state.searchQuery = e.target.value.toLowerCase();
            this.state.currentPage = 1;
            this.filterEmails();
        });

        document.getElementById('btn-prev').onclick = () => this.goToPage(this.state.currentPage - 1);
        document.getElementById('btn-next').onclick = () => this.goToPage(this.state.currentPage + 1);

        document.addEventListener('click', () => {
            const menu = document.getElementById('context-menu');
            if (menu) menu.style.display = 'none';
        });

        document.getElementById('btn-attach')?.addEventListener('click', () => {
            document.getElementById('compose-file-input').click();
        });

        document.getElementById('compose-file-input')?.addEventListener('change', (e) => {
            this.addAttachments(Array.from(e.target.files));
            e.target.value = '';
        });

        const dropZone = document.getElementById('drop-zone');
        if (dropZone) {
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(evt => {
                dropZone.addEventListener(evt, (e) => { e.preventDefault(); e.stopPropagation(); });
            });
            dropZone.addEventListener('drop', (e) => {
                this.addAttachments(Array.from(e.dataTransfer.files));
            });
        }

        document.getElementById('btn-compose')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.openCompose();
        });

        document.getElementById('btn-open-extwin')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.openExternalCompose();
        });

        document.getElementById('btn-signature')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.insertSignature();
        });
    },

    switchTask(task, options = {}) {
        let fullTaskName = task;
        let locationFilter = null;
        let queryParams = {};

        if (task.includes('?')) {
            const parts = task.split('?');
            fullTaskName = parts[0];
            parts[1].split('&').forEach(param => {
                const [key, value] = param.split('=');
                queryParams[key] = decodeURIComponent(value || '');
            });
        }

        let taskName = fullTaskName.split('/')[0];

        console.log('Switching to task:', taskName, 'params:', queryParams);
        this.state.currentTask = taskName;

        document.querySelectorAll('#taskmenu a').forEach(a => a.classList.remove('selected'));
        const btn = document.querySelector(`#taskmenu a.${taskName}`) || document.getElementById(`btn-${taskName}`);
        if (btn) btn.classList.add('selected');

        const components = ['layout-sidebar', 'layout-list', 'layout-content', 'calendar-view', 'contacts-view', 'campaigns-view', 'reports-view', 'automations-view', 'settings-view', 'compose-view', 'agent-view', 'sports-view', 'playnow-view'];
        components.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.add('hidden');
        });

        if (taskName === 'mail') {
            document.getElementById('layout-sidebar')?.classList.remove('hidden');
            document.getElementById('layout-list')?.classList.remove('hidden');
            document.getElementById('layout-content')?.classList.remove('hidden');
            this.renderList();
            this.renderGroups();
        } else if (taskName === 'settings') {
            document.getElementById('settings-view')?.classList.remove('hidden');
            this.renderSettings();
        } else if (taskName === 'calendar' || taskName === 'map' || taskName === 'africa' || taskName === 'asia' || taskName === 'europe' || taskName === 'westeurope' || taskName === 'americas' || taskName === 'middleeast' || taskName === 'northamerica' || taskName === 'seasia' || taskName === 'event' || (taskName !== 'vancouver' && this.isCityRoute(taskName)) || (!['contacts', 'politicians', 'encyclopedia', 'vancouver', 'agent', 'campaigns', 'automations', 'reports', 'slideshow', 'slidedow', 'sports', 'all_live_soccer', 'playnow', 'sportsinteraction', 'tonybet', 'betting'].includes(taskName) && this._slugToLocationFilter && this._slugToLocationFilter(taskName)?.area) || (!['contacts', 'politicians', 'encyclopedia', 'vancouver', 'agent', 'campaigns', 'automations', 'reports', 'slideshow', 'slidedow', 'sports', 'all_live_soccer', 'playnow', 'sportsinteraction', 'tonybet', 'betting'].includes(taskName) && this._slugToTypeFilter && this._slugToTypeFilter(taskName)) || (!['contacts', 'politicians', 'encyclopedia', 'vancouver', 'agent', 'campaigns', 'automations', 'reports', 'slideshow', 'slidedow', 'sports', 'all_live_soccer', 'playnow', 'sportsinteraction', 'tonybet', 'betting'].includes(taskName) && this._slugToArtStyleFilter && this._slugToArtStyleFilter(taskName))) {
            if (queryParams.q) this.state.calendar.view = 'thumbnail';

            const locationRoutes = {
                'africa': 'Africa', 'asia': 'East Asia', 'europe': 'West Europe',
                'westeurope': 'West Europe', 'americas': 'Latin America',
                'middleeast': 'Middle East', 'northamerica': 'North America', 'seasia': 'SE Asia'
            };

            if (locationRoutes[taskName]) {
                locationFilter = locationRoutes[taskName];
                taskName = 'calendar';
                this.state.calendar.view = 'month';
            } else if (this.isCityRoute(taskName)) {
                const cityRoute = this.getCityRoute(taskName);
                if (cityRoute) {
                    locationFilter = cityRoute.area;
                    queryParams    = cityRoute.params;
                    taskName       = 'calendar';
                    this.state.calendar.view = 'month';
                }
            } else if (taskName === 'map') {
                this.state.calendar.view = 'map';
            } else if (taskName !== 'calendar' && !taskName.startsWith('artstyle-') && this._slugToTypeFilter && this._slugToTypeFilter(taskName)) {
                let tVal = this._slugToTypeFilter(taskName);
                if (this._normalizeFilterVal) tVal = this._normalizeFilterVal(tVal);
                queryParams = { type: tVal };
                taskName    = 'calendar';
                this.state.calendar.view = 'thumbnail';
            } else if (taskName !== 'calendar' && !taskName.startsWith('artstyle-') && this._slugToLocationFilter) {
                const slugLoc = this._slugToLocationFilter(taskName);
                if (slugLoc && slugLoc.area) {
                    locationFilter = slugLoc.area;
                    queryParams = { subarea: slugLoc.subArea, country: slugLoc.country, province: slugLoc.province, city: slugLoc.city };
                    taskName    = 'calendar';
                    this.state.calendar.view = 'month';
                }
            } else if (taskName !== 'calendar' && this._slugToArtStyleFilter && this._slugToArtStyleFilter(taskName)) {
                const asVal = this._slugToArtStyleFilter(taskName);
                if (!this.state.calendar.videoTagsFilter) this.state.calendar.videoTagsFilter = {};
                this.state.calendar.videoTagsFilter.artStyle = asVal;
                if (!this._artStyleExp) this._artStyleExp = {};
                const parts = asVal.split(':');
                if (parts[0] === 'r') {
                    this._artStyleTab = 'region';
                    this._artStyleExp[`r:area:${parts[2]}`] = true;
                    if (parts[1] === 'style') this._artStyleExp[`r:tier:${parts[2]}:${parts[3]}`] = true;
                } else if (parts[0] === 'p') {
                    this._artStyleTab = 'phil';
                    this._artStyleExp[`p:group:${parts[2]}`] = true;
                }
                taskName = 'calendar';
                this.state.calendar.view = 'thumbnail';
                const _asVal = asVal;
                setTimeout(() => {
                    if (!this.state.calendar.videoTagsFilter) this.state.calendar.videoTagsFilter = {};
                    this.state.calendar.videoTagsFilter.artStyle = _asVal;
                    this.renderArtStyleTree?.();
                    this.renderTagThumbnailView?.();
                }, 200);
            }

            if (queryParams.view) {
                if (queryParams.view === 'thumbnail' && queryParams.date && !queryParams.q && !locationFilter && !queryParams.area && !queryParams.type && !queryParams.theme && !(this._slugToArtStyleFilter && this._slugToArtStyleFilter(taskName))) {
                    this.state.calendar.view = 'week';
                } else {
                    this.state.calendar.view = queryParams.view;
                }
            } else if (queryParams.date && !queryParams.q && !locationFilter && !queryParams.area && !queryParams.type && !queryParams.theme && !(this._slugToArtStyleFilter && this._slugToArtStyleFilter(taskName))) {
                this.state.calendar.view = 'week';
            }

            if (queryParams.date) {
                const [y, m, d] = queryParams.date.split('-');
                if (y && m && d) {
                    this.state.calendar.currentDate = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
                }
            }

            const area     = locationFilter || queryParams.area;
            const subArea  = queryParams.subarea;
            const country  = queryParams.country;
            const province = queryParams.province;
            const city     = queryParams.city;
            const query    = queryParams.q || '';

            if (area) {
                this._locationFilter = { area, subArea: subArea || null, country: country || null, province: province || null, city: city || null };
            }

            this._geoResolutionEnabled = true;

            document.getElementById('calendar-view')?.classList.remove('hidden');

            if (!this._calendar && typeof this.initCalendar === 'function') {
                this.initCalendar();
            }

            this.renderCalendarFilters();
            this.setCalendarView(this.state.calendar.view);

            if (queryParams.type) {
                this.state.calendar.videoTagsFilter = this.state.calendar.videoTagsFilter || {};
                this.state.calendar.videoTagsFilter.type = queryParams.type;
                const hid = document.getElementById('calendar-tag-type');
                if (hid) hid.value = queryParams.type;
            }
            if (query) {
                this.state.calendar.videoTagsFilter.keyword = query;
                const searchInput = document.getElementById('calendar-tag-search-input');
                if (searchInput) searchInput.value = query;
            }

            if (area || query || queryParams.type) {
                const typeVal = queryParams.type;
                const areaVal = area;
                let attempts  = 0;
                const maxAttempts = 20;
                const tryRender = () => {
                    attempts++;
                    const items   = window.cloudmailLatestEvents?.items || [];
                    const hasData = items.length > 0;
                    if (hasData || attempts >= maxAttempts) {
                        if (typeVal) {
                            this.state.calendar.videoTagsFilter = this.state.calendar.videoTagsFilter || {};
                            this.state.calendar.videoTagsFilter.type = typeVal;
                        }
                        if (areaVal) this.renderLocationTree();
                        if (typeVal && this.renderTypeTree) {
                            if (!this._typeTreeExpanded) this._typeTreeExpanded = {};
                            if (typeVal.startsWith('subcat:')) {
                                const parts = typeVal.slice(7).split(':');
                                if (parts[0] === 'person')   this._typeTreeExpanded[`g:Characters`] = true;
                                else if (parts[0] === 'physical') this._typeTreeExpanded[`g:Physicals`] = true;
                                if (parts[1]) this._typeTreeExpanded[`sc:${parts[0]}:${parts[1]}`] = true;
                            } else if (typeVal.startsWith('base:')) {
                                const base = typeVal.slice(5);
                                if (this._classifyType) {
                                    const c = this._classifyType(base);
                                    if (c) this._typeTreeExpanded[`g:${c.group}`] = true;
                                }
                                this._typeTreeExpanded[`b:${base}`] = true;
                            } else if (typeVal.startsWith('group:')) {
                                this._typeTreeExpanded[`g:${typeVal.slice(6)}`] = true;
                            }
                            this.renderTypeTree();
                        }
                        this.renderTagThumbnailView();
                    } else {
                        setTimeout(tryRender, 150);
                    }
                };
                setTimeout(tryRender, 100);
            }

            // this.updateCalendarUrl();
        } else if (taskName === 'slideshow' || taskName === 'slidedow') {
            document.getElementById('calendar-view')?.classList.remove('hidden');
            if (!this._calendar && typeof this.initCalendar === 'function') {
                this.initCalendar();
            }
            this.renderCalendarFilters();
            this.setCalendarView(this.state.calendar.view);

            const parts = fullTaskName.split('/');
            const folderPath = parts.slice(1).join('/');

            setTimeout(() => {
                if (typeof this.openFolderSlideshowAt === 'function') {
                    this.openFolderSlideshowAt(folderPath || '');
                }
            }, 300);
        } else if (taskName === 'contacts' || taskName === 'politicians' || taskName === 'encyclopedia' || taskName === 'vancouver') {
            document.getElementById('contacts-view')?.classList.remove('hidden');
            // Extract contact name-slug from URL path: #politicians/Xi_Jinping or #contacts/蔡奇
            const pathParts = fullTaskName.split('/');
            const deepContactSlug = pathParts.length > 1 ? decodeURIComponent(pathParts.slice(1).join('/')) : null;
            if (['politicians', 'encyclopedia', 'vancouver'].includes(taskName)) {
                this.state.currentContactGroup = taskName;
            } else if (queryParams.group) {
                this.state.currentContactGroup = queryParams.group;
            } else if (taskName === 'contacts' && ['politicians', 'encyclopedia', 'vancouver'].includes(this.state.currentContactGroup)) {
                this.state.currentContactGroup = 'all'; // Default back to all if explicitly clicking Contacts without group
            }
            this.state.contactTagFilter = queryParams.tag || '';
            this.renderContactsSidebar?.();
            this.renderContacts();
            // Deep-link: open contact detail if name slug is in the URL
            if (deepContactSlug) {
                const contact = this._findContactBySlug?.(deepContactSlug);
                if (contact) {
                    // Ensure the group matches so the contact is visible
                    if (contact.group && contact.group !== this.state.currentContactGroup && this.state.currentContactGroup !== 'all') {
                        this.state.currentContactGroup = contact.group === 'politicians' ? 'politicians' : contact.group;
                        this.renderContactsSidebar?.();
                        this.renderContacts();
                    }
                    this.showContactDetail(contact.id);
                }
            }
        } else if (taskName === 'campaigns') {
            document.getElementById('campaigns-view')?.classList.remove('hidden');
            if (!this.state.campaigns || this.state.campaigns.length === 0) this.loadCampaigns();
            else this.renderCampaigns();
        } else if (taskName === 'reports') {
            document.getElementById('reports-view')?.classList.remove('hidden');
            if (!this.state.campaigns || this.state.campaigns.length === 0) {
                this.loadCampaigns().then(() => {
                    if (window.location.hash.startsWith('#reports')) this.renderReports();
                });
            } else {
                this.renderReports();
            }
        } else if (taskName === 'automations') {
            document.getElementById('automations-view')?.classList.remove('hidden');
            this.loadAutomations();
        } else if (taskName === 'agent') {
            document.getElementById('agent-view')?.classList.remove('hidden');
        } else if (taskName === 'betting') {
            document.getElementById('sports-view')?.classList.remove('hidden');
            window.App.currentViewType = taskName;
            if (typeof this.loadBettingView === 'function') this.loadBettingView();
            else if (window.App && typeof window.App.loadBettingView === 'function') window.App.loadBettingView();
        } else if (taskName === 'Opportunity') {
            document.getElementById('sports-view')?.classList.remove('hidden');
            window.App.currentViewType = taskName;
            if (typeof this.loadOpportunityView === 'function') this.loadOpportunityView();
            else if (window.App && typeof window.App.loadOpportunityView === 'function') window.App.loadOpportunityView();
        } else if (taskName === 'sports' || taskName === 'all_live_soccer' || taskName === 'playnow' || taskName === 'sportsinteraction' || taskName === 'tonybet') {
            document.getElementById('sports-view')?.classList.remove('hidden');
            window.App.currentViewType = taskName;
            let year = 2026;
            if (taskName === 'all_live_soccer') year = 'live';
            if (taskName === 'playnow') year = 'playnow';
            if (taskName === 'sportsinteraction') year = 'sportsinteraction';
            if (taskName === 'tonybet') year = 'tonybet';

            if (fullTaskName.split('/').length > 1) {
                const sub = fullTaskName.split('/')[1];
                if (sub === 'last_game') {
                    year = 'last_game';
                } else if (sub.includes('-FIFA')) {
                    const parsedYear = sub.split('-FIFA')[0];
                    if (['sportsinteraction', 'playnow', 'live', '2020', '2022', '2026', 'tonybet'].includes(parsedYear)) {
                        year = (parsedYear === '2026' || parsedYear === '2022' || parsedYear === '2020') ? parseInt(parsedYear) : parsedYear;
                    }
                } else if (sub.startsWith('FIFA-') && sub.endsWith('-World-Cup')) {
                    const parsedYear = sub.split('-')[1];
                    if (['2006', '2010', '2014', '2018', '2020', '2022', '2026'].includes(parsedYear)) {
                        year = parseInt(parsedYear);
                    }
                    window._currentLeagueId = 'FIFA';
                } else if (sub === 'league') {
                    // format: #sports/league/UEFA_EL/2004-2005
                    const parts = fullTaskName.split('/');
                    if (parts.length >= 4) {
                        window._currentLeagueId = parts[2];
                        year = parts[3];
                    }
                } else if (taskName === 'all_live_soccer') {
                    const parts = fullTaskName.split('/');
                    if (parts.length >= 3 && parts[2]) {
                        window._currentLeagueId = decodeURIComponent(parts[2]).replace(/-/g, '_').replace(/ /g, '_');
                    } else {
                        window._currentLeagueId = null;
                    }
                }

            } else {
                window._currentLeagueId = null;
            }
            this.loadSportsSchedule(year, window._currentLeagueId);
        }

        const nextUrl = this.getTaskUrl(task);
        const currentUrl = window.location.pathname + window.location.search + window.location.hash;
        if (currentUrl !== nextUrl) {
            const method = options.replace ? 'replaceState' : 'pushState';
            window.history[method](null, null, nextUrl);
        }
    },

    async loadAccounts() {
        try {
            const res = await fetch('/api/accounts');
            if (res.ok) {
                this.state.accounts = await res.json();
                console.log('Accounts loaded:', this.state.accounts);
                const select = document.getElementById('compose-from');
                if (select) {
                    select.innerHTML = this.state.accounts.map(acc => `<option value="${acc.id}">${acc.name} &lt;${acc.email}&gt;</option>`).join('');
                }
            }
        } catch (e) {
            console.error('Failed to load accounts:', e);
        }
    },

    loadIdentities() {
        const fetchIdentities = () => {
            fetch('/api/identities')
                .then(res => res.json())
                .then(data => {
                    this.state.identities = data;
                    console.log('Identities loaded:', this.state.identities);
                    const sel = document.getElementById('compose-from');
                    if (sel) {
                        sel.innerHTML = this.state.identities.map(id => {
                            const namePart = id.name ? `${id.name} ` : '';
                            return `<option value="${id.id}">${namePart}&lt;${id.email}&gt;</option>`;
                        }).join('');
                    }
                    if (this.state.identities.length > 0 && !this.state.currentAccountId) {
                        this.state.currentAccountId = this.state.identities[0].id;
                    }
                    this.renderSignatureList?.();
                })
                .catch(err => {
                    console.error('Failed to load identities:', err);
                });
        };

        if (this.state.isReplyServerUp) {
            fetchIdentities();
        } else {
            let checks = 0;
            const checkInterval = setInterval(() => {
                checks++;
                if (this.state.isReplyServerUp) {
                    clearInterval(checkInterval);
                    fetchIdentities();
                } else if (checks >= 10) {
                    clearInterval(checkInterval);
                }
            }, 1000);
        }
    },

    openThemeStyle() {
        const isDark = document.documentElement.classList.toggle('dark-mode');
        localStorage.setItem('colorMode', isDark ? 'dark' : 'light');
    },

    openAbout() {
        alert("harry@mlicanada.com v1.0.0\nBuilt for the Modern Web.");
    },

    toggleHeaderMenu() {
        const menu = document.getElementById('header-menu-popover');
        if (menu) {
            menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
        }
    }
};
