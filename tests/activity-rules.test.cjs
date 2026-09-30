const {test}=require('node:test');
const assert=require('node:assert/strict');
require('../assets/js/activity-rules.js');
const R=global.BackyardActivityRules;

test('old saves gain outdoor state and malformed counters cannot grant rewards',()=>{
  assert.equal(R.normalize({},[{id:'oak'}]).trees.oak.hits,0);
  const s=R.normalize({tickets:-8,parkRewards:99,best:{rings:Infinity},trees:{oak:{hits:10}}},[{id:'oak'}]);
  assert.equal(s.tickets,0);assert.equal(s.parkRewards,3);assert.equal(s.best.rings,0);assert.equal(s.trees.oak.hits,2);
});
test('felled trees become saplings at twelve hours and harvestable at twenty-four',()=>{
  const tree={regrowAt:72};
  assert.equal(R.treeStage(tree,48),'stump');assert.equal(R.treeStage(tree,59),'stump');
  assert.equal(R.treeStage(tree,60),'sapling');assert.equal(R.treeStage(tree,71),'sapling');
  assert.equal(R.treeStage(tree,72),'grown');assert.equal(R.treeStage({},0),'grown');
});
test('ring timing distinguishes perfect shots, outer hits and misses',()=>{
  assert.equal(R.ringScore(44,50),3);assert.equal(R.ringScore(56,50),3);
  assert.equal(R.ringScore(63,50),1);assert.equal(R.ringScore(36.9,50),0);
});
test('three successful park rounds reward per day, practice preserves personal best',()=>{
  let s=R.normalize();
  const miss=R.parkReward(s,'rings',0,1);assert.equal(miss.tickets,0);assert.equal(miss.state.parkRewards,0);
  for(let i=0;i<3;i++)s=R.parkReward(s,'rings',6,1).state;
  assert.equal(s.tickets,6);
  const capped=R.parkReward(s,'targets',20,1);assert.equal(capped.tickets,0);assert.equal(capped.state.best.targets,20);
  const next=R.parkReward(capped.state,'memory',8,2);assert.equal(next.tickets,4);assert.equal(next.state.parkRewards,1);
  assert.equal(s.best.targets,0); // Rules do not mutate the persisted input before settlement.
});
test('reeling progresses with control and remains stable across frame rates',()=>{
  const initial={elapsed:0,cursor:50,progress:24,phase:0,window:16};
  const simulate=step=>{let s={...initial};for(let i=0;i<6/step;i++)s=R.reelStep(s,s.cursor<s.fish,step);return s;};
  assert.equal(simulate(1/60).progress,100);assert.equal(simulate(1/120).progress,100);
  const lost=R.reelStep({...initial,cursor:15,phase:Math.PI/2},false,.05);assert.ok(lost.progress<24);
  const stalled=R.reelStep(initial,true,10);assert.equal(stalled.elapsed,.05);assert.ok(stalled.cursor<=85);
});
