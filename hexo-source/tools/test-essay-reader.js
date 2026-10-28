'use strict';
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.resolve(__dirname,'..','public');
const pages=['categories/essays/index.html','2022/09/29/随笔/index.html','2022/11/10/落幕/index.html','2022/11/10/夏记/index.html'];
const secrets=['风起银铃轻涌','钟声已响，你也该步入旅途了','少年的梦终是醒了'];
for(const p of pages){
 const html=fs.readFileSync(path.join(root,p),'utf8');
 const match=html.match(/<script id="essay-gate-script">([\s\S]*?)<\/script>/);
 if(!match)throw new Error('Password script missing: '+p);
 new vm.Script(match[1],{filename:p});
 if(!match[1].includes("['/protected/随笔.json'"))throw new Error('Reader safe-path list missing: '+p);
 if(secrets.some(t=>html.includes(t)))throw new Error('Plaintext appears in generated HTML: '+p);
}
for(const name of ['随笔','落幕','夏记']){
 const payload=JSON.parse(fs.readFileSync(path.join(root,'protected',name+'.json'),'utf8'));
 if(payload.alg!=='AES-256-GCM'||payload.kdf!=='PBKDF2-SHA256'||!payload.ciphertext)throw new Error('Invalid ciphertext '+name);
}
console.log('All protected pages compile as JavaScript and contain only ciphertext references.');
