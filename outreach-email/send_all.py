#!/usr/bin/env python3
"""Send to all 12 leads - no interactive prompt"""
import sys, os, csv, time, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

os.environ["SMTP_USER"] = "alexsouthflow2@gmail.com"
os.environ["SMTP_PASS"] = "velsszvjfqjvyfdk"
os.environ["SENDER_NAME"] = "Alex"
os.environ["SENDER_PHONE"] = ""

from send_campaign import fill_template, send_email, save_state, log_send, load_state

path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "leads", "leads_for_email.csv")
with open(path, encoding="utf-8") as f:
    leads = list(csv.DictReader(f))

state = load_state()
state["today_sent"] = 0

print(f"Sending to {len(leads)} schools...\n")

for i, l in enumerate(leads, 1):
    subject, body = fill_template("all_services", l)
    email = l["email"].strip()
    
    print(f"  [{i}/{len(leads)}] {l['first_name']} @ {l['company'][:35]} <{email}> ... ", end="", flush=True)
    
    success, error = send_email(email, l.get("first_name", ""), subject, body)
    
    if success:
        print("sent")
        state["today_sent"] += 1
        state["total_sent"] += 1
        state["sent_to"].append(email)
        log_send(l, "all_services", "sent")
    else:
        print(f"FAILED: {error[:50]}")
        state["total_failed"] += 1
        log_send(l, "all_services", "failed", error)
    
    save_state(state)
    
    if i < len(leads):
        delay = random.randint(45, 120)
        print(f"       waiting {delay}s...", end="", flush=True)
        time.sleep(delay)
        print(" done")
    
    if i % 10 == 0 and i < len(leads):
        print("  Batch pause 5 min...")
        time.sleep(300)

print(f"\nDone! Sent: {state['today_sent']}, Failed: {state['total_failed']}")
