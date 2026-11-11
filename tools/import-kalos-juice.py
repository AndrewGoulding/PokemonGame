"""Import X/Y Juice Shoppe Berry colors/groups from a saved Bulbapedia HTML page."""
import urllib.request,pathlib,re,json,hashlib,sys
root=pathlib.Path(__file__).resolve().parents[1];url='https://bulbapedia.bulbagarden.net/wiki/Juice_Shoppe';raw=pathlib.Path(sys.argv[1]).read_bytes() if len(sys.argv)>1 else urllib.request.urlopen(url).read();s=raw.decode();groups={}
for table in re.findall(r'<table\b.*?</table>',s,re.S):
 if all(x in table for x in ['Group 1','Group 2','Group 3','Color']):
  for row in re.findall(r'<tr\b.*?</tr>',table,re.S):
   cells=re.findall(r'<t[dh][^>]*>(.*?)</t[dh]>',row,re.S)
   if len(cells)!=4:continue
   color=re.sub('<[^>]+>',' ',cells[0]).strip()
   if color not in ['Red','Purple','Pink','Green','Yellow','Blue']:continue
   for i,cell in enumerate(cells[1:]):
    for berry in sorted(set(re.findall(r'title="([^"]*Berry)"',cell))):groups[berry.lower().replace(' ','-')]={'color':color,'group':i}
assert len(groups)>=60
(root/'tools/data/kalos-juice.json').write_text(json.dumps({'source':{'url':url,'sha256':hashlib.sha256(raw).hexdigest()},'berries':groups},indent=2)+'\n');print(len(groups),'source Berry classifications')
