const fs=require('fs');
fs.rmSync('dist',{recursive:true,force:true});
for(const d of ['movie','sia','sis'])fs.mkdirSync('dist/'+d,{recursive:true});
fs.copyFileSync('index.html','dist/index.html');
for(const d of ['movie','sia','sis'])fs.copyFileSync(d+'/index.html','dist/'+d+'/index.html');
fs.cpSync('assets','dist/assets',{recursive:true});
for(const f of ['favicon.svg','favicon.ico'])fs.copyFileSync(f,'dist/'+f);
// static-only Vercel config for the uploaded output (no build): canonical trailing slashes so /movie -> /movie/
fs.writeFileSync('dist/vercel.json',JSON.stringify({trailingSlash:true},null,1));
