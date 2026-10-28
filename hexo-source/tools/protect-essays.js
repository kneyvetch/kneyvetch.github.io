'use strict';
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..','public');
const pages=['categories/essays/index.html','2022/09/29/随笔/index.html','2022/11/10/落幕/index.html','2022/11/10/夏记/index.html'];
const names=['随笔','落幕','夏记'];
const style=`<style id="essay-protection-style">
html.essay-locked body > :not(#essay-gate){visibility:hidden!important}
html.essay-locked body{overflow:hidden!important}
html:not(.essay-locked) #essay-gate{display:none!important}
#essay-gate{visibility:visible!important;position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;overflow:auto;box-sizing:border-box;padding:20px;background:#f3f5fa;color:#1d2939;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif}
#essay-gate *{box-sizing:border-box}
#essay-gate .panel{width:min(100%,410px);background:#fff;border:1px solid #e3e8f0;border-radius:20px;padding:28px;box-shadow:0 10px 35px rgba(10,28,60,.10)}
#essay-gate h1{margin:0 0 12px;font-size:23px;color:#1b2843}
#essay-gate p{font-size:13px;line-height:1.65;color:#748199;margin:0 0 20px}
#essay-gate label{display:block;margin-bottom:7px;font-size:12px;font-weight:700;color:#475467}
#essay-gate input{width:100%;min-height:48px;border:1px solid #ccd5e3;border-radius:11px;padding:10px 12px;font-size:16px;background:#fff;color:#1d2939}
#essay-gate button{display:block;width:100%;min-height:45px;border:0;border-radius:11px;margin-top:12px;background:#365ee8;color:#fff;font-size:14px;font-weight:700;cursor:pointer}
#essay-gate button:disabled{opacity:.65}
#essay-gate .error{color:#bc3547;font-size:12px;min-height:24px;margin-top:10px}
#essay-gate a{display:inline-block;margin-top:10px;font-size:12px;color:#71819a;text-decoration:none}
</style>`;
const gate=`<div id="essay-gate" role="dialog" aria-modal="true" aria-label="杂文密码验证"><div class="panel"><h1>杂文 · 访问验证</h1><p>文章正文采用 AES-256-GCM 加密，输入访问密码后在本机浏览器解密。密码不会保存在浏览器。</p><form id="essay-gate-form"><label for="essay-password">访问密码</label><input id="essay-password" type="password" autocomplete="off" maxlength="128" required placeholder="请输入访问密码"><button id="essay-submit" type="submit">解锁阅读</button><div id="essay-error" class="error" role="status" aria-live="polite"></div></form><a href="/">返回博客</a></div></div>`;
const verify=`<script id="essay-gate-script">
(function(){'use strict';
const expected='b990a8e291c20d19ef1c8492d15217e39898b40879d88b5dc12c50d5022cf9d1';
const legacySalt='kney-essays-gate-v1-28oct';
const content=document.getElementById('essay-encrypted-content');
const form=document.getElementById('essay-gate-form');
const input=document.getElementById('essay-password');
const error=document.getElementById('essay-error');
const button=document.getElementById('essay-submit');
function b64bytes(v){return Uint8Array.from(atob(v),c=>c.charCodeAt(0))}
function toHex(b){return Array.from(new Uint8Array(b),v=>v.toString(16).padStart(2,'0')).join('')}
async function readEncryptedBody(password){
 const source=content.getAttribute('data-payload');
 if(!source||!['/protected/随笔.json','/protected/落幕.json','/protected/夏记.json'].includes(source))throw new Error('正文地址无效');
 const response=await fetch(source,{cache:'no-store'});
 if(!response.ok)throw new Error('密文请求失败（HTTP '+response.status+'）');
 const p=await response.json();
 if(p.v!==1||p.alg!=='AES-256-GCM'||p.kdf!=='PBKDF2-SHA256'||p.iterations!==210000||typeof p.ciphertext!=='string')throw new Error('不支持的密文格式');
 const keyMaterial=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveKey']);
 const key=await crypto.subtle.deriveKey({name:'PBKDF2',salt:b64bytes(p.salt),iterations:p.iterations,hash:'SHA-256'},keyMaterial,{name:'AES-GCM',length:256},false,['decrypt']);
 let decrypted;
 try{decrypted=await crypto.subtle.decrypt({name:'AES-GCM',iv:b64bytes(p.iv)},key,b64bytes(p.ciphertext))}
 catch(e){throw new Error('密码不正确或密文已损坏')}
 if(p.compression==='gzip'){
  if(typeof DecompressionStream!=='function')throw new Error('浏览器不支持 gzip 解压，请使用最新版 Chrome');
  decrypted=await new Response(new Blob([decrypted]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
 }else if(p.compression)throw new Error('未知压缩类型');
 return new TextDecoder().decode(decrypted);
}
if(!form)return;
form.addEventListener('submit',async event=>{
 event.preventDefault();button.disabled=true;error.textContent='';
 const password=input.value;
 try{
  if(content){const html=await readEncryptedBody(password);content.innerHTML=html;}
  else{
   const bytes=new TextEncoder().encode(legacySalt+':'+password);
   if(toHex(await crypto.subtle.digest('SHA-256',bytes))!==expected)throw new Error('密码不正确');
  }
  input.value='';document.documentElement.classList.remove('essay-locked');
 }catch(e){error.textContent=e&&e.message?e.message:'无法解密'}
 finally{button.disabled=false;}
});
})();
</script>`;
for(const page of pages){
 const target=path.join(root,page);
 if(!fs.existsSync(target))throw new Error('Required generated page missing: '+page);
 let h=fs.readFileSync(target,'utf8');
 if(!/<html\b/i.test(h)||!/<head\b/i.test(h)||!/<body\b/i.test(h))throw Error('Invalid HTML '+page);
 if(h.includes('essay-gate-script'))throw Error('Gate already injected: '+page);
 h=h.replace(/<html\b([^>]*)>/i,'<html$1 class="essay-locked">');
 h=h.replace(/<head\b([^>]*)>/i,'<head$1>'+style+'<meta name="robots" content="noindex,noarchive,nosnippet">');
 h=h.replace(/<body\b([^>]*)>/i,'<body$1>'+gate);
 h=h.replace(/<\/body>/i,verify+'</body>');
 fs.writeFileSync(target,h);
}
const index=path.join(root,'index.html');
let home=fs.readFileSync(index,'utf8');let excerptCount=0;
home=home.replace(/<div class="post-body" itemprop="articleBody">[\s\S]*?(?=\s*<footer class="post-footer">)/g,()=>{excerptCount++;return '<div class="post-body" itemprop="articleBody"><p>此文已加密，请点击文章标题并输入访问密码阅读。</p></div>\n';});
if(excerptCount!==3)throw new Error('Expected 3 homepage excerpts; found '+excerptCount);
fs.writeFileSync(index,home);
const revision='20261028-encrypted-v6';
function refreshLinks(h){return h.replace(/href="(\/categories\/essays\/|\/2022\/09\/29\/(?:%E9%9A%8F%E7%AC%94|随笔)\/|\/2022\/11\/10\/(?:%E8%90%BD%E5%B9%95|落幕|%E5%A4%8F%E8%AE%B0|夏记)\/)(#[^"]*)?"/gi,(_whole,url,fragment)=>'href="'+url+'?rev='+revision+(fragment||'')+'"')}
function walk(dir){
 for(const item of fs.readdirSync(dir,{withFileTypes:true})){
  const file=path.join(dir,item.name);
  if(item.isDirectory()){walk(file);continue}
  if(!item.isFile()||!file.endsWith('.html'))continue;
  const previous=fs.readFileSync(file,'utf8');
  let current=refreshLinks(previous);
  const relative=path.relative(root,file).split(path.sep).join('/');
  if(/^(?:archives|tags)\//.test(relative)&&!/<meta\s+name="robots"/i.test(current)){
   current=current.replace(/<head\b([^>]*)>/i,'<head$1><meta name="robots" content="noindex,noarchive,nosnippet">');
  }
  if(previous!==current)fs.writeFileSync(file,current);
 }
}
walk(root);
for(const n of names){
 const file=path.join(root,'protected',n+'.json');
 if(!fs.existsSync(file))throw new Error('Missing encrypted payload '+n);
 const p=JSON.parse(fs.readFileSync(file,'utf8'));
 if(p.alg!=='AES-256-GCM'||p.kdf!=='PBKDF2-SHA256'||!p.ciphertext||p.iterations!==210000)throw new Error('Invalid encrypted payload '+n);
}
for(const [word,label] of [['风起银铃轻涌','随笔'],['钟声已响，你也该步入旅途了','落幕'],['少年的梦终是醒了','夏记']]){
 for(const rel of ['index.html','categories/essays/index.html',...pages.slice(1)]){
  if(fs.readFileSync(path.join(root,rel),'utf8').includes(word))throw new Error('Plaintext exposure in '+rel+' for '+label);
 }
}
console.log('Protected category and 3 posts using encrypted payloads; homepage excerpts redacted.');
