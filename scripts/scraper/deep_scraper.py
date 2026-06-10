import requests
from bs4 import BeautifulSoup
import json
import re
import time
import urllib.parse

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
}

# Simple regex to look for titles followed by a Name (e.g. CEO John Doe)
# This is a basic heuristic. A more advanced version would use an LLM.
CEO_REGEX = re.compile(r'\b(?:CEO|Owner|Founder|President|Managing Director)[\s:-]+([A-Z][a-z]+ [A-Z][a-z]+)\b')

def fetch_page_text(url):
    try:
        res = requests.get(url, headers=headers, timeout=10)
        if res.status_code == 200:
            soup = BeautifulSoup(res.text, 'html.parser')
            # remove script and style tags
            for script in soup(["script", "style"]):
                script.extract()
            text = soup.get_text(separator=' ')
            # collapse whitespace
            return ' '.join(text.split())
    except Exception as e:
        print(f"Failed to fetch {url}: {e}")
    return ""

def extract_ceo_from_text(text):
    match = CEO_REGEX.search(text)
    if match:
        name = match.group(1).strip()
        # Basic sanity check (names shouldn't be too long or common false positives)
        if len(name) < 30 and name.lower() not in ["our team", "contact us", "read more"]:
            return name
    return None

def extract_timeline_from_text(text):
    # Find sentences containing years (18xx, 19xx, 20xx)
    sentences = re.split(r'(?<=[.!?]) +', text)
    timeline = []
    for s in sentences:
        if re.search(r'\b(18|19|20)\d{2}\b', s) and len(s) > 15:
            timeline.append(s.strip())
    
    if timeline:
        # Deduplicate and sort could be done here, but keeping it simple
        return "### Historical Timeline\n\n" + "\n".join([f"- {s}" for s in timeline[:10]])
    return None

def process_leads():
    filepath = 'public/data/vancouver_leads.json'
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            leads = json.load(f)
    except Exception as e:
        print(f"Error loading {filepath}: {e}")
        return

    updated_count = 0
    processed_count = 0
    for idx, lead in enumerate(leads):
        if processed_count >= 10:
            print("Reached 10 company test limit. Stopping scrape.")
            break
            
        if lead.get('website') != 'N/A' and (not lead.get('ceo') or not lead.get('history')):
            website = lead['website']
            print(f"[{idx+1}/{len(leads)}] Crawling {website} for {lead['name']}...")
            processed_count += 1
            
            # 1. Fetch homepage
            text = fetch_page_text(website)
            
            if not lead.get('ceo'):
                ceo = extract_ceo_from_text(text)
            else:
                ceo = lead.get('ceo')
            
            # 2. Try to find About Us page if CEO or History is missing
            about_text = ""
            if not ceo or not lead.get('history'):
                about_url = urllib.parse.urljoin(website, '/about')
                print(f"  -> Fetching {about_url}")
                about_text = fetch_page_text(about_url)
                
                if not about_text or len(about_text) < 100:
                    about_url = urllib.parse.urljoin(website, '/about-us')
                    about_text = fetch_page_text(about_url)
                
                if not ceo:
                    ceo = extract_ceo_from_text(about_text)

            # Update CEO
            if ceo and ceo != lead.get('ceo'):
                print(f"  [+] FOUND LEADER: {ceo}")
                lead['ceo'] = ceo
                updated_count += 1
            elif not ceo:
                print("  [-] No leader found via heuristics.")
                
            # Extract Timeline
            if not lead.get('history') and about_text:
                timeline = extract_timeline_from_text(about_text)
                if timeline:
                    print("  [+] FOUND TIMELINE HISTORY")
                    lead['history'] = timeline
                    updated_count += 1
                else:
                    print("  [-] No timeline found.")
                
            # 3. Try to fetch Services page
            if not lead.get('services'):
                services_url = urllib.parse.urljoin(website, '/services')
                print(f"  -> Looking for services at {services_url}")
                services_text = fetch_page_text(services_url)
                
                if not services_text or len(services_text) < 100:
                    services_url = urllib.parse.urljoin(website, '/our-services')
                    services_text = fetch_page_text(services_url)
                
                if services_text and len(services_text) > 100:
                    print("  [+] FOUND SERVICES INFO")
                    lead['services'] = services_text[:3000] # Cap length just in case
                    updated_count += 1
                else:
                    print("  [-] No services info found.")
                
            # Be polite to servers
            time.sleep(1)

    if updated_count > 0:
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(leads, f, indent=4, ensure_ascii=False)
        print(f"Updated {updated_count} leads with CEO/Owner names in {filepath}.")
    else:
        print("No new CEO/Owner names found.")

if __name__ == "__main__":
    process_leads()
