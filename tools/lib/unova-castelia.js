// BW2's studio-to-Burgh chapter on native 16px maps. Source checkout is read-only.
'use strict';
const path=require('path'),{canvas}=require('./orre-art');
module.exports=function({court,paint,house,link,actor,fieldTrainer,trainer,M,centers,sprites,portraits,json}){
 const cocoonArt=canvas(32,48);cocoonArt.line(16,0,16,10,[231,230,197],2);cocoonArt.ellipse(16,28,14,19,[107,133,99]);cocoonArt.ellipse(16,27,12,18,[240,236,205]);cocoonArt.ellipse(13,25,8,16,[254,249,218]);for(let y=12;y<43;y+=5){cocoonArt.line(5,y,27,y+5,[183,190,152]);cocoonArt.line(6,y+5,26,y,[215,216,177]);}cocoonArt.ellipse(16,37,6,8,[89,115,91]);cocoonArt.ellipse(16,37,4,7,[48,78,69]);cocoonArt.save(path.join(__dirname,'../../assets/world/sprites/unova_cocoon.png'));
 const captain=M.UnovaVirbankCity.people.find(a=>a.script==='bw:harbor');captain.sprite='bw2_359';sprites.add('359');
 const banks={},gymStudents=['CLARENCE','GARY','ANDERS'].map(n=>trainer('TRAINER_HARLEQUIN_'+n));
 const studios=court('UnovaPokestarStudios','Pokéstar Studios',40,36);studios.type='town';paint(studios,17,3,6,30,'paving');paint(studios,4,21,32,5,'paving');link(M.UnovaVirbankCity,28,4,studios,20,32);
 const theater=court('UnovaPokestarTheater','Pokéstar · Theater',26,24,true),stage=court('UnovaPokestarSet','Pokéstar · Soundstage',28,26,true);stage.unovaTheme='studio';theater.unovaTheme='theater';paint(stage,3,2,22,7,'stage');stage.art.props.push({x:3,y:2,kind:'green-screen'},{x:6,y:12,kind:'camera'},{x:22,y:12,kind:'camera'});theater.art.props.push({x:7,y:2,kind:'cinema-screen'});for(const y of [9,13,17])for(const x of [6,11,16])theater.art.props.push({x,y,kind:'bench'});
 for(const[m,x,y,kind]of [[theater,5,11,'gym'],[stage,24,6,'house']]){const door=house(studios,x,y,8,7,kind);link(studios,door.x,door.y,m,Math.floor(m.width/2),m.height-3,true);}
 actor(studios,19,16,'bw:studio-guide','346');actor(theater,13,5,'bw:screening','pokefan_m');actor(stage,14,5,'bw:film','346');actor(stage,8,6,'bw:film-help','artist');
 actor(M.UnovaVirbankCity,31,31,'bw:plasma-virbank','team_plasma_grunt_m');actor(M.UnovaRoute20,48,31,'bw:plasma-route20','team_plasma_grunt_m');
 banks.pokestar_studios=studios;banks.pokestar_studios_2=theater;banks.pokestar_studios_3=stage;
 const city=court('UnovaCasteliaCity','Castelia City',56,60);city.type='city';city.unovaTheme='city';city.cycling=true;for(let y=2;y<43;y++)for(let x=2;x<54;x++)city.art.tiles[y*56+x]='paving';city.music='dp_jubilife_city';
 paint(city,3,35,50,6,'paving');for(const x of [8,18,28,38,48])paint(city,x,4,3,37,'paving');paint(city,24,14,10,13,'paving');paint(city,2,43,52,15,'water');for(const x of [7,17,27,37,47])paint(city,x,40,3,15,'wood');
 actor(city,28,51,'bw:castelia-ferry','359');actor(city,28,37,'bw:harlequin-hunt','harlequin_233');actor(city,18,38,'bw:iris','355');actor(city,28,5,'bw:next-road','scientist_m_52');
 city.art.props.push({x:25,y:24,kind:'clock'},{x:6,y:39,kind:'lamp'},{x:16,y:39,kind:'lamp'},{x:36,y:39,kind:'lamp'},{x:46,y:39,kind:'lamp'});
 // Narrow native apartment blocks between the five avenues, with signed closed entries.
 for(const [x,y]of [[12,5],[12,16],[22,17],[32,18],[42,5],[42,31]]){paint(city,x,y,4,6,'building',true);city.art.buildings.push({x,y,w:4,h:6,kind:'dept',source:'CeruleanCity',doorX:x+1});city.signs.push({x:x+1,y:y+5,script:'bw:city-building-closed'});}
 const center=court('UnovaCasteliaCity_PokemonCenter_1F','Castelia · Pokémon Center',20,16,true);center.pokemonCenter=true;center.center={x:7,y:4,facing:'up'};center.music='mus_poke_center';paint(center,6,3,3,1,'paving',true);center.behavior[3*20+7]=0x80;center.behavior[3*20+12]=0x83;center.collision[3*20+12]=1;const cd=house(city,42,20,10,7,'center','red');link(city,cd.x,cd.y,center,10,14,true);actor(center,7,2,center.name+'_EventScript_Nurse','nurse');actor(center,16,5,'bw:mart','backpacker_m');centers[city.name]=center.name;
 const offices={};for(const [name,title,x,y,key]of [['MedalOffice','Medal Office',19,4,0],['AnalyticsHQ','Passerby Analytics HQ',32,7,1],['BattleCompany','Battle Company',8,23,2]]){
  const m=court('Unova'+name,'Castelia · '+title,24,22,true),door=house(city,x,y,8,7,'house');link(city,door.x,door.y,m,12,19,true);actor(m,6,8,'bw:hunt-'+key,'harlequin_233');offices[name]=m;
 }
 const company=court('UnovaBattleCompanyUpper','Battle Company · Upper Floor',28,24,true);link(offices.BattleCompany,19,4,company,14,21);const companyTrainers=['TRAINER_CLERK_M_CLEMENS','TRAINER_CLERK_M_WARREN','TRAINER_SCHOOL_KID_NEIL'].map(trainer);for(const [i,id]of companyTrainers.entries()){const a=fieldTrainer(i===2?company:offices.BattleCompany,id,17,i===0?10:i===1?14:7,i===2?'school_kid_m':'clerk_m_67');a.script='bw:company-fight-'+i;delete a.trainer;}actor(offices.BattleCompany,12,5,'bw:company-reward','janitor');actor(offices.BattleCompany,12,12,'bw:scope-lens','scientist_m_52');
 const sewerMaps=[];for(let i=0;i<5;i++){
  const m=court(i?'UnovaCasteliaSewers'+(i+1):'UnovaCasteliaSewers',i?'Castelia Sewers · Chamber '+(i+1):'Castelia Sewers',38,30);m.type='cave';m.unovaTheme='sewer';m.music='mus_mt_moon';paint(m,14,7,10,16,'water');paint(m,14,14,10,3,'wood');m.encounter=m.collision.map((c,k)=>!c&&m.behavior[k]!==0x10?1:0);sewerMaps.push(m);banks['castelia_sewers'+(i?'_'+(i+1):'')]=m;
  if(i)link(sewerMaps[i-1],33,14,m,4,14);
 }
 link(city,18,42,sewerMaps[0],5,25);actor(sewerMaps[0],8,23,'bw:hugh-sewer','291');actor(sewerMaps[0],29,8,'bw:sewer-plasma','team_plasma_grunt_m');actor(sewerMaps[0],31,8,'bw:sewer-plasma','team_plasma_grunt_m');actor(sewerMaps[0],10,6,'bw:sewer-doctor','doctor');
 const park=court('UnovaCasteliaGarden','Castelia · Secluded Garden',30,28);paint(park,4,4,22,19,'grass');paint(park,13,20,4,6,'path');link(sewerMaps[2],19,5,park,15,24);actor(park,15,5,'bw:garden-guide','backpacker_m');banks.castelia_city=park;
 const relic=court('UnovaRelicPassage','Relic Passage · Castelia Entrance',36,30);relic.type='cave';relic.unovaTheme='cave';relic.music='mus_mt_moon';relic.encounter=relic.collision.map(c=>c?0:1);link(sewerMaps[0],19,4,relic,18,26);banks.relic_passage=relic;actor(relic,18,5,'bw:relic-deep','worker_26');
 const floors=[];for(let i=0;i<3;i++){
  const m=court(i?'UnovaCasteliaCocoon'+i:'UnovaCasteliaGym','Castelia Gym · Silk Gallery '+(i+1),30,28,true);m.type='gym';m.unovaTheme='silk';m.music='mus_gym';floors.push(m);fieldTrainer(m,gymStudents[i],8+i*5,14,'harlequin_233');
 }
 const burgh=court('UnovaCasteliaBurgh','Castelia Gym · Burgh',24,22,true);burgh.type='gym';burgh.unovaTheme='silk';burgh.music='mus_gym';const gd=house(city,5,5,8,7,'gym');link(city,gd.x,gd.y,floors[0],15,25,true);
 const cocoons=[];for(let i=0;i<3;i++){const next=floors[i+1]||burgh;link(floors[i],15,4,next,Math.floor(next.width/2),next.height-3);const a=actor(floors[i],15,5,'bw:cocoon-'+i,'artist');a.x=15;a.y=4;Object.assign(a,{sprite:'unova_cocoon',width:32,height:48,frames:1,inanimate:true});cocoons.push({from:floors[i].name,to:next.name,x:Math.floor(next.width/2),y:next.height-4});}
 actor(floors[0],20,22,'bw:clyde-burgh','pokefan_m');actor(burgh,12,5,'bw:burgh','225');
 banks.castelia_city_gym=floors[0];banks.castelia_city_gym_2=burgh;banks.castelia_city_15=offices.BattleCompany;banks.castelia_city_16=offices.BattleCompany;banks.castelia_city_17=company;
 const plasma={virbank:trainer('TRAINER_TEAM_PLASMA_GRUNT_44'),route20:trainer('TRAINER_TEAM_PLASMA_GRUNT_48'),sewers:[trainer('TRAINER_TEAM_PLASMA_GRUNT'),trainer('TRAINER_TEAM_PLASMA_GRUNT_3')]};
 const sewerPartners=[13,14,15].map(n=>trainer('TRAINER_RIVAL_'+n)),doctor=trainer('TRAINER_DOCTOR_HEATH');
 // Put early sewer trainers on separate dry platforms; the level-31 rematch stays deferred.
 const sewerIds=['TRAINER_JANITOR_FELIX','TRAINER_WORKER_ZACK','TRAINER_SCIENTIST_CAROLINE','TRAINER_WORKER_SCOTT','TRAINER_SCIENTIST_CLARKE'];
 for(const [i,id]of sewerIds.entries())fieldTrainer(sewerMaps[i],trainer(id),8,9,i===2?'scientist_f_46':i===4?'scientist_m_52':i?'worker_26':'janitor');
 sprites.add('225');sprites.add('250');portraits.add('brycen');
 return{banks,data:{plasma,sewerPartners,doctor,gymStudents,cocoons,companyTrainers,burgh:trainer('TRAINER_LEADER_BURGH'),arrival:{map:city.name,x:28,y:49,facing:'up'},virbankReturn:{map:'UnovaVirbankCity',x:35,y:39,facing:'up'},studios:{map:studios.name,x:20,y:29,facing:'up'},movie:{script:json('res/pokewood/movies/0/movie.json'),cast:json('res/pokewood/movies/0/cast.json')}}};
};
