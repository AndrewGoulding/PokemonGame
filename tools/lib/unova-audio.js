// Bind BW2 zone requests to the available original BW archive. Every substitute
// is recorded explicitly; SW-prefixed BW2 revisions are never called exact.
'use strict';const table=require('./unova-music.json');
module.exports=function({json,M,bankMaps}){
 const seasons=['spring','summer','autumn','winter'],versions=['black2','white2'],data={maps:{},table,aliases:{},source:{archive:'Original Black/White files/wb_sound_data.sdat',bindings:'BW2 res/field/zones/*.json',exclusive:'BW2-exclusive recordings are unavailable; substitutes are labeled'}};
 const aliases={mus_vs_wild:'VS_NORAPOKE',mus_vs_trainer:'VS_TRAINER',mus_vs_gym_leader:'VS_GYMLEADER',mus_vs_champion:'VS_CHAMP',mus_vs_legend:'VS_SETPOKE',mus_victory_wild:'WIN2',mus_victory_trainer:'WIN1',mus_victory_gym_leader:'WIN3',mus_encounter_boy:'EYE_01',mus_encounter_girl:'EYE_02',mus_encounter_rocket:'EYE_PLASMA',mus_encounter_rival:'E_RIVAL',mus_encounter_gym_leader:'EYE_01',mus_cycling:'BICYCLE',mus_surf:'NAMINORI',mus_dive:'DIVING',mus_poke_center:'POKECEN',mus_gym:'GYM',mus_oak_lab:'LABO',mus_ss_anne:'PLEASURE_BOAT',mus_rocket_hideout:'N_CASTLE',mus_victory_road:'D_CHAMPROAD',mus_evolution:'SHINKA',mus_evolution_intro:'SHINKA',mus_caught:'WIN2'};
 for(const[k,v]of Object.entries(aliases)){const key='SEQ_BGM_'+v;if(!table[key])throw Error('Missing BW music alias '+key);data.aliases[k]=table[key];}
 for(const[k,v]of Object.entries({mus_level_up:'LVUP',mus_obtain_item:'ITEM',mus_obtain_key_item:'KEYITEM',mus_obtain_tmhm:'WAZA',mus_obtain_badge:'BADGE',mus_heal:'ASA',mus_evolved:'SHINKAOME',mus_obtain_berry:'KINOMI',mus_move_deleted:'WASURE',mus_caught_intro:'POKEGET',mus_dex_rating:'HYOUKA1'})){if(!table['SEQ_ME_'+v])throw Error('Missing BW jingle '+v);data.aliases[k]=table['SEQ_ME_'+v];}
 const primary={};for(const[bank,m]of Object.entries(bankMaps))if(!primary[m.name]||m.unovaSourceZone===bank)primary[m.name]=bank;
 function fallback(raw,m,season){
  const ending={spring:'SP',summer:'SU',autumn:'AU',winter:'WI'}[season];
  if(/GYM/.test(raw)||m.type==='gym')return'SEQ_BGM_GYM';
  if(m.unovaCruise)return'SEQ_BGM_PLEASURE_BOAT';
  if(/Frigate|NCastle/.test(m.name)||/AJITO/.test(raw))return'SEQ_BGM_N_CASTLE';
  if(m.unovaTower||/TowerLobby|TreehollowLobby|PWT|Subway|BattleInstitute/.test(m.name))return'SEQ_BGM_BATTLE_SUBWAY';
  if(/Pokestar|Studio/.test(m.name))return'SEQ_BGM_MSL_FIELD';
  if(/JoinAvenue/.test(m.name))return'SEQ_BGM_C_04';
  if(/Aspertia/.test(m.name))return'SEQ_BGM_T_01';
  if(/Floccesy/.test(m.name))return'SEQ_BGM_T_02';
  if(/Virbank|Driftveil/.test(m.name))return'SEQ_BGM_C_05';
  if(/Humilau/.test(m.name))return'SEQ_BGM_T_05_'+ending;
  if(/Lentimas/.test(m.name))return'SEQ_BGM_T_04';
  if(/Route19|Route20|R_19/.test(m.name+' '+raw))return'SEQ_BGM_R_B_'+ending;
  if(/Route21|Route22|Route23|R_22|R_23/.test(m.name+' '+raw))return'SEQ_BGM_R_E_'+ending;
  if(m.type==='cave'||m.unovaGrotto!=null||/MOUNTAIN|CAVE|D_/.test(raw))return'SEQ_BGM_D_01';
  return m.type==='indoor'?'SEQ_BGM_H_01':m.type==='city'||m.type==='town'?'SEQ_BGM_T_02':'SEQ_BGM_R_A';
 }
 function choose(raw,m,season,version){if(raw==='SEQ_BGM_C_08_B'&&version==='white2')raw='SEQ_BGM_C_08_W';if(raw==='SEQ_BGM_C_10_B'&&version==='white2')raw='SEQ_BGM_C_10_W';if(table[raw])return{requested:raw,song:table[raw],exact:true};const normalized=String(raw||'').replace('SEQ_BGM_SW_','SEQ_BGM_');const replacement=table[normalized]?normalized:fallback(String(raw||''),m,season);return{requested:raw||null,song:table[replacement],exact:false,replacement};}
 for(const[name,m]of Object.entries(M)){
  let bank=primary[name],inherited=null;
  if(!bank){const q=[name],seen=new Set(q);for(let i=0;i<q.length&&!bank;i++)for(const w of M[q[i]].warps||[]){if(!M[w.map]||seen.has(w.map))continue;seen.add(w.map);if(primary[w.map]){bank=primary[w.map];inherited=w.map;break;}q.push(w.map);}}
  let raw=bank?json('res/field/zones/'+bank+'.json').bgm:null;
  if(m.pokemonCenter)raw='SEQ_BGM_POKECEN';else if(m.type==='gym')raw=raw||'SEQ_BGM_GYM';else if(m.unovaCruise)raw='SEQ_BGM_PLEASURE_BOAT';else if(m.unovaTower)raw='SEQ_BGM_SW_TOWER';else if(name==='UnovaHome')raw='SEQ_BGM_H_01';
  const tracks={};for(const season of seasons){tracks[season]={};for(const version of versions){const request=typeof raw==='string'?raw:raw?.[season]||raw?.all_year||null;tracks[season][version]=choose(request,m,season,version);}}
  data.maps[name]={bank:bank||null,inherited,tracks};m.unovaMusic=true;m.music=tracks.spring.black2.song;
 }
 data.stats={maps:Object.keys(data.maps).length,exact:Object.values(data.maps).filter(a=>!a.inherited&&a.tracks.spring.black2.exact).length,substituted:Object.values(data.maps).filter(a=>!a.tracks.spring.black2.exact).length};return data;
};
