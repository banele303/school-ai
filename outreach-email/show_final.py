import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
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

subject, body = fill_template("all_services", lead)
print("Subject:", subject)
print()
print(body)
