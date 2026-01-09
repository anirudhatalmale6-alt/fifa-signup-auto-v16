# Testing Guide - Multilogin 6 Proxy Toggle Extension

## Quick Start Testing

### Step 1: Create Icon Files (Required)

The extension **will not load** without icon files. You have two options:

#### Option A: Quick Placeholder Icons (Fastest)
1. Create any 3 PNG images (even a solid color square works)
2. Name them: `icon16.png`, `icon48.png`, `icon128.png`
3. Place them in the `icons/` folder
4. Sizes: 16x16, 48x48, 128x128 pixels

**Quick method**: Use any image editor or online tool:
- Go to https://www.favicon-generator.org/
- Upload any image or create text "P"
- Download and rename the files

#### Option B: Skip Icons Temporarily (For Testing Only)
If you want to test quickly, you can temporarily modify `manifest.json`:
- Comment out the icon references (but this is not recommended)

### Step 2: Load Extension in Chrome

1. **Open Chrome Extensions Page**
   - Type in address bar: `chrome://extensions/`
   - OR: Menu → More Tools → Extensions

2. **Enable Developer Mode**
   - Toggle switch in top-right corner: "Developer mode"

3. **Load Unpacked Extension**
   - Click "Load unpacked" button
   - Navigate to: `D:\Proxy-extenion`
   - Select the folder and click "Select Folder"

4. **Verify Extension Loaded**
   - Extension should appear in the list
   - Icon should appear in Chrome toolbar (puzzle piece icon area)
   - If you see errors, check the console (click "Errors" or "Service worker")

### Step 3: Pin Extension to Toolbar

1. Click the puzzle piece icon (extensions icon) in Chrome toolbar
2. Find "Multilogin 6 Proxy Toggle"
3. Click the pin icon 📌 to keep it visible

### Step 4: Test Basic Functionality

#### Test 1: Open Popup
- Click the extension icon in toolbar
- Popup should open showing:
  - Header: "Proxy Control"
  - Status indicator (dot + text)
  - Three buttons: Direct Connection, Multilogin Proxy
  - Custom proxy input field

#### Test 2: Check Initial State
- Badge should show "PRX" (blue) = Multilogin Proxy mode
- Status text should say "Multilogin Proxy"
- "Multilogin Proxy" button should be highlighted (active)

#### Test 3: Test Direct Connection
1. Click "Direct Connection" button
2. **Expected Results:**
   - Badge changes to "DIR" (red)
   - Status text changes to "Direct Connection"
   - "Direct Connection" button becomes active (highlighted)
   - Success message appears briefly
   - Your internet should now bypass proxy

#### Test 4: Test Multilogin Proxy Restore
1. Click "Multilogin Proxy" button
2. **Expected Results:**
   - Badge changes to "PRX" (blue)
   - Status text changes to "Multilogin Proxy"
   - "Multilogin Proxy" button becomes active
   - Multilogin profile proxy should be restored

#### Test 5: Test Custom Proxy (Without Auth)
1. Enter proxy in format: `proxy.example.com:8080`
2. Click "Use Custom Proxy"
3. **Expected Results:**
   - Badge changes to "CST" (green)
   - Status text changes to "Custom Proxy Active"
   - "Use Custom Proxy" button becomes active
   - Input field retains the proxy string

#### Test 6: Test Custom Proxy (With Auth)
1. Enter proxy in format: `proxy.example.com:8080:username:password`
2. Click "Use Custom Proxy"
3. **Expected Results:**
   - Same as Test 5
   - Chrome may prompt for authentication when accessing sites

#### Test 7: Test Input Validation
1. Try invalid formats:
   - Empty input → Should show error
   - `invalid` → Should show error (missing port)
   - `host:99999` → Should show error (invalid port)
2. **Expected Results:**
   - Error messages appear
   - Input field gets focus
   - Proxy doesn't change

#### Test 8: Test State Persistence
1. Set to "Direct Connection"
2. Close Chrome completely
3. Reopen Chrome
4. Click extension icon
5. **Expected Results:**
   - Should still be in "Direct Connection" mode
   - Badge shows "DIR"
   - Settings persisted

### Step 5: Test in Multilogin 6 Environment

1. **Launch Multilogin 6 Profile**
   - Open Multilogin 6
   - Launch a profile with proxy configured
   - Chrome instance should open

2. **Load Extension in Multilogin Profile**
   - Follow Step 2 above in the Multilogin Chrome instance
   - Extension should work the same way

3. **Test Proxy Switching**
   - Click "Direct Connection" → Check if checkout works
   - Click "Multilogin Proxy" → Check if profile proxy restored
   - Verify network traffic routing

### Step 6: Debug if Issues Occur

#### Check Service Worker Console
1. Go to `chrome://extensions/`
2. Find your extension
3. Click "Service worker" (or "background page")
4. Check console for errors

#### Check Popup Console
1. Right-click extension icon → "Inspect popup"
2. Check Console tab for errors

#### Common Issues:

**Extension won't load:**
- Missing icon files → Create icons
- Syntax error → Check service worker console
- Missing permissions → Check manifest.json

**Proxy not switching:**
- Check service worker console for errors
- Verify proxy permissions granted
- Try reloading extension

**Badge not updating:**
- Check if badge text/color functions are called
- Verify chrome.action API available

**State not persisting:**
- Check chrome.storage in DevTools
- Verify storage permission granted

## Testing Checklist

- [ ] Extension loads without errors
- [ ] Icon appears in toolbar
- [ ] Popup opens correctly
- [ ] Initial state shows "PRX" badge
- [ ] Direct Connection button works
- [ ] Multilogin Proxy button works
- [ ] Custom proxy input accepts format
- [ ] Custom proxy applies correctly
- [ ] Badge updates correctly (DIR/PRX/CST)
- [ ] Status indicators update
- [ ] Error messages show for invalid input
- [ ] Settings persist after browser restart
- [ ] Works in Multilogin 6 profile

## Quick Test Commands

### Check Extension Status
```
chrome://extensions/
```

### View Service Worker Console
```
chrome://extensions/ → Your Extension → Service worker
```

### View Storage
```
chrome://extensions/ → Your Extension → Service worker → Application tab → Storage → Local Storage
```

## Expected Behavior Summary

| Action | Badge | Status Text | Button Active |
|--------|-------|-------------|---------------|
| Initial Load | PRX (blue) | Multilogin Proxy | Multilogin Proxy |
| Click Direct | DIR (red) | Direct Connection | Direct Connection |
| Click Multilogin | PRX (blue) | Multilogin Proxy | Multilogin Proxy |
| Custom Proxy | CST (green) | Custom Proxy Active | Use Custom Proxy |

---

**Ready to test!** Follow the steps above and verify each functionality works as expected.

