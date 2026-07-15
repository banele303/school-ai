#!/usr/bin/env python3
"""Retry enrichment - try http:// for schools that failed on https"""
import json, csv, os, re, time, sys
from urllib.parse import urljoin, urlparse
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LEADS_MASTER = os.path.join(BASE_DIR, "leads", "leads_master.csv")
LEADS_EMAIL = os.path.join(BASE_DIR, "leads", "leads_for_email.csv")
ENRICH_LOG = os.path.join(BASE_DIR, "output", "enrich_log.json")

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml",
}

EMAIL_RE = re.compile(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}')
CONTACT_PAGES = ['/contact', '/contact-us', '/about/contact', '/about-us',
                 '/admissions/contact', '/admissions', '/enquire',
                 '/reach-us', '/get-in-touch', '/about',
                 '/staff-directory', '/our-team', '/school/contact']

def load_leads():
    with open(LEADS_MASTER, encoding="utf-8") as f:
        return list(csv.DictReader(f))

def save_leads(leads):
    fieldnames = list(leads[0].keys())
    with open(LEADS_MASTER, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        w.writeheader()
        w.writerows(leads)
    email_fields = ["first_name", "name", "company", "role", "email",
                    "phone", "city", "priority_score", "source"]
    with open(LEADS_EMAIL, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=email_fields, extrasaction="ignore")
        w.writeheader()
        w.writerows(leads)

def try_scrape(url):
    """Try to scrape a URL for emails. Returns (emails, error)."""
    try:
        import requests
        r = requests.get(url, headers=HEADERS, timeout=10)
        if r.status_code != 200:
            return [], f"HTTP {r.status_code}"
        emails = list(dict.fromkeys(EMAIL_RE.findall(r.text)))
        # Filter
        valid = [e for e in emails if e.count('@')==1 and not any(b in e.lower() for b in ['.png','.jpg','.gif','example.com','noreply@'])]
        return valid, None
    except Exception as e:
        return [], str(e)[:60]

def main():
    leads = load_leads()
    
    # Find schools with no email but have website
    to_retry = []
    for l in leads:
        if l.get('email') and l['email'].strip():
            continue
        website = l.get('website', '').strip()
        if not website or website == 'NONE':
            continue
        # Skip apify sources (they have no real website)
        if l.get('source') == 'apify':
            continue
        to_retry.append(l)
    
    print(f"Schools to retry: {len(to_retry)}\n")
    
    found = 0
    for i, l in enumerate(to_retry):
        company = l.get('company', '?')
        website = l.get('website', '').strip()
        
        print(f"  [{i+1}/{len(to_retry)}] {company[:40]:40s} ", end="", flush=True)
        
        # Try https first
        emails, err = try_scrape(website)
        
        # If https failed, try http
        if not emails and err:
            http_url = website.replace('https://', 'http://')
            if http_url != website:
                time.sleep(1)
                emails2, err2 = try_scrape(http_url)
                if emails2:
                    emails = emails2
                    err = None
        
        # If still nothing, try /contact page
        if not emails and website:
            for cp in CONTACT_PAGES:
                time.sleep(0.5)
                contact_url = urljoin(website, cp)
                emails3, _ = try_scrape(contact_url)
                if emails3:
                    emails = emails3
                    err = None
                    break
        
        if emails:
            best = emails[0]
            # Skip obviously wrong emails
            if 'icloud.com' in best or 'one2love' in best or 'chiropracto' in best or 'rory@' in best or 'kerry@' in best:
                # Try to find a better one
                better = [e for e in emails if 'school' in e.lower() or 'info@' in e.lower() or 'admission' in e.lower() or 'college' in e.lower()]
                if better:
                    best = better[0]
                else:
                    print(f"skipped ({best})")
                    time.sleep(1.5)
                    continue
            
            l['email'] = best
            l['enriched'] = 'true'
            print(f"✅ {best}")
            found += 1
        else:
            reason = err or "no emails"
            print(f"❌ {reason[:30]}")
        
        time.sleep(1.5)
        
        # Save every 10
        if (i+1) % 10 == 0:
            save_leads(leads)
            print()
    
    save_leads(leads)
    
    total_with_email = sum(1 for l in leads if l.get('email') and l['email'].strip())
    print(f"\n{'='*50}")
    print(f"  Retry complete!")
    print(f"  New emails: {found}")
    print(f"  Total with email: {total_with_email}")
    print(f"{'='*50}")

if __name__ == "__main__":
    main()
