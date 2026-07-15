#!/usr/bin/env python3
"""Send remaining 8 leads with shorter delays"""
import sys, os, csv, time, random, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

os.environ["SMTP_USER"] = "alexsouthflow2@gmail.com"
os.environ["SMTP_PASS"] = "velsszvjfqjvyfdk"
os.environ["SENDER_NAME"] = "Alex"
os.environ["SENDER_PHONE"] = ""

from send_campaign import fill_template, send_email, save_state, log_send, load_state

path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "leads", "leads_for_email.csv")
with open(path, encoding="utf-8") as f:
    leads = list(csv.DictReader(f))

# Load state to see what's already sent
state = load_state()
already_sent = set(state.get("sent_to", []))

remaining = [l for l in leads if l["email"].strip() not in already_sent]
print(f"Already sent: {len(already_sent)}")
print(f"Remaining: {len(remaining)}\n")

for i, l in enumerate(remaining, 1):
    subject, body = fill_template("all_services", l)
    email = l["email"].strip()
    
    print(f"  [{i}/{len(remaining)}] {l['company'][:35]} <{email}> ... ", end="", flush=True)
    
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
    
    if i < len(remaining):
        delay = random.randint(10, 25)
        print(f"  waiting {delay}s...")
        time.sleep(delay)

print(f"\nDone! Total sent: {state['today_sent']}, Failed: {state['total_failed']}")
