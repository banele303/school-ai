#!/usr/bin/env python3
"""
collect_leads.py - Collect Apify Leads Finder results after searches complete.
Run AFTER launch_apify.py: python collect_leads.py
"""
import json, os, sys, time, requests, csv

TOKEN = None
token_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".token")
if os.path.exists(token_path):
    with open(token_path) as f:
        TOKEN = f.read().strip()
if not TOKEN:
    TOKEN = os.environ.get("APIFY_TOKEN", "")
if not TOKEN:
    print("ERROR: No Apify token found. Run launch_apify.py first or set APIFY_TOKEN.")
    sys.exit(1)

BASE_URL = "https://api.apify.com/v2"
HEADERS = {"Authorization": f"Bearer {TOKEN}"}
TRACKER_FILE = "leads/apify_runs.json"

if not os.path.exists(TRACKER_FILE):
    print("ERROR: leads/apify_runs.json not found. Run launch_apify.py first.")
    sys.exit(1)

with open(TRACKER_FILE) as f:
    data = json.load(f)

runs = data.get("runs", [])
print(f"Collecting results from {len(runs)} Apify runs...\n")

all_leads = []
stats = {"succeeded": 0, "failed": 0, "running": 0, "total_leads": 0}

for i, run in enumerate(runs, 1):
    label = run["label"]
    run_id = run["run_id"]
    print(f"  [{i}/{len(runs)}] {label} ({run_id[:12]}...) ", end="", flush=True)

    status = None
    for attempt in range(30):
        try:
            r = requests.get(f"{BASE_URL}/runs/{run_id}", headers=HEADERS, timeout=15)
            if r.status_code not in (200, 201):
                print(f"HTTP {r.status_code}")
                break
            status = r.json().get("data", {}).get("status")
            if status in ("SUCCEEDED", "FAILED", "ABORTED", "TIMED-OUT"):
                break
        except Exception as e:
            print(f"poll err: {e}")
            break
        time.sleep(10)

    run["status"] = status
    print(f"{status} ", end="")

    if status == "SUCCEEDED":
        stats["succeeded"] += 1
        dataset_id = None
        try:
            r = requests.get(f"{BASE_URL}/runs/{run_id}", headers=HEADERS, timeout=15)
            dataset_id = r.json().get("data", {}).get("defaultDatasetId")
        except:
            pass
        if dataset_id:
            try:
                r = requests.get(f"{BASE_URL}/datasets/{dataset_id}/items",
                               headers=HEADERS, timeout=60)
                items = r.json()
                if isinstance(items, list):
                    all_leads.extend(items)
                    run["item_count"] = len(items)
                    stats["total_leads"] += len(items)
                    print(f"(+{len(items)} leads)")
                else:
                    run["item_count"] = 0
                    print("(0 leads)")
            except Exception as e:
                run["item_count"] = 0
                print(f"(fetch err: {e})")
        else:
            run["item_count"] = 0
            print("(no dataset)")
    elif status in ("FAILED", "ABORTED", "TIMED-OUT"):
        stats["failed"] += 1
        run["item_count"] = 0
        print("")
    else:
        stats["running"] += 1
        run["item_count"] = 0
        print("(still running)")

os.makedirs("leads", exist_ok=True)

with open("leads/apify_raw.json", "w", encoding="utf-8") as f:
    json.dump(all_leads, f, indent=2, ensure_ascii=False)

if all_leads:
    fieldnames = set()
    for lead in all_leads[:100]:
        fieldnames.update(lead.keys())
    fieldnames = sorted(fieldnames)
    with open("leads/apify_raw.csv", "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(all_leads)

data["collected_at"] = time.strftime("%Y-%m-%d %H:%M:%S")
data["stats"] = stats
with open(TRACKER_FILE, "w") as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print(f"\n{'='*55}")
print(f"  COLLECTION COMPLETE")
print(f"  Succeeded: {stats['succeeded']}/{len(runs)}")
print(f"  Failed:    {stats['failed']}")
print(f"  Still running: {stats['running']}")
print(f"  Total leads:   {stats['total_leads']}")
print(f"  Saved: leads/apify_raw.json + leads/apify_raw.csv")
print(f"{'='*55}")
print(f"  Next: python merge_dedupe.py")
