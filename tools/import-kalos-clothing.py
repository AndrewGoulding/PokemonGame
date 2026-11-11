"""Import the complete X/Y clothing catalogue, including per-boutique weekday stock.
Usage: python tools/import-kalos-clothing.py /path/to/catalogue.html
Source: https://bulbapedia.bulbagarden.net/wiki/List_of_clothing_in_Pok%C3%A9mon_X_and_Y
"""
from html.parser import HTMLParser
import pathlib,json,hashlib,re,sys,unicodedata
CATEGORIES={'Hats':'hat','Shirts':'shirt','Pants':'pants','Dresses':'dress','Socks':'socks','Shoes':'shoes','Bags':'bag','Accessories':'accessory'}
class Catalogue(HTMLParser):
 def __init__(self):super().__init__();self.sex=None;self.category=None;self.heading=None;self.headingtext=[];self.table=None;self.depth=0;self.row=None;self.cell=None;self.tables=[]
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if tag in ['h2','h3']:self.heading=tag;self.headingtext=[]
  if tag=='table':
   if self.table is not None:self.depth+=1
   elif self.sex and self.category and 'sortable' in a.get('class',''):self.table={'collection':self.sex,'category':self.category,'rows':[]};self.depth=1
  if self.table is not None and self.depth==1:
   if tag=='tr':self.row=[]
   if tag in ['td','th']:self.cell={'attrs':a,'header':tag=='th','text':[]}
 def handle_data(self,data):
  if self.heading:self.headingtext.append(data)
  if self.cell is not None:self.cell['text'].append(data)
 def handle_endtag(self,tag):
  if tag==self.heading:
   t=' '.join(''.join(self.headingtext).split());self.heading=None
   if t=='List of male clothes':self.sex='male';self.category=None
   elif t=='List of female clothes':self.sex='female';self.category=None
   elif t in CATEGORIES:self.category=CATEGORIES[t]
   elif tag=='h2':self.sex=None;self.category=None
  if self.table is not None:
   if self.depth==1:
    if tag in ['td','th'] and self.cell is not None:
     self.cell['text']=' '.join(''.join(self.cell['text']).split());self.row.append(self.cell);self.cell=None
    if tag=='tr' and self.row is not None:self.table['rows'].append(self.row);self.row=None
   if tag=='table':
    self.depth-=1
    if not self.depth:self.tables.append(self.table);self.table=None

def slug(s):return re.sub('[^a-z0-9]+','-',unicodedata.normalize('NFKD',s).encode('ascii','ignore').decode().lower()).strip('-')
path=pathlib.Path(sys.argv[1]);raw=path.read_bytes();parser=Catalogue();parser.feed(raw.decode());items=[]
for table in parser.tables:
 grid=[]
 for ri,row in enumerate(table['rows']):
  while len(grid)<=ri:grid.append({})
  ci=0
  for cell in row:
   while ci in grid[ri]:ci+=1
   for dr in range(int(cell['attrs'].get('rowspan','1'))):
    while len(grid)<=ri+dr:grid.append({})
    for dc in range(int(cell['attrs'].get('colspan','1'))):grid[ri+dr][ci+dc]=cell
   ci+=int(cell['attrs'].get('colspan','1'))
 seen={}
 for row in grid:
  if len(row)<6 or row[0]['header'] or row[4]['text']=='Price':continue
  # A multi-location item shares its name cell across rows; do not duplicate it.
  key=id(row[0]);name,color,tag,price,location=[row[i]['text'] for i in [0,2,3,4,5]]
  if 'colored background' in name:continue
  if key not in seen:
   cost=int(re.sub('[^0-9]','',price)) if '$' in price else None
   it={'id':'xy-'+table['collection']+'-'+table['category']+'-'+slug(name)+'-'+slug(color),'collection':table['collection'],'category':table['category'],'name':name,'color':color,'tag':None if tag=='N/A' else tag,'price':cost,'shops':[],'default':location=='Default','gift':location if cost is None and location!='Default' else None}
   seen[key]=it;items.append(it)
  it=seen[key]
  if location.endswith(' City Boutique'):
   days=[day for day in range(7) if row.get(day+6,{}).get('attrs',{}).get('data-sort-value')=='y']
   assert days,(it['id'],location,'no stock days')
   it['shops'].append({'city':location.removesuffix(' City Boutique').lower(),'days':days})
  elif location not in ['Default','Kiloude City'] and it['price'] is not None:raise ValueError((name,location))
assert len({i['id'] for i in items})==len(items),'Duplicate item IDs'
# The source's female introductory total differs from the sum of its individual rows.
# Preserve the listed item prices and record both totals rather than altering an item.
for sex,count,cost in [('male',102,2227000),('female',205,4672500)]:
 selected=[i for i in items if i['collection']==sex];assert len(selected)==count,(sex,len(selected));assert sum(i['price'] or 0 for i in selected)==cost,(sex,sum(i['price'] or 0 for i in selected));print(sex,len(selected),'items;',cost,'total price')
out={'source':{'url':'https://bulbapedia.bulbagarden.net/wiki/List_of_clothing_in_Pok%C3%A9mon_X_and_Y','sha256':hashlib.sha256(raw).hexdigest(),'counts':{'male':102,'female':205},'totalPrices':{'male':2227000,'female':4672500},'reportedIntroductoryTotals':{'male':2227000,'female':4676000}},'items':items}
root=pathlib.Path(__file__).resolve().parents[1];(root/'tools/data/kalos-clothing.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
