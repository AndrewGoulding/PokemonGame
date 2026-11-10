// Aligned original-sequence stems. Changing a musician adjusts gains, keeping
// every part at the same song position. Retain only one family of stem buffers.
(function(){
 'use strict';
 function create({context,master,current,setCurrent,stop,valid,trim}){
  let family=null,worker=null,failed=false,serial=0;const jobs=new Map();
  function render(base,mask){if(!worker&&!failed){try{worker=new Worker('ui/nds-audio-worker.js');worker.postMessage({library:window.UNOVA_MUSIC_DATA});worker.onmessage=({data:m})=>{const job=jobs.get(m.id);if(!job)return;jobs.delete(m.id);m.error?job.reject(Error(m.error)):job.resolve(m.result);};worker.onerror=()=>{failed=true;worker.terminate();worker=null;for(const job of jobs.values())job.reject(Error('DS audio worker failed'));jobs.clear();};}catch(e){failed=true;}}
   const opts={trackMask:mask,trimLoopWarmup:true};if(!worker)return Promise.resolve().then(()=>NDS.render(UNOVA_MUSIC_DATA.songs[base],UNOVA_MUSIC_DATA,opts));const id=++serial;return new Promise((resolve,reject)=>{jobs.set(id,{resolve,reject});worker.postMessage({id,song:base,opts});}).catch(()=>NDS.render(UNOVA_MUSIC_DATA.songs[base],UNOVA_MUSIC_DATA,opts));
  }
  function bytes(){return family? family.buffers.reduce((n,a)=>n+(a?a.buffer.length*8:0),0):0;}
  function position(c,t){let at=t-c.startedAt;if(c.loopEnd!=null&&at>=c.loopEnd)at=c.loopStart+(at-c.loopStart)%(c.loopEnd-c.loopStart);return Math.max(0,at);}
  function gainTo(g,value,seconds){const t=context().currentTime;g.gain.cancelScheduledValues(t);g.gain.setValueAtTime(g.gain.value,t);g.gain.linearRampToValueAtTime(value,t+seconds);}
  function attach(c,i,when){const f=c.mix,s=f.buffers[i],ctx=context(),source=ctx.createBufferSource(),gain=ctx.createGain();source.buffer=s.buffer;if(s.loopEnd!=null){source.loop=true;source.loopStart=s.loopStart;source.loopEnd=s.loopEnd;}source.connect(gain);gain.connect(c.gain);gain.gain.value=f.def.gains[i];source.start(when,position(c,when));c.sources[i]=source;c.stemGains[i]=gain;if(!i)c.source=source;}
  function activate(f,offset,fade){if(f!==family||!valid(f.base)||!f.buffers[0])return;let c=current();if(c?.mix===f){c.name=f.name;for(let i=0;i<c.stemGains.length;i++)if(c.stemGains[i])gainTo(c.stemGains[i],f.def.gains[i],f.def.fadeFrames/60);return;}
   stop(fade??.3);const ctx=context(),s=f.buffers[0],gain=ctx.createGain();gain.connect(master());const when=ctx.currentTime+.03;gain.gain.value=0;gain.gain.linearRampToValueAtTime(1,when+.1);c={name:f.name,play:f.base,mix:f,gain,sources:[],stemGains:[],startedAt:when-(offset||0),loopStart:s.loopStart,loopEnd:s.loopEnd};setCurrent(c);for(let i=0;i<f.buffers.length;i++)if(f.buffers[i])attach(c,i,when);
  }
  async function fill(f){if(f.loading)return;f.loading=true;try{for(let i=0;i<f.def.masks.length;i++){if(f!==family||!valid(f.base))break;if(f.buffers[i])continue;const r=await render(f.base,f.def.masks[i]);if(f!==family)break;const ctx=context(),buffer=ctx.createBuffer(2,Math.max(1,r.left.length),r.rate);buffer.copyToChannel(r.left,0);buffer.copyToChannel(r.right,1);f.buffers[i]={buffer,loopStart:r.loopStart==null?null:r.loopStart/r.rate,loopEnd:r.loopEnd==null?null:r.loopEnd/r.rate};trim(bytes());
     if(valid(f.base)){if(!i)activate(f,f.offset,f.fade);else{const c=current();if(c?.mix===f)attach(c,i,ctx.currentTime+.03);}}
    }}catch(error){f.error=String(error);}finally{f.loading=false;}}
  function start(name,def,offset,fade){let f=family;if(!f||f.base!==def.base){family=f={base:def.base,buffers:[],loading:false};trim(0);}f.name=name;f.def=def;f.offset=offset||0;f.fade=fade;activate(f,f.offset,fade);fill(f);}
  function leave(retain){if(!retain)family=null;}
  function info(){const c=current(),f=family;return f?{base:f.base,ready:f.buffers.filter(Boolean).length,total:f.def.masks.length,bytes:bytes(),gains:c?.mix===f?c.stemGains.map(a=>a?.gain.value):[],startedAt:c?.mix===f?c.startedAt:null,error:f.error||null}:null;}
  return{start,leave,info,bytes};
 }
 window.UnovaLayerAudio={create};
})();
