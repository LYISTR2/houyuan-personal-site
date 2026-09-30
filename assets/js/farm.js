"use strict";
/* =====================================================
   像素农圃 —— 逐格绘制的像素农场，独立经营核心：存档、种植、仓库与绘制
   ===================================================== */
const cv=document.getElementById('cv'), ctx=cv.getContext('2d');
let W,H,DPR;
function rs(){
  DPR=Math.min(devicePixelRatio||1,2);
  W=innerWidth;H=innerHeight;
  cv.width=W*DPR;cv.height=H*DPR;
  cv.style.width=W+'px';cv.style.height=H+'px';
  ctx.setTransform(DPR,0,0,DPR,0,0);
  ctx.imageSmoothingEnabled=false;
  cam.z=Math.max(1.2,Math.min(4.5,(W-(W>900?400:24))/(COLS*CELL+116),(H-(H<700?210:240))/(ROWS*CELL+100)));
}
addEventListener('resize',rs);

/* 地图美术与文字分层：文字按屏幕分辨率绘制，不放大低分辨率字形。 */
function drawMapLabels(labels,map){
  ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';
  for(const l of labels){
    const size=Math.max(11,Math.min(15,9*map.scale));
    ctx.font='600 '+size+'px "Backyard Sans","PingFang SC","Microsoft YaHei",sans-serif';
    const width=Math.ceil(ctx.measureText(l.text).width)+14,height=Math.ceil(size)+10;
    const cx=Math.round((map.x+l.x*map.scale)*DPR)/DPR;
    const cy=Math.round((map.y+(l.y-5)*map.scale)*DPR)/DPR;
    const left=Math.round((cx-width/2)*DPR)/DPR,top=Math.round((cy-height/2)*DPR)/DPR;
    ctx.fillStyle='#263d3b35';ctx.fillRect(left+1,top+2,width,height);
    ctx.fillStyle=l.bg;ctx.fillRect(left,top,width,height);
    ctx.strokeStyle='#40533f70';ctx.lineWidth=1/DPR;ctx.strokeRect(left,top,width,height);
    ctx.fillStyle=l.ink;ctx.fillText(l.text,cx,cy);
  }
  ctx.restore();
}

/* ---------- 调色板 ---------- */
const PAL={
  soilA:'#6b4f35',soilB:'#5d4429',soilWet:'#453421',soilEdge:'#3a2c1c',
  sky0:'#a6d6bf',sky1:'#dae7bb',
  sprout:'#7fae4c',leaf:'#5c8a3c',leafD:'#44682e',
  wheat:'#d9b84b',wheatD:'#b3923a',
  tomato:'#c94f4f',tomatoD:'#9c3838',
  pump:'#d98a3c',pumpD:'#a8662a',
  herb:'#6aa87f',herbD:'#4e8160',
  dead:'#6a5a44',
  fence:'#4a3a28',fenceL:'#5d4a34',
  star:'#e8e0cf',
};

/* ---------- 像素精灵（位图，1=有色 0=透明） ---------- */
// 每个生长阶段一张小图，8x8 ~ 12x12，运行时放大
const SPR={
  sprout:[ // 发芽
    "00011000",
    "00111100",
    "00011000",
    "00011000",
  ],
  leaf:[ // 苗
    "00111100",
    "01111110",
    "11100111",
    "00111100",
    "00011000",
    "00011000",
  ],
  bush:[ // 成株
    "01100110",
    "11111111",
    "11111111",
    "01111110",
    "00111100",
    "00011000",
  ],
};
function fruitDots(kind){ // 果实位置随品种错开
  return kind==='tomato'?[[-4,-10],[3,-12],[0,-18]]:kind==='pump'?[[0,-5]]:[[-5,-13],[5,-16],[0,-21]];
}

/* ---------- 游戏数据 ---------- */
const COLS=7,ROWS=5;
const SEEDS=[
  {id:'wheat', nm:'麦子', ic:'🌾', price:4,  sell:9,  c:PAL.wheat, cd:PAL.wheatD, h:2},
  {id:'tomato',nm:'番茄', ic:'🍅', price:6,  sell:15, c:PAL.tomato,cd:PAL.tomatoD,h:3},
  {id:'pump',  nm:'南瓜', ic:'🎃', price:10, sell:26, c:PAL.pump,  cd:PAL.pumpD,  h:4},
  {id:'herb',  nm:'薄荷', ic:'🌿', price:3,  sell:7,  c:PAL.herb,  cd:PAL.herbD,  h:2},
  {id:'berry', nm:'草莓', ic:'🍓', price:8, sell:22, c:'#db6b76',cd:'#9d4256',h:3,unlock:15,grow:10},
  {id:'sun', nm:'向日葵', ic:'🌻', price:12,sell:32,c:'#edce6d',cd:'#9e7536',h:4,unlock:30,grow:12},
  {id:'grass',nm:'牧草',ic:'🌱',price:2,sell:4,c:'#a4c579',cd:'#577b4d',h:2,grow:5},
];
const GROW=8; // 每阶段浇水小时
let plots=[],coins=20,day=1,hour=8,harv=0,sel=0;
let cam={x:0,y:0,z:3},drag=null,moved=0;   // z = 像素放大倍数
const KEY='pixelfarm-v1';
// 仅视觉偏好另存，不触碰旧种植存档。
const SEASON_KEY='pixelfarm-season-v1',SEASONS=['spring','summer','autumn','winter'];
let season='spring',reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
try{const stored=localStorage.getItem(SEASON_KEY);if(SEASONS.includes(stored))season=stored;}catch(e){}
const motionPreference=matchMedia('(prefers-reduced-motion: reduce)');
motionPreference.addEventListener('change',e=>{reducedMotion=e.matches;particles.length=0;});
function setSeason(value){
  if(!SEASONS.includes(value))return;
  season=value;
  document.querySelectorAll('#season button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.season===value)));
  try{localStorage.setItem(SEASON_KEY,value);}catch(e){}
}
let store={},compost=0,honey=0,deliveries=0,tool='care',hoverPlot=null,ledgerOpen=false,ledgerStamp='';
let upgrades={can:0,sprinkler:0,hive:0},badges=[];
let town={v:1,rep:0,stock:{},friends:{},talked:{},gifted:{},buildings:{},requests:[],completed:0,buys:{},fishingDay:0,fishingCount:0,fishSerial:0};
let townView='farm',townDialogOpen=false;
const BADGES=[{id:'first',name:'第一季收成',text:'收获 10 次',ready:()=>harv>=10,reward:25},{id:'variety',name:'一篮四色',text:'四种基础作物各收获 5 次',ready:()=>SEEDS.slice(0,4).every(s=>(counts[s.id]||0)>=5),reward:60},{id:'neighbour',name:'邻里常客',text:'交付 5 篮订单',ready:()=>deliveries>=5,reward:75},{id:'gardener',name:'坡上的园丁',text:'累计收获 60 次',ready:()=>harv>=60,reward:120}];
let order={id:'wheat',goal:3,done:0,number:1},counts={};
const availableSeeds=()=>SEEDS.filter(s=>harv>=(s.unlock||0));
const marketSeed=()=>{const crops=availableSeeds();return crops[(day-1)%crops.length]};
function nextOrder(n){const crops=availableSeeds();return {id:crops[(n-1)%crops.length].id,goal:Math.min(12,3+Math.floor((n-1)/4)),done:0,number:n};}
const limit=(value,max=999999)=>Number.isFinite(value)?Math.max(0,Math.min(max,Math.floor(value))):0;
function init(){plots=[];for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++)plots.push({x,y,s:null,st:0,w:0,p:0,dead:0,dry:0,fert:0,care:0});}
init();
function save(){if(window.backyardStorageError||window.BackyardWorld?.storageBlocked)return false;try{localStorage.setItem(KEY,JSON.stringify({v:4,plots,coins,day,hour,harv,order,counts,store,compost,honey,deliveries,upgrades,badges,town}));return true;}catch(e){flash('存储不可用，请检查浏览器设置');return false;}}
(function load(){try{const d=JSON.parse(localStorage.getItem(KEY));if(d&&Array.isArray(d.plots)&&d.plots.length===COLS*ROWS){
  plots=plots.map((p,i)=>{const q=d.plots[i];if(!q||q.x!==p.x||q.y!==p.y)return p;return {...p,s:SEEDS.some(S=>S.id===q.s)?q.s:null,st:limit(q.st,3),w:limit(q.w,64),p:Math.max(0,Math.min(24,Number(q.p)||0)),dead:q.dead?1:0,dry:limit(q.dry),fert:limit(q.fert,1),care:limit(q.care,10000)};});
  if(Number.isFinite(d.coins))coins=limit(d.coins);if(Number.isFinite(d.day))day=Math.max(1,limit(d.day));
  if(Number.isFinite(d.hour))hour=limit(d.hour,23);if(Number.isFinite(d.harv))harv=limit(d.harv);
  if(d.order&&SEEDS.some(S=>S.id===d.order.id)&&Number.isFinite(d.order.goal)&&Number.isFinite(d.order.done)&&Number.isFinite(d.order.number))order={id:d.order.id,goal:Math.max(1,limit(d.order.goal,99)),done:limit(d.order.done,99),number:Math.max(1,limit(d.order.number))};
  for(const S of SEEDS){counts[S.id]=limit(d.counts?.[S.id]);const row=d.store?.[S.id];store[S.id]=[0,1,2].map(i=>limit(row?.[i]));}
  compost=limit(d.compost);honey=limit(d.honey);deliveries=limit(d.deliveries);if(d.upgrades)for(const k of Object.keys(upgrades))upgrades[k]=limit(d.upgrades[k],k==='can'?2:1);
  badges=Array.isArray(d.badges)?d.badges.filter(id=>BADGES.some(b=>b.id===id)):[];
  if(d.town&&typeof d.town==='object')town={...town,...d.town};
}}catch(e){}})();

/* ---------- 网格 ---------- */
const CELL=16; // 一格 16 像素（放大 z 倍）
function toScreen(gx,gy){
  return [W/2-(W>900?100:0)+(gx-(COLS-1)/2)*CELL*cam.z+cam.x, H/2+(gy-(ROWS-1)/2)*CELL*cam.z+cam.y];
}
function toGrid(mx,my){
  const gx=(mx-W/2+(W>900?100:0)-cam.x)/(CELL*cam.z)+(COLS-1)/2;
  const gy=(my-H/2-cam.y)/(CELL*cam.z)+(ROWS-1)/2;
  return [Math.floor(gx+.5),Math.floor(gy+.5)];
}

/* ---------- 绘制 ---------- */
function px(x,y,w,h,c){
  if(c===undefined){c=h;h=w;}
  ctx.fillStyle=c;ctx.fillRect(Math.round(x*DPR)/DPR,Math.round(y*DPR)/DPR,Math.ceil(w*DPR)/DPR,Math.ceil(h*DPR)/DPR);
}
function drawSprite(map,cx,cy,c1,c2){
  const s=cam.z;
  for(let r=0;r<map.length;r++)for(let i=0;i<map[r].length;i++){
    if(map[r][i]==='1'){
      px(cx+(i-map[r].length/2)*s, cy+(r-map.length)*s, s, (r<map.length/2)?c2:c1);
    }
  }
}
function drawPlot(p){
  const z=cam.z, s=CELL*z;
  const [cx,cy]=toScreen(p.x,p.y);
  const x=cx-s/2, y=cy-s/2;
  const sway=(!reducedMotion&&p.s&&p.st>0)?Math.sin(sceneTime*.002+p.x*1.7+p.y*.9)*z*.55:0;
  const stemX=cx+sway;
  // 土壤棋盘
  const wet=p.w>0;
  px(x,y,s,(p.x+p.y)%2?(wet?PAL.soilWet:PAL.soilB):(wet?PAL.soilWet:PAL.soilA));
  // 边缘
  px(x,y,s,z,PAL.soilEdge);px(x,y+s-z,s,z,PAL.soilEdge);
  px(x,y,z,s,PAL.soilEdge);px(x+s-z,y,z,s,PAL.soilEdge);
  // 耕沟、湿土反光与堆肥颗粒
  for(let row=0;row<3;row++){px(x+2*z,y+(4+row*4)*z,12*z,z,wet?'#302b25':'#493523');px(x+2*z,y+(3+row*4)*z,11*z,z,wet?'#655d43':'#8a6843')}
  if(wet){px(x+2*z,y+2*z,3*z,z,'#9a9a70');px(x+11*z,y+11*z,2*z,z,'#a5aa83')}
  if(p.fert)for(let i=0;i<4;i++)px(x+(3+i*3)*z,y+(2+(i*5)%12)*z,z,z,'#d5b47a');
  // 更细的耕沟土粒：只增加纹理，不改变作物与格子交互。
  for(let i=0;i<7;i++){const ox=(3+(i*5+p.x*3)%10)*z,oy=(3+(i*7+p.y*2)%10)*z;px(x+ox,y+oy,z/3,z/3,wet?'#a08b6266':'#bd955b88');}
  if(!p.s)return;
  if(p.dead){ // 枯株
    px(cx-z,cy-8*z,2*z,8*z,PAL.dead);
    px(cx-3*z,cy-6*z,2*z,2*z,PAL.dead);
    px(cx+z,cy-7*z,2*z,2*z,PAL.dead);
    return;
  }
  const S=SEEDS.find(q=>q.id===p.s);
  // 茎
  px(stemX-z,cy-(4+p.st*4)*z,2*z,(4+p.st*4)*z,PAL.leafD);
  // 叶丛
  if(p.st>=1) drawSprite(SPR.sprout,stemX,cy-4*z,PAL.sprout,PAL.sprout);
  if(p.st>=2) drawSprite(SPR.leaf,stemX,cy-6*z,PAL.leaf,PAL.sprout);
  if(p.st>=3){
    drawSprite(SPR.bush,stemX,cy-8*z,PAL.leafD,PAL.leaf);
    if(p.s==='grass'){for(let i=0;i<7;i++){const ox=(i-3)*1.5*z;px(stemX+ox,cy-(10+(i%3)*3)*z,z,(8+(i%3)*3)*z,i%2?S.cd:S.c);px(stemX+ox-z,cy-(9+(i%3)*3)*z,3*z,z,S.c);}}
    else if(p.s==='pump'){
      px(stemX-6*z,cy-9*z,12*z,7*z,S.cd);px(stemX-5*z,cy-10*z,10*z,7*z,S.c);
      px(stemX-z,cy-12*z,2*z,3*z,PAL.leafD);
      for(const ox of [-3,0,3])px(stemX+ox*z,cy-8*z,z/3,4*z,'#c17e43');px(stemX-3*z,cy-9*z,3*z,z/3,'#f5d275');
    }else if(p.s==='sun'){px(stemX-5*z,cy-23*z,10*z,7*z,'#e5b747');px(stemX-3*z,cy-25*z,6*z,11*z,'#f5d774');px(stemX-3*z,cy-22*z,6*z,5*z,'#745133');px(stemX-z,cy-21*z,2*z,2*z,'#ab7943')}
    else for(const [ox,oy] of fruitDots(p.s)){
      px(stemX+ox*z-1.5*z,cy+oy*z-1.5*z,3*z,p.s==='wheat'?5*z:3*z,S.cd);
      px(stemX+ox*z-z,cy+oy*z-z,2*z,p.s==='wheat'?4*z:2*z,S.c);
      px(stemX+ox*z-z,cy+oy*z-z,z/3,z/3,'#fff4c4');if(p.s==='straw')px(stemX+ox*z+.3*z,cy+oy*z,z/3,z/3,'#f6cc83');
    }
  }
  // 渴水标记：一个闪烁的小水滴像素
  if(p.w<=0&&(reducedMotion||Math.floor(sceneTime/500)%2===0))
    px(cx+5*z,cy-12*z,2*z,2*z,'#5ab0e8');
}
function drawFence(){
  const z=cam.z;
  const [left,top]=toScreen(0,0),[right,bottom]=toScreen(COLS-1,ROWS-1),size=CELL*z;
  const ground=['#6b984e','#588c4f','#aa854a','#c6d9de'][SEASONS.indexOf(season)];
  const rim=['#9abf69','#7daa56','#c49f61','#e7ece3'][SEASONS.indexOf(season)];
  px(left-size*.5-14*z,top-size*.5-14*z,right-left+size+28*z,bottom-top+size+28*z,ground);
  px(left-size*.5-11*z,top-size*.5-11*z,right-left+size+22*z,bottom-top+size+22*z,rim);
  for(let i=0;i<90;i++){
    const x=left-size*.5-10*z+((i*47)%(COLS*CELL+19))*z;
    const y=top-size*.5-10*z+((i*61)%(ROWS*CELL+19))*z;
    if(x<left-size*.5||x>right+size*.5||y<top-size*.5||y>bottom+size*.5)
      px(x,y,z,z,season==='winter'?(i%3?'#e7f0ec':'#fff9dd'):i%3?'#9bca80':'#e4da8c');
  }
  for(let x=0;x<=COLS;x++){
    const [cx,cy]=toScreen(x-.5,-.5);
    px(cx-z,cy-4*z,2*z,6*z,PAL.fence);
    px(cx-z,cy-4*z,2*z,z,PAL.fenceL);
    const [cx2,cy2]=toScreen(x-.5,ROWS-.5);
    px(cx2-z,cy2-4*z,2*z,6*z,PAL.fence);
    px(cx2-z,cy2-4*z,2*z,z,PAL.fenceL);
  }
  for(let y=0;y<=ROWS;y++)for(const x of [-1,COLS]){
    const [cx,cy]=toScreen(x,y-.5);
    px(cx-z,cy-4*z,2*z,6*z,PAL.fence);
    px(cx-z,cy-4*z,2*z,z,PAL.fenceL);
  }
  px(right+size*.5+15*z,top+3*z,18*z,11*z,'#4d402d');
  px(right+size*.5+13*z,top+z,18*z,11*z,'#e6c58c');
  px(right+size*.5+18*z,top+5*z,10*z,2*z,'#648b5a');
  px(right+size*.5+22*z,top+12*z,2*z,10*z,'#5a4733');
  px(left-size*.5-32*z,bottom+size*.5-6*z,17*z,9*z,'#547b71');
  px(left-size*.5-29*z,bottom+size*.5-9*z,11*z,3*z,'#a9c8a8');
}
/* 小屋、石径与水塘都绑定田地坐标，缩放时保留像素比例。 */
function drawYard(){
 const z=cam.z,[left,top]=toScreen(-.5,-.5),[right,bottom]=toScreen(COLS-.5,ROWS-.5);
 const rect=(x,y,w,h,c)=>px(left+x*z,top+y*z,w*z,h*z,c);
 rect(-48,-33,37,22,'#54734c');rect(-46,-36,33,23,'#8caa6a');
 if(window.BackyardArt)BackyardArt.cottage(rect,-55,-47);else{
 // 木屋：瓦片、檐影、门窗、烟囱。
 rect(-40,-38,27,20,'#513e32');rect(-38,-36,23,18,'#d6bf8e');
 for(let row=0;row<4;row++)rect(-38,-35+row*4,23,1,'#b69b72');
 rect(-43,-42,33,5,'#574235');rect(-40,-46,27,5,'#a0634c');rect(-36,-49,19,4,'#c18460');
 for(let col=0;col<6;col++)rect(-39+col*4,-43,3,1,'#ddab80');
 rect(-34,-57,5,12,'#6c5850');rect(-34,-57,5,2,'#b09d81');
 rect(-23,-31,6,13,'#614b38');rect(-22,-30,4,11,'#896942');rect(-19,-25,1,1,'#e8c586');
 rect(-35,-31,8,7,'#4b5c56');rect(-34,-30,6,5,'#adc3a0');rect(-32,-30,1,5,'#6e775b');rect(-34,-28,6,1,'#6e775b');
 rect(-39,-18,26,3,'#9d8c6b');rect(-24,-15,8,7,'#b2a583');
 for(let i=0;i<8;i++){rect(-21+i*4,-5+(i%2)*2,4,3,'#c5b58d');rect(-21+i*4,-3+(i%2)*2,3,1,'#8e8968')}
 }
 // 池岸阶梯与像素水波。
 const pondY=ROWS*CELL+12;
 rect(-43,pondY-1,33,15,'#738958');rect(-40,pondY-3,27,19,'#b2b381');rect(-39,pondY,25,13,'#497f88');rect(-35,pondY-2,17,16,'#73a6a3');rect(-37,pondY+2,21,8,'#82b7ac');
 for(let i=0;i<5;i++)rect(-35+(i*7)%19,pondY+3+(i*3)%9,4,1,reducedMotion||Math.sin(sceneTime*.002+i)>0?'#c3dac5':'#75aaa3');
 rect(-40,pondY-5,1,7,'#547345');rect(-41,pondY-6,3,2,'#b6a577');rect(-15,pondY+10,4,2,'#679464');rect(-13,pondY+9,1,1,'#efc5b8');
 // 菜篮、堆肥桶、喷灌与蜂箱对应实际升级。
 rect(COLS*CELL+16,ROWS*CELL-12,13,12,'#665441');rect(COLS*CELL+17,ROWS*CELL-10,11,9,'#948362');rect(COLS*CELL+16,ROWS*CELL-12,13,2,'#b6a281');
 for(let i=0;i<3;i++)rect(COLS*CELL+19+i*3,ROWS*CELL-14,2,3,compost?'#adc17c':'#736a4e');
 if(upgrades.sprinkler){rect(COLS*CELL+19,ROWS*CELL*.5,2,11,'#697d7c');rect(COLS*CELL+16,ROWS*CELL*.5,8,2,'#bed0bd');if(hour===6&&!reducedMotion)for(let i=0;i<5;i++)rect(COLS*CELL+13-i*4,ROWS*CELL*.5-2+(i%2)*2,2,1,'#cbe9da')}
 if(upgrades.hive){rect(COLS*CELL+18,-22,14,13,'#9d7847');rect(COLS*CELL+16,-25,18,4,'#64563e');for(let i=0;i<3;i++)rect(COLS*CELL+19,-20+i*4,12,1,'#dfb977');rect(COLS*CELL+23,-12,5,2,'#423c32');rect(COLS*CELL+19,-9,2,5,'#6e6845');rect(COLS*CELL+29,-9,2,5,'#6e6845');
  for(let i=0;i<3;i++){const bx=COLS*CELL+16+(reducedMotion?i*4:Math.sin(sceneTime*.0015+i)*10),by=-18+(reducedMotion?i*2:Math.cos(sceneTime*.002+i)*8);rect(bx,by,3,2,'#f0d281');rect(bx+1,by,1,2,'#675140');rect(bx,by-1,2,1,'#e3efd1')}}
 // 边缘果树：四季换叶，秋天落叶，冬天积雪。
 const leaf=['#91ad67','#729b57','#c39962','#dce9dc'][SEASONS.indexOf(season)];
 for(const [x,y]of [[-35,21],[COLS*CELL+29,42]]){rect(x+5,y+13,3,14,'#76614a');rect(x+2,y+10,10,4,'#64704a');rect(x-1,y+2,16,12,'#557b53');rect(x+1,y,12,10,leaf);rect(x+4,y-3,6,5,leaf);if(season!=='winter'){rect(x+3,y+4,2,2,season==='autumn'?'#c67451':'#dfca8a');rect(x+10,y+7,2,2,'#d9b879')}}
 if(!reducedMotion)for(let i=0;i<3;i++){const sx=left+(-32+i*2+Math.sin(sceneTime*.001+i))*z,sy=top+(-62-i*5-(sceneTime*.004)%5)*z;px(sx,sy,(3+i)*z,2*z,'#eee6cd77')}

}
function drawEvening(){
 const night=Math.max(0,Math.min(1,hour<6?1-hour/6:hour>17?(hour-17)/5:0));if(!night)return;
 ctx.fillStyle='rgba(18,31,56,'+(night*.47)+')';ctx.fillRect(0,0,W,H);
 const z=cam.z,[left,top]=toScreen(-.5,-.5),glow=(x,y,r)=>{const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,'rgba(255,223,142,'+night*.45+')');g.addColorStop(1,'rgba(255,223,142,0)');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2)};
 px(left-34*z,top-30*z,6*z,5*z,'#eac681');glow(left-31*z,top-27*z,22*z);
 for(const [gx,gy]of [[-.7,-.7],[COLS-.3,ROWS-.3]]){const [x,y]=toScreen(gx,gy);px(x-z,y-8*z,2*z,9*z,'#665948');px(x-2*z,y-10*z,4*z,3*z,'#f1d492');glow(x,y-9*z,18*z)}
 if(day%5!==0)for(let i=0;i<7;i++){const x=left+((i*37)%120)*z,y=top+((i*29)%80)*z+(reducedMotion?0:Math.sin(sceneTime*.001+i)*5*z);px(x,y,z,z,'#e9e5a7')}
}
const stars=Array.from({length:60},()=>({x:Math.random(),y:Math.random()*0.5}));
const clouds=[{x:.12,y:.15,s:1.1,v:.000009},{x:.52,y:.25,s:.75,v:.000013},{x:.81,y:.11,s:1.3,v:.000007}];
let sceneTime=0,lastFrame=0,particles=[];
function burst(gx,gy,colors,count=10){
  if(reducedMotion)return;
  const [x,y]=toScreen(gx,gy);
  for(let i=0;i<count&&particles.length<240;i++)particles.push({x,y:y-cam.z*8,vx:(Math.random()-.5)*2.4,vy:-Math.random()*2.8-1,life:40+Math.random()*20,c:colors[i%colors.length]});
}
function drawCloud(x,y,size){
  const u=Math.max(2,Math.round(cam.z*.75*size));
  ctx.fillStyle='#f5edd2';ctx.fillRect(Math.round(x+u),Math.round(y+2*u),17*u,3*u);
  ctx.fillStyle='#fff7df';ctx.fillRect(Math.round(x+3*u),Math.round(y+u),12*u,4*u);
  ctx.fillRect(Math.round(x+6*u),Math.round(y),6*u,2*u);
}
function drawSky(){
  const tint={spring:['#8dc5ab','#e5dea9','#7daa76','#668e65'],summer:['#78baca','#f6d89b','#91b16c','#5e986b'],autumn:['#e0b183','#f7d4a2','#b89464','#8a855d'],winter:['#b9d6de','#e7e7d9','#c3d5cf','#9cbeb7']}[season];
  const g=ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,tint[0]);g.addColorStop(1,tint[1]);
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  // 像素云随时间缓缓飘过；弱动效偏好下保持静态。
  for(const cloud of clouds){
    const x=((cloud.x*W+sceneTime*cloud.v*W)%(W+230))-115;
    drawCloud(x,cloud.y*H,cloud.s);
  }
  ctx.fillStyle=tint[2];ctx.beginPath();ctx.moveTo(0,H*.54);
  for(let x=0;x<=W+12;x+=12)ctx.lineTo(x,H*.54+Math.sin(x*.016)*20);
  ctx.lineTo(W,H);ctx.lineTo(0,H);ctx.fill();
  ctx.fillStyle=tint[3];ctx.beginPath();ctx.moveTo(0,H*.68);
  for(let x=0;x<=W+12;x+=12)ctx.lineTo(x,H*.67+Math.sin(x*.02+2)*25);
  ctx.lineTo(W,H);ctx.lineTo(0,H);ctx.fill();
  for(const s of stars)px(s.x*W,H*.7+s.y*H*.5,2,4,season==='winter'?'#ebf2e9':'#bbd38f');
  const mx=W*.82,my=H*.16,u=Math.max(2,Math.round(cam.z));
  for(const [ox,oy] of [[0,0],[1,0],[2,0],[0,1],[1,1],[2,1],[3,1],[0,2],[1,2],[2,2],[1,3],[2,3]])
    ctx.fillStyle=season==='winter'?'#fff9df':'#fff0ac',ctx.fillRect(mx+ox*u*2,my+oy*u*2,u*2,u*2);
}
function drawParticles(dt){
  for(const particle of particles){
    particle.x+=particle.vx*dt;particle.y+=particle.vy*dt;particle.vy+=.11*dt;particle.life-=dt;
    if(particle.life>0)px(particle.x,particle.y,Math.max(2,Math.round(cam.z)),particle.c);
  }
  particles=particles.filter(p=>p.life>0);
}
function draw(dt=1){
  if(townView==='town'&&typeof drawTown==='function'){drawTown(dt);return;}
  if(townView==='ranch'&&typeof drawRanch==='function'){drawRanch(dt);return;}
  drawSky();
  drawFence();drawYard();
  for(const p of plots)drawPlot(p);
  if(hoverPlot&&!ledgerOpen){const [x,y]=toScreen(hoverPlot.x,hoverPlot.y),s=CELL*cam.z;ctx.strokeStyle='#fff0b7';ctx.lineWidth=Math.max(1,cam.z);ctx.strokeRect(x-s/2,y-s/2,s,s)}
  if(day%5===0){ctx.fillStyle='#ecf3df99';for(let i=0;i<48;i++)ctx.fillRect((i*113+sceneTime/55)%W,(i*79+sceneTime/35)%H,2,7);}
  drawEvening();drawParticles(dt);
}

/* ---------- 经营 ---------- */
const totalStock=id=>(store[id]||[]).reduce((n,v)=>n+v,0);
const quality=['普通','银星','金星'],qualityRate=[1,1.25,1.6];
const cropPrice=(S,q)=>Math.round(S.sell*qualityRate[q]*(marketSeed().id===S.id?1.2:1));
function takeStock(id,n){const bins=store[id]||[0,0,0];let value=0;const S=SEEDS.find(s=>s.id===id);for(let q=0;q<3&&n>0;q++){const take=Math.min(bins[q],n);bins[q]-=take;n-=take;value+=take*cropPrice(S,q)}return value}
function sell(id){const n=totalStock(id);if(!n)return;const value=takeStock(id,n);coins+=value;flash('售出 '+n+' 份 · +'+value+'◈');save();hud()}
function deliver(){const need=Math.max(0,order.goal-order.done);if(totalStock(order.id)<need)return;const value=takeStock(order.id,need),bonus=order.goal*6;coins+=value+bonus;deliveries++;compost+=2;order=nextOrder(order.number+1);flash('订单交付 · +'+(value+bonus)+'◈，堆肥 +2');save();hud()}
function toggleLedger(){ledgerOpen=!ledgerOpen;document.getElementById('ledger').style.display=ledgerOpen?'block':'none';if(ledgerOpen){drag=null;ledgerStamp='';ledger()}else document.getElementById('workshop').focus({preventScroll:true})}
function ledger(){const state=JSON.stringify([day,store,coins,compost,honey,upgrades,badges,harv,counts,deliveries]);if(state===ledgerStamp)return;ledgerStamp=state;
 const canCost=upgrades.can===0?45:90;
 document.getElementById('ledger').innerHTML='<div class="ledger-top"><h2>农圃 · 仓库与工坊</h2><button class="farm-btn" id="closeLedger">收起 ×</button></div><p>收获先入仓：留给订单赚奖金，或直接出售换种子。银星 ×1.25、金星 ×1.6；今日热销 '+marketSeed().nm+' 再加 20%。</p><div class="ledger-grid"><div><h3>收成仓库</h3>'+SEEDS.map(S=>'<div class="stock-row"><span>'+S.nm+' · '+totalStock(S.id)+'<small>'+quality.map((q,i)=>q+' '+(store[S.id]?.[i]||0)).join(' / ')+'</small></span><button class="farm-btn" data-sell="'+S.id+'" '+(totalStock(S.id)?'':'disabled')+'>全部出售</button></div>').join('')+'<div class="stock-row"><span>蜂蜜 · '+honey+'<small>每份 18◈</small></span><button class="farm-btn" id="sellHoney" '+(honey?'':'disabled')+'>出售蜂蜜</button></div><h3>成长手记</h3>'+BADGES.map(b=>'<div class="stock-row"><span>'+b.name+'<small>'+b.text+' · 奖励 '+b.reward+'◈</small></span><button class="farm-btn" data-badge="'+b.id+'" '+(badges.includes(b.id)||!b.ready()?'disabled':'')+'>'+(badges.includes(b.id)?'已完成':b.ready()?'领奖':'成长中')+'</button></div>').join('')+'</div><div><h3>工坊升级</h3><div class="upgrade-row"><span>浇水壶 · '+upgrades.can+' / 2<small>一级浇十字 5 格，二级浇周围 9 格</small></span><button class="farm-btn" data-buy="can" '+(upgrades.can>=2||coins<canCost?'disabled':'')+'>'+ (upgrades.can>=2?'已满级':canCost+'◈')+'</button></div><div class="upgrade-row"><span>晨间喷灌<small>每天 06:00 全田补水至 24</small></span><button class="farm-btn" data-buy="sprinkler" '+(upgrades.sprinkler||coins<120?'disabled':'')+'>'+(upgrades.sprinkler?'已建造':'120◈')+'</button></div><div class="upgrade-row"><span>木蜂箱<small>三株开花作物 → 每日 2 蜂蜜；花期加速</small></span><button class="farm-btn" data-buy="hive" '+(upgrades.hive||coins<160?'disabled':'')+'>'+(upgrades.hive?'已建造':'160◈')+'</button></div><h3>堆肥与照料</h3><p>现有堆肥 '+compost+' 份。订单赠送，或将两份薄荷制成一份堆肥。选择“施肥”后点未成熟作物：生长加速 25%，收成升为金星。</p><button class="farm-btn" id="makeCompost" '+(totalStock('herb')>=2?'':'disabled')+'>2 薄荷 → 1 堆肥</button><p>完成 15 次收获解锁草莓，30 次解锁向日葵。缺水只暂停生长，不会枯死。打开账本时农圃暂停。</p></div></div>';
 document.getElementById('closeLedger').onclick=toggleLedger;document.getElementById('closeLedger').focus({preventScroll:true});
 document.querySelectorAll('[data-sell]').forEach(b=>b.onclick=()=>sell(b.dataset.sell));
 document.querySelectorAll('[data-buy]').forEach(b=>b.onclick=()=>{const k=b.dataset.buy,cost=k==='can'?canCost:k==='sprinkler'?120:160;if(coins<cost||upgrades[k]>=(k==='can'?2:1))return;coins-=cost;upgrades[k]++;flash('升级完成 · '+({can:'浇水壶',sprinkler:'晨间喷灌',hive:'木蜂箱'})[k]);save();hud()});
 document.querySelectorAll('[data-badge]').forEach(b=>b.onclick=()=>{const badge=BADGES.find(q=>q.id===b.dataset.badge);if(!badge||badges.includes(badge.id)||!badge.ready())return;badges.push(badge.id);coins+=badge.reward;flash(badge.name+' · +'+badge.reward+'◈');save();hud()});
 document.getElementById('makeCompost').onclick=()=>{if(totalStock('herb')<2)return;takeStock('herb',2);compost++;save();hud()};
 document.getElementById('sellHoney').onclick=()=>{if(!honey)return;coins+=honey*18;honey=0;save();hud()};
}
function tick(){
 if(ledgerOpen||townDialogOpen||window.BackyardWorld?.paused)return;
 hour++;if(hour>=24){hour=0;day++;flash('第 '+day+' 天 · 热销 '+marketSeed().nm)}
 if(typeof townHour==='function')townHour();
 if(hour===6&&upgrades.sprinkler)for(const p of plots)if(p.s&&!p.dead)p.w=Math.max(p.w,24);
 if(hour===8&&upgrades.hive&&plots.filter(p=>p.s&&!p.dead&&p.st>=2).length>=3){honey+=2;flash('蜂箱收获 · 蜂蜜 +2')}
 for(const p of plots){
  if(!p.s||p.dead)continue;
  if(day%5===0)p.w=Math.min(64,p.w+2);
  const S=SEEDS.find(s=>s.id===p.s),grow=S.grow||GROW;
  if(p.w>0){p.w--;if(p.st<3){p.care++;p.p+=1+(p.fert?.25:0)+(upgrades.hive&&p.st>=2?.15:0)}}
  if(p.p>=grow&&p.st<3){p.st++;p.p-=grow;burst(p.x,p.y,['#e5f1ae','#c0d977','#fff2c8'],7)}
  if(p.w<=0&&p.st<3)p.dry++;else p.dry=0;
 }
 save();hud();
}
setInterval(()=>{if(!document.hidden)tick()},18000);
function act(p){
 if(ledgerOpen)return;
 if(tool==='clear'){if(!p.s){flash('这格已经是空地');return}if(!p.dead&&!confirm('铲除这格作物？种子不会退回。'))return;Object.assign(p,{dead:0,s:null,st:0,p:0,fert:0,care:0});flash('清理了田地')}
 else if(tool==='fertilize'){if(!p.s||p.dead||p.st>=3){flash('堆肥只用于未成熟作物');return}if(p.fert){flash('这株已经施肥');return}if(!compost){flash('没有堆肥 · 可在工坊用薄荷制作');return}compost--;p.fert=1;burst(p.x,p.y,['#cbb580','#a7bd72'],8);flash('施肥完成 · 加速生长，金星收成')}
 else if(p.dead){Object.assign(p,{dead:0,s:null,st:0,p:0,fert:0,care:0});flash('清理了枯株')}
 else if(!p.s){const S=SEEDS[sel];if(harv<(S.unlock||0)){flash('累计收获 '+S.unlock+' 次后解锁');return}const packet=(town.seedPackets?.[S.id]||0)>0;if(!packet&&coins<S.price){flash('零钱不足 · 去仓库出售收成');return}if(packet)town.seedPackets[S.id]--;else coins-=S.price;Object.assign(p,{s:S.id,st:0,p:0,w:32,dry:0,fert:0,care:0});burst(p.x,p.y,['#e9d6a0','#7db565','#fff0c3'],8);flash('种下 '+S.nm)}
 else if(p.st>=3){const S=SEEDS.find(s=>s.id===p.s),q=p.fert?2:p.w>0&&p.care>=(S.grow||GROW)*2.4?1:0;store[S.id]||=[0,0,0];store[S.id][q]++;harv++;counts[S.id]=(counts[S.id]||0)+1;burst(p.x,p.y,[S.c,'#ffe596','#fff8d5'],16);Object.assign(p,{s:null,st:0,p:0,fert:0,care:0});flash(quality[q]+' '+S.nm+' 收进仓库 · B 出售或交订单');try{parent.postMessage({type:'farm-harvest',value:cropPrice(S,q),total:harv},location.origin)}catch(e){}}
 else{const targets=upgrades.can?plots.filter(q=>q.s&&!q.dead&&Math.abs(q.x-p.x)<=1&&Math.abs(q.y-p.y)<=1&&(upgrades.can===2||Math.abs(q.x-p.x)+Math.abs(q.y-p.y)<=1)):[p];for(const q of targets){q.w=Math.min(q.w+24,32+upgrades.can*16);burst(q.x,q.y,['#a1d5df','#e3f4ed'],5)}flash('浇透了 '+targets.length+' 格')}
 save();hud();
}

/* ---------- 输入 ---------- */
cv.addEventListener('pointerdown',e=>{if(window.BackyardWorld)return;if(ledgerOpen)return;cv.setPointerCapture(e.pointerId);drag={x:e.clientX,y:e.clientY,cx:cam.x,cy:cam.y};moved=0;});
cv.addEventListener('pointermove',e=>{
  if(window.BackyardWorld)return;
  const [gx,gy]=toGrid(e.clientX,e.clientY);hoverPlot=plots.find(p=>p.x===gx&&p.y===gy)||null;fieldInfo();
  if(!drag)return;
  const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
  if(!moved&&Math.abs(dx)+Math.abs(dy)<=5)return;moved=1;
  cam.x=drag.cx+dx;cam.y=drag.cy+dy;
});
cv.addEventListener('pointerup',e=>{
  if(window.BackyardWorld)return;
  if(!drag)return;drag=null;if(moved||ledgerOpen)return;
  const [gx,gy]=toGrid(e.clientX,e.clientY);
  const p=plots.find(q=>q.x===gx&&q.y===gy);hoverPlot=p||null;
  if(p)act(p);
});
cv.addEventListener('pointercancel',()=>drag=null);cv.addEventListener('pointerleave',()=>{hoverPlot=null;fieldInfo()});
cv.addEventListener('wheel',e=>{
  if(window.BackyardWorld)return;
  e.preventDefault();
  cam.z=Math.min(7,Math.max(1.5,cam.z*(e.deltaY>0?0.9:1.12)));
},{passive:false});
addEventListener('keydown',e=>{
  if(e.target.matches('input,textarea,select'))return;
  if(window.BackyardWorld){if(window.BackyardWorld.paused)return;if(e.key.toLowerCase()==='b'||e.key==='Escape')return;}
  if(e.repeat)return;
  if(e.key.toLowerCase()==='b'){toggleLedger();return}if(e.key==='Escape'&&ledgerOpen){toggleLedger();return}if(ledgerOpen)return;
  if(e.key>='1'&&e.key<='7'){const i=+e.key-1;if(harv>=(SEEDS[i].unlock||0)){sel=i;tool='care';hud()}}
  if(e.key===' '){e.preventDefault();for(let i=0;i<8;i++)tick()}
});
document.getElementById('workshop').onclick=toggleLedger;document.getElementById('deliver').onclick=deliver;
document.querySelectorAll('[data-tool]').forEach(b=>b.onclick=()=>{tool=b.dataset.tool;hud()});
document.getElementById('skip').onclick=()=>{for(let i=0;i<8;i++)tick();};
document.querySelectorAll('#season button').forEach(button=>button.onclick=()=>setSeason(button.dataset.season));
setSeason(season);

/* ---------- HUD ---------- */
const bar=document.getElementById('bar');
SEEDS.forEach((S,i)=>{
  const d=document.createElement('button');d.type='button';d.className='seed';
  d.innerHTML=`<div class="ic">${S.ic}</div><div class="nm">${S.nm}</div><div class="pr">${S.price}◈</div>`;
  d.onclick=()=>{if(harv<(S.unlock||0)){flash('收获 '+S.unlock+' 次解锁 '+S.nm);return}sel=i;tool='care';hud();};
  bar.appendChild(d);
});
function fieldInfo(){const p=hoverPlot;if(!p){document.getElementById('fieldInfo').textContent=tool==='fertilize'?'堆肥 '+compost+' · 点未成熟作物施肥':tool==='clear'?'铲除模式 · 种子不退回':'收获进仓库 · B 出售与升级';return}const S=SEEDS.find(s=>s.id===p.s);document.getElementById('fieldInfo').textContent=S?S.nm+' · '+(p.st===3?'可收获':Math.min(99,Math.floor((p.st+p.p/(S.grow||GROW))/3*100))+'%')+' · 水分 '+p.w+(p.fert?' · 已施肥':''):('空地 · 种下 '+SEEDS[sel].nm)}
function hud(){
  document.getElementById('d').textContent=day;
  document.getElementById('c').textContent=coins;
  document.getElementById('h').textContent=harv;
  document.getElementById('day').textContent=String(hour).padStart(2,'0')+':00'+(day%5===0?' · 雨天，田地会自然回潮':' · 晴天');
  const O=SEEDS.find(S=>S.id===order.id);
  const need=Math.max(0,order.goal-order.done),held=totalStock(O.id);
  document.getElementById('order-name').textContent='第 '+order.number+' 篮 · '+O.nm;
  document.getElementById('order-text').textContent='仓库 '+held+' / '+need+' 份'+(order.done?' · 旧进度已保留':'');
  document.getElementById('order-fill').style.width=Math.min(100,(held+order.done)/order.goal*100)+'%';
  document.getElementById('order-reward').textContent='货款 + 奖金 '+order.goal*6+'◈ · 堆肥 ×2';
  document.getElementById('deliver').disabled=held<need;
  [...bar.children].forEach((d,i)=>{
    const locked=harv<(SEEDS[i].unlock||0);
    d.classList.toggle('on',i===sel&&tool==='care');d.classList.toggle('locked',locked);
    const packets=town.seedPackets?.[SEEDS[i].id]||0;
    d.classList.toggle('off',!packets&&coins<SEEDS[i].price);
    d.querySelector('.pr').textContent=locked?'收获 '+SEEDS[i].unlock:packets?'种子包 '+packets:SEEDS[i].price+'◈';
    d.setAttribute('aria-pressed',String(i===sel&&tool==='care'));
  });
  document.querySelectorAll('[data-tool]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.tool===tool)));
  fieldInfo();if(ledgerOpen)ledger();if(typeof townHud==='function')townHud();
}
let tt;
function flash(m){const t=document.getElementById('toast');t.textContent=m;t.classList.add('show');clearTimeout(tt);tt=setTimeout(()=>t.classList.remove('show'),1400);}

// 旧存档若把全部零钱用尽且田里无作物，补一包便宜的种子防止死局。
if(coins<3&&!plots.some(p=>p.s&&!p.dead)&&!SEEDS.some(s=>totalStock(s.id))&&!honey){coins=4;flash('找到一包麦种 · 补给 4◈');save();}
rs();hud();
(function loop(now){
  if(document.hidden){lastFrame=0;requestAnimationFrame(loop);return;}
  const delta=lastFrame?Math.min((now-lastFrame)/16.67,2):1;
  lastFrame=now;
  sceneTime+=Math.min(delta*16.67,34);
  if(window.BackyardWorld)window.BackyardWorld.draw(delta);else draw(reducedMotion?0:delta);
  requestAnimationFrame(loop);
})(0);
