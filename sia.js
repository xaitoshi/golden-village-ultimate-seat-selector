// SeatScope · Study 02 — unofficial fan concept of Singapore Airlines' next-generation (2027) Business Class.
// Not affiliated with or endorsed by Singapore Airlines. Geometry is estimated; see README.
import * as THREE from 'three';
import model from './sia-model.cjs';
const {seats,ROWS,info,smooth}=model;
const $=id=>document.getElementById(id);
let selected=seats.find(s=>s.id==='11A'),pov=false,progress=0,transition=null,renderer,camera,scene,lookX=0,lookY=0;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const orbit={theta:0,phi:.46,zoom:1};
function update(){const m=info(selected);$('seat-name').innerHTML=`${selected.id} <span style="font-size:12px;color:#96a29f">/ Row ${selected.row}</span>`;$('stype').textContent=m.type;$('scabin').textContent=m.cabin;$('sfeature').textContent=m.companion?'Lowerable divider':selected.window?'Sliding door · window':'Sliding door';document.querySelectorAll('.seat-hit').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.id===selected.id)));drawMini();}
function choose(s){if(s.taken||transition||pov)return;selected=s;update();}
function enterSeat(s){if(!s||s.taken||transition||pov||!renderer)return;choose(s);$('continue').onclick();}
for(const s of seats){const b=document.createElement('button');b.className='seat-hit';b.dataset.id=s.id;b.setAttribute('aria-label',`Row ${s.row}, seat ${s.letter}, ${info(s).type}`);b.title=s.id;b.addEventListener('click',()=>choose(s));b.addEventListener('dblclick',e=>{e.preventDefault();e.stopPropagation();enterSeat(s);});$('seats').append(b);const f=b.cloneNode();f.className='';f.textContent=s.id;f.onclick=()=>choose(s);$('fallback-seats').append(f);s.button=b;}
function drawMini(){const c=$('mini').getContext('2d');c.clearRect(0,0,216,144);c.strokeStyle='#59646a';c.lineWidth=1.5;c.beginPath();c.moveTo(10,20);c.lineTo(190,20);c.quadraticCurveTo(212,72,190,124);c.lineTo(10,124);c.stroke();for(const s of seats){c.fillStyle=s===selected?'#c3ffd0':(!s.window&&s.alt)?'#cdb47e':'#7d878b';c.fillRect(196-(s.z*10.6)-3,72+s.x*19-3,7,6);}c.fillStyle='#8c979a';c.font='9px Arial';c.fillText('NOSE →',160,14);}
$('source').onclick=()=>$('notes').showModal();$('close').onclick=()=>$('notes').close();
$('continue').onclick=()=>{if(transition)return;lookX=lookY=0;pov=!pov;document.body.classList.toggle('pov',pov);$('mode-label').textContent=pov?'02 / YOUR SUITE':'01 / PICK YOUR SUITE';$('continue').textContent=pov?'← Change seat':'Sit here ↗';$('seats').style.pointerEvents=pov?'none':'';for(const s of seats)s.button.style.pointerEvents=pov?'none':'';transition={from:progress,to:pov?1:0,start:performance.now(),duration:reduced.matches?1:2100};};
update();
try{renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});}catch(e){$('fallback').style.display='block';$('continue').disabled=true;$('continue').textContent='WebGL unavailable';$('seats').hidden=true;}
if(renderer){
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0x0b0d10);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;$('world').append(renderer.domElement);
scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(45,1,.04,200);
scene.add(new THREE.HemisphereLight(0xf4f6ff,0x2a2a30,1.7));const sun=new THREE.DirectionalLight(0xfff3e2,1.3);sun.position.set(3,9,4);scene.add(sun);
const CZ=8.4,R=2.85,CY=1.0,LEN=17.4;
function mat(color,roughness=.8,metalness=0){return new THREE.MeshStandardMaterial({color,roughness,metalness});}
function canvasTex(w,h,draw,repeat){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;if(repeat){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(...repeat);}return t;}
function box(w,h,d,x,y,z,m,parent){const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);parent.add(o);return o;}
function rounded(w,h,r){const s=new THREE.Shape();s.moveTo(-w/2+r,-h/2);s.lineTo(w/2-r,-h/2);s.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r);s.lineTo(w/2,h/2-r);s.quadraticCurveTo(w/2,h/2,w/2-r,h/2);s.lineTo(-w/2+r,h/2);s.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r);s.lineTo(-w/2,-h/2+r);s.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2);return s;}
function padded(w,h,d,x,y,z,m,parent){const geo=new THREE.ExtrudeGeometry(rounded(w,h,Math.min(.06,h/3)),{depth:d,bevelEnabled:true,bevelSize:.02,bevelThickness:.02,bevelSegments:2,curveSegments:4});geo.translate(0,0,-d/2);const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);parent.add(o);return o;}
function planeUV(shape,tex){const g=new THREE.ShapeGeometry(shape,8);g.computeBoundingBox();const bb=g.boundingBox,uv=g.attributes.uv,p=g.attributes.position;for(let i=0;i<uv.count;i++)uv.setXY(i,(p.getX(i)-bb.min.x)/(bb.max.x-bb.min.x),(p.getY(i)-bb.min.y)/(bb.max.y-bb.min.y));return new THREE.Mesh(g,new THREE.MeshBasicMaterial({map:tex}));}
// Textures
const carpetTex=canvasTex(256,256,(c,w,h)=>{c.fillStyle='#2a2c31';c.fillRect(0,0,w,h);for(let i=0;i<2600;i++){c.fillStyle=Math.random()<.5?'#34363c':'#23252a';c.fillRect(Math.random()*w,Math.random()*h,2,2);}c.strokeStyle='#3a3d44';c.lineWidth=1;for(let y=0;y<h;y+=32){c.beginPath();c.moveTo(0,y);c.lineTo(w,y+8);c.stroke();}},[4,14]);
const speckTex=canvasTex(256,256,(c,w,h)=>{c.fillStyle='#252628';c.fillRect(0,0,w,h);for(let i=0;i<5200;i++){const v=Math.random();c.fillStyle=v<.6?'#3d3e41':v<.9?'#6c6d6f':'#a8a8a4';c.fillRect(Math.random()*w,Math.random()*h,v<.9?1.4:1,v<.9?1.4:1);}},[1,3]);
const feltTex=canvasTex(128,128,(c,w,h)=>{c.fillStyle='#3e3f43';c.fillRect(0,0,w,h);for(let i=0;i<3000;i++){c.fillStyle=Math.random()<.5?'#47484c':'#36373a';c.fillRect(Math.random()*w,Math.random()*h,1,1);}},[2,2]);
// Abstract bird/arrow motif — an impression of the cabin artwork in the renders, not the airline logo.
function motifTex(bg,fg){return canvasTex(512,300,(c,w,h)=>{c.fillStyle=bg;c.fillRect(0,0,w,h);c.strokeStyle=fg;c.lineCap='round';for(let i=0;i<7;i++){c.lineWidth=9-i;c.globalAlpha=1-i*.09;c.beginPath();c.moveTo(70+i*16,250-i*6);c.quadraticCurveTo(220+i*6,70+i*22,450-i*8,58+i*20);c.stroke();}c.globalAlpha=1;c.beginPath();c.moveTo(430,40);c.lineTo(472,52);c.lineTo(438,78);c.closePath();c.fillStyle=fg;c.fill();});}
const navyMotif=motifTex('#17213d','#d8c39a'),champMotif=motifTex('#cbb68e','#1b2747');
const skyTex=canvasTex(64,96,(c,w,h)=>{const g=c.createLinearGradient(0,0,0,h);g.addColorStop(0,'#7fb4e6');g.addColorStop(.62,'#cfe5f7');g.addColorStop(.66,'#ffffff');g.addColorStop(1,'#e9f1f7');c.fillStyle=g;c.fillRect(0,0,w,h);});
const shell=mat(0x2d2e32,.5,.1),shellLight=mat(0x38393d,.6),trim=mat(0xb8955e,.32,.75),felt=new THREE.MeshStandardMaterial({map:feltTex,roughness:1}),speck=new THREE.MeshStandardMaterial({map:speckTex,roughness:.4,metalness:.1}),black=mat(0x0d0e10,.3),fuselageMat=new THREE.MeshStandardMaterial({color:0xf0efea,roughness:.55,side:THREE.BackSide}),white=mat(0xefeeea,.6),tan=mat(0xd2b48c,.6);
const cabin=new THREE.Group(),overhead=new THREE.Group();scene.add(cabin,overhead);
// Floor and fuselage (A350-style circular section, ~5.6 m interior width)
const floor=new THREE.Mesh(new THREE.PlaneGeometry(5.4,LEN),new THREE.MeshStandardMaterial({map:carpetTex,roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.set(0,0,CZ);cabin.add(floor);
const th0=Math.acos(CY/R);const fus=new THREE.Mesh(new THREE.CylinderGeometry(R,R,LEN,72,1,true,th0,Math.PI*2-2*th0),fuselageMat);fus.rotation.x=Math.PI/2;fus.position.set(0,CY,CZ);cabin.add(fus);
// Windows (large A350-style), skipping door zones
const winShape=rounded(.3,.44,.1),frameShape=rounded(.38,.52,.13),frameMat=new THREE.MeshStandardMaterial({color:0xdcdbd6,roughness:.5});
for(const side of [-1,1])for(let z=.9;z<LEN-.6;z+=.93){if(z>8.3&&z<10.2)continue;const y=1.22,x=Math.sqrt(R*R-(y-CY)**2)-.02;const w=planeUV(winShape,skyTex);w.position.set(side*(x-.006),y,z);w.rotation.y=-side*Math.PI/2;cabin.add(w);const fr=new THREE.Mesh(new THREE.ShapeGeometry(frameShape,8),frameMat);fr.position.set(side*x,y,z);fr.rotation.y=-side*Math.PI/2;cabin.add(fr);}
// Door 2 between the cabins
for(const side of [-1,1]){const d=box(.05,1.9,.95,side*2.62,.95,9.25,mat(0xdedcd5,.5),cabin);d.rotation.z=side*.06;box(.06,.08,.3,side*2.58,1.05,9.25,mat(0x9a9a9a,.3,.6),cabin);}
// Bulkheads with navy / champagne motif panels
box(5.5,2.4,.12,0,1.2,.2,white,cabin);const m1=new THREE.Mesh(new THREE.PlaneGeometry(1.9,1.1),new THREE.MeshStandardMaterial({map:navyMotif,roughness:.7}));m1.position.set(0,1.72,.27);cabin.add(m1);
box(2.0,2.3,1.15,0,1.15,9.1,white,cabin);const m2=new THREE.Mesh(new THREE.PlaneGeometry(1.7,.95),new THREE.MeshStandardMaterial({map:champMotif,roughness:.7}));m2.position.set(0,1.8,9.68);cabin.add(m2);
box(5.5,2.4,.12,0,1.2,LEN-.05,white,cabin);for(let x=-2.2;x<=2.2;x+=.11)box(.06,2.0,.06,x,1.05,LEN-.18,mat(0x6f7378,.9),cabin);
// Overhead bins, ceiling and lights (hidden in the map view so the cabin can be seen from above)
for(const side of [-1,1]){box(.7,.46,LEN-.4,side*2.12,2.02,CZ,white,overhead);box(.02,.03,LEN-.4,side*1.78,1.80,CZ,mat(0xc9c8c3),overhead);const strip=box(.04,.02,LEN-.4,side*1.7,1.79,CZ,new THREE.MeshBasicMaterial({color:0xfff2dc}),overhead);}
box(3.0,.05,LEN-.4,0,2.42,CZ,mat(0xf6f5f1,.7),overhead);for(let z=1.5;z<LEN;z+=3.2){const l=new THREE.PointLight(0xfff0dc,4,7,1.4);l.position.set(0,2.2,z);overhead.add(l);}
// Suites
const seatMeshes=[],ifeCanvasList=[];
function labelTex(text){return canvasTex(128,64,(c,w,h)=>{c.fillStyle='#1c1d20';c.fillRect(0,0,w,h);c.fillStyle='#f2f2ee';c.font='bold 38px Arial';c.textAlign='center';c.fillText(text,w/2,46);});}
function ifeTex(s){return canvasTex(512,288,(c,w,h)=>{const g=c.createLinearGradient(0,0,w,h);g.addColorStop(0,'#0b1730');g.addColorStop(1,'#1d3d6e');c.fillStyle=g;c.fillRect(0,0,w,h);c.fillStyle='#d8c39a';c.font='18px Arial';c.fillText('WELCOME ON BOARD',34,48);c.fillStyle='#fff';c.font='bold 74px Arial';c.fillText(s.id,34,132);c.font='20px Arial';c.fillStyle='#b9c6dd';c.fillText(s.type,34,168);c.strokeStyle='#d8c39a';c.lineWidth=3;c.setLineDash([6,8]);c.beginPath();c.moveTo(60,240);c.quadraticCurveTo(256,170,452,232);c.stroke();c.setLineDash([]);c.fillStyle='#fff';c.beginPath();c.arc(250,206,7,0,7);c.fill();c.font='14px Arial';c.fillStyle='#8fa0bd';c.fillText('SIN',44,268);c.fillText('LHR',440,262);c.fillText('Unofficial concept screen',300,30);});}
function prevSameCol(s){const i=ROWS.indexOf(s.row);if(i===0||i===6)return null;return seats.find(o=>o.letter===s.letter&&o.row===ROWS[i-1])||null;}
const H=1.32,REAR=.48,FRONT=REAR-1.27; // 52 in shell/door height; 50 in pitch
for(const s of seats){
 const g=new THREE.Group();g.userData.seat=s;g.position.set(s.x,0,s.z);scene.add(g);s.group=g;seatMeshes.push(g);
 const W=s.window?1.05:1.0,L0=s.suiteX-W/2-s.x,L1=s.suiteX+W/2-s.x,aisleDir=s.window?-s.side:s.side,aisleX=aisleDir>0?L1:L0,innerX=aisleDir>0?L0:L1,mid=(L0+L1)/2;
 const cushion=new THREE.MeshStandardMaterial({color:0xcbcbc7,roughness:.95});s.material=cushion;
 // Shell: rear wall (felt inside) + aisle wall with an open sliding door + bronze trim caps
 box(W,H,.05,mid,H/2,REAR,shell,g);box(W-.06,H-.25,.01,mid,H/2+.05,REAR-.03,felt,g);box(W,.015,.07,mid,H+.008,REAR,trim,g);
 for(const [z0,z1] of [[REAR,.02],[-.52,FRONT]]){const len=z0-z1;box(.05,H,len,aisleX,H/2,(z0+z1)/2,shell,g);box(.07,.015,len,aisleX,H+.008,(z0+z1)/2,trim,g);}
 box(.03,H-.04,.56,aisleX+aisleDir*.045,H/2,.24,shellLight,g);box(.035,.012,.56,aisleX+aisleDir*.045,H-.02,.24,trim,g); // door slid open
 box(.012,.5,.6,aisleX-aisleDir*.03,.6,.25,felt,g);
 if(!s.window&&s.side<0){ // centre divider: lowerable panel for companion pairs, fixed wall otherwise
  if(s.alt){box(.03,1.08,1.2,innerX,.6,-.15,mat(0x232428,.25,.2),g);box(.035,.012,1.2,innerX,1.14,-.15,trim,g);}else{box(.05,H,1.27,innerX,H/2,(REAR+FRONT)/2,shell,g);box(.07,.015,1.27,innerX,H+.008,(REAR+FRONT)/2,trim,g);}}
 if(!prevSameCol(s)){box(W,H,.05,mid,H/2,FRONT,shell,g);box(W,.015,.07,mid,H+.008,FRONT,trim,g);} // front monument where no suite is ahead
 if(s.row===17||s.row===22){const mp=new THREE.Mesh(new THREE.PlaneGeometry(W-.12,.8),new THREE.MeshStandardMaterial({map:champMotif,roughness:.7}));mp.position.set(mid,.75,REAR+.03);g.add(mp);}
 // Seat
 box(.42,.3,.42,0,.17,.05,shell,g);padded(.56,.11,.56,0,.44,.03,cushion,g).rotation.x=-Math.PI/2*0;const back=padded(.56,.7,.11,0,.83,.36,cushion,g);back.rotation.x=.16;const head=padded(.42,.18,.1,0,1.2,.43,cushion,g);head.rotation.x=.16;s.hide=[back,head];
 box(.09,.015,.05,.12,.505,-.05,tan,g);box(.07,.015,.04,-.1,.505,-.05,tan,g); // belt buckles
 // Ottoman / footwell under the IFE
 padded(.48,.3,.3,0,.29,FRONT+.2,cushion,g);box(.5,.14,.3,0,.07,FRONT+.2,shell,g);
 // IFE (22 in) and stowed bi-fold table
 box(.55,.34,.035,0,1.0,FRONT+.045,black,g);const scr=new THREE.Mesh(new THREE.PlaneGeometry(.49,.28),new THREE.MeshBasicMaterial({map:ifeTex(s)}));scr.position.set(0,1.0,FRONT+.064);g.add(scr);
 box(.56,.035,.18,0,.74,FRONT+.11,speck,g);box(.56,.01,.02,0,.76,FRONT+.2,trim,g);
 // Side console with speckled worktop, controls, lamp, wireless-charging pad
 const cx=s.consoleSide*.45;box(.3,.64,.98,cx,.32,-.07,shellLight,g);box(.32,.025,1.0,cx,.655,-.07,speck,g);box(.012,.012,1.0,cx-s.consoleSide*.16,.665,-.07,trim,g);
 box(.1,.012,.16,cx,.675,.25,black,g);box(.07,.004,.1,cx,.683,.25,new THREE.MeshBasicMaterial({color:0x3a6ea8}),g);
 const pad=new THREE.Mesh(new THREE.CylinderGeometry(.045,.045,.004,24),mat(0x1a1a1c,.3));pad.position.set(cx,.672,-.15);g.add(pad);
 box(.03,.36,.03,cx+s.consoleSide*.1,.85,.36,mat(0x1f2023,.3),g);const lamp=new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,.08,16),speck);lamp.position.set(cx+s.consoleSide*.1,1.07,.36);g.add(lamp);
 // Seat number plates on the shell top and aisle face
 const lt=labelTex(s.id);const top=new THREE.Mesh(new THREE.PlaneGeometry(.22,.11),new THREE.MeshBasicMaterial({map:lt}));top.rotation.x=-Math.PI/2;top.position.set(aisleX-aisleDir*.0,H+.02,.33);g.add(top);
 const face=new THREE.Mesh(new THREE.PlaneGeometry(.16,.08),new THREE.MeshBasicMaterial({map:lt}));face.position.set(aisleX+aisleDir*.03,H-.12,.36);face.rotation.y=aisleDir*Math.PI/2;g.add(face);
}
const startPos=new THREE.Vector3(),endPos=new THREE.Vector3(),target=new THREE.Vector3(),center=new THREE.Vector3(0,0,CZ),povTarget=new THREE.Vector3();let width=0,height=0;
function resize(){width=innerWidth;height=innerHeight;renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();orbit.theta=width/height<1?Math.PI/2:0;}addEventListener('resize',resize);resize();
let drag=null;const el=renderer.domElement;el.style.touchAction='none';
el.addEventListener('pointerdown',e=>{if(transition)return;drag={x:e.clientX,y:e.clientY,moved:0};el.setPointerCapture(e.pointerId);});
el.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.moved+=Math.abs(dx)+Math.abs(dy);drag.x=e.clientX;drag.y=e.clientY;if(pov){lookX=THREE.MathUtils.clamp(lookX-dx*.004,-1.35,1.35);lookY=THREE.MathUtils.clamp(lookY-dy*.003,-.5,.45);}else{orbit.theta-=dx*.006;orbit.phi=THREE.MathUtils.clamp(orbit.phi-dy*.004,.1,1.3);}});
let lastDragMoved=0;el.addEventListener('pointerup',()=>{lastDragMoved=drag?drag.moved:0;drag=null;});el.addEventListener('pointercancel',()=>drag=null);
el.addEventListener('wheel',e=>{if(pov)return;e.preventDefault();orbit.zoom=THREE.MathUtils.clamp(orbit.zoom*Math.exp(e.deltaY*.001),.45,1.6);},{passive:false});
const raycaster=new THREE.Raycaster();
function pickSeat(e){const rect=el.getBoundingClientRect();raycaster.setFromCamera(new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),camera);const hit=raycaster.intersectObjects(seatMeshes,true)[0];if(!hit)return null;let o=hit.object;while(o&&!o.userData.seat)o=o.parent;return o?.userData.seat||null;}
el.addEventListener('click',e=>{if(!pov&&!transition&&lastDragMoved<6){const s=pickSeat(e);if(s)choose(s);}});
el.addEventListener('dblclick',e=>{e.preventDefault();if(transition)return;if(pov){lookX=lookY=0;return;}if(lastDragMoved<6)enterSeat(pickSeat(e));});
addEventListener('keydown',e=>{if(e.key==='Escape'&&pov&&!transition)$('continue').click();});
const selColor=new THREE.Color(0xb9ffc6),baseColor=new THREE.Color(0xcbcbc7),compColor=new THREE.Color(0xd9c591),tmp=new THREE.Color();
function frame(now){requestAnimationFrame(frame);if(transition){const t=Math.min(1,(now-transition.start)/transition.duration);progress=THREE.MathUtils.lerp(transition.from,transition.to,smooth(t));if(t===1)transition=null;}
 const p=progress,portrait=width/height<1,Rd=(portrait?34:17.5)*orbit.zoom;camera.setViewOffset(width,height,0,-(1-p)*height*(portrait?.1:.09),width,height);
 startPos.set(center.x+Rd*Math.sin(orbit.phi)*Math.cos(orbit.theta),Rd*Math.cos(orbit.phi),center.z+Rd*Math.sin(orbit.phi)*Math.sin(orbit.theta));
 endPos.set(selected.x,1.16,selected.z+.06);camera.position.lerpVectors(startPos,endPos,p);camera.position.y+=Math.sin(p*Math.PI)*1.6;
 const yaw=lookX+(selected.window&&!pov&&p<1?0:0);povTarget.set(selected.x-Math.sin(yaw)*3,1.16-.62+lookY*3,selected.z-Math.cos(yaw)*3);
 target.lerpVectors(center,povTarget,p);camera.up.set(0,1,0);camera.lookAt(target);camera.fov=THREE.MathUtils.lerp(portrait?50:45,portrait?78:68,p);camera.updateProjectionMatrix();
 overhead.visible=p>.4;
 for(const s of seats){for(const h of s.hide)h.visible=!(p>.9&&s===selected);tmp.copy(s===selected?selColor:(!s.window&&s.alt)?compColor:baseColor).lerp(baseColor,p);s.material.color.copy(tmp);
  if(p<.01){const q=new THREE.Vector3(s.x,1.45,s.z).project(camera);s.button.style.left=(q.x*.5+.5)*width+'px';s.button.style.top=(-q.y*.5+.5)*height+'px';const size=Math.max(14,Math.min(30,width/34));s.button.style.width=s.button.style.height=size+'px';}s.button.hidden=p>.01;}
 $('seats').style.opacity=1-p;renderer.render(scene,camera);}
requestAnimationFrame(frame);
window.__seatscope={seats:seats.map(({id,x,z,type})=>({id,x,z,type})),getState:()=>({selected:selected.id,pov,progress,transitioning:!!transition}),choose:id=>{const s=seats.find(s=>s.id===id);if(s)choose(s);},enter:id=>{const s=seats.find(s=>s.id===id);enterSeat(s);}};
}
