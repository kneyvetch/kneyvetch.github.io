(function(){
'use strict';
const THINKING={independent_proved:{score:4,label:'独立构思并证明'},independent_model:{score:3,label:'独立构思，证明待完善'},minor_hint:{score:2,label:'少量提示后构思'},guided:{score:1,label:'较多提示或参考题解'},unsolved:{score:0,label:'未构思出解法'}};
const CODING={independent_ac:{score:4,label:'独立编码并 AC'},independent_unaccepted:{score:3,label:'独立编码但未 AC'},assisted_ac:{score:2,label:'接受协助后 AC'},not_implemented:{score:1,label:'未完成实现'}};
// Only explicit aliases are merged; related but different algorithms stay separate.
const ALIASES = new Map(Object.entries({
 'dp':'动态规划','dynamic programming':'动态规划','graphs':'图论','graph theory':'图论',
 'greedy':'贪心','math':'数学','mathematics':'数学','number theory':'数论',
 'binary search':'二分查找','二分':'二分查找','data structures':'数据结构',
 'dsu':'并查集','disjoint set union':'并查集','trees':'树','strings':'字符串',
 'shortest paths':'最短路','flows':'网络流','combinatorics':'组合计数',
 'geometry':'计算几何','bitmasks':'位运算','two pointers':'双指针',
 'sortings':'排序','implementation':'模拟实现','dfs and similar':'深度优先搜索',
 'fft':'快速傅里叶变换','树形dp':'树形DP'
}));
function csv(v){
 const list=Array.isArray(v)?v:String(v||'').split(/[,，、;；\n]/);
 return [...new Set(list.filter(s=>typeof s==='string').map(s=>s.trim().replace(/\s+/g,' ').slice(0,30)).filter(Boolean))].slice(0,30);
}
function labels(v){return [...new Set(csv(v).map(s=>ALIASES.get(s.toLowerCase())||s))]}
function valid(key,map){return Object.prototype.hasOwnProperty.call(map,key)?key:''}
function normalize(r){return {topics:labels(r&&r.topics),gaps:labels(r&&r.gaps),resolvedGaps:labels(r&&r.resolvedGaps),thinking:valid(r&&r.thinkingEvaluation,THINKING),coding:valid(r&&r.codingEvaluation,CODING)}}
const DAY=86400000;
function day(value){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;
 const stamp=Date.parse(value+'T00:00:00Z');
 return Number.isFinite(stamp)&&new Date(stamp).toISOString().slice(0,10)===value?stamp:null;
}
function unique(records){
 const seenIds=new Set(),seenProblems=new Set();
 return (Array.isArray(records)?records:[]).filter(r=>{
  if(!r||typeof r!=='object'||Array.isArray(r))return false;
  const id=r.id!=null?String(r.id):null,problem=r.origin==='codeforces'&&r.cfKey?String(r.cfKey):null;
  if((id!==null&&seenIds.has(id))||(problem!==null&&seenProblems.has(problem)))return false;
  if(id!==null)seenIds.add(id);if(problem!==null)seenProblems.add(problem);return true;
 });
}
function mean(values){return values.length?Math.round(values.reduce((a,b)=>a+b,0)/values.length*10)/10:null}
function score(items,map,key,limit=30){
 const evaluated=unique(items).filter(r=>valid(r[key],map));
 const latest=evaluated.slice().sort((a,b)=>(day(b.date)??-Infinity)-(day(a.date)??-Infinity)).slice(0,limit);
 return {value:mean(latest.map(r=>map[r[key]].score)),count:latest.length,total:evaluated.length,
  confidence:!latest.length?'未评估':latest.length<5?'样本较少':'仅代表已记录训练'};
}
function state(value,count){return count<3?'insufficient':value>=3.2?'strong':value<=2.4?'weak':'developing'}
function calculate(records){
 const all=unique(records),thought=score(all,THINKING,'thinkingEvaluation'),coding=score(all,CODING,'codingEvaluation');
 const topics=new Map(),gaps=new Map();let tagged=0,assessedCount=0;
 for(const r of all){
  const n=normalize(r);if(n.topics.length)tagged++;if(n.thinking||n.coding)assessedCount++;
  for(const name of n.topics){
   if(!topics.has(name))topics.set(name,{name,count:0,rows:[]});
   const t=topics.get(name);t.count++;t.rows.push(r);
  }
  for(const name of n.gaps){
   if(!gaps.has(name))gaps.set(name,{name,count:0,openCount:0,resolvedCount:0,lastSeen:'',lastOpen:'',lastResolved:''});
   const g=gaps.get(name);g.count++;
   const resolved=n.resolvedGaps.includes(name),date=day(r.date)!==null?r.date:'';
   if(resolved){g.resolvedCount++;if(date>g.lastResolved)g.lastResolved=date}
   else {g.openCount++;if(date>g.lastOpen)g.lastOpen=date}
   if(date>g.lastSeen)g.lastSeen=date;
  }
 }
 const topicList=[...topics.values()].map(t=>{
  const a=score(t.rows,THINKING,'thinkingEvaluation'),b=score(t.rows,CODING,'codingEvaluation');
  return {name:t.name,count:t.count,thinking:a.value,coding:b.value,thinkingCount:a.count,codingCount:b.count,
   evaluated:t.rows.filter(r=>normalize(r).thinking||normalize(r).coding).length,
   thinkingState:state(a.value,a.count),codingState:state(b.value,b.count)};
 }).sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name,'zh-CN'));
 const strengths=topicList.filter(t=>t.thinkingState==='strong'||t.codingState==='strong');
 const weaknesses=topicList.filter(t=>t.thinkingState==='weak'||t.codingState==='weak');
 const gapList=[...gaps.values()].map(g=>({...g,state:!g.openCount?'resolved':g.resolvedCount&&g.lastOpen>=g.lastResolved?'reopened':'open'}))
  .sort((a,b)=>b.openCount-a.openCount||b.lastSeen.localeCompare(a.lastSeen)||a.name.localeCompare(b.name,'zh-CN'));
 return {thought,coding,tagged,topics:topicList,strengths,weaknesses,gaps:gapList,assessedCount};
}
function evidence(records,today){
 const all=unique(records),end=day(today);
 if(end===null)throw new Error('分析日期无效');
 const dated=all.filter(r=>day(r.date)!==null&&day(r.date)<=end);
 const period=(start,finish)=>{
  const rows=dated.filter(r=>day(r.date)>=start&&day(r.date)<=finish);
  const rated=rows.filter(r=>(normalize(r).thinking||normalize(r).coding)&&r.rating!==''&&r.rating!=null&&Number.isFinite(Number(r.rating))&&Number(r.rating)>=0&&Number(r.rating)<=5000);
  return {thought:score(rows,THINKING,'thinkingEvaluation',Infinity),coding:score(rows,CODING,'codingEvaluation',Infinity),
   rating:mean(rated.map(r=>Number(r.rating))),ratedCount:rated.length};
 };
 const current=period(end-27*DAY,end),previous=period(end-55*DAY,end-28*DAY),trend={};
 for(const key of ['thought','coding'])trend[key]={current:current[key],previous:previous[key],
  delta:current[key].count>=5&&previous[key].count>=5?Math.round((current[key].value-previous[key].value)*10)/10:null};
 const weeks=Array.from({length:8},(_,i)=>{
  const finish=end-(7-i)*7*DAY,start=finish-6*DAY;
  return {start:new Date(start).toISOString().slice(0,10),end:new Date(finish).toISOString().slice(0,10),...period(start,finish)};
 });
 const a=calculate(all);
 return {...a,trend,weeks,periods:{current,previous},quality:{total:all.length,assessed:a.assessedCount,tagged:a.tagged,
  invalidDates:all.length-dated.length,duplicates:(Array.isArray(records)?records.filter(r=>r&&typeof r==='object'&&!Array.isArray(r)).length:0)-all.length,
  missingAssessment:all.length-a.assessedCount,missingTopics:all.length-a.tagged}};
}
window.ACMCoachAnalysis={THINKING,CODING,csv,labels,normalize,score,calculate,evidence,day};
})();
