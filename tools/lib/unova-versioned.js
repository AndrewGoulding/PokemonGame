// Distinct source banks stay distinct: shared item/trainer flags survive swaps.
'use strict';
module.exports=function({root,source,json,M,bankMaps,west,east,paint,link}){
 const fs=require('fs'),path=require('path'),{readPng,writePng}=require('./png');
 const data={rooms:[],bindings:[],pairs:[],edges:[]};
 function bind(bank,m){const z=json('res/field/zones/'+bank+'.json');bankMaps[bank]=east.banks[bank]=m;m.unovaSourceZone=bank;m.unovaEncounterBank=z.encounters?.slice(11).toLowerCase()||null;m.unovaWildFloor=!!m.unovaEncounterBank&&m.type==='cave';data.bindings.push({bank,map:m.name,encounters:m.unovaEncounterBank});return m;}
 function add(bank,name,title,type='cave'){const m=west.helpers.area(name,title,null,type,42,36);delete m.unovaWest;m.unovaEast=true;bind(bank,m);data.rooms.push(m.name);return m;}
 function spot(m,x=5,y=m.height-5){const cells=[];for(let yy=3;yy<m.height-3;yy++)for(let xx=3;xx<m.width-3;xx++){const k=yy*m.width+xx;if(!m.collision[k]&&m.behavior[k]!==0x10&&![...m.people,...m.warps,...m.signs].some(a=>Math.abs(a.x-xx)+Math.abs(a.y-yy)<2))cells.push({x:xx,y:yy});}return cells.sort((a,b)=>Math.abs(a.x-x)+Math.abs(a.y-y)-Math.abs(b.x-x)-Math.abs(b.y-y))[0];}
 function split(a,b,m){const ai=a.warps.findIndex(w=>w.map===b.name),bi=b.warps.findIndex(w=>w.map===a.name);if(ai<0||bi<0)throw Error('Missing versioned link '+a.name+' '+b.name);const x=spot(m),y=spot(m,m.width-5,5),i=m.warps.length;m.warps.push({...x,map:a.name,warp:ai},{...y,map:b.name,warp:bi});a.warps[ai]={...a.warps[ai],map:m.name,warp:i};b.warps[bi]={...b.warps[bi],map:m.name,warp:i+1};for(const p of [x,y]){const k=p.y*m.width+p.x;m.collision[k]=0;m.behavior[k]=0x61;m.encounter[k]=0;}}
 function edges(banks){const set=new Set(banks);for(const bank of banks){const a=bankMaps[bank];for(const w of json('res/field/events/'+bank+'.json').warps){const next=w.zone.slice(5).toLowerCase(),b=bankMaps[next];if(!set.has(next)||!b||a===b||a.warps.some(w=>w.map===b.name))continue;const x=spot(a,a.width-5,5),y=spot(b);link(a,x.x,x.y,b,y.x,y.y);data.edges.push({from:a.name,to:b.name,sourceBanks:[bank,next]});}}}
 function pair(a,b,kind){a.unovaAlternative=b.name;b.unovaAlternative=a.name;a.unovaVariant=kind==='version'?'black2':'normal';b.unovaVariant=kind==='version'?'white2':'frozen';a.unovaVariantKind=b.unovaVariantKind=kind;data.pairs.push({kind,a:a.name,b:b.name});}
 const texture=readPng(path.join(source,'res/field/maps/textures/reversal_mountain_2/in81_magu01.png')),out=new Uint8ClampedArray(16*16*4);
 for(let y=0;y<16;y++)for(let x=0;x<16;x++){const i=(y*4*texture.width+x*4)*4;out.set(texture.rgba.subarray(i,i+4),(y*16+x)*4);}
 writePng(path.join(root,'assets/unova/reversal-lava.png'),16,16,out);
 const b={2:bind('reversal_mountain_2',M.UnovaReversalDepths),5:bind('reversal_mountain_5',M.UnovaReversalHeart),7:bind('reversal_mountain_7',M.UnovaReversalExit)};
 for(const i of [3,4,6])b[i]=add('reversal_mountain_'+i,'ReversalBlack'+i,'Reversal Mountain · '+({3:'Western Side Cave',4:'Water Caldera',6:'Western Ramps'}[i]));
 b[2].title='Reversal Mountain · Western Passage';
 const labels={8:'Western Passage',9:'Eastern Side Cave',10:'Lava Caldera',11:'Magma Stone Chamber',12:'Eastern Ramps',13:'Undella Passage'};
 for(let i=2;i<=7;i++){
  const w=add('reversal_mountain_'+(i+6),'ReversalWhite'+(i+6),'Reversal Mountain · '+labels[i+6]);pair(b[i],w,'version');
  for(const m of [b[i],w])m.unovaDungeonBianca=true;
  for(const a of b[i].people.filter(a=>['bw:heatran','bw:reversal-finish'].includes(a.script)))w.people.push({...a,...spot(w,a.x,a.y),id:a.id+'-white',localId:a.localId+'_WHITE'});
 }
 split(b[2],b[7],b[4]);split(b[2],b[5],b[4]);
 edges(['reversal_mountain',...Array.from({length:12},(_,i)=>'reversal_mountain_'+(i+2)),'undella_town']);
 // Blue water and dry rock versus the active volcanic version. Lava is a
 // solid decorative surface; it must never become a Surf encounter tile.
 for(let i=2;i<=7;i++){
  for(const [m,lava]of [[b[i],false],[bankMaps['reversal_mountain_'+(i+6)],true]]){
   m.unovaReversalLava=lava;
   for(const[x,y]of [[8,10],[m.width-12,m.height-13]]){
    if(m.people.some(a=>Math.abs(a.x-x)<7&&Math.abs(a.y-y)<5)||m.warps.some(a=>Math.abs(a.x-x)<7&&Math.abs(a.y-y)<5))continue;
    paint(m,x,y,5,3,lava?'lava':'water',lava);
   }
  }
 }
 const forest=bind('giant_chasm_3',M.UnovaGiantChasmForest),outer=add('giant_chasm_2','GiantChasmOuterCave','Giant Chasm · Outer Cave'),frozen=add('giant_chasm_4','GiantChasmFrozenForest','Giant Chasm · Frozen Forest','route');
 frozen.unovaFrozen=true;frozen.unovaTheme='frozen';for(const[x,y]of [[5,5],[31,5],[5,19],[31,19]])paint(frozen,x,y,4,4,'tree',true);pair(forest,frozen,'chasm');split(M.UnovaGiantChasm,forest,outer);
 edges(['giant_chasm','giant_chasm_2','giant_chasm_3','giant_chasm_4','giant_chasm_5','giant_chasm_6','route_22','route_23','plasma_frigate_6']);
 function encounters(){for(const a of data.bindings){const m=M[a.map];if(m.unovaWildFloor)for(let i=0;i<m.encounter.length;i++)if(!m.collision[i]&&m.behavior[i]!==0x10&&!m.warps.some(w=>w.y*m.width+w.x===i))m.encounter[i]=1;}}
 return{data,encounters};
};
