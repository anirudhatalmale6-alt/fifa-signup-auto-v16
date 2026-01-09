# Setup Instructions

## Quick Start

1. **Create Icons** (Required before loading extension)
   - Create three PNG images:
     - `icons/icon16.png` (16x16 pixels)
     - `icons/icon48.png` (48x48 pixels)  
     - `icons/icon128.png` (128x128 pixels)
   - You can use any simple icon/image - even a colored square works for testing
   - Online tools: https://www.favicon-generator.org/ or any image editor

2. **Load Extension in Chrome**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right corner)
   - Click "Load unpacked"
   - Select this extension folder (`D:\Proxy-extenion`)
   - The extension should now appear in your extensions list

3. **Pin Extension to Toolbar**
   - Click the puzzle piece icon in Chrome toolbar
   - Find "Multilogin 6 Proxy Toggle"
   - Click the pin icon to keep it visible

4. **Test the Extension**
   - Click the extension icon
   - Try switching between modes:
     - Click "Direct Connection" to bypass proxy
     - Click "Multilogin Proxy" to restore default
     - Enter a custom proxy (e.g., `proxy.example.com:8080:user:pass`) and click "Use Custom Proxy"

## Important Notes

### Proxy Authentication
- For HTTP proxies with authentication, Chrome may prompt for credentials
- The extension routes traffic through the proxy, but authentication is handled by Chrome's built-in mechanisms
- If your proxy requires authentication, Chrome will show a login prompt when needed

### Multilogin 6 Compatibility
- This extension is designed to work with Multilogin 6 profiles
- When you click "Multilogin Proxy", it clears the extension's proxy override and restores the profile's default proxy settings
- The extension starts in "Proxy" mode by default (Multilogin's default state)

### Troubleshooting

**Extension won't load:**
- Ensure all files are present (manifest.json, background.js, popup.html, popup.css, popup.js)
- Check that icon files exist in the `icons/` folder
- Look for errors in `chrome://extensions/` developer console

**Proxy not switching:**
- Check browser console (F12) for errors
- Verify you have proper permissions
- Try reloading the extension

**Custom proxy not working:**
- Verify format: `host:port:user:pass`
- Check that port is valid (1-65535)
- Ensure proxy server is accessible

## File Structure

```
Proxy-extenion/
├── manifest.json          # Extension configuration
├── background.js          # Service worker (proxy logic)
├── popup.html             # Popup UI
├── popup.css              # Popup styles
├── popup.js               # Popup logic
├── icons/                 # Extension icons (you need to create these)
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── README.md              # Documentation
├── SETUP.md               # This file
└── .gitignore            # Git ignore rules
```

## Testing Checklist

- [ ] Extension loads without errors
- [ ] Icon appears in toolbar
- [ ] Popup opens when clicking icon
- [ ] "Direct Connection" button works
- [ ] "Multilogin Proxy" button works  
- [ ] Custom proxy input accepts format `host:port:user:pass`
- [ ] Custom proxy button applies settings
- [ ] Badge shows correct status (DIR/PRX/CST)
- [ ] Settings persist after browser restart

