/**
 * DATA QUALITY DOCUMENTER - PORTABLE WINDOWS EDITION
 * Main Application Logic (Vanilla JavaScript ES6+)
 * 
 * 100% Offline, Zero Backend, Browser Native APIs & Locally Bundled Libraries
 */

(function () {
  'use strict';

  // ====================================================================
  // 1. CONFIGURATION SYSTEM & STATE MANAGEMENT
  // ====================================================================

  const DQD = {
    config: {},
    db: null,
    currentView: 'dashboard',
    currentDoc: null,
    currentEditorTab: 'tab-meta',
    editingRuleId: null,
    documents: [],
    rules: [],
    templates: [],
    sqlAssertions: [],
    searchKeywords: [],
    executions: [],
    issues: [],
    auditLogs: [],
    activeChart: null,
    vocabulary: {},
    activeProfileKey: 'data_quality',
    activeTplProfileFilter: 'all',
    activeDocValTypeFilter: '',
    activeDocTeamFilter: '',
    activeDocUserFilter: '',

    // Initialize the entire application
    async init() {
      try {
        // Load default config and stored overrides
        this.initConfig();
        
        // Initialize IndexedDB
        await this.initDatabase();
        
        // Apply branding & theme
        this.applyBranding();

        // Initialize Smart Autocomplete Vocabulary
        this.initVocabulary();
        this.renderDatalists();

        // Setup PDF.js worker locally
        if (window.pdfjsLib) {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'lib/pdf.worker.min.js';
        }

        // Attach DOM event listeners
        this.attachGlobalEvents();

        // Load data from storage or seed defaults
        await this.loadInitialData();

        // Render current view
        this.navigateTo('dashboard');
        this.updateSidebarBadges();

        const profile = this.getActiveProfile();
        const profileName = (profile && profile.name) || 'Data Quality';
        this.showToast(`${profileName} Documenter loaded successfully`, 'info');
      } catch (err) {
        console.error('Initialization error:', err);
        this.showToast('Initialization error: ' + err.message, 'error');
      }
    },

    // Initialize configuration with defaults
    initConfig() {
      this.defaultLogoBase64 = window.DQD_DEFAULT_LOGO_BASE64 || "";
      const defaults = window.DQD_CONFIG || {
        appName: "Data Quality Documenter",
        branding: {
          logoPath: "./assets/logo.png",
          primaryColor: "#1F4E79",
          secondaryColor: "#4472C4",
          accentColor: "#00A6A6",
          backgroundColor: "#F5F7FA",
          textColor: "#1F2937",
          fontFamily: "Segoe UI, Arial, sans-serif",
          footerText: "Data Quality Documenter",
          showLogo: true,
          showPageNumbers: true
        },
        pdf: {
          paperSize: "A4",
          orientation: "portrait",
          includeTableOfContents: true,
          includeMetadata: true,
          includeRevisionHistory: true,
          includeApprovals: true,
          onlyGeneratePdf: true
        },
        requiredFields: [
          "rule_name",
          "rule_description",
          "validation_type",
          "data_source",
          "sql_query",
          "expected_result"
        ],
        optionalFields: [
          "business_domain",
          "owner",
          "priority",
          "execution_frequency",
          "actual_result",
          "remediation",
          "reviewer"
        ],
        features: {
          templates: true,
          pdfImport: true,
          sqlEditor: true,
          filesystemSearch: true,
          excelImportExport: true,
          dbtImport: false,
          versioning: true,
          approvals: false,
          auditTrail: true,
          issueTracking: true,
          qualityScorecards: true
        },
        limits: {
          maxPdfSizeMB: 50,
          maxFileSizeMB: 25,
          maxSearchResults: 100
        }
      };

      // Check localStorage for saved custom overrides
      try {
        const stored = localStorage.getItem('DQD_CONFIG_OVERRIDE');
        if (stored) {
          const parsed = JSON.parse(stored);
          this.config = this.deepMerge(defaults, parsed);
        } else {
          this.config = JSON.parse(JSON.stringify(defaults));
        }
      } catch (e) {
        this.config = JSON.parse(JSON.stringify(defaults));
      }

      // Resolve active team profile
      const savedProfile = localStorage.getItem('DQD_ACTIVE_PROFILE');
      if (savedProfile && this.config.teamProfiles && this.config.teamProfiles[savedProfile]) {
        this.activeProfileKey = savedProfile;
      } else if (this.config.activeTeamProfile && this.config.teamProfiles && this.config.teamProfiles[this.config.activeTeamProfile]) {
        this.activeProfileKey = this.config.activeTeamProfile;
      } else {
        this.activeProfileKey = 'data_quality';
      }
    },

    getActiveProfileKey() {
      return this.activeProfileKey || 'data_quality';
    },

    getActiveProfile() {
      const key = this.getActiveProfileKey();
      if (this.config && this.config.teamProfiles && this.config.teamProfiles[key]) {
        return this.config.teamProfiles[key];
      }
      return {
        key: 'data_quality',
        name: 'Data Quality',
        label: 'Data Quality Engineering',
        roleTitle: 'Data Quality Engineer',
        editionTag: 'Data Quality Edition',
        subtitle: 'Quality Metrics, Assertions & SLA Governance',
        branding: this.config.branding || {},
        documentTypes: ['Data Quality Validation Rules', 'Data Quality Assessment'],
        subtypes: [
          { id: 'Model Validation', name: 'Model Validation', icon: '🧩', desc: 'dbt models, transformation lineage' },
          { id: 'Table Validation', name: 'Table Validation', icon: '🗄️', desc: 'Physical tables, catalogs, schemas' }
        ],
        requiredFields: this.config.requiredFields || ['rule_name', 'validation_type'],
        optionalFields: this.config.optionalFields || [],
        suggestedInputs: []
      };
    },

    switchTeamProfile(profileKey, rerender = true) {
      if (!this.config.teamProfiles || !this.config.teamProfiles[profileKey]) {
        console.warn('Unknown team profile:', profileKey);
        return;
      }
      this.activeProfileKey = profileKey;
      localStorage.setItem('DQD_ACTIVE_PROFILE', profileKey);

      // Reset filter chip so document list doesn't get stuck filtering by the previous profile's subtype
      this.activeDocValTypeFilter = '';

      // Adapt active branding to the switched team profile palette
      const profile = this.getActiveProfile();
      if (profile && profile.branding) {
        this.config.branding = Object.assign({}, this.config.branding || {}, profile.branding);
        try {
          localStorage.setItem('DQD_CONFIG_OVERRIDE', JSON.stringify(this.config));
        } catch (e) {}
      }

      // Apply branding for active profile
      this.applyBranding();

      // Synchronize navbar dropdown
      const selectEl = document.getElementById('team-profile-select');
      if (selectEl && selectEl.value !== profileKey) {
        selectEl.value = profileKey;
      }

      this.showToast(`Switched workspace to ${profile.label}`, 'info');

      // Re-render current view if requested
      if (rerender && this.currentView) {
        if (this.currentView === 'editor') {
          this.navigateTo('editor', { activeTab: this.currentEditorTab });
        } else {
          this.navigateTo(this.currentView);
        }
      }
    },

    getUserInfo(doc = null) {
      // 1. If document has its own userInfo
      if (doc && doc.userInfo && typeof doc.userInfo === 'object') {
        const u = doc.userInfo;
        if (u.username || u.useremail || u.userphone) {
          return {
            username: u.username ? String(u.username).trim() : null,
            useremail: u.useremail ? String(u.useremail).trim() : null,
            userphone: u.userphone ? String(u.userphone).trim() : null
          };
        }
      }

      // 2. Fallback to global config or localStorage
      const cfgUser = (this.config && this.config.userInfo) || {};
      const uName = (this.config && this.config.username) || cfgUser.username || localStorage.getItem('DQD_USER_NAME');
      const uEmail = (this.config && this.config.useremail) || cfgUser.useremail || localStorage.getItem('DQD_USER_EMAIL');
      const uPhone = (this.config && this.config.userphone) || cfgUser.userphone || localStorage.getItem('DQD_USER_PHONE');

      return {
        username: uName ? String(uName).trim() : null,
        useremail: uEmail ? String(uEmail).trim() : null,
        userphone: uPhone ? String(uPhone).trim() : null
      };
    },

    saveUserInfo(info = {}) {
      if (!this.config.userInfo) this.config.userInfo = {};
      const uName = info.username ? String(info.username).trim() : null;
      const uEmail = info.useremail ? String(info.useremail).trim() : null;
      const uPhone = info.userphone ? String(info.userphone).trim() : null;

      this.config.userInfo.username = uName;
      this.config.userInfo.useremail = uEmail;
      this.config.userInfo.userphone = uPhone;
      this.config.username = uName;
      this.config.useremail = uEmail;
      this.config.userphone = uPhone;

      if (uName) localStorage.setItem('DQD_USER_NAME', uName);
      else localStorage.removeItem('DQD_USER_NAME');

      if (uEmail) localStorage.setItem('DQD_USER_EMAIL', uEmail);
      else localStorage.removeItem('DQD_USER_EMAIL');

      if (uPhone) localStorage.setItem('DQD_USER_PHONE', uPhone);
      else localStorage.removeItem('DQD_USER_PHONE');

      try {
        localStorage.setItem('DQD_CONFIG_OVERRIDE', JSON.stringify(this.config));
      } catch (e) {}
    },

    deepMerge(target, source) {
      const output = Object.assign({}, target);
      if (this.isObject(target) && this.isObject(source)) {
        Object.keys(source).forEach(key => {
          if (this.isObject(source[key])) {
            if (!(key in target)) Object.assign(output, { [key]: source[key] });
            else output[key] = this.deepMerge(target[key], source[key]);
          } else {
            Object.assign(output, { [key]: source[key] });
          }
        });
      }
      return output;
    },

    isObject(item) {
      return item && typeof item === 'object' && !Array.isArray(item);
    },

    // Apply branding settings live to CSS custom properties and UI
    applyBranding() {
      const profile = this.getActiveProfile();
      const b = Object.assign({}, (profile && profile.branding) || {}, this.config.branding || {});
      const root = document.documentElement;

      if (b.primaryColor) root.style.setProperty('--primary-color', b.primaryColor);
      if (b.secondaryColor) root.style.setProperty('--secondary-color', b.secondaryColor);
      if (b.accentColor) root.style.setProperty('--accent-color', b.accentColor);
      if (b.backgroundColor) root.style.setProperty('--bg-color', b.backgroundColor);
      if (b.textColor) root.style.setProperty('--text-color', b.textColor);
      if (b.fontFamily) root.style.setProperty('--font-family', b.fontFamily);

      // App name in header & sidebar
      const appNameEl = document.getElementById('sidebar-app-name');
      if (appNameEl) appNameEl.textContent = this.config.appName || 'Data Workspace Documenter';
      document.title = (this.config.appName || 'Data Workspace Documenter') + ' - ' + ((profile && profile.editionTag) || 'Portable Windows Edition');

      // Update sidebar edition tag
      const brandTagEl = document.getElementById('sidebar-brand-tag');
      if (brandTagEl) brandTagEl.textContent = (profile && profile.editionTag) || 'Windows Portable';

      // Synchronize navbar dropdown
      const profileSelect = document.getElementById('team-profile-select');
      if (profileSelect && profileSelect.value !== this.getActiveProfileKey()) {
        profileSelect.value = this.getActiveProfileKey();
      }

      // Logo visibility and path
      const logoEl = document.getElementById('sidebar-logo-img');
      if (logoEl) {
        if (b.showLogo === false) {
          logoEl.style.display = 'none';
        } else {
          logoEl.style.display = 'block';
          if (b.logoPath) logoEl.src = b.logoPath;
        }
      }

      // Favicon from config (matching logo coming from config)
      const faviconHref = b.faviconPath || b.logoPath || 'assets/logo.png';
      let faviconEl = document.getElementById('app-favicon');
      if (!faviconEl) {
        faviconEl = document.querySelector("link[rel*='icon']");
      }
      if (!faviconEl) {
        faviconEl = document.createElement('link');
        faviconEl.id = 'app-favicon';
        faviconEl.rel = 'icon';
        document.head.appendChild(faviconEl);
      }
      if (faviconHref) {
        faviconEl.href = faviconHref;
        if (faviconHref.endsWith('.png')) {
          faviconEl.type = 'image/png';
        } else if (faviconHref.endsWith('.ico')) {
          faviconEl.type = 'image/x-icon';
        } else if (faviconHref.endsWith('.svg')) {
          faviconEl.type = 'image/svg+xml';
        }
      }

      // Feature toggles in navigation
      const navScorecards = document.getElementById('nav-scorecards');
      if (navScorecards) {
        navScorecards.style.display = this.config.features.qualityScorecards ? 'flex' : 'none';
      }
      const navDbt = document.getElementById('nav-dbt-import');
      if (navDbt) {
        navDbt.style.display = this.config.features.dbtImport ? 'flex' : 'none';
      }
      const navSearch = document.getElementById('nav-file-search');
      if (navSearch) {
        navSearch.style.display = this.config.features.filesystemSearch ? 'flex' : 'none';
      }
      const navApprovals = document.getElementById('nav-approvals');
      if (navApprovals) {
        navApprovals.style.display = this.config.features.approvals ? 'flex' : 'none';
      }
      const navAudit = document.getElementById('nav-audit');
      if (navAudit) {
        navAudit.style.display = this.config.features.auditTrail ? 'flex' : 'none';
      }
    },

    // ====================================================================
    // SMART AUTOCOMPLETE & MEMORY DICTIONARY (.txt)
    // ====================================================================

    initVocabulary() {
      try {
        const stored = localStorage.getItem('DQD_VOCABULARY');
        if (stored) {
          const parsed = JSON.parse(stored);
          this.vocabulary = Object.assign({}, window.DQD_DEFAULT_VOCABULARY || {}, parsed);
        } else {
          this.vocabulary = JSON.parse(JSON.stringify(window.DQD_DEFAULT_VOCABULARY || {}));
        }
      } catch (e) {
        this.vocabulary = JSON.parse(JSON.stringify(window.DQD_DEFAULT_VOCABULARY || {}));
      }
    },

    saveVocabulary() {
      try {
        localStorage.setItem('DQD_VOCABULARY', JSON.stringify(this.vocabulary));
      } catch (e) {}
    },

    renderDatalists() {
      const container = document.getElementById('dqd-datalists-container');
      if (!container) return;

      const mapping = {
        'dl-teams': this.vocabulary.teams || [],
        'dl-usernames': this.vocabulary.usernames || [],
        'dl-domains': this.vocabulary.domains || [],
        'dl-owners': this.vocabulary.owners || [],
        'dl-reviewers': this.vocabulary.reviewers || [],
        'dl-frequencies': this.vocabulary.frequencies || [],
        'dl-systems': this.vocabulary.systems || [],
        'dl-catalogs': this.vocabulary.catalogs || [],
        'dl-schemas': this.vocabulary.schemas || [],
        'dl-tables': this.vocabulary.tables || [],
        'dl-data-types': this.vocabulary.dataTypes || [],
        'dl-trino-types': this.vocabulary.dataTypes || [],
        'dl-transform-rules': this.vocabulary.transformRules || [],
        'dl-dialects': this.vocabulary.dialects || [],
        'dl-environments': this.vocabulary.environments || [],
        'dl-expected-results': this.vocabulary.expectedResults || [],
        'dl-thresholds': this.vocabulary.thresholds || []
      };

      let html = '';
      for (const [id, values] of Object.entries(mapping)) {
        html += `<datalist id="${id}">`;
        values.forEach(v => {
          html += `<option value="${this.escapeHtml(v)}"></option>`;
        });
        html += `</datalist>`;
      }
      container.innerHTML = html;
    },

    learnUniqueValuesFromDoc(doc) {
      if (!doc) return;
      let newCount = 0;
      const addUnique = (category, val) => {
        if (!val || typeof val !== 'string') return;
        const trimmed = val.trim();
        if (!trimmed) return;
        if (!this.vocabulary[category]) this.vocabulary[category] = [];
        if (!this.vocabulary[category].includes(trimmed)) {
          this.vocabulary[category].push(trimmed);
          newCount++;
        }
      };

      addUnique('teams', doc.team);
      if (Array.isArray(doc.usernames)) {
        doc.usernames.forEach(u => addUnique('usernames', u));
      }
      addUnique('domains', doc.businessDomain);
      addUnique('owners', doc.owner);
      addUnique('reviewers', doc.reviewer);
      addUnique('frequencies', doc.executionFrequency);
      addUnique('expectedResults', doc.expectedResult);
      addUnique('thresholds', doc.threshold);
      addUnique('dialects', doc.sqlDialect);

      if (doc.dataSource) {
        addUnique('systems', doc.dataSource.system);
        addUnique('catalogs', doc.dataSource.catalog);
        addUnique('schemas', doc.dataSource.schema);
        (doc.dataSource.tables || []).forEach(t => addUnique('tables', t));
        (doc.dataSource.mappings || []).forEach(m => {
          addUnique('dataTypes', m.dataType);
          addUnique('transformRules', m.rule);
        });
      }

      (doc.rules || []).forEach(r => {
        addUnique('expectedResults', r.expectedResult);
        addUnique('thresholds', r.threshold);
        addUnique('dialects', r.dialect);
      });

      if (newCount > 0) {
        this.saveVocabulary();
        this.renderDatalists();
        this.showToast(`Smart Autocomplete learned ${newCount} new unique value(s)`, 'info');
      }
    },

    exportVocabularyTxt() {
      let text = `# ====================================================================\n# Data Quality Documenter - Smart Autocomplete Vocabulary Dictionary\n# ====================================================================\n# Automatically memorized unique inputs across your data quality documents.\n\n`;
      for (const [category, values] of Object.entries(this.vocabulary)) {
        text += `[${category}]\n`;
        values.forEach(v => {
          text += `${v}\n`;
        });
        text += `\n`;
      }
      this.downloadBlob(new Blob([text], { type: 'text/plain;charset=utf-8;' }), 'autocomplete_vocabulary.txt');
      this.showToast('Autocomplete vocabulary exported as .txt', 'success');
    },

    async importVocabularyTxt(file) {
      try {
        const text = await file.text();
        const lines = text.split(/\r?\n/);
        let currentCat = '';
        let count = 0;

        lines.forEach(line => {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) return;

          const matchCat = trimmed.match(/^\[([A-Za-z0-9_]+)\]$/);
          if (matchCat) {
            currentCat = matchCat[1];
            if (!this.vocabulary[currentCat]) this.vocabulary[currentCat] = [];
          } else if (currentCat) {
            if (!this.vocabulary[currentCat].includes(trimmed)) {
              this.vocabulary[currentCat].push(trimmed);
              count++;
            }
          }
        });

        this.saveVocabulary();
        this.renderDatalists();
        this.showToast(`Imported ${count} new unique autocomplete value(s) from .txt`, 'success');
        if (this.currentView === 'settings') this.navigateTo('settings');
      } catch (err) {
        alert('Error importing vocabulary .txt: ' + err.message);
      }
    },

    getTotalVocabularyTermsCount() {
      let count = 0;
      if (this.vocabulary) {
        Object.values(this.vocabulary).forEach(arr => {
          if (Array.isArray(arr)) count += arr.length;
        });
      }
      return count;
    },

    getAllUserStatistics() {
      const userMap = {};

      const getOrCreateUser = (rawName) => {
        if (!rawName || !String(rawName).trim()) return null;
        const trimmed = String(rawName).trim();
        const key = trimmed.toLowerCase();
        // Ignore generic placeholder strings
        if (key === 'author' || key === 'user' || key === 'unassigned' || key === 'n/a' || key === 'none' || key === 'null' || key === 'undefined') {
          return null;
        }
        if (!userMap[key]) {
          userMap[key] = {
            key,
            username: trimmed,
            teams: new Set(),
            documents: [],
            roles: new Set()
          };
        } else {
          // If the new name has uppercase/title case and existing is all lowercase, improve display name
          if (trimmed !== trimmed.toLowerCase() && userMap[key].username === userMap[key].username.toLowerCase()) {
            userMap[key].username = trimmed;
          }
        }
        return userMap[key];
      };

      this.documents.forEach(doc => {
        const docUserKeys = new Set();

        // 1. Assigned usernames
        if (Array.isArray(doc.usernames)) {
          doc.usernames.forEach(u => {
            const uEntry = getOrCreateUser(u);
            if (uEntry) {
              uEntry.roles.add('Assignee');
              docUserKeys.add(uEntry.key);
            }
          });
        }

        // 2. Owner
        if (doc.owner) {
          const uEntry = getOrCreateUser(doc.owner);
          if (uEntry) {
            uEntry.roles.add('Owner');
            docUserKeys.add(uEntry.key);
          }
        }

        // 3. Author / CreatedBy
        if (doc.author) {
          const uEntry = getOrCreateUser(doc.author);
          if (uEntry) {
            uEntry.roles.add('Author');
            docUserKeys.add(uEntry.key);
          }
        }

        // 4. Reviewer
        if (doc.reviewer) {
          const uEntry = getOrCreateUser(doc.reviewer);
          if (uEntry) {
            uEntry.roles.add('Reviewer');
            docUserKeys.add(uEntry.key);
          }
        }

        // 5. Approvals reviewers
        if (Array.isArray(doc.approvals)) {
          doc.approvals.forEach(a => {
            if (a.reviewer) {
              const uEntry = getOrCreateUser(a.reviewer);
              if (uEntry) {
                uEntry.roles.add('Approver');
                docUserKeys.add(uEntry.key);
              }
            }
          });
        }

        // 6. Version history authors
        if (Array.isArray(doc.versionHistory)) {
          doc.versionHistory.forEach(v => {
            if (v.author) {
              const uEntry = getOrCreateUser(v.author);
              if (uEntry) {
                uEntry.roles.add('Revision Author');
                docUserKeys.add(uEntry.key);
              }
            }
          });
        }

        // 7. Issues owners
        if (Array.isArray(doc.issues)) {
          doc.issues.forEach(i => {
            if (i.owner) {
              const uEntry = getOrCreateUser(i.owner);
              if (uEntry) {
                uEntry.roles.add('Remediation Owner');
                docUserKeys.add(uEntry.key);
              }
            }
          });
        }

        // Link document and team to each unique user involved in this document
        docUserKeys.forEach(key => {
          const uEntry = userMap[key];
          if (uEntry) {
            if (doc.team && String(doc.team).trim()) {
              uEntry.teams.add(String(doc.team).trim());
            }
            if (!uEntry.documents.some(d => d.id === doc.id)) {
              uEntry.documents.push(doc);
            }
          }
        });
      });

      return userMap;
    },

    getUserRolesInDocument(username, doc) {
      if (!doc) return [];
      const normUser = String(username || '').trim().toLowerCase();
      const roles = new Set();

      if (doc.owner && String(doc.owner).trim().toLowerCase() === normUser) {
        roles.add('Owner');
      }
      if (doc.author && String(doc.author).trim().toLowerCase() === normUser) {
        roles.add('Author');
      }
      if (doc.reviewer && String(doc.reviewer).trim().toLowerCase() === normUser) {
        roles.add('Reviewer');
      }
      if (Array.isArray(doc.usernames) && doc.usernames.some(u => String(u || '').trim().toLowerCase() === normUser)) {
        roles.add('Assignee');
      }
      if (Array.isArray(doc.approvals) && doc.approvals.some(a => String(a.reviewer || '').trim().toLowerCase() === normUser)) {
        roles.add('Approver');
      }
      if (Array.isArray(doc.versionHistory) && doc.versionHistory.some(v => String(v.author || '').trim().toLowerCase() === normUser)) {
        roles.add('Revision Author');
      }
      if (Array.isArray(doc.issues) && doc.issues.some(i => String(i.owner || '').trim().toLowerCase() === normUser)) {
        roles.add('Remediation Owner');
      }

      return roles.size > 0 ? Array.from(roles) : ['Contributor'];
    },

    getAllTeams() {
      const teams = new Set();
      this.documents.forEach(doc => {
        if (doc.team && String(doc.team).trim()) {
          teams.add(String(doc.team).trim());
        }
      });
      return Array.from(teams);
    },

    // ====================================================================
    // 2. LOCAL PERSISTENCE (IndexedDB & Fallback)
    // ====================================================================

    initDatabase() {
      return new Promise((resolve, reject) => {
        if (!window.indexedDB) {
          console.warn('IndexedDB unavailable. Using memory/localStorage fallback.');
          resolve();
          return;
        }

        const request = window.indexedDB.open('DQD_Database_v1', 3);

        request.onupgradeneeded = (e) => {
          const db = e.target.result;
          const stores = ['documents', 'rules', 'templates', 'executions', 'issues', 'audit', 'settings', 'sql_assertions'];
          stores.forEach(s => {
            if (!db.objectStoreNames.contains(s)) {
              if (s === 'audit') {
                db.createObjectStore(s, { keyPath: 'id', autoIncrement: true });
              } else {
                db.createObjectStore(s, { keyPath: 'id' });
              }
            }
          });
        };

        request.onsuccess = (e) => {
          this.db = e.target.result;
          resolve();
        };

        request.onerror = (e) => {
          console.warn('IndexedDB open error. Proceeding with fallback.', e);
          resolve();
        };
      });
    },

    // IndexedDB Operations Helper
    dbPut(storeName, item) {
      return new Promise((resolve, reject) => {
        if (!this.db) {
          this.fallbackPut(storeName, item);
          resolve(item);
          return;
        }
        try {
          const tx = this.db.transaction(storeName, 'readwrite');
          const store = tx.objectStore(storeName);
          const req = store.put(item);
          req.onsuccess = () => resolve(item);
          req.onerror = (e) => reject(e);
        } catch (e) {
          this.fallbackPut(storeName, item);
          resolve(item);
        }
      });
    },

    dbGetAll(storeName) {
      return new Promise((resolve) => {
        if (!this.db) {
          resolve(this.fallbackGetAll(storeName));
          return;
        }
        try {
          const tx = this.db.transaction(storeName, 'readonly');
          const store = tx.objectStore(storeName);
          const req = store.getAll();
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => resolve(this.fallbackGetAll(storeName));
        } catch (e) {
          resolve(this.fallbackGetAll(storeName));
        }
      });
    },

    dbDelete(storeName, id) {
      return new Promise((resolve, reject) => {
        if (!this.db) {
          this.fallbackDelete(storeName, id);
          resolve();
          return;
        }
        try {
          const tx = this.db.transaction(storeName, 'readwrite');
          const store = tx.objectStore(storeName);
          const req = store.delete(id);
          req.onsuccess = () => resolve();
          req.onerror = (e) => reject(e);
        } catch (e) {
          this.fallbackDelete(storeName, id);
          resolve();
        }
      });
    },

    // Fallback store in localStorage
    fallbackGetAll(storeName) {
      try {
        const raw = localStorage.getItem('DQD_STORE_' + storeName);
        return raw ? JSON.parse(raw) : [];
      } catch (e) {
        return [];
      }
    },

    fallbackPut(storeName, item) {
      try {
        const all = this.fallbackGetAll(storeName);
        const idx = all.findIndex(x => x.id === item.id);
        if (idx >= 0) all[idx] = item;
        else all.push(item);
        localStorage.setItem('DQD_STORE_' + storeName, JSON.stringify(all));
      } catch (e) {}
    },

    fallbackDelete(storeName, id) {
      try {
        const all = this.fallbackGetAll(storeName);
        const filtered = all.filter(x => x.id !== id);
        localStorage.setItem('DQD_STORE_' + storeName, JSON.stringify(filtered));
      } catch (e) {}
    },

    // Seed initial templates, sample document, and rules
    async loadInitialData() {
      // 1. Documents (Clean slate: delete all generated and sample documents, keep templates intact)
      const purgeKey = 'DQD_PURGE_ALL_DOCS_V3';
      if (!localStorage.getItem(purgeKey)) {
        const existingDocs = await this.dbGetAll('documents');
        for (const d of existingDocs) {
          if (d && d.id) await this.dbDelete('documents', d.id);
        }
        localStorage.removeItem('DQD_STORE_documents');

        const existingExecs = await this.dbGetAll('executions');
        for (const ex of existingExecs) {
          if (ex && ex.id) await this.dbDelete('executions', ex.id);
        }
        localStorage.removeItem('DQD_STORE_executions');
        this.executions = [];

        const existingIssues = await this.dbGetAll('issues');
        for (const iss of existingIssues) {
          if (iss && iss.id) await this.dbDelete('issues', iss.id);
        }
        localStorage.removeItem('DQD_STORE_issues');
        this.issues = [];

        localStorage.setItem(purgeKey, 'true');
        this.documents = [];
      } else {
        this.documents = await this.dbGetAll('documents');
      }

      // If user removed DQD_DEFAULT_DOC, ensure no sample document remains
      if (!window.DQD_DEFAULT_DOC) {
        this.documents = this.documents.filter(d => !d.id.startsWith('DOC-202610-001') && !d.id.startsWith('DOC-20261012-TRINO'));
      }

      // Sanitize documents: eliminate placeholder 'Author' from version history or author fields
      this.documents.forEach(d => {
        if (d && Array.isArray(d.versionHistory)) {
          d.versionHistory.forEach(v => {
            if (v && v.author && String(v.author).trim().toLowerCase() === 'author') {
              v.author = d.owner || (Array.isArray(d.usernames) && d.usernames[0]) || '';
            }
          });
        }
        if (d && d.author && String(d.author).trim().toLowerCase() === 'author') {
          d.author = d.owner || (Array.isArray(d.usernames) && d.usernames[0]) || '';
        }
      });

      // 2. Templates (Ensure full data is populated for fast use)
      this.templates = await this.dbGetAll('templates');
      let sampleTemplates = window.DQD_DEFAULT_TEMPLATES || [];
      if (sampleTemplates.length === 0) {
        sampleTemplates = await this.fetchJsonOrDefault('templates/templates_catalog.json', []);
      }
      const tplVersionKey = 'DQD_TEMPLATES_MULTI_TEAM_V1';
      if (this.templates.length === 0 || !localStorage.getItem(tplVersionKey)) {
        for (const tpl of sampleTemplates) {
          await this.dbPut('templates', tpl);
        }
        this.templates = sampleTemplates;
        localStorage.setItem(tplVersionKey, 'true');
      }

      // 3. Rules Catalog
      this.rules = await this.dbGetAll('rules');
      if (this.rules.length === 0) {
        // Seed standard rules
        const defaultRules = [
          {
            id: "RULE-COMP-001",
            name: "Mandatory Customer Identifier",
            dimension: "Completeness",
            severity: "Critical",
            description: "Ensures CUSTOMER_ID is never NULL in customer master.",
            sql: "SELECT COUNT(*) FROM DIM_CUSTOMER WHERE CUSTOMER_ID IS NULL;",
            expectedResult: "0 rows returned",
            threshold: "0",
            owner: "Sarah Jenkins",
            dialect: "Snowflake"
          },
          {
            id: "RULE-UNIQ-001",
            name: "Unique Transaction UUID",
            dimension: "Uniqueness",
            severity: "Critical",
            description: "Checks that each financial transaction record has a distinct UUID.",
            sql: "SELECT TRANSACTION_ID, COUNT(*) FROM FACT_TRANSACTIONS GROUP BY TRANSACTION_ID HAVING COUNT(*) > 1;",
            expectedResult: "0 duplicates found",
            threshold: "0",
            owner: "Michael Chang",
            dialect: "PostgreSQL"
          },
          {
            id: "RULE-VAL-001",
            name: "Email RFC-5322 Syntax Validity",
            dimension: "Validity",
            severity: "High",
            description: "Validates email syntax against RFC standard pattern.",
            sql: "SELECT CUSTOMER_ID, EMAIL FROM DIM_CUSTOMER WHERE EMAIL IS NOT NULL AND EMAIL NOT RLIKE '^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\\.[a-zA-Z0-9-.]+$';",
            expectedResult: "0 rows",
            threshold: "0",
            owner: "Sarah Jenkins",
            dialect: "Snowflake"
          },
          {
            id: "RULE-ACC-001",
            name: "Order Balance Total Accuracy",
            dimension: "Accuracy",
            severity: "Critical",
            description: "Verifies ORDER_TOTAL equals SUM(LINE_ITEM_TOTAL) + TAX - DISCOUNT.",
            sql: "SELECT ORDER_ID FROM FACT_ORDERS WHERE ABS(ORDER_TOTAL - (SUBTOTAL + TAX - DISCOUNT)) > 0.01;",
            expectedResult: "0 rows with balance discrepancy",
            threshold: "0.01",
            owner: "Elena Rostova",
            dialect: "PostgreSQL"
          },
          {
            id: "RULE-REC-001",
            name: "Gross Daily Revenue Reconciliation",
            dimension: "Reconciliation",
            severity: "Critical",
            description: "Reconciles Stripe gateway settlement against ERP GL balances.",
            sql: "WITH src AS (SELECT SUM(AMT) AS s_tot FROM STRIPE_CHARGES WHERE DATE = CURRENT_DATE - 1),\ntgt AS (SELECT SUM(AMT) AS t_tot FROM GL_POSTINGS WHERE DATE = CURRENT_DATE - 1)\nSELECT (s_tot - t_tot) AS variance FROM src CROSS JOIN tgt WHERE ABS(s_tot - t_tot) > 1.00;",
            expectedResult: "Variance < $1.00",
            threshold: "1.00",
            owner: "Elena Rostova",
            dialect: "PostgreSQL"
          },
          {
            id: "RULE-FRESH-001",
            name: "Warehouse Inventory Snapshot Freshness",
            dimension: "Freshness",
            severity: "High",
            description: "Ensures snapshot update timestamp arrived within 2 hours.",
            sql: "SELECT MAX(SNAPSHOT_TIME) AS latest_sync FROM FACT_INVENTORY HAVING TIMESTAMPDIFF(MINUTE, MAX(SNAPSHOT_TIME), CURRENT_TIMESTAMP()) > 120;",
            expectedResult: "Lag minutes <= 120",
            threshold: "120",
            owner: "Liam O'Connor",
            dialect: "ANSI SQL"
          }
        ];
        for (const r of defaultRules) {
          await this.dbPut('rules', r);
        }
        this.rules = defaultRules;
      }

      // 4. Executions & Issues
      this.executions = await this.dbGetAll('executions');
      if (this.executions.length === 0 && this.documents.length > 0 && this.documents[0].executions) {
        this.executions = this.documents[0].executions;
        for (const ex of this.executions) {
          await this.dbPut('executions', ex);
        }
      }

      this.issues = await this.dbGetAll('issues');
      if (this.issues.length === 0 && this.documents.length > 0 && this.documents[0].issues) {
        this.issues = this.documents[0].issues;
        for (const iss of this.issues) {
          await this.dbPut('issues', iss);
        }
      }

      // 5. Audit logs
      this.auditLogs = await this.dbGetAll('audit');
      if (this.auditLogs.length === 0) {
        await this.logAudit('System Initialized', 'Local workspace initialized with standard schema and rules', 'System');
      }

      // 6. SQL Assertion Library (by default not have anything)
      this.sqlAssertions = await this.dbGetAll('sql_assertions');
      if (this.sqlAssertions.length === 0) {
        const diskQueries = await this.fetchJsonOrDefault('sql_assertions.json', []);
        if (Array.isArray(diskQueries) && diskQueries.length > 0) {
          for (const q of diskQueries) {
            await this.dbPut('sql_assertions', q);
          }
          this.sqlAssertions = diskQueries;
        } else {
          this.sqlAssertions = []; // Empty by default
        }
      }

      // 7. Universal Header Search Keywords Catalog
      let defaultKeywords = window.DQD_DEFAULT_SEARCH_KEYWORDS || [];
      if (defaultKeywords.length === 0) {
        defaultKeywords = await this.fetchJsonOrDefault('search_keywords.json', []);
      }
      this.searchKeywords = defaultKeywords;
    },

    async fetchJsonOrDefault(path, defaultVal) {
      try {
        const resp = await fetch(path);
        if (resp.ok) {
          return await resp.json();
        }
      } catch (e) {
        console.warn('Could not fetch ' + path + ', using default fallback.', e);
      }
      return defaultVal;
    },

    // Audit Logging Helper
    async logAudit(action, details, actor = 'Data Quality Engineer', targetId = '') {
      const entry = {
        timestamp: new Date().toISOString(),
        action,
        details,
        actor,
        targetId
      };
      await this.dbPut('audit', entry);
      this.auditLogs.unshift(entry);
    },

    // ====================================================================
    // 3. NAVIGATION & VIEW SWITCHING
    // ====================================================================

    navigateTo(viewName, params = {}) {
      this.currentView = viewName;

      // Update sidebar active class
      document.querySelectorAll('.nav-item').forEach(el => {
        el.classList.toggle('active', el.dataset.view === viewName);
      });

      // Update Topbar Title
      const profile = this.getActiveProfile();
      const titleMap = {
        'dashboard': ['Dashboard', profile.subtitle || 'Quality Metrics & Workspace Overview'],
        'documents': ['Document Library', `Manage ${profile.name} Documents & Specifications`],
        'users': ['User & Team Directory', 'Explore Documents by Assigned Team Members and Author Attribution'],
        'editor': [this.currentDoc && this.currentDoc.id ? 'Edit Document' : 'Create New Document', `Author ${profile.label} Specification, Mappings & Logic`],
        'templates': ['Document Templates', `Standardized Templates for ${profile.label}`],
        'rules': [profile.key === 'data_analysis' ? 'Metric Catalog' : (profile.key === 'data_engineering' ? 'Pipeline Tasks & Criteria' : (profile.key === 'data_modelling' ? 'Entities & Schema Catalog' : 'Validation Rules Catalog')), `${profile.name} Specifications, Criteria & Logic`],
        'sql-library': ['SQL Library & Workbench', `${profile.name} Queries Across Supported Dialects`],
        'executions': [profile.key === 'data_analysis' ? 'Analysis Execution Logs' : (profile.key === 'data_engineering' ? 'Pipeline Runs & Latency' : (profile.key === 'data_modelling' ? 'Model Review Executions' : 'Test Executions')), 'Execution Logs, Records & Measurements'],
        'issues': ['Issues & Remediation Tracker', 'Triage Root Causes, CAPA & Corrective Actions'],
        'file-search': ['Local File & Filesystem Search', 'Search Saved Documents & Local System Folders'],
        'pdf-import': ['PDF Import & Auto Field Mapping', 'Extract Text & Heuristic Recognition into Fields'],
        'dbt-import': ['dbt Artifacts Import', 'Parse manifest.json, run_results & catalog.json'],
        'scorecards': ['Quality Scorecards', 'Enterprise Health Dimensions & Defect Ratios'],
        'approvals': ['Approvals & Governance', 'Review Workflow, Sign-Offs & Change Controls'],
        'audit': ['Audit History', 'Local Browser Activity Log & Change Trails'],
        'settings': ['Settings & Configuration', 'Branding, Field Requirements & Portable Export']
      };

      const titleInfo = titleMap[viewName] || [(profile ? `${profile.name} Documenter` : (this.config.appName || 'Data Workspace Documenter')), ''];
      document.getElementById('current-view-title').textContent = titleInfo[0];
      document.getElementById('current-view-subtitle').textContent = titleInfo[1];

      // Render view content
      const container = document.getElementById('main-content-view');
      container.scrollTop = 0;

      switch (viewName) {
        case 'dashboard':
          this.renderDashboard(container);
          break;
        case 'documents':
          this.renderDocuments(container);
          break;
        case 'users':
          this.renderUserDirectory(container);
          break;
        case 'editor':
          this.renderEditor(container, params);
          break;
        case 'templates':
          this.renderTemplates(container);
          break;
        case 'rules':
          this.renderRules(container);
          break;
        case 'sql-library':
          this.renderSqlLibrary(container);
          break;
        case 'executions':
          this.renderExecutions(container);
          break;
        case 'issues':
          this.renderIssues(container);
          break;
        case 'file-search':
          this.renderFileSearch(container);
          break;
        case 'pdf-import':
          this.renderPdfImport(container);
          break;
        case 'dbt-import':
          this.renderDbtImport(container);
          break;
        case 'scorecards':
          this.renderScorecards(container);
          break;
        case 'approvals':
          this.renderApprovals(container);
          break;
        case 'audit':
          this.renderAudit(container);
          break;
        case 'settings':
          this.renderSettings(container);
          break;
        default:
          container.innerHTML = `<div class="card"><div class="card-body">View "${viewName}" not found.</div></div>`;
      }
    },

    updateSidebarBadges() {
      const docCount = document.getElementById('badge-doc-count');
      if (docCount) docCount.textContent = this.documents.length;

      const usersBadge = document.getElementById('badge-users-count');
      if (usersBadge) usersBadge.textContent = Object.keys(this.getAllUserStatistics()).length;

      const ruleCount = document.getElementById('badge-rules-count');
      if (ruleCount) ruleCount.textContent = this.rules.length;

      const issueCount = document.getElementById('badge-issues-count');
      if (issueCount) {
        const openCount = this.issues.filter(i => i.status !== 'Resolved' && i.status !== 'Closed').length;
        issueCount.textContent = openCount;
      }

      const sqlBadge = document.getElementById('badge-sql-library-count');
      if (sqlBadge) {
        sqlBadge.textContent = this.sqlAssertions ? this.sqlAssertions.length : 0;
      }
    },

    // ====================================================================
    // 4. ATTACH GLOBAL EVENTS
    // ====================================================================

    attachGlobalEvents() {
      // Sidebar navigation clicks
      document.querySelectorAll('.nav-item').forEach(el => {
        el.addEventListener('click', (e) => {
          e.preventDefault();
          const view = el.dataset.view;
          if (view === 'editor') {
            this.currentDoc = null; // New document
            this.currentEditorTab = 'tab-meta';
          }
          this.navigateTo(view);
        });
      });

      // Team Profile Workspace Switcher
      const profileSelect = document.getElementById('team-profile-select');
      if (profileSelect) {
        profileSelect.addEventListener('change', (e) => {
          this.switchTeamProfile(e.target.value, true);
        });
      }

      // Quick new document
      document.getElementById('btn-quick-new-doc').addEventListener('click', () => {
        this.currentDoc = null;
        this.currentEditorTab = 'tab-meta';
        this.navigateTo('editor');
      });

      // Quick backup
      document.getElementById('btn-quick-backup').addEventListener('click', () => {
        this.exportCompleteBackup();
      });

      // Quick Import .dqdoc / JSON file
      const btnQuickImport = document.getElementById('btn-quick-import-dqdoc');
      const inputQuickImport = document.getElementById('input-quick-import-file');
      if (btnQuickImport && inputQuickImport) {
        btnQuickImport.addEventListener('click', () => {
          inputQuickImport.click();
        });
        inputQuickImport.addEventListener('change', (e) => {
          if (e.target.files && e.target.files[0]) {
            this.importDocumentDataFile(e.target.files[0]);
            inputQuickImport.value = '';
          }
        });
      }

      // Real-Time Global search bar with live dropdown
      const searchInput = document.getElementById('global-search-input');
      const searchDropdown = document.getElementById('global-search-dropdown');
      if (searchInput && searchDropdown) {
        searchInput.addEventListener('input', () => {
          const q = searchInput.value.trim();
          this.renderGlobalSearchDropdown(q, searchDropdown);
        });
        searchInput.addEventListener('focus', () => {
          const q = searchInput.value.trim();
          if (q.length >= 2) this.renderGlobalSearchDropdown(q, searchDropdown);
        });
        searchInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            searchDropdown.style.display = 'none';
            const q = searchInput.value.trim();
            if (q) {
              this.showFullSearchResultsModal(q);
            }
          } else if (e.key === 'Escape') {
            searchDropdown.style.display = 'none';
          }
        });
        document.addEventListener('click', (e) => {
          if (!e.target.closest('.navbar-search')) {
            searchDropdown.style.display = 'none';
          }
        });
      }

      // Global screenshot paste listener (Ctrl+V) when in document editor
      window.addEventListener('paste', (e) => {
        if (this.currentView === 'editor' && e.clipboardData && e.clipboardData.items) {
          const items = e.clipboardData.items;
          for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
              const file = items[i].getAsFile();
              if (file) {
                this.handleScreenshotFile(file, `clipboard_screenshot_${Date.now()}.png`);
                break;
              }
            }
          }
        }
      });

      // Modal close button & backdrop
      document.getElementById('modal-btn-close').addEventListener('click', () => this.closeModal());
      document.getElementById('app-modal').addEventListener('click', (e) => {
        if (e.target.id === 'app-modal') this.closeModal();
      });

      // Keyboard shortcuts
      window.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
          if (this.currentView === 'editor') {
            e.preventDefault();
            this.saveCurrentDocument();
          }
        }
      });
    },

    // ====================================================================
    // 5. VIEW: DASHBOARD
    // ====================================================================

    renderDashboard(container) {
      const docCount = this.documents.length;
      const allTeams = this.getAllTeams();
      const teamCount = allTeams.length;
      const allUsersMap = this.getAllUserStatistics();
      const userCount = Object.keys(allUsersMap).length;
      const ruleCount = this.rules.length;
      const execCount = this.executions.length;
      const passedCount = this.executions.filter(e => e.status === 'PASSED').length;
      const passRate = execCount > 0 ? ((passedCount / execCount) * 100).toFixed(1) : '100.0';
      const openIssues = this.issues.filter(i => i.status !== 'Resolved' && i.status !== 'Closed').length;
      const criticalIssues = this.issues.filter(i => i.severity === 'Critical' && i.status !== 'Resolved' && i.status !== 'Closed').length;

      container.innerHTML = `
        <div class="grid-cols-4" style="margin-bottom: 24px;">
          <div class="metric-tile" id="dash-tile-docs" style="cursor: pointer;" title="Click to view all documents">
            <div class="metric-icon-box" style="background: rgba(31,78,121,0.1); color: var(--primary-color);">📑</div>
            <div>
              <div class="metric-value">${docCount}</div>
              <div class="metric-label">Total Documents</div>
            </div>
          </div>
          <div class="metric-tile" id="dash-tile-teams" style="cursor: pointer;" title="Click to view User & Team Directory">
            <div class="metric-icon-box" style="background: rgba(16,185,129,0.1); color: var(--status-passed);">🏢</div>
            <div>
              <div class="metric-value">${teamCount}</div>
              <div class="metric-label">Total Teams</div>
            </div>
          </div>
          <div class="metric-tile" id="dash-tile-users" style="cursor: pointer; border: 2px solid rgba(68,114,196,0.35); background: rgba(68,114,196,0.03);" title="Click to open page to view all usernames & related documents">
            <div class="metric-icon-box" style="background: rgba(68,114,196,0.15); color: var(--secondary-color);">👥</div>
            <div>
              <div class="metric-value" style="color: var(--secondary-color);">${userCount}</div>
              <div class="metric-label" style="font-weight: 700; color: var(--secondary-color);">Total Usernames ↗</div>
            </div>
          </div>
          <div class="metric-tile" id="dash-tile-rules" style="cursor: pointer;" title="Active Validation Rules Catalog">
            <div class="metric-icon-box" style="background: rgba(245,158,11,0.1); color: #f59e0b;">🛡️</div>
            <div>
              <div class="metric-value">${ruleCount}</div>
              <div class="metric-label">Rules (${passRate}% Pass)</div>
            </div>
          </div>
        </div>

        <div class="grid-cols-2">
          <!-- Recent Documents -->
          <div class="card">
            <div class="card-header">
              <span class="card-title">📑 Recent Data Quality Documents</span>
              <button class="btn btn-outline btn-sm" id="dash-btn-view-all-docs">View All</button>
            </div>
            <div class="card-body" style="padding: 0;">
              ${this.documents.length === 0 ? '<div style="padding: 24px; text-align: center; color: var(--text-muted);">No documents created yet.</div>' : `
                <table class="table-custom">
                  <thead>
                    <tr>
                      <th>Document Title</th>
                      <th>Domain</th>
                      <th>Status</th>
                      <th>Updated</th>
                      <th style="text-align: right;">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${this.documents.slice(0, 5).map(doc => `
                      <tr>
                        <td>
                          <strong>${this.escapeHtml(doc.title || 'Untitled Document')}</strong>
                          <div style="font-size: 11px; color: var(--text-muted);">${doc.id} | v${doc.version || '1.0'}</div>
                        </td>
                        <td>${this.escapeHtml(doc.businessDomain || 'General')}</td>
                        <td>${this.getStatusBadge(doc.status)}</td>
                        <td>${doc.updatedAt ? new Date(doc.updatedAt).toLocaleDateString() : 'N/A'}</td>
                        <td style="text-align: right; white-space: nowrap;">
                          <button class="btn btn-outline btn-sm btn-action-edit-doc" data-id="${doc.id}" title="Edit Document">✏️ Edit</button>
                          <button class="btn btn-danger btn-sm btn-action-delete-doc" data-id="${doc.id}" title="Delete Document">🗑️</button>
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              `}
            </div>
          </div>

          <!-- Quick Actions & Quality Dimensions -->
          <div class="card">
            <div class="card-header">
              <span class="card-title">⚡ Quick Operations</span>
            </div>
            <div class="card-body">
              <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 20px;">
                <button class="btn btn-outline" id="dash-quick-new" style="justify-content: flex-start; padding: 12px;">
                  <span style="font-size: 20px; margin-right: 8px;">➕</span>
                  <div style="text-align: left;">
                    <strong>New Document</strong>
                    <div style="font-size: 11px; color: var(--text-muted);">Start from blank</div>
                  </div>
                </button>
                <button class="btn btn-outline" id="dash-quick-template" style="justify-content: flex-start; padding: 12px;">
                  <span style="font-size: 20px; margin-right: 8px;">📋</span>
                  <div style="text-align: left;">
                    <strong>Use Template</strong>
                    <div style="font-size: 11px; color: var(--text-muted);">9 standard formats</div>
                  </div>
                </button>
                <button class="btn btn-outline" id="dash-quick-pdf" style="justify-content: flex-start; padding: 12px;">
                  <span style="font-size: 20px; margin-right: 8px;">📄</span>
                  <div style="text-align: left;">
                    <strong>Import PDF</strong>
                    <div style="font-size: 11px; color: var(--text-muted);">Extract & map fields</div>
                  </div>
                </button>
                <button class="btn btn-outline" id="dash-quick-sql" style="justify-content: flex-start; padding: 12px;">
                  <span style="font-size: 20px; margin-right: 8px;">💾</span>
                  <div style="text-align: left;">
                    <strong>SQL Library</strong>
                    <div style="font-size: 11px; color: var(--text-muted);">Workbench & queries</div>
                  </div>
                </button>
                <button class="btn btn-outline" id="dash-quick-users" style="justify-content: flex-start; padding: 12px;">
                  <span style="font-size: 20px; margin-right: 8px;">👥</span>
                  <div style="text-align: left;">
                    <strong>User Directory</strong>
                    <div style="font-size: 11px; color: var(--text-muted);">View usernames & docs</div>
                  </div>
                </button>
                <button class="btn btn-outline" id="dash-quick-import-dqdoc" style="justify-content: flex-start; padding: 12px;">
                  <span style="font-size: 20px; margin-right: 8px;">📥</span>
                  <div style="text-align: left;">
                    <strong>Import .dqdoc</strong>
                    <div style="font-size: 11px; color: var(--text-muted);">Restore full document</div>
                  </div>
                </button>
              </div>

              <div style="padding: 14px; background: var(--surface-alt); border-radius: var(--border-radius-sm); border: 1px solid var(--surface-border);">
                <div style="font-weight: 700; font-size: 12px; text-transform: uppercase; margin-bottom: 8px; color: var(--text-muted);">Supported Data Quality Dimensions</div>
                <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                  <span class="badge badge-info">Completeness</span>
                  <span class="badge badge-info">Uniqueness</span>
                  <span class="badge badge-info">Validity</span>
                  <span class="badge badge-info">Accuracy</span>
                  <span class="badge badge-info">Consistency</span>
                  <span class="badge badge-info">Timeliness</span>
                  <span class="badge badge-info">Referential Integrity</span>
                  <span class="badge badge-info">Reconciliation</span>
                  <span class="badge badge-info">Freshness</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;

      // Tile click navigation
      document.getElementById('dash-tile-docs')?.addEventListener('click', () => this.navigateTo('documents'));
      document.getElementById('dash-tile-teams')?.addEventListener('click', () => this.navigateTo('users'));
      document.getElementById('dash-tile-users')?.addEventListener('click', () => this.navigateTo('users'));
      document.getElementById('dash-tile-rules')?.addEventListener('click', () => this.navigateTo('rules'));
      document.getElementById('dash-quick-users')?.addEventListener('click', () => this.navigateTo('users'));
      document.getElementById('dash-quick-import-dqdoc')?.addEventListener('click', () => {
        document.getElementById('input-quick-import-file')?.click();
      });

      // Event handlers
      document.getElementById('dash-btn-view-all-docs').addEventListener('click', () => this.navigateTo('documents'));
      document.getElementById('dash-quick-new').addEventListener('click', () => { this.currentDoc = null; this.currentEditorTab = 'tab-meta'; this.navigateTo('editor'); });
      document.getElementById('dash-quick-template').addEventListener('click', () => this.navigateTo('templates'));
      document.getElementById('dash-quick-pdf').addEventListener('click', () => this.navigateTo('pdf-import'));
      document.getElementById('dash-quick-sql')?.addEventListener('click', () => this.navigateTo('sql-library'));

      container.querySelectorAll('.btn-action-edit-doc').forEach(btn => {
        btn.addEventListener('click', () => {
          const doc = this.documents.find(d => d.id === btn.dataset.id);
          if (doc) {
            this.currentDoc = JSON.parse(JSON.stringify(doc));
            this.currentDoc._originalId = doc.id;
            this.currentEditorTab = 'tab-meta';
            this.navigateTo('editor');
          }
        });
      });

      container.querySelectorAll('.btn-action-delete-doc').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          await this.deleteDocument(btn.dataset.id);
        });
      });
    },

    // ====================================================================
    // 5B. VIEW: USER & TEAM DIRECTORY
    // ====================================================================

    renderUserDirectory(container) {
      const allUsersMap = this.getAllUserStatistics();
      const userKeys = Object.keys(allUsersMap).sort((a, b) => {
        return allUsersMap[a].username.localeCompare(allUsersMap[b].username, undefined, { sensitivity: 'base' });
      });
      const allTeams = this.getAllTeams();

      container.innerHTML = `
        <!-- Top Stats Row -->
        <div class="grid-cols-3" style="margin-bottom: 24px;">
          <div class="metric-tile" style="background: var(--surface-color);">
            <div class="metric-icon-box" style="background: rgba(31,78,121,0.1); color: var(--primary-color);">👥</div>
            <div>
              <div class="metric-value">${userKeys.length}</div>
              <div class="metric-label">Total Unique Usernames</div>
            </div>
          </div>
          <div class="metric-tile" style="background: var(--surface-color);">
            <div class="metric-icon-box" style="background: rgba(16,185,129,0.1); color: var(--status-passed);">🏢</div>
            <div>
              <div class="metric-value">${allTeams.length}</div>
              <div class="metric-label">Active Teams Represented</div>
            </div>
          </div>
          <div class="metric-tile" style="background: var(--surface-color);">
            <div class="metric-icon-box" style="background: rgba(68,114,196,0.1); color: var(--secondary-color);">📑</div>
            <div>
              <div class="metric-value">${this.documents.length}</div>
              <div class="metric-label">Total Documents in Workspace</div>
            </div>
          </div>
        </div>

        <!-- User Directory Card -->
        <div class="card">
          <div class="card-header" style="flex-wrap: wrap; gap: 10px;">
            <div>
              <span class="card-title">👥 User Directory & Author Attribution</span>
              <div style="font-size: 11px; color: var(--text-muted);">Explore all contributors across data quality specifications, teams, and author roles</div>
            </div>
            <div style="display: flex; gap: 10px; align-items: center;">
              <input type="text" id="user-dir-filter" class="form-control form-control-sm" style="width: 260px;" placeholder="Filter by username, team, or role...">
            </div>
          </div>
          <div class="card-body" style="padding: 0;">
            ${userKeys.length === 0 ? `
              <div style="padding: 32px; text-align: center; color: var(--text-muted);">
                No users assigned to documents yet. Assign usernames to documents in the editor.
              </div>
            ` : `
              <table class="table-custom" id="table-user-directory">
                <thead>
                  <tr>
                    <th>User / Contributor</th>
                    <th>Associated Team(s)</th>
                    <th>Combined Document Roles</th>
                    <th>Total Related Documents</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${userKeys.map(k => {
                    const uData = allUsersMap[k];
                    const u = uData.username;
                    const teamsArr = Array.from(uData.teams);
                    const rolesArr = Array.from(uData.roles);
                    const initials = u.slice(0, 2).toUpperCase();
                    return `
                      <tr class="user-dir-row" data-search="${this.escapeHtml((u + ' ' + teamsArr.join(' ') + ' ' + rolesArr.join(' ')).toLowerCase())}">
                        <td>
                          <div style="display: flex; align-items: center; gap: 10px;">
                            <div class="user-avatar-circle">${initials}</div>
                            <div>
                              <strong>${this.escapeHtml(u)}</strong>
                            </div>
                          </div>
                        </td>
                        <td>
                          ${teamsArr.length > 0 ? teamsArr.map(t => `<span class="parsed-col-pill" style="background: rgba(16,185,129,0.1); color: var(--status-passed);">${this.escapeHtml(t)}</span>`).join(' ') : '<span style="color: var(--text-muted); font-size: 11px;">No Team Specified</span>'}
                        </td>
                        <td>
                          ${rolesArr.map(r => `<span class="badge badge-info" style="font-size: 10px; margin-right: 4px; display: inline-block; margin-bottom: 2px;">${this.escapeHtml(r)}</span>`).join('')}
                        </td>
                        <td>
                          <strong style="font-size: 14px; color: var(--primary-color);">${uData.documents.length}</strong>
                          <span style="font-size: 11px; color: var(--text-muted);">doc(s)</span>
                        </td>
                        <td>
                          <button class="btn btn-primary btn-sm btn-view-user-docs" data-user="${this.escapeHtml(k)}">
                            📂 View Documents (${uData.documents.length})
                          </button>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            `}
          </div>
        </div>
      `;

      // Filter input
      const filterInput = document.getElementById('user-dir-filter');
      if (filterInput) {
        filterInput.addEventListener('input', (e) => {
          const q = e.target.value.toLowerCase().trim();
          document.querySelectorAll('.user-dir-row').forEach(row => {
            const rowText = row.dataset.search || '';
            row.style.display = rowText.includes(q) ? '' : 'none';
          });
        });
      }

      // View User Documents click
      container.querySelectorAll('.btn-view-user-docs').forEach(b => {
        b.onclick = (e) => {
          const u = e.currentTarget.dataset.user;
          this.showUserDocumentsModal(u);
        };
      });
    },

    showUserDocumentsModal(userIdentifier) {
      const allUsersMap = this.getAllUserStatistics();
      const key = String(userIdentifier || '').trim().toLowerCase();
      const uData = allUsersMap[key] || Object.values(allUsersMap).find(u => u.username.toLowerCase() === key || u.key === key);
      if (!uData || !uData.documents || uData.documents.length === 0) {
        this.showToast(`No documents found for user "${userIdentifier}"`, 'info');
        return;
      }

      const displayName = uData.username;
      const combinedRolesStr = Array.from(uData.roles).join(', ');

      const modalHtml = `
        <div style="margin-bottom: 14px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
          <div>
            <strong>Assigned Documents for: <span style="color: var(--primary-color);">${this.escapeHtml(displayName)}</span></strong>
            <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">
              ${uData.documents.length} total document(s) &bull; Combined Roles: ${this.escapeHtml(combinedRolesStr)}
            </div>
          </div>
        </div>
        <div style="max-height: 60vh; overflow-y: auto;">
          <table class="table-custom">
            <thead>
              <tr>
                <th>Document ID & Title</th>
                <th>Validation Type</th>
                <th>Team</th>
                <th>Document Roles</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${uData.documents.map(doc => {
                const docRoles = this.getUserRolesInDocument(displayName, doc);
                return `
                <tr>
                  <td>
                    <strong>${this.escapeHtml(doc.title || 'Untitled Document')}</strong>
                    <div style="font-size: 11px; color: var(--text-muted);">${doc.id} | v${doc.version || '1.0'}</div>
                  </td>
                  <td><span class="badge badge-info" style="font-size: 10px;">${this.escapeHtml(doc.validationType || 'Model Validation')}</span></td>
                  <td>${this.escapeHtml(doc.team || 'N/A')}</td>
                  <td>
                    ${docRoles.map(r => `<span class="badge badge-secondary" style="font-size: 10px; margin-right: 4px; display: inline-block; margin-bottom: 2px;">${this.escapeHtml(r)}</span>`).join('')}
                  </td>
                  <td>${this.getStatusBadge(doc.status)}</td>
                  <td>
                    <button class="btn btn-outline btn-sm btn-user-open-doc" data-id="${doc.id}">✏️ Open</button>
                  </td>
                </tr>
              `;}).join('')}
            </tbody>
          </table>
        </div>
      `;

      this.openModal(`Documents by: ${displayName}`, modalHtml, [
        { label: 'Close', class: 'btn-outline', action: () => this.closeModal() }
      ]);

      document.querySelectorAll('.btn-user-open-doc').forEach(btn => {
        btn.onclick = (e) => {
          const docId = e.currentTarget.dataset.id;
          const targetDoc = this.documents.find(d => d.id === docId);
          if (targetDoc) {
            this.closeModal();
            this.currentDoc = JSON.parse(JSON.stringify(targetDoc));
            this.currentDoc._originalId = targetDoc.id;
            this.currentEditorTab = 'tab-meta';
            this.navigateTo('editor');
          }
        };
      });
    },

    // ====================================================================
    // REAL-TIME UNIVERSAL KEYWORD SEARCH & DOWNLOAD SYSTEM
    // ====================================================================

    performUnifiedSearch(query) {
      if (!query || query.trim().length < 2) return [];
      const q = query.toLowerCase().trim();
      const results = [];
      const seenIds = new Set();

      // 1. Search through search_keywords.json pool (All System Features, Templates, Files & Samples)
      const keywordsPool = (Array.isArray(this.searchKeywords) && this.searchKeywords.length > 0)
        ? this.searchKeywords
        : (window.DQD_DEFAULT_SEARCH_KEYWORDS || []);

      keywordsPool.forEach(item => {
        let score = 0;
        const titleMatch = (item.title || '').toLowerCase().includes(q);
        const descMatch = (item.description || '').toLowerCase().includes(q);
        const catMatch = (item.category || '').toLowerCase().includes(q);
        const pathMatch = (item.filePath || '').toLowerCase().includes(q);
        const kwMatch = (item.keywords || []).some(k => (k || '').toLowerCase().includes(q));

        if (titleMatch) score += 12;
        if (kwMatch) score += 10;
        if (pathMatch) score += 8;
        if (descMatch) score += 4;
        if (catMatch) score += 2;

        if (score > 0) {
          results.push({
            id: item.id,
            title: item.title,
            category: item.category || 'System Features',
            description: item.description || '',
            filePath: item.filePath || '',
            fileType: item.fileType || '',
            keywords: item.keywords || [],
            viewAction: item.viewAction || null,
            downloadAction: item.downloadAction || null,
            score,
            source: 'keywords'
          });
          seenIds.add(item.id);
        }
      });

      // 2. Search through Saved Documents (Real user specifications)
      (this.documents || []).forEach(doc => {
        let score = 0;
        const titleMatch = (doc.title || '').toLowerCase().includes(q);
        const idMatch = (doc.id || '').toLowerCase().includes(q);
        const typeMatch = (doc.validationType || '').toLowerCase().includes(q);
        const teamMatch = (doc.team || '').toLowerCase().includes(q);
        const userMatch = (doc.usernames || []).some(u => (u || '').toLowerCase().includes(q));
        const domainMatch = (doc.businessDomain || '').toLowerCase().includes(q);

        if (titleMatch) score += 14;
        if (idMatch) score += 10;
        if (typeMatch || teamMatch || userMatch || domainMatch) score += 6;

        if (score > 0) {
          const itemId = `doc-${doc.id}`;
          if (!seenIds.has(itemId)) {
            results.push({
              id: itemId,
              title: doc.title || 'Untitled Specification',
              category: 'Saved Documents',
              description: `${doc.id} • ${doc.validationType || 'Model Validation'} ${doc.team ? '• Team: ' + doc.team : ''} ${doc.owner ? '• Owner: ' + doc.owner : ''}`,
              filePath: `documents/${doc.id}.dqdoc`,
              fileType: 'dqdoc',
              keywords: [doc.id, doc.validationType || '', doc.team || '', doc.owner || ''],
              viewAction: { type: 'open_doc', target: doc.id, label: 'Open in Editor' },
              downloadAction: { type: 'download_doc', target: doc.id, filename: `${doc.title || doc.id}.dqdoc`, label: 'Download .dqdoc' },
              score,
              source: 'documents',
              rawDoc: doc
            });
            seenIds.add(itemId);
          }
        }

        // Search SQL queries inside this document
        (doc.sqlQueries || []).forEach((qObj, idx) => {
          if ((qObj.query || '').toLowerCase().includes(q) || (qObj.title || '').toLowerCase().includes(q)) {
            const qId = `doc-query-${doc.id}-${idx}`;
            if (!seenIds.has(qId)) {
              results.push({
                id: qId,
                title: `Query: ${qObj.title || 'Validation Query'} (${qObj.dialect || 'Trino'})`,
                category: 'SQL Queries in Documents',
                description: `in Document "${doc.title || doc.id}": ${(qObj.query || '').slice(0, 100).replace(/\n/g, ' ')}...`,
                filePath: '',
                fileType: 'sql',
                keywords: [qObj.title || '', qObj.dialect || '', doc.title || ''],
                viewAction: { type: 'open_doc_tab', target: doc.id, tab: 'tab-sql', label: 'View in Editor' },
                downloadAction: { type: 'download_raw_sql', content: qObj.query || '', filename: `${(qObj.title || 'query').replace(/[^a-zA-Z0-9_-]/g, '_')}.sql`, label: 'Download SQL' },
                score: 5,
                source: 'doc-queries'
              });
              seenIds.add(qId);
            }
          }
        });
      });

      // 3. Search through SQL Assertions Library
      (this.sqlAssertions || []).forEach(assert => {
        let score = 0;
        const titleMatch = (assert.title || '').toLowerCase().includes(q);
        const docTitleMatch = (assert.documentTitle || '').toLowerCase().includes(q);
        const queryMatch = (assert.query || '').toLowerCase().includes(q);
        const dialectMatch = (assert.dialect || '').toLowerCase().includes(q);

        if (titleMatch) score += 10;
        if (docTitleMatch) score += 6;
        if (queryMatch) score += 5;
        if (dialectMatch) score += 3;

        if (score > 0) {
          const aId = `assert-${assert.id}`;
          if (!seenIds.has(aId)) {
            results.push({
              id: aId,
              title: assert.title || 'Assertion Query',
              category: 'SQL Assertions Library',
              description: `Doc: ${assert.documentTitle || 'Untitled'} (${assert.dialect || 'Trino'}) • ${(assert.query || '').slice(0, 90).replace(/\n/g, ' ')}...`,
              filePath: 'sql_assertions.json',
              fileType: 'sql',
              keywords: [assert.title || '', assert.documentTitle || '', assert.dialect || ''],
              viewAction: { type: 'navigate', target: 'sql-library', label: 'Open Workbench' },
              downloadAction: { type: 'download_raw_sql', content: assert.query || '', filename: `${(assert.title || 'assertion').replace(/[^a-zA-Z0-9_-]/g, '_')}.sql`, label: 'Download SQL' },
              score,
              source: 'sql_assertions'
            });
            seenIds.add(aId);
          }
        }
      });

      return results.sort((a, b) => b.score - a.score);
    },

    renderGlobalSearchDropdown(query, container) {
      if (!query || query.trim().length < 2) {
        container.style.display = 'none';
        return;
      }

      const results = this.performUnifiedSearch(query);

      if (results.length === 0) {
        container.innerHTML = `
          <div style="padding: 16px; font-size: 13px; color: var(--text-muted); text-align: center;">
            <div style="font-size: 20px; margin-bottom: 6px;">🔍</div>
            No features, templates, files, or documents matching "<strong>${this.escapeHtml(query)}</strong>"
            <div style="font-size: 11px; margin-top: 6px; color: var(--text-muted);">Try searching for: <em>reconciliation, dbt, sql, metadata, rules, vocabulary</em></div>
          </div>
        `;
        container.style.display = 'block';
        return;
      }

      const highlight = (text) => {
        if (!text) return '';
        const safeQ = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp('(' + safeQ + ')', 'gi');
        return this.escapeHtml(text).replace(regex, '<mark>$1</mark>');
      };

      // Group by category
      const categories = {};
      results.forEach(item => {
        const cat = item.category || 'System Features';
        if (!categories[cat]) categories[cat] = [];
        categories[cat].push(item);
      });

      let html = `
        <div style="padding: 6px 10px; font-size: 11px; color: var(--text-muted); font-weight: 700; border-bottom: 1px solid var(--surface-border); display: flex; justify-content: space-between; align-items: center;">
          <span>SEARCH RESULTS (${results.length} found)</span>
          <span style="font-size: 10px; color: var(--primary-color);">Keyword-indexed</span>
        </div>
      `;

      // Render top items per category
      let renderedCount = 0;
      const categoryIcons = {
        'System Features': '⚡',
        'Document Templates': '📋',
        'Files & Datasets': '📁',
        'Saved Documents': '📑',
        'SQL Assertions Library': '💾',
        'SQL Queries in Documents': '💾'
      };

      for (const [catName, items] of Object.entries(categories)) {
        if (renderedCount >= 14) break;
        const icon = categoryIcons[catName] || '📌';
        html += `<div class="search-popover-header"><span>${icon} ${this.escapeHtml(catName)}</span> <span style="font-size: 10px; opacity: 0.8;">(${items.length})</span></div>`;

        items.slice(0, 4).forEach(item => {
          renderedCount++;
          const viewLabel = item.viewAction ? (item.viewAction.label || 'View') : 'View';
          const downloadLabel = item.downloadAction ? (item.downloadAction.label || 'Download') : '';

          html += `
            <div class="search-popover-item" data-id="${this.escapeHtml(item.id)}">
              <div class="search-item-info">
                <div class="search-item-title">
                  <span>${highlight(item.title)}</span>
                </div>
                <div class="search-item-meta">${highlight(item.description)}</div>
                ${item.filePath ? `<div style="font-size: 10px; color: var(--primary-color); margin-top: 2px; font-family: monospace;">📁 ${this.escapeHtml(item.filePath)}</div>` : ''}
              </div>
              <div class="search-item-actions">
                ${item.viewAction ? `
                  <button type="button" class="search-btn-action search-btn-primary btn-do-view" title="${this.escapeHtml(viewLabel)}" data-id="${this.escapeHtml(item.id)}">
                    <span>👁️</span> <span>${this.escapeHtml(viewLabel)}</span>
                  </button>
                ` : ''}
                ${item.downloadAction ? `
                  <button type="button" class="search-btn-action search-btn-download btn-do-download" title="${this.escapeHtml(downloadLabel)}" data-id="${this.escapeHtml(item.id)}">
                    <span>📥</span> <span>Download</span>
                  </button>
                ` : ''}
              </div>
            </div>
          `;
        });
      }

      if (results.length > renderedCount) {
        html += `
          <div id="btn-show-all-search-results" style="padding: 10px; text-align: center; font-size: 12px; font-weight: 700; color: var(--primary-color); cursor: pointer; border-top: 1px solid var(--surface-border); background: var(--surface-alt); border-radius: 0 0 6px 6px;">
            🔍 Press Enter or Click Here to view all ${results.length} results &rarr;
          </div>
        `;
      }

      container.innerHTML = html;
      container.style.display = 'block';

      // Attach View Actions
      container.querySelectorAll('.btn-do-view').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          container.style.display = 'none';
          const itemId = btn.dataset.id;
          const targetItem = results.find(r => r.id === itemId);
          if (targetItem && targetItem.viewAction) {
            this.handleSearchResultAction('view', targetItem.viewAction, targetItem);
          }
        });
      });

      // Attach Download Actions
      container.querySelectorAll('.btn-do-download').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const itemId = btn.dataset.id;
          const targetItem = results.find(r => r.id === itemId);
          if (targetItem && targetItem.downloadAction) {
            this.handleSearchResultAction('download', targetItem.downloadAction, targetItem);
          }
        });
      });

      // Clicking on the item row itself triggers View
      container.querySelectorAll('.search-popover-item').forEach(row => {
        row.addEventListener('click', (e) => {
          if (e.target.closest('.search-item-actions')) return;
          container.style.display = 'none';
          const itemId = row.dataset.id;
          const targetItem = results.find(r => r.id === itemId);
          if (targetItem && targetItem.viewAction) {
            this.handleSearchResultAction('view', targetItem.viewAction, targetItem);
          }
        });
      });

      const showAllBtn = container.querySelector('#btn-show-all-search-results');
      if (showAllBtn) {
        showAllBtn.addEventListener('click', () => {
          container.style.display = 'none';
          this.showFullSearchResultsModal(query);
        });
      }
    },

    handleSearchResultAction(actionType, actionObj, item) {
      if (!actionObj) return;

      if (actionType === 'view') {
        const type = actionObj.type;
        const target = actionObj.target;
        if (type === 'navigate') {
          this.navigateTo(target);
        } else if (type === 'use_template') {
          const tpl = (this.templates || []).find(t => t.id === target);
          if (tpl) {
            this.currentDoc = null;
            this.navigateTo('editor', { template: tpl });
            this.showToast(`Loaded "${tpl.name}" into Editor`, 'info');
          } else {
            this.navigateTo('templates');
          }
        } else if (type === 'preview_file') {
          const downloadUrl = (item.downloadAction && item.downloadAction.url) ? item.downloadAction.url : target;
          this.previewFileModal(target, item.fileType, item.title, downloadUrl);
        } else if (type === 'open_doc') {
          const targetDoc = (this.documents || []).find(d => d.id === target);
          if (targetDoc) {
            this.currentDoc = JSON.parse(JSON.stringify(targetDoc));
            this.currentDoc._originalId = targetDoc.id;
            this.currentEditorTab = 'tab-meta';
            this.navigateTo('editor');
            this.showToast(`Opened "${targetDoc.title || targetDoc.id}" in Editor`, 'info');
          }
        } else if (type === 'open_doc_tab') {
          const targetDoc = (this.documents || []).find(d => d.id === target);
          if (targetDoc) {
            this.currentDoc = JSON.parse(JSON.stringify(targetDoc));
            this.currentDoc._originalId = targetDoc.id;
            this.currentEditorTab = actionObj.tab || 'tab-sql';
            this.navigateTo('editor', { activeTab: actionObj.tab || 'tab-sql' });
          }
        }
      } else if (actionType === 'download') {
        const type = actionObj.type;
        if (type === 'download_file') {
          this.downloadFileFromUrl(actionObj.url, actionObj.filename);
        } else if (type === 'export_template_json') {
          const tpl = (this.templates || []).find(t => t.id === actionObj.target);
          if (tpl) {
            this.downloadJson(tpl, actionObj.filename || `${tpl.id}.json`);
            this.showToast(`Downloaded template "${tpl.name}"`, 'success');
          } else {
            this.downloadFileFromUrl('templates/templates_catalog.json', 'templates_catalog.json');
          }
        } else if (type === 'download_doc') {
          const targetDoc = (this.documents || []).find(d => d.id === actionObj.target);
          if (targetDoc) {
            this.downloadBlob(new Blob([JSON.stringify(targetDoc, null, 2)], { type: 'application/json' }), actionObj.filename || `${targetDoc.id}.dqdoc`);
            this.showToast(`Downloaded "${targetDoc.title || targetDoc.id}.dqdoc"`, 'success');
          }
        } else if (type === 'download_raw_sql') {
          this.downloadBlob(new Blob([actionObj.content || ''], { type: 'text/sql' }), actionObj.filename || 'query.sql');
          this.showToast(`Downloaded "${actionObj.filename || 'query.sql'}"`, 'success');
        } else if (type === 'backup') {
          this.exportCompleteBackup();
        }
      }
    },

    async downloadFileFromUrl(url, filename) {
      const resolvedFilename = filename || url.split('/').pop() || 'download';
      try {
        const resp = await fetch(url);
        if (resp.ok) {
          const blob = await resp.blob();
          this.downloadBlob(blob, resolvedFilename);
          this.showToast(`Downloaded ${resolvedFilename}`, 'success');
          return;
        }
      } catch (e) {
        // Fallback for file:// or offline protocol
      }
      const a = document.createElement('a');
      a.href = url;
      a.download = resolvedFilename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => document.body.removeChild(a), 100);
      this.showToast(`Downloading ${resolvedFilename}...`, 'info');
    },

    async previewFileModal(filePath, fileType, title, downloadUrl) {
      let content = '';
      try {
        const resp = await fetch(filePath);
        if (resp.ok) {
          content = await resp.text();
        } else {
          content = `Could not fetch file preview directly (${resp.statusText}). You can download the file directly below.`;
        }
      } catch (e) {
        content = `File preview unavailable via offline protocol. Please use the Download button below.`;
      }

      let formattedHtml = '';
      const fType = (fileType || filePath.split('.').pop() || '').toLowerCase();
      if (fType === 'json') {
        try {
          const parsed = JSON.parse(content);
          formattedHtml = `<pre style="max-height: 420px; overflow: auto; background: #1e1e1e; color: #d4d4d4; padding: 12px; border-radius: 6px; font-size: 11px; font-family: Consolas, monospace; line-height: 1.4;"><code>${this.escapeHtml(JSON.stringify(parsed, null, 2))}</code></pre>`;
        } catch (e) {
          formattedHtml = `<pre style="max-height: 420px; overflow: auto; background: #1e1e1e; color: #d4d4d4; padding: 12px; border-radius: 6px; font-size: 11px; font-family: Consolas, monospace; line-height: 1.4;"><code>${this.escapeHtml(content)}</code></pre>`;
        }
      } else {
        formattedHtml = `<pre style="max-height: 420px; overflow: auto; background: #f8f9fa; color: #212529; border: 1px solid #dee2e6; padding: 12px; border-radius: 6px; font-size: 11px; font-family: Consolas, monospace; line-height: 1.4;"><code>${this.escapeHtml(content)}</code></pre>`;
      }

      const buttons = [
        { label: 'Close', class: 'btn-outline', action: () => this.closeModal() }
      ];
      if (downloadUrl || filePath) {
        const dUrl = downloadUrl || filePath;
        const fname = dUrl.split('/').pop();
        buttons.push({
          label: `📥 Download ${fname}`,
          class: 'btn-primary',
          action: () => {
            this.downloadFileFromUrl(dUrl, fname);
          }
        });
      }

      this.openModal(title || filePath, `
        <div style="margin-bottom: 10px; font-size: 12px; color: var(--text-muted); display: flex; gap: 14px; flex-wrap: wrap;">
          <span><strong>File Path:</strong> <code>${this.escapeHtml(filePath)}</code></span>
          <span><strong>Format:</strong> ${fType.toUpperCase()}</span>
        </div>
        ${formattedHtml}
      `, buttons);
    },

    showFullSearchResultsModal(query) {
      const results = this.performUnifiedSearch(query);

      const highlight = (text) => {
        if (!text) return '';
        const safeQ = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp('(' + safeQ + ')', 'gi');
        return this.escapeHtml(text).replace(regex, '<mark>$1</mark>');
      };

      const categories = {};
      results.forEach(item => {
        const cat = item.category || 'System Features';
        if (!categories[cat]) categories[cat] = [];
        categories[cat].push(item);
      });

      const modalHtml = `
        <div style="margin-bottom: 14px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--surface-border); padding-bottom: 10px;">
          <div>
            <div style="font-size: 14px; font-weight: 700; color: var(--text-color);">
              Found ${results.length} matching item(s) for "<strong>${this.escapeHtml(query)}</strong>"
            </div>
            <div style="font-size: 12px; color: var(--text-muted);">
              Direct access and downloads across all system features, templates, files, saved documents, and SQL queries.
            </div>
          </div>
        </div>

        <div style="display: flex; gap: 6px; margin-bottom: 14px; flex-wrap: wrap;" id="search-modal-filter-pills">
          <button type="button" class="btn btn-primary btn-sm pill-filter active" data-cat="all">All (${results.length})</button>
          ${Object.entries(categories).map(([cName, cItems]) => `
            <button type="button" class="btn btn-outline btn-sm pill-filter" data-cat="${this.escapeHtml(cName)}">
              ${this.escapeHtml(cName)} (${cItems.length})
            </button>
          `).join('')}
        </div>

        <div id="search-modal-results-list" style="max-height: 480px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px;">
          ${results.map(item => `
            <div class="search-modal-result-card card" data-cat="${this.escapeHtml(item.category)}" style="margin-bottom: 0; padding: 12px; display: flex; align-items: center; justify-content: space-between; gap: 14px;">
              <div style="flex: 1; min-width: 0;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                  <span class="badge badge-info" style="font-size: 10px;">${this.escapeHtml(item.category)}</span>
                  <span style="font-weight: 700; font-size: 13px; color: var(--text-color);">${highlight(item.title)}</span>
                </div>
                <div style="font-size: 12px; color: var(--text-muted); line-height: 1.4;">${highlight(item.description)}</div>
                ${item.filePath ? `
                  <div style="font-size: 11px; color: var(--primary-color); margin-top: 4px; font-family: monospace;">
                    📁 ${this.escapeHtml(item.filePath)}
                  </div>
                ` : ''}
              </div>
              <div style="display: flex; gap: 8px; flex-shrink: 0; align-items: center;">
                ${item.viewAction ? `
                  <button type="button" class="btn btn-primary btn-sm btn-modal-view" data-id="${this.escapeHtml(item.id)}">
                    <span>👁️</span> ${this.escapeHtml(item.viewAction.label || 'View')}
                  </button>
                ` : ''}
                ${item.downloadAction ? `
                  <button type="button" class="btn btn-success btn-sm btn-modal-download" data-id="${this.escapeHtml(item.id)}" style="background: #10B981; border-color: #10B981; color: #fff;">
                    <span>📥</span> ${this.escapeHtml(item.downloadAction.label || 'Download')}
                  </button>
                ` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      `;

      this.openModal(`Universal Search: "${query}"`, modalHtml, [
        { label: 'Close', class: 'btn-outline', action: () => this.closeModal() }
      ]);

      const modalContainer = document.getElementById('modal-body-content');
      if (modalContainer) {
        // Category pill filters
        modalContainer.querySelectorAll('.pill-filter').forEach(pill => {
          pill.addEventListener('click', () => {
            modalContainer.querySelectorAll('.pill-filter').forEach(p => {
              p.classList.remove('active');
              p.classList.remove('btn-primary');
              p.classList.add('btn-outline');
            });
            pill.classList.add('active');
            pill.classList.remove('btn-outline');
            pill.classList.add('btn-primary');

            const selectedCat = pill.dataset.cat;
            modalContainer.querySelectorAll('.search-modal-result-card').forEach(card => {
              if (selectedCat === 'all' || card.dataset.cat === selectedCat) {
                card.style.display = 'flex';
              } else {
                card.style.display = 'none';
              }
            });
          });
        });

        // View button in modal
        modalContainer.querySelectorAll('.btn-modal-view').forEach(btn => {
          btn.addEventListener('click', () => {
            const itemId = btn.dataset.id;
            const targetItem = results.find(r => r.id === itemId);
            if (targetItem && targetItem.viewAction) {
              this.closeModal();
              this.handleSearchResultAction('view', targetItem.viewAction, targetItem);
            }
          });
        });

        // Download button in modal
        modalContainer.querySelectorAll('.btn-modal-download').forEach(btn => {
          btn.addEventListener('click', () => {
            const itemId = btn.dataset.id;
            const targetItem = results.find(r => r.id === itemId);
            if (targetItem && targetItem.downloadAction) {
              this.handleSearchResultAction('download', targetItem.downloadAction, targetItem);
            }
          });
        });
      }
    },

    // ====================================================================
    // 6. VIEW: DOCUMENTS LIST & MANAGEMENT
    // ====================================================================

    renderDocuments(container) {
      const allTeams = this.getAllTeams();
      const allUsersMap = this.getAllUserStatistics();
      const allUsers = Object.keys(allUsersMap).sort();

      container.innerHTML = `
        <div class="card">
          <!-- Quick Filter Chips Bar -->
          <div class="filter-chips-bar" id="doc-filter-chips-bar">
            <!-- Dynamically populated in updateDocumentsTable -->
          </div>

          <div class="card-header" style="flex-wrap: wrap; gap: 10px;">
            <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap; flex: 1;">
              <input type="text" id="doc-filter-search" class="form-control form-control-sm" style="width: 240px;" placeholder="Filter by title, ID, SQL, author...">
              <select id="doc-filter-profile" class="form-control form-control-sm" style="width: 170px;">
                <option value="">All Profiles (${Object.keys(this.config.teamProfiles || {}).length})</option>
                ${Object.keys(this.config.teamProfiles || {}).map(k => {
                  const p = this.config.teamProfiles[k];
                  return `<option value="${k}" ${this.activeDocProfileFilter === k ? 'selected' : ''}>${this.escapeHtml(p.label || p.name)}</option>`;
                }).join('')}
              </select>
              <select id="doc-filter-status" class="form-control form-control-sm" style="width: 140px;">
                <option value="">All Statuses</option>
                <option value="Draft">Draft</option>
                <option value="In Review">In Review</option>
                <option value="Approved">Approved</option>
                <option value="Changes Requested">Changes Requested</option>
                <option value="Archived">Archived</option>
              </select>
              <select id="doc-filter-team" class="form-control form-control-sm" style="width: 170px;">
                <option value="">All Teams (${allTeams.length})</option>
                ${allTeams.map(t => `<option value="${this.escapeHtml(t)}">${this.escapeHtml(t)}</option>`).join('')}
              </select>
              <select id="doc-filter-user" class="form-control form-control-sm" style="width: 160px;">
                <option value="">All Authors (${allUsers.length})</option>
                ${allUsers.map(u => `<option value="${this.escapeHtml(u)}">${this.escapeHtml(u)}</option>`).join('')}
              </select>
            </div>
            <div style="display: flex; gap: 6px; flex-wrap: wrap;">
              <button class="btn btn-outline btn-sm" id="btn-batch-export-pack" title="Export entire workspace package (.dqpack)">📦 Batch Pack</button>
              <button class="btn btn-outline btn-sm" id="btn-batch-import-pack" title="Import complete workspace package (.dqpack)">📥 Import Pack</button>
              <input type="file" id="input-batch-pack-file" accept=".dqpack,.json" style="display: none;">
              <button class="btn btn-outline btn-sm" id="btn-import-doc-dqdoc">📥 Import .dqdoc</button>
              <button class="btn btn-primary btn-sm" id="btn-create-doc-from-list">➕ Create Document</button>
            </div>
          </div>
          <div class="card-body" style="padding: 0;">
            <div id="documents-table-container">
              <!-- Rendered via updateDocumentsTable -->
            </div>
          </div>
        </div>
      `;

      this.updateDocumentsTable();

      document.getElementById('doc-filter-search')?.addEventListener('input', () => this.updateDocumentsTable());
      document.getElementById('doc-filter-profile')?.addEventListener('change', (e) => {
        this.activeDocProfileFilter = e.target.value;
        this.updateDocumentsTable();
      });
      document.getElementById('doc-filter-status')?.addEventListener('change', () => this.updateDocumentsTable());
      document.getElementById('doc-filter-team')?.addEventListener('change', (e) => {
        this.activeDocTeamFilter = e.target.value;
        this.updateDocumentsTable();
      });
      document.getElementById('doc-filter-user')?.addEventListener('change', (e) => {
        this.activeDocUserFilter = e.target.value;
        this.updateDocumentsTable();
      });

      document.getElementById('btn-create-doc-from-list')?.addEventListener('click', () => {
        this.currentDoc = null;
        this.navigateTo('editor');
      });
      document.getElementById('btn-import-doc-dqdoc')?.addEventListener('click', () => {
        document.getElementById('input-quick-import-file')?.click();
      });
      document.getElementById('btn-batch-export-pack')?.addEventListener('click', () => this.exportBatchWorkspacePack());
      document.getElementById('btn-batch-import-pack')?.addEventListener('click', () => {
        document.getElementById('input-batch-pack-file')?.click();
      });
      document.getElementById('input-batch-pack-file')?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) this.handleBatchPackImportFile(file);
      });
    },

    updateDocumentsTable() {
      const search = (document.getElementById('doc-filter-search')?.value || '').toLowerCase();
      const statusFilter = document.getElementById('doc-filter-status')?.value || '';
      const teamFilter = this.activeDocTeamFilter || '';
      const userFilter = this.activeDocUserFilter || '';
      const profileFilter = this.activeDocProfileFilter || '';
      const valTypeFilter = this.activeDocValTypeFilter || '';

      // Update Filter Chips Bar dynamically based on active profile and existing documents
      const chipsBar = document.getElementById('doc-filter-chips-bar');
      if (chipsBar) {
        const activeProfile = this.getActiveProfile();
        const profileSubtypes = (activeProfile && Array.isArray(activeProfile.subtypes))
          ? activeProfile.subtypes.map(s => s.name)
          : [];
        const existingDocTypes = Array.from(new Set((this.documents || []).map(d => d.validationType || d.documentType).filter(Boolean)));
        const allTypes = Array.from(new Set([...profileSubtypes, ...existingDocTypes]));

        // If active filter is obsolete/unmatched, gracefully reset to All Documents
        if (this.activeDocValTypeFilter && !allTypes.includes(this.activeDocValTypeFilter)) {
          this.activeDocValTypeFilter = '';
        }

        const valTypes = [
          { key: '', label: 'All Documents', count: this.documents.length },
          ...allTypes.map(t => ({
            key: t,
            label: t,
            count: this.documents.filter(d => (d.validationType || d.documentType) === t).length
          }))
        ];

        chipsBar.innerHTML = valTypes.map(vt => `
          <button type="button" class="filter-chip ${(this.activeDocValTypeFilter || '') === vt.key ? 'active' : ''}" data-valtype="${this.escapeHtml(vt.key)}">
            <span>${vt.label}</span>
            <span class="filter-chip-count">${vt.count}</span>
          </button>
        `).join('');

        chipsBar.querySelectorAll('.filter-chip').forEach(btn => {
          btn.addEventListener('click', () => {
            this.activeDocValTypeFilter = btn.dataset.valtype;
            this.updateDocumentsTable();
          });
        });
      }

      const filtered = this.documents.filter(doc => {
        const docValType = doc.validationType || doc.documentType || '';
        const matchesValType = !this.activeDocValTypeFilter || docValType === this.activeDocValTypeFilter;
        const matchesStatus = !statusFilter || doc.status === statusFilter;
        const matchesTeam = !teamFilter || (doc.team && doc.team.toLowerCase() === teamFilter.toLowerCase());
        const matchesUser = !userFilter || (doc.usernames && doc.usernames.some(u => (u || '').toLowerCase() === userFilter.toLowerCase())) || ((doc.owner || '').toLowerCase() === userFilter.toLowerCase());
        const matchesProfile = !profileFilter || (doc.teamProfile === profileFilter);
        
        const matchesSearch = !search || 
          (doc.title && doc.title.toLowerCase().includes(search)) ||
          (doc.id && doc.id.toLowerCase().includes(search)) ||
          (docValType.toLowerCase().includes(search)) ||
          (doc.teamProfile && doc.teamProfile.toLowerCase().includes(search)) ||
          (doc.team && doc.team.toLowerCase().includes(search)) ||
          (doc.usernames && doc.usernames.some(u => (u || '').toLowerCase().includes(search))) ||
          (doc.businessDomain && doc.businessDomain.toLowerCase().includes(search)) ||
          (doc.sqlQueries && doc.sqlQueries.some(q => (q.query || '').toLowerCase().includes(search)));

        return matchesValType && matchesStatus && matchesTeam && matchesUser && matchesProfile && matchesSearch;
      });

      const container = document.getElementById('documents-table-container');
      if (!container) return;

      if (filtered.length === 0) {
        container.innerHTML = `
          <div style="padding: 40px; text-align: center; color: var(--text-muted);">
            <div style="font-size: 28px; margin-bottom: 8px;">📑</div>
            <div style="font-weight: 600;">No documents match the active filter criteria.</div>
            <div style="font-size: 12px; margin-top: 4px;">Try selecting "All Documents", clearing filters, or switching profiles.</div>
          </div>
        `;
        return;
      }

      container.innerHTML = `
        <table class="table-custom">
          <thead>
            <tr>
              <th>Document</th>
              <th>Validation Type & Profile</th>
              <th>Team & Users</th>
              <th>Status</th>
              <th>Version</th>
              <th>Last Updated</th>
              <th style="text-align: right;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.map(doc => {
              const pInfo = this.config.teamProfiles && this.config.teamProfiles[doc.teamProfile];
              const pLabel = pInfo ? (pInfo.label || pInfo.name) : '';
              return `
              <tr>
                <td>
                  <strong>${this.escapeHtml(doc.title || 'Untitled')}</strong>
                  <div style="font-size: 11px; color: var(--text-muted);">${doc.id}</div>
                </td>
                <td>
                  <span class="badge badge-info">${this.escapeHtml(doc.validationType || doc.documentType || 'Specification')}</span>
                  ${pLabel ? `<div style="font-size: 10.5px; color: var(--primary-color); font-weight: 600; margin-top: 3px;">🏛️ ${this.escapeHtml(pLabel)}</div>` : ''}
                </td>
                <td>
                  <div><strong>${this.escapeHtml(doc.team || 'General')}</strong></div>
                  <div style="font-size: 11px; color: var(--text-muted);">${(doc.usernames && doc.usernames.length > 0) ? doc.usernames.map(u => this.escapeHtml(u)).join(', ') : (doc.owner || 'Unassigned')}</div>
                </td>
                <td>${this.getStatusBadge(doc.status)}</td>
                <td><span style="font-family: monospace; font-weight: 600;">v${doc.version || '1.0'}</span></td>
                <td>${doc.updatedAt ? new Date(doc.updatedAt).toLocaleDateString() : 'N/A'}</td>
                <td style="text-align: right; white-space: nowrap;">
                  <button class="btn btn-outline btn-sm btn-doc-action-edit" data-id="${doc.id}" title="Edit Document">✏️ Edit</button>
                  <button class="btn btn-outline btn-sm btn-doc-action-share" data-id="${doc.id}" title="Share to Slack / Teams / Email">💬 Share</button>
                  <button class="btn btn-outline btn-sm btn-doc-action-clone" data-id="${doc.id}" title="Clone Document">📑 Clone</button>
                  <button class="btn btn-outline btn-sm btn-doc-action-pdf" data-id="${doc.id}" title="Generate PDF Report">📄 PDF</button>
                  <button class="btn btn-outline btn-sm btn-doc-action-dqdoc" data-id="${doc.id}" title="Download complete .dqdoc file (with screenshots)">📦 .dqdoc</button>
                  <button class="btn btn-outline btn-sm btn-doc-action-export" data-id="${doc.id}" title="Export JSON">💾</button>
                  <button class="btn btn-danger btn-sm btn-doc-action-delete" data-id="${doc.id}" title="Delete Document">🗑️</button>
                </td>
              </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      `;

      // Action Handlers
      container.querySelectorAll('.btn-doc-action-edit').forEach(btn => {
        btn.addEventListener('click', () => {
          const doc = this.documents.find(d => d.id === btn.dataset.id);
          if (doc) {
            this.currentDoc = JSON.parse(JSON.stringify(doc));
            this.currentDoc._originalId = doc.id;
            this.currentEditorTab = 'tab-meta';
            this.navigateTo('editor');
          }
        });
      });

      container.querySelectorAll('.btn-doc-action-share').forEach(btn => {
        btn.addEventListener('click', () => {
          const doc = this.documents.find(d => d.id === btn.dataset.id);
          if (doc) this.showShareMarkdownModal(doc);
        });
      });

      container.querySelectorAll('.btn-doc-action-clone').forEach(btn => {
        btn.addEventListener('click', () => this.showCloneModal(btn.dataset.id));
      });

      container.querySelectorAll('.btn-doc-action-pdf').forEach(btn => {
        btn.addEventListener('click', () => {
          const doc = this.documents.find(d => d.id === btn.dataset.id);
          if (doc) this.generatePdfReport(doc);
        });
      });

      container.querySelectorAll('.btn-doc-action-dqdoc').forEach(btn => {
        btn.addEventListener('click', () => {
          const doc = this.documents.find(d => d.id === btn.dataset.id);
          if (doc) this.exportDocumentDataFile(doc);
        });
      });

      container.querySelectorAll('.btn-doc-action-export').forEach(btn => {
        btn.addEventListener('click', () => {
          const doc = this.documents.find(d => d.id === btn.dataset.id);
          if (doc) this.downloadJson(doc, `dqd-doc-${doc.id}.json`);
        });
      });

      container.querySelectorAll('.btn-doc-action-delete').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          await this.deleteDocument(btn.dataset.id);
        });
      });
    },

    // ====================================================================
    // 7. VIEW: DOCUMENT EDITOR (CREATE / EDIT)
    // ====================================================================

    renderEditor(container, params = {}) {
      if (params.activeTab) {
        this.currentEditorTab = params.activeTab;
      }
      const activeTab = this.currentEditorTab || 'tab-meta';
      const docProfileKey = (this.currentDoc && this.currentDoc.teamProfile) || this.getActiveProfileKey() || 'data_quality';
      const profile = (this.config && this.config.teamProfiles && this.config.teamProfiles[docProfileKey]) || this.getActiveProfile();
      const profileAttrs = this.getProfileAttributes(docProfileKey);
      const defaultType = (profile.subtypes && profile.subtypes[0] && profile.subtypes[0].name) || "Model Validation";
      const defaultDocType = (profile.documentTypes && profile.documentTypes[0]) || "Data Quality Validation Rules";

      if (!this.currentDoc) {
        // Create new empty document structure
        const now = new Date().toISOString();
        const genId = 'DOC-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + Math.floor(1000 + Math.random() * 9000);
        this.currentDoc = {
          id: genId,
          title: "",
          teamProfile: docProfileKey,
          teamAttributes: {},
          validationType: defaultType,
          team: profile.name,
          usernames: [],
          dynamicInputs: [],
          validatedModels: [],
          validatedTables: [],
          screenshots: [],
          documentType: defaultDocType,
          businessDomain: "",
          owner: "",
          reviewer: "",
          status: "Draft",
          priority: "Medium",
          executionFrequency: "Daily",
          version: "1.0",
          createdAt: now,
          updatedAt: now,
          executiveSummary: "",
          businessObjective: "",
          dataSource: {
            system: "",
            catalog: "",
            schema: "",
            tables: [],
            domain: "",
            dataOwner: "",
            technicalOwner: "",
            dependencies: "",
            mappings: []
          },
          sqlDialect: "Trino",
          sqlQuery: "",
          sqlNotes: "",
          sqlQueries: [
            {
              id: "Q-1",
              title: "Primary Trino Validation Query",
              dialect: "Trino",
              query: "",
              notes: ""
            }
          ],
          expectedResult: "",
          actualResult: "",
          threshold: "0",
          remediation: "",
          rules: [],
          executions: [],
          issues: [],
          approvals: [],
          versionHistory: [
            {
              version: "1.0",
              createdAt: now,
              author: "",
              summary: "Initial Document Creation"
            }
          ]
        };

        // If template was selected
        if (params.template) {
          this.applyTemplateToDoc(params.template);
        }
      } else if (this.currentDoc && this.currentDoc.id && !this.currentDoc._originalId) {
        this.currentDoc._originalId = this.currentDoc.id;
      }

      if (this.currentDoc) {
        if (!this.currentDoc.teamProfile) this.currentDoc.teamProfile = docProfileKey;
        if (!this.currentDoc.teamAttributes || typeof this.currentDoc.teamAttributes !== 'object') {
          this.currentDoc.teamAttributes = {};
        }
        if (!this.currentDoc.validationType) this.currentDoc.validationType = defaultType;
        if (this.currentDoc.team === undefined) this.currentDoc.team = "";
        if (!Array.isArray(this.currentDoc.usernames)) {
          this.currentDoc.usernames = this.currentDoc.owner ? [this.currentDoc.owner] : [];
        }
        if (!Array.isArray(this.currentDoc.dynamicInputs)) this.currentDoc.dynamicInputs = [];
        if (!Array.isArray(this.currentDoc.validatedModels)) this.currentDoc.validatedModels = [];
        if (!Array.isArray(this.currentDoc.validatedTables)) this.currentDoc.validatedTables = [];
        if (!Array.isArray(this.currentDoc.screenshots)) this.currentDoc.screenshots = [];
        if (!this.currentDoc.sqlQueries || !Array.isArray(this.currentDoc.sqlQueries) || this.currentDoc.sqlQueries.length === 0) {
          this.currentDoc.sqlQueries = [
            {
              id: "Q-1",
              title: "Primary Trino Validation Query",
              dialect: this.currentDoc.sqlDialect || "Trino",
              query: this.currentDoc.sqlQuery || "",
              notes: this.currentDoc.sqlNotes || ""
            }
          ];
        }
      }

      const doc = this.currentDoc;
      const docUser = this.getUserInfo(doc);

      // Status mode check
      const missingRequired = this.getMissingRequiredFields(doc);
      const isMissingFields = missingRequired.length > 0;

      container.innerHTML = `
        <!-- Action Header Bar -->
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; background: var(--surface-color); padding: 14px 20px; border-radius: var(--border-radius-md); border: 1px solid var(--surface-border); box-shadow: var(--shadow-sm); flex-wrap: wrap; gap: 12px;">
          <div style="display: flex; align-items: center; gap: 14px; flex-wrap: wrap;">
            <div class="inline-doc-id-box" title="Click to edit Document ID inline (e.g. DOC-20261011-7927)">
              <label for="doc-input-id" style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: var(--text-muted); margin: 0; user-select: none;">DOC ID:</label>
              <input type="text" id="doc-input-id" value="${this.escapeHtml(doc.id || '')}" 
                placeholder="DOC-YYYYMMDD-XXXX" 
                title="Click to inline edit Document Name / ID (e.g. DOC-20261011-7927)"
                spellcheck="false" autocomplete="off">
              <span style="font-size: 12px; opacity: 0.7; pointer-events: none; margin-left: 2px;" title="Inline editable">✏️</span>
            </div>
            <span class="badge ${doc.status === 'Approved' ? 'badge-passed' : 'badge-status-draft'}">${doc.status}</span>
            <span style="font-size: 12px; color: var(--text-muted);">Version ${doc.version}</span>
          </div>
          <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
            <button class="btn btn-outline btn-sm" id="editor-btn-cancel">Discard / Back</button>
            <button class="btn btn-outline btn-sm" id="editor-btn-share-markdown" title="Export formatted Slack / Microsoft Teams / Email Markdown">💬 Share</button>
            <button class="btn btn-outline btn-sm" id="editor-btn-clone">📑 Clone</button>
            <button class="btn btn-outline btn-sm" id="editor-btn-snapshot">📌 New Version</button>
            <button class="btn btn-outline btn-sm" id="editor-btn-export-dqdoc" title="Download complete portable .dqdoc file with all embedded screenshots">📦 Export .dqdoc</button>
            <button class="btn btn-secondary btn-sm" id="editor-btn-pdf-only" ${doc.status === 'Final' && isMissingFields ? 'disabled title="Cannot generate final PDF while required fields are missing"' : ''} title="Generate and download official PDF Report only (without .dqdoc file)">📄 Generate PDF (Only)</button>
            <button class="btn btn-outline btn-sm" id="editor-btn-pdf" ${doc.status === 'Final' && isMissingFields ? 'disabled title="Cannot generate final PDF while required fields are missing"' : ''} title="Generate both PDF Report and .dqdoc data file">📦 Both (PDF + .dqdoc)</button>
            ${(this.documents.some(d => d.id === doc.id) || doc._originalId) ? `<button class="btn btn-danger btn-sm" id="editor-btn-delete" title="Permanently delete this document">🗑️ Delete</button>` : ''}
            <button class="btn btn-primary btn-sm" id="editor-btn-save">💾 Save Document (Ctrl+S)</button>
          </div>
        </div>

        ${isMissingFields ? `
          <div class="alert-banner alert-warning">
            <span style="font-size: 18px;">⚠️</span>
            <div>
              <strong>Missing Required Fields (${missingRequired.length}):</strong> ${missingRequired.join(', ')}.<br>
              <span style="font-size: 11px;">Draft mode allows saving incomplete records. Final publication requires all mandatory fields.</span>
            </div>
          </div>
        ` : ''}

        <!-- Tabs Header -->
        <div class="tabs-header">
          <button class="tab-btn ${activeTab === 'tab-meta' ? 'active' : ''}" data-tab="tab-meta">1. Overview & Metadata</button>
          <button class="tab-btn ${activeTab === 'tab-sources' ? 'active' : ''}" data-tab="tab-sources">2. Data Sources & Mappings</button>
          <button class="tab-btn ${activeTab === 'tab-rules' ? 'active' : ''}" data-tab="tab-rules">${docProfileKey === 'data_analysis' ? '3. Metrics & Dimensions' : docProfileKey === 'data_engineering' ? '3. Pipeline Rules & SLAs' : docProfileKey === 'data_modelling' ? '3. Entities & Attributes' : '3. Validation Rules'}</button>
          <button class="tab-btn ${activeTab === 'tab-sql' ? 'active' : ''}" data-tab="tab-sql">${docProfileKey === 'data_analysis' ? '4. Analytical Queries' : docProfileKey === 'data_engineering' ? '4. Transformation SQL' : docProfileKey === 'data_modelling' ? '4. DDL & Schema Queries' : '4. SQL Query & Workbench'}</button>
          <button class="tab-btn ${activeTab === 'tab-screenshots' ? 'active' : ''}" data-tab="tab-screenshots">5. Screenshots & Evidence <span class="badge badge-info" id="badge-tab-ss-count">${(doc.screenshots || []).length}</span></button>
          <button class="tab-btn ${activeTab === 'tab-executions' ? 'active' : ''}" data-tab="tab-executions">${docProfileKey === 'data_analysis' ? '6. Query Runs & Metric Results' : docProfileKey === 'data_engineering' ? '6. Pipeline Runs & Performance' : docProfileKey === 'data_modelling' ? '6. Schema Validations & Runs' : '6. Executions & Results'}</button>
          <button class="tab-btn ${activeTab === 'tab-issues' ? 'active' : ''}" data-tab="tab-issues">${docProfileKey === 'data_analysis' ? '7. Insights & Action Items' : docProfileKey === 'data_engineering' ? '7. Incidents & Runbooks' : docProfileKey === 'data_modelling' ? '7. Schema Drift & Issues' : '7. Remediation & Issues'}</button>
          <button class="tab-btn ${activeTab === 'tab-governance' ? 'active' : ''}" data-tab="tab-governance">8. Versions & Approvals</button>
        </div>

        <!-- TAB 1: METADATA -->
        <div class="tab-pane ${activeTab === 'tab-meta' ? 'active' : ''}" id="tab-meta">
          <div class="card">
            <div class="card-header" style="justify-content: space-between;">
              <span class="card-title">Document Specification & Metadata</span>
              <span class="badge badge-info" id="badge-doc-active-type">${this.escapeHtml(doc.validationType || 'Model Validation')}</span>
            </div>
            <div class="card-body">
              <!-- 0. Discipline Workspace / Team Profile Selector -->
              <div class="form-group" style="margin-bottom: 20px; padding: 12px 14px; background: var(--surface-alt); border-radius: var(--border-radius-sm); border: 1px solid var(--surface-border);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                  <label for="doc-input-team-profile" class="form-label required" style="font-size: 13px; font-weight: 700; margin: 0; color: var(--primary-color);">
                    🎯 Document Discipline Workspace (${this.escapeHtml(profile.label || profile.name)})
                  </label>
                  <span class="badge badge-info" style="font-size: 11px;">Active: ${this.escapeHtml(profile.editionTag || profile.name)}</span>
                </div>
                <select id="doc-input-team-profile" class="form-control" style="font-weight: 600;">
                  ${Object.keys((this.config && this.config.teamProfiles) || {}).map(k => {
                    const p = this.config.teamProfiles[k];
                    return `<option value="${k}" ${k === docProfileKey ? 'selected' : ''}>${this.escapeHtml(p.label || p.name)} (${this.escapeHtml(p.editionTag || p.roleTitle)})</option>`;
                  }).join('')}
                </select>
                <div class="form-text">Switching the discipline adapts specification types, recommended inputs, and technical specification attributes.</div>
              </div>

              <!-- 1. Primary Specification Subtype Selector -->
              <div class="form-group" style="margin-bottom: 20px;">
                <label class="form-label required" style="font-size: 13px; font-weight: 700;">Select Specification Type (${this.escapeHtml(profile.label || 'Team Profile')})</label>
                <div class="val-type-grid">
                  ${(profile.subtypes || []).map(st => `
                    <div class="val-type-card ${doc.validationType === st.name || doc.validationType === st.id ? 'active' : ''}" data-type="${this.escapeHtml(st.name)}">
                      <span class="val-type-icon">${st.icon || '📄'}</span>
                      <span class="val-type-title">${this.escapeHtml(st.name)}</span>
                      <span class="val-type-desc">${this.escapeHtml(st.desc || '')}</span>
                    </div>
                  `).join('')}
                </div>
              </div>

              <!-- Team & Multi-User Attribution -->
              <div class="grid-cols-2" style="margin-bottom: 16px;">
                <div class="form-group">
                  <label class="form-label required">Related Team / Squad</label>
                  <input type="text" id="doc-input-team" class="form-control" list="dl-teams" value="${this.escapeHtml(doc.team || profile.name || '')}" placeholder="e.g. Analytics Engineering, Finance BI, Risk Team">
                  <div class="form-text">Team or squad responsible for this specification.</div>
                </div>
                <div class="form-group">
                  <label class="form-label required">Document Usernames (Multi-User Assignment)</label>
                  <div class="user-chips-container" id="doc-user-chips-box">
                    ${(doc.usernames || []).map(u => `
                      <span class="user-chip">
                        <span>${this.escapeHtml(u)}</span>
                        <button type="button" class="user-chip-remove" data-user="${this.escapeHtml(u)}">&times;</button>
                      </span>
                    `).join('')}
                    <input type="text" class="user-chips-input" id="doc-input-new-user" list="dl-usernames" placeholder="Type username & hit Enter/comma...">
                    <button type="button" class="btn btn-outline btn-sm" id="btn-add-doc-user" style="padding: 2px 8px; font-size: 11px;">+ Add</button>
                  </div>
                  <div class="form-text">Add multiple owners, authors, or assignees. Type username and press Enter.</div>
                </div>
              </div>

              <!-- Discipline Technical Specification Attributes Card -->
              <div class="card" style="margin-bottom: 20px; border: 1px solid var(--surface-border-strong); box-shadow: var(--shadow-sm);">
                <div class="card-header" style="background: var(--surface-alt); padding: 10px 16px; justify-content: space-between;">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 16px;">🛠️</span>
                    <span class="card-title" style="font-size: 13px; font-weight: 700; color: var(--primary-color);">
                      ${this.escapeHtml(profile.label)} - Technical Specification Attributes
                    </span>
                  </div>
                  <span class="badge badge-info" style="font-size: 11px;">${profileAttrs.length} Attributes</span>
                </div>
                <div class="card-body" style="padding: 14px;">
                  <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 12px;">
                    Technical attributes specific to <strong>${this.escapeHtml(profile.label)}</strong>. Saved to this document, bundled into .dqdoc file, and printed in Section 2 of PDF reports.
                  </div>
                  <div class="grid-cols-2" style="gap: 12px;">
                    ${profileAttrs.map(attr => {
                      const val = (doc.teamAttributes && doc.teamAttributes[attr.key] !== undefined) ? doc.teamAttributes[attr.key] : '';
                      if (attr.type === 'textarea') {
                        return `
                          <div class="form-group" style="grid-column: 1 / -1;">
                            <label class="form-label" style="font-weight: 600; font-size: 11.5px; color: var(--text-color);">${this.escapeHtml(attr.label)}</label>
                            <textarea class="form-control form-control-sm team-profile-attr-input" data-attr-key="${attr.key}" rows="${attr.rows || 2}" placeholder="${this.escapeHtml(attr.placeholder || '')}">${this.escapeHtml(val)}</textarea>
                          </div>
                        `;
                      }
                      return `
                        <div class="form-group">
                          <label class="form-label" style="font-weight: 600; font-size: 11.5px; color: var(--text-color);">${this.escapeHtml(attr.label)}</label>
                          <input type="text" class="form-control form-control-sm team-profile-attr-input" data-attr-key="${attr.key}" value="${this.escapeHtml(val)}" placeholder="${this.escapeHtml(attr.placeholder || '')}">
                        </div>
                      `;
                    }).join('')}
                  </div>
                </div>
              </div>

              <!-- Dynamic Validation Inputs Section -->
              <div class="dynamic-fields-section">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; flex-wrap: wrap; gap: 8px;">
                  <div>
                    <strong style="font-size: 13px; color: var(--primary-color);">Dynamic Inputs for <span id="lbl-dyn-val-type">${this.escapeHtml(doc.validationType || 'Specification')}</span></strong>
                    <div style="font-size: 11px; color: var(--text-muted);">Recommended attributes tailored for ${this.escapeHtml(profile.label)}</div>
                  </div>
                </div>

                <!-- Suggested Quick-Add Pills based on active type -->
                <div style="margin-bottom: 12px;" id="suggested-pills-container">
                  <span style="font-size: 11px; font-weight: 700; color: var(--text-muted); margin-right: 6px;">RECOMMENDED INPUTS:</span>
                  ${this.getSuggestedInputsForType(doc.validationType || (profile.subtypes && profile.subtypes[0] && profile.subtypes[0].name) || 'Specification').map(s => `
                    <button type="button" class="dynamic-field-pill btn-quick-add-field" data-name="${this.escapeHtml(s)}">+ ${this.escapeHtml(s)}</button>
                  `).join('')}
                </div>

                <!-- Search & Add Bar -->
                <div style="display: flex; gap: 8px; margin-bottom: 14px;">
                  <input type="text" id="txt-search-add-field" class="form-control form-control-sm" placeholder="🔍 Search or type any custom field name to add (e.g. Warehouse Cluster, SLA, Grain)...">
                  <button type="button" class="btn btn-secondary btn-sm" id="btn-add-dynamic-field">➕ Add Input Field</button>
                </div>

                <!-- Container of Active Dynamic Fields -->
                <div id="container-dynamic-fields">
                  ${(doc.dynamicInputs || []).map((f, fIdx) => `
                    <div class="dynamic-field-card" data-id="${f.id || `f-${fIdx}`}">
                      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                        <strong class="dynamic-field-label" style="font-size: 12px; color: var(--text-color);">${this.escapeHtml(f.label || 'Field')}</strong>
                        <button type="button" class="btn btn-outline btn-sm btn-remove-dynamic-field" data-id="${f.id || `f-${fIdx}`}" style="color: #ef4444; padding: 1px 6px; font-size: 11px;" title="Remove field">&times;</button>
                      </div>
                      <input type="text" class="form-control form-control-sm dynamic-field-input" value="${this.escapeHtml(f.value || '')}" placeholder="Enter ${this.escapeHtml(f.label)}...">
                    </div>
                  `).join('')}
                  ${(!doc.dynamicInputs || doc.dynamicInputs.length === 0) ? `
                    <div id="empty-dynamic-fields-note" style="font-size: 12px; color: var(--text-muted); font-style: italic; text-align: center; padding: 10px;">No dynamic inputs added yet. Click any recommended input above or type a custom field name to add.</div>
                  ` : ''}
                </div>
              </div>

              <!-- Composite Multi-Validation: Models Section -->
              <div id="section-validated-models" style="${(doc.validationType === 'Model Validation' || doc.validationType === 'Model and Table Validation') ? '' : 'display: none;'} margin-bottom: 20px;">
                <div class="card" style="border: 1px solid var(--surface-border-strong);">
                  <div class="card-header" style="background: var(--surface-alt); padding: 10px 16px;">
                    <span class="card-title" style="font-size: 13px;">🧩 Validated Models (${(doc.validatedModels || []).length})</span>
                    <button type="button" class="btn btn-outline btn-sm" id="btn-add-validated-model">➕ Add Validated Model</button>
                  </div>
                  <div class="card-body" id="container-validated-models" style="padding: 12px;">
                    ${(doc.validatedModels || []).map((m, mIdx) => `
                      <div class="card val-model-card" data-idx="${mIdx}" style="margin-bottom: 10px; padding: 12px; border: 1px solid var(--surface-border);">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                          <strong>Model #${mIdx + 1}</strong>
                          <button type="button" class="btn btn-outline btn-sm btn-delete-val-model" data-idx="${mIdx}" style="color: #ef4444; padding: 1px 6px;">&times; Remove</button>
                        </div>
                        <div class="grid-cols-3">
                          <div>
                            <label class="form-label" style="font-size: 11px;">Model Name</label>
                            <input type="text" class="form-control form-control-sm val-model-name" value="${this.escapeHtml(m.modelName || '')}" placeholder="e.g. stg_orders / fct_monthly_sales">
                          </div>
                          <div>
                            <label class="form-label" style="font-size: 11px;">Primary Key / Grain</label>
                            <input type="text" class="form-control form-control-sm val-model-grain" value="${this.escapeHtml(m.grain || '')}" placeholder="e.g. order_id, line_item_id">
                          </div>
                          <div>
                            <label class="form-label" style="font-size: 11px;">Materialization</label>
                            <select class="form-control form-control-sm val-model-mat">
                              <option value="Table" ${m.materialization === 'Table' ? 'selected' : ''}>Table</option>
                              <option value="View" ${m.materialization === 'View' ? 'selected' : ''}>View</option>
                              <option value="Incremental" ${m.materialization === 'Incremental' ? 'selected' : ''}>Incremental</option>
                              <option value="Ephemeral" ${m.materialization === 'Ephemeral' ? 'selected' : ''}>Ephemeral</option>
                            </select>
                          </div>
                        </div>
                        <div style="margin-top: 8px;">
                          <label class="form-label" style="font-size: 11px;">Lineage & Upstream Sources</label>
                          <input type="text" class="form-control form-control-sm val-model-sources" value="${this.escapeHtml(m.upstreamSources || '')}" placeholder="e.g. source('raw', 'orders'), ref('stg_customers')">
                        </div>
                      </div>
                    `).join('')}
                    ${(!doc.validatedModels || doc.validatedModels.length === 0) ? `
                      <div style="font-size: 12px; color: var(--text-muted); font-style: italic; text-align: center; padding: 10px;">No multiple models added yet. Click "+ Add Validated Model" to audit multiple models in this single document.</div>
                    ` : ''}
                  </div>
                </div>
              </div>

              <!-- Composite Multi-Validation: Tables Section -->
              <div id="section-validated-tables" style="${(doc.validationType === 'Table Validation' || doc.validationType === 'Model and Table Validation') ? '' : 'display: none;'} margin-bottom: 20px;">
                <div class="card" style="border: 1px solid var(--surface-border-strong);">
                  <div class="card-header" style="background: var(--surface-alt); padding: 10px 16px;">
                    <span class="card-title" style="font-size: 13px;">🗄️ Validated Physical Tables (${(doc.validatedTables || []).length})</span>
                    <button type="button" class="btn btn-outline btn-sm" id="btn-add-validated-table">➕ Add Validated Table</button>
                  </div>
                  <div class="card-body" id="container-validated-tables" style="padding: 12px;">
                    ${(doc.validatedTables || []).map((t, tIdx) => `
                      <div class="card val-table-card" data-idx="${tIdx}" style="margin-bottom: 10px; padding: 12px; border: 1px solid var(--surface-border);">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                          <strong>Physical Table #${tIdx + 1}</strong>
                          <button type="button" class="btn btn-outline btn-sm btn-delete-val-table" data-idx="${tIdx}" style="color: #ef4444; padding: 1px 6px;">&times; Remove</button>
                        </div>
                        <div class="grid-cols-3">
                          <div>
                            <label class="form-label" style="font-size: 11px;">Table / View Name</label>
                            <input type="text" class="form-control form-control-sm val-table-name" value="${this.escapeHtml(t.tableName || '')}" placeholder="e.g. prod_dwh.fact_transactions">
                          </div>
                          <div>
                            <label class="form-label" style="font-size: 11px;">Catalog & Schema</label>
                            <input type="text" class="form-control form-control-sm val-table-schema" value="${this.escapeHtml(t.schema || '')}" placeholder="e.g. iceberg_prod.finance">
                          </div>
                          <div>
                            <label class="form-label" style="font-size: 11px;">Storage Format</label>
                            <select class="form-control form-control-sm val-table-format">
                              <option value="Parquet" ${t.storageFormat === 'Parquet' ? 'selected' : ''}>Parquet</option>
                              <option value="Iceberg" ${t.storageFormat === 'Iceberg' ? 'selected' : ''}>Iceberg</option>
                              <option value="Delta Lake" ${t.storageFormat === 'Delta Lake' ? 'selected' : ''}>Delta Lake</option>
                              <option value="ORC" ${t.storageFormat === 'ORC' ? 'selected' : ''}>ORC</option>
                              <option value="CSV / Text" ${t.storageFormat === 'CSV / Text' ? 'selected' : ''}>CSV / Text</option>
                            </select>
                          </div>
                        </div>
                        <div class="grid-cols-2" style="margin-top: 8px;">
                          <div>
                            <label class="form-label" style="font-size: 11px;">Partitioning & Cluster Keys</label>
                            <input type="text" class="form-control form-control-sm val-table-partitions" value="${this.escapeHtml(t.partitionKeys || '')}" placeholder="e.g. partition by day(event_date), cluster by country">
                          </div>
                          <div>
                            <label class="form-label" style="font-size: 11px;">Volume / Row Count</label>
                            <input type="text" class="form-control form-control-sm val-table-volume" value="${this.escapeHtml(t.volume || '')}" placeholder="e.g. ~45,000,000 rows (daily +200k)">
                          </div>
                        </div>
                      </div>
                    `).join('')}
                    ${(!doc.validatedTables || doc.validatedTables.length === 0) ? `
                      <div style="font-size: 12px; color: var(--text-muted); font-style: italic; text-align: center; padding: 10px;">No multiple tables added yet. Click "+ Add Validated Table" to validate multiple tables in this document.</div>
                    ` : ''}
                  </div>
                </div>
              </div>

              <div class="grid-cols-3">
                <div class="form-group">
                  <label class="form-label required">Document ID / Code</label>
                  <input type="text" id="doc-input-id-meta" class="form-control" style="font-family: 'Consolas', 'Courier New', monospace; font-weight: 700;" value="${this.escapeHtml(doc.id || '')}" placeholder="e.g. DOC-20261011-7927" spellcheck="false" autocomplete="off">
                  <div class="form-text">Unique tracking ID (synced with header).</div>
                </div>
                <div class="form-group">
                  <label class="form-label required">Document Title</label>
                  <input type="text" id="doc-input-title" class="form-control" value="${this.escapeHtml(doc.title || '')}" placeholder="e.g. ${this.escapeHtml(profile.label || 'Data')} Specification">
                </div>
                <div class="form-group">
                  <label class="form-label required">Document Type</label>
                  <select id="doc-input-type" class="form-control">
                    ${(profile.documentTypes || [
                      "Data Quality Validation Rules",
                      "Data Quality Assessment",
                      "Technical Documentation"
                    ]).map(dt => `
                      <option value="${this.escapeHtml(dt)}" ${doc.documentType === dt ? 'selected' : ''}>${this.escapeHtml(dt)}</option>
                    `).join('')}
                    ${(!profile.documentTypes?.includes(doc.documentType) && doc.documentType) ? `
                      <option value="${this.escapeHtml(doc.documentType)}" selected>${this.escapeHtml(doc.documentType)}</option>
                    ` : ''}
                  </select>
                </div>
              </div>

              <div class="grid-cols-3">
                <div class="form-group">
                  <label class="form-label">Business Domain</label>
                  <input type="text" id="doc-input-domain" class="form-control" list="dl-domains" value="${this.escapeHtml(doc.businessDomain || '')}" placeholder="e.g. Finance, Customer, Supply Chain">
                </div>
                <div class="form-group">
                  <label class="form-label">Author / Data Owner</label>
                  <input type="text" id="doc-input-owner" class="form-control" list="dl-owners" value="${this.escapeHtml(doc.owner || '')}" placeholder="e.g. Sarah Jenkins">
                </div>
                <div class="form-group">
                  <label class="form-label">Assigned Reviewer</label>
                  <input type="text" id="doc-input-reviewer" class="form-control" list="dl-reviewers" value="${this.escapeHtml(doc.reviewer || '')}" placeholder="e.g. David Kim">
                </div>
              </div>

              <div class="grid-cols-3">
                <div class="form-group">
                  <label class="form-label">Governance Status</label>
                  <select id="doc-input-status" class="form-control">
                    <option value="Draft" ${doc.status === 'Draft' ? 'selected' : ''}>Draft</option>
                    <option value="In Review" ${doc.status === 'In Review' ? 'selected' : ''}>In Review</option>
                    <option value="Changes Requested" ${doc.status === 'Changes Requested' ? 'selected' : ''}>Changes Requested</option>
                    <option value="Approved" ${doc.status === 'Approved' ? 'selected' : ''}>Approved</option>
                    <option value="Rejected" ${doc.status === 'Rejected' ? 'selected' : ''}>Rejected</option>
                    <option value="Archived" ${doc.status === 'Archived' ? 'selected' : ''}>Archived</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Priority</label>
                  <select id="doc-input-priority" class="form-control">
                    <option value="Critical" ${doc.priority === 'Critical' ? 'selected' : ''}>Critical</option>
                    <option value="High" ${doc.priority === 'High' ? 'selected' : ''}>High</option>
                    <option value="Medium" ${doc.priority === 'Medium' ? 'selected' : ''}>Medium</option>
                    <option value="Low" ${doc.priority === 'Low' ? 'selected' : ''}>Low</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Execution Frequency</label>
                  <input type="text" id="doc-input-frequency" class="form-control" list="dl-frequencies" value="${this.escapeHtml(doc.executionFrequency || '')}" placeholder="e.g. Daily at 04:00 UTC">
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Executive Summary</label>
                <textarea id="doc-input-summary" class="form-control" rows="3" placeholder="Brief summary describing the scope and intent of this quality document...">${this.escapeHtml(doc.executiveSummary || '')}</textarea>
              </div>

              <div class="form-group">
                <label class="form-label">Business Objective</label>
                <textarea id="doc-input-objective" class="form-control" rows="2" placeholder="Why is this data quality check critical for business operations and compliance?">${this.escapeHtml(doc.businessObjective || '')}</textarea>
              </div>

              <!-- Author Sign-Off & Contact Details (Optional: null or string value) -->
              <div style="margin-top: 18px; padding-top: 14px; border-top: 1px dashed var(--surface-border-strong);">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; flex-wrap: wrap; gap: 8px;">
                  <span style="font-size: 13px; font-weight: 700; color: var(--primary-color);">👤 Document Author & Contact Info (Optional)</span>
                  <span style="font-size: 11px; color: var(--text-muted);">Can be blank/null. If populated, displayed at the end of generated PDF documents & saved in .dqdoc files.</span>
                </div>
                <div class="grid-cols-3">
                  <div class="form-group" style="margin-bottom: 0;">
                    <label class="form-label" style="font-size: 11px;">Author Username / Name</label>
                    <input type="text" id="doc-input-username" class="form-control form-control-sm" value="${this.escapeHtml(docUser.username || '')}" placeholder="e.g. jdoe or Jane Doe">
                  </div>
                  <div class="form-group" style="margin-bottom: 0;">
                    <label class="form-label" style="font-size: 11px;">Author Email</label>
                    <input type="email" id="doc-input-useremail" class="form-control form-control-sm" value="${this.escapeHtml(docUser.useremail || '')}" placeholder="e.g. jane.doe@company.com">
                  </div>
                  <div class="form-group" style="margin-bottom: 0;">
                    <label class="form-label" style="font-size: 11px;">Author Phone</label>
                    <input type="tel" id="doc-input-userphone" class="form-control form-control-sm" value="${this.escapeHtml(docUser.userphone || '')}" placeholder="e.g. +1 (555) 019-2834">
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- TAB 2: DATA SOURCES & MAPPINGS -->
        <div class="tab-pane ${activeTab === 'tab-sources' ? 'active' : ''}" id="tab-sources">
          <div class="card">
            <div class="card-header"><span class="card-title">Data Source Specification</span></div>
            <div class="card-body">
              <div class="grid-cols-3">
                <div class="form-group">
                  <label class="form-label required">Source System</label>
                  <input type="text" id="doc-input-src-system" class="form-control" list="dl-systems" value="${this.escapeHtml(doc.dataSource?.system || '')}" placeholder="e.g. Snowflake EDW / Salesforce CRM">
                </div>
                <div class="form-group">
                  <label class="form-label">Database / Catalog</label>
                  <input type="text" id="doc-input-src-catalog" class="form-control" list="dl-catalogs" value="${this.escapeHtml(doc.dataSource?.catalog || '')}" placeholder="e.g. EDW_PROD">
                </div>
                <div class="form-group">
                  <label class="form-label">Schema</label>
                  <input type="text" id="doc-input-src-schema" class="form-control" list="dl-schemas" value="${this.escapeHtml(doc.dataSource?.schema || '')}" placeholder="e.g. CUSTOMER">
                </div>
              </div>

              <div class="grid-cols-2">
                <div class="form-group">
                  <label class="form-label required">Target Tables / Views</label>
                  <input type="text" id="doc-input-src-tables" class="form-control" list="dl-tables" value="${this.escapeHtml((doc.dataSource?.tables || []).join(', '))}" placeholder="e.g. DIM_CUSTOMER, FACT_EVENTS (comma separated)">
                </div>
                <div class="form-group">
                  <label class="form-label">Pipeline Dependencies</label>
                  <input type="text" id="doc-input-src-dependencies" class="form-control" value="${this.escapeHtml(doc.dataSource?.dependencies || '')}" placeholder="e.g. Airflow DAG: etl_customer_sync">
                </div>
              </div>
            </div>
          </div>

          <!-- Mappings Table -->
          <div class="card">
            <div class="card-header" style="flex-wrap: wrap; gap: 8px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span class="card-title">Source-to-Target Column Mappings</span>
                <span style="font-size: 12px; color: var(--text-muted);" id="mappings-row-count-badge">(${(doc.dataSource?.mappings || []).length} mapped)</span>
              </div>
              <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                <button class="btn btn-outline btn-sm" id="btn-show-mapping-structure" title="View expected format structure & download sample templates">📋 Expected Structure</button>
                <button class="btn btn-primary btn-sm" id="btn-quick-paste-columns" title="Paste columns separated by commas, pipes, spaces, or tabs">📋 Quick Paste Columns</button>
                <button class="btn btn-outline btn-sm" id="btn-import-mappings" title="Upload JSON, Excel (.xlsx/.xls) or CSV">📥 Upload JSON / Excel</button>
                <button class="btn btn-outline btn-sm" id="btn-export-mappings-xlsx" title="Export current mappings to Excel">📊 Export Excel</button>
                <button class="btn btn-primary btn-sm" id="btn-add-mapping-row">➕ Add Row</button>
              </div>
            </div>
            <div style="background: var(--surface-alt); padding: 8px 16px; border-bottom: 1px solid var(--surface-border); display: flex; align-items: center; justify-content: space-between; font-size: 12px; color: var(--text-muted); flex-wrap: wrap; gap: 8px;">
              <div>
                💡 Bulk import column mappings via <strong>JSON</strong> or <strong>Excel</strong> (<code>.xlsx</code> / <code>.csv</code>). Required headers: <code>Source Column</code>, <code>Target Column</code>, <code>Data Type</code>, <code>Transformation Logic</code>, <code>Nullable?</code>, <code>Description</code>.
              </div>
              <a href="javascript:void(0)" id="link-show-structure-inline" style="color: var(--secondary-color); font-weight: 600; text-decoration: underline;">View Structure & Download Templates</a>
            </div>
            <div style="padding: 10px 16px 0 16px;">
                <div class="quick-types-bar" id="quick-types-bar">
                  <span style="font-size: 11px; font-weight: 700; color: var(--text-muted); margin-right: 4px;">⚡ Quick Trino Types:</span>
                  <button type="button" class="btn-type-pill" data-type="VARCHAR(255)">VARCHAR</button>
                  <button type="button" class="btn-type-pill" data-type="BIGINT">BIGINT</button>
                  <button type="button" class="btn-type-pill" data-type="INTEGER">INTEGER</button>
                  <button type="button" class="btn-type-pill" data-type="DECIMAL(18,2)">DECIMAL(18,2)</button>
                  <button type="button" class="btn-type-pill" data-type="TIMESTAMP(6) WITH TIME ZONE">TIMESTAMP_TZ</button>
                  <button type="button" class="btn-type-pill" data-type="DATE">DATE</button>
                  <button type="button" class="btn-type-pill" data-type="BOOLEAN">BOOLEAN</button>
                  <button type="button" class="btn-type-pill" data-type="JSON">JSON</button>
                  <button type="button" class="btn-type-pill" data-type="ARRAY(VARCHAR)">ARRAY</button>
                </div>
              </div>
              <div class="card-body" style="padding: 0;">
                <table class="table-custom" id="table-source-mappings">
                <thead>
                  <tr>
                    <th>Source Column</th>
                    <th>Target Column</th>
                    <th>Data Type</th>
                    <th>Transformation Logic</th>
                    <th>Nullable?</th>
                    <th>Description</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody id="tbody-source-mappings">
                  ${(doc.dataSource?.mappings || []).map((m, idx) => `
                    <tr>
                      <td><input type="text" class="form-control form-control-sm map-src-col" value="${this.escapeHtml(m.sourceCol || '')}"></td>
                      <td><input type="text" class="form-control form-control-sm map-tgt-col" value="${this.escapeHtml(m.targetCol || '')}"></td>
                      <td><input type="text" class="form-control form-control-sm map-data-type" list="dl-data-types" value="${this.escapeHtml(m.dataType || '')}"></td>
                      <td><input type="text" class="form-control form-control-sm map-rule" list="dl-transform-rules" value="${this.escapeHtml(m.rule || '')}"></td>
                      <td>
                        <select class="form-control form-control-sm map-nullable">
                          <option value="NO" ${m.nullable === 'NO' ? 'selected' : ''}>NO</option>
                          <option value="YES" ${m.nullable === 'YES' ? 'selected' : ''}>YES</option>
                        </select>
                      </td>
                      <td><input type="text" class="form-control form-control-sm map-desc" value="${this.escapeHtml(m.description || '')}"></td>
                      <td><button class="btn btn-outline btn-sm btn-delete-mapping-row" style="color: red;">&times;</button></td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- TAB 3: VALIDATION RULES -->
        <div class="tab-pane ${activeTab === 'tab-rules' ? 'active' : ''}" id="tab-rules">
          <div class="card">
            <div class="card-header">
              <span class="card-title">${docProfileKey === 'data_analysis' ? 'Associated Metrics & Analytical Rules' : docProfileKey === 'data_engineering' ? 'Associated Pipeline Rules & SLAs' : docProfileKey === 'data_modelling' ? 'Associated Data Architecture & Entity Rules' : 'Associated Validation Rules'}</span>
              <div style="display: flex; gap: 8px;">
                <button class="btn btn-outline btn-sm" id="btn-doc-pick-rule-catalog">🛡️ Add from Rule Catalog</button>
                <button class="btn btn-primary btn-sm" id="btn-doc-add-custom-rule">➕ Add Custom Rule</button>
              </div>
            </div>
            <div class="card-body" style="padding: 0;">
              <table class="table-custom" id="table-doc-rules">
                <thead>
                  <tr>
                    <th>Rule ID</th>
                    <th>Rule Name</th>
                    <th>Dimension</th>
                    <th>Severity</th>
                    <th>Expected Result</th>
                    <th>Threshold</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody id="tbody-doc-rules">
                  ${(doc.rules || []).length === 0 ? '<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 24px;">No validation rules attached yet.</td></tr>' : (doc.rules || []).map((r, idx) => `
                    <tr>
                      <td><strong>${this.escapeHtml(r.id)}</strong></td>
                      <td>${this.escapeHtml(r.name)}</td>
                      <td><span class="badge badge-info">${this.escapeHtml(r.dimension)}</span></td>
                      <td>${this.getSeverityBadge(r.severity)}</td>
                      <td>${this.escapeHtml(r.expectedResult || '')}</td>
                      <td>${this.escapeHtml(r.threshold || '0')}</td>
                      <td>
                        <button class="btn btn-outline btn-sm btn-doc-delete-rule" data-idx="${idx}">Remove</button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- TAB 4: SQL QUERY & WORKBENCH -->
        <div class="tab-pane ${activeTab === 'tab-sql' ? 'active' : ''}" id="tab-sql">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 10px;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span class="card-title" style="margin: 0; font-size: 16px; font-weight: 700; color: var(--primary-color);">${docProfileKey === 'data_analysis' ? 'Analytical Queries & Business Computations' : docProfileKey === 'data_engineering' ? 'Transformation, Ingestion & Operational SQL' : docProfileKey === 'data_modelling' ? 'DDL, Schema Definitions & Modeling Queries' : 'SQL Assertions & Verification Queries'}</span>
              <span class="badge badge-info" id="badge-sql-query-count">${(doc.sqlQueries || []).length} ${(doc.sqlQueries || []).length === 1 ? 'Query' : 'Queries'}</span>
            </div>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              <button class="btn btn-outline btn-sm" id="btn-copy-all-sql-queries" title="Copy all SQL queries combined into clipboard">📑 Copy All Queries</button>
              <button class="btn btn-primary btn-sm" id="btn-add-new-sql-query" title="Add another SQL query to this document">➕ Add SQL Query</button>
            </div>
          </div>

          <div id="container-sql-query-cards">
            ${this.renderEditorSqlQueriesCardsHtml()}
          </div>

          <div class="grid-cols-2">
            <div class="card">
              <div class="card-header"><span class="card-title">Expected Result & Threshold</span></div>
              <div class="card-body">
                <div class="form-group">
                  <label class="form-label required">Expected Assertion Result</label>
                  <input type="text" id="doc-input-expected-result" class="form-control" list="dl-expected-results" value="${this.escapeHtml(doc.expectedResult || '')}" placeholder="e.g. 0 rows returned (Zero defect records)">
                </div>
                <div class="form-group">
                  <label class="form-label">Acceptable Defect Threshold</label>
                  <input type="text" id="doc-input-threshold" class="form-control" list="dl-thresholds" value="${this.escapeHtml(doc.threshold || '0')}" placeholder="e.g. 0 or < 0.01%">
                </div>
                <div class="form-group">
                  <label class="form-label">Actual Test Result (Latest Execution)</label>
                  <input type="text" id="doc-input-actual-result" class="form-control" value="${this.escapeHtml(doc.actualResult || '')}" placeholder="e.g. 0 defects detected (100% pass)">
                </div>
              </div>
            </div>

            <div class="card">
              <div class="card-header"><span class="card-title">Explanatory Notes & Comments</span></div>
              <div class="card-body">
                <div class="form-group">
                  <label class="form-label">SQL Execution Notes</label>
                  <textarea id="doc-input-sql-notes" class="form-control" rows="3" placeholder="Context on execution filters, index requirements, or runtime constraints...">${this.escapeHtml(doc.sqlNotes || '')}</textarea>
                </div>
                <div class="form-group">
                  <label class="form-label">Remediation Protocol</label>
                  <textarea id="doc-input-remediation" class="form-control" rows="2" placeholder="Actionable steps when this check fails...">${this.escapeHtml(doc.remediation || '')}</textarea>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- TAB 5: SCREENSHOTS & EVIDENCE -->
        <div class="tab-pane ${activeTab === 'tab-screenshots' ? 'active' : ''}" id="tab-screenshots">
          <div class="card">
            <div class="card-header" style="justify-content: space-between;">
              <div>
                <span class="card-title">📸 Screenshot Images & Evidence</span>
                <span style="font-size: 12px; color: var(--text-muted); margin-left: 8px;">Attach terminal execution outputs, query proof, or validation charts with drag-and-drop placement</span>
              </div>
              <span class="badge badge-info" id="badge-tab-ss-count-header">${(doc.screenshots || []).length} Screenshot(s)</span>
            </div>
            <div class="card-body">
              <!-- Dropzone -->
              <div class="screenshot-dropzone" id="ss-dropzone">
                <div style="font-size: 32px; margin-bottom: 8px;">📸</div>
                <div style="font-weight: 700; font-size: 15px; margin-bottom: 4px;">Drag & Drop Screenshot Images Here, or Click to Browse</div>
                <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 12px;">Supports PNG, JPG, JPEG, WebP. You can also press <kbd style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">Ctrl+V</kbd> anywhere in the editor to paste screenshots directly!</div>
                <input type="file" id="ss-file-input" accept="image/*" multiple style="display: none;">
                <button type="button" class="btn btn-primary btn-sm" id="btn-browse-ss">📁 Browse Images</button>
              </div>

              <!-- List of screenshot cards -->
              <div id="container-screenshot-cards">
                ${this.renderScreenshotCardsHtml()}
              </div>
            </div>
          </div>
        </div>

        <!-- TAB 6: EXECUTIONS & RESULTS -->
        <div class="tab-pane ${activeTab === 'tab-executions' ? 'active' : ''}" id="tab-executions">
          <div class="card">
            <div class="card-header">
              <span class="card-title">${docProfileKey === 'data_analysis' ? 'Query Executions & Metric History' : docProfileKey === 'data_engineering' ? 'Pipeline Runs & Execution History' : docProfileKey === 'data_modelling' ? 'Schema Validations & DDL Execution History' : 'Test Execution History'}</span>
              <button class="btn btn-primary btn-sm" id="btn-add-doc-execution">➕ Log Execution Record</button>
            </div>
            <div class="card-body" style="padding: 0;">
              <table class="table-custom">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Env</th>
                    <th>Status</th>
                    <th>Total Records</th>
                    <th>Passed</th>
                    <th>Failed</th>
                    <th>Defect %</th>
                    <th>Evidence / Query ID</th>
                  </tr>
                </thead>
                <tbody id="tbody-doc-executions">
                  ${(doc.executions || []).length === 0 ? '<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 24px;">No executions logged yet.</td></tr>' : (doc.executions || []).map(e => `
                    <tr>
                      <td>${new Date(e.timestamp).toLocaleString()}</td>
                      <td><span class="badge badge-info">${e.environment || 'PROD'}</span></td>
                      <td>${this.getStatusBadge(e.status)}</td>
                      <td>${(e.totalRecords || 0).toLocaleString()}</td>
                      <td style="color: var(--status-passed); font-weight: 600;">${(e.passedRecords || 0).toLocaleString()}</td>
                      <td style="color: ${e.failedRecords > 0 ? 'var(--status-failed)' : 'inherit'}; font-weight: 600;">${(e.failedRecords || 0).toLocaleString()}</td>
                      <td>${e.failurePercentage ? e.failurePercentage + '%' : '0.0%'}</td>
                      <td><span style="font-family: monospace; font-size: 11px;">${this.escapeHtml(e.evidence || 'N/A')}</span></td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- TAB 7: REMEDIATION & ISSUES -->
        <div class="tab-pane ${activeTab === 'tab-issues' ? 'active' : ''}" id="tab-issues">
          <div class="card">
            <div class="card-header">
              <span class="card-title">${docProfileKey === 'data_analysis' ? 'Analytical Insights, Action Items & Issue Triage' : docProfileKey === 'data_engineering' ? 'Pipeline Incidents & Operational Runbooks' : docProfileKey === 'data_modelling' ? 'Schema Drift, Structural Gaps & Model Issues' : 'Linked Data Quality Issues & Corrective Actions'}</span>
              <button class="btn btn-primary btn-sm" id="btn-add-doc-issue">➕ Log Issue / Action</button>
            </div>
            <div class="card-body" style="padding: 0;">
              <table class="table-custom">
                <thead>
                  <tr>
                    <th>Issue ID</th>
                    <th>Title</th>
                    <th>Severity</th>
                    <th>Status</th>
                    <th>Owner</th>
                    <th>Deadline</th>
                    <th>Root Cause</th>
                    <th style="text-align: right; width: 140px;">Actions</th>
                  </tr>
                </thead>
                <tbody id="tbody-doc-issues">
                  ${(doc.issues || []).length === 0 ? '<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 24px;">No linked issues found.</td></tr>' : (doc.issues || []).map(iss => `
                    <tr>
                      <td><strong>${iss.id}</strong></td>
                      <td>${this.escapeHtml(iss.title)}</td>
                      <td>${this.getSeverityBadge(iss.severity)}</td>
                      <td>${this.getStatusBadge(iss.status)}</td>
                      <td>${this.escapeHtml(iss.owner || 'Unassigned')}</td>
                      <td>${iss.deadline || 'N/A'}</td>
                      <td>${this.escapeHtml(iss.rootCause || 'N/A')}</td>
                      <td style="text-align: right; white-space: nowrap;">
                        <div style="display: flex; gap: 6px; justify-content: flex-end;">
                          <button type="button" class="btn btn-outline btn-sm btn-edit-doc-issue" onclick="window.DQD_App.showEditIssueModalById('${this.escapeHtml(iss.id)}'); event.stopPropagation();" data-id="${this.escapeHtml(iss.id)}" title="Edit Issue">
                            <span>✏️</span> Edit
                          </button>
                          <button type="button" class="btn btn-outline btn-sm btn-delete-doc-issue" onclick="window.DQD_App.deleteIssue('${this.escapeHtml(iss.id)}'); event.stopPropagation();" data-id="${this.escapeHtml(iss.id)}" style="color: #ef4444; border-color: rgba(239, 68, 68, 0.4);" title="Delete Issue">
                            <span>🗑️</span> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- TAB 7: GOVERNANCE & APPROVALS -->
        <div class="tab-pane ${activeTab === 'tab-governance' ? 'active' : ''}" id="tab-governance">
          <div class="grid-cols-2">
            <div class="card">
              <div class="card-header">
                <span class="card-title">Document Revision History</span>
                <button class="btn btn-outline btn-sm" id="btn-add-version-snapshot">Create Version Snapshot</button>
              </div>
              <div class="card-body" id="container-doc-version-history">
                ${(doc.versionHistory || []).map(v => `
                  <div style="border-left: 3px solid var(--secondary-color); padding-left: 12px; margin-bottom: 16px;">
                    <div style="display: flex; justify-content: space-between;">
                      <strong>Version ${v.version}</strong>
                      <span style="font-size: 11px; color: var(--text-muted);">${new Date(v.createdAt).toLocaleDateString()} by ${this.escapeHtml(v.author || 'Author')}</span>
                    </div>
                    <div style="font-size: 13px; margin-top: 4px;">${this.escapeHtml(v.summary || 'No summary entered.')}</div>
                  </div>
                `).join('')}
              </div>
            </div>

            <div class="card">
              <div class="card-header">
                <span class="card-title">Governance Sign-Offs</span>
                <button class="btn btn-primary btn-sm" id="btn-add-approval-record">✅ Record Sign-Off</button>
              </div>
              <div class="card-body" id="container-doc-approvals">
                ${(doc.approvals || []).length === 0 ? '<div style="color: var(--text-muted);">No formal sign-offs recorded yet.</div>' : (doc.approvals || []).map(app => `
                  <div style="background: var(--surface-alt); padding: 12px; border-radius: var(--border-radius-sm); margin-bottom: 12px; border: 1px solid var(--surface-border);">
                    <div style="display: flex; justify-content: space-between;">
                      <strong>${this.escapeHtml(app.reviewer || 'Reviewer')}</strong>
                      <span class="badge ${app.status === 'Approved' ? 'badge-passed' : 'badge-status-in-review'}">${app.status}</span>
                    </div>
                    <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">${new Date(app.timestamp).toLocaleString()}</div>
                    <div style="font-size: 13px; margin-top: 6px;">${this.escapeHtml(app.comments || '')}</div>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
        </div>
      `;

      // Attach Editor Tab Switching
      container.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          this.syncDocFromForm();
          this.currentEditorTab = btn.dataset.tab;
          container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
          container.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
          btn.classList.add('active');
          const target = document.getElementById(btn.dataset.tab);
          if (target) target.classList.add('active');
        });
      });

      // SQL Queries Management
      this.bindEditorSqlQueries();

      // Add Mapping Row
      document.getElementById('btn-add-mapping-row')?.addEventListener('click', () => {
        const tbody = document.getElementById('tbody-source-mappings');
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><input type="text" class="form-control form-control-sm map-src-col" placeholder="SRC_COL"></td>
          <td><input type="text" class="form-control form-control-sm map-tgt-col" placeholder="TGT_COL"></td>
          <td><input type="text" class="form-control form-control-sm map-data-type" list="dl-data-types" placeholder="VARCHAR(50)"></td>
          <td><input type="text" class="form-control form-control-sm map-rule" list="dl-transform-rules" placeholder="TRIM(SRC_COL)"></td>
          <td>
            <select class="form-control form-control-sm map-nullable">
              <option value="NO">NO</option>
              <option value="YES">YES</option>
            </select>
          </td>
          <td><input type="text" class="form-control form-control-sm map-desc" placeholder="Column description"></td>
          <td><button class="btn btn-outline btn-sm btn-delete-mapping-row" style="color: red;">&times;</button></td>
        `;
        tbody.appendChild(tr);
        tr.querySelector('.btn-delete-mapping-row').addEventListener('click', () => {
          tr.remove();
          this.updateMappingsCountBadge();
        });
        this.updateMappingsCountBadge();
      });

      // Wire Quick Types bar
      let lastFocusedDataTypeInput = null;
      container.querySelectorAll('.map-data-type').forEach(inp => {
        inp.onfocus = () => { lastFocusedDataTypeInput = inp; };
      });

      container.querySelectorAll('.btn-type-pill').forEach(pill => {
        pill.onclick = () => {
          const selectedType = pill.dataset.type;
          if (lastFocusedDataTypeInput && document.body.contains(lastFocusedDataTypeInput)) {
            lastFocusedDataTypeInput.value = selectedType;
            this.showToast(`Set column type to ${selectedType}`, 'info');
          } else {
            // Append a new row with this type
            const btnAddRow = document.getElementById('btn-add-mapping-row');
            if (btnAddRow) {
              btnAddRow.click();
              const rows = container.querySelectorAll('#tbody-source-mappings tr');
              const lastRow = rows[rows.length - 1];
              if (lastRow) {
                const dtInp = lastRow.querySelector('.map-data-type');
                if (dtInp) dtInp.value = selectedType;
                const tgtInp = lastRow.querySelector('.map-tgt-col');
                if (tgtInp) tgtInp.focus();
                this.showToast(`Added column with type ${selectedType}`, 'info');
              }
            }
          }
        };
      });

      // Delete existing mapping rows
      container.querySelectorAll('.btn-delete-mapping-row').forEach(b => {
        b.addEventListener('click', (e) => {
          e.target.closest('tr').remove();
          this.updateMappingsCountBadge();
        });
      });

      // Mapping Import / Structure / Export buttons
      document.getElementById('btn-show-mapping-structure')?.addEventListener('click', () => this.showMappingStructureModal());
      document.getElementById('link-show-structure-inline')?.addEventListener('click', () => this.showMappingStructureModal());
      document.getElementById('btn-import-mappings')?.addEventListener('click', () => this.showImportMappingsModal());
      document.getElementById('btn-export-mappings-xlsx')?.addEventListener('click', () => this.exportMappingsToExcel());

      // Rule picking from catalog & custom rules
      document.getElementById('btn-doc-pick-rule-catalog').addEventListener('click', () => {
        this.syncDocFromForm();
        this.showRulePickerModal();
      });
      document.getElementById('btn-doc-add-custom-rule').addEventListener('click', () => {
        this.syncDocFromForm();
        this.showAddCustomRuleModal();
      });

      // Bind delete rule buttons without destroying editor DOM
      this.bindEditorRulesDeleteButtons();

      // Action bar buttons
      document.getElementById('editor-btn-save').addEventListener('click', () => this.saveCurrentDocument());
      document.getElementById('editor-btn-cancel').addEventListener('click', () => this.navigateTo('documents'));
      document.getElementById('editor-btn-delete')?.addEventListener('click', async () => {
        const docId = (this.currentDoc && (this.currentDoc.id || this.currentDoc._originalId));
        if (docId) {
          await this.deleteDocument(docId);
        }
      });
      document.getElementById('editor-btn-share-markdown')?.addEventListener('click', () => {
        this.syncDocFromForm();
        this.showShareMarkdownModal(this.currentDoc);
      });
      document.getElementById('editor-btn-clone').addEventListener('click', () => {
        this.syncDocFromForm();
        if (this.currentDoc.id) this.showCloneModal(this.currentDoc.id);
      });
      document.getElementById('editor-btn-snapshot').addEventListener('click', () => this.promptCreateVersionSnapshot());
      document.getElementById('editor-btn-export-dqdoc')?.addEventListener('click', () => {
        this.syncDocFromForm();
        this.exportDocumentDataFile(this.currentDoc);
      });

      document.getElementById('editor-btn-pdf-only')?.addEventListener('click', () => {
        this.syncDocFromForm();
        this.generatePdfReport(this.currentDoc);
      });

      document.getElementById('editor-btn-pdf')?.addEventListener('click', () => {
        this.syncDocFromForm();
        this.generateDocumentDualFiles(this.currentDoc);
      });

      // Discipline Workspace / Team Profile Change
      document.getElementById('doc-input-team-profile')?.addEventListener('change', (e) => {
        const newProfileKey = e.target.value;
        this.syncDocFromForm();
        this.currentDoc.teamProfile = newProfileKey;
        const newProfile = (this.config && this.config.teamProfiles && this.config.teamProfiles[newProfileKey]);
        if (newProfile) {
          if (newProfile.subtypes && newProfile.subtypes[0]) {
            this.currentDoc.validationType = newProfile.subtypes[0].name;
          }
          if (newProfile.documentTypes && newProfile.documentTypes[0]) {
            this.currentDoc.documentType = newProfile.documentTypes[0];
          }
        }
        this.renderEditor(container, { activeTab: 'tab-meta' });
      });

      // Validation Type Card Selection
      container.querySelectorAll('.val-type-card').forEach(card => {
        card.addEventListener('click', () => {
          this.syncDocFromForm();
          const selectedType = card.dataset.type;
          doc.validationType = selectedType;
          container.querySelectorAll('.val-type-card').forEach(c => c.classList.remove('active'));
          card.classList.add('active');

          const badgeActive = document.getElementById('badge-doc-active-type');
          if (badgeActive) badgeActive.textContent = selectedType;
          const lblDyn = document.getElementById('lbl-dyn-val-type');
          if (lblDyn) lblDyn.textContent = selectedType;

          // Update recommended dynamic input pills
          const pillsBox = document.getElementById('suggested-pills-container');
          if (pillsBox) {
            const suggestions = this.getSuggestedInputsForType(selectedType);
            pillsBox.innerHTML = `<span style="font-size: 11px; font-weight: 700; color: var(--text-muted); margin-right: 6px;">RECOMMENDED INPUTS:</span>` +
              suggestions.map(s => `<button type="button" class="dynamic-field-pill btn-quick-add-field" data-name="${this.escapeHtml(s)}">+ ${this.escapeHtml(s)}</button>`).join(' ');
            
            pillsBox.querySelectorAll('.btn-quick-add-field').forEach(b => {
              b.onclick = () => addDynamicField(b.dataset.name);
            });
          }

          // Toggle composite models/tables visibility
          const secModels = document.getElementById('section-validated-models');
          const secTables = document.getElementById('section-validated-tables');
          if (secModels) {
            secModels.style.display = (selectedType === 'Model Validation' || selectedType === 'Model and Table Validation') ? '' : 'none';
          }
          if (secTables) {
            secTables.style.display = (selectedType === 'Table Validation' || selectedType === 'Model and Table Validation') ? '' : 'none';
          }
        });
      });

      // Multi-User Chips management
      const chipsBox = document.getElementById('doc-user-chips-box');

      const focusUserInput = () => {
        const doFocus = () => {
          const inp = document.getElementById('doc-input-new-user');
          if (inp) {
            inp.focus();
            const len = inp.value.length;
            try { inp.setSelectionRange(len, len); } catch (e) {}
          }
        };
        doFocus();
        setTimeout(doFocus, 25);
      };

      const addUserChip = (username) => {
        const u = (username || '').trim();
        if (!u) {
          const inp = document.getElementById('doc-input-new-user');
          if (inp) inp.value = '';
          focusUserInput();
          return;
        }
        if (!Array.isArray(doc.usernames)) doc.usernames = [];
        const parts = u.split(/[,;\n]+/).map(p => p.trim()).filter(Boolean);
        let addedAny = false;
        parts.forEach(name => {
          if (name && !doc.usernames.includes(name)) {
            doc.usernames.push(name);
            if (!doc.owner) doc.owner = name;
            addedAny = true;
          }
        });
        if (addedAny) {
          this.learnUniqueValuesFromDoc(doc);
        }
        renderUserChips(true);
      };

      const renderUserChips = (autoFocus = false) => {
        if (!chipsBox) return;
        const chipsHtml = (doc.usernames || []).map(u => `
          <span class="user-chip">
            <span>${this.escapeHtml(u)}</span>
            <button type="button" class="user-chip-remove" data-user="${this.escapeHtml(u)}">&times;</button>
          </span>
        `).join('') + `
          <input type="text" class="user-chips-input" id="doc-input-new-user" list="dl-usernames" placeholder="Type username & hit Enter/comma...">
          <button type="button" class="btn btn-outline btn-sm" id="btn-add-doc-user" style="padding: 2px 8px; font-size: 11px;">+ Add</button>
        `;
        chipsBox.innerHTML = chipsHtml;
        bindUserChipsEvents();
        if (autoFocus) {
          focusUserInput();
        }
      };

      const bindUserChipsEvents = () => {
        chipsBox.querySelectorAll('.user-chip-remove').forEach(b => {
          b.onclick = (e) => {
            e.stopPropagation();
            const uToRemove = e.currentTarget.dataset.user;
            doc.usernames = (doc.usernames || []).filter(u => u !== uToRemove);
            renderUserChips(true);
          };
        });
        const inp = document.getElementById('doc-input-new-user');
        const btn = document.getElementById('btn-add-doc-user');
        if (inp) {
          inp.onkeydown = (e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              addUserChip(inp.value.replace(/,/g, ''));
            }
          };
        }
        if (btn) {
          btn.onmousedown = (e) => {
            // Prevent button from stealing focus from the input
            e.preventDefault();
          };
          btn.onclick = (e) => {
            e.preventDefault();
            const currentInp = document.getElementById('doc-input-new-user');
            addUserChip(currentInp ? currentInp.value : '');
            focusUserInput();
          };
        }
        chipsBox.onclick = (e) => {
          if (e.target === chipsBox) {
            focusUserInput();
          }
        };
      };
      bindUserChipsEvents();

      // Dynamic Fields Management
      const dynFieldsContainer = document.getElementById('container-dynamic-fields');
      const searchAddFieldInput = document.getElementById('txt-search-add-field');
      const btnAddDynamicField = document.getElementById('btn-add-dynamic-field');

      const addDynamicField = (label) => {
        const lbl = (label || '').trim();
        if (!lbl) return;
        if (!Array.isArray(doc.dynamicInputs)) doc.dynamicInputs = [];
        const fId = 'f-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
        doc.dynamicInputs.push({ id: fId, label: lbl, value: '' });
        renderDynamicFields();
        if (searchAddFieldInput) searchAddFieldInput.value = '';
      };

      const renderDynamicFields = () => {
        if (!dynFieldsContainer) return;
        if (!doc.dynamicInputs || doc.dynamicInputs.length === 0) {
          dynFieldsContainer.innerHTML = `<div id="empty-dynamic-fields-note" style="font-size: 12px; color: var(--text-muted); font-style: italic; text-align: center; padding: 10px;">No dynamic inputs added yet. Click any recommended input above or type a custom field name to add.</div>`;
          return;
        }
        dynFieldsContainer.innerHTML = doc.dynamicInputs.map((f, idx) => `
          <div class="dynamic-field-card" data-id="${f.id || `f-${idx}`}">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <strong class="dynamic-field-label" style="font-size: 12px; color: var(--text-color);">${this.escapeHtml(f.label || 'Field')}</strong>
              <button type="button" class="btn btn-outline btn-sm btn-remove-dynamic-field" data-id="${f.id || `f-${idx}`}" style="color: #ef4444; padding: 1px 6px; font-size: 11px;" title="Remove field">&times;</button>
            </div>
            <input type="text" class="form-control form-control-sm dynamic-field-input" value="${this.escapeHtml(f.value || '')}" placeholder="Enter ${this.escapeHtml(f.label)}...">
          </div>
        `).join('');
        bindDynamicFieldsEvents();
      };

      const bindDynamicFieldsEvents = () => {
        dynFieldsContainer.querySelectorAll('.btn-remove-dynamic-field').forEach(b => {
          b.onclick = (e) => {
            const fId = e.currentTarget.dataset.id;
            doc.dynamicInputs = (doc.dynamicInputs || []).filter(f => f.id !== fId);
            renderDynamicFields();
          };
        });
      };
      bindDynamicFieldsEvents();

      if (btnAddDynamicField && searchAddFieldInput) {
        btnAddDynamicField.onclick = () => addDynamicField(searchAddFieldInput.value);
        searchAddFieldInput.onkeydown = (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            addDynamicField(searchAddFieldInput.value);
          }
        };
      }

      container.querySelectorAll('.btn-quick-add-field').forEach(b => {
        b.onclick = () => addDynamicField(b.dataset.name);
      });

      // Validated Models Management
      const modelsContainer = document.getElementById('container-validated-models');
      const btnAddValModel = document.getElementById('btn-add-validated-model');

      const renderValModels = () => {
        if (!modelsContainer) return;
        if (!doc.validatedModels || doc.validatedModels.length === 0) {
          modelsContainer.innerHTML = `<div style="font-size: 12px; color: var(--text-muted); font-style: italic; text-align: center; padding: 10px;">No multiple models added yet. Click "+ Add Validated Model" to audit multiple models in this single document.</div>`;
          return;
        }
        modelsContainer.innerHTML = doc.validatedModels.map((m, mIdx) => `
          <div class="card val-model-card" data-idx="${mIdx}" style="margin-bottom: 10px; padding: 12px; border: 1px solid var(--surface-border);">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <strong>Model #${mIdx + 1}</strong>
              <button type="button" class="btn btn-outline btn-sm btn-delete-val-model" data-idx="${mIdx}" style="color: #ef4444; padding: 1px 6px;">&times; Remove</button>
            </div>
            <div class="grid-cols-3">
              <div>
                <label class="form-label" style="font-size: 11px;">Model Name</label>
                <input type="text" class="form-control form-control-sm val-model-name" value="${this.escapeHtml(m.modelName || '')}" placeholder="e.g. stg_orders / fct_monthly_sales">
              </div>
              <div>
                <label class="form-label" style="font-size: 11px;">Primary Key / Grain</label>
                <input type="text" class="form-control form-control-sm val-model-grain" value="${this.escapeHtml(m.grain || '')}" placeholder="e.g. order_id, line_item_id">
              </div>
              <div>
                <label class="form-label" style="font-size: 11px;">Materialization</label>
                <select class="form-control form-control-sm val-model-mat">
                  <option value="Table" ${m.materialization === 'Table' ? 'selected' : ''}>Table</option>
                  <option value="View" ${m.materialization === 'View' ? 'selected' : ''}>View</option>
                  <option value="Incremental" ${m.materialization === 'Incremental' ? 'selected' : ''}>Incremental</option>
                  <option value="Ephemeral" ${m.materialization === 'Ephemeral' ? 'selected' : ''}>Ephemeral</option>
                </select>
              </div>
            </div>
            <div style="margin-top: 8px;">
              <label class="form-label" style="font-size: 11px;">Lineage & Upstream Sources</label>
              <input type="text" class="form-control form-control-sm val-model-sources" value="${this.escapeHtml(m.upstreamSources || '')}" placeholder="e.g. source('raw', 'orders'), ref('stg_customers')">
            </div>
          </div>
        `).join('');
        bindValModelsEvents();
      };

      const bindValModelsEvents = () => {
        if (!modelsContainer) return;
        modelsContainer.querySelectorAll('.btn-delete-val-model').forEach(b => {
          b.onclick = (e) => {
            const idx = parseInt(e.currentTarget.dataset.idx, 10);
            if (doc.validatedModels) {
              doc.validatedModels.splice(idx, 1);
              renderValModels();
            }
          };
        });
      };
      bindValModelsEvents();

      if (btnAddValModel) {
        btnAddValModel.onclick = () => {
          this.syncDocFromForm();
          if (!Array.isArray(doc.validatedModels)) doc.validatedModels = [];
          doc.validatedModels.push({
            id: 'M-' + (doc.validatedModels.length + 1),
            modelName: '',
            upstreamSources: '',
            grain: '',
            materialization: 'Table',
            notes: ''
          });
          renderValModels();
        };
      }

      // Validated Tables Management
      const tablesContainer = document.getElementById('container-validated-tables');
      const btnAddValTable = document.getElementById('btn-add-validated-table');

      const renderValTables = () => {
        if (!tablesContainer) return;
        if (!doc.validatedTables || doc.validatedTables.length === 0) {
          tablesContainer.innerHTML = `<div style="font-size: 12px; color: var(--text-muted); font-style: italic; text-align: center; padding: 10px;">No multiple tables added yet. Click "+ Add Validated Table" to validate multiple tables in this document.</div>`;
          return;
        }
        tablesContainer.innerHTML = doc.validatedTables.map((t, tIdx) => `
          <div class="card val-table-card" data-idx="${tIdx}" style="margin-bottom: 10px; padding: 12px; border: 1px solid var(--surface-border);">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <strong>Physical Table #${tIdx + 1}</strong>
              <button type="button" class="btn btn-outline btn-sm btn-delete-val-table" data-idx="${tIdx}" style="color: #ef4444; padding: 1px 6px;">&times; Remove</button>
            </div>
            <div class="grid-cols-3">
              <div>
                <label class="form-label" style="font-size: 11px;">Table / View Name</label>
                <input type="text" class="form-control form-control-sm val-table-name" value="${this.escapeHtml(t.tableName || '')}" placeholder="e.g. prod_dwh.fact_transactions">
              </div>
              <div>
                <label class="form-label" style="font-size: 11px;">Catalog & Schema</label>
                <input type="text" class="form-control form-control-sm val-table-schema" value="${this.escapeHtml(t.schema || '')}" placeholder="e.g. iceberg_prod.finance">
              </div>
              <div>
                <label class="form-label" style="font-size: 11px;">Storage Format</label>
                <select class="form-control form-control-sm val-table-format">
                  <option value="Parquet" ${t.storageFormat === 'Parquet' ? 'selected' : ''}>Parquet</option>
                  <option value="Iceberg" ${t.storageFormat === 'Iceberg' ? 'selected' : ''}>Iceberg</option>
                  <option value="Delta Lake" ${t.storageFormat === 'Delta Lake' ? 'selected' : ''}>Delta Lake</option>
                  <option value="ORC" ${t.storageFormat === 'ORC' ? 'selected' : ''}>ORC</option>
                  <option value="CSV / Text" ${t.storageFormat === 'CSV / Text' ? 'selected' : ''}>CSV / Text</option>
                </select>
              </div>
            </div>
            <div class="grid-cols-2" style="margin-top: 8px;">
              <div>
                <label class="form-label" style="font-size: 11px;">Partitioning & Cluster Keys</label>
                <input type="text" class="form-control form-control-sm val-table-partitions" value="${this.escapeHtml(t.partitionKeys || '')}" placeholder="e.g. partition by day(event_date), cluster by country">
              </div>
              <div>
                <label class="form-label" style="font-size: 11px;">Volume / Row Count</label>
                <input type="text" class="form-control form-control-sm val-table-volume" value="${this.escapeHtml(t.volume || '')}" placeholder="e.g. ~45,000,000 rows (daily +200k)">
              </div>
            </div>
          </div>
        `).join('');
        bindValTablesEvents();
      };

      const bindValTablesEvents = () => {
        if (!tablesContainer) return;
        tablesContainer.querySelectorAll('.btn-delete-val-table').forEach(b => {
          b.onclick = (e) => {
            const idx = parseInt(e.currentTarget.dataset.idx, 10);
            if (doc.validatedTables) {
              doc.validatedTables.splice(idx, 1);
              renderValTables();
            }
          };
        });
      };
      bindValTablesEvents();

      if (btnAddValTable) {
        btnAddValTable.onclick = () => {
          this.syncDocFromForm();
          if (!Array.isArray(doc.validatedTables)) doc.validatedTables = [];
          doc.validatedTables.push({
            id: 'T-' + (doc.validatedTables.length + 1),
            tableName: '',
            catalog: '',
            schema: '',
            storageFormat: 'Parquet',
            partitionKeys: '',
            volume: '',
            notes: ''
          });
          renderValTables();
        };
      }

      // Quick Paste Columns button
      document.getElementById('btn-quick-paste-columns')?.addEventListener('click', () => {
        this.syncDocFromForm();
        this.showQuickPasteColumnsModal();
      });

      // Screenshots events
      this.bindScreenshotEvents();

      // Real-time synchronization of inline Document ID
      const idHeader = document.getElementById('doc-input-id');
      const idMeta = document.getElementById('doc-input-id-meta');
      if (idHeader) {
        idHeader.addEventListener('input', (e) => {
          const val = e.target.value.trim();
          if (this.currentDoc) this.currentDoc.id = val;
          if (idMeta && idMeta.value !== e.target.value) {
            idMeta.value = e.target.value;
          }
        });
        idHeader.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            idHeader.blur();
          }
        });
      }
      if (idMeta) {
        idMeta.addEventListener('input', (e) => {
          const val = e.target.value.trim();
          if (this.currentDoc) this.currentDoc.id = val;
          if (idHeader && idHeader.value !== e.target.value) {
            idHeader.value = e.target.value;
          }
        });
      }

      // Governance Buttons
      document.getElementById('btn-add-version-snapshot').addEventListener('click', () => {
        this.syncDocFromForm();
        this.promptCreateVersionSnapshot();
      });
      document.getElementById('btn-add-approval-record').addEventListener('click', () => {
        this.syncDocFromForm();
        this.showApprovalModal();
      });
      document.getElementById('btn-add-doc-execution').addEventListener('click', () => {
        this.syncDocFromForm();
        this.showLogExecutionModal();
      });
      document.getElementById('btn-add-doc-issue').addEventListener('click', () => {
        this.syncDocFromForm();
        this.showAddIssueModal();
      });

      // Delegated events for issues inside editor tab-issues
      const editorIssuesTab = document.getElementById('tab-issues');
      if (editorIssuesTab) {
        editorIssuesTab.addEventListener('click', (e) => {
          const editBtn = e.target.closest('.btn-edit-doc-issue');
          if (editBtn) {
            e.preventDefault();
            e.stopPropagation();
            const issueId = editBtn.dataset.id;
            this.showEditIssueModalById(issueId);
            return;
          }

          const delBtn = e.target.closest('.btn-delete-doc-issue');
          if (delBtn) {
            e.preventDefault();
            e.stopPropagation();
            const issueId = delBtn.dataset.id;
            this.deleteIssue(issueId);
            return;
          }
        });
      }
    },

    // Synchronize form values to this.currentDoc
    syncDocFromForm() {
      if (!this.currentDoc) return;
      const doc = this.currentDoc;

      const idVal = (document.getElementById('doc-input-id')?.value || document.getElementById('doc-input-id-meta')?.value || '').trim();
      if (idVal) {
        doc.id = idVal;
      }

      // Validation Type & Team & Users & Team Profile
      const teamProfileSelectEl = document.getElementById('doc-input-team-profile');
      if (teamProfileSelectEl && teamProfileSelectEl.value) {
        doc.teamProfile = teamProfileSelectEl.value;
      } else if (!doc.teamProfile) {
        doc.teamProfile = this.getActiveProfileKey();
      }

      // Discipline Technical Specification Attributes
      doc.teamAttributes = doc.teamAttributes || {};
      const teamAttrInputs = document.querySelectorAll('.team-profile-attr-input');
      teamAttrInputs.forEach(input => {
        const key = input.dataset.attrKey;
        if (key) {
          doc.teamAttributes[key] = input.value.trim();
        }
      });

      const activeTypeCard = document.querySelector('.val-type-card.active');
      if (activeTypeCard) doc.validationType = activeTypeCard.dataset.type;
      doc.team = (document.getElementById('doc-input-team')?.value || '').trim();
      if (!Array.isArray(doc.usernames)) doc.usernames = [];
      if (doc.usernames.length > 0 && !doc.owner) doc.owner = doc.usernames[0];

      // Dynamic Inputs
      const dynamicCards = document.querySelectorAll('.dynamic-field-card');
      if (dynamicCards.length > 0) {
        doc.dynamicInputs = [];
        dynamicCards.forEach((card, idx) => {
          const id = card.dataset.id || `f-${idx}`;
          const label = card.querySelector('.dynamic-field-label')?.textContent || '';
          const value = card.querySelector('.dynamic-field-input')?.value || '';
          doc.dynamicInputs.push({ id, label, value });
        });
      }

      // Validated Models
      const modelCards = document.querySelectorAll('.val-model-card');
      if (modelCards.length > 0) {
        doc.validatedModels = [];
        modelCards.forEach((card, idx) => {
          doc.validatedModels.push({
            id: `M-${idx + 1}`,
            modelName: card.querySelector('.val-model-name')?.value || '',
            upstreamSources: card.querySelector('.val-model-sources')?.value || '',
            grain: card.querySelector('.val-model-grain')?.value || '',
            materialization: card.querySelector('.val-model-mat')?.value || 'Table',
            notes: ''
          });
        });
      }

      // Validated Tables
      const tableCards = document.querySelectorAll('.val-table-card');
      if (tableCards.length > 0) {
        doc.validatedTables = [];
        tableCards.forEach((card, idx) => {
          doc.validatedTables.push({
            id: `T-${idx + 1}`,
            tableName: card.querySelector('.val-table-name')?.value || '',
            schema: card.querySelector('.val-table-schema')?.value || '',
            storageFormat: card.querySelector('.val-table-format')?.value || 'Parquet',
            partitionKeys: card.querySelector('.val-table-partitions')?.value || '',
            volume: card.querySelector('.val-table-volume')?.value || '',
            notes: ''
          });
        });
      }

      // Screenshots
      const ssCards = document.querySelectorAll('.screenshot-card');
      if (ssCards.length > 0 && Array.isArray(doc.screenshots)) {
        ssCards.forEach(card => {
          const ssId = card.dataset.id;
          const ssObj = doc.screenshots.find(s => s.id === ssId);
          if (ssObj) {
            ssObj.caption = card.querySelector('.ss-caption')?.value || '';
            ssObj.relatedQueryId = card.querySelector('.ss-query-select')?.value || 'none';
            ssObj.placement = card.querySelector('.ss-placement-select')?.value || 'under_query';
          }
        });
      }

      doc.title = document.getElementById('doc-input-title')?.value || '';
      doc.documentType = document.getElementById('doc-input-type')?.value || '';
      doc.businessDomain = document.getElementById('doc-input-domain')?.value || '';
      doc.owner = document.getElementById('doc-input-owner')?.value || '';
      doc.reviewer = document.getElementById('doc-input-reviewer')?.value || '';
      doc.status = document.getElementById('doc-input-status')?.value || 'Draft';
      doc.priority = document.getElementById('doc-input-priority')?.value || 'Medium';
      doc.executionFrequency = document.getElementById('doc-input-frequency')?.value || '';
      doc.executiveSummary = document.getElementById('doc-input-summary')?.value || '';
      doc.businessObjective = document.getElementById('doc-input-objective')?.value || '';

      // Author / User contact details (can be null or string)
      const uNameEl = document.getElementById('doc-input-username');
      const uEmailEl = document.getElementById('doc-input-useremail');
      const uPhoneEl = document.getElementById('doc-input-userphone');
      if (uNameEl || uEmailEl || uPhoneEl) {
        const uName = uNameEl ? uNameEl.value.trim() : '';
        const uEmail = uEmailEl ? uEmailEl.value.trim() : '';
        const uPhone = uPhoneEl ? uPhoneEl.value.trim() : '';
        doc.userInfo = {
          username: uName || null,
          useremail: uEmail || null,
          userphone: uPhone || null
        };
        doc.username = doc.userInfo.username;
        doc.useremail = doc.userInfo.useremail;
        doc.userphone = doc.userInfo.userphone;
      }

      doc.dataSource = doc.dataSource || {};
      doc.dataSource.system = document.getElementById('doc-input-src-system')?.value || '';
      doc.dataSource.catalog = document.getElementById('doc-input-src-catalog')?.value || '';
      doc.dataSource.schema = document.getElementById('doc-input-src-schema')?.value || '';
      const tablesRaw = document.getElementById('doc-input-src-tables')?.value || '';
      doc.dataSource.tables = tablesRaw.split(',').map(s => s.trim()).filter(Boolean);
      doc.dataSource.dependencies = document.getElementById('doc-input-src-dependencies')?.value || '';

      // Mappings
      const mappingRows = document.querySelectorAll('#tbody-source-mappings tr');
      doc.dataSource.mappings = [];
      mappingRows.forEach(row => {
        doc.dataSource.mappings.push({
          sourceCol: row.querySelector('.map-src-col')?.value || '',
          targetCol: row.querySelector('.map-tgt-col')?.value || '',
          dataType: row.querySelector('.map-data-type')?.value || '',
          rule: row.querySelector('.map-rule')?.value || '',
          nullable: row.querySelector('.map-nullable')?.value || 'NO',
          description: row.querySelector('.map-desc')?.value || ''
        });
      });

      // SQL Queries (Multiple Queries Supported)
      const oldQuery = doc.sqlQuery;
      const queryCards = document.querySelectorAll('.sql-query-card');
      if (queryCards.length > 0) {
        doc.sqlQueries = [];
        queryCards.forEach((card, idx) => {
          const title = card.querySelector('.sql-q-title')?.value || `Query ${idx + 1}`;
          const dialect = card.querySelector('.sql-q-dialect')?.value || doc.sqlDialect || 'Snowflake';
          const query = card.querySelector('.sql-q-textarea')?.value || '';
          const notes = card.querySelector('.sql-q-notes')?.value || '';
          doc.sqlQueries.push({
            id: `Q-${idx + 1}`,
            title,
            dialect,
            query,
            notes
          });
        });
        doc.sqlQuery = doc.sqlQueries[0]?.query || '';
        doc.sqlDialect = doc.sqlQueries[0]?.dialect || 'Snowflake';
        doc.sqlNotes = doc.sqlQueries[0]?.notes || '';
      }

      doc.expectedResult = document.getElementById('doc-input-expected-result')?.value || '';
      doc.actualResult = document.getElementById('doc-input-actual-result')?.value || '';
      doc.threshold = document.getElementById('doc-input-threshold')?.value || '0';
      doc.remediation = document.getElementById('doc-input-remediation')?.value || '';

      // Auto-reapproval check: If document was Approved and user altered SQL query, revert to Draft
      if (doc.status === 'Approved' && oldQuery && oldQuery !== doc.sqlQuery) {
        doc.status = 'Draft';
        this.showToast('SQL query changed on Approved document. Status reverted to Draft for re-approval.', 'warning');
        this.logAudit('Status Invalidated', `Document ${doc.id} SQL changed; status reverted to Draft for re-approval`, 'System', doc.id);
      }

      doc.updatedAt = new Date().toISOString();
    },

    async saveCurrentDocument() {
      this.syncDocFromForm();
      const doc = this.currentDoc;

      if (!doc.id || !doc.id.trim()) {
        this.showToast('Please specify a Document ID / Code (e.g. DOC-20261011-7927)', 'error');
        return;
      }

      if (!doc.title) {
        this.showToast('Please enter a Document Title', 'error');
        return;
      }

      // Check required fields if Final
      if (doc.status === 'Approved' || doc.status === 'Final') {
        const missing = this.getMissingRequiredFields(doc);
        if (missing.length > 0) {
          this.showToast(`Cannot approve: Missing required fields: ${missing.join(', ')}`, 'error');
          return;
        }
      }

      // Handle ID rename if document was previously saved under another ID
      const oldId = this.currentDoc._originalId;
      const newId = doc.id.trim();
      doc.id = newId;

      if (oldId && oldId !== newId) {
        const existing = this.documents.find(d => d.id === newId && d.id !== oldId);
        if (existing) {
          this.showToast(`A document with ID "${newId}" already exists. Please choose a unique ID.`, 'error');
          return;
        }

        // Delete old document record from indexedDB
        await this.dbDelete('documents', oldId);
        const oldIdx = this.documents.findIndex(d => d.id === oldId);
        if (oldIdx >= 0) {
          this.documents.splice(oldIdx, 1);
        }
        await this.logAudit('Document Renamed', `Document ID changed from ${oldId} to ${newId}`, 'User', newId);
        this.currentDoc._originalId = newId;
      } else if (!oldId) {
        this.currentDoc._originalId = newId;
      }

      await this.dbPut('documents', doc);

      // Update in memory list
      const idx = this.documents.findIndex(d => d.id === doc.id);
      if (idx >= 0) this.documents[idx] = doc;
      else this.documents.unshift(doc);

      await this.logAudit('Document Saved', `Saved document "${doc.title}" (ID: ${doc.id})`, 'User', doc.id);

      // Store user queries from template/document into SQL Assertion Library with Document Title as title
      await this.storeQueriesFromDocument(doc);

      this.updateSidebarBadges();

      // Learn new unique values into Smart Autocomplete
      this.learnUniqueValuesFromDoc(doc);

      this.showToast('Document saved successfully!', 'success');
    },

    async storeQueriesFromDocument(doc) {
      if (!doc) return;
      const docTitle = (doc.title || '').trim() || 'Untitled Document';
      const queries = (doc.sqlQueries && doc.sqlQueries.length > 0)
        ? doc.sqlQueries
        : (doc.sqlQuery ? [{ id: 'Q-1', title: 'Primary Assertion', dialect: doc.sqlDialect || 'Trino', query: doc.sqlQuery, notes: doc.sqlNotes || '' }] : []);

      let storedCount = 0;
      for (let idx = 0; idx < queries.length; idx++) {
        const q = queries[idx];
        const queryText = (q.query || '').trim();
        if (!queryText) continue;

        // Title of the query is the Document Title
        const queryTitle = queries.length > 1
          ? `${docTitle} - ${q.title || `Query ${idx + 1}`}`
          : docTitle;

        const assertionItem = {
          id: `SQL-${doc.id}-${q.id || (idx + 1)}`,
          title: queryTitle,
          documentTitle: docTitle,
          documentId: doc.id,
          queryIndex: idx + 1,
          queryTitle: q.title || `Query ${idx + 1}`,
          dialect: q.dialect || doc.sqlDialect || 'Trino',
          sql: queryText,
          notes: q.notes || doc.sqlNotes || '',
          expectedResult: doc.expectedResult || '',
          threshold: doc.threshold || '0',
          createdAt: doc.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        await this.dbPut('sql_assertions', assertionItem);

        const existingIdx = this.sqlAssertions.findIndex(a => a.id === assertionItem.id);
        if (existingIdx >= 0) {
          this.sqlAssertions[existingIdx] = assertionItem;
        } else {
          this.sqlAssertions.unshift(assertionItem);
        }
        storedCount++;
      }

      if (storedCount > 0) {
        await this.syncSqlAssertionsToFile();
        this.updateSidebarBadges();
      }
    },

    async syncSqlAssertionsToFile() {
      try {
        await fetch('save_assertions.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(this.sqlAssertions, null, 2)
        });
      } catch (err) {
        // Fallback: persisted in IndexedDB and localStorage
      }
    },

    updateEditorMappingsTable() {
      const tbody = document.getElementById('tbody-source-mappings');
      if (!tbody) return;
      const mappings = this.currentDoc?.dataSource?.mappings || [];
      tbody.innerHTML = mappings.map((m, idx) => `
        <tr>
          <td><input type="text" class="form-control form-control-sm map-src-col" value="${this.escapeHtml(m.sourceCol || '')}" placeholder="SRC_COL"></td>
          <td><input type="text" class="form-control form-control-sm map-tgt-col" value="${this.escapeHtml(m.targetCol || '')}" placeholder="TGT_COL"></td>
          <td><input type="text" class="form-control form-control-sm map-data-type" list="dl-data-types" value="${this.escapeHtml(m.dataType || '')}" placeholder="VARCHAR(50)"></td>
          <td><input type="text" class="form-control form-control-sm map-rule" list="dl-transform-rules" value="${this.escapeHtml(m.rule || '')}" placeholder="TRIM(SRC_COL)"></td>
          <td>
            <select class="form-control form-control-sm map-nullable">
              <option value="NO" ${m.nullable === 'NO' ? 'selected' : ''}>NO</option>
              <option value="YES" ${m.nullable === 'YES' ? 'selected' : ''}>YES</option>
            </select>
          </td>
          <td><input type="text" class="form-control form-control-sm map-desc" value="${this.escapeHtml(m.description || '')}" placeholder="Column description"></td>
          <td><button class="btn btn-outline btn-sm btn-delete-mapping-row" style="color: red;">&times;</button></td>
        </tr>
      `).join('');

      tbody.querySelectorAll('.btn-delete-mapping-row').forEach(b => {
        b.addEventListener('click', (e) => {
          e.target.closest('tr').remove();
          this.updateMappingsCountBadge();
        });
      });

      this.updateMappingsCountBadge();
    },

    updateMappingsCountBadge() {
      const badge = document.getElementById('mappings-row-count-badge');
      if (badge) {
        const rows = document.querySelectorAll('#tbody-source-mappings tr').length;
        badge.textContent = `(${rows} mapped)`;
      }
    },

    normalizeMappingRecord(raw) {
      if (!raw || typeof raw !== 'object') return null;

      const findVal = (patterns) => {
        const keys = Object.keys(raw);
        for (const pattern of patterns) {
          const matchedKey = keys.find(k => k.trim().toLowerCase().replace(/[\s_\-\?:]/g, '') === pattern);
          if (matchedKey && raw[matchedKey] !== undefined && raw[matchedKey] !== null) {
            return String(raw[matchedKey]).trim();
          }
        }
        return '';
      };

      const sourceCol = findVal(['sourcecol', 'sourcecolumn', 'source', 'src', 'srccol', 'sourcefield', 'sourceattribute']);
      const targetCol = findVal(['targetcol', 'targetcolumn', 'target', 'tgt', 'tgtcol', 'targetfield', 'targetattribute', 'destination', 'destcol']);

      // Require at least one column name
      if (!sourceCol && !targetCol) return null;

      const dataType = findVal(['datatype', 'type', 'targetdatatype', 'targettype', 'columntype', 'dataformat']) || 'VARCHAR(50)';
      const rule = findVal(['transformationlogic', 'transformation', 'rule', 'transform', 'transformlogic', 'logic', 'formula', 'mappingrule']) || '';

      const nullableRaw = findVal(['nullable', 'isnullable', 'null', 'allowsnul', 'allownull']);
      let nullable = 'NO';
      if (nullableRaw) {
        const lower = nullableRaw.toLowerCase();
        if (lower === 'yes' || lower === 'true' || lower === '1' || lower === 'y') {
          nullable = 'YES';
        }
      }

      const description = findVal(['description', 'desc', 'comment', 'comments', 'notes', 'definition', 'businessdefinition']) || '';

      return {
        sourceCol,
        targetCol,
        dataType,
        rule,
        nullable,
        description
      };
    },

    showMappingStructureModal() {
      const modalBox = document.getElementById('modal-dialog-box');
      if (modalBox) modalBox.style.maxWidth = '840px';

      this.openModal('Expected Structure: Source-to-Target Column Mappings', `
        <div style="font-size: 13px; line-height: 1.6;">
          <p style="margin-bottom: 12px; color: var(--text-color);">
            You can upload your column mappings from a <strong>JSON file</strong> (<code>.json</code>), an <strong>Excel workbook</strong> (<code>.xlsx</code>, <code>.xls</code>), or a <strong>CSV file</strong> (<code>.csv</code>).
          </p>

          <div class="tabs-header" style="margin-bottom: 16px;">
            <button class="tab-btn active" id="struct-tab-btn-headers">1. Required Columns & Aliases</button>
            <button class="tab-btn" id="struct-tab-btn-json">2. JSON Format</button>
            <button class="tab-btn" id="struct-tab-btn-excel">3. Excel / CSV Format</button>
          </div>

          <!-- PANE 1: TABLE HEADERS -->
          <div id="struct-pane-headers" class="tab-pane active" style="display: block;">
            <table class="table-custom" style="font-size: 12px; margin-bottom: 10px;">
              <thead>
                <tr>
                  <th style="width: 130px;">Field Name</th>
                  <th>Accepted Column Headers (Flexible)</th>
                  <th style="width: 80px;">Status</th>
                  <th>Default / Recommended Values</th>
                  <th>Example</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><code>sourceCol</code></td>
                  <td><strong>Source Column</strong>, <code>source_column</code>, <code>source</code>, <code>src</code>, <code>src_col</code></td>
                  <td><span class="badge badge-danger">Required</span></td>
                  <td>Source system attribute / column name</td>
                  <td><code>SRC_CUST_ID</code></td>
                </tr>
                <tr>
                  <td><code>targetCol</code></td>
                  <td><strong>Target Column</strong>, <code>target_column</code>, <code>target</code>, <code>tgt</code>, <code>destination</code></td>
                  <td><span class="badge badge-danger">Required</span></td>
                  <td>Warehouse / Lakehouse target column name</td>
                  <td><code>customer_id</code></td>
                </tr>
                <tr>
                  <td><code>dataType</code></td>
                  <td><strong>Data Type</strong>, <code>data_type</code>, <code>type</code>, <code>columntype</code></td>
                  <td><span class="badge badge-info">Optional</span></td>
                  <td>SQL data type (defaults to <code>VARCHAR(50)</code>)</td>
                  <td><code>VARCHAR(50)</code></td>
                </tr>
                <tr>
                  <td><code>rule</code></td>
                  <td><strong>Transformation Logic</strong>, <code>transformation</code>, <code>rule</code>, <code>logic</code></td>
                  <td><span class="badge badge-info">Optional</span></td>
                  <td>SQL transformation expression or business logic</td>
                  <td><code>TRIM(UPPER(SRC_CUST_ID))</code></td>
                </tr>
                <tr>
                  <td><code>nullable</code></td>
                  <td><strong>Nullable?</strong>, <code>nullable</code>, <code>is_nullable</code></td>
                  <td><span class="badge badge-info">Optional</span></td>
                  <td><code>YES</code> or <code>NO</code> (defaults to <code>NO</code>)</td>
                  <td><code>NO</code></td>
                </tr>
                <tr>
                  <td><code>description</code></td>
                  <td><strong>Description</strong>, <code>description</code>, <code>desc</code>, <code>comments</code>, <code>notes</code></td>
                  <td><span class="badge badge-info">Optional</span></td>
                  <td>Business meaning or technical documentation</td>
                  <td><code>Unique surrogate customer key</code></td>
                </tr>
              </tbody>
            </table>
            <div style="font-size: 11px; color: var(--text-muted); background: var(--surface-alt); padding: 8px 12px; border-radius: var(--border-radius-sm);">
              ⚡ <strong>Smart Normalizer:</strong> Column headers are case-insensitive and ignore spaces, underscores, and question marks (e.g., <code>"Source Column"</code>, <code>"source_column"</code>, and <code>"sourceCol"</code> are all recognized automatically).
            </div>
          </div>

          <!-- PANE 2: JSON -->
          <div id="struct-pane-json" class="tab-pane" style="display: none;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span style="font-weight: 600; font-size: 12px; color: var(--text-muted);">JSON Array of Objects:</span>
              <button class="btn btn-outline btn-sm" id="btn-struct-copy-json">📋 Copy JSON</button>
            </div>
            <pre style="background: #1e293b; color: #f8fafc; padding: 12px; border-radius: var(--border-radius-sm); font-size: 12px; max-height: 220px; overflow-y: auto; font-family: 'Consolas', monospace; margin: 0;">[
  {
    "sourceCol": "SRC_CUST_ID",
    "targetCol": "customer_id",
    "dataType": "VARCHAR(50)",
    "rule": "TRIM(UPPER(SRC_CUST_ID))",
    "nullable": "NO",
    "description": "Primary unique identifier for customer record"
  },
  {
    "sourceCol": "FIRST_NM",
    "targetCol": "first_name",
    "dataType": "VARCHAR(100)",
    "rule": "INITCAP(TRIM(FIRST_NM))",
    "nullable": "YES",
    "description": "Customer given first name"
  },
  {
    "sourceCol": "EMAIL_ADDR",
    "targetCol": "email_address",
    "dataType": "VARCHAR(255)",
    "rule": "LOWER(TRIM(EMAIL_ADDR))",
    "nullable": "YES",
    "description": "Validated customer contact email address"
  }
]</pre>
          </div>

          <!-- PANE 3: EXCEL / CSV -->
          <div id="struct-pane-excel" class="tab-pane" style="display: none;">
            <p style="margin-bottom: 8px; color: var(--text-muted);">The first row of your worksheet or CSV must contain the column headers:</p>
            <table class="table-custom" style="font-size: 12px; margin-bottom: 8px;">
              <thead>
                <tr>
                  <th>Source Column</th>
                  <th>Target Column</th>
                  <th>Data Type</th>
                  <th>Transformation Logic</th>
                  <th>Nullable?</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><code>SRC_CUST_ID</code></td>
                  <td><code>customer_id</code></td>
                  <td><code>VARCHAR(50)</code></td>
                  <td><code>TRIM(UPPER(SRC_CUST_ID))</code></td>
                  <td><code>NO</code></td>
                  <td>Primary customer identifier</td>
                </tr>
                <tr>
                  <td><code>FIRST_NM</code></td>
                  <td><code>first_name</code></td>
                  <td><code>VARCHAR(100)</code></td>
                  <td><code>INITCAP(TRIM(FIRST_NM))</code></td>
                  <td><code>YES</code></td>
                  <td>Customer first name</td>
                </tr>
                <tr>
                  <td><code>EMAIL_ADDR</code></td>
                  <td><code>email_address</code></td>
                  <td><code>VARCHAR(255)</code></td>
                  <td><code>LOWER(TRIM(EMAIL_ADDR))</code></td>
                  <td><code>YES</code></td>
                  <td>Standardized contact email</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- TEMPLATE DOWNLOAD FOOTER -->
          <div style="margin-top: 16px; padding-top: 14px; border-top: 1px solid var(--surface-border); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
            <span style="font-weight: 700; font-size: 12px; color: var(--text-color);">Download Ready-to-Use Templates:</span>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              <button class="btn btn-outline btn-sm" id="btn-dl-tpl-json">📥 Sample JSON</button>
              <button class="btn btn-outline btn-sm" id="btn-dl-tpl-xlsx">📊 Sample Excel (.xlsx)</button>
              <button class="btn btn-outline btn-sm" id="btn-dl-tpl-csv">📄 Sample CSV</button>
            </div>
          </div>
        </div>
      `, [
        { label: 'Close', class: 'btn-outline', action: () => {
          if (modalBox) modalBox.style.maxWidth = '';
          this.closeModal();
        }},
        { label: 'Upload File Now 📤', class: 'btn-primary', action: () => this.showImportMappingsModal() }
      ]);

      // Tab switcher inside modal
      const tabHeaders = document.getElementById('struct-tab-btn-headers');
      const tabJson = document.getElementById('struct-tab-btn-json');
      const tabExcel = document.getElementById('struct-tab-btn-excel');
      const paneHeaders = document.getElementById('struct-pane-headers');
      const paneJson = document.getElementById('struct-pane-json');
      const paneExcel = document.getElementById('struct-pane-excel');

      const switchTab = (activeBtn, activePane) => {
        [tabHeaders, tabJson, tabExcel].forEach(b => b.classList.remove('active'));
        [paneHeaders, paneJson, paneExcel].forEach(p => p.style.display = 'none');
        activeBtn.classList.add('active');
        activePane.style.display = 'block';
      };

      tabHeaders?.addEventListener('click', () => switchTab(tabHeaders, paneHeaders));
      tabJson?.addEventListener('click', () => switchTab(tabJson, paneJson));
      tabExcel?.addEventListener('click', () => switchTab(tabExcel, paneExcel));

      // Copy JSON button
      document.getElementById('btn-struct-copy-json')?.addEventListener('click', () => {
        const jsonCode = `[
  {
    "sourceCol": "SRC_CUST_ID",
    "targetCol": "customer_id",
    "dataType": "VARCHAR(50)",
    "rule": "TRIM(UPPER(SRC_CUST_ID))",
    "nullable": "NO",
    "description": "Primary unique identifier for customer record"
  },
  {
    "sourceCol": "FIRST_NM",
    "targetCol": "first_name",
    "dataType": "VARCHAR(100)",
    "rule": "INITCAP(TRIM(FIRST_NM))",
    "nullable": "YES",
    "description": "Customer given first name"
  },
  {
    "sourceCol": "EMAIL_ADDR",
    "targetCol": "email_address",
    "dataType": "VARCHAR(255)",
    "rule": "LOWER(TRIM(EMAIL_ADDR))",
    "nullable": "YES",
    "description": "Validated customer contact email address"
  }
]`;
        navigator.clipboard.writeText(jsonCode).then(() => {
          this.showToast('Sample JSON copied to clipboard', 'success');
        });
      });

      // Download buttons
      document.getElementById('btn-dl-tpl-json')?.addEventListener('click', () => this.downloadSampleMappingsJson());
      document.getElementById('btn-dl-tpl-xlsx')?.addEventListener('click', () => this.downloadSampleMappingsExcel());
      document.getElementById('btn-dl-tpl-csv')?.addEventListener('click', () => this.downloadSampleMappingsCsv());
    },

    showImportMappingsModal() {
      const modalBox = document.getElementById('modal-dialog-box');
      if (modalBox) modalBox.style.maxWidth = '780px';
      this._pendingMappingImports = null;

      this.openModal('Upload Source-to-Target Column Mappings', `
        <div style="font-size: 13px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; background: rgba(37, 99, 235, 0.06); padding: 10px 14px; border-radius: var(--border-radius-sm); border: 1px solid rgba(37, 99, 235, 0.2); flex-wrap: wrap; gap: 8px;">
            <div>
              <strong>Accepted Formats:</strong> JSON (<code>.json</code>), Excel (<code>.xlsx</code>, <code>.xls</code>), CSV (<code>.csv</code>)
            </div>
            <button class="btn btn-outline btn-sm" id="btn-modal-open-structure" style="font-size: 11px;">📋 View Structure & Templates</button>
          </div>

          <div class="form-group" style="margin-bottom: 16px;">
            <label class="form-label required">Select File from Computer</label>
            <input type="file" id="input-mapping-file" class="form-control" accept=".json,.xlsx,.xls,.csv" style="padding: 7px 10px;">
            <div class="form-text">Upload a JSON array, Excel sheet, or CSV export. Files are processed entirely locally and offline in your browser.</div>
          </div>

          <div class="form-group" style="margin-bottom: 16px;">
            <label class="form-label">Import Mode</label>
            <div style="display: flex; gap: 20px; align-items: center; margin-top: 6px; flex-wrap: wrap;">
              <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-weight: normal; margin: 0;">
                <input type="radio" name="mapping-import-mode" value="append" checked>
                <span><strong>Append</strong> to current mappings (keep existing rows, add new)</span>
              </label>
              <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-weight: normal; margin: 0;">
                <input type="radio" name="mapping-import-mode" value="replace">
                <span><strong>Replace</strong> all current mappings (overwrite existing)</span>
              </label>
            </div>
          </div>

          <!-- Live Preview Area -->
          <div id="mapping-import-preview-box" style="display: none; margin-top: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span style="font-weight: 700; font-size: 13px;" id="mapping-preview-title">Parsed Mappings Preview</span>
              <span class="badge badge-info" id="mapping-preview-badge">0 valid rows</span>
            </div>
            <div style="max-height: 200px; overflow-y: auto; border: 1px solid var(--surface-border); border-radius: var(--border-radius-sm);">
              <table class="table-custom" style="font-size: 11px; margin: 0;">
                <thead>
                  <tr>
                    <th>Source Column</th>
                    <th>Target Column</th>
                    <th>Data Type</th>
                    <th>Transformation Logic</th>
                    <th>Nullable?</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody id="tbody-mapping-import-preview"></tbody>
              </table>
            </div>
          </div>
        </div>
      `, [
        { label: 'Cancel', class: 'btn-outline', action: () => {
          if (modalBox) modalBox.style.maxWidth = '';
          this.closeModal();
        }},
        { label: 'Confirm Import', class: 'btn-primary', id: 'btn-confirm-mapping-import', action: () => {
          if (!this._pendingMappingImports || this._pendingMappingImports.length === 0) {
            this.showToast('Please select a valid JSON, Excel, or CSV file first', 'warning');
            return;
          }
          this.syncDocFromForm();
          const mode = document.querySelector('input[name="mapping-import-mode"]:checked')?.value || 'append';
          
          if (!this.currentDoc.dataSource) {
            this.currentDoc.dataSource = {};
          }

          if (mode === 'replace') {
            this.currentDoc.dataSource.mappings = [...this._pendingMappingImports];
          } else {
            const existing = this.currentDoc.dataSource.mappings || [];
            this.currentDoc.dataSource.mappings = [...existing, ...this._pendingMappingImports];
          }

          this.updateEditorMappingsTable();
          if (modalBox) modalBox.style.maxWidth = '';
          this.closeModal();
          this.showToast(`Successfully imported ${this._pendingMappingImports.length} column mappings (${mode === 'replace' ? 'replaced' : 'appended'})`, 'success');
          this._pendingMappingImports = null;
        }}
      ]);

      document.getElementById('btn-modal-open-structure')?.addEventListener('click', () => {
        this.showMappingStructureModal();
      });

      const fileInput = document.getElementById('input-mapping-file');
      fileInput?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
        const isJson = file.name.endsWith('.json');

        const reader = new FileReader();

        if (isExcel) {
          reader.readAsArrayBuffer(file);
          reader.onload = (evt) => {
            try {
              if (!window.XLSX) {
                alert('SheetJS (xlsx) library not loaded');
                return;
              }
              const data = new Uint8Array(evt.target.result);
              const workbook = XLSX.read(data, { type: 'array' });
              const sheetName = workbook.SheetNames[0];
              const rawRecords = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
              this.handleParsedMappingRecords(rawRecords);
            } catch (err) {
              alert('Error reading Excel file: ' + err.message);
            }
          };
        } else if (isJson) {
          reader.readAsText(file);
          reader.onload = (evt) => {
            try {
              let parsed = JSON.parse(evt.target.result);
              let rawRecords = [];
              if (Array.isArray(parsed)) {
                rawRecords = parsed;
              } else if (parsed.mappings && Array.isArray(parsed.mappings)) {
                rawRecords = parsed.mappings;
              } else if (parsed.columns && Array.isArray(parsed.columns)) {
                rawRecords = parsed.columns;
              } else if (parsed.dataSource && parsed.dataSource.mappings && Array.isArray(parsed.dataSource.mappings)) {
                rawRecords = parsed.dataSource.mappings;
              } else if (typeof parsed === 'object') {
                rawRecords = Object.values(parsed).filter(v => typeof v === 'object');
              }
              this.handleParsedMappingRecords(rawRecords);
            } catch (err) {
              alert('Invalid JSON file format: ' + err.message);
            }
          };
        } else {
          // CSV
          reader.readAsText(file);
          reader.onload = (evt) => {
            try {
              if (window.XLSX) {
                const workbook = XLSX.read(evt.target.result, { type: 'string' });
                const sheetName = workbook.SheetNames[0];
                const rawRecords = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
                this.handleParsedMappingRecords(rawRecords);
              } else {
                const rawRecords = this.parseCsvText(evt.target.result);
                this.handleParsedMappingRecords(rawRecords);
              }
            } catch (err) {
              alert('Error parsing CSV file: ' + err.message);
            }
          };
        }
      });
    },

    handleParsedMappingRecords(rawRecords) {
      if (!Array.isArray(rawRecords) || rawRecords.length === 0) {
        this.showToast('No records found in uploaded file', 'warning');
        return;
      }

      const normalized = rawRecords
        .map(rec => this.normalizeMappingRecord(rec))
        .filter(Boolean);

      if (normalized.length === 0) {
        this.showToast('No matching mapping columns found. Please check expected headers.', 'error');
        return;
      }

      this._pendingMappingImports = normalized;

      const previewBox = document.getElementById('mapping-import-preview-box');
      const previewBadge = document.getElementById('mapping-preview-badge');
      const tbody = document.getElementById('tbody-mapping-import-preview');
      const confirmBtn = document.getElementById('btn-confirm-mapping-import');

      if (previewBox && tbody) {
        previewBox.style.display = 'block';
        if (previewBadge) previewBadge.textContent = `${normalized.length} valid rows detected`;
        if (confirmBtn) confirmBtn.textContent = `Confirm Import (${normalized.length} Rows)`;

        const sampleRows = normalized.slice(0, 5);
        tbody.innerHTML = sampleRows.map(m => `
          <tr>
            <td><strong>${this.escapeHtml(m.sourceCol || '')}</strong></td>
            <td><strong>${this.escapeHtml(m.targetCol || '')}</strong></td>
            <td><code>${this.escapeHtml(m.dataType || '')}</code></td>
            <td>${this.escapeHtml(m.rule || '')}</td>
            <td><span class="badge ${m.nullable === 'YES' ? 'badge-warning' : 'badge-info'}">${this.escapeHtml(m.nullable || 'NO')}</span></td>
            <td>${this.escapeHtml(m.description || '')}</td>
          </tr>
        `).join('') + (normalized.length > 5 ? `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 8px;">... and ${normalized.length - 5} more rows</td></tr>` : '');
      }
    },

    exportMappingsToExcel() {
      this.syncDocFromForm();
      const mappings = this.currentDoc?.dataSource?.mappings || [];
      if (mappings.length === 0) {
        this.showToast('No column mappings to export', 'warning');
        return;
      }
      if (!window.XLSX) {
        this.showToast('Excel library not loaded', 'error');
        return;
      }
      const data = mappings.map(m => ({
        'Source Column': m.sourceCol,
        'Target Column': m.targetCol,
        'Data Type': m.dataType,
        'Transformation Logic': m.rule,
        'Nullable?': m.nullable,
        'Description': m.description
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'ColumnMappings');
      const filename = `${this.currentDoc?.id || 'document'}_mappings.xlsx`;
      XLSX.writeFile(wb, filename);
      this.showToast('Column mappings exported to Excel', 'success');
    },

    downloadSampleMappingsJson() {
      const sample = [
        {
          sourceCol: "SRC_CUST_ID",
          targetCol: "customer_id",
          dataType: "VARCHAR(50)",
          rule: "TRIM(UPPER(SRC_CUST_ID))",
          nullable: "NO",
          description: "Primary unique identifier for customer record"
        },
        {
          sourceCol: "FIRST_NM",
          targetCol: "first_name",
          dataType: "VARCHAR(100)",
          rule: "INITCAP(TRIM(FIRST_NM))",
          nullable: "YES",
          description: "Customer given first name"
        },
        {
          sourceCol: "LAST_NM",
          targetCol: "last_name",
          dataType: "VARCHAR(100)",
          rule: "INITCAP(TRIM(LAST_NM))",
          nullable: "NO",
          description: "Customer family last name"
        },
        {
          sourceCol: "EMAIL_ADDR",
          targetCol: "email_address",
          dataType: "VARCHAR(255)",
          rule: "LOWER(TRIM(EMAIL_ADDR))",
          nullable: "YES",
          description: "Standardized customer email address"
        },
        {
          sourceCol: "SIGNUP_DT",
          targetCol: "registration_timestamp",
          dataType: "TIMESTAMP_NTZ",
          rule: "TO_TIMESTAMP_NTZ(SIGNUP_DT, 'YYYY-MM-DD HH24:MI:SS')",
          nullable: "NO",
          description: "Account registration datetime in UTC"
        }
      ];
      const blob = new Blob([JSON.stringify(sample, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'dqd_mappings_template.json';
      a.click();
    },

    downloadSampleMappingsExcel() {
      if (!window.XLSX) {
        this.showToast('Excel library not loaded', 'error');
        return;
      }
      const sample = [
        {
          "Source Column": "SRC_CUST_ID",
          "Target Column": "customer_id",
          "Data Type": "VARCHAR(50)",
          "Transformation Logic": "TRIM(UPPER(SRC_CUST_ID))",
          "Nullable?": "NO",
          "Description": "Primary unique identifier for customer record"
        },
        {
          "Source Column": "FIRST_NM",
          "Target Column": "first_name",
          "Data Type": "VARCHAR(100)",
          "Transformation Logic": "INITCAP(TRIM(FIRST_NM))",
          "Nullable?": "YES",
          "Description": "Customer given first name"
        },
        {
          "Source Column": "LAST_NM",
          "Target Column": "last_name",
          "Data Type": "VARCHAR(100)",
          "Transformation Logic": "INITCAP(TRIM(LAST_NM))",
          "Nullable?": "NO",
          "Description": "Customer family last name"
        },
        {
          "Source Column": "EMAIL_ADDR",
          "Target Column": "email_address",
          "Data Type": "VARCHAR(255)",
          "Transformation Logic": "LOWER(TRIM(EMAIL_ADDR))",
          "Nullable?": "YES",
          "Description": "Standardized customer email address"
        },
        {
          "Source Column": "SIGNUP_DT",
          "Target Column": "registration_timestamp",
          "Data Type": "TIMESTAMP_NTZ",
          "Transformation Logic": "TO_TIMESTAMP_NTZ(SIGNUP_DT, 'YYYY-MM-DD HH24:MI:SS')",
          "Nullable?": "NO",
          "Description": "Account registration datetime in UTC"
        }
      ];
      const ws = XLSX.utils.json_to_sheet(sample);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'ColumnMappings');
      XLSX.writeFile(wb, 'dqd_mappings_template.xlsx');
    },

    downloadSampleMappingsCsv() {
      const csv = `"Source Column","Target Column","Data Type","Transformation Logic","Nullable?","Description"
"SRC_CUST_ID","customer_id","VARCHAR(50)","TRIM(UPPER(SRC_CUST_ID))","NO","Primary unique identifier for customer record"
"FIRST_NM","first_name","VARCHAR(100)","INITCAP(TRIM(FIRST_NM))","YES","Customer given first name"
"LAST_NM","last_name","VARCHAR(100)","INITCAP(TRIM(LAST_NM))","NO","Customer family last name"
"EMAIL_ADDR","email_address","VARCHAR(255)","LOWER(TRIM(EMAIL_ADDR))","YES","Standardized customer email address"
"SIGNUP_DT","registration_timestamp","TIMESTAMP_NTZ","TO_TIMESTAMP_NTZ(SIGNUP_DT, 'YYYY-MM-DD HH24:MI:SS')","NO","Account registration datetime in UTC"`;
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'dqd_mappings_template.csv';
      a.click();
    },

    renderEditorSqlQueriesCardsHtml() {
      const doc = this.currentDoc;
      if (!doc.sqlQueries || !Array.isArray(doc.sqlQueries) || doc.sqlQueries.length === 0) {
        doc.sqlQueries = [
          {
            id: 'Q-1',
            title: 'Primary Validation Query',
            dialect: doc.sqlDialect || 'Snowflake',
            query: doc.sqlQuery || '',
            notes: doc.sqlNotes || ''
          }
        ];
      }

      return doc.sqlQueries.map((q, idx) => `
        <div class="card sql-query-card" data-idx="${idx}" style="margin-bottom: 20px; border: 1px solid var(--surface-border-strong); box-shadow: var(--shadow-sm);">
          <div class="card-header" style="flex-wrap: wrap; gap: 10px; background: var(--surface-alt);">
            <div style="display: flex; align-items: center; gap: 10px; flex: 1; min-width: 280px; flex-wrap: wrap;">
              <span class="badge badge-info" style="font-size: 11px; font-weight: 700;">Query #${idx + 1}</span>
              <input type="text" class="form-control form-control-sm sql-q-title" value="${this.escapeHtml(q.title || `Query ${idx + 1}`)}" placeholder="e.g. Primary Assertion / Defect Extraction" style="font-weight: 700; width: 280px;" title="Click to rename query">
              <select class="form-control form-control-sm sql-q-dialect" style="width: 140px;" title="Select SQL dialect">
                <option value="Snowflake" ${q.dialect === 'Snowflake' ? 'selected' : ''}>Snowflake</option>
                <option value="Trino" ${q.dialect === 'Trino' ? 'selected' : ''}>Trino</option>
                <option value="PostgreSQL" ${q.dialect === 'PostgreSQL' ? 'selected' : ''}>PostgreSQL</option>
                <option value="MySQL" ${q.dialect === 'MySQL' ? 'selected' : ''}>MySQL</option>
                <option value="SQL Server" ${q.dialect === 'SQL Server' ? 'selected' : ''}>SQL Server</option>
                <option value="ANSI SQL" ${q.dialect === 'ANSI SQL' ? 'selected' : ''}>ANSI SQL</option>
              </select>
            </div>
            <div style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap;">
              <button class="btn btn-outline btn-sm btn-format-query-sql" data-idx="${idx}" title="Beautify & capitalize Trino SQL keywords">🎨 Format</button>
              <button class="btn btn-outline btn-sm btn-toggle-syntax-preview" data-idx="${idx}" title="Toggle syntax-highlighted preview">👁️ Syntax</button>
              <button class="btn btn-outline btn-sm btn-copy-query-sql" data-idx="${idx}" title="Copy this SQL query">📋 Copy</button>
              <button class="btn btn-outline btn-sm btn-find-query-sql" data-idx="${idx}" title="Search in this SQL query">🔍 Find</button>
              ${doc.sqlQueries.length > 1 ? `<button class="btn btn-outline btn-sm btn-delete-query-card" data-idx="${idx}" style="color: #ef4444;" title="Remove this query">🗑️ Remove</button>` : ''}
            </div>
          </div>
          <div class="card-body" style="padding: 0;">
            <div class="sql-editor-container">
              <div class="sql-editor-toolbar">
                <div class="sql-toolbar-left">
                  <span>Dialect: <strong class="sql-lbl-dialect-card">${this.escapeHtml(q.dialect || 'Snowflake')}</strong></span>
                  <span style="opacity: 0.5;">|</span>
                  <span class="sql-lbl-stats-card">0 lines</span>
                </div>
                <div class="sql-toolbar-right">
                  <span style="font-size: 11px; opacity: 0.8;">Exact SQL Preserved. No execution.</span>
                </div>
              </div>
              <div class="sql-editor-body">
                <div class="sql-line-numbers sql-line-numbers-card" data-idx="${idx}">1</div>
                <textarea class="sql-input-area sql-q-textarea" data-idx="${idx}" spellcheck="false" placeholder="-- Enter SQL validation assertion here...&#10;SELECT * FROM table WHERE condition;">${this.escapeHtml(q.query || '')}</textarea>
              </div>
              <div class="sql-syntax-preview sql-syntax-preview-card" data-idx="${idx}"></div>
            </div>
            <div style="padding: 10px 16px; background: var(--surface-color); border-top: 1px solid var(--surface-border);">
              <div class="form-group" style="margin-bottom: 0;">
                <label class="form-label" style="font-size: 11px;">Query Notes & Execution Purpose</label>
                <input type="text" class="form-control form-control-sm sql-q-notes" value="${this.escapeHtml(q.notes || '')}" placeholder="e.g. Primary count assertion, or defect sample query for investigation">
              </div>
            </div>
          </div>
        </div>
      `).join('');
    },

    updateEditorSqlQueriesView() {
      const container = document.getElementById('container-sql-query-cards');
      if (!container) return;
      container.innerHTML = this.renderEditorSqlQueriesCardsHtml();
      
      const badge = document.getElementById('badge-sql-query-count');
      if (badge && this.currentDoc?.sqlQueries) {
        const count = this.currentDoc.sqlQueries.length;
        badge.textContent = `${count} ${count === 1 ? 'Query' : 'Queries'}`;
      }

      this.bindEditorSqlQueries();
    },

    bindEditorSqlQueries() {
      const container = document.getElementById('container-sql-query-cards');
      if (!container) return;

      // Wire up each query card
      container.querySelectorAll('.sql-query-card').forEach(card => {
        const idx = parseInt(card.dataset.idx, 10);
        const textarea = card.querySelector('.sql-q-textarea');
        const lineNumbers = card.querySelector('.sql-line-numbers-card');
        const stats = card.querySelector('.sql-lbl-stats-card');
        const dialectSelect = card.querySelector('.sql-q-dialect');
        const dialectLabel = card.querySelector('.sql-lbl-dialect-card');

        if (textarea && lineNumbers && stats) {
          const updateLines = () => {
            const lines = (textarea.value.match(/\n/g) || []).length + 1;
            let numStr = '';
            for (let i = 1; i <= lines; i++) numStr += i + '\n';
            lineNumbers.textContent = numStr;
            stats.textContent = lines + ' line' + (lines > 1 ? 's' : '');
          };
          textarea.addEventListener('input', updateLines);
          updateLines();
        }

        if (dialectSelect && dialectLabel) {
          dialectSelect.addEventListener('change', (e) => {
            dialectLabel.textContent = e.target.value;
          });
        }
      });

      // Copy query
      container.querySelectorAll('.btn-copy-query-sql').forEach(b => {
        b.onclick = (e) => {
          const idx = parseInt(e.currentTarget.dataset.idx, 10);
          const card = container.querySelector(`.sql-query-card[data-idx="${idx}"]`);
          const text = card?.querySelector('.sql-q-textarea')?.value || '';
          navigator.clipboard.writeText(text).then(() => {
            this.showToast(`Query #${idx + 1} copied to clipboard`, 'success');
          });
        };
      });

      // Format / Beautify query
      container.querySelectorAll('.btn-format-query-sql').forEach(b => {
        b.onclick = (e) => {
          const idx = parseInt(e.currentTarget.dataset.idx, 10);
          const card = container.querySelector(`.sql-query-card[data-idx="${idx}"]`);
          const textarea = card?.querySelector('.sql-q-textarea');
          if (textarea) {
            textarea.value = this.beautifyTrinoSql(textarea.value);
            textarea.dispatchEvent(new Event('input'));
            const preview = card?.querySelector('.sql-syntax-preview');
            if (preview && preview.classList.contains('active')) {
              preview.innerHTML = this.highlightTrinoSql(textarea.value);
            }
            this.showToast(`Query #${idx + 1} formatted & capitalized`, 'success');
          }
        };
      });

      // Toggle Syntax Highlight Preview
      container.querySelectorAll('.btn-toggle-syntax-preview').forEach(b => {
        b.onclick = (e) => {
          const idx = parseInt(e.currentTarget.dataset.idx, 10);
          const card = container.querySelector(`.sql-query-card[data-idx="${idx}"]`);
          const preview = card?.querySelector('.sql-syntax-preview');
          const textarea = card?.querySelector('.sql-q-textarea');
          if (preview && textarea) {
            if (preview.classList.contains('active')) {
              preview.classList.remove('active');
              b.classList.remove('btn-primary');
              b.classList.add('btn-outline');
            } else {
              preview.innerHTML = this.highlightTrinoSql(textarea.value);
              preview.classList.add('active');
              b.classList.remove('btn-outline');
              b.classList.add('btn-primary');
            }
          }
        };
      });

      // Find in query
      container.querySelectorAll('.btn-find-query-sql').forEach(b => {
        b.onclick = (e) => {
          const idx = parseInt(e.currentTarget.dataset.idx, 10);
          const card = container.querySelector(`.sql-query-card[data-idx="${idx}"]`);
          const textarea = card?.querySelector('.sql-q-textarea');
          if (!textarea) return;
          const query = prompt('Search term in SQL query:');
          if (query) {
            const pos = textarea.value.toLowerCase().indexOf(query.toLowerCase());
            if (pos >= 0) {
              textarea.focus();
              textarea.setSelectionRange(pos, pos + query.length);
              this.showToast(`Found "${query}" at position ${pos}`, 'info');
            } else {
              this.showToast(`"${query}" not found in query`, 'warning');
            }
          }
        };
      });

      // Delete query
      container.querySelectorAll('.btn-delete-query-card').forEach(b => {
        b.onclick = (e) => {
          this.syncDocFromForm();
          const idx = parseInt(e.currentTarget.dataset.idx, 10);
          if (this.currentDoc?.sqlQueries && this.currentDoc.sqlQueries.length > 1) {
            this.currentDoc.sqlQueries.splice(idx, 1);
            this.updateEditorSqlQueriesView();
            this.showToast('SQL query removed', 'info');
          }
        };
      });

      // Global buttons inside Step 4
      const addBtn = document.getElementById('btn-add-new-sql-query');
      if (addBtn) {
        addBtn.onclick = () => {
          this.syncDocFromForm();
          if (!this.currentDoc.sqlQueries) this.currentDoc.sqlQueries = [];
          const num = this.currentDoc.sqlQueries.length + 1;
          this.currentDoc.sqlQueries.push({
            id: `Q-${num}`,
            title: `Query ${num}: Validation Assertion`,
            dialect: this.currentDoc.sqlQueries[0]?.dialect || 'Snowflake',
            query: '',
            notes: ''
          });
          this.updateEditorSqlQueriesView();
          this.showToast(`Added Query #${num}`, 'success');
        };
      }

      const copyAllBtn = document.getElementById('btn-copy-all-sql-queries');
      if (copyAllBtn) {
        copyAllBtn.onclick = () => {
          this.syncDocFromForm();
          const queries = this.currentDoc?.sqlQueries || [];
          if (queries.length === 0) {
            this.showToast('No queries to copy', 'warning');
            return;
          }
          const allSql = queries.map((q, idx) => `/* ========================================================
   QUERY ${idx + 1}: ${q.title || `Query ${idx + 1}`}
   Dialect: ${q.dialect || 'SQL'}
   ${q.notes ? `Note: ${q.notes}` : ''}
   ======================================================== */
${q.query || '-- No SQL specified'}
`).join('\n\n');
          navigator.clipboard.writeText(allSql).then(() => {
            this.showToast('All SQL queries copied to clipboard', 'success');
          });
        };
      }
    },

    updateEditorRulesTable() {
      const tbody = document.getElementById('tbody-doc-rules');
      if (!tbody) return;
      const rules = this.currentDoc?.rules || [];
      if (rules.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 24px;">No validation rules attached yet.</td></tr>';
      } else {
        tbody.innerHTML = rules.map((r, idx) => `
          <tr>
            <td><strong>${this.escapeHtml(r.id)}</strong></td>
            <td>${this.escapeHtml(r.name)}</td>
            <td><span class="badge badge-info">${this.escapeHtml(r.dimension)}</span></td>
            <td>${this.getSeverityBadge(r.severity)}</td>
            <td>${this.escapeHtml(r.expectedResult || '')}</td>
            <td>${this.escapeHtml(r.threshold || '0')}</td>
            <td>
              <button class="btn btn-outline btn-sm btn-doc-delete-rule" data-idx="${idx}">Remove</button>
            </td>
          </tr>
        `).join('');
      }
      this.bindEditorRulesDeleteButtons();
    },

    bindEditorRulesDeleteButtons() {
      const tbody = document.getElementById('tbody-doc-rules');
      if (!tbody) return;
      tbody.querySelectorAll('.btn-doc-delete-rule').forEach(b => {
        b.onclick = (e) => {
          const idx = parseInt(e.target.dataset.idx, 10);
          if (this.currentDoc?.rules && this.currentDoc.rules[idx] !== undefined) {
            this.currentDoc.rules.splice(idx, 1);
            this.updateEditorRulesTable();
            this.showToast('Rule removed from document', 'info');
          }
        };
      });
    },

    updateEditorExecutionsTable() {
      const tbody = document.getElementById('tbody-doc-executions');
      if (!tbody) return;
      const execs = this.currentDoc?.executions || [];
      if (execs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 24px;">No executions logged yet.</td></tr>';
      } else {
        tbody.innerHTML = execs.map(e => `
          <tr>
            <td>${new Date(e.timestamp).toLocaleString()}</td>
            <td><span class="badge badge-info">${e.environment || 'PROD'}</span></td>
            <td>${this.getStatusBadge(e.status)}</td>
            <td>${(e.totalRecords || 0).toLocaleString()}</td>
            <td style="color: var(--status-passed); font-weight: 600;">${(e.passedRecords || 0).toLocaleString()}</td>
            <td style="color: ${e.failedRecords > 0 ? 'var(--status-failed)' : 'inherit'}; font-weight: 600;">${(e.failedRecords || 0).toLocaleString()}</td>
            <td>${e.failurePercentage ? e.failurePercentage + '%' : '0.0%'}</td>
            <td><span style="font-family: monospace; font-size: 11px;">${this.escapeHtml(e.evidence || 'N/A')}</span></td>
          </tr>
        `).join('');
      }
    },

    updateEditorIssuesTable() {
      const tbody = document.getElementById('tbody-doc-issues');
      if (!tbody) return;
      const issues = this.currentDoc?.issues || [];
      if (issues.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 24px;">No linked issues found.</td></tr>';
      } else {
        tbody.innerHTML = issues.map(iss => `
          <tr>
            <td><strong>${iss.id}</strong></td>
            <td>${this.escapeHtml(iss.title)}</td>
            <td>${this.getSeverityBadge(iss.severity)}</td>
            <td>${this.getStatusBadge(iss.status)}</td>
            <td>${this.escapeHtml(iss.owner || 'Unassigned')}</td>
            <td>${iss.deadline || 'N/A'}</td>
            <td>${this.escapeHtml(iss.rootCause || 'N/A')}</td>
            <td style="text-align: right; white-space: nowrap;">
              <div style="display: flex; gap: 6px; justify-content: flex-end;">
                <button type="button" class="btn btn-outline btn-sm btn-edit-doc-issue" onclick="window.DQD_App.showEditIssueModalById('${this.escapeHtml(iss.id)}'); event.stopPropagation();" data-id="${this.escapeHtml(iss.id)}" title="Edit Issue">
                  <span>✏️</span> Edit
                </button>
                <button type="button" class="btn btn-outline btn-sm btn-delete-doc-issue" onclick="window.DQD_App.deleteIssue('${this.escapeHtml(iss.id)}'); event.stopPropagation();" data-id="${this.escapeHtml(iss.id)}" style="color: #ef4444; border-color: rgba(239, 68, 68, 0.4);" title="Delete Issue">
                  <span>🗑️</span> Delete
                </button>
              </div>
            </td>
          </tr>
        `).join('');

        tbody.querySelectorAll('.btn-edit-doc-issue').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const issueId = btn.dataset.id;
            this.showEditIssueModalById(issueId);
          });
        });

        tbody.querySelectorAll('.btn-delete-doc-issue').forEach(btn => {
          btn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            const issueId = btn.dataset.id;
            await this.deleteIssue(issueId);
          });
        });
      }
    },

    updateEditorGovernanceView() {
      const vContainer = document.getElementById('container-doc-version-history');
      if (vContainer) {
        const history = this.currentDoc?.versionHistory || [];
        vContainer.innerHTML = history.length === 0 ? '<div style="color: var(--text-muted);">No snapshot versions created yet.</div>' : history.map(v => `
          <div style="border-left: 3px solid var(--secondary-color); padding-left: 12px; margin-bottom: 16px;">
            <div style="display: flex; justify-content: space-between;">
              <strong>Version ${v.version}</strong>
              <span style="font-size: 11px; color: var(--text-muted);">${new Date(v.createdAt).toLocaleDateString()} by ${this.escapeHtml(v.author || 'Author')}</span>
            </div>
            <div style="font-size: 13px; margin-top: 4px;">${this.escapeHtml(v.summary || 'No summary entered.')}</div>
          </div>
        `).join('');
      }

      const aContainer = document.getElementById('container-doc-approvals');
      if (aContainer) {
        const approvals = this.currentDoc?.approvals || [];
        aContainer.innerHTML = approvals.length === 0 ? '<div style="color: var(--text-muted);">No formal sign-offs recorded yet.</div>' : approvals.map(app => `
          <div style="background: var(--surface-alt); padding: 12px; border-radius: var(--border-radius-sm); margin-bottom: 12px; border: 1px solid var(--surface-border);">
            <div style="display: flex; justify-content: space-between;">
              <strong>${this.escapeHtml(app.reviewer || 'Reviewer')}</strong>
              <span class="badge ${app.status === 'Approved' ? 'badge-passed' : 'badge-status-in-review'}">${app.status}</span>
            </div>
            <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">${new Date(app.timestamp).toLocaleString()}</div>
            <div style="font-size: 13px; margin-top: 6px;">${this.escapeHtml(app.comments || '')}</div>
          </div>
        `).join('');
      }
    },

    getMissingRequiredFields(doc) {
      const profile = this.getActiveProfile();
      const required = (profile && profile.requiredFields) || this.config.requiredFields || [];
      const missing = [];

      required.forEach(field => {
        switch (field) {
          case 'rule_name':
          case 'analysis_title':
          case 'pipeline_name':
          case 'model_name':
            if (!doc.title) missing.push('Document Title');
            break;
          case 'rule_description':
          case 'business_objective':
            if (!doc.executiveSummary && !doc.businessObjective) missing.push('Executive Summary / Objective');
            break;
          case 'validation_type':
          case 'model_type':
            if (!doc.documentType && !doc.validationType) missing.push('Document / Specification Type');
            break;
          case 'data_source':
          case 'source_system':
          case 'target_schema':
            if (!doc.dataSource?.system && !(doc.dataSource?.tables && doc.dataSource.tables.length > 0)) missing.push('Data Source / Entities');
            break;
          case 'sql_query':
            const hasAnySql = (doc.sqlQueries && doc.sqlQueries.some(q => q.query && q.query.trim())) || (doc.sqlQuery && doc.sqlQuery.trim());
            if (!hasAnySql) missing.push('SQL / Code Query');
            break;
          case 'expected_result':
          case 'metric_formula':
          case 'surrogate_key_strategy':
            if (!doc.expectedResult && !doc.businessObjective) missing.push('Expected Criteria / Metric Formula');
            break;
        }
      });

      return missing;
    },

    // ====================================================================
    // 8. DOCUMENT DELETION, CLONING & VERSION SNAPSHOTS
    // ====================================================================

    async deleteDocument(docId, options = {}) {
      if (!docId) return false;
      const doc = (this.documents || []).find(d => d.id === docId) || (this.currentDoc && this.currentDoc.id === docId ? this.currentDoc : null);
      const docTitle = doc ? (doc.title || doc.id) : docId;

      if (!options.silent) {
        const confirmed = confirm(`Are you sure you want to permanently delete document "${docTitle}" (${docId})?\n\nThis cannot be undone.`);
        if (!confirmed) return false;
      }

      try {
        await this.dbDelete('documents', docId);
        this.documents = (this.documents || []).filter(d => d.id !== docId);
        await this.logAudit('Document Deleted', `Deleted document: ${docTitle} [${docId}]`, (this.currentUser && this.currentUser.username) || 'User', docId);
        this.updateSidebarBadges();

        // If currently editing this deleted document, reset and navigate to documents list
        if (this.currentDoc && (this.currentDoc.id === docId || this.currentDoc._originalId === docId)) {
          this.currentDoc = null;
          this.navigateTo('documents');
        } else if (this.currentView === 'documents') {
          this.updateDocumentsTable();
        } else if (this.currentView === 'dashboard') {
          const mainContainer = document.getElementById('view-dashboard') || document.getElementById('app-main');
          if (mainContainer) this.renderDashboard(mainContainer);
        }

        this.showToast(`Document "${docTitle}" deleted successfully`, 'success');
        return true;
      } catch (err) {
        console.error('Failed to delete document:', err);
        this.showToast(`Failed to delete document: ${err.message}`, 'error');
        return false;
      }
    },

    showCloneModal(docId) {
      const source = this.documents.find(d => d.id === docId);
      if (!source) return;

      const newId = 'DOC-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + Math.floor(1000 + Math.random() * 9000);

      this.openModal('Clone Document', `
        <div class="form-group">
          <label class="form-label">New Document ID</label>
          <input type="text" id="clone-input-id" class="form-control" value="${newId}" readonly>
        </div>
        <div class="form-group">
          <label class="form-label">New Document Title</label>
          <input type="text" id="clone-input-title" class="form-control" value="Clone of ${this.escapeHtml(source.title)}">
        </div>
        <div style="margin-top: 14px;">
          <label class="form-label">Select Components to Clone:</label>
          <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 6px;">
            <label><input type="checkbox" id="clone-chk-meta" checked> Copy Metadata & Executive Summary</label>
            <label><input type="checkbox" id="clone-chk-sources" checked> Copy Data Sources & Column Mappings</label>
            <label><input type="checkbox" id="clone-chk-sql" checked> Copy SQL Queries & Comments</label>
            <label><input type="checkbox" id="clone-chk-rules" checked> Copy Associated Validation Rules</label>
            <label><input type="checkbox" id="clone-chk-exec"> Copy Previous Execution Results (Unchecked by default)</label>
            <label><input type="checkbox" id="clone-chk-issues"> Copy Linked Issues & Defect Statuses</label>
            <label><input type="checkbox" id="clone-chk-approvals"> Copy Approvals (Unchecked: resets to Draft)</label>
          </div>
        </div>
      `, [
        { label: 'Cancel', class: 'btn-outline', action: () => this.closeModal() },
        { label: 'Create Clone', class: 'btn-primary', action: async () => {
          const now = new Date().toISOString();
          const cloned = {
            id: document.getElementById('clone-input-id').value,
            title: document.getElementById('clone-input-title').value,
            teamProfile: source.teamProfile || this.getActiveProfileKey() || 'data_quality',
            teamAttributes: source.teamAttributes ? JSON.parse(JSON.stringify(source.teamAttributes)) : {},
            validationType: source.validationType || source.documentType || 'Model Validation',
            team: source.team || '',
            usernames: Array.isArray(source.usernames) ? [...source.usernames] : (source.owner ? [source.owner] : []),
            userInfo: source.userInfo ? JSON.parse(JSON.stringify(source.userInfo)) : null,
            models: Array.isArray(source.models) ? [...source.models] : [],
            tables: Array.isArray(source.tables) ? [...source.tables] : [],
            documentType: source.documentType,
            businessDomain: source.businessDomain,
            owner: source.owner,
            reviewer: '',
            status: document.getElementById('clone-chk-approvals').checked ? source.status : 'Draft',
            priority: source.priority,
            executionFrequency: source.executionFrequency,
            version: '1.0',
            createdAt: now,
            updatedAt: now,
            executiveSummary: document.getElementById('clone-chk-meta').checked ? source.executiveSummary : '',
            businessObjective: document.getElementById('clone-chk-meta').checked ? source.businessObjective : '',
            dataSource: document.getElementById('clone-chk-sources').checked ? JSON.parse(JSON.stringify(source.dataSource || {})) : {},
            sqlDialect: source.sqlDialect,
            sqlQuery: document.getElementById('clone-chk-sql').checked ? source.sqlQuery : '',
            sqlNotes: document.getElementById('clone-chk-sql').checked ? source.sqlNotes : '',
            sqlQueries: document.getElementById('clone-chk-sql').checked ? JSON.parse(JSON.stringify(source.sqlQueries || [])) : [],
            expectedResult: source.expectedResult,
            actualResult: document.getElementById('clone-chk-exec').checked ? source.actualResult : '',
            threshold: source.threshold,
            remediation: source.remediation,
            rules: document.getElementById('clone-chk-rules').checked ? JSON.parse(JSON.stringify(source.rules || [])) : [],
            executions: document.getElementById('clone-chk-exec').checked ? JSON.parse(JSON.stringify(source.executions || [])) : [],
            issues: document.getElementById('clone-chk-issues').checked ? JSON.parse(JSON.stringify(source.issues || [])) : [],
            approvals: document.getElementById('clone-chk-approvals').checked ? JSON.parse(JSON.stringify(source.approvals || [])) : [],
            screenshots: Array.isArray(source.screenshots) ? JSON.parse(JSON.stringify(source.screenshots)) : [],
            versionHistory: [
              {
                version: '1.0',
                createdAt: now,
                author: (this.currentUser && this.currentUser.username) || 'User',
                summary: `Cloned from ${source.id}`
              }
            ]
          };

          await this.dbPut('documents', cloned);
          this.documents.unshift(cloned);
          await this.logAudit('Document Cloned', `Cloned document ${source.id} into new document ${cloned.id}`, (this.currentUser && this.currentUser.username) || 'User', cloned.id);
          this.closeModal();
          this.updateSidebarBadges();
          this.currentDoc = cloned;
          this.navigateTo('editor');
          this.showToast('Document cloned successfully', 'success');
        }}
      ]);
    },

    promptCreateVersionSnapshot() {
      this.syncDocFromForm();
      const currentVer = parseFloat(this.currentDoc.version || '1.0');
      const nextVer = (currentVer + 0.1).toFixed(1);

      this.openModal('Create Version Snapshot', `
        <div class="form-group">
          <label class="form-label">New Version Number</label>
          <input type="text" id="ver-input-num" class="form-control" value="${nextVer}">
        </div>
        <div class="form-group">
          <label class="form-label">Author Name</label>
          <input type="text" id="ver-input-author" class="form-control" value="${this.escapeHtml(this.currentDoc.owner || (Array.isArray(this.currentDoc.usernames) && this.currentDoc.usernames[0]) || '')}" placeholder="e.g. Sarah Jenkins">
        </div>
        <div class="form-group">
          <label class="form-label">Change Summary Notes</label>
          <textarea id="ver-input-summary" class="form-control" rows="3" placeholder="Describe the updates in this version..."></textarea>
        </div>
      `, [
        { label: 'Cancel', class: 'btn-outline', action: () => this.closeModal() },
        { label: 'Save Version Snapshot', class: 'btn-primary', action: async () => {
          const vNum = document.getElementById('ver-input-num').value.trim();
          const author = document.getElementById('ver-input-author').value.trim();
          const summary = document.getElementById('ver-input-summary').value.trim();

          this.currentDoc.version = vNum;
          this.currentDoc.versionHistory = this.currentDoc.versionHistory || [];
          this.currentDoc.versionHistory.push({
            version: vNum,
            createdAt: new Date().toISOString(),
            author,
            summary
          });

          await this.saveCurrentDocument();
          this.closeModal();
          this.updateEditorGovernanceView();
          this.showToast(`Snapshot version ${vNum} created`, 'success');
        }}
      ]);
    },

    // ====================================================================
    // 9. VIEW: TEMPLATES
    // ====================================================================

    renderTemplates(container) {
      const activeFilter = this.activeTplProfileFilter || 'all';
      const filteredTemplates = this.templates.filter(tpl => {
        if (activeFilter === 'all') return true;
        if (tpl.teamProfile) return tpl.teamProfile === activeFilter;
        // Legacy templates default to data_quality
        return activeFilter === 'data_quality';
      });

      container.innerHTML = `
        <div class="card">
          <div class="card-header">
            <div>
              <span class="card-title">Standardized Technical Documentation Templates</span>
              <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">Pre-built enterprise blueprints tailored for each data engineering and analytics discipline</div>
            </div>
            <div style="display: flex; gap: 8px;">
              <button class="btn btn-outline btn-sm" id="btn-export-templates">Export Templates JSON</button>
              <button class="btn btn-primary btn-sm" id="btn-new-custom-template">➕ Create Custom Template</button>
            </div>
          </div>
          <div class="card-body">
            <!-- Team Profile Filter Buttons -->
            <div style="display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap; border-bottom: 1px solid var(--surface-border); padding-bottom: 14px;">
              <button class="btn btn-sm ${activeFilter === 'all' ? 'btn-primary' : 'btn-outline'} btn-tpl-filter" data-filter="all">All Disciplines (${this.templates.length})</button>
              <button class="btn btn-sm ${activeFilter === 'data_quality' ? 'btn-primary' : 'btn-outline'} btn-tpl-filter" data-filter="data_quality">🛡️ Data Quality</button>
              <button class="btn btn-sm ${activeFilter === 'data_analysis' ? 'btn-primary' : 'btn-outline'} btn-tpl-filter" data-filter="data_analysis">📈 Data Analysis</button>
              <button class="btn btn-sm ${activeFilter === 'data_engineering' ? 'btn-primary' : 'btn-outline'} btn-tpl-filter" data-filter="data_engineering">⚙️ Data Engineering</button>
              <button class="btn btn-sm ${activeFilter === 'data_modelling' ? 'btn-primary' : 'btn-outline'} btn-filter-tpl btn-tpl-filter" data-filter="data_modelling">📐 Data Modelling</button>
            </div>

            <div class="grid-cols-3">
              ${filteredTemplates.map(tpl => {
                const profileKey = tpl.teamProfile || 'data_quality';
                const profileObj = this.config.teamProfiles && this.config.teamProfiles[profileKey];
                const badgeLabel = profileObj ? profileObj.name : (tpl.category || 'General');
                let badgeClass = 'badge-info';
                if (profileKey === 'data_quality') badgeClass = 'badge-info';
                else if (profileKey === 'data_analysis') badgeClass = 'badge-warning';
                else if (profileKey === 'data_engineering') badgeClass = 'badge-passed';
                else if (profileKey === 'data_modelling') badgeClass = 'badge-status-draft';

                return `
                <div class="card" style="margin-bottom: 0; display: flex; flex-direction: column; justify-content: space-between;">
                  <div class="card-body">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                      <span class="badge ${badgeClass}">${badgeLabel}</span>
                      <span style="font-size: 10px; color: var(--text-muted); text-transform: uppercase; font-weight: 600;">${tpl.category || 'Standard'}</span>
                    </div>
                    <h3 style="font-size: 15px; font-weight: 700; margin-bottom: 8px; color: var(--text-color);">${this.escapeHtml(tpl.name)}</h3>
                    <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 14px;">${this.escapeHtml(tpl.description || '')}</p>
                    <div style="font-size: 11px; color: var(--text-muted);">
                      <strong>Dialect:</strong> ${tpl.sqlDialect || 'ANSI SQL'}<br>
                      <strong>Rules:</strong> ${(tpl.rules || []).length} preconfigured
                    </div>
                  </div>
                  <div class="card-footer" style="justify-content: space-between;">
                    <button class="btn btn-outline btn-sm btn-tpl-preview" data-id="${tpl.id}">Preview</button>
                    <button class="btn btn-primary btn-sm btn-tpl-use" data-id="${tpl.id}">Use Template</button>
                  </div>
                </div>
                `;
              }).join('')}
            </div>
            ${filteredTemplates.length === 0 ? `
              <div style="text-align: center; padding: 40px; color: var(--text-muted);">
                <span style="font-size: 32px;">📋</span>
                <p style="margin-top: 8px;">No templates found for this discipline filter.</p>
              </div>
            ` : ''}
          </div>
        </div>
      `;

      // Filter button clicks
      container.querySelectorAll('.btn-tpl-filter').forEach(btn => {
        btn.addEventListener('click', () => {
          this.activeTplProfileFilter = btn.dataset.filter;
          this.renderTemplates(container);
        });
      });

      container.querySelectorAll('.btn-tpl-use').forEach(btn => {
        btn.addEventListener('click', () => {
          const tpl = this.templates.find(t => t.id === btn.dataset.id);
          if (tpl) {
            this.currentDoc = null;
            this.navigateTo('editor', { template: tpl });
          }
        });
      });

      container.querySelectorAll('.btn-tpl-preview').forEach(btn => {
        btn.addEventListener('click', () => {
          const tpl = this.templates.find(t => t.id === btn.dataset.id);
          if (tpl) {
            this.openModal(tpl.name, `
              <p><strong>Category:</strong> ${tpl.category}</p>
              <p><strong>Description:</strong> ${tpl.description}</p>
              <p><strong>Executive Summary:</strong> ${tpl.executiveSummary || 'N/A'}</p>
              <p><strong>Business Objective:</strong> ${tpl.businessObjective || 'N/A'}</p>
              <div style="margin-top: 12px;"><strong>Sample Query:</strong></div>
              <div class="sql-highlighted-box" style="margin-top: 6px;">${this.highlightSql(tpl.rules && tpl.rules[0] ? tpl.rules[0].sql : '-- No sample query')}</div>
            `, [
              { label: 'Close', class: 'btn-outline', action: () => this.closeModal() },
              { label: 'Use This Template', class: 'btn-primary', action: () => {
                this.closeModal();
                this.currentDoc = null;
                this.navigateTo('editor', { template: tpl });
              }}
            ]);
          }
        });
      });

      document.getElementById('btn-export-templates').addEventListener('click', () => {
        this.downloadJson(this.templates, 'dqd-templates-catalog.json');
      });

      document.getElementById('btn-new-custom-template').addEventListener('click', () => {
        this.showNewTemplateModal();
      });
    },

    applyTemplateToDoc(tpl) {
      this.currentDoc.documentType = tpl.documentType || tpl.name;
      this.currentDoc.title = `${tpl.name} - ${new Date().toISOString().slice(0, 10)}`;
      this.currentDoc.validationType = tpl.validationType || "Model Validation";
      this.currentDoc.team = tpl.team || "";
      this.currentDoc.usernames = Array.isArray(tpl.usernames) ? JSON.parse(JSON.stringify(tpl.usernames)) : (tpl.owner ? [tpl.owner] : []);
      this.currentDoc.owner = tpl.owner || (this.currentDoc.usernames[0] || "");
      this.currentDoc.reviewer = tpl.reviewer || "";
      this.currentDoc.status = tpl.status || "Draft";
      this.currentDoc.priority = tpl.priority || "Medium";
      this.currentDoc.executionFrequency = tpl.executionFrequency || "Daily";
      this.currentDoc.businessDomain = tpl.businessDomain || "";
      this.currentDoc.executiveSummary = tpl.executiveSummary || "";
      this.currentDoc.businessObjective = tpl.businessObjective || "";
      this.currentDoc.dataSource = JSON.parse(JSON.stringify(tpl.dataSource || {}));

      // Validated models
      const rawModels = tpl.validatedModels || [];
      this.currentDoc.validatedModels = rawModels.map((m, idx) => ({
        id: m.id || `M-${idx + 1}`,
        modelName: m.modelName || m.name || "",
        upstreamSources: m.upstreamSources || m.lineage || "",
        grain: m.grain || "",
        materialization: m.materialization || "Table",
        notes: m.notes || ""
      }));

      // Validated tables
      const rawTables = tpl.validatedTables || [];
      this.currentDoc.validatedTables = rawTables.map((t, idx) => ({
        id: t.id || `T-${idx + 1}`,
        tableName: t.tableName || t.name || "",
        schema: t.schema || (t.tableName && t.tableName.includes('.') ? t.tableName.split('.').slice(0, -1).join('.') : ""),
        storageFormat: t.storageFormat || t.format || "Parquet",
        partitionKeys: t.partitionKeys || t.partitionBy || "",
        volume: t.volume || "",
        notes: t.notes || ""
      }));

      // Dynamic inputs
      const rawDyn = tpl.dynamicInputs || tpl.dynamicFields || [];
      this.currentDoc.dynamicInputs = rawDyn.map((f, idx) => ({
        id: f.id || f.key || `f-${idx}`,
        label: f.label || "Field",
        value: f.value || ""
      }));

      // Rules
      this.currentDoc.rules = JSON.parse(JSON.stringify(tpl.rules || []));
      this.currentDoc.sqlDialect = tpl.sqlDialect || "Trino";

      // SQL Queries
      if (tpl.sqlQueries && Array.isArray(tpl.sqlQueries) && tpl.sqlQueries.length > 0) {
        this.currentDoc.sqlQueries = JSON.parse(JSON.stringify(tpl.sqlQueries));
      } else if (tpl.rules && tpl.rules.length > 0) {
        this.currentDoc.sqlQueries = tpl.rules.filter(r => r.sql).map((r, idx) => ({
          id: `Q-${idx + 1}`,
          title: r.name || `Query ${idx + 1}`,
          dialect: r.dialect || tpl.sqlDialect || "Trino",
          query: r.sql || "",
          notes: r.description || ""
        }));
      }

      if (this.currentDoc.sqlQueries && this.currentDoc.sqlQueries.length > 0) {
        this.currentDoc.sqlQuery = this.currentDoc.sqlQueries[0].query || "";
        this.currentDoc.sqlDialect = this.currentDoc.sqlQueries[0].dialect || tpl.sqlDialect || "Trino";
        this.currentDoc.sqlNotes = this.currentDoc.sqlQueries[0].notes || "";
      } else {
        this.currentDoc.sqlQuery = tpl.sqlQuery || "";
        this.currentDoc.sqlNotes = tpl.sqlNotes || "";
      }

      this.currentDoc.expectedResult = tpl.expectedResult || (tpl.rules && tpl.rules[0]?.expectedResult) || "";
      this.currentDoc.actualResult = tpl.actualResult || "";
      this.currentDoc.threshold = tpl.threshold || (tpl.rules && tpl.rules[0]?.threshold) || "0";
      this.currentDoc.remediation = tpl.remediation || "";
      this.currentDoc.executions = JSON.parse(JSON.stringify(tpl.executions || []));
      this.currentDoc.issues = JSON.parse(JSON.stringify(tpl.issues || []));
    },

    showNewTemplateModal() {
      this.openModal('Create New Template', `
        <div class="form-group">
          <label class="form-label required">Template Name</label>
          <input type="text" id="tpl-in-name" class="form-control" placeholder="e.g. Real-Time Telemetry Validation">
        </div>
        <div class="form-group">
          <label class="form-label">Category</label>
          <input type="text" id="tpl-in-category" class="form-control" placeholder="e.g. Streaming, Financial, Healthcare">
        </div>
        <div class="form-group">
          <label class="form-label">Description</label>
          <textarea id="tpl-in-desc" class="form-control" rows="2"></textarea>
        </div>
        <div class="form-group">
          <label class="form-label">Default SQL Dialect</label>
          <select id="tpl-in-dialect" class="form-control">
            <option value="Snowflake">Snowflake</option>
            <option value="PostgreSQL">PostgreSQL</option>
            <option value="Trino">Trino</option>
            <option value="MySQL">MySQL</option>
            <option value="ANSI SQL">ANSI SQL</option>
          </select>
        </div>
      `, [
        { label: 'Cancel', class: 'btn-outline', action: () => this.closeModal() },
        { label: 'Save Template', class: 'btn-primary', action: async () => {
          const name = document.getElementById('tpl-in-name').value.trim();
          if (!name) return alert('Name is required');
          const tpl = {
            id: 'tpl-custom-' + Date.now(),
            name,
            category: document.getElementById('tpl-in-category').value.trim() || 'Custom',
            description: document.getElementById('tpl-in-desc').value.trim(),
            sqlDialect: document.getElementById('tpl-in-dialect').value,
            rules: [],
            dataSource: { tables: [], mappings: [] }
          };
          await this.dbPut('templates', tpl);
          this.templates.push(tpl);
          this.closeModal();
          this.renderTemplates(document.getElementById('main-content-view'));
          this.showToast('Template created', 'success');
        }}
      ]);
    },

    // ====================================================================
    // 10. VIEW: VALIDATION RULES CATALOG
    // ====================================================================

    renderRules(container) {
      container.innerHTML = `
        <div class="card">
          <div class="card-header">
            <div style="display: flex; gap: 12px; align-items: center;">
              <input type="text" id="rule-filter-search" class="form-control" style="width: 240px;" placeholder="Search rules by ID, name...">
              <select id="rule-filter-dim" class="form-control" style="width: 170px;">
                <option value="">All Dimensions</option>
                <option value="Completeness">Completeness</option>
                <option value="Uniqueness">Uniqueness</option>
                <option value="Validity">Validity</option>
                <option value="Accuracy">Accuracy</option>
                <option value="Consistency">Consistency</option>
                <option value="Timeliness">Timeliness</option>
                <option value="Referential integrity">Referential integrity</option>
                <option value="Reconciliation">Reconciliation</option>
                <option value="Freshness">Freshness</option>
              </select>
            </div>
            <div style="display: flex; gap: 8px;">
              <button class="btn btn-outline btn-sm" id="btn-import-rules-csv">📥 Import CSV / Excel</button>
              <button class="btn btn-outline btn-sm" id="btn-export-rules-csv">💾 Export CSV</button>
              <button class="btn btn-outline btn-sm" id="btn-export-rules-xlsx">📊 Export Excel</button>
              <button class="btn btn-primary btn-sm" id="btn-add-new-rule">➕ New Rule</button>
            </div>
          </div>
          <div class="card-body" style="padding: 0;">
            <div id="rules-table-container"></div>
          </div>
        </div>
      `;

      this.updateRulesTable();

      document.getElementById('rule-filter-search').addEventListener('input', () => this.updateRulesTable());
      document.getElementById('rule-filter-dim').addEventListener('change', () => this.updateRulesTable());
      document.getElementById('btn-add-new-rule').addEventListener('click', () => this.showRuleEditModal());
      document.getElementById('btn-export-rules-csv').addEventListener('click', () => this.exportRulesToCsv());
      document.getElementById('btn-export-rules-xlsx').addEventListener('click', () => this.exportRulesToExcel());
      document.getElementById('btn-import-rules-csv').addEventListener('click', () => this.showRulesImportModal());
    },

    updateRulesTable() {
      const search = (document.getElementById('rule-filter-search')?.value || '').toLowerCase();
      const dim = document.getElementById('rule-filter-dim')?.value || '';

      const filtered = this.rules.filter(r => {
        const matchesSearch = !search ||
          (r.id && r.id.toLowerCase().includes(search)) ||
          (r.name && r.name.toLowerCase().includes(search)) ||
          (r.description && r.description.toLowerCase().includes(search));
        const matchesDim = !dim || r.dimension === dim;
        return matchesSearch && matchesDim;
      });

      const container = document.getElementById('rules-table-container');
      if (!container) return;

      if (filtered.length === 0) {
        container.innerHTML = `<div style="padding: 36px; text-align: center; color: var(--text-muted);">No validation rules match filter.</div>`;
        return;
      }

      container.innerHTML = `
        <table class="table-custom">
          <thead>
            <tr>
              <th>Rule ID</th>
              <th>Rule Name</th>
              <th>Dimension</th>
              <th>Severity</th>
              <th>Expected Result</th>
              <th>Threshold</th>
              <th>Dialect</th>
              <th style="text-align: right;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.map(r => `
              <tr>
                <td><strong>${r.id}</strong></td>
                <td>
                  <strong>${this.escapeHtml(r.name)}</strong>
                  <div style="font-size: 11px; color: var(--text-muted);">${this.escapeHtml(r.description || '')}</div>
                </td>
                <td><span class="badge badge-info">${r.dimension || 'General'}</span></td>
                <td>${this.getSeverityBadge(r.severity)}</td>
                <td>${this.escapeHtml(r.expectedResult || '')}</td>
                <td>${r.threshold || '0'}</td>
                <td><span style="font-family: monospace; font-size: 11px;">${r.dialect || 'ANSI SQL'}</span></td>
                <td style="text-align: right; white-space: nowrap;">
                  <button class="btn btn-outline btn-sm btn-rule-edit" data-id="${r.id}">Edit</button>
                  <button class="btn btn-danger btn-sm btn-rule-delete" data-id="${r.id}">&times;</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;

      container.querySelectorAll('.btn-rule-edit').forEach(b => {
        b.addEventListener('click', () => {
          const rule = this.rules.find(r => r.id === b.dataset.id);
          if (rule) this.showRuleEditModal(rule);
        });
      });

      container.querySelectorAll('.btn-rule-delete').forEach(b => {
        b.addEventListener('click', async () => {
          if (confirm(`Delete rule ${b.dataset.id}?`)) {
            await this.dbDelete('rules', b.dataset.id);
            this.rules = this.rules.filter(r => r.id !== b.dataset.id);
            this.updateSidebarBadges();
            this.updateRulesTable();
            this.showToast('Rule deleted', 'success');
          }
        });
      });
    },

    showRuleEditModal(rule = null) {
      const isEdit = !!rule;
      const r = rule || {
        id: 'RULE-' + Math.floor(1000 + Math.random() * 9000),
        name: '',
        dimension: 'Completeness',
        severity: 'High',
        description: '',
        sql: 'SELECT * FROM table WHERE condition;',
        expectedResult: '0 rows returned',
        threshold: '0',
        owner: '',
        dialect: 'Snowflake'
      };

      this.openModal(isEdit ? `Edit Rule: ${r.id}` : 'Create New Validation Rule', `
        <div class="grid-cols-2">
          <div class="form-group">
            <label class="form-label required">Rule ID</label>
            <input type="text" id="rm-in-id" class="form-control" value="${r.id}" ${isEdit ? 'readonly' : ''}>
          </div>
          <div class="form-group">
            <label class="form-label required">Rule Name</label>
            <input type="text" id="rm-in-name" class="form-control" value="${this.escapeHtml(r.name)}" placeholder="e.g. Customer ID Uniqueness">
          </div>
        </div>

        <div class="grid-cols-3">
          <div class="form-group">
            <label class="form-label">Quality Dimension</label>
            <select id="rm-in-dim" class="form-control">
              <option value="Completeness" ${r.dimension === 'Completeness' ? 'selected' : ''}>Completeness</option>
              <option value="Uniqueness" ${r.dimension === 'Uniqueness' ? 'selected' : ''}>Uniqueness</option>
              <option value="Validity" ${r.dimension === 'Validity' ? 'selected' : ''}>Validity</option>
              <option value="Accuracy" ${r.dimension === 'Accuracy' ? 'selected' : ''}>Accuracy</option>
              <option value="Consistency" ${r.dimension === 'Consistency' ? 'selected' : ''}>Consistency</option>
              <option value="Timeliness" ${r.dimension === 'Timeliness' ? 'selected' : ''}>Timeliness</option>
              <option value="Referential integrity" ${r.dimension === 'Referential integrity' ? 'selected' : ''}>Referential integrity</option>
              <option value="Reconciliation" ${r.dimension === 'Reconciliation' ? 'selected' : ''}>Reconciliation</option>
              <option value="Freshness" ${r.dimension === 'Freshness' ? 'selected' : ''}>Freshness</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Severity</label>
            <select id="rm-in-sev" class="form-control">
              <option value="Critical" ${r.severity === 'Critical' ? 'selected' : ''}>Critical</option>
              <option value="High" ${r.severity === 'High' ? 'selected' : ''}>High</option>
              <option value="Medium" ${r.severity === 'Medium' ? 'selected' : ''}>Medium</option>
              <option value="Low" ${r.severity === 'Low' ? 'selected' : ''}>Low</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">SQL Dialect</label>
            <select id="rm-in-dialect" class="form-control">
              <option value="Snowflake" ${r.dialect === 'Snowflake' ? 'selected' : ''}>Snowflake</option>
              <option value="PostgreSQL" ${r.dialect === 'PostgreSQL' ? 'selected' : ''}>PostgreSQL</option>
              <option value="Trino" ${r.dialect === 'Trino' ? 'selected' : ''}>Trino</option>
              <option value="MySQL" ${r.dialect === 'MySQL' ? 'selected' : ''}>MySQL</option>
              <option value="SQL Server" ${r.dialect === 'SQL Server' ? 'selected' : ''}>SQL Server</option>
              <option value="ANSI SQL" ${r.dialect === 'ANSI SQL' ? 'selected' : ''}>ANSI SQL</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Description</label>
          <textarea id="rm-in-desc" class="form-control" rows="2">${this.escapeHtml(r.description || '')}</textarea>
        </div>

        <div class="form-group">
          <label class="form-label required">SQL Assertion Query</label>
          <textarea id="rm-in-sql" class="form-control" rows="4" style="font-family: monospace;">${this.escapeHtml(r.sql || '')}</textarea>
        </div>

        <div class="grid-cols-2">
          <div class="form-group">
            <label class="form-label">Expected Result</label>
            <input type="text" id="rm-in-exp" class="form-control" value="${this.escapeHtml(r.expectedResult || '')}">
          </div>
          <div class="form-group">
            <label class="form-label">Threshold</label>
            <input type="text" id="rm-in-thresh" class="form-control" value="${this.escapeHtml(r.threshold || '0')}">
          </div>
        </div>
      `, [
        { label: 'Cancel', class: 'btn-outline', action: () => this.closeModal() },
        { label: 'Save Rule', class: 'btn-primary', action: async () => {
          const ruleId = document.getElementById('rm-in-id').value.trim();
          const name = document.getElementById('rm-in-name').value.trim();
          if (!ruleId || !name) return alert('Rule ID and Name are required.');

          // Duplicate ID check for new rule
          if (!isEdit && this.rules.some(x => x.id === ruleId)) {
            if (!confirm(`A rule with ID "${ruleId}" already exists. Overwrite?`)) return;
          }

          const savedRule = {
            id: ruleId,
            name,
            dimension: document.getElementById('rm-in-dim').value,
            severity: document.getElementById('rm-in-sev').value,
            dialect: document.getElementById('rm-in-dialect').value,
            description: document.getElementById('rm-in-desc').value.trim(),
            sql: document.getElementById('rm-in-sql').value.trim(),
            expectedResult: document.getElementById('rm-in-exp').value.trim(),
            threshold: document.getElementById('rm-in-thresh').value.trim()
          };

          await this.dbPut('rules', savedRule);
          const idx = this.rules.findIndex(x => x.id === savedRule.id);
          if (idx >= 0) this.rules[idx] = savedRule;
          else this.rules.unshift(savedRule);

          this.closeModal();
          this.updateSidebarBadges();
          this.updateRulesTable();
          this.showToast('Validation rule saved', 'success');
        }}
      ]);
    },

    showRulePickerModal() {
      this.openModal('Select Rules from Catalog', `
        <div style="max-height: 400px; overflow-y: auto;">
          <table class="table-custom">
            <thead>
              <tr>
                <th></th>
                <th>ID</th>
                <th>Name</th>
                <th>Dimension</th>
                <th>Severity</th>
              </tr>
            </thead>
            <tbody>
              ${this.rules.map(r => `
                <tr>
                  <td><input type="checkbox" class="chk-pick-rule" data-id="${r.id}"></td>
                  <td><strong>${r.id}</strong></td>
                  <td>${this.escapeHtml(r.name)}</td>
                  <td><span class="badge badge-info">${r.dimension}</span></td>
                  <td>${this.getSeverityBadge(r.severity)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `, [
        { label: 'Cancel', class: 'btn-outline', action: () => this.closeModal() },
        { label: 'Add Selected Rules', class: 'btn-primary', action: () => {
          const checked = document.querySelectorAll('.chk-pick-rule:checked');
          checked.forEach(chk => {
            const rule = this.rules.find(r => r.id === chk.dataset.id);
            if (rule && !this.currentDoc.rules.some(r => r.id === rule.id)) {
              this.currentDoc.rules.push(JSON.parse(JSON.stringify(rule)));
            }
          });
          this.closeModal();
          this.updateEditorRulesTable();
          this.showToast('Rules added to document', 'success');
        }}
      ]);
    },

    showAddCustomRuleModal() {
      this.openModal('Add Custom Rule to Document', `
        <div class="form-group">
          <label class="form-label required">Rule Name</label>
          <input type="text" id="custom-rule-name" class="form-control" placeholder="e.g. Null Check on Account Created At">
        </div>
        <div class="grid-cols-2">
          <div class="form-group">
            <label class="form-label">Dimension</label>
            <select id="custom-rule-dim" class="form-control">
              <option value="Completeness">Completeness</option>
              <option value="Uniqueness">Uniqueness</option>
              <option value="Validity">Validity</option>
              <option value="Accuracy">Accuracy</option>
              <option value="Consistency">Consistency</option>
              <option value="Freshness">Freshness</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Severity</label>
            <select id="custom-rule-sev" class="form-control">
              <option value="Critical">Critical</option>
              <option value="High" selected>High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">SQL Query</label>
          <textarea id="custom-rule-sql" class="form-control" rows="3" style="font-family: monospace;"></textarea>
        </div>
        <div class="form-group">
          <label class="form-label">Expected Result</label>
          <input type="text" id="custom-rule-exp" class="form-control" value="0 rows">
        </div>
      `, [
        { label: 'Cancel', class: 'btn-outline', action: () => this.closeModal() },
        { label: 'Add Rule', class: 'btn-primary', action: () => {
          const name = document.getElementById('custom-rule-name').value.trim();
          if (!name) return alert('Name required');
          const newRule = {
            id: 'RULE-' + Math.floor(1000 + Math.random() * 9000),
            name,
            dimension: document.getElementById('custom-rule-dim').value,
            severity: document.getElementById('custom-rule-sev').value,
            sql: document.getElementById('custom-rule-sql').value.trim(),
            expectedResult: document.getElementById('custom-rule-exp').value.trim(),
            threshold: '0'
          };
          this.currentDoc.rules.push(newRule);
          this.closeModal();
          this.updateEditorRulesTable();
          this.showToast('Custom rule added', 'success');
        }}
      ]);
    },

    // CSV & Excel Rule Export & Import (Formula injection protected)
    exportRulesToCsv() {
      const headers = ['rule_id', 'rule_name', 'dimension', 'severity', 'description', 'sql_query', 'expected_result', 'threshold', 'dialect'];
      let csv = headers.join(',') + '\n';

      this.rules.forEach(r => {
        const row = [
          this.sanitizeCsv(r.id),
          this.sanitizeCsv(r.name),
          this.sanitizeCsv(r.dimension),
          this.sanitizeCsv(r.severity),
          this.sanitizeCsv(r.description),
          this.sanitizeCsv(r.sql),
          this.sanitizeCsv(r.expectedResult),
          this.sanitizeCsv(r.threshold),
          this.sanitizeCsv(r.dialect || 'ANSI SQL')
        ];
        csv += row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',') + '\n';
      });

      this.downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), 'dqd-rules-export.csv');
    },

    exportRulesToExcel() {
      if (!window.XLSX) {
        alert('SheetJS (xlsx) library not loaded');
        return;
      }
      const data = this.rules.map(r => ({
        'Rule ID': r.id,
        'Rule Name': r.name,
        'Dimension': r.dimension,
        'Severity': r.severity,
        'Description': r.description,
        'SQL Query': r.sql,
        'Expected Result': r.expectedResult,
        'Threshold': r.threshold,
        'Dialect': r.dialect || 'ANSI SQL'
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'ValidationRules');
      XLSX.writeFile(wb, 'dqd-rules-export.xlsx');
    },

    sanitizeCsv(val) {
      if (!val) return '';
      let s = String(val);
      // Protect against CSV formula injection: =, +, -, @, tab, cr
      if (/^[=\+\-@\t\r]/.test(s)) {
        s = "'" + s;
      }
      return s;
    },

    showRulesImportModal() {
      this.openModal('Import Rules from CSV or Excel', `
        <div class="form-group">
          <label class="form-label">Select .csv or .xlsx File</label>
          <input type="file" id="import-rules-file" class="form-control" accept=".csv,.xlsx,.xls">
        </div>
        <div id="import-rules-preview-area" style="margin-top: 16px; display: none;">
          <div style="font-weight: 700; margin-bottom: 6px;">Parsed Preview (First 5 Rows):</div>
          <div style="max-height: 200px; overflow: auto; border: 1px solid var(--surface-border);">
            <table class="table-custom" id="table-import-rules-preview"></table>
          </div>
        </div>
      `, [
        { label: 'Cancel', class: 'btn-outline', action: () => this.closeModal() },
        { label: 'Confirm Import', class: 'btn-primary', id: 'btn-confirm-rules-import', action: async () => {
          if (!this._parsedImportRules || this._parsedImportRules.length === 0) {
            alert('No valid rules found to import');
            return;
          }
          let count = 0;
          for (const r of this._parsedImportRules) {
            await this.dbPut('rules', r);
            const idx = this.rules.findIndex(x => x.id === r.id);
            if (idx >= 0) this.rules[idx] = r;
            else this.rules.push(r);
            count++;
          }
          this.closeModal();
          this.updateSidebarBadges();
          this.updateRulesTable();
          this.showToast(`Imported ${count} rules successfully`, 'success');
        }}
      ]);

      const fileInput = document.getElementById('import-rules-file');
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

        reader.onload = (evt) => {
          try {
            let records = [];
            if (isExcel && window.XLSX) {
              const workbook = XLSX.read(evt.target.result, { type: 'binary' });
              const sheetName = workbook.SheetNames[0];
              records = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
            } else {
              // Parse CSV text
              const text = evt.target.result;
              records = this.parseCsvText(text);
            }

            // Map keys
            this._parsedImportRules = records.map((rec, i) => ({
              id: rec.rule_id || rec['Rule ID'] || ('RULE-IMP-' + (i + 1)),
              name: rec.rule_name || rec['Rule Name'] || 'Imported Rule ' + (i + 1),
              dimension: rec.dimension || rec['Dimension'] || 'Completeness',
              severity: rec.severity || rec['Severity'] || 'Medium',
              description: rec.description || rec['Description'] || '',
              sql: rec.sql_query || rec['SQL Query'] || rec.sql || '',
              expectedResult: rec.expected_result || rec['Expected Result'] || '',
              threshold: String(rec.threshold || rec['Threshold'] || '0'),
              dialect: rec.dialect || rec['Dialect'] || 'ANSI SQL'
            }));

            // Display preview table
            const previewArea = document.getElementById('import-rules-preview-area');
            const previewTable = document.getElementById('table-import-rules-preview');
            previewArea.style.display = 'block';

            previewTable.innerHTML = `
              <thead><tr><th>ID</th><th>Name</th><th>Dimension</th><th>Severity</th></tr></thead>
              <tbody>
                ${this._parsedImportRules.slice(0, 5).map(r => `
                  <tr>
                    <td><strong>${r.id}</strong></td>
                    <td>${this.escapeHtml(r.name)}</td>
                    <td>${r.dimension}</td>
                    <td>${r.severity}</td>
                  </tr>
                `).join('')}
              </tbody>
            `;
          } catch (err) {
            alert('Error parsing file: ' + err.message);
          }
        };

        if (isExcel) reader.readAsBinaryString(file);
        else reader.readAsText(file);
      });
    },

    parseCsvText(text) {
      const lines = text.split(/\r?\n/).filter(Boolean);
      if (lines.length < 2) return [];
      const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
      const results = [];

      for (let i = 1; i < lines.length; i++) {
        // Simple regex to handle quoted commas
        const regex = /(?:^|,)(?:"([^"]*(?:""[^"]*)*)"|([^",]*))/g;
        const row = [];
        let match;
        while ((match = regex.exec(lines[i])) !== null) {
          if (match.index === regex.lastIndex) regex.lastIndex++;
          let val = match[1] !== undefined ? match[1].replace(/""/g, '"') : match[2];
          row.push(val);
        }
        if (row.length >= headers.length) {
          const obj = {};
          headers.forEach((h, idx) => { obj[h] = row[idx] || ''; });
          results.push(obj);
        }
      }
      return results;
    },

    // ====================================================================
    // 11. VIEW: SQL LIBRARY
    // ====================================================================

    renderSqlLibrary(container) {
      const assertions = this.sqlAssertions || [];
      const dialects = Array.from(new Set(assertions.map(a => a.dialect).filter(Boolean)));

      container.innerHTML = `
        <div class="card">
          <div class="card-header" style="justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
            <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
              <span class="card-title">SQL Assertion Library</span>
              <span class="badge badge-info" id="badge-lib-total-count">${assertions.length} ${assertions.length === 1 ? 'Query' : 'Queries'}</span>
              <span style="font-size: 12px; color: var(--text-muted);">Stored queries with Document Titles</span>
            </div>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              <input type="file" id="input-import-sql-assertions" accept=".json" style="display: none;">
              <button class="btn btn-outline btn-sm" id="btn-import-sql-assertions" title="Import queries from a JSON file">📥 Import JSON</button>
              ${assertions.length > 0 ? `<button class="btn btn-outline btn-sm" id="btn-export-sql-assertions" title="Export queries to sql_assertions.json">💾 Export JSON</button>` : ''}
              ${assertions.length > 0 ? `<button class="btn btn-outline btn-sm" id="btn-clear-all-sql-assertions" style="color: #ef4444;" title="Clear all stored assertion queries">🗑️ Clear All</button>` : ''}
              <button class="btn btn-primary btn-sm" id="btn-add-sql-assertion-top">➕ Add Query</button>
            </div>
          </div>
          
          ${assertions.length === 0 ? `
            <div class="card-body" style="text-align: center; padding: 60px 20px;">
              <div style="font-size: 48px; margin-bottom: 12px;">💾</div>
              <h3 style="font-size: 18px; margin-bottom: 8px; color: var(--text-color);">No SQL Assertions Stored Yet</h3>
              <p style="font-size: 13px; color: var(--text-muted); max-width: 540px; margin: 0 auto 20px auto; line-height: 1.6;">
                The SQL Assertion Library is empty by default. When you add queries in any <strong>Document Template</strong>, each query is automatically stored here with its <strong>Document Title</strong>.
              </p>
              <div style="display: flex; justify-content: center; gap: 10px; flex-wrap: wrap;">
                <button class="btn btn-outline btn-sm" id="btn-empty-import-assertions">📥 Import sql_assertions.json</button>
                <button class="btn btn-primary btn-sm" id="btn-empty-add-assertion">➕ Add Assertion Query Manually</button>
              </div>
            </div>
          ` : `
            <div class="card-body" style="padding-bottom: 8px;">
              <!-- Filter & Search Bar -->
              <div style="display: flex; gap: 10px; margin-bottom: 16px; flex-wrap: wrap;">
                <div style="flex: 1; min-width: 240px;">
                  <input type="text" id="txt-search-sql-lib" class="form-control form-control-sm" placeholder="🔍 Search queries by Document Title, dialect, or SQL code...">
                </div>
                <div style="width: 180px;">
                  <select id="sel-filter-dialect-sql-lib" class="form-control form-control-sm">
                    <option value="">All Dialects (${assertions.length})</option>
                    ${dialects.map(d => `<option value="${this.escapeHtml(d)}">${this.escapeHtml(d)}</option>`).join('')}
                  </select>
                </div>
              </div>

              <!-- Queries Grid -->
              <div class="grid-cols-2" id="grid-sql-assertion-cards">
                ${this.renderSqlAssertionCardsHtml(assertions)}
              </div>
            </div>
          `}
        </div>
      `;

      this.bindSqlLibraryEvents(container);
    },

    renderSqlAssertionCardsHtml(items) {
      if (!items || items.length === 0) {
        return `<div style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 30px;">No matching assertion queries found.</div>`;
      }

      return items.map(item => `
        <div class="card sql-lib-item-card" data-id="${item.id}" style="margin-bottom: 0; display: flex; flex-direction: column; justify-content: space-between;">
          <div class="card-header" style="flex-wrap: wrap; gap: 8px; align-items: flex-start;">
            <div style="flex: 1; min-width: 200px;">
              <strong style="font-size: 14px; color: var(--primary-color); word-break: break-word;">${this.escapeHtml(item.title || item.documentTitle || 'Untitled Query')}</strong>
              <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px; display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
                <span class="badge badge-info" style="font-size: 10px;">${this.escapeHtml(item.dialect || 'Trino')}</span>
                ${item.documentId ? `<span>Doc: <code>${this.escapeHtml(item.documentId)}</code></span>` : ''}
                ${item.updatedAt ? `<span>Updated: ${new Date(item.updatedAt).toLocaleDateString()}</span>` : ''}
              </div>
            </div>
            <div style="display: flex; gap: 6px; align-items: center;">
              <button class="btn btn-outline btn-sm btn-copy-sql-assertion" data-id="${item.id}" title="Copy SQL Query to Clipboard">📋 Copy</button>
              <button class="btn btn-outline btn-sm btn-edit-sql-assertion" data-id="${item.id}" title="Edit this query">✏️</button>
              <button class="btn btn-outline btn-sm btn-delete-sql-assertion" data-id="${item.id}" style="color: #ef4444;" title="Delete this query">&times;</button>
            </div>
          </div>
          <div class="card-body" style="padding: 12px; flex: 1;">
            <div class="sql-highlighted-box" style="max-height: 150px; overflow-y: auto; font-size: 12px;">${this.highlightSql(item.sql || '')}</div>
            ${item.notes ? `<div style="font-size: 11px; color: var(--text-muted); margin-top: 8px;"><strong>Note:</strong> ${this.escapeHtml(item.notes)}</div>` : ''}
            ${item.expectedResult ? `<div style="font-size: 11px; color: var(--status-passed); margin-top: 4px;"><strong>Expected:</strong> ${this.escapeHtml(item.expectedResult)}</div>` : ''}
          </div>
        </div>
      `).join('');
    },

    bindSqlLibraryEvents(container) {
      // Copy Query
      container.querySelectorAll('.btn-copy-sql-assertion').forEach(btn => {
        btn.addEventListener('click', () => {
          const item = (this.sqlAssertions || []).find(a => a.id === btn.dataset.id);
          if (item && item.sql) {
            navigator.clipboard.writeText(item.sql).then(() => {
              this.showToast(`SQL query for "${item.title}" copied!`, 'success');
            });
          }
        });
      });

      // Edit Query
      container.querySelectorAll('.btn-edit-sql-assertion').forEach(btn => {
        btn.addEventListener('click', () => {
          this.showEditSqlAssertionModal(btn.dataset.id);
        });
      });

      // Delete Query
      container.querySelectorAll('.btn-delete-sql-assertion').forEach(btn => {
        btn.addEventListener('click', async () => {
          const item = (this.sqlAssertions || []).find(a => a.id === btn.dataset.id);
          if (item && confirm(`Delete query "${item.title}" from library?`)) {
            await this.deleteSqlAssertion(item.id);
          }
        });
      });

      // Search & Dialect Filtering
      const searchInput = container.querySelector('#txt-search-sql-lib');
      const dialectSelect = container.querySelector('#sel-filter-dialect-sql-lib');
      const grid = container.querySelector('#grid-sql-assertion-cards');

      if (searchInput && dialectSelect && grid) {
        const filterCards = () => {
          const query = (searchInput.value || '').toLowerCase().trim();
          const dialect = dialectSelect.value;
          const filtered = (this.sqlAssertions || []).filter(a => {
            const matchesQuery = !query ||
              (a.title && a.title.toLowerCase().includes(query)) ||
              (a.documentTitle && a.documentTitle.toLowerCase().includes(query)) ||
              (a.sql && a.sql.toLowerCase().includes(query)) ||
              (a.notes && a.notes.toLowerCase().includes(query));
            const matchesDialect = !dialect || a.dialect === dialect;
            return matchesQuery && matchesDialect;
          });
          grid.innerHTML = this.renderSqlAssertionCardsHtml(filtered);
          this.bindSqlLibraryEvents(container);
        };

        searchInput.addEventListener('input', filterCards);
        dialectSelect.addEventListener('change', filterCards);
      }

      // Add Query Manual
      const addBtns = [
        container.querySelector('#btn-add-sql-assertion-top'),
        container.querySelector('#btn-empty-add-assertion')
      ].filter(Boolean);
      addBtns.forEach(btn => btn.addEventListener('click', () => this.showAddSqlAssertionModal()));

      // Export JSON
      const exportBtn = container.querySelector('#btn-export-sql-assertions');
      if (exportBtn) {
        exportBtn.addEventListener('click', () => this.exportSqlAssertionsJson());
      }

      // Clear All
      const clearBtn = container.querySelector('#btn-clear-all-sql-assertions');
      if (clearBtn) {
        clearBtn.addEventListener('click', async () => {
          if (confirm('Are you sure you want to delete all queries in the SQL Assertion Library?')) {
            await this.clearAllSqlAssertions();
          }
        });
      }

      // Import JSON
      const importInput = container.querySelector('#input-import-sql-assertions');
      const importBtns = [
        container.querySelector('#btn-import-sql-assertions'),
        container.querySelector('#btn-empty-import-assertions')
      ].filter(Boolean);

      importBtns.forEach(b => b.addEventListener('click', () => {
        if (importInput) importInput.click();
      }));

      if (importInput) {
        importInput.addEventListener('change', (e) => {
          const file = e.target.files[0];
          if (file) this.importSqlAssertionsFromJson(file);
        });
      }
    },

    showAddSqlAssertionModal() {
      this.openModal('Add SQL Assertion Query', `
        <div class="form-group">
          <label class="form-label required">Document Title / Query Name</label>
          <input type="text" id="lib-in-title" class="form-control" placeholder="e.g. Customer Master Table Data Quality Specification">
        </div>
        <div class="grid-cols-2">
          <div class="form-group">
            <label class="form-label">SQL Dialect</label>
            <select id="lib-in-dialect" class="form-control">
              <option value="Trino">Trino</option>
              <option value="Snowflake">Snowflake</option>
              <option value="PostgreSQL">PostgreSQL</option>
              <option value="BigQuery">BigQuery</option>
              <option value="Databricks SQL">Databricks SQL</option>
              <option value="MySQL">MySQL</option>
              <option value="ANSI SQL">ANSI SQL</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Associated Document ID</label>
            <input type="text" id="lib-in-docid" class="form-control" placeholder="e.g. DOC-20261011-001">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label required">SQL Assertion Query</label>
          <textarea id="lib-in-sql" class="form-control" rows="5" spellcheck="false" placeholder="SELECT * FROM table WHERE ..."></textarea>
        </div>
        <div class="form-group">
          <label class="form-label">Execution Notes / Context</label>
          <input type="text" id="lib-in-notes" class="form-control" placeholder="e.g. Daily partition uniqueness check">
        </div>
        <div class="form-group">
          <label class="form-label">Expected Result</label>
          <input type="text" id="lib-in-expected" class="form-control" placeholder="e.g. 0 rows returned (Zero duplicates)">
        </div>
      `, [
        { label: 'Cancel', class: 'btn-outline', action: () => this.closeModal() },
        { label: 'Save Assertion', class: 'btn-primary', action: async () => {
          const title = (document.getElementById('lib-in-title')?.value || '').trim();
          const sql = (document.getElementById('lib-in-sql')?.value || '').trim();
          if (!title) return alert('Title is required');
          if (!sql) return alert('SQL query is required');

          const now = new Date().toISOString();
          const item = {
            id: 'SQL-MANUAL-' + Date.now(),
            title,
            documentTitle: title,
            documentId: (document.getElementById('lib-in-docid')?.value || '').trim(),
            dialect: document.getElementById('lib-in-dialect')?.value || 'Trino',
            sql,
            notes: (document.getElementById('lib-in-notes')?.value || '').trim(),
            expectedResult: (document.getElementById('lib-in-expected')?.value || '').trim(),
            createdAt: now,
            updatedAt: now
          };

          await this.dbPut('sql_assertions', item);
          if (!this.sqlAssertions) this.sqlAssertions = [];
          this.sqlAssertions.unshift(item);
          await this.syncSqlAssertionsToFile();
          this.closeModal();
          this.updateSidebarBadges();
          this.renderSqlLibrary(document.getElementById('main-content-view'));
          this.showToast('SQL assertion query saved to library', 'success');
        }}
      ]);
    },

    showEditSqlAssertionModal(id) {
      const item = (this.sqlAssertions || []).find(a => a.id === id);
      if (!item) return;

      this.openModal('Edit SQL Assertion Query', `
        <div class="form-group">
          <label class="form-label required">Document Title / Query Name</label>
          <input type="text" id="lib-edit-title" class="form-control" value="${this.escapeHtml(item.title || '')}">
        </div>
        <div class="grid-cols-2">
          <div class="form-group">
            <label class="form-label">SQL Dialect</label>
            <select id="lib-edit-dialect" class="form-control">
              <option value="Trino" ${item.dialect === 'Trino' ? 'selected' : ''}>Trino</option>
              <option value="Snowflake" ${item.dialect === 'Snowflake' ? 'selected' : ''}>Snowflake</option>
              <option value="PostgreSQL" ${item.dialect === 'PostgreSQL' ? 'selected' : ''}>PostgreSQL</option>
              <option value="BigQuery" ${item.dialect === 'BigQuery' ? 'selected' : ''}>BigQuery</option>
              <option value="Databricks SQL" ${item.dialect === 'Databricks SQL' ? 'selected' : ''}>Databricks SQL</option>
              <option value="MySQL" ${item.dialect === 'MySQL' ? 'selected' : ''}>MySQL</option>
              <option value="ANSI SQL" ${item.dialect === 'ANSI SQL' ? 'selected' : ''}>ANSI SQL</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Associated Document ID</label>
            <input type="text" id="lib-edit-docid" class="form-control" value="${this.escapeHtml(item.documentId || '')}">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label required">SQL Assertion Query</label>
          <textarea id="lib-edit-sql" class="form-control" rows="5" spellcheck="false">${this.escapeHtml(item.sql || '')}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">Execution Notes / Context</label>
          <input type="text" id="lib-edit-notes" class="form-control" value="${this.escapeHtml(item.notes || '')}">
        </div>
        <div class="form-group">
          <label class="form-label">Expected Result</label>
          <input type="text" id="lib-edit-expected" class="form-control" value="${this.escapeHtml(item.expectedResult || '')}">
        </div>
      `, [
        { label: 'Cancel', class: 'btn-outline', action: () => this.closeModal() },
        { label: 'Update Query', class: 'btn-primary', action: async () => {
          const title = (document.getElementById('lib-edit-title')?.value || '').trim();
          const sql = (document.getElementById('lib-edit-sql')?.value || '').trim();
          if (!title) return alert('Title is required');
          if (!sql) return alert('SQL query is required');

          item.title = title;
          item.documentTitle = title;
          item.documentId = (document.getElementById('lib-edit-docid')?.value || '').trim();
          item.dialect = document.getElementById('lib-edit-dialect')?.value || 'Trino';
          item.sql = sql;
          item.notes = (document.getElementById('lib-edit-notes')?.value || '').trim();
          item.expectedResult = (document.getElementById('lib-edit-expected')?.value || '').trim();
          item.updatedAt = new Date().toISOString();

          await this.dbPut('sql_assertions', item);
          await this.syncSqlAssertionsToFile();
          this.closeModal();
          this.renderSqlLibrary(document.getElementById('main-content-view'));
          this.showToast('SQL assertion updated successfully', 'success');
        }}
      ]);
    },

    async deleteSqlAssertion(id) {
      await this.dbDelete('sql_assertions', id);
      this.sqlAssertions = (this.sqlAssertions || []).filter(a => a.id !== id);
      await this.syncSqlAssertionsToFile();
      this.updateSidebarBadges();
      this.renderSqlLibrary(document.getElementById('main-content-view'));
      this.showToast('SQL query removed from library', 'info');
    },

    async clearAllSqlAssertions() {
      for (const a of (this.sqlAssertions || [])) {
        await this.dbDelete('sql_assertions', a.id);
      }
      this.sqlAssertions = [];
      await this.syncSqlAssertionsToFile();
      this.updateSidebarBadges();
      this.renderSqlLibrary(document.getElementById('main-content-view'));
      this.showToast('SQL Assertion Library cleared', 'info');
    },

    exportSqlAssertionsJson() {
      const data = this.sqlAssertions || [];
      this.downloadJson(data, 'sql_assertions.json');
      this.showToast(`Exported ${data.length} assertion queries to sql_assertions.json`, 'success');
    },

    importSqlAssertionsFromJson(file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const parsed = JSON.parse(e.target.result);
          if (!Array.isArray(parsed)) {
            throw new Error('Expected JSON array of queries');
          }
          let count = 0;
          for (const item of parsed) {
            if (item.sql || item.query) {
              const assertion = {
                id: item.id || `SQL-IMP-${Date.now()}-${count}`,
                title: item.title || item.documentTitle || item.name || `Imported Assertion ${count + 1}`,
                documentTitle: item.documentTitle || item.title || 'Imported Document',
                documentId: item.documentId || '',
                dialect: item.dialect || 'Trino',
                sql: (item.sql || item.query || '').trim(),
                notes: item.notes || '',
                expectedResult: item.expectedResult || '',
                threshold: item.threshold || '0',
                createdAt: item.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString()
              };
              await this.dbPut('sql_assertions', assertion);
              const idx = (this.sqlAssertions || []).findIndex(x => x.id === assertion.id);
              if (idx >= 0) this.sqlAssertions[idx] = assertion;
              else this.sqlAssertions.push(assertion);
              count++;
            }
          }
          await this.syncSqlAssertionsToFile();
          this.updateSidebarBadges();
          this.renderSqlLibrary(document.getElementById('main-content-view'));
          this.showToast(`Successfully imported ${count} queries into SQL library`, 'success');
        } catch (err) {
          alert('Failed to parse sql_assertions.json: ' + err.message);
        }
      };
      reader.readAsText(file);
    },

    // ====================================================================
    // 12. VIEW: TEST EXECUTIONS
    // ====================================================================

    renderExecutions(container) {
      container.innerHTML = `
        <div class="card">
          <div class="card-header">
            <span class="card-title">Test Execution Logs & Defect Measurements</span>
            <div style="display: flex; gap: 8px;">
              <button class="btn btn-outline btn-sm" id="btn-export-execs">Export Executions CSV</button>
              <button class="btn btn-primary btn-sm" id="btn-log-execution-top">➕ Log Test Execution</button>
            </div>
          </div>
          <div class="card-body" style="padding: 0;">
            <table class="table-custom">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Rule ID</th>
                  <th>Environment</th>
                  <th>Status</th>
                  <th>Total Records</th>
                  <th>Passed</th>
                  <th>Failed</th>
                  <th>Defect Rate</th>
                  <th>Evidence</th>
                </tr>
              </thead>
              <tbody>
                ${this.executions.length === 0 ? '<tr><td colspan="9" style="text-align: center; color: var(--text-muted); padding: 36px;">No test execution records recorded yet.</td></tr>' : this.executions.map(e => `
                  <tr>
                    <td>${new Date(e.timestamp).toLocaleString()}</td>
                    <td><strong>${e.ruleId || 'N/A'}</strong></td>
                    <td><span class="badge badge-info">${e.environment || 'PROD'}</span></td>
                    <td>${this.getStatusBadge(e.status)}</td>
                    <td>${(e.totalRecords || 0).toLocaleString()}</td>
                    <td style="color: var(--status-passed); font-weight: 600;">${(e.passedRecords || 0).toLocaleString()}</td>
                    <td style="color: ${e.failedRecords > 0 ? 'var(--status-failed)' : 'inherit'}; font-weight: 600;">${(e.failedRecords || 0).toLocaleString()}</td>
                    <td>${e.failurePercentage ? e.failurePercentage + '%' : '0.0%'}</td>
                    <td><span style="font-family: monospace; font-size: 11px;">${this.escapeHtml(e.evidence || 'N/A')}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;

      document.getElementById('btn-log-execution-top').addEventListener('click', () => this.showLogExecutionModal());
      document.getElementById('btn-export-execs').addEventListener('click', () => {
        let csv = 'timestamp,rule_id,environment,status,total_records,passed_records,failed_records,failure_percentage,evidence\n';
        this.executions.forEach(e => {
          csv += `"${e.timestamp}","${e.ruleId || ''}","${e.environment || ''}","${e.status}","${e.totalRecords || 0}","${e.passedRecords || 0}","${e.failedRecords || 0}","${e.failurePercentage || 0}","${this.sanitizeCsv(e.evidence || '')}"\n`;
        });
        this.downloadBlob(new Blob([csv], { type: 'text/csv' }), 'dqd-executions.csv');
      });
    },

    showLogExecutionModal() {
      this.openModal('Log Test Execution', `
        <div class="grid-cols-2">
          <div class="form-group">
            <label class="form-label">Rule ID</label>
            <input type="text" id="exec-in-rule" class="form-control" placeholder="e.g. RULE-COMP-001">
          </div>
          <div class="form-group">
            <label class="form-label">Environment</label>
            <select id="exec-in-env" class="form-control">
              <option value="PROD">PROD</option>
              <option value="UAT">UAT</option>
              <option value="QA">QA</option>
              <option value="DEV">DEV</option>
            </select>
          </div>
        </div>
        <div class="grid-cols-3">
          <div class="form-group">
            <label class="form-label">Status</label>
            <select id="exec-in-status" class="form-control">
              <option value="PASSED">PASSED</option>
              <option value="FAILED">FAILED</option>
              <option value="WARNING">WARNING</option>
              <option value="ERROR">ERROR</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Total Records</label>
            <input type="number" id="exec-in-total" class="form-control" value="100000">
          </div>
          <div class="form-group">
            <label class="form-label">Failed Records</label>
            <input type="number" id="exec-in-failed" class="form-control" value="0">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Execution Evidence / Query ID</label>
          <input type="text" id="exec-in-evidence" class="form-control" placeholder="e.g. Snowflake Query ID: 01a2b3c4...">
        </div>
      `, [
        { label: 'Cancel', class: 'btn-outline', action: () => this.closeModal() },
        { label: 'Save Execution', class: 'btn-primary', action: async () => {
          const total = parseInt(document.getElementById('exec-in-total').value || 0, 10);
          const failed = parseInt(document.getElementById('exec-in-failed').value || 0, 10);
          const passed = Math.max(0, total - failed);
          const pct = total > 0 ? ((failed / total) * 100).toFixed(4) : 0;

          const rec = {
            id: 'EXEC-' + Date.now(),
            timestamp: new Date().toISOString(),
            ruleId: document.getElementById('exec-in-rule').value.trim(),
            environment: document.getElementById('exec-in-env').value,
            status: document.getElementById('exec-in-status').value,
            totalRecords: total,
            failedRecords: failed,
            passedRecords: passed,
            failurePercentage: parseFloat(pct),
            evidence: document.getElementById('exec-in-evidence').value.trim()
          };

          await this.dbPut('executions', rec);
          this.executions.unshift(rec);
          if (this.currentDoc) {
            this.currentDoc.executions = this.currentDoc.executions || [];
            this.currentDoc.executions.unshift(rec);
          }
          this.closeModal();
          if (this.currentView === 'editor') {
            this.updateEditorExecutionsTable();
          } else {
            this.navigateTo(this.currentView);
          }
          this.showToast('Test execution recorded', 'success');
        }}
      ]);
    },

    // ====================================================================
    // ====================================================================
    // 13. VIEW: ISSUES & REMEDIATION TRACKER
    // ====================================================================

    syncAllIssues() {
      const issueMap = new Map();
      (this.issues || []).forEach(iss => {
        if (iss && iss.id) issueMap.set(String(iss.id).trim(), iss);
      });
      (this.documents || []).forEach(doc => {
        (doc.issues || []).forEach(iss => {
          if (iss && iss.id && !issueMap.has(String(iss.id).trim())) {
            issueMap.set(String(iss.id).trim(), iss);
          }
        });
      });
      if (this.currentDoc && Array.isArray(this.currentDoc.issues)) {
        this.currentDoc.issues.forEach(iss => {
          if (iss && iss.id && !issueMap.has(String(iss.id).trim())) {
            issueMap.set(String(iss.id).trim(), iss);
          }
        });
      }
      this.issues = Array.from(issueMap.values());
      return this.issues;
    },

    findIssueById(issueId) {
      if (!issueId) return null;
      const targetId = String(issueId).trim();
      let found = (this.issues || []).find(i => String(i.id).trim() === targetId);
      if (found) return found;

      if (this.currentDoc && Array.isArray(this.currentDoc.issues)) {
        found = this.currentDoc.issues.find(i => String(i.id).trim() === targetId);
        if (found) return found;
      }

      for (const doc of (this.documents || [])) {
        if (Array.isArray(doc.issues)) {
          found = doc.issues.find(i => String(i.id).trim() === targetId);
          if (found) return found;
        }
      }
      return null;
    },

    showEditIssueModalById(issueId) {
      if (!issueId) return;
      const iss = this.findIssueById(issueId);
      if (iss) {
        this.showEditIssueModal(iss);
      } else {
        alert('Could not locate issue ID: ' + issueId);
      }
    },

    renderIssues(container) {
      this.syncAllIssues();

      container.innerHTML = `
        <div class="card">
          <div class="card-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
            <div>
              <span class="card-title">Data Quality Issues & Remediation Tracker</span>
              <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">
                Track, edit, remediate, and resolve defects with 5-Whys root cause analysis and CAPA plans.
              </div>
            </div>
            <button class="btn btn-primary btn-sm" id="btn-add-issue-top">➕ Log Issue / CAPA</button>
          </div>
          <div class="card-body" style="padding: 0;">
            <table class="table-custom">
              <thead>
                <tr>
                  <th>Issue ID</th>
                  <th>Title</th>
                  <th>Severity</th>
                  <th>Status</th>
                  <th>Owner</th>
                  <th>Deadline</th>
                  <th>Root Cause & Corrective Action</th>
                  <th style="text-align: right; width: 160px;">Actions</th>
                </tr>
              </thead>
              <tbody id="tbody-issues-tracker">
                ${this.issues.length === 0 ? '<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 36px;">No issues tracked yet. Click "➕ Log Issue / CAPA" to record a data quality defect.</td></tr>' : this.issues.map(iss => `
                  <tr>
                    <td><strong>${iss.id}</strong></td>
                    <td><strong>${this.escapeHtml(iss.title)}</strong></td>
                    <td>${this.getSeverityBadge(iss.severity)}</td>
                    <td>${this.getStatusBadge(iss.status)}</td>
                    <td>${this.escapeHtml(iss.owner || 'Unassigned')}</td>
                    <td>${iss.deadline || 'N/A'}</td>
                    <td>
                      <div style="font-size: 12px;"><strong>Root Cause:</strong> ${this.escapeHtml(iss.rootCause || 'Under investigation')}</div>
                      <div style="font-size: 11px; color: var(--text-muted);"><strong>CAPA:</strong> ${this.escapeHtml(iss.correctiveAction || 'Pending')}</div>
                    </td>
                    <td style="text-align: right; white-space: nowrap;">
                      <div style="display: flex; gap: 6px; justify-content: flex-end;">
                        <button type="button" class="btn btn-outline btn-sm btn-edit-issue" onclick="window.DQD_App.showEditIssueModalById('${this.escapeHtml(iss.id)}'); event.stopPropagation();" data-id="${this.escapeHtml(iss.id)}" title="Edit Issue & CAPA">
                          <span>✏️</span> Edit
                        </button>
                        <button type="button" class="btn btn-outline btn-sm btn-delete-issue" onclick="window.DQD_App.deleteIssue('${this.escapeHtml(iss.id)}'); event.stopPropagation();" data-id="${this.escapeHtml(iss.id)}" style="color: #ef4444; border-color: rgba(239, 68, 68, 0.4);" title="Delete Issue">
                          <span>🗑️</span> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;

      document.getElementById('btn-add-issue-top').addEventListener('click', () => this.showAddIssueModal());

      // Container-level delegated click listener
      container.addEventListener('click', (e) => {
        const editBtn = e.target.closest('.btn-edit-issue');
        if (editBtn) {
          e.preventDefault();
          e.stopPropagation();
          const issueId = editBtn.dataset.id;
          this.showEditIssueModalById(issueId);
          return;
        }

        const delBtn = e.target.closest('.btn-delete-issue');
        if (delBtn) {
          e.preventDefault();
          e.stopPropagation();
          const issueId = delBtn.dataset.id;
          this.deleteIssue(issueId);
          return;
        }
      });
    },

    showAddIssueModal() {
      this.openModal('Log Data Quality Issue', `
        <div class="grid-cols-2">
          <div class="form-group">
            <label class="form-label required">Issue Title</label>
            <input type="text" id="iss-in-title" class="form-control" placeholder="e.g. Inverted timestamp in conversion event">
          </div>
          <div class="form-group">
            <label class="form-label">Severity</label>
            <select id="iss-in-sev" class="form-control">
              <option value="Critical">Critical</option>
              <option value="High" selected>High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
        </div>
        <div class="grid-cols-3">
          <div class="form-group">
            <label class="form-label">Owner</label>
            <input type="text" id="iss-in-owner" class="form-control" placeholder="e.g. Michael Chang">
          </div>
          <div class="form-group">
            <label class="form-label">Status</label>
            <select id="iss-in-status" class="form-control">
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Deadline</label>
            <input type="date" id="iss-in-deadline" class="form-control">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Business Impact</label>
          <textarea id="iss-in-impact" class="form-control" rows="2" placeholder="How does this defect affect reporting or consumers?"></textarea>
        </div>
        <div class="form-group">
          <label class="form-label">Root Cause (5-Whys)</label>
          <textarea id="iss-in-root" class="form-control" rows="2" placeholder="Underlying technical flaw or process breakdown..."></textarea>
        </div>
        <div class="form-group">
          <label class="form-label">Corrective & Preventive Action (CAPA)</label>
          <textarea id="iss-in-capa" class="form-control" rows="2" placeholder="Specific technical steps to fix and prevent recurrence..."></textarea>
        </div>
      `, [
        { label: 'Cancel', class: 'btn-outline', action: () => this.closeModal() },
        { label: 'Save Issue', class: 'btn-primary', action: async () => {
          const title = document.getElementById('iss-in-title').value.trim();
          if (!title) return alert('Title is required');

          const iss = {
            id: 'ISS-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + Math.floor(10 + Math.random() * 90),
            title,
            severity: document.getElementById('iss-in-sev')?.value || 'Medium',
            status: document.getElementById('iss-in-status')?.value || 'Open',
            owner: document.getElementById('iss-in-owner')?.value.trim() || '',
            deadline: document.getElementById('iss-in-deadline')?.value || '',
            businessImpact: document.getElementById('iss-in-impact')?.value.trim() || '',
            rootCause: document.getElementById('iss-in-root')?.value.trim() || '',
            correctiveAction: document.getElementById('iss-in-capa')?.value.trim() || '',
            createdAt: new Date().toISOString()
          };

          await this.dbPut('issues', iss);
          this.issues.unshift(iss);
          if (this.currentDoc) {
            this.currentDoc.issues = this.currentDoc.issues || [];
            this.currentDoc.issues.unshift(iss);
          }
          this.closeModal();
          this.updateSidebarBadges();
          if (this.currentView === 'editor') {
            this.updateEditorIssuesTable();
          } else {
            const mainContainer = document.getElementById('main-content-view');
            if (mainContainer && this.currentView === 'issues') {
              this.renderIssues(mainContainer);
            } else {
              this.navigateTo('issues');
            }
          }
          await this.logAudit('Issue Logged', `Logged defect issue ${iss.id}: ${iss.title}`, 'Data Quality Engineer', iss.id);
          this.showToast('Issue created successfully', 'success');
        }}
      ]);
    },

    showEditIssueModal(iss) {
      if (!iss) return;

      this.openModal(`Edit Issue: ${iss.id}`, `
        <div class="grid-cols-2">
          <div class="form-group">
            <label class="form-label required">Issue Title</label>
            <input type="text" id="iss-edit-title" class="form-control" value="${this.escapeHtml(iss.title || '')}" placeholder="e.g. Inverted timestamp in conversion event">
          </div>
          <div class="form-group">
            <label class="form-label">Severity</label>
            <select id="iss-edit-sev" class="form-control">
              <option value="Critical" ${iss.severity === 'Critical' ? 'selected' : ''}>Critical</option>
              <option value="High" ${iss.severity === 'High' ? 'selected' : ''}>High</option>
              <option value="Medium" ${iss.severity === 'Medium' ? 'selected' : ''}>Medium</option>
              <option value="Low" ${iss.severity === 'Low' ? 'selected' : ''}>Low</option>
            </select>
          </div>
        </div>
        <div class="grid-cols-3">
          <div class="form-group">
            <label class="form-label">Owner</label>
            <input type="text" id="iss-edit-owner" class="form-control" value="${this.escapeHtml(iss.owner || '')}" placeholder="e.g. Michael Chang">
          </div>
          <div class="form-group">
            <label class="form-label">Status</label>
            <select id="iss-edit-status" class="form-control">
              <option value="Open" ${iss.status === 'Open' ? 'selected' : ''}>Open</option>
              <option value="In Progress" ${iss.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
              <option value="Resolved" ${iss.status === 'Resolved' ? 'selected' : ''}>Resolved</option>
              <option value="Closed" ${iss.status === 'Closed' ? 'selected' : ''}>Closed</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Deadline</label>
            <input type="date" id="iss-edit-deadline" class="form-control" value="${iss.deadline || ''}">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Business Impact</label>
          <textarea id="iss-edit-impact" class="form-control" rows="2" placeholder="How does this defect affect reporting or consumers?">${this.escapeHtml(iss.businessImpact || '')}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">Root Cause (5-Whys)</label>
          <textarea id="iss-edit-root" class="form-control" rows="2" placeholder="Underlying technical flaw or process breakdown...">${this.escapeHtml(iss.rootCause || '')}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">Corrective & Preventive Action (CAPA)</label>
          <textarea id="iss-edit-capa" class="form-control" rows="2" placeholder="Specific technical steps to fix and prevent recurrence...">${this.escapeHtml(iss.correctiveAction || '')}</textarea>
        </div>
      `, [
        { label: 'Cancel', class: 'btn-outline', action: () => this.closeModal() },
        { label: 'Save Changes', class: 'btn-primary', action: async () => {
          const title = document.getElementById('iss-edit-title')?.value.trim();
          if (!title) return alert('Title is required');

          iss.title = title;
          iss.severity = document.getElementById('iss-edit-sev')?.value || 'Medium';
          iss.status = document.getElementById('iss-edit-status')?.value || 'Open';
          iss.owner = document.getElementById('iss-edit-owner')?.value.trim() || '';
          iss.deadline = document.getElementById('iss-edit-deadline')?.value || '';
          iss.businessImpact = document.getElementById('iss-edit-impact')?.value.trim() || '';
          iss.rootCause = document.getElementById('iss-edit-root')?.value.trim() || '';
          iss.correctiveAction = document.getElementById('iss-edit-capa')?.value.trim() || '';
          iss.updatedAt = new Date().toISOString();

          await this.dbPut('issues', iss);

          // Update in this.issues
          const idx = (this.issues || []).findIndex(i => String(i.id).trim() === String(iss.id).trim());
          if (idx !== -1) {
            this.issues[idx] = iss;
          } else {
            this.issues.unshift(iss);
          }

          // Update in currentDoc if opened
          if (this.currentDoc && Array.isArray(this.currentDoc.issues)) {
            const docIssIdx = this.currentDoc.issues.findIndex(i => String(i.id).trim() === String(iss.id).trim());
            if (docIssIdx !== -1) {
              this.currentDoc.issues[docIssIdx] = JSON.parse(JSON.stringify(iss));
            }
          }

          // Update in any documents
          for (const doc of (this.documents || [])) {
            if (Array.isArray(doc.issues)) {
              const dIdx = doc.issues.findIndex(i => String(i.id).trim() === String(iss.id).trim());
              if (dIdx !== -1) {
                doc.issues[dIdx] = JSON.parse(JSON.stringify(iss));
                await this.dbPut('documents', doc);
              }
            }
          }

          this.closeModal();
          this.updateSidebarBadges();
          if (this.currentView === 'editor') {
            this.updateEditorIssuesTable();
          } else {
            const mainContainer = document.getElementById('main-content-view');
            if (mainContainer && this.currentView === 'issues') {
              this.renderIssues(mainContainer);
            } else {
              this.navigateTo('issues');
            }
          }
          await this.logAudit('Issue Updated', `Updated defect issue ${iss.id}: ${iss.title}`, 'Data Quality Engineer', iss.id);
          this.showToast(`Issue ${iss.id} updated successfully`, 'success');
        }}
      ]);
    },

    async deleteIssue(issueId) {
      if (!issueId) return;
      const iss = this.findIssueById(issueId);
      const title = iss ? iss.title : issueId;
      if (!confirm(`Are you sure you want to permanently delete issue "${title}" (${issueId})?`)) {
        return;
      }

      await this.dbDelete('issues', issueId);
      this.issues = (this.issues || []).filter(i => String(i.id).trim() !== String(issueId).trim());

      if (this.currentDoc && Array.isArray(this.currentDoc.issues)) {
        this.currentDoc.issues = this.currentDoc.issues.filter(i => String(i.id).trim() !== String(issueId).trim());
      }

      for (const doc of (this.documents || [])) {
        if (Array.isArray(doc.issues)) {
          const hadIt = doc.issues.some(i => String(i.id).trim() === String(issueId).trim());
          if (hadIt) {
            doc.issues = doc.issues.filter(i => String(i.id).trim() !== String(issueId).trim());
            await this.dbPut('documents', doc);
          }
        }
      }

      this.updateSidebarBadges();
      if (this.currentView === 'editor') {
        this.updateEditorIssuesTable();
      } else {
        const mainContainer = document.getElementById('main-content-view');
        if (mainContainer && this.currentView === 'issues') {
          this.renderIssues(mainContainer);
        } else {
          this.navigateTo('issues');
        }
      }
      await this.logAudit('Issue Deleted', `Deleted defect issue ${issueId}: ${title}`, 'Data Quality Engineer', issueId);
      this.showToast(`Issue ${issueId} deleted successfully`, 'info');
    },

    // ====================================================================
    // 14. VIEW: LOCAL FILE & FILESYSTEM SEARCH
    // ====================================================================

    renderFileSearch(container) {
      container.innerHTML = `
        <div class="tabs-header">
          <button class="tab-btn active" data-tab="tab-search-internal">A. Internal Document Search</button>
          <button class="tab-btn" data-tab="tab-search-filesystem">B. Local Folder & Filesystem Search</button>
        </div>

        <!-- TAB A: INTERNAL SEARCH -->
        <div class="tab-pane active" id="tab-search-internal">
          <div class="card">
            <div class="card-header"><span class="card-title">Search Saved Workspace Data</span></div>
            <div class="card-body">
              <div style="display: flex; gap: 12px; margin-bottom: 20px;">
                <input type="text" id="internal-search-input" class="form-control" style="flex: 1;" placeholder="Search across documents, SQL, rules, comments, notes, issues...">
                <button class="btn btn-primary" id="btn-run-internal-search">Search Workspace</button>
              </div>
              <div id="internal-search-results"></div>
            </div>
          </div>
        </div>

        <!-- TAB B: LOCAL FILESYSTEM SEARCH -->
        <div class="tab-pane" id="tab-search-filesystem">
          <div class="card">
            <div class="card-header">
              <span class="card-title">Search Local Windows Folders & Files</span>
            </div>
            <div class="card-body">
              <div class="alert-banner alert-info">
                <span>ℹ️</span>
                <div>
                  <strong>Browser Security Sandbox Notice:</strong> Web browsers cannot silently access your entire Windows hard drive. You must explicitly select the project folder or files to search using the button below. Searches run 100% locally on your machine.
                </div>
              </div>

              <div class="grid-cols-2" style="margin-bottom: 16px;">
                <div>
                  <label class="form-label">Search Query / Keyword</label>
                  <input type="text" id="fs-search-query" class="form-control" placeholder="e.g. SELECT, CUSTOMER_ID, validation_rule...">
                </div>
                <div>
                  <label class="form-label">Search Mode</label>
                  <div style="display: flex; gap: 14px; margin-top: 8px;">
                    <label><input type="radio" name="fs-mode" value="content" checked> Content & Filename</label>
                    <label><input type="radio" name="fs-mode" value="filename"> Filename Only</label>
                    <label><input type="checkbox" id="fs-chk-case"> Case Sensitive</label>
                  </div>
                </div>
              </div>

              <div style="display: flex; gap: 12px; align-items: center; margin-bottom: 20px;">
                <button class="btn btn-primary" id="btn-fs-select-folder">📂 Select Folder to Search</button>
                <input type="file" id="fs-folder-fallback-input" webkitdirectory directory multiple style="display: none;">
                <button class="btn btn-outline" id="btn-fs-select-files">📄 Or Select Files</button>
                <input type="file" id="fs-files-input" multiple style="display: none;">
                <button class="btn btn-danger btn-sm" id="btn-fs-cancel" style="display: none;">Cancel Search</button>
                <span id="fs-search-status" style="font-size: 12px; color: var(--text-muted);">Ready</span>
              </div>

              <!-- Progress bar -->
              <div id="fs-progress-container" style="display: none; margin-bottom: 16px;">
                <div style="background: var(--surface-border); border-radius: 4px; height: 8px; overflow: hidden;">
                  <div id="fs-progress-bar" style="background: var(--secondary-color); width: 0%; height: 100%; transition: width 0.1s;"></div>
                </div>
              </div>

              <div id="fs-search-results"></div>
            </div>
          </div>
        </div>
      `;

      // Tabs switching
      container.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
          container.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
          btn.classList.add('active');
          document.getElementById(btn.dataset.tab).classList.add('active');
        });
      });

      // Internal Search Handler
      const runInternalSearch = () => {
        const q = (document.getElementById('internal-search-input').value || '').toLowerCase().trim();
        const resultsEl = document.getElementById('internal-search-results');
        if (!q) {
          resultsEl.innerHTML = '';
          return;
        }

        const matches = [];

        // Search documents (realtime across metadata, teams, users, SQL Trino queries, and mappings)
        this.documents.forEach(d => {
          let foundIn = [];
          if ((d.title || '').toLowerCase().includes(q)) foundIn.push('Title');
          if ((d.id || '').toLowerCase().includes(q)) foundIn.push('Doc ID');
          if ((d.validationType || '').toLowerCase().includes(q)) foundIn.push('Validation Type');
          if ((d.team || '').toLowerCase().includes(q)) foundIn.push('Team');
          if ((d.usernames || []).some(u => (u || '').toLowerCase().includes(q))) foundIn.push('Usernames');
          if ((d.sqlQuery || '').toLowerCase().includes(q)) foundIn.push('SQL Query');
          if ((d.sqlQueries || []).some(sq => (sq.query || '').toLowerCase().includes(q) || (sq.title || '').toLowerCase().includes(q))) foundIn.push('Trino Query');
          if ((d.executiveSummary || '').toLowerCase().includes(q)) foundIn.push('Summary');
          if ((d.businessObjective || '').toLowerCase().includes(q)) foundIn.push('Objective');
          if (foundIn.length > 0) {
            matches.push({ type: 'Document', title: d.title || d.id, id: d.id, foundIn: foundIn.join(', '), doc: d });
          }
        });

        // Search rules
        this.rules.forEach(r => {
          let foundIn = [];
          if ((r.name || '').toLowerCase().includes(q)) foundIn.push('Rule Name');
          if ((r.sql || '').toLowerCase().includes(q)) foundIn.push('Rule SQL');
          if (foundIn.length > 0) {
            matches.push({ type: 'Rule', title: r.name, id: r.id, foundIn: foundIn.join(', '), rule: r });
          }
        });

        if (matches.length === 0) {
          resultsEl.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 24px;">No matches found for "${this.escapeHtml(q)}".</div>`;
          return;
        }

        resultsEl.innerHTML = `
          <div style="font-weight: 700; margin-bottom: 12px;">Found ${matches.length} result(s):</div>
          <div style="display: flex; flex-direction: column; gap: 10px;">
            ${matches.map(m => `
              <div class="card" style="margin-bottom: 0; padding: 12px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <div>
                    <span class="badge ${m.type === 'Document' ? 'badge-passed' : 'badge-info'}" style="margin-right: 8px;">${m.type}</span>
                    <strong>${this.escapeHtml(m.title)}</strong> (${m.id})
                    <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">Matched in: ${m.foundIn}</div>
                  </div>
                  <button class="btn btn-outline btn-sm btn-open-search-match" data-type="${m.type}" data-id="${m.id}">Open</button>
                </div>
              </div>
            `).join('')}
          </div>
        `;

        resultsEl.querySelectorAll('.btn-open-search-match').forEach(b => {
          b.addEventListener('click', () => {
            if (b.dataset.type === 'Document') {
              const doc = this.documents.find(d => d.id === b.dataset.id);
              if (doc) {
                this.currentDoc = doc;
                this.navigateTo('editor');
              }
            } else {
              this.navigateTo('rules');
            }
          });
        });
      };

      const internalSearchInput = document.getElementById('internal-search-input');
      if (internalSearchInput) {
        internalSearchInput.addEventListener('input', runInternalSearch);
      }
      document.getElementById('btn-run-internal-search').addEventListener('click', runInternalSearch);
      document.getElementById('internal-search-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') runInternalSearch();
      });

      // Filesystem search handler
      const folderFallback = document.getElementById('fs-folder-fallback-input');
      const filesInput = document.getElementById('fs-files-input');

      document.getElementById('btn-fs-select-folder').addEventListener('click', async () => {
        if (window.showDirectoryPicker) {
          try {
            const dirHandle = await window.showDirectoryPicker();
            this.searchDirectoryHandle(dirHandle);
          } catch (e) {
            if (e.name !== 'AbortError') {
              // fallback
              folderFallback.click();
            }
          }
        } else {
          folderFallback.click();
        }
      });

      folderFallback.addEventListener('change', (e) => {
        this.searchFileList(Array.from(e.target.files));
      });

      document.getElementById('btn-fs-select-files').addEventListener('click', () => {
        filesInput.click();
      });

      filesInput.addEventListener('change', (e) => {
        this.searchFileList(Array.from(e.target.files));
      });
    },

    async searchFileList(files) {
      const q = document.getElementById('fs-search-query').value;
      if (!q) {
        alert('Please enter a search query');
        return;
      }

      const isCase = document.getElementById('fs-chk-case').checked;
      const mode = document.querySelector('input[name="fs-mode"]:checked').value;
      const statusEl = document.getElementById('fs-search-status');
      const resultsEl = document.getElementById('fs-search-results');
      const progBar = document.getElementById('fs-progress-bar');
      const progContainer = document.getElementById('fs-progress-container');

      progContainer.style.display = 'block';
      progBar.style.width = '0%';
      statusEl.textContent = `Scanning ${files.length} files...`;

      const matches = [];
      const queryCmp = isCase ? q : q.toLowerCase();

      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        progBar.style.width = `${Math.round(((i + 1) / files.length) * 100)}%`;

        const filenameCmp = isCase ? f.name : f.name.toLowerCase();
        let nameMatch = filenameCmp.includes(queryCmp);

        if (mode === 'filename') {
          if (nameMatch) matches.push({ name: f.name, path: f.webkitRelativePath || f.name, snippet: 'Matched filename' });
          continue;
        }

        // Content search: read text if supported extension
        const ext = f.name.split('.').pop().toLowerCase();
        const textExts = ['sql', 'txt', 'md', 'csv', 'json', 'yaml', 'yml', 'html'];

        if (textExts.includes(ext) && f.size < (this.config.limits.maxFileSizeMB * 1024 * 1024)) {
          try {
            const text = await f.text();
            const textCmp = isCase ? text : text.toLowerCase();
            const pos = textCmp.indexOf(queryCmp);
            if (pos >= 0) {
              const start = Math.max(0, pos - 40);
              const end = Math.min(text.length, pos + q.length + 40);
              const snippet = '...' + text.slice(start, end).replace(/\n/g, ' ') + '...';
              matches.push({ name: f.name, path: f.webkitRelativePath || f.name, snippet });
            }
          } catch (e) {}
        } else if (nameMatch) {
          matches.push({ name: f.name, path: f.webkitRelativePath || f.name, snippet: 'Filename matched' });
        }
      }

      progContainer.style.display = 'none';
      statusEl.textContent = `Search finished. Found ${matches.length} matches.`;

      if (matches.length === 0) {
        resultsEl.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 24px;">No files matched query "${this.escapeHtml(q)}".</div>`;
        return;
      }

      resultsEl.innerHTML = `
        <div style="font-weight: 700; margin-bottom: 12px;">Matched Files (${matches.length}):</div>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${matches.map(m => `
            <div class="card" style="margin-bottom: 0; padding: 10px 14px;">
              <strong>📄 ${this.escapeHtml(m.path)}</strong>
              <div style="font-size: 12px; font-family: monospace; color: var(--text-muted); margin-top: 4px; background: var(--surface-alt); padding: 6px; border-radius: 4px;">
                ${this.escapeHtml(m.snippet)}
              </div>
            </div>
          `).join('')}
        </div>
      `;
    },

    async searchDirectoryHandle(dirHandle) {
      const files = [];
      async function collect(handle, path = '') {
        for await (const entry of handle.values()) {
          if (entry.kind === 'file') {
            const file = await entry.getFile();
            file.customPath = path + '/' + file.name;
            files.push(file);
          } else if (entry.kind === 'directory') {
            await collect(entry, path + '/' + entry.name);
          }
        }
      }
      await collect(dirHandle, dirHandle.name);
      this.searchFileList(files);
    },

    // ====================================================================
    // 15. VIEW: PDF IMPORT & AUTOMATIC FIELD MAPPING
    // ====================================================================

    renderPdfImport(container) {
      container.innerHTML = `
        <div class="card">
          <div class="card-header"><span class="card-title">Extract & Auto-Map Legacy PDF Reports</span></div>
          <div class="card-body">
            <div class="alert-banner alert-info">
              <span>ℹ️</span>
              <div>
                <strong>Local Browser Extraction:</strong> Uses locally bundled PDF.js. Your PDF is processed directly inside your browser. No files are uploaded to any external server.
              </div>
            </div>

            <div style="border: 2px dashed var(--surface-border-strong); border-radius: var(--border-radius-md); padding: 36px; text-align: center; background: var(--surface-alt); margin-bottom: 24px;" id="pdf-drop-zone">
              <span style="font-size: 40px;">📄</span>
              <h3 style="font-size: 16px; margin: 10px 0 6px 0;">Drop previous PDF report here</h3>
              <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 16px;">Or browse from your computer</p>
              <button class="btn btn-primary btn-sm" id="btn-browse-pdf">Browse PDF File</button>
              <input type="file" id="pdf-file-input" accept=".pdf" style="display: none;">
            </div>

            <div id="pdf-extraction-progress" style="display: none; text-align: center; padding: 20px;">
              <span style="font-size: 24px;">⏳</span>
              <div style="margin-top: 8px;">Extracting text and analyzing data quality fields...</div>
            </div>

            <div id="pdf-mapping-review" style="display: none;">
              <h3 style="font-size: 16px; font-weight: 700; margin-bottom: 12px;">Heuristic Field Mapping Review</h3>
              <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 16px;">Review and refine extracted values before creating document:</p>
              
              <table class="table-custom" style="margin-bottom: 20px;">
                <thead>
                  <tr>
                    <th>Target Field</th>
                    <th>Extracted Value</th>
                    <th>Confidence</th>
                  </tr>
                </thead>
                <tbody id="tbody-pdf-mapping-fields"></tbody>
              </table>

              <div style="display: flex; justify-content: flex-end; gap: 12px;">
                <button class="btn btn-outline" id="btn-cancel-pdf-import">Cancel</button>
                <button class="btn btn-primary" id="btn-confirm-pdf-import">Create Document from Extracted Data</button>
              </div>
            </div>
          </div>
        </div>
      `;

      const fileInput = document.getElementById('pdf-file-input');
      const btnBrowse = document.getElementById('btn-browse-pdf');
      const dropZone = document.getElementById('pdf-drop-zone');

      btnBrowse.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', (e) => {
        if (e.target.files[0]) this.processPdfFile(e.target.files[0]);
      });

      dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.style.borderColor = 'var(--secondary-color)'; });
      dropZone.addEventListener('dragleave', () => { dropZone.style.borderColor = 'var(--surface-border-strong)'; });
      dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = 'var(--surface-border-strong)';
        if (e.dataTransfer.files[0]) this.processPdfFile(e.dataTransfer.files[0]);
      });
    },

    async processPdfFile(file) {
      if (!window.pdfjsLib) {
        alert('PDF.js library is not loaded');
        return;
      }

      const progressEl = document.getElementById('pdf-extraction-progress');
      const reviewEl = document.getElementById('pdf-mapping-review');
      progressEl.style.display = 'block';

      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const pageText = content.items.map(item => item.str).join(' ');
          fullText += pageText + '\n';
        }

        progressEl.style.display = 'none';

        if (!fullText.trim()) {
          alert('No extractable text found in this PDF (it may be a scanned image). Please use manual entry.');
          return;
        }

        // Heuristic extraction
        const extracted = this.extractFieldsFromPdfText(fullText, file.name);
        this.displayPdfMappingReview(extracted);
      } catch (err) {
        progressEl.style.display = 'none';
        alert('Error parsing PDF: ' + err.message);
      }
    },

    extractFieldsFromPdfText(text, filename) {
      const result = {
        title: '',
        documentType: 'Data Quality Validation Rules',
        domain: '',
        system: '',
        table: '',
        sql: '',
        expected: '',
        actual: '',
        owner: ''
      };

      // Heuristic Title
      const titleMatch = text.match(/(?:Title|Specification|Document|Audit):\s*([^\n\r]+)/i);
      result.title = titleMatch ? titleMatch[1].trim() : filename.replace(/\.pdf$/i, '');

      // Domain
      const domainMatch = text.match(/(?:Domain|Business Domain):\s*([^\n\r]+)/i);
      if (domainMatch) result.domain = domainMatch[1].trim();

      // System / Source
      const srcMatch = text.match(/(?:Source System|Database|Source):\s*([^\n\r]+)/i);
      if (srcMatch) result.system = srcMatch[1].trim();

      // Table
      const tableMatch = text.match(/(?:Target Table|Table|View):\s*([^\n\r]+)/i);
      if (tableMatch) result.table = tableMatch[1].trim();

      // Owner
      const ownerMatch = text.match(/(?:Owner|Author|Engineer):\s*([^\n\r]+)/i);
      if (ownerMatch) result.owner = ownerMatch[1].trim();

      // Expected Result
      const expMatch = text.match(/(?:Expected Result|Expected):\s*([^\n\r]+)/i);
      if (expMatch) result.expected = expMatch[1].trim();

      // SQL Query detection
      const sqlMatch = text.match(/(SELECT\s+[\s\S]+?(?:;|FROM\s+[A-Za-z0-9_.]+(?:\s+WHERE[\s\S]+?)?))/i);
      if (sqlMatch) {
        result.sql = sqlMatch[1].trim();
      }

      return result;
    },

    displayPdfMappingReview(data) {
      const reviewEl = document.getElementById('pdf-mapping-review');
      const tbody = document.getElementById('tbody-pdf-mapping-fields');
      reviewEl.style.display = 'block';

      const fields = [
        { key: 'title', label: 'Document Title', val: data.title, conf: data.title ? 'High' : 'Low' },
        { key: 'domain', label: 'Business Domain', val: data.domain, conf: data.domain ? 'High' : 'Low' },
        { key: 'system', label: 'Source System', val: data.system, conf: data.system ? 'Medium' : 'Low' },
        { key: 'table', label: 'Target Table', val: data.table, conf: data.table ? 'Medium' : 'Low' },
        { key: 'owner', label: 'Data Owner', val: data.owner, conf: data.owner ? 'Medium' : 'Low' },
        { key: 'expected', label: 'Expected Result', val: data.expected, conf: data.expected ? 'High' : 'Low' },
        { key: 'sql', label: 'SQL Query', val: data.sql, conf: data.sql ? 'High' : 'Low', isArea: true }
      ];

      tbody.innerHTML = fields.map(f => `
        <tr>
          <td style="width: 20%;"><strong>${f.label}</strong></td>
          <td>
            ${f.isArea ? `
              <textarea class="form-control form-control-sm" id="pdf-map-${f.key}" rows="3" style="font-family: monospace;">${this.escapeHtml(f.val)}</textarea>
            ` : `
              <input type="text" class="form-control form-control-sm" id="pdf-map-${f.key}" value="${this.escapeHtml(f.val)}">
            `}
          </td>
          <td style="width: 15%;">
            <span class="badge ${f.conf === 'High' ? 'badge-passed' : f.conf === 'Medium' ? 'badge-warning' : 'badge-status-draft'}">${f.conf}</span>
          </td>
        </tr>
      `).join('');

      document.getElementById('btn-confirm-pdf-import').onclick = () => {
        const now = new Date().toISOString();
        const newDoc = {
          id: 'DOC-PDF-' + Math.floor(1000 + Math.random() * 9000),
          title: document.getElementById('pdf-map-title').value.trim() || 'Extracted Document',
          documentType: 'Data Quality Validation Rules',
          businessDomain: document.getElementById('pdf-map-domain').value.trim(),
          owner: document.getElementById('pdf-map-owner').value.trim(),
          status: 'Draft',
          version: '1.0',
          createdAt: now,
          updatedAt: now,
          executiveSummary: 'Imported from legacy PDF document.',
          dataSource: {
            system: document.getElementById('pdf-map-system').value.trim(),
            tables: [document.getElementById('pdf-map-table').value.trim()].filter(Boolean),
            mappings: []
          },
          sqlDialect: 'Snowflake',
          sqlQuery: document.getElementById('pdf-map-sql').value.trim(),
          expectedResult: document.getElementById('pdf-map-expected').value.trim(),
          rules: [],
          executions: [],
          issues: [],
          approvals: []
        };

        this.currentDoc = newDoc;
        this.navigateTo('editor');
        this.showToast('Document created from PDF extraction', 'success');
      };

      document.getElementById('btn-cancel-pdf-import').onclick = () => {
        reviewEl.style.display = 'none';
      };
    },

    // ====================================================================
    // 16. VIEW: DBT ARTIFACTS IMPORT
    // ====================================================================

    renderDbtImport(container) {
      container.innerHTML = `
        <div class="card">
          <div class="card-header"><span class="card-title">dbt Core / Cloud Artifacts Local Parser</span></div>
          <div class="card-body">
            <div class="alert-banner alert-info">
              <span>ℹ️</span>
              <div>
                Select your dbt output JSON files (e.g., from <code>target/manifest.json</code>, <code>run_results.json</code>, or <code>catalog.json</code>). They will be parsed entirely inside your browser.
              </div>
            </div>

            <div class="grid-cols-3" style="margin-bottom: 20px;">
              <div>
                <label class="form-label">manifest.json (Models & Tests)</label>
                <input type="file" id="dbt-manifest-input" class="form-control" accept=".json">
              </div>
              <div>
                <label class="form-label">run_results.json (Execution Results)</label>
                <input type="file" id="dbt-run-results-input" class="form-control" accept=".json">
              </div>
              <div>
                <label class="form-label">catalog.json (Columns & Schemas)</label>
                <input type="file" id="dbt-catalog-input" class="form-control" accept=".json">
              </div>
            </div>

            <div style="display: flex; gap: 10px; margin-bottom: 24px;">
              <button class="btn btn-outline btn-sm" id="btn-load-sample-dbt">Load Sample dbt Files</button>
            </div>

            <div id="dbt-parsed-results" style="display: none;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <h3 style="font-size: 15px; font-weight: 700;">Discovered dbt Models & Tests</h3>
                <button class="btn btn-primary btn-sm" id="btn-convert-selected-dbt">Convert Selected to DQD Documents & Rules</button>
              </div>

              <div style="max-height: 400px; overflow-y: auto; border: 1px solid var(--surface-border); border-radius: var(--border-radius-sm);">
                <table class="table-custom">
                  <thead>
                    <tr>
                      <th><input type="checkbox" id="chk-dbt-all" checked></th>
                      <th>Type</th>
                      <th>Name</th>
                      <th>Description</th>
                      <th>Test Status</th>
                      <th>Failures</th>
                    </tr>
                  </thead>
                  <tbody id="tbody-dbt-parsed-rows"></tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      `;

      let manifestData = null;
      let runResultsData = null;
      let catalogData = null;

      const triggerParse = () => {
        if (!manifestData) return;
        this.parseDbtArtifacts(manifestData, runResultsData, catalogData);
      };

      document.getElementById('dbt-manifest-input').addEventListener('change', async (e) => {
        if (e.target.files[0]) {
          manifestData = JSON.parse(await e.target.files[0].text());
          triggerParse();
        }
      });
      document.getElementById('dbt-run-results-input').addEventListener('change', async (e) => {
        if (e.target.files[0]) {
          runResultsData = JSON.parse(await e.target.files[0].text());
          triggerParse();
        }
      });
      document.getElementById('dbt-catalog-input').addEventListener('change', async (e) => {
        if (e.target.files[0]) {
          catalogData = JSON.parse(await e.target.files[0].text());
          triggerParse();
        }
      });

      document.getElementById('btn-load-sample-dbt').addEventListener('click', async () => {
        manifestData = await this.fetchJsonOrDefault('samples/dbt_manifest_sample.json', null);
        runResultsData = await this.fetchJsonOrDefault('samples/dbt_run_results_sample.json', null);
        catalogData = await this.fetchJsonOrDefault('samples/dbt_catalog_sample.json', null);
        triggerParse();
        this.showToast('Sample dbt artifacts loaded', 'info');
      });
    },

    parseDbtArtifacts(manifest, runResults, catalog) {
      const resultsContainer = document.getElementById('dbt-parsed-results');
      const tbody = document.getElementById('tbody-dbt-parsed-rows');
      resultsContainer.style.display = 'block';

      const items = [];
      const nodes = manifest.nodes || {};

      // Map run results by unique_id
      const runMap = {};
      if (runResults && runResults.results) {
        runResults.results.forEach(r => { runMap[r.unique_id] = r; });
      }

      for (const [id, node] of Object.entries(nodes)) {
        if (node.resource_type === 'model' || node.resource_type === 'test') {
          const run = runMap[id];
          items.push({
            id,
            type: node.resource_type,
            name: node.name,
            description: node.description || '',
            sql: node.compiled_code || node.raw_code || '',
            status: run ? run.status.toUpperCase() : 'NOT RUN',
            failures: run ? (run.failures || 0) : 0,
            node
          });
        }
      }

      this._dbtItems = items;

      tbody.innerHTML = items.map((it, idx) => `
        <tr>
          <td><input type="checkbox" class="chk-dbt-item" data-idx="${idx}" checked></td>
          <td><span class="badge ${it.type === 'model' ? 'badge-info' : 'badge-status-in-review'}">${it.type}</span></td>
          <td><strong>${this.escapeHtml(it.name)}</strong></td>
          <td>${this.escapeHtml(it.description || '')}</td>
          <td>${this.getStatusBadge(it.status)}</td>
          <td>${it.failures}</td>
        </tr>
      `).join('');

      document.getElementById('chk-dbt-all').addEventListener('change', (e) => {
        document.querySelectorAll('.chk-dbt-item').forEach(c => { c.checked = e.target.checked; });
      });

      document.getElementById('btn-convert-selected-dbt').onclick = async () => {
        const checked = document.querySelectorAll('.chk-dbt-item:checked');
        let docCreated = 0;
        let rulesCreated = 0;

        for (const chk of checked) {
          const item = this._dbtItems[parseInt(chk.dataset.idx, 10)];
          if (item.type === 'model') {
            const doc = {
              id: 'DOC-DBT-' + item.name.toUpperCase(),
              title: `dbt Model: ${item.name}`,
              documentType: 'dbt Documentation',
              businessDomain: item.node.meta?.domain || 'Analytics',
              owner: item.node.meta?.owner || 'Analytics Engineering',
              status: 'Approved',
              version: '1.0',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              executiveSummary: item.description || `dbt model documentation for ${item.name}.`,
              dataSource: {
                system: 'dbt / Data Warehouse',
                catalog: item.node.database || '',
                schema: item.node.schema || '',
                tables: [item.name],
                mappings: []
              },
              sqlDialect: 'Snowflake',
              sqlQuery: item.sql,
              expectedResult: 'Model compiled and built without error',
              rules: [],
              executions: []
            };
            await this.dbPut('documents', doc);
            this.documents.unshift(doc);
            docCreated++;
          } else if (item.type === 'test') {
            const rule = {
              id: 'RULE-DBT-' + item.name.toUpperCase().slice(0, 24),
              name: item.name,
              dimension: item.name.includes('unique') ? 'Uniqueness' : item.name.includes('not_null') ? 'Completeness' : 'Validity',
              severity: 'High',
              description: item.description || `dbt test assertion: ${item.name}`,
              sql: item.sql,
              expectedResult: '0 rows failed',
              threshold: '0',
              dialect: 'Snowflake'
            };
            await this.dbPut('rules', rule);
            this.rules.unshift(rule);
            rulesCreated++;
          }
        }

        this.updateSidebarBadges();
        this.showToast(`Converted ${docCreated} models into documents and ${rulesCreated} tests into rules!`, 'success');
      };
    },

    // ====================================================================
    // 17. VIEW: QUALITY SCORECARDS
    // ====================================================================

    renderScorecards(container) {
      if (!this.config.features.qualityScorecards) {
        container.innerHTML = `<div class="card"><div class="card-body">Quality Scorecards are currently disabled in configuration. Enable them in Settings.</div></div>`;
        return;
      }

      const totalRules = this.rules.length;
      const totalExecs = this.executions.length;
      const passedExecs = this.executions.filter(e => e.status === 'PASSED').length;
      const failedExecs = this.executions.filter(e => e.status === 'FAILED').length;
      const passRate = totalExecs > 0 ? ((passedExecs / totalExecs) * 100).toFixed(1) : '100.0';

      container.innerHTML = `
        <div class="grid-cols-4" style="margin-bottom: 24px;">
          <div class="metric-tile">
            <div class="metric-icon-box" style="background: rgba(31,78,121,0.1); color: var(--primary-color);">🛡️</div>
            <div>
              <div class="metric-value">${totalRules}</div>
              <div class="metric-label">Total Documented Rules</div>
            </div>
          </div>
          <div class="metric-tile">
            <div class="metric-icon-box" style="background: rgba(16,185,129,0.1); color: var(--status-passed);">✅</div>
            <div>
              <div class="metric-value">${passRate}%</div>
              <div class="metric-label">Aggregate Pass Rate</div>
            </div>
          </div>
          <div class="metric-tile">
            <div class="metric-icon-box" style="background: rgba(239,68,68,0.1); color: var(--status-failed);">❌</div>
            <div>
              <div class="metric-value">${failedExecs}</div>
              <div class="metric-label">Failed Runs</div>
            </div>
          </div>
          <div class="metric-tile">
            <div class="metric-icon-box" style="background: rgba(68,114,196,0.1); color: var(--secondary-color);">⏱️</div>
            <div>
              <div class="metric-value">${totalExecs}</div>
              <div class="metric-label">Logged Executions</div>
            </div>
          </div>
        </div>

        <div class="grid-cols-2">
          <!-- Doughnut Pass / Fail -->
          <div class="card">
            <div class="card-header"><span class="card-title">Execution Status Breakdown</span></div>
            <div class="card-body" style="height: 300px; display: flex; align-items: center; justify-content: center;">
              <canvas id="chart-pass-fail"></canvas>
            </div>
          </div>

          <!-- Dimensions Bar Chart -->
          <div class="card">
            <div class="card-header"><span class="card-title">Rules by Quality Dimension</span></div>
            <div class="card-body" style="height: 300px; display: flex; align-items: center; justify-content: center;">
              <canvas id="chart-dimensions"></canvas>
            </div>
          </div>
        </div>
      `;

      if (window.Chart) {
        // Doughnut Chart
        const ctxDoughnut = document.getElementById('chart-pass-fail');
        new Chart(ctxDoughnut, {
          type: 'doughnut',
          data: {
            labels: ['Passed', 'Failed', 'Warning/Other'],
            datasets: [{
              data: [passedExecs, failedExecs, Math.max(0, totalExecs - passedExecs - failedExecs)],
              backgroundColor: ['#10B981', '#EF4444', '#F59E0B']
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false
          }
        });

        // Dimensions count
        const dimCounts = {};
        this.rules.forEach(r => {
          const d = r.dimension || 'Other';
          dimCounts[d] = (dimCounts[d] || 0) + 1;
        });

        const ctxBar = document.getElementById('chart-dimensions');
        new Chart(ctxBar, {
          type: 'bar',
          data: {
            labels: Object.keys(dimCounts),
            datasets: [{
              label: 'Rule Count',
              data: Object.values(dimCounts),
              backgroundColor: this.config.branding.secondaryColor || '#4472C4'
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: { beginAtZero: true }
            }
          }
        });
      }
    },

    // ====================================================================
    // 18. VIEW: APPROVALS & GOVERNANCE
    // ====================================================================

    renderApprovals(container) {
      container.innerHTML = `
        <div class="card">
          <div class="card-header"><span class="card-title">Approval Workflow & Sign-Off Management</span></div>
          <div class="card-body" style="padding: 0;">
            <table class="table-custom">
              <thead>
                <tr>
                  <th>Document ID</th>
                  <th>Title</th>
                  <th>Domain</th>
                  <th>Author</th>
                  <th>Current Status</th>
                  <th>Assigned Reviewer</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${this.documents.map(doc => `
                  <tr>
                    <td><strong>${doc.id}</strong></td>
                    <td>${this.escapeHtml(doc.title)}</td>
                    <td>${this.escapeHtml(doc.businessDomain || 'N/A')}</td>
                    <td>${this.escapeHtml(doc.owner || 'N/A')}</td>
                    <td>${this.getStatusBadge(doc.status)}</td>
                    <td>${this.escapeHtml(doc.reviewer || 'Unassigned')}</td>
                    <td>
                      <button class="btn btn-outline btn-sm btn-action-signoff" data-id="${doc.id}">Sign-Off</button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;

      container.querySelectorAll('.btn-action-signoff').forEach(b => {
        b.addEventListener('click', () => {
          const doc = this.documents.find(d => d.id === b.dataset.id);
          if (doc) {
            this.currentDoc = doc;
            this.showApprovalModal();
          }
        });
      });
    },

    showApprovalModal() {
      this.openModal('Record Governance Sign-Off', `
        <div class="form-group">
          <label class="form-label required">Reviewer Name & Title</label>
          <input type="text" id="app-in-reviewer" class="form-control" value="${this.escapeHtml(this.currentDoc.reviewer || 'Lead Data Architect')}">
        </div>
        <div class="form-group">
          <label class="form-label required">Approval Decision</label>
          <select id="app-in-status" class="form-control">
            <option value="Approved">Approved</option>
            <option value="Changes Requested">Changes Requested</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Review Comments & Justification</label>
          <textarea id="app-in-comments" class="form-control" rows="3" placeholder="State compliance with data standards or required remediation items..."></textarea>
        </div>
      `, [
        { label: 'Cancel', class: 'btn-outline', action: () => this.closeModal() },
        { label: 'Record Decision', class: 'btn-primary', action: async () => {
          const reviewer = document.getElementById('app-in-reviewer').value.trim();
          const status = document.getElementById('app-in-status').value;
          const comments = document.getElementById('app-in-comments').value.trim();

          const record = {
            status,
            reviewer,
            comments,
            timestamp: new Date().toISOString()
          };

          this.currentDoc.status = status;
          this.currentDoc.reviewer = reviewer;
          this.currentDoc.approvals = this.currentDoc.approvals || [];
          this.currentDoc.approvals.unshift(record);

          await this.saveCurrentDocument();
          await this.logAudit(`Sign-Off: ${status}`, `Reviewer ${reviewer} marked ${this.currentDoc.id} as ${status}`, reviewer, this.currentDoc.id);

          this.closeModal();
          if (this.currentView === 'editor') {
            this.updateEditorGovernanceView();
          } else {
            this.navigateTo(this.currentView);
          }
          this.showToast(`Sign-off recorded: ${status}`, 'success');
        }}
      ]);
    },

    // ====================================================================
    // 19. VIEW: AUDIT HISTORY
    // ====================================================================

    renderAudit(container) {
      container.innerHTML = `
        <div class="card">
          <div class="card-header">
            <span class="card-title">Local Audit Trail</span>
            <button class="btn btn-outline btn-sm" id="btn-export-audit">Export Audit Log (CSV)</button>
          </div>
          <div class="card-body">
            <div class="alert-banner alert-warning" style="margin-bottom: 16px;">
              <span>⚠️</span>
              <div>
                <strong>Local Environment Notice:</strong> This audit trail is recorded locally inside your browser's IndexedDB storage. It is suitable for personal traceability and local compliance records, but is not a centralized tamper-proof server audit log.
              </div>
            </div>

            <table class="table-custom">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Action</th>
                  <th>Details</th>
                  <th>Actor</th>
                  <th>Target ID</th>
                </tr>
              </thead>
              <tbody>
                ${this.auditLogs.map(a => `
                  <tr>
                    <td>${new Date(a.timestamp).toLocaleString()}</td>
                    <td><strong>${this.escapeHtml(a.action)}</strong></td>
                    <td>${this.escapeHtml(a.details)}</td>
                    <td>${this.escapeHtml(a.actor)}</td>
                    <td><span style="font-family: monospace;">${a.targetId || 'N/A'}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;

      document.getElementById('btn-export-audit').addEventListener('click', () => {
        let csv = 'timestamp,action,details,actor,target_id\n';
        this.auditLogs.forEach(a => {
          csv += `"${a.timestamp}","${a.action}","${this.sanitizeCsv(a.details)}","${a.actor}","${a.targetId || ''}"\n`;
        });
        this.downloadBlob(new Blob([csv], { type: 'text/csv' }), 'dqd-audit-log.csv');
      });
    },

    // ====================================================================
    // 20. VIEW: SETTINGS & PORTABILITY
    // ====================================================================

    renderSettings(container) {
      const cfg = this.config;
      const profile = this.getActiveProfile();
      const currentProfileKey = this.getActiveProfileKey();
      const b = Object.assign({}, (profile && profile.branding) || {}, cfg.branding || {});
      const p = cfg.pdf || {};
      const cfgUser = this.getUserInfo();

      container.innerHTML = `
        <!-- Active Team Workspace Profile Card -->
        <div class="card" style="margin-bottom: 20px;">
          <div class="card-header" style="justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="font-size: 20px;">🏢</span>
              <span class="card-title">Active Team Profile Workspace</span>
            </div>
            <span class="badge badge-info" id="set-lbl-active-edition">${this.escapeHtml(profile.editionTag || 'Team Edition')}</span>
          </div>
          <div class="card-body">
            <div class="grid-cols-2" style="align-items: center; gap: 20px;">
              <div>
                <label class="form-label" style="font-size: 13px; font-weight: 700;">Select Active Team Discipline</label>
                <select id="set-sel-team-profile" class="form-control" style="font-weight: 700; font-size: 14px; padding: 10px 14px;">
                  <option value="data_quality" ${currentProfileKey === 'data_quality' ? 'selected' : ''}>🛡️ Data Quality Engineering</option>
                  <option value="data_analysis" ${currentProfileKey === 'data_analysis' ? 'selected' : ''}>📈 Data Analysis & Business Intelligence</option>
                  <option value="data_engineering" ${currentProfileKey === 'data_engineering' ? 'selected' : ''}>⚙️ Data Engineering & Pipelines</option>
                  <option value="data_modelling" ${currentProfileKey === 'data_modelling' ? 'selected' : ''}>📐 Data Architecture & Modelling</option>
                </select>
                <div class="form-text" style="margin-top: 6px;">Switches document templates, validation subtypes, suggested dynamic pills, and workflow nomenclature across the platform.</div>
              </div>
              <div style="background: var(--surface-alt); padding: 16px 20px; border-radius: var(--border-radius-md); border: 1px solid var(--surface-border);">
                <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: var(--text-muted); margin-bottom: 4px;">ACTIVE DISCIPLINE ROLE:</div>
                <div style="font-size: 16px; font-weight: 700; color: var(--primary-color);" id="set-lbl-role-title">${this.escapeHtml(profile.roleTitle)}</div>
                <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;" id="set-lbl-profile-sub">${this.escapeHtml(profile.subtitle || '')}</div>
                <div style="margin-top: 10px; display: flex; gap: 6px; flex-wrap: wrap;" id="set-box-profile-subtypes">
                  ${(profile.subtypes || []).map(st => `<span class="badge badge-outline">${st.icon || '📄'} ${this.escapeHtml(st.name)}</span>`).join('')}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Default Author & Sign-Off Attribution Details Card -->
        <div class="card" style="margin-bottom: 20px;">
          <div class="card-header" style="justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="font-size: 20px;">👤</span>
              <span class="card-title">Default Document Author & Sign-Off Details</span>
            </div>
            <span class="badge badge-outline">Global Defaults</span>
          </div>
          <div class="card-body">
            <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 14px;">
              Configure default author attribution for this workspace. Values can be null/empty or custom strings. When provided, they are stamped at the end of generated PDF documents and exported with <code>.dqdoc</code> files.
            </p>
            <div class="grid-cols-3">
              <div class="form-group">
                <label class="form-label">Username / Author Name</label>
                <input type="text" id="set-in-username" class="form-control" value="${this.escapeHtml(cfgUser.username || '')}" placeholder="e.g. jdoe or Jane Doe">
              </div>
              <div class="form-group">
                <label class="form-label">User Email</label>
                <input type="email" id="set-in-useremail" class="form-control" value="${this.escapeHtml(cfgUser.useremail || '')}" placeholder="e.g. jane.doe@company.com">
              </div>
              <div class="form-group">
                <label class="form-label">User Phone</label>
                <input type="tel" id="set-in-userphone" class="form-control" value="${this.escapeHtml(cfgUser.userphone || '')}" placeholder="e.g. +1 (555) 019-2834">
              </div>
            </div>
            <div style="display: flex; gap: 10px; align-items: center; margin-top: 4px;">
              <button class="btn btn-secondary btn-sm" id="btn-save-user-info">Save Author Details</button>
              <button class="btn btn-outline btn-sm" id="btn-clear-user-info">Clear (Set to Null)</button>
            </div>
          </div>
        </div>

        <div class="grid-cols-2">
          <!-- Branding Configuration -->
          <div class="card">
            <div class="card-header"><span class="card-title">Branding & Colors</span></div>
            <div class="card-body">
              <div class="form-group">
                <label class="form-label">Application Name</label>
                <input type="text" id="set-in-appname" class="form-control" value="${this.escapeHtml(cfg.appName || '')}">
              </div>

              <div class="grid-cols-3">
                <div class="form-group">
                  <label class="form-label">Primary Color</label>
                  <input type="color" id="set-in-color-primary" class="form-control" style="height: 38px; padding: 2px;" value="${b.primaryColor || '#1F4E79'}">
                </div>
                <div class="form-group">
                  <label class="form-label">Secondary Color</label>
                  <input type="color" id="set-in-color-secondary" class="form-control" style="height: 38px; padding: 2px;" value="${b.secondaryColor || '#4472C4'}">
                </div>
                <div class="form-group">
                  <label class="form-label">Accent Color</label>
                  <input type="color" id="set-in-color-accent" class="form-control" style="height: 38px; padding: 2px;" value="${b.accentColor || '#00A6A6'}">
                </div>
              </div>

              <div class="grid-cols-2">
                <div class="form-group">
                  <label class="form-label">Background Color</label>
                  <input type="color" id="set-in-color-bg" class="form-control" style="height: 38px; padding: 2px;" value="${b.backgroundColor || '#F5F7FA'}">
                </div>
                <div class="form-group">
                  <label class="form-label">Text Color</label>
                  <input type="color" id="set-in-color-text" class="form-control" style="height: 38px; padding: 2px;" value="${b.textColor || '#1F2937'}">
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Font Family</label>
                <input type="text" id="set-in-font" class="form-control" value="${this.escapeHtml(b.fontFamily || 'Segoe UI, Arial, sans-serif')}">
              </div>

              <div class="form-group">
                <label class="form-label">PDF Header / Footer Text</label>
                <input type="text" id="set-in-footer" class="form-control" value="${this.escapeHtml(b.footerText || '')}">
              </div>

              <div class="form-group">
                <label class="form-label">Logo & Favicon Image Path</label>
                <input type="text" id="set-in-logo-path" class="form-control" value="${this.escapeHtml(b.logoPath || './assets/logo.png')}" placeholder="./assets/logo.png">
              </div>

              <div class="grid-cols-2" style="margin-top: 12px; border-top: 1px solid var(--surface-border); padding-top: 12px;">
                <div class="form-group">
                  <label class="form-label">PDF Paper Size</label>
                  <select id="set-sel-pdf-size" class="form-control">
                    <option value="a4" ${p.paperSize === 'a4' || !p.paperSize ? 'selected' : ''}>A4 (Standard)</option>
                    <option value="letter" ${p.paperSize === 'letter' ? 'selected' : ''}>US Letter</option>
                    <option value="legal" ${p.paperSize === 'legal' ? 'selected' : ''}>US Legal</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">PDF Page Orientation</label>
                  <select id="set-sel-pdf-orient" class="form-control">
                    <option value="portrait" ${p.orientation !== 'landscape' ? 'selected' : ''}>Portrait</option>
                    <option value="landscape" ${p.orientation === 'landscape' ? 'selected' : ''}>Landscape</option>
                  </select>
                </div>
              </div>

              <div class="form-group">
                <label><input type="checkbox" id="set-chk-logo" ${b.showLogo !== false ? 'checked' : ''}> Show Logo in Sidebar & PDF</label>
              </div>
              <div class="form-group">
                <label><input type="checkbox" id="set-chk-pdf-rev" ${p.includeRevisionHistory !== false ? 'checked' : ''}> Include Document Revision History in PDF</label>
              </div>
              <div class="form-group">
                <label><input type="checkbox" id="set-chk-pdf-only" ${p.onlyGeneratePdf !== false ? 'checked' : ''}> Default to PDF-only export (skip automatic .dqdoc download)</label>
              </div>

              <button class="btn btn-primary btn-sm" id="btn-save-branding">Apply Branding & PDF Settings</button>
            </div>
          </div>

          <!-- Portable Config Import & Export (.env & JSON) -->
          <div class="card">
            <div class="card-header"><span class="card-title">Portability & Configuration Transfer</span></div>
            <div class="card-body">
              <div class="alert-banner alert-info">
                <span>💡</span>
                <div>
                  <strong>Moving to another Windows PC:</strong><br>
                  1. Export your Complete Backup JSON below.<br>
                  2. Copy the <code>Data-Quality-Documenter/</code> folder to the other PC.<br>
                  3. Open <code>index.html</code> in Edge or Chrome and click "Restore Backup".
                </div>
              </div>

              <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px;">
                <button class="btn btn-outline" id="btn-export-env">📄 Export Configuration (.env file)</button>
                <button class="btn btn-outline" id="btn-export-config-json">💾 Export Configuration (JSON)</button>
                <div style="border-top: 1px solid var(--surface-border); margin: 6px 0;"></div>
                <label class="btn btn-outline" style="cursor: pointer; text-align: center;">
                  📥 Import Configuration (.env / JSON)
                  <input type="file" id="set-import-config-file" accept=".env,.json,.txt" style="display: none;">
                </label>
              </div>

              <div style="border-top: 2px solid var(--surface-border); padding-top: 16px;">
                <h4 style="font-weight: 700; margin-bottom: 8px;">Full Workspace Backup & Restore</h4>
                <div style="display: flex; gap: 10px;">
                  <button class="btn btn-secondary" id="btn-full-backup">💾 Download Backup</button>
                  <label class="btn btn-outline" style="cursor: pointer;">
                    📥 Restore Backup
                    <input type="file" id="set-restore-backup-file" accept=".json" style="display: none;">
                  </label>
                </div>
              </div>

              <div style="margin-top: 24px; border-top: 1px solid var(--surface-border); padding-top: 16px;">
                <button class="btn btn-danger btn-sm" id="btn-reset-defaults">Reset Configuration to Default config.js</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Smart Autocomplete & Memory Dictionary (.txt) -->
        <div class="card" style="margin-top: 24px;">
          <div class="card-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
            <div>
              <span class="card-title">🧠 Smart Autocomplete & Unique Input Memory (.txt)</span>
              <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 4px;">
                Automatically captures and remembers every new unique value you type across form fields. Use these values as instant auto-complete suggestions, or export/import them via text file.
              </p>
            </div>
            <div style="display: flex; gap: 8px;">
              <button class="btn btn-primary btn-sm" id="btn-export-vocab-txt">📥 Export Vocabulary (.txt)</button>
              <label class="btn btn-outline btn-sm" style="cursor: pointer;">
                📤 Import Vocabulary (.txt)
                <input type="file" id="set-import-vocab-file" accept=".txt" style="display: none;">
              </label>
              <button class="btn btn-outline btn-sm" id="btn-reset-vocab">🔄 Reset to Defaults</button>
            </div>
          </div>
          <div class="card-body">
            <div style="display: flex; gap: 20px; align-items: flex-start; flex-wrap: wrap;">
              <div style="background: var(--surface-bg); padding: 16px 20px; border-radius: var(--border-radius); border: 1px solid var(--surface-border); min-width: 180px; text-align: center;">
                <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px;">Learned Terms</div>
                <div style="font-size: 2rem; font-weight: 800; color: var(--primary); margin: 6px 0;">${this.getTotalVocabularyTermsCount()}</div>
                <div style="font-size: 0.8rem; color: var(--text-muted);">across 15 categories</div>
              </div>
              <div style="flex: 1; min-width: 280px;">
                <h5 style="font-weight: 700; margin-bottom: 8px; font-size: 0.9rem;">Auto-Learned Categories</h5>
                <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                  ${Object.entries(this.vocabulary || {}).map(([cat, list]) => `
                    <span class="badge badge-info" style="font-size: 0.8rem; padding: 6px 10px;">
                      <strong>${cat}</strong>: ${(list || []).length}
                    </span>
                  `).join('')}
                </div>
                <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 12px; line-height: 1.4;">
                  💡 <em>Whenever you save a Document, new unique entries in Domain, Owner, Reviewer, Frequency, Systems, Catalogs, Schemas, Tables, Data Types, and Transform Rules are automatically memorized.</em>
                </p>
              </div>
            </div>
          </div>
        </div>
      `;

      // Event handlers
      document.getElementById('set-sel-team-profile')?.addEventListener('change', (e) => {
        this.switchTeamProfile(e.target.value, false);
        this.renderSettings(container);
      });

      document.getElementById('btn-save-user-info')?.addEventListener('click', () => {
        const uName = document.getElementById('set-in-username')?.value.trim() || null;
        const uEmail = document.getElementById('set-in-useremail')?.value.trim() || null;
        const uPhone = document.getElementById('set-in-userphone')?.value.trim() || null;
        this.saveUserInfo({ username: uName, useremail: uEmail, userphone: uPhone });
        this.showToast('Author details saved successfully', 'success');
      });

      document.getElementById('btn-clear-user-info')?.addEventListener('click', () => {
        const inName = document.getElementById('set-in-username');
        const inEmail = document.getElementById('set-in-useremail');
        const inPhone = document.getElementById('set-in-userphone');
        if (inName) inName.value = '';
        if (inEmail) inEmail.value = '';
        if (inPhone) inPhone.value = '';
        this.saveUserInfo({ username: null, useremail: null, userphone: null });
        this.showToast('Author details cleared (set to null)', 'info');
      });

      document.getElementById('btn-save-branding')?.addEventListener('click', () => {
        this.config.appName = document.getElementById('set-in-appname').value.trim();
        this.config.branding = this.config.branding || {};
        this.config.branding.primaryColor = document.getElementById('set-in-color-primary').value;
        this.config.branding.secondaryColor = document.getElementById('set-in-color-secondary').value;
        this.config.branding.accentColor = document.getElementById('set-in-color-accent').value;
        this.config.branding.backgroundColor = document.getElementById('set-in-color-bg').value;
        this.config.branding.textColor = document.getElementById('set-in-color-text').value;
        this.config.branding.fontFamily = document.getElementById('set-in-font').value.trim();
        this.config.branding.footerText = document.getElementById('set-in-footer').value.trim();
        this.config.branding.showLogo = document.getElementById('set-chk-logo').checked;
        const customLogo = document.getElementById('set-in-logo-path')?.value.trim();
        if (customLogo) {
          this.config.branding.logoPath = customLogo;
          this.config.branding.faviconPath = customLogo;
        }

        this.config.pdf = this.config.pdf || {};
        const selPdfSize = document.getElementById('set-sel-pdf-size');
        if (selPdfSize) this.config.pdf.paperSize = selPdfSize.value;
        const selPdfOrient = document.getElementById('set-sel-pdf-orient');
        if (selPdfOrient) this.config.pdf.orientation = selPdfOrient.value;
        const chkPdfRev = document.getElementById('set-chk-pdf-rev');
        if (chkPdfRev) this.config.pdf.includeRevisionHistory = chkPdfRev.checked;
        const chkPdfOnly = document.getElementById('set-chk-pdf-only');
        if (chkPdfOnly) this.config.pdf.onlyGeneratePdf = chkPdfOnly.checked;

        // Also sync Author Info fields if present
        const uName = document.getElementById('set-in-username')?.value.trim() || null;
        const uEmail = document.getElementById('set-in-useremail')?.value.trim() || null;
        const uPhone = document.getElementById('set-in-userphone')?.value.trim() || null;
        this.saveUserInfo({ username: uName, useremail: uEmail, userphone: uPhone });

        // Also keep the active profile branding in sync with customized branding
        const profile = this.getActiveProfile();
        if (profile && profile.branding) {
          Object.assign(profile.branding, this.config.branding);
        }

        localStorage.setItem('DQD_CONFIG_OVERRIDE', JSON.stringify(this.config));
        this.applyBranding();
        this.showToast('Branding, Author & PDF configuration saved successfully', 'success');
      });

      document.getElementById('btn-export-env')?.addEventListener('click', () => this.exportConfigToEnv());
      document.getElementById('btn-export-config-json')?.addEventListener('click', () => {
        this.downloadJson(this.config, 'dqd-config.json');
      });

      document.getElementById('set-import-config-file')?.addEventListener('change', async (e) => {
        if (e.target.files[0]) this.importConfigFile(e.target.files[0]);
      });

      document.getElementById('btn-full-backup')?.addEventListener('click', () => this.exportCompleteBackup());
      document.getElementById('set-restore-backup-file')?.addEventListener('change', async (e) => {
        if (e.target.files[0]) this.restoreCompleteBackup(e.target.files[0]);
      });

      // Vocabulary handlers
      document.getElementById('btn-export-vocab-txt')?.addEventListener('click', () => this.exportVocabularyTxt());
      document.getElementById('set-import-vocab-file')?.addEventListener('change', async (e) => {
        if (e.target.files[0]) this.importVocabularyTxt(e.target.files[0]);
      });
      document.getElementById('btn-reset-vocab')?.addEventListener('click', () => {
        if (confirm('Reset vocabulary dictionary to defaults?')) {
          localStorage.removeItem('DQD_VOCABULARY');
          this.initVocabulary();
          this.renderDatalists();
          this.navigateTo('settings');
          this.showToast('Vocabulary reset to defaults', 'info');
        }
      });

      document.getElementById('btn-reset-defaults')?.addEventListener('click', () => {
        if (confirm('Reset all custom settings to default config.js values?')) {
          localStorage.removeItem('DQD_CONFIG_OVERRIDE');
          this.initConfig();
          this.applyBranding();
          this.navigateTo('settings');
          this.showToast('Settings reset to defaults', 'info');
        }
      });
    },

    exportConfigToEnv() {
      const b = this.config.branding || {};
      const u = this.getUserInfo();
      const envText = `# ====================================================================
# Data Quality Documenter - Exported Configuration (.env format)
# ====================================================================

# Active Team Profile Selection (data_quality | data_analysis | data_engineering | data_modelling)
ACTIVE_TEAM_PROFILE="${this.getActiveProfileKey() || 'data_quality'}"

# Application Information
APP_NAME="${this.config.appName || 'Data Workspace Documenter'}"

# User / Author Information (Optional: can be blank/null; if provided, shown at end of generated documents)
USER_NAME="${u.username || ''}"
USER_EMAIL="${u.useremail || ''}"
USER_PHONE="${u.userphone || ''}"

# Branding and Colors
BRANDING_LOGO_PATH="${b.logoPath || './assets/logo.png'}"
BRANDING_FAVICON_PATH="${b.faviconPath || b.logoPath || './assets/logo.png'}"
BRANDING_PRIMARY_COLOR="${b.primaryColor || '#1F4E79'}"
BRANDING_SECONDARY_COLOR="${b.secondaryColor || '#4472C4'}"
BRANDING_ACCENT_COLOR="${b.accentColor || '#00A6A6'}"
BRANDING_BACKGROUND_COLOR="${b.backgroundColor || '#F5F7FA'}"
BRANDING_TEXT_COLOR="${b.textColor || '#1F2937'}"
BRANDING_FONT_FAMILY="${b.fontFamily || 'Segoe UI, Arial, sans-serif'}"
BRANDING_FOOTER_TEXT="${b.footerText || ''}"
BRANDING_SHOW_LOGO=${b.showLogo !== false}
FEATURE_QUALITY_SCORECARDS=${this.config.features?.qualityScorecards !== false}
FEATURE_DBT_IMPORT=${this.config.features?.dbtImport !== false}
FEATURE_FILESYSTEM_SEARCH=${this.config.features?.filesystemSearch !== false}
`;
      this.downloadBlob(new Blob([envText], { type: 'text/plain' }), 'config.env');
    },

    async importConfigFile(file) {
      const text = await file.text();
      try {
        if (file.name.endsWith('.json')) {
          const parsed = JSON.parse(text);
          this.config = this.deepMerge(this.config, parsed);
          if (parsed.userInfo) {
            this.saveUserInfo(parsed.userInfo);
          } else if (parsed.username || parsed.useremail || parsed.userphone) {
            this.saveUserInfo({ username: parsed.username, useremail: parsed.useremail, userphone: parsed.userphone });
          }
        } else {
          // Parse .env
          const lines = text.split(/\r?\n/);
          lines.forEach(l => {
            const m = l.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)$/);
            if (m) {
              const k = m[1];
              let val = m[2].trim().replace(/^["']|["']$/g, '');
              if (val === 'true') val = true;
              else if (val === 'false') val = false;

              if (k === 'ACTIVE_TEAM_PROFILE') {
                this.switchTeamProfile(val, false);
              } else if (k === 'USER_NAME') {
                this.saveUserInfo({ username: val || null });
              } else if (k === 'USER_EMAIL') {
                this.saveUserInfo({ useremail: val || null });
              } else if (k === 'USER_PHONE') {
                this.saveUserInfo({ userphone: val || null });
              } else if (k === 'APP_NAME') this.config.appName = val;
              else if (k === 'BRANDING_LOGO_PATH') this.config.branding.logoPath = val;
              else if (k === 'BRANDING_FAVICON_PATH') this.config.branding.faviconPath = val;
              else if (k === 'BRANDING_PRIMARY_COLOR') this.config.branding.primaryColor = val;
              else if (k === 'BRANDING_SECONDARY_COLOR') this.config.branding.secondaryColor = val;
              else if (k === 'BRANDING_ACCENT_COLOR') this.config.branding.accentColor = val;
              else if (k === 'BRANDING_BACKGROUND_COLOR') this.config.branding.backgroundColor = val;
              else if (k === 'BRANDING_TEXT_COLOR') this.config.branding.textColor = val;
              else if (k === 'BRANDING_FOOTER_TEXT') this.config.branding.footerText = val;
              else if (k === 'FEATURE_QUALITY_SCORECARDS') this.config.features.qualityScorecards = val;
            }
          });
        }

        localStorage.setItem('DQD_CONFIG_OVERRIDE', JSON.stringify(this.config));
        this.applyBranding();
        this.navigateTo('settings');
        this.showToast('Configuration imported successfully', 'success');
      } catch (e) {
        alert('Error parsing configuration: ' + e.message);
      }
    },

    // Full Workspace Backup & Restore
    async exportCompleteBackup() {
      const backup = {
        app: "Data Quality Documenter",
        version: "1.0",
        exportedAt: new Date().toISOString(),
        config: this.config,
        documents: this.documents,
        rules: this.rules,
        templates: this.templates,
        executions: this.executions,
        issues: this.issues,
        audit: this.auditLogs
      };

      const filename = `dqd-full-backup-${new Date().toISOString().slice(0, 10)}.json`;
      this.downloadJson(backup, filename);
      this.showToast('Complete backup downloaded', 'success');
    },

    async restoreCompleteBackup(file) {
      try {
        const text = await file.text();
        const data = JSON.parse(text);

        if (!data.documents && !data.rules) {
          alert('Invalid backup file structure.');
          return;
        }

        if (!confirm(`Restore backup containing ${(data.documents || []).length} documents and ${(data.rules || []).length} rules? This will merge with existing records.`)) {
          return;
        }

        if (data.documents) {
          for (const d of data.documents) {
            await this.dbPut('documents', d);
            const idx = this.documents.findIndex(x => x.id === d.id);
            if (idx >= 0) this.documents[idx] = d;
            else this.documents.push(d);
          }
        }

        if (data.rules) {
          for (const r of data.rules) {
            await this.dbPut('rules', r);
            const idx = this.rules.findIndex(x => x.id === r.id);
            if (idx >= 0) this.rules[idx] = r;
            else this.rules.push(r);
          }
        }

        if (data.config) {
          this.config = data.config;
          localStorage.setItem('DQD_CONFIG_OVERRIDE', JSON.stringify(this.config));
          this.applyBranding();
        }

        await this.logAudit('Backup Restored', `Restored backup file ${file.name}`, 'User');
        this.updateSidebarBadges();
        this.navigateTo('dashboard');
        this.showToast('Workspace restored successfully!', 'success');
      } catch (e) {
        alert('Error restoring backup: ' + e.message);
      }
    },

    // ====================================================================
    // 21. PROFESSIONAL PDF GENERATION (A4 SEARCHABLE REPORT)
    // ====================================================================

    getProfileAttributes(profileKey) {
      const key = profileKey || this.getActiveProfileKey() || 'data_quality';
      if (this.config && this.config.teamProfiles && this.config.teamProfiles[key] && Array.isArray(this.config.teamProfiles[key].profileAttributes)) {
        return this.config.teamProfiles[key].profileAttributes;
      }
      if (window.DQD_CONFIG && window.DQD_CONFIG.teamProfiles && window.DQD_CONFIG.teamProfiles[key] && Array.isArray(window.DQD_CONFIG.teamProfiles[key].profileAttributes)) {
        return window.DQD_CONFIG.teamProfiles[key].profileAttributes;
      }
      return [];
    },

    getSuggestedInputsForType(type) {
      switch (type) {
        // Data Quality Subtypes
        case 'Model Validation':
          return [
            'Target dbt Model Name',
            'Model Lineage & Upstream Sources',
            'Grain / Unique Primary Key',
            'Materialization (View/Table/Incremental)',
            'Incremental Partition Strategy',
            'Transformation Business Logic',
            'Upstream Airflow DAG'
          ];
        case 'Table Validation':
          return [
            'Trino Catalog / Database',
            'Physical Schema Name',
            'Physical Table / View Name',
            'Storage Format (Parquet/Iceberg/Delta)',
            'Partition Columns & Cluster Keys',
            'Expected Row Count & Volume',
            'Data Retention Policy',
            'SLA Delivery Deadline'
          ];
        case 'Model and Table Validation':
          return [
            'Target Model Name',
            'Target Physical Storage Table',
            'Model-to-Storage Latency',
            'Reconciliation Tolerance ($ or %)',
            'Grain / Primary Key Alignment',
            'Partition Key Mapping'
          ];
        case 'Issue Investigation':
          return [
            'Incident Severity (P1-Critical to P4-Low)',
            'Incident Trigger & Detection Method',
            'Impacted Downstream Systems & Reports',
            'Root Cause Category (5-Whys)',
            'Immediate Short-Term Containment',
            'Corrective & Preventive Action (CAPA)',
            'Incident Lead / Commander',
            'Target Resolution Date'
          ];

        // Data Analysis Subtypes
        case 'Metric & KPI Definition':
        case 'Metric Definition':
          return [
            'Metric Calculation Formula',
            'Target Stakeholder & Decision Maker',
            'Time Horizon & Date Granularity',
            'Dimension Slices & Segmentations',
            'BI Dashboard URL / Report ID',
            'Excluded Outlier Rules',
            'Primary Business Owner'
          ];
        case 'Ad-Hoc Analysis Brief':
        case 'Ad-Hoc Analysis':
          return [
            'Core Business Question & Hypothesis',
            'Target Executive Stakeholder',
            'Analysis Methodology & Data Cuts',
            'Sample Size & Statistical Confidence',
            'Key Strategic Findings',
            'Actionable Business Recommendations'
          ];
        case 'Cohort & Funnel Study':
        case 'Cohort & Funnel':
          return [
            'Cohort Definition & Registration Window',
            'Activation Milestone Event',
            'Funnel Conversion Stages',
            'Time Granularity (Weekly/Monthly)',
            'Drop-off Threshold & Retention Benchmark',
            'Target User Segment'
          ];
        case 'A/B Test Evaluation':
        case 'Experimentation / AB':
          return [
            'Null & Alternative Hypothesis',
            'Minimum Detectable Effect (MDE)',
            'Statistical Significance (P-Value / Alpha)',
            'Control vs Variant Allocation Split',
            'Primary North Star Metric',
            'Guardrail Metrics & Business Impact'
          ];

        // Data Engineering Subtypes
        case 'Batch ETL / ELT Pipeline':
        case 'Batch Pipeline':
          return [
            'Airflow DAG / Task Identifier',
            'Compute Engine (Spark/dbt/Trino)',
            'Execution Schedule (Cron / Sensor)',
            'Delivery SLA & Max Allowed Latency',
            'Worker Memory & CPU Sizing',
            'Upstream Data Pipeline Dependency',
            'On-Call PagerDuty Escalation'
          ];
        case 'CDC & Ingestion Feed':
        case 'CDC Ingestion':
          return [
            'Debezium / Kafka Connector Name',
            'Source Database Commit Log',
            'Target Lakehouse / Kafka Topic',
            'Delivery SLA & Max Latency (< 120s)',
            'Dead-Letter Queue (DLQ) S3 Path',
            'Idempotency & Deduplication Strategy',
            'Schema Evolution Policy'
          ];
        case 'Lakehouse Table Architecture':
        case 'Lakehouse Storage':
          return [
            'Table Format (Iceberg / Delta / Hudi)',
            'Partition Spec & Hidden Partitioning',
            'Compaction & Small File Rewrite Frequency',
            'Snapshot Retention & Purge SLA',
            'Sorting & Clustering Keys',
            'Branching & Time-Travel Retention'
          ];
        case 'Backfill & Disaster Recovery':
        case 'Backfill & Recovery':
          return [
            'Historical Partition Date Range',
            'Idempotent Partition Replacement Query',
            'Worker Concurrency & Throttling',
            'Post-Backfill Verification Query',
            'Disaster Recovery Rollback Runbook'
          ];

        // Data Modelling Subtypes
        case 'Dimensional Star Schema':
        case 'Dimensional Model':
          return [
            'Model Type (Star/Snowflake/Vault/3NF)',
            'Grain & Natural Business Keys',
            'Surrogate Key Strategy (Hash/UUID/Identity)',
            'Fact Table Type (Transactional/Snapshot)',
            'Slowly Changing Dimension (SCD Type 1/2/3/6)',
            'Conformed Dimension Hierarchy',
            'Degenerate Dimensions & Flags'
          ];
        case 'Data Vault 2.0 Architecture':
        case 'Data Vault':
          return [
            'Hub Business Keys & Hash Collision Code',
            'Link Transactional Relationships',
            'Satellite Context Tracking Strategy',
            'Hash Diff Algorithm (MD5/SHA256)',
            'Load Date & Record Source Standard',
            'Multi-Source Concurrency Keys'
          ];
        case 'Logical & Relational (3NF)':
        case 'Logical ERD':
          return [
            'Normalization Level (3NF / BCNF)',
            'Primary & Foreign Key Relationships',
            'Cardinality Constraints (1:1, 1:N, M:N)',
            'Nullability & Domain Value Enums',
            'Referential Integrity Cascades',
            'Physical Schema Storage Engine'
          ];
        case 'Semantic Layer & Bus Matrix':
        case 'Semantic Layer':
          return [
            'Enterprise Bus Matrix Subject Area',
            'Certified Metrics Hierarchy',
            'Conformed Hierarchies & Rollups',
            'Semantic Cache & Pre-Aggregation Strategy',
            'BI Semantic Model / PowerBI Dataset Link'
          ];

        default:
          const activeProfile = this.getActiveProfile();
          if (activeProfile && activeProfile.suggestedInputs && activeProfile.suggestedInputs.length > 0) {
            return activeProfile.suggestedInputs;
          }
          return [
            'Data Owner',
            'SLA Threshold',
            'Pipeline Dependency'
          ];
      }
    },

    showQuickPasteColumnsModal() {
      const modalContent = `
        <div style="margin-bottom: 14px;">
          <label class="form-label"><strong>Paste Column Names</strong> (separated by commas, pipes, spaces, tabs, or newlines)</label>
          <textarea id="txt-quick-paste-cols" class="form-control" rows="6" placeholder="e.g.&#10;customer_id, customer_name, email | phone_number&#9;signup_date   is_active&#10;&#10;Or paste full column lists directly from SQL DDL, Trino DESCRIBE, or Excel."></textarea>
          <div class="form-text">Parser automatically normalizes delimiters: commas (,), pipes (|), spaces ( ), tabs (\t), and newlines.</div>
        </div>

        <div class="grid-cols-2" style="margin-bottom: 14px;">
          <div>
            <label class="form-label">Default Data Type</label>
            <select id="sel-paste-col-type" class="form-control form-control-sm">
              <option value="VARCHAR(255)">VARCHAR(255)</option>
              <option value="BIGINT">BIGINT</option>
              <option value="INTEGER">INTEGER</option>
              <option value="TIMESTAMP">TIMESTAMP</option>
              <option value="DATE">DATE</option>
              <option value="NUMERIC(18,2)">NUMERIC(18,2)</option>
              <option value="BOOLEAN">BOOLEAN</option>
              <option value="DOUBLE">DOUBLE</option>
            </select>
          </div>
          <div>
            <label class="form-label">Import Mode</label>
            <div style="display: flex; gap: 14px; margin-top: 8px;">
              <label><input type="radio" name="paste-mode" value="append" checked> Append</label>
              <label><input type="radio" name="paste-mode" value="replace"> Replace Existing</label>
            </div>
          </div>
        </div>

        <div style="background: var(--surface-alt); padding: 10px 14px; border-radius: var(--border-radius-sm); border: 1px solid var(--surface-border); margin-bottom: 14px;">
          <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); margin-bottom: 4px;">LIVE COLUMN PREVIEW:</div>
          <div id="paste-cols-preview-box" style="font-size: 12px; color: var(--text-muted); min-height: 24px;">Type or paste text above to see parsed columns preview...</div>
        </div>
      `;

      this.openModal('📋 Quick Paste Column Structure', modalContent, [
        {
          label: 'Cancel',
          className: 'btn-outline',
          onClick: () => this.closeModal()
        },
        {
          label: '➕ Ingest Columns into Mapping',
          className: 'btn-primary',
          onClick: () => {
            const raw = document.getElementById('txt-quick-paste-cols')?.value || '';
            const cols = this.parseColumnDelimiters(raw);
            if (cols.length === 0) {
              this.showToast('Please paste at least one column name', 'warning');
              return;
            }
            const defaultType = document.getElementById('sel-paste-col-type')?.value || 'VARCHAR(255)';
            const mode = document.querySelector('input[name="paste-mode"]:checked')?.value || 'append';

            if (!this.currentDoc.dataSource) this.currentDoc.dataSource = {};
            if (!Array.isArray(this.currentDoc.dataSource.mappings) || mode === 'replace') {
              this.currentDoc.dataSource.mappings = [];
            }

            cols.forEach(col => {
              this.currentDoc.dataSource.mappings.push({
                sourceCol: col,
                targetCol: col,
                dataType: defaultType,
                rule: 'Direct 1:1 Mapping',
                nullable: 'YES',
                description: ''
              });
            });

            this.updateEditorMappingsTable();
            this.closeModal();
            this.showToast(`Successfully added ${cols.length} column(s) to mappings!`, 'success');
          }
        }
      ]);

      // Bind live preview
      const txt = document.getElementById('txt-quick-paste-cols');
      const prev = document.getElementById('paste-cols-preview-box');
      if (txt && prev) {
        txt.addEventListener('input', () => {
          const cols = this.parseColumnDelimiters(txt.value);
          if (cols.length === 0) {
            prev.innerHTML = '<span style="color: var(--text-muted);">No columns detected yet.</span>';
          } else {
            prev.innerHTML = `<strong>${cols.length} Columns Detected:</strong><br>` + 
              cols.map(c => `<span class="parsed-col-pill">${this.escapeHtml(c)}</span>`).join(' ');
          }
        });
      }
    },

    parseColumnDelimiters(rawText) {
      if (!rawText || typeof rawText !== 'string') return [];
      const chunks = rawText.split(/[,|\t\n\r]+/).map(s => s.trim()).filter(Boolean);
      const cols = [];
      chunks.forEach(chunk => {
        const words = chunk.split(/\s+/).map(w => w.trim()).filter(Boolean);
        words.forEach(w => {
          const clean = w.replace(/^["'`\[]+|["'`\],;]+$/g, '').trim();
          if (clean && !cols.includes(clean)) {
            cols.push(clean);
          }
        });
      });
      return cols;
    },

    renderScreenshotCardsHtml() {
      const doc = this.currentDoc;
      if (!doc.screenshots || doc.screenshots.length === 0) {
        return `<div style="text-align: center; color: var(--text-muted); padding: 24px; font-style: italic;">No screenshots added yet. Upload files or paste screenshots with Ctrl+V.</div>`;
      }

      const queries = doc.sqlQueries || [];

      return doc.screenshots.map((ss, idx) => `
        <div class="screenshot-card" data-id="${ss.id}" data-idx="${idx}" draggable="true">
          <div class="screenshot-drag-handle" title="Drag to reorder">☰</div>
          <div class="screenshot-thumb-box" onclick="DQD.viewScreenshotModal('${ss.id}')" title="Click to view full size">
            <img src="${ss.dataUrl}" alt="${this.escapeHtml(ss.caption || 'Screenshot')}" class="screenshot-thumb-img">
          </div>
          <div>
            <label class="form-label" style="font-size: 11px; margin-bottom: 2px;">Evidence Caption / Title</label>
            <input type="text" class="form-control form-control-sm ss-caption" value="${this.escapeHtml(ss.caption || '')}" placeholder="e.g. Trino Query 1 Terminal Output showing 0 failures">
            <div style="font-size: 10px; color: var(--text-muted); margin-top: 3px;">${this.escapeHtml(ss.name || 'image.png')}</div>
          </div>
          <div>
            <label class="form-label" style="font-size: 11px; margin-bottom: 2px;">Link to SQL Query</label>
            <select class="form-control form-control-sm ss-query-select">
              <option value="none" ${ss.relatedQueryId === 'none' ? 'selected' : ''}>General / None</option>
              <option value="all" ${ss.relatedQueryId === 'all' ? 'selected' : ''}>All Queries</option>
              ${queries.map((q, qIdx) => `
                <option value="${q.id || `Q-${qIdx+1}`}" ${ss.relatedQueryId === (q.id || `Q-${qIdx+1}`) ? 'selected' : ''}>${this.escapeHtml(q.title || `Query ${qIdx+1}`)}</option>
              `).join('')}
            </select>
          </div>
          <div>
            <label class="form-label" style="font-size: 11px; margin-bottom: 2px;">PDF Placement</label>
            <select class="form-control form-control-sm ss-placement-select">
              <option value="under_query" ${ss.placement === 'under_query' ? 'selected' : ''}>Under Query</option>
              <option value="executive_summary" ${ss.placement === 'executive_summary' ? 'selected' : ''}>In Exec Summary</option>
              <option value="data_sources" ${ss.placement === 'data_sources' ? 'selected' : ''}>Next to Mappings</option>
              <option value="executions" ${ss.placement === 'executions' ? 'selected' : ''}>Under Executions</option>
              <option value="appendix" ${ss.placement === 'appendix' ? 'selected' : ''}>Appendix at End</option>
            </select>
          </div>
          <div style="display: flex; flex-direction: column; gap: 4px; align-items: flex-end;">
            <div style="display: flex; gap: 2px;">
              <button type="button" class="btn btn-outline btn-sm btn-ss-move-up" data-idx="${idx}" title="Move up" style="padding: 2px 6px;">▲</button>
              <button type="button" class="btn btn-outline btn-sm btn-ss-move-down" data-idx="${idx}" title="Move down" style="padding: 2px 6px;">▼</button>
            </div>
            <button type="button" class="btn btn-outline btn-sm btn-delete-ss" data-idx="${idx}" style="color: #ef4444; padding: 2px 6px;" title="Delete screenshot">🗑️</button>
          </div>
        </div>
      `).join('');
    },

    bindScreenshotEvents() {
      const dropzone = document.getElementById('ss-dropzone');
      const fileInput = document.getElementById('ss-file-input');
      const btnBrowse = document.getElementById('btn-browse-ss');
      const container = document.getElementById('container-screenshot-cards');

      if (btnBrowse && fileInput) {
        btnBrowse.onclick = () => fileInput.click();
      }

      if (dropzone && fileInput) {
        dropzone.ondragover = (e) => {
          e.preventDefault();
          dropzone.classList.add('drag-active');
        };
        dropzone.ondragleave = () => {
          dropzone.classList.remove('drag-active');
        };
        dropzone.ondrop = (e) => {
          e.preventDefault();
          dropzone.classList.remove('drag-active');
          if (e.dataTransfer && e.dataTransfer.files) {
            Array.from(e.dataTransfer.files).forEach(f => this.handleScreenshotFile(f));
          }
        };
        fileInput.onchange = (e) => {
          if (e.target.files) {
            Array.from(e.target.files).forEach(f => this.handleScreenshotFile(f));
            fileInput.value = '';
          }
        };
      }

      if (container) {
        container.querySelectorAll('.btn-ss-move-up').forEach(b => {
          b.onclick = (e) => {
            const idx = parseInt(e.currentTarget.dataset.idx, 10);
            if (idx > 0 && this.currentDoc?.screenshots) {
              const temp = this.currentDoc.screenshots[idx];
              this.currentDoc.screenshots[idx] = this.currentDoc.screenshots[idx - 1];
              this.currentDoc.screenshots[idx - 1] = temp;
              this.updateScreenshotCardsView();
            }
          };
        });
        container.querySelectorAll('.btn-ss-move-down').forEach(b => {
          b.onclick = (e) => {
            const idx = parseInt(e.currentTarget.dataset.idx, 10);
            if (this.currentDoc?.screenshots && idx < this.currentDoc.screenshots.length - 1) {
              const temp = this.currentDoc.screenshots[idx];
              this.currentDoc.screenshots[idx] = this.currentDoc.screenshots[idx + 1];
              this.currentDoc.screenshots[idx + 1] = temp;
              this.updateScreenshotCardsView();
            }
          };
        });
        container.querySelectorAll('.btn-delete-ss').forEach(b => {
          b.onclick = (e) => {
            const idx = parseInt(e.currentTarget.dataset.idx, 10);
            if (this.currentDoc?.screenshots) {
              this.currentDoc.screenshots.splice(idx, 1);
              this.updateScreenshotCardsView();
              this.showToast('Screenshot removed', 'info');
            }
          };
        });

        // HTML5 Drag and Drop reordering
        let draggedIdx = null;
        container.querySelectorAll('.screenshot-card').forEach(card => {
          card.ondragstart = (e) => {
            draggedIdx = parseInt(card.dataset.idx, 10);
            card.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
          };
          card.ondragend = () => {
            card.classList.remove('dragging');
          };
          card.ondragover = (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
          };
          card.ondrop = (e) => {
            e.preventDefault();
            const targetIdx = parseInt(card.dataset.idx, 10);
            if (draggedIdx !== null && targetIdx !== null && draggedIdx !== targetIdx && this.currentDoc?.screenshots) {
              const movedItem = this.currentDoc.screenshots.splice(draggedIdx, 1)[0];
              this.currentDoc.screenshots.splice(targetIdx, 0, movedItem);
              this.updateScreenshotCardsView();
            }
          };
        });
      }
    },

    updateScreenshotCardsView() {
      const container = document.getElementById('container-screenshot-cards');
      if (container) {
        container.innerHTML = this.renderScreenshotCardsHtml();
        this.bindScreenshotEvents();
      }
      const badge = document.getElementById('badge-tab-ss-count');
      if (badge && this.currentDoc?.screenshots) {
        badge.textContent = `${this.currentDoc.screenshots.length}`;
      }
      const badgeHeader = document.getElementById('badge-tab-ss-count-header');
      if (badgeHeader && this.currentDoc?.screenshots) {
        badgeHeader.textContent = `${this.currentDoc.screenshots.length} Screenshot(s)`;
      }
    },

    handleScreenshotFile(file, fallbackName = null) {
      if (!file || !file.type.startsWith('image/')) {
        this.showToast('Only image files (PNG, JPG, WebP) can be added as screenshots', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        if (!this.currentDoc) return;
        if (!Array.isArray(this.currentDoc.screenshots)) this.currentDoc.screenshots = [];
        const ssId = 'SS-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
        this.currentDoc.screenshots.push({
          id: ssId,
          dataUrl: e.target.result,
          name: file.name || fallbackName || `screenshot_${Date.now()}.png`,
          caption: file.name ? file.name.replace(/\.[^/.]+$/, "") : "Query Assertion Evidence",
          relatedQueryId: (this.currentDoc.sqlQueries && this.currentDoc.sqlQueries[0]?.id) || 'none',
          placement: 'under_query',
          order: this.currentDoc.screenshots.length
        });
        this.updateScreenshotCardsView();
        // Update Tab 5 header button label
        const tabBtnSs = document.querySelector('.tab-btn[data-tab="tab-screenshots"]');
        if (tabBtnSs) {
          tabBtnSs.textContent = `5. Screenshots & Evidence (${this.currentDoc.screenshots.length})`;
        }
        this.showToast(`📸 Screenshot attached! Total: ${this.currentDoc.screenshots.length}`, 'success');
      };
      reader.readAsDataURL(file);
    },

    viewScreenshotModal(ssId) {
      const ss = (this.currentDoc?.screenshots || []).find(s => s.id === ssId);
      if (!ss) return;
      this.openModal(ss.caption || 'Screenshot Preview', `
        <div style="text-align: center;">
          <img src="${ss.dataUrl}" style="max-width: 100%; max-height: 70vh; border-radius: 6px; box-shadow: var(--shadow-md);">
          <div style="margin-top: 10px; font-size: 13px; color: var(--text-muted);">${this.escapeHtml(ss.caption || '')}</div>
        </div>
      `, [
        { label: 'Close', className: 'btn-outline', onClick: () => this.closeModal() }
      ]);
    },

    // ====================================================================
    // SLACK / TEAMS / EMAIL MARKDOWN EXPORTER
    // ====================================================================

    showShareMarkdownModal(doc) {
      if (!doc) doc = this.currentDoc;
      if (!doc) return;

      const usernames = (doc.usernames && doc.usernames.length > 0) ? doc.usernames : (doc.owner ? [doc.owner] : ['Unassigned']);
      const queries = doc.sqlQueries || [];
      const valType = doc.validationType || doc.documentType || 'Model Validation';
      const statusEmoji = doc.status === 'Approved' ? '✅' : (doc.status === 'In Review' ? '⏳' : '📝');
      const slackStatus = doc.status === 'Approved' ? ':white_check_mark: *Approved*' : (doc.status === 'In Review' ? ':hourglass_flowing_sand: *In Review*' : ':pencil2: *Draft*');

      // 1. Slack Markdown
      const slackMd = `:page_facing_up: *[DQ Validation] ${doc.title || 'Untitled'}* (${doc.id || 'N/A'})\n` +
        `*Validation Type:* \`${valType}\` | *Status:* ${slackStatus} | *Version:* \`v${doc.version || '1.0'}\`\n` +
        `*Team:* *${doc.team || 'General'}* | *Owners:* ${usernames.map(u => `@${u}`).join(', ')}\n` +
        `*Domain:* ${doc.businessDomain || 'Data Platform'}\n\n` +
        `> *Executive Summary:*\n> ${(doc.executiveSummary || 'No executive summary provided.').replace(/\n/g, '\n> ')}\n\n` +
        `:bar_chart: *Assertion Criteria & Results:*\n` +
        `• *Expected Result:* \`${doc.expectedResult || '0 defect records'}\`\n` +
        `• *Acceptable Threshold:* \`${doc.threshold || '0'}\`\n` +
        `• *Actual Result:* \`${doc.actualResult || 'Verified PASSED'}\`\n` +
        `• *Visual Evidence:* ${doc.screenshots?.length || 0} screenshot(s) attached\n\n` +
        `:mag: *SQL Assertions (${queries.length} Queries):*\n` +
        queries.map((q, i) => `*#${i+1} ${q.title || 'Query'} (${q.dialect || 'Trino'}):*\n\`\`\`sql\n${(q.query || '').trim()}\n\`\`\``).join('\n') + '\n\n' +
        `:shield: *Remediation Protocol:*\n${doc.remediation || 'Standard runbook execution applies.'}`;

      // 2. Microsoft Teams Markdown
      const teamsMd = `### 📑 Data Quality Validation Report: ${doc.title || 'Untitled'}\n\n` +
        `| Attribute | Details |\n` +
        `| :--- | :--- |\n` +
        `| **Document ID** | \`${doc.id || 'N/A'}\` |\n` +
        `| **Validation Type** | **${valType}** |\n` +
        `| **Approval Status** | ${statusEmoji} **${doc.status || 'Draft'}** |\n` +
        `| **Team / Tribe** | **${doc.team || 'General'}** |\n` +
        `| **Assigned Owners** | ${usernames.join(', ')} |\n` +
        `| **Domain** | ${doc.businessDomain || 'Enterprise Lakehouse'} |\n` +
        `| **Specification Version** | \`v${doc.version || '1.0'}\` |\n\n` +
        `#### 🎯 Executive Summary\n` +
        `${doc.executiveSummary || 'Data quality validation specification.'}\n\n` +
        `#### 📊 Assertion Criteria & Thresholds\n` +
        `- **Expected Result:** \`${doc.expectedResult || '0 defect records'}\`\n` +
        `- **Acceptable Threshold:** \`${doc.threshold || '0'}\`\n` +
        `- **Actual Result:** \`${doc.actualResult || 'Verified'}\`\n` +
        `- **Evidence Screenshots:** ${doc.screenshots?.length || 0} image(s) embedded in portable .dqdoc & PDF\n\n` +
        `#### 💾 Verification SQL Queries\n` +
        queries.map((q, i) => `##### ${i+1}. ${q.title || 'Query'} (${q.dialect || 'Trino'})\n\`\`\`sql\n${(q.query || '').trim()}\n\`\`\``).join('\n\n') + '\n\n' +
        `#### 🛠️ Remediation Protocol\n` +
        `${doc.remediation || 'Refer to enterprise data operations runbook.'}`;

      // 3. Email / Plain Text
      const emailText = `DATA QUALITY VALIDATION SPECIFICATION\n` +
        `========================================\n` +
        `Document: ${doc.title || 'Untitled'} (${doc.id || 'N/A'})\n` +
        `Validation Type: ${valType}\n` +
        `Status: ${doc.status || 'Draft'} (Version: v${doc.version || '1.0'})\n` +
        `Team: ${doc.team || 'General'}\n` +
        `Owners: ${usernames.join(', ')}\n` +
        `Domain: ${doc.businessDomain || 'Data Platform'}\n` +
        `Date: ${new Date().toLocaleDateString()}\n\n` +
        `EXECUTIVE SUMMARY:\n` +
        `${doc.executiveSummary || 'N/A'}\n\n` +
        `EXPECTED RESULTS & THRESHOLDS:\n` +
        `- Expected Result: ${doc.expectedResult || '0 defect rows'}\n` +
        `- Defect Threshold: ${doc.threshold || '0'}\n` +
        `- Actual Result: ${doc.actualResult || 'PASSED'}\n` +
        `- Attached Screenshots: ${doc.screenshots?.length || 0}\n\n` +
        `SQL QUERIES (${queries.length}):\n` +
        queries.map((q, i) => `[Query ${i+1}] ${q.title} (${q.dialect || 'Trino'})\n${q.query}\n`).join('\n') + '\n\n' +
        `REMEDIATION PROTOCOL:\n` +
        `${doc.remediation || 'N/A'}\n`;

      const modalHtml = `
        <div>
          <!-- Subtabs for formats -->
          <div style="display: flex; gap: 8px; border-bottom: 2px solid var(--surface-border); margin-bottom: 16px; padding-bottom: 8px;">
            <button class="btn btn-primary btn-sm btn-subtab-format active" data-fmt="slack">💬 Slack Markdown</button>
            <button class="btn btn-outline btn-sm btn-subtab-format" data-fmt="teams">👥 Microsoft Teams</button>
            <button class="btn btn-outline btn-sm btn-subtab-format" data-fmt="email">✉️ Email / Plain Text</button>
          </div>

          <!-- Format 1: Slack -->
          <div id="box-share-slack" class="share-fmt-box">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span style="font-size: 12px; font-weight: 600; color: var(--text-muted);">Formatted with Slack mrkdwn bolding, blockquotes, code fences, and emojis:</span>
              <button class="btn btn-primary btn-sm" id="btn-copy-slack">📋 Copy Slack Markdown</button>
            </div>
            <pre class="markdown-preview-box" id="pre-share-slack">${this.escapeHtml(slackMd)}</pre>
          </div>

          <!-- Format 2: Teams -->
          <div id="box-share-teams" class="share-fmt-box" style="display: none;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span style="font-size: 12px; font-weight: 600; color: var(--text-muted);">Formatted with Microsoft Teams tables, headers, and bullet structures:</span>
              <button class="btn btn-primary btn-sm" id="btn-copy-teams">📋 Copy Teams Markdown</button>
            </div>
            <pre class="markdown-preview-box" id="pre-share-teams">${this.escapeHtml(teamsMd)}</pre>
          </div>

          <!-- Format 3: Email -->
          <div id="box-share-email" class="share-fmt-box" style="display: none;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span style="font-size: 12px; font-weight: 600; color: var(--text-muted);">Clean ASCII text layout ready for email bodies:</span>
              <button class="btn btn-primary btn-sm" id="btn-copy-email">📋 Copy Email Text</button>
            </div>
            <pre class="markdown-preview-box" id="pre-share-email">${this.escapeHtml(emailText)}</pre>
          </div>
        </div>
      `;

      this.openModal('💬 Share & Export Formatted Report', modalHtml, [
        { label: 'Close', className: 'btn-outline', onClick: () => this.closeModal() }
      ]);

      // Wire Tab toggling
      const modalEl = document.getElementById('modal-body-content');
      if (modalEl) {
        modalEl.querySelectorAll('.btn-subtab-format').forEach(btn => {
          btn.onclick = () => {
            modalEl.querySelectorAll('.btn-subtab-format').forEach(b => {
              b.classList.remove('btn-primary', 'active');
              b.classList.add('btn-outline');
            });
            btn.classList.remove('btn-outline');
            btn.classList.add('btn-primary', 'active');

            const fmt = btn.dataset.fmt;
            modalEl.querySelectorAll('.share-fmt-box').forEach(b => b.style.display = 'none');
            const target = modalEl.querySelector('#box-share-' + fmt);
            if (target) target.style.display = 'block';
          };
        });

        // Copy buttons
        modalEl.querySelector('#btn-copy-slack').onclick = () => {
          navigator.clipboard.writeText(slackMd).then(() => this.showToast('Slack Markdown copied to clipboard!', 'success'));
        };
        modalEl.querySelector('#btn-copy-teams').onclick = () => {
          navigator.clipboard.writeText(teamsMd).then(() => this.showToast('Microsoft Teams Markdown copied to clipboard!', 'success'));
        };
        modalEl.querySelector('#btn-copy-email').onclick = () => {
          navigator.clipboard.writeText(emailText).then(() => this.showToast('Email text copied to clipboard!', 'success'));
        };
      }
    },

    // ====================================================================
    // BATCH EXPORT & IMPORT PROJECT PACKAGER
    // ====================================================================

    exportBatchWorkspacePack() {
      const allUsersMap = this.getAllUserStatistics();
      const allTeams = this.getAllTeams();

      const pack = {
        format: "DQD_WORKSPACE_PACKAGE",
        version: "2.3",
        exportedAt: new Date().toISOString(),
        metadata: {
          totalDocuments: this.documents.length,
          totalRules: this.rules.length,
          totalTemplates: this.templates.length,
          totalExecutions: this.executions.length,
          totalIssues: this.issues.length,
          teams: allTeams,
          usernames: Object.keys(allUsersMap)
        },
        documents: this.documents, // contains all complete docs + embedded base64 screenshots
        rules: this.rules,
        templates: this.templates,
        executions: this.executions,
        issues: this.issues
      };

      const filename = `DQD-WORKSPACE-PACK-${new Date().toISOString().slice(0, 10)}.dqpack`;
      const blob = new Blob([JSON.stringify(pack, null, 2)], { type: 'application/json' });
      this.downloadBlob(blob, filename);
      this.showToast(`Exported workspace pack: ${this.documents.length} docs, ${this.rules.length} rules, ${this.templates.length} templates`, 'success');
    },

    handleBatchPackImportFile(file) {
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const pack = JSON.parse(e.target.result);
          if (!pack || !pack.documents || !Array.isArray(pack.documents)) {
            throw new Error('Invalid workspace package format. Must contain a documents array.');
          }

          const docCount = pack.documents.length;
          const ruleCount = pack.rules?.length || 0;
          const issueCount = pack.issues?.length || 0;

          const modalHtml = `
            <div>
              <div style="font-size: 14px; margin-bottom: 12px;">
                Found valid <strong>DQD Workspace Package (v${pack.version || '2.0'})</strong> containing:
              </div>
              <div class="grid-cols-3" style="margin-bottom: 16px;">
                <div style="background: var(--surface-alt); padding: 12px; border-radius: 6px; text-align: center;">
                  <div style="font-size: 20px; font-weight: 700; color: var(--primary-color);">${docCount}</div>
                  <div style="font-size: 11px; color: var(--text-muted);">Documents (with Screenshots)</div>
                </div>
                <div style="background: var(--surface-alt); padding: 12px; border-radius: 6px; text-align: center;">
                  <div style="font-size: 20px; font-weight: 700; color: var(--status-passed);">${ruleCount}</div>
                  <div style="font-size: 11px; color: var(--text-muted);">Validation Rules</div>
                </div>
                <div style="background: var(--surface-alt); padding: 12px; border-radius: 6px; text-align: center;">
                  <div style="font-size: 20px; font-weight: 700; color: var(--secondary-color);">${issueCount}</div>
                  <div style="font-size: 11px; color: var(--text-muted);">Issues & CAPA</div>
                </div>
              </div>
              <div style="font-size: 13px; font-weight: 600; margin-bottom: 8px;">Select Import Mode:</div>
              <div style="display: flex; flex-direction: column; gap: 8px;">
                <label style="display: flex; align-items: flex-start; gap: 10px; cursor: pointer;">
                  <input type="radio" name="pack-import-mode" value="merge" checked style="margin-top: 3px;">
                  <div>
                    <strong>Merge with Current Workspace (Recommended)</strong>
                    <div style="font-size: 11px; color: var(--text-muted);">Adds new documents and updates matching IDs without deleting existing items.</div>
                  </div>
                </label>
                <label style="display: flex; align-items: flex-start; gap: 10px; cursor: pointer;">
                  <input type="radio" name="pack-import-mode" value="replace" style="margin-top: 3px;">
                  <div>
                    <strong>Replace Workspace Entirely</strong>
                    <div style="font-size: 11px; color: var(--text-muted); color: #ef4444;">Deletes all current documents and rules, replacing them with the package data.</div>
                  </div>
                </label>
              </div>
            </div>
          `;

          this.openModal('📦 Import Workspace Batch Package', modalHtml, [
            {
              label: 'Proceed with Import',
              className: 'btn-primary',
              onClick: async () => {
                const mode = document.querySelector('input[name="pack-import-mode"]:checked')?.value || 'merge';
                this.closeModal();

                if (mode === 'replace') {
                  await this.dbClear('documents');
                  await this.dbClear('rules');
                  this.documents = [];
                  this.rules = [];
                }

                // Import documents
                for (const doc of pack.documents) {
                  await this.dbPut('documents', doc);
                  this.learnUniqueValuesFromDoc(doc);
                  const existingIdx = this.documents.findIndex(d => d.id === doc.id);
                  if (existingIdx >= 0) {
                    this.documents[existingIdx] = doc;
                  } else {
                    this.documents.push(doc);
                  }
                }

                // Import rules
                if (Array.isArray(pack.rules)) {
                  for (const rule of pack.rules) {
                    await this.dbPut('rules', rule);
                    const rIdx = this.rules.findIndex(r => r.id === rule.id);
                    if (rIdx >= 0) this.rules[rIdx] = rule;
                    else this.rules.push(rule);
                  }
                }

                this.renderDatalists();
                this.updateSidebarBadges();
                this.updateDocumentsTable();
                this.showToast(`Successfully imported batch package (${docCount} documents)!`, 'success');
              }
            },
            { label: 'Cancel', className: 'btn-outline', onClick: () => this.closeModal() }
          ]);
        } catch (err) {
          console.error('Batch import error:', err);
          this.showToast('Failed to import package: ' + err.message, 'error');
        }
      };
      reader.readAsText(file);
    },

    // ====================================================================
    // TRINO SQL BEAUTIFIER & SYNTAX HIGHLIGHTING
    // ====================================================================

    beautifyTrinoSql(sql) {
      if (!sql) return '';
      const keywords = [
        'SELECT', 'DISTINCT', 'FROM', 'WHERE', 'GROUP BY', 'HAVING', 'ORDER BY', 
        'LIMIT', 'JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN', 'FULL OUTER JOIN',
        'CROSS JOIN', 'ON', 'WITH', 'AS', 'UNION ALL', 'UNION', 'INTERSECT', 'EXCEPT',
        'INSERT INTO', 'CREATE TABLE', 'DROP TABLE', 'ALTER TABLE', 'VALUES',
        'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'AND', 'OR', 'NOT', 'IN', 'EXISTS',
        'BETWEEN', 'LIKE', 'ILIKE', 'IS NULL', 'IS NOT NULL', 'OVER', 'PARTITION BY',
        'ROWS BETWEEN', 'UNBOUNDED PRECEDING', 'CURRENT ROW', 'COALESCE', 'NULLIF',
        'TRY_CAST', 'CAST', 'DATE_TRUNC', 'DATE_DIFF', 'CURRENT_DATE', 'CURRENT_TIMESTAMP'
      ];

      let formatted = sql.trim();
      keywords.sort((a, b) => b.length - a.length).forEach(kw => {
        const regex = new RegExp('\\b' + kw.replace(/ /g, '\\s+') + '\\b', 'gi');
        formatted = formatted.replace(regex, kw);
      });
      return formatted;
    },

    highlightTrinoSql(sql) {
      if (!sql) return '<span style="color: #64748B;">-- Empty query</span>';
      let html = this.escapeHtml(sql);

      // Comments
      html = html.replace(/(--.*$)/gm, '<span class="sql-comment">$1</span>');

      // Strings
      html = html.replace(/('(?:''|[^'\\]|\\.)*')/g, '<span class="sql-str">$1</span>');

      // Numbers
      html = html.replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="sql-num">$1</span>');

      // Functions
      const funcs = ['COUNT', 'COUNT_IF', 'SUM', 'AVG', 'MIN', 'MAX', 'COALESCE', 'NULLIF', 'TRY_CAST', 'CAST', 'DATE_TRUNC', 'DATE_DIFF', 'APPROX_PERCENTILE', 'APPROX_DISTINCT', 'ARRAY_AGG', 'CARDINALITY', 'ELEMENT_AT', 'SPLIT', 'CONCAT', 'LOWER', 'UPPER', 'TRIM', 'ROUND', 'ABS'];
      funcs.forEach(fn => {
        const reg = new RegExp('\\b(' + fn + ')(?=\\s*\\()', 'gi');
        html = html.replace(reg, '<span class="sql-func">$1</span>');
      });

      // Keywords
      const kws = ['SELECT', 'DISTINCT', 'FROM', 'WHERE', 'GROUP BY', 'HAVING', 'ORDER BY', 'LIMIT', 'JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN', 'FULL OUTER JOIN', 'CROSS JOIN', 'ON', 'WITH', 'AS', 'UNION ALL', 'UNION', 'INTERSECT', 'EXCEPT', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'AND', 'OR', 'NOT', 'IN', 'EXISTS', 'BETWEEN', 'LIKE', 'ILIKE', 'IS NULL', 'IS NOT NULL', 'OVER', 'PARTITION BY', 'TRUE', 'FALSE', 'NULL'];
      kws.sort((a,b) => b.length - a.length).forEach(kw => {
        const reg = new RegExp('\\b(' + kw.replace(/ /g, '\\s+') + ')\\b', 'gi');
        html = html.replace(reg, '<span class="sql-kw">$1</span>');
      });

      return html;
    },

    generateDocumentDualFiles(doc) {
      if (!doc) doc = this.currentDoc;
      if (!doc) return;
      this.syncDocFromForm();

      // 1. Generate & Download PDF
      this.generatePdfReport(doc);

      // 2. Generate & Download portable .dqdoc interchange file
      this.exportDocumentDataFile(doc);

      this.showToast(`Generated 2 files: PDF Report & Portable .dqdoc file (with all screenshots)`, 'success');
    },

    exportDocumentDataFile(doc) {
      if (!doc) doc = this.currentDoc;
      if (!doc) return;
      this.syncDocFromForm();
      const cleanDoc = JSON.parse(JSON.stringify(doc));
      cleanDoc.teamProfile = cleanDoc.teamProfile || this.getActiveProfileKey() || 'data_quality';
      cleanDoc.teamAttributes = cleanDoc.teamAttributes || {};
      // Ensure author userInfo is attached (from doc or workspace fallback)
      const uInfo = this.getUserInfo(cleanDoc);
      cleanDoc.userInfo = uInfo;
      cleanDoc.username = uInfo.username;
      cleanDoc.useremail = uInfo.useremail;
      cleanDoc.userphone = uInfo.userphone;

      const payload = {
        _format: "DQD_DOCUMENT_INTERCHANGE",
        _version: "2.0",
        exportedAt: new Date().toISOString(),
        document: cleanDoc
      };
      const jsonStr = JSON.stringify(payload, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const filename = `DQD-${cleanDoc.id || 'doc'}-${new Date().toISOString().slice(0, 10)}.dqdoc`;
      this.downloadBlob(blob, filename);
    },

    importDocumentDataFile(file) {
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const raw = e.target.result;
          let parsed;
          try {
            parsed = JSON.parse(raw);
          } catch (jsonErr) {
            throw new Error('File is not valid JSON. Please verify the file contents.');
          }

          if (!parsed || typeof parsed !== 'object') {
            throw new Error('Invalid format: File content must be a JSON object or array.');
          }

          // Handle array of documents, workspace package, or single document
          let rawDocs = [];
          if (Array.isArray(parsed)) {
            rawDocs = parsed;
          } else if (Array.isArray(parsed.documents)) {
            rawDocs = parsed.documents;
          } else if (parsed.document && typeof parsed.document === 'object') {
            rawDocs = [parsed.document];
          } else if (parsed.doc && typeof parsed.doc === 'object') {
            rawDocs = [parsed.doc];
          } else if (parsed.data && typeof parsed.data === 'object' && !Array.isArray(parsed.data)) {
            rawDocs = [parsed.data];
          } else {
            rawDocs = [parsed];
          }

          if (rawDocs.length === 0) {
            throw new Error('No document records found in imported file.');
          }

          const importedDocs = [];

          for (let i = 0; i < rawDocs.length; i++) {
            const item = rawDocs[i];
            if (!item || typeof item !== 'object') continue;

            const doc = JSON.parse(JSON.stringify(item));

            // Normalize Title (support title, name, documentTitle, doc_title, label, or filename)
            doc.title = (doc.title || doc.name || doc.documentTitle || doc.doc_title || doc.document_title || doc.label || doc.validationType || file.name.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ') || `Imported Document ${i + 1}`).trim();

            // Normalize ID (support id, doc_id, document_id, or auto-generate)
            if (!doc.id || !String(doc.id).trim()) {
              doc.id = 'DOC-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + Math.floor(1000 + Math.random() * 9000);
            } else {
              doc.id = String(doc.id).trim();
            }

            // Normalization & Defaults
            if (!doc.version) doc.version = '1.0';
            if (!doc.status) doc.status = 'Draft';
            if (!doc.teamProfile) doc.teamProfile = this.getActiveProfileKey() || 'data_quality';
            if (!doc.teamAttributes || typeof doc.teamAttributes !== 'object') doc.teamAttributes = {};
            if (!doc.validationType) doc.validationType = doc.documentType || 'Model Validation';
            if (!doc.team) doc.team = '';
            if (!doc.businessDomain) doc.businessDomain = doc.domain || '';
            if (!doc.executiveSummary) doc.executiveSummary = doc.description || '';
            if (!doc.businessObjective) doc.businessObjective = '';

            // User attribution
            if (!Array.isArray(doc.usernames)) doc.usernames = doc.owner ? [doc.owner] : [];
            if (!doc.owner && doc.usernames.length > 0) doc.owner = doc.usernames[0];

            // Author contact information (username, useremail, userphone)
            if (doc.userInfo && typeof doc.userInfo === 'object') {
              doc.userInfo = {
                username: doc.userInfo.username || doc.username || null,
                useremail: doc.userInfo.useremail || doc.useremail || null,
                userphone: doc.userInfo.userphone || doc.userphone || null
              };
            } else if (doc.username || doc.useremail || doc.userphone) {
              doc.userInfo = {
                username: doc.username || null,
                useremail: doc.useremail || null,
                userphone: doc.userphone || null
              };
            }

            // Sub-collections
            if (!Array.isArray(doc.dynamicInputs)) doc.dynamicInputs = [];
            if (!Array.isArray(doc.validatedModels)) doc.validatedModels = [];
            if (!Array.isArray(doc.validatedTables)) doc.validatedTables = [];
            if (!Array.isArray(doc.screenshots)) doc.screenshots = [];
            if (!Array.isArray(doc.rules)) doc.rules = [];
            if (!Array.isArray(doc.executions)) doc.executions = [];
            if (!Array.isArray(doc.issues)) doc.issues = [];
            if (!Array.isArray(doc.approvals)) doc.approvals = [];
            if (!Array.isArray(doc.versionHistory)) {
              doc.versionHistory = [
                { version: doc.version, createdAt: new Date().toISOString(), author: doc.owner || '', summary: 'Imported Document' }
              ];
            } else {
              // Sanitize legacy 'Author' in versionHistory
              doc.versionHistory.forEach(v => {
                if (v && v.author && String(v.author).trim().toLowerCase() === 'author') {
                  v.author = doc.owner || (doc.usernames && doc.usernames[0]) || '';
                }
              });
            }

            // SQL Queries
            if (!Array.isArray(doc.sqlQueries) || doc.sqlQueries.length === 0) {
              if (doc.sqlQuery && String(doc.sqlQuery).trim()) {
                doc.sqlQueries = [{
                  id: 'Q-1',
                  title: doc.sqlQueryTitle || 'Primary Validation Query',
                  dialect: doc.sqlDialect || 'Trino',
                  query: doc.sqlQuery,
                  notes: doc.sqlNotes || ''
                }];
              } else {
                doc.sqlQueries = [{
                  id: 'Q-1',
                  title: 'Primary Validation Query',
                  dialect: doc.sqlDialect || 'Trino',
                  query: '',
                  notes: ''
                }];
              }
            }

            // Timestamps
            doc.createdAt = doc.createdAt || new Date().toISOString();
            doc.updatedAt = new Date().toISOString();

            // Save to IndexedDB
            await this.dbPut('documents', doc);

            // Sync issues if present
            if (Array.isArray(doc.issues) && doc.issues.length > 0) {
              for (const iss of doc.issues) {
                if (iss && iss.id) {
                  await this.dbPut('issues', iss);
                  if (!this.issues.some(i => i.id === iss.id)) {
                    this.issues.unshift(iss);
                  }
                }
              }
            }

            // Update in-memory documents list
            const existingIdx = this.documents.findIndex(d => d.id === doc.id);
            if (existingIdx >= 0) {
              this.documents[existingIdx] = doc;
            } else {
              this.documents.unshift(doc);
            }

            importedDocs.push(doc);
          }

          this.updateSidebarBadges();

          // Reset the file input so selecting the same file again triggers change event
          const fileInput = document.getElementById('input-quick-import-file');
          if (fileInput) fileInput.value = '';

          if (importedDocs.length === 1) {
            const singleDoc = importedDocs[0];
            this.currentDoc = JSON.parse(JSON.stringify(singleDoc));
            this.currentDoc._originalId = singleDoc.id;
            this.currentEditorTab = 'tab-meta';
            this.navigateTo('editor');
            this.showToast(`Document "${singleDoc.title}" (${singleDoc.id}) imported successfully`, 'success');
          } else {
            this.showToast(`Successfully imported ${importedDocs.length} documents`, 'success');
          }
        } catch (err) {
          this.showToast('Import failed: ' + (err.message || 'Invalid file format'), 'error');
        }
      };
      reader.readAsText(file);
    },

    // ====================================================================
    // 21. PDF EXPORT (EXECUTIVE & TECHNICAL ENTERPRISE LAYOUT)
    // ====================================================================

    generatePdfReport(doc) {
      if (!window.jspdf || !window.jspdf.jsPDF) {
        alert('jsPDF library is not loaded');
        return;
      }

      const { jsPDF } = window.jspdf;
      const pdfSettings = this.config.pdf || {};
      const docProfileKey = (doc && doc.teamProfile) || this.getActiveProfileKey() || 'data_quality';
      const profile = (this.config && this.config.teamProfiles && this.config.teamProfiles[docProfileKey]) || this.getActiveProfile();
      const profileAttrs = this.getProfileAttributes(docProfileKey);
      const teamAttrs = (doc && doc.teamAttributes) || {};
      const branding = Object.assign({}, (profile && profile.branding) || {}, this.config.branding || {});

      const orientation = pdfSettings.orientation === 'landscape' ? 'landscape' : 'portrait';
      const pdf = new jsPDF({
        orientation,
        unit: 'pt',
        format: pdfSettings.paperSize || 'a4'
      });

      // Enable document title display in viewers
      if (typeof pdf.viewerPreferences === 'function') {
        try {
          pdf.viewerPreferences({ DisplayDocTitle: true });
        } catch (vpErr) {
          console.warn('Viewer preferences setup skipped:', vpErr);
        }
      }

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 40;
      const contentWidth = pageWidth - (margin * 2);

      let y = margin;

      // Color utilities & palettes
      const hexToRgb = (hex, fallback = [31, 78, 121]) => {
        if (!hex || typeof hex !== 'string') return fallback;
        hex = hex.replace('#', '');
        if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
        if (hex.length !== 6) return fallback;
        const num = parseInt(hex, 16);
        return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
      };

      const primaryRgb = hexToRgb(branding.primaryColor, [31, 78, 121]);
      const secondaryRgb = hexToRgb(branding.secondaryColor, [68, 114, 196]);
      const accentRgb = hexToRgb(branding.accentColor, [0, 166, 166]);
      const darkSlate = [15, 23, 42];
      const bodySlate = [51, 65, 85];
      const mutedSlate = [100, 116, 139];
      const borderSlate = [226, 232, 240];
      const cardBgSlate = [248, 250, 252];

      // Outline / Bookmark registration helper
      const hasOutline = Boolean(pdf.outline && typeof pdf.outline.add === 'function');
      const addBookmark = (title) => {
        if (hasOutline) {
          try {
            pdf.outline.add(null, title, { pageNumber: pdf.internal.getNumberOfPages() });
          } catch (e) {
            console.warn('PDF outline bookmark registration skipped:', e);
          }
        }
      };

      // Helper: Modern Section Header with Vertical Accent Bar & Divider
      const renderSectionHeader = (number, title, subtitle = '') => {
        if (y > pageHeight - 120) {
          pdf.addPage();
          y = margin + 25;
        }
        addBookmark(`${number}. ${title}`);

        // Colored vertical indicator bar
        pdf.setFillColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
        pdf.rect(margin, y - 8, 3.5, 14, 'F');

        // Main Title
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(11);
        pdf.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
        pdf.text(`${number}. ${title.toUpperCase()}`, margin + 9, y + 2.5);

        // Subtitle on right side
        if (subtitle) {
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(7.5);
          pdf.setTextColor(mutedSlate[0], mutedSlate[1], mutedSlate[2]);
          const subW = pdf.getTextWidth(subtitle);
          pdf.text(subtitle, pageWidth - margin - subW, y + 2);
        }

        y += 8;

        // Subtle divider rule
        pdf.setDrawColor(borderSlate[0], borderSlate[1], borderSlate[2]);
        pdf.setLineWidth(0.6);
        pdf.line(margin, y, pageWidth - margin, y);
        y += 12;
      };

      // Top Primary Header Brand Bar & Accent Stripe
      pdf.setFillColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
      pdf.rect(0, 0, pageWidth, 6, 'F');
      pdf.setFillColor(accentRgb[0], accentRgb[1], accentRgb[2]);
      pdf.rect(0, 6, pageWidth, 2.5, 'F');

      // Top right corner static size logo
      const STATIC_LOGO_W = 48;
      const STATIC_LOGO_H = 48;
      const logoX = pageWidth - margin - STATIC_LOGO_W;
      const logoY = margin - 6;

      // Resolve logo image: custom base64 -> sidebar data URL -> HTTP rasterization -> guaranteed embedded base64
      let logoToDraw = null;
      if (branding.logoDataUrl && typeof branding.logoDataUrl === 'string' && branding.logoDataUrl.startsWith('data:image/')) {
        logoToDraw = branding.logoDataUrl;
      } else if (branding.logoPath && typeof branding.logoPath === 'string' && branding.logoPath.startsWith('data:image/')) {
        logoToDraw = branding.logoPath;
      }

      if (!logoToDraw) {
        try {
          const logoEl = document.getElementById('sidebar-logo-img');
          if (logoEl && logoEl.src && logoEl.src.startsWith('data:image/')) {
            logoToDraw = logoEl.src;
          }
        } catch (e) {}
      }

      if (!logoToDraw) {
        try {
          const logoEl = document.getElementById('sidebar-logo-img');
          if (logoEl && logoEl.complete && logoEl.naturalWidth > 0) {
            const canvas = document.createElement('canvas');
            canvas.width = 96;
            canvas.height = 96;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(logoEl, 0, 0, 96, 96);
            const dataUrl = canvas.toDataURL('image/png');
            if (dataUrl && dataUrl.startsWith('data:image/png')) {
              logoToDraw = dataUrl;
            }
          }
        } catch (e) {}
      }

      // Guaranteed offline embedded logo
      if (!logoToDraw || !logoToDraw.startsWith('data:image/')) {
        logoToDraw = window.DQD_DEFAULT_LOGO_BASE64 || this.defaultLogoBase64;
      }
      if (!logoToDraw || !logoToDraw.startsWith('data:image/')) {
        try {
          const c = document.createElement('canvas');
          c.width = 128; c.height = 128;
          const ctx = c.getContext('2d');
          const grad = ctx.createLinearGradient(0, 0, 128, 128);
          grad.addColorStop(0, '#0f172a'); grad.addColorStop(1, '#0284c7');
          ctx.fillStyle = grad;
          const r = 26;
          ctx.beginPath();
          ctx.moveTo(r, 0); ctx.lineTo(128 - r, 0); ctx.quadraticCurveTo(128, 0, 128, r);
          ctx.lineTo(128, 128 - r); ctx.quadraticCurveTo(128, 128, 128 - r, 128);
          ctx.lineTo(r, 128); ctx.quadraticCurveTo(0, 128, 0, 128 - r);
          ctx.lineTo(0, r); ctx.quadraticCurveTo(0, 0, r, 0);
          ctx.closePath(); ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.moveTo(36, 24); ctx.lineTo(76, 24); ctx.lineTo(92, 40); ctx.lineTo(92, 102); ctx.lineTo(36, 102); ctx.closePath(); ctx.fill();
          ctx.fillStyle = '#cbd5e1';
          ctx.beginPath();
          ctx.moveTo(76, 24); ctx.lineTo(76, 40); ctx.lineTo(92, 40); ctx.closePath(); ctx.fill();
          ctx.fillStyle = '#94a3b8';
          ctx.fillRect(46, 46, 26, 4.5);
          ctx.fillRect(46, 56, 38, 4.5);
          ctx.fillRect(46, 66, 38, 4.5);
          ctx.fillStyle = '#10b981';
          ctx.beginPath(); ctx.arc(82, 86, 18, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
          ctx.beginPath(); ctx.moveTo(75, 86); ctx.lineTo(80, 91); ctx.lineTo(89, 81); ctx.stroke();
          logoToDraw = c.toDataURL('image/png');
        } catch (e) {}
      }

      // Draw primary logo on Page 1 (Top right corner framed badge)
      let logoDrawnSuccess = false;
      if (logoToDraw) {
        try {
          pdf.setFillColor(255, 255, 255);
          pdf.setDrawColor(borderSlate[0], borderSlate[1], borderSlate[2]);
          pdf.roundedRect(logoX - 3, logoY - 3, STATIC_LOGO_W + 6, STATIC_LOGO_H + 6, 3, 3, 'FD');
          const format = logoToDraw.includes('image/jpeg') ? 'JPEG' : 'PNG';
          pdf.addImage(logoToDraw, format, logoX, logoY, STATIC_LOGO_W, STATIC_LOGO_H);
          logoDrawnSuccess = true;
        } catch (addErr) {
          console.warn('Could not draw raster logo in PDF:', addErr);
        }
      }
      if (!logoDrawnSuccess) {
        // Fallback: Crisp modern vector badge with monogram
        pdf.setFillColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
        pdf.roundedRect(logoX - 3, logoY - 3, STATIC_LOGO_W + 6, STATIC_LOGO_H + 6, 4, 4, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(14);
        pdf.text('DQD', logoX + (STATIC_LOGO_W / 2), logoY + (STATIC_LOGO_H / 2) + 5, { align: 'center' });
      }

      // Category Pill / Header Ribbon
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(6.5);
      const catText = `ENTERPRISE ${(profile.label || 'TECHNICAL SPECIFICATION').toUpperCase()} REPORT`;
      const catW = pdf.getTextWidth(catText) + 12;
      pdf.setFillColor(241, 245, 249);
      pdf.roundedRect(margin, y - 5, catW, 13, 2, 2, 'F');
      pdf.setTextColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
      pdf.text(catText, margin + 6, y + 4);
      y += 18;

      // Title (Left side, bounded to avoid overlapping logo)
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(17);
      pdf.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
      const titleMaxWidth = contentWidth - STATIC_LOGO_W - 24;
      const splitTitle = pdf.splitTextToSize(doc.title || `${profile.name || 'Technical'} Specification`, titleMaxWidth);
      pdf.text(splitTitle, margin, y);
      y += (splitTitle.length * 18);

      // Status & Priority Badges inline
      const docStatus = doc.status || 'Draft';
      const docPriority = doc.priority || 'Medium';

      let statusBg = [226, 232, 240];
      let statusFg = [71, 85, 105];
      if (docStatus === 'Approved' || docStatus === 'Final') {
        statusBg = [220, 252, 231];
        statusFg = [22, 101, 52];
      } else if (docStatus === 'In Review') {
        statusBg = [254, 243, 199];
        statusFg = [146, 64, 14];
      }

      let priorityBg = [238, 242, 255];
      let priorityFg = [55, 48, 163];
      if (docPriority === 'Critical') {
        priorityBg = [254, 226, 226];
        priorityFg = [153, 27, 27];
      } else if (docPriority === 'High') {
        priorityBg = [255, 237, 213];
        priorityFg = [194, 65, 12];
      }

      // Draw status pill
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7.5);
      const statusText = `STATUS: ${docStatus.toUpperCase()}`;
      const statusPillW = pdf.getTextWidth(statusText) + 12;
      pdf.setFillColor(statusBg[0], statusBg[1], statusBg[2]);
      pdf.roundedRect(margin, y - 7, statusPillW, 14, 2.5, 2.5, 'F');
      pdf.setTextColor(statusFg[0], statusFg[1], statusFg[2]);
      pdf.text(statusText, margin + 6, y + 3);

      // Draw priority pill
      const priorityText = `PRIORITY: ${docPriority.toUpperCase()}`;
      const prioPillW = pdf.getTextWidth(priorityText) + 12;
      const prioX = margin + statusPillW + 8;
      pdf.setFillColor(priorityBg[0], priorityBg[1], priorityBg[2]);
      pdf.roundedRect(prioX, y - 7, prioPillW, 14, 2.5, 2.5, 'F');
      pdf.setTextColor(priorityFg[0], priorityFg[1], priorityFg[2]);
      pdf.text(priorityText, prioX + 6, y + 3);

      y += 16;

      // SECTION 0: EXECUTIVE COVER PAGE & SPECIFICATION BRIEFING
      addBookmark('Executive Briefing & Overview');

      // 1. Executive Summary & Objective Card (Page 1)
      const summaryText = doc.executiveSummary || 'Enterprise specification establishing automated data quality verification criteria, SLAs, and governance controls.';
      const splitSummary = pdf.splitTextToSize(summaryText, contentWidth - 24);
      const summaryLineCount = Math.min(splitSummary.length, 3);
      const summaryCardH = 46 + (summaryLineCount * 11) + (doc.businessObjective ? 14 : 0);

      pdf.setFillColor(cardBgSlate[0], cardBgSlate[1], cardBgSlate[2]);
      pdf.setDrawColor(borderSlate[0], borderSlate[1], borderSlate[2]);
      pdf.roundedRect(margin, y, contentWidth, summaryCardH, 4, 4, 'FD');

      // Left vertical accent bar
      pdf.setFillColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
      pdf.roundedRect(margin, y, 3.5, summaryCardH, 1, 1, 'F');

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7.5);
      pdf.setTextColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
      pdf.text('EXECUTIVE BRIEFING & BUSINESS CONTEXT', margin + 10, y + 13);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8.5);
      pdf.setTextColor(bodySlate[0], bodySlate[1], bodySlate[2]);
      for (let sIdx = 0; sIdx < summaryLineCount; sIdx++) {
        pdf.text(splitSummary[sIdx] || '', margin + 10, y + 25 + (sIdx * 11));
      }

      let curSummaryY = y + 25 + (summaryLineCount * 11);
      if (doc.businessObjective) {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(7.5);
        pdf.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
        pdf.text('Strategic Goal: ', margin + 10, curSummaryY + 4);

        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(bodySlate[0], bodySlate[1], bodySlate[2]);
        const objSnippet = pdf.splitTextToSize(doc.businessObjective, contentWidth - 85)[0] || '';
        pdf.text(objSnippet, margin + 70, curSummaryY + 4);
      }

      y += summaryCardH + 12;

      // 2. Executive KPI Dashboard Strip (4 Hero Metrics)
      const queries = (doc.sqlQueries && doc.sqlQueries.length > 0) 
        ? doc.sqlQueries 
        : (doc.sqlQuery ? [{ id: 'Q-1', title: 'Primary Assertion Query', dialect: doc.sqlDialect || 'Snowflake', query: doc.sqlQuery, notes: doc.sqlNotes || '' }] : []);

      const executions = (doc.executions && doc.executions.length > 0) 
        ? doc.executions 
        : (this.executions || []).filter(e => e.docId === doc.id || e.documentId === doc.id);
      const totalExecs = executions.length;
      const passedExecs = executions.filter(e => String(e.status).toUpperCase() === 'PASS' || String(e.status).toUpperCase() === 'PASSED').length;
      const passRateStr = totalExecs > 0 ? `${Math.round((passedExecs / totalExecs) * 100)}% Pass` : (docStatus === 'Approved' ? '100% Passed' : 'Active Draft');

      const docRules = (doc.rules && doc.rules.length > 0)
        ? doc.rules
        : (this.rules || []).filter(r => (doc.ruleIds || []).includes(r.id));
      const rulesCount = docRules.length > 0 ? docRules.length : 1;

      const docIssues = (doc.issues && doc.issues.length > 0) 
        ? doc.issues 
        : (this.issues || []).filter(i => i.docId === doc.id || i.documentId === doc.id);
      const openIssuesCount = docIssues.filter(i => String(i.status).toLowerCase() !== 'resolved' && String(i.status).toLowerCase() !== 'closed').length;

      const cardGap = 8;
      const numCards = 4;
      const cardW = (contentWidth - ((numCards - 1) * cardGap)) / numCards;
      const cardH = 42;

      const kpiCards = [
        { title: 'QUALITY HEALTH', val: passRateStr, sub: `${totalExecs} Runs Audited`, accent: [16, 185, 129] },
        { title: 'SERVICE LEVEL (SLA)', val: docPriority.toUpperCase(), sub: doc.executionFrequency || 'Daily at 02:00 UTC', accent: primaryRgb },
        { title: 'RULES COVERAGE', val: `${rulesCount} Rules`, sub: `${queries.length} SQL Assertions`, accent: secondaryRgb },
        { title: 'DEFECT TRIAGE', val: `${openIssuesCount} Open`, sub: doc.remediation ? 'Runbook Attached' : 'Zero Open CAPA', accent: openIssuesCount > 0 ? [239, 68, 68] : [16, 185, 129] }
      ];

      kpiCards.forEach((c, idx) => {
        const cx = margin + (idx * (cardW + cardGap));
        pdf.setFillColor(cardBgSlate[0], cardBgSlate[1], cardBgSlate[2]);
        pdf.setDrawColor(borderSlate[0], borderSlate[1], borderSlate[2]);
        pdf.roundedRect(cx, y, cardW, cardH, 4, 4, 'FD');

        // Left accent indicator bar
        pdf.setFillColor(c.accent[0], c.accent[1], c.accent[2]);
        pdf.roundedRect(cx, y, 3.5, cardH, 1, 1, 'F');

        // Title
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(6.5);
        pdf.setTextColor(mutedSlate[0], mutedSlate[1], mutedSlate[2]);
        pdf.text(c.title, cx + 9, y + 12);

        // Hero value
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10.5);
        pdf.setTextColor(c.accent[0], c.accent[1], c.accent[2]);
        const splitVal = pdf.splitTextToSize(c.val, cardW - 14)[0] || '';
        pdf.text(splitVal, cx + 9, y + 24.5);

        // Subtitle
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(6.5);
        pdf.setTextColor(mutedSlate[0], mutedSlate[1], mutedSlate[2]);
        const splitSub = pdf.splitTextToSize(c.sub, cardW - 14)[0] || '';
        pdf.text(splitSub, cx + 9, y + 35);
      });

      y += cardH + 14;

      // 3. Specification Governance & Lineage Control Matrix (Structured Table)
      const src = doc.dataSource || {};
      const metadataMatrix = [
        ['Specification ID', `${doc.id} (v${doc.version || '1.0'})`, 'Target Business Domain', doc.businessDomain || 'Core Enterprise'],
        ['Validation Type', doc.validationType || 'Model Validation', 'Execution Frequency / SLA', doc.executionFrequency || 'Daily at 02:00 UTC'],
        ['Responsible Squad', doc.team || 'General Governance', 'Primary Data Owner', src.dataOwner || doc.owner || 'Enterprise Governance'],
        ['Target Lineage', `${src.system || 'Warehouse'} (${src.catalog || 'Default'})`, 'Assigned Reviewer', doc.reviewer || 'Lead Data Engineer'],
        ['Authors / Assignees', (doc.usernames && doc.usernames.length > 0) ? doc.usernames.join(', ') : (doc.owner || 'Unassigned'), 'Last Certified Date', new Date(doc.updatedAt || doc.createdAt).toLocaleDateString()]
      ];

      pdf.autoTable({
        startY: y,
        head: [['Governance Control Attribute', 'Specification Value', 'Enterprise Lineage Field', 'Assigned Authority']],
        body: metadataMatrix,
        theme: 'grid',
        headStyles: { fillColor: primaryRgb, textColor: [255, 255, 255], fontSize: 7.5, fontStyle: 'bold', cellPadding: 4 },
        styles: { fontSize: 7.5, cellPadding: 3.5, textColor: bodySlate, lineColor: borderSlate, lineWidth: 0.5 },
        alternateRowStyles: { fillColor: cardBgSlate },
        columnStyles: {
          0: { cellWidth: 125, fontStyle: 'bold', textColor: darkSlate },
          1: { cellWidth: 135 },
          2: { cellWidth: 125, fontStyle: 'bold', textColor: darkSlate }
        },
        margin: { left: margin, right: margin }
      });

      y = pdf.lastAutoTable.finalY + 12;

      // 4. Specification Section Architecture (Table of Contents Card on Cover)
      const tocCardH = 68;
      pdf.setFillColor(cardBgSlate[0], cardBgSlate[1], cardBgSlate[2]);
      pdf.setDrawColor(borderSlate[0], borderSlate[1], borderSlate[2]);
      pdf.roundedRect(margin, y, contentWidth, tocCardH, 4, 4, 'FD');

      pdf.setFillColor(secondaryRgb[0], secondaryRgb[1], secondaryRgb[2]);
      pdf.roundedRect(margin, y, 3.5, tocCardH, 1, 1, 'F');

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7.5);
      pdf.setTextColor(secondaryRgb[0], secondaryRgb[1], secondaryRgb[2]);
      pdf.text('SPECIFICATION DIRECTORY & SECTION ARCHITECTURE', margin + 10, y + 13);

      const section2Name = docProfileKey === 'data_analysis' ? 'Metrics, Dimensions & Analytical Rules'
        : docProfileKey === 'data_engineering' ? 'Pipeline SLA, Ingestion & Operational Rules'
        : docProfileKey === 'data_modelling' ? 'Data Architecture, Schema & Entity Rules'
        : 'Data Quality Rules Catalog (Assertions & Criteria)';

      const section3Name = docProfileKey === 'data_analysis' ? 'Analytical SQL Workbench & Queries'
        : docProfileKey === 'data_engineering' ? 'Transformation & Ingestion SQL Workbench'
        : docProfileKey === 'data_modelling' ? 'DDL, Schema & Modeling SQL Workbench'
        : 'SQL Assertion Workbench & Query Suite';

      const section4Name = docProfileKey === 'data_analysis' ? 'Query Runs, Metric Audits & Results'
        : docProfileKey === 'data_engineering' ? 'Pipeline Execution Runs & Performance History'
        : docProfileKey === 'data_modelling' ? 'Schema Validation Runs & DDL Verifications'
        : 'Verified Execution Evidence (Audits & Results)';

      const section5Name = docProfileKey === 'data_analysis' ? 'Business Insights, Action Items & Issues'
        : docProfileKey === 'data_engineering' ? 'Incident Remediation Runbooks & Operational Issues'
        : docProfileKey === 'data_modelling' ? 'Schema Drift, Structural Gaps & Model Issues'
        : 'Operational Remediation Runbook (CAPA & Defect Triage)';

      const tocLeftCol = [
        `§ 1. System Lineage & Specification Mappings (${profile.label || 'Architecture'})`,
        `§ 2. ${section2Name}`,
        `§ 3. ${section3Name}`
      ];
      const tocRightCol = [
        `§ 4. ${section4Name}`,
        `§ 5. ${section5Name}`,
        '§ 6. Governance Sign-off & Digital Certificate'
      ];

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);
      pdf.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);

      const halfW = (contentWidth - 24) / 2;
      tocLeftCol.forEach((item, tIdx) => {
        pdf.text(item, margin + 10, y + 27 + (tIdx * 13));
      });
      tocRightCol.forEach((item, tIdx) => {
        pdf.text(item, margin + 10 + halfW, y + 27 + (tIdx * 13));
      });

      // 5. Official Governance Assurance Notice (Bottom Cover Card)
      y += tocCardH + 10;
      const noteH = 28;
      pdf.setFillColor(241, 245, 249);
      pdf.setDrawColor(borderSlate[0], borderSlate[1], borderSlate[2]);
      pdf.roundedRect(margin, y, contentWidth, noteH, 3, 3, 'FD');

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7);
      pdf.setTextColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
      pdf.text('OFFICIAL ENTERPRISE GOVERNANCE ASSURANCE STATEMENT', margin + 10, y + 11);

      pdf.setFont('helvetica', 'italic');
      pdf.setFontSize(6.5);
      pdf.setTextColor(mutedSlate[0], mutedSlate[1], mutedSlate[2]);
      pdf.text('This specification is a certified enterprise data management artifact. Automated rules defined herein are enforced against production entities.', margin + 10, y + 20);

      // ====================================================================
      // START TECHNICAL SECTIONS ON PAGE 2
      // ====================================================================
      pdf.addPage();
      y = margin + 25;

      // Dynamic Aspect Ratio Screenshot Embedder Helper
      const embedScreenshot = (ss, titlePrefix = '') => {
        if (!ss || !ss.dataUrl) return;
        try {
          let imgProps = null;
          try {
            imgProps = pdf.getImageProperties(ss.dataUrl);
          } catch (pErr) {
            imgProps = { width: 800, height: 450 };
          }

          const origW = imgProps.width || 800;
          const origH = imgProps.height || 450;
          const aspect = origH / origW;

          let renderW = contentWidth - 16;
          let renderH = renderW * aspect;
          const maxImgHeight = 220;
          if (renderH > maxImgHeight) {
            renderH = maxImgHeight;
            renderW = renderH / aspect;
          }

          const cardFrameW = renderW + 16;
          const cardFrameH = renderH + 32;
          const renderX = margin + ((contentWidth - cardFrameW) / 2);

          if (y + cardFrameH + 20 > pageHeight - 35) {
            pdf.addPage();
            y = margin + 25;
          }

          // Visual card container frame
          pdf.setFillColor(cardBgSlate[0], cardBgSlate[1], cardBgSlate[2]);
          pdf.setDrawColor(borderSlate[0], borderSlate[1], borderSlate[2]);
          pdf.roundedRect(renderX, y, cardFrameW, cardFrameH, 4, 4, 'FD');

          // Caption label
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(8);
          pdf.setTextColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
          const captionStr = `${titlePrefix}${ss.caption || 'Screenshot Evidence'}${ss.relatedQueryId && ss.relatedQueryId !== 'none' ? ` [Query: ${ss.relatedQueryId}]` : ''}`;
          pdf.text(pdf.splitTextToSize(captionStr, cardFrameW - 20)[0] || '', renderX + 10, y + 14);

          const format = ss.dataUrl.includes('image/png') ? 'PNG' : 'JPEG';
          pdf.addImage(ss.dataUrl, format, renderX + 8, y + 22, renderW, renderH);
          y += cardFrameH + 12;
        } catch (imgErr) {
          console.warn('Could not add image to PDF:', imgErr);
        }
      };

      // SECTION 1: Data Architecture & System Specification
      renderSectionHeader('1', 'Data Architecture & System Specification', 'System Catalogs, Schemas & Lineage Mappings');

      const srcMeta = [
        ['Source System', src.system || 'N/A', 'Database / Catalog', src.catalog || 'N/A'],
        ['Schema', src.schema || 'N/A', 'Target Tables / Views', (src.tables || []).join(', ') || 'N/A'],
        ['Business Domain', doc.businessDomain || src.domain || 'N/A', 'Data Owner', src.dataOwner || doc.owner || 'N/A'],
        ['Technical Owner', src.technicalOwner || 'N/A', 'Upstream Dependencies', src.dependencies || 'N/A']
      ];

      pdf.autoTable({
        startY: y,
        head: [['System Attribute', 'Configured Value', 'Governance Field', 'Configured Value']],
        body: srcMeta,
        theme: 'grid',
        headStyles: { fillColor: primaryRgb, textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 4.5, textColor: bodySlate },
        alternateRowStyles: { fillColor: cardBgSlate },
        margin: { left: margin, right: margin }
      });

      y = pdf.lastAutoTable.finalY + 12;

      // Source Column Mappings Table
      if (src.mappings && src.mappings.length > 0) {
        const mapRows = src.mappings.map(m => [
          m.sourceCol || 'N/A',
          m.targetCol || 'N/A',
          m.dataType || 'VARCHAR',
          m.rule || 'Direct 1:1',
          m.nullable || 'YES',
          m.description || ''
        ]);

        pdf.autoTable({
          startY: y,
          head: [['Source Column', 'Target Column', 'Data Type', 'Transformation Rule', 'Nullable', 'Business Logic Description']],
          body: mapRows,
          theme: 'striped',
          headStyles: { fillColor: secondaryRgb, textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
          styles: { fontSize: 7.5, cellPadding: 4, textColor: bodySlate },
          alternateRowStyles: { fillColor: cardBgSlate },
          columnStyles: {
            3: { cellWidth: 100 },
            5: { cellWidth: 120 }
          },
          margin: { left: margin, right: margin }
        });

        y = pdf.lastAutoTable.finalY + 14;
      }

      // Discipline Technical Specification Attributes Table (profileAttributes)
      if (profileAttrs && profileAttrs.length > 0) {
        const attrRows = profileAttrs.map(attr => {
          const val = (teamAttrs && teamAttrs[attr.key] !== undefined && String(teamAttrs[attr.key]).trim()) 
            ? String(teamAttrs[attr.key]).trim() 
            : '— (Standard Default)';
          return [attr.label, val];
        });

        if (y > pageHeight - 120) { pdf.addPage(); y = margin + 25; }
        pdf.autoTable({
          startY: y,
          head: [[`${profile.label} Specification Attribute`, 'Configured Technical Parameter']],
          body: attrRows,
          theme: 'grid',
          headStyles: { fillColor: primaryRgb, textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
          styles: { fontSize: 7.5, cellPadding: 3.5, textColor: bodySlate },
          alternateRowStyles: { fillColor: cardBgSlate },
          columnStyles: {
            0: { cellWidth: 190, fontStyle: 'bold', textColor: darkSlate },
            1: { cellWidth: contentWidth - 190 }
          },
          margin: { left: margin, right: margin }
        });
        y = pdf.lastAutoTable.finalY + 12;
      }

      // Dynamic Validation Parameters Table
      const dynamicFieldsList = (doc.dynamicInputs && doc.dynamicInputs.length > 0)
        ? doc.dynamicInputs
        : (doc.dynamicFields || []);

      if (dynamicFieldsList.length > 0) {
        const dynRows = dynamicFieldsList.map(f => [f.label || f.key || 'Field', f.value || 'N/A']);
        pdf.autoTable({
          startY: y,
          head: [['Dynamic Validation Parameter', 'Specification Value']],
          body: dynRows,
          theme: 'striped',
          headStyles: { fillColor: primaryRgb, textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
          styles: { fontSize: 7.5, cellPadding: 4, textColor: bodySlate },
          alternateRowStyles: { fillColor: cardBgSlate },
          margin: { left: margin, right: margin }
        });
        y = pdf.lastAutoTable.finalY + 12;
      }

      // Validated dbt Models Table
      if (doc.validatedModels && doc.validatedModels.length > 0) {
        const modelRows = doc.validatedModels.map((m, idx) => [
          `#${idx + 1} ${m.modelName || 'Unnamed'}`,
          m.upstreamSources || 'N/A',
          m.grain || 'N/A',
          m.materialization || 'Table',
          m.notes || 'Target certified model'
        ]);
        pdf.autoTable({
          startY: y,
          head: [['Validated dbt Model', 'Upstream Lineage', 'Grain / Unique Key', 'Materialization', 'Governance Notes']],
          body: modelRows,
          theme: 'striped',
          headStyles: { fillColor: secondaryRgb, textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
          styles: { fontSize: 7.5, cellPadding: 4, textColor: bodySlate },
          alternateRowStyles: { fillColor: cardBgSlate },
          margin: { left: margin, right: margin }
        });
        y = pdf.lastAutoTable.finalY + 12;
      }

      // Validated Physical Tables Table
      if (doc.validatedTables && doc.validatedTables.length > 0) {
        const tableRows = doc.validatedTables.map((t, idx) => [
          `#${idx + 1} ${t.tableName || 'Unnamed'}`,
          t.schema || 'N/A',
          t.storageFormat || 'Parquet',
          t.partitionKeys || 'N/A',
          t.volume || 'N/A',
          t.notes || 'Monitored physical entity'
        ]);
        pdf.autoTable({
          startY: y,
          head: [['Validated Physical Table', 'Catalog / Schema', 'Format', 'Partition Keys', 'Estimated Volume', 'Storage Notes']],
          body: tableRows,
          theme: 'striped',
          headStyles: { fillColor: primaryRgb, textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
          styles: { fontSize: 7.5, cellPadding: 4, textColor: bodySlate },
          alternateRowStyles: { fillColor: cardBgSlate },
          margin: { left: margin, right: margin }
        });
        y = pdf.lastAutoTable.finalY + 14;
      }

      // Expected vs Actual Result Quality Comparison Callout Boxes
      if (doc.expectedResult || doc.actualResult) {
        const boxW = doc.actualResult ? ((contentWidth - 10) / 2) : contentWidth;
        const boxH = 38;
        if (y + boxH + 10 > pageHeight - 40) { pdf.addPage(); y = margin + 25; }

        if (doc.expectedResult) {
          pdf.setFillColor(239, 246, 255);
          pdf.setDrawColor(191, 219, 254);
          pdf.roundedRect(margin, y, boxW, boxH, 3, 3, 'FD');
          pdf.setFillColor(59, 130, 246);
          pdf.roundedRect(margin, y, 3.5, boxH, 1, 1, 'F');

          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(7.5);
          pdf.setTextColor(30, 64, 175);
          pdf.text('EXPECTED QUALITY STANDARD', margin + 9, y + 12);

          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(8);
          pdf.setTextColor(30, 58, 138);
          const splitExp = pdf.splitTextToSize(doc.expectedResult, boxW - 18);
          pdf.text(splitExp.slice(0, 2), margin + 9, y + 24);
        }

        if (doc.actualResult) {
          const actX = margin + boxW + 10;
          pdf.setFillColor(240, 253, 244);
          pdf.setDrawColor(187, 247, 208);
          pdf.roundedRect(actX, y, boxW, boxH, 3, 3, 'FD');
          pdf.setFillColor(34, 197, 94);
          pdf.roundedRect(actX, y, 3.5, boxH, 1, 1, 'F');

          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(7.5);
          pdf.setTextColor(22, 101, 52);
          pdf.text('ACTUAL AUDIT VERIFICATION', actX + 9, y + 12);

          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(8);
          pdf.setTextColor(20, 83, 45);
          const splitAct = pdf.splitTextToSize(doc.actualResult, boxW - 18);
          pdf.text(splitAct.slice(0, 2), actX + 9, y + 24);
        }

        y += boxH + 14;
      }

      // SECTION 2: Data Quality Validation Rules Catalog
      let effectiveRules = (doc.rules && Array.isArray(doc.rules) && doc.rules.length > 0)
        ? doc.rules
        : ((this.rules || []).filter(r => (doc.ruleIds || []).includes(r.id)));

      if (!effectiveRules || effectiveRules.length === 0) {
        // Synthesize baseline specification rule from document metadata & assertions
        effectiveRules = [
          {
            id: 'RULE-01',
            name: `${doc.title || 'Target Entity'} Verification`,
            dimension: 'Validity & Completeness',
            severity: doc.priority || 'Critical',
            expectedResult: doc.expectedResult || '0 defect records (100% Pass)',
            threshold: doc.threshold || '0',
            description: doc.executiveSummary || 'Verifies data conformance and schema integrity according to specification.',
            sql: (queries[0] && queries[0].query) ? queries[0].query.slice(0, 90).replace(/\s+/g, ' ') + '...' : 'Executable assertion logic defined in SQL Workbench.'
          }
        ];
      }

      renderSectionHeader('2', section2Name, `${effectiveRules.length} ${effectiveRules.length === 1 ? 'Defined Item' : 'Defined Items'}`);

      const rulesData = effectiveRules.map(r => [
        r.id || 'RULE',
        r.name || 'Unnamed',
        r.dimension || 'Validity',
        r.severity || 'Medium',
        r.expectedResult || '0 defect rows',
        r.threshold || '0'
      ]);

      pdf.autoTable({
        startY: y,
        head: [['Rule ID', 'Rule Name / Assertion Target', 'Dimension', 'Severity', 'Expected Result', 'Threshold']],
        body: rulesData,
        theme: 'striped',
        headStyles: { fillColor: primaryRgb, textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 4, textColor: bodySlate },
        alternateRowStyles: { fillColor: cardBgSlate },
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 3) {
            const sev = String(data.cell.raw).toLowerCase();
            if (sev === 'critical') {
              data.cell.styles.textColor = [153, 27, 27];
              data.cell.styles.fillColor = [254, 226, 226];
              data.cell.styles.fontStyle = 'bold';
            } else if (sev === 'high') {
              data.cell.styles.textColor = [194, 65, 12];
              data.cell.styles.fillColor = [255, 237, 213];
              data.cell.styles.fontStyle = 'bold';
            } else if (sev === 'medium') {
              data.cell.styles.textColor = [133, 77, 14];
              data.cell.styles.fillColor = [254, 243, 199];
            }
          }
        },
        margin: { left: margin, right: margin }
      });
      y = pdf.lastAutoTable.finalY + 12;

      // Detailed Rule Logic & SQL Expressions Table
      const rulesWithDetails = effectiveRules.filter(r => r.description || r.sql);
      if (rulesWithDetails.length > 0) {
        const detailRows = rulesWithDetails.map(r => [
          r.id,
          r.dimension || 'Validity',
          r.description || 'Validates conformance to specification.',
          r.sql ? r.sql.trim() : 'Defined in primary assertion query.'
        ]);

        pdf.autoTable({
          startY: y,
          head: [['Rule ID', 'Dimension', 'Detailed Specification Description', 'Rule Assertion Logic / SQL Expression']],
          body: detailRows,
          theme: 'grid',
          headStyles: { fillColor: secondaryRgb, textColor: [255, 255, 255], fontSize: 7.5, fontStyle: 'bold' },
          styles: { fontSize: 7, cellPadding: 3.5, textColor: bodySlate },
          alternateRowStyles: { fillColor: cardBgSlate },
          columnStyles: {
            0: { cellWidth: 70, fontStyle: 'bold' },
            1: { cellWidth: 65 },
            2: { cellWidth: 150 },
            3: { font: 'courier' }
          },
          margin: { left: margin, right: margin }
        });
        y = pdf.lastAutoTable.finalY + 16;
      }

      // SECTION 3: SQL Assertion Code & Workbench
      renderSectionHeader('3', section3Name, `${queries.length} ${queries.length === 1 ? 'Query' : 'Queries'}`);

      queries.forEach((qObj, qIdx) => {
        if (!qObj.query && !qObj.notes) return;
        if (y > pageHeight - 90) { pdf.addPage(); y = margin + 25; }

        const qTitle = `${queries.length > 1 ? `Query #${qIdx + 1}: ` : ''}${qObj.title || 'SQL Assertion'}`;
        const qDialect = qObj.dialect || doc.sqlDialect || 'Snowflake';

        if (qObj.notes) {
          pdf.setFont('helvetica', 'italic');
          pdf.setFontSize(8);
          pdf.setTextColor(mutedSlate[0], mutedSlate[1], mutedSlate[2]);
          pdf.text(`Purpose / Audit Note: ${qObj.notes}`, margin, y);
          y += 10;
        }

        if (qObj.query) {
          const rawLines = qObj.query.replace(/\r\n/g, '\n').split('\n');
          const headerBarHeight = 18;

          if (y + headerBarHeight + 30 > pageHeight - 40) {
            pdf.addPage();
            y = margin + 25;
          }

          // Terminal/IDE Chrome Header Bar
          pdf.setFillColor(30, 41, 59);
          pdf.roundedRect(margin, y, contentWidth, headerBarHeight, 3, 3, 'F');

          // macOS/Linux style window dots
          pdf.setFillColor(239, 68, 68); pdf.circle(margin + 10, y + 9, 2.5, 'F');
          pdf.setFillColor(245, 158, 11); pdf.circle(margin + 17, y + 9, 2.5, 'F');
          pdf.setFillColor(34, 197, 94); pdf.circle(margin + 24, y + 9, 2.5, 'F');

          // Dialect pill inside header
          pdf.setFillColor(secondaryRgb[0], secondaryRgb[1], secondaryRgb[2]);
          pdf.roundedRect(margin + 30, y + 2.5, 65, 13, 2, 2, 'F');
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(7);
          pdf.setTextColor(255, 255, 255);
          pdf.text(qDialect.slice(0, 14), margin + 34, y + 11.5);

          // Query Title
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(8);
          pdf.setTextColor(248, 250, 252);
          const titleSnippet = pdf.splitTextToSize(qTitle, contentWidth - 190)[0] || '';
          pdf.text(titleSnippet, margin + 102, y + 12);

          // Total line count indicator
          const linesLabel = `${rawLines.length} lines`;
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(7);
          pdf.setTextColor(148, 163, 184);
          pdf.text(linesLabel, pageWidth - margin - pdf.getTextWidth(linesLabel) - 8, y + 12);

          y += headerBarHeight;

          // Multi-page code line wrapping with line numbers gutter
          const gutterW = 26;
          const codeWidth = contentWidth - gutterW - 12;
          const codeLineH = 10.5;

          const displayLines = [];
          rawLines.forEach((lStr, lIdx) => {
            const wrapped = pdf.splitTextToSize(lStr || ' ', codeWidth);
            if (!wrapped || wrapped.length === 0) {
              displayLines.push({ num: lIdx + 1, text: '', isCont: false });
            } else {
              wrapped.forEach((wStr, wIdx) => {
                displayLines.push({
                  num: wIdx === 0 ? (lIdx + 1) : '',
                  text: wStr,
                  isCont: wIdx > 0
                });
              });
            }
          });

          let linePtr = 0;
          while (linePtr < displayLines.length) {
            if (y + codeLineH + 16 > pageHeight - 35) {
              pdf.addPage();
              y = margin + 25;
              pdf.setFillColor(30, 41, 59);
              pdf.rect(margin, y, contentWidth, 13, 'F');
              pdf.setFont('helvetica', 'italic');
              pdf.setFontSize(7);
              pdf.setTextColor(148, 163, 184);
              pdf.text(`${qTitle} (continued...)`, margin + 8, y + 9.5);
              y += 13;
            }

            const availH = (pageHeight - 35) - y;
            const linesToDraw = Math.min(Math.floor(availH / codeLineH), displayLines.length - linePtr);
            const chunkH = linesToDraw * codeLineH + 4;

            // Dark code editor body background
            pdf.setFillColor(15, 23, 42);
            pdf.rect(margin, y, contentWidth, chunkH, 'F');

            // Gutter divider
            pdf.setDrawColor(51, 65, 85);
            pdf.line(margin + gutterW, y, margin + gutterW, y + chunkH);

            for (let i = 0; i < linesToDraw; i++) {
              const curItem = displayLines[linePtr + i];
              const curY = y + (i * codeLineH) + 8.5;

              if (curItem.num) {
                pdf.setFont('courier', 'normal');
                pdf.setFontSize(6.5);
                pdf.setTextColor(100, 116, 139);
                const nStr = String(curItem.num);
                pdf.text(nStr, margin + gutterW - pdf.getTextWidth(nStr) - 5, curY);
              }

              pdf.setFont('courier', 'normal');
              pdf.setFontSize(7.5);
              pdf.setTextColor(248, 250, 252);
              pdf.text(curItem.text, margin + gutterW + 6, curY);
            }

            y += chunkH + 2;
            linePtr += linesToDraw;
          }

          y += 10;
        }

        // Screenshots linked under this query
        (doc.screenshots || []).filter(s => s.placement === 'under_query' && (s.relatedQueryId === qObj.id || s.relatedQueryId === 'all')).forEach(ss => {
          embedScreenshot(ss);
        });
      });

      // SECTION 4: Verified Test Executions & Quality Results
      renderSectionHeader('4', section4Name, `${executions.length} Run Audits`);

      if (executions.length > 0) {
        // Render off-screen defect volume trend chart via Chart.js
        if (window.Chart) {
          try {
            const chartCanvas = document.createElement('canvas');
            chartCanvas.width = 540;
            chartCanvas.height = 130;
            const ctx = chartCanvas.getContext('2d');

            const recentRuns = executions.slice(-8);
            const chartLabels = recentRuns.map((e, i) => {
              const d = new Date(e.timestamp);
              return isNaN(d.getTime()) ? `#${i + 1}` : `${d.getMonth() + 1}/${d.getDate()}`;
            });
            const defectData = recentRuns.map(e => Number(e.failedRecords || 0));

            const chartInstance = new Chart(ctx, {
              type: 'bar',
              data: {
                labels: chartLabels,
                datasets: [{
                  label: 'Defect Rows',
                  data: defectData,
                  backgroundColor: 'rgba(239, 68, 68, 0.75)',
                  borderColor: 'rgba(239, 68, 68, 1)',
                  borderWidth: 1,
                  borderRadius: 3
                }]
              },
              options: {
                animation: false,
                responsive: false,
                devicePixelRatio: 2,
                plugins: {
                  legend: { display: false },
                  title: {
                    display: true,
                    text: 'Automated Audit History: Defect Volume Across Recent Execution Runs',
                    font: { size: 9, weight: 'bold' },
                    color: '#334155',
                    padding: { bottom: 6 }
                  }
                },
                scales: {
                  x: { grid: { display: false }, ticks: { font: { size: 7.5 }, color: '#64748B' } },
                  y: { beginAtZero: true, grid: { color: 'rgba(226, 232, 240, 0.6)' }, ticks: { font: { size: 7.5 }, color: '#64748B', precision: 0 } }
                }
              }
            });

            const chartImg = chartCanvas.toDataURL('image/png');
            chartInstance.destroy();

            const chartW = contentWidth;
            const chartH = 75;
            if (y + chartH + 20 > pageHeight - 35) { pdf.addPage(); y = margin + 25; }
            pdf.addImage(chartImg, 'PNG', margin, y, chartW, chartH);
            y += chartH + 10;
          } catch (chartErr) {
            console.warn('Offscreen Chart.js render skipped:', chartErr);
          }
        }

        const execData = executions.map(e => [
          new Date(e.timestamp).toLocaleDateString(),
          e.environment || 'PROD',
          e.status || 'PASS',
          (e.totalRecords || 0).toLocaleString(),
          (e.failedRecords || 0).toLocaleString(),
          e.failurePercentage ? e.failurePercentage + '%' : '0.0%',
          e.evidence || 'Log artifact verified'
        ]);

        pdf.autoTable({
          startY: y,
          head: [['Audit Date', 'Env', 'Audit Status', 'Total Records', 'Defects', 'Defect %', 'Verification Evidence']],
          body: execData,
          theme: 'striped',
          headStyles: { fillColor: primaryRgb, textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
          styles: { fontSize: 7.5, cellPadding: 4, textColor: bodySlate },
          alternateRowStyles: { fillColor: cardBgSlate },
          didParseCell: (data) => {
            if (data.section === 'body' && data.column.index === 2) {
              const st = String(data.cell.raw).toUpperCase();
              if (st === 'PASS' || st === 'PASSED') {
                data.cell.styles.fillColor = [220, 252, 231];
                data.cell.styles.textColor = [22, 101, 52];
                data.cell.styles.fontStyle = 'bold';
              } else if (st === 'FAIL' || st === 'FAILED') {
                data.cell.styles.fillColor = [254, 226, 226];
                data.cell.styles.textColor = [153, 27, 27];
                data.cell.styles.fontStyle = 'bold';
              } else if (st === 'WARNING') {
                data.cell.styles.fillColor = [254, 243, 199];
                data.cell.styles.textColor = [146, 64, 14];
                data.cell.styles.fontStyle = 'bold';
              }
            }
          },
          margin: { left: margin, right: margin }
        });
        y = pdf.lastAutoTable.finalY + 16;
      } else {
        const placeholderExecRows = [
          ['TEST-01 (Baseline)', doc.title || 'Target Table', 'READY / PENDING', 'Target Entity Scope', '0 Defect Records (Target)', doc.executionFrequency || 'Daily at 02:00 UTC', 'Automated Scheduled Runner']
        ];
        pdf.autoTable({
          startY: y,
          head: [['Test Run ID', 'Test Target Entity', 'Execution Status', 'Audited Scope', 'Defect Tolerance', 'Schedule Cadence', 'Execution Engine']],
          body: placeholderExecRows,
          theme: 'striped',
          headStyles: { fillColor: primaryRgb, textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
          styles: { fontSize: 7.5, cellPadding: 4, textColor: bodySlate },
          alternateRowStyles: { fillColor: cardBgSlate },
          didParseCell: (data) => {
            if (data.section === 'body' && data.column.index === 2) {
              data.cell.styles.textColor = [30, 64, 175];
              data.cell.styles.fillColor = [239, 246, 255];
              data.cell.styles.fontStyle = 'bold';
            }
          },
          margin: { left: margin, right: margin }
        });
        y = pdf.lastAutoTable.finalY + 8;

        pdf.setFont('helvetica', 'italic');
        pdf.setFontSize(7);
        pdf.setTextColor(mutedSlate[0], mutedSlate[1], mutedSlate[2]);
        pdf.text('Note: No historical execution logs are attached yet. Test runs can be logged via the Test Executions workspace or automated CI/CD runners.', margin, y);
        y += 14;
      }

      // SECTION 5: Operational Remediation Runbook & Issues
      renderSectionHeader('5', section5Name, `${docIssues.length} Linked Items`);

      if (doc.remediation) {
        const remH = 38;
        pdf.setFillColor(255, 251, 235);
        pdf.setDrawColor(253, 230, 138);
        pdf.roundedRect(margin, y, contentWidth, remH, 3, 3, 'FD');
        pdf.setFillColor(245, 158, 11);
        pdf.roundedRect(margin, y, 3.5, remH, 1, 1, 'F');

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8);
        pdf.setTextColor(146, 64, 14);
        pdf.text('OPERATIONAL REMEDIATION RUNBOOK PROTOCOL', margin + 10, y + 12);

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(120, 53, 15);
        const splitRem = pdf.splitTextToSize(doc.remediation, contentWidth - 22);
        pdf.text(splitRem.slice(0, 2), margin + 10, y + 24);

        y += remH + 12;
      } else {
        const remH = 32;
        pdf.setFillColor(cardBgSlate[0], cardBgSlate[1], cardBgSlate[2]);
        pdf.setDrawColor(borderSlate[0], borderSlate[1], borderSlate[2]);
        pdf.roundedRect(margin, y, contentWidth, remH, 3, 3, 'FD');
        pdf.setFillColor(secondaryRgb[0], secondaryRgb[1], secondaryRgb[2]);
        pdf.roundedRect(margin, y, 3.5, remH, 1, 1, 'F');

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(7.5);
        pdf.setTextColor(secondaryRgb[0], secondaryRgb[1], secondaryRgb[2]);
        pdf.text('STANDARD OPERATIONAL REMEDIATION PROTOCOL', margin + 10, y + 11);

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7);
        pdf.setTextColor(bodySlate[0], bodySlate[1], bodySlate[2]);
        pdf.text('Upon assertion breach or threshold defect, on-call data engineers must be paged, quarantine downstream ETL pipelines, and initiate root-cause triage.', margin + 10, y + 22);
        y += remH + 10;
      }

      if (docIssues.length > 0) {
        const issueRows = docIssues.map(iss => [
          iss.id || 'ISS',
          iss.title || 'Untitled Defect',
          iss.severity || 'Medium',
          iss.status || 'Open',
          iss.owner || 'Unassigned',
          iss.deadline || 'N/A',
          iss.rootCause || 'Under triage'
        ]);

        pdf.autoTable({
          startY: y,
          head: [['Issue ID', 'Defect Title', 'Severity', 'Status', 'Remediation Owner', 'Target SLA', 'Root Cause Analysis']],
          body: issueRows,
          theme: 'grid',
          headStyles: { fillColor: primaryRgb, textColor: [255, 255, 255], fontSize: 7.5, fontStyle: 'bold' },
          styles: { fontSize: 7.5, cellPadding: 3.5, textColor: bodySlate },
          alternateRowStyles: { fillColor: cardBgSlate },
          didParseCell: (data) => {
            if (data.section === 'body') {
              if (data.column.index === 2) {
                const s = String(data.cell.raw).toLowerCase();
                if (s === 'critical' || s === 'high') {
                  data.cell.styles.textColor = [153, 27, 27];
                  data.cell.styles.fontStyle = 'bold';
                }
              }
              if (data.column.index === 3) {
                const st = String(data.cell.raw).toLowerCase();
                if (st === 'resolved' || st === 'closed') {
                  data.cell.styles.textColor = [22, 101, 52];
                  data.cell.styles.fillColor = [220, 252, 231];
                } else {
                  data.cell.styles.textColor = [146, 64, 14];
                  data.cell.styles.fillColor = [254, 243, 199];
                }
              }
            }
          },
          margin: { left: margin, right: margin }
        });
        y = pdf.lastAutoTable.finalY + 16;
      } else {
        const noIssH = 26;
        pdf.setFillColor(240, 253, 244);
        pdf.setDrawColor(187, 247, 208);
        pdf.roundedRect(margin, y, contentWidth, noIssH, 3, 3, 'FD');
        pdf.setFillColor(34, 197, 94);
        pdf.roundedRect(margin, y, 3.5, noIssH, 1, 1, 'F');

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(7.5);
        pdf.setTextColor(22, 101, 52);
        pdf.text('ZERO ACTIVE DEFECT ISSUES', margin + 10, y + 11);

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7);
        pdf.setTextColor(20, 83, 45);
        pdf.text('All assertion criteria are within expected parameters. No CAPA corrective action tickets are currently open.', margin + 10, y + 20);
        y += noIssH + 16;
      }

      // SECTION 6: Governance, Revision History & Sign-Off Approvals
      renderSectionHeader('6', 'Governance, Revision History & Sign-Off Approvals', 'Formal Traceability');

      const effectiveHistory = (doc.versionHistory && doc.versionHistory.length > 0)
        ? doc.versionHistory
        : [{
            version: doc.version || '1.0',
            timestamp: doc.updatedAt || doc.createdAt || new Date().toISOString(),
            author: (doc.usernames && doc.usernames[0]) || doc.owner || 'Lead Author',
            summary: 'Initial specification baseline & validation rules definition'
          }];

      if (pdfSettings.includeRevisionHistory !== false) {
        const revData = effectiveHistory.map(v => [
          `v${v.version || '1.0'}`,
          v.timestamp ? new Date(v.timestamp).toLocaleDateString() : 'N/A',
          v.author || v.changedBy || 'System',
          v.summary || v.notes || 'Document update and assertion snapshot'
        ]);

        pdf.autoTable({
          startY: y,
          head: [['Version', 'Snapshot Date', 'Author / Modifier', 'Change Summary & Release Notes']],
          body: revData,
          theme: 'striped',
          headStyles: { fillColor: secondaryRgb, textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
          styles: { fontSize: 7.5, cellPadding: 4, textColor: bodySlate },
          alternateRowStyles: { fillColor: cardBgSlate },
          columnStyles: { 0: { cellWidth: 55, fontStyle: 'bold' }, 1: { cellWidth: 75 }, 2: { cellWidth: 100 } },
          margin: { left: margin, right: margin }
        });
        y = pdf.lastAutoTable.finalY + 12;
      }

      // Formal Sign-Off Approvals Table
      const effectiveApprovals = (doc.approvals && doc.approvals.length > 0)
        ? doc.approvals
        : [
            {
              timestamp: doc.updatedAt || doc.createdAt,
              reviewer: doc.owner || (doc.usernames && doc.usernames[0]) || 'Primary Data Owner',
              status: docStatus === 'Approved' ? 'Approved' : 'Pending Formal Sign-off',
              comments: docStatus === 'Approved' ? 'Certified and approved for operational execution.' : 'Specification drafted; awaiting review and sign-off.'
            },
            {
              timestamp: doc.updatedAt || doc.createdAt,
              reviewer: doc.reviewer || 'Lead Data Engineer',
              status: docStatus === 'Approved' ? 'Approved' : 'Technical Review in Progress',
              comments: 'Verified assertion SQL queries and lineage dependencies.'
            }
          ];

      const appData = effectiveApprovals.map(a => [
        a.timestamp ? new Date(a.timestamp).toLocaleDateString() : 'Pending',
        a.reviewer || 'Governance Authority',
        a.status || 'Pending',
        a.comments || 'Enterprise data governance review.'
      ]);

      pdf.autoTable({
        startY: y,
        head: [['Sign-off Date', 'Reviewer / Authority', 'Governance Decision', 'Review Comments']],
        body: appData,
        theme: 'grid',
        headStyles: { fillColor: primaryRgb, textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 4, textColor: bodySlate },
        alternateRowStyles: { fillColor: cardBgSlate },
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 2) {
            const dec = String(data.cell.raw).toLowerCase();
            if (dec.includes('approved')) {
              data.cell.styles.textColor = [22, 101, 52];
              data.cell.styles.fillColor = [220, 252, 231];
              data.cell.styles.fontStyle = 'bold';
            } else if (dec.includes('reject')) {
              data.cell.styles.textColor = [153, 27, 27];
              data.cell.styles.fillColor = [254, 226, 226];
              data.cell.styles.fontStyle = 'bold';
            } else {
              data.cell.styles.textColor = [30, 64, 175];
              data.cell.styles.fillColor = [239, 246, 255];
              data.cell.styles.fontStyle = 'bold';
            }
          }
        },
        margin: { left: margin, right: margin }
      });
      y = pdf.lastAutoTable.finalY + 14;

      // SECTION 7: Official Governance & Sign-Off Certification Block
      const certBoxH = 46;
      if (y + certBoxH + 20 > pageHeight - 35) { pdf.addPage(); y = margin + 25; }

      pdf.setFillColor(cardBgSlate[0], cardBgSlate[1], cardBgSlate[2]);
      pdf.setDrawColor(borderSlate[0], borderSlate[1], borderSlate[2]);
      pdf.roundedRect(margin, y, contentWidth, certBoxH, 4, 4, 'FD');

      // Top colored accent border on certificate
      pdf.setFillColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
      pdf.roundedRect(margin, y, contentWidth, 3, 1, 1, 'F');

      // Certificate header
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.setTextColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
      pdf.text('OFFICIAL DATA GOVERNANCE RECORD & AUDIT APPROVAL', margin + 10, y + 14);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7.5);
      pdf.setTextColor(bodySlate[0], bodySlate[1], bodySlate[2]);
      pdf.text(`Certified By: ${this.currentUser || (doc.usernames && doc.usernames[0]) || doc.owner || 'Lead Data Governance Officer'}`, margin + 10, y + 26);
      pdf.text(`Audit Timestamp: ${new Date().toISOString().replace('T', ' ').slice(0, 19)} UTC  •  Status: ${docStatus.toUpperCase()}  •  Version: ${doc.version || '1.0'}`, margin + 10, y + 37);

      y += certBoxH + 16;

      // APPENDIX: Visual Screenshot Evidence
      const appendixScreenshots = (doc.screenshots || []).filter(s => s.placement === 'appendix' || (!s.placement));
      if (appendixScreenshots.length > 0) {
        if (y > pageHeight - 160) {
          pdf.addPage();
          y = margin + 25;
        }
        renderSectionHeader('App', 'Visual Screenshot Evidence Appendix', `${appendixScreenshots.length} Supporting Artifacts`);
        appendixScreenshots.forEach((ss, idx) => {
          embedScreenshot(ss, `Evidence #${idx + 1}: `);
        });
      }

      // AUTHOR & USER CONTACT SIGN-OFF BLOCK
      // Displayed at the end of generated documents if any value (username, useremail, userphone) is provided
      const uContact = this.getUserInfo(doc);
      const hasUserContact = Boolean(uContact && (uContact.username || uContact.useremail || uContact.userphone));
      if (hasUserContact) {
        const contactBoxH = 34;
        if (y + contactBoxH + 20 > pageHeight - 35) {
          pdf.addPage();
          y = margin + 25;
        }

        pdf.setFillColor(cardBgSlate[0], cardBgSlate[1], cardBgSlate[2]);
        pdf.setDrawColor(borderSlate[0], borderSlate[1], borderSlate[2]);
        pdf.roundedRect(margin, y, contentWidth, contactBoxH, 4, 4, 'FD');

        // Top accent line
        pdf.setFillColor(accentRgb[0], accentRgb[1], accentRgb[2]);
        pdf.roundedRect(margin, y, contentWidth, 2.5, 1, 1, 'F');

        // Header
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8);
        pdf.setTextColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
        pdf.text('DOCUMENT AUTHOR & CONTACT DETAILS', margin + 10, y + 12);

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7.5);
        pdf.setTextColor(bodySlate[0], bodySlate[1], bodySlate[2]);

        const contactDetails = [];
        if (uContact.username) contactDetails.push(`Author: ${uContact.username}`);
        if (uContact.useremail) contactDetails.push(`Email: ${uContact.useremail}`);
        if (uContact.userphone) contactDetails.push(`Phone: ${uContact.userphone}`);

        pdf.text(contactDetails.join('   •   '), margin + 10, y + 21);

        pdf.setFontSize(6.5);
        pdf.setTextColor(mutedSlate[0], mutedSlate[1], mutedSlate[2]);
        pdf.text('Direct inquiries regarding this validation specification to the author contact details above.', margin + 10, y + 28);

        y += contactBoxH + 14;
      }

      // Clean up any trailing blank pages
      while (pdf.internal.getNumberOfPages() > 1) {
        const lastPageNum = pdf.internal.getNumberOfPages();
        const pageData = pdf.internal.pages[lastPageNum];
        const hasContent = Array.isArray(pageData) && pageData.some(entry => {
          if (typeof entry !== 'string') return false;
          return /\b(Tj|TJ|re|f|S|B|Do)\b/.test(entry) || entry.includes('Tj') || entry.includes('re') || entry.includes('Do');
        });
        if (!hasContent) {
          pdf.deletePage(lastPageNum);
        } else {
          break;
        }
      }

      // Running Headers, Watermark & Page Footers
      const totalPages = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);

        // Watermark: disabled per user request to keep document clean and free of "FOR REVIEW ONLY" watermark
        // (Clean presentation across all pages)

        // Running Header on Pages 2+
        if (i > 1) {
          // Top mini accent line
          pdf.setFillColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
          pdf.rect(0, 0, pageWidth, 2.5, 'F');

          let headerLeftX = margin;
          if (logoToDraw) {
            try {
              const format = logoToDraw.includes('image/jpeg') ? 'JPEG' : 'PNG';
              pdf.addImage(logoToDraw, format, margin, 12, 12, 12);
              headerLeftX += 16;
            } catch (e) {}
          }

          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(7.5);
          pdf.setTextColor(mutedSlate[0], mutedSlate[1], mutedSlate[2]);
          const headerLeft = `Doc ID: ${doc.id}  •  ${doc.title || `${profile.name || 'Technical'} Specification`} (v${doc.version || '1.0'})`;
          pdf.text(pdf.splitTextToSize(headerLeft, contentWidth - 170)[0] || '', headerLeftX, 21.5);

          const headerRight = `CONFIDENTIAL  •  ${docStatus.toUpperCase()}`;
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(7);
          pdf.setTextColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
          pdf.text(headerRight, pageWidth - margin - pdf.getTextWidth(headerRight), 21.5);

          pdf.setDrawColor(borderSlate[0], borderSlate[1], borderSlate[2]);
          pdf.setLineWidth(0.5);
          pdf.line(margin, 26, pageWidth - margin, 26);
        }

        // Running Footer across all pages
        pdf.setDrawColor(borderSlate[0], borderSlate[1], borderSlate[2]);
        pdf.setLineWidth(0.5);
        pdf.line(margin, pageHeight - 24, pageWidth - margin, pageHeight - 24);

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7);
        pdf.setTextColor(mutedSlate[0], mutedSlate[1], mutedSlate[2]);

        const footerNote = branding.footerText || (profile.branding && profile.branding.footerText) || `${profile.name || 'Data'} Documenter  •  Enterprise Specification  •  Internal Confidential`;
        pdf.text(footerNote, margin, pageHeight - 13);

        if (branding.showPageNumbers !== false) {
          const pageStr = `Page ${i} of ${totalPages}`;
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(7);
          pdf.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
          pdf.text(pageStr, pageWidth - margin - pdf.getTextWidth(pageStr), pageHeight - 13);
        }
      }

      pdf.save(`DQD-${doc.id}-${new Date().toISOString().slice(0, 10)}.pdf`);
      this.showToast('Enterprise PDF Report generated and downloaded', 'success');
    },

    // ====================================================================
    // 22. MODAL & TOAST UTILITIES
    // ====================================================================

    openModal(title, contentHtml, buttons = []) {
      document.getElementById('modal-title-text').textContent = title;
      document.getElementById('modal-body-content').innerHTML = contentHtml;

      const footer = document.getElementById('modal-footer-actions');
      footer.innerHTML = '';

      buttons.forEach(btn => {
        const b = document.createElement('button');
        b.className = `btn ${btn.class || 'btn-outline'} btn-sm`;
        if (btn.id) b.id = btn.id;
        b.textContent = btn.label;
        b.onclick = btn.action;
        footer.appendChild(b);
      });

      document.getElementById('app-modal').classList.add('active');
    },

    closeModal() {
      document.getElementById('app-modal').classList.remove('active');
    },

    showToast(message, type = 'info') {
      const container = document.getElementById('toast-container');
      const toast = document.createElement('div');
      toast.className = `toast toast-${type}`;
      const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';
      toast.innerHTML = `<span>${icon}</span> <span>${this.escapeHtml(message)}</span>`;
      container.appendChild(toast);

      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 250);
      }, 3500);
    },

    // Helper syntax highlighter for SQL display
    highlightSql(sql) {
      if (!sql) return '';
      const keywords = ['SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'GROUP BY', 'HAVING', 'ORDER BY', 'LIMIT', 'JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN', 'FULL JOIN', 'CROSS JOIN', 'ON', 'AS', 'WITH', 'UNION', 'ALL', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'TABLE', 'VIEW', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'IN', 'IS', 'NULL', 'LIKE', 'RLIKE', 'TRUE', 'FALSE', 'INTERVAL', 'CURRENT_DATE', 'CURRENT_TIMESTAMP'];
      
      let escaped = this.escapeHtml(sql);

      // comments
      escaped = escaped.replace(/(--[^\n\r]*)/g, '<span class="sql-token-comment">$1</span>');

      // strings
      escaped = escaped.replace(/('(?:''|[^'])*')/g, '<span class="sql-token-string">$1</span>');

      // numbers
      escaped = escaped.replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="sql-token-number">$1</span>');

      // keywords
      keywords.forEach(kw => {
        const reg = new RegExp(`\\b(${kw})\\b`, 'gi');
        escaped = escaped.replace(reg, '<span class="sql-token-keyword">$1</span>');
      });

      return escaped;
    },

    getStatusBadge(status) {
      switch (status) {
        case 'Approved':
        case 'PASSED':
          return `<span class="badge badge-passed">${status}</span>`;
        case 'FAILED':
        case 'Rejected':
          return `<span class="badge badge-failed">${status}</span>`;
        case 'WARNING':
        case 'Changes Requested':
          return `<span class="badge badge-warning">${status}</span>`;
        case 'In Review':
          return `<span class="badge badge-info">${status}</span>`;
        case 'Archived':
          return `<span class="badge badge-status-archived">${status}</span>`;
        default:
          return `<span class="badge badge-status-draft">${status || 'Draft'}</span>`;
      }
    },

    getSeverityBadge(sev) {
      switch (sev) {
        case 'Critical': return `<span class="badge badge-critical">Critical</span>`;
        case 'High': return `<span class="badge badge-high">High</span>`;
        case 'Medium': return `<span class="badge badge-medium">Medium</span>`;
        case 'Low': return `<span class="badge badge-low">Low</span>`;
        default: return `<span class="badge badge-info">${sev || 'Info'}</span>`;
      }
    },

    escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    },

    downloadJson(obj, filename) {
      const json = JSON.stringify(obj, null, 2);
      this.downloadBlob(new Blob([json], { type: 'application/json' }), filename);
    },

    downloadBlob(blob, filename) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
    }
  };

  // Expose to window and run on DOMContentLoaded
  window.DQD_App = DQD;
  document.addEventListener('DOMContentLoaded', () => DQD.init());

})();
