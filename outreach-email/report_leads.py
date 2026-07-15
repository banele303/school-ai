#!/usr/bin/env python3
"""Immediate lead report - known schools + merge"""
import json, os, csv
from datetime import datetime
from pathlib import Path

# Load known schools
known_path = r"C:\Users\Mr Ness\Documents\Ai\sa-private-schools-outreach\output\leads.json"
with open(known_path, encoding="utf-8") as f:
    known = json.load(f)

print(f"=== KNOWN SCHOOLS DATABASE ===\n")
print(f"Total schools: {len(known)}")

# Count by province
by_prov = {}
for s in known:
    p = s.get("province", "Unknown")
    by_prov[p] = by_prov.get(p, 0) + 1
print(f"\nBy Province:")
for p, c in sorted(by_prov.items(), key=lambda x: -x[1]):
    print(f"  {p}: {c}")

# Count by type
by_type = {}
for s in known:
    t = s.get("type", "Unknown")
    by_type[t] = by_type.get(t, 0) + 1
print(f"\nBy Type:")
for t, c in sorted(by_type.items(), key=lambda x: -x[1]):
    if t:
        print(f"  {t}: {c}")

# Emails
with_email = sum(1 for s in known if s.get("email"))
with_phone = sum(1 for s in known if s.get("phone"))
with_website = sum(1 for s in known if s.get("website"))
print(f"\nContact Info:")
print(f"  With email:   {with_email}")
print(f"  With phone:   {with_phone}")
print(f"  With website: {with_website}")

# Top 20 schools with email
print(f"\n=== TOP 20 SCHOOLS WITH EMAIL ===")
with_emails = [s for s in known if s.get("email")]
for i, s in enumerate(with_emails[:20], 1):
    name = s.get("name", "")
    email = s.get("email", "")
    city = s.get("city", "")
    prov = s.get("province", "")
    print(f"  {i:2d}. {name:40s} | {email:30s} | {city}, {prov}")
