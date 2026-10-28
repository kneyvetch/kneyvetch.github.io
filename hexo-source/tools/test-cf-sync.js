'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const sandbox={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../source/acm-app/cf-sync.js'),'utf8'),sandbox);
const C=sandbox.window.ACMCoachCF;
const sub=(id,verdict,tags=['dp'])=>({id,creationTimeSeconds:1793100000+id,verdict,problem:{contestId:100,index:'A',name:'Example',tags,rating:1200}});
test('submissions group by problem, keep earliest AC and do not invent self evaluations',()=>{
 const rows=C.recordsFromSubmissions([sub(3,'OK'),sub(1,'WRONG_ANSWER'),sub(2,'OK')]);
 assert.equal(rows.length,1);assert.equal(rows[0].cfAttempts,3);assert.equal(rows[0].status,'ac');
 assert.equal(rows[0].thinkingEvaluation,undefined);assert.equal(rows[0].codingEvaluation,undefined);
 assert.equal(rows[0].createdAt,new Date(1793100002*1000).toISOString());
});
test('repeat sync preserves notes, labels, review state, assessments, time and original date',()=>{
 const old={...C.recordsFromSubmissions([sub(1,'WRONG_ANSWER')])[0],topics:['自定义算法'],gaps:['线性基'],resolvedGaps:['线性基'],notes:'不要覆盖',thinkingEvaluation:'minor_hint',totalSeconds:600,date:'2026-10-01'};
 const records=[old], incoming=C.recordsFromSubmissions([sub(2,'OK')]);
 assert.equal(C.mergeRecords(records,incoming).added,0);C.mergeRecords(records,incoming);
 assert.equal(records.length,1);assert.equal(old.status,'ac');assert.equal(old.notes,'不要覆盖');assert.equal(old.topics[0],'自定义算法');
 assert.equal(old.resolvedGaps[0],'线性基');assert.equal(old.thinkingEvaluation,'minor_hint');assert.equal(old.totalSeconds,600);assert.equal(old.date,'2026-10-01');
});
test('an incomplete later sync cannot downgrade a previously accepted problem',()=>{
 const records=C.recordsFromSubmissions([sub(2,'OK')]); C.mergeRecords(records,C.recordsFromSubmissions([sub(3,'WRONG_ANSWER')]));
 assert.equal(records[0].status,'ac');
});
