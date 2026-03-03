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

    // ── Add-in Registry ────────────────────────────────────────────────────────
    // Each add-in points to its raw hosted files on GitHub Pages.
    const ADDIN_REGISTRY = [
        {
            id: 'hos_alerter',
            name: 'HOS Availability Alert Emailer',
            description: 'Automated Hours-of-Service limit notifications. Alerts recipients when drivers are approaching their driving, duty, rest, or weekly cycle limits.',
            icon: 'fas fa-clock',
            category: 'Compliance',
            geotabKey: 'hosAlerter',                          // matches geotab.addin.hosAlerter
            rootElementId: 'hosAlerter',                      // the id on the add-in's root div
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
        }
        // Future add-ins:
        // { id: 'dvir_emailer', name: 'DVIR Emailer', geotabKey: 'dvirEmailer', rootElementId: 'dvirEmailer', ... }
    ];

    // ── Database Access Control ────────────────────────────────────────────────
    const DATABASE_ACCESS = {
        'traxxisdemo': ['hos_alerter', 'device_manager'],
        // 'another_db': ['hos_alerter', 'dvir_emailer'],
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

    // ── Cleanup previously injected add-in assets ──────────────────────────────

    function cleanupActiveAddin() {
        if (activeAddin && typeof activeAddin.blur === 'function') {
            try { activeAddin.blur(); } catch (e) { console.warn('blur() error:', e); }
        }
        activeAddin = null;

        // Delete all active Firebase app instances so the next add-in can
        // call initializeApp() cleanly without "duplicate app" or "no app" errors.
        // We keep the Firebase SDK scripts in the DOM (they set window.firebase once),
        // but we must delete the app so initializeApp() can be called again.
        try {
            if (window.firebase && window.firebase.apps && window.firebase.apps.length > 0) {
                window.firebase.apps.slice().forEach(app => {
                    app.delete().catch(e => console.warn('Firebase app.delete() error:', e));
                });
            }
        } catch (e) {
            console.warn('Firebase cleanup error:', e);
        }

        // Remove injected <link> tags
        injectedStyles.forEach(el => { if (el && el.parentNode) el.parentNode.removeChild(el); });
        injectedStyles = [];

        // Remove only non-Firebase scripts; keep Firebase SDK scripts since they are
        // already loaded into window.firebase and cannot be re-declared.
        injectedScripts = injectedScripts.filter(el => {
            const src = el.src || '';
            const isFirebaseSDK = src.includes('firebase');
            if (!isFirebaseSDK && el.parentNode) {
                el.parentNode.removeChild(el);
                return false;
            }
            return true; // keep Firebase SDK scripts in the DOM
        });

        const container = document.getElementById('addinMountContainer');
        if (container) container.innerHTML = '';
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

        // Extract and execute all <script> tags from the fetched page,
        // skipping any that are the add-in's own JS (already loaded separately)
        // and skipping Bootstrap which is already on the page
        const scripts = Array.from(doc.querySelectorAll('script'));
        for (const script of scripts) {
            const src = script.src || '';
            if (src.includes('addin.js')) continue;          // loaded separately
            if (src.includes('bootstrap')) continue;         // already on page
            if (src.includes('font-awesome')) continue;      // already on page

            await new Promise((resolve, reject) => {
                if (script.src) {
                    // External script — always skip Firebase SDK if already loaded into window.firebase
                    const isFirebaseSDK = script.src.includes('firebase');
                    if (isFirebaseSDK && window.firebase) {
                        resolve(); return;
                    }
                    // Skip other already-loaded non-Firebase scripts too
                    if (!isFirebaseSDK && document.querySelector(`script[src="${script.src}"]`)) {
                        resolve(); return;
                    }
                    const el = document.createElement('script');
                    el.src = script.src;
                    el.onload = resolve;
                    el.onerror = reject;
                    document.head.appendChild(el);
                    injectedScripts.push(el);
                } else if (script.textContent.trim()) {
                    // Replace const/let declarations with var so that re-running the same
                    // inline script (e.g. firebaseConfig) on a second add-in load doesn't
                    // throw "Identifier already declared". var silently re-assigns instead.
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

        // Switch views
        document.getElementById('dashboardView').style.display = 'none';
        document.getElementById('suiteHeader').style.display = 'none';
        const addinView = document.getElementById('addinView');
        addinView.style.display = 'flex';

        showAddinLoading();
        cleanupActiveAddin();

        try {
            await fetchAndInjectHTML(addin);
            await injectCSS(addin.cssUrl);
            await injectJS(addin.jsUrl);

            if (!window.geotab || !window.geotab.addin || !window.geotab.addin[addin.geotabKey]) {
                throw new Error(`geotab.addin.${addin.geotabKey} not found after script load`);
            }

            const addinInstance = window.geotab.addin[addin.geotabKey]();
            activeAddin = addinInstance;

            await new Promise((resolve) => {
                addinInstance.initialize(api, state, resolve);
            });

            addinInstance.focus(api, state);
            hideAddinLoading();

        } catch (err) {
            console.error('Error launching add-in:', err);
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
        document.getElementById('suiteHeader').style.display = '';
        document.getElementById('addinView').style.display = 'none';
        document.getElementById('dashboardView').style.display = 'block';
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

        grid.innerHTML = ADDIN_REGISTRY.map(addin => {
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

    window.traxxisDashboard_launch = function (addinId) {
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
                const dbEl = document.getElementById('headerDatabaseName');
                if (dbEl) dbEl.textContent = currentDatabase;
                renderDashboard(currentDatabase);
                hideInitialLoading();
            });
        },

        blur: function () {
            cleanupActiveAddin();
            if (elAddin) elAddin.style.display = 'none';
            // Reset views for next focus
            document.getElementById('addinView').style.display = 'none';
            document.getElementById('dashboardView').style.display = 'block';
        }
    };
};