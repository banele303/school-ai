#!/usr/bin/env python3
import csv, json, os

BASE = r"C:\Users\Mr Ness\Documents\Ai\school ai\outreach-email"
path = os.path.join(BASE, "leads", "leads_for_email.csv")

with open(path, encoding="utf-8") as f:
    reader = csv.DictReader(f)
    leads = list(reader)

fixed = []
for l in leads:
    if not l.get('email'):
        continue
    email = l['email'].strip().replace('%20', '')
    l['email'] = email
    company = l.get('company', '')
    if not l.get('first_name'):
        l['first_name'] = 'Principal'
        l['name'] = f"Principal at {company}"
    fixed.append(l)

with open(path, "w", newline="", encoding="utf-8") as f:
    fieldnames = ["first_name", "name", "company", "role", "email", "phone", "city", "priority_score", "source"]
    writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
    writer.writeheader()
    writer.writerows(fixed)

print(f"Cleaned {len(fixed)} leads")
for i, l in enumerate(fixed, 1):
    print(f"  {i:2d}. {l['first_name']:12s} <{l['email']:40s}> | {l['company'][:35]}")
