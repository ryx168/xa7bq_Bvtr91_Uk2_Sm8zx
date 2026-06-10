import os
import sys
import argparse
import pickle
import mimetypes
import hashlib
import fnmatch
import threading
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from google.auth.transport.requests import Request
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload

# Force UTF-8 for console output
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

SCOPES = ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive.metadata.readonly']

# Thread-local storage for Drive service
thread_local = threading.local()
_print_lock  = threading.Lock()

def get_credentials():
    creds = None
    if os.path.exists('token.pickle'):
        with open('token.pickle', 'rb') as token:
            try:
                creds = pickle.load(token)
            except Exception:
                print("Error loading token.pickle, re-authenticating.")
                creds = None
    
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            try:
                creds.refresh(Request())
            except Exception as e:
                print(f"Error refreshing token: {e}")
                creds = None

    if not creds:
        if not os.path.exists('credentials.json'):
            print("Error: credentials.json not found.")
            return None
        flow = InstalledAppFlow.from_client_secrets_file('credentials.json', SCOPES)
        creds = flow.run_local_server(port=0)
        with open('token.pickle', 'wb') as token:
            pickle.dump(creds, token)

    return creds

def get_drive_service():
    if not hasattr(thread_local, "service"):
        creds = get_credentials()
        if not creds: return None
        thread_local.service = build('drive', 'v3', credentials=creds, cache_discovery=False)
    return thread_local.service

def get_md5(file_path):
    hash_md5 = hashlib.md5()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(4096), b""):
            hash_md5.update(chunk)
    return hash_md5.hexdigest()

def get_drive_folder_id(service, folder_name, parent_id=None):
    query = f"name = '{folder_name}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false"
    if parent_id:
        query += f" and '{parent_id}' in parents"
    try:
        results = service.files().list(q=query, fields="files(id)").execute()
        files = results.get('files', [])
        return files[0]['id'] if files else None
    except Exception as e:
        print(f"Error searching for folder {folder_name}: {e}")
        return None

def get_drive_folder_contents(service, folder_id):
    query = f"'{folder_id}' in parents and trashed = false"
    files_dict = {}
    page_token = None
    try:
        while True:
            results = service.files().list(q=query,
                                           fields="nextPageToken, files(id, name, mimeType, md5Checksum, size)",
                                           pageToken=page_token).execute()
            for f in results.get('files', []):
                files_dict[f['name']] = f
            page_token = results.get('nextPageToken')
            if not page_token:
                break
        return files_dict
    except Exception as e:
        print(f"Error listing contents of folder {folder_id}: {e}")
        return {}

def create_drive_folder(service, folder_name, parent_id=None):
    existing_id = get_drive_folder_id(service, folder_name, parent_id)
    if existing_id:
        return existing_id
    file_metadata = {'name': folder_name, 'mimeType': 'application/vnd.google-apps.folder'}
    if parent_id:
        file_metadata['parents'] = [parent_id]
    try:
        file = service.files().create(body=file_metadata, fields='id').execute()
        return file.get('id')
    except Exception as e:
        print(f"Error creating folder {folder_name}: {e}")
        return None

def upload_worker(task):
    local_path, parent_id, existing_file = task
    service = get_drive_service()
    if not service: return
    file_name = os.path.basename(local_path)

    if existing_file:
        local_md5 = get_md5(local_path)
        if existing_file.get('md5Checksum') == local_md5:
            return f"SKIPPED: {local_path}"
        else:
            media = MediaFileUpload(local_path, resumable=True)
            try:
                service.files().update(fileId=existing_file['id'], media_body=media).execute()
                return f"UPDATED: {local_path}"
            except Exception as e:
                return f"ERROR updating {file_name}: {e}"

    file_metadata = {'name': file_name}
    if parent_id:
        file_metadata['parents'] = [parent_id]
    mimetype, _ = mimetypes.guess_type(local_path)
    if not mimetype: mimetype = 'application/octet-stream'
    media = MediaFileUpload(local_path, mimetype=mimetype, resumable=True)
    try:
        service.files().create(body=file_metadata, media_body=media).execute()
        return f"UPLOADED: {local_path}"
    except Exception as e:
        return f"ERROR uploading {file_name}: {e}"


# ── Include filter helpers ────────────────────────────────────────────────────

def _dir_could_match(rel: str, patterns: list) -> bool:
    """True if rel is a prefix toward any pattern — keep descending."""
    rel = rel.replace("\\", "/")
    if not rel:
        return True
    for pat in patterns:
        pat = pat.replace("\\", "/")
        # Already inside or equal to a matched path
        if fnmatch.fnmatch(rel, pat) or fnmatch.fnmatch(rel, pat + "/*"):
            return True
        # rel is a prefix of the pattern — still need to descend
        pat_parts = pat.split("/")
        rel_parts = rel.split("/")
        depth = len(rel_parts)
        if depth <= len(pat_parts):
            if fnmatch.fnmatch(rel, "/".join(pat_parts[:depth])):
                return True
    return False

def _dir_matches(rel: str, patterns: list) -> bool:
    """True if rel is fully matched — collect files here."""
    if not patterns:
        return True
    rel = rel.replace("\\", "/")
    for pat in patterns:
        pat = pat.replace("\\", "/")
        if fnmatch.fnmatch(rel, pat) or fnmatch.fnmatch(rel, pat + "/*"):
            return True
    return False


# ── Phase 1: scan local + build Drive folders ─────────────────────────────────

SKIP_NAMES = {'.git', 'node_modules', '__pycache__', '.env', '.agent'}

def scan_and_collect(service, local_folder, parent_id=None,
                     drive_folder_name=None, sync=True, include_patterns=None):
    """
    Walk local_folder, mirror the FULL folder structure on Drive, and return
    upload tasks only for files inside --include matched dirs.

    Drive layout:
      <parent_id> / drive_folder_name / rel_path / filename
      e.g.  2026-03 / 2026 / 09 / 2026-09-01-project / 0.sources / file.mp4

    folder_id_map keys are relative to local_folder (e.g. "09/2026-09-01-project/0.sources").
    The root "" maps to the drive_folder_name folder itself.
    """
    include_patterns = include_patterns or []
    local_root = Path(local_folder)
    # drive_folder_name is the parent to upload INTO (e.g. "2026-03").
    # We always create local_root.name (e.g. "2026") as a subfolder inside it.
    # Final Drive path: drive_folder_name / local_root.name / rel / filename
    #   e.g.  2026-03 / 2026 / 09 / 2026-09-01-project / 0.sources / file.mp4
    if drive_folder_name:
        # Get or create the named parent folder, then create local_root.name inside it
        named_parent_id = create_drive_folder(service, drive_folder_name, parent_id)
        root_id = create_drive_folder(service, local_root.name, named_parent_id)
    else:
        # No --name given: create local_root.name directly under parent_id
        root_id = create_drive_folder(service, local_root.name, parent_id)

    # rel_posix -> drive_folder_id  (rel is relative to local_root)
    folder_id_map = {"": root_id}

    tasks        = []
    dirs_visited = 0
    dirs_pruned  = 0
    files_found  = 0

    print("")
    for dirpath, dirnames, filenames in os.walk(local_root, topdown=True):
        dirnames[:] = sorted(d for d in dirnames if d not in SKIP_NAMES)

        rel = Path(dirpath).relative_to(local_root).as_posix()
        if rel == ".":
            rel = ""

        dirs_visited += 1

        # ── Prune dirs that can never match any include pattern ──
        if include_patterns:
            kept = []
            for d in dirnames:
                child_rel = f"{rel}/{d}" if rel else d
                if _dir_could_match(child_rel, include_patterns):
                    kept.append(d)
                else:
                    dirs_pruned += 1
            dirnames[:] = kept

        # Live scan progress
        display   = rel or drive_folder_name
        truncated = display if len(display) <= 55 else "..." + display[-52:]
        sys.stdout.write(f"\r   Scanning [{dirs_visited} dirs, {dirs_pruned} pruned] {truncated:<55}")
        sys.stdout.flush()

        # ── Always ensure this dir exists on Drive (full structure mirror) ──
        if rel and rel not in folder_id_map:
            parts      = rel.split("/")
            parent_rel = "/".join(parts[:-1])
            pid        = folder_id_map.get(parent_rel, root_id)
            fid        = create_drive_folder(service, parts[-1], pid)
            folder_id_map[rel] = fid

        # ── Only collect files from dirs that match --include ──
        # (root "" is skipped if include_patterns given — must match explicitly)
        if include_patterns and not _dir_matches(rel, include_patterns):
            continue

        drive_folder_id = folder_id_map[rel]
        drive_contents  = get_drive_folder_contents(service, drive_folder_id) if sync else {}

        for fname in sorted(filenames):
            fpath         = str(Path(dirpath) / fname)
            existing_file = drive_contents.get(fname) if sync else None
            tasks.append((fpath, drive_folder_id, existing_file))
            files_found  += 1

    sys.stdout.write("\r" + " " * 80 + "\r")
    sys.stdout.flush()
    print(f"   Scan complete: {dirs_visited} dirs visited, {dirs_pruned} dirs pruned, {files_found} files queued.")
    return tasks


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description='High-speed parallel sync to Google Drive.')
    parser.add_argument('folder',      type=str, help='Local folder path.')
    parser.add_argument('--name',      type=str, help='Destination folder name on Drive.')
    parser.add_argument('--parent',    type=str, help='Parent folder ID on Drive.')
    parser.add_argument('--threads',   type=int, default=20,
                        help='Number of parallel uploads (default 20).')
    parser.add_argument('--no-sync',   action='store_false', dest='sync',
                        help='Disable MD5 check — upload all files without comparing.')
    parser.add_argument('--include',   '-i', action='append', default=[],
                        metavar='GLOB',
                        help='Only upload sub-paths matching this glob '
                             '(relative to <folder>, repeat for multiple). '
                             'E.g. --include "09/*/0.sources"')
    args = parser.parse_args()

    local_path = os.path.abspath(args.folder)
    if not os.path.isdir(local_path):
        print(f"Error: {local_path} not found.")
        return

    service = get_drive_service()
    if not service:
        return

    print(f"\n{'='*60}")
    print(f" upload_folder_to_drive.py")
    print(f"{'='*60}")
    print(f"   Local  : {local_path}")
    print(f"   Name   : {args.name or Path(local_path).name}")
    print(f"   Include: {args.include or '(all)'}")
    print(f"   Threads: {args.threads}")
    print(f"   Sync   : {args.sync}")

    print(f"\n🚀 Phase 1: Scanning and creating Drive folders...")
    all_tasks = scan_and_collect(
        service, local_path,
        parent_id       = args.parent,
        drive_folder_name = args.name,
        sync            = args.sync,
        include_patterns = args.include,
    )

    if not all_tasks:
        print("Nothing to upload. Check your --include pattern.")
        return

    print(f"\n🚀 Phase 2: Uploading {len(all_tasks)} files using {args.threads} threads...")

    count = 0
    total = len(all_tasks)
    with ThreadPoolExecutor(max_workers=args.threads) as executor:
        futures = {executor.submit(upload_worker, task): task for task in all_tasks}
        for future in as_completed(futures):
            count += 1
            result = future.result()
            if result:
                with _print_lock:
                    sys.stdout.write("\r" + " " * 80 + "\r")
                    print(f"[{count}/{total}] {result[:100]}")
                    sys.stdout.flush()
            else:
                with _print_lock:
                    sys.stdout.write(f"\r   Progress: {count}/{total}   ")
                    sys.stdout.flush()

    print(f"\n\n{'='*60}")
    print(f"✅ Done.")
    print(f"{'='*60}\n")

if __name__ == '__main__':
    main()