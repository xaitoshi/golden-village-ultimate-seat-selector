// Model and copy checks for the unofficial Sands Theatre seat plan.
const assert=require('node:assert/strict');
const m=require('./mbs-model.cjs');
const DASH=/[–—]|\s-\s|[A-Za-z]-[A-Za-z]|\d-\d/;
assert.equal(m.TOTAL,2155);
assert.equal(m.PUBLISHED,2173);
assert.equal(m.LEVELS.stalls.sold,1238);
assert.equal(m.LEVELS.dress.sold,177);
assert.equal(m.LEVELS.grand.sold,740);
assert.equal(m.LEVELS.stalls.pit,71);
assert.equal(m.LEVELS.dress.box,24);
assert.equal(m.LEVELS.grand.box,8);
assert.equal(m.LEVELS.dress.wheelchair,15);
const sold=m.seats.filter(s=>s.kind!=='wheel');
const wheels=m.seats.filter(s=>s.kind==='wheel');
assert.equal(sold.length,2155);
assert.equal(wheels.length,15);
const ids=m.seats.map(s=>s.id);
assert.equal(new Set(ids).size,ids.length,'unique seat ids');
assert(m.find('stalls.A.1'));
assert(m.find('stalls.C.19'));
assert(m.find('dress.Box1.1')&&m.find('dress.Box6.4'));
assert(m.find('grand.Box7.1')&&m.find('grand.Box8.4'));
assert(m.find('grand.S.13'));
assert(m.find('dress.D.W1'));
assert.equal(m.find('stalls-A-1').id,'stalls.A.1');
for(const s of sold){
  assert(s.num>=1,s.id);
  if(s.box)assert(!s.row,s.id);else assert(s.row,s.id);
}
for(const s of m.seats){
  const i=m.info(s);
  for(const v of [s.id,i.label,i.type,i.level,i.row,i.box].filter(Boolean))assert(!DASH.test(String(v)),v);
}
assert.equal(m.info(m.find('stalls.A.1')).label,'Stalls, Row A, Seat 1');
assert.equal(m.info(m.find('stalls.A.1')).type,'Orchestra pit');
assert.equal(m.info(m.find('stalls.J.1')).label,'Stalls, Row J, Seat 1');
assert.equal(m.info(m.find('stalls.J.1')).type,'Seat');
assert.equal(m.info(m.find('dress.Box3.2')).label,'Dress Circle, Box 3, Seat 2');
assert.equal(m.info(m.find('dress.Box3.2')).type,'VIP box');
const pit=m.seats.find(s=>s.kind==='pit');
assert.equal(m.info(pit).type,'Orchestra pit');
assert.equal(m.info(m.find('dress.D.W1')).type,'Wheelchair space');
assert.equal(m.info(m.find('dress.D.W1')).label,'Dress Circle, Row D, wheelchair space 1');
for(const id of m.LEVEL_ORDER)assert(!DASH.test(m.LEVELS[id].name),m.LEVELS[id].name);
console.log('PASS mbs: 2155 seats (1238 stalls with 71 pit, 177 dress with boxes 1 to 6, 740 grand with boxes 7 and 8), 15 wheelchair spaces, unique ids, dash-free labels');
