/* Decorative scenery only. No inventory, collision, clock, or save writes.
 * Coordinates are world pixels. Small props join the existing y-sorted actors;
 * water is drawn below them, airborne details after the night tint.
 */
(function (root) {
  'use strict';
  const rect = (g,x,y,w,h,c) => {g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),w,h);};
  // Reuse the existing renderer's clock; no additional requestAnimationFrame loop.
  const palette = {wood:'#9c7048',edge:'#674e36',light:'#deb780',green:'#6f944f',cream:'#f2dfae'};
  const sprites = new Map();
  function sprite(kind) {
    if(sprites.has(kind))return sprites.get(kind);
    const c=document.createElement('canvas');c.width=32;c.height=40;
    const g=c.getContext('2d'),p=(x,y,w,h,color)=>rect(g,x,y,w,h,color);
    p(5,34,24,3,'#3e593733');
    if(kind==='barrel'){
      p(8,14,17,20,palette.edge);p(7,17,19,15,palette.wood);p(9,15,14,19,'#b38b58');
      for(let i=0;i<4;i++)p(10+i*4,17,1,16,'#856140');
      p(7,19,19,2,'#707a70');p(7,29,19,2,'#707a70');p(10,13,12,2,palette.light);p(10,15,12,2,'#77573e');
    }else if(kind==='basket'){
      p(6,25,22,10,palette.edge);p(7,24,20,9,'#be985c');p(5,23,24,3,palette.light);
      for(let i=0;i<5;i++)p(8+i*4,26,1,7,'#936b43');p(7,29,19,1,'#e2b975');
      for(let i=0;i<3;i++){p(8+i*6,20-i%2*3,5,4,i%2?'#dfb663':'#c77c55');p(10+i*6,17-i%2*3,1,4,palette.green);}
    }else if(kind==='mailbox'){
      p(15,21,3,15,palette.wood);p(7,13,21,11,'#596f65');p(9,11,17,3,'#91a39b');p(8,15,18,7,'#79908a');
      p(9,17,9,1,palette.edge);p(21,16,2,10,'#b46e50');p(23,16,5,3,'#d99e70');p(9,22,17,1,palette.light);
    }else if(kind==='scarecrow'){
      p(15,15,2,21,palette.wood);p(4,19,25,2,palette.light);p(10,17,12,13,'#64857d');p(12,18,3,10,'#91aa86');
      p(13,10,7,7,'#dfbd7b');p(9,8,15,3,'#bb9553');p(12,4,9,5,'#dcc086');p(15,13,1,1,palette.edge);p(18,13,1,1,palette.edge);
      p(12,17,8,2,'#bc7252');p(19,19,3,7,'#cc8e63');p(10,29,3,3,'#d7b272');p(19,29,3,3,'#d7b272');
    }else if(kind==='mushrooms'){
      for(const [x,y,k]of [[9,25,1],[20,30,0]]){p(x,y,2,7,'#edd7a8');p(x-4,y-3,10,4,k?'#b87659':'#ccab79');p(x-2,y-5,6,2,k?'#d69c7a':'#dbc18b');p(x-2,y-3,2,1,'#f8e5b5');}
    }else if(kind==='woodpile'){
      for(let i=0;i<5;i++){const x=5+(i%3)*7,y=31-Math.floor(i/3)*6;p(x,y,10,5,'#755133');p(x,y,8,3,'#a67e4e');p(x+7,y,4,5,'#d0ac71');p(x+8,y+1,2,2,'#997345');}
    }else if(kind==='cart'){
      p(6,29,21,3,palette.edge);p(7,23,18,7,'#a08868');p(5,21,22,3,'#c2ae85');
      for(let i=0;i<4;i++)p(8+i*5,18-i%2*2,4,5,i%2?'#7c938d':'#9aa498');
      p(8,32,4,4,'#4d5751');p(22,32,4,4,'#4d5751');p(9,33,1,1,'#c2c4a5');p(23,33,1,1,'#c2c4a5');
    }else if(kind==='watering'){
      p(9,24,14,11,'#799895');p(10,24,11,2,'#c1d0b4');p(21,27,5,3,'#587f7d');p(25,23,2,6,'#9eb8a7');
      p(5,24,4,2,'#9eb8a7');p(4,24,2,7,'#9eb8a7');p(5,30,4,2,'#9eb8a7');p(12,26,2,7,'#9eb8a7');
    }
    sprites.set(kind,c);return c;
  }
  // Off the walking routes and outside crop/interaction targets.
  const props = [
    ['mailbox',155,336],['basket',105,358],['watering',157,433],['scarecrow',318,383],
    ['barrel',367,525],['basket',145,711],['woodpile',162,789],
    ['basket',722,490],['barrel',951,509],['watering',900,497],
    ['barrel',374,226],['basket',64,230],['mushrooms',799,301],
    ['mushrooms',953,221],['woodpile',687,284],['cart',623,217],
    ['woodpile',511,227],['barrel',925,759]
  ];
  const patches=[[104,274],[334,416],[322,493],[420,301],[609,275],[671,247],[793,290],
    [934,295],[917,592],[975,587],[959,814],[694,758],[561,738],[131,797],[397,799],[545,523]];
  function grass(g,x,y,t,season) {
    const sway=Math.round(Math.sin(t*.0012+x)*1.2),winter=season==='winter';
    for(let i=0;i<5;i++){
      const bx=x+i*3,by=y+(i%2)*2;
      rect(g,bx,by-4,1,5,winter?'#b4c9bb':'#678b4e');
      rect(g,bx+sway,by-7-(i%3),1,4,winter?'#e5ecdd':season==='autumn'?'#c5ab66':'#a8bf75');
      if(i===1||i===4){rect(g,bx+sway-1,by-8-(i%3),3,2,winter?'#f3f2e3':season==='autumn'?'#e3c287':'#ecd0a3');}
    }
  }
  function cat(g,x,y,t,night) {
    const breath=night?0:Math.round(Math.sin(t*.0014)*.55);
    rect(g,x-8,y,18,3,'#354d3c33');rect(g,x-7,y-7+breath,14,7,'#c39061');rect(g,x-5,y-8+breath,10,2,'#dfb87d');
    rect(g,x+4,y-12,7,8,'#d8a56d');rect(g,x+4,y-14,2,3,'#b98556');rect(g,x+9,y-14,2,3,'#b98556');
    rect(g,x+6,y-8,1,1,'#5d4938');rect(g,x+9,y-8,1,1,'#5d4938');rect(g,x+8,y-6,2,1,'#edc795');
    const tail=Math.round(Math.sin(t*.001)*2);rect(g,x-12,y-6+tail,7,3,'#aa784f');rect(g,x-13,y-9+tail,3,5,'#d4a36f');
    rect(g,x-3,y-7+breath,2,4,'#a6754a');rect(g,x+1,y-7+breath,2,4,'#a6754a');
  }
  function actors(time,still,season,night) {
    const t=still?0:time;
    return [
      ...props.map(([kind,x,y])=>({y,draw:g=>g.drawImage(sprite(kind),x-16,y-36)})),
      ...patches.map(([x,y])=>({y,draw:g=>grass(g,x,y,t,season)})),
      {y:379,draw:g=>cat(g,516,375,t,night)}
    ];
  }
  function wheel(g,t,night) {
    g.lineWidth=1;g.strokeStyle='#b28157';g.beginPath();g.arc(105,188,27,0,Math.PI*2);g.stroke();
    for(let i=0;i<8;i++){
      const a=t*.00009+i*Math.PI/4,x=Math.round(105+Math.cos(a)*27),y=Math.round(188+Math.sin(a)*27);
      g.strokeStyle='#dfba75';g.beginPath();g.moveTo(105,188);g.lineTo(x,y);g.stroke();
      // Gondolas stay upright while their suspension points rotate.
      rect(g,x-5,y,10,6,i%2?'#97b3b1':'#d09a7a');rect(g,x-4,y+1,8,2,'#f0dfb1');
      if(night){rect(g,x-2,y+1,4,2,'#ffe0a0');}
    }
    rect(g,102,185,6,6,'#e6bc70');
  }
  function surface(g,time,still,season,night) {
    const t=still?0:time;g.save();wheel(g,t,night);
    // Suspended flags replace the baked flags; no static duplicate underneath.
    g.strokeStyle='#8c7957';g.lineWidth=.7;g.beginPath();g.moveTo(59,76);g.quadraticCurveTo(215,89,373,76);g.stroke();
    for(let i=0;i<17;i++){
      const x=60+i*19,y=76+Math.sin(i/16*Math.PI)*6,s=Math.round(Math.sin(t*.0014+i*.7)*2);
      for(let row=0;row<7;row++)rect(g,x+Math.round(s*row/6),y+row,7-Math.floor(row*.8),1,i%3?'#d69b85':'#e9cb89');
    }
    // Boat kept at its original mooring; movement never touches world state.
    const bob=season==='winter'?0:Math.round(Math.sin(t*.001)*1.3);
    g.translate(0,bob);rect(g,1056,757,29,14,'#826445');rect(g,1053,759,35,9,'#c19b62');
    rect(g,1057,760,27,7,'#826445');rect(g,1060,761,21,4,'#a78151');rect(g,1064,757,2,14,'#d4b984');rect(g,1075,758,2,13,'#d4b984');g.translate(0,-bob);
    if(season!=='winter'){
      for(let i=0;i<6;i++){
        const phase=(t*.00018+i*.17)%1,x=1062+(i%2)*24,y=581+i*29;
        g.globalAlpha=.42*(1-phase);g.strokeStyle='#e2e6c4';g.lineWidth=.8;
        g.beginPath();g.ellipse(x,y,2+phase*11,1+phase*3,0,0,Math.PI*2);g.stroke();
      }
      g.globalAlpha=1;
      for(let i=0;i<7;i++){
        const x=1003+(i%2)*6,y=570+i*32,s=Math.round(Math.sin(t*.0013+i)*2);
        rect(g,x,y-9,1,10,'#668452');rect(g,x+s,y-15,1,7,'#9aac71');rect(g,x+s-1,y-17,3,4,'#b7a376');
      }
    }
    // A pair of swaying cloths at the edge of the pasture, well clear of doors.
    rect(g,345,595,2,26,'#8a714a');rect(g,402,595,2,26,'#8a714a');
    g.strokeStyle='#9c8b63';g.beginPath();g.moveTo(346,598);g.quadraticCurveTo(375,604,403,598);g.stroke();
    for(let i=0;i<3;i++){
      const x=352+i*16,s=Math.round(Math.sin(t*.0012+i)*1.3);
      rect(g,x,601,10,3,'#e8d8aa');rect(g,x+s,604,10,10,i===1?'#a1b4a3':'#eee0b8');rect(g,x+s,613,10,1,'#c7b587');
    }
    // Water in existing drinking troughs follows the real stock; no fake animals.
    if(root.BackyardArt&&typeof town!=='undefined')for(const [zone,x]of [['birds',194],['herd',392]]){
      if(town.ranch.zones[zone].water)rect(g,x+Math.round(Math.sin(t*.0016)*2),688,8,1,'#d2e4d0');
    }
    g.restore();
  }
  function smoke(g,x,y,t,still) {
    if(still)return;
    for(let i=0;i<4;i++){
      const p=(t*.00007+i*.25)%1;
      g.globalAlpha=(1-p)*.35;rect(g,x+Math.sin(p*4)*4+p*6,y-p*30,3+p*4,2+p*2,'#f0e9d3');
    }
    g.globalAlpha=1;
  }
  function air(g,time,still,season,night) {
    const t=still?0:time;g.save();
    smoke(g,725,223,t,still);smoke(g,860,721,t,still);
    // Lamp flames and window panes match the existing warm night palette.
    for(const [x,y]of [[599,166],[760,278],[941,277],[949,678],[912,783]]){
      const flicker=still?0:Math.round(Math.sin(t*.006+x)*.7);
      rect(g,x,y-flicker,3,4+flicker,'#e8b764');rect(g,x+1,y+1-flicker,1,2,'#fff0b6');
    }
    if(night){
      g.globalAlpha=night;
      for(const [x,y]of [[125,310],[725,264],[860,762]]){rect(g,x,y,9,8,'#efcc89');rect(g,x+3,y,1,8,'#997d52');rect(g,x,y+4,9,1,'#997d52');}
      if(!still&&season!=='winter')for(let i=0;i<12;i++){
        const x=(i<6?741:907)+(i%6)*13+Math.sin(t*.0007+i)*6;
        const y=(i<6?315:774)+Math.cos(t*.0006+i*2)*10;
        const alpha=night*(.2+.6*Math.max(0,Math.sin(t*.0018+i*2)));
        g.globalAlpha=alpha*.2;rect(g,x-2,y-2,5,5,'#ffe6a0');g.globalAlpha=alpha;rect(g,x,y,1,1,'#fff4b2');
      }
    }else if(!still){
      // Occasional bird passage, not a permanent flock over the controls.
      const p=(t%41000)/41000;
      if(p<.32)for(let i=0;i<3;i++){
        const x=680+p*1300-i*16,y=211+Math.sin(p*10)*9+i*8,wing=Math.sin(t*.012+i)>0?-2:1;
        rect(g,x,y,2,1,'#526755');rect(g,x-2,y+wing,2,1,'#526755');rect(g,x+2,y+wing,2,1,'#526755');
      }
    }
    g.globalAlpha=1;
    if(!still&&season==='autumn')for(let i=0;i<9;i++){
      const p=(t*.000035+i*.11)%1,x=750+i*23+Math.sin(p*8+i)*7,y=135+p*161;
      rect(g,x,y,2,2,i%2?'#d3a060':'#b88851');rect(g,x+2,y+1,1,1,'#e3c083');
    }
    if(!still&&season==='winter')for(let i=0;i<22;i++){
      const x=(i*83+Math.sin(t*.0003+i)*7+1120)%1120,y=(i*47+t*.012)%880;
      rect(g,x,y,1,2,'#f8f5e1aa');
    }
    g.restore();
  }
  root.BackyardAmbience={actors,surface,air};
})(globalThis);
