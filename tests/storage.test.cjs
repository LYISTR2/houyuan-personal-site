const {test} = require('node:test');
const assert = require('node:assert/strict');
require('../assets/js/storage.js');
const {transfer,recover} = global.BackyardStorage;
const FARM='pixelfarm-v1',MINE='yard-world-v1',JOURNAL='backyard-transfer-v1';
function fixture() {
  const values=new Map([
    [FARM,JSON.stringify({v:4,coins:82,plots:[{s:'wheat'}],town:{stock:{wood:7,stone:3,iron:2,wheat:9},friends:{mian:25}}})],
    [MINE,JSON.stringify({v:1,seed:42,tiles:[1,2,3],inv:{4:5,2:4,iron:6,potion:3},p:{x:100,y:200,hp:85}})]
  ]);
  return {getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
}
const read=(s,k)=>JSON.parse(s.getItem(k));
test('materials move in both directions without changing crops, terrain, friendships, or consumables',()=>{
  const s=fixture();const a=transfer('to-mine',s);
  assert.equal(a.mine.inv[4],12);assert.equal(a.mine.inv[2],7);assert.equal(a.mine.inv.iron,8);
  assert.equal(a.farm.town.stock.wood,0);assert.equal(a.farm.coins,82);assert.deepEqual(a.mine.tiles,[1,2,3]);
  const b=transfer('to-farm',s);
  assert.equal(b.farm.town.stock.wood,12);assert.equal(b.farm.town.stock.iron,8);assert.equal(b.mine.inv.potion,3);
  assert.deepEqual(b.farm.town.friends,{mian:25});assert.equal(s.getItem(JOURNAL),null);
});
test('a repeated settlement does not grant the same materials twice',()=>{
  const s=fixture();transfer('to-farm',s);const second=transfer('to-farm',s);
  assert.deepEqual(second.moved,{});assert.equal(second.farm.town.stock.wood,12);
});
test('crafting consumes actual shared materials across visits',()=>{
  const s=fixture();transfer('to-mine',s);const mine=read(s,MINE);mine.inv[4]-=3;s.setItem(MINE,JSON.stringify(mine));
  const result=transfer('to-farm',s);assert.equal(result.farm.town.stock.wood,9);
});
for(const failAt of [1,2,3,4])test(`interrupted write ${failAt} preserves material totals and can recover`,()=>{
  const s=fixture(),set=s.setItem,remove=s.removeItem;let writes=0;
  s.setItem=(k,v)=>{if(++writes===failAt)throw new Error('quota');return set(k,v);};
  s.removeItem=k=>{if(++writes===failAt)throw new Error('interrupted');return remove(k);};
  assert.throws(()=>transfer('to-mine',s));s.setItem=set;s.removeItem=remove;
  recover(s);transfer('to-farm',s);
  assert.equal(read(s,FARM).town.stock.wood,12);assert.equal(read(s,FARM).town.stock.iron,8);
  assert.equal(read(s,MINE).inv[4],0);assert.equal(s.getItem(JOURNAL),null);
});
test('invalid direction or missing save fails before any write',()=>{
  const s=fixture(),before=s.getItem(FARM);assert.throws(()=>transfer('unknown',s));assert.equal(s.getItem(FARM),before);
  s.removeItem(MINE);assert.throws(()=>transfer('to-mine',s));assert.equal(s.getItem(FARM),before);
});
test('a full destination leaves surplus in the source',()=>{
  const s=fixture(),mine=read(s,MINE);mine.inv[4]=999998;s.setItem(MINE,JSON.stringify(mine));
  const result=transfer('to-mine',s);assert.equal(result.mine.inv[4],999999);assert.equal(result.farm.town.stock.wood,6);
});
