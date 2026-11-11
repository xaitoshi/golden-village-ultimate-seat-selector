// Seatwise · Study 03 — Singapore Indoor Stadium, BABYMONSTER [CHOOM] 28–29 Nov 2026 (south-stage plan).
// Unofficial fan concept. Section polygons are derived from the public Pacifa seat-view top image (perspective aerial,
// re-projected to metres with an estimated scale); rake, heights and floor layout are approximations.
const PLAN=require('./sis-plan.json');
const CATS={
 VIPS:{name:'VIP Standing',color:'#f01fd6',price:348,standing:true},
 VIP:{name:'VIP Seated',color:'#19f0c8',price:358},
 CAT1:{name:'CAT 1 Standing',color:'#e6e23a',price:298,standing:true},
 CAT2:{name:'CAT 2',color:'#2f9fd8',price:308},
 CAT3:{name:'CAT 3',color:'#e8524f',price:298},
 CAT4:{name:'CAT 4',color:'#4cb84a',price:258},
 CAT5:{name:'CAT 5',color:'#ec8a22',price:228},
 CAT6:{name:'CAT 6',color:'#a49cf0',price:188},
 CAT7:{name:'CAT 7 (Restricted View)',color:'#ef8fd0',price:258,restricted:true},
 CAT8:{name:'CAT 8 (Restricted View)',color:'#a9b52a',price:168,restricted:true}};
const range=(a,b)=>Array.from({length:b-a+1},(_,i)=>String(a+i));
const LEVEL2=range(208,234),LEVEL3=[...range(308,314),...range(318,320),...range(322,324),...range(328,334)];
function catOf(id){const n=+id;
 if(n===208||n===234)return'CAT7';if(n===308||n===334)return'CAT8';
 if(n>=300)return'CAT6';
 if([215,218,224,227].includes(n))return'CAT4';if([216,217,225,226].includes(n))return'CAT5';return'CAT3';}
// Rows per section (official numbering is continuous: Level 2 rows 13–27, Level 3 rows 28–36).
// Seat counts per row come from the Pacifa seat-view data where it was published; other sections are fitted to the polygon.
const KNOWN={
 '208':{rows:range(13,27),seats:Array(15).fill(11)},'210':{rows:range(13,27),seats:Array(15).fill(11)},'214':{rows:range(13,27),seats:Array(15).fill(11)},
 '220':{rows:range(13,27),seats:Array(15).fill(11)},'234':{rows:range(13,27),seats:Array(15).fill(11)},
 '224':{rows:range(13,26),seats:[3,4,5,6,7,8,9,10,12,13,14,15,16,17]},'231':{rows:range(15,27),seats:Array(13).fill(18)},
 '310':{rows:range(28,36),seats:Array(9).fill(11)},'322':{rows:range(28,34),seats:Array(7).fill(11)},
 '308':{rows:range(28,33),seats:[17,14,11,7,4,1]},'314':{rows:range(28,33),seats:[17,14,11,7,4,1]},'328':{rows:range(28,33),seats:[17,14,11,7,4,1]},'334':{rows:range(28,33),seats:[17,14,11,7,4,1]}};
const SOURCED=new Set(Object.keys(KNOWN));
function rowsOf(id){if(KNOWN[id])return KNOWN[id].rows;const n=+id;
 if(n>=300){const g=sectionGeometry(id);const k=Math.max(5,Math.min(9,Math.round((g.r1-g.r0)/.92)));return range(28,27+k);}
 if([215,216,217,218,225,226,227].includes(n))return range(13,26);
 if(n===230||n===232)return range(15,27);
 if(n<300)return range(13,27);
 if((n>=318&&n<=324))return range(28,34);return range(28,36);}
// Rake (estimated from the Docomomo long/short sections and tuned against the official 220 / 322 seat views)
const RAKE={L2:{y0:4.3,rise:.40},L3:{y0:11.6,rise:.50},depth2:.9,depth3:.9,eye:1.2,standEye:1.62};
function rowY(row){row=+row;return row<28?RAKE.L2.y0+(row-13)*RAKE.L2.rise:RAKE.L3.y0+(row-28)*RAKE.L3.rise;}
const CORE=[0,-34,0,12]; // radial frame origin segment (x0,z0,x1,z1) along the arena long axis
function radialOf(cx,cz){const z=Math.max(CORE[1],Math.min(CORE[3],cz));let dx=cx,dz=cz-z;const L=Math.hypot(dx,dz)||1;return[dx/L,dz/L];}
function clipLine(poly,r,ax){ // intersect line {p·rad = r} with polygon -> [tmin,tmax] along tan
 const [rx,rz]=ax.rad,[tx,tz]=ax.tan;let lo=Infinity,hi=-Infinity;
 for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length];const ra=a[0]*rx+a[1]*rz,rb=b[0]*rx+b[1]*rz;if((ra-r)*(rb-r)>0||ra===rb)continue;const f=(r-ra)/(rb-ra);const x=a[0]+(b[0]-a[0])*f,z=a[1]+(b[1]-a[1])*f;const t=x*tx+z*tz;lo=Math.min(lo,t);hi=Math.max(hi,t);}
 return hi>lo?[lo,hi]:null;}
function sectionGeometry(id){const poly=PLAN[id];const cx=poly.reduce((s,p)=>s+p[0],0)/poly.length,cz=poly.reduce((s,p)=>s+p[1],0)/poly.length;
 const r0=radialOf(cx,cz);let rad=r0;let best=Infinity; // radial = outward normal of the front edge (edge nearest the arena axis)
 for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length];const L=Math.hypot(b[0]-a[0],b[1]-a[1]);if(L<1.2)continue;const mx=(a[0]+b[0])/2,mz=(a[1]+b[1])/2;const zc=Math.max(CORE[1],Math.min(CORE[3],mz));const d=Math.hypot(mx,mz-zc);if(d<best){best=d;let nx=(b[1]-a[1])/L,nz=-(b[0]-a[0])/L;if(nx*rad[0]+nz*rad[1]<0){nx=-nx;nz=-nz;}if(nx*r0[0]+nz*r0[1]>.8)rad=[nx,nz];else best=Infinity;}}
 if(id==='224')rad=sectionGeometry('223').ax.rad; // 224's rows run parallel to the north stand (3 seats at row 13 widening to 17)
 const tan=[-rad[1],rad[0]];const ax={rad,tan};const rs=poly.map(p=>p[0]*rad[0]+p[1]*rad[1]);
 return{poly,cx,cz,ax,r0:Math.min(...rs),r1:Math.max(...rs)};}
const SEAT_W=.5,MARGIN=.18;
const sections=[],seats=[],byId=new Map();
for(const id of [...LEVEL2,...LEVEL3]){const g=sectionGeometry(id),rows=rowsOf(id),level=+id<300?2:3,cat=catOf(id);
 const n=rows.length,depth=(g.r1-g.r0)/n;const sec={id,level,cat,rows,...g,depth,rowLines:[],sourced:SOURCED.has(id),seatCount:0};sections.push(sec);
 const uniform=KNOWN[id]&&new Set(KNOWN[id].seats).size===1;const mids=uniform?rows.map((_,k)=>clipLine(g.poly,g.r0+(k+.5)*depth,g.ax)).filter(Boolean).sort((a,b)=>(b[1]-b[0])-(a[1]-a[0])):[];const ref=mids[Math.floor(mids.length/2)];
 rows.forEach((row,k)=>{const r=g.r0+(k+.55)*depth;const segs=[.2,.5,.8].map(f=>clipLine(g.poly,g.r0+(k+f)*depth,g.ax)).filter(Boolean);if(!segs.length)return;const wide=segs.reduce((a,b)=>b[1]-b[0]>a[1]-a[0]?b:a);const seg=KNOWN[id]?wide:(segs[1]&&segs.length===3?segs[1]:wide);let [t0,t1]=(ref&&seg[1]-seg[0]<.8*(ref[1]-ref[0]))?ref:seg;t0+=MARGIN;t1-=MARGIN;const len=t1-t0;
  let count=KNOWN[id]?KNOWN[id].seats[k]:Math.floor(len/SEAT_W);if(count<1)return;const pitch=Math.min(.56,len/count);const start=(t0+t1)/2-pitch*(count-1)/2;
  const y=rowY(row);sec.rowLines.push({row,r,t0:t0-MARGIN,t1:t1+MARGIN,y,count,pitch});
  for(let i=0;i<count;i++){const t=start+i*pitch;const x=r*g.ax.rad[0]+t*g.ax.tan[0],z=r*g.ax.rad[1]+t*g.ax.tan[1];
   const s={id:`${id}-${row}-${i+1}`,sec:id,row,n:i+1,x,y,z,yaw:Math.atan2(g.ax.rad[0],g.ax.rad[1]),cat,level};seats.push(s);byId.set(s.id,s);}
  sec.seatCount+=count;});}
// ---- Floor (South Stage). Approximated from the not-to-scale official plan.
const FLOOR={x0:-18,x1:18,z0:-30.4,z1:27.6};
const STAGE={x0:-14,x1:14,z0:-30.4,z1:-20.5,h:1.8,runway:{w:3,z1:-6.5},tee:{w:10,d:3},led:{w:16,h:8.5,y:3.2,z:-29.6}};
const ZONES=[ // standing pens: VIP standing (front, magenta) and CAT 1 standing (back, yellow)
 {id:'PEN-B-VIP',pen:'B',name:'Standing Pen B',cat:'VIPS',x0:2.4,x1:15.5,z0:-19.8,z1:-12.2},
 {id:'PEN-B-CAT1',pen:'B',name:'Standing Pen B',cat:'CAT1',x0:2.4,x1:15.5,z0:-12.2,z1:-6.2},
 {id:'PEN-A-VIP',pen:'A',name:'Standing Pen A',cat:'VIPS',x0:-15.5,x1:-2.4,z0:-19.8,z1:-12.2},
 {id:'PEN-A-CAT1',pen:'A',name:'Standing Pen A',cat:'CAT1',x0:-15.5,x1:-2.4,z0:-12.2,z1:-6.2}];
const FLOOR_BLOCKS=[ // seated floor blocks: rows numbered from the stage
 {id:'PA3',cat:'VIP',x0:6,x1:15.4,z0:-1.8,z1:8.2},{id:'PA2',cat:'VIP',x0:-4.6,x1:4.6,z0:-3.4,z1:6.6},{id:'PA1',cat:'VIP',x0:-15.4,x1:-6,z0:-1.8,z1:8.2},
 {id:'C2-W',name:'CAT 2 (west)',cat:'CAT2',x0:6,x1:15.4,z0:8.8,z1:12.4},{id:'C2-C',name:'CAT 2 (centre)',cat:'CAT2',x0:-4.6,x1:4.6,z0:7.2,z1:10},{id:'C2-E',name:'CAT 2 (east)',cat:'CAT2',x0:-15.4,x1:-6,z0:8.8,z1:12.4}];
const FOH={x0:-8.5,x1:3.5,z0:15.5,z1:19};
const FLOOR_PITCH=.9;
for(const b of FLOOR_BLOCKS){const nRows=Math.floor((b.z1-b.z0)/FLOOR_PITCH),nSeats=Math.floor((b.x1-b.x0-.4)/SEAT_W);b.rows=[];b.seatCount=0;b.level=0;
 for(let r=0;r<nRows;r++){const row=String(r+1),z=b.z0+(r+.5)*FLOOR_PITCH;b.rows.push(row);for(let i=0;i<nSeats;i++){const x=b.x1-.2-SEAT_W*(i+.5); // seat 1 at the west end
  const s={id:`${b.id}-${row}-${i+1}`,sec:b.id,row,n:i+1,x,y:0,z,yaw:0,cat:b.cat,level:0,floor:true};seats.push(s);byId.set(s.id,s);b.seatCount++;}}
 sections.push({id:b.id,level:0,cat:b.cat,rows:b.rows,floor:true,block:b,seatCount:b.seatCount,cx:(b.x0+b.x1)/2,cz:(b.z0+b.z1)/2});}
const LOOK_AT=[0,6.5,-26]; // centre of the upstage LED wall
function eyeOf(s){return s.zone?[s.x,STAGE.h*0+RAKE.standEye,s.z]:[s.x,s.y+RAKE.eye,s.z];}
function stageDistance(s){const e=eyeOf(s);return Math.hypot(e[0]-0,e[2]-STAGE.z1);}
function info(s){const c=CATS[s.cat];const sec=s.zone?null:sections.find(x=>x.id===s.sec);const label=s.zone?s.name:(s.floor?(sec.block.name||s.sec):'Section '+s.sec);
 return{label,cat:c.name,price:c.price,color:c.color,restricted:!!c.restricted,standing:!!c.standing,level:s.zone||s.floor?'Floor':'Level '+s.level,distance:Math.round(stageDistance(s)),sourced:!!(sec&&sec.sourced)};}
function zoneSpot(zone,u=.5,v=.5){return{id:`${zone.id}@${u.toFixed(2)},${v.toFixed(2)}`,zone:zone.id,name:zone.name,sec:zone.id,row:null,cat:zone.cat,x:zone.x0+(zone.x1-zone.x0)*u,y:0,z:zone.z0+(zone.z1-zone.z0)*v,level:0};}
const smooth=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
module.exports={PLAN,CATS,LEVEL2,LEVEL3,KNOWN,catOf,rowsOf,rowY,RAKE,sections,seats,byId,FLOOR,STAGE,ZONES,FLOOR_BLOCKS,FOH,LOOK_AT,eyeOf,info,zoneSpot,stageDistance,smooth,clipLine,radialOf};
