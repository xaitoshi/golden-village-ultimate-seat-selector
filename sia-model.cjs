// Unofficial fan concept. Layout follows the owner-supplied seat map (1-2-1, columns A | D F | K):
// forward cabin rows 11,12,14,15,16,17,18 (no 13), rear cabin rows 19,20,21 — 40 suites.
// Companion rows (11,14,16,18,19,21): A/K cushions on the aisle side, D+F together in the middle.
// Window rows (12,15,17,20): A/K cushions by the window, D/F split toward their aisles, consoles between.
// Spacing (aisles, row gaps) is deliberately generous to read as roomy walkways; not surveyed geometry.
const PITCH=1.55;                       // visual row spacing (published seat pitch is 50 in / 1.27 m)
const SUITE_LEN=1.27;                   // suite shell length
const AISLE=.95,WIN_W=.98,CEN_W=.92;
const ROWS=[11,12,14,15,16,17,18,19,20,21];
const COMPANION=new Set([11,14,16,18,19,21]);
const SUITE_X={A:-(CEN_W+AISLE+WIN_W/2),D:-CEN_W/2,F:CEN_W/2,K:CEN_W+AISLE+WIN_W/2};
const FWD_Z0=2.45,REAR_Z0=16.2;
function rowZ(row){const i=ROWS.indexOf(row);return i<7?FWD_Z0+i*PITCH:REAR_Z0+(i-7)*PITCH;}
const seats=[];
for(const row of ROWS){const comp=COMPANION.has(row);
  for(const L of ['A','D','F','K']){
    const win=L==='A'||L==='K',side=(L==='A'||L==='D')?-1:1;let x,type,consoleSide;
    if(win){x=SUITE_X[L]+(comp?-side*.19:side*.19);type=comp?'Window · aisle side':'Window · true window';consoleSide=comp?side:-side;} // consoleSide: x-direction from seat to console
    else{x=comp?side*.33:side*.62;type=comp?'Centre · companion pair':'Centre · aisle side';consoleSide=comp?side:-side;}
    seats.push({id:row+L,row,letter:L,x,suiteX:SUITE_X[L],suiteW:win?WIN_W:CEN_W,z:rowZ(row),window:win,side,comp,type,consoleSide,bassinet:row===19&&win,cabin:row<=18?'Forward · rows 11 to 18':'Rear · rows 19 to 21',taken:false});}}
function info(s){return {type:s.type,cabin:s.cabin,companion:!s.window&&s.comp};}
// Bed mode pose for b in [0,1]: backrest reclines flat, seat slides forward, legrest rises, bedding fades in late.
function bedPose(b){b=Math.max(0,Math.min(1,b));return {backAngle:.16+(Math.PI/2-.16)*b,slide:-.48*b,legAngle:-1.35*(1-b),ottomanY:.3+.17*b,bedding:Math.max(0,Math.min(1,(b-.55)/.45)),headScale:1-.7*b,cushionScale:1-b};}
// Centre privacy divider: p=1 fully up, p=0 retracted to the console line. Companion pairs drop further (no console between).
function dividerOffset(p,comp){p=Math.max(0,Math.min(1,p));return -(1-p)*(comp?.56:.6);}
function partner(s){if(s.window)return null;return seats.find(o=>o.row===s.row&&o.letter===(s.letter==='D'?'F':'D'))||null;}
function smooth(t){return t*t*t*(t*(t*6-15)+10)}
module.exports={bedPose,dividerOffset,partner,seats,ROWS,PITCH,SUITE_LEN,AISLE,WIN_W,CEN_W,SUITE_X,COMPANION,rowZ,info,smooth};
