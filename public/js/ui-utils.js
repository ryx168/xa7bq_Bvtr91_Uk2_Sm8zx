/**
 * ui-utils.js — UI formatting/conversion utilities
 * Imported and merged into the final App object in app.js
 */

export const UiUtilsMixin = {
    getRootDomain(emailVal) {
        const email = this.extractEmail(emailVal);
        if (!email || !email.includes('@')) return 'unknown';
        return email.split('@')[1].toLowerCase();
    },

    extractEmail(val) {
        if (!val) return '';
        if (typeof val === 'string') {
            const match = val.match(/<(.+?)>/);
            return (match ? match[1] : val).toLowerCase();
        }
        if (typeof val === 'object') {
            return (val.email || val.address || val.value || '').toLowerCase();
        }
        return '';
    },

    extractName(val) {
        if (!val) return '';
        if (typeof val === 'string') {
            const match = val.match(/(.+?)\s*<.+?>/);
            return match ? match[1].replace(/['"]/g, '').trim() : val;
        }
        if (typeof val === 'object') return val.name || val.email || '';
        return '';
    },

    formatDate(date) {
        if (!date) return '';
        const d   = new Date(date);
        const y   = d.getFullYear();
        const m   = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const h   = String(d.getHours()).padStart(2, '0');
        const min = String(d.getMinutes()).padStart(2, '0');
        return `${y}-${m}-${day} ${h}:${min}`;
    },

    handleImageError(img, dateKey) {
        const state = parseInt(img.getAttribute('data-fallback-state') || '0', 10);
        if (state === 0) {
            const googleUrl = img.getAttribute('data-google-url');
            if (googleUrl) {
                img.setAttribute('data-fallback-state', '1');
                img.src = googleUrl;
                return;
            }
        }
        const container = img.closest('.event-cover');
        if (container) {
            container.style.display = 'none';
        } else {
            img.outerHTML = `<div style="width:100%;height:100%;min-height:80px;background:#f0f0f0;display:flex;align-items:center;justify-content:center;">
                <i class="fas fa-film" style="font-size:24px;color:#ccc;"></i></div>`;
        }
    },

    getFallbackImageUrl(dateStr) {
        if (!dateStr) return null;
        const match = dateStr.match(/\d{4}-\d{2}-\d{2}/);
        return match ? this._getAssetUrl(`/images/calendar/${match[0]}.jpg`) : null;
    },

    getDirectDriveUrl(url) {
        if (!url || !url.includes('drive.google.com')) return url;
        const idMatch = url.match(/\/d\/([^/?#]+)/) || url.match(/[?&]id=([^&?#]+)/) || url.match(/\/file\/d\/([^/?#]+)/);
        if (idMatch && idMatch[1]) return `https://drive.google.com/uc?id=${idMatch[1]}&export=download`;
        return url;
    },

    escape(s) {
        if (!s) return '';
        if (typeof s === 'object') return s.name || s.email || 'Unknown';
        return String(s)
            .replace(/&/g, "&amp;").replace(/</g, "&lt;")
            .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    },

    unescape(s) {
        if (!s) return '';
        return s.replace(/&amp;/g, '&').replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>') .replace(/&quot;/g, '"').replace(/&#039;/g, "'");
    },

    date(d) {
        const date   = new Date(d);
        const now    = new Date();
        const isCurrentYear = date.getFullYear() === now.getFullYear();
        if (!isCurrentYear) {
            return date.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
        }
        return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    }
};
