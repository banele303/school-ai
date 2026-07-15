#!/usr/bin/env python3
"""
launch_apify.py - Launch Apify Leads Finder searches for SA private school decision-makers.
Run FIRST: python launch_apify.py
Token read from .token file or APIFY_TOKEN env var.
"""
import json, os, sys, time, requests

TOKEN = None
token_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".token")
if os.path.exists(token_path):
    with open(token_path) as f:
        TOKEN = f.read().strip()
if not TOKEN:
    TOKEN = os.environ.get("APIFY_TOKEN", "")
if not TOKEN:
    print("ERROR: No Apify token. echo 'apify_api_...' > .token or set APIFY_TOKEN")
    sys.exit(1)

BASE_URL = "https://api.apify.com/v2"
ACTOR = "IoSHqwTR9YGhzccez"
HEADERS = {"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"}

# 10 searches targeting school decision-makers across SA cities
SEARCHES = [
    # 1: School Principals - Johannesburg
    {"label": "jhb_principals", "params": {
        "fetch_count": 500, "file_name": "jhb_principals",
        "contact_job_title": ["school principal"],
        "contact_location": ["south africa"], "contact_city": ["Johannesburg"],
        "company_keywords": ["school", "college", "academy"],
        "email_status": ["validated"]}},
    # 2: Head of School / Headmaster - Johannesburg
    {"label": "jhb_headmasters", "params": {
        "fetch_count": 500, "file_name": "jhb_heads",
        "contact_job_title": ["head of school"],
        "contact_location": ["south africa"], "contact_city": ["Johannesburg"],
        "company_keywords": ["private school", "independent school", "college"],
        "email_status": ["validated"]}},
    # 3: IT Directors - Johannesburg
    {"label": "jhb_it_directors", "params": {
        "fetch_count": 500, "file_name": "jhb_it",
        "contact_job_title": ["IT director"],
        "contact_location": ["south africa"], "contact_city": ["Johannesburg"],
        "company_keywords": ["school", "education", "academy", "college"],
        "email_status": ["validated"]}},
    # 4: Deputy Principals (Academics) - Johannesburg
    {"label": "jhb_deputy_principals", "params": {
        "fetch_count": 500, "file_name": "jhb_deputies",
        "contact_job_title": ["deputy principal"],
        "contact_location": ["south africa"], "contact_city": ["Johannesburg"],
        "email_status": ["validated"]}},
    # 5: Head of Academics / Curriculum - Johannesburg
    {"label": "jhb_academics", "params": {
        "fetch_count": 500, "file_name": "jhb_academics",
        "contact_job_title": ["head of academics"],
        "contact_location": ["south africa"], "contact_city": ["Johannesburg"],
        "company_keywords": ["school", "education", "academy", "college"],
        "email_status": ["validated"]}},
    # 6: School Principals - Cape Town
    {"label": "cpt_principals", "params": {
        "fetch_count": 500, "file_name": "cpt_principals",
        "contact_job_title": ["school principal"],
        "contact_location": ["south africa"], "contact_city": ["Cape Town"],
        "company_keywords": ["private school", "independent school", "college"],
        "email_status": ["validated"]}},
    # 7: School Principals - Durban/Pietermaritzburg
    {"label": "dbn_principals", "params": {
        "fetch_count": 500, "file_name": "dbn_principals",
        "contact_job_title": ["school principal"],
        "contact_location": ["south africa"], "contact_city": ["Durban"],
        "company_keywords": ["private school", "independent school", "college"],
        "email_status": ["validated"]}},
    # 8: School Principals - Pretoria
    {"label": "pta_principals", "params": {
        "fetch_count": 500, "file_name": "pta_principals",
        "contact_job_title": ["school principal"],
        "contact_location": ["south africa"], "contact_city": ["Pretoria"],
        "company_keywords": ["private school", "independent school", "college"],
        "email_status": ["validated"]}},
    # 9: Head of School - Cape Town
    {"label": "cpt_headmasters", "params": {
        "fetch_count": 500, "file_name": "cpt_heads",
        "contact_job_title": ["head of school"],
        "contact_location": ["south africa"], "contact_city": ["Cape Town"],
        "company_keywords": ["school", "education", "academy", "college"],
        "email_status": ["validated"]}},
    # 10: School Owners / Founders - All SA
    {"label": "sa_owners", "params": {
        "fetch_count": 500, "file_name": "sa_owners",
        "contact_job_title": ["owner"],
        "contact_location": ["south africa"],
        "company_keywords": ["private school", "independent school", "college", "academy"],
        "email_status": ["validated"]}},
]

def main():
    print("School AI Apify Lead Launcher\n")
    print(f"  Actor: {ACTOR}")
    print(f"  Searches: {len(SEARCHES)}")
    print(f"  Target: {sum(s['params']['fetch_count'] for s in SEARCHES):,} leads\n")

    runs = []
    for i, search in enumerate(SEARCHES, 1):
        label = search["label"]
        print(f"  [{i}/{len(SEARCHES)}] {label} ... ", end="", flush=True)
        try:
            r = requests.post(f"{BASE_URL}/acts/{ACTOR}/runs", headers=HEADERS,
                            json=search["params"], timeout=20)
            if r.status_code == 403:
                print("PERMISSION DENIED")
                print("    Go to: https://console.apify.com/actors/IoSHqwTR9YGhzccez")
                print("    Click 'Approve' then re-run")
                sys.exit(1)
            if r.status_code not in (200, 201):
                print(f"❌ HTTP {r.status_code}: {r.text[:150]}")
                continue
            data = r.json().get("data", {})
            run_id = data.get("id")
            if run_id:
                runs.append({"run_id": run_id, "label": label,
                           "status": data.get("status", "UNKNOWN"),
                           "launched": time.strftime("%Y-%m-%d %H:%M:%S")})
                print(f"OK {run_id[:12]}...")
            else:
                print(f"No run ID: {json.dumps(data)[:100]}")
        except Exception as e:
            print(f"ERROR: {e}")
        time.sleep(1)

    os.makedirs("leads", exist_ok=True)
    tracker = {"launched_at": time.strftime("%Y-%m-%d %H:%M:%S"),
               "actor": ACTOR, "runs": runs}
    with open("leads/apify_runs.json", "w") as f:
        json.dump(tracker, f, indent=2, ensure_ascii=False)

    print(f"\nLaunched {len(runs)}/{len(SEARCHES)} searches")
    print(f"  Tracker: leads/apify_runs.json")
    print(f"  Next: python collect_leads.py (wait 5-10 min)")

if __name__ == "__main__":
    main()
