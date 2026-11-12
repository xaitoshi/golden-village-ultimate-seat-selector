// Seatwise · Study 04, unofficial fan concept of the Starbucks cafe at Bugis Junction.
// Not affiliated with or endorsed by Starbucks, Maxim's Caterers, CapitaLand or Bugis Junction.
import * as THREE from 'three';
import model from './bugis-model.cjs';
const {seats,info,smooth,occupancy,takenIds,closeHour,OPEN,STEP,steps,hourFromStep,formatHour,hash}=model;

const world=document.getElementById('world');
const fallback=document.getElementById('fallback');
const fallbackSeats=document.getElementById('fallback-seats');
const seatLayer=document.getElementById('seats');
const modeLabel=document.getElementById('mode-label');
const lookHint=document.getElementById('look');
const nameEl=document.getElementById('seat-name');
const typeEl=document.getElementById('stype');
const zoneEl=document.getElementById('szone');
const featEl=document.getElementById('sfeature');
const goBtn=document.getElementById('continue');
const availEl=document.getElementById('avail');
const clockEl=document.getElementById('clock');
const clockLabel=document.getElementById('clock-label');
const playBtn=document.getElementById('play');
const weekdayBtn=document.getElementById('weekday');
const weekendBtn=document.getElementById('weekend');
const mini=document.getElementById('mini');
const mg=mini.getContext('2d');

let weekend=false, step=18, hour=hourFromStep(step), playing=false, playAcc=0;
let sel=seats.find(s=>s.id==='SW2A')||seats[0];
let pov=false, transitioning=false, lookMode=false;
let yaw=Math.PI+0.58, pitch=1.05, dist=16.8;
const target=new THREE.Vector3(2.1,0.15,3.15);
const look=new THREE.Vector3();
const eye=new THREE.Vector3();
const tmp=new THREE.Vector3();
let taken=new Set();
const people=new Map();
const fans=[];
const marks=[];
const hits=[];

function resizeClock(){
  const n=steps(weekend);
  clockEl.max=String(n);
  if(step>n){step=n;hour=hourFromStep(step);}
  clockEl.value=String(step);
}


const planCanvas=document.getElementById('plan-canvas');
const planAvail=document.getElementById('plan-avail');
const planOpen=document.getElementById('plan-open');
const planClose=document.getElementById('plan-close');
const planEl=document.getElementById('plan');
const XMIN=-4.6,XMAX=8.8,ZMIN=-4.6,ZMAX=10.8;

function layoutPlan(){
  if(!planCanvas)return null;
  const cssW=planCanvas.clientWidth||270;
  const cssH=Math.max(180, planCanvas.clientHeight||Math.round(cssW*(15/13)));
  const dpr=Math.min(2, window.devicePixelRatio||1);
  const W=Math.round(cssW*dpr), H=Math.round(cssH*dpr);
  if(planCanvas.width!==W||planCanvas.height!==H){planCanvas.width=W;planCanvas.height=H;}
  const pad=28*dpr;
  const aw=W-pad*2, ah=H-pad*2;
  const to=(x,z)=>({
    x: pad+(x-XMIN)/(XMAX-XMIN)*aw,
    y: pad+(ZMAX-z)/(ZMAX-ZMIN)*ah
  });
  return {W,H,dpr,pad,to,g:planCanvas.getContext('2d')};
}
function poly(g,pts,fill,stroke,lw){
  g.beginPath();
  pts.forEach((p,i)=>i?g.lineTo(p.x,p.y):g.moveTo(p.x,p.y));
  g.closePath();
  if(fill){g.fillStyle=fill;g.fill();}
  if(stroke){g.strokeStyle=stroke;g.lineWidth=lw||1;g.stroke();}
}
function label(g,dpr,text,x,y,color){
  g.fillStyle=color||'#c5cdc8';
  g.font=`600 ${Math.max(9,10*dpr)}px Arial,sans-serif`;
  g.textAlign='center';g.textBaseline='middle';
  g.fillText(text,x,y);
}
function drawPlan(){
  const L=layoutPlan();if(!L)return;
  const {g,dpr,to,W,H}=L;
  g.clearRect(0,0,W,H);
  g.fillStyle='#121518';g.fillRect(0,0,W,H);
  // Terrace L (front arcade + side arcade)
  const terr=[to(-4.4,-4.4),to(8.6,-4.4),to(8.6,0),to(0,0),to(0,10.6),to(-4.4,10.6)];
  poly(g,terr,'#3c3c39','#2a2a28',1);
  // Interior floor
  poly(g,[to(0,0),to(8.4,0),to(8.4,10.5),to(0,10.5)],'#cbb89a','#8a7358',1*dpr);
  // Glass shopfront
  g.strokeStyle='#9eb8c4';g.lineWidth=2*dpr;g.beginPath();
  const a=to(0,10.5),b=to(0,0),c=to(8.4,0);
  g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);g.lineTo(c.x,c.y);g.stroke();
  // Counter
  poly(g,[to(0.4,9.35),to(7.8,9.35),to(7.8,10.5),to(0.4,10.5)],'#3d2a1c','#2a1c12',1);
  // Communal table
  poly(g,[to(2.28,3.55),to(3.52,3.55),to(3.52,6.75),to(2.28,6.75)],'#6a4a2e','#4a321c',1);
  // Merch block
  poly(g,[to(4.7,7.85),to(6.5,7.85),to(6.5,8.45),to(4.7,8.45)],'#2a2a2a',null,1);
  // Zone labels
  const tc=to(4.1,9.92), tcomm=to(2.9,5.15), twin=to(0.72,7.35), tins=to(5.55,6.55), tft=to(4.0,-2.15), tst=to(-2.2,5.5);
  label(g,dpr,'Counter',tc.x,tc.y,'#e8d5b5');
  label(g,dpr,'Inside',tins.x,tins.y,'#3a2e22');
  label(g,dpr,'Communal',tcomm.x,tcomm.y-6*dpr,'#f0e4d0');
  label(g,dpr,'table',tcomm.x,tcomm.y+6*dpr,'#f0e4d0');
  label(g,dpr,'Window',twin.x,twin.y,'#3a2e22');
  label(g,dpr,'Terrace',tft.x,tft.y,'#d4d4ce');
  label(g,dpr,'Terrace',tst.x,tst.y,'#d4d4ce');
  // Seats
  const r=6.2*dpr;
  seats.forEach(s=>{
    const p=to(s.x,s.z);
    const isTaken=taken.has(s.id), isSel=sel&&sel.id===s.id;
    g.beginPath();g.arc(p.x,p.y,isSel?r+1.2*dpr:r,0,Math.PI*2);
    g.fillStyle=isSel?(isTaken?'#ff7a6e':'#b9ffc6'):(isTaken?'#d45a4c':'#7ed98a');
    g.fill();
    if(isSel){g.strokeStyle='#ffffff';g.lineWidth=2.2*dpr;g.stroke();}
  });
  const free=seats.length-taken.size;
  if(planAvail)planAvail.textContent=free+' of '+seats.length+' seats available';
}
function seatAtPlan(ev){
  const L=layoutPlan();if(!L)return null;
  const rect=planCanvas.getBoundingClientRect();
  const x=(ev.clientX-rect.left)*(L.W/rect.width);
  const y=(ev.clientY-rect.top)*(L.H/rect.height);
  let best=null,bestD=Infinity;
  const max=(8.2*L.dpr)*(8.2*L.dpr);
  seats.forEach(s=>{
    const p=L.to(s.x,s.z);
    const d=(p.x-x)*(p.x-x)+(p.y-y)*(p.y-y);
    if(d<bestD){bestD=d;best=s;}
  });
  return bestD<=max?best:null;
}
function openPlan(){document.body.classList.add('map');if(planOpen)planOpen.setAttribute('aria-expanded','true');drawPlan();}
function closePlan(){document.body.classList.remove('map');if(planOpen)planOpen.setAttribute('aria-expanded','false');}

if(planCanvas){
  planCanvas.addEventListener('click',ev=>{
    const s=seatAtPlan(ev);if(!s)return;
    if(window.__seatscope&&window.__seatscope.choose)window.__seatscope.choose(s.id);
    else {sel=s;drawPlan();}
  });
  planCanvas.addEventListener('pointermove',ev=>{
    planCanvas.style.cursor=seatAtPlan(ev)?'pointer':'default';
  });
}
if(planOpen)planOpen.addEventListener('click',openPlan);
if(planClose)planClose.addEventListener('click',closePlan);
addEventListener('keydown',e=>{if(e.key==='Escape'&&document.body.classList.contains('map'))closePlan();});

const renderer=(()=>{try{const r=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});r.setPixelRatio(Math.min(devicePixelRatio,2));r.shadowMap.enabled=true;r.shadowMap.type=THREE.PCFSoftShadowMap;r.outputColorSpace=THREE.SRGBColorSpace;r.toneMapping=THREE.ACESFilmicToneMapping;r.toneMappingExposure=1.05;return r;}catch(e){fallback.style.display='block';world.style.display='none';return null;}})();
if(!renderer){buildFallback();}
else start();

function buildFallback(){
  seats.forEach(s=>{const b=document.createElement('button');b.textContent=s.id+' · '+s.type;b.addEventListener('click',()=>choose(s.id));fallbackSeats.appendChild(b);});
  choose(sel.id);
}

function tex(draw,w=512,h=512,repeatX=1,repeatY=1){
  const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(repeatX,repeatY);t.anisotropy=4;return t;
}
function box(mat,w,h,d,x,y,z,rx=0,ry=0,rz=0){
  const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
  m.position.set(x,y,z);m.rotation.set(rx,ry,rz);m.castShadow=true;m.receiveShadow=true;return m;
}
function cyl(mat,rt,rb,h,x,y,z,rx=0,seg=16){
  const m=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,seg),mat);
  m.position.set(x,y,z);m.rotation.x=rx;m.castShadow=true;m.receiveShadow=true;return m;
}

function start(){
  const scene=new THREE.Scene();
  scene.background=new THREE.Color(0x8fa0a8);
  scene.fog=new THREE.Fog(0x8fa0a8,28,55);
  const camera=new THREE.PerspectiveCamera(50,1,.08,80);
  world.appendChild(renderer.domElement);

  const oak=tex((g,w,h)=>{
    g.fillStyle='#d4b894';g.fillRect(0,0,w,h);
    for(let i=0;i<16;i++){
      const y=i*(h/16);
      g.fillStyle=`rgb(${210+(i%5)*6},${175+(i%7)*4},${130+(i%3)*6})`;
      g.fillRect(0,y,w,h/16-2);
      g.strokeStyle='rgba(80,50,20,0.18)';g.beginPath();g.moveTo(0,y);g.lineTo(w,y);g.stroke();
      for(let k=0;k<8;k++){g.strokeStyle='rgba(90,55,20,0.08)';g.beginPath();g.moveTo(k*80+(i*13)%40,y+2);g.lineTo(k*80+40,y+h/16-3);g.stroke();}
    }
  },512,512,4,5);
  const wallWood=tex((g,w,h)=>{
    g.fillStyle='#8a5a32';g.fillRect(0,0,w,h);
    for(let i=0;i<10;i++){
      const x=i*(w/10);
      g.fillStyle=`rgb(${130+(i%4)*8},${80+(i%5)*6},${40+(i%3)*6})`;
      g.fillRect(x,0,w/10-3,h);
      g.strokeStyle='rgba(40,20,8,0.25)';g.beginPath();g.moveTo(x,0);g.lineTo(x,h);g.stroke();
    }
  },512,512,6,2);
  const marble=tex((g,w,h)=>{
    g.fillStyle='#f4f1ea';g.fillRect(0,0,w,h);
    g.strokeStyle='rgba(140,140,140,0.35)';
    for(let i=0;i<18;i++){g.beginPath();g.moveTo(hash('m'+i)*w,hash('n'+i)*h);for(let k=0;k<5;k++)g.lineTo(hash('m'+i+k)*w,hash('n'+i+k)*h);g.stroke();}
  },256,256,1,1);
  const granite=tex((g,w,h)=>{
    g.fillStyle='#7a7a76';g.fillRect(0,0,w,h);
    for(let i=0;i<900;i++){g.fillStyle=`rgba(${100+hash('g'+i)*80},${100+hash('h'+i)*80},${95+hash('i'+i)*70},${0.35})`;g.fillRect(hash('x'+i)*w,hash('y'+i)*h,2+hash('s'+i)*3,2);}
  },256,256,8,8);
  const darkWood=tex((g,w,h)=>{
    g.fillStyle='#3a2416';g.fillRect(0,0,w,h);
    for(let i=0;i<12;i++){g.fillStyle=`rgba(20,10,5,${0.15+i%3*0.05})`;g.fillRect(0,i*h/12,w,h/12-2);}
  },256,256,2,1);

  const matFloor=new THREE.MeshStandardMaterial({map:oak,roughness:.55,metalness:.02});
  const matWallW=new THREE.MeshStandardMaterial({map:wallWood,roughness:.7,metalness:0});
  const matCeil=new THREE.MeshStandardMaterial({color:0x1c1a18,roughness:.9});
  const matPlaster=new THREE.MeshStandardMaterial({color:0xe8e0d4,roughness:.85});
  const matBlack=new THREE.MeshStandardMaterial({color:0x161616,roughness:.4,metalness:.3});
  const matGlass=new THREE.MeshPhysicalMaterial({color:0x9eb8c4,transparent:true,opacity:.22,roughness:.05,metalness:.1,transmission:.6,thickness:.02,side:THREE.DoubleSide});
  const matGranite=new THREE.MeshStandardMaterial({map:granite,roughness:.75});
  const matBeam=new THREE.MeshStandardMaterial({map:darkWood,roughness:.7});
  const matOlive=new THREE.MeshStandardMaterial({color:0x6b6a4a,roughness:.7});
  const matCushion=new THREE.MeshStandardMaterial({color:0x7a784c,roughness:.65});
  const matLeg=new THREE.MeshStandardMaterial({color:0x2a2118,roughness:.5});
  const matMarble=new THREE.MeshStandardMaterial({map:marble,roughness:.3,metalness:.05});
  const matDarkTable=new THREE.MeshStandardMaterial({color:0x2b241f,roughness:.45});
  const matComm=new THREE.MeshStandardMaterial({map:darkWood,color:0x7a5a38,roughness:.5});
  const matBlackChair=new THREE.MeshStandardMaterial({color:0x1a1a1a,roughness:.45,metalness:.2});
  const matCounter=new THREE.MeshStandardMaterial({color:0x3d2a1c,roughness:.55});
  const matPastry=new THREE.MeshStandardMaterial({color:0x1a1a1a,roughness:.3,metalness:.4});
  const matGreen=new THREE.MeshStandardMaterial({color:0x1f3d2a,roughness:.6});
  const matFridge=new THREE.MeshStandardMaterial({color:0xd8dde0,roughness:.3,metalness:.4});
  const matBottle=[0xc45a4a,0x3d6b4f,0xf0d48a,0x6a8cbf].map(c=>new THREE.MeshStandardMaterial({color:c,roughness:.3,metalness:.2}));

  const shop=new THREE.Group();scene.add(shop);
  shop.add(box(matFloor,8.4,.06,10.5,4.2,-0.03,5.25));
  const ceilMesh=new THREE.Mesh(new THREE.PlaneGeometry(8.4,10.5),matCeil);
  ceilMesh.rotation.x=Math.PI/2;ceilMesh.position.set(4.2,3.16,5.25);ceilMesh.receiveShadow=true;ceilMesh.visible=false;shop.add(ceilMesh);
  shop.add(box(matWallW,.18,3.2,10.5,8.49,1.6,5.25));
  shop.add(box(matPlaster,8.4,3.2,.18,4.2,1.6,10.59));
  // back corner fill at +x / +z already have walls

  // Black framed glass on x=0 and z=0, with a corner entrance opening
  function mullion(x,y,z,w,h,d){shop.add(box(matBlack,w,h,d,x,y,z));}
  // Front glass (z=0) from x=1.7 to 8.4 (door 0-1.7)
  const glassF=box(matGlass,6.5,2.85,.04,5.05,1.55,-0.02);glassF.castShadow=false;shop.add(glassF);
  mullion(5.05,0.08,0,6.5,.16,.08);mullion(5.05,3.05,0,6.5,.16,.08);
  for(let i=0;i<5;i++)mullion(1.7+i*1.67,1.55,0,.07,2.9,.08);
  // Side glass (x=0) from z=1.7 to 10.5
  const glassS=box(matGlass,.04,2.85,8.6,-0.02,1.55,6.0);glassS.castShadow=false;shop.add(glassS);
  mullion(0,0.08,6.0,.08,.16,8.6);mullion(0,3.05,6.0,.08,.16,8.6);
  for(let i=0;i<6;i++)mullion(0,1.55,1.7+i*1.76,.08,2.9,.07);
  // Door frame at the corner
  mullion(0.85,1.55,0,.07,3.1,.08);mullion(0,1.55,0.85,.08,3.1,.07);
  // Threshold
  shop.add(box(matBlack,1.8,.04,1.8,0.7,0.01,0.7));

  // Track lighting
  for(let z=1.6;z<=9.2;z+=2.4){
    shop.add(box(matBlack,.04,.05,9.6,2.2,3.08,z));
    shop.add(box(matBlack,.04,.05,9.6,5.8,3.08,z));
    for(let x of [2.2,5.8])for(let k=0;k<4;k++){
      const spot=cyl(matBlack,.04,.05,.08,x,3.02,z-3.6+k*2.4);
      shop.add(spot);
      const l=new THREE.PointLight(0xffe2bc,1.4,6,2);l.position.set(x,2.95,z-3.6+k*2.4);scene.add(l);
    }
  }

  // Counter, pastry case, menu boards
  const counter=box(matCounter,7.4,1.05,1.15,4.0,0.52,9.85);shop.add(counter);
  shop.add(box(matBlack,7.4,.04,1.15,4.0,1.07,9.85));
  const pastry=box(matPastry,2.1,1.15,.7,1.5,1.15,9.15);shop.add(pastry);
  const glassCase=box(new THREE.MeshPhysicalMaterial({color:0xccdde6,transparent:true,opacity:.28,roughness:.1}),2.0,.7,.6,1.5,1.75,9.15);glassCase.castShadow=false;shop.add(glassCase);
  // cakes
  [0,1,2].forEach(i=>{const cake=cyl(new THREE.MeshStandardMaterial({color:[0xc48a6a,0xf2e6c9,0x5a2e24][i],roughness:.6}),.14,.14,.1,1.05+i*.4,1.28,9.15,0,12);shop.add(cake);});
  // espresso machine block
  shop.add(box(matBlack,1.3,.7,.55,4.3,1.42,9.7));
  shop.add(box(matBlack,.3,.35,.3,3.85,1.92,9.7));
  // menu boards (no logo)
  shop.add(box(matGreen,2.6,.9,.04,5.8,2.35,10.48));
  shop.add(box(matGreen,2.2,.9,.04,3.0,2.35,10.48));
  const board=makeText('MENU','#d8e6d4',256,64);const bm=new THREE.Mesh(new THREE.PlaneGeometry(1.4,.28),new THREE.MeshBasicMaterial({map:board,transparent:true}));bm.position.set(5.8,2.35,10.45);bm.rotation.y=Math.PI;shop.add(bm);
  // simple STARBUCKS word on wood wall, no siren
  const word=makeText('STARBUCKS','#e8d5b5',512,64);
  const wm=new THREE.Mesh(new THREE.PlaneGeometry(2.2,.28),new THREE.MeshBasicMaterial({map:word,transparent:true}));
  wm.position.set(8.39,2.55,8.6);wm.rotation.y=-Math.PI/2;shop.add(wm);
  const unit=makeText('unit 01 106','#d2c2a6',256,48);
  const um=new THREE.Mesh(new THREE.PlaneGeometry(.9,.16),new THREE.MeshBasicMaterial({map:unit,transparent:true}));
  um.position.set(8.39,2.28,8.6);um.rotation.y=-Math.PI/2;shop.add(um);

  // Merch shelves + fridge mid store
  const merch=box(matBlack,1.6,1.7,.45,5.6,0.85,8.15);shop.add(merch);
  for(let y=0.45;y<=1.5;y+=.35)shop.add(box(matBlack,1.55,.03,.42,5.6,y,8.15));
  for(let row=0;row<4;row++)for(let col=0;col<5;col++){
    const jar=cyl(matBottle[(row+col)%matBottle.length],.06,.06,.14,5.05+col*.26,.55+row*.35,8.15,0,8);
    shop.add(jar);
  }
  const fridge=box(matFridge,.8,1.7,.55,4.35,0.85,8.15);shop.add(fridge);
  const fglass=box(new THREE.MeshPhysicalMaterial({color:0x9ad0e0,transparent:true,opacity:.3,roughness:.1}),.7,1.45,.02,4.35,0.9,7.87);fglass.castShadow=false;shop.add(fglass);
  for(let r=0;r<5;r++)for(let c=0;c<2;c++)shop.add(box(matBottle[(r+c)%4],.12,.2,.1,4.2+c*.28,.4+r*.28,8.05));

  // Outdoor arcade
  const arcade=new THREE.Group();scene.add(arcade);
  // L shaped granite floor
  arcade.add(box(matGranite,13.6,.05,4.4,2.0,-0.025,-2.2));
  arcade.add(box(matGranite,4.4,.05,15.2,-2.2,-0.025,3.3));
  // Covered arcade roof: kept as a shade, faded when the orbit camera is high so outdoor seats stay readable
  const matRoof=new THREE.MeshStandardMaterial({map:darkWood,roughness:.7,transparent:true,opacity:.78,depthWrite:false,side:THREE.DoubleSide});
  const matBeamFade=new THREE.MeshStandardMaterial({map:darkWood,roughness:.7,transparent:true,opacity:.95,depthWrite:true});
  const roofPlanes=[];
  {const a=new THREE.Mesh(new THREE.PlaneGeometry(13.6,4.6),matRoof);a.rotation.x=Math.PI/2;a.position.set(2.0,3.36,-2.2);a.receiveShadow=true;arcade.add(a);roofPlanes.push(a);
   const b=new THREE.Mesh(new THREE.PlaneGeometry(4.6,15.2),matRoof);b.rotation.x=Math.PI/2;b.position.set(-2.2,3.36,3.3);b.receiveShadow=true;arcade.add(b);roofPlanes.push(b);}
  const roofBeams=[];
  for(let x=-1.5;x<=8.4;x+=1.6){const m=box(matBeamFade,.16,.22,4.4,x,3.28,-2.2);arcade.add(m);roofBeams.push(m);}
  for(let z=-1.5;z<=10.4;z+=1.6){const m=box(matBeamFade,4.4,.22,.16,-2.2,3.28,z);arcade.add(m);roofBeams.push(m);}
  // Pillars
  [[-0.2,-0.2],[-4.1,-0.2],[8.4,-0.2],[-0.2,-4.1],[4.2,-4.1],[8.4,-4.1],[-4.1,3.5],[-4.1,7.5],[-4.1,10.4]].forEach(([x,z])=>{
    arcade.add(box(matPlaster,.28,3.4,.28,x,1.7,z));
  });
  // Ceiling fans
  function fan(x,z){
    const g=new THREE.Group();g.position.set(x,3.15,z);
    g.add(cyl(matBlack,.04,.04,.25,0,0.1,0));
    const blades=new THREE.Group();
    for(let i=0;i<3;i++){const b=box(matBlack,1.15,.02,.12,0.5,0,0);b.rotation.y=i*Math.PI*2/3;blades.add(b);}
    blades.rotation.y=0.35;g.add(blades);arcade.add(g);
  }
  fan(2.0,-2.0);fan(6.2,-2.0);fan(-2.0,2.2);fan(-2.0,6.5);
  // Neighbouring generic shop volumes so the corner reads as a mall
  arcade.add(box(matPlaster,6,3.2,1.2,11.2,1.6,-0.6));
  arcade.add(box(matPlaster,1.2,3.2,8, -0.6,1.6,14.2));
  // Mall floor beyond
  scene.add(box(matGranite,22,.04,22,3,-0.04,3));

  // Furniture: marble tables for armchair pairs
  const tables=new Map();
  seats.forEach(s=>{
    if((s.kind==='armchair') && !tables.has(s.table)){
      tables.set(s.table,true);
      const cx=seats.filter(t=>t.table===s.table).reduce((a,t)=>a+t.x,0)/2;
      const cz=seats.filter(t=>t.table===s.table).reduce((a,t)=>a+t.z,0)/2;
      const tab=cyl(matMarble,.34,.34,.05,cx,0.70,cz,0,24);
      shop.add(tab);
      shop.add(cyl(matLeg,.05,.07,.68,cx,0.34,cz,0,12));
    }
  });
  // Communal table
  shop.add(box(matComm,1.25,.08,3.15,2.9,0.86,5.15));
  shop.add(box(matLeg,.08,.82,.08,2.4,0.41,3.75));
  shop.add(box(matLeg,.08,.82,.08,3.4,0.41,3.75));
  shop.add(box(matLeg,.08,.82,.08,2.4,0.41,6.55));
  shop.add(box(matLeg,.08,.82,.08,3.4,0.41,6.55));
  // Terrace tables
  const terrTables=new Set();
  seats.forEach(s=>{
    if(s.kind==='terrace' && !terrTables.has(s.table)){
      terrTables.add(s.table);
      const r=s.tn===4?.42:.32;
      arcade.add(cyl(matDarkTable,r,r,.05,s.tx,0.72,s.tz,0,20));
      arcade.add(cyl(matBlack,.04,.05,.70,s.tx,0.35,s.tz,0,10));
    }
  });

  // Build chairs + marks + people anchors
  seats.forEach(s=>{
    const g=new THREE.Group();g.position.set(s.x,0,s.z);g.rotation.y=s.yaw;g.userData.seat=s;
    let mark;
    if(s.kind==='armchair'){
      // khaki armchair: seat, back, arms, legs
      const seat=box(matOlive.clone(),.52,.1,.5,0,.42,0);g.add(seat);
      const back=box(matCushion.clone(),.52,.5,.1,0,.72,-.22);g.add(back);
      g.add(box(matOlive.clone(),.08,.28,.5,-.27,.52,0));
      g.add(box(matOlive.clone(),.08,.28,.5,.27,.52,0));
      [[-.2,.16,-.18],[.2,.16,-.18],[-.2,.16,.18],[.2,.16,.18]].forEach(([x,y,z])=>g.add(box(matLeg,.05,.32,.05,x,y,z)));
      mark=seat;
    }else if(s.kind==='communal'){
      const seat=box(matBlackChair.clone(),.42,.05,.42,0,.46,0);g.add(seat);
      g.add(box(matBlackChair.clone(),.42,.4,.05,0,.68,-.18));
      [[-.16,.23,-.16],[.16,.23,-.16],[-.16,.23,.16],[.16,.23,.16]].forEach(([x,y,z])=>g.add(cyl(matBlackChair,.015,.015,.46,x,y,z,0,8)));
      mark=seat;
    }else{
      // black metal bistro
      const seat=cyl(matBlackChair.clone(),.2,.2,.03,0,.45,0,0,16);g.add(seat);
      g.add(cyl(matBlackChair.clone(),.2,.2,.02,0,.82,-.02,0,16));
      // back posts
      g.add(box(matBlackChair.clone(),.02,.38,.02,-.12,.66,-.16));
      g.add(box(matBlackChair.clone(),.02,.38,.02,.12,.66,-.16));
      [[-.14,.225,-.14],[.14,.225,-.14],[-.14,.225,.14],[.14,.225,.14]].forEach(([x,y,z])=>g.add(cyl(matBlackChair,.012,.012,.45,x,y,z,0,8)));
      mark=seat;
    }
    mark.userData.isMark=true;
    mark.userData.base=mark.material.color.clone();
    g.userData.mark=mark;
    (s.kind==='terrace'?arcade:shop).add(g);
    marks.push(g);

    const fig=makePerson(s);
    fig.visible=false;
    fig.position.set(s.x,0,s.z);
    fig.rotation.y=s.yaw;
    scene.add(fig);
    people.set(s.id,fig);
  });

  // Lights
  scene.add(new THREE.HemisphereLight(0xe8f0f6,0x4a3a28,0.7));
  const sun=new THREE.DirectionalLight(0xfff3dc,1.15);sun.position.set(-8,12,-10);sun.castShadow=true;
  sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.near=.5;sun.shadow.camera.far=40;
  sun.shadow.camera.left=-16;sun.shadow.camera.right=16;sun.shadow.camera.top=16;sun.shadow.camera.bottom=-16;
  scene.add(sun);
  const fill=new THREE.DirectionalLight(0xc9d8e8,.35);fill.position.set(10,6,8);scene.add(fill);
  const counterLight=new THREE.PointLight(0xffd8a0,2.2,7,2);counterLight.position.set(4.2,2.4,9.4);scene.add(counterLight);

  // Pickup raycast
  const ray=new THREE.Raycaster();
  const pointer=new THREE.Vector2();
  const canvas=renderer.domElement;
  let dragging=false,moved=false,lx=0,ly=0,lmx=0,lmy=0,downT=0;
  const view={yaw,pitch,dist};

  function applyCam(){
    const w=innerWidth,h=Math.max(1,innerHeight);
    camera.aspect=w/h;
    if(pov){
      camera.fov=w<768?70:60;
      camera.clearViewOffset();
    }else{
      // Keep a similar horizontal field of view on portrait and landscape, otherwise a tall phone crops to a sliver of the room.
      const desiredH=(w/h<1?76:70)*Math.PI/180;
      const vfov=2*Math.atan(Math.tan(desiredH/2)/Math.max(0.2,w/h))*180/Math.PI;
      camera.fov=Math.max(42,Math.min(112,vfov));
      if(w/h<1)camera.setViewOffset(w,h,0,Math.round(h*0.12),w,h);
      else camera.clearViewOffset();
    }
    camera.updateProjectionMatrix();
    renderer.setSize(w,h);
    // Dollhouse orbit: no interior ceiling. Terrace roof stays, but fades when the camera is high.
    ceilMesh.visible=!!pov;
    const high=pov?0:Math.max(0,Math.min(1,(pitch-0.38)/0.75));
    matRoof.opacity=0.80-high*0.58;
    matRoof.depthWrite=matRoof.opacity>0.42;
    matBeamFade.opacity=0.98-high*0.45;
    if(pov && sel){
      const forward=new THREE.Vector3(Math.sin(sel.yaw),0,Math.cos(sel.yaw));
      eye.set(sel.x,sel.y+0.06,sel.z).addScaledVector(forward,-0.06);
      const at=eye.clone().addScaledVector(forward,1.35).add(new THREE.Vector3(0,-0.06,0));
      // look-around offset
      const right=new THREE.Vector3().crossVectors(forward,new THREE.Vector3(0,1,0)).normalize();
      const up=new THREE.Vector3(0,1,0);
      at.addScaledVector(right,lookMode?look.x:0).addScaledVector(up,lookMode?look.y:0);
      camera.position.copy(eye);
      camera.lookAt(at);
    }else{
      camera.position.set(
        target.x+Math.sin(yaw)*Math.cos(pitch)*dist,
        target.y+Math.sin(pitch)*dist,
        target.z+Math.cos(yaw)*Math.cos(pitch)*dist
      );
      camera.lookAt(target);
    }
  }

  function projectHits(){
    const w=innerWidth,h=innerHeight;
    seats.forEach((s,i)=>{
      tmp.set(s.x,s.seatY+.15,s.z).project(camera);
      const el=hits[i];if(!el)return;
      const on=tmp.z<1 && tmp.z>-1;
      el.style.left=((tmp.x*.5+.5)*w)+'px';
      el.style.top=((-tmp.y*.5+.5)*h)+'px';
      el.style.display=on&&!pov?'block':'none';
    });
  }

  function drawMini(){
    const w=mini.width,h=mini.height;
    mg.fillStyle='#121518';mg.fillRect(0,0,w,h);
    const sx=10, sy=8, ox=90, oz=70;
    seats.forEach(s=>{
      mg.fillStyle=taken.has(s.id)?'#d45a4c':(sel&&sel.id===s.id?'#b9ffc6':'#7ed98a');
      mg.beginPath();mg.arc(ox+s.x*sx,oz+s.z*sy,3,0,Math.PI*2);mg.fill();
    });
    if(sel){mg.strokeStyle='#fff';mg.lineWidth=1.4;mg.beginPath();mg.arc(ox+sel.x*sx,oz+sel.z*sy,5,0,Math.PI*2);mg.stroke();}
  }

  function pick(ev){
    const r=canvas.getBoundingClientRect();
    pointer.set(((ev.clientX-r.left)/r.width)*2-1,-((ev.clientY-r.top)/r.height)*2+1);
    ray.setFromCamera(pointer,camera);
    const objs=marks;const hits2=ray.intersectObjects(objs,true);
    if(!hits2.length)return null;
    let o=hits2[0].object;while(o&&!o.userData.seat)o=o.parent;
    return o&&o.userData.seat;
  }

  function onDown(ev){
    if(transitioning)return;
    dragging=true;moved=false;downT=performance.now();
    lx=lmx=('touches'in ev&&ev.touches[0]?ev.touches[0].clientX:ev.clientX);
    ly=lmy=('touches'in ev&&ev.touches[0]?ev.touches[0].clientY:ev.clientY);
  }
  function onMove(ev){
    if(!dragging)return;
    const x=('touches'in ev&&ev.touches[0]?ev.touches[0].clientX:ev.clientX);
    const y=('touches'in ev&&ev.touches[0]?ev.touches[0].clientY:ev.clientY);
    const dx=x-lx,dy=y-ly;lx=x;ly=y;
    if(Math.abs(x-lmx)+Math.abs(y-lmy)>6)moved=true;
    if(pov){
      lookMode=true;look.x=Math.max(-1.1,Math.min(1.1,look.x+dx*0.005));look.y=Math.max(-.6,Math.min(.6,look.y-dy*0.004));
    }else{
      yaw-=dx*0.005;pitch=Math.max(0.06,Math.min(1.25,pitch+dy*0.004));
    }
  }
  function onUp(ev){
    if(!dragging)return;dragging=false;
    const x=('changedTouches'in ev&&ev.changedTouches[0]?ev.changedTouches[0].clientX:ev.clientX);
    const y=('changedTouches'in ev&&ev.changedTouches[0]?ev.changedTouches[0].clientY:ev.clientY);
    const dt=performance.now()-downT;
    if(!moved&&dt<400){
      if(pov){/* tap does not exit */}
      else{
        const s=pick({clientX:x,clientY:y});if(s)choose(s.id);
      }
    }
  }
  function onDbl(ev){
    if(transitioning)return;
    if(pov){look.set(0,0,0);lookMode=false;return;}
    const s=pick(ev);if(s){choose(s.id);if(!taken.has(s.id))enterSeat();}
  }
  function onWheel(ev){if(pov||transitioning)return;ev.preventDefault();dist=Math.max(5,Math.min(28,dist+ev.deltaY*0.01));}
  canvas.addEventListener('pointerdown',onDown);
  window.addEventListener('pointermove',onMove);
  window.addEventListener('pointerup',onUp);
  canvas.addEventListener('dblclick',onDbl);
  canvas.addEventListener('wheel',onWheel,{passive:false});
  canvas.style.touchAction='none';

  // HTML hits
  seats.forEach(s=>{
    const b=document.createElement('button');b.className='seat-hit';b.type='button';b.title=s.id;b.setAttribute('aria-label','Seat '+s.id);
    b.addEventListener('click',()=>choose(s.id));
    b.addEventListener('dblclick',()=>{choose(s.id);if(!taken.has(s.id))enterSeat();});
    seatLayer.appendChild(b);hits.push(b);
  });

  goBtn.addEventListener('click',()=>{if(pov)exitSeat();else enterSeat();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(pov)exitSeat();}});

  clockEl.addEventListener('input',()=>{pause();step=+clockEl.value;hour=hourFromStep(step);applyCrowd();});
  playBtn.addEventListener('click',()=>{if(playing)pause();else play();});
  weekdayBtn.addEventListener('click',()=>setWeekend(false));
  weekendBtn.addEventListener('click',()=>setWeekend(true));

  let playTimer=null;
  function tickPlay(){
    if(!playing)return;
    step+=1;
    if(step>steps(weekend)){step=0;pause();return;}
    hour=hourFromStep(step);applyCrowd();
  }
  function play(){
    playing=true;playBtn.textContent='Pause';playBtn.setAttribute('aria-pressed','true');playBtn.setAttribute('aria-label','Pause the day');
    if(playTimer)clearInterval(playTimer);
    playTimer=setInterval(tickPlay,280);
  }
  function pause(){
    playing=false;playBtn.textContent='Play';playBtn.setAttribute('aria-pressed','false');playBtn.setAttribute('aria-label','Play the day');
    if(playTimer){clearInterval(playTimer);playTimer=null;}
  }

  function setWeekend(w){
    weekend=!!w;
    weekdayBtn.setAttribute('aria-pressed',String(!weekend));
    weekendBtn.setAttribute('aria-pressed',String(weekend));
    resizeClock();applyCrowd();
  }

  function applyCrowd(){
    taken=new Set(takenIds(hour,weekend));
    clockLabel.textContent=formatHour(hour);
    clockEl.value=String(step);
    const free=seats.length-taken.size;
    availEl.textContent=free+' of '+seats.length+' seats available';
    marks.forEach(g=>{
      const s=g.userData.seat, mark=g.userData.mark, isTaken=taken.has(s.id), isSel=sel&&sel.id===s.id;
      const col=isSel?(isTaken?0xff7a6e:0xb9ffc6):(isTaken?0xd45a4c:0x7ed98a);
      mark.material.color.setHex(col);
      mark.material.emissive=mark.material.emissive||new THREE.Color();
      mark.material.emissive.setHex(isSel?0x222222:0x000000);
    });
    people.forEach((fig,id)=>{fig.visible=taken.has(id);});
    if(sel){
      if(pov && taken.has(sel.id))exitSeat();
      else syncPanel();
    }
    drawMini();drawPlan();
  }

  function syncPanel(){
    if(!sel)return;
    const i=info(sel);const isTaken=taken.has(sel.id);
    nameEl.textContent=sel.id;
    typeEl.textContent=i.type;
    zoneEl.textContent=i.zone;
    featEl.textContent=isTaken?'Taken at this hour':i.feature;
    goBtn.disabled=!pov && isTaken;
    goBtn.textContent=pov?'Change seat':(isTaken?'Taken at this hour':'Sit here ↗');
    modeLabel.textContent=pov?'02 / LOOK AROUND':'01 / PICK YOUR SEAT';
    document.body.classList.toggle('pov',pov);
  }

  function choose(id){
    const s=seats.find(x=>x.id===id);if(!s)return;
    sel=s;if(!pov){/* keep orbit */}
    applyCrowd();
  }

  function seatEye(){
    const forward=new THREE.Vector3(Math.sin(sel.yaw),0,Math.cos(sel.yaw));
    const e=new THREE.Vector3(sel.x,sel.y+0.06,sel.z).addScaledVector(forward,-0.06);
    const a=e.clone().addScaledVector(forward,1.35).add(new THREE.Vector3(0,-0.04,0));
    return {e,a,forward};
  }
  let transTimer=0;
  function armTrans(ms){
    transitioning=true;clearTimeout(transTimer);
    transTimer=setTimeout(()=>{transitioning=false;applyCam();},ms);
  }
  function enterSeat(){
    if(!sel||taken.has(sel.id)||pov)return;
    look.set(0,0,0);lookMode=false;pov=true;syncPanel();
    const start=camera.position.clone();
    const startAt=target.clone();
    const dest=seatEye();
    const t0=performance.now();const dur=550;
    armTrans(dur+200);
    (function stepAnim(now){
      const u=smooth(Math.min(1,(now-t0)/dur));
      camera.position.lerpVectors(start,dest.e,u);
      const at=startAt.clone().lerp(dest.a,u);
      camera.lookAt(at);
      if(u<1)requestAnimationFrame(stepAnim);else{transitioning=false;clearTimeout(transTimer);applyCam();projectHits();}
    })(t0);
  }
  function exitSeat(){
    if(!pov){transitioning=false;syncPanel();applyCam();return;}
    pov=false;lookMode=false;look.set(0,0,0);syncPanel();
    transitioning=false;clearTimeout(transTimer);
    applyCam();projectHits();
  }

  let last=performance.now();
  function frame(now){
    const dt=Math.min(.05,(now-last)/1000);last=now;
    // Terrace fans stay static, no spin.
    // Crowd playback is driven by setInterval in play(), not the frame loop.
    if(!transitioning)applyCam();
    projectHits();
    renderer.render(scene,camera);
    requestAnimationFrame(frame);
  }

  function onResize(){applyCam();drawPlan();}
  window.addEventListener('resize',onResize);

  resizeClock();applyCrowd();
  if(taken.has(sel.id)){const free=seats.find(s=>!taken.has(s.id))||sel;sel=free;}
  choose(sel.id);applyCam();drawPlan();
  requestAnimationFrame(frame);

  window.__seatscope={
    choose,enterSeat,exitSeat,
    setHour(h,we){if(we!=null)setWeekend(!!we);pause();hour=Math.max(OPEN,Math.min(closeHour(weekend),h));step=Math.round((hour-OPEN)/STEP);hour=hourFromStep(step);resizeClock();applyCrowd();},
    setWeekend,play,pause,
    getState(){return {seat:sel&&sel.id,pov,hour,weekend,playing,available:seats.length-taken.size,total:seats.length,taken:[...taken]};}
  };
}

function makeText(text,color,w,h){
  const c=document.createElement('canvas');c.width=w;c.height=h;
  const g=c.getContext('2d');g.clearRect(0,0,w,h);
  g.fillStyle=color;g.font='700 36px Arial,sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(text,w/2,h/2);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.needsUpdate=true;return t;
}
function makePerson(s){
  const g=new THREE.Group();
  const shirtHues=[0.08,0.13,0.55,0.62,0.70,0.02,0.95,0.10];
  const skinC=new THREE.Color().setHSL(0.08,0.32,0.42+hash(s.id+'k')*0.28);
  const shirtC=new THREE.Color().setHSL(shirtHues[Math.floor(hash(s.id+'h')*shirtHues.length)],0.40,0.28+hash(s.id+'l')*0.12);
  const pantC=new THREE.Color().setHSL(0.62,0.12,0.16+hash(s.id+'p')*0.16);
  const hairC=new THREE.Color().setHSL(0.08,0.25,0.08+hash(s.id+'r')*0.3);
  const skin=new THREE.MeshStandardMaterial({color:skinC,roughness:.7});
  const shirt=new THREE.MeshStandardMaterial({color:shirtC,roughness:.7});
  const pant=new THREE.MeshStandardMaterial({color:pantC,roughness:.75});
  const hair=new THREE.MeshStandardMaterial({color:hairC,roughness:.8});
  const torso=box(shirt,.28,.38,.2,0,0.95,0.02);g.add(torso);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.09,12,10),skin);head.position.set(0,1.22,0.04);head.castShadow=true;g.add(head);
  const hairm=new THREE.Mesh(new THREE.SphereGeometry(.095,12,8,0,Math.PI*2,0,Math.PI/2),hair);hairm.position.set(0,1.26,0.04);g.add(hairm);
  // thighs toward table (local +z is back of chair? yaw faces table at local +z wait)
  // seat yaw points the sitter toward the table: local +z is forward in Three after rotY? rotation.y = yaw, local +z is the default forward after yaw? In Three, rotY applies to local +z as new forward in XZ. Our seats set yaw so the chair back is at local -z, so forward (toward table) is +z. Sitting figure should face +z.
  // Actually chairs were built with back at z=-.22, so local -z is back, +z is toward table. Good.
  g.add(box(pant,.12,.1,.36,-.08,0.55,0.16));
  g.add(box(pant,.12,.1,.36,.08,0.55,0.16));
  g.add(box(pant,.1,.34,.1,-.08,0.28,0.32));
  g.add(box(pant,.1,.34,.1,.08,0.28,0.32));
  g.add(box(shirt,.1,.28,.1,-.22,0.9,0.08,0.4,0,0));
  g.add(box(shirt,.1,.28,.1,.22,0.9,0.08,-0.4,0,0));
  g.add(box(skin,.08,.08,.08,-.22,0.72,0.22));
  g.add(box(skin,.08,.08,.08,.22,0.72,0.22));
  g.traverse(o=>{if(o.isMesh)o.castShadow=true;});
  return g;
}

// Fallback-only hooks if WebGL failed
if(!window.__seatscope){
  window.__seatscope={
    choose(id){const s=seats.find(x=>x.id===id);if(!s)return;sel=s;nameEl.textContent=s.id;typeEl.textContent=s.type;zoneEl.textContent=s.zone;featEl.textContent=s.feature;},
    enterSeat(){},exitSeat(){},setHour(){},setWeekend(){},play(){},pause(){},
    getState(){return {seat:sel&&sel.id,pov:false,hour,weekend,playing:false,available:seats.length,total:seats.length,taken:[]};}
  };
}

drawPlan();
