/* Original homecoming opening; scene resources are only loaded while needed. */
(function(){
  'use strict';
  const $=id=>document.getElementById(id),opening=$('opening'),site=document.querySelector('.site'),html=document.documentElement;
  const skip=$('openingSkip'),replay=$('replayOpening'),enter=$('openingEnter'),invite=$('openingInvitation'),canvas=$('openingValley'),caption=$('openingCaption');
  const stops=[...opening.querySelectorAll('[data-opening-stop]')],motion=matchMedia('(prefers-reduced-motion: reduce)'),key='lj-opening-v4-seen';
  const times=[0,2.8,6.6],lines=['星光落在河谷。','田野静下来，灯火醒过来。','每条小路，都通往自己的生活。'],revealAt=8.1,endAt=9.7;
  let running=false,raf=0,watchdog=0,captionTimer=0,elapsed=0,last=0,lastDraw=0,current=-1,scene=null,loading=null,run=0;
  let pointer={x:0,y:0},savedFocus=null;
  opening.inert=true;
  function loadScene(){
    if(!loading)loading=new Promise(resolve=>{const script=document.createElement('script');script.src='assets/js/opening-scene.js';script.onload=resolve;script.onerror=resolve;document.head.append(script);});
    return loading;
  }
  function select(index){
    if(index===current)return;current=index;clearTimeout(captionTimer);
    stops.forEach((b,i)=>{if(i===index)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');});
    if(elapsed<.2){caption.textContent=lines[index];caption.classList.remove('changing');}
    else{caption.classList.add('changing');captionTimer=setTimeout(()=>{caption.textContent=lines[index];caption.classList.remove('changing');},220);}
    const atGate=index===2;opening.classList.toggle('at-gate',atGate);invite.inert=!atGate;invite.setAttribute('aria-hidden',String(!atGate));
    if(!atGate&&document.activeElement===enter)skip.focus({preventScroll:true});
  }
  function close(){
    if(!running)return;running=false;run++;cancelAnimationFrame(raf);clearTimeout(watchdog);clearTimeout(captionTimer);
    const focused=opening.contains(document.activeElement);
    opening.classList.remove('is-active','is-arrived','at-gate','is-revealing','has-scene');opening.setAttribute('aria-hidden','true');opening.inert=true;
    site.inert=false;html.classList.remove('opening-lock');scene?.dispose();scene=null;pointer={x:0,y:0};
    try{sessionStorage.setItem(key,'1');}catch(_){}
    if(focused)(savedFocus?.isConnected?savedFocus:document.querySelector('.mark')).focus({preventScroll:true});
  }
  function frame(now){
    if(!running)return;if(motion.matches){close();return;}
    const dt=last?Math.min(.25,Math.max(0,(now-last)/1000)):0;last=now;if(!document.hidden)elapsed+=dt;
    let index=0;for(let i=1;i<times.length;i++)if(elapsed>=times[i])index=i;select(index);
    opening.classList.toggle('is-arrived',elapsed>=.55);opening.style.setProperty('--walk',Math.min(100,elapsed/endAt*100)+'%');
    if(scene&&!document.hidden&&now-lastDraw>=1000/30){lastDraw=now;try{scene.draw(elapsed,pointer);}catch(_){scene.dispose();scene=null;opening.classList.remove('has-scene');}}
    if(elapsed>=revealAt)opening.classList.add('is-revealing');if(elapsed>=endAt){close();return;}
    raf=requestAnimationFrame(frame);
  }
  function play(){
    if(running||motion.matches)return;running=true;const id=++run;elapsed=0;last=0;lastDraw=0;current=-1;savedFocus=document.activeElement===document.body?null:document.activeElement;
    opening.classList.remove('is-arrived','at-gate','is-revealing','has-scene');opening.classList.add('is-active');opening.setAttribute('aria-hidden','false');opening.inert=false;
    opening.style.setProperty('--walk','0%');select(0);site.inert=true;html.classList.add('opening-lock');skip.focus({preventScroll:true});
    raf=requestAnimationFrame(frame);watchdog=setTimeout(close,17000);
    loadScene().then(()=>{if(!running||run!==id||!window.BackyardOpeningScene)return;try{scene=BackyardOpeningScene.create(canvas);if(scene){scene.draw(elapsed,pointer);last=performance.now();opening.classList.add('has-scene');}}catch(_){scene?.dispose();scene=null;}});
  }
  function jump(index){if(!running)return;elapsed=index===0?1.5:times[index]+.1;last=0;opening.classList.remove('is-revealing');select(index);clearTimeout(watchdog);watchdog=setTimeout(close,(endAt-elapsed+4)*1000);}
  function enterHome(){if(!running)return;elapsed=revealAt;last=0;opening.classList.add('is-revealing');skip.focus({preventScroll:true});}
  skip.onclick=close;enter.onclick=enterHome;replay.onclick=play;stops.forEach(b=>b.onclick=()=>jump(+b.dataset.openingStop));
  opening.addEventListener('pointermove',e=>{if(e.pointerType==='mouse')pointer={x:e.clientX/innerWidth*2-1,y:e.clientY/innerHeight*2-1};});
  opening.addEventListener('pointerleave',()=>pointer={x:0,y:0});
  opening.addEventListener('keydown',e=>{
    if(e.key==='Escape'){e.preventDefault();close();return;}
    if(['ArrowRight','ArrowLeft'].includes(e.key)){e.preventDefault();jump(Math.max(0,Math.min(2,current+(e.key==='ArrowRight'?1:-1))));return;}
    if(e.key==='Tab'){const controls=[...opening.querySelectorAll('button')].filter(b=>!b.closest('[inert]')&&getComputedStyle(b).visibility==='visible'),first=controls[0],last=controls.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}
  });
  motion.addEventListener('change',e=>{if(e.matches)close();});addEventListener('resize',()=>scene?.resize());addEventListener('pagehide',close);
  document.addEventListener('visibilitychange',()=>{last=0;if(!running)return;clearTimeout(watchdog);if(!document.hidden)watchdog=setTimeout(close,Math.max(2000,(endAt-elapsed+4)*1000));});
  let seen=false;try{seen=sessionStorage.getItem(key)==='1';}catch(_){}if(!seen&&!location.hash)play();
})();
