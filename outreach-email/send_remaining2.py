#!/usr/bin/env python3
"""Send to remaining clean schools"""
import sys, os, csv, time, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

os.environ["SMTP_USER"] = "alexsouthflow2@gmail.com"
os.environ["SMTP_PASS"] = "velsszvjfqjvyfdk"
os.environ["SENDER_NAME"] = "Alex"

from send_campaign import fill_template, send_email, save_state, log_send, load_state

path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "leads", "leads_for_email.csv")
with open(path, encoding="utf-8") as f:
    all_leads = list(csv.DictReader(f))

# Already sent
sent = {
    "communications@stjohnscollege.co.za",
    "admissions@stmary.co.za", "college@stdavids.co.za",
    "info@kes.co.za", "t.spangenberg@yeshivacollege.co.za",
    "admissions@brescia.co.za", "admin@stkatharines.co.za",
    "info@ridgeschool.co.za", "info@boyshigh.com",
    "affies@affies.co.za", "info@cornwallhill.org",
    "clifton@cliftonschool.co.za",
}

# Bad emails to skip
bad_domains = ['icloud.com', 'gmail.com', 'yahoo.com', 'outlook.com', 'one2love.co.za',
               'chiropracto.com', 'n12treasureroute.co.za']
bad_emails = ['user@domain.com']

remaining = []
for l in all_leads:
    email = l.get('email', '').strip().replace('%20', '')
    if not email or email in sent:
        continue
    domain = email.split('@')[1] if '@' in email else ''
    if domain in bad_domains or email in bad_emails:
        print(f"  SKIP: {l.get('company','?')[:35]:35s} -> {email} (bad)")
        continue
    l['email'] = email
    remaining.append(l)

print(f"\nSending to {len(remaining)} schools:\n")
for i, l in enumerate(remaining, 1):
    print(f"  {i:2d}. {l.get('company','?')[:40]:40s} -> {l['email'][:40]}")

state = load_state()

print(f"\nStarting send...\n")
for i, l in enumerate(remaining, 1):
    subject, body = fill_template("all_services", l)
    email = l["email"]
    
    print(f"  [{i}/{len(remaining)}] {l['company'][:35]} <{email}> ... ", end="", flush=True)
    success, error = send_email(email, l.get("first_name", ""), subject, body)
    
    if success:
        print("sent")
        state["today_sent"] += 1
        state["total_sent"] += 1
        state["sent_to"].append(email)
        log_send(l, "all_services", "sent")
    else:
        print(f"FAILED: {error[:40]}")
        state["total_failed"] += 1
        log_send(l, "all_services", "failed", error)
    
    save_state(state)
    
    if i < len(remaining):
        delay = random.randint(15, 30)
        print(f"  wait {delay}s...")
        time.sleep(delay)

print(f"\nDone! Sent: {state['today_sent']}, Failed: {state['total_failed']}")
print(f"Total campaign sent: {state['total_sent']}")
