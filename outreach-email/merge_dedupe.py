#!/usr/bin/env python3
"""
merge_dedupe.py - Merge Apify + Google Maps + known 90-school database,
deduplicate, normalize, and score for School AI outreach.
"""
import json, os, csv, re
from datetime import datetime

def load_json(path):
    if os.path.exists(path):
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    return []

def normalize_apify(lead):
    return {
        "name": lead.get("full_name") or lead.get("name") or lead.get("contact_name", ""),
        "first_name": (lead.get("full_name") or lead.get("name") or "").split()[0] if (lead.get("full_name") or lead.get("name")) else "",
        "company": lead.get("company_name") or lead.get("organization") or lead.get("company", ""),
        "role": lead.get("job_title") or lead.get("title", ""),
        "email": lead.get("business_email") or lead.get("email", ""),
        "phone": lead.get("mobile") or lead.get("phone", ""),
        "website": lead.get("company_website") or lead.get("company_domain") or lead.get("website", ""),
        "linkedin": lead.get("linkedin_url") or lead.get("linkedin", ""),
        "city": lead.get("contact_city") or lead.get("city", ""),
        "location": lead.get("contact_location") or lead.get("location", ""),
        "industry": lead.get("company_industry") or lead.get("industry", ""),
        "size": lead.get("company_size") or lead.get("size", ""),
        "source": "apify",
    }

def normalize_gmaps(lead):
    return {
        "name": "",
        "first_name": "",
        "company": lead.get("name", ""),
        "role": "",
        "email": lead.get("email", ""),
        "phone": lead.get("phone", ""),
        "website": lead.get("website", ""),
        "linkedin": "",
        "city": lead.get("city", ""),
        "location": lead.get("province", ""),
        "industry": "education",
        "size": "",
        "source": "google_maps",
        "rating": lead.get("rating", ""),
        "total_ratings": lead.get("total_ratings", 0),
        "address": lead.get("address", ""),
    }

def normalize_phone(phone):
    if not phone:
        return ""
    cleaned = re.sub(r"[^\d+]", "", str(phone))
    if cleaned.startswith("0"):
        cleaned = "+27" + cleaned[1:]
    elif cleaned.startswith("27") and not cleaned.startswith("+"):
        cleaned = "+" + cleaned
    if len(cleaned) < 8:
        return ""
    return cleaned

def deduplicate(leads):
    seen_emails = set()
    seen_phones = set()
    seen_companies = set()
    unique = []
    for lead in leads:
        email = (lead.get("email") or "").lower().strip()
        phone = normalize_phone(lead.get("phone", ""))
        company = (lead.get("company") or "").lower().strip()
        if email and email in seen_emails:
            continue
        if phone and phone in seen_phones:
            continue
        if company:
            is_dup = False
            for existing in seen_companies:
                if company in existing or existing in company:
                    is_dup = True
                    break
            if is_dup:
                continue
        if email:
            seen_emails.add(email)
        if phone:
            seen_phones.add(phone)
        if company:
            seen_companies.add(company)
        lead["phone_cleaned"] = phone
        unique.append(lead)
    return unique

def score_lead(lead):
    """Score lead 1-5 for school outreach priority. Higher = better."""
    score = 0
    role = (lead.get("role") or "").lower()
    company = (lead.get("company") or "").lower()

    # Role scoring - who makes tech purchase decisions in schools?
    if any(t in role for t in ["principal", "head of school", "headmaster", "headmistress", "rector"]):
        score += 5
    elif any(t in role for t in ["director", "owner", "founder", "ceo"]):
        score += 4
    elif any(t in role for t in ["deputy principal", "deputy head", "vice principal"]):
        score += 4
    elif any(t in role for t in ["it ", "technology", "digital", "innovation"]):
        score += 4  # IT directors are key for edtech
    elif any(t in role for t in ["academics", "curriculum", "studies"]):
        score += 3
    elif any(t in role for t in ["bursar", "finance", "operations", "admin"]):
        score += 2

    # Company name signals - elite/known schools = bigger budget
    elite_keywords = ["college", "st ", "saint", "bishops", "diocesan", "hilton",
                      "michaelhouse", "kearsney", "roedean", "stithians", "crawford",
                      "redhill", "brescia", "grey college", "paul roos", "rondebosch",
                      "sacs", "herschel", "st andrew", "kingswood", "st mary", "dsg",
                      "cornwall", "midstream", "penryn", "somerset college", "bridge house"]
    if any(kw in company for kw in elite_keywords):
        score += 2

    # Curro/AdvTech chains = multi-school opportunity
    if any(kw in company for kw in ["curro", "advtech", "crawford", "pinnacle", "spark"]):
        score += 3

    # Contact completeness
    if lead.get("email"):
        score += 2
    if lead.get("phone"):
        score += 1
    if lead.get("website"):
        score += 1

    return min(score, 10)

def load_known_schools():
    """Load the 90-school known database from the previous outreach project."""
    known_paths = [
        r"C:\Users\Mr Ness\Documents\Ai\sa-private-schools-outreach\output\leads.json",
        "leads/known_schools.json",
    ]
    for p in known_paths:
        if os.path.exists(p):
            with open(p, encoding="utf-8") as f:
                schools = json.load(f)
            print(f"  Loaded {len(schools)} known schools from {os.path.basename(p)}")
            result = []
            for s in schools:
                result.append({
                    "name": "",
                    "first_name": "",
                    "company": s.get("name", ""),
                    "role": "Principal",
                    "email": s.get("email", ""),
                    "phone": s.get("phone", ""),
                    "website": s.get("website", ""),
                    "linkedin": "",
                    "city": s.get("city", ""),
                    "location": s.get("province", ""),
                    "industry": "education",
                    "size": "",
                    "source": "known_database",
                    "priority_score": 7,
                    "school_type": s.get("type", ""),
                    "grades": s.get("grades", ""),
                })
            return result
    print("  No known schools database found. Run the sa-private-schools-outreach project first?")
    return []

def main():
    os.makedirs("leads", exist_ok=True)

    apify_leads = load_json("leads/apify_raw.json")
    gmaps_leads = load_json("leads/gmaps_raw.json")
    known_schools = load_known_schools()

    print(f"\nMerging leads...")
    print(f"  Apify:          {len(apify_leads)}")
    print(f"  Google Maps:    {len(gmaps_leads)}")
    print(f"  Known database: {len(known_schools)}")
    print(f"  Total raw:      {len(apify_leads) + len(gmaps_leads) + len(known_schools)}")

    normalized = []
    for l in apify_leads:
        normalized.append(normalize_apify(l))
    for l in gmaps_leads:
        normalized.append(normalize_gmaps(l))
    for l in known_schools:
        normalized.append(l)

    unique = deduplicate(normalized)
    print(f"  After dedup:    {len(unique)}")

    for l in unique:
        if not l.get("priority_score"):
            l["priority_score"] = score_lead(l)
        l["scraped_at"] = datetime.now().isoformat()
        l["status"] = "new"

    unique.sort(key=lambda x: x.get("priority_score", 0), reverse=True)

    # Save master
    master_fields = [
        "name", "first_name", "company", "role", "email",
        "phone", "phone_cleaned", "website", "linkedin",
        "city", "location", "industry", "size",
        "source", "priority_score", "status", "scraped_at",
        "rating", "total_ratings", "address",
    ]
    with open("leads/leads_master.csv", "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=master_fields, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(unique)
    with open("leads/leads_master.json", "w", encoding="utf-8") as f:
        json.dump(unique, f, indent=2, ensure_ascii=False)

    # Email-focused CSV
    email_fields = ["first_name", "name", "company", "role", "email",
                    "phone", "city", "priority_score", "source"]
    with open("leads/leads_for_email.csv", "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=email_fields, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(unique)

    with_email = sum(1 for l in unique if l.get("email"))
    with_phone = sum(1 for l in unique if l.get("phone"))
    high_priority = sum(1 for l in unique if l.get("priority_score", 0) >= 6)

    print(f"\n{'='*55}")
    print(f"  MERGE COMPLETE - School AI Outreach")
    print(f"  Total unique:       {len(unique)}")
    print(f"  With email:         {with_email}")
    print(f"  With phone:         {with_phone}")
    print(f"  High priority (6+): {high_priority}")
    print(f"  Files: leads/leads_master.csv, leads/leads_for_email.csv")
    print(f"  Next: python send_campaign.py --dry-run --template intro")
    print(f"{'='*55}")

if __name__ == "__main__":
    main()
