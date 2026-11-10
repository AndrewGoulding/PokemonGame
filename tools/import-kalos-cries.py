"""Import original cries for the opening Gen VI species from pinned PokeAPI/cries."""
import pathlib,urllib.request,json,hashlib,concurrent.futures
root=pathlib.Path(__file__).resolve().parents[1];out=root/'assets/audio/kalos-cries';out.mkdir(exist_ok=True);commit='b3a9044bb839b5e3152aaa536c7b463a0fcf0140'
def one(n):
 b=urllib.request.urlopen(f'https://raw.githubusercontent.com/PokeAPI/cries/{commit}/cries/pokemon/latest/{n}.ogg').read();(out/f'{n}.ogg').write_bytes(b);return str(n),hashlib.sha256(b).hexdigest()
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool: hashes=dict(pool.map(one,range(650,701)))
(root/'tools/data/kalos-cries.json').write_text(json.dumps({'repository':'https://github.com/PokeAPI/cries','commit':commit,'sha256':hashes},indent=2)+'\n')
print('Imported',len(hashes),'cries')
