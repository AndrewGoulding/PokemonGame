"""Curate offline Maison text snapshots into a reproducible source catalog.
Usage: python tools/import-kalos-maison.py /tmp
Inputs: maison-{super,rules,Nita,Evelyn,Dana,Morgan}.txt or .html saved from the reference pages.
"""
import re,json,pathlib,sys,hashlib
from html.parser import HTMLParser
base=pathlib.Path(sys.argv[1]);root=pathlib.Path(__file__).resolve().parents[1]
class TableText(HTMLParser):
 def __init__(self):super().__init__();self.out=[];self.skip=0
 def handle_starttag(self,tag,attrs):
  if tag in ['script','style']:self.skip+=1
  if tag in ['br','p','div','tr','h1','h2','h3','h4','li']:self.out.append('\n')
  if tag in ['td','th']:self.out.append(' | ')
 def handle_endtag(self,tag):
  if tag in ['script','style']:self.skip-=1
 def handle_data(self,data):
  if not self.skip:self.out.append(data)
def read(name):
 path=base/('maison-'+name+'.txt')
 if path.exists():return path.read_text(encoding='utf-8')
 parser=TableText();parser.feed(path.with_suffix('.html').read_text(encoding='utf-8'))
 return '\n'.join(line.strip() for line in ''.join(parser.out).splitlines() if line.strip())+'\n'
def sets(text):
 found=list(re.finditer(r'^\| (\d{4})\n\|\n\| ([^\n]+)\n',text,re.M));out=[]
 for i,m in enumerate(found):
  chunk=text[m.end():found[i+1].start() if i+1<len(found) else len(text)];lines=[l[2:].strip() for l in chunk.splitlines() if l.startswith('| ')]
  if len(lines)<12:continue
  out.append({'species':m[2].strip(),'item':lines[0],'moves':lines[1:5],'nature':lines[5],'evs':dict(zip(['hp','atk','def','spa','spd','spe'],[int(v) if v.isdigit() else 0 for v in lines[6:12]]))})
 return out
rules=read('rules');names=['Nita','Evelyn','Dana','Morgan'];bosses={}
for name,style in zip(names,['Single','Double','Triple','Rotation']):
 t=read(name)
 # The first occurrence is the contents entry; source tables have the Battle Chatelaine header.
 pat=r'(?m)^(Super )?'+style+r' Battle \(on (?:20|50)th consecutive battle\)\nBattle Chatelaine\n'
 found=list(re.finditer(pat,t));assert len(found)==2,(name,len(found));bosses[name]={}
 for i,m in enumerate(found):
  chunk=t[m.end():found[i+1].start() if i+1<len(found) else len(t)];a=sets(chunk);expect={'Single':3,'Double':4,'Triple':6,'Rotation':4}[style];assert len(a)==expect,(name,i,len(a));bosses[name]['super' if m[1] else 'normal']=a
partners={}
for name,nextname in [('Shauna','Tierno'),('Tierno','Trevor'),('Trevor','Pokémon Omega Ruby and Alpha Sapphire')]:
 start=rules.index(name+'\n\'\n',rules.index('Multi Battle partners\nIn the'));end=rules.index(nextname+'\n',start+len(name)+1);partners[name]=sets(rules[start:end]);assert len(partners[name])==2,(name,len(partners[name]))
super_sets=sets(read('super'));assert len(super_sets)>800
files=['super','rules',*names];data={'source':{'references':['https://bulbapedia.bulbagarden.net/wiki/Battle_Maison','https://bulbapedia.bulbagarden.net/wiki/List_of_Battle_Maison_Pokémon/Super',*['https://bulbapedia.bulbagarden.net/wiki/'+n for n in names]],'sha256':{n:hashlib.sha256(read(n).encode('utf-8')).hexdigest() for n in files}},'super':super_sets,'bosses':bosses,'partners':partners}
(root/'tools/data/kalos-maison.json').write_text(json.dumps(data,indent=2,ensure_ascii=False)+'\n');print(len(super_sets),'Super sets;', {n:{k:len(v) for k,v in a.items()} for n,a in bosses.items()})
