// Approximate 3D The Star Theatre for the /star seat view. Built lazily on first seat click.
// Rake, balcony heights and stage size are approximate. Last Circle 2 row is about 56 m from the stage.
import * as THREE from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
const L=require('./star-3d-layout.cjs');
const {F,STAGE,CEIL,LV,STALLS_BACK,floorY,rows,boxes,wallAt,WZ0,WZ1,TARGET,target}=L;

function canvasTex(w,h,draw,rx=1,ry=1){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(rx,ry);t.anisotropy=4;return t;}

export function createTheatre(container){
  let renderer;
  try{renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});}catch(e){return null;}
  if(!renderer.getContext())return null;
  const narrow=(typeof matchMedia==='function'&&matchMedia('(max-width:768px)').matches)||(typeof innerWidth==='number'&&innerWidth<900);
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,narrow?1.45:1.6));
  renderer.setClearColor(0x0c0a08);
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.18;
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);
  const scene=new THREE.Scene();
  scene.fog=new THREE.Fog(0x14110e,70,170);
  const camera=new THREE.PerspectiveCamera(60,1,.05,260);
  scene.add(new THREE.HemisphereLight(0xffe6d0,0x2a2018,1.35));
  scene.add(new THREE.AmbientLight(0xffe0c0,.28));
  const key=new THREE.DirectionalLight(0xfff4e6,.7);key.position.set(0,28,12);scene.add(key);
  const fill=new THREE.DirectionalLight(0xd8c8b0,.45);fill.position.set(0,16,70);scene.add(fill);
  const stageSpot=new THREE.SpotLight(0xfff0d8,260,70,.4,.65,1.4);stageSpot.position.set(0,16,12);stageSpot.target.position.set(0,2.2,-6);scene.add(stageSpot,stageSpot.target);
  const stageWash=new THREE.PointLight(0xffd8a0,40,28,1.6);stageWash.position.set(0,8,-6);scene.add(stageWash);

  const mat=(color,o={})=>new THREE.MeshStandardMaterial({color,roughness:.8,...o});
  const glow=c=>new THREE.MeshBasicMaterial({color:c});
  const DS=THREE.DoubleSide;
  const wood=canvasTex(256,512,(c,w,h)=>{const g=c.createLinearGradient(0,0,0,h);g.addColorStop(0,'#4a301c');g.addColorStop(.5,'#6a4630');g.addColorStop(1,'#3a2418');c.fillStyle=g;c.fillRect(0,0,w,h);for(let x=0;x<w;x+=18){c.fillStyle='rgba(20,10,6,.45)';c.fillRect(x,0,3,h);c.fillStyle='rgba(210,170,120,.1)';c.fillRect(x+5,0,2,h);}for(let y=0;y<h;y+=140){c.fillStyle='rgba(10,6,4,.4)';c.fillRect(0,y,w,4);}});
  const carpet=canvasTex(256,256,(c,w,h)=>{c.fillStyle='#2a1c16';c.fillRect(0,0,w,h);c.fillStyle='rgba(0,0,0,.22)';for(let i=0;i<500;i++)c.fillRect(Math.random()*w,Math.random()*h,2,2);c.strokeStyle='rgba(120,80,40,.12)';c.lineWidth=2;for(let i=0;i<w;i+=40){c.beginPath();c.moveTo(i,0);c.lineTo(i,h);c.stroke();}},.7,.7);
  const curtainTex=canvasTex(512,256,(c,w,h)=>{for(let x=0;x<w;x++){const v=.5+.5*Math.sin(x/w*Math.PI*2*16);const r=Math.round(40+50*v),g=Math.round(14+16*v),b=Math.round(10+10*v);c.fillStyle=`rgb(${r},${g},${b})`;c.fillRect(x,0,1,h);}const g=c.createLinearGradient(0,0,0,h);g.addColorStop(0,'rgba(0,0,0,.5)');g.addColorStop(.3,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,.3)');c.fillStyle=g;c.fillRect(0,0,w,h);});
  const woodM=new THREE.MeshStandardMaterial({map:wood,roughness:.7,emissive:0x1a0e08,side:DS});
  const carpetM=new THREE.MeshStandardMaterial({map:carpet,roughness:1,side:DS});
  const soffitM=mat(0x2a221c,{side:DS});const plasterM=mat(0x3a322c,{side:DS,roughness:.9});
  const fasciaIn=mat(0x4a382c,{roughness:.6,side:THREE.BackSide});const fasciaOut=mat(0x2a1c14,{roughness:.8,side:THREE.FrontSide});
  const velvetM=mat(0xa8481c,{roughness:.95,side:DS});
  const darkM=mat(0x0c0a08,{side:DS});
  const goldM=new THREE.MeshStandardMaterial({color:0xc9a46c,metalness:.45,roughness:.4,emissive:0x3a2a10});
  const stageM=mat(0x6a6a68,{roughness:.55});
  const lightM=glow(0xffe6c0);
  const scenery=new THREE.Group();scene.add(scenery);
  const add=(geo,m,x=0,y=0,z=0)=>{const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);scenery.add(o);return o;};
  const TH=.85;
  const band=(R,y0,y1,m,t=TH)=>add(new THREE.CylinderGeometry(R,R,y1-y0,64,1,true,-t,2*t),m,0,(y0+y1)/2,-F);
  function polar(R0,R1,yfn,m,nr=32,nt=64,t=TH){const pos=[],uv=[],idx=[];for(let i=0;i<=nr;i++){const R=R0+(R1-R0)*i/nr,y=yfn(R);for(let j=0;j<=nt;j++){const th=-t+2*t*j/nt;pos.push(R*Math.sin(th),y,-F+R*Math.cos(th));uv.push(R*Math.sin(th)/4,R*Math.cos(th)/4);}}for(let i=0;i<nr;i++)for(let j=0;j<nt;j++){const a=i*(nt+1)+j,b=a+nt+1;idx.push(a,b,a+1,b,b+1,a+1);}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return add(g,m);}
  const ring=(R0,R1,y,m,t=TH)=>{const g=new THREE.RingGeometry(R0,R1,64,1,-Math.PI/2-t,2*t);g.rotateX(-Math.PI/2);return add(g,m,0,y,-F);};

  // Stage, apron and proscenium (widths and height are approximate)
  const apron=new THREE.Mesh(new THREE.CylinderGeometry(F,F,STAGE.floor,64,1,false,-.62,1.24),[darkM,stageM,stageM]);apron.position.set(0,STAGE.floor/2,-F);scenery.add(apron);
  add(new THREE.BoxGeometry(2*STAGE.proHalf+4,STAGE.floor,22),stageM,0,STAGE.floor/2,-14);
  add(new THREE.BoxGeometry(2*STAGE.proHalf+6,24,.4),darkM,0,12,-24);
  const pw=STAGE.proHalf,pz=STAGE.proZ,top=STAGE.proTop,hw=Math.max(wallAt(Math.max(0,pz))+.5,pw+6);
  add(new THREE.BoxGeometry(hw-pw,CEIL+1,.5),woodM,-(pw+hw)/2,CEIL/2,pz-.25);
  add(new THREE.BoxGeometry(hw-pw,CEIL+1,.5),woodM,(pw+hw)/2,CEIL/2,pz-.25);
  add(new THREE.BoxGeometry(2*hw,CEIL-top+1,.5),woodM,0,(top+CEIL)/2,pz-.25);
  add(new THREE.BoxGeometry(2*pw+3,.2,.25),goldM,0,top+.2,pz+.08);
  add(new THREE.BoxGeometry(2*pw+.2,.1,.1),lightM,0,top-.28,pz+.4);
  add(new THREE.PlaneGeometry(2*pw,top-STAGE.floor),new THREE.MeshStandardMaterial({map:curtainTex,roughness:.95,emissive:0x100804}),0,(top+STAGE.floor)/2,pz-1.0);

  // House floors from the seat envelope so the horseshoe void stays open
  function intervalsAt(seats,z,win,pad){
    const xs=seats.filter(s=>Math.abs(s.z-z)<=win).map(s=>s.x).sort((a,b)=>a-b);
    if(!xs.length)return [];
    const g=[];for(const x of xs){if(!g.length||x-g[g.length-1][g[g.length-1].length-1]>3.2)g.push([x]);else g[g.length-1].push(x);}
    return g.map(a=>({x0:a[0]-pad,x1:a[a.length-1]+pad}));
  }
  function loftFloor(seats,yfn,pad,m){
    const zs=seats.map(s=>s.z),z0=Math.min(...zs)-1.0,z1=Math.max(...zs)+1.4,step=.7;
    const pos=[],uv=[],idx=[];let base=0;let prev=null,prevZ=null;
    for(let z=z0;z<=z1+1e-6;z+=step){
      const iv=intervalsAt(seats,z,step*1.25,pad);if(!iv.length){prev=null;continue;}
      // use outer left to right if a single span, else keep separate arms
      const bands=iv;
      if(prev&&prev.length===bands.length){
        for(let b=0;b<bands.length;b++){
          const a=prev[b],c=bands[b],y0=yfn(prevZ),y1=yfn(z);
          const p=pos.length/3;
          pos.push(a.x0,y0,prevZ,a.x1,y0,prevZ,c.x0,y1,z,c.x1,y1,z);
          uv.push(a.x0/4,prevZ/4,a.x1/4,prevZ/4,c.x0/4,z/4,c.x1/4,z/4);
          idx.push(p,p+2,p+1,p+1,p+2,p+3);
        }
      }
      prev=bands;prevZ=z;
    }
    if(idx.length<3)return;
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();add(g,m);
  }
  const byLv=id=>L.seats.filter(s=>s.level===id&&s.kind!=='box');
  loftFloor(byLv('stalls'),z=>floorY.stalls(z)-.03,1.7,carpetM);
  loftFloor(byLv('circle1'),z=>floorY.circle1(z)-.03,1.7,carpetM);
  loftFloor(byLv('circle2'),z=>floorY.circle2(z)-.03,1.7,carpetM);

  function balconyFace(id,soffitFn){
    const seats=byLv(id);if(!seats.length)return;
    const front=seats.filter(s=>{
      const inward=seats.some(o=>o!==s&&Math.hypot(o.x-s.x,o.z-s.z)<2.8&&Math.hypot(o.x,o.z)+.6<Math.hypot(s.x,s.z));
      return !inward;
    });
    // Parapet along the inner rail
    const g=new THREE.BoxGeometry(.08,.7,.55);const im=new THREE.InstancedMesh(g,fasciaOut,front.length);const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),Y=new THREE.Vector3(0,1,0);
    front.forEach((s,i)=>{q.setFromAxisAngle(Y,s.yaw||0);m4.compose(new THREE.Vector3(s.x-Math.sin(s.yaw||0)*.45,s.y+.45,s.z-Math.cos(s.yaw||0)*.45),q,new THREE.Vector3(1,1,1));im.setMatrixAt(i,m4);});
    scenery.add(im);
    const rail=new THREE.InstancedMesh(new THREE.BoxGeometry(.07,.07,.55),goldM,front.length);
    front.forEach((s,i)=>{q.setFromAxisAngle(Y,s.yaw||0);m4.compose(new THREE.Vector3(s.x-Math.sin(s.yaw||0)*.45,s.y+.82,s.z-Math.cos(s.yaw||0)*.45),q,new THREE.Vector3(1,1,1));rail.setMatrixAt(i,m4);});
    scenery.add(rail);
  }
  balconyFace('circle1');
  balconyFace('circle2');

  // Side walls follow the outer envelope
  {const pos=[],uv=[],idx=[];const zs=[];for(let z=WZ0-.5;z<=WZ1+4;z+=.5)zs.push(z);for(const sg of [-1,1]){const base=pos.length/3;zs.forEach((z)=>{const x=sg*wallAt(z);pos.push(x,-1,z,x,CEIL+.5,z);uv.push(z/2.2,0,z/2.2,(CEIL+1.5)/6);});for(let i=0;i<zs.length-1;i++){const a=base+i*2;idx.push(a,a+2,a+1,a+1,a+2,a+3);}}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();add(g,woodM);
    for(const sg of [-1,1])for(let z=8;z<50;z+=8)add(new THREE.BoxGeometry(.05,.05,1.4),glow(0xffd4a0),sg*(wallAt(z)-.04),4.0,z);}
  // Dark ceiling with lighting bridges
  const midW=Math.max(wallAt(24),wallAt(40))*2+2;
  add(new THREE.BoxGeometry(midW+8,.4,WZ1+12),darkM,0,CEIL+.2,(WZ1-3)/2);
  for(const z of [6,14,22,32,42]){add(new THREE.BoxGeometry(Math.max(8,2*wallAt(z)-.8),.55,1.1),mat(0x16120e),0,CEIL-.55,z);add(new THREE.BoxGeometry(Math.max(6,2*wallAt(z)-1.4),.04,.08),lightM,0,CEIL-.84,z);}

  // Boxes on the stalls side walls
  for(const b of boxes){
    const sg=b.side,ix=sg*(b.wall-b.depth),cx=sg*(b.wall-b.depth/2),z0=b.zc-b.len/2;
    add(new THREE.BoxGeometry(b.depth,.35,b.len),soffitM,cx,b.y-.18,b.zc);
    add(new THREE.BoxGeometry(b.depth*.55,.3,b.len),carpetM,sg*(b.wall-b.depth*.275),b.y+.15,b.zc);
    add(new THREE.BoxGeometry(.1,.68,b.len),velvetM,ix,b.y+.34,b.zc);
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
  const frameM=mat(0x4a2a18,{roughness:.7});
  const upI=new THREE.InstancedMesh(upG,velvet,chairs.length),frI=new THREE.InstancedMesh(frG,frameM,chairs.length);
  const base=new THREE.Color(0xc45a20),boxC=new THREE.Color(0xb44e1c),holdC=new THREE.Color(0xa88860),restC=new THREE.Color(0x8a2818),emC=new THREE.Color(0x2a3a6a),gold=new THREE.Color(0xf0c850);
  const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),one=new THREE.Vector3(1,1,1),zero=new THREE.Vector3(0,0,0),Y=new THREE.Vector3(0,1,0);
  const index=new Map();
  function place(i,s,scale){q.setFromAxisAngle(Y,s.yaw||0);m4.compose(new THREE.Vector3(s.x,s.y,s.z),q,scale);upI.setMatrixAt(i,m4);frI.setMatrixAt(i,m4);}
  const colorOf=s=>s.kind==='box'?boxC:s.tag==='hold'?holdC:s.tag==='restricted'?restC:s.tag==='emergency'?emC:base;
  chairs.forEach((s,i)=>{index.set(s.id,i);place(i,s,one);upI.setColorAt(i,colorOf(s));});
  scene.add(upI,frI);
  const wheels=L.seats.filter(s=>s.kind==='wheel');
  {const g=new THREE.RingGeometry(.28,.36,20);g.rotateX(-Math.PI/2);const im=new THREE.InstancedMesh(g,glow(0xc9a46c),wheels.length);wheels.forEach((s,i)=>{m4.makeTranslation(s.x,s.y+.02,s.z);im.setMatrixAt(i,m4);});scene.add(im);}
  const marker=new THREE.Mesh(new THREE.RingGeometry(.3,.42,24).rotateX(-Math.PI/2),glow(0xf0d78a));scene.add(marker);marker.visible=false;

  let selected=null,hidden=-1,active=false,raf=0,anim=null,yaw=0,pitch=0,zoom=1;
  const stage=new THREE.Vector3(TARGET.x,TARGET.y,TARGET.z);
  let curve=null,seatEye=new THREE.Vector3();
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
    const p0=new THREE.Vector3(0,16,2);
    const p1=new THREE.Vector3(seatEye.x*.5,seatEye.y,Math.max(2,seatEye.z-14));
    const pm=p0.clone().lerp(p1,.55);pm.y=Math.max(pm.y,p1.y+1.4);
    curve=new THREE.CatmullRomCurve3([p0,pm,p1,seatEye.clone()],false,'centripetal');
    const instant=opts.instant||reduced.matches;
    anim=instant?null:{start:performance.now(),dur:2300};
    if(!active){active=true;cancelAnimationFrame(raf);raf=requestAnimationFrame(frame);}
    return true;
  }
  function exit(){active=false;cancelAnimationFrame(raf);anim=null;}
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
