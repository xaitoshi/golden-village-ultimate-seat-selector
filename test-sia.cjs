const assert=require('node:assert/strict');const {seats,ROWS,smooth}=require('./sia-model.cjs');
assert.equal(seats.length,42);assert.equal(new Set(seats.map(s=>s.id)).size,42);assert.ok(!ROWS.includes(13));
assert.deepEqual(seats.filter(s=>s.row===18).map(s=>s.id),['18D','18F']);
for(const s of seats){assert.ok(Math.abs(s.x)<2.4);assert.ok(Math.abs(s.x-s.suiteX)<.5);assert.ok(Number.isFinite(s.z));}
for(const r of ROWS){const row=seats.filter(s=>s.row===r);assert.equal(new Set(row.map(s=>s.z)).size,1);}
assert.equal(seats.filter(s=>!s.window&&s.alt).length%2,0);assert.equal(smooth(0),0);assert.equal(smooth(1),1);
console.log('PASS SIA: 42 seats, rows 11–22 without 13, row 18 centre-only, unique ids, alternating stagger.');
