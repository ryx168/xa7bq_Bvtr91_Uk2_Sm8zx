import re
import json
import urllib.request
import os
import sys
import concurrent.futures
from datetime import datetime, timezone, timedelta
import math
import time

# Ensure UTF-8 output
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

out_file = os.path.join(os.path.dirname(__file__), 'reference_games.json')

def get_goal_bucket(minute_str):
    try:
        val = int(minute_str.split('+')[0])
    except:
        return -1
        
    if '+' in minute_str:
        if val >= 90: return 7
        if val >= 45: return 3
        
    if val <= 15: return 0
    if val <= 30: return 1
    if val < 45: return 2
    if val == 45: return 3
    if val <= 60: return 4
    if val <= 75: return 5
    if val < 90: return 6
    return 7

def main():
    nocache = str(int(time.time() * 1000))
    print("Fetching active match data from fen.js...")
    req = urllib.request.Request(f"http://js-live.7mdt.com/datafile/fen.js?nocache={nocache}", headers={
        'User-Agent': 'Mozilla/5.0',
        'Referer': 'https://freelive.7msport.com/'
    })
    
    try:
        js_data = urllib.request.urlopen(req).read().decode('utf-8', errors='ignore')
    except Exception as e:
        print(f"Error fetching fen.js: {e}")
        return

    print("Fetching active match scores from csxl.js...")
    req_live = urllib.request.Request(f"http://js-live.7mdt.com/livedts/csxl.js?nocache={nocache}", headers={'User-Agent': 'Mozilla/5.0'})
    try:
        live_js = urllib.request.urlopen(req_live).read().decode('utf-8', errors='ignore')
    except:
        live_js = ""

    # Parse sDt2 for live scores
    scores = {}
    live_states = {}
    
    def get_live_minute(state, array_content):
        dates = re.findall(r"'(\d{4},\d{1,2},\d{1,2},\d{1,2},\d{1,2},\d{1,2})'", array_content)
        if not dates: return 'Live'
        try:
            parts = [int(x) for x in dates[0].split(',')]
            start_utc8 = datetime(parts[0], parts[1], parts[2], parts[3], parts[4], parts[5], tzinfo=timezone(timedelta(hours=8)))
            now_utc8 = datetime.now(timezone(timedelta(hours=8)))
            diff = math.floor((now_utc8 - start_utc8).total_seconds() / 60)
            if state == '1':
                return 'Live' if diff < 0 else ('45+\'' if diff > 45 else f"{diff}'")
            if state == '3':
                return '46\'' if diff < 0 else ('90+\'' if (45 + diff) > 90 else f"{45 + diff}'")
            if state == '2': return 'HT'
            if state == '4': return 'ET'
        except: pass
        return 'Live'

    pattern_live = re.compile(r"sDt2\[(\d+)\]=\[(.*?)\];", re.DOTALL)
    start_times = {}
    for m_id, array_content in pattern_live.findall(live_js):
        items = array_content.split(",")
        
        dates = re.findall(r"'(\d{4},\d{1,2},\d{1,2},\d{1,2},\d{1,2},\d{1,2})'", array_content)
        if dates:
            try:
                parts = [int(x) for x in dates[0].split(',')]
                dt = datetime(parts[0], parts[1], parts[2], parts[3], parts[4], parts[5], tzinfo=timezone(timedelta(hours=8)))
                dt_pst = dt.astimezone(timezone(timedelta(hours=-7)))
                start_times[m_id] = dt_pst.strftime('%H:%M')
            except Exception:
                pass

        if len(items) > 2:
            state = items[0].strip()
            if state in ('1', '2', '3', '4'):
                score = f"{items[1].strip()}-{items[2].strip()}"
                scores[m_id] = score
                live_states[m_id] = get_live_minute(state, array_content)

    # Parse all matches from fen.js
    pattern = re.compile(r"sDt\[(\d+)\]=\[(.*?)\];", re.DOTALL)
    matches_raw = pattern.findall(js_data)

    matches = []
    
    now = datetime.now()
    date_str = now.strftime('%Y-%m-%d')
    day_str = now.strftime('%A')
    
    import concurrent.futures

    def process_match(match_id, array_content):
        items = array_content.split("','")
        if len(items) < 4:
            return None
        group_display = items[0].replace("'", "").strip()
        
        start_time = start_times.get(match_id, 'Live')
                
        home_team = items[2].replace("'", "").replace("(N)", "").strip()
        away_team = items[3].replace("'", "").replace("(N)", "").strip()
        
        if not home_team or not away_team:
            return None

        final_score = scores.get(match_id, '')
        title = f"{home_team} {final_score} {away_team}" if final_score else f"{home_team} VS {away_team}"
        
        goals = ['', '', '', '', '', '', '', '']
        
        dir_id = str(int(match_id) // 1000)
        url = f'https://data.7msport.com/goaldata/en/{dir_id}/{match_id}.js?nocache={int(time.time() * 1000)}'
        req_goal = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        try:
            js = urllib.request.urlopen(req_goal, timeout=5).read().decode('utf-8', errors='ignore')
            
            def get_arr(name):
                m_arr = re.search(fr'var {name}\s*=\s*\[(.*?)\];', js)
                if not m_arr: return []
                its = m_arr.group(1).split("','")
                return [x.strip("'") for x in its]
                
            d_tm = get_arr('d_tm')
            d_bf = get_arr('d_bf')
            d_pn = get_arr('d_pn')
            d_lx = get_arr('d_lx')
            
            has_goals = False
            for g_idx in range(len(d_tm)):
                # 0 = Goal, 1 = Penalty, 2 = Own Goal
                is_goal = False
                if g_idx < len(d_lx) and d_lx[g_idx] in ('0', '1', '2'):
                    is_goal = True
                # fallback if d_lx is missing but we have a score
                elif g_idx < len(d_bf) and d_bf[g_idx]:
                    is_goal = True
                
                # If d_bf is empty, it's not a goal (e.g. missed penalty might be 1 but no score)
                if g_idx < len(d_bf) and not d_bf[g_idx]:
                    is_goal = False
                    
                if is_goal:
                    minute = d_tm[g_idx]
                    score = d_bf[g_idx] if g_idx < len(d_bf) else ''
                    player = d_pn[g_idx] if g_idx < len(d_pn) else ''
                    bucket = get_goal_bucket(minute)
                    if bucket != -1:
                        existing = goals[bucket]
                        text = f"{minute}' {player} ({score})" if player else f"{minute}' {score}"
                        goals[bucket] = existing + ("<br>" if existing else "") + text
                        final_score = score
                        has_goals = True
                        
            live_score = scores.get(match_id)
            if has_goals:
                title = f"{home_team} {live_score or final_score} {away_team}"
        except Exception:
            pass
            
        return {
            'date': date_str,
            'day': day_str,
            'time': start_time,
            'group': group_display,
            'title': title,
            'homeTeam': home_team,
            'awayTeam': away_team,
            'score': live_score or final_score or 'VS',
            'matchId': match_id,
            'status': live_states.get(match_id, ''),
            'goals': goals
        }

    with concurrent.futures.ThreadPoolExecutor(max_workers=20) as executor:
        futures = []
        for match_id, array_content in matches_raw:
            futures.append(executor.submit(process_match, match_id, array_content))
        for future in concurrent.futures.as_completed(futures):
            res = future.result()
            if res:
                matches.append(res)

    out_dir = os.path.join(os.path.dirname(__file__), '..', 'sports', 'live_game')
    os.makedirs(out_dir, exist_ok=True)
    out_file = os.path.join(out_dir, f'live_games_{date_str}.json')
    with open(out_file, 'w', encoding='utf-8') as f:
        json.dump(matches, f, indent=2)

    print(f'Matches extracted with fetched goals: {len(matches)} saved to {os.path.basename(out_file)}')

    print('Updating FIFA_2026.json with live scores...')
    leagues_dir = os.path.join(os.path.dirname(__file__), '..', 'sports', 'leagues')
    os.makedirs(leagues_dir, exist_ok=True)
    fifa_file = os.path.join(leagues_dir, 'FIFA_2026.json')
    
    # Try to load existing one first, if not exists, maybe fallback to old path
    if not os.path.exists(fifa_file):
        old_fifa_file = os.path.join(os.path.dirname(__file__), 'fifa_schedule.json')
        if os.path.exists(old_fifa_file):
            import shutil
            shutil.copy(old_fifa_file, fifa_file)
            
    if os.path.exists(fifa_file):
        with open(fifa_file, 'r', encoding='utf-8') as f:
            fifa_matches = json.load(f)
            
        def process_fifa_match(m):
            match_id = m.get('matchId')
            if not match_id: return m
            
            # Use the same csxl.js score if available
            live_score = scores.get(match_id)
            if live_score:
                m['score'] = live_score
                m['status'] = live_states.get(match_id, 'Live')
                
            dir_id = str(int(match_id) // 1000)
            url = f'https://data.7msport.com/goaldata/en/{dir_id}/{match_id}.js?nocache={int(time.time() * 1000)}'
            req_goal = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            try:
                js = urllib.request.urlopen(req_goal, timeout=5).read().decode('utf-8-sig', errors='ignore')
                def get_arr(name):
                    m_arr = re.search(fr'var {name}\s*=\s*\[(.*?)\];', js)
                    if not m_arr: return []
                    its = m_arr.group(1).split("','")
                    return [x.strip("'") for x in its]
                    
                d_tm = get_arr('d_tm')
                d_bf = get_arr('d_bf')
                d_pn = get_arr('d_pn')
                d_lx = get_arr('d_lx')
                
                goals = ['', '', '', '', '', '', '', '']
                has_goals = False
                final_score = None
                
                for g_idx in range(len(d_tm)):
                    # 0 = Goal, 1 = Penalty, 2 = Own Goal
                    is_goal = False
                    if g_idx < len(d_lx) and d_lx[g_idx] in ('0', '1', '2'):
                        is_goal = True
                    # fallback if d_lx is missing but we have a score
                    elif g_idx < len(d_bf) and d_bf[g_idx]:
                        is_goal = True
                        
                    # If d_bf is empty, it's not a goal
                    if g_idx < len(d_bf) and not d_bf[g_idx]:
                        is_goal = False
                        
                    if is_goal:
                        minute = d_tm[g_idx]
                        score = d_bf[g_idx] if g_idx < len(d_bf) else ''
                        player = d_pn[g_idx] if g_idx < len(d_pn) else ''
                        bucket = get_goal_bucket(minute)
                        if bucket != -1:
                            existing = goals[bucket]
                            text = f"{minute}' {player} ({score})" if player else f"{minute}' {score}"
                            goals[bucket] = existing + ("<br>" if existing else "") + text
                            final_score = score
                            has_goals = True
                
                if has_goals or d_tm:
                    if live_score:
                        m['score'] = live_score
                    else:
                        m['score'] = final_score
                    m['goals'] = goals
                    if not m.get('status') or m.get('status') == '':
                        m['status'] = 'FT'
            except Exception:
                pass
            return m
            
        with concurrent.futures.ThreadPoolExecutor(max_workers=20) as executor:
            fifa_matches = list(executor.map(process_fifa_match, fifa_matches))
            
        with open(fifa_file, 'w', encoding='utf-8') as f:
            json.dump(fifa_matches, f, indent=2)
        print('Updated fifa_schedule.json')

if __name__ == '__main__':
    main()
