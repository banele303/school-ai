#!/usr/bin/env python3
"""Test send - sends all 5 templates to banelesouthflow@gmail.com"""
import sys, os, smtplib, time
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.utils import formataddr

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from send_campaign import fill_template, SMTP_HOST, SMTP_PORT

# Test config
TEST_EMAIL = "banelesouthflow@gmail.com"
TEST_NAME = "Test Recipient"

SMTP_USER = os.environ.get("SMTP_USER", "alexsouthflow2@gmail.com")
SMTP_PASS = os.environ.get("SMTP_PASS", "velsszvjfqjvyfdk")
SENDER_NAME = "Alex"
SENDER_COMPANY = "Edunexus AI"
SENDER_WEBSITE = "edunexus.co.za"
SENDER_PHONE = ""
CALENDLY_LINK = ""
DEMO_VIDEO_LINK = ""
UNSUBSCRIBE_URL = ""

# Test lead
lead = {
    "first_name": "Banele",
    "name": "Banele Southflow",
    "company": "Test School",
    "role": "Principal",
    "city": "Johannesburg",
    "location": "Gauteng",
    "email": TEST_EMAIL,
}

TEMPLATES = ["high_impact", "short_punchy", "whatsapp", "all_services"]

def send_email(to_email, to_name, subject, body):
    msg = MIMEMultipart("alternative")
    msg["From"] = formataddr((SENDER_NAME, SMTP_USER))
    msg["To"] = formataddr((to_name, to_email))
    msg["Subject"] = f"[TEST] {subject}"
    msg["Reply-To"] = SMTP_USER
    msg.attach(MIMEText(body, "plain", "utf-8"))
    msg.attach(MIMEText(f"<html><body>{body.replace(chr(10), '<br>')}</body></html>", "html", "utf-8"))
    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=30) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.send_message(msg)
        return True, ""
    except Exception as e:
        return False, str(e)

print(f"📧 Sending {len(TEMPLATES)} test emails to {TEST_EMAIL}")
print(f"   From: {SMTP_USER}")
print()

for i, tmpl in enumerate(TEMPLATES):
    subject, body = fill_template(tmpl, lead)
    if not subject:
        subject = f"[TEST] WhatsApp template"
    print(f"  [{i+1}/{len(TEMPLATES)}] Template: {tmpl} ... ", end="", flush=True)
    success, error = send_email(TEST_EMAIL, TEST_NAME, subject, body)
    if success:
        print("✓ SENT")
    else:
        print(f"✗ FAILED: {error}")
    if i < len(TEMPLATES) - 1:
        time.sleep(3)

print()
print("Done! Check banelesouthflow@gmail.com inbox.")
