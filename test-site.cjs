// Site-level checks: routes, shared nav, Seatwise branding, favicon, landing slideshow assets.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm'),assert=require('node:assert/strict');
const pages={'/':'index.html','/movie/':'movie/index.html','/sia/':'sia/index.html','/sis/':'sis/index.html','/starbucks-bugis/':'starbucks-bugis/index.html','/mbs/':'mbs/index.html'};
const navRe=/<nav class="tabs" aria-label="Seatwise">([\s\S]*?)<\/nav>/;
for(const [route,file] of Object.entries(pages)){const h=fs.readFileSync(file,'utf8');
 assert.match(h,/<title>Seatwise \| [^<]+<\/title>/,file);assert(!/SeatScope|seat<span>scope/.test(h),'old brand in '+file);assert.match(h,/seat<span>wise<\/span>/,file);
 assert.match(h,/<link rel="icon" href="\/favicon\.svg"/,file);assert.match(h,/<meta property="og:title" content="Seatwise/,file);assert.match(h,/<meta property="og:image" content="https:\/\/seatsinsg\.vercel\.app\/assets\/og\.jpg"/,file);
 const nav=h.match(navRe)[1];const links=[...nav.matchAll(/<a href="([^"]+)"([^>]*)>/g)].map(m=>[m[1],/aria-current="page"/.test(m[2])]);
 assert.deepEqual(links.map(l=>l[0]),['/','/movie/','/sis/','/mbs/','/sia/'],file);
 const current=route==='/starbucks-bugis/'?[]:[route];
 assert.deepEqual(links.filter(l=>l[1]).map(l=>l[0]),current,file+' current tab');
 assert.match(nav,/>Theatres</,file+' Theatres tab');
 assert.match(nav,/>Singapore Indoor Stadium</,file+' SIS dropdown');
 assert.match(nav,/>MBS Theatre</,file+' MBS dropdown');
 assert.match(nav,/aria-haspopup="true"/,file+' dropdown');
 assert.doesNotMatch(nav,/starbucks-bugis/,file+' cafe hidden from nav');
 assert.match(h,/aria-controls="theatres-menu"/,file+' dropdown script hook');
 if(route==='/sis/'||route==='/mbs/')assert.match(nav,/<button[^>]*aria-current="page"[^>]*>Theatres</,file+' parent tab current');
 assert.match(h,/unofficial fan concept|Unofficial fan concept/i,file);}
assert.match(fs.readFileSync('movie/index.html','utf8'),/GV Funan Deluxe/);assert(!/__GV_LOGO_DATA__/.test(fs.readFileSync('movie/index.html','utf8')));
for(const f of ['sia/index.html','sis/index.html','movie/index.html','starbucks-bugis/index.html','mbs/index.html'])assert.match(fs.readFileSync(f,'utf8'),/URLSearchParams\(location\.search\)\.get\("seat"\)/,f);
// Landing: slideshow script runs headless, slides exist as optimized WebP, every caption links to a viewer
const land=fs.readFileSync('index.html','utf8');const script=land.match(/<script>\n\(function\(\)\{[\s\S]*?<\/script>/)[0].replace(/<\/?script>/g,'');
const S=vm.runInNewContext(script.match(/var S=(\[[\s\S]*?\]);/)[1]);assert(S.length>=6);
const seen=new Set();for(const s of S){assert(/^\/(movie|sia|sis)\//.test(s.href),s.href);assert(s.k&&s.t&&s.alt);for(const f of [s.img+'.webp',s.img+'-800.webp']){const p=path.join('assets/slides',f);assert(fs.existsSync(p),p);const b=fs.readFileSync(p);assert.equal(b.subarray(8,12).toString(),'WEBP',p);assert(b.length<260000,p+' too large');}seen.add(s.href.split('/')[1]);}
assert.deepEqual([...seen].sort(),['movie','sia','sis'],'slides cover the public viewers');
for(const v of ['/movie/','/sia/','/sis/','/mbs/'])assert(land.includes(`class="card" href="${v}"`),'card '+v);
assert(!land.includes('class="card" href="/starbucks-bugis/"'),'cafe card hidden');
assert.match(land,/href="https:\/\/www\.linkedin\.com\/in\/anthony-ng-yp"/,'linkedin href');
assert.match(land,/<a class="btn ghost linkedin" href="https:\/\/www\.linkedin\.com\/in\/anthony-ng-yp" target="_blank" rel="noopener noreferrer" aria-label="Connect with the dev" title="Connect with the dev">/,'linkedin button attrs');
assert.match(land,/<span class="linkedin-label">Connect with the dev<\/span>/,'linkedin label');
for(const file of Object.values(pages)){const h=fs.readFileSync(file,'utf8');assert.match(h,/viewport-fit=cover/,file+' viewport-fit');assert.match(h,/@media\(max-width:768px\)/,file+' 768 query');assert.match(h,/@media\(max-width:420px\)/,file+' 420 query');}
assert.match(land,/\.btn\.linkedin \.linkedin-label\{display:none\}/,'narrow phone hides linkedin label');

// Analytics snippet stays on every page
for(const file of Object.values(pages)){const h=fs.readFileSync(file,'utf8');assert.match(h,/_vercel\/insights\/script\.js/,file+' analytics');assert.match(h,/window\.va=window\.va/,file+' va stub');}
// SIA smash mode entry
{const h=fs.readFileSync('sia/index.html','utf8');assert.match(h,/<button class="action alt" id="smash"[^>]*>f\*\*k it<\/button>/);assert.match(h,/class="actions"/);assert.match(h,/body\.smash #look/);assert.match(h,/WASD or arrow keys to walk/);assert.match(h,/id="reset-smash"/);assert.match(h,/id="smash-count"/);assert.match(h,/0 of 40 seats destroyed/);assert.match(h,/id="swing-btn"/);assert.match(h,/>Swing</);assert.match(h,/id="joy"/);assert.match(h,/@media\(max-width:768px\)[^}]*body\.smash #smash-controls/);}
assert.match(land,/id="prev"/);assert.match(land,/id="next"/);assert.match(land,/touchstart/);assert.match(land,/mouseenter/);
// No reference photos: slide/asset bytes differ from every reference image on disk, and no reference image names in assets
const refDirs=['/workspace/stadium-ref','reference'];const refHashes=new Set();const walk=d=>{if(!fs.existsSync(d))return;for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())walk(p);else if(/\.(png|jpe?g|webp)$/i.test(e.name))refHashes.add(crypto.createHash('sha1').update(fs.readFileSync(p)).digest('hex'));}};refDirs.forEach(walk);for(const f of fs.readdirSync('.').filter(f=>/\.(png|jpe?g)$/i.test(f)))refHashes.add(crypto.createHash('sha1').update(fs.readFileSync(f)).digest('hex'));
for(const f of fs.readdirSync('assets/slides').concat(['../og.jpg'])){const h=crypto.createHash('sha1').update(fs.readFileSync(path.join('assets/slides',f))).digest('hex');assert(!refHashes.has(h),'reference image reused: '+f);}
assert(!fs.readdirSync('assets/slides').some(f=>/official|straits|reference|wiki/i.test(f)));
// Copy style: no dashes (hyphen as punctuation, en dash, em dash, hyphenated words) in user-visible text
const DASH=/[–—]|\s-\s|[A-Za-z]-[A-Za-z]|\d-\d/;const visible=h=>{const out=[];const b=h.replace(/<style>[\s\S]*?<\/style>/g,'').replace(/<script>[\s\S]*?<\/script>/g,'');
 for(const m of b.matchAll(/>([^<>]+)</g))if(m[1].trim())out.push(m[1].trim());for(const m of b.matchAll(/\s(?:title|alt|aria-label|placeholder)="([^"]*)"/g))out.push(m[1]);
 for(const m of b.matchAll(/<meta (?:name|property)="(description|og:title|og:description|og:site_name)" content="([^"]*)"/g))out.push(m[2]);return out;};
for(const file of Object.values(pages))for(const t of visible(fs.readFileSync(file,'utf8')))assert(!DASH.test(t),`dash in visible copy of ${file}: ${t}`);
for(const s of S)for(const k of ['k','t','s','alt'])assert(!DASH.test(s[k]),`dash in slide ${s.img}.${k}: ${s[k]}`);
{const sm=require('./sis-model.cjs'),am=require('./sia-model.cjs'),bm=require('./bugis-model.cjs'),mm=require('./mbs-model.cjs');for(const c of Object.values(sm.CATS))assert(!DASH.test(c.name),c.name);for(const z of [...sm.ZONES,...sm.FLOOR_BLOCKS])if(z.name)assert(!DASH.test(z.name),z.name);
 for(const s of am.seats||[]){const i=am.info?am.info(s):s;for(const v of [i.type,i.cabin])if(v)assert(!DASH.test(v),v);}
 for(const s of bm.seats||[]){const i=bm.info?bm.info(s):s;for(const v of [s.id,i.type,i.zone,i.feature])if(v)assert(!DASH.test(v),v);}
 for(const s of mm.seats||[]){const i=mm.info(s);for(const v of [s.id,i.label,i.type,i.level])if(v)assert(!DASH.test(v),v);}}
// Favicon
assert.match(fs.readFileSync('favicon.svg','utf8'),/^<svg /);const ico=fs.readFileSync('favicon.ico');assert.equal(ico.readUInt16LE(2),1,'ICO type');
// Static output config: trailing slashes so /movie -> /movie/
assert.equal(JSON.parse(fs.readFileSync('vercel.json','utf8')).trailingSlash,true);
console.log(`PASS site: 6 routes (/, /movie/, /sia/, /sis/, /starbucks-bugis/, /mbs/) with Cinema / Theatres dropdown / SIA nav, cafe tab hidden, titles/OG/favicon, ?seat= deep links, landing ${S.length} slides (WebP 1600w+800w), 4 public cards, carousel controls, no reference images, favicon.ico/svg, trailing slash config, no dashes in visible copy, analytics on all pages, SIA smash button.`);
