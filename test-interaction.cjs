const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('app.js','utf8');
const choose=source.match(/function choose\(s\)\{[^\n]+/)[0];
const enter=source.match(/function enterSeat\(s\)\{[^\n]+/)[0];
const toggle=source.match(/\$\('continue'\)\.onclick=\(\)=>\{[^\n]+/)[0];
const state={selected:null,pov:false,transition:null,progress:0,renderer:{},lookX:2,lookY:3,reduced:{matches:false},performance:{now:()=>100},updates:0,seats:[{button:{style:{}}}],document:{body:{classList:{toggle(){}}}}};
const elements={};state.$=id=>elements[id]??=(id==='seats'?{style:{}}:{});state.update=()=>state.updates++;
vm.createContext(state);vm.runInContext(choose+'\n'+enter+'\n'+toggle,state);
const available={id:'A1',taken:false},other={id:'F8',taken:false},taken={id:'A2',taken:true};
state.choose(available);assert.equal(state.selected,available);assert.equal(state.pov,false);assert.equal(state.transition,null);
state.enterSeat(other);assert.equal(state.selected,other);assert.equal(state.pov,true);assert.equal(state.transition.to,1);assert.equal(state.lookX,0);let original=state.transition;state.enterSeat(available);assert.equal(state.transition,original);assert.equal(state.selected,other);
state.transition=null;state.enterSeat(available);assert.equal(state.selected,other); // POV cannot re-enter
state.$('continue').onclick();assert.equal(state.pov,false);assert.equal(state.transition.to,0);state.enterSeat(available);assert.equal(state.selected,other); // reversing blocks entry
state.transition=null;state.enterSeat(taken);assert.equal(state.selected,other);assert.equal(state.transition,null);state.enterSeat(null);assert.equal(state.transition,null);
state.renderer=null;state.enterSeat(available);assert.equal(state.transition,null);
assert.match(source,/b\.addEventListener\('dblclick',e=>\{e\.preventDefault\(\);e\.stopPropagation\(\);enterSeat\(s\);\}\)/);
assert.match(source,/if\(pov\)\{lookX=lookY=0;return;\}enterSeat\(pickSeat\(e\)\)/);
assert.match(source,/raycaster\.intersectObjects\(seatMeshes,true\)/);
console.log('PASS: single-click selection only; direct selected-seat entry; no duplicate transition; taken/null/unavailable-renderer guards; POV isolation; reverse-transition guard; DOM double-click and canvas raycast wiring.');
