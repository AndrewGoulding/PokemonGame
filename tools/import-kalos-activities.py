"""Import offline Bulbapedia table text (see tools/import-kalos-maison.py for HTML normalization).
Usage: python tools/import-kalos-activities.py /tmp/kalos-activities
"""
import pathlib,re,json,sys,hashlib
base=pathlib.Path(sys.argv[1]);root=pathlib.Path(__file__).resolve().parents[1]
def read(n):return (base/(n+'.txt')).read_text()
def ordinary(t):
 pattern=r'^\| ((?:Baroness|Baron|Viscountess|Viscount|Countess|Earl|Marchioness|Marquis|Duchess|Duke|Grand Duchess|Grand Duke|Rising Star|Lass|Schoolboy|Schoolgirl|Ace Trainer) [^\n]+)\n[^\n]+\nReward: \$([\d,]+)'
 ms=list(re.finditer(pattern,t,re.M));out=[]
 for i,m in enumerate(ms):
  chunk=t[m.end():ms[i+1].start() if i+1<len(ms) else len(t)];party=[]
  for sp,gender,level in re.findall(r'^\| ([^\n♂♀]+)([♂♀])?\n(?:[^\n]+\n)?\| Lv\.(\d+)',chunk,re.M):party.append([sp,int(level),gender or 'M'])
  if party:out.append({'name':m[1],'prize':int(m[2].replace(',','')),'party':party})
 return out
chateau=ordinary(read('Battle_Chateau')[read('Battle_Chateau').index('Barons and Baronesses\n| Trainer'):]);ranknames=['Baron','Viscount','Earl','Marquis','Duke','Grand Duke']
for t in chateau:
 name=t['name'];t['rank']=5 if name.startswith('Grand ') else 4 if name.startswith(('Duke','Duchess')) else 3 if name.startswith(('Marquis','Marchioness')) else 2 if name.startswith(('Earl','Countess')) else 1 if name.startswith('Viscount') else 0
restaurants={}
for key,n in [('nah','Restaurant_Le_Nah'),('yeah','Restaurant_Le_Yeah'),('wow','Restaurant_Le_Wow'),('sushi','Sushi_High_Roller_(Lumiose_City)')]:
 t=read(n);t=t[min(i for i in [t.find('The restaurant can be accessed'),t.find('The restaurant is located')] if i>=0):];t=t.split('\nPokémon Legends: Z-A\n')[0]
 ms=list(re.finditer(r'^(Chef|Waitress|Garçon|Owner|Furisode Girl)\n([^\n]+)\n\'\nLumiose City\nX and Y\nReward:\n\$([\d,]+)',t,re.M));out=[]
 for i,m in enumerate(ms):
  chunk=t[m.end():ms[i+1].start() if i+1<len(ms) else len(t)];mons=list(re.finditer(r'^([^\n♂♀]+?)([♂♀])? Lv\.(\d+)\n',chunk,re.M));party=[]
  for j,p in enumerate(mons):
   c=chunk[p.end():mons[j+1].start() if j+1<len(mons) else len(chunk)];ability=re.search(r'Ability:\n([^\n]+)',c);item=re.search(r'Held item:\n([^\n]+)',c);moves=re.findall(r'^([^\n]+)\n(?:Normal|Fire|Water|Electric|Grass|Ice|Fighting|Poison|Ground|Flying|Psychic|Bug|Rock|Ghost|Dragon|Dark|Steel|Fairy)\n(?:Physical|Special|Status)$',c,re.M)
   party.append({'species':p[1],'gender':p[2],'level':int(p[3]),'ability':ability[1] if ability else None,'item':item[1] if item else None,'moves':moves})
  out.append({'name':m[1]+' '+m[2],'prize':int(m[3].replace(',','')),'party':party})
 restaurants[key]=out
refs=['Battle_Chateau','Restaurant_Le_Nah','Restaurant_Le_Yeah','Restaurant_Le_Wow','Hotel_Richissime','Lumiose_City','Lost_Hotel','Kalos_Route_22','Coiffure_Clips','Boutique_Couture','Sushi_High_Roller_(Lumiose_City)']
data={'source':{'references':['https://bulbapedia.bulbagarden.net/wiki/'+n for n in refs],'sha256':{n:hashlib.sha256(read(n).encode()).hexdigest() for n in refs}},'chateau':chateau,'restaurants':restaurants,'route22':ordinary(read('Kalos_Route_22').split('\nTrainers\n')[-1].split('\nMusic\n')[0])}
(root/'tools/data/kalos-activities.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n');print('Chateau',len(chateau),'Restaurants',{k:len(v) for k,v in restaurants.items()},'Route22',len(data['route22']));print([(t['name'],len(t['party'])) for t in chateau[-14:]])
