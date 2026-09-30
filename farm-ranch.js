"use strict";
/* 河湾牧场：共用 town 存档与物品，所有消耗只发生在游戏时间。 */
const RANCH_TYPES={
 hen:{name:'小母鸡',zone:'birds',item:'eggs',cost:35,names:['米粒','小黄','桂花','栗子'],color:'#f5df9e'},
 duck:{name:'小鸭',zone:'birds',item:'duckegg',cost:55,names:['水花','青豆','团团','雨点'],color:'#eee9d3'},
 cow:{name:'奶牛',zone:'herd',item:'milk',cost:80,names:['奶糖','云朵','花花','小雪'],color:'#f1e6cd'},
 sheep:{name:'绵羊',zone:'herd',item:'wool',cost:70,names:['棉花','绒绒','软糖','雪球'],color:'#f3e9d6'}
};
const RANCH_UPGRADES=[
 {id:'pond',name:'鸭塘',cost:80,need:{wood:3,stone:2},desc:'蓄一池清水，开放小鸭领养。'},
 {id:'barn',name:'牛羊棚',cost:160,need:{wood:6,stone:3},desc:'开放奶牛和绵羊；雨夜可以回棚。'},
 {id:'workshop',name:'牧场加工屋',cost:100,need:{wood:4,stone:2},desc:'鲜奶做奶酪、羊毛纺毛线，牧草晒成干草。'},
 {id:'composter',name:'堆肥箱',cost:60,need:{wood:3},desc:'圈舍肥料原料处理为种植园堆肥。'},
 {id:'birds',name:'加宽鸡鸭院',cost:100,need:{wood:5},desc:'鸡鸭容量 6 → 8，宽敞照料不再有拥挤减益。'},
 {id:'herd',name:'扩建牛羊区',cost:150,need:{wood:5,stone:3},desc:'牛羊容量 4 → 6，扩展草场与围栏。'},
 {id:'water',name:'自动饮水器',cost:140,need:{wood:2,stone:5},desc:'每晨自动补满饮水槽，鸭塘仍需手动清理。'},
 {id:'feeder',name:'大饲料槽',cost:120,need:{wood:5,stone:2},desc:'槽容量增加，每晨从背包自动补料；缺库存不扣钱。'}
];
const RANCH_RECIPES=[
 {id:'grain',name:'拌谷物饲料',need:{wheat:1},out:'feed',n:3,hours:1},
 {id:'hay',name:'晒干牧草',need:{grass:2},out:'hay',n:3,hours:2,building:'workshop'},
 {id:'cheese',name:'熟成奶酪',need:{milk:2},out:'cheese',n:1,hours:4,building:'workshop'},
 {id:'yarn',name:'纺一团毛线',need:{wool:2},out:'yarn',n:1,hours:3,building:'workshop'},
 {id:'compost',name:'处理堆肥',need:{manure:3},out:'compost',n:2,hours:2,building:'composter'}
];
const RANCH_PRODUCTS=['eggs','duckegg','milk','wool'];
let ranchEffects=[],ranchMapRect=null,ranchHits=[],ranchHover='';
const ranchCapacity=zone=>(zone==='birds'?6:4)+(town.ranch.buildings[zone]?2:0);
const ranchTroughCap=()=>town.ranch.buildings.feeder?32:16;
const ranchAnimals=zone=>town.ranch.animals.filter(a=>RANCH_TYPES[a.type].zone===zone);
const ranchEscape=text=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function ranchNewAnimal(type){const t=RANCH_TYPES[type],n=town.ranch.serial++;return {id:'a'+n,type,name:t.names[(n-1)%t.names.length],personality:['亲人','贪吃','胆小'][(n-1)%3],friend:0,mood:75,fed:true,touched:0,ready:0,readyQ:0,growth:0};}
function normalizeRanch(){
 const s=safeObject(town.ranch),fresh=s.v!==1;
 const r={v:1,serial:Math.max(1,limit(s.serial)),animals:[],buildings:{},zones:{},quality:{},jobs:[],lastDay:limit(s.lastDay)||day,grazing:!!s.grazing,pasture:fresh?12:limit(s.pasture,24),pond:fresh?100:limit(s.pond,100)};
 for(const u of RANCH_UPGRADES)r.buildings[u.id]=limit(safeObject(s.buildings)[u.id],1);
 r.buildings.barn=Math.max(r.buildings.barn,town.buildings.barn||0);
 for(const z of ['birds','herd']){const q=safeObject(safeObject(s.zones)[z]);r.zones[z]={food:fresh?6:limit(q.food,32),water:fresh?16:limit(q.water,32),dirt:limit(q.dirt,100)};}
 const ids=new Set();
 if(Array.isArray(s.animals))for(const a of s.animals.slice(0,14)){if(!a||!RANCH_TYPES[a.type]||!/^a\d+$/.test(a.id)||ids.has(a.id))continue;ids.add(a.id);r.serial=Math.max(r.serial,Number(a.id.slice(1))+1);r.animals.push({id:a.id,type:a.type,name:String(a.name||RANCH_TYPES[a.type].name).slice(0,12),personality:['亲人','贪吃','胆小'].includes(a.personality)?a.personality:'亲人',friend:limit(a.friend,100),mood:limit(a.mood,100),fed:!!a.fed,touched:limit(a.touched),ready:limit(a.ready,a.type==='sheep'?1:a.type==='cow'?2:6),readyQ:limit(a.readyQ,2),growth:limit(a.growth,3)});}
 for(const id of RANCH_PRODUCTS){const bins=safeObject(s.quality)[id];r.quality[id]=[0,1,2].map(q=>limit(bins?.[q]));const n=town.stock[id]||0,total=r.quality[id].reduce((a,b)=>a+b,0);if(total<=n)r.quality[id][0]+=n-total;else r.quality[id]=[n,0,0];}
 if(Array.isArray(s.jobs))r.jobs=s.jobs.slice(0,3).filter(j=>j&&RANCH_RECIPES.some(q=>q.id===j.recipe)&&Number.isFinite(j.finish)).map(j=>({recipe:j.recipe,finish:limit(j.finish,24000000)}));
 town.ranch=r;
 if(fresh){for(let i=0;i<town.hens;i++)r.animals.push(ranchNewAnimal('hen'));for(let i=0;i<town.cows;i++)r.animals.push(ranchNewAnimal('cow'));}
 ranchSyncCounts();save();
}
function ranchSyncCounts(){town.hens=town.ranch.animals.filter(a=>a.type==='hen').length;town.cows=town.ranch.animals.filter(a=>a.type==='cow').length;}
function ranchConsumeQuality(id,n){const bins=town.ranch?.quality[id];if(!bins)return;for(let q=0;q<3&&n>0;q++){const k=Math.min(bins[q],n);bins[q]-=k;n-=k;}}
function ranchSellProduct(id,n){const bins=town.ranch.quality[id];let value=0;for(let q=0;q<3&&n>0;q++){const k=Math.min(bins[q],n);bins[q]-=k;town.stock[id]-=k;n-=k;value+=k*Math.round(townSellPrice(id)*qualityRate[q]);}coins+=value;return value;}
function ranchHour(){
 const r=town.ranch;
 if(hour===6&&r.lastDay!==day){
  r.lastDay=day;r.pasture=Math.min(24,r.pasture+8);
  if(r.buildings.water)for(const zone of Object.values(r.zones))zone.water=32;
  if(r.buildings.feeder)for(const z of ['birds','herd'])ranchFill(z,false);
  for(const a of r.animals){
   const t=RANCH_TYPES[a.type],zone=r.zones[t.zone];
   const pasture=t.zone==='herd'&&r.grazing&&day%5!==0&&r.pasture>0;
   const food=pasture||zone.food>0,water=zone.water>0;
   if(pasture)r.pasture--;else if(food)zone.food--;
   if(water)zone.water--;
   a.fed=food&&water;
   const crowded=!r.buildings[t.zone]&&ranchAnimals(t.zone).length>(t.zone==='birds'?4:3);
   const comfortable=zone.dirt<60&&(!crowded)&&(a.type!=='duck'||r.pond>=40);
   a.mood=Math.max(0,Math.min(100,a.mood+(a.fed?(comfortable?8:-6):-18)+(pasture?5:0)));
   if(!a.fed||a.mood<25)continue;
   const q=a.mood>=85&&a.friend>=40?2:a.mood>=65&&a.friend>=15?1:0;
   if(a.type==='sheep'){if(a.ready)continue;a.growth++;if(a.growth>=3){a.ready=1;a.readyQ=q;}}
   else if(a.ready<(a.type==='cow'?2:6)){if(!a.ready)a.readyQ=q;else a.readyQ=Math.min(q,a.readyQ);a.ready++;}
  }
  for(const z of ['birds','herd'])r.zones[z].dirt=Math.min(100,r.zones[z].dirt+ranchAnimals(z).length*9);
  if(r.buildings.pond)r.pond=Math.max(0,r.pond-r.animals.filter(a=>a.type==='duck').length*12);
 }
 const ready=r.jobs.filter(j=>j.finish<=dayClock());r.jobs=r.jobs.filter(j=>j.finish>dayClock());
 for(const j of ready){const recipe=RANCH_RECIPES.find(p=>p.id===j.recipe);if(recipe.out==='compost')compost+=recipe.n;else town.stock[recipe.out]=(town.stock[recipe.out]||0)+recipe.n;flash(recipe.name+'完成 · '+recipe.n+' 份已入仓');}
}
function ranchFill(zone,message=true){
 const r=town.ranch,z=r.zones[zone],space=ranchTroughCap()-z.food;if(space<=0)return 0;
 let n=0;if(zone==='birds'){n=Math.min(space,amount('feed'));if(n){consume({feed:n});z.food+=n;}}
 else{let left=space;for(const id of ['grass','hay']){const k=Math.min(left,amount(id));if(k){consume({[id]:k});z.food+=k;n+=k;left-=k;}}}
 if(message)flash(n?'补入 '+n+' 份饲料':zone==='birds'?'先用麦子加工饲料，或到集市购买':'先收获牧草，或到集市购买干草');return n;
}
function ranchCollect(a){
 if(!a?.ready)return false;const t=RANCH_TYPES[a.type],n=a.ready,q=a.readyQ;town.stock[t.item]+=n;town.ranch.quality[t.item][q]+=n;a.ready=0;if(a.type==='sheep')a.growth=0;
 ranchEffects.push({id:a.id,text:quality[q]+' '+itemName(t.item)+' +'+n,until:sceneTime+1800});flash(a.name+' · '+quality[q]+' '+itemName(t.item)+' ×'+n+' 入仓');return true;
}
function ranchAction(action,id){
 const r=town.ranch,a=r.animals.find(a=>a.id===id);let message='';
 if(action==='fill')ranchFill(id);
 else if(action==='water'){const z=r.zones[id];if(!z)return;z.water=32;message='饮水槽已添满';}
 else if(action==='clean'){const z=r.zones[id];if(!z)return;const n=Math.floor(z.dirt/15);z.dirt=0;town.stock.manure+=n;message='圈舍清理好啦 · 肥料原料 +'+n;}
 else if(action==='pond'){if(!r.buildings.pond)return;r.pond=100;message='鸭塘换了清水';}
 else if(action==='graze'){if(!r.buildings.barn)return;r.grazing=!r.grazing;message=r.grazing?'围栏打开 · 晴天清晨用草场代替槽料':'已收回棚里 · 清晨使用槽料';}
 else if(action==='touch'){if(!a||a.touched===day)return;a.touched=day;a.friend=Math.min(100,a.friend+(a.personality==='亲人'?7:5));a.mood=Math.min(100,a.mood+6);ranchEffects.push({id:a.id,text:'♥',until:sceneTime+1400});message=a.name+(a.type==='cow'?'舒服地靠过来让你刷毛':'蹭了蹭你的手')+' · 亲密 '+a.friend;}
 else if(action==='rename'){if(!a)return;const name=document.getElementById('ranchName')?.value.trim();if(!name){flash('给它起一个名字吧');return;}a.name=name.slice(0,12);message='以后就叫 '+a.name+' 啦';}
 else if(action==='collect'){if(!ranchCollect(a))return;}
 else if(action==='collect-all'){let n=0;for(const a of r.animals)if(ranchCollect(a))n++;message=n?'收好了 '+n+' 只动物的产物':'窝里和棚里还没有可收取的产物';}
 else if(action==='adopt'){
  const t=RANCH_TYPES[id];if(!t||coins<t.cost||ranchAnimals(t.zone).length>=ranchCapacity(t.zone)||(id==='duck'&&!r.buildings.pond)||(t.zone==='herd'&&!r.buildings.barn))return;
  coins-=t.cost;r.animals.push(ranchNewAnimal(id));ranchSyncCounts();message=r.animals.at(-1).name+'住进河湾牧场';
 }else if(action==='build'){
  const u=RANCH_UPGRADES.find(u=>u.id===id);if(!u||r.buildings[id]||coins<u.cost||!canAfford(u.need)||(id==='herd'&&!r.buildings.barn))return;
  consume(u.need);coins-=u.cost;r.buildings[id]=1;if(id==='barn')town.buildings.barn=1;if(id==='pond')r.pond=100;message=u.name+'建好了';
 }else if(action==='craft'){
  const recipe=RANCH_RECIPES.find(q=>q.id===id);if(!recipe||r.jobs.length>=3||(recipe.building&&!r.buildings[recipe.building])||!consume(recipe.need))return;
  r.jobs.push({recipe:id,finish:dayClock()+recipe.hours});message=recipe.name+'开工了';
 }else if(action==='sell'){
  if(!RANCH_PRODUCTS.includes(id)||!amount(id))return;const value=ranchSellProduct(id,amount(id));message='售出 '+itemName(id)+' · +'+value+'◈';
 }else return;
 save();hud();if(message)flash(message);showTown(activePlace,false);
}
function ranchStatus(){const r=town.ranch;return '河湾牧场 · '+r.animals.length+' 位伙伴 · '+r.animals.reduce((n,a)=>n+a.ready,0)+' 份待收 · 晴天放牧 / 雨夜回棚';}
const ranchBtn=(text,action,id='',disabled=false,secondary=false)=>btn(text,'ranch-'+action,id,disabled,secondary);
function renderRanchDialog(place){
 const r=town.ranch,animalId=place.startsWith('ranch-animal-')?place.slice(13):'',a=r.animals.find(a=>a.id===animalId);
 let title='河湾牧场',html='<div class="ranch-summary"><span>第 '+day+' 天 · '+String(hour).padStart(2,'0')+':00</span><span>零钱 '+coins+'◈</span><span>伙伴 '+r.animals.length+'</span></div>';
 if(a){
  const t=RANCH_TYPES[a.type];title=a.name+'的小档案';
  html+='<div class="ranch-profile"><div class="ranch-portrait '+a.type+'"><span>'+({hen:'鸡',duck:'鸭',cow:'牛',sheep:'羊'})[a.type]+'</span></div><div><h3>'+ranchEscape(a.name)+' · '+t.name+'</h3><p>'+a.personality+' · '+(a.fed?'最近一次清晨吃饱喝足':'最近一次清晨缺粮或水')+'</p>'+ranchMeter('心情',a.mood)+ranchMeter('亲密',a.friend)+'<p>'+(a.type==='sheep'?'羊毛长势 '+a.growth+'/3 天':itemName(t.item)+'待收 '+a.ready)+' · '+(a.ready?quality[a.readyQ]:'持续照料会提升品质')+'</p></div></div><div class="town-buttons">'+ranchBtn(a.type==='cow'?'刷刷毛':'摸摸它','touch',a.id,a.touched===day)+ranchBtn(({hen:'捡鸡蛋',duck:'捡鸭蛋',cow:'挤牛奶',sheep:'剪羊毛'})[a.type],'collect',a.id,!a.ready,true)+'</div><label class="ranch-name">名字 <input id="ranchName" maxlength="12" value="'+ranchEscape(a.name)+'">'+ranchBtn('改名','rename',a.id,false,true)+'</label><p class="town-note">每天一次亲密奖励。缺粮缺水只会减产或停产，不会丢失动物；关闭页面不会消耗资源。</p>';
 }else if(place==='ranch-adopt'){
  title='领养小伙伴';html+=intro('每只伙伴都有名字与性格，没有出售或屠宰玩法。鸡鸭共用一个院，牛羊共用草场；先改善住处，再慢慢添伙伴。')+'<div class="town-grid">';
  for(const [id,t]of Object.entries(RANCH_TYPES)){const locked=id==='duck'&&!r.buildings.pond||t.zone==='herd'&&!r.buildings.barn,n=ranchAnimals(t.zone).length;html+='<article class="town-card"><h3>'+t.name+'</h3><p>'+({hen:'谷物饲料，每晨产蛋；窝满 6 枚后暂停。',duck:'谷物饲料，需要鸭塘；水质影响心情。',cow:'牧草或干草，每晨产奶；点击挤奶，最多暂存 2 份。',sheep:'牧草或干草，照料 3 个清晨长好一份羊毛。'})[id]+'</p><small>'+t.cost+'◈ · 同区 '+n+'/'+ranchCapacity(t.zone)+(locked?' · 先建'+(id==='duck'?'鸭塘':'牛羊棚'):'')+'</small><div class="town-buttons">'+ranchBtn('领养','adopt',id,locked||coins<t.cost||n>=ranchCapacity(t.zone))+'</div></article>';}
  html+='</div>';
 }else if(place==='ranch-build'){
  title='扩建河湾牧场';html+=intro('鸡鸭院从一开始就能使用，旧牛棚会保留。升级会改变地图；自动设施只减少照料操作，不凭空生成饲料。')+'<div class="town-grid">';
  for(const u of RANCH_UPGRADES)html+='<article class="town-card"><h3>'+u.name+(r.buildings[u.id]?' · 已建好':'')+'</h3><p>'+u.desc+'</p><small>'+u.cost+'◈ · '+needText(u.need)+'</small><div class="town-buttons">'+ranchBtn(r.buildings[u.id]?'已开放':'建造','build',u.id,!!r.buildings[u.id]||coins<u.cost||!canAfford(u.need)||u.id==='herd'&&!r.buildings.barn)+'</div></article>';
  html+='</div>';
 }else if(place==='ranch-work'){
  title='干草棚与加工屋';html+=intro('游戏时间到点后入仓。原料开工时扣除，最多同时 3 单；蛋奶也能带到小镇厨房做早餐。')+'<section class="town-card"><h3>加工队列 '+r.jobs.length+'/3</h3>'+(r.jobs.length?r.jobs.map(j=>'<p>'+RANCH_RECIPES.find(q=>q.id===j.recipe).name+' · 剩余 '+Math.max(0,j.finish-dayClock())+' 小时</p>').join(''):'<p>还没有安排加工。</p>')+'</section><div class="town-grid" style="margin-top:12px">';
  for(const q of RANCH_RECIPES){const locked=q.building&&!r.buildings[q.building];html+='<article class="town-card"><h3>'+q.name+'</h3><p>'+needText(q.need)+' → '+(q.out==='compost'?'堆肥':itemName(q.out))+' ×'+q.n+'</p><small>'+q.hours+' 小时'+(locked?' · 先建'+RANCH_UPGRADES.find(u=>u.id===q.building).name:'')+'</small><div class="town-buttons">'+ranchBtn('安排加工','craft',q.id,!!locked||!canAfford(q.need)||r.jobs.length>=3)+'</div></article>';}
  html+='</div>';
 }else if(place==='ranch-stock'){
  title='装货台 · 产物仓库';html+=intro('动物产物按普通、银星、金星保存。这里按今日集市价格出售，银星 ×1.25、金星 ×1.6；委托和加工优先使用普通品质。')+'<div class="town-grid">';
  for(const id of RANCH_PRODUCTS){const bins=r.quality[id];html+='<article class="town-card"><h3>'+itemName(id)+' · '+amount(id)+'</h3><p>'+quality.map((q,i)=>q+' '+bins[i]).join(' / ')+'</p><small>今日每份 '+qualityRate.map(q=>Math.round(townSellPrice(id)*q)).join(' / ')+'◈</small><div class="town-buttons">'+ranchBtn('全部装车出售','sell',id,!amount(id))+'</div></article>';}
  html+='</div><section class="town-card" style="margin-top:12px"><h3>照料与加工物品</h3><p>'+['feed','grass','hay','manure','cheese','yarn','breakfast'].map(id=>itemName(id)+' '+amount(id)).join(' · ')+'</p><p>堆肥 '+compost+' · 加工品可在小镇集市出售。</p><button class="town-action" data-ranch-go="market">去小镇集市</button></section>';
 }else{
  title=place==='ranch-herd'?'牛羊区 · 照料角':place==='ranch-birds'?'鸡鸭院 · 照料角':'河湾牧场 · 今日照料';
  html+=intro('每天 06:00 进食饮水并生产；操作按区域进行，不需要逐只喂。晴天开门放牧可省下牛羊槽料，雨天自动留棚。')+'<div class="town-grid">';
  for(const zone of ['birds','herd']){if(place==='ranch-herd'&&zone!=='herd'||place==='ranch-birds'&&zone!=='birds')continue;const z=r.zones[zone],n=ranchAnimals(zone).length;html+='<article class="town-card"><h3>'+(zone==='birds'?'鸡鸭院':'牛羊区')+' · '+n+'/'+ranchCapacity(zone)+'</h3><p>槽料 '+z.food+'/'+ranchTroughCap()+' · 清晨需 '+n+' 份<br>饮水 '+z.water+'/32 · 脏污 '+z.dirt+'/100</p><small>'+(zone==='birds'?'背包谷物饲料 '+amount('feed'):'背包牧草 '+amount('grass')+' / 干草 '+amount('hay'))+'</small><div class="town-buttons">'+ranchBtn('补满饲料','fill',zone,z.food>=ranchTroughCap())+ranchBtn('添满水','water',zone,z.water>=32,true)+ranchBtn('清理圈舍','clean',zone,!z.dirt,true)+'</div></article>';}
  html+='</div><div class="ranch-pasture"><span>草场 '+r.pasture+'/24 · '+(r.grazing?'围栏已开':'围栏已关')+'</span>'+ranchBtn(r.grazing?'收回棚里':'打开围栏放牧','graze','',!r.buildings.barn,true)+(r.buildings.pond?'<span>鸭塘水质 '+r.pond+'/100</span>'+ranchBtn('清理鸭塘','pond','',r.pond===100,true):'')+'</div><h3 class="town-section">点名字打开动物档案</h3><div class="ranch-animal-list">';
  for(const a of r.animals){if(place==='ranch-herd'&&RANCH_TYPES[a.type].zone!=='herd'||place==='ranch-birds'&&RANCH_TYPES[a.type].zone!=='birds')continue;html+='<button class="ranch-animal-link" data-ranch-go="ranch-animal-'+a.id+'"><b>'+ranchEscape(a.name)+'</b><small>'+RANCH_TYPES[a.type].name+' · 心情 '+a.mood+' · ♥ '+a.friend+'</small><span>'+(a.ready?itemName(RANCH_TYPES[a.type].item)+'待收 '+a.ready:a.type==='sheep'?'羊毛 '+a.growth+'/3 天':'明晨继续照料')+'</span></button>';}
  html+='</div><div class="town-buttons">'+ranchBtn('收取所有产物','collect-all','',!r.animals.some(a=>a.ready))+'<button class="town-action secondary" data-ranch-go="ranch-adopt">领养伙伴</button></div><p class="town-note">没有离线惩罚、死亡、繁殖或永久疾病。窝满只暂停产出，未收产物不会消失。自动设施建成前，记得储备清晨的粮与水。</p>';
 }
 document.getElementById('townTitle').textContent=title;return html;
}
function ranchMeter(name,value){return '<div class="ranch-meter"><span>'+name+' '+value+'/100</span><i><b style="width:'+value+'%"></b></i></div>';}
normalizeRanch();
document.getElementById('townContent').addEventListener('click',e=>{const b=e.target.closest('[data-ranch-go]');if(b){const p=b.dataset.ranchGo;if(p==='market')setTownView('town');else if(townView!=='ranch')setTownView('ranch');showTown(p);}});
const ranchDock=document.createElement('nav');ranchDock.id='ranchDock';ranchDock.setAttribute('aria-label','牧场地点');ranchDock.innerHTML=[['care','照料角'],['adopt','领养'],['work','加工屋'],['build','扩建'],['stock','装货台']].map(([id,name])=>'<button data-ranch-go="ranch-'+id+'">'+name+'</button>').join('');document.body.appendChild(ranchDock);ranchDock.addEventListener('click',e=>{const b=e.target.closest('[data-ranch-go]');if(b)showTown(b.dataset.ranchGo);});
document.querySelector('#ttl').childNodes[0].textContent='农圃 · 牧场 · 小镇';document.querySelector('#ttl small').textContent='种一片田 · 养一院伙伴';document.title='农圃、河湾牧场与后院小镇';
/* 三倍精度像素美术 + 屏幕原生文字，不改变场景坐标和点击范围。 */
const ranchCanvas=document.createElement('canvas');ranchCanvas.width=1200;ranchCanvas.height=960;const rg=ranchCanvas.getContext('2d');rg.setTransform(3,0,0,3,0,0);let ranchLabels=[];
const rr=(x,y,w,h,color)=>{rg.fillStyle=color;rg.fillRect(Math.round(x*3)/3,Math.round(y*3)/3,Math.ceil(w*3)/3,Math.ceil(h*3)/3);};
function ranchLabel(text,x,y,bg='#f4e2b5',ink='#4a543f'){ranchLabels.push({text,x,y,bg,ink});}
function ranchFence(x,y,w,h){
 for(const edge of [y,y+h]){rr(x,edge+4,w,2,'#705137');rr(x,edge+4,w,.66,'#efd7a0');rr(x,edge+7,w,1,'#bd955d');for(let i=0;i<=w;i+=14){rr(x+i-.66,edge-1,4,11,'#674d35');rr(x+i,edge,2.66,9,'#ac8452');rr(x+i,edge,2.66,1,'#f1d59c');rr(x+i+1,edge+4,.66,.66,'#594c3e');}}
 for(let i=12;i<h;i+=14){rr(x,y+i,3,9,'#806343');rr(x+w,y+i,3,9,'#806343');rr(x+.66,y+i,1,7,'#ccaa70');rr(x+w+.66,y+i,1,7,'#ccaa70');}
}
function ranchHouse(x,y,w,h,name,roof,built=true){
 const wall=built?'#e7d2a3':'#aaa78b',shade=built?'#bb9464':'#888b73';
 rr(x+3,y+4,w,h,'#263d3544');rr(x,y,w,h,shade);rr(x+1,y+1,w-3,h-2,wall);
 rr(x+1,y+1,3,h-3,'#f3e4be');rr(x+w-5,y+1,4,h-1,'#97774f');
 for(let row=0;row<h-3;row+=4){rr(x+4,y+row,w-10,.66,'#bf9e72');for(let col=0;col<w-10;col+=13)rr(x+5+col+(row%8?6:0),y+row+1,.66,2.5,'#a5896744');}
 rr(x+w*.4-2,y+h-22,w*.24+4,23,'#6e5037');rr(x+w*.4,y+h-20,w*.24,20,'#463e31');
 rr(x+w*.4+1,y+h-19,2,18,'#aa845b');rr(x+w*.4+5,y+h-19,.66,18,'#80674b');rr(x+w*.4+8,y+h-10,1,1,'#e5bd75');
 const wx=x+7,wy=y+10;rr(wx-2,wy-2,15,14,'#775e42');rr(wx,wy,11,9,'#4d7e88');rr(wx+1,wy+1,9,3,'#a0c7c5');rr(wx+1,wy+5,9,3,'#79a5a8');rr(wx+5,wy,.66,9,'#efdfb3');rr(wx,wy+4,11,.66,'#efdfb3');rr(wx-3,wy+10,17,2,'#967047');
 for(let row=0;row<7;row++){const rx=x-5+row*3,ry=y-4-row*4,rw=w+10-row*6;rr(rx,ry,rw,4,built?roof:'#8c8a71');rr(rx,ry,rw,.66,built?'#d7b89c':'#b3b29a');rr(rx,ry+3,rw,.66,'#695649');for(let col=5;col<rw;col+=7)rr(rx+col+(row%2?3:0),ry+1,.66,2.5,'#523c3a66');}
 rr(x+16,y-29,w-32,1.33,'#ead4ab');rr(x-5,y,w+10,2,'#544b39');rr(x,y+h,w,2,'#796748');
 if(built){rr(x+w-12,y+h-6,9,6,'#987c51');rr(x+w-11,y+h-9,2,5,'#68864b');rr(x+w-6,y+h-8,2,4,'#799252');}
 if(hour<6||hour>=19){rr(wx+1,wy+1,9,7,'#f6d483');rr(wx+5,wy,.66,9,'#ad8558');rr(x+w*.4+3,y+h-18,w*.18,3,'#e5be71');}
 ranchLabel(name,x+w/2,y-36,built?'#f3dfae':'#d4d5b2');
}
function ranchPosition(a,i){
 const t=RANCH_TYPES[a.type],r=town.ranch,night=hour<6||hour>=19,rain=day%5===0;
 let x,y;if(t.zone==='birds'){x=42+(i*29)%120;y=100+(i*19)%47;if(a.type==='duck'&&r.buildings.pond&&!night&&!rain){x=133+(i*13)%35;y=149+(i*7)%18;}if(night||rain){x=48+(i*12)%75;y=71+(i%2)*8;}}
 else{x=233+(i*31)%119;y=107+(i*21)%49;if(!r.grazing||night||rain){x=265+(i*19)%90;y=80+(i%2)*9;}else{y=138+(i*13)%50;}}
 const move=reducedMotion||night?0:Math.sin(sceneTime*.00055+i*2.1)*8;
 const eating=!night&&!rain&&hour>=6&&hour<=8,drinking=!night&&!rain&&hour>=13&&hour<=14;
 if(eating||drinking){const base=t.zone==='birds'?35:234;x=base+(drinking?42:8)+(i%3)*9;y=171;}
 const effect=ranchEffects.find(e=>e.id===a.id&&e.text==='♥');if(effect&&a.friend>=15&&!night){x=t.zone==='birds'?156:239;y=191;}
 return {x:x+move,y:y+(!reducedMotion&&!night?Math.cos(sceneTime*.00045+i)*3:0),night,rain};
}
function ranchSprite(a,p,i){
 const {x,y,night}=p,t=RANCH_TYPES[a.type],walk=!reducedMotion&&!night?Math.sin(sceneTime*.007+i)*1:0;
 rr(x-7,y+1,18,3,'#3e60494d');
 if(a.type==='hen'||a.type==='duck'){
  const c=a.type==='hen'?'#edcc77':'#ece7cf';rr(x-6,y-9,12,9,c);rr(x+2,y-15,7,8,c);rr(x+8,y-11,5,2,'#dd9852');rr(x+6,y-13,1,1,'#384b3b');rr(x-4,y-6,5,3,a.type==='hen'?'#d3a256':'#bbc4a7');rr(x-9,y-9,4,3,c);if(a.type==='hen')rr(x+3,y-17,5,3,'#ba6855');rr(x-3,y,2,3+walk,'#b98a4d');rr(x+3,y,2,3-walk,'#b98a4d');
  if(a.type==='hen'){rr(x-5,y-8,9,.66,'#f9e8aa');rr(x-4,y-3,7,1,'#a87943');for(let k=0;k<3;k++)rr(x-3+k*1.66,y-6,.66,2,'#ad8447');rr(x+3,y-14,4,.66,'#fff1c4');rr(x+5,y-9,1,2,'#c26550');}
  else{rr(x-5,y-8,9,1,'#fffae2');rr(x-4,y-3,7,.66,'#83947b');rr(x+3,y-14,4,.66,'#ffffff');rr(x+9,y-10,3,.66,'#f6c37f');}
 }else{
  const shorn=a.type==='sheep'&&a.growth===0&&!a.ready,c=shorn?'#c8ad92':t.color;
  rr(x-10,y-15,22,14,c);rr(x+8,y-18,9,11,a.type==='sheep'?'#766756':c);rr(x+15,y-16,1,2,'#3c433a');
  if(a.type==='cow'){rr(x-7,y-13,6,5,'#756b61');rr(x+3,y-10,6,7,'#756b61');rr(x+10,y-21,2,4,'#ad9270');rr(x+16,y-21,2,4,'#ad9270');rr(x+11,y-9,7,3,'#d6a49b');rr(x-13,y-12,2,8,'#a39173');}
  else if(!shorn){rr(x-8,y-18,17,5,c);for(let k=0;k<4;k++)rr(x-9+k*5,y-16,3,2,'#fff4de');}
  rr(x-7,y-2,3,6+walk,'#6c614c');rr(x+7,y-2,3,6-walk,'#6c614c');
  rr(x-9,y-14,18,.66,'#fff8e2');rr(x-8,y-3,15,1,'#b29d7d');rr(x-7,y+3,3,1,'#423f35');rr(x+7,y+3,3,1,'#423f35');
  if(a.type==='cow'){rr(x+9,y-18,3,1,'#fff8df');rr(x+13,y-14,1,1,'#fff8df');rr(x+13,y-8,1,.66,'#714c42');rr(x-4,y-2,8,2,'#cda397');rr(x-13,y-5,2,3,'#655c4a');}
  else if(!shorn){for(let k=0;k<7;k++){rr(x-8+k*2.66,y-13+(k%2)*3,1.33,1.33,'#fff9e8');rr(x-7+k*2.66,y-7+(k%2)*2,.66,1,'#c7baa1');}rr(x+9,y-16,3,1,'#998674');}
 }
 if(a.ready){rr(x-3,y-28,8,8,'#f4d777');rr(x,y-27,2,4,'#805c39');rr(x,y-21,2,1,'#805c39');}else if(!a.fed)ranchLabel('缺粮水',x,y-23,'#e7b4a0');
 if(ranchHover===a.id)ranchLabel(a.name,x,y-32);
 if(night)ranchLabel('z',x+17,y-20,'#dbe5d2');
 const effect=ranchEffects.find(e=>e.id===a.id);if(effect){ranchLabel(effect.text,x,y-36,'#fff1c8');if(effect.text!=='♥'){if(a.type==='cow'){rr(x+20,y-5,8,10,'#889b98');rr(x+21,y-7,6,2,'#eee6c6');rr(x+21,y-3,6,3,'#fff0d5');}else if(a.type==='sheep'){rr(x+18,y-6,9,2,'#d4d9ca');rr(x+22,y-10,2,10,'#d4d9ca');rr(x+18,y-9,3,3,'#b47457');rr(x+18,y-2,3,3,'#b47457');}else{rr(x+16,y-2,13,7,'#b79559');rr(x+18,y-5,3,4,'#f8e5b6');rr(x+23,y-5,3,4,'#f8e5b6');}}}
}
function drawRanch(){
 ranchLabels=[];
 const r=town.ranch,w=400,h=320,night=hour<6||hour>=19,rain=day%5===0;
 const grass=['#91af6b','#7d9d60','#afa16b','#c4d5ce'][SEASONS.indexOf(season)];rr(0,0,w,h,grass);
 for(let i=0;i<180;i++){const x=(i*71)%400,y=(i*43)%320;rr(x,y,2,i%3?1:2,season==='winter'?'#e8eee0':i%4?'#9ab776':'#d8cf88');}
 for(let i=0;i<330;i++){const x=(i*67)%400,y=(i*41)%285;if(x>183&&x<214||y>195&&y<228)continue;rr(x,y,.66,2,'#5f834b');rr(x+1,y+1,.66,1,'#c6d496');if(i%19===0){rr(x,y-1,1.33,1.33,'#e5d6ab');rr(x+.66,y-1,.66,.66,'#c99769');}}
 rr(0,197,400,28,'#8d9a66');rr(0,199,400,23,'#d4bf90');rr(186,0,26,320,'#a29970');rr(188,0,22,285,'#d4bf90');
 for(let i=0;i<90;i++){const x=(i*83)%400,y=201+(i%4)*5;rr(x,y,4,2,'#c4ad7f');rr(x,y,4,.66,'#ead8ab');rr(x+4,y+1,.66,2,'#ab9368');}
 for(let i=0;i<45;i++){const x=190+(i%3)*6,y=i*6;rr(x,y,4,3,'#dccc9e');rr(x,y+3,4,.66,'#b39b73');}
 rr(0,285,400,35,'#719a9c');for(let i=0;i<25;i++)rr((i*47+(!reducedMotion?sceneTime*.007:0))%400,293+i%4*5,9,1,'#a3beb0');
 for(const [x,y]of [[12,29],[384,31],[12,258],[379,265]]){rr(x-2,y,4,18,'#7e6950');rr(x-12,y-20,24,24,'#527451');rr(x-9,y-26,18,22,'#71925d');rr(x-5,y-24,9,2,'#a7b77b');}
 ranchFence(24,87,r.buildings.birds?152:142,93);ranchFence(226,89,r.buildings.herd?152:142,96);
 ranchHouse(44,51,79,33,'鸡鸭小院','#b67d55');
 ranchHouse(262,49,86,37,'牛羊棚','#a1787d',!!r.buildings.barn);
 if(r.buildings.pond){rr(125,143,47,33,'#a9b790');rr(129,147,39,25,'#75a6a6');rr(133,152,30,2,'#b8d1bd');rr(154,159,8,2,'#b8d1bd');if(r.pond<40)rr(136,163,15,3,'#81976c');}
 else ranchLabel('鸭塘预留地',142,160,'#dce0b8');
 if(r.buildings.pond){for(let i=0;i<9;i++){const x=130+(i*11)%37,y=147+(i*7)%25;rr(x,y,4,.66,'#cce5d4');}for(const [x,y]of [[125,155],[168,163],[134,173]]){rr(x,y,1,6,'#526f48');rr(x+2,y-2,.66,7,'#79945b');rr(x,y-2,1,2,'#c2af75');}}
 for(const [x,y]of [[22,68],[373,61],[18,246],[350,255]]){rr(x,y,11,7,'#8d7150');rr(x+1,y+1,9,.66,'#d3b47d');for(let i=0;i<3;i++){rr(x+2+i*3,y-3,.66,4,'#486a43');rr(x+1+i*3,y-5,2,2,i%2?'#d78d88':'#f2d47e');}}
 rr(108,96,12,8,'#8c7350');rr(109,97,10,.66,'#d5b477');rr(109,100,10,.66,'#65573f');rr(112,96,.66,8,'#624f35');rr(117,96,.66,8,'#624f35');
 for(const [z,x]of [['birds',31],['herd',229]]){const zone=r.zones[z];rr(x,175,29,8,'#836448');rr(x+2,177,25,3,zone.food?'#d3b567':'#675944');rr(x+36,175,23,8,'#6c7d75');rr(x+38,177,19,3,zone.water?'#84b7bd':'#616d60');if(zone.dirt>20)for(let i=0;i<Math.floor(zone.dirt/15);i++)rr(x+10+(i*19)%90,112+(i*17)%40,4,3,'#876e4b');}
 if(r.grazing&&r.buildings.barn){rr(276,181,29,7,grass);rr(302,177,3,13,'#b89768');}
 ranchHouse(35,244,66,27,'加工屋','#667f87',!!r.buildings.workshop);
 rr(118,237,25,17,'#bfa060');rr(119,238,24,3,'#e4ce85');rr(121,243,22,2,'#e4ce85');ranchLabel('干草棚',132,231);
 if(r.buildings.composter){rr(157,247,24,20,'#8a7652');rr(159,248,20,9,'#5e5d3e');ranchLabel('堆肥箱',169,239);}
 rr(275,242,62,28,'#bb9360');for(let i=0;i<4;i++)rr(278+i*14,245,11,16,'#e2c691');rr(283,268,5,6,'#5f6551');rr(326,268,5,6,'#5f6551');ranchLabel('装货台',306,233);
 if(r.buildings.water){rr(218,185,7,10,'#749ba0');rr(216,180,11,8,'#b8d0c2');}if(r.buildings.feeder){rr(78,174,16,12,'#b99b62');rr(80,176,12,2,'#e5ca8a');}
 ranchHits=[{x:20,y:36,w:163,h:151,place:'ranch-birds'},{x:221,y:33,w:163,h:155,place:'ranch-herd'},{x:26,y:204,w:128,h:73,place:'ranch-work'},{x:267,y:215,w:82,h:62,place:'ranch-stock'}];
 const animals=r.animals.map((a,i)=>({a,i,p:ranchPosition(a,i)})).sort((a,b)=>a.p.y-b.p.y);ranchEffects=ranchEffects.filter(e=>e.until>sceneTime);
 for(const {a,p,i}of animals){ranchSprite(a,p,i);ranchHits.push({x:p.x-15,y:p.y-26,w:36,h:33,place:'ranch-animal-'+a.id,id:a.id});}
 if(!r.animals.length)ranchLabel('空院子等一位小伙伴',99,129);
 if(rain&&!reducedMotion)for(let i=0;i<45;i++){const x=(i*47-sceneTime*.02+4000)%400,y=(i*37+sceneTime*.06)%320;rr(x,y,1,5,'#d2e3d366');}
 if(night){rr(0,0,400,320,'#24354c66');ranchLabel('晚安 · 明晨再见',200,307,'#d3dbcd');}else ranchLabel('RIVERBEND / 河湾牧场',202,309,'#e9dfb7');
 ctx.fillStyle=night?'#273e4c':'#dce7c9';ctx.fillRect(0,0,W,H);
 const mobile=W<=680,short=H<=560,top=short?78:mobile?176:W<=1100?167:105,bottom=short?110:mobile?188:135;
 const scale=Math.max(.2,Math.min((W-24)/400,(H-top-bottom)/320,2.3)),x=(W-400*scale)/2,y=top+Math.max(0,(H-top-bottom-320*scale)/2);
 ranchMapRect={x:Math.round(x*DPR)/DPR,y:Math.round(y*DPR)/DPR,scale};ctx.imageSmoothingEnabled=false;ctx.fillStyle='#294838';ctx.fillRect(ranchMapRect.x-4,ranchMapRect.y-4,400*scale+8,320*scale+8);ctx.drawImage(ranchCanvas,ranchMapRect.x,ranchMapRect.y,400*scale,320*scale);drawMapLabels(ranchLabels,ranchMapRect);
}
function ranchHit(mx,my){if(!ranchMapRect)return null;const x=(mx-ranchMapRect.x)/ranchMapRect.scale,y=(my-ranchMapRect.y)/ranchMapRect.scale;return [...ranchHits].reverse().find(p=>x>=p.x&&x<=p.x+p.w&&y>=p.y&&y<=p.y+p.h);}
cv.addEventListener('pointerdown',e=>{if(townView!=='ranch')return;e.stopImmediatePropagation();drag=null;if(townDialogOpen)return;const hit=ranchHit(e.clientX,e.clientY);if(hit)showTown(hit.place);},true);
cv.addEventListener('pointermove',e=>{if(townView!=='ranch')return;e.stopImmediatePropagation();ranchHover=ranchHit(e.clientX,e.clientY)?.id||'';cv.style.cursor=ranchHit(e.clientX,e.clientY)?'pointer':'default';},true);
cv.addEventListener('pointerup',e=>{if(townView==='ranch')e.stopImmediatePropagation();},true);
cv.addEventListener('wheel',e=>{if(townView==='ranch'){e.preventDefault();e.stopImmediatePropagation();}},{capture:true,passive:false});
addEventListener('keydown',e=>{if(townView!=='ranch'||townDialogOpen)return;if(e.key.toLowerCase()==='b'){e.preventDefault();e.stopImmediatePropagation();showTown('ranch-stock');}},true);
