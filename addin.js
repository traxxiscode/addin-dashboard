/**
 * Traxxis Add-in Suite Dashboard
 * @returns {{initialize: Function, focus: Function, blur: Function}}
 */
geotab.addin.traxxisDashboard = function () {
    'use strict';

    let api, state, elAddin;
    let currentDatabase = null;

    // ── Add-in Registry ────────────────────────────────────────────────────────
    // Add new add-ins here. 'url' points to the GitHub Pages hosted add-in.
    const ADDIN_REGISTRY = [
        {
            id: 'hos_alerter',
            name: 'HOS Availability Alert Emailer',
            description: 'Automated Hours-of-Service limit notifications. Alerts recipients when drivers are approaching their driving, duty, rest, or weekly cycle limits.',
            icon: 'fas fa-clock',
            url: 'https://YOUR_ORG.github.io/hos-alerter/',  // ← replace with real URL
            category: 'Compliance'
        }
        // Future add-ins go here:
        // { id: 'dvir_emailer', name: 'DVIR Emailer', ... }
    ];

    // ── Database Access Control ────────────────────────────────────────────────
    // Map each database name to the add-in IDs it's allowed to access.
    // Databases not listed here will see all add-ins greyed out.
    const DATABASE_ACCESS = {
        'traxxisdemo': ['hos_alerter'],
        // 'another_db': ['hos_alerter', 'dvir_emailer'],
    };

    // ── Helpers ────────────────────────────────────────────────────────────────

    function getAllowedAddins(database) {
        return DATABASE_ACCESS[database] || [];
    }

    function hideInitialLoading() {
        const el = document.getElementById('initialLoadingOverlay');
        if (el) el.style.display = 'none';
    }

    function showInitialLoading() {
        const el = document.getElementById('initialLoadingOverlay');
        if (el) el.style.display = 'flex';
    }

    // ── Render ─────────────────────────────────────────────────────────────────

    function renderDashboard(database) {
        const grid = document.getElementById('addinsGrid');
        const banner = document.getElementById('accessDeniedBanner');
        const msg = document.getElementById('accessDeniedMsg');
        if (!grid) return;

        const allowed = getAllowedAddins(database);

        if (allowed.length === 0 && !DATABASE_ACCESS[database]) {
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

    // ── Global launcher (called from inline onclick) ───────────────────────────

    window.traxxisDashboard_launch = function (addinId) {
        const addin = ADDIN_REGISTRY.find(a => a.id === addinId);
        if (!addin) return;

        const allowed = getAllowedAddins(currentDatabase);
        if (!allowed.includes(addinId)) return;

        document.getElementById('dashboardView').style.display = 'none';
        const iframeView = document.getElementById('iframeView');
        iframeView.style.display = 'flex';
        document.getElementById('iframeTitle').textContent = addin.name;
        document.getElementById('addinFrame').src = addin.url;
    };

    window.traxxisDashboard_back = function () {
        document.getElementById('iframeView').style.display = 'none';
        document.getElementById('addinFrame').src = '';
        document.getElementById('dashboardView').style.display = 'block';
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
            if (elAddin) elAddin.style.display = 'none';
            // Reset iframe when leaving
            const frame = document.getElementById('addinFrame');
            if (frame) frame.src = '';
            document.getElementById('iframeView').style.display = 'none';
            document.getElementById('dashboardView').style.display = 'block';
        }
    };
};