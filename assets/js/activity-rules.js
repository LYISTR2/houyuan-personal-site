/* Small pure rules shared by the outdoor games and their regression tests. */
(function (root) {
  'use strict';
  const integer=(n,max=999999)=>Number.isFinite(n)?Math.max(0,Math.min(max,Math.floor(n))):0;
  function normalize(raw={},trees=[]) {
    const state={v:1,tickets:integer(raw.tickets),wood:integer(raw.wood),catches:integer(raw.catches),
      parkDay:integer(raw.parkDay),parkRewards:integer(raw.parkRewards,3),best:{},trees:{}};
    for(const id of ['rings','targets','memory'])state.best[id]=integer(raw.best?.[id],100);
    for(const tree of trees)state.trees[tree.id]={hits:integer(raw.trees?.[tree.id]?.hits,2),regrowAt:integer(raw.trees?.[tree.id]?.regrowAt,24000000)};
    return state;
  }
  const treeStage=(tree,clock)=>!tree?.regrowAt||tree.regrowAt<=clock?'grown':tree.regrowAt-clock>12?'stump':'sapling';
  const ringScore=(cursor,target)=>Math.abs(cursor-target)<=6?3:Math.abs(cursor-target)<=13?1:0;
  function reelStep(state,held,dt) {
    dt=Math.max(0,Math.min(.05,dt));
    const elapsed=state.elapsed+dt;
    const cursor=Math.max(15,Math.min(85,state.cursor+(held?39:-28)*dt));
    const fish=50+27*Math.sin(elapsed*.95+state.phase)+6*Math.sin(elapsed*2.1);
    const aligned=Math.abs(cursor-fish)<=(state.window||16);
    const progress=Math.max(0,Math.min(100,state.progress+(aligned?24:-13)*dt));
    return {...state,cursor,fish,elapsed,progress,aligned};
  }
  function parkReward(state,kind,score,day) {
    const next=structuredClone(state);
    next.best[kind]=Math.max(next.best[kind]||0,integer(score,100));
    if(next.parkDay!==day){next.parkDay=day;next.parkRewards=0;}
    const tickets=score>0&&next.parkRewards<3?Math.min(5,Math.max(1,Math.ceil(score/(kind==='targets'?4:kind==='memory'?2:3)))):0;
    if(tickets){next.tickets+=tickets;next.parkRewards++;}
    return {state:next,tickets,coins:tickets*2};
  }
  const prizes={
    seeds:{name:'麦子种子包 ×3',cost:3,item:'wheat',n:3,type:'seeds'},
    bait:{name:'鱼饵 ×4',cost:2,item:'bait',n:4,type:'stock'},
    feed:{name:'谷物饲料 ×3',cost:3,item:'feed',n:3,type:'stock'},
    compost:{name:'堆肥 ×2',cost:5,n:2,type:'compost'}
  };
  root.BackyardActivityRules={normalize,treeStage,ringScore,reelStep,parkReward,prizes};
})(globalThis);
