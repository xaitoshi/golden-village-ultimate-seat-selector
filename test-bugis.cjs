// Model and copy checks for the unofficial Starbucks Bugis Junction cafe viewer.
const assert=require('node:assert/strict');
const m=require('./bugis-model.cjs');
const DASH=/[–—]|\s-\s|[A-Za-z]-[A-Za-z]|\d-\d/;
const ids=m.seats.map(s=>s.id);
assert.equal(new Set(ids).size,ids.length,'unique seat ids');
assert.equal(ids.length,46,'46 seats');
const kinds={};m.seats.forEach(s=>kinds[s.kind]=(kinds[s.kind]||0)+1);
assert.equal(kinds.armchair,18);assert.equal(kinds.communal,6);assert.equal(kinds.terrace,22);
for(const s of m.seats){
  const i=m.info(s);
  for(const v of [s.id,i.type,i.zone,i.feature,i.kind])assert(!DASH.test(v),v);
}
for(const h of [7.5,9,12.5,17,22,23.5])assert(!DASH.test(m.formatHour(h)),m.formatHour(h));
assert.equal(m.formatHour(7.5),'7:30 am');
assert.equal(m.formatHour(12),'12:00 pm');
assert.equal(m.formatHour(22),'10:00 pm');
assert.equal(m.formatHour(24),'12:00 am');
assert.equal(m.closeHour(false),22);
assert.equal(m.closeHour(true),24);
assert.equal(m.steps(false),58);
assert.equal(m.steps(true),66);
// Daily curve shape
assert(m.occupancy(9,false)>m.occupancy(10.5,false),'weekday morning commute bump');
assert(m.occupancy(12.5,false)>m.occupancy(15,false),'weekday lunch peak above mid afternoon dip');
assert(m.occupancy(16.5,false)>m.occupancy(15,false),'weekday afternoon study crowd');
assert(m.occupancy(19.5,false)<m.occupancy(12.5,false),'weekday evening dip vs lunch');
assert(m.occupancy(9,true)<m.occupancy(9,false),'weekend morning quieter than weekday commute');
assert(m.occupancy(23,true)>0,'weekend late evening still open');
assert.equal(m.occupancy(23,false),0,'weekday closed after 10 pm');
// Deterministic occupancy
assert.deepEqual(m.takenIds(12.5,false),m.takenIds(12.5,false));
assert.deepEqual(m.takenIds(18,true),m.takenIds(18,true));
// Indoor armchairs and window seats fill before terrace in the morning
{const taken=new Set(m.takenIds(9,false));
 const terr=m.seats.filter(s=>s.kind==='terrace'&&taken.has(s.id));
 const arms=m.seats.filter(s=>s.kind==='armchair'&&taken.has(s.id));
 assert.equal(terr.length,0,'morning terrace still open');
 assert.equal(arms.length,18,'morning armchairs fill first');}
// Lunch and evening use the terrace
{const lunch=new Set(m.takenIds(12.5,false));
 assert(m.seats.filter(s=>s.kind==='terrace'&&lunch.has(s.id)).length>0,'lunch uses terrace');
 const eve=new Set(m.takenIds(19,false));
 assert(m.seats.filter(s=>s.kind==='terrace'&&eve.has(s.id)).length>0,'evening uses terrace');}

const fs=require('node:fs');
const html=fs.readFileSync('starbucks-bugis/index.html','utf8');
assert.match(html,/Seat map/);
assert.match(html,/id="plan-canvas"/);
for(const z of ['Inside','Window','Communal table','Terrace','Counter']){
  // zone words appear in JS drawPlan, which is inlined into the page
  assert.match(html,new RegExp(z));
}
assert.match(html,/Taken at this hour/);
console.log('PASS bugis: 46 unique seats, dash-free labels, weekday/weekend hours, commute/lunch/study/evening curve, deterministic taken ids, armchairs fill before terrace in the morning.');
