/* A short night walk; the homepage stays usable if graphics cannot load. */
(function(){
  'use strict';
  const opening=document.getElementById('opening'),site=document.querySelector('.site'),html=document.documentElement;
  const skip=document.getElementById('openingSkip'),replay=document.getElementById('replayOpening'),enter=document.getElementById('openingEnter');
  const veil=document.getElementById('openingVeil'),canvas=document.getElementById('openingGarden');
  const chapters=[...opening.querySelectorAll('.opening-chapter')],stops=[...opening.querySelectorAll('[data-opening-stop]')];
  const motion=matchMedia('(prefers-reduced-motion: reduce)'),key='lj-opening-v3-seen';
  const times=[0,4.4,6.8,9.2,11.6],revealAt=14.2,endAt=15.3;
  const clamp=n=>Math.min(1,Math.max(0,n)),ease=n=>n*n*(3-2*n);
  let running=false,raf=0,watchdog=0,elapsed=0,last=0,lastRender=0,current=-1,garden=null,loadPromise=null,run=0;
  let pointer={x:0,y:0},savedFocus=null;
  opening.inert=true;
  opening.querySelectorAll('[data-split]').forEach(line=>{
    [...line.textContent].forEach((ch,i)=>{const mask=document.createElement('span'),letter=document.createElement('span');mask.className='opening-mask';letter.className='opening-char';letter.style.setProperty('--char',i);letter.textContent=ch;mask.append(letter);if(i===0)line.textContent='';line.append(mask);});
  });
  function loadScript(src){return new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=src;script.onload=resolve;script.onerror=()=>reject(new Error('Opening graphics unavailable'));document.head.append(script);});}
  function loadGarden(){
    if(!loadPromise)loadPromise=loadScript('assets/vendor/three.min.js').then(()=>loadScript('assets/js/opening-scene.js')).catch(()=>null);
    return loadPromise;
  }
  function select(index){
    if(index===current)return;current=index;
    chapters.forEach((chapter,i)=>{const visible=i===index;chapter.classList.toggle('is-visible',visible);chapter.inert=!visible;chapter.setAttribute('aria-hidden',String(!visible));});
    stops.forEach((button,i)=>{if(i===index)button.setAttribute('aria-current','step');else button.removeAttribute('aria-current');});
    if(index!==4&&document.activeElement===enter)skip.focus({preventScroll:true});
  }
  function close(){
    if(!running)return;running=false;run++;cancelAnimationFrame(raf);clearTimeout(watchdog);
    const focused=opening.contains(document.activeElement);
    opening.classList.remove('is-active','is-journey','is-arrived','is-revealing','has-garden');opening.setAttribute('aria-hidden','true');opening.inert=true;
    site.inert=false;html.classList.remove('opening-lock');
    garden?.dispose();garden=null;pointer={x:0,y:0};
    try{sessionStorage.setItem(key,'1');}catch(_){}
    if(focused)(savedFocus?.isConnected?savedFocus:document.querySelector('.mark')).focus({preventScroll:true});
  }
  function frame(now){
    if(!running)return;
    if(motion.matches){close();return;}
    const dt=last?Math.min(.25,Math.max(0,(now-last)/1000)):0;last=now;
    if(!document.hidden)elapsed+=dt;
    const progress=ease(clamp((elapsed-3.2)/9.2));
    let index=0;for(let i=1;i<times.length;i++)if(elapsed>=times[i])index=i;select(index);
    opening.classList.toggle('is-arrived',elapsed>=1.25);opening.classList.toggle('is-journey',elapsed>=times[1]);
    veil.style.setProperty('--iris',(ease(clamp(elapsed/3.2))*140)+'vmax');
    opening.querySelector('.opening-progress').style.setProperty('--walk',clamp(elapsed/endAt)*100+'%');
    if(garden&&!document.hidden&&now-lastRender>=1000/30){lastRender=now;try{opening.style.setProperty('--halo',garden.draw(elapsed,progress,pointer));}catch(_){garden.dispose();garden=null;opening.classList.remove('has-garden');}}
    if(elapsed>=revealAt)opening.classList.add('is-revealing');
    if(elapsed>=endAt){close();return;}
    raf=requestAnimationFrame(frame);
  }
  function play(){
    if(running||motion.matches)return;
    running=true;const id=++run;elapsed=0;last=0;lastRender=0;current=-1;savedFocus=document.activeElement===document.body?null:document.activeElement;
    opening.classList.remove('is-arrived','is-journey','is-revealing','has-garden');opening.classList.add('is-active');opening.setAttribute('aria-hidden','false');opening.inert=false;
    veil.style.setProperty('--iris','0vmax');opening.querySelector('.opening-progress').style.setProperty('--walk','0%');select(0);
    site.inert=true;html.classList.add('opening-lock');skip.focus({preventScroll:true});
    raf=requestAnimationFrame(frame);watchdog=setTimeout(close,26000);
    loadGarden().then(()=>{if(!running||run!==id||!window.OpeningGarden)return;try{garden=OpeningGarden.create(canvas);if(garden){garden.draw(elapsed,ease(clamp((elapsed-3.2)/9.2)),pointer);last=performance.now();opening.classList.add('has-garden');}}catch(_){garden?.dispose();garden=null;}});
  }
  function jump(index){if(!running)return;elapsed=index===0?2.5:times[index]+.1;last=0;opening.classList.remove('is-revealing');select(index);clearTimeout(watchdog);watchdog=setTimeout(close,(endAt-elapsed+6)*1000);}
  skip.addEventListener('click',close);enter.addEventListener('click',close);replay.addEventListener('click',play);
  stops.forEach(button=>button.addEventListener('click',()=>jump(+button.dataset.openingStop)));
  opening.addEventListener('pointermove',e=>{if(e.pointerType==='mouse')pointer={x:e.clientX/innerWidth*2-1,y:e.clientY/innerHeight*2-1};});
  opening.addEventListener('pointerleave',()=>pointer={x:0,y:0});
  opening.addEventListener('keydown',e=>{
    if(e.key==='Escape'){e.preventDefault();close();return;}
    if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();jump(Math.min(4,Math.max(0,current+(e.key==='ArrowRight'?1:-1))));return;}
    if(e.key==='Tab'){const buttons=[...opening.querySelectorAll('button')].filter(b=>!b.closest('[inert]')),first=buttons[0],last=buttons.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}
  });
  motion.addEventListener('change',e=>{if(e.matches)close();});
  addEventListener('resize',()=>garden?.resize());addEventListener('pagehide',close);
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();garden?.dispose();garden=null;opening.classList.remove('has-garden');});
  document.addEventListener('visibilitychange',()=>{last=0;if(!running)return;clearTimeout(watchdog);if(!document.hidden)watchdog=setTimeout(close,Math.max(2000,(endAt-elapsed+6)*1000));});
  let seen=false;try{seen=sessionStorage.getItem(key)==='1';}catch(_){}
  if(!seen&&!location.hash)play();
})();
