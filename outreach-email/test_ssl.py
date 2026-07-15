#!/usr/bin/env python3
"""Quick test: try scraping with SSL verification disabled"""
import requests, urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

urls = [
    "https://www.ststithians.com",
    "https://www.redhillschool.co.za",
    "https://www.kearsney.co.za",
    "https://www.somersetcollege.co.za",
]

HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}

for url in urls:
    try:
        r = requests.get(url, headers=HEADERS, timeout=10, verify=False)
        print(f"{url:50s} -> HTTP {r.status_code} ({len(r.text)} bytes)")
        if r.status_code == 200:
            import re
            emails = re.findall(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', r.text)
            valid = [e for e in emails if 'noreply' not in e and '.png' not in e]
            print(f"  Emails: {valid[:3]}")
    except Exception as e:
        print(f"{url:50s} -> Error: {str(e)[:60]}")
