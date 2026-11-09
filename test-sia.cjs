const assert=require('node:assert/strict');const {seats,ROWS,COMPANION,SUITE_X,AISLE,smooth}=require('./sia-model.cjs');
assert.equal(seats.length,40);assert.equal(new Set(seats.map(s=>s.id)).size,40);assert.ok(!ROWS.includes(13));
for(const r of ROWS){const row=seats.filter(s=>s.row===r);assert.equal(row.length,4);assert.equal(new Set(row.map(s=>s.z)).size,1);}
assert.deepEqual([...COMPANION],[11,14,16,18,19,21]);
for(const s of seats){assert.ok(Math.abs(s.x-s.suiteX)<s.suiteW/2);
 if(s.window)assert.equal(Math.abs(s.x)<Math.abs(s.suiteX),s.comp,'A/K aisle-side in companion rows, window-side otherwise '+s.id);
 else assert.equal(Math.abs(s.x)<CEN(),s.comp,'D/F together in companion rows '+s.id);}
function CEN(){return .46}
assert.ok(AISLE>=.9);assert.ok(SUITE_X.D-(-SUITE_X.D)<1);
assert.deepEqual(seats.filter(s=>s.bassinet).map(s=>s.id),['19A','19K']);
for(let i=1;i<ROWS.length;i++){const a=seats.find(s=>s.row===ROWS[i-1]).z,b=seats.find(s=>s.row===ROWS[i]).z;assert.ok(b-a>=1.5);}
const {bedPose,dividerOffset,partner}=require('./sia-model.cjs');
const up=bedPose(0),flat=bedPose(1);assert.ok(Math.abs(flat.backAngle-Math.PI/2)<1e-9);assert.equal(up.bedding,0);assert.ok(Math.abs(flat.bedding-1)<1e-9);assert.ok(Math.abs(flat.legAngle)<1e-9);assert.ok(up.legAngle<-1);assert.ok(flat.slide<0&&up.slide===0);
for(let b=0;b<1;b+=.05){assert.ok(bedPose(b+.05).backAngle>=bedPose(b).backAngle);assert.ok(bedPose(b+.05).bedding>=bedPose(b).bedding);}
assert.ok(dividerOffset(1,true)===0);assert.ok(dividerOffset(0,true)<-.5);assert.ok(dividerOffset(0,false)<-.5);assert.ok(dividerOffset(.5,true)>dividerOffset(0,true));
assert.equal(partner(seats.find(s=>s.id==='11D')).id,'11F');assert.equal(partner(seats.find(s=>s.id==='12F')).id,'12D');assert.equal(partner(seats.find(s=>s.id==='11A')),null);
assert.equal(smooth(0),0);assert.equal(smooth(1),1);
console.log('PASS SIA: 40 suites (rows 11–21, no 13, row 18 full), map alternation, companion rows 11/14/16/18/19/21, ≥0.9 m aisles, bassinets 19A/19K; bed pose + divider + partner helpers.');
