import urllib.request
import re
import subprocess
import os
import sys
import datetime

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
import upload_folder_to_drive
from googleapiclient.http import MediaFileUpload

def check_file_exists_in_drive(service, filename):
    query = f"name = '{filename}' and trashed = false"
    try:
        results = service.files().list(q=query, fields="files(id)").execute()
        return len(results.get('files', [])) > 0
    except Exception as e:
        print(f"Error checking file in Drive: {e}")
        return False

def get_or_create_drive_path(service, base_parent_id, year_str, month_str, date_str):
    y_id = upload_folder_to_drive.create_drive_folder(service, year_str, base_parent_id)
    m_id = upload_folder_to_drive.create_drive_folder(service, month_str, y_id)
    d_id = upload_folder_to_drive.create_drive_folder(service, date_str, m_id)
    return d_id

def upload_single_file(service, local_file_path, parent_id):
    filename = os.path.basename(local_file_path)
    file_metadata = {'name': filename, 'parents': [parent_id]}
    media = MediaFileUpload(local_file_path, mimetype='application/json', resumable=True)
    service.files().create(body=file_metadata, media_body=media).execute()

def main():
    service = upload_folder_to_drive.get_drive_service()
    if not service:
        print("Could not get Google Drive service.")
        return

    base_folder_id = upload_folder_to_drive.create_drive_folder(service, "analyst refs backup")

    data_url = "http://js-live.7mdt.com/datafile/fen.js"
    req = urllib.request.Request(data_url, headers={
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://freelive.7msport.com/'
    })
    
    js_data = urllib.request.urlopen(req).read().decode('utf-8', errors='ignore')
    pattern = re.compile(r"sDt\[(\d+)\]=\[(.*?)\];", re.DOTALL)
    matches = pattern.findall(js_data)

    script_path = os.path.join(os.path.dirname(__file__), '..', 'public', 'data', 'fetch_history_references.py')

    for match_id, array_content in matches:
        items = array_content.split("','")
        if len(items) < 4: continue
        
        home_team = items[2].replace("'", "").replace("(N)", "").strip()
        away_team = items[3].replace("'", "").replace("(N)", "").strip()
        if not home_team or not away_team: continue
        
        filename = f"{match_id}.json"
        
        if check_file_exists_in_drive(service, filename):
            print(f"Match {match_id} already exists on Drive. Skipping.")
            continue
            
        print(f"\n--- Fetching Match: {match_id} ({home_team} vs {away_team}) ---")
        try:
            subprocess.run(['python', script_path, match_id, home_team, away_team], check=True)
        except subprocess.CalledProcessError as e:
            print(f"Error executing script: {e}")
            continue
            
        now = datetime.datetime.now()
        year_str = now.strftime('%Y')
        month_str = now.strftime('%m')
        date_str = now.strftime('%Y_%m_%d')
        
        local_file = os.path.join(os.path.dirname(__file__), '..', 'public', 'sports', 'refs', year_str, month_str, date_str, filename)
        
        if os.path.exists(local_file):
            print(f"Uploading {filename} to Drive...")
            d_id = get_or_create_drive_path(service, base_folder_id, year_str, month_str, date_str)
            upload_single_file(service, local_file, d_id)
            print("Upload complete.")
        else:
            print(f"Warning: Expected local file not found at {local_file}")

if __name__ == '__main__':
    main()
