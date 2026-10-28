'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const sandbox = {window:{}};
vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'../source/acm-app/assessment.js'),'utf8'),sandbox);
const A = sandbox.window.ACMCoachAnalysis;
const row = (id, extra={}) => ({id, date:'2026-10-28', topics:['dp'], thinkingEvaluation:'independent_proved', ...extra});
test('two evaluated questions plus an unassessed question cannot establish a strength',()=>{
 const a=A.calculate([row('a',{codingEvaluation:'independent_ac'}),row('b',{codingEvaluation:'independent_ac'}),row('c',{thinkingEvaluation:''})]);
 assert.equal(a.strengths.length,0);
});
test('aliases combine without changing original training data',()=>{
 const records=[row('a',{topics:['DP','动态规划','dp']}),row('b'),row('c',{topics:['动态规划']})];
 const before=JSON.stringify(records), a=A.calculate(records);
 assert.equal(a.topics.length,1); assert.equal(a.topics[0].name,'动态规划'); assert.equal(a.topics[0].count,3);
 assert.equal(JSON.stringify(records),before);
});
test('duplicate CF problems do not inflate evidence',()=>{
 const a=A.calculate([row('a',{origin:'codeforces',cfKey:'1-A'}),row('b',{origin:'codeforces',cfKey:'1-A'}),row('c',{origin:'codeforces',cfKey:'1-A'})]);
 assert.equal(a.thought.count,1); assert.equal(a.strengths.length,0);
});
test('each dimension requires its own three assessed questions',()=>{
 const a=A.calculate([row('a',{codingEvaluation:'not_implemented'}),row('b'),row('c')]);
 assert.equal(a.topics[0].codingCount,1); assert.equal(a.topics[0].codingState,'insufficient');
 assert.equal(a.topics[0].thinkingState,'strong');
});
test('recent scores sort by training date instead of creation date',()=>{
 const r=Array.from({length:30},(_,i)=>row(String(i),{date:'2026-10-28',createdAt:'2026-09-01'}));
 r.push(row('old',{date:'2020-01-01',createdAt:'2030-01-01',thinkingEvaluation:'unsolved'}));
 assert.equal(A.calculate(r).thought.value,4);
});
test('trend compares two nonoverlapping 28 day periods with honest sample limits',()=>{
 assert.equal(typeof A.evidence,'function');
 const r=[...Array.from({length:5},(_,i)=>row('new'+i)),...Array.from({length:5},(_,i)=>row('old'+i,{date:'2026-09-30',thinkingEvaluation:'minor_hint'}))];
 const a=A.evidence(r,'2026-10-28');
 assert.equal(a.trend.thought.delta,2); assert.equal(a.trend.coding.delta,null);
 assert.equal(a.weeks.length,8); assert.equal(a.weeks.reduce((n,w)=>n+w.thought.count,0),10);
 assert.equal(A.evidence(r.slice(1),'2026-10-28').trend.thought.delta,null);
});
test('invalid and future dates are excluded from trend and exposed as data issues',()=>{
 const a=A.evidence([row('a',{date:'2026-02-30'}),row('b',{date:'2099-01-01'}),row('c',{date:'',createdAt:'2026-10-28T01:00:00Z'})],'2026-10-28');
 assert.equal(a.quality.invalidDates,3); assert.equal(a.trend.thought.current.count,0);
});
test('gap review retains history and new occurrences reopen tracking',()=>{
 const a=A.calculate([row('old',{gaps:['线性基'],resolvedGaps:['线性基'],date:'2026-10-01'}),row('new',{gaps:['线性基']})]);
 assert.equal(a.gaps[0].count,2); assert.equal(a.gaps[0].openCount,1); assert.equal(a.gaps[0].resolvedCount,1);
 assert.equal(a.gaps[0].lastSeen,'2026-10-28'); assert.equal(a.gaps[0].state,'reopened');
});
test('automatic sync and malformed entries never invent assessments',()=>{
 const a=A.evidence([null,42,{id:'cf',origin:'codeforces',status:'ac',rating:'2400',date:'2026-10-28'}],'2026-10-28');
 assert.equal(a.thought.value,null); assert.equal(a.quality.assessed,0); assert.equal(a.quality.total,1);
});
test('growth UI exposes evidence, trends, gap actions and record filters',()=>{
 const html=fs.readFileSync(require('node:path').join(__dirname,'../source/acm-app/index.html'),'utf8');
 for(const id of ['training-evidence','training-trend','record-evidence-filter','record-scope'])assert.ok(html.includes('id="'+id+'"'),id);
 assert.ok(html.includes('data-review-gap')); assert.ok(html.includes('data-evidence-name'));
});
test('record renderer shows escaped labels and review status',()=>{
 const html=fs.readFileSync(require('node:path').join(__dirname,'../source/acm-app/index.html'),'utf8');
 const render=html.slice(html.indexOf('function recordMarkup('),html.indexOf('function recentRecords('));
 const context={ANALYSIS:A,sumSeconds:()=>0,fmtCompact:()=>'',fmtDate:v=>v,STATUS_CLASS:{ac:'ac'},STATUS_NAMES:{ac:'已 AC'},esc:v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))};
 vm.createContext(context);vm.runInContext(render,context);
 const out=context.recordMarkup({id:'a',title:'<img>',topics:['dp'],gaps:['线性基'],resolvedGaps:['线性基'],status:'ac'},true);
 assert.ok(out.includes('动态规划'));assert.ok(out.includes('线性基（已复习）'));assert.ok(!out.includes('<img>'));
});
test('record search treats known English and Chinese tags as the same topic',()=>{
 const html=fs.readFileSync(require('node:path').join(__dirname,'../source/acm-app/index.html'),'utf8');
 const render=html.slice(html.indexOf('function renderRecords('),html.indexOf('function progressMarkup('));
 const elements={'record-search':{value:'dp'},'record-status-filter':{value:'all'},'record-sort':{value:'newest'},'record-evidence-filter':{value:'all'},'record-scope':{},'all-records':{}};
 const context={ANALYSIS:A,db:{records:[row('a',{topics:['动态规划']}),row('b',{topics:['dp']})]},evidenceScope:null,$:id=>elements[id],esc:v=>v,recordMarkup:r=>r.id};
 vm.createContext(context);vm.runInContext(render+';renderRecords()',context);
 assert.ok(elements['record-scope'].innerHTML.includes('匹配 2 条'));
});
test('a duplicate record ID is excluded even when CF problem identities differ',()=>{
 const a=A.calculate([row('same',{origin:'codeforces',cfKey:'1-A'}),row('same',{origin:'codeforces',cfKey:'2-A'}),row('same')]);
 assert.equal(a.thought.count,1);assert.equal(a.strengths.length,0);
});
test('loading legacy records does not fabricate a training date for the trend',()=>{
 const html=fs.readFileSync(require('node:path').join(__dirname,'../source/acm-app/index.html'),'utf8');
 const load=html.slice(html.indexOf('function freshData('),html.indexOf('let db=loadData()'));
 const fixture={profile:{},timer:{},records:[{id:'old',title:'Legacy',thinkingEvaluation:'independent_proved'}]};
 const context={localStorage:{getItem:()=>JSON.stringify(fixture)},STORAGE_KEY:'test',PHASES:['thinking'],todayISO:()=>'2026-10-28'};
 vm.createContext(context);vm.runInContext(load,context);
 const data=context.loadData();assert.equal(data.records[0].date,'');
 assert.equal(A.evidence(data.records,'2026-10-28').trend.thought.current.count,0);
});
test('gap review rolls back on storage failure and never changes notes or assessments',()=>{
 const html=fs.readFileSync(require('node:path').join(__dirname,'../source/acm-app/index.html'),'utf8');
 const fn=html.slice(html.indexOf('function reviewGap('),html.indexOf('function renderGrowth('));
 const record=row('a',{gaps:['线性基'],notes:'原备注',totalSeconds:123});
 const before=JSON.stringify(record),context={ANALYSIS:A,db:{records:[record]},saveData:()=>false,renderAll:()=>{},showToast:()=>{}};
 vm.createContext(context);vm.runInContext(fn,context);context.reviewGap('线性基',true);
 assert.equal(context.db.records[0],record);assert.equal(JSON.stringify(record),before);
 context.saveData=()=>true;context.reviewGap('线性基',true);
 assert.equal(context.db.records[0].resolvedGaps[0],'线性基');assert.equal(context.db.records[0].notes,'原备注');assert.equal(context.db.records[0].totalSeconds,123);
 context.reviewGap('线性基',false);assert.equal(context.db.records[0].resolvedGaps.length,0);
});
test('loading backups preserves review, CF metadata, ratings and timer',()=>{
 const html=fs.readFileSync(require('node:path').join(__dirname,'../source/acm-app/index.html'),'utf8');
 const load=html.slice(html.indexOf('function freshData('),html.indexOf('let db=loadData()'));
 const fixture={profile:{thinkingRating:2100,codingRating:1900},cf:{handle:'fixture',rating:1700},timer:{phase:'thinking',seconds:{thinking:42},title:'keep'},records:[row('a',{title:'Keep',gaps:['线性基'],resolvedGaps:['线性基'],cfKey:'1-A',notes:'keep'})]};
 const context={localStorage:{getItem:()=>JSON.stringify(fixture)},STORAGE_KEY:'test',PHASES:['thinking'],todayISO:()=>'2026-10-28'};
 vm.createContext(context);vm.runInContext(load,context);const data=context.loadData();
 assert.equal(data.records[0].resolvedGaps[0],'线性基');assert.equal(data.records[0].cfKey,'1-A');assert.equal(data.records[0].notes,'keep');
 assert.equal(data.profile.thinkingRating,2100);assert.equal(data.profile.codingRating,1900);assert.equal(data.cf.rating,1700);assert.equal(data.timer.seconds.thinking,42);
});
