// Dev tool: renders the landing-page slideshow from OUR OWN viewers (headless Chrome + SwiftShader), never from reference photos.
// Usage: npm run build && NODE_PATH=<dir with playwright-core> node render-slides.cjs   (then convert with optimize-slides.py)
const {chromium}=require('playwright-core');const fs=require('fs'),path=require('path');
const DIST=path.join(__dirname,'dist'),OUT='/tmp/seatview-slides';fs.mkdirSync(OUT,{recursive:true});
const HIDE='body>*:not(#world){visibility:hidden!important}';
const slides=[
 {id:'movie-e4',url:'/movie/',run:async p=>{await p.evaluate(()=>window.__seatscope.choose('E4'));await p.click('#continue');await p.waitForTimeout(3500);}},
 {id:'sia-11a',url:'/sia/',run:async p=>{await p.evaluate(()=>window.__seatscope.enter('11A'));await p.waitForTimeout(3500);await p.evaluate(()=>window.__seatscope.look(.55,-.02));await p.waitForTimeout(500);}},
 {id:'sia-bed',url:'/sia/',run:async p=>{await p.evaluate(()=>{const s=window.__seatscope;s.bed('14D',true);s.bed('14F',true);s.divider(14,false);});await p.waitForTimeout(2600);await p.evaluate(()=>window.__seatscope.focus('14D',.17,.42,-Math.PI/2+.2));await p.waitForTimeout(900);}},
 {id:'sis-220',url:'/sis/',run:async p=>{await p.evaluate(()=>window.__seatscope.enter('220-17-6'));await p.waitForTimeout(4000);}},
 {id:'sis-322',url:'/sis/',run:async p=>{await p.evaluate(()=>window.__seatscope.enter('322-30-6'));await p.waitForTimeout(4000);}},
 {id:'sis-pen',url:'/sis/',run:async p=>{await p.evaluate(()=>window.__seatscope.enter('PEN-A-CAT1@0.6,0.4'));await p.waitForTimeout(4000);}},
 {id:'sis-map',url:'/sis/',run:async p=>{await p.evaluate(()=>{window.__seatscope.choose('220-17-6');window.__seatscope.orbit(.42,.8,.9);});await p.waitForTimeout(800);}}];
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
 const ctx=await b.newContext({viewport:{width:1600,height:900}});
 await ctx.route('http://local.test/**',r=>{let u=new URL(r.request().url()).pathname;if(u.endsWith('/'))u+='index.html';const f=path.join(DIST,u);if(!fs.existsSync(f))return r.fulfill({status:404,body:'nf'});r.fulfill({status:200,body:fs.readFileSync(f),contentType:f.endsWith('.html')?'text/html':undefined});});
 for(const s of slides.filter(s=>!process.argv[2]||process.argv[2].split(',').includes(s.id))){const p=await ctx.newPage();await p.goto('http://local.test'+s.url);await p.waitForTimeout(3000);await s.run(p);await p.addStyleTag({content:HIDE});await p.waitForTimeout(400);await p.screenshot({path:`${OUT}/${s.id}.png`});console.log('rendered',s.id);await p.close();}
 await b.close();})();
