const model=require('./mbs-model.cjs');
const {plan,LEVELS,LEVEL_ORDER,info,find}=model;
const C=plan.defs;

const map=document.getElementById('map');
const decoG=document.getElementById('deco');
const seatsG=document.getElementById('seats');
const tip=document.getElementById('tip');
const seatName=document.getElementById('seat-name');
const seatType=document.getElementById('seat-type');
const seatCount=document.getElementById('seat-count');
const clearBtn=document.getElementById('clear');
const notesBtn=document.getElementById('notes-btn');
const notes=document.getElementById('notes');
const closeNotes=document.getElementById('close');
const zoomIn=document.getElementById('zoom-in');
const zoomOut=document.getElementById('zoom-out');
const zoomReset=document.getElementById('zoom-reset');
const levelBtns=[...document.querySelectorAll('.levels button')];
const hint=document.getElementById('hint');

const NS='http://www.w3.org/2000/svg';
let levelId='stalls';
let sel=null;
let hover=null;
let vb={x:0,y:0,w:1,h:1};
const pointers=new Map();
let drag=null;
let lastPinch=null;
let moved=false;

function svgEl(name,attrs){
  const el=document.createElementNS(NS,name);
  for(const [k,v] of Object.entries(attrs||{}))el.setAttribute(k,v);
  return el;
}

function decoMarkup(lv){
  return `${lv.defs}${lv.background}${lv.decorations.join('')}`;
}

function paintSeats(){
  const lv=LEVELS[levelId];
  seatsG.replaceChildren();
  const frag=document.createDocumentFragment();
  for(const s of lv.seats){
    const g=svgEl('g',{
      class:'seat'+(s.kind==='wheel'?' wheel':s.kind==='pit'?' pit':s.kind==='box'?' box':'')+(sel&&sel.id===s.id?' on':''),
      transform:`translate(${s.x} ${s.y}) rotate(${s.rot})`,
      'data-id':s.id
    });
    const w=s.w,h=s.h,rx=2.4,bw=Math.max(1.6,h*0.28);
    g.appendChild(svgEl('rect',{x:(-w/2).toFixed(2),y:(-h/2).toFixed(2),width:w.toFixed(2),height:h.toFixed(2),rx:rx,ry:rx}));
    if(s.kind!=='wheel')g.appendChild(svgEl('rect',{class:'back',x:(-w/2).toFixed(2),y:(h/2-bw).toFixed(2),width:w.toFixed(2),height:bw.toFixed(2),rx:(rx*0.7).toFixed(2),ry:(rx*0.7).toFixed(2)}));
    frag.appendChild(g);
  }
  seatsG.appendChild(frag);
}

function showLevel(id,keepSel){
  if(!LEVELS[id])return;
  levelId=id;
  const lv=LEVELS[id];
  const doc=new DOMParser().parseFromString('<svg xmlns="'+NS+'">'+decoMarkup(lv)+'</svg>','image/svg+xml');
  decoG.replaceChildren(...[...doc.documentElement.childNodes]);
  if(!keepSel||!sel||sel.level!==id)sel=null;
  hover=null;
  paintSeats();
  hideTip();
  renderChrome();
  fit();
  levelBtns.forEach(b=>{
    const on=b.dataset.level===id;
    b.setAttribute('aria-pressed',on?'true':'false');
    b.classList.toggle('on',on);
  });
}

function setVB(){map.setAttribute('viewBox',`${vb.x} ${vb.y} ${vb.w} ${vb.h}`);}

function viewport(){
  const r=map.getBoundingClientRect();
  return {w:Math.max(1,r.width),h:Math.max(1,r.height),r};
}

function fit(){
  vb=fitBox();
  setVB();
}

function contentBox(lv){
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  for(const s of lv.seats){
    minX=Math.min(minX,s.x-s.w/2-18);
    maxX=Math.max(maxX,s.x+s.w/2+18);
    minY=Math.min(minY,s.y-s.h/2-8);
    maxY=Math.max(maxY,s.y+s.h/2+10);
  }
  // Keep the gold proscenium and level title in frame (panel originates near y=24, stage ~520 wide at x=800)
  minY=Math.min(minY,16);
  minX=Math.min(minX,800-340);
  maxX=Math.max(maxX,800+340);
  return {x:minX,y:minY,w:maxX-minX,h:maxY-minY};
}

function safeViewport(){
  const mapR=map.getBoundingClientRect();
  const boxOf=sel=>document.querySelector(sel)?.getBoundingClientRect();
  const header=boxOf('header'),tabs=boxOf('.tabs'),intro=boxOf('.intro');
  const levels=boxOf('.levels'),zoom=boxOf('.zoom'),legend=boxOf('.legend');
  const bottom=boxOf('.bottom'),disc=boxOf('.disclaimer');
  const narrow=mapR.width<=1100;
  let top=mapR.top,left=mapR.left,right=mapR.right,bot=mapR.bottom;
  if(header)top=Math.max(top,header.bottom);
  if(tabs)top=Math.max(top,tabs.bottom);
  if(narrow){
    if(intro)top=Math.max(top,intro.bottom);
    if(levels)top=Math.max(top,levels.bottom);
  }else{
    if(intro&&intro.right<mapR.left+mapR.width*0.48)left=Math.max(left,intro.right);
    if(levels&&levels.left>mapR.left+mapR.width*0.5)right=Math.min(right,levels.left);
    if(zoom)right=Math.min(right,zoom.left);
  }
  if(legend)bot=Math.min(bot,legend.top);
  if(bottom)bot=Math.min(bot,bottom.top);
  if(disc)bot=Math.min(bot,disc.top);
  const pad=10;
  return {x:left-mapR.left+pad,y:top-mapR.top+pad,w:Math.max(80,right-left-pad*2),h:Math.max(80,bot-top-pad*2),mapR};
}

function fitBox(){
  const box=contentBox(LEVELS[levelId]);
  const safe=safeViewport();
  const mapW=Math.max(1,safe.mapR.width), mapH=Math.max(1,safe.mapR.height);
  const pad=20;
  const scale=Math.min(safe.w/(box.w+pad*2),safe.h/(box.h+pad*2));
  const planW=mapW/scale, planH=mapH/scale;
  const cx=box.x+box.w/2, cy=box.y+box.h/2;
  const sx=safe.x+safe.w/2, sy=safe.y+safe.h/2;
  return {x:cx-(sx/mapW)*planW,y:cy-(sy/mapH)*planH,w:planW,h:planH};
}
function clampZoom(nextW){
  const {w}=viewport();
  const minW=fitBox().w; // most zoomed out, matches Fit
  const maxW=Math.max(80,(11*w)/40); // a seat can reach ~40 css px
  return Math.min(minW,Math.max(maxW,nextW));
}

function zoomAt(clientX,clientY,factor){
  const p=clientToPlan(clientX,clientY);
  if(!p)return;
  const {w,h}=viewport();
  const aspect=vb.w/vb.h;
  let nw=clampZoom(vb.w/factor);
  let nh=nw/aspect;
  // Keep the plan point under the cursor
  const rx=(p.x-vb.x)/vb.w, ry=(p.y-vb.y)/vb.h;
  vb={x:p.x-rx*nw,y:p.y-ry*nh,w:nw,h:nh};
  setVB();
}

function clientToPlan(clientX,clientY){
  if(!map.getScreenCTM())return null;
  const pt=map.createSVGPoint();
  pt.x=clientX;pt.y=clientY;
  return pt.matrixTransform(map.getScreenCTM().inverse());
}

function seatAt(clientX,clientY){
  const p=clientToPlan(clientX,clientY);
  if(!p)return null;
  const {w}=viewport();
  const slop=Math.max(14*(vb.w/w), 8); // ~14 css px, at least 8 plan units
  let best=null,bestD=Infinity;
  for(const s of LEVELS[levelId].seats){
    const dx=p.x-s.x,dy=p.y-s.y;
    const a=-s.rot*Math.PI/180;
    const lx=dx*Math.cos(a)-dy*Math.sin(a);
    const ly=dx*Math.sin(a)+dy*Math.cos(a);
    const hw=s.w/2+slop, hh=s.h/2+slop;
    if(Math.abs(lx)<=hw&&Math.abs(ly)<=hh){
      const d=lx*lx+ly*ly;
      if(d<bestD){bestD=d;best=s;}
    }
  }
  return best;
}

function mark(s,on){
  if(!s)return;
  const el=seatsG.querySelector(`[data-id="${CSS.escape(s.id)}"]`);
  if(el)el.classList.toggle('on',on);
}

function renderChrome(){
  const lv=LEVELS[levelId];
  if(sel){
    const i=info(sel);
    seatName.textContent=i.label;
    seatType.textContent=i.type;
    if(clearBtn)clearBtn.disabled=false;
  }else{
    seatName.textContent='Pick a seat';
    seatType.textContent='Tap or click a chair, or zoom in first if the house looks tight';
    if(clearBtn)clearBtn.disabled=true;
  }
  if(seatCount)seatCount.textContent=`${lv.sold.toLocaleString('en-SG')} of ${plan.total.toLocaleString('en-SG')} seats on this plan`;
}

function hideTip(){if(tip){tip.hidden=true;}}

function showTip(s,clientX,clientY){
  if(!tip||!s)return hideTip();
  tip.hidden=false;
  tip.textContent=info(s).label;
  const {r}=viewport();
  let x=clientX-r.left+14, y=clientY-r.top-28;
  const tw=tip.offsetWidth||160, th=tip.offsetHeight||28;
  if(x+tw>r.width-8)x=clientX-r.left-tw-14;
  if(y<8)y=clientY-r.top+18;
  tip.style.transform=`translate(${x}px,${y}px)`;
}

function choose(id,opts){
  const s=typeof id==='string'?find(id):id;
  if(!s)return false;
  if(s.level!==levelId)showLevel(s.level,false);
  if(sel&&sel!==s)mark(sel,false);
  sel=s;
  mark(sel,true);
  renderChrome();
  if(opts&&opts.zoom){
    const {w,h}=viewport();
    const targetW=Math.min(vb.w, 420);
    const aspect=w/h;
    const nw=targetW, nh=nw/aspect;
    vb={x:s.x-nw/2,y:s.y-nh/2,w:nw,h:nh};
    setVB();
  }
  return true;
}

function clearSel(){
  if(sel)mark(sel,false);
  sel=null;
  renderChrome();
  hideTip();
}

levelBtns.forEach(b=>b.addEventListener('click',()=>showLevel(b.dataset.level)));
if(clearBtn)clearBtn.addEventListener('click',clearSel);
if(notesBtn&&notes)notesBtn.addEventListener('click',()=>notes.showModal());
if(closeNotes&&notes)closeNotes.addEventListener('click',()=>notes.close());
if(zoomIn)zoomIn.addEventListener('click',()=>{const {r}=viewport();zoomAt(r.left+r.width/2,r.top+r.height/2,1.28);});
if(zoomOut)zoomOut.addEventListener('click',()=>{const {r}=viewport();zoomAt(r.left+r.width/2,r.top+r.height/2,1/1.28);});
if(zoomReset)zoomReset.addEventListener('click',fit);

map.addEventListener('wheel',e=>{
  e.preventDefault();
  const factor=e.deltaY>0?1/1.18:1.18;
  zoomAt(e.clientX,e.clientY,factor);
},{passive:false});

map.addEventListener('pointerdown',e=>{
  map.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  moved=false;
  if(pointers.size===1){
    const p=clientToPlan(e.clientX,e.clientY);
    drag=p?{x:p.x,y:p.y,cx:e.clientX,cy:e.clientY}:null;
    lastPinch=null;
  }else if(pointers.size===2){
    drag=null;
    const pts=[...pointers.values()];
    const dx=pts[0].x-pts[1].x,dy=pts[0].y-pts[1].y;
    lastPinch={dist:Math.hypot(dx,dy),x:(pts[0].x+pts[1].x)/2,y:(pts[0].y+pts[1].y)/2};
  }
});

map.addEventListener('pointermove',e=>{
  if(pointers.has(e.pointerId))pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pointers.size===2&&lastPinch){
    const pts=[...pointers.values()];
    const dx=pts[0].x-pts[1].x,dy=pts[0].y-pts[1].y;
    const dist=Math.hypot(dx,dy);
    const midX=(pts[0].x+pts[1].x)/2, midY=(pts[0].y+pts[1].y)/2;
    if(lastPinch.dist>0)zoomAt(midX,midY,dist/lastPinch.dist);
    // pan to follow midpoint
    const p=clientToPlan(midX,midY);
    const prev=clientToPlan(lastPinch.x,lastPinch.y);
    if(p&&prev){vb.x+=prev.x-p.x;vb.y+=prev.y-p.y;setVB();}
    lastPinch={dist,x:midX,y:midY};
    moved=true;
    hideTip();
    return;
  }
  if(drag&&pointers.size===1){
    const p=clientToPlan(e.clientX,e.clientY);
    if(p){
      const dx=e.clientX-drag.cx, dy=e.clientY-drag.cy;
      if(Math.hypot(dx,dy)>6)moved=true;
      vb.x+=drag.x-p.x;vb.y+=drag.y-p.y;setVB();
    }
    hideTip();
    return;
  }
  if(pointers.size)return;
  // Hover only when not dragging and a fine pointer is in use
  if(e.pointerType==='mouse'){
    const s=seatAt(e.clientX,e.clientY);
    map.style.cursor=s?'pointer':(drag?'grabbing':'grab');
    hover=s;
    if(s)showTip(s,e.clientX,e.clientY);else hideTip();
  }
});

function endPointer(e){
  const was=pointers.size;
  pointers.delete(e.pointerId);
  if(was===1&&!moved){
    const s=seatAt(e.clientX,e.clientY);
    if(s){
      choose(s);
      showTip(s,e.clientX,e.clientY);
    }
  }
  if(pointers.size===0){drag=null;lastPinch=null;}
  else if(pointers.size===1){
    const [pt]=pointers.values();
    const p=clientToPlan(pt.x,pt.y);
    drag=p?{x:p.x,y:p.y,cx:pt.x,cy:pt.y}:null;
    lastPinch=null;
  }
}

map.addEventListener('pointerup',endPointer);
map.addEventListener('pointercancel',endPointer);
map.addEventListener('pointerleave',()=>{if(!pointers.size)hideTip();});

addEventListener('keydown',e=>{
  if(e.target.closest&&e.target.closest('input,textarea,select,dialog'))return;
  if(e.key==='Escape'){
    if(notes&&notes.open){notes.close();return;}
    clearSel();return;
  }
  if(e.key==='+'||e.key==='='){const {r}=viewport();zoomAt(r.left+r.width/2,r.top+r.height/2,1.28);e.preventDefault();}
  if(e.key==='-'||e.key==='_'){const {r}=viewport();zoomAt(r.left+r.width/2,r.top+r.height/2,1/1.28);e.preventDefault();}
  if(e.key==='0'){fit();e.preventDefault();}
  const step=vb.w*0.08;
  if(e.key==='ArrowLeft'){vb.x-=step;setVB();e.preventDefault();}
  if(e.key==='ArrowRight'){vb.x+=step;setVB();e.preventDefault();}
  if(e.key==='ArrowUp'){vb.y-=step;setVB();e.preventDefault();}
  if(e.key==='ArrowDown'){vb.y+=step;setVB();e.preventDefault();}
});

addEventListener('resize',()=>{
  // Preserve centre and approximate scale
  const lv=LEVELS[levelId];
  const cx=vb.x+vb.w/2, cy=vb.y+vb.h/2, pw=vb.w;
  const {w,h}=viewport();
  const aspect=w/h;
  let nw=pw, nh=nw/aspect;
  vb={x:cx-nw/2,y:cy-nh/2,w:nw,h:nh};
  setVB();
});

window.__seatscope={choose:(id)=>choose(id,{zoom:true}),level:()=>levelId,selected:()=>sel,info,fit,showLevel};

showLevel('stalls');
