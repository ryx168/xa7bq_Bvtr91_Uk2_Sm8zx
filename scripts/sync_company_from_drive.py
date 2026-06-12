import os
import io
import pickle
import sys
from google.auth.transport.requests import Request
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload

SCOPES = ['https://www.googleapis.com/auth/drive.readonly']
TARGET_FOLDER_NAME = "business info"
# Save it to the email_solutions app's public directory
DOWNLOAD_DIR = "C:\\email_solutions\\public\\data\\business_info"

def get_drive_service():
    creds = None
    script_dir = os.path.dirname(os.path.abspath(__file__))
    token_path = os.path.join(script_dir, 'token.pickle')
    creds_path = os.path.join(script_dir, 'credentials.json')
    
    if os.path.exists(token_path):
        with open(token_path, 'rb') as token:
            creds = pickle.load(token)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not os.path.exists(creds_path):
                print("Error: credentials.json not found.")
                return None
            flow = InstalledAppFlow.from_client_secrets_file(creds_path, SCOPES)
            creds = flow.run_local_server(port=0)
        with open(token_path, 'wb') as token:
            pickle.dump(creds, token)
    return build('drive', 'v3', credentials=creds)

def download_folder_recursive(service, folder_id, local_target_dir):
    if not os.path.exists(local_target_dir):
        os.makedirs(local_target_dir)

    query = f"'{folder_id}' in parents and trashed = false"
    page_token = None
    files_to_download = []
    
    while True:
        results = service.files().list(q=query, fields="nextPageToken, files(id, name, mimeType)", pageToken=page_token).execute()
        files_to_download.extend(results.get('files', []))
        page_token = results.get('nextPageToken')
        if not page_token:
            break

    for f in files_to_download:
        file_id = f['id']
        file_name = f['name']
        file_path = os.path.join(local_target_dir, file_name)
        
        if f['mimeType'] == 'application/vnd.google-apps.folder':
            print(f"Entering directory: {file_name}/")
            download_folder_recursive(service, file_id, file_path)
        else:
            print(f"Downloading {file_path}...")
            sys.stdout.flush()
            request = service.files().get_media(fileId=file_id)
            fh = io.FileIO(file_path, 'wb')
            downloader = MediaIoBaseDownload(fh, request)
            done = False
            while done is False:
                status, done = downloader.next_chunk()

def main():
    if len(sys.argv) < 2:
        print("Usage: python sync_company_from_drive.py <Company Name>")
        return
        
    company_name = sys.argv[1]
    
    service = get_drive_service()
    if not service:
        return

    # Find the target folder
    query = f"name = '{TARGET_FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false"
    results = service.files().list(q=query, fields="files(id, name)").execute()
    folders = results.get('files', [])

    if not folders:
        print(f"Folder '{TARGET_FOLDER_NAME}' not found on Google Drive.")
        return

    root_folder_id = folders[0]['id']
    print(f"Searching for company folder '{company_name}'...")
    sys.stdout.flush()
    
    query_company = f"name = '{company_name}' and '{root_folder_id}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false"
    results_company = service.files().list(q=query_company, fields="files(id, name)").execute()
    company_folders = results_company.get('files', [])
    
    if not company_folders:
        print(f"Company folder '{company_name}' not found on Google Drive.")
        return
        
    company_folder_id = company_folders[0]['id']
    target_dir = os.path.join(DOWNLOAD_DIR, company_name)
    
    print(f"Starting download for {company_name}...")
    sys.stdout.flush()
    download_folder_recursive(service, company_folder_id, target_dir)
    print("Sync complete.")
    sys.stdout.flush()

if __name__ == '__main__':
    main()
