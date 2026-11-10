"""Import pinned veekun XY encounters and level-up moves. Usage: python tools/import-kalos.py /tmp
Input files: kalos-<table>.csv. Trainers/story/layouts are curated separately.
"""
import csv,json,pathlib,sys,hashlib
base=pathlib.Path(sys.argv[1]); root=pathlib.Path(__file__).resolve().parents[1]
def rows(n): return list(csv.DictReader((base/('kalos-'+n+'.csv')).open()))
names={int(r['pokemon_species_id']):r['name'] for r in rows('pokemon_species_names') if r['local_language_id']=='9'}
moves={int(r['move_id']):r['name'].replace('Vice Grip','Vise Grip').replace('Feint Attack','Feint Attack') for r in rows('move_names') if r['local_language_id']=='9'}
learn={}
for r in rows('pokemon_moves'):
 if r['version_group_id']=='15' and r['pokemon_move_method_id']=='1' and int(r['pokemon_id']) in names:
  s=names[int(r['pokemon_id'])]; pair=[int(r['level']),moves[int(r['move_id'])],int(r['order'] or 0)]
  if pair not in learn.setdefault(s,[]): learn[s].append(pair)
learn={n:[[l,m] for l,m,o in sorted(a,key=lambda v:(v[0],v[2]))] for n,a in learn.items()}
slots={r['id']:r for r in rows('encounter_slots') if r['version_group_id']=='15' and r['encounter_method_id']=='1'}
areas={'713':'Route2','714':'Route3','733':'Route22','734':'SantaluneForest'}; enc={a:{'x':{'rate':20,'slots':[]},'y':{'rate':20,'slots':[]}} for a in areas.values()}
for r in rows('xy_encounters'):
 if r['version_id'] not in ['23','24'] or r['location_area_id'] not in areas or r['encounter_slot_id'] not in slots: continue
 enc[areas[r['location_area_id']]][{'23':'x','24':'y'}[r['version_id']]]['slots'].append({'species':names[int(r['pokemon_id'])],'min':int(r['min_level']),'max':int(r['max_level']),'weight':int(slots[r['encounter_slot_id']]['rarity'])})
data={'source':{'repository':'https://github.com/veekun/pokedex','commit':'cc483e1877f22b8c19ac27ec0ff5fafd09c5cd5b','sha256':{n:hashlib.sha256((base/('kalos-'+n+'.csv')).read_bytes()).hexdigest() for n in ['pokemon_species_names','move_names','pokemon_moves','encounter_slots','xy_encounters']}},'speciesIds':{n:i for i,n in names.items() if i<=721},'learnsets':learn,'encounters':enc}
(root/'tools/data/kalos-xy.json').write_text(json.dumps(data,separators=(',',':'))+'\n')
print(len(learn),'learnsets;', {a:{v:len(t['slots']) for v,t in b.items()} for a,b in enc.items()})
