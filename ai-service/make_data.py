import csv, random
from datetime import datetime, timedelta

teams = ['Inter','Milan','Juventus','Napoli','Roma','Manchester City','Arsenal','Liverpool','Chelsea','Manchester United','Bayern Munich','Borussia Dortmund','Barcelona','Real Madrid','Atletico Madrid','Paris Saint-Germain']

rows = []
start = datetime(2024, 8, 17)
for i in range(200):
    home = teams[i % len(teams)]
    away = teams[(i + 1 + i//len(teams)) % len(teams)]
    if home == away: continue
    hg = random.randint(0,4)
    ag = random.randint(0,3)
    d = (start + timedelta(days=i%7)).strftime('%Y-%m-%d')
    rows.append([home, away, hg, ag, d, '2024-2025'])

with open('/app/datasets/matches.csv', 'w', newline='') as f:
    w = csv.writer(f)
    w.writerow(['home_team','away_team','home_goals','away_goals','date','season'])
    w.writerows(rows)
print(f'Created {len(rows)} synthetic matches')
