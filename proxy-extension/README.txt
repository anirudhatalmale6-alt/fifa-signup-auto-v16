PROXY SWITCHER EXTENSION
========================

USAGE:
1. Edit proxies.json to add your proxies
2. Load this folder in Chrome (chrome://extensions → Developer mode → Load unpacked)
3. Press Alt+Q to switch to random proxy

PROXY FORMAT (in proxies.json):
[
  "host:port:username:password",
  "host:port:username:password"
]

EXAMPLE:
[
  "b2b-s15.liveproxies.io:7383:LV22356609-lv_us-26890:BWT3m8egQvp4MM8l9in5",
  "geo.iproyal.com:12321:user1:pass1",
  "proxy.example.com:8080:user2:pass2"
]

SHORTCUT:
Alt+Q = Switch to random proxy + auto-auth + refresh page
