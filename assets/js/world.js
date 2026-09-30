/* Continuous overworld: travel, camera, interactions, and the mine boundary. */
(function () {
  'use strict';
  const A = BackyardArt, SAVE = 'backyard-world-v1';
  const regions=BackyardGeography.regions;
  let clockAdvancing=false,overview=false;
  const field = {x:170,y:345}, townOrigin = {x:625,y:300}, ranchOrigin = {x:125,y:510};
  const player = {x:302,y:418,direction:'down',phase:0};
  let started=false, mapOpen=false, caveOpen=false, loadingCave=false, storageBlocked=!!window.backyardStorageError;
  let path=[],pending=null,focusHit=null,region='farm',lastUI=0,lastMap=-Infinity,lastSaved=0;
  let camera={x:player.x,y:player.y,z:innerWidth<680?2.2:3};
  const keys=new Set();
  let visited=new Set(['farm']), restored=false;
  try {const s=JSON.parse(localStorage.getItem(SAVE));if(s?.v===1){if(Number.isFinite(s.x)&&Number.isFinite(s.y)){player.x=Math.max(32,Math.min(978,s.x));player.y=Math.max(70,Math.min(840,s.y));}if(Array.isArray(s.visited))visited=new Set(s.visited.filter(k=>regions[k]));restored=true;}}catch (_) {}
  camera.x=player.x;camera.y=player.y;
  function persist() {
    try {localStorage.setItem(SAVE,JSON.stringify({v:1,x:player.x,y:player.y,visited:[...visited],started}));}
    catch (_) {flash('浏览器存储空间不足，位置暂未保存。');}
  }
  const icon = name => ({map:'▧',bag:'▣',quests:'☷',home:'⌂',moon:'☾',sun:'☀',leaf:'❧'}[name]||'·');
  const ui=document.createElement('div');ui.id='worldUI';
  ui.innerHTML=`
    <div class="world-brand"><a href="index.html" aria-label="回到个人主页">${icon('home')}</a><div><small>THE BACKYARD VALLEY</small><h1>后院物语<span>河谷里的每一天</span></h1></div></div>
    <nav class="world-menu" aria-label="世界菜单"><button id="worldMapBtn" aria-label="打开河谷地图">${icon('map')} <span>地图</span><kbd>M</kbd></button><button id="worldBagBtn">${icon('bag')} <span>背包</span><kbd>B</kbd></button><button id="worldQuestBtn">${icon('quests')} <span>委托</span></button><button id="worldHelpBtn" aria-label="操作帮助">?</button></nav>
    <div id="worldLocation"><span class="location-dot"></span><span id="worldRegion">向阳农庄</span><small id="worldWeather"></small></div>
    <button id="worldMini" aria-label="打开河谷地图"><canvas id="worldMiniCanvas" width="168" height="132"></canvas><span>河谷地图 <kbd>M</kbd></span></button>
    <div id="worldPrompt"><div><small id="worldPromptTag">慢慢走，生活就在脚下</small><span id="worldPromptText">点地面行走 · WASD / 方向键移动</span></div><button id="worldInteract">互动 <kbd>E</kbd></button></div>
    <div id="worldZoom"><button id="worldOverview" aria-pressed="false">全景</button><button id="zoomOut" aria-label="缩小地图">−</button><button id="zoomIn" aria-label="放大地图">+</button></div>
    <div class="world-modal" id="worldMap" role="dialog" aria-modal="true" aria-labelledby="mapTitle" hidden><section class="world-paper"><header><div><small>YOUR LITTLE CORNER OF THE WORLD</small><h2 id="mapTitle">沿着小路，去想去的地方</h2></div><button data-close-map aria-label="关闭地图">×</button></header><div class="valley-map"><canvas id="valleyCanvas" width="800" height="630"></canvas><div class="map-stops">${Object.entries(regions).map(([id,r])=>`<button data-travel="${id}"><b>${r.name}</b><small>${r.subtitle}</small><span>沿小路前往 →</span></button>`).join('')}</div></div><footer>七个地方，同一段河谷生活。砍下的木材、钓到的鱼和游园礼物，都会回到你的背包。</footer></section></div>
    <div class="world-modal" id="worldWelcome" role="dialog" aria-modal="true" aria-labelledby="welcomeTitle" hidden><section class="welcome-card"><span class="welcome-sprout">❧</span><small>A LITTLE LIFE IN THE VALLEY</small><h2 id="welcomeTitle">欢迎回到<span>后院。</span></h2><p>从农庄出发，去森林挥斧，去河边抛竿。<br>游乐园里玩一会儿，带小礼物回家；<br>或者提一盏灯，走进北山矿洞。</p><div class="welcome-controls"><span><kbd>W A S D</kbd> 行走</span><span><kbd>E</kbd> 互动</span><span><kbd>M</kbd> 地图</span></div><button id="worldStart">${restored?'继续河谷生活':'开始河谷生活'} <span>→</span></button><small class="welcome-tip">触屏：点地面行走，点地点靠近并互动。进度保存在当前浏览器。</small></section></div>
    <section id="worldCave" aria-label="北山矿洞" hidden><header><div><small>THE NORTHERN MINE</small><b>北山矿洞</b><span>挖掘、探索，让收获成为小镇的一部分。</span></div><button id="leaveCave">返回河谷 ↗</button></header><div id="caveMount"></div></section>
    <div id="worldTransition" aria-hidden="true"></div>`;
  document.body.appendChild(ui);
  const $=id=>document.getElementById(id);
  const screen=(x,y)=>[W/2+(x-camera.x)*camera.z,H*(overview?.5:.53)+(y-camera.y)*camera.z];
  const worldPoint=(x,y)=>({x:(x-W/2)/camera.z+camera.x,y:(y-H*(overview?.5:.53))/camera.z+camera.y});
  const inRect=(x,y,r,pad=0)=>x>=r.x-pad&&x<=r.x+r.w+pad&&y>=r.y-pad&&y<=r.y+r.h+pad;
  function obstacles() {
    return [
      {x:113,y:299,w:48,h:34}, {x:492,y:88,w:130,h:101},
      ...BackyardGeography.obstacles,
      ...LANDMARKS.filter(b=>!['river','board'].includes(b.id)).map(b=>({x:townOrigin.x+b.x-2,y:townOrigin.y+b.y+5,w:b.w+4,h:b.h-5})),
      {x:151,y:546,w:140,h:47},{x:369,y:543,w:130,h:47},{x:155,y:726,w:83,h:48},{x:400,y:752,w:62,h:32}
    ];
  }
  let blockers=obstacles();
  function walkable(x,y) {
    if(x<30||y<65||x>1080||y>845)return false;
    if(x>985&&!(town.buildings.bridge&&y>453&&y<475)&&!(x<1042&&y>688&&y<722))return false;
    return !blockers.some(r=>inRect(x,y,r,4))&&!BackyardGeography.trees.some(t=>BackyardActivities.treeStage(t.id)==='grown'&&Math.hypot(x-t.x,y-t.y)<8);
  }
  if(!walkable(player.x,player.y)){player.x=302;player.y=418;camera.x=302;camera.y=418;}
  // A* on an 8px grid; movement resolves against the same obstacle geometry.
  function route(target) {
    const size=8,cols=Math.ceil(A.WIDTH/size),rows=Math.ceil(A.HEIGHT/size);
    let tx=Math.round(target.x/size),ty=Math.round(target.y/size);
    if(!walkable(tx*size,ty*size)){let found=false;for(let radius=1;radius<=18&&!found;radius++)for(let y=-radius;y<=radius&&!found;y++)for(let x=-radius;x<=radius;x++){if(Math.abs(x)!==radius&&Math.abs(y)!==radius)continue;if(walkable((tx+x)*size,(ty+y)*size)){tx+=x;ty+=y;found=true;break;}}if(!found)return [];}
    const sx=Math.round(player.x/size),sy=Math.round(player.y/size),start=sy*cols+sx,goal=ty*cols+tx;
    const g=new Map([[start,0]]),prev=new Map(),closed=new Set(),heap=[];
    const heuristic=n=>Math.hypot(n%cols-tx,Math.floor(n/cols)-ty);
    const push=(n,f)=>{heap.push({n,f});let i=heap.length-1;while(i){const p=(i-1)>>1;if(heap[p].f<=f)break;[heap[p],heap[i]]=[heap[i],heap[p]];i=p;}};
    const pop=()=>{const first=heap[0],last=heap.pop();if(heap.length){heap[0]=last;let i=0;while(true){let j=i,l=i*2+1,r=l+1;if(l<heap.length&&heap[l].f<heap[j].f)j=l;if(r<heap.length&&heap[r].f<heap[j].f)j=r;if(j===i)break;[heap[i],heap[j]]=[heap[j],heap[i]];i=j;}}return first.n;};
    push(start,heuristic(start));
    while(heap.length&&closed.size<18000){const n=pop();if(closed.has(n))continue;if(n===goal){const points=[];let k=goal;while(k!==start){points.push({x:k%cols*size,y:Math.floor(k/cols)*size});k=prev.get(k);}return points.reverse();}closed.add(n);
      const x=n%cols,y=Math.floor(n/cols);
      for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]){const nx=x+dx,ny=y+dy,k=ny*cols+nx;if(nx<0||nx>=cols||ny<0||ny>=rows||closed.has(k)||!walkable(nx*size,ny*size))continue;if(dx&&dy&&(!walkable(nx*size,y*size)||!walkable(x*size,ny*size)))continue;const next=g.get(n)+(dx&&dy?Math.SQRT2:1);if(next>=(g.get(k)??Infinity))continue;g.set(k,next);prev.set(k,n);push(k,next+heuristic(k));}
    }
    return [];
  }
  const paused=()=>!started||mapOpen||caveOpen||townDialogOpen||ledgerOpen||storageBlocked||(!clockAdvancing&&BackyardActivities.busy);
  function nearbyTargets() {
    const targets=[{id:'mine',x:563,y:206,label:'北山矿洞',hint:'木材、石料与矿石会带回河谷',action:enterCave},
      {id:'home',x:147,y:337,label:'农庄小屋',hint:'休息八小时，让田地慢慢生长',action:()=>{for(let i=0;i<8;i++)tick();flash('在小屋休息了一会儿。');}},
      {id:'warehouse',x:304,y:412,label:'收成仓库',hint:'出售收成、升级工具',action:toggleLedger}];
    for(const p of plots)targets.push({id:`plot-${p.x}-${p.y}`,x:field.x+(p.x+.5)*CELL,y:field.y+(p.y+.5)*CELL,label:p.s?SEEDS.find(s=>s.id===p.s).nm+' · '+(p.st===3?'收获':'浇水照料'):'空地 · 播种'+SEEDS[sel].nm,hint:'种子、收成与旧农庄进度都在这里',action:()=>act(p),plot:p});
    for(const b of LANDMARKS)targets.push({id:b.id,x:townOrigin.x+b.x+b.w/2,y:townOrigin.y+b.y+b.h+12,label:b.name,hint:b.facility&&!town.buildings[b.facility]?'带上木材与石料，修复旧设施':'认识邻居，交换河谷里的收获',action:()=>showTown(b.facility&&!town.buildings[b.facility]?'build':b.place||b.id)});
    for(const p of personPositions())targets.push({id:p.id,x:townOrigin.x+p.x,y:townOrigin.y+p.y+6,label:p.name+' · '+p.role,hint:'聊聊天，也可以送一份礼物',action:()=>showTown('people')});
    for(const [id,x,y,label] of [['ranch-adopt',200,707,'领养小伙伴'],['ranch-birds',230,690,'鸡鸭院 · 添水与喂食'],['ranch-herd',447,697,'牛羊草场'],['ranch-work',203,790,'牧场加工屋'],['ranch-stock',438,792,'牧场装货台'],['ranch-build',370,740,'牧场建设']])targets.push({id,x,y,label,hint:'共享作物、饲料与动物产物',action:()=>showTown(id)});
    for(let i=0;i<town.ranch.animals.length;i++){const a=town.ranch.animals[i],p=ranchPosition(a,i);targets.push({id:a.id,x:ranchOrigin.x+p.x,y:ranchOrigin.y+p.y+7,label:a.name+(a.ready?' · 收取产物':' · 照料'),hint:RANCH_TYPES[a.type].name+' · 摸摸它，看看今天的心情',action:()=>showTown('ranch-animal-'+a.id)});}
    targets.push(...BackyardActivities.targets());
    return targets;
  }
  function approach(hit) {
    if(paused())return;
    if(Math.hypot(player.x-hit.x,player.y-hit.y)<(hit.reach||(hit.plot?25:43))){hit.action();return;}
    pending=hit;path=route(hit);
    if(!path.length){pending=null;flash('这边暂时走不过去，试试沿着小路。');}
  }
  function travel(id) {
    const r=regions[id];if(!r)return;
    closeMap();pending=null;path=route(r);
    if(path.length)flash('沿着小路，前往'+r.name+'。');
  }
  function interact() {if(focusHit&&!paused())approach(focusHit);}
  function move(dt) {
    if(paused())return;
    let dx=0,dy=0;
    if(keys.has('a')||keys.has('arrowleft'))dx--;
    if(keys.has('d')||keys.has('arrowright'))dx++;
    if(keys.has('w')||keys.has('arrowup'))dy--;
    if(keys.has('s')||keys.has('arrowdown'))dy++;
    if(dx||dy){path=[];pending=null;}
    else if(path.length){dx=path[0].x-player.x;dy=path[0].y-player.y;if(Math.hypot(dx,dy)<2){path.shift();return;}}
    const length=Math.hypot(dx,dy),speed=(keys.has('shift')?96:66)*dt;
    if(length){const step=Math.min(speed,length>2?length:speed),nx=player.x+dx/length*step,ny=player.y+dy/length*step;let moved=false;if(walkable(nx,player.y)){player.x=nx;moved=true;}if(walkable(player.x,ny)){player.y=ny;moved=true;}if(!moved){path=[];pending=null;}player.direction=Math.abs(dx)>Math.abs(dy)?dx>0?'right':'left':dy>0?'down':'up';if(!reducedMotion&&moved)player.phase+=dt*13;}
    else player.phase=0;
    if(pending&&Math.hypot(player.x-pending.x,player.y-pending.y)<(pending.reach||(pending.plot?23:36))){const hit=pending;pending=null;path=[];hit.action();}
  }
  function currentRegion() {
    if(player.y<279&&player.x<400)return 'park';
    if(player.y<298&&player.x>710)return 'forest';
    if(player.y>604&&player.x>600)return 'fishing';
    return player.y<270?'mine':player.x>595?'town':player.y>505?'ranch':'farm';
  }
  function updateUI(now) {
    if(now-lastUI<100)return;lastUI=now;
    const next=currentRegion();if(next!==region){region=next;visited.add(next);document.body.dataset.region=next;$('worldRegion').textContent=regions[next].name;}
    const targets=nearbyTargets();focusHit=targets.reduce((best,t)=>{const d=Math.hypot(t.x-player.x,t.y-player.y);return d<(t.reach||(t.plot?24:43))&&(!best||d<best.distance)?{...t,distance:d}:best;},null);
    $('worldPromptTag').textContent=focusHit?focusHit.hint||regions[region].name:'慢慢走，生活就在脚下';
    $('worldPromptText').textContent=focusHit?focusHit.label:pending?'正在走向 '+pending.label:path.length?'沿着小路走一会儿…':'点地面行走 · WASD / 方向键移动';
    $('worldInteract').disabled=!focusHit||paused();
    $('worldWeather').textContent=day%5===0?'雨落河谷':'晴 · 风很轻';
    drawMini();
    if(now-lastSaved>5000&&started){lastSaved=now;persist();}
  }
  function drawMini() {
    const c=$('worldMiniCanvas'),g=c.getContext('2d'),z=c.width/A.WIDTH;g.imageSmoothingEnabled=false;g.drawImage(A.terrain,0,0,c.width,c.height);
    A.drawOverview(g,c.width,c.height,plots,townCanvas,ranchCanvas);
    for(const [id,r]of Object.entries(regions)){g.fillStyle=visited.has(id)?'#f5df94':'#c7cfaa';g.fillRect(r.x*z-2,r.y*c.height/A.HEIGHT-2,4,4);}
    g.fillStyle='#fff7df';g.strokeStyle='#765031';g.lineWidth=2;g.beginPath();g.arc(player.x*z,player.y*c.height/A.HEIGHT,3,0,Math.PI*2);g.fill();g.stroke();
  }
  function draw(dt=1) {
    A.bake(season);BackyardActivities.update(dt/60);move(Math.max(dt/60,0.001));
    const smoothing=reducedMotion?1:Math.min(1,.12*Math.max(dt,1));camera.x+=((overview?A.WIDTH/2:player.x)-camera.x)*smoothing;camera.y+=((overview?A.HEIGHT/2:player.y)-camera.y)*smoothing;if(overview)camera.z=Math.min((W-24)/A.WIDTH,(H-24)/A.HEIGHT);
    ctx.setTransform(DPR,0,0,DPR,0,0);ctx.imageSmoothingEnabled=false;ctx.fillStyle=A.palettes[season].dark;ctx.fillRect(0,0,W,H);
    ctx.save();ctx.translate(W/2-camera.x*camera.z,H*(overview?.5:.53)-camera.y*camera.z);ctx.scale(camera.z,camera.z);ctx.drawImage(A.terrain,0,0);
    if(performance.now()-lastMap>100){renderTownMap();renderRanchMap();lastMap=performance.now();}
    ctx.drawImage(townCanvas,townOrigin.x,townOrigin.y,420,300);ctx.drawImage(ranchCanvas,ranchOrigin.x,ranchOrigin.y,400,320);
    // Make all regions share the same path network, rather than separate screens.
    ctx.fillStyle='#d5be83';ctx.fillRect(600,448,72,17);ctx.fillRect(470,710,72,16);
    if(path.length&&!reducedMotion){ctx.fillStyle='#fff2b555';for(let i=0;i<path.length;i+=4)ctx.fillRect(path[i].x-1,path[i].y-1,2,2);}
    const actors=[...A.trees.map(t=>({y:t.y,draw:()=>BackyardActivities.drawTree(ctx,t,performance.now())})),{y:player.y,draw:()=>A.player(ctx,player.x,player.y,player.phase,player.direction)}].sort((a,b)=>a.y-b.y);
    // Fields are rendered below actors, with the original farming mechanics.
    ctx.restore();cam.z=camera.z;drawFence();drawYard();for(const p of plots)drawPlot(p);
    if(focusHit?.plot){const [x,y]=toScreen(focusHit.plot.x,focusHit.plot.y),s=CELL*camera.z;ctx.strokeStyle='#fff0b7';ctx.lineWidth=2;ctx.strokeRect(x-s/2,y-s/2,s,s);}
    ctx.save();ctx.translate(W/2-camera.x*camera.z,H*(overview?.5:.53)-camera.y*camera.z);ctx.scale(camera.z,camera.z);for(const a of actors)a.draw();BackyardArt.drawAtmosphere(ctx,sceneTime,reducedMotion);BackyardActivities.draw(ctx,performance.now(),player);ctx.restore();
    drawParticles(dt);
    const night=Math.max(0,Math.min(1,hour<6?1-hour/6:hour>17?(hour-17)/5:0));
    if(night){ctx.fillStyle=`rgba(27,40,70,${night*.42})`;ctx.fillRect(0,0,W,H);for(const [x,y]of [[147,315],[601,168],[712,447],[938,448],[312,751]]){const [sx,sy]=screen(x,y),r=30*camera.z,g=ctx.createRadialGradient(sx,sy,0,sx,sy,r);g.addColorStop(0,`rgba(255,212,124,${night*.34})`);g.addColorStop(1,'rgba(255,212,124,0)');ctx.fillStyle=g;ctx.fillRect(sx-r,sy-r,r*2,r*2);}}
    if(!reducedMotion&&day%5===0){ctx.fillStyle='#e6f4e666';for(let i=0;i<60;i++)ctx.fillRect((i*137-sceneTime*.03+W*50)%W,(i*89+sceneTime*.15)%H,1,7);}
    if(!reducedMotion&&season==='spring'){for(let i=0;i<12;i++){const x=(i*113+sceneTime*.008)%W,y=(i*97+sceneTime*.017)%H;ctx.fillStyle=i%2?'#f5dcbb88':'#edb9b088';ctx.fillRect(x,y,3,2);}}
    for(const sign of BackyardGeography.signs){const [x,y]=screen(sign.x,sign.y-13);if(x<-70||x>W+70||y<0||y>H)continue;ctx.font='600 11px \"Backyard Sans\",sans-serif';ctx.textAlign='center';const name=sign.label,w=ctx.measureText(name).width+18;ctx.fillStyle='#60482e';ctx.fillRect(x-w/2,y-14,w,22);ctx.fillStyle='#fff0c3';ctx.fillRect(x-w/2+1,y-13,w-2,20);ctx.fillStyle=sign.color;ctx.fillText(name,x,y+1);}if(focusHit&&!paused()){const [x,y]=screen(focusHit.x,focusHit.y-34);ctx.font='700 12px "Backyard Sans",sans-serif';ctx.textAlign='center';ctx.fillStyle='#654931';ctx.fillRect(x-13,y-13,26,23);ctx.fillStyle='#fff2c4';ctx.fillRect(x-11,y-11,22,19);ctx.fillStyle='#654931';ctx.fillText('E',x,y+3);}
    updateUI(performance.now());
  }
  function openMap() {if(caveOpen||BackyardActivities.busy||townDialogOpen||ledgerOpen)return;keys.clear();mapOpen=true;path=[];pending=null;$('worldMap').hidden=false;const g=$('valleyCanvas').getContext('2d');g.imageSmoothingEnabled=false;g.drawImage(A.terrain,0,0,800,630);g.drawImage(townCanvas,625/A.WIDTH*800,300/A.HEIGHT*630,420/A.WIDTH*800,300/A.HEIGHT*630);g.drawImage(ranchCanvas,125/A.WIDTH*800,510/A.HEIGHT*630,400/A.WIDTH*800,320/A.HEIGHT*630);A.drawOverview(g,800,630,plots,townCanvas,ranchCanvas);
    for(const [id,r]of Object.entries(regions)){g.fillStyle=id==='park'?'#b06a58':id==='fishing'?'#477c8d':'#486b43';g.fillRect(r.x/A.WIDTH*800-26,r.y/A.HEIGHT*630+6,52,16);g.font='9px \"Backyard Sans\",sans-serif';g.textAlign='center';g.fillStyle='#fff0c1';g.fillText(r.name,r.x/A.WIDTH*800,r.y/A.HEIGHT*630+17);}g.fillStyle='#fff2c0';g.strokeStyle='#634732';g.lineWidth=3;g.beginPath();g.arc(player.x/A.WIDTH*800,player.y/A.HEIGHT*630,5,0,Math.PI*2);g.fill();g.stroke();$('worldMap').querySelector('button').focus();}
  function closeMap() {mapOpen=false;$('worldMap').hidden=true;$('worldMapBtn').focus({preventScroll:true});}
  function openBag() {if(paused())return;showTown(region==='ranch'?'ranch-stock':'bag');}
  function syncMaterials(result) {town.stock={...result.farm.town.stock};hud();}
  async function enterCave() {
    if(caveOpen||loadingCave||storageBlocked)return;
    keys.clear();path=[];pending=null;save();persist();caveOpen=true;loadingCave=true;
    $('worldCave').hidden=false;$('leaveCave').disabled=true;$('leaveCave').textContent='正在点亮矿灯…';
    const frame=document.createElement('iframe');frame.title='北山矿洞：坡下小世界';frame.src='game.html?world=1';$('caveMount').replaceChildren(frame);
    const loadTimeout=setTimeout(()=>{if(loadingCave){$('leaveCave').disabled=false;$('leaveCave').textContent='返回河谷';flash('矿洞加载较慢，可以返回后重试。');}},15000);
    frame.addEventListener('load',()=>{
      clearTimeout(loadTimeout);
      try {const game=frame.contentWindow.BackyardAdventure;if(!game)throw new Error('矿洞尚未准备好');if(!game.flush())throw new Error('冒险进度未能保存');save();const result=BackyardStorage.transfer('to-mine');game.applyInventory(result.mine.inv);syncMaterials(result);game.setClock(day,hour);game.pause(false);loadingCave=false;$('leaveCave').disabled=false;$('leaveCave').textContent='返回河谷 ↗';frame.contentWindow.focus();}
      catch(error){loadingCave=false;storageBlocked=true;$('leaveCave').disabled=false;$('leaveCave').textContent='重试保存并返回';flash('矿洞准备失败：'+error.message);}
    },{once:true});
  }

  function restorePending(game) {
    if(localStorage.getItem('backyard-transfer-v1')){
      BackyardStorage.recover();
      const farmSave=JSON.parse(localStorage.getItem('pixelfarm-v1'));
      const mineSave=JSON.parse(localStorage.getItem('yard-world-v1'));
      town.stock={...farmSave.town.stock};game.applyInventory(mineSave.inv);
    }
    storageBlocked=false;
  }
  function leaveCave() {
    const frame=$('caveMount').querySelector('iframe'),game=frame?.contentWindow.BackyardAdventure;
    try {if(!game){if(localStorage.getItem('backyard-transfer-v1'))throw new Error('物资存档仍在恢复中');caveOpen=false;loadingCave=false;storageBlocked=false;$('worldCave').hidden=true;$('caveMount').replaceChildren();return;}game.pause(true);restorePending(game);if(!game.flush())throw new Error('冒险进度未能保存');if(!save())throw new Error('农庄进度未能保存');const result=BackyardStorage.transfer('to-farm');game.applyInventory(result.mine.inv);syncMaterials(result);storageBlocked=false;const n=Object.values(result.moved).reduce((a,b)=>a+b,0),clock=game.clock,elapsed=Math.max(0,Math.min(2400,(clock.day-day)*24+clock.hour-hour));caveOpen=false;for(let i=0;i<elapsed;i++)tick();loadingCave=false;$('worldCave').hidden=true;$('caveMount').replaceChildren();persist();flash(n?'带回 '+n+' 份建材与矿物 · 已放进河谷背包':'回到河谷。田地和小伙伴都在等你。');$('worldBagBtn').focus({preventScroll:true});}
    catch(error){storageBlocked=true;flash('暂时无法结算：'+error.message+'。请保留此页面，重试返回。');}
  }
  const originalToScreen=toScreen;
  toScreen=function(gx,gy){return window.BackyardWorld?screen(field.x+(gx+.5)*CELL,field.y+(gy+.5)*CELL):originalToScreen(gx,gy);};
  window.BackyardWorld={draw,travel,get paused(){return paused();},get storageBlocked(){return storageBlocked;},get position(){return {x:player.x,y:player.y,region};},get caveOpen(){return caveOpen;},leaveCave,project:(x,y)=>screen(x,y),advance(hours){clockAdvancing=true;try{for(let i=0;i<hours;i++)tick();}finally{clockAdvancing=false;}}};
  setTownView=function(view){travel(view);};
  document.title='后院物语 · 河谷里的每一天';
  $('skip').textContent='歇一会儿 · 8 小时';$('workshop').textContent='收成仓库';$('home').textContent='回到主页';
  $('worldMapBtn').onclick=openMap;$('worldMini').onclick=openMap;$('worldBagBtn').onclick=openBag;
  $('worldQuestBtn').onclick=()=>{if(!paused())showTown('board');};$('worldInteract').onclick=interact;
  $('worldHelpBtn').onclick=()=>{if(BackyardActivities.busy)return;$('worldWelcome').hidden=false;started=false;keys.clear();$('worldStart').focus();};
  $('worldStart').onclick=()=>{started=true;$('worldWelcome').hidden=true;persist();const destination=new URLSearchParams(location.search).get('place');if(regions[destination]){travel(destination);history.replaceState(null,'',location.pathname);}if(storageBlocked)flash(window.backyardStorageError||'物资存档需要恢复，请刷新页面重试。');};
  document.querySelector('[data-close-map]').onclick=closeMap;
  document.querySelectorAll('[data-travel]').forEach(b=>b.onclick=()=>travel(b.dataset.travel));
  $('worldMap').addEventListener('click',e=>{if(e.target===$('worldMap'))closeMap();});
  $('leaveCave').onclick=leaveCave;
  function zoom(factor){overview=false;$('worldOverview').textContent='全景';$('worldOverview').setAttribute('aria-pressed','false');camera.z=Math.min(4,Math.max(.75,camera.z*factor));}
  $('worldOverview').onclick=()=>{overview=!overview;$('worldOverview').textContent=overview?'跟随':'全景';$('worldOverview').setAttribute('aria-pressed',String(overview));if(!overview)camera.z=innerWidth<680?2.2:3;};
  $('zoomIn').onclick=()=>zoom(1.15);$('zoomOut').onclick=()=>zoom(.85);
  cv.addEventListener('pointerup',e=>{if(paused())return;const p=worldPoint(e.clientX,e.clientY),targets=nearbyTargets();const hit=targets.filter(t=>t.bounds?inRect(p.x,p.y,t.bounds):Math.hypot(t.x-p.x,t.y-p.y)<(t.plot?9:24)).sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0];if(hit){approach(hit);return;}pending=null;path=route(p);});
  cv.addEventListener('pointermove',e=>{const p=worldPoint(e.clientX,e.clientY);cv.style.cursor=nearbyTargets().some(t=>Math.hypot(t.x-p.x,t.y-p.y)<20)?'pointer':'crosshair';});
  cv.addEventListener('wheel',e=>{e.preventDefault();if(!paused())zoom(e.deltaY<0?1.08:.92);},{passive:false});
  addEventListener('keydown',e=>{
    const k=e.key.toLowerCase();if(e.target.matches('input,textarea,select'))return;
    if(caveOpen){if(k==='escape'&&!loadingCave)leaveCave();return;}
    if(k==='escape'){if(mapOpen){closeMap();e.stopImmediatePropagation();}else if(ledgerOpen){toggleLedger();e.stopImmediatePropagation();}return;}
    if(mapOpen||!started){if(k==='tab'){const box=mapOpen?$('worldMap'):$('worldWelcome'),controls=[...box.querySelectorAll('button')],first=controls[0],last=controls.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}return;}
    if(townDialogOpen||ledgerOpen)return;
    if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright','shift'].includes(k)){e.preventDefault();keys.add(k);}
    if(e.repeat){if(k==='e'&&focusHit?.kind==='tree')interact();return;}
    if(k==='m'){e.preventDefault();openMap();}if(k==='b'){e.preventDefault();openBag();}if(k==='e'){e.preventDefault();interact();}
  },true);
  addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));addEventListener('blur',()=>keys.clear());
  addEventListener('pagehide',persist);
  document.addEventListener('visibilitychange',()=>{keys.clear();if(document.hidden){save();persist();}});
  $('worldWelcome').hidden=false;$('worldStart').focus();
  A.bake(season);hud();
})();
