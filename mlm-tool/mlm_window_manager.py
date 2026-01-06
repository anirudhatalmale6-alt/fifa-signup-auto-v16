"""
Multilogin Window Manager v1.0
A tool to manage Multilogin X browser profile windows.

Features:
- List all running Multilogin profiles
- Show current website/tab for each profile
- Show / Minimize / Close individual profiles
- Show All / Minimize All / Close All
- Open URL in all profile browsers
- Hotkeys support
- Always on top option
"""

import tkinter as tk
from tkinter import ttk, messagebox
import ctypes
from ctypes import wintypes
import subprocess
import json
import threading
import time
import re

# Windows API constants
SW_MINIMIZE = 6
SW_RESTORE = 9
SW_SHOW = 5
SW_HIDE = 0
GW_HWNDNEXT = 2
WM_CLOSE = 0x0010
PROCESS_QUERY_INFORMATION = 0x0400
PROCESS_VM_READ = 0x0010

# Load Windows DLLs
user32 = ctypes.windll.user32
kernel32 = ctypes.windll.kernel32
psapi = ctypes.windll.psapi

class MultiloginWindowManager:
    def __init__(self, root):
        self.root = root
        self.root.title("Multilogin Window Manager v1.0")
        self.root.geometry("500x600")
        self.root.resizable(True, True)

        # Profile data
        self.profiles = []
        self.selected_index = None

        # Create UI
        self.create_ui()

        # Start refresh thread
        self.running = True
        self.refresh_thread = threading.Thread(target=self.auto_refresh, daemon=True)
        self.refresh_thread.start()

        # Initial refresh
        self.refresh_profiles()

        # Bind hotkeys
        self.setup_hotkeys()

    def create_ui(self):
        # Top frame with tabs
        self.notebook = ttk.Notebook(self.root)
        self.notebook.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)

        # Main tab
        self.main_frame = ttk.Frame(self.notebook)
        self.notebook.add(self.main_frame, text="Main")

        # Settings tab
        self.settings_frame = ttk.Frame(self.notebook)
        self.notebook.add(self.settings_frame, text="Settings")

        # About tab
        self.about_frame = ttk.Frame(self.notebook)
        self.notebook.add(self.about_frame, text="About")

        # === Main Tab Content ===

        # Options frame
        options_frame = ttk.Frame(self.main_frame)
        options_frame.pack(fill=tk.X, padx=5, pady=5)

        self.hotkeys_var = tk.BooleanVar(value=True)
        self.hotkeys_cb = ttk.Checkbutton(options_frame, text="Hotkeys", variable=self.hotkeys_var)
        self.hotkeys_cb.pack(side=tk.LEFT, padx=5)

        self.ontop_var = tk.BooleanVar(value=False)
        self.ontop_cb = ttk.Checkbutton(options_frame, text="On top", variable=self.ontop_var,
                                         command=self.toggle_ontop)
        self.ontop_cb.pack(side=tk.LEFT, padx=5)

        # Navigation buttons
        nav_frame = ttk.Frame(self.main_frame)
        nav_frame.pack(fill=tk.X, padx=5, pady=5)

        ttk.Button(nav_frame, text="<<<", width=8, command=self.nav_prev).pack(side=tk.LEFT, padx=2)
        ttk.Button(nav_frame, text="TOP", width=8, command=self.nav_top).pack(side=tk.LEFT, padx=2)
        ttk.Button(nav_frame, text=">>>", width=8, command=self.nav_next).pack(side=tk.LEFT, padx=2)
        ttk.Button(nav_frame, text="Refresh", width=8, command=self.refresh_profiles).pack(side=tk.RIGHT, padx=2)

        # Profile list frame
        list_frame = ttk.Frame(self.main_frame)
        list_frame.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)

        # Treeview for profiles
        columns = ("profile", "tab")
        self.tree = ttk.Treeview(list_frame, columns=columns, show="headings", height=15)
        self.tree.heading("profile", text="Profile")
        self.tree.heading("tab", text="Tab")
        self.tree.column("profile", width=150)
        self.tree.column("tab", width=200)

        # Scrollbar
        scrollbar = ttk.Scrollbar(list_frame, orient=tk.VERTICAL, command=self.tree.yview)
        self.tree.configure(yscrollcommand=scrollbar.set)

        self.tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)

        # Bind selection
        self.tree.bind("<<TreeviewSelect>>", self.on_select)
        self.tree.bind("<Double-1>", self.on_double_click)

        # Single profile buttons
        single_frame = ttk.Frame(self.main_frame)
        single_frame.pack(fill=tk.X, padx=5, pady=5)

        ttk.Button(single_frame, text="Show", width=10, command=self.show_selected).pack(side=tk.LEFT, padx=2)
        ttk.Button(single_frame, text="Minimize", width=10, command=self.minimize_selected).pack(side=tk.LEFT, padx=2)
        ttk.Button(single_frame, text="RefreshTab", width=10, command=self.refresh_selected_tab).pack(side=tk.LEFT, padx=2)
        ttk.Button(single_frame, text="Close", width=10, command=self.close_selected).pack(side=tk.LEFT, padx=2)

        # All profiles buttons
        all_frame = ttk.Frame(self.main_frame)
        all_frame.pack(fill=tk.X, padx=5, pady=5)

        ttk.Button(all_frame, text="Show All", width=12, command=self.show_all).pack(side=tk.LEFT, padx=2)
        ttk.Button(all_frame, text="Minimize All", width=12, command=self.minimize_all).pack(side=tk.LEFT, padx=2)
        ttk.Button(all_frame, text="Close All", width=12, command=self.close_all).pack(side=tk.LEFT, padx=2)

        # URL input frame
        url_frame = ttk.LabelFrame(self.main_frame, text="Open URL in All Profiles")
        url_frame.pack(fill=tk.X, padx=5, pady=10)

        self.url_entry = ttk.Entry(url_frame, width=50)
        self.url_entry.pack(side=tk.LEFT, padx=5, pady=5, fill=tk.X, expand=True)
        self.url_entry.insert(0, "https://")

        ttk.Button(url_frame, text="Apply", width=10, command=self.open_url_all).pack(side=tk.RIGHT, padx=5, pady=5)

        # Status bar
        self.status_var = tk.StringVar(value="Ready")
        status_bar = ttk.Label(self.main_frame, textvariable=self.status_var, relief=tk.SUNKEN)
        status_bar.pack(fill=tk.X, side=tk.BOTTOM, padx=5, pady=2)

        # === Settings Tab Content ===
        settings_content = ttk.Frame(self.settings_frame)
        settings_content.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)

        ttk.Label(settings_content, text="Hotkey Settings:", font=("", 10, "bold")).pack(anchor=tk.W, pady=5)
        ttk.Label(settings_content, text="Ctrl+Shift+Left: Previous profile").pack(anchor=tk.W)
        ttk.Label(settings_content, text="Ctrl+Shift+Right: Next profile").pack(anchor=tk.W)
        ttk.Label(settings_content, text="Ctrl+Shift+Up: Show current profile").pack(anchor=tk.W)
        ttk.Label(settings_content, text="Ctrl+Shift+H: Toggle hotkeys").pack(anchor=tk.W)

        ttk.Separator(settings_content, orient=tk.HORIZONTAL).pack(fill=tk.X, pady=10)

        ttk.Label(settings_content, text="Refresh Interval (seconds):").pack(anchor=tk.W, pady=5)
        self.refresh_interval = ttk.Spinbox(settings_content, from_=1, to=60, width=10)
        self.refresh_interval.set(3)
        self.refresh_interval.pack(anchor=tk.W)

        # === About Tab Content ===
        about_content = ttk.Frame(self.about_frame)
        about_content.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)

        ttk.Label(about_content, text="Multilogin Window Manager v1.0", font=("", 12, "bold")).pack(pady=10)
        ttk.Label(about_content, text="Manage your Multilogin X browser profiles easily.").pack()
        ttk.Label(about_content, text="").pack()
        ttk.Label(about_content, text="Features:").pack(anchor=tk.W)
        ttk.Label(about_content, text="- View all running profiles").pack(anchor=tk.W)
        ttk.Label(about_content, text="- Show/Minimize/Close windows").pack(anchor=tk.W)
        ttk.Label(about_content, text="- Open URL in all profiles").pack(anchor=tk.W)
        ttk.Label(about_content, text="- Hotkeys support").pack(anchor=tk.W)

    def setup_hotkeys(self):
        """Setup global hotkeys using keyboard listener"""
        # We'll use simple tkinter bindings for now
        # For global hotkeys, user would need to use the app window
        self.root.bind("<Control-Shift-Left>", lambda e: self.nav_prev())
        self.root.bind("<Control-Shift-Right>", lambda e: self.nav_next())
        self.root.bind("<Control-Shift-Up>", lambda e: self.show_selected())
        self.root.bind("<Control-Shift-h>", lambda e: self.toggle_hotkeys())

    def toggle_ontop(self):
        """Toggle always on top"""
        self.root.attributes("-topmost", self.ontop_var.get())

    def toggle_hotkeys(self):
        """Toggle hotkeys on/off"""
        self.hotkeys_var.set(not self.hotkeys_var.get())

    def get_multilogin_windows(self):
        """Find all Multilogin browser windows"""
        windows = []

        def enum_callback(hwnd, _):
            if user32.IsWindowVisible(hwnd):
                # Get window title
                length = user32.GetWindowTextLengthW(hwnd)
                if length > 0:
                    buff = ctypes.create_unicode_buffer(length + 1)
                    user32.GetWindowTextW(hwnd, buff, length + 1)
                    title = buff.value

                    # Get process name
                    pid = wintypes.DWORD()
                    user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))

                    try:
                        handle = kernel32.OpenProcess(PROCESS_QUERY_INFORMATION | PROCESS_VM_READ, False, pid.value)
                        if handle:
                            exe_path = ctypes.create_unicode_buffer(260)
                            psapi.GetModuleFileNameExW(handle, None, exe_path, 260)
                            kernel32.CloseHandle(handle)
                            exe_name = exe_path.value.split("\\")[-1].lower()

                            # Check if it's a Multilogin browser (usually mimic browser or chrome-based)
                            if "mimic" in exe_name or ("chrome" in exe_name and self.is_multilogin_profile(title)):
                                # Extract profile name from title
                                profile_name = self.extract_profile_name(title)
                                tab_title = self.extract_tab_title(title)

                                windows.append({
                                    "hwnd": hwnd,
                                    "title": title,
                                    "profile": profile_name,
                                    "tab": tab_title,
                                    "pid": pid.value
                                })
                    except:
                        pass
            return True

        # Enum windows callback type
        EnumWindowsProc = ctypes.WINFUNCTYPE(ctypes.c_bool, wintypes.HWND, wintypes.LPARAM)
        user32.EnumWindows(EnumWindowsProc(enum_callback), 0)

        return windows

    def is_multilogin_profile(self, title):
        """Check if window title indicates a Multilogin profile"""
        # Multilogin profiles often have specific patterns in title
        # This can be customized based on how profiles are named
        indicators = ["--proxy", "DC", "Profile", "Mimic"]
        return any(ind in title for ind in indicators)

    def extract_profile_name(self, title):
        """Extract profile name from window title"""
        # Try to extract profile identifier from title
        # Common patterns: "DC81 --proxy-server..." or "Profile Name - Page Title"

        # Pattern 1: DC## format
        match = re.search(r'(DC\d+)', title)
        if match:
            return match.group(1)

        # Pattern 2: Before " - " separator
        if " - " in title:
            parts = title.split(" - ")
            if len(parts) >= 2:
                return parts[0][:20] + "..." if len(parts[0]) > 20 else parts[0]

        # Pattern 3: First part before common browser indicators
        for sep in [" --", " |", " —"]:
            if sep in title:
                return title.split(sep)[0][:20]

        return title[:20] + "..." if len(title) > 20 else title

    def extract_tab_title(self, title):
        """Extract current tab title from window title"""
        # Usually the page title comes after " - " or before browser name
        if " - " in title:
            parts = title.split(" - ")
            if len(parts) >= 2:
                # Last part is usually browser name, second to last is page title
                tab = parts[-2] if len(parts) > 2 else parts[-1]
                return tab[:30] + "..." if len(tab) > 30 else tab

        return title[:30] + "..." if len(title) > 30 else title

    def refresh_profiles(self):
        """Refresh the profile list"""
        self.profiles = self.get_multilogin_windows()

        # Clear treeview
        for item in self.tree.get_children():
            self.tree.delete(item)

        # Add profiles
        for i, profile in enumerate(self.profiles):
            self.tree.insert("", tk.END, iid=str(i), values=(profile["profile"], profile["tab"]))

        self.status_var.set(f"Found {len(self.profiles)} profile(s)")

    def auto_refresh(self):
        """Auto refresh in background"""
        while self.running:
            try:
                interval = int(self.refresh_interval.get())
            except:
                interval = 3
            time.sleep(interval)
            if self.running:
                self.root.after(0, self.refresh_profiles)

    def on_select(self, event):
        """Handle selection change"""
        selection = self.tree.selection()
        if selection:
            self.selected_index = int(selection[0])
        else:
            self.selected_index = None

    def on_double_click(self, event):
        """Handle double click - show the profile window"""
        self.show_selected()

    def get_selected_profile(self):
        """Get currently selected profile"""
        if self.selected_index is not None and self.selected_index < len(self.profiles):
            return self.profiles[self.selected_index]
        return None

    def show_selected(self):
        """Show/bring to front selected profile window"""
        profile = self.get_selected_profile()
        if profile:
            hwnd = profile["hwnd"]
            user32.ShowWindow(hwnd, SW_RESTORE)
            user32.SetForegroundWindow(hwnd)
            self.status_var.set(f"Showing: {profile['profile']}")
        else:
            self.status_var.set("No profile selected")

    def minimize_selected(self):
        """Minimize selected profile window"""
        profile = self.get_selected_profile()
        if profile:
            user32.ShowWindow(profile["hwnd"], SW_MINIMIZE)
            self.status_var.set(f"Minimized: {profile['profile']}")
        else:
            self.status_var.set("No profile selected")

    def refresh_selected_tab(self):
        """Refresh the current tab in selected profile (send F5)"""
        profile = self.get_selected_profile()
        if profile:
            hwnd = profile["hwnd"]
            # Bring to front and send F5
            user32.ShowWindow(hwnd, SW_RESTORE)
            user32.SetForegroundWindow(hwnd)
            time.sleep(0.1)
            # Send F5 key
            VK_F5 = 0x74
            user32.keybd_event(VK_F5, 0, 0, 0)  # Key down
            user32.keybd_event(VK_F5, 0, 2, 0)  # Key up
            self.status_var.set(f"Refreshed tab: {profile['profile']}")
        else:
            self.status_var.set("No profile selected")

    def close_selected(self):
        """Close selected profile window"""
        profile = self.get_selected_profile()
        if profile:
            if messagebox.askyesno("Confirm", f"Close {profile['profile']}?"):
                user32.PostMessageW(profile["hwnd"], WM_CLOSE, 0, 0)
                self.status_var.set(f"Closed: {profile['profile']}")
                self.root.after(500, self.refresh_profiles)
        else:
            self.status_var.set("No profile selected")

    def show_all(self):
        """Show all profile windows"""
        for profile in self.profiles:
            user32.ShowWindow(profile["hwnd"], SW_RESTORE)
        self.status_var.set(f"Showing all {len(self.profiles)} profiles")

    def minimize_all(self):
        """Minimize all profile windows"""
        for profile in self.profiles:
            user32.ShowWindow(profile["hwnd"], SW_MINIMIZE)
        self.status_var.set(f"Minimized all {len(self.profiles)} profiles")

    def close_all(self):
        """Close all profile windows"""
        if self.profiles and messagebox.askyesno("Confirm", f"Close all {len(self.profiles)} profiles?"):
            for profile in self.profiles:
                user32.PostMessageW(profile["hwnd"], WM_CLOSE, 0, 0)
            self.status_var.set(f"Closing all profiles...")
            self.root.after(1000, self.refresh_profiles)

    def open_url_all(self):
        """Open URL in all profile browsers"""
        url = self.url_entry.get().strip()
        if not url or url == "https://":
            messagebox.showwarning("Warning", "Please enter a valid URL")
            return

        if not url.startswith("http"):
            url = "https://" + url

        count = 0
        for profile in self.profiles:
            hwnd = profile["hwnd"]
            # Bring window to front
            user32.ShowWindow(hwnd, SW_RESTORE)
            user32.SetForegroundWindow(hwnd)
            time.sleep(0.2)

            # Send Ctrl+L to focus address bar, then type URL and Enter
            self.send_url_to_window(hwnd, url)
            count += 1
            time.sleep(0.3)

        self.status_var.set(f"Opened URL in {count} profiles")

    def send_url_to_window(self, hwnd, url):
        """Send URL to browser window"""
        # Focus address bar with Ctrl+L
        VK_CONTROL = 0x11
        VK_L = 0x4C
        VK_RETURN = 0x0D

        user32.keybd_event(VK_CONTROL, 0, 0, 0)
        user32.keybd_event(VK_L, 0, 0, 0)
        user32.keybd_event(VK_L, 0, 2, 0)
        user32.keybd_event(VK_CONTROL, 0, 2, 0)

        time.sleep(0.1)

        # Type URL using SendInput or clipboard
        # Using clipboard method for reliability
        self.root.clipboard_clear()
        self.root.clipboard_append(url)

        # Paste with Ctrl+V
        VK_V = 0x56
        user32.keybd_event(VK_CONTROL, 0, 0, 0)
        user32.keybd_event(VK_V, 0, 0, 0)
        user32.keybd_event(VK_V, 0, 2, 0)
        user32.keybd_event(VK_CONTROL, 0, 2, 0)

        time.sleep(0.1)

        # Press Enter
        user32.keybd_event(VK_RETURN, 0, 0, 0)
        user32.keybd_event(VK_RETURN, 0, 2, 0)

    def nav_prev(self):
        """Navigate to previous profile"""
        if not self.profiles:
            return
        if self.selected_index is None:
            self.selected_index = 0
        else:
            self.selected_index = (self.selected_index - 1) % len(self.profiles)
        self.tree.selection_set(str(self.selected_index))
        self.tree.see(str(self.selected_index))
        self.show_selected()

    def nav_next(self):
        """Navigate to next profile"""
        if not self.profiles:
            return
        if self.selected_index is None:
            self.selected_index = 0
        else:
            self.selected_index = (self.selected_index + 1) % len(self.profiles)
        self.tree.selection_set(str(self.selected_index))
        self.tree.see(str(self.selected_index))
        self.show_selected()

    def nav_top(self):
        """Navigate to first profile and bring to front"""
        if self.profiles:
            self.selected_index = 0
            self.tree.selection_set("0")
            self.tree.see("0")
            self.show_selected()

    def on_close(self):
        """Handle window close"""
        self.running = False
        self.root.destroy()


def main():
    root = tk.Tk()

    # Set icon if available
    try:
        root.iconbitmap("icon.ico")
    except:
        pass

    app = MultiloginWindowManager(root)
    root.protocol("WM_DELETE_WINDOW", app.on_close)
    root.mainloop()


if __name__ == "__main__":
    main()
