/* The world owns its first frame; a slow or failed script never shows a legacy scene. */
(function () {
  'use strict';
  const body=document.body, shell=document.getElementById('worldBoot');
  function fail() {
    if(body.dataset.worldState==='ready')return;
    body.dataset.worldState='error';body.setAttribute('aria-busy','false');
    document.getElementById('worldBootMessage').textContent='小路暂时没有铺好，请重新进入。';
    document.getElementById('worldRetry').hidden=false;
  }
  window.addEventListener('error',fail,true);
  document.getElementById('worldRetry').onclick=()=>location.reload();
  window.BackyardBoot={ready(){
    body.dataset.worldState='ready';body.setAttribute('aria-busy','false');shell.hidden=true;
    window.removeEventListener('error',fail,true);
  }};
})();
