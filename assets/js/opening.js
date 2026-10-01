(function(){
/* ===== 像素河谷日出场景：192×144 逻辑像素，纯 Canvas 2D，无依赖 ===== */
var W=192,H=144,HZ=82;
function clamp(x,a,b){return Math.min(b,Math.max(a,x));}
function ss(a,b,x){var t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);}
function lerp(a,b,t){return a+(b-a)*t;}
function easeOut(x){return 1-Math.pow(1-clamp(x,0,1),3);}
function hex(h){h=h.replace('#','');return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];}
function mix(a,b,t){return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];}
function rgb(c,a){var s=(c[0]|0)+','+(c[1]|0)+','+(c[2]|0);return a===undefined?'rgb('+s+')':'rgba('+s+','+a+')';}
function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}

/* 调色：改这里就能换整体气质 */
var SKY_T=[hex('#1b2740'),hex('#6d7fa3'),hex('#a9d3d8')];   // 天顶：夜 → 晨 → 昼
var SKY_B=[hex('#47456a'),hex('#f0a35e'),hex('#fbe9bd')];   // 地平线
function key3(k,p){return p<.55?mix(k[0],k[1],p/.55):mix(k[1],k[2],(p-.55)/.45);}

var rng=mulberry(7),i_;
var STARS=[],FLIES=[],TUFTS=[],CROPS=[];
for(i_=0;i_<36;i_++)STARS.push({x:Math.floor(rng()*W),y:Math.floor(rng()*48),ph:rng()*6.28});
for(i_=0;i_<16;i_++)FLIES.push({x:8+rng()*140,y:100+rng()*34,a:.5+rng(),b:.6+rng(),ph:rng()*6.28});
for(i_=0;i_<32;i_++)TUFTS.push({x:Math.floor(rng()*W),h:3+Math.floor(rng()*3),ph:rng()*6.28});
var SY=[103,110,118,127,137],SH=[4,5,6,7,7];
(function(){for(var r=0;r<5;r++)for(var c=0;c<10;c++)CROPS.push({r:r,c:c,x:6+c*18.4+(rng()-.5)*5,t0:2+r*.22+c*.06,k:(c+r)%3===0,ph:rng()*6.28});})();

function farH(x){return Math.floor(HZ-16-7*Math.sin(x*.05+1.2)-4*Math.sin(x*.13+2.1)-2*Math.sin(x*.31));}
function midH(x){return Math.floor(HZ-3-6*Math.sin(x*.032+.4)-2*Math.sin(x*.1+1));}
function nearH(x){return Math.floor(97+3*Math.sin(x*.04+2));}
function riverX(y){return 158+(y-90)*.42+Math.sin(y*.16)*2.5;}
function riverW(y){return 1.5+(y-90)*.11;}

function drawScene(ctx,t){
  ctx.imageSmoothingEnabled=false;
  var R=function(x,y,w,h){ctx.fillRect(Math.round(x),Math.round(y),w,h);};
  var disc=function(cx,cy,r){for(var dy=-r;dy<=r;dy++){var dx=Math.floor(Math.sqrt(r*r-dy*dy));ctx.fillRect(Math.round(cx-dx),Math.round(cy+dy),dx*2+1,1);}};
  var p=ss(.35,4.8,t),night=1-p,sunK=ss(.6,4.4,t),cam=ss(.2,6.2,t),i,x,y,b,k;
  ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';

  /* 天空：色带 + 抖动过渡 */
  var top=key3(SKY_T,p),bot=key3(SKY_B,p),bands=13,bh=7;
  for(b=0;b<bands;b++){ctx.fillStyle=rgb(mix(top,bot,b/(bands-1)));R(0,b*bh,W,bh);}
  for(b=1;b<bands;b++){ctx.fillStyle=rgb(mix(top,bot,b/(bands-1)));for(x=b%2;x<W;x+=2)R(x,b*bh-1,1,1);}

  /* 太阳与光线（在山后面） */
  var sx=126,sy=Math.round(lerp(HZ+16,40,easeOut(sunK)));
  ctx.fillStyle=rgb(mix(hex('#ff8f52'),hex('#fff3c8'),sunK));disc(sx,sy,8);
  if(sunK>.05){
    ctx.fillStyle=rgb(hex('#ffe3a6'),(.11+.1*Math.sin(sunK*Math.PI)).toFixed(3));
    for(i=0;i<10;i++){var a=i*Math.PI*.2+t*.06;for(var r=13;r<78;r++){var ry=sy+Math.sin(a)*r;if(ry<HZ+4)R(sx+Math.cos(a)*r,ry,1,1);}}
  }

  /* 云 */
  var cc=rgb(mix(hex('#6b7590'),hex('#fffaf0'),p),.9),CL=[[20,22,2.2],[100,13,1.5],[150,32,1.1]];
  ctx.fillStyle=cc;
  for(i=0;i<3;i++){var cx=((CL[i][0]+t*CL[i][2])%(W+50))-25,cy=CL[i][1];R(cx,cy,18,3);R(cx+3,cy-2,11,2);R(cx+6,cy-4,6,2);}

  /* 远山 */
  var fdx=Math.round((cam-.5)*2);
  ctx.fillStyle='#a3b6a2';for(x=0;x<W;x++){y=farH(x-fdx);R(x,y,1,HZ+12-y);}
  ctx.fillStyle='#d9e0cf';for(x=0;x<W;x++){y=farH(x-fdx);R(x,y,1,1);}
  ctx.fillStyle='#eef0e0';for(x=0;x<W;x++){y=farH(x-fdx);if(y<60)R(x,y,1,2);}

  /* 中景丘陵 */
  var mdx=Math.round((cam-.5)*4),mdy=Math.round(cam);
  ctx.fillStyle='#7fa062';for(x=0;x<W;x++){y=midH(x-mdx)+mdy;R(x,y,1,102-y);}
  ctx.fillStyle='#a9c27e';for(x=0;x<W;x++){y=midH(x-mdx)+mdy;R(x,y,1,1);}

  /* 农舍 */
  var hx0=46+mdx,hb=Math.max(midH(46-mdx),midH(62-mdx))+mdy;
  ctx.fillStyle='#7a6653';R(hx0,hb,16,2);
  ctx.fillStyle='#f0e2c6';R(hx0,hb-9,16,9);ctx.fillStyle='#dccaa6';R(hx0+11,hb-9,5,9);
  for(i=0;i<8;i++){var w=4+i*2;ctx.fillStyle='#a4523a';R(hx0+8-w/2,hb-17+i,w,1);ctx.fillStyle='#8c422e';R(hx0+8,hb-17+i,w/2,1);}
  ctx.fillStyle='#7b5a44';R(hx0+11,hb-20,3,6);
  ctx.fillStyle='#6b452a';R(hx0+3,hb-5,3,5);
  ctx.fillStyle='#5a4636';R(hx0+9,hb-8,5,5);
  var winX=hx0+10,winY=hb-7;
  for(k=0;k<5;k++){                              // 炊烟
    var ph=(t*.35+k/5)%1;
    ctx.fillStyle=rgb(mix(hex('#9aa3b5'),hex('#fff6e8'),p),((1-ph)*.6).toFixed(3));
    R(hx0+12+Math.sin(ph*6+k)*2+ph*6,hb-21-ph*22,1+Math.floor(ph*3),1+Math.floor(ph*3));
  }

  /* 风车 */
  var wx=138+mdx,wb=midH(138-mdx)+mdy,hubY=wb-16;
  for(i=0;i<16;i++){var tw=8-Math.floor(i*.28);ctx.fillStyle=i%4<2?'#efe2c6':'#e2d2b0';R(wx-tw/2,wb-i,tw,1);}
  for(i=0;i<3;i++){ctx.fillStyle='#8a5a34';R(wx-1-i,hubY-3+i*1,2+i*2,1);}
  var ang=t*.9;
  for(k=0;k<4;k++){
    var aa=ang+k*Math.PI/2,cs=Math.cos(aa),sn=Math.sin(aa);
    for(var rr=2;rr<=13;rr++){
      ctx.fillStyle='#5a3f2b';R(wx+cs*rr,hubY+sn*rr,1,1);
      if(rr>5){ctx.fillStyle='#efe2c6';R(wx+cs*rr-sn,hubY+sn*rr+cs,1,1);R(wx+cs*rr-sn*2,hubY+sn*rr+cs*2,1,1);}
    }
  }
  ctx.fillStyle='#5a3f2b';R(wx-1,hubY-1,2,2);

  /* 近处草坡 + 田垄 */
  var ndx=Math.round((cam-.5)*8),ndy=Math.round(cam*3);
  ctx.fillStyle='#5f8f4a';for(x=0;x<W;x++){y=nearH(x-ndx)+ndy;R(x,y,1,H-y);}
  ctx.fillStyle='#7fae5a';for(x=0;x<W;x++){y=nearH(x-ndx)+ndy;R(x,y,1,1);}
  for(i=0;i<5;i++){var sy2=SY[i]+ndy;ctx.fillStyle='#7b5233';R(0,sy2,W,SH[i]);ctx.fillStyle='#95693f';R(0,sy2,W,1);ctx.fillStyle='#5e3e26';R(0,sy2+SH[i]-1,W,1);}

  /* 小河 */
  for(y=90;y<H;y++){
    var yy=y+ndy,rx=riverX(y)+ndx,rw=riverW(y);
    ctx.fillStyle='#4f8f96';R(rx-rw-1,yy,1,1);R(rx+rw,yy,1,1);
    ctx.fillStyle='#6fb0b4';R(rx-rw,yy,rw*2,1);
  }
  ctx.fillStyle='rgba(255,255,255,.8)';
  for(i=0;i<9;i++){var sy3=92+((i*13+t*6)%50),sp=Math.sin(t*3+i*1.7);if(sp>.3)R(riverX(sy3)+ndx+Math.sin(i*5)*riverW(sy3)*.6,sy3+ndy,1,1);}

  /* 篱笆 */
  var fyb=101+ndy;ctx.fillStyle='#a06e42';R(0,fyb-5,52,1);R(0,fyb-2,52,1);
  ctx.fillStyle='#8a5a34';for(x=2;x<52;x+=8)R(x,fyb-7,2,8);

  /* 大树 */
  var tx=24-Math.round(cam*3),tdy=Math.round(cam*4),sw=Math.round(Math.sin(t*1.1));
  ctx.fillStyle='#6b452a';R(tx-2,84+tdy,4,22);ctx.fillStyle='#553622';R(tx,84+tdy,2,22);
  ctx.fillStyle='#3f7a3a';disc(tx+sw,76+tdy,13);
  ctx.fillStyle='#5c9c46';disc(tx-3+sw,72+tdy,9);
  ctx.fillStyle='#86c25a';R(tx-8+sw,68+tdy,3,2);R(tx-2+sw,66+tdy,4,1);R(tx+4+sw,72+tdy,2,2);
  ctx.fillStyle='#2f6230';R(tx+4+sw,82+tdy,6,2);R(tx-9+sw,80+tdy,5,2);
  if(t>3.4){ctx.fillStyle='#d4523f';R(tx+5+sw,79+tdy,2,2);R(tx-7+sw,76+tdy,2,2);R(tx+sw,84+tdy,2,2);}

  /* 作物：先后冒芽 */
  for(i=0;i<CROPS.length;i++){
    var c=CROPS[i],g=ss(c.t0,c.t0+.9,t);if(g<=0)continue;
    var cxp=Math.round(c.x+ndx+Math.sin(t*1.3+c.ph)*.6),cyp=SY[c.r]+ndy+1;
    if(cxp>riverX(SY[c.r])+ndx-riverW(SY[c.r])-4)continue;
    var wd=c.r>2?2:1,h=Math.round(g*(2+c.r*1.7));
    ctx.fillStyle='#4a8a3a';R(cxp,cyp-h,wd,h);
    if(g>.5){var lw=1+Math.floor(c.r/2);ctx.fillStyle='#6fae4d';R(cxp-lw,cyp-Math.round(h*.6),lw,1);R(cxp+wd,cyp-Math.round(h*.45),lw,1);}
    if(g>.92){ctx.fillStyle=c.k?'#d4523f':'#f1c84b';R(cxp-(wd-1),cyp-h-1,wd+1,2);}
  }

  /* 蝴蝶（和主页那只呼应） */
  if(t>2.4){
    var ba=ss(2.4,3.1,t),bx=Math.round(70+Math.sin(t*.45)*50+Math.sin(t*1.7)*3),by=Math.round(96+Math.cos(t*.7)*10+Math.sin(t*2.3)*2);
    var ww=1+Math.round(Math.abs(Math.sin(t*14))*2);
    ctx.globalAlpha=ba;
    ctx.fillStyle='#e6b267';R(bx-ww,by-1,ww,2);R(bx+1,by-1,ww,2);
    ctx.fillStyle='#c18b4a';R(bx-ww,by+1,ww,1);R(bx+1,by+1,ww,1);
    ctx.fillStyle='#4f3c2b';R(bx,by-1,1,3);
    ctx.globalAlpha=1;
  }
  /* 飞鸟 */
  if(t>3.2){
    ctx.globalAlpha=ss(3.2,3.8,t);ctx.fillStyle='#3a2f2a';
    for(i=0;i<4;i++){
      var bx2=((t*9+i*46)%(W+30))-15,by2=26+i*8+Math.sin(t*2+i)*3,f=Math.floor(t*6+i)%2;
      var pat=f?[[0,2],[1,1],[2,1],[3,1],[4,2]]:[[0,0],[1,1],[2,1],[3,1],[4,0]];
      for(k=0;k<5;k++)R(bx2+pat[k][0],by2+pat[k][1],1,1);
    }
    ctx.globalAlpha=1;
  }
  /* 前景草丛 */
  var gdy=Math.round(cam*6);
  for(i=0;i<TUFTS.length;i++){
    var tf=TUFTS[i];ctx.fillStyle=i%2?'#3f6b3a':'#2f5530';
    R(tf.x,H-tf.h+gdy,1,tf.h);R(tf.x+(Math.sin(t*1.5+tf.ph)>0?1:0),H-tf.h+gdy-1,1,1);
  }
  if(p>.7){ctx.globalAlpha=ss(.7,1,p);ctx.fillStyle='#fff6e0';for(i=0;i<8;i++)R(6+i*24+(i%3)*5,H-3+gdy,1,1);ctx.fillStyle='#f0a0b4';for(i=0;i<5;i++)R(15+i*37,H-4+gdy,1,1);ctx.globalAlpha=1;}

  /* 夜色 / 晨光叠层 */
  var nA=.58*Math.pow(night,1.15);
  if(nA>.005){ctx.fillStyle='rgba(16,26,58,'+nA.toFixed(3)+')';ctx.fillRect(0,0,W,H);}
  var dA=.2*Math.sin(p*Math.PI);
  if(dA>.005){ctx.fillStyle='rgba(255,140,80,'+dA.toFixed(3)+')';ctx.fillRect(0,0,W,H);}

  /* 叠层之后：星、月、灯、萤火（夜里才亮） */
  if(night>.02){
    for(i=0;i<STARS.length;i++){var st=STARS[i];ctx.fillStyle='rgba(255,248,224,'+(Math.pow(night,1.5)*(.5+.5*Math.sin(t*2+st.ph))).toFixed(3)+')';R(st.x,st.y,1,1);}
    ctx.fillStyle='rgba(244,236,208,'+(night*night).toFixed(3)+')';disc(30,22,5);
    for(i=0;i<FLIES.length;i++){
      var fl=FLIES[i],fa=night*(.25+.75*Math.max(0,Math.sin(t*2.2+fl.ph))),fx=fl.x+Math.sin(t*.6*fl.a+fl.ph)*5,fy=fl.y+Math.sin(t*.5*fl.b+fl.ph)*3;
      ctx.fillStyle='rgba(255,227,138,'+(fa*.25).toFixed(3)+')';R(fx-1,fy-1,3,3);
      ctx.fillStyle='rgba(255,227,138,'+fa.toFixed(3)+')';R(fx,fy,1,1);
    }
  }
  var lit=1-ss(.35,.7,p);
  ctx.fillStyle=rgb(mix(hex('#8fb6c8'),hex('#ffd27a'),lit));R(winX,winY,3,3);
  if(lit>.02){ctx.fillStyle='rgba(255,210,122,'+(.22*lit).toFixed(3)+')';disc(winX+1,winY+1,4);}

  /* 太阳光晕：像素同心圈，用加色叠在整个画面上 */
  var hk=.55*ss(.5,3.4,t)*(1-.35*ss(3.4,6,t));
  if(hk>.01){
    ctx.globalCompositeOperation='lighter';
    var HR=[34,26,19,13],HA=[.05,.06,.08,.1];
    for(i=0;i<4;i++){ctx.fillStyle='rgba(255,190,110,'+(HA[i]*hk*1.8).toFixed(3)+')';disc(sx,sy,HR[i]);}
    ctx.globalCompositeOperation='source-over';
  }
}

/* ===== 开屏控制：保留附件的日出时间线，补齐焦点、降级与手机尺寸 ===== */
window.YardScene={draw:drawScene};
var FINAL=9;
function contextFor(canvas){try{return canvas&&canvas.getContext('2d');}catch(e){return null;}}
var heroCanvas=document.getElementById('postcardScene'),heroContext=contextFor(heroCanvas);
function paintPostcard(t){
  if(!heroContext)return;
  try{
    drawScene(heroContext,t);
    heroCanvas.hidden=false;
    var fallback=document.querySelector('.postcard-fallback');
    if(fallback)fallback.hidden=true;
  }catch(e){heroContext=null;}
}
paintPostcard(FINAL);

// Let the existing postcard breathe after the opening, without replaying sunrise.
// A bounded 12fps loop sleeps when offscreen, hidden, or reduced motion is set.
(function postcardLife(){
  if(!heroContext)return;
  var preference=window.matchMedia('(prefers-reduced-motion: reduce)');
  var inView=false,handle=0,last=0,phase=FINAL,manualPause=false;
  var control=document.createElement('button');control.type='button';control.className='postcard-motion';
  control.textContent='暂停画面动态';control.setAttribute('aria-label','暂停主页装饰动态');control.setAttribute('aria-pressed','false');
  heroCanvas.closest('.postcard').appendChild(control);
  control.addEventListener('click',function(){manualPause=!manualPause;sync();});
  function visible(){var op=document.getElementById('opening');return inView&&!document.hidden&&!preference.matches&&!manualPause&&(!op||op.hidden);}
  function frame(now){
    handle=0;
    if(!visible()||!heroContext){last=0;return;}
    if(!last||now-last>=1000/12){
      if(last)phase+=Math.min(.15,(now-last)/1000)*.38;
      last=now;paintPostcard(phase);
    }
    handle=requestAnimationFrame(frame);
  }
  function sync(){
    var paused=manualPause||preference.matches;
    document.documentElement.dataset.ambience=paused?'paused':'playing';
    document.documentElement.toggleAttribute('data-page-hidden',document.hidden);
    control.hidden=preference.matches;
    control.textContent=manualPause?'播放画面动态':'暂停画面动态';
    control.setAttribute('aria-label',manualPause?'播放主页装饰动态':'暂停主页装饰动态');
    control.setAttribute('aria-pressed',String(manualPause));
    if(visible()){if(!handle){last=0;handle=requestAnimationFrame(frame);}}
    else{cancelAnimationFrame(handle);handle=0;last=0;if(preference.matches)paintPostcard(FINAL);}
  }
  if('IntersectionObserver' in window){
    var observer=new IntersectionObserver(function(entries){inView=entries[0].isIntersecting;sync();},{threshold:.01});observer.observe(heroCanvas);
  }else{inView=true;}
  var op=document.getElementById('opening');
  if(op)new MutationObserver(sync).observe(op,{attributes:true,attributeFilter:['hidden']});
  preference.addEventListener('change',sync);document.addEventListener('visibilitychange',sync);
  window.addEventListener('pagehide',function(){cancelAnimationFrame(handle);handle=0;last=0;});
  window.addEventListener('pageshow',sync);sync();
})();

var root=document.getElementById('opening');
if(!root)return;
var motion=window.matchMedia('(prefers-reduced-motion: reduce)');
var cv=root.querySelector('.op-canvas'),ctx=contextFor(cv);
var fallback=root.querySelector('.op-fallback');
var card=root.querySelector('.op-card'),bg=root.querySelector('.op-bg'),grain=root.querySelector('.op-grain');
var stage=root.querySelector('.op-stage'),heading=root.querySelector('.op-title'),foot=root.querySelector('.op-foot');
var enterBtn=root.querySelector('.op-enter'),skipBtn=root.querySelector('.op-skip');
var title=root.querySelector('[data-split]');
var targetSel=root.getAttribute('data-target')||'.postcard';
var page=document.querySelector(root.getAttribute('data-page')||'.site');
var remember=root.getAttribute('data-remember')==='session';
var KEY='backyard-opening-day-v1';
var state='idle',raf=0,elapsed=0,last=0,lastPaint=0,generation=0,exitTimer=0;
var html=document.documentElement,returnFocus=null,landing=null,animations=[];
var BG0=hex('#c9c6bb'),BG1=hex('#efe5d5');
var STEPS=[[.15,'is-open'],[1.35,'is-opened'],[1.5,'is-title'],[3.3,'is-stamp'],[4.4,'is-ready']];

/* 逐字揭开标题，保留附件的字间延迟。 */
var text=title.textContent;
title.textContent='';
Array.from(text).forEach(function(c,i){
  var mask=document.createElement('span');mask.className='mask';
  var ch=document.createElement('span');ch.className='ch';ch.textContent=c;
  ch.style.setProperty('--i',i);mask.appendChild(ch);title.appendChild(mask);
});
function active(){return state==='playing'||state==='ready';}
function seen(){
  if(location.hash)return true;
  try{return remember&&sessionStorage.getItem(KEY)==='1';}catch(e){return false;}
}
function markSeen(){try{if(remember)sessionStorage.setItem(KEY,'1');}catch(e){}}
function focus(element){if(element)try{element.focus({preventScroll:true});}catch(e){element.focus();}}
function lock(on){html.classList.toggle('op-lock',on);if(page)page.inert=on;}
function sceneFallback(){cv.hidden=true;if(fallback)fallback.hidden=false;}
if(!ctx)sceneFallback();

/* 同时按宽度和可见高度计算。矮横屏改为文案与画面并排。 */
function layout(){
  var vw=window.innerWidth,vh=window.visualViewport?window.visualViewport.height:window.innerHeight;
  var landscape=vw>=480&&vh<=500;
  root.classList.toggle('is-compact',landscape);
  var css=getComputedStyle(stage),horizontal=parseFloat(css.paddingLeft)+parseFloat(css.paddingRight);
  var vertical=parseFloat(css.paddingTop)+parseFloat(css.paddingBottom);
  var available=Math.max(64,Math.min(vw-horizontal-16,940)-28);
  if(landscape)available=Math.min(available,vw*.46-28);
  var w=available;
  for(var pass=0;pass<2;pass++){
    root.style.setProperty('--w',(w+28)+'px');
    var reserved=vertical+28;
    if(!landscape){
      reserved+=heading.getBoundingClientRect().height+parseFloat(getComputedStyle(heading).marginBottom);
      reserved+=foot.getBoundingClientRect().height+parseFloat(getComputedStyle(foot).marginTop);
    }
    var limit=Math.max(64,Math.min(available,(vh-reserved)*4/3));
    // 常规尺寸使用半档像素倍率；窄屏与矮屏用完整可用空间。
    var stepped=Math.floor(limit/96)*96;
    w=vw>=380&&stepped>=192&&limit-stepped<72?stepped:Math.floor(limit/4)*4;
  }
  root.style.setProperty('--w',(w+28)+'px');
  cv.style.width=w+'px';cv.style.height=(w*3/4)+'px';
  if(fallback){fallback.style.width=w+'px';fallback.style.height=(w*3/4)+'px';}
}
function paint(t){
  var p=ss(.35,4.8,t);
  root.style.setProperty('--p',p.toFixed(3));
  root.style.setProperty('--bg',rgb(mix(BG0,BG1,p)));
  cv.style.transform='scale('+(1+.1*ss(.2,6.2,t)).toFixed(4)+')';
}
function flags(t){
  STEPS.forEach(function(step){
    if(t>=step[0]&&!root.classList.contains(step[1])){
      root.classList.add(step[1]);
      if(step[1]==='is-ready'){state='ready';focus(enterBtn);}
    }
  });
}
function render(t){
  if(ctx)try{drawScene(ctx,t);}catch(e){ctx=null;sceneFallback();t=FINAL;}
  paint(t);flags(t);
}
function tick(now){
  if(!active()||document.hidden){raf=0;return;}
  if(last)elapsed+=(now-last)/1000;
  last=now;
  if(now-lastPaint>=1000/30){lastPaint=now;render(elapsed);}
  if(ctx)raf=requestAnimationFrame(tick);
}
function cancelAnimations(){
  animations.forEach(function(a){a.cancel();});animations=[];
  if(root.getAnimations)root.getAnimations({subtree:true}).forEach(function(a){a.cancel();});
}
function finish(restore){
  if(state==='done'||state==='idle')return;
  generation++;clearTimeout(exitTimer);cancelAnimationFrame(raf);raf=0;
  root.hidden=true;root.setAttribute('aria-hidden','true');state='done';lock(false);
  if(landing)landing.style.visibility='';landing=null;
  cancelAnimations();markSeen();
  if(restore!==false)focus(returnFocus);
  document.dispatchEvent(new CustomEvent('opening:done'));
}
function start(){
  if(state==='leaving')finish(false);
  generation++;clearTimeout(exitTimer);cancelAnimationFrame(raf);cancelAnimations();
  ['is-open','is-opened','is-title','is-stamp','is-ready','is-leaving'].forEach(function(c){root.classList.remove(c);});
  returnFocus=document.activeElement&&document.activeElement.matches('[data-opening-replay],#replayOpening')?document.activeElement:document.querySelector('.mark');
  if(landing)landing.style.visibility='';landing=null;card.style.transformOrigin='';
  root.hidden=false;root.setAttribute('aria-hidden','false');state='playing';
  elapsed=0;last=0;lastPaint=0;paint(0);
  window.scrollTo({top:0,left:0,behavior:'instant'});lock(true);layout();focus(skipBtn);
  if(motion.matches||!ctx){elapsed=FINAL;render(FINAL);layout();return;}
  raf=requestAnimationFrame(tick);
}
function animate(element,frames,options){var a=element.animate(frames,options);animations.push(a);return a.finished;}
function leave(mode){
  if(!active())return;
  state='leaving';cancelAnimationFrame(raf);raf=0;
  root.classList.add('is-leaving');
  var token=generation,tg=document.querySelector(targetSel);
  var tr=tg&&tg.getBoundingClientRect(),fr=card.getBoundingClientRect();
  var fly=mode==='fly'&&!motion.matches&&tr&&tr.width>60&&tr.top>=0&&tr.bottom<=window.innerHeight;
  paintPostcard(fly?elapsed:FINAL);
  if(motion.matches||!root.animate){finish();return;}
  var complete=function(){if(token===generation&&state==='leaving')finish();};
  exitTimer=setTimeout(complete,2400);
  try{
    if(fly){
      landing=tg;tg.style.visibility='hidden';card.style.transformOrigin='0 0';
      var dx=tr.left-fr.left,dy=tr.top-fr.top,s=tr.width/fr.width;
      var travel=animate(card,[{transform:'none'},{transform:'translate('+dx+'px,'+dy+'px) scale('+s+')'}],{duration:1150,easing:'cubic-bezier(.7,0,.16,1)',fill:'forwards'});
      var fade={duration:750,delay:350,easing:'ease-out',fill:'forwards'};
      animate(bg,[{opacity:1},{opacity:0}],fade).catch(function(){});
      animate(grain,[{opacity:.12},{opacity:0}],fade).catch(function(){});
      travel.then(function(){
        if(token!==generation||state!=='leaving')return;
        tg.style.visibility='';
        return animate(card,[{opacity:1},{opacity:0}],{duration:450,fill:'forwards'});
      }).then(complete,complete);
    }else{
      animate(root,[{opacity:1},{opacity:0}],{duration:520,fill:'forwards'}).then(complete,complete);
    }
  }catch(e){complete();}
}
function replay(){start();}
skipBtn.addEventListener('click',function(){leave('fade');});
enterBtn.addEventListener('click',function(){leave('fly');});
card.addEventListener('click',function(){if(state==='ready')leave('fly');});
root.addEventListener('wheel',function(e){if(state==='ready'&&e.deltaY>20)leave('fly');},{passive:true});
var touchY=null;
root.addEventListener('touchstart',function(e){if(e.touches.length===1)touchY=e.touches[0].clientY;},{passive:true});
root.addEventListener('touchend',function(e){if(state==='ready'&&touchY!==null&&e.changedTouches.length&&touchY-e.changedTouches[0].clientY>50)leave('fly');touchY=null;},{passive:true});
root.addEventListener('touchcancel',function(){touchY=null;},{passive:true});
document.addEventListener('keydown',function(e){
  if(!active()&&state!=='leaving')return;
  if(e.key==='Tab'){
    var controls=[skipBtn,enterBtn].filter(function(b){return getComputedStyle(b).visibility!=='hidden';});
    var first=controls[0],lastControl=controls[controls.length-1];
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();focus(lastControl);}
    else if(!e.shiftKey&&document.activeElement===lastControl){e.preventDefault();focus(first);}
  }
  if(!active())return;
  if(e.key==='Escape'){e.preventDefault();leave('fade');}
  else if(state==='ready'&&(e.key==='ArrowDown'||e.key==='PageDown'||(e.key==='Enter'&&e.target===root))){e.preventDefault();leave('fly');}
});
document.querySelectorAll('[data-opening-replay],#replayOpening').forEach(function(b){b.hidden=false;b.addEventListener('click',replay);});
function resize(){if(state==='leaving')finish();else if(active())layout();}
window.addEventListener('resize',resize);
if(window.visualViewport)window.visualViewport.addEventListener('resize',resize);
motion.addEventListener('change',function(e){if(e.matches&&(active()||state==='leaving'))finish();});
document.addEventListener('visibilitychange',function(){
  cancelAnimationFrame(raf);raf=0;last=0;
  if(document.hidden&&state==='leaving')finish(false);
  else if(!document.hidden&&active()&&!motion.matches&&ctx)raf=requestAnimationFrame(tick);
});
window.addEventListener('pagehide',function(){finish(false);});
window.YardOpening={replay:replay,skip:function(){leave('fade');}};
if(!seen())start();
if(document.fonts)document.fonts.ready.then(function(){if(active())layout();});
})();
