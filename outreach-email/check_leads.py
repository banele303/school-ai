#!/usr/bin/env python3
import json, requests
from pathlib import Path

with open('.token') as f:
    TOKEN=f.read...DERS = {'Authorization': 'Bearer ' + TOKEN, 'Content-Type': 'application/json'}
BASE = "https://api.apify.com/v2"

with open("leads/apify_runs.json") as f:
    data = json.load(f)

for run in data["runs"]:
    rid = run["run_id"]
    label = run["label"]
    try:
        r = requests.get(f"{BASE}/runs/{rid}", headers=HEADERS, timeout=15)
        if r.status_code in (200, 201):
            d = r.json().get("data", {})
            status = d.get("status", "UNKNOWN")
            dataset = d.get("defaultDatasetId", "none")
            print(f"  {label:25s} -> {status:15s}  dataset: {dataset}")
        else:
            print(f"  {label:25s} -> HTTP {r.status_code}")
    except Exception as e:
        print(f"  {label:25s} -> Error: {e}")

# Check if known database exists
known_path = r"C:\Users\Mr Ness\Documents\Ai\sa-private-schools-outreach\output\leads.json"
if Path(known_path).exists():
    with open(known_path) as f:
        known = json.load(f)
    print(f"\nKnown schools database: {len(known)} schools found!")
else:
    print(f"\nKnown schools database: NOT FOUND at {known_path}")
