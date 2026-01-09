import tkinter as tk
from tkinter import ttk, filedialog, messagebox
import csv
import json
import zipfile
import os
import base64
import random
import string
from io import BytesIO

class AutofillGeneratorApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Autofill Extension Generator")
        self.root.geometry("900x600")
        self.root.configure(bg='#1a1a2e')

        self.profiles = []

        self.setup_ui()

    def setup_ui(self):
        # Title
        title = tk.Label(self.root, text="Autofill Extension Generator",
                        font=('Arial', 20, 'bold'), fg='#00d4ff', bg='#1a1a2e')
        title.pack(pady=20)

        subtitle = tk.Label(self.root, text="Create encrypted extensions - workers can't see profile details",
                           font=('Arial', 10), fg='#888', bg='#1a1a2e')
        subtitle.pack()

        # Buttons frame
        btn_frame = tk.Frame(self.root, bg='#1a1a2e')
        btn_frame.pack(pady=20)

        import_btn = tk.Button(btn_frame, text="Import CSV", command=self.import_csv,
                              bg='#28a745', fg='white', font=('Arial', 11, 'bold'),
                              padx=20, pady=10, cursor='hand2')
        import_btn.pack(side=tk.LEFT, padx=10)

        clear_btn = tk.Button(btn_frame, text="Clear All", command=self.clear_profiles,
                             bg='#6c757d', fg='white', font=('Arial', 11, 'bold'),
                             padx=20, pady=10, cursor='hand2')
        clear_btn.pack(side=tk.LEFT, padx=10)

        generate_btn = tk.Button(btn_frame, text="Generate Extension (.zip)", command=self.generate_extension,
                                bg='#7b2cbf', fg='white', font=('Arial', 11, 'bold'),
                                padx=20, pady=10, cursor='hand2')
        generate_btn.pack(side=tk.LEFT, padx=10)

        # Profile count
        self.count_label = tk.Label(self.root, text="Profiles loaded: 0",
                                   font=('Arial', 12), fg='#00d4ff', bg='#1a1a2e')
        self.count_label.pack(pady=10)

        # Treeview for profiles
        tree_frame = tk.Frame(self.root, bg='#1a1a2e')
        tree_frame.pack(fill=tk.BOTH, expand=True, padx=20, pady=10)

        columns = ('profile', 'email', 'name', 'card')
        self.tree = ttk.Treeview(tree_frame, columns=columns, show='headings', height=15)

        self.tree.heading('profile', text='Profile #')
        self.tree.heading('email', text='Email')
        self.tree.heading('name', text='Full Name')
        self.tree.heading('card', text='Card (last 4)')

        self.tree.column('profile', width=80)
        self.tree.column('email', width=250)
        self.tree.column('name', width=200)
        self.tree.column('card', width=100)

        scrollbar = ttk.Scrollbar(tree_frame, orient=tk.VERTICAL, command=self.tree.yview)
        self.tree.configure(yscrollcommand=scrollbar.set)

        self.tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)

        # Status
        self.status_label = tk.Label(self.root, text="", font=('Arial', 10),
                                    fg='#28a745', bg='#1a1a2e')
        self.status_label.pack(pady=10)

        # Style
        style = ttk.Style()
        style.theme_use('clam')
        style.configure('Treeview', background='#2a2a4e', foreground='white',
                       fieldbackground='#2a2a4e', rowheight=25)
        style.configure('Treeview.Heading', background='#00d4ff', foreground='black',
                       font=('Arial', 10, 'bold'))

    def import_csv(self):
        file_path = filedialog.askopenfilename(
            title="Select CSV File",
            filetypes=[("CSV files", "*.csv"), ("All files", "*.*")]
        )

        if not file_path:
            return

        try:
            self.profiles = []
            with open(file_path, 'r', encoding='utf-8-sig') as f:
                reader = csv.DictReader(f)
                for i, row in enumerate(reader):
                    # Map CSV columns to our format (handle different column names)
                    profile = {
                        'profile_name': f"Profile{i+1}",
                        'email': row.get('email', row.get('Email', '')),
                        'password': row.get('password', row.get('Password', '')),
                        'first_name': row.get('first_name', row.get('First_name', row.get('firstname', ''))),
                        'last_name': row.get('last_name', row.get('Last_name', row.get('lastname', ''))),
                        'full_name': row.get('Full_name', row.get('full_name', row.get('fullname', ''))),
                        'country': row.get('Country', row.get('country', '')),
                        'address': row.get('Address', row.get('address', '')),
                        'city': row.get('City', row.get('city', '')),
                        'zipcode': row.get('Zip_code', row.get('zip_code', row.get('zipcode', row.get('Zipcode', '')))),
                        'state': row.get('Province', row.get('province', row.get('State', row.get('state', '')))),
                        'phone': row.get('phone', row.get('Phone', '')),
                        'card_number': row.get('card_number', row.get('Card_number', '')),
                        'card_cvv': row.get('cvc', row.get('CVC', row.get('cvv', row.get('CVV', '')))),
                        'card_exp': row.get('card_expiry', row.get('Card_expiry', row.get('expiry', ''))),
                        'card_name': row.get('Full_name', row.get('full_name', '')),  # Use full name for card
                        'dob': row.get('dob', row.get('DOB', row.get('birthday', ''))),
                        'gender': row.get('gender', row.get('Gender', '')),
                    }

                    # Generate full name if not provided
                    if not profile['full_name'] and profile['first_name'] and profile['last_name']:
                        profile['full_name'] = f"{profile['first_name']} {profile['last_name']}"

                    self.profiles.append(profile)

            self.update_tree()
            self.count_label.config(text=f"Profiles loaded: {len(self.profiles)}")
            self.status_label.config(text=f"Successfully imported {len(self.profiles)} profiles!", fg='#28a745')

        except Exception as e:
            messagebox.showerror("Error", f"Failed to import CSV: {str(e)}")

    def update_tree(self):
        for item in self.tree.get_children():
            self.tree.delete(item)

        for i, p in enumerate(self.profiles):
            card_last4 = p.get('card_number', '')[-4:] if p.get('card_number') else ''
            self.tree.insert('', tk.END, values=(
                f"Profile{i+1}",
                p.get('email', ''),
                p.get('full_name', ''),
                f"****{card_last4}" if card_last4 else ''
            ))

    def clear_profiles(self):
        self.profiles = []
        self.update_tree()
        self.count_label.config(text="Profiles loaded: 0")
        self.status_label.config(text="Cleared all profiles", fg='#888')

    def encrypt(self, data, key):
        json_str = json.dumps(data)
        encrypted = ''
        for i, char in enumerate(json_str):
            encrypted += chr(ord(char) ^ ord(key[i % len(key)]))
        return base64.b64encode(encrypted.encode('latin-1')).decode('ascii')

    def generate_extension(self):
        if not self.profiles:
            messagebox.showwarning("Warning", "No profiles loaded! Import a CSV first.")
            return

        save_path = filedialog.asksaveasfilename(
            title="Save Extension As",
            defaultextension=".zip",
            filetypes=[("ZIP files", "*.zip")],
            initialfilename="tm-autofill-extension.zip"
        )

        if not save_path:
            return

        try:
            # Generate encryption key
            key = ''.join(random.choices(string.ascii_uppercase, k=32))
            encrypted_data = self.encrypt(self.profiles, key)
            profile_names = [p['profile_name'] for p in self.profiles]

            # Create ZIP
            with zipfile.ZipFile(save_path, 'w', zipfile.ZIP_DEFLATED) as zf:
                # manifest.json
                manifest = {
                    "manifest_version": 3,
                    "name": "TM AutoFill",
                    "version": "1.0.0",
                    "description": "Autofill extension",
                    "permissions": ["storage", "activeTab", "scripting"],
                    "action": {
                        "default_popup": "popup.html",
                        "default_icon": "icon48.png"
                    },
                    "icons": {
                        "16": "icon16.png",
                        "48": "icon48.png",
                        "128": "icon128.png"
                    },
                    "content_scripts": [{
                        "matches": ["<all_urls>"],
                        "js": ["content.js"]
                    }]
                }
                zf.writestr('manifest.json', json.dumps(manifest, indent=2))

                # popup.html
                popup_html = '''<!DOCTYPE html>
<html>
<head>
    <style>
        body { width: 280px; padding: 15px; font-family: Arial, sans-serif; background: #1a1a2e; color: #fff; }
        h3 { margin: 0 0 15px 0; color: #00d4ff; font-size: 16px; }
        select { width: 100%; padding: 10px; border-radius: 6px; border: 1px solid #444; background: #2a2a4e; color: #fff; margin-bottom: 10px; }
        button { width: 100%; padding: 12px; background: linear-gradient(90deg, #00d4ff, #7b2cbf); color: #fff; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; margin-bottom: 8px; }
        button:hover { opacity: 0.9; }
        .card-btn { background: linear-gradient(90deg, #7b2cbf, #dc3545); }
        .status { margin-top: 10px; padding: 8px; border-radius: 4px; font-size: 12px; display: none; }
        .status.show { display: block; background: rgba(0,212,255,0.2); color: #00d4ff; }
    </style>
</head>
<body>
    <h3>TM AutoFill</h3>
    <select id="profileSelect">
        <option value="">-- Select Profile --</option>
    </select>
    <button id="fillBtn">Fill Form</button>
    <button id="fillCardBtn" class="card-btn">Fill Card Details</button>
    <div id="status" class="status"></div>
    <script src="popup.js"></script>
</body>
</html>'''
                zf.writestr('popup.html', popup_html)

                # popup.js
                popup_js = f'''
const _d = "{encrypted_data}";
const _k = "{key}";
const _n = {json.dumps(profile_names)};

function _dec(d, k) {{
    const e = atob(d);
    let r = '';
    for (let i = 0; i < e.length; i++) {{
        r += String.fromCharCode(e.charCodeAt(i) ^ k.charCodeAt(i % k.length));
    }}
    return JSON.parse(r);
}}

document.addEventListener('DOMContentLoaded', function() {{
    const select = document.getElementById('profileSelect');
    _n.forEach(name => {{
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        select.appendChild(opt);
    }});

    chrome.storage.local.get(['selectedProfile'], function(data) {{
        if (data.selectedProfile) {{
            select.value = data.selectedProfile;
        }}
    }});

    select.addEventListener('change', function() {{
        chrome.storage.local.set({{ selectedProfile: this.value }});
    }});

    document.getElementById('fillBtn').addEventListener('click', function() {{
        const profileName = select.value;
        if (!profileName) {{
            showStatus('Select a profile first');
            return;
        }}

        const profiles = _dec(_d, _k);
        const profile = profiles.find(p => p.profile_name === profileName);

        if (profile) {{
            chrome.tabs.query({{active: true, currentWindow: true}}, function(tabs) {{
                chrome.tabs.sendMessage(tabs[0].id, {{action: 'fill', data: profile}}, function(response) {{
                    showStatus('Form filled!');
                }});
            }});
        }}
    }});

    document.getElementById('fillCardBtn').addEventListener('click', function() {{
        const profileName = select.value;
        if (!profileName) {{
            showStatus('Select a profile first');
            return;
        }}

        const profiles = _dec(_d, _k);
        const profile = profiles.find(p => p.profile_name === profileName);

        if (profile) {{
            chrome.tabs.query({{active: true, currentWindow: true}}, function(tabs) {{
                chrome.tabs.sendMessage(tabs[0].id, {{action: 'fillCard', data: profile}}, function(response) {{
                    showStatus('Card details filled!');
                }});
            }});
        }}
    }});

    function showStatus(msg) {{
        const status = document.getElementById('status');
        status.textContent = msg;
        status.className = 'status show';
        setTimeout(() => {{ status.className = 'status'; }}, 2000);
    }}
}});
'''
                zf.writestr('popup.js', popup_js)

                # content.js
                content_js = '''
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'fill') {
        fillForm(request.data);
        sendResponse({success: true});
    } else if (request.action === 'fillCard') {
        fillCardDetails(request.data);
        sendResponse({success: true});
    }
});

function fillForm(data) {
    const fieldMappings = {
        'full_name': ['fullname', 'full_name', 'name', 'your-name', 'your_name', 'completename'],
        'first_name': ['first', 'fname', 'firstname', 'given', 'first_name'],
        'last_name': ['last', 'lname', 'lastname', 'surname', 'family', 'last_name'],
        'email': ['email', 'mail', 'e-mail', 'user', 'username', 'login'],
        'password': ['password', 'pass', 'pwd', 'secret', 'passwd'],
        'phone': ['phone', 'tel', 'mobile', 'cell', 'telephone'],
        'dob': ['dob', 'birth', 'birthday', 'dateofbirth', 'date_of_birth'],
        'country': ['country', 'nation', 'countrycode'],
        'state': ['state', 'province', 'region'],
        'city': ['city', 'town', 'locality'],
        'address': ['address', 'street', 'addr', 'line1', 'address1', 'streetaddress'],
        'zipcode': ['zip', 'postal', 'postcode', 'zipcode', 'postalcode']
    };

    fillFields(data, fieldMappings);
}

function fillCardDetails(data) {
    const cardMappings = {
        'card_name': ['cardholder', 'card-name', 'cardname', 'nameoncard', 'ccname', 'card_name', 'holdername'],
        'card_number': ['cardnumber', 'card-number', 'ccnumber', 'cc-number', 'creditcard', 'card_number', 'pan', 'ccnum'],
        'card_exp': ['expiry', 'expiration', 'exp', 'card-exp', 'cc-exp', 'expirydate', 'card_exp', 'mmyy'],
        'card_cvv': ['cvv', 'cvc', 'cvv2', 'cvc2', 'securitycode', 'security-code', 'card_cvv', 'ccv']
    };

    fillFields(data, cardMappings);

    // Try to fill separate month/year fields
    if (data.card_exp && data.card_exp.includes('/')) {
        const [month, year] = data.card_exp.split('/').map(s => s.trim());
        const inputs = document.querySelectorAll('input, select');
        inputs.forEach(input => {
            const combined = ((input.name || '') + ' ' + (input.id || '') + ' ' + (input.placeholder || '')).toLowerCase();
            if (combined.match(/month|mm/) && !combined.match(/year|yy/)) {
                setFieldValue(input, month);
            } else if (combined.match(/year|yy/) && !combined.match(/month|mm/)) {
                let yearVal = year;
                if (input.tagName === 'SELECT') {
                    const options = Array.from(input.options);
                    const fullYear = year.length === 2 ? '20' + year : year;
                    const match = options.find(opt => opt.value === year || opt.value === fullYear || opt.text.includes(year) || opt.text.includes(fullYear));
                    if (match) yearVal = match.value;
                }
                setFieldValue(input, yearVal);
            }
        });
    }
}

function fillFields(data, mappings) {
    const inputs = document.querySelectorAll('input, select, textarea');

    inputs.forEach(input => {
        const name = (input.name || '').toLowerCase();
        const id = (input.id || '').toLowerCase();
        const placeholder = (input.placeholder || '').toLowerCase();
        const ariaLabel = (input.getAttribute('aria-label') || '').toLowerCase();
        const autocomplete = (input.getAttribute('autocomplete') || '').toLowerCase();
        const combined = name + ' ' + id + ' ' + placeholder + ' ' + ariaLabel + ' ' + autocomplete;

        for (const [field, keywords] of Object.entries(mappings)) {
            if (data[field] && keywords.some(kw => combined.includes(kw))) {
                setFieldValue(input, data[field]);
                break;
            }
        }
    });
}

function setFieldValue(input, value) {
    if (input.tagName === 'SELECT') {
        const options = Array.from(input.options);
        const match = options.find(opt =>
            opt.text.toLowerCase().includes(value.toLowerCase()) ||
            opt.value.toLowerCase().includes(value.toLowerCase())
        );
        if (match) {
            input.value = match.value;
            input.dispatchEvent(new Event('change', {bubbles: true}));
        }
    } else {
        input.value = value;
        input.dispatchEvent(new Event('input', {bubbles: true}));
        input.dispatchEvent(new Event('change', {bubbles: true}));
        input.dispatchEvent(new Event('blur', {bubbles: true}));
    }
}
'''
                zf.writestr('content.js', content_js)

                # Simple icons (base64 encoded minimal PNGs)
                # 16x16 cyan icon
                icon16_data = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAOklEQVR42mNgGAWjYBSMgsEJGBkZ/zMwMPxHxgyMjIz/kTEDIyPjfySMrg4ZYxiArA5dHboB2NQNBgAAJR8LAS4cMJsAAAAASUVORK5CYII=')
                icon48_data = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAASklEQVR42u3PMQEAAAwCoNm/9Cr4CQ3IkJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnBcvHwsA7xwwm8MAAAAASUVORK5CYII=')
                icon128_data = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAAAU0lEQVR42u3BMQEAAADCoPVPbQhPoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIC3AcUIAAFkqh9zAAAAAElFTkSuQmCC')

                zf.writestr('icon16.png', icon16_data)
                zf.writestr('icon48.png', icon48_data)
                zf.writestr('icon128.png', icon128_data)

            self.status_label.config(text=f"Extension saved to: {os.path.basename(save_path)}", fg='#28a745')
            messagebox.showinfo("Success", f"Extension generated successfully!\n\nSaved to:\n{save_path}\n\nTo install:\n1. Open Chrome\n2. Go to chrome://extensions\n3. Enable Developer mode\n4. Click 'Load unpacked'\n5. Select the extracted folder")

        except Exception as e:
            messagebox.showerror("Error", f"Failed to generate extension: {str(e)}")

if __name__ == '__main__':
    root = tk.Tk()
    app = AutofillGeneratorApp(root)
    root.mainloop()
