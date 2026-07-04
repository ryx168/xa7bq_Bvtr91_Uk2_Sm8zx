const REGISTRY_ENDPOINTS = [
    'https://runner-registry.harryji.workers.dev/runner',
    'https://runner-registry.harryji.workers.dev/register',
    'https://runner-registry.harryji.workers.dev/current',
    'https://runner-registry.harryji.workers.dev/'
];

const STORAGE_KEY = 'cloudmail_famous_people_runner_url';

function injectQueueStyles() {
    if (document.getElementById('famous-people-queue-styles')) return;
    const style = document.createElement('style');
    style.id = 'famous-people-queue-styles';
    style.textContent = `
        .fpq-status { font-size:13px; color:#5b6472; min-height:20px; }
        .fpq-status.ok { color:#167345; }
        .fpq-status.err { color:#b42318; }
        .fpq-modal-backdrop { position:fixed; inset:0; z-index:99999; background:rgba(15,23,42,.45); display:flex; align-items:center; justify-content:center; padding:22px; }
        .fpq-modal { width:min(980px, 96vw); max-height:92vh; overflow:hidden; background:#fff; color:#1f2937; border-radius:8px; box-shadow:0 20px 60px rgba(0,0,0,.28); display:flex; flex-direction:column; }
        .fpq-modal-header { display:flex; align-items:center; justify-content:space-between; gap:14px; padding:16px 18px; border-bottom:1px solid #e5eaf2; }
        .fpq-modal-title { margin:0; font-size:18px; font-weight:700; }
        .fpq-modal-body { padding:18px; overflow:auto; }
        .fpq-modal-footer { padding:14px 18px; border-top:1px solid #e5eaf2; display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; background:#f8fafc; }
        .fpq-grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
        .fpq-field { display:flex; flex-direction:column; gap:6px; }
        .fpq-field label { font-size:12px; font-weight:700; color:#4b5563; text-transform:uppercase; letter-spacing:.02em; }
        .fpq-field textarea, .fpq-field input { border:1px solid #cfd7e3; border-radius:6px; padding:10px; font-size:13px; color:#111827; background:#fff; }
        .fpq-field select { border:1px solid #cfd7e3; border-radius:6px; padding:10px; font-size:13px; color:#111827; background:#fff; }
        .fpq-field textarea { min-height:280px; resize:vertical; font-family:Consolas,Monaco,monospace; line-height:1.45; }
        .fpq-field textarea.fpq-prompt { min-height:210px; white-space:pre-wrap; }
        .fpq-search-row { display:flex; gap:8px; align-items:center; }
        .fpq-search-row input { flex:1; }
        .fpq-server-row { display:grid; grid-template-columns:auto minmax(280px, 1fr) auto minmax(220px, 1.2fr); gap:8px; align-items:center; }
        .fpq-server-row label { margin:0; white-space:nowrap; }
        .fpq-server-row .fpq-runner { margin:0; min-height:39px; display:flex; align-items:center; }
        @media (max-width: 900px) { .fpq-server-row { grid-template-columns:1fr; } }
        .fpq-runner { font-family:Consolas,Monaco,monospace; font-size:12px; word-break:break-all; background:#f3f5f8; border:1px solid #e1e7ef; border-radius:6px; padding:8px; margin-bottom:14px; }
        .fpq-actions { display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-top:10px; }
        .fpq-close { border:0; background:transparent; font-size:22px; line-height:1; cursor:pointer; color:#64748b; }
        @media (max-width: 760px) { .fpq-grid { grid-template-columns:1fr; } .fpq-modal-backdrop { padding:10px; align-items:flex-start; } }
    `;
    document.head.appendChild(style);
}

function extractRunnerUrl(data) {
    if (!data) return '';
    if (typeof data === 'string') {
        const match = data.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i) || data.match(/https?:\/\/[^\s"']+/i);
        return match ? match[0] : '';
    }
    const candidates = [data.url, data.tunnel_url, data.tunnelUrl, data.runner_url, data.runnerUrl, data.current?.url, data.runner?.url, data.latest?.url];
    for (const value of candidates) if (typeof value === 'string' && value.startsWith('http')) return value;
    for (const key of ['runners', 'items', 'registrations']) {
        if (Array.isArray(data[key])) {
            const active = data[key].find(item => item && item.url) || data[key][0];
            if (active?.url) return active.url;
        }
    }
    for (const value of Object.values(data)) {
        if (value && typeof value === 'object') {
            const found = extractRunnerUrl(value);
            if (found) return found;
        }
    }
    return '';
}

async function fetchCurrentRunnerUrl() {
    let lastError = '';
    for (const endpoint of REGISTRY_ENDPOINTS) {
        try {
            const res = await fetch(endpoint, { cache: 'no-store' });
            const text = await res.text();
            if (!res.ok) throw new Error(`${endpoint}: HTTP ${res.status}`);
            let data = text;
            try { data = JSON.parse(text); } catch (_) {}
            const url = extractRunnerUrl(data);
            if (url) return url.replace(/\/$/, '');
            lastError = `${endpoint}: no URL in response`;
        } catch (error) {
            lastError = error.message;
        }
    }
    throw new Error(lastError || 'No server URL found');
}

function getRunnerUrl() {
    const input = document.getElementById('fpq-runner-url');
    const value = (input?.value || '').trim().replace(/\/$/, '');
    return value || (localStorage.getItem(STORAGE_KEY) || '').replace(/\/$/, '');
}

async function validateRunnerUrl(url) {
    const base = String(url || '').trim().replace(/\/$/, '');
    if (!/^https?:\/\/[^/\s]+/i.test(base)) throw new Error('Invalid URL format');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    try {
        let res = await fetch(`${base}/health`, { cache: 'no-store', signal: controller.signal });
        if (!res.ok && res.status === 404) {
            res = await fetch(`${base}/people`, { method: 'OPTIONS', cache: 'no-store', signal: controller.signal });
        }
        if (!res.ok && ![204, 405].includes(res.status)) throw new Error(`HTTP ${res.status}`);
        return base;
    } catch (error) {
        if (error.name === 'AbortError') throw new Error('validation timed out');
        throw error;
    } finally {
        clearTimeout(timeout);
    }
}

function setStatus(id, message, kind = '') {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = message;
    el.classList.remove('ok', 'err');
    if (kind) el.classList.add(kind);
}

function selectedPoliticianLines(app) {
    const selectedIds = Array.from(app.state.selectedContactIds || []);
    const selected = selectedIds
        .map(id => (app.state.contacts || []).find(c => c.id === id))
        .filter(c => c && c.group === 'politicians');
    const source = selected.length ? selected : (app.state.contacts || []).filter(c => c.group === 'politicians').slice(0, 20);
    return source.map(c => {
        const name = c.name || '';
        if (!name) return '';
        const quote = c.quote || c.notes || 'Please provide a short natural sample sentence for voice cloning.';
        const gender = c.gender || '';
        const country = c.location || c.country || '';
        return [name, quote, gender, country].join('|').replace(/\n/g, ' ');
    }).filter(Boolean).join('\n');
}

function voiceStatusPoliticianLines(app) {
    const source = (app.state.contacts || [])
        .filter(c => {
            const hasRedo = Boolean(c.voiceRedo?.referWav || c.voiceRedo?.cloneWav);
            return c.group === 'politicians' && (c.voiceStatus === 'wrong' || hasRedo);
        })
        .sort((a, b) => {
            const statusA = a.voiceStatus || 'wrong';
            const statusB = b.voiceStatus || 'wrong';
            return statusA.localeCompare(statusB) || String(a.name || '').localeCompare(String(b.name || ''));
        });
    return source.map(c => {
        const name = c.name || '';
        if (!name) return '';
        const quote = c.quote || c.notes || 'Please provide a short natural sample sentence for voice cloning.';
        const gender = c.gender || '';
        const country = c.location || c.country || '';
        return [name, quote, gender, country].join('|').replace(/\n/g, ' ');
    }).filter(Boolean).join('\n');
}

function buildAiPrompt(app, request = '') {
    const currentNames = (app.state.contacts || [])
        .filter(c => c.group === 'politicians')
        .slice(0, 80)
        .map(c => c.name)
        .filter(Boolean)
        .join(', ');
    const topic = String(request || '').trim();
    return `Generate a voice processing list of famous currently alive politicians or public figures${topic ? ` for this request: ${topic}` : ''}.

Return only plain text lines. No numbering, no bullets, no Markdown.
Each line must use this exact format:
Name|Short quote or sample sentence|Gender|Country

Rules:
- Include 10 to 30 people.
- Prefer recognizable world leaders and political figures.
- Do not include deceased people.
- Avoid duplicates.
- Use gender as male or female when known, otherwise leave it blank.
- Use country or location in the last field.

Existing politicians in my contact list, avoid repeating when possible:
${currentNames}`;
}

function parseProcessListText(text) {
    return String(text || '')
        .replace(/^```(?:text)?\s*/i, '')
        .replace(/```\s*$/i, '')
        .split(/\r?\n/)
        .map(line => line.trim().replace(/^\d+[\).\s-]+/, '').replace(/^[-*]\s+/, ''))
        .filter(line => line && line.includes('|'))
        .join('\n');
}

function parsePeopleListLines(text) {
    return String(text || '')
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean)
        .map(line => {
            const parts = line.split('|').map(part => part.trim());
            const name = parts[0] || '';
            if (!name) return null;
            return {
                name,
                quote: parts[1] || '',
                gender: parts[2] || '',
                location: parts[3] || ''
            };
        })
        .filter(Boolean);
}

function safePersonId(name) {
    return 'pol_' + String(name || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 80);
}

function tagNames(app) {
    const names = new Set();
    (app.state.tags || []).forEach(tag => {
        const name = typeof tag === 'string' ? tag : tag?.name;
        if (name) names.add(name);
    });
    (app.state.contacts || []).forEach(contact => (contact.tags || []).forEach(tag => names.add(tag)));
    return Array.from(names).sort((a, b) => a.localeCompare(b));
}

function renderTagOptions(app, selected = '') {
    const options = tagNames(app);
    return ['<option value="">Select tag...</option>']
        .concat(options.map(tag => `<option value="${escapeHtml(tag)}" ${tag === selected ? 'selected' : ''}>${escapeHtml(tag)}</option>`))
        .join('');
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function fallbackProcessListForRequest(request) {
    const q = String(request || '').toLowerCase();
    if (/中華民國政府|%e4%b8%ad%e8%8f%af%e6%b0%91%e5%9c%8b%e6%94%bf%e5%ba%9c|republic of china government|roc government/.test(q)) {
        return [
            'Lai Ching-te|We will safeguard democracy, strengthen Taiwan, and work with the world for peace.|male|Taiwan',
            'Hsiao Bi-khim|Taiwan will continue building trusted partnerships with democratic friends around the world.|female|Taiwan',
            'Cho Jung-tai|The government must respond to public needs with steady action and responsibility.|male|Taiwan',
            'Han Kuo-yu|Public service should listen to the people and work for social harmony.|male|Taiwan',
            'Tsai Ing-wen|Democracy is the foundation of Taiwan and the shared responsibility of its people.|female|Taiwan',
            'Ma Ying-jeou|Cross-strait peace and stability require dialogue, confidence, and restraint.|male|Taiwan',
            'Eric Chu|Responsible leadership should bring people together and focus on practical solutions.|male|Taiwan',
            'Ko Wen-je|Government should be transparent, professional, and focused on solving real problems.|male|Taiwan',
            'Su Tseng-chang|Public officials must act decisively and protect the welfare of the people.|male|Taiwan',
            'Chen Chien-jen|Science, compassion, and public trust are essential to good governance.|male|Taiwan',
            'Joseph Wu|Taiwan will keep engaging the international community with confidence and resolve.|male|Taiwan',
            'Wang Jin-pyng|Democratic institutions work best when dialogue and respect guide public affairs.|male|Taiwan'
        ].join('\n');
    }
    if (!/trump/.test(q) || !/(china|visit|team|vist)/.test(q)) return '';
    return [
        'Donald Trump|We want a fair relationship with China and a future of strong, peaceful cooperation.|male|United States',
        'JD Vance|American leadership means defending workers, families, and the national interest.|male|United States',
        'Marco Rubio|American foreign policy should make our nation stronger, safer, and more prosperous.|male|United States',
        'Scott Bessent|A strong economy begins with sound policy and confidence in American growth.|male|United States',
        'Pete Hegseth|Peace through strength requires readiness, discipline, and support for our troops.|male|United States',
        'Jamieson Greer|Fair trade should strengthen American workers, farmers, and manufacturers.|male|United States',
        'Russ Vought|Responsible budgeting should make government accountable to the people it serves.|male|United States',
        'Lee Zeldin|Environmental policy should protect communities while allowing the economy to grow.|male|United States',
        'Chris Wright|Energy policy should expand abundance, innovation, and security for American families.|male|United States',
        'Scott Turner|Housing policy should expand opportunity and strengthen communities across America.|male|United States',
        'John Ratcliffe|Intelligence work must protect the country with clarity, discipline, and focus.|male|United States',
        'Brooke Rollins|Agriculture policy should support farmers, families, and the security of our food supply.|female|United States',
        'Howard Lutnick|Commerce should help American businesses compete and win around the world.|male|United States',
        'Linda McMahon|Education should prepare students with skills, opportunity, and confidence.|female|United States',
        'Kelly Loeffler|Small businesses are engines of growth, jobs, and local opportunity.|female|United States',
        'Tulsi Gabbard|National security depends on truth, service, and putting the country first.|female|United States',
        'Sean Duffy|Transportation should connect communities safely, efficiently, and affordably.|male|United States',
        'Doug Collins|Veterans deserve responsive service, respect, and lasting support.|male|United States',
        'Doug Burgum|Public lands and resources should be managed with stewardship and common sense.|male|United States',
        'Todd Blanche|The justice system must be fair, disciplined, and faithful to the Constitution.|male|United States'
    ].join('\n');
}

function looksLikeWikipediaInput(value) {
    const text = String(value || '').trim();
    return /^(?:https?:\/\/)?[^/]*wikipedia\.org\//i.test(text) || /^[A-Za-z0-9_()%,.' -]+$/.test(text) && /_/.test(text);
}

function ensureListModal(app) {
    let existing = document.getElementById('fpq-list-modal');
    if (existing) return existing;
    document.body.insertAdjacentHTML('beforeend', `
        <div id="fpq-list-modal" class="fpq-modal-backdrop" style="display:none">
            <div class="fpq-modal" role="dialog" aria-modal="true">
                <div class="fpq-modal-header">
                    <h3 class="fpq-modal-title"><i class="fas fa-microphone-lines"></i> Process Voice List</h3>
                    <button class="fpq-close" type="button" onclick="App.closeFamousPeopleListModal()">&times;</button>
                </div>
                <div class="fpq-modal-body">
                    <div class="fpq-server-row">
                        <label for="fpq-runner-url">Server URL</label>
                        <input id="fpq-runner-url" type="url" placeholder="https://example.trycloudflare.com">
                        <button class="btn btn-outline-primary" type="button" onclick="App.validateFamousPeopleRunner()">Validate</button>
                        <div id="fpq-runner-state" class="fpq-runner">Not checked yet.</div>
                    </div>
                    <div class="fpq-field" style="margin-bottom:14px">
                        <label for="fpq-search-query">Import by Wikipedia URL or AI prompt</label>
                        <div class="fpq-search-row">
                            <input id="fpq-search-query" type="text" placeholder="https://en.wikipedia.org/wiki/2026_state_visit_by_Donald_Trump_to_China">
                            <button class="btn btn-primary" type="button" onclick="App.searchFamousPeopleList()">
                                <i class="fas fa-search"></i> Search
                            </button>
                        </div>
                        <div class="fpq-search-row" style="margin-top:8px">
                            <input id="fpq-wiki-section" type="text" value="Delegation" placeholder="Wikipedia section, optional. Clear for whole page.">
                        </div>
                    </div>
                    <div class="fpq-field" style="margin-bottom:14px">
                        <label for="fpq-tag-select">Tag people in this list</label>
                        <div class="fpq-search-row">
                            <select id="fpq-tag-select"></select>
                            <input id="fpq-new-tag" type="text" placeholder="New tag name">
                            <button class="btn btn-outline-primary" type="button" onclick="App.applyFamousPeopleTag()">
                                <i class="fas fa-tag"></i> Add tag / create missing
                            </button>
                        </div>
                    </div>
                    <div class="fpq-grid">
                        <div class="fpq-field">
                            <label for="fpq-list-text">Process list</label>
                            <textarea id="fpq-list-text" placeholder="Name|Quote|Gender|Country"></textarea>
                            <div class="fpq-actions">
                                <button class="btn btn-sm btn-outline-secondary" type="button" onclick="App.prefillFamousPeopleListFromSelection()">Use selected / current list</button>
                                <button class="btn btn-sm btn-outline-secondary" type="button" onclick="App.prefillFamousPeopleListFromVoiceStatus()">Fetch wrong voices</button>
                                <button class="btn btn-sm btn-outline-secondary" type="button" onclick="document.getElementById('fpq-list-text').value=''">Clear</button>
                            </div>
                        </div>
                        <div class="fpq-field">
                            <label for="fpq-ai-prompt">AI prompt</label>
                            <textarea id="fpq-ai-prompt" class="fpq-prompt"></textarea>
                            <div class="fpq-actions">
                                <button class="btn btn-sm btn-outline-primary" type="button" onclick="App.generateFamousPeoplePrompt()">Generate AI prompt</button>
                                <button class="btn btn-sm btn-outline-secondary" type="button" onclick="App.copyFamousPeoplePrompt()">Copy prompt</button>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="fpq-modal-footer">
                    <span id="fpq-submit-status" class="fpq-status"></span>
                    <div class="fpq-actions" style="margin-top:0">
                        <button class="btn btn-outline-secondary" type="button" onclick="App.refreshFamousPeopleRunner()">Refresh URL</button>
                        <button class="btn btn-success" type="button" onclick="App.sendFamousPeopleListToServer()">
                            <i class="fas fa-paper-plane"></i> Send to Server
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `);
    const modal = document.getElementById('fpq-list-modal');
    modal.addEventListener('click', event => {
        if (event.target === modal) app.closeFamousPeopleListModal();
    });
    return modal;
}

function installAppMethods() {
    if (!window.App || window.App._famousPeopleQueueInstalled) return false;
    const app = window.App;
    app._famousPeopleQueueInstalled = true;

    app.refreshFamousPeopleRunner = async function(showErrors = true) {
        const input = document.getElementById('fpq-runner-url');
        const current = getRunnerUrl();
        if (current && input && !input.value) input.value = current;
        setStatus('fpq-runner-state', 'Checking server registry and validating URL...');
        try {
            const url = await validateRunnerUrl(await fetchCurrentRunnerUrl());
            localStorage.setItem(STORAGE_KEY, url);
            if (input) input.value = url;
            setStatus('fpq-runner-state', `Valid server: ${url}`, 'ok');
            return url;
        } catch (error) {
            if (current) {
                try {
                    const validCurrent = await validateRunnerUrl(current);
                    localStorage.setItem(STORAGE_KEY, validCurrent);
                    if (input) input.value = validCurrent;
                    setStatus('fpq-runner-state', `Registry failed, saved URL is valid: ${validCurrent}`, 'ok');
                    return validCurrent;
                } catch (savedError) {
                    localStorage.removeItem(STORAGE_KEY);
                    setStatus('fpq-runner-state', `No valid server. Registry: ${error.message}. Saved URL failed: ${savedError.message}`, 'err');
                    return '';
                }
            }
            setStatus('fpq-runner-state', `No active server found: ${error.message}`, showErrors ? 'err' : '');
            return '';
        }
    };

    app.validateFamousPeopleRunner = async function() {
        const input = document.getElementById('fpq-runner-url');
        const url = (input?.value || '').trim().replace(/\/$/, '');
        if (!url) {
            setStatus('fpq-runner-state', 'Enter a server URL to validate.', 'err');
            return '';
        }
        setStatus('fpq-runner-state', 'Validating server URL...');
        try {
            const validUrl = await validateRunnerUrl(url);
            localStorage.setItem(STORAGE_KEY, validUrl);
            if (input) input.value = validUrl;
            setStatus('fpq-runner-state', `Valid server: ${validUrl}`, 'ok');
            return validUrl;
        } catch (error) {
            setStatus('fpq-runner-state', `Invalid server URL: ${error.message}`, 'err');
            return '';
        }
    };

    app.openFamousPeopleListModal = async function() {
        const modal = ensureListModal(this);
        modal.style.display = 'flex';
        this.refreshFamousPeopleTagOptions();
        const list = document.getElementById('fpq-list-text');
        if (list && !list.value.trim()) list.value = selectedPoliticianLines(this);
        this.generateFamousPeoplePrompt();
        await this.refreshFamousPeopleRunner(false);
    };

    app.closeFamousPeopleListModal = function() {
        const modal = document.getElementById('fpq-list-modal');
        if (modal) modal.style.display = 'none';
    };

    app.prefillFamousPeopleListFromSelection = function() {
        const list = document.getElementById('fpq-list-text');
        if (list) list.value = selectedPoliticianLines(this);
    };

    app.prefillFamousPeopleListFromVoiceStatus = function() {
        const list = document.getElementById('fpq-list-text');
        const lines = voiceStatusPoliticianLines(this);
        if (list) list.value = lines;
        const count = lines ? lines.split(/\r?\n/).filter(Boolean).length : 0;
        setStatus('fpq-submit-status', `Loaded ${count} wrong voice people.`, count ? 'ok' : 'err');
    };

    app.refreshFamousPeopleTagOptions = function(selected = '') {
        const select = document.getElementById('fpq-tag-select');
        if (select) select.innerHTML = renderTagOptions(this, selected || select.value || '');
    };

    app.applyFamousPeopleTag = async function() {
        const text = document.getElementById('fpq-list-text')?.value || '';
        const people = parsePeopleListLines(text);
        if (!people.length) {
            setStatus('fpq-submit-status', 'Paste or generate a person list first.', 'err');
            return;
        }
        const selectTag = (document.getElementById('fpq-tag-select')?.value || '').trim();
        const newTag = (document.getElementById('fpq-new-tag')?.value || '').trim();
        const tag = newTag || selectTag;
        if (!tag) {
            setStatus('fpq-submit-status', 'Select a tag or enter a new tag.', 'err');
            return;
        }

        const now = Date.now();
        const byName = new Map((this.state.contacts || []).map(contact => [String(contact.name || '').trim().toLowerCase(), contact]));
        let created = 0;
        let updated = 0;
        for (const person of people) {
            const key = person.name.trim().toLowerCase();
            let contact = byName.get(key);
            if (!contact) {
                const nameParts = person.name.split(/\s+/).filter(Boolean);
                contact = {
                    id: safePersonId(person.name),
                    name: person.name,
                    firstName: nameParts[0] || '',
                    lastName: nameParts.slice(1).join(' '),
                    emails: [],
                    group: 'politicians',
                    location: person.location,
                    gender: person.gender,
                    quote: person.quote,
                    notes: person.quote,
                    tags: [],
                    createdAt: now,
                    updatedAt: now
                };
                this.state.contacts.push(contact);
                byName.set(key, contact);
                created += 1;
            } else {
                contact.group = contact.group || 'politicians';
                if (!contact.location && person.location) contact.location = person.location;
                if (!contact.gender && person.gender) contact.gender = person.gender;
                if (!contact.quote && person.quote) contact.quote = person.quote;
                contact.updatedAt = now;
            }
            contact.tags = Array.isArray(contact.tags) ? contact.tags : [];
            if (!contact.tags.includes(tag)) {
                contact.tags.push(tag);
                updated += 1;
            }
        }

        if (!this.state.tags) this.state.tags = [];
        const hasTag = this.state.tags.some(item => (typeof item === 'string' ? item : item?.name) === tag);
        if (!hasTag) this.state.tags.push({ name: tag, count: 0, createdTs: now });
        this.saveTagsToStorage?.();
        await this.saveContactsToStorage?.();
        this.refreshFamousPeopleTagOptions(tag);
        const newTagInput = document.getElementById('fpq-new-tag');
        if (newTagInput) newTagInput.value = '';
        this.renderContacts?.();
        setStatus('fpq-submit-status', `Tag "${tag}" applied. Created: ${created}. Tagged: ${updated}.`, 'ok');
    };

    app.generateFamousPeoplePrompt = function() {
        const prompt = document.getElementById('fpq-ai-prompt');
        const query = document.getElementById('fpq-search-query')?.value || '';
        if (prompt) prompt.value = buildAiPrompt(this, query);
    };

    app.searchFamousPeopleList = async function() {
        const query = (document.getElementById('fpq-search-query')?.value || '').trim();
        const section = (document.getElementById('fpq-wiki-section')?.value || '').trim();
        const promptEl = document.getElementById('fpq-ai-prompt');
        const listEl = document.getElementById('fpq-list-text');
        if (!query) {
            setStatus('fpq-submit-status', 'Enter a Wikipedia URL or prompt first.', 'err');
            return;
        }

        if (looksLikeWikipediaInput(query)) {
            setStatus('fpq-submit-status', 'Fetching people from Wikipedia...');
            try {
                const params = new URLSearchParams({ url: query });
                if (section) params.set('section', section);
                const res = await fetch(`/api/wiki-people?${params.toString()}`);
                const data = await res.json().catch(() => ({}));
                if (!res.ok || !data.success) throw new Error(data.error || `HTTP ${res.status}`);
                if (!data.text) throw new Error('No people found on that Wikipedia page or section');
                if (listEl) listEl.value = data.text;
                if (promptEl) {
                    promptEl.value = `Fetched ${data.count} people from ${data.sourceWikiPage}${data.section ? ` section: ${data.section}` : ''}.\n\nTag suggestion:\n${(data.sourceWikiPage || query).split('/wiki/')[1] || ''}`;
                }
                setStatus('fpq-submit-status', `Fetched ${data.count} people from Wikipedia.`, 'ok');
                return;
            } catch (error) {
                const fallback = fallbackProcessListForRequest(query);
                if (fallback && listEl) {
                    listEl.value = fallback;
                    if (promptEl) promptEl.value = `Wikipedia fetch failed, loaded built-in fallback list for:\n${query}\n\nReason: ${error.message}`;
                    setStatus('fpq-submit-status', `Wikipedia fetch failed, loaded fallback list: ${error.message}`, 'ok');
                    return;
                }
                setStatus('fpq-submit-status', `Wikipedia fetch failed: ${error.message}`, 'err');
                return;
            }
        }

        const prompt = buildAiPrompt(this, query);
        if (promptEl) promptEl.value = prompt;
        setStatus('fpq-submit-status', 'Searching with AI...');
        try {
            const serverUrl = this._getServerUrl ? this._getServerUrl() : '';
            const res = await fetch(`${serverUrl}/api/famous-people/generate-list`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query, prompt })
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
            const parsed = parseProcessListText(data.text || data.list || '');
            if (!parsed) throw new Error('AI did not return process-list lines');
            if (listEl) listEl.value = parsed;
            setStatus('fpq-submit-status', `Generated ${parsed.split(/\r?\n/).length} entries.`, 'ok');
        } catch (error) {
            const fallback = fallbackProcessListForRequest(query);
            if (fallback && listEl) {
                listEl.value = fallback;
                setStatus('fpq-submit-status', `AI search failed, loaded fallback list: ${error.message}`, 'ok');
                return;
            }
            setStatus('fpq-submit-status', `Search failed: ${error.message}`, 'err');
        }
    };

    app.copyFamousPeoplePrompt = async function() {
        const prompt = document.getElementById('fpq-ai-prompt');
        if (!prompt) return;
        prompt.select();
        try {
            await navigator.clipboard.writeText(prompt.value);
            setStatus('fpq-submit-status', 'AI prompt copied.', 'ok');
        } catch (_) {
            document.execCommand('copy');
            setStatus('fpq-submit-status', 'AI prompt copied.', 'ok');
        }
    };

    app.sendFamousPeopleListToServer = async function() {
        const text = (document.getElementById('fpq-list-text')?.value || '').trim();
        if (!text) {
            setStatus('fpq-submit-status', 'Paste or generate a list first.', 'err');
            return;
        }
        const selectTag = (document.getElementById('fpq-tag-select')?.value || '').trim();
        const newTag = (document.getElementById('fpq-new-tag')?.value || '').trim();
        const tag = newTag || selectTag;

        const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
        const runnerUrl = await this.validateFamousPeopleRunner() || await this.refreshFamousPeopleRunner(true);
        if (!runnerUrl) {
            setStatus('fpq-submit-status', 'No valid server URL.', 'err');
            return;
        }
        setStatus('fpq-submit-status', `Sending ${lines.length} entries...`);
        let added = 0;
        let skipped = 0;
        let localAdded = 0;
        let localUpdated = 0;
        for (const line of lines) {
            const res = await fetch(`${runnerUrl}/people`, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: line
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
            if (data.added === false) {
                skipped += 1;
            } else {
                added += 1;
            }
            
            // Add to local contacts
            if (app && app.state && app.state.contacts) {
                const parts = line.split('|');
                const name = (parts[0] || '').trim();
                let contact = app.state.contacts.find(c => c.name === name);
                if (name && !contact) {
                    contact = {
                        id: 'pol_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
                        name: name,
                        group: 'politicians',
                        emails: [],
                        notes: (parts[1] || '').trim(),
                        gender: (parts[2] || '').trim(),
                        location: (parts[3] || '').trim(),
                        tags: []
                    };
                    if (tag) contact.tags.push(tag);
                    app.state.contacts.unshift(contact);
                    localAdded += 1;
                } else if (contact && tag) {
                    if (!contact.tags) contact.tags = [];
                    if (!contact.tags.includes(tag)) {
                        contact.tags.push(tag);
                        localUpdated += 1;
                    }
                }
            }
        }
        
        if (tag && app && app.state) {
            if (!app.state.tags) app.state.tags = [];
            const hasTag = app.state.tags.some(item => (typeof item === 'string' ? item : item?.name) === tag);
            if (!hasTag) app.state.tags.push({ name: tag, count: 0, createdTs: Date.now() });
        }

        if ((localAdded > 0 || localUpdated > 0) && app.saveContactsToStorage) {
            app.saveContactsToStorage();
            if (tag && app.refreshFamousPeopleTagOptions) app.refreshFamousPeopleTagOptions(tag);
            if (app.renderContacts) app.renderContacts();
            const newTagInput = document.getElementById('fpq-new-tag');
            if (newTagInput) newTagInput.value = '';
        }
        
        setStatus('fpq-submit-status', `Sent. Added: ${added}. Already queued: ${skipped}. Local added/updated: ${localAdded + localUpdated}${tag ? ` (Tagged with: ${tag})` : ''}`, 'ok');
    };

    app.sendFamousPeopleListToActions = app.sendFamousPeopleListToServer;

    return true;
}

function boot() {
    injectQueueStyles();
    if (!installAppMethods()) setTimeout(boot, 100);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
