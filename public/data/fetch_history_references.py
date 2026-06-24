import urllib.request
import json
import re
import os

def fetch_url(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        response = urllib.request.urlopen(req, timeout=10)
        return response.read().decode('utf-8', errors='ignore')
    except Exception as e:
        print(f"Error fetching {url}: {e}")
        return ""

def get_goal_bucket(minute_str):
    if '+' in minute_str:
        if minute_str.startswith('45'):
            return 3  # 1HT 45+
        elif minute_str.startswith('90'):
            return 7  # 2HT 90+
        
    try:
        # Extract base minute (ignoring + part if any)
        base_min = int(minute_str.split('+')[0])
    except ValueError:
        return -1

    if base_min <= 15:
        return 0
    elif base_min <= 30:
        return 1
    elif base_min <= 45: # 31-45
        return 2
    elif base_min <= 60:
        return 4
    elif base_min <= 75:
        return 5
    elif base_min <= 90: # 76-90
        return 6
    return -1

def process_historical_match(match_id, group_name, home_team, away_team, score, date_str, target_match_id):
    goals = ['', '', '', '', '', '', '', '']
    # Fetch goal detail
    dir_id = str(match_id)[:4]
    url = f"https://data.7msport.com/goaldata/en/{dir_id}/{match_id}.js"
    js_content = fetch_url(url)
    
    if js_content:
        # Extract d_tm (minutes), d_bf (scores), d_sx (teams)
        d_tm_match = re.search(r"var d_tm = \[(.*?)\];", js_content)
        d_bf_match = re.search(r"var d_bf = \[(.*?)\];", js_content)
        d_sx_match = re.search(r"var d_sx = \[(.*?)\];", js_content)
        
        if d_tm_match and d_bf_match and d_sx_match:
            d_tm = [x.strip("'\"") for x in d_tm_match.group(1).split(',')] if d_tm_match.group(1) else []
            d_bf = [x.strip("'\"") for x in d_bf_match.group(1).split(',')] if d_bf_match.group(1) else []
            
            for i in range(len(d_tm)):
                minute = d_tm[i]
                current_score = d_bf[i]
                
                bucket = get_goal_bucket(minute)
                if bucket != -1 and current_score:
                    entry = f"{minute}' {current_score}"
                    if goals[bucket] == '':
                        goals[bucket] = entry
                    else:
                        goals[bucket] += "<br>" + entry
    
    return {
        "date": date_str,
        "day": "",
        "time": "",
        "status": "FT",
        "group": group_name,
        "title": f"{home_team} {score} {away_team}",
        "homeTeam": home_team,
        "awayTeam": away_team,
        "score": score,
        "matchId": str(match_id),
        "targetMatchId": str(target_match_id),
        "goals": goals,
        "isReference": True
    }

def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('match_id', type=int)
    parser.add_argument('home_team', type=str)
    parser.add_argument('away_team', type=str)
    args = parser.parse_args()
    
    target_match_id = args.match_id
    home_team = args.home_team
    away_team = args.away_team
    
    # 1. Fetch gamehistory_en.js (H2H)
    h2h_js = fetch_url(f"https://px-analyse.7mdt.com/{target_match_id}/data/gamehistory_en.js")
    
    # 2. Fetch gameteamhistory_en.js (Team history)
    team_history_js = fetch_url(f"https://px-analyse.7mdt.com/{target_match_id}/data/gameteamhistory_en.js")
    
    historical_matches = []
    
    # Extract teams dictionary
    team_dict = {}
    team_match = re.search(r'"team":{(.*?)}', h2h_js)
    if team_match:
        for pair in team_match.group(1).split(','):
            if ':' in pair:
                k, v = pair.split(':', 1)
                team_dict[k.strip('"')] = v.strip('"')
                
    # Process H2H
    if h2h_js:
        h2h_match = re.search(r'"historymatch":{(.*?)}', h2h_js)
        if h2h_match:
            data = h2h_match.group(1)
            ids = re.search(r'"id":\[(.*?)\]', data)
            aids = re.search(r'"aid":\[(.*?)\]', data)
            bids = re.search(r'"bid":\[(.*?)\]', data)
            livea = re.search(r'"liveA":\[(.*?)\]', data)
            liveb = re.search(r'"liveB":\[(.*?)\]', data)
            dates = re.search(r'"date":\[(.*?)\]', data)
            
            if ids and aids and bids and livea and liveb and dates:
                id_list = ids.group(1).split(',')[:3]
                aid_list = aids.group(1).split(',')[:3]
                bid_list = bids.group(1).split(',')[:3]
                livea_list = livea.group(1).split(',')[:3]
                liveb_list = liveb.group(1).split(',')[:3]
                date_list = [x.strip('"') for x in dates.group(1).split(',')][:3]
                
                for i in range(len(id_list)):
                    h_team = team_dict.get(aid_list[i], aid_list[i])
                    a_team = team_dict.get(bid_list[i], bid_list[i])
                    score = f"{livea_list[i]}-{liveb_list[i]}"
                    match_obj = process_historical_match(id_list[i], "H2H", h_team, a_team, score, date_list[i], target_match_id)
                    historical_matches.append(match_obj)

    # Process Team History
    if team_history_js:
        team_match2 = re.search(r'"team":{(.*?)}', team_history_js)
        if team_match2:
            for pair in team_match2.group(1).split(','):
                if ':' in pair:
                    k, v = pair.split(':', 1)
                    team_dict[k.strip('"')] = v.strip('"')
                    
        # Extract A history
        a_hist = re.search(r'"A":{"all":{"history":{(.*?)}}', team_history_js)
        if a_hist:
            data = a_hist.group(1)
            ids = re.search(r'"id":\[(.*?)\]', data)
            aids = re.search(r'"aid":\[(.*?)\]', data)
            bids = re.search(r'"bid":\[(.*?)\]', data)
            livea = re.search(r'"liveA":\[(.*?)\]', data)
            liveb = re.search(r'"liveB":\[(.*?)\]', data)
            dates = re.search(r'"date":\[(.*?)\]', data)
            
            if ids and aids and bids and livea and liveb and dates:
                id_list = ids.group(1).split(',')[:3]
                aid_list = aids.group(1).split(',')[:3]
                bid_list = bids.group(1).split(',')[:3]
                livea_list = livea.group(1).split(',')[:3]
                liveb_list = liveb.group(1).split(',')[:3]
                date_list = [x.strip('"') for x in dates.group(1).split(',')][:3]
                
                for i in range(len(id_list)):
                    h_team = team_dict.get(aid_list[i], aid_list[i])
                    a_team = team_dict.get(bid_list[i], bid_list[i])
                    score = f"{livea_list[i]}-{liveb_list[i]}"
                    match_obj = process_historical_match(id_list[i], f"{home_team} Hist", h_team, a_team, score, date_list[i], target_match_id)
                    historical_matches.append(match_obj)
                    
        # Extract B history
        b_hist = re.search(r'"B":{"all":{"history":{(.*?)}}', team_history_js)
        if b_hist:
            data = b_hist.group(1)
            ids = re.search(r'"id":\[(.*?)\]', data)
            aids = re.search(r'"aid":\[(.*?)\]', data)
            bids = re.search(r'"bid":\[(.*?)\]', data)
            livea = re.search(r'"liveA":\[(.*?)\]', data)
            liveb = re.search(r'"liveB":\[(.*?)\]', data)
            dates = re.search(r'"date":\[(.*?)\]', data)
            
            if ids and aids and bids and livea and liveb and dates:
                id_list = ids.group(1).split(',')[:3]
                aid_list = aids.group(1).split(',')[:3]
                bid_list = bids.group(1).split(',')[:3]
                livea_list = livea.group(1).split(',')[:3]
                liveb_list = liveb.group(1).split(',')[:3]
                date_list = [x.strip('"') for x in dates.group(1).split(',')][:3]
                
                for i in range(len(id_list)):
                    h_team = team_dict.get(aid_list[i], aid_list[i])
                    a_team = team_dict.get(bid_list[i], bid_list[i])
                    score = f"{livea_list[i]}-{liveb_list[i]}"
                    match_obj = process_historical_match(id_list[i], f"{away_team} Hist", h_team, a_team, score, date_list[i], target_match_id)
                    historical_matches.append(match_obj)

    # Save to individual reference file
    import datetime
    now = datetime.datetime.now()
    year_str = now.strftime('%Y')
    month_str = now.strftime('%m')
    date_str = now.strftime('%Y_%m_%d')
    
    refs_dir = os.path.join(os.path.dirname(__file__), '..', 'sports', 'refs', year_str, month_str, date_str)
    if not os.path.exists(refs_dir):
        os.makedirs(refs_dir, exist_ok=True)
        
    parsed_file = os.path.join(refs_dir, f'{target_match_id}.json')
    
    with open(parsed_file, 'w', encoding='utf-8') as f:
        json.dump(historical_matches, f, indent=2)
        
    print(f"Successfully saved {len(historical_matches)} historical matches for {home_team} vs {away_team} to {target_match_id}.json.")

if __name__ == '__main__':
    main()
