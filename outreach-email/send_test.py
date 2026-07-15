#!/usr/bin/env python3
"""Send a single test email to banelesouthflow@gmail.com"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Set SMTP credentials
os.environ["SMTP_USER"] = "alexsouthflow2@gmail.com"
os.environ["SMTP_PASS"] = "velsszvjfqjvyfdk"
os.environ["SENDER_NAME"] = "Alex"
os.environ["SENDER_PHONE"] = ""
os.environ["WEBSITE"] = "edunexus.co.za"

from send_campaign import fill_template, send_email

lead = {
    "first_name": "Test",
    "name": "Test User",
    "company": "Your School",
    "role": "Principal",
    "city": "",
    "location": "",
    "email": "banelesouthflow@gmail.com"
}

subject, body = fill_template("all_services", lead)
success, error = send_email("banelesouthflow@gmail.com", "Test User", subject, body)

if success:
    print("✅ Email sent successfully to banelesouthflow@gmail.com!")
    print(f"   Subject: {subject}")
else:
    print(f"❌ Failed: {error}")
