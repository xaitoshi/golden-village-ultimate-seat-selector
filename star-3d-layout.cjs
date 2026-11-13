// Approximate 3D layout for the unofficial Star Theatre model.
// World units are metres. Stage lip (centre) at z=0, audience toward +z, stalls floor at the front is y=0.
// Plan x and y become floor plan x and z, so the published horseshoe is kept. Each level has its own scale.
// Rake, balcony heights and stage size are approximate. The last Circle 2 row sits about 56 m from the stage, matching the published furthest seat figure.
const {LEVELS,LEVEL_ORDER}=require('./star-model.cjs');
const F=16;
const STAGE={floor:1.1,proZ:-3.2,proHalf:11,proTop:12.2,lipR:F};
const CEIL=24;
const LV_IN={
  stalls:{d0:8.0,d1:32.0,width:43.0,y0:0},
  circle1:{d0:9.5,d1:46.0,width:47.0,y0:9.0,slope:.08},
  circle2:{d0:11.0,d1:56.0,width:48.0,y0:15.6,slope:.07},
};
function stallsY(d){return d<8?0:(d-8)*0.09+Math.max(0,d-18)*0.06;}
function circle1Y(d){return LV_IN.circle1.y0+LV_IN.circle1.slope*Math.max(0,d-LV_IN.circle1.d0);}
function circle2Y(d){return LV_IN.circle2.y0+LV_IN.circle2.slope*Math.max(0,d-LV_IN.circle2.d0);}
const floorY={stalls:stallsY,circle1:circle1Y,circle2:circle2Y};

const out=[];const rowsByLevel={};
for(const id of LEVEL_ORDER){
  const lv=LEVELS[id],cfg=LV_IN[id];
  const ss=lv.seats.filter(s=>!s.box);
  const xs=ss.map(s=>s.x),ys=ss.map(s=>s.y);
  const xmin=Math.min(...xs),xmax=Math.max(...xs),ymin=Math.min(...ys),ymax=Math.max(...ys);
  const cx=(xmin+xmax)/2;
  const sx=cfg.width/(xmax-xmin);
  const sy=(cfg.d1-cfg.d0)/(ymax-ymin);
  const rows=new Map();
  for(const s of ss){if(!s.row)continue;if(!rows.has(s.row))rows.set(s.row,[]);rows.get(s.row).push(s);}
  const list=[...rows].map(([r,arr])=>({r,ss:arr.sort((a,b)=>a.x-b.x),yMed:arr.map(s=>s.y).sort((a,b)=>a-b)[Math.floor(arr.length/2)]})).sort((a,b)=>a.yMed-b.yMed);
  const meta=[];
  for(const row of list){
    let tmin=Infinity,tmax=-Infinity,dMed=0;
    for(const s of row.ss){
      const x=(s.x-cx)*sx;
      const z=cfg.d0+(s.y-ymin)*sy;
      const yaw=Math.atan2(x,z+F);
      const y=floorY[id](z);
      out.push({id:s.id,level:id,kind:s.kind,tag:s.tag||null,row:row.r,x,y,z,yaw,d:z,R:F+z});
      const th=yaw;tmin=Math.min(tmin,th);tmax=Math.max(tmax,th);dMed+=z;
    }
    dMed/=row.ss.length;
    meta.push({row:row.r,d:dMed,R:F+dMed,y:floorY[id](dMed),tmin,tmax});
  }
  rowsByLevel[id]=meta;
}

function clusterRows(meta){
  const sorted=[...meta].sort((a,b)=>a.d-b.d);const out=[];
  for(const r of sorted){
    if(!out.length||r.d-out[out.length-1].d>0.45){out.push({row:r.row,d:r.d,y:r.y,R:r.R,tmin:r.tmin,tmax:r.tmax,n:1});}
    else{const c=out[out.length-1];c.d=(c.d*c.n+r.d)/(c.n+1);c.y=(c.y*c.n+r.y)/(c.n+1);c.R=F+c.d;c.tmin=Math.min(c.tmin,r.tmin);c.tmax=Math.max(c.tmax,r.tmax);c.n++;}
  }
  return out;
}
for(const id of LEVEL_ORDER)rowsByLevel[id]=clusterRows(rowsByLevel[id]||[]);
const STALLS_BACK=LV_IN.stalls.d1+1.0;
const LV={
  stalls:{pitch:.54,row:.9,d0:LV_IN.stalls.d0,front:LV_IN.stalls.d0-.6},
  circle1:{pitch:.54,row:.95,d0:LV_IN.circle1.d0,front:LV_IN.circle1.d0-.9,y0:LV_IN.circle1.y0,slope:LV_IN.circle1.slope,soffitFront:8.05,soffitBack:9.5,back:STALLS_BACK},
  circle2:{pitch:.54,row:.92,d0:LV_IN.circle2.d0,front:LV_IN.circle2.d0-.9,y0:LV_IN.circle2.y0,slope:LV_IN.circle2.slope,soffitFront:14.5,soffitBack:16.6,back:0},
};

const WZ0=-4,WZ1=62,WSTEP=.5;const halfW=[];
for(let z=WZ0;z<=WZ1+1e-6;z+=WSTEP){let m=12;for(const s of out)if(Math.abs(s.z-z)<2.2)m=Math.max(m,Math.abs(s.x)+1.8);halfW.push(m);}
// Walls follow the horseshoe: never narrower than a slightly smoothed running envelope
for(let i=1;i<halfW.length;i++)halfW[i]=Math.max(halfW[i],halfW[i-1]-0.35);
function wallAt(z){const i=Math.max(0,Math.min(halfW.length-1,Math.round((z-WZ0)/WSTEP)));return halfW[i];}

const boxes=[];
const BOX={stalls:{zc:[8.2],floor:[3.2],order:{left:['A'],right:['C']}}};
for(const id of ['stalls']){
  const cfg=BOX[id];
  for(const side of ['left','right']){
    cfg.order[side].forEach((b,i)=>{
      const sg=side==='left'?-1:1,zc=cfg.zc[i],fy=cfg.floor[i],wx=wallAt(zc);
      boxes.push({level:id,box:b,side:sg,zc,y:fy,wall:wx,len:3.4,depth:2.3});
      const ss=LEVELS[id].seats.filter(s=>s.box===b).sort((a,b2)=>a.num-b2.num);
      const cx=sg*(wx-1.35),cz=zc;
      let dx=0-cx,dz=STAGE.proZ-cz;const dl=Math.hypot(dx,dz)||1;dx/=dl;dz/=dl;
      const yaw=Math.atan2(cx,cz+F);
      ss.forEach((s,k)=>{
        const back=k>=5,sidek=(k%2?1:-1)*.32,f=back?-.4:.55;
        const x=cx+dx*f+dz*sidek,z=cz+dz*f-dx*sidek;
        out.push({id:s.id,level:id,kind:'box',box:b,x,y:fy+(back?.28:0),z,yaw,d:Math.max(0,z),R:0});
      });
    });
  }
}
const byId=new Map(out.map(s=>[s.id,s]));
const EYE=1.15;
function eye(s){const e=s.kind==='wheel'?1.25:EYE,b=.1;const yaw=s.yaw||0;return {x:s.x+Math.sin(yaw)*b,y:s.y+e,z:s.z+Math.cos(yaw)*b};}
const TARGET={x:0,y:5.8,z:-3.8};
function target(e){const d=Math.hypot(e.x,e.z+4,e.y-STAGE.floor);return {x:0,y:STAGE.floor+Math.max(1.2,Math.min(3.4,.3+d*.06)),z:-4.2};}
module.exports={F,STAGE,CEIL,LV,STALLS_BACK,floorY,seats:out,byId,rows:rowsByLevel,boxes,wallAt,WZ0,WZ1,eye,TARGET,target};
