/**
 * ContactsMixin - All contacts-related logic for CloudMail
 * Extracted from app.js — merge via Object.assign(App, ContactsMixin, ...)
 */
export const ContactsMixin = {
  // =========================================================================
  // CONTACTS — Data Loading & Persistence
  // =========================================================================

  async loadContacts() {
    const storedContacts = this._loadContactsFromLocalStorage();
    // 1. Try to load from server
    try {
      const res = await fetch("/api/contacts");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          this.state.contacts = this._mergeContactsPreservingLocal(data, storedContacts);
          console.log("Contacts loaded from server:", data.length);
          this.saveContactsToLocalStorage();
        }
      }
    } catch (e) {
      console.warn(
        "Failed to load contacts from server, falling back to localStorage:",
        e,
      );
      if (storedContacts.length > 0) {
        this.state.contacts = storedContacts;
      } else {
        this.state.contacts = [
          {
            id: "c1",
            name: "Alice Smith",
            emails: ["alice@example.com"],
            group: "personal",
          },
          {
            id: "c2",
            name: "Bob Johnson",
            emails: ["bob@example.com"],
            group: "personal",
          },
          {
            id: "c3",
            name: "Charlie Brown",
            emails: ["charlie@example.com"],
            group: "collected",
          },
          {
            id: "c4",
            name: "David Miller",
            emails: ["david@example.com"],
            group: "trusted",
          },
          {
            id: "c5",
            name: "Eve Wilson",
            emails: ["eve@example.com"],
            group: "personal",
          },
        ];
        this.saveContactsToLocalStorage();
      }
    }

    // Migrate legacy `email` → `emails` array
    await this.mergePoliticianListContacts();

    let migrated = false;
    this.state.contacts.forEach((c) => {
      if (c.email && !c.emails) {
        c.emails = [c.email];
        delete c.email;
        migrated = true;
      }
      if (c.name) {
        const trimmed = c.name.trim();
        if (trimmed !== c.name) {
          c.name = trimmed;
          migrated = true;
        }
      }
      ["zodiac", "xingzuo", "shuxiang", "chineseZodiac"].forEach((field) => {
        if (!c[field]) return;
        const normalized = this.normalizeChineseAstrologyLabel(c[field]);
        if (normalized !== c[field]) {
          c[field] = normalized;
          migrated = true;
        }
      });
    });

    // Remove SNCF-related contacts
    const originalLength = this.state.contacts.length;
    this.state.contacts = this.state.contacts.filter((c) => {
      const nameStr = (c.name || "").toLowerCase();
      const isSNCF =
        nameStr.includes("sncf") ||
        (c.emails && c.emails.some((e) => e.toLowerCase().includes("sncf")));
      return !isSNCF;
    });
    if (this.state.contacts.length !== originalLength) migrated = true;

    if (migrated) this.saveContactsToStorage();
    
    // Fetch global leads for the Encyclopedia category
    try {
      const leadsRes = await fetch("/data/global_leads.json");
      if (leadsRes.ok) {
        const leads = await leadsRes.json();
        const encyclopediaContacts = leads.map((l) => ({
          id: "encyc_" + l.id,
          name: l.ceo || "",
          company: l.name,
          emails: l.website !== "N/A" ? [l.website] : [],
          group: "encyclopedia",
          coverImage: l.coverImage || l.logo || "",
          logo: l.logo || "",
          industry: l.industry || "",
          foundingYear: l.foundingYear || "",
          history: l.history || "",
          salesHistory: l.salesHistory || null,
          domainInfo: l.domainInfo || null,
          waybackHistory: l.waybackHistory || null,
          location: l.address || l.city || "Global",
          phone: l.phone !== "N/A" ? l.phone : undefined,
          address: l.address !== "N/A" ? l.address : undefined,
          createdAt: Date.now()
        }));
        
        // Merge into state avoiding duplicates by ID
        const existingIds = new Set(this.state.contacts.map((c) => c.id));
        const newContacts = encyclopediaContacts.filter((c) => !existingIds.has(c.id));
        if (newContacts.length > 0) {
          this.state.contacts = [...this.state.contacts, ...newContacts];
        }
        
        this.state.contacts.forEach(c => {
            if (c.id && c.id.startsWith("encyc_")) {
                const match = encyclopediaContacts.find(e => e.id === c.id);
                if (match) {
                    if (!c.company) c.company = match.company;
                    c.salesHistory = match.salesHistory;
                    c.domainInfo = match.domainInfo;
                    c.waybackHistory = match.waybackHistory;
                    if (!c.name && match.name) c.name = match.name;
                }
            }
        });
      }
    } catch (e) {
      console.warn("Failed to load global leads:", e);
    }
    
    // Fetch Vancouver specific leads
    try {
      const industryParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
      const currentIndustry = industryParams.get('Industry');
      const filename = currentIndustry ? `vancouver_${currentIndustry.toLowerCase()}.json` : 'vancouver_leads.json';
      
      const vancRes = await fetch(`/data/${filename}?t=${Date.now()}`);
      if (vancRes.ok) {
        const leads = await vancRes.json();
        const vancouverContacts = leads.map((l) => ({
          id: "vanc_" + l.id,
          name: l.ceo || "",
          company: l.name,
          emails: l.website !== "N/A" ? [l.website] : [],
          group: "vancouver",
          coverImage: l.coverImage || l.logo || "",
          logo: l.logo || "",
          industry: l.industry || "",
          foundingYear: l.foundingYear || "",
          history: l.history || "",
          salesHistory: l.salesHistory || null,
          domainInfo: l.domainInfo || null,
          waybackHistory: l.waybackHistory || null,
          location: l.address || l.city || "Vancouver",
          phone: l.phone !== "N/A" ? l.phone : undefined,
          address: l.address !== "N/A" ? l.address : undefined,
          createdAt: Date.now()
        }));
        
        const existingIds = new Set(this.state.contacts.map((c) => c.id));
        const newContacts = vancouverContacts.filter((c) => !existingIds.has(c.id));
        if (newContacts.length > 0) {
          this.state.contacts = [...this.state.contacts, ...newContacts];
        }
        
        // Update existing ones that might have been saved incorrectly
        this.state.contacts.forEach(c => {
            if (c.id && c.id.startsWith("vanc_")) {
                const match = vancouverContacts.find(v => v.id === c.id);
                if (match) {
                    if (!c.company) c.company = match.company;
                    if (!c.name && match.name) c.name = match.name;
                    c.salesHistory = match.salesHistory;
                    c.domainInfo = match.domainInfo;
                    c.waybackHistory = match.waybackHistory;
                }
            }
        });
        
        // Deduplicate all encyclopedia and vancouver contacts by company name
        const seenCompanies = new Set();
        this.state.contacts = this.state.contacts.filter(c => {
            if (c.group === 'encyclopedia' || c.group === 'vancouver') {
                if (c.company && seenCompanies.has(c.company)) {
                    return false; // Skip duplicate
                }
                if (c.company) {
                    seenCompanies.add(c.company);
                }
            }
            return true;
        });

      }
    } catch (e) {
      console.warn("Failed to load vancouver leads:", e);
    }

    await this.loadContactLists();
    this.renderContacts();
  },

  _loadContactsFromLocalStorage() {
    const stored = localStorage.getItem("cloudmail_contacts");
    if (!stored) return [];
    try {
      const contacts = JSON.parse(stored);
      return Array.isArray(contacts) ? contacts : [];
    } catch (e) {
      console.error("Failed to parse contacts from storage:", e);
      return [];
    }
  },

  _mergeContactsPreservingLocal(serverContacts, localContacts) {
    const merged = new Map();
    const keyFor = (contact) =>
      String(contact?.id || contact?.emails?.[0] || contact?.email || "").toLowerCase();

    (serverContacts || []).forEach((contact) => {
      const key = keyFor(contact);
      if (key) merged.set(key, contact);
    });

    (localContacts || []).forEach((contact) => {
      const key = keyFor(contact);
      if (!key || merged.has(key)) return;
      const group = String(contact.group || "personal").trim() || "personal";
      if (group === "personal") merged.set(key, { ...contact, group });
    });

    return Array.from(merged.values());
  },

  async mergePoliticianListContacts() {
    try {
      const res = await fetch(
        `/config/contact-lists/politicians.json?t=${Date.now()}`,
        { cache: "no-store" },
      );
      if (!res.ok) return;
      const politicians = await res.json();
      if (!Array.isArray(politicians) || politicians.length === 0) return;

      const byId = new Map(
        (this.state.contacts || []).map((contact) => [contact.id, contact]),
      );
      politicians.forEach((contact) => {
        const merged = {
          ...(byId.get(contact.id) || {}),
          ...contact,
          group: "politicians",
        };
        // Auto-fill xingzuo/shuxiang from birthDate when missing
        const bd = merged.birthDate || merged.birthday;
        if (bd && bd !== "Unknown" && bd !== "-") {
          const d = new Date(bd);
          if (!isNaN(d.getTime())) {
            if (!merged.xingzuo && !merged.zodiac) {
              merged.xingzuo = this._calcWesternZodiac(d);
            }
            if (!merged.shuxiang && !merged.chineseZodiac) {
              merged.shuxiang = this._calcChineseZodiac(d);
              merged.chineseZodiac = merged.shuxiang;
            }
          }
        }
        byId.set(contact.id, merged);
      });
      this.state.contacts = this._combineDuplicatePoliticianContacts(Array.from(byId.values()));
    } catch (e) {
      console.warn("Failed to merge politician contact list:", e);
    }
  },

  _combineDuplicatePoliticianContacts(contacts) {
    const byCanonical = new Map();
    const passthrough = [];
    const canonicalKey = (contact) => {
      if (contact?.group !== "politicians" || !contact.wikiLink) return "";
      try {
        const url = new URL(contact.wikiLink);
        return `${url.hostname.toLowerCase()}${decodeURIComponent(url.pathname).replace(/_/g, " ").toLowerCase()}`;
      } catch (_) {
        return String(contact.wikiLink || "").replace(/_/g, " ").toLowerCase();
      }
    };
    const mergeArray = (a, b) => Array.from(new Set([...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])].filter(Boolean)));
    const alternateRecord = (contact) => ({
      name: contact.name,
      id: contact.id,
      driveFolder: contact.driveFolder,
      createdAt: contact.createdAt,
      updatedAt: contact.updatedAt,
      referWav: contact.referWav,
      cloneWav: contact.cloneWav,
      notes: contact.notes,
    });

    (contacts || []).forEach((contact) => {
      const key = canonicalKey(contact);
      if (!key) {
        passthrough.push(contact);
        return;
      }
      const existing = byCanonical.get(key);
      if (!existing) {
        byCanonical.set(key, {
          ...contact,
          aliases: mergeArray(contact.aliases, []),
          alternateRecords: mergeArray(contact.alternateRecords, []),
        });
        return;
      }

      Object.entries(contact).forEach(([field, value]) => {
        if (value === undefined || value === null || value === "") return;
        if (field === "aliases" || field === "alternateRecords") return;
        if (existing[field] === undefined || existing[field] === null || existing[field] === "") {
          existing[field] = value;
        } else if (field === "recentActivity" && String(value).length > String(existing[field]).length) {
          existing[field] = value;
        }
      });

      if (contact.name && contact.name !== existing.name) {
        existing.aliases = mergeArray(existing.aliases, [contact.name]);
      }
      existing.aliases = mergeArray(existing.aliases, contact.aliases);
      const alternates = mergeArray(existing.alternateRecords, contact.alternateRecords);
      if (contact.id && contact.id !== existing.id && !alternates.some((record) => record?.id === contact.id)) {
        alternates.push(alternateRecord(contact));
      }
      existing.alternateRecords = alternates;
    });

    return [...passthrough, ...byCanonical.values()];
  },

  defaultContactLists() {
    return [
      {
        id: "personal",
        name: "Personal Addresses",
        icon: "fa-address-book",
        system: true,
      },
      {
        id: "collected",
        name: "Collected Recipients",
        icon: "fa-bullseye",
        system: true,
      },
      {
        id: "trusted",
        name: "Trusted Senders",
        icon: "fa-check-circle",
        system: true,
      },
      { id: "politicians", name: "Politicians", icon: "fa-landmark" },
      {
        id: "xotours_us_customers",
        name: "XO Tours US Customers",
        icon: "fa-envelope-open-text",
      },
      {
        id: "xotours_ca_customers",
        name: "XO Tours CA Customers",
        icon: "fa-envelope-open-text",
      },
    ];
  },

  async loadContactLists() {
    let lists = [];
    let storedLists = [];
    try {
      const res = await fetch("/api/contact-lists");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) lists = data;
      }
    } catch (e) {
      console.warn("Failed to load contact lists from server:", e);
    }

    const stored = localStorage.getItem("cloudmail_contact_lists");
    if (stored) {
      try {
        const data = JSON.parse(stored);
        if (Array.isArray(data)) storedLists = data;
      } catch (e) {
        storedLists = [];
      }
    }

    const byId = new Map();
    [
      ...this.defaultContactLists(),
      ...(Array.isArray(lists) ? lists : []),
      ...storedLists,
    ].forEach((list) => {
      if (!list?.id) return;
      byId.set(list.id, {
        id: list.id,
        name: list.name || list.id,
        icon: list.icon || "fa-address-book",
        system: Boolean(list.system),
      });
    });

    (this.state.contacts || []).forEach((contact) => {
      const group = contact.group;
      if (group && !byId.has(group)) {
        byId.set(group, {
          id: group,
          name: group
            .replace(/_/g, " ")
            .replace(/\b\w/g, (ch) => ch.toUpperCase()),
          icon: "fa-address-book",
        });
      }
    });

    this.state.contactLists = Array.from(byId.values());
    this.saveContactListsToLocalStorage();
    return this.state.contactLists;
  },

  saveContactListsToLocalStorage() {
    localStorage.setItem(
      "cloudmail_contact_lists",
      JSON.stringify(this.state.contactLists || []),
    );
  },

  async saveContactListsToServer() {
    this.saveContactListsToLocalStorage();
    try {
      const res = await fetch("/api/contact-lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(this.state.contactLists || []),
      });
      return res.ok;
    } catch (e) {
      console.error("Failed to save contact lists to server:", e);
    }
    return false;
  },

  contactListOptionsHtml(selectedGroup) {
    const esc = (value) => this._contactFormEscape(value);
    return (this.state.contactLists || this.defaultContactLists())
      .map(
        (list) =>
          `<option value="${esc(list.id)}" ${selectedGroup === list.id ? "selected" : ""}>${esc(list.name)}</option>`,
      )
      .join("");
  },

  whitelistUserAccountsInContacts() {
    if (!this.state.accounts || this.state.accounts.length === 0) return;

    let changed = false;
    this.state.accounts.forEach((account) => {
      const email = account.smtp ? account.smtp.from : null;
      if (!email) return;

      const exists = this.state.contacts.find(
        (c) =>
          c.emails &&
          c.emails.some((e) => e.toLowerCase() === email.toLowerCase()),
      );
      if (!exists) {
        this.state.contacts.push({
          id: "user_" + account.id,
          name: account.name || account.id,
          emails: [email],
          group: "trusted",
          notes: "Automatically added user account",
        });
        changed = true;
      } else if (exists.group !== "trusted") {
        exists.group = "trusted";
        changed = true;
      }
    });

    if (changed) {
      this.saveContactsToStorage();
      if (this.state.currentContactGroup === "trusted") this.renderContacts();
    }
  },

  saveContactsToStorage() {
    this.saveContactsToLocalStorage();
    return this.saveContactsToServer();
  },

  saveContactsToLocalStorage() {
    localStorage.setItem(
      "cloudmail_contacts",
      JSON.stringify(this.state.contacts),
    );
  },

  _contactFormEscape(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  },

  /** Convert a Chinese string to lowercase pinyin for search matching.
   *  Uses pinyin-pro (global `pinyinPro`) with a simple cache. */
  _pinyinCache: new Map(),
  _contactPinyin(text) {
    if (!text) return "";
    // Only convert if string contains Chinese characters
    if (!/[\u4e00-\u9fa5]/.test(text)) return "";
    const cached = this._pinyinCache.get(text);
    if (cached !== undefined) return cached;
    let result = "";
    try {
      if (typeof pinyinPro !== "undefined" && pinyinPro.pinyin) {
        result = pinyinPro.pinyin(text, { toneType: "none", type: "string" }).toLowerCase();
      } else if (typeof Pinyin !== "undefined" && Pinyin.convertToPinyin) {
        result = Pinyin.convertToPinyin(text, " ", true).toLowerCase();
      }
    } catch (e) {
      console.warn("Pinyin conversion failed:", e);
    }
    // Also store a version without spaces for continuous typing match
    const noSpace = result.replace(/\s+/g, "");
    const combined = result + " " + noSpace;
    this._pinyinCache.set(text, combined);
    return combined;
  },

  normalizeChineseAstrologyLabel(value) {
    const text = String(value || "").trim();
    if (!text) return "";
    const westernCn = {
      Aries: "白羊座",
      Taurus: "金牛座",
      Gemini: "双子座",
      Cancer: "巨蟹座",
      Leo: "狮子座",
      Virgo: "处女座",
      Libra: "天秤座",
      Scorpio: "天蝎座",
      Sagittarius: "射手座",
      Capricorn: "摩羯座",
      Aquarius: "水瓶座",
      Pisces: "双鱼座",
    };
    const chineseZodiacCn = {
      Rat: "鼠",
      Ox: "牛",
      Tiger: "虎",
      Rabbit: "兔",
      Dragon: "龙",
      Snake: "蛇",
      Horse: "马",
      Goat: "羊",
      Monkey: "猴",
      Rooster: "鸡",
      Dog: "狗",
      Pig: "猪",
    };
    const english = text.split("/")[0].trim();
    if (westernCn[english]) return `${english} / ${westernCn[english]}`;
    if (chineseZodiacCn[english]) return `${english} / ${chineseZodiacCn[english]}`;
    return text;
  },

  _calcWesternZodiac(d) {
    const m = d.getUTCMonth() + 1, day = d.getUTCDate();
    const signs = [
      [1, 19, "Capricorn"], [2, 18, "Aquarius"], [3, 20, "Pisces"], [4, 19, "Aries"],
      [5, 20, "Taurus"], [6, 20, "Gemini"], [7, 22, "Cancer"], [8, 22, "Leo"],
      [9, 22, "Virgo"], [10, 22, "Libra"], [11, 21, "Scorpio"], [12, 21, "Sagittarius"],
    ];
    const cn = { Aries: "白羊座", Taurus: "金牛座", Gemini: "双子座", Cancer: "巨蟹座", Leo: "狮子座", Virgo: "处女座", Libra: "天秤座", Scorpio: "天蝎座", Sagittarius: "射手座", Capricorn: "摩羯座", Aquarius: "水瓶座", Pisces: "双鱼座" };
    let sign = "Capricorn";
    for (const [sm, sd, name] of signs) {
      if (m === sm && day <= sd) { sign = name; break; }
      if (m === sm && day > sd) { sign = signs[(signs.findIndex(s => s[2] === name) + 1) % 12][2]; break; }
    }
    // Simpler approach
    if ((m === 1 && day <= 19) || (m === 12 && day >= 22)) sign = "Capricorn";
    else if ((m === 1 && day >= 20) || (m === 2 && day <= 18)) sign = "Aquarius";
    else if ((m === 2 && day >= 19) || (m === 3 && day <= 20)) sign = "Pisces";
    else if ((m === 3 && day >= 21) || (m === 4 && day <= 19)) sign = "Aries";
    else if ((m === 4 && day >= 20) || (m === 5 && day <= 20)) sign = "Taurus";
    else if ((m === 5 && day >= 21) || (m === 6 && day <= 20)) sign = "Gemini";
    else if ((m === 6 && day >= 21) || (m === 7 && day <= 22)) sign = "Cancer";
    else if ((m === 7 && day >= 23) || (m === 8 && day <= 22)) sign = "Leo";
    else if ((m === 8 && day >= 23) || (m === 9 && day <= 22)) sign = "Virgo";
    else if ((m === 9 && day >= 23) || (m === 10 && day <= 22)) sign = "Libra";
    else if ((m === 10 && day >= 23) || (m === 11 && day <= 21)) sign = "Scorpio";
    else if ((m === 11 && day >= 22) || (m === 12 && day <= 21)) sign = "Sagittarius";
    return cn[sign] ? `${sign} / ${cn[sign]}` : sign;
  },

  _calcChineseZodiac(d) {
    const animals = ["Monkey", "Rooster", "Dog", "Pig", "Rat", "Ox", "Tiger", "Rabbit", "Dragon", "Snake", "Horse", "Goat"];
    const cn = { Rat: "鼠", Ox: "牛", Tiger: "虎", Rabbit: "兔", Dragon: "龙", Snake: "蛇", Horse: "马", Goat: "羊", Monkey: "猴", Rooster: "鸡", Dog: "狗", Pig: "猪" };
    const animal = animals[d.getUTCFullYear() % 12];
    return cn[animal] ? `${animal} / ${cn[animal]}` : animal;
  },

  contactTagSummaryHtml(contacts) {
    const buildSummary = (pickLabel) => {
      const counts = new Map();
      (contacts || []).forEach((contact) => {
        const label = this.normalizeChineseAstrologyLabel(pickLabel(contact));
        const key = String(label || "").split("/")[0].trim();
        if (!key || key === "Unknown") return;
        counts.set(key, (counts.get(key) || 0) + 1);
      });
      return Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .map(([label, count]) => {
          const escapedLabel = this._contactFormEscape(label);
          const escapedArg = escapedLabel.replace(/'/g, "&#39;");
          return `<button class="eo-contact-tag-summary-link" onclick="App.filterContactsByTagValue('${escapedArg}')">${escapedLabel}:${count}</button>`;
        })
        .join(" ");
    };
    const xingzuo = buildSummary((contact) => contact.zodiac || contact.xingzuo);
    const shuxiang = buildSummary((contact) => contact.shuxiang || contact.chineseZodiac);
    if (!xingzuo && !shuxiang) return "";
    const parts = [];
    if (xingzuo) parts.push(`Xingzuo: ${xingzuo}`);
    if (shuxiang) parts.push(`Shuxiang: ${shuxiang}`);
    return `
      <div class="eo-contact-tag-summary">
        <div class="eo-contact-tag-summary-line">${parts.join(" | ")}</div>
      </div>`;
  },

  contactAlphabetFooterHtml(contacts) {
    const counts = new Map();
    (contacts || []).forEach((contact) => {
      const letter = String(contact.name || "").trim().charAt(0).toUpperCase();
      if (!/^[A-Z]$/.test(letter)) return;
      counts.set(letter, (counts.get(letter) || 0) + 1);
    });
    return `
      <div class="eo-contact-alphabet-row">
        ${"ABCDEFGHIJKLMNOPQRSTUVWXYZ"
        .split("")
        .map((letter) => {
          const count = counts.get(letter) || 0;
          const enabled = count > 0;
          const active = this.state.contactLetterFilter === letter;
          return `<button class="eo-letter-btn ${active ? "is-active" : ""}" ${enabled ? "" : "disabled"} onclick="App.filterContactsByLetter('${letter}')">${letter}:${count}</button>`;
        })
        .join("")}
      </div>`;
  },

  emptyContactsGroupHtml() {
    if ((this.state.contacts || []).length === 0) {
      return `<div class="eo-empty">Loading contacts...</div>`;
    }

    if (this.state.currentContactGroup === "personal") {
      return `
        <div class="eo-empty">
          <div style="font-weight:700;color:#1a1a2e;margin-bottom:8px;">No personal contacts yet.</div>
          <button class="eo-pill eo-pill--active" onclick="App.createContact()">Add contact</button>
        </div>`;
    }

    return `<div class="eo-empty">No contacts found in this group.</div>`;
  },

  async saveContactsToServer() {
    try {
      await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(this.state.contacts),
      });
      console.log("Contacts synced to server");
    } catch (e) {
      console.error("Failed to save contacts to server:", e);
    }
  },

  async extractBounces() {
    try {
      const res = await fetch('/search-index.json');
      if (!res.ok) throw new Error('Failed to fetch search-index.json');
      const data = await res.json();
      const emails = data.emails || [];
      const bouncedEmails = new Set();
      
      for (const email of emails) {
          const isBounceSubject = email.subject && (
              email.subject.includes('Undeliverable:') ||
              email.subject.includes('Delivery Status Notification (Failure)') ||
              email.subject.includes('Undelivered Mail Returned to Sender') ||
              email.subject.includes('Returned mail: see transcript for details')
          );
          const isFromAmazon = email.from && email.from.includes('amazonses.com');
          
          if (isBounceSubject || isFromAmazon) {
              const match = email.preview.match(/Your message (?:to|wasn't delivered to) ([\w.-]+@[\w.-]+)/i) ||
                            email.preview.match(/Recipient ([\w.-]+@[\w.-]+) not found/i) ||
                            email.preview.match(/following recipients?: ([\w.-]+@[\w.-]+)/i) ||
                            email.preview.match(/message could not be delivered to.*?([\w.-]+@[\w.-]+)/i);
                            
              if (match && match[1]) {
                  bouncedEmails.add(match[1].toLowerCase());
              } else {
                  const genericMatch = email.preview.match(/([\w.-]+@[\w.-]+)/g);
                  if (genericMatch) {
                      const candidate = genericMatch.find(e => !e.includes('superesolutions') && !e.includes('xotours') && !e.includes('amazonses'));
                      if (candidate) {
                          bouncedEmails.add(candidate.toLowerCase());
                      }
                  }
              }
          }
      }

      if (bouncedEmails.size === 0) {
          alert('No bounced emails found matching the criteria.');
          return;
      }

      const newContacts = Array.from(bouncedEmails).map(email => ({
          email,
          source: 'bounce_processor',
          group: 'failed-list-2026-05-30',
          tags: ['bounced', '2026-05-30']
      }));

      // Create list if needed
      if (!this.state.contactLists) await this.loadContactLists();
      if (!this.state.contactLists.find(l => l.id === 'failed-list-2026-05-30')) {
          this.state.contactLists.push({ id: 'failed-list-2026-05-30', name: 'Failed List 2026-05-30', icon: 'fa-ban' });
          await this.saveContactListsToServer();
      }

      // Add contacts
      let added = 0;
      for (const nc of newContacts) {
          const exists = this.state.contacts.find(c => c.emails && c.emails.includes(nc.email));
          if (!exists) {
              this.state.contacts.push({
                  id: 'bounce_' + Date.now() + Math.floor(Math.random()*1000),
                  name: nc.email.split('@')[0],
                  emails: [nc.email],
                  group: nc.group,
                  tags: nc.tags,
                  notes: 'Extracted from bounce emails',
                  createdAt: Date.now(),
                  updatedAt: Date.now()
              });
              added++;
          }
      }

      if (added > 0) {
          await this.saveContactsToServer();
          this.renderContacts();
          alert(`Successfully extracted and added ${added} new bounced email(s) to failed-list-2026-05-30.`);
      } else {
          alert('Bounced emails were extracted but they are already in the contacts list.');
      }
    } catch (e) {
      console.error('Error extracting bounces:', e);
      alert('Failed to extract bounces: ' + e.message);
    }
  },

  // =========================================================================
  // CONTACTS — Rendering
  // =========================================================================

  renderContacts() {
    const listContainer = document.getElementById("contact-list-items");
    const countContainer = document.getElementById("contact-count");
    const contactsView = document.getElementById("contacts-view");
    if (!listContainer) return;
    const attrEscape = (value) =>
      this._contactFormEscape(value).replace(/'/g, "&#39;");
    const jsArg = (value) => this._contactFormEscape(JSON.stringify(String(value ?? "")));
    const isRichGroup = ["politicians", "encyclopedia", "vancouver"].includes(this.state.currentContactGroup);
    const viewMode = isRichGroup
      ? this.state.contactViewMode || "table"
      : "table";

    // Full-width table mode for all groups
    const isTableMode = !this.state.selectedContactId;
    if (contactsView) {
      contactsView.classList.toggle("table-mode", isTableMode);
      contactsView.classList.toggle("groups-compact", isRichGroup);
      contactsView.classList.toggle("politician-map-mode", isRichGroup && viewMode === "map");
      contactsView.classList.toggle("politician-detail-mode", isRichGroup && !isTableMode);
    }

    let filtered = this.state.contacts.filter((c) => {
      let matchesGroup = false;
      if (this.state.currentContactGroup === "all") {
        matchesGroup = true;
      } else if (this.state.currentContactGroup.startsWith("domain:")) {
        const domain = this.state.currentContactGroup.split(":")[1];
        matchesGroup =
          c.emails &&
          c.emails.some((e) => {
            const parts = e.split("@");
            return parts.length === 2 && parts[1].toLowerCase() === domain;
          });
      } else {
        matchesGroup = c.group === this.state.currentContactGroup;
      }

      const nameStr = c.name || "";
      const query = (this.state.contactSearchQuery || "").toLowerCase();
      const activeQuery = query.length >= 2 ? query : "";
      const searchableText = [
        nameStr,
        c.location,
        c.position,
        c.profile,
        c.wikiLink,
        c.birthDate,
        c.birthday,
        this.normalizeChineseAstrologyLabel(c.zodiac),
        this.normalizeChineseAstrologyLabel(c.xingzuo),
        this.normalizeChineseAstrologyLabel(c.shuxiang),
        this.normalizeChineseAstrologyLabel(c.chineseZodiac),
        ...(c.emails || []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      // Also generate pinyin text for Chinese name search
      const pinyinText = this._contactPinyin(nameStr);
      const matchesSearch = !activeQuery || searchableText.includes(activeQuery) || (pinyinText && pinyinText.includes(activeQuery));
      const letterFilter = this.state.contactLetterFilter || "";
      const firstLetter = nameStr.trim().charAt(0).toUpperCase();
      const matchesLetter = !letterFilter || firstLetter === letterFilter;
      const tagFilter = (this.state.contactTagFilter || "").toLowerCase();
      const matchesTag =
        !tagFilter ||
        (c.tags || []).some((tag) => String(tag).toLowerCase() === tagFilter);
      return matchesGroup && matchesSearch && matchesLetter && matchesTag;
    });

    const sortKey = this.state.contactSortKey || "updatedAt";
    const sortDir = this.state.contactSortDir || "desc";

    filtered.sort((a, b) => {
      let va, vb;
      if (sortKey === "email") {
        va = a.emails?.[0] || "";
        vb = b.emails?.[0] || "";
        return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      } else if (sortKey === "firstName") {
        va = a.firstName || (a.name || "").split(" ")[0] || "";
        vb = b.firstName || (b.name || "").split(" ")[0] || "";
        return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      } else if (sortKey === "lastName") {
        va = a.lastName || (a.name || "").split(" ").slice(1).join(" ") || "";
        vb = b.lastName || (b.name || "").split(" ").slice(1).join(" ") || "";
        return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      } else if (
        ["location", "position", "birthDate", "zodiac", "shuxiang"].includes(
          sortKey,
        )
      ) {
        va =
          this.normalizeChineseAstrologyLabel(a[sortKey]) ||
          (sortKey === "zodiac" ? this.normalizeChineseAstrologyLabel(a.xingzuo) : "") ||
          (sortKey === "shuxiang" ? this.normalizeChineseAstrologyLabel(a.chineseZodiac) : "") ||
          "";
        vb =
          this.normalizeChineseAstrologyLabel(b[sortKey]) ||
          (sortKey === "zodiac" ? this.normalizeChineseAstrologyLabel(b.xingzuo) : "") ||
          (sortKey === "shuxiang" ? this.normalizeChineseAstrologyLabel(b.chineseZodiac) : "") ||
          "";
        return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      } else if (sortKey === "createdAt") {
        va = a.subscribedAt || a.createdAt || 0;
        vb = b.subscribedAt || b.createdAt || 0;
      } else {
        // updatedAt (default)
        va = a.updatedAt || a.subscribedAt || a.createdAt || 0;
        vb = b.updatedAt || b.subscribedAt || b.createdAt || 0;
      }
      return sortDir === "asc" ? va - vb : vb - va;
    });

    const page = this.state.contactPage || 0;
    const pageSize = 50;
    const startIdx = page * pageSize;
    const endIdx = startIdx + pageSize;
    const paginated = isTableMode ? filtered.slice(startIdx, endIdx) : filtered;

    let html = "";

    // =====================================================================
    // TABLE MODE (All Groups)
    // =====================================================================
    if (isTableMode) {
      const avatarColors = {
        a: "#6366f1",
        b: "#8b5cf6",
        c: "#ec4899",
        d: "#f43f5e",
        e: "#f97316",
        f: "#eab308",
        g: "#22c55e",
        h: "#10b981",
        i: "#06b6d4",
        j: "#3b82f6",
        k: "#6366f1",
        l: "#8b5cf6",
        m: "#64748b",
        n: "#f43f5e",
        o: "#f97316",
        p: "#eab308",
        q: "#22c55e",
        r: "#10b981",
        s: "#06b6d4",
        t: "#3b82f6",
        u: "#6366f1",
        v: "#8b5cf6",
        w: "#ec4899",
        x: "#f43f5e",
        y: "#f97316",
        z: "#eab308",
      };

      const fmtDate = (ts) => {
        if (!ts) return "";
        const d = new Date(ts);
        const now = new Date();
        const diffH = (now - d) / 3600000;
        if (diffH < 24) {
          const h = Math.round(diffH);
          return h <= 1 ? "1 hour ago" : h + " hours ago";
        }
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
        const yr =
          d.getFullYear() !== now.getFullYear() ? " " + d.getFullYear() : "";
        const h12 = d.getHours() % 12 || 12;
        const min = String(d.getMinutes()).padStart(2, "0");
        const ap = d.getHours() >= 12 ? "PM" : "AM";
        return (
          mo[d.getMonth()] +
          " " +
          d.getDate() +
          yr +
          " at " +
          h12 +
          ":" +
          min +
          " " +
          ap
        );
      };
      // Collect ALL unique tags from all contacts + saved tags list
      const tagCountMap = new Map();
      (this.state.contacts || []).forEach((contact) => {
        (contact.tags || []).forEach((tag) => {
          if (tag) tagCountMap.set(tag, (tagCountMap.get(tag) || 0) + 1);
        });
      });
      // Also include tags from the tags store (even if no contacts use them yet)
      (this.state.tags || []).forEach((tag) => {
        const name = typeof tag === "string" ? tag : tag?.name;
        if (name && !tagCountMap.has(name)) tagCountMap.set(name, 0);
      });
      const tagFilterOptions = Array.from(tagCountMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]));

      // ── Page header: title + tabs + Add button ────────────────────────
      let countLabel = "subscribed contacts";
      if (this.state.currentContactGroup === "politicians") {
        countLabel = "politicians";
      } else if (
        this.state.currentContactGroup &&
        this.state.currentContactGroup !== "all"
      ) {
        const grp = (this.state.contactLists || []).find(
          (l) => l.id === this.state.currentContactGroup,
        );
        if (grp && grp.name) countLabel = grp.name.toLowerCase();
        else countLabel = "contacts";
      }
      html += this._contactsPageHeaderHtml(
        "contacts",
        filtered.length,
        countLabel,
        false,
        !isRichGroup
      );

      // ── Toolbar: Actions + Search + Filter pills + Pagination ─────────
      html += `
            <div class="eo-toolbar">
                <div class="eo-toolbar-row">
                    <div class="eo-actions-wrap">
                        <button class="eo-actions-btn" onclick="App._eoToggleActionsMenu(event)">
                            Actions
                            <svg width="14" height="14" viewBox="0 0 14 14"><path d="M3 5l4 4 4-4" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>
                        </button>
                        <div class="eo-actions-menu" id="eo-actions-menu" style="display:none">
                            <div class="eo-actions-menu-item" onclick="App.createContact()">Add contact</div>
                            <div class="eo-actions-menu-item" onclick="App.editSelectedContact()">Edit selected</div>
                            <div class="eo-actions-menu-item" onclick="App.renameSelectedContact()">Rename selected</div>
                            <div class="eo-actions-menu-divider"></div>
                            <div class="eo-actions-menu-item">Update tags</div>
                            <div class="eo-actions-menu-item">Update fields</div>
                            <div class="eo-actions-menu-item">Mark as unsubscribed</div>
                            <div class="eo-actions-menu-item eo-actions-menu-item--danger"
                                 onclick="App.deleteSelectedContact()">Delete</div>
                            <div class="eo-actions-menu-divider"></div>
                            <div class="eo-actions-menu-item"
                                 onclick="App.exportCurrentContactGroup && App.exportCurrentContactGroup()">Export current group</div>
                        </div>
                    </div>

                    <div class="eo-search-wrap">
                        <svg class="eo-search-icon" viewBox="0 0 20 20" fill="none">
                            <circle cx="9" cy="9" r="6" stroke="currentColor" stroke-width="1.6"/>
                            <path d="M14 14l3 3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
                        </svg>
                        <input class="eo-search-input" placeholder="Search"
                               value="${this.state.contactSearchQuery || ""}"
                               oninput="App.searchContacts(this.value)">
                        ${this.state.contactSearchQuery
          ? `
                        <button class="eo-search-clear" title="Clear filter" onclick="App.clearContactFilter()">
                            <i class="fas fa-times"></i>
                        </button>`
          : ""
        }
                    </div>

                    <div class="eo-filter-pills">
                        <button class="eo-pill eo-pill--active" onclick="App.createContact()">
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                <path d="M6 1v10M1 6h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                            </svg>
                            Add contact
                        </button>
                        ${this.state.currentContactGroup === "politicians"
          ? `
                        <button class="eo-pill ${viewMode === "table" ? "eo-pill--active" : ""}" onclick="App.setContactViewMode('table')" title="Table view">
                            <i class="fas fa-table"></i> Table
                        </button>
                        <button class="eo-pill ${viewMode === "grid" ? "eo-pill--active" : ""}" onclick="App.setContactViewMode('grid')" title="Grid view">
                            <i class="fas fa-th-large"></i> Grid
                        </button>
                        <button class="eo-pill ${viewMode === "slideshow" ? "eo-pill--active" : ""}" onclick="App.setContactViewMode('slideshow')" title="Slideshow view">
                            <i class="fas fa-images"></i> Slideshow
                        </button>
                        <button class="eo-pill ${viewMode === "map" ? "eo-pill--active" : ""}" onclick="App.setContactViewMode('map')" title="Map view">
                            <i class="fas fa-map-marked-alt"></i> Map
                        </button>
                        <button class="eo-pill ${viewMode === "calendar" ? "eo-pill--active" : ""}" onclick="App.setContactViewMode('calendar')" title="Calendar view">
                            <i class="fas fa-calendar-alt"></i> Calendar
                        </button>
                        `
          : ""
        }
                        <button class="eo-pill">Segment
                            <svg width="12" height="12" viewBox="0 0 12 12"><path d="M3 5l3 3 3-3" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round"/></svg>
                        </button>
                        <div class="eo-actions-wrap">
                            <button class="eo-pill ${this.state.contactTagFilter ? "eo-pill--active" : ""}" onclick="App._eoToggleTagsMenu(event)">
                                ${this.state.contactTagFilter ? this._contactFormEscape(this.state.contactTagFilter) : "Tags"}
                                <svg width="12" height="12" viewBox="0 0 12 12"><path d="M3 5l3 3 3-3" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round"/></svg>
                            </button>
                            <div class="eo-actions-menu eo-tags-filter-menu" id="eo-tags-filter-menu" style="display:none;max-height:400px;overflow-y:auto;min-width:260px">
                                ${this.state.contactTagFilter
          ? `
                                    <div class="eo-actions-menu-item" onclick="App.clearContactTagFilter()" style="font-weight:600;color:#6c5ce7">✕ All tags</div>
                                    <div class="eo-actions-menu-divider"></div>
                                `
          : ""
        }
                                ${tagFilterOptions
          .map(
            ([tag, count]) => `
                                    <div class="eo-actions-menu-item" style="display:flex;align-items:center;justify-content:space-between;gap:8px">
                                        <span onclick="App.filterContactsByTag('${attrEscape(tag)}')" style="flex:1;cursor:pointer;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${this._contactFormEscape(tag)}">${this._contactFormEscape(tag)} <span style="color:#aaa;font-size:11px">(${count})</span></span>
                                        <div style="display:flex;gap:2px;flex-shrink:0;">
                                            <button onclick="event.stopPropagation();App._renameContactTag('${attrEscape(tag)}')" title="Rename tag" style="border:none;background:none;color:#aaa;cursor:pointer;padding:2px 4px;border-radius:4px;font-size:11px;" onmouseenter="this.style.color='#6c5ce7';this.style.background='#f0eeff'" onmouseleave="this.style.color='#aaa';this.style.background='none'"><i class="fas fa-pen"></i></button>
                                            <button onclick="event.stopPropagation();App._deleteContactTag('${attrEscape(tag)}')" title="Delete tag" style="border:none;background:none;color:#aaa;cursor:pointer;padding:2px 4px;border-radius:4px;font-size:11px;" onmouseenter="this.style.color='#d63031';this.style.background='#ffeaee'" onmouseleave="this.style.color='#aaa';this.style.background='none'"><i class="fas fa-trash"></i></button>
                                        </div>
                                    </div>
                                `,
          )
          .join("")}
                            </div>
                        </div>
                    </div>

                    <div class="eo-pagination-wrap">
                        <span class="eo-pagination-info">
                            ${startIdx + 1}\u2013${Math.min(endIdx, filtered.length)} of <strong>${filtered.length.toLocaleString()}</strong>
                        </span>
                        <button class="eo-page-btn" ${page === 0 ? "disabled" : ""}
                                onclick="App.prevContactsPage()">
                            <svg width="16" height="16" viewBox="0 0 16 16"><path d="M10 4L6 8l4 4" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg>
                        </button>
                        <button class="eo-page-btn" ${endIdx >= filtered.length ? "disabled" : ""}
                                onclick="App.nextContactsPage()">
                            <svg width="16" height="16" viewBox="0 0 16 16"><path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg>
                        </button>
                    </div>
                </div>
            </div>`;
      // ── Table ─────────────────────────────────────────────────────────
      if (filtered.length === 0) {
        html += this.emptyContactsGroupHtml();
      } else if (isRichGroup && viewMode === "grid") {
        html += this.renderPoliticianGrid(filtered, attrEscape);
      } else if (isRichGroup && viewMode === "slideshow") {
        html += this.renderPoliticianSlideshow(filtered, attrEscape);
      } else if (isRichGroup && viewMode === "map") {
        html += this.renderPoliticianMap(filtered, attrEscape);
      } else if (isRichGroup && viewMode === "calendar") {
        html += this.renderPoliticianCalendar(filtered, attrEscape);
      } else {
        const _th = (label, key, extraClass = "") => {
          const isActive = sortKey === key;
          const nextDir = isActive && sortDir === "asc" ? "desc" : "asc";
          // Arrow: up = asc active, down = desc active, neutral when inactive
          const arrowPath = !isActive
            ? "M6 2v8M3 7l3 3 3-3" // neutral down
            : sortDir === "asc"
              ? "M6 10V2M3 5l3-3 3 3" // up arrow
              : "M6 2v8M3 7l3 3 3-3"; // down arrow
          const color = isActive ? "#6c5ce7" : "currentColor";
          return `<th class="eo-th eo-th--sortable ${isActive ? "eo-th--active-sort" : ""} ${extraClass}"
                                style="cursor:pointer;user-select:none"
                                onclick="App._sortContacts('${key}','${nextDir}')">
                                <span style="display:inline-flex;align-items:center;gap:4px;color:${isActive ? "#6c5ce7" : "inherit"}">
                                    ${label}
                                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style="flex-shrink:0">
                                        <path d="${arrowPath}" stroke="${color}" stroke-width="1.3" fill="none" stroke-linecap="round"/>
                                    </svg>
                                </span>
                            </th>`;
        };

        html += `
                <div class="eo-table-wrap">
                    <table class="eo-table">
                        <thead>
                            <tr>
                                <th class="eo-th eo-th--check">
                                    <input type="checkbox" class="eo-checkbox" title="Select all"
                                           onchange="App._eoSelectAll(this.checked)">
                                </th>
                                <th class="eo-th eo-th--avatar" style="font-weight:600;font-size:12px;color:currentColor;">Image</th>
                                ${["encyclopedia", "vancouver"].includes(this.state.currentContactGroup) ? _th("Company Name", "company", "eo-th--company") : ""}
                                ${_th("First name", "firstName")}
                                ${_th("Last name", "lastName")}
                                ${this.state.currentContactGroup === "politicians" ? _th("Position", "position", "eo-th--position") : ""}
                                ${_th("Location", "location")}
                                ${this.state.currentContactGroup === "politicians" ? '<th class="eo-th eo-th--audio" title="Audio"><i class="fas fa-volume-up"></i></th>' : ""}
                                ${this.state.currentContactGroup === "politicians" ? _th("Birthday", "birthDate") : ""}
                                ${this.state.currentContactGroup === "politicians" ? _th("Xingzuo", "zodiac") : ""}
                                ${this.state.currentContactGroup === "politicians" ? _th("Shuxiang", "shuxiang") : ""}
                                ${_th("Created at", "createdAt")}
                                ${_th("Last updated", "updatedAt")}
                                ${_th("Email address", "email")}
                            </tr>
                        </thead>
                        <tbody>`;

        paginated.forEach((c) => {
          const nameStr = c.name || "Unknown";
          const first = c.firstName || nameStr.split(" ")[0] || "";
          const last =
            c.lastName || nameStr.split(" ").slice(1).join(" ") || "";
          const email = c.emails && c.emails.length > 0 ? c.emails[0] : "";
          const initials = (
            email.charAt(0) ||
            nameStr.charAt(0) ||
            "?"
          ).toUpperCase();
          const avatarBg = avatarColors[initials.toLowerCase()] || "#94a3b8";
          const isSelected = this.state.selectedContactIds.has(c.id);
          const createdStr = fmtDate(c.subscribedAt || c.createdAt);
          const updatedStr = fmtDate(
            c.updatedAt || c.subscribedAt || c.createdAt,
          );
          const zodiacLabel = this.normalizeChineseAstrologyLabel(c.zodiac || c.xingzuo);
          const shuxiangLabel = this.normalizeChineseAstrologyLabel(c.shuxiang || c.chineseZodiac);

          html += `
                    <tr class="eo-row ${isSelected ? "eo-row--selected" : ""}"
                        onclick="App.handleContactClick('${c.id}', event)">
                        <td class="eo-td eo-td--check" onclick="event.stopPropagation()">
                            <input type="checkbox" class="eo-checkbox" ${isSelected ? "checked" : ""}
                                   onchange="App.handleContactClick('${c.id}', event)">
                        </td>
                        <td class="eo-td eo-td--avatar">
                            ${this.contactAvatarHtml(c, 32, "eo-avatar")}
                        </td>
                        ${["encyclopedia", "vancouver"].includes(this.state.currentContactGroup) ? `<td class="eo-td"><b>${this._contactFormEscape(c.company || c.name)}</b></td>` : ""}
                        <td class="eo-td">${this._contactFormEscape(first)}</td>
                        <td class="eo-td">${this._contactFormEscape(last)}</td>
                        ${this.state.currentContactGroup === "politicians" ? `<td class="eo-td eo-td--position" title="${c.position ? this._contactFormEscape(c.position) : ''}">${c.position ? this._contactFormEscape(c.position) : '<span style="color:#bbb">-</span>'}</td>` : ""}
                        <td class="eo-td eo-td--location">${c.location ? `<button class="eo-filter-chip eo-filter-chip--truncate" onclick="event.stopPropagation();App.filterContactsByTagValue('${attrEscape(c.location)}')" title="${this._contactFormEscape(c.location)}">${this._contactFormEscape(c.location)}</button>` : '<span style="color:#bbb">-</span>'}</td>
                        ${this.state.currentContactGroup === "politicians"
              ? `
                        <td class="eo-td eo-td--audio" onclick="event.stopPropagation()">
                            <div class="eo-audio-cell">
                                ${this.contactAudioControls(c, "referWav", "reference", "Ref", true)}
                                ${this.contactAudioControls(c, "cloneWav", "clone", "Clone", true)}
                                ${this.contactVoiceWrongButton(c, true)}
                                ${!c.referWav && !c.cloneWav ? '<span style="color:#bbb">-</span>' : ""}
                            </div>
                        </td>
                        <td class="eo-td">${c.birthDate || '<span style="color:#bbb">-</span>'}</td>
                        <td class="eo-td">${zodiacLabel ? `<button class="eo-filter-chip" onclick="event.stopPropagation();App.filterContactsByTagValue('${attrEscape(zodiacLabel)}')" title="Filter by xingzuo">${this._contactFormEscape(zodiacLabel)}</button>` : '<span style="color:#bbb">-</span>'}</td>
                        <td class="eo-td">${shuxiangLabel ? `<button class="eo-filter-chip" onclick="event.stopPropagation();App.filterContactsByTagValue('${attrEscape(shuxiangLabel)}')" title="Filter by shuxiang">${this._contactFormEscape(shuxiangLabel)}</button>` : '<span style="color:#bbb">-</span>'}</td>
                        `
              : ""
            }
                        <td class="eo-td eo-td--date">${createdStr}</td>
                        <td class="eo-td eo-td--date">${updatedStr}</td>
                        <td class="eo-td eo-td--email">
                            ${email
              ? `<a class="eo-email-link"
                               onclick="event.stopPropagation();App.showContactDetail('${c.id}')">${email}</a>
                            <button class="btn btn-sm btn-link p-0 ms-2" title="Send email"
                                    onclick="event.stopPropagation();App.composeTo('${email}')"
                                    style="color: #6c5ce7; opacity: 0.6; font-size: 11px;">
                                <i class="fas fa-paper-plane"></i>
                            </button>`
              : '<span style="color:#bbb">—</span>'
            }
                        </td>
                    </tr>`;
        });

        html += `</tbody></table></div>`;
      }

      // =====================================================================
      // STANDARD LIST MODE
      // =====================================================================
    } else {
      let lastLetter = "";
      filtered.forEach((c) => {
        const nameStr = c.name || "Unknown";
        const firstLetter = nameStr.charAt(0).toUpperCase();
        if (firstLetter !== lastLetter) {
          html += `<div class="alphabet-divider">${firstLetter}</div>`;
          lastLetter = firstLetter;
        }
        const primaryEmail = c.emails && c.emails.length > 0 ? c.emails[0] : "";
        const isSelected =
          this.state.selectedContactId === c.id ||
          this.state.selectedContactIds.has(c.id);
        html += `
                    <div class="contact-item ${isSelected ? "selected" : ""}"
                         onclick="App.handleContactClick('${c.id}', event)">
                        <div class="contact-avatar">${nameStr.charAt(0)}</div>
                        <div class="contact-info">
                            <div class="contact-name">${this._contactFormEscape(nameStr)}</div>
                            <div class="contact-email">
                                ${primaryEmail}
                                ${c.emails && c.emails.length > 1
            ? `<span class="contact-email-more">+${c.emails.length - 1}</span>`
            : ""
          }
                            </div>
                        </div>
                    </div>`;
      });

      if (filtered.length === 0) {
        html = this.emptyContactsGroupHtml();
      }
    }

    listContainer.innerHTML = html;
    const alphabetSource = this.state.contacts.filter((contact) => {
      let matchesGroup = false;
      if (this.state.currentContactGroup === "all") {
        matchesGroup = true;
      } else if (this.state.currentContactGroup?.startsWith("domain:")) {
        const domain = this.state.currentContactGroup.split(":")[1];
        matchesGroup = (contact.emails || []).some(
          (email) => email.split("@")[1]?.toLowerCase() === domain,
        );
      } else {
        matchesGroup = contact.group === this.state.currentContactGroup;
      }
      const nameStr = contact.name || "";
      const query = (this.state.contactSearchQuery || "").toLowerCase();
      const activeQuery = query.length >= 2 ? query : "";
      const searchableText = [
        nameStr,
        contact.location,
        contact.position,
        contact.profile,
        contact.wikiLink,
        contact.birthDate,
        contact.birthday,
        this.normalizeChineseAstrologyLabel(contact.zodiac),
        this.normalizeChineseAstrologyLabel(contact.xingzuo),
        this.normalizeChineseAstrologyLabel(contact.shuxiang),
        this.normalizeChineseAstrologyLabel(contact.chineseZodiac),
        ...(contact.emails || []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const matchesSearch = !activeQuery || searchableText.includes(activeQuery);
      const tagFilter = (this.state.contactTagFilter || "").toLowerCase();
      const matchesTag =
        !tagFilter ||
        (contact.tags || []).some(
          (tag) => String(tag).toLowerCase() === tagFilter,
        );
      return matchesGroup && matchesSearch && matchesTag;
    });
    const alphabetHtml = this.contactAlphabetFooterHtml(alphabetSource);
    const tagSummaryHtml = isRichGroup
      ? this.contactTagSummaryHtml(filtered)
      : "";
    countContainer.innerHTML = `
      <div class="eo-contact-footer-row">
      ${alphabetHtml}
      <span>${filtered.length} contacts found.</span>
      ${isRichGroup
        ? `
          <button class="eo-pill eo-pill--active" onclick="App.${['vancouver', 'encyclopedia'].includes(this.state.currentContactGroup) ? 'syncBusinessDirectory()' : 'syncPoliticians()'}" style="background:#e8e4f8;color:#6c5ce7;border-color:#d4ccf5;">
              <i class="fas fa-sync-alt"></i> Sync
          </button>
          <button class="eo-pill eo-pill--active" onclick="App.openFamousPeopleListModal && App.openFamousPeopleListModal()" style="background:#e8f7ef;color:#167345;border-color:#bfe7cf;">
              <i class="fas fa-microphone-lines"></i> Voice List
          </button>
          <button class="eo-pill eo-pill--active" onclick="App.fixMissingPoliticianFields()" style="background:#fff3cd;color:#856404;border-color:#ffeeba;">
              <i class="fas fa-magic"></i> Fix Fields
          </button>`
        : ""
      }
      </div>`;
    if (tagSummaryHtml) countContainer.innerHTML += tagSummaryHtml;
    this.renderContactGroups();
  },

  renderContactGroups() {
    const container = document.getElementById("contact-groups");
    if (!container) return;

    const groups = [
      { id: "all", name: "All Contacts", icon: "fa-users", system: true },
      ...(this.state.contactLists || this.defaultContactLists()),
    ]
      .map((group) => ({
        ...group,
        count:
          group.id === "all"
            ? this.state.contacts.length
            : this.state.contacts.filter((contact) => contact.group === group.id).length,
      }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
    const esc = (value) => this._contactFormEscape(value);

    let html = '<ul class="listing folderlist">';
    groups.forEach((g) => {
      const isSelected = this.state.currentContactGroup === g.id;
      html += `
                <li class="mailbox group-${g.id}">
                    <a class="${isSelected ? "selected" : ""}"
                       onclick="App.filterContactsByGroup('${g.id}')">
                        <i class="fas ${esc(g.icon || "fa-address-book")}"></i>
                        <span class="name">${esc(g.name)}</span>
                        <span class="count">${g.count}</span>
                    </a>
                </li>`;
    });
    html += `
                <li class="mailbox group-add-list">
                    <a onclick="App.addContactList()">
                        <i class="fas fa-plus-circle"></i>
                        <span class="name">Add contact list</span>
                    </a>
                </li>
                <li class="mailbox group-rename-list">
                    <a onclick="App.renameCurrentContactList()">
                        <i class="fas fa-edit"></i>
                        <span class="name">Rename current list</span>
                    </a>
                </li>
                <li class="mailbox group-delete-list">
                    <a onclick="App.deleteCurrentContactList()">
                        <i class="fas fa-trash-alt"></i>
                        <span class="name">Delete current list</span>
                    </a>
                </li>
                <li class="mailbox group-forms">
                    <a onclick="$('#modal-subscribe-form').modal('show')">
                        <i class="fas fa-wpforms"></i>
                        <span class="name">Forms</span>
                    </a>
                </li>
                <li class="mailbox group-campaigns">
                    <a onclick="App.switchTask('campaigns')">
                        <i class="fas fa-paper-plane"></i>
                        <span class="name">Campaigns</span>
                    </a>
                </li>
                <li class="mailbox group-reports">
                    <a onclick="App.switchTask('reports')">
                        <i class="fas fa-chart-line"></i>
                        <span class="name">Reports</span>
                    </a>
                </li>
                <li class="mailbox group-automations">
                    <a onclick="App.switchTask('automations')">
                        <i class="fas fa-robot"></i>
                        <span class="name">Automations</span>
                    </a>
                </li>`;
    html += "</ul>";

    const domains = new Map();
    this.state.contacts.forEach((c) => {
      if (c.emails) {
        c.emails.forEach((e) => {
          const parts = e.split("@");
          if (parts.length === 2 && parts[1])
            domains.set(parts[1].toLowerCase(), (domains.get(parts[1].toLowerCase()) || 0) + 1);
        });
      }
    });

    if (domains.size > 0) {
      html += `<div style="padding:10px 15px;font-weight:bold;font-size:12px;color:#666;margin-top:10px;"
                          class="text-uppercase">Domains</div>`;
      html += '<ul class="listing folderlist">';
      Array.from(domains.entries())
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .forEach(([domain, count]) => {
          const isSelected =
            this.state.currentContactGroup === `domain:${domain}`;
          html += `
                    <li class="mailbox">
                        <a class="${isSelected ? "selected" : ""}"
                           onclick="App.filterContactsByGroup('domain:${domain}')">
                            <i class="fas fa-globe"></i>
                            <span class="name">@${domain}</span>
                            <span class="count">${count}</span>
                        </a>
                    </li>`;
        });
      html += "</ul>";
    }

    container.innerHTML = html;
  },

  // =========================================================================
  // CONTACTS — Filtering & Selection
  // =========================================================================

  filterContactsByGroup(group) {
    this.state.currentContactGroup = group;
    this.state.selectedContactId = null;
    this.state.selectedContactIds.clear();
    this.state.contactPage = 0;
    this.state.contactTagFilter = "";

    if (group === "politicians") {
      window.history.pushState(null, null, "#politicians");
      document
        .querySelectorAll("#taskmenu a")
        .forEach((a) => a.classList.remove("selected"));
      const btn = document.querySelector("#taskmenu a.politicians");
      if (btn) btn.classList.add("selected");
    } else if (group === "all") {
      window.history.pushState(null, null, "#contacts");
      document
        .querySelectorAll("#taskmenu a")
        .forEach((a) => a.classList.remove("selected"));
      const btn = document.querySelector("#taskmenu a.contacts");
      if (btn) btn.classList.add("selected");
    } else {
      window.history.pushState(
        null,
        null,
        `#contacts?group=${encodeURIComponent(group)}`,
      );
      document
        .querySelectorAll("#taskmenu a")
        .forEach((a) => a.classList.remove("selected"));
      const btn = document.querySelector("#taskmenu a.contacts");
      if (btn) btn.classList.add("selected");
    }

    this.renderContacts();
    this.renderContactDetailsPlaceholder();
  },

  slugifyContactListId(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  },

  async addContactList() {
    const nameInput = prompt("New contact list name:", "XO Tours CA Customers");
    if (nameInput === null) return;

    const name = nameInput.trim();
    if (!name) {
      alert("Contact list name cannot be empty.");
      return;
    }

    const suggestedId = this.slugifyContactListId(name);
    const idInput = prompt("Contact list id:", suggestedId);
    if (idInput === null) return;

    const id = this.slugifyContactListId(idInput);
    if (!id) {
      alert("Contact list id cannot be empty.");
      return;
    }

    if (
      (this.state.contactLists || []).some((list) => list.id === id) ||
      id === "all" ||
      id.startsWith("domain:")
    ) {
      alert("A contact list with this id already exists.");
      return;
    }

    if (!this.state.contactLists)
      this.state.contactLists = this.defaultContactLists();
    this.state.contactLists.push({
      id,
      name,
      icon: "fa-envelope-open-text",
    });

    await this.saveContactListsToServer();
    await this.ensureContactListFile(id);
    this.state.currentContactGroup = id;
    this.state.contactPage = 0;
    this.renderContacts();
  },

  async ensureContactListFile(group) {
    try {
      await fetch("/api/contact-group-export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ group, contacts: [] }),
      });
    } catch (e) {
      console.error("Failed to create contact list file:", e);
    }
  },

  async syncBusinessDirectory() {
    if (
      !confirm(
        "This will sync the latest business data from Google Drive. It may take a minute. Continue?",
      )
    )
      return;

    const overlay = document.createElement("div");
    overlay.innerHTML = `
            <div style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
                <div style="background:#fff;padding:30px;border-radius:12px;width:380px;text-align:center;box-shadow:0 10px 25px rgba(0,0,0,0.2);">
                    <div style="font-size:40px;color:#6c5ce7;margin-bottom:15px;"><i class="fas fa-spinner fa-spin"></i></div>
                    <h3 style="margin:0 0 10px;font-size:18px;color:#1a1a2e;">Syncing Business Data from Drive</h3>
                    <div style="width:100%;background:#f1f2f6;border-radius:10px;height:8px;margin:15px 0;overflow:hidden;">
                        <div id="sync-progress-bar" style="width:0%;background:#6c5ce7;height:100%;transition:width 0.3s ease;"></div>
                    </div>
                    <p id="sync-progress-text" style="margin:0;font-size:14px;color:#666;line-height:1.4;">Starting sync process...</p>
                </div>
            </div>
        `;
    document.body.appendChild(overlay);

    try {
      const industryParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
      const currentIndustry = industryParams.get('Industry');
      const filename = currentIndustry ? `vancouver_${currentIndustry.toLowerCase()}.json` : 'vancouver_leads.json';
      
      const es = new EventSource(`/api/sync-business?file=${filename}`);
      es.onmessage = async (e) => {
        const msg = JSON.parse(e.data);
        if (msg.done) {
          es.close();
          if (msg.code === 0) {
            overlay.querySelector("h3").innerText = "Sync Complete!";
            overlay.querySelector("#sync-progress-bar").style.width = "100%";
            overlay.querySelector("#sync-progress-bar").style.background = "#2ed573";
            overlay.querySelector("#sync-progress-text").innerText = "Success!";
            setTimeout(() => {
              document.body.removeChild(overlay);
            }, 2000);
          } else {
            overlay.querySelector("h3").innerText = "Sync Failed";
            overlay.querySelector("#sync-progress-bar").style.background = "#ff4757";
            overlay.querySelector("#sync-progress-text").innerText = "Error code: " + msg.code;
            setTimeout(() => {
              document.body.removeChild(overlay);
            }, 3000);
          }
        } else {
            overlay.querySelector("#sync-progress-text").innerText = msg.msg || "";
            overlay.querySelector("#sync-progress-bar").style.width = "50%";
        }
      };

      es.onerror = () => {
        es.close();
        overlay.querySelector("h3").innerText = "Sync Error";
        overlay.querySelector("#sync-progress-bar").style.background = "#ff4757";
        overlay.querySelector("#sync-progress-text").innerText = "Lost connection to server.";
        setTimeout(() => document.body.removeChild(overlay), 3000);
      };
    } catch (e) {
        document.body.removeChild(overlay);
        alert("Sync request failed: " + e.message);
    }
  },


  async syncPoliticians() {
    if (
      !confirm(
        "This will fetch the latest politicians from Google Drive. It may take a minute. Continue?",
      )
    )
      return;

    let totalFolders = 0;
    const overlay = document.createElement("div");
    overlay.innerHTML = `
            <div style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
                <div style="background:#fff;padding:30px;border-radius:12px;width:380px;text-align:center;box-shadow:0 10px 25px rgba(0,0,0,0.2);">
                    <div style="font-size:40px;color:#6c5ce7;margin-bottom:15px;"><i class="fas fa-spinner fa-spin"></i></div>
                    <h3 style="margin:0 0 10px;font-size:18px;color:#1a1a2e;">Syncing from Drive</h3>
                    <div style="width:100%;background:#f1f2f6;border-radius:10px;height:8px;margin:15px 0;overflow:hidden;">
                        <div id="sync-progress-bar" style="width:0%;background:#6c5ce7;height:100%;transition:width 0.3s ease;"></div>
                    </div>
                    <p id="sync-progress-text" style="margin:0;font-size:14px;color:#666;line-height:1.4;">Connecting to Drive API...</p>
                </div>
            </div>
        `;
    document.body.appendChild(overlay);

    try {
      const es = new EventSource("/api/sync-politicians");
      es.onmessage = async (e) => {
        const msg = JSON.parse(e.data);

        if (msg.startsWith("TOTAL_FOLDERS:")) {
          totalFolders = parseInt(msg.split(":")[1], 10);
        } else if (msg.startsWith("PROCESSING:")) {
          const parts = msg.split(":");
          const curr = parseInt(parts[1], 10);
          const name = parts.slice(2).join(":");
          if (totalFolders > 0) {
            const pct = Math.round((curr / totalFolders) * 100);
            overlay.querySelector("#sync-progress-bar").style.width = pct + "%";
            overlay.querySelector("#sync-progress-text").innerText =
              `Processing ${curr} of ${totalFolders}:\n${name}`;
          } else {
            overlay.querySelector("#sync-progress-text").innerText =
              `Processing: ${name}`;
          }
        } else if (msg.startsWith("DONE:")) {
          const code = msg.split(":")[1];
          es.close();
          if (code === "0") {
            overlay.querySelector("h3").innerText = "Sync Complete!";
            overlay.querySelector(".fa-spinner").className =
              "fas fa-check-circle";
            overlay.querySelector(".fa-check-circle").style.color = "#00b894";
            overlay.querySelector("#sync-progress-bar").style.background =
              "#00b894";
            overlay.querySelector("#sync-progress-bar").style.width = "100%";
            overlay.querySelector("#sync-progress-text").innerText =
              "Reloading contacts...";
            await this.loadContacts();
            this.renderContacts();
            setTimeout(() => document.body.removeChild(overlay), 1500);
          } else {
            overlay.querySelector("h3").innerText = "Sync Failed";
            overlay.querySelector(".fa-spinner").className =
              "fas fa-times-circle";
            overlay.querySelector(".fa-times-circle").style.color = "#d63031";
            overlay.querySelector("#sync-progress-bar").style.background =
              "#d63031";
            overlay.querySelector("#sync-progress-text").innerText =
              "Process exited with code " + code;

            const btn = document.createElement("button");
            btn.innerText = "Close";
            btn.style.cssText =
              "margin-top:20px;padding:8px 20px;background:#f0f0f0;border:none;border-radius:6px;cursor:pointer;";
            btn.onclick = () => document.body.removeChild(overlay);
            overlay.firstElementChild.appendChild(btn);
          }
        } else if (msg.startsWith("ERROR:")) {
          // Update p but don't close yet, wait for DONE
          overlay.querySelector("#sync-progress-text").innerHTML =
            '<span style="color:#e17055">' + msg + "</span>";
        } else {
          // It's a standard progress update
          // Only update text if it's not during the heavy folder loop so it doesn't flicker
          if (!msg.startsWith("Processed:")) {
            overlay.querySelector("#sync-progress-text").innerText = msg;
          }
        }
      };
      es.onerror = () => {
        es.close();
        overlay.querySelector("h3").innerText = "Network Error";
        overlay.querySelector(".fa-spinner").className =
          "fas fa-exclamation-triangle";
        overlay.querySelector(".fa-exclamation-triangle").style.color =
          "#e17055";
        overlay.querySelector("#sync-progress-bar").style.background =
          "#e17055";
        overlay.querySelector("#sync-progress-text").innerText =
          "Lost connection to sync process.";

        const btn = document.createElement("button");
        btn.innerText = "Close";
        btn.style.cssText =
          "margin-top:20px;padding:8px 20px;background:#f0f0f0;border:none;border-radius:6px;cursor:pointer;";
        btn.onclick = () => document.body.removeChild(overlay);
        overlay.firstElementChild.appendChild(btn);
      };
    } catch (e) {
      console.error(e);
      overlay.querySelector("h3").innerText = "Error";
      overlay.querySelector(".fa-spinner").className =
        "fas fa-exclamation-triangle";
      overlay.querySelector(".fa-exclamation-triangle").style.color = "#e17055";
      overlay.querySelector("p").innerText = "Failed to trigger sync.";

      const btn = document.createElement("button");
      btn.innerText = "Close";
      btn.style.cssText =
        "margin-top:20px;padding:8px 20px;background:#f0f0f0;border:none;border-radius:6px;cursor:pointer;";
      btn.onclick = () => document.body.removeChild(overlay);
      overlay.firstElementChild.appendChild(btn);
    }
  },

  toggleFetchNewsDropdown(contactId) {
    const dropdown = document.getElementById(`fetch-news-dropdown-${contactId}`);
    if (!dropdown) return;
    const isVisible = dropdown.style.display !== 'none';
    // Close all open dropdowns first
    document.querySelectorAll('[id^="fetch-news-dropdown-"]').forEach(d => d.style.display = 'none');
    if (!isVisible) {
      dropdown.style.display = 'block';
      // Close when clicking outside
      const closeHandler = (e) => {
        const wrapper = document.getElementById(`fetch-news-dropdown-wrapper-${contactId}`);
        if (wrapper && !wrapper.contains(e.target)) {
          dropdown.style.display = 'none';
          document.removeEventListener('click', closeHandler);
        }
      };
      setTimeout(() => document.addEventListener('click', closeHandler), 0);
    }
  },

  async fixMissingPoliticianFields(contactId = '') {
    if (!confirm(contactId ? "Fetch missing info from Wikipedia for this person?" : "Fetch missing info from Wikipedia for all politicians?")) return;

    const overlay = document.createElement("div");
    overlay.innerHTML = `
      <div style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
          <div style="background:#fff;padding:30px;border-radius:12px;width:380px;text-align:center;box-shadow:0 10px 25px rgba(0,0,0,0.2);">
              <div style="font-size:40px;color:#856404;margin-bottom:15px;"><i class="fas fa-spinner fa-spin"></i></div>
              <h3 style="margin:0 0 10px;font-size:18px;color:#1a1a2e;">Fixing Missing Fields</h3>
              <p id="fix-progress-text" style="margin:0;font-size:14px;color:#666;line-height:1.4;white-space:pre-wrap;word-break:break-word;max-height:150px;overflow-y:auto;text-align:left;background:#f8f9fa;padding:10px;border-radius:6px;">Connecting...</p>
          </div>
      </div>
    `;
    document.body.appendChild(overlay);
    const progressEl = overlay.querySelector("#fix-progress-text");
    let logs = [];

    try {
      const url = contactId ? `/api/fix-missing-fields?id=${encodeURIComponent(contactId)}` : '/api/fix-missing-fields';
      const es = new EventSource(url);
      es.onmessage = async (e) => {
        const msg = JSON.parse(e.data);
        if (msg.startsWith("DONE:")) {
          es.close();
          const code = msg.split(":")[1];
          if (code === "0") {
            overlay.querySelector("h3").innerText = "Success!";
            overlay.querySelector(".fa-spinner").className = "fas fa-check-circle";
            overlay.querySelector(".fa-check-circle").style.color = "#00b894";
            progressEl.innerText = "Reloading contacts...";
            await this.loadContacts();
            this.renderContacts();
            if (contactId && this.state.selectedContactId === contactId) {
                this.showContactDetail(contactId);
            }
            setTimeout(() => document.body.removeChild(overlay), 1000);
          } else {
            overlay.querySelector("h3").innerText = "Process Failed";
            overlay.querySelector(".fa-spinner").className = "fas fa-times-circle";
            overlay.querySelector(".fa-times-circle").style.color = "#d63031";
            const btn = document.createElement("button");
            btn.innerText = "Close";
            btn.style.cssText = "margin-top:20px;padding:8px 20px;background:#f0f0f0;border:none;border-radius:6px;cursor:pointer;";
            btn.onclick = () => document.body.removeChild(overlay);
            overlay.firstElementChild.appendChild(btn);
          }
        } else if (msg.startsWith("ERROR:")) {
            logs.push('<span style="color:#d63031">' + msg + '</span>');
            progressEl.innerHTML = logs.slice(-10).join('<br>');
        } else {
            logs.push(msg);
            progressEl.innerHTML = logs.slice(-10).join('<br>');
            progressEl.scrollTop = progressEl.scrollHeight;
        }
      };
      es.onerror = () => {
        es.close();
        overlay.querySelector("h3").innerText = "Network Error";
        overlay.querySelector(".fa-spinner").className = "fas fa-exclamation-triangle";
        overlay.querySelector(".fa-exclamation-triangle").style.color = "#e17055";
        progressEl.innerText = "Lost connection to process.";
        const btn = document.createElement("button");
        btn.innerText = "Close";
        btn.style.cssText = "margin-top:20px;padding:8px 20px;background:#f0f0f0;border:none;border-radius:6px;cursor:pointer;";
        btn.onclick = () => document.body.removeChild(overlay);
        overlay.firstElementChild.appendChild(btn);
      };
    } catch (e) {
      console.error(e);
      document.body.removeChild(overlay);
      alert("Failed to start process.");
    }
  },

  async renameCurrentContactList() {
    const id = this.state.currentContactGroup;
    if (!id || id === "all" || id.startsWith("domain:")) {
      alert("Select a contact list before renaming.");
      return;
    }

    const list = (this.state.contactLists || []).find((item) => item.id === id);
    if (!list) return;

    const nextName = prompt("Rename contact list:", list.name || id);
    if (nextName === null) return;

    const name = nextName.trim();
    if (!name) {
      alert("Contact list name cannot be empty.");
      return;
    }

    list.name = name;
    await this.saveContactListsToServer();
    this.renderContacts();
  },

  async deleteCurrentContactList() {
    const id = this.state.currentContactGroup;
    if (!id || id === "all" || id.startsWith("domain:")) {
      alert("Select a contact list before deleting.");
      return;
    }

    const list = (this.state.contactLists || []).find((item) => item.id === id);
    if (!list) return;

    if (list.system) {
      alert("System contact lists cannot be deleted.");
      return;
    }

    const contactsInList = (this.state.contacts || []).filter(
      (contact) => contact.group === id,
    ).length;
    const msg = contactsInList
      ? `Delete "${list.name || id}"? ${contactsInList} contacts will be moved to Personal Addresses.`
      : `Delete "${list.name || id}"?`;
    if (!confirm(msg)) return;

    this.state.contactLists = (this.state.contactLists || []).filter(
      (item) => item.id !== id,
    );
    this.state.contacts = (this.state.contacts || []).map((contact) =>
      contact.group === id ? { ...contact, group: "personal" } : contact,
    );
    this.state.currentContactGroup = "all";
    this.state.selectedContactId = null;
    this.state.contactPage = 0;

    await this.saveContactListsToServer();
    await this.saveContactsToStorage();
    this.renderContacts();
  },

  searchContacts(query) {
    const trimmed = (query || "").trim();
    if (trimmed.length === 1) {
      return;
    }
    this.state.contactSearchQuery = query;
    this.state.contactLetterFilter = "";
    this.state.contactPage = 0;
    this.renderContacts();
  },

  clearContactFilter() {
    this.state.contactSearchQuery = "";
    this.state.contactLetterFilter = "";
    this.state.contactTagFilter = "";
    this.state.contactPage = 0;
    this.state.selectedContactId = null;
    this.state.selectedContactIds.clear();
    this.updateContactsUrl();
    this.renderContacts();
  },

  setContactViewMode(mode) {
    this.state.contactViewMode = mode;
    this.state.selectedContactId = null;
    this.state.selectedContactIds.clear();
    this.state.contactPage = 0;
    this.renderContacts();
  },

  filterContactsByTagValue(value) {
    const textarea = document.createElement("textarea");
    textarea.innerHTML = String(value || "")
      .replace(/<[^>]*>/g, "")
      .trim();
    const cleanValue = textarea.value;
    this.state.contactSearchQuery = cleanValue;
    this.state.contactLetterFilter = "";
    this.state.contactPage = 0;
    this.state.selectedContactId = null;
    this.state.selectedContactIds.clear();
    this.renderContacts();
  },

  filterContactsByTag(tag) {
    const textarea = document.createElement("textarea");
    textarea.innerHTML = String(tag || "")
      .replace(/<[^>]*>/g, "")
      .trim();
    const cleanTag = textarea.value;
    this.state.contactTagFilter = cleanTag;
    this.state.contactLetterFilter = "";
    this.state.contactPage = 0;
    this.state.selectedContactId = null;
    this.state.selectedContactIds.clear();
    this.updateContactsUrl();
    this.renderContacts();
  },

  clearContactTagFilter() {
    this.state.contactTagFilter = "";
    this.state.contactLetterFilter = "";
    this.state.contactPage = 0;
    this.state.selectedContactId = null;
    this.state.selectedContactIds.clear();
    this.updateContactsUrl();
    this.renderContacts();
  },

  /** Rename a tag from the Tags dropdown (inline rename via prompt). */
  _renameContactTag(oldName) {
    // Decode HTML entities that may have been escaped
    const textarea = document.createElement("textarea");
    textarea.innerHTML = String(oldName || "").replace(/<[^>]*>/g, "").trim();
    const cleanOld = textarea.value;
    const newName = prompt(`Rename tag "${cleanOld}":`, cleanOld);
    if (!newName || !newName.trim() || newName.trim() === cleanOld) return;
    const trimmed = newName.trim();

    // Update the tags store
    const tag = (this.state.tags || []).find((t) =>
      (typeof t === "string" ? t : t?.name) === cleanOld
    );
    if (tag) {
      if (typeof tag === "string") {
        const idx = this.state.tags.indexOf(tag);
        if (idx !== -1) this.state.tags[idx] = trimmed;
      } else {
        tag.name = trimmed;
      }
    }

    // Update all contacts that use this tag
    (this.state.contacts || []).forEach((c) => {
      if (c.tags) {
        const idx = c.tags.indexOf(cleanOld);
        if (idx !== -1) c.tags[idx] = trimmed;
      }
    });

    // If currently filtering by the old tag, update the filter
    if (this.state.contactTagFilter === cleanOld) {
      this.state.contactTagFilter = trimmed;
    }

    // Persist
    if (this.saveTagsToStorage) this.saveTagsToStorage();
    if (this.saveContactsToStorage) this.saveContactsToStorage();
    this.renderContacts();
  },

  /** Delete a tag from the Tags dropdown. */
  _deleteContactTag(oldName) {
    const textarea = document.createElement("textarea");
    textarea.innerHTML = String(oldName || "").replace(/<[^>]*>/g, "").trim();
    const cleanOld = textarea.value;

    if (!confirm(`Are you sure you want to delete the tag "${cleanOld}"? This will remove it from all contacts.`)) return;

    // Update the tags store
    const tag = (this.state.tags || []).find((t) =>
      (typeof t === "string" ? t : t?.name) === cleanOld
    );
    if (tag) {
      if (typeof tag === "string") {
        const idx = this.state.tags.indexOf(tag);
        if (idx !== -1) this.state.tags.splice(idx, 1);
      } else {
        this.state.tags = this.state.tags.filter((t) => t !== tag);
      }
    }

    // Update all contacts that use this tag
    (this.state.contacts || []).forEach((c) => {
      if (c.tags) {
        c.tags = c.tags.filter((t) => t !== cleanOld);
      }
    });

    // If currently filtering by the old tag, clear the filter
    if (this.state.contactTagFilter === cleanOld) {
      this.clearContactTagFilter();
      return; // clearContactTagFilter already calls renderContacts
    }

    // Persist
    if (this.saveTagsToStorage) this.saveTagsToStorage();
    if (this.saveContactsToStorage) this.saveContactsToStorage();
    this.renderContacts();
  },

  filterContactsByLetter(letter) {
    const cleanLetter = String(letter || "").trim().charAt(0).toUpperCase();
    if (!/^[A-Z]$/.test(cleanLetter)) return;
    this.state.contactLetterFilter =
      this.state.contactLetterFilter === cleanLetter ? "" : cleanLetter;
    this.state.contactPage = 0;
    this.state.selectedContactId = null;
    this.state.selectedContactIds.clear();
    this.renderContacts();
  },

  /** Convert a contact name to a URL-friendly slug: "Xi Jinping" → "Xi_Jinping" */
  _contactNameSlug(name) {
    return (name || "").trim().replace(/\s+/g, "_");
  },

  /** Find a contact by its name-slug (case-insensitive).
   *  Matches against: name, and the English article name from wikiLink.
   *  e.g. both "何立峰" and "He_Lifeng" will find the same contact. */
  _findContactBySlug(slug) {
    if (!slug) return null;
    const normalized = slug.replace(/_/g, " ").toLowerCase();
    return this.state.contacts.find((c) => {
      // Match by contact name
      if ((c.name || "").toLowerCase() === normalized) return true;
      if ((c.company || "").toLowerCase() === normalized) return true;
      if ((c.aliases || []).some((alias) => String(alias || "").toLowerCase() === normalized)) return true;
      // Match by Wikipedia article name (last segment of wikiLink path)
      if (c.wikiLink) {
        try {
          const wikiPath = new URL(c.wikiLink).pathname;
          const article = decodeURIComponent(wikiPath.split("/").pop() || "")
            .replace(/_/g, " ")
            .toLowerCase();
          if (article === normalized) return true;
        } catch (_) { }
      }
      return false;
    });
  },

  updateContactsUrl() {
    const params = new URLSearchParams();
    if (
      this.state.currentContactGroup &&
      !["all", "politicians"].includes(this.state.currentContactGroup)
    ) {
      params.set("group", this.state.currentContactGroup);
    }
    if (this.state.contactTagFilter)
      params.set("tag", this.state.contactTagFilter);

    const base =
      this.state.currentContactGroup === "politicians"
        ? "#politicians"
        : "#contacts";
    let url = base;
    if (this.state.selectedContactId) {
      const contact = this.state.contacts.find((c) => c.id === this.state.selectedContactId);
      if (contact) {
        url += `/${encodeURIComponent(this._contactNameSlug(contact.name))}`;
      }
    }
    const query = params.toString();
    window.history.pushState(null, null, query ? `${url}?${query}` : url);
  },

  contactAudioControls(contact, field, label, actionLabel = label, iconOnly = false) {
    const hasAudio = Boolean(contact?.[field]);
    if (!hasAudio) return "";
    const buttonClass = iconOnly ? "eo-audio-mini eo-audio-mini--icon" : "eo-audio-mini";
    const text = iconOnly ? "" : ` ${actionLabel}`;
    return `
            <button class="${buttonClass}" title="Play ${label} audio" onclick="App.playContactAudio('${contact.id}','${field}', this)">
                <i class="fas fa-play"></i>${text}
            </button>`;
  },

  contactWikiLink(contact, label = "Wikipedia", variant = "button") {
    const url = String(contact?.wikiLink || "").trim();
    if (!url) return "";
    const safeUrl = this._contactFormEscape(url);
    const safeLabel = this._contactFormEscape(label);
    const className =
      variant === "inline" ? "eo-wiki-inline" : "eo-wiki-button";
    return `<a class="${className}" href="${safeUrl}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()" title="Open Wikipedia page">
            <i class="fab fa-wikipedia-w"></i> ${safeLabel}
            <i class="fas fa-external-link-alt" style="font-size:10px;"></i>
        </a>`;
  },

  contactSocialLinks(contact) {
      let html = '';
      if (contact.twitter) {
          const url = contact.twitter.startsWith('http') ? contact.twitter : `https://twitter.com/${contact.twitter}`;
          html += `<a href="${this._contactFormEscape(url)}" target="_blank" rel="noopener noreferrer" class="eo-social-btn" style="text-decoration:none;"><i class="fab fa-twitter"></i> X / Twitter</a>`;
      }
      if (contact.facebook) {
          const url = contact.facebook.startsWith('http') ? contact.facebook : `https://facebook.com/${contact.facebook}`;
          html += `<a href="${this._contactFormEscape(url)}" target="_blank" rel="noopener noreferrer" class="eo-social-btn" style="text-decoration:none;"><i class="fab fa-facebook"></i> Facebook</a>`;
      }
      if (contact.instagram) {
          const url = contact.instagram.startsWith('http') ? contact.instagram : `https://instagram.com/${contact.instagram}`;
          html += `<a href="${this._contactFormEscape(url)}" target="_blank" rel="noopener noreferrer" class="eo-social-btn" style="text-decoration:none;"><i class="fab fa-instagram"></i> Instagram</a>`;
      }
      if (contact.youtube) {
          const url = contact.youtube.startsWith('http') ? contact.youtube : `https://youtube.com/${contact.youtube}`;
          html += `<a href="${this._contactFormEscape(url)}" target="_blank" rel="noopener noreferrer" class="eo-social-btn" style="text-decoration:none;"><i class="fab fa-youtube"></i> YouTube</a>`;
      }
      if (contact.truthSocial) {
          const url = contact.truthSocial.startsWith('http') ? contact.truthSocial : `https://truthsocial.com/@${contact.truthSocial}`;
          html += `<a href="${this._contactFormEscape(url)}" target="_blank" rel="noopener noreferrer" class="eo-social-btn" style="text-decoration:none;"><i class="fas fa-bullhorn"></i> Truth Social</a>`;
      }
      if (contact.bluesky) {
          const url = contact.bluesky.startsWith('http') ? contact.bluesky : `https://bsky.app/profile/${contact.bluesky}`;
          html += `<a href="${this._contactFormEscape(url)}" target="_blank" rel="noopener noreferrer" class="eo-social-btn" style="text-decoration:none;"><i class="fas fa-cloud"></i> Bluesky</a>`;
      }
      if (contact.tiktok) {
          const url = contact.tiktok.startsWith('http') ? contact.tiktok : `https://tiktok.com/@${contact.tiktok}`;
          html += `<a href="${this._contactFormEscape(url)}" target="_blank" rel="noopener noreferrer" class="eo-social-btn" style="text-decoration:none;"><i class="fab fa-tiktok"></i> TikTok</a>`;
      }
      return html;
  },

  contactVoiceWrongButton(contact, iconOnly = false) {
    if (!contact?.referWav && !contact?.cloneWav) return "";
    const status =
      contact.voiceStatus ||
      (contact.voiceRedo?.referWav || contact.voiceRedo?.cloneWav
        ? "wrong"
        : "");
    const isConfirmed = status === "confirmed";
    const isWrong = status === "wrong";
    const label = isConfirmed ? "Confirmed" : isWrong ? "Wrong" : "Check voice";
    const icon = isConfirmed
      ? "fa-check"
      : isWrong
        ? "fa-flag"
        : "fa-clipboard-check";
    const buttonClass = iconOnly ? "eo-audio-wrong eo-audio-wrong--icon" : "eo-audio-wrong";
    return `<button class="${buttonClass} ${isConfirmed ? "is-confirmed" : ""} ${isWrong ? "is-marked" : ""}" title="${this._contactFormEscape(label)}" onclick="App.chooseContactVoiceStatus('${contact.id}', this)">
            <i class="fas ${icon}"></i>${iconOnly ? "" : ` ${label}`}
        </button>`;
  },

  async chooseContactVoiceStatus(contactId, buttonEl) {
    const contact = (this.state.contacts || []).find((c) => c.id === contactId);
    const overlay = document.createElement("div");
    overlay.className = "eo-voice-status-modal";
    overlay.innerHTML = `
            <div class="eo-voice-status-dialog">
                <div class="eo-voice-status-title">Voice status</div>
                <div class="eo-voice-status-name">${this._contactFormEscape(contact?.name || "This contact")}</div>
                <div class="eo-voice-status-actions">
                    <button class="eo-voice-confirmed" type="button">
                        <i class="fas fa-check"></i> Confirmed
                    </button>
                    <button class="eo-voice-wrong" type="button">
                        <i class="fas fa-flag"></i> Wrong
                    </button>
                </div>
                <button class="eo-voice-cancel" type="button">Cancel</button>
            </div>
        `;
    document.body.appendChild(overlay);

    const close = () => overlay.remove();
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) close();
    });
    overlay.querySelector(".eo-voice-cancel").onclick = close;
    overlay.querySelector(".eo-voice-confirmed").onclick = async () => {
      close();
      await this.setContactVoiceConfirmed(contactId, buttonEl);
    };
    overlay.querySelector(".eo-voice-wrong").onclick = async () => {
      close();
      await this.markContactVoiceWrong(contactId, buttonEl);
    };
  },

  async setContactVoiceConfirmed(contactId, buttonEl) {
    const contact = (this.state.contacts || []).find((c) => c.id === contactId);
    if (!contact) return;
    contact.voiceStatus = "confirmed";
    contact.voiceConfirmedAt = Date.now();
    delete contact.voiceRedo;
    if (buttonEl) {
      buttonEl.classList.remove("is-marked");
      buttonEl.classList.add("is-confirmed");
      buttonEl.innerHTML = '<i class="fas fa-check"></i> Confirmed';
    }
    try {
      await fetch("/api/contact-voice-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId, status: "confirmed" }),
      });
    } catch (err) {
      console.warn("Failed to persist voice confirmed status:", err);
    }
  },

  async markContactVoiceWrong(contactId, buttonEl) {
    const contact = (this.state.contacts || []).find((c) => c.id === contactId);
    if (!contact?.referWav && !contact?.cloneWav) return;
    const fields = ["referWav", "cloneWav"].filter((field) => contact[field]);
    if (
      !confirm(
        `Mark ${contact.name || "this contact"} voice as wrong and send redo request to Google Drive?`,
      )
    )
      return;

    const originalHtml = buttonEl?.innerHTML;
    if (buttonEl) {
      buttonEl.disabled = true;
      buttonEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending';
    }

    try {
      const res = await fetch("/api/drive-audio-redo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId,
          name: contact.name,
          fields,
          driveFolder: contact.driveFolder,
          audioUrls: Object.fromEntries(
            fields.map((field) => [field, contact[field]]),
          ),
          reason: "Voice marked wrong from politicians contact view",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success)
        throw new Error(data.error || "Failed to send redo request");

      contact.voiceRedo = { ...(contact.voiceRedo || {}) };
      fields.forEach((field) => {
        contact.voiceRedo[field] = data.marker;
      });
      contact.voiceStatus = "wrong";
      if (buttonEl) {
        buttonEl.disabled = false;
        buttonEl.classList.add("is-marked");
        buttonEl.classList.remove("is-confirmed");
        buttonEl.innerHTML = '<i class="fas fa-flag"></i> Wrong';
      }
    } catch (err) {
      console.error(err);
      if (buttonEl) {
        buttonEl.disabled = false;
        buttonEl.innerHTML =
          originalHtml || '<i class="fas fa-flag"></i> Confirm wrong';
      }
      alert("Failed to send redo request: " + err.message);
    }
  },

  playContactAudio(contactId, field, buttonEl) {
    const contact = (this.state.contacts || []).find((c) => c.id === contactId);
    const url = contact?.[field];
    if (!url) return;
    const driveId = this.getDriveFileId(url);
    const audioUrl = driveId ? `/api/drive-audio/${driveId}` : url;

    if (!this._contactAudio) {
      this._contactAudio = new Audio();
    } else {
      this._contactAudio.pause();
      this._contactAudio.currentTime = 0;
    }

    document
      .querySelectorAll(".eo-audio-mini, .eo-audio-action")
      .forEach((btn) => {
        btn.classList.remove("is-playing");
        const icon = btn.querySelector("i");
        if (icon) icon.className = "fas fa-play";
      });

    this._contactAudio.src = audioUrl;
    this._contactAudio.onended = () => {
      buttonEl?.classList.remove("is-playing");
      const icon = buttonEl?.querySelector("i");
      if (icon) icon.className = "fas fa-play";
    };
    this._contactAudio
      .play()
      .then(() => {
        buttonEl?.classList.add("is-playing");
        const icon = buttonEl?.querySelector("i");
        if (icon) icon.className = "fas fa-pause";
      })
      .catch((err) => {
        console.warn("Failed to play contact audio:", err);
        buttonEl?.classList.remove("is-playing");
        const icon = buttonEl?.querySelector("i");
        if (icon) icon.className = "fas fa-external-link-alt";
        window.open(url, "_blank", "noopener");
      });
  },

  getDriveFileId(url) {
    const text = String(url || "");
    return (
      text.match(/[?&]id=([a-zA-Z0-9_-]+)/)?.[1] ||
      text.match(/\/d\/([a-zA-Z0-9_-]+)/)?.[1] ||
      ""
    );
  },

  contactInitials(contact) {
    const name = String(contact?.name || contact?.email || contact?.emails?.[0] || "?").trim();
    const parts = name.split(/\s+/).filter(Boolean);
    const letters = parts.length > 1
      ? `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`
      : name.slice(0, 2);
    return this._contactFormEscape((letters || "?").toUpperCase());
  },

  contactAvatarHtml(contact, size = 32, extraClass = "") {
    let image = String(contact?.logo || contact?.coverImage || "").trim();
    
    // For business logos, ensure we use a high quality icon
    if (contact && ['vancouver', 'encyclopedia'].includes(contact.group) && contact.logo) {
        image = contact.logo;
    } else if (contact && ['vancouver', 'encyclopedia'].includes(contact.group) && image && image.startsWith('/images/screenshots/')) {
        // If it's a screenshot, don't use it for the small avatar, it looks bad
        image = ''; 
    }

    const initials = this.contactInitials(contact);
    const safeImage = this._contactFormEscape(image);
    const radius = size >= 120 ? "8px" : "50%";
    return `
      <div class="eo-contact-image ${extraClass}" style="width:${size}px;height:${size}px;border-radius:${radius};position:relative;overflow:hidden;background:#e8e4f8;color:#6c5ce7;display:flex;align-items:center;justify-content:center;font-weight:700;flex-shrink:0;box-shadow:0 2px 4px rgba(0,0,0,0.08);">
        <span style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;">${initials}</span>
        ${image ? `<img src="${safeImage}" alt="${this._contactFormEscape(contact?.name || "Contact")}" loading="lazy" referrerpolicy="no-referrer" onerror="App._contactImageFallback(this)" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border:0;background:#e8e4f8;">` : ""}
      </div>`;
  },

  _contactImageFallback(img) {
    if (!img) return;
    img.onerror = null;
    img.removeAttribute("src");
    img.style.display = "none";
  },

  renderPoliticianMap(contacts, attrEscape) {
    const byLocation = {};
    for (const c of contacts) {
      const loc = c.location || "Unknown";
      if (!byLocation[loc]) byLocation[loc] = [];
      byLocation[loc].push(c);
    }
    const locations = Object.keys(byLocation)
      .map((name) => ({
        name,
        contacts: byLocation[name],
        coords: this.getPoliticianLocationCoords(name),
      }))
      .sort((a, b) => b.contacts.length - a.contacts.length || a.name.localeCompare(b.name));

    setTimeout(() => this.initPoliticianMap(contacts), 0);

    return `
      <div class="eo-politician-map-view">
        <aside class="eo-politician-map-list">
          <div class="eo-politician-map-list-header">
            <div>
              <strong>${contacts.length.toLocaleString()} politicians</strong>
              <span>${locations.filter((l) => l.coords).length} mapped locations</span>
            </div>
            <div class="eo-politician-map-tools">
              <button type="button" title="Zoom in" onclick="App.zoomPoliticianMap(1)"><i class="fas fa-plus"></i></button>
              <button type="button" title="Zoom out" onclick="App.zoomPoliticianMap(-1)"><i class="fas fa-minus"></i></button>
              <button type="button" title="Fit all" onclick="App.fitPoliticianMap()"><i class="fas fa-expand"></i></button>
            </div>
          </div>
          <div class="eo-politician-map-list-scroll">
            ${locations
              .map((loc) => `
                <button class="eo-politician-map-location ${loc.coords ? "" : "is-unmapped"}"
                        onclick="App.focusPoliticianMapLocation(decodeURIComponent('${encodeURIComponent(loc.name)}'))"
                        ${loc.coords ? "" : "disabled"}
                        title="${loc.coords ? attrEscape(loc.name) : "Location not mapped"}">
                  <span class="eo-politician-map-location-main">
                    <i class="fas fa-map-marker-alt"></i>
                    <span>${this._contactFormEscape(loc.name)}</span>
                  </span>
                  <span class="eo-politician-map-count">${loc.contacts.length}</span>
                </button>
              `)
              .join("")}
          </div>
        </aside>
        <div class="eo-politician-map-stage">
          <div id="politician-map"></div>
          <div id="politician-map-empty" class="eo-politician-map-empty" style="display:none;">
            No mapped politician locations found.
          </div>
        </div>
      </div>`;
  },

  getPoliticianLocationCoords(location) {
    const key = String(location || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");
    const coords = {
      "afghanistan": [67.71, 33.94],
      "australia": [133.78, -25.27],
      "bangladesh": [90.36, 23.68],
      "brazil": [-51.93, -14.24],
      "canada": [-106.35, 56.13],
      "china": [104.2, 35.86],
      "people's republic of china": [104.2, 35.86],
      "egypt": [30.8, 26.82],
      "finland": [25.75, 61.92],
      "france": [2.21, 46.23],
      "germany": [10.45, 51.17],
      "greece": [21.82, 39.07],
      "india": [78.96, 20.59],
      "indonesia": [113.92, -0.79],
      "iran": [53.69, 32.43],
      "israel": [34.85, 31.05],
      "italy": [12.57, 41.87],
      "japan": [138.25, 36.2],
      "lebanon": [35.86, 33.85],
      "libya": [17.23, 26.34],
      "malaysia": [101.98, 4.21],
      "philippines": [121.77, 12.88],
      "portugal": [-8.22, 39.4],
      "russia": [105.32, 61.52],
      "singapore": [103.82, 1.35],
      "south africa": [22.94, -30.56],
      "south korea": [127.77, 35.91],
      "spain": [-3.75, 40.46],
      "taiwan": [120.96, 23.7],
      "thailand": [100.99, 15.87],
      "united kingdom": [-3.44, 55.38],
      "united states": [-98.58, 39.83],
      "uruguay": [-55.77, -32.52],
      "uzbekistan": [64.59, 41.38],
      "socialist federal republic of yugoslavia": [20.46, 44.81],
      "kanpur": [80.33, 26.45],
      "obergünzburg": [10.42, 47.85],
      "obergunzburg": [10.42, 47.85],
      "reykjavík": [-21.94, 64.15],
      "reykjavik": [-21.94, 64.15],
    };
    return coords[key] || null;
  },

  initPoliticianMap(contacts) {
    const container = document.getElementById("politician-map");
    if (!container) return;

    if (!window.maplibregl) {
      container.innerHTML = '<div class="eo-politician-map-empty">MapLibre is not available.</div>';
      return;
    }

    if (this.state.politicianMap?.map) {
      try { this.state.politicianMap.map.remove(); } catch (e) { /* stale map container */ }
    }

    const grouped = {};
    for (const contact of contacts || []) {
      const location = contact.location || "Unknown";
      const coords = this.getPoliticianLocationCoords(location);
      if (!coords) continue;
      if (!grouped[location]) grouped[location] = { location, coords, contacts: [] };
      grouped[location].contacts.push(contact);
    }

    const points = Object.values(grouped);
    const empty = document.getElementById("politician-map-empty");
    if (empty) empty.style.display = points.length ? "none" : "flex";
    if (!points.length) {
      this.state.politicianMap = { map: null, markers: [], grouped: {} };
      return;
    }

    const map = new maplibregl.Map({
      container: "politician-map",
      center: [15, 25],
      zoom: 1.35,
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: ["https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
          },
        },
        layers: [{ id: "osm", type: "raster", source: "osm" }],
      },
    });
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");

    this.state.politicianMap = { map, markers: [], grouped, bounds: null };

    map.on("load", () => {
      const bounds = new maplibregl.LngLatBounds();
      points.forEach((point) => {
        const markerEl = document.createElement("button");
        markerEl.type = "button";
        markerEl.className = "eo-politician-map-marker";
        markerEl.innerHTML = `<span>${point.contacts.length}</span>`;
        markerEl.title = `${point.location}: ${point.contacts.length}`;

        const popup = new maplibregl.Popup({ offset: 22, maxWidth: "340px" })
          .setHTML(this.renderPoliticianMapPopup(point));
        const marker = new maplibregl.Marker({ element: markerEl, anchor: "bottom" })
          .setLngLat(point.coords)
          .setPopup(popup)
          .addTo(map);

        this.state.politicianMap.markers.push({ location: point.location, marker });
        bounds.extend(point.coords);
      });

      this.state.politicianMap.bounds = bounds;
      if (points.length === 1) map.flyTo({ center: points[0].coords, zoom: 4 });
      else map.fitBounds(bounds, { padding: 45, maxZoom: 4.25 });
      setTimeout(() => map.resize(), 50);
    });
  },

  renderPoliticianMapPopup(point) {
    const contacts = point.contacts.slice(0, 8);
    return `
      <div class="eo-politician-map-popup">
        <div class="eo-politician-map-popup-title">${this._contactFormEscape(point.location)}</div>
        <div class="eo-politician-map-popup-subtitle">${point.contacts.length} politician${point.contacts.length === 1 ? "" : "s"}</div>
        ${contacts
          .map((c) => `
            <button class="eo-politician-map-popup-person" onclick="App.showContactDetail('${this._contactFormEscape(c.id)}')">
              ${this.contactAvatarHtml(c, 34, "eo-politician-map-popup-photo")}
              <span>
                <strong>${this._contactFormEscape(c.name || "Unknown")}</strong>
                ${c.position ? `<small>${this._contactFormEscape(c.position)}</small>` : ""}
              </span>
            </button>
          `)
          .join("")}
        ${point.contacts.length > contacts.length ? `<div class="eo-politician-map-popup-more">+${point.contacts.length - contacts.length} more</div>` : ""}
      </div>`;
  },

  focusPoliticianMapLocation(location) {
    const state = this.state.politicianMap;
    const point = state?.grouped?.[location];
    if (!state?.map || !point) return;
    state.map.flyTo({ center: point.coords, zoom: Math.max(state.map.getZoom(), 4), essential: true });
    const entry = state.markers.find((item) => item.location === location);
    if (entry?.marker) entry.marker.togglePopup();
  },

  zoomPoliticianMap(direction) {
    const map = this.state.politicianMap?.map;
    if (!map) return;
    if (direction > 0) map.zoomIn();
    else map.zoomOut();
  },

  fitPoliticianMap() {
    const state = this.state.politicianMap;
    if (!state?.map || !state.bounds) return;
    state.map.fitBounds(state.bounds, { padding: 45, maxZoom: 4.25 });
  },

  renderPoliticianCalendar(contacts, attrEscape) {
    const byMonth = {};
    for (const c of contacts) {
      const bday = c.birthDate || c.birthday || "";
      let m = "Unknown";
      if (bday && bday.length >= 7) {
         const monthPart = bday.substring(5, 7);
         const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
         const num = parseInt(monthPart, 10);
         if (num >= 1 && num <= 12) m = monthNames[num - 1];
      }
      if (!byMonth[m]) byMonth[m] = [];
      byMonth[m].push(c);
    }
    const order = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December", "Unknown"];
    let html = '<div class="year-view-container" style="padding:20px;"><div class="calendar-year-grid-modern">';
    for (const m of order) {
      if (!byMonth[m]) continue;
      byMonth[m].sort((a, b) => {
         const d1 = (a.birthDate || a.birthday || "").substring(8, 10);
         const d2 = (b.birthDate || b.birthday || "").substring(8, 10);
         return d1.localeCompare(d2);
      });
      html += `
        <div class="month-card-modern">
            <div class="month-card-header" style="background: linear-gradient(135deg, #0984e3, #74b9ff);">
                <h3>${this._contactFormEscape(m)}</h3>
                <div class="month-card-zodiac">${byMonth[m].length} contacts</div>
                <i class="fas fa-calendar-alt month-card-icon"></i>
            </div>
            <div class="month-card-body">
                ${this.renderPoliticianGrid(byMonth[m], attrEscape)}
            </div>
        </div>`;
    }
    html += '</div></div>';
    return html;
  },

  renderPoliticianGrid(contacts, attrEscape) {
    return `<div class="eo-politician-grid">
            ${contacts
        .map((c) => {
          const name = this._contactFormEscape(c.name || "Unknown");
          const location = this._contactFormEscape(c.location || "");
          const profile = this._contactFormEscape(c.profile || "");
          const zodiac = this.normalizeChineseAstrologyLabel(c.zodiac || c.xingzuo);
          const shuxiang = this.normalizeChineseAstrologyLabel(c.shuxiang || c.chineseZodiac);
          return `<article class="eo-politician-card" onclick="App.showContactDetail('${c.id}')">
                    ${this.contactAvatarHtml(c, 170, "eo-politician-photo")}
                    <div class="eo-politician-card-body">
                        <div class="eo-politician-name">${name}</div>
                        <div class="eo-politician-meta">
                            ${c.position ? `<span class="eo-politician-position" title="${attrEscape(c.position)}">${this._contactFormEscape(c.position)}</span>` : ""}
                            ${c.location ? `<button class="eo-filter-chip" onclick="event.stopPropagation();App.filterContactsByTagValue('${attrEscape(c.location)}')">${location}</button>` : ""}
                        </div>
                        <div class="eo-politician-tags">
                            ${zodiac ? `<button class="eo-filter-chip" onclick="event.stopPropagation();App.filterContactsByTagValue('${attrEscape(zodiac)}')">${this._contactFormEscape(zodiac)}</button>` : ""}
                            ${shuxiang ? `<button class="eo-filter-chip" onclick="event.stopPropagation();App.filterContactsByTagValue('${attrEscape(shuxiang)}')">${this._contactFormEscape(shuxiang)}</button>` : ""}
                        </div>
                        <div class="eo-politician-birthday">${this._contactFormEscape(c.birthDate || "")}</div>
                        <p class="eo-politician-profile">${profile}</p>
                        <div class="eo-politician-actions" onclick="event.stopPropagation()">
                            ${this.contactAudioControls(c, "referWav", "reference", "Ref")}
                            ${this.contactAudioControls(c, "cloneWav", "clone", "Clone")}
                            ${this.contactVoiceWrongButton(c)}
                            ${this.contactWikiLink(c)}
                        </div>
                    </div>
                </article>`;
        })
        .join("")}
        </div>`;
  },

  renderPoliticianSlideshow(contacts, attrEscape) {
    const index = Math.min(
      this.state.contactSlideIndex || 0,
      Math.max(contacts.length - 1, 0),
    );
    const c = contacts[index];
    if (!c) return '<div class="eo-empty">No contacts found.</div>';
    const zodiac = this.normalizeChineseAstrologyLabel(c.zodiac || c.xingzuo);
    const shuxiang = this.normalizeChineseAstrologyLabel(c.shuxiang || c.chineseZodiac);
    return `<div class="eo-politician-slide">
            <button class="eo-slide-nav eo-slide-prev" onclick="App.stepContactSlide(-1, ${contacts.length})"><i class="fas fa-chevron-left"></i></button>
            <article class="eo-slide-card">
                ${this.contactAvatarHtml(c, 360, "eo-slide-photo")}
                <div class="eo-slide-info">
                    <div class="eo-slide-count">${index + 1} / ${contacts.length}</div>
                    <h2>${this._contactFormEscape(c.name || "Unknown")}</h2>
                    <div class="eo-politician-meta" style="margin-bottom: 12px; font-size: 14px; color: #555;">
                        ${c.position ? `<span class="eo-politician-position" title="${attrEscape(c.position)}">${this._contactFormEscape(c.position)}</span>` : ""}
                    </div>
                    <div class="eo-politician-tags">
                        ${c.location ? `<button class="eo-filter-chip" onclick="App.filterContactsByTagValue('${attrEscape(c.location)}')">${this._contactFormEscape(c.location)}</button>` : ""}
                        ${zodiac ? `<button class="eo-filter-chip" onclick="App.filterContactsByTagValue('${attrEscape(zodiac)}')">${this._contactFormEscape(zodiac)}</button>` : ""}
                        ${shuxiang ? `<button class="eo-filter-chip" onclick="App.filterContactsByTagValue('${attrEscape(shuxiang)}')">${this._contactFormEscape(shuxiang)}</button>` : ""}
                    </div>
                    <div class="eo-slide-birthday">${this._contactFormEscape(c.birthDate || "")}</div>
                    <p>${this._contactFormEscape(c.profile || "")}</p>
                    <div class="eo-politician-actions">
                        ${this.contactAudioControls(c, "referWav", "reference", "Play reference")}
                        ${this.contactAudioControls(c, "cloneWav", "clone", "Play clone")}
                        ${this.contactVoiceWrongButton(c)}
                        ${this.contactWikiLink(c)}
                    </div>
                </div>
            </article>
            <button class="eo-slide-nav eo-slide-next" onclick="App.stepContactSlide(1, ${contacts.length})"><i class="fas fa-chevron-right"></i></button>
        </div>`;
  },

  stepContactSlide(delta, total) {
    const count = Math.max(total || 0, 1);
    this.state.contactSlideIndex =
      ((this.state.contactSlideIndex || 0) + delta + count) % count;
    this.renderContacts();
  },

  prevContactsPage() {
    if ((this.state.contactPage || 0) > 0) {
      this.state.contactPage--;
      this.renderContacts();
    }
  },

  nextContactsPage() {
    this.state.contactPage = (this.state.contactPage || 0) + 1;
    this.renderContacts();
  },

  _sortContacts(key, dir) {
    this.state.contactSortKey = key;
    this.state.contactSortDir = dir;
    this.state.contactPage = 0;
    this.renderContacts();
  },

  handleContactClick(id, e) {
    if (e.shiftKey) e.preventDefault();

    const { ctrlKey, shiftKey, metaKey } = e;
    const isMacCtrl =
      navigator.platform.toUpperCase().indexOf("MAC") >= 0 ? metaKey : ctrlKey;
    const isCheckbox = e.target && e.target.type === "checkbox";

    let filtered = this.state.contacts.filter((c) => {
      let matchesGroup = false;
      if (this.state.currentContactGroup.startsWith("domain:")) {
        const domain = this.state.currentContactGroup.split(":")[1];
        matchesGroup =
          c.emails &&
          c.emails.some((e) => {
            const parts = e.split("@");
            return parts.length === 2 && parts[1].toLowerCase() === domain;
          });
      } else {
        matchesGroup = c.group === this.state.currentContactGroup;
      }
      const matchesSearch =
        !this.state.contactSearchQuery ||
        (c.name || "")
          .toLowerCase()
          .includes(this.state.contactSearchQuery.toLowerCase()) ||
        (c.emails &&
          c.emails.some((e) =>
            e
              .toLowerCase()
              .includes(this.state.contactSearchQuery.toLowerCase()),
          ));
      return matchesGroup && matchesSearch;
    });
    filtered.sort((a, b) => (a.name || "").localeCompare(b.name || ""));

    if (shiftKey && this.state.lastSelectedContactId) {
      const contactIds = filtered.map((c) => c.id);
      const startIdx = contactIds.indexOf(this.state.lastSelectedContactId);
      const endIdx = contactIds.indexOf(id);
      if (startIdx !== -1 && endIdx !== -1) {
        const [min, max] = [
          Math.min(startIdx, endIdx),
          Math.max(startIdx, endIdx),
        ];
        for (let i = min; i <= max; i++)
          this.state.selectedContactIds.add(contactIds[i]);
      }
    } else if (isMacCtrl || isCheckbox) {
      if (this.state.selectedContactIds.has(id)) {
        this.state.selectedContactIds.delete(id);
      } else {
        this.state.selectedContactIds.add(id);
      }
    } else {
      this.state.selectedContactIds.clear();
      this.state.selectedContactIds.add(id);
    }

    this.state.lastSelectedContactId = id;

    if (this.state.selectedContactIds.has(id)) {
      this.showContactDetail(id);
    } else {
      this.renderContacts();
      if (this.state.selectedContactIds.size === 0) {
        this.renderContactDetailsPlaceholder();
        this.state.selectedContactId = null;
      }
    }
  },


  // =========================================================================
  // CONTACTS — Create / Edit / Save / Delete
  // =========================================================================

  createContact() {
    this.state.selectedContactId = null;
    this.state.selectedContactIds.clear();
    this.renderContacts();
    const defaultGroup =
      this.state.currentContactGroup &&
        !this.state.currentContactGroup.startsWith("domain:")
        ? this.state.currentContactGroup
        : "personal";

    document.getElementById("contact-details").innerHTML = `
            <div class="contact-detail-header" style="background:#fff;border-bottom:1px solid #f0f0f0;">
                <div class="contact-detail-avatar">?</div>
                <div style="flex:1"><h2 style="margin:0;font-size:24px;">New Contact</h2></div>
            </div>
            <div style="padding:40px;overflow-y:auto;flex:1;min-height:0;background:#faf9ff;">
                <form id="contact-form" onsubmit="App.saveContact(event); return false;" style="background:#fff;padding:40px;border-radius:12px;box-shadow:0 4px 15px rgba(0,0,0,0.03);max-width:1200px;margin:0 auto;border:1px solid #e2e8f0;">
                    
                    <div class="row">
                        <div class="col-md-6 form-group mb-3">
                            <label class="small text-muted mb-1 font-weight-bold">Display Name</label>
                            <input type="text" id="contact-name" class="form-control" required>
                        </div>
                        <div class="col-md-6 form-group mb-3">
                            <label class="small text-muted mb-1 font-weight-bold">Email Addresses (comma separated)</label>
                            <input type="text" id="contact-emails" class="form-control">
                        </div>
                    </div>

                    <div class="row">
                        <div class="col-md-4 form-group mb-3">
                            <label class="small text-muted mb-1 font-weight-bold">Phone</label>
                            <input type="text" id="contact-phone" class="form-control">
                        </div>
                        <div class="col-md-4 form-group mb-3">
                            <label class="small text-muted mb-1 font-weight-bold">Company</label>
                            <input type="text" id="contact-company" class="form-control">
                        </div>
                        <div class="col-md-4 form-group mb-3">
                            <label class="small text-muted mb-1 font-weight-bold">Position</label>
                            <input type="text" id="contact-position" class="form-control">
                        </div>
                    </div>

                    <div class="row">
                        <div class="col-md-4 form-group mb-3">
                            <label class="small text-muted mb-1 font-weight-bold">Location</label>
                            <input type="text" id="contact-location" class="form-control" placeholder="e.g. Taiwan">
                        </div>
                        <div class="col-md-4 form-group mb-3">
                            <label class="small text-muted mb-1 font-weight-bold">Birthday (YYYY-MM-DD)</label>
                            <input type="text" id="contact-birthDate" class="form-control" placeholder="1980-01-01">
                        </div>
                        <div class="col-md-4 form-group mb-3">
                            <label class="small text-muted mb-1 font-weight-bold">Group</label>
                            <select id="contact-group" class="form-control">
                                ${this.contactListOptionsHtml(defaultGroup)}
                            </select>
                        </div>
                    </div>

                    <div class="row">
                        <div class="col-md-6 form-group mb-3">
                            <label class="small text-muted mb-1 font-weight-bold">Xingzuo (Zodiac)</label>
                            <input type="text" id="contact-xingzuo" class="form-control" placeholder="e.g. Scorpio / 天蝎座">
                        </div>
                        <div class="col-md-6 form-group mb-3">
                            <label class="small text-muted mb-1 font-weight-bold">Shuxiang (Chinese Zodiac)</label>
                            <input type="text" id="contact-shuxiang" class="form-control" placeholder="e.g. Rabbit / 兔">
                        </div>
                    </div>

                    <div class="form-group mb-3">
                        <label class="small text-muted mb-1 font-weight-bold">Cover Image URL</label>
                        <input type="text" id="contact-coverImage" class="form-control" placeholder="https://...">
                    </div>

                    <div class="form-group mb-3">
                        <label class="small text-muted mb-1 font-weight-bold">Recent Activity (Wiki Data)</label>
                        <textarea id="contact-recentActivity" class="form-control" style="height:350px; font-family:monospace; font-size:13px;" placeholder="Fetched from Wiki..."></textarea>
                    </div>

                    <div class="form-group mb-4">
                        <label class="small text-muted mb-1 font-weight-bold">Notes</label>
                        <textarea id="contact-notes" class="form-control" style="height:120px;"></textarea>
                    </div>

                    <div class="d-flex justify-content-end gap-3 pt-4 mt-2 border-top">
                        <button type="button" class="btn btn-light px-4" style="border:1px solid #ddd;"
                                onclick="App.renderContactDetailsPlaceholder()">Cancel</button>
                        <button type="submit" class="btn btn-primary px-5">Save contact</button>
                    </div>
                </form>
            </div>`;
  },

  editContact(id) {
    const contact = this.state.contacts.find((c) => c.id === id);
    if (!contact) return;
    const esc = (value) => this._contactFormEscape(value);

    document.getElementById("contact-details").innerHTML = `
            <div class="contact-detail-header" style="background:#fff;border-bottom:1px solid #f0f0f0;">
                <div class="contact-detail-avatar">${esc((contact.name || "?").charAt(0))}</div>
                <div style="flex:1"><h2 style="margin:0;font-size:24px;">Edit Contact</h2></div>
            </div>
            <div style="padding:40px;overflow-y:auto;flex:1;min-height:0;background:#faf9ff;">
                <form id="contact-form" onsubmit="App.saveContact(event, '${contact.id}'); return false;" style="background:#fff;padding:40px;border-radius:12px;box-shadow:0 4px 15px rgba(0,0,0,0.03);max-width:1200px;margin:0 auto;border:1px solid #e2e8f0;">
                    
                    <div class="row">
                        <div class="col-md-6 form-group mb-3">
                            <label class="small text-muted mb-1 font-weight-bold">Display Name</label>
                            <input type="text" id="contact-name" class="form-control" value="${esc(contact.name)}" required>
                        </div>
                        <div class="col-md-6 form-group mb-3">
                            <label class="small text-muted mb-1 font-weight-bold">Email Addresses (comma separated)</label>
                            <input type="text" id="contact-emails" class="form-control" value="${esc((contact.emails || []).join(", "))}">
                        </div>
                    </div>

                    <div class="row">
                        <div class="col-md-4 form-group mb-3">
                            <label class="small text-muted mb-1 font-weight-bold">Phone</label>
                            <input type="text" id="contact-phone" class="form-control" value="${esc(contact.phone)}">
                        </div>
                        <div class="col-md-4 form-group mb-3">
                            <label class="small text-muted mb-1 font-weight-bold">Company</label>
                            <input type="text" id="contact-company" class="form-control" value="${esc(contact.company)}">
                        </div>
                        <div class="col-md-4 form-group mb-3">
                            <label class="small text-muted mb-1 font-weight-bold">Position</label>
                            <input type="text" id="contact-position" class="form-control" value="${esc(contact.position)}">
                        </div>
                    </div>

                    <div class="row">
                        <div class="col-md-4 form-group mb-3">
                            <label class="small text-muted mb-1 font-weight-bold">Location</label>
                            <input type="text" id="contact-location" class="form-control" value="${esc(contact.location)}">
                        </div>
                        <div class="col-md-4 form-group mb-3">
                            <label class="small text-muted mb-1 font-weight-bold">Birthday (YYYY-MM-DD)</label>
                            <input type="text" id="contact-birthDate" class="form-control" value="${esc(contact.birthDate || contact.birthday)}">
                        </div>
                        <div class="col-md-4 form-group mb-3">
                            <label class="small text-muted mb-1 font-weight-bold">Group</label>
                            <select id="contact-group" class="form-control">
                                ${this.contactListOptionsHtml(contact.group)}
                            </select>
                        </div>
                    </div>

                    <div class="row">
                        <div class="col-md-6 form-group mb-3">
                            <label class="small text-muted mb-1 font-weight-bold">Xingzuo (Zodiac)</label>
                            <input type="text" id="contact-xingzuo" class="form-control" value="${esc(contact.xingzuo || contact.zodiac)}">
                        </div>
                        <div class="col-md-6 form-group mb-3">
                            <label class="small text-muted mb-1 font-weight-bold">Shuxiang (Chinese Zodiac)</label>
                            <input type="text" id="contact-shuxiang" class="form-control" value="${esc(contact.shuxiang || contact.chineseZodiac)}">
                        </div>
                    </div>

                    <div class="form-group mb-3">
                        <label class="small text-muted mb-1 font-weight-bold">Cover Image URL</label>
                        <input type="text" id="contact-coverImage" class="form-control" value="${esc(contact.coverImage)}">
                    </div>

                    <div class="form-group mb-3">
                        <label class="small text-muted mb-1 font-weight-bold">Recent Activity (Wiki Data)</label>
                        <textarea id="contact-recentActivity" class="form-control" style="height:350px; font-family:monospace; font-size:13px;">${esc(contact.recentActivity)}</textarea>
                    </div>

                    <div class="form-group mb-4">
                        <label class="small text-muted mb-1 font-weight-bold">Notes</label>
                        <textarea id="contact-notes" class="form-control" style="height:120px;">${esc(contact.notes)}</textarea>
                    </div>

                    <div class="d-flex justify-content-end gap-3 pt-4 mt-2 border-top">
                        <button type="button" class="btn btn-light px-4" style="border:1px solid #ddd;"
                                onclick="App.showContactDetail('${contact.id}')">Cancel</button>
                        <button type="submit" class="btn btn-primary px-5">Update contact</button>
                    </div>
                </form>
            </div>`;
  },

  saveContact(event, id = null) {
    event.preventDefault();

    const emailsInput = document.getElementById("contact-emails").value;
    const emailsArray = emailsInput
      .split(",")
      .map((e) => e.trim())
      .filter((e) => e);
    const now = new Date().toISOString();
    const existing = id ? this.state.contacts.find((c) => c.id === id) : null;
    const name = (document.getElementById("contact-name").value || "").trim();
    const nameParts = name.split(/\s+/).filter(Boolean);

    const contact = {
      ...(existing || {}),
      id: id || "c_" + Date.now() + Math.random().toString(36).substr(2, 5),
      name,
      firstName: nameParts[0] || "",
      lastName: nameParts.slice(1).join(" "),
      emails: emailsArray,
      phone: (document.getElementById("contact-phone").value || "").trim(),
      company: (document.getElementById("contact-company").value || "").trim(),
      position: (document.getElementById("contact-position") ? document.getElementById("contact-position").value.trim() : existing?.position) || "",
      location: (document.getElementById("contact-location") ? document.getElementById("contact-location").value.trim() : existing?.location) || "",
      birthDate: (document.getElementById("contact-birthDate") ? document.getElementById("contact-birthDate").value.trim() : existing?.birthDate) || "",
      birthday: (document.getElementById("contact-birthDate") ? document.getElementById("contact-birthDate").value.trim() : existing?.birthday) || "",
      coverImage: (document.getElementById("contact-coverImage") ? document.getElementById("contact-coverImage").value.trim() : existing?.coverImage) || "",
      recentActivity: (document.getElementById("contact-recentActivity") ? document.getElementById("contact-recentActivity").value.trim() : existing?.recentActivity) || "",
      xingzuo: (document.getElementById("contact-xingzuo") ? document.getElementById("contact-xingzuo").value.trim() : existing?.xingzuo) || "",
      shuxiang: (document.getElementById("contact-shuxiang") ? document.getElementById("contact-shuxiang").value.trim() : existing?.shuxiang) || "",
      group: document.getElementById("contact-group").value,
      notes: (document.getElementById("contact-notes").value || "").trim(),
      createdAt: existing?.createdAt || existing?.subscribedAt || now,
      updatedAt: now,
    };

    if (id) {
      const index = this.state.contacts.findIndex((c) => c.id === id);
      if (index !== -1) this.state.contacts[index] = contact;
    } else {
      this.state.contacts.push(contact);
    }

    this.saveContactsToStorage();
    this.state.currentContactGroup = contact.group;
    this.state.selectedContactId = contact.id;
    this.renderContacts();
    this.showContactDetail(contact.id);
  },

  _singleSelectedContactId() {
    if (this.state.selectedContactIds.size === 1)
      return Array.from(this.state.selectedContactIds)[0];
    if (this.state.selectedContactId) return this.state.selectedContactId;
    return null;
  },

  editSelectedContact() {
    const id = this._singleSelectedContactId();
    if (!id) {
      alert("Select one contact to edit.");
      return;
    }
    this.editContact(id);
  },

  renameSelectedContact() {
    const id = this._singleSelectedContactId();
    if (!id) {
      alert("Select one contact to rename.");
      return;
    }
    this.renameContact(id);
  },

  renameContact(id) {
    const contact = this.state.contacts.find((c) => c.id === id);
    if (!contact) return;

    const nextName = prompt("Rename contact:", contact.name || "");
    if (nextName === null) return;

    const name = nextName.trim();
    if (!name) {
      alert("Contact name cannot be empty.");
      return;
    }

    const nameParts = name.split(/\s+/).filter(Boolean);
    contact.name = name;
    contact.firstName = nameParts[0] || "";
    contact.lastName = nameParts.slice(1).join(" ");
    contact.updatedAt = new Date().toISOString();

    this.saveContactsToStorage();
    this.renderContacts();
    this.showContactDetail(id);
  },

  deleteSelectedContact() {
    const ids =
      this.state.selectedContactIds.size > 0
        ? Array.from(this.state.selectedContactIds)
        : this.state.selectedContactId
          ? [this.state.selectedContactId]
          : [];
    if (ids.length === 0) return;

    const msg =
      ids.length === 1
        ? "Are you sure you want to delete this contact?"
        : `Are you sure you want to delete these ${ids.length} contacts?`;
    if (confirm(msg)) this.deleteContacts(ids);
  },

  deleteContact(id) {
    this.deleteContacts([id]);
  },

  deleteContacts(ids) {
    this.state.contacts = this.state.contacts.filter(
      (c) => !ids.includes(c.id),
    );
    this.saveContactsToStorage();
    ids.forEach((id) => this.state.selectedContactIds.delete(id));
    if (ids.includes(this.state.selectedContactId))
      this.state.selectedContactId = null;
    this.renderContacts();
    this.renderContactDetailsPlaceholder();
  },

  // =========================================================================
  // CONTACTS — Import / Sync
  // =========================================================================

  importFromEmails() {
    if (
      !confirm(
        "Scan all emails to collect sender addresses? (Existing Collected Recipients will be removed)",
      )
    )
      return;

    this.state.contacts = this.state.contacts.filter(
      (c) => c.group !== "collected",
    );

    let importedCount = 0;
    const existingEmails = new Set();
    this.state.contacts.forEach((c) => {
      if (c.emails)
        c.emails.forEach((e) => existingEmails.add(e.toLowerCase()));
    });

    const newContacts = new Map();

    this.state.emails.forEach((email) => {
      const processAddress = (rawAddr, nameHint) => {
        const eml = (this.extractEmail(rawAddr) || "").toLowerCase();
        if (!eml) return;

        const isEmlBlacklisted = (this.state.blacklist.emails || []).some(
          (e) => e.toLowerCase() === eml,
        );
        const isDomBlacklisted = (this.state.blacklist.domains || []).some(
          (d) =>
            eml.endsWith("@" + d.toLowerCase()) ||
            eml.endsWith("." + d.toLowerCase()),
        );
        if (isEmlBlacklisted || isDomBlacklisted) return;

        const isEmlWhitelisted = (this.state.whitelist.emails || []).some(
          (e) => e.toLowerCase() === eml,
        );
        const isDomWhitelisted = (this.state.whitelist.domains || []).some(
          (d) =>
            eml.endsWith("@" + d.toLowerCase()) ||
            eml.endsWith("." + d.toLowerCase()),
        );
        if (!isEmlWhitelisted && !isDomWhitelisted) return;

        if (!existingEmails.has(eml) && !newContacts.has(eml)) {
          const name =
            this.extractName(rawAddr) || nameHint || eml.split("@")[0];
          newContacts.set(eml, name);
        }
      };

      if (email.from) processAddress(email.from, email.fromName);
      if (email.to && Array.isArray(email.to)) {
        email.to.forEach((t) => {
          const target = typeof t === "string" ? t : t.email || "";
          const nameHint = typeof t === "object" ? t.name : "";
          processAddress(target, nameHint);
        });
      }
    });

    if (newContacts.size === 0) {
      this.saveContactsToStorage();
      this.renderContacts();
      alert("No new whitelisted email addresses found to import.");
      return;
    }

    newContacts.forEach((name, email) => {
      this.state.contacts.push({
        id: "c_" + Date.now() + Math.random().toString(36).substr(2, 9),
        name: (name || "").trim(),
        emails: [email],
        group: "collected",
        phone: "",
        company: "",
        notes: "Imported from whitelisted emails",
      });
      importedCount++;
    });

    this.saveContactsToStorage();
    this.state.currentContactGroup = "collected";
    this.state.selectedContactId = null;
    this.renderContacts();
    this.renderContactDetailsPlaceholder();
    alert(
      `Successfully imported ${importedCount} whitelisted contacts to "Collected Recipients".`,
    );
  },

  async syncSubscribers() {
    try {
      const res = await fetch("/api/sync-subscribers", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        alert("Sync complete!\n\n" + data.stdout);
        this.loadContacts();
      } else {
        alert("Sync failed: " + (data.error || "Unknown error"));
      }
    } catch (e) {
      alert("Sync request failed: " + e.message);
    }
  },

  async exportCurrentContactGroup() {
    const group = this.state.currentContactGroup || "all";
    if (group === "all" || group.startsWith("domain:")) {
      alert(
        "Select a specific contact list first. Export writes one list file, not All Contacts or domain filters.",
      );
      return;
    }

    const contacts = (this.state.contacts || []).filter(
      (contact) => contact.group === group,
    );
    const listName =
      (this.state.contactLists || []).find((list) => list.id === group)?.name ||
      group;

    try {
      const res = await fetch("/api/contact-group-export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ group, contacts }),
      });
      const data = await res.json();
      if (!res.ok || !data.success)
        throw new Error(data.error || "Export failed");

      if (!this.state.exports) this.state.exports = [];
      this.state.exports.unshift({
        id: "exp_" + Date.now(),
        label: listName,
        status: "exported",
        createdAt: Date.now(),
        count: Number.isFinite(data.count) ? data.count : contacts.length,
        by:
          (this.state.accounts && this.state.accounts[0]?.smtp?.from) || "you",
        downloadUrl: data.downloadUrl || `/config/contact-lists/${group}.json`,
        group,
      });
      this._saveExportsToStorage?.();
      alert(
        `Exported ${Number.isFinite(data.count) ? data.count : contacts.length} contacts to public/config/contact-lists/${group}.json`,
      );
    } catch (e) {
      console.error("Current group export failed:", e);
      alert("Export failed: " + e.message);
    }
  },

  saveToContact() {
    const threadId = this.state.selectedThreadId;
    if (!threadId) return;
    const thread = this.state.threads.find((t) => t.id === threadId);
    if (!thread || thread.emails.length === 0) return;

    const latest = thread.emails[thread.emails.length - 1];
    const name = (
      latest.fromName ||
      this.extractName(latest.from) ||
      ""
    ).trim();
    const email = (this.extractEmail(latest.from) || "").toLowerCase().trim();

    if (!email) {
      alert("Could not determine email address to save.");
      return;
    }

    const existing = this.state.contacts.find(
      (c) => c.emails && c.emails.some((e) => e.toLowerCase() === email),
    );
    if (existing) {
      this.switchTask("contacts");
      this.showContactDetail(existing.id);
      alert("This contact already exists.");
      return;
    }

    this.switchTask("contacts");
    this.createContact();

    const nameInput = document.getElementById("contact-name");
    const emailInput = document.getElementById("contact-emails");
    if (nameInput) nameInput.value = name;
    if (emailInput) emailInput.value = email;
  },

  // =========================================================================
  // CONTACTS — Autocomplete
  // =========================================================================

  handleContactAutocomplete(e) {
    const input = e.target;
    const query = input.value;
    const dropdown = document.getElementById("contacts-autocomplete-dropdown");
    if (!dropdown) return;

    const valBeforeCursor = query.substring(0, input.selectionStart);
    const lastCommaIdx = valBeforeCursor.lastIndexOf(",");
    const searchTerm = valBeforeCursor
      .substring(lastCommaIdx + 1)
      .trim()
      .toLowerCase();

    if (searchTerm.length < 1) {
      dropdown.style.display = "none";
      return;
    }

    let matches = [];
    this.state.contacts.forEach((c) => {
      if (!c.emails) return;
      const nameStr = c.name || "";
      const inName = nameStr.toLowerCase().includes(searchTerm);
      c.emails.forEach((email) => {
        if (inName || email.toLowerCase().includes(searchTerm)) {
          matches.push({ name: nameStr, email, group: c.group || "unknown" });
        }
      });
    });

    if (matches.length === 0) {
      dropdown.style.display = "none";
      return;
    }
    matches = matches.slice(0, 10);

    let html = "";
    matches.forEach((m, idx) => {
      const name = (m.name || "").trim();
      const displayStr = name ? `"${name}" <${m.email}>` : m.email;
      html += `
                <div class="autocomplete-item ${idx === 0 ? "selected" : ""}"
                     style="padding:8px 12px;cursor:pointer;border-bottom:1px solid #eee;
                            display:flex;justify-content:space-between;align-items:center;"
                     onmousedown="event.preventDefault();
                                  App.selectAutocompleteContact('${input.id}', '${this.escape(displayStr)}');"
                     onmouseover="App.highlightAutocompleteItem(this)">
                    <div>
                        <strong>${this.escape(name || m.email)}</strong>
                        <span style="color:#666;font-size:12px;">&lt;${this.escape(m.email)}&gt;</span>
                    </div>
                    <span style="font-size:11px;color:#aaa;background:#f4f4f4;
                                 padding:2px 6px;border-radius:10px;">${this.escape(m.group)}</span>
                </div>`;
    });

    dropdown.innerHTML = html;
    const rect = input.getBoundingClientRect();
    dropdown.style.left = rect.left + "px";
    dropdown.style.top = rect.bottom + window.scrollY + "px";
    dropdown.style.width = rect.width + "px";
    dropdown.style.display = "block";
  },

  highlightAutocompleteItem(element) {
    const dropdown = document.getElementById("contacts-autocomplete-dropdown");
    dropdown.querySelectorAll(".autocomplete-item").forEach((i) => {
      i.style.backgroundColor = "";
      i.classList.remove("selected");
    });
    element.style.backgroundColor = "#f0f7ff";
    element.classList.add("selected");
  },

  handleContactAutocompleteKey(e) {
    const dropdown = document.getElementById("contacts-autocomplete-dropdown");
    if (!dropdown || dropdown.style.display === "none") return;

    const items = Array.from(dropdown.querySelectorAll(".autocomplete-item"));
    if (items.length === 0) return;

    let selectedIdx = items.findIndex((i) => i.classList.contains("selected"));

    if (e.key === "ArrowDown") {
      e.preventDefault();
      selectedIdx = (selectedIdx + 1) % items.length;
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      selectedIdx = (selectedIdx - 1 + items.length) % items.length;
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      if (selectedIdx >= 0) {
        const onclickStr = items[selectedIdx].getAttribute("onmousedown");
        if (onclickStr) {
          const match = onclickStr.match(
            /App\.selectAutocompleteContact\('([^']+)',\s*'([^']+)'\)/,
          );
          if (match)
            this.selectAutocompleteContact(match[1], this.unescape(match[2]));
        }
      }
      return;
    } else if (e.key === "Escape") {
      dropdown.style.display = "none";
      return;
    }

    items.forEach((i) => {
      i.style.backgroundColor = "";
      i.classList.remove("selected");
    });
    items[selectedIdx].style.backgroundColor = "#f0f7ff";
    items[selectedIdx].classList.add("selected");
    items[selectedIdx].scrollIntoView({ block: "nearest" });
  },

  selectAutocompleteContact(inputId, displayStr) {
    const input = document.getElementById(inputId);
    const dropdown = document.getElementById("contacts-autocomplete-dropdown");

    const fullVal = input.value;
    const cursorP = input.selectionStart;
    const valBeforeCursor = fullVal.substring(0, cursorP);
    const lastCommaIdx = valBeforeCursor.lastIndexOf(",");

    let newVal = "";
    if (lastCommaIdx === -1) {
      newVal = displayStr + ", " + fullVal.substring(cursorP);
    } else {
      newVal =
        fullVal.substring(0, lastCommaIdx + 1) +
        " " +
        displayStr +
        ", " +
        fullVal.substring(cursorP);
    }

    input.value = newVal;
    dropdown.style.display = "none";
    input.focus();

    const newCursorPos =
      lastCommaIdx === -1
        ? displayStr.length + 2
        : lastCommaIdx + 2 + displayStr.length + 2;
    input.setSelectionRange(newCursorPos, newCursorPos);
  },

  // =========================================================================
  // CONTACTS — Insert Contacts Modal
  // =========================================================================

  openInsertContactsModal(targetId) {
    this.state.modalTargetId = targetId;
    this.state.currentModalGroup = "all";
    this.state.selectedModalContactIds.clear();
    this.renderModalContacts("all");
    $("#insertContactsModal").modal("show");
  },

  renderModalContacts(group) {
    if (group) this.state.currentModalGroup = group;
    else group = this.state.currentModalGroup || "all";

    const list = document.getElementById("modal-contact-list");
    if (!list) return;

    const searchQuery = (
      document.getElementById("modal-contact-search")?.value || ""
    ).toLowerCase();

    document
      .querySelectorAll("#modal-contact-groups .nav-link")
      .forEach((link) => {
        link.classList.toggle(
          "active",
          link.getAttribute("data-group") === group,
        );
      });

    let filtered = [];
    if (group === "whitelist" || group === "all") {
      const wlEmails = (this.state.whitelist?.emails || []).map((email) => ({
        id: "wl_" + email,
        name: email.split("@")[0],
        emails: [email],
        group: "whitelist",
      }));
      const wlDomains = (this.state.whitelist?.domains || []).map((domain) => ({
        id: "wld_" + domain,
        name: domain,
        emails: ["*@" + domain],
        group: "whitelist",
      }));
      filtered = filtered.concat(wlEmails, wlDomains);
    }
    if (group !== "whitelist") {
      let contacts = this.state.contacts || [];
      if (group !== "all") contacts = contacts.filter((c) => c.group === group);
      filtered = filtered.concat(contacts);
    }
    if (searchQuery) {
      filtered = filtered.filter(
        (c) =>
          (c.name && c.name.toLowerCase().includes(searchQuery)) ||
          (c.emails &&
            c.emails.some((e) => e.toLowerCase().includes(searchQuery))),
      );
    }

    list.innerHTML = filtered
      .map(
        (c) => `
            <div class="contact-item"
                 onclick="App.toggleModalContactSelection('${c.id}')"
                 style="padding:8px 15px;border-bottom:1px solid #eee;display:flex;
                        align-items:center;cursor:pointer;
                        ${this.state.selectedModalContactIds.has(c.id) ? "background:#e7f3ff;" : ""}">
                <input type="checkbox"
                       ${this.state.selectedModalContactIds.has(c.id) ? "checked" : ""}
                       style="margin-right:15px;"
                       onclick="event.stopPropagation();App.toggleModalContactSelection('${c.id}')">
                <div class="contact-avatar"
                     style="width:32px;height:32px;font-size:12px;margin-right:12px;
                            background:${c.group === "whitelist" ? "#28a745" : "#007bff"}">
                    ${(c.name ? c.name[0] : "?").toUpperCase()}
                </div>
                <div class="contact-info">
                    <div class="contact-name"  style="font-size:13px;">${c.name || "Unknown"}</div>
                    <div class="contact-email" style="font-size:11px;">${c.emails ? c.emails[0] : ""}</div>
                </div>
            </div>`,
      )
      .join("");
  },

  toggleModalContactSelection(id) {
    if (this.state.selectedModalContactIds.has(id)) {
      this.state.selectedModalContactIds.delete(id);
    } else {
      this.state.selectedModalContactIds.add(id);
    }
    this.renderModalContacts();
  },

  insertSelectedContacts() {
    if (!this.state.modalTargetId) return;
    const target = document.getElementById(this.state.modalTargetId);
    if (!target) return;

    const allAvailable = [
      ...(this.state.contacts || []),
      ...(this.state.whitelist?.emails || []).map((email) => ({
        id: "wl_" + email,
        name: email.split("@")[0],
        emails: [email],
      })),
      ...(this.state.whitelist?.domains || []).map((domain) => ({
        id: "wld_" + domain,
        name: domain,
        emails: ["*@" + domain],
      })),
    ];

    const selectedContacts = allAvailable.filter((c) =>
      this.state.selectedModalContactIds.has(c.id),
    );
    const emailStrings = selectedContacts.map((c) => {
      const email = c.emails ? c.emails[0] : "";
      return c.name && c.name !== email ? `${c.name} <${email}>` : email;
    });

    if (emailStrings.length > 0) {
      const currentVal = target.value.trim();
      const newVal = currentVal
        ? (currentVal.endsWith(",") ? currentVal + " " : currentVal + ", ") +
        emailStrings.join(", ")
        : emailStrings.join(", ");
      target.value = newVal;
    }

    $("#insertContactsModal").modal("hide");
  },

  // =========================================================================
  // CONTACTS — EO Table Helpers
  // =========================================================================

  _eoToggleActionsMenu(e) {
    e.stopPropagation();
    const menu = document.getElementById("eo-actions-menu");
    if (!menu) return;
    const open = menu.style.display !== "none";
    menu.style.display = open ? "none" : "block";
    if (!open) {
      const close = () => {
        menu.style.display = "none";
        document.removeEventListener("click", close);
      };
      setTimeout(() => document.addEventListener("click", close), 0);
    }
  },

  _eoToggleTagsMenu(e) {
    e.stopPropagation();
    const menu = document.getElementById("eo-tags-filter-menu");
    if (!menu) return;
    const open = menu.style.display !== "none";
    menu.style.display = open ? "none" : "block";
    if (!open) {
      const close = () => {
        menu.style.display = "none";
        document.removeEventListener("click", close);
      };
      setTimeout(() => document.addEventListener("click", close), 0);
    }
  },

  _eoSelectAll(checked) {
    this.state.contacts
      .filter((c) => {
        let matchesGroup = false;
        if (this.state.currentContactGroup === "all") {
          matchesGroup = true;
        } else if (
          this.state.currentContactGroup &&
          this.state.currentContactGroup.startsWith("domain:")
        ) {
          const domain = this.state.currentContactGroup.split(":")[1];
          matchesGroup =
            c.emails &&
            c.emails.some((e) => {
              const parts = e.split("@");
              return parts.length === 2 && parts[1].toLowerCase() === domain;
            });
        } else {
          matchesGroup = c.group === this.state.currentContactGroup;
        }

        const nameStr = c.name || "";
        const matchesSearch =
          !this.state.contactSearchQuery ||
          nameStr
            .toLowerCase()
            .includes(this.state.contactSearchQuery.toLowerCase()) ||
          (c.emails &&
            c.emails.some((e) =>
              e
                .toLowerCase()
                .includes(this.state.contactSearchQuery.toLowerCase()),
            ));
        const tagFilter = (this.state.contactTagFilter || "").toLowerCase();
        const matchesTag =
          !tagFilter ||
          (c.tags || []).some((tag) => String(tag).toLowerCase() === tagFilter);
        return matchesGroup && matchesSearch && matchesTag;
      })
      .forEach((c) =>
        checked
          ? this.state.selectedContactIds.add(c.id)
          : this.state.selectedContactIds.delete(c.id),
      );
    this.renderContacts();
  },
};
