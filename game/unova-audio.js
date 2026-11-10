(function(){
 'use strict';const F=Unova,D=F.data().audio;if(!D)return;
 function track(p,map=p.location.map){return D.maps[map]?.tracks[F.season(p)]?.[F.peek(p).version||'black2']||null;}
 function apply(p,map=p.location.map){const a=track(p,map),m=WORLD_MAPS[map];if(!a||!m)return;const old=m.music;m.music=window.UnovaMusicLayers?.plan(p,map,a.song)||a.song;if(old!==m.music&&map===p.location.map&&window.Game?.player===p&&window.GameAudio?.now()===old)GameAudio.music(m.music);}
 function battle(p,wild,foe,opts={}){if(!F.owns(p.location.map))return{};const id=opts.trainerId||'',t=F.data().trainers[id],sp=foe?.team?.[0]?.species||'';let key='SEQ_BGM_VS_TRAINER';
  if(wild)key=/^(Reshiram|Zekrom|Kyurem)/.test(sp)?'SEQ_BGM_VS_SHIN':'SEQ_BGM_VS_NORAPOKE';
  else if(F.data().east?.elite?.includes(id)||F.data().east?.eliteRematch?.includes(id))key='SEQ_BGM_VS_SHITENNO';
  else if([F.data().east?.iris,F.data().east?.irisRematch].includes(id))key='SEQ_BGM_VS_CHAMP';
  else if(/GHETSIS/.test(id))key='SEQ_BGM_VS_G_CIS';
  else if(/^BW_TRAINER_N(?:_|$)/.test(id))key='SEQ_BGM_VS_N_2';
  else if(F.peek(p).facilityPending?.kind==='subway'||/SUBWAY_(?:BOSS|MASTER)/.test(id))key='SEQ_BGM_VS_SUBWAY_TRAINER';
  else if(t?.className==='Leader'||/^Leader /.test(foe?.name||''))key='SEQ_BGM_VS_GYMLEADER';
  else if(/PLASMA|COLRESS/.test(id))key='SEQ_BGM_VS_PLASMA';
  else if(/RIVAL|HUGH|CHEREN|BIANCA/.test(id))key='SEQ_BGM_VS_RIVAL';
  return{vs:D.table[key],win:wild?D.aliases.mus_victory_wild:key==='SEQ_BGM_VS_GYMLEADER'?D.aliases.mus_victory_gym_leader:D.aliases.mus_victory_trainer};
 }
 window.UnovaAudio={data:()=>D,track,apply,battle};
})();
