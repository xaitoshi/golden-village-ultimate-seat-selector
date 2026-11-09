const fs=require('fs');fs.mkdirSync('dist/sia',{recursive:true});fs.copyFileSync('index.html','dist/index.html');fs.copyFileSync('sia/index.html','dist/sia/index.html');
