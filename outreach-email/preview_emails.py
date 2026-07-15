#!/usr/bin/env python3
import sys
sys.path.insert(0, r"C:\Users\Mr Ness\Documents\Ai\school ai\outreach-email")
from send_campaign import fill_template

lead = {
    "first_name": "Johan",
    "name": "Johan van der Merwe",
    "company": "St John's College",
    "role": "Principal",
    "city": "Johannesburg",
    "location": "Gauteng",
    "email": "johan@stjohnscollege.co.za"
}

for name in ["all_services"]:
    subject, body = fill_template(name, lead)
    print(f"{'='*70}")
    print(f"  TEMPLATE: {name.upper()}")
    print(f"{'='*70}")
    print(f"  Subject: {subject}")
    print(f"  To: {lead['name']} <{lead['email']}>")
    print(f"{'─'*70}")
    print(body)
    print()
