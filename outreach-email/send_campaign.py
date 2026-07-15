#!/usr/bin/env python3
"""
send_campaign.py - Cold email sender for School AI outreach to SA private schools.
Usage:
  python send_campaign.py --dry-run --template intro
  python send_campaign.py --dry-run --template intro --lead 0
  python send_campaign.py --live --template intro --limit 25
  python send_campaign.py --status
  python send_campaign.py --list-templates
"""
import csv, json, os, random, smtplib, sys, time, re
from datetime import datetime, date
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.utils import formataddr

# ══════════════════════════════════════════════════════════════════════════
# SMTP / SENDER CONFIG
# ══════════════════════════════════════════════════════════════════════════
SMTP_HOST = os.environ.get("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
SMTP_USER = os.environ.get("SMTP_USER", "")       # alexsouthflow2@gmail.com
SMTP_PASS = os.environ.get("SMTP_PASS", "")       # 16-char App Password

SENDER_NAME = os.environ.get("SENDER_NAME", "Alex")
SENDER_COMPANY = os.environ.get("SENDER_COMPANY", "Majestic Dev")
SENDER_WEBSITE = os.environ.get("SENDER_WEBSITE", "majesticdev.co.za")
SENDER_PHONE = os.environ.get("SENDER_PHONE", "")
CALENDLY_LINK = os.environ.get("CALENDLY_LINK", "")
DEMO_VIDEO_LINK = os.environ.get("DEMO_VIDEO_LINK", "")
UNSUBSCRIBE_URL = os.environ.get("UNSUBSCRIBE_URL", "")

DAILY_LIMIT = 50
DELAY_MIN, DELAY_MAX = 45, 120
BATCH_SIZE = 10
BATCH_PAUSE = 300

STATUS_FILE = "output/campaign_state.json"
SEND_LOG = "output/send_log.csv"
LEADS_FILE = "leads/leads_for_email.csv"

# ══════════════════════════════════════════════════════════════════════════
# SCHOOL AI PRODUCT PITCH
# ══════════════════════════════════════════════════════════════════════════
# School AI: All-in-one platform for private schools in SA
# - AI Exam Creator (generates exam questions by class difficulty)
# - AI Exam Marker (auto-grades, feedback reports)
# - Live Online Classes (built-in virtual classroom)
# - AI Student Chat (24/7 homework help, Q&A for learners)
# - School Communication Hub (messaging app for teachers/parents/students)
# - Announcements Board (push notifications to all stakeholders)
# - Student Self-Study & Competitions (gamified revision + inter-school challenges)
# - Digital Whiteboard (for teachers, interactive tools)
# - Student Application Portal (online admissions, tracking)
# ══════════════════════════════════════════════════════════════════════════

# ══════════════════════════════════════════════════════════════════════════
# SINGLE EMAIL — all 9 services, concise, no fluff
# ══════════════════════════════════════════════════════════════════════════

TEMPLATES = {
    "high_impact": {
        "subject": "10+ hours back for your teachers?",
        "body": """{first_name},

I notice you run {company} and wanted to ask a quick question:

If you could cut your teachers' weekly workload by 10+ hours while giving your students 24/7 homework support, would it be worth a 10-minute look?

We built School AI—an all-in-one software platform engineered specifically for private schools in South Africa. It runs seamlessly on both WhatsApp and web with zero technical training required.

Here is how it solves your biggest overheads:

AI Exam Suite: Generates full exams and auto-grades them with per-question feedback in minutes, saving teachers hours of admin.

24/7 Student Tutor: Provides automated homework help in the learner's own language, plus gamified revision to boost marks.

Unified Admin & Comms: Replaces all messy WhatsApp groups, notice boards, and virtual classroom fees with a single login.

A private school right here in Johannesburg recently deployed this software—their teachers saved over 10 hours a week, and student engagement jumped from 40% to 85%.

Worth a quick look? I can send over a 2-minute demo video or we can jump on a brief call.

Best regards,
{sender_name}
{sender_company}
{website}
{unsubscribe_url}""",
    },
    "short_punchy": {
        "subject": "Cutting teacher workload by 10+ hrs/week",
        "body": """{first_name},

With teacher burnout at an all-time high, we're helping SA private schools cut teacher workloads by 10+ hours a week while boosting student engagement.

We built School AI—a software platform that automates exam creation/marking, consolidates school communication, and gives students 24/7 homework support via WhatsApp and web.

A Johannesburg school using the platform just watched their student engagement jump from 40% to 85% while giving teachers their weekends back.

I have a 2-minute demo video that shows exactly how the software works. Do you have a moment to check it out?

Best,
{sender_name}
{sender_company}
{website}
{unsubscribe_url}""",
    },
    "whatsapp": {
        "subject": "",
        "body": """Hi {first_name}, hope you're well. I came across {company} and wanted to reach out.

Quick question: If you could cut your teachers' workload by 10+ hours a week and give your students 24/7 homework help right here on WhatsApp, would that be worth a quick look?

We built School AI for South African private schools. It lets teachers generate and grade exams in minutes, replaces messy parent WhatsApp groups, and gives students localized AI tutoring. A Joburg school using it saw engagement jump to 85%.

No training or complicated setup needed.

Can I drop a 2-minute video link here for you to see how it works?

Cheers,
{sender_name} ({sender_company})""",
    },
    "all_services": {
        "subject": "{first_name}, 9 AI tools for {company} (2-min overview)",
        "body": """{first_name},

Its Alex from Majestic Dev and noticed {company} online.

Quick question - if you could cut teacher workload by 10+ hours a week AND give
students 24/7 homework support, would it be worth 10 minutes of your time?

We build AI School software for private schools like yours in SA.
Here's everything it does:

📝 EXAMS
  • AI Exam Creator → generates full exams by difficulty in 10 min (not 3 hrs)
  • AI Exam Marker → auto-grades with per-question feedback in 2 min (not 2 hrs)

🎓 STUDENTS
  • AI Student Chat → 24/7 homework help in the learner's own language
  • Self-Study & Competitions → gamified revision with points, badges, leaderboards

📡 COMMUNICATION
  • Messaging Hub → replaces all WhatsApp groups with one platform
  • Announcements Board → push notifications with read receipts

🖥️ CLASSROOM
  • Live Online Classes → built-in virtual classroom, no Zoom fees
  • Digital Whiteboard → interactive teaching tools on any screen

📋 ADMIN
  → Application Portal → online admissions, document tracking, auto-responses

All on WhatsApp + web. Zero training. One login.

A Johannesburg school using this saved teachers 10+ hours/week and saw student
engagement jump from 40% to 85%.

Worth a quick look? Happy to send a 2-min demo video or jump on a 10-min call.

{sender_name}
{sender_company}
{website}
{unsubscribe_url}""",
    },
}

# ══════════════════════════════════════════════════════════════════════════
# FUNCTIONS
# ══════════════════════════════════════════════════════════════════════════

def load_leads():
    if not os.path.exists(LEADS_FILE):
        print(f"ERROR: {LEADS_FILE} not found. Run merge_dedupe.py first.")
        sys.exit(1)
    with open(LEADS_FILE, encoding="utf-8") as f:
        return list(csv.DictReader(f))

def load_state():
    if os.path.exists(STATUS_FILE):
        with open(STATUS_FILE) as f:
            return json.load(f)
    return {
        "started_at": datetime.now().isoformat(),
        "day_number": 0,
        "today_sent": 0,
        "total_sent": 0,
        "total_failed": 0,
        "sent_to": [],
        "last_send_date": str(date.today()),
    }

def save_state(state):
    os.makedirs(os.path.dirname(STATUS_FILE), exist_ok=True)
    with open(STATUS_FILE, "w") as f:
        json.dump(state, f, indent=2)

def log_send(lead, template_name, status, error=""):
    os.makedirs(os.path.dirname(SEND_LOG), exist_ok=True)
    file_exists = os.path.exists(SEND_LOG)
    with open(SEND_LOG, "a", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        if not file_exists:
            writer.writerow(["timestamp", "email", "name", "company", "template",
                             "subject", "status", "error"])
        writer.writerow([
            datetime.now().isoformat(),
            lead.get("email", ""),
            lead.get("name", ""),
            lead.get("company", ""),
            template_name,
            "",
            status,
            error,
        ])

def fill_template(template_name, lead):
    tmpl = TEMPLATES.get(template_name)
    if not tmpl:
        print(f"ERROR: Unknown template '{template_name}'")
        sys.exit(1)
    first = lead.get("first_name", "").strip()
    if not first:
        first = (lead.get("name", "") or "there").split()[0]
    vars_ = {
        "first_name": first or "there",
        "company": lead.get("company", "your school"),
        "role": lead.get("role", ""),
        "city": lead.get("city", ""),
        "province": lead.get("location", ""),
        "sender_name": SENDER_NAME,
        "sender_company": SENDER_COMPANY,
        "website": SENDER_WEBSITE,
        "sender_phone": SENDER_PHONE,
        "calendly_link": CALENDLY_LINK or "#",
        "demo_video_link": DEMO_VIDEO_LINK or "#",
        "unsubscribe_url": UNSUBSCRIBE_URL or "#",
    }
    subject = tmpl["subject"]
    body = tmpl["body"]
    for k, v in vars_.items():
        subject = subject.replace("{" + k + "}", str(v))
        body = body.replace("{" + k + "}", str(v))
    return subject, body

def send_email(to_email, to_name, subject, body):
    if not SMTP_USER or not SMTP_PASS:
        return False, "SMTP credentials not configured"
    msg = MIMEMultipart("alternative")
    msg["From"] = formataddr((SENDER_NAME, SMTP_USER))
    msg["To"] = formataddr((to_name, to_email))
    msg["Subject"] = subject
    msg["Reply-To"] = SMTP_USER
    msg["List-Unsubscribe"] = f"<{UNSUBSCRIBE_URL or '#'}>"
    body_html = body.replace("\n", "<br>\n")
    msg.attach(MIMEText(body, "plain", "utf-8"))
    msg.attach(MIMEText(f"<html><body>{body_html}</body></html>", "html", "utf-8"))
    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=30) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.send_message(msg)
        return True, ""
    except Exception as e:
        return False, str(e)

def preview(template_name, lead, index):
    subject, body = fill_template(template_name, lead)
    print(f"\n{'─'*70}")
    print(f"  PREVIEW #{index+1} | Template: {template_name}")
    print(f"{'─'*70}")
    print(f"  To:      {lead.get('name', '?')} <{lead.get('email', 'no email')}>")
    print(f"  Company: {lead.get('company', '?')}")
    print(f"  Role:    {lead.get('role', '?')}")
    print(f"  Subject: {subject}")
    print(f"{'─'*70}")
    print(body)
    print(f"{'─'*70}")

def run_campaign(template_name, dry_run=True, limit=None, single_lead=None):
    leads = load_leads()
    state = load_state()

    today = str(date.today())
    if state.get("last_send_date") != today:
        state["today_sent"] = 0
        state["last_send_date"] = today

    sent_emails = set(state.get("sent_to", []))
    eligible = [l for l in leads if (l.get("email") or "").strip() and l["email"] not in sent_emails]

    if single_lead is not None:
        if single_lead < len(leads):
            eligible = [leads[single_lead]]
        else:
            print(f"ERROR: Lead index {single_lead} out of range (max {len(leads)-1})")
            sys.exit(1)

    if limit:
        eligible = eligible[:limit]

    eligible.sort(key=lambda x: int(x.get("priority_score", 0)), reverse=True)

    print(f"📧 {'DRY RUN' if dry_run else 'LIVE SEND'} — {template_name}")
    print(f"  Leads loaded:    {len(leads)}")
    print(f"  Eligible:        {len(eligible)}")
    print(f"  Already sent:    {len(sent_emails)}")
    print(f"  Today's sent:    {state['today_sent']}/{DAILY_LIMIT}")
    print(f"  Total sent:      {state['total_sent']}")

    if dry_run:
        for i, lead in enumerate(eligible[:5]):
            preview(template_name, lead, i)
        if len(eligible) > 5:
            print(f"\n  ... and {len(eligible) - 5} more leads (--live to send all)")
        return

    # LIVE SEND
    if not SMTP_USER or not SMTP_PASS:
        print("\n❌ Cannot send: SMTP credentials not configured.")
        print("   Set SMTP_USER and SMTP_PASS environment variables.")
        sys.exit(1)

    print(f"\n⚠️  About to send {len(eligible)} real emails. Continue? (y/N): ", end="")
    answer = input().strip().lower()
    if answer != "y":
        print("Aborted.")
        return

    for i, lead in enumerate(eligible):
        remaining = DAILY_LIMIT - state["today_sent"]
        if remaining <= 0:
            print(f"\n⏸ Daily limit of {DAILY_LIMIT} reached. Stop.")
            break

        subject, body = fill_template(template_name, lead)
        email = lead["email"]
        name = lead.get("name", "")

        print(f"\n  [{i+1}/{len(eligible)}] {name} <{email}> ... ", end="", flush=True)

        success, error = send_email(email, name, subject, body)

        if success:
            print("✓")
            state["today_sent"] += 1
            state["total_sent"] += 1
            state["sent_to"].append(email)
            log_send(lead, template_name, "sent")
        else:
            print(f"✗ ({error[:60]})")
            state["total_failed"] += 1
            log_send(lead, template_name, "failed", error)

        save_state(state)

        delay = random.randint(DELAY_MIN, DELAY_MAX)
        print(f"      Sleeping {delay}s...", end="", flush=True)
        time.sleep(delay)
        print(" done")

        if (i + 1) % BATCH_SIZE == 0 and (i + 1) < len(eligible):
            print(f"\n  ⏸ Batch pause ({BATCH_PAUSE}s)...\n")
            time.sleep(BATCH_PAUSE)

    print(f"\n{'='*55}")
    print(f"  CAMPAIGN SESSION COMPLETE")
    print(f"  Sent today:   {state['today_sent']}")
    print(f"  Total sent:   {state['total_sent']}")
    print(f"  Total failed: {state['total_failed']}")
    print(f"{'='*55}")

def show_status():
    state = load_state()
    print(f"📊 CAMPAIGN STATUS")
    print(f"  Started:     {state.get('started_at', '?')[:19]}")
    print(f"  Day:         {state.get('day_number', 0)}")
    print(f"  Today sent:  {state.get('today_sent', 0)}/{DAILY_LIMIT}")
    print(f"  Total sent:  {state.get('total_sent', 0)}")
    print(f"  Total failed:{state.get('total_failed', 0)}")
    print(f"  Unique sent: {len(state.get('sent_to', []))}")

def list_templates():
    print("Available templates:")
    for name, tmpl in TEMPLATES.items():
        print(f"  {name:15s} — {tmpl['subject'][:50]}")

# ══════════════════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════════════════

def main():
    import argparse
    parser = argparse.ArgumentParser(description="School AI Cold Email Sender")
    parser.add_argument("--dry-run", action="store_true", help="Preview without sending")
    parser.add_argument("--live", action="store_true", help="Actually send emails")
    parser.add_argument("--template", default="all_services",
                        help="Template name (default: all_services)")
    parser.add_argument("--limit", type=int, help="Max emails to send")
    parser.add_argument("--lead", type=int, help="Preview/send single lead by index")
    parser.add_argument("--status", action="store_true", help="Show campaign status")
    parser.add_argument("--list-templates", action="store_true", help="List templates")
    args = parser.parse_args()

    if args.list_templates:
        list_templates()
        return
    if args.status:
        show_status()
        return

    dry_run = not args.live
    run_campaign(args.template, dry_run=dry_run, limit=args.limit, single_lead=args.lead)

if __name__ == "__main__":
    main()
