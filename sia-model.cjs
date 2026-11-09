// Unofficial fan concept. Row numbering follows SIA's current A350-900 long-haul business map
// (rows 11-22, no row 13, row 18 centre pair only = 42 seats), which SIA says keeps 42 seats in the 2027 retrofit.
// Exact 2027 J row numbers / stagger pattern are NOT published; geometry below is an estimate.
const PITCH=1.27; // 50 in published seat pitch
const ROWS=[11,12,14,15,16,17,18,19,20,21,22];
const SUITE_X={A:-2.02,D:-.5,F:.5,K:2.02};
function rowZ(row){const i=ROWS.indexOf(row);return i<6?1.5+i*PITCH:1.5+5*PITCH+2.75+(i-6)*PITCH;}
const seats=[];
ROWS.forEach((row,i)=>{const alt=i%2===0; // alternate rows: window-aligned/companion vs aisle-aligned/apart
  for(const L of ['A','D','F','K']){if(row===18&&(L==='A'||L==='K'))continue;
    const win=L==='A'||L==='K',side=(L==='A'||L==='D')?-1:1;let seatX,type,consoleSide;
    if(win){seatX=SUITE_X[L]+(alt?side*.2:-side*.2);type=alt?'Window · true window':'Window · aisle-side';consoleSide=alt?-side:side;} // consoleSide: x-direction from seat to console
    else{seatX=alt?side*.33:side*.68;type=alt?'Centre · companion pair':'Centre · aisle-side';consoleSide=alt?side:-side;}
    seats.push({id:row+L,row,letter:L,x:seatX,suiteX:SUITE_X[L],z:rowZ(row),window:win,side,alt,type,consoleSide,cabin:i<6?'Forward · rows 11–17':'Rear · rows 18–22',taken:false});}});
function info(s){return {type:s.type,cabin:s.cabin,companion:!s.window&&s.alt};}
function smooth(t){return t*t*t*(t*(t*6-15)+10)}
module.exports={seats,ROWS,PITCH,SUITE_X,rowZ,info,smooth};
