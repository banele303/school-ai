#!/usr/bin/env python3
import json, requests, sys

with open('.token') as f:
    t=f.read().strip()
h={'Authorization':'Bearer '+t}
b='https://api.apify.com/v2'
base_runs='https://api.apify.com/v2/actor-runs'

with open('leads/apify_runs.json') as f:
    d=json.load(f)

print("Checking Apify run statuses...\n")
for run in d['runs']:
    rid=run['run_id']
    lbl=run['label']
    try:
        r=requests.get(base_runs+'/'+rid, headers=h, timeout=15)
        if r.status_code in(200,201):
            rd=r.json().get('data',{})
            s=rd.get('status','?')
            ds=rd.get('defaultDatasetId','-')
            print(f"  {lbl:25s} -> {s:15s} dataset: {ds}")
        else:
            print(f"  {lbl:25s} -> HTTP {r.status_code}: {r.text[:80]}")
    except Exception as e:
        print(f"  {lbl:25s} -> Error: {e}")
