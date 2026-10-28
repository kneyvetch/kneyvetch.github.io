(function(){
'use strict';
const THINKING={independent_proved:{score:4,label:'独立构思并证明'},independent_model:{score:3,label:'独立构思，证明待完善'},minor_hint:{score:2,label:'少量提示后构思'},guided:{score:1,label:'较多提示或参考题解'},unsolved:{score:0,label:'未构思出解法'}};
const CODING={independent_ac:{score:4,label:'独立编码并 AC'},independent_unaccepted:{score:3,label:'独立编码但未 AC'},assisted_ac:{score:2,label:'接受协助后 AC'},not_implemented:{score:1,label:'未完成实现'}};
function csv(v){const list=Array.isArray(v)?v:String(v||'').split(/[,，、;；\n]/);return [...new Set(list.map(s=>String(s||'').trim().replace(/\s+/g,' ')).filter(Boolean))].slice(0,30).map(s=>s.slice(0,30))}
function valid(key,map){return Object.prototype.hasOwnProperty.call(map,key)?key:''}
function normalize(r){return {topics:csv(r&&r.topics),gaps:csv(r&&r.gaps),thinking:valid(r&&r.thinkingEvaluation,THINKING),coding:valid(r&&r.codingEvaluation,CODING)}}
function score(items,map,key){const evaluated=items.filter(r=>valid(r&&r[key],map));if(!evaluated.length)return {value:null,count:0,confidence:'未评估'};const latest=evaluated.slice().sort((a,b)=>String(b.createdAt||b.date||'').localeCompare(String(a.createdAt||a.date||''))).slice(0,30);
const value=Math.round(latest.reduce((total,r)=>total+map[r[key]].score,0)/latest.length*10)/10;
return {value,count:latest.length,confidence:latest.length<5?'样本较少':'训练表现',total:evaluated.length}}
function calculate(records){const all=Array.isArray(records)?records:[];const thought=score(all,THINKING,'thinkingEvaluation'),coding=score(all,CODING,'codingEvaluation');
const topics=new Map(),gaps=new Map();let tagged=0;
for(const r of all){const n=normalize(r);if(n.topics.length)tagged++;for(const name of n.topics){if(!topics.has(name))topics.set(name,{name,count:0,thinkingTotal:0,thinkingCount:0,codingTotal:0,codingCount:0});const t=topics.get(name);t.count++;if(n.thinking){t.thinkingTotal+=THINKING[n.thinking].score;t.thinkingCount++}if(n.coding){t.codingTotal+=CODING[n.coding].score;t.codingCount++}}
for(const name of n.gaps)gaps.set(name,(gaps.get(name)||0)+1)}
const topicList=[...topics.values()].map(t=>{const thinking=t.thinkingCount?Math.round(t.thinkingTotal/t.thinkingCount*10)/10:null,coding=t.codingCount?Math.round(t.codingTotal/t.codingCount*10)/10:null;const evaluated=t.thinkingCount+t.codingCount;return {name:t.name,count:t.count,thinking,coding,evaluated,overall:evaluated?Math.round((t.thinkingTotal+t.codingTotal)/evaluated*10)/10:null}}).sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name,'zh-CN'));
const reliable=topicList.filter(t=>t.count>=3&&t.evaluated>=3);
const strengths=reliable.filter(t=>t.overall>=3.2).sort((a,b)=>b.overall-a.overall).slice(0,6);
const weaknesses=reliable.filter(t=>t.overall<=2.4).sort((a,b)=>a.overall-b.overall).slice(0,6);
const gapList=[...gaps].map(([name,count])=>({name,count})).sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name,'zh-CN')).slice(0,12);
return {thought,coding,tagged,topics:topicList,strengths,weaknesses,gaps:gapList,assessedCount:all.filter(r=>valid(r&&r.thinkingEvaluation,THINKING)||valid(r&&r.codingEvaluation,CODING)).length}}
window.ACMCoachAnalysis={THINKING,CODING,csv,normalize,score,calculate};
})();