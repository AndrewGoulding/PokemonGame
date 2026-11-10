(function(){
 'use strict';const F=Unova,D=F.data().frigate;if(!D)return;
 for(const[id,v]of Object.entries(D.customItems)){ITEMS[id]={...v};if(window.ITEM_SPRITES)ITEM_SPRITES[id]=v.sprite;}
 const clone=a=>JSON.parse(JSON.stringify(a)),peek=p=>F.peek(p).engineering;
 function state(p){const s=F.state(p);if(!s.engineering)s.engineering={required:!s.champion&&!p.flags.unovaLeagueClear&&!s.colressFinal&&!s.ghetsis&&!Object.values(s.shipSwitches||{}).some(Boolean),panels:clone(D.startingPanels[s.version||'black2']),switches:[],passwordClear:false};return s.engineering;}
 const solved=p=>!!peek(p)?.passwordClear&&[0,1,2,3].every(i=>peek(p).switches[i]),ready=p=>!state(p).required||solved(p),password=p=>D.passwords[(p.trainerId>>>0)%5];
 function enter(p,value){const s=state(p);if(!Player.itemCount(p,D.card))return{card:true};if(value==null)return{canceled:true};const typed=String(value).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toUpperCase().trim();if(typed.length>10||typed!==password(p)){s.attempts=(s.attempts||0)+1;return{wrong:true};}s.passwordClear=true;return{open:true};}
 function toggle(p,index){if(!Number.isInteger(index)||index<0||index>3)return null;const s=state(p);for(let i=index*4;i<index*4+4;i++)s.panels[i]=s.panels[i]?0:1;s.pipeMoves=(s.pipeMoves||0)+1;return s.panels.slice(index*4,index*4+4);}
 function switchOn(p,index){if(!Number.isInteger(index)||index<0||index>3)return null;const s=state(p),already=!!s.switches[index];s.switches[index]=true;return{already,open:s.switches.filter(Boolean).length};}
 function cardTrainer(p){return D.cardTrainers[F.peek(p).version||'black2'];}
 function apply(p,map){const white=F.peek(p).version==='white2';for(let i=0;i<2;i++){
  const stage=D.stages[i],target=D.stages[white?1-i:i],m=WORLD_MAPS[stage.parent];if(map===stage.parent)m.warps[stage.index]={...F.data().maps[stage.parent].warps[stage.index],map:target.map,warp:target.arrival};
  if(map===target.map){const base=F.data().maps[target.map].warps[target.arrival];WORLD_MAPS[target.map].warps[target.arrival]={...base,map:stage.parent,warp:stage.index};WORLD_MAPS[target.map].title='Plasma Frigate · '+(i?'B2F':'B1F')+' · '+(target.map===D.passwordMap?'Pipe / Password Deck':'Warp-Panel Deck');}
 }}
 function draw(g,map,ox,oy,p){if(map!==D.passwordMap)return;const panels=peek(p)?.panels||D.startingPanels[F.peek(p).version||'black2'];g.save();for(let hub=0;hub<4;hub++){
  const[x,y]=D.pipeHubs[hub],cx=ox+x*16+8,cy=oy+y*16+8;g.fillStyle='#536f83';g.fillRect(cx-6,cy-6,12,12);
  for(const[arm,[dx,dy]]of [[0,-1],[-1,0],[1,0],[0,1]].entries()){const on=panels[hub*4+arm];g.strokeStyle=on?'#8ce7dc':'#805f58';g.lineWidth=on?5:3;g.beginPath();g.moveTo(cx+dx*5,cy+dy*5);g.lineTo(cx+dx*35,cy+dy*35);g.stroke();}
 }g.restore();}
 window.UnovaFrigate={data:()=>D,peek,state,solved,ready,password,enter,toggle,switchOn,cardTrainer,apply,draw};
})();
