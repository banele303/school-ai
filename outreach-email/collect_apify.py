#!/usr/bin/env python3
"""Collect all Apify results and merge with known schools database"""
import json, requests, time, csv
from datetime import datetime
from pathlib import Path

with open('.token') as f:
    TOKEN=f.read().strip()
H={'Authorization':'Bearer '+TOKEN}
BASE='https://api.apify.com/v2'
RUNS_BASE='https://api.apify.com/v2/actor-runs'

with open('leads/apify_runs.json') as f:
    data=json.load(f)

all_leads = []

for run in data['runs']:
    rid=run['run_id']
    lbl=run['label']
    dataset_id=None
    
    # Get dataset ID
    try:
        r=requests.get(RUNS_BASE+'/'+rid, headers=H, timeout=15)
        if r.status_code in(200,201):
            dataset_id=r.json().get('data',{}).get('defaultDatasetId')
    except:
        pass
    
    if dataset_id:
        try:
            r=requests.get(BASE+'/datasets/'+dataset_id+'/items', headers=H, timeout=30)
            items=r.json()
            if isinstance(items, list):
                run['item_count']=len(items)
                all_leads.extend(items)
                print(f"  {lbl:25s} -> {len(items)} leads")
            else:
                run['item_count']=0
                print(f"  {lbl:25s} -> 0 leads (unexpected format)")
        except Exception as e:
            run['item_count']=0
            print(f"  {lbl:25s} -> Error: {e}")
    else:
        run['item_count']=0
        print(f"  {lbl:25s} -> 0 leads (no dataset)")

print(f"\nTotal leads collected from Apify: {len(all_leads)}")

# Save raw
with open('leads/apify_raw.json', 'w', encoding='utf-8') as f:
    json.dump(all_leads, f, indent=2, ensure_ascii=False)

# Save CSV
if all_leads:
    fieldnames=set()
    for lead in all_leads[:100]:
        fieldnames.update(lead.keys())
    fieldnames=sorted(fieldnames)
    with open('leads/apify_raw.csv', 'w', newline='', encoding='utf-8') as f:
        w=csv.DictWriter(f, fieldnames=fieldnames, extrasaction='ignore')
        w.writeheader()
        w.writerows(all_leads)

# Count emails in Apify data
with_email=sum(1 for l in all_leads if l.get('email') or l.get('business_email'))
print(f"  With email: {with_email}")

# Save tracker
data['collected_at']=datetime.now().isoformat()
data['stats']={'total_leads':len(all_leads), 'with_email':with_email}
with open('leads/apify_runs.json','w') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print(f"\nSaved to: leads/apify_raw.json + apify_raw.csv")
print(f"Next: python merge_dedupe.py")
