// Site-level checks: routes, shared nav, Seatwise branding, favicon, landing slideshow assets.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm'),assert=require('node:assert/strict');
const pages={'/':'index.html','/movie/':'movie/index.html','/sia/':'sia/index.html','/sis/':'sis/index.html'};
const navRe=/<nav class="tabs" aria-label="Seatwise">([\s\S]*?)<\/nav>/;
for(const [route,file] of Object.entries(pages)){const h=fs.readFileSync(file,'utf8');
 assert.match(h,/<title>Seatwise — [^<]+<\/title>/,file);assert(!/SeatScope|seat<span>scope/.test(h),'old brand in '+file);assert.match(h,/seat<span>wise<\/span>/,file);
 assert.match(h,/<link rel="icon" href="\/favicon\.svg"/,file);assert.match(h,/<meta property="og:title" content="Seatwise/,file);assert.match(h,/<meta property="og:image" content="https:\/\/seatsinsg\.vercel\.app\/assets\/og\.jpg"/,file);
 const nav=h.match(navRe)[1];const links=[...nav.matchAll(/<a href="([^"]+)"([^>]*)>/g)].map(m=>[m[1],/aria-current="page"/.test(m[2])]);
 assert.deepEqual(links.map(l=>l[0]),['/','/movie/','/sia/','/sis/'],file);assert.deepEqual(links.filter(l=>l[1]).map(l=>l[0]),[route],file+' current tab');
 assert.match(h,/unofficial fan concept|Unofficial fan concept/i,file);}
assert.match(fs.readFileSync('movie/index.html','utf8'),/GV Funan Deluxe/);assert(!/__GV_LOGO_DATA__/.test(fs.readFileSync('movie/index.html','utf8')));
for(const f of ['sia/index.html','sis/index.html','movie/index.html'])assert.match(fs.readFileSync(f,'utf8'),/URLSearchParams\(location\.search\)\.get\("seat"\)/,f);
// Landing: slideshow script runs headless, slides exist as optimized WebP, every caption links to a viewer
const land=fs.readFileSync('index.html','utf8');const script=land.match(/<script>\n\(function\(\)\{[\s\S]*?<\/script>/)[0].replace(/<\/?script>/g,'');
const S=vm.runInNewContext(script.match(/var S=(\[[\s\S]*?\]);/)[1]);assert(S.length>=6);
const seen=new Set();for(const s of S){assert(/^\/(movie|sia|sis)\//.test(s.href),s.href);assert(s.k&&s.t&&s.alt);for(const f of [s.img+'.webp',s.img+'-800.webp']){const p=path.join('assets/slides',f);assert(fs.existsSync(p),p);const b=fs.readFileSync(p);assert.equal(b.subarray(8,12).toString(),'WEBP',p);assert(b.length<260000,p+' too large');}seen.add(s.href.split('/')[1]);}
assert.deepEqual([...seen].sort(),['movie','sia','sis'],'slides cover all three viewers');
for(const v of ['/movie/','/sia/','/sis/'])assert(land.includes(`class="card" href="${v}"`),'card '+v);
assert.match(land,/id="prev"/);assert.match(land,/id="next"/);assert.match(land,/touchstart/);assert.match(land,/mouseenter/);
// No reference photos: slide/asset bytes differ from every reference image on disk, and no reference image names in assets
const refDirs=['/workspace/stadium-ref'];const refHashes=new Set();const walk=d=>{if(!fs.existsSync(d))return;for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())walk(p);else if(/\.(png|jpe?g|webp)$/i.test(e.name))refHashes.add(crypto.createHash('sha1').update(fs.readFileSync(p)).digest('hex'));}};refDirs.forEach(walk);for(const f of fs.readdirSync('.').filter(f=>/\.(png|jpe?g)$/i.test(f)))refHashes.add(crypto.createHash('sha1').update(fs.readFileSync(f)).digest('hex'));
for(const f of fs.readdirSync('assets/slides').concat(['../og.jpg'])){const h=crypto.createHash('sha1').update(fs.readFileSync(path.join('assets/slides',f))).digest('hex');assert(!refHashes.has(h),'reference image reused: '+f);}
assert(!fs.readdirSync('assets/slides').some(f=>/official|straits|reference|wiki/i.test(f)));
// Favicon
assert.match(fs.readFileSync('favicon.svg','utf8'),/^<svg /);const ico=fs.readFileSync('favicon.ico');assert.equal(ico.readUInt16LE(2),1,'ICO type');
// Static output config: trailing slashes so /movie -> /movie/
assert.equal(JSON.parse(fs.readFileSync('vercel.json','utf8')).trailingSlash,true);
console.log(`PASS site: 4 routes (/, /movie/, /sia/, /sis/) with shared Seatwise nav + current tab, titles/OG/favicon, ?seat= deep links, landing ${S.length} slides (WebP 1600w+800w, all 3 viewers), 3 cards, carousel controls, no reference images, favicon.ico/svg, trailing-slash config.`);
