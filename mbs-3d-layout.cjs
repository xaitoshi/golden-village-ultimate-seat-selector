// Approximate 3D layout for the unofficial Sands Theatre model.
// World units are metres. Stage lip (centre) at z=0, audience toward +z, stalls floor at the pit is y=0.
// Rows are concentric arcs around a focal point F metres behind the stage lip.
const {LEVELS,LEVEL_ORDER}=require('./mbs-model.cjs');
const F=16;
const STAGE={floor:1.05,proZ:-3,proHalf:8,proTop:11.05,lipR:F};
const CEIL=26.5;
const LV={
  stalls:{pitch:.52,row:.86,d0:1.3},
  dress:{pitch:.52,row:.95,d0:20.2,front:19.6,y0:7.8,slope:.47,soffitFront:7.0,soffitBack:8.3,back:24.2},
  grand:{pitch:.52,row:.88,d0:24.6,front:24.0,y0:12.8,slope:.48,slope2:.62,break:30.6,back:0},
};
const STALLS_BACK=35.2;
function stallsY(d){return d<4?0:(d-4)*.09+Math.max(0,d-14)*.07;}
function dressY(d){return LV.dress.y0+LV.dress.slope*Math.max(0,d-LV.dress.d0);}
function grandY(d){const g=LV.grand;return g.y0+g.slope*Math.max(0,Math.min(d,g.break)-g.d0)+g.slope2*Math.max(0,d-g.break);}
const floorY={stalls:stallsY,dress:dressY,grand:grandY};
function median(a){const b=[...a].sort((x,y)=>x-y);return b[Math.floor(b.length/2)];}

const out=[];const rowsByLevel={};
for(const id of LEVEL_ORDER){
  const lv=LEVELS[id],cfg=LV[id];
  const rows=new Map();
  for(const s of lv.seats){if(s.box)continue;if(!rows.has(s.row))rows.set(s.row,[]);rows.get(s.row).push(s);}
  const list=[...rows].map(([r,ss])=>({r,ss:ss.sort((a,b)=>a.x-b.x),base:Math.min(...ss.map(s=>s.y))})).sort((a,b)=>a.base-b.base);
  const dx=[];for(const r of list)for(let i=1;i<r.ss.length;i++)dx.push(r.ss[i].x-r.ss[i-1].x);
  const px=Math.min(...dx.filter(v=>v>1));
  const dy=[];for(let i=1;i<list.length;i++)dy.push(list[i].base-list[i-1].base);
  const py=median(dy);
  const sx=cfg.pitch/px,sy=cfg.row/py;
  const meta=[];
  for(const r of list){
    const d=cfg.d0+(r.base-list[0].base)*sy,R=F+d,y=floorY[id](d);
    let tmin=Infinity,tmax=-Infinity;
    for(const s of r.ss){
      const th=((s.x-800)*sx)/R;tmin=Math.min(tmin,th);tmax=Math.max(tmax,th);
      out.push({id:s.id,level:id,kind:s.kind,row:r.r,x:R*Math.sin(th),y,z:-F+R*Math.cos(th),yaw:th,d,R});
    }
    meta.push({row:r.r,d,R,y,tmin,tmax});
  }
  rowsByLevel[id]=meta;
}
// Side wall half width from the seats, never narrower going back
const WZ0=-3,WZ1=46,WSTEP=.5;const halfW=[];
for(let z=WZ0;z<=WZ1+1e-6;z+=WSTEP){let m=9.4;for(const s of out)if(Math.abs(s.z-z)<1.4)m=Math.max(m,Math.abs(s.x)+1.6);halfW.push(m);}
for(let i=1;i<halfW.length;i++)halfW[i]=Math.max(halfW[i],halfW[i-1]);
function wallAt(z){const i=Math.max(0,Math.min(halfW.length-1,Math.round((z-WZ0)/WSTEP)));return halfW[i];}
// Boxes along the side walls. Dress boxes 6,5,4 (left) and 1,2,3 (right) from the stage back; grand boxes 8 (left) and 7 (right).
const BOX={
  dress:{zc:[6.5,10.5,14.5],floor:[6.0,6.4,6.8],order:{left:['6','5','4'],right:['1','2','3']}},
  grand:{zc:[20.8],floor:[11.4],order:{left:['8'],right:['7']}},
};
const boxes=[];
for(const id of ['dress','grand']){
  const cfg=BOX[id];
  for(const side of ['left','right']){
    cfg.order[side].forEach((b,i)=>{
      const sg=side==='left'?-1:1,zc=cfg.zc[i],fy=cfg.floor[i],wx=wallAt(zc+1.6);
      boxes.push({level:id,box:b,side:sg,zc,y:fy,wall:wx,len:3.2,depth:2.25});
      const ss=LEVELS[id].seats.filter(s=>s.box===b).sort((a,b2)=>a.num-b2.num);
      // Two rows of two facing the stage: front pair by the parapet, back pair raised behind
      const cx=sg*(wx-1.25),cz=zc;let dx=0-cx,dz=STAGE.proZ-cz;const dl=Math.hypot(dx,dz);dx/=dl;dz/=dl;
      const yaw=Math.atan2(cx-0,cz-STAGE.proZ);
      ss.forEach((s,k)=>{
        const back=k>=2,side=(k%2?1:-1)*.32,f=back?-.42:.55;
        const x=cx+dx*f+dz*side,z=cz+dz*f-dx*side;
        out.push({id:s.id,level:id,kind:'box',box:b,x,y:fy+(back?.3:0),z,yaw,d:z,R:0});
      });
    });
  }
}
const byId=new Map(out.map(s=>[s.id,s]));
const EYE=1.15;
function eye(s){const e=s.kind==='wheel'?1.25:EYE,b=.1;return {x:s.x+Math.sin(s.yaw)*b,y:s.y+e,z:s.z+Math.cos(s.yaw)*b};}
const TARGET={x:0,y:5.6,z:-3.5};
// Look at the curtain, a little higher the further away the seat is
function target(e){const d=Math.hypot(e.x,e.z+4,e.y-STAGE.floor);return {x:0,y:STAGE.floor+Math.max(1.1,Math.min(3.4,.3+d*.075)),z:-4};}
module.exports={F,STAGE,CEIL,LV,STALLS_BACK,floorY,seats:out,byId,rows:rowsByLevel,boxes,wallAt,WZ0,WZ1,eye,TARGET,target};
