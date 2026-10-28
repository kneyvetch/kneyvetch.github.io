(function(){
'use strict';
const API_BASE='https://codeforces.com/api/';
const defaultCounts={thinking:0,proof:0,coding:0,debugging:0};
function validateHandle(handle){return /^[A-Za-z0-9_.-]{1,40}$/.test(String(handle||'').trim())}
function delay(ms){return new Promise(resolve=>setTimeout(resolve,ms))}
function api(method,params){
 return new Promise((resolve,reject)=>{
  const callback='__acmCoachCf'+Date.now()+'_'+Math.random().toString(36).slice(2);
  const search=new URLSearchParams(params||{});search.set('jsonp',callback);
  const script=document.createElement('script');
  let settled=false;let timeout;
  const done=(error,data)=>{
   if(settled)return;settled=true;clearTimeout(timeout);
   script.onerror=null;script.remove();try{delete window[callback]}catch(e){window[callback]=undefined}
   if(error)reject(error);else resolve(data);
  };
  window[callback]=response=>{
   if(!response||response.status!=='OK'){done(new Error(response&&response.comment?String(response.comment):'Codeforces 返回异常'));return}
   done(null,response.result);
  };
  script.onerror=()=>done(new Error('无法连接 Codeforces。请检查网络，稍后重试'));
  timeout=setTimeout(()=>done(new Error('Codeforces 请求超时，请稍后重试')),18000);
  script.src=API_BASE+method+'?'+search.toString();script.async=true;
  document.head.appendChild(script);
 });
}
function dateInLocal(ts){const d=new Date(ts*1000);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function validNumber(v){return typeof v==='number'&&Number.isFinite(v)?v:null}
function recordsFromSubmissions(items){
 const map=new Map();
 for(const sub of items||[]){
  const p=sub&&sub.problem;if(!p||typeof p.name!=='string'||!p.index)continue;
  const contestId=Number.isInteger(p.contestId)?p.contestId:null;
  const key=contestId!==null?String(contestId)+'-'+String(p.index):'other-'+String(p.index)+'-'+p.name;
  const ts=Number(sub.creationTimeSeconds)||0;
  if(!map.has(key))map.set(key,{
   cfKey:key,contestId:contestId,index:String(p.index),title:(contestId===null?'':contestId)+String(p.index)+' · '+p.name,
   topics:Array.isArray(p.tags)?[...new Set(p.tags.filter(t=>typeof t==='string'&&t.trim()).map(t=>t.trim()))]:[],
   problemName:p.name,rating:validNumber(p.rating),url:contestId!==null?'https://codeforces.com/problemset/problem/'+contestId+'/'+encodeURIComponent(p.index):'',
   firstAccepted:0,lastSubmitted:0,firstSeen:0,accepted:false,attempts:0
  });
  const v=map.get(key);
  v.attempts++;
  if(ts>v.lastSubmitted)v.lastSubmitted=ts;
  if(ts>0&&(!v.firstSeen||ts<v.firstSeen))v.firstSeen=ts;
  if(sub.verdict==='OK'&&ts>0){v.accepted=true;if(!v.firstAccepted||ts<v.firstAccepted)v.firstAccepted=ts}
  if(v.rating===null&&validNumber(p.rating)!==null)v.rating=p.rating;
 }
 return [...map.values()].map(v=>{
  const stamp=v.firstAccepted||v.firstSeen||v.lastSubmitted;
  return {
   id:'cf_'+v.cfKey,cfKey:v.cfKey,origin:'codeforces',title:v.title,
   source:'Codeforces',rating:v.rating===null?'':String(v.rating),
   status:v.accepted?'ac':'attempted',date:dateInLocal(stamp||Math.floor(Date.now()/1000)),
   notes:'',topics:v.topics,seconds:{...defaultCounts},totalSeconds:0,
   createdAt:new Date((stamp||Math.floor(Date.now()/1000))*1000).toISOString(),
   url:v.url,cfAttempts:v.attempts
  };
 });
}
function mergeRecords(records,incoming){
 const lookup=new Map(records.filter(r=>r&&r.origin==='codeforces'&&r.cfKey).map(r=>[r.cfKey,r]));
 let added=0,updated=0;
 for(const next of incoming){
  const old=lookup.get(next.cfKey);
  if(!old){records.push(next);lookup.set(next.cfKey,next);added++;continue}
  const newStatus=(next.status==='ac'||old.status==='ac')?'ac':old.status;
  if(old.status!==newStatus){old.status=newStatus;updated++}
  if((old.rating===''||old.rating==null)&&next.rating!=='')old.rating=next.rating;
  if(!old.url&&next.url)old.url=next.url;
  // Backfill only empty labels; never replace the user's topic annotations.
  if((old.topics==null||(Array.isArray(old.topics)&&old.topics.length===0)||old.topics==='')&&Array.isArray(next.topics))old.topics=[...next.topics];
  old.cfAttempts=Math.max(Number(old.cfAttempts)||0,next.cfAttempts);
 }
 return {added,updated};
}
function chartSvg(history){
 const points=(history||[]).filter(x=>Number.isFinite(Number(x.newRating))).sort((a,b)=>Number(a.ratingUpdateTimeSeconds)-Number(b.ratingUpdateTimeSeconds));
 if(!points.length)return '<div class="empty">暂无 Codeforces Rated 比赛记录。</div>';
 const width=620,height=190,left=42,right=22,top=15,bottom=26;
 const vals=points.map(p=>Number(p.newRating));let min=Math.floor((Math.min(...vals)-100)/100)*100,max=Math.ceil((Math.max(...vals)+100)/100)*100;if(max===min)max=min+200;
 const x=i=>left+(points.length===1?.5:i/(points.length-1))*(width-left-right);
 const y=v=>top+(max-v)/(max-min)*(height-top-bottom);
 const coords=points.map((p,i)=>x(i).toFixed(2)+','+y(Number(p.newRating)).toFixed(2)).join(' ');
 const grid=[0,.5,1].map(t=>{const py=(top+t*(height-top-bottom)).toFixed(2);const value=Math.round(max-t*(max-min));return '<line x1="'+left+'" y1="'+py+'" x2="'+(width-right)+'" y2="'+py+'" stroke="#e9edf5" stroke-width="1"/><text x="4" y="'+(Number(py)+4)+'" fill="#8792a5" font-size="11">'+value+'</text>'}).join('');
 const dots=points.length<=20?points.map((p,i)=>'<circle cx="'+x(i).toFixed(2)+'" cy="'+y(Number(p.newRating)).toFixed(2)+'" r="3" fill="#365ee8"/>').join(''):'';
 return '<svg viewBox="0 0 '+width+' '+height+'" role="img" aria-label="Codeforces Rating 历史趋势" style="width:100%;height:auto;display:block;overflow:visible">'+grid+'<polyline fill="none" stroke="#365ee8" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" points="'+coords+'"/>'+dots+'</svg><div class="muted" style="font-size:11px;margin-top:8px">共 '+points.length+' 场 Rated 比赛 · 只展示公开 Rating 记录</div>';
}
window.ACMCoachCF={validateHandle,delay,api,recordsFromSubmissions,mergeRecords,chartSvg};
})();