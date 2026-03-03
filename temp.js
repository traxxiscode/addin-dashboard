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