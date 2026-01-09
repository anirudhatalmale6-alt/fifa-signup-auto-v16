# Multilogin 6 Proxy Toggle Extension

A Chrome Extension (Manifest V3) that provides one-click proxy control for Multilogin 6 profiles. Easily switch between direct connection, Multilogin default proxy, and custom HTTP proxies.

## Features

- **One-Click Proxy Toggle**: Switch between proxy modes instantly from the toolbar
- **Direct Connection**: Bypass proxy for direct internet connection
- **Multilogin Proxy**: Restore default Multilogin profile proxy settings
- **Custom HTTP Proxy**: Use custom proxy with format `host:port:user:pass`
- **State Persistence**: Remembers your proxy settings across sessions
- **Visual Status Indicator**: Badge shows current proxy mode (DIR/PRX/CST)

## Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select this extension directory
5. The extension icon will appear in your toolbar

## Usage

### Switching Proxy Modes

1. Click the extension icon in your toolbar
2. Choose one of three options:
   - **Direct Connection**: Click "Direct Connection" button to bypass proxy
   - **Multilogin Proxy**: Click "Multilogin Proxy" button to use default profile proxy
   - **Custom Proxy**: Enter proxy details in format `host:port:user:pass` and click "Use Custom Proxy"

### Proxy Format

For custom proxies, use the format:
```
host:port:user:pass
```

Examples:
- `proxy.example.com:8080:username:password`
- `192.168.1.1:3128:user:pass`
- `proxy.com:8080` (no auth)

### Authenticated Proxies

**Important:** For proxies with authentication (username/password), Chrome will show a popup asking for credentials. When you see the authentication prompt:
1. Enter the username from your proxy string
2. Enter the password from your proxy string
3. Click OK

This is a Chrome/Manifest V3 limitation - extensions cannot automatically provide proxy credentials. The extension sets the proxy correctly, but Chrome requires manual credential entry for authenticated proxies.

### Status Indicators

The extension badge shows current mode:
- **DIR** (red) = Direct connection
- **PRX** (blue) = Multilogin proxy
- **CST** (green) = Custom proxy

## Requirements

- Chrome/Chromium browser (Manifest V3 compatible)
- Multilogin 6 profile environment
- Proxy permissions granted

## Technical Details

- **Manifest Version**: 3
- **Permissions**: `proxy`, `storage`, `tabs`
- **Background**: Service worker for proxy management
- **Storage**: Chrome local storage for state persistence

## Troubleshooting

### Proxy not switching
- Ensure the extension has proper permissions
- Check that you're using a Multilogin 6 profile
- Verify proxy format is correct (host:port:user:pass)

### Extension not loading
- Verify Developer mode is enabled
- Check browser console for errors
- Ensure all files are present in the extension directory

## Development

### File Structure
```
.
├── manifest.json      # Extension manifest
├── background.js      # Service worker for proxy management
├── popup.html         # Popup UI
├── popup.css          # Popup styles
├── popup.js           # Popup logic
├── icons/             # Extension icons
└── README.md          # This file
```

### Building Icons

You'll need to create three icon sizes:
- `icons/icon16.png` (16x16)
- `icons/icon48.png` (48x48)
- `icons/icon128.png` (128x128)

You can use any image editor or online icon generator. The icons should represent a proxy/network connection.

## License

Built for Multilogin 6 integration.

