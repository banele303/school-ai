#!/usr/bin/env python3
"""
google_maps_scraper.py - Find private schools via Google Maps Places API.
Usage: python google_maps_scraper.py --city "Johannesburg"
       python google_maps_scraper.py --all-jhb
       python google_maps_scraper.py --all
API key from GOOGLE_MAPS_API_KEY env var or .gmaps_token file.
"""
import json, os, sys, time, csv, requests

API_KEY = os.environ.get("GOOGLE_MAPS_API_KEY", "")
if not API_KEY:
    key_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".gmaps_token")
    if os.path.exists(key_path):
        with open(key_path) as f:
            API_KEY = f.read().strip()

if not API_KEY:
    print("ERROR: No Google Maps API key. Set GOOGLE_MAPS_API_KEY or echo key > .gmaps_token")
    sys.exit(1)

BASE_URL = "https://maps.googleapis.com/maps/api"

# Johannesburg sub-areas for granular coverage
JHB_AREAS = [
    "Sandton, Johannesburg", "Randburg, Johannesburg", "Roodepoort, Johannesburg",
    "Midrand, Johannesburg", "Fourways, Johannesburg", "Bedfordview, Johannesburg",
    "Johannesburg CBD", "Bryanston, Johannesburg", "Edenvale, Johannesburg",
    "Kempton Park, Johannesburg", "Parktown, Johannesburg", "Northcliff, Johannesburg",
    "Houghton, Johannesburg", "Hyde Park, Johannesburg", "Rosebank, Johannesburg",
    "Melville, Johannesburg", "Boksburg, Johannesburg", "Germiston, Johannesburg",
    "Benoni, Johannesburg", "Centurion, Pretoria",
]

OTHER_CITIES = [
    "Cape Town", "Durban", "Pretoria", "Gqeberha", "Bloemfontein",
    "East London", "Nelspruit", "Polokwane", "Kimberley", "Pietermaritzburg",
    "Rustenburg", "Stellenbosch", "Paarl", "Somerset West", "Potchefstroom",
]

SEARCH_QUERIES = [
    "private school", "independent school", "college school",
    "high school", "primary school", "preparatory school",
    "montessori school", "cambridge school", "international school",
]

class GoogleMapsScraper:
    def __init__(self, api_key):
        self.api_key = api_key
        self.seen = set()

    def text_search(self, query, location, max_results=60):
        url = f"{BASE_URL}/place/textsearch/json"
        params = {"query": f"{query} in {location}", "type": "school",
                  "key": self.api_key}
        results = []
        for page in range(3):
            try:
                r = requests.get(url, params=params, timeout=15)
                data = r.json()
                status = data.get("status")
                if status == "REQUEST_DENIED":
                    print(f"    API key error: {data.get('error_message', '')}")
                    break
                if status != "OK":
                    if status != "ZERO_RESULTS":
                        print(f"    Status: {status}")
                    break
                results.extend(data.get("results", []))
                next_token = data.get("next_page_token")
                if not next_token:
                    break
                time.sleep(2.5)
                params = {"pagetoken": next_token, "key": self.api_key}
            except Exception as e:
                print(f"    Error: {e}")
                break
        return results

    def get_details(self, place_id):
        url = f"{BASE_URL}/place/details/json"
        params = {"place_id": place_id,
                  "fields": "name,formatted_address,formatted_phone_number,"
                           "website,url,rating,user_ratings_total,"
                           "business_status,geometry,place_id,types,"
                           "address_component,international_phone_number",
                  "key": self.api_key}
        try:
            r = requests.get(url, params=params, timeout=10)
            data = r.json()
            if data.get("status") == "OK":
                return data.get("result", {})
        except:
            pass
        return {}

    def _parse(self, details, location):
        comps = {t[0]: c["long_name"] for c in details.get("address_components", [])
                 for t in c.get("types", [])}
        return {
            "name": details.get("name", ""),
            "address": details.get("formatted_address", ""),
            "city": comps.get("locality", ""),
            "province": comps.get("administrative_area_level_1", ""),
            "phone": details.get("formatted_phone_number", "") or details.get("international_phone_number", ""),
            "website": details.get("website", ""),
            "google_maps_url": details.get("url", ""),
            "rating": details.get("rating", ""),
            "total_ratings": details.get("user_ratings_total", 0),
            "place_id": details.get("place_id", ""),
            "source": "google_maps",
            "search_location": location,
            "email": "",
            "enriched": False,
        }

    def scrape(self, locations, queries=None):
        if queries is None:
            queries = SEARCH_QUERIES
        all_leads = []
        for loc in locations:
            for q in queries:
                print(f"  Searching: '{q}' in {loc}...")
                results = self.text_search(q, loc)
                print(f"    Found {len(results)} results")
                for r in results:
                    pid = r.get("place_id")
                    if pid and pid not in self.seen:
                        self.seen.add(pid)
                        details = self.get_details(pid)
                        if details:
                            lead = self._parse(details, loc)
                            all_leads.append(lead)
                            ph = lead["phone"][:25] if lead["phone"] else "N/A"
                            web = lead["website"][:40] if lead["website"] else "N/A"
                            print(f"    {lead['name'][:45]} | {ph} | {web}")
                time.sleep(0.3)
        return all_leads

def main():
    import argparse
    parser = argparse.ArgumentParser(description="Google Maps Private School Scraper")
    parser.add_argument("--city", help="Single city")
    parser.add_argument("--all-jhb", action="store_true", help="All JHB sub-areas")
    parser.add_argument("--all", action="store_true", help="All SA cities")
    parser.add_argument("--output-dir", default="leads", help="Output directory")
    args = parser.parse_args()

    if not (args.city or args.all or args.all_jhb):
        args.all_jhb = True
        print("No location specified. Defaulting to --all-jhb\n")

    scraper = GoogleMapsScraper(API_KEY)
    leads = []

    if args.all_jhb:
        print("Google Maps: Scraping JHB sub-areas...\n")
        leads = scraper.scrape(JHB_AREAS)
    elif args.all:
        print("Google Maps: Scraping all SA cities...\n")
        leads = scraper.scrape(OTHER_CITIES + JHB_AREAS[:5])
    elif args.city:
        print(f"Google Maps: Scraping {args.city}...\n")
        leads = scraper.scrape([args.city])

    os.makedirs(args.output_dir, exist_ok=True)
    with open(os.path.join(args.output_dir, "gmaps_raw.json"), "w", encoding="utf-8") as f:
        json.dump(leads, f, indent=2, ensure_ascii=False)
    if leads:
        fieldnames = list(leads[0].keys())
        with open(os.path.join(args.output_dir, "gmaps_raw.csv"), "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(leads)

    with_phone = sum(1 for l in leads if l["phone"])
    with_web = sum(1 for l in leads if l["website"])
    print(f"\n{'='*50}")
    print(f"  GMAPS SCRAPE COMPLETE")
    print(f"  Total unique: {len(leads)}")
    print(f"  With phone:   {with_phone}")
    print(f"  With website: {with_web}")
    print(f"  Saved: {args.output_dir}/gmaps_raw.json + .csv")
    print(f"  Next: python merge_dedupe.py")
    print(f"{'='*50}")

if __name__ == "__main__":
    main()
