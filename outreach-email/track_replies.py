#!/usr/bin/env python3
"""
track_replies.py — Check Gmail for replies to School AI outreach emails.
Connects via IMAP, searches for replies matching sent subject patterns.
Usage:
  python track_replies.py                          # Show all replies found
  python track_replies.py --live                   # Show + update campaign state
  python track_replies.py --watch                  # Keep polling every 60s
  python track_replies.py --subject "keyword"      # Search for specific subject
"""
import imaplib, email, os, sys, json, csv, re, time
from datetime import datetime, date
from email.utils import parsedate_to_datetime

IMAP_HOST = "imap.gmail.com"
IMAP_PORT = 993
SMTP_USER = os.environ.get("SMTP_USER", "alexsouthflow2@gmail.com")
SMTP_PASS = os.environ.get("SMTP_PASS", "")  # App Password

# Our sent subjects start with these patterns
SUBJECT_PATTERNS = [
    r"9 AI tools for",
    r"quick question about",
    r"what happens when your students",
    r"are your parent messages",
    r"what if your online classes",
    r"closing the loop",
]

CAMPAIGN_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "output")
CAMPAIGN_STATE = os.path.join(CAMPAIGN_DIR, "campaign_state.json")
SEND_LOG = os.path.join(CAMPAIGN_DIR, "send_log.csv")
REPLIES_LOG = os.path.join(CAMPAIGN_DIR, "replies_log.json")

def connect():
    """Connect to Gmail IMAP."""
    if not SMTP_PASS:
        SMTP_PASS_local = os.environ.get("SMTP_PASS", "")
        if not SMTP_PASS_local:
            print("ERROR: Set SMTP_USER and SMTP_PASS environment variables.")
            print("  SMTP_USER=alexsouthflow2@gmail.com")
            print("  SMTP_PASS=your_16_char_app_password")
            sys.exit(1)
    else:
        SMTP_PASS_local = SMTP_PASS
        
    mail = imaplib.IMAP4_SSL(IMAP_HOST, IMAP_PORT)
    mail.login(SMTP_USER, SMTP_PASS_local)
    return mail

def fetch_inbox(mail, limit=50):
    """Fetch recent emails from inbox."""
    mail.select("INBOX")
    status, messages = mail.search(None, "ALL")
    if status != "OK":
        return []
    
    msg_ids = messages[0].split()
    # Get the most recent ones
    recent = msg_ids[-limit:] if len(msg_ids) > limit else msg_ids
    recent.reverse()  # newest first
    
    emails = []
    for mid in recent:
        status, msg_data = mail.fetch(mid, "(RFC822.HEADER)")
        if status != "OK":
            continue
        raw = msg_data[0][1].decode("utf-8", errors="replace")
        msg = email.message_from_string(raw)
        
        subject = msg.get("Subject", "")
        from_addr = msg.get("From", "")
        to_addr = msg.get("To", "")
        date_str = msg.get("Date", "")
        
        # Parse date
        try:
            dt = parsedate_to_datetime(date_str)
        except:
            dt = None
        
        emails.append({
            "msg_id": mid.decode() if isinstance(mid, bytes) else str(mid),
            "subject": subject,
            "from": from_addr,
            "to": to_addr,
            "date": dt.isoformat() if dt else date_str,
            "date_ts": dt.timestamp() if dt else 0,
        })
    
    return emails

def is_reply(subject):
    """Check if a subject matches one of our sent email patterns."""
    if not subject or not subject.lower().startswith("re:"):
        return False
    for pattern in SUBJECT_PATTERNS:
        if pattern.lower() in subject.lower():
            return True
    return False

def extract_school_info(reply, sent_log):
    """Try to match a reply back to a school in our send log."""
    from_email = reply["from"]
    
    # Try matching by sender email
    for entry in sent_log:
        if entry.get("email", "").lower() in from_email.lower():
            return entry.get("company", "?")
    
    # Try by subject
    for entry in sent_log:
        sent_subject = entry.get("subject", "")
        if sent_subject and sent_subject[3:].strip() in reply["subject"]:  # skip "Re: "
            return entry.get("company", "?")
    
    return None

def load_replies_log():
    if os.path.exists(REPLIES_LOG):
        with open(REPLIES_LOG) as f:
            return json.load(f)
    return {"replies": [], "last_checked": None}

def save_replies_log(data):
    os.makedirs(CAMPAIGN_DIR, exist_ok=True)
    with open(REPLIES_LOG, "w") as f:
        json.dump(data, f, indent=2)

def load_send_log():
    if not os.path.exists(SEND_LOG):
        return []
    with open(SEND_LOG, encoding="utf-8") as f:
        return list(csv.DictReader(f))

def main():
    import argparse
    parser = argparse.ArgumentParser(description="Track School AI email replies")
    parser.add_argument("--watch", action="store_true", help="Keep polling every 60s")
    parser.add_argument("--subject", help="Search by subject keyword")
    parser.add_argument("--live", action="store_true", help="Update campaign state with replies")
    parser.add_argument("--limit", type=int, default=100, help="Recent emails to scan")
    args = parser.parse_args()

    if args.watch:
        poll_loop(args)
        return
    
    run_once(args)

def run_once(args):
    print("Connecting to Gmail...")
    mail = connect()
    
    print(f"Scanning last {args.limit} emails...\n")
    emails = fetch_inbox(mail, limit=args.limit)
    
    if args.subject:
        replies = [e for e in emails if args.subject.lower() in e["subject"].lower()]
    else:
        replies = [e for e in emails if is_reply(e["subject"])]
    
    sent_log = load_send_log()
    
    if not replies:
        print("📭 No replies found matching your campaign subjects.")
        return
    
    print(f"📬 Found {len(replies)} replies!\n")
    print(f"{'#':>2} {'Date':20s} {'From':40s} {'Subject':60s}")
    print("-" * 125)
    
    for i, r in enumerate(replies, 1):
        date_short = r["date"][:19] if r["date"] else "?"
        from_short = r["from"][:38]
        subj_short = r["subject"][:58]
        print(f"  {i:2d} {date_short:20s} {from_short:40s} {subj_short:60s}")
    
    # Try to match to schools
    print(f"\n--- School Matches ---")
    for r in replies:
        school = extract_school_info(r, sent_log)
        if school:
            print(f"  ✅ {r['from'][:35]:35s} -> {school}")
        else:
            print(f"  ❓ {r['from'][:35]:35s} -> Unknown (could be new lead)")
    
    # Save to replies log
    log = load_replies_log()
    for r in replies:
        reply_id = r["msg_id"]
        existing = [x for x in log["replies"] if x["msg_id"] == reply_id]
        if not existing:
            log["replies"].append(r)
    log["last_checked"] = datetime.now().isoformat()
    save_replies_log(log)
    print(f"\nSaved {len(replies)} replies to {REPLIES_LOG}")
    
    # Update campaign state if --live
    if args.live and os.path.exists(CAMPAIGN_STATE):
        with open(CAMPAIGN_STATE) as f:
            state = json.load(f)
        replied_emails = []
        for r in replies:
            # Extract email from "Name <email>" format
            match = re.search(r'<([^>]+)>', r["from"])
            if match:
                replied_emails.append(match.group(1).lower())
        state["replied"] = list(set(state.get("replied", []) + replied_emails))
        state["replies_found"] = len(state.get("replied", []))
        with open(CAMPAIGN_STATE, "w") as f:
            json.dump(state, f, indent=2)
        print(f"Updated campaign state with {len(replied_emails)} repliers")
    
    mail.logout()

def poll_loop(args):
    """Keep polling every 60 seconds."""
    print("📡 Watching for replies (Ctrl+C to stop)...\n")
    try:
        while True:
            print(f"[{datetime.now().strftime('%H:%M:%S')}] Checking...", end=" ")
            mail = connect()
            emails = fetch_inbox(mail, limit=100)
            replies = [e for e in emails if is_reply(e["subject"])]
            
            log = load_replies_log()
            seen_ids = {r["msg_id"] for r in log["replies"]}
            new_replies = [r for r in replies if r["msg_id"] not in seen_ids]
            
            if new_replies:
                print(f"\n  🎯 {len(new_replies)} NEW REPLY(IES)!")
                for r in new_replies:
                    print(f"     From: {r['from'][:40]}")
                    print(f"     Subj: {r['subject'][:60]}")
                    print(f"     Time: {r['date'][:19]}")
                    print()
                log["replies"].extend(new_replies)
                log["last_checked"] = datetime.now().isoformat()
                save_replies_log(log)
            else:
                print("no new replies")
            
            mail.logout()
            
            for i in range(60, 0, -1):
                print(f"\r  Next check in {i}s...  ", end="", flush=True)
                time.sleep(1)
            print()
    except KeyboardInterrupt:
        print("\nStopped watching.")

if __name__ == "__main__":
    main()
