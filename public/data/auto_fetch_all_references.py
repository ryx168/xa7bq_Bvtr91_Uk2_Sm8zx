import urllib.request
import re
import subprocess
import os
import sys

# Ensure UTF-8 output
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

def main():
    # The URL that loads the active matches dataset
    data_url = "http://js-live.7mdt.com/datafile/fen.js"
    
    print(f"Fetching active match data from: {data_url}")
    # Important: 7msport requires a Referer header to prevent 403 Forbidden
    req = urllib.request.Request(data_url, headers={
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://freelive.7msport.com/'
    })
    
    try:
        js_data = urllib.request.urlopen(req).read().decode('utf-8', errors='ignore')
    except Exception as e:
        print(f"Error fetching match data: {e}")
        return

    # Parse all matches from the JS array
    # Format: sDt[5058664]=['WORLD CUP','CC3366','Canada','Bosnia and Herzegovina',...
    pattern = re.compile(r"sDt\[(\d+)\]=\[(.*?)\];", re.DOTALL)
    matches = pattern.findall(js_data)
    
    script_path = os.path.join(os.path.dirname(__file__), 'fetch_history_references.py')
    
    match_count = 0
    for match_id, array_content in matches:
        # The items are separated by commas, some inside quotes
        items = array_content.split("','")
        if len(items) >= 4:
            # Clean up the quotes
            home_team = items[2].replace("'", "").replace("(N)", "").strip()
            away_team = items[3].replace("'", "").replace("(N)", "").strip()
            
            if home_team and away_team:
                print(f"\n--- Processing Match: {match_id} ({home_team} vs {away_team}) ---")
                
                # Execute fetch_history_references.py
                try:
                    subprocess.run(
                        ['python', script_path, match_id, home_team, away_team],
                        check=True
                    )
                    match_count += 1
                except subprocess.CalledProcessError as e:
                    print(f"Error executing script for match {match_id}: {e}")

    print(f"\nFinished fetching references for {match_count} matches.")

if __name__ == '__main__':
    main()
