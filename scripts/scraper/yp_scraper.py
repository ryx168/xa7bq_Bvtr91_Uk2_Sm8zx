import requests
from bs4 import BeautifulSoup
import json
import time

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
}

def fetch_yp_page(url, industry, city):
    print(f"Fetching {url}")
    response = requests.get(url, headers=headers)
    
    if response.status_code != 200:
        print(f"Error {response.status_code}")
        return []
        
    soup = BeautifulSoup(response.text, 'html.parser')
    listings = soup.select('.listing')
    
    results = []
    for idx, item in enumerate(listings):
        name_el = item.select_one('.listing__name--link')
        if not name_el:
            continue
            
        name = name_el.text.strip()
        
        address_el = item.select_one('.listing__address--full')
        address = address_el.text.strip() if address_el else "Unknown"
        
        # Phone numbers in YP are sometimes inside `h4.mlr__submenu__item`
        phone_el = item.select_one('.mlr__item__cta')
        phone = phone_el.get('data-phone', 'Unknown') if phone_el else "Unknown"
        if phone == "Unknown":
            alt_phone = item.select_one('h4')
            if alt_phone and 'data-phone' in alt_phone.attrs:
                phone = alt_phone['data-phone']
        
        # Try to find website link
        import urllib.parse
        website = "N/A"
        for a_tag in item.select('a[href]'):
            href = a_tag['href']
            if '/gourl/' in href and 'redirect=' in href:
                parsed = urllib.parse.urlparse(href)
                query = urllib.parse.parse_qs(parsed.query)
                if 'redirect' in query:
                    website = query['redirect'][0]
                    break
        
        results.append({
            'id': f"yp_{industry[:3].lower()}_{idx}",
            'city': city,
            'name': name,
            'industry': industry,
            'website': website,
            'phone': phone,
            'address': address,
            'start_date': "Unknown"
        })
        
    return results

def main():
    urls = [
        ("https://www.yellowpages.ca/search/si/1/Furniture/Vancouver+BC", "Furniture"),
        ("https://www.yellowpages.ca/search/si/2/Furniture/Vancouver+BC", "Furniture"),
        ("https://www.yellowpages.ca/search/si/1/Logistics/Vancouver+BC", "Logistics"),
        ("https://www.yellowpages.ca/search/si/2/Logistics/Vancouver+BC", "Logistics")
    ]
    
    all_leads = []
    
    for url, industry in urls:
        leads = fetch_yp_page(url, industry, "Vancouver")
        all_leads.extend(leads)
        time.sleep(2)
        
    # Deduplicate by name and group by industry
    industry_leads = {}
    for lead in all_leads:
        name = lead['name'].strip()
        ind = lead['industry'].strip()
        if ind not in industry_leads:
            industry_leads[ind] = {}
            
        if name not in industry_leads[ind]:
            industry_leads[ind][name] = lead
            
    import os
    output_dir = 'public/data'
    os.makedirs(output_dir, exist_ok=True)
    
    for ind, unique_leads in industry_leads.items():
        final_leads = list(unique_leads.values())
        filename = f"vancouver_{ind.lower()}.json"
        output_path = os.path.join(output_dir, filename)
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(final_leads, f, indent=4, ensure_ascii=False)
            
        print(f"Successfully saved {len(final_leads)} leads to {output_path}")

if __name__ == "__main__":
    main()
