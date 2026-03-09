/**
 * Traxxis Add-in Suite Dashboard
 * @returns {{initialize: Function, focus: Function, blur: Function}}
 */
geotab.addin.traxxisDashboard = function () {
    'use strict';

    let api, state, elAddin;
    let currentDatabase = null;
    let injectedStyles = [];
    let injectedScripts = [];
    let activeAddin = null;
    let activeAddinId = null;
    let activeFilter = 'All';

    // ── Add-in Registry ────────────────────────────────────────────────────────
    const ADDIN_REGISTRY = [
        {
            id: 'hos_alerter',
            name: 'HOS Availability Alert Emailer',
            description: 'Automated Hours-of-Service limit notifications. Alerts recipients when drivers are approaching their driving, duty, rest, or weekly cycle limits.',
            icon: 'fas fa-clock',
            category: 'Compliance',
            geotabKey: 'hosAlerter',
            rootElementId: 'hosAlerter',
            baseUrl: 'https://traxxiscode.github.io/hos-alerter-frontend/',
            htmlUrl: 'https://traxxiscode.github.io/hos-alerter-frontend/index.html',
            jsUrl:   'https://traxxiscode.github.io/hos-alerter-frontend/addin.js',
            cssUrl:  'https://traxxiscode.github.io/hos-alerter-frontend/addin.css'
        },
        {
            id: 'device_manager',
            name: 'Digital Matter Device Manager',
            description: 'Manage and configure your Digital Matter devices directly from MyGeotab.',
            icon: 'fas fa-cogs',
            category: 'Device Management',
            geotabKey: 'digitalMatterDeviceManager',
            rootElementId: 'digitalMatterDeviceManager',
            baseUrl: 'https://traxxiscode.github.io/DigitalMatter-DeviceManager/public/',
            htmlUrl: 'https://traxxiscode.github.io/DigitalMatter-DeviceManager/public/index.html',
            jsUrl:   'https://traxxiscode.github.io/DigitalMatter-DeviceManager/public/addin.js',
            cssUrl:  'https://traxxiscode.github.io/DigitalMatter-DeviceManager/public/addin.css'
        },
        {
            id: 'dvir_emailer',
            name: 'DVIR Emailer',
            description: 'Automated DVIR email reports.',
            icon: 'fas fa-envelope',
            category: 'Compliance',
            geotabKey: 'dvirEmailer',
            rootElementId: 'dvirEmailer',
            baseUrl: 'https://traxxiscode.github.io/dvir-emailer-frontend/',
            htmlUrl: 'https://traxxiscode.github.io/dvir-emailer-frontend/index.html',
            jsUrl:   'https://traxxiscode.github.io/dvir-emailer-frontend/addin.js',
            cssUrl:  'https://traxxiscode.github.io/dvir-emailer-frontend/addin.css'
        },
        {
            id: 'ruckit_assets',
            name: 'Ruckit Assets',
            description: 'Manage and track your Ruckit assets.',
            icon: 'fas fa-box',
            category: 'Asset Management',
            geotabKey: 'ruckitAssets',
            rootElementId: 'ruckitAssets',
            baseUrl: 'https://traxxiscode.github.io/ruckit-integration-frontend/',
            htmlUrl: 'https://traxxiscode.github.io/ruckit-integration-frontend/index.html',
            jsUrl:   'https://traxxiscode.github.io/ruckit-integration-frontend/addin.js',
            cssUrl:  'https://traxxiscode.github.io/ruckit-integration-frontend/addin.css'
        },
        {
            id: 'terminal_report_zone_manager',
            name: 'Terminal Report Zone Manager',
            description: 'Manage geofenced zones for terminal reporting.',
            icon: 'fas fa-map-marker-alt',
            category: 'Zone Management',
            geotabKey: 'terminalReportZones',
            rootElementId: 'terminalReportZones',
            baseUrl: 'https://traxxiscode.github.io/terminal-zone-manager-frontend/',
            htmlUrl: 'https://traxxiscode.github.io/terminal-zone-manager-frontend/index.html',
            jsUrl:   'https://traxxiscode.github.io/terminal-zone-manager-frontend/addin.js',
            cssUrl:  'https://traxxiscode.github.io/terminal-zone-manager-frontend/addin.css'
        },
        {
            id: 'yard_move_zone_manager',
            name: 'Yard Move Zone Manager',
            description: 'Manage geofenced zones for yard move detection.',
            icon: 'fas fa-map-marker-alt',
            category: 'Zone Management',
            geotabKey: 'yardMoveZones',
            rootElementId: 'yardMoveZones',
            baseUrl: 'https://traxxiscode.github.io/YMAnnotator-frontend/',
            htmlUrl: 'https://traxxiscode.github.io/YMAnnotator-frontend/index.html',
            jsUrl:   'https://traxxiscode.github.io/YMAnnotator-frontend/addin.js',
            cssUrl:  'https://traxxiscode.github.io/YMAnnotator-frontend/addin.css'
        }
    ];

    // ── Database Access Control ────────────────────────────────────────────────
    const DATABASE_ACCESS = {
        'traxxisdemo': ['hos_alerter', 'device_manager', 'dvir_emailer', 'ruckit_assets', 'terminal_report_zone_manager', 'yard_move_zone_manager'],
        'spartancarrier': ['hos_alerter', 'device_manager'],
        'corriganoil': ['yard_move_zone_manager', 'dvir_emailer'],
        'gtithurman': ['ruckit_assets', 'yard_move_zone_manager'],
        'regendiesel': ['device_manager'],
        'decimacorp': ['device_manager'],
        'pavlovmedia': ['device_manager'],
        'rnwbl': ['device_manager'],
        'dataone': ['device_manager'],
        'pumpman': ['device_manager'],
        'erling_sales_and_service': ['device_manager'],
        'cressydoor': ['device_manager'],
        'bigcityleasing': ['device_manager'],
        'foothillsconstruction': ['device_manager'],
        'reynolds_fence': ['device_manager'],
        'casttrans': ['device_manager'],
        'jbltransport': ['device_manager'],
        'howardsmechanical': ['device_manager'],
        'hdxutility': ['device_manager'],
        'vastrut': ['device_manager']
    };

    // ── Helpers ────────────────────────────────────────────────────────────────

    function getAllowedAddins(database) {
        return DATABASE_ACCESS[database] || [];
    }

    function hideInitialLoading() {
        const el = document.getElementById('suiteLoadingOverlay');
        if (el) el.style.display = 'none';
    }

    function showInitialLoading() {
        const el = document.getElementById('suiteLoadingOverlay');
        if (el) el.style.display = 'flex';
    }

    function showAddinLoading() {
        const el = document.getElementById('addinLoadingOverlay');
        if (el) el.style.display = 'flex';
    }

    function hideAddinLoading() {
        const el = document.getElementById('addinLoadingOverlay');
        if (el) el.style.display = 'none';
    }

    // ── Header: show/hide back button ─────────────────────────────────────────

    function showBackButton() {
        const btn = document.getElementById('backBtn');
        if (btn) btn.style.visibility = 'visible';
    }

    function hideBackButton() {
        const btn = document.getElementById('backBtn');
        if (btn) btn.style.visibility = 'hidden';
    }

    // ── Header: tab strip ─────────────────────────────────────────────────────

    function renderTabStrip(allowedIds, activeId) {
        const strip = document.getElementById('suiteTabStrip');
        if (!strip) return;

        const allowedAddins = ADDIN_REGISTRY.filter(a => allowedIds.includes(a.id));
        strip.innerHTML = allowedAddins.map(addin => `
            <button
                class="suite-tab ${addin.id === activeId ? 'suite-tab--active' : ''}"
                id="tab-${addin.id}"
                onclick="traxxisDashboard_launch('${addin.id}')">
                <i class="${addin.icon}"></i>
                <span>${addin.name}</span>
            </button>
        `).join('');
        strip.style.display = 'flex';
    }

    function hideTabStrip() {
        const strip = document.getElementById('suiteTabStrip');
        if (strip) strip.style.display = 'none';
    }

    function setActiveTab(addinId) {
        document.querySelectorAll('.suite-tab').forEach(tab => {
            tab.classList.toggle('suite-tab--active', tab.id === 'tab-' + addinId);
        });
    }

    // ── Header: actions slot ──────────────────────────────────────────────────

    function clearActionsSlot() {
        const slot = document.getElementById('headerActionsSlot');
        if (slot) slot.innerHTML = '';
    }

    // Moves action buttons from the add-in's [data-suite-actions] holder into
    // the suite header slot. The holder stays hidden in the DOM so the add-in's
    // JS can still reference its buttons by id without any changes.
    function hoistAddinHeader() {
        clearActionsSlot();
        const slot = document.getElementById('headerActionsSlot');
        if (!slot) return;

        const actionsHolder = document.querySelector('#addinMountContainer [data-suite-actions]');
        if (!actionsHolder) return;

        // Move each child button directly into the slot (not a clone) so that
        // any JS inside the add-in that touches e.g. refreshBtn by id still works.
        Array.from(actionsHolder.children).forEach(el => {
            slot.appendChild(el);
        });
    }

    // ── Cleanup previously injected add-in assets ──────────────────────────────

    async function cleanupActiveAddin() {
        if (activeAddin && typeof activeAddin.blur === 'function') {
            try { activeAddin.blur(); } catch (e) { console.warn('blur() error:', e); }
        }
        activeAddin = null;
        activeAddinId = null;

        try {
            if (window.firebase && window.firebase.apps && window.firebase.apps.length > 0) {
                await Promise.all(window.firebase.apps.slice().map(app => app.delete()));
            }
        } catch (e) {
            console.warn('Firebase cleanup error:', e);
        }

        injectedStyles.forEach(el => { if (el && el.parentNode) el.parentNode.removeChild(el); });
        injectedStyles = [];

        injectedScripts = injectedScripts.filter(el => {
            const src = el.src || '';
            const isFirebaseSDK = src.includes('firebase');
            if (!isFirebaseSDK && el.parentNode) {
                el.parentNode.removeChild(el);
                return false;
            }
            return true;
        });

        const container = document.getElementById('addinMountContainer');
        if (container) container.innerHTML = '';

        clearActionsSlot();
    }

    // ── Inject CSS ─────────────────────────────────────────────────────────────

    function injectCSS(url) {
        return new Promise((resolve, reject) => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = url + '?v=' + Date.now();
            link.onload = () => resolve(link);
            link.onerror = () => reject(new Error('Failed to load CSS: ' + url));
            document.head.appendChild(link);
            injectedStyles.push(link);
        });
    }

    // ── Inject JS ──────────────────────────────────────────────────────────────

    function injectJS(url) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = url + '?v=' + Date.now();
            script.onload = () => resolve(script);
            script.onerror = () => reject(new Error('Failed to load JS: ' + url));
            document.head.appendChild(script);
            injectedScripts.push(script);
        });
    }

    // ── Fetch & inject HTML ────────────────────────────────────────────────────

    async function fetchAndInjectHTML(addin) {
        const response = await fetch(addin.htmlUrl);
        if (!response.ok) throw new Error('Failed to fetch HTML: ' + addin.htmlUrl);
        const html = await response.text();

        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const rootEl = doc.getElementById(addin.rootElementId);
        if (!rootEl) throw new Error(`Root element #${addin.rootElementId} not found in fetched HTML`);

        rootEl.style.display = 'block';
        const container = document.getElementById('addinMountContainer');
        container.innerHTML = '';
        container.appendChild(rootEl);

        const scripts = Array.from(doc.querySelectorAll('script'));
        for (const script of scripts) {
            const src = script.src || '';
            if (src.includes('addin.js')) continue;
            if (src.includes('bootstrap')) continue;
            if (src.includes('font-awesome')) continue;

            await new Promise((resolve, reject) => {
                if (script.src) {
                    const normalizedSrc = script.src.split('?')[0];
                    const alreadyLoaded = Array.from(document.querySelectorAll('script[src]'))
                        .some(s => s.src.split('?')[0] === normalizedSrc);
                    if (alreadyLoaded) { resolve(); return; }
                    const el = document.createElement('script');
                    el.src = script.src;
                    el.onload = resolve;
                    el.onerror = reject;
                    document.head.appendChild(el);
                    injectedScripts.push(el);
                } else if (script.textContent.trim()) {
                    const el = document.createElement('script');
                    el.textContent = script.textContent
                        .replace(/\bconst\s+/g, 'var ')
                        .replace(/\blet\s+/g, 'var ');
                    document.head.appendChild(el);
                    injectedScripts.push(el);
                    resolve();
                } else {
                    resolve();
                }
            });
        }
    }

    // ── Launch an add-in ───────────────────────────────────────────────────────

    async function launchAddin(addinId) {
        const addin = ADDIN_REGISTRY.find(a => a.id === addinId);
        if (!addin) return;

        const allowed = getAllowedAddins(currentDatabase);
        if (!allowed.includes(addinId)) return;

        // If same add-in is already active, do nothing
        if (addinId === activeAddinId) return;

        // Switch to add-in view (first time only — keep it visible during tab switches)
        document.getElementById('dashboardView').style.display = 'none';
        document.getElementById('addinView').style.display = 'block';

        // Update tab strip highlight immediately
        setActiveTab(addinId);

        showAddinLoading();
        await cleanupActiveAddin();

        try {
            await fetchAndInjectHTML(addin);
            await injectCSS(addin.cssUrl);
            await injectJS(addin.jsUrl);

            if (!window.geotab || !window.geotab.addin || !window.geotab.addin[addin.geotabKey]) {
                throw new Error(`geotab.addin.${addin.geotabKey} not found after script load`);
            }

            const addinInstance = window.geotab.addin[addin.geotabKey]();
            activeAddin = addinInstance;
            activeAddinId = addinId;

            await new Promise((resolve) => {
                addinInstance.initialize(api, state, resolve);
            });

            addinInstance.focus(api, state);

            // Hoist add-in's action buttons into the suite header
            hoistAddinHeader();

            hideAddinLoading();

        } catch (err) {
            console.error('Error launching add-in:', err);
            activeAddinId = null;
            hideAddinLoading();
            const container = document.getElementById('addinMountContainer');
            container.innerHTML = `
                <div style="padding:2rem; text-align:center; color:#dc3545;">
                    <i class="fas fa-exclamation-triangle" style="font-size:2rem; margin-bottom:1rem;"></i>
                    <p style="font-weight:600;">Failed to load add-in</p>
                    <p style="font-size:0.875rem; color:#6c757d;">${err.message}</p>
                </div>
            `;
        }
    }

    // ── Go back to dashboard ───────────────────────────────────────────────────

    function goBack() {
        cleanupActiveAddin();
        hideBackButton();
        hideTabStrip();
        document.getElementById('addinView').style.display = 'none';
        document.getElementById('dashboardView').style.display = 'block';
    }

    // ── Render filter bubbles ──────────────────────────────────────────────────

    function renderFilterBubbles(allowed) {
        const container = document.getElementById('dashboardFilters');
        if (!container) return;

        const categories = ['All', ...Array.from(new Set(ADDIN_REGISTRY.map(a => a.category))).sort()];

        container.innerHTML = categories.map(cat => `
            <button
                class="filter-bubble ${cat === activeFilter ? 'filter-bubble--active' : ''}"
                onclick="traxxisDashboard_filter('${cat}')">
                ${cat}
            </button>
        `).join('');
    }

    // ── Render dashboard cards ─────────────────────────────────────────────────

    function renderDashboard(database) {
        const grid = document.getElementById('addinsGrid');
        const banner = document.getElementById('accessDeniedBanner');
        const msg = document.getElementById('accessDeniedMsg');
        if (!grid) return;

        const allowed = getAllowedAddins(database);

        if (!DATABASE_ACCESS[database]) {
            banner.style.display = 'flex';
            msg.textContent = `Database "${database}" does not have access to any add-ins. Please contact Traxxis GPS.`;
        } else {
            banner.style.display = 'none';
        }

        renderFilterBubbles(allowed);

        // Enabled first, then disabled — stable within each group
        const sorted = [
            ...ADDIN_REGISTRY.filter(a => allowed.includes(a.id)),
            ...ADDIN_REGISTRY.filter(a => !allowed.includes(a.id))
        ];

        // Apply category filter
        const filtered = activeFilter === 'All'
            ? sorted
            : sorted.filter(a => a.category === activeFilter);

        grid.innerHTML = filtered.map(addin => {
            const hasAccess = allowed.includes(addin.id);
            return `
                <div class="addin-card ${hasAccess ? 'addin-card--enabled' : 'addin-card--disabled'}">
                    <div class="addin-card__icon-wrap">
                        <i class="${addin.icon} addin-card__icon"></i>
                    </div>
                    <div class="addin-card__category">${addin.category}</div>
                    <h3 class="addin-card__name">${addin.name}</h3>
                    <p class="addin-card__desc">${addin.description}</p>
                    <div class="addin-card__footer">
                        ${hasAccess
                            ? `<button class="btn-launch" onclick="traxxisDashboard_launch('${addin.id}')">
                                    <i class="fas fa-arrow-right me-2"></i>Open
                               </button>`
                            : `<div class="addin-card__locked">
                                    <i class="fas fa-lock me-2"></i>Not Available
                               </div>`
                        }
                    </div>
                </div>
            `;
        }).join('');
    }

    // ── Global helpers (called from inline onclick) ────────────────────────────

    window.traxxisDashboard_filter = function (category) {
        activeFilter = category;
        renderDashboard(currentDatabase);
    };

    window.traxxisDashboard_launch = function (addinId) {
        const allowed = getAllowedAddins(currentDatabase);

        // First launch from dashboard: show back button + tab strip
        if (!activeAddinId) {
            showBackButton();
            renderTabStrip(allowed, addinId);
        }

        launchAddin(addinId);
    };

    window.traxxisDashboard_back = function () {
        goBack();
    };

    // ── Geotab lifecycle ───────────────────────────────────────────────────────

    return {
        initialize: function (freshApi, freshState, initializeCallback) {
            api = freshApi;
            state = freshState;
            elAddin = document.getElementById('traxxisDashboard');
            if (state.translate) state.translate(elAddin || '');
            initializeCallback();
        },

        focus: function (freshApi, freshState) {
            api = freshApi;
            state = freshState;

            showInitialLoading();
            if (elAddin) elAddin.style.display = 'block';

            api.getSession(function (session) {
                currentDatabase = session.database;
                renderDashboard(currentDatabase);
                hideInitialLoading();
            });
        },

        blur: function () {
            cleanupActiveAddin();
            hideBackButton();
            hideTabStrip();
            if (elAddin) elAddin.style.display = 'none';
            document.getElementById('addinView').style.display = 'none';
            document.getElementById('dashboardView').style.display = 'block';
        }
    };
};