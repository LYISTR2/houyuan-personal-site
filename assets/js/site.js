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
