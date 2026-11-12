// Unofficial approximate seating plan for Starbucks at Bugis Junction, Level 1, unit 01 106.
// Layout follows owner supplied photos of the corner shopfront, arcade terrace, armchair pairs,
// communal table, merch / fridge and the rear counter. Geometry is estimated, not surveyed.
function smooth(t){return t*t*t*(t*(t*6-15)+10)}
function hash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return (h>>>0)/4294967296;}
function lerpKeys(hour,keys){if(hour<=keys[0][0])return keys[0][1];for(let i=1;i<keys.length;i++)if(hour<=keys[i][0]){const t=(hour-keys[i-1][0])/(keys[i][0]-keys[i-1][0]);return keys[i-1][1]+t*(keys[i][1]-keys[i-1][1]);}return keys[keys.length-1][1];}

// Hours from the Bugis Junction mall listing: 7:30 am to 10 pm weekdays, 7:30 am to midnight Fri/Sat.
const OPEN=7.5, CLOSE_WD=22, CLOSE_WE=24, STEP=0.25;
const WD_CURVE=[[7.5,.06],[8.25,.22],[9.0,.48],[9.75,.42],[10.5,.28],[11.5,.40],[12.25,.82],[13.25,.86],[14.0,.50],[15.0,.38],[16.0,.62],[17.25,.68],[18.5,.52],[19.5,.48],[21.0,.28],[22.0,.08]];
const WE_CURVE=[[7.5,.04],[9.0,.18],[10.5,.40],[11.5,.58],[12.5,.74],[14.0,.66],[15.5,.72],[17.0,.60],[18.5,.64],[20.0,.55],[21.5,.42],[22.5,.28],[24.0,.08]];

const seats=[];
function add(o){seats.push(Object.assign({taken:false},o));}

// Side window armchairs (along the glass toward the side arcade). Fill first.
[[1.8,'SW1'],[3.9,'SW2'],[6.0,'SW3']].forEach(([z,id])=>{
  [-1,1].forEach((s,k)=>add({id:id+(k?'B':'A'),kind:'armchair',type:'Window armchair',zone:'Window',feature:'Looks through the glass shopfront',x:1.15,z:z+s*.42,y:1.16,yaw:s>0?0:Math.PI,seatY:.42,pri:1,table:id,pair:s}));
});
// Front window armchairs (along the glass toward the front arcade).
[[3.15,'FW1'],[5.25,'FW2']].forEach(([x,id])=>{
  [-1,1].forEach((s,k)=>add({id:id+(k?'B':'A'),kind:'armchair',type:'Window armchair',zone:'Window',feature:'Looks through the glass shopfront',x:x+s*.42,z:1.15,y:1.16,yaw:s>0?Math.PI/2:-Math.PI/2,seatY:.42,pri:1,table:id,pair:s}));
});
// Olive armchairs along the wood feature wall on the right.
[[1.9,'WA1'],[3.7,'WA2'],[5.5,'WA3'],[7.3,'WA4']].forEach(([z,id])=>{
  [-1,1].forEach((s,k)=>add({id:id+(k?'B':'A'),kind:'armchair',type:'Wall armchair',zone:'Wood wall',feature:'Along the wood wall',x:7.15,z:z+s*.42,y:1.16,yaw:s>0?0:Math.PI,seatY:.42,pri:2,table:id,pair:s}));
});
// Long communal wood table near the side window, black chairs. Window side fills sooner.
const CZ=[4.15,5.15,6.15];
CZ.forEach((z,i)=>{
  add({id:'C'+(i+1)+'A',kind:'communal',type:'Communal chair',zone:'Communal table',feature:'Shared wood table by the window',x:2.35,z,y:1.22,yaw:Math.PI/2,seatY:.48,pri:3,table:'communal'});
  add({id:'C'+(i+1)+'B',kind:'communal',type:'Communal chair',zone:'Communal table',feature:'Shared wood table by the window',x:3.45,z,y:1.22,yaw:-Math.PI/2,seatY:.48,pri:4,table:'communal'});
});

// Covered arcade terrace: black bistro chairs around small round dark tables (2 or 4 seats).
function terrace(id,x,z,n,facing){
  const ang0=facing||0;
  for(let i=0;i<n;i++){
    const a=ang0+i*(Math.PI*2/n)+ (n===2?0:Math.PI/n);
    const r=n===2?.42:.55;
    add({id:id+String.fromCharCode(65+i),kind:'terrace',type:'Terrace seat',zone:'Arcade terrace',feature:'Covered arcade terrace',x:x+Math.cos(a)*r,z:z+Math.sin(a)*r,y:1.16,yaw:a+Math.PI,seatY:.45,pri:8,table:id,tx:x,tz:z,tn:n});
  }
}
terrace('O1',1.7,-2.0,2,0);
terrace('O2',3.8,-2.15,4,0.2);
terrace('O3',5.9,-2.0,2,Math.PI/2);
terrace('O4',7.5,-2.2,4,-0.2);
terrace('O5',-2.0,1.7,2,Math.PI);
terrace('O6',-2.15,3.9,4,0.4);
terrace('O7',-2.0,6.1,2,-Math.PI/2);
terrace('O8',-2.0,8.4,2,Math.PI/3);

function info(s){return {type:s.type,zone:s.zone,feature:s.feature,kind:s.kind};}
function closeHour(weekend){return weekend?CLOSE_WE:CLOSE_WD;}
function occupancy(hour,weekend){const close=closeHour(weekend);if(hour<OPEN||hour>close)return 0;return Math.max(0,Math.min(1,lerpKeys(hour,weekend?WE_CURVE:WD_CURVE)));}
function fillScore(s,hour,weekend){
  let p=s.pri;
  if(s.kind==='terrace'&&(hour>=17||(weekend&&hour>=15)))p=3;
  const q=Math.round(hour/STEP);
  return p*1000+hash(s.id+'|'+(weekend?'WE':'WD')+'|'+q)*100;
}
function takenIds(hour,weekend){
  const n=Math.round(occupancy(hour,weekend)*seats.length);
  return seats.map(s=>({id:s.id,sc:fillScore(s,hour,weekend)})).sort((a,b)=>a.sc-b.sc||a.id.localeCompare(b.id)).slice(0,n).map(x=>x.id);
}
function steps(weekend){return Math.round((closeHour(weekend)-OPEN)/STEP);}
function hourFromStep(i){return OPEN+i*STEP;}
function formatHour(h){const closed=h>=24?0:h;const hr=Math.floor(closed)%24,m=Math.round((closed-Math.floor(closed))*60)%60,ampm=hr>=12?'pm':'am',h12=hr%12||12;return h12+':'+(m<10?'0':'')+m+' '+ampm;}
module.exports={seats,info,smooth,hash,occupancy,takenIds,fillScore,closeHour,OPEN,CLOSE_WD,CLOSE_WE,STEP,steps,hourFromStep,formatHour};
