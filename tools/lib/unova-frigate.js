// All source Frigate banks, with native 2D engineering challenges.
'use strict';const {execFileSync}=require('child_process');
module.exports=function({root,source,json,read,clean,M,bankMaps,west,east,paint,link,actor,trainer,trainers}){
 const area=west.helpers.area,data={rooms:[],bindings:[],edges:[],stages:[],customItems:{},source:{password:'src/ov064/scrcmd_plasma_frigate.c',pipes:'src/ov117/gimmick_plasma_frigate.c',card:'res/field/scripts/global_10885.s'}};
 const passwordText=read('res/text/system/scrcmd_plasma_frigate_scrcmd_bsubway.txt');data.passwords=[...passwordText.matchAll(/^\w+\s*=\s*(.+)$/gm)].map(a=>clean(a[1]));if(data.passwords.length!==5)throw Error('Expected five Frigate passwords');
 const c=execFileSync('git',['-C',source,'show','HEAD:'+data.source.pipes],{encoding:'utf8'}),starts=[...c.matchAll(/u8 startingOn\[PANEL_COUNT\] = \{([^}]+)\}/g)].map(a=>a[1].split(',').map(n=>+n.trim()));if(starts.length!==2||starts.some(a=>a.length!==16))throw Error('Frigate pipe source changed');data.startingPanels={black2:starts[0],white2:starts[1]};data.panelPairs=[[3,4],[11,12]];
 data.colressRematch=trainer('TRAINER_COLRESS_2');const rotom=trainers[data.colressRematch].party.find(a=>a.species==='Rotom');if(rotom)rotom.species='Rotom-Wash';
 data.cardTrainers={black2:trainer('TRAINER_TEAM_PLASMA_GRUNT_24'),white2:trainer('TRAINER_TEAM_PLASMA_GRUNT_36')};data.card='plasma-card';const card=json('res/items/plasma_card/data.json');data.customItems[data.card]={name:data.card,displayName:card.name,category:'key-items',effect:clean(card.description),price:0,sourceFolder:'plasma_card'};
 const labels={5:'Transfer Hall',7:'Crew Concourse',8:'Port Crew Room',9:'Starboard Crew Room',10:'Password and Pipe Deck',11:'Forward Gangway',12:'Cargo Passage',13:'Warp-Panel Deck',14:'Port Service Room',15:'Crew Supply Room',16:'Engine Service Room',17:'Navigation Room',18:'Crew Cabin A',19:'Crew Cabin B',20:'Crew Cabin C',21:'Crew Cabin D',22:'Mess Hall'};
 for(const[i,label]of Object.entries(labels)){
  const bank='plasma_frigate_'+i,m=area('PlasmaFrigateRoom'+i,'Plasma Frigate · '+label,null,'indoor',i==='13'?54:44,i==='13'?42:36);delete m.unovaWest;m.unovaEast=true;m.unovaTheme='ship';m.unovaSourceZone=bank;m.unovaEncounterBank=null;bankMaps[bank]=east.banks[bank]=m;data.rooms.push(m.name);data.bindings.push({map:m.name,bank});
 }
 const password=bankMaps.plasma_frigate_10,maze=bankMaps.plasma_frigate_13;data.passwordMap=password.name;data.mazeMap=maze.name;
 // Four enclosed chambers joined only by native reciprocal warp pads.
 paint(maze,2,2,50,38,'wall',true);for(const[x,y,w,h]of [[22,25,10,13],[4,4,18,14],[32,4,18,14],[4,22,16,14],[34,22,16,14]])paint(maze,x,y,w,h,'floor');maze.unovaFrigateMaze=true;
 function spot(m,x=5,y=m.height-5){const all=[];for(let yy=3;yy<m.height-3;yy++)for(let xx=3;xx<m.width-3;xx++){const k=yy*m.width+xx;if(!m.collision[k]&&![0x10,0x11,0x12].includes(m.behavior[k])&&![...m.people,...m.warps,...m.signs].some(a=>Math.abs(a.x-xx)+Math.abs(a.y-yy)<2))all.push({x:xx,y:yy});}const p=all.sort((a,b)=>Math.abs(a.x-x)+Math.abs(a.y-y)-Math.abs(b.x-x)-Math.abs(b.y-y))[0];if(!p)throw Error('No Frigate door '+m.name);return p;}
 for(const[parent,m]of [[M.UnovaPlasmaFrigateHold,maze],[M.UnovaPlasmaFrigateEngine,password]]){const p=spot(parent,parent.width-5,parent.height-5),q=m===maze?{x:26,y:36}:spot(m);data.stages.push({parent:parent.name,index:parent.warps.length,map:m.name,arrival:m.warps.length});link(parent,p.x,p.y,m,q.x,q.y);}
 function pad(a,b){const i=maze.warps.length;maze.warps.push({...a,map:maze.name,warp:i+1},{...b,map:maze.name,warp:i});for(const p of [a,b]){const k=p.y*maze.width+p.x;maze.collision[k]=0;maze.behavior[k]=0x61;maze.encounter[k]=0;maze.art.props.push({...p,kind:'warp-pad'});}}
 for(const[a,b]of [[{x:24,y:30},{x:12,y:30}],[{x:16,y:25},{x:42,y:12}],[{x:38,y:8},{x:12,y:12}],[{x:16,y:8},{x:42,y:30}],[{x:38,y:25},{x:29,y:30}]])pad(a,b);
 for(const[i,[x,y]]of [[10,7],[40,5],[8,24],[46,24]].entries())actor(maze,x,y,'bw:frigate-panel-switch-'+i,'scientist_m_52');
 actor(password,22,7,'bw:frigate-password','scientist_m_52');actor(password,32,25,'bw:frigate-card','team_plasma_grunt_f',{unovaFrigateCardVersion:'white2'});actor(bankMaps.plasma_frigate_22,14,20,'bw:frigate-card','team_plasma_grunt_f',{unovaFrigateCardVersion:'black2'});data.pipeHubs=[[13,12],[13,24],[30,12],[30,24]];for(let i=0;i<4;i++)actor(password,data.pipeHubs[i][0]+2,data.pipeHubs[i][1]+2,'bw:frigate-pipes-'+i,'scientist_m_52');for(let i=0;i<4;i++)actor(password,7+i*9,29,'bw:frigate-hint-'+i,'team_plasma_grunt_m');
 paint(bankMaps.plasma_frigate_15,20,8,2,3,'wall',true);bankMaps.plasma_frigate_15.art.props.push({x:20,y:8,kind:'bed'});actor(bankMaps.plasma_frigate_15,23,10,'bw:frigate-bed-rest','team_plasma_grunt_m');actor(bankMaps.plasma_frigate_22,22,9,'bw:frigate-dragon-record','team_plasma_grunt_m');
 actor(M.UnovaPlasmaFrigateLab,19,8,'bw:frigate-colress-postgame','250');const dock=actor(M.UnovaP2Island,23,20,'bw:frigate-postgame-board','scientist_m_52'),land=spot(M.UnovaP2Island,dock.x,dock.y+1);data.postDock={map:M.UnovaP2Island.name,...land,facing:'up'};data.shipBoard={map:M.UnovaPlasmaFrigate.name,x:21,y:28,facing:'up'};actor(M.UnovaPlasmaFrigate,7,28,'bw:frigate-postgame-disembark','scientist_m_52');
 actor(M.UnovaPlasmaFrigateHold,19,21,'bw:frigate-engineering-guide','scientist_m_52');
 // The source's static internal doorway graph; outside dock transitions keep
 // the existing story route, rather than exposing every ship phase at once.
 const banks=['plasma_frigate',...Array.from({length:21},(_,i)=>'plasma_frigate_'+(i+2))],set=new Set(banks);
 for(const bank of banks)bankMaps[bank].music='mus_rocket_hideout';
 for(const bank of banks){const a=bankMaps[bank];for(const w of json('res/field/events/'+bank+'.json').warps){const key=w.zone.slice(5).toLowerCase(),b=bankMaps[key];if(!set.has(key)||!b||a===b||a.warps.some(w=>w.map===b.name))continue;const p=spot(a,a.width-5,5),q=spot(b);link(a,p.x,p.y,b,q.x,q.y);data.edges.push({from:a.name,to:b.name,sourceBanks:[bank,key]});}}
 return{data,finish(field){
  const versions={7189:'white2',7191:'black2',7192:'black2',7193:'white2'};
  for(const a of field.pickups)if(/^plasma_frigate_/.test(a.bank)&&versions[a.script]){
   a.version=versions[a.script];const actor=M[a.map].people.find(p=>p.script==='BW_Field_'+a.script);if(actor)actor.unovaFieldVersion=a.version;
  }
 }};
};
