'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=path.resolve(__dirname,'../source/acm-app');
const sandbox={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(source,'assessment.js'),'utf8'),sandbox,{filename:'assessment.js'});
const A=sandbox.window.ACMCoachAnalysis;
assert.ok(A,'Analysis module missing');
assert.equal(A.calculate([]).thought.value,null);
assert.equal(A.calculate([]).coding.value,null);
assert.equal(A.calculate([{id:'old',status:'ac',rating:'2400',notes:'old'}]).assessedCount,0,'Legacy records must remain unscored');
const sample=[
 {id:'a',date:'2026-10-26',topics:'图论，动态规划',gaps:'线性基',thinkingEvaluation:'independent_proved',codingEvaluation:'independent_ac'},
 {id:'b',date:'2026-10-25',topics:['图论','数学'],gaps:'线性基',thinkingEvaluation:'minor_hint',codingEvaluation:'independent_unaccepted'},
 {id:'c',date:'2026-10-24',topics:'图论',thinkingEvaluation:'independent_model',codingEvaluation:'assisted_ac'},
 {id:'cf',origin:'codeforces',date:'2026-10-23',status:'ac',topics:'图论',rating:'2400'}
];
const out=A.calculate(sample);
assert.equal(out.thought.value,3);
assert.equal(out.coding.value,3);
assert.equal(out.assessedCount,3,'Automatic CF records must not count as assessed');
assert.equal(out.thought.count,3);
assert.equal(out.topics.find(x=>x.name==='图论').thinking,3);
assert.equal(out.gaps.find(x=>x.name==='线性基').count,2);
assert.equal(A.csv('图论，图论,数据结构').length,2);
const enough=A.calculate(Array.from({length:3},(_,i)=>({id:i,topics:'图论',thinkingEvaluation:'independent_proved',codingEvaluation:'independent_ac'})));
assert.equal(enough.strengths[0].name,'图论');
const weak=A.calculate(Array.from({length:3},(_,i)=>({id:i,topics:'网络流',thinkingEvaluation:'unsolved',codingEvaluation:'not_implemented'})));
assert.equal(weak.weaknesses[0].name,'网络流');
const html=fs.readFileSync(path.join(source,'index.html'),'utf8');
assert.ok(html.includes('id="home-thinking-score"')&&html.includes('id="growth-coding-score"'));
assert.ok(html.includes('id="profile-thinking-rating"')&&html.includes('id="profile-coding-rating"'));
assert.ok(html.includes('CF Rating 估值'));
assert.ok(!html.includes('0–100 的训练表现指数'));
assert.ok(!html.includes('<small> / 100</small>'));
assert.ok(html.includes('id="record-thinking"')&&html.includes('id="record-gaps"'));
assert.ok(html.includes('assessment.js'));
const inline=html.match(/<script>\s*\(function\(\)\{[\s\S]*?<\/script>/);
assert.ok(inline,'Main application script missing');
new vm.Script(inline[0].replace(/^<script>/,'').replace(/<\/script>$/,''));
console.log('ACM Coach assessment tests passed, legacy records remain compatible.');
