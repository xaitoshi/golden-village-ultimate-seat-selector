// Official plan counts for the unofficial Sands Theatre seat plan (no 3D yet).
const plan=require('./mbs-plan.json');
const LEVELS=plan.levels;
const LEVEL_ORDER=['stalls','dress','grand'];
const seats=LEVEL_ORDER.flatMap(id=>LEVELS[id].seats);
const byId=new Map(seats.map(s=>[s.id,s]));

function levelName(id){return (LEVELS[id]&&LEVELS[id].name)||id;}

function info(s){
  const level=levelName(s.level);
  if(s.kind==='wheel'){
    return {label:`${level}, Row ${s.row}, wheelchair space ${s.space}`,type:'Wheelchair space',level,row:s.row,box:null,num:null};
  }
  if(s.box){
    return {label:`${level}, Box ${s.box}, Seat ${s.num}`,type:'VIP box',level,row:null,box:s.box,num:s.num};
  }
  return {label:`${level}, Row ${s.row}, Seat ${s.num}`,type:s.kind==='pit'?'Orchestra pit':'Seat',level,row:s.row,box:null,num:s.num};
}

function find(id){
  if(!id)return null;
  if(byId.has(id))return byId.get(id);
  const key=String(id).trim();
  if(byId.has(key))return byId.get(key);
  // Tolerate older punctuation in deep links without advertising it
  const norm=key.replace(/[-_/]/g,'.').replace(/box/i,'Box');
  if(byId.has(norm))return byId.get(norm);
  const lower=norm.toLowerCase();
  return seats.find(s=>s.id.toLowerCase()===lower)||null;
}

module.exports={plan,LEVELS,LEVEL_ORDER,seats,info,find,levelName,TOTAL:plan.total,PUBLISHED:plan.published};
