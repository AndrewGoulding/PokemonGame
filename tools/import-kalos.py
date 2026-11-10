"""Import pinned veekun XY encounters and level-up moves. Usage: python tools/import-kalos.py /tmp
Input files: kalos-<table>.csv. Trainers/story/layouts are curated separately.
"""
import csv,json,pathlib,sys,hashlib
base=pathlib.Path(sys.argv[1]); root=pathlib.Path(__file__).resolve().parents[1]
def rows(n): return list(csv.DictReader((base/('kalos-'+n+'.csv')).open()))
names={int(r['pokemon_species_id']):r['name'] for r in rows('pokemon_species_names') if r['local_language_id']=='9'}
species_for={int(r['id']):int(r['species_id']) for r in rows('pokemon')}
moves={int(r['move_id']):r['name'].replace('Vice Grip','Vise Grip').replace('Feint Attack','Feint Attack') for r in rows('move_names') if r['local_language_id']=='9'}
learn={}
for r in rows('pokemon_moves'):
 if r['version_group_id']=='15' and r['pokemon_move_method_id']=='1' and int(r['pokemon_id']) in names:
  s=names[int(r['pokemon_id'])]; pair=[int(r['level']),moves[int(r['move_id'])],int(r['order'] or 0)]
  if pair not in learn.setdefault(s,[]): learn[s].append(pair)
learn={n:[[l,m] for l,m,o in sorted(a,key=lambda v:(v[0],v[2]))] for n,a in learn.items()}
slots={r['id']:r for r in rows('encounter_slots') if r['version_group_id']=='15' }
methods={r['id']:r['identifier'] for r in rows('encounter_methods')}
areas={('713','walk'):'Route2',('714','walk'):'Route3',('733','walk'):'Route22',('734','walk'):'SantaluneForest',('715','yellow-flowers'):'Route4Yellow',('715','red-flowers'):'Route4Red',('716','walk'):'Route5',('716','purple-flowers'):'Route5Flowers',('717','rough-terrain'):'Route6',('718','walk'):'Route7West',('718','yellow-flowers'):'Route7Yellow',('718','purple-flowers'):'Route7Purple',('719','walk'):'Route8Upper',('719','yellow-flowers'):'Route8Flowers',('720','rough-terrain'):'Route9',('736','walk'):'GlitteringCave',('753','walk'):'ConnectingCave'}
for area,label,method in [('721','Route10','walk'),('721','Route10Yellow','yellow-flowers'),('722','Route11','walk'),('723','Route12','walk'),('723','Route12Yellow','yellow-flowers'),('724','Route13','rough-terrain'),('738','Reflection1F','walk'),('739','ReflectionB1F','walk'),('740','ReflectionB2F','walk'),('741','ReflectionDeep','walk'),('760','AzureBay','walk')]:areas[(area,method)]=label
for area,label in [('723','Route12'),('760','AzureBay'),('719','Route8Coast'),('710','CyllageCity'),('709','AmbretteTown')]:
 for method in ['surf','old-rod','good-rod','super-rod']:areas[(area,method)]=label+'_'+method
# Late-campaign source areas; preserve distinct flower and water methods.
late=[('725','Route14','walk'),('726','Route15','walk'),('727','Route16','rough-terrain'),('728','Route17','rough-terrain'),('729','Route18','walk'),('730','Route19','rough-terrain'),('731','Route20','walk'),('732','Route21','purple-flowers'),('742','FrostExterior',None),('743','Frost1F','walk'),('744','Frost2F','walk'),('745','Frost3F','walk'),('746','FrostDeep','walk'),('747','PokemonVillage','yellow-flowers'),('748','VictoryCave1','walk'),('749','VictoryGrove','walk'),('750','VictoryCave2','walk'),('751','VictoryFalls',None),('752','VictoryCave3','walk'),('754','Terminus1F','walk'),('755','TerminusB1F','walk'),('756','TerminusB2F','walk'),('759','LostHotel','walk')]
for area,label,primary in late:
 if primary:areas[(area,primary)]=label
 for method in ['walk','rough-terrain','yellow-flowers','red-flowers','purple-flowers','surf','old-rod','good-rod','super-rod']:
  if method!=primary:areas[(area,method)]=label+'_'+method
enc={a:{'x':{'rate':20,'slots':[]},'y':{'rate':20,'slots':[]}} for a in areas.values()}
for r in rows('xy_encounters'):
 if r['version_id'] not in ['23','24'] or r['encounter_slot_id'] not in slots: continue
 area=(r['location_area_id'],methods[slots[r['encounter_slot_id']]['encounter_method_id']])
 if area not in areas:continue
 enc[areas[area]][{'23':'x','24':'y'}[r['version_id']]]['slots'].append({'species':names[species_for[int(r['pokemon_id'])]],'sourcePokemonId':int(r['pokemon_id']),'min':int(r['min_level']),'max':int(r['max_level']),'weight':int(slots[r['encounter_slot_id']]['rarity'])})
enc={n:t for n,t in enc.items() if all(v['slots'] for v in t.values())}
data={'source':{'repository':'https://github.com/veekun/pokedex','commit':'cc483e1877f22b8c19ac27ec0ff5fafd09c5cd5b','sha256':{n:hashlib.sha256((base/('kalos-'+n+'.csv')).read_bytes()).hexdigest() for n in ['pokemon_species_names','move_names','pokemon_moves','encounter_methods','encounter_slots','xy_encounters','pokemon']}},'speciesIds':{n:i for i,n in names.items() if i<=721},'learnsets':learn,'encounters':enc}
(root/'tools/data/kalos-xy.json').write_text(json.dumps(data,separators=(',',':'))+'\n')
print(len(learn),'learnsets;', {a:{v:len(t['slots']) for v,t in b.items()} for a,b in enc.items()})
