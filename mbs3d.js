// Approximate 3D Sands Theatre for the /mbs seat view. Built lazily on first seat click.
import * as THREE from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
const L=require('./mbs-3d-layout.cjs');
const {F,STAGE,CEIL,LV,STALLS_BACK,floorY,rows,boxes,wallAt,WZ0,WZ1,TARGET,target}=L;

function canvasTex(w,h,draw,rx=1,ry=1){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(rx,ry);t.anisotropy=4;return t;}

export function createTheatre(container){
  let renderer;
  try{renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});}catch(e){return null;}
  if(!renderer.getContext())return null;
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.75));
  renderer.setClearColor(0x0a0506);
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);
  const scene=new THREE.Scene();
  scene.fog=new THREE.Fog(0x140a08,60,140);
  const camera=new THREE.PerspectiveCamera(60,1,.05,220);
  scene.add(new THREE.HemisphereLight(0xffe4c4,0x7a4a34,1.55));
  scene.add(new THREE.AmbientLight(0xffd9b0,.35));
  const key=new THREE.DirectionalLight(0xfff0dc,.9);key.position.set(0,30,10);scene.add(key);const fill=new THREE.DirectionalLight(0xffd8b0,.75);fill.position.set(0,14,60);scene.add(fill);
  const stageSpot=new THREE.SpotLight(0xffe2b0,320,60,.36,.6,1.4);stageSpot.position.set(0,15,10);stageSpot.target.position.set(0,2.5,-6);scene.add(stageSpot,stageSpot.target);
  const stageWash=new THREE.PointLight(0xffc890,60,26,1.6);stageWash.position.set(0,8,-6);scene.add(stageWash);

  const mat=(color,o={})=>new THREE.MeshStandardMaterial({color,roughness:.8,...o});
  const glow=c=>new THREE.MeshBasicMaterial({color:c});
  const DS=THREE.DoubleSide;
  // Textures
  const wood=canvasTex(256,512,(c,w,h)=>{const g=c.createLinearGradient(0,0,0,h);g.addColorStop(0,'#9a6a36');g.addColorStop(.5,'#c79a5c');g.addColorStop(1,'#8a5a2c');c.fillStyle=g;c.fillRect(0,0,w,h);for(let x=0;x<w;x+=16){c.fillStyle='rgba(60,30,10,.35)';c.fillRect(x,0,3,h);c.fillStyle='rgba(255,220,160,.12)';c.fillRect(x+4,0,2,h);}for(let y=0;y<h;y+=128){c.fillStyle='rgba(40,20,8,.4)';c.fillRect(0,y,w,4);}});
  const carpet=canvasTex(256,256,(c,w,h)=>{c.fillStyle='#5a161c';c.fillRect(0,0,w,h);c.strokeStyle='rgba(212,175,55,.22)';c.lineWidth=2;for(let i=0;i<w;i+=32){c.beginPath();c.arc(i+16,16,10,0,Math.PI*2);c.stroke();c.beginPath();c.arc(i,48,10,0,Math.PI*2);c.stroke();}c.fillStyle='rgba(0,0,0,.18)';for(let i=0;i<400;i++)c.fillRect(Math.random()*w,Math.random()*h,2,2);},.6,.6);
  const curtainTex=canvasTex(512,256,(c,w,h)=>{for(let x=0;x<w;x++){const v=.55+.45*Math.sin(x/w*Math.PI*2*14);const r=Math.round(52+70*v),g=Math.round(6+10*v),b=Math.round(12+14*v);c.fillStyle=`rgb(${r},${g},${b})`;c.fillRect(x,0,1,h);}const g=c.createLinearGradient(0,0,0,h);g.addColorStop(0,'rgba(0,0,0,.45)');g.addColorStop(.25,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,.25)');c.fillStyle=g;c.fillRect(0,0,w,h);});
  const valTex=canvasTex(512,64,(c,w,h)=>{c.fillStyle='#5a0f1a';c.fillRect(0,0,w,h);for(let x=0;x<w;x+=64){c.fillStyle='#7a1a26';c.beginPath();c.ellipse(x+32,0,32,48,0,0,Math.PI);c.fill();}c.fillStyle='#d4af37';c.fillRect(0,h-6,w,6);for(let x=0;x<w;x+=6)c.fillRect(x,h-12,2,6);});
  const woodM=new THREE.MeshStandardMaterial({map:wood,roughness:.62,emissive:0x2a1608,side:DS});
  const carpetM=new THREE.MeshStandardMaterial({map:carpet,roughness:1,side:DS});
  const creamM=mat(0xe9d6b6,{roughness:.55,side:DS});
  const soffitM=mat(0x3a2418,{side:DS});const plasterM=mat(0x8a6a50,{side:DS,roughness:.9});const fasciaIn=mat(0xe9d6b6,{roughness:.55,side:THREE.BackSide});const fasciaOut=mat(0x3a1a14,{roughness:.8,side:THREE.FrontSide});const velvetM=mat(0x6a1420,{roughness:.95,side:DS});
  const darkM=mat(0x140b0a,{side:DS});
  const goldM=new THREE.MeshStandardMaterial({color:0xd4af37,metalness:.55,roughness:.32,emissive:0x4a3208});
  const stageM=mat(0x2a1810,{roughness:.55});
  const lightM=glow(0xffe3b0);
  const scenery=new THREE.Group();scene.add(scenery);
  const add=(geo,m,x=0,y=0,z=0)=>{const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);scenery.add(o);return o;};
  const TH=.8; // angular reach beyond the walls
  // Vertical arc band centred on the focal point
  const band=(R,y0,y1,m,t=TH)=>add(new THREE.CylinderGeometry(R,R,y1-y0,96,1,true,-t,2*t),m,0,(y0+y1)/2,-F);
  // Polar surface with height function y(R)
  function polar(R0,R1,yfn,m,nr=40,nt=72,t=TH){const pos=[],uv=[],idx=[];for(let i=0;i<=nr;i++){const R=R0+(R1-R0)*i/nr,y=yfn(R);for(let j=0;j<=nt;j++){const th=-t+2*t*j/nt;pos.push(R*Math.sin(th),y,-F+R*Math.cos(th));uv.push(R*Math.sin(th)/4,R*Math.cos(th)/4);}}for(let i=0;i<nr;i++)for(let j=0;j<nt;j++){const a=i*(nt+1)+j,b=a+nt+1;idx.push(a,b,a+1,b,b+1,a+1);}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return add(g,m);}
  const ring=(R0,R1,y,m,t=TH)=>{const g=new THREE.RingGeometry(R0,R1,96,1,-Math.PI/2-t,2*t);g.rotateX(-Math.PI/2);return add(g,m,0,y,-F);};

  // Stage, apron and proscenium
  const apron=new THREE.Mesh(new THREE.CylinderGeometry(F,F,STAGE.floor,96,1,false,-.62,1.24),[darkM,stageM,stageM]);apron.position.set(0,STAGE.floor/2,-F);scenery.add(apron);
  band(F+.01,STAGE.floor-.08,STAGE.floor,goldM,.62);
  add(new THREE.BoxGeometry(26,STAGE.floor,20),stageM,0,STAGE.floor/2,-13);
  add(new THREE.BoxGeometry(26,24,.4),darkM,0,12,-22);
  const pw=STAGE.proHalf,pz=STAGE.proZ,top=STAGE.proTop,hw=wallAt(pz)+.5;
  add(new THREE.BoxGeometry(hw-pw,CEIL+1,.5),woodM,-(pw+hw)/2,CEIL/2,pz-.25);
  add(new THREE.BoxGeometry(hw-pw,CEIL+1,.5),woodM,(pw+hw)/2,CEIL/2,pz-.25);
  add(new THREE.BoxGeometry(2*hw,CEIL-top+1,.5),woodM,0,(top+CEIL)/2,pz-.25);add(new THREE.BoxGeometry(2*pw+3,.25,.3),goldM,0,top+2.2,pz+.05);
  for(const sg of [-1,1]){add(new THREE.BoxGeometry(.9,top-STAGE.floor+.9,.7),goldM,sg*(pw+.3),(top+STAGE.floor)/2+.2,pz+.1);add(new THREE.BoxGeometry(1.1,7,1.1),darkM,sg*(pw-.9),STAGE.floor+3.5,pz-1.4);}
  add(new THREE.BoxGeometry(2*pw+1.5,.9,.7),goldM,0,top+.25,pz+.1);
  add(new THREE.BoxGeometry(2*pw+.2,.12,.12),lightM,0,top-.28,pz+.42);
  const curtain=add(new THREE.PlaneGeometry(2*pw,top-STAGE.floor),new THREE.MeshStandardMaterial({map:curtainTex,roughness:.95,emissive:0x140204}),0,(top+STAGE.floor)/2,pz-1.0);
  add(new THREE.PlaneGeometry(2*pw,1.4),new THREE.MeshStandardMaterial({map:valTex,roughness:.85,emissive:0x1a0306}),0,top-.7,pz-.6);

  // Stalls floor, pit lift and rear wall
  polar(F,F+STALLS_BACK+.4,R=>floorY.stalls(R-F)-.02,carpetM,60,80);
  const pitEdge=F+rows.stalls.find(r=>r.row==='C').d+.55;
  ring(F+.02,pitEdge,.012,mat(0x2a1612,{side:DS}),.62);
  band(pitEdge,0,.06,goldM,.62);
  band(F+STALLS_BACK+.4,floorY.stalls(STALLS_BACK)-.5,LV.dress.soffitBack+.2,woodM);
  // Mix position desk in the centre of rows T to W
  {const t=rows.stalls.find(r=>r.row==='T'),w=rows.stalls.find(r=>r.row==='W');const d=(t.d+w.d)/2;const desk=add(new THREE.BoxGeometry(2.6,1.05,(w.d-t.d)+.4),darkM,0,floorY.stalls(d)+.5,d);add(new THREE.BoxGeometry(2.4,.04,.3),lightM,0,floorY.stalls(d)+1.04,t.d-.1);}

  // A balcony: stepped treads with risers, fascia, parapet, soffit and lights
  function balcony(id,{front,soffit,backD,wallTop}){
    const rr=rows[id];
    for(let i=0;i<rr.length;i++){
      const r=rr[i],R0=i===0?F+front:(F+(rr[i-1].d+r.d)/2),R1=i===rr.length-1?F+r.d+.7:F+(r.d+rr[i+1].d)/2;
      ring(R0,R1,r.y-.02,carpetM);
      if(i>0)band(R0,rr[i-1].y-.03,r.y,soffitM);
    }
    const last=rr[rr.length-1],R0=F+front;
    if(backD){ring(F+last.d+.7,F+backD,last.y-.02,carpetM);}
    const yTop=rr[0].y+.95,ySof=soffit(front);
    band(R0,ySof,yTop,fasciaIn);band(R0+.01,ySof,yTop,fasciaOut);
    band(R0+.04,yTop-.06,yTop+.06,goldM);
    band(R0-.02,ySof+.18,ySof+.24,lightM);band(R0-.02,ySof+.55,ySof+.6,lightM);
    band(R0-.03,ySof-.06,ySof+.01,lightM);
    const backR=F+(backD||last.d+.7);
    polar(R0,backR,R=>soffit(R-F),plasterM,20,72);
    if(wallTop)band(backR,last.y-.05,wallTop,woodM);
    // soffit downlights
    const g=new THREE.CircleGeometry(.12,10);g.rotateX(Math.PI/2);const n=[];for(let d=front+2;d<(backD||last.d)-.5;d+=4.2)for(let th=-.27;th<=.2701;th+=.09)n.push([d,th]);
    const im=new THREE.InstancedMesh(g,lightM,n.length);const m4=new THREE.Matrix4();n.forEach(([d,th],k)=>{const R=F+d;m4.makeTranslation(R*Math.sin(th),soffit(d)-.01,-F+R*Math.cos(th));im.setMatrixAt(k,m4);});scenery.add(im);
    return {last,backR};
  }
  const dressSoffit=d=>LV.dress.soffitFront+(LV.dress.soffitBack-LV.dress.soffitFront)*Math.max(0,d-LV.dress.front)/(STALLS_BACK-LV.dress.front);
  const grandSoffit=d=>floorY.grand(Math.max(d,LV.grand.d0))-.85;
  balcony('dress',{front:LV.dress.front,soffit:dressSoffit,backD:STALLS_BACK+.4,wallTop:0});
  band(F+LV.dress.back,rows.dress.at(-1).y-.05,grandSoffit(LV.grand.front)+.6,woodM);
  const gb=balcony('grand',{front:LV.grand.front,soffit:grandSoffit,backD:0,wallTop:CEIL+.5});

  // Side walls follow the widest seats
  {const pos=[],uv=[],idx=[];const zs=[];for(let z=WZ0-.5;z<=WZ1+4;z+=.5)zs.push(z);for(const sg of [-1,1]){const base=pos.length/3;zs.forEach((z,i)=>{const x=sg*wallAt(z);pos.push(x,-1,z,x,CEIL+.5,z);uv.push(z/2.2,0,z/2.2,(CEIL+1.5)/6);});for(let i=0;i<zs.length-1;i++){const a=base+i*2;idx.push(a,a+2,a+1,a+1,a+2,a+3);}}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();add(g,woodM);
    // warm wall washers
    for(const sg of [-1,1])for(let z=4;z<40;z+=7)add(new THREE.BoxGeometry(.05,.05,1.4),glow(0xffd9a0),sg*(wallAt(z)-.04),3.2,z);}
  // Ceiling with lighting bridges
  add(new THREE.BoxGeometry(40,.4,WZ1+10),darkM,0,CEIL+.2,(WZ1-3)/2);
  for(const z of [3,9,15,22,30]){add(new THREE.BoxGeometry(2*wallAt(z)-.4,.7,1.2),mat(0x2a201c),0,CEIL-.6,z);add(new THREE.BoxGeometry(2*wallAt(z)-1,.05,.1),lightM,0,CEIL-.97,z);}

  // Boxes on the side walls
  for(const b of boxes){
    const sg=b.side,ix=sg*(b.wall-b.depth),cx=sg*(b.wall-b.depth/2),z0=b.zc-b.len/2;
    add(new THREE.BoxGeometry(b.depth,.35,b.len),soffitM,cx,b.y-.18,b.zc);
    add(new THREE.BoxGeometry(b.depth*.55,.3,b.len),carpetM,sg*(b.wall-b.depth*.275),b.y+.15,b.zc);
    add(new THREE.BoxGeometry(.1,.68,b.len),velvetM,ix,b.y+.34,b.zc);
    add(new THREE.BoxGeometry(.03,.64,b.len-.1),creamM,ix-sg*.06,b.y+.34,b.zc);
    add(new THREE.BoxGeometry(.16,.07,b.len+.05),goldM,ix,b.y+.7,b.zc);
    add(new THREE.BoxGeometry(b.depth,.68,.08),velvetM,cx,b.y+.34,z0);
    add(new THREE.BoxGeometry(b.depth,.07,.14),goldM,cx,b.y+.7,z0);
    add(new THREE.BoxGeometry(b.depth,.68,.08),velvetM,cx,b.y+.34,b.zc+b.len/2);
    add(new THREE.BoxGeometry(.04,.06,b.len-.2),lightM,ix-sg*.08,b.y-.1,b.zc);
  }
  // Seats: two instanced meshes (velvet and frame) that share matrices
  const up=[new THREE.BoxGeometry(.5,.11,.46).translate(0,.44,-.02),new THREE.BoxGeometry(.5,.56,.09).rotateX(-.12).translate(0,.8,.24)];
  const fr=[new THREE.BoxGeometry(.06,.24,.5).translate(-.28,.58,.02),new THREE.BoxGeometry(.06,.24,.5).translate(.28,.58,.02),new THREE.BoxGeometry(.56,.6,.04).rotateX(-.12).translate(0,.76,.3),new THREE.BoxGeometry(.5,.38,.08).translate(0,.19,.1)];
  const upG=mergeGeometries(up),frG=mergeGeometries(fr);
  const chairs=L.seats.filter(s=>s.kind!=='wheel');
  const velvet=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.92});
  const frameM=mat(0x5a1c20,{roughness:.7});
  const upI=new THREE.InstancedMesh(upG,velvet,chairs.length),frI=new THREE.InstancedMesh(frG,frameM,chairs.length);
  const base=new THREE.Color(0xa81c2c),pitC=new THREE.Color(0xb52a36),boxC=new THREE.Color(0x96202c),gold=new THREE.Color(0xf0c850);
  const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),one=new THREE.Vector3(1,1,1),zero=new THREE.Vector3(0,0,0),Y=new THREE.Vector3(0,1,0);
  const index=new Map();
  function place(i,s,scale){q.setFromAxisAngle(Y,s.yaw);m4.compose(new THREE.Vector3(s.x,s.y,s.z),q,scale);upI.setMatrixAt(i,m4);frI.setMatrixAt(i,m4);}
  const colorOf=s=>s.kind==='pit'?pitC:s.kind==='box'?boxC:base;
  chairs.forEach((s,i)=>{index.set(s.id,i);place(i,s,one);upI.setColorAt(i,colorOf(s));});
  scene.add(upI,frI);
  const wheels=L.seats.filter(s=>s.kind==='wheel');
  {const g=new THREE.RingGeometry(.28,.36,20);g.rotateX(-Math.PI/2);const im=new THREE.InstancedMesh(g,glow(0xd4af37),wheels.length);wheels.forEach((s,i)=>{m4.makeTranslation(s.x,s.y+.02,s.z);im.setMatrixAt(i,m4);});scene.add(im);}
  const marker=new THREE.Mesh(new THREE.RingGeometry(.3,.42,24).rotateX(-Math.PI/2),glow(0xf0d78a));scene.add(marker);marker.visible=false;

  // Camera state
  let selected=null,hidden=-1,active=false,raf=0,anim=null,yaw=0,pitch=0,zoom=1;
  const stage=new THREE.Vector3(TARGET.x,TARGET.y,TARGET.z);
  let curve=null,eyeV=new THREE.Vector3(),seatEye=new THREE.Vector3();
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  function baseFov(){const a=camera.aspect;if(a>=1.1)return 70;const h=a<1?80:72;return Math.min(80,Math.max(60,2*Math.atan(Math.tan(h*Math.PI/360)/a)*180/Math.PI));}
  function resize(){const w=container.clientWidth||innerWidth,h=container.clientHeight||innerHeight;renderer.setSize(w,h,false);renderer.domElement.style.width='100%';renderer.domElement.style.height='100%';const off=w<h?0:.22;camera.aspect=w/(h*(1+off));camera.setViewOffset(w,h*(1+off),0,h*off,w,h);camera.updateProjectionMatrix();}
  addEventListener('resize',()=>{if(active)resize();});
  function setSelected(s){
    if(selected&&index.has(selected.id)){const i=index.get(selected.id);upI.setColorAt(i,colorOf(selected));}
    if(hidden>=0){place(hidden,chairs[hidden],one);hidden=-1;}
    selected=s;
    if(index.has(s.id))upI.setColorAt(index.get(s.id),gold);
    upI.instanceColor.needsUpdate=true;upI.instanceMatrix.needsUpdate=true;frI.instanceMatrix.needsUpdate=true;
    marker.position.set(s.x,s.y+.03,s.z);
  }
  function lookDir(from){
    const d=new THREE.Vector3().subVectors(stage,from).normalize();
    const e=new THREE.Euler().setFromVector3(d);
    const y0=Math.atan2(-d.x,-d.z),p0=Math.asin(THREE.MathUtils.clamp(d.y,-1,1));
    const yy=y0+yaw,pp=THREE.MathUtils.clamp(p0+pitch,-1.2,1.2);
    return new THREE.Vector3(-Math.sin(yy)*Math.cos(pp),Math.sin(pp),-Math.cos(yy)*Math.cos(pp));
  }
  const ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
  function frame(now){
    raf=requestAnimationFrame(frame);
    let t=1;
    if(anim){t=Math.max(0,Math.min(1,(now-anim.start)/anim.dur));if(t>=1)anim=null;}
    const k=ease(t);
    let pos;
    if(curve&&k<1)pos=curve.getPointAt(k);else pos=seatEye.clone();
    camera.position.copy(pos);
    const toSeat=new THREE.Vector3().subVectors(seatEye,pos);
    const dB=lookDir(pos);
    let dir=dB;
    if(k<1&&toSeat.length()>.6){const w=THREE.MathUtils.smoothstep(k,.35,.92);dir=toSeat.normalize().lerp(dB,w).normalize();}
    camera.lookAt(pos.clone().add(dir));
    camera.fov=THREE.MathUtils.lerp(70,baseFov()*zoom,k);camera.updateProjectionMatrix();
    const hide=k>.8;const i=index.has(selected.id)?index.get(selected.id):-1;
    if(i>=0){if(hide&&hidden!==i){place(i,chairs[i],zero);hidden=i;upI.instanceMatrix.needsUpdate=frI.instanceMatrix.needsUpdate=true;}else if(!hide&&hidden===i){place(i,chairs[i],one);hidden=-1;upI.instanceMatrix.needsUpdate=frI.instanceMatrix.needsUpdate=true;}}
    marker.visible=!hide;
    renderer.render(scene,camera);
  }
  function enter(plan,opts={}){
    const s=L.byId.get(plan.id||plan);if(!s)return false;
    const e=L.eye(s);seatEye.set(e.x,e.y,e.z);const tg=target(e);stage.set(tg.x,tg.y,tg.z);
    setSelected(s);yaw=0;pitch=0;zoom=1;
    resize();
    // Fly in from above the front stalls: descend to the seat's eye level, then glide into the seat
    const p0=new THREE.Vector3(0,14,1.5);
    const p1=new THREE.Vector3(seatEye.x*.5,seatEye.y,Math.max(2,seatEye.z-12));
    const pm=p0.clone().lerp(p1,.55);pm.y=Math.max(pm.y,p1.y+1.2);
    curve=new THREE.CatmullRomCurve3([p0,pm,p1,seatEye.clone()],false,'centripetal');
    const instant=opts.instant||reduced.matches;
    anim=instant?null:{start:performance.now(),dur:2300};
    if(!active){active=true;cancelAnimationFrame(raf);raf=requestAnimationFrame(frame);}
    return true;
  }
  function exit(){active=false;cancelAnimationFrame(raf);anim=null;}
  // Look around: drag, wheel or pinch to zoom
  const el=renderer.domElement;el.style.touchAction='none';el.style.display='block';
  const pts=new Map();let pinch=0;
  el.addEventListener('pointerdown',e=>{el.setPointerCapture(e.pointerId);pts.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pts.size===2){const [a,b]=[...pts.values()];pinch=Math.hypot(a.x-b.x,a.y-b.y);}});
  el.addEventListener('pointermove',e=>{const p=pts.get(e.pointerId);if(!p)return;if(pts.size===2){pts.set(e.pointerId,{x:e.clientX,y:e.clientY});const [a,b]=[...pts.values()];const d=Math.hypot(a.x-b.x,a.y-b.y);if(pinch>0)zoom=THREE.MathUtils.clamp(zoom*pinch/d,.4,1.15);pinch=d;return;}const s=.0042*(camera.fov/60);yaw=THREE.MathUtils.clamp(yaw+(e.clientX-p.x)*s,-1.5,1.5);pitch=THREE.MathUtils.clamp(pitch+(e.clientY-p.y)*s,-.6,.6);pts.set(e.pointerId,{x:e.clientX,y:e.clientY});});
  const up2=e=>{pts.delete(e.pointerId);if(pts.size<2)pinch=0;};el.addEventListener('pointerup',up2);el.addEventListener('pointercancel',up2);
  el.addEventListener('wheel',e=>{e.preventDefault();zoom=THREE.MathUtils.clamp(zoom*(e.deltaY>0?1.08:1/1.08),.4,1.15);},{passive:false});
  el.addEventListener('dblclick',()=>{yaw=0;pitch=0;zoom=1;});
  function nudge(dy,dp){yaw=THREE.MathUtils.clamp(yaw+dy,-1.5,1.5);pitch=THREE.MathUtils.clamp(pitch+dp,-.6,.6);}
  return {enter,exit,nudge,reset:()=>{yaw=0;pitch=0;zoom=1;},active:()=>active,state:()=>({seat:selected&&selected.id,animating:!!anim,camera:camera.position.toArray().map(v=>+v.toFixed(2)),fov:+camera.fov.toFixed(1)})};
}
