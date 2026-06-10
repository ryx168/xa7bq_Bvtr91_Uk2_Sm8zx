import json
import os
import re
import glob

def sanitize_filename(name):
    """Remove invalid characters for folder/file names."""
    return re.sub(r'[\\/*?:"<>|]', "", name).strip()

def export_structure():
    base_output_dir = 'public/drive_export'
    # Clear out old export if it exists
    if os.path.exists(base_output_dir):
        # We won't delete it completely, just let it overwrite, or maybe clean it.
        pass

    lead_files = glob.glob('public/data/*_leads.json')
    
    count = 0
    for filepath in lead_files:
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                leads = json.load(f)
        except Exception as e:
            print(f"Failed to load {filepath}: {e}")
            continue

        for lead in leads:
            city = sanitize_filename(lead.get('city', 'Unknown City'))
            industry = sanitize_filename(lead.get('industry', 'Unknown Industry'))
            name = sanitize_filename(lead.get('name', 'Unknown Business'))

            if not city or not industry or not name:
                continue

            folder_path = os.path.join(base_output_dir, city, industry, name)
            os.makedirs(folder_path, exist_ok=True)

            profile_path = os.path.join(folder_path, 'profile.json')
            with open(profile_path, 'w', encoding='utf-8') as f:
                json.dump(lead, f, indent=4, ensure_ascii=False)
            
            count += 1

    print(f"Successfully exported {count} business profiles into {base_output_dir}.")

if __name__ == "__main__":
    export_structure()
