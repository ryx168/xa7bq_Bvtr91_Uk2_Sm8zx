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

            # 1. Save profile.json
            profile_path = os.path.join(folder_path, 'profile.json')
            with open(profile_path, 'w', encoding='utf-8') as f:
                json.dump(lead, f, indent=4, ensure_ascii=False)
            
            # 2. Save about.md
            about_path = os.path.join(folder_path, 'about.md')
            with open(about_path, 'w', encoding='utf-8') as f:
                history = lead.get('history', 'No history available yet.')
                ceo = lead.get('ceo', 'Unknown')
                f.write(f"# About {name}\n\n**Leader:** {ceo}\n\n{history}")
                
            # 3. Create products folder (placeholder for AI or future scrapers)
            products_path = os.path.join(folder_path, 'products')
            os.makedirs(products_path, exist_ok=True)
            
            # 4. Download Logo if URL exists
            import requests
            logo_url = lead.get('logo')
            if logo_url and logo_url.startswith('http'):
                logo_path = os.path.join(folder_path, 'logo.png')
                try:
                    res = requests.get(logo_url, timeout=5)
                    if res.status_code == 200:
                        with open(logo_path, 'wb') as f:
                            f.write(res.content)
                except Exception as e:
                    print(f"Failed to download logo for {name}: {e}")
            
            # 5. Placeholder for banner (just a folder or text file for now)
            # The AI or next scraper step can download actual banners here
            banner_path = os.path.join(folder_path, 'banner.txt')
            with open(banner_path, 'w', encoding='utf-8') as f:
                f.write(lead.get('banner', f'Banner for {name} will be generated/saved here.'))
                
            # 6. Save services info
            services_path = os.path.join(folder_path, 'services')
            os.makedirs(services_path, exist_ok=True)
            
            services_md_path = os.path.join(services_path, 'services.md')
            with open(services_md_path, 'w', encoding='utf-8') as f:
                services_text = lead.get('services')
                if services_text:
                    f.write(f"# Services for {name}\n\n{services_text}")
                else:
                    f.write(f"# Services for {name}\n\n*Service information will be populated here by AI.*")
            
            # 7. Download Product Images
            product_images = lead.get('product_images', [])
            if product_images:
                products_md_path = os.path.join(products_path, 'products.md')
                with open(products_md_path, 'w', encoding='utf-8') as p_md:
                    p_md.write(f"# Products for {name}\n\n")
                    
                    img_count = 1
                    for prod in product_images:
                        # Handle backwards compatibility if old data is just a list of strings
                        if isinstance(prod, str):
                            img_url = prod
                            prod_url = ""
                        else:
                            img_url = prod.get('image_url', '')
                            prod_url = prod.get('product_url', '')
                            
                        if not img_url.startswith('http'):
                            continue
                        try:
                            res = requests.get(img_url, timeout=5)
                            if res.status_code == 200:
                                # Filter small images (less than 10KB might just be an icon or tracking pixel)
                                if len(res.content) > 10240:
                                    ext = 'png' if 'png' in res.headers.get('Content-Type', '') else 'jpg'
                                    filename = f'product_{img_count}.{ext}'
                                    img_path = os.path.join(products_path, filename)
                                    with open(img_path, 'wb') as f:
                                        f.write(res.content)
                                        
                                    # Log to products.md
                                    p_md.write(f"### Product {img_count}\n")
                                    p_md.write(f"**Image:** `{filename}`\n")
                                    if prod_url:
                                        p_md.write(f"**URL:** [View Product]({prod_url})\n")
                                    p_md.write("\n")
                                    
                                    img_count += 1
                        except Exception as e:
                            print(f"Failed to download product image {img_url}: {e}")
            
            count += 1

    print(f"Successfully exported {count} business profiles into {base_output_dir}.")

if __name__ == "__main__":
    export_structure()
