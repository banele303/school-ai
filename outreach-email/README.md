# School AI Email Outreach - SA Private Schools

Pipeline to find private schools in South Africa and pitch **School AI** — an all-in-one platform for teachers, students, and parents.

## What School AI Does (Your Pitch)

| # | Feature | Pain Point Solved |
|---|---------|-------------------|
| 1 | **AI Exam Creator** | Teachers spend 6-8 hrs/week writing exams → AI does it in 10 min |
| 2 | **AI Exam Marker** | 3-day marking turnaround → same-day auto-marking + feedback |
| 3 | **Live Online Classes** | Zoom costs + scheduling → built-in virtual classroom |
| 4 | **AI Student Chat** | Students stuck after class → 24/7 AI homework help |
| 5 | **School Communication Hub** | Scattered WhatsApp groups → one platform for all |
| 6 | **Announcements Board** | Lost notices → push notifications + read receipts |
| 7 | **Self-Study & Competitions** | Low engagement → gamified revision + inter-school challenges |
| 8 | **Digital Whiteboard** | Basic projector → interactive teaching tools |
| 9 | **Application Portal** | Paper-based admissions → online tracking + auto-responses |

## Target Personas

| Persona | Why Them | Pitch Angle |
|---------|----------|-------------|
| **Principal / Head of School** | Decision-maker, signs off on spending | ROI, teacher retention, school reputation |
| **Deputy Principal (Academics)** | Feels exam/assessment pain daily | Exam creator + marker |
| **IT Director** | Owns tech stack decisions | Integration, WhatsApp-native, zero training |
| **Bursar / Finance** | Controls budget | Cost vs. hiring admin staff |
| **School Owner / Founder** | Multi-school operators | Scalability, Curro/AdvTech chain potential |

## Pipeline

```
Day 0:  python launch_apify.py          → Launch 10 Apify searches
Day 0+: python google_maps_scraper.py    → Google Maps scrape (parallel)
Day 5:  python collect_leads.py          → Collect Apify results
Day 5:  python merge_dedupe.py           → Merge + dedup + score (90 known + Apify + GMaps)
Day 6:  python send_campaign.py --dry-run --template intro
Day 7:  python send_campaign.py --live --template intro --limit 25
```

## Files

| File | Purpose |
|------|---------|
| `launch_apify.py` | Launch 10 Apify searches (principals, heads, IT directors, deputies, owners) |
| `collect_leads.py` | Poll Apify runs, collect results |
| `google_maps_scraper.py` | Google Maps Places API for schools not in Apify |
| `merge_dedupe.py` | Merge all sources, deduplicate, score by priority |
| `send_campaign.py` | 5-email campaign sequence with SMTP sending |
| `.token` | Apify API token (gitignored) |
| `.gmaps_token` | Google Maps API key (gitignored) |

## Email Sequence (5 unique offers, sent sequentially)

| # | Template | Day | Subject | Pitch | CTA |
|---|----------|-----|---------|-------|-----|
| 1 | offer1_exam | 0 | `{first_name}, your teachers are spending 8 hrs/week on exams` | Exam Creator + Marker | 90-sec video or call |
| 2 | offer2_students | 4 | `{first_name}, what happens when your students get stuck at 8pm?` | AI Chat + Self-Study | 10 min call |
| 3 | offer3_comms | 8 | `{first_name}, are your parent messages actually being read?` | Comms Hub + Announcements | 10 min demo |
| 4 | offer4_classroom | 14 | `{first_name}, what if your online classes actually worked?` | Live Classes + Whiteboard | 2-min demo |
| 5 | offer5_admin | 21 | `{first_name}, closing the loop on School AI` | Full platform overview | WhatsApp anytime |

## Setup

```bash
cd "/c/Users/Mr Ness/Documents/Ai/school ai/outreach-email"

# 1. Install deps
pip install requests python-dotenv

# 2. Set tokens
echo "YOUR_APIFY_TOKEN" > .token
echo "YOUR_GOOGLE_MAPS_KEY" > .gmaps_token

# 3. Set SMTP (or use env vars)
export SMTP_USER="alexsouthflow2@gmail.com"
export SMTP_PASS="your_16_char_app_password"

# 4. Run pipeline
python launch_apify.py
python google_maps_scraper.py --all-jhb
# Wait 5-10 min
python collect_leads.py
python merge_dedupe.py
python send_campaign.py --dry-run --template intro
```

## Anti-Spam (SA / POPIA)

- List-Unsubscribe header in every email
- Physical address in footer
- Only business contact emails (info@, admissions@, principal@)
- Max 50 emails/day per account
- Random 45-120s delays between sends
- No spam trigger words in subjects
- Honor opt-outs within 2 business days

## Pricing Strategy (have ready before sending)

| Tier | What | Price/mo |
|------|------|----------|
| **Starter** | Exam Creator + Marker | R1,500 |
| **Classroom** | + Live Classes + Student Chat | R2,900 |
| **Full Platform** | All 9 tools + Communication Hub | R4,900 |
| **Multi-School** | Per-school discount for 3+ | Custom |

First month 50% off to reduce friction.
