import json
import urllib.parse
import time

def enrich_leads(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            leads = json.load(f)
    except Exception as e:
        print(f"Error loading {filepath}: {e}")
        return

    updated_count = 0
    for lead in leads:
        website = lead.get('website')
        if website and website != "N/A":
            # Extract domain
            parsed = urllib.parse.urlparse(website)
            domain = parsed.netloc.replace("www.", "")

            # Fetch logo from Google Favicon API
            if not lead.get('logo') or 'clearbit.com' in lead.get('logo', ''):
                lead['logo'] = f"https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://{domain}&size=128"
                updated_count += 1

            # Generate placeholder history if missing or if it's already a placeholder
            # Wait, if it has a real history (e.g. starting with ### Historical Timeline), keep it
            current_history = lead.get('history', '')
            if not current_history or "This history is a placeholder" in current_history:
                name = lead.get('name', 'This company')
                lead['history'] = f"<b>{name}</b> is a notable business located in {lead.get('city', 'Vancouver')}. Over the years, they have established themselves as a key player in the {lead.get('industry', 'local')} sector. <i>(This history is a placeholder and will be replaced by the AI generation engine in the next pipeline step.)</i>"
                updated_count += 1
                
            if not lead.get('foundingYear'):
                lead['foundingYear'] = "Established (AI Pending)"
                updated_count += 1

    if updated_count > 0:
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(leads, f, indent=4, ensure_ascii=False)
        print(f"Enriched leads in {filepath}. Added logos, histories, and dates.")
    else:
        print(f"No new enrichment needed for {filepath}.")

if __name__ == "__main__":
    enrich_leads('public/data/vancouver_leads.json')
    # If we had a global_leads.json, we would run it there too
    try:
        enrich_leads('public/data/global_leads.json')
    except:
        pass
