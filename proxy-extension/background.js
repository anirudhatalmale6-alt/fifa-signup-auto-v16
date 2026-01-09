// Proxy Switcher - Press Alt+Q to switch to random proxy
// Edit proxies.json to add your proxies

let PROXIES = [];
let currentProxyAuth = null;

// Load proxies from proxies.json
async function loadProxies() {
    try {
        const response = await fetch(chrome.runtime.getURL('proxies.json'));
        PROXIES = await response.json();
        console.log('[Proxy] Loaded', PROXIES.length, 'proxies');
    } catch (error) {
        console.error('[Proxy] Error loading proxies.json:', error);
        PROXIES = [];
    }
}

// Load proxies on startup
loadProxies();

// Listen for Alt+Q
chrome.commands.onCommand.addListener(async (command) => {
    if (command === 'switch-proxy') {
        // Reload proxies in case file was edited
        await loadProxies();
        await switchToRandomProxy();
    }
});

// Switch to random proxy
async function switchToRandomProxy() {
    try {
        if (PROXIES.length === 0) {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab) {
                chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    func: () => { alert('No proxies found!\\n\\nEdit proxies.json to add your proxies.'); }
                });
            }
            return;
        }

        // Pick random proxy
        const randomIndex = Math.floor(Math.random() * PROXIES.length);
        const proxyString = PROXIES[randomIndex];
        const parts = proxyString.trim().split(':');

        if (parts.length < 2) {
            console.error('[Proxy] Invalid format:', proxyString);
            return;
        }

        const host = parts[0];
        const port = parseInt(parts[1]);
        const username = parts[2] || null;
        const password = parts[3] || null;

        console.log('[Proxy] Switching to:', host, port);

        // Store auth credentials FIRST
        if (username && password) {
            currentProxyAuth = { username, password };
        } else {
            currentProxyAuth = null;
        }

        // Set proxy
        await new Promise((resolve, reject) => {
            chrome.proxy.settings.set({
                value: {
                    mode: 'fixed_servers',
                    rules: {
                        singleProxy: {
                            scheme: 'http',
                            host: host,
                            port: port
                        }
                    }
                },
                scope: 'regular'
            }, () => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve();
                }
            });
        });

        console.log('[Proxy] ✅ Switched successfully');

    } catch (error) {
        console.error('[Proxy] Error:', error);
    }
}

// Handle proxy authentication - BLOCKING mode
chrome.webRequest.onAuthRequired.addListener(
    function(details) {
        if (details.isProxy && currentProxyAuth) {
            console.log('[Proxy] Providing auth for:', currentProxyAuth.username);
            return {
                authCredentials: {
                    username: currentProxyAuth.username,
                    password: currentProxyAuth.password
                }
            };
        }
        return {};
    },
    { urls: ['<all_urls>'] },
    ['blocking']
);

console.log('[Proxy] Extension loaded. Press Alt+Q to switch proxy!');
