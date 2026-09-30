const $=id=>document.getElementById(id);const root=document.documentElement;const KEY='lj-capture-v1';
function setTheme(t){const v=t==='dark'?'dark':'light';root.dataset.theme=v;$('themeBtn').textContent=v==='dark'?'日间模式':'夜间模式';try{localStorage.setItem('lj-theme',v)}catch(e){}}
let storedTheme='light';try{storedTheme=localStorage.getItem('lj-theme')||'light'}catch(e){}setTheme(storedTheme);
$('themeBtn').addEventListener('click',()=>setTheme(root.dataset.theme==='dark'?'light':'dark'));
let caps=[];try{const v=JSON.parse(localStorage.getItem(KEY));if(Array.isArray(v))caps=v.filter(x=>x&&typeof x.text==='string')}catch(e){}
function save(){try{localStorage.setItem(KEY,JSON.stringify(caps))}catch(e){}render()}
function render(){const list=$('capList');list.replaceChildren();if(!caps.length){const p=document.createElement('li');p.className='empty';p.textContent='还没有随手记。第一句，从这里开始。';list.append(p);return}
 caps.slice(0,10).forEach((c)=>{const li=document.createElement('li'),time=document.createElement('span'),text=document.createElement('button'),del=document.createElement('button');time.className='time';time.textContent=typeof c.t==='string'?c.t:'';text.type='button';text.className='text'+(c.done?' done':'');text.textContent=c.text;text.setAttribute('aria-label',(c.done?'标记未完成：':'标记完成：')+c.text);text.addEventListener('click',()=>{c.done=!c.done;save()});del.type='button';del.className='delete';del.textContent='×';del.setAttribute('aria-label','删除：'+c.text);del.addEventListener('click',()=>{caps.splice(caps.indexOf(c),1);save()});li.append(time,text,del);list.append(li)})}
$('noteForm').addEventListener('submit',e=>{e.preventDefault();const inp=$('capIn'),v=inp.value.trim();if(!v)return;const n=new Date();caps.unshift({text:v,t:String(n.getHours()).padStart(2,'0')+':'+String(n.getMinutes()).padStart(2,'0'),done:false});inp.value='';save();inp.focus()});render();
// 只在预览图内跟随鼠标，装饰效果不改变站点内容与本地存档。
const postcard=document.querySelector('.postcard');
postcard.addEventListener('pointermove',e=>{if(e.pointerType!=='mouse')return;const r=postcard.getBoundingClientRect();postcard.style.setProperty('--glow-x',e.clientX-r.left+'px');postcard.style.setProperty('--glow-y',e.clientY-r.top+'px')});
// 首访夜游；锚点和减少动态效果直达首页，回看入口可随时重播。
(()=>{const opening=$('opening'),screen=$('openingScreen'),skip=$('openingSkip'),replay=$('replayOpening'),site=document.querySelector('.site');
 const chapters=[...opening.querySelectorAll('.opening-chapter')],dots=[...opening.querySelectorAll('.opening-index span')];
 const motion=matchMedia('(prefers-reduced-motion: reduce)'),key='lj-opening-v2-seen',times=[0,1100,2300,3500,4700],revealAt=5800,revealFor=1000;
 let running=false,raf=0,watchdog=0,started=0,current=-1;
 const remember=()=>{try{sessionStorage.setItem(key,'1')}catch(e){}};
 const close=()=>{if(!running)return;running=false;cancelAnimationFrame(raf);clearTimeout(watchdog);const focused=opening.contains(document.activeElement);opening.classList.remove('is-active','is-journey','is-revealing');opening.setAttribute('aria-hidden','true');screen.style.setProperty('--hole','0px');site.inert=false;root.classList.remove('opening-lock');remember();window.removeEventListener('keydown',onKey);motion.removeEventListener('change',onMotionChange);if(focused)document.querySelector('.mark').focus()};
 function onKey(e){if(e.key==='Escape'){e.preventDefault();close()}}
 function onMotionChange(e){if(e.matches)close()}
 function frame(now){if(!running)return;if(!started)started=now;const t=now-started;
  let next=0;for(let i=1;i<times.length;i++)if(t>=times[i])next=i;
  if(next!==current){current=next;chapters.forEach((part,i)=>part.classList.toggle('is-visible',i===next));dots.forEach((dot,i)=>dot.classList.toggle('is-current',i===next));if(next)opening.classList.add('is-journey')}
  opening.querySelector('.opening-progress').style.setProperty('--walk',Math.min(100,t/(revealAt+revealFor)*100)+'%');
  if(t>=revealAt){opening.classList.add('is-revealing');const p=Math.min(1,(t-revealAt)/revealFor),ease=1-Math.pow(1-p,3);screen.style.setProperty('--hole',Math.ceil(ease*Math.hypot(innerWidth,innerHeight))+'px');if(p===1){close();return}}
  raf=requestAnimationFrame(frame)}
 function play(){if(running||motion.matches)return;running=true;started=0;current=-1;screen.style.setProperty('--hole','0px');opening.querySelector('.opening-progress').style.setProperty('--walk','0%');opening.classList.remove('is-revealing','is-journey');chapters.forEach((part,i)=>part.classList.toggle('is-visible',i===0));dots.forEach((dot,i)=>dot.classList.toggle('is-current',i===0));site.inert=true;root.classList.add('opening-lock');opening.classList.add('is-active');opening.setAttribute('aria-hidden','false');skip.focus();window.addEventListener('keydown',onKey);motion.addEventListener('change',onMotionChange);raf=requestAnimationFrame(frame);watchdog=setTimeout(close,revealAt+revealFor+1200)}
 let seen=false;try{seen=sessionStorage.getItem(key)==='1'}catch(e){}
 skip.addEventListener('click',close);replay.addEventListener('click',play);
 if(!seen&&!location.hash)play();
 window.addEventListener('pageshow',e=>{if(e.persisted)close()});
})();
