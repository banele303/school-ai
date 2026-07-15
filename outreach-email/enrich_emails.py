#!/usr/bin/env python3
"""
enrich_emails.py — Scrape school websites for email addresses.
Visits each school's website → finds contact/admissions pages → extracts emails.
Usage: python enrich_emails.py [--limit 30] [--resume]
"""
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
PHONE_RE = re.compile(r'(\+27[\s-]?\d{2}[\s-]?\d{3,4}[\s-]?\d{4}|0\d{2}[\s-]?\d{3,4}[\s-]?\d{4})')

EMAIL_BLACKLIST = (
    '.png','.jpg','.gif','.svg','.css','.js','.webp','.ico',
    'example.com','test.com','w3.org','schema.org','sentry.io',
    'noreply@','no-reply@','donotreply@','wordpress@',
)

CONTACT_KEYWORDS = ['contact', 'about', 'admission', 'enquire', 'enquiry',
                    'get-in-touch', 'reach-us', 'connect', 'principal',
                    'staff', 'directory', 'team', 'info']

def is_valid_email(email):
    e = email.lower().strip()
    if any(b in e for b in EMAIL_BLACKLIST):
        return False
    if e.count('@') != 1:
        return False
    # Prefer school-related emails
    domain = e.split('@')[1]
    if any(t in domain for t in ['.co.za', '.org.za', '.edu', '.org', '.com', '.net']):
        return True
    return False

def extract_emails(text):
    found = EMAIL_RE.findall(text)
    valid = list(dict.fromkeys(e for e in found if is_valid_email(e)))
    return valid[:10]

def extract_phones(text):
    phones = PHONE_RE.findall(text)
    return list(dict.fromkeys(p.strip() for p in phones if len(p) >= 10))[:3]

def find_contact_pages(base_url, html):
    """Find URLs for contact/about/admissions pages on the site."""
    links = re.findall(r'href="([^"]*)"', html, re.IGNORECASE)
    found = []
    domain = urlparse(base_url).netloc
    for link in links:
        if not link or link.startswith('#') or link.startswith('javascript:'):
            continue
        # Only follow links on the same domain
        link_lower = link.lower()
        if domain not in link_lower and 'http' in link_lower:
            continue
        if any(kw in link_lower for kw in CONTACT_KEYWORDS):
            full_url = urljoin(base_url, link)
            if full_url not in found:
                found.append(full_url)
    return found[:5]

def scrape_site(url, school_name=""):
    """Scrape a school's website and return found emails, phones."""
    result = {"emails": [], "phones": [], "pages_scraped": 0, "error": None}
    
    if not url or url == "NONE":
        result["error"] = "No URL"
        return result
    
    try:
        import requests
        # Scrape homepage
        resp = requests.get(url, headers=HEADERS, timeout=12)
        if resp.status_code != 200:
            result["error"] = f"HTTP {resp.status_code}"
            return result
        
        html = resp.text
        result["emails"] = extract_emails(html)
        result["phones"] = extract_phones(html)
        result["pages_scraped"] = 1
        
        # Find and scrape contact pages
        contact_urls = find_contact_pages(url, html)
        for cu in contact_urls[:3]:
            try:
                time.sleep(1)
                cr = requests.get(cu, headers=HEADERS, timeout=10)
                if cr.status_code == 200:
                    chtml = cr.text
                    emails = extract_emails(chtml)
                    phones = extract_phones(chtml)
                    for e in emails:
                        if e not in result["emails"]:
                            result["emails"].append(e)
                    for p in phones:
                        if p not in result["phones"]:
                            result["phones"].append(p)
                    result["pages_scraped"] += 1
            except:
                pass
        
        # If still no emails, try /contact/ directly
        if not result["emails"]:
            try:
                contact_url = urljoin(url, "contact")
                time.sleep(1)
                cr = requests.get(contact_url, headers=HEADERS, timeout=10)
                if cr.status_code == 200:
                    result["emails"] = extract_emails(cr.text)
                    result["pages_scraped"] += 1
            except:
                pass
        
    except Exception as e:
        result["error"] = str(e)[:60]
    
    return result

def load_leads():
    with open(LEADS_MASTER, encoding="utf-8") as f:
        return list(csv.DictReader(f))

def save_leads(leads):
    # Save master CSV
    fieldnames = list(leads[0].keys()) if leads else []
    with open(LEADS_MASTER, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        w.writeheader()
        w.writerows(leads)
    
    # Save email CSV
    email_fields = ["first_name", "name", "company", "role", "email",
                    "phone", "city", "priority_score", "source"]
    with open(LEADS_EMAIL, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=email_fields, extrasaction="ignore")
        w.writeheader()
        w.writerows(leads)

def main():
    import argparse
    parser = argparse.ArgumentParser(description="Enrich school leads with email addresses")
    parser.add_argument("--limit", type=int, default=50, help="Max schools to enrich")
    parser.add_argument("--resume", action="store_true", help="Resume from last checkpoint")
    parser.add_argument("--delay", type=int, default=3, help="Delay between scrapes (sec)")
    args = parser.parse_args()
    
    # Load enrichment log
    enrich_log = {"enriched": [], "failed": []}
    if args.resume and os.path.exists(ENRICH_LOG):
        with open(ENRICH_LOG) as f:
            enrich_log = json.load(f)
        print(f"Resuming from previous run ({len(enrich_log['enriched'])} already done)")
    
    leads = load_leads()
    
    # Find leads needing enrichment (no email, has website)
    to_enrich = []
    for l in leads:
        if l.get('email') and l['email'].strip():
            continue
        if not l.get('website') or l['website'] == 'NONE' or not l['website'].strip():
            continue
        # Skip already enriched
        if l.get('company','').lower() in [e.lower() for e in enrich_log['enriched']]:
            continue
        to_enrich.append(l)
    
    print(f"Leads needing enrichment: {len(to_enrich)}")
    print(f"Limit: {args.limit}")
    print(f"Delay: {args.delay}s between scrapes\n")
    
    if not to_enrich:
        print("No leads to enrich!")
        return
    
    enriched_count = 0
    for i, lead in enumerate(to_enrich[:args.limit]):
        company = lead.get('company', '?')
        website = lead.get('website', '')
        
        print(f"  [{i+1}/{min(len(to_enrich), args.limit)}] {company[:40]:40s} ... ", end="", flush=True)
        
        result = scrape_site(website, company)
        
        if result["emails"]:
            best_email = result["emails"][0]
            lead["email"] = best_email
            lead["all_emails"] = " | ".join(result["emails"])
            print(f"✅ {best_email}")
            enrich_log["enriched"].append(company.lower())
            enriched_count += 1
        elif result["error"]:
            print(f"❌ {result['error']}")
            enrich_log["failed"].append({"company": company, "url": website, "error": result["error"]})
        else:
            print(f"⚠️  No emails found")
            enrich_log["failed"].append({"company": company, "url": website, "error": "no emails"})
        
        if result["phones"]:
            lead["phone"] = result["phones"][0]
        
        lead["enriched"] = "true"
        lead["enriched_at"] = datetime.now().isoformat()
        
        # Save progress every 5 schools
        if (i + 1) % 5 == 0:
            save_leads(leads)
            os.makedirs(os.path.dirname(ENRICH_LOG), exist_ok=True)
            with open(ENRICH_LOG, "w") as f:
                json.dump(enrich_log, f, indent=2)
            print(f"\n  --- Checkpoint saved ({i+1} done) ---\n")
        
        if i < min(len(to_enrich), args.limit) - 1:
            time.sleep(args.delay)
    
    # Final save
    save_leads(leads)
    with open(ENRICH_LOG, "w") as f:
        json.dump(enrich_log, f, indent=2)
    
    print(f"\n{'='*55}")
    print(f"  ENRICHMENT COMPLETE")
    print(f"  Schools scraped: {min(len(to_enrich), args.limit)}")
    print(f"  Emails found:    {enriched_count}")
    print(f"  Emails total:    {sum(1 for l in leads if l.get('email') and l['email'].strip())}")
    print(f"  Saved to: leads/leads_master.csv + leads_for_email.csv")
    print(f"  Log: output/enrich_log.json")
    print(f"{'='*55}")
    print(f"\n  Resume next time with: python enrich_emails.py --resume")
    print(f"  Or continue next batch with: python enrich_emails.py --limit 50 --resume")

if __name__ == "__main__":
    main()
