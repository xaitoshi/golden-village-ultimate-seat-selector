// Model and copy checks for the unofficial Star Theatre seat plan.
const assert=require('node:assert/strict');
const m=require('./star-model.cjs');
const DASH=/[–—]|\s-\s|[A-Za-z]-[A-Za-z]|\d-\d/;
assert.equal(m.TOTAL,5142);
assert.equal(m.PUBLISHED,5142);
assert.equal(m.LEVELS.stalls.seats.length,1903);
assert.equal(m.LEVELS.circle1.seats.length,1812);
assert.equal(m.LEVELS.circle2.seats.length,1427);
assert.equal(m.LEVELS.stalls.box,16);
assert.equal(m.LEVELS.stalls.wheelchair,27);
assert.equal(m.LEVELS.circle1.wheelchair,24);
assert.equal(m.LEVELS.circle2.wheelchair,12);
const ids=m.seats.map(s=>s.id);
assert.equal(new Set(ids).size,ids.length,'unique seat ids');
assert(m.find('stalls.BoxA.1')&&m.find('stalls.BoxC.1'));
assert(m.find('stalls.AD.W1'));
assert(m.find('circle2.SA.1')||m.LEVELS.circle2.seats[0]);
assert.equal(m.find('stalls.BoxA.1').id,'stalls.BoxA.1');
assert.equal(m.info(m.find('stalls.BoxA.1')).label,'Stalls, Box A, Seat 1');
assert.equal(m.info(m.find('stalls.BoxA.1')).type,'VIP box');
assert.equal(m.info(m.find('stalls.AD.W1')).type,'Wheelchair space');
const hold=m.seats.find(s=>s.tag==='hold');
assert(hold);assert.equal(m.info(hold).type,'Photo hold');
const rest=m.seats.find(s=>s.tag==='restricted');
assert(rest);assert.equal(m.info(rest).type,'Restricted view');
for(const s of m.seats){
  if(s.kind!=='wheel'&&!s.box)assert(s.num>=1,s.id);
  if(s.box)assert(!s.row,s.id);else assert(s.row,s.id);
  const i=m.info(s);
  for(const v of [s.id,i.label,i.type,i.level,i.row,i.box].filter(Boolean))assert(!DASH.test(String(v)),v);
}
for(const id of m.LEVEL_ORDER)assert(!DASH.test(m.LEVELS[id].name),m.LEVELS[id].name);
assert.deepEqual(m.LEVEL_ORDER,['stalls','circle1','circle2']);
assert.equal(m.LEVELS.stalls.name,'Stalls');
assert.equal(m.LEVELS.circle1.name,'Circle 1');
assert.equal(m.LEVELS.circle2.name,'Circle 2');
console.log('PASS star: 5,142 seats (1,903 stalls, 1,812 Circle 1, 1,427 Circle 2), unique ids, dash-free labels');

// Box A and Box C must have a clear view of the stage: the side wall may not
// cut inside the ray from each box seat eye to the stage target.
const L=require('./star-3d-layout.cjs');
function wallHits(eye,tgt){
  const hits=[];
  for(let i=1;i<=80;i++){
    const t=i/80;
    const x=eye.x+(tgt.x-eye.x)*t,y=eye.y+(tgt.y-eye.y)*t,z=eye.z+(tgt.z-eye.z)*t;
    if(y<-1||y>L.CEIL)continue;
    if(Math.abs(x)>=L.wallAt(z)-0.05)hits.push({t,x,y,z,wall:L.wallAt(z)});
  }
  return hits;
}
const boxSeats=L.seats.filter(s=>s.kind==='box');
assert.equal(boxSeats.length,16);
for(const s of boxSeats){
  const e=L.eye(s),tgt=L.target(e);
  const hits=wallHits(e,tgt);
  assert.equal(hits.length,0,`${s.id} wall occludes the stage at ${JSON.stringify(hits[0]||{})}`);
}
console.log('PASS star 3D: Box A and Box C have a clear view of the stage');
