// Unified Paldea NPC portraits: original pixel sheets. All variants are
// 9-frame, 32x32 SVG sheets; no external asset host is required.
(function(){
'use strict';
const D=window.PALDEA_DATA;if(!D)return;
const LOOKS={
 'clavell':'paldea/clavell',
 'director':'paldea/clavell',
 'iono-gym':'paldea/iono',
 'larry-gym':'paldea/larry',
 'ryme-gym':'paldea/ryme',
 'tulip-gym':'paldea/tulip',
 'grusha-gym':'paldea/grusha',
 'giacomo-boss':'paldea/giacomo',
 'mela-boss':'paldea/mela',
 'atticus-boss':'paldea/atticus',
 'ortega-boss':'paldea/ortega',
 'eri-boss':'paldea/eri',
 'teal-carmine':'paldea/carmine',
 'teal-kieran':'paldea/kieran',
 'teal-kieran-final':'paldea/kieran',
 'teal-briar':'paldea/briar',
 'indigo-briar':'paldea/briar',
 'indigo-kieran':'paldea/kieran',
 'indigo-crispin':'paldea/crispin',
 'indigo-lacey':'paldea/lacey',
 'indigo-amarys':'paldea/amarys',
 'indigo-drayton':'paldea/drayton',
 'indigo-club':'paldea/drayton',
 'indigo-guide':'paldea/briar',
 'clive-finale':'paldea/clavell',
 'cassiopeia-finale':'paldea/penny',
 'arven-finale':'paldea/arven',
 'zero-gateway':'paldea/arven',
 'zero-station-1':'paldea/arven',
 'zero-station-2':'paldea/penny',
 'indigo-depths':'paldea/briar',
 'teal-festival':'paldea/carmine',
 'teal-epilogue':'paldea/penny'
};
function forScript(script){
 if(!script?.startsWith('sv:'))return null;
 const key=script.slice(3);
 if(LOOKS[key])return LOOKS[key];
 if(/^nemona[-]/.test(key))return 'paldea/nemona';
 if(/^arven[-]/.test(key))return 'paldea/arven';
 if(key==='arven')return 'paldea/arven';
 if(key==='penny')return 'paldea/penny';
 return null;
}
let count=0;
for(const map of Object.values(D.maps)){
 for(const person of map.people||[]){
  const name=forScript(person.script);
  if(!name)continue;
  person.sprite=name;person.width=32;person.height=32;person.frames=9;
  count++;
 }
}
window.PaldeaCharacters={forScript,looks:LOOKS,count};
})();
