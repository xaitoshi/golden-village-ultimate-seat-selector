const fs=require('node:fs'),assert=require('node:assert/strict');
const m=require('./sis-model.cjs');
// Section list per the official BABYMONSTER [CHOOM] seat plan: L2 208–234, L3 308–314, 318–320, 322–324, 328–334; no 321, no 100s
const stands=m.sections.filter(s=>!s.floor).map(s=>s.id);
const expect=[...Array.from({length:27},(_,i)=>String(208+i)),...[308,309,310,311,312,313,314,318,319,320,322,323,324,328,329,330,331,332,333,334].map(String)];
assert.deepEqual(stands,expect);assert(!stands.includes('321'));assert(!stands.some(id=>id<'200'));
// Categories & prices
const cat=id=>m.catOf(id);
for(const id of ['209','214','219','223','228','233'])assert.equal(cat(id),'CAT3');
for(const id of ['215','218','224','227'])assert.equal(cat(id),'CAT4');
for(const id of ['216','217','225','226'])assert.equal(cat(id),'CAT5');
for(const id of ['309','314','318','320','322','324','328','333'])assert.equal(cat(id),'CAT6');
assert.equal(cat('208'),'CAT7');assert.equal(cat('234'),'CAT7');assert.equal(cat('308'),'CAT8');assert.equal(cat('334'),'CAT8');
const P=Object.fromEntries(Object.entries(m.CATS).map(([k,c])=>[k,c.price]));
assert.deepEqual(P,{VIPS:348,VIP:358,CAT1:298,CAT2:308,CAT3:298,CAT4:258,CAT5:228,CAT6:188,CAT7:258,CAT8:168});
assert(m.CATS.CAT7.restricted&&m.CATS.CAT8.restricted&&!m.CATS.CAT3.restricted);
// Floor: VIP seated PA1–PA3, CAT 2 blocks, pens A/B each VIP Standing + CAT 1 Standing; FOH north of the PA blocks; stage at the south
assert.deepEqual(m.FLOOR_BLOCKS.filter(b=>b.cat==='VIP').map(b=>b.id).sort(),['PA1','PA2','PA3']);
assert(m.FLOOR_BLOCKS.some(b=>b.cat==='CAT2'));
for(const pen of ['A','B'])assert.deepEqual(m.ZONES.filter(z=>z.pen===pen).map(z=>z.cat).sort(),['CAT1','VIPS']);
assert(m.ZONES.filter(z=>z.pen==='B').every(z=>z.x0>0)&&m.ZONES.filter(z=>z.pen==='A').every(z=>z.x1<0),'Pen B west (+x), Pen A east (−x)');
assert(m.FOH.z0>Math.max(...m.FLOOR_BLOCKS.filter(b=>b.cat==='VIP').map(b=>b.z1)),'FOH north of PA');
assert(m.STAGE.z1<Math.min(...m.ZONES.map(z=>z.z0)),'stage south of pens');
// Row numbering is continuous: L2 13–27, L3 28–36
for(const s of m.sections.filter(s=>!s.floor)){const r=s.rows.map(Number);assert(s.level===2?r[0]>=13&&r.at(-1)<=27:r[0]>=28&&r.at(-1)<=36,s.id);}
// Published seat counts reproduced exactly
const count=id=>m.seats.filter(x=>x.sec===id).length;
for(const [id,n] of Object.entries({208:165,210:165,214:165,220:165,234:165,231:234,224:139,310:99,322:77,308:54,314:54,328:54,334:54}))assert.equal(count(id),n,id);
assert.deepEqual(m.seats.filter(x=>x.sec==='231').map(x=>x.row).filter((v,i,a)=>a.indexOf(v)===i),Array.from({length:13},(_,i)=>String(15+i)));
// Geometry sanity: rake rises with row, L3 above L2, every seat inside the hall, seats face the floor
assert(m.rowY(27)<m.rowY(28));for(let r=13;r<36;r++)assert(m.rowY(r+1)>m.rowY(r));
const ids=new Set();for(const s of m.seats){assert(!ids.has(s.id),'dup '+s.id);ids.add(s.id);assert(Math.abs(s.x)<46&&s.z>-36&&s.z<54);
 if(!s.floor){const fx=-Math.sin(s.yaw),fz=-Math.cos(s.yaw);/* local −z is the seat front */const ax=-s.x,az=Math.max(-34,Math.min(12,s.z))-s.z;assert(fx*ax+fz*az>0,'faces arena '+s.id);}}
assert(m.seats.length>5500&&m.seats.length<8000,'seat total '+m.seats.length);
// Seat-centre spacing within a row stays above 0.4 m except published wedge rows
for(const sec of m.sections.filter(s=>!s.floor))for(const l of sec.rowLines)if(l.count>1&&sec.id!=='224')assert(l.pitch>.38,sec.id+' row '+l.row+' pitch '+l.pitch);
// POV: eye above the tread; restricted sections flagged; distances sensible
const s220=m.byId.get('220-17-6'),s322=m.byId.get('322-30-6');assert(m.eyeOf(s322)[1]>m.eyeOf(s220)[1]);assert(m.info(m.byId.get('208-20-6')).restricted);assert(!m.info(s220).restricted);
const d=m.stageDistance(s220);assert(d>40&&d<70,'220 distance '+d);
const pen=m.zoneSpot(m.ZONES[0]);assert.equal(m.eyeOf(pen)[1],m.RAKE.standEye);assert(m.info(pen).standing);
assert.equal(m.smooth(0),0);assert.equal(m.smooth(1),1);
// Built page: nav on every page, no embedded raster images on the SIS page, disclaimer present
const sis=fs.readFileSync('sis/index.html','utf8');
assert.match(sis,/<a href="\/sis\/" aria-current="page">Singapore Indoor Stadium<\/a>/);assert.match(sis,/<button[^>]*aria-current="page"[^>]*>Theatres</);assert.match(sis,/<title>Seatwise \| /);
assert(!/data:image\/(png|jpe?g|webp)/.test(sis),'no embedded photos/plan on SIS page');assert(!/<img/i.test(sis));
assert.match(sis,/not affiliated with BABYMONSTER, YG Entertainment, Live Nation, Ticketmaster or The Kallang/);assert.match(sis,/plan not drawn to scale/);assert.match(sis,/excl\. booking fees/);
assert(!fs.readdirSync('.').some(f=>/babymonster|official-seat-plan/i.test(f)),'reference images not in repo');
console.log(`PASS: SIS section list (${stands.length}, no 321/100s), categories & prices, pens/PA/FOH/stage layout, continuous rows, published seat counts, rake, ${m.seats.length} unique seats, POV eye heights, restricted flags, nav, no embedded images.`);
