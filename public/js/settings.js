/**
 * settings.js — Signature and Preferences Settings domain mixin.
 * Handles custom signature editing, auto-insertion, and configuration settings.
 */

export const SettingsMixin = {
    // =========================================================================
    // METHODS
    // =========================================================================

    getSignatureHtml() {
        if (!this.state.settings.autoInsertId) return '';
        const sig = this.state.settings.signatures.find(s => s.id === this.state.settings.autoInsertId);
        return sig ? '<br>' + sig.content : '';
    },

    insertSignature() {
        if (!this.state.editor) return;
        if (this.state.settings.signatures.length === 0) {
            alert('No custom signatures defined. Please go to Settings.');
            return;
        }
        const listHtml = this.state.settings.signatures.map(s => `
            <div style="padding:10px;border-bottom:1px solid #eee;cursor:pointer;color:#333;"
                 onclick="App.applySignature('${s.id}'); document.getElementById('sig-picker-overlay').remove();">
                <b>${s.name}</b>
            </div>`).join('');
        const picker = document.createElement('div');
        picker.id    = 'sig-picker-overlay';
        picker.style = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#fff;border:1px solid #ccc;box-shadow:0 10px 30px rgba(0,0,0,0.3);z-index:10000;min-width:250px;border-radius:8px;overflow:hidden;';
        picker.innerHTML = `
            <div style="background:#f4f4f4;padding:10px 15px;border-bottom:1px solid #ddd;font-weight:bold;display:flex;justify-content:space-between;">
                <span>Select Signature</span>
                <span style="cursor:pointer;" onclick="document.getElementById('sig-picker-overlay').remove()">×</span>
            </div>
            <div style="max-height:300px;overflow-y:auto;">${listHtml}</div>`;
        document.body.appendChild(picker);
    },

    applySignature(id) {
        const sig = this.state.settings.signatures.find(s => s.id === id);
        if (!sig || !this.state.editor) return;
        const sigHtml     = '<br>' + sig.content;
        const currentData = this.state.editor.getData();
        this.state.editor.setData(currentData + (currentData.endsWith('<br>') || currentData === '' ? '' : '<br>') + sigHtml);
    },

    addSignature() {
        this.state.editingSigId = null;
        document.getElementById('sig-edit-name').value = '';
        if (this.state.sigEditor) this.state.sigEditor.setData('');
        this.showSignatureEditor();
    },

    editSignature(id) {
        const sig = this.state.settings.signatures.find(s => s.id === id);
        if (!sig) return;
        this.state.editingSigId = id;
        document.getElementById('sig-edit-name').value = sig.name;
        if (this.state.sigEditor) this.state.sigEditor.setData(sig.content);
        this.showSignatureEditor();
    },

    showSignatureEditor() {
        document.getElementById('signature-list-container').classList.add('hidden');
        document.getElementById('signature-editor-container').classList.remove('hidden');
    },

    hideSignatureEditor() {
        document.getElementById('signature-editor-container').classList.add('hidden');
        document.getElementById('signature-list-container').classList.remove('hidden');
        this.state.editingSigId = null;
    },

    saveSignature() {
        const name    = document.getElementById('sig-edit-name').value.trim();
        const content = this.state.sigEditor ? this.state.sigEditor.getData() : '';
        if (!name)    return alert('Please enter a name');
        if (!content) return alert('Signature content cannot be empty');

        if (this.state.editingSigId) {
            const sig = this.state.settings.signatures.find(s => s.id === this.state.editingSigId);
            if (sig) { sig.name = name; sig.content = content; }
        } else {
            this.state.settings.signatures.push({ id: 'sig_' + Date.now(), name, content });
        }
        this.saveSettings();
        this.renderSignatureList();
        this.hideSignatureEditor();
    },

    removeSignature(id) {
        if (!confirm('Are you sure you want to delete this signature?')) return;
        this.state.settings.signatures = this.state.settings.signatures.filter(s => s.id !== id);
        if (this.state.settings.autoInsertId === id) this.state.settings.autoInsertId = null;
        this.saveSettings();
        this.renderSignatureList();
    },

    toggleAutoInsert(id) {
        this.state.settings.autoInsertId = this.state.settings.autoInsertId === id ? null : id;
        this.saveSettings();
        this.renderSignatureList();
    },

    loadSettings() {
        const saved = localStorage.getItem('cloudmail_settings');
        if (saved) {
            const data = JSON.parse(saved);
            if (data.signature) {
                this.state.settings.signatures  = [{ id: 'sig_default', name: 'Default', content: data.signature }];
                this.state.settings.autoInsertId = data.autoInsert ? 'sig_default' : null;
            } else {
                this.state.settings = data;
            }
        }
    },

    saveSettings() {
        localStorage.setItem('cloudmail_settings', JSON.stringify(this.state.settings));
    },

    renderSettings() {
        this.renderSignatureList();
        this.loadBlacklist();
        this.loadWhitelist();
    },

    switchSettingsTab(tab, event) {
        if (event) event.preventDefault();
        const tabs = ['signatures', 'blacklist', 'whitelist', 'preferences', 'folders'];
        tabs.forEach(t => {
            document.getElementById('tab-' + t)?.classList.remove('selected');
            const contentEl = document.getElementById('settings-' + t);
            if (contentEl) contentEl.style.display = 'none';
        });
        document.getElementById('tab-' + tab)?.classList.add('selected');
        const activeContent = document.getElementById('settings-' + tab);
        if (activeContent) activeContent.style.display = 'flex';
        if (tab === 'blacklist') this.loadBlacklist();
        else if (tab === 'whitelist') this.loadWhitelist();
    },

    renderSignatureList() {
        const container = document.getElementById('signature-list-container');
        if (!container) return;
        if (this.state.settings.signatures.length === 0) {
            container.innerHTML = '<p style="color:#666;text-align:center;padding:40px;">No custom signatures yet. Click "+ Add New" to create one.</p>';
            return;
        }
        container.innerHTML = this.state.settings.signatures.map(sig => {
            const isAuto = this.state.settings.autoInsertId === sig.id;
            return `
                <div style="border:1px solid #e2e2e2;border-radius:8px;padding:20px;margin-bottom:20px;background:#fff;position:relative;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:15px;">
                        <span style="font-weight:bold;font-size:15px;">${sig.name}</span>
                        <div style="display:flex;gap:10px;">
                            <button class="btn btn-sm btn-outline-info" onclick="App.editSignature('${sig.id}')">
                                <i class="fas fa-edit"></i> Edit
                            </button>
                            <button class="btn btn-sm ${isAuto ? 'btn-primary' : 'btn-outline-primary'}"
                                    onclick="App.toggleAutoInsert('${sig.id}')">
                                ${isAuto ? '<i class="fas fa-check"></i> Auto-inserting' : 'Set as Auto-insert'}
                            </button>
                            <button class="btn btn-sm btn-outline-danger" onclick="App.removeSignature('${sig.id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    <div style="background:#f8f9fa;padding:15px;border-radius:4px;font-size:13px;margin:0;border:1px solid #eee;">
                        ${sig.content}
                    </div>
                </div>`;
        }).join('');
    }
};
