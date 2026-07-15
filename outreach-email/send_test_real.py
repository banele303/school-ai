#!/usr/bin/env python3
"""Send a realistic-looking test to banelesouthflow@gmail.com"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

os.environ["SMTP_USER"] = "alexsouthflow2@gmail.com"
os.environ["SMTP_PASS"] = "velsszvjfqjvyfdk"
os.environ["SENDER_NAME"] = "Alex"
os.environ["SENDER_PHONE"] = ""

from send_campaign import fill_template, send_email

# Use a real school name for a realistic test
lead = {
    "first_name": "Johan",
    "name": "Johan van der Merwe",
    "company": "St John's College",
    "role": "Principal",
    "city": "Johannesburg",
    "location": "Gauteng",
    "email": "banelesouthflow@gmail.com"
}

subject, body = fill_template("all_services", lead)
success, error = send_email("banelesouthflow@gmail.com", "Johan van der Merwe", subject, body)

if success:
    print("Email sent to banelesouthflow@gmail.com!")
    print(f"Subject: {subject}")
else:
    print(f"Failed: {error}")
