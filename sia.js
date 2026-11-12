// Seatwise · Study 02 — unofficial fan concept of Singapore Airlines' next-generation (2027) Business Class.
// Not affiliated with or endorsed by Singapore Airlines. Geometry is estimated; see README.
import * as THREE from 'three';
import model from './sia-model.cjs';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
const {seats,ROWS,info,smooth,SUITE_X,SUITE_LEN,bedPose,dividerOffset,partner}=model;
let setBed=()=>{},setDivider=()=>{},allBeds=false;
const $=id=>document.getElementById(id);
let selected=seats.find(s=>s.id==='11A'),pov=false,progress=0,transition=null,renderer,camera,scene,lookX=0,lookY=0,smash=false,smashP=0,smashTrans=null;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const orbit={theta:0,phi:.46,zoom:1};
function update(){const m=info(selected);$('seat-name').innerHTML=`${selected.id} <span style="font-size:12px;color:#96a29f">/ Row ${selected.row}</span>`;$('stype').textContent=m.type;$('scabin').textContent=m.cabin;$('sfeature').textContent=m.companion?'Lowerable divider':selected.window?'Sliding door · window':'Sliding door';document.querySelectorAll('.seat-hit').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.id===selected.id)));drawMini();syncToggles();}
function syncToggles(){$('bed').textContent=selected.bedOn?'Seat up':'Make bed';$('bed').setAttribute('aria-pressed',String(!!selected.bedOn));const pr=partner(selected);$('divider').hidden=!pr;if(pr){const up=(window.__pairUp||{})[selected.row];$('divider').textContent=up===false?'Divider up':'Divider down';}$('allbeds').textContent=allBeds?'All seats up':'Make all beds';}
function choose(s){if(s.taken||transition||pov||smash||smashTrans)return;selected=s;update();}
function enterSeat(s){if(!s||s.taken||transition||pov||smash||smashTrans||!renderer)return;choose(s);$('continue').onclick();}
for(const s of seats){const b=document.createElement('button');b.className='seat-hit';b.dataset.id=s.id;b.setAttribute('aria-label',`Row ${s.row}, seat ${s.letter}, ${info(s).type}`);b.title=s.id;b.addEventListener('click',()=>choose(s));b.addEventListener('dblclick',e=>{e.preventDefault();e.stopPropagation();enterSeat(s);});$('seats').append(b);const f=b.cloneNode();f.className='';f.textContent=s.id;f.onclick=()=>choose(s);$('fallback-seats').append(f);s.button=b;}
function drawMini(){const c=$('mini').getContext('2d');c.clearRect(0,0,216,144);c.strokeStyle='#59646a';c.lineWidth=1.5;c.beginPath();c.moveTo(10,20);c.lineTo(190,20);c.quadraticCurveTo(212,72,190,124);c.lineTo(10,124);c.stroke();for(const s of seats){c.fillStyle=s===selected?'#c3ffd0':(!s.window&&s.comp)?'#d8e39a':'#7d878b';c.fillRect(196-(s.z*8.9)-3,72+s.x*16-3,7,6);}c.fillStyle='#8c979a';c.font='9px Arial';c.fillText('NOSE →',160,14);}
$('source').onclick=()=>$('notes').showModal();$('close').onclick=()=>$('notes').close();
$('bed').onclick=()=>{setBed(selected,!selected.bedOn);syncToggles();};$('divider').onclick=()=>{const pu=window.__pairUp=window.__pairUp||{};const up=pu[selected.row]===false;pu[selected.row]=up;setDivider(selected.row,up);syncToggles();};$('allbeds').onclick=()=>{allBeds=!allBeds;seats.forEach((s,i)=>setTimeout(()=>setBed(s,allBeds),reduced.matches?0:i*25));syncToggles();};
$('continue').onclick=()=>{if(transition||smash||smashTrans)return;lookX=lookY=0;pov=!pov;document.body.classList.toggle('pov',pov);$('mode-label').textContent=pov?'02 / YOUR SUITE':'01 / PICK YOUR SUITE';$('continue').textContent=pov?'← Change seat':'Sit here ↗';$('seats').style.pointerEvents=pov?'none':'';for(const s of seats)s.button.style.pointerEvents=pov?'none':'';transition={from:progress,to:pov?1:0,start:performance.now(),duration:reduced.matches?1:2100};};
update();
try{renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});}catch(e){$('fallback').style.display='block';$('continue').disabled=true;$('continue').textContent='WebGL unavailable';$('smash').disabled=true;$('seats').hidden=true;}
if(renderer){
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0x0b0d10);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;$('world').append(renderer.domElement);
scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(45,1,.04,200);
scene.add(new THREE.HemisphereLight(0xf4f6ff,0x2a2a30,1.7));const sun=new THREE.DirectionalLight(0xfff3e2,1.3);sun.position.set(3,9,4);scene.add(sun);
const CZ=10.4,R=3.25,CY=1.0,LEN=20.8,HW=3.05; // widened section so the 0.95 m aisles read as walkways
function mat(color,roughness=.8,metalness=0){return new THREE.MeshStandardMaterial({color,roughness,metalness});}
function canvasTex(w,h,draw,repeat){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;if(repeat){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(...repeat);}return t;}
function box(w,h,d,x,y,z,m,parent){const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);parent.add(o);return o;}
function rounded(w,h,r){const s=new THREE.Shape();s.moveTo(-w/2+r,-h/2);s.lineTo(w/2-r,-h/2);s.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r);s.lineTo(w/2,h/2-r);s.quadraticCurveTo(w/2,h/2,w/2-r,h/2);s.lineTo(-w/2+r,h/2);s.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r);s.lineTo(-w/2,-h/2+r);s.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2);return s;}
function padded(w,h,d,x,y,z,m,parent){const geo=new THREE.ExtrudeGeometry(rounded(w,h,Math.min(.06,h/3)),{depth:d,bevelEnabled:true,bevelSize:.02,bevelThickness:.02,bevelSegments:2,curveSegments:4});geo.translate(0,0,-d/2);const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);parent.add(o);return o;}
function planeUV(shape,tex){const g=new THREE.ShapeGeometry(shape,8);g.computeBoundingBox();const bb=g.boundingBox,uv=g.attributes.uv,p=g.attributes.position;for(let i=0;i<uv.count;i++)uv.setXY(i,(p.getX(i)-bb.min.x)/(bb.max.x-bb.min.x),(p.getY(i)-bb.min.y)/(bb.max.y-bb.min.y));return new THREE.Mesh(g,new THREE.MeshBasicMaterial({map:tex}));}
// Textures
const carpetTex=canvasTex(256,256,(c,w,h)=>{c.fillStyle='#4f6276';c.fillRect(0,0,w,h);for(let i=0;i<4200;i++){const v=Math.random();c.fillStyle=v<.4?'#5d7189':v<.8?'#44566a':'#7488a0';c.fillRect(Math.random()*w,Math.random()*h,2,2);}},[5,16]);
const speckTex=canvasTex(256,256,(c,w,h)=>{c.fillStyle='#252628';c.fillRect(0,0,w,h);for(let i=0;i<5200;i++){const v=Math.random();c.fillStyle=v<.6?'#3d3e41':v<.9?'#6c6d6f':'#a8a8a4';c.fillRect(Math.random()*w,Math.random()*h,v<.9?1.4:1,v<.9?1.4:1);}},[1,3]);
const feltTex=canvasTex(128,128,(c,w,h)=>{c.fillStyle='#3e3f43';c.fillRect(0,0,w,h);for(let i=0;i<3000;i++){c.fillStyle=Math.random()<.5?'#47484c':'#36373a';c.fillRect(Math.random()*w,Math.random()*h,1,1);}},[2,2]);
// Abstract bird/arrow motif — an impression of the cabin artwork in the renders, not the airline logo.
function motifTex(bg,fg){return canvasTex(512,300,(c,w,h)=>{c.fillStyle=bg;c.fillRect(0,0,w,h);c.strokeStyle=fg;c.lineCap='round';for(let i=0;i<7;i++){c.lineWidth=9-i;c.globalAlpha=1-i*.09;c.beginPath();c.moveTo(70+i*16,250-i*6);c.quadraticCurveTo(220+i*6,70+i*22,450-i*8,58+i*20);c.stroke();}c.globalAlpha=1;c.beginPath();c.moveTo(430,40);c.lineTo(472,52);c.lineTo(438,78);c.closePath();c.fillStyle=fg;c.fill();});}
const navyMotif=motifTex('#17213d','#d8c39a'),champMotif=motifTex('#cbb68e','#1b2747');
const skyTex=canvasTex(64,96,(c,w,h)=>{const g=c.createLinearGradient(0,0,0,h);g.addColorStop(0,'#7fb4e6');g.addColorStop(.62,'#cfe5f7');g.addColorStop(.66,'#ffffff');g.addColorStop(1,'#e9f1f7');c.fillStyle=g;c.fillRect(0,0,w,h);});
const shell=mat(0x2d2e32,.5,.1),shellLight=mat(0x38393d,.6),trim=mat(0xb8955e,.32,.75),felt=new THREE.MeshStandardMaterial({map:feltTex,roughness:1}),speck=new THREE.MeshStandardMaterial({map:speckTex,roughness:.4,metalness:.1}),black=mat(0x0d0e10,.3),fuselageMat=new THREE.MeshStandardMaterial({color:0xf0efea,roughness:.55,side:THREE.BackSide}),white=mat(0xefeeea,.6),tan=mat(0xd2b48c,.6);
const cabin=new THREE.Group(),overhead=new THREE.Group();scene.add(cabin,overhead);
// Floor and fuselage (A350-style circular section, ~5.6 m interior width)
const floor=new THREE.Mesh(new THREE.PlaneGeometry(6.3,LEN),new THREE.MeshStandardMaterial({map:carpetTex,roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.set(0,0,CZ);cabin.add(floor);
const th0=Math.acos(CY/R);const fus=new THREE.Mesh(new THREE.CylinderGeometry(R,R,LEN,72,1,true,th0,Math.PI*2-2*th0),fuselageMat);fus.rotation.x=Math.PI/2;fus.position.set(0,CY,CZ);cabin.add(fus);
// Windows (large A350-style), skipping door zones
const winShape=rounded(.3,.44,.1),frameShape=rounded(.38,.52,.13),frameMat=new THREE.MeshStandardMaterial({color:0xdcdbd6,roughness:.5});
for(const side of [-1,1])for(let z=.9;z<LEN-.6;z+=.93){if(z>13.5&&z<15.3)continue;const y=1.22,x=Math.sqrt(R*R-(y-CY)**2)-.02;const w=planeUV(winShape,skyTex);w.position.set(side*(x-.006),y,z);w.rotation.y=-side*Math.PI/2;cabin.add(w);const fr=new THREE.Mesh(new THREE.ShapeGeometry(frameShape,8),frameMat);fr.position.set(side*x,y,z);fr.rotation.y=-side*Math.PI/2;cabin.add(fr);}
// Door 2 between the cabins
const EXIT_Z=14.4;const exitTex=textTex('EXIT','#e9fff0','#0c7a3e',128,56);for(const side of [-1,1]){const d=box(.05,1.9,1.0,side*3.0,.95,EXIT_Z,mat(0xdedcd5,.5),cabin);d.rotation.z=side*.06;box(.06,.08,.3,side*2.95,1.05,EXIT_Z,mat(0x9a9a9a,.3,.6),cabin);const sign=new THREE.Mesh(new THREE.PlaneGeometry(.36,.16),new THREE.MeshBasicMaterial({map:exitTex}));sign.position.set(side*2.9,2.0,EXIT_Z);sign.rotation.y=-side*Math.PI/2;cabin.add(sign);const fl=new THREE.Mesh(new THREE.PlaneGeometry(.9,.4),new THREE.MeshBasicMaterial({map:exitTex}));fl.rotation.x=-Math.PI/2;fl.rotation.z=Math.PI/2;fl.position.set(side*2.45,.012,EXIT_Z);cabin.add(fl);}
// Bulkheads with navy / champagne motif panels
box(6.3,2.4,.12,0,1.2,.15,white,cabin);
function monument(w,d,x,z,label,motif){box(w,2.15,d,x,1.075,z,white,cabin);const t=new THREE.Mesh(new THREE.PlaneGeometry(Math.min(w-.1,.9),.3),new THREE.MeshBasicMaterial({map:textTex(label,'#5d646b','#e6e5e0',256,84)}));t.rotation.x=-Math.PI/2;t.position.set(x,2.16,z);cabin.add(t);const f=new THREE.Mesh(new THREE.PlaneGeometry(Math.min(w-.1,.8),.26),new THREE.MeshBasicMaterial({map:textTex(label,'#5d646b','#e6e5e0',256,84)}));f.position.set(x,1.95,z+d/2+.006);cabin.add(f);if(motif){const m=new THREE.Mesh(new THREE.PlaneGeometry(w-.2,(w-.2)*.58),new THREE.MeshStandardMaterial({map:motif,roughness:.7}));m.position.set(x,1.35,z+d/2+.006);cabin.add(m);}}
// Front: lavatory above A, galley above D/F, galley above K (per the supplied seat map)
monument(.95,1.05,SUITE_X.A,.75,'LAV');monument(1.8,1.05,0,.75,'GALLEY',navyMotif);monument(.95,1.05,SUITE_X.K,.75,'GALLEY');
// Mid-cabin lavatory block between the aisles, exits either side
monument(1.8,1.25,0,13.55,'LAV',champMotif);
box(6.3,2.4,.12,0,1.2,LEN-.05,white,cabin);for(let x=-2.6;x<=2.6;x+=.11)box(.06,2.0,.06,x,1.05,LEN-.18,mat(0x6f7378,.9),cabin);
// Overhead bins, ceiling and lights (hidden in the map view so the cabin can be seen from above)
for(const side of [-1,1]){box(.7,.46,LEN-.4,side*2.62,2.02,CZ,white,overhead);box(.02,.03,LEN-.4,side*2.28,1.80,CZ,mat(0xc9c8c3),overhead);const strip=box(.04,.02,LEN-.4,side*2.2,1.79,CZ,new THREE.MeshBasicMaterial({color:0xfff2dc}),overhead);}
box(4.0,.05,LEN-.4,0,2.42,CZ,mat(0xf6f5f1,.7),overhead);for(let z=1.5;z<LEN;z+=3.2){const l=new THREE.PointLight(0xfff0dc,4,7,1.4);l.position.set(0,2.2,z);overhead.add(l);}
function textTex(text,fg,bg,w,h){return canvasTex(w,h,(c)=>{c.fillStyle=bg;c.fillRect(0,0,w,h);c.fillStyle=fg;c.font='bold '+Math.round(h*.55)+'px Arial';c.textAlign='center';c.textBaseline='middle';c.fillText(text,w/2,h/2+2);});}
const bassinetTex=canvasTex(128,128,(c,w,h)=>{c.fillStyle='#e9e7e1';c.fillRect(0,0,w,h);c.fillStyle='#16181b';c.beginPath();c.moveTo(22,62);c.lineTo(106,62);c.quadraticCurveTo(104,100,64,100);c.quadraticCurveTo(24,100,22,62);c.fill();c.beginPath();c.moveTo(64,62);c.lineTo(64,26);c.quadraticCurveTo(98,28,104,58);c.closePath();c.fill();});
// Suites — styling follows the prototype photos shown at SIA's Nov 2026 reveal (approximate, unofficial).
const seatMeshes=[],batches=new Map(),pairs=new Map();
function sgeo(geo,x,y,z,m,g){geo.translate(x+g.position.x,y,z+g.position.z);if(!batches.has(m))batches.set(m,[]);batches.get(m).push(geo);} // static parts merged per material
function sbox(w,h,d,x,y,z,m,g){sgeo(new THREE.BoxGeometry(w,h,d),x,y,z,m,g);}
function labelTex(text){return canvasTex(128,64,(c,w,h)=>{c.fillStyle='#1c1d20';c.fillRect(0,0,w,h);c.fillStyle='#f2f2ee';c.font='bold 38px Arial';c.textAlign='center';c.fillText(text,w/2,46);});}
function ifeTex(s){return canvasTex(512,288,(c,w,h)=>{const g=c.createLinearGradient(0,0,w,h);g.addColorStop(0,'#0b1730');g.addColorStop(1,'#1d3d6e');c.fillStyle=g;c.fillRect(0,0,w,h);c.fillStyle='#d8e39a';c.font='18px Arial';c.fillText('WELCOME ON BOARD',34,48);c.fillStyle='#fff';c.font='bold 74px Arial';c.fillText(s.id,34,132);c.font='20px Arial';c.fillStyle='#b9c6dd';c.fillText(s.type,34,168);c.strokeStyle='#d8e39a';c.lineWidth=3;c.setLineDash([6,8]);c.beginPath();c.moveTo(60,240);c.quadraticCurveTo(256,170,452,232);c.stroke();c.setLineDash([]);c.fillStyle='#fff';c.beginPath();c.arc(250,206,7,0,7);c.fill();c.font='14px Arial';c.fillStyle='#8fa0bd';c.fillText('SIN',44,268);c.fillText('LHR',440,262);c.fillText('Unofficial concept screen',300,30);});}
// Prototype-photo textures: hex-quilted leather backrest with lime piping, charcoal mesh wing, light-grey tri-arrow privacy panels, striped bedding
const hexTex=canvasTex(256,256,(c,w,h)=>{c.fillStyle='#a3a09b';c.fillRect(0,0,w,h);c.strokeStyle='#8e8b86';c.lineWidth=2;c.strokeRect(34,74,188,170);c.strokeStyle='#bdb98a';c.lineWidth=1.6;const r=15;for(let row=0;row<7;row++)for(let col=0;col<6;col++){const x=58+col*r*1.73+(row%2)*r*.87,y=96+row*r*1.5;if(x>205||y>235)continue;c.beginPath();for(let k=0;k<6;k++){const a=Math.PI/6+k*Math.PI/3;c.lineTo(x+r*Math.cos(a),y+r*Math.sin(a));}c.closePath();c.stroke();}c.strokeStyle='#d4e34a';c.lineWidth=7;c.beginPath();c.moveTo(44,26);c.quadraticCurveTo(128,44,212,26);c.stroke();});
hexTex.wrapS=hexTex.wrapT=THREE.ClampToEdgeWrapping;hexTex.repeat.set(1/.6,1/.6);hexTex.offset.set(.5,.5);
const meshTex=canvasTex(128,128,(c,w,h)=>{c.fillStyle='#2b2c2f';c.fillRect(0,0,w,h);c.fillStyle='#3d3e42';for(let y=0;y<h;y+=4)for(let x=(y/4)%2*2;x<w;x+=4)c.fillRect(x,y,2,2);},[6,2]);
const yTex=canvasTex(128,128,(c,w,h)=>{c.fillStyle='#b9bcbd';c.fillRect(0,0,w,h);c.lineWidth=1.6;for(let y=16;y<h;y+=32)for(let x=16+(y%64?16:0);x<w+16;x+=32){c.strokeStyle=(x+y)%96?'#d6d8d6':'#cfd96a';c.beginPath();for(const a of [-Math.PI/2,Math.PI/6,Math.PI*5/6]){c.moveTo(x,y);c.lineTo(x+6*Math.cos(a),y-6*Math.sin(a));}c.stroke();}},[3,3]);
const stripeTex=canvasTex(64,64,(c,w,h)=>{c.fillStyle='#f4f4f1';c.fillRect(0,0,w,h);c.fillStyle='#e1e1dc';for(let x=0;x<w;x+=8)c.fillRect(x,0,3,h);},[6,10]);
const pullTex=textTex('PULL','#e8e8e6','#111214',64,128);
const leatherBase=new THREE.Color(0x9e9b96),white3=new THREE.Color(0xffffff);
const shellDark=mat(0x222326,.55,.05),consoleGrey=mat(0x8f8d89,.5),silver=mat(0xd9dadc,.28,.6),whiteEdge=mat(0xf2f2f0,.4),limeMat=new THREE.MeshBasicMaterial({color:0xcfe04a}),meshMat=new THREE.MeshStandardMaterial({map:meshTex,roughness:.95}),wallY=new THREE.MeshStandardMaterial({map:yTex,roughness:.8}),glow=new THREE.MeshBasicMaterial({color:0x9fb3d6}),darkPad=mat(0x6c6a69,.9),whitePad=mat(0xf0f0ec,.8);
const H=1.32,REAR=.48,FRONT=REAR-SUITE_LEN; // 52 in shell/door height; 1.27 m shell; rows spaced wider for walkways
function fade(m){m.transparent=true;m.opacity=0;return m;}
for(const s of seats){
 const g=new THREE.Group();g.userData.seat=s;g.position.set(s.x,0,s.z);scene.add(g);s.group=g;seatMeshes.push(g);
 const W=s.suiteW,L0=s.suiteX-W/2-s.x,L1=s.suiteX+W/2-s.x,aisleDir=s.window?-s.side:s.side,aisleX=aisleDir>0?L1:L0,innerX=aisleDir>0?L0:L1,mid=(L0+L1)/2,cs=s.consoleSide,cx=cs*.43,ix=-cs*.05;
 const hit=new THREE.Mesh(new THREE.BoxGeometry(W,H,SUITE_LEN),new THREE.MeshBasicMaterial({visible:false}));hit.position.set(mid,H/2,(REAR+FRONT)/2);g.add(hit); // picking volume (static parts are merged)
 const wallMats=[shellDark,shellDark,shellDark,shellDark,shellDark,shellDark];wallMats[aisleDir>0?1:0]=wallY; // light-grey patterned privacy face inside, charcoal outside
 // Rear shell: charcoal, with a mesh-textured upper wing, lime piping, silver curved frame, reading lamp and coat hook
 sbox(W,H,.05,mid,H/2,REAR,shellDark,g);sbox(W-.1,.46,.012,mid,1.02,REAR-.031,meshMat,g);sbox(W-.1,.007,.004,mid,1.1,REAR-.039,limeMat,g);
 sbox(W-.06,.03,.035,mid,1.27,REAR-.035,silver,g);sbox(.03,.5,.035,mid+cs*(W/2-.05),1.02,REAR-.035,silver,g);sbox(W-.06,.025,.035,mid,.78,REAR-.035,silver,g);
 const lampGeo=new THREE.CylinderGeometry(.032,.04,.05,16);lampGeo.rotateX(Math.PI/2);sgeo(lampGeo,mid+cs*(W/2-.13),1.18,REAR-.06,silver,g);sbox(.05,.012,.03,mid-cs*.05,1.14,REAR-.05,silver,g);
 // Aisle wall with the sliding door parked open
 for(const [z0,z1] of [[REAR,.02],[-.52,FRONT]]){const len=z0-z1;const w=new THREE.Mesh(new THREE.BoxGeometry(.05,H,len),wallMats);w.position.set(aisleX,H/2,(z0+z1)/2);g.add(w);sbox(.07,.015,len,aisleX,H+.008,(z0+z1)/2,silver,g);}
 sbox(.03,H-.04,.56,aisleX+aisleDir*.045,H/2,.24,shellDark,g);sbox(.035,.012,.56,aisleX+aisleDir*.045,H-.02,.24,silver,g);
 // Centre privacy divider (D/F): slides vertically. Companion rows: full panel between the seats; split rows: upper panel above the shared console wall.
 if(!s.window&&s.side<0){const pg=new THREE.Group();g.add(pg);const comp=s.comp,ph=comp?.62:.62,baseY=comp?.83:.97;
  const panel=new THREE.Mesh(new THREE.BoxGeometry(.03,ph,1.18),wallY);pg.add(panel);const cap=new THREE.Mesh(new THREE.BoxGeometry(.04,.015,1.18),silver);cap.position.y=ph/2;pg.add(cap);pg.position.set(innerX,baseY,-.15);
  if(comp)sbox(.03,.42,.32,innerX,.21,FRONT+.2,shellDark,g);else{sbox(.06,.66,1.27,innerX,.33,(REAR+FRONT)/2,shellDark,g);sbox(.07,.012,1.27,innerX,.665,(REAR+FRONT)/2,whiteEdge,g);}
  pairs.set(s.row,{group:pg,baseY,comp,p:1,up:true});}
 // Forward bulkhead (seat view): large IFE, upper cubby with handset screen, lit niche + white curved shelf, PUSH FOR TABLE bar, footwell cubby with white ottoman pad, literature pocket
 const front=new THREE.Mesh(new THREE.BoxGeometry(W,H,.05),shellDark);front.position.set(mid,H/2,FRONT);g.add(front);sbox(W,.015,.07,mid,H+.008,FRONT,silver,g);
 sbox(.56,.34,.03,ix,1.04,FRONT+.04,mat(0x1a1b1e,.3),g);const scr=new THREE.Mesh(new THREE.PlaneGeometry(.5,.29),new THREE.MeshBasicMaterial({map:ifeTex(s)}));scr.position.set(ix,1.04,FRONT+.057);g.add(scr);
 const ux=cs*.36;sbox(.24,.17,.04,ux,1.11,FRONT+.045,mat(0x333438,.4),g);sbox(.1,.07,.003,ux-cs*.04,1.11,FRONT+.067,mat(0x101114,.2),g);
 sbox(.24,.12,.01,ux,.93,FRONT+.03,glow,g);sbox(.26,.022,.09,ux,.86,FRONT+.07,whiteEdge,g);
 sbox(.86,.035,.07,cs*.08,.81,FRONT+.06,consoleGrey,g);const push=new THREE.Mesh(new THREE.PlaneGeometry(.1,.0125),new THREE.MeshBasicMaterial({map:textTex('PUSH FOR TABLE','#e8e8e6','#151618',640,80)}));push.position.set(ix,.81,FRONT+.096);g.add(push);
 sbox(.46,.5,.01,ix,.36,FRONT+.03,mat(0x0e0f11,.6),g);
 sbox(.25,.2,.05,ux,.52,FRONT+.05,mat(0x2a2b2e,.5),g);sbox(.12,.07,.004,ux,.6,FRONT+.078,mat(0xc23b33,.6),g);
 // Seat rig (animated for bed mode)
 sbox(.42,.3,.42,0,.17,.05,shellDark,g);
 const leather=new THREE.MeshStandardMaterial({color:leatherBase,roughness:.7});s.material=leather;const backMat=new THREE.MeshStandardMaterial({map:hexTex,roughness:.7});s.backMat=backMat;
 const rig=new THREE.Group();g.add(rig);const cushion=padded(.56,.1,.48,0,.44,.05,leather,rig);
 const leg=new THREE.Group();leg.position.set(0,.44,-.19);rig.add(leg);padded(.5,.06,.22,0,0,-.11,leather,leg);
 const back=new THREE.Group();back.position.set(0,.49,.29);rig.add(back);padded(.56,.55,.1,0,.275,0,backMat,back);
 const head=new THREE.Group();head.position.set(0,.65,.01);back.add(head);padded(.44,.17,.11,0,0,0,leather,head);box(.4,.012,.012,0,-.085,-.06,limeMat,head);box(.1,.02,.01,cs*.1,.04,-.065,mat(0x3a3a3c,.5),head);
 const deco=padded(.3,.28,.06,-cs*.05,.27,-.1,darkPad,back);deco.rotation.x=-.2;
 box(.09,.015,.05,.12,.505,-.05,silver,rig);box(.07,.015,.04,-.1,.505,-.05,silver,rig);
 const ott=padded(.44,.05,.3,0,.3,FRONT+.2,whitePad,g);sbox(.5,.14,.3,0,.07,FRONT+.2,shellDark,g);
 // Bedding (fades in once flat): striped mattress pad, white pillow, grey cushion. Companion pairs nudge toward the centre to read as a double.
 const bx=!s.window&&s.comp?-s.side*.03:0;const mattress=new THREE.Mesh(new THREE.BoxGeometry(.6,.05,1.2),fade(new THREE.MeshStandardMaterial({map:stripeTex,roughness:.9})));mattress.position.set(bx,.585,(REAR+FRONT)/2+.02);g.add(mattress);
 const pillow=padded(.42,.08,.22,bx,.65,.3,fade(mat(0xf6f6f3,.9)),g);const gc=padded(.3,.22,.06,bx,.73,.42,fade(mat(0x6c6a69,.9)),g);gc.rotation.x=.25;
 s.rig={rig,back,leg,head,deco,ott,cushion,bedding:[mattress,pillow,gc]};s.bedP=0;s.bedOn=false;s.hide=[back,pillow,gc];
 // Side console: charcoal lower shell, grey sculpted upper with white edge, cup recess, keypad, charging box, PULL handle, lit footwell storage
 sbox(.3,.42,.98,cx,.21,-.07,shellDark,g);sbox(.3,.24,.98,cx,.54,-.07,consoleGrey,g);sbox(.012,.016,.98,cx-cs*.152,.66,-.07,whiteEdge,g);sbox(.012,.36,.016,cx-cs*.152,.48,-.555,whiteEdge,g);
 const cup=new THREE.CylinderGeometry(.045,.045,.012,20);sgeo(cup,cx,.664,-.32,mat(0x6f6d6a,.5),g);sbox(.012,.07,.12,cx-cs*.152,.58,.12,mat(0x16171a,.3),g);
 sbox(.16,.12,.14,cx+cs*.03,.72,.32,shellDark,g);sbox(.004,.03,.05,cx+cs*.03-cs*.081,.74,.32,glow,g);
 const pull=new THREE.Mesh(new THREE.PlaneGeometry(.05,.1),new THREE.MeshBasicMaterial({map:pullTex}));pull.position.set(cx-cs*.153,.24,-.25);pull.rotation.y=-cs*Math.PI/2;g.add(pull);
 const lit=new THREE.Mesh(new THREE.PlaneGeometry(.14,.025),glow);lit.position.set(cx-cs*.153,.1,.05);lit.rotation.y=-cs*Math.PI/2;g.add(lit);
 if(s.bassinet){const bf=new THREE.Mesh(new THREE.PlaneGeometry(.26,.26),new THREE.MeshBasicMaterial({map:bassinetTex}));bf.position.set(0,1.05,FRONT-.03);bf.rotation.y=Math.PI;g.add(bf);const bt=new THREE.Mesh(new THREE.PlaneGeometry(.3,.3),new THREE.MeshBasicMaterial({map:bassinetTex}));bt.rotation.x=-Math.PI/2;bt.position.set(mid,H+.02,FRONT-.35);g.add(bt);}
 if(s.row===18||s.row===21){const mp=new THREE.Mesh(new THREE.PlaneGeometry(W-.12,.8),new THREE.MeshStandardMaterial({map:champMotif,roughness:.7}));mp.position.set(mid,.75,REAR+.03);g.add(mp);}
 const lt=labelTex(s.id);const top=new THREE.Mesh(new THREE.PlaneGeometry(.22,.11),new THREE.MeshBasicMaterial({map:lt}));top.rotation.x=-Math.PI/2;top.position.set(aisleX,H+.02,.33);g.add(top);
 const face=new THREE.Mesh(new THREE.PlaneGeometry(.16,.08),new THREE.MeshBasicMaterial({map:lt}));face.position.set(aisleX+aisleDir*.03,H-.12,.36);face.rotation.y=aisleDir*Math.PI/2;g.add(face);
}
for(const [m,geos] of batches){const merged=new THREE.Mesh(mergeGeometries(geos),m);scene.add(merged);geos.forEach(x=>x.dispose());}
seats.forEach(applyPose);
// Eased tweens for bed mode and dividers
const tweens=new Set();
function tween(obj,key,to,dur){obj._tw=obj._tw||{};if(obj._tw[key])tweens.delete(obj._tw[key]);const tw={obj,key,from:obj[key],to,start:performance.now(),dur:reduced.matches?1:dur};obj._tw[key]=tw;tweens.add(tw);}
function applyPose(s){const q=bedPose(s.bedP),r=s.rig;r.rig.position.z=q.slide;r.back.rotation.x=q.backAngle;r.leg.rotation.x=q.legAngle;r.head.scale.set(1,q.headScale,1);r.deco.scale.setScalar(Math.max(.001,q.cushionScale));r.ott.position.y=q.ottomanY;for(const b of r.bedding)b.material.opacity=q.bedding;}
function applyDivider(row){const d=pairs.get(row);d.group.position.y=d.baseY+dividerOffset(d.p,d.comp);}
setBed=(s,on)=>{s.bedOn=on;tween(s,'bedP',on?1:0,1700);};
setDivider=(row,up)=>{const d=pairs.get(row);if(!d)return;d.up=up;tween(d,'p',up?1:0,1300);};
const startPos=new THREE.Vector3(),endPos=new THREE.Vector3(),target=new THREE.Vector3(),center=new THREE.Vector3(0,0,CZ),homeCenter=center.clone(),povTarget=new THREE.Vector3();let width=0,height=0;
function resize(){width=innerWidth;height=innerHeight;renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();orbit.theta=width/height<1?Math.PI/2:0;}addEventListener('resize',resize);resize();
let drag=null;const el=renderer.domElement;el.style.touchAction='none';
el.addEventListener('pointerdown',e=>{if(transition)return;drag={x:e.clientX,y:e.clientY,moved:0};el.setPointerCapture(e.pointerId);});
el.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.moved+=Math.abs(dx)+Math.abs(dy);drag.x=e.clientX;drag.y=e.clientY;if(smash){/* click or tap swings; dragging does not orbit */}else if(pov){lookX=THREE.MathUtils.clamp(lookX-dx*.004,-1.35,1.35);lookY=THREE.MathUtils.clamp(lookY-dy*.003,-.5,.45);}else{orbit.theta-=dx*.006;orbit.phi=THREE.MathUtils.clamp(orbit.phi-dy*.004,.1,1.3);}});
let lastDragMoved=0;el.addEventListener('pointerup',()=>{lastDragMoved=drag?drag.moved:0;drag=null;});el.addEventListener('pointercancel',()=>drag=null);
el.addEventListener('wheel',e=>{if(pov)return;e.preventDefault();orbit.zoom=THREE.MathUtils.clamp(orbit.zoom*Math.exp(e.deltaY*.001),.45,1.6);},{passive:false});
const raycaster=new THREE.Raycaster();
function pickSeat(e){const rect=el.getBoundingClientRect();raycaster.setFromCamera(new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),camera);const hit=raycaster.intersectObjects(seatMeshes,true)[0];if(!hit)return null;let o=hit.object;while(o&&!o.userData.seat)o=o.parent;return o?.userData.seat||null;}
el.addEventListener('click',e=>{if(smash){if(lastDragMoved<14)trySwing();return;}if(!pov&&!transition&&lastDragMoved<6){const s=pickSeat(e);if(s)choose(s);}});
el.addEventListener('dblclick',e=>{e.preventDefault();if(transition||smash||smashTrans)return;if(pov){lookX=lookY=0;return;}if(lastDragMoved<6)enterSeat(pickSeat(e));});
addEventListener('keydown',e=>{if(e.key!=='Escape'||transition)return;if(smash)exitSmash();else if(pov)$('continue').click();});
// Smash mode: third person character with a bat wrecks the selected suite.
const smashCam=new THREE.Vector3(),smashLook=new THREE.Vector3();
let smashHits=0,smashShake=0,swing=null,breakables=[],sparks=[],batter=null,autoSwing=false,lastFrame=0,actx=null;
function aisleDirOf(s){return s.window?-s.side:s.side;}
function aisleWallX(s){return s.suiteX+aisleDirOf(s)*s.suiteW/2;}
function makeBatter(){
  const g=new THREE.Group();
  const skin=mat(0xe2b496,.85),cloth=mat(0x4a5966,.88),pants=mat(0x2e3842,.88),shoe=mat(0x121417,.55),hair=mat(0x1a1410,.8),wood=mat(0x8a5a32,.6),wrap=mat(0x1c1c1c,.7),mint=mat(0xc3ffd0,.6),eye=mat(0x1a1a1a,.5);
  box(.09,.08,.18,-.07,.06,-.03,shoe,g);box(.09,.08,.18,.07,.06,-.03,shoe,g);
  box(.08,.7,.09,-.07,.46,0,pants,g);box(.08,.7,.09,.07,.46,0,pants,g);
  const torso=new THREE.Group();torso.position.set(0,.9,0);g.add(torso);
  box(.26,.56,.15,0,.3,0,cloth,torso);box(.265,.045,.155,0,.05,0,mint,torso);
  const head=new THREE.Group();head.position.set(0,.68,0);torso.add(head);
  head.add(new THREE.Mesh(new THREE.SphereGeometry(.12,14,12),skin));
  const cap=new THREE.Mesh(new THREE.SphereGeometry(.125,14,10,0,Math.PI*2,0,Math.PI*.55),hair);cap.position.y=.02;head.add(cap);
  box(.18,.045,.14,0,.07,-.02,hair,head);
  box(.025,.02,.02,-.038,.02,-.105,eye,head);box(.025,.02,.02,.038,.02,-.105,eye,head);
  const larm=new THREE.Group();larm.position.set(-.17,.46,0);torso.add(larm);larm.rotation.z=.28;
  box(.06,.3,.06,0,-.14,0,cloth,larm);box(.05,.24,.05,0,-.38,0,skin,larm);
  const arm=new THREE.Group();arm.position.set(.17,.46,0);torso.add(arm);
  box(.06,.28,.06,0,-.13,0,cloth,arm);
  const forearm=new THREE.Group();forearm.position.set(0,-.28,0);arm.add(forearm);
  box(.055,.26,.055,0,-.11,0,skin,forearm);
  const bat=new THREE.Group();bat.position.set(0,-.24,0);forearm.add(bat);
  const handle=new THREE.Mesh(new THREE.CylinderGeometry(.016,.018,.3,10),wrap);handle.position.y=-.1;bat.add(handle);
  const barrel=new THREE.Mesh(new THREE.CylinderGeometry(.038,.02,.5,12),wood);barrel.position.y=-.5;bat.add(barrel);
  const knob=new THREE.Mesh(new THREE.SphereGeometry(.022,8,8),wood);knob.position.y=.06;bat.add(knob);
  const tip=new THREE.Mesh(new THREE.SphereGeometry(.038,8,8),wood);tip.position.y=-.75;bat.add(tip);
  const lamp=new THREE.PointLight(0xfff2e4,5,4.5,1.4);lamp.position.set(0,1.6,.4);g.add(lamp);g.userData={arm,torso,head,forearm,bat,lamp};g.visible=false;scene.add(g);return g;
}
function restSwing(){if(!batter)return;const u=batter.userData;u.torso.rotation.set(0,.2,0);u.arm.rotation.set(.55,.2,-1.15);u.forearm.rotation.set(-.4,0,-.25);u.head.rotation.set(-.05,.25,0);}
function poseSwing(t){if(!batter)return;const u=batter.userData;const w=t<.3?t/.3:1,s=t<.3?0:t<.55?(t-.3)/.25:1,f=t<.55?0:(t-.55)/.45;u.arm.rotation.set(.55-w*.9+s*1.5+f*.15,.2-w*.15+s*.05,-1.15-w*.55+s*2.35+f*.45);u.forearm.rotation.set(-.4-w*.45+s*1.15,0,-.25+s*.35);u.torso.rotation.set(0,.2+w*.4-s*.9-f*.1,s*.12);u.head.rotation.set(-.05,.25-s*.35,0);}
function placeBatter(s){const dir=aisleDirOf(s);batter.position.set(aisleWallX(s)+dir*.36,0,s.z-.16);batter.lookAt(s.x,0,s.z);batter.visible=true;batter.scale.setScalar(.01);restSwing();}
function aimSmash(s){const dir=aisleDirOf(s),portrait=innerWidth/innerHeight<1;smashCam.set(aisleWallX(s)+dir*(portrait?.64:.62),portrait?1.38:1.4,s.z-1.12);smashLook.set(s.x+dir*(portrait?.32:.26),portrait?1.18:1.1,s.z-.04);}
function snapshotParts(s){const r=s.rig;return [r.cushion,r.head,r.deco,r.back,r.leg,r.ott].filter(Boolean).map(mesh=>({mesh,parent:mesh.parent,pos:mesh.position.clone(),quat:mesh.quaternion.clone(),scl:mesh.scale.clone(),flown:false,vel:null,ang:null}));}
function restoreParts(){for(const b of breakables){b.parent.add(b.mesh);b.mesh.position.copy(b.pos);b.mesh.quaternion.copy(b.quat);b.mesh.scale.copy(b.scl);}breakables=[];for(const p of sparks){scene.remove(p.mesh);p.mesh.geometry.dispose();p.mesh.material.dispose();}sparks=[];}
function burst(origin,amount,power){const colors=[0x9e9b96,0xeeeae3,0xcfe04a,0x222326,0xf0f0ec,0x8e8b86];for(let i=0;i<amount;i++){const sz=.02+Math.random()*.04;const mesh=new THREE.Mesh(new THREE.BoxGeometry(sz,sz,sz*1.4),new THREE.MeshStandardMaterial({color:colors[i%colors.length],roughness:.8,transparent:true,opacity:1}));mesh.position.copy(origin).add(new THREE.Vector3((Math.random()-.5)*.12,.04,(Math.random()-.5)*.12));scene.add(mesh);sparks.push({mesh,vel:new THREE.Vector3((Math.random()-.5)*3.2*power,(1.6+Math.random()*3)*power,(Math.random()-.5)*3.2*power),ang:new THREE.Vector3((Math.random()-.5)*12,(Math.random()-.5)*12,(Math.random()-.5)*12),life:.7+Math.random()*.7,age:0});}}
function flyPart(b,dir){if(b.flown)return;b.flown=true;const mesh=b.mesh,pos=new THREE.Vector3(),quat=new THREE.Quaternion(),scl=new THREE.Vector3();mesh.updateWorldMatrix(true,false);mesh.matrixWorld.decompose(pos,quat,scl);scene.add(mesh);mesh.position.copy(pos);mesh.quaternion.copy(quat);mesh.scale.copy(scl);b.vel=new THREE.Vector3(dir*(.7+Math.random()*1.1),1.4+Math.random()*1.1,(Math.random()-.35)*1.1);b.ang=new THREE.Vector3((Math.random()-.5)*6,(Math.random()-.5)*5,(Math.random()-.5)*6);}
function thwack(){try{const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;actx=actx||new AC();if(actx.state==='suspended')actx.resume();if(document.hidden)return;const t=actx.currentTime,o=actx.createOscillator(),g=actx.createGain();o.type='square';o.frequency.setValueAtTime(140,t);o.frequency.exponentialRampToValueAtTime(42,t+.09);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.12,t+.008);g.gain.exponentialRampToValueAtTime(.0001,t+.16);o.connect(g).connect(actx.destination);o.start(t);o.stop(t+.18);const n=actx.createBufferSource(),buf=actx.createBuffer(1,Math.floor(actx.sampleRate*.12),actx.sampleRate),d=buf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,2);n.buffer=buf;const f=actx.createBiquadFilter();f.type='highpass';f.frequency.value=800;const ng=actx.createGain();ng.gain.setValueAtTime(.1,t);ng.gain.exponentialRampToValueAtTime(.0001,t+.12);n.connect(f).connect(ng).connect(actx.destination);n.start(t);}catch(err){}}
function onHit(){smashHits++;smashShake=reduced.matches?.05:.13;const s=selected,origin=new THREE.Vector3(s.x,.7,s.z+.08),dir=aisleDirOf(s),next=breakables.find(b=>!b.flown);if(next)flyPart(next,dir);burst(origin,next?22:12,next?1:.55);thwack();}
function trySwing(){if(!smash||smashP<.92||swing)return false;swing={start:performance.now(),dur:reduced.matches?280:640,impactAt:reduced.matches?.5:.52,hit:false};return true;}
function syncSmashUI(){document.body.classList.toggle('smash',smash);$('smash').textContent=smash?'Back':'f**k it';$('smash').setAttribute('aria-pressed',String(!!smash));$('smash').setAttribute('aria-label',smash?'Back and restore the suite':'Have at the selected suite');$('continue').hidden=!!smash;if(smash){$('mode-label').textContent='03 / HAVE AT IT';$('look').textContent='Click or tap to swing · Back restores the suite';}else if(!pov)$('mode-label').textContent='01 / PICK YOUR SUITE';}
function enterSmash(){if(!renderer||transition||pov||smash||smashTrans)return;if(selected.bedOn){selected.bedOn=false;selected.bedP=0;applyPose(selected);syncToggles();}lookX=lookY=0;smash=true;smashHits=0;smashShake=0;autoSwing=true;if(!batter)batter=makeBatter();breakables=snapshotParts(selected);placeBatter(selected);aimSmash(selected);syncSmashUI();smashTrans={from:smashP,to:1,start:performance.now(),duration:reduced.matches?1:1300};}
function exitSmash(){if(!smash&&smashP===0)return;if(smashTrans&&smashTrans.to===0)return;restoreParts();if(batter)batter.visible=false;swing=null;autoSwing=false;smashHits=0;smashShake=0;smash=false;syncSmashUI();smashTrans={from:smashP,to:0,start:performance.now(),duration:reduced.matches?1:1100};}
function integrateSmash(now,dt){if(smashTrans){const t=Math.min(1,(now-smashTrans.start)/smashTrans.duration);smashP=THREE.MathUtils.lerp(smashTrans.from,smashTrans.to,smooth(t));if(t===1){const to=smashTrans.to;smashTrans=null;if(to===1&&autoSwing){autoSwing=false;trySwing();}}}if(batter&&smashP>0){batter.scale.setScalar(smooth(Math.min(1,smashP*1.4)));batter.visible=smashP>.04;}if(swing){const t=Math.min(1,(now-swing.start)/swing.dur);poseSwing(t);if(!swing.hit&&t>=swing.impactAt){swing.hit=true;onHit();}if(t>=1){swing=null;restSwing();}}const grav=9.6;for(const b of breakables){if(!b.flown||!b.vel)continue;b.vel.y-=grav*dt;b.mesh.position.addScaledVector(b.vel,dt);b.mesh.rotateX(b.ang.x*dt);b.mesh.rotateY(b.ang.y*dt);b.mesh.rotateZ(b.ang.z*dt);if(b.mesh.position.y<.08){b.mesh.position.y=.08;b.vel.y*=-0.28;b.vel.x*=0.62;b.vel.z*=0.62;b.ang.multiplyScalar(.6);if(b.vel.lengthSq()<.15){b.vel.set(0,0,0);b.ang.set(0,0,0);}}}for(let i=sparks.length-1;i>=0;i--){const p=sparks[i];p.age+=dt;p.vel.y-=grav*dt;p.mesh.position.addScaledVector(p.vel,dt);p.mesh.rotation.x+=p.ang.x*dt;p.mesh.rotation.y+=p.ang.y*dt;const k=Math.max(0,1-p.age/p.life);p.mesh.material.opacity=k;if(p.mesh.position.y<.03){p.mesh.position.y=.03;p.vel.y*=-0.2;p.vel.x*=0.5;p.vel.z*=0.5;}if(p.age>=p.life){scene.remove(p.mesh);p.mesh.geometry.dispose();p.mesh.material.dispose();sparks.splice(i,1);}}smashShake=smashShake>0.001?smashShake*Math.exp(-8*dt):0;}
$('smash').onclick=()=>{if(smash||smashP>0)exitSmash();else enterSmash();};
const selColor=new THREE.Color(0xb9ffc6),baseColor=new THREE.Color(0xcbcbc7),compColor=new THREE.Color(0xd8e39a),tmp=new THREE.Color();
function frame(now){requestAnimationFrame(frame);const dt=Math.min(.05,(now-(lastFrame||now))/1000);lastFrame=now;for(const tw of tweens){const t=Math.min(1,(now-tw.start)/tw.dur);tw.obj[tw.key]=THREE.MathUtils.lerp(tw.from,tw.to,smooth(t));if(t===1){tweens.delete(tw);delete tw.obj._tw[tw.key];}if(tw.obj.rig)applyPose(tw.obj);else for(const [row,d] of pairs)if(d===tw.obj)applyDivider(row);}if(transition){const t=Math.min(1,(now-transition.start)/transition.duration);progress=THREE.MathUtils.lerp(transition.from,transition.to,smooth(t));if(t===1)transition=null;}integrateSmash(now,dt);
 const p=progress,portrait=width/height<1,Rd=(portrait?42:21)*orbit.zoom;camera.setViewOffset(width,height,0,-(1-p)*height*(portrait?.1:.09)*(1-smashP),width,height);
 startPos.set(center.x+Rd*Math.sin(orbit.phi)*Math.cos(orbit.theta),Rd*Math.cos(orbit.phi),center.z+Rd*Math.sin(orbit.phi)*Math.sin(orbit.theta));
 const bp=selected.bedP;endPos.set(selected.x,THREE.MathUtils.lerp(1.16,.76,bp),selected.z+THREE.MathUtils.lerp(.06,.3,bp)+selected.rig.rig.position.z*0);camera.position.lerpVectors(startPos,endPos,p);camera.position.y+=Math.sin(p*Math.PI)*1.6;
 const yaw=lookX+(selected.window&&!pov&&p<1?0:0);const pitch=THREE.MathUtils.lerp(-.27,.2,bp)+lookY;povTarget.set(endPos.x-Math.sin(yaw)*3,endPos.y+pitch*3,endPos.z-Math.cos(yaw)*3);
 target.lerpVectors(center,povTarget,p);camera.up.set(0,1,0);camera.lookAt(target);
 const sm=smashP;if(sm>0){aimSmash(selected);camera.position.lerp(smashCam,sm);target.lerp(smashLook,sm);camera.lookAt(target);if(smashShake>0){camera.position.x+=Math.sin(now*.061)*smashShake;camera.position.y+=Math.cos(now*.053)*smashShake*.7;camera.position.z+=Math.sin(now*.047)*smashShake*.5;}}
 camera.fov=THREE.MathUtils.lerp(THREE.MathUtils.lerp(portrait?50:45,portrait?78:68,p),portrait?72:64,sm);camera.updateProjectionMatrix();
 overhead.visible=p>.4||sm>.35;
 const fade=Math.max(p,sm);for(const s of seats){for(const h of s.hide)h.visible=!(p>.9&&s===selected);const tint=s===selected?selColor:(!s.window&&s.comp)?compColor:null;s.material.color.copy(leatherBase);s.backMat.color.copy(white3);if(tint&&fade<1){const k=s===selected?1:.45;s.material.color.lerp(tint,(1-fade)*.8*k);s.backMat.color.lerp(tint,(1-fade)*.55*k);}
  if(fade<.01){const q=new THREE.Vector3(s.x,1.45,s.z).project(camera);s.button.style.left=(q.x*.5+.5)*width+'px';s.button.style.top=(-q.y*.5+.5)*height+'px';const size=Math.max(14,Math.min(30,width/34));s.button.style.width=s.button.style.height=size+'px';}s.button.hidden=fade>.01;}
 $('seats').style.opacity=1-fade;renderer.render(scene,camera);}
requestAnimationFrame(frame);
window.__seatscope={seats:seats.map(({id,x,z,type})=>({id,x,z,type})),getState:()=>({selected:selected.id,pov,progress,transitioning:!!transition,smash,smashP,hits:smashHits,swinging:!!swing}),smash:()=>enterSmash(),swing:()=>trySwing(),exitSmash:()=>exitSmash(),poseSwing:(t)=>{swing=null;poseSwing(t);},debugSmash:()=>batter&&({cam:camera.position.toArray(),look:smashLook.toArray(),char:batter.position.toArray(),vis:batter.visible,scale:batter.scale.x,wall:aisleWallX(selected),dir:aisleDirOf(selected),seat:[selected.x,selected.z],doorZ:selected.z-.22}),choose:id=>{const s=seats.find(s=>s.id===id);if(s)choose(s);},enter:id=>{const s=seats.find(s=>s.id===id);enterSeat(s);},bed:(id,on)=>{const s=seats.find(s=>s.id===id);if(s){setBed(s,on);update();}},divider:(row,up)=>{(window.__pairUp=window.__pairUp||{})[row]=up;setDivider(row,up);update();},dividerState:row=>{const d=pairs.get(row);return d&&{p:d.p,up:d.up};},look:(x,y=0)=>{lookX=x;lookY=y;},bedState:id=>seats.find(s=>s.id===id).bedP,focus:(id,zoom=.3,phi=.75,theta=.6)=>{const s=seats.find(s=>s.id===id);if(s)center.set(s.x,.4,s.z);else center.copy(homeCenter);Object.assign(orbit,{zoom,phi,theta});}};
}
