// Keep multi-stem DS synthesis off the game/render thread.
self.window=self;
importScripts('../game/nds-sound.js');
let library;
self.onmessage=({data:m})=>{if(m.library){library=m.library;return;}try{const r=NDS.render(library.songs[m.song],library,m.opts);self.postMessage({id:m.id,result:r},[r.left.buffer,r.right.buffer]);}catch(error){self.postMessage({id:m.id,error:String(error)});}};
