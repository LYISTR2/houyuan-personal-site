/* Outdoor play stays inside the valley, using the existing inventory and clock. */
(function (root) {
  'use strict';
  const G=BackyardGeography,R=BackyardActivityRules;
  town.outdoors=R.normalize(town.outdoors,G.trees);
  let active=null,held=false,effects=[],chopAt=-Infinity,flipTimer=0,lastUI=0;
  const $=id=>document.getElementById(id),clock=()=>day*24+hour,state=()=>town.outdoors;
  const primaryLabel=(text)=>{$('activityAction').textContent=text;};
  const panel=document.createElement('section');panel.id='activityPanel';panel.hidden=true;
  panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-labelledby','activityTitle');
  panel.innerHTML=`<header><div><small id="activityEyebrow">A LITTLE AFTERNOON IN THE VALLEY</small><h2 id="activityTitle"></h2></div><button id="activityClose" aria-label="收起小游戏">×</button></header><p id="activityIntro"></p><div id="activityContent"></div><div id="activityResult" role="status" hidden></div><footer><span id="activityStatus"></span><button id="activityAction"></button></footer><small class="activity-tip" id="activityTip"></small>`;
  document.body.appendChild(panel);
  function effect(x,y,text,colors=['#e6c183','#ffedba']) {
    effects.push({x,y,text,until:performance.now()+1200,colors});
  }
  function open(kind,title,intro) {
    if(root.BackyardWorld?.storageBlocked)return;
    clearTimeout(flipTimer);held=false;
    active={kind,phase:'playing',elapsed:0,advanced:false,settled:false,hours:kind==='fishing'?2:1};
    panel.hidden=false;document.body.dataset.activity=kind;document.getElementById('worldUI').inert=true;
    $('activityTitle').textContent=title;$('activityIntro').textContent=intro;
    $('activityResult').hidden=true;$('activityResult').textContent='';$('activityContent').replaceChildren();
    $('activityAction').disabled=false;$('activityAction').hidden=false;
    $('activityTip').textContent='Esc 收起 · 小游戏期间暂停世界行走';
    $('activityClose').focus({preventScroll:true});
  }
  function advance() {if(!active||active.advanced)return;active.advanced=true;root.BackyardWorld.advance(active.hours);}
  function finish(text,score=0) {
    if(!active||active.settled)return;
    active.settled=true;active.phase='result';held=false;
    if(['rings','targets','memory'].includes(active.kind)){
      const reward=R.parkReward(state(),active.kind,score,day);town.outdoors=reward.state;coins+=reward.coins;
      text+=reward.tickets?` · 游园票 +${reward.tickets}，零钱 +${reward.coins}◈`:score?' · 今天的奖励已领完，可以继续练习':' · 再练一场，试试手感';
    }
    advance();save();hud();
    $('activityResult').hidden=false;$('activityResult').textContent=text;
    $('activityStatus').textContent=active.kind==='fishing'?`本次已收线 · 今天 ${town.fishingCount}/${town.buildings.bridge?7:4} 竿`:`游园票 ${state().tickets} 张 · 每日奖励 ${state().parkRewards}/3`;
    primaryLabel('收好，回到河谷');$('activityAction').disabled=false;$('activityAction').hidden=false;$('activityTip').textContent='点按钮 / E 返回河谷 · Esc 收起';
  }
  function close() {
    if(active&&!active.advanced&&active.kind!=='prizes'&&active.kind!=='forest-info')advance();
    active=null;held=false;clearTimeout(flipTimer);panel.hidden=true;delete document.body.dataset.activity;document.getElementById('worldUI').inert=false;
    save();hud();$('worldInteract')?.focus({preventScroll:true});
  }
  function chop(id) {
    const tree=G.trees.find(t=>t.id===id);if(!tree)return;
    const node=state().trees[id],now=performance.now();
    if(R.treeStage(node,clock())!=='grown'){flash('留下树苗，'+Math.max(1,node.regrowAt-clock())+' 个游戏小时后再来。');return;}
    if(now-chopAt<360)return;chopAt=now;
    node.hits++;effect(tree.x,tree.y-32,node.hits<3?'咚 · '+node.hits+'/3':'木材 +4');
    if(node.hits>=3){node.hits=0;node.regrowAt=clock()+24;town.stock.wood+=4;state().wood+=4;
      if(tree.type==='pine'){town.stock.sap++;effect(tree.x+20,tree.y-16,'树脂 +1');}
      root.BackyardWorld.advance(1);flash('木材 +4'+(tree.type==='pine'?' · 树脂 +1':'')+' · 已装进背包');
    }else flash('挥斧 '+node.hits+'/3 · 再砍几下');
    save();hud();
  }
  function forestInfo() {
    open('forest-info','青杉林的小木屋','斧头已经准备好了。靠近有标记的树，点树或按 E 挥斧，三次采集四份木材。');
    $('activityContent').innerHTML=`<div class="forest-notes"><b>让森林，也有下一天。</b><p>砍伐留下树桩，12 小时后长出树苗，24 小时后可再次采集。杉树还会掉落树脂。</p><p>木材可以修磨坊、鸡舍和小桥，也能带进矿洞合成；树脂可以在集市出售。</p><span>已经采集 ${state().wood} 份木材</span></div>`;
    $('activityStatus').textContent='点树 / E 挥斧';primaryLabel('带上斧头，出发');
  }
  function startFishing(spot) {
    if(town.fishingDay!==day){town.fishingDay=day;town.fishingCount=0;}
    if(town.fishingCount>=(town.buildings.bridge?7:4)){flash('今天已经钓够了，明天再来河边坐坐。');return;}
    open('fishing',spot.name+' · 河边钓鱼','抛出鱼线，等浮漂动起来。咬钩时点“提竿”，随后按住按钮，让鱼留在绿色区域。');
    active.phase='waiting';active.spot=spot;active.wait=1.8+Math.random()*1.5;active.bait=amount('bait')>0;
    active.reel={elapsed:0,cursor:50,fish:50,progress:24,phase:Math.random()*Math.PI,window:active.bait?18:16};
    town.fishingCount++;town.fishSerial++;if(active.bait)consume({bait:1});
    active.catch=day%5===0||hour<9?Math.random()<.28?'carp':'fish':Math.random()<.14?'carp':'fish';
    $('activityContent').innerHTML='<div class="fishing-scene"><span class="fishing-water"></span><span class="fishing-bobber"></span><b id="fishingCall">听一会儿水声…</b></div><div class="fishing-track" id="fishingTrack" hidden><span id="fishingZone"></span><i id="fishingFish">◆</i></div><div class="fishing-progress"><span id="fishingProgress"></span></div>';
    $('activityStatus').textContent=active.bait?'用了 1 份鱼饵 · 鱼更容易留在绿区':'不消耗鱼饵 · 练习也能钓到河鱼';
    $('activityAction').disabled=true;primaryLabel('等鱼咬钩…');
    $('activityTip').textContent='咬钩：E / 点提竿 · 控线：按住 E / 按钮右移，松开左移 · Esc 收线';
    save();hud();
  }
  function fishingAction(down) {
    if(!active||active.kind!=='fishing')return;
    if(active.phase==='bite'&&down){active.phase='reeling';active.elapsed=0;held=false;$('fishingTrack').hidden=false;primaryLabel('按住控线');$('fishingCall').textContent='让鱼留在绿色区域';return;}
    if(active.phase==='reeling')held=down;
  }
  function play(kind) {
    const place=G.park.find(p=>p.id===kind);if(!place)return;
    if(kind==='prizes'){prizes();return;}
    open(kind,place.name,place.description+' 每日前三场有游园票和零钱奖励。');
    if(kind==='rings'){
      Object.assign(active,{shots:0,score:0,cursor:50,target:28});
      $('activityContent').innerHTML='<canvas id="activityBoard" width="336" height="164" aria-label="套圈摊位"></canvas><div class="ring-track"><span id="ringGoal"></span><i id="ringCursor"></i></div>';
      primaryLabel('抛出圆环 · Space');$('activityStatus').textContent='5 个圆环 · 看准绿色区域再投';
    }else if(kind==='targets'){
      Object.assign(active,{score:0,target:Math.floor(Math.random()*6),nextAt:1.5,remaining:20,hit:false});
      $('activityContent').innerHTML='<div class="target-board">'+Array.from({length:6},(_,i)=>`<button data-target="${i}" aria-label="靶位 ${i+1}"><span class="turnip-sprite"></span><kbd>${i+1}</kbd></button>`).join('')+'</div>';
      primaryLabel('点亮起的萝卜');$('activityAction').disabled=true;
      $('activityTip').textContent='点亮起的靶子，或按 1–6 · 每个萝卜只能命中一次';
      updateTargetButtons();
    }else{
      const deck=[0,1,2,3,0,1,2,3];for(let i=deck.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]];}
      Object.assign(active,{deck,flipped:[],matched:[],moves:0,locked:false});
      $('activityContent').innerHTML='<div class="memory-board">'+deck.map((_,i)=>`<button data-card="${i}" aria-label="翻开第 ${i+1} 张卡"><span>❧</span><kbd>${i+1}</kbd></button>`).join('')+'</div>';
      $('activityAction').hidden=true;$('activityTip').textContent='点卡片，或按 1–8 · 两张相同就留在桌上';updateCards();
    }
  }
  const glyphs=['<path d="M3 12h3V7h3V3h5v8h-3v3H8v3H5v-3H3z"/>','<path d="M2 7h4V5h8v2h3v3h-3v3H6v-2H2zm11 0h1v1h-1z"/>','<path d="M8 2h4v4h4v4h-4v5H8v-5H3V6h5z"/>','<path d="M6 2h7v4h3v8h-3v3H6v-3H3V6h3z"/>'];
  function updateCards() {
    if(active?.kind!=='memory')return;
    document.querySelectorAll('[data-card]').forEach((button,i)=>{
      const visible=active.flipped.includes(i)||active.matched.includes(i);button.classList.toggle('revealed',visible);button.classList.toggle('matched',active.matched.includes(i));
      button.disabled=active.locked||active.matched.includes(i)||active.phase==='result';
      button.querySelector('span').innerHTML=visible?`<svg viewBox="0 0 20 20" aria-hidden="true">${glyphs[active.deck[i]]}</svg>`:'❧';
      button.setAttribute('aria-label',visible?['叶子','小鱼','星星','果实'][active.deck[i]]+` · 第 ${i+1} 张`:`翻开第 ${i+1} 张卡`);
    });
    $('activityStatus').textContent=`配对 ${active.matched.length/2}/4 · 翻牌 ${active.moves} 次`;
  }
  function flip(index) {
    if(active?.kind!=='memory'||active.phase==='result'||active.locked||active.flipped.includes(index)||active.matched.includes(index)||index<0||index>=8)return;
    active.flipped.push(index);updateCards();
    if(active.flipped.length!==2)return;
    active.moves++;const [a,b]=active.flipped;
    if(active.deck[a]===active.deck[b]){active.matched.push(a,b);active.flipped=[];updateCards();if(active.matched.length===8)finish('四对河谷小物都找到了',Math.max(2,12-active.moves));}
    else{active.locked=true;updateCards();flipTimer=setTimeout(()=>{if(active?.kind==='memory'){active.flipped=[];active.locked=false;updateCards();}},700);}
  }
  function throwRing() {
    if(active?.kind!=='rings'||active.phase==='result')return;
    const score=R.ringScore(active.cursor,active.target);active.score+=score;active.shots++;
    effect(115,125,score===3?'漂亮！ +3':score?'套中了 +1':'再试一次');
    if(active.shots===5){finish(`五个圆环 · 得分 ${active.score}/15`,active.score);return;}
    active.target=[28,66,43,76,35][active.shots];$('activityStatus').textContent=`还剩 ${5-active.shots} 个 · 得分 ${active.score}`;
  }
  function updateTargetButtons() {if(active?.kind!=='targets')return;document.querySelectorAll('[data-target]').forEach((b,i)=>{b.classList.toggle('up',i===active.target&&!active.hit);b.disabled=active.phase==='result';});}
  function hitTarget(index) {if(active?.kind!=='targets'||active.phase==='result')return;if(index===active.target&&!active.hit){active.score++;active.hit=true;updateTargetButtons();}}
  function prizes() {
    open('prizes','风车兑奖亭','把下午攒下的小票，换成明天农庄里用得上的东西。');
    $('activityContent').innerHTML='<div class="prize-list">'+Object.entries(R.prizes).map(([id,p])=>`<div><span><b>${p.name}</b><small>${p.cost} 张游园票</small></span><button data-prize="${id}">兑换</button></div>`).join('')+'</div>';
    primaryLabel('收好小礼物');updatePrizes();
  }
  function updatePrizes() {$('activityStatus').textContent=`游园票 ${state().tickets} 张`;document.querySelectorAll('[data-prize]').forEach(b=>b.disabled=state().tickets<R.prizes[b.dataset.prize].cost);}
  function redeem(id) {
    const p=R.prizes[id];if(active?.kind!=='prizes'||!p||state().tickets<p.cost)return;
    state().tickets-=p.cost;if(p.type==='seeds')town.seedPackets[p.item]+=p.n;else if(p.type==='stock')town.stock[p.item]+=p.n;else compost+=p.n;
    save();hud();updatePrizes();flash('换到了 '+p.name+' · 已放进背包');
  }
  function update(dt) {
    if(!active||active.phase==='result'||document.hidden)return;
    dt=Math.min(.05,Math.max(0,dt));active.elapsed+=dt;
    if(active.kind==='fishing'){
      if(active.phase==='waiting'&&active.elapsed>=active.wait){active.phase='bite';active.elapsed=0;$('fishingCall').textContent='咬钩了！快提竿';primaryLabel('提竿！ · E');$('activityAction').disabled=false;}
      else if(active.phase==='bite'&&active.elapsed>3.5)finish('鱼轻轻游走了，下次再试');
      else if(active.phase==='reeling'){
        active.reel=R.reelStep(active.reel,held,dt);const reel=active.reel;
        $('fishingZone').style.left=(reel.cursor-(active.bait?18:16))+'%';$('fishingZone').style.width=(active.bait?36:32)+'%';$('fishingFish').style.left=reel.fish+'%';
        $('fishingProgress').style.width=reel.progress+'%';$('fishingTrack').classList.toggle('aligned',reel.aligned);
        if(reel.progress>=100){town.stock[active.catch]++;state().catches++;finish('钓到了 '+itemName(active.catch)+' ×1');}
        else if(reel.progress<=0||reel.elapsed>=18)finish('鱼挣开了钩，记住这次水流');
      }
    }else if(active.kind==='rings'){
      active.cursor=50+46*Math.sin(active.elapsed*1.6);$('ringCursor').style.left=active.cursor+'%';$('ringGoal').style.left=(active.target-13)+'%';
      drawRingBoard();
    }else if(active.kind==='targets'){
      if(active.elapsed>=20){finish(`萝卜打靶 · 命中 ${active.score} 次`,active.score);updateTargetButtons();return;}
      if(active.elapsed>=active.nextAt){active.target=(active.target+1+Math.floor(Math.random()*5))%6;active.nextAt=active.elapsed+1.35;active.hit=false;updateTargetButtons();}
      if(performance.now()-lastUI>150){lastUI=performance.now();$('activityStatus').textContent=`剩余 ${Math.ceil(20-active.elapsed)} 秒 · 命中 ${active.score} 次`;}
    }
  }
  function drawRingBoard() {
    const canvas=$('activityBoard');if(!canvas)return;const g=canvas.getContext('2d');g.clearRect(0,0,336,164);
    g.fillStyle='#466854';g.fillRect(0,0,336,164);g.fillStyle='#355b4d';g.fillRect(0,113,336,51);
    g.fillStyle='#c19860';g.fillRect(13,106,310,9);g.fillStyle='#755132';g.fillRect(22,115,8,43);g.fillRect(308,115,8,43);
    for(let i=0;i<5;i++){const x=44+i*61;g.fillStyle=['#87b7ba','#e4bb72','#d19387','#9db776','#b2a1c2'][i];g.fillRect(x-9,71,18,35);g.fillRect(x-5,61,10,13);g.fillStyle='#f8e2ac';g.fillRect(x-5,57,10,4);g.fillRect(x-6,77,3,17);g.fillStyle='#ebe0ac';g.fillRect(x-7,89,14,8);}
    const x=13+active.target/100*310;g.strokeStyle='#f9df88';g.lineWidth=3;g.beginPath();g.ellipse(x,49,14,5,0,0,Math.PI*2);g.stroke();
    g.fillStyle='#f6e2b4';g.font='12px sans-serif';g.textAlign='center';g.fillText(`圆环 ${active.shots}/5 · ${active.score} 分`,168,24);
  }
  function targets() {
    return [
      ...G.park.map(p=>({id:p.id,x:p.x,y:p.y,label:p.name,hint:p.description,kind:'park',action:()=>play(p.id)})),
      ...G.fishing.map(p=>({id:'fish-'+p.id,x:p.x,y:p.y,label:p.name+' · 抛竿钓鱼',hint:'咬钩时提竿，按住 E 控线 · 鱼获进背包',kind:'fishing',action:()=>startFishing(p)})),
      {id:'forest-info',x:739,y:302,label:'林务小屋 · 伐木手记',hint:'了解树木再生与建材用途',action:forestInfo},
      ...G.trees.map(t=>({id:t.id,x:t.x,y:t.y+15,bounds:{x:t.x-22,y:t.y-63,w:44,h:82},kind:'tree',reach:29,
        label:R.treeStage(state().trees[t.id],clock())==='grown'?(t.type==='pine'?'青杉':'橡树')+' · 挥斧 '+state().trees[t.id].hits+'/3':'树桩与树苗 · 等它再长大',
        hint:'点树 / E 挥斧 · 三次获得木材 · 一天后再生',action:()=>chop(t.id)}))
    ];
  }
  function drawTree(g,t,time) {
    if(!t.id){g.drawImage(t.sprite,t.x-21,t.y-61);return;}
    const node=state().trees[t.id],stage=R.treeStage(node,clock());
    if(stage==='grown'){
      const shake=!reducedMotion&&effects.some(e=>Math.abs(e.x-t.x)<1&&e.until>time)?Math.sin(time*.05)*2:0;
      g.drawImage(t.sprite,t.x-21+shake,t.y-61);
      if(node.hits){g.fillStyle='#614831';g.fillRect(t.x-12,t.y-63,24,4);g.fillStyle='#efbc6f';g.fillRect(t.x-11,t.y-62,(3-node.hits)*7,2);}
    }else{
      g.fillStyle='#785436';g.fillRect(t.x-5,t.y-7,11,8);g.fillStyle='#c49b63';g.fillRect(t.x-6,t.y-8,13,3);g.fillStyle='#e9c991';g.fillRect(t.x-3,t.y-8,6,1);
      if(stage==='sapling'){g.fillStyle='#678b4e';g.fillRect(t.x+8,t.y-10,2,12);g.fillRect(t.x+4,t.y-9,7,3);g.fillStyle='#9eba71';g.fillRect(t.x+8,t.y-13,6,4);}
    }
  }
  function draw(g,time,player) {
    effects=effects.filter(e=>e.until>time);
    for(const e of effects){const progress=(e.until-time)/1200;g.fillStyle='#fff0b7';g.font='bold 9px "Backyard Sans",sans-serif';g.textAlign='center';g.fillText(e.text,e.x,e.y-(1-progress)*14);
      if(!reducedMotion)for(let i=0;i<5;i++){g.fillStyle=e.colors[i%2];g.fillRect(e.x+Math.cos(i*2)*15*(1-progress),e.y+Math.sin(i*2)*8*(1-progress),2,2);}
    }
    if(time-chopAt<320){g.save();g.translate(player.x+8,player.y-14);g.rotate(reducedMotion?-.4:((time-chopAt)/320)*2-1.5);g.fillStyle='#9d7449';g.fillRect(0,-2,2,17);g.fillStyle='#a7bdba';g.fillRect(-4,-4,9,5);g.fillStyle='#e4e9cf';g.fillRect(-4,-4,2,5);g.restore();}
    if(active?.kind==='fishing'){
      const spot=active.spot,cast=active.phase==='waiting'?Math.min(1,active.elapsed/.6):1;g.strokeStyle='#f0e6bb';g.lineWidth=.7;g.beginPath();g.moveTo(player.x+4,player.y-23);g.quadraticCurveTo(spot.waterX-25,spot.waterY-33,player.x+(spot.waterX-player.x)*cast,spot.waterY);g.stroke();
      g.fillStyle='#976a3e';g.fillRect(player.x+4,player.y-25,2,19);g.fillStyle='#e16d51';g.fillRect(spot.waterX-1,spot.waterY-4,3,4);g.fillStyle='#fff0c7';g.fillRect(spot.waterX-1,spot.waterY,3,2);
      if(!reducedMotion){g.strokeStyle='#c1dfd1';g.beginPath();g.ellipse(spot.waterX,spot.waterY+2,6+Math.sin(time*.004)*2,2,0,0,Math.PI*2);g.stroke();}
    }
  }
  $('activityClose').onclick=close;
  $('activityAction').addEventListener('pointerdown',e=>{if(active?.kind==='fishing'){e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);fishingAction(true);}});
  for(const type of ['pointerup','pointercancel','lostpointercapture'])$('activityAction').addEventListener(type,()=>{if(active?.kind==='fishing')held=false;});
  $('activityAction').onclick=()=>{if(!active)return;if(active.phase==='result'||['prizes','forest-info'].includes(active.kind)){close();return;}if(active.kind==='rings')throwRing();else if(active.kind==='fishing'&&active.phase==='bite')fishingAction(true);};
  panel.addEventListener('click',e=>{const card=e.target.closest('[data-card]'),target=e.target.closest('[data-target]'),prize=e.target.closest('[data-prize]');if(card)flip(+card.dataset.card);if(target)hitTarget(+target.dataset.target);if(prize)redeem(prize.dataset.prize);});
  addEventListener('keydown',e=>{
    if(!active||e.target.matches('input,textarea,select'))return;
    const k=e.key.toLowerCase();e.stopImmediatePropagation();
    if(k==='escape'){e.preventDefault();close();return;}
    if(k==='tab'){const controls=[...panel.querySelectorAll('button:not(:disabled)')].filter(b=>!b.hidden),first=controls[0],last=controls.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}return;}
    if(k===' '||k==='e'){e.preventDefault();if(active.phase==='result'){if(!e.repeat)close();}else if(active.kind==='fishing')fishingAction(true);else if(active.kind==='rings'&&!e.repeat)throwRing();}
    if(!e.repeat&&k>='1'&&k<='8'){if(active.kind==='memory')flip(+k-1);else if(active.kind==='targets')hitTarget(+k-1);}
  },true);
  addEventListener('keyup',e=>{if(['e',' '].includes(e.key.toLowerCase()))held=false;});
  addEventListener('blur',()=>held=false);document.addEventListener('visibilitychange',()=>held=false);
  root.BackyardActivities={targets,update,draw,drawTree,treeStage:id=>R.treeStage(state().trees[id],clock()),
    get busy(){return !!active;},get current(){return active?{kind:active.kind,phase:active.phase}:null;},get tickets(){return state().tickets;},close};
  save();
})(globalThis);
