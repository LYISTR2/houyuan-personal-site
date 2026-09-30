"use strict";
/* 后院小镇：旧农圃是生产端，小镇是居民、交易与加工端。 */
const GOODS={wood:{name:'木材',sell:3,buy:7},stone:{name:'石料',sell:4,buy:9},bait:{name:'鱼饵',sell:1,buy:3},fish:{name:'河鱼',sell:13},carp:{name:'金鳞鲤',sell:28},flour:{name:'麦粉',sell:24},bread:{name:'炉烤面包',sell:49},tea:{name:'薄荷茶',sell:27},jam:{name:'草莓果酱',sell:68},soup:{name:'南瓜浓汤',sell:64},eggs:{name:'鸡蛋',sell:12},milk:{name:'鲜奶',sell:20},feed:{name:'谷物饲料',sell:2,buy:5},hay:{name:'干草',sell:3,buy:5},duckegg:{name:'鸭蛋',sell:16},wool:{name:'羊毛',sell:25},cheese:{name:'奶酪',sell:58},yarn:{name:'毛线',sell:72},manure:{name:'肥料原料',sell:1},breakfast:{name:'蛋奶早餐',sell:48}};
const PEOPLE=[
 {id:'lin',name:'阿林',role:'集市掌柜',color:'#557b86',gift:'tomato',lines:['今天的风从河面来，番茄该熟得很甜。','我把你的摊位留在了树荫下。','熟客多起来，后院也就成了小镇。']},
 {id:'mian',name:'小棉',role:'面包师',color:'#cc8d7b',gift:'wheat',lines:['麦香能把一条街的人都叫醒。','修好磨坊以后，我就不用去邻镇买面粉了。','烤炉亮着灯，回家的人就不会走错路。']},
 {id:'shi',name:'石叔',role:'木匠',color:'#ab915c',gift:'pump',lines:['修一座桥，得先把两岸的人连起来。','别急着盖大房子，先把小日子过稳。','小镇又长大了一点，这是大家一起做的。']},
 {id:'yu',name:'阿渔',role:'河岸居民',color:'#799571',gift:'herb',lines:['桥头那片水，早晨有鱼。','鱼竿借你；鱼饵可以买，也能用一份麦子换两份。','不是每次抛竿都有收获，安静也是河的礼物。']}
];
const FACILITIES=[
 {id:'mill',name:'旧磨坊',cost:70,need:{wood:4,stone:2},rep:0,description:'把麦子磨成麦粉，开启面包加工。'},
 {id:'kitchen',name:'街角厨房',cost:110,need:{wood:5,stone:3},rep:5,description:'烘烤面包、煮茶、熬浓汤；好感解锁果酱。'},
 {id:'coop',name:'后院鸡舍',cost:95,need:{wood:6},rep:0,description:'修复小镇鸡舍，开放麦子饲料加工；动物在河湾牧场照料。'},
 {id:'bridge',name:'石溪小桥',cost:140,need:{wood:5,stone:6},rep:12,description:'连通河岸，钓鱼次数从每日 4 次增至 7 次。'},
 {id:'barn',name:'牧场牛棚',cost:200,need:{wood:8,stone:5},rep:20,description:'连通河湾牧场牛羊区，开放奶牛和绵羊领养。'}
];
const RECIPES=[
 {id:'flour',name:'研磨麦粉',need:{wheat:2},out:'flour',n:1,hours:2,building:'mill'},
 {id:'bread',name:'炉烤面包',need:{flour:1,honey:1},out:'bread',n:1,hours:3,building:'kitchen'},
 {id:'tea',name:'薄荷茶',need:{herb:2},out:'tea',n:1,hours:2,building:'kitchen'},
 {id:'soup',name:'南瓜浓汤',need:{pump:2},out:'soup',n:1,hours:3,building:'kitchen'},
 {id:'jam',name:'草莓果酱',need:{berry:2,honey:1},out:'jam',n:1,hours:4,building:'kitchen',friend:'mian',hearts:20},
 {id:'feed',name:'拌制饲料',need:{wheat:1},out:'feed',n:3,hours:1,building:'coop'},
 {id:'breakfast',name:'蛋奶早餐',need:{eggs:1,milk:1},out:'breakfast',n:1,hours:2,building:'kitchen'}
];
const safeObject=v=>v&&typeof v==='object'&&!Array.isArray(v)?v:{};
function normalizeTown(){
 const source=safeObject(town), clean={v:1,rep:limit(source.rep,999),stock:{},friends:{},talked:{},gifted:{},buildings:{},requests:[],completed:limit(source.completed),buys:{},seedPackets:{},jobs:[],hens:limit(source.hens,3),cows:limit(source.cows,2),lastAnimalDay:limit(source.lastAnimalDay),requestDay:limit(source.requestDay),fishingDay:limit(source.fishingDay),fishingCount:limit(source.fishingCount,7),fishSerial:limit(source.fishSerial),ranch:safeObject(source.ranch)};
 for(const id of Object.keys(GOODS))clean.stock[id]=limit(safeObject(source.stock)[id]);
 for(const person of PEOPLE){clean.friends[person.id]=limit(safeObject(source.friends)[person.id],100);clean.talked[person.id]=limit(safeObject(source.talked)[person.id]);clean.gifted[person.id]=limit(safeObject(source.gifted)[person.id]);}
 for(const f of FACILITIES)clean.buildings[f.id]=limit(safeObject(source.buildings)[f.id],1);
 for(const s of SEEDS)clean.seedPackets[s.id]=limit(safeObject(source.seedPackets)[s.id]);
 for(const id of ['wood','stone','bait','feed','hay',...SEEDS.map(s=>'seed-'+s.id)]){const b=safeObject(safeObject(source.buys)[id]);clean.buys[id]={day:limit(b.day),n:limit(b.n,20)};}
 if(Array.isArray(source.jobs))clean.jobs=source.jobs.slice(0,3).filter(j=>j&&RECIPES.some(r=>r.id===j.recipe)&&Number.isFinite(j.finish)).map(j=>({recipe:j.recipe,finish:limit(j.finish,24000000)}));
 if(Array.isArray(source.requests))clean.requests=source.requests.slice(0,3).filter(q=>q&&PEOPLE.some(p=>p.id===q.person)&&(GOODS[q.item]||SEEDS.some(s=>s.id===q.item)||q.item==='honey')).map(q=>({person:q.person,item:q.item,n:Math.max(1,limit(q.n,8)),reward:limit(q.reward,500),done:!!q.done}));
 town=clean;
}
normalizeTown();
const itemName=id=>GOODS[id]?.name||SEEDS.find(s=>s.id===id)?.nm||(id==='honey'?'蜂蜜':id);
const amount=id=>id==='honey'?honey:SEEDS.some(s=>s.id===id)?totalStock(id):(town.stock[id]||0);
const canAfford=need=>Object.entries(need).every(([id,n])=>amount(id)>=n);
function consume(need){if(!canAfford(need))return false;for(const [id,n]of Object.entries(need)){if(id==='honey')honey-=n;else if(SEEDS.some(s=>s.id===id))takeStock(id,n);else{town.stock[id]-=n;if(typeof ranchConsumeQuality==='function')ranchConsumeQuality(id,n);}}return true;}
const needText=need=>Object.entries(need).map(([id,n])=>itemName(id)+' ×'+n).join('、');
const townRank=()=>town.rep>=50?'繁荣小镇':town.rep>=25?'河畔街区':town.rep>=10?'邻里村落':'初来后院';
const dayClock=()=>day*24+hour;
function refreshRequests(){
 if(town.requestDay===day&&town.requests.length)return;
 const candidates=availableSeeds().map(s=>s.id).concat(['fish']);
 if(upgrades.hive)candidates.push('honey');
 for(const r of RECIPES)if(town.buildings[r.building]&&(!r.friend||town.friends[r.friend]>=r.hearts))candidates.push(r.out);
 if(town.hens)candidates.push('eggs');if(town.cows)candidates.push('milk');
 if(Array.isArray(town.ranch?.animals)&&town.ranch.animals.some(a=>a?.type==='duck'))candidates.push('duckegg');
 if(Array.isArray(town.ranch?.animals)&&town.ranch.animals.some(a=>a?.type==='sheep'))candidates.push('wool');
 if(town.ranch?.buildings?.workshop&&Array.isArray(town.ranch?.animals)){if(town.cows)candidates.push('cheese');if(town.ranch.animals.some(a=>a?.type==='sheep'))candidates.push('yarn');}
 town.requests=Array.from({length:3},(_,i)=>{const item=candidates[(day*3+i)%candidates.length],n=GOODS[item]?2:3,price=GOODS[item]?.sell||SEEDS.find(s=>s.id===item)?.sell||18;return {person:PEOPLE[(day+i)%PEOPLE.length].id,item,n,reward:Math.round(price*n*1.35)+8,done:false};});
 town.requestDay=day;
}
function townHour(){
 refreshRequests();
 const ready=town.jobs.filter(j=>j.finish<=dayClock());town.jobs=town.jobs.filter(j=>j.finish>dayClock());
 for(const job of ready){const recipe=RECIPES.find(r=>r.id===job.recipe);town.stock[recipe.out]+=recipe.n;flash(recipe.name+'完成 · 收进小镇仓库');}
 if(typeof ranchHour==='function'&&town.ranch?.v===1)ranchHour();
}
refreshRequests();
const ui=document.createElement('div');
ui.innerHTML='<nav id="townNav" aria-label="场景切换"><button type="button" data-view="farm" aria-pressed="true">种植园</button><button type="button" data-view="ranch" aria-pressed="false">河湾牧场</button><button type="button" data-view="town" aria-pressed="false">小镇</button></nav><div id="townStatus"></div><div id="townQuick"><button type="button" data-place="board">小镇委托</button><button type="button" data-place="bag">背包</button></div><nav class="panel" id="townPlaces" aria-label="小镇地点"><button type="button" data-place="market">集市</button><button type="button" data-place="people">居民</button><button type="button" data-place="work">加工</button><button type="button" data-place="build">建设</button><button type="button" data-place="river">河岸</button><button type="button" data-place="board">委托</button><button type="button" data-place="bag">背包</button></nav><div id="townShade"><section id="townDialog" role="dialog" aria-modal="true" aria-labelledby="townTitle"><header class="town-heading"><div><small>BACKYARD / RIVERSIDE TOWN</small><h2 id="townTitle"></h2></div><button type="button" id="townClose" aria-label="关闭小镇窗口">收起 ×</button></header><div class="town-content" id="townContent"></div></section></div>';
document.body.appendChild(ui);
document.title='像素农圃与后院小镇';
document.querySelector('#ttl').childNodes[0].textContent='农圃与小镇';
document.querySelector('#ttl small').textContent='种一片田 · 认识一条街的人';
let activePlace='',returnFocus=null,townHover='',mapRect=null;
function setTownView(view){
 if(townDialogOpen)closeTown();if(ledgerOpen)toggleLedger();townView=['farm','ranch','town'].includes(view)?view:'farm';
 document.body.dataset.townView=townView;drag=null;hoverPlot=null;
 document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===townView)));
 townHud();
}
function townHud(){document.getElementById('townStatus').textContent=townView==='ranch'&&typeof ranchStatus==='function'?ranchStatus():townView==='town'?townRank()+' · 声望 '+town.rep+' · 点房屋 / 居民互动':townRank()+' · 委托 '+town.requests.filter(q=>!q.done).length+' 件 · 声望 '+town.rep;}
function closeTown(){townDialogOpen=false;document.getElementById('townShade').classList.remove('open');activePlace='';returnFocus?.focus({preventScroll:true});}
const btn=(label,action,data='',disabled=false,secondary=false)=>'<button class="town-action'+(secondary?' secondary':'')+'" type="button" data-action="'+action+'" data-id="'+data+'" '+(disabled?'disabled':'')+'>'+label+'</button>';
const intro=text=>'<p class="town-intro">'+text+'</p>';
const personBy=id=>PEOPLE.find(p=>p.id===id);
function showTown(place,focus=true){
 if(!townDialogOpen){returnFocus=document.activeElement;drag=null;if(ledgerOpen)toggleLedger();}
 document.querySelector('#townDialog .town-heading small').textContent=place.startsWith('ranch-')?'BACKYARD / RIVERBEND RANCH':'BACKYARD / RIVERSIDE TOWN';
 activePlace=place;townDialogOpen=true;refreshRequests();
 const titles={market:'树荫集市',people:'街坊与朋友',work:'磨坊与街角厨房',build:'一起建设小镇',river:'石溪河岸',board:'居民委托板',bag:'小镇背包'};
 document.getElementById('townTitle').textContent=titles[place]||'后院小镇';
 let html='<div class="town-balance"><span>零钱 '+coins+'◈</span><span>声望 '+town.rep+'</span><span>'+townRank()+'</span><span>第 '+day+' 天 '+String(hour).padStart(2,'0')+':00</span></div>';
 if(place.startsWith('ranch-')&&typeof renderRanchDialog==='function'){html=renderRanchDialog(place);
 }else if(place==='market'){
  html+=intro('每日热销 '+marketSeed().nm+'。集市出售价格随日期微调；声望提升后买东西更便宜。种子包先存背包，播种优先使用，不重复扣钱。')+'<div class="town-grid"><section class="town-card"><h3>收成交易</h3>';
  for(const s of availableSeeds())html+='<div class="town-row"><span>'+s.nm+'<small>仓库 '+totalStock(s.id)+' · 普通 '+townSellPrice(s.id)+'◈ 起</small></span>'+btn('售出全部','sell-crop',s.id,!totalStock(s.id))+'</div>';
  html+='</section><section class="town-card"><h3>掌柜的货架</h3>';
  for(const s of availableSeeds()){const id='seed-'+s.id;html+='<div class="town-row"><span>'+s.nm+'种子包<small>'+buyPrice(id)+'◈ · 已有 '+town.seedPackets[s.id]+' · 今日余 '+(8-boughtToday(id))+'</small></span>'+btn('买 1 包','buy',id,coins<buyPrice(id)||boughtToday(id)>=8)+'</div>';}
  for(const id of ['wood','stone','bait','feed','hay'])html+='<div class="town-row"><span>'+itemName(id)+'<small>'+buyPrice(id)+'◈ · 已有 '+amount(id)+' · 今日余 '+(20-boughtToday(id))+'</small></span>'+btn('买 1 份','buy',id,coins<buyPrice(id)||boughtToday(id)>=20)+'</div>';
  html+='</section></div><h3 class="town-section">加工品与河鲜</h3><div class="town-grid">';
  for(const id of ['fish','carp','flour','bread','tea','jam','soup','eggs','duckegg','milk','wool','cheese','yarn','breakfast','honey']){const n=amount(id);html+='<div class="town-card"><h3>'+itemName(id)+' · '+n+'</h3><small>今日每份 '+townSellPrice(id)+'◈</small><div class="town-buttons">'+btn('出售 1 份','sell-good',id,!n)+btn('全部出售','sell-all',id,!n,true)+'</div></div>';}
  html+='</div>';
 }else if(place==='people'){
  html+=intro('居民各有喜欢的收成。每天聊天一次、送礼一次，好感会留在存档里。小棉好感达到 20 后教你果酱配方。')+'<div class="town-grid">';
  for(const p of PEOPLE){const hearts=town.friends[p.id],text=p.lines[Math.min(2,Math.floor(hearts/30))];html+='<article class="town-card"><h3>'+p.name+' · '+p.role+'</h3><div class="town-heart">'+('♥'.repeat(Math.floor(hearts/20))+'♡'.repeat(5-Math.floor(hearts/20)))+' '+hearts+'/100</div><p>「'+text+'」</p><small>喜欢 '+itemName(p.gift)+' · 你有 '+amount(p.gift)+' 份</small><div class="town-buttons">'+btn(town.talked[p.id]===day?'今天聊过了':'聊一会儿','talk',p.id,town.talked[p.id]===day)+btn(town.gifted[p.id]===day?'今天送过了':'送 '+itemName(p.gift),'gift',p.id,town.gifted[p.id]===day||!amount(p.gift),true)+'</div></article>';}
  html+='</div>';
 }else if(place==='work'){
  html+=intro('加工需要真实的游戏时间；材料在开工时扣除，完成后自动入背包。窗口关闭后时间继续，也可以快进八小时。最多同时安排 3 单。')+'<section class="town-card"><h3>正在加工 · '+town.jobs.length+'/3</h3>'+(town.jobs.length?town.jobs.map(j=>'<div class="town-row"><span>'+RECIPES.find(r=>r.id===j.recipe).name+'</span><small>剩余 '+Math.max(0,j.finish-dayClock())+' 小时</small></div>').join(''):'<p>还没有安排加工，先修复磨坊或厨房。</p>')+'</section><div class="town-grid" style="margin-top:12px">';
  for(const r of RECIPES){const locked=!town.buildings[r.building],friendLocked=r.friend&&town.friends[r.friend]<r.hearts;html+='<article class="town-card"><h3>'+r.name+'</h3><p>'+needText(r.need)+' → '+itemName(r.out)+' ×'+r.n+'</p><small>'+r.hours+' 小时 · '+(locked?'需建造 '+FACILITIES.find(f=>f.id===r.building).name:friendLocked?'需小棉好感 20':'设施已开放')+'</small><div class="town-buttons">'+btn('安排加工','craft',r.id,locked||friendLocked||!canAfford(r.need)||town.jobs.length>=3)+'</div></article>';}
  html+='</div>';
 }else if(place==='build'){
  html+=intro('买材料或交委托攒零钱，修复街区里的旧设施。建成后地图会改变，设施不会因换季消失。')+'<div class="town-grid">';
  for(const f of FACILITIES){const built=town.buildings[f.id];html+='<article class="town-card"><h3>'+f.name+(built?' · 已开放':' · 待修复')+'</h3><p>'+f.description+'</p><small>'+f.cost+'◈ · '+needText(f.need)+' · 声望 '+f.rep+'</small><div class="town-buttons">'+btn(built?'已经建成':'修复设施','build',f.id,built||coins<f.cost||town.rep<f.rep||!canAfford(f.need))+'</div></article>';}
  html+='</div><p class="town-note">动物迁入独立的河湾牧场，在那里领养、照料与收取产物。旧鸡牛和牛棚进度已保留。</p><button class="town-action" data-ranch-go="ranch-adopt">去领养小伙伴</button>';
 }else if(place==='river'){
  const used=town.fishingDay===day?town.fishingCount:0,max=town.buildings.bridge?7:4;
  html+=intro('阿渔把鱼竿借给你。每次使用 1 份鱼饵、花费 2 小时；可能钓到河鱼、金鳞鲤，也可能带回漂流木。雨天和清晨更容易遇到金鳞鲤。')+'<div class="town-grid"><article class="town-card"><h3>在河边待一会儿</h3><p>今日抛竿 '+used+'/'+max+' · 鱼饵 '+amount('bait')+'</p><p>河鱼 '+amount('fish')+' · 金鳞鲤 '+amount('carp')+'</p>'+btn('抛竿 · 2 小时','fish','',!amount('bait')||used>=max)+'</article><article class="town-card"><h3>阿渔的鱼饵方子</h3><p>麦子 ×1 → 鱼饵 ×2，或者去集市买。</p>'+btn('拌两份鱼饵','bait','',!amount('wheat'),true)+'<p>'+ (town.buildings.bridge?'石溪桥已修好，可以走到另一岸。':'修复小桥后，每日钓鱼次数增加到 7 次。')+'</p></article></div><p class="town-note">钓鱼是单机随机收获，不消耗真实货币。关闭窗口后可继续照料田地。</p>';
 }else if(place==='board'){
  html+=intro('三位居民每天留下新的委托：交付库存，获得货款、声望、好感。每天 00:00 更新，不自动扣走你的物品。原来的邻里订单仍在农圃里。')+'<div class="town-grid">';
  town.requests.forEach((q,i)=>{const p=personBy(q.person);html+='<article class="town-card"><h3>'+p.name+'的委托'+(q.done?' · 已完成':'')+'</h3><p>需要 '+itemName(q.item)+' ×'+q.n+'</p><small>库存 '+amount(q.item)+' · 报酬 '+q.reward+'◈<br>声望 +3 · 好感 +4</small><div class="town-buttons">'+btn(q.done?'今天谢谢你':'交付物品','request',String(i),q.done||amount(q.item)<q.n)+'</div></article>';});
  html+='</div><p class="town-note">累计完成 '+town.completed+' 件小镇委托。随着设施开放，加工品、鸡蛋和鲜奶也会出现在需求里。</p>';
 }else{
  html+=intro('作物仍在农圃仓库；这里保管加工品、河鲜、建材和种子包。可以在集市出售，也可以留给居民委托。')+'<div class="town-grid"><section class="town-card"><h3>小镇物品</h3>';
  for(const [id,g]of Object.entries(GOODS))if(amount(id))html+='<div class="town-row"><span>'+g.name+'</span><b>'+amount(id)+'</b></div>';
  if(!Object.keys(GOODS).some(id=>amount(id)))html+='<p>背包还空着。去河岸钓鱼，或到集市买一点材料。</p>';
  html+='</section><section class="town-card"><h3>种子包与收成</h3>';
  for(const s of SEEDS)html+='<div class="town-row"><span>'+s.nm+'<small>种子包 '+town.seedPackets[s.id]+' · 收成 '+amount(s.id)+'</small></span></div>';
  html+='<div class="town-row"><span>蜂蜜</span><b>'+honey+'</b></div></section></div>';
 }
 document.getElementById('townContent').innerHTML=html;document.getElementById('townShade').classList.add('open');if(focus)document.getElementById('townClose').focus({preventScroll:true});townHud();
}
const boughtToday=id=>town.buys[id]?.day===day?town.buys[id].n:0;
function buyPrice(id){const seed=id.startsWith('seed-')?SEEDS.find(s=>s.id===id.slice(5)):null;const base=seed?seed.price*.85:GOODS[id]?.buy;return Math.max(1,Math.round(base*(town.rep>=25?.9:1)));}
function townSellPrice(id,q=0){const s=SEEDS.find(s=>s.id===id),base=s?cropPrice(s,q):id==='honey'?18:GOODS[id]?.sell||0;const factor=1+(((day+id.length)%5)-2)*.05;return Math.round(base*factor);}
function sellTownCrop(id){const bins=store[id];if(!bins)return;let value=0;for(let q=0;q<3;q++){value+=bins[q]*townSellPrice(id,q);bins[q]=0;}coins+=value;flash('集市售出 '+itemName(id)+' · +'+value+'◈');}
function townAction(action,id){
 if(action.startsWith('ranch-')&&typeof ranchAction==='function'){ranchAction(action.slice(6),id);return;}
 let message='';
 if(action==='buy'){
  const price=buyPrice(id),max=id.startsWith('seed-')?8:20;if(!Number.isFinite(price)||coins<price||boughtToday(id)>=max)return;
  town.buys[id]={day,n:boughtToday(id)+1};coins-=price;if(id.startsWith('seed-'))town.seedPackets[id.slice(5)]++;else town.stock[id]++;message='买到 '+(id.startsWith('seed-')?itemName(id.slice(5))+'种子包':itemName(id));
 }else if(action==='sell-crop'){sellTownCrop(id);
 }else if(action==='sell-good'||action==='sell-all'){
  const n=action==='sell-all'?amount(id):Math.min(1,amount(id));if(!n)return;let value;if(typeof ranchSellProduct==='function'&&town.ranch?.quality[id])value=ranchSellProduct(id,n);else{if(!consume({[id]:n}))return;value=n*townSellPrice(id);coins+=value;}message='售出 '+itemName(id)+' ×'+n+' · +'+value+'◈';
 }else if(action==='talk'||action==='gift'){
  const p=personBy(id);if(!p)return;
  if(action==='talk'){if(town.talked[id]===day)return;town.talked[id]=day;town.friends[id]=Math.min(100,town.friends[id]+2);message=p.name+'：'+p.lines[(day+Math.floor(town.friends[id]/20))%3];}
  else{if(town.gifted[id]===day||!consume({[p.gift]:1}))return;town.gifted[id]=day;town.friends[id]=Math.min(100,town.friends[id]+7);town.rep=Math.min(999,town.rep+1);message=p.name+'很喜欢这份礼物 · 好感 +7';}
 }else if(action==='craft'){
  const r=RECIPES.find(r=>r.id===id);if(!r||!town.buildings[r.building]||town.jobs.length>=3||(r.friend&&town.friends[r.friend]<r.hearts)||!consume(r.need))return;town.jobs.push({recipe:r.id,finish:dayClock()+r.hours});message=r.name+'已开工 · '+r.hours+' 小时';
 }else if(action==='build'){
  const f=FACILITIES.find(f=>f.id===id);if(!f||town.buildings[id]||coins<f.cost||town.rep<f.rep||!consume(f.need))return;coins-=f.cost;town.buildings[id]=1;if(id==='barn'&&town.ranch?.v===1)town.ranch.buildings.barn=1;town.rep=Math.min(999,town.rep+5);message=f.name+'修复完成 · 声望 +5';
 }else if(action==='animal'){
  if(typeof ranchAction==='function'){ranchAction('adopt',id==='hen'?'hen':'cow');return;}
 }else if(action==='request'){
  const q=town.requests[+id];if(!q||q.done||!consume({[q.item]:q.n}))return;q.done=true;coins+=q.reward;town.completed++;town.rep=Math.min(999,town.rep+3);town.friends[q.person]=Math.min(100,town.friends[q.person]+4);message=personBy(q.person).name+'收到了物品 · +'+q.reward+'◈，声望 +3';
 }else if(action==='bait'){
  if(!consume({wheat:1}))return;town.stock.bait+=2;message='拌好了两份鱼饵';
 }else if(action==='fish'){
  if(town.fishingDay!==day){town.fishingDay=day;town.fishingCount=0;}if(town.fishingCount>=(town.buildings.bridge?7:4)||!consume({bait:1}))return;
  town.fishingCount++;town.fishSerial++;const roll=Math.random(),rare=day%5===0||hour<9?.22:.12,id=roll<rare?'carp':roll<.86?'fish':'wood';town.stock[id]++;townDialogOpen=false;tick();tick();townDialogOpen=true;message='河边两小时 · 带回 '+itemName(id)+' ×1';
 }
 save();hud();if(message)flash(message);showTown(activePlace,false);
}
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>setTownView(b.dataset.view));
document.querySelectorAll('[data-place]').forEach(b=>b.onclick=()=>showTown(b.dataset.place));
document.getElementById('townClose').onclick=closeTown;
document.getElementById('townShade').addEventListener('pointerdown',e=>{if(e.target.id==='townShade')closeTown();});
document.getElementById('townContent').addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(b&&!b.disabled)townAction(b.dataset.action,b.dataset.id);});
addEventListener('keydown',e=>{
 if(townDialogOpen){e.stopImmediatePropagation();if(e.key==='Escape'){e.preventDefault();closeTown();return;}if(e.key==='Tab'){const controls=[...document.querySelectorAll('#townDialog button:not(:disabled), #townDialog input')],first=controls[0],last=controls.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}return;}
 if(e.repeat)return;if(e.key.toLowerCase()==='m'){e.preventDefault();e.stopImmediatePropagation();setTownView(['farm','ranch','town'][(['farm','ranch','town'].indexOf(townView)+1)%3]);}
 if(townView==='town'&&e.key.toLowerCase()==='b'){e.preventDefault();e.stopImmediatePropagation();showTown('bag');}
},true);
const MAP_W=420,MAP_H=300,townCanvas=document.createElement('canvas');townCanvas.width=MAP_W*3;townCanvas.height=MAP_H*3;const tg=townCanvas.getContext('2d');tg.setTransform(3,0,0,3,0,0);let townLabels=[];
const LANDMARKS=[{id:'market',x:98,y:90,w:69,h:49,name:'树荫集市',roof:'#bc6f5e'},{id:'mill',x:188,y:72,w:42,h:58,name:'旧磨坊',roof:'#9e8560',facility:'mill',place:'work'},{id:'kitchen',x:258,y:90,w:61,h:48,name:'街角厨房',roof:'#617e9b',facility:'kitchen',place:'work'},{id:'board',x:160,y:161,w:24,h:25,name:'委托板',roof:'#be9a62'},{id:'coop',x:72,y:232,w:40,h:34,name:'后院鸡舍',roof:'#ad8952',facility:'coop',place:'build'},{id:'barn',x:289,y:235,w:49,h:40,name:'牧场牛棚',roof:'#8e7593',facility:'barn',place:'build'},{id:'river',x:345,y:157,w:38,h:64,name:'石溪河岸',roof:'#8eb7bd'}];
const personPositions=()=>PEOPLE.map((p,i)=>{const base=[[120,148],[267,143],[223,213],[337,205]][i],moving=reducedMotion?0:Math.sin(sceneTime*.00045+i*1.8)*9;return {...p,x:base[0]+moving,y:base[1]+(reducedMotion?0:Math.cos(sceneTime*.00035+i)*4)};});
const rect=(x,y,w,h,c)=>{tg.fillStyle=c;tg.fillRect(Math.round(x*3)/3,Math.round(y*3)/3,Math.round(w*3)/3,Math.round(h*3)/3);};
function tree(x,y,c='#648957',small=false){const k=small?.7:1;rect(x-2,y,4,14*k,'#6a5a40');rect(x-13*k,y-15*k,26*k,14*k,'#496d4d');rect(x-10*k,y-22*k,20*k,17*k,c);rect(x-6*k,y-25*k,12*k,9*k,c);rect(x-9*k,y-18*k,7*k,2*k,'#a6bb79');rect(x+3*k,y-7*k,8*k,3*k,'#54754d');}
function citizen(p){const x=p.x,y=p.y;rect(x-4,y+1,9,3,'#4d715c66');rect(x-3,y-11,6,7,p.color);rect(x-2,y-16,5,5,'#e4b992');rect(x-3,y-18,7,3,p.id==='mian'?'#f2dfbd':'#665346');rect(x-2,y-4,2,6,'#4b5654');rect(x+2,y-4,2,6,'#4b5654');rect(x-5,y-10,2,5,'#d2a480');rect(x+4,y-10,2,5,'#d2a480');rect(x+2,y-14,1,1,'#413c31');if(townHover===p.id){label(p.name,x,y-28,'#f8eecf');}}
function label(text,x,y,bg='#f3e2b6',ink='#405348'){townLabels.push({text,x,y,bg,ink});}
function house(b){const built=!b.facility||town.buildings[b.facility],x=b.x,y=b.y,w=b.w,h=b.h;
 if(b.id==='board'){rect(x-2,y+h-2,w+4,4,'#62805b55');rect(x+2,y+5,3,h,'#7a6147');rect(x+w-6,y+5,3,h,'#7a6147');rect(x,y,w,19,'#674f37');rect(x+2,y+2,w-4,15,'#bd9a66');for(let i=0;i<3;i++){rect(x+4+i*6,y+5,4,8,'#e8ddad');rect(x+5+i*6,y+7,2,1,'#82977a');}return;}
 rect(x-3,y+h-2,w+7,7,'#45614944');rect(x+3,y+12,w-6,h-12,built?'#d8c59a':'#ada38a');for(let yy=y+15;yy<y+h-2;yy+=6)rect(x+4,yy,w-8,1,built?'#b3a07e':'#918b77');
 rect(x+2,y+h-5,w-4,5,'#887f65');rect(x-4,y+8,w+8,7,'#4d5149');rect(x-2,y+3,w+4,8,built?b.roof:'#838c79');rect(x+4,y,w-8,5,built?b.roof:'#949b88');rect(x+10,y-3,w-20,4,built?b.roof:'#949b88');
 for(let yy=0;yy<3;yy++)for(let xx=0;xx<Math.floor(w/7);xx++)rect(x+xx*7+2+(yy%2)*3,y+2+yy*4,5,1,built?'#e1b49a':'#b0b49b');
 const door=x+w*.5-4;rect(door,y+h-21,9,18,'#5f5748');rect(door+1,y+h-20,7,16,built?'#927553':'#716957');rect(door+6,y+h-11,1,2,'#e4d294');
 for(const wx of [x+9,x+w-18]){rect(wx-1,y+20,10,11,'#746d55');rect(wx,y+21,8,8,hour<6||hour>17?'#edc36f':'#8eacb0');rect(wx+3,y+21,1,8,'#69796d');rect(wx,y+25,8,1,'#6a7867');rect(wx-1,y+30,10,2,'#988d6c');}
 if(built){for(let row=0;row<3;row++)for(let col=0;col<w-10;col+=9){rect(x+6+col+(row%2?3:0),y+15+row*5,.66,3,'#876a4d55');}rect(x+4,y+14,2,h-17,'#f0dfb6');rect(x+w-6,y+14,2,h-17,'#9d835e');for(const wx of [x+9,x+w-18]){rect(wx+1,y+22,2,.66,'#e0e6cf');rect(wx-1,y+33,10,2,'#796244');rect(wx+1,y+30,.66,3,'#55754b');rect(wx+6,y+30,.66,3,'#789359');}rect(door-2,y+h-3,13,3,'#c3b692');rect(door+5,y+h-10,.66,.66,'#f4df91');}
 if(!built){rect(x+6,y+h-10,w-12,3,'#93846b');rect(x+12,y+h-14,3,13,'#665b49');rect(x+w-15,y+h-14,3,13,'#665b49');}
 if(b.id==='market'){for(let i=0;i<7;i++)rect(x-4+i*11,y+h-17,11,7,i%2?'#e9d4a2':'#667e91');rect(x-4,y+h-10,w+8,3,'#415f70');rect(x-1,y+h-7,3,16,'#705d42');rect(x+w-2,y+h-7,3,16,'#705d42');rect(x+5,y+h+1,w-9,8,'#9f8258');for(let i=0;i<10;i++)rect(x+8+i*5,y+h+(i%2),3,3,i%3?'#d39a62':'#a7b879');}
 if(b.id==='mill'){rect(x+w/2-1,y-9,2,30,'#725d48');rect(x+w/2-15,y+5,31,2,'#e4d5ad');for(let i=0;i<4;i++){rect(x+w/2-13+i*3,y+2,2,8,'#ad966d');rect(x+w/2+3+i*3,y+2,2,8,'#ad966d');}rect(x+w/2-4,y-8,8,9,'#d4c59a');rect(x+w/2-4,y+13,8,9,'#d4c59a');rect(x+w/2-2,y+4,4,4,'#7c6950');}
 if(b.id==='kitchen'&&built){rect(x+w-13,y-11,6,15,'#8b7864');rect(x+w-14,y-12,8,3,'#bba787');if(!reducedMotion){const sy=(sceneTime*.007)%9;rect(x+w-12,y-18-sy,5,3,'#f1e7d277');rect(x+w-11,y-23-sy,7,3,'#f1e7d244');}}
}
function drawTown(){
 townLabels=[];
 tg.imageSmoothingEnabled=false;const winter=season==='winter',autumn=season==='autumn';
 rect(0,0,MAP_W,MAP_H,winter?'#c6d9cc':autumn?'#a5ac76':'#8eaf78');
 for(let i=0;i<600;i++){const x=(i*97)%MAP_W,y=(i*71)%MAP_H;rect(x,y,i%4?1:2,1,winter?'#e1e9d7':i%3?'#789a65':'#b7c48a');}
 // 道路有石缝与踏实的边缘，从后院一直连到码头。
 rect(28,146,333,26,'#9c9673');rect(26,148,337,21,'#d3c89e');rect(196,48,23,231,'#a5a07a');rect(198,47,19,233,'#dbcfaa');rect(63,215,272,16,'#c5bf96');
 for(let i=0;i<110;i++){const x=29+(i*29)%323,y=149+(i*7)%18;rect(x,y,3,1,'#b4ac86');}for(let i=0;i<56;i++)rect(200+(i*7)%15,50+i*4,3,1,'#bcb28b');
 // 河流、双岸芦苇与水面光斑。
 rect(366,0,54,MAP_H,'#739982');rect(371,0,49,MAP_H,winter?'#9ebfc0':'#548d9d');rect(378,0,42,MAP_H,winter?'#bfd3ce':'#78acb1');
 for(let i=0;i<52;i++){const x=379+(i*13)%39,y=(i*19+(!reducedMotion?sceneTime*.006:0))%MAP_H;rect(x,y,5+i%4,1,'#bbd4c5');}for(let i=0;i<20;i++){rect(369,i*17,2,8,'#6a8660');rect(368,i*17,4,2,'#aaac76');}
 // 小桥建设前是两截木桩，建设后连接两岸。
 const bridge=town.buildings.bridge;rect(356,151,bridge?64:13,25,bridge?'#b6ab88':'#847a5d');if(bridge){for(let i=0;i<8;i++)rect(357+i*8,152,1,23,'#8e8266');rect(353,149,67,3,'#6d7867');rect(353,174,67,3,'#6d7867');for(let i=0;i<7;i++){rect(356+i*10,145,2,8,'#6e7560');rect(356+i*10,171,2,8,'#6e7560');}}
 rect(345,202,27,5,'#8f7756');for(let i=0;i<7;i++)rect(345+i*4,202,1,11,'#746245');rect(345,211,27,3,'#b9a075');
 const leaf=winter?'#dce5d5':autumn?'#bba46c':season==='summer'?'#5f8a59':'#83a064';
 for(const [x,y]of [[29,36],[51,43],[342,37],[317,36],[28,112],[54,91],[338,113],[20,231],[48,273],[130,271],[246,270],[354,266]])tree(x,y,leaf);
 // 广场水井、长椅、花箱、路灯、院墙。
 rect(226,165,32,28,'#b7b999');rect(230,169,24,20,'#dad3b1');rect(235,173,14,12,'#737d70');rect(237,175,10,8,'#6a949c');rect(232,170,3,20,'#7f7359');rect(246,170,3,20,'#7f7359');rect(230,168,21,3,'#af895e');rect(240,165,2,12,'#88765d');
 for(const [x,y]of [[120,189],[290,177]]){rect(x,y,23,4,'#9c8158');rect(x,y-5,23,3,'#b49a70');rect(x+2,y+4,2,5,'#665f48');rect(x+19,y+4,2,5,'#665f48');}
 for(const [x,y]of [[86,150],[312,151],[186,225]]){rect(x,y,2,17,'#5c6a60');rect(x-3,y-5,8,6,'#4d6471');rect(x-2,y-4,6,4,'#f1d994');}
 for(const [x,y]of [[89,187],[277,192],[147,68],[247,69]]){rect(x,y,17,7,'#997e5c');for(let i=0;i<4;i++){rect(x+2+i*4,y-3,2,5,'#668257');rect(x+1+i*4,y-5,4,3,i%2?'#d3a5a2':'#f2da91');}}
 // 小镇南侧预览农圃，作物来自真实田地，不另建第二份存档。
 rect(132,237,47,32,'#665641');for(let i=0;i<12;i++){const p=plots[i],x=134+(i%4)*11,y=240+Math.floor(i/4)*9;rect(x,y,9,7,p.w?'#504e37':'#84704b');if(p.s){const s=SEEDS.find(s=>s.id===p.s);rect(x+4,y-3,2,7,'#789c5f');if(p.st>=2)rect(x+2,y-5,6,4,p.st===3?s.c:'#88a961');}}
 for(const b of LANDMARKS)if(b.id!=='river')house(b);
 // 鸡与奶牛会随着实际领养数量出现。
 for(let i=0;i<town.hens;i++){const x=113+i*9+(reducedMotion?0:Math.sin(sceneTime*.001+i)*2),y=249+i%2*8;rect(x,y,6,4,'#f4e6bd');rect(x+4,y-3,4,4,'#f2ddb0');rect(x+5,y-4,2,2,'#ba6a52');rect(x+7,y-1,2,1,'#daa05d');rect(x+1,y+4,1,3,'#ad8051');}
 for(let i=0;i<town.cows;i++){const x=303+i*16,y=283;rect(x-5,y-7,13,7,'#efe8cb');rect(x+6,y-10,6,7,'#e7dfbd');rect(x-2,y-6,4,4,'#766b60');rect(x-4,y,2,5,'#655f54');rect(x+5,y,2,5,'#655f54');}
 for(const p of personPositions())citizen(p);
 label('后院小镇',MAP_W/2,27,'#345873','#f5e7bb');
 for(const b of LANDMARKS){const text=b.id==='river'?'石溪河岸':b.name+(b.facility&&!town.buildings[b.facility]?' · 待修复':'');label(text,b.x+b.w/2,b.id==='river'?b.y+12:b.y-10,townHover===b.id?'#f9ecc2':'#e4d7b1');}
 const night=Math.max(0,Math.min(1,hour<6?1-hour/6:hour>17?(hour-17)/5:0));if(night){rect(0,0,MAP_W,MAP_H,'rgba(24,43,72,'+night*.5+')');for(const [x,y]of [[87,147],[313,148],[187,221],[132,115],[289,112]]){const g=tg.createRadialGradient(x,y,1,x,y,22);g.addColorStop(0,'rgba(255,223,145,'+night*.56+')');g.addColorStop(1,'rgba(255,223,145,0)');tg.fillStyle=g;tg.fillRect(x-22,y-22,44,44);}}
 if(day%5===0&&!reducedMotion){for(let i=0;i<45;i++)rect((i*73+sceneTime*.008)%420,(i*37+sceneTime*.019)%300,1,4,'#eff3d988');}
 ctx.fillStyle=night>.3?'#253e50':'#cbd5b1';ctx.fillRect(0,0,W,H);
 const top=H<560?78:W<680?182:W<1100?173:111,bottom=H<560?110:W<680?150:105,scale=Math.max(.4,Math.min((W-20)/MAP_W,(H-top-bottom)/MAP_H,2.7)),mw=MAP_W*scale,mh=MAP_H*scale,x=(W-mw)/2,y=top+Math.max(0,(H-top-bottom-mh)/2);
 mapRect={x:Math.round(x*DPR)/DPR,y:Math.round(y*DPR)/DPR,scale};ctx.imageSmoothingEnabled=false;ctx.drawImage(townCanvas,mapRect.x,mapRect.y,mw,mh);
 ctx.strokeStyle='#3e5d49';ctx.lineWidth=2;ctx.strokeRect(mapRect.x-2,mapRect.y-2,mw+4,mh+4);drawMapLabels(townLabels,mapRect);
}
function townHit(mx,my){if(!mapRect)return null;const x=(mx-mapRect.x)/mapRect.scale,y=(my-mapRect.y)/mapRect.scale;for(const p of personPositions())if(Math.abs(x-p.x)<11&&Math.abs(y-p.y+8)<15)return {id:p.id,place:'people'};for(const b of LANDMARKS)if(x>b.x-6&&x<b.x+b.w+6&&y>b.y-18&&y<b.y+b.h+13)return {id:b.id,place:b.facility&&!town.buildings[b.facility]?'build':b.place||b.id};return null;}
for(const event of ['pointerdown','pointermove','pointerup','wheel'])cv.addEventListener(event,e=>{if(townDialogOpen){e.stopImmediatePropagation();return;}if(townView!=='town')return;e.stopImmediatePropagation();if(event==='wheel'){e.preventDefault();return;}const hit=townHit(e.clientX,e.clientY);townHover=hit?.id||'';cv.style.cursor=hit?'pointer':'default';if(event==='pointerup'&&hit)showTown(hit.place);},{capture:true,passive:false});
// 让作物选择用原创像素小图，而不是各平台外观不同的 emoji。
function seedIcon(s){const c=document.createElement('canvas');c.width=20;c.height=22;const g=c.getContext('2d');g.fillStyle='#577b49';g.fillRect(9,8,2,12);g.fillRect(4,12,6,3);g.fillRect(11,9,5,3);g.fillStyle=s.cd;g.fillRect(5,2,10,8);g.fillStyle=s.c;g.fillRect(6,1,8,8);g.fillStyle='#f3e4b7';g.fillRect(7,2,2,2);return c.toDataURL();}
for(let i=0;i<bar.children.length;i++){const s=SEEDS[i],ic=bar.children[i].querySelector('.ic');ic.innerHTML='<img alt="" src="'+seedIcon(s)+'" width="20" height="22" style="image-rendering:pixelated;display:block;margin:auto">';}
// 农圃场景增加街区远景与细节，不替换原来的田地坐标。
const drawOriginalSky=drawSky,drawOriginalYard=drawYard;
drawSky=function(){drawOriginalSky();const z=Math.max(1,cam.z*.65);for(let i=0;i<7;i++){const x=25+i*(W/7),y=H*.46+Math.sin(i*1.7)*11;px(x,y,29*z,17*z,'#86927b');px(x-2*z,y-5*z,33*z,7*z,i%2?'#798e8b':'#9b927b');px(x+11*z,y+7*z,6*z,10*z,'#707f72');px(x+3*z,y+4*z,4*z,4*z,'#d6c99a');}};
drawYard=function(){drawOriginalYard();const z=cam.z,[x,y]=toScreen(-.5,-.5),r=(a,b,w,h,c)=>px(x+a*z,y+b*z,w*z,h*z,c);for(let i=0;i<8;i++){r(-10+i*17,-15,9,3,'#c6b590');r(-9+i*17,-12,7,1,'#968d6a');}for(let i=0;i<5;i++){r(-49+i*5,84+(i%2)*3,3,2,'#a8c58e');r(-48+i*5,82+(i%2)*3,2,2,i%2?'#e4b7aa':'#efe0a2');}r(126,99,13,8,'#ac8961');r(127,98,11,2,'#d1ad7a');r(129,95,3,4,'#d8a15b');r(134,94,3,5,'#85a364');};
setTownView('farm');townHud();save();
