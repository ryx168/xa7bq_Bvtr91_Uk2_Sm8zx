/**
 * mail.js — Email and thread-related logic
 * Imported and merged into the final App object in app.js
 */

export const MailMixin = {
    async loadBlacklist() {
        try {
            const res = await fetch('/api/blacklist');
            if (res.ok) {
                this.state.blacklist = await res.json();
                console.log('Blacklist loaded:', this.state.blacklist);
                this.filterEmails();
                this.renderGroups();
                this.renderFolders();
                this.renderList();
                this.renderBlacklist();
            }
        } catch (e) {
            console.error('Failed to load blacklist:', e);
        }
    },

    async loadWhitelist() {
        try {
            const res = await fetch('/api/whitelist');
            if (res.ok) {
                this.state.whitelist = await res.json();
                console.log('Whitelist loaded:', this.state.whitelist);
                this.filterEmails();
                this.renderGroups();
                this.renderFolders();
                this.renderList();
                this.renderWhitelist();
            }
        } catch (e) {
            console.error('Failed to load whitelist:', e);
        }
    },

    async loadEmails() {
        try {
            document.getElementById('list-loading').classList.remove('hidden');
            const res = await fetch(`search-index.json?t=${Date.now()}`);
            if (!res.ok) throw new Error('Failed to load index');

            const data = await res.json();
            this.state.emails = data.emails || [];
            this.state.searchIndexVersion = data.version;

            this.state.emails.sort((a, b) => new Date(b.date) - new Date(a.date));

            this.groupEmails();

            if (data.account) {
                document.title = data.account;
                document.querySelectorAll('.username').forEach(el => el.textContent = data.account);
            }

            document.getElementById('list-loading').classList.add('hidden');

            this.renderFolders();
            this.renderGroups();

            const now   = new Date();
            const year  = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');

            this.state.expandedGroups[String(year)]        = true;
            this.state.expandedGroups[`${year}/${month}`]  = true;
            this.renderGroups();

            this.selectGroup('date', `${year}/${month}/inbox`);

            if (window.location.hash.includes('#calendar') || window.location.hash.includes('#map')) {
                this.renderCalendarFilters();
                this.renderCalendar();
            }

        } catch (e) {
            console.error(e);
            document.getElementById('email-list-body').innerHTML =
                `<tr><td>Error loading emails: ${e.message}</td></tr>`;
        }
    },

    renderFolders() {
        const folders = ['inbox', 'drafts', 'sent', 'junk', 'trash'];
        const list    = document.getElementById('folder-list');

        const counts = {};
        this.state.emails.forEach(e => {
            const threadId = this.state.emailToThread[e.id];
            if (this.state.deletedThreadIds.has(threadId)) return;
            if (this.isBlacklisted(e.from)) return;
            const f = (e.folder || 'inbox').toLowerCase();
            counts[f] = (counts[f] || 0) + 1;
        });

        list.innerHTML = folders.map(f => `
            <li class="mailbox ${f}"
                ${f === 'junk' ? 'ondragover="App.handleDragOver(event)" ondrop="App.handleDropToJunk(event)"' : ''}>
                <a href="#" class="${this.state.currentFolder === f && !this.state.filterGroup ? 'selected' : ''}"
                   onclick="App.switchFolder('${f}'); return false;">
                    <span class="name">${f.charAt(0).toUpperCase() + f.slice(1)}</span>
                    ${counts[f] ? `<span class="badge badge-secondary float-right">${counts[f]}</span>` : ''}
                </a>
            </li>
        `).join('');
    },

    groupEmails() {
        const groups = {};
        this.state.emailToThread = {};

        this.state.emails.forEach(email => {
            const subject = (email.subject || '(No Subject)').replace(/^(Re|Fwd|Aw|Antw|R):\s*/i, '').trim();
            const key     = subject.toLowerCase();

            if (!groups[key]) {
                groups[key] = {
                    id: email.id, subject, emails: [],
                    latestDate: email.date,
                    participants: new Set(), recipients: new Set()
                };
            }
            groups[key].emails.push(email);
            this.state.emailToThread[email.id] = groups[key].id;

            const from = email.from ? String(email.from).toLowerCase() : 'sender';
            groups[key].participants.add(from);

            if (email.to && Array.isArray(email.to)) {
                email.to.forEach(t => {
                    const recipientEmail = (t.email || t.address || t.value || String(t)).toLowerCase();
                    groups[key].recipients.add(recipientEmail);
                });
            }

            if (new Date(email.date) > new Date(groups[key].latestDate)) {
                groups[key].latestDate = email.date;
            }
        });

        this.state.threads = Object.values(groups).sort(
            (a, b) => new Date(b.latestDate) - new Date(a.latestDate)
        );
        this.state.threads.forEach(t => {
            t.emails.sort((a, b) => new Date(a.date) - new Date(b.date));
        });
    },

    isBlacklisted(fromEmail) {
        if (!fromEmail) return false;
        const eml = this.extractEmail(fromEmail).toLowerCase().trim();
        const dom = this.getRootDomain(fromEmail).toLowerCase().trim();

        const isEmlWhitelisted = (this.state.whitelist.emails || []).some(e => e.toLowerCase().trim() === eml);
        const isDomWhitelisted = (this.state.whitelist.domains || []).some(d => {
            const wlD = d.toLowerCase().trim();
            return dom === wlD || dom.endsWith('.' + wlD);
        });
        if (isEmlWhitelisted || isDomWhitelisted) return false;

        const isEmlBlacklisted = (this.state.blacklist.emails || []).some(e => e.toLowerCase().trim() === eml);
        const isDomBlacklisted = (this.state.blacklist.domains || []).some(d => {
            let blD = d.toLowerCase().trim();
            if (blD.startsWith('@')) blD = blD.substring(1);
            if (blD.startsWith('.')) blD = blD.substring(1);
            if (dom === blD) return true;
            if (blD.startsWith('*.')) {
                const wildcardDomain = blD.substring(2);
                return dom === wildcardDomain || dom.endsWith('.' + wildcardDomain);
            }
            return dom.endsWith('.' + blD);
        });

        return isEmlBlacklisted || isDomBlacklisted;
    },

    renderGroups() {
        const list = document.getElementById('group-list');
        if (!list) return;

        this.state.orderedGroupKeys = [];

        const dateTree   = {};
        const senderTree = {};

        const initNode = () => ({
            count: 0, unread: 0,
            stats: { inbox: { count: 0, unread: 0 }, sent: { count: 0, unread: 0 } },
            children: {}
        });

        this.state.emails.forEach(email => {
            const threadId = this.state.emailToThread[email.id];
            if (this.state.deletedThreadIds.has(threadId)) return;
            if (this.isBlacklisted(email.from)) return;

            const isUnread     = !this.isRead(email.id);
            const labels       = (email.labels || [email.folder || 'inbox']).map(l =>
                l.toLowerCase().includes('sent') ? 'sent' : 'inbox'
            );
            const uniqueLabels = [...new Set(labels)];

            const d   = new Date(email.date);
            const y   = d.getFullYear();
            const m   = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');

            uniqueLabels.forEach(folder => {
                if (!dateTree[y]) dateTree[y] = initNode();
                dateTree[y].count++;
                if (isUnread) dateTree[y].unread++;
                dateTree[y].stats[folder].count++;
                if (isUnread) dateTree[y].stats[folder].unread++;

                if (!dateTree[y].children[m]) dateTree[y].children[m] = initNode();
                dateTree[y].children[m].count++;
                if (isUnread) dateTree[y].children[m].unread++;
                dateTree[y].children[m].stats[folder].count++;
                if (isUnread) dateTree[y].children[m].stats[folder].unread++;

                if (!dateTree[y].children[m].children[day]) dateTree[y].children[m].children[day] = initNode();
                dateTree[y].children[m].children[day].count++;
                if (isUnread) dateTree[y].children[m].children[day].unread++;
                dateTree[y].children[m].children[day].stats[folder].count++;
                if (isUnread) dateTree[y].children[m].children[day].stats[folder].unread++;
            });

            const domain     = this.getRootDomain(email.from);
            if (!senderTree[domain]) senderTree[domain] = initNode();
            senderTree[domain].count++;
            if (isUnread) senderTree[domain].unread++;

            const primaryFolder = uniqueLabels[0];
            senderTree[domain].stats[primaryFolder].count++;
            if (isUnread) senderTree[domain].stats[primaryFolder].unread++;

            const senderName = (email.fromName || (typeof email.from === 'string'
                ? email.from.split('@')[0]
                : (email.from?.name || email.from?.email || 'sender'))).toLowerCase();
            if (!senderTree[domain].children[senderName]) {
                senderTree[domain].children[senderName] = { count: 0, unread: 0, children: {} };
            }
            senderTree[domain].children[senderName].count++;
            if (isUnread) senderTree[domain].children[senderName].unread++;
        });

        let html = '';

        const renderNode = (key, node, type, path, level) => {
            const currentPath = path ? `${path}/${key}` : key;
            const groupKey    = `${type}:${currentPath}`;
            this.state.orderedGroupKeys.push(groupKey);

            const isExpanded  = this.state.expandedGroups[currentPath];
            const hasChildren = Object.keys(node.children).length > 0;
            const isSelected  = this.state.selectedGroups.has(groupKey);
            const levelClass  = `level-${level}`;
            const expandClass = isExpanded ? 'expanded' : '';

            const getBadges = (n) => {
                const uBadge = n.unread > 0 ? `<span class="badge badge-primary">${n.unread}</span>` : '';
                const tBadge = `<span class="badge badge-secondary">${n.count}</span>`;
                return `${uBadge}${tBadge}`;
            };

            let itemHtml = `
                <li class="mailbox ${levelClass} ${expandClass}">
                    <a href="#" class="${isSelected ? 'selected' : ''}"
                        onclick="App.handleGroupClick('${type}', '${currentPath}', event); return false;"
                        draggable="true" ondragstart="App.handleDragStartGr('${type}', '${currentPath}', event)">
                        ${hasChildren || (node.stats && (node.stats.inbox.count > 0 || node.stats.sent.count > 0))
                            ? `<span class="toggle-icon" onclick="App.toggleGroup('${currentPath}', event)">▶</span>`
                            : '<span class="toggle-icon"></span>'}
                        <span class="name">${key}</span>
                        ${getBadges(node)}
                    </a>`;

            if (hasChildren || (node.stats && isExpanded)) {
                itemHtml += `<ul>`;
                if (type === 'date' && isExpanded) {
                    ['inbox', 'sent'].forEach(folder => {
                        if (node.stats && node.stats[folder] && node.stats[folder].count > 0) {
                            const subPath      = `${currentPath}/${folder}`;
                            const subKey       = `${type}:${subPath}`;
                            this.state.orderedGroupKeys.push(subKey);
                            const isSubSelected = this.state.selectedGroups.has(subKey);
                            const folderName   = folder.charAt(0).toUpperCase() + folder.slice(1);
                            itemHtml += `
                                <li class="mailbox level-${level + 1}">
                                    <a href="#" class="${isSubSelected ? 'selected' : ''}"
                                        onclick="App.handleGroupClick('${type}', '${subPath}', event); return false;"
                                        draggable="true" ondragstart="App.handleDragStartGr('${type}', '${subPath}', event)">
                                        <span class="toggle-icon"></span>
                                        <span class="name">${folderName}</span>
                                        ${getBadges(node.stats[folder])}
                                    </a>
                                </li>`;
                        }
                    });
                }
                if (isExpanded) {
                    const keys = Object.keys(node.children).sort();
                    if (type === 'date') keys.reverse();
                    keys.forEach(k => { itemHtml += renderNode(k, node.children[k], type, currentPath, level + 1); });
                }
                itemHtml += `</ul>`;
            }
            itemHtml += `</li>`;
            return itemHtml;
        };

        html += `<li class="group-header">By Date</li>`;
        Object.keys(dateTree).sort().reverse().forEach(y => {
            html += renderNode(y, dateTree[y], 'date', '', 1);
        });

        html += `<li class="group-header" style="margin-top:10px;">By Sender</li>`;
        Object.keys(senderTree).sort().forEach(domain => {
            html += renderNode(domain, senderTree[domain], 'sender', '', 1);
        });

        html += `<li class="group-header" style="margin-top:10px;">Special Filters</li>`;
        [
            { id: 'blacklist', name: 'Blacklisted', icon: 'fa-ban' },
            { id: 'whitelist', name: 'Whitelisted', icon: 'fa-check-circle' }
        ].forEach(item => {
            const groupKey  = `special:${item.id}`;
            this.state.orderedGroupKeys.push(groupKey);
            const isSelected = this.state.selectedGroups.has(groupKey);
            html += `
                <li class="mailbox level-1">
                    <a href="#" class="${isSelected ? 'selected' : ''}"
                        onclick="App.handleGroupClick('special', '${item.id}', event); return false;">
                        <span class="toggle-icon"><i class="fas ${item.icon}" style="font-size:0.8em;opacity:0.7;"></i></span>
                        <span class="name">${item.name}</span>
                    </a>
                </li>`;
        });

        list.innerHTML = html;
    },

    toggleGroup(path, e) {
        if (e) e.stopPropagation();
        this.state.expandedGroups[path] = !this.state.expandedGroups[path];
        this.renderGroups();
    },

    selectGroup(type, value) {
        this.handleGroupClick(type, value, { ctrlKey: false, shiftKey: false });
    },

    handleGroupClick(type, value, event) {
        const { ctrlKey, shiftKey } = event || {};
        const groupKey = `${type}:${value}`;

        if (shiftKey && this.state.lastSelectedGroupId) {
            if (!ctrlKey) this.state.selectedGroups.clear();
            const startIdx = this.state.orderedGroupKeys.indexOf(this.state.lastSelectedGroupId);
            const endIdx   = this.state.orderedGroupKeys.indexOf(groupKey);
            if (startIdx !== -1 && endIdx !== -1) {
                const [min, max] = [Math.min(startIdx, endIdx), Math.max(startIdx, endIdx)];
                for (let i = min; i <= max; i++) this.state.selectedGroups.add(this.state.orderedGroupKeys[i]);
            } else {
                this.state.selectedGroups.add(groupKey);
            }
        } else if (ctrlKey) {
            if (this.state.selectedGroups.has(groupKey)) this.state.selectedGroups.delete(groupKey);
            else this.state.selectedGroups.add(groupKey);
        } else {
            this.state.selectedGroups.clear();
            this.state.selectedGroups.add(groupKey);
        }

        this.state.lastSelectedGroupId = groupKey;
        this.state.filterGroup         = { type, value };
        this.state.specialFilter       = (type === 'special') ? value : null;
        this.state.currentFolder       = (type === 'special') ? null : this.state.currentFolder;
        this.state.currentPage         = 1;

        this.renderFolders();
        this.renderGroups();

        document.getElementById('content-placeholder').classList.remove('hidden');
        document.getElementById('messagecontframe').classList.add('hidden');

        this.filterEmails();
    },

    switchFolder(f) {
        this.state.currentFolder  = f;
        this.state.filterGroup    = null;
        this.state.specialFilter  = null;
        this.state.currentPage    = 1;
        this.filterEmails();
        this.renderFolders();
        this.renderGroups();

        document.getElementById('content-placeholder').classList.remove('hidden');
        document.getElementById('messagecontframe').classList.add('hidden');

        this.filterEmails();
    },

    selectFolder(f) {
        this.state.currentFolder = f;
    },

    filterEmails() {
        const { threads, currentFolder, filterGroup, searchQuery } = this.state;

        this.state.filteredThreads = threads.filter(thread => {
            if (this.state.deletedThreadIds.has(thread.id) || thread.emails.some(e => this.state.deletedThreadIds.has(e.id))) return false;

            const hasBlacklisted = thread.emails.some(e => this.isBlacklisted(e.from));
            const hasWhitelisted = thread.emails.some(e => {
                const email  = this.extractEmail(e.from).toLowerCase().trim();
                const domain = this.getRootDomain(e.from).toLowerCase().trim();
                const wlEmails  = (this.state.whitelist.emails  || []).map(x => x.toLowerCase().trim());
                const wlDomains = (this.state.whitelist.domains || []).map(x => x.toLowerCase().trim());
                return wlEmails.includes(email) || wlDomains.some(d => domain === d || domain.endsWith('.' + d));
            });

            if (this.state.specialFilter === 'blacklist') {
                if (!hasBlacklisted || hasWhitelisted) return false;
            } else if (this.state.specialFilter === 'whitelist') {
                if (!hasWhitelisted) return false;
            } else {
                if (hasBlacklisted && !hasWhitelisted) return false;
            }

            let relevantEmails = thread.emails;

            if (this.state.selectedGroups.size > 0) {
                relevantEmails = thread.emails.filter(e => {
                    return Array.from(this.state.selectedGroups).some(groupKey => {
                        const [type, val] = [
                            groupKey.substring(0, groupKey.indexOf(':')),
                            groupKey.substring(groupKey.indexOf(':') + 1)
                        ];

                        if (type === 'date') {
                            const parts    = val.split('/');
                            const lastPart = parts[parts.length - 1];
                            let folderFilter = null;
                            let dateParts    = [...parts];
                            if (lastPart === 'inbox' || lastPart === 'sent') {
                                folderFilter = lastPart;
                                dateParts.pop();
                            }
                            if (folderFilter) {
                                const labels       = (e.labels || [e.folder || 'inbox']).map(l => l.toLowerCase());
                                const mappedLabels = labels.map(l => l.includes('sent') ? 'sent' : 'inbox');
                                if (!mappedLabels.includes(folderFilter)) return false;
                            }
                            const d   = new Date(e.date);
                            const y   = String(d.getFullYear());
                            const m   = String(d.getMonth() + 1).padStart(2, '0');
                            const day = String(d.getDate()).padStart(2, '0');
                            if (dateParts[0] && y !== dateParts[0]) return false;
                            if (dateParts[1] && m !== dateParts[1]) return false;
                            if (dateParts[2] && day !== dateParts[2]) return false;
                            return true;

                        } else if (type === 'sender') {
                            const parts      = val.split('/');
                            const domain     = this.getRootDomain(e.from);
                            const senderName = (e.fromName || (typeof e.from === 'string'
                                ? e.from.split('@')[0]
                                : (e.from?.name || e.from?.email || 'sender'))).toLowerCase();
                            if (parts[0] && domain      !== parts[0]) return false;
                            if (parts[1] && senderName  !== parts[1]) return false;
                            return true;
                        }
                        return false;
                    });
                });
            } else if (currentFolder) {
                relevantEmails = thread.emails.filter(e => {
                    const labels = (e.labels || [e.folder || 'inbox']).map(l => l.toLowerCase());
                    return labels.includes(currentFolder);
                });
            }

            if (relevantEmails.length === 0) return false;

            if (searchQuery) {
                const queryMatch = thread.emails.some(e =>
                    (e.subject + e.from).toLowerCase().includes(searchQuery)
                );
                if (!queryMatch) return false;
            }

            return true;
        });

        this.state.totalPages = Math.ceil(this.state.filteredThreads.length / this.state.itemsPerPage) || 1;
        this.renderList();
    },

    goToPage(p) {
        if (p < 1) p = 1;
        if (p > this.state.totalPages) p = this.state.totalPages;
        this.state.currentPage = p;
        this.renderList();
    },

    renderList() {
        const { filteredThreads, currentPage, itemsPerPage } = this.state;
        const start       = (currentPage - 1) * itemsPerPage;
        const pageThreads = filteredThreads.slice(start, start + itemsPerPage);
        const tbody       = document.getElementById('email-list-body');

        if (pageThreads.length === 0) {
            tbody.innerHTML = '<tr><td style="padding:1rem;text-align:center;">No messages found</td></tr>';
            return;
        }

        tbody.innerHTML = pageThreads.map(thread => {
            const isRead          = thread.emails.every(e => this.isRead(e.id));
            const hasAttachments  = thread.emails.some(e => e.hasAttachments);
            const dotStyle        = `font-size:0.5rem;color:var(--color-primary);margin-right:5px;${isRead ? 'visibility:hidden;' : ''}`;

            const isSentView = this.state.currentFolder === 'sent' ||
                (this.state.filterGroup && this.state.filterGroup.value.endsWith('/sent'));

            let displayNames = '';
            if (isSentView) {
                const recipients = thread.emails
                    .filter(e => {
                        const roles = (e.labels || [e.folder]).map(l => l.toLowerCase());
                        return roles.includes('sent') || roles.includes('trash') || roles.includes('junk');
                    })
                    .flatMap(e => e.to || [])
                    .map(t => {
                        const name  = (t.name  || '').trim();
                        const email = (t.email || (typeof t === 'string' ? t : '')).trim();
                        return (name && name !== email) ? `${name} <${email}>`.toLowerCase() : email.toLowerCase();
                    });
                const uniqueRecipients = Array.from(new Set(recipients));
                displayNames = uniqueRecipients.length > 0 ? uniqueRecipients.join(', ') : '(No Recipient)';
            } else {
                displayNames = Array.from(thread.participants).map(p => {
                    const name  = this.extractName(p);
                    const email = this.extractEmail(p);
                    return (name && name !== email) ? `${name} <${email}>`.toLowerCase() : email.toLowerCase();
                }).join(', ');
            }

            const countBadge = thread.emails.length > 1
                ? `<span class="badge badge-secondary ml-1">${thread.emails.length}</span>` : '';
            const isSelected = this.state.selectedThreadIds.has(thread.id);

            return `
            <tr class="message ${isRead ? 'read' : 'unread'} ${isSelected ? 'selected' : ''}"
                onclick="App.handleThreadClick('${thread.id}', event)"
                oncontextmenu="App.handleContextMenu('${thread.id}', event)"
                draggable="true" ondragstart="App.handleDragStartTh('${thread.id}', event)"
                style="${isRead ? '' : 'font-weight: bold;'}">
                <td class="subject">
                    <div style="display:flex;justify-content:space-between;align-items:center;width:100%;">
                        <span class="from" style="font-weight:inherit;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-right:5px;color:#333;">
                            ${isSentView ? '<i class="fas fa-arrow-right" style="font-size:0.7em;color:#999;margin-right:4px;"></i>' : ''}
                            ${this.escape(displayNames)}
                            ${countBadge}
                        </span>
                        <span class="date" style="font-size:0.8em;color:#666;white-space:nowrap;margin-left:auto;font-weight:normal;">${this.date(thread.latestDate)}</span>
                    </div>
                    <span class="subject" style="display:block;margin-top:2px;font-weight:inherit;color:${isRead ? '#666' : '#000'}">
                        <i class="fas fa-circle" style="${dotStyle}"></i>
                        ${hasAttachments ? '<i class="fas fa-paperclip"></i> ' : ''}
                        ${this.escape(thread.subject)}
                    </span>
                </td>
            </tr>`;
        }).join('');

        document.getElementById('list-count').textContent =
            `${start + 1}-${Math.min(start + itemsPerPage, filteredThreads.length)} of ${filteredThreads.length}`;
        document.getElementById('btn-prev').classList.toggle('disabled', currentPage === 1);
        document.getElementById('btn-next').classList.toggle('disabled', currentPage === this.state.totalPages);

        if (pageThreads.length > 0 && !this.state.selectedThreadId && this.state.selectedThreadIds.size === 0) {
            this.handleThreadClick(pageThreads[0].id, { ctrlKey: false, shiftKey: false });
        }
    },

    isRead(id)     { return this.state.readSet.has(id); },
    markAsRead(id) {
        if (!this.state.readSet.has(id)) {
            this.state.readSet.add(id);
            this.saveReadSet();
        }
    },
    loadReadSet() {
        const read = JSON.parse(localStorage.getItem('cloudmail_read') || '[]');
        this.state.readSet = new Set(read);
    },
    saveReadSet() {
        localStorage.setItem('cloudmail_read', JSON.stringify(Array.from(this.state.readSet)));
    },

    async openThread(threadId) {
        if (!threadId) return;
        this.state.selectedThreadId = threadId;

        const thread = this.state.threads.find(t => t.id === threadId);
        if (!thread) return;

        thread.emails.forEach(e => this.markAsRead(e.id));
        this.renderList();

        const iframe      = document.getElementById('messagecontframe');
        const placeholder = document.getElementById('content-placeholder');

        placeholder.classList.add('hidden');
        iframe.classList.remove('hidden');

        const doc = iframe.contentWindow.document;
        doc.open();
        doc.write('<body style="font-family:sans-serif;padding:2rem;text-align:center;color:#666;">Loading Conversation...</body>');
        doc.close();

        try {
            const emailContents = await Promise.all(thread.emails.map(async (e) => {
                const cleanPath = e.path.startsWith('/') ? e.path.slice(1) : e.path;
                const res       = await fetch(cleanPath);
                const fullEmail = await res.json();
                Object.assign(e, fullEmail);
                return fullEmail;
            }));

            const emailDataList = emailContents.map(e => {
                let mockHeaders = `Message-ID: ${e.messageId || '<unknown>'}\n`;
                mockHeaders += `Date: ${new Date(e.date).toUTCString()}\n`;
                if (e.from) mockHeaders += `From: ${e.from.name ? '"' + e.from.name + '" ' : ''}<${e.from.email || ''}>\n`;
                if (e.to && e.to.length) mockHeaders += `To: ${e.to.map(t => (t.name ? '"' + t.name + '" ' : '') + '<' + (t.email || '') + '>').join(', ')}\n`;
                if (e.cc && e.cc.length) mockHeaders += `Cc: ${e.cc.map(t => (t.name ? '"' + t.name + '" ' : '') + '<' + (t.email || '') + '>').join(', ')}\n`;
                mockHeaders += `Subject: ${e.subject ? e.subject.replace(/\n/g, ' ') : ''}\n`;
                mockHeaders += 'MIME-Version: 1.0\n';
                mockHeaders += 'Content-Type: multipart/alternative; boundary="--=_NextPart_000_"\n';
                return {
                    id: e.id,
                    headersRaw: e.headers || mockHeaders,
                    bodyPlain:  e.body     || '',
                    bodyHtml:   e.bodyHtml || '',
                    isHtml:     !!e.bodyHtml
                };
            });

            const emailsDataJson = JSON.stringify(emailDataList);
            const styles = `
                <link rel="stylesheet" href="deps/bootstrap.min.css">
                <style>
                    body { font-family: -apple-system, sans-serif; padding: 20px; background: #f5f5f5; }
                    .email-card { background: #fff; border: 1px solid #ddd; border-radius: 5px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
                    .email-header { padding: 15px; border-bottom: 1px solid #eee; background: #fafafa; cursor: pointer; }
                    .email-header:hover { background: #f0f0f0; }
                    .subject { font-size: 1.2rem; font-weight: bold; margin-bottom: 5px; }
                    .meta { color: #666; font-size: 0.9rem; display: flex; justify-content: space-between; }
                    .body { padding: 20px; line-height: 1.6; }
                    .attachments { background: #f9f9f9; padding: 10px; border-top: 1px solid #eee; }
                    .badge { margin-right: 5px; }
                    .email-card.collapsed .body, .email-card.collapsed .attachments, .email-card.collapsed .details-panel { display: none; }
                    .mail-controls { font-size: 0.85rem; padding-top: 2px; }
                    .mail-controls a { color: #007bff; text-decoration: none; margin-right: 15px; }
                    .mail-controls a:hover { text-decoration: underline; }
                    .details-panel { background: #fdfdfd; border-top: 1px solid #eee; margin-top: 10px; padding: 10px; font-size: 0.9rem; color: #444; }
                    .details-table td { padding: 4px 8px; vertical-align: top; }
                    .details-label { font-weight: bold; color: #666; width: 100px; }
                </style>
                <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
                <script>
                    var emailsData = ${emailsDataJson};
                    function toggle(id) { document.getElementById(id).classList.toggle('collapsed'); }
                    function toggleDetails(e, idx) {
                        e.stopPropagation();
                        const details = document.getElementById('details-' + idx);
                        if (details) details.style.display = details.style.display === 'none' ? 'block' : 'none';
                    }
                    function viewHeaders(e, idx) {
                        e.stopPropagation();
                        if (window.parent && window.parent.App && window.parent.App.viewHeaders) {
                            window.parent.App.viewHeaders(emailsData[idx].headersRaw);
                        } else {
                            alert("Headers:\\n" + emailsData[idx].headersRaw);
                        }
                    }
                    function togglePlainText(e, idx) {
                        e.stopPropagation();
                        const data   = emailsData[idx];
                        const bodyEl = document.getElementById('body-' + idx);
                        const btn    = document.getElementById('btn-plain-' + idx);
                        data.isHtml  = !data.isHtml;
                        if (data.isHtml && data.bodyHtml) {
                            bodyEl.innerHTML = data.bodyHtml;
                            btn.innerHTML = '<i class="fas fa-file-alt"></i> Plain text';
                        } else {
                            const escapedPlain = data.bodyPlain
                                .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
                            bodyEl.innerHTML = '<pre style="white-space:pre-wrap;font-family:inherit;">' + escapedPlain + '</pre>';
                            btn.innerHTML = '<i class="fas fa-code"></i> HTML';
                        }
                    }
                </script>`;

            let htmlContent = `<html><head>${styles}</head><body>`;
            emailContents.forEach((email, index) => {
                const isLast    = index === emailContents.length - 1;
                const cardId    = `card-${index}`;
                const senderName  = this.extractName(email.from);
                const senderEmail = this.extractEmail(email.from);
                const sender    = (senderName && senderName !== senderEmail)
                    ? `${senderName} <${senderEmail}>`.toLowerCase() : senderEmail.toLowerCase();
                const recipients = (email.to || []).map(t => {
                    const rName  = this.extractName(t);
                    const rEmail = this.extractEmail(t);
                    return (rName && rName !== rEmail) ? `${rName} <${rEmail}>`.toLowerCase() : rEmail.toLowerCase();
                }).join(', ');
                const cc = (email.cc || []).map(t => {
                    const rName  = this.extractName(t);
                    const rEmail = this.extractEmail(t);
                    return (rName && rName !== rEmail) ? `${rName} <${rEmail}>`.toLowerCase() : rEmail.toLowerCase();
                }).join(', ');
                const bcc = (email.bcc || []).map(t => {
                    const rName  = this.extractName(t);
                    const rEmail = this.extractEmail(t);
                    return (rName && rName !== rEmail) ? `${rName} <${rEmail}>`.toLowerCase() : rEmail.toLowerCase();
                }).join(', ');
                const attachmentsHtml = (email.attachments && email.attachments.length)
                    ? `<div class="attachments"><strong>Attachments:</strong> ` +
                      email.attachments.map(a => `<a href="${this._getAssetUrl(a.url)}" target="_blank" class="badge badge-light border"><i class="fas fa-file"></i> ${a.filename}</a>`).join('') +
                      `</div>` : '';

                htmlContent += `
                    <div id="${cardId}" class="email-card ${isLast ? '' : 'collapsed'}">
                        <div class="email-header" onclick="toggle('${cardId}')">
                            <div class="subject">${this.escape(email.subject)}</div>
                            <div class="meta">
                                <strong>${this.escape(sender)}</strong>
                                <div class="mail-controls">
                                    <a href="#" onclick="toggleDetails(event, ${index})"><i class="fas fa-list"></i> Details</a>
                                    <a href="#" onclick="viewHeaders(event, ${index})"><i class="fas fa-file-code"></i> Headers</a>
                                    <a href="#" onclick="togglePlainText(event, ${index})" id="btn-plain-${index}"><i class="fas fa-file-alt"></i> Plain text</a>
                                    <span style="color:#666;margin-left:10px;">${new Date(email.date).toLocaleString()}</span>
                                </div>
                            </div>
                            <div style="font-size:0.9rem;color:#888;margin-top:5px;">To: ${this.escape(recipients)}</div>
                            <div id="details-${index}" class="details-panel" style="display:none;" onclick="event.stopPropagation()">
                                <table class="details-table">
                                    <tr><td class="details-label">From:</td><td>${this.escape(email.from)}</td></tr>
                                    <tr><td class="details-label">To:</td><td>${this.escape(recipients)}</td></tr>
                                    ${cc  ? `<tr><td class="details-label">Cc:</td><td>${this.escape(cc)}</td></tr>` : ''}
                                    ${bcc ? `<tr><td class="details-label">Bcc:</td><td>${this.escape(bcc)}</td></tr>` : ''}
                                    <tr><td class="details-label">Date:</td><td>${new Date(email.date).toString()}</td></tr>
                                    <tr><td class="details-label">Subject:</td><td>${this.escape(email.subject)}</td></tr>
                                    <tr><td class="details-label">Message-ID:</td><td>${this.escape(email.messageId || '')}</td></tr>
                                </table>
                            </div>
                        </div>
                        <div class="body" id="body-${index}">
                            ${email.bodyHtml ? email.bodyHtml.replace(/<img[^>]*src=["']https?:\/\/www\.facebook\.com\/email_open_log_pic\.php[^>]*>/gi, '') : `<pre style="white-space:pre-wrap;font-family:inherit;">${this.escape(email.body)}</pre>`}
                        </div>
                        ${attachmentsHtml}
                    </div>`;
            });
            htmlContent += `</body></html>`;

            doc.open();
            doc.write(htmlContent);
            doc.close();
            setTimeout(() => iframe.contentWindow.scrollTo(0, 0), 100);
            document.querySelectorAll('#mailtoolbar .button').forEach(b => b.classList.remove('disabled'));

        } catch (e) {
            doc.open();
            doc.write(`<body>Error loading thread: ${e.message}</body>`);
            doc.close();
        }
    },

    openCompose() {
        this.resetComposeForm();
        this.showComposeView();
        document.getElementById('compose-to').focus();
    },

    showComposeView() {
        const components = ['layout-sidebar', 'layout-list', 'layout-content', 'calendar-view', 'contacts-view', 'campaigns-view', 'reports-view', 'automations-view', 'settings-view', 'compose-view', 'agent-view'];
        components.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.add('hidden');
        });
        document.getElementById('compose-view').classList.remove('hidden');
    },

    resetComposeForm() {
        this.state.replyContext = null;
        this.state.attachments  = [];
        this.renderAttachments();
        document.getElementById('compose-to').value      = '';
        document.getElementById('compose-subject').value = '';
        if (this.state.editor) {
            let initialContent = '';
            if (this.state.settings.autoInsertId) {
                const sig = this.state.settings.signatures.find(s => s.id === this.state.settings.autoInsertId);
                if (sig) initialContent = '<br>' + sig.content;
            }
            this.state.editor.setData(initialContent);
        }
    },

    openReply(all = false) {
        if (!this.state.selectedThreadId) return;
        const thread = this.state.threads.find(t => t.id === this.state.selectedThreadId);
        if (!thread) return;

        const latest = thread.emails[thread.emails.length - 1];
        this.state.replyContext = latest;

        const isSent = latest.folder === 'sent' || (latest.labels && latest.labels.includes('sent'));
        let rawTo    = latest.replyTo || latest.from;
        if (isSent) {
            if (Array.isArray(latest.to) && latest.to.length > 0) rawTo = latest.to[0];
            else if (typeof latest.to === 'string') rawTo = latest.to;
        }

        const nameTo      = this.extractName(rawTo);
        const emailTo     = this.extractEmail(rawTo);
        const formattedTo = (nameTo && nameTo !== emailTo) ? `${nameTo} <${emailTo}>` : emailTo;
        document.getElementById('compose-to').value = formattedTo;

        let receivedAddr = '';
        if (!isSent) {
            receivedAddr = this.extractEmail(latest.to ? (Array.isArray(latest.to) ? latest.to[0] : latest.to) : '');
        } else {
            receivedAddr = this.extractEmail(latest.from);
        }

        if (receivedAddr) {
            const selector = document.getElementById('compose-from');
            if (selector && selector.options) {
                for (let i = 0; i < selector.options.length; i++) {
                    const optEmail = selector.options[i].getAttribute('data-email') || '';
                    if (optEmail && receivedAddr.toLowerCase().includes(optEmail.toLowerCase())) {
                        selector.selectedIndex = i;
                        break;
                    }
                }
            }
        }

        document.getElementById('compose-subject').value = latest.subject.startsWith('Re:')
            ? latest.subject : `Re: ${latest.subject}`;

        const dateStr    = this.formatDate(latest.date);
        const fromName   = latest.fromName || (typeof latest.from === 'string'
            ? this.extractName(latest.from) : (latest.from.name || latest.from.email || 'Sender'));
        const quoteHeader = `<p>On ${dateStr}, ${fromName} wrote:</p>`;
        const bodyContent = latest.bodyHtml || (latest.body
            ? latest.body.replace(/\n/g, '<br>') : (latest.preview || ''));
        const quotedHtml  = `${quoteHeader}<blockquote type="cite"
            style="border-left:2px solid #3d89ea !important;padding-left:1rem;margin-left:0.5rem;color:#555;">
            ${bodyContent}</blockquote>`;

        if (this.state.editor) {
            const signature = this.state.settings.autoInsert ? this.getSignatureHtml() : '';
            this.state.editor.setData('<p><br></p>' + signature + '<br>' + quotedHtml);
        }

        this.state.attachments = [];
        this.renderAttachments();
        this.showComposeView();
        document.getElementById('compose-to').focus();
    },

    viewHeaders(rawHeaders) {
        const modalHtml = `
        <div class="modal fade" id="headersModal" tabindex="-1" role="dialog" aria-hidden="true">
            <div class="modal-dialog modal-lg" role="document">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Message Headers</h5>
                        <button type="button" class="close" data-dismiss="modal" aria-label="Close"
                                onclick="$('#headersModal').modal('hide')">
                            <span aria-hidden="true">&times;</span>
                        </button>
                    </div>
                    <div class="modal-body" style="background:#f8f9fa;">
                        <pre style="white-space:pre-wrap;font-size:13px;font-family:monospace;color:#333;">
                            ${this.escape(rawHeaders)}
                        </pre>
                    </div>
                </div>
            </div>
        </div>`;
        const oldModal = document.getElementById('headersModal');
        if (oldModal) oldModal.remove();
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        $('#headersModal').modal('show');
    },

    toggleComposeHeader(header) {
        const row = document.getElementById('row-' + header);
        if (row) row.classList.toggle('hidden');
    },

    openForward() {
        if (!this.state.selectedThreadId) return;
        const thread = this.state.threads.find(t => t.id === this.state.selectedThreadId);
        if (!thread) return;

        const latest = thread.emails[thread.emails.length - 1];
        document.getElementById('compose-to').value      = '';
        document.getElementById('compose-subject').value = 'Fwd: ' + latest.subject;

        const dateStr = new Date(latest.date).toLocaleString();
        const header  = `<br><br>-------- Forwarded Message --------<br>Subject: ${latest.subject}<br>Date: ${dateStr}<br>From: ${latest.from}<br>To: ${latest.to.map(t => t.email).join(', ')}<br><br>`;
        const body    = latest.bodyHtml || (latest.body ? latest.body.replace(/\n/g, '<br>') : (latest.preview || ''));

        if (this.state.editor) this.state.editor.setData(header + body + (this.state.settings.autoInsert ? this.getSignatureHtml() : ''));
        this.state.attachments = [];
        this.renderAttachments();
        this.showComposeView();
        document.getElementById('compose-to').focus();
    },

    hideCompose() {
        if (this.state.isStandaloneCompose) { window.close(); return; }
        document.getElementById('compose-view').classList.add('hidden');
        this.state.attachments = [];
        this.switchTask(this.state.currentTask || 'mail');
    },

    openExternalCompose() {
        const data = {
            to:      document.getElementById('compose-to').value,
            subject: document.getElementById('compose-subject').value,
            html:    this.state.editor ? this.state.editor.getData() : ''
        };
        localStorage.setItem('cloudmail_ext_compose_data', JSON.stringify(data));
        window.open(window.location.pathname + '?mode=compose', 'Compose', 'width=1000,height=800');
        this.hideCompose();
    },

    async sendEmail() {
        const fromSelector  = document.getElementById('compose-from');
        const selectedOption = fromSelector.options[fromSelector.selectedIndex];
        const rawHtml       = this.state.editor ? this.state.editor.getData() : '';
        const text          = rawHtml.replace(/<[^>]*>/g, '');

        const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
            body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; }
            .email-content { max-width: 100%; word-wrap: break-word; }
            h1, h2, h3 { color: #222; margin-top: 1.2em; margin-bottom: 0.6em; }
            p { margin-bottom: 1em; }
            ul, ol { padding-left: 1.5em; margin-bottom: 1em; }
            li { margin-bottom: 0.5em; }
            blockquote { border-left: 4px solid #ddd; padding-left: 15px; color: #666; font-style: italic; margin: 1.5em 0; }
            a { color: #007bff; text-decoration: none; }
            img { max-width: 100%; height: auto; display: block; margin: 10px 0; }
            pre { background: #f8f9fa; padding: 10px; border-radius: 4px; overflow-x: auto; font-family: monospace; }
            table { border-collapse: collapse; width: 100%; margin-bottom: 1em; }
            table td, table th { border: 1px solid #ddd; padding: 8px; }
        </style></head><body><div class="email-content">${rawHtml}</div></body></html>`;

        const formData = new FormData();
        formData.append('accountId', fromSelector.value);
        formData.append('relay',     document.getElementById('compose-relay').value);
        formData.append('from',      selectedOption.getAttribute('data-email') || selectedOption.text);
        formData.append('to',        document.getElementById('compose-to').value);
        formData.append('subject',   document.getElementById('compose-subject').value);
        formData.append('text', text);
        formData.append('html', html);

        if (this.state.replyContext) {
            formData.append('messageId',  this.state.replyContext.messageId);
            formData.append('references', (this.state.replyContext.references || '') + ' ' + (this.state.replyContext.messageId || ''));
        }
        this.state.attachments.forEach(file => formData.append('attachments', file));

        try {
            document.getElementById('list-loading').classList.remove('hidden');
            const res    = await fetch('/api/send', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ` },
                body: formData
            });
            const result = await res.json();
            document.getElementById('list-loading').classList.add('hidden');

            if (result.success) {
                alert('Email sent successfully!');
                this.hideCompose();
                setTimeout(() => this.loadEmails(), 500);
            } else {
                alert('Failed to send: ' + result.error);
            }
        } catch (e) {
            document.getElementById('list-loading').classList.add('hidden');
            alert('Error connecting to reply server: ' + e.message);
        }
    },

    addAttachments(files) {
        this.state.attachments = [...this.state.attachments, ...files];
        this.renderAttachments();
    },

    removeAttachment(index) {
        this.state.attachments.splice(index, 1);
        this.renderAttachments();
    },

    renderAttachments() {
        const list = document.getElementById('attachment-list');
        if (!list) return;
        list.innerHTML = this.state.attachments.map((file, i) => `
            <div style="display:flex;align-items:center;background:#f0f4f8;padding:5px 10px;border-radius:4px;margin-bottom:5px;font-size:12px;">
                <i class="fa-solid fa-file" style="margin-right:8px;color:#5c6c7c;"></i>
                <span style="flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;"
                      title="${this.escape(file.name)}">${this.escape(file.name)}</span>
                <span style="color:#888;margin:0 10px;">${(file.size / 1024).toFixed(1)} KB</span>
                <i class="fa-solid fa-xmark" style="cursor:pointer;color:#d9534f;"
                   onclick="App.removeAttachment(${i})"></i>
            </div>`).join('');
    },

    async triggerSync() {
        const btn  = document.querySelector('.toolbar-button.refresh');
        if (btn.classList.contains('disabled')) return;
        btn.classList.add('disabled');
        const icon         = btn.querySelector('.inner');
        const originalText = icon.textContent;
        icon.textContent   = 'Syncing...';

        try {
            const res  = await fetch('/api/sync', { method: 'POST' });
            const data = await res.json();

            if (res.ok) {
                console.log('Sync triggered:', data?.message);
                if (data?.message?.includes('GitHub Action')) {
                    alert('Sync started via GitHub Action! It may take a few minutes to complete.');
                } else if (data?.message?.includes('completed')) {
                    alert('Sync complete! Your emails are now refreshed.');
                    this.loadEmails();
                } else {
                    alert('Background sync started! Your emails will refresh shortly.');
                    setTimeout(() => this.loadEmails(), 4000);
                }
                btn.classList.remove('disabled');
                icon.textContent = originalText;
            } else {
                const errorMsg = data.details
                    ? `Sync failed: ${data.details}` : `Sync failed: ${data.error || 'Unknown error'}`;
                alert(errorMsg);
                btn.classList.remove('disabled');
                icon.textContent = originalText;
            }
        } catch (e) {
            alert('Sync request failed. Make sure you are connected.');
            btn.classList.remove('disabled');
            icon.textContent = originalText;
        }
    },

    handleThreadClick(threadId, e) {
        const { ctrlKey, shiftKey } = e;
        const thread = this.state.filteredThreads.find(t => t.id === threadId);
        if (!thread) return;

        if (shiftKey && this.state.lastSelectedThreadId) {
            if (!ctrlKey) this.state.selectedThreadIds.clear();
            const threadIds = this.state.filteredThreads.map(t => t.id);
            const startIdx  = threadIds.indexOf(this.state.lastSelectedThreadId);
            const endIdx    = threadIds.indexOf(threadId);
            const [min, max] = [Math.min(startIdx, endIdx), Math.max(startIdx, endIdx)];
            for (let i = min; i <= max; i++) this.state.selectedThreadIds.add(threadIds[i]);
        } else if (ctrlKey) {
            if (this.state.selectedThreadIds.has(threadId)) this.state.selectedThreadIds.delete(threadId);
            else this.state.selectedThreadIds.add(threadId);
        } else {
            this.state.selectedThreadIds.clear();
            this.state.selectedThreadIds.add(threadId);
        }

        this.state.lastSelectedThreadId = threadId;
        this.openThread(threadId);
        this.renderList();
    },

    handleContextMenu(threadId, e) {
        e.preventDefault();
        if (!this.state.selectedThreadIds.has(threadId)) {
            this.state.selectedThreadIds.clear();
            this.state.selectedThreadIds.add(threadId);
            this.state.lastSelectedThreadId = threadId;
            this.state.selectedThreadId     = threadId;
            this.renderList();
        }
        const menu = document.getElementById('context-menu');
        menu.style.display = 'block';
        menu.style.left    = e.clientX + 'px';
        menu.style.top     = e.clientY + 'px';
    },

    async batchAction(action) {
        if (this.state.selectedThreadIds.size === 0 && !this.state.selectedThreadId && this.state.selectedGroups.size === 0) {
            alert('No messages or groups selected');
            return;
        }

        let ids = this.state.selectedThreadIds.size > 0
            ? Array.from(this.state.selectedThreadIds)
            : (this.state.selectedThreadId ? [this.state.selectedThreadId] : []);

        if (this.state.selectedGroups.size > 0) {
            const groupThreads = this.state.threads.filter(thread =>
                thread.emails.some(e =>
                    Array.from(this.state.selectedGroups).some(groupKey => {
                        const [type, val] = [
                            groupKey.substring(0, groupKey.indexOf(':')),
                            groupKey.substring(groupKey.indexOf(':') + 1)
                        ];
                        if (type === 'date') {
                            const parts = val.split('/');
                            const d = new Date(e.date);
                            const y   = String(d.getFullYear());
                            const m   = String(d.getMonth() + 1).padStart(2, '0');
                            const day = String(d.getDate()).padStart(2, '0');
                            if (parts[0] && y   !== parts[0]) return false;
                            if (parts[1] && m   !== parts[1]) return false;
                            if (parts[2] && day !== parts[2]) return false;
                            return true;
                        } else if (type === 'sender') {
                            const parts      = val.split('/');
                            const domain     = this.getRootDomain(e.from);
                            const senderName = (e.fromName || (typeof e.from === 'string'
                                ? e.from.split('@')[0]
                                : (e.from?.name || e.from?.email || 'sender'))).toLowerCase();
                            if (parts[0] && domain     !== parts[0]) return false;
                            if (parts[1] && senderName !== parts[1]) return false;
                            return true;
                        }
                        return false;
                    })
                )
            ).map(t => t.id);
            ids = Array.from(new Set([...ids, ...groupThreads]));
        }

        const threadsToProcess = this.state.threads.filter(t => ids.includes(t.id));

        if (action === 'read' || action === 'unread') {
            threadsToProcess.forEach(t => {
                t.emails.forEach(e => {
                    if (action === 'read') this.state.readSet.add(e.id);
                    else this.state.readSet.delete(e.id);
                });
            });
            this.saveReadSet();
        } else if (action === 'delete') {
            const emailIds = [];
            threadsToProcess.forEach(t => {
                this.state.deletedThreadIds.add(t.id);
                t.emails.forEach(e => {
                    this.state.deletedThreadIds.add(e.id);
                    emailIds.push(e.id);
                });
            });
            this.state.selectedThreadIds.clear();
            this.state.selectedThreadId = null;
            await this.saveDeletions([...ids, ...emailIds]);
            document.getElementById('content-placeholder').classList.remove('hidden');
            document.getElementById('messagecontframe').classList.add('hidden');
        } else if (action === 'junk') {
            this.markAsJunk(ids);
        }

        this.filterEmails();
        this.renderGroups();
    },

    handleDragStartTh(threadId, e) {
        if (!this.state.selectedThreadIds.has(threadId)) {
            this.state.selectedThreadIds.clear();
            this.state.selectedThreadIds.add(threadId);
            this.renderList();
        }
        e.dataTransfer.setData('application/json', JSON.stringify({
            type: 'threads', ids: Array.from(this.state.selectedThreadIds)
        }));
        e.dataTransfer.effectAllowed = 'move';
    },

    handleDragStartGr(type, value, e) {
        const groupKey = `${type}:${value}`;
        if (!this.state.selectedGroups.has(groupKey)) {
            this.state.selectedGroups.clear();
            this.state.selectedGroups.add(groupKey);
            this.renderGroups();
        }
        e.dataTransfer.setData('application/json', JSON.stringify({
            type: 'groups', groups: Array.from(this.state.selectedGroups)
        }));
        e.dataTransfer.effectAllowed = 'move';
    },

    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    },

    handleDropToJunk(e) {
        e.preventDefault();
        try {
            const dataStr = e.dataTransfer.getData('application/json');
            if (!dataStr) return;
            const data = JSON.parse(dataStr);

            if (data.type === 'threads') {
                this.markAsJunk(data.ids);
            } else if (data.type === 'groups') {
                let allIds = [];
                let domainsToAdd = [];
                data.groups.forEach(groupKey => {
                    const [type, val] = [
                        groupKey.substring(0, groupKey.indexOf(':')),
                        groupKey.substring(groupKey.indexOf(':') + 1)
                    ];
                    if (type === 'sender') {
                        const parts  = val.split('/');
                        const domain = parts[0];
                        if (domain && !parts[1] && !domainsToAdd.includes(domain)) {
                            domainsToAdd.push(domain.toLowerCase());
                        }
                    }
                    const groupThreads = this.state.threads.filter(thread =>
                        thread.emails.some(email => {
                            if (type === 'date') {
                                const parts = val.split('/');
                                const d   = new Date(email.date);
                                const y   = String(d.getFullYear());
                                const m   = String(d.getMonth() + 1).padStart(2, '0');
                                const day = String(d.getDate()).padStart(2, '0');
                                if (parts[0] && y   !== parts[0]) return false;
                                if (parts[1] && m   !== parts[1]) return false;
                                if (parts[2] && day !== parts[2]) return false;
                                return true;
                            } else if (type === 'sender') {
                                const parts      = val.split('/');
                                const domain     = this.getRootDomain(email.from);
                                const senderName = (email.fromName || (typeof email.from === 'string'
                                    ? email.from.split('@')[0]
                                    : (email.from?.name || email.from?.email || 'sender'))).toLowerCase();
                                if (parts[0] && domain     !== parts[0]) return false;
                                if (parts[1] && senderName !== parts[1]) return false;
                                return true;
                            }
                            return false;
                        })
                    ).map(t => t.id);
                    allIds = [...allIds, ...groupThreads];
                });
                this.markAsJunk(Array.from(new Set(allIds)), domainsToAdd);
            }
        } catch (err) {
            console.error('Failed to parse drop data', err);
        }
    },

    async markAsJunk(threadIds, domainsToAdd = []) {
        if ((!threadIds || threadIds.length === 0) && (!domainsToAdd || domainsToAdd.length === 0)) return;

        if (this.state.isReplyServerUp === false) {
            const proceed = confirm('The reply server appears to be offline. Do you want to hide these emails locally anyway?');
            if (!proceed) return;
            (threadIds || []).forEach(tid => {
                this.state.deletedThreadIds.add(tid);
                const thread = this.state.threads.find(t => t.id === tid);
                if (thread) thread.emails.forEach(e => this.state.deletedThreadIds.add(e.id));
            });
            await this.saveDeletions();
            this.filterEmails();
            this.renderGroups();
            return;
        }

        const emailAddresses = [];
        const allEmailIds    = [];
        (threadIds || []).forEach(tid => {
            const thread = this.state.threads.find(t => t.id === tid);
            if (thread) {
                thread.emails.forEach(e => allEmailIds.push(e.id));
                const latestEmail = thread.emails[thread.emails.length - 1];
                if (latestEmail) {
                    const email = this.extractEmail(latestEmail.from);
                    if (email && !emailAddresses.includes(email)) emailAddresses.push(email);
                    const domainPart = email.split('@')[1];
                    if (domainPart) {
                        const parts      = domainPart.split('.');
                        const rootDomain = parts.length > 2 ? parts.slice(-2).join('.') : domainPart;
                        const commonDomains = ['gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com', 'icloud.com', 'me.com', 'live.com', 'msn.com', 'aol.com', 'mac.com'];
                        if (!commonDomains.includes(rootDomain) && !domainsToAdd.includes(rootDomain)) {
                            domainsToAdd.push(rootDomain);
                        }
                    }
                }
                this.state.deletedThreadIds.add(tid);
                thread.emails.forEach(e => this.state.deletedThreadIds.add(e.id));
            }
        });

        try {
            const response = await fetch(`/api/junk`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-API-Key': '' },
                body: JSON.stringify({ ids: allEmailIds, emails: emailAddresses, domains: domainsToAdd })
            });
            const result = await response.json();
            if (result.success) {
                await this.saveDeletions([...(threadIds || []), ...allEmailIds]);
                this.state.selectedThreadIds.clear();
                this.state.selectedThreadId = null;
                this.loadBlacklist();
                this.renderGroups();
                const placeholder = document.getElementById('content-placeholder');
                const frame       = document.getElementById('messagecontframe');
                if (placeholder && frame) {
                    placeholder.classList.remove('hidden');
                    frame.classList.add('hidden');
                }
            } else {
                alert('Failed to mark as junk: ' + result.error);
            }
        } catch (err) {
            console.error('Error marking as junk:', err);
            alert('Error connecting to server to mark as junk.');
        }
    },

    async loadDeletions() {
        const local = JSON.parse(localStorage.getItem('cloudmail_deleted') || '[]');
        this.state.deletedThreadIds = new Set(local);
        try {
            const res = await fetch('/api/deleted');
            if (res.ok) {
                const kvIds = await res.json();
                kvIds.forEach(id => this.state.deletedThreadIds.add(id));
                this.saveLocalDeletions();
            }
        } catch (e) {
            console.warn('Could not load deletions from KV:', e);
        }
    },

    saveLocalDeletions() {
        localStorage.setItem('cloudmail_deleted', JSON.stringify(Array.from(this.state.deletedThreadIds)));
    },

    async saveDeletions(newIds = []) {
        const ids   = Array.from(this.state.deletedThreadIds);
        this.saveLocalDeletions();
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        if (isLocal) return;
        try {
            await fetch('/api/deleted', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: newIds.length > 0 ? newIds : ids, action: 'add' })
            });
        } catch (e) {
            console.warn('Could not persist deletions to KV:', e);
        }
    },

    saveDraft() {
        const subject = document.getElementById('compose-subject').value || '(No Subject)';
        const html    = this.state.editor ? this.state.editor.getData() : '';
        console.log('Draft data:', { subject, html });
        alert('Draft saved locally.');
    },

    renderBlacklist() {
        const container = document.getElementById('blacklist-container');
        if (!container) return;
        const bl = this.state.blacklist || { emails: [], domains: [] };
        if (!bl.emails)  bl.emails  = [];
        if (!bl.domains) bl.domains = [];
        if (!bl.emails.length && !bl.domains.length) {
            container.innerHTML = '<p style="color:#666;text-align:center;padding:40px;">The blacklist is empty.</p>';
            return;
        }
        const query  = (this.state.blacklistSearchQuery || '').toLowerCase();
        const groups = {};
        bl.domains.forEach(domain => {
            const d = domain.toLowerCase();
            if (query && !d.includes(query)) return;
            if (!groups[d]) groups[d] = { domainBlocked: true, emails: [] };
            else groups[d].domainBlocked = true;
        });
        bl.emails.forEach(email => {
            const parts = email.split('@');
            if (parts.length === 2) {
                const d = parts[1].toLowerCase();
                if (query && !email.toLowerCase().includes(query) && !d.includes(query)) return;
                if (!groups[d]) groups[d] = { domainBlocked: false, emails: [] };
                groups[d].emails.push(email);
            }
        });
        if (Object.keys(groups).length === 0) {
            container.innerHTML = `<p style="color:#666;text-align:center;padding:40px;">${query ? 'No matching items found.' : 'The blacklist is empty.'}</p>`;
            return;
        }
        let html = '';
        Object.keys(groups).sort().forEach(domain => {
            html += `<h6 style="font-weight:bold;margin-bottom:5px;margin-top:20px;padding-bottom:5px;border-bottom:2px solid #ddd;color:#333;">@${domain}</h6>`;
            const group = groups[domain];
            if (group.domainBlocked) {
                html += `<div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #eee;padding:8px 0;background:#fff3f3;padding-left:10px;">
                    <span style="color:#d73a49;font-weight:500;"><i class="fas fa-ban"></i> Entire Domain Blocked</span>
                    <button class="btn btn-sm btn-outline-danger" onclick="App.removeBlacklistItem('domain', '${domain}')"><i class="fas fa-trash"></i> Remove</button>
                </div>`;
            }
            group.emails.sort().forEach(email => {
                html += `<div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #eee;padding:8px 0;padding-left:10px;">
                    <span>${email}</span>
                    <button class="btn btn-sm btn-outline-danger" onclick="App.removeBlacklistItem('email', '${email}')"><i class="fas fa-trash"></i> Remove</button>
                </div>`;
            });
        });
        container.innerHTML = html;
    },

    async addBlacklistItem() {
        const input = document.getElementById('blacklist-add-input');
        if (!input) return;
        const val = input.value.trim().toLowerCase();
        if (!val) return;
        if (!this.state.blacklist) this.state.blacklist = { emails: [], domains: [] };
        if (val.includes('@')) { if (!this.state.blacklist.emails.includes(val))  this.state.blacklist.emails.push(val); }
        else                   { if (!this.state.blacklist.domains.includes(val)) this.state.blacklist.domains.push(val); }
        await this.saveBlacklist();
        input.value = '';
    },

    async removeBlacklistItem(type, value) {
        if (!this.state.blacklist) return;
        if (type === 'email')  this.state.blacklist.emails  = this.state.blacklist.emails.filter(e => e !== value);
        if (type === 'domain') this.state.blacklist.domains = this.state.blacklist.domains.filter(d => d !== value);
        await this.saveBlacklist();
    },

    async saveBlacklist() {
        try {
            await fetch('/api/blacklist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(this.state.blacklist)
            });
            this.renderBlacklist();
        } catch (e) {
            console.error('Failed to save blacklist:', e);
            alert('Failed to update blacklist on server.');
        }
    },

    renderWhitelist() {
        const container = document.getElementById('whitelist-container');
        if (!container) return;
        const wl = this.state.whitelist || { emails: [], domains: [] };
        if (!wl.emails)  wl.emails  = [];
        if (!wl.domains) wl.domains = [];
        if (!wl.emails.length && !wl.domains.length) {
            container.innerHTML = '<p style="color:#666;text-align:center;padding:40px;">The whitelist is empty.</p>';
            return;
        }
        const query  = (this.state.whitelistSearchQuery || '').toLowerCase();
        const groups = {};
        wl.domains.forEach(domain => {
            const d = domain.toLowerCase();
            if (query && !d.includes(query)) return;
            if (!groups[d]) groups[d] = { domainWhitelisted: true, emails: [] };
            else groups[d].domainWhitelisted = true;
        });
        wl.emails.forEach(email => {
            const parts = email.split('@');
            if (parts.length === 2) {
                const d = parts[1].toLowerCase();
                if (query && !email.toLowerCase().includes(query) && !d.includes(query)) return;
                if (!groups[d]) groups[d] = { domainWhitelisted: false, emails: [] };
                groups[d].emails.push(email);
            }
        });
        if (Object.keys(groups).length === 0) {
            container.innerHTML = `<p style="color:#666;text-align:center;padding:40px;">${query ? 'No matching items found.' : 'The whitelist is empty.'}</p>`;
            return;
        }
        let html = '';
        Object.keys(groups).sort().forEach(domain => {
            html += `<h6 style="font-weight:bold;margin-bottom:5px;margin-top:20px;padding-bottom:5px;border-bottom:2px solid #ddd;color:#333;">@${domain}</h6>`;
            const group = groups[domain];
            if (group.domainWhitelisted) {
                html += `<div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #eee;padding:8px 0;background:#e6ffed;padding-left:10px;">
                    <span style="color:#1a7f37;font-weight:500;"><i class="fas fa-check-circle"></i> Entire Domain Whitelisted</span>
                    <button class="btn btn-sm btn-outline-danger" onclick="App.removeWhitelistItem('domain', '${domain}')"><i class="fas fa-trash"></i> Remove</button>
                </div>`;
            }
            group.emails.sort().forEach(email => {
                html += `<div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #eee;padding:8px 0;padding-left:10px;">
                    <span>${email}</span>
                    <button class="btn btn-sm btn-outline-danger" onclick="App.removeWhitelistItem('email', '${email}')"><i class="fas fa-trash"></i> Remove</button>
                </div>`;
            });
        });
        container.innerHTML = html;
    },

    async addWhitelistItem() {
        const input = document.getElementById('whitelist-add-input');
        if (!input) return;
        const val = input.value.trim().toLowerCase();
        if (!val) return;
        if (!this.state.whitelist) this.state.whitelist = { emails: [], domains: [] };
        if (val.includes('@')) { if (!this.state.whitelist.emails.includes(val))  this.state.whitelist.emails.push(val); }
        else                   { if (!this.state.whitelist.domains.includes(val)) this.state.whitelist.domains.push(val); }
        await this.saveWhitelist();
        input.value = '';
    },

    async removeWhitelistItem(type, value) {
        if (!this.state.whitelist) return;
        if (!confirm('Are you sure you want to remove this item from the Whitelist?')) return;
        if (type === 'email')  this.state.whitelist.emails  = this.state.whitelist.emails.filter(e => e !== value);
        if (type === 'domain') this.state.whitelist.domains = this.state.whitelist.domains.filter(d => d !== value);
        await this.saveWhitelist();
    },

    async saveWhitelist() {
        try {
            await fetch('/api/whitelist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(this.state.whitelist)
            });
            this.renderWhitelist();
        } catch (e) {
            console.error('Failed to save whitelist:', e);
            alert('Failed to update whitelist on server.');
        }
    },

    openResponses() {
        const choice = prompt('Select Response:\n1. Thank You\n2. Meeting');
        if (choice === '1') this.state.editor.setData(this.state.editor.getData() + '<br>Thank you for your email.');
        if (choice === '2') this.state.editor.setData(this.state.editor.getData() + '<br>Are you available for a meeting?');
    }
};
