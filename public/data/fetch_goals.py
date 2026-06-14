import re
import json
import urllib.request
import datetime

import os

script_dir = os.path.dirname(os.path.abspath(__file__))
in_file = os.path.join(script_dir, 'scraped_matches.js')
out_file = os.path.join(script_dir, 'fifa_schedule.json')

with open(in_file, 'r', encoding='utf-8') as f:
    content = f.read()

def parse_array(var_name):
    matches = re.findall(rf'{var_name}\[(\d+)\]\s*=\s*\[(.*?)\];', content)
    result = {}
    for idx, items_str in matches:
        if "'" in items_str or '"' in items_str:
            items = []
            for item in items_str.split("','"):
                item = item.strip().strip("'").strip('"')
                if item:
                    items.append(item)
        else:
            items = [x.strip() for x in items_str.split(',') if x.strip()]
        result[int(idx)] = items
    return result

start_time_arr = parse_array('Start_time_arr')
team_a_arr = parse_array('TeamA_arr')
team_b_arr = parse_array('TeamB_arr')
groups_arr = parse_array('groups_arr')
live_bh_arr = parse_array('live_bh_arr')

def get_goal_bucket(minute_str):
    m = minute_str.replace('+', '')
    try:
        val = int(m)
    except:
        return -1
        
    if '+' in minute_str:
        if val >= 90: return 7
        if val >= 45: return 3
        
    if val <= 15: return 0
    if val <= 30: return 1
    if val <= 45: return 2
    if val <= 60: return 4
    if val <= 75: return 5
    if val <= 90: return 6
    return 7

matches = []
stage_names = ['Groups', '1/16 Final', '1/8 Final', 'Quarter-finals', 'Semi-finals', '3rd place', 'Final']

for stage_idx in range(7):
    if stage_idx not in start_time_arr: continue
    
    times = start_time_arr[stage_idx]
    team_a = team_a_arr[stage_idx]
    team_b = team_b_arr[stage_idx]
    live_ids = live_bh_arr.get(stage_idx, [])
    groups = groups_arr.get(stage_idx, [''] * len(times))
    
    for i in range(len(times)):
        if i >= len(team_a) or i >= len(team_b): continue
        
        time_parts = times[i].replace("'", "").split(',')
        if len(time_parts) >= 5:
            dt = datetime.datetime(int(time_parts[0]), int(time_parts[1]), int(time_parts[2]), int(time_parts[3]), int(time_parts[4]))
            dt = dt - datetime.timedelta(hours=15)
            date_str = dt.strftime('%Y-%m-%d')
            day_str = dt.strftime('%A')
            time_str = dt.strftime('%H:%M')
        else:
            date_str = ''
            day_str = ''
            time_str = times[i]
            
        group_val = groups[i] if i < len(groups) else ''
        ta = team_a[i].replace("'", "").replace("(N)", "").strip()
        tb = team_b[i].replace("'", "").replace("(N)", "").strip()
        
        group_display = group_val if group_val else stage_names[stage_idx]
        title = f"{ta} VS {tb}"
        
        # Default goals
        goals = ['', '', '', '', '', '', '', '']
        
        # Fetch goals for this match ID
        if i < len(live_ids):
            match_id = str(live_ids[i]).strip()
            if match_id:
                dir_id = str(int(match_id) // 1000)
                url = f'https://data.7msport.com/goaldata/en/{dir_id}/{match_id}.js'
                req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
                try:
                    js = urllib.request.urlopen(req).read().decode('utf-8', errors='ignore')
                    
                    def get_arr(name):
                        m_arr = re.search(fr'var {name}\s*=\s*\[(.*?)\];', js)
                        if not m_arr: return []
                        its = m_arr.group(1).split("','")
                        return [x.strip("'") for x in its]
                        
                    d_tm = get_arr('d_tm')
                    d_bf = get_arr('d_bf')
                    d_lx = get_arr('d_lx')
                    
                    # Split d_lx by commas
                    if len(d_lx) == 1 and ',' in d_lx[0]:
                        types = d_lx[0].split(',')
                    else:
                        types = d_lx
                        
                    final_score = None
                    for g_idx in range(len(d_tm)):
                        if g_idx < len(d_bf) and d_bf[g_idx]:
                            minute = d_tm[g_idx]
                            score = d_bf[g_idx]
                            # Only parse if it's a goal (usually lx=0,1,2, but we can trust d_bf)
                            bucket = get_goal_bucket(minute)
                            if bucket != -1:
                                existing = goals[bucket]
                                text = f"{minute}' {score}"
                                goals[bucket] = existing + ("<br>" if existing else "") + text
                                final_score = score
                except Exception as e:
                    pass
            
            if final_score:
                title = f"{ta} {final_score} {tb}"

        matches.append({
            'date': date_str,
            'day': day_str,
            'time': time_str,
            'group': group_display,
            'title': title,
            'homeTeam': ta,
            'awayTeam': tb,
            'score': final_score or 'VS',
            'matchId': match_id,
            'goals': goals
        })

matches.sort(key=lambda x: (x['date'], x['time']))

with open(out_file, 'w', encoding='utf-8') as f:
    json.dump(matches, f, indent=2)

print('Matches extracted with fetched goals:', len(matches))
