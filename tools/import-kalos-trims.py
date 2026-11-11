"""Import Furfrou's cosmetic front/back/shiny sprites from a pinned PokeAPI snapshot."""
import urllib.request,pathlib,json,hashlib,concurrent.futures
root=pathlib.Path(__file__).resolve().parents[1];commit='1b3b7c0a538dd2226ae08d0d2f8955125075bbd4';names=['heart','star','diamond','debutante','matron','dandy','la-reine','kabuki','pharaoh'];base='https://raw.githubusercontent.com/PokeAPI/sprites/'+commit+'/sprites/pokemon/'
def fetch(task):
 name,folder=task;file=folder+'676-'+name+'.png';data=urllib.request.urlopen(base+file,timeout=35).read();assert data.startswith(b'\x89PNG');path=root/'assets/sprites/pokemon'/file;path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(data);return file,hashlib.sha256(data).hexdigest()
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:hashes=dict(pool.map(fetch,[(n,f) for n in names for f in ['','back/','shiny/','back/shiny/']]))
(root/'tools/data/kalos-trims.json').write_text(json.dumps({'repository':'https://github.com/PokeAPI/sprites','commit':commit,'sha256':hashes},indent=2)+'\n');print(len(hashes),'Furfrou form sprites')
