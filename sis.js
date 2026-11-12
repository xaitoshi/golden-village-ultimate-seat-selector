// Seatwise · Study 03 — Singapore Indoor Stadium, 2026 BABYMONSTER World Tour [CHOOM] (South Stage).
// Unofficial fan concept: not affiliated with BABYMONSTER, YG Entertainment, Live Nation, Ticketmaster or The Kallang.
import * as THREE from 'three';
import model from './sis-model.cjs';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
const {CATS,sections,seats,byId,FLOOR,STAGE,ZONES,FLOOR_BLOCKS,FOH,LOOK_AT,eyeOf,info,zoneSpot,rowY,smooth}=model;
const $=id=>document.getElementById(id);
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let selected=byId.get('220-20-6'),pov=false,progress=0,transition=null,renderer,camera,scene,lookX=0,lookY=0,paintMode='tickets',povFov=null,filterCat=null;
const orbit={theta:.42,phi:.8,zoom:1};
const secById=new Map(sections.map(s=>[s.id,s]));
const seatIndex=new Map(seats.map((s,i)=>[s,i]));
const secName=id=>{const x=secById.get(id);return x&&x.block&&x.block.name||id;};
const fmt=s=>s.zone?`${s.name}`:s.floor?`${secName(s.sec)}, Row ${s.row}, Seat ${s.n}`:`Section ${s.sec}, Row ${s.row}, Seat ${s.n}`;
function update(){const m=info(selected),c=CATS[selected.cat];
 $('seat-name').innerHTML=selected.zone?`${selected.name} <span style="font-size:12px;color:#96a29f">/ standing</span>`:`${selected.floor?secName(selected.sec):'Sec '+selected.sec} <span style="font-size:12px;color:#96a29f">/ Row ${selected.row}, Seat ${selected.n}</span>`;
 $('mcat').innerHTML=`<i class="chip" style="background:${c.color}"></i>${c.name.replace(' (Restricted View)','')}`;$('mprice').textContent=`S$${c.price}`;$('mdist').textContent=`≈${m.distance} m`;
 $('mview').innerHTML=m.restricted?'<span class="warn">Restricted (side)</span>':m.standing?'Standing · free':selected.floor?'Floor · flat':`Level ${selected.level} · raked`;
 $('est').textContent=selected.zone?'Pen size approximate':m.sourced?'Seat count from seat view data':'Approximate geometry';
 syncPicker();paint();}
function choose(s){if(!s||transition||pov)return;selected=s;update();}
function enterSeat(s){if(!s||transition||pov||!renderer)return;choose(s);$('continue').onclick();}
// ---- Picker (section → row → seat)
const pickList=[...sections.filter(s=>s.floor),...ZONES.map(z=>({id:z.id,zone:z})),...sections.filter(s=>!s.floor)];
for(const p of pickList){const o=document.createElement('option');o.value=p.id;const c=CATS[(p.zone||p).cat];o.textContent=p.zone?`${p.zone.name} · ${c.name}`:p.floor?(p.block&&p.block.name||`${p.id} · ${c.name}`):`${p.id} · ${c.name.replace(' (Restricted View)',' (restricted)')}`;$('psec').append(o);}
function rowsFor(id){const s=secById.get(id);return s?s.rows.filter(r=>seats.some(x=>x.sec===id&&x.row===r)):[];}
function syncPicker(){const id=selected.zone||selected.sec;$('psec').value=id;const rows=rowsFor(id);$('prow').innerHTML='';$('prow').disabled=!rows.length;$('pseat').disabled=!rows.length;
 for(const r of rows){const o=document.createElement('option');o.value=o.textContent=r;$('prow').append(o);}
 if(rows.length){$('prow').value=selected.row;const n=seats.filter(x=>x.sec===id&&x.row===selected.row).length;$('pseat').max=n;$('pseat').value=selected.n;$('pseatv').textContent=`${selected.n} / ${n}`;}else $('pseatv').textContent='';}
function seatAt(id,row,n){const list=seats.filter(x=>x.sec===id&&x.row===row);return list[Math.max(0,Math.min(list.length-1,n-1))];}
$('psec').onchange=()=>{const id=$('psec').value,z=ZONES.find(z=>z.id===id);if(z){choose(zoneSpot(z));return;}const rows=rowsFor(id);const mid=rows[Math.floor(rows.length/2)];const n=seats.filter(x=>x.sec===id&&x.row===mid).length;choose(seatAt(id,mid,Math.ceil(n/2)));};
$('prow').onchange=()=>choose(seatAt(selected.sec,$('prow').value,selected.n));
$('pseat').oninput=()=>choose(seatAt(selected.sec,selected.row,+$('pseat').value));
// ---- Legend
for(const [k,c] of Object.entries(CATS)){const b=document.createElement('button');b.className='row';b.dataset.cat=k;b.innerHTML=`<i style="background:${c.color}"></i>${c.name.replace(' (Restricted View)','')}${c.restricted?' <span class="r">restricted view</span>':''}<b>$${c.price}</b>`;b.title='Highlight '+c.name;b.onclick=()=>{filterCat=filterCat===k?null:k;document.querySelectorAll('.legend .row').forEach(r=>r.classList.toggle('dim',!!filterCat&&r.dataset.cat!==filterCat));paint();};$('legend').append(b);}
$('legend').querySelector('.head').onclick=()=>$('legend').classList.toggle('closed');
if(matchMedia('(max-width:768px)').matches)$('legend').classList.add('closed');
{const b=document.createElement('button');b.className='ghost paint';b.id='paint';b.textContent='Show venue colours';b.onclick=()=>{paintMode=paintMode==='tickets'?'venue':'tickets';b.textContent=paintMode==='tickets'?'Show venue colours':'Show ticket colours';paint();};$('legend').append(b);}
$('continue').onclick=()=>{if(transition)return;lookX=lookY=0;pov=!pov;document.body.classList.toggle('pov',pov);$('mode-label').textContent=pov?'02 / YOUR VIEW':'01 / PICK YOUR SEAT';$('continue').textContent=pov?'← Back to map':'View from here ↗';$('tip').style.display='none';if(pov)hideCrowdNear(selected);else restoreCrowd();paint();transition={from:progress,to:pov?1:0,start:performance.now(),duration:reduced.matches?1:2400};};
let paint=()=>{},hideCrowdNear=()=>{},restoreCrowd=()=>{};
try{renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});}catch(e){$('fallback').style.display='block';$('continue').disabled=true;$('continue').textContent='WebGL unavailable';}
update();
if(renderer){
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0x07080b);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;renderer.outputColorSpace=THREE.SRGBColorSpace;$('world').append(renderer.domElement);
scene=new THREE.Scene();scene.fog=new THREE.Fog(0x07080b,140,320);camera=new THREE.PerspectiveCamera(42,1,.1,700);
const hemi=new THREE.HemisphereLight(0xdfe4ff,0x2a2530,1.25);scene.add(hemi);const key=new THREE.DirectionalLight(0xffffff,1.25);key.position.set(-30,80,40);scene.add(key);const fill=new THREE.DirectionalLight(0xffd6f5,.5);fill.position.set(20,30,-60);scene.add(fill);
function mat(color,roughness=.8,metalness=0,extra={}){return new THREE.MeshStandardMaterial({color,roughness,metalness,...extra});}
function basic(color,extra={}){return new THREE.MeshBasicMaterial({color,...extra});}
function canvasTex(w,h,draw,repeat){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;if(repeat){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(...repeat);}return t;}
const batches=new Map();function addGeo(g,m){if(!batches.has(m))batches.set(m,[]);batches.get(m).push(g);}
const up=new THREE.Vector3(0,1,0),M=new THREE.Matrix4();
function orientedBox(w,h,d,cx,cy,cz,tan,rad,m){const g=new THREE.BoxGeometry(w,h,d);M.makeBasis(new THREE.Vector3(tan[0],0,tan[1]),up,new THREE.Vector3(rad[0],0,rad[1]));M.setPosition(cx,cy,cz);g.applyMatrix4(M);addGeo(g,m);return g;}
function boxAt(w,h,d,x,y,z,m){const g=new THREE.BoxGeometry(w,h,d);g.translate(x,y,z);addGeo(g,m);}
function rectXZ(x0,x1,z0,z1,y,m,parent){const o=new THREE.Mesh(new THREE.PlaneGeometry(x1-x0,z1-z0),m);o.rotation.x=-Math.PI/2;o.position.set((x0+x1)/2,y,(z0+z1)/2);(parent||scene).add(o);return o;}
// ---- Materials
const parapet=mat(0x24262b,.9),capMat=mat(0xb9bcc2,.6),concrete=mat(0x2f3136,.95),concreteTop=mat(0x3d3f45,.9),maroon=mat(0x5a1a26,.8),fasciaBlue=mat(0x1d56c9,.5,0,{emissive:0x0b2a6e,emissiveIntensity:.6}),railMat=mat(0xa9b0b8,.35,.7),wallMat=mat(0x16181d,.95,0,{side:THREE.DoubleSide}),floorMat=mat(0x3a3c42,.95),stageBlack=mat(0x0c0c0f,.6),drape=mat(0x08080a,1,0,{side:THREE.DoubleSide}),truss=mat(0x9aa0a8,.4,.8),speakerMat=mat(0x111216,.7);
// ---- Bowl: stepped treads, front walls, fascia, rails, aisle edges per section
for(const s of sections){if(s.floor)continue;const {tan,rad}=s.ax;
 s.rowLines.forEach((l,k)=>{const rc=s.r0+(k+.5)*s.depth,tc=(l.t0+l.t1)/2,w=l.t1-l.t0+.25;const cx=rc*rad[0]+tc*tan[0],cz=rc*rad[1]+tc*tan[1];
  const yb=s.level===3?rowY(28)-4.5:0;orientedBox(w,l.y-yb,s.depth+.04,cx,(l.y+yb)/2,cz,tan,rad,k%2?concrete:concreteTop);});
 const l0=s.rowLines[0],last=s.rowLines.at(-1);if(!l0)continue;const tc=(l0.t0+l0.t1)/2,w=l0.t1-l0.t0+.25,rf=s.r0-.12,fx=rf*rad[0]+tc*tan[0],fz=rf*rad[1]+tc*tan[1];
 if(s.level===2){orientedBox(w,l0.y+.95,.24,fx,(l0.y+.95)/2,fz,tan,rad,parapet);orientedBox(w,.12,.3,fx,l0.y+.95,fz,tan,rad,capMat);orientedBox(w,.05,.06,fx,l0.y+1.05,fz,tan,rad,railMat);}
 else{const yt=l0.y+1.0,yb=yt-1.1;orientedBox(w,1.1,.3,fx,yt-.55,fz,tan,rad,fasciaBlue);orientedBox(w,yb-6,.28,fx,(yb+6)/2,fz,tan,rad,maroon);}
 // rear wall behind the last row
 const rb=s.r0+s.depth*s.rowLines.length+.15,tb=(last.t0+last.t1)/2,bx=rb*rad[0]+tb*tan[0],bz=rb*rad[1]+tb*tan[1];orientedBox(last.t1-last.t0+.3,1.3,.3,bx,last.y+.65,bz,tan,rad,s.level===2?maroon:concrete);}
// ---- Seats (one InstancedMesh; colour per instance)
const seatGeo=(()=>{const a=new THREE.BoxGeometry(.46,.08,.4);a.translate(0,.44,-.02);const b=new THREE.BoxGeometry(.46,.5,.07);b.rotateX(-.12);b.translate(0,.72,.2);const c=new THREE.BoxGeometry(.06,.42,.36);c.translate(.24,.21,0);const d=c.clone();d.translate(-.48,0,0);return mergeGeometries([a,b,c,d]);})();
const seatMat=new THREE.MeshLambertMaterial({color:0xffffff});
const seatMesh=new THREE.InstancedMesh(seatGeo,seatMat,seats.length);seatMesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
const q=new THREE.Quaternion(),pos=new THREE.Vector3(),scl=new THREE.Vector3(1,1,1);
seats.forEach((s,i)=>{q.setFromAxisAngle(up,s.yaw);const back=s.floor?0:.12;pos.set(s.x+Math.sin(s.yaw)*back,s.y,s.z+Math.cos(s.yaw)*back);M.compose(pos,q,scl);seatMesh.setMatrixAt(i,M);});
seatMesh.computeBoundingSphere();scene.add(seatMesh);
const VENUE=new THREE.Color(0x5b4a93),VENUE_ACC=new THREE.Color(0x7a2233),VENUE_FLOOR=new THREE.Color(0x3a3b44),SEL=new THREE.Color(0xc3ffd0),WHITE=new THREE.Color(0xffffff),DIM=new THREE.Color(0x30333a),tmpC=new THREE.Color();
const catColor=Object.fromEntries(Object.entries(CATS).map(([k,c])=>[k,new THREE.Color(c.color)]));
const ACCENT=new Set(['225','226','209','233']); // maroon accent blocks (approximate, after the supplied interior photo)
// ---- Floor: retracted 100-level apron, pens, PA blocks, FOH
rectXZ(-60,60,-60,70,-.02,mat(0x121318,1));rectXZ(FLOOR.x0,FLOOR.x1,FLOOR.z0,FLOOR.z1,0,floorMat);
const zoneMeshes=[];for(const z of ZONES){const c=CATS[z.cat];const m=rectXZ(z.x0,z.x1,z.z0,z.z1,.015,new THREE.MeshStandardMaterial({color:c.color,roughness:.9,transparent:true,opacity:.55}));m.userData.zone=z;zoneMeshes.push(m);z.mesh=m;}
for(const b of FLOOR_BLOCKS){const m=rectXZ(b.x0,b.x1,b.z0,b.z1,.01,new THREE.MeshStandardMaterial({color:CATS[b.cat].color,roughness:.9,transparent:true,opacity:.22}));b.mesh=m;}
// barricades around pens and the runway
for(const pen of ['A','B']){const zs=ZONES.filter(z=>z.pen===pen);const x0=Math.min(...zs.map(z=>z.x0)),x1=Math.max(...zs.map(z=>z.x1)),z0=Math.min(...zs.map(z=>z.z0)),z1=Math.max(...zs.map(z=>z.z1));
 boxAt(x1-x0,1.15,.1,(x0+x1)/2,.58,z1,railMat);boxAt(.1,1.15,z1-z0,Math.abs(x0)>Math.abs(x1)?x0:x1,.58,(z0+z1)/2,railMat);boxAt(x1-x0,.06,.1,(x0+x1)/2,1.2,(z0+z1)/2-(z1-z0)/2+.4,railMat);
 const mid=zs[0].z1;boxAt(x1-x0,.9,.06,(x0+x1)/2,.45,mid,mat(0x777d85,.5,.5));}
boxAt(FOH.x1-FOH.x0,.6,FOH.z1-FOH.z0,(FOH.x0+FOH.x1)/2,.3,(FOH.z0+FOH.z1)/2,stageBlack);boxAt(FOH.x1-FOH.x0-2,.9,1.1,(FOH.x0+FOH.x1)/2,1.05,(FOH.z0+FOH.z1)/2,mat(0x1b1c20,.5));
for(let i=0;i<5;i++)boxAt(1.2,.35,.05,FOH.x0+2+i*2.1,1.6,(FOH.z0+FOH.z1)/2-.5,basic(0x2c4f7a));

// ---- Stage, runway, LED screens, flown screens, PA hangs, lighting rig
const ST=STAGE;boxAt(ST.x1-ST.x0,ST.h,ST.z1-ST.z0+4,0,ST.h/2,(ST.z0+ST.z1)/2-2,stageBlack);
boxAt(ST.runway.w,ST.h-.2,ST.runway.z1-ST.z1,0,(ST.h-.2)/2,(ST.z1+ST.runway.z1)/2,stageBlack);boxAt(ST.tee.w,ST.h-.2,ST.tee.d,0,(ST.h-.2)/2,ST.runway.z1-ST.tee.d/2,stageBlack);
const edgeGlow=basic(0xff5fd8);boxAt(ST.x1-ST.x0,.08,.06,0,ST.h,ST.z1+.03,edgeGlow);for(const sx of [-1,1])boxAt(.06,.08,ST.runway.z1-ST.z1,sx*ST.runway.w/2,ST.h-.2,(ST.z1+ST.runway.z1)/2,edgeGlow);boxAt(ST.tee.w,.08,.06,0,ST.h-.2,ST.runway.z1,edgeGlow);
const ledTex=canvasTex(1024,544,(c,w,h)=>{const g=c.createLinearGradient(0,0,w,h);g.addColorStop(0,'#2a0a5e');g.addColorStop(.5,'#e3178f');g.addColorStop(1,'#ff9a3c');c.fillStyle=g;c.fillRect(0,0,w,h);for(let i=0;i<26;i++){c.fillStyle=`rgba(255,255,255,${.04+Math.random()*.08})`;c.beginPath();c.arc(Math.random()*w,Math.random()*h,20+Math.random()*120,0,7);c.fill();}c.fillStyle='#fff';c.textAlign='center';c.font='bold 118px Arial Black,Arial';c.fillText('BABYMONSTER',w/2,h/2+18);c.font='bold 44px Arial';c.fillText('WORLD TOUR [CHOOM]',w/2,h/2+92);c.fillStyle='rgba(0,0,0,.35)';for(let y=0;y<h;y+=4)c.fillRect(0,y,w,1);});
const sideTex=canvasTex(256,384,(c,w,h)=>{const g=c.createLinearGradient(0,0,0,h);g.addColorStop(0,'#ff2fae');g.addColorStop(1,'#2b0b6a');c.fillStyle=g;c.fillRect(0,0,w,h);c.strokeStyle='rgba(255,255,255,.55)';c.lineWidth=6;for(let i=0;i<9;i++){c.beginPath();c.moveTo(0,i*48);c.lineTo(w,i*48+60);c.stroke();}c.fillStyle='rgba(0,0,0,.3)';for(let y=0;y<h;y+=4)c.fillRect(0,y,w,1);});
const camTex=canvasTex(512,288,(c,w,h)=>{const g=c.createRadialGradient(w/2,h*.45,10,w/2,h/2,w*.6);g.addColorStop(0,'#ffd1f0');g.addColorStop(.35,'#c0287f');g.addColorStop(1,'#14051f');c.fillStyle=g;c.fillRect(0,0,w,h);c.fillStyle='rgba(20,5,30,.85)';for(const [x,s] of [[.3,.9],[.42,1],[.5,1.08],[.58,1],[.7,.9]]){c.beginPath();c.ellipse(x*w,h*.42,14*s,17*s,0,0,7);c.fill();c.fillRect(x*w-20*s,h*.5,40*s,h*.5);}c.fillStyle='#fff';c.font='bold 22px Arial';c.textAlign='right';c.fillText('LIVE',w-16,30);});
function screen(w,h,x,y,z,ry,tex,frame=true){const g=new THREE.Group();const s=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:tex,toneMapped:false}));g.add(s);if(frame){const f=new THREE.Mesh(new THREE.BoxGeometry(w+.4,h+.4,.3),stageBlack);f.position.z=-.17;g.add(f);}g.position.set(x,y,z);g.rotation.y=ry;scene.add(g);return g;}
screen(ST.led.w,ST.led.h,0,ST.led.y+ST.led.h/2,ST.led.z,0,ledTex);
for(const sx of [-1,1]){screen(5.2,7.6,sx*11.6,ST.h+1+3.8,-28.6,-sx*.32,sideTex);
 const fs=screen(9,5.1,sx*21.5,13.2,-25.2,-sx*.62,camTex);boxAt(.06,6,.06,sx*21.5,19.2,-25.2,truss);
 for(let i=0;i<10;i++){const a=new THREE.Mesh(new THREE.BoxGeometry(1.3,.55,1),speakerMat);a.position.set(sx*16.6,16.4-i*.58,-21.2);a.rotation.x=.02*i;a.rotation.y=-sx*.18;scene.add(a);}
 boxAt(3.6,3,3,sx*16,1.5,-22.5,speakerMat);}
// truss grid over the stage and runway with moving-head beams
const TY=19;for(const z of [-30,-24,-19])boxAt(32,.5,.5,0,TY,z,truss);for(const x of [-15.5,15.5,0])boxAt(.5,.5,11,x,TY,-24.5,truss);boxAt(.5,.5,13,0,TY-2,-12.5,truss);boxAt(12,.5,.5,0,TY-2,-6.5,truss);
const beamGroup=new THREE.Group();scene.add(beamGroup);const beamColors=[0xff3fd0,0x48e6ff,0xffffff,0x9a5bff];
const beamGeo=new THREE.CylinderGeometry(.1,1.7,1,20,1,true);beamGeo.translate(0,-.5,0);
const beams=[];const beamFrom=[];for(const z of [-30,-24,-19])for(let i=-3;i<=3;i++)beamFrom.push([i*4.6,TY-.4,z]);for(let i=0;i<5;i++)beamFrom.push([0,TY-2.4,-18+i*2.6]);
beamFrom.forEach((p,i)=>{const m=new THREE.Mesh(beamGeo,new THREE.MeshBasicMaterial({color:beamColors[i%4],transparent:true,opacity:.05,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide,toneMapped:false,fog:false}));m.position.set(...p);beamGroup.add(m);const head=new THREE.Mesh(new THREE.CylinderGeometry(.25,.3,.5,10),mat(0x222,.5,.4));head.position.set(p[0],p[1]-.1,p[2]);scene.add(head);beams.push({m,p,i,len:18+Math.random()*6});});
// backstage drape and wings
const dr=new THREE.Mesh(new THREE.PlaneGeometry(110,34),drape);dr.position.set(0,17,-34.5);scene.add(dr);for(const sx of [-1,1]){boxAt(4,12,8,sx*16,6,-30.5,drape);}
// ---- Crowd in the standing pens (instanced figures) with lightsticks
const crowd=[];for(const z of ZONES){const nx=Math.floor((z.x1-z.x0)/.62),nz=Math.floor((z.z1-z.z0)/.6);for(let i=0;i<nx;i++)for(let j=0;j<nz;j++){if(Math.random()<.18)continue;crowd.push({x:z.x0+.3+i*.62+(Math.random()-.5)*.3,z:z.z0+.3+j*.6+(Math.random()-.5)*.3,h:1.52+Math.random()*.3,c:Math.random()});}}
const bodyGeo=(()=>{const b=new THREE.CylinderGeometry(.17,.2,1,7);b.translate(0,.5,0);const h=new THREE.SphereGeometry(.13,8,6);h.translate(0,1.12,0);b.deleteAttribute('uv');h.deleteAttribute('uv');return mergeGeometries([b,h]);})();
const crowdMesh=new THREE.InstancedMesh(bodyGeo,new THREE.MeshLambertMaterial({color:0xffffff}),crowd.length);const stickMesh=new THREE.InstancedMesh(new THREE.SphereGeometry(.045,6,4),new THREE.MeshBasicMaterial({color:0xffffff,toneMapped:false}),crowd.length);
const palette=[0x1c1d24,0x2a2b33,0x3b3346,0x16171b,0x4a4250,0x222833];
function placeCrowd(hideNear){crowd.forEach((p,i)=>{const hide=hideNear&&Math.hypot(p.x-hideNear.x,p.z-hideNear.z)<.55;const s=hide?0:1;q.identity();pos.set(p.x,0,p.z);scl.set(s,p.h*s/1.25,s);M.compose(pos,q,scl);crowdMesh.setMatrixAt(i,M);const st=p.c<.55&&!(hideNear&&Math.hypot(p.x-hideNear.x,p.z-hideNear.z)<3.5);pos.set(p.x+.15,p.h+.2,p.z-.1);scl.setScalar(st?1:0);M.compose(pos,q,scl);stickMesh.setMatrixAt(i,M);});crowdMesh.instanceMatrix.needsUpdate=stickMesh.instanceMatrix.needsUpdate=true;}
crowd.forEach((p,i)=>{crowdMesh.setColorAt(i,tmpC.set(palette[i%palette.length]));stickMesh.setColorAt(i,tmpC.set(p.c<.4?0xff7ad9:0xffffff));});placeCrowd(null);crowdMesh.frustumCulled=stickMesh.frustumCulled=false;scene.add(crowdMesh,stickMesh);
hideCrowdNear=s=>{if(s.zone)placeCrowd(s);};restoreCrowd=()=>placeCrowd(null);
// ---- Walls and the pagoda roof (shown in seat view)
const shellGroup=new THREE.Group();scene.add(shellGroup);
const pts=[];for(const s of sections)if(!s.floor)for(const p of s.poly)pts.push(p);pts.push([-46,-34],[46,-34]);
const hull=(()=>{const P=pts.map(p=>[p[0],p[1]]).sort((a,b)=>a[0]-b[0]||a[1]-b[1]);const cr=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]);const lo=[],hi=[];for(const p of P){while(lo.length>1&&cr(lo.at(-2),lo.at(-1),p)<=0)lo.pop();lo.push(p);}for(const p of P.slice().reverse()){while(hi.length>1&&cr(hi.at(-2),hi.at(-1),p)<=0)hi.pop();hi.push(p);}return lo.slice(0,-1).concat(hi.slice(0,-1));})();
const ceil=(x,z)=>Math.max(20.5,39-18.5*Math.pow(Math.abs(x)/50+Math.abs(z)/64,1.25));
for(let i=0;i<hull.length;i++){const a=hull[i],b=hull[(i+1)%hull.length];const ex=(a[0]+b[0])/2,ez=(a[1]+b[1])/2,L=Math.hypot(b[0]-a[0],b[1]-a[1]);const n=Math.hypot(ex,ez-8)||1;const ox=ex+(ex)/n*2.5,oz=ez+(ez-8)/n*2.5;const w=new THREE.Mesh(new THREE.PlaneGeometry(L+6,32),wallMat);w.position.set(ox,16,oz);w.rotation.y=-Math.atan2(b[1]-a[1],b[0]-a[0]);shellGroup.add(w);
 const band=new THREE.Mesh(new THREE.PlaneGeometry(L+6,.5),basic(0x3a2a4a));band.position.set(ox*.995,19.4,oz*.995);band.rotation.y=w.rotation.y;shellGroup.add(band);}
const gridTex=canvasTex(256,256,(c,w,h)=>{c.fillStyle='#16181c';c.fillRect(0,0,w,h);c.strokeStyle='#8a929c';c.lineWidth=4;c.strokeRect(0,0,w,h);c.lineWidth=2;c.strokeStyle='#5c636c';c.beginPath();c.moveTo(0,0);c.lineTo(w,h);c.moveTo(w,0);c.lineTo(0,h);c.stroke();c.strokeStyle='#2c3036';c.beginPath();c.moveTo(w/2,0);c.lineTo(w/2,h);c.moveTo(0,h/2);c.lineTo(w,h/2);c.stroke();},null);gridTex.wrapS=gridTex.wrapT=THREE.RepeatWrapping;
const roofGeo=new THREE.PlaneGeometry(130,150,104,120);roofGeo.rotateX(Math.PI/2);{const p=roofGeo.attributes.position,uv=roofGeo.attributes.uv;for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i)+8;p.setZ(i,z);p.setY(i,ceil(x,z));uv.setXY(i,(x+z)/3.2,(x-z)/3.2);}roofGeo.computeVertexNormals();}
const roof=new THREE.Mesh(roofGeo,new THREE.MeshStandardMaterial({map:gridTex,emissiveMap:gridTex,emissive:0xffffff,emissiveIntensity:.22,roughness:.8,metalness:.2,side:THREE.DoubleSide,color:0xc4c9d2}));shellGroup.add(roof);
// central light trough along the long axis, splitting into hip light rows at the ends (after the interior photo)
const lampMat=basic(0xf4f6ff,{toneMapped:false});const lampGeos=[];
for(let z=-30;z<=34;z+=1.6){const y=ceil(0,z);const t=new THREE.BoxGeometry(3,.4,1.05);t.translate(0,y-.55,z);lampGeos.push(t);}
const troughGeo=[];for(let z=-31;z<=35;z+=.5){}{const s1=new THREE.BoxGeometry(.4,1.6,66);s1.translate(-1.9,ceil(0,0)-1.3,2);const s2=s1.clone();s2.translate(3.8,0,0);shellGroup.add(new THREE.Mesh(mergeGeometries([s1,s2]),mat(0x9da3ad,.4,.6)));}
const hipGeos=[];for(const zs of [-1,1])for(const xs of [-1,1]){const z0=zs>0?34:-30;let prev=null;for(let k=0;k<=24;k++){const f=k/24;const x=xs*f*44,z=z0+zs*f*20;const y=ceil(x,z)-.9;const cur=new THREE.Vector3(x,y,z);if(prev){const mid=prev.clone().add(cur).multiplyScalar(.5),len=prev.distanceTo(cur);const g=new THREE.BoxGeometry(2.2,1.3,len+.05);const o=new THREE.Object3D();o.position.copy(mid);o.lookAt(cur);o.updateMatrix();g.applyMatrix4(o.matrix);hipGeos.push(g);for(const side of [-1,1]){const l=new THREE.BoxGeometry(.5,.12,len*.55);const o2=o.clone();o2.translateX(side*.75);o2.translateY(-.7);o2.updateMatrix();l.applyMatrix4(o2.matrix);lampGeos.push(l);}}prev=cur;}}
shellGroup.add(new THREE.Mesh(mergeGeometries(hipGeos),mat(0x5d636d,.6,.5)));
shellGroup.add(new THREE.Mesh(mergeGeometries(lampGeos),lampMat));
// ---- Merge static geometry per material
for(const [m,geos] of batches){const merged=new THREE.Mesh(mergeGeometries(geos),m);scene.add(merged);geos.forEach(x=>x.dispose());}
// ---- Section labels (map view)
const labelGroup=new THREE.Group();scene.add(labelGroup);
function labelSprite(text,color='#ffffff',bg='rgba(10,12,15,.72)'){const c=document.createElement('canvas');c.width=128;c.height=64;const g=c.getContext('2d');g.fillStyle=bg;g.beginPath();g.roundRect(4,8,120,48,14);g.fill();g.fillStyle=color;g.font='bold 30px Arial';g.textAlign='center';g.textBaseline='middle';g.fillText(text,64,33);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;const s=new THREE.Sprite(new THREE.SpriteMaterial({map:t,depthTest:false,toneMapped:false}));s.renderOrder=5;return s;}
for(const s of sections){const sp=labelSprite(s.id);if(s.floor){sp.position.set(s.cx,2.2,s.cz);sp.scale.set(4,2,1);}else{const l=s.rowLines.at(-1)||s.rowLines[0];const r=s.r0+s.depth*s.rowLines.length*.55,t=(l.t0+l.t1)/2;sp.position.set(r*s.ax.rad[0]+t*s.ax.tan[0],l.y+3,r*s.ax.rad[1]+t*s.ax.tan[1]);sp.scale.set(4,2,1);}labelGroup.add(sp);}
for(const z of ZONES.filter(z=>z.cat==='CAT1')){const sp=labelSprite('PEN '+z.pen);sp.position.set((z.x0+z.x1)/2,2.6,z.z0-1);sp.scale.set(5,2.5,1);labelGroup.add(sp);}
{const sp=labelSprite('STAGE','#ffd6f5');sp.position.set(0,4,-25);sp.scale.set(7,3.5,1);labelGroup.add(sp);const f=labelSprite('FOH');f.position.set((FOH.x0+FOH.x1)/2,5.5,(FOH.z0+FOH.z1)/2);f.scale.set(4,2,1);labelGroup.add(f);}
// selected-seat pin
const pin=new THREE.Mesh(new THREE.ConeGeometry(.9,2.2,14),basic(0xc3ffd0,{toneMapped:false}));pin.rotation.x=Math.PI;scene.add(pin);
// ---- Colouring
paint=()=>{const sel=selected,selSec=sel.zone?null:sel.sec;for(let i=0;i<seats.length;i++){const s=seats[i];let c;
  if(paintMode==='venue'||progress>.5&&pov){c=tmpC.copy(s.floor?VENUE_FLOOR:ACCENT.has(s.sec)?VENUE_ACC:VENUE);}else{c=tmpC.copy(catColor[s.cat]);if(filterCat&&s.cat!==filterCat)c.lerp(DIM,.82);else if(s.sec===selSec)c.lerp(WHITE,.35);}
  if(s===sel)c.copy(SEL);seatMesh.setColorAt(i,c);}seatMesh.instanceColor.needsUpdate=true;
 for(const z of ZONES){z.mesh.material.opacity=filterCat&&z.cat!==filterCat?.12:(sel.zone===z.id?.9:.55);z.mesh.material.color.set(sel.zone===z.id?0xc3ffd0:CATS[z.cat].color);}
 for(const b of FLOOR_BLOCKS)b.mesh.material.opacity=filterCat&&b.cat!==filterCat?.05:.22;};
paint();
// ---- Camera, interaction
const startPos=new THREE.Vector3(),endPos=new THREE.Vector3(),target=new THREE.Vector3(),center=new THREE.Vector3(0,0,7),homeCenter=center.clone(),povTarget=new THREE.Vector3(),look=new THREE.Vector3(...LOOK_AT);let width=0,height=0;
function resize(){const wasPortrait=width/height<1;width=innerWidth;height=innerHeight;if(width/height<1&&!wasPortrait)orbit.theta=0;else if(width/height>=1&&wasPortrait)orbit.theta=.42;renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();}addEventListener('resize',resize);resize();
let drag=null;const el=renderer.domElement;el.style.touchAction='none';const pointers=new Map();let pinch=null;
el.addEventListener('pointerdown',e=>{pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===2){const [a,b]=[...pointers.values()];pinch={d:Math.hypot(a.x-b.x,a.y-b.y),z:orbit.zoom};}if(transition)return;drag={x:e.clientX,y:e.clientY,moved:0};el.setPointerCapture(e.pointerId);});
el.addEventListener('pointermove',e=>{if(pointers.has(e.pointerId))pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pinch&&pointers.size===2&&!pov){const [a,b]=[...pointers.values()];orbit.zoom=THREE.MathUtils.clamp(pinch.z*pinch.d/Math.max(20,Math.hypot(a.x-b.x,a.y-b.y)),.35,1.6);if(drag)drag.moved=99;return;}
 if(!drag){hover(e);return;}const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.moved+=Math.abs(dx)+Math.abs(dy);drag.x=e.clientX;drag.y=e.clientY;if(pov){lookX=THREE.MathUtils.clamp(lookX-dx*.004,-2.2,2.2);lookY=THREE.MathUtils.clamp(lookY-dy*.003,-.6,.8);}else{orbit.theta-=dx*.005;orbit.phi=THREE.MathUtils.clamp(orbit.phi-dy*.004,.12,1.38);}});
let lastDragMoved=0;el.addEventListener('pointerup',e=>{pointers.delete(e.pointerId);if(pointers.size<2)pinch=null;lastDragMoved=drag?drag.moved:0;drag=null;});el.addEventListener('pointercancel',e=>{pointers.delete(e.pointerId);pinch=null;drag=null;});
el.addEventListener('wheel',e=>{if(pov){e.preventDefault();povFov=THREE.MathUtils.clamp((povFov||camera.fov)*Math.exp(e.deltaY*.001),25,95);return;}e.preventDefault();orbit.zoom=THREE.MathUtils.clamp(orbit.zoom*Math.exp(e.deltaY*.001),.35,1.6);},{passive:false});
const raycaster=new THREE.Raycaster(),ndc=new THREE.Vector2();
function pick(e){const rect=el.getBoundingClientRect();ndc.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(ndc,camera);
 const hits=raycaster.intersectObjects([seatMesh,...zoneMeshes],false);const h=hits[0];if(!h)return null;
 if(h.object===seatMesh)return seats[h.instanceId];const z=h.object.userData.zone;return zoneSpot(z,THREE.MathUtils.clamp((h.point.x-z.x0)/(z.x1-z.x0),.04,.96),THREE.MathUtils.clamp((h.point.z-z.z0)/(z.z1-z.z0),.04,.96));}
let hoverT=0;function hover(e){if(pov||transition||e.pointerType==='touch')return;const now=performance.now();if(now-hoverT<60)return;hoverT=now;const s=pick(e);const tip=$('tip');if(!s){tip.style.display='none';el.style.cursor='';return;}const c=CATS[s.cat];tip.style.display='block';tip.style.left=e.clientX+14+'px';tip.style.top=e.clientY+12+'px';tip.innerHTML=`<i class="chip" style="background:${c.color}"></i>${s.zone?s.name:fmt(s)} · ${c.name} · S$${c.price}`;el.style.cursor='pointer';}
el.addEventListener('pointerleave',()=>{$('tip').style.display='none';});
el.addEventListener('click',e=>{if(!pov&&!transition&&lastDragMoved<6){const s=pick(e);if(s)choose(s);}});
el.addEventListener('dblclick',e=>{e.preventDefault();if(transition)return;if(pov){lookX=lookY=0;povFov=null;return;}if(lastDragMoved<6)enterSeat(pick(e));});
addEventListener('keydown',e=>{if(e.key==='Escape'&&pov&&!transition)$('continue').click();});
const clock={t:0};let basePitchNow=0;
function frame(now){requestAnimationFrame(frame);clock.t=now/1000;
 if(transition){const t=Math.min(1,(now-transition.start)/transition.duration);const before=progress;progress=THREE.MathUtils.lerp(transition.from,transition.to,smooth(t));if((before-.5)*(progress-.5)<=0)paint();if(t===1){transition=null;paint();}}
 const p=progress,portrait=width/height<1,Rd=(portrait?228:136)*orbit.zoom;camera.setViewOffset(width,height,0,(1-p)*height*(portrait?.075:-.035),width,height);
 startPos.set(center.x+Rd*Math.sin(orbit.phi)*Math.sin(orbit.theta),Rd*Math.cos(orbit.phi),center.z+Rd*Math.sin(orbit.phi)*Math.cos(orbit.theta));
 scene.fog.near=THREE.MathUtils.lerp(Rd+40,140,p);scene.fog.far=THREE.MathUtils.lerp(Rd+260,320,p);const eye=eyeOf(selected);endPos.set(...eye);camera.position.lerpVectors(startPos,endPos,p);camera.position.y+=Math.sin(p*Math.PI)*12;
 const ly=selected.zone?4.6:look.y,dx=look.x-eye[0],dz=look.z-eye[2],baseYaw=Math.atan2(dx,dz),flat=Math.hypot(dx,dz),basePitch=Math.atan2(ly-eye[1],flat);basePitchNow=basePitch;const yaw=baseYaw+lookX,pitch=basePitch+lookY;
 povTarget.set(eye[0]+Math.sin(yaw)*Math.cos(pitch)*20,eye[1]+Math.sin(pitch)*20,eye[2]+Math.cos(yaw)*Math.cos(pitch)*20);
 target.lerpVectors(center,povTarget,p);camera.up.set(0,1,0);camera.lookAt(target);camera.fov=THREE.MathUtils.lerp(portrait?48:34,povFov||(portrait?80:62),p);camera.updateProjectionMatrix();
 shellGroup.visible=p>.35;labelGroup.visible=p<.3;pin.visible=p<.5;pin.position.set(selected.x,(selected.y||0)+2.6+Math.sin(clock.t*3)*.3,selected.z);
 for(const b of beams){const t=clock.t*.6+b.i*.7;const len=b.len;b.m.scale.set(1,len,1);b.m.rotation.set(Math.sin(t)*.55+.15*Math.sin(b.i),0,Math.cos(t*.8+b.i)*.5);}
 renderer.render(scene,camera);}
requestAnimationFrame(frame);
function resolve(id){const [zid,uv]=String(id).split('@');const z=ZONES.find(z=>z.id===zid);if(z){const [u,v]=(uv||'.5,.5').split(',').map(Number);return zoneSpot(z,u,v);}return byId.get(id);}
window.__seatscope={count:seats.length,sections:sections.map(s=>({id:s.id,cat:s.cat,seats:s.seatCount})),getState:()=>({selected:selected.id,sec:selected.sec,row:selected.row,cat:selected.cat,pov,progress,transitioning:!!transition,paintMode}),
 choose:id=>choose(resolve(id)),enter:id=>enterSeat(resolve(id)),back:()=>{if(pov)$('continue').onclick();},
 look:(x,y=0)=>{lookX=x;lookY=y;},level:()=>{lookX=0;lookY=-basePitchNow;},fov:f=>{povFov=f;},orbit:(theta,phi,zoom)=>Object.assign(orbit,{theta,phi,zoom}),focus:(x,z)=>{center.set(x,0,z);},
 project:id=>{const s=byId.get(id);const v=new THREE.Vector3(s.x,s.y+.6,s.z).project(camera);return{x:(v.x*.5+.5)*width,y:(-v.y*.5+.5)*height};},
 projectXZ:(x,y,z)=>{const v=new THREE.Vector3(x,y,z).project(camera);return{x:(v.x*.5+.5)*width,y:(-v.y*.5+.5)*height};}};
}
